#!/usr/bin/env node
// Self-test of a builder Screen's master layout (tools/studio/screen-frame.mjs): pages made before it move their
// Screen's Sidebar and Page header into the root AppShell, once, without a second Sidebar or Page header, and keep every
// element's id. The part switches are checked on the engine in builder.selftest.mjs. Run: node tools/studio/screen-frame.selftest.mjs
import { parsePage, validateDialect } from "./dialect.mjs";
import { docFromText, printPage, withoutIds } from "./doc.mjs";
import { SCREEN_CHROME, screenChromeCode } from "./screen-chrome.mjs";
import { LEGACY_FRAME, migrateScreenFrame } from "./screen-frame.mjs";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};
const FILE = "local:orders.zen.tsx";
const components = new Set(["AppShell", "AppShellAccount", "AppShellHeader", "BottomNavigation", "Card", "PageHeader", "Sidebar", "SidebarMenuItem", "Stack", "Text", "TopNavigation"]);
const kids = (node) => (node?.children ?? []).filter((child) => child.kind === "element");
const screenOf = (text) => parsePage(text, { components }).board.children[0];
const count = (text, name) => (text.match(new RegExp(`<${name}\\b`, "g")) ?? []).length;
const packageImport = (text) => /import \{ ([^}]+) \} from "@zen-ds\/react";/.exec(text)?.[1].split(", ") ?? [];

/** A blank page as the Studio wrote it before the master layout: the four frame parts as the Screen's props. */
function legacyPage({ parts = SCREEN_CHROME.map((part) => part.prop), content = ['<Stack gap="md" padding="xl">', '  <Text tone="base">Start building here: add components from Assets.</Text>', "</Stack>"], extra = [] } = {}) {
  const attrs = parts.map((prop) => `        ${prop}={${screenChromeCode(prop, "Orders").split("\n").map((line, index) => (index ? `        ${line}` : line)).join("\n")}}`);
  const names = [...new Set(["Stack", "Text", ...extra, ...parts.flatMap((prop) => [...screenChromeCode(prop, "Orders").matchAll(/<([A-Z]\w*)/g)].map((match) => match[1]))])].sort();
  return [
    '// @zen-page {"format":1,"title":"Orders"}',
    'import { Board, Screen, proto } from "@zen-ds/react/builder";',
    `import { ${names.join(", ")} } from "@zen-ds/react";`,
    "",
    "export const mock = {};",
    "",
    "export default function Page() {",
    "  return (",
    "    <Board>",
    '      <Screen id="screen-1" title="Orders" device="desktop"',
    ...attrs.map((line, index) => (index === attrs.length - 1 ? `${line}>` : line)),
    ...content.map((line) => `        ${line}`),
    "      </Screen>",
    "    </Board>",
    "  );",
    "}",
    "",
  ].join("\n");
}

