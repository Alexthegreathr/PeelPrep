import type { Metadata } from "next";
import { CircleCheck } from "lucide-react";

import { requireUser } from "@/lib/auth/dal";
import { getEffectivePlan } from "@/lib/data/subscription";
import { getUsageMeters } from "@/lib/data/dashboard";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { PageHeader } from "@/components/app/page-header";
import { BillingPanel } from "@/components/billing/billing-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage(props: PageProps<"/billing">) {
  const user = await requireUser();
  const searchParams = await props.searchParams;
  const { planKey, subscription } = await getEffectivePlan();
  const meters = await getUsageMeters(user.id);
  const status = subscription?.status ?? "active";
  const configured = isStripeConfigured();

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Your plan, usage, and subscription."
      />

      {searchParams.checkout === "success" ? (
        <Alert variant="success" className="mb-6">
          <CircleCheck aria-hidden="true" />
          <AlertDescription>
            <p>
              Thanks! We&apos;re confirming your payment with Stripe — your plan
              updates automatically once the payment is verified (usually within
              a few seconds).
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-8">
        <BillingPanel
          currentPlan={planKey}
          status={status}
          hasCustomer={Boolean(subscription?.stripe_customer_id)}
          stripeConfigured={configured}
        />

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Usage this period</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-6">
            {meters.map((m) => {
              const pct =
                m.limit > 0 ? Math.min(100, (m.used / m.limit) * 100) : 0;
              return (
                <div key={m.feature}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{m.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {m.used} / {m.limit} used
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">
              Free plans reset on the UTC calendar month; paid plans on your
              Stripe billing period.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
