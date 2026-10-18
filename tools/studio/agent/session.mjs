// Zen Agent's conversations (plan docs/research/studio-vibe-agent-2026-10-18.md §4, V0 2026-10-18): one per Studio tab,
// kept in the dev server's memory. A turn is the Anthropic SDK's Tool Runner over the Studio MCP's canvas tools — run in
// the person's tab through the relay (mcp/relay.mjs), exactly as Claude Code's calls are, so each change is one ⌘Z step
// and the AI chip's Stop refuses them — plus the zen-ds knowledge tools and check_page. When a turn changed the page, the
// Zen usage harness runs on it and the findings the turn caused go back to the model to fix (harness.mjs).
//
// Events go to the tab over the HMR socket (zen-agent:event); the server keeps the transcript they make
// (transcript.mjs), so a reloaded tab gets it back from GET /agent/session.
import Anthropic from "@anthropic-ai/sdk";
import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import { ToolError } from "@anthropic-ai/sdk/lib/tools/ToolError.mjs";
import { BATCH_TOOLS, TOOLS } from "../mcp/tools.mjs";
import { codeOf, designFindings, formatFindings, newFindings, pageFindings } from "./harness.mjs";
import { addUsage, costOf, DEFAULT_MODEL, emptyUsage, modelOf } from "./models.mjs";
import { SYSTEM_PROMPT } from "./prompt.mjs";
import { reduceTranscript } from "./transcript.mjs";

/** The name the tab's AI chip shows for these calls (AiChip.tsx CLIENTS). */
export const AGENT_CLIENT = "zen-agent";

const WRITE_TOOLS = new Set([...BATCH_TOOLS, "batch", "create_page", "add_frame"]);
const MAX_TOKENS = 32_000;
const MAX_ITERATIONS = 40;
/** Harness rounds a turn may spend fixing what it caused before it hands the rest to the person. */
const FIX_ROUNDS = 2;
/** Opus 5.5's own default; set explicitly (V1's eval tunes it per model). */
const EFFORT = "medium";
/** As the MCP endpoint (mcp/server.mjs): about 10k tokens of text, 3 MB of PNG per answer. */
const MAX_TEXT = 40_000;
const MAX_IMAGE = 4_000_000;
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

const SUMMARY = {
  get_studio_state: "Reading the canvas",
  list_pages: "Listing pages",
  get_tree: "Reading layers",
  get_node: "Reading a layer",
  get_code: "Reading the code",
  get_screenshot: "Looking at the frame",
  update: "Changing a layer",
  insert: "Adding a layer",
  replace: "Replacing a layer",
  move: "Moving a layer",
  duplicate: "Duplicating a layer",
  delete: "Deleting a layer",
  wrap: "Adding auto layout",
  unwrap: "Removing auto layout",
  batch: (args) => `Making ${Array.isArray(args?.ops) ? args.ops.length : "several"} changes`,
  create_page: (args) => `Making the page ${args?.title ?? ""}`.trim(),
  add_frame: "Adding a frame",
  select: "Selecting a layer",
  focus: "Showing a layer",
  open_page: "Opening a page",
  list_components: "Looking up components",
  get_component: (args) => `Reading the ${args?.name ?? "component"} guideline`,
  search_icons: (args) => `Finding icons: ${args?.query ?? ""}`.trim(),
  get_tokens: "Reading tokens",
  check_page: "Checking the Zen rules",
};
const summaryOf = (name, args) => {
  const entry = SUMMARY[name];
  return typeof entry === "function" ? entry(args) : entry ?? name;
};

