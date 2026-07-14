"use client";

import { useActionState, useId, useMemo } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

import { updateProfileAction } from "@/app/(app)/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared/field-error";
import { SubmitButton } from "@/components/shared/submit-button";
import { initialFormState } from "@/lib/validation/form-state";

function useTimezones(current: string): string[] {
  return useMemo(() => {
    let zones: string[] = [];
    try {
      zones = Intl.supportedValuesOf("timeZone");
    } catch {
      zones = ["UTC"];
    }
    if (!zones.includes(current)) zones = [current, ...zones];
    return zones;
  }, [current]);
}

export function ProfileForm({
  defaultValues,
}: {
  defaultValues: { fullName: string; headline: string; timezone: string };
}) {
  const [state, action] = useActionState(updateProfileAction, initialFormState);
  const nameId = useId();
  const headlineId = useId();
  const tzId = useId();
  const timezones = useTimezones(defaultValues.timezone);

  const values = { ...defaultValues, ...state.values };

  return (
    <form action={action} className="flex max-w-xl flex-col gap-5" noValidate>
      {state.status === "success" ? (
        <Alert variant="success">
          <CircleCheck aria-hidden="true" />
          <AlertDescription>
            <p>{state.message}</p>
          </AlertDescription>
        </Alert>
      ) : null}
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
          defaultValue={values.fullName}
          aria-invalid={Boolean(state.fieldErrors?.fullName)}
          aria-describedby={`${nameId}-error`}
        />
        <FieldError
          id={`${nameId}-error`}
          messages={state.fieldErrors?.fullName}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={headlineId}>Headline</Label>
        <Input
          id={headlineId}
          name="headline"
          type="text"
          placeholder="e.g. CS senior seeking SWE roles"
          defaultValue={values.headline}
          aria-invalid={Boolean(state.fieldErrors?.headline)}
          aria-describedby={`${headlineId}-error`}
        />
        <FieldError
          id={`${headlineId}-error`}
          messages={state.fieldErrors?.headline}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={tzId}>Time zone</Label>
        <select
          id={tzId}
          name="timezone"
          defaultValue={values.timezone}
          aria-invalid={Boolean(state.fieldErrors?.timezone)}
          aria-describedby={`${tzId}-error`}
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
        >
          {timezones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Used to display interview times in your local zone.
        </p>
        <FieldError
          id={`${tzId}-error`}
          messages={state.fieldErrors?.timezone}
        />
      </div>

      <div>
        <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
      </div>
    </form>
  );
}
