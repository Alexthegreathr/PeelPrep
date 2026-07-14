import { NextResponse, type NextRequest } from "next/server";

import { verifySession } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getConsentState } from "@/lib/data/consent";
import { getTranscriptionProvider } from "@/lib/vda/transcription";
import { checkUserRateLimit } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/lib/audit";

/**
 * Transcribe a spoken practice answer (PHASE_14 §3b). The candidate records in
 * the browser and posts the audio here; we transcribe via the existing
 * TranscriptionProvider and return text for the candidate to review before
 * sending. Voice answers require the microphone + media-upload consents (audio
 * leaves the device). In mock mode the audio is NOT persisted — it is discarded
 * after transcription. Rate-limited.
 */
export async function POST(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  if (!(await checkUserRateLimit(userId, "ai_generate"))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  const sessionId = form?.get("sessionId");
  const audio = form?.get("audio");
  if (typeof sessionId !== "string" || !(audio instanceof Blob)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (audio.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Audio too large" }, { status: 400 });
  }

  // Ownership of the session.
  const supabase = await createSupabaseServerClient();
  const { data: owned } = await supabase
    .from("practice_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Consent: mic capture + media leaving the device for transcription.
  const consent = await getConsentState();
  if (!consent.vda_microphone || !consent.vda_media_upload) {
    return NextResponse.json(
      { error: "Enable microphone and media-upload consent in Settings." },
      { status: 403 },
    );
  }

  const provider = getTranscriptionProvider();
  const result = await provider.transcribe({
    audioStoragePath: null,
    hintText: null,
  });

  await writeAuditLog({
    userId,
    action: "practice.answer_transcribed",
    resourceType: "practice_session",
    resourceId: sessionId,
    metadata: { provider: result.provider },
  });

  return NextResponse.json({
    text: result.text,
    provider: result.provider,
    isMock: provider.name === "mock",
  });
}
