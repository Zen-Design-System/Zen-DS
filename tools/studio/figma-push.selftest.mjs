#!/usr/bin/env node
// Self-test of tools/studio/figma-push.mjs (core rebuild Q4 P0, spec docs/research/studio-figma-push-spec-2026-10-12.md):
// a page as Figma JSON, checked by the round trip — pull (figma-pull.mjs) the JSON push writes and the same page comes
// back — and by what the JSON says (sets, Figma property names, variables, nested instances).
// Run: node tools/studio/figma-push.selftest.mjs
import { validateDialect } from "./dialect.mjs";
import { docFromText, printPage } from "./doc.mjs";
import fs from "node:fs";
import { figmaFromPage, figmaIdOf, figmaPackage, sidebarPatternProps } from "./figma-push.mjs";
import { figmaDocId, pageFromFigma, repoMapping } from "./figma-pull.mjs";
import { figmaChanges, mergeFigma } from "./figma-diff.mjs";
import { DURATION_MS, EASING } from "./figma-proto.mjs";
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
/** The AppShell's Side-Bar in Figma's Master-Layout: its props (the nested Patterns/Patterns entry, the pattern's Expand), its slots (within the pattern). */
const masterSidebar = (frame) => {
  const master = find(frame, (node) => node.set?.name === "Patterns/Pages/Density-Medium");
  if (!master) return null;
  const at = (path) => master.nested?.find((entry) => entry.path === path);
  return { master, pattern: at("Patterns")?.props ?? {}, props: at("Patterns/Patterns")?.props ?? {}, slots: master.slots.filter((slot) => slot.within?.[0] === "Patterns/Sidebar") };
};

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
import { Board, Screen } from "@zen-ds/react/builder";
import { Button, Card, Grid, Icon, IconButton, Stack, Text } from "@zen-ds/react";

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
            <Card theme="default">
              <Text>Loyalty app</Text>
            </Card>
            <Card theme="default">
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
  // On its own it is Figma's Patterns/Sidebar around the Side-Bar: the Side-Bar's props are its nested Patterns entry.
  const node = find(push(sidebar).frame, (item) => item.set?.name === "Patterns/Sidebar");
  const sideBar = node?.nested?.find((entry) => entry.path === "Patterns")?.props ?? {};
  check("Sidebar: the Basic set, without the other sets' properties", { set: node?.set.name, workspace: "Workspace-bar" in sideBar, background: "Master-Background" in sideBar }, { set: "Patterns/Sidebar", workspace: false, background: false });
}

// 5b. A Sidebar on its own is Figma's Patterns/Sidebar (user 2026-10-21: "sửa push Sidebar đứng riêng luôn"): the
// variant by its theme, density, shadow and rail, its Side-Bar's writes inside the pattern; read back with its look.
{
  check("sidebarPatternProps: the variant the set has nearest the Sidebar's look", [
    sidebarPatternProps({}), sidebarPatternProps({ shadow: false, collapsed: true }), sidebarPatternProps({ theme: "border" }),
    sidebarPatternProps({ theme: "border", collapsed: true }), sidebarPatternProps({ theme: "carved-floating", density: "medium" }),
  ], [
    { Expand: "Yes", Shadow: "Yes", Theme: "Default", Density: "Medium" }, { Expand: "No", Shadow: "No", Theme: "Default", Density: "Medium" },
    { Expand: "Yes", Shadow: "No", Theme: "Border", Density: "Small" }, { Expand: "No", Shadow: "Yes", Theme: "Border", Density: "Small" },
    { Expand: "Yes", Shadow: "No", Theme: "Carved-Floating", Density: "Small" },
  ]);
  const page = PAGE.replace('<Text textStyle="Heading/3" align="center">Projects</Text>', '<Text textStyle="Heading/3" align="center">Projects</Text>\n          <Sidebar aria-label="Main" theme="carved" density="small" collapsed selectedId="home"><SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" /></Sidebar>').replace("import { Button, Card, Grid, Icon, IconButton, Stack, Text }", "import { Button, Card, Grid, Icon, IconButton, Sidebar, SidebarMenuItem, Stack, Text }");
  const { frame } = push(page);
  const node = find(frame, (item) => item.set?.name === "Patterns/Sidebar");
  const layer = "Patterns/Density/Comfortable/Sidebar/No";
  check("Sidebar theme=\"carved\" density=\"small\" collapsed: Patterns/Sidebar Carved · Small as the rail, the Side-Bar's rows in its Sidebar/No layer, as tall as the pattern", { props: node?.props, sideBar: node?.nested?.[0]?.path, expand: node?.nested?.[0]?.props.Expand, slots: [...new Set(node?.slots?.map((slot) => slot.within[0]))], fill: node?.edits?.filter((edit) => edit.fillH).map((edit) => edit.layer) }, { props: { Expand: "No", Shadow: "Yes", Theme: "Carved", Density: "Small" }, sideBar: "Patterns", expand: "No", slots: [layer], fill: [[layer]] });
  const tag = pageFromFigma(frame, { mapping }).text.match(/<Sidebar\b[^>]*>/)?.[0] ?? "";
  check("round trip: the pattern comes back the Sidebar with its theme, density and rail", ['theme="carved"', 'density="small"', "collapsed"].map((attr) => tag.includes(attr)), [true, true, true]);
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
  // AppShell as Figma's Master-Layout: the Sidebar's slots sit in the Side-Bar its Sidebar pattern holds.
  const master = find(frame, (node) => node.set?.name === "Patterns/Pages/Density-Medium");
  const sidebarSlots = (master?.slots ?? []).filter((slot) => slot.within?.[0] === "Patterns/Sidebar");
  check("Overviews: the Sidebar's slots (brand, sections, footer)", sidebarSlots.map((slot) => slot.name), ["Header-Content", "Body-Content", "Footer-Content"]);
  const body = sidebarSlots.find((slot) => slot.name === "Body-Content").children;
  const selected = body.flatMap((section) => section.children).find((item) => item.props?.Select === "Yes");
  ok("Overviews: sections as frames, the selected Menu-Item says Select Yes", body.every((section) => section.type === "FRAME") && selected?.set.name === "Primitives/Side-Bar/Menu-Item/Master");
  const header = find(frame, (node) => node.set?.name === "Primitives/Dashboard/Header");
  ok("Overviews: a Dashboard header's slots and texts", header?.slots?.length > 0);
  check("Overviews: Breadcrumbs items in their Item-List slot", find(frame, (node) => node.set?.name === "Breadcrumbs")?.slots?.[0]?.children.every((item) => item.set.name === "Primitives/Breadcrumbs/Item/Slot"), true);
  const absolutes = []; const collect = (node) => { if (node.absolute) absolutes.push(node.absolute); (node.children ?? []).forEach(collect); (node.slots ?? []).forEach((slot) => slot.children.forEach(collect)); }; collect(frame);
  check("Overviews: layers outside the auto layout keep their constraints and insets (top right 32)", absolutes.map((box) => [box.cx, box.cy, box.right, box.top]), [["MAX", "MIN", 32, 32]]);
  check("Overviews: the AppShell's floating action in the master's Floating-Item (Floating-Actions on)", [master?.props["Floating-Actions"], master?.slots.find((slot) => slot.name === "Floating-Item")?.within, master?.slots.find((slot) => slot.name === "Floating-Item")?.children.length], [true, ["Floating-Actions"], 1]);
}
{
  const pictured = PAGE.replace('<Icon name="icon-star-01-line" />', '<Avatar src="zen-media:abc123" alt="Alex" />').replace("import { Button, Card, Grid, Icon, IconButton, Stack, Text }", "import { Avatar, Button, Card, Grid, Icon, IconButton, Stack, Text }");
  const { pkg } = figmaPackage(pictured, { mapping, nestedLayers: NESTED_LAYERS, page: { id: "p" } });
  const avatar = find(pkg.frame, (node) => node.image);
  check("a picture: the Avatar names it, Theme Photo, and the package lists it for the caller to fill", { image: avatar?.image, theme: avatar?.props.Theme, images: pkg.images }, { image: "zen-media:abc123", theme: "Photo", images: { "zen-media:abc123": null } });
}

// 7. What is not written yet is named, never dropped silently.
{
  const { notes } = push(PAGE.replace('<Card theme="default">\n              <Text>Loyalty app</Text>', '<Card theme="default" subAction={{ label: "More" }}>\n              <Text>Loyalty app</Text>'));
  ok("Card subAction is Figma's Sub-Action (no \"is data\" note); a label Figma has no place for is named", !notes.some((note) => /subAction is data/.test(note)) && notes.some((note) => /its subAction label "More" has no place in Figma/.test(note)));
}
{
  // Card subAction ↔ Figma's Sub-Action (BACKLOG P3, 2026-10-21): on with the prop, its icon the Sub-Action's
  // Leading-Icon-Src when not the default ⋮; back as subAction with the built-in label. MetricCard's through its Card.
  const page = `// @zen-page {"format":1,"title":"Sub"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Card, IconButton, Menu, MetricCard, Stack, Text } from "@zen-ds/react";

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Sub" device="desktop">
        <Stack>
          <Card width={280} subAction={{ label: "More actions", icon: "icon-share-01-line" }}>
            <Text>A</Text>
          </Card>
          <Card subAction={{ label: "More actions" }}>
            <Text>B</Text>
          </Card>
          <Card subAction={<IconButton appearance="flat" icon="icon-edit-01-line" aria-label="Edit" />}>
            <Text>C</Text>
          </Card>
          <MetricCard type="sparkline" label="Revenue" value="$12k" subAction={{ label: "More actions", icon: "icon-share-01-line" }} width={320} />
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame, notes } = push(page);
  const [shared, plain, edited, metric] = frame.children;
  check("Card subAction with an icon: Sub-Action on, its Button/Icon-Flat's Leading-Icon-Src", [shared.props["Sub-Action"], shared.nested?.find((entry) => entry.path === "Sub-Action")], [true, { path: "Sub-Action", set: { id: "234:43906", name: "Button/Icon-Flat" }, props: { "Leading-Icon-Src": "icon-share-01-line" } }]);
  check("Card subAction with the default ⋮: Sub-Action on, nothing nested; the built-in label needs no note", [plain.props["Sub-Action"], plain.nested ?? null, notes.some((note) => /label .* has no place/.test(note))], [true, null, false]);
  check("a subAction IconButton gives its icon", edited.nested?.find((entry) => entry.path === "Sub-Action")?.props, { "Leading-Icon-Src": "icon-edit-01-line" });
  ok("MetricCard subAction icon: its Card's Sub-Action", metric.nested?.some((entry) => entry.path === "Card/Sub-Action" && entry.props["Leading-Icon-Src"] === "icon-share-01-line"));
  const menu = push(page.replace('<IconButton appearance="flat" icon="icon-edit-01-line" aria-label="Edit" />', '<Menu items={[{ id: "a", label: "A" }]} />'));
  ok("a subAction node that is not an IconButton shows as Figma's ⋮, noted", menu.notes.some((note) => /its subAction Menu shows as Figma's ⋮ Sub-Action/.test(note)));
  const back = pageFromFigma(frame, { mapping }).text;
  check("Card width={280} is the instance's Fixed width; MetricCard takes no width (its API), so none is written", [shared.fixedWidth, metric.fixedWidth ?? null], [280, null]);
  check("round trip: subAction comes back with its icon (and none for the default ⋮)", [back.includes('<Card width={280} subAction={{ label: "More actions", icon: "icon-share-01-line" }}>'), back.includes('<Card subAction={{ label: "More actions" }}>'), back.includes('subAction={{ label: "More actions", icon: "icon-share-01-line" }} label="Revenue"')], [true, true, true]);
  ok("round trip: no Sub-Action override is left from what Card draws (flat, Secondary, Small)", !/"Sub-Action": \{/.test(back));
}
{
  // MetricCard surface / spacing and a Subtle card's Color (box themes, 2026-10-23): the Metric-Card's exposed Card takes
  // Surface=Alt (code's Shadow on alt is Figma's Default on Alt), a Spacing off its type's default, and Color on Subtle.
  const page = `// @zen-page {"format":1,"title":"Box"}
import { Board, Screen } from "@zen-ds/react/builder";
import { MetricCard, Stack } from "@zen-ds/react";

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Box" device="desktop">
        <Stack>
          <MetricCard type="sparkline" theme="border" surface="alt" spacing="sm" label="Revenue" value="$12k" />
          <MetricCard type="sparkline" surface="alt" label="Costs" value="$4k" />
          <MetricCard type="sparkline" theme="subtle" color="cyan" label="Invoiced" value="$9k" />
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame } = push(page);
  const cardOf = (node) => node.nested?.find((entry) => entry.path === "Card")?.props;
  const [border, shadow, subtle] = frame.children.map(cardOf);
  check("MetricCard surface/spacing: Border on Alt at Small; Shadow on alt is Default on Alt; Subtle keeps its Color", [border, shadow, subtle], [{ "Sub-Action": false, Theme: "Border", Surface: "Alt", Spacing: "Small" }, { "Sub-Action": false, Surface: "Alt", Theme: "Default" }, { "Sub-Action": false, Theme: "Subtle", Color: "Cyan" }]);
  const back = pageFromFigma(frame, { mapping }).text;
  ok("round trip: surface, spacing and the Subtle colour come back", back.includes('theme="border" surface="alt" spacing="sm"') && back.includes('theme="default" surface="alt"') && back.includes('theme="subtle" color="cyan"'));
}

