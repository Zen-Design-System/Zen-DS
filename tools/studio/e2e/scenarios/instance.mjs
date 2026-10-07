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
/** The instance Size group's W or H field (Inspector › Layout). */
const sizeField = (page, axis) => page.locator(`#studio-right .studio-sizing[data-instance] .studio-sizing__field[data-axis="${axis}"]`);
const sizeText = async (page, axis) => (await sizeField(page, axis).locator("input").inputValue().catch(() => "")).trim();
/** Picks a W / H option ("Fill container", "Hug contents", "Fixed width…") from the field's list. */
async function sizeChoice(page, axis, label) {
  const field = sizeField(page, axis);
  await field.waitFor({ state: "visible", timeout: 5000 });
  await field.getByRole("button", { name: `${axis === "width" ? "Width" : "Height"} options` }).click();
  await page.getByRole("listbox", { name: `${axis === "width" ? "Width" : "Height"} sizing` }).getByRole("option", { name: new RegExp(`^${label}`) }).first().click();
}
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
      // The switch flips at once (optimistic); its fields come with the write's render.
      await until(async () => (await page.locator("#studio-right").getByText("Primary action", { exact: true }).count()) > 0, { message: "Primary action fields while on" });
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
    id: "IN-07", feature: "Icon picker: Figma's default first, then the icons this file uses, then all", wp: "GĐ4 M2",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-button", { frame: FRAME });
      // The Leading-Icon switch's row comes first (same prop): the picker is in the Leading-Icon-Src row.
      await page.locator('#studio-right [data-prop="startIcon"] .studio-icon-control button').first().click();
      const groups = page.locator("[data-icon-group]");
      await groups.first().waitFor({ state: "visible", timeout: 3000 });
      await until(async () => (await groups.count()) >= 3, { message: "Default, Used in this file and All icons" });
      const read = await groups.evaluateAll((els) => els.map((el) => ({ id: el.getAttribute("data-icon-group"), first: el.querySelector(".zen-popover__item")?.textContent?.trim() ?? "" })));
      await page.keyboard.press("Escape");
      if (read[0].id !== "default" || !read[0].first.includes("icon-plus-line")) throw new Error(`first group ${JSON.stringify(read[0])}`);
      if (read[1].id !== "file" || !read[1].first.includes("icon-heart-line")) throw new Error(`second group ${JSON.stringify(read[1])}`);
      return `Default in Figma: icon-plus-line · Used in this file: ${read[1].first} · ${read.at(-1).id}`;
    },
  },
  {
    id: "IN-08", feature: "A layer switch starts from Figma's default icon (Trailing-Icon → icon-plus-line)", wp: "GĐ4 M2",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-button", { frame: FRAME });
      await inspectorRow(page, "endIcon").getByRole("switch").click();
      await expectSource(ctx, "inst-button", (el) => el.attr("endIcon") === "icon-plus-line", 'endIcon="icon-plus-line"');
      return 'Trailing-Icon on → endIcon="icon-plus-line" (Figma\'s default)';
    },
  },
  {
    id: "IN-09", feature: "Slot swap: ListItem Leading Avatar → Dock icon, imports follow, one ⌘Z", wp: "GĐ4 M2",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-row", { frame: FRAME });
      const slot = page.locator('#studio-right [data-slot="leading"]');
      await slot.getByRole("button", { name: "Swap Avatar" }).click();
      await page.getByRole("menuitem", { name: /^Dock icon/ }).click();
      const swapped = await expectSource(ctx, "inst-row", (el) => /^<DockIcon/.test(el.attributes.find((attr) => attr.name === "leading")?.value ?? ""), "leading={<DockIcon …/>}");
      const text = await ctx.text();
      if (!/import \{ DockIcon \}/.test(text)) throw new Error("no DockIcon import");
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await expectSource(ctx, "inst-row", (el) => /^<Avatar/.test(el.attributes.find((attr) => attr.name === "leading")?.value ?? ""), "one ⌘Z brings the Avatar back");
      return `leading → ${swapped.attributes.find((attr) => attr.name === "leading").value.slice(0, 40)} → ⌘Z → Avatar`;
    },
  },
  {
    id: "IN-10", feature: "Swap instance (Inspector header → Quick insert's Swap mode): Badge → Avatar in place, selected, one ⌘Z", wp: "GĐ4 M2",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-badge", { frame: FRAME });
      await page.locator("#studio-right").getByRole("button", { name: "Swap instance" }).click();
      const panel = page.locator('[data-e2e="quick-insert"][data-mode="swap"]');
      await panel.waitFor({ state: "visible", timeout: 3000 });
      const where = (await panel.locator('[data-e2e="quick-insert-target"]').innerText()).trim();
      if (!/Swap Badge/.test(where)) throw new Error(`the target line reads "${where}"`);
      await panel.getByLabel("Search components").fill("avatar");
      await sleep(200);
      await panel.locator(".studio-qi__option", { has: page.locator(".studio-qi__name", { hasText: /^Avatar$/ }) }).first().click();
      // The Avatar takes the Badge's place: between the EmptyState and the List (the imports above may change).
      await until(async () => /<EmptyState data-e2e="inst-empty"[^\n]*\n\s*<Avatar\b/.test(await ctx.text()), { message: "an Avatar where the Badge was" });
      await until(async () => (await page.locator("#studio-right h2").first().innerText().catch(() => "")).trim() === "Avatar", { message: "the Avatar selected" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => /<EmptyState data-e2e="inst-empty"[^\n]*\n\s*<Badge data-e2e="inst-badge"/.test(await ctx.text()), { message: "one ⌘Z brings the Badge back" });
      return `"${where}" → Avatar in place, selected → ⌘Z → Badge`;
    },
  },
  {
    id: "IN-11", feature: "Builder page: canvas menu › Swap instance… replaces a Button with a Badge, one ⌘Z", wp: "GĐ4 M2",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      await showLeftTab(page, "assets");
      await page.locator("#studio-left-panel-assets").getByLabel("Search components").fill("Primary button");
      await page.locator(".studio-assets__row", { hasText: /^Primary button/ }).first().click();
      await until(async () => /<Button level="primary"/.test((await pageText(page, id)) ?? ""), { message: "the Button" });
      await sleep(400);
      await clickNamed(page, id, "Button");
      const box = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Button"]`).first().boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
      await page.getByRole("menuitem", { name: /^Swap instance/ }).click();
      const panel = page.locator('[data-e2e="quick-insert"][data-mode="swap"]');
      await panel.waitFor({ state: "visible", timeout: 3000 });
      await panel.getByLabel("Search components").fill("badge");
      await sleep(200);
      await page.keyboard.press("Enter");
      await until(async () => { const text = (await pageText(page, id)) ?? ""; return /<Badge\b/.test(text) && !/<Button\b/.test(text); }, { message: "the Badge instead of the Button" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => /<Button level="primary"/.test((await pageText(page, id)) ?? ""), { message: "⌘Z brings the Button back" });
      return "Button → menu › Swap instance… › Badge → ⌘Z → Button";
    },
  },
  {
    id: "IN-12", feature: "Nested instance from the owner's panel: the Avatar in a ListItem's Leading shows Figma's Size and writes it", wp: "GĐ4 M3",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-row", { frame: FRAME });
      const group = page.locator('#studio-right [role="group"][aria-label="Avatar in Leading"]');
      await group.waitFor({ state: "visible", timeout: 5000 });
      const labels = await group.locator("[data-prop]").evaluateAll((rows) => rows.map((row) => row.querySelector(".studio-inspector__row-label")?.textContent?.trim()));
      for (const label of ["Shape", "Size", "Theme", "Status"]) if (!labels.includes(label)) throw new Error(`the nested Avatar lists ${labels.join(", ")}`);
      await group.locator('[data-prop="size"] button').first().click();
      await page.getByRole("option", { name: "Large", exact: true }).click();
      await until(async () => /leading=\{<Avatar alt="Ava Tran" size="lg" \/>\}/.test(await ctx.text()), { message: 'the nested Avatar size="lg"' });
      return `Avatar in Leading: ${labels.slice(0, 6).join(" · ")}; Size › Large writes size="lg" on the nested Avatar`;
    },
  },
  {
    id: "IN-13", feature: "Reset all overrides on an owner resets its nested instance too, in one ⌘Z", wp: "GĐ4 M3",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-row", { frame: FRAME });
      const reset = page.locator("#studio-right").getByRole("button", { name: "Reset all overrides" });
      await reset.waitFor({ state: "visible", timeout: 5000 });
      await reset.click();
      await until(async () => /<ListItem data-e2e="inst-row" title="Ava Tran" leading=\{<Avatar alt="Ava Tran" \/>\} \/>/.test(await ctx.text()), { message: "selected and the nested size removed together" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => /title="Ava Tran" selected leading=\{<Avatar alt="Ava Tran" size="sm" \/>\}/.test(await ctx.text()), { message: "one ⌘Z brings both back" });
      return "ListItem selected + nested Avatar size reset in one edit → one ⌘Z restores both";
    },
  },
  {
    id: "IN-14", feature: "Width › Fill container wraps a Badge in a Stack it fills; the Badge stays selected; Hug takes the Stack away; ⌘Z", wp: "GĐ4 M4",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-badge", { frame: FRAME });
      await sizeChoice(page, "width", "Fill container");
      const wrapped = /<Stack direction="row" fillChildren width="fill">\s*<Badge data-e2e="inst-badge"/;
      await until(async () => wrapped.test(await ctx.text()), { message: 'the Badge in <Stack direction="row" fillChildren width="fill">' });
      await until(async () => (await page.locator("#studio-right h2").first().innerText().catch(() => "")).trim() === "Badge", { message: "the Badge still selected" });
      await until(async () => (await sizeText(page, "width")) === "Fill", { message: "W reads Fill" });
      await sizeChoice(page, "width", "Hug contents");
      const back = /<Badge data-e2e="inst-badge" leadingIcon leading="icon-heart-line">New<\/Badge>\n\s*<List/;
      await until(async () => { const text = await ctx.text(); return back.test(text) && !/fillChildren width="fill"/.test(text); }, { message: "the Stack gone, the Badge where it was" });
      await until(async () => (await page.locator("#studio-right h2").first().innerText().catch(() => "")).trim() === "Badge", { message: "the Badge selected after Hug" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => wrapped.test(await ctx.text()), { message: "⌘Z puts the Stack back" });
      await until(async () => (await page.locator("#studio-right h2").first().innerText().catch(() => "")).trim() === "Badge", { message: "the Badge selected inside it" });
      return "W › Fill container → <Stack direction=\"row\" fillChildren width=\"fill\"> around the Badge (Badge selected) → Hug → Stack gone → ⌘Z → back";
    },
  },
  {
    id: "IN-15", feature: "Width typed in px wraps a Button in a Stack that size; a second size edits that Stack; Fill makes it fill", wp: "GĐ4 M4",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-button", { frame: FRAME });
      const typeWidth = async (value) => {
        const input = sizeField(page, "width").locator("input");
        await input.click();
        await input.fill(value);
        await input.press("Enter");
      };
      await sizeField(page, "width").waitFor({ state: "visible", timeout: 5000 });
      await typeWidth("200");
      await until(async () => /<Stack direction="row" fillChildren width=\{200\}>\s*<Button data-e2e="inst-button"/.test(await ctx.text()), { message: "the Button in a Stack 200 wide" });
      await until(async () => (await sizeText(page, "width")) === "200", { message: "W reads 200" });
      await typeWidth("240");
      await until(async () => /<Stack direction="row" fillChildren width=\{240\}>\s*<Button data-e2e="inst-button"/.test(await ctx.text()), { message: "the same Stack 240 wide" });
      if ((await ctx.text()).match(/fillChildren/g)?.length !== 1) throw new Error("a second Stack");
      await sizeChoice(page, "width", "Fill container");
      await until(async () => /<Stack direction="row" fillChildren width="fill">\s*<Button data-e2e="inst-button"/.test(await ctx.text()), { message: "its Stack fills" });
      return "W 200 → <Stack direction=\"row\" fillChildren width={200}> → 240 edits it → Fill → width=\"fill\"";
    },
  },
  {
    id: "IN-16", feature: "A Badge in its Stack: Layers show one Badge row; ⌘D copies it with its Stack; ⌫ removes it with its Stack; ↑ moves both", wp: "GĐ4 M4",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-badge", { frame: FRAME });
      await sizeChoice(page, "width", "Fill container");
      const wraps = async () => ((await ctx.text()).match(/fillChildren width="fill">\s*<Badge data-e2e="inst-badge"/g) ?? []).length;
      await until(async () => (await wraps()) === 1, { message: "the Badge in its Stack" });
      // Layers: the Stack folds into the Badge's row (selected), right under the EmptyState.
      const row = page.locator('#studio-left-panel-layers .studio-layers__row[data-wrapped="true"]');
      await until(async () => (await row.count()) === 1 && (await row.getAttribute("aria-selected")) === "true", { message: "one selected Badge row standing for its Stack" });
      const above = await row.evaluate((el) => el.previousElementSibling?.querySelector(".studio-layers__name")?.textContent?.trim());
      const name = (await row.locator(".studio-layers__name").innerText()).trim();
      if (name !== "Badge" || above !== "EmptyState") throw new Error(`the row reads ${name} under ${above}`);
      const selected = () => until(async () => (await page.locator("#studio-right h2").first().innerText().catch(() => "")).trim() === "Badge", { message: "the Badge selected" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyD");
      await until(async () => (await wraps()) === 2, { message: "⌘D: two Stacks, each with a Badge" });
      await selected();
      // The Layers rebuild after the canvas re-renders: wait for the copy's row before going on.
      await until(async () => (await row.count()) === 2, { message: "two wrapped rows in Layers" });
      await sleep(300);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Backspace");
      await until(async () => (await wraps()) === 1 && ((await ctx.text()).match(/fillChildren/g) ?? []).length === 1, { message: "⌫: the copy gone with its Stack" });
      // The Layers rebuild after the canvas re-renders: the copy's row goes a moment after the source.
      await until(async () => (await row.count()) === 1, { message: "one wrapped row left in Layers" });
      await row.click();
      await selected();
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ArrowUp");
      await until(async () => /fillChildren width="fill">\s*<Badge data-e2e="inst-badge"[^\n]*\n\s*<\/Stack>\n\s*<EmptyState/.test(await ctx.text()), { message: "↑: the Stack and its Badge above the EmptyState" });
      await selected();
      return "one Badge row (its Stack folded) → ⌘D copies the Stack with it → ⌫ removes the copy's Stack too → ↑ moves the Stack";
    },
  },
  {
    id: "IN-17", feature: "Builder page: Detach a Badge into Zen primitives (the recipes load on first use), one ⌘Z", wp: "GĐ4 M4",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      await showLeftTab(page, "assets");
      await page.locator("#studio-left-panel-assets").getByLabel("Search components").fill("Badge");
      await page.locator(".studio-assets__row", { hasText: /^Badge/ }).first().click();
      await until(async () => /<Badge\b/.test((await pageText(page, id)) ?? ""), { message: "the Badge" });
      await sleep(400);
      await clickNamed(page, id, "Badge");
      const detach = page.locator("#studio-right").getByRole("button", { name: /^Detach instance/ });
      await detach.waitFor({ state: "visible", timeout: 5000 });
      await until(async () => !(await detach.isDisabled()), { message: "Detach ready (its plan read in the browser)" });
      await detach.click();
      await until(async () => { const text = (await pageText(page, id)) ?? ""; return !/<Badge\b/.test(text) && /zen-detached: Badge/.test(text); }, { message: "the Badge detached into primitives" });
      const text = (await pageText(page, id)) ?? "";
      const root = /zen-detached: Badge[^\n]*\n\s*<(\w+)/.exec(text)?.[1] ?? "?";
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => /<Badge\b/.test((await pageText(page, id)) ?? ""), { message: "⌘Z brings the Badge back" });
      return `Badge → <${root}> + zen-detached mark → ⌘Z → Badge`;
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
  {
    id: "IN-18", feature: "An unset object prop (EmptyState secondaryAction): + writes a starting object, then its fields edit", wp: "backlog 2026-10-07",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-empty", { frame: FRAME });
      await page.locator("#studio-right").getByRole("button", { name: "Add secondary action" }).click();
      await expectSource(ctx, "inst-empty", (el) => /label: "Secondary action"/.test(el.attr("secondaryAction") ?? ""), 'secondaryAction={{ label: "Secondary action" }}');
      const group = page.locator("#studio-right").getByRole("group", { name: /^Secondary action/ });
      await group.waitFor({ state: "visible", timeout: 5000 });
      const input = group.locator('[data-prop="label"] input').first();
      await input.fill("Learn more");
      await input.press("Enter");
      const done = await expectSource(ctx, "inst-empty", (el) => /label: "Learn more"/.test(el.attr("secondaryAction") ?? ""), "the label edited in Object properties");
      return `secondaryAction=${done.attr("secondaryAction")}`;
    },
  },
  {
    id: "IN-19", feature: "options={views} held by a same-file const: its items edit there, with where the const is written", wp: "backlog 2026-10-07",
    async run(ctx) {
      const page = await freshSelect(ctx, "const-views", { frame: 8 });
      const panel = page.locator("#studio-right");
      await until(async () => (await panel.innerText()).includes("Written in const views"), { message: "the const note" });
      if (await panel.getByRole("button", { name: /^Remove / }).count()) throw new Error("a const's items offer Remove (item ops edit lists written in place only)");
      const item = panel.getByRole("group", { name: /^Options · 2/ });
      const input = item.locator('[data-prop="label"] input').first();
      await input.fill("Kanban");
      await input.press("Enter");
      await until(async () => /\{ id: "board", label: "Kanban" \}/.test(await ctx.text()), { message: "views[1].label in the const" });
      return 'const views[1].label → "Kanban"';
    },
  },
];
