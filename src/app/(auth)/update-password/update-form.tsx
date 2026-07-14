"use client";

import { useActionState, useId } from "react";
import { CircleAlert } from "lucide-react";

import { updatePasswordAction } from "@/app/(auth)/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared/field-error";
import { SubmitButton } from "@/components/shared/submit-button";
import { initialFormState } from "@/lib/validation/form-state";

export function UpdatePasswordForm() {
  const [state, action] = useActionState(
    updatePasswordAction,
    initialFormState,
  );
  const passwordId = useId();
  const confirmId = useId();

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
        <Label htmlFor={passwordId}>New password</Label>
        <Input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={`${passwordId}-error ${passwordId}-hint`}
        />
        <p id={`${passwordId}-hint`} className="text-xs text-muted-foreground">
          At least 8 characters, including a letter and a number.
        </p>
        <FieldError
          id={`${passwordId}-error`}
          messages={state.fieldErrors?.password}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={confirmId}>Confirm new password</Label>
        <Input
          id={confirmId}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
          aria-describedby={`${confirmId}-error`}
        />
        <FieldError
          id={`${confirmId}-error`}
          messages={state.fieldErrors?.confirmPassword}
        />
      </div>

      <SubmitButton pendingLabel="Saving…" className="w-full">
        Save new password
      </SubmitButton>
    </form>
  );
}
