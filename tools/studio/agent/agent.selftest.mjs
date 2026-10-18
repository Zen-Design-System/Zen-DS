// Self-test of Zen Agent (plan docs/research/studio-vibe-agent-2026-10-18.md, V0), no browser and no network: the
// transcript, the harness diff, the scripted model, and whole turns through the SDK's real Tool Runner (a scripted
// fetch answers /v1/messages) against a fake Studio tab behind the relay's interface: tools, events, the harness's
// feedback round, Stop (the panel's and the AI chip's), a busy tab, the routes without credentials, and the zen-ds
// knowledge server over stdio. `node tools/studio/agent/agent.selftest.mjs`; exits 1 on a failure.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { TOOLS } from "../mcp/tools.mjs";
import { codeOf, designFindings, newFindings, pageFindings } from "./harness.mjs";
import { KNOWLEDGE_TOOLS, zenKnowledge } from "./knowledge.mjs";
import { addUsage, costOf, emptyUsage } from "./models.mjs";
import { zenAgent } from "./routes.mjs";
import { idsOf, positionOf, scriptedFetch } from "./script.mjs";
import { AGENT_CLIENT, createAgent } from "./session.mjs";
import { transcriptOf } from "./transcript.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

let failed = 0;
let passed = 0;
async function check(name, run) {
  try {
    await run();
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error(`✗ ${name}\n  ${error?.stack ?? error}`);
  }
}

/* ── a fake Studio tab behind the relay's interface ───────────────────────────────────────────────────────────── */

const page = (button) => `// @zen-page {"format":1,"title":"Test"}
import { Board, Screen } from "@zen-ds/react/builder";
import { BottomNavigation, Button, Stack } from "@zen-ds/react";

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Test" device="desktop">
        <Stack gap="md">
          ${button}
        </Stack>
      </Screen>
    </Board>
  );
}
`;
const CLEAN = page(`<Button level="primary">Save</Button>`);
const BROKEN = page(`<BottomNavigation items={[]} />`);

/** `answers[tool](args, tab)` → { ok, content } | { ok: false, code, error }; records calls and the events sent. */
function fakeRelay(answers) {
  const tab = { code: CLEAN, events: [], calls: [] };
  const client = { send: (event, data) => { if (event === "zen-agent:event") tab.events.push(data.event); } };
  const text = (value) => ({ ok: true, content: [{ type: "text", text: value }] });
  const defaults = {
    get_studio_state: () => text(JSON.stringify({ tab: "t1", page: { kind: "studio-page", id: "p", title: "Test" }, selection: [{ id: "n1", layer: "Button #n1 level=\"primary\" — \"Save\"" }] })),
    get_code: () => text(tab.code),
    update: (args) => text(`Changed: Button #${args.id} ${Object.entries(args.props ?? {}).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(" ")}`),
    get_screenshot: () => ({ ok: true, content: [{ type: "image", data: "iVBORw0KGgo=", mimeType: "image/png" }, { type: "text", text: "Frame \"Test\", 1440×900 px." }] }),
  };
  return {
    tab,
    target: (id) => (id === "t1" ? { tab: "t1", client } : null),
    async call(tool, args, options) {
      tab.calls.push({ tool, args, options });
      const answer = answers?.[tool] ?? defaults[tool];
      if (!answer) return { ok: false, code: "invalid", error: `Unknown tool ${tool}` };
      return answer(args, tab);
    },
  };
}

const fakeKnowledge = {
  tools: async () => [{ name: "search_icons", description: "Find Zen icon names", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } }],
  call: async (_name, args) => ({ content: [{ type: "text", text: `icon-check-line (for ${args.query})` }] }),
};

function scriptedAgent(script, relay, requests = []) {
  const sdk = new Anthropic({ apiKey: "script", baseURL: "http://script.invalid", fetch: scriptedFetch(script, { requests }), maxRetries: 0 });
  return createAgent({ relay, knowledge: fakeKnowledge, client: () => sdk });
}

/* ── pure parts ───────────────────────────────────────────────────────────────────────────────────────────────── */

