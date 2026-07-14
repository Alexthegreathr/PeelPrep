import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
import { runGeneration } from "@/lib/ai/generation";
import { deliveryFeedbackSchema } from "@/lib/ai/schemas";
import { reserveUsage, settleUsage } from "@/lib/usage/ledger";
import { usagePeriod, featureLimit } from "@/lib/usage/features";
import { planForUser } from "@/lib/billing/resolve";
import {
  submittedMetricsSchema,
  deriveTranscriptMetrics,
  missingMeasurements,
  type SubmittedMetrics,
} from "@/lib/vda/metrics";
import { getTranscriptionProvider } from "@/lib/vda/transcription";
import { lintDeliveryFeedback, lintDeliveryText } from "@/lib/vda/linter";
import { buildPresenceSummary, presenceSummaryText } from "@/lib/vda/presence";

/**
 * Video Delivery Analysis pipeline (AI_ARCHITECTURE.md §10). The model sees ONLY
 * aggregate numbers + the transcript — never pixels, audio, or landmarks.
 * delivery_feedback is metered (Pro), and its output must pass the prohibited-
 * claims linter (repair-retry → refund on failure). Transcription is recorded
 * for cost only. Raw media never reaches this layer.
 */
export type RunAnalysisInput = {
  userId: string;
  sessionId: string;
  answerId: string | null;
  metrics: SubmittedMetrics;
  coachingGoals: string[];
  mediaAssetId: string | null;
  /** vda_media_upload consent → temp audio may be transcribed. */
  transcriptUploadAllowed: boolean;
  answerHint: string | null;
  consent: { recordingAt: string; uploadAt: string; analysisAt: string };
};

export type RunAnalysisResult =
  | { ok: true; analysisId: string; status: string }
  | { ok: false; code: string; message: string };

