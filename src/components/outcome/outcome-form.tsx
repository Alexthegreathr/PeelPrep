"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { saveOutcome } from "@/app/(app)/interviews/[id]/outcome/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SELECT =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

export type OutcomeInitial = {
  completed_on: string | null;
  difficulty: number | null;
  confidence: number | null;
  advanced: boolean | null;
  received_offer: boolean | null;
  questions_encountered: string | null;
  went_well: string | null;
  went_poorly: string | null;
  lessons: string | null;
  private_notes: string | null;
} | null;

function triValue(v: boolean | null): string {
  return v === true ? "yes" : v === false ? "no" : "";
}

export function OutcomeForm({
  interviewId,
  initial,
}: {
  interviewId: string;
  initial: OutcomeInitial;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    const input = {
      completedOn: String(formData.get("completedOn") ?? ""),
      difficulty: String(formData.get("difficulty") ?? ""),
      confidence: String(formData.get("confidence") ?? ""),
      advanced: String(formData.get("advanced") ?? ""),
      receivedOffer: String(formData.get("receivedOffer") ?? ""),
      questionsEncountered: String(formData.get("questionsEncountered") ?? ""),
      wentWell: String(formData.get("wentWell") ?? ""),
      wentPoorly: String(formData.get("wentPoorly") ?? ""),
      lessons: String(formData.get("lessons") ?? ""),
      privateNotes: String(formData.get("privateNotes") ?? ""),
    };
    setError(null);
    startTransition(async () => {
      const res = await saveOutcome(interviewId, input);
      if (res && !res.ok) setError(res.message);
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-5">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{error}</p>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Completed on" htmlFor="completedOn">
          <Input
            id="completedOn"
            name="completedOn"
            type="date"
            defaultValue={initial?.completed_on ?? ""}
          />
        </Field>
        <Field label="Difficulty (1–5)" htmlFor="difficulty">
          <RatingSelect name="difficulty" value={initial?.difficulty ?? null} />
        </Field>
        <Field label="Your confidence (1–5)" htmlFor="confidence">
          <RatingSelect name="confidence" value={initial?.confidence ?? null} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Did you advance?" htmlFor="advanced">
          <select
            id="advanced"
            name="advanced"
            defaultValue={triValue(initial?.advanced ?? null)}
            className={SELECT}
          >
            <option value="">Not sure yet</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
        <Field label="Did you receive an offer?" htmlFor="receivedOffer">
          <select
            id="receivedOffer"
            name="receivedOffer"
            defaultValue={triValue(initial?.received_offer ?? null)}
            className={SELECT}
          >
            <option value="">Not sure yet</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
      </div>

      <Field label="Questions you were asked" htmlFor="questionsEncountered">
        <Textarea
          id="questionsEncountered"
          name="questionsEncountered"
          rows={3}
          defaultValue={initial?.questions_encountered ?? ""}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="What went well" htmlFor="wentWell">
          <Textarea
            id="wentWell"
            name="wentWell"
            rows={3}
            defaultValue={initial?.went_well ?? ""}
          />
        </Field>
        <Field label="What was difficult" htmlFor="wentPoorly">
          <Textarea
            id="wentPoorly"
            name="wentPoorly"
            rows={3}
            defaultValue={initial?.went_poorly ?? ""}
          />
        </Field>
      </div>
      <Field label="Lessons for next time" htmlFor="lessons">
        <Textarea
          id="lessons"
          name="lessons"
          rows={2}
          defaultValue={initial?.lessons ?? ""}
        />
      </Field>
      <Field label="Private notes" htmlFor="privateNotes">
        <Textarea
          id="privateNotes"
          name="privateNotes"
          rows={2}
          defaultValue={initial?.private_notes ?? ""}
        />
      </Field>

      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : null}
          Save outcome
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function RatingSelect({ name, value }: { name: string; value: number | null }) {
  return (
    <select
      id={name}
      name={name}
      defaultValue={value ? String(value) : ""}
      className={SELECT}
    >
      <option value="">—</option>
      {[1, 2, 3, 4, 5].map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );
}
