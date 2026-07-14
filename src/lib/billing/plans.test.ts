import { describe, expect, it } from "vitest";

import { PLANS, effectivePlanKey, getFeatureLimit, isPlanKey } from "./plans";

describe("plan config", () => {
  it("defines free, plus, pro", () => {
    expect(Object.keys(PLANS).sort()).toEqual(["free", "plus", "pro"]);
    expect(isPlanKey("free")).toBe(true);
    expect(isPlanKey("enterprise")).toBe(false);
  });

  it("free allows one active interview; paid unlimited", () => {
    expect(PLANS.free.activeInterviews).toBe(1);
    expect(PLANS.plus.activeInterviews).toBeNull();
    expect(PLANS.pro.activeInterviews).toBeNull();
  });

  it("free brief depth is basic; paid is detailed", () => {
    expect(PLANS.free.briefDepth).toBe("basic");
    expect(PLANS.plus.briefDepth).toBe("detailed");
  });

  it("story suggestions are Plus+ only", () => {
    expect(getFeatureLimit("free", "story_suggest")).toBe(0);
    expect(getFeatureLimit("plus", "story_suggest")).toBeGreaterThan(0);
  });
});

describe("effectivePlanKey", () => {
  it("honors active/trialing paid plans", () => {
    expect(effectivePlanKey({ plan_key: "plus", status: "active" })).toBe(
      "plus",
    );
    expect(effectivePlanKey({ plan_key: "pro", status: "trialing" })).toBe(
      "pro",
    );
  });

  it("downgrades past_due / canceled / incomplete to free", () => {
    expect(effectivePlanKey({ plan_key: "plus", status: "past_due" })).toBe(
      "free",
    );
    expect(effectivePlanKey({ plan_key: "pro", status: "canceled" })).toBe(
      "free",
    );
    expect(effectivePlanKey({ plan_key: "plus", status: "incomplete" })).toBe(
      "free",
    );
  });
});
