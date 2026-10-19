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
  ["ControlOrMeta+KeyG", "Group selection"],
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


/* ── F3 (structure and clipboard) ───────────────────────────────────────────────────────────────────────────────── */

/** A phone page with a free frame: a filled, stroked Rectangle and a plain Ellipse. */
const clipText = (title) => grow(newPageText({ title, device: "phone", chrome: true }), "Stack", '<Box width={358} height={220}>\n<Shape type="rectangle" position="absolute" insetLeft={20} insetTop={20} width={80} height={60} fill="support-teal-solid" stroke="accent-solid" strokeWeight={2} opacity={80} />\n<Shape type="ellipse" position="absolute" insetLeft={140} insetTop={40} width={60} height={60} />\n</Box>');
let clipMade = null;
async function clipPage(ctx) {
  const { page } = await ctx.studio();
  if (!clipMade) {
    const seeded = await seededPage(ctx, clipText, /type="ellipse"/);
    clipMade = seeded.id;
  } else if (!page.url().includes(encodeURIComponent(`local:${clipMade}`))) {
    await page.goto(`${ctx.server.url}/studio.html?page=${encodeURIComponent(`local:${clipMade}`)}`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-studio-frame^="screen:"]').first().waitFor({ state: "attached", timeout: 20_000 });
    await sleep(500);
  }
  await showLeftTab(page, "layers");
  await deselect(page);
  return { page, id: clipMade };
}
/** Escape until nothing is selected (Layers shows no selected row). */
async function deselect(page) {
  await page.locator(".studio-viewport").focus();
  for (let k = 0; k < 6 && (await selectedSrc(page)).length; k++) { await page.keyboard.press("Escape"); await sleep(150); }
  if ((await selectedSrc(page)).length) throw new Error("Escape left a layer selected");
}
/** Every Shape tag's props in page order: [{ type, x, y, fill, stroke, ... }] (any attribute order). */
const shapeTags = (text) => [...text.matchAll(/<Shape\b[^>]*\/>/g)].map(([tag]) => {
  const value = (name) => { const match = new RegExp(`\\b${name}=(?:"([^"]*)"|\\{(-?[\\d.]+)\\})`).exec(tag); return match ? match[1] ?? Number(match[2]) : undefined; };
  return { type: value("type"), x: value("insetLeft"), y: value("insetTop"), width: value("width"), height: value("height"), fill: value("fill"), stroke: value("stroke"), strokeWeight: value("strokeWeight"), opacity: value("opacity") };
});
const clipShape = (page, id, index) => page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Shape"]`).nth(index);


/* ── F2 (selection and transform) ───────────────────────────────────────────────────────────────────────────────── */

/** A phone page with a free frame (a Box without auto layout) holding three shapes at known X / Y. */
const shapesText = (title) => {
  let text = newPageText({ title, device: "phone", chrome: true });
  return grow(text, "Stack", '<Box width={358} height={200}>\n<Shape type="rectangle" position="absolute" insetLeft={20} insetTop={20} width={80} height={60} />\n<Shape type="ellipse" position="absolute" insetLeft={140} insetTop={40} width={60} height={60} />\n<Shape type="star" position="absolute" insetLeft={260} insetTop={10} width={40} height={40} />\n</Box>');
};
let shapesMade = null;
async function shapesPage(ctx) {
  const { page } = await ctx.studio();
  if (!shapesMade) {
    const seeded = await seededPage(ctx, shapesText, /type="star"/);
    shapesMade = seeded.id;
  } else if (!page.url().includes(encodeURIComponent(`local:${shapesMade}`))) {
    await page.goto(`${ctx.server.url}/studio.html?page=${encodeURIComponent(`local:${shapesMade}`)}`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-studio-frame^="screen:"]').first().waitFor({ state: "attached", timeout: 20_000 });
    await sleep(500);
  }
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  return { page, id: shapesMade };
}
/** ⌘-clicks the first shape, ⇧⌘-clicks the others: the shapes `indexes` selected together. */
async function selectShapes(page, id, indexes) {
  for (const [at, index] of indexes.entries()) {
    const box = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Shape"]`).nth(index).boundingBox();
    if (at) await page.keyboard.down("Shift");
    await page.keyboard.down("ControlOrMeta");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.up("ControlOrMeta");
    if (at) await page.keyboard.up("Shift");
    await sleep(250);
  }
  await until(async () => (await selectedSrc(page)).length === indexes.length || (await page.locator(".studio-selection__outline[data-kind='extra']").count()) === indexes.length - 1, { message: `${indexes.length} shapes selected` });
}
/** Each Shape's written X / Y in page order: [{ type, x, y }]. */
const shapesIn = (text) => [...text.matchAll(/<Shape type="(\w+)"[^>]*?insetLeft=\{(-?\d+)\}[^>]*?insetTop=\{(-?\d+)\}/g)].map((match) => ({ type: match[1], x: Number(match[2]), y: Number(match[3]) }));


