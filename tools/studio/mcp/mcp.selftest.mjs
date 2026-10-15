// Self-test of the Studio MCP (spec docs/research/studio-mcp-canvas-2026-10-15.md, M0), no browser and no network:
// the relay (which tab, time-outs, a tab that goes away), the endpoint's guards, a real MCP client (the SDK's Streamable
// HTTP client) calling through the endpoint to a fake tab, and the tab's layer outline (src/platform/studio/mcp/tree.ts,
// imported directly: Node strips the types). `node tools/studio/mcp/mcp.selftest.mjs`; exits 1 on a failure.
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createRelay } from "./relay.mjs";
import { MCP_PATH, studioMcp } from "./server.mjs";
import { bearerMatches, mcpToken, rotateToken, TOKEN_FILE } from "./token.mjs";
import { TOOLS } from "./tools.mjs";
import { findLayer, frameOf, layerLine, outline, valueText } from "../../../src/platform/studio/mcp/tree.ts";

let failed = 0;
let passed = 0;
async function check(name, run) {
  try {
    await run();
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error(`✗ ${name}\n  ${error?.message ?? error}`);
  }
}

/* ── relay ────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A fake tab socket: `answer(call)` decides its reply (undefined: it never answers). */
function fakeClient(relay, answer) {
  const client = { sent: [], send(event, payload) { this.sent.push({ event, payload }); const reply = answer?.(payload); if (reply) queueMicrotask(() => relay.result({ id: payload.id, ...reply })); } };
  return client;
}

await check("relay: no tab → a clear error", async () => {
  const relay = createRelay();
  await assert.rejects(relay.call("get_tree", {}), (error) => error.code === "no-studio" && /open the Studio/i.test(error.message));
});

await check("relay: the call goes to the last focused visible tab and comes back", async () => {
  let now = 0;
  const relay = createRelay({ now: () => now });
  const a = fakeClient(relay, () => ({ ok: true, content: [{ type: "text", text: "from a" }] }));
  const b = fakeClient(relay, () => ({ ok: true, content: [{ type: "text", text: "from b" }] }));
  now = 1; relay.hello({ tab: "a", focused: true, visible: true }, a);
  now = 2; relay.hello({ tab: "b", focused: false, visible: true }, b);
  assert.equal((await relay.call("get_tree", {})).content[0].text, "from a");
  now = 3; relay.state({ tab: "b", focused: true, visible: true }, b);
  assert.equal((await relay.call("get_tree", {})).content[0].text, "from b");
  assert.equal((await relay.call("get_tree", {}, { tab: "a" })).content[0].text, "from a");
  now = 4; relay.state({ tab: "b", focused: true, visible: false }, b);
  assert.equal((await relay.call("get_tree", {})).content[0].text, "from a", "a hidden tab loses to a visible one");
  assert.equal(a.sent.at(-1).event, "zen-mcp:call");
  assert.deepEqual(Object.keys(a.sent.at(-1).payload).sort(), ["args", "client", "id", "tool"]);
  assert.equal(relay.tabs()[0].tab, "b", "tabs() lists the most recently focused first");
});

await check("relay: a tab that never answers times out; a closed socket rejects its calls", async () => {
  const relay = createRelay({ timeout: 30 });
  const silent = fakeClient(relay);
  relay.hello({ tab: "s", focused: true, visible: false }, silent);
  await assert.rejects(relay.call("update", {}), (error) => error.code === "timeout" && /background/.test(error.message));
  const pending = relay.call("update", {});
  relay.disconnect(silent);
  await assert.rejects(pending, (error) => error.code === "tab-gone");
  assert.equal(relay.tabs().length, 0);
  assert.equal(relay.pendingCount(), 0);
});

await check("relay: bye drops the tab; an unknown tab id is named in the error", async () => {
  const relay = createRelay();
  relay.hello({ tab: "x", focused: true }, fakeClient(relay));
  relay.bye({ tab: "x" });
  await assert.rejects(relay.call("get_tree", {}, { tab: "x" }), (error) => error.code === "no-tab");
  relay.hello({ tab: "" }, fakeClient(relay));
  assert.equal(relay.tabs().length, 0, "a hello without a tab id is ignored");
});

/* ── token ────────────────────────────────────────────────────────────────────────────────────────────────────── */

