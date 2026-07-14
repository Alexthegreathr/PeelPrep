/**
 * Pure landmark → aggregate math for on-device delivery analysis
 * (PHASE_14 §3c). The browser's MediaPipe worker produces one `LandmarkFrame`
 * per sampled video frame; this module rolls them into the same aggregate
 * numbers VDA already stores. No pixels or landmark coordinates are ever
 * persisted or uploaded — only these derived aggregates. Everything here is a
 * pure function of the per-frame numbers so it is unit-tested in isolation.
 *
 * IMPORTANT (unchanged guardrails): these are observable geometric measurements
 * only. "Camera-facing" approximates eye contact; nothing here infers emotion,
 * confidence, personality, or identity, and there is no face recognition.
 */

export type LandmarkFrame = {
  faceDetected: boolean;
  /** Head yaw in degrees: 0 = facing camera, + = turned right, − = left. */
  yawDeg: number | null;
  /** Head pitch in degrees: 0 = level, + = looking down, − = up. */
  pitchDeg: number | null;
  /** Face-box center, normalized 0–1 across the frame (0.5 = centered). */
  faceCenterX: number | null;
  faceCenterY: number | null;
  poseDetected: boolean;
  /** Shoulder-line angle vs. horizontal, degrees. */
  shoulderAngleDeg: number | null;
  shoulderMidX: number | null;
  shoulderMidY: number | null;
};

export type LandmarkAggregates = {
  camera_facing_pct: number | null;
  frame_centering_pct: number | null;
  head_turns_per_min: number | null;
  posture_stability_score: number | null;
  shoulder_angle_variation_deg: number | null;
  sample_coverage_pct: number | null;
};

const FACING_YAW = 18; // within this yaw (deg) counts as facing the camera
const FACING_PITCH = 16;
const CENTER_TOL = 0.2; // face center within this of 0.5 counts as centered
const TURN_ENTER = 22; // yaw beyond this starts a "turn away"
const TURN_EXIT = 12; // yaw back inside this ends it

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / xs.length;
  return Math.sqrt(v);
}

const pct = (n: number, d: number) =>
  d > 0 ? Math.round((n / d) * 100) : null;

/** Roll per-frame landmark samples into submitted aggregates. */
export function aggregateLandmarkFrames(
  frames: LandmarkFrame[],
  durationMs: number,
): LandmarkAggregates {
  const empty: LandmarkAggregates = {
    camera_facing_pct: null,
    frame_centering_pct: null,
    head_turns_per_min: null,
    posture_stability_score: null,
    shoulder_angle_variation_deg: null,
    sample_coverage_pct: null,
  };
  if (frames.length === 0) return empty;

  const faceFrames = frames.filter(
    (f) => f.faceDetected && f.yawDeg != null && f.pitchDeg != null,
  );
  const coverage = pct(faceFrames.length, frames.length);

  // Camera-facing: of the frames where a face was found, how many were within
  // the facing cone. Reported relative to detected frames (honest about gaps).
  const facing = faceFrames.filter(
    (f) =>
      Math.abs(f.yawDeg!) <= FACING_YAW &&
      Math.abs(f.pitchDeg!) <= FACING_PITCH,
  ).length;
  const camera_facing_pct = faceFrames.length
    ? pct(facing, faceFrames.length)
    : null;

  // Framing: face box centered horizontally + vertically.
  const centeredFrames = faceFrames.filter(
    (f) =>
      f.faceCenterX != null &&
      f.faceCenterY != null &&
      Math.abs(f.faceCenterX - 0.5) <= CENTER_TOL &&
      Math.abs(f.faceCenterY - 0.5) <= CENTER_TOL,
  ).length;
  const frame_centering_pct = faceFrames.length
    ? pct(centeredFrames, faceFrames.length)
    : null;

  // Head turns: hysteresis count of "turned away and back" events.
  let turns = 0;
  let away = false;
  for (const f of faceFrames) {
    const y = Math.abs(f.yawDeg!);
    if (!away && y >= TURN_ENTER) {
      away = true;
      turns += 1;
    } else if (away && y <= TURN_EXIT) {
      away = false;
    }
  }
  const minutes = durationMs / 60000;
  const head_turns_per_min =
    minutes > 0 && faceFrames.length ? Math.round(turns / minutes) : null;

  // Posture: steadiness of shoulder midpoint + shoulder-line angle.
  const poseFrames = frames.filter(
    (f) =>
      f.poseDetected &&
      f.shoulderAngleDeg != null &&
      f.shoulderMidX != null &&
      f.shoulderMidY != null,
  );
  let posture_stability_score: number | null = null;
  let shoulder_angle_variation_deg: number | null = null;
  if (poseFrames.length >= 3) {
    const angVar = stdev(poseFrames.map((f) => f.shoulderAngleDeg!));
    const posVar =
      stdev(poseFrames.map((f) => f.shoulderMidX!)) +
      stdev(poseFrames.map((f) => f.shoulderMidY!));
    shoulder_angle_variation_deg = Math.round(angVar * 10) / 10;
    // Map variation → 0..1 stability (more variation = lower). Tuned so a still
    // sitter scores high and constant shifting scores low.
    const raw =
      1 - Math.min(1, angVar / 15) * 0.6 - Math.min(1, posVar / 0.12) * 0.4;
    posture_stability_score = Math.max(0, Math.round(raw * 100) / 100);
  }

  return {
    camera_facing_pct,
    frame_centering_pct,
    head_turns_per_min,
    posture_stability_score,
    shoulder_angle_variation_deg,
    sample_coverage_pct: coverage,
  };
}

/**
 * Extract yaw/pitch/roll (degrees) from a MediaPipe 4×4 facial transformation
 * matrix (column-major, length 16). Used by the browser analyzer; pure so it's
 * testable without the model.
 */
export function eulerFromMatrix(m: number[] | Float32Array): {
  yawDeg: number;
  pitchDeg: number;
  rollDeg: number;
} {
  // Column-major storage: m[col*4 + row]. Rotation is the upper-left 3×3.
  const r00 = m[0],
    r10 = m[1],
    r20 = m[2],
    r21 = m[6],
    r22 = m[10];
  // yaw = left/right head turn (about vertical Y); pitch = up/down (about X).
  const yaw = Math.atan2(-r20, r00);
  const pitch = Math.atan2(r21, r22);
  const roll = Math.atan2(r10, r00);
  const deg = (r: number) => (r * 180) / Math.PI;
  return { yawDeg: deg(yaw), pitchDeg: deg(pitch), rollDeg: deg(roll) };
}