await check("transcript: prompt, streamed text, a tool call, the harness, the end", async () => {
  const items = transcriptOf([
    { type: "user", turn: 1, text: "Make it secondary" },
    { type: "tool", turn: 1, call: "a", name: "update", summary: "Changing a layer", state: "running" },
    { type: "text", turn: 1, delta: "Đã " },
    { type: "tool", turn: 1, call: "a", name: "update", summary: "", state: "ok", detail: "Changed: Button" },
    { type: "text", turn: 1, delta: "đổi." },
    { type: "check", turn: 1, state: "ok", count: 0 },
    { type: "end", turn: 1, state: "done", cost: 0.012, ms: 900, model: "claude-opus-5-5" },
  ]);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], { kind: "user", turn: 1, text: "Make it secondary" });
  assert.equal(items[1].text, "Đã đổi.");
  assert.deepEqual(items[1].steps, [{ call: "a", name: "update", summary: "Changing a layer", state: "ok", detail: "Changed: Button" }]);
  assert.equal(items[1].check.state, "ok");
  assert.equal(items[1].state, "done");
  assert.equal(items[1].cost, 0.012);
});

await check("harness: only the findings a turn caused count", async () => {
  const before = pageFindings(page(`<BottomNavigation items={[]} />`));
  assert.ok(before.length >= 1, "an empty BottomNavigation is a finding");
  const after = pageFindings(page(`<BottomNavigation items={[]} />\n          <BottomNavigation items={[]} />`));
  assert.equal(newFindings(after, before).length, before.length, "the second copy is new");
  assert.equal(newFindings(before, before).length, 0);
  const clean = pageFindings(CLEAN);
  assert.deepEqual(clean.map((finding) => finding.rule), ["interaction/action-without-handler"], "a button with no action yet is wiring");
  assert.equal(designFindings(clean).length, 0, "…which a design page leaves to the Prototype tab");
  assert.equal(codeOf({ ok: true, content: [{ type: "text", text: CLEAN }] }), CLEAN);
  assert.equal(codeOf({ ok: true, content: [{ type: "text", text: "No page made in the Studio is open." }] }), null);
});

await check("models: usage adds up and costs Opus 5.5's rates", async () => {
  const usage = addUsage(emptyUsage(), { input_tokens: 1_000_000, output_tokens: 100_000, cache_read_input_tokens: 1_000_000, cache_creation_input_tokens: 0 });
  assert.equal(costOf(usage, "claude-opus-5-5").toFixed(2), "6.20");
  assert.equal(costOf(usage, "nope"), null);
});

await check("script: a request's place in the conversation", async () => {
  const prompt = (text) => ({ role: "user", content: [{ type: "text", text: "<studio-context>\n{}\n</studio-context>" }, { type: "text", text }] });
  assert.deepEqual(positionOf({ messages: [prompt("a")] }), { prompt: 0, request: 0 });
  assert.deepEqual(positionOf({ messages: [prompt("a"), { role: "assistant", content: [] }, { role: "user", content: [{ type: "tool_result" }] }] }), { prompt: 0, request: 1 });
  assert.deepEqual(positionOf({ messages: [prompt("a"), { role: "assistant", content: [] }, prompt("b")] }), { prompt: 1, request: 0 });
  const context = { role: "user", content: [{ type: "text", text: `<studio-context>\n${JSON.stringify({ frames: [{ id: "f1" }], selection: [{ id: "n9" }] })}\n</studio-context>` }, { type: "text", text: "x" }] };
  assert.deepEqual(idsOf({ messages: [context] }), { $selection: "n9", $frame: "f1" });
});

/* ── whole turns through the Tool Runner ──────────────────────────────────────────────────────────────────────── */

