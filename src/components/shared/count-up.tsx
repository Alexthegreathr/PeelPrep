"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a number up from 0 to `value` on mount (easeOutCubic). Respects
 * prefers-reduced-motion. Presentational; keeps `tabular-nums` so width is
 * stable while it animates.
 */
export function CountUp({
  value,
  durationMs = 800,
  className,
  suffix = "",
}: {
  value: number;
  durationMs?: number;
  className?: string;
  suffix?: string;
}) {
  const target = Math.round(value);
  const [shown, setShown] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 0 : durationMs;
    let start: number | null = null;
    const step = (t: number) => {
      if (start == null) start = t;
      const p = duration > 0 ? Math.min(1, (t - start) / duration) : 1;
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(eased * target));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [target, durationMs]);

  return (
    <span className={className}>
      {shown}
      {suffix}
    </span>
  );
}
