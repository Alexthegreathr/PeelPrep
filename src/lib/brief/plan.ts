import type { AiTask } from "@/lib/ai/tasks";

/**
 * Peel Brief structure (PRODUCT_SPEC §Peel Brief, DATABASE.md §4). Generation
 * is driven step-by-step (one AI task per HTTP request → resumable, progress-
 * friendly, timeout-safe). A step may fill more than one section.
 */
export type BriefSectionKey =
  | "snapshot"
  | "company_overview"
  | "company_priorities"
  | "role_analysis"
  | "interviewer_intel"
  | "likely_themes"
  | "questions_to_ask"
  | "risks_gaps"
  | "next_action"
  | "condensed_summary";

export type BriefStep = {
  key: string;
  /** null = deterministic (no AI call), e.g. the snapshot. */
  task: AiTask | null;
  sections: BriefSectionKey[];
  label: string;
};

export const BRIEF_STEPS: BriefStep[] = [
  {
    key: "snapshot",
    task: null,
    sections: ["snapshot"],
    label: "Interview snapshot",
  },
  {
    key: "company",
    task: "company_analysis",
    sections: ["company_overview", "company_priorities"],
    label: "Company analysis",
  },
  {
    key: "role",
    task: "role_analysis",
    sections: ["role_analysis"],
    label: "Role analysis",
  },
  {
    key: "interviewer",
    task: "interviewer_analysis",
    sections: ["interviewer_intel"],
    label: "Interviewer intelligence",
  },
  {
    key: "themes",
    task: "themes_and_risks",
    sections: ["likely_themes", "risks_gaps", "next_action"],
    label: "Themes, risks & next action",
  },
  {
    key: "questions_to_ask",
    task: "questions_to_ask",
    sections: ["questions_to_ask"],
    label: "Questions to ask",
  },
  {
    key: "condensed",
    task: "condensed_brief",
    sections: ["condensed_summary"],
    label: "Condensed summary",
  },
];

export const SECTION_ORDER: BriefSectionKey[] = [
  "snapshot",
  "company_overview",
  "company_priorities",
  "role_analysis",
  "interviewer_intel",
  "likely_themes",
  "questions_to_ask",
  "risks_gaps",
  "next_action",
  "condensed_summary",
];

export const SECTION_TITLES: Record<BriefSectionKey, string> = {
  snapshot: "Interview snapshot",
  company_overview: "Company overview",
  company_priorities: "Company priorities",
  role_analysis: "Role analysis",
  interviewer_intel: "Interviewer intelligence",
  likely_themes: "Likely interview themes",
  questions_to_ask: "Questions to ask",
  risks_gaps: "Potential risks or gaps",
  next_action: "Recommended next action",
  condensed_summary: "Condensed summary",
};

export type BriefDepth = "basic" | "detailed";

// Free/basic depth skips the deeper risks_gaps section (ratified decision #3).
const BASIC_SKIPPED_SECTIONS: BriefSectionKey[] = ["risks_gaps"];

export function isSectionSkipped(
  section: BriefSectionKey,
  depth: BriefDepth,
): boolean {
  return depth === "basic" && BASIC_SKIPPED_SECTIONS.includes(section);
}

export function sectionSortOrder(section: BriefSectionKey): number {
  return SECTION_ORDER.indexOf(section);
}

export function stepForSection(
  section: BriefSectionKey,
): BriefStep | undefined {
  return BRIEF_STEPS.find((s) => s.sections.includes(section));
}