const root = fs.mkdtempSync(path.join(os.tmpdir(), "zen-studio-mcp-"));
await check("token: made once, owner-only, kept; rotate replaces it; Bearer compared exactly", async () => {
  const token = mcpToken(root);
  assert.match(token, /^[A-Za-z0-9_-]{32,}$/);
  assert.equal(mcpToken(root), token);
  assert.equal(fs.statSync(path.join(root, TOKEN_FILE)).mode & 0o777, 0o600);
  assert.ok(bearerMatches(`Bearer ${token}`, token));
  assert.ok(!bearerMatches(`Bearer ${token}x`, token));
  assert.ok(!bearerMatches(token, token), "the Bearer scheme is required");
  const next = rotateToken(root);
  assert.notEqual(next, token);
  assert.equal(mcpToken(root), next);
});

/* ── endpoint ─────────────────────────────────────────────────────────────────────────────────────────────────── */

const relay = createRelay({ timeout: 2000 });
const tab = fakeClient(relay, (call) => {
  if (call.tool === "get_studio_state") return { ok: true, content: [{ type: "text", text: JSON.stringify({ tab: "t1", client: call.client }) }] };
  if (call.tool === "get_screenshot") return { ok: true, content: [{ type: "image", data: "iVBORw0KGgo=", mimeType: "image/png" }, { type: "text", text: "Frame" }, { type: "audio", data: "x" }] };
  if (call.tool === "update") return { ok: false, code: "not-found", error: "No layer #n9 on this page" };
  return { ok: true, content: [{ type: "text", text: "x".repeat(50_000) }] };
});
relay.hello({ tab: "t1", focused: true, visible: true }, tab);
const handle = studioMcp({ root, relay, version: "9.9.9" });
const server = http.createServer((req, res) => {
  if (req.url?.split("?")[0] !== MCP_PATH) { res.statusCode = 404; res.end(); return; }
  handle(req, res).catch((error) => { res.statusCode = 500; res.end(String(error)); });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const url = `http://127.0.0.1:${port}${MCP_PATH}`;
const token = mcpToken(root);

/** A raw request (headers as given), for the guards. */
function raw({ method = "POST", headers = {}, body = '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path: MCP_PATH, method, headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers } }, (res) => {
      let text = "";
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, text, headers: res.headers }));
    });
    req.on("error", reject);
    if (method !== "GET") req.end(body);
    else req.end();
  });
}

await check("endpoint guards: token, Origin, Host, method, body", async () => {
  assert.equal((await raw()).status, 403, "no token");
  assert.match((await raw()).text, /studio:mcp/);
  assert.equal((await raw({ headers: { authorization: "Bearer nope" } })).status, 403, "wrong token");
  assert.equal((await raw({ headers: { authorization: `Bearer ${token}`, origin: "http://evil.example" } })).status, 403, "any Origin");
  assert.equal((await raw({ headers: { authorization: `Bearer ${token}`, origin: `http://127.0.0.1:${port}` } })).status, 403, "even its own origin: browsers stay out");
  assert.equal((await raw({ headers: { authorization: `Bearer ${token}`, host: "evil.example" } })).status, 403, "a non-loopback Host (DNS rebinding)");
  assert.equal((await raw({ method: "GET", headers: { authorization: `Bearer ${token}` } })).status, 405, "no SSE stream");
  assert.equal((await raw({ headers: { authorization: `Bearer ${token}` }, body: "{nope" })).status, 400, "not JSON");
});

const client = new Client({ name: "zen-selftest-client", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers: { authorization: `Bearer ${token}` } } }));

await check("MCP client: initialize names the server; tools/list is the four M0 tools", async () => {
  assert.equal(client.getServerVersion()?.name, "zen-studio");
  assert.equal(client.getServerVersion()?.version, "9.9.9");
  assert.match(client.getInstructions() ?? "", /get_studio_state first/);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((tool) => tool.name), ["get_studio_state", "get_tree", "update", "get_screenshot"]);
  assert.equal(tools.find((tool) => tool.name === "update").annotations.readOnlyHint, false);
  assert.deepEqual(tools.find((tool) => tool.name === "update").inputSchema.required, ["id"]);
});

await check("MCP client: a call reaches the tab with the client's name and comes back", async () => {
  const result = await client.callTool({ name: "get_studio_state", arguments: {} });
  assert.ok(!result.isError);
  assert.deepEqual(JSON.parse(result.content[0].text), { tab: "t1", client: "zen-selftest-client" });
});

