"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { CircleAlert } from "lucide-react";

import { loginAction } from "@/app/(auth)/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared/field-error";
import { SubmitButton } from "@/components/shared/submit-button";
import { initialFormState } from "@/lib/validation/form-state";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, initialFormState);
  const emailId = useId();
  const passwordId = useId();

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>
            <p>{state.message}</p>
            {state.code === "email_not_confirmed" ? (
              <p>
                Need a new link?{" "}
                <Link className="underline" href="/reset-password">
                  Resend from here
                </Link>
                .
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

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
        <div className="flex items-center justify-between">
          <Label htmlFor={passwordId}>Password</Label>
          <Link
            href="/reset-password"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={`${passwordId}-error`}
        />
        <FieldError
          id={`${passwordId}-error`}
          messages={state.fieldErrors?.password}
        />
      </div>

      <SubmitButton pendingLabel="Signing in…" className="mt-1 w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
