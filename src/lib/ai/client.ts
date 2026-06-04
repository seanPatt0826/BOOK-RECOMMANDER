import Anthropic from "@anthropic-ai/sdk";
import { requireEnv } from "@/lib/env";

/**
 * The Claude model used for recommendations and chat. This is the single
 * cost/quality lever — switch to "claude-haiku-4-5" for ~5x lower cost.
 */
export const AI_MODEL = "claude-opus-4-8";

/** Construct the Anthropic client. Throws (lazily) if the key is missing. */
export function createAnthropic(): Anthropic {
  return new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
}
