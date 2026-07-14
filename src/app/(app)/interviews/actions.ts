"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEffectivePlan } from "@/lib/data/subscription";
import { countActiveInterviews, getInterview } from "@/lib/data/interviews";
import { writeAuditLog } from "@/lib/audit";
import {
  intakeDraftSchema,
  confirmInterviewSchema,
  combineInterviewDateTime,
  type IntakeDraftInput,
} from "@/lib/validation/interview";

export type ActionResult =
  | { ok: true }
  | { ok: false; message?: string; fieldErrors?: Record<string, string[]> };

/** Map a validated draft to interviews column updates. */
function draftToColumns(draft: IntakeDraftInput) {
  return {
    company_name: draft.companyName ?? "",
    position_title: draft.positionTitle ?? "",
    job_description: draft.jobDescription ?? null,
    job_posting_url: draft.jobPostingUrl ?? null,
    location: draft.location ?? null,
    employment_type: draft.employmentType ?? null,
    interview_at: combineInterviewDateTime(
      draft.interviewDate,
      draft.interviewTime,
      draft.interviewTimezone,
    ),
    interview_timezone: draft.interviewTimezone ?? null,
    format: draft.format ?? null,
    stage: draft.stage ?? null,
    duration_minutes: draft.durationMinutes ?? null,
    meeting_location: draft.meetingLocation ?? null,
    portfolio_url: draft.portfolioUrl ?? null,
    notes: draft.notes ?? null,
  };
}

/**
 * Create a new draft interview (or reuse an untouched empty one) and open it.
 * Enforces the free-tier active-interview limit server-side before creating.
 */
export async function startInterviewDraft(): Promise<void> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  // Reuse an existing blank draft so revisiting "new" doesn't pile up rows.
  const { data: existing } = await supabase
    .from("interviews")
    .select("id")
    .eq("status", "draft")
    .eq("company_name", "")
    .eq("position_title", "")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) redirect(`/interviews/${existing.id}`);

  const { entitlements } = await getEffectivePlan();
  if (entitlements.activeInterviews !== null) {
    const active = await countActiveInterviews();
    if (active >= entitlements.activeInterviews) {
      redirect("/interviews/new?limit=1");
    }
  }

  const { data, error } = await supabase
    .from("interviews")
    .insert({ user_id: user.id, status: "draft", intake_step: 1 })
    .select("id")
    .single();
  if (error || !data) redirect("/interviews/new?error=1");
  redirect(`/interviews/${data.id}`);
}

async function loadEditableInterview(interviewId: string) {
  const interview = await getInterview(interviewId);
  if (!interview) return { error: "Interview not found." as const };
  if (interview.status === "completed") {
    return {
      error: "This interview is completed and can no longer be edited.",
    };
  }
  return { interview };
}

/** Persist the whole draft. The wizard owns the full state, so this overwrites
 *  the draft fields, interviewer rows, and document links wholesale. */
export async function saveInterviewDraft(
  interviewId: string,
  rawDraft: unknown,
  currentStep: number,
): Promise<ActionResult> {
  const user = await requireUser();
  const loaded = await loadEditableInterview(interviewId);
  if ("error" in loaded) return { ok: false, message: loaded.error };

  const parsed = intakeDraftSchema.safeParse(rawDraft);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const draft = parsed.data;
  const supabase = await createSupabaseServerClient();

  const step = Math.min(Math.max(Math.trunc(currentStep) || 1, 1), 5);
  const { error } = await supabase
    .from("interviews")
    .update({ ...draftToColumns(draft), intake_step: step })
    .eq("id", interviewId)
    .eq("user_id", user.id);
  if (error) return { ok: false, message: "Couldn't save your draft." };

  await syncInterviewers(interviewId, user.id, draft);
  await syncDocumentLinks(interviewId, user.id, draft);

  revalidatePath(`/interviews/${interviewId}`);
  return { ok: true };
}

async function syncInterviewers(
  interviewId: string,
  userId: string,
  draft: IntakeDraftInput,
) {
  const supabase = await createSupabaseServerClient();
  const rows = (draft.interviewers ?? [])
    .filter((i) => i.name && i.name.trim())
    .map((i, index) => ({
      user_id: userId,
      interview_id: interviewId,
      name: i.name!.trim(),
      title: i.title ?? null,
      public_profile_url: i.publicProfileUrl ?? null,
      manual_background: i.manualBackground ?? null,
      sort_order: index,
    }));
  await supabase
    .from("interviewers")
    .delete()
    .eq("interview_id", interviewId)
    .eq("user_id", userId);
  if (rows.length) await supabase.from("interviewers").insert(rows);
}

async function syncDocumentLinks(
  interviewId: string,
  userId: string,
  draft: IntakeDraftInput,
) {
  const supabase = await createSupabaseServerClient();
  const wanted: { id: string; role: "resume" | "cover_letter" }[] = [];
  if (draft.resumeDocumentId)
    wanted.push({ id: draft.resumeDocumentId, role: "resume" });
  if (draft.coverLetterDocumentId)
    wanted.push({ id: draft.coverLetterDocumentId, role: "cover_letter" });

  // Only link documents the caller actually owns (defense against spoofed ids).
  const ids = wanted.map((w) => w.id);
  const owned = ids.length
    ? ((
        await supabase
          .from("candidate_documents")
          .select("id")
          .in("id", ids)
          .eq("user_id", userId)
      ).data ?? [])
    : [];
  const ownedIds = new Set(owned.map((d) => d.id));

  await supabase
    .from("interview_documents")
    .delete()
    .eq("interview_id", interviewId)
    .eq("user_id", userId);
  const rows = wanted
    .filter((w) => ownedIds.has(w.id))
    .map((w) => ({
      user_id: userId,
      interview_id: interviewId,
      document_id: w.id,
      role: w.role,
    }));
  if (rows.length) await supabase.from("interview_documents").insert(rows);
}

