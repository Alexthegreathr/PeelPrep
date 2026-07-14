"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getInterview } from "@/lib/data/interviews";
import { getStory } from "@/lib/data/stories";
import { checkUserRateLimit } from "@/lib/security/rate-limit";
import { generateQuestions } from "@/lib/questions/generate";
import { questionFormSchema } from "@/lib/validation/story";

export type QuestionActionResult =
  { ok: true; count?: number } | { ok: false; code?: string; message: string };

export async function generateQuestionsAction(
  interviewId: string,
): Promise<QuestionActionResult> {
  const user = await requireUser();
  const interview = await getInterview(interviewId);
  if (!interview) return { ok: false, message: "Interview not found." };
  if (!(await checkUserRateLimit(user.id, "ai_generate"))) {
    return { ok: false, message: "Too many requests. Please slow down." };
  }
  const result = await generateQuestions(interviewId, user.id);
  if (!result.ok) return result;
  revalidatePath(`/interviews/${interviewId}/questions`);
  return { ok: true, count: result.count };
}

export async function toggleSaveQuestion(
  interviewId: string,
  questionId: string,
  saved: boolean,
): Promise<void> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("questions")
    .update({ saved })
    .eq("id", questionId)
    .eq("user_id", user.id);
  revalidatePath(`/interviews/${interviewId}/questions`);
}

export async function addQuestion(
  interviewId: string,
  input: { category: string; text: string },
): Promise<QuestionActionResult> {
  const user = await requireUser();
  const interview = await getInterview(interviewId);
  if (!interview) return { ok: false, message: "Interview not found." };

  const parsed = questionFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.flatten().fieldErrors.text?.[0] ?? "Add a valid question.",
    };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("questions").insert({
    user_id: user.id,
    interview_id: interviewId,
    category: parsed.data.category,
    text: parsed.data.text,
    origin: "user_added",
    saved: true,
  });
  if (error) return { ok: false, message: "Couldn't add the question." };
  revalidatePath(`/interviews/${interviewId}/questions`);
  return { ok: true };
}

export async function linkStory(
  interviewId: string,
  questionId: string,
  storyId: string,
): Promise<void> {
  const user = await requireUser();
  const story = await getStory(storyId);
  if (!story) return; // not owned → no-op
  const supabase = await createSupabaseServerClient();
  await supabase.from("question_story_links").upsert(
    {
      user_id: user.id,
      question_id: questionId,
      story_id: storyId,
      source: "user_linked",
    },
    { onConflict: "question_id,story_id", ignoreDuplicates: true },
  );
  revalidatePath(`/interviews/${interviewId}/questions`);
}

export async function unlinkStory(
  interviewId: string,
  questionId: string,
  storyId: string,
): Promise<void> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("question_story_links")
    .delete()
    .eq("question_id", questionId)
    .eq("story_id", storyId)
    .eq("user_id", user.id);
  revalidatePath(`/interviews/${interviewId}/questions`);
}
