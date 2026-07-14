import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/dal";
import { PageHeader } from "@/components/app/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Billing" };

/**
 * Billing shell. The real subscription source of truth (the `subscriptions`
 * table) and Stripe checkout/portal/webhooks arrive in the billing phase.
 * Until then every account is on the Free plan by default — shown honestly,
 * not faked.
 */
export default async function BillingPage() {
  await requireUser();

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Your plan and usage. Upgrades and invoices arrive with the billing phase."
      />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              Current plan
              <Badge variant="secondary">Free</Badge>
            </CardTitle>
            <CardDescription>
              You&rsquo;re on the Free plan: one Peel Brief and one active
              interview per month, with basic company and role analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Paid plans (Plus and Pro), usage meters, and the Stripe customer
            portal are wired up in a later phase. Nothing is charged today.
          </CardContent>
        </Card>

        <Card className="bg-secondary/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              Usage meters
              <Badge variant="outline">Later phase</Badge>
            </CardTitle>
            <CardDescription>
              Your Peel Brief, question, and practice allowances — tracked by
              the usage ledger — will display here once AI features ship.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
