import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * PeelPrep wordmark. Small peel-accent on the "P" per the design direction —
 * used sparingly, no scattered banana illustrations (PRODUCT_SPEC §Design).
 */
export function Logo({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 rounded-md text-xl font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-300 group-hover:motion-safe:scale-110 group-hover:motion-safe:-rotate-12"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 4c0 8 4 14 13 14 1.5 0 2-.5 2-1.5C20 9 14 4 6.5 4 5.5 4 5 4 5 4Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span>
        Peel<span className="text-accent-foreground">Prep</span>
      </span>
    </Link>
  );
}
