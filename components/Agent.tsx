"use client"
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { vapi } from '@/lib/vapi.sdk';
import { interviewer, buildInterviewerConfig } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";

enum CallStatus {
    INACTIVE = 'INACTIVE',
    CONNECTING = 'CONNECTING',
    ACTIVE = 'ACTIVE',
    FINISHED = 'FINISHED',
}

interface SavedMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface AgentProps {
    userName: string;
    userId: string;
    userProfilePicture?: string;
    userInitials?: string;
    type: 'generate' | 'interview';
    interviewId?: string;
    questions?: string[];
    structuredQuestions?: InterviewQuestion[];
    resumeData?: ResumeData;
    targetRole?: string;
    targetCompany?: string;
    depthStrategy?: string;
    questionCount?: number;
}

interface Message {
    type: string;
    transcriptType?: string;
    role: 'user' | 'assistant' | 'system';
    transcript: string;
}

const Agent = ({
    userName,
    userId,
    userProfilePicture,
    userInitials,
    type,
    interviewId,
    questions,
    structuredQuestions,
    resumeData,
    targetRole,
    targetCompany,
    depthStrategy,
    questionCount,
}: AgentProps) => {
    const router = useRouter();
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
    const [message, setMessage] = useState<SavedMessage[]>([]);
    const [imageError, setImageError] = useState(false);
    const [isSavingFeedback, setIsSavingFeedback] = useState(false);
    // Task 3: track callId for transcript fallback
    const callIdRef = useRef<string | null>(null);

    // Task 3: Fetch transcript from Vapi API as fallback
    const fetchVapiTranscript = async (callId: string): Promise<SavedMessage[]> => {
        try {
            const res = await fetch(`/api/vapi/transcript?callId=${callId}`);
            if (!res.ok) return [];
            const data = await res.json();
            return data.transcript || [];
        } catch {
            return [];
        }
    };

    const handleGenerateFeedback = useCallback(async (messages: SavedMessage[]) => {
        if (type !== 'interview' || !interviewId) {
            router.push('/');
            return;
        }

        setIsSavingFeedback(true);

        try {
            let transcriptToUse = messages;

            // Task 3: Fallback — if we have fewer than 2 messages (call ended abruptly),
            // fetch the official transcript from Vapi
            if (messages.length < 2 && callIdRef.current) {
                console.log('Client transcript too short, fetching from Vapi API...');
                const vapiTranscript = await fetchVapiTranscript(callIdRef.current);
                if (vapiTranscript.length > messages.length) {
                    transcriptToUse = vapiTranscript;
                    console.log(`Fetched ${vapiTranscript.length} messages from Vapi fallback`);
                }
            }

            const { success, feedbackId: id } = await createFeedback({
                interviewId,
                userId,
                transcript: transcriptToUse,
                structuredQuestions,
            });

            if (success && id) {
                router.push(`/interview/${interviewId}/feedback`);
            } else {
                console.error('Error saving feedback');
                router.push('/');
            }
        } catch (error) {
            console.error('Error in handleGenerateFeedback:', error);
            router.push('/');
        } finally {
            setIsSavingFeedback(false);
        }
    }, [interviewId, userId, router, type, structuredQuestions]);

    useEffect(() => {
        const onCallStart = (event?: any) => {
            setCallStatus(CallStatus.ACTIVE);
            // Task 3: capture callId from call-start event
            if (event?.call?.id) {
                callIdRef.current = event.call.id;
            }
        };
        const onCallEnd = () => setCallStatus(CallStatus.FINISHED);
        
        const onMessage = (message: Message) => {
            if (message.type === 'transcript' && message.transcriptType === 'final') {
                const newMessage: SavedMessage = {
                    role: message.role,
                    content: message.transcript
                };
                setMessage((prev) => [...prev, newMessage]);
            }
        };

        const onSpeechStart = () => setIsSpeaking(true);
        const onSpeechEnd = () => setIsSpeaking(false);

        const onCallError = (error: Error) => {
            console.error('Call error:', error);
            // Fix 1: If Vapi ejects the call while active ("Meeting ended due to ejection"),
            // call-end may not fire. Force status to FINISHED so feedback is still generated.
            setCallStatus((prev) => {
                if (prev === CallStatus.ACTIVE || prev === CallStatus.CONNECTING) {
                    return CallStatus.FINISHED;
                }
                return prev;
            });
        };

        vapi.on('call-start', onCallStart);
        vapi.on('call-end', onCallEnd);
        vapi.on('message', onMessage);
        vapi.on('speech-start', onSpeechStart);
        vapi.on('speech-end', onSpeechEnd);
        vapi.on('error', onCallError);

        return () => {
            vapi.off('call-start', onCallStart);
            vapi.off('call-end', onCallEnd);
            vapi.off('message', onMessage);
            vapi.off('speech-start', onSpeechStart);
            vapi.off('speech-end', onSpeechEnd);
            vapi.off('error', onCallError);
        };
    }, []);

    useEffect(() => {
        if (callStatus === CallStatus.FINISHED) {
            if (type === "generate") {
                router.push('/')
            } else {
                handleGenerateFeedback(message);
            }
        }
    }, [message, callStatus, type, userId, router, interviewId, handleGenerateFeedback]);

    const handleCall = async () => {
        setCallStatus(CallStatus.CONNECTING);

        try {
            if (type === "generate") {
                await vapi.start(
                    undefined,
                    undefined,
                    undefined,
                    process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!,
                    {
                        variableValues: {
                            username: userName,
                            userid: userId,
                        },
                    }
                );
            } else {
                if (structuredQuestions && structuredQuestions.length > 0) {
                    const activeInterviewer = buildInterviewerConfig({
                        structuredQuestions,
                        resumeData,
                        targetRole: targetRole || "Candidate",
                        targetCompany,
                        depthStrategy,
                        candidateName: userName,
                        questionCount,  // Task 1: pass questionCount for follow-up limiting
                    });
                    await vapi.start(activeInterviewer);
                } else {
                    let formattedQuestions = "";
                    if (questions) {
                        formattedQuestions = questions
                            .map((question) => `- ${question}`)
                            .join("\n");
                    }

                    await vapi.start(interviewer, {
                        variableValues: {
                            questions: formattedQuestions,
                        },
                    });
                }
            }
        } catch (error) {
            console.error('Failed to start call:', error);
            setCallStatus(CallStatus.INACTIVE);
        }
    };

    const handleDisconnect = async () => {
        try {
            await vapi.stop();
            setCallStatus(CallStatus.FINISHED);
        } catch (error) {
            console.error('Failed to stop call:', error);
        }
    };

    const latestMessage = message[message.length - 1]?.content;
    const isCallInactiveOrFinished = callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED;

    return (
        <>
            <div className='call-view'>
                <div className='card-interviewer'>
                    <div className='avatar'>
                        <Image src="/ai-avatar.png" className='object-cover' alt="Avatar" width={65} height={54} />
                        {isSpeaking && <span className="animate-speak" />}
                    </div>
                    <h3>AI Interviewer</h3>
                </div>

                <div className='card-border'>
                    <div className='card-content'>
                        {!imageError && userProfilePicture ? (
                            <Image 
                                src={userProfilePicture} 
                                className='rounded-full object-cover size-[120px]' 
                                alt={userName} 
                                width={120} 
                                height={120}
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <div className='rounded-full bg-gradient-to-br from-blue-500 to-purple-600 size-[120px] flex items-center justify-center text-white text-2xl font-bold shadow-lg'>
                                {userInitials || userName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <h3>{userName}</h3>
                    </div>
                </div>
            </div>
            
            {message.length > 0 && (
                <div className="transcript-border">
                    <div className='transcript'>
                        <p key={latestMessage} className={cn('transition-opacity duration-500 opacity-0', 'animate-fadeIn opacity-100')}>
                            {latestMessage}
                        </p>
                    </div>
                </div>
            )}

            {isSavingFeedback && (
                <div className="flex items-center justify-center gap-3 text-light-400 text-sm">
                    <div className="resume-spinner-small" />
                    <span>Analyzing your interview and generating feedback...</span>
                </div>
            )}

            <div className='w-full flex justify-center'>
                {callStatus !== CallStatus.ACTIVE ? (
                    <button className='relative btn-call' onClick={handleCall} disabled={isSavingFeedback}>
                        <span className={cn('absolute animate-ping rounded-full opacity-75', callStatus === 'CONNECTING' && 'hidden')} />
                        <span>{isCallInactiveOrFinished ? 'Call' : 'Connecting...'}</span>
                    </button>
                ) : (
                    <button className='btn-disconnect' onClick={handleDisconnect}>Disconnect</button>
                )}
            </div>
        </>
    );
};

export default Agent;