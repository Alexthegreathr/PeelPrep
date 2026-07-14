import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Info } from "lucide-react";

import { getInterview } from "@/lib/data/interviews";
import { listQuestions } from "@/lib/data/questions";
import { listStories } from "@/lib/data/stories";
import { PageHeader } from "@/components/app/page-header";
import { InterviewSubnav } from "@/components/interviews/interview-subnav";
import { QuestionsView } from "@/components/questions/questions-view";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Predicted questions" };

export default async function QuestionsPage(
  props: PageProps<"/interviews/[id]/questions">,
) {
  const { id } = await props.params;
  const interview = await getInterview(id);
  if (!interview) notFound();

  if (interview.status === "draft") {
    return (
      <div>
        <PageHeader title="Predicted questions" />
        <Alert>
          <Info aria-hidden="true" />
          <AlertDescription>
            <p>Finish and confirm your interview intake first.</p>
            <p className="mt-2">
              <Button asChild size="sm">
                <Link href={`/interviews/${id}`}>Finish intake</Link>
              </Button>
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const [questions, stories] = await Promise.all([
    listQuestions(id),
    listStories(),
  ]);

  return (
    <div>
      <PageHeader
        title="Predicted questions"
        description={`${interview.company_name || "Your interview"} · ${interview.position_title || ""}`}
      />
      <InterviewSubnav interviewId={id} active="questions" />
      <QuestionsView interviewId={id} questions={questions} stories={stories} />
    </div>
  );
}
