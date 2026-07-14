"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";

import {
  saveInterviewDraft,
  confirmInterview,
} from "@/app/(app)/interviews/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FieldError } from "@/components/shared/field-error";
import { DocumentUploader } from "@/components/documents/document-uploader";
import {
  EMPLOYMENT_TYPES,
  INTERVIEW_FORMATS,
  INTERVIEW_STAGES,
} from "@/lib/validation/interview";
import {
  EMPLOYMENT_TYPE_LABELS,
  FORMAT_LABELS,
  STAGE_LABELS,
} from "@/lib/interviews/labels";
import type { WizardDraft } from "@/lib/interviews/draft";
import type { CandidateDocumentRow } from "@/lib/data/types";

const SELECT_CLASS =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const STEPS = [
  { n: 1, title: "Opportunity" },
  { n: 2, title: "Interview" },
  { n: 3, title: "Interviewers" },
  { n: 4, title: "Materials" },
  { n: 5, title: "Review" },
] as const;

type SaveState = "idle" | "saving" | "saved" | "error";

export function IntakeWizard({
  interviewId,
  initialDraft,
  initialStep,
  documents: initialDocuments,
}: {
  interviewId: string;
  initialDraft: WizardDraft;
  initialStep: number;
  documents: CandidateDocumentRow[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<WizardDraft>(initialDraft);
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 1), 5));
  const [documents, setDocuments] =
    useState<CandidateDocumentRow[]>(initialDocuments);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isConfirming, startConfirm] = useTransition();

  const dirtyRef = useRef(false);

  const update = useCallback((patch: Partial<WizardDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    dirtyRef.current = true;
  }, []);

  const persist = useCallback(
    async (nextDraft: WizardDraft, atStep: number) => {
      setSaveState("saving");
      const result = await saveInterviewDraft(interviewId, nextDraft, atStep);
      if (result.ok) {
        setSaveState("saved");
        dirtyRef.current = false;
      } else {
        setSaveState("error");
      }
      return result.ok;
    },
    [interviewId],
  );

  // Debounced autosave — persists at most ~once per 1.5s while editing. Only
  // fires when the draft is dirty, so a pure step change never triggers a save.
  useEffect(() => {
    if (!dirtyRef.current) return;
    const timer = setTimeout(() => {
      void persist(draft, step);
    }, 1500);
    return () => clearTimeout(timer);
  }, [draft, step, persist]);

  async function goToStep(next: number) {
    if (dirtyRef.current) await persist(draft, next);
    else await persist(draft, next); // also records the furthest step reached
    setStep(next);
  }

  function updateInterviewer(
    index: number,
    patch: Partial<WizardDraft["interviewers"][number]>,
  ) {
    setDraft((prev) => {
      const interviewers = prev.interviewers.map((iv, i) =>
        i === index ? { ...iv, ...patch } : iv,
      );
      return { ...prev, interviewers };
    });
    dirtyRef.current = true;
  }

  function addInterviewer() {
    update({
      interviewers: [
        ...draft.interviewers,
        { name: "", title: "", publicProfileUrl: "", manualBackground: "" },
      ],
    });
  }

  function removeInterviewer(index: number) {
    update({
      interviewers: draft.interviewers.filter((_, i) => i !== index),
    });
  }

  function handleConfirm() {
    setConfirmError(null);
    setFieldErrors({});
    startConfirm(async () => {
      const result = await confirmInterview(interviewId, draft);
      // On success the action redirects and this line is unreachable.
      if (result && !result.ok) {
        if (result.fieldErrors)
          setFieldErrors(result.fieldErrors as Record<string, string[]>);
        setConfirmError(
          result.message ??
            "Add the company name and position title before generating.",
        );
      }
    });
  }

  const resumeDocs = documents.filter((d) => d.kind === "resume");
  const coverDocs = documents.filter((d) => d.kind === "cover_letter");

  return (
    <div className="flex flex-col gap-6">
      <Stepper current={step} onJump={goToStep} />

      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <SaveIndicator state={saveState} />
      </div>

      <div className="rounded-xl border bg-card p-6">
        {step === 1 && <StepOpportunity draft={draft} update={update} />}
        {step === 2 && <StepInterview draft={draft} update={update} />}
        {step === 3 && (
          <StepInterviewers
            draft={draft}
            updateInterviewer={updateInterviewer}
            addInterviewer={addInterviewer}
            removeInterviewer={removeInterviewer}
          />
        )}
        {step === 4 && (
          <StepMaterials
            draft={draft}
            update={update}
            resumeDocs={resumeDocs}
            coverDocs={coverDocs}
            onUploaded={(doc) => {
              setDocuments((prev) => [doc, ...prev]);
              if (doc.kind === "resume") update({ resumeDocumentId: doc.id });
              if (doc.kind === "cover_letter")
                update({ coverLetterDocumentId: doc.id });
            }}
          />
        )}
        {step === 5 && (
          <StepReview
            draft={draft}
            fieldErrors={fieldErrors}
            confirmError={confirmError}
            isConfirming={isConfirming}
            onConfirm={handleConfirm}
            documents={documents}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => goToStep(step - 1)}
          disabled={step === 1}
        >
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await persist(draft, step);
              router.push("/history");
            }}
          >
            Save &amp; exit
          </Button>
          {step < 5 ? (
            <Button type="button" onClick={() => goToStep(step + 1)}>
              Continue
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Stepper({
  current,
  onJump,
}: {
  current: number;
  onJump: (n: number) => void;
}) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Intake progress">
      {STEPS.map((s) => {
        const state =
          s.n === current ? "current" : s.n < current ? "done" : "todo";
        return (
          <li key={s.n} className="flex-1">
            <button
              type="button"
              onClick={() => onJump(s.n)}
              aria-current={state === "current" ? "step" : undefined}
              className={
                "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors " +
                (state === "current"
                  ? "border-primary bg-primary/10 font-medium"
                  : state === "done"
                    ? "border-[#4d7b55]/40 bg-[#4d7b55]/5 text-foreground hover:bg-[#4d7b55]/10"
                    : "text-muted-foreground hover:bg-secondary")
              }
            >
              <span
                className={
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-xs " +
                  (state === "done"
                    ? "bg-[#4d7b55] text-white"
                    : state === "current"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground")
                }
              >
                {state === "done" ? (
                  <Check className="size-3" aria-hidden="true" />
                ) : (
                  s.n
                )}
              </span>
              <span className="hidden sm:inline">{s.title}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving")
    return (
      <span className="flex items-center gap-1">
        <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Saving…
      </span>
    );
  if (state === "saved")
    return (
      <span className="flex items-center gap-1 text-[#4d7b55]">
        <Check className="size-3" aria-hidden="true" /> Draft saved
      </span>
    );
  if (state === "error")
    return (
      <span className="text-destructive">Couldn&apos;t save — retrying…</span>
    );
  return <span>Changes save automatically</span>;
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function StepOpportunity({
  draft,
  update,
}: {
  draft: WizardDraft;
  update: (p: Partial<WizardDraft>) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="mb-2 text-lg font-semibold">The opportunity</legend>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Company" htmlFor="companyName">
          <Input
            id="companyName"
            value={draft.companyName}
            onChange={(e) => update({ companyName: e.target.value })}
            placeholder="Acme Corp"
          />
        </Field>
        <Field label="Position title" htmlFor="positionTitle">
          <Input
            id="positionTitle"
            value={draft.positionTitle}
            onChange={(e) => update({ positionTitle: e.target.value })}
            placeholder="Software Engineer"
          />
        </Field>
      </div>
      <Field
        label="Job description"
        htmlFor="jobDescription"
        hint="Paste the full description — it's the primary source PeelPrep grounds your brief in. We store links but never fetch them."
      >
        <Textarea
          id="jobDescription"
          value={draft.jobDescription}
          onChange={(e) => update({ jobDescription: e.target.value })}
          rows={7}
          placeholder="Paste the job description here…"
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Job posting URL (optional)" htmlFor="jobPostingUrl">
          <Input
            id="jobPostingUrl"
            value={draft.jobPostingUrl}
            onChange={(e) => update({ jobPostingUrl: e.target.value })}
            placeholder="https://…"
            inputMode="url"
          />
        </Field>
        <Field label="Location (optional)" htmlFor="location">
          <Input
            id="location"
            value={draft.location}
            onChange={(e) => update({ location: e.target.value })}
            placeholder="Remote · New York, NY"
          />
        </Field>
      </div>
      <Field label="Employment type (optional)" htmlFor="employmentType">
        <select
          id="employmentType"
          className={SELECT_CLASS + " max-w-xs"}
          value={draft.employmentType}
          onChange={(e) => update({ employmentType: e.target.value })}
        >
          <option value="">Not sure yet</option>
          {EMPLOYMENT_TYPES.map((v) => (
            <option key={v} value={v}>
              {EMPLOYMENT_TYPE_LABELS[v]}
            </option>
          ))}
        </select>
      </Field>
    </fieldset>
  );
}

function StepInterview({
  draft,
  update,
}: {
  draft: WizardDraft;
  update: (p: Partial<WizardDraft>) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="mb-2 text-lg font-semibold">Interview details</legend>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Date" htmlFor="interviewDate">
          <Input
            id="interviewDate"
            type="date"
            value={draft.interviewDate}
            onChange={(e) => update({ interviewDate: e.target.value })}
          />
        </Field>
        <Field label="Time" htmlFor="interviewTime">
          <Input
            id="interviewTime"
            type="time"
            value={draft.interviewTime}
            onChange={(e) => update({ interviewTime: e.target.value })}
          />
        </Field>
        <Field label="Time zone" htmlFor="interviewTimezone">
          <select
            id="interviewTimezone"
            className={SELECT_CLASS}
            value={draft.interviewTimezone}
            onChange={(e) => update({ interviewTimezone: e.target.value })}
          >
            <option value="">Select…</option>
            <TimezoneOptions current={draft.interviewTimezone} />
          </select>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Format" htmlFor="format">
          <select
            id="format"
            className={SELECT_CLASS}
            value={draft.format}
            onChange={(e) => update({ format: e.target.value })}
          >
            <option value="">Not sure yet</option>
            {INTERVIEW_FORMATS.map((v) => (
              <option key={v} value={v}>
                {FORMAT_LABELS[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Stage" htmlFor="stage">
          <select
            id="stage"
            className={SELECT_CLASS}
            value={draft.stage}
            onChange={(e) => update({ stage: e.target.value })}
          >
            <option value="">Not sure yet</option>
            {INTERVIEW_STAGES.map((v) => (
              <option key={v} value={v}>
                {STAGE_LABELS[v]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Expected duration (minutes)" htmlFor="durationMinutes">
          <Input
            id="durationMinutes"
            type="number"
            min={0}
            max={1440}
            value={draft.durationMinutes}
            onChange={(e) => update({ durationMinutes: e.target.value })}
            placeholder="45"
          />
        </Field>
        <Field
          label="Video platform or location"
          htmlFor="meetingLocation"
          hint="e.g. Zoom, Google Meet, or an office address"
        >
          <Input
            id="meetingLocation"
            value={draft.meetingLocation}
            onChange={(e) => update({ meetingLocation: e.target.value })}
          />
        </Field>
      </div>
    </fieldset>
  );
}

function TimezoneOptions({ current }: { current: string }) {
  let zones: string[] = [];
  try {
    zones = Intl.supportedValuesOf("timeZone");
  } catch {
    zones = ["UTC"];
  }
  if (current && !zones.includes(current)) zones = [current, ...zones];
  return (
    <>
      {zones.map((z) => (
        <option key={z} value={z}>
          {z}
        </option>
      ))}
    </>
  );
}

function StepInterviewers({
  draft,
  updateInterviewer,
  addInterviewer,
  removeInterviewer,
}: {
  draft: WizardDraft;
  updateInterviewer: (
    i: number,
    p: Partial<WizardDraft["interviewers"][number]>,
  ) => void;
  addInterviewer: () => void;
  removeInterviewer: (i: number) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="mb-1 text-lg font-semibold">Interviewers</legend>
      <Alert>
        <AlertDescription>
          <p>
            PeelPrep uses only public professional context to help you prepare
            respectfully. Predictions are suggestions, not verified facts about
            the interviewer. Add background you already know or found on a
            public professional profile.
          </p>
        </AlertDescription>
      </Alert>

      {draft.interviewers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No interviewers added yet. This step is optional, but adding names and
          public background sharpens your brief.
        </p>
      ) : null}

      {draft.interviewers.map((iv, i) => (
        <div key={i} className="flex flex-col gap-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Interviewer {i + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeInterviewer(i)}
            >
              <Trash2 aria-hidden="true" />
              <span className="sr-only">Remove interviewer {i + 1}</span>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor={`iv-name-${i}`}>
              <Input
                id={`iv-name-${i}`}
                value={iv.name}
                onChange={(e) => updateInterviewer(i, { name: e.target.value })}
              />
            </Field>
            <Field label="Title (optional)" htmlFor={`iv-title-${i}`}>
              <Input
                id={`iv-title-${i}`}
                value={iv.title}
                onChange={(e) =>
                  updateInterviewer(i, { title: e.target.value })
                }
                placeholder="Engineering Manager"
              />
            </Field>
          </div>
          <Field
            label="Public professional profile URL (optional)"
            htmlFor={`iv-url-${i}`}
          >
            <Input
              id={`iv-url-${i}`}
              value={iv.publicProfileUrl}
              onChange={(e) =>
                updateInterviewer(i, { publicProfileUrl: e.target.value })
              }
              placeholder="https://…"
              inputMode="url"
            />
          </Field>
          <Field
            label="Public professional background (optional)"
            htmlFor={`iv-bg-${i}`}
            hint="Paste public professional details only — never private or sensitive information."
          >
            <Textarea
              id={`iv-bg-${i}`}
              value={iv.manualBackground}
              onChange={(e) =>
                updateInterviewer(i, { manualBackground: e.target.value })
              }
              rows={3}
            />
          </Field>
        </div>
      ))}

      <div>
        <Button
          type="button"
          variant="outline"
          onClick={addInterviewer}
          disabled={draft.interviewers.length >= 10}
        >
          <Plus aria-hidden="true" /> Add interviewer
        </Button>
      </div>
    </fieldset>
  );
}

function StepMaterials({
  draft,
  update,
  resumeDocs,
  coverDocs,
  onUploaded,
}: {
  draft: WizardDraft;
  update: (p: Partial<WizardDraft>) => void;
  resumeDocs: CandidateDocumentRow[];
  coverDocs: CandidateDocumentRow[];
  onUploaded: (doc: CandidateDocumentRow) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="mb-1 text-lg font-semibold">Your materials</legend>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Résumé" htmlFor="resumeDocumentId">
          <select
            id="resumeDocumentId"
            className={SELECT_CLASS}
            value={draft.resumeDocumentId}
            onChange={(e) => update({ resumeDocumentId: e.target.value })}
          >
            <option value="">None selected</option>
            {resumeDocs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cover letter (optional)" htmlFor="coverLetterDocumentId">
          <select
            id="coverLetterDocumentId"
            className={SELECT_CLASS}
            value={draft.coverLetterDocumentId}
            onChange={(e) => update({ coverLetterDocumentId: e.target.value })}
          >
            <option value="">None selected</option>
            {coverDocs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="rounded-lg border bg-secondary/30 p-4">
        <h4 className="mb-3 text-sm font-medium">Upload a new document</h4>
        <DocumentUploader showKind onUploaded={onUploaded} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Portfolio URL (optional)" htmlFor="portfolioUrl">
          <Input
            id="portfolioUrl"
            value={draft.portfolioUrl}
            onChange={(e) => update({ portfolioUrl: e.target.value })}
            placeholder="https://…"
            inputMode="url"
          />
        </Field>
      </div>
      <Field
        label="Private notes (optional)"
        htmlFor="notes"
        hint="Anything else you want considered — recruiter hints, your goals, questions to remember."
      >
        <Textarea
          id="notes"
          value={draft.notes}
          onChange={(e) => update({ notes: e.target.value })}
          rows={4}
        />
      </Field>
    </fieldset>
  );
}

function StepReview({
  draft,
  fieldErrors,
  confirmError,
  isConfirming,
  onConfirm,
  documents,
}: {
  draft: WizardDraft;
  fieldErrors: Record<string, string[]>;
  confirmError: string | null;
  isConfirming: boolean;
  onConfirm: () => void;
  documents: CandidateDocumentRow[];
}) {
  const resume = documents.find((d) => d.id === draft.resumeDocumentId);
  const namedInterviewers = draft.interviewers.filter((i) => i.name.trim());
  return (
    <div className="flex flex-col gap-5">
      <h3 className="text-lg font-semibold">Review &amp; confirm</h3>

      {confirmError ? (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{confirmError}</p>
          </AlertDescription>
        </Alert>
      ) : null}

      <dl className="grid gap-x-6 gap-y-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
        <SummaryRow label="Company" value={draft.companyName || "—"} />
        <SummaryRow label="Position" value={draft.positionTitle || "—"} />
        <SummaryRow
          label="Job description"
          value={draft.jobDescription ? "Provided" : "Not provided"}
        />
        <SummaryRow
          label="Interviewers"
          value={
            namedInterviewers.length
              ? namedInterviewers.map((i) => i.name).join(", ")
              : "None added"
          }
        />
        <SummaryRow
          label="Résumé"
          value={resume ? resume.title : "None selected"}
        />
        <SummaryRow
          label="Portfolio"
          value={draft.portfolioUrl ? "Provided" : "—"}
        />
      </dl>
      {fieldErrors.companyName ? (
        <FieldError id="companyName-err" messages={fieldErrors.companyName} />
      ) : null}
      {fieldErrors.positionTitle ? (
        <FieldError
          id="positionTitle-err"
          messages={fieldErrors.positionTitle}
        />
      ) : null}

      <div className="rounded-lg border border-[#e8ddb5] bg-secondary/40 p-4 text-sm">
        <h4 className="mb-2 font-medium">What PeelPrep will analyze</h4>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>The job description and role details you entered</li>
          <li>Public professional background you added about interviewers</li>
          <li>Text extracted from your selected résumé and documents</li>
          <li>Your private notes, to tailor guidance to your goals</li>
        </ul>
        <p className="mt-3 text-muted-foreground">
          PeelPrep generates <strong>AI preparation guidance</strong> — company
          and role analysis, likely questions, and practice — grounded in what
          you provide. It won&apos;t fetch external links, invent facts, or
          infer sensitive characteristics about anyone. You can edit or delete
          this interview anytime.
        </p>
      </div>

      <div>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={isConfirming}
          size="lg"
        >
          {isConfirming ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : null}
          {isConfirming ? "Confirming…" : "Confirm & start preparing"}
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