function feedbackInput(
  metrics: SubmittedMetrics,
  transcript: string | null,
  derived: { speaking_pace_wpm: number | null; filler_word_count: number },
  goals: string[],
  missing: string[],
): string {
  return [
    "Aggregate delivery measurements (approximate; the model sees no media):",
    JSON.stringify(
      {
        ...metrics,
        speaking_pace_wpm: derived.speaking_pace_wpm,
        filler_word_count: derived.filler_word_count,
      },
      null,
      0,
    ),
    transcript ? `Transcript:\n${transcript}` : "Transcript: unavailable.",
    goals.length
      ? `Coaching goals: ${goals.join(", ")}`
      : "Coaching goals: none specified.",
    missing.length
      ? `Missing/low-confidence measurements: ${missing.join("; ")}`
      : "",
    "Give optional, observational coaching tied to these measurements only.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function runDeliveryAnalysis(
  input: RunAnalysisInput,
): Promise<RunAnalysisResult> {
  const admin = createSupabaseAdminClient();
  const { subscription, entitlements } = await planForUser(input.userId);

  // Pro-only gate.
  if (featureLimit(entitlements.key, "delivery_feedback") <= 0) {
    return {
      ok: false,
      code: "limit_exceeded",
      message: "Video Delivery Analysis is a Pro feature.",
    };
  }

  const { data: session } = await admin
    .from("practice_sessions")
    .select("interview_id")
    .eq("id", input.sessionId)
    .single();
  const interviewId = session?.interview_id ?? null;

  const metrics = submittedMetricsSchema.parse(input.metrics);

  const { data: analysis } = await admin
    .from("delivery_analyses")
    .insert({
      user_id: input.userId,
      session_id: input.sessionId,
      answer_id: input.answerId,
      media_asset_id: input.mediaAssetId,
      status: "pending",
      coaching_goals: input.coachingGoals,
      analysis_consent_at: input.consent.analysisAt,
    })
    .select("id")
    .single();
  if (!analysis) {
    return {
      ok: false,
      code: "error",
      message: "Couldn't start the analysis.",
    };
  }

  await admin.from("delivery_metrics").insert({
    user_id: input.userId,
    analysis_id: analysis.id,
    camera_facing_pct: metrics.camera_facing_pct,
    frame_centering_pct: metrics.frame_centering_pct,
    head_turns_per_min: metrics.head_turns_per_min,
    posture_stability_score: metrics.posture_stability_score,
    shoulder_angle_variation_deg: metrics.shoulder_angle_variation_deg,
    movement_events_per_min: metrics.movement_events_per_min,
    pause_count: metrics.pause_count,
    avg_pause_ms: metrics.avg_pause_ms,
    longest_pause_ms: metrics.longest_pause_ms,
    volume_variation_coeff: metrics.volume_variation_coeff,
    answer_duration_seconds: metrics.answer_duration_seconds,
    sample_coverage_pct: metrics.sample_coverage_pct,
    lighting_flag: metrics.lighting_flag,
    framing_flag: metrics.framing_flag,
  });

  // ── Transcription (only if media upload is consented) ──────────────────
  let transcriptText: string | null = null;
  const derived = {
    speaking_pace_wpm: null as number | null,
    filler_word_count: 0,
  };
  if (input.transcriptUploadAllowed) {
    const { data: job } = await admin
      .from("processing_jobs")
      .insert({
        user_id: input.userId,
        kind: "transcription",
        analysis_id: analysis.id,
        media_asset_id: input.mediaAssetId,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    const t = await getTranscriptionProvider().transcribe({
      audioStoragePath: null,
      hintText: input.answerHint,
    });
    transcriptText = t.text;
    const wordCount = t.text.trim().split(/\s+/).filter(Boolean).length;
    const { data: tr } = await admin
      .from("transcripts")
      .insert({
        user_id: input.userId,
        answer_id: input.answerId,
        session_id: input.sessionId,
        source: "mock",
        provider: t.provider,
        text: t.text,
        word_count: wordCount,
        language: t.language,
      })
      .select("id")
      .single();
    if (job) {
      await admin
        .from("processing_jobs")
        .update({ status: "succeeded", finished_at: new Date().toISOString() })
        .eq("id", job.id);
    }
    const d = deriveTranscriptMetrics(t.text, metrics.answer_duration_seconds);
    derived.speaking_pace_wpm = d.speaking_pace_wpm;
    derived.filler_word_count = d.filler_word_count;
    await admin
      .from("delivery_metrics")
      .update({
        speaking_pace_wpm: d.speaking_pace_wpm,
        filler_word_count: d.filler_word_count,
        filler_words_per_100: d.filler_words_per_100,
      })
      .eq("analysis_id", analysis.id);
    if (tr) {
      await admin
        .from("delivery_analyses")
        .update({ transcript_id: tr.id })
        .eq("id", analysis.id);
    }
    // Record transcription cost (unmetered).
    const period = usagePeriod(subscription);
    const r = await reserveUsage({
      userId: input.userId,
      feature: "transcription",
      quantity: 1,
      limit: featureLimit(entitlements.key, "transcription"),
      periodStart: period.start,
      periodEnd: period.end,
      interviewId,
    });
    if (r.ok) await settleUsage(r.eventId, "completed", { provider: "mock" });
  }

  const missing = missingMeasurements(metrics, Boolean(transcriptText));

  // Deterministic neutral presence summary (PHASE_14 §4). Built from the
  // observable measurements only, never an inner-state judgment. Linted as
  // defense-in-depth; dropped (not fabricated) if it somehow trips the linter.
  const presence = buildPresenceSummary({
    ...metrics,
    speaking_pace_wpm: derived.speaking_pace_wpm,
    filler_words_per_100:
      metrics.answer_duration_seconds && transcriptText
        ? (derived.filler_word_count /
            Math.max(
              1,
              transcriptText.trim().split(/\s+/).filter(Boolean).length,
            )) *
          100
        : null,
  });
  const presenceClean = lintDeliveryText(presenceSummaryText(presence)).ok;

  await admin
    .from("delivery_analyses")
    .update({
      status: "metrics_ready",
      missing_measurements: missing,
      presence_summary: presenceClean ? (presence as unknown as Json) : null,
    })
    .eq("id", analysis.id);

  // ── Delivery feedback (metered) + prohibited-claims linter ─────────────
  const period = usagePeriod(subscription);
  const reservation = await reserveUsage({
    userId: input.userId,
    feature: "delivery_feedback",
    quantity: 1,
    limit: featureLimit(entitlements.key, "delivery_feedback"),
    periodStart: period.start,
    periodEnd: period.end,
    interviewId,
  });
  if (!reservation.ok) {
    await admin
      .from("delivery_analyses")
      .update({ status: "partial" })
      .eq("id", analysis.id);
    return { ok: true, analysisId: analysis.id, status: "partial" };
  }
  const eventId = reservation.eventId;

  const baseInput = feedbackInput(
    metrics,
    transcriptText,
    derived,
    input.coachingGoals,
    missing,
  );
  let feedback: Record<string, unknown> | null = null;
  let generationId: string | null = null;
  for (let attempt = 0; attempt < 2 && !feedback; attempt++) {
    const attemptInput =
      attempt === 0
        ? baseInput
        : `${baseInput}\n\n[Repair] The previous response used prohibited language about the person. Describe ONLY observable measurements; never mention confidence, nervousness, honesty, personality, likability, guarantees, emotion, health, or disability.`;
    const res = await runGeneration({
      userId: input.userId,
      interviewId,
      task: "delivery_feedback",
      input: attemptInput,
      schema: deliveryFeedbackSchema,
      usageEventId: eventId,
    });
    if (!res.ok) {
      generationId = res.generationId;
      continue;
    }
    generationId = res.generationId;
    if (lintDeliveryFeedback(res.data).ok) feedback = res.data;
  }

  if (!feedback) {
    await settleUsage(eventId, "refunded", {
      generationId: generationId ?? undefined,
    });
    await admin
      .from("delivery_analyses")
      .update({ status: "partial" })
      .eq("id", analysis.id);
    return { ok: true, analysisId: analysis.id, status: "partial" };
  }

  await settleUsage(eventId, "completed", {
    provider: "mock",
    generationId: generationId ?? undefined,
  });
  await admin
    .from("delivery_analyses")
    .update({
      status: "feedback_ready",
      feedback: feedback as unknown as Json,
      ai_generation_id: generationId,
    })
    .eq("id", analysis.id);

  return { ok: true, analysisId: analysis.id, status: "feedback_ready" };
}
