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
  check("AppShell: Sidebar rows in Body-Content, the selected one Select Yes; no footer: Footer-Content emptied, its container hidden", [sidebar.slots?.map((slot) => [slot.name, slot.children.map((row) => `${row.text}:${row.props.Select}`)]), sidebar.hide], [[["Body-Content", ["Home:No", "People:Yes"]], ["Footer-Content", []]], ["Divider", "Footer-Container"]]);
  const column = shell.children[1];
  check("AppShell: its column is the top bar (Header) then the page (Main)", column.children.map((child) => child.name), ["Header", "Main"]);
  const bar = column.children[0].children[0];
  check("AppShell: the top bar is the Dashboard header Type=Navigation, padded as Figma's Navigation row (Margin-Comfortable, Padding/XSmall below)", { set: bar.set.name, type: bar.props.Type, padding: column.children[0].layout.padding }, { set: "Primitives/Dashboard/Header", type: "Navigation", padding: [24, 24, 8, 24] });
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

// 9. The Dashboard as Figma draws it (2026-10-12, imported in the live file: metrics stacked with sample texts, cells
//    overlapping): columns that fit as a wrapping row, MetricCard and ChartCard as a Card around Figma's metric and
//    chart, ListItem and ListBox parts, Text in its default style and tone, icon names as Figma's cuts.
const DASH = `// @zen-page {"format":1,"title":"Dash"}
import { Board, Screen } from "@zen/design-system/builder";
import { AppShell, Avatar, ChartCard, Chip, DockIcon, Grid, IconButton, LineChart, List, ListBox, ListItem, MetricCard, Search, Segmented, Sidebar, SidebarMenuItem, Stack, StackBarChart, Text, Button, Heading } from "@zen/design-system";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Dash" device="desktop">
        <AppShell sidebar={<Sidebar aria-label="Main" selectedId="home"><SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" /></Sidebar>} header={<Search aria-label="Search" placeholder="Search projects" />}>
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
  check("AppShell: the page is Canvas", shell.fill, "Background/Canvas/Default");
  const [fit, fixed] = find(frame, (node) => node.name === "Stack" && node.children?.some((child) => child.name === "Grid")).children.filter((child) => child.name === "Grid");
  // The page is 1440 less the open Sidebar's 240: auto-fit 496 + 16 takes 2 columns, the third card on a second row.
  check("Grid of columns that fit, in a page of known width: as many even columns as fit, Gap/Medium both ways, its cells keep the minimum (cards as tall as the row)", { layout: [fit.layout.mode, fit.layout.wrap, fit.layout.gap, fit.layout.rowGap, fit.layout.rowGapVar, fit.layout.grid], cells: fit.children.map((cell) => [cell.fillW, cell.fillH, cell.minW, cell.cell.col, cell.cell.row]) }, { layout: ["GRID", undefined, 16, 16, "Spacing/Gap/Medium", { columns: 2, rows: 2, sizes: [{ type: "FLEX", value: 1 }, { type: "FLEX", value: 1 }] }], cells: [[true, true, 496, 0, 0], [true, true, 496, 1, 0], [true, true, 496, 0, 1]] });
  check("Grid of a column count (desktop of { mobile, desktop }): Figma's grid, a row per two cells, cells in order; a text cell hugs its height", { grid: fixed.layout.grid, cells: fixed.children.map((cell) => [cell.cell.col, cell.cell.row, Boolean(cell.fillH)]) }, { grid: { columns: 2, rows: 2 }, cells: [[0, 0, true], [1, 0, false], [0, 1, false]] });
  const [metricCard, lineCard, barCard] = fit.children;
  const metric = metricCard.slots[0].children[0];
  check("MetricCard: a Card (Shadow, no ⋮) around Metric-Inline, its Label and Metric-Number, Trend, Dock-Icon and Action on", { card: [metricCard.set.name, metricCard.props.Theme, metricCard.props["Sub-Action"]], metric: [metric.set.name, metric.texts, metric.props.Trend, metric.props["Dock-Icon"], metric.props.Action] }, { card: ["Card", "Shadow", false], metric: ["Primitives/Metric/Metric-Inline/Title-Highlight", { Label: "Revenue", "Metric-Number": "$541.4K" }, true, true, true] });
  check("MetricCard: its trend badge, Dock Icon and action glyph (a plain icon name as Figma's Medium cut)", metric.nested, [{ path: "Trend", props: { Trend: "Positive" }, textList: ["+8% vs. Q2"] }, { path: "Metric-Icon", props: { Theme: "Green", "Icon-Src": "icon-coins-stacked-01-solid" } }, { path: "Button", props: { "Leading-Icon-Src": "icon-chevron-right-line-medium" } }]);
  const line = lineCard.slots[0].children[0];
  check("ChartCard: a Card around Figma's chart of its kind, the title its Label, ranges as Segmented items, no open button without onOpen", { set: line.set.name, texts: line.texts, items: line.slots?.[0]?.children.map((item) => `${item.text}:${item.props.Select}`), hide: line.hide }, { set: "Chart/Line-Chart", texts: { Label: "Revenue" }, items: ["Revenue:Yes", "Profit:No"], hide: ["Button/Icon-Main"] });
  check("ChartCard without ranges: its Segmented hidden", barCard.slots[0].children[0].hide, ["Segmented", "Button/Icon-Main"]);
  check("ChartCard ranges: items Medium Secondary (Figma's item starts Small Primary), splitting the full-width switch", line.slots[0].children.map((item) => [item.props.Size, item.props.Level, item.fillW]), [["Medium", "Secondary", true], ["Medium", "Secondary", true]]);
  const hugging = push(DASH.replace('range="revenue"', 'range="revenue" rangesFullWidth={false}'));
  const hugLine = find(hugging.frame, (node) => node.set?.name === "Chart/Line-Chart");
  check("ChartCard rangesFullWidth={false}: the Segmented and its Item-List hug, items hug", [hugLine.nested, hugLine.slots[0].hugW, hugLine.slots[0].children.map((item) => Boolean(item.fillW))], [[{ path: "Segmented", hugW: true }], true, [false, false]]);
  const segmented = push(DASH.replace("<Text>One</Text>", '<Segmented level="primary" size="sm" defaultValue="w" options={[{ id: "d", label: "Day" }, { id: "w", label: "Week" }]} />'));
  const seg = find(segmented.frame, (node) => node.set?.name === "Segmented");
  check("Segmented: as wide as its items (not fullWidth), its items its Level and Size, the selected one Select Yes", [seg.hugW, seg.slots[0].hugW, seg.slots[0].children.map((item) => [item.text, item.props.Level, item.props.Size, item.props.Select])], [true, true, [["Day", "Primary", "Small", "No"], ["Week", "Primary", "Small", "Yes"]]]);
  const listBox = fixed.children[0];
  check("ListBox: Header on, its header row one frame filling Header-Slot, the List filling Body-Slot", { header: listBox.props.Header, slots: listBox.slots.map((slot) => [slot.name, slot.children.map((child) => [child.type, child.layout?.mode, child.fillW])]) }, { header: true, slots: [["Header-Slot", [["FRAME", "HORIZONTAL", true]]], ["Body-Slot", [["FRAME", "VERTICAL", true]]]] });
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
import { Board, Screen } from "@zen/design-system/builder";
import { Avatar, Badge, Box, DescriptionList, Divider, InlineMessage, InputField, Link, List, ListBox, ListItem, SelectField, Stack, Stepper, TabPanel, Tabs, Text, Toggle, VisuallyHidden } from "@zen/design-system";

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
  check("Toggle: its label, Subtext hidden without a caption", [bySet("Toggle")[0].texts, bySet("Toggle")[0].hide], [{ Label: "Weekly summary" }, ["Subtext"]]);
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
import { Board, Screen, proto } from "@zen/design-system/builder";
import { AppShell, Breadcrumbs, Card, Container, Grid, IconButton, InlineMessage, Segmented, Sidebar, SidebarMenuItem, Stack, Text } from "@zen/design-system";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Widths" device="desktop">
        <AppShell sidebar={<Sidebar aria-label="Main" selectedId="home"><SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" /></Sidebar>} header={<Breadcrumbs items={[{ id: "a", label: "Invoices" }, { id: "b", label: "INV-0142" }]} />}>
          <Container>
            <Stack gap="lg">
              <Grid minColumnWidth={480} gap="lg"><Card><Text>Projects</Text></Card><Card><Text>Activity</Text></Card></Grid>
              <Grid columns="repeat(auto-fill, minmax(360px, 1fr))"><Card><Text>A</Text></Card><Card><Text>B</Text></Card></Grid>
              <Grid columns="repeat(auto-fit, minmax(360px, 1fr))"><Card><Text>A</Text></Card><Card><Text>B</Text></Card></Grid>
              <Grid columns="2fr 1fr"><Grid><Card><Text>One</Text></Card></Grid><Grid><Card><Text>Two</Text></Card></Grid></Grid>
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
  const [halves, fill, fitted, tracks] = stack.children.filter((child) => child.name === "Grid");
  const columnsOf = (grid) => [grid.layout.mode, grid.layout.grid?.columns, grid.layout.grid?.rows, grid.layout.grid?.sizes?.map((size) => `${size.type} ${size.value}`)];
  // 1440 − 240 (Sidebar) − 2 × 24 (Container's gutter) = 1152: (1152 + 24) / (480 + 24) → 2 columns of 564.
  check("Grid minColumnWidth 480 in AppShell › Container (1152 wide): 2 even columns, a cell each", [columnsOf(halves), halves.children.map((cell) => [cell.cell.col, cell.cell.row, cell.minW])], [["GRID", 2, 1, ["FLEX 1", "FLEX 1"]], [[0, 0, 480], [1, 0, 480]]]);
  check("auto-fill keeps a row's empty columns: 3 columns of 360 for 2 cards", columnsOf(fill), ["GRID", 3, 1, ["FLEX 1", "FLEX 1", "FLEX 1"]]);
  check("auto-fit lets the cards take them: 2 columns", columnsOf(fitted), ["GRID", 2, 1, ["FLEX 1", "FLEX 1"]]);
  // "2fr 1fr" of 1152: (1152 − 16) × 2/3 = 757 takes 3 columns of 240, 379 one.
  check("a grid track's share is the width inside it (2fr: 3 columns of 240, 1fr: 1)", tracks.children.map((cell) => cell.layout.grid?.columns), [3, 1]);
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
  // A collapsed Sidebar (HR Home, 2026-10-12: drawn open in Figma, 240 wide) is Figma's rail: Expand No, 84 wide.
  const rail = WIDTHS.replace('<Sidebar aria-label="Main" selectedId="home"><SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" /></Sidebar>', '<Sidebar aria-label="Main" collapsed selectedId="home" brand={<Stack direction="row" gap="xs"><Avatar size="small" shape="square" theme="violet">D</Avatar><Text>Dizai</Text></Stack>} sections={[{ id: "main", label: "Main", items: [{ id: "home", label: "Home", icon: "icon-home-03-line" }] }, { id: "modules", label: "Modules", items: [{ id: "people", label: "People", icon: "icon-users-line" }] }]} />')
    .replace("import { AppShell,", "import { AppShell, Avatar,")
    .replace('<Grid minColumnWidth={480} gap="lg">', '<Grid minColumnWidth={400}>');
  const { frame, notes } = push(rail);
  const side = find(frame, (node) => node.set?.name === "Side-Bar/Master/Basic");
  const header = side.slots.find((slot) => slot.name === "Header-Content").children;
  const groups = side.slots.find((slot) => slot.name === "Body-Content").children;
  check("collapsed Sidebar: Expand No, the brand's mark alone in the header", [side.props.Expand, header.map((layer) => layer.set?.name ?? layer.type)], ["No", ["Avatar/Single"]]);
  check("collapsed Sidebar: rows their icon alone (no label, as wide as it), titles gone, a Divider opening the later group", groups.map((group) => group.children.map((layer) => [layer.set?.name, layer.props?.Label, layer.hugW ?? layer.fillW, layer.text, layer.hugLayers?.[0]?.name])), [[["Primitives/Side-Bar/Menu-Item/Master", false, true, undefined, "Element"]], [["Divider", undefined, true, undefined, undefined], ["Primitives/Side-Bar/Menu-Item/Master", false, true, undefined, "Element"]]]);
  // 1440 − 84 (rail) − 48 (Container's gutter) = 1308: (1308 + 16) / (400 + 16) → 3 columns (an open Sidebar leaves room for 2).
  check("the page beside the rail is 84 narrower than the frame, not 240: 3 columns of 400", find(frame, (node) => node.name === "Grid")?.layout.grid?.columns, 3);
  ok("logoCollapsed / the rail noted as nothing", !notes.some((note) => /Sidebar.*(logoCollapsed|not written)/.test(note)));
  const back = pageFromFigma(frame, { mapping }).text;
  ok("round trip: the rail comes back a collapsed Sidebar, its rows' labels and its groups' titles kept, no Divider row", /<Sidebar[^>]*\bcollapsed\b/.test(back) && /label: "Modules"/.test(back) && /label: "People"/.test(back) && !/Divider/.test(back.slice(back.indexOf("<Sidebar"), back.indexOf("/>", back.indexOf("<Sidebar")))));
}

// 13. A Table inside a surface (a Card, a Box with a surface or a border) drops its last row's bottom rule, as table.css
//     does (user rule, 2026-10-12): `strokeBottom: 0` on that row's cells, which the importer applies to the weight only.
//     A Table on the page canvas, or in a plain Box, keeps it.
const SURFACE_TABLES = `// @zen-page {"format":1,"title":"Surfaces"}
import { Board, Screen } from "@zen/design-system/builder";
import { Box, Card, Container, Stack, Table } from "@zen/design-system";

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
import { Board, Screen } from "@zen/design-system/builder";
import { AppShell, AppShellAccount, Form, Grid, InputField, Search, Stack, Table, Text } from "@zen/design-system";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Team" device="desktop">
        <AppShell headerActions={<AppShellAccount name="Linh Hoang" theme="yellow" />}>
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
import { Board, Screen } from "@zen/design-system/builder";
import { Segmented, Stack, Text, TopNavigation } from "@zen/design-system";

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
  check("TopNavigation: the control bar in Control-Slot, padded as the code pads it (Padding/2XSmall, Large, XSmall)", [inbox.slots[2].name, inbox.slots[2].children[0].name, inbox.slots[2].children[0].layout.padding, inbox.slots[2].children[0].children[0].set.name], ["Control-Slot", "Control", [4, 20, 8, 20], "Segmented"]);
  check("TopNavigation: a compact root folds its bar into the large-title row (Top-bar off, the actions beside the title, Flat › Icon-Flat)", [home.props["Top-bar"], home.props["Top-Leading"], home.props["Expand-Trailing"], home.slots.map((slot) => [slot.within, slot.children.map((item) => [item.props.Style, item.nested[0].set.name, item.nested[0].props.Level])])], [false, false, true, [["Expand-Heading", [["Flat", "Nav-Action/Icon-Flat", "Primary"], ["Flat", "Nav-Action/Icon-Flat", "Primary"]]]]]);
  check("TopNavigation: an identity's title and subtitle in Top-Heading-Text, Margin Compact, an overlay's Icon-Overlay", [ava.props.Margin, ava.props["Expand-Heading"], ava.nested[0].props, ava.nested[0].texts, ava.slots[0].children[0].nested[0].props.Level], ["Compact", false, { Type: "Sub", Header: true, Subheading: true, Leading: false }, { "Header-Text": "Ava Chen", Subheading: "Active now" }, "Black Overlay"]);
  ok("TopNavigation: a note for actions that share a pill (Figma has none)", notes.some((note) => /share a pill/.test(note)));
  const back = shape(pageFromFigma(frame, { mapping }).text);
  check("round trip: the Screen's topNavigation and the page's TopNavigations come back the same", back, shape(nav.replace(/, group: "call"/g, "")));
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

if (failures.length) {
  console.error(`✗ figma-push selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ figma-push selftest: ${passed} checks pass.`);
