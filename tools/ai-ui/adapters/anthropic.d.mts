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
  /** The `anthropic-workspace-id` header a personal or service-account key not scoped to one workspace needs on every
   *  request (`wrkspc_…`, Console → Settings → Workspaces). Default: ANTHROPIC_WORKSPACE_ID. A single-workspace key needs none. */
  workspaceId?: string | null;
  onUsage?: (usage: unknown, response: unknown) => void;
};
export function anthropicModel(options?: AnthropicModelOptions): ModelFn;
/** ANTHROPIC_WORKSPACE_ID when the process has one; null otherwise. */
export function envWorkspaceId(): string | null;
