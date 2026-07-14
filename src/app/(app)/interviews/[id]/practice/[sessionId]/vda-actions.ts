"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getConsentState } from "@/lib/data/consent";
import { writeAuditLog } from "@/lib/audit";
import { checkUserRateLimit } from "@/lib/security/rate-limit";
import { runDeliveryAnalysis } from "@/lib/vda/analysis";
import { submittedMetricsSchema } from "@/lib/vda/metrics";

export type VdaResult =
  | { ok: true; analysisId: string; status: string }
  | { ok: false; code?: string; message: string };

/**
 * Submit browser-computed aggregate delivery metrics and run the analysis. The
 * request body carries ONLY validated aggregate numbers — never raw video or
 * landmark frames. Requires the vda_ai_analysis consent; transcription requires
 * vda_media_upload. Rate-limited.
 */
export async function submitDeliveryMetrics(
  interviewId: string,
  sessionId: string,
  payload: {
    answerId?: string | null;
    metrics: unknown;
    coachingGoals?: string[];
    allowTranscription?: boolean;
    answerHint?: string | null;
    mediaAssetId?: string | null;
  },
): Promise<VdaResult> {
  const user = await requireUser();

  // Ownership.
  const supabase = await createSupabaseServerClient();
  const { data: session } = await supabase
    .from("practice_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) return { ok: false, message: "Session not found." };

  if (!(await checkUserRateLimit(user.id, "ai_generate"))) {
    return { ok: false, message: "Too many requests. Please slow down." };
  }

  const consent = await getConsentState();
  if (!consent.vda_ai_analysis) {
    return {
      ok: false,
      code: "consent_required",
      message: "Enable the AI analysis consent in Settings to get feedback.",
    };
  }

  const parsedMetrics = submittedMetricsSchema.safeParse(payload.metrics);
  if (!parsedMetrics.success) {
    return { ok: false, message: "Invalid metrics." };
  }

  const now = new Date().toISOString();
  const result = await runDeliveryAnalysis({
    userId: user.id,
    sessionId,
    answerId: payload.answerId ?? null,
    metrics: parsedMetrics.data,
    coachingGoals: (payload.coachingGoals ?? []).slice(0, 8),
    mediaAssetId: payload.mediaAssetId ?? null,
    transcriptUploadAllowed: Boolean(
      consent.vda_media_upload && payload.allowTranscription,
    ),
    answerHint: payload.answerHint ?? null,
    consent: { recordingAt: now, uploadAt: now, analysisAt: now },
  });

  if (!result.ok) return result;
  await writeAuditLog({
    userId: user.id,
    action: "delivery_analysis.created",
    resourceType: "delivery_analysis",
    resourceId: result.analysisId,
  });
  revalidatePath(`/interviews/${interviewId}/practice/${sessionId}`);
  return result;
}

// ── Per-artifact deletion (each independent, each audit-logged) ──────────
export async function deleteRecording(
  interviewId: string,
  sessionId: string,
  mediaAssetId: string,
): Promise<void> {
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  const { data: media } = await admin
    .from("media_assets")
    .select("storage_path")
    .eq("id", mediaAssetId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!media) return;
  // Destroy the object; tombstone the row (proves deletion).
  await admin.storage.from("media").remove([media.storage_path]);
  await admin
    .from("media_assets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", mediaAssetId)
    .eq("user_id", user.id);
  await writeAuditLog({
    userId: user.id,
    action: "media.delete",
    resourceType: "media_asset",
    resourceId: mediaAssetId,
  });
  revalidatePath(`/interviews/${interviewId}/practice/${sessionId}`);
}

export async function deleteAnalysis(
  interviewId: string,
  sessionId: string,
  analysisId: string,
): Promise<void> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("delivery_analyses")
    .delete()
    .eq("id", analysisId)
    .eq("user_id", user.id);
  await writeAuditLog({
    userId: user.id,
    action: "delivery_feedback.delete",
    resourceType: "delivery_analysis",
    resourceId: analysisId,
  });
  revalidatePath(`/interviews/${interviewId}/practice/${sessionId}`);
}

export async function deleteTranscript(
  interviewId: string,
  sessionId: string,
  transcriptId: string,
): Promise<void> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("transcripts")
    .delete()
    .eq("id", transcriptId)
    .eq("user_id", user.id);
  await writeAuditLog({
    userId: user.id,
    action: "transcript.delete",
    resourceType: "transcript",
    resourceId: transcriptId,
  });
  revalidatePath(`/interviews/${interviewId}/practice/${sessionId}`);
}
