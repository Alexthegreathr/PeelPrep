"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Loader2,
  NotebookPen,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";

import {
  markSectionComplete,
  saveSectionNotes,
  submitGenerationFeedback,
} from "@/app/(app)/interviews/[id]/brief/actions";
import { SectionContent } from "@/components/brief/section-content";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { sectionToPlainText } from "@/lib/brief/render";
import { SECTION_TITLES, type BriefSectionKey } from "@/lib/brief/plan";
import { formatDate } from "@/lib/format";
import type { BriefSection } from "@/lib/data/brief";

const BASIS_LABEL: Record<string, string> = {
  source: "Grounded in your sources",
  general_knowledge: "Unverified — AI general knowledge, may be outdated",
};

export function BriefSectionCard({
  interviewId,
  section,
}: {
  interviewId: string;
  section: BriefSection;
}) {
  const router = useRouter();
  const key = section.section_key as BriefSectionKey;
  const isSnapshot = key === "snapshot";
  const content = section.content;
  const basis =
    content && typeof content.basis === "string"
      ? (content.basis as string)
      : null;
  const uncertainty =
    content && typeof content.uncertainty_notes === "string"
      ? (content.uncertainty_notes as string)
      : "";

  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showNotes, setShowNotes] = useState(Boolean(section.user_notes));
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [, startTransition] = useTransition();
  const toast = useToast();
  const completed = Boolean(section.completed_at);

  async function regenerate() {
    setRegenerating(true);
    try {
      await fetch(`/api/interviews/${interviewId}/brief/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ section: key }),
      });
      router.refresh();
    } finally {
      setRegenerating(false);
    }
  }

  function copy() {
    void navigator.clipboard
      .writeText(sectionToPlainText(key, content))
      .then(() => {
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 1500);
      });
  }

  function rate(next: "up" | "down") {
    setRating(next);
    startTransition(() => {
      void submitGenerationFeedback("brief_section", section.id, next);
    });
  }

  return (
    <section
      id={key}
      className="scroll-mt-20 rounded-xl border bg-card p-6"
      aria-labelledby={`${key}-title`}
    >
      <div className="mb-4 flex flex-col gap-3 border-b pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 id={`${key}-title`} className="text-lg font-semibold">
              {SECTION_TITLES[key]}
            </h2>
            {completed ? (
              <Badge variant="secondary" className="gap-1">
                <Check className="size-3" aria-hidden="true" /> Done
              </Badge>
            ) : null}
          </div>
          {section.generated_at ? (
            <span className="text-xs text-muted-foreground">
              Generated {formatDate(section.generated_at)}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isSnapshot ? (
            <Badge variant="outline" className="text-warning">
              AI-generated preparation guidance
            </Badge>
          ) : null}
          {basis ? (
            <Badge variant="outline">{BASIS_LABEL[basis] ?? basis}</Badge>
          ) : null}
          {section.brief_section_sources.map((s) => {
            const src = s.interview_sources ?? s.saved_sources;
            if (!src) return null;
            return (
              <Badge key={s.id} variant="secondary" title="Source">
                {src.title}
              </Badge>
            );
          })}
        </div>
      </div>

      {section.status === "failed" ? (
        <div className="flex flex-col items-start gap-3">
          <p className="flex items-center gap-2 text-sm text-destructive">
            <TriangleAlert className="size-4" aria-hidden="true" />
            This section didn&apos;t generate. Retrying is free.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={regenerate}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
            Retry
          </Button>
        </div>
      ) : (
        <>
          <SectionContent sectionKey={key} content={content} />
          {uncertainty ? (
            <p className="mt-4 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
              {uncertainty}
            </p>
          ) : null}

          {showNotes ? (
            <div className="mt-4">
              <Textarea
                defaultValue={section.user_notes ?? ""}
                placeholder="Private notes for this section…"
                rows={3}
                onBlur={(e) =>
                  startTransition(() => {
                    void saveSectionNotes(
                      interviewId,
                      section.id,
                      e.target.value,
                    );
                  })
                }
              />
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-1 border-t pt-4">
            <Button type="button" variant="ghost" size="sm" onClick={copy}>
              {copied ? (
                <Check className="text-success" aria-hidden="true" />
              ) : (
                <Copy aria-hidden="true" />
              )}{" "}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowNotes((v) => !v)}
            >
              <NotebookPen aria-hidden="true" /> Notes
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                startTransition(() => {
                  void markSectionComplete(interviewId, section.id, !completed);
                  router.refresh();
                })
              }
            >
              <Check aria-hidden="true" />
              {completed ? "Mark not done" : "Mark done"}
            </Button>
            {!isSnapshot ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => rate("up")}
                  aria-pressed={rating === "up"}
                  className={rating === "up" ? "text-success" : undefined}
                >
                  <ThumbsUp aria-hidden="true" />
                  <span className="sr-only">Helpful</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => rate("down")}
                  aria-pressed={rating === "down"}
                  className={rating === "down" ? "text-destructive" : undefined}
                >
                  <ThumbsDown aria-hidden="true" />
                  <span className="sr-only">Not helpful</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={regenerate}
                  disabled={regenerating}
                  className="ml-auto"
                >
                  {regenerating ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw aria-hidden="true" />
                  )}
                  Regenerate
                </Button>
              </>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
