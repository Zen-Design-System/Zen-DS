// Figma walk (plan docs/research/studio-figma-design-parity-2026-10-18.md §6): a Figma user's gestures on a page made in
// the Studio, each asserted as Figma answers them (selection, Layers, Inspector and menu words, the status line). Opt-in:
// npm run studio:e2e -- --only=figma. Each phase of the plan moves rows here from ❌ / 🟡 to ✅; F0 (words and keys) first.
import fs from "node:fs";
import path from "node:path";
import { newPageText } from "../../dialect.mjs";
import { codeOfItem, grow } from "../../dnd-engine.mjs";
import { inspectorRow, openAssetLibrary, openCodeProperties, selectedSrc, showDesignTab, showLeftTab, sleep, statusText, until } from "../lib/studio.mjs";
import { clickNamed, mineOption, newPage, pageText, seededPage, selectedName } from "./builder.mjs";
import { pagesDirOf } from "../lib/server.mjs";

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
  ["KeyI", "Pick color"],
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
/**
 * The walk page's text without the edits just made: ⌘Z until it is `text` again. Each ⌘Z waits for its step to land
 * (the page changes), not for `text`: a row of five edits waited 4 s on each of the first four and passed the row's
 * 20 s (FW-66, 2026-10-21).
 */
async function undoTo(page, id, text, tries = 3) {
  for (let k = 0; k < tries && (await pageText(page, id)) !== text; k++) {
    const now = await pageText(page, id);
    await page.locator(".studio-viewport").focus();
    await page.keyboard.press("ControlOrMeta+KeyZ");
    await until(async () => { const next = await pageText(page, id); return next === text || next !== now; }, { timeout: 4000, message: "⌘Z" }).catch(() => undefined);
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
/* ── Comments (Figma's Comment tool C: comments/CommentsLayer.tsx) ─────────────────────────────────────────────── */

const commentPin = (page, text) => page.locator(".studio-comments").getByRole("button", { name: new RegExp(`^Comment by [^:]+: ${text}`) });
/** Types `text` into the open comment popover (the name first, the first time this browser comments) and posts it. */
async function postComment(page, text) {
  const popover = page.locator(".studio-comment-popover");
  await popover.waitFor({ state: "visible", timeout: 5000 });
  const name = popover.locator("input");
  if (await name.count()) await name.fill("Walk Tester");
  const field = popover.locator("textarea");
  await field.fill(text);
  await field.press("Enter");
}
/** C, then a click at (x, y) and `text` posted there: the new thread's pin. */
async function commentAt(page, x, y, text) {
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("KeyC");
  await until(async () => (await pressedTool(page)) === "Comment", { message: "the Comment tool" });
  await page.mouse.click(x, y);
  await postComment(page, text);
  const pin = commentPin(page, text);
  await pin.waitFor({ state: "visible", timeout: 5000 });
  return pin;
}
/** Runs `work`, then deletes every thread of the page (the right panel's list, Show resolved on), also when it fails. */
async function commenting(page, work) {
  try {
    return await work();
  } finally {
    await clearComments(page).catch(() => undefined);
  }
}
/** The right panel's Show resolved, set by a click on its label as a person does (Zen's box hides the native input). */
async function showResolved(page, on) {
  const box = right(page).getByRole("checkbox", { name: "Show resolved" });
  if ((await box.isChecked()) !== on) await right(page).locator(".zen-checkbox", { hasText: "Show resolved" }).click();
  await until(async () => (await box.isChecked()) === on, { message: `Show resolved ${on ? "on" : "off"}` });
}
async function clearComments(page) {
  await page.locator(".studio-viewport").focus();
  if ((await pressedTool(page)) !== "Comment") await page.keyboard.press("KeyC");
  await showResolved(page, true);
  const rows = right(page).locator(".studio-comments-list__row");
  for (let left = await rows.count(); left > 0; left = await rows.count()) {
    await rows.first().click();
    await page.locator(".studio-comment-popover").getByRole("button", { name: "More thread actions" }).click();
    await page.getByRole("menuitem", { name: "Delete thread" }).click();
    await until(async () => (await rows.count()) < left, { message: "the thread deleted" });
  }
  await showResolved(page, false);
  await page.keyboard.press("Escape");
}

/* ── Libraries (Figma's ⌥⌘O: project/LibrariesDialog.tsx) ─────────────────────────────────────────────────────── */

const LIBRARY_PROJECT = "e2e-libraries";
const projectFile = (ctx) => path.join(ctx.root, path.dirname(pagesDirOf(ctx.server.port)), "projects", LIBRARY_PROJECT, "project.json");
let libraryMade = null;
/** A page of the project "E2E Libraries" (written to the server's projects folder) with the walk page's Button. */
async function libraryPage(ctx) {
  const { page } = await ctx.studio();
  if (!libraryMade) {
    // The project and both its pages written to the server's folders, then one Sync with the folder takes them in (no
    // New page flow: a page of a project opens the project's home, which that flow does not expect).
    fs.mkdirSync(path.dirname(projectFile(ctx)), { recursive: true });
    fs.writeFileSync(projectFile(ctx), JSON.stringify({ format: 1, id: LIBRARY_PROJECT, name: "E2E Libraries", createdAt: Date.now(), updatedAt: Date.now() }));
    const dir = path.join(ctx.root, pagesDirOf(ctx.server.port));
    const walk = seedText("E2E Libraries walk").replace(/^\/\/ @zen-page (\{.*\})$/m, (_, json) => `// @zen-page ${JSON.stringify({ ...JSON.parse(json), project: LIBRARY_PROJECT })}`);
    fs.writeFileSync(path.join(dir, `${LIBRARY_PROJECT}-walk.zen.tsx`), walk);
    fs.writeFileSync(path.join(dir, `${LIBRARY_PROJECT}-promo.zen.tsx`), promoText("E2E Libraries promo"));
    await mineOption(page, /^Sync with the folder/);
    await until(async () => /"project":"e2e-libraries"/.test((await pageText(page, `${LIBRARY_PROJECT}-walk`)) ?? "") && /<Component id="promo"/.test((await pageText(page, `${LIBRARY_PROJECT}-promo`)) ?? ""), { timeout: 15_000, message: "both project pages in the browser" });
    libraryMade = `${LIBRARY_PROJECT}-walk`;
    promoMade = { id: `${LIBRARY_PROJECT}-promo`, title: "E2E Libraries promo" };
  }
  if (!page.url().includes(encodeURIComponent(`local:${libraryMade}`))) {
    await page.goto(`${ctx.server.url}/studio.html?page=${encodeURIComponent(`local:${libraryMade}`)}`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-studio-frame^="screen:"]').first().waitFor({ state: "attached", timeout: 20_000 });
  }
  await until(async () => (await page.locator(".studio-world").getAttribute("data-brand")) === `p-${LIBRARY_PROJECT}`, { timeout: 10_000, message: "the page draws in its project's theme" });
  return { page, id: libraryMade };
}
/** Assets' book button (⌥⌘O is Outline stroke while a layer is selected), the switch `name` set to `on`, Done; then
 *  project.json says so. */
async function setLibrary(ctx, page, name, key, on) {
  await showLeftTab(page, "assets");
  await page.locator(".studio-assets__search").getByRole("button", { name: "Libraries" }).click();
  const dialog = page.getByRole("dialog", { name: "Libraries" });
  await dialog.waitFor({ state: "visible", timeout: 5000 });
  const toggle = dialog.getByRole("switch", { name });
  if ((await toggle.getAttribute("aria-checked")) !== String(on)) await toggle.click();
  await until(async () => JSON.parse(fs.readFileSync(projectFile(ctx), "utf8")).libraries?.[key] === on, { message: `project.json libraries.${key} ${on}` });
  await dialog.getByRole("button", { name: "Done" }).click();
  await dialog.waitFor({ state: "hidden", timeout: 5000 });
}

/** The project's second page: a main component Promo (a Text "Promo"), the walk page's project. */
const promoText = (title, words = "Promo") => [
  `// @zen-page ${JSON.stringify({ format: 1, title, project: LIBRARY_PROJECT })}`,
  'import { Board, Component, Screen } from "@zen-ds/react/builder";',
  'import { Stack, Text } from "@zen-ds/react";',
  "",
  "export const mock = {};",
  "",
  "export default function Page() {",
  "  return (",
  "    <Board>",
  `      <Screen id="screen-1" title=${JSON.stringify(title)} device="desktop">`,
  '        <Stack gap="xl" padding="xl">',
  `          <Component id="promo" name="Promo"><Text>${words}</Text></Component>`,
  "        </Stack>",
  "      </Screen>",
  "    </Board>",
  "  );",
  "}",
  "",
].join("\n");
let promoMade = null;
/** The project's two pages: the walk page (`id`) open, and the page holding Promo (`promo`, its title `promoTitle`). */
async function projectPages(ctx) {
  const { page, id } = await libraryPage(ctx);
  return { page, id, promo: promoMade.id, promoTitle: promoMade.title };
}
/** Assets › Project components › Promo, clicked with the frame in view: `<Use of="promo" page>` on the walk page. */
async function placePromo(page, id, promo) {
  await showLeftTab(page, "assets");
  await page.getByRole("button", { name: new RegExp("^Promo, component on ") }).click();
  await until(async () => new RegExp(`<Use of="promo" page="${promo}" />`).test((await pageText(page, id)) ?? ""), { message: "the instance on the page" });
  const instance = page.locator(`[data-zen-instance="promo"][data-zen-instance-page="${promo}"]`).first();
  await instance.waitFor({ state: "attached", timeout: 10_000 });
  return instance;
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


/* ── F9 (vectors) ────────────────────────────────────────────────────────────────────────────────────────────────── */

/** The free frame of the clipboard page on the screen, and a point of its own px there. */
async function freeFrame(page, id) {
  const box = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Box"]`).filter({ has: page.locator('[data-zen-name="Shape"]') }).first().boundingBox();
  const scale = box.width / 358;
  return { at: (x, y) => ({ x: box.x + x * scale, y: box.y + y * scale }), scale };
}
/** The page's vector tags: [{ d, viewBox, x, y, w, h }]. */
const vectorTags = (text) => [...text.matchAll(/<Shape\b[^>]*\btype="vector"[^>]*\/>/g)].map(([tag]) => ({
  d: /\sd="([^"]*)"/.exec(tag)?.[1], viewBox: /viewBox="([^"]*)"/.exec(tag)?.[1],
  x: Number(/insetLeft=\{(-?[\d.]+)\}/.exec(tag)?.[1]), y: Number(/insetTop=\{(-?[\d.]+)\}/.exec(tag)?.[1]), w: Number(/width=\{([\d.]+)\}/.exec(tag)?.[1]), h: Number(/height=\{([\d.]+)\}/.exec(tag)?.[1]),
}));


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
/** Right-clicks the middle of `box` (a point: width and height 0) and returns the menu that opens. */
async function menuOn(page, box) {
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
  const menu = page.getByRole("menu").last();
  await menu.waitFor({ state: "visible", timeout: 5000 });
  return menu;
}
/** The menu's items in order: their text (label and shortcut) and whether they are dimmed. */
const menuItems = (menu) => menu.getByRole("menuitem").evaluateAll((items) => items.map((item) => ({ text: item.innerText.replace(/\s+/g, " ").trim(), disabled: item.getAttribute("aria-disabled") === "true" || item.hasAttribute("disabled") || item.hasAttribute("data-disabled") })));
/** A fresh load (the Studio forgets what it copied) with an empty system clipboard: nothing to paste. */
async function forgetClipboard(page) {
  await page.evaluate(() => navigator.clipboard.writeText("")).catch(() => undefined);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('[data-studio-frame^="screen:"]').first().waitFor({ state: "attached", timeout: 20_000 });
  await sleep(500);
}
/**
 * A spot on the empty canvas right of the clip page's frame (room around it first), and `board(x, y)`: that spot on
 * the board in px, given the frame's own written X / Y.
 */
async function emptySpot(page) {
  await roomAround(page);
  const element = page.locator('[data-studio-frame="screen:screen-1"]');
  const frame = await element.boundingBox();
  const zoom = frame.width / (await element.evaluate((node) => node.offsetWidth));
  const spot = { x: frame.x + frame.width + 120, y: frame.y + 40 };
  return { ...spot, board: (x, y) => ({ x: Math.round((x ?? 0) + (spot.x - frame.x) / zoom), y: Math.round((y ?? 0) + (spot.y - frame.y) / zoom) }) };
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


/** A phone page with a free frame: a Rectangle, and a Button placed in the frame (it floats in a Box of its own). */
const floatingText = (title) => grow(newPageText({ title, device: "phone", chrome: true }), "Stack", '<Box width={358} height={200}>\n<Shape type="rectangle" position="absolute" insetLeft={20} insetTop={20} width={80} height={60} />\n<Box position="absolute" insetLeft={140} insetTop={40}>\n<Button level="primary">Save</Button>\n</Box>\n</Box>');
let floatingMade = null;
async function floatingPage(ctx) {
  const { page } = await ctx.studio();
  if (!floatingMade) {
    const seeded = await seededPage(ctx, floatingText, /Save<\/Button>/);
    floatingMade = seeded.id;
  } else if (!page.url().includes(encodeURIComponent(`local:${floatingMade}`))) {
    await page.goto(`${ctx.server.url}/studio.html?page=${encodeURIComponent(`local:${floatingMade}`)}`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-studio-frame^="screen:"]').first().waitFor({ state: "attached", timeout: 20_000 });
    await sleep(500);
  }
  await showLeftTab(page, "layers");
  await deselect(page);
  return { page, id: floatingMade };
}
/** Selects the floating Button with a double-click (Figma: into the frame; its Box is folded into it in Layers) and gives
 *  its box in frame px. */
async function selectFloating(page, id, frame) {
  await deselect(page);
  const box = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Button"]`).first().boundingBox();
  // Each double-click goes one frame deeper (Screen content → the free frame → the Button).
  for (let k = 0; k < 4 && (await selectedName(page)) !== "Button"; k++) {
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(400);
  }
  await until(async () => (await selectedName(page)) === "Button", { message: `the Button selected (${await selectedName(page)})` });
  return { width: box.width / frame.scale, height: box.height / frame.scale };
}
/** The floating Box's X / Y and the width of the Stack the Button went into: { x, y, width } (null before a wrap). */
const floatingIn = (text) => {
  const match = /<Box position="absolute" insetLeft=\{(-?\d+)\} insetTop=\{(-?\d+)\}>\s*<Stack [^>]*\bwidth=\{(\d+)\}[^>]*>\s*<Button/.exec(text);
  return match ? { x: Number(match[1]), y: Number(match[2]), width: Number(match[3]) } : null;
};
/** Drags a resize handle of the selection by `dx` screen px in steps, `during` run before the release (keys held). */
async function dragHandleWith(page, handle, dx, { keys = [], midKeys = [], during = async () => null } = {}) {
  const box = await until(() => page.locator(`.studio-resize__handle[data-handle="${handle}"]`).first().boundingBox(), { message: `the ${handle} handle` });
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  for (const key of keys) await page.keyboard.down(key);
  await page.mouse.down();
  try {
    for (let step = 1; step <= 3; step++) { await page.mouse.move(x + (dx * step) / 5, y); await sleep(30); }
    for (const key of midKeys) await page.keyboard.down(key);
    for (let step = 4; step <= 5; step++) { await page.mouse.move(x + (dx * step) / 5, y); await sleep(30); }
    await sleep(120);
    return await during();
  } finally {
    await page.mouse.up();
    for (const key of [...keys, ...midKeys]) await page.keyboard.up(key);
  }
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

/* ── F6 (text) helpers ──────────────────────────────────────────────────────────────────────────────────────────── */

/** The walk page's free frame (the Box holding two shapes) on the canvas (F9's freeFrame is the clipboard page's). */
const walkBox = (page, id) => page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Box"]`).first();
/** Presses T and clicks (or drags to `to`) at `at` (screen px). */
async function textTool(page, at, to = null) {
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("KeyT");
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  if (to) {
    await page.mouse.move((at.x + to.x) / 2, (at.y + to.y) / 2, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 4 });
  }
  await page.mouse.up();
}
const textEditing = (page) => page.locator("[data-studio-text-editing]").count();
/** The test picture (a library photo's file), as a dropped / chosen file named `name`. */
const PICTURE = (ctx) => fs.readFileSync(path.join(ctx.root, "src/assets/media/site-bridge.webp"));
/** ⇧⌘K and the file dialog answered with the test picture: the Image tool waits for a click. */
async function pickPicture(page, ctx, name = "Bridge.webp") {
  await page.locator(".studio-viewport").focus();
  const chooser = page.waitForEvent("filechooser", { timeout: 10_000 });
  await page.keyboard.press("ControlOrMeta+Shift+KeyK");
  await (await chooser).setFiles({ name, mimeType: "image/webp", buffer: PICTURE(ctx) });
  await until(async () => /Click to place Bridge/.test(await statusText(page)), { message: "the Image tool waits for a click" });
}
/** The placed picture's Shape tag in the page. */
const pictureTag = async (page, id) => ((await pageText(page, id)) ?? "").match(/<Shape image="zen-asset:bridge-[^"]+"[^>]*\/>/)?.[0] ?? "";
const num = (tag, name) => Number(new RegExp(`\\b${name}=\\{(-?[\\d.]+)\\}`).exec(tag)?.[1]);
/** Fill › Image fit set to `label`, tried again while the panel re-renders under the click, until `done()`. */
async function chooseFit(page, label, done) {
  const row = page.locator('#studio-right [data-prop="image-fill"]');
  await row.waitFor({ state: "visible", timeout: 8000 });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await row.getByRole("combobox", { name: /Image fit/ }).or(row.getByRole("button", { name: /Image fit/ })).first().click();
    const name = new RegExp(`^${label}$`, "i");
    const option = page.getByRole("option", { name }).or(page.getByRole("menuitemradio", { name })).first();
    if (await option.isVisible().catch(() => false) || await option.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) await option.click();
    if (await until(done, { timeout: 2500, message: label }).then(() => true, () => false)) return;
    await page.keyboard.press("Escape").catch(() => undefined);
  }
  throw new Error(`Image fit → ${label} was not written`);
}
/** The picture's own ratio (height ÷ width), read in the page. */
const ownRatio = (page, ctx) => page.evaluate(async (bytes) => {
  const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: "image/webp" }));
  return bitmap.height / bitmap.width;
}, [...PICTURE(ctx)]);

/** T on the walk frame, `words` typed, the last `select` characters selected (⇧←) and `keys` pressed, then Esc. */
async function richText(page, id, words, select, keys) {
  const box = await walkBox(page, id).boundingBox();
  await textTool(page, { x: box.x + box.width * 0.55, y: box.y + box.height * 0.7 });
  await page.keyboard.type(words, { delay: 20 });
  for (let k = 0; k < select; k++) await page.keyboard.press("Shift+ArrowLeft");
  for (const key of keys) await page.keyboard.press(key);
  await page.keyboard.press("Escape");
}
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

/* ── Code properties on the Code tab (§3a "code-only ones on the Code tab") helpers ──────────────────────────────── */

/** The Code tab's Properties (CodeProperties.tsx): the selected layer's code-only rows. */
const codeProperties = (page) => right(page).locator('[data-e2e="code-properties"]');
/** The Design tab shows only Figma's sections: no Code properties block or heading, none of `props`' rows. Returns its
 *  section titles. */
async function noCodeOnDesign(page, props) {
  const headings = await sections(page);
  if (headings.includes("Code properties")) throw new Error(`a Code properties section on the Design tab (${headings.join(", ")})`);
  if (await codeProperties(page).count()) throw new Error("code properties on the Design tab");
  const shown = [];
  for (const prop of props) if (await inspectorRow(page, prop).count()) shown.push(prop);
  if (shown.length) throw new Error(`code-only rows on the Design tab: ${shown.join(", ")}`);
  return headings;
}
/** Runs `work` on the Code tab (its Properties shown), then shows the Design tab again: the tab persists across rows. */
async function onCodeTab(page, work) {
  await openCodeProperties(page);
  try {
    return await work();
  } finally {
    await showDesignTab(page).catch(() => undefined);
  }
}
/** Types into the text field of the Inspector row `data-prop="prop"` and commits it (Enter). */
async function typeInRow(page, prop, value) {
  const field = inspectorRow(page, prop).locator("input, textarea").first();
  await field.click();
  await field.fill(value);
  await field.press("Enter");
}
/** ⌘Z on the canvas until `pattern` is gone from the page's code. */
async function undoUntilGone(page, id, pattern, message) {
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("ControlOrMeta+KeyZ");
  await written(page, id, pattern, message, true);
}

/* ── F7 (components: sets, variants, properties) helpers ─────────────────────────────────────────────────────────── */

/** A page with two lone mains side by side (Tag small, Tag large), a Chip set of two variants with a text and a boolean
 *  property bound to its layers, and an instance of the set. */
