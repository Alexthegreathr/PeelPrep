import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  admin,
  anon,
  integrationEnabled,
  makeUser,
  signedInClient,
  deleteUser,
  type TestUser,
} from "./helpers";
import { runDeliveryAnalysis } from "@/lib/vda/analysis";
import { lintDeliveryFeedback } from "@/lib/vda/linter";
import { gatherReadinessInputs } from "@/lib/readiness/compute";
import { computeReadiness } from "@/lib/readiness/calculator";
import { READINESS_WEIGHTS } from "@/lib/readiness/calculator";

/**
 * Video Delivery Analysis integration (Phase 8B). Verifies: the pipeline reaches
 * feedback_ready on a Pro plan and its output passes the prohibited-claims
 * linter; the free plan is gated (limit_exceeded); transcription creates a
 * transcript + derived metrics + a usage event; VDA contributes ZERO readiness
 * weight (byte-identical score before/after an analysis); per-artifact deletion
 * cascades; and RLS isolates every VDA table across users. Opt-in
 * (SUPABASE_INTEGRATION=1); run after `supabase db reset`.
 */
const now = () => new Date().toISOString();
const CONSENT_ALL = { recordingAt: now(), uploadAt: now(), analysisAt: now() };

async function makePro(): Promise<TestUser> {
  const user = await makeUser();
  await admin()
    .from("subscriptions")
    .update({ plan_key: "pro", status: "active" })
    .eq("user_id", user.id);
  return user;
}

async function seedInterviewSession(
  userId: string,
): Promise<{ interviewId: string; sessionId: string }> {
  const a = admin();
  const interviewId = (
    await a
      .from("interviews")
      .insert({
        user_id: userId,
        company_name: "Acme",
        position_title: "Engineer",
        status: "preparing",
      })
      .select("id")
      .single()
  ).data!.id as string;
  const sessionId = (
    await a
      .from("practice_sessions")
      .insert({
        user_id: userId,
        interview_id: interviewId,
        config: { length: 3 },
      })
      .select("id")
      .single()
  ).data!.id as string;
  return { interviewId, sessionId };
}

const SAMPLE_METRICS = {
  camera_facing_pct: 88,
  frame_centering_pct: 80,
  head_turns_per_min: 4,
  posture_stability_score: 0.82,
  shoulder_angle_variation_deg: 6,
  movement_events_per_min: 3,
  pause_count: 5,
  avg_pause_ms: 420,
  longest_pause_ms: 900,
  volume_variation_coeff: 0.4,
  answer_duration_seconds: 55,
  sample_coverage_pct: 90,
  lighting_flag: false,
  framing_flag: false,
};

