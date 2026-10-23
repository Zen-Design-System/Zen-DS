// Variables rows (Figma's Local variables on the Zen tokens, P5 2026-10-17; research
// docs/research/studio-figma-native-parity-2026-10-17.md §10): the window from the Page panel, a value edited as a draft
// the canvas shows at once and ⌘Z takes back, an alias picked from the Variables tab, a variable created and named in
// place, a delete refused while code reads the variable. Nothing is saved (a Save runs the token build in the worktree);
// the run drops every draft between rows.
import fs from "node:fs";
import path from "node:path";
import { sleep, until } from "../lib/studio.mjs";
import { seededPage } from "./builder.mjs";

const emptyPage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Screen, proto } from "@zen-ds/react/builder";
export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title=${JSON.stringify(title)} device="desktop" width={800} height={500} />
    </Board>
  );
}
`;

/** The Studio on a page with nothing selected, the Variables window opened from the Page panel. */
async function openVariables(ctx) {
  const { page } = await seededPage(ctx, emptyPage, /width=\{800\}/);
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.locator("#studio-right").getByRole("button", { name: "Local variables" }).click();
  const win = page.locator('[data-e2e="variables"]');
  await win.waitFor({ timeout: 10_000 });
  await until(async () => (await win.locator("[data-variable]").count()) > 3, { timeout: 15_000, message: "the variables listed" });
  return { page, win };
}

async function collection(page, win, name) {
  await win.locator(".studio-vars__head").getByRole("button").first().click();
  await page.getByRole("menuitem", { name: new RegExp(`^${name.replace(/[()]/g, "\\$&")}`) }).click();
  await until(async () => (await win.locator(".studio-vars__head").getByRole("button").first().innerText()).trim() === name, { message: `the ${name} collection` });
}

const cssVar = (page, name) => page.evaluate((prop) => getComputedStyle(document.documentElement).getPropertyValue(prop).trim(), name);
const source = async (ctx, file) => (await ctx.api.source(file)).content;

export const rows = [
  {
    id: "VA-01", feature: "Page panel › Local variables opens Figma's window: the 11 Zen collections, a column per mode, the groups; Esc closes it", wp: "P5 variables",
    async run(ctx) {
      const { page, win } = await openVariables(ctx);
      await win.locator(".studio-vars__head").getByRole("button").first().click();
      // The collections, without the menu's last item (Create collection).
      const listed = await page.getByRole("menu", { name: "Collections" }).getByRole("menuitem").filter({ hasNotText: "Create collection" }).count();
      await page.keyboard.press("Escape");
      if (listed !== 11) throw new Error(`${listed} collections listed, want 11`);
      await collection(page, win, "Component Theme");
      const columns = await win.getByRole("columnheader").allInnerTexts();
      if (columns.length !== 10 || columns[0].trim() !== "Name") throw new Error(`columns: ${columns.join(" | ")}`);
      const groups = await win.getByRole("navigation", { name: "Groups" }).getByRole("button").count();
      await win.focus();
      await page.keyboard.press("Escape");
      await until(async () => (await win.count()) === 0, { message: "the window closed" });
      return `11 collections · Component Theme: ${columns.slice(1).join(", ")} · ${groups} group rows`;
    },
  },
  {
    id: "VA-02", feature: "A colour edit is a draft the canvas shows at once (tokens.css from the draft), Global Colors' Zen-High-Contrast follows and is read-only, ⌘Z takes it back", wp: "P5 variables",
    async run(ctx) {
      const { page, win } = await openVariables(ctx);
      await collection(page, win, "Global Colors");
      await win.getByRole("searchbox", { name: "Search variables" }).fill("light blue 9");
      const before = await cssVar(page, "--zen-light-blue-9");
      const derived = win.locator('[data-variable="Light/Blue/9"] [aria-label="Light/Blue/9, Zen-High-Contrast"]');
      if ((await derived.getAttribute("aria-readonly")) !== "true") throw new Error("Zen-High-Contrast is editable");
      await win.locator('[data-variable="Light/Blue/9"] [aria-label="Light/Blue/9, Zen"]').click();
      const editor = page.getByRole("dialog", { name: "Light/Blue/9, Zen" });
      await editor.waitFor({ timeout: 5000 });
      await editor.getByRole("textbox", { name: "Hex value" }).fill("FF0000");
      await editor.getByRole("textbox", { name: "Hex value" }).press("Enter");
      await until(async () => (await cssVar(page, "--zen-light-blue-9")).toUpperCase() === "#FF0000", { timeout: 10_000, message: "the canvas reads the drafted colour" });
      const drafts = (await ctx.api.drafts()).drafts.map((row) => row.file);
      if (!drafts.includes("tokens/source/figma/global-colors.json")) throw new Error(`drafts: ${drafts.join(", ")}`);
      const text = await source(ctx, "tokens/source/figma/global-colors.json");
      if (!/"name": "Light\/Blue\/9",\n\s+"type": "COLOR",\n\s+"valuesByMode": \{\n\s+"Zen": "#FF0000",\n\s+"Zen-High-Contrast": "#FF0000"/.test(text)) throw new Error("the draft does not hold Zen and its high-contrast value #FF0000");
      await win.locator('[data-variable="Light/Blue/9"] [aria-label="Light/Blue/9, Zen"]').focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await cssVar(page, "--zen-light-blue-9")) === before, { timeout: 10_000, message: "⌘Z puts the colour back" });
      return `--zen-light-blue-9 ${before} → #FF0000 (draft, high contrast follows) → ⌘Z → ${before}`;
    },
  },
  {
    id: "VA-03", feature: "An alias from the Variables tab: Color/Content/Accent/Base (Light) → Light/Blue/10, written {Light/Blue/10}; Detach alias writes the value it showed", wp: "P5 variables",
    async run(ctx) {
      const { page, win } = await openVariables(ctx);
      await collection(page, win, "Mode Colors (Semantic)");
      await win.getByRole("searchbox", { name: "Search variables" }).fill("content accent base");
      const cell = win.locator('[data-variable="Color/Content/Accent/Base"] [aria-label="Color/Content/Accent/Base, Light"]');
      await cell.click();
      const editor = page.getByRole("dialog", { name: "Color/Content/Accent/Base, Light" });
      await editor.waitFor({ timeout: 5000 });
      await editor.getByRole("searchbox", { name: "Search variables" }).fill("light blue 10");
      await editor.getByRole("button", { name: /^Light\/Blue\/10\b/ }).first().click();
      const file = "tokens/source/figma/mode-colors-semantic.json";
      const token = (text) => /"name": "Color\/Content\/Accent\/Base",\n\s+"type": "COLOR",\n\s+"valuesByMode": \{\n\s+"Light": "([^"]+)"/.exec(text)?.[1];
      await until(async () => token(await source(ctx, file)) === "{Light/Blue/10}", { timeout: 10_000, message: "the alias written" });
      await until(async () => /Blue\/10/.test(await cell.innerText()), { message: "the chip shows Blue/10" });
      await cell.click();
      await page.getByRole("dialog", { name: "Color/Content/Accent/Base, Light" }).getByRole("button", { name: "Detach alias" }).click();
      await until(async () => /^#[0-9A-F]{6}/.test(token(await source(ctx, file)) ?? ""), { timeout: 10_000, message: "the detached value written" });
      return `{Light/Blue/10} → detached ${token(await source(ctx, file))}`;
    },
  },
  {
    id: "VA-04", feature: "Create variable › Number names it in place; Delete is refused while code reads the variable (Spacing/Gap/Small), the refusal names the readers", wp: "P5 variables",
    async run(ctx) {
      const { page, win } = await openVariables(ctx);
      await collection(page, win, "Spacing");
      await win.getByRole("button", { name: "Create variable" }).click();
      await page.getByRole("menuitem", { name: "Number" }).click();
      const rename = win.getByRole("textbox", { name: /^Rename / });
      await rename.waitFor({ timeout: 5000 });
      await rename.fill("E2E Huge");
      await rename.press("Enter");
      const file = "tokens/source/figma/spacing.json";
      await until(async () => /"name": "[^"]*E2E Huge"/.test(await source(ctx, file)), { timeout: 10_000, message: "the new variable named" });
      const before = await source(ctx, file);
      await win.getByRole("searchbox", { name: "Search variables" }).fill("gap small");
      const row = win.locator('[data-variable="Spacing/Gap/Small"]');
      await row.hover();
      await row.getByRole("button", { name: "Small actions" }).click();
      await page.getByRole("menuitem", { name: "Delete variable" }).click();
      await until(async () => /read by .*(css|tsx|ts)/.test(await win.locator(".studio-vars__status").innerText()), { message: "the refusal names its readers" });
      await sleep(300);
      if ((await source(ctx, file)) !== before) throw new Error("the refused delete changed the file");
      return `${/"name": "([^"]*E2E Huge)"/.exec(before)?.[1]} created · delete of Spacing/Gap/Small refused: ${(await win.locator(".studio-vars__status").innerText()).slice(0, 90)}`;
    },
  },
  {
    id: "VA-05", feature: "Edit variable (v2, Figma's panel from the row's ⋯): a description and scoping written in the collection (scopes in Figma's names, Gap only), the code syntax shown as its CSS name, ⌘Z takes the scoping back", wp: "Variables v2 2026-10-23", timeout: 60_000,
    async run(ctx) {
      const { page, win } = await openVariables(ctx);
      await collection(page, win, "Spacing");
      await win.getByRole("searchbox", { name: "Search variables" }).fill("gap small");
      const row = win.locator('[data-variable="Spacing/Gap/Small"]');
      await row.hover();
      await row.getByRole("button", { name: "Small actions" }).click();
      await page.getByRole("menuitem", { name: "Edit variable" }).click();
      const panel = page.getByRole("dialog", { name: "Edit variable Spacing/Gap/Small" });
      await panel.waitFor({ timeout: 5000 });
      const code = (await panel.locator(".studio-vars__code").innerText()).replace(/\s+/g, " ");
      if (!code.includes("var(--zen-spacing-gap-small)")) throw new Error(`code syntax: ${code}`);
      const file = "tokens/source/figma/spacing.json";
      const token = async () => JSON.parse(await source(ctx, file)).Spacing.tokens.find((each) => each.name === "Spacing/Gap/Small");
      await panel.getByRole("textbox", { name: "Description" }).fill("Between controls in a row");
      await panel.getByRole("textbox", { name: "Description" }).press("Tab");
      await until(async () => (await token())?.description === "Between controls in a row", { timeout: 10_000, message: "the description written" });
      // Zen's Checkbox hides the native input: a click on its label, as a person does (figma.mjs showResolved).
      const tick = (name) => panel.locator(".zen-checkbox").filter({ hasText: new RegExp(`^${name}$`) }).click();
      await tick("Show in all supported properties");
      await until(async () => (await token())?.scopes?.length === 12, { timeout: 10_000, message: "every number scope listed (All off)" });
      for (const name of ["Corner radius", "Width and height", "Stroke", "Layer opacity", "Effects", "Font weight", "Font size", "Line height", "Letter spacing", "Paragraph spacing", "Paragraph indent"]) {
        await tick(name);
        await sleep(150);
      }
      await until(async () => JSON.stringify((await token())?.scopes) === JSON.stringify(["GAP"]), { timeout: 10_000, message: "scoped to Gap only" });
      await page.keyboard.press("Escape");
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await token())?.scopes?.length === 2 && (await token()).scopes.includes("GAP"), { timeout: 10_000, message: "⌘Z: one scope back" });
      return `description + scopes → ${JSON.stringify((await token()).scopes)} after ⌘Z · ${code.trim().slice(0, 60)}`;
    },
  },  {
    id: "VA-06", feature: "Rename a variable code reads (v2, user 2026-10-23): Spacing/Gap/Large → Roomy is written with formerNames, the canvas's --zen-spacing-gap-large still resolves (the build's alias), ⌘Z takes it back", wp: "Variables v2 2026-10-23", timeout: 60_000,
    async run(ctx) {
      const { page, win } = await openVariables(ctx);
      await collection(page, win, "Spacing");
      await win.getByRole("searchbox", { name: "Search variables" }).fill("gap large");
      const row = win.locator('[data-variable="Spacing/Gap/Large"]');
      await row.hover();
      await row.getByRole("button", { name: "Large actions" }).click();
      await page.getByRole("menuitem", { name: "Rename" }).click();
      const rename = win.getByRole("textbox", { name: /^Rename / });
      await rename.waitFor({ timeout: 5000 });
      await rename.fill("Roomy");
      await rename.press("Enter");
      const file = "tokens/source/figma/spacing.json";
      const token = async (name) => JSON.parse(await source(ctx, file)).Spacing.tokens.find((each) => each.name === name);
      await until(async () => JSON.stringify((await token("Spacing/Gap/Roomy"))?.formerNames) === JSON.stringify(["Spacing/Gap/Large"]), { timeout: 10_000, message: "renamed, the old name kept" });
      await until(async () => (await cssVar(page, "--zen-spacing-gap-roomy")) !== "" && (await cssVar(page, "--zen-spacing-gap-large")) === (await cssVar(page, "--zen-spacing-gap-roomy")), { timeout: 15_000, message: "the old CSS name resolves to the new one" });
      const value = await cssVar(page, "--zen-spacing-gap-large");
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => Boolean(await token("Spacing/Gap/Large")) && !(await token("Spacing/Gap/Large")).formerNames, { timeout: 10_000, message: "⌘Z: Large again" });
      return `renamed with formerNames · --zen-spacing-gap-large = ${value} · ⌘Z`;
    },
  },  {
    id: "VA-07", feature: "Modes (v2): + Add mode on Emphasis Level names the new column in place (E2E Bold, the first mode's values), the canvas's tokens.css has [data-emphasis=\"e2e-bold\"]; Delete mode is refused while code uses it (Mode Colors › Dark); ⌘Z takes the mode back", wp: "Variables v2 2026-10-23",
    async run(ctx) {
      const { page, win } = await openVariables(ctx);
      await collection(page, win, "Emphasis Level");
      await win.getByRole("button", { name: "Add mode" }).click();
      const header = win.getByRole("textbox", { name: /^Rename mode / });
      await header.waitFor({ timeout: 5000 });
      await header.fill("E2E Bold");
      await header.press("Enter");
      const file = "tokens/source/figma/emphasis-level.json";
      const modes = async () => Object.values(JSON.parse(await source(ctx, file)))[0].modes;
      await until(async () => (await modes()).includes("E2E Bold"), { timeout: 10_000, message: "the mode named in the file" });
      const weights = () => page.evaluate(() => {
        const read = (mode) => { const probe = document.createElement("div"); probe.setAttribute("data-emphasis", mode); document.body.append(probe); const value = getComputedStyle(probe).getPropertyValue("--zen-emphasis-font-weight-bold").trim(); probe.remove(); return value; };
        return [read("medium"), read("e2e-bold")];
      });
      await until(async () => { const [medium, bold] = await weights(); return medium !== "" && bold === medium; }, { timeout: 15_000, message: "the new mode's CSS (the first mode's values)" });
      await collection(page, win, "Mode Colors (Semantic)");
      const dark = win.getByRole("columnheader").filter({ hasText: /^Dark$/ });
      await dark.hover();
      await dark.getByRole("button", { name: "Dark mode actions" }).click();
      await page.getByRole("menuitem", { name: "Delete mode" }).click();
      await until(async () => /Dark is used by .*: deleting it would break/.test(await win.locator(".studio-vars__status").innerText()), { message: "the refusal names the code" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await modes()).length === 3, { timeout: 10_000, message: "⌘Z: three modes again" });
      return `E2E Bold added and named · weights ${(await weights().catch(() => [])).join("/")} · Dark's delete refused · ⌘Z`;
    },
  },
  {
    id: "VA-08", feature: "Create collection (user 2026-10-23, one mode on :root): the Collections menu's last item names it in place (E2E Collection), a draft of tokens/source/figma/e2e-collection.json with no file on disk, one column Mode 1 and no Add mode; Create variable › Number is on the canvas's :root; ⌘Z twice takes the variable, then the collection, back and leaves no file", wp: "Variables v2",
    async run(ctx) {
      const { page, win } = await openVariables(ctx);
      const file = "tokens/source/figma/e2e-collection.json";
      const onDisk = () => fs.existsSync(path.join(ctx.root, file));
      if (onDisk()) throw new Error(`${file} is on disk before the row`);
      await win.locator(".studio-vars__head").getByRole("button").first().click();
      await page.getByRole("menuitem", { name: "Create collection" }).click();
      const field = win.getByRole("textbox", { name: "Collection name" });
      await field.waitFor({ timeout: 5000 });
      await field.fill("E2E Collection");
      await field.press("Enter");
      const head = win.locator(".studio-vars__head").getByRole("button").first();
      await until(async () => (await head.innerText()).trim() === "E2E Collection", { timeout: 10_000, message: "the new collection shown" });
      const columns = (await win.getByRole("columnheader").allInnerTexts()).map((text) => text.trim());
      if (columns.join("|") !== "Name|Mode 1") throw new Error(`columns: ${columns.join(" | ")}`);
      if (await win.getByRole("button", { name: "Add mode" }).count()) throw new Error("a created collection offers Add mode");
      const body = async () => Object.values(JSON.parse(await source(ctx, file)))[0];
      if ((await body()).tokens.length !== 0) throw new Error("the new collection is not empty");
      await win.getByRole("button", { name: "Create variable" }).click();
      await page.getByRole("menuitem", { name: "Number" }).click();
      const rename = win.getByRole("textbox", { name: /^Rename / });
      await rename.waitFor({ timeout: 5000 });
      await rename.press("Escape");
      await until(async () => (await body()).tokens.length === 1, { timeout: 10_000, message: "the variable in the collection's file" });
      const [variable] = (await body()).tokens;
      const prop = `--zen-${variable.name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}`;
      await until(async () => (await cssVar(page, prop)) === "0px", { timeout: 15_000, message: `${prop} on :root` });
      if (onDisk()) throw new Error("a draft wrote the file");
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => (await body()).tokens.length === 0, { timeout: 10_000, message: "⌘Z: the variable gone" });
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => { try { await source(ctx, file); return false; } catch { return true; } }, { timeout: 10_000, message: "⌘Z: the collection's draft gone" });
      if (onDisk()) throw new Error(`${file} was left on disk`);
      return `E2E Collection · ${columns.slice(1).join(", ")} · ${variable.name} → ${prop}: 0px · ⌘Z twice: no draft, no file`;
    },
  },
];
