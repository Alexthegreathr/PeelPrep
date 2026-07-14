import { describe, it, expect } from "vitest";

import {
  buildPresenceSummary,
  presenceSummaryText,
  PRESENCE_DISCLAIMER,
} from "@/lib/vda/presence";
import { lintDeliveryText } from "@/lib/vda/linter";

/**
 * Presence summary (PHASE_14_AVATAR_PRACTICE.md §4): a deterministic, neutral
 * rollup of observable measurements. It must never contain affective/confidence
 * language and must be honest about what wasn't measured.
 */
describe("buildPresenceSummary", () => {
  it("marks unmeasured signals rather than guessing", () => {
    const s = buildPresenceSummary({
      speaking_pace_wpm: null,
      camera_facing_pct: null,
      frame_centering_pct: null,
    });
    const pace = s.bands.find((b) => b.key === "pace");
    expect(pace?.status).toBe("unmeasured");
    expect(pace?.value).toBe("not measured");
    expect(s.measuredCount).toBe(0);
  });

  it("flags an out-of-range pace and a long pause as worth_a_look", () => {
    const s = buildPresenceSummary({
      speaking_pace_wpm: 200,
      longest_pause_ms: 4200,
      pause_count: 6,
    });
    expect(s.bands.find((b) => b.key === "pace")?.status).toBe("worth_a_look");
    expect(s.bands.find((b) => b.key === "pauses")?.status).toBe(
      "worth_a_look",
    );
  });

  it("treats a typical delivery as in_range", () => {
    const s = buildPresenceSummary({
      frame_centering_pct: 88,
      camera_facing_pct: 82,
      movement_events_per_min: 10,
      speaking_pace_wpm: 145,
      longest_pause_ms: 1200,
      pause_count: 3,
      filler_words_per_100: 2.5,
      lighting_flag: false,
    });
    expect(s.bands.every((b) => b.status === "in_range")).toBe(true);
    expect(s.measuredCount).toBeGreaterThanOrEqual(6);
  });

  it("describes camera-facing only as an approximation of eye contact", () => {
    const s = buildPresenceSummary({ camera_facing_pct: 75 });
    const cf = s.bands.find((b) => b.key === "camera_facing");
    expect(cf?.note.toLowerCase()).toContain("approximation of eye contact");
  });

  it("never emits affective / confidence language (linter-clean)", () => {
    // A spread of values across every branch.
    for (const m of [
      {
        speaking_pace_wpm: 90,
        longest_pause_ms: 5000,
        movement_events_per_min: 90,
      },
      {
        frame_centering_pct: 20,
        camera_facing_pct: 10,
        filler_words_per_100: 12,
      },
      {
        lighting_flag: true,
        shoulder_angle_variation_deg: 40,
        pause_count: 12,
      },
      {
        frame_centering_pct: 95,
        camera_facing_pct: 95,
        speaking_pace_wpm: 140,
      },
    ]) {
      const text = presenceSummaryText(buildPresenceSummary(m));
      expect(lintDeliveryText(text).ok, text).toBe(true);
    }
  });

  it("keeps the disclaimer stating it is not a confidence/emotion measure", () => {
    expect(PRESENCE_DISCLAIMER.toLowerCase()).toContain("not a measure of");
    expect(PRESENCE_DISCLAIMER.toLowerCase()).toContain("confidence");
  });
});
