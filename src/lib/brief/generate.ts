import "server-only";

import type { ZodType } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
import { runGeneration } from "@/lib/ai/generation";
import { buildContextInput } from "@/lib/ai/context";
import { TASK_SCHEMAS } from "@/lib/ai/schemas";
import { reserveUsage, settleUsage } from "@/lib/usage/ledger";
import { usagePeriod, featureLimit } from "@/lib/usage/features";
import { planForUser } from "@/lib/billing/resolve";
import { loadSourceBlocks } from "@/lib/brief/sources";
import {
  BRIEF_STEPS,
  SECTION_ORDER,
  isSectionSkipped,
  sectionSortOrder,
  stepForSection,
  type BriefDepth,
  type BriefSectionKey,
  type BriefStep,
} from "@/lib/brief/plan";

/**
 * Peel Brief generation (AI_ARCHITECTURE.md §6): one step per request. The
 * whole-brief `brief_generate` reservation is taken on the first call and
 * settled immediately (a brief is "used" once generation starts); per-section
 * `section_regenerate` is metered thereafter. Failed sections retry free.
 */

export type BriefProgress = {
  briefId: string;
  status: string;
  done: boolean;
  generatedStep: string | null;
  remaining: number;
  limitExceeded?: boolean;
  error?: string;
};

type SectionContent = Record<string, unknown>;

/** Split a task output into per-section content payloads. */
function mapTaskOutput(
  task: string,
  output: Record<string, unknown>,
): Partial<Record<BriefSectionKey, SectionContent>> {
  switch (task) {
    case "company_analysis":
      return {
        company_overview: {
          overview: output.overview,
          basis: output.overview_basis,
          business_model: output.business_model,
          products: output.products,
          competitors: output.competitors,
          culture_signals: output.culture_signals,
          role_connections: output.role_connections,
          uncertainty_notes: output.uncertainty_notes,
        },
        company_priorities: {
          priorities: output.priorities,
          challenges: output.challenges,
          uncertainty_notes: output.uncertainty_notes,
        },
      };
    case "role_analysis":
      return { role_analysis: output };
    case "interviewer_analysis":
      return { interviewer_intel: output };
    case "themes_and_risks":
      return {
        likely_themes: {
          likely_themes: output.likely_themes,
          uncertainty_notes: output.uncertainty_notes,
        },
        risks_gaps: { risks_gaps: output.risks_gaps },
        next_action: { next_action: output.next_action },
      };
    case "questions_to_ask":
      return { questions_to_ask: output };
    case "condensed_brief":
      return { condensed_summary: output };
    default:
      return {};
  }
}

function citedIds(output: Record<string, unknown>): string[] {
  const ids = output.cited_source_ids;
  return Array.isArray(ids)
    ? ids.filter((v): v is string => typeof v === "string")
    : [];
}

async function buildSnapshot(interviewId: string): Promise<SectionContent> {
  const admin = createSupabaseAdminClient();
  const { data: interview } = await admin
    .from("interviews")
    .select(
      "company_name, position_title, interview_at, interview_timezone, format, stage, duration_minutes, location, meeting_location, employment_type",
    )
    .eq("id", interviewId)
    .single();
  const { data: interviewers } = await admin
    .from("interviewers")
    .select("name, title")
    .eq("interview_id", interviewId)
    .order("sort_order");
  const { count: docCount } = await admin
    .from("interview_documents")
    .select("id", { count: "exact", head: true })
    .eq("interview_id", interviewId);

  return {
    ...(interview ?? {}),
    interviewers: (interviewers ?? []).map((iv) => ({
      name: iv.name,
      title: iv.title,
    })),
    documents_linked: docCount ?? 0,
  };
}

/** Create the brief + section rows if they don't exist yet. */
async function ensureBrief(
  interviewId: string,
  userId: string,
  depth: BriefDepth,
): Promise<{ briefId: string; created: boolean }> {
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("peel_briefs")
    .select("id, status")
    .eq("interview_id", interviewId)
    .maybeSingle();

  if (existing) return { briefId: existing.id, created: false };

  const { data: brief } = await admin
    .from("peel_briefs")
    .insert({
      user_id: userId,
      interview_id: interviewId,
      status: "generating",
      depth,
    })
    .select("id")
    .single();

  const rows = SECTION_ORDER.map((key) => ({
    user_id: userId,
    brief_id: brief!.id,
    section_key: key,
    status: (isSectionSkipped(key, depth) ? "skipped" : "pending") as
      "skipped" | "pending",
    sort_order: sectionSortOrder(key),
  }));
  await admin.from("brief_sections").insert(rows);
  return { briefId: brief!.id, created: true };
}

