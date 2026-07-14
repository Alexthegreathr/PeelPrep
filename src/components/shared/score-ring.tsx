"use client";

import { useEffect, useRef, useState } from "react";

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
  const color =
    clamped >= 70
      ? "var(--color-success, #4d7b55)"
      : clamped >= 40
        ? "var(--color-primary, #ffd21f)"
        : "var(--color-warning, #7b4b20)";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Readiness ${clamped} ${label}`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
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
          stroke={color}
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke 300ms ease" }}
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
