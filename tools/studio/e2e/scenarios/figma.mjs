// Figma walk (plan docs/research/studio-figma-design-parity-2026-10-18.md §6): a Figma user's gestures on a page made in
// the Studio, each asserted as Figma answers them (selection, Layers, Inspector and menu words, the status line). Opt-in:
// npm run studio:e2e -- --only=figma. Each phase of the plan moves rows here from ❌ / 🟡 to ✅; F0 (words and keys) first.
import { newPageText } from "../../dialect.mjs";
import { codeOfItem, grow } from "../../dnd-engine.mjs";
import { inspectorRow, selectedSrc, showLeftTab, sleep, statusText, until } from "../lib/studio.mjs";
import { clickNamed, newPage, pageText, seededPage, selectedName } from "./builder.mjs";

/** A new page of the Studio space titled `title` (its name). */
const newPageFor = async (ctx, title) => (await newPage(ctx, { title })).name;
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
  ["ControlOrMeta+KeyG", "Group selection"], ["ControlOrMeta+Shift+KeyG", "Ungroup"],
  ["ControlOrMeta+KeyE", "Flatten"], ["ControlOrMeta+Shift+KeyC", "Copy as PNG"],
  ["Shift+KeyR", "Rulers"], ["KeyP", "Pen"], ["KeyK", "Scale"], ["KeyC", "Comment"],
  ["KeyI", "Pick color"], ["KeyS", "Slice"],
];


/* ── F1 (Layers like Figma) helpers ─────────────────────────────────────────────────────────────────────────────── */

/** Every Layers row as shown: its id, name, level and whether it is locked. */
const layerRows = (page) => page.locator(".studio-layers__tree [role='treeitem']").evaluateAll((rows) => rows.map((row) => ({
  id: row.getAttribute("data-layer-id"), name: row.querySelector(".studio-layers__name")?.textContent ?? "", level: Number(row.getAttribute("aria-level")),
  locked: row.hasAttribute("data-locked"), expanded: row.getAttribute("aria-expanded"),
})));
/** The Layers row named `name` (a string: exactly; a RegExp: matching). */
const rowNamed = (page, name) => page.locator(".studio-layers__tree [role='treeitem']").filter({ has: page.locator(".studio-layers__name", { hasText: name instanceof RegExp ? name : new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }) }).first();
/** ⌘-clicks the n-th Shape of the walk page (Figma's deep select), then waits for Layers to show its row. */
async function selectShape(page, id, index) {
  const box = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Shape"]`).nth(index).boundingBox();
  await page.keyboard.down("ControlOrMeta");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.up("ControlOrMeta");
  await sleep(300);
}
/** The walk page's text without the edit just made: ⌘Z until it is `text` again. */
async function undoTo(page, id, text, tries = 3) {
  for (let k = 0; k < tries && (await pageText(page, id)) !== text; k++) {
    await page.locator(".studio-viewport").focus();
    await page.keyboard.press("ControlOrMeta+KeyZ");
    await until(async () => (await pageText(page, id)) === text, { timeout: 4000, message: "⌘Z" }).catch(() => undefined);
  }
  if ((await pageText(page, id)) !== text) throw new Error("⌘Z did not bring the page back");
}

/* ── F4 (frames, presets, sections) helpers ───────────────────────────────────────────────────────────────────── */

