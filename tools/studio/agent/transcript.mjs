// Zen Agent's conversation as the panel shows it, built from the events the dev server sends the tab (zen-agent:event).
// The same reducer runs on the server (GET /agent/session hands a reopened or reloaded tab the whole transcript) and in
// the tab (src/platform/studio/agent/agentStore.ts), so both always agree. Pure.
//
// Events, each with the `turn` it belongs to:
//   { type: "user", turn, text, thumbs? }                                the person's prompt (thumbs: small pictures attached)
//   { type: "text", turn, delta }                                        the agent's reply, streaming
//   { type: "tool", turn, call, name, summary, state, detail? }          a tool call: running → ok | error
//   { type: "check", turn, state, count, findings? }                     the usage harness: running → ok | fixing | left
//   { type: "ask", turn, call, question, options, state, answer? }       the agent asks: waiting → answered | cancelled
//   { type: "end", turn, state, error?, usage?, cost?, ms?, model? }     done | stopped | error
//
// An agent item keeps its parts in the order they happened (V1, plan §9: text, steps, the harness and questions
// interleave), and `text`, all its text, for a quick read.

/** The agent item of `turn`, created when its first event arrives. */
const blank = (turn) => ({ kind: "agent", turn, parts: [], text: "", state: "working", error: null, usage: null, cost: null, ms: null, model: null });

/** `items` with `event` applied (a new array; the items it touches are new objects). */
export function reduceTranscript(items, event) {
  if (!event || typeof event.turn !== "number") return items;
  if (event.type === "user") {
    const thumbs = Array.isArray(event.thumbs) ? event.thumbs.filter((thumb) => typeof thumb === "string") : [];
    return [...items, { kind: "user", turn: event.turn, text: String(event.text ?? ""), thumbs }, blank(event.turn)];
  }
  const index = items.findLastIndex((item) => item.kind === "agent" && item.turn === event.turn);
  const current = index >= 0 ? items[index] : blank(event.turn);
  const next = apply(current, event);
  if (next === current) return items;
  if (index < 0) return [...items, next];
  const copy = items.slice();
  copy[index] = next;
  return copy;
}

/** `parts` with the part `match` finds replaced by `update(part)`, or `fresh` added at the end. */
function upsert(parts, match, update, fresh) {
  const at = parts.findIndex(match);
  if (at < 0) return [...parts, fresh];
  const copy = parts.slice();
  copy[at] = update(parts[at]);
  return copy;
}

function apply(item, event) {
  switch (event.type) {
    case "text": {
      const delta = String(event.delta ?? "");
      if (!delta) return item;
      const last = item.parts.at(-1);
      const parts = last?.kind === "text" ? [...item.parts.slice(0, -1), { ...last, text: last.text + delta }] : [...item.parts, { kind: "text", text: delta }];
      return { ...item, parts, text: item.text + delta };
    }
    case "tool": {
      const step = { kind: "step", call: String(event.call), name: String(event.name ?? ""), summary: String(event.summary ?? ""), state: event.state ?? "running", detail: event.detail ?? null };
      return { ...item, parts: upsert(item.parts, (part) => part.kind === "step" && part.call === step.call, (part) => ({ ...part, ...step, summary: step.summary || part.summary }), step) };
    }
    case "check": {
      const check = { kind: "check", state: event.state, count: event.count ?? 0, findings: Array.isArray(event.findings) ? event.findings.map(String) : [] };
      // A round's "running" and its verdict are one part; a later round (after more steps) is a new one.
      const last = item.parts.at(-1);
      const parts = last?.kind === "check" && last.state === "running" ? [...item.parts.slice(0, -1), check] : [...item.parts, check];
      return { ...item, parts };
    }
    case "ask": {
      const ask = { kind: "ask", call: String(event.call), question: String(event.question ?? ""), options: Array.isArray(event.options) ? event.options.map(String) : [], state: event.state ?? "waiting", answer: event.answer ?? null };
      return { ...item, parts: upsert(item.parts, (part) => part.kind === "ask" && part.call === ask.call, (part) => ({ ...part, ...ask, question: ask.question || part.question, options: ask.options.length ? ask.options : part.options }), ask) };
    }
    case "end":
      return { ...item, state: event.state ?? "done", error: event.error ?? null, usage: event.usage ?? null, cost: typeof event.cost === "number" ? event.cost : null, ms: typeof event.ms === "number" ? event.ms : null, model: event.model ?? null };
    default:
      return item;
  }
}

/** The transcript of a list of events. */
export const transcriptOf = (events) => events.reduce(reduceTranscript, []);

/** The steps of an agent item, in order. */
export const stepsOf = (item) => (item?.parts ?? []).filter((part) => part.kind === "step");

/** The latest harness verdict of an agent item, or null. */
export const checkOf = (item) => (item?.parts ?? []).filter((part) => part.kind === "check").at(-1) ?? null;

/** The question an agent item is waiting on, or null. */
export const waitingAskOf = (item) => (item?.parts ?? []).find((part) => part.kind === "ask" && part.state === "waiting") ?? null;
