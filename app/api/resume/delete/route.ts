import { db } from "@/firebase/admin";

export async function POST(request: Request) {
    try {
        const { resumeId } = await request.json();

        if (!resumeId) {
            return Response.json(
                { success: false, error: 'resumeId is required' },
                { status: 400 }
            );
        }

        // Delete document from Firestore
        await db.collection('resumes').doc(resumeId).delete();

        return Response.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('Delete error:', error);
        return Response.json(
            { success: false, error: 'Failed to delete resume' },
            { status: 500 }
        );
    }
}
