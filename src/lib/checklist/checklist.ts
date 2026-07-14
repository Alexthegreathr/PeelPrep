import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const CHECKLIST_TEMPLATE = [
  "Research the company's recent priorities and products",
  "Prepare at least 3 STAR stories",
  "Re-read the job description and note key skills",
  "Prepare 2–3 thoughtful questions to ask",
  "Confirm the interview time, format, and meeting link or location",
] as const;

/** Create the checklist + template items on first use; return its id. */
export async function ensureChecklist(
  interviewId: string,
  userId: string,
): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("checklists")
    .select("id")
    .eq("interview_id", interviewId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created } = await admin
    .from("checklists")
    .insert({ user_id: userId, interview_id: interviewId })
    .select("id")
    .single();
  await admin.from("checklist_items").insert(
    CHECKLIST_TEMPLATE.map((label, i) => ({
      user_id: userId,
      checklist_id: created!.id,
      label,
      source: "template" as const,
      sort_order: i,
    })),
  );
  return created!.id;
}
