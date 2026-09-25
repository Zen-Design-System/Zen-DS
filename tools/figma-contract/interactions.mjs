/*
 * Behaviour checks for Checkbox, RadioButton, Chip (Normal/Advanced + Popover),
 * Popover search / Manual-Add-New and SelectField. Real pointer + keyboard input.
 *   node tools/figma-contract/interactions.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const globalRoot = execFileSync("npm", ["root", "-g"]).toString().trim();
const load = (names) => { for (const n of names) { try { return createRequire(path.join(repo, "x.js"))(n); } catch { /* next */ } } throw new Error(names.join(", ")); };
const esbuild = load(["esbuild", path.join(globalRoot, "esbuild"), path.join(globalRoot, "tsx/node_modules/esbuild")]);
const { chromium } = load(["playwright", "@playwright/test", path.join(globalRoot, "playwright")]);
const out = path.join(here, ".out");
fs.mkdirSync(out, { recursive: true });
await esbuild.build({ entryPoints: [path.join(here, "harness.tsx")], bundle: true, outfile: path.join(out, "harness.js"), loader: { ".svg": "dataurl", ".woff": "dataurl", ".woff2": "dataurl", ".otf": "dataurl" }, jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' }, logLevel: "error" });
fs.writeFileSync(path.join(out, "interactions.html"), `<!doctype html><html data-brand="zen" data-theme="light" data-component-theme="neutral-s1"><head><meta charset="utf-8"><link rel="stylesheet" href="harness.css"></head><body><div id="root"></div><script>window.__CASES=[{id:"i",kind:"interactive",props:{}}]</script><script src="harness.js"></script></body></html>`);

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(pathToFileURL(path.join(out, "interactions.html")).href);
await page.waitForSelector(".zen-checkbox");
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });
const active = () => page.evaluate(() => { const el = document.activeElement; return el ? `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${el.className?.baseVal ?? el.className}`.slice(0, 80) + "|" + (el.textContent ?? "").trim().slice(0, 30) : "none"; });

// Checkbox
await page.click(".zen-checkbox__label");
check("checkbox: clicking the label toggles it", await page.isChecked(".zen-checkbox input"));
check("checkbox: no focus ring after a pointer click", await page.evaluate(() => getComputedStyle(document.querySelector(".zen-checkbox__mark"), "::before").borderTopWidth === "0px" || getComputedStyle(document.querySelector(".zen-checkbox__mark"), "::before").content === "none" || getComputedStyle(document.querySelector(".zen-checkbox__mark"), "::before").borderTopStyle === "none"));
await page.keyboard.press("Space");
check("checkbox: Space toggles the focused control", !(await page.isChecked(".zen-checkbox input")));
await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab");
check("checkbox: keyboard focus shows the 2px accent ring", await page.evaluate(() => getComputedStyle(document.querySelector(".zen-checkbox__mark"), "::before").borderTopWidth === "2px"));

// Radio
await page.focus('.zen-radio-button input[value="s"]');
await page.keyboard.press("ArrowRight");
check("radio: arrow keys move the selection", await page.isChecked('.zen-radio-button input[value="m"]'));
check("radio: exactly one dot is visible in the group", (await page.$$eval(".zen-radio-button__ring > .zen-icon", (els) => els.filter((el) => getComputedStyle(el).display !== "none").length)) === 1);

// Chip Normal
await page.click("#normal");
check("chip normal: exposes pressed state", (await page.getAttribute("#normal", "aria-pressed")) === "true");

// Chip Advanced + Popover
await page.focus("#adv");
await page.keyboard.press("ArrowDown");
check("chip advanced: ArrowDown opens the menu", (await page.getAttribute("#adv", "aria-expanded")) === "true");
check("chip advanced: focus moves to the first option", (await active()).includes("Apple"), await active());
await page.keyboard.press("ArrowDown");
check("popover: ArrowDown moves to the next option", (await active()).includes("Banana"), await active());
await page.keyboard.press("ArrowDown");
check("popover: disabled options are skipped", (await active()).includes("Durian"), await active());
await page.keyboard.press("Enter");
check("chip advanced: Enter selects and closes", (await page.getAttribute("#adv", "aria-expanded")) === "false" && (await page.textContent("#adv")).includes("Durian"));
check("chip advanced: focus returns to the chip", (await active()).startsWith("button#adv"), await active());
await page.keyboard.press("Delete");
check("chip advanced: Delete clears the selection", (await page.textContent("#adv")).includes("Fruit"));
await page.keyboard.press("Enter");
await page.keyboard.press("Escape");
check("chip advanced: Escape closes and restores focus", (await page.getAttribute("#adv", "aria-expanded")) === "false" && (await active()).startsWith("button#adv"), await active());
await page.click("#adv");
await page.mouse.click(5, 5);
check("chip advanced: pointer down outside closes", (await page.getAttribute("#adv", "aria-expanded")) === "false");

// Popover search filtering
await page.fill("#search-pop input", "an");
const labels = await page.$$eval("#search-pop .zen-popover__item-label", (els) => els.map((el) => el.textContent));
check("popover search: filters options", labels.join(",") === "Banana,Durian", labels.join(","));

// Manual-Add-New
await page.fill("#manual input", "Mango");
check("manual add new: shows Create + typed value badge", (await page.textContent("#manual .zen-popover__item[data-function='manual-add-new'] .zen-popover__item-label")) === "Create" && (await page.textContent("#manual .zen-popover__item[data-function='manual-add-new'] .zen-badge")) === "Mango");
await page.press("#manual input", "Enter");
check("manual add new: Enter creates the typed value", (await page.textContent("#created")) === "Mango");
await page.fill("#manual input", "apple");
check("manual add new: no create row for an existing option", (await page.$("#manual .zen-popover__item[data-function='manual-add-new']")) === null);

// SelectField
await page.focus("#fruit-trigger");
await page.keyboard.press("ArrowDown");
check("select: ArrowDown opens and focuses the selected option", (await active()).includes("Banana"), await active());
await page.keyboard.press("ArrowDown");
await page.keyboard.press("Enter");
check("select: Enter picks the option", (await page.textContent("#fruit-value")) === "d");
check("select: focus returns to the trigger", (await active()).startsWith("button#fruit-trigger"), await active());
await page.click("#fruit-trigger");
await page.mouse.click(5, 5);
check("select: pointer down outside closes", (await page.$("#fruit-popover")) === null);

check("no runtime errors", errors.length === 0, errors.join(" | "));
await browser.close();
for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.ok || !r.detail ? "" : `  (${r.detail})`}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} interaction checks pass.`);
process.exitCode = failed ? 1 : 0;