// 8. A component with no Figma set keeps what it holds (2026-10-12: an AppShell page imported as an empty frame): the
//    AppShell as the Zen components it renders, the Screen's app frame, PageHeader as the Dashboard header Type=Main,
//    wrappers as frames of their layers, Heading as text, a Menu as its trigger.
const SHELL = `// @zen-page {"format":1,"title":"Team"}
import { Board, Screen } from "@zen-ds/react/builder";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader, Breadcrumbs, Button, Container, Heading, List, ListItem, Menu, PageHeader, Search, Sidebar, SidebarMenuItem, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Team" device="desktop">
        <AppShell
          sidebar={<Sidebar aria-label="Main" selectedId="people">
            <SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" />
            <SidebarMenuItem id="people" label="People" icon="icon-users-line" />
          </Sidebar>}
          header={<AppShellHeader
            leading={<Breadcrumbs items={[{ id: "team", label: "Team" }]} />}
            actions={<Stack direction="row" gap="sm" align="center">
              <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={3} />
              <Menu trigger={<AppShellAccount name="Khoa Dang" />} items={[{ id: "out", label: "Sign out" }]} />
            </Stack>}
            main={<PageHeader title="Team members" description="12 people" actions={<Stack direction="row" gap="sm"><Button level="tertiary">Export</Button><Button>Invite</Button></Stack>} />}
          />}
        >
          <Container>
            <Stack gap="lg">
              <Heading level={2}>Admins</Heading>
              <List>
                <ListItem title="Ava Chen" />
                <ListItem title="Linh Hoang" />
              </List>
            </Stack>
          </Container>
        </AppShell>
      </Screen>
    </Board>
  );
}
`;
{
  const { frame, notes } = push(SHELL);
  const shell = frame.children[0];
  // AppShell as Figma's ◇ Master-Layout (user 2026-10-17: "app shell và master layout không khớp …"): one instance.
  check("AppShell: Figma's Master-Layout (Patterns/Pages/Density-Medium Level=Master) filling the frame: Sidebar on, no Side-Panel, no floating action", { name: shell?.name, set: shell?.set?.name, props: shell?.props, fillW: shell?.fillW }, { name: "AppShell", set: "Patterns/Pages/Density-Medium", props: { Level: "Master", Sidebar: true, "Side-Panel": false, "Floating-Actions": false }, fillW: true });
  const slotOf = (name) => shell.slots.find((slot) => slot.name === name);
  const inner = ["Patterns/Sidebar", "Patterns/Density/Comfortable/Sidebar/Yes"];
  check("AppShell: the Sidebar pattern Expand=Yes (Default · Medium, the Sidebar's look); its Side-Bar's rows in Body-Content (the selected one Select Yes), no logo: Header-Content emptied, no footer: Footer-Content emptied, its container hidden inside the Side-Bar (not the master's first layer of that name)", { expand: shell.nested.find((entry) => entry.path === "Patterns")?.props, slots: shell.slots.filter((slot) => slot.within?.[0] === inner[0]).map((slot) => [slot.name, slot.within, slot.children.map((row) => `${row.text}:${row.props.Select}`)]), hide: shell.hide, hidden: shell.edits.filter((edit) => edit.visible === false).map((edit) => edit.layer) }, { expand: { Expand: "Yes", Shadow: "Yes", Theme: "Default", Density: "Medium" }, slots: [["Header-Content", inner, []], ["Body-Content", inner, ["Home:No", "People:Yes"]], ["Footer-Content", inner, []]], hide: undefined, hidden: [[...inner, "Divider"], [...inner, "Footer-Container"]] });
  // The header: Figma's Header/AppShell (16783:71068). The master predates it, so its Header/Dashboard is swapped per instance.
  const swap = shell.nested.find((entry) => entry.path === "Header/Dashboard");
  check("AppShell: the master's Header/Dashboard swapped to Header/AppShell, its Collapse Button the AppShell's toggle, Top-Header and Main on", { set: swap?.set?.name, name: swap?.name, props: swap?.props }, { set: "Header/AppShell", name: "Header/AppShell", props: { Main: true, "Top-Header": true, "Collapse Button": true } });
  check("AppShell: a header with no sections empties Header/AppShell's Sections slot (it holds two sample rows)", slotOf("Sections") && { within: slotOf("Sections").within, children: slotOf("Sections").children }, { within: ["Header/AppShell"], children: [] });
  const top = slotOf("Top-Elements");
  check("AppShell: Top-Elements in Header/AppShell: Leading-Slots the header's leading (Fill, Gap/Medium), Trailing-Slots the actions and the account's Avatar (Fill, right, Gap/Small); no center, no Center-Slots", [top?.within, top?.children.map((frame) => [frame.name, frame.fillW, frame.layout.gapVar, frame.layout.primary, frame.children.map((child) => child.set.name)])], [["Header/AppShell"], [["Leading-Slots", true, "Spacing/Gap/Medium", "MIN", ["Breadcrumbs"]], ["Trailing-Slots", true, "Spacing/Gap/Small", "MAX", ["Primitives/Dashboard/Header/Action-Item", "Avatar/Single"]]]]);
  check("AppShell: no Dashboard header rows, no hidden header", [shell.slots.some((slot) => slot.within?.[0] === "Header/Dashboard"), shell.edits.some((edit) => edit.layer?.[0] === "Header/Dashboard")], [false, false]);
  const account = find({ children: top.children }, (node) => node.set?.name === "Avatar/Single");
  check("AppShellAccount (a Menu's trigger): its Avatar, named by the person, the initials", [account?.name, account?.text, account?.props.Size], ["Khoa Dang", "KD", "Medium"]);
  const content = slotOf("Content");
  const main = content.children[0];
  check("Container: in Body's Content slot, a frame of its layers with the gutter (Margin-Comfortable each side); Body keeps the master's padding as AppShell's Body pads", [content.within, main?.name, main?.layout.padding, main?.fillW, shell.edits.find((edit) => edit.padding) ?? null], [["Body"], "Container", [0, 24, 0, 24], true, null]);
  // Figma's master is one viewport tall (982) with its Content filling it: a longer page was cut off (2026-10-17).
  check("AppShell grows with its page: Main-Container, Body and the Content slot hug, the Side-Bar is as tall, the viewport's 982 stays the minimum", { min: shell.minH, content: content.hugH, hug: shell.edits.filter((edit) => edit.hugH).map((edit) => edit.layer.join(" › ")), fill: shell.edits.filter((edit) => edit.fillH).map((edit) => edit.layer.join(" › ")) }, { min: 982, content: true, hug: ["Main-Container", "Body"], fill: [inner.join(" › ")] });
  const header = slotOf("Main-Element")?.children[0];
  check("PageHeader (the header's Main row, in Main-Element, filling it): the Dashboard header Type=Main, its title, SubHeading and actions (Actions on)", [header?.text, header?.texts?.SubHeading, header?.props.Actions, header?.slots?.[0]?.name, header?.slots?.[0]?.children.map((button) => button.text)], ["Team members", "12 people", true, "Action-Slots", ["Export", "Invite"]]);
  check("PageHeader: Header-Text is a slot, so its SubHeading shows and its Child hides by their own eyes; no Child-Heading (Figma dropped it)", [header?.edits, "Child-Heading" in (header?.props ?? {})], [[{ layer: ["Header-Text", "Heading-Wrapper", "Child"], visible: false }, { layer: ["Header-Text", "SubHeading"], visible: true }], false]);
  check("Heading: text in its level's style (h2 Heading/4)", find(main, (node) => node.type === "TEXT" && node.characters === "Admins")?.textStyle, "Heading/4");
  const list = find(main, (node) => node.name === "List");
  check("List: a frame of its rows, Gap/3XSmall", [list?.type, list?.layout.gap, list?.children.map((row) => row.set.name)], ["FRAME", 2, ["List-Item", "List-Item"]]);
  ok("the wrappers are named in one note each", notes.includes("Container: no Figma component, drawn as a frame of its layers (or as its text)") && notes.includes("List: no Figma component, drawn as a frame of its layers (or as its text)"));
  const keys = []; const walk = (node) => { keys.push(node.key); (node.children ?? []).forEach(walk); (node.slots ?? []).forEach((slot) => slot.children.forEach(walk)); }; walk(frame);
  check("AppShell: every layer keyed, no key twice (the frame by the Screen, not its AppShell)", { all: keys.every(Boolean), unique: new Set(keys).size === keys.length, root: frame.key !== shell.key }, { all: true, unique: true, root: true });
}
{
  // The master layout (the Screen's root AppShell, screen-frame.mjs) is the desktop layout's: a phone draws its content.
  const { frame } = push(SHELL.replace('device="desktop">', 'device="phone">'));
  const names = []; const walk = (node) => { names.push(node.set?.name ?? node.name); (node.children ?? []).forEach(walk); (node.slots ?? []).forEach((slot) => slot.children.forEach(walk)); }; walk(frame);
  check("Screen master layout (phone): no AppShell row, no Sidebar or top bar; the page's rows are drawn", { shell: frame.children[0]?.name === "AppShell" || names.includes("Sidebar"), rows: names.filter((name) => name === "List-Item").length }, { shell: false, rows: 2 });
}
{
  // AppShell pattern="grid" gives its Sidebar Border · Small (AppShell.tsx): the master's Sidebar pattern draws it so.
  const { frame } = push(SHELL.replace("<AppShell\n", '<AppShell pattern="grid"\n'));
  check("AppShell pattern=\"grid\": the master's Sidebar pattern Border · Small", masterSidebar(frame)?.pattern, { Expand: "Yes", Shadow: "No", Theme: "Border", Density: "Small" });
  const tag = pageFromFigma(frame, { mapping }).text.match(/<Sidebar\b[^>]*>/)?.[0] ?? "";
  check("round trip: the AppShell's Sidebar comes back with the pattern's look", ['theme="border"', 'density="small"'].map((attr) => tag.includes(attr)), [true, true]);
}
{
  // AppShellHeader as Figma's Header/AppShell (spec docs/research/studio-appshell-header-figma-spec-2026-10-21.md): its
  // theme and density, Figma's variant (Border & Divider is Small only), inside the master and on its own, and back.
  const themed = SHELL.replace("header={<AppShellHeader\n", 'header={<AppShellHeader theme="border-divider" density="small"\n');
  const { frame } = push(themed);
  const swap = frame.children[0].nested.find((entry) => entry.path === "Header/Dashboard");
  check("AppShell header: Theme Border & Divider, Density Small on the swapped Header/AppShell", [swap?.props.Theme, swap?.props.Density], ["Border & Divider", "Small"]);
  const back = pageFromFigma(frame, { mapping }).text;
  const tag = back.match(/<AppShellHeader\b[^>]*?(?=\s(leading|actions|main)=)/)?.[0] ?? back.match(/<AppShellHeader\b[^>]*>/)?.[0] ?? "";
  check("round trip: the AppShell's header comes back with its theme and density, its leading, actions and main", ['theme="border-divider"', 'density="small"'].map((attr) => tag.includes(attr)).concat(["leading={<Breadcrumbs", "<AppShellAccount", "main={<PageHeader"].map((part) => back.includes(part))), [true, true, true, true, true]);
  check("round trip: the toggle comes back as the AppShell's own (no collapse=\"none\")", back.includes('collapse="none"'), false);
  const medium = push(SHELL.replace("header={<AppShellHeader\n", 'header={<AppShellHeader theme="border-divider"\n'));
  const mediumSwap = medium.frame.children[0].nested.find((entry) => entry.path === "Header/Dashboard");
  check("Border & Divider at Density Medium: Figma's Small variant, with a note", [mediumSwap?.props.Theme, mediumSwap?.props.Density, medium.notes.some((note) => /no Border & Divider header at Density Medium/.test(note))], ["Border & Divider", "Small", true]);
  const none = push(SHELL.replace("<AppShell\n", '<AppShell collapse="none"\n'));
  check("collapse=\"none\": the Collapse Button off", none.frame.children[0].nested.find((entry) => entry.path === "Header/Dashboard")?.props["Collapse Button"], false);
  const noneBack = pageFromFigma(none.frame, { mapping }).text;
  check("round trip: collapse=\"none\" comes back", noneBack.includes('collapse="none"'), true);
  // The Side-Bar's own Collapse Button (on by default in Figma): off unless the AppShell puts the toggle there.
  const sideBar = (shell) => shell.nested.find((entry) => entry.path === "Patterns/Patterns")?.props["Collapse Button"];
  check("collapse=\"header\" (the default) and \"none\": the Side-Bar's Collapse Button off", [sideBar(frame.children[0]), sideBar(none.frame.children[0])], [false, false]);
  const side = push(SHELL.replace("<AppShell\n", '<AppShell collapse="sidebar"\n'));
  check("collapse=\"sidebar\": the Side-Bar's Collapse Button on, the header's off", [sideBar(side.frame.children[0]), side.frame.children[0].nested.find((entry) => entry.path === "Header/Dashboard")?.props["Collapse Button"]], [true, false]);
  check("round trip: collapse=\"sidebar\" comes back", pageFromFigma(side.frame, { mapping }).text.includes('collapse="sidebar"'), true);
  check("the master's row starts at the top (it centres its layers: a short page sat mid-height)", frame.children[0].edits.find((edit) => edit.layer.length === 0), { layer: [], counter: "MIN" });
}
{
  // A standalone AppShellHeader: Header/AppShell with its slots (no "no Figma slot" note any more).
  const page = `// @zen-page {"format":1,"title":"Header"}
import { Board, Screen } from "@zen-ds/react/builder";
import { AppShellHeader, Breadcrumbs, Button, PageHeader, Search, Stack, Text } from "@zen-ds/react";

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Header" device="desktop">
        <Stack>
          <AppShellHeader density="small" leading={<Search placeholder="Search" />} center={<Text>Q4</Text>} actions={<Button>New</Button>} main={<PageHeader title="Orders" childTitle="Q4" description="24 open" />} sections={<Text>Filters</Text>} />
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame, notes } = push(page);
  const header = frame.children[0];
  const slot = (name) => header.slots?.find((entry) => entry.name === name);
  check("AppShellHeader on its own: Header/AppShell, Density Small, Top-Header and Main on, no Collapse Button", [header.set?.name, header.props.Density, header.props["Top-Header"], header.props.Main, header.props["Collapse Button"]], ["Header/AppShell", "Small", true, true, false]);
  check("its Top-Elements: Leading-Slots (the Search filling up to 400), Center-Slots 400 wide (its layers filling it), Trailing-Slots", slot("Top-Elements")?.children.map((row) => [row.name, row.fixedWidth ?? null, row.children.map((child) => [child.set?.name ?? child.type, child.fillW ?? false, child.maxW ?? null])]), [["Leading-Slots", null, [["Search/Default", true, 400]]], ["Center-Slots", 400, [["TEXT", true, null]]], ["Trailing-Slots", null, [["Button/Main", false, null]]]]);
  check("its Main-Element the PageHeader (filling), its Sections the rows padded Padding/Small · Margin-Comfortable", [slot("Main-Element")?.children.map((child) => [child.set?.name, child.fillW]), slot("Sections")?.children.map((row) => [row.name, row.layout.padding, row.layout.paddingVars?.[0]])], [[["Primitives/Dashboard/Header", true]], [["Section", [12, 24, 12, 24], "Spacing/Padding/Small"]]]);
  ok("no slot of it is left out", !notes.some((note) => /AppShellHeader: .* no Figma slot/.test(note)));
  const back = pageFromFigma(frame, { mapping }).text;
  check("round trip: the header comes back with its density and its five parts", ['density="small"', "leading={<Search", "center={<Text", "actions={<Button", "main={<PageHeader", "sections={<Text"].map((part) => back.includes(part)), [true, true, true, true, true, true]);
  check("round trip: the PageHeader's Child and SubHeading shown by their eyes come back as childTitle and description", [back.includes('childTitle="Q4"'), back.includes('description="24 open"')], [true, true]);
}
{
  // The Screen's app frame (screen-chrome.mjs): Sidebar beside a column of the Page header and the page.
  const chrome = SHELL.replace(/<AppShell[\s\S]*<\/AppShell>/, '<Stack gap="md"><Heading level={1}>Team</Heading></Stack>').replace('device="desktop">', 'device="desktop" header={<PageHeader title="Team" />} sidebar={<Sidebar aria-label="Main" selectedId="home"><SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" /></Sidebar>} topNavigation={<Heading>Phone only</Heading>}>');
  const { frame, notes } = push(chrome);
  const screen = frame.children[0];
  check("Screen chrome (desktop): Sidebar beside Main › Header (Padding/XLarge) and Content; the phone's parts wait", { parts: screen?.children.map((child) => child.set?.name ?? child.name), main: screen?.children[1]?.children.map((child) => child.name), header: screen?.children[1]?.children[0]?.layout.padding }, { parts: ["Patterns/Sidebar", "Main"], main: ["Header", "Content"], header: [24, 24, 0, 24] });
  ok("Screen chrome: nothing noted as not pushed", !notes.some((note) => /^Screen /.test(note)));
}
{
  // The round trip of an app page (P2): what the push draws, the pull reads back as an AppShell.
  const { frame } = push(SHELL);
  const back = pageFromFigma(frame, { mapping }).text;
  const shell = shape(back).children[0].children[0];
  const prop = (name) => shell.props[name]?.element;
  check("AppShell round trip: an AppShell straight in the Screen, its Sidebar's rows with the selected one", { name: shell.name, sidebar: prop("sidebar")?.name, selected: prop("sidebar")?.props.selectedId }, { name: "AppShell", sidebar: "Sidebar", selected: "people" });
  const headerProp = (name) => prop("header")?.props[name]?.element;
  check("AppShell round trip: the toggle is AppShell's own (not a header layer), the header an AppShellHeader leading with the Breadcrumbs, the PageHeader its Main row", { toggle: shell.props.collapse ?? null, header: prop("header")?.name, leading: headerProp("leading")?.name, main: headerProp("main")?.props.title }, { toggle: null, header: "AppShellHeader", leading: "Breadcrumbs", main: "Team members" });
  check("AppShell round trip: the actions, the account (its Avatar named after the person) as AppShellAccount", headerProp("actions")?.children.map((child) => child.name), ["AppShellAction", "AppShellAccount"]);
  check("AppShell round trip: the page's Container › Stack comes back as the AppShell's content", shell.children.map((child) => child.name), ["Stack"]);
}
{
  // The Screen's app frame round trip: Sidebar and Page header come back as the Screen's props.
  const chrome = SHELL.replace(/<AppShell[\s\S]*<\/AppShell>/, '<Stack gap="md"><Button>Invite</Button></Stack>').replace('device="desktop">', 'device="desktop" header={<PageHeader title="Team" description="12 people" />} sidebar={<Sidebar aria-label="Main" selectedId="home"><SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" /></Sidebar>}>');
  const back = shape(pageFromFigma(push(chrome).frame, { mapping }).text);
  const screen = back.children[0];
  check("Screen chrome round trip: the Screen's sidebar and its Page header (title, description), the page as before", { sidebar: screen.props.sidebar?.element.name, header: screen.props.header?.element.name, title: screen.props.header?.element.props.title, description: screen.props.header?.element.props.description, page: screen.children.map((child) => child.name) }, { sidebar: "Sidebar", header: "PageHeader", title: "Team", description: "12 people", page: ["Stack"] });
}
{
  const empty = SHELL.replace(/<AppShell[\s\S]*<\/AppShell>/, "<Menu items={[]} />");
  const { pkg, notes } = figmaPackage(empty, { mapping, nestedLayers: NESTED_LAYERS, page: { id: "p" } });
  check("a page with nothing Figma can place gives no package, and says why", [pkg, /^nothing on the page has a place in Figma/.test(notes[0] ?? "")], [null, true]);
}

// 9. The Dashboard as Figma draws it (2026-10-12, imported in the live file: metrics stacked with sample texts, cells
//    overlapping): columns that fit as a wrapping row, MetricCard and ChartCard as a Card around Figma's metric and
//    chart, ListItem and ListBox parts, Text in its default style and tone, icon names as Figma's cuts.
const DASH = `// @zen-page {"format":1,"title":"Dash"}
import { Board, Screen } from "@zen-ds/react/builder";
import { AppShell, AppShellHeader, Avatar, ChartCard, Chip, DockIcon, Grid, IconButton, LineChart, List, ListBox, ListItem, MetricCard, Search, Segmented, Sidebar, SidebarMenuItem, Stack, StackBarChart, Text, Button, Heading } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Dash" device="desktop">
        <AppShell header={<AppShellHeader leading={<Search aria-label="Search" placeholder="Search projects" />} />} sidebar={<Sidebar aria-label="Main" selectedId="home"><SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" /></Sidebar>}>
          <Stack gap="md">
            <Chip variant="advanced" size="md" dropdown leading="icon-calendar-line">This quarter</Chip>
            <Text tone="base">Jul 1 – Sep 30</Text>
            <Grid columns="repeat(auto-fit, minmax(min(100%, 496px), 1fr))" gap="md">
              <MetricCard variant="title-highlight" size="xl" label="Revenue" value="$541.4K" trend={{ direction: "positive", label: "+8% vs. Q2" }} icon="icon-coins-stacked-01-solid" iconTheme="green" action={<IconButton size="xs" icon="icon-chevron-right-line" aria-label="Revenue breakdown" />} />
              <ChartCard title="Revenue" theme="shadow" range="revenue" ranges={[{ id: "revenue", label: "Revenue" }, { id: "profit", label: "Profit" }]}><LineChart data={[{ label: "Apr", value: 1 }]} /></ChartCard>
              <ChartCard title="Hours" theme="shadow"><StackBarChart series={[{ id: "a", label: "A" }]} data={[{ label: "Apr", values: { a: 1 } }]} /></ChartCard>
            </Grid>
            <Grid columns={{ mobile: 1, desktop: 2 }}>
              <ListBox header={<Stack direction="row" justify="between" align="center"><Heading level={2} textStyle="Heading/Subheading">Recent activity</Heading><Button level="tertiary" size="sm">Show all</Button></Stack>}>
                <List>
                  <ListItem title="Checkout shared" caption="Bao Nguyen" leading={<Avatar size="md" theme="green" background="subtle" alt="">BN</Avatar>} />
                  <ListItem title="Token set approved" leading={<DockIcon icon="icon-file-check-line" theme="green" background="subtle" size="md" />} />
                </List>
              </ListBox>
              <Text>One</Text>
              <Text>Two</Text>
            </Grid>
          </Stack>
        </AppShell>
      </Screen>
    </Board>
  );
}
`;
{
  const { frame, notes } = push(DASH);
  const shell = frame.children[0];
  // The Screen frame as Studio draws it (builder.css): Canvas/Default (or the Screen's canvas), at least 900 tall, a phone
  // 844; the plugin's frame was Figma's default white, the paste's had no fill (board test, 2026-10-18).
  const altScreen = push(DASH.replace('device="desktop">', 'device="desktop" canvas="alt">')).frame;
  check("Screen frame: Canvas/Default and 900 minimum, the Screen's canvas when set, a phone's 844; read back as the Screen's canvas (no Box)", [frame.fill, frame.minH, altScreen.fill, push(DASH.replace('device="desktop">', 'device="phone">')).frame.minH, /<Screen[^>]*canvas="alt"/.test(pageFromFigma(altScreen, { mapping }).text), /surface="canvas"/.test(pageFromFigma(frame, { mapping }).text)], ["Background/Canvas/Default", 900, "Background/Canvas/Alt", 844, true, false]);
  check("AppShell: the page is Canvas (the master layout's own fill, canvas=\"alt\" overrides it)", [shell.set?.name, shell.fill, push(DASH.replace("<AppShell ", '<AppShell canvas="alt" ')).frame.children[0].fill], ["Patterns/Pages/Density-Medium", undefined, "Background/Canvas/Alt"]);
  const [fit, fixed] = find(frame, (node) => node.name === "Stack" && node.children?.some((child) => child.name === "Grid")).children.filter((child) => child.name === "Grid");
  // The page is 1440 less the open Sidebar's 240: auto-fit 496 + 16 takes 2 columns, the third card on a second row.
  check("Grid of columns that fit, in a page of known width: as many even columns as fit, Gap/Medium both ways, its cells keep the minimum (cards as tall as the row)", { layout: [fit.layout.mode, fit.layout.wrap, fit.layout.gap, fit.layout.rowGap, fit.layout.rowGapVar, fit.layout.grid], cells: fit.children.map((cell) => [cell.fillW, cell.fillH, cell.minW, cell.cell.col, cell.cell.row]) }, { layout: ["GRID", undefined, 16, 16, "Spacing/Gap/Medium", { columns: 2, rows: 2, sizes: [{ type: "FLEX", value: 1 }, { type: "FLEX", value: 1 }] }], cells: [[true, true, 496, 0, 0], [true, true, 496, 1, 0], [true, true, 496, 0, 1]] });
  check("Grid of a column count (desktop of { mobile, desktop }): Figma's grid, a row per two cells, cells in order; a text cell hugs its height", { grid: fixed.layout.grid, cells: fixed.children.map((cell) => [cell.cell.col, cell.cell.row, Boolean(cell.fillH)]) }, { grid: { columns: 2, rows: 2 }, cells: [[0, 0, true], [1, 0, false], [0, 1, false]] });
  const [metricCard, lineCard, barCard] = fit.children;
  const metric = metricCard.slots[0].children[0];
  check("MetricCard: a Card (Shadow, no ⋮) around Metric-Inline, its Label and Metric-Number, Trend, Dock-Icon and Action on", { card: [metricCard.set.name, metricCard.props.Theme, metricCard.props["Sub-Action"]], metric: [metric.set.name, metric.texts, metric.props.Trend, metric.props["Dock-Icon"], metric.props.Action] }, { card: ["Card", "Shadow", false], metric: ["Primitives/Metric/Metric-Inline/Title-Highlight", { Label: "Revenue", "Metric-Number": "$541.4K" }, true, true, true] });
  check("MetricCard: its trend badge, Dock Icon (its background written too: Metric's Subtle) and action glyph (a plain icon name as Figma's Medium cut)", metric.nested, [{ path: "Trend", props: { Trend: "Positive" }, textList: ["+8% vs. Q2"] }, { path: "Metric-Icon", props: { Theme: "Green", Background: "Subtle", "Icon-Src": "icon-coins-stacked-01-solid" } }, { path: "Button", props: { "Leading-Icon-Src": "icon-chevron-right-line-medium" } }]);
  // MetricCard custom (2026-10-14: Custom was on and its Custom-Slot empty, the card taller than its row with nothing in it).
  const CUSTOM = DASH.replace("import { AppShell,", "import { ProgressBar, AppShell,").replace('aria-label="Revenue breakdown" />} />', 'aria-label="Revenue breakdown" />} custom={<Stack gap="xs"><Text>Goal</Text><ProgressBar value={60} label aria-label="Goal" /></Stack>} />');
  const customPush = push(CUSTOM);
  const customMetric = find(customPush.frame, (node) => node.set?.name === "Primitives/Metric/Metric-Inline/Title-Highlight");
  const customSlot = customMetric.slots?.find((slot) => slot.name === "Custom-Slot");
  check("MetricCard custom: Custom on, its content one frame (its own Stack, Gap/XSmall) filling Custom-Slot", [customMetric.props.Custom, customSlot?.children.map((child) => [child.type, child.layout?.gap, child.fillW, child.children.length])], [true, [["FRAME", 8, true, 2]]]);
  ok("MetricCard custom: no note that it has no Figma slot", !customPush.notes.some((note) => /custom holds layers/.test(note)));
  const customBack = pageFromFigma(customPush.frame, { mapping }).text;
  ok("round trip: the MetricCard's custom comes back (its Stack, Text and ProgressBar)", /<MetricCard[^>]*custom=\{<Stack gap="xs"><Text>Goal<\/Text><ProgressBar\b/.test(customBack));
  const line = lineCard.slots[0].children[0];
  check("ChartCard: a Card around Figma's chart of its kind, the title its Title, ranges as Segmented items (Show Ranges), no open button without onOpen", { set: line.set.name, title: line.props.Title, ranges: line.props["Show Ranges"], open: line.props["Show Open"], items: line.slots?.[0]?.children.map((item) => `${item.text}:${item.props.Select}`), hide: line.hide }, { set: "Chart/Line-Chart", title: "Revenue", ranges: true, open: false, items: ["Revenue:Yes", "Profit:No"] });
  check("ChartCard without ranges: Show Ranges and Show Open off", [barCard.slots[0].children[0].props["Show Ranges"], barCard.slots[0].children[0].props["Show Open"]], [false, false]);
  check("ChartCard ranges: items Medium Secondary (Figma's item starts Small Primary), splitting the full-width switch", line.slots[0].children.map((item) => [item.props.Size, item.props.Level, item.fillW]), [["Medium", "Secondary", true], ["Medium", "Secondary", true]]);
  const hugging = push(DASH.replace('range="revenue"', 'range="revenue" rangesFullWidth={false}'));
  const hugLine = find(hugging.frame, (node) => node.set?.name === "Chart/Line-Chart");
  check("ChartCard rangesFullWidth={false}: the Segmented and its Item-List hug, items hug", [hugLine.nested.filter((item) => !/^Sector-/.test(item.path)), hugLine.slots[0].hugW, hugLine.slots[0].children.map((item) => Boolean(item.fillW))], [[{ path: "Segmented", hugW: true }], true, [false, false]]);
  const segmented = push(DASH.replace("<Text>One</Text>", '<Segmented level="primary" size="sm" defaultValue="w" options={[{ id: "d", label: "Day" }, { id: "w", label: "Week" }]} />'));
  const seg = find(segmented.frame, (node) => node.set?.name === "Segmented");
  check("Segmented: as wide as its items (not fullWidth), its items its Level and Size, the selected one Select Yes", [seg.hugW, seg.slots[0].hugW, seg.slots[0].children.map((item) => [item.text, item.props.Level, item.props.Size, item.props.Select])], [true, true, [["Day", "Primary", "Small", "No"], ["Week", "Primary", "Small", "Yes"]]]);
  const listBox = fixed.children[0];
  check("ListBox: Header on, its header row one frame filling Header-Slot, the List filling Body-Slot", { header: listBox.props.Header, slots: listBox.slots.map((slot) => [slot.name, slot.children.map((child) => [child.type, child.layout?.mode, child.fillW])]) }, { header: true, slots: [["Header-Slot", [["FRAME", "HORIZONTAL", true]]], ["Body-Slot", [["FRAME", "VERTICAL", true]]]] });
  const bordered = find(push(DASH.replace("<ListBox header=", '<ListBox theme="border" header=')).frame, (node) => node.set?.name === "Component/List-Box");
  const onContainer = find(push(DASH.replace("<ListBox header=", '<ListBox theme="on-container" header=')).frame, (node) => node.set?.name === "Component/List-Box");
  check("ListBox theme: Figma's Theme (Default by default, Border and On-Container by theme)", [listBox.props.Theme, bordered.props.Theme, onContainer.props.Theme], ["Default", "Border", "On-Container"]);
  const paleHue = find(push(DASH.replace("<ListBox header=", '<ListBox theme="pale" color="green" header=')).frame, (node) => node.set?.name === "Component/List-Box");
  const borderAlt = find(push(DASH.replace("<ListBox header=", '<ListBox theme="border" surface="alt" header=')).frame, (node) => node.set?.name === "Component/List-Box");
  const shadowHue = find(push(DASH.replace("<ListBox header=", '<ListBox theme="shadow" color="green" surface="alt" header=')).frame, (node) => node.set?.name === "Component/List-Box");
  check("ListBox color / surface: Figma's Color on Pale and Surface=Alt on Border; a Shadow box keeps Neutral on Surface Default (Figma has no other)", [[paleHue.props.Color, paleHue.props.Surface], [borderAlt.props.Color, borderAlt.props.Surface], [shadowHue.props.Color, shadowHue.props.Surface], [listBox.props.Color, listBox.props.Surface]], [["Green", "Default"], ["Neutral", "Alt"], ["Neutral", "Default"], ["Neutral", "Default"]]);
  const [withAvatar, withDock] = listBox.slots[1].children[0].children;
  check("ListItem: Title and Subtitle, its leading Avatar (theme, initials) in Figma's Avatar", [withAvatar.texts, withAvatar.nested[0].set.name, withAvatar.nested[0].props.Theme, withAvatar.nested[0].text], [{ Title: "Checkout shared", Subtitle: "Bao Nguyen" }, "Avatar/Single", "Green", "BN"]);
  check("ListItem: a Dock Icon swaps in for the Avatar; no caption hides Subtitle", [withDock.nested[0].set.name, withDock.nested[0].props["Icon-Src"], withDock.hide], ["Dock-Icon", "icon-file-check-line", ["Subtitle"]]);
  const chip = find(frame, (node) => node.set?.name === "Chip/Advanced");
  check("Chip with a leading icon: Theme Leading-Icon, its Leading glyph swapped", [chip.props.Theme, chip.props["Icon-Src"], chip.swapIcon], ["Leading-Icon", undefined, "icon-calendar-line"]);
  check("Search: its placeholder in its Text layer", find(frame, (node) => node.set?.name === "Search/Default")?.texts, { Text: "Search projects" });
  check("Text: Body/Base/Regular in Neutral Strongest by default, a tone in its Color/Content variable", [find(frame, (node) => node.characters === "One")?.textStyle, find(frame, (node) => node.characters === "One")?.fill, find(frame, (node) => node.characters === "Jul 1 – Sep 30")?.fill], ["Body/Base/Regular", "Content/Neutral/Strongest", "Content/Neutral/Base"]);
  ok("no part of a MetricCard, ListItem or ListBox noted as left out", !notes.some((note) => /^(MetricCard|ListItem|ListBox).*no Figma slot/.test(note)));
  const back = pageFromFigma(frame, { mapping }).text;
  ok("round trip: the columns that fit come back a Grid (minColumnWidth)", /<Grid minColumnWidth=\{496\}/.test(back));
}

// 10. Templates imported in the live file (2026-10-12): fields, toggles, lists of terms, tabs and steps showed Figma's
//     sample words; hidden text and an inactive tab's panel were drawn; long text ran past its column; links in a text
//     were lost.
const FORMS = `// @zen-page {"format":1,"title":"Forms"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Avatar, Badge, Box, DescriptionList, Divider, InlineMessage, InputField, Link, List, ListBox, ListItem, SelectField, Stack, Stepper, TabPanel, Tabs, Text, Toggle, VisuallyHidden } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Forms" device="desktop">
        <Stack gap="md" align="start">
          <Stack direction="row" justify="center" width="fill">
            <Box width="fill" maxWidth={400} clip>
              <Stack direction="row" fillChildren><InputField label="Work email" placeholder="you@studio.com" /></Stack>
              <InputField label="Password" type="password" />
            </Box>
          </Stack>
          <SelectField label="Role" defaultValue="lead" options={[{ value: "lead", label: "Team lead" }, { value: "member", label: "Member" }]} helpText="Leads approve leave." />
          <Toggle label="Weekly summary" />
          <Stack direction="row" gap="sm" align="center"><Divider /><Text>or</Text><Divider /></Stack>
          <Text>New here? <Link href="#">Create an account</Link></Text>
          <Text>A long sentence in a column that starts its items, which the browser wraps at the column's width.</Text>
          <VisuallyHidden>Loading projects</VisuallyHidden>
          <DescriptionList layout="stacked" items={[{ term: "Order", description: "#1058" }, { term: "Total", description: "$81.60", emphasis: true }, { term: "Ship to", description: <Stack gap="none"><Text>12 Ly Tu Trong</Text><Text>District 1</Text></Stack> }]} />
          <Tabs defaultValue="activity" variant="subtle" items={[{ id: "overview", label: "Overview" }, { id: "activity", label: "Activity", badge: 5 }]} />
          <TabPanel id="overview" hidden><Text>Overview panel</Text></TabPanel>
          <TabPanel id="activity" hidden={false}><Text>Activity panel</Text></TabPanel>
          <Stepper orientation="vertical" current={1} steps={[{ id: "a", title: "Ordered" }, { id: "b", title: "Shipped", caption: "Oct 1" }, { id: "c", title: "Delivered" }]} />
          <ListItem title="Lotus Coffee" trailing={<Badge theme="green">Paid</Badge>} leading={<Avatar src="/a.jpg" alt="" background="solid" />} />
          <InlineMessage theme="warning" title="Not paid yet" action={{ label: "Send reminder" }}>The last reminder went out Sep 22.</InlineMessage>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
{
  const { frame, notes } = push(FORMS);
  const all = []; const walk = (node) => { all.push(node); (node.children ?? []).forEach(walk); (node.slots ?? []).forEach((slot) => slot.children.forEach(walk)); }; walk(frame);
  const bySet = (name) => all.filter((node) => node.set?.name === name);
  const box = all.find((node) => node.name === "Box");
  check("Box: clip cuts (the only frame that does), maxWidth kept, a Stack neither", [box.clip, box.maxW, Boolean(all.find((node) => node.name === "Stack").clip)], [true, 400, false]);
  check("a Stack with clip cuts too (Stack and Grid take clip as Box does)", push(FORMS.replace('<Stack gap="md" align="start">', '<Stack gap="md" align="start" clip>')).frame.clip, true);
  check("InputField: label in Label, the placeholder in Text; filling its fillChildren row", [bySet("Input/Text-Field")[0].texts, bySet("Input/Text-Field")[0].fillW], [{ Label: "Work email", Text: "you@studio.com" }, true]);
  check("InputField with neither value nor placeholder: its Text empty (not Figma's sample)", bySet("Input/Text-Field")[1].texts, { Label: "Password", Text: "" });
  const select = bySet("Input/Select-Field")[0];
  check("SelectField: its value as the option's label (State Inputted), its help in Message", [select.texts, select.props.State], [{ Label: "Role", Text: "Team lead", Message: "Leads approve leave." }, "Inputted"]);
  check("Toggle: its label in its Content, whose Subtext stays off without a caption", [bySet("Toggle")[0].texts, bySet("Toggle")[0].nested], [{ Label: "Weekly summary" }, [{ path: "Content", props: { Subtext: false } }]]);
  const row = all.find((node) => node.layout?.mode === "HORIZONTAL" && node.children?.some((child) => child.set?.name === "Divider"));
  check("Divider in a row takes the room left", row.children.filter((child) => child.set?.name === "Divider").map((divider) => Boolean(divider.fillW)), [true, true]);
  check("Text with an inline Link: all its words", all.some((node) => node.characters === "New here? Create an account"), true);
  check("Text in a column (align start) fills it, so it wraps", Boolean(all.find((node) => node.characters?.startsWith("A long sentence")).fillW), true);
  check("VisuallyHidden and a hidden TabPanel are not drawn", [all.some((node) => node.characters === "Loading projects"), all.some((node) => node.characters === "Overview panel"), all.some((node) => node.characters === "Activity panel")], [false, false, true]);
  const terms = bySet(".Primitives/Description-List/Item");
  check("DescriptionList items: Term / Value, the list's Layout and each one's Emphasis on the item", terms.map((item) => [item.props.Term, item.props.Value, item.props.Layout, item.props.Emphasis]), [["Order", "#1058", "Stacked", "No"], ["Total", "$81.60", "Stacked", "Yes"], ["Ship to", "12 Ly Tu Trong District 1", "Stacked", "No"]]);
  check("Tabs items: Tab-Items with their Text, Style, the selected one, a badge", bySet("Primitives/Tab-Item").map((tab) => [tab.text, tab.props.Style, tab.props.Select, tab.props.Badge]), [["Overview", "Subtle", "No", false], ["Activity", "Subtle", "Yes", true]]);
  check("Stepper (vertical) steps: number (none on a passed step: it draws a mark), title, caption; Passed, Focused, Default by current; First / Middle / Last", bySet(".Primitives/Stepper/Step-Vertical").map((step) => [step.texts.Label, step.texts["Step Title"], step.texts.Caption ?? null, step.props.State, step.props.Position]), [[null, "Ordered", null, "Passed", "First"], ["2", "Shipped", "Oct 1", "Focused", "Middle"], ["3", "Delivered", null, "Default", "Last"]]);
  const item = bySet("List-Item")[0];
  check("ListItem: trailing in the Trailing primitive's Actions slot; a photo Avatar takes Background Subtle", [item.slots?.find((slot) => slot.name === "Actions")?.children[0]?.set?.name, item.nested[0].props.Theme, item.nested[0].props.Background], ["Badge", "Photo", "Subtle"]);
  const message = bySet("Inline-Message")[0];
  check("InlineMessage: Title, its words in Caption (not the first text layer), the action's label", [message.text, message.texts, message.nested], [undefined, { Title: "Not paid yet", Caption: "The last reminder went out Sep 22." }, [{ path: "Action", props: {}, text: "Send reminder" }]]);
  ok("no item list noted as not written", !notes.some((note) => /has no item set yet|trailing holds layers/.test(note)));
  const own = push(FORMS.replace('<ListItem title="Lotus Coffee"', '<ListBox><List><ListItem title="2-step verification"><Stack direction="row" gap="xs"><Text>2-step verification</Text><Badge>Off</Badge></Stack><Text>Add a code</Text></ListItem></List></ListBox><ListItem title="Lotus Coffee"'));
  const placed = []; const collect = (node) => { placed.push(node); (node.children ?? []).forEach(collect); (node.slots ?? []).forEach((slot) => slot.children.forEach(collect)); }; collect(own.frame);
  const custom = placed.find((node) => node.texts?.Title === "2-step verification");
  check("ListItem with its own content: one column frame in Contents (Figma's slot is a row), Subtitle left alone; ListBox hugs its rows (its Container-Slot frame and Body-Slot too)", [custom.slots.find((slot) => slot.name === "Contents").children.map((child) => [child.type, child.layout?.mode, child.children?.length]), custom.hide ?? null, ["hugH", "hugLayers"].map((key) => placed.find((node) => node.set?.name === "Component/List-Box")[key]), placed.find((node) => node.set?.name === "Component/List-Box").slots.find((slot) => slot.name === "Body-Slot")?.hugH], [[["FRAME", "VERTICAL", 2]], null, [true, [{ name: "Container-Slot", h: true }]], true]);
}

// 11. Columns that fit, counted for the page's width (2026-10-12, the Dashboard's bottom row came out 592 / 544 in Figma
//     where the Studio splits it 568 / 568): the width each frame fills (Screen, AppShell less the Sidebar, Container's
//     gutter and maxWidth, grid tracks), an even Figma grid where it is known, a wrapping row where it is not.
//     Breadcrumbs draw their chevrons (Dash) and Level; InlineMessage's close button follows onClose.
const WIDTHS = `// @zen-page {"format":1,"title":"Widths"}
import { Board, Screen, proto } from "@zen-ds/react/builder";
import { AppShell, AppShellHeader, Breadcrumbs, Card, Container, Grid, IconButton, InlineMessage, Segmented, Sidebar, SidebarMenuItem, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Widths" device="desktop">
        <AppShell header={<AppShellHeader leading={<Breadcrumbs items={[{ id: "a", label: "Invoices" }, { id: "b", label: "INV-0142" }]} />} />} sidebar={<Sidebar aria-label="Main" selectedId="home"><SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" /></Sidebar>}>
          <Container>
            <Stack gap="lg">
              <Grid minColumnWidth={480} gap="lg"><Card><Text>Projects</Text></Card><Card><Text>Activity</Text></Card></Grid>
              <Grid columns="repeat(auto-fill, minmax(360px, 1fr))"><Card><Text>A</Text></Card><Card><Text>B</Text></Card></Grid>
              <Grid columns="repeat(auto-fit, minmax(360px, 1fr))"><Card><Text>A</Text></Card><Card><Text>B</Text></Card></Grid>
              <Grid columns="2fr 1fr"><Grid><Card><Text>One</Text></Card></Grid><Grid><Card><Text>Two</Text></Card></Grid></Grid>
              <Grid columns={2}><Stack><Text>Left</Text></Stack><Card><Text>Right</Text></Card></Grid>
              <Card><Grid><Text>In a card</Text></Grid></Card>
              <InlineMessage theme="warning" title="Overdue">Send a reminder.</InlineMessage>
              <InlineMessage theme="info" title="Closable" onClose={proto.close()}>It closes.</InlineMessage>
              <Segmented aria-label="Period" fullWidth defaultValue="today" options={[{ id: "today", label: "Today" }, { id: "week", label: "This week" }]} />
              <Stack direction="row"><IconButton aria-label="More actions" icon="icon-dots-horizontal-line" /><IconButton appearance="flat" aria-label="Close" icon="icon-x-close-line" /><IconButton level="primary" aria-label="Add" icon="icon-plus-line" /></Stack>
            </Stack>
          </Container>
        </AppShell>
      </Screen>
    </Board>
  );
}
`;
{
  const { frame } = push(WIDTHS);
  const stack = find(frame, (node) => node.name === "Stack" && node.children?.filter((child) => child.name === "Grid").length >= 4);
  const [halves, fill, fitted, tracks, mixed] = stack.children.filter((child) => child.name === "Grid");
  const columnsOf = (grid) => [grid.layout.mode, grid.layout.grid?.columns, grid.layout.grid?.rows, grid.layout.grid?.sizes?.map((size) => `${size.type} ${size.value}`)];
  // 1440 − 240 (Sidebar) − 2 × 24 (Container's gutter) = 1152: (1152 + 24) / (480 + 24) → 2 columns of 564.
  check("Grid minColumnWidth 480 in AppShell › Container (1152 wide): 2 even columns, a cell each", [columnsOf(halves), halves.children.map((cell) => [cell.cell.col, cell.cell.row, cell.minW])], [["GRID", 2, 1, ["FLEX 1", "FLEX 1"]], [[0, 0, 480], [1, 0, 480]]]);
  check("auto-fill keeps a row's empty columns: 3 columns of 360 for 2 cards", columnsOf(fill), ["GRID", 3, 1, ["FLEX 1", "FLEX 1", "FLEX 1"]]);
  check("auto-fit lets the cards take them: 2 columns", columnsOf(fitted), ["GRID", 2, 1, ["FLEX 1", "FLEX 1"]]);
  // "2fr 1fr" of 1152: (1152 − 16) × 2/3 = 757 takes 3 columns of 240, 379 one.
  check("a grid track's share is the width inside it (2fr: 3 columns of 240, 1fr: 1)", tracks.children.map((cell) => cell.layout.grid?.columns), [3, 1]);
  // CSS stretches a Grid in a cell to its row and shares the height among its auto rows: Fill, rows Flex (measured in
  // Figma, 2026-10-21: the Dashboard's second pair of cards came out at their own height). Another frame cell hugs.
  check("a Grid in a grid cell stretches to its row, its rows Flex; a Stack cell hugs, a Card fills", [tracks.children.map((cell) => [cell.fillH, cell.layout.grid?.rowSizes?.map((size) => `${size.type} ${size.value}`)]), mixed.children.map((cell) => cell.fillH)], [[[true, ["FLEX 1"]], [true, ["FLEX 1"]]], [undefined, true]]);
  const inCard = find(frame, (node) => node.name === "Grid" && node.children?.some((child) => child.characters === "In a card"));
  check("in an instance's slot the width is unknown: a wrapping row of cells no narrower than the minimum", [inCard.layout.mode, inCard.layout.wrap, inCard.children[0].minW], ["HORIZONTAL", true, 240]);
  const crumbs = find(frame, (node) => node.set?.name === "Breadcrumbs")?.slots[0].children ?? [];
  check("Breadcrumbs: a chevron (Dash) after each crumb but the last, the first Master", crumbs.map((crumb) => [crumb.text, crumb.props.Dash, crumb.nested?.[0]?.props.Level]), [["Invoices", true, "Master"], ["INV-0142", false, "Sub"]]);
  const messages = [];
  const collect = (node) => { if (node.set?.name === "Inline-Message") messages.push(node); (node.children ?? []).forEach(collect); (node.slots ?? []).forEach((slot) => slot.children.forEach(collect)); };
  collect(frame);
  check("InlineMessage: Close only with onClose", messages.map((message) => message.props.Close), [false, true]);
  const period = find(frame, (node) => node.name === "Period");
  // Invoice's ⋯ (2026-10-12): an IconButton without a level showed Figma's Primary (black) where the page draws Tertiary.
  check("IconButton without a level: Button.tsx's resolved one (Main Tertiary, Flat Primary); a written level stays", ["More actions", "Close", "Add"].map((name) => find(frame, (node) => node.name === name)?.props.Level), ["Tertiary", "Primary", "Primary"]);
  check("a full-width Segmented fills its row, its Item-List slot and items too (Figma's slot hugs)", [period.fillW, period.slots[0].fillW, period.slots[0].hugW, period.slots[0].children.map((item) => item.fillW)], [true, true, undefined, [true, true]]);
  const back = pageFromFigma(frame, { mapping }).text;
  ok("round trip: the even grid of columns that fit comes back a Grid (minColumnWidth)", /<Grid minColumnWidth=\{480\}/.test(back));
}
{
  // A collapsed Sidebar (HR Home, 2026-10-12: drawn open in Figma, 240 wide) is Figma's rail: Expand No, 80 wide (Patterns/Sidebar, 2026-10-21).
  const rail = WIDTHS.replace('<Sidebar aria-label="Main" selectedId="home"><SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" /></Sidebar>', '<Sidebar aria-label="Main" collapsed selectedId="home" brand={<Stack direction="row" gap="xs"><Avatar size="small" shape="square" theme="violet">D</Avatar><Text>Dizai</Text></Stack>} sections={[{ id: "main", label: "Main", items: [{ id: "home", label: "Home", icon: "icon-home-03-line" }] }, { id: "modules", label: "Modules", items: [{ id: "people", label: "People", icon: "icon-users-line" }] }]} />')
    .replace("import { AppShell,", "import { AppShell, Avatar,")
    .replace('<Grid minColumnWidth={480} gap="lg">', '<Grid minColumnWidth={400}>');
  const { frame, notes } = push(rail);
  const side = masterSidebar(frame);
  const header = side.slots.find((slot) => slot.name === "Header-Content").children;
  const groups = side.slots.find((slot) => slot.name === "Body-Content").children;
  check("collapsed Sidebar: the pattern and its Side-Bar Expand No (the pattern's Sidebar/No layer), the brand's mark alone in the header", [side.pattern.Expand, side.props.Expand, side.slots[0].within, header.map((layer) => layer.set?.name ?? layer.type)], ["No", "No", ["Patterns/Sidebar", "Patterns/Density/Comfortable/Sidebar/No"], ["Avatar/Single"]]);
  check("collapsed Sidebar: rows their icon alone (no label, as wide as it), titles gone, a Divider opening the later group", groups.map((group) => group.children.map((layer) => [layer.set?.name, layer.props?.Label, layer.hugW ?? layer.fillW, layer.text, layer.hugLayers?.[0]?.name])), [[["Primitives/Side-Bar/Menu-Item/Master", false, true, undefined, "Element"]], [["Divider", undefined, true, undefined, undefined], ["Primitives/Side-Bar/Menu-Item/Master", false, true, undefined, "Element"]]]);
  // 1440 − 80 (rail) − 48 (Container's gutter) = 1312: (1312 + 16) / (400 + 16) → 3 columns (an open Sidebar leaves room for 2).
  check("the page beside the rail is 80 narrower than the frame, not 240: 3 columns of 400", find(frame, (node) => node.name === "Grid")?.layout.grid?.columns, 3);
  ok("logoCollapsed / the rail noted as nothing", !notes.some((note) => /Sidebar.*(logoCollapsed|not written)/.test(note)));
  const back = pageFromFigma(frame, { mapping }).text;
  ok("round trip: the rail comes back a collapsed Sidebar, its rows' labels and its groups' titles kept, no Divider row", /<Sidebar[^>]*\bcollapsed\b/.test(back) && /label: "Modules"/.test(back) && /label: "People"/.test(back) && !/Divider/.test(back.slice(back.indexOf("<Sidebar"), back.indexOf("/>", back.indexOf("<Sidebar")))));
}