await check("MCP client: a refusal is a tool error the model reads; long text is cut; only text and images pass", async () => {
  const refused = await client.callTool({ name: "update", arguments: { id: "n9", props: { level: "secondary" } } });
  assert.equal(refused.isError, true);
  assert.match(refused.content[0].text, /No layer #n9/);
  const long = await client.callTool({ name: "get_tree", arguments: {} });
  assert.ok(long.content[0].text.length < 41_000 && /cut at 40000/.test(long.content[0].text));
  const picture = await client.callTool({ name: "get_screenshot", arguments: {} });
  assert.deepEqual(picture.content.map((item) => item.type), ["image", "text"]);
  const unknown = await client.callTool({ name: "rm_rf", arguments: {} });
  assert.equal(unknown.isError, true);
});

await check("MCP client: no tab → the call is a tool error saying to open the Studio", async () => {
  relay.bye({ tab: "t1" });
  const result = await client.callTool({ name: "get_tree", arguments: {} });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /No Zen Studio tab is open/);
});

await client.close();
await new Promise((resolve) => server.close(resolve));
fs.rmSync(root, { recursive: true, force: true });

await check("tools.mjs: every tool has a description and an object schema", async () => {
  for (const tool of TOOLS) {
    assert.ok(tool.description.length > 40, tool.name);
    assert.equal(tool.inputSchema.type, "object", tool.name);
    assert.equal(typeof tool.annotations.readOnlyHint, "boolean", tool.name);
  }
});

/* ── the tab's outline (tree.ts) ──────────────────────────────────────────────────────────────────────────────── */

const lit = (value) => ({ kind: "literal", value });
const el = (id, name, props = {}, children = []) => ({ kind: "element", id, name, props, children });
const board = el("b", "Board", {}, [
  el("s1", "Screen", { id: lit("screen-1"), title: lit("Dashboard"), device: lit("desktop") }, [
    el("st", "Stack", { gap: lit("md"), fill: lit(true) }, [
      el("h", "Heading", { level: lit(2) }, [{ kind: "text", value: "Revenue" }]),
      el("btn", "Button", { level: lit("primary"), endIcon: { kind: "element", node: el("ic", "Icon", { name: lit("icon-check-line") }) } }, [{ kind: "text", value: "Save" }]),
      { kind: "map", source: { root: "mock", path: ["people"] }, item: "person", node: el("av", "Avatar", { name: { kind: "ref", root: "person", path: ["name"] } }) },
    ]),
  ]),
]);

await check("tree: one line per layer with props, slots, rows and text", async () => {
  assert.equal(outline(board), [
    "Board #b",
    "  Screen #s1 id=\"screen-1\" title=\"Dashboard\" device=\"desktop\"",
    "    Stack #st gap=\"md\" fill",
    "      Heading #h level=2 — \"Revenue\"",
    "      Button #btn level=\"primary\" — \"Save\"",
    "        endIcon: Icon #ic name=\"icon-check-line\"",
    "      each person of mock.people: Avatar #av name={person.name}",
  ].join("\n"));
  assert.equal(outline(board, { depth: 1 }).split("\n").at(-1), "    … 5 layers inside (get_tree id=s1)");
  assert.equal(layerLine(board.children[0].children[0].children[1]), "Button #btn level=\"primary\" — \"Save\"");
});

await check("tree: find a layer, its frame, value summaries", async () => {
  assert.deepEqual(findLayer(board, "ic")?.ancestors.map((node) => node.id), ["b", "s1", "st", "btn"]);
  assert.equal(findLayer(board, "nope"), null);
  assert.equal(frameOf(board, "av")?.id, "s1");
  assert.equal(frameOf(board, "s1")?.id, "s1");
  assert.equal(frameOf(board, "b"), null);
  assert.equal(valueText({ kind: "array", items: [lit("a"), lit("b")] }), "[\"a\", \"b\"]");
  assert.equal(valueText({ kind: "object", fields: { icon: lit("x"), label: lit("y") } }), "{icon, label}");
  assert.equal(valueText({ kind: "proto", action: "go", args: ["screen-2"] }), "proto.go(\"screen-2\")");
  assert.equal(valueText(lit("x".repeat(200))).length, 82);
});

console.log(failed ? `\n${failed} failed, ${passed} passed` : `Studio MCP selftest: ${passed} passed`);
process.exit(failed ? 1 : 0);
