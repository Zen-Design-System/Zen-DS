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
import fs from "node:fs";
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
  const phone = (inner) => `<div class="platform-phone" style="width: 240px">${inner}</div>`;
  const S = "segmentedFit";
  await fixture("segmented-fit: slides sideways in a phone", docsPage(example("Four periods", phone(segmented(["Day", "Week", "Month", "Quarter"], false)))), S, "segmented-fit", { finds: ['Segmented "Period" slides sideways on a phone (its 4 items are wider'] });
  await fixture("segmented-fit: a fullWidth label cut to an ellipsis", docsPage(example("Long labels", phone(segmented(["Everything that happened", "Mentions only"], true)))), S, "segmented-fit", { finds: ['Segmented "Period" cuts', '("Everything that happ")'] });
  await fixture("segmented-fit: every label fits its share", docsPage(example("Two views", phone(segmented(["List", "Board"], true)))), S, "segmented-fit", { clean: true });
  await fixture("segmented-fit: wide on a desktop page is no phone", docsPage(example("Desktop", `<div style="width: 240px">${segmented(["Day", "Week", "Month", "Quarter"], false)}</div>`)), S, "segmented-fit", { clean: true });
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

/* ── card-gap, legend-column (widgetLayout) ─────────────────────────────────────────────────────────────────────── */
{
  const card = (height) => `<div class="zen-metric-card" style="padding: 0"><p class="zen-metric-card__title zen-type-body-small-regular" style="margin: 0; height: ${height}px">Metric</p></div>`;
  const cards = (a, b) => `<div style="display: flex; align-items: stretch; gap: 16px">${card(a)}${card(b)}</div>`;
  await fixture("card-gap: a stretched card that stops short", docsPage(example("Short card", cards(40, 96))), "widgetLayout", "card-gap", { finds: ['MetricCard "Metric" stops 56px above its foot'] });
  await fixture("card-gap: cards that fill the row", docsPage(example("Full cards", cards(96, 96))), "widgetLayout", "card-gap", { clean: true });
  const legend = (display) => `<div class="zen-chart-block" style="width: 600px"><div style="height: 80px">chart</div><div class="zen-chart__legend" style="display: ${display}; gap: 8px">${["North", "South", "East"].map((name) => `<span style="display: block; width: 80px">${name}</span>`).join("")}</div></div>`;
  await fixture("legend-column: three items one per line under the chart", docsPage(example("Legend column", legend("block"))), "widgetLayout", "legend-column", { finds: ["a chart legend stacks its 3 items in a column"] });
  await fixture("legend-column: a legend that wraps as a row", docsPage(example("Legend row", legend("flex"))), "widgetLayout", "legend-column", { clean: true });
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
if (failures.length) {
  console.log(`Platform-audit self-test: ${passed} passed, ${failures.length} failed`);
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`Platform-audit self-test: ${passed} passed`);
