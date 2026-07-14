/**
 * Presence summary (PHASE_14_AVATAR_PRACTICE.md §4). A DETERMINISTIC rollup of
 * the observable delivery measurements into a neutral, plain-language snapshot —
 * the same allowed signals VDA already stores (framing, camera-facing, movement,
 * lighting, pace, pauses, fillers). It is emphatically NOT a measure of
 * confidence, emotion, or personality: every band describes a measurement and a
 * neutral range, never an inner state. Built as a pure function (no AI call);
 * the prohibited-claims linter is still applied as defense-in-depth.
 */

export type PresenceInput = {
  camera_facing_pct?: number | null;
  frame_centering_pct?: number | null;
  posture_stability_score?: number | null;
  shoulder_angle_variation_deg?: number | null;
  movement_events_per_min?: number | null;
  pause_count?: number | null;
  longest_pause_ms?: number | null;
  speaking_pace_wpm?: number | null;
  filler_words_per_100?: number | null;
  answer_duration_seconds?: number | null;
  lighting_flag?: boolean | null;
  framing_flag?: boolean | null;
  sample_coverage_pct?: number | null;
};

/** Neutral, measurement-based status — never an emotional/affective judgment. */
export type PresenceBandStatus = "in_range" | "worth_a_look" | "unmeasured";

export type PresenceBand = {
  key: string;
  label: string;
  /** Human-readable measured value, or "not measured". */
  value: string;
  status: PresenceBandStatus;
  /** Neutral note tied strictly to the measurement. */
  note: string;
};

export type PresenceSummary = {
  bands: PresenceBand[];
  /** How many bands were actually measured (honesty about coverage). */
  measuredCount: number;
  disclaimer: string;
};

export const PRESENCE_DISCLAIMER =
  "A snapshot of observable delivery measurements — not a measure of confidence, emotion, or personality. Values are approximate and from limited samples.";

const round = (n: number) => Math.round(n);

function band(
  key: string,
  label: string,
  value: string,
  status: PresenceBandStatus,
  note: string,
): PresenceBand {
  return { key, label, value, status, note };
}

/**
 * Build the presence summary from measured aggregates. Thresholds describe
 * typical measurement ranges only; unmeasured signals are shown as such rather
 * than guessed.
 */
export function buildPresenceSummary(m: PresenceInput): PresenceSummary {
  const bands: PresenceBand[] = [];

  // ── Framing: staying centered in the shot ──────────────────────────────
  if (m.frame_centering_pct != null) {
    const v = round(m.frame_centering_pct);
    bands.push(
      band(
        "framing",
        "Framing",
        `centered ${v}% of the answer`,
        v >= 70 ? "in_range" : "worth_a_look",
        v >= 70
          ? "You stayed centered in the shot for most of the answer."
          : "You drifted from the center of the shot for part of the answer.",
      ),
    );
  } else if (m.framing_flag) {
    bands.push(
      band(
        "framing",
        "Framing",
        "off-center",
        "worth_a_look",
        "The camera framing looked off-center. Recenter yourself in the shot.",
      ),
    );
  } else {
    bands.push(unmeasured("framing", "Framing"));
  }

  // ── Camera-facing: approximate eye contact ─────────────────────────────
  if (m.camera_facing_pct != null) {
    const v = round(m.camera_facing_pct);
    bands.push(
      band(
        "camera_facing",
        "Camera-facing",
        `facing the camera ${v}% of the answer`,
        v >= 60 ? "in_range" : "worth_a_look",
        "Camera-facing time is only an approximation of eye contact and is affected by lighting and framing.",
      ),
    );
  } else {
    bands.push(unmeasured("camera_facing", "Camera-facing"));
  }

  // ── Movement / steadiness (mechanical, not affective) ──────────────────
  if (m.movement_events_per_min != null) {
    const v = round(m.movement_events_per_min);
    bands.push(
      band(
        "movement",
        "Movement",
        `${v} movement events/min`,
        v <= 30 ? "in_range" : "worth_a_look",
        v <= 30
          ? "Low overall movement in the frame."
          : "A high rate of movement in the frame — steadying the camera or yourself may help clarity.",
      ),
    );
  } else if (m.shoulder_angle_variation_deg != null) {
    const v = round(m.shoulder_angle_variation_deg);
    bands.push(
      band(
        "movement",
        "Steadiness",
        `${v}° shoulder-angle variation`,
        v <= 12 ? "in_range" : "worth_a_look",
        "Describes how much your shoulder line shifted — a mechanical measurement only.",
      ),
    );
  } else {
    bands.push(unmeasured("movement", "Movement"));
  }

  // ── Lighting ───────────────────────────────────────────────────────────
  if (m.lighting_flag != null) {
    bands.push(
      band(
        "lighting",
        "Lighting",
        m.lighting_flag ? "low / uneven" : "adequate",
        m.lighting_flag ? "worth_a_look" : "in_range",
        m.lighting_flag
          ? "Lighting looked low or uneven. A light facing you can improve the picture."
          : "Lighting looked adequate for the camera.",
      ),
    );
  }

  // ── Speaking pace ──────────────────────────────────────────────────────
  if (m.speaking_pace_wpm != null) {
    const v = round(m.speaking_pace_wpm);
    const inRange = v >= 120 && v <= 165;
    bands.push(
      band(
        "pace",
        "Speaking pace",
        `~${v} wpm`,
        inRange ? "in_range" : "worth_a_look",
        inRange
          ? "Within the typical 120–165 wpm conversational range."
          : v > 165
            ? "Faster than the typical 120–165 wpm range — brief pauses can aid clarity."
            : "Slower than the typical 120–165 wpm range.",
      ),
    );
  } else {
    bands.push(unmeasured("pace", "Speaking pace"));
  }

  // ── Pauses ─────────────────────────────────────────────────────────────
  if (m.longest_pause_ms != null || m.pause_count != null) {
    const longest =
      m.longest_pause_ms != null ? round(m.longest_pause_ms) : null;
    const count = m.pause_count != null ? round(m.pause_count) : null;
    const long = longest != null && longest >= 3000;
    bands.push(
      band(
        "pauses",
        "Pauses",
        [
          count != null ? `${count} pauses` : null,
          longest != null ? `longest ${(longest / 1000).toFixed(1)}s` : null,
        ]
          .filter(Boolean)
          .join(", ") || "measured",
        long ? "worth_a_look" : "in_range",
        long
          ? "One pause ran past ~3s. A short, intentional pause reads better than a long silent gap."
          : "Pause lengths were within a typical range.",
      ),
    );
  }

  // ── Filler words ───────────────────────────────────────────────────────
  if (m.filler_words_per_100 != null) {
    const v = m.filler_words_per_100;
    bands.push(
      band(
        "fillers",
        "Filler words",
        `${v.toFixed(1)} per 100 words`,
        v <= 5 ? "in_range" : "worth_a_look",
        v <= 5
          ? "Filler-word rate was within a typical range."
          : "A higher filler-word rate — replacing fillers with a brief pause can tighten delivery.",
      ),
    );
  }

  const measuredCount = bands.filter((b) => b.status !== "unmeasured").length;
  return { bands, measuredCount, disclaimer: PRESENCE_DISCLAIMER };
}

function unmeasured(key: string, label: string): PresenceBand {
  return band(
    key,
    label,
    "not measured",
    "unmeasured",
    "This signal wasn't measured for this answer.",
  );
}

/** Concatenated text of a presence summary, for linting (defense-in-depth). */
export function presenceSummaryText(s: PresenceSummary): string {
  return s.bands.map((b) => `${b.label} ${b.value} ${b.note}`).join("\n");
}
