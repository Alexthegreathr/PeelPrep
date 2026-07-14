import {
  AiError,
  type AiProvider,
  type StructuredRequest,
  type StructuredResult,
} from "@/lib/ai/provider";
import type { AiTask } from "@/lib/ai/tasks";

/**
 * Deterministic mock provider (AI_ARCHITECTURE.md §2) for dev / demo / tests.
 * Output is clearly fictional. Failures are injected deterministically for
 * tests via MOCK_AI_FAIL_CODE (never random, so the ledger refund/retry paths
 * are reproducible):
 *   provider_unavailable | timeout | refused → throw that AiError
 *   validation                                → always fail schema validation
 *   validation_once                           → fail first, succeed on repair
 */
export const REPAIR_MARKER = "[Repair]";

const MOCK_FIXTURES: Record<AiTask, unknown> = {
  company_analysis: {
    overview:
      "Acme Fruit Logistics is a fictional company that moves perishable produce with a technology-first supply chain. (Demo content — fictional.)",
    overview_basis: "source",
    business_model: "B2B logistics subscriptions and per-shipment fees.",
    products: ["ColdChain tracking", "Ripeness forecasting", "Route optimizer"],
    competitors: ["FreshMove", "Produce Rail"],
    culture_signals: ["Bias to action", "Customer obsession"],
    priorities: [
      { text: "Reduce spoilage in transit", why: "Directly protects margin." },
      {
        text: "Expand into new regions",
        why: "Growth objective for the year.",
      },
    ],
    challenges: ["Thin logistics margins", "Seasonal demand swings"],
    role_connections: [
      "This role owns the reliability of the tracking platform.",
    ],
    uncertainty_notes:
      "Current external research isn't available in this version; this analysis uses only what you provided plus general knowledge.",
    cited_source_ids: [],
  },
  role_analysis: {
    responsibilities: [
      "Build resilient services",
      "Own reliability",
      "Mentor peers",
    ],
    required_skills: ["Distributed systems", "TypeScript", "On-call ownership"],
    preferred_skills: ["Event streaming", "Observability"],
    keywords: ["reliability", "scale", "ownership"],
    seniority: "Senior individual contributor",
    evaluation_criteria: ["System design depth", "Ownership mindset"],
    strengths: ["Your logistics background maps directly to the domain."],
    gaps: ["Emphasize any large-scale streaming experience if you have it."],
    emphasize: ["A story about improving reliability under load."],
    basis: "source",
    uncertainty_notes: "",
    cited_source_ids: [],
  },
  interviewer_analysis: {
    interviewers: [
      {
        name: "Jordan Vale",
        professional_summary:
          "Engineering leader focused on platform reliability (from the background you provided).",
        expertise: ["Platform engineering", "Reliability"],
        likely_perspective:
          "Likely to probe how you reason about failure modes and trade-offs.",
        suggested_rapport_topics: [
          "Reliability culture",
          "Mentoring engineers",
        ],
        basis: "source",
      },
    ],
    uncertainty_notes:
      "Based only on the professional background you supplied. Predictions are suggestions, not verified facts.",
  },
  themes_and_risks: {
    likely_themes: [
      { theme: "System design under constraints", why: "Core to the role." },
      {
        theme: "Ownership & incident response",
        why: "Named in the description.",
      },
    ],
    risks_gaps: [
      {
        risk: "Limited streaming detail on your résumé",
        mitigation: "Prepare a concrete example or acknowledge how you'd ramp.",
      },
    ],
    next_action: "Draft one reliability STAR story and practice it out loud.",
    uncertainty_notes: "",
  },
  question_generation: {
    questions: [
      {
        category: "behavioral",
        text: "Tell me about a time you improved the reliability of a system.",
        why_asked: "Reliability is central to this role.",
        evaluates: "Ownership and systems thinking.",
        suggested_structure: "STAR — quantify the before/after.",
        recommended_story_hint: "Your logistics platform reliability work.",
      },
      {
        category: "technical",
        text: "How would you design a resilient shipment-tracking pipeline?",
        why_asked: "Maps to the team's core system.",
        evaluates: "System design depth.",
        suggested_structure:
          "Clarify requirements, then components, then trade-offs.",
        recommended_story_hint: null,
      },
      {
        category: "motivation_fit",
        text: "Why Acme Fruit Logistics?",
        why_asked: "Gauges genuine interest.",
        evaluates: "Motivation and fit.",
        suggested_structure: "Connect their priorities to your goals.",
        recommended_story_hint: null,
      },
      {
        category: "situational",
        text: "A shipment is spoiling in transit and alerts are down. What do you do?",
        why_asked: "Tests incident judgement.",
        evaluates: "Prioritization under pressure.",
        suggested_structure: "Stabilize, communicate, then root-cause.",
        recommended_story_hint: null,
      },
      {
        category: "closing",
        text: "What questions do you have for us?",
        why_asked: "Standard close.",
        evaluates: "Engagement and preparation.",
        suggested_structure:
          "Ask about reliability culture and success in 90 days.",
        recommended_story_hint: null,
      },
    ],
  },
  story_recommendation: {
    matches: [],
    draft_suggestions: [
      {
        title: "Improving tracking reliability",
        based_on: "Your résumé mentions leading a logistics platform team.",
        situation:
          "The tracking pipeline had frequent gaps (from your résumé).",
        task: null,
        action: null,
        result: null,
        missing_info_questions: [
          "What was the measurable improvement (e.g. uptime %, spoilage reduction)?",
          "What specific actions did you personally take?",
        ],
      },
    ],
  },
  questions_to_ask: {
    questions: [
      {
        text: "How does the team measure and improve reliability today?",
        why_it_lands: "Shows you think about outcomes, not just features.",
      },
      {
        text: "What would success in this role look like after 90 days?",
        why_it_lands: "Signals ownership and planning.",
      },
    ],
  },
  mock_interview_turn: {
    turn_type: "question",
    content:
      "Let's start: tell me about a time you improved the reliability of a system you owned.",
    references_question_id: null,
  },
  answer_evaluation: {
    rubric: {
      relevance: { score: 4, comment: "Directly addressed the question." },
      clarity: { score: 4, comment: "Clear structure." },
      structure: { score: 3, comment: "Mostly STAR; the result was thin." },
      specificity: { score: 3, comment: "Add concrete numbers." },
      evidence: { score: 3, comment: "Some evidence; quantify more." },
      measurable_results: { score: 2, comment: "No measurable outcome given." },
      conciseness: { score: 4, comment: "Well-paced." },
      authenticity: { score: 4, comment: "Reads as your own experience." },
      confidence: { score: 4, comment: "Assured wording." },
      completion: { score: 4, comment: "Answered the question fully." },
    },
    worked_well: "You framed the situation and your ownership clearly.",
    unclear: "The specific actions blurred together.",
    missing: "A measurable result.",
    top_improvement: "Add one concrete metric that shows the impact.",
    improved_outline:
      "Situation → your specific actions → a measured result → what you learned.",
    example_answer: null,
    insufficient_facts: true,
  },
  readiness_advice: {
    recommended_action:
      "Practice two behavioral answers and save one to your story bank.",
    rationale:
      "Your stories and practice components are the biggest gaps right now.",
  },
  condensed_brief: {
    tldr: "Senior reliability role at a fictional produce-logistics company. Lead with a quantified reliability story; ask about their reliability culture.",
    last_minute_checklist: [
      "Re-read your reliability STAR story",
      "Prepare 2 questions to ask",
      "Confirm the meeting link and time",
    ],
  },
  checklist_suggestions: {
    items: [
      {
        label: "Research recent company news",
        detail: "Skim their blog/press.",
      },
      { label: "Prepare 3 STAR stories", detail: null },
      { label: "Test your video setup", detail: "Camera, mic, lighting." },
    ],
  },
};

