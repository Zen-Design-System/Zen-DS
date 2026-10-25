#!/usr/bin/env node
/**
 * Platform-audit self-test (BACKLOG "a durable selftest for the quality/outline runtime checks", the user 2026-10-24).
 * The in-page checks (quality-checks.mjs, and audit.mjs pageChecks for the outline) run on small fixture pages in
 * headless Chromium, with the real token and text-style CSS: each kind must find what its fixture breaks and nothing on
 * the clean twin. No dev server: the fixtures are set as page content.
 *
 *   node tools/platform-audit/selftest.mjs            (npm run platform:audit:selftest)
 *   node tools/platform-audit/selftest.mjs --print    also prints every finding of every fixture
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { controlClip, qualityChecks, segmentedFit, textFit, widgetLayout } from "./quality-checks.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const require = createRequire(path.join(root, "package.json"));
const { chromium } = require("playwright");
const PRINT = process.argv.includes("--print");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

// The tokens and text styles the checks resolve (the platform shell's own CSS is not needed).
const CSS = ["src/styles/tokens.css", "src/styles/typography.css"].map(read).join("\n");
// pageChecks lives in audit.mjs, a script that runs when imported: its source is cut out by its top-level braces and
// evaluated in the page.
const auditSource = read("tools/platform-audit/audit.mjs");
const pageChecksStart = auditSource.indexOf("function pageChecks(");
const pageChecksSource = pageChecksStart < 0 ? "" : auditSource.slice(pageChecksStart, auditSource.indexOf("\n}\n", pageChecksStart) + 2);

let passed = 0;
const failures = [];
const ok = (label, condition, detail = "") => { if (condition) passed += 1; else failures.push(detail ? `${label}\n    ${detail}` : label); };

/** A docs page holding examples: each is a card with a title and a stage, as the platform renders them. */
const example = (title, stage, attrs = "") => `<div class="pe-card"${attrs}><h3>${title}</h3><div class="pe-card__stage">${stage}</div></div>`;
const docsPage = (...examples) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style><style>body { margin: 0; } .pe-card { margin: 24px; } .pe-card > h3 { margin: 0 0 8px; }</style></head><body><div class="official-platform">${examples.join("")}</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
const pageChecks = (args) => page.evaluate(`(${pageChecksSource})(${JSON.stringify(args)})`);
const CHECKS = { pageChecks, qualityChecks: (args) => page.evaluate(qualityChecks, args), textFit: (args) => page.evaluate(textFit, args), widgetLayout: (args) => page.evaluate(widgetLayout, args), controlClip: (args) => page.evaluate(controlClip, args), segmentedFit: (args) => page.evaluate(segmentedFit, args) };

/**
 * One fixture: its page, the check, the kind, and what it must report (`finds`: substrings, each in some finding) or
 * that it reports nothing of that kind (`clean`).
 */
async function fixture(label, html, check, kind, { finds = [], clean = false, args = { scopeSel: ".official-platform" } } = {}) {
  await page.setContent(html);
  let result;
  try { result = await CHECKS[check](args); } catch (error) { ok(`${label}: ${check} runs`, false, error.message.split("\n")[0]); return; }
  const found = result?.[kind] ?? [];
  if (PRINT) console.log(`· ${label} [${kind}]\n${found.map((item) => `    ${item}`).join("\n") || "    (none)"}`);
  if (clean) ok(`${label}: no ${kind}`, found.length === 0, found.join("\n    "));
  for (const part of finds) ok(`${label}: ${kind} names ${JSON.stringify(part)}`, found.some((item) => item.includes(part)), found.join("\n    ") || "(no findings)");
}

