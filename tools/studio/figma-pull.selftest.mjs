#!/usr/bin/env node
// Self-test of tools/studio/figma-pull.mjs (core rebuild M6): a Figma frame's JSON, as figmaReadCode returns it, becomes
// a valid Studio page — instances with the props that differ from the code defaults, overridden nested instances as
// `overrides` by layer path, auto layout as Stack (gap and padding from their variables or px), text as Text — and what
// has no Zen mapping is named. The read code itself runs only in Figma (use_figma); here it must at least parse.
// Run: node tools/studio/figma-pull.selftest.mjs
import { validateDialect } from "./dialect.mjs";
import { figmaReadCode, layerKey, pageFromFigma, repoMapping } from "./figma-pull.mjs";
import { nestedPaths } from "../figma-contract/nested-paths.mjs";

let passed = 0;
const failures = [];
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};
const ok = (label, value) => check(label, Boolean(value), true);

// A desktop frame: a title, a Card whose Sub-Action (and the icon in it) were overridden, a row of Badges (one red), a
// primary Button, a component outside the library.
const FRAME = {
  type: "FRAME", name: "Team", width: 1440, height: 900,
  layout: { mode: "VERTICAL", gap: 16, gapVar: "Spacing/Gap/Medium", padding: [32, 32, 32, 32], paddingVar: "Spacing/Padding/2-XLarge", primary: "MIN", counter: "MIN", wrap: false },
  children: [
    { type: "TEXT", name: "Title", characters: "Team", textStyle: "Heading/3" },
    {
      type: "INSTANCE", name: "Card", set: { id: "6643:51021", name: "Card" }, text: null,
      props: { "Sub-Action": true, Theme: "Border", Spacing: "Medium", Active: "No" },
      nested: [
        { path: "Sub-Action", set: { id: "205:21062", name: "Button/Icon-Main" }, props: { "Leading-Icon-Src": "icon-plus-line", Size: "XLarge", Level: "Danger", State: "Default" }, text: null },
      ],
    },
    {
      type: "FRAME", name: "Statuses", width: 400, height: 28,
      layout: { mode: "HORIZONTAL", gap: 8, gapVar: null, padding: [0, 0, 0, 0], paddingVar: null, primary: "MIN", counter: "CENTER", wrap: false },
      children: [
        { type: "INSTANCE", name: "Badge", set: { id: "260:4825", name: "Badge" }, props: { Remove: false, "Leading-Icon": true, Text: "Active", Size: "Medium", Theme: "Neutral", Background: "Solid" }, text: "Active", nested: [] },
        { type: "INSTANCE", name: "Badge", set: { id: "260:4825", name: "Badge" }, props: { Remove: false, "Leading-Icon": true, Text: "Blocked", Size: "Medium", Theme: "Red", Background: "Solid" }, text: "Blocked", nested: [] },
      ],
    },
    { type: "INSTANCE", name: "Save", set: { id: "1026:8312", name: "Button/Main" }, props: { "Leading-Icon": false, "Trailing-Icon": false, Text: "Save changes", Size: "Medium (Base)", Level: "Primary", State: "Default" }, text: "Save changes", nested: [] },
    { type: "INSTANCE", name: "Logo", set: { id: "9:9", name: "Brand/Logo" }, props: {}, text: null, nested: [] },
  ],
};

const mapping = await repoMapping();
const { text, notes } = pageFromFigma(FRAME, { mapping });
check("the page is valid dialect", validateDialect(text), []);
ok("a desktop Screen named after the frame", /<Screen id="screen-1" title="Team" device="desktop">/.test(text));
ok("the frame's auto layout: gap md (Spacing/Gap/Medium), padding 2xl (Spacing/Padding/2-XLarge)", /<Stack gap="md" padding="2xl">/.test(text));
ok("a text layer with its text style", text.includes('<Text textStyle="Heading/3">Team</Text>'));
ok("the Card with its Theme (Border ≠ code default shadow)", /<Card theme="border"/.test(text));
ok("the overridden Sub-Action becomes the Card's overrides (Level Danger, size XLarge ≠ code md)", text.includes('overrides={{ "Sub-Action": { size: "xlarge", level: "danger" } }}'));
ok("a horizontal frame: a row Stack, gap xs from 8 px, centred", /<Stack direction="row" gap="xs" align="center">/.test(text));
ok("Badges: the label as children, Theme only where it differs", text.includes("<Badge>Active</Badge>") && text.includes('<Badge theme="red">Blocked</Badge>'));
ok("Button/Main: the label as children; Medium (Base) = code md and Figma's default level Primary left out", text.includes("<Button>Save changes</Button>"));
ok("a Badge size Medium matches the code default md: left out", !/<Badge size=/.test(text));
check("a layer Figma shows that the code draws only from a prop (Card Sub-Action) is named", notes.filter((note) => note.includes("Sub-Action shows in Figma")).length, 1);
check("nothing else needs a note", notes.filter((note) => !note.includes("Logo") && !note.includes("Sub-Action shows")), []);
check("what has no Zen component is named", notes.filter((note) => note.includes("Logo")).length, 1);
// M7: one name for a layer named after its component (paths cannot hold "/"), the same in Figma's read and the check.
check("layerKey: a primitive by its last part, a library component by its first, other names as they are",
  ["Avatar/Single", "Search/Default", ".Primitives/Date-Picker/Time-Picker", "Primitives/Segmented/Item-1", "Sub-Action"].map(layerKey),
  ["Avatar", "Search", "Time-Picker", "Item", "Sub-Action"]);
ok("the read code names nested layers by layerKey", figmaReadCode("1:2").includes("layerKey(child.name)"));
{
  const rows = await nestedPaths();
  check("nested-paths: every component with a contract names its layers as Figma does", rows.filter((row) => row.covered && row.missing.length).map((row) => `${row.component}: ${row.missing.join(", ")}`), []);
  ok("nested-paths: DatePicker's action and time layers are Figma's Submit and Time-Picker", (() => { const row = rows.find((entry) => entry.component === "DatePicker"); return row?.names.includes("Submit") && row.names.includes("Time-Picker"); })());
}
ok("the read code for use_figma parses as an async function body", (() => { try { new Function(`return (async () => {${figmaReadCode("1:2")}})`); return true; } catch { return false; } })());

if (failures.length) {
  console.error(`✗ figma-pull selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}\n--- page ---\n${text}\n--- notes ---\n${notes.join("\n")}`);
  process.exit(1);
}
console.log(`✓ figma-pull selftest: ${passed} checks pass.`);