{
  // A workspace Sidebar (template "Empty and error states", corpus test 2026-10-18): its set names the panel's slots
  // Child-…; the sections went to a Body-Content it does not have, and come back from Child-Body-Content.
  const page = WIDTHS.replace('<Sidebar aria-label="Main" selectedId="home"><SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" /></Sidebar>', '<Sidebar aria-label="Main" variant="workspace" selectedId="home" sections={[{ id: "main", items: [{ id: "home", label: "Home", icon: "icon-home-03-line" }, { id: "people", label: "People", icon: "icon-users-line" }] }]} />');
  const { frame } = push(page);
  const side = masterSidebar(frame);
  const back = pageFromFigma(frame, { mapping }).text;
  check("workspace Sidebar: the Workspace set in the master's pattern, its sections in Child-Body-Content, read back as the sections", [side.master.nested.find((entry) => entry.path === "Patterns/Patterns")?.set?.name, side.slots.map((slot) => slot.name), /variant="workspace"/.test(back) && /label: "People"/.test(back)], ["Side-Bar/Master/Workspace", ["Child-Body-Content", "Child-Footer-Content"], true]);
}

{
  // Texts as the code draws them (board test vs the plugin's import, 2026-10-18): a PageHeader eyebrow in
  // Body/Small/Medium Neutral Base, a ChatDateDivider a centred Caption/Regular in Neutral Light (and back), not bare
  // texts that imported at Figma's 12px and pasted at 14px black.
  const page = `// @zen-page {"format":1,"title":"Texts"}
import { Board, Screen } from "@zen-ds/react/builder";
import { ChatDateDivider, ChatMessage, ChatThread, PageHeader, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Texts" device="desktop">
        <Stack gap="lg">
          <PageHeader eyebrow="Lumen Bank" title="Online banking" />
          <ChatThread>
            <ChatDateDivider>Yesterday at 5:20 pm</ChatDateDivider>
            <ChatMessage side="others">See you there</ChatMessage>
          </ChatThread>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame } = push(page);
  const eyebrow = find(frame, (node) => node.type === "TEXT" && node.characters === "Lumen Bank");
  const time = find(frame, (node) => node.type === "TEXT" && node.characters === "Yesterday at 5:20 pm");
  check("eyebrow and chat time in the code's text styles and tones", [eyebrow?.textStyle, eyebrow?.fill, time?.textStyle, time?.fill, time?.align], ["Body/Small/Medium", "Content/Neutral/Base", "Caption/Regular", "Content/Neutral/Light", "CENTER"]);
  ok("a ChatDateDivider comes back as itself", /<ChatDateDivider>Yesterday at 5:20 pm<\/ChatDateDivider>/.test(pageFromFigma(frame, { mapping }).text));
}

// 13. A Table inside a surface (a Card, a Box with a surface or a border) drops its last row's bottom rule, as table.css
//     does (user rule, 2026-10-12): `strokeBottom: 0` on that row's cells, which the importer applies to the weight only.
//     A Table on the page canvas, or in a plain Box, keeps it.
const SURFACE_TABLES = `// @zen-page {"format":1,"title":"Surfaces"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Box, Card, Container, Stack, Table } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Surfaces" device="desktop">
        <Container>
          <Stack gap="lg">
            <Table aria-label="Plain" columns={[{ id: "name", header: "Name" }]} rows={[{ id: "a", name: "A" }, { id: "b", name: "B" }]} />
            <Card><Table aria-label="In card" columns={[{ id: "name", header: "Name" }]} rows={[{ id: "a", name: "A" }, { id: "b", name: "B" }]} /></Card>
            <Box border="pale" padding="md"><Table aria-label="In box" columns={[{ id: "name", header: "Name" }]} rows={[{ id: "a", name: "A" }, { id: "b", name: "B" }]} /></Box>
            <Box padding="md"><Table aria-label="In plain box" columns={[{ id: "name", header: "Name" }]} rows={[{ id: "a", name: "A" }, { id: "b", name: "B" }]} /></Box>
          </Stack>
        </Container>
      </Screen>
    </Board>
  );
}
`;
{
  const { frame } = push(SURFACE_TABLES);
  const edges = (label) => {
    const table = find(frame, (node) => node.type === "FRAME" && node.name === label);
    return table ? table.children.slice(1).map((row) => row.slots[0].children.map((cell) => cell.strokeBottom ?? null)) : "no table";
  };
  check("a page Table keeps every row's bottom rule", edges("Plain"), [[null], [null]]);
  check("a Table in a Card: its last row's cells have no bottom rule", edges("In card"), [[null], [0]]);
  check("a Table in a Box with a border: the same", edges("In box"), [[null], [0]]);
  check("a Table in a plain Box keeps it", edges("In plain box"), [[null], [null]]);
}

// 14. Templates compared with the Studio sheets (2026-10-12): tracks with a px maximum, a selectable and sorted Table,
//     a table Avatar cell's own Avatar, Form's gap, the account's Subtle Avatar.
const MEMBERS = `// @zen-page {"format":1,"title":"Team"}
import { Board, Screen } from "@zen-ds/react/builder";
import { AppShell, AppShellHeader, AppShellAccount, Form, Grid, InputField, Search, Stack, Table, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Team" device="desktop">
        <AppShell header={<AppShellHeader actions={<AppShellAccount name="Linh Hoang" theme="yellow" />} />}>
          <Stack gap="lg">
            <Grid columns={{ mobile: 1, desktop: "minmax(0, 320px) 1fr auto" }} gap="sm"><Search aria-label="Search" placeholder="Search" /><Text>Filters</Text><Text>View</Text></Grid>
            <Table aria-label="Members" selectable sort={{ columnId: "member", direction: "asc" }} rows={[{ id: "a", member: "An Mai", email: "an.mai@dizai.studio", role: "Member" }, { id: "b", member: "Bao Nguyen", email: "bao@dizai.studio", role: "Admin" }]} columns={[{ id: "member", header: "Member", sortable: true, content: "avatar", captionField: "email" }, { id: "role", header: "Role", width: "120px", sortable: true }]} overrides={{ "Row[a]/member/Avatar": { children: "MA" }, "Row[b]/member/Avatar": { theme: "green" } }} />
            <Form><InputField label="Name" placeholder="Name" /><InputField label="Email" placeholder="Email" /></Form>
          </Stack>
        </AppShell>
      </Screen>
    </Board>
  );
}
`;
{
  const { frame } = push(MEMBERS);
  const grid = find(frame, (node) => node.name === "Grid");
  check("a track with a px maximum (minmax(0, 320px)) is Fixed at it; 1fr Flex; auto Hug", grid.layout.grid.sizes, [{ type: "FIXED", value: 320 }, { type: "FLEX", value: 1 }, { type: "HUG" }]);
  const table = find(frame, (node) => node.name === "Members");
  const [head, ...rows] = table.children;
  check("selectable: a 48px checkbox column first (header Type=Checkbox, a Control-Cell checkbox per row)", [head.slots[0].children[0].props.Type, head.slots[0].children[0].fixedWidth, rows.map((row) => [row.slots[0].children[0].fixedWidth, row.slots[0].children[0].slots[0].children[0].props.Type])], ["Checkbox", 48, [[48, "Checkbox"], [48, "Checkbox"]]]);
  check("the sorted column's header shows its direction, the other sortable one keeps ↕", head.slots[0].children.slice(1).map((cell) => /^icon-arrow-up-line/.test(cell.nested?.[0]?.set?.name ?? "") || (cell.nested?.[0] ?? null)), [true, null]);
  const avatars = rows.map((row) => row.slots[0].children[1].slots[0].children[0].nested.find((part) => part.path === "Avatar"));
  check("an avatar cell's Avatar: Small over its Subtext, Subtle, initials on Neutral (the page's own when its override has them), the row's override (Bao: Green)", avatars.map((avatar) => [avatar.props.Size, avatar.props.Background, avatar.props.Theme, avatar.text]), [["Small", "Subtle", "Neutral", "MA"], ["Small", "Subtle", "Green", "BN"]]);
  check("Form: its fields Gap/Large apart (Form.tsx's default)", find(frame, (node) => node.name === "Form")?.layout.gap, 24);
  check("AppShellAccount: a Subtle Avatar, as AppShell.tsx draws it", find(frame, (node) => node.name === "Linh Hoang")?.props.Background, "Subtle");
  const back = pageFromFigma(frame, { mapping }).text;
  ok("round trip: the checkbox column is not a column of the Table", !/id: "select"/.test(back));
}
{
  // Dashboard's Active projects (2026-10-14): a photo cell drew Figma's sample picture, and its Avatar override found no
  // layer ("Photo-Cell › Avatar: no such nested instance"): Figma's Photo-Cell holds a Photo rectangle, no Avatar.
  const PHOTOS = MEMBERS.replace('content: "avatar", captionField: "email" }', 'content: "photo", captionField: "email", mediaField: "pic" }').replace('member: "An Mai",', 'member: "An Mai", pic: "/team/an.png",');
  const { frame } = push(PHOTOS);
  const [, ...rows] = find(frame, (node) => node.name === "Members").children;
  const [pictured, initials] = rows.map((row) => row.slots[0].children[1].slots[0].children[0]);
  check("a photo cell with its picture: Photo-Cell, the picture filling its Photo (no Avatar to find)", [pictured.set.name, pictured.image, pictured.nested.some((part) => part.path === "Avatar")], ["Primitives/Table/Cell/Photo-Cell", "/team/an.png", false]);
  const avatar = initials.nested.find((part) => part.path === "Avatar");
  // (figma-pull reads it back as a photo column: figma-pull.selftest, "Avatar-Cell with a Square Avatar".)
  check("a photo cell without one: Avatar-Cell with the square Avatar the Table draws (Small, the row's Green, initials)", [initials.set.name, avatar.props.Shape, avatar.props.Size, avatar.props.Theme, avatar.text], ["Primitives/Table/Cell/Avatar-Cell", "Square", "Small", "Green", "BN"]);
}
{
  // HR Home's hero (2026-10-12): AiChatBlock was a bare frame of its field (no greeting, no chips, Figma's model shown).
  const HERO = MEMBERS.replace(/<Stack gap="lg">[\s\S]*<\/Stack>\n        <\/AppShell>/, `<Stack gap="lg"><AiChatBlock headingLevel={1} greeting="Good morning, Alex. How can I help?" suggestions={[{ label: "Request time off", icon: "icon-calendar-plus-line" }, { label: "Open my tasks" }]}><Box><AiChatField fieldStyle="surface" placeholder="Ask Zen AI" /></Box></AiChatBlock></Stack>
        </AppShell>`).replace("import { AppShell,", "import { AiChatBlock, AiChatField, Box, AppShell,");
  const { frame, notes } = push(HERO);
  const wrap = find(frame, (node) => node.type === "FRAME" && node.name === "AiChatBlock");
  const block = wrap?.children[0];
  check("AiChatBlock: Figma's AI/Chat-Block/Pale, centred up to 800 in a frame of its name", [block?.set?.name, wrap?.layout.counter, block?.fillW, block?.maxW], ["AI/Chat-Block/Pale", "CENTER", true, 800]);
  check("AiChatBlock: the greeting in Say-Hi, the field's Style / placeholder / no model on its AI/Chat-Field", [block.texts, block.nested[0].path, block.nested[0].props.Style, block.nested[0].props.Model, block.nested[0].texts], [{ "How can I help you today?": "Good morning, Alex. How can I help?" }, "AI", "Surface", false, { Text: "Ask Zen AI" }]);
  check("AiChatBlock: suggestions as Chip/Normal in Suggestions (Leading-Icon with its Icon-Src, else Text-Only)", block.slots[0].children[0].children.map((chip) => [chip.set.name, chip.text, chip.props.Theme, chip.props["Icon-Src"] ?? null]), [["Chip/Normal", "Request time off", "Leading-Icon", "icon-calendar-plus-line"], ["Chip/Normal", "Open my tasks", "Text-Only", null]]);
  ok("AiChatBlock: no note of a frame drawn for it", !notes.some((note) => /AiChatBlock: no Figma component/.test(note)));
  const back = pageFromFigma(frame, { mapping }).text;
  ok("round trip: AiChatBlock comes back with its greeting, suggestions and field (no wrapper Stack)", /<AiChatBlock[^>]*greeting="Good morning, Alex\. How can I help\?"/.test(back) && back.includes('{ label: "Request time off", icon: "icon-calendar-plus-line" }') && /<AiChatField[^>]*fieldStyle="surface"/.test(back) && !/<Stack[^>]*align="center"[^>]*>\s*<AiChatBlock/.test(back));
}

// 15. TopNavigation as Figma's Top-Navigation/Mobile (figma-top-nav.mjs, 2026-10-13): the Type and the parts the page
//     shows, the titles in their Heading-Text layers, the leading Action, the actions in each row's Trailing-Slot (by
//     `within`) in the Button the Type draws, the control bar padded in Control-Slot; the Screen's mobile chrome round trip.
{
  const nav = `// @zen-page {"format":1,"title":"Inbox"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Segmented, Stack, Text, TopNavigation } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Inbox" device="phone" topNavigation={<TopNavigation type="liquid-glass" largeTitle="Inbox" leading={{ icon: "icon-chevron-left-line-medium", label: "Back" }} trailing={[{ icon: "icon-search-medium-line", label: "Search" }, { icon: "icon-bell-01-line", label: "Alerts", dot: true }]} largeTitleAction={{ icon: "icon-plus-line", label: "New" }} controlBar={<Segmented options={[{ id: "all", label: "All" }, { id: "unread", label: "Unread" }]} fullWidth defaultValue="all" />} />}>
        <Stack>
          <TopNavigation type="compact" largeTitle="Home" trailing={[{ icon: "icon-search-medium-line", label: "Search" }, { icon: "icon-bell-01-line", label: "Alerts" }]} />
          <TopNavigation type="default-overlay" margin="compact" title="Ava Chen" subtitle="Active now" leading={{ icon: "icon-chevron-left-line-medium", label: "Back" }} trailing={[{ icon: "icon-phone-line", label: "Call", group: "call" }, { icon: "icon-video-line", label: "Video", group: "call" }]} />
          <Text>Body</Text>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame, notes } = push(nav);
  const [inbox] = frame.children;
  const [home, ava] = frame.children[1].children[0].children;
  check("TopNavigation: Top-Navigation/Mobile, its Type, no Status-bar, the parts the page shows", [inbox.set.id, inbox.props.Type, inbox.props["Status-Bar"], inbox.props["Top-bar"], inbox.props["Top-Heading-Text"], inbox.props["Expand-Heading"], inbox.props["Expand-Trailing"], inbox.props["Control-Bar"]], ["12014:45167", "Liquid Glass", false, true, false, true, true, true]);
  check("TopNavigation: the large title and the leading Action (named by its label, its glyph)", [inbox.nested[0], inbox.nested[1]], [{ path: "Main-Heading-Text", props: { Type: "H1" }, texts: { "Header-Text": "Inbox" } }, { path: "Top-Leading/Action", name: "Back", props: { "Noti-Dot": false }, swapIcon: "icon-chevron-left-line-medium" }]);
  check("TopNavigation: each row's actions in its own Trailing-Slot, as Nav-Slot/Action in the Type's Button", inbox.slots.slice(0, 2).map((slot) => [slot.within, slot.children.map((item) => [item.name, item.set.id, item.props.Style, item.props["Noti-Dot"], item.nested[0].set.name, item.nested[0].props.Level, item.nested[0].swapIcon])]), [["Navigator-bar", [["Search", "6340:42675", "Default", false, "Nav-Action/Liquid-Glass", "Secondary", "icon-search-medium-line"], ["Alerts", "6340:42675", "Default", true, "Nav-Action/Liquid-Glass", "Secondary", "icon-bell-01-line"]]], ["Expand-Heading", [["New", "6340:42675", "Default", false, "Nav-Action/Liquid-Glass", "Secondary", "icon-plus-line"]]]]);
  check("TopNavigation: the control bar in Control-Slot, padded as the code pads it (Padding/XSmall above and below, the bar's margin at the sides)", [inbox.slots[2].name, inbox.slots[2].children[0].name, inbox.slots[2].children[0].layout.padding, inbox.slots[2].children[0].children[0].set.name], ["Control-Slot", "Control", [8, 20, 8, 20], "Segmented"]);
  check("TopNavigation: a compact root folds its bar into the large-title row (Top-bar off, the actions beside the title, Flat › Icon-Flat)", [home.props["Top-bar"], home.props["Top-Leading"], home.props["Expand-Trailing"], home.slots.map((slot) => [slot.within, slot.children.map((item) => [item.props.Style, item.nested[0].set.name, item.nested[0].props.Level])])], [false, false, true, [["Expand-Heading", [["Flat", "Nav-Action/Icon-Flat", "Primary"], ["Flat", "Nav-Action/Icon-Flat", "Primary"]]]]]);
  check("TopNavigation: an identity's title and subtitle in Top-Heading-Text, Margin Compact, an overlay's Icon-Overlay", [ava.props.Margin, ava.props["Expand-Heading"], ava.nested[0].props, ava.nested[0].texts, ava.slots[0].children[0].nested[0].props.Level], ["Compact", false, { Type: "Sub", Header: true, Subheading: true, Leading: false }, { "Header-Text": "Ava Chen", Subheading: "Active now" }, "Black Overlay"]);
  ok("TopNavigation: a note for actions that share a pill (Figma has none)", notes.some((note) => /share a pill/.test(note)));
  const back = shape(pageFromFigma(frame, { mapping }).text);
  check("round trip: the Screen's topNavigation and the page's TopNavigations come back the same", back, shape(nav.replace(/, group: "call"/g, "")));
}
// Figma Heading-Text Dropdown and Badges (2026-10-24): titleMenu / titleDropdown draw the bar title's chevron, and
// largeTitleBadges the Badges row under the large title; the pull reads the chevron back as titleDropdown.
{
  const nav = `// @zen-page {"format":1,"title":"Mail"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Stack, Text, TopNavigation } from "@zen-ds/react";

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Mail" device="phone">
        <Stack>
          <TopNavigation type="alt" title="Inbox" leading={{ icon: "icon-chevron-left-line-medium", label: "Back" }} titleMenu={[{ id: "inbox", label: "Inbox" }]} />
          <TopNavigation type="alt" largeTitle="Living room" largeTitleBadges={<Text>4 on</Text>} scrolledType="default" />
          <Text>Body</Text>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame, notes } = push(nav);
  const navs = find(frame, (node) => node.type === "FRAME" && (node.children ?? []).filter((child) => child.set?.name === "Top-Navigation/Mobile").length === 2)?.children.filter((child) => child.set?.name === "Top-Navigation/Mobile") ?? [];
  const [mail, room] = navs;
  check("TopNavigation: titleMenu draws Heading-Text's Dropdown; largeTitleBadges the Badges row", [mail.nested.find((entry) => entry.path === "Top-Heading-Text")?.props.Dropdown, room.nested.find((entry) => entry.path === "Main-Heading-Text")?.props.Badges], [true, true]);
  ok("TopNavigation: notes for the menu's items, the sample Badge and scrolledType", ["titleMenu draws", "largeTitleBadges draws", "scrolledType is the look"].every((text) => notes.some((note) => note.includes(text))));
  const back = pageFromFigma(frame, { mapping }).text;
  ok("pull: the Dropdown chevron comes back as titleDropdown", /<TopNavigation[^>]*title="Inbox"[^>]*titleDropdown/.test(back));
}
// A Search in a TopNavigation's control bar is a pill by default (SearchShapeContext, user 2026-10-17: "mặc định nhưng
// cho sửa"): the push writes Shape=Rounded unless the page sets shape, and the pull leaves Rounded unsaid there.
{
  const page = (control) => `// @zen-page {"format":1,"title":"Search bar"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Search, Stack, Text, TopNavigation } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Files" device="phone">
        <Stack>
          <TopNavigation title="Files" controlBar={${control}} />
          <Text>Body</Text>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const shapeOf = (text) => find(push(text).frame, (node) => node.set?.name === "Search/Default")?.props.Shape;
  check("control-bar Search: Shape=Rounded by default, the page's shape=\"default\" kept", [shapeOf(page(`<Search placeholder="Search files" />`)), shapeOf(page(`<Search shape="default" placeholder="Search files" />`))], ["Rounded", "Default"]);
  for (const control of [`<Search />`, `<Search shape="default" />`]) {
    const text = page(control);
    check(`control-bar Search round trip (${control.includes("default") ? "Default" : "Rounded"})`, shape(pageFromFigma(push(text).frame, { mapping }).text), shape(text));
  }
}

// 16. A Top-Navigation/Mobile as the pull reads it in Figma (readTopNav; the instance an import placed, 2026-10-13).
{
  const read = { type: "FRAME", name: "Chat", width: 390, layout: { mode: "VERTICAL" }, children: [{ type: "INSTANCE", name: "Ava Chen", set: { id: "12014:45167", name: "Top-Navigation/Mobile" },
    props: { "Top-Leading": true, "Top-Heading-Text": true, "Control-Bar": false, "Top-Trailing": true, "Expand-Trailing": false, "Status-Bar": false, "Top-bar": true, "Expand-Heading": false, Device: "Mobile", Margin: "Comfortable", Type: "Default-Overlay" },
    topNav: { bar: { props: { Leading: false, Header: true, Subheading: true, Type: "Sub" }, texts: { Label: "A", "Header-Text": "Ava Chen", Subheading: "Active now" } }, large: { props: { Type: "H1" }, texts: { "Header-Text": "Heading" } },
      leading: { props: { Style: "Liquid Glass", Type: "Action" }, action: { name: "Back", icon: "icon-chevron-left-line-medium" } },
      barActions: [{ name: "Call", icon: "icon-phone-line" }, { name: "Video", icon: "icon-video-line", dot: true }], titleActions: [{ name: "Action", icon: "icon-plus-line" }], control: [] } }] };
  const text = pageFromFigma(read, { mapping }).text;
  ok("pull: Top-Navigation/Mobile → TopNavigation with its type, identity, leading and trailing (hidden rows left out)", text.includes('<TopNavigation type="default-overlay" title="Ava Chen" subtitle="Active now" leading={{ icon: "icon-chevron-left-line-medium", label: "Back" }} trailing={[{ icon: "icon-phone-line", label: "Call" }, { icon: "icon-video-line", label: "Video", dot: true }]} />') && !text.includes("Heading\""));
}

// 17. ColorSelector as a row of Color-Selector swatches (2026-10-13): each its colour's variable as its own fill, the
//     chosen one Select=Yes, a colour that is no token noted; the pull gives the ColorSelector back.
{
  const page = `// @zen-page {"format":1,"title":"Labels"}
import { Board, Screen } from "@zen-ds/react/builder";
import { ColorSelector, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Labels" device="desktop">
        <Stack gap="md">
          <ColorSelector aria-label="Label colour" colors={[{ value: "var(--zen-color-background-support-red-solid)", label: "Red" }, { value: "var(--zen-color-background-support-blue-solid)", label: "Blue" }]} value="var(--zen-color-background-support-blue-solid)" />
          <ColorSelector colors={[{ value: "#123456", label: "Custom" }]} />
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame, notes } = push(page);
  const [row] = frame.children;
  check("ColorSelector: a wrapping row (Gap/Small) of Color-Selector swatches, named, their fill the colour's variable, the chosen one Select=Yes", [row.name, row.layout.gapVar, row.layout.wrap, row.children.map((swatch) => [swatch.set.id, swatch.name, swatch.fill, swatch.props.Select])], ["Label colour", "Spacing/Gap/Small", true, [["373:97252", "Red", "Background/Support/Red/Solid", "No"], ["373:97252", "Blue", "Background/Support/Blue/Solid", "Yes"]]]);
  ok("ColorSelector: a colour that is no Zen token keeps the sample colour, with a note", !frame.children[1].children[0].fill && notes.some((note) => /#123456 is no Zen token/.test(note)));
  const back = pageFromFigma({ ...frame, children: [row] }, { mapping }).text;
  ok("round trip: the swatches come back as the ColorSelector (colours, value, aria-label)", back.includes('<ColorSelector colors={[{ value: "var(--zen-color-background-support-red-solid)", label: "Red" }, { value: "var(--zen-color-background-support-blue-solid)", label: "Blue" }]} value="var(--zen-color-background-support-blue-solid)" aria-label="Label colour" />'));
}

// 18. Tabs written with TabItem children (2026-10-13): the same Tab-Items as `items` (the chosen one Select=Yes), a
//     badge's count in its Badge-Counter; the pull reads the labels (not the Label variant's True), badges and Size.
{
  const page = `// @zen-page {"format":1,"title":"Inbox"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Stack, TabItem, Tabs } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Inbox" device="desktop">
        <Stack gap="md">
          <Tabs aria-label="Inbox" value="reviews">
            <TabItem value="assigned" label="Assigned" badge={3} />
            <TabItem value="reviews" label="Reviews" icon="icon-home-03-line" />
          </Tabs>
          <Tabs aria-label="Views" variant="subtle" size="sm" items={[{ id: "list", label: "List" }, { id: "board", label: "Board" }]} />
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame, notes } = push(page);
  const [inbox, views] = frame.children;
  check("Tabs with TabItem children: Tab-Items in Item-List (label, Select, icon, Badge with its count)", inbox.slots[0].children.map((item) => [item.text, item.props.Select, item.props["Icon-Src"] ?? null, item.props.Badge, item.nested?.[0] ?? null]), [["Assigned", "No", null, true, { path: "Badge-Counter", text: "3" }], ["Reviews", "Yes", "icon-home-03-line", false, null]]);
  ok("Tabs: no TabItem left out", !notes.some((note) => /TabItem/.test(note)));
  const back = pageFromFigma(frame, { mapping }).text;
  ok("round trip: the tabs come back as items with their labels and badges, the chosen one the default", back.includes('<Tabs items={[{ id: "assigned", label: "Assigned", badge: 3 }, { id: "reviews", label: "Reviews", icon: "icon-home-03-line" }]} defaultValue="reviews" />'));
  ok("round trip: a small subtle Tabs keeps its size (read from its items)", back.includes('<Tabs variant="subtle" items={[{ id: "list", label: "List" }, { id: "board", label: "Board" }]} defaultValue="list" size="sm" />') && views.slots[0].children[0].props.Size === "Small");
}

