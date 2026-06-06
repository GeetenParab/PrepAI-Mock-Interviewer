import React from 'react';
import Image from "next/image";
import InterviewCard from "@/components/InterviewCard";
import { getCurrentUser, } from "@/lib/actions/auth.action";
import { getInterviewsByUserId, getLatestInterviews } from "@/lib/actions/general.action";
import { getResumesByUserId } from '@/lib/actions/resume.action';
import StartInterviewButton from "@/components/StartInterviewButton";

const page = async () => {
  const user = await getCurrentUser();

  const [userInterviewsData, latestInterviewsData, resumes] = await Promise.all([
    await getInterviewsByUserId(user?.id!),
    await getLatestInterviews({ userId: user?.id! }),
    await getResumesByUserId(user?.id!)
  ]);

  const userInterviews = userInterviewsData || [];
  const latestInterviews = latestInterviewsData || [];

  const hasPastInterviews = userInterviews.length > 0;
  const hasUpcomingInterviews = latestInterviews.length > 0;

    return (
        <>
<section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2>Get Interview-Ready with AI-Powered Practice & Feedback</h2>
          <p className="text-lg">
            Practice real interview questions & get instant feedback
          </p>

          <StartInterviewButton userId={user?.id!} resumes={resumes || []} />
        </div>

        <Image
          src="/robot2.png"
          alt="robo-dude"
          width={400}
          height={400}
          className="max-sm:hidden"
        />
      </section>

      <section className="flex flex-col gap-6 mt-8">
      <h2>Your Interviews</h2>
      <div className="interviews-section">
        {hasPastInterviews ? (
          userInterviews.map((interview) => (
            <InterviewCard { ... interview} key={interview.id}/>
          ))
        ) : (
        <p>You haven&apos;t taken any interviews yet</p>
        )}
      </div>
      </section>

      <section className="flex flex-col gap-6 mt-8">
        <h2>Take an Interview</h2>

        <div className="interviews-section">
        {hasUpcomingInterviews ? (
          latestInterviews.map((interview) => (
            <InterviewCard { ... interview} key={interview.id}/>
          ))
        ) : (
        <p>There are no new interviews available</p>
        )}
        </div>
      </section>
        </>
    )
}
export default page;