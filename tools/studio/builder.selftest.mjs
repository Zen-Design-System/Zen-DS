#!/usr/bin/env node
// The edit engine on a builder page kept in the browser ("local:<id>.zen.tsx", Studio builder GĐ2 M1): the same ops as
// on example code, results that stay valid pages. Run: node tools/studio/builder.selftest.mjs
import { dataFieldEdit } from "./data-source.mjs";
import { SCREEN_CHROME, boardFrames, boardLayers, frameCode, freeFrameId, layerCode, newPageText, parsePage, protoCode, screenLayout, validateDialect } from "./dialect.mjs";
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
const componentModules = new Map([["Dialog", "Dialog"], ["Button", "Button"], ["Stack", "Layout"], ["Text", "Text"], ["List", "ListItem"], ["ListItem", "ListItem"], ["Badge", "Badge"], ["Sidebar", "Sidebar"], ["SidebarMenuItem", "Sidebar"], ["AppShellHeader", "AppShell"], ["PageHeader", "PageHeader"], ["TopNavigation", "TopNavigation"], ["BottomNavigation", "BottomNavigation"], ["AppShell", "AppShell"], ["AppShellAccount", "AppShell"], ["Search", "Search"], ["SidePanel", "SidePanel"], ["IconButton", "Button"], ["ActionBar", "ActionBar"], ["AlertBanner", "AlertBanner"], ["AppShellAction", "AppShell"], ["Breadcrumbs", "Breadcrumbs"]]);
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

// A Table column's `cells` written as the page's own instances (`<Use>`, cellComponents.ts; #294 B-47/B-48, train C
// 2026-10-25): the page imports Use from the builder, else the dialect refuses the page.
{
  const table = newPageText({ title: "Tasks", device: "desktop", chrome: false })
    .replace(/import \{ ([^}]*) \} from "@zen-ds\/react";/, (_, names) => `import { ${[...names.split(", "), "Table"].sort().join(", ")} } from "@zen-ds/react";`)
    .replace(/(<Stack[^>]*>)/, '$1\n          <Table aria-label="Tasks" rows={[{ id: "a", status: "Done" }]} getRowId={(row) => row.id} columns={[{ id: "status", header: "Status" }]} />');
  const at = parsePage(table).board.children[0].children[0].children.find((child) => child.name === "Table");
  const cells = '{ "Done": <Use of="status" variant={{ "Status": "Done" }} /> }';
  const written = applyOps(table, at.loc, "Table", [{ op: "setField", name: "columns", index: 0, key: "cells", value: { kind: "expression", code: cells } }], options(table));
  check("setField writing <Use> cells", written.error ?? null, null);
  check("the page imports Use from the builder", /import \{[^}]*\bUse\b[^}]*\} from "@zen-ds\/react\/builder";/.test(written.code ?? ""), true);
  check("the page stays valid", validateDialect(written.code ?? "", { components: new Set([...components, "Table"]) }).filter((error) => /not imported/.test(error.message ?? String(error))), []);
}

