import { describe, expect, it } from "vitest";

import { estimateCostCents } from "./costs";

describe("estimateCostCents", () => {
  it("computes opus cost from token usage", () => {
    // 1M input @ $5 + 1M output @ $25 = $30 = 3000 cents.
    expect(
      estimateCostCents("claude-opus-4-8", {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      }),
    ).toBe(3000);
  });

  it("is zero for the mock model", () => {
    expect(
      estimateCostCents("mock", { inputTokens: 5000, outputTokens: 5000 }),
    ).toBe(0);
  });

  it("uses a fallback rate for unknown models", () => {
    expect(
      estimateCostCents("some-future-model", {
        inputTokens: 1_000_000,
        outputTokens: 0,
      }),
    ).toBeGreaterThan(0);
  });
});
