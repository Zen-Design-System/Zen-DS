// Selection rows: canvas picking, keyboard navigation between layers, multi-selection, the Layers panel.
import { locOf } from "../lib/source.mjs";
import { expectSource, freshSelect, pickOption, waitSeed } from "./inspector.mjs";
import { TABLE_FRAME, tableText } from "./data.mjs";
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

/** Every rendering of file:loc in the frame, in document order (the rows of a .map share one location). */
async function rectsOf(page, file, loc) {
  return page.evaluate((src) => [...document.querySelectorAll(`[data-zen-src="${CSS.escape(src)}"]`)].map((el) => el.getBoundingClientRect().toJSON()), `${file}:${loc}`);
}

/** The outline of the selection: which rendering of file:loc it covers (-1: none). */
async function selectedRendering(page, file, loc) {
  return page.evaluate((src) => {
    const box = document.querySelector('.studio-selection__outline[data-kind="selected"]')?.getBoundingClientRect();
    if (!box) return -1;
    return [...document.querySelectorAll(`[data-zen-src="${CSS.escape(src)}"]`)].map((el) => el.getBoundingClientRect())
      .findIndex((r) => Math.abs(r.x - box.x) < 3 && Math.abs(r.y - box.y) < 3 && Math.abs(r.width - box.width) < 3 && Math.abs(r.height - box.height) < 3);
  }, `${file}:${loc}`);
}

const centre = (rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });

/** The Inspector's heading starts with `name` (a Table part: "Cell · row 2 · Task · Table"). */
async function expectHeading(page, name, message) {
  await until(async () => (await selectedName(page)).startsWith(name), { message }).catch(async (error) => { throw new Error(`${error.message} (selected: ${await selectedName(page)})`); });
}