// 19. InputConditions as Figma's Input-Conditions (2026-10-13): its Condition-Items in the Item-List slot, each one's
//     label its text (the set has no text property); the pull gives the labels back.
{
  const page = `// @zen-page {"format":1,"title":"Password"}
import { Board, Screen } from "@zen-ds/react/builder";
import { InputConditionItem, InputConditions, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Password" device="desktop">
        <Stack>
          <InputConditions>
            <InputConditionItem label="At least 8 characters" state="success" />
            <InputConditionItem label="One symbol" />
          </InputConditions>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame } = push(page);
  const [list] = frame.children;
  check("InputConditions: Input-Conditions, its Condition-Items in Item-List with their state and label", [list.set.id, list.slots[0].name, list.slots[0].children.map((item) => [item.set.id, item.props.State, item.text])], ["373:97663", "Item-List", [["373:97437", "Success", "At least 8 characters"], ["373:97437", "Default", "One symbol"]]]);
  check("round trip: InputConditions comes back with its items' labels", shape(pageFromFigma(frame, { mapping }).text), shape(page));
}

// 20. UploaderFileItem as Figma's Primitives/Uploader/File-Item (2026-10-13): its file's State, Name, Size and caption,
//     an alert's error in Help-Text, an upload's progress as the Progress-Bar step, the buttons it has no handler for
//     hidden; the pull gives the file back.
{
  const page = `// @zen-page {"format":1,"title":"Files"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Stack, UploaderFileItem } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Files" device="desktop">
        <Stack>
          <UploaderFileItem thumbnail="file" file={{ id: "brief-pdf", name: "Brief.pdf", size: "1.2 MB", state: "uploading", caption: "7 seconds left", progress: 50 }} />
          <UploaderFileItem theme="overlay" file={{ id: "notes-docx", name: "Notes.docx", size: "320 KB", state: "alert", error: "Upload failed" }} />
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame, notes } = push(page);
  const [upload, alert] = frame.children;
  check("UploaderFileItem: File-Item with its file's State, Name, Size, caption and Thumbnail", [upload.set.id, upload.name, upload.props.State, upload.props["✏️ Name"], upload.props["✏️ Size"], upload.props["✏️ Additional Caption"], upload.props.Thumbnail, upload.nested], ["1581:22739", "Brief.pdf", "Uploading", "Brief.pdf", "1.2 MB", "7 seconds left", "File", [{ path: "Progress-Bar", props: { Progress: "Medium" } }]]);
  check("UploaderFileItem: an alert's error in its Help-Text; Remove and Retry hidden without their handlers", [alert.props.State, alert.props.Theme, alert.nested, alert.hide], ["Alert", "Overlay", [{ path: "Help-Text", props: {}, text: "Upload failed" }], ["Remove", "Retry"]]);
  ok("UploaderFileItem: no note of its file as unwritten data", !notes.some((note) => /file is data/.test(note)));
  check("round trip: the file items come back with their files", shape(pageFromFigma(frame, { mapping }).text), shape(page));
}

// 21. DatePickerSheet as Figma's Date-Picker/Mobile (2026-10-13): Variant Single / Multiple-Default / Multiple-Selected,
//     its title in the heading; a closed sheet is not pushed; the pull opens it again.
{
  const page = `// @zen-page {"format":1,"title":"Stay"}
import { Board, Screen } from "@zen-ds/react/builder";
import { DatePickerSheet, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Stay" device="phone">
        <Stack>
          <DatePickerSheet open selectionMode="range" title="Your stay" />
          <DatePickerSheet open />
          <DatePickerSheet title="Closed" />
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame, notes } = push(page);
  check("DatePickerSheet: Date-Picker/Mobile, its Variant and its title in Main-Heading-Text (the locale's by default)", frame.children.map((sheet) => [sheet.set.id, sheet.props.Variant, sheet.nested[0].texts["Header-Text"]]), [["9923:3576", "Multiple-Default", "Your stay"], ["9923:3576", "Single", "Choose date"]]);
  ok("DatePickerSheet: a closed sheet is not pushed, with a note", notes.some((note) => /DatePickerSheet.*closed/.test(note)));
  check("round trip: the open sheets come back (range, title)", shape(pageFromFigma(frame, { mapping }).text), shape(page.replace('\n          <DatePickerSheet title="Closed" />', "")));
}

// 22. Chat (2026-10-13): ChatThread as Chat/Section/Conversation runs, a ChatMessage's author (a one-letter Avatar: small
//     avatars show one; user, 2026-10-13), its text in the bubble's Message, its reactions pill and its read list; the
//     pull gives the same page back, from the push and from the real Figma read of the import (fixtures/figma-chat.json).
{
  const page = `// @zen-page {"format":1,"title":"Chat"}
import { Board, Screen } from "@zen-ds/react/builder";
import { ChatMessage, ChatThread } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Chat" device="phone">
        <ChatThread>
          <ChatMessage author={{ name: "Ava Chen" }} reactions={[{ kind: "heart", count: 2 }, { kind: "lol" }]}>See you at 6?</ChatMessage>
          <ChatMessage side="you" reactions={[{ kind: "🎉" }]} seenBy={[{ name: "Ava Chen" }, { name: "Bao Tran", theme: "blue" }]}>Yes, on my way</ChatMessage>
        </ChatThread>
      </Screen>
    </Board>
  );
}
`;
  const { frame, notes } = push(page);
  const thread = frame.children[0];
  const [others, you] = thread.children;
  const ava = others.slots[0].children[0];
  check("ChatThread: a column (Gap/Medium, Padding/Medium) of Chat/Section/Conversation runs by side", [thread.layout.gapVar, thread.layout.paddingVar, thread.children.map((run) => [run.set.id, run.props.Side, run.slots[0].name])], ["Spacing/Gap/Medium", "Spacing/Padding/Medium", [["6182:57707", "Others", "Conversations"], ["6182:57707", "You", "Conversations"]]]);
  check("ChatMessage: its text in Message, its author's Avatar named and one letter, the reactions pill (Count, Emoji-Items)", [ava.texts, ava.props.Reaction, ava.nested, ava.slots[0].within, ava.slots[0].children.map((emoji) => emoji.props.Emoji)], [{ Message: "See you at 6?" }, "Yes", [{ path: "Avatar", name: "Ava Chen", props: { Theme: "Neutral", Background: "Subtle" }, text: "A" }, { path: "Bubble/Chat", props: { Counter: "Yes" }, texts: { Count: "3" } }], "Chat/Reaction/Status/No", ["Heart", "LOL"]]);
  const [message, readList] = you.slots[0].children[0].children;
  check("ChatMessage: a picked emoji in Message; the read list under it (Seen by, each reader named, one letter)", [message.slots[0].children[0].texts, readList.set.id, readList.props["Seen by"], readList.nested.map((avatar) => [avatar.path, avatar.name, avatar.text, avatar.props.Theme])], [{ Message: "🎉" }, "6101:61545", "2", [["Avatar[0]", "Ava Chen", "A", "Neutral"], ["Avatar[1]", "Bao Tran", "B", "Blue"]]]);
  ok("Chat: nothing unwritten", !notes.some((note) => /ChatMessage|ChatThread/.test(note)));
  // (The pulled Screen holds its ChatThread in a Stack: a Screen's content is a Stack.)
  check("round trip: the chat comes back the same from the push", shape(pageFromFigma(frame, { mapping }).text).children[0].children[0].children[0], shape(page).children[0].children[0]);
  const read = JSON.parse(fs.readFileSync(new URL("./fixtures/figma-chat.json", import.meta.url), "utf8")).frame;
  const fromFigma = pageFromFigma(read, { mapping });
  check("round trip: the same chat from Figma's own read of the import (names from the avatars' layers, reactions from the nested slot)", shape(fromFigma.text).children[0].children[0].children[0], shape(page).children[0].children[0]);
  check("round trip from Figma: no notes", fromFigma.notes, []);
}

// 23. Small avatars show one letter (Avatar.tsx: XSmall and 2XSmall; user, 2026-10-13): an Avatar element and a Table's
//     avatar cell without a caption.
{
  const page = `// @zen-page {"format":1,"title":"People"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Avatar, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="People" device="desktop">
        <Stack>
          <Avatar size="xs" alt="Ava Chen">AC</Avatar>
          <Avatar size="md" alt="Ava Chen">AC</Avatar>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  check("Avatar: one letter at XSmall, two at Medium", push(page).frame.children.map((avatar) => avatar.text), ["A", "AC"]);
}

// 24. Metric and MetricCard (2026-10-13): the Dock Icon shows by default (MetricWidget.tsx: icon-home-02-solid, Neutral,
//     Subtle) as the code draws it; the pull gives a lone Metric-Inline back as a Metric and a Card holding one as the
//     MetricCard (label, value, trend, icon), from the push and from Figma's read of the import (fixtures/figma-metric.json,
//     the trend's override on its Badge).
{
  const page = `// @zen-page {"format":1,"title":"KPIs"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Metric, MetricCard, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="KPIs" device="desktop">
        <Stack>
          <MetricCard label="Revenue" value="$12,400" icon="icon-wallet-02-line" iconTheme="green" theme="border" trend={{ direction: "negative", label: "-3%" }} />
          <Metric label="Orders" value="320" />
          <Metric label="Refunds" value="4" icon={false} />
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame } = push(page);
  const [, orders, refunds] = frame.children;
  check("Metric: its default Dock Icon shows (home, Neutral, Subtle); icon={false} hides it", [orders.props["Dock-Icon"], orders.nested?.find((nested) => nested.path === "Metric-Icon")?.props, refunds.props["Dock-Icon"]], [true, { Theme: "Neutral", Background: "Subtle", "Icon-Src": "icon-home-02-solid" }, false]);
  check("round trip: MetricCard and Metric come back the same from the push", shape(pageFromFigma(frame, { mapping }).text), shape(page));
  const read = JSON.parse(fs.readFileSync(new URL("./fixtures/figma-metric.json", import.meta.url), "utf8")).frame;
  const fromFigma = pageFromFigma(read, { mapping });
  check("round trip: the same MetricCard and Metric from Figma's read of the import", shape(fromFigma.text).children[0].children[0].children.slice(0, 2), shape(page).children[0].children[0].children.slice(0, 2));
  check("round trip from Figma: no notes", fromFigma.notes, []);
}

// 25. Icon sizes, FileIcon and Flag (2026-10-13): an Icon's size as its Element-Size/Popular variable (Base, the
//     components' 20px, writes nothing), FileIcon as icon-media-file (Format), Flag as Flag (Name, Image-Size); the pull
//     reads them back.
{
  const page = `// @zen-page {"format":1,"title":"Icons"}
import { Board, Screen } from "@zen-ds/react/builder";
import { FileIcon, Flag, Icon, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Icons" device="desktop">
        <Stack direction="row">
          <Icon name="icon-plus-line" />
          <Icon name="icon-plus-line" size="lg" />
          <FileIcon format="pdf" />
          <FileIcon format="sheet" size="xl" />
          <Flag name="Vietnam" />
          <Flag name="Japan" size="large" />
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame, notes } = push(page);
  check("Icons: the size variable, icon-media-file by Format, Flag by Name and Image-Size", frame.children.map((icon) => [icon.set.name, icon.props.Format ?? icon.props.Name ?? null, icon.sizeVar ?? null]), [["icon-plus-line", null, null], ["icon-plus-line", null, "Element-Size/Popular/Large"], ["icon-media-file", "PDF", null], ["icon-media-file", "Sheet", "Element-Size/Popular/XLarge"], ["Flag", "Vietnam", null], ["Flag", "Japan", "Image-Size/Small"]]);
  ok("Icons: no FileIcon or Flag drawn as a frame", !notes.some((note) => /FileIcon|Flag/.test(note)));
  check("round trip: icons, file icons and flags come back with their sizes", shape(pageFromFigma(frame, { mapping }).text), shape(page));
}

