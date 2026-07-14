import { Skeleton } from "@/components/ui/skeleton";

export default function ReadinessLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading readiness…</span>
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-48 w-full rounded-xl" />
    </div>
  );
}
