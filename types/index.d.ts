interface Feedback {
  id: string;
  interviewId: string;
  totalScore: number;
  categoryScores: Array<{
    name: string;
    score: number;
    comment: string;
  }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  createdAt: string;
  // Merged transcript (fragments joined, original words kept) stored for display
  transcript?: { role: string; content: string }[];
  // Filler word stats (Task 5)
  fillerWordCount?: number;
  repetitionCount?: number;
  // Per-answer evaluation (Task 6)
  answerEvaluations?: AnswerEvaluation[];
}

interface AnswerEvaluation {
  questionId: number;
  question: string;
  answer: string;
  scores: {
    technicalAccuracy: number;
    clarity: number;
    depth: number;
    confidence: number;
  };
  overallAnswerScore: number;
  whatWentWell: string;
  improvements: string;
}

interface Interview {
  id: string;
  role: string;
  level: string;
  questions: string[];
  techstack: string[];
  createdAt: string;
  userId: string;
  type: string;
  finalized: boolean;
  resumeId?: string;
  resumeName?: string;
  targetCompany?: string;
  depthStrategy?: string;
  structuredQuestions?: InterviewQuestion[];
  customNotes?: string;
  questionCount?: number;
}

interface CreateFeedbackParams {
  interviewId: string;
  userId: string;
  transcript: { role: string; content: string }[];
  feedbackId?: string;
  structuredQuestions?: InterviewQuestion[];
}

interface User {
  name: string;
  email: string;
  id: string;
  profilePicture?: string; // URL to profile picture
  profileInitials?: string; // Fallback initials
}

interface InterviewCardProps {
  id?: string;
  userId?: string;
  role: string;
  type: string;
  techstack: string[];
  createdAt?: string;
}

interface AgentProps {
  userName: string;
  userId?: string;
  interviewId?: string;
  feedbackId?: string;
  type: "generate" | "interview";
  questions?: string[];
  structuredQuestions?: InterviewQuestion[];
  depthStrategy?: string;
  targetCompany?: string;
  resumeData?: ResumeData;
  questionCount?: number;
}

interface RouteParams {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string>>;
}

interface GetFeedbackByInterviewIdParams {
  interviewId: string;
  userId: string;
}

interface GetLatestInterviewsParams {
  userId: string;
  limit?: number;
}

interface SignInParams {
  email: string;
  idToken: string;
}

interface SignUpParams {
  uid: string;
  name: string;
  email: string;
  password: string;
}

type FormType = "sign-in" | "sign-up";

interface InterviewFormProps {
  interviewId: string;
  role: string;
  level: string;
  type: string;
  techstack: string[];
  amount: number;
}

interface TechIconProps {
  techStack: string[];
}

// Resume types
interface ResumeProject {
  name: string;
  tech: string[];
  features: string[];
}

interface ResumeExperience {
  role: string;
  workDone: string;
  projectsCompleted: string[];
  duration: string;
}

interface ResumeEducation {
  degree: string;
  institution: string;
  year: string;
}

interface ResumeData {
  name: string;
  skills: string[];
  projects: ResumeProject[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  experienceLevel: 'fresher' | 'junior' | 'mid' | 'senior';
}

interface Resume {
  id: string;
  userId: string;
  fileName: string;
  fileUrl?: string;
  storagePath?: string;
  status: 'processing' | 'completed' | 'failed';
  extractedData?: ResumeData;
  error?: string;
  createdAt: string;
}

// Interview Setup + Structured Questions
interface QuestionFollowUp {
  condition: string;
  question: string;
}

interface InterviewQuestion {
  id: number;
  question: string;
  category: 'technical' | 'behavioral' | 'system-design' | 'situational';
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  followUps: QuestionFollowUp[];
  resumeContext?: string;
}

interface InterviewSetupParams {
  resumeId: string;
  targetRole: string;
  targetCompany?: string;
  interviewType: 'technical' | 'behavioral' | 'mixed' | 'system-design';
  experienceLevel: 'fresher' | 'junior' | 'mid' | 'senior';
  depthStrategy: 'breadth' | 'depth' | 'balanced';
  questionCount: number;
  customNotes?: string;
}
