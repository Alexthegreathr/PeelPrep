import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { getInterviewDraft } from "@/lib/data/interviews";
import { listDocuments } from "@/lib/data/documents";
import { toWizardDraft } from "@/lib/interviews/draft";
import { PageHeader } from "@/components/app/page-header";
import { IntakeWizard } from "@/components/interviews/intake-wizard";
import { InterviewHub } from "@/components/interviews/interview-hub";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Interview" };

export default async function InterviewPage(
  props: PageProps<"/interviews/[id]">,
) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const draft = await getInterviewDraft(id);
  if (!draft) notFound();

  const { interview, interviewers, documents: documentLinks } = draft;
  const editing = searchParams.edit === "1";
  const showWizard = interview.status === "draft" || editing;

  if (showWizard) {
    const documents = await listDocuments();
    return (
      <div>
        <PageHeader
          title={editing ? "Edit interview" : "New interview"}
          description="Add or update the details. Your progress saves automatically."
          action={
            editing ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/interviews/${id}`}>Done editing</Link>
              </Button>
            ) : undefined
          }
        />
        <IntakeWizard
          interviewId={interview.id}
          initialDraft={toWizardDraft(interview, interviewers, documentLinks)}
          initialStep={interview.intake_step}
          documents={documents}
        />
      </div>
    );
  }

  const documents = await listDocuments();
  return (
    <InterviewHub
      interview={interview}
      interviewers={interviewers}
      documentLinks={documentLinks}
      documents={documents}
    />
  );
}
