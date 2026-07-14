import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";

import { verifySession } from "@/lib/auth/dal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getConsentState } from "@/lib/data/consent";
import { checkUserRateLimit } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/lib/audit";

/**
 * Signed upload URL for VDA media (ROUTES.md §4, SECURITY.md §13). Issued only
 * after consent + MIME/size/duration validation. `saved` recordings require
 * vda_recording + vda_media_upload; temp transcription audio also requires
 * vda_ai_analysis. Rate-limited. Magic bytes are re-checked on completion.
 */
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB
const MAX_DURATION = 190; // ~3 min
const ALLOWED = new Set([
  "video/webm",
  "video/mp4",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
]);

export async function POST(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  if (!(await checkUserRateLimit(userId, "ai_generate"))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    sessionId?: string;
    answerId?: string | null;
    mediaKind?: "audio" | "video";
    mimeType?: string;
    sizeBytes?: number;
    durationSeconds?: number;
    retention?: "saved" | "processing_only";
  };

  if (!body.sessionId || !body.mimeType || !body.mediaKind) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!ALLOWED.has(body.mimeType)) {
    return NextResponse.json(
      { error: "Unsupported media type" },
      { status: 400 },
    );
  }
  if ((body.sizeBytes ?? 0) > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 500 MB)" },
      { status: 400 },
    );
  }
  if ((body.durationSeconds ?? 0) > MAX_DURATION) {
    return NextResponse.json(
      { error: "Recording too long (max 3 min)" },
      { status: 400 },
    );
  }

  // Ownership of the session.
  const supabase = await createSupabaseServerClient();
  const { data: owned } = await supabase
    .from("practice_sessions")
    .select("id")
    .eq("id", body.sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Consent gating.
  const consent = await getConsentState();
  const retention = body.retention ?? "processing_only";
  if (!consent.vda_recording || !consent.vda_media_upload) {
    return NextResponse.json(
      { error: "Media consent required" },
      { status: 403 },
    );
  }
  if (retention === "processing_only" && !consent.vda_ai_analysis) {
    return NextResponse.json(
      { error: "Analysis consent required" },
      { status: 403 },
    );
  }

  const admin = createSupabaseAdminClient();
  const mediaAssetId = randomUUID();
  const ext = body.mediaKind === "video" ? "webm" : "webm";
  const path = `${userId}/${mediaAssetId}/recording.${ext}`;
  const now = new Date().toISOString();

  await admin.from("media_assets").insert({
    id: mediaAssetId,
    user_id: userId,
    session_id: body.sessionId,
    answer_id: body.answerId ?? null,
    media_kind: body.mediaKind,
    storage_path: path,
    mime_type: body.mimeType,
    size_bytes: body.sizeBytes ?? 0,
    duration_seconds: body.durationSeconds ?? null,
    retention,
    // processing_only media is hard-capped at 24h on failure.
    retention_expires_at:
      retention === "processing_only"
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null,
    recording_consent_at: now,
    upload_consent_at: now,
  });

  const { data: signed, error } = await admin.storage
    .from("media")
    .createSignedUploadUrl(path);
  if (error || !signed) {
    return NextResponse.json(
      { error: "Couldn't create upload URL" },
      { status: 500 },
    );
  }

  await writeAuditLog({
    userId,
    action: "media.upload",
    resourceType: "media_asset",
    resourceId: mediaAssetId,
    metadata: {
      kind: body.mediaKind,
      retention,
      size_bytes: body.sizeBytes ?? 0,
    },
  });

  return NextResponse.json({
    mediaAssetId,
    path,
    token: signed.token,
    url: signed.signedUrl,
  });
}
