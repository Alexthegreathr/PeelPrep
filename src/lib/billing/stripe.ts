import "server-only";

import Stripe from "stripe";

import { type PlanKey, isPlanKey } from "@/lib/billing/plans";

/**
 * Stripe integration (SECURITY.md §6). The database is the source of truth for
 * subscription state after verified webhooks — checkout redirects never grant
 * entitlements. Prices come from env and map to plan keys.
 */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  return new Stripe(key);
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Map plan key → configured Stripe price id (paid plans only). */
export function priceIdForPlan(plan: PlanKey): string | undefined {
  if (plan === "plus")
    return process.env.STRIPE_PRICE_PLUS_MONTHLY || undefined;
  if (plan === "pro") return process.env.STRIPE_PRICE_PRO_MONTHLY || undefined;
  return undefined;
}

/** Map a Stripe price id back to a plan key (webhook sync). */
export function planForPriceId(priceId: string | null | undefined): PlanKey {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_PLUS_MONTHLY) return "plus";
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return "pro";
  return "free";
}

export function coercePlanKey(value: string | null | undefined): PlanKey {
  return value && isPlanKey(value) ? value : "free";
}
