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
/** The page without the layers' own names (data-name, F1 2026-10-18): the checks below read the rest of the code. */
const unnamed = (code) => code.replace(/ data-name="[^"]*"/g, "");
const { text: named, notes } = pageFromFigma(FRAME, { mapping });
const text = unnamed(named);
ok("a frame's and a text's own Figma names come back as their data-name (layer-meta.mjs)", named.includes('<Text textStyle="Heading/3" data-name="Title">Team</Text>') && named.includes('<Stack direction="row" gap="xs" data-name="Statuses">'));
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
  const page = unnamed(pulled.text);
  const notesWith = (part) => pulled.notes.filter((note) => note.includes(part)).length;
  check("live: the page is valid dialect", validateDialect(page), []);
  ok("live: Body-Content's frames are Sidebar sections, the Section-Title text their label",
    /sections=\{\[\{ items: \[\{ id: "overviews", label: "Overviews", icon: "icon-home-03-line" \}, \{ id: "installation"/.test(page) && page.includes('{ label: "Foundation", items: [{ id: "design-tokens", label: "Design Tokens", icon: "icon-beaker-01-line" }'));
  ok("live: a Menu-Item whose Icon is off has no icon; repeated labels get their own ids", page.includes('{ id: "avatar", label: "Avatar" }') && page.includes('{ id: "component-11", label: "Component" }'));
  ok("live: the item Figma shows selected is the Sidebar's selectedId", page.includes('selectedId="overviews"'));
  ok("live: Footer-Content's Menu-Items are SidebarMenuItem rows in the footer (they fill it: no align)", page.includes('footer={<Stack gap="3xs"><SidebarMenuItem id="download-figma" label="Download Figma" icon="ic-figma-line" />'));
  ok("live: Header-Content is the brand: the icon-zen instance an Icon; its Collapse button is the Sidebar's own (left out, noted)", page.includes('brand={<Stack direction="row" gap="xs"><Icon name="icon-zen" />') && !page.includes('aria-label="Collapse"') && notesWith("its Collapse button is the Sidebar's own") === 1);
  ok("live: Breadcrumbs' Item-List is its items, ids its own (not the Sidebar's); its one crumb at the Item's Sub level: master off", page.includes('<Breadcrumbs items={[{ id: "overviews", label: "Overviews" }]} master={false} />'));
  ok("live: icon-only Segments: an empty label, the icon as leading, an aria-label from it; Select = Yes the defaultValue",
    page.includes('<Segmented options={[{ id: "sun", label: "", leading: "icon-sun-solid", "aria-label": "Sun" }, { id: "moon", label: "", leading: "icon-moon-01-solid", "aria-label": "Moon" }]} defaultValue="sun" />'));
  ok("live: the app frame's Dashboard/Header Type=Navigation is AppShell's top bar: an AppShellHeader, Leading-Slots its leading (no toggle in Figma: collapse none), Trailing-Slots its actions",
    /<AppShell sidebar=\{<Sidebar [\s\S]*?\/>\} collapse="none" header=\{<AppShellHeader leading=\{<Stack direction="row"><Breadcrumbs items=\{\[\{ id: "overviews", label: "Overviews" \}\]\} master=\{false\} \/><\/Stack>\} actions=\{<Stack direction="row" gap="xs"><Segmented /.test(page));
  ok("live: a Type=Main row whose Header-Text holds a cover of its own is a custom row that keeps it", /<DashboardHeader type="custom">[\s\S]*?ZEN DESIGN SYSTEM[\s\S]*?<\/DashboardHeader>/.test(page) && notesWith("its Header-Text holds layers of its own (_Cover)") === 1);
  ok("live: span-2 cards on 8 columns, 2 to a row: a Grid of 2 columns", page.includes("<Grid columns={2} width=\"fill\">"));
  check("live: the cards in Figma's placement order (row by row), not the layers panel's",
    [...page.matchAll(/<Text textStyle="Heading\/4">(?:\{")?([^<"]+)/g)].map((match) => match[1]), ["Foundation", "Components", "Patterns", "Resources & Tools", "Development"]);
  ok("live: an app frame (the Sidebar pattern beside Main-Container under Header/Dashboard) is an AppShell straight in the Screen, Header/Dashboard's other row its header's sections, Body's layers its page without Body's padding (Margin-Comfortable: AppShell's Body pads the page itself)",
    /<Screen[^>]*>\s*<AppShell sidebar=\{<Sidebar /.test(page) && /sections=\{<DashboardHeader type="custom">/.test(page) && /\}>\s*<Stack gap="xs">/.test(page) && !/padding="margin-comfortable"/.test(page));
  ok("live: Floating-Actions (outside the auto layout) is AppShell's floatingActions; the icon button without a layer name is named by its icon", page.includes('floatingActions={<IconButton level="accent" icon="icon-zen" aria-label="Zen" />}') && notesWith('aria-label "Zen" comes from its icon') === 1);
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
  const page = unnamed(pulled.text);
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

// Clip content (2026-10-12, "giống figma"): a frame that clips is a Stack with clip; the page frame's own clipping (the
// screen's) is not read (figmaReadCode leaves it off the root).
{
  const frame = { type: "FRAME", name: "Clip", width: 1440, layout: { mode: "VERTICAL", gap: 16, padding: [0, 0, 0, 0] }, children: [{ type: "FRAME", name: "Strip", clip: true, layout: { mode: "HORIZONTAL", gap: 8, padding: [0, 0, 0, 0] }, children: [{ type: "TEXT", name: "A", characters: "A" }, { type: "TEXT", name: "B", characters: "B" }] }] };
  const pulledClip = pageFromFigma(frame, { mapping }).text;
  const page = unnamed(pulledClip);
  ok("Clip content: a clipping frame is a Stack with clip, the page's Stack has none", /<Stack direction="row" gap="xs" align="start" clip>/.test(page) && /<Screen[^>]*>\s*<Stack>/.test(page));
  ok("a frame's own name comes back, a text named by its words does not (layer-meta.mjs)", pulledClip.includes('data-name="Strip"') && !/data-name="[AB]"/.test(pulledClip));
  ok("Clip content: figmaReadCode reads clipsContent, never on the page frame", /if \(!root && own\("clipsContent"\) === true\) out\.clip = true;/.test(figmaReadCode("1:2")));
  // Figma throws on a property a node type lacks (pointCount on a VECTOR, clipsContent or constraints on a GROUP; the
  // live Zen file 2026-10-19): the reader asks first.
  const readCode = figmaReadCode("1:2");
  ok("figmaReadCode reads shape and group properties only where the node has them", /pointCount: own\("pointCount"\)/.test(readCode) && /"constraints" in child/.test(readCode) && !/node\.pointCount|child\.constraints\.horizontal/.test(readCode));
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
  // A photo cell without its picture: figma-push draws it as an Avatar-Cell with a Square Avatar (2026-10-14).
  const square = JSON.parse(JSON.stringify(frame));
  square.children[0].rows.forEach((row) => { row.cells[1].parts[0].props.Shape = "Square"; });
  const photos = pageFromFigma(square, { mapping }).text;
  ok("table: an Avatar-Cell with a Square Avatar is a photo column; the square is not a row's override", /content: "photo"/.test(photos) && photos.includes('"Row[row-2]/member/Avatar": { theme: "green", children: "BX" }') && !/shape: "square"/.test(photos));
}

// Charts (chart family phase 2, 2026-10-14; figma-charts.mjs), as figmaReadCode reads them: a ❖ Chart instance is its
// properties, `headingHidden` and the items its Segmented shows. A Card (or a Chart/Chart-Card, read as its Card)
// holding a chart whose Heading shows is a ChartCard with the header's props; a chart whose Heading is hidden is the
// chart alone; the data is the Studio palette sample's.
{
  const cardSet = [...mapping.sets.values()].find((set) => set.code === "Card");
  const chart = (name, id, props, extra = {}) => ({ type: "INSTANCE", id, name, set: { id, name }, props, ...extra });
  const header = { "Show Icon": true, Icon: "icon-line-chart-up-line", Title: "Billable hours", "Show Description": true, Description: "Logged by team, 2026", "Show Value": true, Value: "11,480 h", "Show Ranges": true, "Show Open": true };
  const ranges = [{ text: "Month", props: { Select: "No" } }, { text: "Quarter", props: { Select: "Yes" } }];
  const frame = {
    type: "FRAME", name: "Charts", width: 1440, layout: { mode: "VERTICAL", gap: 16, padding: [0, 0, 0, 0] },
    children: [
      { type: "INSTANCE", id: "9:1", name: "Card", set: { id: cardSet.id, name: cardSet.name }, props: { Theme: "Border", Spacing: "Medium", Active: "No", "Sub-Action": false }, slots: [{ id: "9:2", name: "Content", children: [chart("Chart/Area-Chart", "15484:2663", { ...header, "Show Legend": true, Type: "Stacked" }, { ranges })] }] },
      // Chart/Chart-Card read as its Card (Flat by default), its chart a Bar-Chart Horizontal with only a title.
      { type: "INSTANCE", id: "9:3", name: "Chart/Chart-Card", set: { id: cardSet.id, name: cardSet.name }, props: { Theme: "Flat", Spacing: "Medium", Active: "No", "Sub-Action": false }, slots: [{ id: "9:4", name: "Content", children: [chart("Chart/Bar-Chart", "15321:84071", { "Show Icon": false, Title: "Capacity", "Show Description": false, "Show Value": false, "Show Ranges": false, "Show Open": false, "Show Average": true, Orientation: "Horizontal" })] }] },
      chart("Chart/Multi-Line-Chart", "15501:3054", { Title: "x", Sector: "6-Sectors", "Show Average": false }, { headingHidden: true }),
      chart("Chart/Donut-Chart", "15324:80365", { Title: "x", Legend: "Start", Total: "Centre", "Total Label": "Invoiced in Q3 2026", "Total Value": "$296,800" }, { headingHidden: true }),
      chart("Chart/Gauge-Chart", "15486:2467", { Title: "Utilisation", "Show Legend": false }),
      chart("Chart/Grouped-Bar-Chart", "15485:2457", { Title: "x", "Show Legend": false }, { headingHidden: true }),
    ],
  };
  const { text: page, notes: chartNotes } = pageFromFigma(frame, { mapping });
  check("charts: the page is valid dialect", validateDialect(page), []);
  ok("charts: a Card holding a chart with its Heading is a ChartCard: title, icon, description, value, ranges (the picked one), the open button as a toast, the Card's theme", page.includes('<ChartCard title="Billable hours" icon="icon-line-chart-up-line" description="Logged by team, 2026" value="11,480 h" ranges={[{ id: "month", label: "Month" }, { id: "quarter", label: "Quarter" }]} range="quarter" onOpen={proto.toast({ title: "Open report" })} theme="border">'));
  ok("charts: Area Type Stacked with its legend (the stacked default) is the stacked sample", /<AreaChart type="stacked" aria-label="Billable hours per month by team, Apr – Sep 2026"/.test(page) && !/showLegend/.test(page.split("\n").find((line) => line.includes("<AreaChart")) ?? ""));
  ok("charts: Chart/Chart-Card (read as its Flat Card) is a ChartCard with ChartCard's default theme; Bar Horizontal + Show Average", /<ChartCard title="Capacity">\s*<BarChart orientation="horizontal" aria-label="Billable hours per team against capacity, September 2026"[^>]*showAverage \/>/.test(page));
  ok("charts: a chart whose Heading is hidden is the chart alone; Multi-Line Sector 6 has six months", /<LineChart aria-label="Invoiced and collected per month, Apr – Sep 2026"[^>]*data=\{\[\{ label: "Apr"[^\]]*\{ label: "Sep", value: 105700 \}\]\}/.test(page));
  ok("charts: Donut Legend Start, its Total Label kept, the sample's total left to the code", /<DonutChart aria-label="Revenue by client, Q3 2026"[^>]*legendPosition="start" label="Invoiced in Q3 2026" \/>/.test(page));
  ok("charts: a chart with its Heading outside a Card: the chart, and a note that its header is ChartCard's", /<GaugeChart [^>]*showLegend=\{false\}/.test(page) && chartNotes.some((note) => note.startsWith('GaugeChart: its heading (Title "Utilisation") shows in Figma')));
  ok("charts: one note that the data is the Studio's sample", chartNotes.some((note) => note.startsWith("6 charts: the data is the Studio's sample")));
  ok("charts: grouped bars with Show Legend off keep their legend (chart/series-need-legend), with a note", !/<GroupedBarChart [^>]*showLegend/.test(page) && chartNotes.some((note) => /Show Legend is off in Figma; its series need their legend/.test(note)));
  const compiled = compileReact(page, { file: "charts.zen.tsx" }).code;
  check("charts: the compiled page has no usage-harness errors", checkSource(compiled, "Charts.tsx").filter((finding) => finding.severity === "error").map((finding) => `${finding.rule}: ${finding.message}`), []);
  ok("charts: figmaReadCode reads a chart's properties, Heading and Segmented items, and Chart/Chart-Card as its Card", /const readChart = async/.test(figmaReadCode("1:2")) && /set\.name === "Chart\/Chart-Card"/.test(figmaReadCode("1:2")));
}

// Card Theme=Solid and Color (2026-10-14): a Solid or Pale Card keeps its Color as `color`; a Card around a lone chart
// with its Heading (a ChartCard) or a Metric-Inline (a MetricCard) passes it on.
{
  const cardSet = [...mapping.sets.values()].find((set) => set.code === "Card");
  const card = (id, props, children = []) => ({ type: "INSTANCE", id, name: "Card", set: { id: cardSet.id, name: cardSet.name }, props: { Surface: "Default", Spacing: "Medium", Active: "No", "Sub-Action": false, ...props }, slots: [{ id: `${id}-c`, name: "Content", children }] });
  const frame = {
    type: "FRAME", name: "Widgets", width: 1440, layout: { mode: "VERTICAL", gap: 16, padding: [0, 0, 0, 0] },
    children: [
      card("8:1", { Theme: "Solid", Color: "Neutral" }, [{ type: "TEXT", name: "Title", characters: "Invoiced this year", textStyle: "Heading/Subheading" }]),
      card("8:2", { Theme: "Pale", Color: "Violet", Spacing: "Small" }, [{ type: "TEXT", name: "Title", characters: "Design hours", textStyle: "Heading/Subheading" }]),
      card("8:5", { Theme: "Border", Color: "Neutral", Surface: "Flat" }, [{ type: "TEXT", name: "Title", characters: "Hours", textStyle: "Heading/Subheading" }]),
      card("8:3", { Theme: "Solid", Color: "Yellow" }, [{ type: "INSTANCE", id: "8:4", name: "Chart/Line-Chart", set: { id: "6643:63324", name: "Chart/Line-Chart" }, props: { "Show Icon": false, Title: "Revenue", "Show Description": false, "Show Value": false, "Show Ranges": false, "Show Open": false } }]),
    ],
  };
  const { text: page } = pageFromFigma(frame, { mapping });
  check("card colour: the page is valid dialect", validateDialect(page), []);
  ok("card colour: Theme Solid + Color Neutral (the dark widget) is theme=\"solid\" with the default colour left out", /<Card theme="solid">/.test(page));
  ok("card colour: Theme Pale + Color Violet keeps its colour", /<Card theme="pale" color="violet" spacing="small">/.test(page));
  ok("card surface: Theme Border + Surface Flat is surface=\"flat\"", /<Card theme="border" surface="flat">/.test(page));
  ok("card colour: a Solid Yellow Card around a chart with its Heading is a ChartCard that passes its colour on", /<ChartCard title="Revenue" theme="solid" color="yellow">/.test(page));
}

// Figma's own shapes (2026-10-17) come back as Zen Shapes: in a frame without auto layout at their X / Y (a turned
// rectangle by its unrotated box), colours by their variables, the arc from arcData, an arrow from a LINE's cap.
{
  const shapes = {
    type: "FRAME", name: "Shapes", width: 400, height: 300, layout: null,
    children: [
      { type: "FRAME", name: "Canvas", width: 400, height: 300, layout: null, children: [
        { type: "ELLIPSE", name: "Ellipse", shape: { w: 120, h: 120, fill: "Color/Background/Accent/Solid/Default", stroke: null, strokeWeight: 1, strokeAlign: "INSIDE", arc: { startingAngle: 0, endingAngle: Math.PI * 1.5, innerRadius: 0.5 }, rotation: 0, opacity: 1 }, absolute: { x: 20, y: 30, w: 120, h: 120, pw: 400, ph: 300, cx: "MIN", cy: "MIN", free: true } },
        { type: "RECTANGLE", name: "Rectangle", shape: { w: 100, h: 60, fill: "Color/Background/Support/Neutral/Soft", stroke: "Color/Border/Neutral/Solid/Default", strokeWeight: 2, strokeAlign: "INSIDE", radius: 12, radiusVar: "Corner-Radius/Base", rotation: 90, opacity: 0.8 }, absolute: { x: 180, y: 110, w: 100, h: 60, pw: 400, ph: 300, cx: "MIN", cy: "MIN", free: true } },
        { type: "LINE", name: "Arrow", shape: { w: 140, h: 0, fill: null, stroke: "Color/Border/Neutral/Solid/Default", strokeWeight: 1, strokeAlign: "CENTER", cap: "ARROW_LINES", rotation: 0, opacity: 1 }, absolute: { x: 20, y: 200, w: 140, h: 0, pw: 400, ph: 300, cx: "MIN", cy: "MIN", free: true } },
        { type: "STAR", name: "Star", shape: { w: 90, h: 90, fill: "#fc0", stroke: null, strokeWeight: 1, pointCount: 6, innerRadius: 0.382, rotation: 0, opacity: 1 }, absolute: { x: 280, y: 160, w: 90, h: 90, pw: 400, ph: 300, cx: "MIN", cy: "MIN", free: true } },
        // Figma's own arrow (⇧L; the direct paste writes the same): a two-vertex VECTOR capped at its end.
        { type: "VECTOR", name: "Arrow 2", shape: { w: 120, h: 0, fill: null, stroke: "Color/Border/Neutral/Solid/Default", strokeWeight: 2, strokeAlign: "CENTER", cap: null, arrowLine: true, paths: [{ windingRule: "NONE", data: "M 0 0 L 120 0" }], rotation: 30, opacity: 1 }, absolute: { x: 40, y: 260, w: 120, h: 0, pw: 400, ph: 300, cx: "MIN", cy: "MIN", free: true } },
      ] },
    ],
  };
  const pulled = pageFromFigma(shapes, { mapping });
  const shapeLines = pulled.text.split("\n").filter((line) => line.includes("<Shape"));
  check("shapes: five Shapes", shapeLines.length === 5, true);
  check("shapes: ellipse arc and fill", shapeLines.some((line) => /type="ellipse"/.test(line) && /arcSweep=\{75\}/.test(line) && /arcRatio=\{50\}/.test(line) && /fill="accent-solid"/.test(line) && /insetLeft=\{20\}/.test(line) && /insetTop=\{30\}/.test(line)), true);
  check("shapes: turned rectangle at its unrotated box", shapeLines.some((line) => /type="rectangle"/.test(line) && /insetLeft=\{160\}/.test(line) && /insetTop=\{30\}/.test(line) && /rotation=\{90\}/.test(line) && /radius="md"/.test(line) && /stroke="neutral-solid"/.test(line) && /strokeWeight=\{2\}/.test(line) && /opacity=\{80\}/.test(line) && !/fill=/.test(line)), true);
  check("shapes: arrow from a LINE's cap", shapeLines.some((line) => /type="arrow"/.test(line) && /width=\{140\}/.test(line) && !/height=/.test(line) && !/stroke=/.test(line)), true);
  check("shapes: arrow from Figma's arrow vector (⇧L)", shapeLines.some((line) => /type="arrow"/.test(line) && /width=\{120\}/.test(line) && /rotation=\{30\}/.test(line) && /strokeWeight=\{2\}/.test(line) && !/ d=/.test(line)), true);
  check("shapes: star count, unbound fill noted", shapeLines.some((line) => /type="star"/.test(line) && /pointCount=\{6\}/.test(line)) && pulled.notes.some((note) => /"Star": its fill/.test(note)), true);
  check("shapes: no drawings note", !pulled.notes.some((note) => /drawings/.test(note)), true);
  check("shapes: the page passes the dialect", validateDialect(pulled.text).length === 0, true);
}

// F8. Image fills as figmaReadCode reads them (figma-image.mjs): a shape's and a frame's picture come back by the src
// the push kept in plugin data, with Crop / Tile; a picture made in Figma (no src) is noted, and its shape stays colourless.
{
  const frame = {
    type: "FRAME", name: "Pictures", width: 400, height: 300, layout: null,
    children: [
      { type: "RECTANGLE", name: "Bridge", shape: { w: 200, h: 100, fill: null, stroke: null, strokeWeight: 1, rotation: 0, opacity: 1, imageFill: { src: "zen-asset:bridge-1a2b3c4d.webp", scaleMode: "CROP", crop: { x: 0.1, y: 0, width: 0.8, height: 1 } } }, absolute: { x: 10, y: 10, w: 200, h: 100, pw: 400, ph: 300, cx: "MIN", cy: "MIN", free: true } },
      { type: "ELLIPSE", name: "Figma photo", shape: { w: 80, h: 80, fill: null, stroke: null, strokeWeight: 1, rotation: 0, opacity: 1, imageFill: { scaleMode: "FILL" } }, absolute: { x: 220, y: 10, w: 80, h: 80, pw: 400, ph: 300, cx: "MIN", cy: "MIN", free: true } },
      { type: "FRAME", name: "Hero", width: 300, height: 120, layout: { mode: "VERTICAL", gap: 0, padding: [0, 0, 0, 0] }, imageFill: { src: "zen-media:site-cafe", scaleMode: "TILE", scale: 0.5 }, children: [{ type: "TEXT", name: "Title", characters: "Hello" }] },
    ],
  };
  const pulled = pageFromFigma(frame, { mapping });
  const lines = pulled.text.split("\n");
  ok("image fill: a shape's crop comes back, no fill colour", lines.some((line) => /<Shape [^>]*image="zen-asset:bridge-1a2b3c4d\.webp" imageFit="crop" imageCrop=\{\{ x: 10, y: 0, width: 80, height: 100 \}\}/.test(line) && !/fill=/.test(line)));
  ok("image fill: a picture made in Figma is noted, its shape stays without a colour", pulled.notes.some((note) => /"Figma photo": its image fill was made in Figma/.test(note)) && lines.some((line) => /type="ellipse"/.test(line) && !/fill=|image=/.test(line)));
  ok("image fill: a frame's tiled picture comes back on the Stack", /<Stack [^>]*image="zen-media:site-cafe" imageFit="tile" imageScale=\{50\}/.test(pulled.text));
  check("image fill: the page passes the dialect", validateDialect(pulled.text).length === 0, true);
}

// F9: a Figma VECTOR comes back as Shape type="vector" (its vectorPaths in its box, its winding rule, a centred stroke
// left out as the default); a path Zen cannot read is left out with a note.
{
  const vectors = {
    type: "FRAME", name: "Vectors", width: 400, height: 300, layout: null,
    children: [
      { type: "FRAME", name: "Canvas", width: 400, height: 300, layout: null, children: [
        { type: "VECTOR", name: "Wave", shape: { w: 80, h: 40, fill: null, stroke: "Color/Border/Neutral/Solid/Default", strokeWeight: 2, strokeAlign: "CENTER", rotation: 0, opacity: 1, paths: [{ windingRule: "EVENODD", data: "M 0 40 C 20 0 60 0 80 40 Z" }] }, absolute: { x: 10, y: 20, w: 80, h: 40, pw: 400, ph: 300, cx: "MIN", cy: "MIN", free: true } },
        { type: "VECTOR", name: "Odd", shape: { w: 10, h: 10, fill: null, stroke: null, strokeWeight: 1, strokeAlign: "CENTER", rotation: 0, opacity: 1, paths: [{ windingRule: "NONZERO", data: "M 0 0 A 5 5 0 0 1 10 10" }] }, absolute: { x: 0, y: 0, w: 10, h: 10, pw: 400, ph: 300, cx: "MIN", cy: "MIN", free: true } },
      ] },
    ],
  };
  const pulled = pageFromFigma(vectors, { mapping });
  const line = pulled.text.split("\n").find((each) => each.includes('type="vector"')) ?? "";
  check("vectors: the path, its box and winding rule; stroke weight; no default stroke or align", [/d="M 0 40 C 20 0 60 0 80 40 Z"/.test(line), /viewBox="0 0 80 40"/.test(line), /fillRule="evenodd"/.test(line), /strokeWeight=\{2\}/.test(line), /stroke=|strokeAlign=|fill=/.test(line), /insetLeft=\{10\}/.test(line)], [true, true, true, true, false, true]);
  check("vectors: an arc command is left out, noted", [pulled.text.split('type="vector"').length, pulled.notes.some((note) => /"Odd": its vector path/.test(note))], [2, true]);
  check("vectors: the page passes the dialect", validateDialect(pulled.text).length === 0, true);
}

// Frames as figmaReadCode reads them (stroke weight per side, four corners, effect style, opacity, rotation, mirror):
// one Stack or Grid with its look (decision 2, plan 2026-10-18); a value Zen has no token for is noted.
{
  const text = (value) => ({ type: "TEXT", name: value, characters: value, textStyle: "Body/Base/Regular" });
  const column = { mode: "VERTICAL", gap: 12, gapVar: "Spacing/Gap/Small", padding: [16, 16, 16, 16], paddingVar: "Spacing/Padding/Medium" };
  const looks = {
    type: "FRAME", name: "Looks", width: 400, height: 600, layout: { mode: "VERTICAL", gap: 16, padding: [0, 0, 0, 0] },
    children: [
      { type: "FRAME", name: "Card", fill: "Color/Background/Surface/Default", stroke: "Color/Border/Neutral/Pale/Default", strokeWeights: [0, 0, 1, 0], radii: [16, 16, 16, 16], radiiVars: ["Corner-Radius/Large", "Corner-Radius/Large", "Corner-Radius/Large", "Corner-Radius/Large"], opacity: 0.5, rotation: 30, layout: column, children: [text("One"), text("Two")] },
      { type: "FRAME", name: "Mirrored", fill: "Background/Neutral/Subtle/Default", effectStyle: "Effect/Overlay", flip: "horizontal", stroke: "Border/Neutral/Subtle/Default", strokeWeights: [2, 2, 2, 2], dash: [2, 2], radii: [20, 20, 4, 20], radiiVars: ["Corner-Radius/XLarge", "Corner-Radius/XLarge", "Corner-Radius/XSmall", "Corner-Radius/XLarge"], layout: column, children: [text("Three"), text("Four")] },
      { type: "FRAME", name: "Odd", fill: "Background/Accent/Solid/Default", stroke: "unbound", strokeWeights: [1, 1, 1, 1], radii: [13, 13, 13, 13], radiiVars: [null, null, null, null], effectStyle: "Effect/Popover", layout: column, children: [text("Five"), text("Six")] },
    ],
  };
  const pulled = pageFromFigma(looks, { mapping });
  const line = (name) => pulled.text.split("\n").find((candidate) => candidate.includes("<Stack") && candidate.includes(name)) ?? "";
  const lines = pulled.text.split("\n").filter((candidate) => /<(Stack|Box|Grid)\b/.test(candidate));
  check("frame looks: three Stacks, no Box around them", [lines.filter((candidate) => candidate.includes("<Stack")).length >= 3, lines.some((candidate) => candidate.includes("<Box"))], [true, false]);
  check("frame looks: fill, one-sided stroke, corners, opacity, rotation", /surface="surface"/.test(line("opacity")) && /border="pale"/.test(line("opacity")) && /borderSides="bottom"/.test(line("opacity")) && /radius="lg"/.test(line("opacity")) && /opacity=\{50\}/.test(line("opacity")) && /rotation=\{30\}/.test(line("opacity")), true);
  check("frame looks: blur, dashed subtle stroke 2px, a differing corner, flip", /surface="subtle"/.test(line("flip")) && /effectStyle="Effect\/Overlay"/.test(line("flip")) && /borderStyle="dashed"/.test(line("flip")) && /borderWeight=\{2\}/.test(line("flip")) && /radius="xl"/.test(line("flip")) && /radiusBottomRight="xs"/.test(line("flip")) && /flip="horizontal"/.test(line("flip")), true);
  check("frame looks: no token → noted, left out", [/Frame "Odd": its fill/.test(pulled.notes.join("\n")), /Frame "Odd": its stroke is no colour variable/.test(pulled.notes.join("\n")), /Frame "Odd": a corner radius/.test(pulled.notes.join("\n")), /Frame "Odd": its effect style Effect\/Popover/.test(pulled.notes.join("\n"))], [true, true, true, true]);
  check("frame looks: the page passes the dialect", validateDialect(pulled.text).length === 0, true);
}

// A Figma GROUP comes back as a Zen group (Box group) at its X / Y, its layers at theirs inside it (the reader wrote
// them relative to the group), its opacity kept.
{
  const grouped = {
    type: "FRAME", name: "Groups", width: 400, height: 300, layout: null,
    children: [
      { type: "FRAME", name: "Canvas", width: 400, height: 300, layout: null, children: [
        { type: "GROUP", name: "Group 1", width: 120, height: 60, layout: null, opacity: 0.5, absolute: { x: 20, y: 30, w: 120, h: 60, pw: 400, ph: 300, cx: "MIN", cy: "MIN", free: true }, children: [
          { type: "ELLIPSE", name: "Ellipse", shape: { w: 40, h: 40, fill: "Color/Background/Accent/Solid/Default", stroke: null, strokeWeight: 1, strokeAlign: "INSIDE", rotation: 0, opacity: 1 }, absolute: { x: 0, y: 0, w: 40, h: 40, pw: 120, ph: 60, cx: "MIN", cy: "MIN", free: true } },
          { type: "ELLIPSE", name: "Ellipse", shape: { w: 40, h: 40, fill: "Color/Background/Accent/Solid/Default", stroke: null, strokeWeight: 1, strokeAlign: "INSIDE", rotation: 0, opacity: 1 }, absolute: { x: 80, y: 20, w: 40, h: 40, pw: 120, ph: 60, cx: "MIN", cy: "MIN", free: true } },
        ] },
      ] },
    ],
  };
  const pulled = pageFromFigma(grouped, { mapping });
  const box = pulled.text.split("\n").find((line) => /<Box[^>]*group/.test(line)) ?? "";
  check("groups: a Box group at its X / Y, sized, its opacity", [/position="absolute"/.test(box), /insetLeft=\{20\}/.test(box), /insetTop=\{30\}/.test(box), /width=\{120\}/.test(box), /height=\{60\}/.test(box)], [true, true, true, true, true]);
  check("groups: its layers at their X / Y inside it", pulled.text.split("\n").filter((line) => /type="ellipse"/.test(line)).map((line) => [/insetLeft=\{(\d+)\}/.exec(line)?.[1], /insetTop=\{(\d+)\}/.exec(line)?.[1]]), [["0", "0"], ["80", "20"]]);
  check("groups: the page passes the dialect", validateDialect(pulled.text).length === 0, true);
  // A mirrored Star (Zen flip, ⇧H) as the reader writes it from the live file (2026-10-19): its X is the mirrored box's
  // own corner, its right edge; it comes back flipped at its unflipped box.
  const flipped = structuredClone(grouped);
  flipped.children[0].children[0].children[1] = { type: "STAR", name: "Star", shape: { w: 48, h: 48, fill: "Color/Background/Accent/Solid/Default", stroke: null, strokeWeight: 1, strokeAlign: "INSIDE", pointCount: 5, innerRadius: 0.382, rotation: 0, flip: "horizontal", opacity: 1 }, absolute: { x: 120, y: 0, w: 48, h: 48, pw: 120, ph: 60, cx: "MIN", cy: "MIN", free: true } };
  const star = pageFromFigma(flipped, { mapping }).text.split("\n").find((line) => /type="star"/.test(line)) ?? "";
  check("groups: a mirrored shape comes back flipped at its own box", [/flip="horizontal"/.test(star), /insetLeft=\{72\}/.test(star), /insetTop=\{0\}/.test(star), /rotation=/.test(star)], [true, true, true, false]);
  // A group pinned out of an auto layout (Ignore auto layout, the live Zen file 2026-10-19): px X / Y, not the nearest
  // spacing step in a wrapper Stack.
  const pinned = structuredClone(grouped);
  pinned.children[0].layout = { mode: "VERTICAL" };
  pinned.children[0].children[0].absolute = { x: 16, y: 80, w: 120, h: 60, pw: 400, ph: 300, cx: "MIN", cy: "MIN" };
  const pinnedText = pageFromFigma(pinned, { mapping }).text;
  const pinnedBox = pinnedText.split("\n").find((line) => /<Box[^>]*group/.test(line)) ?? "";
  check("groups: a group out of an auto layout keeps px X / Y", [/insetLeft=\{16\}/.test(pinnedBox), /insetTop=\{80\}/.test(pinnedBox), /constraintX|insetLeft="/.test(pinnedText)], [true, true, false]);
  // Figma's mask (isMask on the group's bottom layer, read by maskOf): a Zen mask group; a mask higher up is noted.
  const masked = structuredClone(grouped);
  masked.children[0].children[0].children[0].isMask = true;
  const maskBox = pageFromFigma(masked, { mapping }).text.split("\n").find((line) => /<Box[^>]*group/.test(line)) ?? "";
  check("groups: a GROUP whose bottom layer is a mask is a Box group mask", /\bmask\b/.test(maskBox), true);
  const high = structuredClone(grouped);
  high.children[0].children[0].children[1].isMask = true;
  const highPull = pageFromFigma(high, { mapping });
  check("groups: a mask that is not the bottom layer is left unmasked, with a note", [/\bmask\b/.test(highPull.text.split("\n").find((line) => /<Box[^>]*group/.test(line)) ?? ""), highPull.notes.some((note) => /mask is not its bottom layer/.test(note))], [false, true]);
  const inFlow = structuredClone(grouped);
  inFlow.children[0].layout = { mode: "VERTICAL" };
  inFlow.children[0].children = [{ type: "FRAME", name: "Row", layout: { mode: "HORIZONTAL" }, children: [{ ...grouped.children[0].children[0].children[0], isMask: true, absolute: undefined }, { ...grouped.children[0].children[0].children[1], absolute: undefined }] }];
  check("groups: a mask in an auto layout frame is noted", pageFromFigma(inFlow, { mapping }).notes.some((note) => /mask in an auto layout frame/.test(note)), true);
  check("figmaReadCode reads isMask in its own function", /const maskOf = \(out, child\) =>/.test(figmaReadCode("1:2")) && /maskOf\(read_, child\)/.test(figmaReadCode("1:2")), true);
  check("figmaReadCode writes a GROUP's width and height", /if \(node\.type === "GROUP"\) Object\.assign\(out, \{ width:/.test(figmaReadCode("1:2")), true);
}

// F9b: a Figma BOOLEAN_OPERATION comes back as a Zen boolean group: its result (fill geometry) as d, its operation,
// its shapes at their X / Y inside it.
{
  const booleanFrame = {
    type: "FRAME", name: "Booleans", width: 400, height: 300, layout: null,
    children: [
      { type: "FRAME", name: "Canvas", width: 400, height: 300, layout: null, children: [
        { type: "BOOLEAN_OPERATION", name: "Subtract", shape: { w: 120, h: 60, fill: "Color/Background/Accent/Solid/Default", stroke: null, strokeWeight: 1, strokeAlign: "INSIDE", rotation: 0, opacity: 1, operation: "SUBTRACT", paths: [{ windingRule: "NONZERO", data: "M 0 0 L 120 0 L 120 60 L 0 60 Z" }] }, absolute: { x: 20, y: 30, w: 120, h: 60, pw: 400, ph: 300, cx: "MIN", cy: "MIN", free: true }, children: [
          { type: "RECTANGLE", name: "Rectangle", shape: { w: 120, h: 60, fill: null, stroke: null, strokeWeight: 1, strokeAlign: "INSIDE", rotation: 0, opacity: 1 }, absolute: { x: 0, y: 0, w: 120, h: 60, pw: 120, ph: 60, cx: "MIN", cy: "MIN", free: true } },
          { type: "ELLIPSE", name: "Ellipse", shape: { w: 60, h: 60, fill: null, stroke: null, strokeWeight: 1, strokeAlign: "INSIDE", rotation: 0, opacity: 1 }, absolute: { x: 80, y: 0, w: 60, h: 60, pw: 120, ph: 60, cx: "MIN", cy: "MIN", free: true } },
        ] },
      ] },
    ],
  };
  const pulled = pageFromFigma(booleanFrame, { mapping });
  const head = pulled.text.split("\n").find((line) => line.includes('type="boolean"')) ?? "";
  check("booleans: a boolean group with its operation, result and fill, at its X / Y", [/operation="subtract"/.test(head), /d="M 0 0 L 120 0 L 120 60 L 0 60 Z"/.test(head), /viewBox="0 0 120 60"/.test(head), /fill="accent-solid"/.test(head), /insetLeft=\{20\}/.test(head)], [true, true, true, true, true]);
  check("booleans: its shapes inside it", pulled.text.split("\n").filter((line) => /type="(rectangle|ellipse)"/.test(line)).map((line) => /insetLeft=\{(\d+)\}/.exec(line)?.[1]), ["0", "80"]);
  check("booleans: the page passes the dialect", validateDialect(pulled.text).length === 0, true);
}

// The live read (2026-10-20): a QA frame the Zen plugin imported from a Studio page with its own components, read back
// by figmaReadCode through use_figma. Words, colour and visibility come from instance.overrides; the Toolbar's nested
// Chip switched to Large is found against the main (Figma lists no override for it); slot content differs from the
// main's; the untouched Panel and Toolbar bring nothing back.
{
  const live = JSON.parse(fs.readFileSync(new URL("./fixtures/figma-overrides.json", import.meta.url), "utf8"));
  const pulled = pageFromFigma(live.frame, { mapping });
  const uses = pulled.text.split("\n").map((line) => line.trim()).filter((line) => line.startsWith("<Use "));
  check("overrides (live): each instance's overrides and slot content, by the Studio's layer paths", uses, [
    '<Use of="tag" overrides={{ Icon: { hidden: true }, Text: { children: "Hi", tone: "accent-base" } }} />',
    '<Use of="panel" slots={{ Content: <Text>Filled</Text> }} />',
    '<Use of="chip" />',
    '<Use of="toolbar" overrides={{ Chip: { "variant.Size": "Large" } }} />',
    '<Use of="panel" />',
    '<Use of="toolbar" />',
  ]);
  check("overrides (live): the components import from the builder", pulled.text.split("\n").filter((line) => line.startsWith("import ")), [
    'import { Board, Component, ComponentSet, Screen, Use, proto } from "@zen-ds/react/builder";',
    'import { Icon, Stack, Text } from "@zen-ds/react";',
  ]);
  check("overrides (live): the page passes the dialect with the Zen components", validateDialect(pulled.text, { components: new Set(["Icon", "Stack", "Text"]) }), []);
  check("overrides (live): no notes", pulled.notes, []);
}

// The live read (2026-10-20): overrides inside nested instances of the page's own components (figma-push layerOverrides
// through them), read back by Figma's child indices: the layers inside a nested instance switched to another variant
// are that variant's (Pill/Text in Bold), in its own variant otherwise (Pill/Text in Plain).
{
  const live = JSON.parse(fs.readFileSync(new URL("./fixtures/figma-deep-overrides.json", import.meta.url), "utf8"));
  const pulled = pageFromFigma(live.frame, { mapping });
  const uses = pulled.text.split("\n").map((line) => line.trim()).filter((line) => line.startsWith('<Use of="toolbar"'));
  check("deep overrides (live): paths through the nested instances, in the variant they show", uses, [
    '<Use of="toolbar" overrides={{ "Pill/Text": { children: "Bolder" }, "Tag/Icon": { hidden: true }, "Tag/Text": { children: "Inner" }, Pill: { "variant.Tone": "Bold" } }} />',
    '<Use of="toolbar" overrides={{ "Pill/Text": { children: "Plainer" } }} />',
    '<Use of="toolbar" />',
  ]);
  check("deep overrides (live): no notes, valid dialect", [pulled.notes, validateDialect(pulled.text, { components: new Set(["Icon", "Stack", "Text"]) })], [[], []]);
}

// The live read (2026-10-20): Zen components in a page's own mains, overridden by an instance: a Button's level and
// label, a Badge's theme (only what differs from the main's own), a Pagination's Next by its nest() name (only its
// level: its own size and icon are the main's), an untouched instance bringing nothing back.
{
  const live = JSON.parse(fs.readFileSync(new URL("./fixtures/figma-library-layers.json", import.meta.url), "utf8"));
  const pulled = pageFromFigma(live.frame, { mapping });
  const uses = pulled.text.split("\n").map((line) => line.trim()).filter((line) => line.startsWith("<Use "));
  check("library layers (live): a Zen component's props and label, and its own nested layer, by path", uses, [
    '<Use of="cta" overrides={{ Button: { level: "secondary", children: "Buy" }, Badge: { theme: "red" } }} />',
    '<Use of="pager" overrides={{ "Pagination/Next": { level: "secondary" } }} />',
    '<Use of="cta" />',
  ]);
  check("library layers (live): no notes, valid dialect", [pulled.notes, validateDialect(pulled.text, { components: new Set(["Badge", "Button", "Pagination", "Stack"]) })], [[], []]);
}

if (failures.length) {
  console.error(`✗ figma-pull selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}\n--- page ---\n${text}\n--- notes ---\n${notes.join("\n")}`);
  process.exit(1);
}
console.log(`✓ figma-pull selftest: ${passed} checks pass.`);
