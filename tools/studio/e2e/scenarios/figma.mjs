// Figma walk (plan docs/research/studio-figma-design-parity-2026-10-18.md §6): a Figma user's gestures on a page made in
// the Studio, each asserted as Figma answers them (selection, Layers, Inspector and menu words, the status line). Opt-in:
// npm run studio:e2e -- --only=figma. Each phase of the plan moves rows here from ❌ / 🟡 to ✅; F0 (words and keys) first.
import { newPageText } from "../../dialect.mjs";
import { codeOfItem, grow } from "../../dnd-engine.mjs";
import { inspectorRow, selectedSrc, showLeftTab, sleep, statusText, until } from "../lib/studio.mjs";
import { clickNamed, pageText, seededPage, selectedName } from "./builder.mjs";
import { pickOption, scaleStep } from "./inspector.mjs";

/** A phone page with its bars, a Button, a Card and a frame holding two shapes (the audit's walk page). */
const seedText = (title) => {
  let text = newPageText({ title, device: "phone", chrome: true });
  text = grow(text, "Stack", '<Button level="primary">Save</Button>');
  text = grow(text, "Stack", codeOfItem("card"));
  return grow(text, "Stack", '<Box width={358} height={200}>\n<Shape type="rectangle" position="absolute" insetLeft={20} insetTop={20} width={80} height={60} />\n<Shape type="ellipse" position="absolute" insetLeft={140} insetTop={40} width={60} height={60} />\n</Box>');
};

let made = null;
/** The walk page, made once per run and opened again for each row (the group's page returns to the host between rows). */
async function walkPage(ctx) {
  const { page } = await ctx.studio();
  if (!made) {
    const seeded = await seededPage(ctx, seedText, /type="ellipse"/);
    made = seeded.id;
  } else if (!page.url().includes(encodeURIComponent(`local:${made}`))) {
    await page.goto(`${ctx.server.url}/studio.html?page=${encodeURIComponent(`local:${made}`)}`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-studio-frame^="screen:"]').first().waitFor({ state: "attached", timeout: 20_000 });
    await sleep(500);
  }
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  return { page, id: made };
}

const pressedTool = (page) => page.locator('[role="toolbar"][aria-label="Tools"] [aria-pressed="true"]').first().getAttribute("aria-label").catch(() => null);

/** Selects the body Stack (the Button's parent): ⌘-click the Button, then Esc as Figma's Select parent. */
async function selectBody(page, id) {
  await clickNamed(page, id, "Button");
  await until(async () => (await selectedName(page)) === "Button", { message: "the Button selected" });
  await page.keyboard.press("Escape");
  await until(async () => (await selectedName(page)) !== "Button", { message: "its parent selected" });
}

/** The Figma keys Zen Studio has no feature for yet (edit/figmaNotYet.ts): each says so and nothing else happens. */
const NOT_YET = [
  ["ControlOrMeta+KeyR", "Rename"], ["ControlOrMeta+KeyG", "Group selection"], ["ControlOrMeta+Shift+KeyG", "Ungroup"],
  ["ControlOrMeta+Shift+KeyL", "Lock"], ["ControlOrMeta+KeyE", "Flatten"], ["ControlOrMeta+Shift+KeyC", "Copy as PNG"],
  ["Shift+KeyR", "Rulers"], ["Shift+KeyS", "Section"], ["KeyP", "Pen"], ["KeyK", "Scale"], ["KeyC", "Comment"],
  ["KeyI", "Pick color"], ["KeyN", "Next frame"], ["KeyS", "Slice"],
];

