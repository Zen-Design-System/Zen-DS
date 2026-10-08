// Library rows (Studio builder GĐ3, spec docs/research/studio-builder-library-spec-2026-10-06.md): the Assets search
// (synonyms in English and Vietnamese, typos, best first) and where an item goes with nothing selected.
import { showLeftTab, sleep, statusText, until } from "../lib/studio.mjs";
import { focusScreen, newPage, pageText, selectStack, selectedName } from "./builder.mjs";
import { freshSelect } from "./inspector.mjs";

const quick = (page) => page.locator('[data-e2e="quick-insert"]');
/** The Assets tab on `kind` (Components · Icons · Photos), its search set to `query`. */
async function library(page, kind, query) {
  await showLeftTab(page, "assets");
  await assets(page).getByRole("button", { name: kind, exact: true }).click();
  await assets(page).getByLabel(`Search ${kind.toLowerCase()}`).fill(query);
  await sleep(200);
}
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
  // On the Components library: the Assets tab keeps the library an earlier row left it on (LB-12 leaves Photos, and
  // "Search components" is then not there: LB-13 and LB-14 waited out their 20 s for it).
  await library(page, "Components", query);
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
      await library(page, "Components", "badge");
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
      await library(page, "Components", "dialog");
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
  {
    id: "LB-08", feature: "Assets › Icons: a Vietnamese search finds the glyph; a click adds the Icon into the selected layout", wp: "GĐ3 M3",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      await library(page, "Icons", "xoá");
      const tile = assets(page).locator(".studio-assets__tile").first();
      const name = await tile.getAttribute("data-icon");
      if (!/^icon-trash/.test(name ?? "")) throw new Error(`first icon for "xoá" is ${name}`);
      await tile.click();
      await until(async () => new RegExp(`<Icon name="${name}" title="Trash`).test((await pageText(page, id)) ?? ""), { message: `<Icon name="${name}"> in the page` });
      await page.locator("#studio-right").getByRole("tab", { name: "Design" }).click();
      await until(async () => (await selectedName(page)) === "Icon", { message: "the Icon selected" });
      return `xoá → ${name}, added and selected`;
    },
  },
  {
    id: "LB-09", feature: "Assets › Icons with an Icon selected swaps its glyph (no new layer); ⌘Z puts it back", wp: "GĐ3 M3",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      await library(page, "Icons", "trash");
      await assets(page).locator(".studio-assets__tile").first().click();
      await until(async () => /<Icon name="icon-trash/.test((await pageText(page, id)) ?? ""), { message: "an Icon" });
      await page.locator("#studio-right").getByRole("tab", { name: "Design" }).click();
      await until(async () => (await selectedName(page)) === "Icon", { message: "the Icon selected" });
      await library(page, "Icons", "heart");
      if (!/swap the selected Icon/.test(await assets(page).locator(".studio-assets__note").innerText())) throw new Error("no swap hint");
      const heart = await assets(page).locator(".studio-assets__tile").first().getAttribute("data-icon");
      await assets(page).locator(".studio-assets__tile").first().click();
      await until(async () => new RegExp(`<Icon name="${heart}"`).test((await pageText(page, id)) ?? ""), { message: `the glyph swapped to ${heart}` });
      const icons = ((await pageText(page, id)) ?? "").match(/<Icon /g)?.length ?? 0;
      if (icons !== 1) throw new Error(`${icons} Icons in the page (a swap adds none)`);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => /<Icon name="icon-trash/.test((await pageText(page, id)) ?? ""), { message: "⌘Z back to the trash glyph" });
      return `trash → ${heart} → ⌘Z`;
    },
  },
  {
    id: "LB-10", feature: "Assets › Photos on a builder page: zen-media in the page, this build's URL on the canvas", wp: "GĐ3 M3",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      await library(page, "Photos", "cà phê");
      await assets(page).locator(".studio-assets__photo[data-photo]").first().click();
      await until(async () => /<Image src="zen-media:site-cafe" alt="Café table with a coffee" ratio="4:3" \/>/.test((await pageText(page, id)) ?? ""), { message: "the zen-media Image in the page" });
      const img = page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Image"] img, img[data-zen-src^="local:${id}.zen.tsx:"]`).first();
      await img.waitFor({ state: "attached", timeout: 10_000 });
      const src = await img.getAttribute("src");
      if (!src || src.startsWith("zen-media:")) throw new Error(`the canvas image src is ${src}`);
      await until(async () => img.evaluate((el) => el.complete && el.naturalWidth > 0), { timeout: 10_000, message: "the photo loaded" });
      return `zen-media:site-cafe → ${src.split("/").pop()}`;
    },
  },
  {
    id: "LB-11", feature: "Quick insert lists Icons for a Vietnamese word; Enter on one adds the Icon", wp: "GĐ3 M3",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      await openQuick(page);
      await page.keyboard.type("đóng");
      const iconOption = quick(page).locator('[role="option"][data-kind="icon"]').first();
      await iconOption.waitFor({ state: "visible", timeout: 5000 });
      for (let guard = 0; guard < 40 && (await quick(page).locator('[role="option"][aria-selected="true"]').getAttribute("data-kind")) !== "icon"; guard += 1) await page.keyboard.press("ArrowDown");
      const label = await activeOption(page);
      await page.keyboard.press("Enter");
      await until(async () => /<Icon name="icon-x/.test((await pageText(page, id)) ?? ""), { message: "an x Icon in the page" });
      return `đóng → ${label}`;
    },
  },
  {
    id: "LB-12", feature: "Assets › Photos on an example page writes platformMedia (the import joins)", wp: "GĐ3 M3",
    async run(ctx) {
      await ctx.studio({ fresh: true });
      const page = await freshSelect(ctx, "btn-c");
      await page.locator(".studio-viewport").focus();
      for (let i = 0; i < 4; i += 1) await page.keyboard.press("Escape");
      const before = tagCount(await ctx.text(), "Image");
      await library(page, "Photos", "coffee");
      await assets(page).locator(".studio-assets__photo[data-photo]").first().click();
      await until(async () => tagCount(await ctx.text(), "Image") > before, { timeout: 5000, message: "an Image in the host page" });
      const text = await ctx.text();
      if (!/<Image src=\{platformMedia\.site\[5\]\.src\}/.test(text)) throw new Error("not written with platformMedia");
      if (!/import \{[^}]*\bplatformMedia\b[^}]*\} from "[^"]*PlatformMedia"/.test(text)) throw new Error("platformMedia not imported");
      return "platformMedia.site[5] with its import";
    },
  },
  {
    id: "LB-13", feature: "Assets search with no match: Clear search brings the list back", wp: "backlog 2026-10-07",
    async run(ctx) {
      const { page } = await ctx.studio();
      const none = await results(page, "zzqqxx");
      if (none.length) throw new Error(`"zzqqxx" lists ${none.slice(0, 3).join(", ")}`);
      await assets(page).locator(".studio-assets__empty").getByRole("button", { name: "Clear search" }).click();
      await until(async () => (await assets(page).getByLabel("Search components").inputValue()) === "" && (await assets(page).locator(".studio-assets__row").count()) > 0, { message: "the search cleared and the list back" });
      return "No components match → Clear search → the list";
    },
  },
  {
    id: "LB-14", feature: "Assets insert, then ⌘Z: the layer goes and the selection returns to the layout it went into", wp: "backlog 2026-10-07",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      await library(page, "Components", "badge");
      await assets(page).locator(".studio-assets__row", { hasText: /^Badge/ }).first().click();
      await until(async () => tagCount(await pageText(page, id), "Badge") === 1, { message: "a Badge in the page" });
      await until(async () => (await selectedName(page)) === "Badge", { message: "the Badge selected" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => tagCount(await pageText(page, id), "Badge") === 0, { message: "⌘Z removes the Badge" });
      await until(async () => (await selectedName(page)) === "Stack", { message: "the Stack selected again" });
      return "Badge in, selected → ⌘Z → Stack selected";
    },
  },
];
