// Inspector rows: every kind of property control writes the source it says, one undo step at a time.
import { element, locOf } from "../lib/source.mjs";
import { clickLoc, focusFrame, inspectorRow, openCodeProperties, openPropertyGroup, ownerOfLayer, rectOf, showDesignTab, showLeftTab, sleep, statusText, until } from "../lib/studio.mjs";
import { selectedName } from "./builder.mjs";
import { pageFromTemplate } from "./starters.mjs";
import { codeWordsIn } from "../../../../src/platform/studio/words.ts";
import { optionLabel } from "../../../../src/platform/studio/inspector/controls/scale.ts";
import { newPage, seededPage } from "./builder.mjs";

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
  await until(async () => rectOf(page, file, await loc()), { message: `${id} rendered after the reseed` }).catch(async (error) => {
    // What the canvas shows from that file instead (stale locs after a discard, or nothing at all).
    const shown = await page.evaluate((prefix) => [...document.querySelectorAll(`[data-zen-src^="${prefix}"]`)].map((el) => el.getAttribute("data-zen-src").slice(prefix.length)), `${file}:`).catch(() => []);
    throw new Error(`${error.message} (want ${await loc()}; the canvas has ${shown.length ? shown.slice(0, 6).join(" ") : "nothing"} from ${file.split("/").pop()})`);
  });
  await focusFrame(page, frame);
  const target = await loc();
  await clickLoc(page, file, target, { position });
  await waitInspector(page, file, target);
  return page;
}

