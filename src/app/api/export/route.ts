import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { verifySession } from "@/lib/auth/dal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkUserRateLimit } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/lib/audit";

/**
 * Full data export (SECURITY.md §10): assembles a JSON archive of the user's
 * rows + signed links for their files, stores it in the private exports bucket
 * (7-day expiry via cleanup), and returns a short-lived signed URL. Rate-limited
 * to 1/day; audit-logged.
 */
const OWNED_TABLES = [
  "profiles",
  "subscriptions",
  "user_consents",
  "interviews",
  "interviewers",
  "interview_sources",
  "interview_documents",
  "candidate_documents",
  "stories",
  "questions",
  "question_story_links",
  "peel_briefs",
  "brief_sections",
  "practice_sessions",
  "practice_turns",
  "answers",
  "feedback",
  "generation_feedback",
  "checklists",
  "checklist_items",
  "readiness_scores",
  "readiness_components",
  "outcomes",
  "usage_events",
] as const;

export async function POST() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  if (!(await checkUserRateLimit(userId, "export"))) {
    return NextResponse.json(
      { error: "You can export once per day. Try again later." },
      { status: 429 },
    );
  }

  const admin = createSupabaseAdminClient();
  // Dynamic table/column loop → use an untyped view (data is JSON-serialized).
  const db = admin as unknown as SupabaseClient;
  const idColumn = (t: string) => (t === "profiles" ? "id" : "user_id");

  const archive: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    user_email: session.user.email,
  };
  for (const table of OWNED_TABLES) {
    const { data } = await db
      .from(table)
      .select("*")
      .eq(idColumn(table), userId);
    archive[table] = data ?? [];
  }

  // Signed links for the user's uploaded files.
  const { data: docs } = await admin
    .from("candidate_documents")
    .select("id, title, storage_path")
    .eq("user_id", userId);
  const fileLinks: { id: string; title: string; url: string | null }[] = [];
  for (const doc of docs ?? []) {
    const { data: signed } = await admin.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 7 * 24 * 60 * 60);
    fileLinks.push({
      id: doc.id,
      title: doc.title,
      url: signed?.signedUrl ?? null,
    });
  }
  archive.document_files = fileLinks;

  const path = `${userId}/peelprep-export-${Date.now()}.json`;
  const upload = await admin.storage
    .from("exports")
    .upload(path, JSON.stringify(archive, null, 2), {
      contentType: "application/json",
      upsert: true,
    });
  if (upload.error) {
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
  const { data: signed } = await admin.storage
    .from("exports")
    .createSignedUrl(path, 7 * 24 * 60 * 60);

  await writeAuditLog({
    userId,
    action: "export.requested",
    resourceType: "export",
    metadata: { tables: OWNED_TABLES.length, files: fileLinks.length },
  });

  return NextResponse.json({ url: signed?.signedUrl ?? null });
}
