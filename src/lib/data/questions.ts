import "server-only";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { QuestionRow } from "@/lib/data/types";

export type QuestionLink = {
  story_id: string;
  source: string;
  stories: { id: string; title: string } | null;
};

export type QuestionWithLinks = QuestionRow & {
  question_story_links: QuestionLink[];
};

/** All questions for an interview with their linked stories (RLS-scoped). */
export async function listQuestions(
  interviewId: string,
): Promise<QuestionWithLinks[]> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("questions")
    .select("*, question_story_links(story_id, source, stories(id, title))")
    .eq("interview_id", interviewId)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });
  return (data ?? []) as unknown as QuestionWithLinks[];
}