const setsText = (title) => [
  `// @zen-page {"format":1,"title":${JSON.stringify(title)}}`,
  'import { Board, Component, ComponentSet, Screen, Use } from "@zen-ds/react/builder";',
  'import { Icon, Stack, Text } from "@zen-ds/react";',
  "",
  "export const mock = {};",
  "",
  "export default function Page() {",
  "  return (",
  "    <Board>",
  `      <Screen id="screen-1" title=${JSON.stringify(title)} device="desktop">`,
  '        <Stack gap="xl" padding="xl">',
  '          <Stack direction="row" gap="xl">',
  '            <Component id="tag-small" name="Tag small">',
  '              <Stack direction="row" padding="lg" surface="subtle">',
  "                <Text>Small</Text>",
  "              </Stack>",
  "            </Component>",
  '            <Component id="tag-large" name="Tag large">',
  '              <Stack direction="row" padding="xl" surface="subtle">',
  "                <Text>Large</Text>",
  "              </Stack>",
  "            </Component>",
  "          </Stack>",
  '          <ComponentSet id="chip" name="Chip" properties={{ Label: { type: "text", default: "Filter" }, "Show icon": { type: "boolean", default: true } }}>',
  '            <Component id="chip-small" variant={{ Size: "Small" }}>',
  '              <Stack direction="row" gap="xs" padding="sm">',
  '                <Icon name="icon-star-01-line" data-prop-visible="Show icon" />',
  '                <Text data-prop-text="Label">Filter</Text>',
  "              </Stack>",
  "            </Component>",
  '            <Component id="chip-large" variant={{ Size: "Large" }}>',
  '              <Stack direction="row" gap="sm" padding="md">',
  '                <Icon name="icon-star-01-line" data-prop-visible="Show icon" />',
  '                <Text data-prop-text="Label">Filter</Text>',
  "              </Stack>",
  "            </Component>",
  "          </ComponentSet>",
  '          <Use of="chip" />',
  // F7b: an instance of a lone main (its words are no property: an override), and a main that holds an instance of the set.
  '          <Use of="tag-small" />',
  '          <Component id="toolbar" name="Toolbar">',
  '            <Stack direction="row" gap="sm" padding="sm">',
  '              <Use of="chip" />',
  // A nested instance whose text is no property (FW-97: an override inside it is a path through it).
  '              <Use of="tag-small" />',
  "            </Stack>",
  "          </Component>",
  '          <Use of="toolbar" />',
  "        </Stack>",
  "      </Screen>",
  "    </Board>",
  "  );",
  "}",
  "",
].join("\n");
let setsMade = null;
async function setsPage(ctx) {
  const { page } = await ctx.studio();
  if (!setsMade) {
    const seeded = await seededPage(ctx, setsText, /<ComponentSet id="chip"/);
    setsMade = seeded.id;
  } else if (!page.url().includes(encodeURIComponent(`local:${setsMade}`))) {
    await page.goto(`${ctx.server.url}/studio.html?page=${encodeURIComponent(`local:${setsMade}`)}`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-studio-frame^="screen:"]').first().waitFor({ state: "attached", timeout: 20_000 });
    await sleep(500);
  }
  await showLeftTab(page, "layers");
  await page.locator("#studio-right").getByRole("tab", { name: "Design" }).click().catch(() => undefined);
  await deselect(page);
  return { page, id: setsMade };
}
/** A rendered layer of the sets page by a data attribute ("data-zen-main", "tag-small"). */
const marked = (page, id, attr, value) => page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][${attr}="${value}"]`).first();
/** ⌘-clicks (Figma's deep select) just inside a layer's top-left corner, in its padding: that layer itself; with
 *  `add`, ⇧⌘ adds it to the selection. */
async function deepSelect(page, layer, add = false) {
  const box = await layer.boundingBox();
  if (!box) throw new Error("the layer has no box on the canvas");
  if (add) await page.keyboard.down("Shift");
  await page.keyboard.down("ControlOrMeta");
  await page.mouse.click(box.x + 4, box.y + 4);
  await page.keyboard.up("ControlOrMeta");
  if (add) await page.keyboard.up("Shift");
  await sleep(300);
}
/** Picks `option` in the Inspector select inside the row `data-prop="prop"` (its `index`th). */
async function chooseIn(page, prop, option, index = 0) {
  await right(page).locator(`[data-prop="${prop}"]`).nth(index).locator("button").first().click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
/**
 * The right panel's fields as drawn (user, 2026-10-19: the tool's UI never juts out or steps in; Inline-Field is the
 * shared field): every field inside the panel, its value or placeholder not cut off, and in each section every field and
 * button that starts a row on one left edge. Returns what is wrong, empty when it fits.
 */
async function panelFits(page) {
  return right(page).evaluate((panel) => {
    const problems = [];
    const box = panel.getBoundingClientRect();
    const name = (field) => field.querySelector("input, button")?.getAttribute("aria-label") || field.textContent?.trim().slice(0, 24) || "a field";
    for (const field of panel.querySelectorAll(".zen-input-field")) {
      const rect = field.getBoundingClientRect();
      if (!rect.width) continue;
      if (rect.left < box.left - 0.5 || rect.right > box.right + 0.5) problems.push(`${name(field)} juts out of the panel`);
      // A select's value is one word or token, a short input value a number or a name: never cut. A long text scrolls
      // in its input by design.
      const choice = field.querySelector(".zen-select__trigger");
      if (choice && choice.scrollWidth > choice.clientWidth + 1) problems.push(`${name(field)}: its value is cut off`);
      const input = field.querySelector("input.zen-input__native");
      if (input && input.value && input.value.length <= 16 && input.scrollWidth > input.clientWidth + 1) problems.push(`${name(field)}: "${input.value}" is cut off`);
    }
    for (const section of panel.querySelectorAll(".studio-inspector__section")) {
      const body = section.querySelector(".studio-inspector__section-body");
      if (!body) continue;
      const lefts = [];
      for (const row of body.children) {
        const first = row.matches(".zen-input-field, .zen-button, .zen-select") ? row : row.querySelector(":scope > .studio-inspector__row-control > .zen-input-field, :scope > .zen-input-field, :scope > .zen-button, :scope .studio-component-section__actions > .zen-button");
        const label = row.querySelector(":scope > .studio-inspector__row-label");
        const shown = label && getComputedStyle(label).display !== "none" ? null : first;
        if (shown && shown.getBoundingClientRect().width) lefts.push(Math.round(shown.getBoundingClientRect().left));
      }
      if (new Set(lefts).size > 1) problems.push(`${section.querySelector("h3")?.textContent ?? "a section"}: fields start at ${[...new Set(lefts)].join(", ")}`);
      // …and end on the panel grid's field lines (inspector.css: two equal field columns, then the 24px icon column that
      // no field reaches into): the end of the first column or of the second. A property grid row is its own grid.
      const inner = body.getBoundingClientRect();
      const gap = 8;
      const column = (inner.width - 24 - 2 * gap) / 2;
      const lines = [inner.left + column, inner.left + 2 * column + gap];
      const off = new Set();
      for (const row of body.children) {
        if (row.matches(".studio-component-property")) continue;
        for (const field of row.querySelectorAll(".zen-input-field")) {
          const rect = field.getBoundingClientRect();
          if (rect.width && !lines.some((line) => Math.abs(rect.right - line) <= 1)) off.add(`${name(field)} ends at ${Math.round(rect.right - inner.left)} of ${Math.round(inner.width)}`);
        }
      }
      if (off.size) problems.push(`${section.querySelector("h3")?.textContent ?? "a section"}: off the field grid: ${[...off].join(", ")}`);
    }
    return problems;
  });
}
/** Throws when the right panel's fields do not fit (panelFits). */
async function expectPanelFits(page, where) {
  const problems = await panelFits(page);
  if (problems.length) throw new Error(`${where}: ${problems.join(" · ")}`);
}
/** ⌘-click (Figma's deep select) at the middle of `layer`: a layer inside an instance. */
async function deepInto(page, layer) {
  const box = await layer.boundingBox();
  if (!box) throw new Error("the layer has no box on the canvas");
  await page.keyboard.down("ControlOrMeta");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.up("ControlOrMeta");
  await sleep(300);
}
/** Types into an Inspector text field by its name and commits it (Enter). */
async function typeText(page, name, value, index = 0) {
  const field = right(page).getByRole("textbox", { name, exact: true }).nth(index);
  await field.click();
  await field.fill(value);
  await field.press("Enter");
}

/* ── Gap / padding drag (Figma's auto layout handles) helpers ──────────────────────────────────────────────────────── */

/**
 * A phone page with a row Stack (gap Small, paddingX Large 20, paddingY XLarge 24), a 2-column Grid and a free frame
 * (Box). The paddings are thick enough that each area's centre lies clear of the resize strip on the frame's edge
 * (ResizeLayer STRIP, 4 screen px inside the edge) at the canvas's fit zoom.
 */
const spacingText = (title) => {
  let text = newPageText({ title, device: "phone", chrome: true });
  text = grow(text, "Stack", '<Stack direction="row" gap="sm" paddingX="lg" paddingY="xl">\n<Shape type="rectangle" width={60} height={40} />\n<Shape type="ellipse" width={60} height={40} />\n</Stack>');
  text = grow(text, "Stack", '<Grid columns={2} gap="sm" padding="sm">\n<Shape type="rectangle" width={60} height={40} />\n<Shape type="star" width={40} height={40} />\n</Grid>');
  return grow(text, "Stack", '<Box width={200} height={64} padding="lg">\n<Shape type="ellipse" position="absolute" insetLeft={20} insetTop={12} width={40} height={40} />\n</Box>');
};
let spacingMade = null;
async function spacingPage(ctx) {
  const { page } = await ctx.studio();
  if (!spacingMade) {
    const seeded = await seededPage(ctx, spacingText, /<Box width=\{200\} height=\{64\}/);
    spacingMade = seeded.id;
  } else if (!page.url().includes(encodeURIComponent(`local:${spacingMade}`))) {
    await page.goto(`${ctx.server.url}/studio.html?page=${encodeURIComponent(`local:${spacingMade}`)}`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-studio-frame^="screen:"]').first().waitFor({ state: "attached", timeout: 20_000 });
    await sleep(500);
  }
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  return { page, id: spacingMade };
}
/** The spacing page's innermost `name` layout (the one holding Shapes). */
const layoutOf = (page, id, name) => page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="${name}"]`).filter({ has: page.locator('[data-zen-name="Shape"]') }).last();
const shapeBox = (page, id, index) => page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Shape"]`).nth(index).boundingBox();
/** Selects the layout holding Shape `shape` (⌘-click the Shape, Esc to its parent, as Figma's Select parent). */
async function selectLayout(page, id, name, shape) {
  await selectShape(page, id, shape);
  await page.keyboard.press("Escape");
  const want = await layoutOf(page, id, name).boundingBox();
  await until(async () => {
    const box = await page.locator('.studio-selection__outline[data-kind="selected"]').first().boundingBox().catch(() => null);
    return box && Math.abs(box.x - want.x) < 3 && Math.abs(box.width - want.width) < 3 ? box : null;
  }, { message: `the ${name} selected` });
  await until(async () => (await page.locator(".studio-selection__spacing-hit").count()) > 0, { message: `the ${name}'s spacing areas` });
  await sleep(300);
  return want;
}
/** The draggable spacing areas on the canvas: axis and box (screen px). */
const dragAreas = (page) => page.locator(".studio-selection__spacing-hit[data-drag]").evaluateAll((nodes) => nodes.map((node) => {
  const r = node.getBoundingClientRect();
  return { axis: node.getAttribute("data-drag"), x: r.x, y: r.y, width: r.width, height: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
}));
/** The spacing hit area on `side` of the selection (the outermost along it): its box and centre (screen px). */
async function sideArea(page, side) {
  const areas = await page.locator(".studio-selection__spacing-hit").evaluateAll((nodes) => nodes.map((node) => {
    const r = node.getBoundingClientRect();
    return { axis: node.getAttribute("data-drag"), x: r.x, y: r.y, width: r.width, height: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
  }));
  const by = { left: (a) => a.x, right: (a) => -(a.x + a.width), top: (a) => a.y, bottom: (a) => -(a.y + a.height) }[side];
  const along = side === "left" || side === "right" ? (a) => a.height >= a.width : (a) => a.width > a.height;
  const area = areas.filter(along).sort((a, b) => by(a) - by(b))[0];
  if (!area) throw new Error(`no ${side} spacing area on the canvas`);
  return area;
}
const spacingPill = async (page) => (await page.locator(".studio-selection__spacing-label").allInnerTexts()).join(" | ");
/** How many padding / gap tints are pink (hovered or set by the drag). */
const pinkTints = (page, kind) => page.locator(`.studio-selection__${kind}[data-drag][data-hover="true"]`).count();
/** Presses at `from`, drags by `dx` / `dy` screen px in steps (`keys` held from before the press), runs `during` before the release. */
async function dragSpacing(page, from, { dx = 0, dy = 0, keys = [], during } = {}) {
  await page.mouse.move(from.x, from.y);
  for (const key of keys) await page.keyboard.down(key);
  await page.mouse.down();
  let seen;
  try {
    for (let step = 1; step <= 6; step++) { await page.mouse.move(from.x + (dx * step) / 6, from.y + (dy * step) / 6); await sleep(30); }
    await sleep(250);
    seen = during ? await during() : undefined;
  } finally {
    await page.mouse.up();
    for (const key of [...keys].reverse()) await page.keyboard.up(key);
  }
  return seen;
}
/** The open tag of the spacing page's first `<name …` whose text matches `marker`. */
const tagWith = (text, name, marker) => [...text.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g"))].map(([tag]) => tag).find((tag) => marker.test(tag)) ?? "";
/** One ⌘Z puts the page back to `before` (the drag was one write). */
async function oneUndo(page, id, before) {
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("ControlOrMeta+KeyZ");
  await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z" });
}

/* ── Present from an Overlay frame (Figma presents any frame) ─────────────────────────────────────────────────────── */

/** Two phone Screens (Files opens a Dialog and a Card; Deleted goes back) and three Overlays: the Dialog, the Card the
 *  Overlay places (top right, dimmed), and a Bottom Sheet no Screen opens. */
const presentOverlayText = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Overlay, Screen, proto } from "@zen-ds/react/builder";
import { BottomSheet, Button, Card, Dialog, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="home" title="Files" device="phone">
        <Stack gap="md" padding="lg">
          <Text>Report.pdf</Text>
          <Button level="primary" onClick={proto.open("confirm")}>Delete</Button>
          <Button level="secondary" onClick={proto.open("tip")}>Show tip</Button>
        </Stack>
      </Screen>
      <Screen id="done" title="Deleted" device="phone">
        <Stack gap="md" padding="lg">
          <Text>The file is in the trash.</Text>
          <Button level="primary" onClick={proto.back()}>Undo</Button>
        </Stack>
      </Screen>
      <Overlay id="confirm">
        <Dialog title="Delete the file?" description="It goes to the trash." primaryAction={{ label: "Move to trash", onClick: proto.navigate("done") }} secondaryAction={{ label: "Cancel", onClick: proto.close() }} />
      </Overlay>
      <Overlay id="tip" position="top-right" background>
        <Card>
          <Text>Tip: swipe a file to delete it.</Text>
        </Card>
      </Overlay>
      <Overlay id="about">
        <BottomSheet title="About this app" primaryAction={{ label: "Done", onClick: proto.close() }}>
          <Text tone="base">Version 1.0</Text>
        </BottomSheet>
      </Overlay>
    </Board>
  );
}
`;
let presentMade = null;
async function presentOverlayPage(ctx) {
  const { page } = await ctx.studio();
  if (!presentMade) {
    const seeded = await seededPage(ctx, presentOverlayText, /id="about"/);
    presentMade = seeded.id;
  } else if (!page.url().includes(encodeURIComponent(`local:${presentMade}`))) {
    await page.goto(`${ctx.server.url}/studio.html?page=${encodeURIComponent(`local:${presentMade}`)}`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-studio-frame^="screen:"]').first().waitFor({ state: "attached", timeout: 20_000 });
    await sleep(500);
  }
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  // The whole board in view: a row clicks its layers where they are drawn.
  await page.keyboard.press("Shift+Digit1");
  await sleep(400);
  return { page, id: presentMade };
}
const player = (page) => page.locator(".studio-player");
const playerDevice = (page) => player(page).locator(".studio-player__device");
/** Selects a frame by its Layers row (an Overlay's frame too), then gives the canvas the keys. */
async function selectFrameRow(page, frameId) {
  await showLeftTab(page, "layers");
  await page.locator(`[data-layer-id="frame:${frameId}"]`).click();
  await until(async () => (await page.locator(`[data-studio-frame="${frameId}"]`).getAttribute("data-selected")) === "true", { message: `${frameId} selected` });
  await page.locator(".studio-viewport").focus();
}
/** What Play shows: its Screen, its open Overlay, its device and its size, and whether the device frame is drawn. */
const playShows = (page) => playerDevice(page).evaluate((device) => ({
  screen: device.getAttribute("data-screen-id"),
  overlay: device.getAttribute("data-overlay"),
  device: device.closest(".studio-player").getAttribute("data-device"),
  size: `${device.offsetWidth}×${device.offsetHeight}`,
  framed: Boolean(device.parentElement.querySelector(".studio-device-frame")),
}));
/** Presses ⌥⌘↵ and waits for Play. */
async function presentKey(page) {
  await page.keyboard.press("ControlOrMeta+Alt+Enter");
  await player(page).waitFor({ state: "visible", timeout: 10_000 });
}
/** Esc until Play has gone, `times` presses at most (each one is asserted). */
async function leavePlay(page, times = 1) {
  for (let press = 1; press <= times; press += 1) {
    await page.keyboard.press("Escape");
    if (press < times) await sleep(300);
  }
  await player(page).waitFor({ state: "hidden", timeout: 5000 });
}
/** How Play from the Files Screen shows (the size and chrome a presented Overlay must keep). */
async function homePlay(page) {
  await selectFrameRow(page, "screen:home");
  await presentKey(page);
  await until(async () => (await playShows(page)).screen === "home", { message: "Play on Files" });
  const shows = await playShows(page);
  await leavePlay(page);
  return shows;
}

/** Before a row's retry (run.mjs): the pages this module made are forgotten, so the retry seeds them again from scratch
 *  (the runner removes the files the first try added). */
export function forgetPages() {
  made = null;
  clipMade = null;
  shapesMade = null;
  twoMade = null;
  setsMade = null;
  spacingMade = null;
  slotsMade = null;
  presentMade = null;
}

/* ── F7c (an instance's slot from the canvas) helpers ────────────────────────────────────────────────────────────── */

/** A page with a Panel main whose Content slot shows "Empty" until an instance puts layers there, an instance that puts
 *  none, one that puts two (Filled, Second), and a row of two loose layers to drag in. */
const slotsText = (title) => [
  `// @zen-page {"format":1,"title":${JSON.stringify(title)}}`,
  'import { Board, Component, Screen, Use } from "@zen-ds/react/builder";',
  'import { Badge, Stack, Text } from "@zen-ds/react";',
  "",
  "export const mock = {};",
  "",
  "export default function Page() {",
  "  return (",
  "    <Board>",
  `      <Screen id="screen-1" title=${JSON.stringify(title)} device="desktop">`,
  '        <Stack gap="xl" padding="xl">',
  '          <Component id="panel" name="Panel" properties={{ Content: { type: "slot" } }}>',
  '            <Stack gap="sm" padding="lg" surface="subtle" width={320}>',
  "              <Text>Panel</Text>",
  '              <Stack data-prop-slot="Content" gap="lg" padding="lg" border="subtle">',
  "                <Text>Empty</Text>",
  "              </Stack>",
  "            </Stack>",
  "          </Component>",
  '          <Stack direction="row" gap="xl" align="start">',
  '            <Use of="panel" />',
  '            <Use of="panel" slots={{ Content: <>',
  "              <Text>Filled</Text>",
  "              <Text>Second</Text>",
  "            </> }} />",
  "          </Stack>",
  '          <Stack direction="row" gap="md">',
  "            <Badge>Loose</Badge>",
  "            <Text>Spare</Text>",
  "          </Stack>",
  "        </Stack>",
  "      </Screen>",
  "    </Board>",
  "  );",
  "}",
  "",
].join("\n");
let slotsMade = null;
async function slotsPage(ctx) {
  const { page } = await ctx.studio();
  if (!slotsMade) {
    const seeded = await seededPage(ctx, slotsText, /data-prop-slot="Content"/);
    slotsMade = seeded.id;
  } else if (!page.url().includes(encodeURIComponent(`local:${slotsMade}`))) {
    await page.goto(`${ctx.server.url}/studio.html?page=${encodeURIComponent(`local:${slotsMade}`)}`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-studio-frame^="screen:"]').first().waitFor({ state: "attached", timeout: 20_000 });
    await sleep(500);
  }
  await showLeftTab(page, "layers");
  await deselect(page);
  return { page, id: slotsMade };
}
/** The n-th Panel instance of the slots page (0: puts nothing in its slot, 1: Filled and Second) and its slot. */
const panelAt = (page, id, n) => page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-instance="panel"]`).nth(n);
const slotOf = (page, id, n) => panelAt(page, id, n).locator('[data-zen-slot="Content"]').first();
/** The main's slot layer as written: untouched by every row. */
const MAIN_SLOT = /<Stack data-prop-slot="Content" gap="lg" padding="lg" border="subtle">\s*<Text>Empty<\/Text>\s*<\/Stack>/;
/** A text layer of the slots page by its words (`n`: which one with those words). */
const wordsOn = (page, id, words, n = 0) => page.locator(`[data-studio-frame="screen:screen-1"]`).getByText(words, { exact: true }).nth(n);
/**
 * A drag in small steps from `from` to `to` (screen px; ⌥ held with `copy`); answers what the overlay draws just before
 * the drop (the slot's outline and its tag, the insertion line). With ZEN_E2E_SHOTS, `shotName` saves the canvas then.
 */
async function slotDrag(page, from, to, { copy = false, shotName = null } = {}) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  if (copy) await page.keyboard.down("Alt");
  try {
    for (let step = 1; step <= 12; step += 1) {
      await page.mouse.move(from.x + ((to.x - from.x) * step) / 12, from.y + ((to.y - from.y) * step) / 12);
      await sleep(16);
    }
    await sleep(150);
    if (process.env.ZEN_E2E_SHOTS && shotName) await page.locator(".studio-viewport").screenshot({ path: `${process.env.ZEN_E2E_SHOTS}/${shotName}.png` }).catch(() => {});
    return await page.evaluate(() => {
      const into = document.querySelector(".studio-drag__into");
      return {
        slot: into?.getAttribute("data-slot") === "true",
        tag: into?.querySelector(".studio-drag__slot-tag")?.textContent ?? null,
        line: Boolean(document.querySelector(".studio-drag__line")),
        label: document.querySelector(".studio-drag__label")?.textContent?.trim() ?? null,
        outline: into ? getComputedStyle(into).boxShadow : null,
      };
    });
  } finally {
    await page.mouse.up();
    if (copy) await page.keyboard.up("Alt");
  }
}
const middle = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
/** Selects a layer as Figma's ⌘-click does (the deepest layer: one in an instance's slot, one in a row), then checks it:
 *  a press on it then drags that layer. */
async function selectDeep(page, layer, name) {
  await deepInto(page, layer);
  await until(async () => (await selectedName(page)) === name, { message: `${name} selected` }).catch(async (error) => { throw new Error(`${error.message} · selected ${await selectedName(page)}`); });
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
    id: "FW-03", feature: "⇧⌘K is Place image/video: the file dialog opens (F8), the Image tool is on meanwhile; V goes back to Move", wp: "F0 2026-10-18 · F8 file dialog",
    async run(ctx) {
      const { page } = await walkPage(ctx);
      // A page you made opens the file dialog (draw/placeImage.ts); unanswered, the tool stays on until V.
      const chooser = page.waitForEvent("filechooser", { timeout: 8000 });
      await page.keyboard.press("ControlOrMeta+Shift+KeyK");
      await chooser;
      await until(async () => (await pressedTool(page)) === "Place image/video", { message: "Place image/video armed" });
      await page.keyboard.press("Escape");
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("KeyV");
      await until(async () => (await pressedTool(page)) === "Move", { message: "Move again" });
      return "⇧⌘K → the file dialog, Place image/video on → V → Move";
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
      if (group !== false) throw new Error("Group selection is off (⌘G groups since F3)");
      return `${items.length} items in Figma's words; Lock and Group selection on`;
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
    id: "FW-106", feature: "⌘D on a selected Section copies it beside itself with the frame it holds (new ids, one edit, the copy selected); ⌥-drag of its name drops a copy with its frame where it ends, the original stays; one ⌘Z each", wp: "F4 2026-10-21",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        await roomAround(page);
        const frame = await page.locator('[data-studio-frame="screen:screen-1"]').boundingBox();
        await drawSection(page, { x: frame.x - 60, y: frame.y - 60 }, { x: frame.x + frame.width + 60, y: frame.y + frame.height + 60 });
        await until(async () => /<Section id="section-1"/.test((await pageText(page, id)) ?? ""), { message: "Section 1" });
        await until(async () => (await page.locator('[data-studio-frame="section:section-1"]').getAttribute("data-selected")) === "true", { message: "Section 1 selected" });
        const drawn = (await pageText(page, id)) ?? "";
        const screens = (text) => [...text.matchAll(/<Screen id="([^"]+)"/g)].map((match) => match[1]);
        const placeOf = (text, tag, frameId) => { const tag0 = boardTag(text, tag, frameId); return { x: numberAttr(tag0, "x"), y: numberAttr(tag0, "y") }; };
        const section0 = placeOf(drawn, "Section", "section-1");
        const screen0 = placeOf(drawn, "Screen", "screen-1");
        // The copy's Section and Screen moved by the same amount from the originals, which stay.
        const copyOf = (text) => {
          const screen = screens(text).find((screenId) => !screens(drawn).includes(screenId));
          const section1 = placeOf(text, "Section", "section-2");
          const screen1 = screen ? placeOf(text, "Screen", screen) : null;
          if (!screen1 || section1.x === null) return null;
          if (section1.x - section0.x !== screen1.x - screen0.x || section1.y - section0.y !== screen1.y - screen0.y) throw new Error(`the frame did not move with its Section's copy (${JSON.stringify({ section0, section1, screen0, screen1 })})`);
          const still = placeOf(text, "Section", "section-1");
          if (still.x !== section0.x || still.y !== section0.y) throw new Error("the original Section moved");
          return { screen, dx: section1.x - section0.x, dy: section1.y - section0.y };
        };
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("ControlOrMeta+KeyD");
        let duplicated = null;
        await until(async () => (duplicated = copyOf((await pageText(page, id)) ?? "")) !== null, { message: "⌘D: a second Section with a copy of its frame" });
        if (duplicated.dx <= 0 || duplicated.dy !== 0) throw new Error(`the copy is not beside the Section (${duplicated.dx}, ${duplicated.dy})`);
        await until(async () => (await page.locator('[data-studio-frame="section:section-2"]').getAttribute("data-selected")) === "true", { message: "the copy selected" });
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("ControlOrMeta+KeyZ");
        await until(async () => (await pageText(page, id)) === drawn, { message: "one ⌘Z takes the copy away" });
        // ⌥-drag of the Section's name: a copy where the drag ends, the original where it was.
        const tab = await page.locator('.studio-frame-label[data-chrome-key="label:section:section-1"]').boundingBox();
        await page.mouse.move(tab.x + 8, tab.y + tab.height / 2);
        await page.keyboard.down("Alt");
        await page.mouse.down();
        await page.mouse.move(tab.x + 40, tab.y + tab.height / 2 + 60, { steps: 5 });
        await page.mouse.move(tab.x + 90, tab.y + tab.height / 2 + 160, { steps: 5 });
        await page.mouse.up();
        await page.keyboard.up("Alt");
        let dragged = null;
        await until(async () => (dragged = copyOf((await pageText(page, id)) ?? "")) !== null, { message: "⌥-drag: a copy of the Section with its frame" });
        if (dragged.dy <= 0) throw new Error(`the copy is not where the drag ended (${dragged.dx}, ${dragged.dy})`);
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("ControlOrMeta+KeyZ");
        await until(async () => (await pageText(page, id)) === drawn, { message: "one ⌘Z takes the dragged copy away" });
        await undoTo(page, id, before, 4);
        return `⌘D → section-2 + ${duplicated.screen} at +${duplicated.dx}, 0; ⌘Z; ⌥-drag → copy at +${dragged.dx}, +${dragged.dy}, original stays; ⌘Z`;
      });
    },
  },
  {
    id: "FW-190", feature: "S (Slice): drag over the frame draws Slice 1 last on the Board, selected, its panel with Figma's 1x PNG export; ⌘Z", wp: "Slice tool 2026-10-22",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        await roomAround(page);
        const frame = await page.locator('[data-studio-frame="screen:screen-1"]').boundingBox();
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("KeyS");
        await until(async () => (await pressedTool(page)) === "Slice", { message: "the Slice tool" });
        const from = { x: frame.x + 10, y: frame.y + 10 }, to = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 3 };
        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
        await page.mouse.move(to.x, to.y, { steps: 4 });
        await page.mouse.up();
        await until(async () => /<Slice id="slice-1" title="Slice 1" x=\{-?\d+\} y=\{-?\d+\} width=\{\d+\} height=\{\d+\} \/>\s*<\/Board>/.test((await pageText(page, id)) ?? ""), { message: "Slice 1 last on the Board" });
        await until(async () => (await page.locator('[data-studio-frame="slice:slice-1"]').getAttribute("data-selected")) === "true", { message: "Slice 1 selected" });
        await right(page).getByRole("button", { name: "Export Slice 1", exact: true }).waitFor({ state: "visible", timeout: 5000 });
        const scale = (await right(page).getByRole("button", { name: /^Scale/ }).first().innerText()).trim();
        await undoTo(page, id, before, 3);
        return `S + drag over screen-1 → Slice 1 (last on the Board), selected · Export ${scale} PNG ready · ⌘Z`;
      });
    },
  },
  {
    id: "FW-191", feature: "Export Slice 1 downloads Slice 1.png, the area under it as a picture", wp: "Slice tool 2026-10-22",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        await roomAround(page);
        const frame = await page.locator('[data-studio-frame="screen:screen-1"]').boundingBox();
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("KeyS");
        await page.mouse.move(frame.x + 10, frame.y + 10);
        await page.mouse.down();
        await page.mouse.move(frame.x + 120, frame.y + 90, { steps: 6 });
        await page.mouse.up();
        await until(async () => /<Slice id="slice-1"/.test((await pageText(page, id)) ?? ""), { message: "Slice 1" });
        const exportButton = right(page).getByRole("button", { name: "Export Slice 1", exact: true });
        await exportButton.waitFor({ state: "visible", timeout: 5000 });
        const [download] = await Promise.all([page.waitForEvent("download", { timeout: 30_000 }), exportButton.click()]);
        const file = download.suggestedFilename();
        if (file !== "Slice 1.png") throw new Error(`downloaded ${file}`);
        const bytes = fs.readFileSync(await download.path());
        const png = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
        if (!png || width < 10 || height < 10) throw new Error(`not a picture of the slice: png ${png}, ${width} × ${height}`);
        const tag = ((await pageText(page, id)) ?? "").match(/<Slice [^>]*\/>/)?.[0] ?? "";
        const w = Number(tag.match(/width=\{(\d+)\}/)?.[1]), h = Number(tag.match(/height=\{(\d+)\}/)?.[1]);
        if (Math.abs(width - w) > 1 || Math.abs(height - h) > 1) throw new Error(`the picture is ${width} × ${height}, the slice ${w} × ${h}`);
        return `Export Slice 1 → ${file} ${width} × ${height} (the slice ${w} × ${h})`;
      });
    },
  },
  {
    id: "FW-192", feature: "A click inside a slice reaches the layer under it (the slice draws its outline only); Delete on the selected slice removes the slice alone", wp: "Slice tool 2026-10-22",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        await roomAround(page);
        const button = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Button"]`).first().boundingBox();
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("KeyS");
        await page.mouse.move(button.x - 20, button.y - 20);
        await page.mouse.down();
        await page.mouse.move(button.x + button.width + 20, button.y + button.height + 20, { steps: 6 });
        await page.mouse.up();
        await until(async () => /<Slice id="slice-1"/.test((await pageText(page, id)) ?? ""), { message: "Slice 1" });
        const drawn = (await pageText(page, id)) ?? "";
        await page.keyboard.press("KeyV");
        await clickNamed(page, id, "Button");
        await until(async () => (await selectedName(page)) === "Button", { message: "the Button under the slice selected" });
        await selectFrame(page, "slice:slice-1");
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Delete");
        await until(async () => { const text = (await pageText(page, id)) ?? ""; return !/<Slice /.test(text) && /<Button/.test(text) && /<Screen id="screen-1"/.test(text); }, { message: "Delete takes the slice alone" });
        // Drawing it pinned the frames in the same step (their x / y stay): the page is the drawn one less the slice.
        const bare = (text) => text.replace(/<Slice [^>]*\/>/g, "").replace(/\s+/g, " ");
        if (bare((await pageText(page, id)) ?? "") !== bare(drawn)) throw new Error("Delete changed more than the slice");
        await page.keyboard.press("ControlOrMeta+KeyZ");
        await until(async () => (await pageText(page, id)) === drawn, { message: "⌘Z brings it back" });
        await undoTo(page, id, before, 3);
        return "Slice over the Button · click → Button · Delete → slice only · ⌘Z";
      });
    },
  },
  {
    id: "FW-193", feature: "C (Comment): a click on the frame opens a new comment there; the name once, Enter posts; its pin's corner is the place, the right panel lists it, the page file stays as it was", wp: "Comment tool 2026-10-22", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return commenting(page, async () => {
        const before = (await pageText(page, id)) ?? "";
        const frame = await page.locator('[data-studio-frame="screen:screen-1"]').boundingBox();
        const at = { x: frame.x + 60, y: frame.y + 80 };
        const pin = await commentAt(page, at.x, at.y, "Check the spacing here");
        const box = await pin.boundingBox();
        if (Math.abs(box.x - at.x) > 2 || Math.abs(box.y + box.height - at.y) > 2) throw new Error(`the pin's corner is at ${box.x}, ${box.y + box.height}, not ${at.x}, ${at.y}`);
        await page.getByRole("dialog", { name: /^Comment by / }).waitFor({ state: "visible", timeout: 5000 });
        await right(page).getByRole("button", { name: /Check the spacing here/ }).waitFor({ state: "visible", timeout: 5000 });
        if (((await pageText(page, id)) ?? "") !== before) throw new Error("commenting changed the page file");
        return "C · click on screen-1 → New comment · name + Enter → pin at the click, thread open, listed on the right · page file unchanged";
      });
    },
  },
  {
    id: "FW-194", feature: "A reply joins the thread (\"1 reply\" in the list); Resolve closes it and hides its pin; Show resolved shows it again; Reopen", wp: "Comment tool 2026-10-22", timeout: 60_000,
    async run(ctx) {
      const { page } = await walkPage(ctx);
      return commenting(page, async () => {
        const frame = await page.locator('[data-studio-frame="screen:screen-1"]').boundingBox();
        await commentAt(page, frame.x + 80, frame.y + 120, "First note");
        const popover = page.locator(".studio-comment-popover");
        await postComment(page, "A reply");
        await until(async () => (await popover.locator(".studio-comment").count()) === 2, { message: "the reply in the thread" });
        await until(async () => /1 reply/.test(await right(page).locator(".studio-comments-list").innerText()), { message: "1 reply in the list" });
        await popover.getByRole("button", { name: "Resolve" }).click();
        await until(async () => (await commentPin(page, "First note").count()) === 0 && (await popover.count()) === 0, { message: "resolved: pin and thread gone" });
        await showResolved(page, true);
        const pin = commentPin(page, "First note");
        await until(async () => /resolved$/.test((await pin.getAttribute("aria-label")) ?? ""), { message: "the resolved pin shown" });
        await pin.click();
        await popover.getByRole("button", { name: "Reopen" }).click();
        await until(async () => !/resolved$/.test((await pin.getAttribute("aria-label")) ?? ""), { message: "reopened" });
        await showResolved(page, false);
        await pin.waitFor({ state: "visible", timeout: 5000 });
        return "reply → 1 reply · Resolve → hidden · Show resolved → shown · Reopen";
      });
    },
  },
  {
    id: "FW-195", feature: "Comments are kept beside the page: <page>.comments.json next to its .zen.tsx; after a reload the pin is back", wp: "Comment tool 2026-10-22", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return commenting(page, async () => {
        const frame = await page.locator('[data-studio-frame="screen:screen-1"]').boundingBox();
        await commentAt(page, frame.x + 100, frame.y + 60, "Kept beside the page");
        const file = path.join(ctx.root, pagesDirOf(ctx.server.port), `${id}.comments.json`);
        await until(async () => fs.existsSync(file) && /Kept beside the page/.test(fs.readFileSync(file, "utf8")), { message: `${id}.comments.json written` });
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.locator('[data-studio-frame^="screen:"]').first().waitFor({ state: "attached", timeout: 20_000 });
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("KeyC");
        await commentPin(page, "Kept beside the page").waitFor({ state: "visible", timeout: 10_000 });
        return `${id}.comments.json beside ${id}.zen.tsx · reload → the pin is back`;
      });
    },
  },
  {
    id: "FW-196", feature: "A pin on a frame keeps its place in it when the canvas zooms; Esc closes the thread, Esc again is Move; the pins show only with the Comment tool", wp: "Comment tool 2026-10-22", timeout: 60_000,
    async run(ctx) {
      const { page } = await walkPage(ctx);
      return commenting(page, async () => {
        const frameLocator = page.locator('[data-studio-frame="screen:screen-1"]');
        const frame = await frameLocator.boundingBox();
        const pin = await commentAt(page, frame.x + 40, frame.y + 40, "Stays on the frame");
        const offset = async () => {
          const [f, p] = [await frameLocator.boundingBox(), await pin.boundingBox()];
          return { x: (p.x - f.x) / f.width, y: (p.y + p.height - f.y) / f.height };
        };
        const first = await offset();
        await page.keyboard.press("Escape");
        await until(async () => (await page.locator(".studio-comment-popover").count()) === 0, { message: "Esc closes the thread" });
        if ((await pressedTool(page)) !== "Comment") throw new Error("the first Esc left the Comment tool");
        await page.keyboard.press("Minus");
        await sleep(400);
        const zoomed = await offset();
        if (Math.abs(zoomed.x - first.x) > 0.02 || Math.abs(zoomed.y - first.y) > 0.02) throw new Error(`the pin moved in the frame: ${JSON.stringify(first)} → ${JSON.stringify(zoomed)}`);
        await page.keyboard.press("Escape");
        await until(async () => (await pressedTool(page)) === "Move", { message: "Esc again → Move" });
        if (await pin.count()) throw new Error("the pin shows with the Move tool");
        return "pin stays at its place in screen-1 through a zoom · Esc → thread closed · Esc → Move, pins hidden";
      });
    },
  },
  {
    id: "FW-197", feature: "⌥⌘O opens Libraries on a project's page; Zen off: Assets keeps Photos only and Assets' search finds no Zen component, the page's Button still draws; Zen on: Components and Icons are back (project.json)", wp: "Libraries 2026-10-22",
    async run(ctx) {
      const { page, id } = await libraryPage(ctx);
      try {
        // ⌥⌘O with nothing selected opens it (with a layer selected the key is Outline stroke).
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("ControlOrMeta+Alt+KeyO");
        const shortcut = page.getByRole("dialog", { name: "Libraries" });
        await shortcut.waitFor({ state: "visible", timeout: 5000 });
        await shortcut.getByRole("button", { name: "Done" }).click();
        await shortcut.waitFor({ state: "hidden", timeout: 5000 });
        await showLeftTab(page, "assets");
        const libraries = page.locator('[aria-label="Libraries"].studio-assets__list');
        await libraries.getByRole("button", { name: "Components" }).waitFor({ state: "visible", timeout: 5000 });
        await setLibrary(ctx, page, "Zen Design System", "zen", false);
        await until(async () => (await libraries.getByRole("button", { name: "Components" }).count()) === 0 && (await libraries.getByRole("button", { name: "Icons" }).count()) === 0, { message: "Components and Icons gone from Assets" });
        await libraries.getByRole("button", { name: "Photos" }).waitFor({ state: "visible", timeout: 5000 });
        await page.locator(".studio-assets__search input").fill("button");
        await until(async () => (await page.locator(".studio-assets").getByText("Components", { exact: true }).count()) === 0, { message: "no Zen components found" });
        await page.locator(".studio-assets__search input").fill("");
        if (!(await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Button"]`).count())) throw new Error("the page's Button stopped drawing");
        await setLibrary(ctx, page, "Zen Design System", "zen", true);
        await libraries.getByRole("button", { name: "Components" }).waitFor({ state: "visible", timeout: 5000 });
        return "⌥⌘O · Zen off → Assets: Photos only, search finds no component, the Button stays · Zen on → back";
      } finally {
        await setLibrary(ctx, page, "Zen Design System", "zen", true).catch(() => undefined);
      }
    },
  },
  {
    id: "FW-198", feature: "The project's theme off in Libraries: its page draws in Zen's shipped theme; on: the project's again (project.json)", wp: "Libraries 2026-10-22",
    async run(ctx) {
      const { page } = await libraryPage(ctx);
      const world = page.locator(".studio-world");
      try {
        await setLibrary(ctx, page, "E2E Libraries theme", "theme", false);
        await until(async () => (await world.getAttribute("data-brand")) === "zen", { message: "Zen's theme on the canvas" });
        await setLibrary(ctx, page, "E2E Libraries theme", "theme", true);
        await until(async () => (await world.getAttribute("data-brand")) === `p-${LIBRARY_PROJECT}`, { message: "the project's theme again" });
        return `theme off → data-brand zen · on → p-${LIBRARY_PROJECT}`;
      } finally {
        await setLibrary(ctx, page, "E2E Libraries theme", "theme", true).catch(() => undefined);
      }
    },
  },
  {
    id: "FW-199", feature: "Assets › Project components lists a main of the project's other page; a click places <Use of page> that draws it; an edit of the main on its page shows in the instance (a live link)", wp: "Libraries phase 2 2026-10-22", timeout: 90_000,
    async run(ctx) {
      const { page, id, promo, promoTitle } = await projectPages(ctx);
      return restoring(page, id, async () => {
        const instance = await placePromo(page, id, promo);
        await until(async () => (await instance.innerText()).includes("Promo"), { message: "the instance draws Promo" });
        // The main changes on its page (the folder, as another tab would): the instance follows it.
        fs.writeFileSync(path.join(ctx.root, pagesDirOf(ctx.server.port), `${promo}.zen.tsx`), promoText(promoTitle, "Promo, now on sale"));
        await mineOption(page, /^Sync with the folder/);
        await until(async () => (await instance.innerText()).includes("Promo, now on sale"), { timeout: 15_000, message: "the instance shows the main's new words" });
        fs.writeFileSync(path.join(ctx.root, pagesDirOf(ctx.server.port), `${promo}.zen.tsx`), promoText(promoTitle));
        await mineOption(page, /^Sync with the folder/);
        return `Assets › Project components › Promo → <Use of="promo" page="${promo}" /> · main edited on its page → the instance shows it`;
      });
    },
  },
  {
    id: "FW-200", feature: "On an instance of another page's main: Go to main component opens that page with the main selected; Delete on that main is refused and names the page that uses it", wp: "Libraries phase 2 2026-10-22", timeout: 90_000,
    async run(ctx) {
      const { page, id, promo } = await projectPages(ctx);
      return restoring(page, id, async () => {
        await placePromo(page, id, promo);
        await clickNamed(page, id, "Use");
        await until(async () => (await selectedName(page)) === "Promo", { message: "the instance selected" });
        await right(page).getByRole("button", { name: "Go to main component" }).click();
        await until(async () => page.url().includes(encodeURIComponent(`local:${promo}`)), { timeout: 15_000, message: "the main's page open" });
        await until(async () => (await selectedSrc(page)).some((src) => src.startsWith(`local:${promo}.zen.tsx:`)), { timeout: 15_000, message: "the main selected there" });
        const before = (await pageText(page, promo)) ?? "";
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Delete");
        await until(async () => /has instances on /.test(await statusText(page)), { message: "Delete refused, naming the page" });
        if (((await pageText(page, promo)) ?? "") !== before) throw new Error("the main was deleted");
        const said = await statusText(page);
        await libraryPage(ctx);
        return `Go to main component → ${promo}, Promo selected · Delete → "${said.trim()}"`;
      });
    },
  },
  {
    id: "FW-201", feature: "⌥⌘B on an instance of another page's main writes its layers in place (they stop following it); Libraries' project components off hides the Assets section", wp: "Libraries phase 2 2026-10-22", timeout: 90_000,
    async run(ctx) {
      const { page, id, promo } = await projectPages(ctx);
      try {
        return await restoring(page, id, async () => {
          await placePromo(page, id, promo);
          await clickNamed(page, id, "Use");
          await until(async () => (await selectedName(page)) === "Promo", { message: "the instance selected" });
          await page.locator(".studio-viewport").focus();
          await page.keyboard.press("ControlOrMeta+Alt+KeyB");
          await until(async () => { const text = (await pageText(page, id)) ?? ""; return !/<Use of="promo"/.test(text) && /<Text>Promo<\/Text>/.test(text); }, { message: "the main's layers in place" });
          await setLibrary(ctx, page, "E2E Libraries components", "components", false);
          await showLeftTab(page, "assets");
          await until(async () => (await page.getByRole("list", { name: "Project components" }).count()) === 0, { message: "Project components hidden" });
          await setLibrary(ctx, page, "E2E Libraries components", "components", true);
          await page.getByRole("list", { name: "Project components" }).waitFor({ state: "visible", timeout: 5000 });
          return "⌥⌘B → <Text>Promo</Text> in place · components off → no Project components · on → back";
        });
      } finally {
        await setLibrary(ctx, page, "E2E Libraries components", "components", true).catch(() => undefined);
      }
    },
  },
  {
    id: "FW-202", feature: "A project component that holds this page's main can't go inside that main (Figma: a component can't go inside itself); the page stays as it was", wp: "Libraries phase 2 2026-10-22", timeout: 90_000,
    async run(ctx) {
      const { page, id, promo } = await projectPages(ctx);
      const dir = path.join(ctx.root, pagesDirOf(ctx.server.port));
      const own = path.join(dir, `${id}.zen.tsx`), other = path.join(dir, `${promo}.zen.tsx`);
      const [ownBefore, otherBefore] = [fs.readFileSync(own, "utf8"), fs.readFileSync(other, "utf8")];
      try {
        // This page's main Hero, and Promo on the other page holding an instance of it.
        fs.writeFileSync(own, ownBefore.replace(/import \{ Board, /, "import { Board, Component, ").replace(/(<Stack[^>]*>)/, `$1\n          <Component id="hero" name="Hero"><Stack gap="sm"><Text>Hero</Text></Stack></Component>`));
        fs.writeFileSync(other, otherBefore.replace("import { Board, Component, Screen }", "import { Board, Component, Screen, Use }").replace('<Component id="promo" name="Promo"><Text>Promo</Text></Component>', `<Component id="promo" name="Promo"><Stack><Text>Promo</Text><Use of="hero" page="${id}" /></Stack></Component>`));
        await mineOption(page, /^Sync with the folder/);
        await until(async () => /<Component id="hero"/.test((await pageText(page, id)) ?? ""), { timeout: 15_000, message: "Hero on the page" });
        const hero = page.locator('[data-zen-main="hero"]').first();
        await hero.waitFor({ state: "visible", timeout: 10_000 });
        // ⌘-click on the canvas at its place (the canvas layers over it take a locator click).
        const box = await hero.boundingBox();
        await page.keyboard.down("ControlOrMeta");
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.keyboard.up("ControlOrMeta");
        await until(async () => (await selectedName(page)) !== "", { message: "a layer of Hero selected" });
        const before = (await pageText(page, id)) ?? "";
        await showLeftTab(page, "assets");
        await page.getByRole("button", { name: new RegExp("^Promo, component on ") }).click();
        await until(async () => /can't go inside itself/.test(await statusText(page)), { message: "refused: a component can't go inside itself" });
        if (((await pageText(page, id)) ?? "") !== before) throw new Error("the instance went in anyway");
        return `Promo (holds Hero) into Hero → "${(await statusText(page)).split(" | ").find((line) => /inside itself/.test(line))}" · page unchanged`;
      } finally {
        fs.writeFileSync(own, ownBefore);
        fs.writeFileSync(other, otherBefore);
        await mineOption(page, /^Sync with the folder/).catch(() => undefined);
      }
    },
  },
  {
    id: "FW-88", feature: "K (Scale) on a selected shape: the Scale tool, its factor field in focus; 2 + Enter doubles its size from the top-left (its X / Y stay), one ⌘Z", wp: "Scale tool 2026-10-21",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        await selectShape(page, id, 0);
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("KeyK");
        await until(async () => (await pressedTool(page)) === "Scale", { message: "the Scale tool on" });
        const field = page.locator('#studio-right input[aria-label="Scale"]');
        await field.waitFor({ state: "visible", timeout: 5000 });
        await until(async () => field.evaluate((input) => input === document.activeElement), { message: "the factor field in focus" });
        await page.keyboard.type("2");
        await page.keyboard.press("Enter");
        const rect = async () => ((await pageText(page, id)) ?? "").match(/<Shape type="rectangle"[^>]*\/>/)?.[0] ?? "";
        await until(async () => /width=\{160\}/.test(await rect()) && /height=\{120\}/.test(await rect()), { message: "the rectangle 160 × 120" });
        const tag = await rect();
        if (!/insetLeft=\{20\}/.test(tag) || !/insetTop=\{20\}/.test(tag)) throw new Error(`the top-left anchor moved it: ${tag}`);
        await until(async () => /Scaled 200%/.test(await statusText(page)), { message: "Scaled 200%" });
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("ControlOrMeta+KeyZ");
        await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z" });
        await page.keyboard.press("KeyV");
        return "K → Scale, field in focus · 2 ↵ → 160 × 120 at 20, 20 · Scaled 200% · ⌘Z";
      });
    },
  },
  {
    id: "FW-89", feature: "Scale a frame with layers in it: 50% + Enter halves the Box and its shapes' sizes and places inside it (an auto layout frame keeps its place), one ⌘Z", wp: "Scale tool 2026-10-21",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        await selectShape(page, id, 0);
        await page.keyboard.press("Escape");
        // The Design panel heads a Box "Frame", as Figma UI3 does.
        await until(async () => /^Frame/.test(await selectedName(page)), { message: "the Box selected" });
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("KeyK");
        const field = page.locator('#studio-right input[aria-label="Scale"]');
        await until(async () => field.evaluate((input) => input === document.activeElement), { message: "the factor field in focus" });
        await page.keyboard.type("50%");
        await page.keyboard.press("Enter");
        const text = async () => (await pageText(page, id)) ?? "";
        await until(async () => /<Box width=\{179\} height=\{100\}>/.test(await text()), { message: "the Box 179 × 100" });
        const now = await text();
        const shapes = [...now.matchAll(/<Shape type="(rectangle|ellipse)"[^>]*\/>/g)].map((match) => match[0]);
        const want = [/insetLeft=\{10\}/, /insetTop=\{10\}/, /width=\{40\}/, /height=\{30\}/, /insetLeft=\{70\}/, /insetTop=\{20\}/, /width=\{30\}/, /height=\{30\}/];
        const ok = want.slice(0, 4).every((re) => re.test(shapes[0] ?? "")) && want.slice(4).every((re) => re.test(shapes[1] ?? ""));
        if (!ok) throw new Error(`the shapes did not scale with the Box: ${shapes.join(" | ")}`);
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("ControlOrMeta+KeyZ");
        await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z" });
        await page.keyboard.press("KeyV");
        return "Box › K · 50% ↵ → Box 179 × 100, rectangle 40 × 30 at 10, 10, ellipse 30 × 30 at 70, 20 · ⌘Z";
      });
    },
  },
  {
    id: "FW-107", feature: "Scale tool: drag a shape's bottom-right corner out and it scales as one (its ratio kept, the top-left corner still); Esc mid-drag puts it back; one ⌘Z", wp: "Scale tool 2026-10-21",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        await selectShape(page, id, 1);
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("KeyK");
        await until(async () => (await pressedTool(page)) === "Scale", { message: "the Scale tool on" });
        await page.locator(".studio-viewport").focus();
        const corner = page.locator('.studio-scale-handle[data-corner="bottom-right"]');
        await corner.waitFor({ state: "visible", timeout: 5000 });
        const box = await corner.boundingBox();
        const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        const topLeft = await page.locator('.studio-scale-handle[data-corner="top-left"]').boundingBox();
        const side = start.x - (topLeft.x + topLeft.width / 2);
        // Esc mid-drag: nothing written.
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await page.mouse.move(start.x + side / 2, start.y + side / 2, { steps: 4 });
        await page.keyboard.press("Escape");
        await page.mouse.up();
        await sleep(300);
        if ((await pageText(page, id)) !== before) throw new Error("Esc mid-drag wrote the scale");
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await page.mouse.move(start.x + side / 2, start.y + side / 2, { steps: 4 });
        await page.mouse.move(start.x + side, start.y + side, { steps: 4 });
        await page.mouse.up();
        const ellipse = async () => ((await pageText(page, id)) ?? "").match(/<Shape type="ellipse"[^>]*\/>/)?.[0] ?? "";
        let size = null;
        await until(async () => { const tag = await ellipse(); const w = Number(tag.match(/width=\{(\d+)\}/)?.[1]); const h = Number(tag.match(/height=\{(\d+)\}/)?.[1]); size = [w, h]; return w >= 110 && w <= 130 && w === h; }, { message: "the ellipse about twice as big, still round" });
        const tag = await ellipse();
        if (!/insetLeft=\{140\}/.test(tag) || !/insetTop=\{40\}/.test(tag)) throw new Error(`its top-left corner moved: ${tag}`);
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("ControlOrMeta+KeyZ");
        await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z" });
        await page.keyboard.press("KeyV");
        return `Esc mid-drag → unchanged · corner drag → ${size[0]} × ${size[1]} at 140, 40 · ⌘Z`;
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
    id: "FW-37", feature: "⌘D on a moved copy repeats its offset (Figma's smart duplicate)", wp: "F3 2026-10-19", timeout: 40_000,
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
      await until(async () => /^Frame/.test(await selectedName(page)), { timeout: 4000, message: "the Box selected" }).catch(() => undefined);
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
  {
    id: "FW-100", feature: "Zoom reaches Figma's 25600 %; the pixel grid shows from 400 % and ⌘' turns it off", wp: "F10 2026-10-19",
    async run(ctx) {
      const { page } = await newPage(ctx);
      const viewport = page.locator(".studio-viewport");
      await viewport.focus();
      await page.keyboard.press("Shift+Digit0");
      await sleep(300);
      const grid = () => page.locator(".studio-pixel-grid").getAttribute("data-hidden");
      if ((await grid()) !== "true") throw new Error("the pixel grid shows at 100 %");
      for (let step = 0; step < 14; step += 1) { await page.keyboard.press("Equal"); await sleep(80); }
      await until(async () => /25600%|25 600%/.test(await page.locator("#studio-right").innerText()), { message: "25600 % in the zoom menu" }).catch(() => undefined);
      const zoom = await page.evaluate(() => Number(getComputedStyle(document.querySelector(".studio-world")).getPropertyValue("--studio-zoom")));
      if (zoom < 128) throw new Error(`zoom stops at ${zoom}`);
      await until(async () => (await grid()) === "false", { message: "the pixel grid at high zoom" });
      await page.keyboard.press("ControlOrMeta+Quote");
      await until(async () => (await viewport.getAttribute("data-pixel-grid")) === null, { message: "⌘' turns it off" });
      await page.keyboard.press("ControlOrMeta+Quote");
      await page.keyboard.press("Shift+Digit1");
      return `zoom ${Math.round(zoom * 100)} %, pixel grid from 400 %, ⌘' off/on`;
    },
  },
  {
    id: "FW-101", feature: "⌘Y Outlines: every layer of the frames as a thin outline, fills gone; ⌘Y again restores", wp: "F10 2026-10-19",
    async run(ctx) {
      const { page } = await newPage(ctx);
      const viewport = page.locator(".studio-viewport");
      await viewport.focus();
      await page.keyboard.press("ControlOrMeta+KeyY");
      await until(async () => (await viewport.getAttribute("data-outlines")) === "true", { message: "Outlines on" });
      const look = await page.locator('[data-studio-frame^="screen:"] .zen-text').first().evaluate((element) => ({ outline: getComputedStyle(element).outlineStyle, background: getComputedStyle(element.closest(".studio-builder-screen") ?? element).backgroundImage + getComputedStyle(element.closest(".studio-builder-screen") ?? element).backgroundColor }));
      if (look.outline !== "solid" || !/none.*rgba\(0, 0, 0, 0\)|^none(rgba\(0, 0, 0, 0\)|transparent)/.test(look.background)) throw new Error(`outlines: ${JSON.stringify(look)}`);
      await page.keyboard.press("ControlOrMeta+KeyY");
      await until(async () => (await viewport.getAttribute("data-outlines")) === null, { message: "Outlines off" });
      return "⌘Y → outlines, no fills; ⌘Y → back";
    },
  },
  {
    id: "FW-102", feature: "⇧R rulers: 0 at the selected frame's top-left; a guide dragged from a ruler onto the frame is the frame's; back onto the ruler deletes it", wp: "F10 2026-10-19",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      const header = async () => ((await pageText(page, id)) ?? "").split("\n")[0];
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Shift+Digit1");
      await sleep(300);
      await page.locator(".studio-frame-label").first().click();
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Shift+KeyR");
      const top = page.locator('.studio-ruler[data-axis="x"]');
      await top.waitFor({ state: "visible", timeout: 5000 });
      const frame = await page.locator('[data-studio-frame="screen:screen-1"]').boundingBox();
      const zero = await top.locator(".studio-ruler__label", { hasText: /^0$/ }).first().boundingBox();
      if (!zero || Math.abs(zero.x - frame.x) > 2) throw new Error(`the ruler's 0 at ${zero?.x}, the frame at ${frame.x}`);
      const ruler = await top.boundingBox();
      await page.mouse.move(frame.x + 80, ruler.y + 10);
      await page.mouse.down();
      await page.mouse.move(frame.x + 80, frame.y + 120, { steps: 6 });
      await page.mouse.up();
      await until(async () => /"guides":\[\{"axis":"y","at":\d+,"frame":"screen:screen-1"\}\]/.test(await header()), { message: "a frame guide in the page" });
      const guide = await page.locator('.studio-guide[data-axis="y"]').first().boundingBox();
      await page.mouse.move(guide.x + 40, guide.y + 0.5);
      await page.mouse.down();
      await page.mouse.move(guide.x + 40, ruler.y + 8, { steps: 6 });
      await page.mouse.up();
      await until(async () => !/"guides"/.test(await header()), { message: "the guide deleted" });
      await page.keyboard.press("Shift+KeyR");
      return "0 at the frame's left; a guide added in the frame and deleted on the ruler";
    },
  },
  {
    id: "FW-103", feature: "Layout guide: + on a frame adds its device's columns (margin and gutter from Breakpoint & Grids); ⌃G hides them", wp: "F10 2026-10-19",
    async run(ctx) {
      const { page, id } = await newPage(ctx, { device: "phone" });
      const header = async () => ((await pageText(page, id)) ?? "").split("\n")[0];
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Shift+Digit1");
      await sleep(300);
      await page.locator(".studio-frame-label").first().click();
      await page.getByRole("button", { name: "Add layout guide" }).click();
      await until(async () => /"layoutGuides":\{"screen:screen-1":\[\{"type":"columns","count":4\}\]\}/.test(await header()), { message: "a phone's 4 columns in the page" });
      await until(async () => (await page.locator(".studio-layout-guide__track").count()) === 4, { message: "4 columns over the frame" });
      const frame = await page.locator('[data-studio-frame="screen:screen-1"] .studio-builder-screen').boundingBox();
      const first = await page.locator(".studio-layout-guide__track").first().boundingBox();
      const margin = await page.locator('[data-studio-frame="screen:screen-1"] .studio-builder-screen').evaluate((element) => Number.parseFloat(getComputedStyle(element).getPropertyValue("--zen-margin-comfortable")));
      const zoom = await page.evaluate(() => Number(getComputedStyle(document.querySelector(".studio-world")).getPropertyValue("--studio-zoom")) || 1);
      if (Math.abs(first.x - frame.x - margin * zoom) > 2) throw new Error(`the first column at ${first.x - frame.x}, margin ${margin} × ${zoom}`);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press(process.platform === "darwin" ? "Control+KeyG" : "Control+Alt+KeyG");
      await until(async () => (await page.locator(".studio-layout-guides").count()) === 0, { message: "⌃G hides them" });
      await page.keyboard.press(process.platform === "darwin" ? "Control+KeyG" : "Control+Alt+KeyG");
      return `4 columns from margin ${margin}; ⌃G hides`;
    },
  },
  {
    id: "FW-104", feature: "Page › Background: the canvas takes a Zen background token (Dark: Neutral/Solid), written in the page", wp: "F10 2026-10-19",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.getByRole("combobox", { name: "Canvas background" }).or(page.getByRole("button", { name: /Canvas background/ })).first().click();
      await page.getByRole("option", { name: "Dark", exact: true }).first().click();
      await until(async () => /"canvas":"dark"/.test(((await pageText(page, id)) ?? "").split("\n")[0]), { message: "the page's canvas dark" });
      const background = await page.locator(".studio-viewport").evaluate((element) => getComputedStyle(element).backgroundColor);
      const token = await page.evaluate(() => { const probe = document.createElement("div"); probe.style.background = "var(--zen-color-background-neutral-solid-default)"; document.querySelector(".studio-viewport").append(probe); const value = getComputedStyle(probe).backgroundColor; probe.remove(); return value; });
      if (background !== token) throw new Error(`the canvas is ${background}, Neutral/Solid is ${token}`);
      return `Background Dark → ${background}`;
    },
  },
  {
    id: "FW-105", feature: "⌘F Find and replace: the matches counted, Enter selects the next, Replace all writes every match in one edit (one ⌘Z)", wp: "F10 2026-10-19",
    async run(ctx) {
      const body = '<Stack gap="sm">\n<Text>Invoice due tomorrow</Text>\n<Text>Two invoices are late</Text>\n<Button>Pay invoice</Button>\n</Stack>';
      const { page, id } = await seededPage(ctx, (title) => grow(newPageText({ title, device: "desktop", chrome: false }), "Stack", body), /Pay invoice/);
      const source = async () => (await pageText(page, id)) ?? "";
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyF");
      const input = page.getByRole("searchbox", { name: "Find", exact: true });
      await input.waitFor({ state: "visible", timeout: 5000 });
      await input.fill("invoice");
      await until(async () => /\/ 3$/.test((await page.locator(".studio-find__count").textContent()) ?? ""), { message: "3 matches" });
      await input.press("Enter");
      await until(async () => (await selectedName(page)) === "Text", { message: "the first match selected" });
      await page.getByRole("textbox", { name: "Replace with" }).fill("bill");
      await page.getByRole("button", { name: "Replace all" }).click();
      await until(async () => /Pay bill/.test(await source()) && /Two bills/.test(await source()) && /bill due/.test(await source()), { message: "every match replaced" });
      await page.keyboard.press("Escape");
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => /Pay invoice/.test(await source()) && /Two invoices/.test(await source()), { message: "one ⌘Z brings them back" });
      return "3 matches, Enter selects, Replace all → bill (one edit), ⌘Z → invoice";
    },
  },
  {
    id: "FW-60", feature: "T, a click on a frame and typing at once: an Auto width text of the typed words at the click (Figma's Text tool); Esc leaves it selected; ⌘Z", wp: "F6 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const box = await walkBox(page, id).boundingBox();
        await textTool(page, { x: box.x + box.width * 0.7, y: box.y + box.height * 0.75 });
        await page.keyboard.type("Hello", { delay: 20 });
        await page.keyboard.press("Escape");
        await until(async () => /<Text wrap=\{false\}>Hello<\/Text>/.test((await pageText(page, id)) ?? ""), { message: "an Auto width text Hello" });
        const text = (await pageText(page, id)) ?? "";
        if (!/<Box position="absolute" insetLeft=\{\d+\} insetTop=\{\d+\}><Text wrap=\{false\}>Hello<\/Text><\/Box>/.test(text)) throw new Error("the text does not float at the click in the frame");
        await until(async () => (await selectedName(page)) === "Text", { message: "the text selected" });
        if (await textEditing(page)) throw new Error("the editor is still open after Esc");
        return "T + click + Hello + Esc → <Text wrap={false}>Hello</Text> at the click, selected";
      });
    },
  },
  {
    id: "FW-61", feature: "T and a drag: a text box of the dragged width (Auto height), typed at once", wp: "F6 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const box = await walkBox(page, id).boundingBox();
        await textTool(page, { x: box.x + box.width * 0.4, y: box.y + box.height * 0.7 }, { x: box.x + box.width * 0.9, y: box.y + box.height * 0.8 });
        await page.keyboard.type("Wide", { delay: 20 });
        await page.keyboard.press("Escape");
        await until(async () => /<Text width=\{\d+\}>Wide<\/Text>/.test((await pageText(page, id)) ?? ""), { message: "an Auto height text of the dragged width" });
        return ((await pageText(page, id)) ?? "").match(/<Text width=\{\d+\}>Wide<\/Text>/)?.[0];
      });
    },
  },
  {
    id: "FW-62", feature: "T, a click and Esc without typing: no text layer is left (Figma keeps no empty text)", wp: "F6 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        const box = await walkBox(page, id).boundingBox();
        await textTool(page, { x: box.x + box.width * 0.7, y: box.y + box.height * 0.75 });
        await until(async () => (await textEditing(page)) > 0, { message: "the editor open" });
        await page.keyboard.press("Escape");
        await until(async () => (await pageText(page, id)) === before, { message: "the untouched text removed again" });
        return "T + click + Esc → the page as before";
      });
    },
  },
  {
    id: "FW-63", feature: "Enter in a text layer is a new line (Esc leaves): the text keeps its two lines in code and on the canvas", wp: "F6 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const box = await walkBox(page, id).boundingBox();
        await textTool(page, { x: box.x + box.width * 0.6, y: box.y + box.height * 0.6 });
        await page.keyboard.type("First", { delay: 20 });
        await page.keyboard.press("Enter");
        await page.keyboard.type("Second", { delay: 20 });
        await page.keyboard.press("Escape");
        await until(async () => /<Text wrap=\{false\}>\{"First\\nSecond"\}<\/Text>/.test((await pageText(page, id)) ?? ""), { message: 'the text {"First\\nSecond"}' });
        const lines = () => page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Text"]`, { hasText: "Second" }).first().evaluate((element) => Math.round(element.offsetHeight / Number.parseFloat(getComputedStyle(element).lineHeight)));
        await until(async () => (await lines()) === 2, { message: "two lines on the canvas" }).catch(async () => { throw new Error(`the canvas shows ${await lines()} line(s)`); });
        return 'Enter → {"First\\nSecond"}, two lines on the canvas';
      });
    },
  },
  {
    id: "FW-64", feature: "Emptying a text layer and leaving it deletes the layer (and its floating frame)", wp: "F6 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const box = await walkBox(page, id).boundingBox();
        await textTool(page, { x: box.x + box.width * 0.7, y: box.y + box.height * 0.75 });
        await page.keyboard.type("Bye", { delay: 20 });
        await page.keyboard.press("Escape");
        await until(async () => />Bye<\/Text>/.test((await pageText(page, id)) ?? ""), { message: "Bye written" });
        const made = (await pageText(page, id)) ?? "";
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Enter");
        await until(async () => (await textEditing(page)) > 0, { message: "Enter edits the text" });
        await page.keyboard.press("Backspace");
        await page.keyboard.press("Escape");
        await until(async () => !/Bye/.test((await pageText(page, id)) ?? ""), { message: "the emptied text deleted" });
        const text = (await pageText(page, id)) ?? "";
        if (/<Box position="absolute" insetLeft=\{\d+\} insetTop=\{\d+\}>\s*<\/Box>/.test(text) || (text.match(/<Box /g) ?? []).length !== (made.match(/<Box /g) ?? []).length - 1) throw new Error("its floating frame stayed");
        return "Enter, ⌫, Esc → the text and its floating frame deleted";
      });
    },
  },
  {
    id: "FW-65", feature: "T on the words of a text layer puts the caret there (no new text): typing goes in at the caret", wp: "F6 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const box = await walkBox(page, id).boundingBox();
        await textTool(page, { x: box.x + box.width * 0.6, y: box.y + box.height * 0.75 });
        await page.keyboard.type("Hello", { delay: 20 });
        await page.keyboard.press("Escape");
        await until(async () => />Hello<\/Text>/.test((await pageText(page, id)) ?? ""), { message: "Hello written" });
        const texts = ((await pageText(page, id)) ?? "").match(/<Text\b/g)?.length ?? 0;
        const words = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Text"]`, { hasText: "Hello" }).first().boundingBox();
        await textTool(page, { x: words.x + words.width - 1, y: words.y + words.height / 2 });
        await until(async () => (await textEditing(page)) > 0, { message: "the words being edited" });
        await page.keyboard.type("!", { delay: 20 });
        await page.keyboard.press("Escape");
        await until(async () => />Hello!<\/Text>/.test((await pageText(page, id)) ?? ""), { message: "Hello! written" });
        if ((((await pageText(page, id)) ?? "").match(/<Text\b/g)?.length ?? 0) !== texts) throw new Error("T made another text");
        return "T on Hello's end + ! → Hello!, no new text";
      });
    },
  },
  {
    id: "FW-66", feature: "Typography › Resizing: Auto height writes the text's width, Fixed size its width and height, Auto width wrap={false} (one ⌘Z each)", wp: "F6 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const box = await walkBox(page, id).boundingBox();
        await textTool(page, { x: box.x + box.width * 0.6, y: box.y + box.height * 0.75 });
        await page.keyboard.type("Size", { delay: 20 });
        await page.keyboard.press("Escape");
        const tag = async () => ((await pageText(page, id)) ?? "").match(/<Text [^>]*>Size<\/Text>/)?.[0] ?? "";
        await until(async () => /wrap=\{false\}/.test(await tag()), { message: "Size written" });
        const row = page.locator('#studio-right [data-prop="text-resizing"]');
        await row.waitFor({ state: "visible", timeout: 5000 });
        const pick = (name) => row.getByRole("radio", { name }).or(row.getByRole("button", { name })).first().click();
        await pick("Auto height");
        await until(async () => /^<Text width=\{\d+\}>/.test(await tag()), { message: "Auto height: a width" });
        await pick("Fixed size");
        await until(async () => /^<Text width=\{\d+\} height=\{\d+\}>/.test(await tag()), { message: "Fixed size: width and height" });
        await pick("Auto width");
        await until(async () => /^<Text wrap=\{false\}>/.test(await tag()), { message: "Auto width again" });
        return "Auto height → width, Fixed size → width + height, Auto width → wrap={false}";
      });
    },
  },
  {
    id: "FW-67", feature: "⌘B on selected words while typing: a TextRun bold inside the Text (Figma's mixed styles); Layers keeps one text layer named by all its words", wp: "F6b 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        await richText(page, id, "Renews on Nov 2", 5, ["ControlOrMeta+KeyB"]);
        await until(async () => /<Text wrap=\{false\}>Renews on <TextRun bold>Nov 2<\/TextRun><\/Text>/.test((await pageText(page, id)) ?? ""), { message: "Renews on <TextRun bold>Nov 2</TextRun>" });
        const weight = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"] .zen-text-run`, { hasText: "Nov 2" }).first().evaluate((element) => Number(getComputedStyle(element).fontWeight));
        if (!(weight >= 500)) throw new Error(`the run is drawn at weight ${weight}`);
        await showLeftTab(page, "layers");
        await until(async () => (await layerRows(page)).some((row) => row.name === "Renews on Nov 2"), { message: "a text layer named Renews on Nov 2" });
        const rows = await layerRows(page);
        const text = rows.find((row) => row.name === "Renews on Nov 2");
        if (text.expanded !== null || rows.some((row) => row.name === "span" || row.name === "Nov 2" || row.name === "TextRun")) throw new Error(`the run is a layer of its own: ${rows.map((row) => `${row.level}:${row.name}`).join(" | ")}`);
        return `⇧←×5 + ⌘B → Renews on <TextRun bold>Nov 2</TextRun> (weight ${weight}); one layer "Renews on Nov 2"`;
      });
    },
  },
  {
    id: "FW-68", feature: "Enter on a text with runs edits it with its styles: ⌘A ⌘I makes every word italic, the bold run stays bold; one ⌘Z undoes it", wp: "F6b 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        await richText(page, id, "Renews on Nov 2", 5, ["ControlOrMeta+KeyB"]);
        const bold = /<Text wrap=\{false\}>Renews on <TextRun bold>Nov 2<\/TextRun><\/Text>/;
        await until(async () => bold.test((await pageText(page, id)) ?? ""), { message: "the bold run written" });
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Enter");
        await until(async () => (await textEditing(page)) > 0, { message: "Enter edits the text" });
        await page.keyboard.press("ControlOrMeta+KeyA");
        await page.keyboard.press("ControlOrMeta+KeyI");
        await page.keyboard.press("Escape");
        await until(async () => /<TextRun italic>Renews on <\/TextRun><TextRun bold italic>Nov 2<\/TextRun><\/Text>/.test((await pageText(page, id)) ?? ""), { message: "every word italic, Nov 2 bold italic" });
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("ControlOrMeta+KeyZ");
        await until(async () => bold.test((await pageText(page, id)) ?? ""), { message: "one ⌘Z: the bold run only" });
        return "Enter, ⌘A, ⌘I, Esc → <TextRun italic>Renews on </TextRun><TextRun bold italic>Nov 2</TextRun>; ⌘Z → as before";
      });
    },
  },
  {
    id: "FW-69", feature: "⌘U and ⇧⌘X style the selected words; the same key again takes its style off (Figma's toggles)", wp: "F6b 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        await richText(page, id, "Due today", 5, ["ControlOrMeta+KeyU", "ControlOrMeta+Shift+KeyX", "ControlOrMeta+KeyU"]);
        await until(async () => /<Text wrap=\{false\}>Due <TextRun strikethrough>today<\/TextRun><\/Text>/.test((await pageText(page, id)) ?? ""), { message: "Due <TextRun strikethrough>today</TextRun>" });
        const line = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"] .zen-text-run`, { hasText: "today" }).first().evaluate((element) => getComputedStyle(element).textDecorationLine);
        if (!/line-through/.test(line) || /underline/.test(line)) throw new Error(`the run is drawn with ${line}`);
        return `⌘U, ⇧⌘X, ⌘U on "today" → <TextRun strikethrough>today</TextRun> (${line})`;
      });
    },
  },
  {
    id: "FW-80", feature: "⇧⌘K opens the file dialog; a click on a frame places the picture as a Rectangle with the image fill, at its own size made to fit the frame (Figma's Place image)", wp: "F8 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        await pickPicture(page, ctx);
        const box = await walkBox(page, id).boundingBox();
        await page.mouse.click(box.x + 20, box.y + 20);
        await until(async () => Boolean(await pictureTag(page, id)), { message: "a Shape with the picture written" });
        const tag = await pictureTag(page, id);
        if (!/label="Bridge"/.test(tag) || !/data-name="Bridge"/.test(tag) || !/position="absolute"/.test(tag)) throw new Error(`the Shape: ${tag}`);
        const zoom = await page.evaluate(() => Number(getComputedStyle(document.querySelector(".studio-world")).getPropertyValue("--studio-zoom")) || 1).catch(() => 1);
        const [width, height] = [num(tag, "width"), num(tag, "height")];
        const ratio = await ownRatio(page, ctx);
        if (Math.abs(height / width - ratio) > 0.02) throw new Error(`ratio ${height / width} ≠ the picture's ${ratio}`);
        const frameWidth = await walkBox(page, id).evaluate((element) => element.clientWidth);
        if (width > frameWidth + 1) throw new Error(`${width} px wide in a ${frameWidth} px frame`);
        const painted = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Shape"][data-image]`).first().evaluate((element) => getComputedStyle(element).backgroundImage);
        if (!/url\("?blob:/.test(painted)) throw new Error(`the canvas paints ${painted}`);
        await until(async () => (await page.evaluate(() => document.querySelector(".studio-viewport")?.getAttribute("data-studio-drawing"))) === null, { message: "back to Move" });
        return `⇧⌘K + click → ${tag.slice(0, 120)}… (${width} × ${height}, zoom ${zoom})`;
      });
    },
  },
  {
    id: "FW-81", feature: "Place image by dragging: the picture at the dragged width, its own ratio kept", wp: "F8 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        await pickPicture(page, ctx);
        const box = await walkBox(page, id).boundingBox();
        await page.mouse.move(box.x + 10, box.y + 10);
        await page.mouse.down();
        await page.mouse.move(box.x + 60, box.y + 30, { steps: 4 });
        await page.mouse.move(box.x + 110, box.y + 40, { steps: 4 });
        await page.mouse.up();
        await until(async () => Boolean(await pictureTag(page, id)), { message: "the dragged picture written" });
        const tag = await pictureTag(page, id);
        const ratio = await ownRatio(page, ctx);
        const [width, height] = [num(tag, "width"), num(tag, "height")];
        if (Math.abs(height - width * ratio) > 1.5) throw new Error(`${width} × ${height}: not the picture's ratio ${ratio}`);
        return `drag → ${width} × ${height}`;
      });
    },
  },
  {
    id: "FW-82", feature: "A picture file dropped on a frame goes in where it fell (a free frame: at the point)", wp: "F8 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const box = await walkBox(page, id).boundingBox();
        const at = { x: Math.round(box.x + 30), y: Math.round(box.y + 25) };
        await page.evaluate(({ bytes, at }) => {
          const transfer = new DataTransfer();
          transfer.items.add(new File([new Uint8Array(bytes)], "Bridge.webp", { type: "image/webp" }));
          const target = document.elementFromPoint(at.x, at.y);
          for (const type of ["dragenter", "dragover", "drop"]) target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, clientX: at.x, clientY: at.y, dataTransfer: transfer }));
        }, { bytes: [...PICTURE(ctx)], at });
        await until(async () => Boolean(await pictureTag(page, id)), { message: "the dropped picture written" });
        // At the drop point, moved in where it would stick out of the frame (drawModel pictureBox).
        const placed = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Shape"][data-image]`).first().boundingBox();
        const inside = placed.x >= box.x - 1 && placed.y >= box.y - 1 && placed.x + placed.width <= box.x + box.width + 1 && placed.y + placed.height <= box.y + box.height + 1;
        const holds = at.x >= placed.x - 1 && at.x <= placed.x + placed.width + 1 && at.y >= placed.y - 1 && at.y <= placed.y + placed.height + 1;
        if (!inside || !holds || Math.abs(placed.x - at.x) > 3) throw new Error(`placed at ${placed.x}, ${placed.y} (${placed.width} × ${placed.height}), dropped at ${at.x}, ${at.y} in ${box.x}, ${box.y}`);
        return `drop → ${(await pictureTag(page, id)).slice(0, 100)}…`;
      });
    },
  },
  {
    id: "FW-83", feature: "⌘V with a picture on the clipboard (no layer copied) places it in the middle of the frame in view", wp: "F8 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        const before = ((await pageText(page, id)) ?? "").match(/<Shape /g)?.length ?? 0;
        await page.locator(".studio-viewport").focus();
        await page.evaluate((bytes) => {
          const transfer = new DataTransfer();
          transfer.items.add(new File([new Uint8Array(bytes)], "Bridge.webp", { type: "image/webp" }));
          (document.activeElement ?? document).dispatchEvent(new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true }));
        }, [...PICTURE(ctx)]);
        await until(async () => Boolean(await pictureTag(page, id)), { message: "the pasted picture written" }).catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 120)}`); });
        const after = ((await pageText(page, id)) ?? "").match(/<Shape /g)?.length ?? 0;
        if (after !== before + 1) throw new Error(`${after - before} Shapes added`);
        return `⌘V picture → ${(await pictureTag(page, id)).slice(0, 100)}…`;
      });
    },
  },
  {
    id: "FW-84", feature: "Fill › Image fit: Fit, Crop (Fill's visible part written as the crop) and Tile write the image fill's mode, one ⌘Z each", wp: "F8 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        await pickPicture(page, ctx);
        const box = await walkBox(page, id).boundingBox();
        await page.mouse.click(box.x + 20, box.y + 20);
        await until(async () => Boolean(await pictureTag(page, id)), { message: "the picture placed" });
        await chooseFit(page, "fit", async () => /imageFit="fit"/.test(await pictureTag(page, id)));
        await chooseFit(page, "crop", async () => /imageFit="crop" imageCrop=\{\{ x: [\d.]+, y: [\d.]+, width: [\d.]+, height: [\d.]+ \}\}/.test(await pictureTag(page, id)));
        await chooseFit(page, "tile", async () => /imageFit="tile"/.test(await pictureTag(page, id)) && !/imageCrop/.test(await pictureTag(page, id)));
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("ControlOrMeta+KeyZ");
        await until(async () => /imageFit="crop"/.test(await pictureTag(page, id)), { message: "one ⌘Z: Crop again" });
        return "Fit → Crop (crop written) → Tile; ⌘Z → Crop";
      });
    },
  },
  {
    id: "FW-85", feature: "Fill › Image: picking another picture replaces it and keeps how it fills (Figma's Replace image)", wp: "F8 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        await pickPicture(page, ctx);
        const box = await walkBox(page, id).boundingBox();
        await page.mouse.click(box.x + 20, box.y + 20);
        await until(async () => Boolean(await pictureTag(page, id)), { message: "the picture placed" });
        await chooseFit(page, "fit", async () => /imageFit="fit"/.test(await pictureTag(page, id)));
        const row = page.locator('#studio-right [data-prop="image-fill"]');
        await row.getByRole("button", { name: /^Image:/ }).click();
        const library = page.locator('[data-photo-group="library"] [role="option"], [data-photo-group="library"] [role="menuitem"], [data-photo-group="library"] button').first();
        await library.waitFor({ state: "visible", timeout: 5000 });
        await library.click();
        const tag = () => pageText(page, id).then((text) => (text ?? "").match(/<Shape image="zen-media:[^"]+"[^>]*data-name="Bridge"[^>]*\/>/)?.[0] ?? "");
        await until(async () => /imageFit="fit"/.test(await tag()), { message: "a library picture, still Fit" });
        return `replaced → ${(await tag()).slice(0, 90)}…`;
      });
    },
  },
  {
    id: "FW-86", feature: "Fill › − on the image removes the picture and its settings in one edit", wp: "F8 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        await pickPicture(page, ctx);
        const box = await walkBox(page, id).boundingBox();
        await page.mouse.click(box.x + 20, box.y + 20);
        await until(async () => Boolean(await pictureTag(page, id)), { message: "the picture placed" });
        const before = ((await pageText(page, id)) ?? "").match(/<Shape [^>]*data-name="Bridge"[^>]*\/>/)?.[0];
        await page.locator('#studio-right [data-prop="image-fill"]').getByRole("button", { name: "Remove image" }).click();
        await until(async () => !/image=/.test(((await pageText(page, id)) ?? "").match(/<Shape [^>]*data-name="Bridge"[^>]*\/>/)?.[0] ?? "image="), { message: "the picture removed" });
        return `${before?.slice(0, 60)}… → no image`;
      });
    },
  },
  {
    id: "FW-87", feature: "Crop on the canvas: Image fit → Crop shows the whole picture faint; a corner scales it and a drag moves it (one edit each, the layer's size kept); Esc ends the crop", wp: "F8b 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      return restoring(page, id, async () => {
        await pickPicture(page, ctx);
        const box = await walkBox(page, id).boundingBox();
        await page.mouse.click(box.x + 10, box.y + 10);
        await until(async () => Boolean(await pictureTag(page, id)), { message: "the picture placed" });
        const size = (await pictureTag(page, id)).match(/width=\{\d+\} height=\{\d+\}/)?.[0];
        await chooseFit(page, "crop", async () => /imageFit="crop"/.test(await pictureTag(page, id)));
        await page.locator(".studio-crop__picture").waitFor({ state: "visible", timeout: 5000 });
        const crop = async () => (await pictureTag(page, id)).match(/imageCrop=\{\{ x: ([\d.]+), y: ([\d.]+), width: ([\d.]+), height: ([\d.]+) \}\}/)?.slice(1).map(Number) ?? [];
        const corner = await page.locator('.studio-crop__handle[data-corner="se"]').boundingBox();
        await page.mouse.move(corner.x + 4, corner.y + 4);
        await page.mouse.down();
        await page.mouse.move(corner.x + 40, corner.y + 40, { steps: 5 });
        await page.mouse.up();
        await until(async () => ((await crop())[2] ?? 100) < 100, { message: "the corner scaled the picture" });
        const [, , width] = await crop();
        const layer = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Shape"][data-image]`).first().boundingBox();
        await page.mouse.move(layer.x + layer.width / 2, layer.y + layer.height / 2);
        await page.mouse.down();
        await page.mouse.move(layer.x + layer.width / 2 - 20, layer.y + layer.height / 2 - 20, { steps: 5 });
        await page.mouse.up();
        await until(async () => ((await crop())[0] ?? 0) > 0, { message: "the drag moved the picture" });
        const [x, y] = await crop();
        if ((await pictureTag(page, id)).match(/width=\{\d+\} height=\{\d+\}/)?.[0] !== size) throw new Error("the layer's size changed");
        await page.keyboard.press("Escape");
        await until(async () => (await page.locator(".studio-crop__picture").count()) === 0, { message: "Esc ends the crop" });
        return `corner → width ${width}%, drag → x ${x}%, y ${y}%; ${size} kept; Esc ends it`;
      });
    },
  },
  {
    id: "FW-115", feature: "P (Pen): three clicks and a click on the first point draw a closed vector at its X / Y in the frame; the tool goes back to Move", wp: "F9 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      const frame = await freeFrame(page, id);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("KeyP");
      await until(async () => (await page.locator('[role="toolbar"][aria-label="Tools"] [aria-label="Pen"]').getAttribute("aria-pressed")) === "true", { message: "the Pen" });
      for (const [x, y] of [[220, 60], [320, 60], [270, 160], [220, 60]]) { const at = frame.at(x, y); await page.mouse.click(at.x, at.y); await sleep(120); }
      await until(async () => vectorTags((await pageText(page, id)) ?? "").length === 1, { message: "a vector" }).catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 120)}`); });
      const [vector] = vectorTags((await pageText(page, id)) ?? "");
      const near = (a, b) => Math.abs(a - b) <= 2;
      if (!/^M [\d.]+ [\d.]+ L [\d.]+ [\d.]+ L [\d.]+ [\d.]+ L [\d.]+ [\d.]+ Z$/.test(vector.d ?? "")) throw new Error(`d = ${vector.d}`);
      if (!near(vector.x, 220) || !near(vector.y, 60) || !near(vector.w, 100) || !near(vector.h, 100)) throw new Error(`box ${vector.x}, ${vector.y}, ${vector.w} × ${vector.h} (want 220, 60, 100 × 100)`);
      await until(async () => (await page.locator('[role="toolbar"][aria-label="Tools"] [aria-label="Move"]').getAttribute("aria-pressed")) === "true", { message: "back to Move" });
      await until(async () => (await selectedSrc(page)).length === 1, { message: "the vector selected" });
      await undoTo(page, id, before);
      return `${vector.d} · ${vector.w} × ${vector.h} at ${vector.x}, ${vector.y} · Move · ⌘Z`;
    },
  },
  {
    id: "FW-116", feature: "Pen: a press-drag makes a smooth point (a curve), Enter ends the open path", wp: "F9 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      const frame = await freeFrame(page, id);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("KeyP");
      const a = frame.at(220, 120);
      await page.mouse.click(a.x, a.y);
      const b = frame.at(330, 120);
      const drag = frame.at(330, 180);
      await page.mouse.move(b.x, b.y);
      await page.mouse.down();
      await page.mouse.move(drag.x, drag.y, { steps: 6 });
      await page.mouse.up();
      await page.keyboard.press("Enter");
      await until(async () => vectorTags((await pageText(page, id)) ?? "").length === 1, { message: "a vector" }).catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 120)}`); });
      const [vector] = vectorTags((await pageText(page, id)) ?? "");
      if (!/^M [\d.]+ [\d.]+ C /.test(vector.d ?? "") || /Z/.test(vector.d ?? "")) throw new Error(`d = ${vector.d} (want an open M … C curve)`);
      await undoTo(page, id, before);
      return `${vector.d} · open curve · ⌘Z`;
    },
  },
  {
    id: "FW-117", feature: "Enter on a vector: vertex edit — drag a point, the path changes in one edit; Esc leaves", wp: "F9 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      const frame = await freeFrame(page, id);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("KeyP");
      for (const [x, y] of [[220, 60], [320, 60], [270, 160], [220, 60]]) { const at = frame.at(x, y); await page.mouse.click(at.x, at.y); await sleep(120); }
      await until(async () => vectorTags((await pageText(page, id)) ?? "").length === 1, { message: "a vector" });
      const drawn = (await pageText(page, id)) ?? "";
      await until(async () => (await selectedSrc(page)).length === 1, { message: "the vector selected" });
      await sleep(300);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Enter");
      const points = page.locator('[data-e2e="vector-edit"] .studio-vector__point');
      await until(async () => (await points.count()) === 3, { message: "three points in vertex edit" });
      // The bottom point (270, 160) dragged 20 px down.
      const bottom = frame.at(270, 160);
      await page.mouse.move(bottom.x, bottom.y);
      await page.mouse.down();
      await page.mouse.move(bottom.x, bottom.y + 20 * frame.scale, { steps: 5 });
      await page.mouse.up();
      await until(async () => { const [vector] = vectorTags((await pageText(page, id)) ?? ""); return Math.abs(vector.h - 120) <= 2; }, { message: "the vector 120 high" }).catch(async (error) => { throw new Error(`${error.message} (${JSON.stringify(vectorTags((await pageText(page, id)) ?? ""))}) · status: ${(await statusText(page)).slice(0, 120)}`); });
      await page.keyboard.press("Escape");
      await until(async () => (await points.count()) === 0, { message: "Esc leaves vertex edit" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await pageText(page, id)) === drawn, { message: "one ⌘Z undoes the point's move" });
      await undoTo(page, id, before);
      return "Enter → 3 points · drag → 120 high · Esc · ⌘Z";
    },
  },
  {
    id: "FW-118", feature: "⇧P (Pencil): a drag draws a smoothed vector; the Pencil stays on, Esc goes back to Move", wp: "F9 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      const frame = await freeFrame(page, id);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Shift+KeyP");
      await until(async () => (await page.locator('[role="toolbar"][aria-label="Tools"] [aria-label="Pencil"]').getAttribute("aria-pressed")) === "true", { message: "the Pencil" });
      const start = frame.at(220, 150);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      for (let k = 1; k <= 20; k++) { const at = frame.at(220 + k * 5, 150 - Math.sin((k / 20) * Math.PI) * 60); await page.mouse.move(at.x, at.y); await sleep(10); }
      await page.mouse.up();
      await until(async () => vectorTags((await pageText(page, id)) ?? "").length === 1, { message: "a vector" }).catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 120)}`); });
      const [vector] = vectorTags((await pageText(page, id)) ?? "");
      if (!/^M [\d.]+ [\d.]+ C /.test(vector.d ?? "")) throw new Error(`d = ${vector.d}`);
      if ((await page.locator('[role="toolbar"][aria-label="Tools"] [aria-label="Pencil"]').getAttribute("aria-pressed")) !== "true") throw new Error("the Pencil went off after a stroke");
      await page.keyboard.press("Escape");
      await until(async () => (await page.locator('[role="toolbar"][aria-label="Tools"] [aria-label="Move"]').getAttribute("aria-pressed")) === "true", { message: "Esc → Move" });
      await undoTo(page, id, before);
      return `${(vector.d.match(/C/g) ?? []).length} curves · ${vector.w} × ${vector.h} · Pencil stays · Esc → Move · ⌘Z`;
    },
  },
  {
    id: "FW-113", feature: "Delete with two frames selected deletes both in one edit; one ⌘Z brings both back", wp: "F3 2026-10-19 · F4 removeFrames", timeout: 40_000,
    async run(ctx) {
      const { page } = await twoScreensPage(ctx);
      const id = new URL(page.url()).searchParams.get("page").replace(/^local:/, "");
      const before = (await pageText(page, id)) ?? "";
      await showLeftTab(page, "layers");
      await page.locator('[data-layer-id="frame:screen:screen-1"]').click();
      await page.locator('[data-layer-id="frame:screen:screen-2"]').click({ modifiers: ["Shift"] });
      await until(async () => (await page.locator('.studio-frame[data-selected="true"]').count()) === 2, { message: "both frames selected" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Delete");
      await until(async () => !/<Screen id="screen-(1|2)"/.test((await pageText(page, id)) ?? ""), { message: "both Screens deleted" }).catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 120)}`); });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z brings both back" });
      return "2 frames → Delete → both gone · one ⌘Z";
    },
  },
  {
    id: "FW-114", feature: "Wrap in new section with two frames selected: one Section around both; Layers lists them under its row", wp: "F3 2026-10-19 · F4 sections", timeout: 40_000,
    async run(ctx) {
      const { page } = await twoScreensPage(ctx);
      const id = new URL(page.url()).searchParams.get("page").replace(/^local:/, "");
      const before = (await pageText(page, id)) ?? "";
      try {
        await showLeftTab(page, "layers");
        await page.locator('[data-layer-id="frame:screen:screen-1"]').click();
        await page.locator('[data-layer-id="frame:screen:screen-2"]').click({ modifiers: ["Shift"] });
        await until(async () => (await page.locator('.studio-frame[data-selected="true"]').count()) === 2, { message: "both frames selected" });
        await page.locator('[data-layer-id="frame:screen:screen-2"]').click({ button: "right" });
        const menu = page.getByRole("menu").last();
        await menu.waitFor({ state: "visible", timeout: 5000 });
        await menu.getByRole("menuitem", { name: /^Wrap in new section/ }).click();
        await until(async () => /<Section id="section-1"/.test((await pageText(page, id)) ?? ""), { message: "a Section" }).catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 120)}`); });
        const section = page.locator('[data-layer-id="frame:section:section-1"]');
        await section.waitFor({ state: "visible", timeout: 5000 });
        const levels = async () => page.locator(".studio-layers__tree [role='treeitem'][data-kind='frame']").evaluateAll((rows) => rows.map((row) => `${row.getAttribute("data-layer-id")}@${row.getAttribute("aria-level")}`));
        await until(async () => { const now = await levels(); return now.includes("frame:section:section-1@1") && now.includes("frame:screen:screen-1@2") && now.includes("frame:screen:screen-2@2"); }, { message: "both frames one level under the Section" }).catch(async (error) => { throw new Error(`${error.message} (${(await levels()).join(", ")})`); });
        const icons = await section.locator("[data-icon]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-icon")));
        if (!icons.some((name) => /browser/.test(name ?? ""))) throw new Error(`the Section row's icons: ${icons.join(", ")} (want icon-browser-line)`);
        return `Section 1 around both · Layers: ${(await levels()).join(", ")} · icon-browser-line`;
      } finally {
        await undoTo(page, id, before, 4).catch(() => undefined);
      }
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
      await expectPanelFits(page, "an auto layout frame's panel");
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
      await expectPanelFits(page, "the stroke");
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
      await expectPanelFits(page, "the turned frame's panel");
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
      await expectPanelFits(page, "a Zen instance's panel");
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
      // A longer name in the pill reads whole beside its value ("Medium 16", never "Medi…").
      await row.locator(".zen-select__trigger").first().focus();
      await page.keyboard.type("16");
      await page.keyboard.press("Enter");
      await written(page, id, /<Stack\b[^>]*gap="md"/, 'gap="md"');
      const pill = row.locator(".zen-select__trigger").first();
      await until(async () => (await pill.innerText()).trim() === "Medium", { message: "the Medium pill" });
      const cut = await pill.evaluate((el) => el.scrollWidth - el.clientWidth);
      if (cut > 0.5) throw new Error(`the pill cuts "Medium" by ${cut}px`);
      await shot(page, "fw-57-variable-pill");
      await undoTo(page, id, before);
      return `${typed} → ${name} (variable pill) · 16 → Medium, whole → ⌘Z`;
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
  // F5c · Export, typography, local styles, selection colors.
  {
    id: "FW-91", feature: "Export: + adds 1x PNG to a layer, and Export <layer> downloads <layer>.png", wp: "F5c 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await clickNamed(page, id, "Button");
      await until(async () => (await selectedName(page)) === "Button", { message: "the Button selected" });
      await press(page, "Add export setting");
      const scale = (await right(page).getByRole("button", { name: /^Scale/ }).first().innerText()).trim();
      const format = (await right(page).getByRole("button", { name: /^Format/ }).first().innerText()).trim();
      const [download] = await Promise.all([page.waitForEvent("download", { timeout: 20_000 }), press(page, "Export Button")]);
      const file = download.suggestedFilename();
      if (file !== "Button.png") throw new Error(`downloaded ${file}`);
      await press(page, "Remove export setting");
      return `${scale} ${format} → ${file}`;
    },
  },
  {
    id: "FW-92", feature: "A text's colour is its Fill section; Style details shows the text style's font and size read-only", wp: "F5c 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      const text = page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Text"]`).first();
      const box = await text.boundingBox();
      if (!box) throw new Error("no Text on the walk page");
      await page.keyboard.down("ControlOrMeta");
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.keyboard.up("ControlOrMeta");
      await until(async () => (await sections(page)).includes("Typography"), { message: "a text selected" });
      const headings = await sections(page);
      if (headings.indexOf("Fill") < headings.indexOf("Typography")) throw new Error(`no Fill after Typography: ${headings.join(", ")}`);
      await press(page, "Style details");
      const font = right(page).getByRole("textbox", { name: "Font", exact: true }).first();
      await font.waitFor({ state: "visible", timeout: 5000 });
      const value = await font.inputValue();
      if (!(await font.getAttribute("readonly") !== null)) throw new Error("the style's font is editable");
      await shot(page, "fw-92-text-style-details");
      await expectPanelFits(page, "a text's panel");
      return `${headings.join(", ")} · Font ${value}`;
    },
  },
  {
    id: "FW-93", feature: "With nothing selected, Local styles lists the text, color and effect styles (folded, with counts)", wp: "F5c 2026-10-19",
    async run(ctx) {
      const { page } = await walkPage(ctx);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await until(async () => (await sections(page)).includes("Local styles"), { message: "Local styles" });
      const toggle = right(page).getByRole("button", { name: /^Text styles · \d+ styles$/ }).first();
      const label = (await toggle.innerText()).trim();
      await toggle.click();
      const items = await right(page).getByRole("list", { name: "Text styles" }).getByRole("listitem").count();
      if (items < 10) throw new Error(`${items} text styles`);
      await toggle.click();
      return `${label} (${items} listed)`;
    },
  },
  {
    id: "FW-94", feature: "Selection colors lists the colours a frame and its layers paint with, by variable", wp: "F5c 2026-10-19",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await selectBody(page, id);
      await until(async () => (await sections(page)).includes("Selection colors"), { message: "Selection colors" });
      const rows = await right(page).locator('[data-prop="selection-color"]').count();
      if (rows < 2) throw new Error(`${rows} colours`);
      await shot(page, "fw-94-selection-colors");
      await expectPanelFits(page, "the selection colors");
      return `${rows} colours`;
    },
  },
  // F7 · components: sets, variants, properties.
  {
    id: "FW-70", feature: "Combine as variants on two main components: one component set around them, named in Layers; one ⌘Z", wp: "F7 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await setsPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      return restoring(page, id, async () => {
        await deepSelect(page, marked(page, id, "data-zen-main", "tag-small"));
        await deepSelect(page, marked(page, id, "data-zen-main", "tag-large"), true);
        // Several layers: the header says how many, the second one has the extra outline (selectedSrc is the first's).
        await until(async () => (await selectedName(page)) === "2 layers" || (await page.locator(".studio-selection__outline[data-kind='extra']").count()) === 1, { message: "both mains selected" }).catch(async (error) => { throw new Error(`${error.message} · header ${await selectedName(page)}`); });
        const box = await marked(page, id, "data-zen-main", "tag-large").boundingBox();
        await page.mouse.click(box.x + 4, box.y + 4, { button: "right" });
        const menu = page.getByRole("menu").last();
        await menu.waitFor({ state: "visible", timeout: 5000 });
        await menu.getByRole("menuitem", { name: /^Combine as variants/ }).click();
        await written(page, id, /<ComponentSet id="[^"]+" name="[^"]+">\s*<Component id="tag-small" name="Tag small">[\s\S]*?<Component id="tag-large" name="Tag large">[\s\S]*?<\/ComponentSet>/, "one set around both mains").catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 120)}`); });
        const name = /<ComponentSet id="[^"]+" name="([^"]+)">\s*<Component id="tag-small"/.exec((await pageText(page, id)) ?? "")[1];
        // Selected, the set is named in the header and in Layers (which opens the way to the selection).
        await deepSelect(page, page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-set-name="${name}"]`).first());
        await until(async () => (await selectedName(page)) === name, { message: `the set ${name} selected` });
        await until(async () => (await page.locator("#studio-left .studio-layers__name").allInnerTexts()).some((row) => row.trim() === name), { message: `Layers names the set ${name}` });
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("ControlOrMeta+KeyZ");
        await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z" });
        return `${name}: Tag small + Tag large · Layers row · one ⌘Z`;
      });
    },
  },
  {
    id: "FW-71", feature: "A component set's Add variant copies the last variant with its next value (Size = Variant3); one ⌘Z", wp: "F7 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await setsPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      return restoring(page, id, async () => {
        await deepSelect(page, marked(page, id, "data-zen-set", "chip"));
        await until(async () => (await selectedName(page)) === "Chip", { message: "the Chip set selected" });
        await until(async () => (await sections(page)).includes("Component set"), { message: "the Component set section" });
        await shot(page, "fw-71-set");
        await expectPanelFits(page, "the set's panel");
        await right(page).getByRole("button", { name: "Add variant", exact: true }).click();
        await written(page, id, /<Component id="[^"]+" variant=\{\{ Size: "Variant3" \}\}>\s*<Stack direction="row" gap="sm" padding="md">/, "a third variant, a copy of Large").catch(async (error) => { const text = (await pageText(page, id)) ?? ""; const set = text.slice(text.indexOf("<ComponentSet"), text.indexOf("</ComponentSet>")).replace(/\s+/g, " "); throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 100)} · ${set.slice(-700)}`); });
        await until(async () => (await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-variant]`).count()) === 3, { message: "three variants on the canvas" });
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("ControlOrMeta+KeyZ");
        await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z" });
        return "Chip › Add variant: Size=Variant3 (copy of Large) · one ⌘Z";
      });
    },
  },
  {
    id: "FW-72", feature: "Properties + on a set adds a boolean property (on by default); renaming it rewrites its name", wp: "F7 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await setsPage(ctx);
      return restoring(page, id, async () => {
        await deepSelect(page, marked(page, id, "data-zen-set", "chip"));
        await until(async () => (await selectedName(page)) === "Chip", { message: "the Chip set selected" });
        await right(page).getByRole("button", { name: "Add property", exact: true }).click();
        await page.getByRole("menuitem", { name: "Boolean", exact: true }).click();
        await written(page, id, /"Show icon": \{ type: "boolean", default: true \}, "Property 3": \{ type: "boolean", default: true \}/, "Property 3, a boolean, on");
        await typeText(page, "Boolean property name", "Shadow", 1);
        await written(page, id, /"Show icon": \{ type: "boolean", default: true \}, Shadow: \{ type: "boolean", default: true \}/, "renamed Shadow");
        await shot(page, "fw-72-properties");
        await expectPanelFits(page, "the set's properties");
        return "Chip › + Boolean: Property 3 → Shadow";
      });
    },
  },
  {
    id: "FW-73", feature: "Apply component property on a variant's text: None unbinds it; Create text property… adds one with its words and binds it", wp: "F7 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await setsPage(ctx);
      return restoring(page, id, async () => {
        const label = page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Text"]`).filter({ hasText: /^Filter$/ }).first();
        const box = await label.boundingBox();
        await page.keyboard.down("ControlOrMeta");
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.keyboard.up("ControlOrMeta");
        await until(async () => (await sections(page)).includes("Component property"), { message: "a variant's text selected (Component property)" });
        await chooseIn(page, "bind-text", "None");
        await written(page, id, /<Text>Filter<\/Text>/, "the text unbound");
        await chooseIn(page, "bind-text", "Create text property…");
        await written(page, id, /"Property 3": \{ type: "text", default: "Filter" \}[\s\S]*<Text data-prop-text="Property 3">Filter<\/Text>/, "Property 3 = Filter, bound");
        return "None → unbound · Create text property… → Property 3 (Filter), bound";
      });
    },
  },
  {
    id: "FW-74", feature: "An instance of a set: its variant and properties switch in the panel (the icon hides), Reset all changes clears them", wp: "F7 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await setsPage(ctx);
      return restoring(page, id, async () => {
        const instance = page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-instance]`).first();
        const box = await instance.boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await until(async () => (await selectedName(page)) === "Chip", { message: "the Chip instance selected" });
        await chooseIn(page, "instance-variant", "Large");
        await written(page, id, /<Use of="chip" variant=\{\{ Size: "Large" \}\} \/>/, "Size = Large");
        // A boolean property is a switch (ToggleButton).
        await right(page).getByRole("switch", { name: "Show icon", exact: true }).click();
        await written(page, id, /<Use of="chip" variant=\{\{ Size: "Large" \}\} props=\{\{ "Show icon": false \}\} \/>/, "Show icon off");
        await until(async () => (await instance.locator(".zen-icon").count()) === 0, { message: "the instance's icon hidden" });
        await typeText(page, "Label", "Done");
        await written(page, id, /props=\{\{ "Show icon": false, Label: "Done" \}\}/, "Label = Done");
        await until(async () => /Done/.test(await instance.innerText()), { message: "the instance reads Done" });
        await shot(page, "fw-74-instance");
        await expectPanelFits(page, "the instance's panel");
        await right(page).getByRole("button", { name: "Reset all changes", exact: true }).click();
        await written(page, id, /<Use of="chip" \/>/, "all changes reset");
        return "Size › Large · Show icon off (icon hidden) · Label Done · Reset all changes";
      });
    },
  },
  {
    id: "FW-75", feature: "A main's description and link (Figma's Edit component) write description and link; emptied, they go", wp: "F7 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await setsPage(ctx);
      return restoring(page, id, async () => {
        await deepSelect(page, marked(page, id, "data-zen-main", "tag-small"));
        await until(async () => (await selectedName(page)) === "Tag small", { message: "Tag small selected" });
        await typeText(page, "Description", "A small tag");
        await written(page, id, /<Component id="tag-small" name="Tag small" description="A small tag">/, "its description");
        await typeText(page, "Link", "https://zen.example/tag");
        await written(page, id, /description="A small tag" link="https:\/\/zen.example\/tag">/, "its link");
        await shot(page, "fw-75-about");
        await expectPanelFits(page, "the main's panel");
        await typeText(page, "Description", "");
        await written(page, id, /<Component id="tag-small" name="Tag small" link="https:\/\/zen.example\/tag">/, "the description gone");
        return "description, link, description emptied";
      });
    },
  },
  {
    id: "FW-76", feature: "Swap instance lists the page's sets and mains; swapping to a lone main drops the set's variant and values", wp: "F7 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await setsPage(ctx);
      return restoring(page, id, async () => {
        const instance = page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-instance]`).first();
        const box = await instance.boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await until(async () => (await selectedName(page)) === "Chip", { message: "the Chip instance selected" });
        await chooseIn(page, "instance-variant", "Large");
        await written(page, id, /<Use of="chip" variant=\{\{ Size: "Large" \}\} \/>/, "Size = Large");
        // The swap select is named "Component" and reads its value ("Component Chip").
        await right(page).getByRole("button", { name: /^Component Chip/ }).first().click();
        const options = (await page.getByRole("option").allInnerTexts()).map((text) => text.trim());
        for (const name of ["Chip", "Tag small", "Tag large"]) if (!options.includes(name)) throw new Error(`Swap lists ${options.join(", ")}`);
        await page.getByRole("option", { name: "Tag large", exact: true }).click();
        await written(page, id, /<Use of="tag-large" \/>/, "the instance of Tag large, no variant");
        return `Swap lists ${options.join(", ")} · Chip (Large) → Tag large`;
      });
    },
  },
  // F7b · overrides inside an instance.
  {
    id: "FW-77", feature: "⌘-click into an instance selects a layer inside it; its words change for this instance only (an override)", wp: "F7b 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await setsPage(ctx);
      return restoring(page, id, async () => {
        const instance = marked(page, id, "data-zen-instance", "tag-small");
        await deepInto(page, instance.getByText("Small", { exact: true }));
        await until(async () => (await sections(page)).includes("Layer"), { message: "the layer inside the instance selected (Layer section)" }).catch(async (error) => { throw new Error(`${error.message} · header ${await selectedName(page)} · sections ${(await sections(page)).join(", ")} · selected ${JSON.stringify(await selectedSrc(page))}`); });
        await shot(page, "fw-77-layer-in-instance");
        await expectPanelFits(page, "the layer's panel");
        await typeText(page, "Text", "Hey");
        await written(page, id, /<Use of="tag-small" overrides=\{\{ Text: \{ children: "Hey" \} \}\} \/>/, "the instance's override of its Text");
        await until(async () => (await instance.innerText()).trim() === "Hey", { message: "the instance reads Hey" });
        const main = (await marked(page, id, "data-zen-main", "tag-small").innerText()).trim();
        if (main !== "Small") throw new Error(`the main reads ${main}`);
        return "⌘-click Small → Text Hey: override on this instance, main still Small";
      });
    },
  },
  {
    id: "FW-78", feature: "Hiding a layer inside an instance is an override; the instance's Reset all changes brings it back", wp: "F7b 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await setsPage(ctx);
      return restoring(page, id, async () => {
        const instance = marked(page, id, "data-zen-instance", "tag-small");
        await deepInto(page, instance.getByText("Small", { exact: true }));
        await until(async () => (await sections(page)).includes("Layer"), { message: "the layer inside the instance selected" });
        const panel = async () => `header ${await selectedName(page)} · sections ${(await sections(page)).join(", ")} · buttons ${(await right(page).getByRole("button").allInnerTexts()).map((text) => text.trim()).filter(Boolean).slice(0, 8).join(" | ")}`;
        await right(page).getByRole("switch", { name: "Show layer", exact: true }).click({ timeout: 5000 }).catch(async (error) => { throw new Error(`Show layer: ${error.message.split("\n")[0]} · ${await panel()}`); });
        await written(page, id, /<Use of="tag-small" overrides=\{\{ Text: \{ hidden: true \} \}\} \/>/, "the layer hidden in this instance");
        await until(async () => (await instance.getByText("Small", { exact: true }).count()) === 0, { message: "the instance draws no text" });
        await right(page).getByRole("button", { name: "Select Tag small", exact: true }).click({ timeout: 5000 }).catch(async (error) => { throw new Error(`Select Tag small: ${error.message.split("\n")[0]} · ${await panel()}`); });
        await until(async () => (await selectedName(page)) === "Tag small", { message: "the instance selected again" });
        await right(page).getByRole("button", { name: "Reset all changes", exact: true }).click({ timeout: 5000 }).catch(async (error) => { throw new Error(`Reset all changes: ${error.message.split("\n")[0]} · ${await panel()} · ${((await pageText(page, id)) ?? "").match(/<Use of="tag-small"[^\n]*/)?.[0]}`); });
        await written(page, id, /<Use of="tag-small" \/>/, "Reset all changes");
        return "Show layer off → hidden override · Select Tag small · Reset all changes";
      });
    },
  },
  {
    id: "FW-79", feature: "Push changes to main component: the main takes the instance's change, every instance shows it, the instance keeps none", wp: "F7b 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await setsPage(ctx);
      return restoring(page, id, async () => {
        const instance = marked(page, id, "data-zen-instance", "tag-small");
        await deepInto(page, instance.getByText("Small", { exact: true }));
        await until(async () => (await sections(page)).includes("Layer"), { message: "the layer inside the instance selected" });
        await typeText(page, "Text", "Big");
        await written(page, id, /overrides=\{\{ Text: \{ children: "Big" \} \}\}/, "the override");
        await right(page).getByRole("button", { name: "Push changes to main", exact: true }).click();
        await written(page, id, /<Component id="tag-small" name="Tag small">\s*<Stack[^>]*>\s*<Text>Big<\/Text>[\s\S]*<Use of="tag-small" \/>/, "the main says Big, the instance keeps no override");
        await until(async () => (await marked(page, id, "data-zen-main", "tag-small").innerText()).trim() === "Big", { message: "the main reads Big" });
        return "Text Big (override) → Push changes to main: main Big, instance plain";
      });
    },
  },
  {
    id: "FW-95", feature: "A nested instance inside an instance: its variant changes for the outer instance only", wp: "F7b 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await setsPage(ctx);
      return restoring(page, id, async () => {
        const toolbar = marked(page, id, "data-zen-instance", "toolbar");
        // The nested Chip's own frame, in its padding: the nested instance, not a layer inside it.
        const chip = toolbar.locator(".zen-stack").first();
        const box = await chip.boundingBox();
        await page.keyboard.down("ControlOrMeta");
        await page.mouse.click(box.x + 3, box.y + 3);
        await page.keyboard.up("ControlOrMeta");
        await until(async () => (await sections(page)).includes("Instance"), { message: "the nested instance selected (its Instance section)" });
        await chooseIn(page, "local-nested-variant", "Large");
        await written(page, id, /<Use of="toolbar" overrides=\{\{ Chip: \{ "variant\.Size": "Large" \} \}\} \/>/, "the nested Chip's Size in this Toolbar only");
        await shot(page, "fw-95-nested-instance");
        await expectPanelFits(page, "the nested instance's panel");
        return "Toolbar › Chip: Size Large as an override of this Toolbar";
      });
    },
  },
  {
    id: "FW-97", feature: "A layer inside a nested instance (⌘-click through the Toolbar into its Tag's text): its words change for this Toolbar only", wp: "F7b 2026-10-20", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await setsPage(ctx);
      return restoring(page, id, async () => {
        const toolbar = marked(page, id, "data-zen-instance", "toolbar");
        await deepInto(page, toolbar.getByText("Small", { exact: true }));
        await until(async () => (await sections(page)).includes("Layer"), { message: "the layer inside the nested instance selected (Layer section)" }).catch(async (error) => { throw new Error(`${error.message} · header ${await selectedName(page)} · sections ${(await sections(page)).join(", ")}`); });
        await typeText(page, "Text", "Deep");
        await written(page, id, /<Use of="toolbar" overrides=\{\{ "Tag small\/Text": \{ children: "Deep" \} \}\} \/>/, "the Toolbar's override of the Text inside its Tag");
        await until(async () => (await toolbar.innerText()).includes("Deep"), { message: "the Toolbar reads Deep" });
        const main = await marked(page, id, "data-zen-main", "toolbar").innerText();
        if (main.includes("Deep")) throw new Error(`the Toolbar main reads ${main.trim()}`);
        await shot(page, "fw-97-deep-layer");
        await expectPanelFits(page, "the deep layer's panel");
        return "Toolbar › Tag small › Text Deep: an override of this Toolbar only (main unchanged)";
      });
    },
  },
  {
    id: "FW-98", feature: "Appearance's ◐ Blend mode (Figma UI3): Multiply writes blendMode=\"multiply\" and the layer draws with mix-blend-mode multiply; Pass through removes it", wp: "F5 blend 2026-10-20",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await selectBody(page, id);
      const blend = right(page).getByRole("button", { name: "Blend mode", exact: true });
      await blend.click();
      await page.getByRole("option", { name: "Multiply", exact: true }).click();
      await written(page, id, /<Stack\b[^>]*blendMode="multiply"/, "blendMode=\"multiply\"");
      await until(async () => page.evaluate(() => {
        const layer = document.querySelector('.studio-world [data-blend="multiply"]');
        return Boolean(layer) && getComputedStyle(layer).mixBlendMode === "multiply";
      }), { message: "the layer draws with mix-blend-mode multiply" });
      await shot(page, "fw-98-blend-mode");
      await expectPanelFits(page, "the Appearance section with its blend");
      await blend.click();
      await page.getByRole("option", { name: "Pass through", exact: true }).click();
      await written(page, id, /<Stack\b[^>]*blendMode=/, "blendMode removed at Pass through", true);
      return "◐ → Multiply → blendMode=\"multiply\", mix-blend-mode multiply → Pass through → removed";
    },
  },
  {
    id: "FW-99", feature: "A Zen instance's layer menu (Figma's): Reset all changes takes its written props back to the defaults in one edit (one ⌘Z), and Go to main component opens its page on the Main component frame", wp: "re-measure K-70 2026-10-21", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      const openMenu = async () => {
        await clickNamed(page, id, "Button");
        await until(async () => (await selectedName(page)) === "Button", { message: "the Button selected" });
        const box = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Button"]`).first().boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
        const menu = page.getByRole("menu").last();
        await menu.waitFor({ state: "visible", timeout: 5000 });
        return menu;
      };
      let menu = await openMenu();
      const reset = menu.getByRole("menuitem", { name: /^Reset all changes/ });
      await until(async () => (await reset.count()) > 0 && !(await reset.isDisabled()), { message: "Reset all changes on (the Button writes its level)" });
      await reset.click();
      await written(page, id, /<Button\b[^>]*level=/, "the Button's level reset", true);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+z");
      await written(page, id, /<Button level="primary">Save/, "one ⌘Z brings it back");
      menu = await openMenu();
      await menu.getByRole("menuitem", { name: /^Go to main component/ }).click();
      await until(async () => /[?&]page=button\b/.test(page.url()), { timeout: 15_000, message: "the Button page open" });
      await until(async () => (await page.locator('[data-studio-frame="main-component"]').first().getAttribute("data-selected").catch(() => null)) === "true", { timeout: 15_000, message: "its Main component frame selected" });
      await shot(page, "fw-99-go-to-main");
      return "Reset all changes → level gone · ⌘Z → back · Go to main component → the Button page, Main component selected";
    },
  },
  {
    id: "FW-141", feature: "A Zen instance's Appearance (Figma's): opacity 40 % and ◐ Multiply write opacity / blendMode on the Button, its root draws them, the eye is there; 100 % and Pass through take them away", wp: "re-measure K-74 2026-10-21",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await clickNamed(page, id, "Button");
      await until(async () => (await selectedName(page)) === "Button", { message: "the Button selected" });
      if (!(await right(page).getByRole("button", { name: "Hide", exact: true }).count())) throw new Error("no eye in the Button's Appearance");
      await typeNumber(page, "Opacity", 40);
      await written(page, id, /<Button\b[^>]*opacity=\{40\}/, "opacity={40}");
      const blend = right(page).getByRole("button", { name: "Blend mode", exact: true });
      await blend.click();
      await page.getByRole("option", { name: "Multiply", exact: true }).click();
      await written(page, id, /<Button\b[^>]*blendMode="multiply"/, "blendMode=\"multiply\"");
      await until(async () => page.evaluate((key) => {
        const button = document.querySelector(`.studio-world [data-zen-src^="local:${key}.zen.tsx:"][data-zen-name="Button"]`);
        if (!button) return false;
        const style = getComputedStyle(button);
        return style.opacity === "0.4" && style.mixBlendMode === "multiply";
      }, id), { message: "the Button draws at 40 % in Multiply" });
      await shot(page, "fw-141-instance-appearance");
      await expectPanelFits(page, "a Button's Appearance");
      await typeNumber(page, "Opacity", 100);
      await blend.click();
      await page.getByRole("option", { name: "Pass through", exact: true }).click();
      await written(page, id, /<Button\b[^>]*(opacity=|blendMode=)/, "100 % and Pass through write nothing", true);
      return "Opacity 40 % + Multiply → opacity={40} blendMode=\"multiply\", drawn so · 100 % + Pass through → removed";
    },
  },
  {
    id: "FW-142", feature: "The Design panel heads a frame Frame and a group Group (Figma UI3), its code name on hover", wp: "re-measure 2026-10-21", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await selectBody(page, id);
      const heading = right(page).locator("h2").first();
      await until(async () => (await selectedName(page)) === "Frame", { message: "the body Stack heads Frame" });
      const hover = await heading.getAttribute("title");
      if (hover !== "Stack") throw new Error(`its code name on hover reads ${hover}`);
      const clip = await clipPage(ctx);
      const before = (await pageText(clip.page, clip.id)) ?? "";
      try {
        await selectShapes(clip.page, clip.id, [0, 1]);
        await clip.page.locator(".studio-viewport").focus();
        await clip.page.keyboard.press("ControlOrMeta+KeyG");
        await until(async () => / group>/.test((await pageText(clip.page, clip.id)) ?? ""), { message: "a group" });
        await until(async () => (await selectedName(clip.page)) === "Group", { message: "the group heads Group" });
      } finally {
        await undoTo(clip.page, clip.id, before, 4).catch(() => undefined);
      }
      return "Stack → Frame (title Stack) · ⌘G → Group";
    },
  },
  {
    id: "FW-180", feature: "Appearance › Corner smoothing (Figma's, beside the independent corners): 60 % writes cornerSmoothing={60} and the frame draws squircle corners (corner-shape where the browser has it); 0 takes it away", wp: "parity ❌ corner smoothing 2026-10-22",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await selectBody(page, id);
      const corners = right(page).getByRole("button", { name: "Independent corners", exact: true });
      if ((await corners.getAttribute("aria-pressed")) !== "true") await corners.click();
      await typeNumber(page, "Corner smoothing", 60);
      await written(page, id, /<Stack\b[^>]*cornerSmoothing=\{60\}/, "cornerSmoothing={60}");
      await until(async () => page.evaluate(() => {
        const layer = document.querySelector('.studio-world [data-corner-smoothing="true"]');
        if (!layer) return false;
        const style = getComputedStyle(layer);
        // Chromium draws it (corner-shape); elsewhere the attribute and its superellipse are what the code gives.
        return style.getPropertyValue("--zen-corner-shape").trim() === "superellipse(2)" && (!("cornerShape" in style) || /superellipse/.test(style.cornerShape));
      }), { message: "the frame draws superellipse(2) corners" });
      await shot(page, "fw-180-corner-smoothing");
      await expectPanelFits(page, "the corners with Corner smoothing");
      await typeNumber(page, "Corner smoothing", 0);
      await written(page, id, /cornerSmoothing=/, "cornerSmoothing removed at 0", true);
      return "Independent corners → Corner smoothing 60 % → cornerSmoothing={60}, superellipse(2) → 0 → removed";
    },
  },
  {
    id: "FW-150", feature: "A shape's layer menu has Flip horizontal ⇧H and Flip vertical ⇧V right after Lock (Figma's place); Flip horizontal writes flip=\"horizontal\", one ⌘Z takes it back", wp: "re-measure §2a menus 2026-10-21", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShape(page, id, 0);
      const menu = await menuOn(page, await clipShape(page, id, 0).boundingBox());
      const items = await menuItems(menu);
      const at = items.findIndex((item) => /^Lock\b/.test(item.text));
      const flips = items.slice(at + 1, at + 3).map((item) => item.text);
      if (at < 0 || !/^Flip horizontal ⇧H$/.test(flips[0] ?? "") || !/^Flip vertical ⇧V$/.test(flips[1] ?? "")) throw new Error(`after Lock: ${flips.join(" | ")} (menu: ${items.map((item) => item.text).join(" | ")})`);
      if (items[at + 1].disabled || items[at + 2].disabled) throw new Error("Flip is dimmed on a shape");
      await menu.getByRole("menuitem", { name: /^Flip horizontal/ }).click();
      await written(page, id, /<Shape type="rectangle"[^>]*flip="horizontal"/, "flip=\"horizontal\" on the rectangle");
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+z");
      await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z: no flip" });
      return "… Lock · Flip horizontal ⇧H · Flip vertical ⇧V … → flip=\"horizontal\" → one ⌘Z";
    },
  },
  {
    id: "FW-151", feature: "Flip vertical in the menu of two floating shapes flips both and mirrors their places across their box, one ⌘Z", wp: "re-measure §2a menus 2026-10-21", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShapes(page, id, [0, 1]);
      const menu = await menuOn(page, await clipShape(page, id, 1).boundingBox());
      await menu.getByRole("menuitem", { name: /^Flip vertical/ }).click();
      // Rectangle Y 20 H 60, ellipse Y 40 H 60: their box is Y 20…100, so they trade places (Y 40, Y 20).
      await until(async () => { const text = (await pageText(page, id)) ?? ""; const shapes = shapeTags(text); return (text.match(/flip="vertical"/g) ?? []).length === 2 && shapes[0].y === 40 && shapes[1].y === 20; }, { message: "both flipped, the rectangle at Y 40, the ellipse at Y 20" }).catch(async (error) => { throw new Error(`${error.message} (${shapeTags((await pageText(page, id)) ?? "").map((shape) => shape.y).join(", ")})`); });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+z");
      await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z: both back" });
      return "two shapes → Flip vertical → flipped, Y 40 · Y 20 → one ⌘Z";
    },
  },
  {
id: "FW-152", feature: "A Button's layer menu has no Flip: only frames and shapes flip (as Flatten shows on shapes only), so a component's long menu stays in the window", wp: "re-measure §2a menus 2026-10-21",
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await clickNamed(page, id, "Button");
      await until(async () => (await selectedName(page)) === "Button", { message: "the Button selected" });
      const menu = await menuOn(page, await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Button"]`).first().boundingBox());
      const items = await menuItems(menu);
      await page.keyboard.press("Escape");
      if (!items.some((item) => /^Lock\b/.test(item.text))) throw new Error(`no Lock (menu: ${items.map((item) => item.text).join(" | ")})`);
      const flips = items.filter((item) => /^Flip /.test(item.text));
      if (flips.length) throw new Error(`a Button's menu offers ${flips.map((item) => item.text).join(", ")}`);
      return `${items.length} items, no Flip`;
    },
  },
  {
    id: "FW-153", feature: "Right-click the empty canvas: Paste here, dimmed with nothing copied; after ⌘C on a shape it makes a frame of its size with its corner at the pointer, the shape at X 0 Y 0 inside, selected; one ⌘Z", wp: "re-measure §2a menus 2026-10-21", timeout: 60_000,
    async run(ctx) {
      let { page, id } = await clipPage(ctx);
      await forgetClipboard(page);
      ({ page, id } = await clipPage(ctx));
      const before = (await pageText(page, id)) ?? "";
      let spot = await emptySpot(page);
      let menu = await menuOn(page, { x: spot.x, y: spot.y, width: 0, height: 0 });
      const first = (await menuItems(menu))[0];
      await page.keyboard.press("Escape");
      if (first?.text !== "Paste here" || !first.disabled) throw new Error(`nothing copied: the menu starts ${first?.text} (${first?.disabled ? "dimmed" : "on"})`);
      await selectShape(page, id, 0);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyC");
      await until(async () => /Copied/i.test(await statusText(page)), { timeout: 3000, message: '"Copied"' });
      await deselect(page);
      spot = await emptySpot(page);
      menu = await menuOn(page, { x: spot.x, y: spot.y, width: 0, height: 0 });
      const paste = menu.getByRole("menuitem", { name: /^Paste here/ });
      await until(async () => !(await paste.isDisabled()), { timeout: 3000, message: "Paste here on" });
      await paste.click();
      await until(async () => /<Screen id="screen-2"/.test((await pageText(page, id)) ?? ""), { message: "a new frame" }).catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 120)}`); });
      const text = (await pageText(page, id)) ?? "";
      const frame = boardTag(text, "Screen", "screen-2");
      const inside = text.slice(text.indexOf('<Screen id="screen-2"'), text.indexOf("</Screen>", text.indexOf('<Screen id="screen-2"')));
      const shape = shapeTags(inside)[0];
      const want = spot.board(numberAttr(boardTag(text, "Screen", "screen-1"), "x"), numberAttr(boardTag(text, "Screen", "screen-1"), "y"));
      const problems = [
        !/title="Frame 2"/.test(frame) && "not named Frame 2",
        (numberAttr(frame, "width") !== 100 || numberAttr(frame, "height") !== 100) && `${numberAttr(frame, "width")} × ${numberAttr(frame, "height")} (want 100 × 100: an 80 × 60 shape, a frame is 100 at least)`,
        (Math.abs(numberAttr(frame, "x") - want.x) > 3 || Math.abs(numberAttr(frame, "y") - want.y) > 3) && `at ${numberAttr(frame, "x")}, ${numberAttr(frame, "y")} (pointer ${want.x}, ${want.y})`,
        (shape?.type !== "rectangle" || shape.x !== 0 || shape.y !== 0) && `inside: ${shape?.type} at ${shape?.x}, ${shape?.y}`,
      ].filter(Boolean);
      if (problems.length) throw new Error(problems.join(" · "));
      await until(async () => (await page.locator('[data-studio-frame="screen:screen-2"]').getAttribute("data-selected")) === "true", { message: "the new frame selected" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+z");
      await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z: the frame gone (the row's pin with it)" });
      return `dimmed · ⌘C → Paste here → Frame 2 at ${numberAttr(frame, "x")}, ${numberAttr(frame, "y")}, 100 × 100, the rectangle at 0, 0 → one ⌘Z`;
    },
  },
  {
    id: "FW-154", feature: "⌘C on a frame, then Paste here on the empty canvas: a copy of the frame with its corner at the pointer, selected; one ⌘Z", wp: "re-measure §2a menus 2026-10-21", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectFrame(page, "screen:screen-1");
      await page.locator(".studio-viewport").focus();
      await until(async () => { await page.keyboard.press("ControlOrMeta+KeyC"); await sleep(400); return /Copied frame/.test(await statusText(page)); }, { timeout: 8000, message: '"Copied frame"' });
      await deselect(page);
      const spot = await emptySpot(page);
      const menu = await menuOn(page, { x: spot.x, y: spot.y, width: 0, height: 0 });
      await menu.getByRole("menuitem", { name: /^Paste here/ }).click();
      await until(async () => /<Screen id="screen-2"/.test((await pageText(page, id)) ?? ""), { message: "a copy of the frame" }).catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 120)}`); });
      const text = (await pageText(page, id)) ?? "";
      const copy = boardTag(text, "Screen", "screen-2");
      const want = spot.board(numberAttr(boardTag(text, "Screen", "screen-1"), "x"), numberAttr(boardTag(text, "Screen", "screen-1"), "y"));
      if (Math.abs(numberAttr(copy, "x") - want.x) > 3 || Math.abs(numberAttr(copy, "y") - want.y) > 3) throw new Error(`the copy at ${numberAttr(copy, "x")}, ${numberAttr(copy, "y")} (pointer ${want.x}, ${want.y})`);
      if (!/<Shape\b/.test(text.slice(text.indexOf('<Screen id="screen-2"')))) throw new Error("the copy holds no shapes");
      await until(async () => (await page.locator('[data-studio-frame="screen:screen-2"]').getAttribute("data-selected")) === "true", { message: "the copy selected" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+z");
      await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z: the copy gone (the row's pin with it)" });
      return `⌘C on the frame → Paste here → its copy at ${numberAttr(copy, "x")}, ${numberAttr(copy, "y")} → one ⌘Z`;
    },
  },
  {
    id: "FW-96", feature: "Assets › Local components shows a component set as one tile; a click adds an instance of the set", wp: "F7b 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await setsPage(ctx);
      return restoring(page, id, async () => {
        const stack = await page.locator('[data-studio-frame="screen:screen-1"] .zen-stack').first().boundingBox();
        await page.mouse.click(stack.x + stack.width - 6, stack.y + stack.height - 6);
        await page.locator("#studio-left").getByRole("tab", { name: "Assets" }).click();
        const tiles = page.locator("#studio-left").getByRole("list", { name: "Local components" }).getByRole("button");
        await tiles.first().waitFor({ state: "visible", timeout: 5000 });
        const names = (await tiles.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")))).filter(Boolean);
        if (!names.includes("Chip, component set") || names.some((name) => /^Size=/.test(name))) throw new Error(`Local components: ${names.join(" · ")}`);
        const before = (((await pageText(page, id)) ?? "").match(/<Use of="chip" \/>/g) ?? []).length;
        await page.locator("#studio-left").getByRole("button", { name: "Chip, component set", exact: true }).click();
        await until(async () => ((((await pageText(page, id)) ?? "").match(/<Use of="chip" \/>/g) ?? []).length) === before + 1, { message: "one more instance of the set" });
        await showLeftTab(page, "layers");
        return names.join(" · ");
      });
    },
  },
  // F7c · putting layers into an instance's slot from the canvas.
  {
    id: "FW-160", feature: "An Assets item dragged over an instance's empty slot: the slot outlined in violet with its name; the drop keeps the main's layers there and adds the item after them; the main is untouched; one ⌘Z", wp: "F7c 2026-10-21", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await slotsPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        await openAssetLibrary(page, "Components");
        const panel = page.locator("#studio-left-panel-assets");
        await panel.getByLabel("Search components").fill("Badge");
        const tile = panel.locator('[data-asset="badge"]').first();
        await tile.waitFor({ state: "visible", timeout: 5000 });
        const slot = await slotOf(page, id, 0).boundingBox();
        if (!slot) throw new Error("the empty instance's slot is not on the canvas (no data-zen-slot)");
        const seen = await slotDrag(page, middle(await tile.boundingBox()), { x: slot.x + slot.width / 2, y: slot.y + slot.height - 6 }, { shotName: "fw-160-slot-target" });
        if (!seen.slot || seen.tag !== "Content") throw new Error(`over the slot the overlay shows ${JSON.stringify(seen)}`);
        await written(page, id, /<Use of="panel" slots=\{\{ Content: <>\s*<Text>Empty<\/Text>\s*<Badge[^>]*>Active<\/Badge>\s*<\/> \}\} \/>/, "the slot: the main's Empty, then the Badge");
        const after = (await pageText(page, id)) ?? "";
        if (!MAIN_SLOT.test(after)) throw new Error("the main's slot layer changed");
        await until(async () => (await panelAt(page, id, 0).getByText("Active", { exact: true }).count()) === 1, { message: "the instance draws the Badge in its slot" });
        await showLeftTab(page, "layers");
        await oneUndo(page, id, before);
        return `over the slot: violet outline, tag ${seen.tag}, line ${seen.line} · Content = Empty + Badge · one ⌘Z`;
      });
    },
  },
  {
    id: "FW-161", feature: "A layer dragged into an instance's slot between the layers the instance puts there lands at that place; the main is untouched; one ⌘Z", wp: "F7c 2026-10-21", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await slotsPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        // A Text (⌘-click on a Badge picks its words, a part of it, as Figma's deepest select does).
        await selectDeep(page, wordsOn(page, id, "Spare"), "Text");
        const spare = await wordsOn(page, id, "Spare").boundingBox();
        const filled = await panelAt(page, id, 1).getByText("Filled", { exact: true }).boundingBox();
        const second = await panelAt(page, id, 1).getByText("Second", { exact: true }).boundingBox();
        // Between the two layers of the slot (their gap's middle).
        const seen = await slotDrag(page, middle(spare), { x: filled.x + filled.width / 2, y: (filled.y + filled.height + second.y) / 2 }, { shotName: "fw-161-slot-line" });
        if (!seen.slot || !seen.line) throw new Error(`over the slot the overlay shows ${JSON.stringify(seen)}`);
        await written(page, id, /slots=\{\{ Content: <>\s*<Text>Filled<\/Text>\s*<Text>Spare<\/Text>\s*<Text>Second<\/Text>\s*<\/> \}\}/, "Spare between Filled and Second");
        const after = (await pageText(page, id)) ?? "";
        if (after.split("<Text>Spare</Text>").length !== 2) throw new Error("Spare was copied, not moved");
        if (!MAIN_SLOT.test(after)) throw new Error("the main's slot layer changed");
        await oneUndo(page, id, before);
        return "Spare → between Filled and Second · main untouched · one ⌘Z";
      });
    },
  },
  {
    id: "FW-162", feature: "A layer dragged out of an instance's slot leaves it (the slot keeps its other layer) and lands where it is dropped; one ⌘Z", wp: "F7c 2026-10-21", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await slotsPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        const second = panelAt(page, id, 1).getByText("Second", { exact: true });
        await selectDeep(page, second, "Text");
        const spare = await wordsOn(page, id, "Spare").boundingBox();
        const seen = await slotDrag(page, middle(await second.boundingBox()), { x: spare.x + spare.width - 2, y: spare.y + spare.height / 2 });
        if (seen.slot) throw new Error(`over the row the overlay still shows a slot: ${JSON.stringify(seen)}`);
        await written(page, id, /slots=\{\{ Content: <>\s*<Text>Filled<\/Text>\s*<\/> \}\}[\s\S]*<Badge>Loose<\/Badge>\s*<Text>Spare<\/Text>\s*<Text>Second<\/Text>/, "Second out of the slot, after Spare");
        if (!MAIN_SLOT.test((await pageText(page, id)) ?? "")) throw new Error("the main's slot layer changed");
        await oneUndo(page, id, before);
        return "Second → after Spare · the slot keeps Filled · one ⌘Z";
      });
    },
  },
  {
    id: "FW-163", feature: "A layer of an instance's slot dragged above its sibling there changes places in the slot; one ⌘Z", wp: "F7c 2026-10-21", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await slotsPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        const second = panelAt(page, id, 1).getByText("Second", { exact: true });
        await selectDeep(page, second, "Text");
        const filled = await panelAt(page, id, 1).getByText("Filled", { exact: true }).boundingBox();
        const seen = await slotDrag(page, middle(await second.boundingBox()), { x: filled.x + filled.width / 2, y: filled.y + 2 });
        if (!seen.slot || seen.tag !== "Content") throw new Error(`over the slot the overlay shows ${JSON.stringify(seen)}`);
        await written(page, id, /slots=\{\{ Content: <>\s*<Text>Second<\/Text>\s*<Text>Filled<\/Text>\s*<\/> \}\}/, "Second before Filled");
        await oneUndo(page, id, before);
        return "Second ↑ Filled inside the slot · one ⌘Z";
      });
    },
  },
  {
    id: "FW-164", feature: "⌥-drag of a slot's layer into another instance's empty slot: a copy there (with that slot's main layers), the original stays; one ⌘Z", wp: "F7c 2026-10-21", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await slotsPage(ctx);
      return restoring(page, id, async () => {
        const before = (await pageText(page, id)) ?? "";
        const filled = panelAt(page, id, 1).getByText("Filled", { exact: true });
        await selectDeep(page, filled, "Text");
        const empty = await panelAt(page, id, 0).getByText("Empty", { exact: true }).boundingBox();
        const seen = await slotDrag(page, middle(await filled.boundingBox()), { x: empty.x + empty.width / 2, y: empty.y + empty.height + 4 }, { copy: true });
        if (!seen.slot || seen.label !== "Copy") throw new Error(`⌥ over the slot the overlay shows ${JSON.stringify(seen)}`);
        await written(page, id, /<Use of="panel" slots=\{\{ Content: <>\s*<Text>Empty<\/Text>\s*<Text>Filled<\/Text>\s*<\/> \}\} \/>/, "a copy of Filled after Empty in the first instance");
        const after = (await pageText(page, id)) ?? "";
        if (!/slots=\{\{ Content: <>\s*<Text>Filled<\/Text>\s*<Text>Second<\/Text>/.test(after)) throw new Error("the original left its slot");
        if (!MAIN_SLOT.test(after)) throw new Error("the main's slot layer changed");
        await oneUndo(page, id, before);
        return "⌥ Filled → the empty slot (Empty + Filled) · original stays · one ⌘Z";
      });
    },
  },
  {
    id: "FW-119", feature: "⌘G groups floating layers where they are (a Box group, Layers \"Group 1\"); ⇧⌘G ungroups", wp: "F3 2026-10-19 · decision 3", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShapes(page, id, [0, 1]);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyG");
      await until(async () => /<Box position="absolute" insetLeft=\{20\} insetTop=\{20\} width=\{180\} height=\{80\} group>/.test((await pageText(page, id)) ?? ""), { message: "a group at 20, 20, 180 × 80" }).catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 120)} · ${((await pageText(page, id)) ?? "").match(/<Box[^>]*group[^>]*>/)?.[0]}`); });
      await showLeftTab(page, "layers");
      await until(async () => (await page.locator(".studio-layers__tree [role='treeitem'] .studio-layers__name", { hasText: /^Group 1$/ }).count()) === 1, { message: "Layers: Group 1" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Shift+KeyG");
      await until(async () => !/group>/.test((await pageText(page, id)) ?? ""), { message: "⇧⌘G ungroups" });
      const shapes = shapeTags((await pageText(page, id)) ?? "");
      if (shapes[0].x !== 20 || shapes[0].y !== 20 || shapes[1].x !== 140 || shapes[1].y !== 40) throw new Error(`after ungroup at ${shapes.map((shape) => `${shape.x}, ${shape.y}`).join(" · ")}`);
      await undoTo(page, id, before, 4);
      return "⌘G → Group 1 at 20, 20 · ⇧⌘G → back where they were · ⌘Z";
    },
  },
  {
    id: "FW-120", feature: "⇧H flips a shape (flip=\"horizontal\", again: none); with two floating layers they also swap places across their box", wp: "F2 2026-10-19 · F5a flipTurn", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShape(page, id, 0);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Shift+KeyH");
      await until(async () => /<Shape type="rectangle"[^>]*flip="horizontal"/.test((await pageText(page, id)) ?? ""), { message: "flip horizontal" }).catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 120)}`); });
      await page.keyboard.press("Shift+KeyH");
      await until(async () => (await pageText(page, id)) === before, { message: "⇧H again: no flip" });
      await deselect(page);
      await selectShapes(page, id, [0, 1]);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Shift+KeyH");
      await until(async () => { const shapes = shapeTags((await pageText(page, id)) ?? ""); return shapes[0].x === 120 && shapes[1].x === 20; }, { message: "the rectangle at X 120, the ellipse at X 20" }).catch(async (error) => { throw new Error(`${error.message} (${shapeTags((await pageText(page, id)) ?? "").map((shape) => shape.x).join(", ")})`); });
      await undoTo(page, id, before, 4);
      return "⇧H → flip · ⇧H → none · two layers: swapped across their box (120 · 20) · ⌘Z";
    },
  },
  {
    id: "FW-121", feature: "A rotate handle outside a corner turns the shape; ⇧ steps 15° (a quarter turn clockwise: rotation -90)", wp: "F2 2026-10-19", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShape(page, id, 0);
      const zone = await page.locator('[data-e2e="rotate-ne"]').boundingBox();
      if (!zone) throw new Error("no rotate handle outside the top-right corner");
      const shape = await clipShape(page, id, 0).boundingBox();
      const centre = { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
      const from = { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 };
      const turn = (deg) => { const r = (deg * Math.PI) / 180; const dx = from.x - centre.x; const dy = from.y - centre.y; return { x: centre.x + dx * Math.cos(r) - dy * Math.sin(r), y: centre.y + dx * Math.sin(r) + dy * Math.cos(r) }; };
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.keyboard.down("Shift");
      for (const deg of [20, 45, 70, 88]) { const at = turn(deg); await page.mouse.move(at.x, at.y, { steps: 3 }); }
      await page.mouse.up();
      await page.keyboard.up("Shift");
      await until(async () => /<Shape type="rectangle"[^>]*rotation=\{-90\}/.test((await pageText(page, id)) ?? ""), { message: "rotation -90" }).catch(async (error) => { throw new Error(`${error.message} (${((await pageText(page, id)) ?? "").match(/<Shape type="rectangle"[^>]*>/)?.[0]})`); });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z" });
      return "NE handle → a quarter turn with ⇧ → rotation -90 · ⌘Z";
    },
  },
  {
    id: "FW-122", feature: "⌥⇧S (Subtract selection): a live boolean group of two shapes; moving a shape inside it redraws the result in the same edit", wp: "F9b 2026-10-19", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      const boolean = () => /<Shape position="absolute"[^>]*type="boolean"[^>]*>/.exec((pageTextNow ?? ""))?.[0] ?? "";
      let pageTextNow = "";
      await selectShapes(page, id, [0, 1]);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Alt+Shift+KeyS");
      await until(async () => { pageTextNow = (await pageText(page, id)) ?? ""; return /type="boolean" operation="subtract"[^>]*d="M/.test(boolean()); }, { timeout: 20_000, message: "a Subtract group with its result" }).catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 160)} · ${boolean()}`); });
      const first = /\sd="([^"]+)"/.exec(boolean())?.[1];
      try {
        await showLeftTab(page, "layers");
        await until(async () => (await page.locator(".studio-layers__tree [role='treeitem'] .studio-layers__name", { hasText: /^Subtract 1$/ }).count()) === 1, { message: "Layers: Subtract 1" });
        // Its shapes (Enter: Figma's Select children), nudged: the group's result follows in the same edit.
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Enter");
        await until(async () => (await selectedSrc(page)).length === 2, { message: "Enter: its two shapes" });
        await page.keyboard.press("Shift+ArrowLeft");
        await until(async () => { pageTextNow = (await pageText(page, id)) ?? ""; const d = /\sd="([^"]+)"/.exec(boolean())?.[1]; return Boolean(d) && d !== first; }, { timeout: 20_000, message: "the result follows its shapes" });
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("ControlOrMeta+KeyZ");
        await until(async () => { pageTextNow = (await pageText(page, id)) ?? ""; return /\sd="([^"]+)"/.exec(boolean())?.[1] === first; }, { message: "one ⌘Z: the move and its result" });
      } finally {
        await undoTo(page, id, before, 6).catch(() => undefined);
      }
      return "⌥⇧S → Subtract 1 with its d · Enter, nudge its shapes → d follows · one ⌘Z";
    },
  },
  {
    id: "FW-123", feature: "⌘E (Flatten) on two shapes: one vector with both outlines, at their box", wp: "F9b 2026-10-19", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShapes(page, id, [0, 1]);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyE");
      await until(async () => vectorTags((await pageText(page, id)) ?? "").length === 1 && !/type="(rectangle|ellipse)"/.test((await pageText(page, id)) ?? ""), { timeout: 20_000, message: "one vector instead of the two shapes" }).catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 160)}`); });
      const [vector] = vectorTags((await pageText(page, id)) ?? "");
      if (Math.abs(vector.x - 20) > 1 || Math.abs(vector.y - 20) > 1 || Math.abs(vector.w - 180) > 1 || Math.abs(vector.h - 80) > 1) throw new Error(`the vector at ${vector.x}, ${vector.y}, ${vector.w} × ${vector.h} (want 20, 20, 180 × 80)`);
      if ((vector.d.match(/M/g) ?? []).length < 2) throw new Error(`one outline only: ${vector.d.slice(0, 80)}`);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z" }).catch(async (error) => { await undoTo(page, id, before, 4).catch(() => undefined); throw error; });
      return `vector 180 × 80 at 20, 20 · ${(vector.d.match(/M/g) ?? []).length} outlines · ⌘Z`;
    },
  },
  {
    id: "FW-124", feature: "A group hugs its layers: nudging a layer out of it grows the group in the same edit (Figma's Group), nothing else moves", wp: "F3 2026-10-19 · decision 3", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectShapes(page, id, [0, 1]);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyG");
      await until(async () => /width=\{180\} height=\{80\} group>/.test((await pageText(page, id)) ?? ""), { message: "a group 180 × 80" });
      const rect = await clipShape(page, id, 0).boundingBox();
      try {
        // The Ellipse inside the group (⌘-click: Figma's deep select), nudged down twice.
        await deselect(page);
        await selectShape(page, id, 1);
        await until(async () => (await selectedSrc(page)).length === 1, { message: "the Ellipse selected" });
        await page.locator(".studio-viewport").focus();
        for (let k = 0; k < 2; k++) { await page.keyboard.press("Shift+ArrowDown"); await sleep(400); }
        await until(async () => /width=\{180\} height=\{100\} group>/.test((await pageText(page, id)) ?? ""), { message: "the group grows to 100 high" }).catch(async (error) => { throw new Error(`${error.message} (${((await pageText(page, id)) ?? "").match(/<Box[^>]*group>/)?.[0]})`); });
        const still = await clipShape(page, id, 0).boundingBox();
        if (Math.abs(still.x - rect.x) > 1 || Math.abs(still.y - rect.y) > 1) throw new Error("the Rectangle moved on the canvas");
      } finally {
        await undoTo(page, id, before, 6).catch(() => undefined);
      }
      return "⌘G → 180 × 80 · Ellipse ⇧↓ ×2 → the group 180 × 100, the Rectangle in place · ⌘Z";
    },
  },
  {
    id: "FW-125", feature: "⇧⌘C (Copy as PNG): the selected layer as a picture on the clipboard at 2x (Figma's), no 'not in Zen Studio yet' note; the canvas stays as it was", wp: "F3 2026-10-20", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = await pageText(page, id);
      await selectShape(page, id, 0);
      const box = await clipShape(page, id, 0).boundingBox();
      const size = await clipShape(page, id, 0).evaluate((element) => [element.offsetWidth, element.offsetHeight]);
      await page.evaluate(() => navigator.clipboard.writeText("before"));
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Shift+KeyC");
      const read = () => page.evaluate(async () => {
        for (const item of await navigator.clipboard.read()) {
          if (!item.types.includes("image/png")) continue;
          const bitmap = await createImageBitmap(await item.getType("image/png"));
          return [bitmap.width, bitmap.height];
        }
        return null;
      });
      let picture = null;
      await until(async () => Boolean(picture = await read().catch(() => null)), { timeout: 15_000, message: "a PNG on the clipboard" });
      if (picture[0] !== size[0] * 2 || picture[1] !== size[1] * 2) throw new Error(`PNG ${picture.join(" × ")}, the layer is ${size.join(" × ")} (2x expected)`);
      const status = (await page.locator(".studio-status, [role=status]").allInnerTexts().catch(() => [])).join(" | ");
      if (/not in Zen Studio yet/i.test(status)) throw new Error(`⇧⌘C still says it is not here: ${status}`);
      if ((await pageText(page, id)) !== before) throw new Error("⇧⌘C changed the page");
      return `Rectangle ${size.join(" × ")} at ${Math.round(box.x)}, ${Math.round(box.y)} → PNG ${picture.join(" × ")} · ${status.split(" | ").find((text) => /PNG/.test(text)) ?? "no status"}`;
    },
  },
  {
    id: "FW-126", feature: "Copy as › Copy as SVG (the layer menu) and the frame menu's Copy as PNG: the layer's SVG markup as text at its size; the Screen as a picture at 2x its width", wp: "F3 2026-10-20", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      await selectShape(page, id, 0);
      const size = await clipShape(page, id, 0).evaluate((element) => [element.offsetWidth, element.offsetHeight]);
      const box = await clipShape(page, id, 0).boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
      const menu = page.getByRole("menu").last();
      await menu.waitFor({ state: "visible", timeout: 5000 });
      await menu.getByRole("menuitem", { name: /^Copy as\b/ }).first().click();
      const list = page.getByRole("menu").last();
      await list.getByRole("menuitem", { name: "Copy as SVG" }).waitFor({ state: "visible", timeout: 5000 });
      await list.getByRole("menuitem", { name: "Copy as SVG" }).click();
      let svg = "";
      await until(async () => /^<svg\b/.test(svg = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "")), { timeout: 15_000, message: "SVG markup on the clipboard" });
      if (!new RegExp(`width="${size[0]}"`).test(svg) || !new RegExp(`height="${size[1]}"`).test(svg)) throw new Error(`SVG not at the layer's ${size.join(" × ")}: ${svg.slice(0, 200)}`);
      // The Screen's frame menu: Copy as PNG of the frame's body.
      const frame = page.locator('[data-studio-frame^="screen:"]').first();
      const frameWidth = await frame.evaluate((element) => element.offsetWidth);
      await deselect(page);
      // The frame's name label above it opens the frame menu (FW-46).
      await page.locator('.studio-frame-label[data-chrome-key^="label:screen:"]').first().click({ button: "right" });
      const frameMenu = page.getByRole("menu").last();
      await frameMenu.waitFor({ state: "visible", timeout: 5000 });
      await page.evaluate(() => navigator.clipboard.writeText("before"));
      await frameMenu.getByRole("menuitem", { name: "Copy as PNG" }).click();
      let picture = null;
      await until(async () => Boolean(picture = await page.evaluate(async () => {
        for (const item of await navigator.clipboard.read()) if (item.types.includes("image/png")) { const bitmap = await createImageBitmap(await item.getType("image/png")); return [bitmap.width, bitmap.height]; }
        return null;
      }).catch(() => null)), { timeout: 20_000, message: "the frame's PNG on the clipboard" });
      if (picture[0] !== frameWidth * 2) throw new Error(`frame PNG ${picture.join(" × ")}, the frame is ${frameWidth} wide (2x expected)`);
      return `SVG ${svg.length} chars (${size.join(" × ")}) · Screen ${frameWidth} wide → PNG ${picture.join(" × ")}`;
    },
  },
  {
    id: "FW-127", feature: "⌃⌘M (Use as mask) on two floating shapes: one mask group (Box group mask) whose bottom shape masks the other — the mask draws nothing, the rest is clipped to it — named Mask group in Layers; ⌃⌘M on it removes the mask; ⌘Z", wp: "F9 2026-10-20 · decision 6", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await clipPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      const maskKey = process.platform === "darwin" ? "Control+Meta+KeyM" : "Control+Alt+KeyM";
      const maskTag = (text) => (text.match(/<Box\b[^>]*\bgroup\b[^>]*>/g) ?? []).find((tag) => /\bmask\b/.test(tag)) ?? null;
      await selectShapes(page, id, [0, 1]);
      await page.locator(".studio-viewport").focus();
      try {
        await page.keyboard.press(maskKey);
        await until(async () => Boolean(maskTag((await pageText(page, id)) ?? "")), { message: "a mask group in the page" });
        const drawn = await page.evaluate(() => {
          const box = document.querySelector('.zen-box[data-mask="true"]');
          const first = box?.firstElementChild;
          return box ? { clip: getComputedStyle(box).clipPath, mask: first ? getComputedStyle(first).visibility : null, path: Boolean(box.querySelector("clipPath path")?.getAttribute("d")) } : null;
        });
        if (!drawn || !/^url\(/.test(drawn.clip) || drawn.mask !== "hidden" || !drawn.path) throw new Error(`the mask is not drawn: ${JSON.stringify(drawn)}`);
        await showLeftTab(page, "layers");
        await until(async () => (await page.locator(".studio-layers__tree [role='treeitem']", { hasText: /^\s*Mask group\s*$/ }).count()) > 0 || (await page.locator(".studio-layers__tree").innerText()).includes("Mask group"), { message: "Mask group in Layers" });
        // Again on the mask group: the mask goes, the layers stay a group.
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press(maskKey);
        await until(async () => { const text = (await pageText(page, id)) ?? ""; return !maskTag(text) && /<Box\b[^>]*\bgroup\b/.test(text); }, { message: "the mask removed, the group kept" });
      } finally {
        await undoTo(page, id, before, 6).catch(() => undefined);
      }
      if (((await pageText(page, id)) ?? "") !== before) throw new Error("⌘Z did not bring the page back");
      return `⌃⌘M → ${maskTag(before) ? "?" : "<Box group mask>"} · clip-path url(#…) · the mask hidden · Mask group in Layers · ⌃⌘M again → group · ⌘Z`;
    },
  },
  {
    id: "FW-128", feature: "Resizing a floating layer in a free frame: its moving edge snaps to another layer's edge with a red guide while dragging (Figma's smart guides); one write, one ⌘Z", wp: "F2 2026-10-20", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await shapesPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      const frame = await freeFrame(page, id);
      await selectShape(page, id, 0);
      // The Rectangle's right edge (X 100) dragged 38 px of the frame: 2 px short of the Ellipse's left edge (X 140).
      const handle = await until(() => page.locator('.studio-resize__handle[data-handle="e"]').first().boundingBox(), { message: "the e handle" });
      const x = handle.x + handle.width / 2;
      const y = handle.y + handle.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      let guide = null;
      try {
        for (let step = 1; step <= 5; step++) { await page.mouse.move(x + (38 * frame.scale * step) / 5, y); await sleep(30); }
        guide = await until(() => page.locator(".studio-drag__guide").first().boundingBox(), { timeout: 3000, message: "a red guide while dragging" });
      } finally {
        await page.mouse.up();
      }
      const want = frame.at(140, 0).x;
      if (Math.abs(guide.x - want) > 1.5) throw new Error(`the guide is at x ${Math.round(guide.x)}, not on the Ellipse's left edge (${Math.round(want)})`);
      await until(async () => (await pageText(page, id)) !== before, { message: "the resize written" });
      const text = (await pageText(page, id)) ?? "";
      const [size] = sizesIn(before).filter((shape) => shape.type === "rectangle");
      const now = sizesIn(text).find((shape) => shape.type === "rectangle");
      const place = shapesIn(text).find((shape) => shape.type === "rectangle");
      if (now.width !== 120 || now.height !== size.height || place.x !== 20) throw new Error(`not snapped to X 140: X ${place.x}, ${now.width} × ${now.height}`);
      await until(async () => (await page.locator(".studio-drag__guide").count()) === 0, { timeout: 2000, message: "the guide gone after the release" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z" });
      return `right edge 138 → 140 (the Ellipse's left edge) with a red guide there · width ${size.width} → ${now.width} · one ⌘Z`;
    },
  },
  {
    id: "FW-129", feature: "⌘ held turns resize snapping off (the exact px, no guide); ⌥ from the centre and ⇧ on a corner snap too (the centre stays, the ratio holds)", wp: "F2 2026-10-20", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await shapesPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      const frame = await freeFrame(page, id);
      const rectangle = async () => {
        const text = (await pageText(page, id)) ?? "";
        return { ...shapesIn(text).find((shape) => shape.type === "rectangle"), ...sizesIn(text).find((shape) => shape.type === "rectangle") };
      };
      const written = () => until(async () => (await pageText(page, id)) !== before, { message: "the resize written" });
      // ⌘ pressed mid-drag: no snap, no guide (the right edge stays at 138, 2 px short of the Ellipse).
      await selectShape(page, id, 0);
      const handle = await until(() => page.locator('.studio-resize__handle[data-handle="e"]').first().boundingBox(), { message: "the e handle" });
      const x = handle.x + handle.width / 2;
      const y = handle.y + handle.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      try {
        for (let step = 1; step <= 3; step++) { await page.mouse.move(x + (20 * frame.scale * step) / 3, y); await sleep(30); }
        await page.keyboard.down("ControlOrMeta");
        await page.mouse.move(x + 38 * frame.scale, y, { steps: 2 });
        await sleep(150);
        if (await page.locator(".studio-drag__guide").count()) throw new Error("a guide shows with ⌘ held");
      } finally {
        await page.mouse.up();
        await page.keyboard.up("ControlOrMeta");
      }
      await written();
      const exact = await rectangle();
      if (exact.width === 120 || Math.abs(exact.width - 118) > 1) throw new Error(`⌘ held: width ${exact.width}, not the exact 118`);
      await undoTo(page, id, before);
      // ⌥: both edges move; the left one (X 2) snaps to the frame's left edge and the right one mirrors it. Nothing
      // selected first: a ⌘-click on the selected Shape would select its part (deep select), which has no handles.
      await deselect(page);
      await selectShape(page, id, 0);
      await dragHandle(page, "e", 18 * frame.scale, 0, ["Alt"]);
      await written();
      const centred = await rectangle();
      if (centred.x !== 0 || centred.width !== 120) throw new Error(`⌥: X ${centred.x}, width ${centred.width} (want X 0, width 120: the centre 60 kept, the left edge on the frame's)`);
      await undoTo(page, id, before);
      // ⇧ on a corner: the right edge (138) snaps to the Ellipse (140) and the height follows the ratio (80 × 60 → 120 × 90).
      await deselect(page);
      await selectShape(page, id, 0);
      await dragHandle(page, "se", 38 * frame.scale, 10 * frame.scale, ["Shift"]);
      await written();
      const ratio = await rectangle();
      if (ratio.width !== 120 || ratio.height !== 90 || ratio.x !== 20 || ratio.y !== 20) throw new Error(`⇧: X ${ratio.x}, Y ${ratio.y}, ${ratio.width} × ${ratio.height} (want 20, 20, 120 × 90)`);
      await undoTo(page, id, before);
      return `⌘: width ${exact.width} (no snap, no guide) · ⌥: X 0, width 120 · ⇧ corner: 120 × 90 · ⌘Z each`;
    },
  },
  {
    id: "FW-130", feature: "Resizing a library component placed in a free frame (a Button in its floating Box) moves its X from the left edge, which snaps to another layer's edge with a red guide; ⌥ grows it from the centre, ⌘ held: no snap; one write, one ⌘Z each", wp: "F2 2026-10-20", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await floatingPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      const frame = await freeFrame(page, id);
      const written = async () => {
        await until(async () => (await pageText(page, id)) !== before, { message: "the resize written" });
        return floatingIn((await pageText(page, id)) ?? "");
      };
      // The left edge (X 140) dragged 38 px of the frame: 2 px short of the Rectangle's right edge (X 100).
      const size = await selectFloating(page, id, frame);
      const guide = await dragHandleWith(page, "w", -38 * frame.scale, { during: () => until(() => page.locator(".studio-drag__guide").first().boundingBox(), { timeout: 3000, message: "a red guide while dragging" }) });
      const want = frame.at(100, 0).x;
      if (Math.abs(guide.x - want) > 1.5) throw new Error(`the guide is at x ${Math.round(guide.x)}, not on the Rectangle's right edge (${Math.round(want)})`);
      const snapped = await written();
      if (!snapped || snapped.x !== 100 || snapped.y !== 40 || Math.abs(snapped.width - (size.width + 40)) > 1.5) throw new Error(`not X 100 and width ${Math.round(size.width + 40)}: ${JSON.stringify(snapped)} · ${((await pageText(page, id)) ?? "").match(/<Box position="absolute"[^]*?<Button/)?.[0]}`);
      await until(async () => (await page.locator(".studio-drag__guide").count()) === 0, { timeout: 2000, message: "the guide gone after the release" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await pageText(page, id)) === before, { message: "one ⌘Z" });
      // ⌥ on the right edge: both edges move by 10, the centre stays (X 130, width + 20).
      await selectFloating(page, id, frame);
      await dragHandleWith(page, "e", 10 * frame.scale, { keys: ["Alt"] });
      const centred = await written();
      if (!centred || centred.x !== 130 || Math.abs(centred.width - (size.width + 20)) > 1.5) throw new Error(`⌥: ${JSON.stringify(centred)} (want X 130, width ${Math.round(size.width + 20)})`);
      await undoTo(page, id, before, 1);
      // ⌘ pressed mid-drag: no snap, no guide (the left edge stays at X 102).
      await selectFloating(page, id, frame);
      const guides = await dragHandleWith(page, "w", -38 * frame.scale, { midKeys: ["ControlOrMeta"], during: () => page.locator(".studio-drag__guide").count() });
      if (guides) throw new Error("a guide shows with ⌘ held");
      const exact = await written();
      if (!exact || Math.abs(exact.x - 102) > 1 || Math.abs(exact.width - (size.width + 38)) > 1.5) throw new Error(`⌘ held: ${JSON.stringify(exact)} (want X 102, width ${Math.round(size.width + 38)})`);
      // Once in its Stack, the Button's left edge moves the Box's X and the Stack's width together (one op many); the
      // Button stays selected.
      const wrapped = (await pageText(page, id)) ?? "";
      await selectFloating(page, id, frame);
      await dragHandleWith(page, "w", -22 * frame.scale);
      await until(async () => (await pageText(page, id)) !== wrapped, { message: "the second resize written" });
      const again = floatingIn((await pageText(page, id)) ?? "");
      if (!again || Math.abs(again.x - 80) > 1 || Math.abs(again.width - (exact.width + 22)) > 1.5) throw new Error(`in its Stack: ${JSON.stringify(again)} (want X 80, width ${exact.width + 22})`);
      if ((await selectedName(page)) !== "Button") throw new Error(`${await selectedName(page)} selected after the write, not the Button`);
      await undoTo(page, id, wrapped, 1);
      await undoTo(page, id, before, 1);
      return `left edge 102 → 100 (the Rectangle's right edge) with a red guide: X 100, width ${Math.round(size.width)} → ${snapped.width} in a Stack · ⌥: X 130, width ${centred.width} · ⌘: X ${exact.x} · in its Stack: X ${again.x}, width ${again.width} · one ⌘Z each`;
    },
  },
  {
    id: "FW-131", feature: "Resizing a frame snaps its moving edge to another frame's edge with a red guide while dragging (Figma's smart guides); ⌘ held: no snap, no guide; ⌥ snaps from the centre; one write, one ⌘Z each", wp: "F2 2026-10-20", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await twoScreensPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      const measure = () => page.evaluate(() => {
        const one = document.querySelector('[data-studio-frame="screen:screen-1"]');
        const two = document.querySelector('[data-studio-frame="screen:screen-2"]');
        const rect = one.getBoundingClientRect();
        return { zoom: rect.width / one.offsetWidth, x: one.offsetLeft, width: one.offsetWidth, gap: two.offsetLeft - one.offsetLeft - one.offsetWidth, left: two.getBoundingClientRect().left };
      });
      const start = await measure();
      if (start.gap <= 12) throw new Error(`the frames are ${start.gap} px apart: no room to snap`);
      const written = async () => {
        await until(async () => (await pageText(page, id)) !== before, { message: "the resize written" });
        const tag = boardTag((await pageText(page, id)) ?? "", "Screen", "screen-1");
        return { width: numberAttr(tag, "width"), x: numberAttr(tag, "x") };
      };
      const drag = async (options) => {
        await selectFrame(page, "screen:screen-1");
        const handle = await until(() => page.locator('.studio-frame-handle[data-handle="e"]').boundingBox(), { message: "the frame's e handle" });
        const x = handle.x + handle.width / 2;
        const y = handle.y + handle.height / 2;
        const dx = (start.gap - 3) * start.zoom;
        await page.mouse.move(x, y);
        for (const key of options.keys ?? []) await page.keyboard.down(key);
        await page.mouse.down();
        try {
          for (let step = 1; step <= 3; step++) { await page.mouse.move(x + (dx * step) / 5, y); await sleep(40); }
          for (const key of options.midKeys ?? []) await page.keyboard.down(key);
          for (let step = 4; step <= 5; step++) { await page.mouse.move(x + (dx * step) / 5, y); await sleep(40); }
          await sleep(150);
          return await options.during?.();
        } finally {
          await page.mouse.up();
          for (const key of [...(options.keys ?? []), ...(options.midKeys ?? [])]) await page.keyboard.up(key);
        }
      };
      // The right edge dragged to 3 px short of the second frame's left edge: it snaps there, with a red guide.
      const guide = await drag({ during: () => until(() => page.locator(".studio-drag__guide").first().boundingBox(), { timeout: 3000, message: "a red guide while dragging" }) });
      if (Math.abs(guide.x - start.left) > 1.5) throw new Error(`the guide is at x ${Math.round(guide.x)}, not on the second frame's left edge (${Math.round(start.left)})`);
      const snapped = await written();
      if (snapped.width !== start.width + start.gap) throw new Error(`width ${snapped.width}, not ${start.width + start.gap} (snapped to the second frame)`);
      await until(async () => (await page.locator(".studio-drag__guide").count()) === 0, { timeout: 2000, message: "the guide gone after the release" });
      await undoTo(page, id, before, 1);
      // ⌘ pressed mid-drag: the exact px, no guide.
      const shown = await drag({ midKeys: ["ControlOrMeta"], during: () => page.locator(".studio-drag__guide").count() });
      if (shown) throw new Error("a guide shows with ⌘ held");
      const exact = await written();
      if (Math.abs(exact.width - (start.width + start.gap - 3)) > 1.5) throw new Error(`⌘ held: width ${exact.width}, not the exact ${start.width + start.gap - 3}`);
      await undoTo(page, id, before, 1);
      // ⌥ from the centre: the right edge snaps, the left edge mirrors it.
      await drag({ keys: ["Alt"] });
      const centred = await written();
      if (centred.width !== start.width + 2 * start.gap || centred.x !== start.x - start.gap) throw new Error(`⌥: X ${centred.x}, width ${centred.width} (want ${start.x - start.gap}, ${start.width + 2 * start.gap})`);
      await undoTo(page, id, before, 1);
      return `right edge → the second frame's left edge with a red guide (width ${start.width} → ${snapped.width}) · ⌘: ${exact.width} · ⌥: X ${centred.x}, width ${centred.width} · one ⌘Z each`;
    },
  },
  {
    id: "FW-132", feature: "A click on a Line selects it, within a few px of it (Figma picks a LINE so), not the frame around it; 20 px away it does not", wp: "Figma walk 2026-10-21", timeout: 40_000,
    async run(ctx) {
      const text = (title) => [
        `// @zen-page ${JSON.stringify({ format: 1, title })}`,
        'import { Board, Screen } from "@zen-ds/react/builder";',
        'import { Shape } from "@zen-ds/react";',
        "export const mock = {};",
        "",
        "export default function Page() {",
        "  return (",
        "    <Board>",
        `      <Screen id="screen-1" title=${JSON.stringify(title)} device="desktop" width={800} height={500}>`,
        '        <Shape type="line" position="absolute" insetLeft={100} insetTop={200} width={240} />',
        "      </Screen>",
        "    </Board>",
        "  );",
        "}",
        "",
      ].join("\n");
      const { page, id } = await seededPage(ctx, text, /type="line"/);
      const box = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Shape"]`).first().boundingBox();
      if (!box || box.height > 1) throw new Error(`the line's box: ${JSON.stringify(box)}`);
      const x = box.x + box.width / 2;
      for (const dy of [0, 3, -3]) {
        await deselect(page);
        await page.mouse.click(x, box.y + dy);
        await until(async () => /^Line/.test(await selectedName(page)), { timeout: 3000, message: `a click ${dy} px off the line selects it` })
          .catch(async (error) => { throw new Error(`${error.message} (selected: ${await selectedName(page) || "nothing"})`); });
      }
      await deselect(page);
      await page.mouse.click(x, box.y - 20);
      await sleep(400);
      if (/^Line/.test(await selectedName(page))) throw new Error("a click 20 px off the line still selects it");
      return `on it, 3 px above and 3 px below → Line; 20 px above → ${(await selectedName(page)) || "nothing"}`;
    },
  },
  {
    id: "FW-133", feature: "A page just made shows its Layers (Figma's new file), not the Pages list it was made from", wp: "Figma walk 2026-10-21", timeout: 40_000,
    async run(ctx) {
      const { page } = await newPage(ctx);
      const tab = page.locator('#studio-left [role="tab"][aria-selected="true"]').first();
      await until(async () => /Layers/.test(await tab.innerText().catch(() => "")), { timeout: 5000, message: "the Layers tab" })
        .catch(async (error) => { throw new Error(`${error.message} (shown: ${(await tab.innerText().catch(() => "?")).trim()})`); });
      await page.locator(".studio-layers__tree").waitFor({ state: "visible", timeout: 5000 });
      return "New page › Create → Layers";
    },
  },
  {
    id: "FW-175", feature: "⌥⌘A (Select matching layers) selects the same layer in the other frames (its automatic name compared without its page-wide number), never one in a Section the frame is not in", wp: "Select matching 2026-10-22", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await matchPage(ctx);
      await pickIn(page, id, "screen:one", 1);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Alt+ControlOrMeta+KeyA");
      await until(async () => /Selected 2 matching layers/.test(await statusText(page)), { message: "two matching layers" })
        .catch(async (error) => { throw new Error(`${error.message} (status: ${(await statusText(page)).slice(0, 120)})`); });
      const extra = await page.locator(".studio-selection__outline[data-kind='extra']").count();
      if (extra !== 1) throw new Error(`${extra} other layers outlined (want the Ellipse of screen two)`);
      const extraBox = await page.locator(".studio-selection__outline[data-kind='extra']").first().boundingBox();
      const twin = await layerIn(page, id, "screen:two", 1).boundingBox();
      if (Math.abs(extraBox.x - twin.x) > 3 || Math.abs(extraBox.y - twin.y) > 3) throw new Error("the outlined layer is not screen two's Ellipse");
      return "Ellipse 1 (screen one) + Ellipse 2 (screen two); screen three sits in a Section";
    },
  },
  {
    id: "FW-176", feature: "⌥⌘A: a layer the person renamed matches only that name (Hero ≠ Rectangle), and a frame in a Section matches only frames in it: both say there is no match", wp: "Select matching 2026-10-22", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await matchPage(ctx);
      await pickIn(page, id, "screen:one", 0);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Alt+ControlOrMeta+KeyA");
      await until(async () => /No matching layers in other frames/.test(await statusText(page)), { message: "no match for the Rectangle (screen two's is Hero)" });
      await deselect(page);
      await pickIn(page, id, "screen:three", 1);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Alt+ControlOrMeta+KeyA");
      await until(async () => /No matching layers in other frames/.test(await statusText(page)) && (await page.locator(".studio-selection__outline[data-kind='extra']").count()) === 0, { message: "no match from inside the Section" });
      return "Rectangle vs Hero: none · Section frame: none";
    },
  },
  {
    id: "FW-177", feature: "Right-click › Select all with same › Fill selects every layer of the page painted with that fill, in every frame", wp: "Select matching 2026-10-22", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await matchPage(ctx);
      await pickIn(page, id, "screen:one", 0);
      await sameFromMenu(page, id, "screen:one", 0, "Fill");
      await until(async () => /Selected 3 layers with the same fill/.test(await statusText(page)), { message: "the three accent rectangles" })
        .catch(async (error) => { throw new Error(`${error.message} (status: ${(await statusText(page)).slice(0, 120)})`); });
      return "Fill › 3 accent rectangles (Hero and the Section's included)";
    },
  },
  {
    id: "FW-178", feature: "Select all with same › Instance selects every instance of the component, whatever its variant; Text properties selects the texts of that style (its menu opened by a right-click on the text's resize handle, as Figma's)", wp: "Select matching 2026-10-22", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await matchPage(ctx);
      await pickNamedIn(page, id, "screen:one", "Button");
      await sameFromMenu(page, id, "screen:one", null, "Instance", "Button");
      await until(async () => /Selected 3 layers with the same instance/.test(await statusText(page)), { message: "the three Buttons" })
        .catch(async (error) => { throw new Error(`${error.message} (status: ${(await statusText(page)).slice(0, 120)})`); });
      await deselect(page);
      await pickNamedIn(page, id, "screen:one", "Text");
      await sameFromMenu(page, id, "screen:one", null, "Text properties", "Text", { onHandle: true });
      await until(async () => /Selected 2 layers with the same text properties/.test(await statusText(page)), { message: "the two Caption texts" })
        .catch(async (error) => { throw new Error(`${error.message} (status: ${(await statusText(page)).slice(0, 120)})`); });
      return "Instance › 3 Buttons (primary and secondary) · Text properties › 2 Captions";
    },
  },
  {
    id: "FW-179", feature: "Select all with same › Stroke on a layer without one says so and keeps the selection; ⌥⌘A is in Quick actions and no longer a 'not in Zen Studio yet' key", wp: "Select matching 2026-10-22", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await matchPage(ctx);
      await pickIn(page, id, "screen:one", 1);
      await sameFromMenu(page, id, "screen:one", 1, "Stroke");
      await until(async () => /This layer has no stroke/.test(await statusText(page)), { message: "no stroke said" });
      if (await page.locator(".studio-selection__outline[data-kind='extra']").count()) throw new Error("other layers got selected");
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyK");
      const dialog = page.getByRole("dialog").last();
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      await page.keyboard.type("Select matching");
      await dialog.getByText("Select matching layers", { exact: true }).first().waitFor({ state: "visible", timeout: 5000 });
      await page.keyboard.press("Escape");
      if (/isn't in Zen Studio yet/.test(await statusText(page))) throw new Error("⌥⌘A still says not yet");
      return "Stroke › none said · Quick actions lists Select matching layers";
    },
  },
  {
    id: "FW-165", feature: "A Zen instance's Design tab has no Code properties (Figma's sections only); its HTML button type is on the Code tab's Properties, where typing submit writes type=\"submit\"; ⌘Z takes it back", wp: "§3a Properties 2026-10-21", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await clickNamed(page, id, "Button");
      await until(async () => (await selectedName(page)) === "Button", { message: "the Button selected" });
      const design = await noCodeOnDesign(page, ["type"]);
      return restoring(page, id, () => onCodeTab(page, async () => {
        await inspectorRow(page, "type").waitFor({ state: "visible", timeout: 5000 });
        await typeInRow(page, "type", "submit");
        await written(page, id, /<Button\b[^>]*type="submit"/, 'type="submit" on the Button');
        await shot(page, "fw-165-instance-code-tab");
        await undoUntilGone(page, id, /<Button\b[^>]*type="submit"/, "⌘Z takes the type back");
        return `Design: ${design.join(", ")} · Code › Properties › Type → submit → ⌘Z`;
      }));
    },
  },
  {
    id: "FW-166", feature: "An auto layout frame's HTML element is on the Code tab: section writes as=\"section\" on the Stack, ⌘Z takes it back; its Design tab keeps Figma's sections", wp: "§3a Properties 2026-10-21", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await selectBody(page, id);
      await until(async () => (await selectedName(page)) === "Frame", { message: "the body frame selected" });
      const design = await noCodeOnDesign(page, ["as", "scroll"]);
      return restoring(page, id, () => onCodeTab(page, async () => {
        await inspectorRow(page, "as").waitFor({ state: "visible", timeout: 5000 });
        await pickOption(page, "as", "section");
        await written(page, id, /<Stack\b[^>]*as="section"/, 'as="section" on the Stack');
        await undoUntilGone(page, id, /<Stack\b[^>]*as="section"/, "⌘Z takes the element back");
        return `Design: ${design.join(", ")} · Code › Properties › HTML element → section → ⌘Z`;
      }));
    },
  },
  {
    id: "FW-167", feature: "A text layer's HTML element is on the Code tab: span writes as=\"span\" on the Text, ⌘Z takes it back; its Design tab shows Typography and no code rows", wp: "§3a Properties 2026-10-21", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      await clickNamed(page, id, "Text");
      await until(async () => (await sections(page)).includes("Typography"), { message: "the text selected" });
      const design = await noCodeOnDesign(page, ["as"]);
      return restoring(page, id, () => onCodeTab(page, async () => {
        await inspectorRow(page, "as").waitFor({ state: "visible", timeout: 5000 });
        await pickOption(page, "as", "span");
        await written(page, id, /<Text\b[^>]*as="span"/, 'as="span" on the Text');
        await undoUntilGone(page, id, /<Text\b[^>]*as="span"/, "⌘Z takes the element back");
        return `Design: ${design.join(", ")} · Code › Properties › HTML element → span → ⌘Z`;
      }));
    },
  },
  {
    id: "FW-168", feature: "Attributes no API lists (aria-label, data-testid on a Button) are on the Code tab's Properties under their written names and edit there; the Design header's Show code opens them", wp: "§3a Properties 2026-10-21", timeout: 60_000,
    async run(ctx) {
      const text = (title) => [
        `// @zen-page ${JSON.stringify({ format: 1, title })}`,
        'import { Board, Screen } from "@zen-ds/react/builder";',
        'import { Button, Stack } from "@zen-ds/react";',
        "export const mock = {};",
        "",
        "export default function Page() {",
        "  return (",
        "    <Board>",
        `      <Screen id="screen-1" title=${JSON.stringify(title)} device="desktop" width={800} height={500}>`,
        '        <Stack gap="md" padding="lg">',
        '          <Button level="primary" aria-label="Save the draft" data-testid="save">Save</Button>',
        "        </Stack>",
        "      </Screen>",
        "    </Board>",
        "  );",
        "}",
        "",
      ].join("\n");
      const { page, id } = await seededPage(ctx, text, /data-testid="save"/);
      await clickNamed(page, id, "Button");
      await until(async () => (await selectedName(page)) === "Button", { message: "the Button selected" });
      const design = await noCodeOnDesign(page, ["aria-label", "data-testid", "type"]);
      const before = (await pageText(page, id)) ?? "";
      await right(page).getByRole("button", { name: "Show code", exact: true }).click();
      try {
        await codeProperties(page).waitFor({ state: "visible", timeout: 5000 });
        for (const prop of ["aria-label", "data-testid", "type"]) await inspectorRow(page, prop).waitFor({ state: "visible", timeout: 5000 });
        const labels = await codeProperties(page).locator('[data-prop="aria-label"], [data-prop="data-testid"]').allInnerTexts();
        if (!labels.every((label, index) => label.includes(["aria-label", "data-testid"][index]))) throw new Error(`rows not under their written names: ${labels.join(" · ")}`);
        await typeInRow(page, "aria-label", "Save");
        await written(page, id, /<Button\b[^>]*aria-label="Save"/, 'aria-label="Save" on the Button');
        await undoTo(page, id, before, 2);
      } finally {
        await showDesignTab(page).catch(() => undefined);
      }
      return `Design: ${design.join(", ")} · Show code → Code › Properties: aria-label, data-testid, Type · aria-label → Save → ⌘Z`;
    },
  },
  {
    id: "FW-169", feature: "The Code tab's Properties sit on the panel's one grid (Inline-Field rows, panelFits) for an instance, a frame and a text, above the layer's Code", wp: "§3a Properties 2026-10-21", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await walkPage(ctx);
      const seen = [];
      const layers = [
        ["the Button", () => clickNamed(page, id, "Button")],
        ["the body frame", () => selectBody(page, id)],
        ["the text", () => clickNamed(page, id, "Text")],
      ];
      for (const [what, select] of layers) {
        await select();
        await sleep(300);
        await onCodeTab(page, async () => {
          await expectPanelFits(page, `${what}'s Code tab`);
          const order = await sections(page);
          if (!(order.indexOf("Properties") >= 0 && order.indexOf("Properties") < order.indexOf("Code"))) throw new Error(`${what}: the Code tab reads ${order.join(", ")}`);
          seen.push(`${what}: ${await codeProperties(page).locator(".studio-inspector__row").count()} rows`);
          await shot(page, `fw-169-${what.split(" ").at(-1)}`);
        });
      }
      return seen.join(" · ");
    },
  },
  {
    id: "FW-155", feature: "Hovering a selected auto layout frame's gap or padding shows Figma's pink area, a handle and its value as a variable pill (Gap · Small · 12); a click still opens the scale", wp: "Figma parity 2026-10-21 · gap / padding handles", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await spacingPage(ctx);
      await selectLayout(page, id, "Stack", 0);
      const [a, b] = [await shapeBox(page, id, 0), await shapeBox(page, id, 1)];
      const gap = { x: (a.x + a.width + b.x) / 2, y: a.y + a.height / 2 };
      await page.mouse.move(gap.x - 1, gap.y);
      await page.mouse.move(gap.x, gap.y);
      const gapPill = await until(async () => { const text = await spacingPill(page); return /Gap · Small · 12/.test(text) ? text : null; }, { message: 'the "Gap · Small · 12" pill' });
      const look = await page.evaluate(() => {
        const probe = document.createElement("div");
        probe.style.color = "var(--zen-color-background-support-pink-solid)";
        document.body.append(probe);
        const pink = getComputedStyle(probe).color;
        probe.remove();
        const handle = document.querySelector(".studio-selection__spacing-handle");
        const label = document.querySelector(".studio-selection__spacing-label[data-drag]");
        const hit = document.querySelector('.studio-selection__spacing-hit[data-drag="x"]');
        return { pink, handle: handle ? getComputedStyle(handle).backgroundColor : null, label: label ? getComputedStyle(label).backgroundColor : null, hexagon: Boolean(label?.querySelector("svg")), tint: document.querySelectorAll('.studio-selection__gap[data-drag][data-hover="true"]').length, cursor: hit ? getComputedStyle(hit).cursor : null };
      });
      if (look.handle !== look.pink || look.label !== look.pink) throw new Error(`not Figma's pink: handle ${look.handle}, pill ${look.label} (Support/Pink/Solid ${look.pink})`);
      if (!look.tint || !look.hexagon || look.cursor !== "ew-resize") throw new Error(`gap hover: ${JSON.stringify(look)}`);
      const left = await sideArea(page, "left");
      await page.mouse.move(left.cx + 1, left.cy);
      await page.mouse.move(left.cx, left.cy);
      const padPill = await until(async () => { const text = await spacingPill(page); return /Horizontal padding · Large · 20/.test(text) ? text : null; }, { message: 'the "Horizontal padding · Large · 20" pill' })
        .catch(async (error) => { throw new Error(`${error.message} (pill: "${await spacingPill(page)}")`); });
      if (!(await pinkTints(page, "padding"))) throw new Error("the hovered padding is not pink");
      // A click without moving: the scale opens where it was clicked, as before the drag handles.
      await page.mouse.move(gap.x, gap.y);
      await page.mouse.down();
      await page.mouse.up();
      await page.getByRole("option", { name: /^XLarge\b/ }).waitFor({ state: "visible", timeout: 4000 });
      await page.keyboard.press("Escape");
      return `gap "${gapPill}" (pink, handle, hexagon, ew-resize) · padding "${padPill}" · click → the scale`;
    },
  },
  {
    id: "FW-156", feature: "Dragging the gap of an auto layout frame changes it, snapped to the Spacing/Gap ladder and previewed while dragging (Small 12 + 20 → XLarge 32); one write, one ⌘Z; the status line names it Gap XLarge", wp: "Figma parity 2026-10-21 · gap / padding handles", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await spacingPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectLayout(page, id, "Stack", 0);
      const [a, b] = [await shapeBox(page, id, 0), await shapeBox(page, id, 1)];
      const scale = a.width / 60;
      const gap = { x: (a.x + a.width + b.x) / 2, y: a.y + a.height / 2 };
      const during = await dragSpacing(page, gap, { dx: 20 * scale, during: async () => ({ pill: await spacingPill(page), moved: ((await shapeBox(page, id, 1)).x - b.x) / scale, text: await pageText(page, id) }) });
      if (!/Gap · XLarge · 32/.test(during.pill)) throw new Error(`the pill while dragging reads "${during.pill}"`);
      if (Math.abs(during.moved - 20) > 1.5) throw new Error(`the preview moved the second layer ${during.moved.toFixed(1)} px, not 20`);
      if (during.text !== before) throw new Error("written before the release");
      await until(async () => /gap="xl"/.test(tagWith((await pageText(page, id)) ?? "", "Stack", /direction="row"/)), { message: 'the row Stack at gap="xl"' });
      const tag = tagWith((await pageText(page, id)) ?? "", "Stack", /direction="row"/);
      if (!/paddingX="lg"/.test(tag) || !/paddingY="xl"/.test(tag)) throw new Error(`the padding changed too: ${tag}`);
      const status = await until(async () => { const text = await statusText(page); return /Gap XLarge/.test(text) ? text : null; }, { timeout: 5000, message: 'the status line "Gap XLarge"' });
      await oneUndo(page, id, before);
      return `pill "${during.pill}" · the Ellipse moved ${during.moved.toFixed(0)} px · ${tag} · "${status.split(" | ").find((line) => /Gap XLarge/.test(line))}" · one ⌘Z`;
    },
  },
  {
    id: "FW-157", feature: "Dragging an auto layout frame's left padding changes Horizontal padding (Zen's paddingX: the right side moves with it), snapped to Spacing/Padding (Large 20 + 12 → 2XLarge 32); one write, one ⌘Z", wp: "Figma parity 2026-10-21 · gap / padding handles", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await spacingPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectLayout(page, id, "Stack", 0);
      const scale = (await shapeBox(page, id, 0)).width / 60;
      const host = layoutOf(page, id, "Stack");
      const left = await sideArea(page, "left");
      const during = await dragSpacing(page, { x: left.cx, y: left.cy }, { dx: 12 * scale, during: async () => ({
        pill: await spacingPill(page), tints: await pinkTints(page, "padding"),
        padding: await host.evaluate((el) => { const style = getComputedStyle(el); return [style.paddingLeft, style.paddingRight, style.paddingTop].join(" "); }),
      }) });
      if (!/Horizontal padding · 2XLarge · 32/.test(during.pill)) throw new Error(`the pill while dragging reads "${during.pill}"`);
      if (during.padding !== "32px 32px 24px") throw new Error(`the preview's padding (left right top) is ${during.padding}, not 32px 32px 24px`);
      if (during.tints !== 2) throw new Error(`${during.tints} padding areas pink while dragging, not 2 (left and right)`);
      await until(async () => /paddingX="2xl"/.test(tagWith((await pageText(page, id)) ?? "", "Stack", /direction="row"/)), { message: 'paddingX="2xl"' });
      const tag = tagWith((await pageText(page, id)) ?? "", "Stack", /direction="row"/);
      if (!/paddingY="xl"/.test(tag) || !/gap="sm"/.test(tag)) throw new Error(`more than paddingX changed: ${tag}`);
      await until(async () => /Horizontal padding 2XLarge/.test(await statusText(page)), { timeout: 5000, message: 'the status line "Horizontal padding 2XLarge"' });
      await oneUndo(page, id, before);
      return `pill "${during.pill}" · preview ${during.padding} · ${tag} · one ⌘Z`;
    },
  },
  {
    id: "FW-158", feature: "Modifiers as Figma's: ⌥ dragging the top padding sets the bottom too (Vertical padding 2XLarge); ⇧ dragging the left padding sets all four (padding 2XLarge, paddingX / paddingY removed in the same edit); one ⌘Z each", wp: "Figma parity 2026-10-21 · gap / padding handles", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await spacingPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      await selectLayout(page, id, "Stack", 0);
      const scale = (await shapeBox(page, id, 0)).width / 60;
      const top = await sideArea(page, "top");
      const alt = await dragSpacing(page, { x: top.cx, y: top.cy }, { dy: 8 * scale, keys: ["Alt"], during: async () => ({ pill: await spacingPill(page), tints: await pinkTints(page, "padding") }) });
      if (!/Vertical padding · 2XLarge · 32/.test(alt.pill) || alt.tints !== 2) throw new Error(`⌥: pill "${alt.pill}", ${alt.tints} padding areas pink (want top and bottom)`);
      await until(async () => /paddingY="2xl"/.test(tagWith((await pageText(page, id)) ?? "", "Stack", /direction="row"/)), { message: '⌥: paddingY="2xl"' });
      const altTag = tagWith((await pageText(page, id)) ?? "", "Stack", /direction="row"/);
      if (!/paddingX="lg"/.test(altTag)) throw new Error(`⌥ changed the sides too: ${altTag}`);
      await oneUndo(page, id, before);
      await selectLayout(page, id, "Stack", 0);
      const left = await sideArea(page, "left");
      const all = await dragSpacing(page, { x: left.cx, y: left.cy }, { dx: 12 * scale, keys: ["Shift"], during: async () => ({ pill: await spacingPill(page), tints: await pinkTints(page, "padding") }) });
      if (!/^Padding · 2XLarge · 32/.test(all.pill) || all.tints !== 4) throw new Error(`⇧: pill "${all.pill}", ${all.tints} padding areas pink (want all four)`);
      await until(async () => /\spadding="2xl"/.test(tagWith((await pageText(page, id)) ?? "", "Stack", /direction="row"/)), { message: '⇧: padding="2xl"' });
      const allTag = tagWith((await pageText(page, id)) ?? "", "Stack", /direction="row"/);
      if (/paddingX=|paddingY=/.test(allTag)) throw new Error(`⇧ kept a side prop: ${allTag}`);
      await until(async () => /Padding 2XLarge/.test(await statusText(page)), { timeout: 5000, message: 'the status line "Padding 2XLarge"' });
      await oneUndo(page, id, before);
      return `⌥ top: "${alt.pill}" → ${altTag} · ⇧ left: "${all.pill}" → ${allTag} · one ⌘Z each`;
    },
  },
  {
    id: "FW-159", feature: "A Grid's column gap drags too (gap Small → Large); Escape mid-drag writes nothing and drops the preview; a free frame (Box) has no drag handles and a drag on its padding writes nothing", wp: "Figma parity 2026-10-21 · gap / padding handles", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await spacingPage(ctx);
      const before = (await pageText(page, id)) ?? "";
      const grid = await selectLayout(page, id, "Grid", 2);
      const scale = (await shapeBox(page, id, 2)).width / 60;
      const columnGap = (await dragAreas(page)).filter((area) => area.axis === "x").sort((p, q) => Math.abs(p.cx - (grid.x + grid.width / 2)) - Math.abs(q.cx - (grid.x + grid.width / 2)))[0];
      if (!columnGap) throw new Error("no draggable column gap on the Grid");
      const from = { x: columnGap.cx, y: columnGap.cy };
      const pill = await dragSpacing(page, from, { dx: 12 * scale, during: () => spacingPill(page) });
      if (!/Gap · Large · 24/.test(pill)) throw new Error(`the Grid's pill while dragging reads "${pill}"`);
      await until(async () => /gap="lg"/.test(tagWith((await pageText(page, id)) ?? "", "Grid", /columns=/)), { message: 'the Grid at gap="lg"' });
      await oneUndo(page, id, before);
      // Escape while the button is still down: the drag ends, nothing is written, the Grid lays out as before.
      await selectLayout(page, id, "Grid", 2);
      const gridHost = layoutOf(page, id, "Grid");
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      let preview = "";
      try {
        for (let step = 1; step <= 6; step++) { await page.mouse.move(from.x + (20 * scale * step) / 6, from.y); await sleep(30); }
        preview = await gridHost.evaluate((el) => getComputedStyle(el).columnGap);
        await page.keyboard.press("Escape");
      } finally {
        await page.mouse.up();
      }
      await sleep(600);
      const after = await gridHost.evaluate((el) => getComputedStyle(el).columnGap);
      if (preview === after || after !== "12px") throw new Error(`Escape: column gap ${preview} while dragging, ${after} after (want back to 12px)`);
      if ((await pageText(page, id)) !== before) throw new Error("Escape still wrote the drag");
      // A free frame: its padding shows (and clicks to the scale), but nothing drags.
      await selectLayout(page, id, "Box", 4);
      const handles = await page.locator(".studio-selection__spacing-hit[data-drag]").count();
      if (handles) throw new Error(`${handles} drag handles on a free frame`);
      const boxTop = await sideArea(page, "top");
      await dragSpacing(page, { x: boxTop.cx, y: boxTop.cy }, { dy: 10 * scale });
      await page.keyboard.press("Escape");
      await sleep(400);
      if ((await pageText(page, id)) !== before) throw new Error("a drag on the free frame's padding wrote something");
      return `Grid "${pill}" → gap="lg", one ⌘Z · Escape: ${preview} → ${after}, nothing written · free frame: no handles, nothing written`;
    },
  },
  {
    id: "FW-170", feature: "⌥⌘↵ on a selected Overlay frame (a Dialog) presents it as Figma presents a frame: open at once over the Screen that opens it, on that Screen's device, size and device frame; a reload keeps it; Esc closes the Dialog onto the Screen, a second Esc leaves", wp: "present overlay 2026-10-21", timeout: 60_000,
    async run(ctx) {
      const { page } = await presentOverlayPage(ctx);
      const home = await homePlay(page);
      await selectFrameRow(page, "overlay:confirm");
      await presentKey(page);
      const dialog = player(page).getByRole("dialog", { name: "Delete the file?" });
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      const shows = await playShows(page);
      if (shows.screen !== "home" || shows.overlay !== "confirm") throw new Error(`Play shows "${shows.screen}" with ${shows.overlay}, not Files with the Dialog`);
      if (shows.device !== home.device || shows.size !== home.size || shows.framed !== home.framed) throw new Error(`the Overlay plays on ${shows.device} ${shows.size}${shows.framed ? " framed" : ""}, Files on ${home.device} ${home.size}${home.framed ? " framed" : ""}`);
      const start = new URL(page.url()).searchParams.get("play");
      if (start !== "overlay:confirm") throw new Error(`the address says play=${start}`);
      await page.reload();
      await dialog.waitFor({ state: "visible", timeout: 20_000 });
      await page.keyboard.press("Escape");
      await until(async () => (await dialog.count()) === 0, { message: "Esc closes the Dialog" });
      const after = await playShows(page);
      if (after.screen !== "home" || after.overlay) throw new Error(`after Esc Play shows "${after.screen}" with ${after.overlay}`);
      await leavePlay(page);
      return `Files on ${home.device} ${home.size}${home.framed ? " framed" : ""} · ⌥⌘↵ on the Dialog → Files + Dialog, same device · reload keeps it · Esc → Files · Esc → out`;
    },
  },
  {
    id: "FW-171", feature: "Present from the Prototype tab on an Overlay selected in Flow: its interactions run (Move to trash goes to Deleted, Back returns to Files), R restarts on the Overlay over Files, Cancel (its close action) closes it onto Files", wp: "present overlay 2026-10-21", timeout: 60_000,
    async run(ctx) {
      const { page } = await presentOverlayPage(ctx);
      await page.locator("#studio-right").getByRole("tab", { name: "Prototype" }).click();
      const panel = page.locator('[data-e2e="prototype-panel"]');
      await panel.waitFor({ state: "visible", timeout: 5000 });
      await panel.locator('[data-frame="overlay:confirm"] button.studio-inspector__item').click();
      await until(async () => (await page.locator('[data-studio-frame="overlay:confirm"]').getAttribute("data-selected")) === "true", { message: "the Overlay selected from Flow" });
      await panel.getByRole("button", { name: "Present", exact: true }).click();
      await player(page).waitFor({ state: "visible", timeout: 10_000 });
      const dialog = player(page).getByRole("dialog", { name: "Delete the file?" });
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      await dialog.getByRole("button", { name: "Move to trash" }).click();
      await until(async () => (await playShows(page)).screen === "done" && (await dialog.count()) === 0, { message: "Move to trash → Deleted" });
      await player(page).getByRole("button", { name: "Back", exact: true }).click();
      await until(async () => { const shows = await playShows(page); return shows.screen === "home" && !shows.overlay; }, { message: "Back → Files, the Dialog closed" });
      await page.keyboard.press("r");
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      if ((await playShows(page)).screen !== "home") throw new Error("R restarted on another Screen than Files");
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await until(async () => (await dialog.count()) === 0, { message: "Cancel closes the Dialog" });
      if ((await playShows(page)).screen !== "home") throw new Error("Cancel left Files");
      await leavePlay(page);
      await page.locator("#studio-right").getByRole("tab", { name: "Design" }).click();
      return "Flow › Dialog › Present → Files + Dialog · Move to trash → Deleted · Back → Files · R → the Dialog again · Cancel → Files · Esc → out";
    },
  },
  {
    id: "FW-172", feature: "An Overlay no Screen opens (a Bottom Sheet) presents alone from the Design tab's Present: over a blank screen of the page's device, size and device frame, named in the bar, Back off; its close action (Done) leaves Present, and so does one Esc", wp: "present overlay 2026-10-21", timeout: 60_000,
    async run(ctx) {
      const { page } = await presentOverlayPage(ctx);
      const home = await homePlay(page);
      await selectFrameRow(page, "overlay:about");
      await page.locator("#studio-right").getByRole("tab", { name: "Design" }).click();
      await page.locator("#studio-right").getByRole("button", { name: "Present", exact: true }).click();
      await player(page).waitFor({ state: "visible", timeout: 10_000 });
      const sheet = player(page).getByRole("dialog", { name: "About this app" });
      await sheet.waitFor({ state: "visible", timeout: 5000 });
      const shows = await playShows(page);
      if (shows.screen || shows.overlay !== "about") throw new Error(`Play shows "${shows.screen}" with ${shows.overlay}, not the Sheet alone`);
      if (shows.device !== home.device || shows.size !== home.size || shows.framed !== home.framed) throw new Error(`the Sheet plays on ${shows.device} ${shows.size}${shows.framed ? " framed" : ""}, Files on ${home.device} ${home.size}${home.framed ? " framed" : ""}`);
      const blank = await player(page).locator(".studio-player__screen[data-blank] .studio-builder-screen").getAttribute("data-device", { timeout: 2000 }).catch(() => null);
      if (blank !== "phone") throw new Error(`under the Sheet: ${blank ?? "no blank screen"}, not a blank phone screen`);
      if (!(await player(page).innerText()).includes("· About this app")) throw new Error("the bar does not name the Sheet");
      if (!(await player(page).getByRole("button", { name: "Back", exact: true }).isDisabled())) throw new Error("Back is on with nothing to go back to");
      await sheet.getByRole("button", { name: "Done" }).click();
      await player(page).waitFor({ state: "hidden", timeout: 5000 });
      await page.locator(".studio-viewport").focus();
      await presentKey(page);
      await sheet.waitFor({ state: "visible", timeout: 5000 });
      await leavePlay(page);
      return `the Sheet alone on a blank ${shows.device} ${shows.size}${shows.framed ? " framed" : ""} · Done → out · ⌥⌘↵ · Esc → out`;
    },
  },
  {
    id: "FW-173", feature: "⌘K › Present on an Overlay the Overlay places (a Card, top right, dimmed) opens it over the Screen that opens it at once (no animation); a press outside closes it onto the Screen; Esc leaves", wp: "present overlay 2026-10-21", timeout: 60_000,
    async run(ctx) {
      const { page } = await presentOverlayPage(ctx);
      await selectFrameRow(page, "overlay:tip");
      await page.keyboard.press("ControlOrMeta+KeyK");
      const actions = page.getByRole("dialog", { name: "Actions" });
      await actions.waitFor({ state: "visible", timeout: 5000 });
      await actions.getByLabel("Search actions").fill("Present");
      await actions.locator(".studio-quick__option", { has: page.locator(".studio-quick__label", { hasText: /^Present$/ }) }).first().click();
      await player(page).waitFor({ state: "visible", timeout: 10_000 });
      const layer = player(page).locator('.studio-player__overlay[data-position="top-right"][data-background="true"]');
      await layer.waitFor({ state: "visible", timeout: 5000 });
      if (!(await layer.innerText()).includes("Tip: swipe a file to delete it.")) throw new Error("the Card is not in the overlay");
      if (await layer.locator(".studio-player__overlay-content[data-motion]").count()) throw new Error("the presented Card animates in");
      const shows = await playShows(page);
      if (shows.screen !== "home" || shows.overlay !== "tip") throw new Error(`Play shows "${shows.screen}" with ${shows.overlay}, not Files with the Card`);
      const box = await layer.boundingBox();
      await page.mouse.click(box.x + 24, box.y + box.height - 24);
      await until(async () => !(await playShows(page)).overlay, { message: "a press outside closes the Card" });
      if ((await playShows(page)).screen !== "home") throw new Error("the press outside left Files");
      await leavePlay(page);
      return "⌘K › Present → Files + the Card top right, dimmed, no animation · press outside → Files · Esc → out";
    },
  },
  {
    id: "FW-174", feature: "Normal frames present as before: ⌥⌘↵ on a layer in a Screen plays from that Screen with no Overlay; the Prototype tab's Present on a Screen frame plays from it; the Design tab's Present on a Screen frame still presents the frame", wp: "present overlay 2026-10-21", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await presentOverlayPage(ctx);
      await clickNamed(page, id, "Button", 2);
      await until(async () => (await selectedName(page)) === "Button", { message: "the Undo Button selected" });
      await page.locator(".studio-viewport").focus();
      await presentKey(page);
      await until(async () => (await playShows(page)).screen === "done", { message: "Play on Deleted" });
      if ((await playShows(page)).overlay || (await playerDevice(page).locator('[role="dialog"]').count())) throw new Error("an Overlay opened from a Screen's layer");
      await leavePlay(page);
      await selectFrameRow(page, "screen:home");
      await page.locator("#studio-right").getByRole("tab", { name: "Prototype" }).click();
      await page.locator('[data-e2e="prototype-panel"]').getByRole("button", { name: "Present", exact: true }).click();
      await player(page).waitFor({ state: "visible", timeout: 10_000 });
      await until(async () => { const shows = await playShows(page); return shows.screen === "home" && !shows.overlay; }, { message: "Play on Files, no Overlay" });
      await leavePlay(page);
      await page.locator("#studio-right").getByRole("tab", { name: "Design" }).click();
      await page.locator("#studio-right").getByRole("button", { name: "Present", exact: true }).click();
      const present = page.locator(".studio-present");
      await present.waitFor({ state: "visible", timeout: 5000 });
      if (await player(page).count()) throw new Error("the Design tab's Present on a Screen frame started Play");
      await page.keyboard.press("Escape");
      await present.waitFor({ state: "hidden", timeout: 5000 });
      return "⌥⌘↵ on Undo → Deleted, no Overlay · Prototype › Present on Files → Files · Design › Present on Files → the frame presented";
    },
  },
];

