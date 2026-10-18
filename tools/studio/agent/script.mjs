// A scripted model for Zen Agent's checks (agent.selftest.mjs, a dev server started with ZEN_AGENT_SCRIPT=<file.json>):
// a `fetch` for the Anthropic SDK that answers POST /v1/messages with the streamed (SSE) replies a script lists, so the
// real Tool Runner, the relay and a real Studio tab run end to end without the network or a key.
//
// The script: { "turns": [ [reply, reply, …], … ] }, one list per prompt of the person, one reply per request of that
// turn (the first answers the prompt, the next ones answer the tool results or the harness's findings):
//   reply = { "text"?: string, "tools"?: [{ "name": string, "input": object }], "delay"?: ms between streamed parts }
// A reply with tools stops for tool use; one without stops at the end of the turn. A request past the script's end gets
// "(The script has no more replies.)". In a tool's input, the strings "$selection" and "$frame" become the id of the
// first selected layer and of the first frame in the prompt's <studio-context> (a script cannot know a page's ids).

const PROMPT = "<studio-context>";

/** Which prompt (0-based) and which request of its turn a request body is. */
export function positionOf(body) {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  let prompt = -1;
  let request = 0;
  for (const message of messages) {
    const first = Array.isArray(message.content) ? message.content[0] : { type: "text", text: message.content };
    if (message.role === "user" && first?.type === "text" && String(first.text ?? "").startsWith(PROMPT)) {
      prompt += 1;
      request = 0;
    } else if (message.role === "assistant") {
      request += 1;
    }
  }
  return { prompt, request };
}

/** The ids "$selection" / "$frame" stand for, from the last prompt's <studio-context>. */
export function idsOf(body) {
  const prompts = (Array.isArray(body?.messages) ? body.messages : []).filter((message) => message.role === "user" && Array.isArray(message.content) && String(message.content[0]?.text ?? "").startsWith(PROMPT));
  const text = String(prompts.at(-1)?.content[0]?.text ?? "").replace(PROMPT, "").replace("</studio-context>", "");
  try {
    const state = JSON.parse(text);
    return { $selection: state.selection?.[0]?.id ?? null, $frame: state.frames?.[0]?.id ?? null };
  } catch {
    return { $selection: null, $frame: null };
  }
}

const withIds = (value, ids) => {
  if (typeof value === "string") return value in ids ? ids[value] ?? value : value;
  if (Array.isArray(value)) return value.map((item) => withIds(item, ids));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, withIds(item, ids)]));
  return value;
};

const event = (type, data) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;

/** The SSE events of one reply. */
export function sseParts(reply, model, id) {
  const parts = [event("message_start", { message: { id, type: "message", role: "assistant", model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1200, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } })];
  let index = 0;
  if (reply.text) {
    parts.push(event("content_block_start", { index, content_block: { type: "text", text: "" } }));
    for (const piece of String(reply.text).match(/[\s\S]{1,24}/g) ?? []) parts.push(event("content_block_delta", { index, delta: { type: "text_delta", text: piece } }));
    parts.push(event("content_block_stop", { index }));
    index += 1;
  }
  for (const [n, tool] of (reply.tools ?? []).entries()) {
    parts.push(event("content_block_start", { index, content_block: { type: "tool_use", id: `toolu_${id}_${n}`, name: tool.name, input: {} } }));
    parts.push(event("content_block_delta", { index, delta: { type: "input_json_delta", partial_json: JSON.stringify(tool.input ?? {}) } }));
    parts.push(event("content_block_stop", { index }));
    index += 1;
  }
  parts.push(event("message_delta", { delta: { stop_reason: reply.tools?.length ? "tool_use" : "end_turn", stop_sequence: null }, usage: { output_tokens: 80 } }));
  parts.push(event("message_stop", {}));
  return parts;
}

/** A fetch that answers from `script` ({ turns }, or a function that reads it for each request); `requests` collects every request body it saw. */
export function scriptedFetch(script, { requests = [] } = {}) {
  let count = 0;
  return async (url, init = {}) => {
    const body = JSON.parse(String(init.body ?? "{}"));
    requests.push(body);
    if (!String(url).includes("/v1/messages")) return new Response(JSON.stringify({ type: "error", error: { type: "not_found_error", message: "The script answers /v1/messages only" } }), { status: 404, headers: { "content-type": "application/json" } });
    const { prompt, request } = positionOf(body);
    const current = typeof script === "function" ? script() : script;
    const scripted = current?.turns?.[prompt]?.[request] ?? { text: "(The script has no more replies.)" };
    const ids = idsOf(body);
    const reply = { ...scripted, tools: scripted.tools?.map((tool) => ({ ...tool, input: withIds(tool.input, ids) })) };
    const parts = sseParts(reply, body.model ?? "script", `msg_${++count}`);
    const delay = Number(reply.delay ?? 0);
    const signal = init.signal;
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for (const part of parts) {
          if (signal?.aborted) { controller.error(signal.reason ?? new Error("aborted")); return; }
          if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
          controller.enqueue(encoder.encode(part));
        }
        controller.close();
      },
    });
    return new Response(stream, { status: 200, headers: { "content-type": "text/event-stream", "request-id": `req_script_${count}` } });
  };
}
