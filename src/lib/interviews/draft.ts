import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";

import type {
  InterviewRow,
  InterviewerRow,
  InterviewDocumentRow,
} from "@/lib/data/types";

/** The wizard's editable shape (camelCase, date/time split for form inputs). */
export type WizardDraft = {
  companyName: string;
  positionTitle: string;
  jobDescription: string;
  jobPostingUrl: string;
  location: string;
  employmentType: string;
  interviewDate: string;
  interviewTime: string;
  interviewTimezone: string;
  format: string;
  stage: string;
  durationMinutes: string;
  meetingLocation: string;
  interviewers: {
    name: string;
    title: string;
    publicProfileUrl: string;
    manualBackground: string;
  }[];
  resumeDocumentId: string;
  coverLetterDocumentId: string;
  portfolioUrl: string;
  notes: string;
};

function splitDateTime(
  iso: string | null,
  timezone: string | null,
): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const zone = timezone || "UTC";
  try {
    const zoned = new TZDate(new Date(iso), zone);
    return { date: format(zoned, "yyyy-MM-dd"), time: format(zoned, "HH:mm") };
  } catch {
    return { date: "", time: "" };
  }
}

export function toWizardDraft(
  interview: InterviewRow,
  interviewers: InterviewerRow[],
  documentLinks: InterviewDocumentRow[],
): WizardDraft {
  const { date, time } = splitDateTime(
    interview.interview_at,
    interview.interview_timezone,
  );
  const resume = documentLinks.find((d) => d.role === "resume");
  const cover = documentLinks.find((d) => d.role === "cover_letter");

  return {
    companyName: interview.company_name ?? "",
    positionTitle: interview.position_title ?? "",
    jobDescription: interview.job_description ?? "",
    jobPostingUrl: interview.job_posting_url ?? "",
    location: interview.location ?? "",
    employmentType: interview.employment_type ?? "",
    interviewDate: date,
    interviewTime: time,
    interviewTimezone: interview.interview_timezone ?? "",
    format: interview.format ?? "",
    stage: interview.stage ?? "",
    durationMinutes:
      interview.duration_minutes != null
        ? String(interview.duration_minutes)
        : "",
    meetingLocation: interview.meeting_location ?? "",
    interviewers:
      interviewers.length > 0
        ? interviewers.map((iv) => ({
            name: iv.name ?? "",
            title: iv.title ?? "",
            publicProfileUrl: iv.public_profile_url ?? "",
            manualBackground: iv.manual_background ?? "",
          }))
        : [],
    resumeDocumentId: resume?.document_id ?? "",
    coverLetterDocumentId: cover?.document_id ?? "",
    portfolioUrl: interview.portfolio_url ?? "",
    notes: interview.notes ?? "",
  };
}
