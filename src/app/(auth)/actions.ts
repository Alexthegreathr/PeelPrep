"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkAuthRateLimit } from "@/lib/security/rate-limit";
import { CONSENT_VERSIONS } from "@/lib/auth/consent";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { getAuthRedirectBase } from "@/lib/auth/site-url";
import {
  loginSchema,
  signupSchema,
  resetRequestSchema,
  updatePasswordSchema,
} from "@/lib/validation/auth";
import { type FormState } from "@/lib/validation/form-state";

const RATE_LIMITED: FormState = {
  status: "error",
  message: "Too many attempts. Please wait a few minutes and try again.",
};

const GENERIC_ERROR: FormState = {
  status: "error",
  message: "Something went wrong. Please try again.",
};

// ── Login ────────────────────────────────────────────────────────────────

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: { email: String(formData.get("email") ?? "") },
    };
  }

  const { email, password, next } = parsed.data;

  if (!(await checkAuthRateLimit("login", email))) {
    return { ...RATE_LIMITED, values: { email } };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Supabase returns "email_not_confirmed" when verification is pending.
    if (error.code === "email_not_confirmed") {
      return {
        status: "error",
        code: "email_not_confirmed",
        message:
          "Please confirm your email address first. Check your inbox for the confirmation link.",
        values: { email },
      };
    }
    // Generic message for invalid credentials — no account-existence oracle.
    return {
      status: "error",
      message: "Invalid email or password.",
      values: { email },
    };
  }

  redirect(sanitizeNextPath(next));
}

// ── Signup ───────────────────────────────────────────────────────────────

export async function signupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    acceptTerms: formData.get("acceptTerms"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: {
        email: String(formData.get("email") ?? ""),
        fullName: String(formData.get("fullName") ?? ""),
      },
    };
  }

  const { fullName, email, password } = parsed.data;

  if (!(await checkAuthRateLimit("signup", email))) {
    return { ...RATE_LIMITED, values: { email, fullName: fullName ?? "" } };
  }

  const redirectBase = await getAuthRedirectBase();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${redirectBase}/auth/confirm`,
      data: fullName ? { full_name: fullName } : undefined,
    },
  });

  if (error) {
    if (error.code === "over_email_send_rate_limit") {
      return { ...RATE_LIMITED, values: { email, fullName: fullName ?? "" } };
    }
    return { ...GENERIC_ERROR, values: { email, fullName: fullName ?? "" } };
  }

  // Record versioned ToS + privacy consent rows (SECURITY.md §9). The signup
  // trigger has already created the profiles row, so these FKs resolve. Uses
  // the admin client because there is no user session until email confirmation.
  const userId = data.user?.id;
  if (userId) {
    try {
      const admin = createSupabaseAdminClient();
      const now = new Date().toISOString();
      await admin.from("user_consents").upsert(
        [
          {
            user_id: userId,
            consent_type: "terms_of_service",
            version: CONSENT_VERSIONS.terms_of_service,
            granted: true,
            granted_at: now,
          },
          {
            user_id: userId,
            consent_type: "privacy_policy",
            version: CONSENT_VERSIONS.privacy_policy,
            granted: true,
            granted_at: now,
          },
        ],
        { onConflict: "user_id,consent_type,version", ignoreDuplicates: true },
      );
    } catch (consentError) {
      // Do not block signup on consent bookkeeping; log for follow-up.
      console.error("failed to record signup consents", consentError);
    }
  }

  return {
    status: "success",
    message:
      "Check your email to confirm your account. The link will bring you back to sign in.",
    values: { email },
  };
}

// ── Password reset request ────────────────────────────────────────────────

export async function requestPasswordResetAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: { email: String(formData.get("email") ?? "") },
    };
  }

  const { email } = parsed.data;

  // Always report the same outcome regardless of whether the account exists
  // (no user-enumeration oracle). Rate-limited to curb abuse.
  const successState: FormState = {
    status: "success",
    message:
      "If an account exists for that email, we've sent a password reset link. Check your inbox.",
  };

  if (!(await checkAuthRateLimit("reset", email))) {
    return successState;
  }

  // Pass a clean base — the recovery email template appends token_hash, type,
  // and next. This value becomes {{ .RedirectTo }} in the template.
  const redirectBase = await getAuthRedirectBase();
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${redirectBase}/auth/confirm`,
  });

  return successState;
}

// ── Update password (from a recovery session) ─────────────────────────────

export async function updatePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();

  // Requires the recovery session established by /auth/confirm's verifyOtp.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      status: "error",
      message:
        "Your reset link has expired. Request a new password reset email and try again.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === "same_password") {
      return {
        status: "error",
        message: "Choose a password different from your current one.",
      };
    }
    return GENERIC_ERROR;
  }

  redirect("/dashboard");
}
