"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Brief section interactions. All RLS-scoped: users may only touch their own
 * rows, and the brief_sections guard trigger limits them to user_notes /
 * completed_at (content/status are server-written).
 */
export async function markSectionComplete(
  interviewId: string,
  sectionId: string,
  complete: boolean,
): Promise<void> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("brief_sections")
    .update({ completed_at: complete ? new Date().toISOString() : null })
    .eq("id", sectionId)
    .eq("user_id", user.id);
  revalidatePath(`/interviews/${interviewId}/brief`);
}

export async function saveSectionNotes(
  interviewId: string,
  sectionId: string,
  notes: string,
): Promise<void> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("brief_sections")
    .update({ user_notes: notes.slice(0, 4000) || null })
    .eq("id", sectionId)
    .eq("user_id", user.id);
  revalidatePath(`/interviews/${interviewId}/brief`);
}

export async function submitGenerationFeedback(
  targetType:
    "brief_section" | "question" | "feedback" | "practice_turn" | "story",
  targetId: string,
  rating: "up" | "down",
): Promise<void> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  // One rating per (user, target): remove any prior, then insert.
  await supabase
    .from("generation_feedback")
    .delete()
    .eq("user_id", user.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId);
  await supabase.from("generation_feedback").insert({
    user_id: user.id,
    target_type: targetType,
    target_id: targetId,
    rating,
  });
}
