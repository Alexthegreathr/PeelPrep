import type { FaceLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";

import {
  eulerFromMatrix,
  framingDistanceBand,
  type LandmarkFrame,
} from "@/lib/vda/landmark-metrics";

/**
 * On-device face + pose landmark analyzer (PHASE_14 §3c). Loads MediaPipe from
 * SELF-HOSTED assets (/public/mediapipe — no CDN, no third-party request) and
 * runs entirely in the browser. It reads video frames and emits geometric
 * per-frame samples + live cues; it NEVER uploads pixels or landmark
 * coordinates, does no face recognition, and infers nothing about the person.
 * If the model can't load, callers fall back to the model-free metrics.
 */
export type LiveCues = {
  faceDetected: boolean;
  facing: boolean;
  centered: boolean;
  poseDetected: boolean;
  postureSteady: boolean | null;
  /** Camera distance from face-box size. */
  distance: "far" | "ok" | "close" | null;
  /** Looking at the camera vs. down (head pitch). */
  eyesUp: boolean | null;
  /** Hand-gesture activity when the wrists are in frame. */
  gesture: "low" | "active" | null;
};

export const EMPTY_CUES: LiveCues = {
  faceDetected: false,
  facing: false,
  centered: false,
  poseDetected: false,
  postureSteady: null,
  distance: null,
  eyesUp: null,
  gesture: null,
};

const EMPTY_FRAME: LandmarkFrame = {
  faceDetected: false,
  yawDeg: null,
  pitchDeg: null,
  faceCenterX: null,
  faceCenterY: null,
  poseDetected: false,
  shoulderAngleDeg: null,
  shoulderMidX: null,
  shoulderMidY: null,
};

const WASM_PATH = "/mediapipe/wasm";
const FACE_MODEL = "/mediapipe/models/face_landmarker.task";
const POSE_MODEL = "/mediapipe/models/pose_landmarker_lite.task";

export class LandmarkAnalyzer {
  private face: FaceLandmarker | null = null;
  private pose: PoseLandmarker | null = null;
  private angleWindow: number[] = [];
  private prevWrist: { x: number; y: number } | null = null;
  private gestureWindow: number[] = [];
  private consecutiveErrors = 0;
  ready = false;

  /** Load the models. Returns false (never throws) if unavailable. */
  async init(): Promise<boolean> {
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const { FilesetResolver, FaceLandmarker, PoseLandmarker } = vision;
      const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
      this.face = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        outputFacialTransformationMatrixes: true,
        numFaces: 1,
      });
      this.pose = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      this.ready = true;
      return true;
    } catch {
      this.ready = false;
      return false;
    }
  }

  /** Analyze one video frame at the given monotonic timestamp (ms). */
  sample(
    video: HTMLVideoElement,
    tsMs: number,
  ): { frame: LandmarkFrame; cues: LiveCues } {
    const frame: LandmarkFrame = { ...EMPTY_FRAME };
    let faceHeight: number | null = null;
    let wrist: { x: number; y: number } | null = null;
    if (!this.ready || !this.face || !this.pose || video.readyState < 2) {
      return { frame, cues: EMPTY_CUES };
    }

    try {
      const fr = this.face.detectForVideo(video, tsMs);
      const pts = fr.faceLandmarks?.[0];
      if (pts && pts.length) {
        let minX = 1,
          maxX = 0,
          minY = 1,
          maxY = 0;
        for (const p of pts) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }
        frame.faceDetected = true;
        frame.faceCenterX = (minX + maxX) / 2;
        frame.faceCenterY = (minY + maxY) / 2;
        faceHeight = maxY - minY; // face-box height → distance proxy
        const mtx = fr.facialTransformationMatrixes?.[0]?.data;
        if (mtx) {
          const e = eulerFromMatrix(mtx);
          frame.yawDeg = e.yawDeg;
          frame.pitchDeg = e.pitchDeg;
        }
      }

      const pr = this.pose.detectForVideo(video, tsMs);
      const lm = pr.landmarks?.[0];
      if (lm && lm.length > 16) {
        const vis = (p: { visibility?: number }) => p.visibility ?? 1;
        const L = lm[11];
        const R = lm[12];
        if (L && R && vis(L) > 0.5 && vis(R) > 0.5) {
          frame.poseDetected = true;
          frame.shoulderMidX = (L.x + R.x) / 2;
          frame.shoulderMidY = (L.y + R.y) / 2;
          frame.shoulderAngleDeg =
            (Math.atan2(R.y - L.y, R.x - L.x) * 180) / Math.PI;
        }
        // Wrists (15 left, 16 right) for gesture activity — only when in frame.
        const visibleWrists = [lm[15], lm[16]].filter((w) => w && vis(w) > 0.5);
        if (visibleWrists.length) {
          wrist = {
            x:
              visibleWrists.reduce((a, w) => a + w.x, 0) / visibleWrists.length,
            y:
              visibleWrists.reduce((a, w) => a + w.y, 0) / visibleWrists.length,
          };
        }
      }
      this.consecutiveErrors = 0;
    } catch {
      // A transient detect failure yields an empty frame. If detection keeps
      // failing (e.g. no WebGL in this environment), stop trying and let the
      // caller fall back to the model-free metrics.
      if (++this.consecutiveErrors >= 5) this.ready = false;
    }

    return { frame, cues: this.cuesFor(frame, faceHeight, wrist) };
  }

  private cuesFor(
    frame: LandmarkFrame,
    faceHeight: number | null,
    wrist: { x: number; y: number } | null,
  ): LiveCues {
    const facing =
      frame.faceDetected &&
      frame.yawDeg != null &&
      Math.abs(frame.yawDeg) <= 18 &&
      Math.abs(frame.pitchDeg ?? 0) <= 16;
    const centered =
      frame.faceDetected &&
      frame.faceCenterX != null &&
      Math.abs(frame.faceCenterX - 0.5) <= 0.2 &&
      Math.abs((frame.faceCenterY ?? 0.5) - 0.5) <= 0.2;

    // Looking at the camera vs. down (positive pitch = looking down).
    const eyesUp =
      frame.faceDetected && frame.pitchDeg != null
        ? frame.pitchDeg <= 12
        : null;

    const distance = framingDistanceBand(faceHeight);

    let postureSteady: boolean | null = null;
    if (frame.poseDetected && frame.shoulderAngleDeg != null) {
      this.angleWindow.push(frame.shoulderAngleDeg);
      if (this.angleWindow.length > 15) this.angleWindow.shift();
      if (this.angleWindow.length >= 5) {
        const m =
          this.angleWindow.reduce((a, b) => a + b, 0) / this.angleWindow.length;
        const sd = Math.sqrt(
          this.angleWindow.reduce((a, b) => a + (b - m) * (b - m), 0) /
            this.angleWindow.length,
        );
        postureSteady = sd < 6;
      }
    }

    // Gesture activity: mean wrist displacement across a short window, but only
    // when the wrists are actually in frame (else null — hands not visible).
    let gesture: "low" | "active" | null = null;
    if (wrist) {
      if (this.prevWrist) {
        const d = Math.hypot(
          wrist.x - this.prevWrist.x,
          wrist.y - this.prevWrist.y,
        );
        this.gestureWindow.push(d);
        if (this.gestureWindow.length > 15) this.gestureWindow.shift();
      }
      this.prevWrist = wrist;
      if (this.gestureWindow.length >= 5) {
        const mean =
          this.gestureWindow.reduce((a, b) => a + b, 0) /
          this.gestureWindow.length;
        gesture = mean > 0.012 ? "active" : "low";
      }
    } else {
      this.prevWrist = null;
    }

    return {
      faceDetected: frame.faceDetected,
      facing,
      centered,
      poseDetected: frame.poseDetected,
      postureSteady,
      distance,
      eyesUp,
      gesture,
    };
  }

  close() {
    try {
      this.face?.close();
      this.pose?.close();
    } catch {
      /* ignore */
    }
    this.face = null;
    this.pose = null;
    this.ready = false;
    this.angleWindow = [];
    this.gestureWindow = [];
    this.prevWrist = null;
  }
}
