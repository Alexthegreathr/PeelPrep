import "server-only";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Read the Peel Brief with its sections and each section's grounding sources
 * (for the "source" chips). RLS-scoped — the caller only ever sees their own.
 */
export type BriefSectionSource = {
  id: string;
  interview_source_id: string | null;
  saved_source_id: string | null;
  interview_sources: { title: string; url: string | null; kind: string } | null;
  saved_sources: {
    title: string;
    url: string | null;
    publisher: string | null;
  } | null;
};

export type BriefSection = {
  id: string;
  section_key: string;
  status: string;
  content: Record<string, unknown> | null;
  generated_at: string | null;
  user_notes: string | null;
  completed_at: string | null;
  sort_order: number;
  ai_generation_id: string | null;
  brief_section_sources: BriefSectionSource[];
};

export type BriefData = {
  brief: {
    id: string;
    status: string;
    depth: string;
    generated_at: string | null;
    inputs_fingerprint: string | null;
  };
  sections: BriefSection[];
  fingerprintStale: boolean;
};

export async function getBriefData(
  interviewId: string,
  currentFingerprint?: string,
): Promise<BriefData | null> {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: brief } = await supabase
    .from("peel_briefs")
    .select("id, status, depth, generated_at, inputs_fingerprint")
    .eq("interview_id", interviewId)
    .maybeSingle();
  if (!brief) return null;

  const { data: sections } = await supabase
    .from("brief_sections")
    .select(
      "id, section_key, status, content, generated_at, user_notes, completed_at, sort_order, ai_generation_id, brief_section_sources(id, interview_source_id, saved_source_id, interview_sources(title, url, kind), saved_sources(title, url, publisher))",
    )
    .eq("brief_id", brief.id)
    .order("sort_order", { ascending: true });

  return {
    brief,
    sections: (sections ?? []) as unknown as BriefSection[],
    fingerprintStale:
      Boolean(brief.generated_at) &&
      Boolean(currentFingerprint) &&
      brief.inputs_fingerprint !== currentFingerprint,
  };
}