// insertChild (a click, the MCP) refuses what a drag refuses (dnd-matrix, 2026-10-17): no children into a component
// that draws none (the API documents no `children`), no block into text.
{
  const bars = newPageText({ title: "Bars", device: "phone", chrome: true });
  const screen = parsePage(bars).board.children[0];
  const top = screen.props.topNavigation.node;
  const childless = new Set(["TopNavigation", "Shape", "MetricCard"]);
  const into = (text, at, name, code) => applyOps(text, at, name, [{ op: "insertChild", code }], { ...options(text), childless });
  check("insertChild into a Top Navigation is refused", into(bars, top.loc, "TopNavigation", "<Badge>Title</Badge>").error ?? null, "<TopNavigation> has no children to drop into; drop beside it instead.");
  // A new Screen with its bars starts with an empty Stack (walk W-56): the Text is the one a Screen without bars starts with.
  const plain = newPageText({ title: "Bars", device: "phone", chrome: false });
  const text = parsePage(plain).board.children[0].children[0].children[0];
  check("insertChild of a Stack into Text is refused", into(plain, text.loc, "Text", '<Stack gap="sm" />').error ?? null, "<Text> holds text; <Stack> would put a block inside it. Drop it beside <Text> instead.");
  check("insertChild of a Badge into Text still works", into(plain, text.loc, "Text", "<Badge>New</Badge>").error ?? null, null);
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
  // The Frame tool's plain frame (user 2026-11-07): `frame`, always desktop, whatever device it was asked for; a phone
  // or tablet with `frame`, or a frame="…" value, is refused.
  const plainCode = frameCode({ kind: "screen", id: "screen-9", title: "Frame 9", device: "phone", plain: true, empty: true, chrome: false, x: 10, y: 20, width: 375, height: 600 });
  check("a plain frame is a desktop Screen marked frame", plainCode, '<Screen id="screen-9" title="Frame 9" device="desktop" frame x={10} y={20} width={375} height={600} />');
  const plainPage = applyOps(proto, board(), "Board", [{ op: "insertChild", code: plainCode }], options(proto));
  check("a plain frame is a valid page", plainPage.code ? validateDialect(plainPage.code, { components }) : plainPage.error, []);
  check("a plain frame reads frame: true", plainPage.code ? parsePage(plainPage.code).board.children.at(-1).props.frame : null, { kind: "literal", value: true });
  const phoneFrame = applyOps(proto, board(), "Board", [{ op: "insertChild", code: '<Screen id="screen-8" title="P" device="phone" frame x={0} y={0} width={375} height={600} />' }], options(proto));
  check("a phone plain frame is refused", phoneFrame.code ? validateDialect(phoneFrame.code, { components }).map((error) => error.message) : [phoneFrame.error], ["A plain frame (frame) is desktop: a phone or tablet is a Screen"]);
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
  // Figma's placeholder: six "Label" rows (appshell-placeholder.mjs).
  check("the Sidebar's rows are SidebarMenuItem children, imported", [kids(shell(on.code)?.props.sidebar?.node).map((child) => child.name), packageImport(on.code ?? "").includes("SidebarMenuItem")], [Array(6).fill("SidebarMenuItem"), true]);
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
  // Make a separate Screen (studio-responsive-breakpoints §5): versionOf names another Screen by its id.
  const versionError = "versionOf is the id of another Screen (the one this Screen is a version of)";
  check("versionOf names another Screen", errors(free.replace("width={800}", 'width={800} versionOf="home"')), []);
  check("versionOf is an id", errors(free.replace("width={800}", 'width={800} versionOf="Home page"')), [versionError]);
  check("a Screen is no version of itself", errors(free.replace(/<Screen id="([a-z0-9-]+)"([^>]*?)width=\{800\}/, '<Screen id="$1"$2width={800} versionOf="$1"')), [versionError]);
}

// The Board's order (walk 2026-10-29 W-32/W-33, frameEdit.ts orderFrame): a Screen moved before the first one (Set as
// start), and to the end; the page stays valid and every frame keeps its place.
{
  const three = `// @zen-page {"format":1,"title":"Order"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Text } from "@zen-ds/react";

export default function Page() {
  return (
    <Board>
      <Screen id="login" title="Login" device="phone" x={0} y={0}>
        <Text>Login</Text>
      </Screen>
      <Screen id="splash" title="Splash" device="phone" x={486} y={0}>
        <Text>Splash</Text>
      </Screen>
      <Screen id="home" title="Home" device="phone" x={972} y={0}>
        <Text>Home</Text>
      </Screen>
    </Board>
  );
}
`;
  const board = parsePage(three).board;
  const [login, splash, home] = board.children.filter((child) => child.kind === "element");
  const ids = (code) => parsePage(code).board.children.filter((child) => child.kind === "element").map((node) => `${node.props.id.value}@${node.props.x.value}`);
  const first = applyOps(three, splash.loc, "Screen", [{ op: "moveTo", parent: board.loc, before: login.loc }], options(three));
  check("Set as start: Splash goes first, every frame keeps its x", [first.error ?? null, first.code && ids(first.code)], [null, ["splash@486", "login@0", "home@972"]]);
  check("the moved page stays valid", first.code ? validateDialect(first.code, { components }).length : -1, 0);
  const last = applyOps(three, login.loc, "Screen", [{ op: "moveTo", parent: board.loc, after: home.loc }], options(three));
  check("a frame row dropped last: Login after Home", [last.error ?? null, last.code && ids(last.code)], [null, ["splash@486", "home@972", "login@0"]]);
}

