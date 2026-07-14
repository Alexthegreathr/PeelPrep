import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ManualResearchProvider,
  MockResearchProvider,
  getResearchProvider,
} from "./providers";
import { RESEARCH_UNAVAILABLE_NOTE } from "./provider";

describe("research providers", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("manual provider surfaces no sources and states research is unavailable", async () => {
    const r = await new ManualResearchProvider().findSources({});
    expect(r.available).toBe(false);
    expect(r.sources).toHaveLength(0);
    expect(r.note).toBe(RESEARCH_UNAVAILABLE_NOTE);
  });

  it("mock provider returns clearly-fictional labeled sources", async () => {
    const r = await new MockResearchProvider().findSources({ company: "Acme" });
    expect(r.available).toBe(true);
    expect(r.sources.length).toBeGreaterThan(0);
    expect(r.sources.every((s) => s.origin === "mock_research")).toBe(true);
    expect(r.sources[0].title.toLowerCase()).toContain("fictional");
  });

  it("selects manual when explicitly configured", () => {
    vi.stubEnv("RESEARCH_PROVIDER", "manual");
    expect(getResearchProvider().name).toBe("manual");
  });

  it("defaults to mock in mock-AI mode", () => {
    vi.stubEnv("RESEARCH_PROVIDER", "");
    vi.stubEnv("AI_PROVIDER", "mock");
    expect(getResearchProvider().name).toBe("mock");
  });
});
