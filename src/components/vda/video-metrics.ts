/**
 * On-device, model-free video presence metrics (PHASE_14_AVATAR_PRACTICE.md §3c).
 * Samples the live preview into a tiny canvas and derives movement, lighting,
 * and framing aggregates by frame-differencing and luma — NO ML model, NO face
 * or identity recognition, and NO frames ever leave the tab. Camera-facing and
 * posture stay unmeasured here (they need the documented MediaPipe seam), so the
 * report stays honest about coverage.
 */

export type VideoAggregates = {
  movement_events_per_min: number | null;
  frame_centering_pct: number | null;
  lighting_flag: boolean;
  framing_flag: boolean;
  sample_coverage_pct: number | null;
  // Explicitly unmeasured without a landmark model — kept null, never guessed.
  camera_facing_pct: null;
  posture_stability_score: null;
  shoulder_angle_variation_deg: null;
  head_turns_per_min: null;
};

/** Per-frame measurements, all normalized 0–1 (except `centered`). */
export type FrameStat = {
  motion: number; // fraction of luma that changed vs the previous frame
  avgLuma: number; // 0 (black) – 1 (white)
  centered: boolean; // center region at least as bright as the edges
};

const MOTION_EVENT_THRESHOLD = 0.06; // frame-to-frame change that counts as motion
const LOW_LIGHT_LUMA = 0.22; // average luma below this reads as low light
const SAMPLE_HZ = 5;

/**
 * Roll per-frame stats into submitted aggregates. Pure and unit-tested;
 * `durationMs` is wall-clock recording length (for rate + coverage).
 */
export function aggregateVideoSamples(
  samples: FrameStat[],
  durationMs: number,
): VideoAggregates {
  const base: VideoAggregates = {
    movement_events_per_min: null,
    frame_centering_pct: null,
    lighting_flag: false,
    framing_flag: false,
    sample_coverage_pct: null,
    camera_facing_pct: null,
    posture_stability_score: null,
    shoulder_angle_variation_deg: null,
    head_turns_per_min: null,
  };
  if (samples.length === 0 || durationMs <= 0) return base;

  const minutes = durationMs / 60000;
  const movementEvents = samples.filter(
    (s) => s.motion >= MOTION_EVENT_THRESHOLD,
  ).length;
  const avgLuma = samples.reduce((a, s) => a + s.avgLuma, 0) / samples.length;
  const centeredCount = samples.filter((s) => s.centered).length;
  const centeringPct = (centeredCount / samples.length) * 100;

  const expected = Math.max(1, Math.round((durationMs / 1000) * SAMPLE_HZ));
  const coverage = Math.min(100, (samples.length / expected) * 100);

  return {
    ...base,
    movement_events_per_min:
      minutes > 0 ? Math.round(movementEvents / minutes) : null,
    frame_centering_pct: Math.round(centeringPct),
    lighting_flag: avgLuma < LOW_LIGHT_LUMA,
    framing_flag: centeringPct < 50 || avgLuma < LOW_LIGHT_LUMA,
    sample_coverage_pct: Math.round(coverage),
  };
}

/** Compute one frame's stats from downscaled luma arrays (pure, testable). */
export function computeFrameStat(
  prev: Float32Array | null,
  cur: Float32Array,
  width: number,
  height: number,
): FrameStat {
  let lumaSum = 0;
  let changed = 0;
  for (let i = 0; i < cur.length; i++) {
    lumaSum += cur[i];
    if (prev && Math.abs(cur[i] - prev[i]) > 0.12) changed++;
  }
  const avgLuma = lumaSum / cur.length;

  // Center region (middle 50% box) vs whole-frame luma → rough "centered".
  let centerSum = 0;
  let centerN = 0;
  const x0 = Math.floor(width * 0.25),
    x1 = Math.floor(width * 0.75);
  const y0 = Math.floor(height * 0.25),
    y1 = Math.floor(height * 0.75);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      centerSum += cur[y * width + x];
      centerN++;
    }
  }
  const centerLuma = centerN > 0 ? centerSum / centerN : avgLuma;

  return {
    motion: prev ? changed / cur.length : 0,
    avgLuma,
    centered: centerLuma >= avgLuma * 0.95,
  };
}

/**
 * Samples a live-preview <video> during recording and produces aggregates on
 * stop. Everything stays in the tab; only the numbers from finalize() are used.
 */
export class VideoPresenceSampler {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly w = 64;
  private readonly h = 48;
  private prev: Float32Array | null = null;
  private samples: FrameStat[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;
  private stoppedAt = 0;

  constructor(private readonly video: HTMLVideoElement) {
    this.canvas =
      typeof document !== "undefined"
        ? document.createElement("canvas")
        : ({} as HTMLCanvasElement);
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.ctx = this.canvas.getContext
      ? this.canvas.getContext("2d", { willReadFrequently: true })
      : null;
  }

  start(nowMs: number) {
    this.startedAt = nowMs;
    this.samples = [];
    this.prev = null;
    this.timer = setInterval(() => this.tick(), 1000 / SAMPLE_HZ);
  }

  private tick() {
    if (!this.ctx || this.video.readyState < 2) return;
    try {
      this.ctx.drawImage(this.video, 0, 0, this.w, this.h);
      const { data } = this.ctx.getImageData(0, 0, this.w, this.h);
      const luma = new Float32Array(this.w * this.h);
      for (let p = 0, i = 0; i < data.length; i += 4, p++) {
        luma[p] =
          (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      }
      this.samples.push(computeFrameStat(this.prev, luma, this.w, this.h));
      this.prev = luma;
    } catch {
      // A transient draw/read failure just drops one sample.
    }
  }

  finalize(nowMs: number): VideoAggregates {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.stoppedAt = nowMs;
    return aggregateVideoSamples(this.samples, this.stoppedAt - this.startedAt);
  }
}
