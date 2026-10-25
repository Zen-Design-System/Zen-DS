// Drag-and-drop campaign (user, 2026-10-17: "test hết mọi case kéo thả, kéo component vào mà không có box(frame) hoặc
// stack. Kéo top navigation vào rồi đặt lên top, test list box, content dài quá trang mobile… scroll thử"): real pointer
// drags from Assets onto a builder page, every Assets item at every kind of place, layers moved by drag, and a long phone
// page scrolled in Play. Opt-in (about 30 minutes): npm run studio:e2e -- --only=dnd. The engine half (every item at every
// place of several pages, 18,000+ cases in a minute) is tools/studio/dnd-matrix.mjs.
import fs from "node:fs";
import path from "node:path";
import { eachElement, parsePage } from "../../dialect.mjs";
import { codeOfItem, components, grow, items } from "../../dnd-engine.mjs";
import { newPageText } from "../../dialect.mjs";
import { pagesDirOf } from "../lib/server.mjs";
import { openAssetLibrary, showLeftTab, sleep, statusText, until } from "../lib/studio.mjs";
import { clickNamed, mineOption, pageText, seededPage, selectedName } from "./builder.mjs";

/* ── the seed: a phone page (bars, body Stack with a List Box, a Card, a free Box) and an empty phone Screen ───────── */

function richPhone(title) {
  let text = newPageText({ title, device: "phone", chrome: true });
  for (const id of ["list-box", "card"]) text = grow(text, "Stack", codeOfItem(id));
  text = grow(text, "Stack", '<Box padding="md" height={160} />');
  text = grow(text, "Box", '<Shape type="rectangle" position="absolute" insetLeft={24} insetTop={24} width={64} height={64} />');
  return grow(text, "Board", '<Screen id="screen-2" title="Empty" device="phone" />');
}

/** A phone page with nothing but a Screen: no bars, no Stack (the user's "không có box(frame) hoặc stack"). */
const emptyPhone = (title) => newPageText({ title, device: "phone", empty: true });

const ITEMS = items.filter((item) => item.code);
const BAR = { TopNavigation: "topNavigation", BottomNavigation: "bottomNavigation" };

/* ── reading a page ─────────────────────────────────────────────────────────────────────────────────────────────── */

/** Every element with its chain ("Board>Screen#screen-2>Stack>Button"); a Screen is named by its id. */
function chains(text) {
  const out = [];
  const board = parsePage(text, { components }).board;
  eachElement(board, (node, parents) => {
    const name = (step) => (step.name === "Screen" ? `Screen#${step.props.id?.value}` : step.name);
    out.push({ node, parents, chain: [...parents.map(name), name(node)].join(">") });
  });
  return out;
}

/** The element a drop added (named `root`, the outermost new one), or null. */
function added(before, after, root) {
  const left = new Map();
  for (const { chain } of chains(before)) left.set(chain, (left.get(chain) ?? 0) + 1);
  const fresh = chains(after).filter(({ chain }) => {
    const n = left.get(chain) ?? 0;
    if (n > 0) { left.set(chain, n - 1); return false; }
    return true;
  });
  return fresh.filter(({ node }) => node.name === root).sort((a, b) => a.chain.length - b.chain.length)[0] ?? null;
}

/** The names of an element's children (the body Stack's order). */
const kidNames = (entry) => (entry?.node.children ?? []).filter((child) => child.kind === "element").map((child) => child.name);
const bodyOf = (text, screen = "screen-1") => chains(text).find(({ chain }) => chain === `Board>Screen#${screen}>Stack`) ?? null;
/** A Screen's bar prop as written (the element's text), or "". */
const barText = (text, screen, prop) => {
  const at = text.indexOf(`id="${screen}"`);
  const next = text.indexOf("<Screen", at + 1);
  const scope = text.slice(at, next < 0 ? undefined : next);
  const start = scope.indexOf(`${prop}={`);
  return start < 0 ? "" : scope.slice(start, scope.indexOf("/>", start) + 2);
};

/* ── the canvas ─────────────────────────────────────────────────────────────────────────────────────────────────── */

