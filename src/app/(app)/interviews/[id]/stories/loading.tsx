import { Skeleton } from "@/components/ui/skeleton";

export default function StoriesLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading stories…</span>
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
