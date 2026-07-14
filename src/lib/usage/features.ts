import {
  getPlan,
  type MeteredFeature,
  type PlanKey,
} from "@/lib/billing/plans";
import type { SubscriptionRow } from "@/lib/data/types";

/**
 * Usage period + limit resolution (AI_ARCHITECTURE.md §8). Period is the Stripe
 * billing period for a paid active/trialing plan, else the UTC calendar month.
 * Unmetered features (practice_turn, readiness_advice) are ledger-recorded for
 * cost but never quota-blocked — modeled with an effectively-unlimited limit.
 */
export type UsageFeature =
  MeteredFeature | "practice_turn" | "readiness_advice";

// ~int4 max — reserve_usage still records the row; it just never blocks.
export const UNMETERED_LIMIT = 2_000_000_000;

export type UsagePeriod = { start: string; end: string };

export function usagePeriod(sub: SubscriptionRow | null): UsagePeriod {
  if (
    sub &&
    sub.plan_key !== "free" &&
    (sub.status === "active" || sub.status === "trialing") &&
    sub.current_period_start &&
    sub.current_period_end
  ) {
    return { start: sub.current_period_start, end: sub.current_period_end };
  }
  const now = new Date();
  return {
    start: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString(),
    end: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    ).toISOString(),
  };
}

export function isMeteredFeature(
  feature: UsageFeature,
): feature is MeteredFeature {
  return feature !== "practice_turn" && feature !== "readiness_advice";
}

export function featureLimit(planKey: PlanKey, feature: UsageFeature): number {
  if (!isMeteredFeature(feature)) return UNMETERED_LIMIT;
  return getPlan(planKey).limits[feature];
}
