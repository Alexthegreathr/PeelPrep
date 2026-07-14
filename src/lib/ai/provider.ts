import type { z } from "zod";

import type { AiTask } from "@/lib/ai/tasks";

/**
 * Provider-independent AI interface (AI_ARCHITECTURE.md §2). Nothing above this
 * layer talks to a model SDK directly; nothing below it knows about HTTP/React.
 */
export interface StructuredRequest<T> {
  task: AiTask;
  /** Versioned system prompt (from the prompt registry). */
  system: string;
  /** Built user content: tagged source blocks. Treated as data, not commands. */
  input: string;
  schema: z.ZodType<T>;
  maxOutputTokens: number;
  model: string;
}

export type AiUsage = { inputTokens: number; outputTokens: number };

export type AiErrorCode =
  | "provider_unavailable"
  | "timeout"
  | "refused"
  | "validation_failed"
  | "context_too_large"
  | "unknown";

export class AiError extends Error {
  code: AiErrorCode;
  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.name = "AiError";
    this.code = code;
  }
}

export type StructuredResult<T> = {
  ok: true;
  data: T;
  usage: AiUsage;
  model: string;
  durationMs: number;
};

export interface AiProvider {
  readonly name: "anthropic" | "mock";
  /** Produce schema-valid structured output, or throw AiError. */
  generateStructured<T>(
    req: StructuredRequest<T>,
  ): Promise<StructuredResult<T>>;
}
