import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";
import { z } from "zod";

export const mappings = {
  "react.js": "react",
  reactjs: "react",
  react: "react",
  "next.js": "nextjs",
  nextjs: "nextjs",
  next: "nextjs",
  "vue.js": "vuejs",
  vuejs: "vuejs",
  vue: "vuejs",
  "express.js": "express",
  expressjs: "express",
  express: "express",
  "node.js": "nodejs",
  nodejs: "nodejs",
  node: "nodejs",
  mongodb: "mongodb",
  mongo: "mongodb",
  mongoose: "mongoose",
  mysql: "mysql",
  postgresql: "postgresql",
  sqlite: "sqlite",
  firebase: "firebase",
  docker: "docker",
  kubernetes: "kubernetes",
  aws: "aws",
  azure: "azure",
  gcp: "gcp",
  digitalocean: "digitalocean",
  heroku: "heroku",
  photoshop: "photoshop",
  "adobe photoshop": "photoshop",
  html5: "html5",
  html: "html5",
  css3: "css3",
  css: "css3",
  sass: "sass",
  scss: "sass",
  less: "less",
  tailwindcss: "tailwindcss",
  tailwind: "tailwindcss",
  bootstrap: "bootstrap",
  jquery: "jquery",
  typescript: "typescript",
  ts: "typescript",
  javascript: "javascript",
  js: "javascript",
  "angular.js": "angular",
  angularjs: "angular",
  angular: "angular",
  "ember.js": "ember",
  emberjs: "ember",
  ember: "ember",
  "backbone.js": "backbone",
  backbonejs: "backbone",
  backbone: "backbone",
  nestjs: "nestjs",
  graphql: "graphql",
  "graph ql": "graphql",
  apollo: "apollo",
  webpack: "webpack",
  babel: "babel",
  "rollup.js": "rollup",
  rollupjs: "rollup",
  rollup: "rollup",
  "parcel.js": "parcel",
  parceljs: "parcel",
  npm: "npm",
  yarn: "yarn",
  git: "git",
  github: "github",
  gitlab: "gitlab",
  bitbucket: "bitbucket",
  figma: "figma",
  prisma: "prisma",
  redux: "redux",
  flux: "flux",
  redis: "redis",
  selenium: "selenium",
  cypress: "cypress",
  jest: "jest",
  mocha: "mocha",
  chai: "chai",
  karma: "karma",
  vuex: "vuex",
  "nuxt.js": "nuxt",
  nuxtjs: "nuxt",
  nuxt: "nuxt",
  strapi: "strapi",
  wordpress: "wordpress",
  contentful: "contentful",
  netlify: "netlify",
  vercel: "vercel",
  "aws amplify": "amplify",
};

export const interviewer: CreateAssistantDTO = {
  name: "Interviewer",
  firstMessage:
    "Hello! Thank you for taking the time to speak with me today. I'm excited to learn more about you and your experience.",
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en",
  },
  voice: {
    provider: "11labs",
    voiceId: "sarah",
    stability: 0.4,
    similarityBoost: 0.8,
    speed: 0.9,
    style: 0.5,
    useSpeakerBoost: true,
  },
  model: {
    provider: "openai",
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a professional job interviewer conducting a real-time voice interview with a candidate. Your goal is to assess their qualifications, motivation, and fit for the role.

Interview Guidelines:
Follow the structured question flow:
{{questions}}

Engage naturally & react appropriately:
Listen actively to responses and acknowledge them before moving forward.
Ask brief follow-up questions if a response is vague or requires more detail.
Keep the conversation flowing smoothly while maintaining control.
Be professional, yet warm and welcoming:

Use official yet friendly language.
Keep responses concise and to the point (like in a real voice interview).
Avoid robotic phrasing—sound natural and conversational.
Answer the candidate's questions professionally:

If asked about the role, company, or expectations, provide a clear and relevant answer.
If unsure, redirect the candidate to HR for more details.

Conclude the interview properly:
Thank the candidate for their time.
Inform them that the company will reach out soon with feedback.
End the conversation on a polite and positive note.


- Be sure to be professional and polite.
- Keep all your responses short and simple. Use official language, but be kind and welcoming.
- This is a voice conversation, so keep your responses short, like in a real conversation. Don't ramble for too long.`,
      },
    ],
  },
};

