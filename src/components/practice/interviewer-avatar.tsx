"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Generic, clearly-synthetic interviewer avatar (PHASE_14 §3a). A stylized SVG
 * face whose mouth animates while the interviewer is speaking. It is NEVER a
 * likeness of the real interviewer — no photo, no real voice, no identity. When
 * a real TTS vendor is wired in, `amplitude` can drive true lip-sync; the mock
 * oscillates the mouth while `speaking` is true.
 */
export function InterviewerAvatar({
  speaking,
  amplitude,
  label = "AI interviewer",
}: {
  speaking: boolean;
  /** Optional 0–1 mouth openness (real TTS); mock ignores and self-animates. */
  amplitude?: number;
  label?: string;
}) {
  const [open, setOpen] = useState(0);
  const raf = useRef<number | null>(null);

  // Only the mock (no amplitude) needs an animation loop; the real-TTS path
  // derives openness straight from `amplitude` in render.
  useEffect(() => {
    if (!speaking || typeof amplitude === "number") return;
    let phase = 0;
    const step = () => {
      phase += 0.28;
      const base = (Math.sin(phase) + 1) / 2;
      const flutter = (Math.sin(phase * 2.3) + 1) / 2;
      setOpen(0.2 + 0.6 * base * (0.5 + 0.5 * flutter));
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [speaking, amplitude]);

  const openness = !speaking
    ? 0
    : typeof amplitude === "number"
      ? Math.max(0, Math.min(1, amplitude))
      : open;
  const mouthH = 2 + openness * 12;

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative"
        role="img"
        aria-label={`${label} (synthetic avatar)`}
      >
        <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
          <circle cx="28" cy="28" r="27" className="fill-secondary" />
          <circle cx="28" cy="24" r="15" className="fill-primary/20" />
          {/* eyes */}
          <circle cx="22" cy="22" r="2.2" className="fill-foreground/70" />
          <circle cx="34" cy="22" r="2.2" className="fill-foreground/70" />
          {/* mouth (animated height) */}
          <rect
            x="21"
            y={30 - mouthH / 2}
            width="14"
            height={mouthH}
            rx={Math.min(3, mouthH / 2)}
            className="fill-foreground/60"
          />
        </svg>
        {speaking ? (
          <span className="absolute -right-0.5 -top-0.5 flex size-3">
            <span className="absolute inline-flex size-3 animate-ping rounded-full bg-emerald-500/70" />
            <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
          </span>
        ) : null}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          Synthetic voice &amp; avatar {speaking ? "· speaking…" : ""}
        </span>
      </div>
    </div>
  );
}
