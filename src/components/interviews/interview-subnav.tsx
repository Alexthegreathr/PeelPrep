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
  { key: "readiness", label: "Readiness", path: "readiness" },
  { key: "outcome", label: "Outcome", path: "outcome" },
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
      className="mb-6 flex flex-nowrap gap-1 overflow-x-auto border-b [scrollbar-width:none] [mask-image:linear-gradient(to_right,#000_calc(100%-1.75rem),transparent)] [&::-webkit-scrollbar]:hidden lg:[mask-image:none]"
    >
      <Link
        href={`/interviews/${interviewId}`}
        className="shrink-0 rounded-t-lg px-3 py-2 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← Overview
      </Link>
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`/interviews/${interviewId}/${tab.path}`}
          aria-current={active === tab.key ? "page" : undefined}
          className={
            "shrink-0 rounded-t-lg border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
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
