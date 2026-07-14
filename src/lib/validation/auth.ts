import * as z from "zod";

/**
 * Shared auth/profile schemas — validated on the server in every action
 * (client-side use is UX only, never the security boundary).
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address." }))
  .pipe(z.string().max(254, { error: "Email address is too long." }));

export const passwordSchema = z
  .string()
  .min(8, { error: "Password must be at least 8 characters long." })
  .max(72, { error: "Password must be at most 72 characters long." })
  .regex(/[a-zA-Z]/, { error: "Password must contain at least one letter." })
  .regex(/[0-9]/, { error: "Password must contain at least one number." });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Enter your password." }),
  // `formData.get("next")` is `null` when the hidden field is absent (a direct
  // visit to /login with no ?next=). `.nullish()` accepts string | null |
  // undefined — `.optional()` alone rejects null and would fail every plain
  // login with a hidden, unshown field error (regression guard: auth.test.ts).
  next: z.string().nullish(),
});

export const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .max(120, { error: "Name must be at most 120 characters." })
    .optional()
    .transform((value) => (value ? value : undefined)),
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z.literal("on", {
    error: "You must agree to the Terms of Service and Privacy Policy.",
  }),
});

export const resetRequestSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  });

function isValidTimezone(value: string): boolean {
  try {
    return Intl.supportedValuesOf("timeZone").includes(value);
  } catch {
    return false;
  }
}

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .max(120, { error: "Name must be at most 120 characters." }),
  headline: z
    .string()
    .trim()
    .max(160, { error: "Headline must be at most 160 characters." }),
  timezone: z
    .string()
    .refine(isValidTimezone, { error: "Choose a valid time zone." }),
});
