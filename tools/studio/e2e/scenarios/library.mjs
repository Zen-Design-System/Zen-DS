// Library rows (Studio builder GĐ3, spec docs/research/studio-builder-library-spec-2026-10-06.md): the Assets search
// (synonyms in English and Vietnamese, typos, best first) and where an item goes with nothing selected.
import { showLeftTab, sleep, statusText, until } from "../lib/studio.mjs";
import { focusScreen, newPage, pageText, selectedName } from "./builder.mjs";

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
];
