"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function revalidate(interviewId: string) {
  revalidatePath(`/interviews/${interviewId}/readiness`);
  revalidatePath("/dashboard");
}

export async function toggleChecklistItem(
  interviewId: string,
  itemId: string,
  done: boolean,
): Promise<void> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("checklist_items")
    .update({ completed_at: done ? new Date().toISOString() : null })
    .eq("id", itemId)
    .eq("user_id", user.id);
  revalidate(interviewId);
}

export async function addChecklistItem(
  interviewId: string,
  checklistId: string,
  label: string,
): Promise<void> {
  const user = await requireUser();
  const trimmed = label.trim().slice(0, 300);
  if (!trimmed) return;
  const supabase = await createSupabaseServerClient();
  await supabase.from("checklist_items").insert({
    user_id: user.id,
    checklist_id: checklistId,
    label: trimmed,
    source: "user_added",
    sort_order: 100,
  });
  revalidate(interviewId);
}

export async function deleteChecklistItem(
  interviewId: string,
  itemId: string,
): Promise<void> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("checklist_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", user.id);
  revalidate(interviewId);
}
