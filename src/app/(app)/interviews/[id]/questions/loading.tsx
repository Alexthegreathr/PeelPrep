import { Skeleton } from "@/components/ui/skeleton";

export default function QuestionsLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading questions…</span>
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="mb-6 h-9 w-full max-w-md rounded-lg" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
