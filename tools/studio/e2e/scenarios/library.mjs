// Library rows (Studio builder GĐ3, spec docs/research/studio-builder-library-spec-2026-10-06.md): the Assets search
// (synonyms in English and Vietnamese, typos, best first) and where an item goes with nothing selected.
import { showLeftTab, sleep, statusText, until } from "../lib/studio.mjs";
import { focusScreen, newPage, pageText, selectStack, selectedName } from "./builder.mjs";
import { freshSelect } from "./inspector.mjs";

const quick = (page) => page.locator('[data-e2e="quick-insert"]');
const activeOption = (page) => quick(page).locator('[role="option"][aria-selected="true"] .studio-qi__name').innerText();
/** ⇧I on the canvas; resolves once Quick insert shows. */
async function openQuick(page) {
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("Shift+KeyI");
  await quick(page).waitFor({ state: "visible", timeout: 5000 });
}
const tagCount = (text, tag) => (String(text ?? "").match(new RegExp(`<${tag}\\b`, "g")) ?? []).length;

const assets = (page) => page.locator("#studio-left-panel-assets");
/** The Assets rows' names for `query`, in the order shown. */
async function results(page, query) {
  await showLeftTab(page, "assets");
  await assets(page).getByLabel("Search components").fill(query);
  await sleep(150);
  return assets(page).locator(".studio-assets__row .studio-assets__name").allInnerTexts();
}