const frameBox = (page, screen) => page.locator(`[data-studio-frame="screen:${screen}"]`).first().boundingBox();
const named = (page, id, name, index = 0) => page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="${name}"]`).nth(index);
const boxOf = async (page, id, name, index = 0) => {
  const element = named(page, id, name, index);
  await element.waitFor({ state: "visible", timeout: 5000 }).catch(() => undefined);
  return element.boundingBox({ timeout: 2000 }).catch(() => null);
};
const center = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

async function fit(page) {
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Shift+Digit1");
  await sleep(350);
}

/** A real drag in small steps; the overlay's label and tone just before the drop. */
async function dragTo(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= 12; step += 1) {
    await page.mouse.move(from.x + ((to.x - from.x) * step) / 12, from.y + ((to.y - from.y) * step) / 12);
    await sleep(14);
  }
  await sleep(120);
  const label = page.locator(".studio-drag__label").first();
  const shown = (await label.count()) ? { label: (await label.innerText().catch(() => "")).trim(), tone: await label.getAttribute("data-tone").catch(() => null) } : { label: "", tone: null };
  await page.mouse.up();
  return shown;
}

/** Waits for the page's text to change from `before` (null after `ms`). */
async function changed(page, id, before, ms = 5000) {
  let now = before;
  await until(async () => { now = (await pageText(page, id)) ?? before; return now !== before; }, { timeout: ms }).catch(() => undefined);
  return now !== before ? now : null;
}

/** The page back to `text`: ⌘Z, else written again through the pages folder (Sync with the folder). */
async function restore(ctx, page, id, text) {
  if (((await pageText(page, id)) ?? "") === text) return "same";
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("ControlOrMeta+z");
  const back = await until(async () => ((await pageText(page, id)) ?? "") === text, { timeout: 4000 }).then(() => true, () => false);
  if (back) return "undo";
  fs.writeFileSync(path.join(ctx.root, pagesDirOf(ctx.server.port), `${id}.zen.tsx`), text);
  await mineOption(page, /^Sync with the folder/);
  await until(async () => ((await pageText(page, id)) ?? "") === text, { timeout: 8000 });
  await page.reload();
  await page.locator('[data-studio-frame^="screen:"]').first().waitFor({ state: "attached", timeout: 15000 });
  await fit(page);
  return "rewritten";
}

/** The Assets tile of `item` (searched by its label), or null when the library does not offer it here. */
async function tileOf(page, item) {
  const panel = page.locator("#studio-left-panel-assets");
  if (!(await panel.isVisible().catch(() => false)) || !(await panel.getByLabel("Search components").count())) await openAssetLibrary(page, "Components");
  await panel.getByLabel("Search components").fill(item.label);
  const tile = panel.locator(`[data-asset="${item.id}"]`).first();
  if (!(await tile.waitFor({ state: "visible", timeout: 2500 }).then(() => true, () => false))) return null;
  await tile.scrollIntoViewIfNeeded().catch(() => undefined);
  return tile.boundingBox();
}

/** Whether a new layer fits its phone Screen across (a layer wider than the phone is a broken mobile layout). */
async function fits(page, id, loc, screen) {
  const rect = await page.evaluate((src) => window.__e2e.rectOf(src), `local:${id}.zen.tsx:${loc}`);
  const frame = await frameBox(page, screen);
  if (!rect || !frame || !rect.width) return { ok: true };
  const over = Math.max(rect.x + rect.width - (frame.x + frame.width), frame.x - rect.x);
  return over > 1.5 ? { ok: false, why: `${Math.round(over)}px wider than the phone (${Math.round(rect.width)} in ${Math.round(frame.width)})` } : { ok: true };
}

/* ── the places ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Where each drop goes, what it must write, and how to tell. `expect(before, after, item)` returns null when right, else
 * why not; a bar item (Top / Bottom Navigation) goes to its bar wherever it is dropped on a phone Screen.
 */
const PLACES = [
  {
    key: "empty Screen (no frame, no Stack)", screen: "screen-2",
    at: async (page) => center(await frameBox(page, "screen-2")),
    expect(before, after, item) {
      if (BAR[item.root]) return barText(after, "screen-2", BAR[item.root]) ? null : `no ${BAR[item.root]} on the empty Screen`;
      const node = added(before, after, item.root);
      return node?.chain === `Board>Screen#screen-2>${item.root}` ? null : `landed at ${node?.chain ?? "nowhere"}`;
    },
  },
  {
    key: "body Stack, before the Card", screen: "screen-1",
    at: async (page, id) => { const card = await boxOf(page, id, "Card"); return card && { x: card.x + card.width / 2, y: card.y + 3 }; },
    expect(before, after, item) {
      if (BAR[item.root]) return barText(after, "screen-1", BAR[item.root]) !== barText(before, "screen-1", BAR[item.root]) ? null : `${BAR[item.root]} not replaced`;
      // The body's layers in order: the new one right where the Card was, the Card after it.
      const was = kidNames(bodyOf(before));
      const want = [...was.slice(0, was.indexOf("Card")), item.root, ...was.slice(was.indexOf("Card"))];
      const kids = kidNames(bodyOf(after));
      return kids.join(",") === want.join(",") ? null : `landed at ${added(before, after, item.root)?.chain ?? "nowhere"} (body: ${kids.join(", ")})`;
    },
  },
  {
    key: "on the Top navigation bar", screen: "screen-1",
    at: async (page) => { const bar = await page.locator('[data-studio-frame="screen:screen-1"] .studio-builder-screen__top').first().boundingBox(); return bar && center(bar); },
    expect(before, after, item) {
      if (BAR[item.root]) return barText(after, "screen-1", BAR[item.root]) !== barText(before, "screen-1", BAR[item.root]) ? null : `${BAR[item.root]} not replaced`;
      const node = added(before, after, item.root);
      return node?.chain === `Board>Screen#screen-1>Stack>${item.root}` && kidNames(bodyOf(after))[0] === item.root ? null : `landed at ${node?.chain ?? "nowhere"} (expected first in the body)`;
    },
  },
  {
    key: "into the Card", screen: "screen-1",
    at: async (page, id) => { const card = await boxOf(page, id, "Card"); return card && center(card); },
    expect(before, after, item) {
      if (BAR[item.root]) return barText(after, "screen-1", BAR[item.root]) !== barText(before, "screen-1", BAR[item.root]) ? null : `${BAR[item.root]} not replaced`;
      const node = added(before, after, item.root);
      return node?.chain.startsWith("Board>Screen#screen-1>Stack>Card>") ? null : `landed at ${node?.chain ?? "nowhere"}`;
    },
  },
  {
    // A Frame without auto layout (its one layer floats): the drop lands where the pointer is, floating (Figma's), so
    // it may run past the phone's edge as in Figma (the frame clips): no across-the-phone check.
    key: "into the free Box (frame)", screen: null,
    at: async (page, id) => { const box = await boxOf(page, id, "Box"); return box && { x: box.x + box.width * 0.3, y: box.y + box.height * 0.6 }; },
    expect(before, after, item) {
      if (BAR[item.root]) return barText(after, "screen-1", BAR[item.root]) !== barText(before, "screen-1", BAR[item.root]) ? null : `${BAR[item.root]} not replaced`;
      const node = added(before, after, item.root);
      const floats = (text) => (text.match(/position="absolute" insetLeft=\{\d+\} insetTop=\{\d+\}/g) ?? []).length;
      if (!node?.chain.startsWith("Board>Screen#screen-1>Stack>Box>")) return `landed at ${node?.chain ?? "nowhere"}`;
      return floats(after) === floats(before) + 1 ? null : "not placed where it was dropped (no new position / insets)";
    },
  },
  {
    key: "on the board, outside every frame", screen: null, every: 4,
    at: async (page) => { const box = await frameBox(page, "screen-2"); return box && { x: box.x + box.width + 60, y: box.y + 40 }; },
    refused: /Drop it into a frame/,
  },
];

