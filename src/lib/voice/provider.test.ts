import { describe, it, expect } from "vitest";

import { estimateSpeechMs, getVoiceProvider } from "@/lib/voice/provider";

/** Voice provider (PHASE_14 §3a): the mock's duration fallback + interface. */
describe("estimateSpeechMs", () => {
  it("scales with word count and has a floor", () => {
    expect(estimateSpeechMs("")).toBe(1200);
    const short = estimateSpeechMs("one two three");
    const long = estimateSpeechMs(
      Array.from({ length: 165 }, () => "w").join(" "),
    );
    expect(long).toBeGreaterThan(short);
    expect(long).toBeCloseTo(60_000, -3); // ~1 minute for 165 words at 165 wpm
  });
});

describe("getVoiceProvider", () => {
  it("returns a stable provider exposing the interface", () => {
    const a = getVoiceProvider();
    const b = getVoiceProvider();
    expect(a).toBe(b);
    expect(typeof a.speak).toBe("function");
    expect(typeof a.cancel).toBe("function");
    expect(typeof a.supported).toBe("boolean");
  });
});
