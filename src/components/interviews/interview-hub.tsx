import Link from "next/link";
import {
  CalendarClock,
  ExternalLink,
  FileText,
  Pencil,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InterviewActions } from "@/components/interviews/interview-actions";
import { formatInterviewTime } from "@/lib/format";
import {
  EMPLOYMENT_TYPE_LABELS,
  FORMAT_LABELS,
  STAGE_LABELS,
  STATUS_LABELS,
} from "@/lib/interviews/labels";
import type {
  InterviewRow,
  InterviewerRow,
  CandidateDocumentRow,
  InterviewDocumentRow,
} from "@/lib/data/types";

export function InterviewHub({
  interview,
  interviewers,
  documentLinks,
  documents,
}: {
  interview: InterviewRow;
  interviewers: InterviewerRow[];
  documentLinks: InterviewDocumentRow[];
  documents: CandidateDocumentRow[];
}) {
  const docTitle = (id: string) =>
    documents.find((d) => d.id === id)?.title ?? "Document";
  const when = formatInterviewTime(
    interview.interview_at,
    interview.interview_timezone,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {interview.company_name || "Untitled interview"}
            </h1>
            <Badge
              variant={
                interview.status === "archived" ? "outline" : "secondary"
              }
            >
              {STATUS_LABELS[interview.status] ?? interview.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {interview.position_title || "Position not set"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/interviews/${interview.id}?edit=1`}>
              <Pencil aria-hidden="true" /> Edit details
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4" aria-hidden="true" /> Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <Detail label="When" value={when || "Not scheduled"} />
              <Detail
                label="Format"
                value={interview.format ? FORMAT_LABELS[interview.format] : "—"}
              />
              <Detail
                label="Stage"
                value={interview.stage ? STAGE_LABELS[interview.stage] : "—"}
              />
              <Detail
                label="Duration"
                value={
                  interview.duration_minutes
                    ? `${interview.duration_minutes} min`
                    : "—"
                }
              />
              <Detail label="Location" value={interview.location || "—"} />
              <Detail
                label="Employment"
                value={
                  interview.employment_type
                    ? EMPLOYMENT_TYPE_LABELS[interview.employment_type]
                    : "—"
                }
              />
              <Detail
                label="Meeting"
                value={interview.meeting_location || "—"}
              />
              <Detail
                label="Job description"
                value={interview.job_description ? "Provided" : "Not provided"}
              />
            </dl>
            {interview.job_posting_url ? (
              <p className="mt-4 text-sm">
                <a
                  className="inline-flex items-center gap-1 text-[#7b4b20] underline underline-offset-4"
                  href={interview.job_posting_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  Job posting{" "}
                  <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4" aria-hidden="true" /> Interviewers
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 text-sm">
              {interviewers.length === 0 ? (
                <p className="text-muted-foreground">None added.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {interviewers.map((iv) => (
                    <li key={iv.id}>
                      <p className="font-medium">{iv.name}</p>
                      {iv.title ? (
                        <p className="text-muted-foreground">{iv.title}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4" aria-hidden="true" /> Materials
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 text-sm">
              {documentLinks.length === 0 ? (
                <p className="text-muted-foreground">No documents linked.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {documentLinks.map((link) => (
                    <li key={link.id} className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {link.role.replace("_", " ")}
                      </Badge>
                      <span className="truncate">
                        {docTitle(link.document_id)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">Preparation</CardTitle>
          <CardDescription>
            Turn this interview into a personalized briefing and practice plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <Button asChild>
            <Link href={`/interviews/${interview.id}/brief`}>
              <Sparkles aria-hidden="true" /> Peel Brief
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/interviews/${interview.id}/questions`}>
              Questions
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/interviews/${interview.id}/stories`}>Story bank</Link>
          </Button>
          <span className="self-center text-sm text-muted-foreground">
            Practice and readiness arrive in the next phases.
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">Manage</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <InterviewActions
            interviewId={interview.id}
            status={interview.status}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
