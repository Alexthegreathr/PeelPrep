import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Logo />
        <nav
          className="hidden items-center gap-6 text-sm md:flex"
          aria-label="Main"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t bg-secondary/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">
            Know the room. Own the interview. AI-powered interview preparation
            grounded in what you provide.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm">
          <nav aria-label="Product" className="flex flex-col gap-2">
            <span className="font-medium">Product</span>
            <Link
              className="text-muted-foreground hover:text-foreground"
              href="/features"
            >
              Features
            </Link>
            <Link
              className="text-muted-foreground hover:text-foreground"
              href="/how-it-works"
            >
              How it works
            </Link>
            <Link
              className="text-muted-foreground hover:text-foreground"
              href="/pricing"
            >
              Pricing
            </Link>
          </nav>
          <nav aria-label="Legal" className="flex flex-col gap-2">
            <span className="font-medium">Legal</span>
            <Link
              className="text-muted-foreground hover:text-foreground"
              href="/privacy"
            >
              Privacy
            </Link>
            <Link
              className="text-muted-foreground hover:text-foreground"
              href="/terms"
            >
              Terms
            </Link>
          </nav>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} PeelPrep. AI guidance is preparation
          support, not a guarantee of any outcome.
        </div>
      </div>
    </footer>
  );
}
