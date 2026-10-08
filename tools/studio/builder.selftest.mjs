#!/usr/bin/env node
// The edit engine on a builder page kept in the browser ("local:<id>.zen.tsx", Studio builder GĐ2 M1): the same ops as
// on example code, results that stay valid pages. Run: node tools/studio/builder.selftest.mjs
import { dataFieldEdit } from "./data-source.mjs";
import { boardFrames, frameCode, freeFrameId, newPageText, parsePage, protoCode, validateDialect } from "./dialect.mjs";
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
const componentModules = new Map([["Dialog", "Dialog"], ["Button", "Button"], ["Stack", "Layout"], ["Text", "Text"], ["List", "ListItem"], ["ListItem", "ListItem"], ["Badge", "Badge"]]);
const options = (code) => ({ file: FILE, componentModules, requiredChildren: new Set(), requiredProps: new Map(), hash: sha1(code) });
const components = new Set(componentModules.keys());

let page = newPageText({ title: "Checkout", device: "phone" });
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

// An action on a builder page is a proto handler: the page's runtime import gains proto; a hook is refused.
{
  let fresh = newPageText({ title: "Actions" });
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
  let proto = newPageText({ title: "Flow", device: "phone" });
  const board = () => parsePage(proto).board.loc;
  const frames = () => boardFrames(parsePage(proto));
  check("one screen at first", frames().map((frame) => `${frame.kind}:${frame.id}`), ["screen:screen-1"]);
  const id = freeFrameId("screen", frames().map((frame) => frame.id));
  check("a free screen id", id, "screen-2");
  const screen = applyOps(proto, board(), "Board", [{ op: "insertChild", code: frameCode({ kind: "screen", id, title: "Done", device: "phone" }) }], options(proto));
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

if (failures.length) {
  console.error(`builder selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ builder (engine on local pages) selftest: ${passed} checks pass.`);
