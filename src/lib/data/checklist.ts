import "server-only";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ChecklistItem = {
  id: string;
  label: string;
  detail: string | null;
  source: string;
  completed_at: string | null;
  sort_order: number;
};

export type ChecklistData = {
  checklistId: string;
  items: ChecklistItem[];
};

/** The interview's checklist + items (RLS-scoped). */
export async function getChecklist(
  interviewId: string,
): Promise<ChecklistData | null> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: checklist } = await supabase
    .from("checklists")
    .select("id")
    .eq("interview_id", interviewId)
    .maybeSingle();
  if (!checklist) return null;
  const { data: items } = await supabase
    .from("checklist_items")
    .select("id, label, detail, source, completed_at, sort_order")
    .eq("checklist_id", checklist.id)
    .order("sort_order", { ascending: true });
  return { checklistId: checklist.id, items: items ?? [] };
}
