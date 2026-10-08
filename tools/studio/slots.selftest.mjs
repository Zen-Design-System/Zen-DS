#!/usr/bin/env node
// Zen Studio slots selftest: tools/studio/slots.mjs (ops insertChild, removeElement, duplicateElement, moveElement,
// clearSlot, resetSlot; the GET /element additions and their Modified flags; mapLine against diff.ts;
// componentModulesFrom, requiredFromApi) without a server. The last section runs tsc, style-guard
// and usage-guard on realistic outputs through temporary files in src/platform/examples/drafts (always deleted).
//   node tools/studio/slots.selftest.mjs              prints a summary, exits 1 on any failure
//   ZEN_ROOT=<repo> node <copy>/slots.selftest.mjs    a copy outside the repo (the repo gives history.ts, src/components,
//                                                     api.generated.json, tsc and the guards)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { applyOps, describeElement, parseSource, sha1 } from "./jsx-source.mjs";
import { SLOT_OPS, applySlotOp, describeSlots, isSlotFile, mapLine, requiredFromApi, withSlots } from "./slots.mjs";
import { componentModulesFrom } from "./component-modules.mjs";

const ROOT = process.env.ZEN_ROOT ? path.resolve(process.env.ZEN_ROOT) : fileURLToPath(new URL("../../", import.meta.url));
const BOM = String.fromCharCode(0xfeff);
const LINE_SEPARATOR = String.fromCharCode(0x2028);

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}
const ok = (label, condition) => check(label, Boolean(condition), true);

const historyFile = path.join(ROOT, "src/platform/studio/history.ts");
const history = fs.existsSync(historyFile) ? await import(pathToFileURL(historyFile).href) : null;
ok("history.ts found (undo checks)", history);
const modules = componentModulesFrom(ROOT);
const api = JSON.parse(fs.readFileSync(path.join(ROOT, "src/platform/api.generated.json"), "utf8"));
const { requiredChildren, requiredProps } = requiredFromApi(api);

const PAGE = "src/platform/examples/pages/slots-selftest.tsx";
const TEMPLATE = "src/templates/hr/SlotsSelftest.tsx";
const str = (value) => ({ kind: "string", value });
const strip = (code) => (code.startsWith(BOM) ? code.slice(1) : code);
/** "<line>:<column>" of the nth occurrence of `needle` (a "<Tag" opening), BOM not counted. */
const locOf = (code, needle, nth = 0) => {
  const text = strip(code);
  let at = -1;
  for (let i = 0; i <= nth; i += 1) at = text.indexOf(needle, at + 1);
  if (at < 0) throw new Error(`selftest: ${needle} not found`);
  const before = text.slice(0, at);
  return `${before.split(/\r?\n/).length}:${at - Math.max(before.lastIndexOf("\n"), -1) - 1}`;
};
const options = (extra = {}) => ({ file: PAGE, componentModules: modules, requiredChildren, requiredProps, ...extra });
const ins = (code, extra = {}) => ({ op: "insertChild", code, ...extra });
const REMOVE = { op: "removeElement" };
const DUPLICATE = { op: "duplicateElement" };
const move = (to) => ({ op: "moveElement", to });
const clear = (prop) => (prop ? { op: "clearSlot", prop } : { op: "clearSlot" });
const reset = (prop) => (prop ? { op: "resetSlot", prop } : { op: "resetSlot" });
/** Ops that need the file's hash, and the answer field of each op that has no loc. */
const HASHED = new Set(["removeElement", "moveElement", "clearSlot", "resetSlot"]);
const FLAG = { removeElement: "removed", clearSlot: "cleared", resetSlot: "reset" };
const samples = [];

/** One op on the nth `needle` element, with the checks every successful op must pass; returns the result (or the error). */
const run = (label, code, needle, name, op, { nth = 0, sample = false, expect, expectUsage, insertedName, ...extra } = {}) => {
  const opts = options(extra);
  if (HASHED.has(op.op) && !("hash" in extra)) opts.hash = sha1(code);
  const result = applySlotOp(code, locOf(code, needle, nth), name, op, opts);
  if ("error" in result) return result;
  const before = parseSource(strip(code));
  const after = parseSource(strip(result.code));
  ok(`${label}: re-parses`, after && after.errors.length <= before.errors.length);
  check(`${label}: BOM kept`, result.code.startsWith(BOM), code.startsWith(BOM));
  if (code.includes("\r\n")) ok(`${label}: CRLF kept`, !/[^\r]\n/.test(result.code));
  const kind = FLAG[op.op] ?? (op.op === "moveElement" ? "moved" : "inserted");
  if (FLAG[op.op]) check(`${label}: ${kind}`, result[kind], true);
  else {
    const expected = insertedName ?? (op.op === "insertChild" ? /^\s*<([\w.]+)/.exec(op.code)?.[1] : name);
    check(`${label}: ${kind}.loc is the element`, describeElement(result.code, opts.file, result[kind]?.loc ?? "")?.name, expected);
  }
  if (history) {
    const patch = history.makePatch(code, result.code);
    check(`${label}: undo restores the original exactly`, history.textBeforeEdit(result.code, patch, true) === code, true);
    check(`${label}: undo on the hash-less path too`, history.textBeforeEdit(result.code, patch, false) === code, true);
  }
  if (sample) samples.push({ label, before: code, after: result.code, file: opts.file, expect, expectUsage });
  return result;
};
const rows = (result, from, to) => result.code.split(/\r?\n/).slice(from - 1, to);
const changedRows = (result) => rows(result, result.changed.from, result.changed.to);
const importLines = (result) => result.code.split(/\r?\n/).filter((line) => line.startsWith("import"));
const errorOf = (result) => [result.code, result.error];

const IMPORTS = [
  'import { Badge } from "../../../components/Badge";',
  'import { Card } from "../../../components/Card";',
  'import { DockIcon } from "../../../components/DockIcon";',
  'import { Stack } from "../../../components/Layout";',
  'import { List, ListItem } from "../../../components/ListItem";',
  'import { Text } from "../../../components/Text";',
];
const page = (...body) => [...IMPORTS, "", ...body, ""].join("\n");
const src = page(
  "export function Plans({ items, open }: { items: { id: string; name: string }[]; open: boolean }) {",
  "  return (",
  "    <Stack gap=\"md\">",
  "      <Card theme=\"border\">",
  "        <Text>Pro</Text>",
  "      </Card>",
  "      <Card theme=\"flat\" />",
  "      <List aria-label=\"Team\">",
  "        {items.map((item) => (",
  "          <ListItem key={item.id} title={item.name} leading={<DockIcon icon=\"icon-user-line\" />} />",
  "        ))}",
  "      </List>",
  "      {open && <Text>Open</Text>}",
  "      {open ? <Text>Shown</Text> : <Text>Hidden</Text>}",
  "      <Badge theme=\"green\">Active</Badge>",
  "    </Stack>",
  "  );",
  "}",
);
const BADGE = '<Badge theme="blue">Pro plan</Badge>';

/* ── data: componentModulesFrom, requiredFromApi, isSlotFile ─────────────────────────────────────────────────────── */
{
  ok("componentModulesFrom: the repo's components", modules.size > 100);
  check("componentModulesFrom: folders by name", ["Button", "IconButton", "Stack", "Heading", "InputField", "useToast", "ProgressBar", "List", "ModalForm", "Chip", "Popover"].map((name) => modules.get(name)), ["Button", "Button", "Layout", "Text", "Input", "Toast", "Progress", "ListItem", "Dialog", "Chip", "Popover"]);
  check("componentModulesFrom: types left out", ["ButtonProps", "ToastApi", "IconName"].map((name) => modules.has(name)), [false, false, false]);
  check("componentModulesFrom: a missing root → empty", componentModulesFrom(path.join(ROOT, "no-such-folder")).size, 0);
  check("requiredFromApi: required children", ["List", "Button", "Card", "Stack"].map((name) => requiredChildren.has(name)), [true, true, false, false]);
  check("requiredFromApi: required props", [requiredProps.get("Dialog")?.has("title"), requiredProps.get("ListItem")?.has("title"), requiredProps.get("ListItem")?.has("leading")], [true, true, false]);
  check("requiredFromApi: junk → empty", [requiredFromApi(null).requiredChildren.size, requiredFromApi({ x: "y" }).requiredProps.size], [0, 0]);
  check("isSlotFile", ["src/platform/examples/pages/card.tsx", "src/templates/hr/HrHomeTemplate.tsx", "src/templates/X.tsx", "src/platform/PlatformExamples.tsx", "src/platform/examples/pages/sub/x.tsx", "src/platform/appLayer/templates.tsx", "src/components/Card/Card.tsx", "src/platform/examples/pages/card.css", "src/templates/X.tsx?raw", null].map(isSlotFile), [true, true, true, false, false, false, false, false, false, false]);
  check("SLOT_OPS", [...SLOT_OPS], ["insertChild", "removeElement", "duplicateElement", "moveElement", "moveTo", "pasteCode", "replaceElement", "many", "clearSlot", "resetSlot", "insertItem", "removeItem", "duplicateItem", "moveItem", "groupItem", "ungroupItem"]);
}

/* ── insertChild: children ────────────────────────────────────────────────────────────────────────────────────────── */
{
  const end = run("insert end", src, "<Card theme=\"border\"", "Card", ins(BADGE), { sample: false });
  check("insert end: on its own line after the last child", rows(end, 12, 13), ["        <Text>Pro</Text>", '        <Badge theme="blue">Pro plan</Badge>']);
  check("insert end: loc, changed, no snippet in the file", [end.inserted.loc, end.changed, "snippet" in end], ["13:8", { from: 13, to: 13 }, false]);
  check("insert end: Badge already imported", importLines(end), IMPORTS);
  const first = run("insert first", src, "<Card theme=\"border\"", "Card", ins(BADGE, { index: 0 }));
  check("insert first: before the first child", [rows(first, 12, 13), first.inserted.loc], [['        <Badge theme="blue">Pro plan</Badge>', "        <Text>Pro</Text>"], "12:8"]);
  const middle = run("insert index", src, "<Stack gap", "Stack", ins("<Text>Team</Text>", { index: 2 }));
  check("insert index: before children[2] (the List)", [rows(middle, 15, 16), middle.inserted.loc], [["      <Text>Team</Text>", '      <List aria-label="Team">'], "15:6"]);
  const before = run("insert before an expression", src, "<Stack gap", "Stack", ins("<Text>Team</Text>", { index: 3 }));
  check("insert before an expression child", rows(before, 20, 21), ["      <Text>Team</Text>", "      {open && <Text>Open</Text>}"]);
  const last = run("insert last of many", src, "<Stack gap", "Stack", ins("<Text>Done</Text>", { index: 6 }));
  check("insert index = length: the end", [rows(last, 22, 24), last.inserted.loc], [['      <Badge theme="green">Active</Badge>', "      <Text>Done</Text>", "    </Stack>"], "23:6"]);
  const children = run("insert prop children", src, "<Card theme=\"border\"", "Card", ins(BADGE, { prop: "children" }));
  check("insert prop children = children", children.code, end.code);
  check("insert index past the end: stale", errorOf(applySlotOp(src, "11:6", "Card", ins(BADGE, { index: 2 }), options())), ["stale", "The slot holds 1 item; position 2 is past its end (reload the element)"]);
  check("insert index negative or fractional: invalid", [applySlotOp(src, "11:6", "Card", ins(BADGE, { index: -1 }), options()).code, applySlotOp(src, "11:6", "Card", ins(BADGE, { index: 1.5 }), options()).code], ["invalid", "invalid"]);
  check("insert index into a self-closing parent: only 0", applySlotOp(src, "14:6", "Card", ins(BADGE, { index: 1 }), options()).code, "stale");
}

// Fragments are flattened: a position inside one lands inside it.
{
  const frag = page(
    "export const F = ({ flag }: { flag: boolean }) => (",
    "  <Stack>",
    "    <Text>A</Text>",
    "    {flag && <Text>B</Text>}",
    "    <>",
    "      <Text>C</Text>",
    "      <Text>D</Text>",
    "    </>",
    "  </Stack>",
    ");",
  );
  const into = run("insert into a fragment", frag, "<Stack>", "Stack", ins("<Badge>New</Badge>", { index: 3 }));
  check("insert into a fragment: before D, at the fragment's indent", [rows(into, 13, 15), into.inserted.loc], [["      <Text>C</Text>", "      <Badge>New</Badge>", "      <Text>D</Text>"], "14:6"]);
  const end = run("insert end in a fragment", frag, "<Stack>", "Stack", ins("<Badge>New</Badge>"));
  check("insert end: after the last flattened child (inside its fragment)", rows(end, 14, 16), ["      <Text>D</Text>", "      <Badge>New</Badge>", "    </>"]);
  const expression = run("insert before a condition", frag, "<Stack>", "Stack", ins("<Badge>New</Badge>", { index: 1 }));
  check("insert index 1: before the {flag && …} child", rows(expression, 11, 12), ["    <Badge>New</Badge>", "    {flag && <Text>B</Text>}"]);
}

// Inline parents stay inline; empty and self-closing parents open.
{
  const inline = page(
    "export const I = ({ open }: { open: boolean }) => (",
    "  <Stack>",
    "    <p>Hello <b>x</b></p>",
    "    <span>Save</span>",
    "    {open ? <Card theme=\"flat\"></Card> : null}",
    "    {open ? <Card theme=\"pale\" /> : null}",
    "    <Card theme=\"border\">",
    "    </Card>",
    "    <Card",
    "      theme=\"shadow\"",
    "    />",
    "    <Card",
    "      theme=\"semi-pale\" />",
    "  </Stack>",
    ");",
  );
  const p = run("insert inline text", inline, "<p>", "p", ins("<i>y</i>"));
  check("insert inline text: same line, after the last child", [rows(p, 10, 10), p.inserted.loc], [["    <p>Hello <b>x</b><i>y</i></p>"], "10:21"]);
  const span = run("insert before text", inline, "<span>", "span", ins("<i>y</i>", { index: 0 }));
  check("insert before text: inline", [rows(span, 11, 11), span.inserted.loc], [["    <span><i>y</i>Save</span>"], "11:10"]);
  const empty = run("insert empty inline", inline, "<Card theme=\"flat\"", "Card", ins("<Text>Hi</Text>"));
  check("insert into an empty inline parent", [rows(empty, 12, 12), empty.inserted.loc], [['    {open ? <Card theme="flat"><Text>Hi</Text></Card> : null}'], "12:31"]);
  const closing = run("insert self-closing inline", inline, "<Card theme=\"pale\"", "Card", ins("<Text>Hi</Text>"));
  check("insert into a self-closing inline parent", [rows(closing, 13, 13), closing.inserted.loc], [['    {open ? <Card theme="pale"><Text>Hi</Text></Card> : null}'], "13:31"]);
  const block = run("insert empty block", inline, "<Card theme=\"border\"", "Card", ins("<Text>Hi</Text>"));
  check("insert into an empty block parent: its own line", [rows(block, 14, 16), block.inserted.loc], [['    <Card theme="border">', "      <Text>Hi</Text>", "    </Card>"], "15:6"]);
  const own = run("insert self-closing own line", inline, "<Card\n      theme=\"shadow\"", "Card", ins("<Text>Hi</Text>"));
  check("insert self-closing, /> on its own line: > stays there", [rows(own, 16, 20), own.inserted.loc], [["    <Card", '      theme="shadow"', "    >", "      <Text>Hi</Text>", "    </Card>"], "19:6"]);
  const tail = run("insert self-closing after attrs", inline, "<Card\n      theme=\"semi-pale\"", "Card", ins("<Text>Hi</Text>"));
  check("insert self-closing, /> after the last attribute", [rows(tail, 19, 22), tail.inserted.loc], [["    <Card", '      theme="semi-pale">', "      <Text>Hi</Text>", "    </Card>"], "21:6"]);
  const comment = ["export const K = () => (", "  <Card // the plan", "  />", ");", ""].join("\n");
  const kept = run("insert self-closing after a // comment", comment, "<Card", "Card", ins("<Text>Hi</Text>"));
  check("insert self-closing after a // comment: the comment keeps its line", rows(kept, 2, 7), ["export const K = () => (", "  <Card // the plan", "  >", "    <Text>Hi</Text>", "  </Card>", ");"]);
}

