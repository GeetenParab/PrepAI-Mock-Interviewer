"use client"

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import Image from 'next/image';

interface ResumeUploadProps {
    userId: string;
    onUploadComplete: () => void;
}

const ResumeUpload = ({ userId, onUploadComplete }: ResumeUploadProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'extracting' | 'done' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const pollForStatus = useCallback(async (resumeId: string) => {
        const maxAttempts = 60; // 60 * 3s = 3 minutes max
        let attempts = 0;

        const poll = async (): Promise<void> => {
            attempts++;
            try {
                const res = await fetch(`/api/resume/status?resumeId=${resumeId}`);
                const data = await res.json();

                if (data.status === 'completed') {
                    setUploadState('done');
                    toast.success('Resume analyzed successfully!');
                    onUploadComplete();
                    // Reset after a delay
                    setTimeout(() => setUploadState('idle'), 2000);
                    return;
                }

                if (data.status === 'failed') {
                    setUploadState('error');
                    setErrorMessage(data.error || 'Extraction failed. Please try again.');
                    toast.error('Resume extraction failed.');
                    return;
                }

                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    return poll();
                } else {
                    setUploadState('error');
                    setErrorMessage('Extraction timed out. Please try again.');
                }
            } catch {
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    return poll();
                }
                setUploadState('error');
                setErrorMessage('Failed to check extraction status.');
            }
        };

        await poll();
    }, [onUploadComplete]);

    const handleUpload = async (file: File) => {
        // Validate file type
        if (file.type !== 'application/pdf') {
            toast.error('Only PDF files are allowed.');
            return;
        }

        // Validate file size (3MB)
        if (file.size > 3 * 1024 * 1024) {
            toast.error('File must be under 3MB.');
            return;
        }

        setUploadState('uploading');
        setErrorMessage('');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', userId);

            const response = await fetch('/api/resume/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Upload failed');
            }

            // Upload done, now poll for extraction
            setUploadState('extracting');
            await pollForStatus(data.resumeId);

        } catch (error) {
            console.error('Upload error:', error);
            setUploadState('error');
            setErrorMessage(error instanceof Error ? error.message : 'Upload failed. Please try again.');
            toast.error('Failed to upload resume.');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
        // Reset input so the same file can be re-selected
        e.target.value = '';
    };

    const isProcessing = uploadState === 'uploading' || uploadState === 'extracting';

    return (
        <div
            className={`resume-upload-zone ${isDragging ? 'resume-upload-zone-active' : ''} ${isProcessing ? 'opacity-80 pointer-events-none' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
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
                <div className="flex flex-col items-center gap-3">
                    <div className="resume-upload-icon">
                        <Image src="/upload.svg" alt="Upload" width={24} height={24} className="invert" />
                    </div>
                    <div className="text-center">
                        <p className="text-light-100 font-medium">
                            Drag & drop your resume here
                        </p>
                        <p className="text-light-400 text-sm mt-1">
                            or click to browse • PDF only • Max 3MB
                        </p>
                    </div>
                </div>
            )}

            {uploadState === 'uploading' && (
                <div className="flex flex-col items-center gap-3">
                    <div className="resume-upload-spinner" />
                    <p className="text-primary-200 font-medium">Uploading...</p>
                </div>
            )}

            {uploadState === 'extracting' && (
                <div className="flex flex-col items-center gap-3">
                    <div className="resume-upload-spinner" />
                    <p className="text-primary-200 font-medium">Analyzing your resume...</p>
                    <p className="text-light-400 text-sm">This may take a few seconds</p>
                </div>
            )}

            {uploadState === 'done' && (
                <div className="flex flex-col items-center gap-3">
                    <div className="resume-upload-icon-success">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <p className="text-success-100 font-medium">Done!</p>
                </div>
            )}

            {uploadState === 'error' && (
                <div className="flex flex-col items-center gap-3">
                    <div className="resume-upload-icon-error">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </div>
                    <p className="text-destructive-100 font-medium text-sm text-center">
                        {errorMessage}
                    </p>
                    <button
                        className="btn-secondary text-sm !min-h-8"
                        onClick={(e) => {
                            e.stopPropagation();
                            setUploadState('idle');
                            setErrorMessage('');
                        }}
                    >
                        Try Again
                    </button>
                </div>
            )}
        </div>
    );
};

export default ResumeUpload;
