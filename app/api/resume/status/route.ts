import { db } from "@/firebase/admin";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const resumeId = request.nextUrl.searchParams.get('resumeId');

        if (!resumeId) {
            return Response.json(
                { success: false, error: 'resumeId is required' },
                { status: 400 }
            );
        }

        const doc = await db.collection('resumes').doc(resumeId).get();

        if (!doc.exists) {
            return Response.json(
                { success: false, error: 'Resume not found' },
                { status: 404 }
            );
        }

        const data = doc.data();

        return Response.json({
            success: true,
            status: data?.status,
            extractedData: data?.extractedData || null,
            error: data?.error || null,
        }, { status: 200 });

    } catch (error) {
        console.error('Status check error:', error);
        return Response.json(
            { success: false, error: 'Failed to check status' },
            { status: 500 }
        );
    }
}
