#!/usr/bin/env node
// The edit engine on a builder page kept in the browser ("local:<id>.zen.tsx", Studio builder GĐ2 M1): the same ops as
// on example code, results that stay valid pages. Run: node tools/studio/builder.selftest.mjs
import { dataFieldEdit } from "./data-source.mjs";
import { SCREEN_CHROME, boardFrames, frameCode, freeFrameId, newPageText, parsePage, protoCode, screenLayout, validateDialect } from "./dialect.mjs";
import { FRAME_PARTS, screenFrameCode } from "./screen-chrome.mjs";
import { applyOps, describeElement, sha1 } from "./jsx-source.mjs";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};
const FILE = "local:checkout.zen.tsx";
const componentModules = new Map([["Dialog", "Dialog"], ["Button", "Button"], ["Stack", "Layout"], ["Text", "Text"], ["List", "ListItem"], ["ListItem", "ListItem"], ["Badge", "Badge"], ["Sidebar", "Sidebar"], ["SidebarMenuItem", "Sidebar"], ["AppShellHeader", "AppShell"], ["PageHeader", "PageHeader"], ["TopNavigation", "TopNavigation"], ["BottomNavigation", "BottomNavigation"], ["AppShell", "AppShell"], ["AppShellAccount", "AppShell"], ["Search", "Search"], ["SidePanel", "SidePanel"], ["IconButton", "Button"], ["ActionBar", "ActionBar"], ["AlertBanner", "AlertBanner"]]);
const options = (code) => ({ file: FILE, componentModules, requiredChildren: new Set(), requiredProps: new Map(), hash: sha1(code) });
const components = new Set(componentModules.keys());

let page = newPageText({ title: "Checkout", device: "phone", chrome: false });
const stackLoc = () => parsePage(page).board.children[0].children[0].loc;

// Insert a component: the import joins the package import, the page stays valid.
const inserted = applyOps(page, stackLoc(), "Stack", [{ op: "insertChild", code: '<Button level="primary">Pay</Button>' }], options(page));
check("insert into the screen's Stack", inserted.error ?? null, null);
page = inserted.code;
check("the import joins @zen-ds/react", /import \{ Button, Stack, Text \} from "@zen-ds\/react";/.test(page), true);
check("still a valid page", validateDialect(page, { components }), []);

// A prop edit on the inserted Button.
const button = parsePage(page).board.children[0].children[0].children[1];
const edited = applyOps(page, button.loc, "Button", [{ op: "setProp", name: "level", value: { kind: "string", value: "secondary" } }], options(page));
check("setProp", edited.error ?? null, null);
page = edited.code;
check("written", /<Button level="secondary">Pay<\/Button>/.test(page), true);
check("describeElement reads it", describeElement(page, FILE, button.loc)?.attributes.find((attr) => attr.name === "level")?.value, "secondary");

// Remove it again: the import loses Button.
const removed = applyOps(page, button.loc, "Button", [{ op: "removeElement" }], options(page));
check("removeElement", removed.error ?? null, null);
check("the import drops Button", /import \{ Stack, Text \} from "@zen-ds\/react";/.test(removed.code), true);

// A list from the mock data: a row's field is edited at the data (setDataField), the binding stays.
const listPage = page.replace("export const mock = {};", 'export const mock = {\n  items: [\n    { name: "Linen shirt" },\n    { name: "Canvas tote" },\n  ],\n};')
  .replace("import { Button, Stack, Text }", "import { Button, List, ListItem, Stack, Text }")
  .replace('<Button level="secondary">Pay</Button>', "<List>\n          {mock.items.map((item) => <ListItem key={item.name} title={item.name} />)}\n        </List>");
check("a page with a list is valid", validateDialect(listPage, { components }), []);
const row = parsePage(listPage).board.children[0].children[0].children[1].children[0].node;
const data = dataFieldEdit(listPage, FILE, row.loc, "ListItem", { op: "setDataField", prop: "title", row: 1, value: { kind: "string", value: "Tote bag" } });
check("setDataField on a mock row", [data.error ?? null, data.file, data.source], [null, FILE, "mock.items[1].name"]);
check("the mock changed, the binding stayed", [/\{ name: "Tote bag" \}/.test(data.code ?? ""), /title=\{item\.name\}/.test(data.code ?? "")], [true, true]);