function hashInput(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export class MockAiProvider implements AiProvider {
  readonly name = "mock" as const;

  async generateStructured<T>(
    req: StructuredRequest<T>,
  ): Promise<StructuredResult<T>> {
    const start = performance.now();
    const failCode = process.env.MOCK_AI_FAIL_CODE;
    const isRepair = req.input.includes(REPAIR_MARKER);

    if (failCode === "provider_unavailable")
      throw new AiError("provider_unavailable", "mock provider unavailable");
    if (failCode === "timeout") throw new AiError("timeout", "mock timeout");
    if (failCode === "refused") throw new AiError("refused", "mock refusal");
    if (failCode === "validation")
      throw new AiError("validation_failed", "mock invalid output");
    if (failCode === "validation_once" && !isRepair)
      throw new AiError("validation_failed", "mock invalid output (first try)");

    const fixture = MOCK_FIXTURES[req.task];
    const parsed = req.schema.safeParse(fixture);
    if (!parsed.success) {
      throw new AiError(
        "validation_failed",
        `mock fixture for ${req.task} did not match schema`,
      );
    }

    // Deterministic pseudo latency + token counts seeded by the input.
    const seed = hashInput(req.input);
    const durationMs = 200 + (seed % 600);
    const inputTokens = 400 + (seed % 800);
    const outputTokens = 200 + (seed % 400);

    return {
      ok: true,
      data: parsed.data,
      usage: { inputTokens, outputTokens },
      model: req.model,
      durationMs: Math.round(performance.now() - start) || durationMs,
    };
  }
}