/**
 * Rebuild interview_sources (the grounding inputs stored separately from AI
 * output) from the current draft: job description, interviewer backgrounds,
 * candidate notes, and extracted document text.
 */
async function rebuildInterviewSources(interviewId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: interview } = await supabase
    .from("interviews")
    .select("job_description, notes")
    .eq("id", interviewId)
    .single();
  const { data: interviewers } = await supabase
    .from("interviewers")
    .select("name, manual_background")
    .eq("interview_id", interviewId);
  const { data: links } = await supabase
    .from("interview_documents")
    .select(
      "document_id, candidate_documents(title, extracted_text, extraction_status)",
    )
    .eq("interview_id", interviewId);

  type SourceRow = {
    user_id: string;
    interview_id: string;
    kind:
      | "job_description"
      | "interviewer_background"
      | "candidate_note"
      | "document_text";
    origin: "user_provided" | "document_extract";
    title: string;
    content: string;
    document_id?: string;
  };
  const rows: SourceRow[] = [];

  if (interview?.job_description?.trim()) {
    rows.push({
      user_id: userId,
      interview_id: interviewId,
      kind: "job_description",
      origin: "user_provided",
      title: "Job description",
      content: interview.job_description.trim(),
    });
  }
  for (const iv of interviewers ?? []) {
    if (iv.manual_background?.trim()) {
      rows.push({
        user_id: userId,
        interview_id: interviewId,
        kind: "interviewer_background",
        origin: "user_provided",
        title: `Background: ${iv.name}`,
        content: iv.manual_background.trim(),
      });
    }
  }
  if (interview?.notes?.trim()) {
    rows.push({
      user_id: userId,
      interview_id: interviewId,
      kind: "candidate_note",
      origin: "user_provided",
      title: "Your notes",
      content: interview.notes.trim(),
    });
  }
  for (const link of links ?? []) {
    const doc = link.candidate_documents;
    if (doc?.extraction_status === "succeeded" && doc.extracted_text?.trim()) {
      rows.push({
        user_id: userId,
        interview_id: interviewId,
        kind: "document_text",
        origin: "document_extract",
        title: doc.title,
        content: doc.extracted_text.trim(),
        document_id: link.document_id,
      });
    }
  }

  await supabase
    .from("interview_sources")
    .delete()
    .eq("interview_id", interviewId)
    .eq("user_id", userId);
  if (rows.length) await supabase.from("interview_sources").insert(rows);
}

/** Confirm the intake: validate essentials, persist, build sources, activate. */
export async function confirmInterview(
  interviewId: string,
  rawDraft: unknown,
): Promise<ActionResult> {
  const user = await requireUser();

  const saved = await saveInterviewDraft(interviewId, rawDraft, 5);
  if (!saved.ok) return saved;

  const parsed = confirmInterviewSchema.safeParse(rawDraft);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await rebuildInterviewSources(interviewId, user.id);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("interviews")
    .update({
      status: "preparing",
      confirmed_at: new Date().toISOString(),
      intake_step: 5,
    })
    .eq("id", interviewId)
    .eq("user_id", user.id);
  if (error) return { ok: false, message: "Couldn't confirm this interview." };

  await writeAuditLog({
    userId: user.id,
    action: "interview.confirm",
    resourceType: "interview",
    resourceId: interviewId,
  });
  revalidatePath("/dashboard");
  revalidatePath(`/interviews/${interviewId}`);
  redirect(`/interviews/${interviewId}`);
}

export async function archiveInterview(interviewId: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("interviews")
    .update({ status: "archived" })
    .eq("id", interviewId)
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect(`/interviews/${interviewId}`);
}

export async function unarchiveInterview(interviewId: string): Promise<void> {
  const user = await requireUser();
  const interview = await getInterview(interviewId);
  if (!interview) redirect("/history");

  // Unarchiving re-activates the interview → re-check the free-tier gate.
  const { entitlements } = await getEffectivePlan();
  if (entitlements.activeInterviews !== null) {
    const active = await countActiveInterviews();
    if (active >= entitlements.activeInterviews) {
      redirect(`/interviews/${interviewId}?limit=1`);
    }
  }
  const nextStatus = interview!.confirmed_at ? "preparing" : "draft";
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("interviews")
    .update({ status: nextStatus })
    .eq("id", interviewId)
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
  redirect(`/interviews/${interviewId}`);
}

export async function deleteInterview(interviewId: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  // Hard delete; FK cascades remove brief, questions, practice, checklist,
  // readiness, outcome, sources, and interview-document links. Reusable
  // documents and the story bank survive (DATABASE.md §9).
  const { error } = await supabase
    .from("interviews")
    .delete()
    .eq("id", interviewId)
    .eq("user_id", user.id);
  if (!error) {
    await writeAuditLog({
      userId: user.id,
      action: "interview.delete",
      resourceType: "interview",
      resourceId: interviewId,
    });
  }
  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect("/history");
}
