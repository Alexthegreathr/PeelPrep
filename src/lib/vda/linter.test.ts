import { describe, it, expect } from "vitest";

import { lintDeliveryText, lintDeliveryFeedback } from "@/lib/vda/linter";

/**
 * Prohibited-claims linter (AI_ARCHITECTURE.md §10). Any output implying a
 * mental/emotional state, personality type, honesty judgment, likability, or a
 * guaranteed outcome must be rejected so the repair-retry path fires.
 */
describe("lintDeliveryText", () => {
  it("passes purely observational, measurement-tied coaching", () => {
    const res = lintDeliveryText(
      "You spoke at about 150 words per minute with three pauses over 500ms. " +
        "Try trimming filler words and keep facing the camera to stay centered.",
    );
    expect(res.ok).toBe(true);
    expect(res.violations).toEqual([]);
  });

  it.each([
    ["you seemed nervous during the answer", "nervousness"],
    ["a lot of anxiety came through", "anxiety"],
    ["you lack confidence when speaking", "lacks-confidence"],
    ["you came across as under-confident", "confidence-judgment"],
    ["this felt dishonest and deceptive", "honesty-judgment"],
    ["you have an introvert personality type", "personality"],
    ["interviewers will like you", "liked-disliked"],
    ["this guarantees an offer", "guaranteed-outcome"],
    ["you will pass the interview", "outcome-prediction"],
    ["this suggests depression or trauma", "health-inference"],
    ["you appeared emotionally drained", "psychological-inference"],
    ["you looked calm and composed", "affective-state"],
    ["you seemed tense throughout", "affective-state"],
    ["you came across as confident", "affective-state"],
  ])("flags prohibited phrasing: %s", (text, label) => {
    const res = lintDeliveryText(text);
    expect(res.ok).toBe(false);
    expect(res.violations).toContain(label);
  });

  it("deduplicates repeated violation labels", () => {
    const res = lintDeliveryText("nervous, so nervous, really nervous");
    expect(res.violations).toEqual(["nervousness"]);
  });
});

describe("lintDeliveryFeedback", () => {
  it("scans every field of the structured object", () => {
    const res = lintDeliveryFeedback({
      observable_strengths: ["Clear articulation"],
      delivery_observations: ["Steady pacing"],
      top_improvement: "Reduce filler words",
      speaking_advice: "Breathe between points",
      // Hidden in a deeper field — must still be caught.
      practice_exercise: "Practice until you feel less anxious",
      uncertainty_and_limitations: "Measurements are approximate.",
    });
    expect(res.ok).toBe(false);
    expect(res.violations).toContain("anxiety");
  });

  it("passes clean structured feedback", () => {
    const res = lintDeliveryFeedback({
      observable_strengths: ["Good eye line toward the camera"],
      delivery_observations: ["Two long pauses over one second"],
      top_improvement: "Shorten the gap before your main point",
      camera_setup_advice: "Raise the camera to eye level",
      speaking_advice: "Aim for a steadier pace",
      practice_exercise: "Re-record the same answer once more",
      uncertainty_and_limitations:
        "These are approximate, on-device measurements and may be imperfect.",
    });
    expect(res.ok).toBe(true);
  });
});
