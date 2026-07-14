"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";

import {
  submitPracticeTurn,
  endPracticeSessionAction,
} from "@/app/(app)/interviews/[id]/practice/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { PracticeTurnRow } from "@/lib/data/practice";

export function PracticeChat({
  interviewId,
  sessionId,
  turns,
}: {
  interviewId: string;
  sessionId: string;
  turns: PracticeTurnRow[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const last = turns[turns.length - 1];
  const awaitingAnswer = last?.role === "interviewer";

  function submit() {
    const value = text.trim();
    if (!value) return;
    setError(null);
    startTransition(async () => {
      const res = await submitPracticeTurn(interviewId, sessionId, value);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setText("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4">
        {turns.map((turn) => (
          <li
            key={turn.id}
            className={
              turn.role === "interviewer"
                ? "max-w-2xl rounded-2xl rounded-tl-sm bg-secondary px-4 py-3"
                : "max-w-2xl self-end rounded-2xl rounded-tr-sm bg-primary/15 px-4 py-3"
            }
          >
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {turn.role === "interviewer" ? "Interviewer" : "You"}
            </p>
            <p className="whitespace-pre-wrap text-sm">{turn.content}</p>
          </li>
        ))}
        {pending ? (
          <li className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            The interviewer is responding…
          </li>
        ) : null}
      </ol>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{error}</p>
          </AlertDescription>
        </Alert>
      ) : null}

      {awaitingAnswer ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="answer" className="sr-only">
            Your answer
          </label>
          <Textarea
            id="answer"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              last?.turn_type === "wrapup"
                ? "Ask your questions for the interviewer…"
                : "Type your answer…"
            }
            rows={5}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Feedback comes at the end — focus on answering naturally. ⌘/Ctrl +
              Enter to send.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await endPracticeSessionAction(interviewId, sessionId);
                    router.refresh();
                  })
                }
              >
                End session
              </Button>
              <Button
                type="button"
                onClick={submit}
                disabled={pending || !text.trim()}
              >
                {pending ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Send aria-hidden="true" />
                )}
                Send
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
