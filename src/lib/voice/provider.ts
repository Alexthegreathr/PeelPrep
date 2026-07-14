/**
 * VoiceProvider (PHASE_14_AVATAR_PRACTICE.md §3a) — the interviewer's spoken
 * voice, same mock-first pattern as the AI / transcription abstractions. The
 * default `mock` uses the browser's built-in `speechSynthesis` (free, on-device,
 * offline). A real neural-TTS vendor slots in behind this interface, key-gated
 * and documented — never enabled silently. Client-only (needs `window`).
 */
export type SpeakOptions = {
  onStart?: () => void;
  onBoundary?: () => void;
  onEnd?: () => void;
  rate?: number;
  pitch?: number;
};

export type SpeakHandle = { cancel: () => void };

export interface VoiceProvider {
  readonly name: string;
  readonly supported: boolean;
  speak(text: string, opts?: SpeakOptions): SpeakHandle;
  cancel(): void;
}

/** Rough spoken duration (ms) for a text at ~165 wpm — the fallback timer. */
export function estimateSpeechMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1200, Math.round((words / 165) * 60_000));
}

class BrowserSpeechProvider implements VoiceProvider {
  readonly name = "browser-speech-synthesis";

  get supported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  speak(text: string, opts: SpeakOptions = {}): SpeakHandle {
    if (!this.supported || !text.trim()) {
      // No voice available: fire lifecycle so the avatar still animates.
      opts.onStart?.();
      const t = setTimeout(() => opts.onEnd?.(), estimateSpeechMs(text));
      return { cancel: () => clearTimeout(t) };
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate ?? 1;
    u.pitch = opts.pitch ?? 1;

    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      opts.onEnd?.();
    };
    u.onstart = () => opts.onStart?.();
    u.onboundary = () => opts.onBoundary?.();
    u.onend = end;
    u.onerror = end;
    // Safety net: some engines never fire onend for short/queued utterances.
    const fallback = setTimeout(end, estimateSpeechMs(text) + 1500);

    window.speechSynthesis.speak(u);
    return {
      cancel: () => {
        clearTimeout(fallback);
        window.speechSynthesis.cancel();
        end();
      },
    };
  }

  cancel(): void {
    if (this.supported) window.speechSynthesis.cancel();
  }
}

let provider: VoiceProvider | undefined;

/**
 * The active voice provider. Beta ships the browser-speech mock; a real vendor
 * would be selected here behind an env flag + key, returning audio for
 * amplitude-driven lip-sync (the avatar already accepts an amplitude source).
 */
export function getVoiceProvider(): VoiceProvider {
  provider ??= new BrowserSpeechProvider();
  return provider;
}
