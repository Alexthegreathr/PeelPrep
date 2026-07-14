import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runMeteredGeneration } from "@/lib/ai/generation";
import { storyRecommendationSchema } from "@/lib/ai/schemas";
import { buildContextInput } from "@/lib/ai/context";
import { loadSourceBlocks } from "@/lib/brief/sources";
import { planForUser } from "@/lib/billing/resolve";
import { featureLimit } from "@/lib/usage/features";

export type StorySuggestResult =
  { ok: true; drafts: number } | { ok: false; code: string; message: string };

/**
 * AI story suggestions (Plus+; story_suggest). Drafts are grounded ONLY in the
 * user's supplied facts — never invented — and any missing facts are surfaced
 * as an in-draft clarification request the user fills in. Free plans (limit 0)
 * get the manual story bank instead.
 */
export async function requestStorySuggestions(
  interviewId: string,
  userId: string,
): Promise<StorySuggestResult> {
  const { subscription, entitlements } = await planForUser(userId);
  if (featureLimit(entitlements.key, "story_suggest") <= 0) {
    return {
      ok: false,
      code: "limit_exceeded",
      message:
        "AI story suggestions are available on Plus and Pro. You can build stories manually on any plan.",
    };
  }

  const { blocks } = await loadSourceBlocks(interviewId);
  const { input } = buildContextInput(blocks);

  const result = await runMeteredGeneration({
    userId,
    interviewId,
    task: "story_recommendation",
    feature: "story_suggest",
    quantity: 1,
    input,
    schema: storyRecommendationSchema,
    subscription,
  });
  if (!result.ok)
    return { ok: false, code: result.code, message: result.message };

  const admin = createSupabaseAdminClient();
  const drafts = result.data.draft_suggestions;
  const rows = drafts.map((d) => {
    const clarify = d.missing_info_questions.length
      ? `\n\n[Needs your input] ${d.missing_info_questions.join(" · ")}`
      : "";
    return {
      user_id: userId,
      title: d.title,
      situation: (d.situation ?? "") + clarify || null,
      task: d.task,
      action: d.action,
      result: d.result,
      answers_questions: `Draft grounded on: ${d.based_on}`,
      origin: "ai_draft" as const,
      ai_generation_id: result.generationId,
    };
  });
  if (rows.length) await admin.from("stories").insert(rows);
  return { ok: true, drafts: rows.length };
}
