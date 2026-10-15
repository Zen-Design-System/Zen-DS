import type { ModelFn } from "../compose.mjs";

export const DEFAULT_MODEL: "claude-opus-5-5";
export type AnthropicModelOptions = {
  model?: string;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens?: number;
  /** An Anthropic SDK client to use instead of `new Anthropic()`. */
  client?: unknown;
  /** Server-side refusal fallbacks (Claude API only). Default true. */
  fallbacks?: boolean;
  onUsage?: (usage: unknown, response: unknown) => void;
};
export function anthropicModel(options?: AnthropicModelOptions): ModelFn;
