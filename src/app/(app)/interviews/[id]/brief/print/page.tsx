import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getInterview } from "@/lib/data/interviews";
import { getBriefData } from "@/lib/data/brief";
import { SectionContent } from "@/components/brief/section-content";
import { PrintButton } from "@/components/brief/print-button";
import { Button } from "@/components/ui/button";
import { SECTION_TITLES, type BriefSectionKey } from "@/lib/brief/plan";
import { formatInterviewTime } from "@/lib/format";

export const metadata: Metadata = { title: "Print brief" };

export default async function BriefPrintPage(
  props: PageProps<"/interviews/[id]/brief/print">,
) {
  const { id } = await props.params;
  const interview = await getInterview(id);
  if (!interview) notFound();
  const data = await getBriefData(id);
  if (!data) notFound();

  // Condensed summary first (the last-minute view), then the ready sections.
  const ready = data.sections.filter((s) => s.status === "ready");
  const condensed = ready.find((s) => s.section_key === "condensed_summary");
  const rest = ready.filter((s) => s.section_key !== "condensed_summary");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/interviews/${id}/brief`}>
            <ArrowLeft aria-hidden="true" /> Back to brief
          </Link>
        </Button>
        <PrintButton />
      </div>

      <header className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold">
          {interview.company_name || "Interview"} — Peel Brief
        </h1>
        <p className="text-sm text-muted-foreground">
          {interview.position_title}
          {interview.interview_at
            ? ` · ${formatInterviewTime(interview.interview_at, interview.interview_timezone)}`
            : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          AI-generated preparation guidance — suggestions, not verified facts.
        </p>
      </header>

      {condensed ? (
        <section className="mb-6 rounded-lg border bg-secondary/30 p-4 print:border-black/20">
          <h2 className="mb-2 text-lg font-semibold">Last-minute summary</h2>
          <SectionContent
            sectionKey="condensed_summary"
            content={condensed.content}
          />
        </section>
      ) : null}

      <div className="flex flex-col gap-6">
        {rest.map((section) => (
          <section key={section.id} className="break-inside-avoid">
            <h2 className="mb-2 text-lg font-semibold">
              {SECTION_TITLES[section.section_key as BriefSectionKey]}
            </h2>
            <SectionContent
              sectionKey={section.section_key as BriefSectionKey}
              content={section.content}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