await check("turn: the prompt carries the canvas, a tool runs in the tab, the reply streams, the harness passes", async () => {
  const relay = fakeRelay();
  const requests = [];
  const agent = scriptedAgent({ turns: [[
    { text: "Đổi nút.", tools: [{ name: "search_icons", input: { query: "check" } }, { name: "update", input: { id: "n1", props: { level: "secondary", startIcon: "icon-check-line" } } }] },
    { text: "Đã đổi nút Save sang secondary, thêm icon check." },
  ]] }, relay, requests);
  assert.deepEqual(agent.send("t1", "đổi nút sang secondary và thêm icon check"), { ok: true, turn: 1 });
  await agent.settled("t1");
  assert.equal(requests.length, 2);
  const first = requests[0];
  assert.equal(first.model, "claude-opus-5-5");
  assert.equal(first.stream, true);
  assert.deepEqual(first.output_config, { effort: "medium" });
  assert.deepEqual(first.cache_control, { type: "ephemeral" });
  assert.equal(first.fallbacks, "default");
  assert.match(first.system, /You are Zen Agent/);
  assert.deepEqual(first.tools.map((tool) => tool.name), [...TOOLS.map((tool) => tool.name), "search_icons", "check_page"]);
  assert.ok(first.tools.every((tool) => tool.run === undefined && tool.input_schema?.type === "object"), "only definitions go to the API");
  const prompt = first.messages[0].content;
  assert.match(prompt[0].text, /^<studio-context>[\s\S]*"selection"[\s\S]*Button #n1/);
  assert.equal(prompt[1].text, "đổi nút sang secondary và thêm icon check");
  const results = requests[1].messages[2].content;
  assert.deepEqual(results.map((block) => block.type), ["tool_result", "tool_result"]);
  assert.ok(!results.some((block) => block.is_error));
  const update = relay.tab.calls.find((call) => call.tool === "update");
  assert.deepEqual(update.args, { id: "n1", props: { level: "secondary", startIcon: "icon-check-line" } });
  assert.deepEqual(update.options, { tab: "t1", client: AGENT_CLIENT });
  const [user, reply] = agent.session("t1").items;
  assert.equal(user.text, "đổi nút sang secondary và thêm icon check");
  assert.equal(reply.text, "Đổi nút.\n\nĐã đổi nút Save sang secondary, thêm icon check.", "each request is its own paragraph");
  assert.deepEqual(reply.steps.map((step) => [step.name, step.state]), [["search_icons", "ok"], ["update", "ok"]]);
  assert.match(reply.steps[1].detail, /^Changed: Button #n1 level="secondary"/);
  assert.equal(reply.check?.state, "ok");
  assert.equal(reply.state, "done");
  assert.ok(reply.cost > 0 && reply.ms >= 0 && reply.model === "claude-opus-5-5");
  assert.deepEqual(relay.tab.events.at(-1).type, "end");
  assert.equal(agent.session("t1").busy, false);
});

await check("turn: a screenshot goes back to the model as an image block", async () => {
  const relay = fakeRelay();
  const requests = [];
  const agent = scriptedAgent({ turns: [[{ tools: [{ name: "get_screenshot", input: {} }] }, { text: "A Save button on a white screen." }]] }, relay, requests);
  agent.send("t1", "what do you see?");
  await agent.settled("t1");
  const [result] = requests[1].messages[2].content;
  assert.deepEqual(result.content.map((block) => block.type), ["image", "text"]);
  assert.deepEqual(result.content[0].source, { type: "base64", media_type: "image/png", data: "iVBORw0KGgo=" });
  assert.equal(agent.session("t1").items[1].check, null, "a turn that changed nothing runs no harness");
});

await check("turn: findings the turn caused go back to the model, which fixes them", async () => {
  const relay = fakeRelay({
    update: (args, tab) => {
      tab.code = args.props?.level === "broken" ? BROKEN : CLEAN;
      return { ok: true, content: [{ type: "text", text: `Changed: #${args.id}` }] };
    },
  });
  const requests = [];
  const agent = scriptedAgent({ turns: [[
    { tools: [{ name: "update", input: { id: "n1", props: { level: "broken" } } }] },
    { text: "Done." },
    { tools: [{ name: "update", input: { id: "n1", props: { level: "primary" } } }] },
    { text: "Fixed the navigation." },
  ]] }, relay, requests);
  agent.send("t1", "break it");
  await agent.settled("t1");
  assert.equal(requests.length, 4);
  const harness = requests[2].messages.at(-1);
  assert.equal(harness.role, "user");
  assert.match(harness.content[0].text, /^<zen-harness>[\s\S]*\[bottom-navigation\/destinations\]/);
  const reply = agent.session("t1").items[1];
  assert.equal(reply.check.state, "ok");
  const checks = relay.tab.events.filter((event) => event.type === "check").map((event) => event.state);
  assert.deepEqual(checks, ["running", "fixing", "running", "ok"]);
});

await check("turn: findings that were there before the turn are left alone", async () => {
  const relay = fakeRelay();
  relay.tab.code = BROKEN;
  const requests = [];
  const agent = scriptedAgent({ turns: [[{ tools: [{ name: "update", input: { id: "n1", props: { gap: "lg" } } }] }, { text: "Done." }]] }, relay, requests);
  agent.send("t1", "more space");
  await agent.settled("t1");
  assert.equal(requests.length, 2, "no harness round");
  assert.equal(agent.session("t1").items[1].check.state, "ok");
});

await check("turn: harness findings it cannot fix are handed to the person after two rounds", async () => {
  const relay = fakeRelay({ update: (_args, tab) => { tab.code = BROKEN; return { ok: true, content: [{ type: "text", text: "Changed" }] }; } });
  const tries = Array.from({ length: 3 }, () => [{ tools: [{ name: "update", input: { id: "n1", props: { x: 1 } } }] }, { text: "Tried." }]).flat();
  const agent = scriptedAgent({ turns: [tries] }, relay);
  agent.send("t1", "go");
  await agent.settled("t1");
  const reply = agent.session("t1").items[1];
  assert.equal(reply.check.state, "left");
  assert.ok(reply.check.findings.some((line) => line.includes("bottom-navigation/destinations")));
  assert.equal(reply.state, "done");
});

await check("turn: findings the agent does not touch again are handed to the person (no stuck check)", async () => {
  const relay = fakeRelay({ update: (_args, tab) => { tab.code = BROKEN; return { ok: true, content: [{ type: "text", text: "Changed" }] }; } });
  const agent = scriptedAgent({ turns: [[{ tools: [{ name: "update", input: { id: "n1", props: { x: 1 } } }] }, { text: "Done." }, { text: "That one is needed: the person asked for it." }]] }, relay);
  agent.send("t1", "go");
  await agent.settled("t1");
  const reply = agent.session("t1").items[1];
  assert.equal(reply.check.state, "left");
  assert.match(reply.text, /needed/);
});

await check("stop: the panel's Stop ends a streaming turn; the history stays valid", async () => {
  const relay = fakeRelay();
  const requests = [];
  const agent = scriptedAgent({ turns: [[{ text: "x".repeat(400), delay: 30 }], [{ text: "Next." }]] }, relay, requests);
  agent.send("t1", "write a lot");
  await new Promise((resolve) => setTimeout(resolve, 120));
  assert.equal(agent.session("t1").busy, true);
  assert.equal(agent.stop("t1"), true);
  await agent.settled("t1");
  assert.equal(agent.session("t1").items[1].state, "stopped");
  assert.equal(agent.stop("t1"), false, "nothing runs any more");
  agent.send("t1", "next");
  await agent.settled("t1");
  assert.equal(agent.session("t1").items[3].state, "done");
  assert.equal(agent.session("t1").items[3].text, "Next.");
});

await check("stop: the AI chip's Stop refuses the call and ends the turn", async () => {
  const relay = fakeRelay({ update: () => ({ ok: false, code: "stopped", error: "The person pressed Stop on the AI chip in Zen Studio" }) });
  const agent = scriptedAgent({ turns: [[{ tools: [{ name: "update", input: { id: "n1", props: { level: "secondary" } } }] }, { text: "Should not run." }]] }, relay);
  agent.send("t1", "change it");
  await agent.settled("t1");
  const reply = agent.session("t1").items[1];
  assert.equal(reply.state, "stopped");
  assert.equal(reply.steps[0].state, "error");
  assert.ok(!reply.text.includes("Should not run"));
  const history = agent.messages("t1");
  const last = history.at(-1);
  assert.equal(last.role, "user");
  assert.ok(last.content.every((block) => block.type === "tool_result"), "every tool call has its result");
});

await check("busy: a second message while a turn runs is refused", async () => {
  const relay = fakeRelay();
  const agent = scriptedAgent({ turns: [[{ text: "slow", delay: 20 }]] }, relay);
  agent.send("t1", "one");
  assert.equal(agent.send("t1", "two").code, "busy");
  await agent.settled("t1");
  assert.equal(agent.send("t1", "three", { model: "gpt" }).code, "invalid");
});

await check("api errors: a refused key reads as a key problem", async () => {
  const relay = fakeRelay();
  const sdk = new Anthropic({ apiKey: "bad", baseURL: "http://script.invalid", maxRetries: 0, fetch: async () => new Response(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }), { status: 401, headers: { "content-type": "application/json" } }) });
  const agent = createAgent({ relay, knowledge: fakeKnowledge, client: () => sdk });
  agent.send("t1", "hi");
  await agent.settled("t1");
  const reply = agent.session("t1").items[1];
  assert.equal(reply.state, "error");
  assert.match(reply.error, /API key was refused/);
});

