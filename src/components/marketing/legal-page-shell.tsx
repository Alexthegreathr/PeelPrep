/**
 * Content wrapper for the legal pages (/privacy, /terms). The marketing layout
 * provides the header/footer chrome; this renders the titled prose, a jump-to
 * table of contents, and each section with a stable anchor id.
 */

export type LegalDocSection = {
  /** Section heading; also the source of the anchor id (via slugify). */
  heading: string;
  /** The section body (rich prose / lists). */
  body: React.ReactNode;
};

/** Turn a heading into a stable, URL-safe anchor id. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function LegalPageShell({
  title,
  effectiveDate,
  intro,
  sections,
}: {
  title: string;
  effectiveDate: string;
  intro?: React.ReactNode;
  sections: LegalDocSection[];
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      {/* Title stays full-width for presence. */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Effective {effectiveDate}
        </p>
      </div>

      {/* Reading column, tightened to a comfortable measure. */}
      <div className="mt-8 max-w-[68ch]">
        {intro ? (
          <div className="text-sm leading-relaxed text-foreground/90">
            {intro}
          </div>
        ) : null}

        <nav
          aria-label="On this page"
          className="mt-6 rounded-xl border bg-card/70 p-4 shadow-sm"
        >
          <p className="mb-2 text-sm font-medium text-foreground">
            On this page
          </p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {sections.map((section) => (
              <li key={section.heading}>
                <a
                  href={`#${slugify(section.heading)}`}
                  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-foreground/90">
          {sections.map((section) => (
            <LegalSection key={section.heading} heading={section.heading}>
              {section.body}
            </LegalSection>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A titled section within a legal document, anchored by its heading slug. */
export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section id={slugify(heading)} className="flex scroll-mt-24 flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {heading}
      </h2>
      {children}
    </section>
  );
}
