'use server';

import { db } from "@/firebase/admin";

export async function getResumesByUserId(userId: string): Promise<Resume[]> {
    const resumes = await db.collection('resumes')
        .where('userId', '==', userId)
        .get();

    const resumeList = resumes.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    })) as Resume[];

    return resumeList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getResumeById(resumeId: string): Promise<Resume | null> {
    try {
        const doc = await db.collection('resumes').doc(resumeId).get();

        if (!doc.exists) {
            return null;
        }

        return {
            id: doc.id,
            ...doc.data()
        } as Resume;
    } catch (error) {
        console.error('Error fetching resume:', error);
        return null;
    }
}

export async function deleteResume(resumeId: string): Promise<{ success: boolean }> {
    try {
        // Delete document from Firestore
        await db.collection('resumes').doc(resumeId).delete();

        return { success: true };
    } catch (error) {
        console.error('Error deleting resume:', error);
        return { success: false };
    }
}
