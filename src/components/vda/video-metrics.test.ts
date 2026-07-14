import { describe, it, expect } from "vitest";

import {
  aggregateVideoSamples,
  computeFrameStat,
  type FrameStat,
} from "@/components/vda/video-metrics";

/**
 * Model-free video presence math (PHASE_14 §3c). No ML, no face recognition —
 * just frame-difference motion, luma, and centering aggregates.
 */
describe("aggregateVideoSamples", () => {
  it("returns all-null aggregates for no samples", () => {
    const a = aggregateVideoSamples([], 0);
    expect(a.movement_events_per_min).toBeNull();
    expect(a.frame_centering_pct).toBeNull();
    expect(a.camera_facing_pct).toBeNull(); // never guessed without a model
  });

  it("counts movement events per minute", () => {
    // 30 samples over 60s: 6 above the motion threshold.
    const samples: FrameStat[] = Array.from({ length: 30 }, (_, i) => ({
      motion: i < 6 ? 0.2 : 0.01,
      avgLuma: 0.5,
      centered: true,
    }));
    const a = aggregateVideoSamples(samples, 60_000);
    expect(a.movement_events_per_min).toBe(6);
  });

  it("flags low light and derives centering percentage", () => {
    const dark: FrameStat[] = Array.from({ length: 10 }, () => ({
      motion: 0,
      avgLuma: 0.1,
      centered: false,
    }));
    const a = aggregateVideoSamples(dark, 2000);
    expect(a.lighting_flag).toBe(true);
    expect(a.framing_flag).toBe(true);
    expect(a.frame_centering_pct).toBe(0);
  });

  it("does not flag a well-lit, centered recording", () => {
    const good: FrameStat[] = Array.from({ length: 10 }, () => ({
      motion: 0.01,
      avgLuma: 0.6,
      centered: true,
    }));
    const a = aggregateVideoSamples(good, 2000);
    expect(a.lighting_flag).toBe(false);
    expect(a.framing_flag).toBe(false);
    expect(a.frame_centering_pct).toBe(100);
  });
});

describe("computeFrameStat", () => {
  it("reports zero motion on the first frame (no previous)", () => {
    const cur = new Float32Array(64).fill(0.5);
    const s = computeFrameStat(null, cur, 8, 8);
    expect(s.motion).toBe(0);
    expect(s.avgLuma).toBeCloseTo(0.5, 5);
  });

  it("detects motion when pixels change beyond the delta threshold", () => {
    const prev = new Float32Array(64).fill(0.2);
    const cur = new Float32Array(64).fill(0.9); // big change everywhere
    const s = computeFrameStat(prev, cur, 8, 8);
    expect(s.motion).toBeGreaterThan(0.9);
  });

  it("marks centered when the middle box is brighter than the frame", () => {
    const w = 8,
      h = 8;
    const cur = new Float32Array(w * h).fill(0.1);
    for (let y = 2; y < 6; y++)
      for (let x = 2; x < 6; x++) cur[y * w + x] = 0.9; // bright center
    const s = computeFrameStat(null, cur, w, h);
    expect(s.centered).toBe(true);
  });
});
