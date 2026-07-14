import { describe, expect, it } from "vitest";

import {
  usagePeriod,
  featureLimit,
  isMeteredFeature,
  UNMETERED_LIMIT,
} from "./features";
import type { SubscriptionRow } from "@/lib/data/types";

const sub = (over: Partial<SubscriptionRow>): SubscriptionRow =>
  ({
    id: "s",
    user_id: "u",
    plan_key: "free",
    status: "active",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
    trial_end: null,
    created_at: "",
    updated_at: "",
    ...over,
  }) as SubscriptionRow;

describe("usagePeriod", () => {
  it("uses the UTC calendar month for free plans", () => {
    const { start, end } = usagePeriod(sub({ plan_key: "free" }));
    expect(start.endsWith("-01T00:00:00.000Z")).toBe(true);
    expect(new Date(end) > new Date(start)).toBe(true);
  });

  it("uses the Stripe billing period for active paid plans", () => {
    const start = "2026-07-05T00:00:00.000Z";
    const end = "2026-08-05T00:00:00.000Z";
    const p = usagePeriod(
      sub({
        plan_key: "plus",
        status: "active",
        current_period_start: start,
        current_period_end: end,
      }),
    );
    expect(p).toEqual({ start, end });
  });

  it("falls back to the month for past_due paid plans", () => {
    const p = usagePeriod(
      sub({
        plan_key: "plus",
        status: "past_due",
        current_period_start: "2026-07-05T00:00:00.000Z",
        current_period_end: "2026-08-05T00:00:00.000Z",
      }),
    );
    expect(p.start.endsWith("-01T00:00:00.000Z")).toBe(true);
  });
});

describe("featureLimit", () => {
  it("returns plan limits for metered features", () => {
    expect(featureLimit("free", "answer_feedback")).toBe(2);
    expect(featureLimit("pro", "answer_feedback")).toBe(100);
  });

  it("treats practice_turn / readiness_advice as unmetered", () => {
    expect(isMeteredFeature("practice_turn")).toBe(false);
    expect(featureLimit("free", "practice_turn")).toBe(UNMETERED_LIMIT);
    expect(featureLimit("free", "readiness_advice")).toBe(UNMETERED_LIMIT);
  });
});
