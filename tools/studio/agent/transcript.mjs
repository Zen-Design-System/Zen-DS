// Zen Agent's conversation as the panel shows it, built from the events the dev server sends the tab (zen-agent:event).
// The same reducer runs on the server (GET /agent/session hands a reopened or reloaded tab the whole transcript) and in
// the tab (src/platform/studio/agent/agentStore.ts), so both always agree. Pure.
//
// Events, each with the `turn` it belongs to:
//   { type: "user", turn, text }                                        the person's prompt
//   { type: "text", turn, delta }                                       the agent's reply, streaming
//   { type: "tool", turn, call, name, summary, state, detail? }         a tool call: running → ok | error
//   { type: "check", turn, state, count, findings? }                    the usage harness: running → ok | fixing | left
//   { type: "end", turn, state, error?, usage?, cost?, ms?, model? }    done | stopped | error

/** The agent item of `turn`, created when its first event arrives. */
const blank = (turn) => ({ kind: "agent", turn, text: "", steps: [], check: null, state: "working", error: null, usage: null, cost: null, ms: null, model: null });

/** `items` with `event` applied (a new array; the items it touches are new objects). */
export function reduceTranscript(items, event) {
  if (!event || typeof event.turn !== "number") return items;
  if (event.type === "user") return [...items, { kind: "user", turn: event.turn, text: String(event.text ?? "") }, blank(event.turn)];
  const index = items.findLastIndex((item) => item.kind === "agent" && item.turn === event.turn);
  const current = index >= 0 ? items[index] : blank(event.turn);
  const next = apply(current, event);
  if (next === current) return items;
  if (index < 0) return [...items, next];
  const copy = items.slice();
  copy[index] = next;
  return copy;
}

function apply(item, event) {
  switch (event.type) {
    case "text":
      return { ...item, text: item.text + String(event.delta ?? "") };
    case "tool": {
      const step = { call: String(event.call), name: String(event.name ?? ""), summary: String(event.summary ?? ""), state: event.state ?? "running", detail: event.detail ?? null };
      const at = item.steps.findIndex((existing) => existing.call === step.call);
      const steps = item.steps.slice();
      if (at >= 0) steps[at] = { ...steps[at], ...step, summary: step.summary || steps[at].summary };
      else steps.push(step);
      return { ...item, steps };
    }
    case "check":
      return { ...item, check: { state: event.state, count: event.count ?? 0, findings: Array.isArray(event.findings) ? event.findings.map(String) : [] } };
    case "end":
      return { ...item, state: event.state ?? "done", error: event.error ?? null, usage: event.usage ?? null, cost: typeof event.cost === "number" ? event.cost : null, ms: typeof event.ms === "number" ? event.ms : null, model: event.model ?? null };
    default:
      return item;
  }
}

/** The transcript of a list of events. */
export const transcriptOf = (events) => events.reduce(reduceTranscript, []);
