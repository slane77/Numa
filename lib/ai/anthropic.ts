import Anthropic from "@anthropic-ai/sdk";

/**
 * Server-only Anthropic client. The API key must NEVER be exposed to the browser
 * — it is read from ANTHROPIC_API_KEY which is not prefixed with NEXT_PUBLIC_.
 */
export function getAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }
  return new Anthropic({ apiKey });
}

/** Higher-quality model for meal planning. */
export const MODEL_QUALITY =
  process.env.NUMA_MEAL_PLAN_MODEL ?? "claude-opus-4-8";

/** Faster / cheaper model for quick plans. */
export const MODEL_FAST =
  process.env.NUMA_MEAL_PLAN_MODEL_FAST ?? "claude-sonnet-4-6";
