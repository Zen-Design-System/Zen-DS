// Main component rows (spec docs/research/studio-main-component-spec-2026-10-09.md, M1): the Button page's frame of
// Figma variant sets beside the Playground, selecting a variant and a layer of it, and where each style comes from.
import { inspectorRow, showLeftTab, sleep, until } from "../lib/studio.mjs";
import fs from "node:fs";
import path from "node:path";
import { pickOption } from "./inspector.mjs";

const PAGE = "button";
const FRAME = '[data-studio-frame="main-component"]';
const cell = (page, name, set = "Button/Main") => page.locator(`${FRAME} [data-mc-cell][data-mc-set="${set}"][aria-label="${name}"]`).first();

/** The Studio on the Button page, opened once for the group (a row reuses it while it is still there). */
let session = null;
async function buttonPage(ctx) {
  if (session && !session.page.isClosed() && new URL(session.page.url()).searchParams.get("page") === PAGE) return session.page;
  session = await ctx.studio({ page: PAGE });
  await session.page.waitForSelector(`${FRAME} [data-mc-cell] .studio-mc__stage > *`, { timeout: 15_000 });
  return session.page;
}

/** Zooms the canvas to a Layers row (⇧2 after selecting it), as focusFrame does for an example. */
async function zoomToRow(page, id) {
  await showLeftTab(page, "layers");
  const row = page.locator(`[data-layer-id="${id}"]`).first();
  await row.waitFor({ state: "attached", timeout: 8000 });
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("Shift+Digit2");
  await sleep(300);
}
const showFrame = (page) => zoomToRow(page, "frame:main-component");
const showCell = async (page, locator) => zoomToRow(page, `variant:${await locator.getAttribute("data-mc-cell")}`);

async function clickCell(page, locator, modifiers) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("cell not on the canvas");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  if (modifiers) await page.keyboard.down(modifiers);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  if (modifiers) await page.keyboard.up(modifiers);
}

const CSS = "src/components/Button/button.css";
/** The rendered height of a variant (its root, unscaled). */
const heightOf = (locator) => locator.locator(".studio-mc__stage > *").first().evaluate((element) => element.offsetHeight);
const badge = (page) => page.locator("#studio-right .studio-inspector__title-row .zen-badge").first();

