import type { BriefSectionKey } from "@/lib/brief/plan";
import {
  EMPLOYMENT_TYPE_LABELS,
  FORMAT_LABELS,
  STAGE_LABELS,
} from "@/lib/interviews/labels";
import { formatInterviewTime } from "@/lib/format";

/**
 * Pure renderer for a brief section's validated content, keyed by section type.
 * All text is React-escaped; no dangerouslySetInnerHTML on AI/user content.
 */
type Content = Record<string, unknown>;

const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

function Bullets({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h4>
      {children}
    </div>
  );
}

export function SectionContent({
  sectionKey,
  content,
}: {
  sectionKey: BriefSectionKey;
  content: Content | null;
}) {
  if (!content) return null;

  switch (sectionKey) {
    case "snapshot": {
      const c = content;
      const interviewers = Array.isArray(c.interviewers) ? c.interviewers : [];
      const rows: [string, string][] = [
        [
          "When",
          formatInterviewTime(
            c.interview_at as string,
            c.interview_timezone as string,
          ) || "Not scheduled",
        ],
        ["Format", c.format ? FORMAT_LABELS[c.format as string] : "—"],
        ["Stage", c.stage ? STAGE_LABELS[c.stage as string] : "—"],
        [
          "Employment",
          c.employment_type
            ? EMPLOYMENT_TYPE_LABELS[c.employment_type as string]
            : "—",
        ],
        ["Location", (c.location as string) || "—"],
        ["Meeting", (c.meeting_location as string) || "—"],
      ];
      return (
        <div className="flex flex-col gap-4 text-sm">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {k}
                </dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {interviewers.length > 0 ? (
            <Group label="Interviewers">
              <Bullets
                items={interviewers.map((iv) => {
                  const i = iv as { name?: string; title?: string };
                  return i.title ? `${i.name} — ${i.title}` : String(i.name);
                })}
              />
            </Group>
          ) : null}
        </div>
      );
    }

    case "company_overview":
      return (
        <div className="flex flex-col gap-4 text-sm">
          <p>{String(content.overview ?? "")}</p>
          {content.business_model ? (
            <Group label="Business model">
              <p>{String(content.business_model)}</p>
            </Group>
          ) : null}
          {strArr(content.products).length ? (
            <Group label="Products & services">
              <Bullets items={strArr(content.products)} />
            </Group>
          ) : null}
          {strArr(content.competitors).length ? (
            <Group label="Competitors">
              <Bullets items={strArr(content.competitors)} />
            </Group>
          ) : null}
          {strArr(content.culture_signals).length ? (
            <Group label="Culture signals">
              <Bullets items={strArr(content.culture_signals)} />
            </Group>
          ) : null}
          {strArr(content.role_connections).length ? (
            <Group label="Connections to the role">
              <Bullets items={strArr(content.role_connections)} />
            </Group>
          ) : null}
        </div>
      );

    case "company_priorities":
      return (
        <div className="flex flex-col gap-4 text-sm">
          <ul className="flex flex-col gap-2">
            {(Array.isArray(content.priorities) ? content.priorities : []).map(
              (p, i) => {
                const pr = p as { text?: string; why?: string };
                return (
                  <li key={i}>
                    <span className="font-medium">{pr.text}</span>
                    {pr.why ? (
                      <span className="text-muted-foreground"> — {pr.why}</span>
                    ) : null}
                  </li>
                );
              },
            )}
          </ul>
          {strArr(content.challenges).length ? (
            <Group label="Challenges">
              <Bullets items={strArr(content.challenges)} />
            </Group>
          ) : null}
        </div>
      );

    case "role_analysis":
      return (
        <div className="flex flex-col gap-4 text-sm">
          {content.seniority ? (
            <p>
              <span className="font-medium">Seniority:</span>{" "}
              {String(content.seniority)}
            </p>
          ) : null}
          {strArr(content.responsibilities).length ? (
            <Group label="Top responsibilities">
              <Bullets items={strArr(content.responsibilities)} />
            </Group>
          ) : null}
          {strArr(content.required_skills).length ? (
            <Group label="Required skills">
              <Bullets items={strArr(content.required_skills)} />
            </Group>
          ) : null}
          {strArr(content.preferred_skills).length ? (
            <Group label="Preferred skills">
              <Bullets items={strArr(content.preferred_skills)} />
            </Group>
          ) : null}
          {strArr(content.evaluation_criteria).length ? (
            <Group label="Likely evaluation criteria">
              <Bullets items={strArr(content.evaluation_criteria)} />
            </Group>
          ) : null}
          {strArr(content.strengths).length ? (
            <Group label="Strengths to lean on">
              <Bullets items={strArr(content.strengths)} />
            </Group>
          ) : null}
          {strArr(content.gaps).length ? (
            <Group label="Gaps to prepare for">
              <Bullets items={strArr(content.gaps)} />
            </Group>
          ) : null}
          {strArr(content.emphasize).length ? (
            <Group label="Experiences to emphasize">
              <Bullets items={strArr(content.emphasize)} />
            </Group>
          ) : null}
        </div>
      );

    case "interviewer_intel":
      return (
        <div className="flex flex-col gap-5 text-sm">
          {(Array.isArray(content.interviewers)
            ? content.interviewers
            : []
          ).map((iv, i) => {
            const p = iv as {
              name?: string;
              professional_summary?: string;
              expertise?: string[];
              likely_perspective?: string;
              suggested_rapport_topics?: string[];
            };
            return (
              <div key={i} className="flex flex-col gap-2">
                <p className="font-medium">{p.name}</p>
                {p.professional_summary ? (
                  <p>{p.professional_summary}</p>
                ) : null}
                {p.likely_perspective ? (
                  <p className="text-muted-foreground">
                    Likely perspective: {p.likely_perspective}
                  </p>
                ) : null}
                {strArr(p.expertise).length ? (
                  <p className="text-muted-foreground">
                    Expertise: {strArr(p.expertise).join(", ")}
                  </p>
                ) : null}
                {strArr(p.suggested_rapport_topics).length ? (
                  <p className="text-muted-foreground">
                    Rapport topics:{" "}
                    {strArr(p.suggested_rapport_topics).join(", ")}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      );

    case "likely_themes":
      return (
        <ul className="flex flex-col gap-2 text-sm">
          {(Array.isArray(content.likely_themes)
            ? content.likely_themes
            : []
          ).map((t, i) => {
            const th = t as { theme?: string; why?: string };
            return (
              <li key={i}>
                <span className="font-medium">{th.theme}</span>
                {th.why ? (
                  <span className="text-muted-foreground"> — {th.why}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      );

    case "questions_to_ask":
      return (
        <ul className="flex flex-col gap-3 text-sm">
          {(Array.isArray(content.questions) ? content.questions : []).map(
            (q, i) => {
              const qq = q as { text?: string; why_it_lands?: string };
              return (
                <li key={i}>
                  <p className="font-medium">{qq.text}</p>
                  {qq.why_it_lands ? (
                    <p className="text-muted-foreground">{qq.why_it_lands}</p>
                  ) : null}
                </li>
              );
            },
          )}
        </ul>
      );

    case "risks_gaps":
      return (
        <ul className="flex flex-col gap-3 text-sm">
          {(Array.isArray(content.risks_gaps) ? content.risks_gaps : []).map(
            (r, i) => {
              const rr = r as { risk?: string; mitigation?: string };
              return (
                <li key={i}>
                  <p className="font-medium">{rr.risk}</p>
                  {rr.mitigation ? (
                    <p className="text-muted-foreground">
                      Mitigation: {rr.mitigation}
                    </p>
                  ) : null}
                </li>
              );
            },
          )}
        </ul>
      );

    case "next_action":
      return <p className="text-sm">{String(content.next_action ?? "")}</p>;

    case "condensed_summary":
      return (
        <div className="flex flex-col gap-4 text-sm">
          <p>{String(content.tldr ?? "")}</p>
          {strArr(content.last_minute_checklist).length ? (
            <Group label="Last-minute checklist">
              <Bullets items={strArr(content.last_minute_checklist)} />
            </Group>
          ) : null}
        </div>
      );

    default:
      return null;
  }
}
