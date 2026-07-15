import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { Logo } from "@/components/shared/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-secondary/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Logo />
          <Link
            href="/"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-md flex-col gap-6">
          <p className="text-center text-sm text-balance text-muted-foreground">
            Turn every interview into a clear, confident plan.
          </p>

          <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
            {children}
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck
                aria-hidden="true"
                className="size-3.5 text-success"
              />
              Row-level security · your data stays yours
            </p>
            <p className="text-xs text-muted-foreground">
              <Link
                href="/privacy"
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Privacy
              </Link>
              <span aria-hidden="true" className="px-1.5 text-border">
                ·
              </span>
              <Link
                href="/terms"
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Terms
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
