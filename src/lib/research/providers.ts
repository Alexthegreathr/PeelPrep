import {
  RESEARCH_UNAVAILABLE_NOTE,
  type ResearchProvider,
  type ResearchQuery,
  type ResearchResult,
} from "@/lib/research/provider";

/**
 * Manual provider: the only external facts are what the user pasted (already
 * stored as interview_sources). It surfaces no new sources and states plainly
 * that current research is unavailable — the app never claims otherwise.
 */
export class ManualResearchProvider implements ResearchProvider {
  readonly name = "manual" as const;
  async findSources(_query: ResearchQuery): Promise<ResearchResult> {
    void _query;
    return { available: false, sources: [], note: RESEARCH_UNAVAILABLE_NOTE };
  }
}

/**
 * Mock provider: deterministic, clearly-fictional sources for demos/tests.
 */
export class MockResearchProvider implements ResearchProvider {
  readonly name = "mock" as const;
  async findSources(query: ResearchQuery): Promise<ResearchResult> {
    const company = query.company?.trim() || "the company";
    return {
      available: true,
      note: "Demo research — these sources are fictional and clearly labeled.",
      sources: [
        {
          title: `${company} announces record produce-logistics quarter (Demo — fictional)`,
          url: null,
          publisher: "Fictional Business Wire",
          publishedAt: null,
          snippet:
            "Illustrative sample source used in demo mode. Not a real article.",
          origin: "mock_research",
        },
        {
          title: `Inside ${company}'s reliability culture (Demo — fictional)`,
          url: null,
          publisher: "Fictional Tech Weekly",
          publishedAt: null,
          snippet: "Illustrative sample source used in demo mode.",
          origin: "mock_research",
        },
      ],
    };
  }
}

export function getResearchProvider(): ResearchProvider {
  const configured = process.env.RESEARCH_PROVIDER;
  if (configured === "mock") return new MockResearchProvider();
  if (configured === "manual") return new ManualResearchProvider();
  // Default: mock in demo/mock-AI mode, otherwise manual.
  const demo =
    process.env.NEXT_PUBLIC_DEMO_MODE === "1" ||
    (process.env.AI_PROVIDER ?? "mock") === "mock";
  return demo ? new MockResearchProvider() : new ManualResearchProvider();
}
