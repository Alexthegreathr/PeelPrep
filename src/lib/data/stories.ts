import "server-only";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { StoryRow } from "@/lib/data/types";

/** The user's whole story bank (user-level, reusable across interviews). */
export async function listStories(): Promise<StoryRow[]> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("stories")
    .select("*")
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function getStory(id: string): Promise<StoryRow | null> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("stories")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  return data;
}
