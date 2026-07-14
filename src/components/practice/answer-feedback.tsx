"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquareText, RotateCcw } from "lucide-react";

import { requestFeedbackAction } from "@/app/(app)/interviews/[id]/practice/actions";
import { Button } from "@/components/ui/button";
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
                className="block h-full bg-primary"
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
        <FbRow
          label="Top improvement"
          value={feedback.top_improvement}
          highlight
        />
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
