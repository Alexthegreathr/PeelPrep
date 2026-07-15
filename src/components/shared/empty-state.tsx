import { cn } from "@/lib/utils";

/**
 * First-run / no-data empty state (PRODUCT_SPEC §Design: useful empty states,
 * peel-shaped accent used sparingly). Presentational only.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-secondary/30 px-6 py-10 text-center",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="relative flex size-14 items-center justify-center rounded-full bg-primary/20 text-accent-foreground motion-safe:animate-[float-soft_5s_ease-in-out_infinite]"
      >
        <span className="absolute -inset-2 rounded-full bg-primary/10 blur-md motion-safe:animate-pulse" />
        <svg viewBox="0 0 24 24" className="relative size-7" fill="none">
          <path
            d="M5 4c0 8 4 14 13 14 1.5 0 2-.5 2-1.5C20 9 14 4 6.5 4 5.5 4 5 4 5 4Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? (
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