// Loose layers (Figma's layers on the canvas, user 2026-11-20): a <Layer> goes on the Board with its runtime import; it
// holds one layer (another is refused there); removing that layer removes the Layer.
{
  let board = newPageText({ title: "Canvas", device: "desktop", chrome: false });
  const boardLoc = () => parsePage(board).board.loc;
  const added = applyOps(board, boardLoc(), "Board", [{ op: "insertChild", code: layerCode({ id: freeFrameId("layer", []), x: 40, y: -20, content: '<Button level="primary">Go</Button>' }) }], options(board));
  check("a Layer joins the Board", added.error ?? null, null);
  board = added.code ?? board;
  check("its runtime import and a valid page", [/import \{ Board, Layer, Screen, proto \} from "@zen-ds\/react\/builder";|import \{ Board, Layer, Screen \} from "@zen-ds\/react\/builder";/.test(board), validateDialect(board, { components })], [true, []]);
  const layer = parsePage(board).board.children.find((child) => child.kind === "element" && child.name === "Layer");
  const button = layer?.children.find((child) => child.kind === "element");
  check("boardLayers reads it", boardLayers(parsePage(board)).map(({ id, x, y }) => ({ id, x, y })), [{ id: "layer-1", x: 40, y: -20 }]);
  const second = applyOps(board, layer.loc, "Layer", [{ op: "insertChild", code: "<Button>Two</Button>" }], options(board));
  check("a Layer takes no second layer", /stands alone/.test(second.error ?? ""), true);
  const beside = applyOps(board, layer.loc, "Layer", [{ op: "pasteCode", code: "<Button>Two</Button>", after: button.loc }], options(board));
  check("nothing pastes beside its layer inside it", /stands alone/.test(beside.error ?? ""), true);
  const gone = applyOps(board, button.loc, "Button", [{ op: "removeElement" }], options(board));
  check("removing its layer removes the Layer", [gone.error ?? null, gone.code && boardLayers(parsePage(gone.code)).length, gone.code && validateDialect(gone.code, { components })], [null, 0, []]);
}

