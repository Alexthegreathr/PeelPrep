/**
 * Context builder (AI_ARCHITECTURE.md §5). Assembles the model input as
 * explicitly tagged source blocks so the prompt can treat them as data, not
 * instructions. Oversized inputs are truncated by priority; truncation is
 * reported so the generation metadata can record it.
 */

export type SourceBlock = {
  sourceId: string;
  /** e.g. job_description, resume_extract, company_info, interviewer_background, candidate_note */
  kind: string;
  title: string;
  content: string;
  /** Higher priority is kept first when truncating. */
  priority?: number;
};

export const DEFAULT_MAX_CONTEXT_CHARS = 48_000;

const DEFAULT_PRIORITY: Record<string, number> = {
  job_description: 100,
  document_text: 90,
  resume_extract: 90,
  interviewer_background: 70,
  company_info: 60,
  candidate_note: 50,
  url_reference: 10,
};

function escapeForTag(value: string): string {
  // Neutralize any attempt to close/open tags inside user content.
  return value.replace(/</g, "‹").replace(/>/g, "›");
}

export type BuiltContext = {
  input: string;
  truncated: boolean;
  usedChars: number;
};

export function buildContextInput(
  blocks: SourceBlock[],
  extraInstruction?: string,
  maxChars: number = DEFAULT_MAX_CONTEXT_CHARS,
): BuiltContext {
  const ordered = [...blocks].sort(
    (a, b) =>
      (b.priority ?? DEFAULT_PRIORITY[b.kind] ?? 40) -
      (a.priority ?? DEFAULT_PRIORITY[a.kind] ?? 40),
  );

  const parts: string[] = [];
  let used = 0;
  let truncated = false;

  for (const block of ordered) {
    const header = `<source id="${escapeForTag(block.sourceId)}" kind="${escapeForTag(block.kind)}" title="${escapeForTag(block.title)}">`;
    const footer = "</source>";
    const budget = maxChars - used - header.length - footer.length;
    if (budget <= 0) {
      truncated = true;
      break;
    }
    let body = escapeForTag(block.content);
    if (body.length > budget) {
      body = body.slice(0, budget);
      truncated = true;
    }
    const rendered = `${header}\n${body}\n${footer}`;
    parts.push(rendered);
    used += rendered.length;
  }

  const blocksText =
    parts.join("\n\n") ||
    '<source kind="none">No sources were provided.</source>';
  const input = extraInstruction
    ? `${blocksText}\n\n${extraInstruction}`
    : blocksText;
  return { input, truncated, usedChars: used };
}
