import * as z from "zod";
import { TZDate } from "@date-fns/tz";

import { optionalHttpUrl } from "@/lib/validation/url";

/**
 * Shared intake schemas. Per-step schemas are lenient so partial drafts save
 * cleanly (the DB defaults company/position to ''); confirmInterviewSchema
 * enforces the essentials before generation. Validated on the server in every
 * action; client use is UX only.
 */

// ── Enums (match the Postgres enums in migration 003) ────────────────────
export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "internship",
  "contract",
  "other",
] as const;
export const INTERVIEW_FORMATS = [
  "phone",
  "video",
  "onsite",
  "take_home",
  "other",
] as const;
export const INTERVIEW_STAGES = [
  "screen",
  "technical",
  "behavioral",
  "panel",
  "final",
  "other",
] as const;

/** An enum select whose empty option ("") means "not set". */
function optionalEnum<const T extends readonly [string, ...string[]]>(
  values: T,
) {
  return z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.enum(values).optional(),
  );
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Keep this under ${max} characters.` })
    .optional()
    .transform((v) => (v ? v : undefined));

// ── Step 1: Opportunity ──────────────────────────────────────────────────
export const opportunitySchema = z.object({
  companyName: z.string().trim().max(200).default(""),
  positionTitle: z.string().trim().max(200).default(""),
  jobDescription: optionalText(20000),
  jobPostingUrl: optionalHttpUrl,
  location: optionalText(200),
  employmentType: optionalEnum(EMPLOYMENT_TYPES),
});

// ── Step 2: Interview logistics ──────────────────────────────────────────
export const interviewDetailsSchema = z.object({
  interviewDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Choose a valid date." })
    .optional()
    .or(z.literal("").transform(() => undefined)),
  interviewTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, { error: "Choose a valid time." })
    .optional()
    .or(z.literal("").transform(() => undefined)),
  interviewTimezone: optionalText(64),
  format: optionalEnum(INTERVIEW_FORMATS),
  stage: optionalEnum(INTERVIEW_STAGES),
  durationMinutes: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().min(0).max(1440).optional(),
  ),
  meetingLocation: optionalText(300),
});

// ── Step 3: Interviewers ─────────────────────────────────────────────────
export const interviewerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Add the interviewer's name." })
    .max(200),
  title: optionalText(200),
  publicProfileUrl: optionalHttpUrl,
  manualBackground: optionalText(4000),
});
/** Lenient version for drafts: a half-filled interviewer row saves fine. */
export const interviewerDraftSchema = z.object({
  name: optionalText(200),
  title: optionalText(200),
  publicProfileUrl: optionalHttpUrl,
  manualBackground: optionalText(4000),
});
export const interviewersSchema = z.object({
  interviewers: z.array(interviewerSchema).max(10).default([]),
});

// ── Step 4: Candidate materials ──────────────────────────────────────────
export const materialsSchema = z.object({
  resumeDocumentId: z
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  coverLetterDocumentId: z
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  portfolioUrl: optionalHttpUrl,
  notes: optionalText(4000),
});

// ── Step 5: Confirmation (essentials required before generation) ─────────
export const confirmInterviewSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(1, { error: "Add the company name." })
    .max(200),
  positionTitle: z
    .string()
    .trim()
    .min(1, { error: "Add the position title." })
    .max(200),
});

// ── Whole-draft schema (the wizard saves its full state at once) ─────────
export const intakeDraftSchema = z.object({
  ...opportunitySchema.shape,
  ...interviewDetailsSchema.shape,
  ...materialsSchema.shape,
  interviewers: z.array(interviewerDraftSchema).max(10).default([]),
});

export type OpportunityInput = z.infer<typeof opportunitySchema>;
export type InterviewDetailsInput = z.infer<typeof interviewDetailsSchema>;
export type InterviewerInput = z.infer<typeof interviewerSchema>;
export type MaterialsInput = z.infer<typeof materialsSchema>;
export type IntakeDraftInput = z.infer<typeof intakeDraftSchema>;

/**
 * Combine a wall-clock date + time in an IANA zone into a UTC timestamp for
 * `interviews.interview_at`. Returns null when either part is missing.
 */
export function combineInterviewDateTime(
  date: string | undefined,
  time: string | undefined,
  timezone: string | undefined,
): string | null {
  if (!date || !time) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const zone = timezone || "UTC";
  const zoned = new TZDate(y, m - 1, d, hh, mm, 0, zone);
  const iso = zoned.toISOString();
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}
