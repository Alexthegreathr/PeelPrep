import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runMeteredGeneration } from "@/lib/ai/generation";
import { mockInterviewTurnSchema } from "@/lib/ai/schemas";
import { buildContextInput } from "@/lib/ai/context";
import { loadSourceBlocks } from "@/lib/brief/sources";
import { planForUser } from "@/lib/billing/resolve";
import { featureLimit, usagePeriod } from "@/lib/usage/features";
import { reserveUsage, settleUsage } from "@/lib/usage/ledger";
import type { SubscriptionRow } from "@/lib/data/types";
import type { PracticeConfigInput } from "@/lib/validation/practice";

/**
 * Typed mock-interview engine (PRODUCT_SPEC §AI Mock Interview): one question at
 * a time, wait for the answer, no feedback until the session ends, closing with
 * an opportunity for the candidate's own questions. Interruptible/resumable via
 * persisted turns. The provider is prompt-contracted to avoid discriminatory or
 * illegal questions.
 */
const HARD_MAX_QUESTIONS = 15;

/** Free plan = one SHORT session (≤5 questions). */
function effectiveLength(planKey: string, requested: number): number {
  const cap = planKey === "free" ? 5 : HARD_MAX_QUESTIONS;
  return Math.min(Math.max(requested, 1), cap);
}

type TurnRow = {
  id: string;
  turn_index: number;
  role: string;
  turn_type: string;
  content: string;
};

async function transcript(sessionId: string): Promise<TurnRow[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("practice_turns")
    .select("id, turn_index, role, turn_type, content")
    .eq("session_id", sessionId)
    .order("turn_index", { ascending: true });
  return data ?? [];
}

function transcriptText(turns: TurnRow[]): string {
  return turns
    .map(
      (t) =>
        `${t.role === "interviewer" ? "Interviewer" : "Candidate"}: ${t.content}`,
    )
    .join("\n");
}

/** Generate and persist the next interviewer question via the AI provider. */
async function askQuestion(
  sessionId: string,
  interviewId: string,
  userId: string,
  subscription: SubscriptionRow | null,
  config: PracticeConfigInput,
  turnIndex: number,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { blocks } = await loadSourceBlocks(interviewId);
  const turns = await transcript(sessionId);
  const instruction = `Session config: ${JSON.stringify({
    difficulty: config.difficulty,
    categories: config.categories,
    stage: config.stage,
    interviewer_style: config.interviewerStyle,
    focus: config.focusWeaknesses,
  })}\n\nTranscript so far:\n${transcriptText(turns) || "(none)"}\n\nAsk the next single interview question.`;
  const { input } = buildContextInput(blocks, instruction);

  const result = await runMeteredGeneration({
    userId,
    interviewId,
    task: "mock_interview_turn",
    feature: "practice_turn",
    input,
    schema: mockInterviewTurnSchema,
    subscription,
  });

  const content = result.ok
    ? result.data.content
    : "Tell me about a challenge you faced in a recent project and how you handled it.";

  await admin.from("practice_turns").insert({
    user_id: userId,
    session_id: sessionId,
    turn_index: turnIndex,
    role: "interviewer",
    turn_type: "question",
    content,
    ai_generation_id: result.ok ? result.generationId : null,
  });
}

async function appendWrapup(
  sessionId: string,
  userId: string,
  turnIndex: number,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from("practice_turns").insert({
    user_id: userId,
    session_id: sessionId,
    turn_index: turnIndex,
    role: "interviewer",
    turn_type: "wrapup",
    content:
      "That's the last of my questions. Thanks — before we wrap up, what questions do you have for me?",
  });
}

export type StartResult =
  | { ok: true; sessionId: string }
  | { ok: false; code: string; message: string };