describe.skipIf(!integrationEnabled)("video delivery analysis", () => {
  it("READINESS_WEIGHTS has no VDA component and sums to 100", () => {
    const keys = Object.keys(READINESS_WEIGHTS);
    expect(
      keys.some((k) => k.startsWith("vda") || k.includes("delivery")),
    ).toBe(false);
    expect(Object.values(READINESS_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(
      100,
    );
  });

  it("reaches feedback_ready on Pro and passes the linter", async () => {
    const user = await makePro();
    try {
      const { sessionId } = await seedInterviewSession(user.id);
      const res = await runDeliveryAnalysis({
        userId: user.id,
        sessionId,
        answerId: null,
        metrics: SAMPLE_METRICS,
        coachingGoals: ["pacing"],
        mediaAssetId: null,
        transcriptUploadAllowed: false,
        answerHint: null,
        consent: CONSENT_ALL,
      });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.status).toBe("feedback_ready");

      const { data: row } = await admin()
        .from("delivery_analyses")
        .select("status, feedback")
        .eq("id", res.analysisId)
        .single();
      expect(row?.status).toBe("feedback_ready");
      expect(
        lintDeliveryFeedback(row?.feedback as Record<string, string[]>).ok,
      ).toBe(true);

      // The metered delivery_feedback usage settled as completed.
      const { data: usage } = await admin()
        .from("usage_events")
        .select("status")
        .eq("user_id", user.id)
        .eq("feature", "delivery_feedback");
      expect(usage?.some((u) => u.status === "completed")).toBe(true);

      // Metrics row persisted with the submitted aggregates.
      const { data: metrics } = await admin()
        .from("delivery_metrics")
        .select("camera_facing_pct, answer_duration_seconds")
        .eq("analysis_id", res.analysisId)
        .single();
      expect(metrics?.camera_facing_pct).toBe(88);
    } finally {
      await deleteUser(user.id);
    }
  });

  it("gates the free plan with limit_exceeded", async () => {
    const user = await makeUser(); // free by default
    try {
      const { sessionId } = await seedInterviewSession(user.id);
      const res = await runDeliveryAnalysis({
        userId: user.id,
        sessionId,
        answerId: null,
        metrics: SAMPLE_METRICS,
        coachingGoals: [],
        mediaAssetId: null,
        transcriptUploadAllowed: false,
        answerHint: null,
        consent: CONSENT_ALL,
      });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.code).toBe("limit_exceeded");

      // Nothing was written.
      const { count } = await admin()
        .from("delivery_analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      expect(count).toBe(0);
    } finally {
      await deleteUser(user.id);
    }
  });

  it("transcription creates transcript, derived metrics, and a usage event", async () => {
    const user = await makePro();
    try {
      const { sessionId } = await seedInterviewSession(user.id);
      const res = await runDeliveryAnalysis({
        userId: user.id,
        sessionId,
        answerId: null,
        metrics: SAMPLE_METRICS,
        coachingGoals: [],
        mediaAssetId: null,
        transcriptUploadAllowed: true,
        answerHint: "I led a migration that cut latency in half.",
        consent: CONSENT_ALL,
      });
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      const { data: analysis } = await admin()
        .from("delivery_analyses")
        .select("transcript_id")
        .eq("id", res.analysisId)
        .single();
      expect(analysis?.transcript_id).toBeTruthy();

      const { data: transcript } = await admin()
        .from("transcripts")
        .select("source, word_count")
        .eq("id", analysis!.transcript_id as string)
        .single();
      expect(transcript?.source).toBe("mock");
      expect((transcript?.word_count ?? 0) > 0).toBe(true);

      const { data: metrics } = await admin()
        .from("delivery_metrics")
        .select("speaking_pace_wpm")
        .eq("analysis_id", res.analysisId)
        .single();
      expect(metrics?.speaking_pace_wpm).not.toBeNull();

      const { data: tUsage } = await admin()
        .from("usage_events")
        .select("status")
        .eq("user_id", user.id)
        .eq("feature", "transcription");
      expect(tUsage?.length).toBeGreaterThan(0);
    } finally {
      await deleteUser(user.id);
    }
  });

  it("contributes zero readiness weight (byte-identical score)", async () => {
    const user = await makePro();
    try {
      const { interviewId, sessionId } = await seedInterviewSession(user.id);
      const before = computeReadiness(
        await gatherReadinessInputs(interviewId, user.id),
      );

      const res = await runDeliveryAnalysis({
        userId: user.id,
        sessionId,
        answerId: null,
        metrics: SAMPLE_METRICS,
        coachingGoals: [],
        mediaAssetId: null,
        transcriptUploadAllowed: true,
        answerHint: "A full answer that also produces a transcript.",
        consent: CONSENT_ALL,
      });
      expect(res.ok).toBe(true);

      const after = computeReadiness(
        await gatherReadinessInputs(interviewId, user.id),
      );
      expect(JSON.stringify(after)).toBe(JSON.stringify(before));
    } finally {
      await deleteUser(user.id);
    }
  });

  it("cascades deletion of metrics when the analysis is deleted", async () => {
    const user = await makePro();
    try {
      const { sessionId } = await seedInterviewSession(user.id);
      const res = await runDeliveryAnalysis({
        userId: user.id,
        sessionId,
        answerId: null,
        metrics: SAMPLE_METRICS,
        coachingGoals: [],
        mediaAssetId: null,
        transcriptUploadAllowed: false,
        answerHint: null,
        consent: CONSENT_ALL,
      });
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      await admin().from("delivery_analyses").delete().eq("id", res.analysisId);
      const { count } = await admin()
        .from("delivery_metrics")
        .select("id", { count: "exact", head: true })
        .eq("analysis_id", res.analysisId);
      expect(count).toBe(0);
    } finally {
      await deleteUser(user.id);
    }
  });

  describe("RLS isolation", () => {
    let owner: TestUser;
    let other: TestUser;
    let otherClient: SupabaseClient;
    let anonClient: SupabaseClient;
    let analysisId: string;
    let transcriptId: string;

    beforeAll(async () => {
      owner = await makePro();
      other = await makeUser();
      otherClient = await signedInClient(other);
      anonClient = anon();
      const { sessionId } = await seedInterviewSession(owner.id);
      const res = await runDeliveryAnalysis({
        userId: owner.id,
        sessionId,
        answerId: null,
        metrics: SAMPLE_METRICS,
        coachingGoals: [],
        mediaAssetId: null,
        transcriptUploadAllowed: true,
        answerHint: "Owner's answer.",
        consent: CONSENT_ALL,
      });
      if (!res.ok) throw new Error("setup analysis failed");
      analysisId = res.analysisId;
      transcriptId = (
        await admin()
          .from("delivery_analyses")
          .select("transcript_id")
          .eq("id", analysisId)
          .single()
      ).data!.transcript_id as string;
    });

    afterAll(async () => {
      if (owner) await deleteUser(owner.id);
      if (other) await deleteUser(other.id);
    });

    it("owner can read their own analysis via RLS", async () => {
      const ownerClient = await signedInClient(owner);
      const { data } = await ownerClient
        .from("delivery_analyses")
        .select("id")
        .eq("id", analysisId);
      expect((data ?? []).map((r) => r.id)).toContain(analysisId);
    });

    it.each([
      "delivery_analyses",
      "delivery_metrics",
      "transcripts",
      "media_assets",
      "processing_jobs",
    ])("another user cannot read owner's %s", async (table) => {
      const { data } = await otherClient.from(table).select("*");
      expect(data ?? []).toEqual([]);
    });

    it("anon cannot read the owner's transcript", async () => {
      const { data } = await anonClient
        .from("transcripts")
        .select("id")
        .eq("id", transcriptId);
      expect(data ?? []).toEqual([]);
    });
  });
});