export const rows = [
  {
    id: "SE-31", feature: "A Table as Figma lists it: double-click Table → Data-Row → Cell → its content, Escape back out; the Cell's Content swaps a `cell` column's element (Badge)", wp: "table 2026-10-10",
    async run(ctx) {
      const page = await freshSelect(ctx, "table", { frame: TABLE_FRAME, position: { dx: 4, dy: 4 } });
      await expectHeading(page, "Table", "the Table selected");
      const steps = ["Table"];
      const title = await tableText(ctx, page, "Prototype");
      await page.mouse.dblclick(title.x, title.y);
      await expectHeading(page, "Data-Row", "a double-click selects the row under the pointer");
      steps.push("Data-Row");
      await page.mouse.dblclick(title.x, title.y);
      await expectHeading(page, "Cell", "a double-click selects the cell");
      steps.push("Cell");
      await page.mouse.dblclick(title.x, title.y);
      await expectHeading(page, "TableText", "a double-click selects the cell's content (the column's cell)");
      steps.push("TableText");
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await expectHeading(page, "Cell", "Escape goes back to the Cell");
      await page.keyboard.press("Escape");
      await expectHeading(page, "Data-Row", "Escape goes back to the Data-Row");
      await page.keyboard.press("Escape");
      await expectHeading(page, "Table", "Escape goes back to the Table");
      steps.push("Escape ×3");
      // Content → Badge on the Task column: its cell's TableText becomes Figma's Badge-Cell.
      await page.mouse.dblclick(title.x, title.y);
      await page.mouse.dblclick(title.x, title.y);
      await expectHeading(page, "Cell", "the Cell again");
      await pickOption(page, "content", "Badge");
      await until(async () => (await ctx.text()).includes('cell: (row) => <TableBadges><Badge size="medium" theme="neutral" background="subtle" leadingIcon={false}>{row.title}</Badge></TableBadges> }'), { message: "the Task column's cell as a Badge-Cell" });
      steps.push("Content → Badge");
      return steps.join(" → ");
    },
  },
  {
    id: "SE-32", feature: "A Table column without `cell`: its Cell's Content and Bold are the column's fields (content, bold)", wp: "table 2026-10-10",
    async run(ctx) {
      const page = await freshSelect(ctx, "table", { frame: TABLE_FRAME, position: { dx: 4, dy: 4 } });
      const status = await tableText(ctx, page, "Done");
      await page.mouse.dblclick(status.x, status.y);
      await expectHeading(page, "Data-Row", "the row");
      await page.mouse.dblclick(status.x, status.y);
      await expectHeading(page, "Cell", "the cell");
      await page.locator('#studio-right [data-prop="bold"]').getByRole("switch").first().click().catch(async () => page.locator('#studio-right [data-prop="bold"] button, #studio-right [data-prop="bold"] input').first().click());
      await until(async () => (await ctx.text()).includes('{ id: "status", header: "Status", field: "status", bold: true }'), { message: "bold: true on the Status column" });
      await pickOption(page, "content", "Badge");
      await until(async () => (await ctx.text()).includes('{ id: "status", header: "Status", field: "status", bold: true, content: "badge" }'), { message: 'content: "badge" on the Status column' });
      return "bold, content written on the column";
    },
  },
  {
    id: "SE-30", feature: "Figma's click: a click selects the outermost layer in context and keeps it, a double-click goes one level in, a click beside selects the sibling, ⌘-click the deepest", wp: "click 2026-10-09",
    async run(ctx) {
      const seed = await ctx.reseed();
      const { page } = await ctx.studio();
      await waitSeed(page, seed);
      const text = await ctx.text();
      const crew = locOf(text, "crew").loc;
      const row = locOf(text, "crew-row").loc;
      const loud = locOf(text, "cond").loc;
      const featured = locOf(text, "cond-const").loc;
      // The data frame's row of buttons: the Stack the three Buttons sit in.
      const lines = text.split("\n");
      const stackLine = lines.findIndex((line, index) => index > Number(loud.split(":")[0]) - 4 && /<Stack direction="row" gap="sm">/.test(line));
      const rowStack = `${stackLine + 1}:${lines[stackLine].indexOf("<Stack")}`;
      // The frame selected (its Layers row): no layer gives a context yet.
      await focusFrame(page, 1);
      const rows = await until(async () => { const all = await rectsOf(page, ctx.file, row); return all.length === 3 ? all : null; }, { message: "three crew rows" });
      const click = async (point, options = {}) => {
        for (const key of options.keys ?? []) await page.keyboard.down(key);
        try { await page.mouse.click(point.x, point.y, { clickCount: options.count ?? 1 }); } finally { for (const key of [...(options.keys ?? [])].reverse()) await page.keyboard.up(key); }
        await sleep(150);
      };
      const steps = [];
      // 1. A click on a crew row selects the List (the root Stack's child under the pointer), not the row.
      await click(centre(rows[0]));
      await expectSelected(page, ctx.file, crew, "a click on a row selects its List (the outermost layer)");
      steps.push("click → List");
      // 2. Again inside the List: it stays selected.
      await click(centre(rows[1]));
      await expectSelected(page, ctx.file, crew, "a second click inside the List keeps it");
      steps.push("click inside → List kept");
      // 3. A double-click on the second row goes one level in: that row.
      await page.mouse.dblclick(centre(rows[1]).x, centre(rows[1]).y);
      await expectSelected(page, ctx.file, row, "a double-click selects the row under the pointer");
      await until(async () => (await selectedRendering(page, ctx.file, row)) === 1, { message: "the second row selected" });
      if (await page.evaluate(() => Boolean(document.querySelector("[contenteditable='true'], [contenteditable='plaintext-only']")))) throw new Error("the double-click into a ListItem started a text edit");
      steps.push("double-click → row 2");
      // 4. A click on the third row: a sibling of the selected row (the List is the context).
      await click(centre(rows[2]));
      await until(async () => (await selectedRendering(page, ctx.file, row)) === 2, { message: "a click beside selects the sibling row" });
      steps.push("click → row 3");
      // 5. A click on the Loud button, outside the List: the top level again, the buttons' Stack.
      const loudRect = (await rectsOf(page, ctx.file, loud))[0];
      await click(centre(loudRect));
      await expectSelected(page, ctx.file, rowStack, "a click outside the context selects the top-level layer (the buttons' Stack)");
      steps.push("click elsewhere → Stack");
      // 6. ⌘-click on Loud: the deepest element there.
      await click(centre(loudRect), { keys: ["ControlOrMeta"] });
      await expectSelected(page, ctx.file, loud, "⌘-click selects the deepest layer (the Button)");
      steps.push("⌘-click → Loud");
      // 7. A click on Featured: Loud's sibling.
      await click(centre((await rectsOf(page, ctx.file, featured))[0]));
      await expectSelected(page, ctx.file, featured, "a click beside a Button selects its sibling");
      steps.push("click → Featured");
      return steps.join(" · ");
    },
  },
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
      // ⌘ on macOS (there Ctrl+click is the context menu), Ctrl elsewhere.
      await page.keyboard.down("ControlOrMeta");
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.keyboard.up("ControlOrMeta");
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
  {
    id: "SE-23", feature: "Layers lists a data slot's items (TopNavigation Top-Trailing › its actions); a row selects the action", wp: "backlog 2026-10-08",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-nav-box", { frame: 6, position: { dx: 4, dy: 4 } });
      await page.keyboard.press("Enter");
      await until(async () => (await selectedName(page)) === "TopNavigation", { message: "the TopNavigation selected" });
      await showLeftTab(page, "layers");
      const tree = page.locator(".studio-layers__tree");
      // The TopNavigation's row open (a row deeper than the first levels starts closed).
      const own = tree.locator('[role="treeitem"][aria-selected="true"]').first();
      await until(() => own.count(), { message: "the TopNavigation's Layers row" });
      if ((await own.getAttribute("aria-expanded")) === "false") await own.locator(".studio-layers__chevron").click();
      const slot = tree.locator('[role="treeitem"]', { hasText: "Top-Trailing" }).first();
      await until(() => slot.count(), { message: "a Top-Trailing slot row" });
      const share = tree.locator('[role="treeitem"]', { hasText: "Share" }).first();
      await until(() => share.count(), { message: "a Share row under Top-Trailing" });
      await share.scrollIntoViewIfNeeded();
      await share.click();
      await until(async () => !["TopNavigation", ""].includes(await selectedName(page)), { message: "the action selected (a part)" });
      return `Top-Trailing › Favourite, Share · row → ${await selectedName(page)}`;
    },
  },
  {
    id: "SE-24", feature: "A selected TopNavigation outlines its data slot on the canvas; its + chip adds an action", wp: "backlog 2026-10-08",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-nav-box", { frame: 6, position: { dx: 4, dy: 4 } });
      await page.keyboard.press("Enter");
      await until(async () => (await selectedName(page)) === "TopNavigation", { message: "the TopNavigation selected" });
      const tag = page.locator(".studio-slots__outline .studio-slots__tag", { hasText: "Top-Trailing" });
      await until(() => tag.count(), { message: "the Top-Trailing outline" });
      const chip = page.locator(".studio-slots__chip").getByRole("button", { name: "Add Action to Top-Trailing" });
      await chip.waitFor({ state: "visible", timeout: 4000 });
      await chip.click();
      const trailing = (text) => (/trailing=\{\[([\s\S]*?)\]\}/.exec(text)?.[1].match(/icon:/g) ?? []).length;
      await until(async () => trailing(await ctx.text()) === 3, { message: "three trailing actions in the source" });
      return "Top-Trailing outlined · + → 3 actions";
    },
  },
  {
    id: "SE-25", feature: "A px-capped component (number-only Chip, max-width 32px) offers no width handles; the pill says why", wp: "backlog 2026-10-08",
    async run(ctx) {
      const page = await freshSelect(ctx, "num-chip", { frame: 9 });
      await sleep(800);
      const handles = await page.locator(".studio-resize__handle").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-handle")));
      const pill = (await page.locator(".studio-resize__pill").allInnerTexts()).join(" | ");
      if (handles.includes("e") || handles.includes("w")) throw new Error(`width handles on a capped Chip: ${handles.join(",")} · pill \"${pill}\"`);
      return `handles ${handles.join(",") || "none"} · pill \"${pill}\"`;
    },
  },
  {
    id: "SE-26", feature: "Resizing a component edits its wrap Stack on the same line: the component stays selected at its new column", wp: "backlog 2026-10-08",
    async run(ctx) {
      const page = await freshSelect(ctx, "wrapped", { frame: 9 });
      const handle = page.locator('.studio-resize__handle[data-handle="e"]');
      await handle.waitFor({ state: "visible", timeout: 5000 });
      await sleep(400);
      const box = await handle.boundingBox();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let step = 1; step <= 6; step += 1) await page.mouse.move(x + (60 * step) / 6, y);
      await page.mouse.up();
      await expectSource(ctx, "wrap-stack", (el) => el.attr("width") !== "{200}", "the wrap Stack's width changed");
      // Past the canvas's own re-check of the DOM (the old drop came about 2 s after the write).
      await sleep(2500);
      const loc = `${ctx.file}:${await at(ctx, "wrapped")}`;
      const selected = await selectedSrc(page);
      if (!selected.includes(loc)) throw new Error(`selected ${selected.join(", ") || "nothing"}, the Button is at ${loc}`);
      return `width written on its Stack; the Button stays selected at ${loc.split(":").slice(-2).join(":")}`;
    },
  },
];
