import "server-only";

import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  AiError,
  type AiProvider,
  type AiUsage,
  type StructuredRequest,
  type StructuredResult,
} from "@/lib/ai/provider";
import { getAiProvider } from "@/lib/ai/factory";
import { modelForTask, MAX_OUTPUT_TOKENS } from "@/lib/ai/models";
import { estimateCostCents } from "@/lib/ai/costs";
import { upsertPromptVersion } from "@/lib/ai/prompt-registry";
import { REPAIR_MARKER } from "@/lib/ai/mock-provider";
import type { AiTask } from "@/lib/ai/tasks";
import { effectivePlanKey } from "@/lib/billing/plans";
import {
  usagePeriod,
  featureLimit,
  type UsageFeature,
} from "@/lib/usage/features";
import { reserveUsage, settleUsage } from "@/lib/usage/ledger";
import type { SubscriptionRow } from "@/lib/data/types";

/**
 * Generation service (AI_ARCHITECTURE.md §6). `runGeneration` is the core AI
 * call + validation + one repair retry + ai_generations bookkeeping (metadata
 * only — no prompt/response bodies, no reasoning). `runMeteredGeneration` wraps
 * it in reserve → run → settle with the refund policy (§7). Multi-section flows
 * (the Peel Brief) reserve once and call `runGeneration` per section.
 */

type GenStatus =
  "succeeded" | "validation_failed" | "provider_error" | "refused" | "timeout";

function errorToGenStatus(code: string): GenStatus {
  switch (code) {
    case "validation_failed":
      return "validation_failed";
    case "refused":
      return "refused";
    case "timeout":
      return "timeout";
    default:
      return "provider_error";
  }
}

const SAFE_MESSAGES: Record<string, string> = {
  provider_unavailable:
    "The AI service is temporarily unavailable. Please try again.",
  timeout: "That took too long. Please try again.",
  refused: "We couldn't generate this content. Try adjusting your inputs.",
  validation_failed: "The AI response couldn't be processed. Please try again.",
  context_too_large:
    "There's too much text to analyze at once. Trim your inputs and retry.",
  unknown: "Something went wrong generating this. Please try again.",
};

async function generateWithRepair<T>(
  provider: AiProvider,
  req: StructuredRequest<T>,
): Promise<StructuredResult<T>> {
  try {
    return await provider.generateStructured(req);
  } catch (error) {
    if (error instanceof AiError && error.code === "validation_failed") {
      const repaired: StructuredRequest<T> = {
        ...req,
        input: `${req.input}\n\n${REPAIR_MARKER} The previous response failed schema validation. Return ONLY valid JSON matching the schema exactly.`,
      };
      return await provider.generateStructured(repaired);
    }
    throw error;
  }
}

async function writeAiGeneration(entry: {
  userId: string;
  interviewId: string | null;
  task: AiTask;
  provider: string;
  model: string;
  promptVersionId: string;
  status: GenStatus;
  inputTokens?: number;
  outputTokens?: number;
  costCents?: number;
  durationMs?: number;
  errorCode?: string;
  usageEventId: string | null;
}): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("ai_generations")
    .insert({
      user_id: entry.userId,
      interview_id: entry.interviewId,
      task: entry.task,
      provider: entry.provider,
      model: entry.model,
      prompt_version_id: entry.promptVersionId,
      status: entry.status,
      input_tokens: entry.inputTokens ?? null,
      output_tokens: entry.outputTokens ?? null,
      estimated_cost_cents: entry.costCents ?? null,
      duration_ms: entry.durationMs ?? null,
      error_code: entry.errorCode ?? null,
      usage_event_id: entry.usageEventId,
    })
    .select("id")
    .single();
  if (error) {
    console.error("writeAiGeneration failed", error.message);
    return null;
  }
  return data.id;
}

// ── Core (unmetered) generation ──────────────────────────────────────────
export type CoreSuccess<T> = {
  ok: true;
  data: T;
  generationId: string | null;
  usage: AiUsage;
  model: string;
  provider: string;
  costCents: number;
};
export type CoreFailure = {
  ok: false;
  code: GenStatus;
  message: string;
  generationId: string | null;
};
export type CoreResult<T> = CoreSuccess<T> | CoreFailure;