// 26. Layout and Text props for the examples' last classNames (2026-10-13): a Box's surface as its Color/Background
//     variable (canvas too) and no gap, Stack / Box scroll as Overflow scrolling (it clips), Grid stackBelow as one
//     column on a Screen narrower than it, Text wrap={false} as Auto width (it does not fill its column), and one note
//     for tabularNumbers (a plugin cannot set Numbers: Tabular). The pull reads the surface, the scroll and a layout
//     frame's max height back.
{
  const layers = (device) => `// @zen-page {"format":1,"title":"Layers"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Box, Grid, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Layers" device="${device}">
        <Stack>
          <Box surface="canvas" padding="xl">
            <Stack scroll="y" maxHeight={120}>
              <Text>One</Text>
              <Text>Two</Text>
            </Stack>
            <Box surface="subtle" padding="md">
              <Text>Well</Text>
            </Box>
          </Box>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const page = layers("desktop");
  const { frame } = push(page);
  const canvas = frame.children[0];
  const [list, well] = canvas.children;
  check("Box: its surface's variable, no gap; a scrolling Stack clips at its max height", [canvas.fill, canvas.layout.gap, well.fill, list.scroll, list.clip, list.maxH], ["Background/Canvas/Default", 0, "Background/Neutral/Subtle/Default", "VERTICAL", true, 120]);
  check("round trip: Box surfaces and a scrolling Stack come back", shape(pageFromFigma(frame, { mapping }).text), shape(page));
  // An auto layout frame with a fill and a gap is one Stack carrying the fill (decision 2, plan 2026-10-18).
  const framed = pageFromFigma({ ...frame, children: [{ ...well, layout: { ...well.layout, gap: 12, gapVar: "Spacing/Gap/Small" }, children: [well.children[0], well.children[0]] }] }, { mapping }).text;
  ok("pull: a surface frame with a gap is one Stack with the surface", /<Stack gap="sm" padding="md" surface="subtle">/.test(framed) && !/<Box surface/.test(framed));
  // Frame appearance (Layout appearance.ts, decision 2): Box, Stack and Grid push their fill, stroke, corners, effect,
  // opacity, rotation and flip as one Figma frame, and pull back the same.
  const looks = `// @zen-page {"format":1,"title":"Looks"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Box, Grid, Stack, Text } from "@zen-ds/react";

export default function Looks() {
  return (
    <Board>
      <Screen id="screen-1" title="Looks" device="desktop">
        <Stack gap="lg" padding="xl">
          <Stack gap="sm" padding="lg" surface="surface" radius="xl" effectStyle="Shadow/Bottom/Level-1" opacity={80}>
            <Text>One</Text>
            <Text>Two</Text>
          </Stack>
          <Grid columns={2} gap="sm" surface="pale" border="pale" borderWeight={2} radius="lg" radiusBottomRight="xs">
            <Text>A</Text>
            <Text>B</Text>
          </Grid>
          <Stack direction="row" gap="xs" border="subtle" borderSides="bottom" borderStyle="dashed" rotation={15} flip="horizontal">
            <Text>Rule</Text>
            <Text>Below</Text>
          </Stack>
          <Box surface="subtle" padding="md" radius="md">
            <Text>Well</Text>
          </Box>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  // The page frame takes the body Stack's layout: the four frames are its children.
  const [card, tiles, rule, box] = push(looks).frame.children;
  check("frame look: fill, corners, effect, opacity", [card.fill, card.radius, card.radiusVar, card.effectStyle, card.opacity], ["Background/Surface/Default", 20, "Corner-Radius/XLarge", "Shadow/Bottom/Level-1", 0.8]);
  check("frame look: stroke weight, per-corner radii", [tiles.stroke, tiles.strokeWeight, tiles.strokeAlign, tiles.radii, tiles.radiiVars], ["Border/Neutral/Pale/Default", 2, "INSIDE", [16, 16, 4, 16], ["Corner-Radius/Large", "Corner-Radius/Large", "Corner-Radius/XSmall", "Corner-Radius/Large"]]);
  check("frame look: one side, dash, rotation, flip", [rule.stroke, rule.strokeSides, rule.dash, rule.rotation, rule.flip], ["Border/Neutral/Subtle/Default", "bottom", [2, 2], 15, "horizontal"]);
  check("frame look: a Box keeps its look", [box.fill, box.radius], ["Background/Neutral/Subtle/Default", 12]);
  check("round trip: frame looks come back on the same elements", shape(pageFromFigma(push(looks).frame, { mapping }).text), shape(looks));
  // Layer blend (2026-10-20, spec docs/research/studio-blend-mode-spec-2026-10-20.md): Figma's enum on frames, a group
  // and shapes; a frame's Pass through and a shape's Normal (their defaults) left out; and back to the same props.
  const blends = `// @zen-page {"format":1,"title":"Blends"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Box, Shape, Stack, Text } from "@zen-ds/react";

export default function Blends() {
  return (
    <Board>
      <Screen id="screen-1" title="Blends" device="desktop">
        <Stack gap="lg" padding="xl">
          <Stack gap="sm" surface="surface" blendMode="multiply">
            <Text>Multiply</Text>
            <Text>Two</Text>
          </Stack>
          <Stack gap="sm" blendMode="normal">
            <Text>Normal frame</Text>
            <Text>Two</Text>
          </Stack>
          <Stack gap="sm" blendMode="pass-through">
            <Text>Pass through</Text>
            <Text>Two</Text>
          </Stack>
          <Stack direction="row" gap="sm">
            <Shape type="ellipse" width={24} height={24} blendMode="plus-lighter" />
            <Shape type="rectangle" width={24} height={24} blendMode="normal" />
          </Stack>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const blended = push(blends).frame.children;
  check("blend: a frame's mode in Figma's enum; Normal kept on a frame, Pass through left out", blended.slice(0, 3).map((node) => node.blendMode ?? null), ["MULTIPLY", "NORMAL", null]);
  check("blend: a shape's mode (Plus lighter = LINEAR_DODGE); Normal left out", blended[3].children.map((node) => node.blendMode ?? null), ["LINEAR_DODGE", null]);
  // (Frames only: the pull reads a shape from Figma's read, figma-pull.selftest's shape fixture checks a shape's blend.)
  const frameBlends = push(blends).frame;
  frameBlends.children = frameBlends.children.slice(0, 3);
  const backBlends = shape(pageFromFigma(frameBlends, { mapping }).text);
  check("round trip: a frame's blend mode comes back on the same frame", backBlends.children[0].children[0].children.map((node) => node.props.blendMode ?? null), ["multiply", "normal", null]);
  // An instance's own look (instance-look.mjs; Figma's Appearance on an instance): a Button's opacity and blend go on the
  // INSTANCE, never as Figma properties of Button; a Badge without them has none; and they come back as the Button's.
  const instanceLooks = `// @zen-page {"format":1,"title":"Instance looks"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Badge, Button, Stack } from "@zen-ds/react";

export default function InstanceLooks() {
  return (
    <Board>
      <Screen id="screen-1" title="Instance looks" device="desktop">
        <Stack gap="lg" padding="xl">
          <Button opacity={40} blendMode="multiply">Go</Button>
          <Badge>New</Badge>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const lookPush = push(instanceLooks);
  const [lookButton, lookBadge] = lookPush.frame.children;
  check("instance look: the Button's opacity (0–1) and blend on the INSTANCE; the Badge has none", [lookButton.type, lookButton.opacity, lookButton.blendMode, lookBadge.opacity ?? null, lookBadge.blendMode ?? null], ["INSTANCE", 0.4, "MULTIPLY", null, null]);
  check("instance look: not a Figma property of Button, no note", [Object.keys(lookButton.props ?? {}).some((key) => /opacity|blend/i.test(key)), (lookPush.notes ?? []).some((note) => /opacity|blendMode/.test(note))], [false, false]);
  const lookBack = shape(pageFromFigma(lookPush.frame, { mapping }).text).children[0].children[0];
  check("round trip: the Button's opacity and blend come back as its props", lookBack.children.map((node) => [node.name, node.props.opacity ?? null, node.props.blendMode ?? null]), [["Button", 40, "multiply"], ["Badge", null, null]]);
  // A component set (F7): COMPONENT_SET of variants named by their values, its properties defined on it, a bound layer's
  // references, an instance's variant and property values.
  const chips = `// @zen-page {"format":1,"title":"Chips"}
import { Board, Component, ComponentSet, Screen, Use } from "@zen-ds/react/builder";
import { Icon, Stack, Text } from "@zen-ds/react";

export default function Chips() {
  return (
    <Board>
      <Screen id="screen-1" title="Chips" device="desktop">
        <Stack gap="lg" padding="xl">
          <ComponentSet id="chip" name="Chip" properties={{ Label: { type: "text", default: "Filter" }, "Show icon": { type: "boolean", default: true } }}>
            <Component id="chip-small" variant={{ Size: "Small" }}>
              <Stack direction="row">
                <Icon name="icon-star-01-line" data-prop-visible="Show icon" />
                <Text data-prop-text="Label">Filter</Text>
              </Stack>
            </Component>
            <Component id="chip-large" variant={{ Size: "Large" }}>
              <Stack direction="row" gap="sm">
                <Text data-prop-text="Label">Filter</Text>
              </Stack>
            </Component>
          </ComponentSet>
          <Use of="chip" variant={{ Size: "Large" }} props={{ Label: "Done" }} />
          <Component id="panel" name="Panel" link="https://zen.example/panel" properties={{ Content: { type: "slot" }, Icon: { type: "swap", default: "icon-star-01-line" } }}>
            <Stack data-prop-slot="Content">
              <Icon name="icon-star-01-line" data-prop-swap="Icon" />
            </Stack>
          </Component>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const [setNode, instanceNode, panelNode] = push(chips).frame.children;
  check("set: COMPONENT_SET of named variants", [setNode.type, setNode.local, setNode.children.map((variant) => [variant.type, variant.name])], ["COMPONENT_SET", "chip", [["COMPONENT", "Size=Small"], ["COMPONENT", "Size=Large"]]]);
  check("set: its properties", setNode.properties, [{ name: "Label", type: "TEXT", default: "Filter" }, { name: "Show icon", type: "BOOLEAN", default: true }]);
  const bound = find(setNode.children[0], (node) => node.type === "TEXT");
  const hidden = find(setNode.children[0], (node) => node.propRefs?.visible);
  check("set: bound layers", [bound?.propRefs, hidden?.propRefs], [{ characters: "Label" }, { visible: "Show icon" }]);
  check("main: its link, a slot and a swap property", [panelNode.link, panelNode.properties], ["https://zen.example/panel", [{ name: "Content", type: "SLOT" }, { name: "Icon", type: "INSTANCE_SWAP", default: "icon-star-01-line" }]]);
  check("main: the slot layer and the swapped icon", [panelNode.children[0]?.slot, find(panelNode, (node) => node.propRefs?.mainComponent)?.propRefs], ["Content", { mainComponent: "Icon" }]);
  check("round trip: sets, mains, bound layers and instances come back", shape(pageFromFigma(push(chips).frame, { mapping }).text), shape(chips));
  // Libraries' project components: an instance of another page's component goes as its main's layers, named after it.
  {
    const usesChips = `// @zen-page {"format":1,"title":"Uses chips","project":"acme"}
import { Board, Screen, Use } from "@zen-ds/react/builder";
import { Stack } from "@zen-ds/react";

export default function UsesChips() {
  return (
    <Board>
      <Screen id="screen-1" title="Uses chips" device="desktop">
        <Stack gap="lg" padding="xl">
          <Use of="chip" page="chips" variant={{ Size: "Small" }} />
        </Stack>
      </Screen>
    </Board>
  );
}
`;
    const pushed = figmaFromPage(usesChips, { mapping, pages: { chips } });
    const [layer] = pushed.frame.children;
    const [chipEntry] = pushed.components ?? [];
    check("project component: a linked INSTANCE of the other page's set, its variant", [layer?.type, layer?.local, layer?.page, layer?.name, layer?.variant], ["INSTANCE", "chip", "chips", "Chip", { Size: "Small" }]);
    check("project component: its set's definition goes with the package, keyed as its page keys it", [pushed.components?.length, chipEntry?.page, chipEntry?.title, chipEntry?.local, chipEntry?.spec?.type, chipEntry?.spec?.page, chipEntry?.spec?.children?.map((variant) => [variant.name, variant.page]), Boolean(chipEntry?.spec?.key)], [1, "chips", "Chips", "chip", "COMPONENT_SET", "chips", [["Size=Small", "chips"], ["Size=Large", "chips"]], true]);
    const renamed = figmaFromPage(usesChips.replace('<Use of="chip" page="chips"', '<Use of="chip" page="chips" data-name="Size chip"'), { mapping, pages: { chips } }).frame.children[0];
    check("project component: its instance's data-name is its Figma name (marked given)", [renamed?.name, renamed?.nameGiven, renamed?.page], ["Size chip", true, "chips"]);
    check("project component: figmaPackage carries it", figmaPackage(usesChips, { mapping, pages: { chips }, page: { id: "uses-chips" } }).pkg.components?.map((entry) => `${entry.page}/${entry.local}`), ["chips/chip"]);
    check("project component: without that page, a note", figmaFromPage(usesChips, { mapping }).notes.some((note) => /is not pushed/.test(note)), true);
    // Its main's own instances resolve on its page, even when this page has a component of the same id (A's review).
    const page = (title, body) => `// @zen-page {"format":1,"title":"${title}"}
import { Board, Component, Screen, Use } from "@zen-ds/react/builder";
import { Stack, Text } from "@zen-ds/react";

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="${title}" device="desktop">
        <Stack gap="lg" padding="xl">
          ${body}
        </Stack>
      </Screen>
    </Board>
  );
}
`;
    const cards = page("Cards", '<Component id="tag" name="Tag"><Text>Tag</Text></Component>\n          <Component id="card" name="Card"><Stack><Text>Card</Text><Use of="tag" /></Stack></Component>');
    const clash = page("Uses", '<Component id="tag" name="Other tag"><Text>Other</Text></Component>\n          <Use of="card" page="cards" />\n          <Use of="tag" page="uses" />');
    const clashPush = figmaFromPage(clash, { mapping, pages: { cards }, pageId: "uses" });
    const [, cardLayer, ownTag] = clashPush.frame.children;
    const byKey = new Map((clashPush.components ?? []).map((entry) => [`${entry.page}/${entry.local}`, entry]));
    const nestedTag = (byKey.get("cards/card")?.spec?.children?.[0]?.children ?? []).find((node) => node.type === "INSTANCE");
    check("project component: a nested instance names its own page; that page's component comes too, not this page's same id", [cardLayer?.type, cardLayer?.page, nestedTag?.local, nestedTag?.page, [...byKey.keys()].sort(), byKey.get("cards/tag")?.spec?.name], ["INSTANCE", "cards", "tag", "cards", ["cards/card", "cards/tag"], "Tag"]);
    check("project component: <Use page> naming this page is its own instance", [ownTag?.type, ownTag?.local], ["INSTANCE", "tag"]);
    // Two pages whose components hold each other (A's second review): the push stops at the loop and says so.
    const loopA = page("A", '<Component id="hero" name="Hero"><Stack><Text>Hero</Text><Use of="card" page="b" /></Stack></Component>');
    const loopB = page("B", '<Component id="card" name="Card"><Stack><Text>Card</Text><Use of="hero" page="a" /></Stack></Component>');
    let looped = null;
    try { looped = figmaFromPage(page("C", '<Use of="card" page="b" />'), { mapping, pages: { a: loopA, b: loopB }, pageId: "c" }); } catch (error) { looped = { error: String(error) }; }
    // The pushing page's own component, held by another page's: an instance of the one in the frame, nothing extra.
    const heldBack = figmaFromPage(loopA.replace("</Component>", "</Component>\n          <Use of=\"card\" page=\"b\" />"), { mapping, pages: { b: loopB }, pageId: "a" });
    const heldHero = (heldBack.components ?? [])[0]?.spec?.children?.[0]?.children?.find((node) => node.type === "INSTANCE");
    check("project component: one holding the pushing page's own component links to the frame's", [(heldBack.components ?? []).map((entry) => `${entry.page}/${entry.local}`), heldHero?.local, heldHero?.page], [["b/card"], "hero", "a"]);
    const loopNames = (looped?.components ?? []).map((entry) => `${entry.page}/${entry.local}`).sort();
    check("project component: a loop across pages stops at the component inside itself, noted", [looped?.error ?? null, looped?.frame?.children?.[0]?.type, loopNames, (looped?.notes ?? []).some((note) => /sits inside itself/.test(note))], [null, "INSTANCE", ["a/hero", "b/card"], true]);
  }
  // F7b: an instance's overrides of its main's layers, by the child indices that reach them in the drawn main.
  const overriddenPage = chips.replace('<Use of="chip" variant={{ Size: "Large" }} props={{ Label: "Done" }} />', '<Use of="chip" overrides={{ Text: { children: "Hi", tone: "accent" }, Icon: { hidden: true } }} />');
  const overridden = push(overriddenPage);
  const overriddenInstance = overridden.frame.children.find((node) => node.type === "INSTANCE" && node.local === "chip");
  check("overrides: placed by index in the main, in Figma's fields", overriddenInstance?.layerOverrides, [{ at: [0, 1], characters: "Hi", fill: "Content/Accent/Base" }, { at: [0, 0], visible: false }]);
  // …and pulled back to the same overrides by the Studio's layer paths (2026-10-20).
  // (tone "accent" comes back as its canonical name, "accent-base", as a Text's own tone does.)
  check("round trip: an instance's overrides come back by layer path", shape(pageFromFigma(overridden.frame, { mapping }).text), shape(overriddenPage.replace('tone: "accent"', 'tone: "accent-base"')));
  // F7b: an instance's slot content, by the slot's name.
  const filledPage = chips.replace('<Use of="chip" variant={{ Size: "Large" }} props={{ Label: "Done" }} />', '<Use of="panel" slots={{ Content: <Text>Filled</Text> }} />');
  const filledPanel = push(filledPage);
  const filledInstance = filledPanel.frame.children.find((node) => node.type === "INSTANCE" && node.local === "panel");
  check("slots: an instance's slot content by name", filledInstance?.slots?.map((slot) => [slot.name, slot.children.map((child) => [child.type, child.characters])]), [["Content", [["TEXT", "Filled"]]]]);
  check("round trip: an instance's slot content comes back", shape(pageFromFigma(filledPanel.frame, { mapping }).text), shape(filledPage));
  check("set: an instance's variant and values", [instanceNode.type, instanceNode.local, instanceNode.variant, instanceNode.props], ["INSTANCE", "chip", { Size: "Large" }, { Label: "Done", "Show icon": true }]);
  // A layer inside a nested instance (2026-10-20): the nested Chip's place in the Toolbar main, then its Text's in the
  // Chip variant the override shows (Large), the variant first; and back by the same path.
  const toolbar = `          <Component id="toolbar" name="Toolbar">
            <Stack direction="row" gap="sm">
              <Use of="chip" variant={{ Size: "Small" }} />
              <Text>Tools</Text>
            </Stack>
          </Component>
`;
  const deepPage = chips.replace('<Use of="chip" variant={{ Size: "Large" }} props={{ Label: "Done" }} />', `${toolbar.trim()}\n          <Use of="toolbar" overrides={{ "Chip/Text": { children: "Deep" }, Chip: { "variant.Size": "Large" } }} />`);
  const deep = push(deepPage);
  const deepInstance = deep.frame.children.find((node) => node.type === "INSTANCE" && node.local === "toolbar");
  check("deep overrides: the nested instance's variant, then its layer by the indices through it", deepInstance?.layerOverrides, [{ at: [0, 0], variant: { Size: "Large" } }, { at: [0, 0, 0, 0], characters: "Deep" }]);
  check("deep overrides: no note", deep.notes.filter((note) => note.includes("override")), []);
  check("round trip: an override inside a nested instance comes back by its path", shape(pageFromFigma(deep.frame, { mapping }).text), shape(deepPage.replace('<Use of="chip" variant={{ Size: "Small" }} />', '<Use of="chip" />')));
  // In the Small variant the Text is the second layer (after the Icon): the indices follow the variant shown.
  const smallPage = chips.replace('<Use of="chip" variant={{ Size: "Large" }} props={{ Label: "Done" }} />', `${toolbar.trim()}\n          <Use of="toolbar" overrides={{ "Chip/Text": { children: "Small" } }} />`);
  check("deep overrides: in the nested instance's own variant", push(smallPage).frame.children.find((node) => node.type === "INSTANCE" && node.local === "toolbar")?.layerOverrides, [{ at: [0, 0, 0, 1], characters: "Small" }]);
  // A Zen component in a main (2026-10-20): its props as Figma properties, its words as its label, a layer inside it
  // (its nest() name) as a nested override, one entry per layer; and back by the same paths.
  const libraryPage = `// @zen-page {"format":1,"title":"Library layers"}
import { Board, Component, Screen, Use } from "@zen-ds/react/builder";
import { AlertBanner, Badge, Button, Stack } from "@zen-ds/react";

export default function LibraryLayers() {
  return (
    <Board>
      <Screen id="screen-1" title="Library layers" device="desktop">
        <Stack gap="lg" padding="xl">
          <Component id="cta" name="CTA">
            <Stack direction="row" gap="sm">
              <Button>Go</Button>
              <Badge>New</Badge>
            </Stack>
          </Component>
          <Use of="cta" overrides={{ Button: { level: "secondary", children: "Buy" }, Badge: { theme: "red" } }} />
          <Component id="notice" name="Notice">
            <Stack>
              <AlertBanner title="Heads up" />
            </Stack>
          </Component>
          <Use of="notice" overrides={{ "AlertBanner/Action": { level: "secondary" } }} />
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const library = push(libraryPage);
  const [ctaUse, noticeUse] = library.frame.children.filter((node) => node.type === "INSTANCE");
  check("library layers: a Zen component's props and words in a main", ctaUse?.layerOverrides, [{ at: [0, 0], props: { Level: "Secondary" }, text: "Buy" }, { at: [0, 1], props: { Theme: "Red" } }]);
  check("library layers: a layer inside a Zen component, by its nest() name", noticeUse?.layerOverrides, [{ at: [0, 0], nested: [{ path: "Action", set: { id: "1026:8312", name: "Button/Main" }, props: { Level: "Secondary" } }] }]);
  check("library layers: no note", library.notes.filter((note) => note.includes("override") || note.includes("Figma property")), []);
  const libraryBack = pageFromFigma(library.frame, { mapping });
  check("round trip: a Zen component's props, words and nested layers in a main come back by path", libraryBack.text.split("\n").map((line) => line.trim()).filter((line) => line.startsWith("<Use ")), [
    '<Use of="cta" overrides={{ Button: { level: "secondary", children: "Buy" }, Badge: { theme: "red" } }} />',
    '<Use of="notice" overrides={{ "AlertBanner/Action": { level: "secondary" } }} />',
  ]);
  check("library layers: a prop with no Figma property is noted", push(libraryPage.replace('Badge: { theme: "red" }', 'Badge: { nope: "x" }')).notes.filter((note) => note.includes("nope has no Figma property")).length, 1);
  const texts = (device) => `// @zen-page {"format":1,"title":"Texts"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Grid, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Texts" device="${device}">
        <Stack gap="lg">
          <Text wrap={false} tabularNumbers>10:45 am</Text>
          <Text tabularNumbers>12</Text>
          <Grid columns="minmax(0, 1fr) minmax(0, 2fr)" stackBelow={640}>
            <Text>Side</Text>
            <Text>Main</Text>
          </Grid>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  // (The Screen's one Stack is its frame's layout.)
  const desktop = push(texts("desktop"));
  const [time, count, grid] = desktop.frame.children;
  check("Text wrap={false}: Auto width, not filling its column; a wrapping one fills", [time.autoWidth, time.fillW, count.autoWidth, count.fillW], [true, undefined, undefined, true]);
  ok("tabularNumbers: one note for the page", desktop.notes.filter((note) => /Numbers: Tabular/.test(note)).length === 1 && desktop.notes.some((note) => note.startsWith("2 texts")));
  check("Grid stackBelow: its columns on desktop, one column on a phone", [grid.layout.grid.columns, push(texts("phone")).frame.children[2].layout.grid.columns], [2, 1]);
}

// 27. Round trip found by testing every example frame through the real Zen file (2026-10-13, P6): the pull reads a
//     List-Item's title, caption, leading and trailing, a List-Box's header, a field's label, value and help, a
//     Checkbox's label and caption (its Content), an emoji Dock-Icon and a text's tone from Figma's read
//     (fixtures/figma-parts.json); the push writes the Checkbox's label and caption through its Content and the emoji.
{
  const read = JSON.parse(fs.readFileSync(new URL("./fixtures/figma-parts.json", import.meta.url), "utf8")).frame;
  const text = pageFromFigma(read, { mapping }).text;
  ok("pull: Checkbox label and caption from its Content", /<Checkbox label="I confirm these hours are accurate" caption="They are billed to Phin & Co and Lumen Bank in October\." \/>/.test(text));
  ok("pull: a field's label and value (Inputted)", /<InputField[^>]*label="Phone"[^>]*defaultValue="9123 4567"|<InputField[^>]*defaultValue="9123 4567"[^>]*label="Phone"/.test(text));
  ok("pull: a field's help is its Message, not Figma's \"Help text\"", text.includes('helpText="Billed on the 1st of each month."') && !text.includes('"Help text"'));
  ok("pull: List-Box header and List", /<ListBox header=\{<Text textStyle="Heading\/Subheading">Leave balance<\/Text>\}>\s*<List>/.test(text));
  ok("pull: List-Item title, caption and emoji leading", text.includes('<ListItem title="Annual leave" caption="7 of 18 days left · resets Jan 1, 2027" leading={<DockIcon theme="emoji" emoji="🏝️" />} />'));
  ok("pull: List-Item Avatar leading and Badge trailing", /<ListItem\s+title="Audit the account overview for WCAG 2\.2"\s+caption="LUM-091 · Due today"\s+leading=\{<Avatar[^}]*\/>\}\s+trailing=\{<Badge[^}]*>To do<\/Badge>\}/.test(text.replace(/\n\s*/g, " ")));
  ok("pull: a text's tone from its Content variable", text.includes('<Text textStyle="Body/Small/Regular" tone="base">Sep 21 – Sep 27, 2026</Text>'));
  ok("pull: a List-Item's leading swapped for a file icon (read from its main component) and its IconButton trailing", text.includes('<ListItem title="Usability plan – transfers.pdf" caption="1.2 MB · Ava Chen · Yesterday at 4:05 pm" leading={<FileIcon format="pdf" />} trailing={<IconButton icon="icon-trash-line" appearance="flat" aria-label="Delete Usability plan – transfers.pdf" />} />'));
  const page = `// @zen-page {"format":1,"title":"Controls"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Checkbox, Chip, DockIcon, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Controls" device="desktop">
        <Stack>
          <Checkbox label="I confirm" caption="Billed in October." />
          <DockIcon theme="emoji" emoji="🏝️" />
          <Checkbox label="Keep me signed in" defaultChecked />
          <Chip variant="normal" defaultSelected>Unread</Chip>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const [box, dock, kept, unread] = push(page).frame.children;
  check("push: Checkbox label, caption through its Content (shown, then written)", [box.texts, box.nested, box.props.Caption], [{ Label: "I confirm" }, [{ path: "Content", props: { Subtext: true }, texts: { Subtext: "Billed in October." } }], undefined]);
  check("push: an emoji Dock-Icon's emoji as its text", dock.text, "🏝️");
  // The Studio writes a state prop as its uncontrolled twin (so the page stays interactive): the same Figma property.
  check("push: defaultChecked and defaultSelected are Select=Yes", [kept.props.Select, unread.props.Select], ["Yes", "Yes"]);
  // A Heading's level rides on its layer's name, so it comes back a Heading (its level's text style unsaid).
  const headings = `// @zen-page {"format":1,"title":"Headings"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Heading, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Headings" device="desktop">
        <Stack>
          <Heading level={2}>Projects</Heading>
          <Heading level={3} textStyle="Heading/4">Due this week</Heading>
          <Text tone="base">Six projects</Text>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const pushed = push(headings).frame;
  check("push: a Heading's layer named for its level", pushed.children.map((child) => child.name ?? null), ["Heading 2", "Heading 3", null]);
  check("round trip: Headings (level, text style) and a Text's tone come back", shape(pageFromFigma(pushed, { mapping }).text), shape(headings));

  // Layer names and locks (F1, tools/studio/layer-meta.mjs): a frame's, a shape's and a text's data-name is its Figma
  // name and comes back; a lock and an instance's name stay in the page (not pushed, not pulled).
  const names = `// @zen-page {"format":1,"title":"Names"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Button, Shape, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Names" device="desktop">
        <Stack>
          <Stack direction="row" data-name="Price row" data-locked>
            <Text data-name="Price">$12</Text>
            <Shape type="ellipse" width={24} height={24} data-name="Dot" />
          </Stack>
          <Button data-name="Main action">Buy</Button>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const pushedNames = push(names).frame;
  const row = pushedNames.children[0];
  check("push: a frame's, a text's and a shape's data-name is its Figma name, and an instance's (marked nameGiven)", [row.name, row.children[0].name, row.children[1].name, pushedNames.children[1].name, pushedNames.children[1].nameGiven], ["Price row", "Price", "Dot", "Main action", true]);
  check("push: a lock is the Studio's (no locked on the layer)", JSON.stringify(pushedNames).includes("locked"), false);
  const back = pageFromFigma(pushedNames, { mapping }).text;
  check("round trip: the names come back as data-name, the instance's too; the lock does not", ['data-name="Price row"', 'data-name="Price"', 'data-name="Dot"', '<Button data-name="Main action">', "data-locked"].map((part) => back.includes(part)), [true, true, true, true, false]);
  // The accessible name first (user 2026-10-23): an aria-label stays the Figma name (a note says the layer name stays in
  // the Studio); an icon button's Figma name is its label, so its data-name never goes there.
  const labelled = push(names.replace("{ Button, Shape", "{ Button, IconButton, Shape").replace('<Button data-name="Main action">Buy</Button>', '<Button data-name="Main action" aria-label="Buy the plan">Buy</Button>\n          <IconButton icon="icon-plus-line" data-name="Add row" />'));
  const [labelledButton, iconButton] = labelled.frame.children.slice(1);
  check("push: an aria-label stays an instance's Figma name over its data-name (noted); an icon button keeps its own", [labelledButton.name, Boolean(labelledButton.nameGiven), labelled.notes.filter((note) => /layer name stays in the Studio/.test(note)).length, iconButton.name === "Add row", Boolean(iconButton.nameGiven)], ["Buy the plan", false, 1, false, false]);
  // Back from Figma: a layer the Zen plugin placed (its key) gives its name only when the plugin marked it the person's or
  // it was renamed in Figma since (the reader's nameGiven); a content name ("Brief.pdf") and the library's own names stay.
  const placed = (name, nameGiven) => ({ ...pushedNames, children: [{ ...pushedNames.children[1], name, key: "placed", nameGiven }] });
  check("pull: a placed instance's name comes back when marked given, not otherwise", [pageFromFigma(placed("Checkout", true), { mapping }).text.includes('data-name="Checkout"'), pageFromFigma(placed("Checkout", false), { mapping }).text.includes("data-name")], [true, false]);

  // F9: a vector goes as Figma's VECTOR (its path fitted to its size, stroke centred, no fill) and comes back the same.
  const vectorPage = names.replace('<Shape type="ellipse" width={24} height={24} data-name="Dot" />', '<Shape type="vector" width={80} height={40} d="M 0 10 C 5 0 15 0 20 10 Z" viewBox="0 0 20 10" fillRule="evenodd" />');
  const pushedVector = find(push(vectorPage).frame, (node) => node.type === "VECTOR");
  check("push: a vector is a VECTOR with its path in the node's px, centred stroke, no fill", pushedVector && [pushedVector.shape, pushedVector.name, pushedVector.vectorPaths, pushedVector.strokeAlign, "fill" in pushedVector, pushedVector.fixedWidth, pushedVector.fixedHeight], [true, "Vector", [{ windingRule: "EVENODD", data: "M 0 40 C 20 0 60 0 80 40 Z" }], "CENTER", false, 80, 40]);
  // F3: a Box group is pushed as a frame the importer turns into Figma's GROUP; a Shape's flip goes along.
  const groupPage = `// @zen-page {"format":1,"title":"Groups"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Box, Shape, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Groups" device="desktop">
        <Stack>
          <Box width={200} height={100}>
            <Box group position="absolute" insetLeft={10} insetTop={10} width={60} height={24}><Shape type="ellipse" position="absolute" insetLeft={0} insetTop={0} width={24} height={24} flip="horizontal" /></Box>
          </Box>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const pushedGroup = find(push(groupPage).frame, (node) => node.group === true);
  check("push: a Box group is a frame marked group, named Group", pushedGroup && [pushedGroup.type, pushedGroup.name], ["FRAME", "Group"]);
  // A mask group (⌃⌘M, Box group mask): marked mask, named as Figma names it; the importer sets isMask on its first layer.
  const maskPage = groupPage.replace("<Box group position=", "<Box group mask position=");
  const pushedMask = find(push(maskPage).frame, (node) => node.group === true);
  check("push: a mask group is a group frame marked mask, named Mask group", pushedMask && [pushedMask.name, pushedMask.mask], ["Mask group", true]);
  // A free frame of a px size (Box width={200} height={100} in a column) keeps it: Fixed, not Fill (2026-10-19, the live
  // Zen file: a 560 × 240 free frame came out as tall as its layers).
  const freeFrame = find(push(groupPage).frame, (node) => node.type === "FRAME" && node.fixedWidth === 200);
  check("push: a free frame's px width and height are its Fixed size", freeFrame && [freeFrame.fixedWidth, freeFrame.fixedHeight, freeFrame.fillW ?? false], [200, 100, false]);
  check("push: a Shape's flip", find(push(groupPage).frame, (node) => node.shape === true)?.flip, "horizontal");

  // F9b: a boolean group is pushed as Figma's BOOLEAN_OPERATION holding its shapes.
  const booleanPage = groupPage.replace('<Box group position="absolute" insetLeft={10} insetTop={10} width={60} height={24}><Shape type="ellipse" position="absolute" insetLeft={0} insetTop={0} width={24} height={24} flip="horizontal" /></Box>', '<Shape type="boolean" operation="subtract" position="absolute" insetLeft={10} insetTop={10} width={60} height={24} d="M 0 0 L 60 0 L 60 24 L 0 24 Z" viewBox="0 0 60 24"><Shape type="rectangle" position="absolute" insetLeft={0} insetTop={0} width={60} height={24} /><Shape type="ellipse" position="absolute" insetLeft={40} insetTop={0} width={24} height={24} /></Shape>');
  const pushedBoolean = find(push(booleanPage).frame, (node) => node.type === "BOOLEAN_OPERATION");
  check("push: a boolean group is a BOOLEAN_OPERATION of its shapes", pushedBoolean && [pushedBoolean.name, pushedBoolean.booleanOperation, pushedBoolean.children.map((child) => child.type), "vectorPaths" in pushedBoolean], ["Subtract", "SUBTRACT", ["RECTANGLE", "ELLIPSE"], false]);

  // A pushed app page read back (fixtures/figma-shell.json): Figma's sample LOGO and Collapse are the Sidebar's own,
  // the crumbs' Sub level is `master` off, a Description List's rows their Term and Value, Type=Main a PageHeader.
  const shell = pageFromFigma(JSON.parse(fs.readFileSync(new URL("./fixtures/figma-shell.json", import.meta.url), "utf8")).frame, { mapping });
  ok("pull: a Sidebar header of Figma's sample LOGO and Collapse is no brand (both noted)", !shell.text.includes("brand=") && !shell.text.includes("Collapse") && shell.notes.filter((note) => /sample LOGO|Collapse button/.test(note)).length === 2);
  ok("pull: crumbs at the Item's Sub level: Breadcrumbs master off", shell.text.includes('{ id: "chi-tran", label: "Chi Tran" }]} master={false} />'));
  ok("pull: Description List rows are their Term and Value", shell.text.includes('<DescriptionList items={[{ term: "Team", description: "Design" }, { term: "Email", description: "chi@dizai.studio" }, { term: "Location", description: "Hanoi" }]} />'));
  ok("pull: Dashboard/Header Type=Main is a PageHeader, its Subheading the description", shell.text.includes('<PageHeader title="Chi Tran" description="Product Designer · Hanoi" />'));
  const sidebarPage = (sidebar) => `// @zen-page {"format":1,"title":"Shell"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Sidebar, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Shell" device="desktop">
        ${sidebar}
      </Screen>
    </Board>
  );
}
`;
  const headerOf = (sidebar) => push(sidebarPage(sidebar)).frame.children[0].slots.find((slot) => slot.name === "Header-Content");
  const logoHeader = headerOf(`<Sidebar logo={<Stack direction="row" gap="xs"><Text as="span" textStyle="Body/Base/Bold">Dizai Studio</Text></Stack>} sections={[{ items: [{ id: "home", label: "Home", icon: "icon-home-03-line" }] }]} />`);
  const fileRow = push(sidebarPage(`<ListItem title="Q3 report.pdf" leading={<FileIcon format="pdf" size="xl" />} />`).replace("import { Sidebar, Stack, Text }", "import { FileIcon, ListItem, Sidebar, Stack, Text }"));
  const fileLead = fileRow.frame.children[0].nested?.[0];
  check("push: a List-Item's FileIcon lead swaps its Avatar, without a size Figma cannot set inside an instance (noted)", [fileLead?.set?.name, "sizeVar" in (fileLead ?? {}), fileRow.notes.some((note) => note.includes("shows at its own size in Figma"))], ["icon-media-file", false, true]);
  check("push: a Sidebar's logo is its Header-Content (Figma's sample LOGO and Collapse go)", logoHeader.children.map((layer) => [layer.type, layer.fillW, layer.children.map((child) => child.characters)]), [["FRAME", true, ["Dizai Studio"]]]);
}

// 28. Round trip by key (P6b, 2026-10-13; fixtures/figma-pushed.json): a page exported with its ids, placed in the Zen
//     file and read back pulls with the page's own ids (the layers' Studio keys), and names its page and export. Against
//     the pull of the export (the base) and the page as exported (synced): the frame as placed is no change; a designer's
//     edits are exactly the changes, and merging them keeps what Figma cannot hold.
{
  const fixture = JSON.parse(fs.readFileSync(new URL("./fixtures/figma-pushed.json", import.meta.url), "utf8"));
  const counter = () => { let n = 0; return () => `k${++n}`; };
  const { pkg } = figmaPackage(fixture.page, { mapping, nestedLayers: NESTED_LAYERS, page: { id: "p6b-breadcrumbs-top-bar-trail", title: "P6b" }, newId: counter() });
  const current = docFromText(fixture.page, { newId: counter() }).doc;
  // The base is the pull of the frame as it was exported then (the Studio keeps it at export: a later push may differ).
  const base = pageFromFigma({ ...fixture.exported, page: "p6b-breadcrumbs-top-bar-trail", version: "v1" }, { mapping }).doc;
  check("pushed: the export's keys are the page's ids (the frame read back carries them)", [pkg.frame.key, fixture.untouched.key, current.board.children[0].id], ["k2", "k2", "k2"]);
  const untouched = pageFromFigma(fixture.untouched, { mapping }).doc;
  check("pushed: a pull names the Studio page and the export", untouched.header.figma, { file: "9nZv4uW2LT21yuHabMTCh1", node: "15459:3", page: "p6b-breadcrumbs-top-bar-trail", version: "v1" });
  check("pushed: the frame as placed is no change against its export", figmaChanges({ base, current, incoming: untouched, synced: current }).changes.map((change) => change.label), []);
  const edited = pageFromFigma(fixture.edited, { mapping }).doc;
  const { changes } = figmaChanges({ base, current, incoming: edited, synced: current });
  check("pushed: the designer's edits are the changes, none a conflict", changes.map((change) => `${change.kind}${change.conflict ? "!" : ""}: ${change.label}`), [
    "prop: DescriptionList · items: changed",
    "text: Heading: “Projects” → “Your projects”",
    "add: Text “Updated weekly” added",
    "prop: ListItem “Loyalty app v2” · title: “Loyalty app” → “Loyalty app v2”",
    "prop: Badge “Shipped” · theme: “blue” → “green”",
    "text: Badge: “Active” → “Shipped”",
    "remove: ListItem “Zen design system” removed",
  ]);
  const merged = printPage(mergeFigma(current, edited, changes).doc);
  ok("pushed: merged, the page keeps what Figma cannot hold (Container, titleLines, ListBox theme, aria, ids, the logo's Image)",
    ["<Container>", "titleLines={2}", '<ListBox theme="shadow">', 'aria-labelledby="chi-projects"', 'id="chi-projects"', '{ id: "team:design", label: "Design" }', '<Image src="zen-media:tpl.hr.workspace-logo.png" alt="" />'].every((part) => merged.includes(part)));
  ok("pushed: merged, the designer's edits are in", ['description: "Da Nang"', ">Your projects</Heading>", '<Text textStyle="Body/Small/Regular">Updated weekly</Text>', 'title="Loyalty app v2"', '<Badge theme="green" background="subtle">Shipped</Badge>'].every((part) => merged.includes(part)) && !merged.includes("Zen design system"));
  // The Studio changed the heading since the export too: that change is a conflict; an edit elsewhere stays.
  const studioEdited = JSON.parse(JSON.stringify(current));
  const heading = (doc) => { const find = (node) => (node.name === "Heading" ? node : node.children.filter((child) => child.kind === "element").map(find).find(Boolean) ?? Object.values(node.props).filter((value) => value.kind === "element").map((value) => find(value.node)).find(Boolean) ?? null); return find(doc.board); };
  heading(studioEdited).children = [{ kind: "text", value: "Projects 2026" }];
  const conflicts = figmaChanges({ base, current: studioEdited, incoming: edited, synced: current }).changes.filter((change) => change.conflict).map((change) => change.label);
  check("pushed: a spot the Studio changed since the export too is a conflict", conflicts, ["Heading: “Projects” → “Your projects”"]);
  // A layer the designer duplicated carries the same key: the first keeps the id, the copy comes in as added.
  const duplicated = JSON.parse(JSON.stringify(fixture.edited));
  const stack = (function find(node) { return node.id === "15459:848" ? node : (node.children ?? []).map(find).find(Boolean) ?? null; })(duplicated);
  stack.children.push({ ...stack.children[0], id: "15460:999", characters: "Projects copy" });
  const copies = figmaChanges({ base, current, incoming: pageFromFigma(duplicated, { mapping }).doc, synced: current }).changes.filter((change) => change.kind === "add").map((change) => change.label);
  check("pushed: a duplicated layer (same key) comes in as added, the original keeps its id", copies, ["Text “Updated weekly” added", "Heading “Projects copy” added"]);
}

// 29. Every chart (chart family phase 2, 2026-10-14; figma-charts.mjs): each code chart as its ❖ Chart set, variants and
//     Show Average / Show Legend from its props; a ChartCard as a Card (its theme) holding the chart with the header
//     properties on (Title, Show Icon + Icon, Show Description + Description, Show Value + Value, Show Ranges, Show Open);
//     a chart on its own with every header toggle off and its Heading hidden. The pull gives back the same charts and
//     cards (the data is the Studio's sample: Figma draws its own).
const CHARTS = `// @zen-page {"format":1,"title":"Charts"}
import { Board, Screen, proto } from "@zen-ds/react/builder";
import { AreaChart, BarChart, BarList, BulletChart, ChartCard, ComboChart, DonutChart, FunnelChart, GaugeChart, GroupedBarChart, HeatmapChart, LineChart, RadialChart, Stack, StackBarChart } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Charts" device="desktop">
        <Stack gap="md">
          <ChartCard title="Revenue" theme="shadow" icon="icon-coins-stacked-01-line" description="Invoiced so far in 2026" value="$541.4K" ranges={[{ id: "month", label: "Month" }, { id: "quarter", label: "Quarter" }]} range="quarter" onOpen={proto.toast({ title: "Open report" })}>
            <LineChart aria-label="Revenue per month, Apr – Sep 2026" showAverage data={[{ label: "Apr", value: 1 }, { label: "May", value: 2 }, { label: "Jun", value: 3 }, { label: "Jul", value: 4 }, { label: "Aug", value: 5 }, { label: "Sep", value: 9 }]} />
          </ChartCard>
          <ChartCard title="Invoiced and collected">
            <LineChart aria-label="Invoiced and collected" legendPosition="top" label="Invoiced" data={[{ label: "Mar", value: 1 }, { label: "Apr", value: 1 }, { label: "May", value: 1 }, { label: "Jun", value: 1 }, { label: "Jul", value: 1 }, { label: "Aug", value: 1 }, { label: "Sep", value: 1 }]} compare={{ label: "Collected", values: [1, 1, 1, 1, 1, 1, 1] }} />
          </ChartCard>
          <ChartCard title="Hours" theme="border"><StackBarChart palette="secondary" aria-label="Hours" series={[{ id: "a", label: "A" }]} data={[{ label: "Apr", values: { a: 1 } }]} /></ChartCard>
          <ChartCard title="Capacity" theme="pale"><BarChart orientation="horizontal" showAverage aria-label="Capacity" data={[{ label: "Design", value: 2650 }, { label: "Delivery", value: 750, projected: true }]} /></ChartCard>
          <ChartCard title="Clients"><DonutChart palette="secondary" aria-label="Clients" totalPosition="start" label="Invoiced in Q3" value="$296.8K" data={[{ id: "a", label: "A", value: 1 }]} /></ChartCard>
          <ChartCard title="Budget"><RadialChart aria-label="Budget" legendPosition="end" data={[{ id: "a", label: "A", value: 36 }]} /></ChartCard>
          <ChartCard title="When"><HeatmapChart aria-label="When" columns={["Mon"]} rows={["9 am"]} values={[[1]]} /></ChartCard>
          <ChartCard title="Hours by team"><AreaChart type="stacked" aria-label="Hours by team" series={[{ id: "a", label: "A" }, { id: "b", label: "B" }]} data={[{ label: "Apr", values: { a: 1, b: 2 } }]} /></ChartCard>
          <ChartCard title="Invoiced vs. collected"><GroupedBarChart aria-label="Invoiced vs. collected" series={[{ id: "a", label: "A" }, { id: "b", label: "B" }]} data={[{ label: "Apr", values: { a: 1, b: 2 } }]} /></ChartCard>
          <ChartCard title="Revenue and margin"><ComboChart aria-label="Revenue and margin" barLabel="Revenue" lineLabel="Margin" data={[{ label: "Apr", bar: 1, line: 2 }]} /></ChartCard>
          <ChartCard title="Utilisation"><GaugeChart palette="secondary" aria-label="Utilisation" value={82} target={85} showLegend={false} /></ChartCard>
          <ChartCard title="Proposal funnel"><FunnelChart aria-label="Proposal funnel" data={[{ label: "Leads", value: 240 }, { label: "Signed", value: 62 }]} /></ChartCard>
          <ChartCard title="Top clients"><BarList aria-label="Top clients" data={[{ label: "A", value: 3 }, { label: "B", value: 2 }, { label: "C", value: 1 }]} /></ChartCard>
          <ChartCard title="Quarter goals"><BulletChart aria-label="Quarter goals" data={[{ label: "Revenue", value: 612000, target: 600000 }]} /></ChartCard>
          <AreaChart aria-label="Billable hours" series={[{ id: "h", label: "Hours" }]} data={[{ label: "Apr", values: { h: 1 } }]} />
          <BarChart aria-label="Revenue" data={[{ label: "Jul", value: 94100 }]} />
        </Stack>
      </Screen>
    </Board>
  );
}
`;
{
  const { frame, notes } = push(CHARTS);
  const cards = frame.children.filter((node) => node.set?.name === "Card");
  const charts = cards.map((card) => card.slots[0].children[0]);
  const bare = frame.children.filter((node) => node.set?.name?.startsWith("Chart/"));
  check("every chart: its ❖ Chart set (LineChart with compare → Multi-Line, Bar/Donut/Radial/Area…)", [...charts, ...bare].map((chart) => chart.set.name), ["Chart/Line-Chart", "Chart/Multi-Line-Chart", "Chart/Stack-Bar-Chart", "Chart/Bar-Chart", "Chart/Donut-Chart", "Chart/Radial-Chart", "Chart/Heatmap-Chart", "Chart/Area-Chart", "Chart/Grouped-Bar-Chart", "Chart/Combo-Chart", "Chart/Gauge-Chart", "Chart/Funnel-Chart", "Chart/Bar-List", "Chart/Bullet-Chart", "Chart/Area-Chart", "Chart/Bar-Chart"]);
  ok("every chart set by its id (the plugin finds it by id, then name)", [...charts, ...bare].every((chart) => /^\d+:\d+$/.test(chart.set.id)));
  check("ChartCard: Card by its theme (Shadow, Default by default, Border, Pale)", cards.slice(0, 5).map((card) => card.props.Theme), ["Shadow", "Default", "Border", "Pale", "Default"]);
  const head = ["Show Icon", "Icon", "Title", "Show Description", "Description", "Show Value", "Value", "Show Ranges", "Show Open"];
  check("ChartCard header: every header property from its props (icon, title, description, value, ranges, onOpen)", Object.fromEntries(head.map((name) => [name, charts[0].props[name]])), { "Show Icon": true, Icon: "icon-coins-stacked-01-line", Title: "Revenue", "Show Description": true, Description: "Invoiced so far in 2026", "Show Value": true, Value: "$541.4K", "Show Ranges": true, "Show Open": true });
  check("ChartCard header: a title alone turns the rest off and writes no texts", Object.fromEntries(head.map((name) => [name, charts[2].props[name]])), { "Show Icon": false, Title: "Hours", "Show Description": false, "Show Value": false, "Show Ranges": false, "Show Open": false });
  check("ChartCard ranges: the picked range selected", charts[0].slots[0].children.map((item) => `${item.text}:${item.props.Select}`), ["Month:No", "Quarter:Yes"]);
  check("LineChart showAverage: Show Average on, its tag the mean as the code writes it", [charts[0].props["Show Average"], charts[0].props.Average], [true, "Avg 4"]);
  check("LineChart compare: Multi-Line-Chart by its Sector (7 points)", [charts[1].props.Sector, charts[1].props["Show Average"]], ["7-Sectors", false]);
  check("BarChart: Orientation, Show Average over the closed bars", [charts[3].props.Orientation, charts[3].props["Show Average"], charts[3].props.Average], ["Horizontal", true, "Avg 2.7K"]);
  check("DonutChart totalPosition start: Legend Start, Total Start, Total Label / Total Value from label / value", ["Legend", "Total", "Total Label", "Total Value"].map((name) => charts[4].props[name]), ["Start", "Start", "Invoiced in Q3", "$296.8K"]);
  check("RadialChart legendPosition end: Legend End", charts[5].props.Legend, "End");
  check("AreaChart stacked: Type Stacked, Show Legend on (the code's default when stacked)", [charts[7].props.Type, charts[7].props["Show Legend"]], ["Stacked", true]);
  check("Show Legend by the code's default: on (Grouped, Combo, Bullet); Gauge as written", [8, 9, 10, 13].map((index) => charts[index].props["Show Legend"]), [true, true, false, true]);
  check("Funnel, Bar list, Heatmap: no variant or legend property (Funnel: Color)", [6, 11, 12].map((index) => Object.keys(charts[index].props).filter((name) => !head.includes(name))), [[], ["Color"], []]);
  // Figma Color (2026-10-17) ↔ palette: the ten sets that have it, Secondary where the page says palette="secondary".
  check("Color: Primary unless palette=\"secondary\"; Line, Multi-Line, Heatmap and Bar list have none", charts.map((chart) => chart.props.Color ?? null), [null, null, "Secondary", "Primary", "Secondary", "Primary", null, "Primary", "Primary", "Primary", "Secondary", "Primary", null, "Primary"]);
  check("Gauge, Funnel, Bullet: their sets (2026-10-17), not the old lone components", [10, 11, 13].map((index) => charts[index].set.id), ["15968:130382", "15968:130460", "15968:130554"]);
  const styles = (node) => [...(node.fillStyle ? [node.fillStyle] : []), ...[...(node.children ?? []), ...(node.slots ?? []).flatMap((slot) => slot.children ?? [])].flatMap(styles)];
  check("palette=\"secondary\": the drawn marks swap Sector/Primary and /Secondary (a stack's first series, a donut's first slice)", [styles(charts[2])[0], styles(charts[4])[0]], ["Color Chart Sector/Secondary", "Color Chart Sector/Secondary"]);
  check("a chart on its own: every header toggle off, its Heading hidden, the code's defaults (Area: no legend, Bar: Vertical)", bare.map((chart) => [chart.props["Show Icon"], chart.props["Show Ranges"], chart.props["Show Open"], chart.hide, chart.props["Show Legend"] ?? chart.props.Orientation]), [[false, false, false, ["Heading"], false], [false, false, false, ["Heading"], "Vertical"]]);
  check("a chart in a ChartCard keeps its own key (its element id); the card the ChartCard's", cards.every((card) => card.key && card.slots[0].children[0].key && card.key !== card.slots[0].children[0].key), true);
  ok("notes: Figma draws its own sample data (Bullet), or its sample marks under the page's labels (Line), once per kind", notes.some((note) => /^LineChart: Figma's Chart\/Line-Chart draws its own sample marks \(the page's labels, axis and Tooltip are written\)/.test(note)) && notes.some((note) => /^BulletChart: Figma's Chart\/Bullet-Chart draws its own sample data/.test(note)));
  ok("no note that a chart has no Figma component", !notes.some((note) => /Chart.*no Figma component/.test(note)));
  const five = push(CHARTS.replace('{ label: "Mar", value: 1 }, { label: "Apr", value: 1 }, ', "").replace("[1, 1, 1, 1, 1, 1, 1]", "[1, 1, 1, 1, 1]"));
  check("LineChart compare, 5 points: the nearest Sector (4 or 6), with a note", [five.frame.children[1].slots[0].children[0].props.Sector, five.notes.some((note) => /5 points; Figma's Chart\/Multi-Line-Chart has 4, 6, 7 or 12 sectors \(4 drawn\)/.test(note))], ["4-Sectors", true]);
  const legend = push(CHARTS.replace('legendPosition="end"', 'legendPosition="start"').replace("<GaugeChart ", '<GaugeChart legendPosition="end" '));
  ok("legend positions Figma has no option for: the nearest, with a note", legend.notes.some((note) => /legendPosition="start": Figma's Chart\/Radial-Chart has its legend at Bottom or End \(End drawn\)/.test(note)) && legend.notes.some((note) => /legendPosition="end": Figma's Chart\/Gauge-Chart draws its legend below/.test(note)));

  // Round trip: the same charts and cards come back (data from the samples, so it is left out of the comparison).
  const { text: back, notes: backNotes } = pageFromFigma(frame, { mapping });
  const DATA = new Set(["data", "series", "compare", "values", "rows", "columns", "aria-label", "height", "label", "barLabel", "lineLabel", "value", "target", "actualLabel", "headers", "legendPosition"]);
  const charted = (text) => {
    const out = [];
    const walk = (node) => {
      if (node.name === "ChartCard") out.push({ card: Object.fromEntries(Object.entries(node.props).sort(([a], [b]) => a.localeCompare(b))) });
      else if (/Chart$|^BarList$/.test(node.name) && node.name !== "ChartCard") out.push({ chart: node.name, props: Object.fromEntries(Object.entries(node.props).filter(([name]) => !DATA.has(name) || (node.name === "DonutChart" && (name === "label" || name === "value")) || (node.name === "RadialChart" && name === "legendPosition")).sort(([a], [b]) => a.localeCompare(b))) });
      node.children.forEach((child) => child.name && walk(child));
    };
    walk(shape(text));
    return out;
  };
  check("round trip: every ChartCard and chart comes back with its header, theme and variant props", charted(back), charted(CHARTS));
  ok("round trip: the pull says the data is the Studio's sample", backNotes.some((note) => /^16 charts: the data is the Studio's sample/.test(note)));
  check("round trip: the pulled page is valid dialect", validateDialect(back), []);
  // Pushed again, the pulled page draws the same sets, variants and header (its sample data has the same shape).
  const again = push(back).frame;
  const sets = (node) => [node.set?.name?.startsWith("Chart/") ? [node.set.name, node.props.Sector ?? node.props.Orientation ?? node.props.Type ?? node.props.Legend ?? "", node.props.Title ?? ""] : null, ...[...(node.children ?? []), ...(node.slots ?? []).flatMap((slot) => slot.children)].flatMap(sets)].filter(Boolean);
  check("round trip twice: the same sets, variants and titles", sets(again), sets(frame));
}

// Line, Bar, Area, Grouped-Bar and Combo with the page's data (the user, 2026-10-23): X labels, six Y labels, the active
// Tooltip, in the page's number format; the marks stay Figma's sample shapes.
{
  const LABELLED = `// @zen-page {"format":1,"title":"Labels"}
import { Board, Screen } from "@zen-ds/react/builder";
import { AreaChart, BarChart, ComboChart, GroupedBarChart, LineChart, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Labels" device="desktop">
        <Stack gap="md">
          <LineChart aria-label="Revenue" format="currency" data={[{ label: "Apr", value: 82300 }, { label: "May", value: 91800 }, { label: "Jun", value: 88400 }, { label: "Jul", value: 94100 }, { label: "Aug", value: 97000 }, { label: "Sep", value: 105700 }]} />
          <BarChart aria-label="Hours" data={[{ label: "Mon", value: 6 }, { label: "Tue", value: 7 }, { label: "Wed", value: 8 }, { label: "Thu", value: 5 }, { label: "Fri", value: 9 }, { label: "Sat", value: 3 }, { label: "Sun", value: 2 }]} />
          <BarChart orientation="horizontal" aria-label="Capacity" data={[{ label: "Design", value: 2650 }, { label: "Engineering", value: 1990 }, { label: "Delivery", value: 750 }]} />
          <AreaChart aria-label="Billable hours" currency="EUR" series={[{ id: "h", label: "Hours" }]} data={[{ label: "Q1", values: { h: 1500 } }, { label: "Q2", values: { h: 1700 } }, { label: "Q3", values: { h: 2210 } }]} />
          <GroupedBarChart aria-label="Invoiced vs collected" series={[{ id: "a", label: "A" }, { id: "b", label: "B" }]} data={[{ label: "Apr", values: { a: 82300, b: 79500 } }, { label: "May", values: { a: 91800, b: 90100 } }, { label: "Jun", values: { a: 88400, b: 86000 } }, { label: "Jul", values: { a: 94100, b: 91700 } }, { label: "Aug", values: { a: 97000, b: 95800 } }, { label: "Sep", values: { a: 105700, b: 88300 } }]} />
          <ComboChart aria-label="Revenue and margin" barLabel="Revenue" lineLabel="Margin" format="currency" lineFormat="percent" lineMax={100} data={[{ label: "Q1", bar: 82300, line: 31 }, { label: "Q2", bar: 91800, line: 34 }, { label: "Q3", bar: 88400, line: 29 }, { label: "Q4", bar: 105700, line: 41 }]} />
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame, notes } = push(LABELLED);
  const [line, bar, hbar, area, grouped, combo] = frame.children;
  const edit = (node, ...layer) => node.edits?.find((item) => JSON.stringify(item.layer) === JSON.stringify(layer))?.characters;
  const prop = (node, path, name) => node.nested?.find((item) => item.path === path)?.props?.[name];
  check("Line: Sector labels from the data, the last period selected with its Tooltip in the page's format", [prop(line, "Sector-1", "Label"), prop(line, "Sector-6", "Select"), prop(line, "Sector-5", "Select"), prop(line, "Sector-6/Tooltip/Text", "Text")], ["Apr", "Selected Highlight", "Default", "$105.7K"]);
  check("Line: six Y labels top to bottom, formatted", [0, 5].map((i) => edit(line, ".Chart/Line-Chart/Trend", `>Label[${i}]`)), ["$125K", "$0"]);
  check("Bar (vertical): X labels on the ticks, six Y labels", [edit(bar, "X-Axis", ">Tick[0]", "Label"), edit(bar, "X-Axis", ">Tick[6]", "Label"), edit(bar, "Y-Axis", ">Label[0]"), edit(bar, "Y-Axis", ">Label[5]")], ["Mon", "Sun", "10", "0"]);
  check("Bar (vertical): the Tooltip reads the column Figma highlights (Sat in 7-Sectors)", prop(bar, "Tooltip/Text", "Text"), "3");
  ok("Bar (vertical): a note when the page's active bar is another", notes.some((note) => /Chart\/Bar-Chart highlights period 6; the page's active period is 7/.test(note)));
  const hidden = (node, ...layer) => node.edits?.find((item) => JSON.stringify(item.layer) === JSON.stringify(layer))?.visible;
  check("Bar (horizontal): category labels, values, four value-axis labels; a row past the data hidden, its value empty", [edit(hbar, "Categories", ">Category[0]", "Label"), edit(hbar, "Values", ">Value[2]", "Label"), edit(hbar, "Grid", ">Tick[3]", "Label"), hidden(hbar, "Categories", ">Category[3]"), hidden(hbar, "Bars", ">Track[3]"), edit(hbar, "Values", ">Value[3]", "Label")], ["Design", "750", "3K", false, false, ""]);
  check("Area: X ticks by Figma's sample names (Q1 …) in EUR (currency alone); the Tooltip on Figma's last period, past the data, hidden", [edit(area, "X-Axis", ">Tick[0]", ">Q1"), edit(area, "X-Axis", ">Tick[3]", ">Q4"), edit(area, "Y-Axis", ">2.5K"), prop(area, "Tooltip/Text", "Text"), area.edits.find((item) => item.layer[0] === "Tooltip-Anchor")?.visible], ["Q1", "", "\u20ac2.5K", undefined, false]);
  const fullArea = push(LABELLED.replace('{ label: "Q3", values: { h: 2210 } }]', '{ label: "Q3", values: { h: 2210 } }, { label: "Q4", values: { h: 2400 } }]')).frame.children[3];
  check("Area: four periods in 4-Sectors, the Tooltip reads the last", prop(fullArea, "Tooltip/Text", "Text"), "\u20ac2.4K");
  check("Grouped-Bar: X ticks named Apr … Sep in 6-Sectors, Y labels named $125K …", [edit(grouped, "X-Axis", ">Tick[5]", ">Sep"), edit(grouped, "Y-Axis", ">$125K"), grouped.nested?.length ?? 0], ["Sep", "125K", 0]);
  check("Combo: both axes, the line's in lineFormat on lineMax", [edit(combo, "Y-Axis", ">$125K"), edit(combo, "Y-Axis-End", ">50%"), edit(combo, "Y-Axis-End", ">0%")], ["$125K", "100%", "0%"]);
}

// Card Theme=Solid and Color (2026-10-14): written as Figma's variant, Neutral where Figma has none (a Solid hue it does
// not draw, a theme with no Color, a selected coloured card); MetricCard and ChartCard pass theme and color to the Card
// around them; the pull gives the colours back.
{
  const COLOURED = `// @zen-page {"format":1,"title":"Colour"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Card, ChartCard, LineChart, MetricCard, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Colour" device="desktop">
        <Stack>
          <Card theme="solid" color="brand"><Text>Invoiced</Text></Card>
          <Card theme="pale" color="violet" spacing="small"><Text>Design hours</Text></Card>
          <Card theme="solid" color="green"><Text>Collected</Text></Card>
          <Card theme="default" color="cyan"><Text>Outstanding</Text></Card>
          <Card theme="pale" color="orange" selected><Text>Plan</Text></Card>
          <MetricCard theme="solid" color="neutral" label="Invoiced this year" value="$798,300" />
          <ChartCard title="Revenue" theme="pale" color="cyan"><LineChart data={[{ label: "Apr", value: 1 }]} /></ChartCard>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame, notes: colourNotes } = push(COLOURED);
  const cards = [];
  const walk = (node) => { if (node.set?.name === "Card") cards.push([node.props.Theme, node.props.Color, node.props.Active ?? null]); for (const child of [...(node.children ?? []), ...(node.slots ?? []).flatMap((slot) => slot.children)]) walk(child); };
  walk(frame);
  check("card colour: Theme × Color × Active as Figma variants (Solid Green → Neutral, Default takes no Color, a selected card is Neutral)", cards, [
    ["Solid", "Brand", null], ["Pale", "Violet", null], ["Solid", "Neutral", null], ["Default", "Neutral", null], ["Pale", "Neutral", "Yes"], ["Solid", "Neutral", null], ["Pale", "Cyan", null],
  ]);
  ok("card colour: a note names the Solid hue Figma does not draw", colourNotes.some((note) => /Figma has no Solid Green/.test(note)));
  const { text: back } = pageFromFigma(frame, { mapping });
  ok("card colour round trip: Solid Brand, Pale Violet and the ChartCard's Pale Cyan come back", /<Card theme="solid" color="brand">/.test(back) && /<Card theme="pale" color="violet" spacing="small">/.test(back) && /<ChartCard title="Revenue" theme="pale" color="cyan">/.test(back));
  ok("card colour round trip: the Solid Neutral MetricCard comes back as a MetricCard", /<MetricCard [^>]*theme="solid"/.test(back));
}

// Card Surface (2026-10-14): Alt on Flat and Border, Flat on Border only; Shadow on alt goes up as Flat on Surface/Alt (the
// code draws it so), a Surface the theme does not take as Default, with notes; ChartCard passes its surface to its Card;
// a KPI MetricCard is still a Card around Metric-Inline; the pull gives the surfaces back.
{
  const SURFACED = `// @zen-page {"format":1,"title":"Surfaces"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Card, ChartCard, LineChart, MetricCard, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Surfaces" device="desktop">
        <Stack>
          <Card theme="flat-border"><Text>Hours</Text></Card>
          <Card theme="default" surface="alt"><Text>Leave</Text></Card>
          <Card theme="shadow" surface="alt"><Text>Invoices</Text></Card>
          <Card theme="flat-border" surface="alt"><Text>Clients</Text></Card>
          <Card theme="pale" color="green" surface="alt"><Text>Budget</Text></Card>
          <ChartCard title="Revenue" theme="border" surface="alt"><LineChart data={[{ label: "Apr", value: 1 }]} /></ChartCard>
          <MetricCard label="Collected" value="$275,800" />
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame, notes: surfaceNotes } = push(SURFACED);
  const cards = [];
  const walk = (node) => { if (node.set?.name === "Card") cards.push([node.props.Theme, node.props.Surface ?? null, node.slots?.[0]?.children?.[0]?.set?.name ?? null]); for (const child of [...(node.children ?? []), ...(node.slots ?? []).flatMap((slot) => slot.children)]) walk(child); };
  walk(frame);
  check("card surface: Theme × Surface as Figma variants (Shadow on Alt → Default, Flat-Border on Alt → Default, Pale on Alt → Default); the KPI MetricCard a Card around Metric-Inline", cards.map(([theme, surface, inner]) => [theme, surface, inner && /Metric-Inline/.test(inner) ? "Metric-Inline" : null]), [
    ["Flat-Border", null, null], ["Default", "Alt", null], ["Default", "Alt", null], ["Flat-Border", "Default", null], ["Pale", "Default", null], ["Border", "Alt", null], ["Shadow", null, "Metric-Inline"],
  ]);
  ok("card surface: notes name Shadow on Alt and the surfaces a theme does not take", surfaceNotes.some((note) => /Shadow on Surface\/Alt draws as Default/.test(note)) && surfaceNotes.some((note) => /no Flat-Border card on Surface Alt/.test(note)) && surfaceNotes.some((note) => /no Pale card on Surface Alt/.test(note)));
  const { text: back } = pageFromFigma(frame, { mapping });
  ok("card surface round trip: Flat-Border, Default on Alt and the ChartCard's Border on Alt come back", /<Card theme="flat-border">/.test(back) && /<Card theme="default" surface="alt">/.test(back) && /<ChartCard title="Revenue" theme="border" surface="alt">/.test(back));
  ok("card surface round trip: the KPI MetricCard comes back", /<MetricCard [^>]*label="Collected"/.test(back));
}

// MetricCard type (metric-types, 2026-10-14; figma-metric.mjs): a typed MetricCard is Figma's Metric-Card of that Type
// (6643:64008) — its title and number, trend, Card Theme / Color / Sub-Action, Comparison's three columns, the Hero's
// button words, and the marks from the page's data in its slot content (line and area, bar shares, the goal's
// Progress-Bar, the footer under them). The pull gives the type, texts and Card back and takes the marks' data from the
// Studio palette's widget of that type; a fresh Figma Hero (Solid Brand, its fill overridden Pale) is the code's
// Hero default. A KPI MetricCard keeps its Card + Metric-Inline push.
{
  const TYPED = `// @zen-page {"format":1,"title":"Metric types"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Button, MetricCard, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Metric types" device="desktop">
        <Stack gap="md">
          <MetricCard theme="default" type="sparkline" label="Revenue" value="$105,700" trend={{ direction: "positive", label: "+9% vs. August" }} series={[1, 2, 3]} />
          <MetricCard type="comparison" label="Cash flow · October" comparison={[{ id: "in", label: "Invoiced", value: "$98,100", trend: { direction: "negative", label: "−7% vs. September" } }, { id: "out", label: "Collected", value: "$91,000" }]} />
          <MetricCard type="hero" theme="solid" color="neutral" label="Invoiced this year" value="$798,300" series={[1, 2]} footer={<Button size="sm" appearance="overlay" level="inverse">Open report</Button>} />
          <MetricCard theme="default" label="Billable hours" value="5,900 h" />
          <MetricCard type="spark-bars" label="Awaiting approval" value="$6,340" series={[2, 0, 4]} />
          <MetricCard type="goal-progress" label="October budget" value="$26,480" goal={{ value: 26480, target: 72000, label: "of $72,000 budget", valueLabel: "37%" }} footer={<Text textStyle="Body/Small/Regular" tone="base">On pace for $51,300 by Oct 31</Text>} />
          <MetricCard type="goal-progress" label="Q4 revenue" value="$108,400" goal={{ value: 108400, target: 135000 }} />
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame, notes: typedNotes } = push(TYPED);
  const found = [];
  const walk = (node) => { if (node.set?.name === "Metric-Card" || node.set?.name === "Card") found.push(node); else [...(node.children ?? []), ...(node.slots ?? []).flatMap((slot) => slot.children)].forEach(walk); };
  walk(frame);
  const [spark, compare, hero, kpi, bars, goal, goalDefault] = found;
  check("metric type: a typed MetricCard is one Metric-Card instance of its Type; KPI stays a Card", found.map((node) => [node.set.name, node.props.Type ?? node.props.Theme]), [["Metric-Card", "Sparkline"], ["Metric-Card", "Comparison"], ["Metric-Card", "Hero"], ["Card", "Default"], ["Metric-Card", "Spark-Bars"], ["Metric-Card", "Goal-Progress"], ["Metric-Card", "Goal-Progress"]]);
  // MetricMarks.tsx in the slot content (the Expenses import, 2026-10-16: Figma's sample marks): the line 4px inside the
  // 64px frame (min at 60, max at 4), its area closed at the bottom; no footer drops an earlier one.
  check("metric marks: Sparkline's line and area from its series, in the code's 100 × 64 box", spark.edits, [
    { layer: "Sparkline/Line", vector: { d: "M 0 60 L 50 32 L 100 4", w: 100, h: 64 } },
    { layer: "Sparkline/Area", vector: { d: "M 0 60 L 50 32 L 100 4 L 100 64 L 0 64 Z", w: 100, h: 64 } },
    { layer: "Metric-Body", append: [] },
  ]);
  check("metric marks: Spark-Bars right-aligned shares of the largest, the first bars hidden, the last one current", [bars.edits.slice(0, 2), bars.edits.slice(9)], [
    [{ layer: "Spark-Bars/Bar[0]", visible: false }, { layer: "Spark-Bars/Bar[1]", visible: false }],
    [{ layer: "Spark-Bars/Bar[9]", visible: true, share: 0.5 }, { layer: "Spark-Bars/Bar[10]", visible: true, share: 0 }, { layer: "Spark-Bars/Bar-Active", share: 1 }, { layer: "Metric-Body", append: [] }],
  ]);
  check("metric marks: the goal's Progress-Bar (label, value text, nearest step: 37% → Medium 40%)", goal.nested.find((entry) => entry.path === "Progress-Bar"), { path: "Progress-Bar", props: { Text: "of $72,000 budget", Progress: "Medium" }, texts: { Value: "37%" } });
  check("metric marks: a goal without words takes the code's (of 135K goal, 80%)", goalDefault.nested.find((entry) => entry.path === "Progress-Bar"), { path: "Progress-Bar", props: { Text: "of 135K goal", Progress: "Good" }, texts: { Value: "80%" } });
  check("metric marks: the goal's exact fill, then the footer under the drawing, across the card", goal.edits.map((edit) => [edit.layer, edit.columns?.map(Math.round), edit.append?.map((layer) => [layer.type, layer.characters, layer.textStyle, layer.fillW])]), [["Progress-Bar/Container", [37, 63], undefined], ["Metric-Body", undefined, [["TEXT", "On pace for $51,300 by Oct 31", "Body/Small/Regular", true]]]]);
  check("metric type: Sparkline's title, number, trend and Card (Default, no ⋮)", [spark.texts, spark.nested], [{ Label: "Revenue", "Metric-Number": "$105,700" }, [{ path: "Card", props: { "Sub-Action": false, Theme: "Default" } }, { path: "Title-Highlight", props: { Trend: true } }, { path: "Title-Highlight/Trend", props: { Trend: "Positive" }, textList: ["+9% vs. August"] }]]);
  check("metric type: Comparison's title and its columns (one without a trend), the variant's Shadow left alone", [compare.texts, compare.nested], [{ "Cash flow · September": "Cash flow · October" }, [
    { path: "Card", props: { "Sub-Action": false } },
    { path: "Title-Highlight[0]", props: { Trend: true }, texts: { Label: "Invoiced", "Metric-Number": "$98,100" } }, { path: "Title-Highlight[0]/Trend", props: { Trend: "Negative" }, textList: ["−7% vs. September"] },
    { path: "Title-Highlight[1]", props: { Trend: false }, texts: { Label: "Collected", "Metric-Number": "$91,000" } },
  ]]);
  check("metric type: the dark Hero's Card (Solid Neutral) and its button words", [hero.nested.find((entry) => entry.path === "Card").props, hero.nested.find((entry) => entry.path === "Button/Main")], [{ "Sub-Action": false, Theme: "Solid", Color: "Neutral" }, { path: "Button/Main", textList: ["Open report"] }]);
  ok("metric type: notes say Figma keeps three comparison columns, and no sample marks where the page has data", !typedNotes.some((note) => /draws its own sample/.test(note)) && typedNotes.some((note) => /2 comparison columns; Figma's Comparison draws 3/.test(note)));
  ok("metric type: KPI keeps its Metric-Inline", kpi.slots?.[0]?.children?.[0]?.set?.name === "Primitives/Metric/Metric-Inline/Icon-Highlight");
  const { text: back } = pageFromFigma(frame, { mapping });
  ok("metric type round trip: Sparkline comes back typed, its texts, trend and theme, its series the Studio sample's", /<MetricCard theme="default" type="sparkline" label="Revenue" value="\$105,700" trend=\{\{ direction: "positive", label: "\+9% vs\. August" \}\} series=\{\[71200,/.test(back));
  ok("metric type round trip: Comparison's columns come back from Figma's texts", /<MetricCard type="comparison" label="Cash flow · October" comparison=\{\[\{ id: "invoiced", label: "Invoiced", value: "\$98,100", trend: \{ direction: "negative", label: "−7% vs\. September" \} \}, \{ id: "collected", label: "Collected", value: "\$91,000" \}\]\} \/>/.test(back));
  ok("metric type round trip: the dark Hero keeps Solid Neutral and its button words", /<MetricCard theme="solid" color="neutral" type="hero"[^]*?footer=\{<Button[^>]*>Open report<\/Button>\}/.test(back));
  // A fresh Hero placed in Figma: its Card is Solid Brand (fill overridden to Brand Pale) with ⋮ on — the code's default Hero.
  const fresh = { type: "FRAME", name: "Board", layout: { mode: "VERTICAL", gap: 0, padding: [0, 0, 0, 0], counter: "MIN", primary: "MIN" }, children: [{ type: "INSTANCE", name: "Metric-Card", set: { id: "6643:64008", name: "Metric-Card" }, props: { Type: "Hero" }, texts: { Label: "Invoiced this year", "Metric-Number": "$798,300" }, nested: [{ path: "Card", props: { Theme: "Solid", Color: "Brand", "Sub-Action": true } }, { path: "Title-Highlight", props: { Trend: false } }, { path: "Button", textList: ["View report"] }] }] };
  const { text: freshBack, notes: freshNotes } = pageFromFigma(fresh, { mapping });
  ok("metric type pull: Figma's own Hero is the code's default Hero (no theme or color written)", /<MetricCard type="hero" subAction=\{\{ label: "More actions" \}\} label="Invoiced this year" value="\$798,300" series=/.test(freshBack) && !/<MetricCard type="hero"[^>]*theme=/.test(freshBack));
  ok("metric type pull: Figma's ⋮ on is the MetricCard's subAction (the built-in label), not a note", freshBack.includes('subAction={{ label: "More actions" }}') && !freshNotes.some((note) => /Sub-Action shows in Figma/.test(note)));
}

// MetricCard type="tile" (2026-10-17): Figma Metric-Card Type=Tile, its Metric-Tile's own TEXT properties, Size, Trend and
// icon, and a Content that follows the card's fill (Inverse on Solid Neutral, On-Bright on Yellow, Default on Shadow).
{
  const TILES = `// @zen-page {"format":1,"title":"Tiles"}
import { Board, Screen } from "@zen-ds/react/builder";
import { MetricCard, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Tiles" device="mobile">
        <Stack gap="md">
          <MetricCard theme="solid" color="neutral" type="tile" label="Success rate" value="56%" trend={{ direction: "positive", label: "+24% vs. last year" }} />
          <MetricCard theme="solid" color="yellow" type="tile" label="Protein" value="92 g" size="sm" icon={false} />
          <MetricCard type="tile" label="Clients" value="1,284" icon="icon-clock-line" />
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame } = push(TILES);
  const found = [];
  const walk = (node) => { if (node.set?.name === "Metric-Card") found.push(node); else [...(node.children ?? []), ...(node.slots ?? []).flatMap((slot) => slot.children)].forEach(walk); };
  walk(frame);
  check("metric tile: Type=Tile, the Metric-Tile's texts, Size, toggles and the card's Content, its trend and icon", found.map((node) => [node.props.Type, node.nested]), [
    ["Tile", [{ path: "Card", props: { "Sub-Action": false, Theme: "Solid", Color: "Neutral" } }, { path: "Metric-Tile", props: { Trend: true, "Dock-Icon": true, "Metric-Title": "Success rate", "Metric-Number": "56%", Content: "Inverse" } }, { path: "Metric-Tile/Trend", props: { Trend: "Positive" }, textList: ["+24% vs. last year"] }]],
    ["Tile", [{ path: "Card", props: { "Sub-Action": false, Theme: "Solid", Color: "Yellow" } }, { path: "Metric-Tile", props: { Trend: false, "Dock-Icon": false, "Metric-Title": "Protein", "Metric-Number": "92 g", Size: "Small", Content: "On-Bright" } }]],
    ["Tile", [{ path: "Card", props: { "Sub-Action": false } }, { path: "Metric-Tile", props: { Trend: false, "Dock-Icon": true, "Metric-Title": "Clients", "Metric-Number": "1,284" } }, { path: "Metric-Tile/Metric-Icon", props: { "Icon-Src": "icon-clock-line" } }]],
  ]);
  const { text: back } = pageFromFigma(frame, { mapping });
  ok("metric tile round trip: the Solid Neutral tile, its texts and trend", /<MetricCard theme="solid" color="neutral" type="tile" label="Success rate" value="56%" trend=\{\{ direction: "positive", label: "\+24% vs\. last year" \}\} \/>/.test(back));
  ok("metric tile round trip: the Small Yellow tile without its icon", /<MetricCard theme="solid" color="yellow" type="tile" label="Protein" value="92 g" size="sm" icon=\{false\} \/>/.test(back));
  ok("metric tile round trip: the Shadow tile and its icon", /<MetricCard type="tile" label="Clients" value="1,284" icon="icon-clock-line" \/>/.test(back));
}

// The Expenses import (2026-10-16): a sidebar row's counter, the top bar's Search at the bar's width (400 at most), a
// stacked ProgressBar's value text and Pagination's range and page size, where Figma kept its own.
{
  const PAGE = `// @zen-page {"format":1,"title":"Expenses"}
import { Board, Screen } from "@zen-ds/react/builder";
import { AppShell, AppShellHeader, Pagination, ProgressBar, Search, Sidebar, SidebarMenuItem, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Expenses" device="desktop">
        <AppShell header={<AppShellHeader leading={<Search aria-label="Search" placeholder="Search expenses, merchants or people" />} />} sidebar={<Sidebar aria-label="Main" selectedId="approvals"><SidebarMenuItem id="home" label="Overview" icon="icon-home-03-line" /><SidebarMenuItem id="approvals" label="Approvals" icon="icon-check-circle-line" counter="12" /></Sidebar>}>
          <Stack gap="md">
            <ProgressBar layout="stacked" theme="accent" value={38} label="Engineering" valueLabel="$9,120 of $24,000" />
            <ProgressBar layout="stacked" theme="accent" value={9} label="Operations" />
            <Pagination theme="inline" total={86} defaultPageSize={10} pageSizeOptions={[10, 25, 50]} aria-label="Expense pages" />
          </Stack>
        </AppShell>
      </Screen>
    </Board>
  );
}
`;
  const { frame } = push(PAGE);
  const all = [];
  const walk = (node) => { all.push(node); [...(node.children ?? []), ...(node.slots ?? []).flatMap((slot) => slot.children)].forEach(walk); };
  walk(frame);
  const row = (name) => all.find((node) => node.name === name && node.set?.name === "Primitives/Side-Bar/Menu-Item/Master");
  check("sidebar counter: Counter on with its number; none off", [row("Approvals").props.Counter, row("Approvals").nested, row("Overview").props.Counter], [true, [{ path: "Counter", props: {}, text: "12" }], false]);
  const search = all.find((node) => /^Search\//.test(node.set?.name ?? ""));
  check("top bar Search: fills the bar up to 400px", [search.fillW, search.maxW], [true, 400]);
  const bars = all.filter((node) => node.set?.name === "Progress-Bar");
  check("stacked ProgressBar: its value text (valueLabel, else the percentage), the nearest step and the exact fill (Container's columns)", bars.map((node) => [node.props.Text, node.props.Progress, node.texts?.Value, node.edits]), [["Engineering", "Medium", "$9,120 of $24,000", [{ layer: "Container", columns: [38, 62] }]], ["Operations", "Low", "9%", [{ layer: "Container", columns: [9, 91] }]]]);
  const pages = all.find((node) => node.name === "Expense pages");
  check("Pagination Inline: the range and the page size as the code counts them", [pages.textList, pages.nested], [["1–10 of 86 results"], [{ path: "Page-Size", props: {}, text: "10 results" }]]);
}

// A component of a set size in a column that stretches (Stack's default) hugs in Figma, as CSS passes it by; a Button
// still fills (a Large Dock-Icon in a Card came out 520px wide and tall in Figma, 2026-10-16).
{
  const page = `// @zen-page {"format":1,"title":"Sized"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Button, DockIcon, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Sized" device="desktop">
        <Stack gap="md">
          <DockIcon size="large" icon="icon-book-open-solid" />
          <Button>Open</Button>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame } = push(page);
  const dock = find(frame, (node) => node.set?.name === "Dock-Icon");
  const button = find(frame, (node) => node.set?.name === "Button/Main");
  check("a Dock-Icon in a stretching column hugs; a Button fills", [Boolean(dock?.fillW), Boolean(button?.fillW)], [false, true]);
  // A centred Stack around a long text (a hero tagline) fills its column, so the text wraps at the column's width, not at
  // a sliver; a Box with a surface around the same text keeps hugging.
  const hero = (inner) => page.replace("<DockIcon size=\"large\" icon=\"icon-book-open-solid\" />\n          <Button>Open</Button>", inner).replace("<Stack gap=\"md\">", "<Stack gap=\"md\" align=\"center\">").replace("import { Button, DockIcon, Stack }", "import { Box, Stack, Text }");
  const tagline = find(push(hero("<Stack gap=\"3xl\" align=\"center\"><Text align=\"center\">Zen is a comprehensive set of components, guidelines and code.</Text></Stack>")).frame, (node) => node.type === "FRAME" && node.layout?.gap === 48);
  const boxed = find(push(hero("<Box surface=\"subtle\"><Text>Zen is a comprehensive set of components.</Text></Box>")).frame, (node) => node.type === "FRAME" && node.fill);
  check("a plain Stack around wrapping text fills a centred column; a Box with a surface hugs", [Boolean(tagline?.fillW), Boolean(boxed?.fillW)], [true, false]);
}

// Charts draw the page's data (the Expenses import, part B, 2026-10-17): Stack-Bar's Sector holds every period, each
// column's segments are Flex rows of the axis (Chart.tsx niceScale: 46.3K → 0 … 50K), the active period's label and
// tooltip, six axis labels, the legend; Donut's slices and pills in its Ring-Slot, its total, Legend=End.
{
  const PAGE = `// @zen-page {"format":1,"title":"Charts"}
import { Board, Screen } from "@zen-ds/react/builder";
import { ChartCard, DonutChart, StackBarChart, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Charts" device="desktop">
        <Stack gap="md">
          <ChartCard title="Spend by month">
            <StackBarChart initialIndex={4} aria-label="Spend" series={[{ id: "a", label: "Travel" }, { id: "b", label: "Software" }]} data={[{ label: "Apr", values: { a: 10000, b: 5000 } }, { label: "May", values: { a: 12000, b: 0 } }, { label: "Jun", values: { a: 9000, b: 8000 } }, { label: "Jul", values: { a: 20000, b: 6000 } }, { label: "Aug", values: { a: 30000, b: 16300 } }]} />
          </ChartCard>
          <ChartCard title="Spend by category">
            <DonutChart size="large" legendPosition="end" aria-label="Category" data={[{ id: "a", label: "Travel", value: 75 }, { id: "b", label: "Software", value: 25 }]} />
          </ChartCard>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame, notes } = push(PAGE);
  const all = [];
  const walk = (node) => { all.push(node); [...(node.children ?? []), ...(node.slots ?? []).flatMap((slot) => slot.children)].forEach(walk); };
  walk(frame);
  const bar = all.find((node) => node.set?.name === "Chart/Stack-Bar-Chart");
  const donut = all.find((node) => node.set?.name === "Chart/Donut-Chart");
  check("stack-bar: 5 periods take the 6-Sectors variant", bar.props.Sector, "6-Sectors");
  const columns = bar.slots.filter((slot) => slot.name === "Value");
  check("stack-bar: one Value slot per column, by its column", columns.map((slot) => slot.within[0]), Array.from({ length: 6 }, (_, k) => `.Primitives/Chart/Column/Stack-Bar/Single[${k}]`));
  const aug = columns[4].children[0];
  const augBar = aug.children[0];
  check("stack-bar: a column is Flex rows of the axis (rest, then the bar); the bar's series are its Flex rows top to bottom, painted by style", [aug.layout.grid.rowSizes.map((size) => Math.round(size.value * 10) / 10), augBar.cell.row, augBar.layout.grid.rowSizes.map((size) => Math.round(size.value * 10) / 10), augBar.children.map((segment) => [segment.name, segment.fillStyle, segment.cell.row])], [[7.4, 92.6], 1, [35.2, 64.8], [["Software", "Color Chart Sector/Secondary", 0], ["Travel", "Color Chart Sector/Primary", 1]]]);
  check("stack-bar: the bar rounds (Corner-Radius/Small) and clips its series, as chart.css .zen-chart__stack; the slot's corners sit on the empty top", [augBar.name, augBar.radius, augBar.radiusVar, augBar.clip], ["Stack", 8, "Corner-Radius/Small", true]);
  check("stack-bar: a zero value draws no segment; the column past the data is empty", [columns[1].children[0].children[0].children.length, columns[5].children[0].children.length, columns[5].children[0].layout.grid.rowSizes.map((size) => size.value)], [1, 0, [100]]);
  const sectors = bar.nested.filter((entry) => /^Sector-/.test(entry.path));
  check("stack-bar: period labels, the active period selected with its tooltip", [sectors.slice(3, 6).map((entry) => [entry.path, entry.props.Label, entry.props.Select, entry.props.Tooltip]), sectors[sectors.length - 1]], [[["Sector-4", "Jul", "Default", false], ["Sector-5", "Aug", "Selected", true], ["Sector-6", "", "Default", false]], { path: "Sector-5/Tooltip/Text", props: { Text: "46.3K" } }]);
  check("stack-bar: six axis labels, top to bottom", bar.edits.filter((edit) => edit.characters && edit.layer[1].startsWith(">Label")).map((edit) => edit.characters), ["50K", "40K", "30K", "20K", "10K", "0"]);
  check("stack-bar: the legend names the series, the rest hidden", bar.edits.filter((edit) => edit.layer[0] === "Legend").slice(0, 5).map((edit) => edit.visible ?? edit.characters), [true, "Travel", true, "Software", false]);
  check("donut: Legend=End, its total from the data", [donut.props.Legend, donut.props.Size, donut.props["Total Value"], donut.props["Total Label"]], ["End", "Large", "100", "Total"]);
  const ring = donut.slots.find((slot) => slot.name === "Ring-Slot").children;
  const round2 = (place) => Object.fromEntries(Object.entries(place).map(([name, value]) => [name, typeof value === "number" ? Math.round(value * 100) / 100 : value]));
  check("donut: slices as styled paths over the slot, then a pill per slice of 6% and up at the ring's middle", ring.map((node) => [node.type, node.fillStyle ?? node.children?.[0]?.characters, round2(node.place)]), [["VECTOR", "Color Chart Sector/Primary", { x: 0, y: 0, w: 1, h: 1 }], ["VECTOR", "Color Chart Sector/Secondary", { x: 0, y: 0, w: 1, h: 1 }], ["FRAME", "75%", { x: 0.78, y: 0.78, center: true }], ["FRAME", "25%", { x: 0.22, y: 0.22, center: true }]]);
  ok("donut: a slice path has no arcs (cubic Béziers), corners rounded by a stroke of its style", ring[0].d.startsWith("M ") && !/A/.test(ring[0].d) && /C /.test(ring[0].d) && ring[0].strokeStyle === ring[0].fillStyle && ring[0].strokeWeight === 8);
  check("donut: the legend's items by instance, the rest hidden", [donut.nested.filter((entry) => /^Legend-Item/.test(entry.path)).map((entry) => entry.props.Label), donut.edits.filter((edit) => edit.visible === false).length], [["Travel", "Software"], 5]);
  ok("charts with data drawn say nothing about Figma's sample", !notes.some((note) => /StackBarChart|DonutChart/.test(note) && /sample data/.test(note)));
}

// The page margins as padding (ZenMargin, user 2026-10-17): a frame bound to Margin-Comfortable comes down as
// padding="margin-comfortable" and goes up bound to it again, at the px of the Screen's device (24 desktop, 20 phone).
{
  const marginFrame = (width, px, variable) => ({ type: "FRAME", name: "Body", width, height: 600, layout: { mode: "VERTICAL", gap: 16, gapVar: "Spacing/Gap/Medium", padding: [px, px, px, px], paddingVar: variable, primary: "MIN", counter: "MIN", wrap: false }, children: [{ type: "TEXT", name: "Title", characters: "Body", textStyle: "Heading/3" }] });
  for (const [width, device, comfortable, compact] of [[1440, "desktop", 24, 20], [390, "phone", 20, 16]]) {
    for (const [key, variable, px] of [["margin-comfortable", "Margin-Comfortable", comfortable], ["margin-compact", "Margin-Compact", compact]]) {
      const page = pageFromFigma(marginFrame(width, px, variable), { mapping }).text;
      ok(`margin: ${variable} comes down as padding="${key}" (${device})`, page.includes(`padding="${key}"`));
      const { frame } = push(page);
      check(`margin: padding="${key}" goes up bound to ${variable} at ${px}px (${device})`, { paddingVar: frame.layout.paddingVar, padding: frame.layout.padding }, { paddingVar: variable, padding: [px, px, px, px] });
    }
  }
  // The px table against the tokens: Breakpoint & Grids → Spacing/Padding → Global Dimensions.
  const source = (file) => Object.values(JSON.parse(fs.readFileSync(new URL(`../../tokens/source/figma/${file}`, import.meta.url), "utf8")))[0].tokens;
  const all = new Map([...source("breakpoint-grids.json"), ...source("spacing.json"), ...source("global-dimensions.json")].map((token) => [token.name, token]));
  const resolve = (value, mode) => { const alias = /^\{(.+)\}$/.exec(String(value))?.[1]; if (!alias) return value; const token = all.get(alias); return resolve(token.valuesByMode[mode] ?? Object.values(token.valuesByMode)[0], mode); };
  const { MARGIN_PX, MARGIN_VARIABLE } = await import("./figma-steps.mjs");
  for (const [key, name] of Object.entries(MARGIN_VARIABLE)) {
    const token = all.get(name);
    check(`margin: ${name} px by device match the tokens`, MARGIN_PX[key], { desktop: resolve(token.valuesByMode.Desktop, "Desktop"), tablet: resolve(token.valuesByMode.Tablet, "Tablet"), phone: resolve(token.valuesByMode.Mobile, "Mobile") });
  }
}

// F6b. Mixed styles (TextRun, Figma's styled segments; text-runs.mjs): a Text's styled words go up as segments of its
//      TEXT layer (bold as the text style's Bold sibling, a tone as its Color/Content variable) and come back as the
//      same TextRuns; Figma's own ⌘B (a Bold font, no text style) and a non-Zen style come down as bold and a note.
{
  const runsPage = `// @zen-page {"format":1,"title":"Runs"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Heading, Stack, Text, TextRun } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Runs" device="desktop">
        <Stack gap="lg">
          <Text>Renews on <TextRun bold>Nov 2</TextRun>. <TextRun tone="negative-base" underline>2 seats</TextRun> are <TextRun italic>unpaid</TextRun>.</Text>
          <Heading level={2}>Plan <TextRun bold>Pro</TextRun></Heading>
          <Text>Plain words</Text>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame } = push(runsPage);
  const [renews, heading, plainText] = frame.children;
  check("TextRun: segments of the TEXT layer, bold as Body/Base/Bold, tone as its variable", renews.segments, [
    { start: 10, end: 15, textStyle: "Body/Base/Bold" },
    { start: 17, end: 24, decoration: "UNDERLINE", fill: "Content/Negative/Base" },
    { start: 29, end: 35, italic: true },
  ]);
  check("TextRun: a Heading's style has no Bold sibling: the font's Bold", heading.segments, [{ start: 5, end: 8, bold: true }]);
  check("TextRun: a plain Text has no segments", plainText.segments, undefined);
  check("TextRun round trip: the same runs come back", shape(pageFromFigma(frame, { mapping }).text), shape(runsPage));
  const figmaBold = { type: "FRAME", name: "Runs", width: 1440, layout: { mode: "VERTICAL", gap: 16, padding: [0, 0, 0, 0] }, children: [
    { type: "TEXT", characters: "Due Nov 2 in Mono", textStyle: "Body/Base/Regular", segments: [{ start: 4, end: 9, bold: true }, { start: 13, end: 17, textStyle: "Brand/Mono" }] },
  ] };
  const pulled = pageFromFigma(figmaBold, { mapping });
  ok("Figma ⌘B (a Bold font) comes down as TextRun bold", pulled.text.includes("Due <TextRun bold>Nov 2</TextRun>"));
  const { compileReact } = await import("./compile.mjs");
  const exported = compileReact(runsPage, { file: "runs.zen.tsx" }).code;
  ok("TextRun: the React export writes the runs on one line, as the page does", exported.includes('<Text>Renews on <TextRun bold>Nov 2</TextRun>. <TextRun tone="negative-base" underline>2 seats</TextRun> are <TextRun italic>unpaid</TextRun>.</Text>') && /import \{[^}]*\bTextRun\b[^}]*\} from "@zen-ds\/react"/.test(exported));
  ok("a range in a style Zen has not: its words stay, with a note", pulled.text.includes("in Mono") && !pulled.text.includes("Brand/Mono") && pulled.notes.some((note) => /"Brand\/Mono" on "Mono"/.test(note)));
}

// F8. Image fills (figma-image.mjs): a Shape's and a frame's picture go up as `imageFill` (Crop in fractions, Tile's
//      scale) with the picture's bytes asked for in `images`; a Shape with a picture has no colour unless it is given.
{
  const picturesPage = `// @zen-page {"format":1,"title":"Pictures"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Box, Shape, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Pictures" device="desktop">
        <Stack gap="lg">
          <Shape image="zen-asset:bridge-1a2b3c4d.webp" imageFit="crop" imageCrop={{ x: 10, y: 0, width: 80, height: 100 }} label="Bridge" width={200} height={100} />
          <Shape type="ellipse" image="zen-media:site-cafe" fill="neutral-subtle" imageFit="fit" width={80} height={80} />
          <Box image="zen-media:site-cafe" imageFit="tile" imageScale={50} width={300} height={120} />
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame, images } = push(picturesPage);
  const [bridge, cafe, tiled] = frame.children;
  check("image fill: a cropped Shape", [bridge.imageFill, bridge.fill], [{ src: "zen-asset:bridge-1a2b3c4d.webp", scaleMode: "CROP", crop: { x: 0.1, y: 0, width: 0.8, height: 1 } }, undefined]);
  check("image fill: Fit over a given colour", [cafe.imageFill?.scaleMode, Boolean(cafe.fill)], ["FIT", true]);
  check("image fill: a frame's tile", tiled.imageFill, { src: "zen-media:site-cafe", scaleMode: "TILE", scale: 0.5 });
  check("image fill: the pictures' bytes are asked for", [...(images ?? [])].sort(), ["zen-asset:bridge-1a2b3c4d.webp", "zen-media:site-cafe"]);
}

// Gradient fills (figma-gradient.mjs): a Shape's and a frame's gradient go up as `gradientFill` (Figma's type, the CSS
// angle, stops on their colour variables); a Shape with one has no colour unless it is given.
{
  const gradientsPage = `// @zen-page {"format":1,"title":"Gradients"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Box, Shape, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Gradients" device="desktop">
        <Stack gap="lg">
          <Shape gradient={{ type: "linear", angle: 45, stops: [{ color: "accent-solid", at: 0 }, { color: "info-solid", at: 100 }] }} width={200} height={100} />
          <Shape type="ellipse" fill="neutral-subtle" gradient={{ type: "diamond", stops: [{ color: "accent-solid", at: 20 }, { color: "no-such", at: 50 }, { color: "info-solid", at: 100 }] }} width={80} height={80} />
          <Box gradient={{ type: "angular", angle: 180, stops: [{ color: "accent-solid", at: 0 }, { color: "info-solid", at: 100 }] }} width={300} height={120} />
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame } = push(gradientsPage);
  const [linear, diamond, angular] = frame.children;
  const stops = [{ position: 0, color: "Color/Background/Accent/Solid/Default" }, { position: 1, color: "Color/Background/Info/Solid/Default" }];
  check("gradient: a Shape's linear, no colour", [linear.gradientFill, linear.fill], [{ type: "GRADIENT_LINEAR", angle: 45, stops }, undefined]);
  check("gradient: a diamond over a given colour; an unknown stop left out", [diamond.gradientFill, Boolean(diamond.fill)], [{ type: "GRADIENT_DIAMOND", stops: [{ position: 0.2, color: stops[0].color }, stops[1]] }, true]);
  check("gradient: a frame's angular", angular.gradientFill, { type: "GRADIENT_ANGULAR", angle: 180, stops });
}

// F4 fix (A found it in the live Zen file, 2026-10-19): a free frame (a Box of a px size whose layers all float) is
// Figma's frame without auto layout, layoutMode NONE; pulled back it is the same Box, its layers at their X / Y.
{
  const freePage = `// @zen-page {"format":1,"title":"Free"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Box, Shape, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Free" device="desktop">
        <Stack>
          <Box width={560} height={240} surface="surface">
            <Shape type="rectangle" position="absolute" insetLeft={20} insetTop={30} width={80} height={60} />
            <Box position="absolute" insetLeft={140} insetTop={40}><Text wrap={false}>Label</Text></Box>
          </Box>
          <Box width={200} height={120} />
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame } = push(freePage);
  const [free, empty] = frame.children;
  check("free frame: layoutMode NONE with its px size", [free.layout?.mode, free.fixedWidth, free.fixedHeight, empty.layout?.mode], ["NONE", 560, 240, "NONE"]);
  // The pull reads it as figmaReadCode does: no layout, its size, every layer at its X / Y.
  const read = { type: "FRAME", name: "Free", width: 1440, layout: { mode: "VERTICAL", gap: 0, padding: [0, 0, 0, 0] }, children: [
    { type: "FRAME", name: "Box", layout: null, fixed: { w: 560, h: 240 }, fill: "Color/Background/Surface/Default", children: [
      { type: "RECTANGLE", name: "Rectangle", shape: { w: 80, h: 60, fill: "Color/Background/Support/Neutral/Soft", stroke: null, strokeWeight: 1, rotation: 0, opacity: 1 }, absolute: { x: 20, y: 30, w: 80, h: 60, pw: 560, ph: 240, cx: "MIN", cy: "MIN", free: true } },
      { type: "TEXT", characters: "Label", textStyle: "Body/Base/Regular", absolute: { x: 140, y: 40, w: 40, h: 20, pw: 560, ph: 240, cx: "MIN", cy: "MIN", free: true } },
    ] },
  ] };
  const back = pageFromFigma(read, { mapping }).text;
  ok("free frame pulled: a Box of its size, the shape at its px X / Y, the text in a float Box at its px X / Y",
    /<Box width=\{560\} height=\{240\} surface="surface">/.test(back) && /<Shape [^>]*position="absolute" insetLeft=\{20\} insetTop=\{30\}/.test(back) && /<Box position="absolute" insetLeft=\{140\} insetTop=\{40\}>\s*<Text[^>]*>Label<\/Text>/.test(back) && !/no auto layout/.test(pageFromFigma(read, { mapping }).notes.join(" ")));
}

