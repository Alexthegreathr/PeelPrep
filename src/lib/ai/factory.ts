import "server-only";

import type { AiProvider } from "@/lib/ai/provider";
import { MockAiProvider } from "@/lib/ai/mock-provider";
import { AnthropicAiProvider } from "@/lib/ai/anthropic-provider";

/**
 * Provider selection (AI_ARCHITECTURE.md §2). `mock` is the dev/test/demo
 * default; `anthropic` for production. The Anthropic client (and API key) are
 * only touched in its constructor, so importing this in mock mode is side-effect
 * free. Tests and demo-mode deployments always use mock.
 */
/** Resolve the configured provider name; anything but "anthropic" → mock. */
function resolvedProviderName(): "anthropic" | "mock" {
  return (process.env.AI_PROVIDER || "").trim() === "anthropic"
    ? "anthropic"
    : "mock";
}

export function getAiProvider(): AiProvider {
  return resolvedProviderName() === "anthropic"
    ? new AnthropicAiProvider()
    : new MockAiProvider();
}

export function isMockAiMode(): boolean {
  return resolvedProviderName() === "mock";
}
