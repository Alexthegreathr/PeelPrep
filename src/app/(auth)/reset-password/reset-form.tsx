"use client";

import { useActionState, useId } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

import { requestPasswordResetAction } from "@/app/(auth)/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared/field-error";
import { SubmitButton } from "@/components/shared/submit-button";
import { initialFormState } from "@/lib/validation/form-state";

export function ResetForm() {
  const [state, action] = useActionState(
    requestPasswordResetAction,
    initialFormState,
  );
  const emailId = useId();

  if (state.status === "success") {
    return (
      <Alert variant="success">
        <CircleCheck aria-hidden="true" />
        <AlertDescription>
          <p>{state.message}</p>
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

      <SubmitButton pendingLabel="Sending…" className="w-full">
        Send reset link
      </SubmitButton>
    </form>
  );
}
