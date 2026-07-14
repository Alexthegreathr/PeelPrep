import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";

import { getProfile } from "@/lib/auth/dal";
import { listUpcomingInterviews } from "@/lib/data/interviews";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AddInterviewButton } from "@/components/interviews/add-interview-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { formatInterviewTime, relativeTime } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/interviews/labels";

export const metadata: Metadata = { title: "Dashboard" };

const UPCOMING_PANELS = [
  {
    title: "Readiness score",
    description:
      "A transparent 0–100 score from your prep, once you start generating and practicing.",
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
  const upcoming = await listUpcomingInterviews();
  const next = upcoming.find((i) => i.interview_at) ?? upcoming[0];

  return (
    <div>
      <PageHeader
        title={
          greetingName ? `Welcome, ${greetingName}` : "Welcome to PeelPrep"
        }
        description="Your interviews, briefings, and practice live here."
        action={upcoming.length > 0 ? <AddInterviewButton /> : undefined}
      />

      {upcoming.length === 0 ? (
        <EmptyState
          title="No interviews yet"
          description="PeelPrep turns an upcoming interview into a personalized briefing and practice plan. Add your first to get started."
          action={<AddInterviewButton label="Add an interview" />}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {next ? (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="border-b border-primary/20">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="size-4" aria-hidden="true" />
                  Next up
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold">
                      {next.company_name || "Untitled interview"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {next.position_title || "Position not set"}
                    </p>
                    <p className="mt-1 text-sm">
                      {next.interview_at ? (
                        <>
                          <span className="font-medium">
                            {relativeTime(next.interview_at)}
                          </span>{" "}
                          ·{" "}
                          {formatInterviewTime(
                            next.interview_at,
                            next.interview_timezone,
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          No date set yet
                        </span>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/interviews/${next.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Open <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <section aria-label="Upcoming interviews">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Upcoming
            </h2>
            <ul className="flex flex-col gap-2">
              {upcoming.map((interview) => (
                <li key={interview.id}>
                  <Link
                    href={`/interviews/${interview.id}`}
                    className="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-secondary/50"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium">
                        <span className="truncate">
                          {interview.company_name || "Untitled interview"}
                        </span>
                        <Badge
                          variant={
                            interview.status === "draft"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {STATUS_LABELS[interview.status] ?? interview.status}
                        </Badge>
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {interview.position_title || "Position not set"}
                        {interview.interview_at
                          ? ` · ${formatInterviewTime(interview.interview_at, interview.interview_timezone)}`
                          : ""}
                      </p>
                    </div>
                    <ChevronRight
                      className="size-5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-label="More insights coming soon"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {UPCOMING_PANELS.map((panel) => (
              <Card key={panel.title} className="bg-secondary/30">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    {panel.title}
                    <Badge variant="outline">Later phase</Badge>
                  </CardTitle>
                  <CardDescription>{panel.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
