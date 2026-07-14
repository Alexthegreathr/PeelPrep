"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getInterview } from "@/lib/data/interviews";
import { isOutcomeResearchOptedIn } from "@/lib/data/consent";
import { outcomeSchema } from "@/lib/validation/outcome";

export type OutcomeResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export async function saveOutcome(
  interviewId: string,
  input: unknown,
): Promise<OutcomeResult> {
  const user = await requireUser();
  const interview = await getInterview(interviewId);
  if (!interview) return { ok: false, message: "Interview not found." };

  const parsed = outcomeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the form.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const d = parsed.data;

  // Snapshot whether outcome-research use was consented at record time, so a
  // later withdrawal is honored historically (SECURITY.md §9).
  const researchOptin = await isOutcomeResearchOptedIn();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("outcomes").upsert(
    {
      user_id: user.id,
      interview_id: interviewId,
      completed_on: d.completedOn ?? null,
      difficulty: d.difficulty ?? null,
      questions_encountered: d.questionsEncountered ?? null,
      went_well: d.wentWell ?? null,
      went_poorly: d.wentPoorly ?? null,
      confidence: d.confidence ?? null,
      advanced: d.advanced ?? null,
      received_offer: d.receivedOffer ?? null,
      private_notes: d.privateNotes ?? null,
      lessons: d.lessons ?? null,
      research_optin_snapshot: researchOptin,
    },
    { onConflict: "interview_id" },
  );
  if (error) return { ok: false, message: "Couldn't save your outcome." };

  // Recording an outcome completes the interview.
  await supabase
    .from("interviews")
    .update({ status: "completed" })
    .eq("id", interviewId)
    .eq("user_id", user.id);

  revalidatePath(`/interviews/${interviewId}`);
  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect(`/interviews/${interviewId}`);
}
