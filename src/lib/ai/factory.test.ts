import { afterEach, describe, expect, it, vi } from "vitest";

import { getAiProvider, isMockAiMode } from "./factory";

describe("getAiProvider", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to the mock provider", () => {
    vi.stubEnv("AI_PROVIDER", "");
    expect(getAiProvider().name).toBe("mock");
    expect(isMockAiMode()).toBe(true);
  });

  it("selects mock explicitly", () => {
    vi.stubEnv("AI_PROVIDER", "mock");
    expect(getAiProvider().name).toBe("mock");
  });

  it("anthropic provider requires an API key", () => {
    vi.stubEnv("AI_PROVIDER", "anthropic");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(() => getAiProvider()).toThrow();
    expect(isMockAiMode()).toBe(false);
  });
});
