import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getSessionData } from "@/lib/data/practice";
import { PageHeader } from "@/components/app/page-header";
import { PracticeChat } from "@/components/practice/practice-chat";
import { AnswerFeedback } from "@/components/practice/answer-feedback";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Practice session" };

export default async function SessionPage(
  props: PageProps<"/interviews/[id]/practice/[sessionId]">,
) {
  const { id, sessionId } = await props.params;
  const data = await getSessionData(sessionId);
  if (!data) notFound();

  const { session, turns, answers } = data;
  const answerByTurn = new Map(answers.map((a) => [a.turn_id, a]));
  const inProgress = session.status === "in_progress";

  return (
    <div>
      <PageHeader
        title={inProgress ? "Practice in progress" : "Session review"}
        description="Typed mock interview"
        action={
          <Button asChild variant="ghost" size="sm">
            <Link href={`/interviews/${id}/practice`}>
              <ArrowLeft aria-hidden="true" /> All sessions
            </Link>
          </Button>
        }
      />

      {inProgress ? (
        <PracticeChat interviewId={id} sessionId={sessionId} turns={turns} />
      ) : (
        <div className="flex flex-col gap-4">
          {session.summary_feedback ? (
            <Alert>
              <AlertDescription>
                <p>
                  You answered{" "}
                  {String(
                    (session.summary_feedback as { answered?: number })
                      .answered ?? 0,
                  )}{" "}
                  question(s). Request feedback on any answer below.{" "}
                  {String(
                    (session.summary_feedback as { note?: string }).note ?? "",
                  )}
                </p>
              </AlertDescription>
            </Alert>
          ) : null}

          <ol className="flex flex-col gap-4">
            {turns.map((turn) => {
              const answer =
                turn.role === "candidate" && turn.turn_type === "answer"
                  ? answerByTurn.get(turn.id)
                  : undefined;
              return (
                <li
                  key={turn.id}
                  className={
                    turn.role === "interviewer"
                      ? "rounded-xl bg-secondary/60 p-4"
                      : "rounded-xl border p-4"
                  }
                >
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {turn.role === "interviewer" ? "Interviewer" : "You"}
                  </p>
                  <p className="whitespace-pre-wrap text-sm">{turn.content}</p>
                  {answer ? (
                    <AnswerFeedback
                      interviewId={id}
                      sessionId={sessionId}
                      answer={answer}
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
