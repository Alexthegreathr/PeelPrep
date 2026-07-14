import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runMeteredGeneration } from "@/lib/ai/generation";
import { readinessAdviceSchema } from "@/lib/ai/schemas";
import { planForUser } from "@/lib/billing/resolve";
import {
  computeReadiness,
  READINESS_COMPONENT_LABELS,
  type ReadinessInputs,
  type ReadinessResult,
} from "@/lib/readiness/calculator";

/** Gather the measurable inputs for an interview's readiness (via admin). */
export async function gatherReadinessInputs(
  interviewId: string,
  userId: string,
): Promise<ReadinessInputs> {
  const admin = createSupabaseAdminClient();

  const { data: brief } = await admin
    .from("peel_briefs")
    .select("id")
    .eq("interview_id", interviewId)
    .maybeSingle();
  let sections: { section_key: string; status: string }[] = [];
  if (brief) {
    const { data } = await admin
      .from("brief_sections")
      .select("section_key, status")
      .eq("brief_id", brief.id);
    sections = data ?? [];
  }
  const ready = (key: string) =>
    sections.some((s) => s.section_key === key && s.status === "ready");
  const companySectionsReady = [
    "company_overview",
    "company_priorities",
  ].filter(ready).length;

  const { count: interviewersCount } = await admin
    .from("interviewers")
    .select("id", { count: "exact", head: true })
    .eq("interview_id", interviewId);

  const { count: storiesCount } = await admin
    .from("stories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { data: sessions } = await admin
    .from("practice_sessions")
    .select("id")
    .eq("interview_id", interviewId);
  const sessionIds = (sessions ?? []).map((s) => s.id);

  let answersCount = 0;
  let avgRubric: number | null = null;
  if (sessionIds.length) {
    const { data: answerRows } = await admin
      .from("answers")
      .select("id")
      .in("session_id", sessionIds);
    const answerIds = (answerRows ?? []).map((a) => a.id);
    answersCount = answerIds.length;
    if (answerIds.length) {
      const { data: fbs } = await admin
        .from("feedback")
        .select("rubric")
        .in("answer_id", answerIds);
      const scores: number[] = [];
      for (const fb of fbs ?? []) {
        const rubric = fb.rubric as Record<string, { score?: number }> | null;
        for (const v of Object.values(rubric ?? {})) {
          if (typeof v?.score === "number") scores.push(v.score);
        }
      }
      avgRubric = scores.length
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null;
    }
  }

  return {
    companySectionsReady,
    roleReady: ready("role_analysis"),
    interviewerIntelReady: ready("interviewer_intel"),
    interviewersCount: interviewersCount ?? 0,
    storiesCount: storiesCount ?? 0,
    answersCount,
    avgRubric,
    questionsToAskReady: ready("questions_to_ask"),
  };
}

async function generateAdvice(
  interviewId: string,
  userId: string,
  result: ReadinessResult,
): Promise<string> {
  const weakest = [...result.components].sort(
    (a, b) => a.raw * a.weight - b.raw * b.weight,
  )[0];
  const fallback = weakest
    ? `Focus next on ${READINESS_COMPONENT_LABELS[weakest.component].toLowerCase()} — it has the most room to improve your readiness.`
    : "Keep practicing to raise your readiness score.";

  const { subscription } = await planForUser(userId);
  const breakdown = result.components
    .map(
      (c) => `${c.component}: ${Math.round(c.raw * 100)}% (${c.explanation})`,
    )
    .join("\n");
  const input = `Readiness ${result.score}/100. Component breakdown:\n${breakdown}\n\nRecommend the single highest-impact next action. Do not produce a numeric score or any guarantee of success.`;

  const res = await runMeteredGeneration({
    userId,
    interviewId,
    task: "readiness_advice",
    feature: "readiness_advice",
    input,
    schema: readinessAdviceSchema,
    subscription,
  });
  return res.ok ? res.data.recommended_action : fallback;
}

/** Live readiness score without snapshotting (dashboard). */
export async function currentScore(
  interviewId: string,
  userId: string,
): Promise<number> {
  const inputs = await gatherReadinessInputs(interviewId, userId);
  return computeReadiness(inputs).score;
}

export type ReadinessSnapshot = {
  result: ReadinessResult;
  recommendedAction: string | null;
};

/** Recompute readiness; snapshot a new row only when the score changed. */
export async function computeAndSnapshot(
  interviewId: string,
  userId: string,
  triggerEvent = "view",
): Promise<ReadinessSnapshot> {
  const inputs = await gatherReadinessInputs(interviewId, userId);
  const result = computeReadiness(inputs);
  const admin = createSupabaseAdminClient();

  const { data: latest } = await admin
    .from("readiness_scores")
    .select("id, score, recommended_action")
    .eq("interview_id", interviewId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest && latest.score === result.score) {
    return { result, recommendedAction: latest.recommended_action };
  }

  const recommendedAction = await generateAdvice(interviewId, userId, result);
  const { data: snap } = await admin
    .from("readiness_scores")
    .insert({
      user_id: userId,
      interview_id: interviewId,
      score: result.score,
      trigger_event: triggerEvent,
      recommended_action: recommendedAction,
    })
    .select("id")
    .single();
  if (snap) {
    await admin.from("readiness_components").insert(
      result.components.map((c) => ({
        user_id: userId,
        score_id: snap.id,
        component: c.component,
        raw_value: c.raw,
        weighted_points: c.weightedPoints,
        explanation: c.explanation,
      })),
    );
  }
  return { result, recommendedAction };
}