/* ── the run ────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Drags each of `list` to each place, judges the result, puts the page back; throws with the failures at the end. */
async function campaign(ctx, all, label) {
  const list = chosen(all);
  // The session first: ctx.studio() goes back to the host page when asked later.
  const session = await ctx.studio();
  const { page, id } = await seededPage(ctx, richPhone, /id="screen-2"/);
  const seed = (await pageText(page, id)) ?? "";
  await fit(page);
  const failures = [];
  const report = [];
  let cases = 0;
  let skipped = 0;
  for (const [index, item] of list.entries()) {
    const tile = await tileOf(page, item).catch(() => null);
    if (!tile) { skipped += 1; report.push({ item: item.id, skipped: "not in Assets here" }); continue; }
    for (const place of PLACES) {
      if (place.every && index % place.every) continue;
      cases += 1;
      const errorsBefore = session.errors.length;
      let missing = "";
      const measure = () => place.at(page, id).catch((error) => { missing = error.message.split("\n")[0]; return null; });
      // A frame that is drawing again after the last ⌘Z has no box for a moment: fit the view and measure once more.
      let to = await measure();
      if (!to) { await fit(page); to = await measure(); }
      const from = await tileOf(page, item).catch(() => null);
      if (!to || !from) { failures.push(`${item.id} → ${place.key}: no ${to ? "tile" : `place on screen${missing ? ` (${missing})` : ""}`}`); continue; }
      const shown = await dragTo(page, center(from), to);
      let why = null;
      // An App shell is a whole page: anywhere but an empty Screen it is refused, and the drag says so.
      const refused = place.refused ?? (item.root === "AppShell" && place.screen !== "screen-2" ? /whole page/ : null);
      if (refused) {
        const after = await changed(page, id, seed, 900);
        if (after) why = "written although refused";
        else if (!refused.test(shown.label)) why = `label "${shown.label}" (expected ${refused})`;
      } else {
        const after = await changed(page, id, seed);
        if (!after) why = `nothing written (label "${shown.label}", ${shown.tone ?? "no tone"})`;
        else {
          why = place.expect(seed, after, item);
          const node = !why && !BAR[item.root] ? added(seed, after, item.root) : null;
          if (node && place.screen) {
            await sleep(150);
            const fit = await fits(page, id, node.node.loc, place.screen);
            if (!fit.ok) why = `fits badly: ${fit.why}`;
          }
        }
      }
      const errors = session.errors.slice(errorsBefore).filter((line) => !/favicon|ResizeObserver/.test(line));
      if (errors.length) why = `${why ? `${why}; ` : ""}page error: ${errors[0].slice(0, 160)}`;
      if (why) failures.push(`${item.id} → ${place.key}: ${why}`);
      report.push({ item: item.id, place: place.key, label: shown.label, ok: !why, why });
      const back = await restore(ctx, page, id, seed).catch((error) => `restore failed: ${error.message}`);
      if (back !== "same" && back !== "undo") failures.push(`${item.id} → ${place.key}: ⌘Z did not bring the page back (${back})`);
    }
  }
  fs.writeFileSync(path.join(ctx.outDir, `${ctx.stamp}-dnd-${label}.json`), JSON.stringify({ cases, skipped, failures, report }, null, 2));
  if (failures.length) throw new Error(`${failures.length} of ${cases} drops wrong · ${failures.slice(0, 6).join(" | ")}${failures.length > 6 ? " | …" : ""}`);
  return `${cases} drops right${skipped ? `, ${skipped} items not offered on a builder page` : ""}`;
}

/** Selects the layer `name` on the canvas: the deepest layer at its middle, then Escape up to it (Figma's Esc). */
async function selectLayer(page, id, name, index = 0) {
  // With nothing selected the Inspector names the page: the click's layer is the first other name it shows.
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("Escape");
  await sleep(150);
  const pageName = await selectedName(page);
  await clickNamed(page, id, name, index);
  let now = "";
  await until(async () => { now = await selectedName(page); return Boolean(now) && now !== pageName; }, { timeout: 3000 }).catch(() => undefined);
  for (let up = 0; up < 5 && now !== name && (await codeName(page)) !== name; up += 1) {
    const was = now;
    await page.keyboard.press("Escape");
    await until(async () => (now = await selectedName(page)) !== was, { timeout: 2000 }).catch(() => undefined);
  }
  return (await codeName(page)) === name ? name : now;
}

/** The selected layer's code name: a frame's panel heads it Frame or Group and keeps its code name on hover (FW-142). */
const codeName = (page) => page.locator("#studio-right h2").first().getAttribute("title", { timeout: 1000 }).catch(() => null);

