import { db } from "@/firebase/admin";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
    try {
        const {
            resumeId,
            targetRole,
            targetCompany,
            interviewType,
            experienceLevel,
            depthStrategy,
            questionCount,
            customNotes,
            userId
        } = await request.json();

        if (!userId) {
            return Response.json(
                { success: false, error: 'userId is required' },
                { status: 400 }
            );
        }

        if (!targetRole) {
            return Response.json(
                { success: false, error: 'targetRole is required' },
                { status: 400 }
            );
        }

        // Fetch resume data if resumeId is provided
        let resumeData = null;
        let resumeName = "";
        if (resumeId) {
            const resumeDoc = await db.collection("resumes").doc(resumeId).get();
            if (resumeDoc.exists) {
                const data = resumeDoc.data();
                resumeData = data?.extractedData || null;
                resumeName = data?.fileName || "";
            }
        }

        // Formulate prompt for Gemini
        let resumeContextPrompt = "";
        if (resumeData) {
            resumeContextPrompt = `
CANDIDATE RESUME DATA:
- Candidate Name: ${resumeData.name || "the candidate"}
- Experience Level from Resume: ${resumeData.experienceLevel || "not specified"}
- Skills: ${resumeData.skills ? resumeData.skills.join(", ") : "none"}
- Experience:
${resumeData.experience ? resumeData.experience.map((e: any) => `  * Role: ${e.role} | Duration: ${e.duration}\n    Work done: ${e.workDone}\n    Projects: ${e.projectsCompleted ? e.projectsCompleted.join(", ") : ""}`).join("\n") : "none"}
- Projects:
${resumeData.projects ? resumeData.projects.map((p: any) => `  * Project: ${p.name}\n    Tech: ${p.tech ? p.tech.join(", ") : ""}\n    Features: ${p.features ? p.features.join(", ") : ""}`).join("\n") : "none"}
`;
        } else {
            resumeContextPrompt = `No resume was uploaded. Generate general questions tailored for this role.`;
        }

        const targetCompanyPrompt = targetCompany 
            ? `Target Company: ${targetCompany}. Incorporate company-specific technologies, interview styles, culture, or core principles (e.g. Amazon's Leadership Principles, Google's system design expectations) into the questions where relevant.`
            : "Target Company: General interview.";

        const customNotesPrompt = customNotes
            ? `Custom Notes/Instructions: ${customNotes}`
            : "";

        const depthStrategyPrompt = {
            breadth: "Depth Strategy: 'breadth'. Generate questions that cover a wide range of different topics/technologies. Avoid diving too deep into any single technical area.",
            depth: "Depth Strategy: 'depth'. Generate questions that focus on a few key areas, and write detailed follow-up questions that probe the candidate's core understanding and push them to explain the inner workings or edge cases.",
            balanced: "Depth Strategy: 'balanced'. Balance breadth and depth across the questions."
        }[depthStrategy as 'breadth' | 'depth' | 'balanced'] || "Depth Strategy: balanced.";

        const prompt = `You are an expert interviewer. Prepare exactly ${questionCount || 5} structured interview questions for the role of "${targetRole}" at experience level "${experienceLevel}".
Interview Type: ${interviewType} (technical, behavioral, mixed, or system-design).
${depthStrategyPrompt}
${targetCompanyPrompt}
${resumeContextPrompt}
${customNotesPrompt}

For each main question, generate exactly 2 to 4 structured follow-up questions. Follow-up questions should have clear conditions based on what the candidate answers (e.g. "If candidate mentions X", "If candidate gives a vague answer", "If candidate seems highly confident").

Return a JSON array of objects, where each object matches this TypeScript interface:
interface QuestionFollowUp {
  condition: string; // The condition under which the interviewer should ask this follow-up (keep it clean and brief)
  question: string;  // The follow-up question text (voice-friendly, no markdown, no special chars like * or /)
}

interface InterviewQuestion {
  id: number;          // 1-indexed identifier (1, 2, 3...)
  question: string;    // The main question text (voice-friendly, no markdown, no special chars like * or /)
  category: 'technical' | 'behavioral' | 'system-design' | 'situational';
  topic: string;       // Broad category/topic (e.g., "React Hooks", "Conflict Resolution", "API Design")
  difficulty: 'easy' | 'medium' | 'hard';
  followUps: QuestionFollowUp[]; // Exactly 2 to 4 follow-up items
  resumeContext?: string; // Briefly explain why this question is relevant to the candidate's resume (if a resume was provided)
}

Return ONLY a valid JSON array of InterviewQuestion objects. Do not include markdown code blocks, do not wrap in \`\`\`json, do not write any introductory or concluding text.`;

        const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            prompt: prompt,
        });

        // Clean potential markdown code fences from response
        const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        let structuredQuestions: InterviewQuestion[];
        try {
            structuredQuestions = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('Failed to parse Gemini interview questions response:', text);
            return Response.json(
                { success: false, error: 'Failed to generate questions JSON structure' },
                { status: 500 }
            );
        }

        // Create the flat questions array for backward compatibility
        const questions = structuredQuestions.map(q => q.question);

        // Gather tech stack from resume data or targetRole
        let techstack: string[] = [];
        if (resumeData && resumeData.skills) {
            // Pick a subset of skills that match the targetRole or just the first few
            techstack = resumeData.skills.slice(0, 5);
        } else {
            // Default stack based on role
            techstack = [targetRole];
        }

        const interviewData = {
            userId,
            role: targetRole,
            level: experienceLevel,
            type: interviewType,
            techstack,
            questions,
            structuredQuestions,
            resumeId: resumeId || null,
            resumeName: resumeName || "",          // Task 2: store resume file name
            targetCompany: targetCompany || "",
            depthStrategy: depthStrategy || "balanced",
            customNotes: customNotes || "",
            questionCount: questionCount || 5,     // Task 2: store question count
            finalized: false,
            coverImage: getRandomInterviewCover(),
            createdAt: new Date().toISOString(),
        };

        const docRef = await db.collection("interviews").add(interviewData);

        return Response.json({
            success: true,
            interviewId: docRef.id
        }, { status: 200 });

    } catch (error: any) {
        console.error("Error generating interview:", error);
        return Response.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