// insertChild (a click, the MCP) refuses what a drag refuses (dnd-matrix, 2026-10-17): no children into a component
// that draws none (the API documents no `children`), no block into text.
{
  const bars = newPageText({ title: "Bars", device: "phone", chrome: true });
  const screen = parsePage(bars).board.children[0];
  const top = screen.props.topNavigation.node;
  const childless = new Set(["TopNavigation", "Shape", "MetricCard"]);
  const into = (text, at, name, code) => applyOps(text, at, name, [{ op: "insertChild", code }], { ...options(text), childless });
  check("insertChild into a Top Navigation is refused", into(bars, top.loc, "TopNavigation", "<Badge>Title</Badge>").error ?? null, "<TopNavigation> has no children to drop into; drop beside it instead.");
  const text = screen.children[0].children[0];
  check("insertChild of a Stack into Text is refused", into(bars, text.loc, "Text", '<Stack gap="sm" />').error ?? null, "<Text> holds text; <Stack> would put a block inside it. Drop it beside <Text> instead.");
  check("insertChild of a Badge into Text still works", into(bars, text.loc, "Text", "<Badge>New</Badge>").error ?? null, null);
}

// An action on a builder page is a proto handler: the page's runtime import gains proto; a hook is refused.
{
  let fresh = newPageText({ title: "Actions", chrome: false });
  const at = parsePage(fresh).board.children[0].children[0].loc;
  const withProto = applyOps(fresh, at, "Stack", [{ op: "insertChild", code: '<Button level="primary" onClick={proto.toast({ title: "Saved" })}>Save</Button>' }], options(fresh));
  check("insert with proto.toast", withProto.error ?? null, null);
  fresh = withProto.code ?? fresh;
  check("proto joins the builder import", /import \{ Board, Screen, proto \} from "@zen-ds\/react\/builder";/.test(fresh), true);
  check("a page with an action is valid", validateDialect(fresh, { components }), []);
  const hook = applyOps(fresh, at, "Stack", [{ op: "insertChild", code: '<Button onClick={() => toast({ title: "x" })}>X</Button>', requires: ["toast"] }], options(fresh));
  check("a toast hook is refused", /no hooks/.test(hook.error ?? ""), true);
}


// Prototype (M3): a Screen and an Overlay added to the Board, their imports, and a proto action written on a Button.
{
  let proto = newPageText({ title: "Flow", device: "phone", chrome: false });
  const board = () => parsePage(proto).board.loc;
  const frames = () => boardFrames(parsePage(proto));
  check("one screen at first", frames().map((frame) => `${frame.kind}:${frame.id}`), ["screen:screen-1"]);
  const id = freeFrameId("screen", frames().map((frame) => frame.id));
  check("a free screen id", id, "screen-2");
  const screen = applyOps(proto, board(), "Board", [{ op: "insertChild", code: frameCode({ kind: "screen", id, title: "Done", device: "phone", chrome: false }) }], options(proto));
  check("insert a Screen into the Board", screen.error ?? null, null);
  proto = screen.code ?? proto;
  const overlay = applyOps(proto, board(), "Board", [{ op: "insertChild", code: frameCode({ kind: "overlay", id: "confirm" }) }], options(proto));
  check("insert an Overlay with a Dialog", overlay.error ?? null, null);
  proto = overlay.code ?? proto;
  check("Overlay joins the builder import", /import \{ Board, Overlay, Screen, proto \} from "@zen-ds\/react\/builder";/.test(proto), true);
  check("Dialog joins the package import", /import \{ Dialog, Stack, Text \} from "@zen-ds\/react";/.test(proto), true);
  check("frames after", frames().map((frame) => `${frame.kind}:${frame.id}`), ["screen:screen-1", "screen:screen-2", "overlay:confirm"]);
  check("still a valid page", validateDialect(proto, { components }), []);
  const stack = parsePage(proto).board.children[0].children[0].loc;
  const withButton = applyOps(proto, stack, "Stack", [{ op: "insertChild", code: '<Button level="primary">Next</Button>' }], options(proto));
  proto = withButton.code ?? proto;
  const next = parsePage(proto).board.children[0].children[0].children[1];
  const linked = applyOps(proto, next.loc, "Button", [{ op: "setProp", name: "onClick", value: { kind: "expression", code: protoCode("navigate", "screen-2") } }], options(proto));
  check("setProp writes a proto action", linked.error ?? null, null);
  proto = linked.code ?? proto;
  check("written as code", /<Button level="primary" onClick=\{proto\.navigate\("screen-2"\)\}>Next<\/Button>/.test(proto), true);
  check("read back as a proto value", parsePage(proto).board.children[0].children[0].children[1].props.onClick, { kind: "proto", action: "navigate", args: ["screen-2"] });
  check("protoCode forms", [protoCode("close"), protoCode("toast", 'Say "hi"'), protoCode("link", "https://zen.dev")], ["proto.close()", 'proto.toast({ title: "Say \\"hi\\"" })', 'proto.link("https://zen.dev")']);
}