// A blank page from before: Sidebar and Page header go into a new AppShell around the content; the phone's bars stay.
{
  const old = legacyPage();
  check("the old page is valid", validateDialect(old, { components }), []);
  const moved = migrateScreenFrame(old, { file: FILE });
  const screen = screenOf(moved.text);
  const shell = kids(screen)[0];
  check("moved, nothing dropped", [moved.changed, moved.notes], [true, []]);
  check("the Screen keeps the mobile layout's bars only", SCREEN_CHROME.map((part) => screen.props[part.prop]?.node?.name ?? null), [null, null, "TopNavigation", "BottomNavigation"]);
  check("one root AppShell: the Sidebar, the Page header as its header's Main row, the content inside", [kids(screen).map((child) => child.name), shell.props.sidebar?.node?.name, shell.props.header?.node?.props.main?.node?.name, kids(shell).map((child) => child.name)], [["AppShell"], "Sidebar", "PageHeader", ["Stack"]]);
  check("still valid, AppShell imported", [validateDialect(moved.text, { components }), packageImport(moved.text).includes("AppShell")], [[], true]);
  check("the Sidebar's rows kept their indent under it", /\n {10}sidebar=\{<Sidebar aria-label="Main" selectedId="home">\n {12}<SidebarMenuItem id="home"/.test(moved.text), true);
  check("a second run changes nothing", migrateScreenFrame(moved.text, { file: FILE }).changed, false);
}

// The broken page (user, 2026-10-15: "trang Dashboard tôi vừa tạo từ template bị lỗi"): a template's AppShell, with its
// own Sidebar and Page header, beside the Screen's. One of each is left, the template's.
{
  const template = [
    "<AppShell",
    '  sidebar={<Sidebar aria-label="Main" selectedId="dashboard">',
    '    <SidebarMenuItem id="dashboard" label="Dashboard" icon="icon-home-03-line" />',
    "  </Sidebar>}",
    '  headerActions={<AppShellAccount name="Khoa Dang" />}',
    ">",
    '  <Stack gap="lg" padding="xl">',
    '    <PageHeader title="Dashboard" />',
    "    <Card />",
    "  </Stack>",
    "</AppShell>",
  ];
  const old = legacyPage({ content: template, extra: ["AppShell", "AppShellAccount", "Card"] });
  check("the broken page draws two Sidebars and two Page headers", [count(old, "Sidebar"), count(old, "PageHeader"), count(old, "AppShell")], [2, 2, 1]);
  const moved = migrateScreenFrame(old, { file: FILE });
  check("one Sidebar, one Page header, one AppShell", [count(moved.text, "Sidebar"), count(moved.text, "PageHeader"), count(moved.text, "AppShell")], [1, 1, 1]);
  const shell = kids(screenOf(moved.text))[0];
  check("the template's own are kept", [shell.props.sidebar?.node?.props.selectedId, "sections" in shell.props], [{ kind: "literal", value: "dashboard" }, false]);
  check("each drop is noted", moved.notes.length, 2);
  check("still valid; the imports the page still reads", [validateDialect(moved.text, { components }), ["Sidebar", "SidebarMenuItem", "PageHeader", "AppShell"].every((name) => packageImport(moved.text).includes(name))], [[], true]);
}

// Only some parts left, in any order: a Screen whose Sidebar was switched back on after its Top navigation (the prop then
// follows a component holding ">").
{
  const old = legacyPage({ parts: ["topNavigation", "sidebar"] });
  check("the quick look still sees it", LEGACY_FRAME.test(old), true);
  const moved = migrateScreenFrame(old, { file: FILE });
  const shell = kids(screenOf(moved.text))[0];
  check("the Sidebar moved, no Page header made", [moved.changed, shell?.name, Object.keys(shell?.props ?? {})], [true, "AppShell", ["sidebar"]]);
  const headerOnly = migrateScreenFrame(legacyPage({ parts: ["header"] }), { file: FILE });
  check("a Page header alone: the AppShell header's Main row; Sidebar imports untouched", [kids(screenOf(headerOnly.text))[0]?.props.header?.node?.props.main?.node?.name, packageImport(headerOnly.text).filter((name) => /^Sidebar/.test(name))], ["PageHeader", []]);
}

// A page already on the master layout, or without a Screen frame: unchanged, the same text.
{
  const done = migrateScreenFrame(legacyPage(), { file: FILE }).text;
  check("on the master layout: unchanged", migrateScreenFrame(done, { file: FILE }), { text: done, changed: false, notes: [] });
  const bare = legacyPage({ parts: [] });
  check("no frame: unchanged", migrateScreenFrame(bare, { file: FILE }).changed, false);
}

// The move on the print with ids (builder/localApi.ts moveScreenFrame): the same page, every element keeps its id.
{
  const old = legacyPage();
  const { doc } = docFromText(old, { components });
  const tracked = migrateScreenFrame(printPage(doc, { ids: true }), { file: FILE });
  const plain = migrateScreenFrame(old, { file: FILE });
  const read = docFromText(tracked.text, { components }).doc;
  check("the print with ids moves to the same page", JSON.stringify(withoutIds(read)) === JSON.stringify(withoutIds(docFromText(plain.text, { components }).doc)), true);
  const ids = (node, out = new Map()) => { if (node?.kind === "element") { out.set(`${node.name}:${JSON.stringify(node.props.id ?? node.props.title ?? node.props.label ?? "")}`, node.id); for (const value of Object.values(node.props)) if (value?.kind === "element") ids(value.node, out); for (const child of node.children ?? []) ids(child, out); } return out; };
  const before = ids(doc.board);
  const after = ids(read.board);
  check("every element keeps its id (the AppShell is new)", [...before].every(([key, id]) => after.get(key) === id), true);
}

if (failures.length) {
  console.error(`screen-frame selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ screen-frame selftest: ${passed} checks pass.`);
