// Structural rows: insert from Assets, the canvas context menu, drag to reorder, slots, wrap, and clean-up after a remove.
import { countOf, e2eLocs, locOf } from "../lib/source.mjs";
import { clickLoc, inViewport, openAssetLibrary, rectOf, selectedSrc, showLeftTab, sleep, statusText, until } from "../lib/studio.mjs";
import { expectSource, freshSelect, waitInspector } from "./inspector.mjs";

const at = async (ctx, id, index = 0) => locOf(await ctx.text(), id, index).loc;
const canvas = (page) => page.locator(".studio-viewport");
const tagCount = (text, tag) => (text.match(new RegExp(`<${tag}\\b`, "g")) ?? []).length;

/** Opens the canvas context menu at (x, y) and returns its item names (menuitem roles), or throws when none opens. */
async function contextMenuAt(page, x, y) {
  await page.mouse.click(x, y, { button: "right" });
  const menu = page.getByRole("menu").last();
  await menu.waitFor({ state: "visible", timeout: 2500 });
  const read = () => menu.getByRole("menuitem").evaluateAll((els) => els.map((el) => ({
    name: el.textContent.replace(/\s+/g, " ").trim(),
    disabled: el.getAttribute("aria-disabled") === "true",
    box: (({ x, y, width, height }) => ({ x, y, width, height }))(el.getBoundingClientRect()),
  })));
  // A menu may move once after it opens (late captions, the anchor moved to keep it whole): read it when it settles.
  let items = await read();
  for (let i = 0; i < 15 && items.some((item) => !inViewport(item.box)); i += 1) {
    await sleep(100);
    items = await read();
  }
  return items;
}

async function closeMenu(page) {
  await page.keyboard.press("Escape");
  await sleep(150);
}

