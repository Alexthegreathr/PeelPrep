import * as z from "zod";

/** Story-bank + question schemas (validated on the server in every action). */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Keep this under ${max} characters.` })
    .optional()
    .transform((v) => (v ? v : undefined));

// Comma-separated input → trimmed, de-duplicated array (skills / tags).
const csvToArray = z
  .string()
  .default("")
  .transform((s) =>
    Array.from(
      new Set(
        s
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    ).slice(0, 20),
  );

export const storyFormSchema = z.object({
  title: z.string().trim().min(1, { error: "Add a title." }).max(200),
  situation: optionalText(4000),
  task: optionalText(4000),
  action: optionalText(4000),
  result: optionalText(4000),
  skills: csvToArray,
  measurableResult: optionalText(500),
  resumeReference: optionalText(500),
  answersQuestions: optionalText(1000),
  tags: csvToArray,
});

export type StoryFormInput = z.infer<typeof storyFormSchema>;

export const QUESTION_CATEGORIES = [
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

export const questionFormSchema = z.object({
  category: z.enum(QUESTION_CATEGORIES),
  text: z.string().trim().min(1, { error: "Add the question." }).max(1000),
});
