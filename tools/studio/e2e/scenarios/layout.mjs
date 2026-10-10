// Auto layout / Layout section rows (WP-D, redesign spec Phases 3, 4, 6; Figma-language spec 2026-10-09 §3): Flow with
// the Wrap toggle, the alignment box, Gap with Auto, the cross axis, Padding H / V, Clip content, Grid gaps, Grid columns
// (plain and per breakpoint) and the no-effect warnings. Each gesture is one write.
import { inspectorRow, sleep, until } from "../lib/studio.mjs";
import { expectSource, freshSelect, pickOption, scaleStep } from "./inspector.mjs";

/** The row Stack of the layout fixture (its first button selected, then Escape to the parent). */
async function selectRowStack(ctx) {
  const page = await freshSelect(ctx, "btn-a");
  await page.keyboard.press("Escape");
  await until(async () => (await inspectorRow(page, "direction").count()) > 0, { message: "the row Stack's Layout section" });
  return page;
}
const selectBox = (ctx) => freshSelect(ctx, "box", { frame: 2, position: { dx: 6, dy: 6 } });
// The grids have padding xs, so a click 2px inside selects the Grid, not its first cell.
const selectGrid = (ctx, id = "grid") => freshSelect(ctx, id, { frame: 5, position: { dx: 2, dy: 2 } });
const box = (page) => page.locator('#studio-right [role="radiogroup"][aria-label^="Alignment"]');
const has = (text, pattern) => pattern.test(text);

