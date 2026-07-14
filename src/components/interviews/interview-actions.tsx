"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore, Loader2, Trash2 } from "lucide-react";

import {
  archiveInterview,
  unarchiveInterview,
  deleteInterview,
} from "@/app/(app)/interviews/actions";
import { Button } from "@/components/ui/button";
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

export function InterviewActions({
  interviewId,
  status,
}: {
  interviewId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const archived = status === "archived";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {archived ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              void unarchiveInterview(interviewId);
            })
          }
        >
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <ArchiveRestore aria-hidden="true" />
          )}
          Restore
        </Button>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
            >
              <Archive aria-hidden="true" />
              Archive
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive this interview?</AlertDialogTitle>
              <AlertDialogDescription>
                Archiving hides it from your active list and frees a slot, but
                keeps all your preparation. You can restore it anytime.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  startTransition(() => {
                    void archiveInterview(interviewId);
                  })
                }
              >
                Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this interview?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the interview and everything generated
              for it — the Peel Brief, predicted questions, practice sessions
              and answers, feedback, checklist, readiness scores, and outcome.
              Your reusable documents and story bank are kept. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                startTransition(() => {
                  void deleteInterview(interviewId);
                })
              }
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