/** Waits until the Inspector reads file:loc (its header's data-inspector-src, same file and line) and nothing is still loading. */
export async function waitInspector(page, file, loc) {
  const where = `${file.split("/").pop()}:${loc.split(":")[0]}`;
  await until(async () => page.evaluate(([wantFile, wantLine]) => {
    const panel = document.querySelector("#studio-right");
    const src = panel?.querySelector("[data-inspector-src]")?.getAttribute("data-inspector-src") ?? "";
    const match = /^(.*):(\d+):\d+$/.exec(src);
    return Boolean(match && match[1] === wantFile && match[2] === wantLine && ![...(panel?.querySelectorAll(".studio-inspector__empty") ?? [])].some((el) => /^Loading…$/.test(el.textContent?.trim() ?? "")));
  }, [file, loc.split(":")[0]]), { message: `the Inspector to show ${where}` });
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

/** Opens the select in an Inspector row and picks `label`: the option's whole name, or a RegExp (scaleStep). */
/** A ScaleField step by its token, under its Figma name: the row reads the name, then the pixels it measures ("Medium … 16px"). */
const STEP_NAMES = { none: "None", "3xs": "3XSmall", "2xs": "2XSmall", xs: "XSmall", sm: "Small", md: "Medium", lg: "Large", xl: "XLarge", "2xl": "2XLarge", "3xl": "3XLarge", "4xl": "4XLarge" };
export const scaleStep = (key, scale = "gap") => new RegExp(`^${(scale === "radius" && key === "md" ? "Base" : STEP_NAMES[key]) ?? key}\\s*\\d+(\\.\\d)?px$`);

export async function pickOption(page, prop, label) {
  const row = inspectorRow(page, prop);
  // A code value ("secondary", "md") reads as its option label ("Secondary", "Medium": inspector/controls/scale.ts optionLabel).
  const name = typeof label === "string" ? optionLabel(label) : label;
  // EnumControl (PropField.tsx) draws a Segmented when every option fits whole at the panel's width, else a select.
  const segmented = row.locator(".zen-segmented");
  if (await segmented.count()) {
    await segmented.getByRole("button", { name, exact: typeof name === "string" }).click();
    return;
  }
  await row.locator("button").first().click();
  await page.getByRole("option", { name, exact: typeof name === "string" }).click();
}

/** Polls the source until `check(element)` holds; returns the element. */
export async function expectSource(ctx, id, check, message, { index = 0, file = ctx.file } = {}) {
  return until(async () => {
    const el = await read(ctx, id, index, file);
    return check(el) ? el : null;
  }, { message });
}

/** ⌘-click (Figma's deep select) at the centre of the first element matching `selector` in a page's Screen. */
async function deepSelectIn(page, selector) {
  const box = await page.locator(`.studio-frame ${selector}`).first().boundingBox();
  if (!box) throw new Error(`no ${selector} on the canvas`);
  await page.keyboard.down("Meta");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.up("Meta");
  await sleep(500);
  await ownerOfLayer(page);
}

/** The Properties groups as shown: "content:true look:true behavior:false advanced:false". */
const groupStates = (page) => page.locator("#studio-right [data-property-group]").evaluateAll((els) => els.map((el) => `${el.getAttribute("data-property-group")}:${el.getAttribute("data-open")}`).join(" "));
const rowIn = (page, group, prop) => page.locator(`#studio-right [data-property-group="${group}"] [data-prop="${prop}"]`).first();

export const rows = [
  {
    // UX review 2026-10-27 §2.8 (screenshot 15): the Metric card's 18 flat rows, now Content · Look · Behavior · Advanced.
    id: "I-35", feature: "Instance properties in four groups: a Metric card from the Dashboard template shows Content · Look · Behavior · Advanced in that order, Trend under Content, Type and Size under Look, Behavior and Advanced folded (Animate and Heading level inside once opened), and an unset text field reads a placeholder", wp: "ux review §7.7 2026-10-27", timeout: 60_000,
    async run(ctx) {
      try {
        const { page } = await pageFromTemplate(ctx, "Dashboard");
        await deepSelectIn(page, ".zen-metric-card");
        await until(async () => (await selectedName(page)) === "MetricCard", { message: "the MetricCard selected" });
        await until(async () => /^content:true look:true behavior:false advanced:false$/.test(await groupStates(page)), { message: `the four groups (${await groupStates(page)})` });
        for (const [group, prop] of [["content", "trend"], ["look", "type"], ["look", "size"]]) if (!(await rowIn(page, group, prop).count())) throw new Error(`${prop} is not under ${group}`);
        if (await inspectorRow(page, "animate").count()) throw new Error("Animate shows while Behavior is folded");
        await openPropertyGroup(page, "animate");
        await rowIn(page, "behavior", "animate").waitFor({ state: "visible", timeout: 5000 });
        await openPropertyGroup(page, "headingLevel");
        await rowIn(page, "advanced", "headingLevel").waitFor({ state: "visible", timeout: 5000 });
        const placeholder = await rowIn(page, "advanced", "currency").locator("input").first().getAttribute("placeholder");
        if (placeholder !== "Not set") throw new Error(`the empty Currency field reads "${placeholder}"`);
        // Opening a group is remembered for the session: the next instance of the kind shows it open.
        await page.keyboard.press("Escape");
        await deepSelectIn(page, ".zen-metric-card");
        await until(async () => (await selectedName(page)) === "MetricCard", { message: "a MetricCard selected again" });
        await until(async () => /behavior:true advanced:true/.test(await groupStates(page)), { message: "Behavior and Advanced stay open" });
        return "Content · Look · Behavior (folded) · Advanced (folded) · Trend/Type/Size placed · Animate, Heading level on opening · Currency placeholder Not set";
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "I-36", feature: "Grouped properties round-trip (Button): Leading / Trailing icon and Text under Content, Appearance, Level and Size under Look; Size › Small still writes size=\"sm\"; Disabled under the folded Behavior writes and removes disabled", wp: "ux review §7.7 2026-10-27",
    async run(ctx) {
      const page = await freshSelect(ctx, "inst-button", { frame: 6 });
      await until(async () => /^content:true look:true behavior:false$/.test(await groupStates(page)), { message: `Content, Look, Behavior (${await groupStates(page)})` });
      for (const [group, prop] of [["content", "startIcon"], ["content", "endIcon"], ["look", "appearance"], ["look", "level"], ["look", "size"]]) if (!(await rowIn(page, group, prop).count())) throw new Error(`${prop} is not under ${group}`);
      await pickOption(page, "size", "Small");
      await expectSource(ctx, "inst-button", (el) => el.attr("size") === "sm", 'size="sm" written from the Look group');
      await openPropertyGroup(page, "disabled");
      await rowIn(page, "behavior", "disabled").getByRole("switch").click();
      await expectSource(ctx, "inst-button", (el) => el.attr("disabled") !== undefined, "disabled written from the Behavior group");
      await sleep(300);
      await rowIn(page, "behavior", "disabled").getByRole("switch").click();
      await expectSource(ctx, "inst-button", (el) => el.attr("disabled") === undefined, "disabled removed again");
      return "Content: icons + text · Look: appearance, level, size → sm · Behavior: disabled on / off";
    },
  },
  {
    // Screenshot 09: the Table's flat form (Accessible name, Selected ids, Current row id…) in groups and design words.
    id: "I-37", feature: "Grouped properties without Figma groups (Table): Caption and Columns under Content, Selectable / Editable / Sort under Behavior (folded), the screen-reader name under Advanced as \"Name (screen readers)\"; no \"Selected ids\" or \"Accessible name\" on the panel; Selectable writes and removes selectable", wp: "ux review §7.6–7 2026-10-27",
    async run(ctx) {
      const page = await freshSelect(ctx, "table", { frame: 10, position: { dx: 4, dy: 4 } });
      // The groups and their order; whether Behavior is folded depends on what a row before opened (openGroups is the
      // session's), so the open flags are not asserted here (I-35 checks folding on a fresh page).
      await until(async () => /^content:(?:true|false) behavior:(?:true|false) advanced:(?:true|false)$/.test(await groupStates(page)), { message: `Content, Behavior, Advanced (${await groupStates(page)})` });
      if (!(await rowIn(page, "content", "caption").count())) throw new Error("caption is not under content");
      // The columns are written in place: their block (ObjectProperties, "Columns · 1 Task") sits in Content too.
      if (!(await page.locator('#studio-right [data-property-group="content"]').getByText(/^Columns/).count())) throw new Error("the Columns block is not under content");
      const text = await page.locator("#studio-right").innerText();
      for (const words of ["Selected ids", "Accessible name", "Current row id"]) if (text.includes(words)) throw new Error(`"${words}" is still on the panel`);
      await openPropertyGroup(page, "selectable");
      for (const prop of ["selectable", "editable", "sort"]) if (!(await rowIn(page, "behavior", prop).count())) throw new Error(`${prop} is not under Behavior`);
      await openPropertyGroup(page, "aria-label");
      const label = await rowIn(page, "advanced", "aria-label").locator(".studio-inspector__row-label, .zen-input-field__label").first().innerText().catch(() => "");
      if (!/Name \(screen readers\)/.test(label) && !/Name \(screen readers\)/.test(await rowIn(page, "advanced", "aria-label").innerText())) throw new Error(`the name row reads "${label}"`);
      await rowIn(page, "behavior", "selectable").getByRole("switch").click();
      await expectSource(ctx, "table", (el) => el.attr("selectable") !== undefined, "selectable written");
      await sleep(300);
      await rowIn(page, "behavior", "selectable").getByRole("switch").click();
      await expectSource(ctx, "table", (el) => el.attr("selectable") === undefined, "selectable removed again");
      return "Content: caption, columns · Behavior: selectable, editable, sort · Advanced: Name (screen readers) · selectable on / off";
    },
  },
  {
    // §2.7 / §6: the file path left the canvas kicker and the Page section; the Data-Row panel speaks design words.
    id: "I-38", feature: "Design words on a page you made (UX review 2026-10-27 §6): the board's kicker and the Page section name no file path, and read \"A page you made · saved in this browser and on this computer\"", wp: "ux review §7.6 2026-10-27", timeout: 60_000,
    async run(ctx) {
      try {
        const { page } = await pageFromTemplate(ctx, "Dashboard");
        const kicker = (await page.locator(".studio-builder-board .studio-board__title p").first().innerText()).trim();
        if (!/^A page you made · /.test(kicker) || /[/\\]|\.zen-studio|\.qa\b|pages-\d/.test(kicker)) throw new Error(`the kicker reads "${kicker}"`);
        await page.keyboard.press("Escape");
        await page.locator(".studio-viewport").click({ position: { x: 8, y: 8 } }).catch(() => undefined);
        const panel = page.locator("#studio-right");
        await until(async () => /A page you made, saved in this browser/.test(await panel.innerText()), { message: "the Page section's note" });
        const note = await panel.innerText();
        if (/[/\\]pages|\.zen-studio|\.qa\b|pages-\d/.test(note)) throw new Error(`the Page section names a path: ${note.match(/.{0,40}(?:pages|\.zen-studio|\.qa).{0,40}/)?.[0]}`);
        return `kicker "${kicker}" · Page section without a path`;
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "I-32", feature: "Design tab with nothing selected on a page you made: one Page section (Name, Mobile OS, Background, Project; Export is the top bar's, not repeated here), Preview modes as label · value rows, Local styles with an Edit in Figma button (UX review 2026-10-27 §2.10)", wp: "ux review 2026-10-27 §7.9",
    async run(ctx) {
      const { page } = await newPage(ctx);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await showDesignTab(page);
      await page.locator("#studio-right").getByLabel("Page name").waitFor({ state: "visible", timeout: 5000 });
      const seen = await page.evaluate(() => {
        const panel = document.querySelector("#studio-right");
        const sectionNamed = (name) => [...panel.querySelectorAll("section")].find((section) => section.querySelector("h2, h3")?.textContent.trim() === name) ?? null;
        const pageSection = sectionNamed("Page");
        const labels = pageSection ? [...pageSection.querySelectorAll(".studio-fields__label")].map((el) => el.textContent.trim()) : [];
        const modes = sectionNamed("Preview modes");
        const rows = modes ? [...modes.querySelectorAll(".studio-inspector__row")].map((row) => [row.querySelector(".studio-inspector__row-label")?.textContent.trim() ?? "", row.querySelector(".studio-inspector__row-control")?.textContent.trim() ?? ""]) : [];
        const styles = sectionNamed("Local styles");
        return {
          pageHeadings: [...panel.querySelectorAll("h2, h3, .studio-inspector__eyebrow")].filter((el) => el.textContent.trim() === "Page").length,
          headBlocks: panel.querySelectorAll(".studio-inspector__head-block").length,
          labels,
          exportInPanel: [...panel.querySelectorAll("button")].some((el) => /^Export/.test(el.textContent.trim())),
          exportInBar: [...document.querySelectorAll(".studio-topbar button")].some((el) => el.textContent.trim() === "Export"),
          rows,
          figmaButton: styles ? [...styles.querySelectorAll("button")].map((el) => el.textContent.trim()).find((text) => /Figma/.test(text)) ?? null : null,
          stylesNote: styles?.querySelector(".studio-inspector__note")?.textContent.trim() ?? null,
        };
      });
      if (seen.pageHeadings !== 1 || seen.headBlocks !== 0) throw new Error(`${seen.pageHeadings} "Page" headings and ${seen.headBlocks} header block(s), expected one Page section and no header block`);
      for (const label of ["Name", "Mobile OS", "Background", "Project"]) if (!seen.labels.includes(label)) throw new Error(`the Page section has no "${label}" field (${seen.labels.join(", ")})`);
      if (seen.exportInPanel || !seen.exportInBar) throw new Error(`Export in the Inspector: ${seen.exportInPanel}, in the top bar: ${seen.exportInBar} (one, in the top bar)`);
      if (seen.rows.length < 6 || seen.rows.some(([label, value]) => !label || !value)) throw new Error(`Preview modes: ${seen.rows.length} rows, ${JSON.stringify(seen.rows.slice(0, 3))}`);
      if (!seen.figmaButton) throw new Error(`Local styles has no Edit in Figma button (note: ${seen.stylesNote})`);
      return `one Page section (${seen.labels.join(", ")}; Export in the top bar only) · ${seen.rows.length} mode rows · Local styles "${seen.figmaButton}"`;
    },
  },
  {
    id: "I-31", feature: "Design words on an example page too (plan criterion 7, the user 2026-10-12): after an edit the status line names the file without its line, the canvas tag and the Inspector header (\"Show code\") no file:line, notes and tooltips no code", wp: "design words 2026-10-12",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      await pickOption(page, "level", "Secondary");
      await expectSource(ctx, "btn-a", (el) => el.attr("level") === "secondary", "level=secondary in the source");
      await until(async () => /\b(?:Saved|Unsaved)\b/.test(await statusText(page)), { message: "the edit's Saved / Unsaved line" }).catch(async (error) => { throw new Error(`${error.message} (status: ${(await statusText(page)).slice(0, 160)})`); });
      const seen = await page.evaluate(() => {
        const texts = (selector) => [...document.querySelectorAll(selector)].map((el) => el.textContent ?? "");
        return {
          status: texts(".studio-inspector__status-text, .studio-inspector__status-details li"),
          tag: texts('.studio-selection__outline[data-kind="selected"] .studio-selection__tag'),
          header: texts("#studio-right .studio-inspector__src"),
          notes: texts("#studio-right .studio-inspector__note, #studio-right .studio-inspector__row-hint"),
          tips: [...document.querySelectorAll("#studio-right [title]")].map((el) => el.getAttribute("title") ?? ""),
        };
      });
      const found = Object.entries(seen).flatMap(([where, list]) => list.flatMap((text) => codeWordsIn(text).map((word) => `${where}: ${word} in "${text.slice(0, 90)}"`)));
      if (found.length) throw new Error(`code words on an example page: ${found.slice(0, 6).join(" · ")}`);
      if (seen.header.join() !== "Show code") throw new Error(`header "${seen.header.join(" | ")}"`);
      return `status "${seen.status[0]}" · tag "${seen.tag[0]}" · header "Show code" · ${seen.notes.length} notes, ${seen.tips.length} tips clean`;
    },
  },
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
      // Disabled is a behavior: its group starts folded (UX review 2026-10-27 §2.8).
      await openPropertyGroup(page, "disabled");
      const sw = inspectorRow(page, "disabled").getByRole("switch");
      await sw.click();
      await expectSource(ctx, "btn-a", (el) => el.attr("disabled") !== undefined, "disabled written");
      await sleep(300);
      await inspectorRow(page, "disabled").getByRole("switch").click();
      await expectSource(ctx, "btn-a", (el) => el.attr("disabled") === undefined, "disabled removed again");
      // What only code reads (the HTML button type) is on the Code tab, never the Design tab (user, 2026-10-17: Figma's
      // panel; §3a "code-only ones on the Code tab").
      if (await page.locator('#studio-right [data-e2e="code-properties"]').count()) throw new Error("Code properties on the Design tab");
      if (await inspectorRow(page, "type").count()) throw new Error("the button type on the Design tab");
      try {
        await openCodeProperties(page);
        await inspectorRow(page, "type").waitFor({ state: "visible", timeout: 5000 });
      } finally {
        await showDesignTab(page).catch(() => undefined);
      }
      return "on → disabled written, off → removed; Type on the Code tab";
    },
  },
  {
    id: "I-03", feature: "Two quick toggles in a row both land (no stale refusal)", wp: "WP-A",
    async run(ctx) {
      const page = await freshSelect(ctx, "check");
      await openPropertyGroup(page, "checked");
      const sw = () => inspectorRow(page, "checked").getByRole("switch");
      // The first write held a moment, as a dev server under a gate's load answers: the fixed 1.2 s read came before the
      // second write landed there (2026-10-27). Both presses must still land.
      await page.route((url) => url.pathname.endsWith("/__zen-studio/edit"), async (route) => { await sleep(800); await route.continue(); }, { times: 1 });
      await sw().click();
      await sw().click();
      const onOf = (el) => el.attr("checked") ?? el.attr("defaultChecked");
      // Both land, however long the held write takes: the source back to unset (or false).
      const el = await expectSource(ctx, "check", (candidate) => [undefined, "{false}"].includes(onOf(candidate)), "both presses in the source").catch(async (error) => {
        const on = onOf(await read(ctx, "check"));
        throw new Error(`after on+off the source still has ${on === "true" || on === "" ? "the prop on" : on} (${error.message})`);
      });
      const status = await statusText(page);
      if (/changed since|stale|409/i.test(status)) throw new Error(`refused: ${status.slice(0, 120)}`);
      if (![undefined, "{false}"].includes(onOf(el))) throw new Error(`after on+off the source has ${onOf(el)}`);
      return "on then off with the first write held: back to unset, no refusal";
    },
  },
  {
    id: "I-04", feature: "Uncontrolled boolean edits the initial state (defaultChecked), never locks it", wp: "keep-behaviour",
    async run(ctx) {
      const page = await freshSelect(ctx, "check");
      await openPropertyGroup(page, "checked");
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
      await pickOption(page, "gap", scaleStep("lg"));
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
    id: "I-15", feature: "ScaleField: token + value, held ↑ is one edit, ⌫ resets", wp: "WP-D",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      await page.keyboard.press("Escape");
      await until(async () => (await inspectorRow(page, "gap").count()) > 0, { message: "the Stack's gap row" });
      const trigger = inspectorRow(page, "gap").locator("button").first();
      // The field reads the token under its Figma name, its pixels beside the chevron (user, 2026-10-09: "token name +
      // value", one line; 2026-10-17: Figma's words).
      const smText = (await trigger.innerText()).trim();
      const px = (await inspectorRow(page, "gap").locator(".studio-scale__px").innerText()).trim();
      if (smText !== "Small" || !/^\d+(\.\d)?$/.test(px)) throw new Error(`gap reads "${smText}" "${px}", not "Small <px>" (Figma's name for sm)`);
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
      await until(async () => (await inspectorRow(page, "gap").locator("button").first().innerText()).trim() === smText, { message: `the gap field back to sm (${smText})` });
      await trigger.focus();
      await page.keyboard.press("Backspace");
      await expectSource(ctx, "row", (el) => el.attr("gap") === undefined, "⌫ removes gap");
      if (!(await inspectorRow(page, "gap").count())) throw new Error("the layer went away with ⌫");
      return `sm ${px}; held ↑ → lg in one undo step; ⌫ reset`;
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
    // Since the UX review 2026-10-27 (§2.8) the variants sit in Look in Figma's order and the layer booleans in Content,
    // read as words ("Leading icon"); the swap row (the same words, an icon picker) shows while the boolean is on.
    id: "I-14", feature: "Properties follow Figma inside their groups: Look lists Size, Level, State in Figma's order; Leading icon (Content) on writes startIcon and shows its icon picker", wp: "WP-E",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      const labels = await page.locator('#studio-right [data-property-group="look"] [data-prop]').evaluateAll((rows) => rows.map((row) => row.querySelector(".studio-inspector__label, label, [class*=label]")?.textContent?.trim() ?? row.getAttribute("data-prop")));
      const at = (label) => labels.indexOf(label);
      if (!(at("Size") >= 0 && at("Level") > at("Size") && at("State") > at("Level"))) throw new Error(`Look rows: ${labels.slice(0, 12).join(", ")}`);
      const startIcon = () => page.locator('#studio-right [data-property-group="content"] [data-prop="startIcon"]');
      if ((await startIcon().count()) !== 1) throw new Error(`${await startIcon().count()} Leading icon rows while the boolean is off (want the switch alone)`);
      await startIcon().getByRole("switch").first().click();
      // GĐ4 M2: the switch starts from the swap's default icon in Figma.
      await expectSource(ctx, "btn-a", (el) => el.attr("startIcon") === "icon-plus-line", "startIcon written (Figma's default, icon-plus-line)");
      await until(async () => (await startIcon().count()) === 2, { message: "the Leading icon picker row beside its switch" });
      return "Look: Size, Level, State in Figma order; Leading icon on writes startIcon and shows its picker";
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
  {
    id: "I-43", feature: "Colour picker in a project: Accent reads \"Accent · Primary\", \"primary\" and \"brand\" find it, the swatches paint the project's colour (the canvas's, not Zen's pink), Enter applies the one match (walk W-07/08/09)", wp: "walk §4 item 9 2026-10-30", timeout: 60_000,
    run: guarded("I-43", async (ctx, hold) => {
      const project = await e2eProject(ctx);
      const { page, id, text } = hold(await seededPage(ctx, (title) => walkPage(title, project), /Dr\. An/));
      await deepClick(page, id, "Text", 1);
      await openPropertyGroup(page, "tone").catch(() => undefined);
      const row = page.locator('#studio-right [data-prop="tone"]').first();
      await row.waitFor({ state: "visible", timeout: 5000 });
      await row.locator(".zen-select__trigger").first().click();
      const list = page.getByRole("dialog", { name: /options$/ }).or(page.locator(".zen-popover").filter({ has: page.getByPlaceholder("Search colors") })).first();
      await list.waitFor({ state: "visible", timeout: 3000 });
      const families = await list.locator(".studio-type-control__family").allInnerTexts();
      if (!families.includes("Accent · Primary")) throw new Error(`families: ${families.join(", ")}`);
      // The selected swatch (accent) paints what the canvas paints for that token.
      const selected = list.locator(".zen-popover__item.is-selected .studio-tone-swatch").first();
      const swatch = await selected.evaluate((el) => getComputedStyle(el).color);
      // The same token painted inside the canvas's Text (the project's mode there).
      const paint = await selected.evaluate((el) => el.style.color);
      const canvas = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Text"]`).nth(1).evaluate((el, color) => {
        const probe = document.createElement("span");
        probe.style.color = color;
        el.appendChild(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      }, paint);
      if (swatch !== canvas) throw new Error(`swatch ${swatch} ≠ canvas ${canvas} (${paint})`);
      const search = page.getByPlaceholder("Search colors");
      for (const word of ["primary", "brand"]) {
        await search.fill(word);
        await until(async () => (await list.locator(".zen-popover__item").count()) > 0, { message: `"${word}" finds the Accent tones` });
      }
      await search.fill("accent strongest");
      await until(async () => (await list.locator(".zen-popover__item").count()) === 1, { message: "one match for accent strongest" });
      await search.press("Enter");
      await until(async () => /<Text tone="accent-strongest">/.test(await text()), { message: 'Enter wrote tone="accent-strongest"' });
      return `Accent · Primary; swatch ${swatch} = canvas; primary/brand find Accent; Enter → accent-strongest`;
    }),
  },
  {
    id: "I-44", feature: "Two InputFields selected: the shared properties read as words (Read only, Label · Tooltip icon), never code (layout, readOnly, Tooltip-Icon; walk W-16)", wp: "walk §4 item 9 2026-10-30", timeout: 60_000,
    run: guarded("I-44", async (ctx, hold) => {
      const { page, id } = hold(await seededPage(ctx, (title) => walkPage(title), /Dr\. An/));
      await deepClick(page, id, "InputField", 0);
      await deepClick(page, id, "InputField", 1, ["Meta", "Shift"]);
      await until(async () => (await page.locator("#studio-right").innerText()).includes("InputField properties"), { message: "the shared InputField properties" });
      const labels = await page.locator("#studio-right .studio-inspector__row-label, #studio-right [data-prop] label").allInnerTexts().catch(() => []);
      // Row labels in words: no camelCase prop name, no Figma layer name with its dashes, no bare `layout`.
      const bad = labels.filter((label) => /^[a-z]+[A-Z]|[A-Za-z]-[A-Z]|^layout$/.test(label.trim()));
      if (!labels.length || bad.length) throw new Error(`code words as labels: ${bad.join(", ") || "no labels"} (labels: ${labels.slice(0, 14).join(" | ")})`);
      return `no layout / readOnly / Tooltip-Icon (${labels.length} labels)`;
    }),
  },
  {
    id: "I-45", feature: "Icon picker names icons in words (\"Plus\" · Line), not icon-plus-line; the field too (walk W-25)", wp: "walk §4 item 9 2026-10-30", timeout: 60_000,
    run: guarded("I-45", async (ctx, hold) => {
      const { page, id } = hold(await seededPage(ctx, (title) => walkPage(title), /Dr\. An/));
      await deepClick(page, id, "Button");
      await openPropertyGroup(page, "startIcon").catch(() => undefined);
      const trigger = page.locator('#studio-right [data-prop="startIcon"] .studio-icon-control button').first();
      const field = await trigger.innerText();
      await trigger.click();
      const first = page.locator('[data-icon-group="all"] .zen-popover__item').first();
      await first.waitFor({ state: "visible", timeout: 3000 });
      const shown = (await page.locator("[data-icon-group] .zen-popover__item").allInnerTexts()).slice(0, 40);
      await page.keyboard.press("Escape");
      const code = [field, ...shown].filter((label) => /icon-/.test(label));
      if (code.length) throw new Error(`icon names as code: ${code.slice(0, 4).join(" | ")}`);
      return `field "${field.replace(/\s+/g, " ")}" · list "${shown[0]?.replace(/\s+/g, " ")}"`;
    }),
  },
  {
    id: "I-46", feature: "A text inside an instance: its Fill names the Figma variable (Content / On-Accent / Default), no CSS name and no \"+12\" (walk W-40)", wp: "walk §4 item 9 2026-10-30", timeout: 60_000,
    run: guarded("I-46", async (ctx, hold) => {
      const { page, id } = hold(await seededPage(ctx, (title) => walkPage(title), /Dr\. An/));
      await deepClick(page, id, "Button");
      const box = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Button"]`).first().boundingBox();
      await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
      const token = page.locator("#studio-right .studio-part__token").first();
      await token.waitFor({ state: "visible", timeout: 5000 });
      const words = (await page.locator("#studio-right .studio-part__token").allInnerTexts()).join(" | ");
      if (/--zen|\+\d/.test(words)) throw new Error(`token cells: ${words}`);
      if (!/On-Accent|Inverse|Neutral/.test(words)) throw new Error(`no Figma variable name: ${words}`);
      return words;
    }),
  },
  {
    id: "I-47", feature: "Bottom navigation: \"Show labels\" in the Design tab writes showLabels; a tab's new Icon takes its Selected icon along (walk W-24/W-26)", wp: "walk §4 item 9 2026-10-30", timeout: 60_000,
    run: guarded("I-47", async (ctx, hold) => {
      const { page, id, text } = hold(await seededPage(ctx, (title) => walkPage(title), /Dr\. An/));
      await deepClick(page, id, "BottomNavigation", 0, ["Meta"], "start");
      const toggle = page.locator('#studio-right [data-prop="showLabels"]').first();
      await openPropertyGroup(page, "showLabels").catch(() => undefined);
      await toggle.waitFor({ state: "visible", timeout: 5000 });
      await toggle.getByRole("switch").or(toggle.getByRole("checkbox")).first().click();
      await until(async () => /<BottomNavigation[^>]*\bshowLabels\b/.test(await text()), { message: "showLabels written" });
      // The second tab: its Icon → a bell; Selected icon follows (bell solid), not the Home solid it had.
      const tab = page.locator(".zen-bottom-nav__item").nth(1);
      const box = await tab.boundingBox();
      await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
      const icon = page.locator('#studio-right [data-prop="icon"] .studio-icon-control button').first();
      await icon.waitFor({ state: "visible", timeout: 5000 });
      await icon.click();
      await page.getByPlaceholder("Search icons").fill("bell 01 line");
      await page.locator(".zen-popover__item").filter({ hasText: /^Bell 01/ }).first().click();
      await until(async () => /id: "visits"[^}]*icon: "icon-bell-01-line"[^}]*selectedIcon: "icon-bell-01-solid"/.test(await text()), { message: "icon and selectedIcon both the bell", timeout: 8000 }).catch(async (error) => {
        const now = await text();
        throw new Error(`${error.message}: ${now.slice(now.indexOf("items="), now.indexOf("items=") + 400)}`);
      });
      return "Show labels → showLabels; Visits icon → bell, selectedIcon → bell solid";
    }),
  },
  {
    id: "I-48", feature: "A ListItem's \"cannot be wrapped\" status says it once, not on every selection (walk W-30)", wp: "walk §4 item 9 2026-10-30", timeout: 60_000,
    run: guarded("I-48", async (ctx, hold) => {
      const { page, id } = hold(await seededPage(ctx, floatPage, /Dr\. An/));
      const said = [];
      for (let round = 0; round < 2; round += 1) {
        await page.keyboard.press("Escape");
        await sleep(300);
        await deepClick(page, id, "ListItem");
        await sleep(700);
        said.push(/cannot be wrapped/.test(await statusText(page)));
        // The line stays until something else is said: cleared, so the second selection shows whether it says it again.
        await page.evaluate(async () => (await import("/src/platform/studio/inspector/status.ts")).inspectorStatus.clear());
      }
      if (!said[0] || said[1]) throw new Error(`said on selections 1 and 2: ${said.join(", ")} (want true, false)`);
      return `first selection: ${said[0] ? "said" : "quiet"} · second: quiet`;
    }),
  },
  {
    id: "I-49", feature: "A click on a Screen's empty background selects the frame (Figma's), not \"Screen · Local component\" (walk W-27)", wp: "walk §4 item 9 2026-10-30", timeout: 60_000,
    run: guarded("I-49", async (ctx, hold) => {
      const { focusScreen } = await import("./builder.mjs");
      const { page } = hold(await seededPage(ctx, floatPage, /Dr\. An/));
      await focusScreen(page);
      await page.keyboard.press("Escape");
      const screen = await page.locator('[data-studio-frame="screen:screen-1"]').first().boundingBox();
      await page.mouse.click(screen.x + screen.width - 24, screen.y + screen.height * 0.55);
      await sleep(600);
      const selection = await page.evaluate(async () => (await import("/src/platform/studio/store.ts")).studioStore.getState().selection);
      if (selection?.kind !== "frame" || selection.frameId !== "screen:screen-1") throw new Error(`selected ${JSON.stringify(selection).slice(0, 160)}`);
      return "empty Screen background → frame screen:screen-1";
    }),
  },
  {
    id: "I-50", feature: "Top navigation selected: its slot tags and + chips never sit on each other (walk W-38)", wp: "walk §4 item 9 2026-10-30", timeout: 60_000,
    run: guarded("I-50", async (ctx, hold) => {
      const { focusScreen } = await import("./builder.mjs");
      const { page, id } = hold(await seededPage(ctx, floatPage, /Dr\. An/));
      await focusScreen(page);
      await deepClick(page, id, "TopNavigation");
      await page.locator(".studio-slots__tag").first().waitFor({ state: "visible", timeout: 5000 });
      await sleep(400);
      const boxes = async (selector) => page.locator(selector).evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { text: el.textContent.trim() || el.querySelector("[aria-label]")?.getAttribute("aria-label") || "", x: r.left, y: r.top, r: r.right, b: r.bottom }; }));
      const overlaps = (list) => list.flatMap((a, i) => list.slice(i + 1).filter((b) => a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b).map((b) => `${a.text} × ${b.text}`));
      const tags = await boxes(".studio-slots__tag");
      const chips = await boxes(".studio-slots__chip");
      const bad = [...overlaps(tags), ...overlaps(chips)];
      if (tags.length < 2 || bad.length) throw new Error(`${tags.length} tags, ${chips.length} chips; overlapping: ${bad.join(" · ") || "none"}`);
      return `${tags.length} tags and ${chips.length} chips apart`;
    }),
  },
  {
    id: "I-51", feature: "A Button's words edit in two double-clicks from nothing selected, as in Figma (walk W-21)", wp: "walk §4 item 9 2026-10-30", timeout: 60_000,
    run: guarded("I-51", async (ctx, hold) => {
      const { focusScreen } = await import("./builder.mjs");
      const { page, id } = hold(await seededPage(ctx, floatPage, /Dr\. An/));
      await focusScreen(page);
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      const box = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Button"]`).first().boundingBox();
      const editing = () => page.evaluate(() => Boolean(document.querySelector(".studio-edit__text")));
      let count = 0;
      for (; count < 3 && !(await editing()); count += 1) {
        await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
        await sleep(700);
      }
      await page.keyboard.press("Escape");
      if (count > 2 || !(await page.evaluate(() => true))) throw new Error(`${count} double-clicks`);
      return `editing after ${count} double-clicks`;
    }),
  },
  {
    id: "I-52", feature: "Width › Fill container on a field its column already stretches writes nothing: no hidden Stack around it, the status says it fills (walk W-22)", wp: "walk §4 item 9 2026-10-30", timeout: 60_000,
    run: guarded("I-52", async (ctx, hold) => {
      const { page, id, text } = hold(await seededPage(ctx, floatPage, /Dr\. An/));
      await showLeftTab(page, "layers");
      await page.locator('[data-layer-id="frame:screen:screen-2"]').first().click();
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Shift+Digit2");
      await sleep(600);
      const before = await text();
      await deepClick(page, id, "InputField", 1);
      await page.locator("#studio-right").getByRole("button", { name: /^(W|Width) options$/ }).first().click();
      await page.getByRole("option", { name: /^Fill container/ }).first().click();
      await until(async () => /already fills/.test(await statusText(page)), { message: "the status says it fills already" });
      const after = await text();
      if (after !== before || /fillChildren/.test(after)) throw new Error(`the page changed: ${after.slice(after.indexOf('id="screen-2"'), after.indexOf('id="screen-2"') + 300).replace(/\s+/g, " ")}`);
      return `no wrap · "${(await statusText(page)).split(" | ")[0]}"`;
    }),
  },
];

