import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/dal";
import { getInterview } from "@/lib/data/interviews";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getConsentState } from "@/lib/data/consent";
import { PageHeader } from "@/components/app/page-header";
import { InterviewSubnav } from "@/components/interviews/interview-subnav";
import {
  OutcomeForm,
  type OutcomeInitial,
} from "@/components/outcome/outcome-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Interview outcome" };

export default async function OutcomePage(
  props: PageProps<"/interviews/[id]/outcome">,
) {
  const { id } = await props.params;
  const user = await requireUser();
  const interview = await getInterview(id);
  if (!interview) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: outcome } = await supabase
    .from("outcomes")
    .select(
      "completed_on, difficulty, confidence, advanced, received_offer, questions_encountered, went_well, went_poorly, lessons, private_notes",
    )
    .eq("interview_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const consents = await getConsentState();

  return (
    <div>
      <PageHeader
        title="Interview outcome"
        description={`How did it go? ${interview.company_name || "Your interview"} · ${interview.position_title || ""}`}
      />
      <InterviewSubnav interviewId={id} active="outcome" />

      <Alert className="mb-6">
        <AlertDescription>
          <p>
            Your outcomes help improve <em>your own</em> future preparation.
            {consents.outcome_research_optin
              ? " You've opted in to letting anonymized outcome data improve system-wide predictions — you can change this in Settings."
              : " Anonymized outcome data is only used system-wide if you opt in (Settings) — it's off by default."}
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          <OutcomeForm
            interviewId={id}
            initial={(outcome as OutcomeInitial) ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
