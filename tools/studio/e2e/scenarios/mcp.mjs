// Studio MCP rows (spec docs/research/studio-mcp-canvas-2026-10-15.md, M1): an AI client (the MCP SDK's Streamable HTTP
// client, with this checkout's token) works on a page made in the Studio through the dev server's /__zen-studio/mcp,
// and the canvas follows live. Each row makes its own page.
import fs from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { pagesDirOf } from "../lib/server.mjs";
import { sleep, until } from "../lib/studio.mjs";
import { mcpToken } from "../../mcp/token.mjs";
import { newPage, pageText } from "./builder.mjs";

let client = null;
/** One MCP client for the run (the endpoint is stateless). */
async function connect(ctx) {
  if (client) return client;
  const next = new Client({ name: "zen-studio-e2e", version: "1.0.0" });
  await next.connect(new StreamableHTTPClientTransport(new URL(`${ctx.server.url}/__zen-studio/mcp`), { requestInit: { headers: { authorization: `Bearer ${mcpToken(ctx.root)}` } } }));
  client = next;
  return client;
}

/** A tool call's result (its text; throws the refusal when the Studio refused). */
async function call(ctx, name, args = {}) {
  const result = await (await connect(ctx)).callTool({ name, arguments: args });
  const text = result.content.filter((item) => item.type === "text").map((item) => item.text).join("\n");
  if (result.isError) throw new Error(`${name} refused: ${text}`);
  return Object.assign(result, { text });
}

/** The undo stack the Studio keeps for this tab (session storage). */
const undoStack = (page) => page.evaluate(() => JSON.parse(sessionStorage.getItem("zen-studio:session") ?? "{}").undo ?? []);

/** A new page with its content Stack's id (a blank page holds one Stack, "Start building here"). */
async function pageWithContent(ctx) {
  const made = await newPage(ctx, { device: "desktop" });
  const tree = (await call(ctx, "get_tree")).text;
  // The content Stack of a blank desktop page: inside the master layout the AppShell Body pads the page, so it has no
  // padding of its own (a bare Screen's keeps padding="xl").
  const content = /^\s*Stack #(\S+) gap="md"(?: padding="xl")?$/m.exec(tree)?.[1];
  if (!content) throw new Error(`no content Stack in get_tree:\n${tree.slice(0, 600)}`);
  return { ...made, tree, content };
}

const frameText = async (page) => (await page.locator('[data-studio-frame^="screen:"]').first().innerText()).split("\n").map((line) => line.trim()).filter(Boolean);

