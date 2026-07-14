"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Play } from "lucide-react";

import { startPracticeSession } from "@/app/(app)/interviews/[id]/practice/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DIFFICULTIES, INTERVIEWER_STYLES } from "@/lib/validation/practice";
import { INTERVIEW_STAGES } from "@/lib/validation/interview";
import { STAGE_LABELS } from "@/lib/interviews/labels";

const SELECT =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm";

export function PracticeSetup({
  interviewId,
  isFree,
}: {
  interviewId: string;
  isFree: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(false);

  function submit(formData: FormData) {
    const config = {
      length: Number(formData.get("length") ?? 5),
      difficulty: String(formData.get("difficulty") ?? "medium"),
      interviewerStyle: String(formData.get("interviewerStyle") ?? "neutral"),
      stage: String(formData.get("stage") ?? ""),
      focusWeaknesses: String(formData.get("focusWeaknesses") ?? ""),
      categories: [],
    };
    setError(null);
    setLimit(false);
    startTransition(async () => {
      const res = await startPracticeSession(interviewId, config);
      // Success redirects; only the failure case returns here.
      if (res && !res.ok) {
        setLimit(res.code === "limit_exceeded");
        setError(res.message);
      }
    });
  }

  return (
    <form action={submit} className="flex max-w-xl flex-col gap-5">
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

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="length">Questions</Label>
          <Input
            id="length"
            name="length"
            type="number"
            min={1}
            max={isFree ? 5 : 15}
            defaultValue={isFree ? 3 : 5}
          />
          {isFree ? (
            <p className="text-xs text-muted-foreground">
              Free plan: short sessions up to 5 questions.
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="difficulty">Difficulty</Label>
          <select
            id="difficulty"
            name="difficulty"
            defaultValue="medium"
            className={SELECT}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d[0].toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="interviewerStyle">Interviewer style</Label>
          <select
            id="interviewerStyle"
            name="interviewerStyle"
            defaultValue="neutral"
            className={SELECT}
          >
            {INTERVIEWER_STYLES.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="stage">Stage (optional)</Label>
          <select id="stage" name="stage" defaultValue="" className={SELECT}>
            <option value="">Any</option>
            {INTERVIEW_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="focusWeaknesses">
          Weaknesses to focus on (optional)
        </Label>
        <Input
          id="focusWeaknesses"
          name="focusWeaknesses"
          placeholder="e.g. concise answers, system design"
          maxLength={500}
        />
      </div>

      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Play aria-hidden="true" />
          )}
          Start practice
        </Button>
      </div>
    </form>
  );
}
