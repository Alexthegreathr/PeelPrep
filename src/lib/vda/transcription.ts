import "server-only";

/**
 * TranscriptionProvider abstraction (AI_ARCHITECTURE.md §10) — same shape as the
 * AI/research abstractions. Beta ships a deterministic `mock`; a real STT
 * provider (open decision — not Anthropic) slots in behind this interface with
 * an API key and one implementation, exactly like the AI provider. The temp
 * audio it receives is deleted after processing (retention sweeper).
 */
export type TranscriptionInput = {
  /** Storage path of the temp audio, or a caption the user provided. */
  audioStoragePath?: string | null;
  hintText?: string | null;
};

export type TranscriptionResult = {
  text: string;
  provider: string;
  language: string;
};

export interface TranscriptionProvider {
  readonly name: "mock" | string;
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}

class MockTranscriptionProvider implements TranscriptionProvider {
  readonly name = "mock" as const;
  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    // Deterministic, clearly-illustrative transcript. A real provider would
    // transcribe the uploaded audio; nothing here contacts an external service.
    const text =
      input.hintText?.trim() ||
      "So, um, I led a project to improve the reliability of our tracking pipeline. We added retries and better alerting, and, you know, incidents dropped by about half over the next quarter.";
    return { text, provider: "mock", language: "en" };
  }
}

export function getTranscriptionProvider(): TranscriptionProvider {
  // Real STT selection would branch here on TRANSCRIPTION_PROVIDER; mock only.
  return new MockTranscriptionProvider();
}

/** True when the active transcription provider is the illustrative mock. */
export function isMockTranscription(): boolean {
  return getTranscriptionProvider().name === "mock";
}