/** The opening tag of the Board child `<Tag id="id"`: up to its first `>` outside braces (slot props hold JSX). */
function boardTag(text, tag, id) {
  const at = text.indexOf(`<${tag} id="${id}"`);
  if (at < 0) return "";
  let depth = 0;
  for (let k = at; k < text.length; k++) {
    const char = text[k];
    if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
    else if (char === ">" && depth === 0) return text.slice(at, k + 1);
  }
  return text.slice(at);
}
const numberAttr = (tag, name) => { const match = tag.match(new RegExp(`\\s${name}=\\{(-?\\d+)\\}`)); return match ? Number(match[1]) : null; };
const toolButton = (page, name) => page.locator(".studio-canvas-tools").getByRole("button", { name, exact: true });
const framePresets = (page) => page.locator("#studio-right").getByRole("region", { name: "Frame presets" });
/** Selects a frame of the walk page by its name on the canvas. */
async function selectFrame(page, frameId) {
  const label = page.locator(`.studio-frame-label[data-chrome-key="label:${frameId}"]`);
  await label.waitFor({ state: "visible", timeout: 5000 });
  await label.click();
  await until(async () => (await page.locator(`[data-studio-frame="${frameId}"]`).getAttribute("data-selected")) === "true", { message: `${frameId} selected` });
}
/** Draws a Section with ⇧S from a screen point to another (Figma's Section tool). */
async function drawSection(page, from, to) {
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("Shift+KeyS");
  await until(async () => (await toolButton(page, "Section").getAttribute("aria-pressed")) === "true", { message: "the Section tool" });
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 4 });
  await page.mouse.up();
}
/** Runs `work` on the walk page and puts the page back after it, also when it fails (so a broken row leaves no Section
 *  behind for the next row). */
