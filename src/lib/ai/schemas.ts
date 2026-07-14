import * as z from "zod";

import type { AiTask } from "@/lib/ai/tasks";

/**
 * Zod output schemas per task (AI_ARCHITECTURE.md §4). API-constrained
 * structured output plus this parse are the two gates on model output; invalid
 * output is never persisted. Every claim-bearing section carries a `basis`
 * ("source" vs "general_knowledge") and uncertainty notes; interviewer schemas
 * have NO personal-attribute fields by design.
 */

export const Basis = z.enum(["source", "general_knowledge"]);

const QUESTION_CATEGORIES = [
  "introductory",
  "behavioral",
  "situational",
  "role_specific",
  "technical",
  "company_specific",
  "interviewer_informed",
  "motivation_fit",
  "leadership",
  "conflict",
  "failure",
  "closing",
] as const;
export const QuestionCategory = z.enum(QUESTION_CATEGORIES);

const priorityItem = z.object({
  text: z.string().min(1),
  why: z.string().min(1),
});

export const companyAnalysisSchema = z.object({
  overview: z.string().min(1),
  overview_basis: Basis,
  business_model: z.string().nullable().default(null),
  products: z.array(z.string()).default([]),
  competitors: z.array(z.string()).default([]),
  culture_signals: z.array(z.string()).default([]),
  priorities: z.array(priorityItem).default([]),
  challenges: z.array(z.string()).default([]),
  role_connections: z.array(z.string()).default([]),
  uncertainty_notes: z.string().default(""),
  cited_source_ids: z.array(z.string()).default([]),
});

export const roleAnalysisSchema = z.object({
  responsibilities: z.array(z.string()).default([]),
  required_skills: z.array(z.string()).default([]),
  preferred_skills: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  seniority: z.string().default(""),
  evaluation_criteria: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
  emphasize: z.array(z.string()).default([]),
  basis: Basis,
  uncertainty_notes: z.string().default(""),
  cited_source_ids: z.array(z.string()).default([]),
});

// No personal-attribute fields exist here by design (SECURITY.md §8).
export const interviewerAnalysisSchema = z.object({
  interviewers: z
    .array(
      z.object({
        name: z.string().min(1),
        professional_summary: z.string().default(""),
        expertise: z.array(z.string()).default([]),
        likely_perspective: z.string().default(""),
        suggested_rapport_topics: z.array(z.string()).default([]),
        basis: Basis,
      }),
    )
    .default([]),
  uncertainty_notes: z.string().default(""),
});

export const themesAndRisksSchema = z.object({
  likely_themes: z
    .array(z.object({ theme: z.string().min(1), why: z.string().default("") }))
    .default([]),
  risks_gaps: z
    .array(
      z.object({ risk: z.string().min(1), mitigation: z.string().default("") }),
    )
    .default([]),
  next_action: z.string().default(""),
  uncertainty_notes: z.string().default(""),
});

export const questionGenerationSchema = z.object({
  questions: z
    .array(
      z.object({
        category: QuestionCategory,
        text: z.string().min(1),
        why_asked: z.string().default(""),
        evaluates: z.string().default(""),
        suggested_structure: z.string().default(""),
        recommended_story_hint: z.string().nullable().default(null),
      }),
    )
    .default([]),
});