// Multi-line code: re-indented where it lands (lines inside template literals untouched), any line endings.
{
  const ROW = [
    '<Stack direction="row" gap="sm" justify="end">',
    '  <Button level="tertiary" onClick={() => toast({ title: "Invoice preview opened" })}>Preview invoice</Button>',
    '  <Button level="primary" onClick={() => toast({ title: "Invoice sent" })}>Send invoice</Button>',
    "</Stack>",
  ].join("\n");
  const row = run("insert button row", src, "<Card theme=\"border\"", "Card", ins(ROW, { requires: ["toast"] }));
  check("insert button row: the hook first in Plans", rows(row, 10, 12), ["export function Plans({ items, open }: { items: { id: string; name: string }[]; open: boolean }) {", "  const { toast } = useToast();", "  return ("]);
  check("insert button row: re-indented", rows(row, 15, 19), [
    "        <Text>Pro</Text>",
    '        <Stack direction="row" gap="sm" justify="end">',
    '          <Button level="tertiary" onClick={() => toast({ title: "Invoice preview opened" })}>Preview invoice</Button>',
    '          <Button level="primary" onClick={() => toast({ title: "Invoice sent" })}>Send invoice</Button>',
    "        </Stack>",
  ]);
  check("insert button row: Button and useToast imported (sorted new lines)", importLines(row), [IMPORTS[0], 'import { Button } from "../../../components/Button";', ...IMPORTS.slice(1), 'import { useToast } from "../../../components/Toast";']);
  check("insert button row: loc; changed runs from the hook to the element (imports left out)", [row.inserted.loc, row.changed], ["16:8", { from: 11, to: 19 }]);
  const literal = run("insert template literal", src, "<Card theme=\"border\"", "Card", ins("<Text>{`Line one\nline two`}</Text>"));
  check("insert template literal: its second line untouched", rows(literal, 13, 14), ["        <Text>{`Line one", "line two`}</Text>"]);
  const indented = run("insert indented code", src, "<Card theme=\"border\"", "Card", ins("\n    <Stack gap=\"xs\">\n      <Text>A</Text>\n    </Stack>\n"));
  check("insert indented code: its own indentation dropped", rows(indented, 13, 15), ['        <Stack gap="xs">', "          <Text>A</Text>", "        </Stack>"]);
  const crlfCode = run("insert CRLF code into LF", src, "<Card theme=\"border\"", "Card", ins("<Stack gap=\"xs\">\r\n  <Text>A</Text>\r\n</Stack>"));
  ok("insert CRLF code into an LF file: LF only", !crlfCode.code.includes("\r"));
  const crlf = BOM + src.replace(/\n/g, "\r\n");
  const both = run("insert CRLF BOM", crlf, "<Card theme=\"border\"", "Card", ins("<Stack gap=\"xs\">\n  <Text>A</Text>\n</Stack>"));
  check("insert CRLF BOM: rows and loc without the BOM", [rows(both, 13, 15), both.inserted.loc], [['        <Stack gap="xs">', "          <Text>A</Text>", "        </Stack>"], "13:8"]);
  // Text children in CRLF: their whitespace is measured on the raw source (Babel's JSXText value has one LF per CRLF).
  const prose = BOM + page(
    "export function P() {",
    "  return (",
    "    <Stack>",
    "      <Text>",
    "        Hello world.",
    "      </Text>",
    "      <Card theme=\"flat\">",
    "        Hello there",
    "        <b>x</b>",
    "        bye",
    "      </Card>",
    "    </Stack>",
    "  );",
    "}",
  ).replace(/\n/g, "\r\n");
  const afterText = run("insert CRLF after a text child", prose, "<Text>", "Text", ins(BADGE));
  check("insert CRLF after a text child: its own line, no lone LF", [rows(afterText, 11, 14), afterText.inserted.loc], [["      <Text>", "        Hello world.", '        <Badge theme="blue">Pro plan</Badge>', "      </Text>"], "13:8"]);
  const wrapText = run("wrap CRLF text children", prose, "<Card theme=\"flat\"", "Card", ins(BADGE, { index: 1, wrap: { tag: "Stack", props: { gap: str("md") } } }));
  check("wrap CRLF content that starts and ends with text: indented one level", [rows(wrapText, 14, 21), wrapText.inserted.loc], [[
    '      <Card theme="flat">',
    '        <Stack gap="md">',
    "          Hello there",
    '          <Badge theme="blue">Pro plan</Badge>',
    "          <b>x</b>",
    "          bye",
    "        </Stack>",
    "      </Card>",
  ], "17:10"]);
  const tabs = [
    'import { Card } from "../../../components/Card";',
    'import { Stack } from "../../../components/Layout";',
    'import { Text } from "../../../components/Text";',
    "export const T = () => (",
    "\t<Stack>",
    "\t\t<Card theme=\"border\">",
    "\t\t\t<Text>Hi</Text>",
    "\t\t</Card>",
    "\t\t<Card theme=\"flat\" />",
    "\t</Stack>",
    ");",
    "",
  ].join("\n");
  const tabbed = run("insert tabs", tabs, "<Card theme=\"border\"", "Card", ins("<Stack gap=\"xs\">\n  <Text>A</Text>\n</Stack>"));
  check("insert tabs: nested levels become tabs", rows(tabbed, 7, 10), ["\t\t\t<Text>Hi</Text>", "\t\t\t<Stack gap=\"xs\">", "\t\t\t\t<Text>A</Text>", "\t\t\t</Stack>"]);
  const opened = run("insert tabs self-closing", tabs, "<Card theme=\"flat\"", "Card", ins("<Text>A</Text>"));
  check("insert tabs self-closing: a tab deeper", rows(opened, 9, 11), ["\t\t<Card theme=\"flat\">", "\t\t\t<Text>A</Text>", "\t\t</Card>"]);
}

/* ── insertChild: prop slots ──────────────────────────────────────────────────────────────────────────────────────── */
{
  const props = page(
    "export function P({ avatar }: { avatar: () => null }) {",
    "  return (",
    "    <List aria-label=\"People\">",
    "      <ListItem title=\"Bao Nguyen\" leading={<DockIcon icon=\"icon-user-line\" />} />",
    "      <ListItem title=\"Trang Le\" trailing={null} />",
    "      <ListItem title=\"Phin & Co\" />",
    "      <ListItem",
    "        title=\"Loyalty app\"",
    "      />",
    "      <ListItem title=\"Lead\" leading={avatar()} trailing=\"Owner\" />",
    "      <ListItem title=\"Team\" leading={<><DockIcon icon=\"icon-user-line\" /><Badge>2</Badge></>} />",
    "      <ListItem",
    "        title=\"Multi\"",
    "        leading={",
    "          <DockIcon",
    "            icon=\"icon-user-line\"",
    "          />",
    "        }",
    "      />",
    "      <ListItem title=\"Undef\" trailing={undefined} leading={false} />",
    "      <ListItem title=\"Flag\" selected />",
    "    </List>",
    "  );",
    "}",
  );
  const NEW = "<Badge>New</Badge>";
  const absent = run("prop absent", props, "<ListItem title=\"Phin", "ListItem", ins(NEW, { prop: "trailing" }));
  check("prop absent: prop={code} after the last attribute", [rows(absent, 13, 13), absent.inserted.loc], [['      <ListItem title="Phin & Co" trailing={<Badge>New</Badge>} />'], "13:44"]);
  const ownLine = run("prop absent one per line", props, "<ListItem\n        title=\"Loyalty", "ListItem", ins(NEW, { prop: "trailing" }));
  check("prop absent, attributes one per line: its own line", [rows(ownLine, 14, 17), ownLine.inserted.loc], [["      <ListItem", '        title="Loyalty app"', "        trailing={<Badge>New</Badge>}", "      />"], "16:18"]);
  const nulled = run("prop null", props, "<ListItem title=\"Trang", "ListItem", ins(NEW, { prop: "trailing" }));
  check("prop null: replaced", [rows(nulled, 12, 12), nulled.inserted.loc], [['      <ListItem title="Trang Le" trailing={<Badge>New</Badge>} />'], "12:43"]);
  const undef = run("prop undefined", props, "<ListItem title=\"Undef", "ListItem", ins(NEW, { prop: "trailing" }));
  const falsy = run("prop false", props, "<ListItem title=\"Undef", "ListItem", ins(NEW, { prop: "leading" }));
  check("prop undefined / false: replaced", [rows(undef, 27, 27), rows(falsy, 27, 27)], [['      <ListItem title="Undef" trailing={<Badge>New</Badge>} leading={false} />'], ['      <ListItem title="Undef" trailing={undefined} leading={<Badge>New</Badge>} />']]);
  const joined = run("prop one element", props, "<ListItem title=\"Bao", "ListItem", ins(NEW, { prop: "leading" }));
  check("prop one element: a fragment, the new one last", [rows(joined, 11, 11), joined.inserted.loc], [['      <ListItem title="Bao Nguyen" leading={<><DockIcon icon="icon-user-line" /><Badge>New</Badge></>} />'], "11:80"]);
  const firstIn = run("prop one element index 0", props, "<ListItem title=\"Bao", "ListItem", ins(NEW, { prop: "leading", index: 0 }));
  check("prop one element, index 0: the new one first", [rows(firstIn, 11, 11), firstIn.inserted.loc], [['      <ListItem title="Bao Nguyen" leading={<><Badge>New</Badge><DockIcon icon="icon-user-line" /></>} />'], "11:46"]);
  const multi = run("prop multi-line element", props, "<ListItem\n        title=\"Multi", "ListItem", ins(NEW, { prop: "leading" }));
  check("prop multi-line element: a fragment on its own lines", rows(multi, 21, 28), ["        leading={", "          <>", "            <DockIcon", '              icon="icon-user-line"', "            />", "            <Badge>New</Badge>", "          </>", "        }"]);
  const fragment = run("prop fragment", props, "<ListItem title=\"Team", "ListItem", ins(NEW, { prop: "leading" }));
  check("prop fragment: the new element joins it", rows(fragment, 18, 18), ['      <ListItem title="Team" leading={<><DockIcon icon="icon-user-line" /><Badge>2</Badge><Badge>New</Badge></>} />']);
  const fragmentFirst = run("prop fragment index 0", props, "<ListItem title=\"Team", "ListItem", ins(NEW, { prop: "leading", index: 0 }));
  check("prop fragment index 0", rows(fragmentFirst, 18, 18), ['      <ListItem title="Team" leading={<><Badge>New</Badge><DockIcon icon="icon-user-line" /><Badge>2</Badge></>} />']);
  const at = (needle) => locOf(props, needle);
  check("prop from a call: refused", applySlotOp(props, at("<ListItem title=\"Lead"), "ListItem", ins(NEW, { prop: "leading" }), options()).error, "Its content comes from avatar(); edit it in the code.");
  check("prop with a string: refused", applySlotOp(props, at("<ListItem title=\"Lead"), "ListItem", ins(NEW, { prop: "trailing" }), options()).error, 'Its content comes from "Owner"; edit it in the code.');
  check("prop true: refused", applySlotOp(props, at("<ListItem title=\"Flag"), "ListItem", ins(NEW, { prop: "selected" }), options()).error, "Its content comes from `selected` (true); edit it in the code.");
  check("prop names that are not slots: refused", ["onClick", "key", "className", "bad name", 3].map((prop) => applySlotOp(props, at("<ListItem title=\"Flag"), "ListItem", ins(NEW, { prop }), options()).code), ["invalid", "invalid", "invalid", "invalid", "invalid"]);
}

/* ── insertChild: wrap (gap-less slots) ───────────────────────────────────────────────────────────────────────────── */
{
  const wrapSrc = page(
    "export function W() {",
    "  return (",
    "    <Stack gap=\"md\">",
    "      <Card theme=\"border\">",
    "        <Text>Pro</Text>",
    "      </Card>",
    "      <Card theme=\"flat\"><Text>Inline</Text></Card>",
    "      <Card theme=\"pale\" />",
    "      <ListItem title=\"Bao\" leading={<DockIcon icon=\"icon-user-line\" />} />",
    "      <Card theme=\"shadow\">",
    "        <Text>{`a",
    "b`}</Text>",
    "        <Text>Two</Text>",
    "      </Card>",
    "    </Stack>",
    "  );",
    "}",
  );
  const WRAP = { tag: "Stack", props: { gap: str("md") } };
  const NEW = "<Badge>New</Badge>";
  const wrapped = run("wrap", wrapSrc, "<Card theme=\"border\"", "Card", ins(NEW, { wrap: WRAP }));
  check("wrap: the content and the new element in <Stack gap=\"md\">", [rows(wrapped, 11, 16), wrapped.inserted.loc], [['      <Card theme="border">', '        <Stack gap="md">', "          <Text>Pro</Text>", "          <Badge>New</Badge>", "        </Stack>", "      </Card>"], "14:10"]);
  check("wrap: Stack already imported", importLines(wrapped), IMPORTS);
  check("wrap: not copied into a snippet (none here)", "snippet" in wrapped, false);
  const firstIn = run("wrap index 0", wrapSrc, "<Card theme=\"border\"", "Card", ins(NEW, { wrap: WRAP, index: 0 }));
  check("wrap index 0: the new element first", [rows(firstIn, 12, 15), firstIn.inserted.loc], [['        <Stack gap="md">', "          <Badge>New</Badge>", "          <Text>Pro</Text>", "        </Stack>"], "13:10"]);
  const inline = run("wrap inline", wrapSrc, "<Card theme=\"flat\"", "Card", ins(NEW, { wrap: WRAP }));
  check("wrap inline content: inline", [rows(inline, 14, 14), inline.inserted.loc], [['      <Card theme="flat"><Stack gap="md"><Text>Inline</Text><Badge>New</Badge></Stack></Card>'], "14:60"]);
  const inlineFirst = run("wrap inline index 0", wrapSrc, "<Card theme=\"flat\"", "Card", ins(NEW, { wrap: WRAP, index: 0 }));
  check("wrap inline content, index 0", rows(inlineFirst, 14, 14), ['      <Card theme="flat"><Stack gap="md"><Badge>New</Badge><Text>Inline</Text></Stack></Card>']);
  const empty = run("wrap empty", wrapSrc, "<Card theme=\"pale\"", "Card", ins(NEW, { wrap: WRAP }));
  check("wrap an empty slot: no wrapper", rows(empty, 15, 17), ['      <Card theme="pale">', "        <Badge>New</Badge>", "      </Card>"]);
  const prop = run("wrap prop", wrapSrc, "<ListItem", "ListItem", ins(NEW, { prop: "leading", wrap: WRAP }));
  check("wrap a prop's element", rows(prop, 16, 16), ['      <ListItem title="Bao" leading={<Stack gap="md"><DockIcon icon="icon-user-line" /><Badge>New</Badge></Stack>} />']);
  const literal = run("wrap template literal", wrapSrc, "<Card theme=\"shadow\"", "Card", ins(NEW, { wrap: WRAP }));
  check("wrap: lines inside a template literal keep theirs", rows(literal, 17, 23), ['      <Card theme="shadow">', '        <Stack gap="md">', "          <Text>{`a", "b`}</Text>", "          <Text>Two</Text>", "          <Badge>New</Badge>", "        </Stack>"]);
  const middle = run("wrap middle", wrapSrc, "<Card theme=\"shadow\"", "Card", ins(NEW, { wrap: WRAP, index: 1 }));
  check("wrap index 1: before the second child, a level deeper", rows(middle, 18, 22), ['        <Stack gap="md">', "          <Text>{`a", "b`}</Text>", "          <Badge>New</Badge>", "          <Text>Two</Text>"]);
  const grid = page("export const G = () => <Card theme=\"flat\"><Text>A</Text></Card>;").replace('import { Stack } from "../../../components/Layout";', 'import { Grid } from "../../../components/Layout";');
  const intoGrid = run("wrap Stack merged into Layout", grid, "<Card", "Card", ins(NEW, { wrap: WRAP }));
  check("wrap: Stack merged into the Layout import", importLines(intoGrid)[3], 'import { Grid, Stack } from "../../../components/Layout";');
  const gridTag = run("wrap Grid", wrapSrc, "<Card theme=\"flat\"", "Card", ins(NEW, { wrap: { tag: "Grid", props: { columns: { kind: "number", value: 2 } } } }));
  check("wrap in a Grid", rows(gridTag, 14, 14), ['      <Card theme="flat"><Grid columns={2}><Text>Inline</Text><Badge>New</Badge></Grid></Card>']);
  const loc = locOf(wrapSrc, "<Card theme=\"flat\"");
  check("wrap refusals: tag, key, children, props", [
    applySlotOp(wrapSrc, loc, "Card", ins(NEW, { wrap: { tag: "div" } }), options()).error,
    applySlotOp(wrapSrc, loc, "Card", ins(NEW, { wrap: { tag: "Stack", props: { key: str("k") } } }), options()).code,
    applySlotOp(wrapSrc, loc, "Card", ins(NEW, { wrap: { tag: "Stack", props: { children: str("k") } } }), options()).code,
    applySlotOp(wrapSrc, loc, "Card", ins(NEW, { wrap: { tag: "Stack", props: [] } }), options()).code,
    applySlotOp(wrapSrc, loc, "Card", ins(NEW, { wrap: "Stack" }), options()).code,
  ], ['wrap puts the slot\'s content in Stack, Grid, Box (not "div")', "invalid", "invalid", "invalid", "invalid"]);
}

/* ── removeElement: state the removed layer was the last to read (E2E ST-10) ─────────────────────────────────────── */
{
  const statePage = [
    'import { useState } from "react";',
    ...IMPORTS,
    "",
    "export function A() {",
    "  const [loud, setLoud] = useState(false);",
    "  const [size, setSize] = useState<\"sm\" | \"md\">(\"md\");",
    "  return (",
    "    <Stack gap=\"sm\">",
    "      <Button level={loud ? \"primary\" : \"tertiary\"} onClick={() => setLoud(!loud)}>Loud</Button>",
    "      <Button size={size} onClick={() => setSize(\"sm\")}>Size</Button>",
    "      <Text>{size}</Text>",
    "    </Stack>",
    "  );",
    "}",
    "",
  ].join("\n");
  const loud = run("state: remove its only reader", statePage, "<Button level={loud", "Button", REMOVE);
  ok("state: the loud pair goes with its button", !loud.code.includes("useState(false)"));
  ok("state: the size pair stays (still read)", loud.code.includes("const [size, setSize] = useState"));
  ok("state: react's useState import stays (size still uses it)", loud.code.startsWith('import { useState } from "react";'));
  const both = run("state: remove the size button", loud.code, "<Button size={size}", "Button", REMOVE);
  ok("state: size still read by the Text, kept", both.code.includes("const [size, setSize] = useState"));
  const last = run("state: remove the last reader", both.code, "<Text>{size}", "Text", REMOVE);
  ok("state: no useState left, the import goes too", !last.code.includes("useState"));
}

