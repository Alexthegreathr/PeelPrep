import type { AiUsage } from "@/lib/ai/provider";

/**
 * Estimated cost table (AI_ARCHITECTURE.md §3): USD per million tokens, dated.
 * Rates are config, expected to drift, and always rendered as "estimated".
 * Used to compute usage_events.estimated_cost_cents / ai_generations.
 */
type Rate = { inputPerMTok: number; outputPerMTok: number };

// Rates as of 2026-07 (illustrative; update as pricing changes).
const RATES: Record<string, Rate> = {
  "claude-opus-4-8": { inputPerMTok: 5, outputPerMTok: 25 },
  "claude-sonnet-5": { inputPerMTok: 3, outputPerMTok: 15 },
  "claude-haiku-4-5-20251001": { inputPerMTok: 0.8, outputPerMTok: 4 },
  mock: { inputPerMTok: 0, outputPerMTok: 0 },
};

const FALLBACK: Rate = { inputPerMTok: 5, outputPerMTok: 25 };

/** Estimated cost in cents (numeric, 4dp) for a generation's token usage. */
export function estimateCostCents(model: string, usage: AiUsage): number {
  const rate = RATES[model] ?? FALLBACK;
  const dollars =
    (usage.inputTokens / 1_000_000) * rate.inputPerMTok +
    (usage.outputTokens / 1_000_000) * rate.outputPerMTok;
  return Math.round(dollars * 100 * 10_000) / 10_000;
}