/** A phone Screen without auto layout: its layers float in Boxes (as inserts there write them), with both bars. */
const floatPage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Screen } from "@zen-ds/react/builder";
import { BottomNavigation, Box, Button, InputField, List, ListItem, Stack, Text, TopNavigation } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Doctors" device="phone" topNavigation={<TopNavigation title="Doctors" />} bottomNavigation={<BottomNavigation value="home" items={[{ id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" }, { id: "visits", label: "Visits", icon: "icon-calendar-line", selectedIcon: "icon-home-03-solid" }]} />}>
        <Box position="absolute" insetLeft={20} insetTop={140}>
          <Button level="primary">Book now</Button>
        </Box>
        <Box position="absolute" insetLeft={20} insetTop={220}>
          <InputField label="Name" />
        </Box>
        <Box position="absolute" insetLeft={20} insetTop={320}>
          <List>
            <ListItem title="Dr. An" caption="Cardiology" />
          </List>
        </Box>
      </Screen>
      <Screen id="screen-2" title="Desk" device="desktop">
        <Stack gap="md" padding="xl">
          <Text>Desk</Text>
          <InputField label="Email" />
          <Button level="primary">Send</Button>
        </Stack>
      </Screen>
    </Board>
  );
}
`;


/** A Studio project whose Primary is Grass (green), so its colours differ from Zen's pink (I-43). */
async function e2eProject(ctx) {
  const { defaultProjectTheme } = await import("../../project-theme.mjs");
  const now = Date.now();
  const project = { id: "e2e-grass", name: "E2E Grass", theme: { ...defaultProjectTheme(), primary: { ramp: "Grass" } }, createdAt: now, updatedAt: now };
  await ctx.api.writeProject(project);
  return project.id;
}

/** ⌘-click (deep select) on the n-th `name` of page `id`: that layer itself, not the outermost one there. */
async function deepClick(page, id, name, index = 0, modifiers = ["Meta"], where = "center") {
  const target = page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="${name}"]`).nth(index);
  await target.waitFor({ state: "attached", timeout: 5000 });
  const box = await target.boundingBox();
  if (!box) throw new Error(`<${name}> has no box on the canvas`);
  // page.mouse.click has no `modifiers`: the keys are held around it; ⌘ alone lands on a part, ⇧Enter climbs back.
  for (const key of modifiers) await page.keyboard.down(key === "Meta" ? "ControlOrMeta" : key);
  try {
    await page.mouse.click(where === "start" ? box.x + 6 : box.x + box.width / 2, box.y + box.height / 2);
  } finally {
    for (const key of [...modifiers].reverse()) await page.keyboard.up(key === "Meta" ? "ControlOrMeta" : key);
  }
  if (modifiers.includes("Meta") && !modifiers.includes("Shift")) await ownerOfLayer(page);
  await sleep(600);
}

