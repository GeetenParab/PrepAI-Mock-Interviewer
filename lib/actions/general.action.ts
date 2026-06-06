'use server'; 

import { db } from "@/firebase/admin";
import { generateObject } from "ai";
import { google } from '@ai-sdk/google';
import { feedbackSchema, answerEvaluationSchema } from '@/constants';

// ── Task 5: Transcript Preprocessing ─────────────────────────────────────────

const FILLER_WORDS = [
    'um', 'uh', 'uhh', 'umm', 'hmm', 'hm',
    'like', 'you know', 'kind of', 'kinda', 'sort of', 'basically',
    'literally', 'actually', 'honestly', 'right', 'i mean',
    'so yeah', 'yeah so', 'you see', 'just like',
];

// Fix 4: Merge consecutive same-role fragments — Deepgram+Vapi splits each sentence
// into many tiny chunks. Merge them so preprocessing and Gemini see full sentences.
function mergeFragments(messages: { role: string; content: string }[]): { role: string; content: string }[] {
    if (messages.length === 0) return [];
    const merged: { role: string; content: string }[] = [];
    let current = { ...messages[0] };

    for (let i = 1; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.role === current.role) {
            // Same speaker — concatenate with a space
            current.content = (current.content + ' ' + msg.content).trim();
        } else {
            // Skip near-empty fragments (pure punctuation/whitespace)
            if (current.content.replace(/[^a-zA-Z0-9]/g, '').length > 1) {
                merged.push(current);
            }
            current = { ...msg };
        }
    }
    if (current.content.replace(/[^a-zA-Z0-9]/g, '').length > 1) {
        merged.push(current);
    }
    return merged;
}

function preprocessTranscript(messages: { role: string; content: string }[]): {
    mergedMessages: { role: string; content: string }[];
    fillerWordCount: number;
    repetitionCount: number;
} {
    let fillerWordCount = 0;
    let repetitionCount = 0;

    // Merge fragments first so we count on full sentences, not tiny chunks
    const mergedMessages = mergeFragments(messages);

    // Only COUNT filler words — do NOT remove them.
    // Sending the original text to Gemini avoids it misinterpreting removed words
    // as communication errors or incomplete sentences.
    mergedMessages.forEach((msg) => {
        if (msg.role === 'user') {
            FILLER_WORDS.forEach((filler) => {
                const regex = new RegExp(`\\b${filler}\\b`, 'gi');
                const matches = msg.content.match(regex);
                if (matches) fillerWordCount += matches.length;
            });

            // Count repeated consecutive phrases (3+ repetitions) — don't remove
            const repetitionRegex = /\b(\w+(?:\s+\w+)?)\s+(?:\1\s+){2,}/gi;
            if (repetitionRegex.test(msg.content)) repetitionCount++;
        }
    });

    return { mergedMessages, fillerWordCount, repetitionCount };
}

// ── General Actions ───────────────────────────────────────────────────────────

export async function getInterviewsByUserId(userId: string): Promise<Interview[] | null> {
    const interviews = await db.collection('interviews')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

        return interviews.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        })) as Interview[];
}

export async function getLatestInterviews(params: GetLatestInterviewsParams): Promise<Interview[] | null> {
    const { userId, limit = 20 } = params;

    const interviews = await db.collection('interviews')
        .orderBy('createdAt', 'desc')
        .where('finalized', '==', true)
        .where('userId', '!=', userId)
        .limit(limit)
        .get();

        return interviews.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        })) as Interview[];
}

export async function getInterviewById(interviewId: string): Promise<Interview | null> {
    try {
        const doc = await db.collection('interviews').doc(interviewId).get();
        
        if (!doc.exists) {
            return null;
        }
        
        return {
            id: doc.id,
            ...doc.data()
        } as Interview;
    } catch (error) {
        console.error('Error fetching interview:', error);
        return null;
    }
}

