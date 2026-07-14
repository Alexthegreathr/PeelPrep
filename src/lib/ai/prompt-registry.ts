import "server-only";

import { createHash } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPrompt } from "@/lib/ai/prompts";
import type { AiTask } from "@/lib/ai/tasks";

/** sha256 of the resolved system prompt — traces every artifact to its prompt. */
export function promptContentHash(system: string): string {
  return createHash("sha256").update(system).digest("hex");
}

export type ResolvedPromptVersion = {
  id: string;
  version: string;
  system: string;
  contentHash: string;
};

/** Idempotently upsert (task, version, content_hash) and return its row id. */
export async function upsertPromptVersion(
  task: AiTask,
): Promise<ResolvedPromptVersion> {
  const { version, system } = getPrompt(task);
  const contentHash = promptContentHash(system);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("upsert_prompt_version", {
    p_task: task,
    p_version: version,
    p_content_hash: contentHash,
  });
  if (error || !data) {
    throw new Error(`upsert_prompt_version failed: ${error?.message}`);
  }
  return { id: data as string, version, system, contentHash };
}
