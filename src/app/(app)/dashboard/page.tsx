import type { Metadata } from "next";

import { getProfile } from "@/lib/auth/dal";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Dashboard" };

const UPCOMING_PANELS = [
  {
    title: "Readiness score",
    description:
      "A transparent 0–100 score from your prep, once you have an interview to prepare for.",
  },
  {
    title: "AI usage remaining",
    description: "Your monthly Peel Brief, question, and practice allowances.",
  },
  {
    title: "Practice streak",
    description: "Momentum from your typed mock-interview sessions.",
  },
] as const;

export default async function DashboardPage() {
  const profile = await getProfile();
  const greetingName = profile?.full_name?.split(" ")[0];

  return (
    <div>
      <PageHeader
        title={
          greetingName ? `Welcome, ${greetingName}` : "Welcome to PeelPrep"
        }
        description="Your interviews, briefings, and practice will live here."
      />

      <EmptyState
        title="No interviews yet"
        description="PeelPrep turns an upcoming interview into a personalized briefing and practice plan. Interview creation arrives in the next phase — your dashboard will fill in automatically once it lands."
        action={
          <Button size="lg" disabled aria-disabled="true">
            Add an interview
            <Badge variant="secondary" className="ml-1">
              Soon
            </Badge>
          </Button>
        }
      />

      <section
        aria-label="What your dashboard will show"
        className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {UPCOMING_PANELS.map((panel) => (
          <Card key={panel.title} className="bg-secondary/30">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                {panel.title}
                <Badge variant="outline">Later phase</Badge>
              </CardTitle>
              <CardDescription>{panel.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Nothing to show yet.
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