/** Moves layers of the body by dragging them on the canvas, each to each place (one ⌘Z each). */
async function moves(ctx) {
  const { page, id } = await seededPage(ctx, richPhone, /id="screen-2"/);
  const seed = (await pageText(page, id)) ?? "";
  await fit(page);
  const failures = [];
  let cases = 0;
  const body = (after) => kidNames(bodyOf(after));
  const emptyScreen = ["the empty Screen", async () => center(await frameBox(page, "screen-2")), (node) => node.chain === `Board>Screen#screen-2>${node.node.name}`];
  // Each layer to the empty Screen and to one place in the body (a top or bottom band: beside that layer, Figma's line).
  const plan = [
    ["Text", [emptyScreen, ["after the Box", async () => { const box = await boxOf(page, id, "Box"); return box && { x: box.x + box.width / 2, y: box.y + box.height - 3 }; }, (node, after) => body(after).at(-1) === "Text"]]],
    ["ListBox", [emptyScreen, ["into the Card", async () => { const card = await boxOf(page, id, "Card"); return card && center(card); }, (node) => node.chain.startsWith("Board>Screen#screen-1>Stack>Card>")]]],
    ["Card", [emptyScreen, ["the top of the body", async () => { const text = await boxOf(page, id, "Text"); return text && { x: text.x + text.width / 2, y: text.y + 3 }; }, (node, after) => body(after)[0] === "Card"]]],
    ["Box", [emptyScreen, ["before the List box", async () => { const list = await boxOf(page, id, "ListBox"); return list && { x: list.x + list.width / 2, y: list.y + 3 }; }, (node, after) => body(after).indexOf("Box") === body(after).indexOf("ListBox") - 1]]],
  ];
  for (const [name, targets] of plan) {
    for (const [where, at, right] of targets) {
      cases += 1;
      // Select the layer itself (the canvas picker, ⌘ for the layer under a frame), then drag it by its middle.
      const selected = await selectLayer(page, id, name);
      const box = await boxOf(page, id, name);
      const to = await at();
      if (selected !== name || !box || !to) { failures.push(`${name} → ${where}: ${selected !== name ? `selected ${selected || "nothing"}` : "not on screen"}`); continue; }
      const shown = await dragTo(page, center(box), to);
      const after = await changed(page, id, seed);
      const before = new Set(chains(seed).map(({ chain }) => chain));
      const moved = after ? chains(after).find(({ node, chain }) => node.name === name && !before.has(chain)) ?? chains(after).find(({ node }) => node.name === name) : null;
      if (!after) failures.push(`${name} → ${where}: nothing moved (label "${shown.label}")`);
      else if (!moved || !right(moved, after)) failures.push(`${name} → ${where}: landed at ${moved?.chain ?? "?"} (body: ${body(after).join(", ")})`);
      else if ((after.match(new RegExp(`<${name}[\\s/>]`, "g")) ?? []).length !== (seed.match(new RegExp(`<${name}[\\s/>]`, "g")) ?? []).length) failures.push(`${name} → ${where}: copied, not moved`);
      const back = await restore(ctx, page, id, seed).catch((error) => `restore failed: ${error.message}`);
      if (back !== "same" && back !== "undo") failures.push(`${name} → ${where}: ⌘Z did not bring the page back (${back})`);
      await page.keyboard.press("Escape");
    }
  }
  if (failures.length) throw new Error(`${failures.length} of ${cases} moves wrong · ${failures.slice(0, 6).join(" | ")}`);
  return `${cases} moves right, each one ⌘Z`;
}

/**
 * Layers panel drags (Figma's): a layer's row onto the empty Screen's frame row goes into that Screen; onto another row's
 * upper half goes above it in Layers, which lists the front-most layer first (data-order="front"), so after it in the
 * code; onto the middle of a layout row (a Card) goes inside it, last. One ⌘Z each. A Screen has no row of its own
 * under its frame row: the frame row is the Screen's.
 */
async function layersMoves(ctx) {
  await ctx.studio();
  const { page, id } = await seededPage(ctx, richPhone, /id="screen-2"/);
  const seed = (await pageText(page, id)) ?? "";
  await fit(page);
  await showLeftTab(page, "layers");
  const tree = page.locator(".studio-layers__tree");
  const nodeRow = (name) => tree.locator('[role="treeitem"][data-kind="node"]').filter({ hasText: new RegExp(`^\\s*${name}\\b`) }).first();
  const frameRow = (frame) => tree.locator(`[role="treeitem"][data-layer-id="frame:screen:${frame}"]`).first();
  const failures = [];
  const box = async (locator) => locator.boundingBox({ timeout: 3000 }).catch(() => null);
  const plan = [
    ["Card", "the empty Screen's frame row", async () => { const at = await box(frameRow("screen-2")); return at && center(at); }, (after) => chains(after).some(({ chain }) => chain === "Board>Screen#screen-2>Card")],
    ["Box", "the List box row's upper half", async () => { const at = await box(nodeRow("ListBox")); return at && { x: at.x + at.width / 2, y: at.y + at.height * 0.2 }; }, (after) => { const kids = kidNames(bodyOf(after)); return kids.indexOf("Box") === kids.indexOf("ListBox") + 1; }],
    ["Text", "the middle of the Card's row", async () => { const at = await box(nodeRow("Card")); return at && center(at); }, (after) => chains(after).some(({ chain }) => chain === "Board>Screen#screen-1>Stack>Card>Text") && !kidNames(bodyOf(after)).includes("Text")],
  ];
  for (const [name, where, at, right] of plan) {
    // Selected on the canvas, its row shows (Layers opens to the selection) and is the selected row.
    await selectLayer(page, id, name);
    await showLeftTab(page, "layers");
    const row = tree.locator('[role="treeitem"][aria-selected="true"]').first();
    await row.scrollIntoViewIfNeeded().catch(() => undefined);
    const from = await box(row);
    const to = await at();
    if (!from || !to) { failures.push(`${name} → ${where}: no ${from ? "target" : "row"} in Layers`); continue; }
    await dragTo(page, center(from), to);
    const after = await changed(page, id, seed);
    if (!after) failures.push(`${name} → ${where}: nothing moved`);
    else if (!right(after)) failures.push(`${name} → ${where}: wrong place (body: ${kidNames(bodyOf(after)).join(", ")})`);
    const back = await restore(ctx, page, id, seed).catch((error) => `restore failed: ${error.message}`);
    if (back !== "same" && back !== "undo") failures.push(`${name} → ${where}: ⌘Z did not bring the page back (${back})`);
  }
  if (failures.length) throw new Error(`${failures.length} of ${plan.length} Layers drags wrong · ${failures.join(" | ")}`);
  return `${plan.length} Layers drags right (into a Screen's row, above a row, into a Card's row), each one ⌘Z`;
}

/**
 * The user's story on an empty phone page, by real drags only: Top navigation onto the Screen's top, a List box, then
 * content past the phone's height; the canvas draws the Screen whole with its bar on top; Play scrolls it to the end with
 * the bar staying put and nothing wider than the phone.
 */
