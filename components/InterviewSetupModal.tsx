"use client"

import InterviewSetupForm from './InterviewSetupForm';

interface InterviewSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    resumes: Resume[];
}

const InterviewSetupModal = ({ isOpen, onClose, userId, resumes }: InterviewSetupModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
            <div className="card-border max-w-2xl w-full my-8">
                <div className="card p-6 md:p-8 flex flex-col gap-6 relative">
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-light-800 pb-4">
                        <h3 className="text-xl md:text-2xl font-bold text-primary-100">Setup Your Interview</h3>
                        <button 
                            onClick={onClose}
                            className="text-light-400 hover:text-white transition-colors p-1 rounded-full hover:bg-dark-200"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    {/* Setup Form */}
                    <InterviewSetupForm 
                        userId={userId} 
                        resumes={resumes} 
                        onCancel={onClose} 
                    />
                </div>
            </div>
        </div>
    );
};

export default InterviewSetupModal;
