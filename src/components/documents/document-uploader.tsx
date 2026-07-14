"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Loader2, Upload } from "lucide-react";

import { uploadDocument } from "@/app/(app)/documents/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ACCEPTED_UPLOAD_EXTENSIONS } from "@/lib/security/file-validation";
import type { CandidateDocumentRow } from "@/lib/data/types";

const KIND_OPTIONS = [
  { value: "resume", label: "Résumé" },
  { value: "cover_letter", label: "Cover letter" },
  { value: "portfolio_note", label: "Portfolio note" },
  { value: "other", label: "Other" },
] as const;

/**
 * Client uploader wrapping the uploadDocument server action. Validation is
 * repeated server-side; this only improves UX. Calls onUploaded with the saved
 * document row so callers can update their list without a full reload.
 */
export function DocumentUploader({
  defaultKind = "resume",
  showKind = false,
  onUploaded,
}: {
  defaultKind?: string;
  showKind?: boolean;
  onUploaded?: (doc: CandidateDocumentRow) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileId = useId();
  const kindId = useId();
  const titleId = useId();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a file to upload.");
      return;
    }
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await uploadDocument(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.extractionFailed) {
        setNotice(
          "Uploaded. We couldn't read the text automatically — you can paste it into the interview later.",
        );
      } else {
        setNotice("Uploaded.");
      }
      onUploaded?.(result.document);
      form.reset();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{error}</p>
          </AlertDescription>
        </Alert>
      ) : null}
      {notice ? (
        <Alert variant="success">
          <AlertDescription>
            <p>{notice}</p>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor={fileId}>File</Label>
        <Input
          id={fileId}
          name="file"
          type="file"
          accept={ACCEPTED_UPLOAD_EXTENSIONS.join(",")}
          required
          className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm"
        />
        <p className="text-xs text-muted-foreground">
          PDF, DOCX, TXT, or MD · up to 5 MB
        </p>
      </div>

      {showKind ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={kindId}>Type</Label>
          <select
            id={kindId}
            name="kind"
            defaultValue={defaultKind}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="kind" value={defaultKind} />
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor={titleId}>Label (optional)</Label>
        <Input
          id={titleId}
          name="title"
          type="text"
          placeholder="e.g. Résumé — 2026"
          maxLength={200}
        />
      </div>

      <div>
        <Button type="submit" disabled={pending} variant="outline">
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Upload aria-hidden="true" />
          )}
          {pending ? "Uploading…" : "Upload document"}
        </Button>
      </div>
    </form>
  );
}