/* ── routes ───────────────────────────────────────────────────────────────────────────────────────────────────── */

await check("routes: no credentials → the reason and the fix, and send is refused", async () => {
  const saved = { key: process.env.ANTHROPIC_API_KEY, token: process.env.ANTHROPIC_AUTH_TOKEN, home: process.env.HOME, config: process.env.ANTHROPIC_CONFIG_DIR };
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "zen-agent-"));
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_AUTH_TOKEN;
  process.env.HOME = empty;
  process.env.ANTHROPIC_CONFIG_DIR = empty;
  try {
    const routes = zenAgent({ root, relay: fakeRelay(), env: {} });
    const url = new URL("http://localhost/__zen-studio/agent/session?tab=t1");
    const session = await routes.handle("GET /agent/session", null, url);
    assert.equal(session.status, 200);
    assert.equal(session.body.available, false);
    assert.equal(session.body.reason, "no-credentials");
    assert.match(session.body.hint, /ANTHROPIC_API_KEY/);
    assert.deepEqual(session.body.models.map((model) => model.id), ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"]);
    const sent = await routes.handle("POST /agent/send", { tab: "t1", text: "hi" }, url);
    assert.equal(sent.status, 409);
    assert.equal(sent.body.code, "no-credentials");
    assert.equal((await routes.handle("POST /agent/send", { tab: "../x", text: "hi" }, url)).status, 400);
    assert.equal((await routes.handle("POST /agent/send", { tab: "t1", text: "  " }, url)).status, 400);
    await routes.close();
  } finally {
    for (const [name, value] of [["ANTHROPIC_API_KEY", saved.key], ["ANTHROPIC_AUTH_TOKEN", saved.token], ["HOME", saved.home], ["ANTHROPIC_CONFIG_DIR", saved.config]]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    fs.rmSync(empty, { recursive: true, force: true });
  }
});

