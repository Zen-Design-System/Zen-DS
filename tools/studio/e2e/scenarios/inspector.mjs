// Inspector rows: every kind of property control writes the source it says, one undo step at a time.
import { element, locOf } from "../lib/source.mjs";
import { clickLoc, focusFrame, inspectorRow, rectOf, sleep, statusText, until } from "../lib/studio.mjs";

const at = async (ctx, id, index = 0) => locOf(await ctx.text(), id, index).loc;
const read = async (ctx, id, index = 0, file = ctx.file) => element((await ctx.api.source(file)).content, file, id, index);

/** Fresh fixture, Studio re-rendered, frame `frame` on screen, element `id` selected. */
export async function freshSelect(ctx, id, { frame = 0, file = ctx.file, reload = false, position = "center" } = {}) {
  const seed = await ctx.reseed();
  const { page } = await ctx.studio();
  // `reload`: start from a page load instead of a hot update (rows that test a feature, not HMR, when HMR breaks it).
  if (reload) await page.reload({ waitUntil: "domcontentloaded" });
  await waitSeed(page, seed);
  const loc = async () => locOf((await ctx.api.source(file)).content, id).loc;
  await until(async () => rectOf(page, file, await loc()), { message: `${id} rendered after the reseed` });
  await focusFrame(page, frame);
  const target = await loc();
  await clickLoc(page, file, target, { position });
  await waitInspector(page, file, target);
  return page;
}

/** Waits until the Inspector shows file:loc read from the source ("Used in <file>:<line>", nothing still loading). */
export async function waitInspector(page, file, loc) {
  const where = `${file.split("/").pop()}:${loc.split(":")[0]}`;
  await until(async () => {
    // "Used in" renders the file and ":<line>" as two elements: join them before comparing.
    const text = (await page.locator("#studio-right").innerText()).replace(/\s+:/g, ":");
    return text.includes(where) && !/Reading the source/i.test(text);
  }, { message: `the Inspector to show ${where}` });
  await sleep(150);
}

/** Waits until the canvas renders the fixture of reseed `seed` (the old DOM shares its locs, so clicks would miss). */
export async function waitSeed(page, seed) {
  try {
    await page.waitForFunction((text) => document.body.innerText.includes(text), `Seed ${seed}`, { timeout: 5000 });
  } catch {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction((text) => document.body.innerText.includes(text), `Seed ${seed}`, { timeout: 30_000 });
  }
}

/** Opens the select in an Inspector row and picks `label`. */
/** `label`: the option's whole name, or a RegExp (scale options read "md · 16", ScaleField). */
export async function pickOption(page, prop, label) {
  await inspectorRow(page, prop).locator("button").first().click();
  await page.getByRole("option", { name: label, exact: typeof label === "string" }).click();
}

/** Polls the source until `check(element)` holds; returns the element. */
export async function expectSource(ctx, id, check, message, { index = 0, file = ctx.file } = {}) {
  return until(async () => {
    const el = await read(ctx, id, index, file);
    return check(el) ? el : null;
  }, { message });
}

