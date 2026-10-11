#!/usr/bin/env node
// Self-test of tools/studio/figma-push.mjs (core rebuild Q4 P0, spec docs/research/studio-figma-push-spec-2026-10-12.md):
// a page as Figma JSON, checked by the round trip — pull (figma-pull.mjs) the JSON push writes and the same page comes
// back — and by what the JSON says (sets, Figma property names, variables, nested instances).
// Run: node tools/studio/figma-push.selftest.mjs
import { validateDialect } from "./dialect.mjs";
import { docFromText, printPage } from "./doc.mjs";
import fs from "node:fs";
import { figmaFromPage, figmaIdOf, figmaPackage } from "./figma-push.mjs";
import { figmaDocId, pageFromFigma, repoMapping } from "./figma-pull.mjs";
import { NESTED_LAYERS } from "../../src/platform/studio/inspector/nestedLayers.generated.ts";

let passed = 0;
const failures = [];
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};
const ok = (label, value) => check(label, Boolean(value), true);
const mapping = await repoMapping();
const push = (text) => figmaFromPage(text, { mapping, nestedLayers: NESTED_LAYERS });
/** A page's tree without ids or prop order (the print orders props its own way): what the round trip must keep. */
const shape = (text) => {
  const value = (v) => (v.kind === "element" ? { element: tree(v.node) } : v.kind === "object" ? Object.fromEntries(Object.entries(v.fields).sort(([a], [b]) => a.localeCompare(b)).map(([k, f]) => [k, value(f)])) : v.kind === "array" ? v.items.map(value) : v.value);
  const tree = (node) => ({ name: node.name, props: Object.fromEntries(Object.entries(node.props).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, value(v)])), children: node.children.map((child) => (child.kind === "element" ? tree(child) : child.value)) });
  return tree(docFromText(text).doc.board);
};
const find = (node, test) => (test(node) ? node : [...(node.children ?? []), ...(node.slots ?? []).flatMap((slot) => slot.children)].map((child) => find(child, test)).find(Boolean) ?? null);

// 1. A pulled frame (figma-pull.selftest's Team, without the shape outside the library) goes up and comes back the same.
const TEAM = {
  type: "FRAME", name: "Team", width: 1440, height: 900,
  layout: { mode: "VERTICAL", gap: 16, gapVar: "Spacing/Gap/Medium", padding: [32, 32, 32, 32], paddingVar: "Spacing/Padding/2-XLarge", primary: "MIN", counter: "MIN", wrap: false },
  children: [
    { type: "TEXT", name: "Title", characters: "Team", textStyle: "Heading/3" },
    { type: "INSTANCE", name: "Card", set: { id: "6643:51021", name: "Card" }, text: null, props: { "Sub-Action": true, Theme: "Border", Spacing: "Medium", Active: "No" }, nested: [{ path: "Sub-Action", set: { id: "205:21062", name: "Button/Icon-Main" }, props: { "Leading-Icon-Src": "icon-plus-line", Size: "XLarge", Level: "Danger", State: "Default" }, text: null }] },
    { type: "FRAME", name: "Statuses", width: 400, height: 28, layout: { mode: "HORIZONTAL", gap: 8, gapVar: null, padding: [0, 0, 0, 0], paddingVar: null, primary: "MIN", counter: "CENTER", wrap: false }, children: [
      { type: "INSTANCE", name: "Badge", set: { id: "260:4825", name: "Badge" }, props: { Remove: false, "Leading-Icon": true, Text: "Active", Size: "Medium", Theme: "Neutral", Background: "Solid" }, text: "Active", nested: [] },
      { type: "INSTANCE", name: "Badge", set: { id: "260:4825", name: "Badge" }, props: { Remove: false, "Leading-Icon": true, Text: "Blocked", Size: "Medium", Theme: "Red", Background: "Solid" }, text: "Blocked", nested: [] },
    ] },
    { type: "INSTANCE", name: "Save", set: { id: "1026:8312", name: "Button/Main" }, props: { "Leading-Icon": false, "Trailing-Icon": false, Text: "Save changes", Size: "Medium (Base)", Level: "Primary", State: "Default" }, text: "Save changes", nested: [] },
  ],
};
{
  const page = pageFromFigma(TEAM, { mapping }).text;
  const { frame, notes } = push(page);
  check("Team: the page that came down goes up and comes back the same", pageFromFigma(frame, { mapping }).text, page);
  check("Team: nothing left out", notes, []);
  check("Team: the frame's auto layout by variable (gap Medium, padding 2XLarge) at desktop width", { width: frame.width, mode: frame.layout.mode, gapVar: frame.layout.gapVar, paddingVar: frame.layout.paddingVar, padding: frame.layout.padding }, { width: 1440, mode: "VERTICAL", gapVar: "Spacing/Gap/Medium", paddingVar: "Spacing/Padding/2XLarge", padding: [32, 32, 32, 32] });
  const card = find(frame, (node) => node.set?.name === "Card");
  check("Team: the Card's set and Theme by its Figma name", { set: card?.set, theme: card?.props.Theme }, { set: { id: "6643:51021", name: "Card" }, theme: "Border" });
  check("Team: its overrides as a nested instance of Button/Icon-Main (Card › Sub-Action → IconButton)", card?.nested, [{ path: "Sub-Action", set: { id: "205:21062", name: "Button/Icon-Main" }, props: { Size: "XLarge", Level: "Danger" } }]);
  const badge = find(frame, (node) => node.text === "Blocked");
  check("Team: a Badge's label and Theme", { text: badge?.text, theme: badge?.props.Theme }, { text: "Blocked", theme: "Red" });
}

