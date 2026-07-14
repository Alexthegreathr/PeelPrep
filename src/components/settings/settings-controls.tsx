"use client";

import { useState, useTransition } from "react";
import { Download, Loader2, TriangleAlert } from "lucide-react";

import {
  updateConsent,
  requestAccountDeletion,
} from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ConsentType } from "@/lib/auth/consent";

export function ConsentToggle({
  type,
  label,
  description,
  initial,
}: {
  type: ConsentType;
  label: string;
  description: string;
  initial: boolean;
}) {
  const [granted, setGranted] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={granted}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.checked;
              setGranted(next);
              setFailed(false);
              startTransition(async () => {
                const res = await updateConsent(type, next);
                if (res && !res.ok) {
                  setGranted(!next);
                  setFailed(true);
                }
              });
            }}
            className="size-4 rounded border-input accent-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {granted ? "On" : "Off"}
        </label>
      </div>
      {failed ? (
        <p className="text-xs text-destructive">
          Couldn&apos;t update this setting. Please try again.
        </p>
      ) : null}
    </div>
  );
}

export function ExportCard() {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    setUrl(null);
    startTransition(async () => {
      const res = await fetch("/api/export", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Export failed.");
        return;
      }
      setUrl(body.url ?? null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{error}</p>
          </AlertDescription>
        </Alert>
      ) : null}
      {url ? (
        <Alert variant="success">
          <AlertDescription>
            <p>
              Your export is ready.{" "}
              <a
                className="underline"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Download JSON
              </a>{" "}
              (link valid for 7 days).
            </p>
          </AlertDescription>
        </Alert>
      ) : null}
      <div>
        <Button
          type="button"
          variant="outline"
          onClick={run}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Download aria-hidden="true" />
          )}
          Export my data
        </Button>
      </div>
    </div>
  );
}

export function DeleteAccountCard() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await requestAccountDeletion(password, phrase);
      // Success redirects; only failures return.
      if (res && !res.ok) setError(res.message);
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="text-destructive hover:text-destructive"
        >
          <TriangleAlert aria-hidden="true" /> Delete my account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes your account and everything in it —
            interviews, briefs, documents, stories, practice, and outcomes. Your
            uploaded files are erased and any subscription is cancelled. This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>
              <p>{error}</p>
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="del-pw">Confirm your password</Label>
            <Input
              id="del-pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="del-phrase">Type DELETE to confirm</Label>
            <Input
              id="del-phrase"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="DELETE"
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            type="button"
            onClick={run}
            disabled={pending || phrase !== "DELETE" || !password}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : null}
            Delete permanently
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