await check("routes: ZEN_AGENT_SCRIPT runs a turn end to end", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zen-agent-"));
  const file = path.join(dir, "script.json");
  fs.writeFileSync(file, JSON.stringify({ turns: [[{ text: "Xin chào." }]] }));
  const relay = fakeRelay();
  try {
    const routes = zenAgent({ root, relay, env: { ZEN_AGENT_SCRIPT: file } });
    const url = new URL("http://localhost/__zen-studio/agent/session?tab=t1");
    assert.equal((await routes.handle("GET /agent/session", null, url)).body.source, "script");
    const sent = await routes.handle("POST /agent/send", { tab: "t1", text: "chào" }, url);
    assert.equal(sent.status, 202);
    for (let i = 0; i < 100 && relay.tab.events.at(-1)?.type !== "end"; i += 1) await new Promise((resolve) => setTimeout(resolve, 20));
    const session = await routes.handle("GET /agent/session", null, url);
    assert.equal(session.body.items[1].text, "Xin chào.");
    assert.equal((await routes.handle("POST /agent/reset", { tab: "t1" }, url)).status, 200);
    assert.deepEqual((await routes.handle("GET /agent/session", null, url)).body.items, []);
    await routes.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

await check("knowledge: the zen-ds server answers over stdio", async () => {
  const knowledge = zenKnowledge({ root });
  try {
    assert.deepEqual((await knowledge.tools()).map((tool) => tool.name), KNOWLEDGE_TOOLS);
    const answer = await knowledge.call("search_icons", { query: "check", limit: 3 });
    assert.match(answer.content[0].text, /icon-check/);
  } finally {
    await knowledge.close();
  }
});

console.log(failed ? `\n${failed} failed, ${passed} passed` : `Zen Agent selftest: ${passed} passed`);
process.exit(failed ? 1 : 0);
