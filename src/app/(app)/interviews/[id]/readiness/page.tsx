import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, Circle, Info, Lightbulb } from "lucide-react";

import { requireUser } from "@/lib/auth/dal";
import { getInterview } from "@/lib/data/interviews";
import { computeAndSnapshot } from "@/lib/readiness/compute";
import { ensureChecklist } from "@/lib/checklist/checklist";
import { getChecklist } from "@/lib/data/checklist";
import { getReadinessHistory } from "@/lib/data/readiness";
import { READINESS_COMPONENT_LABELS } from "@/lib/readiness/calculator";
import { PageHeader } from "@/components/app/page-header";
import { InterviewSubnav } from "@/components/interviews/interview-subnav";
import { ScoreRing } from "@/components/shared/score-ring";
import { ReadinessChart } from "@/components/readiness/readiness-chart";
import { ReadinessHistory } from "@/components/readiness/readiness-history";
import { ChecklistCard } from "@/components/readiness/checklist-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Readiness" };

export default async function ReadinessPage(
  props: PageProps<"/interviews/[id]/readiness">,
) {
  const { id } = await props.params;
  const user = await requireUser();
  const interview = await getInterview(id);
  if (!interview) notFound();

  if (interview.status === "draft") {
    return (
      <div>
        <PageHeader title="Readiness" />
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

  const { result, recommendedAction } = await computeAndSnapshot(id, user.id);
  await ensureChecklist(id, user.id);
  const [checklist, history] = await Promise.all([
    getChecklist(id),
    getReadinessHistory(id),
  ]);

  return (
    <div>
      <PageHeader
        title="Readiness"
        description="A transparent score from your preparation — calculated from your data, not guessed."
      />
      <InterviewSubnav interviewId={id} active="readiness" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-2 pt-8 text-center">
            <ScoreRing score={result.score} size={148} stroke={12} />
            <p className="mt-2 text-xs text-muted-foreground">
              This measures your preparation, not your chances. It never implies
              a guaranteed outcome.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="size-4" aria-hidden="true" /> Recommended
              next action
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm">
              {recommendedAction ?? "Keep building your preparation."}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              AI-suggested next step. The numeric score above is calculated
              deterministically by the app.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="text-base">Category breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ReadinessChart components={result.components} />
            <ul className="mt-4 flex flex-col divide-y">
              {result.components.map((c) => {
                const full = c.raw >= 0.999;
                return (
                  <li
                    key={c.component}
                    className="flex items-start gap-3 py-3 text-sm"
                  >
                    <span className="mt-0.5">
                      {full ? (
                        <Check
                          className="size-4 text-success"
                          aria-hidden="true"
                        />
                      ) : (
                        <Circle
                          className="size-4 text-muted-foreground/50"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <span className="flex-1">
                      <span className="font-medium">
                        {READINESS_COMPONENT_LABELS[c.component]}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {c.explanation}
                      </span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {Math.round(c.weightedPoints)}/{c.weight}
                    </span>
                  </li>
                );
              })}
            </ul>
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                How is this calculated?
              </summary>
              <p className="mt-2 text-muted-foreground">
                Each category earns a share of its weight based on measurable
                data — brief sections generated, stories in your bank, practice
                answers given, and your answer-feedback rubric averages. Weights
                sum to 100. Video practice is optional and worth zero points, so
                a perfect score is reachable with typed practice alone.
              </p>
            </details>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {checklist ? (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base">
                  Preparation checklist
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ChecklistCard
                  interviewId={id}
                  checklistId={checklist.checklistId}
                  items={checklist.items}
                />
              </CardContent>
            </Card>
          ) : null}

          {history.length > 1 ? (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base">Score history</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ReadinessHistory points={history} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
