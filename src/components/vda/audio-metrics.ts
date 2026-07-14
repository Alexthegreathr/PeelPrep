/**
 * On-device audio aggregate computation (AI_ARCHITECTURE.md §10, SECURITY.md §13).
 * Runs entirely in the browser on the recorded buffer. Only the resulting
 * aggregate numbers are ever submitted — the audio samples never leave the tab.
 */
export type AudioAggregates = {
  answer_duration_seconds: number | null;
  pause_count: number | null;
  avg_pause_ms: number | null;
  longest_pause_ms: number | null;
  volume_variation_coeff: number | null;
};

const FRAME_MS = 20;
const MIN_PAUSE_MS = 350; // silence this long counts as a pause

/**
 * Decode the recorded blob and derive pause/volume aggregates from its waveform.
 * Falls back to duration-only (from the timer) if decoding isn't supported.
 */
export async function computeAudioAggregates(
  blob: Blob,
  fallbackDurationSeconds: number,
): Promise<AudioAggregates> {
  const empty: AudioAggregates = {
    answer_duration_seconds: Math.round(fallbackDurationSeconds) || null,
    pause_count: null,
    avg_pause_ms: null,
    longest_pause_ms: null,
    volume_variation_coeff: null,
  };

  const Ctor =
    typeof window !== "undefined"
      ? (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext)
      : undefined;
  if (!Ctor) return empty;

  let ctx: AudioContext | null = null;
  try {
    ctx = new Ctor();
    const buf = await blob.arrayBuffer();
    const audio = await ctx.decodeAudioData(buf.slice(0));
    const data = audio.getChannelData(0);
    const sampleRate = audio.sampleRate;
    const frameLen = Math.max(1, Math.floor((sampleRate * FRAME_MS) / 1000));
    const rms: number[] = [];
    for (let i = 0; i + frameLen <= data.length; i += frameLen) {
      let sum = 0;
      for (let j = 0; j < frameLen; j++) {
        const s = data[i + j];
        sum += s * s;
      }
      rms.push(Math.sqrt(sum / frameLen));
    }
    if (rms.length === 0) {
      return { ...empty, answer_duration_seconds: Math.round(audio.duration) };
    }

    const peak = Math.max(...rms);
    const threshold = Math.max(peak * 0.08, 0.0025);

    // Pause detection over consecutive silent frames.
    const pauses: number[] = [];
    let run = 0;
    for (const v of rms) {
      if (v < threshold) run += 1;
      else {
        if (run * FRAME_MS >= MIN_PAUSE_MS) pauses.push(run * FRAME_MS);
        run = 0;
      }
    }
    if (run * FRAME_MS >= MIN_PAUSE_MS) pauses.push(run * FRAME_MS);

    // Volume coefficient of variation over voiced frames.
    const voiced = rms.filter((v) => v >= threshold);
    let coeff: number | null = null;
    if (voiced.length > 1) {
      const mean = voiced.reduce((a, b) => a + b, 0) / voiced.length;
      if (mean > 0) {
        const variance =
          voiced.reduce((a, b) => a + (b - mean) * (b - mean), 0) /
          voiced.length;
        coeff = Math.min(10, Math.sqrt(variance) / mean);
      }
    }

    return {
      answer_duration_seconds: Math.round(audio.duration),
      pause_count: pauses.length,
      avg_pause_ms: pauses.length
        ? Math.round(pauses.reduce((a, b) => a + b, 0) / pauses.length)
        : 0,
      longest_pause_ms: pauses.length ? Math.round(Math.max(...pauses)) : 0,
      volume_variation_coeff:
        coeff == null ? null : Math.round(coeff * 100) / 100,
    };
  } catch {
    return empty;
  } finally {
    if (ctx) void ctx.close().catch(() => {});
  }
}
