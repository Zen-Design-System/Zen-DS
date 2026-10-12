#!/usr/bin/env node
// Self-test of tools/studio/figma-pull.mjs (core rebuild M6): a Figma frame's JSON, as figmaReadCode returns it, becomes
// a valid Studio page — instances with the props that differ from the code defaults, overridden nested instances as
// `overrides` by layer path, auto layout as Stack (gap and padding from their variables or px), text as Text — and what
// has no Zen mapping is named. The read code itself runs only in Figma (use_figma); here it must at least parse.
// Run: node tools/studio/figma-pull.selftest.mjs
import fs from "node:fs";
import { compileReact } from "./compile.mjs";
import { validateDialect } from "./dialect.mjs";
import { figmaReadCode, layerKey, pageFromFigma, repoMapping } from "./figma-pull.mjs";
import { nestedPaths } from "../figma-contract/nested-paths.mjs";
import { checkSource } from "../usage-guard/api.mjs";

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
ok("the frame's auto layout: gap md (Spacing/Gap/Medium, Stack's default: unwritten), padding 2xl (Spacing/Padding/2-XLarge)", /<Stack padding="2xl">/.test(text));
ok("a text layer with its text style", text.includes('<Text textStyle="Heading/3">Team</Text>'));
ok("the Card with its Theme (Border ≠ code default shadow)", /<Card theme="border"/.test(text));
ok("the overridden Sub-Action becomes the Card's overrides (Level Danger, size XLarge ≠ code md)", text.includes('overrides={{ "Sub-Action": { size: "xlarge", level: "danger" } }}'));
ok("a horizontal frame: a row Stack, gap xs from 8 px, centred (a row Stack's default: unwritten)", /<Stack direction="row" gap="xs">/.test(text));
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

