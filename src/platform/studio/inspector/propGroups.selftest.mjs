#!/usr/bin/env node
// Zen Studio Figma property groups (./propGroups.ts, imported directly: Node strips the types): every prop a group or a
// boolean names is a documented prop of the component, no prop sits in two places unless conditions keep them apart,
// and the conditions read rendered props the way GroupedProperties does. Run: node src/platform/studio/inspector/propGroups.selftest.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { entryLabel, entryProp, entryShown, entryWarnings, groupsFromFigma, holds, isSetValue, placedProps, propGroupsOf } from "./propGroups.ts";
import { FIGMA_PROPS } from "./figmaProps.generated.ts";

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

for (const name of ["TopNavigation"]) {
  const groups = propGroupsOf(name);
  check(`${name}: has groups`, Boolean(groups), true);
  if (!groups) continue;
  const documented = new Set(apiOf(name)?.props.map((prop) => prop.name) ?? []);
  const named = [...placedProps(groups), ...groups.toggles.map((toggle) => toggle.prop)];
  check(`${name}: every grouped prop is documented`, named.filter((prop) => !documented.has(prop)), []);
  // A prop placed twice must carry conditions (headingLevel: Top-Heading-Text without a large title, else Main-Heading-Text).
  const entries = [...groups.own, ...groups.after, ...groups.nested.flatMap((group) => group.props)];
  const twice = [...new Set(entries.map(entryProp).filter((prop, index, all) => all.indexOf(prop) !== index))];
  check(`${name}: props placed twice are conditional`, twice.filter((prop) => entries.filter((entry) => entryProp(entry) === prop).some((entry) => typeof entry === "string")), []);
  check(`${name}: toggles are named after Figma layers`, groups.toggles.map((toggle) => toggle.label), ["Top-Leading", "Top-Heading-Text", "Top-Trailing", "Expand-Heading", "Expand-Trailing", "Control-Bar"]);
}

// Conditions on rendered props.
check("isSetValue", [undefined, null, false, "", [], 0, "a", [1], true].map(isSetValue), [false, false, false, false, false, true, true, true, true]);
check("holds", [
  holds([{ prop: "a", set: true }], { a: "x" }),
  holds([{ prop: "a", set: true }], {}),
  holds([{ prop: "a", unset: true }], {}),
  holds([{ prop: "t", minItems: 2 }], { t: [1] }),
  holds([{ prop: "t", minItems: 2 }], { t: [1, 2] }),
  holds(undefined, {}),
], [true, false, true, false, true, true]);

const nav = propGroupsOf("TopNavigation");
const shownGroups = (props) => nav.nested.filter((group) => holds(group.when, props)).map((group) => group.name);
check("a pushed screen: bar title + Back + one action", shownGroups({ title: "Detail", leading: { icon: "x", label: "Back" }, trailing: [{}] }), ["Top-Leading", "Top-Heading-Text", "Top-Trailing"]);
check("a root: large title with its action, no bar title", shownGroups({ largeTitle: "Home", largeTitleAction: { icon: "x", label: "New" }, trailing: [] }), ["Main-Heading-Text", "Header-Trailing"]);
check("Header-Trailing needs the large title", shownGroups({ largeTitleAction: { icon: "x", label: "New" } }), []);
const headingIn = (props) => nav.nested.filter((group) => holds(group.when, props) && group.props.some((entry) => entryProp(entry) === "headingLevel" && entryShown(entry, props))).map((group) => group.name);
check("headingLevel sits with the title that is the heading", [headingIn({ title: "A" }), headingIn({ title: "A", largeTitle: "A" })], [["Top-Heading-Text"], ["Main-Heading-Text"]]);
const trailingGroup = nav.nested.find((group) => group.name === "Top-Trailing").props.find((entry) => entryProp(entry) === "trailingGroup");
check("Trailing group always shows (editing is free)", [entryShown(trailingGroup, { trailing: [{}] }), entryShown(trailingGroup, { trailing: [{}, {}] })], [true, true]);
check("Trailing group (deprecated) always says what replaces it", [entryWarnings(trailingGroup, { trailing: [{}] }).length, entryWarnings(trailingGroup, { trailing: [{}, {}] }).length], [1, 1]);
check("Trailing group warns on a compact type too", [entryWarnings(trailingGroup, { type: "compact-alt", trailing: [{}, {}] }).length, entryWarnings(trailingGroup, { type: "liquid-glass", trailing: [{}, {}] }).length], [2, 1]);
check("Expand-Trailing boolean only with a large title", [holds(nav.toggles.find((toggle) => toggle.label === "Expand-Trailing").when, {}), holds(nav.toggles.find((toggle) => toggle.label === "Expand-Trailing").when, { largeTitle: "A" })], [false, true]);

// Groups generated from the Figma read (WP-E): every row is a documented prop, each prop placed once, variants before
// the booleans, and an instance-swap row (Leading-Icon-Src) shown only while its boolean's prop is set.
for (const [name, entry] of Object.entries(FIGMA_PROPS)) {
  const groups = groupsFromFigma(entry);
  const documented = new Set((apiOf(name)?.props ?? []).map((prop) => prop.name));
  const rows = [...groups.own, ...groups.after].map(entryProp);
  check(`${name} (Figma): rows are documented props`, rows.filter((prop) => !documented.has(prop)), []);
  check(`${name} (Figma): each prop once`, rows.length, new Set(rows).size);
  check(`${name} (Figma): toggles are documented props`, groups.toggles.map((toggle) => toggle.prop).filter((prop) => !documented.has(prop)), []);
}
{
  const button = groupsFromFigma(FIGMA_PROPS.Button);
  check("Button (Figma): set, then variants", button.own.map(entryProp), ["appearance", "size", "level", "state"]);
  check("Button (Figma): Figma names", button.own.slice(1).map(entryLabel), ["Size", "Level", "State"]);
  check("Button (Figma): Leading-Icon / Trailing-Icon booleans", button.toggles.map((toggle) => [toggle.label, toggle.prop]), [["Leading-Icon", "startIcon"], ["Trailing-Icon", "endIcon"]]);
  const icon = button.after.find((entry) => entryProp(entry) === "startIcon");
  check("Button (Figma): Leading-Icon-Src only while Leading-Icon is on", [entryShown(icon, {}), entryShown(icon, { startIcon: "icon-check-line" })], [false, true]);
  check("TopNavigation keeps its hand-written groups", propGroupsOf("TopNavigation").nested.length > 0 && !FIGMA_PROPS.TopNavigation, true);
}

if (failures.length) {
  console.error(`propGroups selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ Figma property groups selftest: ${passed} checks pass.`);
