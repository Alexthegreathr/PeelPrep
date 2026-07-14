/**
 * Research abstraction (AI_ARCHITECTURE.md §5): "what external facts are
 * available?" — kept separate from how the model interprets them. The beta ships
 * `manual` (user-pasted text/URLs) and `mock` (fictional, labeled) providers.
 * No scraping, no login-protected sources, no live web. The AI model alone is
 * never presented as verifying current information.
 */
export type ResearchQuery = {
  company?: string | null;
  role?: string | null;
};

export type ResearchSource = {
  title: string;
  url: string | null;
  publisher: string | null;
  publishedAt: string | null;
  snippet: string | null;
  origin: "mock_research" | "user_provided";
};

export type ResearchResult = {
  /** Whether current external research is available in this configuration. */
  available: boolean;
  sources: ResearchSource[];
  /** User-facing note rendered when research is unavailable. */
  note: string;
};

export const RESEARCH_UNAVAILABLE_NOTE =
  "Current external research isn't available in this version — this analysis uses only the information you provided plus clearly-labeled general knowledge.";

export interface ResearchProvider {
  readonly name: "mock" | "manual";
  findSources(query: ResearchQuery): Promise<ResearchResult>;
}
