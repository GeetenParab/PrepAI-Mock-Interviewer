import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/actions/auth.action';
import { getResumesByUserId } from '@/lib/actions/resume.action';
import ResumesClient from '@/components/ResumesClient';

const ResumesPage = async () => {
    const user = await getCurrentUser();
    if (!user) redirect('/sign-in');

    const resumes = await getResumesByUserId(user.id) || [];

    return (
        <>
            <div className="flex flex-row gap-4 justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold">My Resumes</h3>
            </div>

            <ResumesClient userId={user.id} initialResumes={resumes} />
        </>
    );
};

export default ResumesPage;
