import type { Metadata } from "next";
import { CircleCheck } from "lucide-react";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Settings" };

type ConsentRow = {
  consent_type: string;
  version: string;
  granted: boolean;
  granted_at: string | null;
};

const CONSENT_LABELS: Record<string, string> = {
  terms_of_service: "Terms of Service",
  privacy_policy: "Privacy Policy",
};

export default async function SettingsPage() {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  // RLS-scoped: returns only the caller's own consent rows.
  const { data: consents } = await supabase
    .from("user_consents")
    .select("consent_type, version, granted, granted_at")
    .in("consent_type", ["terms_of_service", "privacy_policy"])
    .order("granted_at", { ascending: true })
    .overrideTypes<ConsentRow[]>();

  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Your consents and account controls."
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
              Recorded when you created your account. Versioned so changes to
              our policies are tracked.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="flex flex-col divide-y divide-border">
              {(consents ?? []).length === 0 ? (
                <li className="py-2 text-sm text-muted-foreground">
                  No consent records found.
                </li>
              ) : (
                (consents ?? []).map((c) => (
                  <li
                    key={`${c.consent_type}-${c.version}`}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {CONSENT_LABELS[c.consent_type] ?? c.consent_type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Version {c.version}
                        {c.granted_at
                          ? ` · accepted ${new Date(c.granted_at).toLocaleDateString()}`
                          : ""}
                      </span>
                    </div>
                    {c.granted ? (
                      <Badge variant="secondary">
                        <CircleCheck aria-hidden="true" />
                        Accepted
                      </Badge>
                    ) : (
                      <Badge variant="outline">Revoked</Badge>
                    )}
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-secondary/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              Data export &amp; account deletion
              <Badge variant="outline">Later phase</Badge>
            </CardTitle>
            <CardDescription>
              Full data export, consent management (including the outcome
              research opt-in), and account deletion arrive with the privacy
              &amp; account phase. Until then, contact support for any data
              request.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
