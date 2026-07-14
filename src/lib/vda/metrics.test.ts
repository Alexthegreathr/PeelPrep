import { describe, it, expect } from "vitest";

import {
  submittedMetricsSchema,
  deriveTranscriptMetrics,
  missingMeasurements,
} from "@/lib/vda/metrics";

/**
 * Submitted-metrics validation + server-side transcript derivation
 * (DATABASE.md §5b). Only aggregate numbers are accepted; speaking pace and
 * filler counts are computed from the transcript, never sent by the client.
 */
describe("submittedMetricsSchema", () => {
  it("fills unmeasured fields with null defaults", () => {
    const parsed = submittedMetricsSchema.parse({ pause_count: 3 });
    expect(parsed.pause_count).toBe(3);
    expect(parsed.camera_facing_pct).toBeNull();
    expect(parsed.answer_duration_seconds).toBeNull();
    expect(parsed.lighting_flag).toBe(false);
  });

  it("rejects out-of-range percentages", () => {
    expect(
      submittedMetricsSchema.safeParse({ camera_facing_pct: 150 }).success,
    ).toBe(false);
    expect(
      submittedMetricsSchema.safeParse({ camera_facing_pct: -1 }).success,
    ).toBe(false);
  });

  it("rejects a non-integer pause count", () => {
    expect(submittedMetricsSchema.safeParse({ pause_count: 2.5 }).success).toBe(
      false,
    );
  });
});

describe("deriveTranscriptMetrics", () => {
  it("computes speaking pace from word count and duration", () => {
    const text = Array.from({ length: 100 }, () => "word").join(" ");
    const res = deriveTranscriptMetrics(text, 60);
    expect(res.speaking_pace_wpm).toBe(100);
  });

  it("returns null pace when duration is missing", () => {
    expect(
      deriveTranscriptMetrics("one two three", null).speaking_pace_wpm,
    ).toBeNull();
  });

  it("counts filler words including multi-word fillers", () => {
    const res = deriveTranscriptMetrics(
      "So um I was, you know, sort of leading the, uh, project",
      30,
    );
    // um, you know, sort of, uh
    expect(res.filler_word_count).toBe(4);
    expect(res.filler_words_per_100).toBeGreaterThan(0);
  });

  it("handles empty transcript without dividing by zero", () => {
    const res = deriveTranscriptMetrics("", 30);
    expect(res.filler_word_count).toBe(0);
    expect(res.filler_words_per_100).toBe(0);
  });
});

describe("missingMeasurements", () => {
  it("reports missing video landmarks and transcript", () => {
    const metrics = submittedMetricsSchema.parse({ pause_count: 2 });
    const missing = missingMeasurements(metrics, false);
    expect(missing.some((m) => m.includes("camera-facing"))).toBe(true);
    expect(missing.some((m) => m.includes("posture"))).toBe(true);
    expect(missing.some((m) => m.includes("transcript"))).toBe(true);
  });

  it("flags low landmark coverage", () => {
    const metrics = submittedMetricsSchema.parse({
      camera_facing_pct: 80,
      posture_stability_score: 0.6,
      sample_coverage_pct: 20,
    });
    const missing = missingMeasurements(metrics, true);
    expect(missing.some((m) => m.includes("low landmark coverage"))).toBe(true);
  });

  it("is empty when everything is measured", () => {
    const metrics = submittedMetricsSchema.parse({
      camera_facing_pct: 90,
      posture_stability_score: 0.8,
      sample_coverage_pct: 85,
    });
    expect(missingMeasurements(metrics, true)).toEqual([]);
  });
});