/** Each Shape's written size in page order: [{ type, width, height }]. */
const sizesIn = (text) => [...text.matchAll(/<Shape type="(\w+)"[^>]*?width=\{(\d+)\}[^>]*?height=\{(\d+)\}/g)].map((match) => ({ type: match[1], width: Number(match[2]), height: Number(match[3]) }));
/** Drags a resize handle of the selection by (dx, dy) screen px, with `keys` held from the press. */
async function dragHandle(page, handle, dx, dy, keys = []) {
  const box = await page.locator(`.studio-resize__handle[data-handle="${handle}"]`).first().boundingBox();
  if (!box) throw new Error(`no ${handle} handle`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  for (const key of keys) await page.keyboard.down(key);
  await page.mouse.down();
  for (let step = 1; step <= 5; step++) { await page.mouse.move(x + (dx * step) / 5, y + (dy * step) / 5); await sleep(30); }
  await page.mouse.up();
  for (const key of keys) await page.keyboard.up(key);
}


/** A page with two phone Screens side by side (for several frames). */
const twoScreensText = (title) => grow(newPageText({ title, device: "phone", chrome: true }), "Board", '<Screen id="screen-2" title="Second" device="phone" />');
let twoMade = null;
async function twoScreensPage(ctx) {
  const { page } = await ctx.studio();
  if (!twoMade) {
    const seeded = await seededPage(ctx, twoScreensText, /id="screen-2"/);
    twoMade = seeded.id;
  } else if (!page.url().includes(encodeURIComponent(`local:${twoMade}`))) {
    await page.goto(`${ctx.server.url}/studio.html?page=${encodeURIComponent(`local:${twoMade}`)}`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-studio-frame^="screen:"]').first().waitFor({ state: "attached", timeout: 20_000 });
    await sleep(500);
  }
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Shift+Digit1");
  await sleep(400);
  return { page, id: twoMade };
}
/** The frames shown selected (their outline). */
const selectedFrameIds = (page) => page.locator('.studio-frame[data-selected="true"]').evaluateAll((frames) => frames.map((frame) => frame.querySelector("[data-studio-frame]")?.getAttribute("data-studio-frame") ?? frame.getAttribute("data-studio-frame")));

/** The walk frame (the Box that holds the two shapes): ⌘-click its Rectangle, then Esc as Figma's Select parent. */
async function selectWalkFrame(page, id) {
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
  {
    id: "FW-20", feature: "Several layers selected show one box around them all (and each its own outline)", wp: "F2 2026-10-19",
    async run(ctx) {
      const { page, id } = await shapesPage(ctx);
      await selectShapes(page, id, [0, 2]);
      const union = page.locator(".studio-selection__outline[data-kind='union']");
      await union.waitFor({ state: "visible", timeout: 5000 });
      const box = await union.boundingBox();
      const shapes = await Promise.all([0, 2].map((index) => page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Shape"]`).nth(index).boundingBox()));
      const left = Math.min(...shapes.map((shape) => shape.x));
      const right = Math.max(...shapes.map((shape) => shape.x + shape.width));
      if (Math.abs(box.x - left) > 2 || Math.abs(box.x + box.width - right) > 2) throw new Error(`union ${JSON.stringify(box)} vs shapes ${left}…${right}`);
      return `one box ${Math.round(box.width)} × ${Math.round(box.height)} around 2 layers`;
    },
  },
  {
    id: "FW-21", feature: "⌥A / ⌥S align several floating layers to the box around them (one edit, one ⌘Z)", wp: "F2 2026-10-19",
    async run(ctx) {
      const { page, id } = await shapesPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShapes(page, id, [0, 1, 2]);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Alt+KeyA");
      await until(async () => new Set(shapesIn((await pageText(page, id)) ?? "").map((shape) => shape.x)).size === 1, { message: "every left at the same X" });
      const left = shapesIn((await pageText(page, id)) ?? "")[0].x;
      if (left !== 20) throw new Error(`aligned at X ${left}, not the selection's left 20`);
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z brings every layer back" });
      return "⌥A → X 20 for all three · ⌘Z";
    },
  },
  {
    id: "FW-22", feature: "⌃⌥H distributes horizontal spacing: the first and last stay, equal gaps (one ⌘Z)", wp: "F2 2026-10-19",
    async run(ctx) {
      const { page, id } = await shapesPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShapes(page, id, [0, 1, 2]);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Control+Alt+KeyH");
      // 20 + 80 … 260: span 280, sizes 180 → gaps of 50 → the Ellipse at 150.
      await until(async () => shapesIn((await pageText(page, id)) ?? "").find((shape) => shape.type === "ellipse")?.x === 150, { message: "the Ellipse at X 150" });
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await pageText(page, id)) === before, { message: "⌘Z" });
      return "Ellipse 140 → 150 (gaps 50 · 50) · ⌘Z";
    },
  },
  {
    id: "FW-23", feature: "⌃⌥T tidies up a row: tops lined up, one gap (one ⌘Z)", wp: "F2 2026-10-19",
    async run(ctx) {
      const { page, id } = await shapesPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShapes(page, id, [0, 1, 2]);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Control+Alt+KeyT");
      await until(async () => new Set(shapesIn((await pageText(page, id)) ?? "").map((shape) => shape.y)).size === 1, { message: "every top at the same Y" });
      const shapes = shapesIn((await pageText(page, id)) ?? "");
      if (shapes[0].y !== 10) throw new Error(`tops at ${shapes[0].y}, not the row's top 10`);
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await pageText(page, id)) === before, { message: "⌘Z" });
      return `Y 10 for all · X ${shapes.map((shape) => shape.x).join(", ")} · ⌘Z`;
    },
  },
  {
    id: "FW-24", feature: "The arrows nudge several floating layers together: 1 px, ⇧ 10 px (one edit each)", wp: "F2 2026-10-19",
    async run(ctx) {
      const { page, id } = await shapesPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      const start = shapesIn(before);
      await selectShapes(page, id, [0, 2]);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ArrowRight");
      await until(async () => shapesIn((await pageText(page, id)) ?? "")[0].x === start[0].x + 1, { message: "→ moves 1 px" });
      await page.keyboard.press("Shift+ArrowDown");
      await until(async () => { const now = shapesIn((await pageText(page, id)) ?? ""); return now[0].y === start[0].y + 10 && now[2].y === start[2].y + 10 && now[2].x === start[2].x + 1; }, { message: "⇧↓ moves both 10 px" });
      if (shapesIn((await pageText(page, id)) ?? "")[1].x !== start[1].x) throw new Error("the unselected Ellipse moved");
      await undoTo(page, id, before);
      return "→ +1 · ⇧↓ +10 on both, the third stays · ⌘Z ×2";
    },
  },
  {
    id: "FW-25", feature: "A drag of several floating layers moves them together by the px (one edit, one ⌘Z)", wp: "F2 2026-10-19",
    async run(ctx) {
      const { page, id } = await shapesPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      const start = shapesIn(before);
      await selectShapes(page, id, [0, 2]);
      const box = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Shape"]`).nth(0).boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      for (let step = 1; step <= 6; step++) { await page.mouse.move(box.x + box.width / 2 + step * 5, box.y + box.height / 2 + step * 3, { steps: 2 }); await sleep(30); }
      // ⌘ held at release: no snapping, the exact distance.
      await page.keyboard.down("ControlOrMeta");
      await page.mouse.move(box.x + box.width / 2 + 31, box.y + box.height / 2 + 19, { steps: 2 });
      await page.mouse.up();
      await page.keyboard.up("ControlOrMeta");
      await until(async () => { const now = shapesIn((await pageText(page, id)) ?? ""); return now[0].x !== start[0].x; }, { message: "the layers moved" });
      const now = shapesIn((await pageText(page, id)) ?? "");
      const dx = [now[0].x - start[0].x, now[2].x - start[2].x];
      const dy = [now[0].y - start[0].y, now[2].y - start[2].y];
      if (dx[0] !== dx[1] || dy[0] !== dy[1]) throw new Error(`they moved apart: dx ${dx}, dy ${dy}`);
      if (now[1].x !== start[1].x) throw new Error("the unselected Ellipse moved");
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z" });
      return `both by X +${dx[0]}, Y +${dy[0]} · ⌘Z`;
    },
  },
  {
    id: "FW-26", feature: "The multi-selection panel's Alignment row: Align top, Distribute (3 layers or more), Tidy up", wp: "F2 2026-10-19",
    async run(ctx) {
      const { page, id } = await shapesPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShapes(page, id, [0, 1]);
      const bar = page.locator("#studio-right").getByRole("toolbar", { name: "Align and distribute" });
      await bar.waitFor({ state: "visible", timeout: 5000 });
      if (!(await bar.getByRole("button", { name: "Distribute horizontal spacing" }).isDisabled())) throw new Error("Distribute is on with 2 layers");
      await bar.getByRole("button", { name: "Align top" }).click();
      await until(async () => { const now = shapesIn((await pageText(page, id)) ?? ""); return now[0].y === now[1].y; }, { message: "both tops at one Y" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await pageText(page, id)) === before, { message: "⌘Z" });
      return "Align top from the panel · Distribute off for 2 · ⌘Z";
    },
  },
  {
    id: "FW-27", feature: "⌥ resizes a floating layer from its centre: both edges move, the centre stays (one ⌘Z)", wp: "F2 2026-10-19",
    async run(ctx) {
      const { page, id } = await shapesPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShape(page, id, 1);
      const [ellipse] = shapesIn(before).filter((shape) => shape.type === "ellipse");
      const [size] = sizesIn(before).filter((shape) => shape.type === "ellipse");
      await dragHandle(page, "e", 24, 0, ["Alt"]);
      await until(async () => sizesIn((await pageText(page, id)) ?? "").find((shape) => shape.type === "ellipse")?.width !== size.width, { message: "the width changed" });
      const now = shapesIn((await pageText(page, id)) ?? "").find((shape) => shape.type === "ellipse");
      const width = sizesIn((await pageText(page, id)) ?? "").find((shape) => shape.type === "ellipse").width;
      const grow = width - size.width;
      if (Math.abs((ellipse.x - now.x) * 2 - grow) > 1) throw new Error(`not from the centre: width +${grow}, X ${ellipse.x} → ${now.x}`);
      await page.locator(".studio-viewport").focus();
      await undoTo(page, id, before);
      return `width ${size.width} → ${width}, X ${ellipse.x} → ${now.x} · ⌘Z`;
    },
  },
  {
    id: "FW-28", feature: "⇧ on an edge handle keeps the ratio: the other side follows", wp: "F2 2026-10-19",
    async run(ctx) {
      const { page, id } = await shapesPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShape(page, id, 0);
      const [size] = sizesIn(before).filter((shape) => shape.type === "rectangle");
      await dragHandle(page, "e", 30, 0, ["Shift"]);
      await until(async () => sizesIn((await pageText(page, id)) ?? "").find((shape) => shape.type === "rectangle")?.width !== size.width, { message: "the width changed" });
      const now = sizesIn((await pageText(page, id)) ?? "").find((shape) => shape.type === "rectangle");
      if (Math.abs(now.height - Math.round(now.width * size.height / size.width)) > 1) throw new Error(`ratio not kept: ${size.width}×${size.height} → ${now.width}×${now.height}`);
      await page.locator(".studio-viewport").focus();
      await undoTo(page, id, before);
      return `${size.width} × ${size.height} → ${now.width} × ${now.height} · ⌘Z`;
    },
  },
  {
    id: "FW-29", feature: "Moving a layer snaps to the gap its neighbours have, with pink equal-spacing marks and their px", wp: "F2 2026-10-19",
    async run(ctx) {
      const { page, id } = await shapesPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      // Rectangle 20…100, Ellipse 140…200 (a gap of 40), Star at 260: dragged left towards 240, the same gap.
      await selectShape(page, id, 2);
      const star = page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Shape"]`).nth(2);
      const box = await star.boundingBox();
      const zoom = box.width / 40;
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      const target = -18 * zoom;
      for (let step = 1; step <= 6; step++) { await page.mouse.move(x + (target * step) / 6, y); await sleep(40); }
      const marks = await page.locator(".studio-drag__spacing").allInnerTexts();
      await page.mouse.up();
      if (!marks.includes("40")) throw new Error(`no pink 40 mark while moving (marks: ${marks.join(", ") || "none"})`);
      await until(async () => shapesIn((await pageText(page, id)) ?? "").find((shape) => shape.type === "star")?.x === 240, { message: "the Star at X 240 (gap 40)" }).catch(async (error) => { throw new Error(`${error.message} (X ${shapesIn((await pageText(page, id)) ?? "").find((shape) => shape.type === "star")?.x})`); });
      await page.locator(".studio-viewport").focus();
      await undoTo(page, id, before);
      return `marks ${marks.join(", ")} · Star X 260 → 240 · ⌘Z`;
    },
  },
  {
    id: "FW-30", feature: "⌘A with no layer selected selects every frame on the board (Figma's Select all)", wp: "F2 2026-10-19",
    async run(ctx) {
      const { page } = await twoScreensPage(ctx);
      await page.keyboard.press("ControlOrMeta+KeyA");
      await until(async () => (await page.locator('.studio-frame-label[data-selected="true"]').count()) === 2, { message: "both frame names selected" });
      await until(async () => (await page.locator('.studio-frame[data-selected="true"]').count()) === 2, { message: "both frames outlined" });
      await page.keyboard.press("Escape");
      return "⌘A → 2 frames";
    },
  },
  {
    id: "FW-31", feature: "A marquee from the empty canvas selects the frames it touches; ⇧-click a frame's name takes it out", wp: "F2 2026-10-19",
    async run(ctx) {
      const { page } = await twoScreensPage(ctx);
      const frames = await page.locator('[data-studio-frame^="screen:"]').evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
      const left = Math.min(...frames.map((frame) => frame.x));
      const top = Math.min(...frames.map((frame) => frame.y));
      const bottom = Math.max(...frames.map((frame) => frame.y + frame.h));
      // From above the frames (empty canvas) down across both.
      const start = { x: left - 10, y: top - 30 };
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      for (let step = 1; step <= 6; step++) { await page.mouse.move(start.x + step * 40, start.y + ((bottom - top) / 2) * (step / 6) + 30); await sleep(30); }
      const right = Math.max(...frames.map((frame) => frame.x + frame.w));
      await page.mouse.move(right - 10, top + (bottom - top) / 2, { steps: 4 });
      await page.mouse.up();
      await until(async () => (await page.locator('.studio-frame-label[data-selected="true"]').count()) === 2, { message: "the marquee selects both frames" });
      await page.locator('.studio-frame-label[data-chrome-key="label:screen:screen-2"]').click({ modifiers: ["Shift"] });
      await until(async () => (await page.locator('.studio-frame-label[data-selected="true"]').count()) === 1, { message: "⇧-click takes Second out" });
      return "marquee → 2 frames · ⇧-click → 1";
    },
  },
  {
    id: "FW-32", feature: "Layers shows several selected frames; ⇧-click a frame's row adds it", wp: "F2 2026-10-19",
    async run(ctx) {
      const { page } = await twoScreensPage(ctx);
      await showLeftTab(page, "layers");
      await page.locator('[data-layer-id="frame:screen:screen-1"]').click();
      await page.locator('[data-layer-id="frame:screen:screen-2"]').click({ modifiers: ["Shift"] });
      await until(async () => (await page.locator('.studio-layers__tree [data-kind="frame"][aria-selected="true"]').count()) === 2, { message: "both frame rows selected" });
      await until(async () => (await page.locator('.studio-frame[data-selected="true"]').count()) === 2, { message: "both frames outlined" });
      return "2 frame rows selected";
    },
  },
  {
    id: "FW-33", feature: "Delete leaves nothing selected (Figma); ⌘Z brings the layer back selected", wp: "F3 2026-10-19",
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShape(page, id, 1);
      await until(async () => (await selectedSrc(page)).length === 1, { message: "the Ellipse selected" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Backspace");
      await until(async () => !/type="ellipse"/.test((await pageText(page, id)) ?? ""), { message: "the Ellipse removed" });
      await sleep(400);
      const left = await selectedSrc(page);
      if (left.length) throw new Error(`still selected after Delete: ${left.join(", ")}`);
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await pageText(page, id)) === before, { message: "⌘Z" });
      await until(async () => (await selectedName(page)) === "Shape" || (await selectedSrc(page)).length === 1, { timeout: 4000, message: "⌘Z selects it again" });
      return "Delete → no selection · ⌘Z → back, selected";
    },
  },
  {
    id: "FW-34", feature: "Copy / Paste properties carry fill, stroke and opacity only — never X / Y / W / H", wp: "F3 2026-10-19 · walk §2",
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      const [rectangle, ellipse] = shapeTags(before);
      await selectShape(page, id, 0);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Alt+KeyC");
      await until(async () => /Copied 4 properties/.test(await statusText(page)), { message: '"Copied 4 properties"' });
      await deselect(page);
      await selectShape(page, id, 1);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Alt+KeyV");
      await until(async () => shapeTags((await pageText(page, id)) ?? "")[1]?.fill === rectangle.fill, { message: "the Ellipse takes the fill" });
      const now = shapeTags((await pageText(page, id)) ?? "")[1];
      const wrong = ["stroke", "strokeWeight", "opacity"].filter((key) => now[key] !== rectangle[key]);
      const moved = ["x", "y", "width", "height"].filter((key) => now[key] !== ellipse[key]);
      if (wrong.length) throw new Error(`not pasted: ${wrong.join(", ")}`);
      if (moved.length) throw new Error(`X / Y / W / H pasted: ${moved.map((key) => `${key} ${ellipse[key]} → ${now[key]}`).join(", ")}`);
      await undoTo(page, id, before);
      return "fill, stroke, weight, opacity pasted · X / Y / W / H kept · ⌘Z";
    },
  },
  {
    id: "FW-35", feature: "⌘V with nothing selected pastes into the frame in view, at the copied layer's place", wp: "F3 2026-10-19",
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShape(page, id, 0);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyC");
      await until(async () => /Copied/i.test(await statusText(page)), { timeout: 3000, message: '"Copied"' });
      await deselect(page);
      await page.keyboard.press("ControlOrMeta+KeyV");
      await until(async () => shapeTags((await pageText(page, id)) ?? "").length === 3, { message: "a third Shape" }).catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 120)}`); });
      const pasted = shapeTags((await pageText(page, id)) ?? "")[2];
      if (pasted.type !== "rectangle" || pasted.x !== 20 || pasted.y !== 20) throw new Error(`pasted ${pasted.type} at ${pasted.x}, ${pasted.y} (want the rectangle at 20, 20)`);
      await until(async () => (await selectedSrc(page)).length === 1, { message: "the pasted layer selected" });
      await undoTo(page, id, before);
      return "nothing selected · ⌘V → the Rectangle at 20, 20 in the frame, selected · ⌘Z";
    },
  },
  {
    id: "FW-36", feature: "Paste here (right-click in a frame without auto layout) pastes at the pointer", wp: "F3 2026-10-19",
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShape(page, id, 1);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyC");
      await until(async () => /Copied/i.test(await statusText(page)), { timeout: 3000, message: '"Copied"' });
      const frame = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Box"]`).filter({ has: page.locator('[data-zen-name="Shape"]') }).first().boundingBox();
      const scale = frame.width / 358;
      await page.mouse.click(frame.x + 250 * scale, frame.y + 150 * scale, { button: "right" });
      const menu = page.getByRole("menu").last();
      await menu.waitFor({ state: "visible", timeout: 5000 });
      await menu.getByRole("menuitem", { name: /^Paste here/ }).click();
      await until(async () => shapeTags((await pageText(page, id)) ?? "").length === 3, { message: "a third Shape" }).catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 120)}`); });
      const pasted = shapeTags((await pageText(page, id)) ?? "")[2];
      if (pasted.type !== "ellipse" || Math.abs(pasted.x - 250) > 2 || Math.abs(pasted.y - 150) > 2) throw new Error(`pasted ${pasted.type} at ${pasted.x}, ${pasted.y} (want the ellipse at 250, 150)`);
      await undoTo(page, id, before);
      return `the Ellipse at ${pasted.x}, ${pasted.y} (pointer 250, 150) · ⌘Z`;
    },
  },
  {
    id: "FW-37", feature: "⌘D on a moved copy repeats its offset (Figma's smart duplicate)", wp: "F3 2026-10-19",
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShape(page, id, 1);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyD");
      await until(async () => shapeTags((await pageText(page, id)) ?? "").length === 3, { message: "⌘D: a copy" });
      const copy = shapeTags((await pageText(page, id)) ?? "")[2];
      if (copy.x !== 140 || copy.y !== 40) throw new Error(`the copy at ${copy.x}, ${copy.y}: not on the original`);
      await page.keyboard.press("Shift+ArrowRight");
      await until(async () => shapeTags((await pageText(page, id)) ?? "")[2]?.x === 150, { message: "⇧→ moves the copy 10 px" });
      await page.keyboard.press("Shift+ArrowDown");
      await until(async () => shapeTags((await pageText(page, id)) ?? "")[2]?.y === 50, { message: "⇧↓ moves the copy 10 px" });
      await sleep(300);
      await page.keyboard.press("ControlOrMeta+KeyD");
      await until(async () => shapeTags((await pageText(page, id)) ?? "").length === 4, { message: "⌘D again: a fourth" });
      const next = shapeTags((await pageText(page, id)) ?? "")[3];
      if (next.x !== 160 || next.y !== 60) throw new Error(`the next copy at ${next.x}, ${next.y} (want 160, 60: the offset repeated)`);
      await undoTo(page, id, before, 5);
      return "copy at 140, 40 · moved +10, +10 · ⌘D → 160, 60 · ⌘Z";
    },
  },
  {
    id: "FW-38", feature: "Frame selection (⌥⌘G) on floating layers: a Box at the box around them, each layer kept where it was", wp: "F3 2026-10-19",
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      const where = async () => Promise.all([0, 1].map(async (k) => { const box = await clipShape(page, id, k).boundingBox(); return { x: Math.round(box.x), y: Math.round(box.y) }; }));
      const start = await where();
      await selectShapes(page, id, [0, 1]);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Alt+KeyG");
      await until(async () => /<Box position="absolute" insetLeft=\{20\} insetTop=\{20\} width=\{180\} height=\{80\}>/.test((await pageText(page, id)) ?? ""), { message: "a Box at 20, 20, 180 × 80" }).catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 120)} · ${((await pageText(page, id)) ?? "").match(/<Box[^>]*position[^>]*>/)?.[0]}`); });
      const kids = shapeTags((await pageText(page, id)) ?? "");
      if (kids[0].x !== 0 || kids[0].y !== 0 || kids[1].x !== 120 || kids[1].y !== 20) throw new Error(`the layers' offsets in the Box: ${kids.map((kid) => `${kid.x}, ${kid.y}`).join(" · ")}`);
      await sleep(400);
      const now = await where();
      const moved = now.filter((point, k) => Math.abs(point.x - start[k].x) > 1 || Math.abs(point.y - start[k].y) > 1);
      if (moved.length) throw new Error(`moved on the canvas: ${JSON.stringify(start)} → ${JSON.stringify(now)}`);
      await until(async () => (await selectedName(page)) === "Box" || /^Frame/.test(await selectedName(page)), { timeout: 4000, message: "the Box selected" }).catch(() => undefined);
      await undoTo(page, id, before);
      return "Box 20, 20, 180 × 80 · offsets 0, 0 and 120, 20 · nothing moved · ⌘Z";
    },
  },
  {
    id: "FW-39", feature: "⇧⌘G on a frame floating in a frame without auto layout: its layers take its place where they were, selected", wp: "F3 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      const where = async () => Promise.all([0, 1].map(async (k) => { const box = await clipShape(page, id, k).boundingBox(); return { x: Math.round(box.x), y: Math.round(box.y) }; }));
      const start = await where();
      await selectShapes(page, id, [0, 1]);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Alt+KeyG");
      await until(async () => /<Box position="absolute" insetLeft=\{20\}/.test((await pageText(page, id)) ?? ""), { message: "framed" });
      const framed = (await pageText(page, id)) ?? "";
      await sleep(400);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Shift+KeyG");
      await until(async () => !/<Box position="absolute"/.test((await pageText(page, id)) ?? ""), { message: "the frame removed" }).catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 120)}`); });
      const shapes = shapeTags((await pageText(page, id)) ?? "");
      if (shapes[0].x !== 20 || shapes[0].y !== 20 || shapes[1].x !== 140 || shapes[1].y !== 40) throw new Error(`the layers at ${shapes.map((shape) => `${shape.x}, ${shape.y}`).join(" · ")} (want 20, 20 · 140, 40)`);
      await sleep(400);
      const now = await where();
      if (now.some((point, k) => Math.abs(point.x - start[k].x) > 1 || Math.abs(point.y - start[k].y) > 1)) throw new Error(`moved on the canvas: ${JSON.stringify(start)} → ${JSON.stringify(now)}`);
      await until(async () => (await selectedSrc(page)).length === 2, { timeout: 4000, message: "both layers selected" });
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await pageText(page, id)) === framed, { message: "⌘Z: framed again" });
      await undoTo(page, id, before);
      return "⌥⌘G → ⇧⌘G: back at 20, 20 · 140, 40, nothing moved, both selected · ⌘Z ×2";
    },
  },
  {
    id: "FW-110", feature: "⌥⌘K on two floating layers: one component of them both (a Box keeping their places), one ⌘Z", wp: "F3 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShapes(page, id, [0, 1]);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Alt+KeyK");
      await until(async () => /<Component id="component-1" name="Component 1">\s*<Box position="absolute" insetLeft=\{20\} insetTop=\{20\} width=\{180\} height=\{80\}>/.test((await pageText(page, id)) ?? ""), { message: "Component 1 around a Box at 20, 20" }).catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 120)}`); });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z" });
      return "Component 1 › Box 20, 20, 180 × 80 › 2 shapes · one ⌘Z";
    },
  },
  {
    id: "FW-111", feature: "Create multiple components (menu): each selected layer its own component, all selected after", wp: "F3 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShapes(page, id, [0, 1]);
      const box = await clipShape(page, id, 1).boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
      const menu = page.getByRole("menu").last();
      await menu.waitFor({ state: "visible", timeout: 5000 });
      await menu.getByRole("menuitem", { name: /^Create multiple components/ }).click();
      await until(async () => ((await pageText(page, id)) ?? "").match(/<Component id=/g)?.length === 2, { message: "two components" }).catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 120)}`); });
      const text = (await pageText(page, id)) ?? "";
      const names = [...text.matchAll(/<Component id="([^"]+)" name="([^"]+)">/g)].map((match) => match[2]);
      await until(async () => (await selectedSrc(page)).length === 2, { timeout: 4000, message: "both selected" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z" });
      return `${names.join(" · ")} · both selected · one ⌘Z`;
    },
  },
  {
    id: "FW-112", feature: "Copy as › Copy as CSS / Copy as code (the layer menu): its declarations by Zen variable, its JSX", wp: "F3 2026-10-19",
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const copyAs = async (item) => {
        await selectShape(page, id, 0);
        const box = await clipShape(page, id, 0).boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
        const menu = page.getByRole("menu").last();
        await menu.waitFor({ state: "visible", timeout: 5000 });
        await menu.getByRole("menuitem", { name: /^Copy as\b/ }).first().click();
        const list = page.getByRole("menu").last();
        await list.getByRole("menuitem", { name: item }).waitFor({ state: "visible", timeout: 5000 });
        await list.getByRole("menuitem", { name: item }).click();
        await sleep(400);
        return page.evaluate(() => navigator.clipboard.readText());
      };
      const css = await copyAs("Copy as CSS");
      const missing = [/^\/\* Rectangle/, /width: 80px;/, /height: 60px;/, /opacity: 0\.8;/].filter((pattern) => !pattern.test(css) && !new RegExp(pattern.source, "m").test(css));
      if (missing.length) throw new Error(`CSS without ${missing.join(", ")}: ${css.slice(0, 300)}`);
      const code = await copyAs("Copy as code");
      if (!/<Shape type="rectangle"/.test(code)) throw new Error(`code: ${code.slice(0, 160)}`);
      const tokens = (css.match(/var\(--zen-[\w-]+\)/g) ?? []).length;
      return `CSS ${css.split("\n").length - 2} declarations (${tokens} by variable: ${css.split("\n").slice(1).join(" ").slice(0, 400)}) · code <Shape …>`;
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
      await selectWalkFrame(page, id);
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
      await selectWalkFrame(page, id);
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
  // F5b · typed values and variables (decision 1).
  {
    id: "FW-57", feature: "A number typed into Gap snaps to the nearest variable and the field reads as Figma's variable pill", wp: "F5b 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await selectBody(page, id);
      const before = (await pageText(page, id)) ?? "";
      const row = inspectorRow(page, "gap");
      const shown = (await row.locator(".zen-select__trigger").first().innerText()).trim();
      // 13 snaps to Small (12); on a gap that is Small already, 30 snaps to XLarge (32).
      const [typed, key, name] = /^Small/.test(shown) ? ["30", "xl", "XLarge"] : ["13", "sm", "Small"];
      await row.locator(".zen-select__trigger").first().focus();
      await page.keyboard.type(typed);
      await page.keyboard.press("Enter");
      await written(page, id, new RegExp(`<Stack\\b[^>]*gap="${key}"`), `gap="${key}"`);
      await until(async () => (await row.locator(".studio-scale").first().getAttribute("data-variable")) === "true", { message: "the variable pill" });
      await shot(page, "fw-57-variable-pill");
      await undoTo(page, id, before);
      return `${typed} → ${name} (variable pill) → ⌘Z`;
    },
  },
  {
    id: "FW-58", feature: "W takes Figma's arithmetic; with Constrain proportions on, H follows the ratio in the same change", wp: "F5b 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await selectWalkFrame(page, id);
      const before = (await pageText(page, id)) ?? "";
      await press(page, "Constrain proportions");
      try {
        // 358 × 200: W 179 → H 100; then "+21" on 179 → W 200, H at the 179 × 100 ratio → 112.
        await typeNumber(page, "Width", 179);
        await written(page, id, /<Box\b(?=[^>]*width=\{179\})(?=[^>]*height=\{100\})/, "W 179, H 100");
        await typeNumber(page, "Width", "+21");
        await written(page, id, /<Box\b(?=[^>]*width=\{200\})(?=[^>]*height=\{112\})/, "W 200 (179+21), H 112");
      } finally {
        await press(page, "Constrain proportions");
      }
      await undoTo(page, id, before);
      return "lock → W 179 (H 100) → W +21 = 200 (H 112) → ⌘Z";
    },
  },
  {
    id: "FW-59", feature: "In a frame without auto layout, Detach variable makes a right offset px and Apply variable snaps it back to a step", wp: "F5b 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await clickNamed(page, id, "Shape");
      await until(async () => /^(Rectangle|Shape)/.test(await selectedName(page)), { message: "the Rectangle selected" });
      const before = (await pageText(page, id)) ?? "";
      const constraint = right(page).getByRole("button", { name: /Horizontal constraint/ }).first();
      await constraint.click();
      await page.getByRole("option", { name: "Right", exact: true }).click();
      await written(page, id, /<Shape\b[^>]*constraintX="right"[^>]*insetRight="/, "pinned right on a step");
      await press(page, "Detach variable from right offset");
      await written(page, id, /<Shape\b[^>]*insetRight=\{\d+\}/, "the right offset in px");
      await press(page, "Apply variable to right offset");
      await written(page, id, /<Shape\b[^>]*insetRight="/, "a step again");
      await undoTo(page, id, before, 5);
      return "Right → step → Detach (px) → Apply (step) → ⌘Z";
    },
  },
  {
    id: "FW-90", feature: "A hex typed into a fill's colour list offers the nearest variables and Create variable…", wp: "F5b 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await selectBody(page, id);
      await press(page, "Add fill");
      await written(page, id, /<Stack\b[^>]*surface="surface"/, "a fill");
      try {
        await inspectorRow(page, "surface").locator(".zen-select__trigger").first().click();
        await page.keyboard.type("#F2F2F2");
        const near = page.getByRole("group", { name: "Nearest to #F2F2F2" });
        await near.waitFor({ state: "visible", timeout: 5000 });
        const items = (await near.getByRole("option").allInnerTexts()).map((text) => text.split("\n")[0].trim());
        if (!items.includes("Create variable…") || items.length < 2) throw new Error(`items: ${items.join(", ")}`);
        await shot(page, "fw-90-hex-nearest");
        await page.keyboard.press("Escape");
        return items.join(" · ");
      } finally {
        await press(page, "Remove fill");
        await written(page, id, /<Stack\b[^>]*surface=/, "the fill removed", true);
      }
    },
  },
];