export const rows = [
  {
    id: "L-01", feature: "Flow: the Wrap toggle writes direction row + wrap in one edit; Vertical removes both", wp: "WP-D",
    async run(ctx) {
      const page = await selectRowStack(ctx);
      await inspectorRow(page, "direction").getByRole("button", { name: "Wrap" }).click();
      await expectSource(ctx, "row", (el) => el.attr("direction") === "row" && /^\{?true\}?$/.test(el.attr("wrap") ?? ""), "direction row + wrap");
      await sleep(300);
      await inspectorRow(page, "direction").getByRole("button", { name: "Vertical" }).click();
      await expectSource(ctx, "row", (el) => el.attr("direction") === undefined && el.attr("wrap") === undefined, "direction and wrap removed");
      return "Wrap → Vertical";
    },
  },
  {
    id: "L-02", feature: "Alignment box: a cell, X for Auto (lanes), ⌫ resets without deleting the layer", wp: "WP-D",
    async run(ctx) {
      const page = await selectRowStack(ctx);
      await box(page).getByRole("radio", { name: "Bottom right" }).click();
      await expectSource(ctx, "row", (el) => el.attr("align") === "end" && el.attr("justify") === "end", "align end, justify end");
      await box(page).getByRole("radio", { checked: true }).focus();
      await page.keyboard.press("x");
      await expectSource(ctx, "row", (el) => el.attr("justify") === "between", "X: justify between");
      await until(async () => (await box(page).getByRole("radio").count()) === 3, { message: "three Auto lanes" });
      await box(page).getByRole("radio", { checked: true }).focus();
      await page.keyboard.press("Backspace");
      await expectSource(ctx, "row", (el) => el.attr("align") === undefined && el.attr("justify") === undefined, "⌫: alignment reset");
      if (!(await inspectorRow(page, "direction").count())) throw new Error("⌫ removed the layer");
      return "Bottom right → Auto → reset";
    },
  },
  {
    id: "L-03", feature: "Gap: Auto writes space between; a step leaves Auto", wp: "WP-D",
    async run(ctx) {
      const page = await selectRowStack(ctx);
      await pickOption(page, "gap", "Auto");
      await expectSource(ctx, "row", (el) => el.attr("justify") === "between", "justify between");
      await sleep(300);
      await pickOption(page, "gap", scaleStep("md"));
      await expectSource(ctx, "row", (el) => el.attr("gap") === "md" && el.attr("justify") === undefined, "gap md, Auto off");
      return "Auto → md";
    },
  },
  {
    id: "L-04", feature: "Padding H / V (Figma): one axis writes paddingX over padding; equal axes write one padding", wp: "Figma spec 2026-10-09",
    async run(ctx) {
      const page = await selectBox(ctx);
      await pickOption(page, "paddingX", scaleStep("lg"));
      await expectSource(ctx, "box", (el) => el.attr("paddingX") === "lg" && el.attr("padding") === "md" && el.attr("paddingY") === undefined, "paddingX lg, padding md kept");
      await sleep(300);
      await pickOption(page, "paddingY", scaleStep("lg"));
      await expectSource(ctx, "box", (el) => el.attr("padding") === "lg" && el.attr("paddingX") === undefined && el.attr("paddingY") === undefined, "padding lg, the axes removed");
      return "H lg → paddingX; V lg → padding lg";
    },
  },
  {
    id: "L-10", feature: "Clip content (Figma, under Padding): the checkbox writes clip, unchecked removes it", wp: "Figma spec 2026-10-09",
    async run(ctx) {
      const page = await selectBox(ctx);
      // The Zen Checkbox's label is the target (its native input is visually hidden).
      const clip = inspectorRow(page, "clip").getByText("Clip content");
      await clip.click();
      await expectSource(ctx, "box", (el) => /^\{?true\}?$/.test(el.attr("clip") ?? ""), "clip written");
      await sleep(300);
      await clip.click();
      await expectSource(ctx, "box", (el) => el.attr("clip") === undefined, "clip removed");
      return "Clip content on → off";
    },
  },
  {
    id: "L-11", feature: "Cross axis (the icon beside Gap): Stretch writes align stretch, Position goes back to the default", wp: "Figma spec 2026-10-09",
    async run(ctx) {
      const page = await selectRowStack(ctx);
      await page.locator("#studio-right").getByRole("button", { name: /^Cross axis/ }).click();
      await page.getByRole("option", { name: /^Stretch/ }).click();
      await expectSource(ctx, "row", (el) => el.attr("align") === "stretch", "align stretch");
      await sleep(300);
      await page.locator("#studio-right").getByRole("button", { name: /^Cross axis/ }).click();
      await page.getByRole("option", { name: /^Position/ }).click();
      await expectSource(ctx, "row", (el) => el.attr("align") === undefined, "align removed (rows centre)");
      return "Stretch → Position";
    },
  },
  {
    id: "L-05", feature: "Grid columns: Count, Tracks, Auto-fit", wp: "WP-D",
    async run(ctx) {
      const page = await selectGrid(ctx);
      const columns = inspectorRow(page, "columns");
      const input = columns.locator("input").first();
      await input.fill("3");
      await input.press("Enter");
      await until(async () => has(await ctx.text(), /data-e2e="grid" columns=\{3\}/), { message: "columns={3}" });
      await sleep(300);
      await columns.getByRole("button", { name: "Tracks" }).click();
      await until(async () => has(await ctx.text(), /data-e2e="grid" columns="1fr 1fr 1fr"/), { message: 'columns="1fr 1fr 1fr"' });
      await sleep(300);
      await columns.getByRole("button", { name: "Auto-fit" }).click();
      await until(async () => has(await ctx.text(), /data-e2e="grid" minColumnWidth/), { message: "columns removed" });
      return "2 → 3 → tracks → auto-fit";
    },
  },
  {
    id: "L-06", feature: "Grid columns per breakpoint: one key edited, the others kept", wp: "WP-D",
    async run(ctx) {
      const page = await selectGrid(ctx, "grid-responsive");
      const columns = inspectorRow(page, "columns");
      await columns.getByRole("button", { name: /^Desktop/ }).click();
      const input = columns.locator("input").first();
      await until(async () => (await input.inputValue()) === "2fr 1fr", { message: "desktop tracks 2fr 1fr" });
      await input.fill("3fr 1fr");
      await input.press("Enter");
      await until(async () => has(await ctx.text(), /columns=\{\{ mobile: 1, desktop: "3fr 1fr" \}\}/), { message: 'desktop: "3fr 1fr", mobile: 1 kept' });
      return 'desktop "2fr 1fr" → "3fr 1fr"';
    },
  },
  {
    id: "L-07", feature: "Grid gap: separate row and column gaps, then one gap again", wp: "WP-D",
    async run(ctx) {
      const page = await selectGrid(ctx);
      await page.locator("#studio-right").getByRole("button", { name: "Separate row and column gaps" }).click();
      await until(async () => (await inspectorRow(page, "columnGap").count()) > 0, { message: "column and row gap fields" });
      await pickOption(page, "columnGap", scaleStep("lg"));
      await expectSource(ctx, "grid", (el) => el.attr("columnGap") === "lg" && el.attr("gap") === "md", "columnGap lg, gap kept");
      await sleep(300);
      await page.locator("#studio-right").getByRole("button", { name: "Use one gap" }).click();
      await page.getByRole("menuitem", { name: "Use lg for both" }).click();
      await expectSource(ctx, "grid", (el) => el.attr("gap") === "lg" && el.attr("columnGap") === undefined, "gap lg, columnGap removed");
      return "columnGap lg → one gap lg";
    },
  },
  {
    id: "L-09", feature: "Double-click the width handle of a px Grid column's only item: the column's track becomes auto (Hug)", wp: "backlog 2026-10-07",
    async run(ctx) {
      const page = await freshSelect(ctx, "grid-px-item", { frame: 5, position: { dx: 4, dy: 4 } });
      const handle = page.locator('.studio-resize__handle[data-handle="e"]');
      await handle.waitFor({ state: "visible", timeout: 5000 });
      // The Grid's source is read after the selection (the column rule needs its track list).
      await sleep(600);
      await handle.dblclick();
      await expectSource(ctx, "grid-px", (el) => el.attr("columns") === "auto 1fr", 'columns="auto 1fr"');
      return 'Box in a 240px column: ⟷ double-click → columns="auto 1fr"';
    },
  },
  {
    id: "L-08", feature: "A prop that does nothing warns, and Remove removes it", wp: "WP-D",
    async run(ctx) {
      const page = await selectGrid(ctx);
      const warning = page.locator('#studio-right [data-prop="warning-minColumnWidth"]');
      await warning.waitFor({ state: "visible", timeout: 5000 });
      await warning.getByRole("button", { name: "Remove" }).click();
      await expectSource(ctx, "grid", (el) => el.attr("minColumnWidth") === undefined, "minColumnWidth removed");
      return "warning shown; Remove";
    },
  },
];
