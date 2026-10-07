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
    id: "DA-04", feature: "Unchanged rows of the same list keep their own values (one element renders all rows)", wp: "WP-C",
    async run(ctx) {
      // Guard for DA-02 / I-10: editing one row must never write a literal onto the shared <ListItem>.
      const el = element(await ctx.text(), ctx.file, "crew-row");
      if (el.attr("title") !== "{one.name}") throw new Error(`the row element now has title=${el.attr("title")}`);
      return "title={one.name} kept";
    },
  },
];