// The app frame (user, 2026-10-09; master layout 2026-10-15): a blank desktop page's Screen holds Top + Bottom Navigation
// as props (the mobile layout's) and one root AppShell, the master layout, with the Sidebar and the Page header. A part
// switched off is the AppShell's prop removed (the AppShell goes with its last part); switched on, it comes back with its
// import (an AppShell made around the content when there is none).
{
  let framed = newPageText({ title: "Orders" });
  check("a page with its frame is valid", validateDialect(framed, { components }), []);
  const kids = (node) => (node?.children ?? []).filter((child) => child.kind === "element");
  const screen = (text = framed) => parsePage(text).board.children[0];
  const shell = (text = framed) => kids(screen(text)).find((child) => child.name === "AppShell") ?? null;
  check("the Screen holds the mobile layout's parts", SCREEN_CHROME.map((part) => screen().props[part.prop]?.node?.name ?? null), [null, null, "TopNavigation", "BottomNavigation"]);
  check("its master layout: one AppShell with the Sidebar and the Page header", [kids(screen()).map((child) => child.name), shell()?.props.sidebar?.node?.name, shell()?.props.header?.node?.props.main?.node?.name], [["AppShell"], "Sidebar", "PageHeader"]);
  check("the Page header carries the title", shell().props.header.node.props.main.node.props.title, { kind: "literal", value: "Orders" });
  check("the Stack is the AppShell's content", kids(shell()).map((child) => child.name), ["Stack"]);
  const frame = (text, prop, on) => applyOps(text, screen(text).loc, "Screen", [{ op: "screenFrame", prop, on, code: screenFrameCode(prop, "Orders") }], options(text));
  const packageImport = (text) => /import \{ ([^}]+) \} from "@zen-ds\/react";/.exec(text)?.[1].split(", ") ?? [];
  const off = frame(framed, "sidebar", false);
  check("switch the Sidebar off", off.error ?? null, null);
  framed = off.code ?? framed;
  check("no Sidebar, its imports gone, still valid", ["sidebar" in shell().props, packageImport(framed).filter((name) => /^Sidebar/.test(name)), validateDialect(framed, { components })], [false, [], []]);
  const on = frame(framed, "sidebar", true);
  check("switch it on again", on.error ?? null, null);
  check("Sidebar back, imported", [shell(on.code)?.props.sidebar?.node?.name ?? null, packageImport(on.code ?? "").includes("Sidebar")], ["Sidebar", true]);
  // Its rows are Body-Content children (Figma Menu-Item instances), imported with it.
  check("the Sidebar's rows are SidebarMenuItem children, imported", [kids(shell(on.code)?.props.sidebar?.node).map((child) => child.name), packageImport(on.code ?? "").includes("SidebarMenuItem")], [["SidebarMenuItem", "SidebarMenuItem", "SidebarMenuItem"], true]);
  check("on again twice: nothing changes", frame(on.code, "sidebar", true).code === on.code, true);
  // Every part on one AppShell, then every part off: the AppShell goes with the last, the Stack is the Screen's again.
  let all = on.code ?? framed;
  for (const part of FRAME_PARTS) {
    const result = frame(all, part.prop, true);
    check(`${part.label} on, valid`, [result.error ?? null, validateDialect(result.code ?? "", { components })], [null, []]);
    all = result.code ?? all;
  }
  // The header parts live on its AppShellHeader (`header`), the others on the AppShell.
  const partProps = (text) => [...Object.keys(shell(text).props), ...Object.keys(shell(text).props.header?.node?.props ?? {})];
  check("every part on the one AppShell, each imported", [partProps(all).filter((name) => FRAME_PARTS.some((part) => part.prop === name)).sort(), FRAME_PARTS.every((part) => packageImport(all).includes(part.component))], [FRAME_PARTS.map((part) => part.prop).sort(), true]);
  for (const part of FRAME_PARTS) all = frame(all, part.prop, false).code ?? all;
  check("all off: no AppShell, the Stack is the Screen's content", [kids(screen(all)).map((child) => child.name), packageImport(all).filter((name) => FRAME_PARTS.some((part) => part.component === name) || name === "AppShell" || name === "SidebarMenuItem"), validateDialect(all, { components })], [["Stack"], [], []]);
  const back = frame(all, "main", true);
  check("a part on a Screen without an AppShell wraps its content", [kids(screen(back.code)).map((child) => child.name), kids(shell(back.code)).map((child) => child.name), validateDialect(back.code ?? "", { components })], [["AppShell"], ["Stack"], []]);
  check("not a part: refused", applyOps(framed, screen().loc, "Screen", [{ op: "screenFrame", prop: "children", on: true, code: "<Text>Hi</Text>" }], options(framed)).code ?? null, "invalid");
  const stack = kids(shell())[0];
  check("sent on another element: refused", applyOps(framed, stack.loc, "Stack", [{ op: "screenFrame", prop: "sidePanel", on: true }], options(framed)).code ?? null, "invalid");
  check("layouts", [screenLayout("phone"), screenLayout("desktop", "mobile"), screenLayout("tablet"), screenLayout("tablet", "desktop")], ["mobile", "desktop", "mobile", "desktop"]);
  const tablet = applyOps(framed, screen().loc, "Screen", [{ op: "setProp", name: "layout", value: { kind: "string", value: "desktop" } }], options(framed));
  check("a tablet laid out as desktop is valid", validateDialect(tablet.code ?? "", { components }), []);
  const wrong = framed.replace('device="desktop"', 'device="tablet" layout="wide"');
  check("an unknown layout is refused", validateDialect(wrong, { components }).map((error) => error.message), ["layout is mobile, desktop"]);
  const added = applyOps(framed, parsePage(framed).board.loc, "Board", [{ op: "insertChild", code: frameCode({ kind: "screen", id: "screen-2", title: "Detail", device: "phone" }) }], options(framed));
  check("a new phone Screen comes with its bars, no AppShell", [added.error ?? null, parsePage(added.code ?? "").board?.children[1]?.props.topNavigation?.node?.props.title ?? null, kids(parsePage(added.code ?? "").board?.children[1]).map((child) => child.name), validateDialect(added.code ?? "", { components })], [null, { kind: "literal", value: "Detail" }, ["Stack"], []]);
  const desk = applyOps(framed, parsePage(framed).board.loc, "Board", [{ op: "insertChild", code: frameCode({ kind: "screen", id: "screen-3", title: "List" }) }], options(framed));
  check("a new desktop Screen comes with its master layout", [desk.error ?? null, kids(parsePage(desk.code ?? "").board?.children[1]).map((child) => child.name), validateDialect(desk.code ?? "", { components })], [null, ["AppShell"], []]);
  check("a new phone page has no AppShell", [/\bAppShell\b/.test(newPageText({ title: "P", device: "phone" })), validateDialect(newPageText({ title: "P", device: "phone" }), { components })], [false, []]);
}