ok("audit.mjs pageChecks found", pageChecksSource.startsWith("function pageChecks(") && pageChecksSource.trimEnd().endsWith("}"));
// The gate (tools/qa/run.mjs ERROR_KINDS) fails on the kinds the audit calls errors (audit.mjs SEVERITY), no more, no less.
{
  const severity = Function(`return ${auditSource.match(/const SEVERITY = (\{[^\n]*\});/)?.[1] ?? "{}"}`)();
  const gate = Function(`return ${read("tools/qa/run.mjs").match(/const ERROR_KINDS = new Set\((\[[^\n]*\])\);/)?.[1] ?? "[]"}`)();
  const audit = [...Object.keys(severity).filter((kind) => severity[kind] === "error"), "playground", "smoke"].sort();
  ok("gate ERROR_KINDS = audit.mjs SEVERITY errors (+ playground, smoke)", JSON.stringify([...gate].sort()) === JSON.stringify(audit), `gate: ${[...gate].sort().join(", ")}\n    audit: ${audit.join(", ")}`);
}

/* ── clip (controlClip) ─────────────────────────────────────────────────────────────────────────────────────────── */
{
  const row = (overflow, wrap = "nowrap") => `<div style="display: flex; width: 200px; overflow: ${overflow}"><div role="radiogroup" aria-label="View" style="display: flex; flex-shrink: 0; flex-wrap: ${wrap}">${["One", "Two", "Three", "Four"].map((name) => `<button style="width: 90px; flex-shrink: 0">${name}</button>`).join("")}</div></div>`;
  await fixture("clip: a flex-shrink: 0 group in a clipping row", docsPage(example("Clipped row", row("hidden"))), "controlClip", "clip", { finds: ['"Three" is cut off by div (70px of it hidden, across)', '"Four" is hidden past the edge of div while 3 of its siblings show'] });
  await fixture("clip: the same row scrolls", docsPage(example("Scrolling row", row("auto"))), "controlClip", "clip", { clean: true });
  await fixture("clip: a collapsed group", docsPage(example("Collapsed", `<div style="height: 0; overflow: hidden"><button>Hidden A</button><button>Hidden B</button></div>`)), "controlClip", "clip", { clean: true });
  await fixture("clip: a phone screen shows the top of a longer page", docsPage(example("Phone", `<div class="platform-phone" style="width: 200px; height: 100px; overflow: hidden"><div style="height: 300px; padding-top: 80px"><button>Below the fold</button></div></div>`)), "controlClip", "clip", { clean: true });
  const covered = (cover, top = 0) => `<div style="position: relative; height: 120px; margin-top: ${top}px"><button style="position: absolute; left: 10px; top: 10px; width: 120px; height: 40px">Under</button>${cover}</div>`;
  const panel = (attrs) => `<div ${attrs} style="position: absolute; left: 0; top: 0; width: 200px; height: 100px; background: #fff">Panel</div>`;
  await fixture("clip: a card under a docked panel", docsPage(example("Docked", covered(panel('class="docked-panel" role="complementary"')))), "controlClip", "clip", { finds: ['"Under" is covered by div.docked-panel'] });
  await fixture("clip: covered far down the page (the window scrolls to it)", docsPage(example("Far", covered(panel('class="docked-panel"'), 2400))), "controlClip", "clip", { finds: ['"Under" is covered by div.docked-panel'] });
  await fixture("clip: a modal dialog over the page", docsPage(example("Modal", covered(panel('role="dialog" aria-modal="true"')))), "controlClip", "clip", { clean: true });
  await fixture("clip: an invisible hit area", docsPage(example("Hit area", covered(`<div style="position: absolute; inset: 0; opacity: 0"></div>`))), "controlClip", "clip", { clean: true });
  await fixture("clip: a bar over the scroll container", docsPage(example("Bar", `<div style="position: relative; height: 150px"><div style="height: 150px; overflow: auto"><div style="height: 400px; padding-top: 110px"><button>Row</button></div></div><div style="position: absolute; left: 0; right: 0; bottom: 0; height: 50px; background: #eee">Bar</div></div>`)), "controlClip", "clip", { clean: true });
  await fixture("clip: content under a sticky bottom bar", docsPage(example("Sticky bar", `<div style="height: 400px"><div style="height: 300px"></div><button style="height: 40px">Under the bar</button><div style="position: sticky; bottom: 0; height: 120px; margin-top: -60px; background: #eee">Bar</div></div>`)), "controlClip", "clip", { clean: true });
  await fixture("clip: data-audit-skip-quality", docsPage(example("Skipped", `<div data-audit-skip-quality>${row("hidden")}</div>`)), "controlClip", "clip", { clean: true });
}