/* ── insertChild: toast ───────────────────────────────────────────────────────────────────────────────────────────── */
{
  const toastPage = page(
    "export function A() {",
    "  return (",
    "    <Card theme=\"border\">",
    "      <Text>Pro</Text>",
    "    </Card>",
    "  );",
    "}",
    "export function B() {",
    "  const { toast } = useToast();",
    "  return <Card theme=\"flat\" />;",
    "}",
    "export const C = () => <Card theme=\"pale\" />;",
    "function helper() {",
    "  return <Card theme=\"shadow\" />;",
    "}",
    "export function D({ items }: { items: string[] }) {",
    "  return (",
    "    <List aria-label=\"Rows\">",
    "      {items.map((item) => <ListItem key={item} title={item} />)}",
    "    </List>",
    "  );",
    "}",
    "export function E() { return <Card theme=\"semi-pale\" />; }",
    "export const M = memo(() => {",
    "  return <Card theme=\"border\" spacing=\"sm\" />;",
    "});",
    "export function F({ toast }: { toast: (options: { title: string }) => void }) {",
    "  return <Card theme=\"flat\" spacing=\"sm\" />;",
    "}",
    "export const examples = [{ title: \"x\", render: () => <Card theme=\"flat\" spacing=\"md\" /> }];",
  );
  const BUTTON = '<Button level="tertiary" onClick={() => toast({ title: "Report exported" })}>Export report</Button>';
  const opts = { requires: ["toast"] };
  const a = run("toast hook", toastPage, "<Card theme=\"border\">", "Card", ins(BUTTON, opts));
  ok("toast hook: first statement of A", a.code.includes("export function A() {\n  const { toast } = useToast();\n  return ("));
  check("toast hook: useToast and Button imported", importLines(a), [IMPORTS[0], 'import { Button } from "../../../components/Button";', ...IMPORTS.slice(1), 'import { useToast } from "../../../components/Toast";']);
  const b = run("toast reuse", toastPage, "<Card theme=\"flat\" />", "Card", ins(BUTTON, opts));
  check("toast reuse: no second hook, no useToast import", [b.code.split("useToast()").length, importLines(b).some((line) => line.includes("Toast"))], [2, false]);
  check("toast in an arrow without a body: refused", /returns its JSX directly/.test(applySlotOp(toastPage, locOf(toastPage, "<Card theme=\"pale\""), "Card", ins(BUTTON, opts), options()).error), true);
  check("toast in a lowercase helper: refused", /no component encloses this slot/.test(applySlotOp(toastPage, locOf(toastPage, "<Card theme=\"shadow\""), "Card", ins(BUTTON, opts), options()).error), true);
  check("toast in an example's render: refused", /no component encloses this slot/.test(applySlotOp(toastPage, locOf(toastPage, "<Card theme=\"flat\" spacing=\"md\""), "Card", ins(BUTTON, opts), options()).error), true);
  const d = run("toast in a .map row", toastPage, "<ListItem key", "ListItem", ins(BUTTON, opts));
  ok("toast in a .map row: the hook goes in the component around the callback", d.code.includes("export function D({ items }: { items: string[] }) {\n  const { toast } = useToast();\n  return ("));
  ok("toast in a .map row: the row opens inline", d.code.includes('{items.map((item) => <ListItem key={item} title={item}><Button level="tertiary"'));
  const e = run("toast one-line body", toastPage, "<Card theme=\"semi-pale\"", "Card", ins(BUTTON, opts));
  ok("toast one-line body: the hook after {", e.code.includes("export function E() { const { toast } = useToast(); return <Card"));
  const m = run("toast memo", toastPage, "<Card theme=\"border\" spacing", "Card", ins(BUTTON, opts));
  ok("toast memo(() => {…}): the hook in M", m.code.includes("export const M = memo(() => {\n  const { toast } = useToast();\n  return"));
  const f = run("toast parameter", toastPage, "<Card theme=\"flat\" spacing=\"sm\"", "Card", ins(BUTTON, opts));
  check("toast parameter in scope: reused", f.code.split("useToast()").length, 2);
  // Another `toast` in scope is not called (tsc would fail, the click would throw): refused with a reason.
  const ownToast = (...body) => { const code = page(...body); return applySlotOp(code, locOf(code, "<Card"), "Card", ins(BUTTON, opts), options()).error; };
  const another = (what) => `The action calls toast, but this slot already sees another \`toast\` (${what}), not useToast's; rename it before inserting an action.`;
  check("toast: another toast in scope → refused", [
    ownToast("export function G({ toast }: { toast: string }) {", "  return <Card theme=\"flat\" title={toast} />;", "}"),
    ownToast("export function G(props: { note: string }) {", "  const items = [props.note].map((toast) => <Card theme=\"flat\" title={toast} />);", "  return <>{items}</>;", "}"),
    ownToast("export function H() {", "  const [toast, setToast] = useState(\"\");", "  return <Card theme=\"flat\" title={toast} onClick={() => setToast(\"x\")} />;", "}"),
    ownToast("const toast = \"Saved\";", "export function K() {", "  return <Card theme=\"flat\" title={toast} />;", "}"),
    ownToast("export function O() {", "  const toast = useToast();", "  return <Card theme=\"flat\" />;", "}"),
  ], [another("a prop or parameter"), another("a prop or parameter"), another("a variable or state"), another("a variable or state"), another("a variable or state")]);
  const typed = page("export function L({ toast }: { toast: ToastApi[\"toast\"] }) {", "  return <Card theme=\"flat\" />;", "}");
  check("toast: a ToastApi[\"toast\"] parameter is reused", run("toast ToastApi parameter", typed, "<Card", "Card", ins(BUTTON, opts)).code.includes("useToast"), false);
  const member = page("export function Q() {", "  const toast = useToast().toast;", "  return <Card theme=\"flat\" />;", "}");
  check("toast: useToast().toast is reused", run("toast member", member, "<Card", "Card", ins(BUTTON, opts)).code.split("useToast()").length, 2);
  const noSemi = page("export function N() {", "  return <Card theme=\"flat\" />", "}").replace(/;$/gm, "");
  const n = run("toast no semicolons", noSemi, "<Card", "Card", ins(BUTTON, opts));
  ok("toast in a file without semicolons: none added", n.code.includes("  const { toast } = useToast()\n") && importLines(n).every((line) => !line.endsWith(";")));
  const template = ["import { useState } from \"react\";", "import {", "  Card,", "  Stack,", "  type IconName,", "} from \"@zen/design-system\";", "export function T() {", "  const [open] = useState(false);", "  return <Card theme=\"flat\" />;", "}", ""].join("\n");
  const t = run("toast template", template, "<Card", "Card", ins(BUTTON, { ...opts }), { file: TEMPLATE });
  check("toast template: names merged into @zen/design-system, one per line", t.code.split("\n").slice(1, 9), ["import {", "  Button,", "  Card,", "  Stack,", "  useToast,", "  type IconName,", '} from "@zen/design-system";', "export function T() {"]);
  ok("toast template: the hook before the first statement", t.code.includes("export function T() {\n  const { toast } = useToast();\n  const [open] = useState(false);"));
  const crlf = BOM + toastPage.replace(/\n/g, "\r\n");
  const crlfHook = run("toast CRLF BOM", crlf, "<Card theme=\"border\">", "Card", ins(BUTTON, opts));
  ok("toast CRLF BOM: the hook on its own CRLF line", crlfHook.code.includes("export function A() {\r\n  const { toast } = useToast();\r\n  return ("));
  const unused = run("requires without a use", src, "<Card theme=\"border\"", "Card", ins(BADGE, opts));
  check("requires toast but the code does not use it: no hook", unused.code.includes("useToast"), false);
}

/* ── insertChild: the code ────────────────────────────────────────────────────────────────────────────────────────── */
{
  const loc = locOf(src, "<Card theme=\"border\"");
  const refusal = (code, extra) => applySlotOp(src, loc, "Card", ins(code, extra), options()).error;
  check("code: a fragment", refusal("<><Text>A</Text></>"), "The code is a fragment (<>…</>); insert one element (a Stack holds several)");
  ok("code: two elements", /^The code is not one JSX element/.test(refusal("<Text>A</Text><Text>B</Text>")));
  check("code: not JSX", refusal("1 + 2"), "The code is not one JSX element");
  check("code: data-zen-src", refusal('<Text data-zen-src="x">Hi</Text>'), "The code carries data-zen-src; the Studio adds it");
  check("code: a raw line separator", refusal(`<Text>a${LINE_SEPARATOR}b</Text>`), "The code holds a line separator (U+2028/U+2029); write it as \\u2028");
  check("code: a free name", refusal("<Text>{items.length}</Text>"), "The code uses `items`, which a slot cannot provide (only Zen components and toast); write the value in the code");
  check("code: a hook call", refusal("<Text>{useToast().toast.name}</Text>"), "The code uses `useToast`, which a slot cannot provide (only Zen components and toast); write the value in the code");
  check("code: a local component", refusal("<RowCard />"), "<RowCard> is not a Zen component (no src/components folder exports it); inserted code can use Zen components only");
  check("code: docs chrome", refusal('<PlaygroundSlot name="x" />'), "<PlaygroundSlot> is docs chrome; it cannot be inserted");
  check("code: something after the element", refusal("<Text>Hi</Text> // note"), "The code must be one JSX element and nothing else");
  check("code: empty or not a string", [refusal(""), refusal(42)], ["insertChild needs `code`: one JSX element", "insertChild needs `code`: one JSX element"]);
  check("code: requires lists only toast and media", refusal(BADGE, { requires: ["router"] }), '`requires` lists what the code needs: "toast" or "media"');
  check("code: undefined, parameters and member names are not free", applySlotOp(src, loc, "Card", ins('<InputField label="Name" helpText={undefined} onChange={(event) => toast({ title: event.target.value })} />'), options()).code.includes("useToast()"), true);
  const local = page("const Divider = () => null;", "export const L = () => <Card theme=\"flat\" />;");
  check("code: the file's own Divider", applySlotOp(local, locOf(local, "<Card"), "Card", ins("<Divider />"), options()).error, "The file declares its own Divider; rename it before inserting.");
  const foreign = ['import { Divider } from "./my-divider";', ...IMPORTS, "export const L = () => <Card theme=\"flat\" />;", ""].join("\n");
  check("code: a foreign Divider import", applySlotOp(foreign, locOf(foreign, "<Card"), "Card", ins("<Divider />"), options()).error, 'The file\'s own Divider (imported from "./my-divider") is not Zen\'s Divider; rename it before inserting.');
  const fallback = applySlotOp(src, loc, "Card", ins("<Divider />"), { file: PAGE });
  check("code: without componentModules the common names still import", importLines(fallback).includes('import { Divider } from "../../../components/Divider";'), true);
}

/* ── insertChild: imports ─────────────────────────────────────────────────────────────────────────────────────────── */
{
  const divider = run("import new line", src, "<Card theme=\"border\"", "Card", ins("<Divider />"));
  check("import: a new line sorted among the folder imports", importLines(divider), [IMPORTS[0], IMPORTS[1], 'import { Divider } from "../../../components/Divider";', ...IMPORTS.slice(2)]);
  check("import: changed is the element's line", [divider.changed, divider.inserted.loc], [{ from: 14, to: 14 }, "14:8"]);
  const several = run("import several", src, "<Card theme=\"border\"", "Card", ins('<Stack gap="xs">\n  <Divider />\n  <ProgressBar value={60} label aria-label="Profile completion" />\n</Stack>'));
  check("import: several folders", importLines(several), [IMPORTS[0], IMPORTS[1], 'import { Divider } from "../../../components/Divider";', ...IMPORTS.slice(2, 5), 'import { ProgressBar } from "../../../components/Progress";', IMPORTS[5]]);
  const merged = run("import merged", src, "<Card theme=\"border\"", "Card", ins("<Heading level={3} textStyle=\"Heading/Subheading\">Plan</Heading>"));
  check("import: merged into the folder's import", importLines(merged)[5], 'import { Heading, Text } from "../../../components/Text";');
  const member = run("import member tag", src, "<Card theme=\"border\"", "Card", ins("<Text.Fake>Hi</Text.Fake>"));
  check("import: a member tag needs its root only", importLines(member), IMPORTS);
  const oneLine = ["import { Card, Stack } from \"@zen/design-system\";", "export const T = () => <Card theme=\"flat\" />;", ""].join("\n");
  const pkg = run("import template one line", oneLine, "<Card", "Card", ins(BADGE), { file: TEMPLATE });
  check("import: a template's package import", importLines(pkg), ['import { Badge, Card, Stack } from "@zen/design-system";']);
  const bare = ["export const T = () => <div />;", ""].join("\n");
  const fresh = run("import template without imports", bare, "<div", "div", ins(BADGE), { file: TEMPLATE });
  check("import: a template without imports gets a package line; loc moved", [importLines(fresh), fresh.inserted.loc], [['import { Badge } from "@zen/design-system";'], "2:28"]);
  const platformPkg = ['import { Card } from "@zen/design-system";', "export const T = () => <Card theme=\"flat\" />;", ""].join("\n");
  check("import: an example importing the package keeps to it", importLines(run("import platform package", platformPkg, "<Card", "Card", ins(BADGE))), ['import { Badge, Card } from "@zen/design-system";']);
}

/* ── guards ───────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const loc = locOf(src, "<Card theme=\"border\"");
  const where = (file) => applySlotOp(src, loc, "Card", ins(BADGE), options({ file })).code;
  // Shared demo code (plan WP-B2) asks first (code "confirm"); playground files, components and unknown files never.
  check("guard: example pages and templates; shared code asks", ["src/platform/PlatformExamples.tsx", "src/platform/PlatformMobilePlaygrounds.tsx", "src/platform/appLayer/templates.tsx", "src/platform/PlatformDemoActions.tsx", "src/components/Card/Card.tsx", undefined].map(where), ["forbidden", "forbidden", "confirm", "confirm", "forbidden", "forbidden"]);
  check("guard: the reason", applySlotOp(src, loc, "Card", ins(BADGE), options({ file: "src/platform/PlatformExamples.tsx" })).error, "Slot content is restructured in example pages (src/platform/examples/pages), templates (src/templates) and shared demo code only, not in src/platform/PlatformExamples.tsx.");
  check("guard: shared code after the yes", applySlotOp(src, loc, "Card", ins(BADGE), options({ file: "src/platform/PlatformDemoActions.tsx", shared: true })).error, undefined);
  const chrome = page("// zen-studio-chrome", "export function ExampleCard() {", "  return <div><span>x</span></div>;", "}");
  check("guard: inside docs chrome", applySlotOp(chrome, locOf(chrome, "<span"), "span", ins(BADGE), options()).code, "forbidden");
  const playground = page("export function CardPlayground() {", "  return <Card theme=\"flat\" />;", "}");
  check("guard: a *Playground declaration", errorOf(applySlotOp(playground, locOf(playground, "<Card"), "Card", ins(BADGE), options())), ["forbidden", "It is in <CardPlayground>: a playground's slots stay empty (add content in an example)."]);
  // An example's own screens (`if (step === "cart")`, `else if (opened)`) are instance content: the platform's
  // `if (page === …)` playgrounds live in PlatformExamples.tsx, which isSlotFile refuses above.
  const branch = page("export function Checkout({ step }: { step: string }) {", "  if (step === \"cart\") {", "    return <Card theme=\"flat\" />;", "  } else if (step) {", "    return <Card theme=\"pale\" />;", "  }", "  return null;", "}");
  check("guard: an example's if (step === …) screens stay editable", [
    run("guard: if branch", branch, "<Card theme=\"flat\"", "Card", ins(BADGE)).inserted?.loc,
    run("guard: else-if branch", branch, "<Card theme=\"pale\"", "Card", ins(BADGE)).inserted?.loc,
  ], ["10:30", "12:30"]);
  const slot = page("export function S() {", "  return (", "    <Card theme=\"flat\">", "      <PlaygroundSlot name=\"Content slot\" />", "      <Text>Note</Text>", "    </Card>", "  );", "}");
  const slotOpts = options({ hash: sha1(slot) });
  check("guard: a parent holding a PlaygroundSlot", [
    applySlotOp(slot, locOf(slot, "<Card"), "Card", ins(BADGE), slotOpts).code,
    applySlotOp(slot, locOf(slot, "<PlaygroundSlot"), "PlaygroundSlot", REMOVE, slotOpts).code,
    applySlotOp(slot, locOf(slot, "<Text"), "Text", REMOVE, slotOpts).code,
    applySlotOp(slot, locOf(slot, "<Text"), "Text", move("prev"), slotOpts).code,
    applySlotOp(slot, locOf(slot, "<Text"), "Text", DUPLICATE, slotOpts).code,
  ], ["forbidden", "forbidden", "forbidden", "forbidden", "forbidden"]);
  const exampleCard = page("export function S() {", "  return <ExampleCard title=\"x\"><Text>Hi</Text></ExampleCard>;", "}");
  check("guard: docs chrome call sites", [
    applySlotOp(exampleCard, locOf(exampleCard, "<ExampleCard"), "ExampleCard", ins(BADGE), options()).code,
    applySlotOp(exampleCard, locOf(exampleCard, "<Text"), "Text", REMOVE, options({ hash: sha1(exampleCard) })).code,
  ], ["forbidden", "forbidden"]);
  check("guard: stale name, not found, bad loc", [
    applySlotOp(src, loc, "Text", ins(BADGE), options()).code,
    applySlotOp(src, "1:0", "Card", ins(BADGE), options()).code,
    applySlotOp(src, "x", "Card", ins(BADGE), options()).code,
  ], ["stale", "not-found", "invalid"]);
  check("guard: unknown or missing op", [applySlotOp(src, loc, "Card", { op: "wrap" }, options()).error, applySlotOp(src, loc, "Card", null, options()).code], ['Unknown slot op "wrap"', "invalid"]);
  const textLoc = locOf(src, "<Text>Pro");
  check("guard: remove and move need the hash", [
    applySlotOp(src, textLoc, "Text", REMOVE, options()).error,
    applySlotOp(src, textLoc, "Text", move("next"), options()).code,
    applySlotOp(src, textLoc, "Text", REMOVE, options({ hash: sha1(`${src} `) })).code,
    applySlotOp(src, textLoc, "Text", DUPLICATE, options()).code === undefined,
  ], ["Remove and move need the file's hash (send `hash` with the request)", "invalid", "stale", false]);
}

/* ── removeElement ────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const text = run("remove child", src, "<Text>Pro", "Text", REMOVE);
  check("remove child: its line goes; Text still used, its import stays", [rows(text, 11, 12), importLines(text), text.changed], [['      <Card theme="border">', "      </Card>"], IMPORTS, { from: 12, to: 12 }]);
  const badge = run("remove last use", src, "<Badge theme", "Badge", REMOVE);
  check("remove the last Badge: its import goes too", [importLines(badge), badge.changed], [IMPORTS.slice(1), { from: 21, to: 21 }]);
  const card = run("remove multi-line child", src, "<Card theme=\"border\"", "Card", REMOVE);
  check("remove a multi-line child: all its lines", rows(card, 10, 12), ['    <Stack gap="md">', '      <Card theme="flat" />', '      <List aria-label="Team">']);
  const leading = run("remove attribute value", src, "<DockIcon", "DockIcon", REMOVE);
  check("remove a prop's element: the attribute goes, DockIcon's import too", [rows(leading, 16, 16), importLines(leading).some((line) => line.includes("DockIcon"))], [["          <ListItem key={item.id} title={item.name} />"], false]);
  const and = run("remove && right side", src, "<Text>Open", "Text", REMOVE);
  check("remove the && right side: the whole condition's line", [rows(and, 19, 20), and.code.includes("{open &&")], [["      </List>", "      {open ? <Text>Shown</Text> : <Text>Hidden</Text>}"], false]);
  const branch = run("remove ternary branch", src, "<Text>Shown", "Text", REMOVE);
  check("remove a ternary branch: null", rows(branch, 21, 21), ["      {open ? null : <Text>Hidden</Text>}"]);
  check("remove a .map row: refused", applySlotOp(src, locOf(src, "<ListItem"), "ListItem", REMOVE, options({ hash: sha1(src) })).error, "<ListItem> is the row of a .map list; remove the row in its data (here it would remove every row).");
  check("remove a component's root: refused", applySlotOp(src, locOf(src, "<Stack"), "Stack", REMOVE, options({ hash: sha1(src) })).error, "<Stack> is the root of Plans; there would be nothing left to render.");
  const roots = page(
    "export const C = () => <Card theme=\"flat\" />;",
    "const body = <Text>Hi</Text>;",
    "export const examples = [{ render: () => <Card theme=\"pale\" /> }];",
    "export const wrapped = String(<Text>Wrapped</Text>);",
    "export const data = { icon: <DockIcon icon=\"icon-user-line\" /> };",
    "export function N({ open }: { open: boolean }) {",
    "  return open ? <Text>Only</Text> : null;",
    "}",
  );
  const reason = (needle, name) => applySlotOp(roots, locOf(roots, needle), name, REMOVE, options({ hash: sha1(roots) })).error;
  check("remove roots: refused with their reason", [
    reason("<Card theme=\"flat\"", "Card"),
    reason("<Text>Hi", "Text"),
    reason("<Card theme=\"pale\"", "Card"),
    reason("<Text>Wrapped", "Text"),
    reason("<DockIcon", "DockIcon"),
    reason("<Text>Only", "Text"),
  ], [
    "<Card> is the root of C; there would be nothing left to render.",
    "<Text> is the value of `body`; remove it where that is used, or edit the code.",
    "<Card> is the root of the example's render; there would be nothing left to render.",
    "<Text> is passed to a function call; edit it in the code.",
    "<DockIcon> is a value in an object (data); edit the data in the code.",
    "<Text> is the root of N; there would be nothing left to render.",
  ]);
  const shapes = page(
    "export function R({ open, more }: { open: boolean; more: boolean }) {",
    "  return (",
    "    <Stack>",
    "      {open ? <Text>Open</Text> : null}",
    "      {open ? <Text>A</Text> : more ? <Text>B</Text> : null}",
    "      {open ? (",
    "        <Text>Long</Text>",
    "      ) : (",
    "        <Text>Short</Text>",
    "      )}",
    "      {[<Text key=\"a\">A</Text>, <Text key=\"b\">B</Text>]}",
    "      {[",
    "        <Text key=\"c\">C</Text>,",
    "        <Text key=\"d\">D</Text>,",
    "      ]}",
    "      <ListItem title=\"Solo\" leading={<><DockIcon icon=\"icon-user-line\" /></>} />",
    "      <ListItem title=\"Pair\" leading={<><DockIcon icon=\"icon-user-line\" /><Badge>2</Badge></>} />",
    "      {/* zen-detached: Card · Zen Studio */}",
    "      <Stack gap=\"md\">",
    "        <Text>Detached</Text>",
    "      </Stack>",
    "      <p>Hello <b>x</b> world</p>",
    "      <p>Hello <i>y</i></p>",
    "      <p><u>z</u> world</p>",
    "    </Stack>",
    "  );",
    "}",
  );
  const shape = (label, needle, name) => run(label, shapes, needle, name, REMOVE);
  check("remove from {c ? x : null}: the whole condition", shape("remove ternary null", "<Text>Open", "Text").code.includes("{open ? <Text>Open"), false);
  check("remove from a ternary chain: the inner condition becomes null", rows(shape("remove ternary chain", "<Text>B", "Text"), 12, 12), ["      {open ? <Text>A</Text> : null}"]);
  check("remove a parenthesised branch: null without the parentheses", rows(shape("remove parenthesised", "<Text>Long", "Text"), 13, 15), ["      {open ? null : (", "        <Text>Short</Text>", "      )}"]);
  check("remove an array item: with its comma", [rows(shape("remove array first", "<Text key=\"a\"", "Text"), 18, 18), rows(shape("remove array last", "<Text key=\"b\"", "Text"), 18, 18)], [['      {[<Text key="b">B</Text>]}'], ['      {[<Text key="a">A</Text>]}']]);
  check("remove an array item on its own line", rows(shape("remove array line", "<Text key=\"c\"", "Text"), 19, 21), ["      {[", '        <Text key="d">D</Text>,', "      ]}"]);
  check("remove the only child of a prop's fragment: the attribute", rows(shape("remove fragment only", "<DockIcon", "DockIcon"), 23, 23), ['      <ListItem title="Solo" />']);
  check("remove one child of a prop's fragment (Badge's import goes)", rows(shape("remove fragment one", "<Badge>2", "Badge"), 23, 23), ['      <ListItem title="Pair" leading={<><DockIcon icon="icon-user-line" /></>} />']);
  const detached = shape("remove detached", "<Stack gap=\"md\">", "Stack");
  check("remove a detached element: its marker goes too", rows(detached, 25, 26), ["      <p>Hello <b>x</b> world</p>", "      <p>Hello <i>y</i></p>"]);
  check("remove inline: one space stays", rows(shape("remove inline middle", "<b>", "b"), 29, 29), ["      <p>Hello world</p>"]);
  check("remove inline at the end", rows(shape("remove inline end", "<i>", "i"), 30, 30), ["      <p>Hello</p>"]);
  check("remove inline at the start", rows(shape("remove inline start", "<u>", "u"), 31, 31), ["      <p>world</p>"]);
  const lists = page("export function L() {", "  return (", "    <List aria-label=\"Team\">", "      <ListItem title=\"Only\" />", "    </List>", "  );", "}");
  check("remove the only child of a component that requires children: refused", applySlotOp(lists, locOf(lists, "<ListItem"), "ListItem", REMOVE, options({ hash: sha1(lists) })).error, "<ListItem> is the only content of <List>, which needs children; replace it instead of removing it.");
  check("…allowed when children are not required", run("remove only child", lists, "<ListItem", "ListItem", REMOVE, { requiredChildren: new Set() }).removed, true);
  const dialog = page("export function G() {", "  return <Dialog open title={<Text>Delete file?</Text>} />;", "}");
  check("remove a required prop's element: refused", applySlotOp(dialog, locOf(dialog, "<Text"), "Text", REMOVE, options({ hash: sha1(dialog) })).error, "<Text> is the title of <Dialog>, which requires it; replace it instead of removing it.");
  const crlf = BOM + src.replace(/\n/g, "\r\n");
  const removed = run("remove CRLF BOM", crlf, "<Text>Pro", "Text", REMOVE);
  check("remove CRLF BOM: the line and its CRLF", rows(removed, 11, 12), ['      <Card theme="border">', "      </Card>"]);
  // Between two blank lines one of them goes too (no double blank line); one blank neighbour stays.
  const spaced = page(
    "export function S() {",
    "  return (",
    "    <Stack>",
    "      <Text>Top</Text>",
    "",
    "      <Card theme=\"flat\" />",
    "",
    "      <Text>Bottom</Text>",
    "",
    "      <Badge>Last</Badge>",
    "    </Stack>",
    "  );",
    "}",
  );
  // (the Card was the last one: its import line goes too, one row up)
  check("remove between blank lines: one blank line stays", rows(run("remove between blanks", spaced, "<Card", "Card", REMOVE), 10, 14), ["      <Text>Top</Text>", "", "      <Text>Bottom</Text>", "", "      <Badge>Last</Badge>"]);
  check("remove between blank lines, CRLF", rows(run("remove between blanks CRLF", spaced.replace(/\n/g, "\r\n"), "<Text>Bottom", "Text", REMOVE), 13, 16), ['      <Card theme="flat" />', "", "      <Badge>Last</Badge>", "    </Stack>"]);
  check("remove after one blank line: it stays", rows(run("remove after a blank", spaced, "<Text>Top", "Text", REMOVE), 10, 12), ["    <Stack>", "", '      <Card theme="flat" />']);
  const commented = src.replace(IMPORTS[0], `${IMPORTS[0]} // status chips`);
  const dropped = run("remove last use, import with a comment", commented, "<Badge theme", "Badge", REMOVE);
  check("remove the last Badge: its import line goes with its trailing comment", [importLines(dropped), dropped.code.includes("status chips"), dropped.code.startsWith(IMPORTS[1])], [IMPORTS.slice(1), false, true]);
}

