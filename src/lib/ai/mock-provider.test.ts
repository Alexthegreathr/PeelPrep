import { afterEach, describe, expect, it, vi } from "vitest";

import { MockAiProvider, REPAIR_MARKER } from "./mock-provider";
import { companyAnalysisSchema } from "./schemas";
import { AiError, type StructuredRequest } from "./provider";
import { AI_TASKS, type AiTask } from "./tasks";
import { TASK_SCHEMAS } from "./schemas";

function req<T>(
  over: Partial<StructuredRequest<T>> = {},
): StructuredRequest<T> {
  return {
    task: "company_analysis",
    system: "system",
    input: "some interview context",
    schema: companyAnalysisSchema as never,
    maxOutputTokens: 1000,
    model: "mock",
    ...over,
  };
}

describe("MockAiProvider", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns schema-valid output for every task", async () => {
    const provider = new MockAiProvider();
    for (const task of AI_TASKS) {
      const r = await provider.generateStructured(
        req({ task, schema: TASK_SCHEMAS[task] as never }),
      );
      expect(r.ok, task).toBe(true);
      expect(r.data, task).toBeTruthy();
    }
  });

  it("is deterministic for the same input", async () => {
    const provider = new MockAiProvider();
    const a = await provider.generateStructured(req());
    const b = await provider.generateStructured(req());
    expect(a.data).toEqual(b.data);
    expect(a.usage).toEqual(b.usage);
  });

  it("injects provider failures deterministically", async () => {
    vi.stubEnv("MOCK_AI_FAIL_CODE", "provider_unavailable");
    const provider = new MockAiProvider();
    await expect(provider.generateStructured(req())).rejects.toBeInstanceOf(
      AiError,
    );
  });

  it("fails validation once, then succeeds on the repair retry", async () => {
    vi.stubEnv("MOCK_AI_FAIL_CODE", "validation_once");
    const provider = new MockAiProvider();
    // First attempt (no repair marker) fails.
    await expect(provider.generateStructured(req())).rejects.toMatchObject({
      code: "validation_failed",
    });
    // Repair attempt (marker present) succeeds.
    const repaired = await provider.generateStructured(
      req({ input: `context ${REPAIR_MARKER}` }),
    );
    expect(repaired.ok).toBe(true);
  });

  it("always fails validation when configured", async () => {
    vi.stubEnv("MOCK_AI_FAIL_CODE", "validation");
    const provider = new MockAiProvider();
    await expect(
      provider.generateStructured(req({ input: `x ${REPAIR_MARKER}` })),
    ).rejects.toMatchObject({ code: "validation_failed" });
  });
});

// Guard: exhaustive task list stays in sync.
describe("AI_TASKS", () => {
  it("covers 12 launch tasks", () => {
    expect(AI_TASKS.length).toBe(12);
    const unique = new Set<AiTask>(AI_TASKS);
    expect(unique.size).toBe(AI_TASKS.length);
  });
});
