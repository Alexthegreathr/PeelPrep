import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { planForUser } from "@/lib/billing/resolve";
import {
  usagePeriod,
  featureLimit,
  type UsageFeature,
} from "@/lib/usage/features";
import { currentUsage } from "@/lib/usage/ledger";

export type UsageMeter = {
  feature: UsageFeature;
  label: string;
  used: number;
  limit: number;
};

export type RecentBrief = {
  interviewId: string;
  company: string;
  generatedAt: string | null;
};

const USAGE_METERS: { feature: UsageFeature; label: string }[] = [
  { feature: "brief_generate", label: "Peel Briefs" },
  { feature: "questions_generate", label: "Predicted questions" },
  { feature: "answer_feedback", label: "Answer feedback" },
  { feature: "practice_session", label: "Practice sessions" },
];

export async function getUsageMeters(userId: string): Promise<UsageMeter[]> {
  const { subscription, entitlements } = await planForUser(userId);
  const period = usagePeriod(subscription);
  return Promise.all(
    USAGE_METERS.map(async (m) => ({
      feature: m.feature,
      label: m.label,
      used: await currentUsage(userId, m.feature, period.start),
      limit: featureLimit(entitlements.key, m.feature),
    })),
  );
}

/** Consecutive days (ending today or yesterday) with a completed session. */
export async function getPracticeStreak(userId: string): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("practice_sessions")
    .select("completed_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(60);

  const days = new Set(
    (data ?? [])
      .map((r) => (r.completed_at ? r.completed_at.slice(0, 10) : null))
      .filter((d): d is string => Boolean(d)),
  );
  if (days.size === 0) return 0;

  const dayMs = 86_400_000;
  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterdayKey = new Date(Date.now() - dayMs).toISOString().slice(0, 10);
  let cursor: Date;
  if (days.has(todayKey)) cursor = new Date(`${todayKey}T00:00:00Z`);
  else if (days.has(yesterdayKey))
    cursor = new Date(`${yesterdayKey}T00:00:00Z`);
  else return 0;

  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor = new Date(cursor.getTime() - dayMs);
  }
  return streak;
}

export async function getRecentBriefs(userId: string): Promise<RecentBrief[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("peel_briefs")
    .select("interview_id, generated_at, interviews(company_name)")
    .eq("user_id", userId)
    .in("status", ["ready", "partial"])
    .not("generated_at", "is", null)
    .order("generated_at", { ascending: false })
    .limit(3);
  return (data ?? []).map((b) => ({
    interviewId: b.interview_id,
    company:
      (b.interviews as { company_name?: string } | null)?.company_name ||
      "Interview",
    generatedAt: b.generated_at,
  }));
}

/** Latest readiness recommended action for an interview (dashboard next-step). */
export async function getLatestRecommendedAction(
  interviewId: string,
): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("readiness_scores")
    .select("recommended_action")
    .eq("interview_id", interviewId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.recommended_action ?? null;
}