/* ── duplicateElement ─────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const text = run("duplicate child", src, "<Text>Pro", "Text", DUPLICATE);
  check("duplicate a child: the copy on the next line", [rows(text, 12, 13), text.inserted.loc, text.changed], [["        <Text>Pro</Text>", "        <Text>Pro</Text>"], "13:8", { from: 13, to: 13 }]);
  const card = run("duplicate multi-line", src, "<Card theme=\"border\"", "Card", DUPLICATE);
  check("duplicate a multi-line child", [rows(card, 11, 16), card.inserted.loc], [['      <Card theme="border">', "        <Text>Pro</Text>", "      </Card>", '      <Card theme="border">', "        <Text>Pro</Text>", "      </Card>"], "14:6"]);
  const prop = run("duplicate prop", src, "<DockIcon", "DockIcon", DUPLICATE);
  check("duplicate a prop's element: a fragment", rows(prop, 17, 17), ['          <ListItem key={item.id} title={item.name} leading={<><DockIcon icon="icon-user-line" /><DockIcon icon="icon-user-line" /></>} />']);
  const branch = run("duplicate ternary branch", src, "<Text>Shown", "Text", DUPLICATE);
  check("duplicate a ternary branch: a fragment", rows(branch, 21, 21), ["      {open ? <><Text>Shown</Text><Text>Shown</Text></> : <Text>Hidden</Text>}"]);
  const inline = ["export const I = () => <p>Hello <b>x</b></p>;", ""].join("\n");
  check("duplicate inline", rows(run("duplicate inline", inline, "<b>", "b", DUPLICATE), 1, 1), ["export const I = () => <p>Hello <b>x</b><b>x</b></p>;"]);
  check("duplicate a keyed element: refused", applySlotOp(src, locOf(src, "<ListItem"), "ListItem", DUPLICATE, options()).error, "<ListItem> has a key (key={item.id}); a copy would repeat it. Edit it in the code.");
  check("duplicate a root: refused", applySlotOp(src, locOf(src, "<Stack"), "Stack", DUPLICATE, options()).error, "<Stack> is the root of Plans; wrap it in a layout first, then duplicate it inside.");
}

/* ── moveElement ──────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const down = run("move next", src, "<Card theme=\"border\"", "Card", move("next"));
  check("move next: swapped with the next sibling", [rows(down, 11, 14), down.moved.loc, down.changed], [['      <Card theme="flat" />', '      <Card theme="border">', "        <Text>Pro</Text>", "      </Card>"], "12:6", { from: 11, to: 14 }]);
  const up = run("move prev", src, "<Card theme=\"flat\"", "Card", move("prev"));
  check("move prev: the same text, the moved element first", [up.code === down.code, up.moved.loc], [true, "11:6"]);
  const around = run("move past a condition", src, "<Badge theme", "Badge", move("prev"));
  check("move past an expression sibling", rows(around, 21, 22), ['      <Badge theme="green">Active</Badge>', "      {open ? <Text>Shown</Text> : <Text>Hidden</Text>}"]);
  check("move at the ends: refused", [
    applySlotOp(src, locOf(src, "<Badge theme"), "Badge", move("next"), options({ hash: sha1(src) })).error,
    applySlotOp(src, locOf(src, "<Card theme=\"border\""), "Card", move("prev"), options({ hash: sha1(src) })).error,
    applySlotOp(src, locOf(src, "<Text>Pro"), "Text", move("next"), options({ hash: sha1(src) })).error,
  ], ["<Badge> is already the last item in <Stack>.", "<Card> is already the first item in <Stack>.", "<Text> is already the last item in <Card>."]);
  check("move a prop's element: refused", applySlotOp(src, locOf(src, "<DockIcon"), "DockIcon", move("next"), options({ hash: sha1(src) })).error, "<DockIcon> is not one of an element's children (it sits in a prop); only children move.");
  check("move without a direction: refused", applySlotOp(src, locOf(src, "<Badge theme"), "Badge", move("up"), options({ hash: sha1(src) })).error, 'moveElement needs `to`: "prev" or "next"');
  const words = ["export const I = () => <p>Hello <b>x</b> and <i>y</i></p>;", ""].join("\n");
  const swapped = run("move over text", words, "<b>", "b", move("next"));
  check("move over text: text stays, elements swap", [rows(swapped, 1, 1), swapped.moved.loc], [["export const I = () => <p>Hello <i>y</i> and <b>x</b></p>;"], "1:45"]);
  const uneven = ["export const U = () => (", "  <Stack>", "    <Text>A</Text>", "        <Card theme=\"flat\">", "          <Text>B</Text>", "        </Card>", "  </Stack>", ");", ""].join("\n");
  const reindented = run("move uneven", uneven, "<Card", "Card", move("prev"));
  check("move between indentations: each piece re-indented", rows(reindented, 3, 6), ['    <Card theme="flat">', "      <Text>B</Text>", "    </Card>", "        <Text>A</Text>"]);
  const braces = ["export const B = () => <Stack>{<Text>A</Text>}<Text>B</Text></Stack>;", ""].join("\n");
  const fromBraces = run("move braced child", braces, "<Text>A", "Text", move("next"));
  check("move a {<X />} child: the braces move with it", [rows(fromBraces, 1, 1), fromBraces.moved.loc], [["export const B = () => <Stack><Text>B</Text>{<Text>A</Text>}</Stack>;"], "1:45"]);
  check("remove a {<X />} child", rows(run("remove braced child", braces, "<Text>A", "Text", REMOVE), 1, 1), ["export const B = () => <Stack><Text>B</Text></Stack>;"]);
  const marked = ["export const D = () => (", "  <Stack>", "    <Text>A</Text>", "    {/* zen-detached: Card · Zen Studio */}", "    <Stack gap=\"md\">", "      <Text>B</Text>", "    </Stack>", "  </Stack>", ");", ""].join("\n");
  const withMarker = run("move with marker", marked, "<Stack gap", "Stack", move("prev"));
  check("move a detached element: its marker moves with it", [rows(withMarker, 3, 7), withMarker.moved.loc], [["    {/* zen-detached: Card · Zen Studio */}", '    <Stack gap="md">', "      <Text>B</Text>", "    </Stack>", "    <Text>A</Text>"], "4:4"]);
}

/* ── clearSlot ────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const card = run("clear children", src, "<Card theme=\"border\"", "Card", clear());
  check("clear children: the tag closes itself; Text is still used, its import stays", [rows(card, 10, 13), card.changed, importLines(card), "snippet" in card], [['    <Stack gap="md">', '      <Card theme="border" />', '      <Card theme="flat" />', '      <List aria-label="Team">'], { from: 11, to: 11 }, IMPORTS, false]);
  const all = run("clear every kind of child", src, "<Stack gap", "Stack", clear());
  check("clear every kind of child (elements, .map, &&, ternary): their imports go", all.code, [IMPORTS[3], "", "export function Plans({ items, open }: { items: { id: string; name: string }[]; open: boolean }) {", "  return (", '    <Stack gap="md" />', "  );", "}", ""].join("\n"));
  check("clear: \"children\" is the children slot", run("clear prop children", src, "<Card theme=\"border\"", "Card", clear("children")).code, card.code);
  // Text and comments go too: a comment inside the host is about its content (a detach marker, a zen-allow exception
  // excuses what follows it; usage-guard reads it only on the element's line or the four above).
  const mixed = page(
    "export function M() {",
    "  return (",
    "    <Card theme=\"border\">",
    "      {/* zen-detached: Card · Zen Studio */}",
    "      <Stack gap=\"md\">",
    "        <Text>Detached</Text>",
    "      </Stack>",
    "      {/* zen-allow-badge-copy: the note below */}",
    "      Plain text",
    "      <Badge>New</Badge>",
    "    </Card>",
    "  );",
    "}",
  );
  const emptied = run("clear text and comments", mixed, "<Card", "Card", clear());
  check("clear text and comments: all of it, and the imports only it used", [rows(emptied, 5, 8), importLines(emptied)], [["export function M() {", "  return (", '    <Card theme="border" />', "  );"], [IMPORTS[1], IMPORTS[2], IMPORTS[4]]]);
  const notes = page("export function N() {", "  return (", "    <Card theme=\"flat\">", "      {/* filled per example */}", "    </Card>", "  );", "}");
  check("clear: comments alone are no content", errorOf(applySlotOp(notes, locOf(notes, "<Card"), "Card", clear(), options({ hash: sha1(notes) }))), ["invalid", "Nothing to clear: <Card> has no content."]);

  // Multi-line opening tags keep their attributes' layout; `/>` goes where the file's other multi-line self-closing
  // tags put it (else where `>` was), never after a comment.
  const tags = (closing) => page(
    "export function T() {",
    "  return (",
    "    <Stack>",
    ...(closing === "none" ? [] : ["      <ListItem", "        title=\"Bao Nguyen\"", `        caption="Product designer"${closing === "after" ? " />" : ""}`]),
    ...(closing === "own" ? ["      />"] : []),
    "      <Card",
    "        theme=\"border\"",
    "        padding=\"md\"",
    "      >",
    "        <Text>Pro</Text>",
    "      </Card>",
    "      <Card",
    "        theme=\"flat\"",
    "        padding=\"md\">",
    "        <Text>Flat</Text>",
    "      </Card>",
    "      <Card",
    "        theme=\"pale\" // the plan's card",
    "      >",
    "        <Text>Pale</Text>",
    "      </Card>",
    "    </Stack>",
    "  );",
    "}",
  );
  /** The cleared Card's lines (and the next one), joined by |. */
  const block = (closing, needle) => {
    const code = tags(closing);
    const result = run(`clear ${closing} ${needle.slice(-7)}`, code, needle, "Card", clear());
    const at = Number(locOf(code, needle).split(":")[0]);
    return result.code.split("\n").slice(at - 1, at + 3).join("|");
  };
  check("clear multi-line: `/>` after the attributes, per the file", [
    block("own", "<Card\n        theme=\"border\""),
    block("own", "<Card\n        theme=\"flat\""),
    block("after", "<Card\n        theme=\"border\""),
    block("after", "<Card\n        theme=\"flat\""),
    block("none", "<Card\n        theme=\"border\""),
    block("none", "<Card\n        theme=\"flat\""),
  ], [
    '      <Card|        theme="border"|        padding="md"|      />',
    '      <Card|        theme="flat"|        padding="md"|      />',
    '      <Card|        theme="border"|        padding="md" />|      <Card',
    '      <Card|        theme="flat"|        padding="md" />|      <Card',
    '      <Card|        theme="border"|        padding="md"|      />',
    '      <Card|        theme="flat"|        padding="md" />|      <Card',
  ]);
  check("clear multi-line: a comment before `>` keeps `/>` on `>`'s line", block("after", "<Card\n        theme=\"pale\""), '      <Card|        theme="pale" // the plan\'s card|      />|    </Stack>');
  const tight = ["import { Badge } from \"../../../components/Badge\";", "import { Stack } from \"../../../components/Layout\";", "", "export const I = () => <Stack direction=\"row\"><Badge/>New</Stack>;", "export const J = () => <Badge/>;", ""].join("\n");
  check("clear inline: the file's `<X/>` spelling", rows(run("clear tight", tight, "<Stack", "Stack", clear()), 4, 4), ['export const I = () => <Stack direction="row"/>;']);
  const bare = ["import { Stack } from \"../../../components/Layout\";", "", "export const B = () => <Stack><b>x</b></Stack>;", ""].join("\n");
  check("clear a tag without attributes", rows(run("clear bare", bare, "<Stack", "Stack", clear()), 3, 3), ["export const B = () => <Stack />;"]);

  // Prop slots: the attribute goes (removeElement's attribute rules); allowed in a .map row (every row changes).
  const leading = run("clear leading in a .map row", src, "<ListItem", "ListItem", clear("leading"));
  check("clear a prop: its attribute goes, DockIcon's import too", [rows(leading, 16, 16), importLines(leading).some((line) => line.includes("DockIcon")), leading.changed], [["          <ListItem key={item.id} title={item.name} />"], false, { from: 16, to: 16 }]);
  const props = page(
    "export function P() {",
    "  return (",
    "    <Stack>",
    "      <ListItem",
    "        title=\"Bao Nguyen\"",
    "        trailing={",
    "          <Badge>2</Badge>",
    "        }",
    "        leading={<><DockIcon icon=\"icon-user-line\" /><Badge>3</Badge></>}",
    "      />",
    "      <ListItem title=\"Empty\" leading={null} />",
    "    </Stack>",
    "  );",
    "}",
  );
  check("clear a multi-line prop: its lines go", rows(run("clear multi-line prop", props, "<ListItem", "ListItem", clear("trailing")), 11, 14), ["      <ListItem", '        title="Bao Nguyen"', '        leading={<><DockIcon icon="icon-user-line" /><Badge>3</Badge></>}', "      />"]);
  const fragment = run("clear a fragment prop", props, "<ListItem", "ListItem", clear("leading"));
  check("clear a fragment prop: the attribute, DockIcon's import (Badge still used)", [rows(fragment, 14, 15), importLines(fragment).map((line) => /\{ (\w+)/.exec(line)[1])], [["        }", "      />"], ["Badge", "Card", "Stack", "List", "Text"]]);
  const refused = (code, needle, name, op, extra = {}) => errorOf(applySlotOp(code, locOf(code, needle), name, op, options({ hash: sha1(code), ...extra })));
  check("clear refusals", [
    refused(src, "<Card theme=\"flat\"", "Card", clear()),
    refused(props, "<ListItem title=\"Empty\"", "ListItem", clear("leading")),
    refused(props, "<ListItem title=\"Empty\"", "ListItem", clear("trailing")),
    refused(src, "<List aria", "List", clear()),
    refused(page("export function G() {", "  return <Dialog open title={<Text>Delete file?</Text>} />;", "}"), "<Dialog", "Dialog", clear("title")),
    refused(src, "<Card theme=\"border\"", "Card", clear("className")),
    refused(src, "<Card theme=\"border\"", "Card", clear("onClick")),
  ], [
    ["invalid", "Nothing to clear: <Card> has no content."],
    ["invalid", "Nothing to clear: <ListItem> has no leading."],
    ["invalid", "Nothing to clear: <ListItem> has no trailing."],
    ["invalid", "<List> needs children; replace its content instead of clearing it."],
    ["invalid", "<Dialog> requires title; replace it instead of clearing it."],
    ["invalid", '"className" is not a slot prop'],
    ["invalid", '"onClick" is not a slot prop'],
  ]);
  check("clear: allowed when children are not required", run("clear a list", src, "<List aria", "List", clear(), { requiredChildren: new Set() }).cleared, true);
  const loc = locOf(src, "<Card theme=\"border\"");
  check("clear: the hash", [
    applySlotOp(src, loc, "Card", clear(), options()).error,
    applySlotOp(src, loc, "Card", clear(), options({ hash: sha1(`${src} `) })).code,
  ], ["Clear and reset need the file's hash (send `hash` with the request)", "stale"]);
  const slot = page("export function S() {", "  return (", "    <Card theme=\"flat\">", "      <PlaygroundSlot name=\"Content slot\" />", "    </Card>", "  );", "}");
  const playground = page("export function CardPlayground() {", "  return <Card theme=\"flat\"><Text>Hi</Text></Card>;", "}");
  check("clear guards", [
    refused(slot, "<Card", "Card", clear())[0],
    refused(playground, "<Card", "Card", clear())[0],
    applySlotOp(src, loc, "Card", clear(), options({ file: "src/platform/PlatformExamples.tsx", hash: sha1(src) })).code,
  ], ["forbidden", "forbidden", "forbidden"]);
  const crlf = BOM + src.replace(/\n/g, "\r\n");
  check("clear CRLF BOM", rows(run("clear CRLF BOM", crlf, "<Card theme=\"border\"", "Card", clear()), 11, 12), ['      <Card theme="border" />', '      <Card theme="flat" />']);
}

