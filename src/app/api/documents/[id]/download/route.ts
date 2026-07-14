import { NextResponse, type NextRequest } from "next/server";

import { verifySession } from "@/lib/auth/dal";
import { getDocument } from "@/lib/data/documents";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";

/**
 * Issue a short-lived (60 s) signed URL for a document the caller owns and
 * 302-redirect to it (SECURITY.md §5). Storage paths are never exposed in HTML;
 * ownership is re-checked server-side even though storage RLS also applies.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const doc = await getDocument(id);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.storage_path, 60);
  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await writeAuditLog({
    userId: session.user.id,
    action: "document.download",
    resourceType: "candidate_document",
    resourceId: id,
  });

  return NextResponse.redirect(data.signedUrl);
}
