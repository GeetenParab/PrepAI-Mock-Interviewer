import { db } from "@/firebase/admin";
import { after } from "next/server";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const userId = formData.get('userId') as string | null;

        // Validate inputs
        if (!file || !userId) {
            return Response.json(
                { success: false, error: 'File and userId are required' },
                { status: 400 }
            );
        }

        // Validate file type
        if (file.type !== 'application/pdf') {
            return Response.json(
                { success: false, error: 'Only PDF files are allowed' },
                { status: 400 }
            );
        }

        // Validate file size (max 3MB)
        const MAX_SIZE = 3 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return Response.json(
                { success: false, error: 'File size must be under 3MB' },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Create Firestore document with status "processing"
        const resumeDoc = await db.collection('resumes').add({
            userId,
            fileName: file.name,
            status: 'processing',
            createdAt: new Date().toISOString(),
        });

        const resumeId = resumeDoc.id;

        // Trigger background extraction after response is sent
        const baseUrl = request.headers.get('host') || 'localhost:3000';
        const protocol = request.headers.get('x-forwarded-proto') || 'http';

        after(async () => {
            try {
                await fetch(`${protocol}://${baseUrl}/api/resume/extract`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        resumeId, 
                        pdfBase64: buffer.toString('base64') 
                    }),
                });
            } catch (error) {
                console.error('Failed to trigger extraction:', error);
                // Update status to failed if we can't even trigger extraction
                await db.collection('resumes').doc(resumeId).update({
                    status: 'failed',
                    error: 'Failed to start extraction process',
                });
            }
        });

        return Response.json({ success: true, resumeId }, { status: 200 });

    } catch (error) {
        console.error('Upload error:', error);
        return Response.json(
            { success: false, error: 'Failed to upload resume' },
            { status: 500 }
        );
    }
}