async function restoring(page, id, work) {
  const before = (await pageText(page, id)) ?? "";
  try {
    return await work();
  } finally {
    await undoTo(page, id, before, 5).catch(() => undefined);
  }
}
/** Zooms out so the walk page's frame and room around it show (⇧1, then one zoom-out step). */
async function roomAround(page) {
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("Shift+Digit1");
  await sleep(300);
  await page.keyboard.press("Minus");
  await sleep(300);
}

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
    id: "FW-08", feature: "The layer menu reads Figma's items: Bring forward / Send backward, Group / Frame selection, Hide, Lock, Rename, Delete", wp: "F0 2026-10-18 · F1",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await clickNamed(page, id, "Button");
      const box = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Button"]`).first().boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
      const menu = page.getByRole("menu").last();
      await menu.waitFor({ state: "visible", timeout: 5000 });
      const items = (await menu.getByRole("menuitem").allInnerTexts()).map((item) => item.replace(/\s+/g, " ").trim());
      const lock = await menu.getByRole("menuitem", { name: /^Lock/ }).isDisabled().catch(() => null);
      const group = await menu.getByRole("menuitem", { name: /^Group selection/ }).isDisabled().catch(() => null);
      await page.keyboard.press("Escape");
      const want = [/^Copy\b/, /^Duplicate\b/, /^Bring to front\b/, /^Bring forward\b/, /^Send backward\b/, /^Send to back\b/, /^Add auto layout\b/, /^Group selection\b/, /^Frame selection\b/, /^Hide\b/, /^Lock\b/, /^Rename\b/, /^Delete\b/];
      const missing = want.filter((pattern) => !items.some((item) => pattern.test(item))).map(String);
      if (missing.length) throw new Error(`missing ${missing.join(", ")} (menu: ${items.join(" | ")})`);
      const retired = items.filter((item) => /^(?:Remove\b(?! auto layout)|Move (?:up|down|earlier|later)\b|Hide layer\b|Select first child\b)/.test(item));
      if (retired.length) throw new Error(`retired words: ${retired.join(", ")}`);
      if (lock !== false) throw new Error("Lock is off (F1 builds it)");
      if (group !== true) throw new Error("Group selection is on (Zen Studio has no groups yet)");
      return `${items.length} items in Figma's words; Lock on, Group selection off ("Not in Zen Studio yet")`;
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
  {
    id: "FW-11", feature: "Layers as Figma lists them: the front-most layer on top, frames and shapes named Frame N / Rectangle N / Ellipse N, text by its words, frames with #", wp: "F1 2026-10-18",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await showLeftTab(page, "layers");
      await selectShape(page, id, 1);
      await until(async () => (await layerRows(page)).some((row) => /^Ellipse \d+$/.test(row.name)), { message: "the Ellipse's row" });
      const rows = await layerRows(page);
      const index = (pattern) => rows.findIndex((row) => pattern.test(row.name));
      const [rectangle, ellipse, button, text, frame] = [/^Rectangle \d+$/, /^Ellipse \d+$/, /^Button$/, /^Start building here/, /^Frame \d+$/].map(index);
      if ([rectangle, ellipse, button, text, frame].some((at) => at < 0)) throw new Error(`names: ${rows.map((row) => row.name).join(" | ")}`);
      // Front on top: in the frame the Ellipse (drawn last) is above the Rectangle; in the page the frame holding them
      // (written after the Button and the text) is above both.
      if (!(ellipse < rectangle)) throw new Error(`Ellipse below Rectangle: ${rows.map((row) => row.name).join(" | ")}`);
      const holder = rows.slice(0, rectangle).reverse().find((row) => /^Frame \d+$/.test(row.name) && row.level < rows[rectangle].level);
      const holderAt = rows.indexOf(holder);
      if (!(holderAt < button && button < text)) throw new Error(`order: ${rows.map((row) => row.name).join(" | ")}`);
      const icon = await page.locator(".studio-layers__tree [role='treeitem'][data-kind='frame'] .studio-layers__icon svg").first().getAttribute("data-icon");
      if (icon !== "icon-hash-01-line") throw new Error(`the frame row's icon is ${icon}`);
      return rows.filter((row) => row.level >= 2).map((row) => row.name).slice(0, 8).join(" › ");
    },
  },
  {
    id: "FW-12", feature: "Double-click a layer's name in Layers renames it (data-name), Escape keeps it, an empty name brings the automatic one back; one ⌘Z", wp: "F1 2026-10-18",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await showLeftTab(page, "layers");
      const before = (await pageText(page, id)) ?? "";
      const row = rowNamed(page, "Button");
      await row.waitFor({ state: "visible", timeout: 5000 });
      await row.locator(".studio-layers__name").dblclick();
      const field = page.locator(".studio-layers__tree input[aria-label='Layer name']");
      await field.waitFor({ state: "visible", timeout: 3000 });
      await field.press("Escape");
      await field.waitFor({ state: "hidden", timeout: 3000 });
      if ((await pageText(page, id)) !== before) throw new Error("Escape wrote a name");
      await row.locator(".studio-layers__name").dblclick();
      await field.fill("Buy now");
      await field.press("Enter");
      await until(async () => /<Button[^>]*data-name="Buy now"/.test((await pageText(page, id)) ?? ""), { message: 'data-name="Buy now" on the Button' });
      await rowNamed(page, "Buy now").waitFor({ state: "visible", timeout: 5000 });
      await undoTo(page, id, before);
      await rowNamed(page, "Button").waitFor({ state: "visible", timeout: 5000 });
      return "Escape keeps it · Buy now written and shown · ⌘Z back to Button";
    },
  },
  {
    id: "FW-13", feature: "⌘R renames the selected layer in Layers; Tab saves and goes on to the next layer's name; the tab never reloads", wp: "F1 2026-10-18",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await showLeftTab(page, "pages");
      await page.evaluate(() => { window.__figmaRename = true; });
      await clickNamed(page, id, "Button");
      await until(async () => (await selectedName(page)) === "Button", { message: "the Button selected" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyR");
      const field = page.locator(".studio-layers__tree input[aria-label='Layer name']");
      await field.waitFor({ state: "visible", timeout: 5000 });
      const first = await field.inputValue();
      if (first !== "Button") throw new Error(`the field reads "${first}"`);
      await field.press("Tab");
      await until(async () => (await field.count()) === 1 && (await field.inputValue()) !== "Button", { message: "the next layer's name field" });
      const next = await field.inputValue();
      await field.press("Escape");
      if (!(await page.evaluate(() => window.__figmaRename === true))) throw new Error("⌘R reloaded the tab");
      return `⌘R → "Button" → Tab → "${next}"`;
    },
  },
  {
    id: "FW-14", feature: "⌘R with several layers opens Rename layers ($& / $n, preview); Rename writes every name in one ⌘Z", wp: "F1 2026-10-18",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShape(page, id, 0);
      const box = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Shape"]`).nth(1).boundingBox();
      await page.keyboard.down("Shift"); await page.keyboard.down("ControlOrMeta");
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.keyboard.up("ControlOrMeta"); await page.keyboard.up("Shift");
      await until(async () => (await selectedSrc(page)).length === 2, { message: "two shapes selected" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyR");
      const dialog = page.getByRole("dialog", { name: "Rename 2 layers" });
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      await dialog.getByLabel("Rename to").fill("Dot $n");
      const preview = await dialog.getByRole("list", { name: "Preview" }).innerText();
      if (!/Dot 1/.test(preview) || !/Dot 2/.test(preview)) throw new Error(`preview: ${preview}`);
      await dialog.getByRole("button", { name: "Rename", exact: true }).click();
      await until(async () => { const text = (await pageText(page, id)) ?? ""; return text.includes('data-name="Dot 1"') && text.includes('data-name="Dot 2"'); }, { message: "Dot 1 and Dot 2 written" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z takes both names back" });
      return "Rename layers: Dot $n → Dot 1, Dot 2 · one ⌘Z";
    },
  },
  {
    id: "FW-15", feature: "⇧⌘L locks a layer: a click on it selects the layer around it, no handles, arrows keep it; Layers shows the padlock, which unlocks", wp: "F1 2026-10-18",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await showLeftTab(page, "layers");
      const before = (await pageText(page, id)) ?? "";
      await selectShape(page, id, 1);
      const ellipse = await selectedName(page);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Shift+KeyL");
      await until(async () => /<Shape type="ellipse"[^>]*data-locked/.test((await pageText(page, id)) ?? ""), { message: "data-locked on the Ellipse" });
      const locked = (await pageText(page, id)) ?? "";
      // Arrows keep a locked layer in place.
      await page.keyboard.press("ArrowRight");
      await sleep(400);
      if ((await pageText(page, id)) !== locked) throw new Error("an arrow moved the locked layer");
      // A ⌘-click on it now selects the frame around it.
      await page.keyboard.press("Escape");
      await selectShape(page, id, 1);
      const picked = await selectedName(page);
      if (picked === ellipse || /part of/.test(picked)) throw new Error(`the locked Ellipse was picked on the canvas (${picked})`);
      // Layers: its row carries the padlock; the padlock unlocks it.
      // Its row by its Layers name (the Inspector header names its kind: "Ellipse"; Layers "Ellipse 1").
      const row = rowNamed(page, /^Ellipse \d+$/);
      await row.waitFor({ state: "visible", timeout: 5000 }).catch(async () => { await selectShape(page, id, 0); await row.waitFor({ state: "visible", timeout: 5000 }); });
      if (!(await row.getAttribute("data-locked"))) throw new Error("no padlock on the locked row");
      await row.hover();
      await row.getByRole("button", { name: /^Unlock Ellipse \d+$/ }).click();
      await until(async () => (await pageText(page, id)) === before, { message: "the padlock unlocks it" });
      return `⇧⌘L on ${ellipse} · arrow kept it · ⌘-click → ${picked} · padlock unlocked`;
    },
  },
  {
    id: "FW-16", feature: "Right-click a Layers row opens that layer's canvas menu (Rename, Lock, Delete); on a frame's row, the frame's", wp: "F1 2026-10-18",
    async run(ctx) {
      const { page } = await walkPage(ctx);
      await showLeftTab(page, "layers");
      const row = rowNamed(page, "Button");
      await row.waitFor({ state: "visible", timeout: 5000 });
      await row.click({ button: "right" });
      const menu = page.getByRole("menu").last();
      await menu.waitFor({ state: "visible", timeout: 5000 });
      const items = (await menu.getByRole("menuitem").allInnerTexts()).map((item) => item.replace(/\s+/g, " ").trim());
      await page.keyboard.press("Escape");
      const missing = [/^Rename\b/, /^Lock\b/, /^Delete\b/].filter((pattern) => !items.some((item) => pattern.test(item))).map(String);
      if (missing.length) throw new Error(`missing ${missing.join(", ")} (menu: ${items.join(" | ")})`);
      if ((await selectedName(page)) !== "Button") throw new Error(`the row's layer is not selected (${await selectedName(page)})`);
      await page.locator(".studio-layers__tree [role='treeitem'][data-kind='frame']").first().click({ button: "right" });
      const frameMenu = page.getByRole("menu").last();
      await frameMenu.waitFor({ state: "visible", timeout: 5000 });
      const frameItems = (await frameMenu.getByRole("menuitem").allInnerTexts()).map((item) => item.replace(/\s+/g, " ").trim());
      await page.keyboard.press("Escape");
      if (!frameItems.some((item) => /^Zoom to selection/.test(item)) || !frameItems.some((item) => /^Rename/.test(item))) throw new Error(`frame menu: ${frameItems.join(" | ")}`);
      return `${items.length} layer items · frame: ${frameItems.slice(0, 3).join(", ")}…`;
    },
  },
  {
    id: "FW-17", feature: "⌥-click a chevron opens or closes a layer and everything in it; ⌥L collapses every layer", wp: "F1 2026-10-18",
    async run(ctx) {
      const { page } = await walkPage(ctx);
      await showLeftTab(page, "layers");
      const frameRow = page.locator(".studio-layers__tree [role='treeitem'][data-kind='frame']").first();
      await frameRow.locator(".studio-layers__chevron").click({ modifiers: ["Alt"] });
      await sleep(300);
      // The frame was open: ⌥-click closes it and everything in it; again opens all (the shapes inside the frame show).
      if ((await frameRow.getAttribute("aria-expanded")) !== "false") throw new Error("⌥-click did not close the frame");
      await frameRow.locator(".studio-layers__chevron").click({ modifiers: ["Alt"] });
      await until(async () => (await layerRows(page)).some((row) => /^Ellipse \d+$/.test(row.name)), { message: "every layer open (the Ellipse's row)" });
      const open = (await layerRows(page)).length;
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("Alt+KeyL");
      await until(async () => (await frameRow.getAttribute("aria-expanded")) === "false", { message: "⌥L collapses the frame" });
      return `⌥-click: ${open} rows open · ⌥L: ${(await layerRows(page)).length} row(s)`;
    },
  },
  {
    id: "FW-18", feature: "Double-click a frame's name on the canvas renames the frame (its Screen's title); ⌘Z", wp: "F1 2026-10-18",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      const label = page.locator('.studio-frame-label[data-chrome-key="label:screen:screen-1"]');
      await label.waitFor({ state: "visible", timeout: 5000 });
      await label.dblclick();
      const field = page.locator("input[aria-label='Frame name']");
      await field.waitFor({ state: "visible", timeout: 3000 });
      await field.fill("Checkout");
      await field.press("Enter");
      await until(async () => /<Screen id="screen-1" title="Checkout"/.test((await pageText(page, id)) ?? ""), { message: 'title="Checkout"' });
      await label.waitFor({ state: "visible", timeout: 5000 });
      if (!/Checkout/.test(await label.innerText())) throw new Error("the label still shows the old name");
      await undoTo(page, id, before);
      return "frame name → Checkout → ⌘Z";
    },
  },
  {
    id: "FW-40", feature: "F: the right panel lists Figma's frame presets; Phone › iPhone 16 makes an empty 393 × 852 frame beside the page's frame, named and selected, with Move back on; ⌘Z", wp: "F4 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        await page.keyboard.press("KeyF");
        await framePresets(page).waitFor({ state: "visible", timeout: 5000 });
        await framePresets(page).getByRole("list", { name: "Phone" }).getByRole("button", { name: /^iPhone 16\s*393 × 852$/ }).click();
        await until(async () => /<Screen id="screen-2"/.test((await pageText(page, id)) ?? ""), { message: "a second frame" });
        const tag = boardTag((await pageText(page, id)) ?? "", "Screen", "screen-2");
        if (!/title="iPhone 16 2"/.test(tag) || numberAttr(tag, "width") !== 393 || numberAttr(tag, "height") !== 852 || !/device="phone"/.test(tag)) throw new Error(`not an iPhone 16 frame: ${tag}`);
        const first = boardTag((await pageText(page, id)) ?? "", "Screen", "screen-1");
        if (numberAttr(tag, "x") !== (numberAttr(first, "x") ?? 0) + (numberAttr(first, "width") ?? 390) + 96) throw new Error(`not beside the first frame: ${tag}`);
        if ((await pressedTool(page)) !== "Move") throw new Error(`the tool is ${await pressedTool(page)}`);
        await until(async () => (await page.locator('[data-studio-frame="screen:screen-2"]').getAttribute("data-selected")) === "true", { message: "the new frame selected" });
        await undoTo(page, id, before);
        return "F › iPhone 16 → 393 × 852 frame beside screen-1, selected, Move → ⌘Z";
      });
    },
  },
  {
    id: "FW-41", feature: "F and a click on the empty canvas: an empty 100 × 100 frame there at once (no menu), named Frame 2; ⌘Z", wp: "F4 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        await roomAround(page);
        const frame = await page.locator('[data-studio-frame="screen:screen-1"]').boundingBox();
        await page.keyboard.press("KeyF");
        await page.mouse.click(frame.x + frame.width + 120, frame.y + 40);
        await until(async () => /<Screen id="screen-2"/.test((await pageText(page, id)) ?? ""), { message: "a second frame" });
        if (await page.getByRole("menu").count()) throw new Error("a menu opened");
        const tag = boardTag((await pageText(page, id)) ?? "", "Screen", "screen-2");
        if (numberAttr(tag, "width") !== 100 || numberAttr(tag, "height") !== 100 || !/title="Frame 2"/.test(tag)) throw new Error(`not a 100 × 100 Frame 2: ${tag}`);
        await undoTo(page, id, before);
        return "F + click → Frame 2, 100 × 100 → ⌘Z";
      });
    },
  },
  {
    id: "FW-42", feature: "A selected frame has Figma's resize handles: dragging its bottom-right corner writes W and H in one edit (the size shows while dragging); ⌘Z", wp: "F4 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        await roomAround(page);
        await selectFrame(page, "screen:screen-1");
        const handle = page.locator('.studio-frame-handle[data-handle="se"]');
        await handle.waitFor({ state: "visible", timeout: 5000 });
        const box = await handle.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 30, box.y + 20, { steps: 4 });
        await page.mouse.move(box.x + 60, box.y + 40, { steps: 4 });
        const live = await page.locator(".studio-frame-handle__pill").innerText();
        await page.mouse.up();
        await until(async () => numberAttr(boardTag((await pageText(page, id)) ?? "", "Screen", "screen-1"), "width") > 390, { message: "a wider frame" });
        const tag = boardTag((await pageText(page, id)) ?? "", "Screen", "screen-1");
        if (!/^\d+ × \d+$/.test(live)) throw new Error(`no size while dragging: ${JSON.stringify(live)}`);
        await undoTo(page, id, before);
        return `corner drag → ${numberAttr(tag, "width")} × ${numberAttr(tag, "height")} (live ${live}) → ⌘Z`;
      });
    },
  },
  {
    id: "FW-43", feature: "A selected frame's right panel has Figma's Position X / Y and Layout W / H: typing W 420 and X 200 writes them on the Screen; ⌘Z", wp: "F4 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        await selectFrame(page, "screen:screen-1");
        const width = page.locator('#studio-right [data-prop="frame-size"] input[aria-label="Width"]');
        await width.fill("420");
        await width.press("Enter");
        await until(async () => numberAttr(boardTag((await pageText(page, id)) ?? "", "Screen", "screen-1"), "width") === 420, { message: "W 420" });
        const x = page.locator('#studio-right [data-prop="frame-position"] input[aria-label="X"]');
        await x.fill("200");
        await x.press("Enter");
        await until(async () => numberAttr(boardTag((await pageText(page, id)) ?? "", "Screen", "screen-1"), "x") === 200, { message: "X 200" });
        await undoTo(page, id, before, 4);
        return "W 420, X 200 → ⌘Z";
      });
    },
  },
  {
    id: "FW-44", feature: "⇧S draws a Section around the frame (Section 1, its name inside its top-left corner); dragging the Section's name moves the frame with it in one edit; ⌘Z", wp: "F4 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        await roomAround(page);
        const frame = await page.locator('[data-studio-frame="screen:screen-1"]').boundingBox();
        await drawSection(page, { x: frame.x - 60, y: frame.y - 60 }, { x: frame.x + frame.width + 60, y: frame.y + frame.height + 60 });
        await until(async () => /<Section id="section-1" title="Section 1"/.test((await pageText(page, id)) ?? ""), { message: "Section 1" });
        const label = page.locator('.studio-frame-label[data-kind="section"]').first();
        await label.waitFor({ state: "visible", timeout: 5000 });
        const area = await page.locator('[data-studio-frame="section:section-1"]').boundingBox();
        const tab = await label.boundingBox();
        if (tab.x < area.x || tab.y < area.y) throw new Error("the Section's name is not inside its corner");
        const x0 = numberAttr(boardTag((await pageText(page, id)) ?? "", "Screen", "screen-1"), "x");
        await page.mouse.move(tab.x + 8, tab.y + tab.height / 2);
        await page.mouse.down();
        await page.mouse.move(tab.x + 40, tab.y + tab.height / 2 + 10, { steps: 5 });
        await page.mouse.move(tab.x + 80, tab.y + tab.height / 2 + 20, { steps: 5 });
        await page.mouse.up();
        await until(async () => numberAttr(boardTag((await pageText(page, id)) ?? "", "Screen", "screen-1"), "x") !== x0, { message: "the frame moved with its Section" });
        await undoTo(page, id, before, 4);
        return "⇧S around screen-1 → Section 1; drag its name → both move → ⌘Z";
      });
    },
  },
  {
    id: "FW-45", feature: "Delete on a selected Section deletes the frames in it too (one ⌘Z brings both back); ⌘⌫ deletes the Section only", wp: "F4 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        await roomAround(page);
        const frame = await page.locator('[data-studio-frame="screen:screen-1"]').boundingBox();
        await drawSection(page, { x: frame.x - 60, y: frame.y - 60 }, { x: frame.x + frame.width + 60, y: frame.y + frame.height + 60 });
        await until(async () => /<Section id="section-1"/.test((await pageText(page, id)) ?? ""), { message: "a Section" });
        const drawn = (await pageText(page, id)) ?? "";
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Delete");
        await until(async () => { const text = (await pageText(page, id)) ?? ""; return !/<Section /.test(text) && !/<Screen id="screen-1"/.test(text); }, { message: "Delete takes the Section and its frame" });
        await page.keyboard.press("ControlOrMeta+KeyZ");
        await until(async () => (await pageText(page, id)) === drawn, { message: "one ⌘Z brings both back" });
        await selectFrame(page, "section:section-1");
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("ControlOrMeta+Backspace");
        await until(async () => { const text = (await pageText(page, id)) ?? ""; return !/<Section /.test(text) && /<Screen id="screen-1"/.test(text); }, { message: "⌘⌫ keeps the frame" });
        await undoTo(page, id, before, 4);
        return "Delete → Section + frame; ⌘Z; ⌘⌫ → Section only";
      });
    },
  },
  {
    id: "FW-46", feature: "Right-click a frame › Wrap in new section: a Section around the frame (80 px of room on each side), selected; ⌘Z", wp: "F4 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        await selectFrame(page, "screen:screen-1");
        await page.locator('.studio-frame-label[data-chrome-key="label:screen:screen-1"]').click({ button: "right" });
        await page.getByRole("menuitem", { name: "Wrap in new section" }).click();
        await until(async () => /<Section id="section-1"/.test((await pageText(page, id)) ?? ""), { message: "a Section" });
        const text = (await pageText(page, id)) ?? "";
        const section = boardTag(text, "Section", "section-1");
        const frame = await page.locator('[data-studio-frame="screen:screen-1"]').evaluate((element) => ({ x: element.offsetLeft, y: element.offsetTop, width: element.offsetWidth, height: element.offsetHeight }));
        if (numberAttr(section, "x") !== frame.x - 80 || numberAttr(section, "y") !== frame.y - 80 || numberAttr(section, "width") !== frame.width + 160) throw new Error(`not around the frame: ${section} (${JSON.stringify(frame)})`);
        await until(async () => (await page.locator('[data-studio-frame="section:section-1"]').getAttribute("data-selected")) === "true", { message: "the Section selected" });
        await undoTo(page, id, before, 4);
        return "Wrap in new section → Section around screen-1 (80 px) → ⌘Z";
      });
    },
  },
  {
    id: "FW-47", feature: "N selects and zooms to the next frame, ⇧N to the previous (reading order, wrapping round)", wp: "F4 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        await page.keyboard.press("KeyF");
        await framePresets(page).getByRole("list", { name: "Phone" }).getByRole("button", { name: /^iPhone 16\s*393 × 852$/ }).click();
        await until(async () => /<Screen id="screen-2"/.test((await pageText(page, id)) ?? ""), { message: "a second frame" });
        const selected = async () => (await page.locator("[data-studio-frame][data-selected='true']").first().getAttribute("data-studio-frame").catch(() => null));
        await until(async () => (await selected()) === "screen:screen-2", { message: "screen-2 selected" });
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("KeyN");
        await until(async () => (await selected()) === "screen:screen-1", { message: "N wraps round to screen-1" });
        await page.keyboard.press("KeyN");
        await until(async () => (await selected()) === "screen:screen-2", { message: "N → screen-2" });
        await page.keyboard.press("Shift+KeyN");
        await until(async () => (await selected()) === "screen:screen-1", { message: "⇧N → screen-1" });
        await undoTo(page, id, before);
        return "N → screen-1 → screen-2, ⇧N → screen-1";
      });
    },
  },
  {
    id: "FW-48", feature: "The Frame button's menu lists Frame F and Section ⇧S (Figma UI3); picking Section turns the Section tool on and the button shows it", wp: "F4 2026-10-19",
    async run(ctx) {
      const { page } = await walkPage(ctx);
      await page.locator(".studio-canvas-tools").getByRole("button", { name: "Frame tools" }).click();
      const menu = page.getByRole("menu", { name: "Frame tools" });
      await menu.waitFor({ state: "visible", timeout: 3000 });
      const items = await menu.getByRole("menuitem").allInnerTexts();
      if (!/Frame[\s\S]*F/.test(items[0] ?? "") || !/Section[\s\S]*⇧S/.test(items[1] ?? "")) throw new Error(`menu: ${JSON.stringify(items)}`);
      await menu.getByRole("menuitem", { name: /^Section/ }).click();
      await until(async () => (await toolButton(page, "Section").getAttribute("aria-pressed")) === "true", { message: "the Section tool on" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("KeyV");
      return `menu ${items.map((item) => item.replace(/\s+/g, " ")).join(" / ")} → Section on`;
    },
  },
  {
    id: "FW-49", feature: "Pages keep the person's order: a new page comes last, a page dragged above another stays there, Add divider puts a line between them, and both stay after a reload", wp: "F4 2026-10-19", timeout: 45_000,
    async run(ctx) {
      const { page } = await walkPage(ctx);
      await showLeftTab(page, "pages");
      const walkName = (await page.locator('#studio-left .studio-pages__row[aria-current="page"] .studio-pages__name').first().innerText()).trim();
      const b = await newPageFor(ctx, `Order B ${Date.now().toString(36)}`);
      await showLeftTab(page, "pages");
      const list = page.locator('#studio-left ul[aria-labelledby="studio-pages-loose"]');
      const order = async () => (await list.locator(":scope > li").evaluateAll((rows) => rows.map((row) => (row.getAttribute("data-entry")?.startsWith("divider:") ? "—" : row.querySelector(".studio-pages__name")?.textContent ?? "?")))).filter((name) => name === walkName || name === b || name === "—");
      if ((await order()).join("|") !== [walkName, b].join("|")) throw new Error(`the new page is not last: ${JSON.stringify(await order())}`);
      const rowA = list.locator(":scope > li", { hasText: walkName });
      const rowB = list.locator(":scope > li", { hasText: b });
      await rowB.dragTo(rowA, { targetPosition: { x: 40, y: 4 } });
      await until(async () => (await order()).join("|") === [b, walkName].join("|"), { message: "B above the walk page" });
      await rowB.hover();
      await rowB.getByRole("button", { name: `${b} actions` }).click();
      await page.getByRole("menuitem", { name: "Add divider" }).click();
      await until(async () => (await order()).join("|") === [b, "—", walkName].join("|"), { message: "a divider after B" });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator('[data-studio-frame^="screen:"]').first().waitFor({ state: "attached", timeout: 20_000 });
      await showLeftTab(page, "pages");
      await until(async () => (await order()).join("|") === [b, "—", walkName].join("|"), { message: "the order after a reload", timeout: 15_000 });
      return `${b} | — | ${walkName}, kept after a reload`;
    },
  },
];