/* ── resetSlot ────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  // `base` is the saved file (the plugin passes the disk text when the file has a draft); the drafts below are built
  // with applySlotOp itself (each step checked by run), and a reset gives the saved text back exactly.
  const back = (label, draft, needle, name, saved, prop, extra = {}) => run(label, draft, needle, name, reset(prop), { base: saved, ...extra });
  const refused = (draft, needle, name, saved, prop, nth = 0) => errorOf(applySlotOp(draft, locOf(draft, needle, nth), name, reset(prop), options({ hash: sha1(draft), base: saved })));
  const NOTHING = ["invalid", "Nothing to reset: this slot matches the saved file."];
  check("reset: no draft (no base) or an unchanged slot", [
    refused(src, "<Card theme=\"border\"", "Card", undefined),
    refused(src, "<Card theme=\"border\"", "Card", src),
    refused(src, "<ListItem", "ListItem", src, "leading"),
  ], [NOTHING, NOTHING, NOTHING]);

  const inserted = run("reset: insert first", src, "<Card theme=\"border\"", "Card", ins("<Divider />"));
  const afterInsert = back("reset after insert", inserted.code, "<Card theme=\"border\"", "Card", src);
  check("reset after insert: the saved text exactly (Divider's new import goes)", [afterInsert.code === src, afterInsert.changed, afterInsert.reset], [true, { from: 13, to: 13 }, true]);
  const removed = run("reset: remove first", src, "<Badge theme", "Badge", REMOVE);
  check("reset after remove: the content and Badge's import come back", back("reset after remove", removed.code, "<Stack gap", "Stack", src).code === src, true);
  const moved = run("reset: move first", src, "<Card theme=\"border\"", "Card", move("next"));
  check("reset after move", back("reset after move", moved.code, "<Stack gap", "Stack", src).code === src, true);
  const duplicated = run("reset: duplicate first", src, "<Text>Pro", "Text", DUPLICATE);
  check("reset after duplicate", back("reset after duplicate", duplicated.code, "<Card theme=\"border\"", "Card", src).code === src, true);
  const cleared = run("reset: clear first", src, "<Card theme=\"border\"", "Card", clear());
  check("reset after clear (the host's own line changed)", back("reset after clear", cleared.code, "<Card theme=\"border\"", "Card", src).code === src, true);
  const emptied = run("reset: clear all first", src, "<Stack gap", "Stack", clear());
  check("reset after clearing everything: content and imports", back("reset after clear all", emptied.code, "<Stack gap", "Stack", src).code === src, true);
  // A sequence on one slot: insert, duplicate, move, remove, then reset.
  let draft = run("sequence insert", src, "<Stack gap", "Stack", ins(BADGE, { index: 0 })).code;
  draft = run("sequence duplicate", draft, "<Card theme=\"flat\"", "Card", DUPLICATE).code;
  draft = run("sequence move", draft, "<List aria", "List", move("prev")).code;
  draft = run("sequence remove", draft, "<Text>Open", "Text", REMOVE).code;
  draft = run("sequence clear", draft, "<Card theme=\"border\"", "Card", clear()).code;
  check("reset after a sequence of ops", back("reset after a sequence", draft, "<Stack gap", "Stack", src).code === src, true);

  // Only that slot: other draft changes stay; the host found when its lines moved.
  const both = run("reset: second insert", inserted.code, "<Card theme=\"flat\"", "Card", ins(BADGE));
  const one = back("reset one of two", both.code, "<Card theme=\"flat\"", "Card", src);
  check("reset one slot: the other draft change stays", one.code, inserted.code);
  const shifted = back("reset below an insert", both.code, "<Card theme=\"border\"", "Card", src);
  check("reset when lines above changed: the flat card keeps its insert", shifted.code, run("reset: flat alone", src, "<Card theme=\"flat\"", "Card", ins(BADGE)).code);
  // The host itself moved (its line is unmatched now): found by its opening tag on a line the diff left unmatched.
  const badgeMoved = run("reset: badge up", run("reset: badge up once", src, "<Badge theme", "Badge", move("prev")).code, "<Badge theme", "Badge", move("prev"));
  const badgeEdited = run("reset: badge edited", badgeMoved.code, "<Badge theme", "Badge", ins("<Text>Now</Text>"));
  check("reset a moved host: its content back, where it is now", back("reset a moved host", badgeEdited.code, "<Badge theme", "Badge", src).code, badgeMoved.code);
  const cardMoved = run("reset: card down", src, "<Card theme=\"border\"", "Card", move("next"));
  const cardEdited = run("reset: card edited", cardMoved.code, "<Card theme=\"border\"", "Card", ins(BADGE));
  check("reset a moved multi-line host", back("reset a moved card", cardEdited.code, "<Card theme=\"border\"", "Card", src).code, cardMoved.code);
  // Re-indented (the draft put the host one level deeper): the saved content at the new indentation.
  const deeper = src.replace('      <Card theme="border">\n        <Text>Pro</Text>\n      </Card>', '      <Box>\n        <Card theme="border">\n          <Badge>Draft</Badge>\n        </Card>\n      </Box>');
  check("reset re-indents to the host's place", rows(back("reset re-indented", deeper, "<Card theme=\"border\"", "Card", src), 11, 15), ["      <Box>", '        <Card theme="border">', "          <Text>Pro</Text>", "        </Card>", "      </Box>"]);
  // Lines inside a template literal keep their text when the content is re-indented.
  const quoted = src.replace("        <Text>Pro</Text>", "        <Text>{`Pro\n  billed yearly`}</Text>");
  const quotedDeeper = quoted.replace('      <Card theme="border">\n        <Text>{`Pro\n  billed yearly`}</Text>\n      </Card>', '      <Box>\n        <Card theme="border" />\n      </Box>');
  check("reset re-indents around a template literal", rows(back("reset template literal", quotedDeeper, "<Card theme=\"border\"", "Card", quoted), 11, 16), ["      <Box>", '        <Card theme="border">', "          <Text>{`Pro", "  billed yearly`}</Text>", "        </Card>", "      </Box>"]);
  // An import the saved file has stays, even when the reset leaves it unused (the saved file did not use it either).
  const unusedSaved = page("export function U() {", "  return <Card theme=\"flat\" />;", "}");
  const badged = run("reset: badge into an unused import's file", unusedSaved, "<Card", "Card", ins(BADGE));
  check("reset keeps the saved file's imports", back("reset keeps imports", badged.code, "<Card", "Card", unusedSaved).code === unusedSaved, true);

  // Prop slots.
  const noLeading = run("reset: clear leading", src, "<ListItem", "ListItem", clear("leading"));
  check("reset a cleared prop: the attribute and DockIcon's import come back", back("reset leading", noLeading.code, "<ListItem", "ListItem", src, "leading").code === src, true);
  const joined = run("reset: join leading", src, "<ListItem", "ListItem", ins(BADGE, { prop: "leading" }));
  check("reset a prop that became a fragment", back("reset joined", joined.code, "<ListItem", "ListItem", src, "leading").code === src, true);
  const trailing = run("reset: new trailing", src, "<ListItem", "ListItem", ins(BADGE, { prop: "trailing" }));
  check("reset a prop the saved file did not have: it goes", back("reset new prop", trailing.code, "<ListItem", "ListItem", src, "trailing").code === src, true);
  const ordered = page(
    "export function O() {",
    "  return (",
    "    <ListItem",
    "      title=\"Bao Nguyen\"",
    "      leading={<DockIcon icon=\"icon-user-line\" />}",
    "      trailing={",
    "        <Badge>2</Badge>",
    "      }",
    "      caption=\"Product designer\"",
    "    />",
    "  );",
    "}",
  );
  for (const prop of ["leading", "trailing"]) {
    const gone = run(`reset: clear ${prop} (own line)`, ordered, "<ListItem", "ListItem", clear(prop));
    check(`reset ${prop} on its own line: back in its place`, back(`reset ${prop} own line`, gone.code, "<ListItem", "ListItem", ordered, prop).code === ordered, true);
  }
  const first = ordered.replace('      title="Bao Nguyen"\n', "").replace("      caption", '      title="Bao Nguyen"\n      caption');
  const noFirst = run("reset: clear the first prop", first, "<ListItem", "ListItem", clear("leading"));
  check("reset the first prop: right after the name", back("reset first prop", noFirst.code, "<ListItem", "ListItem", first, "leading").code === first, true);

  // New since the save: an inserted element, a duplicate.
  const withCard = run("reset: new card", src, "<Stack gap", "Stack", ins('<Card theme="pale" />', { index: 0 }));
  const filled = run("reset: new card filled", withCard.code, "<Card theme=\"pale\"", "Card", ins(BADGE));
  const copy = run("reset: duplicate the card", src, "<Card theme=\"border\"", "Card", DUPLICATE);
  const copyEdited = run("reset: copy edited", copy.code, "<Card theme=\"border\"", "Card", ins(BADGE), { nth: 1 });
  check("reset: an element new since the save is refused", [
    refused(filled.code, "<Card theme=\"pale\"", "Card", src),
    refused(copyEdited.code, "<Card theme=\"border\"", "Card", src, undefined, 1),
  ], [["invalid", "This element is new since the last save: remove it instead."], ["invalid", "This element is new since the last save: remove it instead."]]);
  check("reset: the original of a duplicate still resets", back("reset the original", run("reset: original edited", copy.code, "<Card theme=\"border\"", "Card", ins(BADGE)).code, "<Card theme=\"border\"", "Card", src).code, copy.code);
  // Duplicate, then Clear the original (BACKLOG 2026-10-03): the cleared original is still the saved element, its copy
  // the new one, so Reset gives the original its content back and keeps the copy.
  const clearedOriginal = run("reset: original cleared", copy.code, "<Card theme=\"border\"", "Card", clear());
  check("reset: a cleared original of a duplicate resets", back("reset the cleared original", clearedOriginal.code, "<Card theme=\"border\"", "Card", src).code, copy.code);
  check("reset: its untouched copy is the new one", refused(clearedOriginal.code, "<Card theme=\"border\"", "Card", src, undefined, 1), ["invalid", "This element is new since the last save: remove it instead."]);
  // Two saved twins, one cleared (nothing duplicated): each keeps its own identity, the cleared one resets.
  const twins = run("reset: twins", src, "<Card theme=\"border\"", "Card", DUPLICATE).code;
  const twinCleared = run("reset: a twin cleared", twins, "<Card theme=\"border\"", "Card", clear());
  check("reset: a cleared twin of the saved file resets", back("reset a twin", twinCleared.code, "<Card theme=\"border\"", "Card", twins).code, twins);

  // Imports: a Zen component the draft lost comes back (templates: into the package import); anything else is refused.
  const template = ["import {", "  Badge,", "  Card,", "  Stack,", "} from \"@zen/design-system\";", "", "export function Settings() {", "  return (", "    <Stack gap=\"md\">", "      <Card theme=\"border\">", "        <Badge>New</Badge>", "      </Card>", "    </Stack>", "  );", "}", ""].join("\n");
  const noBadge = run("reset: template remove", template, "<Badge", "Badge", REMOVE, { file: TEMPLATE });
  check("reset in a template: the package import gets Badge back", [noBadge.code.includes("  Badge,"), back("reset template", noBadge.code, "<Card", "Card", template, undefined, { file: TEMPLATE }).code === template], [false, true]);
  const data = ['import { plans } from "./plans-data";', ...IMPORTS, "", "const label = \"Pro\";", "export function D() {", "  return (", "    <Card theme=\"border\">", "      <Text>{label}</Text>", "      {plans.map((plan) => <Badge key={plan}>{plan}</Badge>)}", "    </Card>", "  );", "}", ""].join("\n");
  const handEdited = data.replace('import { plans } from "./plans-data";\n', "").replace("      {plans.map((plan) => <Badge key={plan}>{plan}</Badge>)}\n", "");
  const noLabel = data.replace('const label = "Pro";\n', "").replace("      <Text>{label}</Text>\n", "");
  check("reset: what the saved content needs and the draft lost (not a Zen import)", [
    refused(handEdited, "<Card", "Card", data),
    refused(noLabel, "<Card", "Card", data),
  ], [
    ["invalid", 'The saved content uses plans, imported from "./plans-data", which this file no longer imports; reset it in the code.'],
    ["invalid", "The saved content uses `label`, which this file no longer declares; reset it in the code."],
  ]);
  check("reset: the hash, a bad saved text", [
    applySlotOp(inserted.code, locOf(inserted.code, "<Card theme=\"border\""), "Card", reset(), options({ base: src })).error,
    refused(inserted.code, "<Card theme=\"border\"", "Card", "export const x = `"),
  ], ["Clear and reset need the file's hash (send `hash` with the request)", ["invalid", "The saved file does not parse; reset this slot in the code."]]);

  // CRLF and BOM: the draft and the reset keep both.
  const crlf = BOM + src.replace(/\n/g, "\r\n");
  const crlfDraft = run("reset: CRLF insert", crlf, "<Card theme=\"border\"", "Card", ins('<Stack gap="xs">\n  <Text>A</Text>\n</Stack>'));
  check("reset CRLF BOM: the saved text exactly", back("reset CRLF BOM", crlfDraft.code, "<Card theme=\"border\"", "Card", crlf).code === crlf, true);
}

/* ── resetSlot and the flags: which saved element the host is ─────────────────────────────────────────────────────── */
{
  // Siblings that open with the same line: a move, a remove or an insert next to them must not pair the wrong ones.
  const back = (label, draft, needle, name, saved, prop, extra = {}) => run(label, draft, needle, name, reset(prop), { base: saved, ...extra });
  const refused = (draft, needle, name, saved, nth = 0, prop) => errorOf(applySlotOp(draft, locOf(draft, needle, nth), name, reset(prop), options({ hash: sha1(draft), base: saved })))[1];
  const NOTHING = "Nothing to reset: this slot matches the saved file.";
  const NEW = "This element is new since the last save: remove it instead.";
  const twins = page(
    "export function Plans() {",
    "  return (",
    "    <Stack gap=\"md\">",
    "      <Card theme=\"border\">",
    "        <Text>Basic</Text>",
    "      </Card>",
    "      <Card theme=\"border\">",
    "        <Text>Pro</Text>",
    "      </Card>",
    "      <Card theme=\"border\">",
    "        <Text>Team</Text>",
    "      </Card>",
    "    </Stack>",
    "  );",
    "}",
  );
  const CARD = "<Card theme=\"border\"";
  /** [childrenModified, newSinceSave] of every `needle` element. */
  const states = (code, needle, saved) => code.split(needle).slice(1).map((_, nth) => {
    const slots = describeSlots(code, PAGE, locOf(code, needle, nth), { base: saved });
    return [slots.childrenModified, slots.newSinceSave ?? false];
  });
  const moved = run("twins: move Pro up", twins, CARD, "Card", move("prev"), { nth: 1 });
  check("twins moved: nothing is modified, nothing to reset", [states(moved.code, CARD, twins), refused(moved.code, CARD, "Card", twins), refused(moved.code, CARD, "Card", twins, 1)], [[[false, false], [false, false], [false, false]], NOTHING, NOTHING]);
  const removed = run("twins: remove Basic", twins, CARD, "Card", REMOVE);
  check("twins after a remove: the others are untouched", [states(removed.code, CARD, twins), refused(removed.code, CARD, "Card", twins)], [[[false, false], [false, false]], NOTHING]);
  const added = run("twins: insert a card first", twins, "<Stack gap", "Stack", ins('<Card theme="border">\n  <Text>New</Text>\n</Card>', { index: 0 }));
  check("twins after an insert: only the new card is new", [states(added.code, CARD, twins), refused(added.code, CARD, "Card", twins), refused(added.code, CARD, "Card", twins, 1)], [[[true, true], [false, false], [false, false], [false, false]], NEW, NOTHING]);
  // Edited and moved (or its sibling removed): its own saved content comes back, nobody else's.
  const proEdited = run("twins: Pro edited", twins, CARD, "Card", ins(BADGE), { nth: 1 });
  const editedMoved = run("twins: edited Pro moved up", proEdited.code, CARD, "Card", move("prev"), { nth: 1 });
  check("twins edited + moved: the flags", states(editedMoved.code, CARD, twins), [[true, false], [false, false], [false, false]]);
  check("twins edited + moved: reset gives Pro its content", back("twins reset edited moved", editedMoved.code, CARD, "Card", twins).code, moved.code);
  const editedAlone = run("twins: Basic removed after the edit", proEdited.code, CARD, "Card", REMOVE);
  check("twins edited + sibling removed: reset gives Pro its content", back("twins reset after remove", editedAlone.code, CARD, "Card", twins).code, removed.code);
  // The host's own opening tag edited (an inspector prop) and moved: still the saved card, Clear then Reset works.
  const retagged = moved.code.replace('<Card theme="border">\n        <Text>Pro', '<Card theme="flat">\n        <Text>Pro');
  const retaggedCleared = run("twins: retagged card cleared", retagged, "<Card theme=\"flat\"", "Card", clear());
  check("twins: an edited tag that moved is no new element", [states(retagged, "<Card theme=\"flat\"", twins), back("twins reset retagged", retaggedCleared.code, "<Card theme=\"flat\"", "Card", twins).code], [[[false, false]], retagged]);
  // Nested frames that open alike (input.tsx's two `<Stack gap="md">` forms): move, and a palette Stack inserted before one.
  const forms = page(
    "export function Billing() {",
    "  return (",
    "    <Stack gap=\"lg\">",
    "      <Stack gap=\"md\">",
    "        <Stack direction=\"row\" gap=\"sm\">",
    "          <Text>Reminders</Text>",
    "          <Badge theme=\"green\">On</Badge>",
    "        </Stack>",
    "        <Text>Days before the due date</Text>",
    "      </Stack>",
    "      <Stack gap=\"md\">",
    "        <Stack direction=\"row\" gap=\"sm\">",
    "          <Text>Invoice</Text>",
    "          <Badge theme=\"blue\">Sent</Badge>",
    "        </Stack>",
    "        <Text>Invoice number</Text>",
    "      </Stack>",
    "    </Stack>",
    "  );",
    "}",
  );
  const FORM = "<Stack gap=\"md\"";
  const formsMoved = run("forms: move the invoice up", forms, FORM, "Stack", move("prev"), { nth: 1 });
  check("forms moved: neither is modified, neither resets", [states(formsMoved.code, FORM, forms), refused(formsMoved.code, FORM, "Stack", forms), refused(formsMoved.code, FORM, "Stack", forms, 1)], [[[false, false], [false, false]], NOTHING, NOTHING]);
  const palette = run("forms: palette Stack before the invoice", forms, "<Stack gap=\"lg\"", "Stack", ins('<Stack gap="md">\n  <Text>Milestone 2</Text>\n</Stack>', { index: 1 }));
  check("forms: the palette Stack is the new one", states(palette.code, FORM, forms), [[false, false], [true, true], [false, false]]);
  // Twins on one line: the second one's own content comes back.
  const inline = page("export function Row() {", "  return (", "    <Card theme=\"border\">", "      <Stack direction=\"row\" gap=\"2xs\"><Badge theme=\"green\">Paid</Badge></Stack><Stack direction=\"row\" gap=\"2xs\"><Badge theme=\"red\">Overdue</Badge></Stack>", "    </Card>", "  );", "}");
  const second = run("one line: clear the second", inline, "<Stack direction", "Stack", clear(), { nth: 1 });
  check("one line: reset the second", back("one line reset", second.code, "<Stack direction", "Stack", inline, undefined, { nth: 1 }).code === inline, true);

  // A prop slot back in its saved layout (on its own line, before ` />` or another attribute, after its comment).
  const people = page(
    "export function People() {",
    "  return (",
    "    <List aria-label=\"Team\">",
    "      <ListItem title=\"Bao Nguyen\" caption=\"Design\"",
    "        trailing={<Badge theme=\"green\">Active</Badge>} />",
    "      <ListItem title=\"An Tran\"",
    "        leading={<DockIcon icon=\"icon-user-line\" />}",
    "        caption=\"Research\" />",
    "      <ListItem",
    "        leading={<DockIcon icon=\"icon-user-line\" />}",
    "        title=\"Linh Pham\"",
    "      />",
    "      <ListItem title=\"Minh Le\"",
    "        // Away until Monday: the status stays visible.",
    "        trailing={<Badge theme=\"blue\">Away</Badge>}",
    "        caption=\"Sales\" />",
    "    </List>",
    "  );",
    "}",
  );
  for (const [nth, prop] of [[0, "trailing"], [1, "leading"], [2, "leading"], [3, "trailing"]]) {
    const gone = run(`layout: clear ${prop} ${nth}`, people, "<ListItem", "ListItem", clear(prop), { nth });
    check(`layout: reset ${prop} ${nth} gives the saved text`, back(`layout reset ${prop} ${nth}`, gone.code, "<ListItem", "ListItem", people, prop, { nth }).code === people, true);
  }
  // A prop whose content is code is flagged too, and resets.
  const coded = page(
    "const mark = (name: string) => <DockIcon icon=\"icon-user-line\" aria-label={name} />;",
    "export function People() {",
    "  return (",
    "    <List aria-label=\"Team\">",
    "      <ListItem title=\"An Tran\" leading={mark(\"An\")} />",
    "    </List>",
    "  );",
    "}",
  );
  const unmarked = run("code prop: clear leading", coded, "<ListItem", "ListItem", clear("leading"));
  check("code prop: Modified, and reset", [describeSlots(unmarked.code, PAGE, locOf(unmarked.code, "<ListItem"), { base: coded }).modifiedProps, back("code prop reset", unmarked.code, "<ListItem", "ListItem", coded, "leading").code === coded], [["leading"], true]);

  // Imports come back as saved: in their saved place, a wrapped statement wrapped as it was.
  const imported = [
    'import { Text } from "../../../components/Text";',
    'import { Card } from "../../../components/Card";',
    'import { Badge } from "../../../components/Badge";',
    "import {",
    "  Box, Grid,",
    "  Stack,",
    '} from "../../../components/Layout";',
    "",
    "export function Summary() {",
    "  return (",
    "    <Box>",
    "      <Stack gap=\"md\">",
    "        <Text>Summary</Text>",
    "        <Card theme=\"border\">",
    "          <Grid columns={2}>",
    "            <Badge theme=\"green\">Paid</Badge>",
    "          </Grid>",
    "        </Card>",
    "      </Stack>",
    "    </Box>",
    "  );",
    "}",
    "",
  ].join("\n");
  const unimported = run("imports: clear the card", imported, "<Card", "Card", clear());
  check("imports: the clear drops Badge and Grid", [importLines(unimported), unimported.code.includes("import {\n  Box,\n  Stack,\n}")], [[imported.split("\n")[0], imported.split("\n")[1], "import {"], true]);
  check("imports: reset puts them back as saved", back("imports reset", unimported.code, "<Card", "Card", imported).code === imported, true);

  // An action's useToast() hook leaves with it (reset, clear, remove); a saved hook comes back with its action.
  const quiet = page("export function Plans() {", "  return (", "    <Card theme=\"border\">", "      <Text>Basic</Text>", "    </Card>", "  );", "}");
  const ACTION = '<Button level="tertiary" onClick={() => toast({ title: "Saved" })}>Save</Button>';
  const loud = run("toast: insert an action", quiet, "<Card", "Card", ins(ACTION, { requires: ["toast"] }));
  check("toast: reset takes the hook and its import away", back("toast reset", loud.code, "<Card", "Card", quiet).code === quiet, true);
  const cleared = run("toast: clear the action's card", loud.code, "<Card", "Card", clear());
  const removedAction = run("toast: remove the action", loud.code, "<Button", "Button", REMOVE);
  check("toast: clear and remove take the unused hook too", [cleared.code.includes("useToast"), removedAction.code === quiet], [false, true]);
  check("toast: reset after the clear brings the hook back", back("toast reset after clear", cleared.code, "<Card", "Card", loud.code).code === loud.code, true);
  const kept = run("toast: a second action", loud.code, "<Card", "Card", ins(ACTION.replace("Save", "Send"), { requires: ["toast"] }));
  check("toast: a hook still used stays", run("toast: remove one action", kept.code, "<Button", "Button", REMOVE).code.includes("const { toast } = useToast();"), true);
  // Another component binds its own toast: the host's scope decides, and the hook returns to its saved line.
  const two = page(
    "import { useState } from \"react\";",
    "import { Button } from \"../../../components/Button\";",
    "import { useToast } from \"../../../components/Toast\";",
    "export function A() {",
    "  const [count, setCount] = useState(0);",
    "  const { toast } = useToast();",
    "  return (",
    "    <Card theme=\"border\" onClick={() => setCount(count + 1)}>",
    `      ${ACTION}`,
    "    </Card>",
    "  );",
    "}",
    "export function B() {",
    "  const { toast } = useToast();",
    `  return <Card theme="flat">${ACTION.replace("Save", "Send")}</Card>;`,
    "}",
  );
  const quietA = run("toast scope: clear A's card", two, "<Card theme=\"border\"", "Card", clear());
  check("toast scope: A's hook goes, B's stays", quietA.code.split("const { toast } = useToast();").length, 2);
  check("toast scope: reset puts A's hook back on its line", back("toast scope reset", quietA.code, "<Card theme=\"border\"", "Card", two).code === two, true);
}