/* ── segmented-fit (segmentedFit) ─────────────────────────────────────────────────────────────────────────────── */
{
  // The Segmented's own layout (segmented.css), inline: the root scrolls sideways; fullWidth items share it and ellipsize.
  const item = (name, full) => `<button class="zen-segmented__item" style="${full ? "flex: 1 1 0; min-width: 0" : "flex: none; width: 96px"}"><span class="zen-segmented__label" style="display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">${name}</span></button>`;
  const segmented = (names, full) => `<div class="zen-segmented" role="group" aria-label="Period" style="display: flex; width: ${full ? "100%" : "max-content"}; max-width: 100%; overflow-x: auto">${names.map((n) => item(n, full)).join("")}</div>`;
  // A docs phone frame writes the phone breakpoint, as PlatformPhone and a ZenProvider under 744px do.
  const phone = (inner) => `<div class="platform-phone" data-breakpoint="mobile" style="width: 240px">${inner}</div>`;
  const S = "segmentedFit";
  await fixture("segmented-fit: slides sideways in a phone", docsPage(example("Four periods", phone(segmented(["Day", "Week", "Month", "Quarter"], false)))), S, "segmented-fit", { finds: ['Segmented "Period" slides sideways on a phone (its 4 items are wider'] });
  await fixture("segmented-fit: a fullWidth label cut to an ellipsis", docsPage(example("Long labels", phone(segmented(["Everything that happened", "Mentions only"], true)))), S, "segmented-fit", { finds: ['Segmented "Period" cuts', '("Everything that happ")'] });
  await fixture("segmented-fit: every label fits its share", docsPage(example("Two views", phone(segmented(["List", "Board"], true)))), S, "segmented-fit", { clean: true });
  await fixture("segmented-fit: wide on a desktop page is no phone", docsPage(example("Desktop", `<div style="width: 240px">${segmented(["Day", "Week", "Month", "Quarter"], false)}</div>`)), S, "segmented-fit", { clean: true });
  await fixture("segmented-fit: a ZenProvider's mobile breakpoint is a phone at any viewport", docsPage(example("Phone card", `<div data-breakpoint="mobile" style="width: 240px">${segmented(["Day", "Week", "Month", "Quarter"], false)}</div>`)), S, "segmented-fit", { finds: ['Segmented "Period" slides sideways on a phone'] });
  await fixture("segmented-fit: the nearest breakpoint wins (a desktop provider inside a phone frame)", docsPage(example("Nested", phone(`<div data-breakpoint="desktop">${segmented(["Day", "Week", "Month", "Quarter"], false)}</div>`))), S, "segmented-fit", { clean: true });
}

