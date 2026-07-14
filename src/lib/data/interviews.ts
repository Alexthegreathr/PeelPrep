import "server-only";

import { requireUser, verifySession } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  InterviewRow,
  InterviewerRow,
  InterviewDocumentRow,
} from "@/lib/data/types";

/** Statuses that count against the free-tier "active interview" limit. */
export const ACTIVE_INTERVIEW_STATUSES = ["draft", "preparing"] as const;

export async function listInterviews(): Promise<InterviewRow[]> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("interviews")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Upcoming interviews being prepared, soonest first (dashboard/history). */
export async function listUpcomingInterviews(): Promise<InterviewRow[]> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("interviews")
    .select("*")
    .in("status", ["draft", "preparing"])
    .order("interview_at", { ascending: true, nullsFirst: false });
  return data ?? [];
}

export async function getInterview(id: string): Promise<InterviewRow | null> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("interviews")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  return data;
}

export type InterviewDraft = {
  interview: InterviewRow;
  interviewers: InterviewerRow[];
  documents: InterviewDocumentRow[];
};

/** An interview plus its interviewers and linked documents (intake wizard). */
export async function getInterviewDraft(
  id: string,
): Promise<InterviewDraft | null> {
  const interview = await getInterview(id);
  if (!interview) return null;
  const supabase = await createSupabaseServerClient();
  const [{ data: interviewers }, { data: documents }] = await Promise.all([
    supabase
      .from("interviewers")
      .select("*")
      .eq("interview_id", id)
      .order("sort_order", { ascending: true }),
    supabase.from("interview_documents").select("*").eq("interview_id", id),
  ]);
  return {
    interview,
    interviewers: interviewers ?? [],
    documents: documents ?? [],
  };
}

/** Count active interviews (draft|preparing) for the free-tier gate. */
export async function countActiveInterviews(): Promise<number> {
  const session = await verifySession();
  if (!session) return 0;
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("interviews")
    .select("id", { count: "exact", head: true })
    .in("status", ["draft", "preparing"]);
  return count ?? 0;
}
