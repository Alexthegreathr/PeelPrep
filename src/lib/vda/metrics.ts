import * as z from "zod";

/**
 * Delivery metrics (DATABASE.md §5b). The browser computes these AGGREGATES —
 * video-derived values from on-device landmark workers, pause/volume from the
 * audio buffer — and submits ONLY these Zod-validated numbers. Raw landmark
 * frames and raw media never cross the network here. Speaking pace and filler
 * counts are derived server-side from the transcript.
 */
export const submittedMetricsSchema = z.object({
  camera_facing_pct: z.number().min(0).max(100).nullable().default(null),
  frame_centering_pct: z.number().min(0).max(100).nullable().default(null),
  head_turns_per_min: z.number().min(0).max(600).nullable().default(null),
  posture_stability_score: z.number().min(0).max(1).nullable().default(null),
  shoulder_angle_variation_deg: z
    .number()
    .min(0)
    .max(180)
    .nullable()
    .default(null),
  movement_events_per_min: z.number().min(0).max(600).nullable().default(null),
  pause_count: z.number().int().min(0).max(1000).nullable().default(null),
  avg_pause_ms: z.number().min(0).nullable().default(null),
  longest_pause_ms: z.number().min(0).nullable().default(null),
  volume_variation_coeff: z.number().min(0).max(10).nullable().default(null),
  answer_duration_seconds: z.number().min(0).max(3600).nullable().default(null),
  sample_coverage_pct: z.number().min(0).max(100).nullable().default(null),
  lighting_flag: z.boolean().default(false),
  framing_flag: z.boolean().default(false),
});
export type SubmittedMetrics = z.infer<typeof submittedMetricsSchema>;

const FILLERS = [
  "um",
  "uh",
  "er",
  "ah",
  "like",
  "you know",
  "sort of",
  "kind of",
  "basically",
  "actually",
  "literally",
  "i mean",
];

export type TranscriptMetrics = {
  speaking_pace_wpm: number | null;
  filler_word_count: number;
  filler_words_per_100: number;
};

/** Derive speaking pace + filler counts from the transcript, server-side. */
export function deriveTranscriptMetrics(
  text: string,
  durationSeconds: number | null,
): TranscriptMetrics {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lower = ` ${text.toLowerCase()} `;
  let fillerCount = 0;
  for (const f of FILLERS) {
    const re = new RegExp(`\\b${f.replace(/ /g, "\\s+")}\\b`, "g");
    fillerCount += (lower.match(re) ?? []).length;
  }
  const speaking_pace_wpm =
    durationSeconds && durationSeconds > 0
      ? Math.round((wordCount / durationSeconds) * 60)
      : null;
  const filler_words_per_100 =
    wordCount > 0 ? Math.round((fillerCount / wordCount) * 1000) / 10 : 0;
  return {
    speaking_pace_wpm,
    filler_word_count: fillerCount,
    filler_words_per_100,
  };
}

/** Which measurements are missing/low-confidence — feeds the uncertainty framing. */
export function missingMeasurements(
  metrics: SubmittedMetrics,
  hasTranscript: boolean,
): string[] {
  const missing: string[] = [];
  if (metrics.camera_facing_pct == null)
    missing.push("camera-facing time (no face landmarks detected)");
  if (metrics.sample_coverage_pct != null && metrics.sample_coverage_pct < 50)
    missing.push("low landmark coverage — video metrics are less reliable");
  if (metrics.posture_stability_score == null)
    missing.push("posture (no pose landmarks)");
  if (!hasTranscript)
    missing.push("transcript unavailable — speaking pace and filler counts");
  return missing;
}
