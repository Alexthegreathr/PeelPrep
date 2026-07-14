"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Animated readiness ring: an SVG progress circle that fills to `score` while
 * the number counts up on mount. Colour bands the score (low → warning, mid →
 * accent, high → success) so the state reads at a glance. Respects
 * prefers-reduced-motion. Presentational only.
 */
export function ScoreRing({
  score,
  size = 132,
  stroke = 10,
  label = "out of 100",
}: {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const [shown, setShown] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // duration 0 → the first frame lands on the final value (no animation).
    const duration = reduce ? 0 : 900;
    let start: number | null = null;
    const step = (t: number) => {
      if (start == null) start = t;
      const p = duration > 0 ? Math.min(1, (t - start) / duration) : 1;
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setShown(Math.round(eased * clamped));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [clamped]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - shown / 100);
  const gradId = useId();
  // Gradient stops per score band (light → deep), for a richer ring.
  const [from, to] =
    clamped >= 70
      ? ["#7bc088", "#4d7b55"]
      : clamped >= 40
        ? ["#ffe27a", "#f2b800"]
        : ["#c58a4e", "#7b4b20"];

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Readiness ${clamped} ${label}`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={`url(#${gradId})`}
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums leading-none">
          {shown}
        </span>
        <span className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}
