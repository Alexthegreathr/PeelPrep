/**
 * Prohibited-claims linter for delivery feedback (AI_ARCHITECTURE.md §10). A
 * post-validation gate that rejects any output implying the user is nervous,
 * dishonest, lacking confidence as a person, emotionally unstable, a personality
 * type, likely to be liked/disliked, or guaranteed an outcome — or that infers
 * emotion, health, disability, or mental state. Violations trigger the standard
 * repair-retry → refund path (§7). Coaching is about the answer as delivered.
 */
const BANNED: { pattern: RegExp; label: string }[] = [
  { pattern: /\bnervous(ness)?\b/i, label: "nervousness" },
  { pattern: /\banxi(ous|ety)\b/i, label: "anxiety" },
  { pattern: /\b(jittery|shaky|fidgety)\b/i, label: "emotional-state" },
  { pattern: /\black(s|ing|ed)?\s+confidence\b/i, label: "lacks-confidence" },
  {
    pattern: /\b(under[- ]?confident|not\s+confident|insecure)\b/i,
    label: "confidence-judgment",
  },
  {
    pattern: /\b(dishonest|deceptive|deception|lying|liar|untrustworthy)\b/i,
    label: "honesty-judgment",
  },
  {
    pattern: /\b(unstable|erratic|volatile)\b/i,
    label: "emotional-instability",
  },
  { pattern: /\bpersonality\s+(type|trait|disorder)\b/i, label: "personality" },
  { pattern: /\b(introvert|extrovert|neurotic)\b/i, label: "personality-type" },
  {
    pattern: /\b(will|won'?t|won’t|going\s+to)\s+(be\s+)?(dis)?like[ds]?\b/i,
    label: "liked-disliked",
  },
  { pattern: /\b(un)?lik(e)?able\b/i, label: "liked-disliked" },
  { pattern: /\bguarantee(d|s)?\b/i, label: "guaranteed-outcome" },
  {
    pattern: /\byou\s+will\s+(get|land|pass|fail|succeed|ace)\b/i,
    label: "outcome-prediction",
  },
  {
    pattern: /\b(depress(ed|ion)?|trauma|ptsd|adhd|autis(m|tic)|disorder)\b/i,
    label: "health-inference",
  },
  {
    pattern: /\b(mental\s+health|mental\s+state|disab(led|ility))\b/i,
    label: "health-inference",
  },
  {
    pattern: /\b(emotionally|psychologically)\b/i,
    label: "psychological-inference",
  },
];

export type LintResult = { ok: boolean; violations: string[] };

/** Lint the concatenated text of a delivery_feedback output. */
export function lintDeliveryText(text: string): LintResult {
  const violations = BANNED.filter((b) => b.pattern.test(text)).map(
    (b) => b.label,
  );
  return { ok: violations.length === 0, violations: [...new Set(violations)] };
}

/** Lint a structured delivery_feedback object. */
export function lintDeliveryFeedback(feedback: {
  observable_strengths?: string[];
  delivery_observations?: string[];
  top_improvement?: string;
  camera_setup_advice?: string;
  speaking_advice?: string;
  practice_exercise?: string;
  uncertainty_and_limitations?: string;
}): LintResult {
  const text = [
    ...(feedback.observable_strengths ?? []),
    ...(feedback.delivery_observations ?? []),
    feedback.top_improvement ?? "",
    feedback.camera_setup_advice ?? "",
    feedback.speaking_advice ?? "",
    feedback.practice_exercise ?? "",
    feedback.uncertainty_and_limitations ?? "",
  ].join("\n");
  return lintDeliveryText(text);
}
