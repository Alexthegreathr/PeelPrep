"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Sparkles, Star, Link2, X } from "lucide-react";

import {
  generateQuestionsAction,
  toggleSaveQuestion,
  addQuestion,
  linkStory,
  unlinkStory,
} from "@/app/(app)/interviews/[id]/questions/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { QUESTION_CATEGORY_LABELS } from "@/lib/interviews/labels";
import { QUESTION_CATEGORIES } from "@/lib/validation/story";
import type { QuestionWithLinks } from "@/lib/data/questions";
import type { StoryRow } from "@/lib/data/types";

export function QuestionsView({
  interviewId,
  questions,
  stories,
}: {
  interviewId: string;
  questions: QuestionWithLinks[];
  stories: StoryRow[];
}) {
  const router = useRouter();
  const [generating, startGenerate] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const categories = useMemo(() => {
    const present = new Set(questions.map((q) => q.category));
    return QUESTION_CATEGORIES.filter((c) => present.has(c));
  }, [questions]);

  const shown =
    filter === "all"
      ? questions
      : questions.filter((q) => q.category === filter);

  function handleGenerate() {
    setError(null);
    setLimit(false);
    startGenerate(async () => {
      const res = await generateQuestionsAction(interviewId);
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
      <Alert className="max-w-3xl">
        <AlertDescription>
          <p>
            Predicted questions are preparation suggestions — they are not
            guaranteed to appear in your interview. Save the ones you want to
            practice and link the stories you&apos;ll tell.
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
        <Button type="button" onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles aria-hidden="true" />
          )}
          {questions.length ? "Generate more" : "Generate predicted questions"}
        </Button>
        <AddQuestionButton interviewId={interviewId} />
        {generating ? (
          <span className="text-xs text-muted-foreground">
            Grounding questions in your interview — this usually takes ~20s.
          </span>
        ) : null}
      </div>

      {generating && questions.length === 0 ? (
        <div
          className="flex flex-col gap-3"
          aria-busy="true"
          aria-live="polite"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          title="No questions yet"
          description="Generate a set of predicted questions grounded in your interview, or add your own to practice."
        />
      ) : (
        <>
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Filter by category"
          >
            <FilterChip
              label="All"
              active={filter === "all"}
              onClick={() => setFilter("all")}
            />
            {categories.map((c) => (
              <FilterChip
                key={c}
                label={QUESTION_CATEGORY_LABELS[c]}
                active={filter === c}
                onClick={() => setFilter(c)}
              />
            ))}
          </div>

          <ul className="flex flex-col gap-4">
            {shown.map((q) => (
              <QuestionCard
                key={q.id}
                interviewId={interviewId}
                question={q}
                stories={stories}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
        (active
          ? "border-primary bg-primary/10 font-medium"
          : "text-muted-foreground hover:bg-secondary")
      }
    >
      {label}
    </button>
  );
}

function QuestionCard({
  interviewId,
  question,
  stories,
}: {
  interviewId: string;
  question: QuestionWithLinks;
  stories: StoryRow[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const linkedIds = new Set(
    question.question_story_links.map((l) => l.story_id),
  );
  const linkable = stories.filter((s) => !linkedIds.has(s.id));

  return (
    <li className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="outline" className="mb-2">
            {QUESTION_CATEGORY_LABELS[question.category]}
          </Badge>
          <p className="font-medium">{question.text}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={question.saved}
          title={question.saved ? "Saved" : "Save"}
          onClick={() =>
            startTransition(() => {
              void toggleSaveQuestion(
                interviewId,
                question.id,
                !question.saved,
              );
              router.refresh();
            })
          }
        >
          <Star
            className={question.saved ? "fill-primary text-primary" : undefined}
            aria-hidden="true"
          />
          <span className="sr-only">Save question</span>
        </Button>
      </div>

      <dl className="mt-3 flex flex-col gap-2 text-sm">
        {question.why_asked ? (
          <Detail label="Why it may be asked" value={question.why_asked} />
        ) : null}
        {question.evaluates ? (
          <Detail label="What it evaluates" value={question.evaluates} />
        ) : null}
        {question.suggested_structure ? (
          <Detail
            label="Suggested structure"
            value={question.suggested_structure}
          />
        ) : null}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
        {question.question_story_links.map((l) => (
          <Badge key={l.story_id} variant="secondary" className="gap-1">
            {l.stories?.title ?? "Story"}
            <button
              type="button"
              onClick={() =>
                startTransition(() => {
                  void unlinkStory(interviewId, question.id, l.story_id);
                  router.refresh();
                })
              }
              aria-label="Unlink story"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </Badge>
        ))}
        {linkable.length ? (
          <label className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link2 className="size-4" aria-hidden="true" />
            <select
              defaultValue=""
              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              onChange={(e) => {
                const storyId = e.target.value;
                e.currentTarget.value = "";
                if (!storyId) return;
                startTransition(() => {
                  void linkStory(interviewId, question.id, storyId);
                  router.refresh();
                });
              }}
            >
              <option value="">Link a story…</option>
              {linkable.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link href={`/interviews/${interviewId}/practice`}>Practice</Link>
        </Button>
      </div>
    </li>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

function AddQuestionButton({ interviewId }: { interviewId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    const category = String(formData.get("category") ?? "behavioral");
    const text = String(formData.get("text") ?? "");
    setError(null);
    startTransition(async () => {
      const res = await addQuestion(interviewId, { category, text });
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
        <Button type="button" variant="outline">
          <Plus aria-hidden="true" /> Add your own
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a question</DialogTitle>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>
                <p>{error}</p>
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="add-q-cat">Category</Label>
            <select
              id="add-q-cat"
              name="category"
              defaultValue="behavioral"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
            >
              {QUESTION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {QUESTION_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="add-q-text">Question</Label>
            <Input id="add-q-text" name="text" required maxLength={1000} />
          </div>
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
              Add
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