/* ── Select matching layers / Select all with same › helpers ─────────────────────────────────────────────────────── */

/** Three phone Screens with a free frame (an accent Rectangle, an Ellipse), a Caption text and a Button; screen two's
 *  Rectangle is named Hero and its Button secondary; screen three sits in a Section. */
const matchText = (title) => {
  const screen = (frame, x, { name = "", level = "primary", caption = "Caption/Regular" } = {}) => [
    `      <Screen id="${frame}" title="${frame}" device="phone" x={${x}} y={0} width={390} height={844}>`,
    "        <Box width={358} height={200}>",
    `          <Shape type="rectangle" position="absolute" insetLeft={20} insetTop={20} width={80} height={60} fill="accent-solid"${name ? ` data-name="${name}"` : ""} />`,
    '          <Shape type="ellipse" position="absolute" insetLeft={140} insetTop={40} width={60} height={60} />',
    "        </Box>",
    `        <Text textStyle="${caption}">Hello</Text>`,
    `        <Button level="${level}">Save</Button>`,
    "      </Screen>",
  ].join("\n");
  return [
    `// @zen-page ${JSON.stringify({ format: 1, title })}`,
    'import { Board, Screen, Section } from "@zen-ds/react/builder";',
    'import { Box, Button, Shape, Text } from "@zen-ds/react";',
    "export const mock = {};",
    "",
    "export default function Page() {",
    "  return (",
    "    <Board>",
    screen("one", 0),
    screen("two", 500, { name: "Hero", level: "secondary" }),
    '      <Section id="later" title="Later" x={960} y={-80} width={480} height={1020} />',
    screen("three", 1000, { caption: "Body/Base/Bold" }),
    "    </Board>",
    "  );",
    "}",
    "",
  ].join("\n");
};
let matchMade = null;
async function matchPage(ctx) {
  const { page } = await ctx.studio();
  if (!matchMade) matchMade = (await seededPage(ctx, matchText, /id="later"/)).id;
  else if (!page.url().includes(encodeURIComponent(`local:${matchMade}`))) {
    await page.goto(`${ctx.server.url}/studio.html?page=${encodeURIComponent(`local:${matchMade}`)}`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-studio-frame^="screen:"]').first().waitFor({ state: "attached", timeout: 20_000 });
    await sleep(500);
  }
  await deselect(page);
  return { page, id: matchMade };
}
/** The n-th Shape of a frame on the match page. */
const layerIn = (page, id, frameId, index, name = "Shape") => page.locator(`[data-studio-frame="${frameId}"] [data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="${name}"]`).nth(index);
/** ⌘-clicks the n-th Shape of a frame (Figma's deep select). */
async function pickIn(page, id, frameId, index) {
  const box = await layerIn(page, id, frameId, index).boundingBox();
  await page.keyboard.down("ControlOrMeta");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.up("ControlOrMeta");
  await until(async () => (await selectedSrc(page)).length === 1, { timeout: 4000, message: "a layer selected" });
}
/** ⌘-clicks the first `name` layer of a frame. */
async function pickNamedIn(page, id, frameId, name) {
  const box = await layerIn(page, id, frameId, 0, name).boundingBox();
  await page.keyboard.down("ControlOrMeta");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.up("ControlOrMeta");
  await until(async () => (await selectedSrc(page)).length === 1, { timeout: 4000, message: `${name} selected` });
}
/** Right-click on the layer › Select all with same › `item`. */
async function sameFromMenu(page, id, frameId, index, item, name = "Shape", { onHandle = false } = {}) {
  const box = await layerIn(page, id, frameId, index ?? 0, name).boundingBox();
  if (onHandle) {
    // On the selected layer's left resize handle: its menu opens there too (Figma's), as a short text is mostly handles.
    const handle = await page.locator('.studio-resize__handle[data-handle="w"]').first().boundingBox();
    if (!handle) throw new Error("no left resize handle on the selected layer");
    await page.mouse.click(handle.x + handle.width / 2, handle.y + handle.height / 2, { button: "right" });
  } else {
    // Off the middle: a selected layer's handles sit there (an ellipse's arc dot, a short text's edge handles).
    await page.mouse.click(box.x + Math.min(12, box.width / 4), box.y + box.height / 2, { button: "right" });
  }
  // A step that does not come names the menus that show (their labels and items).
  const menus = () => page.evaluate(() => [...document.querySelectorAll('[role="menu"]')].map((menu) => `${menu.getAttribute("aria-label") ?? "?"}: ${[...menu.querySelectorAll('[role="menuitem"]')].map((item) => item.textContent?.trim()).join(" / ")}`).join(" || "));
  const step = (promise, what) => promise.catch(async (error) => { throw new Error(`${what}: ${String(error.message).split("\n")[0]} (menus: ${(await menus()).slice(0, 300) || "none"})`); });
  const menu = page.getByRole("menu").last();
  await step(menu.waitFor({ state: "visible", timeout: 5000 }), "the layer menu");
  await step(menu.getByRole("menuitem", { name: /^Select all with same/ }).click({ timeout: 5000 }), "Select all with same ›");
  const list = page.getByRole("menu", { name: "Select all with same" });
  await step(list.waitFor({ state: "visible", timeout: 5000 }), "the Select all with same list");
  await step(list.getByRole("menuitem", { name: new RegExp(`^${item}`) }).click({ timeout: 5000 }), item);
}
