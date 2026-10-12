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
  check("Overviews: layers outside the auto layout keep their constraints and insets (top right 32; the AppShell's floating action bottom right, Margin-Comfortable in)", absolutes.map((box) => [box.cx, box.cy, box.right, box.top]), [["MAX", "MIN", 32, 32], ["MAX", "MAX", 24, 0]]);
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

// 8. A component with no Figma set keeps what it holds (2026-10-12: an AppShell page imported as an empty frame): the
//    AppShell as the Zen components it renders, the Screen's app frame, PageHeader as the Dashboard header Type=Main,
//    wrappers as frames of their layers, Heading as text, a Menu as its trigger.
const SHELL = `// @zen-page {"format":1,"title":"Team"}
import { Board, Screen } from "@zen/design-system/builder";
import { AppShell, AppShellAccount, AppShellAction, Breadcrumbs, Button, Container, Heading, List, ListItem, Menu, PageHeader, Search, Sidebar, SidebarMenuItem, Stack } from "@zen/design-system";

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
          header={<Breadcrumbs items={[{ id: "team", label: "Team" }]} />}
          headerActions={<Stack direction="row" gap="sm" align="center">
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={3} />
            <Menu trigger={<AppShellAccount name="Khoa Dang" />} items={[{ id: "out", label: "Sign out" }]} />
          </Stack>}
        >
          <Container>
            <Stack gap="lg">
              <PageHeader title="Team members" description="12 people" actions={<Stack direction="row" gap="sm"><Button level="tertiary">Export</Button><Button>Invite</Button></Stack>} />
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
  check("AppShell: a row of the Sidebar (fill height) and its column (fill width), filling the frame", { name: shell?.name, mode: shell?.layout.mode, fillW: shell?.fillW, parts: shell?.children.map((child) => [child.set?.name ?? child.name, Boolean(child.fillH), Boolean(child.fillW)]) }, { name: "AppShell", mode: "HORIZONTAL", fillW: true, parts: [["Side-Bar/Master/Basic", true, false], ["Column", false, true]] });
  const sidebar = shell.children[0];
  check("AppShell: Sidebar rows in Body-Content, the selected one Select Yes", sidebar.slots?.map((slot) => [slot.name, slot.children.map((row) => `${row.text}:${row.props.Select}`)]), [["Body-Content", ["Home:No", "People:Yes"]]]);
  const column = shell.children[1];
  check("AppShell: its column is the top bar (Header) then the page (Main)", column.children.map((child) => child.name), ["Header", "Main"]);
  const bar = column.children[0].children[0];
  check("AppShell: the top bar is the Dashboard header Type=Navigation, padded Padding/Small · Margin-Comfortable", { set: bar.set.name, type: bar.props.Type, padding: column.children[0].layout.padding }, { set: "Primitives/Dashboard/Header", type: "Navigation", padding: [12, 24, 12, 24] });
  check("AppShell: Leading-Slots the collapse toggle and the header, Trailing-Slots the actions and the account's Avatar", bar.slots.map((slot) => [slot.name, slot.children.map((child) => child.set.name)]), [["Leading-Slots", ["Button/Icon-Flat", "Breadcrumbs"]], ["Trailing-Slots", ["Primitives/Dashboard/Header/Action-Item", "Avatar/Single"]]]);
  check("a slot with content turns its block on (Nav-Trailing-Block), one without stays off", [bar.props["Nav-Trailing-Block"], bar.props["Nav-Center-Block"]], [true, false]);
  const account = find(bar, (node) => node.set?.name === "Avatar/Single");
  check("AppShellAccount (a Menu's trigger): its Avatar, named by the person, the initials", [account?.name, account?.text, account?.props.Size], ["Khoa Dang", "KD", "Medium"]);
  const main = column.children[1];
  const container = main.children[0];
  check("Container: a frame of its layers with the gutter (Margin-Comfortable each side)", [container?.name, container?.layout.padding, container?.fillW], ["Container", [0, 24, 0, 24], true]);
  const header = find(main, (node) => node.props?.Type === "Main");
  check("PageHeader: the Dashboard header Type=Main, its title, SubHeading and actions (Actions on)", [header?.text, header?.texts?.SubHeading, header?.props.Actions, header?.slots?.[0]?.name, header?.slots?.[0]?.children.map((button) => button.text)], ["Team members", "12 people", true, "Action-Slots", ["Export", "Invite"]]);
  check("Heading: text in its level's style (h2 Heading/4)", find(main, (node) => node.type === "TEXT" && node.characters === "Admins")?.textStyle, "Heading/4");
  const list = find(main, (node) => node.name === "List");
  check("List: a frame of its rows, Gap/3XSmall", [list?.type, list?.layout.gap, list?.children.map((row) => row.set.name)], ["FRAME", 2, ["List-Item", "List-Item"]]);
  ok("the wrappers are named in one note each", notes.includes("Container: no Figma component, drawn as a frame of its layers (or as its text)") && notes.includes("List: no Figma component, drawn as a frame of its layers (or as its text)"));
  const keys = []; const walk = (node) => { keys.push(node.key); (node.children ?? []).forEach(walk); (node.slots ?? []).forEach((slot) => slot.children.forEach(walk)); }; walk(frame);
  check("AppShell: every layer keyed, no key twice (the frame by the Screen, not its AppShell)", { all: keys.every(Boolean), unique: new Set(keys).size === keys.length, root: frame.key !== shell.key }, { all: true, unique: true, root: true });
}
{
  // The Screen's app frame (screen-chrome.mjs): Sidebar beside a column of the Page header and the page.
  const chrome = SHELL.replace(/<AppShell[\s\S]*<\/AppShell>/, '<Stack gap="md"><Heading level={1}>Team</Heading></Stack>').replace('device="desktop">', 'device="desktop" header={<PageHeader title="Team" />} sidebar={<Sidebar aria-label="Main" selectedId="home"><SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" /></Sidebar>} topNavigation={<Heading>Phone only</Heading>}>');
  const { frame, notes } = push(chrome);
  const screen = frame.children[0];
  check("Screen chrome (desktop): Sidebar beside Main › Header (Padding/XLarge) and Content; the phone's parts wait", { parts: screen?.children.map((child) => child.set?.name ?? child.name), main: screen?.children[1]?.children.map((child) => child.name), header: screen?.children[1]?.children[0]?.layout.padding }, { parts: ["Side-Bar/Master/Basic", "Main"], main: ["Header", "Content"], header: [24, 24, 0, 24] });
  ok("Screen chrome: nothing noted as not pushed", !notes.some((note) => /^Screen /.test(note)));
}
{
  // The round trip of an app page (P2): what the push draws, the pull reads back as an AppShell.
  const { frame } = push(SHELL);
  const back = pageFromFigma(frame, { mapping }).text;
  const shell = shape(back).children[0].children[0];
  const prop = (name) => shell.props[name]?.element;
  check("AppShell round trip: an AppShell straight in the Screen, its Sidebar's rows with the selected one", { name: shell.name, sidebar: prop("sidebar")?.name, selected: prop("sidebar")?.props.selectedId }, { name: "AppShell", sidebar: "Sidebar", selected: "people" });
  check("AppShell round trip: the toggle is AppShell's own (not a header layer), the header the Breadcrumbs", { toggle: shell.props.sidebarToggle ?? null, header: prop("header")?.name }, { toggle: null, header: "Breadcrumbs" });
  check("AppShell round trip: the actions, the account (its Avatar named after the person) as AppShellAccount", prop("headerActions")?.children.map((child) => child.name), ["AppShellAction", "AppShellAccount"]);
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

if (failures.length) {
  console.error(`✗ figma-push selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ figma-push selftest: ${passed} checks pass.`);
