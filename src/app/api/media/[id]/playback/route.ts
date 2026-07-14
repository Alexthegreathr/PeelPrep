import { NextResponse, type NextRequest } from "next/server";

import { verifySession } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";

/**
 * 60 s signed playback URL for a saved recording the caller owns (ROUTES.md §4).
 * Ownership re-checked via the RLS client; audit-logged. Deleted recordings 404.
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
  const supabase = await createSupabaseServerClient();
  const { data: media } = await supabase
    .from("media_assets")
    .select("storage_path, deleted_at, retention")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (!media || media.deleted_at || media.retention !== "saved") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = (
    await import("@/lib/supabase/admin")
  ).createSupabaseAdminClient();
  const { data: signed, error } = await admin.storage
    .from("media")
    .createSignedUrl(media.storage_path, 60);
  if (error || !signed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await writeAuditLog({
    userId: session.user.id,
    action: "media.playback_url_issued",
    resourceType: "media_asset",
    resourceId: id,
  });
  return NextResponse.redirect(signed.signedUrl);
}
