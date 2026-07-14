import "server-only";

import type Stripe from "stripe";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
import { planForPriceId } from "@/lib/billing/stripe";
import { writeAuditLog } from "@/lib/audit";

/**
 * Stripe webhook processing (SECURITY.md §6): idempotent (event id recorded
 * first), and the ONLY writer of paid subscription state. Handlers are
 * re-runnable (upsert semantics), and out-of-order events are tolerated by
 * trusting the fetched object state, not event order.
 */
type Admin = ReturnType<typeof createSupabaseAdminClient>;

type SubStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete";

function mapStatus(status: Stripe.Subscription.Status): SubStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
    case "paused":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      return "incomplete";
  }
}

function toIso(unixSeconds: unknown): string | null {
  return typeof unixSeconds === "number"
    ? new Date(unixSeconds * 1000).toISOString()
    : null;
}

function subscriptionPeriod(sub: Stripe.Subscription): {
  start: string | null;
  end: string | null;
} {
  const anySub = sub as unknown as {
    current_period_start?: number;
    current_period_end?: number;
    items?: {
      data?: { current_period_start?: number; current_period_end?: number }[];
    };
  };
  const item = anySub.items?.data?.[0];
  return {
    start: toIso(anySub.current_period_start ?? item?.current_period_start),
    end: toIso(anySub.current_period_end ?? item?.current_period_end),
  };
}

async function findUserId(
  admin: Admin,
  sub: Stripe.Subscription,
): Promise<string | null> {
  const bySubId = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (bySubId.data) return bySubId.data.user_id;

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const byCustomer = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (byCustomer.data) return byCustomer.data.user_id;

  const metaUserId = sub.metadata?.userId;
  return metaUserId ?? null;
}

/** Upsert a user's subscription row from a Stripe subscription object. */
export async function syncSubscription(
  admin: Admin,
  sub: Stripe.Subscription,
): Promise<void> {
  const userId = await findUserId(admin, sub);
  if (!userId) {
    console.error("stripe sync: no user for subscription", sub.id);
    return;
  }
  const priceId = sub.items.data[0]?.price.id;
  const planKey = planForPriceId(priceId);
  const period = subscriptionPeriod(sub);
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  await admin
    .from("subscriptions")
    .update({
      plan_key: planKey,
      status: mapStatus(sub.status),
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      current_period_start: period.start,
      current_period_end: period.end,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
    })
    .eq("user_id", userId);

  await writeAuditLog({
    userId,
    actor: "stripe_webhook",
    action: "subscription.updated",
    resourceType: "subscription",
    metadata: { plan: planKey, status: mapStatus(sub.status) },
  });
}

async function processEvent(event: Stripe.Event, admin: Admin): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.userId;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (userId && customerId) {
        // Link the customer/subscription to the user; plan/status are synced by
        // the subscription.created/updated event.
        await admin
          .from("subscriptions")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId ?? null,
          })
          .eq("user_id", userId);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      await syncSubscription(admin, event.data.object as Stripe.Subscription);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await findUserId(admin, sub);
      if (userId) {
        await admin
          .from("subscriptions")
          .update({ status: "canceled", cancel_at_period_end: false })
          .eq("user_id", userId);
        await writeAuditLog({
          userId,
          actor: "stripe_webhook",
          action: "subscription.canceled",
          resourceType: "subscription",
        });
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;
      if (customerId) {
        await admin
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;
      if (customerId) {
        await admin
          .from("subscriptions")
          .update({ status: "active" })
          .eq("stripe_customer_id", customerId)
          .eq("status", "past_due");
      }
      break;
    }
    default:
      break;
  }
}

/** Idempotently handle a verified Stripe event. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("stripe_webhook_events")
    .select("processed_at")
    .eq("id", event.id)
    .maybeSingle();
  if (existing?.processed_at) return; // already processed → no-op

  if (!existing) {
    await admin.from("stripe_webhook_events").insert({
      id: event.id,
      type: event.type,
      payload: event as unknown as Json,
    });
  }

  try {
    await processEvent(event, admin);
    await admin
      .from("stripe_webhook_events")
      .update({ processed_at: new Date().toISOString(), error: null })
      .eq("id", event.id);
  } catch (error) {
    await admin
      .from("stripe_webhook_events")
      .update({ error: String(error).slice(0, 500) })
      .eq("id", event.id);
    throw error;
  }
}
