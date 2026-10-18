// Zen Agent rows (plan docs/research/studio-vibe-agent-2026-10-18.md, V0): the panel on a real Studio tab, with the
// scripted model (tools/studio/agent/script.mjs; ZEN_AGENT_SCRIPT points at a script each row writes), so the SDK's real
// Tool Runner, the relay and the tab's tools run end to end with no key and no network. Each row makes its own page and
// starts a new chat. The layer ids come from the prompt's <studio-context> ("$selection").
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { until } from "../lib/studio.mjs";
import { mcpToken } from "../../mcp/token.mjs";
import { newPage, pageText } from "./builder.mjs";

const scriptFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "zen-agent-e2e-")), "script.json");

/** Puts up the model's replies for the row (read by the dev server at each request). */
function script(turns) {
  fs.writeFileSync(scriptFile, JSON.stringify({ turns }));
  process.env.ZEN_AGENT_SCRIPT = scriptFile;
}

let client = null;
/** The Studio MCP, to set the page up (a Button to work on, its selection) as a person would by hand. */
async function mcp(ctx, name, args = {}) {
  if (!client) {
    client = new Client({ name: "zen-studio-e2e", version: "1.0.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${ctx.server.url}/__zen-studio/mcp`), { requestInit: { headers: { authorization: `Bearer ${mcpToken(ctx.root)}` } } }));
  }
  const result = await client.callTool({ name, arguments: args });
  const text = result.content.filter((item) => item.type === "text").map((item) => item.text).join("\n");
  if (result.isError) throw new Error(`${name} refused: ${text}`);
  return text;
}

/** A new page holding a selected "Save" Button, and the panel open on a new chat. */
async function pageWithButton(ctx) {
  const made = await newPage(ctx, { device: "desktop" });
  const { page, id } = made;
  const tree = await mcp(ctx, "get_tree");
  const content = /Stack #(\S+) gap="md" padding="xl"/.exec(tree)?.[1];
  if (!content) throw new Error(`no content Stack in get_tree:\n${tree.slice(0, 400)}`);
  const added = await mcp(ctx, "insert", { parent: content, index: 0, jsx: '<Button level="primary">Save</Button>' });
  const button = /Button #(\S+)/.exec(added)?.[1];
  await mcp(ctx, "select", { ids: [button] });
  script([]);
  // Opening the panel asks the server again (the scripted model is "credentials"); a panel left open is reopened.
  const panel = page.locator(".studio-agent");
  if (await panel.count()) await panel.getByRole("button", { name: "Close Zen Agent" }).click();
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
  await page.keyboard.press("ControlOrMeta+j");
  await panel.waitFor({ state: "visible", timeout: 5000 });
  await until(async () => !(await panel.innerText()).includes("Connecting…"), { message: "the panel connected" });
  const fresh = panel.getByRole("button", { name: "New chat" });
  if (await fresh.isEnabled()) await fresh.click();
  await until(async () => (await panel.innerText()).includes("What should we design?"), { message: "a new chat" });
  return { ...made, page, id, button, panel };
}

/** Writes a prompt in the panel and waits until its turn ends (its cost line, or Stopped). */
async function ask(panel, text, { wait = true } = {}) {
  const field = panel.locator("textarea");
  await field.fill(text);
  await field.press("Enter");
  if (!wait) return;
  await until(async () => /\$\d|< \$0\.01|Stopped/.test(await panel.locator(".studio-agent__reply").last().innerText().catch(() => "")), { message: `the answer to "${text}"`, timeout: 15000 });
}

const lastReply = (panel) => panel.locator(".studio-agent__reply").last().innerText();
const undoStack = (page) => page.evaluate(() => JSON.parse(sessionStorage.getItem("zen-studio:session") ?? "{}").undo ?? []);

export const rows = [
  {
    id: "AG-01", feature: "Zen Agent changes the selected layer from the panel: live, one ⌘Z step, the Zen harness checks it", wp: "Agent V0",
    async run(ctx) {
      const { page, id, panel } = await pageWithButton(ctx);
      if (!/Button/.test(await panel.locator(".studio-agent__context").innerText())) throw new Error("no Button chip for the selection");
      script([[
        { text: "Đổi nút sang Tertiary.", tools: [{ name: "update", input: { id: "$selection", props: { level: "tertiary", startIcon: "icon-check-line" } } }] },
        { text: "\nXong." },
      ]]);
      const before = (await undoStack(page)).length;
      await ask(panel, "đổi nút chính sang tertiary và thêm icon check");
      await until(async () => /<Button level="tertiary" startIcon="icon-check-line">Save<\/Button>/.test((await pageText(page, id)) ?? ""), { message: "the Button changed on the page" });
      const reply = await lastReply(panel);
      if (!/Changing a layer/.test(reply) || !/Zen rules pass/.test(reply) || !/Xong/.test(reply)) throw new Error(`the reply: ${JSON.stringify(reply)} · panel: ${JSON.stringify(await panel.innerText())}`);
      const stack = await undoStack(page);
      if (stack.length !== before + 1) throw new Error(`undo ${before} → ${stack.length}`);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+z");
      await until(async () => /<Button level="primary">Save<\/Button>/.test((await pageText(page, id)) ?? ""), { message: "⌘Z taking the change back" });
      return `"${stack.at(-1)?.label}", ⌘Z restored it; ${reply.split("\n").find((line) => line.includes("$")) ?? ""}`;
    },
  },
  {
    id: "AG-02", feature: "The prompt carries the selection: the agent reads the selected layer by its id", wp: "Agent V0",
    async run(ctx) {
      const { panel } = await pageWithButton(ctx);
      script([[{ tools: [{ name: "get_node", input: { id: "$selection" } }] }, { text: "It is the Save button." }]]);
      await ask(panel, "nút đang chọn là gì?");
      const step = panel.locator(".studio-agent__step").last();
      if ((await step.getAttribute("data-state")) !== "ok") throw new Error(`get_node: ${await step.getAttribute("title")}`);
      const detail = (await step.getAttribute("title")) ?? "";
      if (!/Button/.test(detail)) throw new Error(`get_node read ${detail}`);
      return `get_node → ${detail.slice(0, 60)}`;
    },
  },
  {
    id: "AG-03", feature: "The agent takes a picture of the frame (get_screenshot) and answers", wp: "Agent V0",
    async run(ctx) {
      const { panel } = await pageWithButton(ctx);
      script([[{ tools: [{ name: "get_screenshot", input: {} }] }, { text: "A Save button on the screen." }]]);
      await ask(panel, "chụp frame và mô tả");
      const step = panel.locator(".studio-agent__step").last();
      if ((await step.getAttribute("data-state")) !== "ok") throw new Error(`get_screenshot: ${await step.getAttribute("title")}`);
      return `picture: ${(await step.getAttribute("title"))?.slice(0, 60)}`;
    },
  },
  {
    id: "AG-04", feature: "Stop in the panel ends a turn while it streams; the next message works", wp: "Agent V0",
    async run(ctx) {
      const { panel } = await pageWithButton(ctx);
      script([[{ text: "x".repeat(600), delay: 60 }], [{ text: "Next answer." }]]);
      await ask(panel, "viết thật dài", { wait: false });
      await until(async () => (await panel.locator(".studio-agent__reply").last().innerText().catch(() => "")).includes("xxxx"), { message: "the reply streaming" });
      await panel.getByRole("button", { name: /^Stop/ }).click();
      await until(async () => (await lastReply(panel)).includes("Stopped"), { message: "the turn stopped" });
      await ask(panel, "tiếp");
      if (!(await lastReply(panel)).includes("Next answer.")) throw new Error(`after Stop: ${await lastReply(panel)}`);
      return "stopped mid-stream; the next message answered";
    },
  },
  {
    id: "AG-05", feature: "The Zen harness sends a finding the turn caused back to the agent, which fixes it before it ends", wp: "Agent V0",
    async run(ctx) {
      const { page, id, panel } = await pageWithButton(ctx);
      script([[
        { tools: [{ name: "update", input: { id: "$selection", props: { appearance: "flat", level: "tertiary" } } }] },
        { text: "Done." },
        { tools: [{ name: "update", input: { id: "$selection", props: { level: "primary" } } }] },
        { text: "Fixed: Flat takes Primary." },
      ]]);
      await ask(panel, "make it a flat tertiary button");
      await until(async () => /<Button level="primary" appearance="flat">Save<\/Button>|<Button appearance="flat" level="primary">Save<\/Button>/.test((await pageText(page, id)) ?? ""), { message: "the fixed Button on the page" });
      const reply = await lastReply(panel);
      if (!/Zen rules pass/.test(reply) || !/Fixed/.test(reply)) throw new Error(`the reply: ${reply}`);
      return "button/flat-level found after the turn, fixed by the agent, rules pass";
    },
  },
  {
    id: "AG-06", feature: "Without credentials the panel says what is missing and the prompt is off; the rest of the Studio works", wp: "Agent V0",
    async run(ctx) {
      if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return "skip: this machine has Claude credentials";
      const { page, panel } = await pageWithButton(ctx);
      delete process.env.ZEN_AGENT_SCRIPT;
      try {
        await panel.getByRole("button", { name: "Close Zen Agent" }).click();
        await page.keyboard.press("ControlOrMeta+j");
        await until(async () => (await panel.innerText().catch(() => "")).includes("Needs a Claude API key"), { message: "the missing key in the panel" });
        if (!(await panel.locator("textarea").isDisabled())) throw new Error("the prompt is still on");
        if (!/ANTHROPIC_API_KEY/.test(await panel.innerText())) throw new Error("no fix shown");
        return "Needs a Claude API key · ANTHROPIC_API_KEY or ant auth login; prompt off";
      } finally {
        process.env.ZEN_AGENT_SCRIPT = scriptFile;
      }
    },
  },
];
