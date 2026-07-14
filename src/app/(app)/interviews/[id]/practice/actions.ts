"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/dal";
import { getInterview } from "@/lib/data/interviews";
import { checkUserRateLimit } from "@/lib/security/rate-limit";
import {
  startSession,
  submitTurn,
  endSession,
  abandonSession,
} from "@/lib/practice/session";
import { requestAnswerFeedback } from "@/lib/practice/feedback";
import {
  practiceConfigSchema,
  answerSubmitSchema,
} from "@/lib/validation/practice";

export type PracticeResult =
  { ok: true; done?: boolean } | { ok: false; code?: string; message: string };

export async function startPracticeSession(
  interviewId: string,
  rawConfig: unknown,
): Promise<PracticeResult> {
  const user = await requireUser();
  const interview = await getInterview(interviewId);
  if (!interview) return { ok: false, message: "Interview not found." };

  const parsed = practiceConfigSchema.safeParse(rawConfig);
  if (!parsed.success) {
    return { ok: false, message: "Check your session settings." };
  }
  const result = await startSession(interviewId, user.id, parsed.data);
  if (!result.ok) return result;
  redirect(`/interviews/${interviewId}/practice/${result.sessionId}`);
}

export async function submitPracticeTurn(
  interviewId: string,
  sessionId: string,
  rawText: unknown,
): Promise<PracticeResult> {
  const user = await requireUser();
  const parsed = answerSubmitSchema.safeParse({ text: rawText });
  if (!parsed.success) {
    return { ok: false, message: "Type your answer before submitting." };
  }
  if (!(await checkUserRateLimit(user.id, "ai_generate"))) {
    return { ok: false, message: "Slow down a moment and try again." };
  }
  const result = await submitTurn(sessionId, user.id, parsed.data.text);
  if (!result.ok) return result;
  revalidatePath(`/interviews/${interviewId}/practice/${sessionId}`);
  return { ok: true, done: result.done };
}

export async function requestFeedbackAction(
  interviewId: string,
  sessionId: string,
  answerId: string,
): Promise<PracticeResult> {
  const user = await requireUser();
  if (!(await checkUserRateLimit(user.id, "ai_generate"))) {
    return { ok: false, message: "Slow down a moment and try again." };
  }
  const result = await requestAnswerFeedback(answerId, user.id);
  if (!result.ok) return result;
  revalidatePath(`/interviews/${interviewId}/practice/${sessionId}`);
  return { ok: true };
}

export async function endPracticeSessionAction(
  interviewId: string,
  sessionId: string,
): Promise<void> {
  const user = await requireUser();
  await endSession(sessionId, user.id);
  revalidatePath(`/interviews/${interviewId}/practice/${sessionId}`);
}

export async function abandonPracticeSessionAction(
  interviewId: string,
  sessionId: string,
): Promise<void> {
  const user = await requireUser();
  await abandonSession(sessionId, user.id);
  redirect(`/interviews/${interviewId}/practice`);
}