/* ── quality (qualityChecks): scale, roles, hierarchy, rhythm, ladder ───────────────────────────────────────────── */
{
  const Q = "qualityChecks";
  await fixture("scale: a size that is no text style", docsPage(example("Odd size", `<p style="font-size: 15px; line-height: 21px">Fifteen pixels</p>`)), Q, "scale", { finds: ["is 15/21 — no Zen text style"] });
  await fixture("scale: a Zen text style", docsPage(example("Text style", `<p class="zen-type-body-small-regular">Body small</p>`)), Q, "scale", { clean: true });
  await fixture("roles: text painted with a background token", docsPage(example("Wrong role", `<p class="zen-type-body-small-regular" style="color: var(--zen-color-background-accent-solid-default)">Painted</p>`)), Q, "roles", { finds: ["text is painted with background-", "text uses Color/Content/*"] });
  await fixture("roles: text in a content token", docsPage(example("Right role", `<p class="zen-type-body-small-regular" style="color: var(--zen-color-content-neutral-strongest)">Painted</p>`)), Q, "roles", { clean: true });
  await fixture("hierarchy: a content h1 in Heading/4", docsPage(example("Small h1", `<h1 class="zen-type-heading-4">Small page title</h1>`)), Q, "hierarchy", { finds: ["is heading-4 — a content h1"] });
  await fixture("hierarchy: a content h1 in Heading/1", docsPage(example("Big h1", `<h1 class="zen-type-heading-1">Page title</h1>`)), Q, "hierarchy", { clean: true });
  await fixture("rhythm: a title that looks like its text", docsPage(example("Flat", `<h2 class="zen-type-body-small-regular">Same look</h2><p class="zen-type-body-small-regular">The text under it</p>`)), Q, "rhythm", { finds: ['title "Same look" and "The text under it" share'] });
  await fixture("rhythm: a title over its text", docsPage(example("Stepped", `<h2 class="zen-type-heading-3" style="color: var(--zen-color-content-neutral-strongest)">A title</h2><p class="zen-type-body-small-regular">The text under it</p>`)), Q, "rhythm", { clean: true });
  await fixture("ladder: a gap off the ladder", docsPage(example("Gap 10", `<div style="display: flex; flex-direction: column; gap: 10px"><p class="zen-type-body-small-regular">One</p><p class="zen-type-body-small-regular">Two</p></div>`)), Q, "ladder", { finds: ["has gap 10px — not a spacing-ladder step"] });
  await fixture("ladder: a gap on the ladder", docsPage(example("Gap md", `<div style="display: flex; flex-direction: column; gap: var(--zen-spacing-gap-medium)"><p class="zen-type-body-small-regular">One</p><p class="zen-type-body-small-regular">Two</p></div>`)), Q, "ladder", { clean: true });
}

