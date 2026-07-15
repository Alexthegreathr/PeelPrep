"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";

import {
  createCheckoutSession,
  createPortalSession,
} from "@/app/(app)/billing/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS, type PlanKey } from "@/lib/billing/plans";

const FEATURES: Record<PlanKey, string[]> = {
  free: [
    "1 active interview",
    "1 Peel Brief / month (basic depth)",
    "5 predicted questions / month",
    "1 short practice session / month",
    "Feedback on 2 answers / month",
    "Readiness score & checklist",
  ],
  plus: [
    "Unlimited active interviews",
    "Unlimited Peel Briefs (fair use), detailed depth",
    "300 predicted questions / month",
    "3 full practice sessions / month",
    "Feedback on 20 answers / month",
    "AI story suggestions & mapping",
  ],
  pro: [
    "Everything in Plus",
    "Higher fair-use limits",
    "10 full practice sessions / month",
    "Feedback on 100 answers / month",
    "Advanced readiness analytics",
    "Priority access to new features",
  ],
};

export function BillingPanel({
  currentPlan,
  status,
  hasCustomer,
  stripeConfigured,
}: {
  currentPlan: PlanKey;
  status: string;
  hasCustomer: boolean;
  stripeConfigured: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function subscribe(plan: PlanKey) {
    setError(null);
    startTransition(async () => {
      const res = await createCheckoutSession(plan);
      if (res && !res.ok) setError(res.message);
    });
  }
  function manage() {
    setError(null);
    startTransition(async () => {
      const res = await createPortalSession();
      if (res && !res.ok) setError(res.message);
    });
  }

  const order: PlanKey[] = ["free", "plus", "pro"];

  return (
    <div className="flex flex-col gap-4">
      {!stripeConfigured ? (
        <Alert>
          <AlertDescription>
            <p>
              Billing runs in Stripe test mode. Add your Stripe keys and price
              ids to enable checkout — see the README. Your plan and limits are
              still enforced from the database.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{error}</p>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid items-start gap-4 md:grid-cols-3">
        {order.map((key) => {
          const plan = PLANS[key];
          const isCurrent = key === currentPlan;
          const isDowngrade = order.indexOf(key) < order.indexOf(currentPlan);
          const dollars = Math.round(plan.priceCentsMonthly / 100);
          return (
            <Card
              key={key}
              className={
                isCurrent
                  ? "border-primary shadow-lg ring-2 ring-primary/40"
                  : "opacity-95"
              }
            >
              <CardHeader
                className={`border-b ${isCurrent ? "bg-primary/10" : ""}`}
              >
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{plan.name}</span>
                  {isCurrent ? <Badge>Current</Badge> : null}
                </CardTitle>
                <p className="text-2xl font-bold">
                  ${dollars}
                  <span className="text-sm font-normal text-muted-foreground">
                    /mo
                  </span>
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-6">
                <ul className="flex flex-col gap-2 text-sm">
                  {FEATURES[key].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-success"
                        aria-hidden="true"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  hasCustomer ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={manage}
                      disabled={pending}
                    >
                      {pending ? (
                        <Loader2 className="animate-spin" aria-hidden="true" />
                      ) : null}
                      Manage subscription
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" disabled>
                      Your plan
                    </Button>
                  )
                ) : key === "free" ? (
                  hasCustomer ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={manage}
                      disabled={pending}
                    >
                      Downgrade in portal
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" disabled>
                      Included
                    </Button>
                  )
                ) : (
                  <Button
                    type="button"
                    variant={isDowngrade ? "outline" : "default"}
                    onClick={() => subscribe(key)}
                    disabled={pending}
                  >
                    {pending ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : null}
                    {isDowngrade ? "Downgrade" : "Upgrade"} to {plan.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {status !== "active" && status !== "trialing" ? (
        <Alert variant="destructive">
          <AlertDescription>
            <p>
              Your subscription status is <strong>{status}</strong>. Free-plan
              limits apply while this is resolved — none of your saved work is
              affected. Update your payment method in the customer portal.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
