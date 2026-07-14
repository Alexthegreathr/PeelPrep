import { describe, it, expect, afterEach, vi } from "vitest";

import { admin, integrationEnabled, makeUser, deleteUser } from "./helpers";
import { runMeteredGeneration } from "@/lib/ai/generation";
import { upsertPromptVersion } from "@/lib/ai/prompt-registry";
import { companyAnalysisSchema } from "@/lib/ai/schemas";

/**
 * Generation-service integration (IMPLEMENTATION_PLAN Phase 5): mock provider,
 * reserve → run → settle, refund on failure, validation_failed after repair,
 * limit enforcement, and ai_generations bookkeeping. Opt-in.
 */
async function generate(
  userId: string,
  extra?: Partial<Parameters<typeof runMeteredGeneration>[0]>,
) {
  return runMeteredGeneration({
    userId,
    task: "company_analysis",
    feature: "brief_generate",
    input: "some grounded interview context",
    schema: companyAnalysisSchema,
    subscription: null, // → free plan, UTC-month period
    ...extra,
  });
}

describe.skipIf(!integrationEnabled)("generation service", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("succeeds: valid data, ai_generations succeeded, usage completed", async () => {
    const user = await makeUser();
    try {
      const result = await generate(user.id);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(companyAnalysisSchema.safeParse(result.data).success).toBe(true);

      const { data: gen } = await admin()
        .from("ai_generations")
        .select(
          "status, provider, output_tokens, usage_event_id, prompt_version_id",
        )
        .eq("id", result.generationId)
        .single();
      expect(gen?.status).toBe("succeeded");
      expect(gen?.provider).toBe("mock");
      expect(gen?.output_tokens).toBeGreaterThan(0);
      expect(gen?.prompt_version_id).toBeTruthy();

      const { data: usage } = await admin()
        .from("usage_events")
        .select("status, provider")
        .eq("id", result.usageEventId)
        .single();
      expect(usage?.status).toBe("completed");
      expect(usage?.provider).toBe("mock");
    } finally {
      await deleteUser(user.id);
    }
  });

  it("refunds on provider failure and records provider_error", async () => {
    vi.stubEnv("MOCK_AI_FAIL_CODE", "provider_unavailable");
    const user = await makeUser();
    try {
      const result = await generate(user.id);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.code).toBe("provider_error");

      const { data: usage } = await admin()
        .from("usage_events")
        .select("status")
        .eq("user_id", user.id)
        .eq("feature", "brief_generate");
      expect((usage ?? []).every((u) => u.status === "refunded")).toBe(true);

      const { data: gen } = await admin()
        .from("ai_generations")
        .select("status, error_code")
        .eq("user_id", user.id);
      expect(gen?.[0]?.status).toBe("provider_error");
    } finally {
      await deleteUser(user.id);
    }
  });

  it("settles validation_failed after the repair retry also fails", async () => {
    vi.stubEnv("MOCK_AI_FAIL_CODE", "validation");
    const user = await makeUser();
    try {
      const result = await generate(user.id);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.code).toBe("validation_failed");
      const { data: gen } = await admin()
        .from("ai_generations")
        .select("status")
        .eq("user_id", user.id);
      expect(gen?.[0]?.status).toBe("validation_failed");
    } finally {
      await deleteUser(user.id);
    }
  });

  it("succeeds when the repair retry fixes validation", async () => {
    vi.stubEnv("MOCK_AI_FAIL_CODE", "validation_once");
    const user = await makeUser();
    try {
      const result = await generate(user.id);
      expect(result.ok).toBe(true);
      const { data: usage } = await admin()
        .from("usage_events")
        .select("status")
        .eq("user_id", user.id);
      expect(usage?.[0]?.status).toBe("completed");
    } finally {
      await deleteUser(user.id);
    }
  });

  it("blocks once the free-plan limit is reached", async () => {
    const user = await makeUser();
    try {
      // Free brief_generate limit is 1.
      const first = await generate(user.id);
      expect(first.ok).toBe(true);
      const second = await generate(user.id);
      expect(second.ok).toBe(false);
      if (!second.ok) expect(second.code).toBe("limit_exceeded");
    } finally {
      await deleteUser(user.id);
    }
  });

  it("upsert_prompt_version is idempotent (same id)", async () => {
    const a = await upsertPromptVersion("role_analysis");
    const b = await upsertPromptVersion("role_analysis");
    expect(a.id).toBe(b.id);
    expect(a.version).toBe(b.version);
  });
});
