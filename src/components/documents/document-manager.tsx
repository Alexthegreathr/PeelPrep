"use client";

import { useState, useTransition } from "react";
import { Download, FileText, Loader2, Star, Trash2 } from "lucide-react";

import {
  deleteDocument,
  setDefaultResume,
} from "@/app/(app)/documents/actions";
import { DocumentUploader } from "@/components/documents/document-uploader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { formatBytes, formatDate } from "@/lib/format";
import type { CandidateDocumentRow } from "@/lib/data/types";

const KIND_LABELS: Record<string, string> = {
  resume: "Résumé",
  cover_letter: "Cover letter",
  portfolio_note: "Portfolio note",
  other: "Other",
};

export function DocumentManager({
  initialDocuments,
  defaultResumeId,
}: {
  initialDocuments: CandidateDocumentRow[];
  defaultResumeId: string | null;
}) {
  const [documents, setDocuments] =
    useState<CandidateDocumentRow[]>(initialDocuments);
  const [defaultId, setDefaultId] = useState<string | null>(defaultResumeId);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleUploaded(doc: CandidateDocumentRow) {
    setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
  }

  function handleDelete(id: string) {
    setPendingId(id);
    startTransition(async () => {
      const res = await deleteDocument(id);
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        if (defaultId === id) setDefaultId(null);
      }
      setPendingId(null);
    });
  }

  function handleSetDefault(id: string) {
    const next = defaultId === id ? null : id;
    setDefaultId(next);
    startTransition(async () => {
      await setDefaultResume(next);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border bg-secondary/30 p-4">
        <h3 className="mb-3 text-sm font-medium">Upload a document</h3>
        <DocumentUploader showKind onUploaded={handleUploaded} />
      </div>

      {documents.length === 0 ? (
        <EmptyState
          title="No documents yet"
          description="Upload your résumé and other materials once — they're reusable across every interview."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <FileText
                  className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <span className="truncate">{doc.title}</span>
                    {defaultId === doc.id ? (
                      <Badge variant="secondary">Default résumé</Badge>
                    ) : null}
                    {doc.extraction_status === "failed" ? (
                      <Badge variant="outline">Text not read</Badge>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {KIND_LABELS[doc.kind] ?? doc.kind} ·{" "}
                    {formatBytes(doc.size_bytes)} · {formatDate(doc.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {doc.kind === "resume" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefault(doc.id)}
                    aria-pressed={defaultId === doc.id}
                    title={
                      defaultId === doc.id
                        ? "Remove as default résumé"
                        : "Set as default résumé"
                    }
                  >
                    <Star
                      className={
                        defaultId === doc.id ? "fill-current" : undefined
                      }
                      aria-hidden="true"
                    />
                    <span className="sr-only">Toggle default résumé</span>
                  </Button>
                ) : null}

                <Button asChild variant="ghost" size="sm">
                  <a
                    href={`/api/documents/${doc.id}/download`}
                    title="Download"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download aria-hidden="true" />
                    <span className="sr-only">Download {doc.title}</span>
                  </a>
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pendingId === doc.id}
                      title="Delete"
                    >
                      {pendingId === doc.id ? (
                        <Loader2 className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 aria-hidden="true" />
                      )}
                      <span className="sr-only">Delete {doc.title}</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this document?</AlertDialogTitle>
                      <AlertDialogDescription>
                        &ldquo;{doc.title}&rdquo; will be permanently removed,
                        including its stored file. Interviews that used it will
                        show the source as removed. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(doc.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
