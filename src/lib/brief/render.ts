import { SECTION_TITLES, type BriefSectionKey } from "@/lib/brief/plan";
import {
  EMPLOYMENT_TYPE_LABELS,
  FORMAT_LABELS,
  STAGE_LABELS,
} from "@/lib/interviews/labels";
import { formatInterviewTime } from "@/lib/format";

type Content = Record<string, unknown>;

const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** A plain-text rendering of a section for the copy button. */
export function sectionToPlainText(
  key: BriefSectionKey,
  content: Content | null,
): string {
  if (!content) return "";
  const title = SECTION_TITLES[key];
  const lines: string[] = [title, ""];
  const bullets = (label: string, items: string[]) => {
    if (items.length) {
      lines.push(`${label}:`);
      items.forEach((i) => lines.push(`  • ${i}`));
    }
  };

  switch (key) {
    case "snapshot": {
      const c = content as Record<string, unknown>;
      lines.push(`${c.company_name ?? ""} — ${c.position_title ?? ""}`);
      const when = formatInterviewTime(
        c.interview_at as string,
        c.interview_timezone as string,
      );
      if (when) lines.push(when);
      break;
    }
    case "company_overview":
      lines.push(String(content.overview ?? ""));
      bullets("Products", strArr(content.products));
      bullets("Culture signals", strArr(content.culture_signals));
      break;
    case "company_priorities":
      (Array.isArray(content.priorities) ? content.priorities : []).forEach(
        (p) => {
          const pr = p as { text?: string; why?: string };
          lines.push(`• ${pr.text ?? ""}${pr.why ? ` — ${pr.why}` : ""}`);
        },
      );
      bullets("Challenges", strArr(content.challenges));
      break;
    case "role_analysis":
      bullets("Responsibilities", strArr(content.responsibilities));
      bullets("Required skills", strArr(content.required_skills));
      bullets("Emphasize", strArr(content.emphasize));
      break;
    case "next_action":
      lines.push(String(content.next_action ?? ""));
      break;
    case "condensed_summary":
      lines.push(String(content.tldr ?? ""));
      bullets("Last-minute checklist", strArr(content.last_minute_checklist));
      break;
    default:
      lines.push(JSON.stringify(content, null, 2));
  }
  return lines.join("\n").trim();
}

export const SNAPSHOT_LABELS = {
  FORMAT_LABELS,
  STAGE_LABELS,
  EMPLOYMENT_TYPE_LABELS,
};
