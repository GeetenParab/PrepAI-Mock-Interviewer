import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/actions/auth.action';
import { getResumesByUserId } from '@/lib/actions/resume.action';
import InterviewSetupForm from '@/components/InterviewSetupForm';

const Page = async () => {
    const user = await getCurrentUser();
    
    if (!user) redirect('/sign-in');

    const resumes = await getResumesByUserId(user.id) || [];

    return (
        <div className="max-w-2xl mx-auto flex flex-col gap-6 max-sm:px-4">
            <div className="flex flex-col gap-2 border-b border-light-800 pb-4">
                <h3 className="text-2xl font-semibold">Configure Your Interview</h3>
                <p className="text-light-400 text-sm">
                    Customize your role, experience level, depth strategy, and resume context to generate personalized questions.
                </p>
            </div>

            <div className="card-border w-full">
                <div className="card p-6 md:p-8">
                    <InterviewSetupForm 
                        userId={user.id} 
                        resumes={resumes} 
                    />
                </div>
            </div>
        </div>
    );
};

export default Page;