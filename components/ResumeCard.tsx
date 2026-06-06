"use client"

import { useState } from 'react';
import { toast } from 'sonner';
import dayjs from 'dayjs';

interface ResumeCardProps {
    resume: Resume;
    onDelete: () => void;
}

const ResumeCard = ({ resume, onDelete }: ResumeCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const response = await fetch('/api/resume/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resumeId: resume.id,
                }),
            });

            const data = await response.json();
            if (data.success) {
                toast.success('Resume deleted.');
                onDelete();
            } else {
                throw new Error('Delete failed');
            }
        } catch {
            toast.error('Failed to delete resume.');
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const formattedDate = dayjs(resume.createdAt).format('MMM D, YYYY');
    const data = resume.extractedData;

    return (
        <div className="resume-card">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {/* Status indicator */}
                        {resume.status === 'processing' && (
                            <span className="resume-status-processing" title="Processing">
                                <span className="resume-spinner-small" />
                            </span>
                        )}
                        {resume.status === 'completed' && (
                            <span className="resume-status-completed" title="Completed">✓</span>
                        )}
                        {resume.status === 'failed' && (
                            <span className="resume-status-failed" title="Failed">✕</span>
                        )}
                        <h3 className="!text-lg font-semibold truncate">{resume.fileName}</h3>
                    </div>
                    <p className="text-light-400 text-sm">{formattedDate}</p>
                </div>

                {/* Delete button */}
                <div className="flex-shrink-0">
                    {!showDeleteConfirm ? (
                        <button
                            className="text-light-400 hover:text-destructive-100 transition-colors text-sm p-1"
                            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                            title="Delete resume"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                className="text-xs text-destructive-100 font-semibold hover:underline"
                                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Confirm'}
                            </button>
                            <button
                                className="text-xs text-light-400 hover:underline"
                                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Completed content */}
            {resume.status === 'completed' && data && (
                <>
                    {/* Experience level badge */}
                    <div className="flex items-center gap-2 mt-3">
                        <span className="level-badge capitalize">{data.experienceLevel}</span>
                        {data.projects.length > 0 && (
                            <span className="text-light-400 text-sm">
                                {data.projects.length} project{data.projects.length !== 1 ? 's' : ''}
                            </span>
                        )}
                        {data.experience.length > 0 && (
                            <span className="text-light-400 text-sm">
                                • {data.experience.length} role{data.experience.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {/* Skills tags */}
                    {data.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {data.skills.slice(0, isExpanded ? data.skills.length : 8).map((skill, i) => (
                                <span key={i} className="skill-badge">{skill}</span>
                            ))}
                            {!isExpanded && data.skills.length > 8 && (
                                <span className="skill-badge !bg-dark-300 !text-light-400">
                                    +{data.skills.length - 8} more
                                </span>
                            )}
                        </div>
                    )}

                    {/* Expand/Collapse */}
                    <button
                        className="text-primary-200 text-sm mt-3 hover:underline font-medium"
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                    >
                        {isExpanded ? '▲ Show less' : '▼ View details'}
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                        <div className="mt-4 space-y-4 border-t border-dark-200 pt-4">
                            {/* Name */}
                            {data.name && (
                                <div>
                                    <h4 className="text-sm font-semibold text-primary-100 mb-1">Name</h4>
                                    <p className="text-light-100 text-sm">{data.name}</p>
                                </div>
                            )}

                            {/* Experience */}
                            {data.experience.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-primary-100 mb-2">Experience</h4>
                                    {data.experience.map((exp, i) => (
                                        <div key={i} className="mb-3 pl-3 border-l-2 border-primary-200/30">
                                            <p className="text-light-100 text-sm font-medium">{exp.role}</p>
                                            <p className="text-light-400 text-xs mb-1">{exp.duration}</p>
                                            <p className="text-light-100 text-sm">{exp.workDone}</p>
                                            {exp.projectsCompleted.length > 0 && (
                                                <ul className="mt-1">
                                                    {exp.projectsCompleted.map((proj, j) => (
                                                        <li key={j} className="text-sm !text-light-400">{proj}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Projects */}
                            {data.projects.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-primary-100 mb-2">Projects</h4>
                                    {data.projects.map((proj, i) => (
                                        <div key={i} className="mb-3 pl-3 border-l-2 border-primary-200/30">
                                            <p className="text-light-100 text-sm font-medium">{proj.name}</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {proj.tech.map((t, j) => (
                                                    <span key={j} className="skill-badge !text-xs !px-1.5 !py-0">{t}</span>
                                                ))}
                                            </div>
                                            {proj.features.length > 0 && (
                                                <ul className="mt-1">
                                                    {proj.features.map((feat, j) => (
                                                        <li key={j} className="text-sm !text-light-400">{feat}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Education */}
                            {data.education.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-primary-100 mb-2">Education</h4>
                                    {data.education.map((edu, i) => (
                                        <div key={i} className="mb-2 pl-3 border-l-2 border-primary-200/30">
                                            <p className="text-light-100 text-sm font-medium">{edu.degree}</p>
                                            <p className="text-light-400 text-xs">{edu.institution} • {edu.year}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* All Skills */}
                            <div>
                                <h4 className="text-sm font-semibold text-primary-100 mb-2">All Skills</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {data.skills.map((skill, i) => (
                                        <span key={i} className="skill-badge">{skill}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Processing state */}
            {resume.status === 'processing' && (
                <div className="mt-3 flex items-center gap-2">
                    <span className="resume-spinner-small" />
                    <p className="text-light-400 text-sm">Analyzing resume...</p>
                </div>
            )}

            {/* Failed state */}
            {resume.status === 'failed' && (
                <div className="mt-3">
                    <p className="text-destructive-100 text-sm">{resume.error || 'Extraction failed.'}</p>
                </div>
            )}
        </div>
    );
};

export default ResumeCard;