// Drag out of a frame and back (Figma's reparent, loose layers PR2): moveTo `loose` puts the layer on the Board as a
// <Layer> (its place in its frame dropped), moveTo `at` floats it in a frame without auto layout; moving a Layer's one
// layer away takes the Layer with it.
{
  const start = `// @zen-page {"format":1,"title":"Drag"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Box, Button, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Flow" device="desktop" x={0} y={0}>
        <Stack gap="md">
          <Button>Flow</Button>
        </Stack>
      </Screen>
      <Screen id="screen-2" title="Free" device="desktop" frame x={1600} y={0} width={400} height={300}>
        <Box position="absolute" insetLeft={20} insetTop={30}>
          <Button>Float</Button>
        </Box>
      </Screen>
    </Board>
  );
}
`;
  const withBox = new Set([...components, "Box"]);
  const find = (text, test) => { let found = null; const visit = (node) => { if (!found && test(node)) found = node; for (const child of node.children ?? []) if (child.kind === "element") visit(child); }; visit(parsePage(text).board); return found; };
  const named = (text, name, words) => find(text, (node) => node.name === name && (words === undefined || node.children.some((child) => child.kind === "text" && child.value.trim() === words)));
  const board = (text) => parsePage(text).board.loc;
  const flow = named(start, "Button", "Flow");
  const out = applyOps(start, flow.loc, "Button", [{ op: "moveTo", parent: board(start), loose: { id: "layer-1", x: 500, y: 40 } }], options(start));
  check("out of auto layout onto the canvas: a <Layer> holding it, the page valid", [out.error ?? null, out.code && boardLayers(parsePage(out.code)).map(({ id, x, y }) => ({ id, x, y })), out.code && /<Layer id="layer-1" x=\{500\} y=\{40\}>\s*<Button>Flow<\/Button>\s*<\/Layer>/.test(out.code), out.code && /import \{ Board, Layer, Screen \}/.test(out.code), out.code && validateDialect(out.code, { components: withBox })], [null, [{ id: "layer-1", x: 500, y: 40 }], true, true, []]);
  const box = find(start, (node) => node.name === "Box" && node.props.position);
  const floated = applyOps(start, box.loc, "Box", [{ op: "moveTo", parent: board(start), loose: { id: "layer-1", x: 0, y: 400, width: 120 } }], options(start));
  check("out of a free frame: the floating Box that only placed it goes, the Layer takes a width", [floated.error ?? null, floated.code && /<Layer id="layer-1" x=\{0\} y=\{400\} width=\{120\}>\s*<Button>Float<\/Button>\s*<\/Layer>/.test(floated.code), floated.code && !/position="absolute"/.test(floated.code)], [null, true, true]);
  const loose = out.code;
  const back = named(loose, "Button", "Flow");
  const stack = named(loose, "Stack");
  const into = applyOps(loose, back.loc, "Button", [{ op: "moveTo", parent: stack.loc }], options(loose));
  check("a layer on the canvas into auto layout: the Layer goes with it", [into.error ?? null, into.code && boardLayers(parsePage(into.code)).length, into.code && /<Stack gap="md">\s*<Button>Flow<\/Button>\s*<\/Stack>/.test(into.code), into.code && validateDialect(into.code, { components: withBox })], [null, 0, true, []]);
  const free = named(loose, "Screen") && find(loose, (node) => node.name === "Screen" && node.props.frame);
  const dropped = applyOps(loose, back.loc, "Button", [{ op: "moveTo", parent: free.loc, at: { x: 40.4, y: 50 } }], options(loose));
  check("a layer on the canvas into a frame without auto layout: it floats at the px", [dropped.error ?? null, dropped.code && /<Box position="absolute" insetLeft=\{40\} insetTop=\{50\}>\s*<Button>Flow<\/Button>\s*<\/Box>/.test(dropped.code), dropped.code && boardLayers(parsePage(dropped.code)).length, dropped.code && validateDialect(dropped.code, { components: withBox })], [null, true, 0, []]);
  const noBox = start.replace("import { Box, Button, Stack }", "import { Button, Stack }").replace(/\s*<Box position="absolute" insetLeft=\{20\} insetTop=\{30\}>\s*<Button>Float<\/Button>\s*<\/Box>/, "");
  const noBoxOut = applyOps(noBox, named(noBox, "Button", "Flow").loc, "Button", [{ op: "moveTo", parent: find(noBox, (node) => node.name === "Screen" && node.props.frame).loc, at: { x: 10, y: 10 } }], options(noBox));
  check("floated in a Box of its own on a page without Box: Box joins the import", [noBoxOut.error ?? null, noBoxOut.code && /import \{ Box, Button, Stack \} from "@zen-ds\/react";/.test(noBoxOut.code), noBoxOut.code && validateDialect(noBoxOut.code, { components: withBox })], [null, true, []]);
  // Several at once (op many moveTo, loose layers PR4): each its own Layer on the canvas, or its own px in a free frame.
  const twoFlow = start.replace("<Button>Flow</Button>", "<Button>Flow</Button>\n          <Button>Two</Button>");
  const flows = [named(twoFlow, "Button", "Flow"), named(twoFlow, "Button", "Two")];
  const both = applyOps(twoFlow, flows[0].loc, "Button", [{ op: "many", action: "moveTo", locs: flows.map((node) => node.loc), parent: board(twoFlow), looseByLoc: { [flows[0].loc]: { id: "layer-1", x: 500, y: 0 }, [flows[1].loc]: { id: "layer-2", x: 500, y: 60 } } }], options(twoFlow));
  check("several onto the canvas: a Layer each at its own place, the page valid", [both.error ?? null, both.code && boardLayers(parsePage(both.code)).map(({ id, x, y }) => `${id}@${x},${y}`), both.code && validateDialect(both.code, { components: withBox })], [null, ["layer-1@500,0", "layer-2@500,60"], []]);
  const backIn = both.code;
  const looseOnes = [named(backIn, "Button", "Flow"), named(backIn, "Button", "Two")];
  const freeFrame = find(backIn, (node) => node.name === "Screen" && node.props.frame);
  const intoFree = applyOps(backIn, looseOnes[0].loc, "Button", [{ op: "many", action: "moveTo", locs: looseOnes.map((node) => node.loc), parent: freeFrame.loc, atByLoc: { [looseOnes[0].loc]: { x: 10, y: 20 }, [looseOnes[1].loc]: { x: 10, y: 80 } } }], options(backIn));
  check("several layers on the canvas into a free frame: each floats at its px, their Layers go", [intoFree.error ?? null, intoFree.code && boardLayers(parsePage(intoFree.code)).length, intoFree.code && /<Box position="absolute" insetLeft=\{10\} insetTop=\{20\}>\s*<Button>Flow<\/Button>\s*<\/Box>\s*<Box position="absolute" insetLeft=\{10\} insetTop=\{80\}>\s*<Button>Two<\/Button>/.test(intoFree.code), intoFree.code && validateDialect(intoFree.code, { components: withBox })], [null, 0, true, []]);
  const wrong = applyOps(start, flow.loc, "Button", [{ op: "moveTo", parent: find(start, (node) => node.name === "Screen" && node.props.frame).loc, loose: { id: "layer-1", x: 0, y: 0 } }], options(start));
  check("`loose` needs the Board as the parent", /`loose` puts a layer on the Board/.test(wrong.error ?? ""), true);
}

