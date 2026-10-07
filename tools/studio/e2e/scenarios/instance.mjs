// Instance rows (Studio builder GĐ4, spec docs/research/studio-builder-instance-spec-2026-10-07.md): a Zen instance
// customised as in Figma's instance panel — option names, Reset all overrides, a field's Label group, the switches that
// show a layer — on the fixture's "E2E instance" frame and on a builder page.
import { inspectorRow, showLeftTab, sleep, until } from "../lib/studio.mjs";
import { clickNamed, newPage, pageText, selectStack } from "./builder.mjs";
import { expectSource, freshSelect, pickOption } from "./inspector.mjs";

const FRAME = 6;
const resetAll = (page) => page.locator("#studio-right").getByRole("button", { name: "Reset all overrides" });
/** Waits until a row's switch shows `checked`: a layer switch reads the rendered props, so it follows the canvas's hot
 *  update (a few hundred ms after the source), as a person sees it flip before pressing it again. */
const switchShows = (page, prop, checked) => until(async () => (await inspectorRow(page, prop).getByRole("switch").getAttribute("aria-checked")) === String(checked), { message: `${prop} switch ${checked ? "on" : "off"}` });
/** The option names of an Inspector row's select, in the order shown (the list closes again). */
async function optionNames(page, prop) {
  await inspectorRow(page, prop).locator("button").first().click();
  const names = await page.getByRole("option").allInnerTexts();
  await page.keyboard.press("Escape");
  await sleep(150);
  return names.map((name) => name.trim());
}

export const rows = [
  {
    id: "IN-01", feature: "A variant select lists Figma's options by Figma's names; the file gets the code value", wp: "GĐ4 M1",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-button", { frame: FRAME });
      const names = await optionNames(page, "size");
      const figma = ["XLarge", "Large", "Medium (Base)", "Small", "XSmall"];
      if (JSON.stringify(names.slice(0, 5)) !== JSON.stringify(figma)) throw new Error(`Size lists ${names.join(", ")}`);
      await pickOption(page, "size", "Medium (Base)");
      await expectSource(ctx, "inst-button", (el) => el.attr("size") === "md", 'size="md" in the source');
      return `Size: ${names.join(" · ")} → "Medium (Base)" writes md`;
    },
  },
  {
    id: "IN-02", feature: "Reset all overrides: design props back to default, content kept, one ⌘Z brings them back", wp: "GĐ4 M1",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-button", { frame: FRAME });
      await resetAll(page).click();
      const reset = await expectSource(ctx, "inst-button", (el) => ["level", "size", "startIcon"].every((name) => el.attr(name) === undefined), "level, size and startIcon removed");
      if (reset.attr("onClick") === undefined || reset.text() !== "Save") throw new Error("the handler or the label went too");
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await expectSource(ctx, "inst-button", (el) => el.attr("level") === "accent" && el.attr("size") === "lg" && el.attr("startIcon") === "icon-plus-line", "one ⌘Z brings all three back");
      return "level, size, startIcon removed (onClick, label kept) → one ⌘Z restores all three";
    },
  },
  {
    id: "IN-03", feature: "NumberField: Label and Help-Text from InputField; the Label group's Optional switch", wp: "GĐ4 M1",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-number", { frame: FRAME });
      for (const prop of ["label", "helpText", "size", "state"]) if (!(await inspectorRow(page, prop).count())) throw new Error(`no ${prop} row`);
      const group = page.locator("#studio-right").getByRole("group", { name: "Label" });
      await group.waitFor({ state: "visible", timeout: 3000 });
      await group.locator('[data-prop="labelOptional"]').getByRole("switch").click();
      await expectSource(ctx, "inst-number", (el) => el.attr("labelOptional") !== undefined, "labelOptional written");
      return "Label, Help-Text, Size, State rows; Label › Optional writes labelOptional";
    },
  },
  {
    id: "IN-04", feature: "EmptyState CTA switch writes an action object, off removes it", wp: "GĐ4 M1",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-empty", { frame: FRAME });
      await inspectorRow(page, "primaryAction").getByRole("switch").click();
      const on = await expectSource(ctx, "inst-empty", (el) => /label: "Action"/.test(el.attr("primaryAction") ?? ""), "primaryAction={{ label: \"Action\" }}");
      await switchShows(page, "primaryAction", true);
      if (!(await page.locator("#studio-right").getByText("Primary action", { exact: true }).count())) throw new Error("no Primary action fields while on");
      await inspectorRow(page, "primaryAction").getByRole("switch").click();
      await expectSource(ctx, "inst-empty", (el) => el.attr("primaryAction") === undefined, "primaryAction removed");
      return `on → ${on.attr("primaryAction")}, off → removed`;
    },
  },
  {
    id: "IN-05", feature: "An icon that can be switched off (AlertBanner Leading): off writes false, on goes back to the default", wp: "GĐ4 M1",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-alert", { frame: FRAME });
      const row = () => inspectorRow(page, "leading");
      if (!(await row().locator(".studio-icon-control").count())) throw new Error("no icon picker while on");
      await row().getByRole("switch").click();
      await expectSource(ctx, "inst-alert", (el) => el.attr("leading") === "{false}", "leading={false}");
      await switchShows(page, "leading", false);
      await row().getByRole("switch").click();
      await expectSource(ctx, "inst-alert", (el) => el.attr("leading") === undefined, "leading back to its default");
      return "off → leading={false}, on → removed (theme icon)";
    },
  },
  {
    id: "IN-06", feature: "Builder page: a Button from Assets shows Figma names; Reset all overrides is one ⌘Z", wp: "GĐ4 M1",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      await showLeftTab(page, "assets");
      await page.locator("#studio-left-panel-assets").getByLabel("Search components").fill("Primary button");
      await page.locator(".studio-assets__row", { hasText: /^Primary button/ }).first().click();
      await until(async () => /<Button level="primary"/.test((await pageText(page, id)) ?? ""), { message: "the Button" });
      await sleep(400);
      await clickNamed(page, id, "Button");
      const shown = (await inspectorRow(page, "level").innerText()).trim();
      if (!/Primary/.test(shown) || /\bprimary\b/.test(shown)) throw new Error(`the Level row reads "${shown}"`);
      await resetAll(page).click();
      await until(async () => /<Button onClick/.test((await pageText(page, id)) ?? ""), { message: "level removed" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => /<Button level="primary"/.test((await pageText(page, id)) ?? ""), { message: "⌘Z brings level back" });
      return 'Level reads "Primary"; Reset all → <Button onClick…> → ⌘Z → level="primary"';
    },
  },
];
