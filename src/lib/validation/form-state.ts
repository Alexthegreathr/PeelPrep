/**
 * Shared result shape for useActionState-driven forms. Actions echo safe
 * field values back for repopulation — never passwords.
 */
export type FormState = {
  status: "idle" | "error" | "success";
  /** Top-level message (error summary or success confirmation). */
  message?: string;
  /** Machine-readable code for special UI states (e.g. email_not_confirmed). */
  code?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle" };
