import "server-only";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PracticeSessionRow = {
  id: string;
  interview_id: string;
  status: string;
  config: Record<string, unknown>;
  summary_feedback: Record<string, unknown> | null;
  started_at: string;
  completed_at: string | null;
};

export type PracticeTurnRow = {
  id: string;
  turn_index: number;
  role: string;
  turn_type: string;
  content: string;
};

export type FeedbackRow = {
  id: string;
  rubric: Record<string, { score: number; comment: string }>;
  worked_well: string | null;
  unclear: string | null;
  missing: string | null;
  top_improvement: string;
  improved_outline: string | null;
  example_answer: string | null;
};

export type AnswerRow = {
  id: string;
  turn_id: string | null;
  text: string;
  feedback_status: string;
  feedback: FeedbackRow[] | null;
};

export async function listSessions(
  interviewId: string,
): Promise<PracticeSessionRow[]> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("practice_sessions")
    .select(
      "id, interview_id, status, config, summary_feedback, started_at, completed_at",
    )
    .eq("interview_id", interviewId)
    .order("started_at", { ascending: false });
  return (data ?? []) as unknown as PracticeSessionRow[];
}

export type SessionData = {
  session: PracticeSessionRow;
  turns: PracticeTurnRow[];
  answers: AnswerRow[];
};

export async function getSessionData(
  sessionId: string,
): Promise<SessionData | null> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: session } = await supabase
    .from("practice_sessions")
    .select(
      "id, interview_id, status, config, summary_feedback, started_at, completed_at",
    )
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) return null;

  const [{ data: turns }, { data: answers }] = await Promise.all([
    supabase
      .from("practice_turns")
      .select("id, turn_index, role, turn_type, content")
      .eq("session_id", sessionId)
      .order("turn_index", { ascending: true }),
    supabase
      .from("answers")
      .select(
        "id, turn_id, text, feedback_status, feedback(id, rubric, worked_well, unclear, missing, top_improvement, improved_outline, example_answer)",
      )
      .eq("session_id", sessionId),
  ]);

  // A unique FK makes PostgREST embed `feedback` as a single object; normalize
  // it to an array so the UI can read answer.feedback[0] consistently.
  const normalizedAnswers = (
    (answers ?? []) as unknown as (Omit<AnswerRow, "feedback"> & {
      feedback: FeedbackRow | FeedbackRow[] | null;
    })[]
  ).map((a) => ({
    ...a,
    feedback: Array.isArray(a.feedback)
      ? a.feedback
      : a.feedback
        ? [a.feedback]
        : null,
  }));

  return {
    session: session as unknown as PracticeSessionRow,
    turns: (turns ?? []) as PracticeTurnRow[],
    answers: normalizedAnswers as AnswerRow[],
  };
}
