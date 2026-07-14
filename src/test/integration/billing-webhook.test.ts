import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";

import { admin, integrationEnabled, makeUser, deleteUser } from "./helpers";
import { handleStripeEvent } from "@/lib/billing/subscriptions";

/**
 * Stripe webhook sync integration (IMPLEMENTATION_PLAN Phase 10): idempotency,
 * subscription state as the source of truth, and past_due/canceled handling.
 * Signature verification is exercised in the route; here we drive the handler
 * with constructed events. Opt-in.
 *
 * Event ids are unique per run: stripe_webhook_events rows are service-written
 * and outlive user deletion, so reusing ids would trip the idempotency guard.
 */
const RUN = randomUUID().slice(0, 8);
const CUSTOMER = `cus_test_${RUN}`;
const PLUS_PRICE = "price_plus_test";
const evt = (name: string) => `evt_${name}_${RUN}`;

const now = Math.floor(Date.UTC(2026, 6, 1) / 1000);

const SUB_ID = `sub_test_${RUN}`;

function subEvent(
  type: string,
  overrides: Partial<Stripe.Subscription>,
  userId: string,
  id = evt("sub"),
): Stripe.Event {
  return {
    id,
    type,
    data: {
      object: {
        id: SUB_ID,
        customer: CUSTOMER,
        status: "active",
        cancel_at_period_end: false,
        current_period_start: now,
        current_period_end: now + 2_592_000,
        items: {
          data: [
            {
              price: { id: PLUS_PRICE },
              current_period_start: now,
              current_period_end: now + 2_592_000,
            },
          ],
        },
        metadata: { userId },
        ...overrides,
      },
    },
  } as unknown as Stripe.Event;
}

describe.skipIf(!integrationEnabled)("stripe webhook sync", () => {
  let userId: string;

  beforeAll(async () => {
    vi.stubEnv("STRIPE_PRICE_PLUS_MONTHLY", PLUS_PRICE);
    userId = (await makeUser()).id;
  });
  afterAll(async () => {
    vi.unstubAllEnvs();
    if (userId) await deleteUser(userId);
  });

  it("links the customer on checkout completion", async () => {
    const event = {
      id: evt("checkout"),
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: userId,
          customer: CUSTOMER,
          subscription: SUB_ID,
        },
      },
    } as unknown as Stripe.Event;
    await handleStripeEvent(event);

    const { data } = await admin()
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();
    expect(data?.stripe_customer_id).toBe(CUSTOMER);
  });

  it("syncs the plan from a subscription.updated event", async () => {
    await handleStripeEvent(
      subEvent("customer.subscription.updated", {}, userId, evt("sub_a")),
    );
    const { data } = await admin()
      .from("subscriptions")
      .select("plan_key, status, stripe_subscription_id, current_period_end")
      .eq("user_id", userId)
      .single();
    expect(data?.plan_key).toBe("plus");
    expect(data?.status).toBe("active");
    expect(data?.stripe_subscription_id).toBe(SUB_ID);
    expect(data?.current_period_end).toBeTruthy();
  });

  it("is idempotent — a duplicate event is a no-op", async () => {
    const dup = subEvent(
      "customer.subscription.updated",
      { status: "active" },
      userId,
      evt("sub_dup"),
    );
    await handleStripeEvent(dup);
    // Second delivery of the SAME event id must not reprocess.
    await handleStripeEvent(dup);
    const { data: ev } = await admin()
      .from("stripe_webhook_events")
      .select("processed_at")
      .eq("id", evt("sub_dup"))
      .single();
    expect(ev?.processed_at).toBeTruthy();
  });

  it("flips to past_due on payment failure, back on invoice.paid", async () => {
    const failed = {
      id: evt("inv_fail"),
      type: "invoice.payment_failed",
      data: { object: { customer: CUSTOMER } },
    } as unknown as Stripe.Event;
    await handleStripeEvent(failed);
    let { data } = await admin()
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .single();
    expect(data?.status).toBe("past_due");

    const paid = {
      id: evt("inv_paid"),
      type: "invoice.paid",
      data: { object: { customer: CUSTOMER } },
    } as unknown as Stripe.Event;
    await handleStripeEvent(paid);
    ({ data } = await admin()
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .single());
    expect(data?.status).toBe("active");
  });

  it("cancels on subscription.deleted", async () => {
    await handleStripeEvent(
      subEvent(
        "customer.subscription.deleted",
        { status: "canceled" },
        userId,
        evt("sub_del"),
      ),
    );
    const { data } = await admin()
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .single();
    expect(data?.status).toBe("canceled");
  });
});