/* ── fit (textFit) ──────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const button = (extra) => `<button class="zen-type-body-small-regular" style="width: 48px; padding: 0; white-space: nowrap; overflow: hidden; ${extra}">A label far too long</button>`;
  await fixture("fit: a label cut off with no ellipsis", docsPage(example("Cut label", button(""))), "textFit", "fit", { finds: ['"A label far too long"', "is cut off with no ellipsis"] });
  await fixture("fit: a label that ellipsizes", docsPage(example("Ellipsis", button("display: block; text-overflow: ellipsis"))), "textFit", "fit", { clean: true });
}

/* ── card-gap, legend-column, toolbar-search (widgetLayout) ─────────────────────────────────────────────────────────────────────── */
{
  const card = (height) => `<div class="zen-metric-card" style="padding: 0"><p class="zen-metric-card__title zen-type-body-small-regular" style="margin: 0; height: ${height}px">Metric</p></div>`;
  const cards = (a, b) => `<div style="display: flex; align-items: stretch; gap: 16px">${card(a)}${card(b)}</div>`;
  await fixture("card-gap: a stretched card that stops short", docsPage(example("Short card", cards(40, 96))), "widgetLayout", "card-gap", { finds: ['MetricCard "Metric" stops 56px above its foot'] });
  await fixture("card-gap: cards that fill the row", docsPage(example("Full cards", cards(96, 96))), "widgetLayout", "card-gap", { clean: true });
  const legend = (display) => `<div class="zen-chart-block" style="width: 600px"><div style="height: 80px">chart</div><div class="zen-chart__legend" style="display: ${display}; gap: 8px">${["North", "South", "East"].map((name) => `<span style="display: block; width: 80px">${name}</span>`).join("")}</div></div>`;
  await fixture("legend-column: three items one per line under the chart", docsPage(example("Legend column", legend("block"))), "widgetLayout", "legend-column", { finds: ["a chart legend stacks its 3 items in a column"] });
  await fixture("legend-column: a legend that wraps as a row", docsPage(example("Legend row", legend("flex"))), "widgetLayout", "legend-column", { clean: true });
  // A Search is width 100% (search.css): in a toolbar row it fills whatever its cell gives it.
  const search = (cls = "") => `<div class="zen-search ${cls}" style="width: 100%"><input type="search" aria-label="Search tasks"></div>`;
  const chip = `<button type="button" style="width: 80px; flex: none">Status</button>`;
  const toolbar = (cell) => `<div style="display: flex; gap: 8px; width: 800px">${cell}${chip}</div>`;
  await fixture("toolbar-search: a Search that fills the toolbar row", docsPage(example("Stretched", toolbar(`<div style="flex: 1 1 0">${search()}</div>`))), "widgetLayout", "toolbar-search", { finds: ['the toolbar Search "Search tasks" is 712px wide'] });
  await fixture("toolbar-search: a Grid column of 320px", docsPage(example("Wide column", `<div style="display: grid; grid-template-columns: minmax(0, 320px) 1fr; gap: 8px; width: 800px">${search()}<div>${chip}</div></div>`)), "widgetLayout", "toolbar-search", { finds: ["is 320px wide beside other controls"] });
  await fixture("toolbar-search: capped at 240", docsPage(example("Capped", toolbar(`<div style="flex: 1 1 0; max-width: 240px">${search()}</div>`))), "widgetLayout", "toolbar-search", { clean: true });
  await fixture("toolbar-search: a Search alone on its row", docsPage(example("Alone", `<div style="display: flex; width: 800px"><div style="flex: 1 1 0">${search()}</div></div>${chip}`)), "widgetLayout", "toolbar-search", { clean: true });
  await fixture("toolbar-search: a phone Search (rounded)", docsPage(example("Rounded", toolbar(`<div style="flex: 1 1 0">${search("zen-search--rounded")}</div>`))), "widgetLayout", "toolbar-search", { clean: true });
  await fixture("toolbar-search: a DashboardHeader Control-Bar slot widened to 320", docsPage(example("Control bar", toolbar(`<div class="zen-dashboard-header__search" style="display: flex; flex: 0 1 320px">${search()}</div>`))), "widgetLayout", "toolbar-search", { finds: ['the toolbar Search "Search tasks" is 320px wide'] });
  await fixture("toolbar-search: DashboardHeader's Control-Bar slot at 240", docsPage(example("Control bar", toolbar(`<div class="zen-dashboard-header__search" style="display: flex; flex: 0 1 240px">${search()}</div>`))), "widgetLayout", "toolbar-search", { clean: true });
}

