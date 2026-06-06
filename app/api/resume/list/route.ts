import { db } from "@/firebase/admin";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const userId = request.nextUrl.searchParams.get('userId');

        if (!userId) {
            return Response.json(
                { success: false, error: 'userId is required' },
                { status: 400 }
            );
        }

        const resumes = await db.collection('resumes')
            .where('userId', '==', userId)
            .get();

        const resumeList = resumes.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        })) as Resume[];

        // Sort in memory to avoid requiring a composite index
        resumeList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return Response.json({ success: true, resumes: resumeList }, { status: 200 });

    } catch (error) {
        console.error('List resumes error:', error);
        return Response.json(
            { success: false, error: 'Failed to list resumes' },
            { status: 500 }
        );
    }
}
