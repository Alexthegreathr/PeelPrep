import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UsageFeature } from "@/lib/usage/features";

/**
 * Thin wrappers over the atomic ledger DB functions (DATABASE.md §2). Called
 * from server code with the service role. Reservation happens BEFORE the model
 * call so concurrent requests cannot double-spend.
 */

export type ReserveResult =
  | { ok: true; eventId: string }
  | { ok: false; reason: "limit_exceeded" | "error" };

export async function reserveUsage(opts: {
  userId: string;
  feature: UsageFeature;
  quantity: number;
  limit: number;
  periodStart: string;
  periodEnd: string;
  interviewId?: string | null;
}): Promise<ReserveResult> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("reserve_usage", {
    p_user: opts.userId,
    p_feature: opts.feature,
    p_quantity: opts.quantity,
    p_limit: opts.limit,
    p_period_start: opts.periodStart,
    p_period_end: opts.periodEnd,
    p_interview: opts.interviewId ?? undefined,
  });
  if (error) {
    if (error.message?.includes("usage_limit_exceeded")) {
      return { ok: false, reason: "limit_exceeded" };
    }
    console.error("reserveUsage failed", error.message);
    return { ok: false, reason: "error" };
  }
  return { ok: true, eventId: data as string };
}

export type SettleStatus = "completed" | "refunded" | "failed";

export async function settleUsage(
  eventId: string,
  status: SettleStatus,
  meta?: {
    inputTokens?: number;
    outputTokens?: number;
    costCents?: number;
    model?: string;
    provider?: string;
    generationId?: string;
  },
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("settle_usage", {
    p_event_id: eventId,
    p_status: status,
    p_input_tokens: meta?.inputTokens,
    p_output_tokens: meta?.outputTokens,
    p_cost_cents: meta?.costCents,
    p_model: meta?.model,
    p_provider: meta?.provider,
    p_generation_id: meta?.generationId,
  });
  if (error) console.error("settleUsage failed", error.message);
}

/** Current in-period usage (reserved + completed quantity) for the dashboard. */
export async function currentUsage(
  userId: string,
  feature: UsageFeature,
  periodStart: string,
): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("usage_events")
    .select("quantity, status, created_at")
    .eq("user_id", userId)
    .eq("feature", feature)
    .eq("period_start", periodStart);
  const cutoff = Date.now() - 15 * 60_000;
  return (data ?? [])
    .filter(
      (r) =>
        r.status === "completed" ||
        (r.status === "reserved" && new Date(r.created_at).getTime() > cutoff),
    )
    .reduce((sum, r) => sum + (r.quantity ?? 0), 0);
}