type SectionStatusRow = { id: string; section_key: string; status: string };

async function loadSectionStatuses(
  briefId: string,
): Promise<SectionStatusRow[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("brief_sections")
    .select("id, section_key, status")
    .eq("brief_id", briefId);
  return data ?? [];
}

function nextPendingStep(statuses: SectionStatusRow[]): BriefStep | null {
  const byKey = new Map(statuses.map((s) => [s.section_key, s.status]));
  for (const step of BRIEF_STEPS) {
    if (step.sections.some((sec) => byKey.get(sec) === "pending")) return step;
  }
  return null;
}

/** Persist a step's generated section content + provenance + citations. */
async function persistStep(
  briefId: string,
  userId: string,
  step: BriefStep,
  contentBySection: Partial<Record<BriefSectionKey, SectionContent>>,
  aiGenerationId: string | null,
  cited: string[],
  validIds: Set<string>,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const statuses = await loadSectionStatuses(briefId);
  const byKey = new Map(statuses.map((s) => [s.section_key, s]));

  for (const section of step.sections) {
    const row = byKey.get(section);
    if (!row || row.status === "skipped") continue; // don't fill skipped sections
    const content = contentBySection[section] ?? {};
    await admin
      .from("brief_sections")
      .update({
        content: content as unknown as Json,
        status: "ready",
        generated_at: now,
        ai_generation_id: aiGenerationId,
      })
      .eq("id", row.id);

    // Citation mapping: only source ids the model actually received survive.
    await admin.from("brief_section_sources").delete().eq("section_id", row.id);
    const valid = cited.filter((id) => validIds.has(id));
    if (valid.length) {
      await admin.from("brief_section_sources").insert(
        valid.map((id) => ({
          user_id: userId,
          section_id: row.id,
          interview_source_id: id,
        })),
      );
    }
  }
}

async function markStepFailed(briefId: string, step: BriefStep): Promise<void> {
  const admin = createSupabaseAdminClient();
  const statuses = await loadSectionStatuses(briefId);
  const byKey = new Map(statuses.map((s) => [s.section_key, s]));
  for (const section of step.sections) {
    const row = byKey.get(section);
    if (!row || row.status === "skipped") continue;
    await admin
      .from("brief_sections")
      .update({ status: "failed" })
      .eq("id", row.id);
  }
}

async function finalizeBrief(
  briefId: string,
  fingerprint: string,
): Promise<string> {
  const admin = createSupabaseAdminClient();
  const statuses = await loadSectionStatuses(briefId);
  const hasPending = statuses.some(
    (s) => s.status === "pending" || s.status === "generating",
  );
  const hasFailed = statuses.some((s) => s.status === "failed");
  const status = hasPending ? "generating" : hasFailed ? "partial" : "ready";
  await admin
    .from("peel_briefs")
    .update({
      status,
      generated_at: hasPending ? null : new Date().toISOString(),
      inputs_fingerprint: fingerprint,
    })
    .eq("id", briefId);
  return status;
}

