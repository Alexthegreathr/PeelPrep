"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";

import {
  createStory,
  updateStory,
  deleteStory,
  requestStorySuggestionsAction,
} from "@/app/(app)/interviews/[id]/stories/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
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
import type { StoryRow } from "@/lib/data/types";

export function StoriesView({
  interviewId,
  stories,
  canSuggest,
}: {
  interviewId: string;
  stories: StoryRow[];
  canSuggest: boolean;
}) {
  const router = useRouter();
  const [suggesting, startSuggest] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(false);

  function suggest() {
    setError(null);
    setLimit(false);
    startSuggest(async () => {
      const res = await requestStorySuggestionsAction(interviewId);
      if (!res.ok) {
        setLimit(res.code === "limit_exceeded");
        setError(res.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Alert>
        <AlertDescription>
          <p>
            Your story bank is reusable across every interview. AI can draft a
            STAR outline from facts you&apos;ve provided — it never invents
            experiences, and asks you to fill in anything missing.
          </p>
        </AlertDescription>
      </Alert>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{error}</p>
            {limit ? (
              <p className="mt-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/billing">View plans</Link>
                </Button>
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <StoryEditor interviewId={interviewId} mode="create" />
        {canSuggest ? (
          <Button
            type="button"
            variant="outline"
            onClick={suggest}
            disabled={suggesting}
          >
            {suggesting ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles aria-hidden="true" />
            )}
            Suggest from my materials
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/billing">
              <Sparkles aria-hidden="true" /> AI suggestions (Plus)
            </Link>
          </Button>
        )}
        {suggesting ? (
          <span className="text-xs text-muted-foreground">
            Drafting story outlines from your materials — this usually takes
            ~20s.
          </span>
        ) : null}
      </div>

      {suggesting && stories.length === 0 ? (
        <div
          className="grid gap-4 md:grid-cols-2"
          aria-busy="true"
          aria-live="polite"
        >
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <EmptyState
          title="No stories yet"
          description="Build a bank of STAR stories you can reuse across interviews. Add your first, or let AI draft an outline from your materials."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {stories.map((story) => (
            <StoryCard key={story.id} interviewId={interviewId} story={story} />
          ))}
        </ul>
      )}
    </div>
  );
}

function StoryCard({
  interviewId,
  story,
}: {
  interviewId: string;
  story: StoryRow;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <li className="flex flex-col rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{story.title}</h3>
          {story.origin === "ai_draft" ? (
            <Badge variant="outline">AI draft</Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <StoryEditor interviewId={interviewId} mode="edit" story={story} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="sm" title="Delete">
                <Trash2 aria-hidden="true" />
                <span className="sr-only">Delete story</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this story?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{story.title}&rdquo; will be removed from your story
                  bank. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    startTransition(async () => {
                      await deleteStory(story.id, interviewId);
                      router.refresh();
                    })
                  }
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
        {story.situation ? (
          <p className="line-clamp-3">{story.situation}</p>
        ) : null}
        {story.measurable_result ? (
          <p className="text-foreground">
            <span className="font-medium">Result:</span>{" "}
            {story.measurable_result}
          </p>
        ) : null}
      </div>

      {(story.skills.length > 0 || story.tags.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1">
          {story.skills.map((s) => (
            <Badge key={`sk-${s}`} variant="secondary">
              {s}
            </Badge>
          ))}
          {story.tags.map((t) => (
            <Badge key={`tag-${t}`} variant="outline">
              #{t}
            </Badge>
          ))}
        </div>
      )}
    </li>
  );
}

function StoryEditor({
  interviewId,
  mode,
  story,
}: {
  interviewId: string;
  mode: "create" | "edit";
  story?: StoryRow;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    const input = {
      title: String(formData.get("title") ?? ""),
      situation: String(formData.get("situation") ?? ""),
      task: String(formData.get("task") ?? ""),
      action: String(formData.get("action") ?? ""),
      result: String(formData.get("result") ?? ""),
      skills: String(formData.get("skills") ?? ""),
      measurableResult: String(formData.get("measurableResult") ?? ""),
      resumeReference: String(formData.get("resumeReference") ?? ""),
      answersQuestions: String(formData.get("answersQuestions") ?? ""),
      tags: String(formData.get("tags") ?? ""),
    };
    setError(null);
    startTransition(async () => {
      const res =
        mode === "edit" && story
          ? await updateStory(story.id, input, interviewId)
          : await createStory(input, interviewId);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button type="button">
            <Plus aria-hidden="true" /> Add a story
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" title="Edit">
            <Pencil aria-hidden="true" />
            <span className="sr-only">Edit story</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit story" : "New story"}
          </DialogTitle>
          <DialogDescription>
            Use the STAR structure. Everything here is yours to edit.
          </DialogDescription>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>
                <p>{error}</p>
              </AlertDescription>
            </Alert>
          ) : null}
          <StoryField
            label="Title"
            name="title"
            defaultValue={story?.title}
            required
          />
          <StoryArea
            label="Situation"
            name="situation"
            defaultValue={story?.situation}
          />
          <StoryArea label="Task" name="task" defaultValue={story?.task} />
          <StoryArea
            label="Action"
            name="action"
            defaultValue={story?.action}
          />
          <StoryArea
            label="Result"
            name="result"
            defaultValue={story?.result}
          />
          <StoryField
            label="Measurable result"
            name="measurableResult"
            defaultValue={story?.measurable_result}
            placeholder="e.g. cut spoilage 18%"
          />
          <StoryField
            label="Skills (comma-separated)"
            name="skills"
            defaultValue={story?.skills.join(", ")}
          />
          <StoryField
            label="Tags (comma-separated)"
            name="tags"
            defaultValue={story?.tags.join(", ")}
          />
          <StoryField
            label="Related résumé experience"
            name="resumeReference"
            defaultValue={story?.resume_reference}
          />
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : null}
              Save story
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StoryField({
  label,
  name,
  defaultValue,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`story-${name}`}>{label}</Label>
      <Input
        id={`story-${name}`}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

function StoryArea({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`story-${name}`}>{label}</Label>
      <Textarea
        id={`story-${name}`}
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={2}
      />
    </div>
  );
}
