"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * A horizontal progress bar whose fill grows from 0 to `value/max` on mount via
 * a CSS width transition (respects prefers-reduced-motion). The width flips on
 * the next animation frame so the transition actually runs. Presentational.
 */
export function AnimatedBar({
  value,
  max = 1,
  className,
  fillClassName = "bg-primary",
  delayMs = 0,
}: {
  value: number;
  max?: number;
  className?: string;
  fillClassName?: string;
  delayMs?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const [ready, setReady] = useState(false);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    // Flip via rAF (not synchronously) so the transition from 0 → pct plays.
    raf.current = requestAnimationFrame(() => setReady(true));
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-secondary",
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out",
          fillClassName,
        )}
        style={{
          width: `${ready ? pct : 0}%`,
          transitionDelay: `${delayMs}ms`,
        }}
      />
    </div>
  );
}