export const rows = [
  {
    id: "AI-01", feature: "An AI client reads the open page over MCP: the page, layer ids, a frame picture", wp: "MCP M1",
    async run(ctx) {
      const { id, tree } = await pageWithContent(ctx);
      const state = JSON.parse((await call(ctx, "get_studio_state")).text);
      if (state.page?.id !== id || !state.editable) throw new Error(`get_studio_state: ${JSON.stringify(state.page)} editable ${state.editable}`);
      const picture = await call(ctx, "get_screenshot");
      const image = picture.content.find((item) => item.type === "image");
      if (!image || image.mimeType !== "image/png") throw new Error("get_screenshot gave no PNG");
      return `${id}: ${tree.split("\n").length - 1} layers with ids, a ${Math.round((image.data.length * 0.75) / 1024)} KB picture`;
    },
  },
  {
    id: "AI-02", feature: "update from an AI shows at once, is one undo step labelled AI, and ⌘Z takes it back", wp: "MCP M1",
    async run(ctx) {
      const { page, tree } = await pageWithContent(ctx);
      const text = /Text #(\S+) tone="base" — "Start building here/.exec(tree)?.[1];
      if (!text) throw new Error("no starter Text");
      await call(ctx, "update", { id: text, text: "Changed by AI", props: { tone: "strongest" } });
      await until(async () => (await frameText(page)).includes("Changed by AI"), { message: "the new text on the canvas" });
      const label = (await undoStack(page)).at(-1)?.label;
      if (label !== "AI · Text tone, text") throw new Error(`undo label ${label}`);
      // The person presses ⌘Z on the canvas (newPage leaves the Page name field focused, which would take it).
      await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
      await page.keyboard.press("ControlOrMeta+z");
      await until(async () => (await frameText(page)).some((line) => line.startsWith("Start building here")), { message: "⌘Z bringing the old text back" });
      return `"Changed by AI" live, undo "${label}", ⌘Z restored it`;
    },
  },
  {
    id: "AI-03", feature: "insert from an AI: JSX in the page dialect lands at its index, live; an HTML tag is refused with the reason", wp: "MCP M1",
    async run(ctx) {
      const { page, content } = await pageWithContent(ctx);
      const added = await call(ctx, "insert", { parent: content, index: 0, jsx: '<Button level="secondary" startIcon="icon-check-line">Approve</Button>' });
      const button = /Button #(\S+)/.exec(added.text)?.[1];
      await until(async () => (await frameText(page)).indexOf("Approve") >= 0 && (await frameText(page)).indexOf("Approve") < (await frameText(page)).findIndex((line) => line.startsWith("Start building here")), { message: "Approve before the starter text" });
      const refused = await call(ctx, "insert", { parent: content, jsx: "<div>html</div>" }).then(() => null, (error) => error.message);
      if (!refused || !/HTML element/.test(refused)) throw new Error(`an HTML tag was not refused with its reason: ${refused}`);
      return `Button #${button} first in the Stack; <div> refused (${refused.slice(refused.indexOf("<div>"), refused.indexOf("<div>") + 40)}…)`;
    },
  },
  {
    id: "AI-04", feature: "batch from an AI: $names chain new layers, the whole batch is one undo step; a batch refused part-way leaves the page as it was", wp: "MCP M1",
    async run(ctx) {
      const { page, id, content } = await pageWithContent(ctx);
      const before = (await undoStack(page)).length;
      await call(ctx, "batch", { ops: [
        { tool: "insert", as: "card", args: { parent: content, jsx: "<Card><Text>Batch card</Text></Card>" } },
        { tool: "insert", args: { parent: "$card", jsx: '<Button level="secondary">Card action</Button>' } },
        { tool: "update", args: { id: "$card", props: { theme: "default" } } },
      ] });
      await until(async () => (await frameText(page)).includes("Card action"), { message: "the batch on the canvas" });
      const stack = await undoStack(page);
      if (stack.length !== before + 1 || stack.at(-1)?.label !== "AI · 3 changes") throw new Error(`undo ${before} → ${stack.length}, "${stack.at(-1)?.label}"`);
      const kept = await pageText(page, id);
      const failed = await call(ctx, "batch", { ops: [
        { tool: "insert", args: { parent: content, jsx: "<Text>Taken back</Text>" } },
        { tool: "delete", args: { id: "n-missing" } },
      ] }).then(() => null, (error) => error.message);
      if (!failed || !/Op 2/.test(failed)) throw new Error(`the failing batch was not refused at op 2: ${failed}`);
      await sleep(300);
      if ((await pageText(page, id)) !== kept) throw new Error("the refused batch left a change in the page");
      return "3 ops = 1 undo step; a batch refused at op 2 took op 1 back";
    },
  },
  {
    id: "AI-05", feature: "A page file changed outside the tab (an editor, an AI's file tools) shows on the canvas without a reload", wp: "MCP M1",
    async run(ctx) {
      const { page, id, name } = await pageWithContent(ctx);
      const file = path.join(ctx.root, pagesDirOf(ctx.server.port), `${id}.zen.tsx`);
      // The tab's own pushes (the page's new name) are in the folder first: a later push would overwrite the edit below.
      await until(async () => fs.existsSync(file) && fs.readFileSync(file, "utf8").includes(JSON.stringify(name)), { message: "the named page in the folder" });
      await sleep(500);
      await page.evaluate(() => { window.__mcpNoReload = true; });
      fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("Start building here: add components from Assets.", "Written by a file tool"));
      const started = Date.now();
      await until(async () => (await frameText(page)).includes("Written by a file tool"), { message: "the file's change on the canvas", timeout: 5000 });
      if (!(await page.evaluate(() => window.__mcpNoReload === true))) throw new Error("the tab reloaded");
      return `shown after ${Date.now() - started} ms, no reload`;
    },
  },
  {
    id: "AI-06", feature: "The AI chip names the client; Stop refuses its calls until Resume", wp: "MCP M1",
    async run(ctx) {
      const { page } = await pageWithContent(ctx);
      await call(ctx, "get_studio_state");
      const chip = page.locator(".studio-ai");
      await until(async () => /zen-studio-e2e/.test((await chip.textContent().catch(() => "")) ?? ""), { message: "the AI chip" });
      await chip.getByRole("button", { name: /^Stop / }).click();
      const stopped = await call(ctx, "get_tree").then(() => null, (error) => error.message);
      await chip.getByRole("button", { name: /^Resume / }).click();
      if (!stopped || !/pressed Stop/.test(stopped)) throw new Error(`a call went through while stopped: ${stopped}`);
      await call(ctx, "get_tree");
      return "chip shown, call refused while stopped, accepted after Resume";
    },
  },
];
