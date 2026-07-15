"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { CircleAlert, CircleCheck, Eye, EyeOff } from "lucide-react";

import { signupAction } from "@/app/(auth)/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared/field-error";
import { SubmitButton } from "@/components/shared/submit-button";
import { initialFormState } from "@/lib/validation/form-state";

export function SignupForm() {
  const [state, action] = useActionState(signupAction, initialFormState);
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const termsId = useId();
  const [showPassword, setShowPassword] = useState(false);

  if (state.status === "success") {
    return (
      <Alert variant="success">
        <CircleCheck aria-hidden="true" />
        <AlertTitle>Confirm your email</AlertTitle>
        <AlertDescription>
          <p>{state.message}</p>
          <p>
            Already confirmed?{" "}
            <Link className="underline" href="/login">
              Sign in
            </Link>
            .
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>
            <p>{state.message}</p>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor={nameId}>Full name</Label>
        <Input
          id={nameId}
          name="fullName"
          type="text"
          autoComplete="name"
          defaultValue={state.values?.fullName}
          aria-invalid={Boolean(state.fieldErrors?.fullName)}
          aria-describedby={`${nameId}-error`}
        />
        <FieldError
          id={`${nameId}-error`}
          messages={state.fieldErrors?.fullName}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={emailId}>Email</Label>
        <Input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={`${emailId}-error`}
        />
        <FieldError
          id={`${emailId}-error`}
          messages={state.fieldErrors?.email}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={passwordId}>Password</Label>
        <div className="relative">
          <Input
            id={passwordId}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            className="pr-10"
            aria-invalid={Boolean(state.fieldErrors?.password)}
            aria-describedby={`${passwordId}-error ${passwordId}-hint`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <p id={`${passwordId}-hint`} className="text-xs text-muted-foreground">
          At least 8 characters, including a letter and a number.
        </p>
        <FieldError
          id={`${passwordId}-error`}
          messages={state.fieldErrors?.password}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <input
            id={termsId}
            name="acceptTerms"
            type="checkbox"
            className="mt-0.5 size-4 rounded border-input accent-[#13213c]"
            aria-invalid={Boolean(state.fieldErrors?.acceptTerms)}
            aria-describedby={`${termsId}-error`}
          />
          <Label htmlFor={termsId} className="text-sm font-normal leading-snug">
            <span>
              I agree to the{" "}
              <Link className="underline" href="/terms">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link className="underline" href="/privacy">
                Privacy Policy
              </Link>
              .
            </span>
          </Label>
        </div>
        <FieldError
          id={`${termsId}-error`}
          messages={state.fieldErrors?.acceptTerms}
        />
      </div>

      <SubmitButton pendingLabel="Creating account…" className="mt-1 w-full">
        Create account
      </SubmitButton>
    </form>
  );
}
