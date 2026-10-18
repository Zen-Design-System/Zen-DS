// The models Zen Agent can run on (plan docs/research/studio-vibe-agent-2026-10-18.md §4, user 2026-10-18: Opus 5.5 by
// default, Sonnet 5.5 and Haiku 5.5 for small edits) and what a turn costs on each. Prices are the Claude API's first-party
// rates in USD per million tokens (cached 2026-10-06); cache writes are the 5-minute rate (1.25 × input).

export const MODELS = [
  { id: "claude-opus-5-5", label: "Opus 5.5", input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5, fallbacks: true },
  { id: "claude-sonnet-5-5", label: "Sonnet 5.5", input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5, fallbacks: true },
  // Haiku 5.5: prompts up to 100K tokens (beyond, $0.50 / $2.50); its cache rates are the usual 10% / 125%. No server-side
  // refusal fallback.
  { id: "claude-haiku-5-5", label: "Haiku 5.5", input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125, fallbacks: false },
];

export const DEFAULT_MODEL = MODELS[0].id;

export const modelOf = (id) => MODELS.find((model) => model.id === id) ?? null;

/** Token counts of one turn, summed over its requests: { input, output, cacheRead, cacheWrite }. */
export const emptyUsage = () => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });

/** Adds one response's `usage` (the API's field names) to a turn's counts. */
export function addUsage(total, usage) {
  if (!usage) return total;
  total.input += usage.input_tokens ?? 0;
  total.output += usage.output_tokens ?? 0;
  total.cacheRead += usage.cache_read_input_tokens ?? 0;
  total.cacheWrite += usage.cache_creation_input_tokens ?? 0;
  return total;
}

/** What `usage` cost on `modelId`, in USD (null for a model this table does not know). */
export function costOf(usage, modelId) {
  const model = modelOf(modelId);
  if (!model) return null;
  const perToken = (rate) => rate / 1_000_000;
  return usage.input * perToken(model.input) + usage.output * perToken(model.output)
    + usage.cacheRead * perToken(model.cacheRead) + usage.cacheWrite * perToken(model.cacheWrite);
}