/* ── table-lead (widgetLayout): a Table's first column, the row's name ─────────────────────────────────────────── */
{
  // A Table as Table.tsx renders it: rows of cells, a selectable table's checkbox cell first.
  const avatar = (background, initials = "MA", extra = "") => `<span class="zen-avatar" data-size="small" data-tone="neutral" data-background="${background}" data-shape="circle">${extra}<span class="zen-avatar__initials">${initials}</span></span>`;
  const photo = `<span class="zen-avatar" data-size="small" data-tone="photo" data-background="subtle" data-shape="circle"><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></span>`;
  const dock = (size) => `<span class="zen-dock-icon" data-size="${size}" data-tone="neutral" data-background="subtle" aria-hidden="true"></span>`;
  const media = (visual, text) => `<span class="zen-table-media">${visual}<span class="zen-table-text">${text}</span></span>`;
  const table = (rows, { selectable = false, name = "Members" } = {}) => `<div class="zen-table"><table class="zen-table__table" aria-label="${name}"><tbody>${rows.map((cells) => `<tr class="zen-table__row">${selectable ? '<td class="zen-table__cell zen-table__select"><input type="checkbox" aria-label="Select row"></td>' : ""}${cells.map((cell) => `<td class="zen-table__cell"><div class="zen-table__content">${cell}</div></td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const W = "widgetLayout", K = "table-lead";
  await fixture("table-lead: a helper's Subtle initials Avatar in the first column", docsPage(example("Helper avatar", table([[media(avatar("subtle", "MA"), "Mai Anh"), "Admin"], [media(avatar("subtle", "BN"), "Bao Nguyen"), "Member"]]))), W, K, { finds: ['table "Members" draws its first column\'s Avatar Subtle with initials (MA, BN; 2 rows)'] });
  await fixture("table-lead: after a selectable table's checkbox cell", docsPage(example("Selectable", table([[media(avatar("subtle"), "Mai Anh"), "Admin"]], { selectable: true }))), W, K, { finds: ["first column's Avatar Subtle"] });
  await fixture("table-lead: a Solid first-column Avatar, a Subtle one later", docsPage(example("Solid", table([[media(avatar("solid"), "Mai Anh"), media(avatar("subtle", "BN"), "Bao Nguyen")]]))), W, K, { clean: true });
  await fixture("table-lead: a photo Avatar stays Subtle", docsPage(example("Photo", table([[media(photo, "Mai Anh"), "Admin"]]))), W, K, { clean: true });
  await fixture("table-lead: an Avatar stack (Group-Avatar-Cell)", docsPage(example("Stack", table([[`<span class="zen-avatar-stack">${avatar("subtle", "A")}${avatar("subtle", "B")}</span>`, "Design"]]))), W, K, { clean: true });
  await fixture("table-lead: an XSmall Dock Icon in the first column", docsPage(example("XSmall dock", table([[media(dock("xsmall"), "Payroll"), media(dock("xsmall"), "Finance")]], { name: "Apps" }))), W, K, { finds: ['table "Apps" draws its first column\'s Dock Icon xsmall (1 row)'] });
  await fixture("table-lead: a Medium Dock Icon in the first column", docsPage(example("Medium dock", table([[media(dock("medium"), "Payroll")], [media(dock("medium"), "Billing")]], { name: "Apps" }))), W, K, { finds: ["Dock Icon medium (2 rows)"] });
  await fixture("table-lead: a Small first-column Dock Icon, an XSmall one later", docsPage(example("Small dock", table([[media(dock("small"), "Payroll"), media(dock("xsmall"), "Finance")]], { name: "Apps" }))), W, K, { clean: true });
  await fixture("table-lead: a Don't visual is not judged", docsPage(example("Dont", `<div data-verdict="dont">${table([[media(dock("xsmall"), "Payroll")]])}</div>`)), W, K, { clean: true });
}

/* ── outline, outline-h1 / -start / -card / -siblings (audit.mjs pageChecks) ────────────────────────────────────── */
{
  const P = "pageChecks";
  const args = { scopeSel: ".official-platform", mobile: false };
  await fixture("outline: two h1 on one page", docsPage(example("Two titles", `<h1 class="zen-type-heading-1">One</h1><h1 class="zen-type-heading-1">Two</h1>`)), P, "outline", { args, finds: ["2 h1 on one page"] });
  await fixture("outline: h1 then h3", docsPage(example("Skipped level", `<h1 class="zen-type-heading-1">Title</h1><h3 class="zen-type-heading-3">Section</h3>`)), P, "outline", { args, finds: ['"Section" is h3 right under h1'] });
  await fixture("outline: h1 then h2", docsPage(example("Stepped", `<h1 class="zen-type-heading-1">Title</h1><h2 class="zen-type-heading-3">Section</h2>`)), P, "outline", { args, clean: true });
  const phone = (inner) => `<div class="platform-phone" aria-label="Phone">${inner}</div>`;
  await fixture("outline-h1: a phone screen with no h1", docsPage(example("No title", phone(`<h2 class="zen-type-heading-3">Section</h2>`))), P, "outline-h1", { args, finds: ["no h1"] });
  await fixture("outline-start: a phone screen that starts at h2", docsPage(example("Late title", phone(`<h2 class="zen-type-heading-3">Section</h2><h1 class="zen-type-heading-1">Title</h1>`))), P, "outline-start", { args, finds: ['the outline starts at h2 "Section"'] });
  await fixture("outline-h1 / -start: a phone screen named by its h1", docsPage(example("Named", phone(`<h1 class="zen-type-heading-1">Title</h1><h2 class="zen-type-heading-3">Section</h2>`))), P, "outline-h1", { args, clean: true });
  await fixture("outline-card: a heading larger than its card's title", docsPage(example("Card", `<div class="zen-card"><h3 class="zen-type-heading-subheading">Card title</h3><h4 class="zen-type-heading-2">Bigger</h4></div>`)), P, "outline-card", { args, finds: ['"Bigger" (h4'] });
  await fixture("outline-siblings: sibling sections in two styles", docsPage(example("Sections", `<h1 class="zen-type-heading-1">Title</h1><section><h2 class="zen-type-heading-3">First</h2></section><section><h2 class="zen-type-heading-4">Second</h2></section>`)), P, "outline-siblings", { args, finds: ["sibling h2"] });
  await fixture("outline-siblings: sibling sections in one style", docsPage(example("Sections", `<h1 class="zen-type-heading-1">Title</h1><section><h2 class="zen-type-heading-3">First</h2></section><section><h2 class="zen-type-heading-3">Second</h2></section>`)), P, "outline-siblings", { args, clean: true });
}

await browser.close();

/* ── the audit's page watchdog (audit.mjs --page-timeout; CI hung 45 min on one page, 2026-10-24) ───────────────────
 * A page that never answers (its script spins after load) is audited again in a new tab, then reported by name, and the
 * pages after it are still audited. The fixture site is served here: audit.mjs runs against it as CI runs it. */
{
  const html = (body) => `<!doctype html><html><head><meta charset="utf-8"></head><body><div class="official-platform">${body}</div></body></html>`;
  const server = http.createServer((req, res) => {
    const id = new URL(req.url, "http://localhost").searchParams.get("page");
    res.writeHead(200, { "content-type": "text/html" });
    res.end(id === "hang" ? html(`<p>Spins</p><script>setTimeout(() => { for (;;) {} }, 50);</script>`) : html(example(id ?? "home", "<p>Fine</p>")));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "zen-audit-watchdog-")), "report.json");
  const args = ["tools/platform-audit/audit.mjs", `--url=http://127.0.0.1:${server.address().port}`, "--pages=before,hang,after", "--viewports=1512", "--no-playground", "--no-baseline", "--page-timeout=3", `--out=${out}`];
  const run = await new Promise((resolve) => execFile(process.execPath, args, { cwd: root, timeout: 120_000 }, (error, stdout) => resolve({ code: error?.code ?? 0, stdout })));
  server.close();
  const report = (() => { try { return JSON.parse(fs.readFileSync(out, "utf8")); } catch { return null; } })();
  const pages = report?.pages ?? {};
  ok("watchdog: the run ends and fails on the hung page", run.code === 1, `exit ${run.code}\n    ${run.stdout.split("\n").slice(-4).join("\n    ")}`);
  ok("watchdog: the hung page is reported by name", (pages["hang@1512"]?.errors ?? []).some((e) => /did not answer within 3s, twice/.test(e)), JSON.stringify(pages["hang@1512"] ?? null));
  ok("watchdog: it is audited again in a new tab first", /↻ hang@1512: no answer in 3s/.test(run.stdout), run.stdout.split("\n").slice(0, 6).join("\n    "));
  ok("watchdog: the pages around it are still audited", Boolean(pages["before@1512"]) && Boolean(pages["after@1512"]), Object.keys(pages).join(", "));
}
if (failures.length) {
  console.log(`Platform-audit self-test: ${passed} passed, ${failures.length} failed`);
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`Platform-audit self-test: ${passed} passed`);
