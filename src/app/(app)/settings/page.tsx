import type { Metadata } from "next";
import { CircleCheck } from "lucide-react";

import { requireUser } from "@/lib/auth/dal";
import { getConsentState } from "@/lib/data/consent";
import { PageHeader } from "@/components/app/page-header";
import {
  ConsentToggle,
  ExportCard,
  DeleteAccountCard,
} from "@/components/settings/settings-controls";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireUser();
  const consents = await getConsentState();
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Your consents, data, and account controls."
      />

      <div className="flex flex-col gap-6">
        {demoMode ? (
          <Card className="border-primary/50 bg-primary/10">
            <CardHeader>
              <CardTitle>Demo mode is active</CardTitle>
              <CardDescription className="text-accent-foreground">
                This environment shows fictional data and uses the mock AI
                provider. Nothing here reflects a real account.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Consents</CardTitle>
            <CardDescription>
              Accepted at signup and managed here. Changes take effect
              immediately and are audit-logged.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="flex flex-col divide-y">
              <li className="flex items-center justify-between gap-4 py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    Terms of Service &amp; Privacy Policy
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Required to use PeelPrep — accepted when you signed up.
                  </span>
                </div>
                <Badge variant="secondary">
                  <CircleCheck aria-hidden="true" /> Accepted
                </Badge>
              </li>
              <li>
                <ConsentToggle
                  type="outcome_research_optin"
                  label="Improve system-wide predictions with anonymized outcomes"
                  description="Off by default. When on, your anonymized interview outcomes may inform predictions for everyone. Never used to train models; never includes your private content."
                  initial={consents.outcome_research_optin}
                />
              </li>
              <li>
                <ConsentToggle
                  type="marketing_emails"
                  label="Product update emails"
                  description="Occasional emails about new features. Off by default."
                  initial={consents.marketing_emails}
                />
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Export your data</CardTitle>
            <CardDescription>
              Download everything PeelPrep holds about you as JSON, with signed
              links to your uploaded files.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ExportCard />
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader className="border-b">
            <CardTitle>Delete your account</CardTitle>
            <CardDescription>
              Permanently erase your account and all associated data. This
              cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <DeleteAccountCard />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
