import "server-only";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CandidateDocumentRow } from "@/lib/data/types";

/** The caller's document library, newest first (RLS-scoped). */
export async function listDocuments(): Promise<CandidateDocumentRow[]> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("candidate_documents")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** A single owned document, or null (RLS + explicit owner filter). */
export async function getDocument(
  id: string,
): Promise<CandidateDocumentRow | null> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("candidate_documents")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  return data;
}
