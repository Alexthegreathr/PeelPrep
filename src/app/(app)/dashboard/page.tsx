import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  ChevronRight,
  Flame,
  Gauge,
  Lightbulb,
} from "lucide-react";

import { requireUser, getProfile } from "@/lib/auth/dal";
import { listUpcomingInterviews } from "@/lib/data/interviews";
import { currentScore } from "@/lib/readiness/compute";
import {
  getUsageMeters,
  getPracticeStreak,
  getRecentBriefs,
  getLatestRecommendedAction,
} from "@/lib/data/dashboard";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AddInterviewButton } from "@/components/interviews/add-interview-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatInterviewTime, relativeTime } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/interviews/labels";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getProfile();
  const greetingName = profile?.full_name?.split(" ")[0];
  const upcoming = await listUpcomingInterviews();
  const next = upcoming.find((i) => i.interview_at) ?? upcoming[0];

  if (!next) {
    return (
      <div>
        <PageHeader
          title={
            greetingName ? `Welcome, ${greetingName}` : "Welcome to PeelPrep"
          }
          description="Your interviews, briefings, and practice live here."
        />
        <EmptyState
          title="No interviews yet"
          description="PeelPrep turns an upcoming interview into a personalized briefing and practice plan. Add your first to get started."
          action={<AddInterviewButton label="Add an interview" />}
        />
      </div>
    );
  }

  const [score, nextAction, meters, streak, recentBriefs] = await Promise.all([
    currentScore(next.id, user.id),
    getLatestRecommendedAction(next.id),
    getUsageMeters(user.id),
    getPracticeStreak(user.id),
    getRecentBriefs(user.id),
  ]);

  return (
    <div>
      <PageHeader
        title={
          greetingName ? `Welcome, ${greetingName}` : "Welcome to PeelPrep"
        }
        description="Your interviews, briefings, and practice live here."
        action={<AddInterviewButton />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-primary/30 bg-primary/5 lg:col-span-2">
          <CardHeader className="border-b border-primary/20">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4" aria-hidden="true" /> Next up
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
                className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
              >
                Open <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="size-4" aria-hidden="true" /> Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-1 pt-6 text-center">
            <div className="text-4xl font-bold tabular-nums">{score}</div>
            <div className="text-xs text-muted-foreground">out of 100</div>
            <Link
              href={`/interviews/${next.id}/readiness`}
              className="mt-2 text-sm underline-offset-4 hover:underline"
            >
              View breakdown
            </Link>
          </CardContent>
        </Card>
      </div>

      {nextAction ? (
        <Card className="mt-6">
          <CardContent className="flex items-start gap-3 pt-6 text-sm">
            <Lightbulb
              className="mt-0.5 size-4 shrink-0 text-[#7b4b20]"
              aria-hidden="true"
            />
            <div>
              <p className="font-medium">Recommended next action</p>
              <p className="text-muted-foreground">{nextAction}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="text-base">AI usage this period</CardTitle>
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
                      {m.used} / {m.limit}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="size-4" aria-hidden="true" /> Practice streak
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold tabular-nums">{streak}</div>
            <div className="text-xs text-muted-foreground">
              day{streak === 1 ? "" : "s"} in a row
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
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
                          interview.status === "draft" ? "outline" : "secondary"
                        }
                      >
                        {STATUS_LABELS[interview.status] ?? interview.status}
                      </Badge>
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {interview.position_title || "Position not set"}
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

        {recentBriefs.length > 0 ? (
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Recent Peel Briefs
            </h2>
            <ul className="flex flex-col gap-2">
              {recentBriefs.map((b) => (
                <li key={b.interviewId}>
                  <Link
                    href={`/interviews/${b.interviewId}/brief`}
                    className="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-secondary/50"
                  >
                    <span className="truncate font-medium">{b.company}</span>
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(b.generatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
