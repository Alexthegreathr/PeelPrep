"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getStripe,
  isStripeConfigured,
  priceIdForPlan,
} from "@/lib/billing/stripe";
import { getConfiguredAppUrl } from "@/lib/auth/site-url";
import { type PlanKey } from "@/lib/billing/plans";

export type BillingResult = { ok: false; message: string };

async function customerIdFor(userId: string, email: string | undefined) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (data?.stripe_customer_id) return data.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email,
    metadata: { userId },
  });
  // subscriptions has no user write policy → write via the service role.
  const admin = createSupabaseAdminClient();
  await admin
    .from("subscriptions")
    .update({ stripe_customer_id: customer.id })
    .eq("user_id", userId);
  return customer.id;
}

export async function createCheckoutSession(
  plan: PlanKey,
): Promise<BillingResult> {
  const user = await requireUser();
  if (!isStripeConfigured()) {
    return {
      ok: false,
      message: "Billing isn't configured in this environment.",
    };
  }
  if (plan !== "plus" && plan !== "pro") {
    return { ok: false, message: "Choose a paid plan." };
  }
  const priceId = priceIdForPlan(plan);
  if (!priceId) {
    return { ok: false, message: "That plan isn't available right now." };
  }

  const customerId = await customerIdFor(user.id, user.email);
  const appUrl = getConfiguredAppUrl();
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { userId: user.id } },
    success_url: `${appUrl}/billing?checkout=success`,
    cancel_url: `${appUrl}/billing?checkout=canceled`,
    allow_promotion_codes: true,
  });
  if (!session.url) return { ok: false, message: "Couldn't start checkout." };
  redirect(session.url);
}

export async function createPortalSession(): Promise<BillingResult> {
  const user = await requireUser();
  if (!isStripeConfigured()) {
    return {
      ok: false,
      message: "Billing isn't configured in this environment.",
    };
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data?.stripe_customer_id) {
    return { ok: false, message: "No billing account yet — subscribe first." };
  }
  const appUrl = getConfiguredAppUrl();
  const session = await getStripe().billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${appUrl}/billing`,
  });
  redirect(session.url);
}
