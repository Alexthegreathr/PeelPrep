import Link from "next/link";

/**
 * Sub-navigation across an interview's preparation surfaces. Only links to
 * routes that exist (no dead links); more tabs are added as phases land.
 */
const TABS = [
  { key: "brief", label: "Peel Brief", path: "brief" },
  { key: "questions", label: "Questions", path: "questions" },
  { key: "stories", label: "Stories", path: "stories" },
  { key: "practice", label: "Practice", path: "practice" },
] as const;

export type InterviewTab = (typeof TABS)[number]["key"];

export function InterviewSubnav({
  interviewId,
  active,
}: {
  interviewId: string;
  active: InterviewTab;
}) {
  return (
    <nav
      aria-label="Interview preparation"
      className="mb-6 flex flex-wrap gap-1 border-b"
    >
      <Link
        href={`/interviews/${interviewId}`}
        className="rounded-t-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Overview
      </Link>
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`/interviews/${interviewId}/${tab.path}`}
          aria-current={active === tab.key ? "page" : undefined}
          className={
            "rounded-t-lg border-b-2 px-3 py-2 text-sm transition-colors " +
            (active === tab.key
              ? "border-primary font-medium text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground")
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
