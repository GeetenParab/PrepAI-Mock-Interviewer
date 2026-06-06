"use client"

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import InterviewSetupModal from '@/components/InterviewSetupModal';
import { toast } from 'sonner';

interface StartInterviewButtonProps {
    userId: string;
    resumes: Resume[];
}

export default function StartInterviewButton({ userId, resumes }: StartInterviewButtonProps) {
    const [isInterviewOpen, setIsInterviewOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'extracting' | 'done' | 'error'>('idle');
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const pollForStatus = async (resumeId: string) => {
        const maxAttempts = 60;
        let attempts = 0;

        const poll = async (): Promise<void> => {
            attempts++;
            try {
                const res = await fetch(`/api/resume/status?resumeId=${resumeId}`);
                const data = await res.json();

                if (data.status === 'completed') {
                    setUploadState('done');
                    toast.success('Resume uploaded and analyzed! You can now select it in your interview setup.');
                    setTimeout(() => {
                        setUploadState('idle');
                        setIsUploadOpen(false);
                    }, 2000);
                    return;
                }
                if (data.status === 'failed') {
                    setUploadState('error');
                    setUploadError(data.error || 'Extraction failed. Please try again.');
                    return;
                }
                if (attempts < maxAttempts) {
                    await new Promise(r => setTimeout(r, 3000));
                    return poll();
                } else {
                    setUploadState('error');
                    setUploadError('Extraction timed out. Please try again.');
                }
            } catch {
                if (attempts < maxAttempts) {
                    await new Promise(r => setTimeout(r, 3000));
                    return poll();
                }
                setUploadState('error');
                setUploadError('Failed to check status.');
            }
        };

        await poll();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        if (file.type !== 'application/pdf') {
            toast.error('Only PDF files are accepted.');
            return;
        }
        if (file.size > 3 * 1024 * 1024) {
            toast.error('File must be under 3MB.');
            return;
        }

        setUploadState('uploading');
        setUploadError('');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', userId);

            const res = await fetch('/api/resume/upload', { method: 'POST', body: formData });
            const data = await res.json();

            if (!data.success) throw new Error(data.error || 'Upload failed');

            setUploadState('extracting');
            await pollForStatus(data.resumeId);
        } catch (err: any) {
            setUploadState('error');
            setUploadError(err.message || 'Upload failed.');
            toast.error('Upload failed.');
        }
    };

    const isProcessing = uploadState === 'uploading' || uploadState === 'extracting';

    return (
        <>
            <div className="flex flex-wrap gap-3">
                {/* Primary CTA */}
                <Button
                    onClick={() => setIsInterviewOpen(true)}
                    className="btn-primary max-sm:w-full cursor-pointer"
                >
                    Start an Interview
                </Button>

                {/* Task 4: Upload Resume shortcut */}
                <Button
                    onClick={() => setIsUploadOpen(true)}
                    className="btn-secondary max-sm:w-full cursor-pointer"
                >
                    Upload Resume
                </Button>
            </div>

            <InterviewSetupModal
                isOpen={isInterviewOpen}
                onClose={() => setIsInterviewOpen(false)}
                userId={userId}
                resumes={resumes}
            />

            {/* Quick Upload Modal */}
            {isUploadOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="card-border max-w-md w-full">
                        <div className="card p-6 flex flex-col gap-5">
                            {/* Header */}
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-primary-100">Upload Resume</h3>
                                <button
                                    onClick={() => { setIsUploadOpen(false); setUploadState('idle'); setUploadError(''); }}
                                    disabled={isProcessing}
                                    className="text-light-400 hover:text-white transition-colors p-1 rounded-full hover:bg-dark-200"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>

                            <p className="text-light-400 text-sm">Upload your resume to get personalized, resume-aware interview questions.</p>

                            {/* Drop Zone */}
                            <div
                                className={`resume-upload-zone ${isProcessing ? 'opacity-70 pointer-events-none' : 'cursor-pointer'}`}
                                onClick={() => !isProcessing && fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                {uploadState === 'idle' && (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="resume-upload-icon">
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-200">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                                            </svg>
                                        </div>
                                        <p className="text-light-100 font-medium text-sm">Click to select PDF</p>
                                        <p className="text-light-400 text-xs">PDF only · Max 3MB</p>
                                    </div>
                                )}

                                {uploadState === 'uploading' && (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="resume-upload-spinner" />
                                        <p className="text-primary-200 text-sm font-medium">Uploading...</p>
                                    </div>
                                )}

                                {uploadState === 'extracting' && (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="resume-upload-spinner" />
                                        <p className="text-primary-200 text-sm font-medium">Analyzing resume with AI...</p>
                                        <p className="text-light-400 text-xs">This takes a few seconds</p>
                                    </div>
                                )}

                                {uploadState === 'done' && (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="resume-upload-icon-success">
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </div>
                                        <p className="text-success-100 font-medium text-sm">Resume ready!</p>
                                    </div>
                                )}

                                {uploadState === 'error' && (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="resume-upload-icon-error">
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </div>
                                        <p className="text-destructive-100 text-sm text-center">{uploadError}</p>
                                        <button
                                            className="btn-secondary text-xs !min-h-7 !px-3"
                                            onClick={(e) => { e.stopPropagation(); setUploadState('idle'); setUploadError(''); }}
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                )}
                            </div>

                            <p className="text-light-400 text-xs text-center">
                                You can manage all your resumes in the{' '}
                                <a href="/resumes" className="text-primary-200 hover:underline">Resumes</a> page.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
