import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import * as z from "zod";

import {
  AiError,
  type AiProvider,
  type StructuredRequest,
  type StructuredResult,
} from "@/lib/ai/provider";

/**
 * Production provider (AI_ARCHITECTURE.md §2). Structured output is obtained by
 * forcing a single tool call whose input_schema is the JSON Schema of the Zod
 * schema; the response is parsed again with Zod as the final gate. No streaming
 * (each call is one small section/turn); no tool execution, no reasoning capture.
 *
 * Not exercised by the test suite (mock is the test/demo default); requires a
 * real ANTHROPIC_API_KEY and is verified manually behind AI_PROVIDER=anthropic.
 */
export class AnthropicAiProvider implements AiProvider {
  readonly name = "anthropic" as const;
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new AiError(
        "provider_unavailable",
        "ANTHROPIC_API_KEY is not configured",
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  async generateStructured<T>(
    req: StructuredRequest<T>,
  ): Promise<StructuredResult<T>> {
    const start = performance.now();
    const toolName = `emit_${req.task}`;
    const jsonSchema = z.toJSONSchema(req.schema, {
      target: "draft-7",
    }) as Anthropic.Tool.InputSchema;

    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create({
        model: req.model,
        max_tokens: req.maxOutputTokens,
        system: req.system,
        tools: [
          {
            name: toolName,
            description: "Return ONLY the structured result for this task.",
            input_schema: jsonSchema,
          },
        ],
        tool_choice: { type: "tool", name: toolName },
        messages: [{ role: "user", content: req.input }],
      });
    } catch (error) {
      throw mapAnthropicError(error);
    }

    if (response.stop_reason === "refusal") {
      throw new AiError(
        "refused",
        "The model declined to produce this content.",
      );
    }

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) {
      throw new AiError("refused", "No structured output was returned.");
    }

    const parsed = req.schema.safeParse(toolUse.input);
    if (!parsed.success) {
      throw new AiError(
        "validation_failed",
        "Model output did not match the schema.",
      );
    }

    return {
      ok: true,
      data: parsed.data,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      model: response.model,
      durationMs: Math.round(performance.now() - start),
    };
  }
}

function mapAnthropicError(error: unknown): AiError {
  if (error instanceof Anthropic.APIError) {
    const status = error.status ?? 0;
    if (status === 429 || status >= 500) {
      return new AiError("provider_unavailable", "The AI provider is busy.");
    }
    if (error instanceof Anthropic.APIConnectionTimeoutError) {
      return new AiError("timeout", "The AI request timed out.");
    }
  }
  return new AiError("unknown", "The AI request failed.");
}
