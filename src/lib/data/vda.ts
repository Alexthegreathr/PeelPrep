import "server-only";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DeliveryMetricsRow = Record<string, number | boolean | null> & {
  id: string;
};

export type DeliveryAnalysisView = {
  id: string;
  status: string;
  coaching_goals: string[];
  missing_measurements: string[];
  feedback: Record<string, unknown> | null;
  presence_summary: Record<string, unknown> | null;
  created_at: string;
  transcript_id: string | null;
  media_asset_id: string | null;
  delivery_metrics: DeliveryMetricsRow[];
  transcripts: { id: string; text: string } | null;
};

/** The delivery analyses for a practice session (RLS-scoped). */
export async function getDeliveryAnalyses(
  sessionId: string,
): Promise<DeliveryAnalysisView[]> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("delivery_analyses")
    .select(
      "id, status, coaching_goals, missing_measurements, feedback, presence_summary, created_at, transcript_id, media_asset_id, delivery_metrics(*), transcripts(id, text)",
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as DeliveryAnalysisView[];
}