export async function startSession(
  interviewId: string,
  userId: string,
  config: PracticeConfigInput,
): Promise<StartResult> {
  const { subscription, entitlements } = await planForUser(userId);
  const period = usagePeriod(subscription);
  const reservation = await reserveUsage({
    userId,
    feature: "practice_session",
    quantity: 1,
    limit: featureLimit(entitlements.key, "practice_session"),
    periodStart: period.start,
    periodEnd: period.end,
    interviewId,
  });
  if (!reservation.ok) {
    return {
      ok: false,
      code: reservation.reason,
      message:
        reservation.reason === "limit_exceeded"
          ? "You've reached your plan's practice-session limit."
          : "Couldn't start the session.",
    };
  }
  await settleUsage(reservation.eventId, "completed", { provider: "mock" });

  const length = effectiveLength(entitlements.key, config.length);
  const finalConfig = { ...config, length };

  const admin = createSupabaseAdminClient();
  const { data: session, error } = await admin
    .from("practice_sessions")
    .insert({
      user_id: userId,
      interview_id: interviewId,
      status: "in_progress",
      config: finalConfig,
      modality: "text",
    })
    .select("id")
    .single();
  if (error || !session) {
    return { ok: false, code: "error", message: "Couldn't start the session." };
  }

  await askQuestion(
    session.id,
    interviewId,
    userId,
    subscription,
    finalConfig,
    0,
  );
  return { ok: true, sessionId: session.id };
}

export type SubmitResult =
  { ok: true; done: boolean } | { ok: false; message: string };

export async function submitTurn(
  sessionId: string,
  userId: string,
  answerText: string,
): Promise<SubmitResult> {
  const admin = createSupabaseAdminClient();
  const { data: session } = await admin
    .from("practice_sessions")
    .select("id, interview_id, status, config, user_id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!session) return { ok: false, message: "Session not found." };
  if (session.status !== "in_progress")
    return { ok: false, message: "This session has ended." };

  const config = session.config as unknown as PracticeConfigInput;
  const turns = await transcript(sessionId);
  const lastInterviewer = [...turns]
    .reverse()
    .find((t) => t.role === "interviewer");
  const nextIndex = turns.length;
  const answeringWrapup = lastInterviewer?.turn_type === "wrapup";

  // Persist the candidate turn.
  const { data: candidateTurn } = await admin
    .from("practice_turns")
    .insert({
      user_id: userId,
      session_id: sessionId,
      turn_index: nextIndex,
      role: "candidate",
      turn_type: answeringWrapup ? "candidate_question" : "answer",
      content: answerText,
    })
    .select("id")
    .single();

  if (answeringWrapup) {
    // Candidate asked their questions → the session is complete.
    await endSession(sessionId, userId);
    return { ok: true, done: true };
  }

  // Record the answer as a first-class row (feedback-metering target).
  await admin.from("answers").insert({
    user_id: userId,
    session_id: sessionId,
    turn_id: candidateTurn?.id ?? null,
    text: answerText,
  });

  const questionsAsked = turns.filter(
    (t) => t.role === "interviewer" && t.turn_type === "question",
  ).length;

  const { subscription } = await planForUser(userId);
  if (questionsAsked >= config.length) {
    await appendWrapup(sessionId, userId, nextIndex + 1);
  } else {
    await askQuestion(
      sessionId,
      session.interview_id,
      userId,
      subscription,
      config,
      nextIndex + 1,
    );
  }
  return { ok: true, done: false };
}

export async function endSession(
  sessionId: string,
  userId: string,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const turns = await transcript(sessionId);
  const answered = turns.filter(
    (t) => t.role === "candidate" && t.turn_type === "answer",
  ).length;
  const { count: withFeedback } = await admin
    .from("answers")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("feedback_status", "ready");

  await admin
    .from("practice_sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      summary_feedback: {
        answered,
        with_feedback: withFeedback ?? 0,
        note: "Review each answer for detailed feedback. Don't memorize answers word for word — practice telling your stories naturally.",
      },
    })
    .eq("id", sessionId)
    .eq("user_id", userId);
}

export async function abandonSession(
  sessionId: string,
  userId: string,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin
    .from("practice_sessions")
    .update({ status: "abandoned", completed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("status", "in_progress");
}
