import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { listInterviews } from "@/lib/data/interviews";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AddInterviewButton } from "@/components/interviews/add-interview-button";
import { Badge } from "@/components/ui/badge";
import { formatInterviewTime, relativeTime } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/interviews/labels";
import type { InterviewRow } from "@/lib/data/types";

export const metadata: Metadata = { title: "Interviews" };

const GROUPS: { key: string; title: string; statuses: string[] }[] = [
  { key: "active", title: "Active", statuses: ["draft", "preparing"] },
  { key: "completed", title: "Completed", statuses: ["completed"] },
  { key: "archived", title: "Archived", statuses: ["archived"] },
];

export default async function HistoryPage() {
  const interviews = await listInterviews();

  // Only render groups that actually have interviews; when none of them do
  // (no interviews at all, or none in a known status), fall back to the
  // empty state rather than a near-blank page.
  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    rows: interviews.filter((i) => group.statuses.includes(i.status)),
  })).filter((group) => group.rows.length > 0);

  return (
    <div>
      <PageHeader
        title="Your interviews"
        description="Every interview you're preparing for, plus your completed and archived ones."
        action={<AddInterviewButton />}
      />

      {visibleGroups.length === 0 ? (
        <EmptyState
          title="No interviews yet"
          description="Add the interview you're preparing for and PeelPrep will turn it into a personalized briefing and practice plan."
          action={<AddInterviewButton label="Add your first interview" />}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {visibleGroups.map((group) => (
            <section key={group.key}>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {group.title}
              </h2>
              <ul className="flex flex-col gap-2">
                {group.rows.map((interview) => (
                  <InterviewRowItem key={interview.id} interview={interview} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function InterviewRowItem({ interview }: { interview: InterviewRow }) {
  const when = formatInterviewTime(
    interview.interview_at,
    interview.interview_timezone,
  );
  return (
    <li>
      <Link
        href={`/interviews/${interview.id}`}
        className="flex items-center justify-between gap-4 rounded-lg border p-4 transition-all hover:-translate-y-0.5 hover:bg-secondary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            <span className="truncate">
              {interview.company_name || "Untitled interview"}
            </span>
            <Badge
              variant={interview.status === "draft" ? "outline" : "secondary"}
            >
              {STATUS_LABELS[interview.status] ?? interview.status}
            </Badge>
          </p>
          <p className="line-clamp-2 text-sm text-muted-foreground sm:line-clamp-none sm:truncate">
            {interview.position_title || "Position not set"}
            {when ? ` · ${when}` : ""}
            {interview.interview_at
              ? ` · ${relativeTime(interview.interview_at)}`
              : ""}
          </p>
        </div>
        <ChevronRight
          className="size-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}
