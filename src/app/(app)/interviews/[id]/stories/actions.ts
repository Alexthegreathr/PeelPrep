"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getInterview } from "@/lib/data/interviews";
import { getStory } from "@/lib/data/stories";
import { checkUserRateLimit } from "@/lib/security/rate-limit";
import { requestStorySuggestions } from "@/lib/stories/suggest";
import { storyFormSchema } from "@/lib/validation/story";

export type StoryActionResult =
  | { ok: true; id?: string; drafts?: number }
  | {
      ok: false;
      code?: string;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

function revalidate(interviewId?: string) {
  if (interviewId) revalidatePath(`/interviews/${interviewId}/stories`);
}

function toColumns(data: ReturnType<typeof storyFormSchema.parse>) {
  return {
    title: data.title,
    situation: data.situation ?? null,
    task: data.task ?? null,
    action: data.action ?? null,
    result: data.result ?? null,
    skills: data.skills,
    measurable_result: data.measurableResult ?? null,
    resume_reference: data.resumeReference ?? null,
    answers_questions: data.answersQuestions ?? null,
    tags: data.tags,
  };
}

export async function createStory(
  input: unknown,
  interviewId?: string,
): Promise<StoryActionResult> {
  const user = await requireUser();
  const parsed = storyFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the form.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stories")
    .insert({
      user_id: user.id,
      origin: "user_created",
      ...toColumns(parsed.data),
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: "Couldn't save the story." };
  revalidate(interviewId);
  return { ok: true, id: data.id };
}

export async function updateStory(
  storyId: string,
  input: unknown,
  interviewId?: string,
): Promise<StoryActionResult> {
  const user = await requireUser();
  const parsed = storyFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the form.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const supabase = await createSupabaseServerClient();
  // Editing an AI draft promotes it to a user-owned story.
  const { error } = await supabase
    .from("stories")
    .update({ ...toColumns(parsed.data), origin: "user_created" })
    .eq("id", storyId)
    .eq("user_id", user.id);
  if (error) return { ok: false, message: "Couldn't save your changes." };
  revalidate(interviewId);
  return { ok: true, id: storyId };
}

export async function deleteStory(
  storyId: string,
  interviewId?: string,
): Promise<StoryActionResult> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("stories")
    .delete()
    .eq("id", storyId)
    .eq("user_id", user.id);
  if (error) return { ok: false, message: "Couldn't delete the story." };
  revalidate(interviewId);
  return { ok: true };
}

export async function requestStorySuggestionsAction(
  interviewId: string,
): Promise<StoryActionResult> {
  const user = await requireUser();
  const interview = await getInterview(interviewId);
  if (!interview) return { ok: false, message: "Interview not found." };
  if (!(await checkUserRateLimit(user.id, "ai_generate"))) {
    return { ok: false, message: "Too many requests. Please slow down." };
  }
  const result = await requestStorySuggestions(interviewId, user.id);
  if (!result.ok) return result;
  revalidate(interviewId);
  return { ok: true, drafts: result.drafts };
}

/** Ensure a story is owned before linking (used by the questions page). */
export async function assertStoryOwned(storyId: string): Promise<boolean> {
  return Boolean(await getStory(storyId));
}
