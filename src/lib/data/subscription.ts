import "server-only";

import { verifySession } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  effectivePlanKey,
  getPlan,
  type PlanEntitlements,
  type PlanKey,
} from "@/lib/billing/plans";
import type { SubscriptionRow } from "@/lib/data/types";

/** The caller's subscription row (RLS-scoped). */
export async function getSubscription(): Promise<SubscriptionRow | null> {
  const session = await verifySession();
  if (!session) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();
  return data;
}

export type EffectivePlan = {
  planKey: PlanKey;
  entitlements: PlanEntitlements;
  subscription: SubscriptionRow | null;
};

/**
 * The caller's *effective* plan (past_due / canceled → free limits) plus the
 * centralized entitlements. Every plan gate reads this — never a scattered
 * check. Falls back to free when no subscription row exists yet.
 */
export async function getEffectivePlan(): Promise<EffectivePlan> {
  const subscription = await getSubscription();
  const planKey = subscription ? effectivePlanKey(subscription) : "free";
  return { planKey, entitlements: getPlan(planKey), subscription };
}