export const storyRecommendationSchema = z.object({
  matches: z
    .array(
      z.object({
        question_id: z.string(),
        story_id: z.string(),
        rationale: z.string().default(""),
      }),
    )
    .default([]),
  draft_suggestions: z
    .array(
      z.object({
        title: z.string().min(1),
        // Must cite a supplied source; the model may not invent experiences.
        based_on: z.string().min(1),
        situation: z.string().nullable().default(null),
        task: z.string().nullable().default(null),
        action: z.string().nullable().default(null),
        result: z.string().nullable().default(null),
        missing_info_questions: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});

export const questionsToAskSchema = z.object({
  questions: z
    .array(
      z.object({
        text: z.string().min(1),
        why_it_lands: z.string().default(""),
      }),
    )
    .default([]),
});

export const mockInterviewTurnSchema = z.object({
  turn_type: z.enum(["question", "followup", "wrapup"]),
  content: z.string().min(1),
  references_question_id: z.string().nullable().default(null),
});

const RUBRIC_CRITERIA = [
  "relevance",
  "clarity",
  "structure",
  "specificity",
  "evidence",
  "measurable_results",
  "conciseness",
  "authenticity",
  "confidence",
  "completion",
] as const;
const criterion = z.object({
  score: z.number().min(0).max(5),
  comment: z.string().default(""),
});
export const answerEvaluationSchema = z.object({
  rubric: z.object(
    Object.fromEntries(RUBRIC_CRITERIA.map((k) => [k, criterion])) as Record<
      (typeof RUBRIC_CRITERIA)[number],
      typeof criterion
    >,
  ),
  worked_well: z.string().default(""),
  unclear: z.string().default(""),
  missing: z.string().default(""),
  top_improvement: z.string().min(1),
  improved_outline: z.string().nullable().default(null),
  // Built only from user-provided facts; null when facts are missing.
  example_answer: z.string().nullable().default(null),
  insufficient_facts: z.boolean().default(false),
});

export const readinessAdviceSchema = z.object({
  recommended_action: z.string().min(1),
  rationale: z.string().default(""),
});

export const condensedBriefSchema = z.object({
  tldr: z.string().min(1),
  last_minute_checklist: z.array(z.string()).default([]),
});

export const checklistSuggestionsSchema = z.object({
  items: z
    .array(
      z.object({
        label: z.string().min(1),
        detail: z.string().nullable().default(null),
      }),
    )
    .default([]),
});

// Phase 8B — observational delivery coaching (AI_ARCHITECTURE.md §10).
export const deliveryFeedbackSchema = z.object({
  observable_strengths: z.array(z.string()).default([]),
  // Issues phrased as observations tied to a measurement.
  delivery_observations: z.array(z.string()).default([]),
  top_improvement: z.string().min(1),
  camera_setup_advice: z.string().default(""),
  speaking_advice: z.string().default(""),
  practice_exercise: z.string().default(""),
  // Required, non-empty: uncertainty + measurement limitations.
  uncertainty_and_limitations: z.string().min(1),
});

export const TASK_SCHEMAS = {
  company_analysis: companyAnalysisSchema,
  role_analysis: roleAnalysisSchema,
  interviewer_analysis: interviewerAnalysisSchema,
  themes_and_risks: themesAndRisksSchema,
  question_generation: questionGenerationSchema,
  story_recommendation: storyRecommendationSchema,
  questions_to_ask: questionsToAskSchema,
  mock_interview_turn: mockInterviewTurnSchema,
  answer_evaluation: answerEvaluationSchema,
  readiness_advice: readinessAdviceSchema,
  condensed_brief: condensedBriefSchema,
  checklist_suggestions: checklistSuggestionsSchema,
  delivery_feedback: deliveryFeedbackSchema,
} satisfies Record<AiTask, z.ZodType>;

export type TaskOutput<T extends AiTask> = z.infer<(typeof TASK_SCHEMAS)[T]>;
export type CompanyAnalysis = z.infer<typeof companyAnalysisSchema>;
export type RoleAnalysis = z.infer<typeof roleAnalysisSchema>;
export type InterviewerAnalysis = z.infer<typeof interviewerAnalysisSchema>;
export type ThemesAndRisks = z.infer<typeof themesAndRisksSchema>;
export type QuestionGeneration = z.infer<typeof questionGenerationSchema>;
export type AnswerEvaluation = z.infer<typeof answerEvaluationSchema>;
export type MockInterviewTurn = z.infer<typeof mockInterviewTurnSchema>;
