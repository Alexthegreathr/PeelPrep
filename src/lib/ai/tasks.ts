/**
 * The canonical set of AI tasks (AI_ARCHITECTURE.md §4). One task = one
 * versioned prompt + one Zod output schema + one persistence target.
 */
export const AI_TASKS = [
  "company_analysis",
  "role_analysis",
  "interviewer_analysis",
  "themes_and_risks",
  "question_generation",
  "story_recommendation",
  "questions_to_ask",
  "mock_interview_turn",
  "answer_evaluation",
  "readiness_advice",
  "condensed_brief",
  "checklist_suggestions",
  "delivery_feedback", // Phase 8B — Video Delivery Analysis
] as const;

export type AiTask = (typeof AI_TASKS)[number];

export function isAiTask(value: string): value is AiTask {
  return (AI_TASKS as readonly string[]).includes(value);
}