// Build a dynamic interviewer config with enriched context
export function buildInterviewerConfig(params: {
  structuredQuestions: InterviewQuestion[];
  resumeData?: ResumeData;
  targetRole: string;
  targetCompany?: string;
  depthStrategy?: string;
  candidateName?: string;
  questionCount?: number;
}): CreateAssistantDTO {
  const { structuredQuestions, resumeData, targetRole, targetCompany, depthStrategy, candidateName, questionCount } = params;
  const isQuickTest = typeof questionCount === 'number' && questionCount <= 3;

  // Build the questions block with follow-up instructions
  const questionsBlock = structuredQuestions
    .map((q) => {
      let block = `Question ${q.id} [${q.category} - ${q.topic} - ${q.difficulty}]: ${q.question}`;
      if (q.followUps && q.followUps.length > 0) {
        block += "\n  Follow-up instructions:";
        q.followUps.forEach((fu) => {
          block += `\n  - ${fu.condition} → Ask: "${fu.question}"`;
        });
      }
      return block;
    })
    .join("\n\n");

  // Build resume summary for system context
  let candidateContext = "";
  if (resumeData) {
    candidateContext = `
CANDIDATE BACKGROUND (use this to personalize your conversation):
- Name: ${resumeData.name || candidateName || "the candidate"}
- Experience Level: ${resumeData.experienceLevel}
- Key Skills: ${resumeData.skills.slice(0, 10).join(", ")}
${resumeData.experience.length > 0 ? `- Recent Role: ${resumeData.experience[0].role} (${resumeData.experience[0].duration})` : ""}
${resumeData.projects.length > 0 ? `- Notable Projects: ${resumeData.projects.slice(0, 3).map((p) => p.name).join(", ")}` : ""}
`;
  }

  // Company context
  const companyBlock = targetCompany
    ? `\nCOMPANY CONTEXT: This interview is for ${targetCompany}. Tailor your style and expectations to match ${targetCompany}'s known interview culture.`
    : "";

  // Depth instructions
  const depthBlock = isQuickTest
    ? "\nDEPTH STRATEGY: This is a QUICK TEST with very few questions. Keep the pace fast. Move on after each answer — do NOT ask follow-up questions unless the answer is completely incomprehensible. Maximum 1 follow-up total across the entire interview."
    : ({
        breadth: "\nDEPTH STRATEGY: Cover many topics at surface to intermediate level. Move to the next question after 1-2 follow-ups max.",
        depth: "\nDEPTH STRATEGY: Go deep on each topic. Use all available follow-ups before moving on. Push the candidate to show deep understanding.",
        balanced: "\nDEPTH STRATEGY: Start broad, then drill into 2-3 areas where the candidate shows strength or weakness. Use 1-3 follow-ups per question based on response quality.",
      }[depthStrategy || "balanced"] || "");

  const followUpRule = isQuickTest
    ? "3. QUICK TEST MODE: Do NOT ask follow-up questions. After each answer, briefly acknowledge and immediately move to the next main question. You may ask at most 1 follow-up across the ENTIRE interview only if an answer is completely unclear."
    : "3. Use the follow-up instructions: check the condition, and if it matches the candidate's response, ask that follow-up. You may ask up to 2-4 follow-ups per main question, then move to the next topic.";

  const systemPrompt = `You are a professional interviewer conducting a real-time voice interview for the role of ${targetRole}. Your goal is to assess the candidate's qualifications, technical depth, and fit.
${candidateContext}${companyBlock}${depthBlock}

INTERVIEW QUESTIONS (follow this order, use follow-ups based on the conditions):

${questionsBlock}

CONDUCT RULES:
1. Ask questions one at a time. Wait for the candidate to finish before responding.
2. After each answer, briefly acknowledge it naturally before asking the next question or a follow-up.
${followUpRule}
4. If the candidate gives a confident, strong answer with good depth, acknowledge it positively and move on. Do not over-probe strong answers.
5. If the candidate is struggling, be encouraging but still ask the follow-up to give them a chance.
6. Keep your responses SHORT — this is a voice conversation. No paragraphs. Be conversational.
7. Do NOT reveal the scoring, follow-up conditions, or that you have a structured question list.
8. Conclude the interview properly: thank the candidate, tell them feedback will be provided soon.
9. If the candidate asks you a question about the role or company, answer briefly and redirect to the interview.`;

  return {
    name: "Interviewer",
    firstMessage: candidateName
      ? `Hello ${candidateName}! Thank you for taking the time to speak with me today. I'm excited to learn more about you and your experience as it relates to the ${targetRole} role${targetCompany ? ` at ${targetCompany}` : ""}. Shall we get started?`
      : `Hello! Thank you for taking the time to speak with me today. I'm excited to learn more about you and your experience. Shall we get started?`,
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en",
    },
    voice: {
      provider: "11labs",
      voiceId: "sarah",
      stability: 0.4,
      similarityBoost: 0.8,
      speed: 0.9,
      style: 0.5,
      useSpeakerBoost: true,
    },
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
      ],
    },
  };
}

export const feedbackSchema = z.object({
  totalScore: z.number(),
  categoryScores: z.tuple([
    z.object({
      name: z.literal("Communication Skills"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Technical Knowledge"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Problem Solving"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Cultural Fit"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Confidence and Clarity"),
      score: z.number(),
      comment: z.string(),
    }),
  ]),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  finalAssessment: z.string(),
});

export const answerEvaluationSchema = z.object({
  evaluations: z.array(
    z.object({
      questionId: z.number(),
      question: z.string(),
      answer: z.string(),
      scores: z.object({
        technicalAccuracy: z.number().min(0).max(100),
        clarity: z.number().min(0).max(100),
        depth: z.number().min(0).max(100),
        confidence: z.number().min(0).max(100),
      }),
      overallAnswerScore: z.number().min(0).max(100),
      whatWentWell: z.string(),
      improvements: z.string(),
    })
  ),
});

export const interviewCovers = [
  "/adobe.png",
  "/amazon.png",
  "/facebook.png",
  "/hostinger.png",
  "/pinterest.png",
  "/quora.png",
  "/reddit.png",
  "/skype.png",
  "/spotify.png",
  "/telegram.png",
  "/tiktok.png",
  "/yahoo.png",
];

export const dummyInterviews: Interview[] = [
  {
    id: "1",
    userId: "user1",
    role: "Frontend Developer",
    type: "Technical",
    techstack: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
    level: "Junior",
    questions: ["What is React?"],
    finalized: false,
    createdAt: "2024-03-15T10:00:00Z",
  },
  {
    id: "2",
    userId: "user1",
    role: "Full Stack Developer",
    type: "Mixed",
    techstack: ["Node.js", "Express", "MongoDB", "React"],
    level: "Senior",
    questions: ["What is Node.js?"],
    finalized: false,
    createdAt: "2024-03-14T15:30:00Z",
  },
];
