"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface InterviewSetupFormProps {
    userId: string;
    resumes: Resume[];
    onCancel?: () => void;
}

const InterviewSetupForm = ({ userId, resumes, onCancel }: InterviewSetupFormProps) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    
    // Form states
    const [resumeId, setResumeId] = useState('');
    const [targetRole, setTargetRole] = useState('');
    const [targetCompany, setTargetCompany] = useState('');
    const [interviewType, setInterviewType] = useState<'technical' | 'behavioral' | 'mixed' | 'system-design'>('mixed');
    const [experienceLevel, setExperienceLevel] = useState<'fresher' | 'junior' | 'mid' | 'senior'>('junior');
    const [depthStrategy, setDepthStrategy] = useState<'breadth' | 'depth' | 'balanced'>('balanced');
    const [questionCount, setQuestionCount] = useState<number>(5);
    const [customNotes, setCustomNotes] = useState('');

    // Filter to only completed resumes
    const completedResumes = resumes.filter(r => r.status === 'completed');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!targetRole.trim()) {
            toast.error('Please specify a target role.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/interview/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    resumeId: resumeId || null,
                    targetRole,
                    targetCompany: targetCompany.trim(),
                    interviewType,
                    experienceLevel,
                    depthStrategy,
                    questionCount,
                    customNotes: customNotes.trim(),
                }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to configure interview');
            }

            toast.success('Interview generated successfully!');
            if (onCancel) onCancel();
            router.push(`/interview/${data.interviewId}`);
        } catch (error: any) {
            console.error('Error starting interview:', error);
            toast.error(error.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Resume Select */}
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-light-100">Select Resume Context</label>
                {completedResumes.length > 0 ? (
                    <select 
                        value={resumeId} 
                        onChange={(e) => setResumeId(e.target.value)}
                        className="input bg-dark-200 text-light-100 w-full min-h-12 px-5 rounded-full border border-dark-200/50 outline-none cursor-pointer focus:border-primary-200/50"
                    >
                        <option value="">General Interview (No Resume Context)</option>
                        {completedResumes.map((resume) => (
                            <option key={resume.id} value={resume.id}>
                                {resume.fileName} (Extracted)
                            </option>
                        ))}
                    </select>
                ) : (
                    <div className="text-sm text-light-400 bg-dark-200/50 p-3.5 rounded-2xl border border-dark-200/50 flex flex-col gap-2">
                        <p>No processed resumes found. Questions will be generated generally without resume personalization.</p>
                        <button 
                            type="button"
                            onClick={() => {
                                if (onCancel) onCancel();
                                router.push('/resumes');
                            }}
                            className="text-xs font-bold text-primary-200 hover:underline text-left w-fit"
                        >
                            Upload a resume to enable resume-aware questions →
                        </button>
                    </div>
                )}
            </div>

            {/* Role & Company Group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-light-100">Target Role *</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Frontend Developer"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        className="input w-full"
                        required
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-light-100">Target Company (Optional)</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Google, Stripe"
                        value={targetCompany}
                        onChange={(e) => setTargetCompany(e.target.value)}
                        className="input w-full"
                    />
                </div>
            </div>

            {/* Type & Level Group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-light-100">Interview Type</label>
                    <select 
                        value={interviewType} 
                        onChange={(e) => setInterviewType(e.target.value as any)}
                        className="input bg-dark-200 text-light-100 w-full min-h-12 px-5 rounded-full border border-dark-200/50 outline-none cursor-pointer focus:border-primary-200/50"
                    >
                        <option value="technical">Technical</option>
                        <option value="behavioral">Behavioral</option>
                        <option value="mixed">Mixed (Tech + Behavioral)</option>
                        <option value="system-design">System Design</option>
                    </select>
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-light-100">Experience Level</label>
                    <select 
                        value={experienceLevel} 
                        onChange={(e) => setExperienceLevel(e.target.value as any)}
                        className="input bg-dark-200 text-light-100 w-full min-h-12 px-5 rounded-full border border-dark-200/50 outline-none cursor-pointer focus:border-primary-200/50"
                    >
                        <option value="fresher">Fresher (0-1 years)</option>
                        <option value="junior">Junior (1-3 years)</option>
                        <option value="mid">Mid-Level (3-6 years)</option>
                        <option value="senior">Senior (6+ years)</option>
                    </select>
                </div>
            </div>

            {/* Depth Strategy & Count Group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-light-100">Depth Strategy</label>
                    <select 
                        value={depthStrategy} 
                        onChange={(e) => setDepthStrategy(e.target.value as any)}
                        className="input bg-dark-200 text-light-100 w-full min-h-12 px-5 rounded-full border border-dark-200/50 outline-none cursor-pointer focus:border-primary-200/50"
                    >
                        <option value="balanced">Balanced</option>
                        <option value="depth">Depth (Deep Dive, Detailed Follow-ups)</option>
                        <option value="breadth">Breadth (Cover multiple topics briefly)</option>
                    </select>
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-light-100">Number of Main Questions</label>
                    <select 
                        value={questionCount} 
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="input bg-dark-200 text-light-100 w-full min-h-12 px-5 rounded-full border border-dark-200/50 outline-none cursor-pointer focus:border-primary-200/50"
                    >
                        <option value={3}>3 Questions (Quick Test)</option>
                        <option value={5}>5 Questions (Recommended)</option>
                        <option value={8}>8 Questions (Standard)</option>
                        <option value={10}>10 Questions (Detailed)</option>
                    </select>
                </div>
            </div>

            {/* Custom Notes */}
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-light-100">Custom Focus / Notes (Optional)</label>
                <textarea 
                    placeholder="e.g. Focus on React hooks, system design, or specific leadership principles..."
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    className="bg-dark-200 text-light-100 rounded-2xl p-4 min-h-[80px] border border-dark-200/50 outline-none resize-none placeholder:text-light-400 focus:border-primary-200/50"
                />
            </div>

            {/* Footer / Action buttons */}
            <div className="flex gap-4 justify-end border-t border-light-800 pt-4 mt-2">
                {onCancel && (
                    <button 
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="btn-secondary min-h-12 px-6"
                    >
                        Cancel
                    </button>
                )}
                <button 
                    type="submit"
                    disabled={loading}
                    className="btn-primary min-h-12 px-8 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="resume-spinner-small" />
                            <span>Generating Setup...</span>
                        </>
                    ) : (
                        <span>Start Interview</span>
                    )}
                </button>
            </div>
        </form>
    );
};

export default InterviewSetupForm;
