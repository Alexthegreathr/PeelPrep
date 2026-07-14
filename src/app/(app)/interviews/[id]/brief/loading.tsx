import { Skeleton } from "@/components/ui/skeleton";

export default function BriefLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading brief…</span>
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="mb-6 h-9 w-full max-w-md rounded-lg" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-5">
            <Skeleton className="mb-3 h-5 w-40" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
