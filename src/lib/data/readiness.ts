import "server-only";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ReadinessHistoryPoint = { score: number; computed_at: string };

/** Score history (oldest→newest) for the readiness trend chart (RLS-scoped). */
export async function getReadinessHistory(
  interviewId: string,
): Promise<ReadinessHistoryPoint[]> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("readiness_scores")
    .select("score, computed_at")
    .eq("interview_id", interviewId)
    .order("computed_at", { ascending: true })
    .limit(50);
  return data ?? [];
}

/** The latest snapshot's score for an interview, or null (dashboard). */
export async function getLatestScore(
  interviewId: string,
): Promise<number | null> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("readiness_scores")
    .select("score")
    .eq("interview_id", interviewId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.score ?? null;
}
