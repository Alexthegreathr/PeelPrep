import { describe, it, expect } from "vitest";

import {
  aggregateLandmarkFrames,
  eulerFromMatrix,
  type LandmarkFrame,
} from "@/lib/vda/landmark-metrics";

/**
 * On-device landmark aggregation (PHASE_14 §3c). Observable geometry only —
 * these tests assert the derivation, not any inference about the person.
 */
function frame(p: Partial<LandmarkFrame> = {}): LandmarkFrame {
  return {
    faceDetected: true,
    yawDeg: 0,
    pitchDeg: 0,
    faceCenterX: 0.5,
    faceCenterY: 0.5,
    poseDetected: true,
    shoulderAngleDeg: 0,
    shoulderMidX: 0.5,
    shoulderMidY: 0.6,
    ...p,
  };
}

describe("aggregateLandmarkFrames", () => {
  it("returns all-null for no frames", () => {
    const a = aggregateLandmarkFrames([], 1000);
    expect(a.camera_facing_pct).toBeNull();
    expect(a.sample_coverage_pct).toBeNull();
  });

  it("reports low coverage when the face is rarely detected", () => {
    const frames = [
      frame(),
      frame({ faceDetected: false, yawDeg: null, pitchDeg: null }),
      frame({ faceDetected: false, yawDeg: null, pitchDeg: null }),
      frame({ faceDetected: false, yawDeg: null, pitchDeg: null }),
    ];
    const a = aggregateLandmarkFrames(frames, 4000);
    expect(a.sample_coverage_pct).toBe(25);
  });

  it("scores a steady, camera-facing, centered sitter high", () => {
    const frames = Array.from({ length: 30 }, () => frame());
    const a = aggregateLandmarkFrames(frames, 6000);
    expect(a.camera_facing_pct).toBe(100);
    expect(a.frame_centering_pct).toBe(100);
    expect(a.head_turns_per_min).toBe(0);
    expect(a.posture_stability_score).toBeGreaterThan(0.9);
    expect(a.sample_coverage_pct).toBe(100);
  });

  it("counts head turns with hysteresis (away then back = one turn)", () => {
    // center → turn to 30° → back to 0 → turn again → back: 2 turns.
    const yaws = [0, 5, 30, 35, 5, 0, 40, 5, 0];
    const frames = yaws.map((y) => frame({ yawDeg: y }));
    const a = aggregateLandmarkFrames(frames, 60_000);
    expect(a.head_turns_per_min).toBe(2);
  });

  it("drops camera-facing % when the head is turned away", () => {
    const frames = Array.from({ length: 10 }, (_, i) =>
      frame({ yawDeg: i < 5 ? 0 : 40 }),
    );
    const a = aggregateLandmarkFrames(frames, 2000);
    expect(a.camera_facing_pct).toBe(50);
  });

  it("lowers posture stability when the shoulder line varies a lot", () => {
    const jittery = Array.from({ length: 10 }, (_, i) =>
      frame({
        shoulderAngleDeg: i % 2 === 0 ? -20 : 20,
        shoulderMidX: i % 2 ? 0.4 : 0.6,
      }),
    );
    const a = aggregateLandmarkFrames(jittery, 2000);
    expect(a.posture_stability_score).toBeLessThan(0.5);
    expect(a.shoulder_angle_variation_deg).toBeGreaterThan(10);
  });
});

describe("eulerFromMatrix", () => {
  it("reads ~0° yaw/pitch from an identity matrix (facing camera)", () => {
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const e = eulerFromMatrix(identity);
    expect(Math.abs(e.yawDeg)).toBeLessThan(1);
    expect(Math.abs(e.pitchDeg)).toBeLessThan(1);
  });

  it("reads a positive yaw from a Y-rotation matrix", () => {
    // 30° rotation about Y (column-major).
    const c = Math.cos(Math.PI / 6);
    const s = Math.sin(Math.PI / 6);
    const rotY = [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
    const e = eulerFromMatrix(rotY);
    expect(Math.abs(e.yawDeg)).toBeGreaterThan(20);
  });
});