/** Generate one step of the brief. Drives the resumable queue. */
export async function generateNextSection(
  interviewId: string,
  userId: string,
): Promise<BriefProgress> {
  const admin = createSupabaseAdminClient();
  const { subscription, entitlements } = await planForUser(userId);
  const depth = entitlements.briefDepth;

  const existingBrief = await admin
    .from("peel_briefs")
    .select("id, status")
    .eq("interview_id", interviewId)
    .maybeSingle();

  // First call for an ungenerated brief → reserve brief_generate.
  if (!existingBrief.data || existingBrief.data.status === "empty") {
    const period = usagePeriod(subscription);
    const reservation = await reserveUsage({
      userId,
      feature: "brief_generate",
      quantity: 1,
      limit: featureLimit(entitlements.key, "brief_generate"),
      periodStart: period.start,
      periodEnd: period.end,
      interviewId,
    });
    if (!reservation.ok) {
      return {
        briefId: existingBrief.data?.id ?? "",
        status: "empty",
        done: true,
        generatedStep: null,
        remaining: 0,
        limitExceeded: reservation.reason === "limit_exceeded",
        error:
          reservation.reason === "limit_exceeded"
            ? "You've reached your plan's Peel Brief limit for this period."
            : "Couldn't start generation.",
      };
    }
    await settleUsage(reservation.eventId, "completed", { provider: "mock" });
  }

  const { briefId } = await ensureBrief(interviewId, userId, depth);
  const { blocks, fingerprint, validIds } = await loadSourceBlocks(interviewId);

  const statuses = await loadSectionStatuses(briefId);
  const step = nextPendingStep(statuses);
  if (!step) {
    const status = await finalizeBrief(briefId, fingerprint);
    return { briefId, status, done: true, generatedStep: null, remaining: 0 };
  }

  await generateStep(briefId, interviewId, userId, step, blocks, validIds);

  const status = await finalizeBrief(briefId, fingerprint);
  const remaining = nextPendingStep(await loadSectionStatuses(briefId)) ? 1 : 0;
  return {
    briefId,
    status,
    done: remaining === 0,
    generatedStep: step.key,
    remaining,
  };
}

async function generateStep(
  briefId: string,
  interviewId: string,
  userId: string,
  step: BriefStep,
  blocks: import("@/lib/ai/context").SourceBlock[],
  validIds: Set<string>,
): Promise<void> {
  if (step.task === null) {
    const snapshot = await buildSnapshot(interviewId);
    await persistStep(briefId, userId, step, { snapshot }, null, [], validIds);
    return;
  }

  const schema = TASK_SCHEMAS[step.task] as ZodType<Record<string, unknown>>;
  const { input } = buildContextInput(blocks);
  const result = await runGeneration<Record<string, unknown>>({
    userId,
    interviewId,
    task: step.task,
    input,
    schema,
  });

  if (!result.ok) {
    await markStepFailed(briefId, step);
    return;
  }
  const output = result.data as Record<string, unknown>;
  const contentBySection = mapTaskOutput(step.task, output);
  await persistStep(
    briefId,
    userId,
    step,
    contentBySection,
    result.generationId,
    citedIds(output),
    validIds,
  );
}

/** Regenerate the step that owns a section (metered as section_regenerate). */
export async function regenerateSection(
  interviewId: string,
  userId: string,
  sectionKey: BriefSectionKey,
): Promise<BriefProgress> {
  const admin = createSupabaseAdminClient();
  const step = stepForSection(sectionKey);
  const { subscription, entitlements } = await planForUser(userId);

  const { data: brief } = await admin
    .from("peel_briefs")
    .select("id")
    .eq("interview_id", interviewId)
    .maybeSingle();
  if (!brief || !step) {
    return {
      briefId: brief?.id ?? "",
      status: "failed",
      done: true,
      generatedStep: null,
      remaining: 0,
      error: "Nothing to regenerate.",
    };
  }

  const period = usagePeriod(subscription);
  const reservation = await reserveUsage({
    userId,
    feature: "section_regenerate",
    quantity: 1,
    limit: featureLimit(entitlements.key, "section_regenerate"),
    periodStart: period.start,
    periodEnd: period.end,
    interviewId,
  });
  if (!reservation.ok) {
    return {
      briefId: brief.id,
      status: "ready",
      done: true,
      generatedStep: null,
      remaining: 0,
      limitExceeded: reservation.reason === "limit_exceeded",
      error:
        reservation.reason === "limit_exceeded"
          ? "You've reached your plan's section-regeneration limit."
          : "Couldn't regenerate.",
    };
  }

  const { blocks, fingerprint, validIds } = await loadSourceBlocks(interviewId);
  await generateStep(brief.id, interviewId, userId, step, blocks, validIds);
  await settleUsage(reservation.eventId, "completed", { provider: "mock" });
  const status = await finalizeBrief(brief.id, fingerprint);
  return {
    briefId: brief.id,
    status,
    done: true,
    generatedStep: step.key,
    remaining: 0,
  };
}
