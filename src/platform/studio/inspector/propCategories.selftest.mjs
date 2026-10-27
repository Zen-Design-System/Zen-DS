#!/usr/bin/env node
// Zen Studio property categories (./propCategories.ts, imported directly: Node strips the types): the spec card's
// placements for Metric card, Button and Table (docs/context/session-log-2026-10-27.md), read from the API JSON.
// Run: node src/platform/studio/inspector/propCategories.selftest.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROP_CATEGORIES, propCategory } from "./propCategories.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const api = JSON.parse(fs.readFileSync(path.join(root, "src/platform/api.generated.json"), "utf8"));
const apiOf = (name) => Object.values(api).flat().find((entry) => entry.name === name);

const failures = [];
let passed = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

check("the four groups in order", PROP_CATEGORIES.map((category) => `${category.label}${category.open ? "" : " (folded)"}`), ["Content", "Look", "Behavior (folded)", "Advanced (folded)"]);

/** The category of each named prop of a component, from the API JSON; `hints` name the Figma variants and toggles. */
function placements(component, names, hints = {}) {
  const entry = apiOf(component);
  const out = {};
  for (const name of names) {
    // `disabled` is an inherited HTML boolean (propSchema.ts inheritedBooleans), not in the component's own props.
    const prop = entry.props.find((candidate) => candidate.name === name) ?? { name, type: name === "disabled" ? "boolean" : "", description: "" };
    out[name] = propCategory(component, prop, hints[name]);
  }
  return out;
}

// Metric card (screenshot 15 of the review): 18 flat rows become four groups.
const metric = placements("MetricCard",
  ["type", "variant", "size", "trend", "counter", "metricColor", "value", "label", "subAction", "series", "goal", "comparison", "categories", "footer", "custom", "hint", "labelIcon", "icon", "theme", "color", "surface", "spacing", "iconTheme", "iconBackground", "iconSize", "span", "rowSpan", "animate", "seriesLabel", "currency", "format", "headingLevel"],
  { type: "variant", variant: "variant", size: "variant", trend: "toggle", counter: "toggle", metricColor: "toggle", hint: "toggle", labelIcon: "toggle", custom: "toggle" });
const of = (table, category) => Object.entries(table).filter(([, value]) => value === category).map(([name]) => name);
check("Metric card · Content", of(metric, "content"), ["trend", "counter", "metricColor", "value", "label", "subAction", "series", "goal", "comparison", "categories", "footer", "custom", "hint", "labelIcon", "icon"]);
check("Metric card · Look", of(metric, "look"), ["type", "variant", "size", "theme", "color", "surface", "spacing", "iconTheme", "iconBackground", "iconSize", "span", "rowSpan"]);
check("Metric card · Behavior", of(metric, "behavior"), ["animate"]);
check("Metric card · Advanced", of(metric, "advanced"), ["seriesLabel", "currency", "format", "headingLevel"]);

// Button: Figma's set, level, size and state are looks; the icons and words content; disabled a behavior.
const button = placements("Button", ["appearance", "level", "size", "state", "startIcon", "endIcon", "children", "disabled"], { appearance: "variant", level: "variant", size: "variant", state: "variant" });
check("Button · Content", of(button, "content"), ["startIcon", "endIcon", "children"]);
check("Button · Look", of(button, "look"), ["appearance", "level", "size", "state"]);
check("Button · Behavior", of(button, "behavior"), ["disabled"]);
check("Button · type, ref are code (Advanced when shown)", placements("Button", ["type", "ref"]), { type: "advanced", ref: "advanced" });

// Table (screenshot 09): no Figma groups, one flat form of 9 rows + Columns.
const table = placements("Table", ["caption", "columns", "rows", "empty", "selectable", "selectedIds", "defaultSelectedIds", "editable", "bulkActions", "sort", "currentRowId", "aria-label", "getRowId"]);
check("Table · Content", of(table, "content"), ["caption", "columns", "rows", "empty"]);
check("Table · Look", of(table, "look"), []);
check("Table · Behavior", of(table, "behavior"), ["selectable", "selectedIds", "defaultSelectedIds", "editable", "bulkActions", "sort", "currentRowId"]);
check("Table · Advanced", of(table, "advanced"), ["aria-label", "getRowId"]);

// The rules themselves.
check("a code-only prop (hint) is Advanced", propCategory("Input", { name: "placeholder", type: "string" }, "code"), "advanced");
check("a Figma layer boolean is Content", propCategory("Input", { name: "helpText", type: "ReactNode" }, "toggle"), "content");
check("a boolean variant reads as a boolean", propCategory("Checkbox", { name: "checked", type: "boolean" }, "variant"), "behavior");
check("a look boolean", propCategory("Card", { name: "fullWidth", type: "boolean" }), "look");
check("a show-boolean is content", propCategory("LineChart", { name: "showLegend", type: "boolean" }), "content");
check("a boolean that draws a layer is content (Chip Dropdown)", propCategory("Chip", { name: "dropdown", type: "boolean" }), "content");
check("a sort enum is behavior", propCategory("X", { name: "sortDirection", type: '"asc" | "desc"' }), "behavior");
check("a per-breakpoint number is a look", propCategory("Card", { name: "span", type: 'Responsive<number | "full">' }), "look");
check("a content number", propCategory("ProgressBar", { name: "value", type: "number" }), "content");
check("a step number is behavior", propCategory("Slider", { name: "step", type: "number" }), "behavior");
check("a screen-reader description is Advanced", propCategory("Chart", { name: "label", type: "string", description: "The marks' accessible name for screen readers" }), "advanced");
check("a type enum is a look", propCategory("Badge", { name: "type", type: '"dot" | "count"' }), "look");
check("a type that is code is Advanced", propCategory("Input", { name: "type", type: "string" }), "advanced");

if (failures.length) {
  console.error(`propCategories selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ property categories selftest: ${passed} checks pass.`);
