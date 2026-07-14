"use client";

import { useEffect } from "react";
import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Details stay server-side; users see a generic message + correlation id.
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-secondary/30 px-6 py-16 text-center">
      <CircleAlert className="size-8 text-destructive" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          We hit an unexpected error loading this page. Please try again.
        </p>
        {error.digest ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
