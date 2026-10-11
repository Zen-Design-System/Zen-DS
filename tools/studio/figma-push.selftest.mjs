#!/usr/bin/env node
// Self-test of tools/studio/figma-push.mjs (core rebuild Q4 P0, spec docs/research/studio-figma-push-spec-2026-10-12.md):
// a page as Figma JSON, checked by the round trip — pull (figma-pull.mjs) the JSON push writes and the same page comes
// back — and by what the JSON says (sets, Figma property names, variables, nested instances).
// Run: node tools/studio/figma-push.selftest.mjs
import { validateDialect } from "./dialect.mjs";
import { docFromText, printPage } from "./doc.mjs";
import { figmaFromPage, figmaIdOf } from "./figma-push.mjs";
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

// 6. What P0 does not write yet is named, never dropped silently.
{
  const { notes } = push(PAGE.replace('<Card theme="flat">\n              <Text>Loyalty app</Text>', '<Card theme="flat" subAction={{ label: "More" }}>\n              <Text>Loyalty app</Text>'));
  ok("a data prop (subAction) is named as not written", notes.some((note) => /subAction is data/.test(note)));
}

if (failures.length) {
  console.error(`✗ figma-push selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ figma-push selftest: ${passed} checks pass.`);