/** The walk's phone screen (W-xx rows): text, two fields, a button, a list, a bottom bar whose tabs share the Home icon. */
const walkPage = (title, project) => `// @zen-page ${JSON.stringify({ format: 1, title, ...(project ? { project } : {}) })}
import { Board, Screen } from "@zen-ds/react/builder";
import { BottomNavigation, Button, InputField, List, ListItem, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Doctors" device="phone" bottomNavigation={<BottomNavigation value="home" items={[{ id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" }, { id: "visits", label: "Visits", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" }]} />}>
        <Stack gap="md" padding="lg">
          <Text>Doctors</Text>
          <InputField label="Name" />
          <InputField label="Phone" />
          <Text tone="accent">Find a doctor</Text>
          <Button level="primary" startIcon="icon-calendar-line">Book now</Button>
          <List>
            <ListItem title="Dr. An" caption="Cardiology" />
          </List>
        </Stack>
      </Screen>
    </Board>
  );
}
`;

/** A row's run that, when it breaks, says where it stood: the Inspector's heading and first words, and a screenshot. */
function guarded(id, run) {
  return async (ctx) => {
    let page = null;
    const hold = (seeded) => { page = seeded.page; return seeded; };
    try {
      return await run(ctx, hold);
    } catch (error) {
      if (!page) throw error;
      const heading = await page.locator("#studio-right h2").first().innerText({ timeout: 500 }).catch(() => "-");
      const panel = (await page.locator("#studio-right").innerText({ timeout: 500 }).catch(() => "")).replace(/\s+/g, " ").slice(0, 300);
      const file = `.qa/studio-e2e/${id}-broken.png`;
      await page.screenshot({ path: file }).catch(() => undefined);
      throw new Error(`${error.message} · selected "${heading}" · panel "${panel}" · ${file}`);
    }
  };
}