// 2026-10-21: BadgeStatus is Figma's Badge-Status; a PropertyField is Input/Property-Field whose nested Value
// (.Primitives/Input/Property-Value) takes the cell's Type, State and content (figma-property.mjs), and comes back.
const PROPERTIES = `// @zen-page {"format":1,"title":"Task"}
import { Board, Screen } from "@zen-ds/react/builder";
import { BadgeStatus, PropertyDate, PropertyField, PropertyPeople, PropertySelect, PropertyStatus, PropertyTags, PropertyText, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Task" device="desktop">
        <Stack gap="2xs" align="stretch">
          <BadgeStatus status="in-review" size="sm" />
          <PropertyField label="Status" icon="icon-loading-02-line"><PropertyStatus defaultValue="done" /></PropertyField>
          <PropertyField label="Priority" icon="icon-flag-01-line"><PropertySelect defaultValue="urgent" options={[{ value: "urgent", label: "Urgent", icon: "icon-flag-01-solid", tone: "negative" }]} /></PropertyField>
          <PropertyField label="Start Date" icon="icon-calendar-line"><PropertyDate /></PropertyField>
          <PropertyField label="Due Date" icon="icon-calendar-line"><PropertyDate defaultValue="2026-06-07" /></PropertyField>
          <PropertyField label="Assignee" icon="icon-users-plus-line" action={{ label: "Add" }}><PropertyPeople defaultValue={["alex"]} options={[{ value: "alex", label: "Alex Duong" }]} /></PropertyField>
          <PropertyField label="Labels" icon="icon-tag-line"><PropertyTags defaultValue={["ds"]} options={[{ value: "ds", label: "Design System", theme: "blue" }]} /></PropertyField>
          <PropertyField label="Sprint"><PropertyText state="editing" defaultValue="Sprint 42" /></PropertyField>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
{
  const { frame, notes } = push(PROPERTIES);
  const all = []; const walk = (node) => { all.push(node); (node.children ?? []).forEach(walk); (node.slots ?? []).forEach((slot) => slot.children.forEach(walk)); }; walk(frame);
  const rows = all.filter((node) => node.set?.name === "Input/Property-Field");
  const badge = all.find((node) => node.set?.name === "Badge-Status");
  check("BadgeStatus: Badge-Status Status and Size", [badge?.props?.Status, badge?.props?.Size], ["In Review", "Small"]);
  check("PropertyField: one Input/Property-Field per row, Label in its text property", rows.map((row) => row.props.Label), ["Status", "Priority", "Start Date", "Due Date", "Assignee", "Labels", "Sprint"]);
  check("PropertyField: Icon on with an icon (its swap), off without; Action on with action", [rows[0].props.Icon, rows[0].props["Icon-Src"], rows[6].props.Icon, rows[4].props.Action, rows[0].props.Action], [true, "icon-loading-02-line", false, true, false]);
  check("PropertyField: the nested Value's Type and State from the cell", rows.map((row) => row.nested?.[0]?.props && [row.nested[0].path, row.nested[0].props.Type, row.nested[0].props.State]), [["Value", "Status", "Inputted"], ["Value", "Select", "Inputted"], ["Value", "Date", "Default"], ["Value", "Date", "Inputted"], ["Value", "Person", "Inputted"], ["Value", "Tags", "Inputted"], ["Value", "Text", "Editing"]]);
  check("PropertyField: the content in the Value's layers", [rows[0].nested[1], rows[1].nested[0].texts, rows[1].nested[1], rows[3].nested[0].texts, rows[6].nested[0].texts],
    [{ path: "Value/Status", props: { Status: "Done" } }, { Value: "Urgent" }, { path: "Value/Leading", props: { Tone: "Negative" }, swapIcon: "icon-flag-01-solid" }, { Value: "June 7, 2026" }, { Value: "Sprint 42" }]);
  // People and Tags fill the Value's Value-Slot (Figma since 2026-10-23): a Person Tag per person, a Badge per label.
  const slotted = (row) => row.slots?.filter((slot) => slot.name === "Value-Slot" && slot.within === "Value").flatMap((slot) => slot.children.map((child) => [child.set.name, child.text ?? child.textList?.[0], child.props.Theme]));
  check("PropertyField: People and Tags in the Value-Slot", [slotted(rows[4]), slotted(rows[5]), rows[5].hide ?? []], [[["Tag", "Alex Duong", "Leading-Photo"]], [["Badge", "Design System", "Blue"]], []]);
  ok("PropertyField: no note about its cell (every cell drawn)", !notes.some((note) => /PropertyField/.test(note) && /value cell/.test(note)));
  const back = pageFromFigma(frame, { mapping }).text;
  ok("pull: BadgeStatus comes back (Size as its long spelling)", /<BadgeStatus status="in-review" size="small" \/>/.test(back));
  ok("pull: a row whose label is Figma's default keeps it (label is required)", back.includes('<PropertyField label="Status" icon="icon-loading-02-line">'));
  ok("pull: PropertyField rows come back with their cells", ['<PropertyStatus defaultValue="done" />', '<PropertyDate defaultValue="2026-06-07" />', '<PropertyText state="editing" defaultValue="Sprint 42" />', "<PropertyDate />"].every((cell) => back.includes(cell)) && /<PropertyTags defaultValue=\{\["design-system"\]\} options=\{\[\{ value: "design-system", label: "Design System", theme: "blue" \}\]\} \/>/.test(back));
}

{
  // PropertyField ↔ Figma gaps (BACKLOG P3, 2026-10-23): every person and label goes in the Value-Slot, and a ring's
  // progress (BadgeStatus, the Status cell) is the Progress arc; both come back.
  const many = PROPERTIES.replace('<PropertyPeople defaultValue={["alex"]} options={[{ value: "alex", label: "Alex Duong" }]} />', '<PropertyPeople defaultValue={["alex", "sun", "lan"]} options={[{ value: "alex", label: "Alex Duong" }, { value: "sun", label: "Sun Hung" }, { value: "lan", label: "Lan Pham" }]} />')
    .replace('<PropertyTags defaultValue={["ds"]} options={[{ value: "ds", label: "Design System", theme: "blue" }]} />', '<PropertyTags defaultValue={["ds", "ui", "qa"]} options={[{ value: "ds", label: "Design System", theme: "blue" }, { value: "ui", label: "UI Design", theme: "orange" }, { value: "qa", label: "QA" }]} />')
    .replace('<PropertyStatus defaultValue="done" />', '<PropertyStatus defaultValue="in-progress" progress={60} />')
    .replace('<BadgeStatus status="in-review" size="sm" />', '<BadgeStatus status="in-review" size="sm" progress={80} />\n          <BadgeStatus status="done" progress={100} />');
  const { frame, notes } = push(many);
  const all = []; const walk = (node) => { all.push(node); (node.children ?? []).forEach(walk); (node.slots ?? []).forEach((slot) => slot.children.forEach(walk)); }; walk(frame);
  const rows = all.filter((node) => node.set?.name === "Input/Property-Field");
  const [ring, own] = all.filter((node) => node.set?.name === "Badge-Status");
  const names = (row) => row.slots?.[0]?.children.map((child) => child.text ?? child.textList?.[0]);
  check("push: a Person Tag's avatar shows the person's first letter", rows[4].slots?.[0]?.children.map((child) => child.nested?.[0]?.text), ["A", "S", "L"]);
  check("push: three people, three labels in the Value-Slot (no note)", [names(rows[4]), names(rows[5]), rows[5].slots?.[0]?.children.map((child) => child.props.Theme), notes.filter((note) => /shows the first/.test(note)).length], [["Alex Duong", "Sun Hung", "Lan Pham"], ["Design System", "UI Design", "QA"], ["Blue", "Orange", "Neutral"], 0]);
  const arcOf = (node, path) => node.nested?.find((entry) => entry.path === path)?.arcs?.Progress;
  const turn = (arc) => arc && Math.round(((arc.end - arc.start) / (2 * Math.PI)) * 100);
  check("push: a ring's progress is its Progress arc from the top (BadgeStatus, the Status cell); a status' own value writes none", [arcOf(ring, "Leading")?.start, turn(arcOf(ring, "Leading")), turn(arcOf(rows[0], "Value/Status/Leading")), arcOf(own, "Leading")], [1.5 * Math.PI, 80, 60, undefined]);
  const back = pageFromFigma(frame, { mapping }).text;
  ok("pull: the people and labels come back, each an option", back.includes('<PropertyPeople defaultValue={["alex-duong", "sun-hung", "lan-pham"]}') && back.includes('{ value: "ui-design", label: "UI Design", theme: "orange" }') && back.includes('{ value: "qa", label: "QA", theme: "neutral" }'));
  ok("pull: the progress comes back on BadgeStatus and the Status cell", /<BadgeStatus status="in-review" size="small" progress=\{80\} \/>/.test(back) && back.includes('<PropertyStatus defaultValue="in-progress" progress={60} />') && /<BadgeStatus status="done" \/>/.test(back));
}

{
  // Corner smoothing (spec docs/research/studio-fill-gradient-smoothing-eyedropper-spec-2026-10-22.md §2): the code's % as
  // Figma's cornerSmoothing 0–1, on frames and rectangles, and back.
  const page = `// @zen-page {"format":1,"title":"Smooth"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Box, Shape, Stack, Text } from "@zen-ds/react";

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Smooth" device="desktop">
        <Stack>
          <Stack surface="surface" radius="lg" cornerSmoothing={60} padding="md">
            <Text>Squircle</Text>
          </Stack>
          <Box surface="subtle" radius="md" cornerSmoothing={100} padding="md">
            <Text>Box</Text>
          </Box>
          <Shape type="rectangle" radius="md" cornerSmoothing={60} width={80} height={40} />
          <Stack surface="surface" radius="lg" padding="md">
            <Text>Round</Text>
          </Stack>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame } = push(page);
  const [squircle, box, rect, round] = frame.children;
  check("cornerSmoothing: Figma's 0–1 on frames and a rectangle; none where the page gives none", [squircle.cornerSmoothing, box.cornerSmoothing, rect.cornerSmoothing, round.cornerSmoothing ?? 0], [0.6, 1, 0.6, 0]);
  // CSS: a set width wins over a column's stretch, so the shape keeps it (a 200-wide rectangle pasted 1392 wide, 2026-10-22).
  check("a rectangle of a set width keeps it in a stretching column", [rect.fixedWidth, Boolean(rect.fillW), Boolean(rect.fillH)], [80, false, false]);
  const back = pageFromFigma(frame, { mapping }).text;
  check("round trip: a frame's cornerSmoothing comes back in %", [back.includes('radius="lg" cornerSmoothing={60}'), back.includes("cornerSmoothing={100}")], [true, true]);
  // The read's shapes: a rectangle's smoothing under `shape`.
  const read = { type: "FRAME", name: "Read", layout: { mode: "VERTICAL" }, children: [
    { type: "RECTANGLE", name: "Rectangle", shape: { w: 80, h: 40, fill: "Color/Background/Neutral/Subtle/Default", stroke: null, strokeWeight: 1, radius: 12, radiusVar: "Corner-Radius/Base", smoothing: 0.6, rotation: 0, opacity: 1 } },
    { type: "FRAME", name: "Card", fill: "Color/Background/Surface/Default", radii: [16, 16, 16, 16], radiiVars: ["Corner-Radius/Large", "Corner-Radius/Large", "Corner-Radius/Large", "Corner-Radius/Large"], cornerSmoothing: 0.6, layout: { mode: "VERTICAL" }, children: [] },
  ] };
  const readBack = pageFromFigma(read, { mapping }).text;
  check("pull of a read: a rectangle's and a frame's smoothing in %", [/<Shape type="rectangle"[^>]*cornerSmoothing=\{60\}/.test(readBack), /radius="lg" cornerSmoothing=\{60\}/.test(readBack)], [true, true]);
}