export const rows = [
  {
    id: "MC-01", feature: "Main component: the Button page draws every variant of its Figma sets beside the Playground", wp: "MC M1",
    async run(ctx) {
      const page = await buttonPage(ctx);
      const { VARIANT_SETS } = await import("../../../../src/platform/studio/mainComponent/variantSets.generated.ts");
      const sets = [...VARIANT_SETS.Button, ...VARIANT_SETS.IconButton];
      const expected = sets.reduce((n, set) => n + (set.axes[0]?.values.length ?? 1) * (set.axes[1]?.values.length ?? 1), 0);
      const shown = await page.evaluate((frame) => {
        const root = document.querySelector(frame);
        const cells = root ? [...root.querySelectorAll("[data-mc-cell]")] : [];
        return { cells: cells.length, empty: cells.filter((c) => !c.querySelector(".studio-mc__stage > *")).length, sets: root ? [...root.querySelectorAll(".studio-mc__set")].map((s) => s.getAttribute("aria-label")) : [] };
      }, FRAME);
      if (shown.cells !== expected || shown.empty) throw new Error(`${shown.cells} cells (${shown.empty} empty), expected ${expected}`);
      const missing = sets.map((set) => set.name).filter((name) => !shown.sets.includes(name));
      if (missing.length) throw new Error(`sets missing: ${missing.join(", ")}`);
      const beside = await page.evaluate((frame) => {
        const main = document.querySelector(frame)?.getBoundingClientRect();
        const playground = document.querySelector('[data-studio-frame="playground"]')?.getBoundingClientRect();
        return Boolean(main && playground && main.left >= playground.right);
      }, FRAME);
      if (!beside) throw new Error("the frame is not beside the Playground");
      return `${shown.cells} variants in ${shown.sets.length} sets`;
    },
  },
  {
    id: "MC-02", feature: "Main component: a click selects the variant (outline, Layers row, its Figma properties in the Inspector)", wp: "MC M1",
    async run(ctx) {
      const page = await buttonPage(ctx);
      const name = "Size=Small, Level=Accent, State=Default";
      await showFrame(page);
      await clickCell(page, cell(page, name));
      await until(async () => (await badge(page).textContent())?.trim() === "Variant", { message: "the Inspector shows a Variant" });
      const size = (await inspectorRow(page, "size").locator("button").first().textContent())?.trim();
      const level = (await inspectorRow(page, "level").locator("button").first().textContent())?.trim();
      if (size !== "Small" || level !== "Accent") throw new Error(`Inspector reads Size ${size}, Level ${level}`);
      await showLeftTab(page, "layers");
      await until(async () => (await page.locator('#studio-left-panel-layers [aria-selected="true"]').first().textContent())?.includes(name), { message: "its Layers row selected" });
      const tag = await page.locator(".studio-mc-outline .studio-selection__tag").textContent();
      if (!tag?.includes("Size=Small")) throw new Error(`outline tag: ${tag}`);
      return `${name}: outline, Layers row, Size/Level in the Inspector`;
    },
  },
  {
    id: "MC-03", feature: "Main component: ⌘-click selects a layer inside a variant; its colour names the token chain and the CSS rule", wp: "MC M1",
    async run(ctx) {
      const page = await buttonPage(ctx);
      const target = cell(page, "Size=Medium (Base), Level=Primary, State=Default");
      await showCell(page, target);
      await clickCell(page, target.locator(".zen-button__label").first(), "Meta");
      await until(async () => (await badge(page).textContent())?.trim() === "Layer", { message: "the Inspector shows a Layer" });
      const color = await until(async () => (await inspectorRow(page, "color").textContent().catch(() => "")) || null, { message: "a Color row" });
      if (!/button\.css/.test(color) || !/→/.test(color)) throw new Error(`Color row: ${color.slice(0, 160)}`);
      return `Label · ${color.replace(/\s+/g, " ").slice(0, 90)}`;
    },
  },
  {
    id: "MC-04", feature: "Main component: the Size property switches to that variant, as Figma's variant properties do", wp: "MC M1",
    async run(ctx) {
      const page = await buttonPage(ctx);
      await showCell(page, cell(page, "Size=Large, Level=Secondary, State=Default"));
      await until(async () => (await badge(page).textContent())?.trim() === "Variant", { message: "a Variant selected" });
      await pickOption(page, "size", "XSmall");
      await until(async () => (await cell(page, "Size=XSmall, Level=Secondary, State=Default").getAttribute("data-selected")) === "true", { message: "the XSmall cell selected" });
      return "Size=Large → XSmall: the XSmall cell is selected";
    },
  },
  {
    id: "MC-05", feature: "Main component: a variant's height reads its size token, scoped to that size in button.css", wp: "MC M1",
    async run(ctx) {
      const page = await buttonPage(ctx);
      await showCell(page, cell(page, "Size=XSmall, Level=Primary, State=Default"));
      const height = await until(async () => (await inspectorRow(page, "height").textContent().catch(() => "")) || null, { message: "a Height row" });
      if (!/Size = xs/.test(height) || !/button-size/.test(height)) throw new Error(`Height row: ${height.slice(0, 160)}`);
      return `Height · ${height.replace(/\s+/g, " ").slice(0, 90)}`;
    },
  },
  {
    id: "MC-06", feature: "Main component: another token for XSmall's height is a draft of button.css, every XSmall variant follows, ⌘Z undoes it", wp: "MC M2",
    async run(ctx) {
      const page = await buttonPage(ctx);
      try {
        const primary = cell(page, "Size=XSmall, Level=Primary, State=Default");
        const accent = cell(page, "Size=XSmall, Level=Accent, State=Default");
        await showCell(page, primary);
        const before = await heightOf(primary);
        await pickOption(page, "height", /^button-size-small\b/);
        await until(async () => (await heightOf(primary)) > before && (await heightOf(accent)) > before, { message: "the XSmall variants grow" });
        await until(async () => (await ctx.api.drafts()).drafts.some((row) => row.file === CSS), { message: "a draft of button.css" });
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("ControlOrMeta+KeyZ");
        await until(async () => (await heightOf(primary)) === before, { message: "⌘Z brings the height back" });
        await until(async () => !(await ctx.api.drafts()).drafts.some((row) => row.file === CSS), { message: "no draft left after the undo" });
        return `XSmall ${before}px → taller (draft) → ⌘Z ${before}px`;
      } finally {
        await ctx.api.discard([CSS]).catch(() => {});
      }
    },
  },
  {
    id: "MC-07", feature: "Main component: Discard in the variant's panel drops the stylesheet's draft; the disk never changed", wp: "MC M2",
    async run(ctx) {
      const page = await buttonPage(ctx);
      const disk = fs.readFileSync(path.join(ctx.root, CSS), "utf8");
      try {
        const primary = cell(page, "Size=XSmall, Level=Primary, State=Default");
        await showCell(page, primary);
        const before = await heightOf(primary);
        await pickOption(page, "height", /^button-size-medium\b/);
        await until(async () => (await heightOf(primary)) > before, { message: "the variant grows" });
        await page.locator("#studio-right .studio-mc__drafts").getByRole("button", { name: "Discard" }).click();
        // The Studio asks first ("Discard the draft of button.css?").
        const dialog = page.locator('[role="dialog"], [role="alertdialog"]').filter({ hasText: "Discard the draft of button.css" }).first();
        await dialog.waitFor({ state: "visible", timeout: 5000 });
        await dialog.getByRole("button", { name: "Discard", exact: true }).click();
        await until(async () => (await heightOf(primary)) === before, { message: "the height comes back after Discard" });
        if (fs.readFileSync(path.join(ctx.root, CSS), "utf8") !== disk) throw new Error("button.css changed on disk");
        return "draft discarded, button.css untouched";
      } finally {
        await ctx.api.discard([CSS]).catch(() => {});
      }
    },
  },
];
