import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { admin, integrationEnabled, makeUser, deleteUser } from "./helpers";

/**
 * Usage-ledger function tests (IMPLEMENTATION_PLAN Phase 3): reserve/settle
 * semantics, the concurrency race (two reservations vs limit 1 → exactly one
 * wins), stale-reservation sweep, and quota accounting. Opt-in.
 */
const period = () => {
  const now = new Date();
  return {
    p_period_start: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString(),
    p_period_end: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    ).toISOString(),
  };
};

async function reserve(
  userId: string,
  feature: string,
  quantity: number,
  limit: number,
) {
  return admin().rpc("reserve_usage", {
    p_user: userId,
    p_feature: feature,
    p_quantity: quantity,
    p_limit: limit,
    ...period(),
    p_interview: null,
  });
}

describe.skipIf(!integrationEnabled)("usage ledger functions", () => {
  let userId: string;

  beforeAll(async () => {
    userId = (await makeUser()).id;
  });
  afterAll(async () => {
    if (userId) await deleteUser(userId);
  });

  it("reserves up to the limit, then rejects", async () => {
    const first = await reserve(userId, "answer_feedback", 1, 2);
    expect(first.error).toBeNull();
    expect(first.data).toBeTruthy();

    const second = await reserve(userId, "answer_feedback", 1, 2);
    expect(second.error).toBeNull();

    const third = await reserve(userId, "answer_feedback", 1, 2);
    expect(third.error).not.toBeNull();
    expect(third.error?.message).toContain("usage_limit_exceeded");
  });

  it("respects quantity, not just row count", async () => {
    // limit 5, reserve 5 in one shot → ok; any more → rejected.
    const ok = await reserve(userId, "questions_generate", 5, 5);
    expect(ok.error).toBeNull();
    const over = await reserve(userId, "questions_generate", 1, 5);
    expect(over.error).not.toBeNull();
  });

  it("refunding a reservation frees the quota again", async () => {
    const r = await reserve(userId, "practice_session", 1, 1);
    expect(r.error).toBeNull();
    const eventId = r.data as string;

    // At the limit now.
    const blocked = await reserve(userId, "practice_session", 1, 1);
    expect(blocked.error).not.toBeNull();

    // Refund, then the slot is available again.
    const settle = await admin().rpc("settle_usage", {
      p_event_id: eventId,
      p_status: "refunded",
    });
    expect(settle.error).toBeNull();
    expect(settle.data).toBe(true);

    const retry = await reserve(userId, "practice_session", 1, 1);
    expect(retry.error).toBeNull();
  });

  it("settle is idempotent (second settle is a no-op)", async () => {
    const r = await reserve(userId, "section_regenerate", 1, 10);
    const eventId = r.data as string;
    const first = await admin().rpc("settle_usage", {
      p_event_id: eventId,
      p_status: "completed",
      p_input_tokens: 100,
      p_output_tokens: 50,
      p_cost_cents: 1.25,
      p_model: "mock",
      p_provider: "mock",
    });
    expect(first.data).toBe(true);
    const second = await admin().rpc("settle_usage", {
      p_event_id: eventId,
      p_status: "refunded",
    });
    expect(second.data).toBe(false); // already settled → no transition

    const { data } = await admin()
      .from("usage_events")
      .select("status, input_tokens, estimated_cost_cents")
      .eq("id", eventId)
      .single();
    expect(data?.status).toBe("completed");
    expect(data?.input_tokens).toBe(100);
  });

  it("two concurrent reservations against limit 1 → exactly one wins", async () => {
    const racer = await makeUser();
    try {
      const results = await Promise.all([
        reserve(racer.id, "brief_generate", 1, 1),
        reserve(racer.id, "brief_generate", 1, 1),
        reserve(racer.id, "brief_generate", 1, 1),
      ]);
      const wins = results.filter((r) => !r.error).length;
      const losses = results.filter((r) => r.error).length;
      expect(wins).toBe(1);
      expect(losses).toBe(2);

      const { data } = await admin()
        .from("usage_events")
        .select("id")
        .eq("user_id", racer.id)
        .eq("feature", "brief_generate");
      expect(data ?? []).toHaveLength(1);
    } finally {
      await deleteUser(racer.id);
    }
  });

  it("stale reservations are excluded from quota and swept to refunded", async () => {
    const staleUser = await makeUser();
    try {
      const r = await reserve(staleUser.id, "brief_generate", 1, 1);
      const eventId = r.data as string;

      // Backdate the reservation to 20 minutes ago (past the 15-min window).
      await admin()
        .from("usage_events")
        .update({
          created_at: new Date(Date.now() - 20 * 60_000).toISOString(),
        })
        .eq("id", eventId);

      // The stale reservation no longer counts → a new one succeeds.
      const retry = await reserve(staleUser.id, "brief_generate", 1, 1);
      expect(retry.error).toBeNull();

      // The sweeper marks the stale row refunded.
      const swept = await admin().rpc("sweep_stale_usage_reservations");
      expect(swept.error).toBeNull();
      expect((swept.data as number) >= 1).toBe(true);

      const { data } = await admin()
        .from("usage_events")
        .select("status")
        .eq("id", eventId)
        .single();
      expect(data?.status).toBe("refunded");
    } finally {
      await deleteUser(staleUser.id);
    }
  });
});

describe.skipIf(!integrationEnabled)("signup trigger", () => {
  it("creates a free subscription row for a new user", async () => {
    const u = await makeUser();
    try {
      const { data, error } = await admin()
        .from("subscriptions")
        .select("plan_key, status")
        .eq("user_id", u.id)
        .single();
      expect(error).toBeNull();
      expect(data?.plan_key).toBe("free");
      expect(data?.status).toBe("active");
    } finally {
      await deleteUser(u.id);
    }
  });
});