// The live read (2026-10-11): Overviews 14243:64878 of the Zen file, read by figmaReadCode through use_figma. A Sidebar
// whose slots are data (sections) and nodes (brand, footer), a Dashboard/Header Zen has no component for, Breadcrumbs and
// Segmented items, an 8-column grid of span-2 cards out of layer order, Fill-container frames and a cover drawing.
{
  const live = JSON.parse(fs.readFileSync(new URL("./fixtures/figma-overviews.json", import.meta.url), "utf8"));
  const pulled = pageFromFigma(live.frame, { mapping });
  const page = pulled.text;
  const notesWith = (part) => pulled.notes.filter((note) => note.includes(part)).length;
  check("live: the page is valid dialect", validateDialect(page), []);
  ok("live: Body-Content's frames are Sidebar sections, the Section-Title text their label",
    /sections=\{\[\{ items: \[\{ id: "overviews", label: "Overviews", icon: "icon-home-03-line" \}, \{ id: "installation"/.test(page) && page.includes('{ label: "Foundation", items: [{ id: "design-tokens", label: "Design Tokens", icon: "icon-beaker-01-line" }'));
  ok("live: a Menu-Item whose Icon is off has no icon; repeated labels get their own ids", page.includes('{ id: "avatar", label: "Avatar" }') && page.includes('{ id: "component-11", label: "Component" }'));
  ok("live: the item Figma shows selected is the Sidebar's selectedId", page.includes('selectedId="overviews"'));
  ok("live: Footer-Content's Menu-Items are SidebarMenuItem rows in the footer (they fill it: no align)", page.includes('footer={<Stack gap="3xs"><SidebarMenuItem id="download-figma" label="Download Figma" icon="ic-figma-line" />'));
  ok("live: Header-Content is the brand: the icon-zen instance an Icon, the collapse button named by its layer", page.includes('brand={<Stack direction="row" gap="xs"><Icon name="icon-zen" />') && page.includes('aria-label="Collapse"'));
  ok("live: Breadcrumbs' Item-List is its items, ids its own (not the Sidebar's)", page.includes('<Breadcrumbs items={[{ id: "overviews", label: "Overviews" }]} />'));
  ok("live: icon-only Segments: an empty label, the icon as leading, an aria-label from it; Select = Yes the defaultValue",
    page.includes('<Segmented options={[{ id: "sun", label: "", leading: "icon-sun-solid", "aria-label": "Sun" }, { id: "moon", label: "", leading: "icon-moon-01-solid", "aria-label": "Moon" }]} defaultValue="sun" />'));
  ok("live: the app frame's Dashboard/Header Type=Navigation is AppShell's top bar: Leading-Slots its header (no toggle in Figma: sidebarToggle off), Trailing-Slots its headerActions",
    /<AppShell sidebar=\{<Sidebar [\s\S]*?\/>\} sidebarToggle=\{false\} header=\{<Stack direction="row"><Breadcrumbs items=\{\[\{ id: "overviews", label: "Overviews" \}\]\} \/><\/Stack>\} headerActions=\{<Stack direction="row" gap="xs"><Segmented /.test(page));
  ok("live: a Type=Main row whose Header-Text holds a cover of its own is a custom row that keeps it", /<DashboardHeader type="custom">[\s\S]*?ZEN DESIGN SYSTEM[\s\S]*?<\/DashboardHeader>/.test(page) && notesWith("its Header-Text holds layers of its own (_Cover)") === 1);
  ok("live: span-2 cards on 8 columns, 2 to a row: a Grid of 2 columns", page.includes("<Grid columns={2} width=\"fill\">"));
  check("live: the cards in Figma's placement order (row by row), not the layers panel's",
    [...page.matchAll(/<Text textStyle="Heading\/4">(?:\{")?([^<"]+)/g)].map((match) => match[1]), ["Foundation", "Components", "Patterns", "Resources & Tools", "Development"]);
  ok("live: an app frame (the Sidebar pattern beside Main-Container under Header/Dashboard) is an AppShell straight in the Screen, Header/Dashboard's other row its sections, Body's layers its page with Body's padding",
    /<Screen[^>]*>\s*<AppShell sidebar=\{<Sidebar /.test(page) && /sections=\{<DashboardHeader type="custom">/.test(page) && /\}>\s*<Stack gap="xs" padding="xl">/.test(page));
  ok("live: Floating-Actions (outside the auto layout) is AppShell's floatingAction; the icon button without a layer name is named by its icon", page.includes('floatingAction={<IconButton level="accent" icon="icon-zen" aria-label="Zen" />}') && notesWith('aria-label "Zen" comes from its icon') === 1);
  ok("live: Figma's soft line break is a space; a centred text is align=\"center\"", page.includes('<Text align="center">ZEN DESIGN SYSTEM</Text>'));
  ok("live: text alignment: the tagline centred, a right-aligned text at the end", page.includes('<Text textStyle="Display/3" align="center">') && page.includes('<Text textStyle="All-Caps/M-BOLD" align="end" width="fill">2026</Text>'));
  ok("live: an absolute text is wrapped in a Stack that takes its constraints and insets (32 px = 2xl)", /<Stack position="absolute" constraintX="right" constraintY="top" insetRight="2xl" insetTop="2xl">\s*<Text textStyle="All-Caps\/M-BOLD" align="end">kaiz<\/Text>/.test(page));
  check("live: the drawings, the grid and the off-step gap are noted; Dashboard/Header is no longer unmapped",
    [notesWith("3 drawings"), notesWith("(Primitives/Dashboard/Header) has no Zen component"), notesWith('Grid "Frame 2"'), notesWith("gap 337 px")], [1, 0, 1, 1]);
  ok("live: no empty Stack is left where a drawing was", !/<Stack[^>]*\/>/.test(page));
  const compiled = compileReact(page, { file: "overviews.zen.tsx" }).code;
  check("live: the compiled page has no usage-harness errors", checkSource(compiled, "Overviews.tsx").filter((finding) => finding.severity === "error").map((finding) => `${finding.rule}: ${finding.message}`), []);
}

// The live Table (2026-10-11): Table-Example 14730:78776 on the Demo page, a frame of Primitives/Table/Data-Row instances
// (a header row of Table/Cell/Header, nine rows of Table/Cell/Default holding Dock-Icon, Text, Badge and Actions cells).
{
  const table = JSON.parse(fs.readFileSync(new URL("./fixtures/figma-table.json", import.meta.url), "utf8"));
  const pulled = pageFromFigma(table.frame, { mapping });
  const page = pulled.text;
  check("table: the page is valid dialect", validateDialect(page), []);
  ok("table: Figma's Data-Rows are one Table, a column per header cell (content, Sort, a fixed width or Fill, Bold)",
    page.includes('columns={[{ id: "type", header: "Type", content: "dock-icon", bold: true }, { id: "submit-on", header: "Submit On", sortable: true, width: "140px" }, { id: "from-to", header: "From - to", width: "234px" }, { id: "total", header: "Total", width: "104px", bold: true }, { id: "status", header: "Status", sortable: true, width: "198px", content: "badge" }, { id: "actions", header: "", align: "right", width: "72px", content: "actions", actions: [{ id: "open", icon: "icon-chevron-right-line-small", label: "Open", size: "small" }] }]} rows={[{ id: "row-1", type: "Annual Leave", "submit-on": "Mar 2, 2026", "from-to": "Mar 12 - Mar 13, 2026", total: "2 days", status: "Pending" }, '));
  check("table: nine rows, written in the Table (a later pull compares them as its prop)", (page.match(/\{ id: "row-\d+"/g) ?? []).length, 9);
  ok("table: a row's yellow Badge with its dot is that row's override", page.includes('"Row[row-1]/status/Badge": { theme: "yellow", leadingIcon: true }') && page.includes('"Row[row-3]/status/Badge": { theme: "red", leadingIcon: true }'));
  ok("table: an emoji Dock-Icon at Medium is an override, and its emoji is not the row's label", page.includes('"Row[row-1]/type/Dock-Icon": { size: "md", theme: "emoji", background: "solid", emoji: "🏝️" }') && !/type: "🏝/.test(page));
  check("table: the Actions-Cell is an actions column (its icon button, named by its icon), with no note", pulled.notes.filter((note) => note.includes("Actions-Cell")).length, 0);
  // A row whose Actions-Cell swaps another icon in: that row's override of its Button, the column keeps the first row's.
  const swapped = structuredClone(table.frame);
  const findTable = (node) => (node?.type === "TABLE" ? node : (node?.children ?? []).map(findTable).find(Boolean));
  const rows = findTable(swapped).rows;
  const actionsAt = rows[0].cells.findIndex((cell) => cell.kind === "Actions-Cell");
  rows[2].cells[actionsAt].parts[0].props["Leading-Icon-Src"] = "icon-trash-line";
  const swappedPage = pageFromFigma(swapped, { mapping }).text;
  ok("table: a row's own action icon is that row's override of its Button", swappedPage.includes('"Row[row-3]/actions/Button": { icon: "icon-trash-line" }') && !swappedPage.includes('"Row[row-1]/actions/Button"'));
  ok("table: a Search takes its text as its placeholder", page.includes('<Search placeholder="Search" />'));
  check("table: the compiled page has no usage-harness errors", checkSource(compileReact(page, { file: "table.zen.tsx" }).code, "TableExample.tsx").filter((finding) => finding.severity === "error").map((finding) => finding.rule), []);
}

{
  // figma-push draws `selectable` as a first checkbox column, the sorted column's direction in its Sort glyph and an
  // avatar cell's Avatar (theme from the row's override): they come back as the Table's props, not as columns.
  const avatarSet = [...mapping.sets.values()].find((set) => set.code === "Avatar");
  const person = (texts, props, initials) => ({ kind: "Avatar-Cell", props: { Bold: "No", Subtext: "Yes" }, w: 400, fill: true, texts, parts: [{ id: "a", set: { id: avatarSet.id, name: avatarSet.name }, props: { Size: "Small", Shape: "Circle", Background: "Subtle", ...props }, text: initials }] });
  const frame = { type: "FRAME", name: "T", layout: { mode: "VERTICAL", gap: 0, padding: [0, 0, 0, 0] }, children: [{ type: "TABLE", name: "Members", header: [{ label: "", checkbox: true, w: 48 }, { label: "Member", sort: true, sorted: "asc", fill: true }, { label: "Role", sort: true, w: 120 }],
    rows: [["An Mai", "Neutral", "AM"], ["Bao Nguyen", "Green", "BX"]].map(([name, theme, initials]) => ({ cells: [{ kind: "Control-Cell", props: { Type: "Checkbox" }, w: 48 }, person([name, "mail"], { Theme: theme }, initials), { kind: "Text-Cell", props: {}, w: 120, texts: ["Member"] }] })) }] };
  const back = pageFromFigma(frame, { mapping }).text;
  ok("table: a first checkbox column is `selectable`, not a column", /<Table[^>]*\bselectable\b/.test(back) && !/id: "column-1"|content: "checkbox"/.test(back));
  ok("table: the sorted column's glyph gives `sort`", back.includes('sort={{ columnId: "member", direction: "asc" }}'));
  ok("table: an avatar cell's Avatar theme other than Neutral, and initials other than the label's, are its row's override", back.includes('"Row[row-2]/member/Avatar": { theme: "green", children: "BX" }') && !back.includes("Row[row-1]/member/Avatar"));
}

if (failures.length) {
  console.error(`✗ figma-pull selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}\n--- page ---\n${text}\n--- notes ---\n${notes.join("\n")}`);
  process.exit(1);
}
console.log(`✓ figma-pull selftest: ${passed} checks pass.`);
