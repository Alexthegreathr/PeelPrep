import { Skeleton } from "@/components/ui/skeleton";

export default function BillingLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading billing…</span>
      <div className="mb-8 flex flex-col gap-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-40 w-full rounded-xl" />
    </div>
  );
}
