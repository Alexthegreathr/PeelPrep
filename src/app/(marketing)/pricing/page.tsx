import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS, type PlanKey } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Free, Plus ($19/mo), and Pro ($39/mo). Start free; upgrade for deeper analysis and more practice.",
};

// Display copy sourced from the same plan config used for enforcement.
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

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">
          Simple, honest pricing
        </h1>
        <p className="mt-3 text-muted-foreground">
          Start free. Every AI limit is enforced fairly and never deletes your
          work when you reach it.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {(["free", "plus", "pro"] as const).map((key) => {
          const plan = PLANS[key];
          return (
            <Card
              key={key}
              className={key === "plus" ? "border-primary" : undefined}
            >
              <CardHeader className="border-b">
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {key === "plus" ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                      Popular
                    </span>
                  ) : null}
                </CardTitle>
                <p className="text-3xl font-bold">
                  {plan.priceCentsMonthly === 0
                    ? "Free"
                    : `$${plan.priceCentsMonthly / 100}`}
                  {plan.priceCentsMonthly === 0 ? (
                    ""
                  ) : (
                    <span className="text-base font-normal text-muted-foreground">
                      /mo
                    </span>
                  )}
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
                <Button
                  asChild
                  variant={key === "plus" ? "default" : "outline"}
                >
                  <Link href="/signup">
                    {key === "free" ? "Get started" : `Choose ${plan.name}`}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Prices in USD. Cancel anytime; downgrades keep all your saved work.
        &ldquo;Unlimited&rdquo; is subject to reasonable fair-use limits.
      </p>
    </div>
  );
}