// 2. A page made in the Studio: a row that spreads and wraps, a Grid, a centred title, an icon Button, a named
//    IconButton, a Card holding layers, an Icon.
const PAGE = `// @zen-page {"format":1,"title":"Projects"}
import { Board, Screen } from "@zen/design-system/builder";
import { Button, Card, Grid, Icon, IconButton, Stack, Text } from "@zen/design-system";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Projects" device="phone">
        <Stack paddingX="xl" paddingY="lg" gap="lg">
          <Text textStyle="Heading/3" align="center">Projects</Text>
          <Stack direction="row" justify="between" wrap>
            <Button appearance="flat" startIcon="icon-plus-line">New project</Button>
            <IconButton icon="icon-settings-01-line" aria-label="Settings" />
          </Stack>
          <Grid columns={2} gap="sm">
            <Card theme="flat">
              <Text>Loyalty app</Text>
            </Card>
            <Card theme="flat">
              <Icon name="icon-star-01-line" />
            </Card>
          </Grid>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
{
  check("Projects: the hand-made page is valid", validateDialect(PAGE), []);
  const { frame, notes } = push(PAGE);
  const back = pageFromFigma(frame, { mapping }).text;
  check("Projects: it comes back the same (layers and props)", shape(back), shape(PAGE));
  check("Projects: nothing left out", notes, []);
  check("Projects: a phone frame (390) with padding X 24 / Y 20 (no single variable)", { width: frame.width, padding: frame.layout.padding, paddingVar: frame.layout.paddingVar ?? null }, { width: 390, padding: [20, 24, 20, 24], paddingVar: null });
  const row = find(frame, (node) => node.layout?.mode === "HORIZONTAL");
  check("Projects: the row spreads (SPACE_BETWEEN), wraps, centres across", { primary: row?.layout.primary, wrap: row?.layout.wrap, counter: row?.layout.counter }, { primary: "SPACE_BETWEEN", wrap: true, counter: "CENTER" });
  const flat = find(frame, (node) => node.text === "New project");
  check("Projects: a flat Button is Button/Flat with its leading icon on", { set: flat?.set.name, icon: flat?.props["Leading-Icon-Src"], toggle: flat?.props["Leading-Icon"] }, { set: "Button/Flat", icon: "icon-plus-line", toggle: true });
  const settings = find(frame, (node) => node.name === "Settings");
  ok("Projects: an icon-only button keeps its name as its layer name", settings?.type === "INSTANCE");
  const grid = find(frame, (node) => node.layout?.mode === "GRID");
  check("Projects: a Grid with 2 columns, its cards placed row by row", { columns: grid?.layout.grid.columns, cells: grid?.children.map((child) => child.cell) }, { columns: 2, cells: [{ col: 0, row: 0, span: 1 }, { col: 1, row: 0, span: 1 }] });
  const card = grid?.children[0];
  check("Projects: a Card's layers go in its Content slot", card?.slots?.map((slot) => [slot.name, slot.children.map((child) => child.type)]), [["Content", ["TEXT"]]]);
  check("Projects: an Icon is an instance of the icon component", find(frame, (node) => node.name === "icon-star-01-line")?.set, { id: null, name: "icon-star-01-line" });
}

// 3. Keys: every node carries its element's document id; printed with its ids, a page gives the same keys every export.
{
  const { doc } = docFromText(PAGE);
  const withIds = printPage(doc, { ids: true });
  const keys = (frame) => { const out = []; const walk = (node) => { out.push(node.key); (node.children ?? []).forEach(walk); (node.slots ?? []).forEach((slot) => slot.children.forEach(walk)); }; walk(frame); return out; };
  const first = keys(push(withIds).frame);
  check("keys: one per node, the same on a second export", { all: first.every(Boolean), same: JSON.stringify(keys(push(withIds).frame)) === JSON.stringify(first) }, { all: true, same: true });
  let n = 0;
  const counted = keys(figmaFromPage(PAGE, { mapping, nestedLayers: NESTED_LAYERS, newId: () => `k${++n}` }).frame);
  ok("keys: a page without ids takes the caller's ids (the CLI counts)", counted.every((key) => /^k\d+$/.test(key)));
}

// 4. Ids: an element pulled from Figma keeps its Figma id (an update goes to the same layer); one the pull added has none.
check("figmaIdOf: the other way of figmaDocId", [figmaIdOf(figmaDocId("14243:64878")), figmaIdOf(figmaDocId("I14730:78830;4035:10637")), figmaIdOf("f14243-64878.place"), figmaIdOf("k3x9")], ["14243:64878", "I14730:78830;4035:10637", undefined, undefined]);

// 5. A component that is several Figma sets writes only what its set has (Sidebar Basic has no Workspace-bar).
{
  const sidebar = PAGE.replace('<Text textStyle="Heading/3" align="center">Projects</Text>', '<Text textStyle="Heading/3" align="center">Projects</Text>\n          <Sidebar aria-label="Workspace" />').replace("import { Button, Card, Grid, Icon, IconButton, Stack, Text }", "import { Button, Card, Grid, Icon, IconButton, Sidebar, Stack, Text }");
  const node = find(push(sidebar).frame, (item) => item.set?.name?.startsWith("Side-Bar/"));
  check("Sidebar: the Basic set, without the other sets' properties", { set: node?.set.name, workspace: "Workspace-bar" in (node?.props ?? {}), background: "Master-Background" in (node?.props ?? {}) }, { set: "Side-Bar/Master/Basic", workspace: false, background: false });
}

// 6. P2: data slots, node slots, a Table as Figma draws it, absolute layers, pictures (each keyed for the next import).
{
  const table = pageFromFigma(JSON.parse(fs.readFileSync(new URL("./fixtures/figma-table.json", import.meta.url), "utf8")).frame, { mapping }).text;
  const { frame, notes } = push(table);
  check("Table page: nothing left out", notes, []);
  const rows = find(frame, (node) => node.children?.some((child) => child.set?.name === "Primitives/Table/Data-Row"))?.children ?? [];
  check("Table: a header row and nine rows of Data-Row", rows.map((row) => row.set.name === "Primitives/Table/Data-Row").filter(Boolean).length, 10);
  const header = rows[0].slots[0].children;
  check("Table: header cells by column (label, Sort, width or Fill)", header.slice(0, 3).map((cell) => [cell.props["✏️ Label"], cell.props.Type, cell.fixedWidth ?? (cell.fillW ? "fill" : null)]), [["Type", "None", "fill"], ["Submit On", "Sort", 140], ["From - to", "None", 234]]);
  const first = rows[1].slots[0].children.map((cell) => cell.slots[0].children[0]);
  check("Table: a row's content cells (Dock-Icon, Text, Badge, Actions)", first.map((cell) => cell.set.name.split("/").pop()), ["Dock-Icon-Cell", "Text-Cell", "Text-Cell", "Text-Cell", "Badge-Cell", "Actions-Cell"]);
  check("Table: row 1's yellow Badge with its dot (its override)", first[4].slots[0].children[0].props.Theme + " " + first[4].slots[0].children[0].props["Leading-Icon"] + " " + first[4].slots[0].children[0].text, "Yellow true Pending");
  check("Table: a media cell's label in its nested Text-Cell, the emoji Dock-Icon of row 1 (nested override)", first[0].nested?.map((nested) => [nested.path, nested.textList?.[0] ?? nested.props.Theme]), [["Text-Cell", "Annual Leave"], ["Dock-Icon", "Emoji"]]);
  check("Table: the Open action, its icon, Small", [first[5].slots[0].children[0].props["Leading-Icon-Src"], first[5].slots[0].children[0].props.Size], ["icon-chevron-right-line-small", "Small"]);
  const keys = []; const walk = (node) => { keys.push(node.key); (node.children ?? []).forEach(walk); (node.slots ?? []).forEach((slot) => slot.children.forEach(walk)); }; walk(frame);
  check("Table: every layer keyed, no key twice", { all: keys.every(Boolean), unique: new Set(keys).size === keys.length }, { all: true, unique: true });
}
{
  const overviews = pageFromFigma(JSON.parse(fs.readFileSync(new URL("./fixtures/figma-overviews.json", import.meta.url), "utf8")).frame, { mapping }).text;
  const { frame, notes } = push(overviews);
  check("Overviews: nothing left out", notes, []);
  const sidebar = find(frame, (node) => node.set?.name === "Side-Bar/Master/Basic");
  check("Overviews: the Sidebar's slots (brand, sections, footer)", sidebar?.slots?.map((slot) => slot.name), ["Header-Content", "Body-Content", "Footer-Content"]);
  const body = sidebar.slots.find((slot) => slot.name === "Body-Content").children;
  const selected = body.flatMap((section) => section.children).find((item) => item.props?.Select === "Yes");
  ok("Overviews: sections as frames, the selected Menu-Item says Select Yes", body.every((section) => section.type === "FRAME") && selected?.set.name === "Primitives/Side-Bar/Menu-Item/Master");
  const header = find(frame, (node) => node.set?.name === "Primitives/Dashboard/Header");
  ok("Overviews: a Dashboard header's slots and texts", header?.slots?.length > 0);
  check("Overviews: Breadcrumbs items in their Item-List slot", find(frame, (node) => node.set?.name === "Breadcrumbs")?.slots?.[0]?.children.every((item) => item.set.name === "Primitives/Breadcrumbs/Item/Slot"), true);
  const absolutes = []; const collect = (node) => { if (node.absolute) absolutes.push(node.absolute); (node.children ?? []).forEach(collect); (node.slots ?? []).forEach((slot) => slot.children.forEach(collect)); }; collect(frame);
  check("Overviews: layers outside the auto layout keep their constraints and insets (top right 32, Floating-Actions bottom right)", absolutes.map((box) => [box.cx, box.cy, box.right, box.top]), [["MAX", "MIN", 32, 32], ["MAX", "MAX", 0, 0]]);
}
{
  const pictured = PAGE.replace('<Icon name="icon-star-01-line" />', '<Avatar src="zen-media:abc123" alt="Alex" />').replace("import { Button, Card, Grid, Icon, IconButton, Stack, Text }", "import { Avatar, Button, Card, Grid, Icon, IconButton, Stack, Text }");
  const { pkg } = figmaPackage(pictured, { mapping, nestedLayers: NESTED_LAYERS, page: { id: "p" } });
  const avatar = find(pkg.frame, (node) => node.image);
  check("a picture: the Avatar names it, Theme Photo, and the package lists it for the caller to fill", { image: avatar?.image, theme: avatar?.props.Theme, images: pkg.images }, { image: "zen-media:abc123", theme: "Photo", images: { "zen-media:abc123": null } });
}

// 7. What is not written yet is named, never dropped silently.
{
  const { notes } = push(PAGE.replace('<Card theme="flat">\n              <Text>Loyalty app</Text>', '<Card theme="flat" subAction={{ label: "More" }}>\n              <Text>Loyalty app</Text>'));
  ok("a data prop (subAction) is named as not written", notes.some((note) => /subAction is data/.test(note)));
}

if (failures.length) {
  console.error(`✗ figma-push selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ figma-push selftest: ${passed} checks pass.`);
