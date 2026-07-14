import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runMeteredGeneration } from "@/lib/ai/generation";
import { questionGenerationSchema } from "@/lib/ai/schemas";
import { buildContextInput } from "@/lib/ai/context";
import { loadSourceBlocks } from "@/lib/brief/sources";
import { planForUser } from "@/lib/billing/resolve";
import { featureLimit } from "@/lib/usage/features";

export type QuestionGenResult =
  { ok: true; count: number } | { ok: false; code: string; message: string };

/**
 * Generate predicted questions (metered by count — questions_generate). A batch
 * is reserved before the model call; free plans get their whole allowance in
 * one batch (5), so a second attempt hits the limit → upgrade dialog.
 */
export async function generateQuestions(
  interviewId: string,
  userId: string,
): Promise<QuestionGenResult> {
  const { subscription, entitlements } = await planForUser(userId);
  const limit = featureLimit(entitlements.key, "questions_generate");
  const batch = Math.min(8, limit);
  if (batch <= 0) {
    return {
      ok: false,
      code: "limit_exceeded",
      message: "You've reached your plan's predicted-questions limit.",
    };
  }

  const { blocks } = await loadSourceBlocks(interviewId);
  const { input } = buildContextInput(blocks);

  const result = await runMeteredGeneration({
    userId,
    interviewId,
    task: "question_generation",
    feature: "questions_generate",
    quantity: batch,
    input,
    schema: questionGenerationSchema,
    subscription,
  });
  if (!result.ok)
    return { ok: false, code: result.code, message: result.message };

  const admin = createSupabaseAdminClient();
  const { data: last } = await admin
    .from("questions")
    .select("sort_order")
    .eq("interview_id", interviewId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const base = (last?.sort_order ?? -1) + 1;

  const questions = result.data.questions.slice(0, batch);
  const rows = questions.map((q, i) => ({
    user_id: userId,
    interview_id: interviewId,
    category: q.category,
    text: q.text,
    why_asked: q.why_asked || null,
    evaluates: q.evaluates || null,
    suggested_structure: q.suggested_structure || null,
    origin: "predicted" as const,
    ai_generation_id: result.generationId,
    sort_order: base + i,
  }));
  if (rows.length) await admin.from("questions").insert(rows);
  return { ok: true, count: rows.length };
}