{
  // A main component's root moves with its <Component> (Figma moves the main; user 2026-11-23: "vẫn chưa kéo component
  // gốc ra khỏi frame được"): moved alone it left the <Component> empty, which the page refuses.
  const start = `// @zen-page {"format":1,"title":"Mains"}
import { Board, Component, ComponentSet, Screen } from "@zen-ds/react/builder";
import { Stack, Text } from "@zen-ds/react";

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Free" device="desktop" frame x={0} y={0} width={400} height={300}>
        <Component id="card" name="Card">
          <Stack position="absolute" insetLeft={20} insetTop={135} padding="md">
            <Text>Card</Text>
          </Stack>
        </Component>
        <ComponentSet id="chip" name="Chip">
          <Component id="chip-a">
            <Stack padding="sm"><Text>A</Text></Stack>
          </Component>
          <Component id="chip-b">
            <Stack padding="sm"><Text>B</Text></Stack>
          </Component>
        </ComponentSet>
      </Screen>
      <Screen id="screen-2" title="Other" device="desktop" frame x={600} y={0} width={400} height={300}>
      </Screen>
    </Board>
  );
}
`;
  const find = (text, test) => { let found = null; const visit = (node) => { if (!found && test(node)) found = node; for (const child of node.children ?? []) if (child.kind === "element") visit(child); }; visit(parsePage(text).board); return found; };
  const root = (text) => find(text, (node) => node.name === "Stack" && node.props.position);
  const board = parsePage(start).board.loc;
  const valid = (code) => validateDialect(code, { components });
  const out = applyOps(start, root(start).loc, "Stack", [{ op: "moveTo", parent: board, loose: { id: "layer-1", x: 500, y: 40 } }], options(start));
  check("a main's root onto the canvas: its <Component> goes too, the root without its place, the page valid", [out.error ?? null, out.code && /<Layer id="layer-1" x=\{500\} y=\{40\}>\s*<Component id="card" name="Card">\s*<Stack padding="md">/.test(out.code), out.code && valid(out.code)], [null, true, []]);
  check("the selection stays on the main's root", out.moved && out.code.split("\n")[Number(out.moved.loc.split(":")[0]) - 1].trim().startsWith("<Stack"), true);
  const other = find(start, (node) => node.name === "Screen" && node.props.id?.value === "screen-2");
  const into = applyOps(start, root(start).loc, "Stack", [{ op: "moveTo", parent: other.loc, at: { x: 10, y: 20 } }], options(start));
  check("a main's root into another free frame: its <Component> floats there by its root", [into.error ?? null, into.code && /<Screen id="screen-2"[^>]*>\s*<Component id="card" name="Card">\s*<Stack position="absolute" insetLeft=\{10\} insetTop=\{20\} padding="md">/.test(into.code), into.code && valid(into.code)], [null, true, []]);
  const copied = applyOps(start, root(start).loc, "Stack", [{ op: "moveTo", parent: other.loc, at: { x: 10, y: 20 }, copy: true }], options(start));
  check("a ⌥ copy of a main's root is a copy of the layer (the main stays)", [copied.error ?? null, copied.code && (copied.code.match(/<Component id="card"/g) ?? []).length], [null, 1]);
  const variant = find(start, (node) => node.name === "Stack" && node.children.some((child) => child.kind === "element" && child.children?.some((word) => word.kind === "text" && word.value === "A")));
  const fromSet = applyOps(start, variant.loc, "Stack", [{ op: "moveTo", parent: board, loose: { id: "layer-1", x: 500, y: 40 } }], options(start));
  check("a variant's root does not take its <Component> out of the set", fromSet.code ? /<Layer id="layer-1"[^>]*>\s*<Component/.test(fromSet.code) : false, false);
}

if (failures.length) {
  console.error(`builder selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ builder (engine on local pages) selftest: ${passed} checks pass.`);
