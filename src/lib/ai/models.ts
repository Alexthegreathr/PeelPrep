import type { AiTask } from "@/lib/ai/tasks";

/**
 * Model selection (AI_ARCHITECTURE.md §3). Launch decision (ratified): a single
 * default model for every task; per-task tiering stays a one-line config change
 * if economics warrant it later. Overridable via AI_MODEL_DEFAULT.
 */
export const DEFAULT_MODEL = "claude-opus-4-8";

const PER_TASK_OVERRIDES: Partial<Record<AiTask, string>> = {
  // e.g. cheaper models for short tasks — none at launch.
};

export function modelForTask(task: AiTask): string {
  const base = process.env.AI_MODEL_DEFAULT || DEFAULT_MODEL;
  return PER_TASK_OVERRIDES[task] ?? base;
}

/** Per-task output token caps that bound worst-case spend (§3). */
export const MAX_OUTPUT_TOKENS: Record<AiTask, number> = {
  company_analysis: 3000,
  role_analysis: 3000,
  interviewer_analysis: 2500,
  themes_and_risks: 2500,
  question_generation: 3500,
  story_recommendation: 2500,
  questions_to_ask: 1500,
  mock_interview_turn: 1000,
  answer_evaluation: 2000,
  readiness_advice: 800,
  condensed_brief: 1500,
  checklist_suggestions: 1200,
  delivery_feedback: 1500,
};