export async function createFeedback(params: CreateFeedbackParams) {
    const { interviewId, userId, transcript, structuredQuestions } = params;

    try {
        // ── Task 5: Preprocess transcript ────────────────────────────────────
        // mergedMessages = original text, just with same-speaker fragments joined.
        // We do NOT remove words — Gemini evaluates the real transcript.
        const { mergedMessages, fillerWordCount, repetitionCount } = preprocessTranscript(transcript);
        const formattedTranscript = mergedMessages
            .map((s) => `-${s.role}: ${s.content}\n`)
            .join('');

        // ── Overall feedback (existing) ───────────────────────────────────────
        const { object: { totalScore, categoryScores, strengths, areasForImprovement, finalAssessment } } = await generateObject({
            model: google('gemini-2.5-flash', {
                structuredOutputs: false,
            }),
            schema: feedbackSchema,
            prompt: `You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        Transcript:
        ${formattedTranscript}

        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural & Role Fit**: Alignment with company values and job role.
        - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
        `,
            system:
                "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
        });

        // ── Task 6: Per-answer evaluation ─────────────────────────────────────
        let answerEvaluations: AnswerEvaluation[] = [];

        if (structuredQuestions && structuredQuestions.length > 0) {
            try {
                // Build a prompt that maps each question to the user's answer from transcript
                const questionsListText = structuredQuestions
                    .map((q) => `Q${q.id}: ${q.question}`)
                    .join('\n');

                const { object: evalResult } = await generateObject({
                    model: google('gemini-2.5-flash', {
                        structuredOutputs: false,
                    }),
                    schema: answerEvaluationSchema,
                    prompt: `You are an expert interview evaluator. Below is a voice interview transcript and the list of questions that were asked. The transcript has been pre-processed: filler words removed and fragments merged into full sentences.

INTERVIEW QUESTIONS:
${questionsListText}

TRANSCRIPT (pre-processed — filler words removed, fragments merged):
${formattedTranscript}

IMPORTANT RULES:
1. The transcript is a VOICE interview. Speaker labels are "assistant" (AI interviewer) and "user" (candidate).
2. For each question, find ALL the user turns that answer that question. Concatenate them to reconstruct the full answer.
3. A question is considered ANSWERED if the candidate gave at least 1-2 substantive sentences in response.
4. A question is INCOMPLETE if the call ended before the candidate finished, or they only said a few words.
5. A question is UNANSWERED if no user response exists for it at all.

For each ANSWERED question, score 0–100 on:
- technicalAccuracy: How technically correct and accurate was the answer?
- clarity: How clearly was it communicated?
- depth: How thorough/deep was the explanation?
- confidence: How confident did the candidate sound?
Set overallAnswerScore = average of 4 scores.
Write whatWentWell and improvements (1 sentence each).

For INCOMPLETE questions (call cut off mid-answer):
- Set all 4 scores to 0
- Set overallAnswerScore to 0
- Set whatWentWell = "Interview ended before this answer was completed."
- Set improvements = "Complete the full answer in the retake."
- Include whatever partial answer text exists in the 'answer' field.

For UNANSWERED questions (no response at all):
- Set all 4 scores to 0
- Set overallAnswerScore to 0
- Set whatWentWell = "This question was not reached."
- Set improvements = "This question was not reached."
- Set answer = "Not reached."

Return evaluations for ALL ${structuredQuestions.length} questions.`,
                    system: "You are an expert technical interviewer evaluating interview responses. Be precise about what was actually said in the transcript — do not invent or assume content.",
                });

                answerEvaluations = evalResult.evaluations as AnswerEvaluation[];
            } catch (evalError) {
                console.error('Per-answer evaluation failed (non-critical):', evalError);
                // Don't fail the whole feedback if per-answer eval fails
            }
        }

        // ── Save to Firestore ─────────────────────────────────────────────────
        const feedback = await db.collection('feedback').add({
            interviewId,
            userId,
            totalScore,
            categoryScores,
            strengths,
            areasForImprovement,
            finalAssessment,
            answerEvaluations,
            fillerWordCount,
            repetitionCount,
            // Store the merged (fragment-joined) transcript for display in feedback page
            transcript: mergedMessages,
            createdAt: new Date().toISOString(),
        });

        // Mark interview as finalized
        await db.collection('interviews').doc(interviewId).update({ finalized: true });

        return {
            success: true,
            feedbackId: feedback.id
        }

    } catch (error) {
        console.error('Error saving feedback:', error)
        return { success: false }
    }
}

export async function getFeedbackByInterviewId(params: GetFeedbackByInterviewIdParams): Promise<Feedback | null> {
    const { interviewId, userId } = params;

    const feedback = await db.collection('feedback')
        .where('interviewId', '==', interviewId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

        if(feedback.empty) return null;

        const feedbackDoc = feedback.docs[0];
        return {
            id: feedbackDoc.id,
            ...feedbackDoc.data()
        } as Feedback;
}

export async function getFeedbackByInterviewIdPublic(interviewId: string): Promise<Feedback | null> {
    // This allows anyone to see feedback for any interview
    const feedback = await db.collection('feedback')
        .where('interviewId', '==', interviewId)
        .limit(1)
        .get();

    if(feedback.empty) return null;

    const feedbackDoc = feedback.docs[0];
    return {
        id: feedbackDoc.id,
        ...feedbackDoc.data()
    } as Feedback;
}

export async function getFeedbackWithAccess(params: { interviewId: string; currentUserId: string }): Promise<Feedback | null> {
    const { interviewId, currentUserId } = params;
    
    // First, get the interview to see who created it
    const interview = await getInterviewById(interviewId);
    if (!interview) return null;
    
    // Get feedback for this interview
    const feedback = await db.collection('feedback')
        .where('interviewId', '==', interviewId)
        .limit(1)
        .get();
    
    if(feedback.empty) return null;
    
    const feedbackDoc = feedback.docs[0];
    const feedbackData = feedbackDoc.data();
    
    // Allow access if user is either:
    // 1. The person who took the interview (feedbackData.userId)
    // 2. The person who created the interview (interview.userId)
    if (feedbackData.userId === currentUserId || interview.userId === currentUserId) {
        return {
            id: feedbackDoc.id,
            ...feedbackData
        } as Feedback;
    }
    
    return null; // No access
}
