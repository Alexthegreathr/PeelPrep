import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CircleAlert, Info, Lock, Printer } from "lucide-react";

import { getInterview } from "@/lib/data/interviews";
import { getBriefData } from "@/lib/data/brief";
import { loadSourceBlocks } from "@/lib/brief/sources";
import { getEffectivePlan } from "@/lib/data/subscription";
import { getResearchProvider } from "@/lib/research/providers";
import { RESEARCH_UNAVAILABLE_NOTE } from "@/lib/research/provider";
import { PageHeader } from "@/components/app/page-header";
import { BriefGenerator } from "@/components/brief/brief-generator";
import { BriefSectionCard } from "@/components/brief/brief-section-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SECTION_TITLES, type BriefSectionKey } from "@/lib/brief/plan";

export const metadata: Metadata = { title: "Peel Brief" };

export default async function BriefPage(
  props: PageProps<"/interviews/[id]/brief">,
) {
  const { id } = await props.params;
  const interview = await getInterview(id);
  if (!interview) notFound();

  if (interview.status === "draft") {
    return (
      <div>
        <PageHeader title="Peel Brief" />
        <Alert>
          <Info aria-hidden="true" />
          <AlertDescription>
            <p>
              Finish and confirm your interview intake to generate a Peel Brief.
            </p>
            <p className="mt-2">
              <Button asChild size="sm">
                <Link href={`/interviews/${id}`}>Finish intake</Link>
              </Button>
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { fingerprint } = await loadSourceBlocks(id);
  const data = await getBriefData(id, fingerprint);
  const { entitlements } = await getEffectivePlan();
  const researchAvailable = getResearchProvider().name === "mock";

  // No brief yet → intro + generate.
  if (!data || data.brief.status === "empty") {
    return (
      <div>
        <PageHeader
          title="Peel Brief"
          description={`${interview.company_name || "Your interview"} · ${interview.position_title || ""}`}
        />
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Generate your Peel Brief</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              PeelPrep will build a personalized briefing — company and role
              analysis, interviewer intelligence, likely themes, questions to
              ask, and a recommended next action — grounded in what you
              provided. It generates section by section, so you&apos;ll see
              progress and can retry any part.
            </p>
            <BriefGenerator interviewId={id} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const isGenerating = data.brief.status === "generating";
  const readyCount = data.sections.filter((s) => s.status === "ready").length;

  return (
    <div>
      <PageHeader
        title="Peel Brief"
        description={`${interview.company_name || "Your interview"} · ${interview.position_title || ""}`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={`/interviews/${id}/brief/print`}>
              <Printer aria-hidden="true" /> Print / last-minute
            </Link>
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3">
        <Alert>
          <Info aria-hidden="true" />
          <AlertDescription>
            <p>
              This is AI-generated preparation guidance — suggestions, not
              verified facts or guarantees.{" "}
              {!researchAvailable ? RESEARCH_UNAVAILABLE_NOTE : ""}
            </p>
          </AlertDescription>
        </Alert>
        {data.fingerprintStale ? (
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>
              <p>
                Your interview inputs changed since this brief was generated.
                Regenerate sections to refresh them.
              </p>
            </AlertDescription>
          </Alert>
        ) : null}
        {isGenerating ? (
          <BriefGenerator
            interviewId={id}
            autoStart
            initialCompleted={readyCount}
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-6">
        {data.sections.map((section) => {
          if (section.status === "skipped") {
            return (
              <LockedSection
                key={section.id}
                sectionKey={section.section_key as BriefSectionKey}
                planName={entitlements.name}
              />
            );
          }
          if (section.status === "pending" || section.status === "generating") {
            return (
              <PendingSection
                key={section.id}
                sectionKey={section.section_key as BriefSectionKey}
              />
            );
          }
          return (
            <BriefSectionCard
              key={section.id}
              interviewId={id}
              section={section}
            />
          );
        })}
      </div>
    </div>
  );
}

function LockedSection({
  sectionKey,
  planName,
}: {
  sectionKey: BriefSectionKey;
  planName: string;
}) {
  return (
    <section className="rounded-xl border border-dashed bg-secondary/20 p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
          <Lock className="size-4" aria-hidden="true" />{" "}
          {SECTION_TITLES[sectionKey]}
        </h2>
        <Badge variant="outline">Plus &amp; Pro</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Deeper analysis for this section is available on paid plans. Your{" "}
        {planName} plan covers the essentials.
      </p>
      <Button asChild size="sm" variant="outline" className="mt-3">
        <Link href="/billing">View plans</Link>
      </Button>
    </section>
  );
}

function PendingSection({ sectionKey }: { sectionKey: BriefSectionKey }) {
  return (
    <section className="rounded-xl border bg-card p-6">
      <h2 className="text-lg font-semibold text-muted-foreground">
        {SECTION_TITLES[sectionKey]}
      </h2>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-3/4 animate-pulse rounded bg-secondary" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
      </div>
    </section>
  );
}
