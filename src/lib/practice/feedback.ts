import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
import { runMeteredGeneration } from "@/lib/ai/generation";
import { answerEvaluationSchema } from "@/lib/ai/schemas";
import { buildContextInput } from "@/lib/ai/context";
import { loadSourceBlocks } from "@/lib/brief/sources";
import { planForUser } from "@/lib/billing/resolve";

/**
 * Structured answer feedback (answer_evaluation, metered answer_feedback). The
 * rubric describes observable qualities of the answer as given — never a
 * psychological judgment about the person. Example answers are built only from
 * supplied facts; missing facts set insufficient_facts and leave it null.
 */
export type FeedbackResult =
  { ok: true } | { ok: false; code: string; message: string };

export async function requestAnswerFeedback(
  answerId: string,
  userId: string,
): Promise<FeedbackResult> {
  const admin = createSupabaseAdminClient();
  const { data: answer } = await admin
    .from("answers")
    .select("id, text, session_id, turn_id")
    .eq("id", answerId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!answer || !answer.session_id) {
    return { ok: false, code: "error", message: "Answer not found." };
  }

  const { data: session } = await admin
    .from("practice_sessions")
    .select("interview_id")
    .eq("id", answer.session_id)
    .single();
  if (!session)
    return { ok: false, code: "error", message: "Session not found." };

  // The question this answer responds to = the interviewer turn just before it.
  let question = "the interview question";
  if (answer.turn_id) {
    const { data: cand } = await admin
      .from("practice_turns")
      .select("turn_index")
      .eq("id", answer.turn_id)
      .single();
    if (cand) {
      const { data: q } = await admin
        .from("practice_turns")
        .select("content")
        .eq("session_id", answer.session_id)
        .eq("role", "interviewer")
        .lt("turn_index", cand.turn_index)
        .order("turn_index", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (q?.content) question = q.content;
    }
  }

  await admin
    .from("answers")
    .update({ feedback_status: "pending" })
    .eq("id", answerId);

  const { subscription } = await planForUser(userId);
  const { blocks } = await loadSourceBlocks(session.interview_id);
  const instruction = `Interview question: ${question}\n\nCandidate's answer:\n${answer.text}\n\nEvaluate this answer.`;
  const { input } = buildContextInput(blocks, instruction);

  const result = await runMeteredGeneration({
    userId,
    interviewId: session.interview_id,
    task: "answer_evaluation",
    feature: "answer_feedback",
    input,
    schema: answerEvaluationSchema,
    subscription,
  });

  if (!result.ok) {
    await admin
      .from("answers")
      .update({ feedback_status: "failed" })
      .eq("id", answerId);
    return { ok: false, code: result.code, message: result.message };
  }

  const fb = result.data;
  await admin.from("feedback").upsert(
    {
      user_id: userId,
      answer_id: answerId,
      rubric: fb.rubric as unknown as Json,
      worked_well: fb.worked_well || null,
      unclear: fb.unclear || null,
      missing: fb.missing || null,
      top_improvement: fb.top_improvement,
      improved_outline: fb.improved_outline,
      example_answer: fb.insufficient_facts ? null : fb.example_answer,
      ai_generation_id: result.generationId,
    },
    { onConflict: "answer_id" },
  );
  await admin
    .from("answers")
    .update({ feedback_status: "ready" })
    .eq("id", answerId);
  return { ok: true };
}