// An AppShell's own phone bars (topNavigation / bottomNavigation) are not drawn (the runtime shows the Screen's): the
// push names them, for a root AppShell on a phone Screen and for one inside a page (BACKLOG P3, 2026-10-23).
{
  const shellPage = (inner, chrome = "") => `// @zen-page {"format":1,"title":"Shell bars"}
import { Board, Screen } from "@zen-ds/react/builder";
import { ActionBar, AppShell, BottomNavigation, Box, Icon, Text, TopNavigation } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Shell bars" device="phone"${chrome}>
        ${inner}
      </Screen>
    </Board>
  );
}
`;
  // A phone AppShell is Figma's Pattern/AppShell/Mobile (user 2026-10-23, BACKLOG "AppShell phone bars in Figma"): its
  // TopNavigation, tabs or ActionBar and the page in the pattern's layers for its Top, the bar's type by the canvas.
  const tabs = 'bottomNavigation={<BottomNavigation items={[{ id: "home", label: "Home", icon: "icon-home-02-line", selectedIcon: "icon-home-02-solid" }, { id: "me", label: "Me", icon: "icon-user-01-line", dot: true }]} value="home" showLabels action={{ icon: "icon-plus-line", label: "New" }} />}';
  const shellOf = (attrs = "", bars = `topNavigation={<TopNavigation title="Inbox" />} ${tabs}`) => `<AppShell ${attrs} ${bars}><Text>Body</Text></AppShell>`;
  const pattern = (page) => { const { frame, notes } = push(page); return { app: find(frame, (node) => node.set?.name === "Pattern/AppShell/Mobile"), frame, notes }; };
  const at = (app, path) => app?.nested?.find((entry) => entry.path === path);
  {
    const { app, frame, notes } = pattern(shellPage(shellOf()));
    check("phone AppShell: Pattern/AppShell/Mobile Phone · Bar · Tab-Bar, filling the Screen", [frame.children[0] === app, app?.props, app?.fillW], [true, { Device: "Phone", Top: "Bar", Bottom: "Tab-Bar", "Top-Navigation": true, "Floating-Actions": false }, true]);
    check("phone AppShell: the bar Top-Navigation/Mobile Alt on the default canvas, the tabs Bottom-Navigation/Mobile/Default", [at(app, "Top-Navigation")?.set?.name, at(app, "Top-Navigation")?.props.Type, at(app, "Bottom-Navigation")?.set?.name], ["Top-Navigation/Mobile", "Alt", "Bottom-Navigation/Mobile/Default"]);
    const navItems = app?.slots.find((slot) => slot.name === "Nav-Items");
    check("phone AppShell: the tabs in Nav-Items as BottomNavigation.tsx draws them, its action the last tab (Type=Action)", [navItems?.within, navItems?.children.map((tab) => [tab.set.name, tab.props.Type, tab.props.Select, tab.props.Label, tab.props["Label-Text"], tab.props["Icon-Src"], tab.props.Noti])], [["Bottom-Navigation"], [
      [".Primitives/Bottom-Navigation/Items/Default", "Default", "Yes", true, "Home", "icon-home-02-solid", false],
      [".Primitives/Bottom-Navigation/Items/Default", "Default", "No", true, "Me", "icon-user-01-line", true],
      [".Primitives/Bottom-Navigation/Items/Default", "Action", "No", false, undefined, "icon-plus-line", false]]]);
    const content = app?.slots.find((slot) => slot.name === "Content");
    check("phone AppShell: the page in Body's Content slot, hugging; no note", [content?.within, content?.hugH, content?.children.map((node) => node.characters), notes], [["Body"], true, ["Body"], []]);
  }
  check("phone AppShell inside the page draws the pattern too", Boolean(pattern(shellPage(`<Box>${shellOf()}</Box>`)).app), true);
  {
    const alt = pattern(shellPage(shellOf('canvas="alt"'))).app;
    const flat = pattern(shellPage(shellOf('canvas="flat"'))).app;
    check("phone AppShell canvas alt: Default bar on Canvas/Alt", [at(alt, "Top-Navigation")?.props.Type, alt?.fill, alt?.edits], ["Default", "Background/Canvas/Alt", []]);
    check("phone AppShell canvas flat: Default bar repainted Surface/Flat on Canvas/Flat (app-shell.css)", [at(flat, "Top-Navigation")?.props.Type, flat?.fill, flat?.edits], ["Default", "Background/Canvas/Flat", [{ layer: ["Top-Navigation"], fill: "Background/Surface/Flat" }]]);
    check("phone AppShell: a TopNavigation's own type wins", at(pattern(shellPage(shellOf("", '<TopNavigation slot="topNavigation" />').replace("<TopNavigation slot=\"topNavigation\" />", "").replace("<AppShell  ", '<AppShell topNavigation={<TopNavigation title="Inbox" type="compact" />} '))).app, "Top-Navigation")?.props.Type, "Compact");
  }
  {
    const band = pattern(shellPage(shellOf('mobileTop="band" band="accent"'))).app;
    check("phone AppShell band accent: Top=Band, the bar in Band Transparent-On-Color, Band painted Accent/Solid, the page in Body", [band?.props.Top, at(band, "Band/Top-Navigation")?.props.Type, band?.edits.find((edit) => edit.fill), band?.slots.find((slot) => slot.name === "Content")?.within], ["Band", "Transparent-On-Color", { layer: ["Band"], fill: "Background/Accent/Solid/Default" }, ["Body"]]);
    check("phone AppShell band without a hero: the Hero slot emptied and hidden (Figma's sample Placeholder goes, the band hugs its bar)", [band?.slots.find((slot) => slot.name === "Hero"), band?.edits.find((edit) => edit.layer.at(-1) === "Hero")], [{ name: "Hero", within: ["Band"], children: [] }, { layer: ["Band", "Hero"], visible: false }]);
    const sheet = pattern(shellPage(shellOf('mobileTop="band-sheet"'))).app;
    check("phone AppShell band-sheet: the bar in Stage Transparent, the page in Stage › Sheet, no canvas fill", [sheet?.props.Top, at(sheet, "Stage/Top-Navigation")?.props.Type, sheet?.slots.find((slot) => slot.name === "Content")?.within, sheet?.fill], ["Band-Sheet", "Transparent", ["Stage", "Sheet"], undefined]);
    const media = pattern(shellPage(shellOf('mobileTop="media" backdrop={<Text>Photo</Text>}'))).app;
    check("phone AppShell media: the bar Liquid-Overaly, the backdrop in Stage's Backdrop slot, shown", [media?.props.Top, at(media, "Stage/Top-Navigation")?.props.Type, media?.slots.find((slot) => slot.name === "Backdrop")?.within, media?.edits], ["Media", "Liquid-Overaly", ["Stage"], [{ layer: ["Stage", "Backdrop"], visible: true }]]);
  }
  {
    const actions = pattern(shellPage(shellOf("", 'actionBar={<ActionBar direction="horizontal" primaryAction={{ label: "Book", startIcon: <Icon name="icon-calendar-line" decorative /> }} secondaryAction={{ label: "Later" }} />}'))).app;
    check("phone AppShell actionBar: Bottom=Actions; Action-Bar Default, Actions Dual Horizontal, Tertiary then Primary with its icon", [actions?.props.Bottom, actions?.props["Top-Navigation"], actions?.nested.filter((entry) => entry.path.startsWith("Action-Bar")).map((entry) => [entry.path, entry.props, entry.text])], ["Actions", false, [
      ["Action-Bar", { Type: "Default" }, undefined],
      ["Action-Bar/Actions", { Button: "Dual", Direction: "Horizontal" }, undefined],
      ["Action-Bar/Actions/Button[0]", {}, "Later"],
      ["Action-Bar/Actions/Button[1]", { "Leading-Icon": true, "Leading-Icon-Src": "icon-calendar-line" }, "Book"]]]);
    const glass = pattern(shellPage(shellOf("", '<BottomNavigation type="floating-glass" theme="accent" items={[{ id: "home", label: "Home", icon: "icon-home-02-line" }]} value="home" action={{ icon: "icon-plus-line", label: "New" }} />'.replace("<BottomNavigation", "bottomNavigation={<BottomNavigation").replace("/>", "/>}")))).app;
    check("phone AppShell floating-glass: Bottom=Floating, CTA on with the action's glyph, the tab Accent", [glass?.props.Bottom, at(glass, "Bottom-Navigation")?.props.CTA, at(glass, "Bottom-Navigation/Action")?.swapIcon, glass?.slots.find((slot) => slot.name === "Nav-Items")?.children[0]?.props.Theme], ["Floating", true, "icon-plus-line", "Accent"]);
  }
  {
    // The Screen's own bars win (as the Studio shows them): the root AppShell draws its page only and names its bars.
    const { frame, notes } = push(shellPage(shellOf(), ' topNavigation={<TopNavigation title="Screen" />}'));
    check("phone Screen with its own bars: no pattern, the AppShell's bars named", [Boolean(find(frame, (node) => node.set?.name === "Pattern/AppShell/Mobile")), notes.filter((note) => note.endsWith("the Screen's own bars draw instead (as the Studio shows them)")).length], [false, 2]);
  }
  check("a desktop AppShell keeps the master layout", Boolean(pattern(shellPage(shellOf()).replace('device="phone"', 'device="desktop"')).app), false);
  {
    // The tabs come back as they went (figma-pull bottomNavLook): labels kept while hidden, value, showLabels, dot, action.
    // (Figma has one icon per tab: a selectedIcon comes back as the selected tab's icon.)
    const bar = '<BottomNavigation items={[{ id: "home", label: "Home", icon: "icon-home-02-line" }, { id: "alerts", label: "Alerts", icon: "icon-bell-01-line", dot: true }]} value="home" showLabels action={{ icon: "icon-plus-line", label: "New" }} />';
    const glass = '<BottomNavigation type="floating-glass" items={[{ id: "home", label: "Home", icon: "icon-home-02-line" }]} value="home" theme="accent" selection="solid" />';
    const back = (element) => pageFromFigma(push(shellPage("<Text>Body</Text>", ` bottomNavigation={${element}}`)).frame, { mapping }).text.match(/<BottomNavigation\b[^]*?\/>/)?.[0];
    check("Screen bottomNavigation round trip: items, value, showLabels, dot, the Default bar's action", back(bar), bar);
    check("Screen bottomNavigation round trip: floating-glass, accent, selection solid", back(glass), glass);
  }
}

