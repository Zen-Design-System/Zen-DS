// Selection rows: canvas picking, keyboard navigation between layers, multi-selection, the Layers panel.
import { locOf } from "../lib/source.mjs";
import { clickLoc, focusFrame, selectedSrc, showLeftTab, sleep, until } from "../lib/studio.mjs";

const at = async (ctx, id, index = 0) => locOf(await ctx.text(), id, index).loc;

/** Waits until the primary selection (first selected Layers row) is file:loc; returns every selected src. */
async function expectSelected(page, file, loc, message) {
  return until(async () => {
    const selected = await selectedSrc(page);
    return selected.includes(`${file}:${loc}`) ? selected : null;
  }, { message: message ?? `${file}:${loc} to be selected` });
}

export const rows = [
  {
    id: "SE-01", feature: "Click a layer on the canvas selects it (Layers follows)", wp: "GĐ0",
    async run(ctx) {
      const { page } = await ctx.studio();
      await focusFrame(page, 0);
      const loc = await at(ctx, "btn-a");
      await clickLoc(page, ctx.file, loc);
      await expectSelected(page, ctx.file, loc);
      return `selected ${loc}`;
    },
  },
  {
    id: "SE-02", feature: "Esc selects the parent layer", wp: "GĐ0",
    async run(ctx) {
      const { page } = await ctx.studio();
      await focusFrame(page, 0);
      await clickLoc(page, ctx.file, await at(ctx, "btn-b"));
      await page.keyboard.press("Escape");
      const parent = await at(ctx, "row");
      await expectSelected(page, ctx.file, parent);
      return `Button → parent Stack ${parent}`;
    },
  },
  {
    id: "SE-03", feature: "Enter selects the first child layer", wp: "GĐ0",
    async run(ctx) {
      const { page } = await ctx.studio();
      await focusFrame(page, 0);
      await clickLoc(page, ctx.file, await at(ctx, "btn-b"));
      await page.keyboard.press("Escape");
      await expectSelected(page, ctx.file, await at(ctx, "row"));
      await page.keyboard.press("Enter");
      const first = await at(ctx, "btn-a");
      await expectSelected(page, ctx.file, first);
      return `Stack → first child ${first}`;
    },
  },
  {
    id: "SE-04", feature: "Tab / ⇧Tab select the next / previous sibling", wp: "GĐ0",
    async run(ctx) {
      const { page } = await ctx.studio();
      await focusFrame(page, 0);
      await clickLoc(page, ctx.file, await at(ctx, "btn-a"));
      await page.keyboard.press("Tab");
      await expectSelected(page, ctx.file, await at(ctx, "btn-b"), "Tab to select the next sibling");
      await page.keyboard.press("Shift+Tab");
      await expectSelected(page, ctx.file, await at(ctx, "btn-a"), "⇧Tab to select the previous sibling");
      return "Alpha → Beta → Alpha";
    },
  },
  {
    id: "SE-05", feature: "⇧+click adds a layer to the selection", wp: "GĐ0",
    async run(ctx) {
      const { page } = await ctx.studio();
      await focusFrame(page, 0);
      const a = await at(ctx, "btn-a");
      const c = await at(ctx, "btn-c");
      await clickLoc(page, ctx.file, a);
      await expectSelected(page, ctx.file, a);
      await clickLoc(page, ctx.file, c, { modifiers: ["Shift"] });
      const selected = await until(async () => {
        const all = await selectedSrc(page);
        return all.includes(`${ctx.file}:${a}`) && all.includes(`${ctx.file}:${c}`) ? all : null;
      }, { message: "both buttons selected" });
      await page.keyboard.press("Escape");
      return `${selected.length} layers selected`;
    },
  },
  {
    id: "SE-06", feature: "Click a Layers row selects the layer", wp: "GĐ0",
    async run(ctx) {
      const { page } = await ctx.studio();
      await focusFrame(page, 0);
      const loc = await at(ctx, "check");
      const row = page.locator(`[data-layer-id^="${ctx.file}:${loc}#"]`).first();
      await until(() => row.count(), { message: "the Checkbox row in Layers" });
      await row.scrollIntoViewIfNeeded();
      await row.click();
      await expectSelected(page, ctx.file, loc);
      const outlined = await page.locator('.studio-selection__outline[data-kind="selected"]').count();
      if (!outlined) throw new Error("no selection outline on the canvas");
      return `Layers → ${loc}, outlined on the canvas`;
    },
  },
  {
    id: "SE-07", feature: "Layers search with no match says so (not a blank panel)", wp: "WP-A",
    async run(ctx) {
      const { page } = await ctx.studio();
      await showLeftTab(page, "layers");
      const search = page.locator("#studio-left-panel-layers").getByRole("searchbox").or(page.locator("#studio-left-panel-layers input")).first();
      await search.fill("zzqx-no-such-layer");
      await sleep(300);
      const text = (await page.locator("#studio-left-panel-layers").innerText()).trim();
      await search.fill("");
      if (!/no (layer|match|result)/i.test(text)) throw new Error(`no empty-state message (panel reads: "${text.replace(/\s+/g, " ").slice(0, 80)}")`);
      return "empty state shown";
    },
  },
];
