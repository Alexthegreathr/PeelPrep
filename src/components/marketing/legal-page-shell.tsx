import Link from "next/link";

import { Logo } from "@/components/shared/logo";

/**
 * Shared chrome for the standalone legal pages (/privacy, /terms) so the
 * consent links captured at signup always resolve to real content. The full
 * marketing navigation shell is layered on in Phase 12; these pages stay
 * self-contained and readable on their own until then.
 */
export function LegalPageShell({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col bg-secondary/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo />
          <Link
            href="/"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Back to home
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Effective {effectiveDate}
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-foreground/90">
          {children}
        </div>
      </div>

      <footer className="border-t bg-background">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} PeelPrep</span>
          <nav className="flex gap-4" aria-label="Legal">
            <Link
              href="/privacy"
              className="underline-offset-4 hover:underline"
            >
              Privacy
            </Link>
            <Link href="/terms" className="underline-offset-4 hover:underline">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

/** A titled section within a legal document. */
export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {heading}
      </h2>
      {children}
    </section>
  );
}