// Free frames (2026-10-15): a frame's place (x, y) and a drawn Screen's size (width, height) on the Board.
{
  let free = newPageText({ title: "Free", device: "phone", chrome: false });
  const board = () => parsePage(free).board;
  const placed = applyOps(free, board().loc, "Board", [{ op: "insertChild", code: frameCode({ kind: "screen", id: "screen-2", title: "Drawn", device: "tablet", chrome: false, x: -120.4, y: 480, width: 800, height: 600 }) }], options(free));
  check("insert a placed, drawn Screen", placed.error ?? null, null);
  free = placed.code ?? free;
  check("written as whole px", /<Screen id="screen-2" title="Drawn" device="tablet" x=\{-120\} y=\{480\} width=\{800\} height=\{600\}>/.test(free), true);
  check("a placed page is valid", validateDialect(free, { components }), []);
  check("boardFrames reads the place", boardFrames(parsePage(free)).map((frame) => [frame.id, frame.x ?? null, frame.y ?? null]), [["screen-1", null, null], ["screen-2", -120, 480]]);
  const overlay = applyOps(free, board().loc, "Board", [{ op: "insertChild", code: frameCode({ kind: "overlay", id: "confirm", x: 10, y: 20 }) }], options(free));
  check("an Overlay takes a place", [overlay.error ?? null, /<Overlay id="confirm" x=\{10\} y=\{20\}>/.test(overlay.code ?? "")], [null, true]);
  const moved = applyOps(free, board().children[0].loc, "Screen", [{ op: "setProp", name: "x", value: { kind: "number", value: 64 } }, { op: "setProp", name: "y", value: { kind: "number", value: -32 } }], options(free));
  check("setProp places a frame", [moved.error ?? null, validateDialect(moved.code ?? "", { components })], [null, []]);
  const errors = (text) => validateDialect(text, { components }).map((error) => error.message);
  check("x alone is refused", errors(free.replace(' x={-120} y={480}', ' x={-120}')), ["<Screen> takes x and y together"]);
  check("a place is a number", errors(free.replace("x={-120}", 'x="left"')), ["x is a number from -100000 to 100000"]);
  check("a size has limits", errors(free.replace("width={800}", "width={40}")), ["width is a number from 100 to 4096"]);
  check("an Overlay has no size", errors((overlay.code ?? "").replace('<Overlay id="confirm" x={10} y={20}>', '<Overlay id="confirm" width={400}>')), ["An Overlay takes its dialog's size (no width or height)"]);
}

if (failures.length) {
  console.error(`builder selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ builder (engine on local pages) selftest: ${passed} checks pass.`);