/* ── state and media for stateful items (2026-10-04: every DS component can be inserted) ──────────────────────────── */
{
  const quiet = page("export function Plans() {", "  return (", "    <Card theme=\"border\">", "      <Text>Basic</Text>", "    </Card>", "  );", "}");
  const DIALOG = [
    '<Stack direction="row">',
    '  <Button level="tertiary" onClick={() => setShareOpen(true)}>Share project</Button>',
    '  <Dialog open={shareOpen} onOpenChange={setShareOpen} title="Share Loyalty app?"',
    '    primaryAction={{ label: "Share", onClick: () => { setShareOpen(false); toast({ title: "Link sent" }); } }} />',
    "</Stack>",
  ].join("\n");
  const SHARE = [{ name: "shareOpen", initial: "false" }];
  const first = run("state: insert a dialog", quiet, "<Card", "Card", ins(DIALOG, { requires: ["toast"], state: SHARE }));
  const fnLine = first.code.split("\n").indexOf("export function Plans() {");
  check("state: hooks first in the component, toast then state", first.code.split("\n").slice(fnLine, fnLine + 3), [
    "export function Plans() {",
    "  const { toast } = useToast();",
    "  const [shareOpen, setShareOpen] = useState(false);",
  ]);
  check("state: useState imported from react, before the other imports", importLines(first)[0], 'import { useState } from "react";');
  check("state: Button, Dialog and useToast imported", ["Button", "Dialog", "useToast"].map((name) => importLines(first).some((line) => line.includes(name))), [true, true, true]);
  const second = run("state: a second dialog", first.code, "<Card", "Card", ins(DIALOG, { requires: ["toast"], state: SHARE }));
  check("state: the second one gets fresh names", [
    second.code.includes("const [shareOpen2, setShareOpen2] = useState(false);"),
    second.code.includes("onClick={() => setShareOpen2(true)}"),
    second.code.includes("open={shareOpen2} onOpenChange={setShareOpen2}"),
    second.code.split("const { toast } = useToast();").length,
    second.code.split('import { useState } from "react";').length,
  ], [true, true, true, 2, 2]);
  // A file that already imports from react: useState joins it.
  const withReact = ['import { useMemo } from "react";', ...quiet.split("\n")].join("\n");
  check("state: joins the react import", importLines(run("state: react import", withReact, "<Card", "Card", ins(DIALOG, { requires: ["toast"], state: SHARE })))[0], 'import { useMemo, useState } from "react";');
  // Typed state and literal checks.
  const typed = run("state: typed", quiet, "<Card", "Card", ins('<Text>{score === null ? "No score" : String(score)}</Text>', { state: [{ name: "score", initial: "null", type: "number | null" }] }));
  check("state: the type goes on useState", typed.code.includes("const [score, setScore] = useState<number | null>(null);"), true);
  const stateRefusal = (state) => errorOf(applySlotOp(quiet, locOf(quiet, "<Card"), "Card", ins("<Text>{tab}</Text>", { state }), options()))[1];
  check("state: refusals", [
    stateRefusal([{ name: "Tab", initial: '"a"' }]),
    stateRefusal([{ name: "tab", initial: "load()" }]),
    stateRefusal([{ name: "tab", initial: '"a"', type: "Project" }]),
    stateRefusal([{ name: "tab", initial: '"a"' }, { name: "tab", initial: '"b"' }]),
  ], [
    'Each `state` entry needs a lowerCamel `name` ("open", "selectedTab")',
    'The state "tab" needs `initial`: a literal (string, number, boolean, null, a Date, an array or an object of them)',
    'The state "tab": `type` takes built-in types only (string, number, boolean, null, Date, "literal", [] and |)',
    'The state "tab" is listed twice',
  ]);
  check("state: a name the code reads without declaring it is still refused", errorOf(applySlotOp(quiet, locOf(quiet, "<Card"), "Card", ins("<Text>{tab}</Text>"), options()))[1], "The code uses `tab`, which a slot cannot provide (only Zen components and toast); write the value in the code");
  check("state: shorthand reads are refused", errorOf(applySlotOp(first.code, locOf(first.code, "<Card"), "Card", ins("<Text>{JSON.stringify({ shareOpen })}</Text>", { state: SHARE }), options()))[1], "The code reads the state \"shareOpen\" as `{ shareOpen }`; write `shareOpen: shareOpen`");
  // Outside a component (a lowercase helper), there is nowhere to put the hook.
  const helper = page("const row = () => (", "  <Card theme=\"border\">", "    <Text>Basic</Text>", "  </Card>", ");", "export function Plans() {", "  return row();", "}");
  check("state: no component, refused", errorOf(applySlotOp(helper, locOf(helper, "<Card"), "Card", ins("<Text>{tab}</Text>", { state: [{ name: "tab", initial: '"a"' }] }), options()))[1], "The item keeps state, but no component encloses this slot to hold its `useState` lines; insert it inside a component (a capitalised function).");
  // A .map row (2026-10-08): its own row component holds the state, so every row's Dialog opens on its own.
  const rows = page("export function Plans() {", "  return (", "    <Stack>", "      {[1, 2].map((n) => (", "        <Card key={n} theme=\"border\">", "          <Text>Basic</Text>", "        </Card>", "      ))}", "    </Stack>", "  );", "}");
  const perRow = run("state: insert a dialog into a .map row", rows, "<Card", "Card", ins(DIALOG, { requires: ["toast"], state: SHARE }), { insertedName: "StackRow", sample: true });
  check("state in a .map row: the row gets <StackRow />, the component no hook", [perRow.code.includes("          <StackRow />"), /export function Plans\(\) \{\n {2}return/.test(perRow.code)], [true, true]);
  check("state in a .map row: the row component holds toast and state", perRow.code.slice(perRow.code.indexOf("function StackRow")).split("\n").slice(0, 5), [
    "function StackRow() {",
    "  const { toast } = useToast();",
    "  const [shareOpen, setShareOpen] = useState(false);",
    "  return (",
    '    <Stack direction="row">',
  ]);
  check("state in a .map row: useState, Button, Dialog and useToast imported", [importLines(perRow)[0], ...["Button", "Dialog", "useToast"].map((name) => importLines(perRow).some((line) => line.includes(name)))], ['import { useState } from "react";', true, true, true]);
  // A ref entry (2026-10-08, Popover's anchor): `useRef<type>(null)`, no setter, useRef imported beside useState.
  const anchored = run("state: a ref", quiet, "<Card", "Card", ins('<Stack><Box ref={findAnchor}><Text>{findOpen ? "Open" : "Closed"}</Text></Box></Stack>', { state: [{ name: "findOpen", initial: "false" }, { name: "findAnchor", initial: "null", type: "HTMLDivElement", ref: true }] }));
  check("state: a ref is useRef<type>(null), both hooks imported", [anchored.code.includes("  const findAnchor = useRef<HTMLDivElement>(null);"), anchored.code.includes("setFindAnchor"), importLines(anchored)[0]], [true, false, 'import { useRef, useState } from "react";']);
  check("state: a ref needs an element type", errorOf(applySlotOp(quiet, locOf(quiet, "<Card"), "Card", ins("<Box ref={a} />", { state: [{ name: "a", initial: "null", type: "string", ref: true }] }), options()))[1], 'The ref "a" needs `type`: an element interface (HTMLButtonElement…), and starts null');
  // platformMedia: example pages import it; templates refuse.
  const IMAGE ="<Image src={platformMedia.site[5].src} alt={platformMedia.site[5].alt} ratio=\"4:3\" />";
  const pictured = run("media: insert an image", quiet, "<Card", "Card", ins(IMAGE, { requires: ["media"] }));
  check("media: platformMedia imported from PlatformMedia", importLines(pictured).filter((line) => /PlatformMedia|Image/.test(line)), [
    'import { Image } from "../../../components/Image";',
    'import { platformMedia } from "../../PlatformMedia";',
  ]);
  check("media: a second image keeps one import", run("media: second image", pictured.code, "<Card", "Card", ins(IMAGE, { requires: ["media"] })).code.split("platformMedia } from").length, 2);
  const templateText = quiet.replace(/"\.\.\/\.\.\/\.\.\/components\/\w+"/g, '"@zen/design-system"');
  check("media: refused in a template", errorOf(applySlotOp(templateText, locOf(templateText, "<Card"), "Card", ins(IMAGE, { requires: ["media"] }), options({ file: TEMPLATE })))[1], "The code reads platformMedia, which only the example pages import (src/platform/PlatformMedia.tsx); in a template, import your picture and pass its src.");
  check("code: JS built-ins are not free names", run("built-ins: a date", quiet, "<Card", "Card", ins("<Text>{new Date(2026, 9, 14).getFullYear()}</Text>")).code.includes("new Date(2026, 9, 14)"), true);
}

/* ── example snippets ─────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const snippetPage = (extra = "", code = ['<Card theme="border">', "  <Text>Pro</Text>", "  <Text>Billed yearly</Text>", "</Card>"]) => [
    ...IMPORTS,
    "function PlanCard() {",
    "  return (",
    "    <Card theme=\"border\">",
    "      <Text>Pro</Text>",
    "      <Text>Billed yearly</Text>",
    "    </Card>",
    "  );",
    "}",
    "function EmptyCard() {",
    "  return <Card theme=\"flat\" />;",
    "}",
    "export const examples = [",
    "  {",
    "    title: \"Plan\",",
    `    code: \`${code.join("\n")}\`,`,
    "    render: () => <PlanCard />,",
    "  },",
    "  {",
    "    title: \"Empty\",",
    "    code: `<Card theme=\"flat\" />`,",
    "    render: () => <EmptyCard />,",
    `  },${extra}`,
    "];",
    "",
  ].join("\n");
  const base = snippetPage();
  const literal = (result) => result.code.split("\n").slice(21, 26);
  const back = (draft) => run("snippet reset", draft, "<Card theme=\"border\"", "Card", reset(), { base });
  const end = run("snippet insert end", base, "<Card theme=\"border\"", "Card", ins(BADGE));
  check("snippet insert end: synced after the previous sibling", [end.snippet, literal(end)], [{ synced: true }, ['    code: `<Card theme="border">', "  <Text>Pro</Text>", "  <Text>Billed yearly</Text>", '  <Badge theme="blue">Pro plan</Badge>', "</Card>`,"]]);
  check("snippet insert end: loc and changed are the element's", [end.inserted.loc, end.changed], ["12:6", { from: 12, to: 12 }]);
  const first = run("snippet insert first", base, "<Card theme=\"border\"", "Card", ins(BADGE, { index: 0 }));
  check("snippet insert first: after the parent's opening tag", [first.snippet, literal(first)], [{ synced: true }, ['    code: `<Card theme="border">', '  <Badge theme="blue">Pro plan</Badge>', "  <Text>Pro</Text>", "  <Text>Billed yearly</Text>", "</Card>`,"]]);
  const middle = run("snippet insert middle", base, "<Card theme=\"border\"", "Card", ins('<Stack gap="xs">\n  <Text>A</Text>\n</Stack>', { index: 1 }));
  check("snippet insert middle: re-indented in the snippet", [middle.snippet, middle.code.split("\n").slice(23, 30)], [{ synced: true }, ['    code: `<Card theme="border">', "  <Text>Pro</Text>", '  <Stack gap="xs">', "    <Text>A</Text>", "  </Stack>", "  <Text>Billed yearly</Text>", "</Card>`,"]]);
  const empty = run("snippet self-closing", base, "<Card theme=\"flat\"", "Card", ins(BADGE));
  check("snippet self-closing: the snippet's one-line copy opened on its own lines", [empty.snippet, empty.code.split("\n").slice(28, 31)], [{ synced: true }, ['    code: `<Card theme="flat">', '  <Badge theme="blue">Pro plan</Badge>', "</Card>`,"]]);
  check("snippet self-closing: the source opened inline after return", empty.code.split("\n")[15], '  return <Card theme="flat"><Badge theme="blue">Pro plan</Badge></Card>;');
  const escaped = run("snippet escapes", base, "<Card theme=\"border\"", "Card", ins("<Text>{`Due ${1}`}</Text>"));
  check("snippet escapes: backticks and ${ escaped", [escaped.snippet, escaped.code.split("\n")[24]], [{ synced: true }, "  <Text>{\\`Due \\${1}\\`}</Text>"]);
  const removed = run("snippet remove", base, "<Text>Pro", "Text", REMOVE);
  check("snippet remove: its line goes", [removed.snippet, removed.code.split("\n").slice(19, 23)], [{ synced: true }, ['    code: `<Card theme="border">', "  <Text>Billed yearly</Text>", "</Card>`,", "    render: () => <PlanCard />,"]]);
  const copied = run("snippet duplicate", base, "<Text>Pro", "Text", DUPLICATE);
  check("snippet duplicate: copied", [copied.snippet, copied.code.split("\n").slice(22, 25)], [{ synced: true }, ["  <Text>Pro</Text>", "  <Text>Pro</Text>", "  <Text>Billed yearly</Text>"]]);
  const moved = run("snippet move", base, "<Text>Pro", "Text", move("next"));
  check("snippet move: swapped", [moved.snippet, moved.code.split("\n").slice(21, 23), moved.moved.loc], [{ synced: true }, ["  <Text>Billed yearly</Text>", "  <Text>Pro</Text>"], "11:6"]);
  const missing = run("snippet missing", snippetPage("", ['<Card theme="border">', "  <Text>Pro</Text>", "  …", "</Card>"]), "<Card theme=\"border\"", "Card", ins(BADGE));
  check("snippet missing anchor: a reason, the source still changed", [missing.snippet, missing.inserted.loc], [{ synced: false, reason: "the example snippet does not show this code (<Text>)" }, "12:6"]);
  const blanks = run("snippet remove between blanks", snippetPage("", ['<Card theme="border">', "  <Text>Pro</Text>", "", "  <Text>Billed yearly</Text>", "", "</Card>"]), "<Text>Billed", "Text", REMOVE);
  check("snippet remove between blank lines: one stays", [blanks.snippet, rows(blanks, 20, 23)], [{ synced: true }, ['    code: `<Card theme="border">', "  <Text>Pro</Text>", "", "</Card>`,"]]);
  // A self-closing parent inside a prop (`trigger={<Stack … />}`) opens inline in the snippet too, at its line's indent.
  const propPage = [
    ...IMPORTS,
    "function MenuCard() {",
    "  return (",
    "    <Card",
    "      theme=\"border\"",
    "      trigger={<Stack direction=\"row\" />}",
    "    />",
    "  );",
    "}",
    "export const examples = [",
    "  {",
    "    code: `<Card",
    "  theme=\"border\"",
    "  trigger={<Stack direction=\"row\" />}",
    "/>`,",
    "    render: () => <MenuCard />,",
    "  },",
    "];",
    "",
  ].join("\n");
  const inlineOpen = run("snippet self-closing in a prop", propPage, "<Stack", "Stack", ins(BADGE));
  check("snippet self-closing in a prop: inline in both", [inlineOpen.snippet, rows(inlineOpen, 11, 11), rows(inlineOpen, 19, 19)], [{ synced: true }, ['      trigger={<Stack direction="row"><Badge theme="blue">Pro plan</Badge></Stack>}'], ['  trigger={<Stack direction="row"><Badge theme="blue">Pro plan</Badge></Stack>}']]);
  const inlineRows = run("snippet self-closing in a prop, multi-line", propPage, "<Stack", "Stack", ins('<Stack gap="xs">\n  <Text>A</Text>\n</Stack>'));
  check("snippet self-closing in a prop, multi-line: continuation lines at each line's indent", [inlineRows.snippet, rows(inlineRows, 11, 13), rows(inlineRows, 21, 23)], [{ synced: true }, [
    '      trigger={<Stack direction="row"><Stack gap="xs">',
    "        <Text>A</Text>",
    "      </Stack></Stack>}",
  ], [
    '  trigger={<Stack direction="row"><Stack gap="xs">',
    "    <Text>A</Text>",
    "  </Stack></Stack>}",
  ]]);
  const twice = run("snippet twice", snippetPage("", ['<Card theme="border">', "  <Text>Billed yearly</Text>", "  <Text>Billed yearly</Text>", "</Card>"]), "<Card theme=\"border\"", "Card", ins(BADGE));
  check("snippet anchor twice: a reason", twice.snippet, { synced: false, reason: "this code appears more than once in the snippet (<Text>)" });
  const shared = run("snippet shared", base.replace("render: () => <EmptyCard />,", "render: () => <PlanCard />,"), "<Text>Pro", "Text", REMOVE);
  check("snippet: two examples render it", shared.snippet, { synced: false, reason: "more than one example renders <PlanCard>" });
  const wrapped = run("snippet wrap", base, "<Card theme=\"border\"", "Card", ins(BADGE, { wrap: { tag: "Stack", props: { gap: str("md") } } }));
  check("snippet wrap: not synced", wrapped.snippet, { synced: false, reason: "a wrapped slot is not copied into the example snippet; update it by hand (<Card>)" });
  const off = run("snippet off", base, "<Card theme=\"border\"", "Card", ins(BADGE), { snippets: false });
  check("snippets: false → untouched, no report", ["snippet" in off, literal(off)[3]], [false, "</Card>`,"]);
  const above = [
    ...IMPORTS,
    "export const examples = [",
    "  {",
    "    code: `<Card theme=\"border\">",
    "  <Text>Pro</Text>",
    "</Card>`,",
    "    render: () => <PlanCard />,",
    "  },",
    "];",
    "function PlanCard() {",
    "  return (",
    "    <Card theme=\"border\">",
    "      <Text>Pro</Text>",
    "    </Card>",
    "  );",
    "}",
    "",
  ].join("\n");
  const shifted = run("snippet above", above, "<Card theme=\"border\">\n      <Text", "Card", ins("<Divider />"));
  check("snippet above: the snippet's new line and the import move the loc and changed", [shifted.snippet, shifted.inserted.loc, shifted.changed], [{ synced: true }, "21:6", { from: 21, to: 21 }]);
  check("snippet above: rows", rows(shifted, 10, 13), ['    code: `<Card theme="border">', "  <Text>Pro</Text>", "  <Divider />", "</Card>`,"]);
  // Clear and reset change the host's whole copy in the snippet the same way.
  const codeLine = (result) => result.code.split("\n").find((line) => line.startsWith("    code: `<Card theme=\"border\""));
  const emptied = run("snippet clear", base, "<Card theme=\"border\"", "Card", clear());
  check("snippet clear: the snippet's copy closes itself too", [emptied.snippet, codeLine(emptied)], [{ synced: true }, '    code: `<Card theme="border" />`,']);
  check("snippet reset: the snippet comes back too", [back(end.code).snippet, back(end.code).code === base], [{ synced: true }, true]);
  check("snippet reset after a clear", [back(emptied.code).snippet, back(emptied.code).code === base], [{ synced: true }, true]);
  const missingBase = snippetPage("", ['<Card theme="border">', "  <Text>Pro</Text>", "  …", "</Card>"]);
  const unsynced = run("snippet reset, as saved", missing.code, "<Card theme=\"border\"", "Card", reset(), { base: missingBase });
  check("snippet reset: a snippet that is as saved stays", [unsynced.snippet, unsynced.code === missingBase], [{ synced: true }, true]);
  // A hand-written snippet whose copy differs from the source (here without the Text's tone): the insert synced after
  // its previous sibling; the reset finds the copy by its opening tag and gives it the saved snippet's content.
  const handBase = snippetPage("", ['<Card theme="border">', "  <Text>Pro</Text>", "  <Text>Billed yearly</Text>", "</Card>"]).replace("      <Text>Billed yearly</Text>", '      <Text tone="base">Billed yearly</Text>');
  const handInsert = run("snippet hand-written: insert", handBase, "<Text>Pro", "Text", DUPLICATE);
  const handBack = run("snippet hand-written: reset", handInsert.code, "<Card theme=\"border\"", "Card", reset(), { base: handBase });
  check("snippet hand-written: the insert synced, the reset brings the snippet back too", [handInsert.snippet, handBack.snippet, handBack.code === handBase], [{ synced: true }, { synced: true }, true]);
  const handClear = run("snippet hand-written: clear", handBase, "<Card theme=\"border\"", "Card", clear());
  check("snippet hand-written: clear empties the copy too", [handClear.snippet, codeLine(handClear)], [{ synced: true }, '    code: `<Card theme="border" />`,']);
  // The snippet writes the host's own tag another way: the line changes among its children's lines are undone.
  const otherTag = handBase.replace('code: `<Card theme="border">', 'code: `<Card theme="border" padding="md">');
  const otherInsert = run("snippet other tag: insert", otherTag, "<Text>Pro", "Text", DUPLICATE);
  const otherBack = run("snippet other tag: reset", otherInsert.code, "<Card theme=\"border\"", "Card", reset(), { base: otherTag });
  check("snippet other tag: the insert synced, the reset undoes it in the snippet", [otherInsert.snippet, otherBack.snippet, otherBack.code === otherTag], [{ synced: true }, { synced: true }, true]);
  const notShown = snippetPage("", ['<Card theme="border" padding="md">', "  …", "</Card>"]);
  const notShownDraft = run("snippet not shown: insert", notShown, "<Card theme=\"border\"", "Card", ins(BADGE)).code.replace("  …", "  … more");
  const unshown = run("snippet reset, saved snippet without the host", notShownDraft, "<Card theme=\"border\"", "Card", reset(), { base: notShown });
  check("snippet reset: the saved snippet shows neither the host nor its content", unshown.snippet, { synced: false, reason: "the saved snippet: the example snippet does not show this code (<Card>)" });
}

/* ── GET /element additions: describeSlots, withSlots ─────────────────────────────────────────────────────────────── */
{
  const shapes = page(
    "export function V({ items, open, label }: { items: string[]; open: boolean; label: string }) {",
    "  return (",
    "    <ModalForm",
    "      title=\"Edit\"",
    "      side={<DockIcon icon=\"icon-user-line\" />}",
    "      top={<><Badge>A</Badge><Badge>B</Badge></>}",
    "      header={open ? <Text>Open</Text> : null}",
    "      footer={null}",
    "    >",
    "      {items.map((item) => <Text key={item}>{item}</Text>)}",
    "      {open && <Text>Open</Text>}",
    "      {open ? <Text>Yes</Text> : <Text>No</Text>}",
    "      {label}",
    "      <Text>Plain</Text>",
    "    </ModalForm>",
    "  );",
    "}",
  );
  const loc = locOf(shapes, "<ModalForm");
  const slots = describeSlots(shapes, PAGE, loc);
  check("describeSlots: selfClosing", [slots.selfClosing, describeSlots(src, PAGE, locOf(src, "<Card theme=\"flat\"")).selfClosing], [false, true]);
  check("describeSlots: attributes", slots.attributes, [
    null,
    { elements: [{ name: "DockIcon", loc: "12:12" }], form: "element" },
    { elements: [{ name: "Badge", loc: "13:13" }, { name: "Badge", loc: "13:29" }], form: "fragment" },
    { elements: [{ name: "Text", loc: "14:21" }], form: "ternary" },
    null,
  ]);
  check("describeSlots: children", slots.children, [
    { elements: [{ name: "Text", loc: "17:27" }], form: "map" },
    { elements: [{ name: "Text", loc: "18:15" }], form: "and" },
    { elements: [{ name: "Text", loc: "19:14" }, { name: "Text", loc: "19:33" }], form: "ternary" },
    { elements: [], form: "other" },
    null,
  ]);
  const element = describeElement(shapes, PAGE, loc);
  const merged = withSlots(element, slots);
  check("withSlots: merged by position", [merged.selfClosing, merged.attributes[1].elements.length, merged.attributes[0].elements, merged.children[0].form, merged.children[4].kind, merged.children[4].form], [false, 1, undefined, "map", "element", undefined]);
  check("withSlots: another element's slots are ignored", withSlots(element, describeSlots(src, PAGE, locOf(src, "<Card theme=\"flat\""))), element);
  check("describeSlots: no element → null", [describeSlots(shapes, PAGE, "1:0"), describeSlots(shapes, PAGE, "x")], [null, null]);
}

/* ── GET /element: what differs from the saved file (describeSlots with base) ─────────────────────────────────────── */
{
  const flags = (code, needle, saved, nth = 0) => {
    const slots = describeSlots(code, PAGE, locOf(code, needle, nth), { base: saved });
    return [slots.childrenModified, slots.modifiedProps, slots.newSinceSave, slots.attributes.map((entry) => entry?.modified)];
  };
  const plain = describeSlots(src, PAGE, locOf(src, "<Card theme=\"border\""));
  check("modified: no base → no flags", ["childrenModified" in plain, "modifiedProps" in plain, "newSinceSave" in plain], [false, false, false]);
  const draft = run("modified: insert", src, "<Card theme=\"border\"", "Card", ins(BADGE)).code;
  check("modified: the changed slot and its ancestors' children, not the rest", [
    flags(draft, "<Card theme=\"border\"", src),
    flags(draft, "<Card theme=\"flat\"", src),
    flags(draft, "<Stack gap", src),
    flags(draft, "<ListItem", src),
    flags(src, "<Card theme=\"border\"", src),
  ], [
    [true, [], undefined, [null]],
    [false, [], undefined, [null]],
    [true, [], undefined, [null]],
    [false, [], undefined, [null, null, false]],
    [false, [], undefined, [null]],
  ]);
  const noLeading = run("modified: clear leading", src, "<ListItem", "ListItem", clear("leading")).code;
  const joined = run("modified: join leading", src, "<ListItem", "ListItem", ins(BADGE, { prop: "leading" })).code;
  check("modified: prop slots (one the draft removed included)", [flags(noLeading, "<ListItem", src), flags(joined, "<ListItem", src)], [
    [false, ["leading"], undefined, [null, null]],
    [false, ["leading"], undefined, [null, null, true]],
  ]);
  const withCard = run("modified: new card", src, "<Stack gap", "Stack", ins('<Card theme="pale" />', { index: 0 })).code;
  const filled = run("modified: new card filled", withCard, "<Card theme=\"pale\"", "Card", ins(BADGE)).code;
  check("modified: an element new since the save", [flags(withCard, "<Card theme=\"pale\"", src), flags(filled, "<Card theme=\"pale\"", src)], [[false, [], true, [null]], [true, [], true, [null]]]);
  const deeper = src.replace('      <Card theme="border">\n        <Text>Pro</Text>\n      </Card>', '      <Box>\n        <Card theme="border">\n          <Text>Pro</Text>\n        </Card>\n      </Box>');
  check("modified: indentation alone is no change", flags(deeper, "<Card theme=\"border\"", src), [false, [], undefined, [null]]);
  const loc = locOf(draft, "<Card theme=\"border\"");
  const merged = withSlots(describeElement(draft, PAGE, loc), describeSlots(draft, PAGE, loc, { base: src }));
  check("withSlots: the flags merged", [merged.childrenModified, merged.modifiedProps, "newSinceSave" in merged], [true, [], false]);
  check("modified: a saved text that does not parse → no flags", "childrenModified" in describeSlots(draft, PAGE, loc, { base: "export const x = `" }), false);
}

/* ── GET /element: savedAttributes, the saved version of each attribute the draft changed (2026-10-05) ───────────── */
{
  const saved = page(
    "export function Chat({ one }: { one: { online: boolean } }) {",
    "  return (",
    "    <Stack gap=\"md\">",
    "      <Avatar size=\"md\" status={one.online} focus name=\"Ann\" />",
    "    </Stack>",
    "  );",
    "}",
  );
  const at = locOf(saved, "<Avatar");
  const draft = applyOps(saved, at, "Avatar", [
    { op: "setProp", name: "size", value: str("lg") },
    { op: "setProp", name: "status", value: { kind: "boolean", value: false } },
    { op: "removeProp", name: "focus" },
    { op: "setProp", name: "dot", value: { kind: "boolean", value: true } },
  ], { snippets: false, file: PAGE }).code;
  const slots = describeSlots(draft, PAGE, locOf(draft, "<Avatar"), { base: saved });
  const line = Number(at.split(":")[0]);
  // `next`: what the saved file writes after it, so a playground's setProp puts it back in place (2026-10-08).
  check("savedAttributes: string, expression, added (null) and removed bare attribute; unchanged ones left out", slots.savedAttributes, {
    size: { name: "size", kind: "string", value: "md", raw: "size=\"md\"", line, next: "status" },
    // Described against the saved file like GET /element: what the binding reads (a restored binding is read the same way).
    status: { name: "status", kind: "expression", value: "one.online", raw: "status={one.online}", line, origin: { kind: "bound-value", reads: ["one"] }, next: "focus" },
    dot: null,
    focus: { name: "focus", kind: "true", raw: "focus", line, next: "name" },
  });
  check("savedAttributes: modifiedProps stays coded props only", slots.modifiedProps, ["status"]);
  const merged = withSlots(describeElement(draft, PAGE, locOf(draft, "<Avatar")), slots);
  check("savedAttributes: withSlots copies it", merged.savedAttributes, slots.savedAttributes);
  check("savedAttributes: nothing changed → empty", describeSlots(saved, PAGE, at, { base: saved }).savedAttributes, {});
  check("savedAttributes: no base → absent", "savedAttributes" in describeSlots(saved, PAGE, at), false);
  const added = run("savedAttributes: new element", saved, "<Stack gap", "Stack", ins('<Avatar size="sm" />', { index: 0 })).code;
  const fresh = describeSlots(added, PAGE, locOf(added, "<Avatar size=\"sm\""), { base: saved });
  check("savedAttributes: an element new since the save has none", [fresh.newSinceSave, "savedAttributes" in fresh], [true, false]);
}

/* ── mapLine: the same answers as src/platform/studio/code/diff.ts ────────────────────────────────────────────────── */
{
  const diffFile = path.join(ROOT, "src/platform/studio/code/diff.ts");
  const diff = fs.existsSync(diffFile) ? await import(pathToFileURL(diffFile).href) : null;
  ok("diff.ts found (mapLine parity)", diff);
  if (diff) {
    let seed = 7;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const pool = ["<Stack>", "<Card>", "<Text>Pro</Text>", "</Card>", "</Stack>", "", "<Badge />", "{open && <Text />}"];
    const pick = () => pool[Math.floor(random() * pool.length)];
    let cases = 0;
    let same = 0;
    for (let n = 0; n < 300; n += 1) {
      const before = Array.from({ length: 3 + Math.floor(random() * 25) }, pick);
      const after = [...before];
      for (let k = Math.floor(random() * 5); k >= 0; k -= 1) {
        const at = Math.floor(random() * (after.length + 1));
        const kind = random();
        if (kind < 0.35) after.splice(at, 0, pick());
        else if (kind < 0.7) after.splice(at, 1);
        else after.splice(at, 1, `changed ${n}`);
      }
      const a = before.join("\n");
      const b = after.join(random() < 0.2 ? "\r\n" : "\n");
      for (let line = 0; line <= before.length + 1; line += 1) {
        cases += 1;
        if (mapLine(a, b, line) === diff.mapLine(a, b, line)) same += 1;
      }
    }
    check("mapLine: the same answers as diff.ts (300 random edits)", same, cases);
    // changedBlockOf (the Studio's selection remap, select/remap.ts mapInChangedBlock): the changed lines around a line
    // in both texts. A slot Clear (host line changed, an import above removed) and a removed element (empty after).
    const cleared = [["import A;", "import B;", "", "    <Card theme=\"flat\">", "      <Text>Hi</Text>", "    </Card>", "    <Card theme=\"flat\">", "    </Card>", "end"], ["import A;", "", "    <Card theme=\"flat\" />", "    <Card theme=\"flat\">", "    </Card>", "end"]].map((lines) => lines.join("\n"));
    const removed = [["x", "    <Card theme=\"flat\">", "      <Text>Hi</Text>", "    </Card>", "    <Card theme=\"pale\">", "    </Card>"], ["x", "    <Card theme=\"pale\">", "    </Card>"]].map((lines) => lines.join("\n"));
    check("changedBlockOf: a cleared host, a removed element, an unchanged line", [diff.changedBlockOf(...cleared, 4), diff.changedBlockOf(...removed, 2), diff.changedBlockOf(...cleared, 1)], [{ before: [4, 6], after: [3, 3] }, { before: [2, 4], after: [2, 1] }, null]);
  }
  check("mapLine: small cases", [mapLine("a\nb\nc", "a\nx\nb\nc", 2), mapLine("a\nb\nc", "a\nc", 2), mapLine("a\nb", "a\nb", 5), mapLine("a\r\nb", "z\nb", 2), mapLine("a\nb", "a\nc", 0)], [3, null, 5, 2, null]);
}

/* ── jsx-source applyOps (once it dispatches the slot ops) ────────────────────────────────────────────────────────── */
{
  const loc = locOf(src, "<Card theme=\"border\"");
  const viaOps = applyOps(src, loc, "Card", [ins(BADGE)], { file: PAGE, componentModules: modules });
  if (/Unknown op/.test(viaOps.error ?? "")) console.log("note: jsx-source applyOps does not dispatch the slot ops yet (see the integration notes)");
  else {
    check("applyOps dispatch: the same answer", viaOps, applySlotOp(src, loc, "Card", ins(BADGE), { file: PAGE, componentModules: modules }));
    check("applyOps dispatch: one op only", applyOps(src, loc, "Card", [ins(BADGE), ins(BADGE)], { file: PAGE }).code, "invalid");
    const draft = viaOps.code;
    const viaReset = applyOps(draft, loc, "Card", [reset()], { file: PAGE, componentModules: modules, hash: sha1(draft), base: src });
    check("applyOps dispatch: base and hash reach resetSlot", [viaReset.reset, viaReset.code === src], [true, true]);
  }
}

/* ── realistic outputs: tsc, style-guard, usage-guard ─────────────────────────────────────────────────────────────── */
{
  const real = [
    'import { Badge } from "../../../components/Badge";',
    'import { Card } from "../../../components/Card";',
    'import { DockIcon } from "../../../components/DockIcon";',
    'import { Stack } from "../../../components/Layout";',
    'import { List, ListItem } from "../../../components/ListItem";',
    'import { Heading, Text } from "../../../components/Text";',
    "",
    "const team = [",
    "  { id: \"bao\", name: \"Bao Nguyen\", role: \"Product designer\" },",
    "  { id: \"trang\", name: \"Trang Le\", role: \"Frontend engineer\" },",
    "];",
    "",
    "export function ProjectOverview() {",
    "  return (",
    "    <Stack gap=\"md\">",
    "      <Card theme=\"border\">",
    "        <Stack gap=\"xs\">",
    "          <Heading level={3} textStyle=\"Heading/Subheading\">Loyalty app</Heading>",
    "          <Text tone=\"base\">Milestone 2 covers the rewards screens and the points ledger.</Text>",
    "        </Stack>",
    "      </Card>",
    "      <Card theme=\"border\" />",
    "      <List aria-label=\"Team\">",
    "        {team.map((person) => (",
    "          <ListItem key={person.id} title={person.name} caption={person.role}",
    "            leading={<DockIcon icon=\"icon-mobile-line\" theme=\"orange\" background=\"subtle\" />} />",
    "        ))}",
    "      </List>",
    "      <Stack direction=\"row\" gap=\"sm\">",
    "        <Badge theme=\"green\" background=\"subtle\">Active</Badge>",
    "        <Badge theme=\"blue\" background=\"subtle\">Phin & Co</Badge>",
    "      </Stack>",
    "    </Stack>",
    "  );",
    "}",
    "",
    "export function InvoiceCard() {",
    "  return (",
    "    <Card theme=\"border\">",
    "      <Text tone=\"base\">Due Oct 15, 2026</Text>",
    "    </Card>",
    "  );",
    "}",
    "",
  ].join("\n");
  const BUTTON = '<Button level="tertiary" onClick={() => toast({ title: "Report exported" })}>Export report</Button>';
  const ROW = '<Stack direction="row" gap="sm" justify="end">\n  <Button level="tertiary" onClick={() => toast({ title: "Invoice preview opened" })}>Preview invoice</Button>\n  <Button level="primary" onClick={() => toast({ title: "Invoice sent" })}>Send invoice</Button>\n</Stack>';
  const sample = { sample: true };
  run("real: button into an empty card", real, "<Card theme=\"border\" />", "Card", ins(BUTTON, { requires: ["toast"] }), sample);
  run("real: progress into a stack", real, "<Stack gap=\"xs\">", "Stack", ins('<ProgressBar value={60} label aria-label="Milestone progress" />'), sample);
  run("real: trailing badge in a .map row", real, "<ListItem", "ListItem", ins('<Badge theme="green" background="subtle">Active</Badge>', { prop: "trailing" }), sample);
  run("real: wrap a card's text with a button row", real, "<Card theme=\"border\">\n      <Text", "Card", ins(ROW, { wrap: { tag: "Stack", props: { gap: str("md") } }, requires: ["toast"] }), sample);
  run("real: inputs", real, "<Stack gap=\"xs\">", "Stack", ins('<FormFieldset legend="Billing cycle" kind="radio">\n  <RadioButton name="billing-cycle-k3f9" value="monthly" label="Monthly" defaultChecked />\n  <RadioButton name="billing-cycle-k3f9" value="yearly" label="Yearly" />\n</FormFieldset>'), sample);
  run("real: remove a badge", real, "<Badge theme=\"blue\"", "Badge", REMOVE, sample);
  run("real: remove the row's icon", real, "<DockIcon", "DockIcon", REMOVE, sample);
  run("real: remove the only badge left", run("real: remove a badge first", real, "<Badge theme=\"blue\"", "Badge", REMOVE).code, "<Badge", "Badge", REMOVE, sample);
  run("real: duplicate a badge", real, "<Badge theme=\"green\"", "Badge", DUPLICATE, sample);
  run("real: duplicate the row's icon", real, "<DockIcon", "DockIcon", DUPLICATE, sample);
  run("real: move a badge", real, "<Badge theme=\"blue\"", "Badge", move("prev"), sample);
  run("real: move a card", real, "<Card theme=\"border\" />", "Card", move("prev"), sample);
  run("real: clear a card's content", real, "<Card theme=\"border\">\n        <Stack", "Card", clear(), sample);
  run("real: clear the row's icon", real, "<ListItem", "ListItem", clear("leading"), sample);
  const twoSlots = run("real: insert into the stack", run("real: insert into the card", real, "<Card theme=\"border\" />", "Card", ins('<Badge theme="green" background="subtle">Active</Badge>')).code, "<Stack gap=\"xs\">", "Stack", ins('<ProgressBar value={60} label aria-label="Milestone progress" />'));
  run("real: reset one slot of two", twoSlots.code, "<Stack gap=\"xs\">", "Stack", reset(), { ...sample, base: real });
  // The action's hook leaves with the clear and comes back with the reset (tsc: toast is bound again).
  const withAction = run("real: an action first", real, "<Card theme=\"border\" />", "Card", ins(BUTTON, { requires: ["toast"] }));
  const noAction = run("real: clear the action's card", withAction.code, "<Card theme=\"border\">\n        <Button", "Card", clear(), sample);
  run("real: reset the action's card", noAction.code, "<Card theme=\"border\" />", "Card", reset(), { ...sample, base: withAction.code });
  const template = [
    "import {",
    "  Card,",
    "  Stack,",
    "  Text,",
    "} from \"@zen/design-system\";",
    "",
    "export function SettingsPanel() {",
    "  return (",
    "    <Stack gap=\"md\">",
    "      <Card theme=\"border\">",
    "        <Text tone=\"base\">Notifications</Text>",
    "      </Card>",
    "    </Stack>",
    "  );",
    "}",
    "",
  ].join("\n");
  run("real template: toggle and button", template, "<Card", "Card", ins('<Stack gap="md">\n  <Toggle label="Email notifications" />\n  <Button level="tertiary" onClick={() => toast({ title: "Settings saved" })}>Save settings</Button>\n</Stack>', { requires: ["toast"] }), { ...sample, file: TEMPLATE });
  // Controls: the checks below do catch a type error and a handler-less action.
  run("control: a wrong Badge theme", real, "<Card theme=\"border\" />", "Card", ins('<Badge theme="positive">Active</Badge>'), { ...sample, expect: ["TS2322"] });
  run("control: a Button without a handler", real, "<Card theme=\"border\" />", "Card", ins('<Button level="tertiary">Export report</Button>'), { ...sample, expectUsage: ["interaction/action-without-handler|Button"] });
  ok("realistic samples collected", samples.length >= 14);

  const draftDir = path.join(ROOT, "src/platform/examples/drafts");
  const madeDir = !fs.existsSync(draftDir);
  const stamp = `${process.pid}-${Date.now().toString(36)}`;
  const names = samples.map((_, i) => `zen-studio-slots-${stamp}-${i}.tsx`);
  const before = (i) => `zen-studio-slots-${stamp}-${i}-before.tsx`;
  const config = `zen-studio-slots-${stamp}-tsconfig.json`;
  const written = [];
  try {
    fs.mkdirSync(draftDir, { recursive: true });
    samples.forEach((item, i) => {
      fs.writeFileSync(path.join(draftDir, names[i]), item.after);
      fs.writeFileSync(path.join(draftDir, before(i)), item.before);
      written.push(names[i], before(i));
    });
    // TypeScript (the repo's tsconfig): every output type-checks.
    const tscBin = (() => {
      try { return path.join(path.dirname(createRequire(path.join(ROOT, "package.json")).resolve("typescript/package.json")), "bin/tsc"); } catch { return null; }
    })();
    ok("tsc: typescript found", tscBin && fs.existsSync(tscBin));
    if (tscBin && fs.existsSync(tscBin)) {
      fs.writeFileSync(path.join(draftDir, config), JSON.stringify({ extends: "../../../../tsconfig.json", include: ["../../../vite-env.d.ts", ...names], exclude: [] }));
      written.push(config);
      const run = spawnSync(process.execPath, [tscBin, "-p", path.join(draftDir, config), "--pretty", "false"], { encoding: "utf8" });
      ok("tsc: ran", !run.error && run.status !== null);
      const out = `${run.stdout ?? ""}${run.stderr ?? ""}`.split(/\r?\n/);
      check("tsc: no errors outside the drafts", out.filter((line) => /error TS\d+/.test(line) && !line.includes("zen-studio-slots-")), []);
      samples.forEach((item, i) => {
        const codes = out.filter((line) => line.includes(names[i])).map((line) => /error (TS\d+)/.exec(line)?.[1]).filter(Boolean);
        check(`tsc ${item.label}`, codes, item.expect ?? []);
      });
    }
    // style-guard and usage-guard: no finding the original did not have.
    const { checkFile } = await import(pathToFileURL(path.join(ROOT, "tools/style-guard/check-styles.mjs")).href);
    const { rules } = await import(pathToFileURL(path.join(ROOT, "tools/usage-guard/check-usage.mjs")).href);
    const { createChecker } = await import(pathToFileURL(path.join(ROOT, "tools/usage-guard/engine.mjs")).href);
    const usage = createChecker(rules, { consumer: false, css: false });
    const count = (list) => list.reduce((map, key) => map.set(key, (map.get(key) ?? 0) + 1), new Map());
    const fresh = (old, now) => [...count(now)].filter(([key, n]) => n > (count(old).get(key) ?? 0)).map(([key]) => key);
    samples.forEach((item, i) => {
      const rel = (name) => `src/platform/examples/drafts/${name}`;
      const style = (name) => checkFile(rel(name)).map((finding) => `${finding.rule}|${finding.context}`);
      check(`guards ${item.label}: style-guard`, fresh(style(before(i)), style(names[i])), []);
      const usageKeys = (text, name) => usage.checkFile(text, rel(name)).map((finding) => `${finding.rule.id}|${finding.tag}`);
      check(`guards ${item.label}: usage-guard`, fresh(usageKeys(item.before, before(i)), usageKeys(item.after, names[i])), item.expectUsage ?? []);
    });
  } finally {
    for (const name of written) fs.rmSync(path.join(draftDir, name), { force: true });
    if (madeDir) {
      try { fs.rmdirSync(draftDir); } catch { /* another run still uses it */ }
    }
  }
  ok("drafts cleaned up", written.every((name) => !fs.existsSync(path.join(draftDir, name))));
}

console.log(`slots selftest: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log(failures.map((failure) => `  ✗ ${failure}`).join("\n"));
  process.exit(1);
}
