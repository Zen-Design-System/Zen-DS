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
async function fixture(label, html, check, kind, { finds = [], not = [], clean = false, args = { scopeSel: ".official-platform" } } = {}) {
  await page.setContent(html);
  let result;
  try { result = await CHECKS[check](args); } catch (error) { ok(`${label}: ${check} runs`, false, error.message.split("\n")[0]); return; }
  const found = result?.[kind] ?? [];
  if (PRINT) console.log(`· ${label} [${kind}]\n${found.map((item) => `    ${item}`).join("\n") || "    (none)"}`);
  if (clean) ok(`${label}: no ${kind}`, found.length === 0, found.join("\n    "));
  for (const part of finds) ok(`${label}: ${kind} names ${JSON.stringify(part)}`, found.some((item) => item.includes(part)), found.join("\n    ") || "(no findings)");
  for (const part of not) ok(`${label}: ${kind} leaves out ${JSON.stringify(part)}`, !found.some((item) => item.includes(part)), found.join("\n    "));
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

/* ── item-row-gap (widgetLayout): Tags side by side, Badges side by side, 4px apart ───────────────────────────────── */
{
  // Sized by hand: the fixtures load the tokens, not the components' CSS.
  const box = "display: inline-flex; flex: none; width: 64px; height: 24px";
  const tag = (name = "Tag") => `<span class="zen-tag" style="${box}">${name}</span>`;
  const badge = (name = "Badge", extra = "") => `<span class="zen-badge${extra}" style="${box}">${name}</span>`;
  const chip = (name = "Chip") => `<button type="button" class="zen-chip" style="${box}">${name}</button>`;
  const row = (items, style = "gap: 8px", cls = "zen-row") => `<div class="${cls}" style="display: flex; align-items: center; ${style}">${items}</div>`;
  const W = "widgetLayout", K = "item-row-gap";
  await fixture("item-row-gap: person Tags 8px apart (PropertyField, 2026-10-26)", docsPage(example("Tags 8", row(`<span>${tag("Hà")}</span><span>${tag("Minh")}</span><span>${tag("Lan")}</span>`, "gap: 8px", "zen-property-value"))), W, K, { finds: ["tags side by side in div.zen-property-value sit 8px apart across"] });
  await fixture("item-row-gap: Tags 4px across but 8px down the wrap", docsPage(example("Tags wrap", row([1, 2, 3, 4, 5].map((n) => `<span role="listitem">${tag(`T${n}`)}</span>`).join(""), "flex-wrap: wrap; gap: 8px 4px; width: 210px"))), W, K, { finds: ["tags side by side in div.zen-row sit 8px apart down the wrap"] });
  await fixture("item-row-gap: Tags 4px across and down", docsPage(example("Tags 4", row([1, 2, 3, 4, 5].map((n) => tag(`T${n}`)).join(""), "flex-wrap: wrap; gap: var(--zen-spacing-gap-2-xsmall); width: 210px"))), W, K, { clean: true });
  await fixture("item-row-gap: Badges 8px apart (TopNavigation's badge row)", docsPage(example("Badges 8", row(badge("Pro") + badge("Admin"), "gap: 8px", "zen-top-nav__badges"))), W, K, { finds: ["badges side by side in div.zen-top-nav__badges sit 8px apart across"] });
  await fixture("item-row-gap: a Badge and a BadgeStatus 4px apart", docsPage(example("Badges 4", row(badge("Design") + badge("In progress", " zen-badge-status"), "gap: 4px"))), W, K, { clean: true });
  await fixture("item-row-gap: a Chip row stays 8px", docsPage(example("Chips", row(chip("Day") + chip("Week") + chip("Month"), "gap: 8px"))), W, K, { clean: true });
  await fixture("item-row-gap: a Tag beside a Badge is not a row of either", docsPage(example("Mixed", row(tag("Design") + badge("New"), "gap: 8px"))), W, K, { clean: true });
  await fixture("item-row-gap: Tags 4px apart, the + Gap/XSmall after them", docsPage(example("Plus", row(`<span class="zen-slot" style="display: flex; gap: 4px">${tag("Hà")}${tag("Minh")}</span><button type="button" style="width: 24px; height: 24px">+</button>`, "gap: 8px"))), W, K, { clean: true });
  await fixture("item-row-gap: Badges spread on purpose (space-between)", docsPage(example("Spread", row(badge("Paid") + badge("Due"), "justify-content: space-between; width: 300px"))), W, K, { clean: true });
  await fixture("item-row-gap: a counter beside a Badge", docsPage(example("Counter", row(badge("Inbox") + badge("3", " zen-badge--counter"), "gap: 8px"))), W, K, { clean: true });
  await fixture("item-row-gap: a Don't visual is not judged", docsPage(example("Dont", `<div data-verdict="dont">${row(tag() + tag(), "gap: 12px")}</div>`)), W, K, { clean: true });
}

/* ── text-tone (qualityChecks): titles Strongest; Caption text, labels and Subtexts their family's Light level ───────────── */
{
  const Q = "qualityChecks", K = "text-tone";
  const cap = (words, tone, cls = "zen-type-caption-regular", attrs = "") => `<span class="${cls}"${attrs} style="color: var(--zen-color-content-${tone})">${words}</span>`;
  await fixture("text-tone: a Caption in Neutral/Base (Calendar agenda meta, 2026-10-26)", docsPage(example("Meta", cap("Room 2 · Google Meet", "neutral-base"))), Q, K, { finds: ["is caption-regular in content-neutral-base", "content-neutral-light"] });
  await fixture("text-tone: a Caption/Medium name in Strongest on a Surface", docsPage(example("Name", `<div style="background: var(--zen-color-background-surface-default); padding: 8px">${cap("Alex Duong", "neutral-strongest", "zen-type-caption-medium")}</div>`)), Q, K, { finds: ["is caption-medium in content-neutral-strongest"] });
  await fixture("text-tone: a Metric-Tile label in Base (the user 2026-10-26)", docsPage(example("Tile", `<div class="zen-metric-tile">${cap("Success rate", "neutral-base", "zen-metric-tile__label zen-type-body-small-medium")}</div>`)), Q, K, { finds: ["is a label in content-neutral-base"] });
  await fixture("text-tone: an error Caption in Negative/Strongest", docsPage(example("Error", cap("Optional", "negative-strongest"))), Q, K, { finds: ["content-negative-light"] });
  await fixture("text-tone: Light, a colour family's Light, the Lights group's Base", docsPage(example("Good", cap("2 KB", "neutral-light") + cap("File too large", "negative-light") + cap("Expires soon", "warning-base", "zen-type-caption-medium") + `<div class="zen-metric-tile">${cap("Success rate", "neutral-light", "zen-metric-tile__label zen-type-body-small-medium")}</div>`)), Q, K, { clean: true });
  await fixture("text-tone: text on its own Subtle fill follows the fill (a Badge, an event)", docsPage(example("Fill", `<span style="display: inline-block; background: var(--zen-color-background-support-blue-subtle)">${cap("Design", "support-blue-strongest", "zen-type-caption-medium")}</span>`)), Q, K, { clean: true });
  await fixture("text-tone: a state (today, a disabled control) keeps its token", docsPage(example("States", cap("Wed 30", "accent-strongest", "zen-type-caption-medium", " data-today") + `<button type="button" disabled>${cap("10:30", "neutral-strongest", "zen-type-caption-medium")}</button>`)), Q, K, { clean: true });
  await fixture("text-tone: a slot's time alone in its label, a name alone under its avatar (main values, the user 2026-10-26)", docsPage(example("Values", `<label>${cap("10:30", "neutral-strongest", "zen-type-caption-medium")}</label><div class="zen-schedule-resource"><span class="zen-avatar">AD</span>${cap("Alex Duong", "neutral-strongest", "zen-type-caption-medium")}</div>`)), Q, K, { clean: true });
  await fixture("text-tone: a caption beside its title is supporting text", docsPage(example("Row", `<label><span class="zen-type-body-small-medium">Email me</span>${cap("Weekly digest", "neutral-base")}</label>`)), Q, K, { finds: ["is caption-regular in content-neutral-base"] });
  await fixture("text-tone: a title in Base, a Subtext in Base (the user 2026-10-26)", docsPage(example("Header", `<div class="zen-page-header"><h2 class="zen-type-heading-4" style="color: var(--zen-color-content-neutral-base)">Orders</h2><p class="zen-page-header__description zen-type-body-base-regular" style="color: var(--zen-color-content-neutral-base)">All orders this month</p></div>`)), Q, K, { finds: ["is a title in content-neutral-base", "is a heading's Subtext in content-neutral-base"] });
  await fixture("text-tone: an error step's title in Negative/Base", docsPage(example("Step", `<span class="zen-stepper__title zen-type-body-base-bold" style="color: var(--zen-color-content-negative-base)">Payment</span><h3 class="zen-type-body-small-bold" style="color: var(--zen-color-content-neutral-base)">Today</h3>`)), Q, K, { finds: ["content-negative-strongest", "\"Today\" (h3"] });
  await fixture("text-tone: a Strongest title, a Light Subtext, a Light kicker, a past item's title", docsPage(example("Good", `<h2 class="zen-type-heading-4" style="color: var(--zen-color-content-neutral-strongest)">Orders</h2><p class="zen-page-header__description zen-type-body-base-regular" style="color: var(--zen-color-content-neutral-light)">All orders</p><h3 class="zen-type-body-small-bold" style="color: var(--zen-color-content-neutral-light)">Today</h3><div data-status="past"><span class="zen-schedule-stop__title zen-type-body-base-medium" style="color: var(--zen-color-content-neutral-light)">Workshop</span></div>`)), Q, K, { clean: true });
  await fixture("text-tone: a heading's subtitle, time and child crumb, a styled run, a counter (gate 2026-10-26)", docsPage(example("Parts", `<h2 class="zen-top-nav__identity zen-type-body-base-bold" style="color: var(--zen-color-content-neutral-strongest)"><span class="zen-top-nav__identity-title">Chi Tran</span><span class="zen-top-nav__identity-subtitle zen-type-caption-regular" style="color: var(--zen-color-content-neutral-light)">Active now</span></h2><h3 class="zen-type-body-base-bold" style="color: var(--zen-color-content-neutral-strongest)"><span class="zen-chat-convo__name">Hà</span><span class="zen-chat-convo__time zen-type-caption-regular" style="color: var(--zen-color-content-neutral-light)">9:48 am</span></h3><h1 class="zen-type-heading-1" style="color: var(--zen-color-content-neutral-strongest)">Morning <span class="zen-text zen-type-heading-1" style="color: var(--zen-color-content-neutral-light)">Alexander</span></h1><span class="zen-badge zen-badge--counter"><span class="zen-type-caption-medium" style="color: var(--zen-color-content-neutral-strongest)">3</span></span>`)), Q, K, { clean: true });
  await fixture("text-tone: a time inside a title part is not the title; the name is (Chat inbox, gate 2026-10-26)", docsPage(example("Convo", `<span class="zen-list-item__title"><span class="zen-chat-convo__title"><span class="zen-chat-convo__name zen-type-body-base-bold" style="color: var(--zen-color-content-neutral-base)">Hà</span><span class="zen-chat-convo__time zen-type-body-small-regular" style="color: var(--zen-color-content-neutral-light)">9:48 am</span></span></span>`)), Q, K, { finds: ["\"Hà\" (span.zen-chat-convo__name", "is a title in content-neutral-base"], not: ["9:48 am"] });
  await fixture("text-tone: Body/Small meta in Base is not a Caption", docsPage(example("Body", cap("Updated 2 min ago", "neutral-base", "zen-type-body-small-regular"))), Q, K, { clean: true });
}

/* ── table-lead (widgetLayout): a Table's first column, the row's name ─────────────────────────────────────────── */
{
  // A Table as Table.tsx renders it: rows of cells, a selectable table's checkbox cell first.
  const avatar = (background, initials = "MA", extra = "") => `<span class="zen-avatar" data-size="small" data-tone="neutral" data-background="${background}" data-shape="circle">${extra}<span class="zen-avatar__initials">${initials}</span></span>`;
  const photo = `<span class="zen-avatar" data-size="small" data-tone="photo" data-background="subtle" data-shape="circle"><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></span>`;
  const dock = (size, tone = "neutral") => `<span class="zen-dock-icon" data-size="${size}" data-tone="${tone}" data-background="subtle" aria-hidden="true"></span>`;
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
  await fixture("table-lead: an emoji Dock Icon at Small in the first column", docsPage(example("Emoji small", table([[media(dock("small", "emoji"), "Annual leave")]], { name: "Leaves" }))), W, K, { finds: ['table "Leaves" draws its first column\'s emoji Dock Icon small (1 row)'] });
  await fixture("table-lead: an emoji Dock Icon at Medium in the first column", docsPage(example("Emoji medium", table([[media(dock("medium", "emoji"), "Annual leave")]], { name: "Leaves" }))), W, K, { clean: true });
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
 * A page that never answers (its script spins after load) is audited again in a new browser, then reported by name, and the
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
  const run = await new Promise((resolve) => execFile(process.execPath, args, { cwd: root, timeout: 120_000, killSignal: "SIGKILL" }, (error, stdout) => resolve({ code: error?.code ?? 0, stdout })));
  server.close();
  const report = (() => { try { return JSON.parse(fs.readFileSync(out, "utf8")); } catch { return null; } })();
  const pages = report?.pages ?? {};
  ok("watchdog: the run ends and fails on the hung page", run.code === 1, `exit ${run.code}\n    ${run.stdout.split("\n").slice(-4).join("\n    ")}`);
  ok("watchdog: the hung page is reported by name", (pages["hang@1512"]?.errors ?? []).some((e) => /did not answer within 3s, twice/.test(e)), JSON.stringify(pages["hang@1512"] ?? null));
  ok("watchdog: it is audited again in a new browser first", /↻ hang@1512: no answer in 3s \(at [a-z ]+; the dev server answers\) — auditing it again in a new browser/.test(run.stdout), run.stdout.split("\n").slice(0, 6).join("\n    "));
  ok("watchdog: the pages around it are still audited", Boolean(pages["before@1512"]) && Boolean(pages["after@1512"]), Object.keys(pages).join(", "));
}

/* ── a browser that stops answering (CI 2026-10-27: five runs silent for 18–30 min, cancelled at 45) ──────────────────
 * Asked for ?page=freeze, the fixture server stops the audit's Chromium (SIGSTOP on the browser process): no call on it
 * settles any more, closing the tab included, which is what the tab-closing watchdog of 2026-10-24 waited on forever
 * (and a SIGTERM did not end it either, as CI's cancelled runs left the audit and Chromium running).
 * 1. The audit must give up on the page after --page-timeout, kill that browser, audit the page again in a new one,
 *    report it by name, audit the page after it, and exit.
 * 2. A SIGTERM while the browser is frozen (CI cancelling the job) must end the audit at once.
 * Neither may leave a Chromium process behind. A run past the cap is killed with SIGKILL, so the self-test never hangs. */
{
  const html = (body) => `<!doctype html><html><head><meta charset="utf-8"></head><body><div class="official-platform">${body}</div></body></html>`;
  const table = () => new Promise((resolve) => execFile("ps", ["-A", "-o", "pid=,ppid=,stat=,command="], (error, stdout) => resolve((stdout ?? "").split("\n").map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/)).filter(Boolean).map(([, pid, ppid, stat, command]) => ({ pid: Number(pid), ppid: Number(ppid), stat, command })))));
  const descendants = (rows, pid) => { const out = []; for (let i = 0, queue = [pid]; i < queue.length; i++) for (const r of rows) if (r.ppid === queue[i]) { queue.push(r.pid); out.push(r); } return out; };
  /** Runs audit.mjs on before,freeze,after against a server that freezes its browser; `onFrozen(audit)` runs after each freeze. */
  async function frozenRun(extra, onFrozen = () => undefined) {
    let audit = null;
    const started = new Set(); // every Chromium process of the audit seen while it ran
    const server = http.createServer(async (req, res) => {
      const id = new URL(req.url, "http://localhost").searchParams.get("page");
      if (id === "freeze" && audit) {
        const chromium = descendants(await table(), audit.pid).filter((r) => /chrom|headless/i.test(r.command));
        for (const r of chromium) started.add(r.pid);
        for (const r of chromium.filter((r) => r.ppid === audit.pid)) process.kill(r.pid, "SIGSTOP"); // the browser process
        if (chromium.length) setTimeout(() => onFrozen(audit), 500);
      }
      res.writeHead(200, { "content-type": "text/html" });
      res.end(html(example(id ?? "home", "<p>Fine</p>")));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "zen-audit-freeze-")), "report.json");
    const args = ["tools/platform-audit/audit.mjs", `--url=http://127.0.0.1:${server.address().port}`, "--pages=before,freeze,after", "--viewports=1512", "--no-playground", "--no-baseline", `--out=${out}`, ...extra];
    const t0 = Date.now();
    const run = await new Promise((resolve) => { audit = execFile(process.execPath, args, { cwd: root, timeout: 120_000, killSignal: "SIGKILL" }, (error, stdout) => resolve({ code: error?.code ?? 0, signal: error?.signal, stdout })); });
    run.seconds = Math.round((Date.now() - t0) / 1000);
    server.close();
    await new Promise((resolve) => setTimeout(resolve, 1000)); // the killed processes are reaped
    const left = (await table()).filter((r) => started.has(r.pid) && !r.stat.startsWith("Z"));
    for (const r of left) { try { process.kill(r.pid, "SIGKILL"); } catch { /* gone */ } } // never leave a stopped browser behind
    run.leftover = started.size ? left.map((r) => `${r.pid} ${r.stat} ${r.command.slice(0, 80)}`) : ["no Chromium process was found to stop"];
    run.pages = (() => { try { return JSON.parse(fs.readFileSync(out, "utf8")).pages; } catch { return {}; } })();
    run.tail = run.stdout.split("\n").slice(-6).join("\n    ");
    return run;
  }

  const run = await frozenRun(["--page-timeout=3"]);
  const { pages } = run;
  ok("frozen browser: the run ends by itself, well before the 120 s cap", !run.signal && run.seconds < 90, `${run.signal ? `killed by ${run.signal}` : `exit ${run.code}`} after ${run.seconds}s\n    ${run.tail}`);
  ok("frozen browser: it fails on the frozen page", run.code === 1, `exit ${run.code}\n    ${run.tail}`);
  ok("frozen browser: the page is reported by name, with its step", (pages["freeze@1512"]?.errors ?? []).some((e) => /did not answer within 3s, twice \(at loading; the dev server answers/.test(e)), JSON.stringify(pages["freeze@1512"] ?? null));
  ok("frozen browser: it is audited again in a new browser first", /↻ freeze@1512: no answer in 3s .*a new browser/.test(run.stdout), run.stdout.split("\n").slice(0, 6).join("\n    "));
  ok("frozen browser: the pages around it are still audited", Boolean(pages["before@1512"]) && Boolean(pages["after@1512"]), Object.keys(pages).join(", "));
  ok("frozen browser: no Chromium process of the audit is left", run.leftover.length === 0, run.leftover.join("\n    "));

  const term = await frozenRun(["--page-timeout=60"], (audit) => audit.kill("SIGTERM"));
  ok("frozen browser + SIGTERM: the audit ends at once", term.signal !== "SIGKILL" && term.seconds < 20, `${term.signal ? `killed by ${term.signal}` : `exit ${term.code}`} after ${term.seconds}s\n    ${term.tail}`);
  ok("frozen browser + SIGTERM: no Chromium process of the audit is left", term.leftover.length === 0, term.leftover.join("\n    "));
}
if (failures.length) {
  console.log(`Platform-audit self-test: ${passed} passed, ${failures.length} failed`);
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`Platform-audit self-test: ${passed} passed`);
