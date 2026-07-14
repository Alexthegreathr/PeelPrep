import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading history…</span>
      <div className="mb-8 flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
