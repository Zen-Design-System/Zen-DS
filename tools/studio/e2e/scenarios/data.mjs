// Data rows: text and props whose value comes from data (a .map item, examples/data.ts) rather than a literal.
import { element, locOf } from "../lib/source.mjs";
import { inspectorRow, sleep, statusText, until } from "../lib/studio.mjs";
import { expectSource, freshSelect } from "./inspector.mjs";

/** The box of the deepest element under file:loc whose own text is `text` (to double-click the words themselves). */
async function textBox(page, file, loc, text) {
  return page.evaluate(({ src, text }) => {
    const root = window.__e2e.elementOf(src);
    if (!root) return null;
    const all = [root, ...root.querySelectorAll("*")].filter((el) => el.textContent.trim() === text);
    const el = all[all.length - 1];
    if (!el) return null;
    // The words themselves (a block span is wider than its text, and slot chips sit at its edges).
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, { src: `${file}:${loc}`, text });
}

/**
 * Which rendering of `src` (0-based, document order) the selection outline covers: -1 when none does, -2 when `src`
 * renders nothing with its data-zen-src.
 */
async function selectedRendering(page, src) {
  return page.evaluate((src) => {
    const rows = [...document.querySelectorAll(`[data-zen-src="${CSS.escape(src)}"]`)].map((el) => el.getBoundingClientRect());
    if (!rows.length) return -2;
    const outline = document.querySelector('.studio-selection__outline[data-kind="selected"]');
    if (!outline) return -1;
    const box = outline.getBoundingClientRect();
    return rows.findIndex((r) => Math.abs(r.y + r.height / 2 - (box.y + box.height / 2)) < 4 && Math.abs(r.x - box.x) < 4);
  }, src);
}

async function editInPlace(page, rect, text) {
  await page.mouse.dblclick(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await until(async () => page.evaluate(() => Boolean(document.querySelector("[contenteditable='true'], [contenteditable='plaintext-only']"))), { timeout: 2500, message: "an inline text editor" });
  await page.keyboard.press("ControlOrMeta+KeyA");
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
}

export const rows = [
  {
    id: "DA-01", feature: "Double-click literal text edits it in place", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "text");
      const rect = await textBox(page, ctx.file, locOf(await ctx.text(), "text").loc, "Literal text");
      if (!rect) throw new Error('no "Literal text" on the canvas');
      await editInPlace(page, rect, "Double-clicked");
      await expectSource(ctx, "text", (el) => el.text() === "Double-clicked", "the new text");
      return "written";
    },
  },
  {
    id: "DA-02", feature: "Double-click text that comes from a .map row edits the data item", wp: "WP-F",
    async run(ctx) {
      const page = await freshSelect(ctx, "crew-row", { frame: 1 });
      const rect = await textBox(page, ctx.file, locOf(await ctx.text(), "crew-row").loc, "Ava Tran");
      if (!rect) throw new Error('no "Ava Tran" on the canvas');
      try {
        await editInPlace(page, rect, "Ava T.");
      } catch (error) {
        throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 100)}`);
      }
      await until(async () => (await ctx.text()).includes('name: "Ava T."'), { message: "crew[0].name in the const" });
      return "crew[0].name edited";
    },
  },
  {
    id: "DA-03", feature: "Prop fed by examples/data.ts can be edited (at the data, with a warning)", wp: "WP-C",
    async run(ctx) {
      const page = await freshSelect(ctx, "people-row", { frame: 1 });
      const input = inspectorRow(page, "caption").locator("input").first();
      if (!(await input.count()) || !(await input.isEditable())) throw new Error(`caption is read-only (${(await inspectorRow(page, "caption").innerText()).replace(/\s+/g, " ").slice(0, 60)})`);
      await input.fill("Research lead");
      await input.press("Enter");
      await sleep(800);
      const draft = (await ctx.api.drafts()).drafts.map((row) => row.file);
      if (!draft.includes(ctx.dataFile)) throw new Error("no draft of examples/data.ts");
      return "data.ts drafted";
    },
  },
  {
    id: "DA-05", feature: "⌘D on a .map row copies its data item (a new id), the JSX stays one element; the copy is selected", wp: "slots 2026-10-09",
    async run(ctx) {
      const page = await freshSelect(ctx, "crew-row", { frame: 1 });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyD");
      await until(async () => (await ctx.text()).includes('{ id: "ava", name: "Ava Tran", role: "Design lead" },\n  { id: "ava-copy", name: "Ava Tran", role: "Design lead" },'), { message: "crew[1]: a copy of Ava with id ava-copy" });
      const text = await ctx.text();
      if ((text.match(/data-e2e="crew-row"/g) ?? []).length !== 1) throw new Error("the row's JSX was copied, not its data");
      const src = `${ctx.file}:${locOf(text, "crew-row").loc}`;
      let at = -1;
      await until(async () => (at = await selectedRendering(page, src)) === 1, { message: "the copy (second row) selected" }).catch((error) => {
        throw new Error(`${error.message}: the outline covers rendering ${at}`);
      });
      return "crew[1] = Ava's copy, selected";
    },
  },
  {
    id: "DA-06", feature: "Delete on a .map row removes its data item; the other rows and the JSX stay, nothing to confirm", wp: "slots 2026-10-09",
    async run(ctx) {
      const page = await freshSelect(ctx, "crew-row", { frame: 1 });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Backspace");
      await until(async () => !(await ctx.text()).includes('id: "ava"'), { message: "crew[0] (Ava) removed from the const" });
      const text = await ctx.text();
      if (!text.includes('{ id: "bao", name: "Bao Le", role: "Engineer" },') || !text.includes('{ id: "chi"')) throw new Error("other rows changed");
      if ((text.match(/data-e2e="crew-row"/g) ?? []).length !== 1) throw new Error("the row's JSX was removed");
      if (await page.getByRole("alertdialog").count()) throw new Error("a confirmation was asked");
      return "crew = [bao, chi]";
    },
  },
  {
    id: "DA-07", feature: "Menu › Move down on a .map row swaps it with the next row in its data; the moved row stays selected", wp: "slots 2026-10-09",
    async run(ctx) {
      const page = await freshSelect(ctx, "crew-row", { frame: 1 });
      const src = `${ctx.file}:${locOf(await ctx.text(), "crew-row").loc}`;
      const rect = await page.evaluate((src) => document.querySelector(`[data-zen-src="${CSS.escape(src)}"]`)?.getBoundingClientRect().toJSON() ?? null, src);
      if (!rect) throw new Error("no crew row on the canvas");
      // Near the row's left edge, below its slot chips: the selected row's slot "+" buttons sit at its centre.
      await page.mouse.click(rect.x + 24, rect.y + rect.height - 14, { button: "right" });
      await until(async () => (await page.getByRole("menuitem").count()) > 0, { message: "the canvas menu" });
      const item = page.getByRole("menuitem", { name: /^Move down/ });
      if (!(await item.count()) || (await item.getAttribute("aria-disabled")) === "true") {
        const items = await page.getByRole("menuitem").evaluateAll((all) => all.map((el) => `${el.textContent.trim().replace(/\s+/g, " ")}${el.getAttribute("aria-disabled") === "true" ? " (off)" : ""}`));
        throw new Error(`Move down not offered: ${items.join(" · ").slice(0, 400)}`);
      }
      await item.click();
      await until(async () => /const crew = \[\n {2}\{ id: "bao"[^\n]*\},\n {2}\{ id: "ava"/.test(await ctx.text()), { message: "crew = [bao, ava, chi]" });
      const text = await ctx.text();
      if ((text.match(/data-e2e="crew-row"/g) ?? []).length !== 1) throw new Error("the row's JSX moved, not its data");
      let at = -1;
      await until(async () => (at = await selectedRendering(page, `${ctx.file}:${locOf(text, "crew-row").loc}`)) === 1, { message: "Ava (now the second row) selected" }).catch((error) => {
        throw new Error(`${error.message}: the outline covers rendering ${at}`);
      });
      return "crew = [bao, ava, chi], Ava selected";
    },
  },
  {
    id: "DA-04", feature: "Unchanged rows of the same list keep their own values (one element renders all rows)", wp: "WP-C",
    async run(ctx) {
      // Guard for DA-02 / I-10: editing one row must never write a literal onto the shared <ListItem>.
      const el = element(await ctx.text(), ctx.file, "crew-row");
      if (el.attr("title") !== "{one.name}") throw new Error(`the row element now has title=${el.attr("title")}`);
      return "title={one.name} kept";
    },
  },
];