export const rows = [
  {
    id: "I-01", feature: "Variant (enum) select writes the prop", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      await pickOption(page, "level", "Secondary");
      await expectSource(ctx, "btn-a", (el) => el.attr("level") === "secondary", "level=secondary in the source");
      return "level primary → secondary";
    },
  },
  {
    id: "I-02", feature: "Boolean switch writes / removes the prop", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      const sw = inspectorRow(page, "disabled").getByRole("switch");
      await sw.click();
      await expectSource(ctx, "btn-a", (el) => el.attr("disabled") !== undefined, "disabled written");
      await sleep(300);
      await inspectorRow(page, "disabled").getByRole("switch").click();
      await expectSource(ctx, "btn-a", (el) => el.attr("disabled") === undefined, "disabled removed again");
      return "on → disabled written, off → removed";
    },
  },
  {
    id: "I-03", feature: "Two quick toggles in a row both land (no stale refusal)", wp: "WP-A",
    async run(ctx) {
      const page = await freshSelect(ctx, "check");
      const sw = () => inspectorRow(page, "checked").getByRole("switch");
      await sw().click();
      await sw().click();
      await sleep(1200);
      const el = await read(ctx, "check");
      const status = await statusText(page);
      const on = el.attr("checked") ?? el.attr("defaultChecked");
      if (/changed since|stale|409/i.test(status)) throw new Error(`refused: ${status.slice(0, 120)}`);
      if (on !== undefined && on !== "{false}") throw new Error(`after on+off the source still has ${on === "true" || on === "" ? "the prop on" : on}`);
      return "on then off: back to unset, no refusal";
    },
  },
  {
    id: "I-04", feature: "Uncontrolled boolean edits the initial state (defaultChecked), never locks it", wp: "keep-behaviour",
    async run(ctx) {
      const page = await freshSelect(ctx, "check");
      await inspectorRow(page, "checked").getByRole("switch").click();
      const el = await expectSource(ctx, "check", (e) => e.attr("checked") !== undefined || e.attr("defaultChecked") !== undefined, "a checked state written");
      if (el.attr("checked") !== undefined) throw new Error("wrote `checked` (locks the Checkbox) instead of defaultChecked");
      return "defaultChecked written";
    },
  },
  {
    id: "I-05", feature: "Text prop field writes the string", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "check");
      const input = inspectorRow(page, "label").locator("input").first();
      await input.fill("Keep me signed in");
      await input.press("Enter");
      await expectSource(ctx, "check", (el) => el.attr("label") === "Keep me signed in", "label written");
      return "label written";
    },
  },
  {
    id: "I-06", feature: "Layout: gap token select writes the gap", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      await page.keyboard.press("Escape");
      await until(async () => (await inspectorRow(page, "gap").count()) > 0, { message: "the Stack's gap row" });
      await pickOption(page, "gap", /^lg · /);
      await expectSource(ctx, "row", (el) => el.attr("gap") === "lg", "gap=lg on the row Stack");
      return "gap sm → lg";
    },
  },
  {
    id: "I-07", feature: "Layout: direction buttons write the direction", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      await page.keyboard.press("Escape");
      await inspectorRow(page, "direction").getByRole("button", { name: "Vertical" }).click();
      await expectSource(ctx, "row", (el) => el.attr("direction") === undefined || el.attr("direction") === "column", "direction column");
      return "row → column";
    },
  },
  {
    id: "I-15", feature: "ScaleField: token + px, held ↑ is one edit, ⌫ resets", wp: "WP-D",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      await page.keyboard.press("Escape");
      await until(async () => (await inspectorRow(page, "gap").count()) > 0, { message: "the Stack's gap row" });
      const trigger = inspectorRow(page, "gap").locator("button").first();
      if (!/^sm · \d+/.test((await trigger.innerText()).trim())) throw new Error(`gap reads "${(await trigger.innerText()).trim()}", not "sm · <px>"`);
      // Held: two key-downs (the second repeats), one release → sm → md → lg in one write.
      await trigger.focus();
      await page.keyboard.down("ArrowUp");
      await page.keyboard.down("ArrowUp");
      await page.keyboard.up("ArrowUp");
      await expectSource(ctx, "row", (el) => el.attr("gap") === "lg", "gap=lg after one held ↑");
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await expectSource(ctx, "row", (el) => el.attr("gap") === "sm", "one ⌘Z back to sm (one edit, not two)");
      // The field reads the undone value before ⌫, as a person sees it change first: a ⌫ planned from the element the
      // Inspector read before the undo is refused as stale (BACKLOG I-15, fixed 2026-10-07).
      await until(async () => /^sm · \d+/.test((await inspectorRow(page, "gap").locator("button").first().innerText()).trim()), { message: 'the gap field back to "sm · …"' });
      await trigger.focus();
      await page.keyboard.press("Backspace");
      await expectSource(ctx, "row", (el) => el.attr("gap") === undefined, "⌫ removes gap");
      if (!(await inspectorRow(page, "gap").count())) throw new Error("the layer went away with ⌫");
      return "sm · px; held ↑ → lg in one undo step; ⌫ reset";
    },
  },
  {
    id: "I-08", feature: "⌘Z undoes an Inspector edit, ⇧⌘Z redoes it", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      await pickOption(page, "level", "Tertiary");
      await expectSource(ctx, "btn-a", (el) => el.attr("level") === "tertiary", "the edit");
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await expectSource(ctx, "btn-a", (el) => el.attr("level") === "primary", "undo back to primary");
      await page.keyboard.press("ControlOrMeta+Shift+KeyZ");
      await expectSource(ctx, "btn-a", (el) => el.attr("level") === "tertiary", "redo to tertiary");
      return "edit → undo → redo";
    },
  },
  {
    id: "I-09", feature: "State-bound prop edits the useState initializer", wp: "keep-behaviour",
    async run(ctx) {
      const page = await freshSelect(ctx, "bound", { frame: 1 });
      await pickOption(page, "size", "Small");
      await until(async () => /useState<"sm" \| "md">\("sm"\)/.test(await ctx.text()), { message: 'useState("sm")' });
      const el = await read(ctx, "bound");
      if (el.attr("size") !== "{size}") throw new Error(`the binding was replaced: size=${el.attr("size")}`);
      return 'useState("md") → useState("sm"), binding kept';
    },
  },
  {
    id: "I-10", feature: ".map-bound prop edits the data item at its source", wp: "WP-C",
    async run(ctx) {
      const page = await freshSelect(ctx, "crew-row", { frame: 1 });
      const input = inspectorRow(page, "title").locator("input").first();
      if (!(await input.count()) || !(await input.isEditable())) throw new Error(`title is read-only (${(await inspectorRow(page, "title").innerText()).replace(/\s+/g, " ").slice(0, 60)})`);
      await input.fill("Ava T.");
      await input.press("Enter");
      await until(async () => (await ctx.text()).includes('name: "Ava T."'), { message: "crew[0].name edited" });
      return "crew[0].name edited at the const";
    },
  },
  {
    id: "I-11", feature: "Conditional prop edits to a fixed value from its control (read-only when it reads state)", wp: "WP-C",
    async run(ctx) {
      const rowText = async (page) => (await inspectorRow(page, "level").innerText()).replace(/\s+/g, " ").slice(0, 60);
      // A condition on state stays bound: a fixed value would stop the button reacting (keep-behaviour rule), so the row
      // shows what it renders in a field's frame with no control.
      let page = await freshSelect(ctx, "cond", { frame: 1 });
      if (await inspectorRow(page, "level").locator("button, input, select, [role=radio], [role=combobox]").count()) throw new Error(`an editable control on a state condition (${await rowText(page)})`);
      // A condition on a const: the control shows what it renders (ƒ after the label) and a pick writes a fixed value
      // (Design panel UI3, 2026-10-06: no "Set fixed value" step).
      page = await freshSelect(ctx, "cond-const", { frame: 1 });
      if (!(await inspectorRow(page, "level").locator(".studio-inspector__bound-mark").count())) throw new Error(`no ƒ binding mark (${await rowText(page)})`);
      await pickOption(page, "level", "Tertiary");
      await expectSource(ctx, "cond-const", (el) => el.attr("level") === "tertiary", 'level="tertiary" (a fixed value)');
      return "state condition read-only; const condition fixed from its control";
    },
  },
  {
    id: "I-14", feature: "Properties follow Figma: variants, then booleans; Leading-Icon on shows Leading-Icon-Src", wp: "WP-E",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      const labels = await page.locator("#studio-right [data-prop]").evaluateAll((rows) => rows.map((row) => row.querySelector(".studio-inspector__label, label, [class*=label]")?.textContent?.trim() ?? row.getAttribute("data-prop")));
      const at = (label) => labels.indexOf(label);
      if (!(at("Size") >= 0 && at("Level") > at("Size") && at("Leading-Icon") > at("State"))) throw new Error(`rows: ${labels.slice(0, 12).join(", ")}`);
      if (labels.includes("Leading-Icon-Src")) throw new Error("Leading-Icon-Src shows while Leading-Icon is off");
      const toggle = page.locator("#studio-right [data-prop]").filter({ hasText: /^Leading-Icon$/ }).getByRole("switch").first();
      await toggle.click();
      // GĐ4 M2: the switch starts from the swap's default icon in Figma.
      await expectSource(ctx, "btn-a", (el) => el.attr("startIcon") === "icon-plus-line", "startIcon written (Figma's default, icon-plus-line)");
      await until(async () => (await page.locator("#studio-right [data-prop]").filter({ hasText: "Leading-Icon-Src" }).count()) > 0, { message: "the Leading-Icon-Src row" });
      return "Figma order; Leading-Icon writes startIcon and shows Leading-Icon-Src";
    },
  },
  {
    id: "I-12", feature: "Mixed properties: one variant change on two selected layers", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      await clickLoc(page, ctx.file, await at(ctx, "btn-b"), { modifiers: ["Shift"] });
      await until(async () => (await inspectorRow(page, "level").count()) > 0, { message: "a shared level row" });
      await pickOption(page, "level", "Tertiary");
      await expectSource(ctx, "btn-a", (el) => el.attr("level") === "tertiary", "btn-a tertiary");
      await expectSource(ctx, "btn-b", (el) => el.attr("level") === "tertiary", "btn-b tertiary");
      return "both buttons → tertiary";
    },
  },
  {
    id: "I-16", feature: "Mixed properties: a text prop typed once goes to both selected layers", wp: "backlog 2026-10-07",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-row", { frame: 6 });
      await clickLoc(page, ctx.file, await at(ctx, "inst-click-row"), { modifiers: ["Shift"] });
      const box = page.locator("#studio-right").getByRole("textbox", { name: / for 2 layers$/ }).first();
      await until(() => box.count(), { message: "a text row for the two ListItems" });
      const prop = (await box.getAttribute("aria-label")).replace(/ for 2 layers$/, "");
      await box.fill("/inbox");
      await box.press("Enter");
      await expectSource(ctx, "inst-row", (el) => el.attr(prop) === "/inbox", `inst-row ${prop}="/inbox"`);
      await expectSource(ctx, "inst-click-row", (el) => el.attr(prop) === "/inbox", `inst-click-row ${prop}="/inbox"`);
      return `${prop} → "/inbox" on both rows`;
    },
  },
  {
    id: "I-13", feature: "Mixed properties outside an example page (shared component file)", wp: "WP-B",
    async run(ctx) {
      const page = await freshSelect(ctx, "save-a", { frame: 4, file: ctx.saveFile });
      const b = locOf((await ctx.api.source(ctx.saveFile)).content, "save-b").loc;
      await clickLoc(page, ctx.saveFile, b, { modifiers: ["Shift"] });
      await until(async () => (await inspectorRow(page, "level").count()) > 0, { message: "a shared level row" });
      await pickOption(page, "level", "Primary");
      try {
        await expectSource(ctx, "save-a", (el) => el.attr("level") === "primary", "save-a primary", { file: ctx.saveFile });
      } catch (error) {
        throw new Error(`${error.message} · status: ${(await statusText(page)).slice(0, 100)}`);
      } finally {
        await ctx.api.discard([ctx.saveFile]).catch(() => {});
      }
      return "both buttons → primary";
    },
  },
  {
    id: "I-30", feature: "Mixed properties: a number prop (Heading level) shows Mixed and one pick goes to both layers", wp: "backlog 2026-10-08",
    async run(ctx) {
      const page = await freshSelect(ctx, "h-a", { frame: 9 });
      await clickLoc(page, ctx.file, await at(ctx, "h-b"), { modifiers: ["Shift"] });
      const row = inspectorRow(page, "level");
      await until(async () => /Mixed/.test(await row.innerText().catch(() => "")), { message: "a Mixed level row for the two Headings" });
      await pickOption(page, "level", "2");
      await expectSource(ctx, "h-a", (el) => el.attr("level") === "{2}", "h-a level={2}");
      await expectSource(ctx, "h-b", (el) => el.attr("level") === "{2}", "h-b level={2}");
      return "level Mixed (3, 4) → 2 on both Headings";
    },
  },
];
