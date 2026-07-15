import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Info, Video } from "lucide-react";

import { getInterview } from "@/lib/data/interviews";
import { listSessions } from "@/lib/data/practice";
import { getEffectivePlan } from "@/lib/data/subscription";
import { PageHeader } from "@/components/app/page-header";
import { InterviewSubnav } from "@/components/interviews/interview-subnav";
import { PracticeSetup } from "@/components/practice/practice-setup";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Mock practice" };

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export default async function PracticePage(
  props: PageProps<"/interviews/[id]/practice">,
) {
  const { id } = await props.params;
  const interview = await getInterview(id);
  if (!interview) notFound();

  if (interview.status === "draft") {
    return (
      <div>
        <PageHeader title="Mock practice" />
        <Alert>
          <Info aria-hidden="true" />
          <AlertDescription>
            <p>Finish and confirm your interview intake first.</p>
            <p className="mt-2">
              <Button asChild size="sm">
                <Link href={`/interviews/${id}`}>Finish intake</Link>
              </Button>
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const [sessions, { entitlements }] = await Promise.all([
    listSessions(id),
    getEffectivePlan(),
  ]);

  return (
    <div>
      <PageHeader
        title="Mock practice"
        description="Typed mock interviews — one question at a time, structured feedback at the end."
      />
      <InterviewSubnav interviewId={id} active="practice" />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>New session</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <PracticeSetup
              interviewId={id}
              isFree={entitlements.key === "free"}
            />
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Past sessions
          </h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sessions yet. Start one to practice.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sessions.map((s) => {
                const difficulty = String(
                  (s.config as { difficulty?: string }).difficulty ?? "",
                );
                const isCompleted = s.status === "completed";
                return (
                  <li key={s.id}>
                    <Link
                      href={`/interviews/${id}/practice/${s.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm transition-all hover:-translate-y-0.5 hover:bg-secondary/50 hover:shadow-sm"
                    >
                      <span>
                        <span className="font-medium">
                          {formatDate(s.started_at)}
                        </span>
                        {difficulty ? (
                          <span className="block text-xs capitalize text-muted-foreground">
                            {difficulty}
                          </span>
                        ) : null}
                        {isCompleted ? (
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <Video className="size-3" aria-hidden="true" />{" "}
                            Delivery analysis available
                          </span>
                        ) : null}
                      </span>
                      <span className="flex items-center gap-1">
                        <Badge
                          variant={isCompleted ? "secondary" : "outline"}
                          className={
                            isCompleted
                              ? "bg-success/15 text-success"
                              : undefined
                          }
                        >
                          {formatStatus(s.status)}
                        </Badge>
                        <ChevronRight
                          className="size-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
