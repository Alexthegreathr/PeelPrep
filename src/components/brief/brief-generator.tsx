"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BRIEF_STEPS } from "@/lib/brief/plan";

const TOTAL_STEPS = BRIEF_STEPS.length;

/**
 * Drives the resumable, one-section-per-request generation queue. Honest
 * progress comes from the server's remaining count, not a spinner.
 */
export function BriefGenerator({
  interviewId,
  autoStart = false,
  initialCompleted = 0,
}: {
  interviewId: string;
  autoStart?: boolean;
  initialCompleted?: number;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(initialCompleted);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(false);
  const startedRef = useRef(false);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    let guard = 0;
    let done = false;
    while (guard++ < TOTAL_STEPS + 5) {
      const res = await fetch(`/api/interviews/${interviewId}/brief/generate`, {
        method: "POST",
      });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 2500));
        continue;
      }
      if (!res.ok) {
        setError("Generation failed. Please try again.");
        break;
      }
      const data = (await res.json()) as {
        done: boolean;
        remaining: number;
        limitExceeded?: boolean;
        error?: string;
      };
      if (data.limitExceeded) {
        setLimit(true);
        setError(data.error ?? "Plan limit reached.");
        break;
      }
      setCompleted(TOTAL_STEPS - data.remaining);
      if (data.done) {
        done = true;
        break;
      }
    }
    setRunning(false);
    // Only refresh on success — a failed run must keep its error Alert visible
    // (reading `error` here would be a stale closure value anyway).
    if (done) router.refresh();
  }, [interviewId, router]);

  useEffect(() => {
    if (autoStart && !startedRef.current) {
      startedRef.current = true;
      void run();
    }
  }, [autoStart, run]);

  const pct = Math.min(100, Math.round((completed / TOTAL_STEPS) * 100));

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{error}</p>
            {limit ? (
              <p className="mt-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/billing">View plans</Link>
                </Button>
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {running ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Generating your Peel Brief… {completed}/{TOTAL_STEPS} sections
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : !autoStart ? (
        <div>
          <Button type="button" onClick={run} size="lg">
            <Sparkles aria-hidden="true" /> Generate Peel Brief
          </Button>
        </div>
      ) : null}
    </div>
  );
}
