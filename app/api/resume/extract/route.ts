import { db } from "@/firebase/admin";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function POST(request: Request) {
    try {
        const { resumeId, pdfBase64 } = await request.json();

        if (!resumeId || !pdfBase64) {
            return Response.json(
                { success: false, error: 'resumeId and pdfBase64 are required' },
                { status: 400 }
            );
        }

        // Convert base64 back to buffer
        const fileBuffer = Buffer.from(pdfBase64, 'base64');

        // Send PDF to Gemini for extraction
        const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'file',
                            data: fileBuffer,
                            mimeType: 'application/pdf',
                        },
                        {
                            type: 'text',
                            text: `Analyze this resume PDF and extract structured data.
Return a JSON object with exactly this structure:
{
  "name": "candidate's full name",
  "skills": ["skill1", "skill2", ...],
  "projects": [
    {
      "name": "project name",
      "tech": ["tech1", "tech2"],
      "features": ["feature1", "feature2"]
    }
  ],
  "experience": [
    {
      "role": "job title or role",
      "workDone": "summary of what they actually did, key responsibilities and achievements",
      "projectsCompleted": ["key deliverable 1", "key deliverable 2"],
      "duration": "e.g. 2 years, 6 months, etc."
    }
  ],
  "education": [
    {
      "degree": "degree name",
      "institution": "university/college name",
      "year": "graduation year or expected year"
    }
  ],
  "experienceLevel": "fresher" | "junior" | "mid" | "senior"
}

Rules:
- experienceLevel: fresher = 0-1 years total, junior = 1-3 years, mid = 3-6 years, senior = 6+ years
- If no work experience is found, set experience to an empty array and experienceLevel to "fresher"
- Extract ALL skills mentioned anywhere in the resume (technical, tools, frameworks, languages)
- For projects, extract personal/academic/professional projects
- For workDone, summarize the actual contributions, not just the job title
- For projectsCompleted, list specific deliverables or achievements
- Return ONLY valid JSON. No markdown, no code fences, no explanation.`,
                        },
                    ],
                },
            ],
        });

        // Parse the extracted data
        let extractedData: ResumeData;
        try {
            // Clean potential markdown code fences from response
            const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            extractedData = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', text);
            await db.collection('resumes').doc(resumeId).update({
                status: 'failed',
                error: 'Failed to parse extraction results. Please try again.',
            });
            return Response.json(
                { success: false, error: 'Failed to parse extraction' },
                { status: 500 }
            );
        }

        // Update Firestore with extracted data
        await db.collection('resumes').doc(resumeId).update({
            status: 'completed',
            extractedData,
        });

        return Response.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('Extraction error:', error);

        // Try to update status to failed
        try {
            const { resumeId } = await request.clone().json();
            if (resumeId) {
                await db.collection('resumes').doc(resumeId).update({
                    status: 'failed',
                    error: 'Extraction failed. Please try again.',
                });
            }
        } catch {
            // Ignore update failure
        }

        return Response.json(
            { success: false, error: 'Extraction failed' },
            { status: 500 }
        );
    }
}