export const rows = [
  {
    id: "ST-01", feature: "Assets: click a component adds it at the selection", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-c");
      const before = tagCount(await ctx.text(), "Badge");
      await openAssetLibrary(page, "Components");
      await page.locator("#studio-left-panel-assets").getByLabel("Search components").fill("Badge");
      await page.locator("#studio-left-panel-assets [data-asset]", { hasText: "Badge" }).first().click();
      await until(async () => tagCount(await ctx.text(), "Badge") > before, { message: "a Badge in the source" });
      return "Badge inserted next to the selection";
    },
  },
  {
    id: "ST-02", feature: "Assets: click with nothing selected still adds it (into the frame in view)", wp: "GĐ3",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-c");
      await canvas(page).focus();
      for (let i = 0; i < 4; i += 1) await page.keyboard.press("Escape");
      const before = tagCount(await ctx.text(), "Badge");
      await openAssetLibrary(page, "Components");
      await page.locator("#studio-left-panel-assets").getByLabel("Search components").fill("Badge");
      await page.locator("#studio-left-panel-assets [data-asset]", { hasText: "Badge" }).first().click();
      try {
        await until(async () => tagCount(await ctx.text(), "Badge") > before, { timeout: 2500, message: "a Badge in the source" });
      } catch {
        throw new Error(`nothing inserted · status: ${(await statusText(page)).slice(0, 100)}`);
      }
      return "inserted";
    },
  },
  {
    id: "ST-03", feature: "Right-click a layer: menu on screen with Duplicate and Remove", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-b");
      const rect = await rectOf(page, ctx.file, await at(ctx, "btn-b"));
      const items = await contextMenuAt(page, rect.x + rect.width / 2, rect.y + rect.height / 2);
      await closeMenu(page);
      const names = items.map((item) => item.name).join(" · ");
      if (!/Duplicate/.test(names) || !/Remove|Delete/.test(names)) throw new Error(`items: ${names.slice(0, 120)}`);
      const off = items.filter((item) => !inViewport(item.box)).length;
      if (off) throw new Error(`${off}/${items.length} items off screen`);
      return `${items.length} items`;
    },
  },
  {
    id: "ST-04", feature: "Right-click the empty canvas opens a canvas menu (paste, zoom to fit)", wp: "WP-B",
    async run(ctx) {
      const { page } = await ctx.studio();
      const area = await page.locator(".studio-viewport").boundingBox();
      // A spot left of the board, on the dotted canvas.
      try {
        const items = await contextMenuAt(page, area.x + 12, area.y + area.height - 80);
        await closeMenu(page);
        return `${items.length} items`;
      } catch {
        throw new Error("no menu on the empty canvas");
      }
    },
  },
  {
    id: "ST-05", feature: "Right-click with two layers selected offers Duplicate and Remove for both", wp: "WP-B",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      await clickLoc(page, ctx.file, await at(ctx, "btn-b"), { modifiers: ["Shift"] });
      const rect = await rectOf(page, ctx.file, await at(ctx, "btn-b"));
      const items = await contextMenuAt(page, rect.x + rect.width / 2, rect.y + rect.height / 2);
      await closeMenu(page);
      const names = items.map((item) => item.name).join(" · ");
      if (!/Duplicate/.test(names) || !/Remove|Delete/.test(names)) throw new Error(`multi-selection menu: ${names.slice(0, 120)}`);
      return names.slice(0, 80);
    },
  },
  {
    id: "ST-06", feature: "Detach is offered only where it works (or says which types can)", wp: "WP-B",
    async run(ctx) {
      const page = await freshSelect(ctx, "check");
      const rect = await rectOf(page, ctx.file, await at(ctx, "check"));
      const items = await contextMenuAt(page, rect.x + 10, rect.y + rect.height / 2);
      await closeMenu(page);
      const detach = items.find((item) => /Detach/i.test(item.name));
      if (!detach) return "not offered for a Checkbox";
      if (detach.disabled && !/Card|ListItem|types|only/i.test(detach.name)) throw new Error(`"${detach.name}" shown disabled with no reason`);
      return detach.name;
    },
  },
  {
    id: "ST-07", feature: "Drag a layer to reorder it on the canvas", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      const a = await rectOf(page, ctx.file, await at(ctx, "btn-a"));
      const c = await rectOf(page, ctx.file, await at(ctx, "btn-c"));
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      for (let step = 1; step <= 12; step += 1) await page.mouse.move(a.x + a.width / 2 + ((c.x + c.width - 4 - (a.x + a.width / 2)) * step) / 12, a.y + a.height / 2);
      await sleep(150);
      await page.mouse.up();
      await until(async () => {
        const all = e2eLocs(await ctx.text());
        const line = (id) => Number(all.get(id)?.[0]?.loc.split(":")[0] ?? 0);
        return line("btn-a") > line("btn-c");
      }, { message: "Alpha after Gamma in the source" });
      return "Alpha dropped after Gamma";
    },
  },
  {
    id: "ST-08", feature: "Card slot: Clear contents empties the slot, ⌘Z brings it back", wp: "GĐ0",
    async run(ctx) {
      // (Reset slot restores the SAVED file; the fixture is all unsaved, so it is not testable here.)
      const page = await freshSelect(ctx, "card", { frame: 2, position: { dx: 8, dy: 8 } });
      await page.locator("#studio-right [data-slot-more]").first().click();
      await page.getByRole("menuitem", { name: /Clear contents/ }).click();
      await until(async () => countOf(await ctx.text(), "card-body") === 0, { message: "the Card slot emptied" });
      await canvas(page).focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => countOf(await ctx.text(), "card-body") === 1, { message: "⌘Z to bring the content back" });
      return "cleared, then undone";
    },
  },
  {
    id: "ST-09", feature: "⌥⌘G wraps the selection in a Box", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "check");
      const before = tagCount(await ctx.text(), "Box");
      await canvas(page).focus();
      await page.keyboard.press("Alt+ControlOrMeta+KeyG");
      await until(async () => tagCount(await ctx.text(), "Box") > before, { message: "a Box in the source" });
      return "wrapped in a Box";
    },
  },
  {
    id: "ST-11", feature: "Menu Move up moves the layer and keeps it selected", wp: "WP-B",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-b");
      const rect = await rectOf(page, ctx.file, await at(ctx, "btn-b"));
      await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2, { button: "right" });
      await page.getByRole("menuitem", { name: /^Move up/ }).click();
      await until(async () => {
        const all = e2eLocs(await ctx.text());
        const line = (id) => Number(all.get(id)?.[0]?.loc.split(":")[0] ?? 0);
        return line("btn-b") < line("btn-a");
      }, { message: "Beta before Alpha in the source" });
      const want = `${ctx.file}:${await at(ctx, "btn-b")}`;
      await until(async () => (await selectedSrc(page)).includes(want), { message: `Beta still selected at ${want} (selected: ${(await selectedSrc(page)).join(", ")})` });
      return "moved up, still selected";
    },
  },
  {
    id: "ST-10", feature: "Removing a layer also removes the state only it used", wp: "WP-B",
    async run(ctx) {
      const page = await freshSelect(ctx, "cond", { frame: 1 });
      await canvas(page).focus();
      await page.keyboard.press("Backspace");
      await until(async () => countOf(await ctx.text(), "cond") === 0, { message: "the Loud button removed" });
      if (/const \[loud, setLoud\] = useState/.test(await ctx.text())) throw new Error("`const [loud, setLoud] = useState(false)` is left behind, unused");
      return "useState removed with it";
    },
  },
  {
    id: "ST-12", feature: "Shared code: a structural edit asks first (Cancel writes nothing), then goes ahead", wp: "WP-B2",
    async run(ctx) {
      // StudioSaveFixture.tsx is not this example's own code (the E2E page imports it): shared, like PlatformDemoActions.
      const page = await freshSelect(ctx, "save-b", { frame: 4, file: ctx.saveFile });
      const saved = async () => (await ctx.api.source(ctx.saveFile)).content;
      const dialog = page.getByRole("alertdialog", { name: "Change shared code?" });
      await canvas(page).focus();
      await page.keyboard.press("ControlOrMeta+KeyD");
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      const text = await dialog.innerText();
      if (!/used in 1 file \(uploader\.tsx\)/.test(text)) throw new Error(`the dialog does not name the file that uses it: ${text.replace(/\s+/g, " ").slice(0, 160)}`);
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await sleep(600);
      if ((await ctx.api.drafts()).drafts.some((row) => row.file === ctx.saveFile)) throw new Error("Cancel still wrote a draft");
      await canvas(page).focus();
      await page.keyboard.press("ControlOrMeta+KeyD");
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      await dialog.getByRole("button", { name: "Change everywhere" }).click();
      await until(async () => countOf(await saved(), "save-b") === 2, { message: "save-b duplicated in the shared file" });
      // The yes holds for this file: the next structural edit there does not ask again (once the copy is selected).
      await until(async () => /Duplicated/.test(await statusText(page)), { message: "the duplicate finished" });
      await sleep(600);
      await canvas(page).focus();
      await page.keyboard.press("ControlOrMeta+KeyD");
      await until(async () => countOf(await saved(), "save-b") === 3, { message: "a third save-b without a second question" });
      if (await dialog.isVisible()) throw new Error("asked again for the same file");
      return "asked (1 file: uploader.tsx) → Cancel: nothing → yes: duplicated → no second question";
    },
  },
  {
    id: "ST-20", feature: "Drag a floating Box: it moves by its insets (snapped to the ladder), never reordered", wp: "backlog 2026-10-08",
    async run(ctx) {
      const page = await freshSelect(ctx, "float-l", { frame: 9 });
      const box = await rectOf(page, ctx.file, await at(ctx, "float-l"));
      // Off the centre, where an empty Box shows its slot + chip.
      const x = box.x + 12;
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let step = 1; step <= 8; step += 1) await page.mouse.move(x + (24 * step) / 8, y + (12 * step) / 8);
      const label = (await page.locator(".studio-drag__label").allInnerTexts()).join(" | ");
      await page.mouse.up();
      const moved = await expectSource(ctx, "float-l", (el) => el.attr("insetLeft") !== "sm" && el.attr("insetTop") !== "sm", "insetLeft and insetTop moved");
      const text = await ctx.text();
      if (text.indexOf('data-e2e="float-l"') > text.indexOf('data-e2e="float-s"')) throw new Error("the floating Box was reordered");
      return `pill "${label}" → insetLeft ${moved.attr("insetLeft")}, insetTop ${moved.attr("insetTop")}`;
    },
  },
  {
    id: "ST-21", feature: "Drag two selected layers: both land together at the drop place (one edit), still selected", wp: "backlog 2026-10-08",
    async run(ctx) {
      const page = await freshSelect(ctx, "flow-a", { frame: 9, position: { dx: 3, dy: 3 } });
      await clickLoc(page, ctx.file, await at(ctx, "flow-b"), { modifiers: ["Shift"], position: { dx: 3, dy: 3 } });
      await until(async () => (await selectedSrc(page)).length === 2, { message: "two layers selected" });
      const a = await rectOf(page, ctx.file, await at(ctx, "flow-a"));
      const c = await rectOf(page, ctx.file, await at(ctx, "flow-c"));
      const from = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      const to = { x: c.x + c.width - 3, y: c.y + c.height / 2 };
      for (let step = 1; step <= 12; step += 1) await page.mouse.move(from.x + ((to.x - from.x) * step) / 12, from.y + ((to.y - from.y) * step) / 12);
      await sleep(150);
      await page.mouse.up();
      const order = async () => {
        const text = await ctx.text();
        return ["flow-a", "flow-b", "flow-c"].map((id) => [id, text.indexOf(`data-e2e="${id}"`)]).sort((x, y) => x[1] - y[1]).map(([id]) => id).join(",");
      };
      await until(async () => (await order()) === "flow-c,flow-a,flow-b", { message: `C, A, B in the source (status: ${(await statusText(page)).slice(-160)})` });
      await until(async () => (await selectedSrc(page)).length === 2, { message: "both still selected" });
      return "A + B dragged after C → C, A, B, both selected";
    },
  },
  {
    id: "ST-25", feature: "Layers panel: dragging a row of two selected layers moves both (one edit), still selected", wp: "backlog 2026-10-08",
    async run(ctx) {
      const page = await freshSelect(ctx, "flow-a", { frame: 9, position: { dx: 3, dy: 3 } });
      await clickLoc(page, ctx.file, await at(ctx, "flow-b"), { modifiers: ["Shift"], position: { dx: 3, dy: 3 } });
      await until(async () => (await selectedSrc(page)).length === 2, { message: "two layers selected" });
      await showLeftTab(page, "layers");
      const row = async (id) => {
        const locator = page.locator(`.studio-layers__tree [role="treeitem"][data-layer-id^="${ctx.file}:${await at(ctx, id)}"]`).first();
        await locator.scrollIntoViewIfNeeded();
        return locator.boundingBox();
      };
      const a = await row("flow-a");
      const c = await row("flow-c");
      // From A's row to the lower edge of C's row: after C (its middle would put them inside the Box).
      const from = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
      const to = { x: c.x + c.width / 2, y: c.y + c.height * 0.9 };
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      for (let step = 1; step <= 10; step += 1) await page.mouse.move(from.x + ((to.x - from.x) * step) / 10, from.y + ((to.y - from.y) * step) / 10);
      await sleep(150);
      await page.mouse.up();
      const order = async () => {
        const text = await ctx.text();
        return ["flow-a", "flow-b", "flow-c"].map((id) => [id, text.indexOf(`data-e2e="${id}"`)]).sort((x, y) => x[1] - y[1]).map(([id]) => id).join(",");
      };
      await until(async () => (await order()) === "flow-c,flow-a,flow-b", { message: `C, A, B in the source (status: ${(await statusText(page)).slice(-160)})` });
      await until(async () => (await selectedSrc(page)).length === 2, { message: "both still selected" });
      return "rows A + B dragged after C → C, A, B, both selected";
    },
  },
  {
    id: "ST-22", feature: "Drag the width handle of a px Grid column's only item: the column's track takes the width", wp: "backlog 2026-10-08",
    async run(ctx) {
      const page = await freshSelect(ctx, "grid-px-item", { frame: 5, position: { dx: 4, dy: 4 } });
      const handle = page.locator('.studio-resize__handle[data-handle="e"]');
      await handle.waitFor({ state: "visible", timeout: 5000 });
      // The Grid's source is read after the selection (the column rule needs its track list).
      await sleep(600);
      const box = await handle.boundingBox();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let step = 1; step <= 8; step += 1) await page.mouse.move(x - (40 * step) / 8, y);
      await page.mouse.up();
      const grid = await expectSource(ctx, "grid-px", (el) => /^\d+px 1fr$/.test(el.attr("columns") ?? "") && el.attr("columns") !== "240px 1fr", 'columns="<n>px 1fr"');
      const item = await expectSource(ctx, "grid-px-item", () => true, "the item");
      if (item.attr("width") !== undefined) throw new Error(`the item got its own width: ${item.attr("width")}`);
      return `⟷ −40 px → columns="${grid.attr("columns")}", the item keeps filling its cell`;
    },
  },
  {
    id: "ST-23", feature: "Drag a TopNavigation action past the next one's far edge: they swap (op moveItem)", wp: "backlog 2026-10-08",
    async run(ctx) {
      const page = await navSelected(ctx);
      const [favourite, share] = await navActions(page);
      await dragFrom(page, favourite, { x: share.x + share.width - 2, y: share.y + share.height / 2 });
      await until(async () => /trailing=\{\[[\s\S]*?"Share"[\s\S]*?"Favourite"/.test(await ctx.text()), { message: "Share before Favourite in the source" });
      return "Favourite dropped after Share → Share, Favourite";
    },
  },
  {
    id: "ST-24", feature: "Drop a TopNavigation action on the middle of another: the two share one pill (op groupItem)", wp: "backlog 2026-10-08",
    async run(ctx) {
      const page = await navSelected(ctx);
      const [favourite, share] = await navActions(page);
      await dragFrom(page, favourite, { x: share.x + share.width / 2, y: share.y + share.height / 2 });
      await until(async () => ((/trailing=\{\[([\s\S]*?)\]\}/.exec(await ctx.text())?.[1] ?? "").match(/group:/g) ?? []).length === 2, { message: "both actions with a group in the source" });
      return "Favourite on Share → one group";
    },
  },
  {
    id: "ST-26", feature: "Toolbar › Text (T): point beside a layer in a Stack, click: a Text lands there, selected; Move again", wp: "toolbar 2026-10-09",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      const before = tagCount(await ctx.text(), "Text");
      await page.locator(".studio-canvas-tools").getByRole("button", { name: "Text", exact: true }).click();
      // Over Beta's right edge in the row Stack: the insertion line goes after it.
      const rect = await rectOf(page, ctx.file, await at(ctx, "btn-b"));
      await page.mouse.move(rect.x + rect.width - 4, rect.y + rect.height / 2);
      await page.mouse.move(rect.x + rect.width - 2, rect.y + rect.height / 2);
      await page.mouse.down();
      await page.mouse.up();
      await until(async () => tagCount(await ctx.text(), "Text") > before, { message: "a Text in the source" });
      const move = page.locator(".studio-canvas-tools").getByRole("button", { name: "Move", exact: true });
      await until(async () => (await move.getAttribute("aria-pressed")) === "true", { message: "Move again" });
      return "Text placed in the row Stack; the tool back to Move";
    },
  },
  {
    id: "ST-27", feature: "Toolbar: Escape puts a placement tool away and adds nothing", wp: "toolbar 2026-10-09",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      const before = await ctx.text();
      await page.locator(".studio-canvas-tools").getByRole("button", { name: "Stack", exact: true }).click();
      if (!(await page.locator(".studio-viewport[data-studio-placing]").count())) throw new Error("the canvas is not placing");
      await page.keyboard.press("Escape");
      const move = page.locator(".studio-canvas-tools").getByRole("button", { name: "Move", exact: true });
      await until(async () => (await move.getAttribute("aria-pressed")) === "true", { message: "Move again" });
      if (await page.locator(".studio-viewport[data-studio-placing]").count()) throw new Error("still placing after Escape");
      await sleep(300);
      if ((await ctx.text()) !== before) throw new Error("the source changed");
      return "Stack tool → Escape → Move, nothing added";
    },
  },
];

/** The fixture's TopNavigation selected (frame 6), for the data-item drag rows. */
async function navSelected(ctx) {
  const page = await freshSelect(ctx, "inst-nav-box", { frame: 6, position: { dx: 4, dy: 4 } });
  await page.keyboard.press("Enter");
  await until(async () => (await page.locator("#studio-right h2").first().innerText().catch(() => "")).trim() === "TopNavigation", { message: "the TopNavigation selected" });
  await sleep(300);
  return page;
}

/** The rects of the fixture TopNavigation's drawn actions, in order. */
async function navActions(page) {
  return page.locator('[data-studio-frame="example:6"] button.zen-top-nav__action').evaluateAll((nodes) => nodes.map((node) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
}

/** A real pointer drag from the centre of `box` to `to`, in steps. */
async function dragFrom(page, box, to) {
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= 10; step += 1) await page.mouse.move(from.x + ((to.x - from.x) * step) / 10, from.y + ((to.y - from.y) * step) / 10);
  await sleep(150);
  await page.mouse.up();
}
