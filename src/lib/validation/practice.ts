import * as z from "zod";

import { QUESTION_CATEGORIES } from "@/lib/validation/story";
import { INTERVIEW_STAGES } from "@/lib/validation/interview";

/** Practice-session configuration (Zod-validated, stored as jsonb). */
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const INTERVIEWER_STYLES = ["friendly", "neutral", "tough"] as const;

export const practiceConfigSchema = z.object({
  length: z.coerce.number().int().min(1).max(15).default(5),
  categories: z.array(z.enum(QUESTION_CATEGORIES)).max(12).default([]),
  difficulty: z.enum(DIFFICULTIES).default("medium"),
  stage: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.enum(INTERVIEW_STAGES).optional(),
  ),
  interviewerStyle: z.enum(INTERVIEWER_STYLES).default("neutral"),
  focusWeaknesses: z.string().trim().max(500).optional(),
});

export type PracticeConfigInput = z.infer<typeof practiceConfigSchema>;

export const answerSubmitSchema = z.object({
  text: z.string().trim().min(1, { error: "Type your answer." }).max(6000),
});
