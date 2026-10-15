// The `model` function of the compose loop (tools/ai-ui/compose.mjs) on the Claude API, through the official SDK.
// Server-side only: the key never reaches a browser. The SDK resolves credentials itself (ANTHROPIC_API_KEY, an
// `ant auth login` profile…); pass `client` to inject one. `@anthropic-ai/sdk` is loaded on first use, so the package
// does not need it unless this adapter is called (install it in the app: npm i @anthropic-ai/sdk).
//
//   import { anthropicModel } from "@zen-ds/react/ai-ui/adapters/anthropic";
//   const model = anthropicModel();                       // claude-opus-5-5, effort medium, 16k output tokens
//   const answer = await composeUi({ prompt, catalog, model, data });

const DEFAULT_MODEL = "claude-opus-5-5";

/**
 * @param {{ model?: string, effort?: "low" | "medium" | "high" | "xhigh" | "max", maxTokens?: number, client?: object, fallbacks?: boolean, workspaceId?: string | null, onUsage?: (usage: object, response: object) => void }} [options]
 *   `effort`: thinking depth and token spend (the model's default is medium). `fallbacks`: on a safety refusal the
 *   API re-runs the request on a fallback model (default true; Claude API only). `workspaceId`: the
 *   `anthropic-workspace-id` header a personal or service-account key that is not scoped to one workspace needs on
 *   every request (default: ANTHROPIC_WORKSPACE_ID; a key created for a single workspace needs none). `onUsage`: every
 *   response's `usage` (tokens, cache reads) for the metrics.
 * @returns {(call: { system: string, messages: { role: "user" | "assistant", content: string }[] }) => Promise<string>}
 */
export function anthropicModel({ model = DEFAULT_MODEL, effort = "medium", maxTokens = 16000, client, fallbacks = true, workspaceId = envWorkspaceId(), onUsage } = {}) {
  let clientPromise = client ? Promise.resolve(client) : null;
  const getClient = () => (clientPromise ??= import("@anthropic-ai/sdk").then((mod) => new (mod.default ?? mod.Anthropic)()));
  const options = workspaceId ? { headers: { "anthropic-workspace-id": workspaceId } } : undefined;
  return async ({ system, messages }) => {
    const sdk = await getClient();
    const request = {
      model,
      max_tokens: maxTokens,
      // The system prompt (rules + catalog tiers) is the same across the retry loop and across requests with the same
      // picked components: cache it; the conversation varies after it.
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: messages.map(({ role, content }) => ({ role, content })),
      output_config: { effort },
      ...(fallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
    };
    const response = fallbacks ? await sdk.beta.messages.create(request, options) : await sdk.messages.create(request, options);
    onUsage?.(response.usage, response);
    if (response.stop_reason === "refusal") {
      // A policy decline on the whole chain: the loop sees a text-only answer, never a broken spec.
      return JSON.stringify({ text: response.stop_details?.explanation ? `I can't help with that: ${response.stop_details.explanation}` : "I can't help with that request." });
    }
    return response.content.filter((block) => block.type === "text").map((block) => block.text).join("\n");
  };
}

/** ANTHROPIC_WORKSPACE_ID when the process has one (Node); null in a browser or without it. */
export function envWorkspaceId() {
  return (typeof process !== "undefined" && process.env?.ANTHROPIC_WORKSPACE_ID) || null;
}

export { DEFAULT_MODEL };