// sticky (user 2026-10-23 "Bottom = Fixed, Top = Sticky"): bottom is Figma's Fixed (absolute in the auto layout, pinned
// inside the frame's padding, its topmost layer), top is Figma's Sticky in flow; both come back as sticky, in flow.
{
  const page = `// @zen-page {"format":1,"title":"Sticky"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Box, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Sticky" device="desktop">
        <Stack padding="xl" gap="md">
          <Box sticky="bottom" surface="canvas"><Text>Field</Text></Box>
          <Stack sticky="top"><Text>Title</Text></Stack>
          <Text>Thread</Text>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame } = push(page);
  const column = find(frame, (node) => node.type === "FRAME" && (node.children ?? []).some((child) => child.scrollBehavior));
  const kids = column?.children ?? [];
  const dock = kids.find((node) => node.scrollBehavior === "FIXED");
  const head = kids.find((node) => node.scrollBehavior === "STICKY_SCROLLS");
  check("push: sticky bottom is Figma's Fixed, absolute, pinned bottom and stretched inside the padding", dock && [dock.absolute.cx, dock.absolute.cy, dock.absolute.left, dock.absolute.right, dock.absolute.bottom], ["STRETCH", "MAX", 24, 24, 24]);
  check("push: a Fixed layer is the frame's last (Figma's fixed layers are its topmost)", kids.at(-1) === dock, true);
  check("push: sticky top is Figma's Sticky, in flow", head && [head.scrollBehavior, "absolute" in head], ["STICKY_SCROLLS", false]);
  const back = pageFromFigma(frame, { mapping }).text;
  check("round trip: both come back as sticky, in flow", [/<Box [^>]*sticky="bottom"/.test(back), /<Stack [^>]*sticky="top"/.test(back), back.includes('position="absolute"')], [true, true, false]);
}

// A frame's own variable modes (Studio Variables v2, user 2026-10-23: `modes={{ … }}`): push writes { axis: mode id } on
// the frame (the Screen's on the page frame), pull reads Figma's { collection: mode name } back as `modes`.
{
  const page = `// @zen-page {"format":1,"title":"Modes"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Box, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Modes" device="desktop" modes={{ theme: "dark" }}>
        <Stack padding="xl" gap="md">
          <Box modes={{ density: "comfortable", theme: "light" }} padding="md"><Text>Light card</Text></Box>
          <Text>Body</Text>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const { frame, notes } = push(page);
  const box = find(frame, (node) => node.name === "Box");
  check("push: the Screen's modes on the page frame, a Box's on its frame", [frame.modes, box?.modes, notes.some((note) => /modes/.test(note))], [{ theme: "dark" }, { density: "comfortable", theme: "light" }, false]);
  const back = pageFromFigma(frame, { mapping }).text;
  check("round trip: modes come back on the Screen and the Box", [/<Screen [^>]*modes=\{\{ theme: "dark" \}\}/.test(back), /modes=\{\{ density: "comfortable", theme: "light" \}\}/.test(back)], [true, true]);
  const read = { type: "FRAME", name: "Read", width: 1440, layout: { mode: "VERTICAL" }, modes: { "Mode Colors (Semantic)": "Dark", "Spacing": "Standard" }, children: [
    { type: "FRAME", name: "Card", layout: { mode: "VERTICAL" }, modes: { "Component Size": "Comfortable" }, children: [{ type: "TEXT", characters: "Hi" }] },
  ] };
  const readBack = pageFromFigma(read, { mapping }).text;
  check("pull of a read: Figma's collection modes as `modes` (a collection that is no axis is left)", [/<Screen [^>]*modes=\{\{ theme: "dark" \}\}/.test(readBack), /modes=\{\{ density: "comfortable" \}\}/.test(readBack)], [true, true]);
}

// Every Screen, Screen state and Overlay as a frame, the Prototype tab's actions as Figma's reactions (figma-proto.mjs;
// user 2026-10-23: "push mọi Screen và Overlay thành frame, kèm reaction Navigate / Open / Close overlay / Back").
{
  const page = `// @zen-page {"format":1,"title":"Flow"}
import { Board, Overlay, Screen, proto } from "@zen-ds/react/builder";
import { BottomSheet, Button, Card, Dialog, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="home" title="Home" device="phone" onDelay={proto.navigate("details", { delay: 1500 })}>
        <Stack gap="md" padding="lg">
          <Button onClick={proto.navigate("details", { animation: "push", direction: "right", duration: "slow" })}>Next</Button>
          <Card whileHovering={proto.open("tip")}><Text>Hover</Text></Card>
          <Button onClick={proto.toast({ title: "Saved" })}>Save</Button>
          <Button onClick={proto.open("confirm", { animation: "instant" })}>Delete</Button>
        </Stack>
      </Screen>
      <Screen id="details" title="Details" device="phone">
        <Stack gap="md" padding="lg"><Button onClick={proto.back()}>Back</Button></Stack>
      </Screen>
      <Screen id="details" state="empty" title="Details" device="phone">
        <Stack gap="md" padding="lg"><Button onClick={proto.navigate("details")}>Retry</Button></Stack>
      </Screen>
      <Overlay id="tip" position="manual">
        <Card><Text>Tip</Text></Card>
      </Overlay>
      <Overlay id="confirm" background closeOnOutside>
        <Dialog title="Delete it?" primaryAction={{ label: "Delete", onClick: proto.close() }} secondaryAction={{ label: "Cancel", onClick: proto.back() }} />
      </Overlay>
      <Overlay id="sheet">
        <BottomSheet title="Pick" primaryAction={{ label: "Done", onClick: proto.close() }}><Text>One</Text></BottomSheet>
      </Overlay>
    </Board>
  );
}
`;
  const { pkg, notes } = figmaPackage(page, { mapping, nestedLayers: NESTED_LAYERS, page: { id: "flow" } });
  check("flow: every Screen, Screen state and Overlay is a frame, the first Screen as `frame` too", [pkg.frames.map((entry) => entry.id), pkg.frame === pkg.frames[0].frame], [["screen:home", "screen:details", "screen:details:empty", "overlay:tip", "overlay:confirm", "overlay:sheet"], true]);
  const byId = Object.fromEntries(pkg.frames.map((entry) => [entry.id, entry.frame]));
  check("flow: a state's frame is named after it; an Overlay's by what it holds, hugging it, with no canvas or height", [byId["screen:details:empty"].name, byId["overlay:confirm"].name, byId["overlay:confirm"].hug, "fill" in byId["overlay:confirm"], "minH" in byId["overlay:confirm"], "width" in byId["overlay:confirm"]], ["Details · empty", "Delete it?", true, false, false, false]);
  const EASE = [0.16, 1, 0.3, 1];
  check("flow: After delay is the frame's own reaction, its delay in seconds", byId["screen:home"].reactions, [{ trigger: "AFTER_TIMEOUT", timeout: 1.5, action: "NAVIGATE", to: "screen:details", transition: { type: "DISSOLVE", duration: 0.2, easing: EASE } }]);
  const layer = (frameId, name) => find(byId[frameId], (node) => node.reactions && (node.text === name || node.name === name || (node.children ?? []).some((child) => child.characters === name)));
  check("flow: Navigate to with Push, its direction and Motion/Duration/Slow", layer("screen:home", "Next")?.reactions, [{ trigger: "ON_CLICK", action: "NAVIGATE", to: "screen:details", transition: { type: "PUSH", direction: "RIGHT", duration: 0.28, easing: EASE } }]);
  check("flow: While hovering opens an overlay; Instant has no transition", [find(byId["screen:home"], (node) => node.reactions?.[0]?.trigger === "ON_HOVER")?.reactions, layer("screen:home", "Delete")?.reactions], [[{ trigger: "ON_HOVER", action: "OVERLAY", to: "overlay:tip", transition: { type: "DISSOLVE", duration: 0.2, easing: EASE } }], [{ trigger: "ON_CLICK", action: "OVERLAY", to: "overlay:confirm" }]]);
  check("flow: Back, and Navigate to a Screen from its own state", [layer("screen:details", "Back")?.reactions, layer("screen:details:empty", "Retry")?.reactions?.[0]?.to], [[{ trigger: "ON_CLICK", action: "BACK" }], "screen:details"]);
  const dialog = find(byId["overlay:confirm"], (node) => node.set?.name === "Modal/Dialog");
  check("flow: a Dialog's actions on its Primary and Secondary buttons", dialog?.reactions, [{ trigger: "ON_CLICK", action: "CLOSE", layer: "Container/Actions/Buttons/Container/Primary" }, { trigger: "ON_CLICK", action: "BACK", layer: "Container/Actions/Buttons/Container/Secondary" }]);
  const sheet = find(byId["overlay:sheet"], (node) => node.set?.name === "Bottom-Sheet");
  check("flow: a Bottom Sheet's action on its Primary button, by its names (both are named Button/Main)", sheet?.reactions, [{ trigger: "ON_CLICK", action: "CLOSE", layer: ["Container", "Footer", "Buttons", "Button/Main[1]"] }]);
  const said = (pattern) => notes.some((note) => pattern.test(note));
  check("flow: what Figma has no reaction or setting for is named (a toast, overlay settings); a sheet's action is pushed", [said(/Button onClick: toast: Figma has no such action/), !said(/BottomSheet primaryAction/), said(/Overlay tip: set Prototype › Overlay › Position to Manual/), said(/Overlay sheet: set Prototype › Overlay › Position to Bottom center/), said(/Overlay confirm: add Background dim/), said(/Overlay confirm: tick Close when clicking outside/)], [true, true, true, true, true, true]);
  check("flow: no note says Screens or interactions are left behind", notes.filter((note) => /only the first Screen|not pushed$|Overlays? \(dialogs/.test(note) && /Screen|Overlay|interaction/.test(note)), []);
  // The motion the reactions carry is the tokens' (tokens/source/motion.json).
  const motion = JSON.parse(fs.readFileSync(new URL("../../tokens/source/motion.json", import.meta.url), "utf8")).Motion.tokens;
  const token = (name) => motion.find((entry) => entry.name === name)?.value;
  check("flow: durations and the curve are Motion/Duration/Fast·Base·Slow and Motion/Ease/Emphasized", [DURATION_MS.fast, DURATION_MS.base, DURATION_MS.slow, EASING], [token("Motion/Duration/Fast"), token("Motion/Duration/Base"), token("Motion/Duration/Slow"), token("Motion/Ease/Emphasized")]);
  // Round trip: the reactions come back as the page's actions.
  const back = (frameId) => pageFromFigma({ ...byId[frameId], id: "9:1" }, { mapping }).text;
  ok("flow: pulled back, On click Navigate to keeps its animation", back("screen:home").includes('onClick={proto.navigate("details", { animation: "push", direction: "right", duration: "slow" })}'));
  ok("flow: pulled back, the frame's After delay is the Screen's onDelay", /<Screen [^>]*onDelay=\{proto\.navigate\("details", \{ delay: 1500 \}\)\}/.test(back("screen:home")));
  ok("flow: pulled back, While hovering and Instant", back("screen:home").includes('whileHovering={proto.open("tip")}') && back("screen:home").includes('onClick={proto.open("confirm", { animation: "instant" })}'));
  ok("flow: pulled back, Back", back("screen:details").includes("onClick={proto.back()}"));
  // A reaction a designer added to a frame that is no Studio frame (figma-pull names it "figma:<id>") is a note.
  const foreign = JSON.parse(JSON.stringify(byId["screen:details"]));
  find(foreign, (node) => node.reactions).reactions = [{ trigger: "ON_CLICK", action: "NAVIGATE", to: "figma:5:6" }];
  const pulled = pageFromFigma({ ...foreign, id: "9:2" }, { mapping });
  check("flow: a reaction to a frame that is no Studio Screen stays in Figma, with a note", [pulled.text.includes("proto."), pulled.notes.some((note) => /Navigate to: its frame is not a Studio Screen/.test(note))], [false, true]);
}

{
  // SheetTable → Figma Table/Sheet (2026-10-23): a header row of Table/Cell/Header, rows of Table/Sheet/Cell (Fill
  // height, Divider=No on the last), Code and Key content, a px width fixed and a percentage Fill.
  const page = `// @zen-page {"format":1,"title":"Sheet"}
import { Board, Screen } from "@zen-ds/react/builder";
import { SheetTable } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Sheet" device="desktop">
        <SheetTable aria-label="Keyboard" rows={[{ id: "tab", keys: "Tab / Shift + Tab", prop: "onKeyDown", action: "Moves focus." }, { id: "esc", keys: "Esc", prop: "onClose", action: "Closes the menu." }]}
          columns={[{ id: "keys", header: "Key", width: "200px", content: "keys" }, { id: "prop", header: "Prop", width: "20%", content: "code" }, { id: "action", header: "Action", bold: true }]} />
      </Screen>
    </Board>
  );
}
`;
  const { frame, notes } = push(page);
  const sheet = find(frame, (node) => node.type === "FRAME" && node.name === "Keyboard");
  check("SheetTable: a header row and a row frame per row", sheet?.children.map((row) => row.name), ["Header", "Row 1", "Row 2"]);
  check("SheetTable: the header row is Table/Cell/Header Type=None with the labels, the px column fixed, the others Fill", sheet.children[0].children.map((cell) => [cell.set.name, cell.props["✏️ Label"], cell.props.Type, cell.fixedWidth ?? null, cell.fillW ?? false]), [["Table/Cell/Header", "Key", "None", 200, false], ["Table/Cell/Header", "Prop", "None", null, true], ["Table/Cell/Header", "Action", "None", null, true]]);
  check("SheetTable: cells are Table/Sheet/Cell at Fill height, Divider=No on the last row", sheet.children.slice(1).map((row) => row.children.map((cell) => [cell.set.name, cell.props.Divider, cell.fillH])), [[["Table/Sheet/Cell", "Yes", true], ["Table/Sheet/Cell", "Yes", true], ["Table/Sheet/Cell", "Yes", true]], [["Table/Sheet/Cell", "No", true], ["Table/Sheet/Cell", "No", true], ["Table/Sheet/Cell", "No", true]]]);
  const [keys, prop, action] = sheet.children[1].children.map((cell) => cell.slots[0].children[0]);
  check("SheetTable: keys are Key chips with their separators, in a wrapping Keys frame", [keys.name, keys.layout.wrap, keys.children.map((part) => part.type === "TEXT" ? part.characters : part.props.Key)], ["Keys", true, ["Tab", "/", "Shift", "+", "Tab"]]);
  check("SheetTable: code is .Primitives/Table/Sheet/Code with its text; words a Bold Text-Cell", [prop.set.name, prop.props.Code, action.set.name, action.props.Bold, action.textList], [".Primitives/Table/Sheet/Code", "onKeyDown", "Primitives/Table/Cell/Text-Cell", "Yes", ["Moves focus."]]);
  ok("SheetTable: a percentage width is noted (Fill in Figma)", notes.some((note) => /percentage widths draw as Fill/.test(note)));
}

// 30. A column's cells (user, 2026-10-24: "figma đang làm mỗi loại giá trị của cell là 1 instance và cell có slot nối với
// các giá trị đó"): each row's Table/Cell/Default holds its value's project-component instance in its Content slot.
{
  const statusPage = `// @zen-page {"format":1,"title":"Tasks","project":"acme"}
import { Board, Component, ComponentSet, Screen, Use } from "@zen-ds/react/builder";
import { Badge, Table } from "@zen-ds/react";

export default function Tasks() {
  return (
    <Board>
      <Screen id="screen-1" title="Tasks" device="desktop">
        <ComponentSet id="status" name="Status" properties={{}}>
          <Component id="status-doing" variant={{ Status: "Doing" }}><Badge theme="blue" background="subtle">Doing</Badge></Component>
          <Component id="status-done" variant={{ Status: "Done" }}><Badge theme="green" background="subtle">Done</Badge></Component>
        </ComponentSet>
        <Table aria-label="Tasks" columns={[{ id: "title", header: "Task" }, { id: "status", header: "Status", content: "badge", cells: { "Doing": <Use of="status" variant={{ Status: "Doing" }} />, "Done": <Use of="status" variant={{ Status: "Done" }} /> } }]} rows={[{ id: "a", title: "Agenda", status: "Done" }, { id: "b", title: "Minutes", status: "Late" }]} />
      </Screen>
    </Board>
  );
}
`;
  const { frame } = push(statusPage);
  const table = find(frame, (node) => node.type === "FRAME" && node.children?.[0]?.name === "Header");
  const statusCell = (row) => table?.children[row].slots[0].children.find((cell) => cell.name === "status");
  const [done] = statusCell(1)?.slots[0].children ?? [];
  check("cells: the Content slot holds the value's project instance, its variant", [statusCell(1)?.slots[0].name, done?.type, done?.local, done?.variant], ["Content", "INSTANCE", "status", { Status: "Done" }]);
  check("cells: a value without a layer draws by content (Badge-Cell)", statusCell(2)?.slots[0].children[0]?.name, "Badge-Cell");
}

// 31. A date column (user, 2026-10-25): its ISO days go to Figma as the Table shows them (the locale's short form, the
// year only when it is not this one), in Text-Cells named Date-Cell, which the pull reads back as ISO days.
{
  const year = new Date().getFullYear();
  const datesPage = `// @zen-page {"format":1,"title":"Due"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Table } from "@zen-ds/react";

export default function Due() {
  return (
    <Board>
      <Screen id="screen-1" title="Due" device="desktop">
        <Table aria-label="Due" editable columns={[{ id: "title", header: "Task" }, { id: "due", header: "Due" }, { id: "start", header: "Start", edit: "date" }]} rows={[{ id: "a", title: "Agenda", due: "${year}-10-25", start: "2024-03-02" }, { id: "b", title: "Minutes", due: "${year}-01-07", start: "—" }]} />
      </Screen>
    </Board>
  );
}
`;
  const { frame } = push(datesPage);
  const table = find(frame, (node) => node.type === "FRAME" && node.children?.[0]?.name === "Header");
  const cellOf = (row, name) => table?.children[row].slots[0].children.find((cell) => cell.name === name)?.slots[0].children[0];
  check("dates: `editable` on ISO days and `edit: \"date\"` push Date-Cells in the locale's short form", [cellOf(1, "due")?.name, cellOf(1, "due")?.textList, cellOf(2, "due")?.textList, cellOf(1, "start")?.name, cellOf(1, "start")?.textList], ["Date-Cell", ["10/25"], ["01/07"], "Date-Cell", ["03/02/2024"]]);
  check("dates: a value that is no day stays a Text-Cell with its text; a text column stays a Text-Cell", [cellOf(2, "start")?.name, cellOf(2, "start")?.textList, cellOf(1, "title")?.name], ["Text-Cell", ["—"], "Text-Cell"]);
  check("dates: another locale writes its own order", find(figmaFromPage(datesPage, { mapping, nestedLayers: NESTED_LAYERS, locale: "vi-VN" }).frame, (node) => node.name === "Date-Cell")?.textList, ["25/10"]);
}

if (failures.length) {
  console.error(`✗ figma-push selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ figma-push selftest: ${passed} checks pass.`);