export const rows = [
  {
    id: "LB-01", feature: "Assets search: synonyms find the component (modal → Dialog, dropdown → Select, switch → Toggle)", wp: "GĐ3 M1",
    async run(ctx) {
      const { page } = await ctx.studio();
      const seen = {};
      for (const [query, first] of [["modal", "Dialog"], ["dropdown", "Select"], ["switch", "Toggle"], ["kebab", "Menu"]]) {
        const names = await results(page, query);
        seen[query] = names[0];
        if (names[0] !== first) throw new Error(`"${query}" lists ${names.slice(0, 3).join(", ") || "nothing"} first, not ${first}`);
      }
      await assets(page).getByLabel("Search components").fill("");
      return Object.entries(seen).map(([query, name]) => `${query} → ${name}`).join(" · ");
    },
  },
  {
    id: "LB-02", feature: "Assets search in Vietnamese (with or without marks) and with a typo", wp: "GĐ3 M1",
    async run(ctx) {
      const { page } = await ctx.studio();
      const seen = {};
      for (const [query, first] of [["hộp thoại", "Dialog"], ["hop thoai", "Dialog"], ["nút", "Button"], ["bảng", "Table"], ["buton", "Button"]]) {
        const names = await results(page, query);
        seen[query] = names[0];
        if (names[0] !== first) throw new Error(`"${query}" lists ${names.slice(0, 3).join(", ") || "nothing"} first, not ${first}`);
      }
      await assets(page).getByLabel("Search components").fill("");
      return Object.entries(seen).map(([query, name]) => `${query} → ${name}`).join(" · ");
    },
  },
  {
    id: "LB-03", feature: "Builder page, nothing selected: an Assets click adds into the Screen in view and selects it", wp: "GĐ3 M1",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await focusScreen(page);
      await page.locator(".studio-viewport").focus();
      for (let i = 0; i < 3; i += 1) await page.keyboard.press("Escape");
      await showLeftTab(page, "assets");
      await assets(page).getByLabel("Search components").fill("badge");
      await assets(page).locator(".studio-assets__row", { hasText: /^Badge/ }).first().click();
      await until(async () => /<Stack gap="md" padding="lg">[\s\S]*<Badge/.test((await pageText(page, id)) ?? ""), { message: "a Badge inside the Screen's Stack" });
      await page.locator("#studio-right").getByRole("tab", { name: "Design" }).click();
      await until(async () => (await selectedName(page)) === "Badge", { message: "the new Badge selected" });
      return "Badge into the Screen's Stack, selected";
    },
  },
  {
    id: "LB-04", feature: "Builder page: Dialog from Assets says to use Prototype › Add overlay", wp: "GĐ3 M1",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await focusScreen(page);
      const before = await pageText(page, id);
      await showLeftTab(page, "assets");
      await assets(page).getByLabel("Search components").fill("dialog");
      await assets(page).locator(".studio-assets__row", { hasText: /^Dialog/ }).first().click();
      await until(async () => /Prototype › Add overlay/.test(await statusText(page)), { message: "the Add overlay hint in the status" });
      if ((await pageText(page, id)) !== before) throw new Error("the page changed");
      return "refused with the way to do it";
    },
  },
  {
    id: "LB-05", feature: "Quick insert (⇧I): type, Enter adds into the selected layout, closes, selects the new layer", wp: "GĐ3 M2",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      await openQuick(page);
      const where = await quick(page).locator('[data-e2e="quick-insert-target"]').innerText();
      if (!/^Into Stack/.test(where)) throw new Error(`target line: ${where}`);
      await page.keyboard.type("badge");
      await until(async () => (await activeOption(page)) === "Badge", { message: "Badge focused" });
      await page.keyboard.press("Enter");
      await until(async () => (await quick(page).count()) === 0, { message: "Quick insert closed" });
      await until(async () => /<Stack gap="md" padding="lg">[\s\S]*<Badge/.test((await pageText(page, id)) ?? ""), { message: "a Badge in the Stack" });
      await until(async () => (await selectedName(page)) === "Badge", { message: "the Badge selected" });
      return `"${where}" → Badge added and selected`;
    },
  },
  {
    id: "LB-06", feature: "Quick insert: ↓ moves the focus, the focused item is previewed for real, Esc closes without a change", wp: "GĐ3 M2",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      const before = await pageText(page, id);
      await openQuick(page);
      await page.keyboard.type("modal");
      await until(async () => (await activeOption(page)) === "Dialog", { message: "Dialog first" });
      await page.keyboard.press("ArrowDown");
      await until(async () => (await activeOption(page)) === "Modal form", { message: "↓ to Modal form" });
      await page.keyboard.press("ArrowUp");
      await page.keyboard.press("Backspace");
      await page.keyboard.press("Backspace");
      await page.keyboard.press("Backspace");
      await page.keyboard.press("Backspace");
      await page.keyboard.press("Backspace");
      await page.keyboard.type("button");
      const preview = quick(page).locator('[data-e2e="quick-insert-preview"][data-ready="true"]');
      await preview.waitFor({ state: "visible", timeout: 10_000 });
      await until(async () => (await preview.locator(".zen-button").count()) > 0, { timeout: 10_000, message: "a real Button in the preview" });
      await page.keyboard.press("Escape");
      await until(async () => (await quick(page).count()) === 0, { message: "Esc closes" });
      if ((await pageText(page, id)) !== before) throw new Error("the page changed");
      return "Dialog → ↓ Modal form; Button previewed; Esc, no change";
    },
  },
  {
    id: "LB-07", feature: "Quick insert on an example page with nothing selected adds into the frame in view", wp: "GĐ3 M2",
    async run(ctx) {
      // The rows before leave a builder page open: back to the host example page first.
      await ctx.studio({ fresh: true });
      const page = await freshSelect(ctx, "btn-c");
      await page.locator(".studio-viewport").focus();
      for (let i = 0; i < 4; i += 1) await page.keyboard.press("Escape");
      const before = tagCount(await ctx.text(), "Badge");
      await openQuick(page);
      const where = await quick(page).locator('[data-e2e="quick-insert-target"]').innerText();
      if (!/^Into /.test(where)) throw new Error(`target line: ${where}`);
      await page.keyboard.type("badge");
      await until(async () => (await activeOption(page)) === "Badge", { message: "Badge focused" });
      await page.keyboard.press("Enter");
      await until(async () => tagCount(await ctx.text(), "Badge") > before, { timeout: 5000, message: "a Badge in the host page" });
      return `"${where}" → Badge added`;
    },
  },
];