/** A tool answer in one short line for the panel's step tooltip (an outline's first line, a JSON answer's start). */
const firstLine = (text, max = 160) => {
  const value = String(text ?? "").trim();
  const line = value.startsWith("{") || value.startsWith("[") ? value.replace(/\s+/g, " ") : value.split("\n").find((part) => part.trim()) ?? "";
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

/** The tab's answer (MCP content: text and PNG/JPEG) as tool-result blocks, within the MCP endpoint's limits. */
function blocksOf(content) {
  const blocks = [];
  for (const item of Array.isArray(content) ? content : []) {
    if (item?.type === "text" && typeof item.text === "string") {
      blocks.push({ type: "text", text: item.text.length > MAX_TEXT ? `${item.text.slice(0, MAX_TEXT)}\n… (cut at ${MAX_TEXT} characters: ask for a smaller part, e.g. get_tree with an id or a lower depth)` : item.text });
    } else if (item?.type === "image" && typeof item.data === "string" && /^image\/(png|jpeg)$/.test(item.mimeType ?? "")) {
      blocks.push(item.data.length > MAX_IMAGE ? { type: "text", text: "The picture was too large to send." } : { type: "image", source: { type: "base64", media_type: item.mimeType, data: item.data } });
    }
  }
  return blocks.length ? blocks : [{ type: "text", text: "(no answer)" }];
}

const textOf = (content) => (Array.isArray(content) ? content : []).filter((item) => item?.type === "text").map((item) => item.text).join("\n");

/** The <studio-context> block of a prompt, from the tab's get_studio_state answer. */
function contextBlock(answer, { useSelection = true } = {}) {
  let state = answer?.ok ? textOf(answer.content) : null;
  if (state && !useSelection) {
    try {
      state = JSON.stringify({ ...JSON.parse(state), selection: [], note: "The person took the selection out of this message." }, null, 2);
    } catch {
      // Not JSON: send it as it is.
    }
  }
  return `<studio-context>\n${state ?? `The canvas could not be read${answer?.error ? `: ${answer.error}` : ""}.`}\n</studio-context>`;
}

const harnessMessage = (findings) => [
  "<zen-harness>",
  "The Zen usage harness found these on the page after your changes (they were not there before your turn):",
  formatFindings(findings),
  "Fix them on the layers you changed, then finish with a short reply. If one cannot be fixed in the Studio, say why.",
  "</zen-harness>",
].join("\n");

/** An assistant turn that ends in tool calls nobody answered (Stop, a cut-off reply) gets error results, so the next request is valid. */
function closeOpenCalls(messages, reason) {
  const last = messages.at(-1);
  if (last?.role !== "assistant" || !Array.isArray(last.content)) return;
  const calls = last.content.filter((block) => block?.type === "tool_use");
  if (!calls.length) return;
  messages.push({ role: "user", content: calls.map((call) => ({ type: "tool_result", tool_use_id: call.id, is_error: true, content: reason })) });
}

const errorText = (error) => {
  if (error instanceof Anthropic.AuthenticationError) return "The API key was refused: check ANTHROPIC_API_KEY (or `ant auth login`), then restart npm run dev.";
  if (error instanceof Anthropic.RateLimitError) return "Rate limited by the Claude API: try again in a moment.";
  if (error instanceof Anthropic.APIError && typeof error.status === "number") return `The Claude API answered ${error.status}: ${error.message}`;
  return error instanceof Error ? error.message : String(error);
};

/**
 * `relay`: mcp/relay.mjs; `knowledge`: knowledge.mjs (or a stand-in with tools() / call()); `client()`: the Anthropic
 * client (a promise is fine); `log(line)`: one line per turn.
 */
export function createAgent({ relay, knowledge, client, log = () => {}, now = () => Date.now() }) {
  /** tab → { tab, messages, items, turn, model, running: { controller, turn } | null } */
  const sessions = new Map();

  const sessionOf = (tab) => {
    let session = sessions.get(tab);
    if (!session) {
      session = { tab, messages: [], items: [], turn: 0, model: DEFAULT_MODEL, running: null };
      sessions.set(tab, session);
    }
    return session;
  };

  const emit = (session, event) => {
    session.items = reduceTranscript(session.items, event);
    try {
      relay.target(session.tab)?.client?.send("zen-agent:event", { tab: session.tab, event });
    } catch {
      // The tab is gone: it gets the transcript from GET /agent/session when it comes back.
    }
  };

  const relayCall = (tab, tool, args) => relay.call(tool, args, { tab, client: AGENT_CLIENT });

  /** The usage harness on the open page (wiring included), or null when it is no page made in the Studio (or the tab refused). */
  async function findingsNow(tab) {
    try {
      const code = codeOf(await relayCall(tab, "get_code", {}));
      return code === null ? null : pageFindings(code);
    } catch {
      return null;
    }
  }

  /** The turn's tools: the canvas (through the relay), the zen-ds knowledge and check_page, in a fixed order. */
  async function toolsFor(session, turn, controller, track) {
    let calls = 0;
    const step = (name, args, context) => {
      const call = context?.toolUse?.id ?? `${name}-${turn}-${++calls}`;
      const summary = summaryOf(name, args);
      emit(session, { type: "tool", turn, call, name, summary, state: "running" });
      return {
        ok: (detail) => emit(session, { type: "tool", turn, call, name, summary, state: "ok", detail: detail ?? null }),
        fail: (detail) => emit(session, { type: "tool", turn, call, name, summary, state: "error", detail: firstLine(detail) }),
      };
    };
    const refuseIfStopped = () => {
      if (controller.signal.aborted) throw new ToolError("The person stopped this turn.");
    };

    const canvas = TOOLS.map((tool) => betaTool({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      run: async (args, context) => {
        refuseIfStopped();
        const done = step(tool.name, args, context);
        let answer;
        try {
          answer = await relayCall(session.tab, tool.name, args);
        } catch (error) {
          done.fail(error?.message);
          throw new ToolError(String(error?.message ?? error));
        }
        if (!answer.ok) {
          done.fail(answer.error);
          // The AI chip's Stop: end the turn instead of letting the model try again and again.
          if (answer.code === "stopped") controller.abort();
          throw new ToolError(String(answer.error ?? "The Studio refused the call"));
        }
        if (WRITE_TOOLS.has(tool.name)) track.wrote = true;
        done.ok(firstLine(textOf(answer.content)));
        return blocksOf(answer.content);
      },
    }));

    let known = [];
    try {
      known = await knowledge.tools();
    } catch (error) {
      log(`knowledge unavailable: ${error?.message ?? error}`);
    }
    const docs = known.map((tool) => betaTool({
      name: tool.name,
      description: tool.description ?? tool.name,
      inputSchema: tool.inputSchema ?? { type: "object", properties: {} },
      run: async (args, context) => {
        refuseIfStopped();
        const done = step(tool.name, args, context);
        let result;
        try {
          result = await knowledge.call(tool.name, args);
        } catch (error) {
          done.fail(error?.message);
          throw new ToolError(String(error?.message ?? error));
        }
        const text = textOf(result?.content) || "(no answer)";
        if (result?.isError) {
          done.fail(text);
          throw new ToolError(text);
        }
        done.ok(null);
        return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}\n… (cut at ${MAX_TEXT} characters)` : text;
      },
    }));

    const check = betaTool({
      name: "check_page",
      description: "Runs the Zen usage harness (the Do/Don't rules of every Zen component, as `npx zen-usage` checks apps) on the open page and lists its findings with their rule, line and message. The Studio also runs it after a turn that changed the page.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      run: async (_args, context) => {
        refuseIfStopped();
        const done = step("check_page", {}, context);
        const all = await findingsNow(session.tab);
        if (all === null) {
          done.fail("No page made in the Studio is open");
          throw new ToolError("No page made in the Studio is open in the person's tab: nothing to check.");
        }
        const findings = designFindings(all);
        const wiring = all.length - findings.length;
        done.ok(findings.length ? `${findings.length} finding${findings.length === 1 ? "" : "s"}` : "No findings");
        return [
          findings.length ? formatFindings(findings) : "✓ No findings.",
          wiring ? `(${wiring} more about prototype wiring — buttons or controls with no action yet: wire them, with proto.* in the Prototype tab, only when the person asks for a prototype.)` : "",
        ].filter(Boolean).join("\n");
      },
    });

    return [...canvas, ...docs, check];
  }

  function paramsFor(modelId, tools, messages) {
    const model = modelOf(modelId);
    return {
      model: modelId,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools,
      messages,
      stream: true,
      max_iterations: MAX_ITERATIONS,
      output_config: { effort: EFFORT },
      // Caches the tools, the system prompt and the history so far; each request moves the breakpoint to its end.
      cache_control: { type: "ephemeral" },
      ...(model?.fallbacks ? { betas: [FALLBACK_BETA], fallbacks: "default" } : {}),
    };
  }

  async function runTurn(session, text, options) {
    const turn = ++session.turn;
    const controller = new AbortController();
    session.running = { controller, turn };
    const started = now();
    const usage = emptyUsage();
    const modelId = session.model;
    const track = { wrote: false };
    let state = "done";
    let error = null;
    let runner = null;
    let steps = 0;
    /** The findings the last harness round sent the model. */
    let pending = [];
    emit(session, { type: "user", turn, text });
    try {
      const sdk = await client();
      const tools = await toolsFor(session, turn, controller, track);
      const context = await relayCall(session.tab, "get_studio_state", {}).catch((reason) => ({ ok: false, error: reason?.message }));
      const before = await findingsNow(session.tab).then((found) => (found === null ? null : designFindings(found)));
      session.messages.push({ role: "user", content: [{ type: "text", text: contextBlock(context, options) }, { type: "text", text }] });
      for (let round = 0; ; round += 1) {
        runner = sdk.beta.messages.toolRunner(paramsFor(modelId, tools, session.messages), { signal: controller.signal });
        for await (const stream of runner) {
          // Each request of the turn writes its own paragraph: the reply after a tool call starts on a new line.
          let fresh = true;
          stream.on("text", (delta) => {
            const before = session.items.findLast((item) => item.kind === "agent" && item.turn === turn)?.text ?? "";
            emit(session, { type: "text", turn, delta: fresh && before && !before.endsWith("\n") ? `\n\n${delta.replace(/^\n+/, "")}` : delta });
            fresh = false;
          });
          const message = await stream.finalMessage();
          steps += 1;
          addUsage(usage, message.usage);
          if (message.stop_reason === "refusal") {
            state = "error";
            error = "Claude declined this request.";
          }
        }
        session.messages = [...runner.params.messages];
        runner = null;
        if (state === "error" || before === null) break;
        if (!track.wrote) {
          // Told about findings, the agent changed nothing more (it may have said why): they are the person's now.
          if (pending.length) emit(session, { type: "check", turn, state: "left", count: pending.length, findings: formatFindings(pending).split("\n") });
          break;
        }
        track.wrote = false;
        emit(session, { type: "check", turn, state: "running", count: 0 });
        const after = await findingsNow(session.tab).then((found) => (found === null ? null : designFindings(found)));
        if (after === null) break;
        const fresh = newFindings(after, before);
        pending = fresh;
        if (!fresh.length) {
          emit(session, { type: "check", turn, state: "ok", count: 0 });
          break;
        }
        const lines = formatFindings(fresh).split("\n");
        if (round >= FIX_ROUNDS) {
          emit(session, { type: "check", turn, state: "left", count: fresh.length, findings: lines });
          break;
        }
        emit(session, { type: "check", turn, state: "fixing", count: fresh.length, findings: lines });
        session.messages.push({ role: "user", content: [{ type: "text", text: harnessMessage(fresh) }] });
      }
    } catch (failure) {
      if (runner) session.messages = [...runner.params.messages];
      if (controller.signal.aborted) state = "stopped";
      else {
        state = "error";
        error = errorText(failure);
      }
    } finally {
      closeOpenCalls(session.messages, state === "stopped" ? "Not run: the person stopped the turn." : "Not run: the reply ended before this call.");
      session.running = null;
      const cost = costOf(usage, modelId);
      const ms = now() - started;
      emit(session, { type: "end", turn, state, error, usage, cost, ms, model: modelId });
      log(`${session.tab} turn ${turn} ${modelId} ${state} requests=${steps} in=${usage.input} out=${usage.output} cacheRead=${usage.cacheRead} cacheWrite=${usage.cacheWrite} cost=${cost?.toFixed(4) ?? "?"} ${ms}ms${error ? ` error=${JSON.stringify(error)}` : ""}`);
    }
  }

  return {
    /** The transcript and state of `tab`'s conversation. */
    session(tab) {
      const session = sessions.get(tab);
      return { items: session?.items ?? [], busy: Boolean(session?.running), model: session?.model ?? DEFAULT_MODEL, turn: session?.turn ?? 0 };
    },
    /** Starts a turn (answers at once; the turn reports through events). */
    send(tab, text, { useSelection = true, model } = {}) {
      const session = sessionOf(tab);
      if (session.running) return { ok: false, code: "busy", error: "Zen Agent is still working on the last message: wait, or press Stop." };
      if (model !== undefined) {
        if (!modelOf(model)) return { ok: false, code: "invalid", error: `Unknown model ${model}` };
        session.model = model;
      }
      const turn = session.turn + 1;
      session.done = runTurn(session, text, { useSelection });
      return { ok: true, turn };
    },
    /** Stops `tab`'s running turn; true when one was running. */
    stop(tab) {
      const running = sessions.get(tab)?.running;
      if (!running) return false;
      running.controller.abort();
      return true;
    },
    /** A new conversation for `tab` (stops the running turn first). */
    async reset(tab) {
      const session = sessions.get(tab);
      if (!session) return;
      session.running?.controller.abort();
      await session.done?.catch(() => {});
      sessions.delete(tab);
    },
    /** For the selftest: the running turn's promise. */
    settled: (tab) => sessions.get(tab)?.done ?? Promise.resolve(),
    /** For the selftest: the history sent to the model. */
    messages: (tab) => sessions.get(tab)?.messages ?? [],
  };
}
