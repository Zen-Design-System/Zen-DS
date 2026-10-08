// Selection rows: canvas picking, keyboard navigation between layers, multi-selection, the Layers panel.
import { locOf } from "../lib/source.mjs";
import { expectSource, freshSelect } from "./inspector.mjs";
import { selectedName } from "./builder.mjs";
import { clickLoc, focusFrame, rectOf, selectedSrc, showLeftTab, sleep, until } from "../lib/studio.mjs";

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
    id: "SE-08", feature: "Escape on several layers selects their common parent (Figma)", wp: "backlog 2026-10-07",
    async run(ctx) {
      const { page } = await ctx.studio();
      await focusFrame(page, 0);
      const a = await at(ctx, "btn-a");
      const heading = await at(ctx, "heading");
      await clickLoc(page, ctx.file, a);
      await expectSelected(page, ctx.file, a);
      await clickLoc(page, ctx.file, heading, { modifiers: ["Shift"] });
      await until(async () => (await selectedSrc(page)).length === 2, { message: "two layers selected" });
      await page.keyboard.press("Escape");
      // btn-a's own parent is the row; the layer that holds both is the outer stack.
      const stack = await at(ctx, "stack");
      await expectSelected(page, ctx.file, stack);
      return "Alpha + heading → Escape → the outer Stack";
    },
  },
  {
    id: "SE-09", feature: "A nested instance under a row's click target, selected by double-click: hovering it outlines no outer row", wp: "backlog 2026-10-07",
    async run(ctx) {
      const { page } = await ctx.studio();
      await focusFrame(page, 6);
      const row = await at(ctx, "inst-click-row");
      const badge = await at(ctx, "inst-click-badge");
      // The row's click target covers the Badge: a click selects the ListItem, a double-click goes into the Badge.
      await clickLoc(page, ctx.file, badge);
      await expectSelected(page, ctx.file, row);
      await clickLoc(page, ctx.file, badge, { clickCount: 2 });
      await expectSelected(page, ctx.file, badge);
      const rect = await rectOf(page, ctx.file, badge);
      await page.mouse.move(rect.x + rect.width / 2 + 2, rect.y + rect.height / 2 + 1);
      await sleep(300);
      const hover = await page.locator('.studio-selection__outline[data-kind="hover"] .studio-selection__tag').allInnerTexts();
      if (hover.some((tag) => /ListItem/.test(tag))) throw new Error(`hover outlines the outer row: ${hover.join(", ")}`);
      return `Badge selected inside the row; hover over it shows ${hover.length ? hover.join(", ") : "no outer outline"}`;
    },
  },
  {
    id: "SE-10", feature: "A Chip that owns a Popover keeps its width handle (its height stays its own)", wp: "backlog 2026-10-07",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-chip", { frame: 6 });
      await sleep(600);
      const handles = await page.locator(".studio-resize__handle").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-handle")));
      const pill = (await page.locator(".studio-resize__pill").allInnerTexts()).join(" | ");
      if (!handles.includes("e") || !handles.includes("w")) throw new Error(`no width handle: ${handles.join(",") || "none"} · pill "${pill}"`);
      if (handles.includes("n") || handles.includes("s")) throw new Error(`a height handle on a Chip: ${handles.join(",")}`);
      return `handles ${handles.join(",")} · pill "${pill}"`;
    },
  },
  {
    id: "SE-11", feature: "A click on the Docs frame below 100% zooms it to 100%, top-aligned", wp: "backlog 2026-10-07",
    async run(ctx) {
      const { page } = await ctx.studio();
      const zoom = async () => (await page.locator(".studio-zoom__value").first().getAttribute("aria-label")) ?? "";
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Shift+Digit1");
      await until(async () => /^Zoom \d+%$/.test(await zoom()) && (await zoom()) !== "Zoom 100%", { message: "a zoom below 100% after ⇧1" });
      const before = await zoom();
      const frame = page.locator('[data-studio-frame="docs"]');
      const rect = await frame.boundingBox();
      await page.mouse.click(rect.x + 6, rect.y + 6);
      await until(async () => (await zoom()) === "Zoom 100%", { message: "100% after the click" });
      const top = await frame.boundingBox();
      if (!top || top.y < 0 || top.y > 200) throw new Error(`the frame's top is at ${top?.y}, not near the viewport's top`);
      return `${before} → click on Docs → Zoom 100%`;
    },
  },
  {
    id: "SE-12", feature: "⌘-click on a TopNavigation action lands on the action (a data-slot item), not the icon inside it", wp: "backlog 2026-10-07",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-nav-box", { frame: 6, position: { dx: 4, dy: 4 } });
      await page.keyboard.press("Enter");
      await until(async () => (await selectedName(page)) === "TopNavigation", { message: "the TopNavigation selected" });
      const action = page.locator('[data-studio-frame="example:6"] button.zen-top-nav__action').first();
      const box = await action.boundingBox();
      await page.keyboard.down("Control");
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.keyboard.up("Control");
      await until(async () => !["TopNavigation", ""].includes(await selectedName(page)), { message: "a part selected" });
      const name = await selectedName(page);
      if (/^(Icon|IconSvg|svg|span)\b/i.test(name)) throw new Error(`landed on ${name}`);
      return `⌘-click on the action → ${name}`;
    },
  },
  {
    id: "SE-13", feature: "⇧+click in Layers selects the rows from the selected layer to the clicked one (Figma's range)", wp: "backlog 2026-10-07",
    async run(ctx) {
      const { page } = await ctx.studio();
      await focusFrame(page, 0);
      const [a, b, c] = [await at(ctx, "btn-a"), await at(ctx, "btn-b"), await at(ctx, "btn-c")];
      const rowOf = (loc) => page.locator(`[data-layer-id^="${ctx.file}:${loc}#"]`).first();
      // Selected on the canvas first: Layers opens down to it, so its siblings' rows show whatever ran before.
      await clickLoc(page, ctx.file, a);
      await expectSelected(page, ctx.file, a);
      await until(() => rowOf(c).count(), { message: "the Gamma row in Layers" });
      await rowOf(a).scrollIntoViewIfNeeded();
      await rowOf(a).click();
      await expectSelected(page, ctx.file, a);
      await rowOf(c).scrollIntoViewIfNeeded();
      await rowOf(c).click({ modifiers: ["Shift"] });
      const selected = await until(async () => {
        const all = await selectedSrc(page);
        return [a, b, c].every((loc) => all.includes(`${ctx.file}:${loc}`)) ? all : null;
      }, { message: "Alpha, Beta and Gamma selected" });
      await page.keyboard.press("Escape");
      return `Alpha → ⇧ Gamma: ${selected.length} layers selected`;
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
  {
    id: "SE-20", feature: "A 0 gap (gap=\"none\") has a canvas area on the seam: a click opens the scale and writes the step", wp: "backlog 2026-10-08",
    async run(ctx) {
      const page = await freshSelect(ctx, "zero-a", { frame: 9 });
      await page.keyboard.press("Escape");
      await expectSelected(page, ctx.file, await at(ctx, "zero"), "the 0-gap Stack selected");
      const a = await rectOf(page, ctx.file, await at(ctx, "zero-a"));
      await until(async () => (await page.locator('.studio-selection__spacing-hit[data-editable="true"]').count()) > 0, { message: "editable spacing areas" });
      await page.mouse.move(a.x + a.width - 1, a.y + a.height / 2);
      await page.mouse.move(a.x + a.width, a.y + a.height / 2);
      const pill = await until(async () => {
        const text = (await page.locator(".studio-selection__spacing-label").allInnerTexts()).join(" | ");
        return /gap · none/.test(text) ? text : null;
      }, { message: 'the "gap · none" pill on the seam' });
      await page.mouse.down();
      await page.mouse.up();
      await page.getByRole("option", { name: /^xs\b/ }).click();
      await expectSource(ctx, "zero", (el) => el.attr("gap") === "xs", 'gap="xs"');
      return `seam "${pill}" → xs`;
    },
  },
  {
    id: "SE-21", feature: "A layer partly scrolled out of its scroll box: the outline stops at the box's edge", wp: "backlog 2026-10-08",
    async run(ctx) {
      const page = await freshSelect(ctx, "spacer", { frame: 9, position: { dx: 8, dy: 8 } });
      const scroller = await rectOf(page, ctx.file, await at(ctx, "scroller"));
      const spacer = await rectOf(page, ctx.file, await at(ctx, "spacer"));
      const outline = await until(async () => page.locator('.studio-selection__outline[data-kind="selected"]').boundingBox(), { message: "the selection outline" });
      if (spacer.y + spacer.height <= scroller.y + scroller.height) throw new Error("the fixture's Box is not clipped (it fits its scroll box)");
      if (outline.y + outline.height > scroller.y + scroller.height + 1.5) throw new Error(`outline bottom ${Math.round(outline.y + outline.height)} past the scroll box's ${Math.round(scroller.y + scroller.height)}`);
      return `outline ${Math.round(outline.height)} px tall of a ${Math.round(spacer.height)} px Box, inside the ${Math.round(scroller.height)} px scroll box`;
    },
  },
  {
    id: "SE-22", feature: "Resize a floating Box: the pinned edge moves its inset (snapped), a stretched axis writes the dragged side's inset only", wp: "backlog 2026-10-08",
    async run(ctx) {
      const drag = async (page, handle, dx) => {
        const box = await until(() => page.locator(`.studio-resize__handle[data-handle="${handle}"]`).boundingBox(), { message: `the ${handle} handle` });
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        for (let step = 1; step <= 6; step += 1) await page.mouse.move(x + (dx * step) / 6, y);
        await page.mouse.up();
      };
      let page = await freshSelect(ctx, "float-l", { frame: 9 });
      await sleep(400);
      await drag(page, "w", -14);
      const pinned = await expectSource(ctx, "float-l", (el) => el.attr("insetLeft") !== "sm" && el.attr("width") !== "{96}", "insetLeft and width changed");
      page = await freshSelect(ctx, "float-s", { frame: 9 });
      await sleep(400);
      await drag(page, "e", -14);
      const stretched = await expectSource(ctx, "float-s", (el) => el.attr("insetRight") !== "sm", "insetRight changed");
      if (stretched.attr("width") !== undefined) throw new Error(`a stretched Box got a width: ${stretched.attr("width")}`);
      return `left-pinned: insetLeft ${pinned.attr("insetLeft") ?? "none"}, width ${pinned.attr("width")} · left-right: insetRight ${stretched.attr("insetRight") ?? "none"}, no width`;
    },
  },
];
