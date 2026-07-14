/**
 * Centralized plan entitlements — the single source of truth for what each
 * plan allows (spec: "Plan permissions must come from centralized server-side
 * configuration. Do not scatter subscription logic across components"). The DB
 * `plans` table only maps Stripe price ids → keys and feeds marketing display;
 * enforcement numbers live here (AI_ARCHITECTURE.md §8, IMPLEMENTATION_PLAN
 * ratified decision #10). Not server-only: the pricing page reads the same
 * config for DISPLAY, but every limit is enforced server-side.
 */

export type PlanKey = "free" | "plus" | "pro";

/** Quota-metered AI features (matches the usage_feature DB enum). */
export type MeteredFeature =
  | "brief_generate"
  | "section_regenerate"
  | "questions_generate"
  | "story_suggest"
  | "practice_session"
  | "answer_feedback"
  | "delivery_feedback"; // Phase 8B — Video Delivery Analysis (Pro only)

/** Features tracked in the ledger for cost but not quota-limited in the beta. */
export type UnmeteredFeature =
  "practice_turn" | "readiness_advice" | "transcription";

export type UsageFeature = MeteredFeature | UnmeteredFeature;

export type PlanEntitlements = {
  key: PlanKey;
  name: string;
  priceCentsMonthly: number;
  /** Peel Brief analysis depth. */
  briefDepth: "basic" | "detailed";
  /** Interviewer-intel depth (spec: free = user-provided summary only). */
  interviewerIntel: "summary" | "detailed";
  /** Active interviews (draft|preparing). null = unlimited. */
  activeInterviews: number | null;
  /** Per-period quota for each metered feature. */
  limits: Record<MeteredFeature, number>;
  /** Optional daily fair-use sub-caps (unlimited-labeled plans). */
  dailyLimits: Partial<Record<MeteredFeature, number>>;
};

export const PLANS: Record<PlanKey, PlanEntitlements> = {
  free: {
    key: "free",
    name: "Free",
    priceCentsMonthly: 0,
    briefDepth: "basic",
    interviewerIntel: "summary",
    activeInterviews: 1,
    limits: {
      brief_generate: 1,
      section_regenerate: 3,
      questions_generate: 5,
      story_suggest: 0,
      practice_session: 1,
      answer_feedback: 2,
      delivery_feedback: 0,
    },
    dailyLimits: {},
  },
  plus: {
    key: "plus",
    name: "Plus",
    priceCentsMonthly: 1900,
    briefDepth: "detailed",
    interviewerIntel: "detailed",
    activeInterviews: null,
    limits: {
      brief_generate: 30,
      section_regenerate: 60,
      questions_generate: 300,
      story_suggest: 40,
      practice_session: 3,
      answer_feedback: 20,
      delivery_feedback: 0,
    },
    dailyLimits: { brief_generate: 10 },
  },
  pro: {
    key: "pro",
    name: "Pro",
    priceCentsMonthly: 3900,
    briefDepth: "detailed",
    interviewerIntel: "detailed",
    activeInterviews: null,
    limits: {
      brief_generate: 60,
      section_regenerate: 150,
      questions_generate: 600,
      story_suggest: 100,
      practice_session: 10,
      answer_feedback: 100,
      delivery_feedback: 20,
    },
    dailyLimits: { brief_generate: 15 },
  },
};

export const PLAN_KEYS = Object.keys(PLANS) as PlanKey[];

export function isPlanKey(value: string): value is PlanKey {
  return value in PLANS;
}

export function getPlan(key: PlanKey): PlanEntitlements {
  return PLANS[key];
}

/**
 * A subscription's *effective* plan. A past_due / canceled / incomplete
 * subscription downgrades to free limits, but stored work is never deleted
 * (spec). trialing and active honor the paid plan.
 */
export function effectivePlanKey(sub: {
  plan_key: string;
  status: string;
}): PlanKey {
  if (!isPlanKey(sub.plan_key)) return "free";
  if (sub.status === "active" || sub.status === "trialing") return sub.plan_key;
  return "free";
}

export function getFeatureLimit(
  planKey: PlanKey,
  feature: MeteredFeature,
): number {
  return PLANS[planKey].limits[feature];
}

export function getDailyLimit(
  planKey: PlanKey,
  feature: MeteredFeature,
): number | undefined {
  return PLANS[planKey].dailyLimits[feature];
}