async function story(ctx) {
  const { page, id } = await seededPage(ctx, emptyPhone, /<Screen id="screen-1"[^>]*\/>/);
  await fit(page);
  const steps = [];
  const drop = async (itemId, point, label) => {
    const item = ITEMS.find((one) => one.id === itemId);
    const before = (await pageText(page, id)) ?? "";
    const from = await tileOf(page, item);
    if (!from) throw new Error(`${item.label} is not in Assets`);
    const shown = await dragTo(page, center(from), await point());
    const after = await changed(page, id, before);
    if (!after) throw new Error(`${label}: nothing written (label "${shown.label}")`);
    steps.push(`${label} ("${shown.label}")`);
    return after;
  };
  const screen = async () => frameBox(page, "screen-1");
  let text = await drop("top-navigation", async () => { const box = await screen(); return { x: box.x + box.width / 2, y: box.y + 20 }; }, "Top navigation → top");
  if (!/topNavigation=\{<TopNavigation/.test(text)) throw new Error(`the Top navigation is not the Screen's bar:\n${text.slice(text.indexOf("<Screen"), text.indexOf("<Screen") + 300)}`);
  text = await drop("list-box", async () => center(await screen()), "List box → Screen");
  if (!chains(text).some(({ chain }) => chain === "Board>Screen#screen-1>ListBox")) throw new Error("the List box is not in the Screen");
  // Content past the phone: cards and charts below the list, each dropped under the last layer.
  // Each goes right before the last block (its top band: beside it in the Screen), so the page keeps growing at its end
  // whatever the last block is (a Card's own area would take the drop into it).
  const fill = ["card", "bar-chart", "metric-card", "card", "list-box", "line-chart", "card", "card"];
  for (const [k, itemId] of fill.entries()) {
    if (!ITEMS.some((one) => one.id === itemId)) throw new Error(`no Assets item ${itemId}`);
    text = await drop(itemId, async () => {
      const last = await page.locator('[data-studio-frame="screen:screen-1"] .studio-builder-screen__content > *:last-child').first().boundingBox();
      return { x: last.x + last.width / 2, y: last.y + 3 };
    }, `${itemId} #${k + 1} → before the last block`);
    await fit(page);
  }
  // The canvas: the Screen is drawn whole (taller than a phone), its bar at its top.
  const frame = await screen();
  const top = await page.locator('[data-studio-frame="screen:screen-1"] .studio-builder-screen__top').first().boundingBox();
  const zoom = await page.evaluate(() => { const el = document.querySelector('[data-studio-frame="screen:screen-1"] .studio-builder-screen'); return el ? el.getBoundingClientRect().width / el.offsetWidth : 1; });
  if (frame.height / zoom < 900) throw new Error(`the Screen is ${Math.round(frame.height / zoom)}px tall after ${fill.length} blocks: the content does not grow it`);
  if (!top || Math.abs(top.y - frame.y) > 2 * zoom + 1) throw new Error(`the Top navigation is ${top ? Math.round((top.y - frame.y) / zoom) : "?"}px from the Screen's top on the canvas`);
  // Play: scroll to the end; the bar stays at the top, the last block shows whole, nothing scrolls sideways.
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("Escape");
  await page.keyboard.press("ControlOrMeta+Alt+Enter");
  const player = page.locator(".studio-player");
  await player.waitFor({ state: "visible", timeout: 5000 });
  await sleep(400);
  const measured = await player.evaluate((root) => {
    const nav = root.querySelector(".zen-top-nav");
    let box = nav;
    while (box && box !== root.parentElement && !(box.scrollHeight > box.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
    if (!box || box === root.parentElement) return { error: "nothing scrolls the played page" };
    box.scrollTop = box.scrollHeight;
    const view = box.getBoundingClientRect();
    const navBox = nav.getBoundingClientRect();
    const content = root.querySelector(".studio-builder-screen__content");
    const last = content?.lastElementChild?.lastElementChild ?? content?.lastElementChild;
    const lastBox = last?.getBoundingClientRect();
    const screen = root.querySelector(".studio-builder-screen");
    return {
      scrolled: box.scrollTop, height: box.scrollHeight, view: box.clientHeight,
      navTop: navBox.top - view.top,
      lastBottom: lastBox ? view.bottom - lastBox.bottom : null,
      sideways: screen ? screen.scrollWidth - screen.clientWidth : 0,
    };
  });
  await page.keyboard.press("Escape");
  if (measured.error) throw new Error(measured.error);
  if (measured.scrolled < 200) throw new Error(`Play scrolled ${measured.scrolled}px of ${measured.height}px (view ${measured.view}px)`);
  if (Math.abs(measured.navTop) > 2) throw new Error(`after scrolling to the end the Top navigation is ${Math.round(measured.navTop)}px from the top`);
  if (measured.lastBottom !== null && measured.lastBottom < -2) throw new Error(`the last block is cut ${Math.round(-measured.lastBottom)}px at the end of the scroll`);
  if (measured.sideways > 1) throw new Error(`the phone page scrolls sideways by ${measured.sideways}px`);
  return `${steps.length} drops (${steps.slice(0, 2).join(" · ")} …); canvas Screen ${Math.round(frame.height / zoom)}px with its bar on top; Play scrolled ${measured.scrolled}px, bar at ${Math.round(measured.navTop)}px, last block whole`;
}

/* ── Add / Remove auto layout (user, 2026-10-17: "test luôn phần add auto layout và detach auto layout") ─────────── */

/** The body's last layer as the page text has it (the frame these rows work on). */
const frameIn = (text) => kidsOfBody(text).at(-1);
const kidsOfBody = (text) => (bodyOf(text)?.node.children ?? []).filter((child) => child.kind === "element");
const layersOf = (node) => (node?.children ?? []).filter((child) => child.kind === "element");
/** A floating layer's own element: a float wrapper's one layer, else itself. */
const ownOf = (node) => (node.name === "Box" && Object.keys(node.props).every((prop) => ["position", "insetLeft", "insetTop", "insetRight", "insetBottom", "constraintX", "constraintY", "width", "height"].includes(prop)) && layersOf(node).length === 1 ? layersOf(node)[0] : node);
const rectAt = (page, id, loc) => page.evaluate((src) => window.__e2e.rectOf(src), `local:${id}.zen.tsx:${loc}`);
async function key(page, combo) {
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press(combo);
}
/** Waits for the page text to change, then returns it (throws with `what` when it does not). */
async function next(page, id, before, what) {
  const after = await changed(page, id, before, 6000);
  if (!after) throw new Error(`${what}: nothing written (status: ${await statusText(page).catch(() => "")})`);
  return after;
}
/** ⌘Z until the page reads `text` again (`steps` edits back). */
async function undoTo(page, id, text, steps) {
  for (let step = 0; step < steps; step += 1) {
    const before = (await pageText(page, id)) ?? "";
    await key(page, "ControlOrMeta+z");
    await changed(page, id, before, 4000);
  }
  return ((await pageText(page, id)) ?? "") === text;
}

/** Clicks the Inspector's button `name`, or says what is selected and which buttons the Inspector shows. */
async function inspectorButton(page, name) {
  const button = page.locator("#studio-right").getByRole("button", { name, exact: true }).first();
  if (await button.waitFor({ state: "visible", timeout: 3000 }).then(() => true, () => false)) { await button.click(); return; }
  const shown = await page.locator("#studio-right button[aria-label]").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")).slice(0, 14));
  throw new Error(`no "${name}" in the Inspector (selected: ${await selectedName(page)}; buttons: ${shown.join(", ")})`);
}

/** A phone page whose body ends in a Frame (`frame`). */
const framePage = (frame) => (title) => grow(newPageText({ title, device: "phone", chrome: true }), "Stack", frame);

/**
 * Every Assets item, as a person does it: dropped into an empty Frame (it floats where it is dropped), the Frame takes
 * auto layout (⇧A: a column, the item then the caption, no X / Y left), then loses it (⌥⇧A: a Box of its size, every
 * layer floating where it showed, nothing moves on the canvas), then three ⌘Z bring the page back.
 */
/** The items a run takes: ZEN_DND_ONLY=<id,id> those, else ZEN_DND_LIMIT=<n> the first n, else all. */
const chosen = (all) => (process.env.ZEN_DND_ONLY ? all.filter((item) => process.env.ZEN_DND_ONLY.split(",").includes(item.id)) : all.slice(0, Number(process.env.ZEN_DND_LIMIT) || all.length));

async function autoLayoutItems(ctx, all) {
  const list = chosen(all);
  await ctx.studio();
  const { page, id } = await seededPage(ctx, framePage('<Box width={358} height={560}>\n<Box position="absolute" insetLeft={16} insetTop={500}>\n<Text tone="base">Caption</Text>\n</Box>\n</Box>'), /height=\{560\}/);
  const seed = (await pageText(page, id)) ?? "";
  await fit(page);
  const failures = [];
  let cases = 0;
  for (const item of list) {
    if (item.root === "AppShell" || BAR[item.root]) continue;
    const tile = await tileOf(page, item).catch(() => null);
    if (!tile) continue;
    const frame = await page.evaluate((src) => window.__e2e.rectOf(src), `local:${id}.zen.tsx:${frameIn(seed).loc}`);
    cases += 2;
    try {
      // Dropped at the Frame's top left (16, 16 in its px; the canvas zoom scales it).
      const zoom = frame.width / 358;
      await dragTo(page, center(tile), { x: frame.x + 16 * zoom + 2, y: frame.y + 16 * zoom + 2 });
      const dropped = await next(page, id, seed, `${item.id} dropped`);
      const placed = layersOf(frameIn(dropped));
      if (placed.length !== 2 || !placed.every((layer) => layer.props.position?.value === "absolute")) throw new Error(`${item.id}: the drop did not float in the Frame (${placed.map((layer) => layer.name).join(", ")})`);
      // The Frame selected from its Layers row, then ⇧A. Layers names a Box "Frame N" (Figma's word), so the row is found
      // by its layer id (the Box's source place), not its text.
      await showLeftTab(page, "layers");
      await page.locator(`.studio-layers__tree [role="treeitem"][data-layer-id="local:${id}.zen.tsx:${frameIn(dropped).loc}#0"]`).click({ timeout: 3000 });
      await until(async () => (await selectedName(page)) === "Frame", { timeout: 3000 }).catch(() => undefined);
      await key(page, "Shift+A");
      const added = await next(page, id, dropped, `${item.id} ⇧A`);
      const stack = frameIn(added);
      const order = layersOf(stack).map((layer) => layer.name);
      if (stack.name !== "Stack" || order.join() !== `${item.root},Text`) throw new Error(`${item.id} ⇧A: ${stack.name} > ${order.join(", ")}`);
      if (layersOf(stack).some((layer) => ["Stack", "Grid", "Box", "Shape"].includes(layer.name) && "position" in layer.props)) throw new Error(`${item.id} ⇧A: a layer kept its X / Y`);
      // Where each layer shows now, then ⌥⇧A: the same places, floating in a Box of the Stack's size.
      await sleep(250);
      const before = await Promise.all(layersOf(stack).map((layer) => rectAt(page, id, layer.loc)));
      await key(page, "Alt+Shift+A");
      const removed = await next(page, id, added, `${item.id} ⌥⇧A`);
      const box = frameIn(removed);
      if (box.name !== "Box" || typeof box.props.width?.value !== "number" || !layersOf(box).every((layer) => layer.props.position?.value === "absolute")) throw new Error(`${item.id} ⌥⇧A: ${box.name}(${Object.keys(box.props)}) > ${layersOf(box).map((layer) => layer.name).join(", ")}`);
      await sleep(300);
      const after = await Promise.all(layersOf(box).map((layer) => rectAt(page, id, ownOf(layer).loc)));
      const moved = before.map((rect, index) => (rect && after[index] ? Math.max(Math.abs(rect.x - after[index].x), Math.abs(rect.y - after[index].y)) / zoom : 0));
      if (moved.some((delta) => delta > 1.5)) throw new Error(`${item.id} ⌥⇧A: a layer moved ${Math.round(Math.max(...moved))}px`);
    } catch (error) {
      failures.push(error.message.split("\n")[0]);
    }
    if (!(await undoTo(page, id, seed, 3).catch(() => false)) && !(await restore(ctx, page, id, seed).then((how) => how !== "rewritten").catch(() => false))) failures.push(`${item.id}: three ⌘Z did not bring the page back`);
    await page.keyboard.press("Escape");
  }
  if (failures.length) throw new Error(`${failures.length} of ${cases} wrong · ${failures.slice(0, 6).join(" | ")}`);
  return `${cases} auto layout changes right (⇧A then ⌥⇧A on every Assets item dropped in a Frame), each undone`;
}

/** The arrangement cases and the other ways in (Inspector +/−, the canvas menu, a layer or two that are not a Frame). */
async function autoLayoutCases(ctx) {
  await ctx.studio();
  const shapes = [
    '<Shape type="rectangle" position="absolute" insetLeft={208} insetTop={30} width={80} height={40} />',
    '<Shape type="ellipse" position="absolute" insetLeft={16} insetTop={16} width={80} height={68} />',
    '<Shape type="rectangle" position="absolute" insetLeft={112} insetTop={20} width={80} height={60} />',
  ];
  const results = [];
  let stage = "start";
  try {
  // 1. Three Shapes in a row, drawn out of order, centred across: ⇧A → a row, left to right, centred, gap 16 (md), padding 16.
  stage = "case 1";
  {
    const { page, id } = await seededPage(ctx, framePage(`<Box width={320} height={120}>\n${shapes.join("\n")}\n</Box>`), /insetLeft=\{208\}/);
    const seed = (await pageText(page, id)) ?? "";
    await fit(page);
    const frameRect = await rectAt(page, id, frameIn(seed).loc);
    // ⌘-click the Frame's empty corner: the Frame itself.
    await page.keyboard.down("ControlOrMeta");
    await page.mouse.click(frameRect.x + frameRect.width - 6, frameRect.y + frameRect.height - 6);
    await page.keyboard.up("ControlOrMeta");
    await sleep(300);
    // The Inspector's Auto layout + (Figma's), not the key.
    await inspectorButton(page, "Add auto layout");
    const added = await next(page, id, seed, "Inspector Auto layout +");
    const stack = frameIn(added);
    const props = Object.fromEntries(Object.entries(stack.props).map(([key, value]) => [key, value.value]));
    const widths = layersOf(stack).map((layer) => layer.props.insetLeft === undefined);
    if (stack.name !== "Stack" || props.direction !== "row" || props.align !== "center" || props.padding !== "md" || "gap" in props) throw new Error(`3 Shapes in a row: ${stack.name} ${JSON.stringify(props)}`);
    if (layersOf(stack).map((layer) => layer.props.type?.value).join() !== "ellipse,rectangle,rectangle" || !widths.every(Boolean)) throw new Error(`3 Shapes in a row: order ${layersOf(stack).map((layer) => layer.props.type?.value)}`);
    // The Inspector's − takes it off again, every Shape where it showed.
    await inspectorButton(page, "Remove auto layout");
    const removed = await next(page, id, added, "Inspector Auto layout −");
    if (frameIn(removed).name !== "Box") throw new Error("Inspector −: still auto layout");
    if (!(await undoTo(page, id, seed, 2))) throw new Error("3 Shapes: two ⌘Z did not bring the page back");
    results.push("row of 3 (Inspector + / −)");
  }
  // 2. A painted, empty Frame: the canvas menu's Add auto layout → one Stack that keeps the fill (decision 2, 2026-10-19).
  stage = "case 2";
  {
    const { page, id } = await seededPage(ctx, framePage('<Box surface="surface" radius="md" width={200} height={120} />'), /surface="surface" radius="md"/);
    const seed = (await pageText(page, id)) ?? "";
    await fit(page);
    const frameRect = await rectAt(page, id, frameIn(seed).loc);
    await page.keyboard.down("ControlOrMeta");
    await page.mouse.click(frameRect.x + 14, frameRect.y + 14);
    await page.keyboard.up("ControlOrMeta");
    await sleep(300);
    // Off the middle: an empty Frame shows its insert button (+) there.
    await page.mouse.click(frameRect.x + 14, frameRect.y + 14, { button: "right" });
    await page.getByRole("menuitem", { name: /^Add auto layout/ }).first().click();
    const added = await next(page, id, seed, "canvas menu Add auto layout");
    const frame = frameIn(added);
    if (frame.name !== "Stack" || frame.props.surface?.value !== "surface" || frame.props.radius?.value !== "md" || layersOf(frame).length) throw new Error(`painted empty Frame: ${frame.name}(${Object.keys(frame.props)}) > ${layersOf(frame).map((layer) => layer.name)}`);
    if (!(await undoTo(page, id, seed, 1))) throw new Error("painted Frame: ⌘Z did not bring the page back");
    results.push("painted empty Frame (canvas menu)");
  }
  // 3. An Action bar in flow keeps its own position (static) through ⇧A.
  stage = "case action bar";
  {
    const bar = ITEMS.find((one) => one.id === "action-bar");
    const { page, id } = await seededPage(ctx, framePage(`<Box>\n${bar.code}\n</Box>`), /<ActionBar position="static"/);
    const seed = (await pageText(page, id)) ?? "";
    await fit(page);
    await selectLayer(page, id, "ActionBar");
    await key(page, "Escape");
    await sleep(250);
    await key(page, "Shift+A");
    const added = await next(page, id, seed, "⇧A on a Frame with an Action bar");
    if (frameIn(added).name !== "Stack" || !/<ActionBar position="static"/.test(added)) throw new Error("the Action bar lost its own position (static)");
    if (!(await undoTo(page, id, seed, 1))) throw new Error("Action bar: ⌘Z did not bring the page back");
    results.push("Action bar keeps position=static");
  }
  // 4. A Stack (row, gap sm, padding md): ⌥⇧A → nothing moves; ⇧A → the same row, gap and padding again.
  stage = "case 3";
  {
    const { page, id } = await seededPage(ctx, framePage('<Stack direction="row" gap="sm" padding="md">\n<Button level="secondary">Back</Button>\n<Button level="primary">Next</Button>\n</Stack>'), /level="primary">Next/);
    const seed = (await pageText(page, id)) ?? "";
    await fit(page);
    await selectLayer(page, id, "Button", 0);
    await key(page, "Escape");
    await sleep(250);
    const stack = frameIn(seed);
    const before = await Promise.all(layersOf(stack).map((layer) => rectAt(page, id, layer.loc)));
    await key(page, "Alt+Shift+A");
    const removed = await next(page, id, seed, "⌥⇧A on a row");
    await sleep(300);
    const box = frameIn(removed);
    const after = await Promise.all(layersOf(box).map((layer) => rectAt(page, id, ownOf(layer).loc)));
    const moved = Math.max(...before.map((rect, index) => Math.max(Math.abs(rect.x - after[index].x), Math.abs(rect.y - after[index].y))));
    if (box.name !== "Box" || moved > 1.5) throw new Error(`⌥⇧A on a row: ${box.name}, a Button moved ${Math.round(moved)}px`);
    await key(page, "Shift+A");
    const back = frameIn(await next(page, id, removed, "⇧A back"));
    const props = Object.fromEntries(Object.entries(back.props).map(([key, value]) => [key, value.value]));
    if (back.name !== "Stack" || props.direction !== "row" || props.gap !== "sm" || props.padding !== "md") throw new Error(`⌥⇧A then ⇧A: ${back.name} ${JSON.stringify(props)} (was row, gap sm, padding md)`);
    if (!(await undoTo(page, id, seed, 2))) throw new Error("row: two ⌘Z did not bring the page back");
    results.push("row → ⌥⇧A (nothing moves) → ⇧A (row, sm, md)");
  }
  // 5. ⇧A on one Text (not a Frame): it goes into a new auto layout frame.
  stage = "case 4";
  {
    const { page, id } = await seededPage(ctx, framePage('<Box>\n<Text tone="base">One</Text>\n</Box>'), />One</);
    const seed = (await pageText(page, id)) ?? "";
    await fit(page);
    await selectLayer(page, id, "Text", 1);
    await key(page, "Shift+A");
    const added = await next(page, id, seed, "⇧A on a Text");
    if (!/<Stack[^>]*>\s*<Text tone="base">One<\/Text>\s*<\/Stack>/.test(added)) throw new Error(`⇧A on a Text: not wrapped in a Stack (${added.slice(added.lastIndexOf("<Box", added.indexOf(">One<")), added.indexOf(">One<") + 40).replace(/\s+/g, " ")})`);
    if (!(await undoTo(page, id, seed, 1))) throw new Error("Text: ⌘Z did not bring the page back");
    results.push("⇧A wraps one Text");
  }
  } catch (error) {
    throw new Error(`${stage}: ${error.message.split("\n")[0]} (done: ${results.join(" · ") || "none"})`);
  }
  return results.join(" · ");
}

const third = Math.ceil(ITEMS.length / 3);
// DND-07 takes about 2.5 s an item (10 items in 24 s, 2026-10-26): every item well inside its 10 minutes.
export const rows = [
  { id: "DND-01", feature: `Assets drag, items 1–${third}: each onto an empty Screen (no frame, no Stack), before a Card, onto the Top navigation, into a Card, into a free Box, onto the board; checked in the page, across the phone, one ⌘Z each`, wp: "dnd campaign 2026-10-17", timeout: 1_800_000, run: (ctx) => campaign(ctx, ITEMS.slice(0, third), "a") },
  { id: "DND-02", feature: `Assets drag, items ${third + 1}–${2 * third}: the same places`, wp: "dnd campaign 2026-10-17", timeout: 1_800_000, run: (ctx) => campaign(ctx, ITEMS.slice(third, 2 * third), "b") },
  { id: "DND-03", feature: `Assets drag, items ${2 * third + 1}–${ITEMS.length}: the same places`, wp: "dnd campaign 2026-10-17", timeout: 1_800_000, run: (ctx) => campaign(ctx, ITEMS.slice(2 * third), "c") },
  { id: "DND-04", feature: "Canvas moves: Text, List box, Card and Box dragged to an empty Screen and to the top of the body (moved, not copied, one ⌘Z)", wp: "dnd campaign 2026-10-17", timeout: 300_000, run: moves },
  { id: "DND-06", feature: "Layers panel drags: a row onto an empty Screen's frame row goes into that Screen; onto a row's upper half goes above it (after it in the code: Layers lists the front-most first); onto a Card's row goes inside it (one ⌘Z each)", wp: "dnd campaign 2026-10-17", timeout: 300_000, run: layersMoves },
  { id: "DND-07", feature: "Auto layout on every Assets item: dropped into an empty Frame (floats there), ⇧A (a column, item then caption, no X / Y), ⌥⇧A (a Box of its size, nothing moves on the canvas), three ⌘Z back", wp: "auto layout campaign 2026-10-17", timeout: 600_000, run: (ctx) => autoLayoutItems(ctx, ITEMS) },
  { id: "DND-08", feature: "Auto layout cases: 3 Shapes drawn out of order in a centred row (Inspector + → row, left to right, centred; −), a painted empty Frame (canvas menu → Box > Stack), an Action bar keeps position, a row ⌥⇧A then ⇧A comes back the same, ⇧A on one Text wraps it", wp: "auto layout campaign 2026-10-17", timeout: 600_000, run: autoLayoutCases },
  { id: "DND-05", feature: "The user's story on an empty phone page: Top navigation dropped on the top becomes the Screen's bar, a List box, content past the phone; the canvas draws it whole, Play scrolls to the end with the bar in place", wp: "dnd campaign 2026-10-17", timeout: 300_000, run: story },
];
