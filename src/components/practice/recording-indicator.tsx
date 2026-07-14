"use client";

import { useEffect, useState } from "react";

/**
 * A clear "you are being recorded" affordance for voice answers: a pulsing red
 * dot, an elapsed timer, and a live microphone-level meter driven by the actual
 * audio stream (so the user can see their voice is being picked up). Purely
 * presentational — it reads the stream but never stores or uploads it.
 */
const BAR_SHAPE = [0.5, 0.8, 1, 0.7, 1, 0.85, 0.55];

export function RecordingIndicator({
  stream,
  label = "Recording your answer",
}: {
  stream: MediaStream | null;
  label?: string;
}) {
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!stream) return;
    const start = performance.now();
    const timer = setInterval(
      () => setElapsed((performance.now() - start) / 1000),
      200,
    );

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    let ctx: AudioContext | null = null;
    let raf = 0;
    if (Ctor) {
      try {
        ctx = new Ctor();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          setLevel(Math.min(1, Math.sqrt(sum / data.length) * 3.2));
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        // No level meter if the audio graph can't be built; dot + timer remain.
      }
    }

    return () => {
      clearInterval(timer);
      if (raf) cancelAnimationFrame(raf);
      if (ctx) void ctx.close().catch(() => {});
    };
  }, [stream]);

  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2"
    >
      <span className="relative flex size-3 shrink-0">
        <span className="absolute inline-flex size-3 animate-ping rounded-full bg-destructive/70" />
        <span className="relative inline-flex size-3 rounded-full bg-destructive" />
      </span>
      <span className="text-sm font-medium text-destructive">{label}</span>
      <span className="font-mono text-sm tabular-nums text-muted-foreground">
        {mins}:{String(secs).padStart(2, "0")}
      </span>
      <span className="flex h-5 items-end gap-0.5" aria-hidden="true">
        {BAR_SHAPE.map((m, i) => (
          <span
            key={i}
            className="w-1 rounded-full bg-destructive transition-[height] duration-75"
            style={{ height: `${Math.max(12, level * m * 100)}%` }}
          />
        ))}
      </span>
    </div>
  );
}
