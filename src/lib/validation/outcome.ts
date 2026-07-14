import * as z from "zod";

/** Outcome-tracking schema (PRODUCT_SPEC §Outcome Tracking). */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const rating1to5 = z.preprocess(
  (v) => (v === "" || v == null ? undefined : Number(v)),
  z.number().int().min(1).max(5).optional(),
);

// A yes/no/unknown select: "" → undefined, "yes" → true, "no" → false.
const triState = z.preprocess(
  (v) => (v === "yes" ? true : v === "no" ? false : undefined),
  z.boolean().optional(),
);

export const outcomeSchema = z.object({
  completedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  difficulty: rating1to5,
  questionsEncountered: optionalText(4000),
  wentWell: optionalText(4000),
  wentPoorly: optionalText(4000),
  confidence: rating1to5,
  advanced: triState,
  receivedOffer: triState,
  privateNotes: optionalText(4000),
  lessons: optionalText(4000),
});

export type OutcomeInput = z.infer<typeof outcomeSchema>;
