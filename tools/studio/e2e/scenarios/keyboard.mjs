// Keyboard rows: the edit shortcuts the Shortcuts dialog lists, from the canvas and from the Inspector.
import { countOf, e2eLocs, locOf } from "../lib/source.mjs";
import { clickLoc, inspectorRow, selectedSrc, sleep, statusText, until } from "../lib/studio.mjs";
import { expectSource, freshSelect } from "./inspector.mjs";

const at = async (ctx, id, index = 0) => locOf(await ctx.text(), id, index).loc;
const count = async (ctx, id) => countOf(await ctx.text(), id);
const canvas = (page) => page.locator(".studio-viewport");

/** data-e2e ids of the row Stack's buttons in source order. */
async function buttonOrder(ctx) {
  const all = e2eLocs(await ctx.text());
  return ["btn-a", "btn-b", "btn-c"].flatMap((id) => (all.get(id) ?? []).map((hit) => ({ id, line: Number(hit.loc.split(":")[0]), col: Number(hit.loc.split(":")[1]) })))
    .sort((a, b) => a.line - b.line || a.col - b.col).map((hit) => hit.id);
}

export const rows = [
  {
    id: "K-01", feature: "Delete (canvas focused) removes the layer", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-c");
      await canvas(page).focus();
      await page.keyboard.press("Backspace");
      await until(async () => (await count(ctx, "btn-c")) === 0, { message: "btn-c removed" });
      return "removed";
    },
  },
  {
    id: "K-02", feature: "Delete after using an Inspector control removes the layer", wp: "WP-A",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-c");
      // A non-text control keeps focus in the Inspector (Figma: Delete still removes the selection).
      await inspectorRow(page, "disabled").getByRole("switch").click();
      await expectSource(ctx, "btn-c", (el) => el.attr("disabled") !== undefined, "disabled written");
      await page.keyboard.press("Backspace");
      await until(async () => (await count(ctx, "btn-c")) === 0, { timeout: 3000, message: "btn-c removed with focus in the Inspector" });
      return "removed";
    },
  },
  {
    id: "K-03", feature: "⌘D duplicates the layer", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      await canvas(page).focus();
      await page.keyboard.press("ControlOrMeta+KeyD");
      await until(async () => (await count(ctx, "btn-a")) === 2, { message: "two btn-a" });
      return "1 → 2";
    },
  },
  {
    id: "K-04", feature: "⌘D inside a text field never reaches the browser (bookmark)", wp: "WP-A",
    async run(ctx) {
      const page = await freshSelect(ctx, "check");
      await inspectorRow(page, "label").locator("input").first().focus();
      const prevented = await page.evaluate(() => window.__e2e.keyPrevented({ key: "d", code: "KeyD", metaKey: navigator.platform.startsWith("Mac"), ctrlKey: !navigator.platform.startsWith("Mac") }));
      if (!prevented) throw new Error("⌘D in a text field is not default-prevented: the browser opens its bookmark dialog");
      return "default prevented";
    },
  },
  {
    id: "K-05", feature: "Arrow keys move the layer among its siblings (auto layout)", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      await canvas(page).focus();
      await page.keyboard.press("ArrowRight");
      await until(async () => (await buttonOrder(ctx)).join() === "btn-b,btn-a,btn-c", { message: "Alpha after Beta" });
      return "Alpha, Beta, Gamma → Beta, Alpha, Gamma";
    },
  },
  {
    id: "K-06", feature: "⇧A wraps the selection in a Stack", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "check");
      await canvas(page).focus();
      await page.keyboard.press("Shift+KeyA");
      await until(async () => {
        const text = await ctx.text();
        const loc = locOf(text, "check").loc;
        const line = text.split("\n")[Number(loc.split(":")[0]) - 2] ?? "";
        return /<Stack\b/.test(line);
      }, { message: "a Stack around the Checkbox" });
      return "wrapped";
    },
  },
  {
    id: "K-07", feature: "⌘C then ⌘V pastes a copy of the layer", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-b");
      await canvas(page).focus();
      // Clicking the layer leaves the DOM selection in the canvas capture layer, so the browser's copy event targets it.
      const copyTarget = page.evaluate(() => new Promise((resolve) => document.addEventListener("copy", (e) => resolve(e.target?.className?.toString?.() ?? e.target?.nodeName), { once: true, capture: true })));
      await page.keyboard.press("ControlOrMeta+KeyC");
      const target = await Promise.race([copyTarget, new Promise((r) => setTimeout(() => r("no copy event"), 1500))]);
      await until(async () => /Copied/i.test(await statusText(page)), { timeout: 3000, message: `"Copied" (the copy event went to ${String(target).split(" ")[0]})` });
      await page.keyboard.press("ControlOrMeta+KeyV");
      try {
        await until(async () => (await count(ctx, "btn-b")) === 2, { message: "a pasted btn-b" });
      } catch (error) {
        throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 120)}`);
      }
      return "1 → 2";
    },
  },
  {
    id: "K-08", feature: "Enter edits text in place; Enter commits", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "text");
      await canvas(page).focus();
      await page.keyboard.press("Enter");
      await until(async () => page.evaluate(() => Boolean(document.querySelector("[contenteditable='true'], [contenteditable='plaintext-only']"))), { message: "an inline text editor" });
      await page.keyboard.press("ControlOrMeta+KeyA");
      await page.keyboard.type("Edited in place");
      await page.keyboard.press("Enter");
      await expectSource(ctx, "text", (el) => el.text() === "Edited in place", "the new text in the source");
      return "text written";
    },
  },
  {
    id: "K-09", feature: "Quick actions (⌘/) runs Duplicate (after a page load)", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a", { reload: true });
      await canvas(page).focus();
      await page.keyboard.press("ControlOrMeta+Slash");
      const box = page.locator('.studio-quick input[aria-label="Search actions"]');
      await box.waitFor({ state: "visible", timeout: 4000 });
      await box.fill("Duplicate");
      await sleep(150);
      await page.keyboard.press("Enter");
      await until(async () => (await count(ctx, "btn-a")) === 2, { message: "two btn-a" });
      return "duplicated";
    },
  },
  {
    id: "K-10", feature: "Quick actions Duplicate acts on every selected layer", wp: "WP-A",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a", { reload: true });
      await clickLoc(page, ctx.file, await at(ctx, "btn-b"), { modifiers: ["Shift"] });
      await sleep(200);
      await canvas(page).focus();
      await page.keyboard.press("ControlOrMeta+Slash");
      const box = page.locator('.studio-quick input[aria-label="Search actions"]');
      await box.waitFor({ state: "visible", timeout: 4000 });
      await box.fill("Duplicate");
      await sleep(150);
      await page.keyboard.press("Enter");
      await sleep(1500);
      const a = await count(ctx, "btn-a");
      const b = await count(ctx, "btn-b");
      if (a !== 2 || b !== 2) throw new Error(`btn-a ×${a}, btn-b ×${b} (want 2 and 2) · ${(await statusText(page)).slice(0, 80)}`);
      return "both duplicated";
    },
  },
  {
    id: "K-12", feature: "⌘/ still opens Quick actions after a hot update of the page", wp: "WP-A",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      await canvas(page).focus();
      await page.keyboard.press("ControlOrMeta+Slash");
      try {
        await page.locator('.studio-quick input[aria-label="Search actions"]').waitFor({ state: "visible", timeout: 3000 });
      } catch {
        throw new Error("⌘/ does nothing after the example file hot-updated (a page reload brings it back: K-09)");
      }
      await page.keyboard.press("Escape");
      return "opens";
    },
  },
  {
    id: "K-11", feature: "⌘D on two selected layers duplicates both", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      await clickLoc(page, ctx.file, await at(ctx, "btn-b"), { modifiers: ["Shift"] });
      await sleep(200);
      await canvas(page).focus();
      await page.keyboard.press("ControlOrMeta+KeyD");
      await until(async () => (await count(ctx, "btn-a")) === 2 && (await count(ctx, "btn-b")) === 2, { message: "btn-a and btn-b ×2" });
      return "both duplicated";
    },
  },
  {
    id: "K-13", feature: "→ on two selected layers of one parent moves both one place later, still selected; ⌘Z puts them back", wp: "backlog 2026-10-07",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      await clickLoc(page, ctx.file, await at(ctx, "btn-b"), { modifiers: ["Shift"] });
      await until(async () => (await selectedSrc(page)).length === 2, { message: "two layers selected" });
      const order = async () => {
        const text = await ctx.text();
        return ["btn-a", "btn-b", "btn-c"].map((id) => [id, text.indexOf(`data-e2e="${id}"`)]).sort((x, y) => x[1] - y[1]).map(([id]) => id).join(",");
      };
      await canvas(page).focus();
      await page.keyboard.press("ArrowRight");
      await until(async () => (await order()) === "btn-c,btn-a,btn-b", { message: "Gamma, Alpha, Beta in the source" });
      const moved = [await at(ctx, "btn-a"), await at(ctx, "btn-b")];
      await until(async () => {
        const all = await selectedSrc(page);
        return all.length === 2 && moved.every((loc) => all.includes(`${ctx.file}:${loc}`));
      }, { message: "both still selected at their new places" });
      await canvas(page).focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await order()) === "btn-a,btn-b,btn-c", { message: "⌘Z: Alpha, Beta, Gamma again" });
      return "Alpha + Beta → → Gamma, Alpha, Beta (both selected) → ⌘Z";
    },
  },
];

