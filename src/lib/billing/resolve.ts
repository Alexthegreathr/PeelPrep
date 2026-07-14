import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  effectivePlanKey,
  getPlan,
  type PlanEntitlements,
} from "@/lib/billing/plans";
import type { SubscriptionRow } from "@/lib/data/types";

/**
 * Resolve a user's effective plan by user id via the admin client — no
 * request/cookie context needed. Used by server-side generation flows.
 */
export async function planForUser(userId: string): Promise<{
  subscription: SubscriptionRow | null;
  entitlements: PlanEntitlements;
}> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  const subscription = data ?? null;
  const planKey = subscription ? effectivePlanKey(subscription) : "free";
  return { subscription, entitlements: getPlan(planKey) };
}
