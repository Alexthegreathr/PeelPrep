"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquareText, RotateCcw } from "lucide-react";

import { requestFeedbackAction } from "@/app/(app)/interviews/[id]/practice/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AnswerRow } from "@/lib/data/practice";

const RUBRIC_LABELS: Record<string, string> = {
  relevance: "Relevance",
  clarity: "Clarity",
  structure: "Structure",
  specificity: "Specificity",
  evidence: "Evidence",
  measurable_results: "Measurable results",
  conciseness: "Conciseness",
  authenticity: "Authenticity",
  confidence: "Confidence",
  completion: "Question completion",
};

export function AnswerFeedback({
  interviewId,
  sessionId,
  answer,
}: {
  interviewId: string;
  sessionId: string;
  answer: AnswerRow;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const feedback = answer.feedback?.[0] ?? null;

  function request() {
    setError(null);
    startTransition(async () => {
      const res = await requestFeedbackAction(
        interviewId,
        sessionId,
        answer.id,
      );
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.refresh();
    });
  }

  if (!feedback) {
    return (
      <div className="mt-3">
        {error ? (
          <Alert variant="destructive" className="mb-2">
            <AlertDescription>
              <p>{error}</p>
            </AlertDescription>
          </Alert>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={request}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <MessageSquareText aria-hidden="true" />
          )}
          Get feedback
        </Button>
      </div>
    );
  }

  // Derived from the existing rubric scores — not an invented metric.
  const scores = Object.values(feedback.rubric).map((r) => r.score);
  const overall =
    scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : null;
  const tone = overall !== null ? overallTone(overall) : null;

  return (
    <div className="mt-4 rounded-lg border bg-secondary/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Feedback</h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={request}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <RotateCcw aria-hidden="true" />
          )}
          Retry
        </Button>
      </div>

      {overall !== null && tone ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Overall
            </span>
            <span className="font-heading text-2xl leading-none tabular-nums">
              {overall.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">/ 5</span>
          </div>
          <Badge variant="secondary" className={tone.className}>
            {tone.label}
          </Badge>
        </div>
      ) : null}

      <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
          Top improvement
        </p>
        <p className="mt-0.5 whitespace-pre-wrap text-sm">
          {feedback.top_improvement}
        </p>
      </div>

      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {Object.entries(feedback.rubric).map(([key, val]) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            <span className="w-32 shrink-0 text-muted-foreground">
              {RUBRIC_LABELS[key] ?? key}
            </span>
            <span
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
              aria-hidden="true"
            >
              <span
                className={`block h-full ${barColor(val.score)}`}
                style={{ width: `${(val.score / 5) * 100}%` }}
              />
            </span>
            <span className="w-6 text-right font-medium">{val.score}/5</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        These describe the answer as delivered — not a judgment about you.
      </p>

      <dl className="mt-4 flex flex-col gap-2 text-sm">
        {feedback.worked_well ? (
          <FbRow label="What worked" value={feedback.worked_well} />
        ) : null}
        {feedback.unclear ? (
          <FbRow label="What was unclear" value={feedback.unclear} />
        ) : null}
        {feedback.missing ? (
          <FbRow label="What was missing" value={feedback.missing} />
        ) : null}
        {feedback.improved_outline ? (
          <FbRow label="Improved outline" value={feedback.improved_outline} />
        ) : null}
        {feedback.example_answer ? (
          <FbRow
            label="Example answer (your facts only)"
            value={feedback.example_answer}
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            No example answer generated — add the missing facts and it can be
            drafted from your own experience.
          </p>
        )}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        Don&apos;t memorize this word for word — use it to tell your own story
        more clearly.
      </p>
    </div>
  );
}

function FbRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={highlight ? "rounded-md bg-primary/10 p-2" : undefined}>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

// Qualitative word + tone for the derived overall average (not an invented score).
function overallTone(score: number): { label: string; className: string } {
  if (score >= 4.3)
    return { label: "Strong", className: "bg-success/15 text-success" };
  if (score >= 3.5)
    return { label: "Solid", className: "bg-success/15 text-success" };
  if (score >= 2.5)
    return { label: "Developing", className: "bg-warning/10 text-warning" };
  return {
    label: "Needs work",
    className: "bg-muted-foreground/15 text-muted-foreground",
  };
}

// Encode each rubric score by color instead of a uniform yellow.
function barColor(score: number): string {
  if (score >= 4) return "bg-success";
  if (score >= 3) return "bg-primary";
  return "bg-muted-foreground/30";
}
