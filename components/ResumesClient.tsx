"use client"

import { useState, useEffect, useCallback } from 'react';
import ResumeUpload from '@/components/ResumeUpload';
import ResumeCard from '@/components/ResumeCard';

interface ResumesClientProps {
    userId: string;
    initialResumes: Resume[];
}

const ResumesClient = ({ userId, initialResumes }: ResumesClientProps) => {
    const [resumes, setResumes] = useState<Resume[]>(initialResumes);

    const refreshResumes = useCallback(async () => {
        try {
            const response = await fetch(`/api/resume/list?userId=${userId}`);
            const data = await response.json();
            if (data.success) {
                setResumes(data.resumes);
            }
        } catch (error) {
            console.error('Failed to refresh resumes:', error);
        }
    }, [userId]);

    // Poll for processing resumes
    useEffect(() => {
        const hasProcessing = resumes.some(r => r.status === 'processing');
        if (!hasProcessing) return;

        const interval = setInterval(refreshResumes, 3000);
        return () => clearInterval(interval);
    }, [resumes, refreshResumes]);

    return (
        <>
            <ResumeUpload userId={userId} onUploadComplete={refreshResumes} />

            <section className="flex flex-col gap-6 mt-8">
                <h2>Your Resumes</h2>
                {resumes.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {resumes.map((resume) => (
                            <ResumeCard
                                key={resume.id}
                                resume={resume}
                                onDelete={refreshResumes}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="card-border">
                        <div className="card p-8 text-center">
                            <p className="text-light-400">No resumes uploaded yet. Upload your first resume above!</p>
                        </div>
                    </div>
                )}
            </section>
        </>
    );
};

export default ResumesClient;