export async function runGeneration<T>(opts: {
  userId: string;
  interviewId?: string | null;
  task: AiTask;
  input: string;
  schema: z.ZodType<T>;
  usageEventId?: string | null;
}): Promise<CoreResult<T>> {
  const {
    userId,
    interviewId = null,
    task,
    input,
    schema,
    usageEventId = null,
  } = opts;

  const prompt = await upsertPromptVersion(task);
  const provider = getAiProvider();
  const model = modelForTask(task);
  const req: StructuredRequest<T> = {
    task,
    system: prompt.system,
    input,
    schema,
    maxOutputTokens: MAX_OUTPUT_TOKENS[task],
    model,
  };

  try {
    const result = await generateWithRepair(provider, req);
    const costCents = estimateCostCents(result.model, result.usage);
    const generationId = await writeAiGeneration({
      userId,
      interviewId,
      task,
      provider: provider.name,
      model: result.model,
      promptVersionId: prompt.id,
      status: "succeeded",
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      costCents,
      durationMs: result.durationMs,
      usageEventId,
    });
    return {
      ok: true,
      data: result.data,
      generationId,
      usage: result.usage,
      model: result.model,
      provider: provider.name,
      costCents,
    };
  } catch (error) {
    const code = error instanceof AiError ? error.code : "unknown";
    const genStatus = errorToGenStatus(code);
    const generationId = await writeAiGeneration({
      userId,
      interviewId,
      task,
      provider: provider.name,
      model,
      promptVersionId: prompt.id,
      status: genStatus,
      errorCode: code,
      usageEventId,
    });
    return {
      ok: false,
      code: genStatus,
      message: SAFE_MESSAGES[code] ?? SAFE_MESSAGES.unknown,
      generationId,
    };
  }
}

// ── Metered generation (single-call features) ────────────────────────────
export type GenerationSuccess<T> = {
  ok: true;
  data: T;
  generationId: string | null;
  usageEventId: string;
};
export type GenerationFailure = {
  ok: false;
  code: "limit_exceeded" | GenStatus | "error";
  message: string;
};
export type GenerationResult<T> = GenerationSuccess<T> | GenerationFailure;

export async function runMeteredGeneration<T>(opts: {
  userId: string;
  interviewId?: string | null;
  task: AiTask;
  feature: UsageFeature;
  quantity?: number;
  input: string;
  schema: z.ZodType<T>;
  subscription: SubscriptionRow | null;
}): Promise<GenerationResult<T>> {
  const {
    userId,
    interviewId = null,
    task,
    feature,
    quantity = 1,
    input,
    schema,
    subscription,
  } = opts;

  const planKey = subscription ? effectivePlanKey(subscription) : "free";
  const period = usagePeriod(subscription);
  const limit = featureLimit(planKey, feature);

  const reservation = await reserveUsage({
    userId,
    feature,
    quantity,
    limit,
    periodStart: period.start,
    periodEnd: period.end,
    interviewId,
  });
  if (!reservation.ok) {
    if (reservation.reason === "limit_exceeded") {
      return {
        ok: false,
        code: "limit_exceeded",
        message: "You've reached your plan limit for this feature.",
      };
    }
    return { ok: false, code: "error", message: SAFE_MESSAGES.unknown };
  }
  const usageEventId = reservation.eventId;

  const core = await runGeneration({
    userId,
    interviewId,
    task,
    input,
    schema,
    usageEventId,
  });

  if (core.ok) {
    await settleUsage(usageEventId, "completed", {
      inputTokens: core.usage.inputTokens,
      outputTokens: core.usage.outputTokens,
      costCents: core.costCents,
      model: core.model,
      provider: core.provider,
      generationId: core.generationId ?? undefined,
    });
    return {
      ok: true,
      data: core.data,
      generationId: core.generationId,
      usageEventId,
    };
  }

  await settleUsage(usageEventId, "refunded", {
    generationId: core.generationId ?? undefined,
  });
  return { ok: false, code: core.code, message: core.message };
}
