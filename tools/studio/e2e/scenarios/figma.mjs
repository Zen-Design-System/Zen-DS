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
  ["ControlOrMeta+KeyG", "Group selection"], ["ControlOrMeta+Shift+KeyG", "Ungroup"],
  ["ControlOrMeta+KeyE", "Flatten"], ["ControlOrMeta+Shift+KeyC", "Copy as PNG"],
  ["Shift+KeyR", "Rulers"], ["Shift+KeyS", "Section"], ["KeyP", "Pen"], ["KeyK", "Scale"], ["KeyC", "Comment"],
  ["KeyI", "Pick color"], ["KeyN", "Next frame"], ["KeyS", "Slice"],
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

/** The walk frame (the Box that holds the two shapes): ⌘-click its Rectangle, then Esc as Figma's Select parent. */
async function selectFrame(page, id) {
  await clickNamed(page, id, "Shape");
  await until(async () => /^(Rectangle|Shape)/.test(await selectedName(page)), { message: "the Rectangle selected" });
  await page.keyboard.press("Escape");
  await until(async () => /^(Frame|Box)/.test(await selectedName(page)), { message: "its frame selected" });
}
const right = (page) => page.locator("#studio-right");
/** Clicks an Inspector button by its accessible name. */
const press = (page, name) => right(page).getByRole("button", { name, exact: true }).first().click();
/** Types a value into an Inspector number field (Figma's scrub fields) and commits it. */
async function typeNumber(page, name, value) {
  const field = right(page).getByRole("spinbutton", { name, exact: true }).first();
  await field.click();
  await field.fill(String(value));
  await field.press("Enter");
}
/** Waits until the page's code matches (or, with `gone`, no longer matches) `pattern`. */
const written = (page, id, pattern, message, gone = false) => until(async () => pattern.test((await pageText(page, id)) ?? "") !== gone, { timeout: 15_000, message });
/** With ZEN_E2E_SHOTS=<dir>, the right panel as a PNG there (proof for a review; nothing is written otherwise). */
async function shot(page, name) {
  const dir = process.env.ZEN_E2E_SHOTS;
  if (!dir) return;
  await right(page).screenshot({ path: `${dir}/${name}.png` }).catch(() => {});
}
/** Section titles of the Design tab, in order. */
const sections = async (page) => (await right(page).locator("h3").allInnerTexts()).map((text) => text.trim());

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
  // F5 · right panel parity (docs/research/studio-f5-right-panel-spec-2026-10-19.md).
  {
    id: "FW-50", feature: "An auto layout frame's Design tab is in Figma's order: Position, Auto layout, Appearance, Fill, Stroke, Effects", wp: "F5 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await selectBody(page, id);
      const headings = await sections(page);
      const want = ["Position", "Auto layout", "Appearance", "Fill", "Stroke", "Effects"];
      const at = want.map((title) => headings.indexOf(title));
      if (at.some((index) => index < 0) || at.some((index, n) => n && index < at[n - 1])) throw new Error(`sections ${headings.join(", ")}`);
      await shot(page, "fw-50-auto-layout-frame");
      return headings.join(", ");
    },
  },
  {
    id: "FW-51", feature: "Fill + on an auto layout frame writes Surface on the Stack itself (one layer, no Box around it); − removes it", wp: "F5 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await selectBody(page, id);
      await press(page, "Add fill");
      await written(page, id, /<Stack\b[^>]*surface="surface"/, "surface on the Stack");
      if (/<Box surface=/.test((await pageText(page, id)) ?? "")) throw new Error("a Box around the Stack");
      await press(page, "Remove fill");
      await written(page, id, /<Stack\b[^>]*surface=/, "the fill removed", true);
      return "+ → <Stack surface=\"surface\"> → − → no fill";
    },
  },
  {
    id: "FW-52", feature: "Stroke + adds Pale; weight 2 writes borderWeight; − removes the stroke and its weight in one change", wp: "F5 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await selectBody(page, id);
      await press(page, "Add stroke");
      await written(page, id, /<Stack\b[^>]*border="pale"/, "border=\"pale\" on the Stack");
      await typeNumber(page, "Stroke weight", 2);
      await written(page, id, /<Stack\b[^>]*borderWeight=\{2\}/, "borderWeight={2}");
      await shot(page, "fw-52-stroke");
      await press(page, "Remove stroke");
      await written(page, id, /<Stack\b[^>]*(border=|borderWeight=)/, "stroke and weight removed", true);
      return "+ → Pale → weight 2 → − (both gone)";
    },
  },
  {
    id: "FW-53", feature: "Appearance opacity is the layer's percentage (Figma's): 40 writes opacity={40}, 100 removes it", wp: "F5 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await selectBody(page, id);
      await typeNumber(page, "Opacity", 40);
      await written(page, id, /<Stack\b[^>]*opacity=\{40\}/, "opacity={40}");
      await typeNumber(page, "Opacity", 100);
      await written(page, id, /<Stack\b[^>]*opacity=/, "opacity removed at 100%", true);
      return "40% → opacity={40} → 100% → removed";
    },
  },
  {
    id: "FW-54", feature: "Position's Flip horizontal and Rotate 90° on a frame: a flip negates the rotation, two flips are a half turn", wp: "F5 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await selectFrame(page, id);
      await press(page, "Flip horizontal");
      await written(page, id, /<Box\b[^>]*flip="horizontal"/, "flip=\"horizontal\"");
      await press(page, "Rotate 90° right");
      await written(page, id, /<Box\b[^>]*rotation=\{-90\}/, "rotation={-90}");
      await shot(page, "fw-54-flipped-frame");
      await press(page, "Flip horizontal");
      await written(page, id, /<Box\b[^>]*rotation=\{90\}/, "rotation={90}, the flip undone");
      if (/<Box\b[^>]*flip=/.test((await pageText(page, id)) ?? "")) throw new Error("still flipped");
      await press(page, "Rotate 90° right");
      await written(page, id, /<Box\b[^>]*(rotation|flip)=/, "upright again", true);
      return "flip → rotate −90° → flip (90°, no flip) → rotate (upright)";
    },
  },
  {
    id: "FW-55", feature: "⇧A on a frame with a fill makes one auto layout Stack that keeps the fill (no Box > Stack)", wp: "F5 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await selectFrame(page, id);
      await press(page, "Add fill");
      await written(page, id, /<Box\b[^>]*surface="surface"/, "the frame filled");
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Shift+KeyA");
      await written(page, id, /<Stack\b[^>]*surface="surface"[^>]*>\s*<Shape/, "one Stack with the fill around the shapes");
      if (/<Box\b[^>]*surface="surface"/.test((await pageText(page, id)) ?? "")) throw new Error("the Box kept the fill");
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await written(page, id, /<Box\b[^>]*surface="surface"/, "⌘Z: the filled frame again");
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await written(page, id, /surface="surface"/, "⌘Z: no fill", true);
      return "fill → ⇧A → <Stack surface> → ⌘Z ⌘Z";
    },
  },
  {
    id: "FW-56", feature: "An instance's properties sit right under its header, above Position (Figma UI3)", wp: "F5 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await clickNamed(page, id, "Button");
      await until(async () => (await selectedName(page)) === "Button", { message: "the Button selected" });
      const headings = await sections(page);
      const position = headings.indexOf("Position");
      if (position <= 0) throw new Error(`Position first or missing: ${headings.join(", ")}`);
      await shot(page, "fw-56-instance");
      return headings.join(", ");
    },
  },
];
