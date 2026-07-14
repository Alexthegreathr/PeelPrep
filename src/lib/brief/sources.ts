import "server-only";

import { createHash } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SourceBlock } from "@/lib/ai/context";

/** Load an interview's grounding sources as context blocks + a fingerprint. */
export async function loadSourceBlocks(interviewId: string): Promise<{
  blocks: SourceBlock[];
  fingerprint: string;
  validIds: Set<string>;
}> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("interview_sources")
    .select("id, kind, title, content")
    .eq("interview_id", interviewId)
    .order("created_at", { ascending: true });
  const rows = data ?? [];

  const blocks: SourceBlock[] = rows
    .filter((r) => r.content && r.content.trim())
    .map((r) => ({
      sourceId: r.id,
      kind: r.kind,
      title: r.title,
      content: r.content as string,
    }));

  const fingerprint = createHash("sha256")
    .update(rows.map((r) => `${r.id}:${r.content ?? ""}`).join("|"))
    .digest("hex")
    .slice(0, 32);

  return {
    blocks,
    fingerprint,
    validIds: new Set(blocks.map((b) => b.sourceId)),
  };
}
