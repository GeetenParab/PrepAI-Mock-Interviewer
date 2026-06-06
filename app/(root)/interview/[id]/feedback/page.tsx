import React from 'react';
import { getCurrentUser } from '@/lib/actions/auth.action';
import { getInterviewById, getFeedbackByInterviewId } from '@/lib/actions/general.action';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import dayjs from 'dayjs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
    if (score >= 70) return 'text-success-100';
    if (score >= 40) return 'text-amber-400';
    return 'text-destructive-100';
}

function scoreBg(score: number): string {
    if (score >= 70) return 'bg-success-100/15 border-success-100/30';
    if (score >= 40) return 'bg-amber-400/15 border-amber-400/30';
    return 'bg-destructive-100/15 border-destructive-100/30';
}

function scoreBarColor(score: number): string {
    if (score >= 70) return 'bg-success-100';
    if (score >= 40) return 'bg-amber-400';
    return 'bg-destructive-100';
}

function ScorePill({ label, score }: { label: string; score: number }) {
    return (
        <div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border ${scoreBg(score)} min-w-[80px]`}>
            <span className={`text-lg font-bold ${scoreColor(score)}`}>{score}</span>
            <span className="text-xs text-light-400 text-center leading-tight">{label}</span>
        </div>
    );
}

function ScoreBar({ label, score, comment }: { label: string; score: number; comment: string }) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-light-100">{label}</span>
                <span className={`text-sm font-bold ${scoreColor(score)}`}>{score}/100</span>
            </div>
            <div className="h-2 rounded-full bg-dark-200 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${scoreBarColor(score)}`}
                    style={{ width: `${score}%` }}
                />
            </div>
            <p className="text-xs text-light-400">{comment}</p>
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const Page = async ({ params }: RouteParams) => {
    try {
        const { id } = await params;
        const user = await getCurrentUser();
        if (!user) redirect('/sign-in');

        const interview = await getInterviewById(id);
        if (!interview) redirect('/');

        const feedback = await getFeedbackByInterviewId({
            interviewId: id,
            userId: user.id,
        });

        if (!feedback) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <h1 className="text-2xl font-semibold">No Feedback Yet</h1>
                    <p className="text-light-400">Complete the interview to generate your evaluation.</p>
                    <Link href={`/interview/${id}`}>
                        <Button className="btn-primary">Start Interview</Button>
                    </Link>
                </div>
            );
        }

        const overallColor = scoreColor(feedback.totalScore);
        const overallBg = feedback.totalScore >= 70 ? 'from-success-100/20' : feedback.totalScore >= 40 ? 'from-amber-400/20' : 'from-destructive-100/20';
        const hasPerAnswer = feedback.answerEvaluations && feedback.answerEvaluations.length > 0;
        const hasTranscript = feedback.transcript && feedback.transcript.length > 0;

        return (
            <section className="flex flex-col gap-8 max-w-5xl mx-auto max-sm:px-4 pb-16">

                {/* ── Header ── */}
                <div className={`rounded-3xl bg-gradient-to-br ${overallBg} to-transparent border border-light-800/30 p-8 flex flex-col md:flex-row items-center md:items-start gap-6`}>
                    <div className="flex flex-col gap-2 flex-1">
                        <h1 className="text-3xl font-bold capitalize">{interview.role} Interview</h1>
                        <div className="flex flex-wrap gap-4 text-sm text-light-400">
                            <span className="flex items-center gap-1.5">
                                <Image src="/calendar.svg" width={16} height={16} alt="date" />
                                {dayjs(feedback.createdAt).format('MMM D, YYYY h:mm A')}
                            </span>
                            {interview.targetCompany && (
                                <span className="capitalize">🏢 {interview.targetCompany}</span>
                            )}
                            <span className="capitalize">📋 {interview.type}</span>
                            <span className="capitalize">📊 {interview.depthStrategy || 'balanced'}</span>
                        </div>
                        {/* Setup details (Task 2) */}
                        <div className="flex flex-wrap gap-2 mt-2">
                            {interview.resumeName && (
                                <span className="skill-badge">📄 {interview.resumeName}</span>
                            )}
                            {interview.questionCount && (
                                <span className="skill-badge">{interview.questionCount} Questions</span>
                            )}
                            {interview.customNotes && (
                                <span className="skill-badge text-xs italic">💬 {interview.customNotes}</span>
                            )}
                        </div>
                    </div>

                    {/* Overall score circle */}
                    <div className="flex flex-col items-center gap-1">
                        <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center flex-col ${feedback.totalScore >= 70 ? 'border-success-100' : feedback.totalScore >= 40 ? 'border-amber-400' : 'border-destructive-100'} dark-gradient`}>
                            <span className={`text-3xl font-bold ${overallColor}`}>{feedback.totalScore}</span>
                            <span className="text-xs text-light-400">/100</span>
                        </div>
                        <span className="text-sm text-light-400">Overall Score</span>
                    </div>
                </div>

                {/* Preprocessing stats (Task 5) */}
                {(feedback.fillerWordCount !== undefined || feedback.repetitionCount !== undefined) && (
                    <div className="flex flex-wrap gap-4">
                        {feedback.fillerWordCount !== undefined && (
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border ${feedback.fillerWordCount > 10 ? 'bg-destructive-100/10 border-destructive-100/30 text-destructive-100' : feedback.fillerWordCount > 5 ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' : 'bg-success-100/10 border-success-100/30 text-success-100'}`}>
                                <span className="text-lg font-bold">{feedback.fillerWordCount}</span>
                                <span className="text-sm">Filler words removed</span>
                            </div>
                        )}
                        {feedback.repetitionCount !== undefined && feedback.repetitionCount > 0 && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border bg-amber-400/10 border-amber-400/30 text-amber-400">
                                <span className="text-lg font-bold">{feedback.repetitionCount}</span>
                                <span className="text-sm">Repetitive phrases</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Overall Summary ── */}
                <div className="card-border">
                    <div className="card p-6 flex flex-col gap-4">
                        <h2 className="text-xl font-semibold">Overall Assessment</h2>
                        <p className="text-light-100 leading-relaxed">{feedback.finalAssessment}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div className="flex flex-col gap-2">
                                <h3 className="text-sm font-semibold text-success-100 flex items-center gap-1.5">✅ Strengths</h3>
                                <ul className="flex flex-col gap-1.5">
                                    {feedback.strengths?.map((s, i) => (
                                        <li key={i} className="text-sm text-light-100 flex gap-2">
                                            <span className="text-success-100 mt-0.5 shrink-0">•</span>
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex flex-col gap-2">
                                <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">⚡ Areas for Improvement</h3>
                                <ul className="flex flex-col gap-1.5">
                                    {feedback.areasForImprovement?.map((a, i) => (
                                        <li key={i} className="text-sm text-light-100 flex gap-2">
                                            <span className="text-amber-400 mt-0.5 shrink-0">•</span>
                                            {a}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Category Scores ── */}
                <div className="card-border">
                    <div className="card p-6 flex flex-col gap-5">
                        <h2 className="text-xl font-semibold">Category Breakdown</h2>
                        <div className="flex flex-col gap-5">
                            {feedback.categoryScores?.map((cat, i) => (
                                <ScoreBar key={i} label={cat.name} score={cat.score} comment={cat.comment} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Per-Answer Evaluation (Task 6) ── */}
                {hasPerAnswer && (
                    <div className="flex flex-col gap-4">
                        <h2 className="text-xl font-semibold">Answer-by-Answer Evaluation</h2>
                        {feedback.answerEvaluations!.map((evaluation, idx) => {
                            // Check if this question was incomplete/not reached (all scores 0)
                            const allZero = evaluation.scores.technicalAccuracy === 0
                                && evaluation.scores.clarity === 0
                                && evaluation.scores.depth === 0
                                && evaluation.scores.confidence === 0;
                            const isNotReached = allZero && (
                                evaluation.answer === 'Not reached.' ||
                                evaluation.whatWentWell?.toLowerCase().includes('not reached')
                            );
                            const isIncomplete = allZero && !isNotReached;

                            return (
                                <div key={idx} className="card-border">
                                    <div className="card p-6 flex flex-col gap-4">
                                        {/* Question header */}
                                        <div className="flex items-start gap-3">
                                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${
                                                isNotReached || isIncomplete
                                                    ? 'bg-light-800/20 border-light-600/30 text-light-400'
                                                    : `${scoreBg(evaluation.overallAnswerScore)} ${scoreColor(evaluation.overallAnswerScore)}`
                                            }`}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex flex-col gap-1 flex-1">
                                                <p className="text-sm font-semibold text-primary-100">{evaluation.question}</p>
                                            </div>
                                            <div className={`shrink-0 text-xl font-bold ${
                                                isNotReached ? 'text-light-400' :
                                                isIncomplete ? 'text-amber-400' :
                                                scoreColor(evaluation.overallAnswerScore)
                                            }`}>
                                                {isNotReached ? '—' : isIncomplete ? 'Partial' : `${Math.round(evaluation.overallAnswerScore)}/100`}
                                            </div>
                                        </div>

                                        {/* Not reached banner */}
                                        {isNotReached && (
                                            <div className="bg-light-800/20 border border-light-600/20 rounded-xl px-4 py-3 text-light-400 text-sm">
                                                🚫 This question was not reached — the interview ended before it was asked.
                                            </div>
                                        )}

                                        {/* Incomplete banner */}
                                        {isIncomplete && !isNotReached && (
                                            <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3 text-amber-400 text-sm">
                                                ⏱️ Interview ended before this answer was completed, or the response was not recorded.
                                                {evaluation.answer && evaluation.answer !== 'Not reached.' && (
                                                    <p className="text-light-400 mt-1.5 text-xs">Partial: {evaluation.answer}</p>
                                                )}
                                            </div>
                                        )}

                                        {/* Candidate's answer (only for answered questions) */}
                                        {!isNotReached && !isIncomplete && evaluation.answer && (
                                            <div className="bg-dark-200/50 rounded-xl px-4 py-3 border border-light-800/20">
                                                <p className="text-xs text-light-400 mb-1.5 font-medium uppercase tracking-wide">Your Answer</p>
                                                <p className="text-sm text-light-100 leading-relaxed">{evaluation.answer}</p>
                                            </div>
                                        )}

                                        {/* 4 score pills — only for answered questions */}
                                        {!allZero && (
                                            <div className="flex flex-wrap gap-3">
                                                <ScorePill label="Technical" score={evaluation.scores.technicalAccuracy} />
                                                <ScorePill label="Clarity" score={evaluation.scores.clarity} />
                                                <ScorePill label="Depth" score={evaluation.scores.depth} />
                                                <ScorePill label="Confidence" score={evaluation.scores.confidence} />
                                            </div>
                                        )}

                                        {/* What went well + Improvements — only for answered questions */}
                                        {!isNotReached && !isIncomplete && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="bg-success-100/8 border border-success-100/20 rounded-xl p-3">
                                                    <p className="text-xs font-semibold text-success-100 mb-1">✅ What went well</p>
                                                    <p className="text-sm text-light-100">{evaluation.whatWentWell}</p>
                                                </div>
                                                <div className="bg-amber-400/8 border border-amber-400/20 rounded-xl p-3">
                                                    <p className="text-xs font-semibold text-amber-400 mb-1">⚡ Improve on</p>
                                                    <p className="text-sm text-light-100">{evaluation.improvements}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Transcript ── */}
                {hasTranscript && (
                    <div className="card-border">
                        <div className="card p-6 flex flex-col gap-4">
                            <h2 className="text-xl font-semibold">Interview Transcript</h2>
                            <p className="text-xs text-light-400">Sentence fragments have been merged for readability. Original words are preserved.</p>
                            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2">
                                {feedback.transcript!.map((msg, i) => (
                                    <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                            msg.role === 'user'
                                                ? 'bg-primary-200/20 border border-primary-200/30 text-light-100 rounded-br-sm'
                                                : 'bg-dark-200 border border-light-800/20 text-light-400 rounded-bl-sm'
                                        }`}>
                                            <p className={`text-xs font-medium mb-1 ${msg.role === 'user' ? 'text-primary-200' : 'text-light-600'}`}>
                                                {msg.role === 'user' ? 'You' : 'AI Interviewer'}
                                            </p>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Action Buttons ── */}
                <div className="flex flex-wrap gap-4 justify-center">
                    <Button className="btn-secondary flex-1 min-w-[140px] max-w-[200px]">
                        <Link href="/" className="flex w-full justify-center">
                            Back to Dashboard
                        </Link>
                    </Button>
                    <Button className="btn-primary flex-1 min-w-[140px] max-w-[200px]">
                        <Link href={`/interview/${id}`} className="flex w-full justify-center">
                            Retake Interview
                        </Link>
                    </Button>
                </div>
            </section>
        );
    } catch (error) {
        console.error('Error loading feedback page:', error);
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <h1 className="text-2xl font-semibold">Error Loading Page</h1>
                <p className="text-light-400">There was an error loading this page.</p>
                <Link href="/"><Button className="btn-primary">Go Home</Button></Link>
            </div>
        );
    }
};

export default Page;