export const rows = [
  {
    id: "FW-01", feature: "⌘K opens Actions (Figma's command search), Esc closes it", wp: "F0 2026-10-18",
    async run(ctx) {
      const { page } = await walkPage(ctx);
      await page.keyboard.press("ControlOrMeta+KeyK");
      const actions = page.getByRole("dialog", { name: "Actions" });
      await actions.waitFor({ state: "visible", timeout: 3000 });
      await page.keyboard.press("Escape");
      await actions.waitFor({ state: "hidden", timeout: 3000 });
      return "⌘K → Actions → Esc";
    },
  },
  {
    id: "FW-02", feature: "⌘F finds a layer: the Layers tab with its search in focus", wp: "F0 2026-10-18",
    async run(ctx) {
      const { page } = await walkPage(ctx);
      await showLeftTab(page, "pages");
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyF");
      await until(async () => (await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))) === "Find a layer", { message: "Find a layer in focus" });
      await page.keyboard.press("Escape");
      return "⌘F → Layers › Find a layer";
    },
  },
  {
    id: "FW-03", feature: "⇧⌘K is Place image/video (the Image tool); V goes back to Move", wp: "F0 2026-10-18",
    async run(ctx) {
      const { page } = await walkPage(ctx);
      await page.keyboard.press("ControlOrMeta+Shift+KeyK");
      await until(async () => (await pressedTool(page)) === "Place image/video", { message: "Place image/video armed" });
      await page.keyboard.press("Escape");
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("KeyV");
      await until(async () => (await pressedTool(page)) === "Move", { message: "Move again" });
      return "⇧⌘K → Place image/video → V → Move";
    },
  },
  {
    id: "FW-04", feature: "Enter selects the children of the selected layer (Figma's Select children), ⇧Enter its parent", wp: "F0 2026-10-18",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await showLeftTab(page, "layers");
      await selectBody(page, id);
      const parent = await selectedName(page);
      await page.keyboard.press("Enter");
      await until(async () => (await selectedSrc(page)).length >= 3, { message: "the Button, the Card and the frame selected" });
      const count = (await selectedSrc(page)).length;
      await page.keyboard.press("Shift+Enter");
      await until(async () => (await selectedSrc(page)).length === 1 && (await selectedName(page)) === parent, { message: `${parent} selected again` });
      return `${parent} → Enter → ${count} layers → ⇧Enter → ${parent}`;
    },
  },
  {
    id: "FW-05", feature: "Figma keys Zen Studio lacks say so on the status line; the tab never reloads and the tool stays Move", wp: "F0 2026-10-18",
    async run(ctx) {
      const { page } = await walkPage(ctx);
      await page.evaluate(() => { window.__figmaWalk = true; });
      const said = [];
      for (const [key, name] of NOT_YET) {
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press(key);
        await until(async () => (await statusText(page)).includes(`${name} isn't in Zen Studio yet`), { timeout: 3000, message: `${key}: "${name} isn't in Zen Studio yet"` });
        said.push(name);
      }
      if (!(await page.evaluate(() => window.__figmaWalk === true))) throw new Error("the tab reloaded");
      const tool = await pressedTool(page);
      if (tool !== "Move") throw new Error(`the tool is ${tool}, not Move`);
      return `${said.length} keys: ${said.join(", ")}`;
    },
  },
  {
    id: "FW-06", feature: "⌥⌘↵ presents the page (its prototype from the first Screen); Esc leaves", wp: "F0 2026-10-18",
    async run(ctx) {
      const { page } = await walkPage(ctx);
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      const player = page.locator(".studio-player");
      await player.waitFor({ state: "visible", timeout: 10_000 });
      await page.keyboard.press("Escape");
      await player.waitFor({ state: "hidden", timeout: 5000 });
      return "⌥⌘↵ → Present → Esc";
    },
  },
  {
    id: "FW-07", feature: "⌘\\ hides the UI and shows it again; a reload brings the UI back", wp: "F0 2026-10-18",
    async run(ctx) {
      const { page } = await walkPage(ctx);
      const left = page.locator("#studio-left");
      await left.waitFor({ state: "visible", timeout: 5000 });
      await page.keyboard.press("ControlOrMeta+Backslash");
      await until(async () => !(await left.isVisible()), { message: "the side panels hidden" });
      await page.reload();
      await page.locator('[data-studio-frame^="screen:"]').first().waitFor({ state: "attached", timeout: 20_000 });
      await left.waitFor({ state: "visible", timeout: 10_000 });
      return "⌘\\ → hidden → reload → shown";
    },
  },
  {
    id: "FW-08", feature: "The layer menu reads Figma's items: Bring forward / Send backward, Group / Frame selection, Hide, Lock, Delete", wp: "F0 2026-10-18",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await clickNamed(page, id, "Button");
      const box = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Button"]`).first().boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
      const menu = page.getByRole("menu").last();
      await menu.waitFor({ state: "visible", timeout: 5000 });
      const items = (await menu.getByRole("menuitem").allInnerTexts()).map((item) => item.replace(/\s+/g, " ").trim());
      const lock = await menu.getByRole("menuitem", { name: /^Lock/ }).isDisabled().catch(() => null);
      await page.keyboard.press("Escape");
      const want = [/^Copy\b/, /^Duplicate\b/, /^Bring to front\b/, /^Bring forward\b/, /^Send backward\b/, /^Send to back\b/, /^Add auto layout\b/, /^Group selection\b/, /^Frame selection\b/, /^Hide\b/, /^Lock\b/, /^Delete\b/];
      const missing = want.filter((pattern) => !items.some((item) => pattern.test(item))).map(String);
      if (missing.length) throw new Error(`missing ${missing.join(", ")} (menu: ${items.join(" | ")})`);
      const retired = items.filter((item) => /^(?:Remove\b(?! auto layout)|Move (?:up|down|earlier|later)\b|Hide layer\b|Select first child\b)/.test(item));
      if (retired.length) throw new Error(`retired words: ${retired.join(", ")}`);
      if (lock !== true) throw new Error("Lock is on (Zen Studio has no Lock yet)");
      return `${items.length} items in Figma's words; Lock off ("Not in Zen Studio yet")`;
    },
  },
  {
    id: "FW-09", feature: "The toolbar of a page you made has Figma's tools (Move, Hand, Frame, Text, Place image/video), no Stack or Interact", wp: "F0 2026-10-18",
    async run(ctx) {
      const { page } = await walkPage(ctx);
      const names = await page.locator('[role="toolbar"][aria-label="Tools"] button').evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
      const missing = ["Move", "Hand", "Frame", "Text", "Place image/video"].filter((name) => !names.includes(name));
      if (missing.length) throw new Error(`missing ${missing.join(", ")} (tools: ${names.join(", ")})`);
      const extra = names.filter((name) => name === "Stack" || name === "Interact");
      if (extra.length) throw new Error(`not Figma's: ${extra.join(", ")}`);
      return names.filter(Boolean).join(", ");
    },
  },
  {
    id: "FW-10", feature: "An auto layout frame's Inspector reads Figma's sections (Auto layout, Layers); the undo line names Gap by its Figma token", wp: "F0 2026-10-18",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await selectBody(page, id);
      const headings = (await page.locator("#studio-right h3").allInnerTexts()).map((text) => text.trim());
      if (!headings.includes("Auto layout")) throw new Error(`no Auto layout section (${headings.join(", ")})`);
      const coded = headings.filter((text) => /^(?:Children|Props|Attributes|Code properties)$/.test(text));
      if (coded.length) throw new Error(`code words as sections: ${coded.join(", ")}`);
      // A step other than the one shown (a retry finds the first try's value), named in the status by its Figma name.
      const shown = (await inspectorRow(page, "gap").locator("button[aria-haspopup='listbox']").first().innerText()).trim();
      const [key, name] = shown === "XLarge" ? ["lg", "Large"] : ["xl", "XLarge"];
      const started = Date.now();
      await pickOption(page, "gap", scaleStep(key));
      await until(async () => new RegExp(`<Stack gap="${key}"`).test((await pageText(page, id)) ?? ""), { timeout: 20_000, message: `gap="${key}" written` }).catch(async (error) => { throw new Error(`${error.message} (status: ${(await statusText(page)).slice(0, 200)})`); });
      const took = Date.now() - started;
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => !new RegExp(`<Stack gap="${key}"`).test((await pageText(page, id)) ?? ""), { timeout: 10_000, message: "⌘Z takes the gap back" });
      // The undo line names the edit as Figma does: "Undid “Stack Gap → XLarge”", never the code's "gap → xl".
      await until(async () => new RegExp(`Undid “[^”]*Gap → ${name}”`).test(await statusText(page)), { timeout: 5000, message: `the undo line says "Gap → ${name}"` }).catch(async (error) => { throw new Error(`${error.message} (status: ${(await statusText(page)).slice(0, 200)})`); });
      return `sections: ${headings.join(", ")} · Gap → ${name} (${took} ms) · ⌘Z: "${(await statusText(page)).split(" | ")[0]}"`;
    },
  },
];
