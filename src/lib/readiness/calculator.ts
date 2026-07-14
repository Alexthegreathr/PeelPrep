/**
 * Deterministic readiness score (PRODUCT_SPEC §Readiness Score). The numeric
 * score is a PURE function of measurable stored data — the AI never invents it.
 * Weights sum to exactly 100. Video Delivery Analysis contributes ZERO weight,
 * so a 100 is reachable with typed practice only (no camera/microphone).
 */
export const READINESS_WEIGHTS = {
  company_understanding: 15,
  role_understanding: 15,
  interviewer_context: 10,
  stories_prepared: 20,
  questions_practiced: 20,
  answer_quality: 15,
  questions_to_ask: 5,
} as const;

export type ReadinessComponentKey = keyof typeof READINESS_WEIGHTS;

export type ReadinessInputs = {
  /** Ready company brief sections (overview, priorities): 0–2. */
  companySectionsReady: number;
  roleReady: boolean;
  interviewerIntelReady: boolean;
  interviewersCount: number;
  storiesCount: number;
  /** Practice answers the candidate has given. */
  answersCount: number;
  /** Average rubric score (0–5) across answers with feedback, or null. */
  avgRubric: number | null;
  questionsToAskReady: boolean;
};

export type ReadinessComponent = {
  component: ReadinessComponentKey;
  raw: number; // 0–1
  weight: number;
  weightedPoints: number;
  explanation: string;
};

export type ReadinessResult = {
  score: number; // 0–100
  components: ReadinessComponent[];
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const STORY_TARGET = 3;
const PRACTICE_TARGET = 5;

export function computeReadiness(inputs: ReadinessInputs): ReadinessResult {
  const raws: Record<
    ReadinessComponentKey,
    { raw: number; explanation: string }
  > = {
    company_understanding: {
      raw: clamp01(inputs.companySectionsReady / 2),
      explanation: `${inputs.companySectionsReady} of 2 company brief sections generated.`,
    },
    role_understanding: {
      raw: inputs.roleReady ? 1 : 0,
      explanation: inputs.roleReady
        ? "Role analysis generated."
        : "Role analysis not generated yet.",
    },
    interviewer_context: {
      raw: inputs.interviewerIntelReady
        ? 1
        : inputs.interviewersCount > 0
          ? 0.5
          : 0,
      explanation: inputs.interviewerIntelReady
        ? "Interviewer intelligence generated."
        : inputs.interviewersCount > 0
          ? "Interviewers added; intelligence not generated yet."
          : "No interviewers added yet.",
    },
    stories_prepared: {
      raw: clamp01(inputs.storiesCount / STORY_TARGET),
      explanation: `${inputs.storiesCount} of ${STORY_TARGET} target stories in your bank.`,
    },
    questions_practiced: {
      raw: clamp01(inputs.answersCount / PRACTICE_TARGET),
      explanation: `${inputs.answersCount} of ${PRACTICE_TARGET} target practice answers.`,
    },
    answer_quality: {
      raw: inputs.avgRubric != null ? clamp01(inputs.avgRubric / 5) : 0,
      explanation:
        inputs.avgRubric != null
          ? `Average answer rubric ${inputs.avgRubric.toFixed(1)}/5.`
          : "No answer feedback yet.",
    },
    questions_to_ask: {
      raw: inputs.questionsToAskReady ? 1 : 0,
      explanation: inputs.questionsToAskReady
        ? "Questions-to-ask generated."
        : "Questions to ask not generated yet.",
    },
  };

  const components: ReadinessComponent[] = (
    Object.keys(READINESS_WEIGHTS) as ReadinessComponentKey[]
  ).map((component) => {
    const weight = READINESS_WEIGHTS[component];
    const { raw, explanation } = raws[component];
    return {
      component,
      raw,
      weight,
      weightedPoints: Math.round(raw * weight * 100) / 100,
      explanation,
    };
  });

  const score = Math.round(
    components.reduce((sum, c) => sum + c.raw * c.weight, 0),
  );
  return { score, components };
}

export const READINESS_COMPONENT_LABELS: Record<ReadinessComponentKey, string> =
  {
    company_understanding: "Company understanding",
    role_understanding: "Role understanding",
    interviewer_context: "Interviewer context",
    stories_prepared: "Stories prepared",
    questions_practiced: "Questions practiced",
    answer_quality: "Answer quality",
    questions_to_ask: "Questions to ask",
  };
