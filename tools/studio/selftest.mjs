#!/usr/bin/env node
// Zen Studio selftest: the pure source helpers (tools/studio/jsx-source.mjs, detach.mjs, drafts.mjs) without a server. The detach
// section also runs style-guard and usage-guard on its outputs through a temporary file in src/platform/examples/drafts.
// The wrap section tests op "wrap" (the element inside a Box/Stack/Grid, the Layout import, the snippet), then `with` (siblings).
//   node tools/studio/selftest.mjs        prints a summary, exits 1 on any failure
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { annotate, applyOps, changedRange, describeElement, formatAttr, formatText, isAnnotatedFile, parseSource, sha1 } from "./jsx-source.mjs";
import * as drafts from "./drafts.mjs";
import cloning from "../../src/platform/studio/cloning.json" with { type: "json" };

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}
const ok = (label, condition) => check(label, Boolean(condition), true);
/** applyOps on `code` and return the new text (or the error object). */
const edit = (code, loc, name, ops) => {
  const result = applyOps(code, loc, name, ops);
  return "error" in result ? result : result.code;
};
const describe = (code, loc) => describeElement(code, "src/platform/x.tsx", loc);
const lines = (...rows) => rows.join("\n");

/* ── annotate ───────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const src = lines(
    "export function A() {",
    "  return (",
    "    <>",
    "      <Stack gap=\"sm\">",
    "        <Fragment><b>x</b></Fragment>",
    "        <React.Fragment key=\"k\" />",
    "        <Foo.Bar a />",
    "        <List<string> items={[]} />",
    "        <i data-zen-src=\"keep\" />",
    "      </Stack>",
    "    </>",
    "  );",
    "}",
  );
  const out = annotate(src, "src/platform/x.tsx");
  ok("annotate returns code and a map", out && typeof out.code === "string" && out.map && out.map.mappings);
  const code = out.code;
  check("annotate: after the tag name", code.split("\n")[3], '      <Stack data-zen-src="src/platform/x.tsx:4:6" gap="sm">');
  check("annotate: skips Fragment, annotates its children", code.split("\n")[4], '        <Fragment><b data-zen-src="src/platform/x.tsx:5:18">x</b></Fragment>');
  check("annotate: skips React.Fragment", code.split("\n")[5], '        <React.Fragment key="k" />');
  check("annotate: member expression", code.split("\n")[6], '        <Foo.Bar data-zen-src="src/platform/x.tsx:7:8" a />');
  check("annotate: after type arguments", code.split("\n")[7], '        <List<string> data-zen-src="src/platform/x.tsx:8:8" items={[]} />');
  check("annotate: keeps an existing data-zen-src", code.split("\n")[8], '        <i data-zen-src="keep" />');
  check("annotate: fragments untouched", code.split("\n")[2], "    <>");
  check("annotate: no JSX → null", annotate("export const a = 1 < 2;", "src/platform/y.tsx"), null);
  check("annotate: parse failure → null", annotate("export const = <div", "src/platform/y.tsx"), null);
  const bom = annotate("﻿<div />;", "src/platform/b.tsx");
  check("annotate: BOM kept, column counted without it", bom.code, '﻿<div data-zen-src="src/platform/b.tsx:1:0" />;');
}

/* ── file filter ────────────────────────────────────────────────────────────────────────────────────────────────── */
check("filter: example page", isAnnotatedFile("src/platform/examples/pages/button.tsx"), true);
check("filter: showcases", isAnnotatedFile("src/platform/PlatformShowcases.tsx"), true);
check("filter: templates", isAnnotatedFile("src/templates/hr/Dashboard.tsx"), true);
check("filter: chrome excluded", isAnnotatedFile("src/platform/PlatformApp.tsx"), false);
check("filter: studio excluded", isAnnotatedFile("src/platform/studio/StudioApp.tsx"), false);
check("filter: components excluded", isAnnotatedFile("src/components/Button/Button.tsx"), false);
check("filter: query excluded", isAnnotatedFile("src/platform/x.tsx?raw"), false);
check("filter: .ts excluded", isAnnotatedFile("src/platform/examples/data.ts"), false);

/* ── describeElement ────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const src = lines(
    "export const X = () => (",
    "  <Card",
    "    title=\"Hello\"",
    "    disabled",
    "    size={3}",
    "    tone={\"neutral\"}",
    "    level={level}",
    "    {...rest}",
    "    className={typographyStyles[\"Body/Small/Medium\"]}",
    "  >",
    "    Hello &amp; welcome",
    "    back",
    "    {name}",
    "    {/* comment */}",
    "    <Badge>New</Badge>",
    "    <><i>a</i> tail</>",
    "  </Card>",
    ");",
  );
  const el = describe(src, "2:2");
  check("describe: name", el.name, "Card");
  check("describe: lines", [el.startLine, el.endLine], [2, 17]);
  check("describe: loc and file", [el.loc, el.file], ["2:2", "src/platform/x.tsx"]);
  check("describe: attribute kinds", el.attributes.map((a) => [a.name, a.kind, a.value ?? null]), [
    ["title", "string", "Hello"],
    ["disabled", "true", null],
    ["size", "expression", "3"],
    ["tone", "string", "neutral"],
    ["level", "expression", "level"],
    ["…", "spread", "rest"],
    ["className", "expression", 'typographyStyles["Body/Small/Medium"]'],
  ]);
  check("describe: raw and line", [el.attributes[4].raw, el.attributes[4].line], ["level={level}", 7]);
  check("describe: children", el.children, [
    { kind: "text", index: 0, value: "Hello & welcome back" },
    { kind: "expression", raw: "{name}" },
    { kind: "element", name: "Badge", loc: "15:4" },
    { kind: "element", name: "i", loc: "16:6" },
    { kind: "text", index: 1, value: "tail" },
  ]);
  check("describe: typography (direct)", el.typography, ["Body/Small/Medium"]);
  check("describe: hash", el.hash, sha1(src));
  check("describe: no element → null", describe(src, "2:3"), null);
  check("describe: bad loc → null", describe(src, "x"), null);
  const forms = lines(
    "<div>",
    "  <p className={`${typographyStyles[\"Body/Base/Regular\"]} lead`} />",
    "  <p className={[typographyStyles['Caption/Medium'], cls].join(\" \")} />",
    "  <p className={cx(typographyStyles[`Label/Small/Medium`], open && typographyStyles[\"Body/Small/Bold\"])} />",
    "</div>",
  );
  check("describe: typography (template)", describe(forms, "2:2").typography, ["Body/Base/Regular"]);
  check("describe: typography (array)", describe(forms, "3:2").typography, ["Caption/Medium"]);
  check("describe: typography (call, several)", describe(forms, "4:2").typography, ["Label/Small/Medium", "Body/Small/Bold"]);
  check("describe: nested element by loc", describe(src, "15:4").children, [{ kind: "text", index: 0, value: "New" }]);
  check("describe: member-expression name", describe("const a = <Tabs.Item value=\"x\" />;", "1:10").name, "Tabs.Item");
}

/* ── setProp ────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const inline = 'const a = <Button level="primary" size="sm">Save</Button>;';
  check("setProp: replace string", edit(inline, "1:10", "Button", [{ op: "setProp", name: "level", value: { kind: "string", value: "tertiary" } }]), 'const a = <Button level="tertiary" size="sm">Save</Button>;');
  check("setProp: insert inline", edit(inline, "1:10", "Button", [{ op: "setProp", name: "accent", value: { kind: "boolean", value: true } }]), 'const a = <Button level="primary" size="sm" accent>Save</Button>;');
  check("setProp: boolean false", edit(inline, "1:10", "Button", [{ op: "setProp", name: "accent", value: { kind: "boolean", value: false } }]), 'const a = <Button level="primary" size="sm" accent={false}>Save</Button>;');
  check("setProp: number", edit(inline, "1:10", "Button", [{ op: "setProp", name: "width", value: { kind: "number", value: 120 } }]), 'const a = <Button level="primary" size="sm" width={120}>Save</Button>;');
  check("setProp: negative number", edit(inline, "1:10", "Button", [{ op: "setProp", name: "tabIndex", value: { kind: "number", value: -1 } }]), 'const a = <Button level="primary" size="sm" tabIndex={-1}>Save</Button>;');
  check("setProp: expression", edit(inline, "1:10", "Button", [{ op: "setProp", name: "onClick", value: { kind: "expression", code: " () => go(1) " } }]), 'const a = <Button level="primary" size="sm" onClick={() => go(1)}>Save</Button>;');
  check("setProp: two ops in one request", edit(inline, "1:10", "Button", [
    { op: "setProp", name: "level", value: { kind: "string", value: "secondary" } },
    { op: "setProp", name: "a", value: { kind: "boolean", value: true } },
    { op: "setProp", name: "b", value: { kind: "number", value: 1 } },
  ]), 'const a = <Button level="secondary" size="sm" a b={1}>Save</Button>;');
  check("setProp: no attributes", edit("<Icon />;", "1:0", "Icon", [{ op: "setProp", name: "name", value: { kind: "string", value: "x" } }]), '<Icon name="x" />;');
  check("setProp: self-closing", edit('<Icon name="x" />;', "1:0", "Icon", [{ op: "setProp", name: "size", value: { kind: "string", value: "sm" } }]), '<Icon name="x" size="sm" />;');
  check("setProp: after type arguments", edit("<List<string> />;", "1:0", "List", [{ op: "setProp", name: "dense", value: { kind: "boolean", value: true } }]), "<List<string> dense />;");
  check("setProp: before a spread (the spread still wins)", edit('<Avatar size="md" {...avatarOf(p)} />;', "1:0", "Avatar", [{ op: "setProp", name: "status", value: { kind: "boolean", value: true } }]), '<Avatar size="md" status {...avatarOf(p)} />;');
  check("setProp: before the first of two spreads", edit('<Avatar {...a} size="md" {...b} />;', "1:0", "Avatar", [{ op: "setProp", name: "focus", value: { kind: "boolean", value: false } }]), '<Avatar focus={false} {...a} size="md" {...b} />;');
  check("setProp: a spread on its own line", edit(lines("<Avatar", "  size=\"md\"", "  {...props}", "/>;"), "1:0", "Avatar", [{ op: "setProp", name: "status", value: { kind: "boolean", value: true } }]), lines("<Avatar", "  size=\"md\"", "  status", "  {...props}", "/>;"));
  check("setProp: a written prop beside a spread stays where it is", edit('<Avatar {...props} size="sm" />;', "1:0", "Avatar", [{ op: "setProp", name: "size", value: { kind: "string", value: "md" } }]), '<Avatar {...props} size="md" />;');
  const multi = lines("function A() {", "  return (", "    <Button", "      level=\"primary\"", "      onClick={() => {", "        go();", "      }}", "    >", "      Save", "    </Button>", "  );", "}");
  check("setProp: multi-line insert keeps indent", edit(multi, "3:4", "Button", [{ op: "setProp", name: "size", value: { kind: "string", value: "sm" } }]),
    lines("function A() {", "  return (", "    <Button", "      level=\"primary\"", "      onClick={() => {", "        go();", "      }}", "      size=\"sm\"", "    >", "      Save", "    </Button>", "  );", "}"));
  const tabs = "<Stack\n\tgap=\"sm\"\n\tdirection=\"row\"\n/>;";
  check("setProp: tab indent", edit(tabs, "1:0", "Stack", [{ op: "setProp", name: "wrap", value: { kind: "boolean", value: true } }]), "<Stack\n\tgap=\"sm\"\n\tdirection=\"row\"\n\twrap\n/>;");
  check("setProp: multi-line replace", edit(multi, "3:4", "Button", [{ op: "setProp", name: "level", value: { kind: "string", value: "tertiary" } }]).split("\n")[3], '      level="tertiary"');
  const shorthand = '<Toggle checked label="x" />;';
  check("setProp: true → false", edit(shorthand, "1:0", "Toggle", [{ op: "setProp", name: "checked", value: { kind: "boolean", value: false } }]), '<Toggle checked={false} label="x" />;');
  check("setProp: false → true shorthand", edit('<Toggle checked={false} />;', "1:0", "Toggle", [{ op: "setProp", name: "checked", value: { kind: "boolean", value: true } }]), "<Toggle checked />;");
  check("setProp: last duplicate wins", edit('<A x="1" x="2" />;', "1:0", "A", [{ op: "setProp", name: "x", value: { kind: "string", value: "3" } }]), '<A x="1" x="3" />;');
  // String escaping: plain quotes unless JS escaping is needed.
  const str = (value) => edit("<A />;", "1:0", "A", [{ op: "setProp", name: "t", value: { kind: "string", value } }]);
  check("escape: plain", str("Hello, world <3"), '<A t="Hello, world <3" />;');
  check("escape: double quote", str('Say "hi"'), '<A t={"Say \\"hi\\""} />;');
  check("escape: backslash", str("a\\b"), '<A t={"a\\\\b"} />;');
  check("escape: braces", str("{x}"), '<A t={"{x}"} />;');
  check("escape: newline", str("a\nb"), '<A t={"a\\nb"} />;');
  check("escape: entity", str("&amp;"), '<A t={"&amp;"} />;');
  check("escape: single quote stays plain", str("it's"), "<A t=\"it's\" />;");
  check("escape: empty string", str(""), '<A t="" />;');
  check("formatAttr: bad name", (() => { try { formatAttr("a b", { kind: "string", value: "x" }); return "no error"; } catch (error) { return error.code; } })(), "invalid");
  // No-ops: same value, whatever its spelling.
  for (const [label, code, value] of [
    ["string", '<A t="x" />;', { kind: "string", value: "x" }],
    ["string in braces", "<A t={'x'} />;", { kind: "string", value: "x" }],
    ["true shorthand", "<A t />;", { kind: "boolean", value: true }],
    ["false", "<A t={false} />;", { kind: "boolean", value: false }],
    ["number", "<A t={2} />;", { kind: "number", value: 2 }],
    ["expression", "<A t={a + b} />;", { kind: "expression", code: "a + b" }],
  ]) {
    const result = applyOps(code, "1:0", "A", [{ op: "setProp", name: "t", value }]);
    check(`no-op: ${label}`, [result.code === code, result.changed], [true, { from: 1, to: 1 }]);
  }
  check("setProp: bad expression → invalid", edit(inline, "1:10", "Button", [{ op: "setProp", name: "x", value: { kind: "expression", code: "a} b={c" } }]).code, "invalid");
  check("setProp: NaN → invalid", edit(inline, "1:10", "Button", [{ op: "setProp", name: "x", value: { kind: "number", value: Number.NaN } }]).code, "invalid");
  check("setProp: bad attribute name → invalid", edit(inline, "1:10", "Button", [{ op: "setProp", name: "on click", value: { kind: "boolean", value: true } }]).code, "invalid");
  check("setProp: unknown op → invalid", edit(inline, "1:10", "Button", [{ op: "rename" }]).code, "invalid");
  check("setProp: no ops → invalid", edit(inline, "1:10", "Button", []).code, "invalid");
  check("setProp: conflicting ops → invalid", edit(inline, "1:10", "Button", [{ op: "setProp", name: "level", value: { kind: "string", value: "a" } }, { op: "removeProp", name: "level" }]).code, "invalid");
}

/* ── removeProp ─────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const multi = lines("<Button", "  level=\"primary\"", "  size=\"sm\"", "  disabled", ">", "  Save", "</Button>;");
  check("removeProp: own line", edit(multi, "1:0", "Button", [{ op: "removeProp", name: "size" }]), lines("<Button", "  level=\"primary\"", "  disabled", ">", "  Save", "</Button>;"));
  check("removeProp: two own lines", edit(multi, "1:0", "Button", [{ op: "removeProp", name: "size" }, { op: "removeProp", name: "level" }]), lines("<Button", "  disabled", ">", "  Save", "</Button>;"));
  check("removeProp: inline first", edit('<Button level="primary" size="sm" />;', "1:0", "Button", [{ op: "removeProp", name: "level" }]), '<Button size="sm" />;');
  check("removeProp: inline last", edit('<Button level="primary" size="sm">x</Button>;', "1:0", "Button", [{ op: "removeProp", name: "size" }]), '<Button level="primary">x</Button>;');
  check("removeProp: shares a line with >", edit(lines("<Button", "  level=\"primary\"", "  size=\"sm\">", "  x", "</Button>;"), "1:0", "Button", [{ op: "removeProp", name: "size" }]), lines("<Button", "  level=\"primary\">", "  x", "</Button>;"));
  check("removeProp: multi-line attribute", edit(lines("<Button", "  onClick={() => {", "    go();", "  }}", "  size=\"sm\"", "/>;"), "1:0", "Button", [{ op: "removeProp", name: "onClick" }]), lines("<Button", "  size=\"sm\"", "/>;"));
  check("removeProp: absent → no change", applyOps('<A b="1" />;', "1:0", "A", [{ op: "removeProp", name: "c" }]).code, '<A b="1" />;');
{
  // A // comment after the last attribute stays on its line (backlog 2026-10-03: setProp moved it onto the new one).
  const commented = lines("const x = (", "  <A", '    b="1" // why', "  />", ");");
  const added = edit(commented, "2:2", "A", [{ op: "setProp", name: "c", value: { kind: "boolean", value: true } }]);
  check("setProp after a // comment: the comment stays", added, lines("const x = (", "  <A", '    b="1" // why', "    c", "  />", ");"));
  check("removeProp of it: the text as it was", edit(added, "2:2", "A", [{ op: "removeProp", name: "c" }]), commented);
  const closing = lines("const x = (", '  <A b="1"', '    d="2" />', ");");
  const withProp = edit(closing, "2:2", "A", [{ op: "setProp", name: "c", value: { kind: "boolean", value: true } }]);
  check("setProp then removeProp on a tag closed on its last line: the same text", edit(withProp, "2:2", "A", [{ op: "removeProp", name: "c" }]), closing);
}
  check("removeProp: own line before ` />` joins the line above", edit(lines("<Avatar", "  size=\"md\"", "  status />;"), "1:0", "Avatar", [{ op: "removeProp", name: "status" }]), lines("<Avatar", "  size=\"md\" />;"));
  check("removeProp: before ` />` under a // comment keeps the line", edit(lines("<Avatar", "  size=\"md\" // why", "  status />;"), "1:0", "Avatar", [{ op: "removeProp", name: "status" }]), lines("<Avatar", "  size=\"md\" // why", "  />;"));
  check("removeProp: before another attribute keeps its line", edit(lines("<Avatar", "  status size=\"md\" />;"), "1:0", "Avatar", [{ op: "removeProp", name: "status" }]), lines("<Avatar", "  size=\"md\" />;"));
  // A boolean toggled on, off, then reset (setProp true, setProp false, removeProp) gives the saved text back byte for
  // byte in the common layouts, so no draft is left over.
  const toggle = (code) => {
    const on = edit(code, "1:0", "Avatar", [{ op: "setProp", name: "status", value: { kind: "boolean", value: true } }]);
    const off = edit(on, "1:0", "Avatar", [{ op: "setProp", name: "status", value: { kind: "boolean", value: false } }]);
    return [on !== code, edit(off, "1:0", "Avatar", [{ op: "removeProp", name: "status" }])];
  };
  for (const [label, code] of [
    ["inline", '<Avatar size="md" name="Ann" />;'],
    ["one per line, `/>` on its own line", lines("<Avatar", "  size=\"md\"", "  name=\"Ann\"", "/>;")],
    ["one per line, ` />` after the last", lines("<Avatar", "  size=\"md\"", "  name=\"Ann\" />;")],
    ["first inline, ` />` after the last", lines("<Avatar size=\"md\"", "  name=\"Ann\" />;")],
    ["multi-line last attribute, ` />` after it", lines("<Avatar", "  onClick={() => {", "    go();", "  }} />;")],
    ["`>` with children", lines("<Avatar", "  size=\"md\"", "  name=\"Ann\">", "  x", "</Avatar>;")],
    ["a spread on its own line", lines("<Avatar", "  size=\"md\"", "  {...props} />;")],
    ["CRLF, ` />` after the last", "<Avatar\r\n  size=\"md\"\r\n  name=\"Ann\" />;"],
    ["tabs, `/>` on its own line", "<Avatar\n\tsize=\"md\"\n/>;"],
  ]) check(`round trip setProp → removeProp: ${label}`, toggle(code), [true, code]);
}

/* ── state-bound props: SourceAttr.state + setStateInit (edits keep behaviour, 2026-10-05) ───────────────────────── */
{
  const terms = lines(
    "export function Terms() {",
    "  const [agree, setAgree] = useState(false);",
    "  const [tab, setTab] = useState<\"all\" | \"unread\">('all');",
    "  const label = \"Agree\";",
    "  return <><Checkbox label={label} checked={agree} onCheckedChange={setAgree} /><Tabs value={tab} onValueChange={setTab} options={[]} />",
    "    {[true].map((agree) => <Checkbox key=\"x\" checked={agree} />)}</>;",
    "}",
  );
  const at = (needle, nth = 0) => {
    let index = -1;
    for (let k = 0; k <= nth; k += 1) index = terms.indexOf(needle, index + 1);
    const before = terms.slice(0, index);
    return `${before.split("\n").length}:${index - before.lastIndexOf("\n") - 1}`;
  };
  const attr = (loc, name) => describe(terms, loc).attributes.find((candidate) => candidate.name === name);
  check("state: a useState boolean", attr(at("<Checkbox"), "checked").state, { name: "agree", value: false, line: 2 });
  check("state: a typed useState string", attr(at("<Tabs"), "value").state, { name: "tab", value: "all", line: 3 });
  check("state: a const is not state", attr(at("<Checkbox"), "label").state, undefined);
  check("state: a .map parameter shadows it", attr(at("<Checkbox", 1), "checked").state, undefined);
  check("setStateInit: the initializer changes, the binding stays", edit(terms, at("<Checkbox"), "Checkbox", [{ op: "setStateInit", name: "checked", value: { kind: "boolean", value: true } }]), terms.replace("useState(false)", "useState(true)"));
  check("setStateInit: keeps the string's quotes", edit(terms, at("<Tabs"), "Tabs", [{ op: "setStateInit", name: "value", value: { kind: "string", value: "unread" } }]), terms.replace("('all')", "('unread')"));
  check("setStateInit: refused when not state", edit(terms, at("<Checkbox"), "Checkbox", [{ op: "setStateInit", name: "label", value: { kind: "string", value: "x" } }]).code, "invalid");
  check("setStateInit: refused under a shadowing parameter", edit(terms, at("<Checkbox", 1), "Checkbox", [{ op: "setStateInit", name: "checked", value: { kind: "boolean", value: false } }]).code, "invalid");
  check("setStateInit: refused for a wrong value kind", edit(terms, at("<Checkbox"), "Checkbox", [{ op: "setStateInit", name: "checked", value: { kind: "expression", code: "x" } }]).code, "invalid");
}

/* ── what an expression prop reads: SourceAttr.origin (2026-10-05) ──────────────────────────────────────────────── */
{
  const chat = lines(
    "const PEOPLE = [{ id: 1 }, { id: 2 }, { id: 3 }];",
    "export function Chat({ one, size }: Props) {",
    "  const [active, setActive] = useState<string | null>(null);",
    "  const [store] = React.useReducer(reduce, start);",
    "  const [{ mode }, setMode] = useState({ mode: \"list\" });",
    "  const selected = active === one.id;",
    "  const shown = selected;",
    "  return (",
    "    <>",
    "      <Avatar status={one.online} size={size} selected={selected} shown={shown} open={active} busy={store.busy} mode={mode} setter={setMode} lit={-1} none={undefined} obj={{ a: 1 }} fn={() => go()} el={<b />} text={\"x\"} {...rest} />",
    "      {PEOPLE.map((person, i) => <Avatar key={person.id} status={person.online as boolean} idx={i} both={active && person.on} outer={one.on} />)}",
    "      {[1, 2].map((n) => <Avatar status={n > 1} />)}",
    "      {one.rows?.map((row) => { const on = row.on; return <Avatar status={on} />; })}",
    "      {[true].map((active) => <Avatar status={active} />)}",
    "    </>",
    "  );",
    "}",
  );
  const origins = (nth) => {
    let index = -1;
    for (let k = 0; k <= nth; k += 1) index = chat.indexOf("<Avatar", index + 1);
    const before = chat.slice(0, index);
    const element = describe(chat, `${before.split("\n").length}:${index - before.lastIndexOf("\n") - 1}`);
    return Object.fromEntries(element.attributes.filter((attr) => attr.kind !== "spread").map((attr) => [attr.name, attr.origin ?? null]));
  };
  const top = origins(0);
  check("origin: a prop (data) → bound-value", [top.status, top.size], [{ kind: "bound-value", reads: ["one"] }, { kind: "bound-value", reads: ["size"] }]);
  check("origin: a const derived from state → bound-state", [top.selected, top.shown], [{ kind: "bound-state", reads: ["selected"] }, { kind: "bound-state", reads: ["shown"] }]);
  check("origin: useState with any initializer, useReducer, a destructured value → bound-state", [top.open, top.busy, top.mode], [{ kind: "bound-state", reads: ["active"] }, { kind: "bound-state", reads: ["store"] }, { kind: "bound-state", reads: ["mode"] }]);
  check("origin: a state setter is no state", top.setter, { kind: "bound-value", reads: ["setMode"] });
  check("origin: literals, objects, functions, JSX and strings → none", [top.lit, top.none, top.obj, top.fn, top.el, top.text], [null, null, null, null, null, null]);
  const row = origins(1);
  check("origin: a .map parameter → loop-bound, rows of a same-file const array", [row.status, row.idx], [{ kind: "loop-bound", reads: ["person"], rows: 3 }, { kind: "loop-bound", reads: ["i"], rows: 3 }]);
  // A row that also reads state is the component's interaction (`selected={active === person.id}`): bound-state, so the
  // inspector never replaces it with a fixed value (user rule: edits keep behaviour, 2026-10-05).
  check("origin: state beats a loop; outside reads stay bound-value", [row.both, row.outer], [{ kind: "bound-state", reads: ["active", "person"] }, { kind: "bound-value", reads: ["one"] }]);
  check("origin: an array literal gives rows", origins(2).status, { kind: "loop-bound", reads: ["n"], rows: 2 });
  check("origin: a local const of the row, no rows for a non-literal array", origins(3).status, { kind: "loop-bound", reads: ["on"] });
  check("origin: a .map parameter shadows state", origins(4).status, { kind: "loop-bound", reads: ["active"], rows: 1 });
  check("origin: a custom hook's value is state (never given a fixed value)", (() => {
    const attr = describe(lines("function T() {", "  const { picked } = useFormState();", "  return <Checkbox checked={picked.has(1)} />;", "}"), "3:9").attributes[0];
    return attr.origin;
  })(), { kind: "bound-state", reads: ["picked"] });
  check("origin: a state-bound bare identifier keeps `state`, no origin", (() => {
    const attr = describe(lines("function T() {", "  const [on, setOn] = useState(false);", "  return <Toggle checked={on} />;", "}"), "3:9").attributes[0];
    return [attr.state?.name, attr.origin];
  })(), ["on", undefined]);
}

/* ── object and array props: shape + setField ───────────────────────────────────────────────────────────────────── */
{
  const nav = '<TopNavigation leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} trailing={[{ icon: "icon-phone-line", label: "Call" }, { icon: "icon-bell-line", label: "Alerts", dot: true }]} />;';
  const described = describe(nav, "1:0");
  check("shape: object fields", described.attributes[0].shape, { type: "object", fields: [{ key: "icon", kind: "string", value: "icon-chevron-left-line-medium" }, { key: "label", kind: "string", value: "Back" }, { key: "onClick", kind: "expression", value: "back" }] });
  check("shape: array items", described.attributes[1].shape.items.map((item) => item.fields.map((field) => field.key).join(",")), ["icon,label", "icon,label,dot"]);
  check("shape: plain value has none", describe('<A n={count} />;', "1:0").attributes[0].shape, undefined);
  check("shape: spread field listed", describe('<A x={{ ...base, dot: true }} />;', "1:0").attributes[0].shape.fields[0], { key: "…", kind: "spread", value: "base" });
  check("setField: replace a string", edit(nav, "1:0", "TopNavigation", [{ op: "setField", name: "leading", key: "label", value: { kind: "string", value: "Inbox" } }]), nav.replace('label: "Back"', 'label: "Inbox"'));
  check("setField: add a field inline", edit(nav, "1:0", "TopNavigation", [{ op: "setField", name: "trailing", index: 0, key: "dot", value: { kind: "boolean", value: true } }]), nav.replace('label: "Call" }', 'label: "Call", dot: true }'));
  check("setField: remove the last field", edit(nav, "1:0", "TopNavigation", [{ op: "setField", name: "trailing", index: 1, key: "dot", value: null }]), nav.replace(', dot: true', ""));
  check("setField: remove a middle field", edit(nav, "1:0", "TopNavigation", [{ op: "setField", name: "leading", key: "label", value: null }]), nav.replace('label: "Back", ', ""));
  check("setField: same value → no change", edit(nav, "1:0", "TopNavigation", [{ op: "setField", name: "trailing", index: 1, key: "dot", value: { kind: "boolean", value: true } }]), nav);
  check("setField: absent removal → no change", edit(nav, "1:0", "TopNavigation", [{ op: "setField", name: "leading", key: "dot", value: null }]), nav);
  check("setField: keeps single quotes", edit("<A x={{ label: 'Hi' }} />;", "1:0", "A", [{ op: "setField", name: "x", key: "label", value: { kind: "string", value: "It's" } }]), "<A x={{ label: 'It\\'s' }} />;");
  check("setField: shorthand expanded", edit("<A x={{ icon }} />;", "1:0", "A", [{ op: "setField", name: "x", key: "icon", value: { kind: "string", value: "icon-x" } }]), '<A x={{ icon: "icon-x" }} />;');
  check("setField: empty object", edit("<A x={{}} />;", "1:0", "A", [{ op: "setField", name: "x", key: "dot", value: { kind: "boolean", value: true } }]), "<A x={{ dot: true }} />;");
  check("setField: only field removed", edit("<A x={{ dot: true }} />;", "1:0", "A", [{ op: "setField", name: "x", key: "dot", value: null }]), "<A x={{}} />;");
  check("setField: quoted key", edit("<A x={{ a: 1 }} />;", "1:0", "A", [{ op: "setField", name: "x", key: "aria-label", value: { kind: "string", value: "Go" } }]), '<A x={{ a: 1, "aria-label": "Go" }} />;');
  const multi = lines("<A", "  x={{", "    icon: \"icon-x\",", "    label: \"Go\",", "  }}", "/>;");
  check("setField: own-line field after a trailing comma", edit(multi, "1:0", "A", [{ op: "setField", name: "x", key: "dot", value: { kind: "boolean", value: true } }]), lines("<A", "  x={{", "    icon: \"icon-x\",", "    label: \"Go\",", "    dot: true,", "  }}", "/>;"));
  check("setField: own-line last removed", edit(multi, "1:0", "A", [{ op: "setField", name: "x", key: "label", value: null }]), lines("<A", "  x={{", "    icon: \"icon-x\",", "  }}", "/>;"));
  const noComma = lines("<A", "  x={{", "    icon: \"icon-x\"", "  }}", "/>;");
  check("setField: own-line field without a trailing comma", edit(noComma, "1:0", "A", [{ op: "setField", name: "x", key: "dot", value: { kind: "boolean", value: true } }]), lines("<A", "  x={{", "    icon: \"icon-x\",", "    dot: true", "  }}", "/>;"));
  check("setField: through `as const`", edit('<A x={[{ dot: false }] as const} />;', "1:0", "A", [{ op: "setField", name: "x", index: 0, key: "dot", value: { kind: "boolean", value: true } }]), '<A x={[{ dot: true }] as const} />;');
  check("setField: expression value", edit("<A x={{ n: 1 }} />;", "1:0", "A", [{ op: "setField", name: "x", key: "n", value: { kind: "expression", code: "count + 1" } }]), "<A x={{ n: count + 1 }} />;");
  check("setField: bad expression → invalid", edit("<A x={{ n: 1 }} />;", "1:0", "A", [{ op: "setField", name: "x", key: "n", value: { kind: "expression", code: "1 +" } }]).code, "invalid");
  check("setField: not an object → stale", edit("<A x={data} />;", "1:0", "A", [{ op: "setField", name: "x", key: "n", value: { kind: "number", value: 1 } }]).code, "stale");
  check("setField: index out of range → stale", edit("<A x={[{ a: 1 }]} />;", "1:0", "A", [{ op: "setField", name: "x", index: 3, key: "a", value: { kind: "number", value: 2 } }]).code, "stale");
  check("setField: missing attribute → stale", edit("<A />;", "1:0", "A", [{ op: "setField", name: "x", key: "a", value: { kind: "number", value: 2 } }]).code, "stale");
  check("setField: two fields in one apply", edit("<A x={{ a: 1 }} />;", "1:0", "A", [{ op: "setField", name: "x", key: "b", value: { kind: "number", value: 2 } }, { op: "setField", name: "x", key: "c", value: { kind: "number", value: 3 } }]), "<A x={{ a: 1, b: 2, c: 3 }} />;");
}

/* ── setText ────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  check("setText: inline", edit("<Button>Save</Button>;", "1:0", "Button", [{ op: "setText", index: 0, value: "Save changes" }]), "<Button>Save changes</Button>;");
  check("setText: surrounding whitespace kept", edit(lines("<p>", "  Hello", "</p>;"), "1:0", "p", [{ op: "setText", index: 0, value: "Bye" }]), lines("<p>", "  Bye", "</p>;"));
  check("setText: next to an expression", edit("<p>Hi {name}, bye</p>;", "1:0", "p", [{ op: "setText", index: 0, value: "Hello" }, { op: "setText", index: 1, value: "! See you" }]), "<p>Hello {name}! See you</p>;");
  check("setText: special characters braced", edit("<p>Hi</p>;", "1:0", "p", [{ op: "setText", index: 0, value: "a < b {c}" }]), '<p>{"a < b {c}"}</p>;');
  check("setText: entity braced", edit("<p>Hi</p>;", "1:0", "p", [{ op: "setText", index: 0, value: "&copy;" }]), '<p>{"&copy;"}</p>;');
  check("setText: edge spaces braced", edit("<p>Hi</p>;", "1:0", "p", [{ op: "setText", index: 0, value: " padded " }]), '<p>{" padded "}</p>;');
  check("setText: multi-line text collapses", edit(lines("<p>", "  one", "  two", "</p>;"), "1:0", "p", [{ op: "setText", index: 0, value: "three" }]), lines("<p>", "  three", "</p>;"));
  check("setText: same visible text → no change", applyOps(lines("<p>", "  one", "  two", "</p>;"), "1:0", "p", [{ op: "setText", index: 0, value: "one two" }]).code, lines("<p>", "  one", "  two", "</p>;"));
  check("setText: inside a fragment", edit("<p><>a <b>x</b> c</></p>;", "1:0", "p", [{ op: "setText", index: 1, value: "d" }]), "<p><>a <b>x</b> d</></p>;");
  check("setText: missing index → stale", edit("<p>Hi</p>;", "1:0", "p", [{ op: "setText", index: 3, value: "x" }]).code, "stale");
  check("formatText: plain", formatText("Save"), "Save");
}

/* ── setTypography ──────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const src = '<p className={cx(typographyStyles["Body/Small/Medium"], "x")}>a</p>;';
  check("setTypography: swaps the key", edit(src, "1:0", "p", [{ op: "setTypography", from: "Body/Small/Medium", to: "Body/Base/Bold" }]), '<p className={cx(typographyStyles["Body/Base/Bold"], "x")}>a</p>;');
  check("setTypography: single quotes kept", edit("<p className={typographyStyles['Caption/Medium']} />;", "1:0", "p", [{ op: "setTypography", from: "Caption/Medium", to: "Caption/Regular" }]), "<p className={typographyStyles['Caption/Regular']} />;");
  check("setTypography: template className", edit('<p className={`${typographyStyles["Body/Base/Regular"]} lead`} />;', "1:0", "p", [{ op: "setTypography", from: "Body/Base/Regular", to: "Heading/4" }]), '<p className={`${typographyStyles["Heading/4"]} lead`} />;');
  check("setTypography: key absent → stale", edit(src, "1:0", "p", [{ op: "setTypography", from: "Heading/1", to: "Heading/2" }]).code, "stale");
  check("setTypography: quote in key → invalid", edit(src, "1:0", "p", [{ op: "setTypography", from: "Body/Small/Medium", to: 'a"b' }]).code, "invalid");
}

/* ── locating, nesting, stale ───────────────────────────────────────────────────────────────────────────────────── */
{
  const src = lines("<Stack>", "  <Card>", "    <Button level=\"primary\">Go</Button>", "  </Card>", "</Stack>;");
  check("nested: edits only the inner element", edit(src, "3:4", "Button", [{ op: "setProp", name: "level", value: { kind: "string", value: "tertiary" } }]), lines("<Stack>", "  <Card>", "    <Button level=\"tertiary\">Go</Button>", "  </Card>", "</Stack>;"));
  check("nested: insert on the outer element", edit(src, "1:0", "Stack", [{ op: "setProp", name: "gap", value: { kind: "string", value: "sm" } }]).split("\n")[0], '<Stack gap="sm">');
  check("stale: name mismatch", edit(src, "3:4", "IconButton", [{ op: "removeProp", name: "level" }]).code, "stale");
  check("not-found: no element at loc", edit(src, "3:5", "Button", [{ op: "removeProp", name: "level" }]).code, "not-found");
  check("member expression edit", edit('<Tabs.Item value="a" />;', "1:0", "Tabs.Item", [{ op: "setProp", name: "value", value: { kind: "string", value: "b" } }]), '<Tabs.Item value="b" />;');
  const result = applyOps(src, "3:4", "Button", [{ op: "setText", index: 0, value: "Go now" }]);
  check("changed range", result.changed, { from: 3, to: 3 });
  check("changedRange: insertion", changedRange("a\nb\nc", "a\nb\nx\nc"), { from: 3, to: 3 });
  check("changedRange: deletion", changedRange("a\nb\nc", "a\nc"), { from: 2, to: 2 });
  check("syntax: an unparsable file is never edited", edit("<A />; const = ;", "1:0", "A", [{ op: "removeProp", name: "x" }]).code, "invalid");
}

/* ── CRLF and BOM ───────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const crlf = "<Button\r\n  level=\"primary\"\r\n  size=\"sm\"\r\n>\r\n  Save\r\n</Button>;\r\n";
  check("crlf: insert uses CRLF", edit(crlf, "1:0", "Button", [{ op: "setProp", name: "disabled", value: { kind: "boolean", value: true } }]), "<Button\r\n  level=\"primary\"\r\n  size=\"sm\"\r\n  disabled\r\n>\r\n  Save\r\n</Button>;\r\n");
  check("crlf: remove a whole line", edit(crlf, "1:0", "Button", [{ op: "removeProp", name: "size" }]), "<Button\r\n  level=\"primary\"\r\n>\r\n  Save\r\n</Button>;\r\n");
  check("crlf: setText keeps line endings", edit(crlf, "1:0", "Button", [{ op: "setText", index: 0, value: "Go" }]), "<Button\r\n  level=\"primary\"\r\n  size=\"sm\"\r\n>\r\n  Go\r\n</Button>;\r\n");
  check("crlf: describe lines", [describe(crlf, "1:0").startLine, describe(crlf, "1:0").endLine], [1, 6]);
  check("crlf: changed range", applyOps(crlf, "1:0", "Button", [{ op: "setText", index: 0, value: "Go" }]).changed, { from: 5, to: 5 });
  const bom = "﻿<A b=\"1\" />;";
  check("bom: kept on edit", edit(bom, "1:0", "A", [{ op: "setProp", name: "b", value: { kind: "string", value: "2" } }]), "﻿<A b=\"2\" />;");
  check("bom: describe at column 0", describe(bom, "1:0")?.name, "A");
}

/* ── docs chrome (zen-studio-chrome) ────────────────────────────────────────────────────────────────────────────── */
{
  const src = lines(
    "// zen-studio-chrome: docs chrome",
    "export function Card({ children }) {",
    "  return <div className=\"card\">{children}</div>;",
    "}",
    "/* zen-studio-chrome */",
    "const Wrap = ({ children }) => <section>{children}</section>;",
    "// zen-studio-chrome",
    "export const Memo = memo(function Inner() { return <i />; });",
    "// zen-studio-chrome",
    "function Plain() { const inner = () => <b />; return <p>{inner()}</p>; }",
    "// an ordinary comment",
    "export function Example() {",
    "  return <Card><Button>Go</Button></Card>;",
    "}",
  );
  const out = annotate(src, "src/platform/x.tsx").code;
  check("chrome: only the example's JSX is annotated", [...out.matchAll(/data-zen-src="([^"]+)"/g)].map((m) => m[1]), ["src/platform/x.tsx:13:9", "src/platform/x.tsx:13:15"]);
  check("chrome: export function skipped", out.split("\n")[2], "  return <div className=\"card\">{children}</div>;");
  check("chrome: nested arrow inside a chrome function skipped", out.split("\n")[9], "function Plain() { const inner = () => <b />; return <p>{inner()}</p>; }");
  const refused = applyOps(src, "3:9", "div", [{ op: "setProp", name: "id", value: { kind: "string", value: "x" } }]);
  check("chrome: edit refused", [refused.code, /docs chrome/.test(refused.error)], ["forbidden", true]);
  check("chrome: arrow const refused", applyOps(src, "6:31", "section", [{ op: "removeProp", name: "x" }]).code, "forbidden");
  check("chrome: memo(function) refused", applyOps(src, "8:51", "i", [{ op: "setProp", name: "a", value: { kind: "boolean", value: true } }]).code, "forbidden");
  check("chrome: the example still edits", edit(src, "13:15", "Button", [{ op: "setText", index: 0, value: "Go now" }]).split("\n")[12], "  return <Card><Button>Go now</Button></Card>;");
}

/* ── removeProp next to // comments ─────────────────────────────────────────────────────────────────────────────── */
{
  check("removeProp: after a // line, attributes after it kept", edit(lines("<Foo", "  a=\"1\" // the a", "  b=\"2\" c={3}", "/>;"), "1:0", "Foo", [{ op: "removeProp", name: "b" }]), lines("<Foo", "  a=\"1\" // the a", "  c={3}", "/>;"));
  check("removeProp: comment on the name line", edit(lines("<Foo // note", "  a=\"1\" b=\"2\"", "/>;"), "1:0", "Foo", [{ op: "removeProp", name: "a" }]), lines("<Foo // note", "  b=\"2\"", "/>;"));
  check("removeProp: never joins the > to a // line", edit(lines("<Foo", "  a=\"1\" // the a", "  b=\"2\">", "  x", "</Foo>;"), "1:0", "Foo", [{ op: "removeProp", name: "b" }]), lines("<Foo", "  a=\"1\" // the a", "  >", "  x", "</Foo>;"));
  check("removeProp: keeps a trailing // comment", edit(lines("<Foo", "  a=\"1\" // the a", "  b=\"2\"", "/>;"), "1:0", "Foo", [{ op: "removeProp", name: "a" }]), lines("<Foo", "  // the a", "  b=\"2\"", "/>;"));
  check("removeProp: two inline neighbours", edit('<A a="1" b="2">x</A>;', "1:0", "A", [{ op: "removeProp", name: "a" }, { op: "removeProp", name: "b" }]), "<A>x</A>;");
  check("removeProp: last attribute before a line break", edit(lines('<Foo a="1" b="2"', "/>;"), "1:0", "Foo", [{ op: "removeProp", name: "b" }]), lines('<Foo a="1"', "/>;"));
}

/* ── line separators, entities, invisible characters ────────────────────────────────────────────────────────────── */
{
  const two = lines("const x = <Foo title=\"a\">a</Foo>;", "const y = <Bar />;");
  const attr = edit(two, "1:10", "Foo", [{ op: "setProp", name: "title", value: { kind: "string", value: "a b" } }]);
  check("u2028: attribute escaped", attr.split("\n")[0], 'const x = <Foo title={"a\\u2028b"}>a</Foo>;');
  check("u2028: lines below keep their numbers", describe(attr, "2:10")?.name, "Bar");
  const textEdit = edit(two, "1:10", "Foo", [{ op: "setText", index: 0, value: "x y" }]);
  check("u2028: text escaped", textEdit.split("\n")[0], 'const x = <Foo title="a">{"x\\u2029y"}</Foo>;');
  check("u2028: expression refused", edit(two, "1:10", "Foo", [{ op: "setProp", name: "t", value: { kind: "expression", code: "'a b'" } }]).code, "invalid");
  const show = "<p>Tom &amp; Jerry&nbsp;Show</p>;";
  check("entities: kept where the text did not change", edit(show, "1:0", "p", [{ op: "setText", index: 0, value: "Tom & Jerry" }]), "<p>Tom &amp; Jerry</p>;");
  check("entities: &nbsp; kept next to a change", edit(show, "1:0", "p", [{ op: "setText", index: 0, value: "Tom & Jerry Shows" }]), "<p>Tom &amp; Jerry&nbsp;Shows</p>;");
  check("entities: a typed NBSP becomes &nbsp;", edit("<p>Hi</p>;", "1:0", "p", [{ op: "setText", index: 0, value: "a b" }]), "<p>a&nbsp;b</p>;");
  check("entities: zero-width space as an entity", edit("<p>Hi</p>;", "1:0", "p", [{ op: "setText", index: 0, value: "a​b" }]), "<p>a&#x200B;b</p>;");
  check("entities: NBSP in an attribute escaped", edit("<A />;", "1:0", "A", [{ op: "setProp", name: "t", value: { kind: "string", value: "a b" } }]), '<A t={"a\\u00a0b"} />;');
  check("entities: multi-line text keeps its line breaks", edit(lines("<p>", "  Tom &amp;", "  Jerry", "</p>;"), "1:0", "p", [{ op: "setText", index: 0, value: "Tom & Jerry!" }]), lines("<p>", "  Tom &amp;", "  Jerry!", "</p>;"));
  check("formatText: NBSP", formatText("a b"), "a&nbsp;b");
}

/* ── text written as a literal ({"…"}, {`…`}) ───────────────────────────────────────────────────────────────────── */
{
  const src = '<p>{"Send invoice"} {name}{" "}<b>{`Total`}</b></p>;';
  check("literal text: listed as text", describe(src, "1:0").children, [
    { kind: "text", index: 0, value: "Send invoice", expression: true },
    { kind: "expression", raw: "{name}" },
    { kind: "expression", raw: '{" "}' },
    { kind: "element", name: "b", loc: "1:31" },
  ]);
  check("literal text: setText keeps the double quotes", edit(src, "1:0", "p", [{ op: "setText", index: 0, value: 'Send "now"' }]), '<p>{"Send \\"now\\""} {name}{" "}<b>{`Total`}</b></p>;');
  check("literal text: single quotes", edit("<p>{'Send'}</p>;", "1:0", "p", [{ op: "setText", index: 0, value: "It's" }]), "<p>{'It\\'s'}</p>;");
  check("literal text: template", edit(src, "1:31", "b", [{ op: "setText", index: 0, value: "a ${b} `c`" }]), '<p>{"Send invoice"} {name}{" "}<b>{`a \\${b} \\`c\\``}</b></p>;');
  check("literal text: template with ${} stays an expression", describe("<p>{`a ${b}`}</p>;", "1:0").children, [{ kind: "expression", raw: "{`a ${b}`}" }]);
}

/* ── setTypography key checks ───────────────────────────────────────────────────────────────────────────────────── */
{
  const src = "<p className={typographyStyles[`Body/Base`]} />;";
  check("setTypography: ${ refused", edit(src, "1:0", "p", [{ op: "setTypography", from: "Body/Base", to: "${alert(1)}" }]).code, "invalid");
  check("setTypography: braces refused", edit(src, "1:0", "p", [{ op: "setTypography", from: "Body/Base", to: "a}b" }]).code, "invalid");
  check("setTypography: template key swapped", edit(src, "1:0", "p", [{ op: "setTypography", from: "Body/Base", to: "Body/Small" }]), "<p className={typographyStyles[`Body/Small`]} />;");
}

/* ── setTextStyle: add, replace or remove the element's text style (the file's typographyStyles import follows) ── */
{
  const keys = new Set(["Body/Base/Regular", "Body/Small/Medium", "Caption/Medium", "Heading/4"]);
  const file = "src/platform/examples/pages/demo.tsx";
  const style = (code, loc, name, value, options = {}) => {
    const result = applyOps(code, loc, name, [{ op: "setTextStyle", value }], { typographyKeys: keys, file, ...options });
    return "error" in result ? result : result.code;
  };
  const stack = 'import { Stack } from "../../../components/Stack";';
  const tsImport = 'import { typographyStyles } from "../../../tokens/typography.generated";';
  const page = (...body) => lines(stack, ...body);
  const withImport = (...body) => lines(stack, tsImport, ...body);
  const caption = 'typographyStyles["Caption/Medium"]';

  // Add: no className → className={…}; the import follows the last import.
  check("textStyle: add, no className", style(page("export const A = () => <p>Hi</p>;"), "2:23", "p", "Caption/Medium"), withImport(`export const A = () => <p className={${caption}}>Hi</p>;`));
  check("textStyle: add after other attributes", style(page('export const A = () => <p id="x" role="note">Hi</p>;'), "2:23", "p", "Caption/Medium"), withImport(`export const A = () => <p id="x" role="note" className={${caption}}>Hi</p>;`));
  const tall = page("export const A = () => (", "  <p", '    id="x"', "  >", "    Hi", "  </p>", ");");
  check("textStyle: add on its own line", style(tall, "3:2", "p", "Caption/Medium"), withImport("export const A = () => (", "  <p", '    id="x"', `    className={${caption}}`, "  >", "    Hi", "  </p>", ");"));
  // Add to a className without one: string, template, list, call, any other expression.
  check("textStyle: add to a string className", style(page('export const A = () => <p className="lead x">Hi</p>;'), "2:23", "p", "Caption/Medium"), withImport(`export const A = () => <p className={\`lead x \${${caption}}\`}>Hi</p>;`));
  check("textStyle: add to an empty className", style(page('export const A = () => <p className="">Hi</p>;'), "2:23", "p", "Caption/Medium"), withImport(`export const A = () => <p className={${caption}}>Hi</p>;`));
  check("textStyle: add to {\"…\"}", style(page("export const A = () => <p className={'a'}>Hi</p>;"), "2:23", "p", "Caption/Medium"), withImport(`export const A = () => <p className={\`a \${${caption}}\`}>Hi</p>;`));
  check("textStyle: string with ` and ${ escaped", style(page('export const A = () => <p className="a`b ${c}">Hi</p>;'), "2:23", "p", "Caption/Medium"), withImport(`export const A = () => <p className={\`a\\\`b \\\${c} \${${caption}}\`}>Hi</p>;`));
  check("textStyle: add to a template", style(page("export const A = () => <p className={`lead ${tone}`}>Hi</p>;"), "2:23", "p", "Caption/Medium"), withImport(`export const A = () => <p className={\`lead \${tone} \${${caption}}\`}>Hi</p>;`));
  check("textStyle: template ending in a space", style(page("export const A = () => <p className={`lead ${tone} `}>Hi</p>;"), "2:23", "p", "Caption/Medium"), withImport(`export const A = () => <p className={\`lead \${tone} \${${caption}}\`}>Hi</p>;`));
  check("textStyle: add to a list", style(page('export const A = () => <p className={["a", on && "b"].filter(Boolean).join(" ")}>Hi</p>;'), "2:23", "p", "Caption/Medium"), withImport(`export const A = () => <p className={["a", on && "b", ${caption}].filter(Boolean).join(" ")}>Hi</p>;`));
  const tallList = page("export const A = () => (", "  <p", "    className={[", '      "a",', "      tone,", '    ].join(" ")}', "  >", "    Hi", "  </p>", ");");
  check("textStyle: add to a list on its own lines", style(tallList, "3:2", "p", "Caption/Medium"), withImport("export const A = () => (", "  <p", "    className={[", '      "a",', "      tone,", `      ${caption},`, '    ].join(" ")}', "  >", "    Hi", "  </p>", ");"));
  check("textStyle: add to cx(…)", style(page('export const A = () => <p className={cx("a", on && "b")}>Hi</p>;'), "2:23", "p", "Caption/Medium"), withImport(`export const A = () => <p className={cx("a", on && "b", ${caption})}>Hi</p>;`));
  check("textStyle: add to an empty list", style(page('export const A = () => <p className={[].join(" ")}>Hi</p>;'), "2:23", "p", "Caption/Medium"), withImport(`export const A = () => <p className={[${caption}].join(" ")}>Hi</p>;`));
  check("textStyle: add to another expression", style(page('export const A = () => <p className={on ? "a" : undefined}>Hi</p>;'), "2:23", "p", "Caption/Medium"), withImport(`export const A = () => <p className={[on ? "a" : undefined, ${caption}].filter(Boolean).join(" ")}>Hi</p>;`));
  check("textStyle: add to a component", style(page("export const A = () => <Card>Hi</Card>;"), "2:23", "Card", "Caption/Medium"), withImport(`export const A = () => <Card className={${caption}}>Hi</Card>;`));
  const added = applyOps(page("", "export const A = () => <p>Hi</p>;"), "3:23", "p", [{ op: "setTextStyle", value: "Caption/Medium" }], { typographyKeys: keys, file });
  check("textStyle: changed lines are the element's", added.changed, { from: 4, to: 4 });
  check("textStyle: describe reads the new style", describe(added.code, "4:23").typography, ["Caption/Medium"]);

  // The import: kept, joined to a named import from the module, quotes / semicolons / line endings as the file's.
  check("textStyle: existing import kept", style(withImport("export const A = () => <p>Hi</p>;"), "3:23", "p", "Heading/4"), withImport('export const A = () => <p className={typographyStyles["Heading/4"]}>Hi</p>;'));
  check("textStyle: joins a named import of the module", style(lines('import { textStyleDefinitions } from "../../tokens/typography.generated";', "export const A = () => <p>Hi</p>;"), "2:23", "p", "Heading/4"), lines('import { textStyleDefinitions, typographyStyles } from "../../tokens/typography.generated";', 'export const A = () => <p className={typographyStyles["Heading/4"]}>Hi</p>;'));
  check("textStyle: joins a multi-line import", style(lines("import {", "  textStyleDefinitions,", '} from "../../tokens/typography.generated";', "export const A = () => <p>Hi</p>;"), "4:23", "p", "Heading/4"), lines("import {", "  textStyleDefinitions,", "  typographyStyles,", '} from "../../tokens/typography.generated";', 'export const A = () => <p className={typographyStyles["Heading/4"]}>Hi</p>;'));
  check("textStyle: a type-only import is not the binding", style(lines('import type { TypographyStyleName } from "../../../tokens/typography.generated";', "export const A = () => <p>Hi</p>;"), "2:23", "p", "Heading/4"), lines('import type { TypographyStyleName } from "../../../tokens/typography.generated";', tsImport, 'export const A = () => <p className={typographyStyles["Heading/4"]}>Hi</p>;'));
  check("textStyle: single quotes, no semicolons", style(lines("import { Stack } from '../../../components/Stack'", "export const A = () => <p>Hi</p>"), "2:23", "p", "Heading/4"), lines("import { Stack } from '../../../components/Stack'", "import { typographyStyles } from '../../../tokens/typography.generated'", 'export const A = () => <p className={typographyStyles["Heading/4"]}>Hi</p>'));
  check("textStyle: import before side-effect imports", style(lines(stack, 'import "./demo.css";', "export const A = () => <p>Hi</p>;"), "3:23", "p", "Heading/4"), lines(stack, tsImport, 'import "./demo.css";', 'export const A = () => <p className={typographyStyles["Heading/4"]}>Hi</p>;'));
  check("textStyle: import after a trailing comment", style(lines(`${stack} // layout`, "export const A = () => <p>Hi</p>;"), "2:23", "p", "Heading/4"), lines(`${stack} // layout`, tsImport, 'export const A = () => <p className={typographyStyles["Heading/4"]}>Hi</p>;'));
  check("textStyle: no import yet → first line", style("export const A = () => <p>Hi</p>;", "1:23", "p", "Heading/4", { file: "src/templates/hr/Page.tsx" }), lines('import { typographyStyles } from "../../tokens/typography.generated";', 'export const A = () => <p className={typographyStyles["Heading/4"]}>Hi</p>;'));
  check("textStyle: after a directive", style(lines('"use client";', "export const A = () => <p>Hi</p>;"), "2:23", "p", "Heading/4", { file: "src/platform/Demo.tsx" }), lines('"use client";', 'import { typographyStyles } from "../tokens/typography.generated";', 'export const A = () => <p className={typographyStyles["Heading/4"]}>Hi</p>;'));
  check("textStyle: a local binding needs no import", style(lines("const typographyStyles = { x: 1 };", "export const A = () => <p>Hi</p>;"), "2:23", "p", "Heading/4"), lines("const typographyStyles = { x: 1 };", 'export const A = () => <p className={typographyStyles["Heading/4"]}>Hi</p>;'));
  const crlf = page("export const A = () => (", "  <p", '    id="x"', "  >", "    Hi", "  </p>", ");").replace(/\n/g, "\r\n") + "\r\n";
  const crlfAdded = style(crlf, "3:2", "p", "Caption/Medium");
  check("textStyle: CRLF import and attribute", crlfAdded, withImport("export const A = () => (", "  <p", '    id="x"', `    className={${caption}}`, "  >", "    Hi", "  </p>", ");").replace(/\n/g, "\r\n") + "\r\n");
  ok("textStyle: CRLF has no lone LF", !/[^\r]\n/.test(crlfAdded));
  check("textStyle: CRLF remove drops the import line", style(crlfAdded, "4:2", "p", null), crlf);
  check("textStyle: BOM kept", style("\uFEFF" + page("export const A = () => <p>Hi</p>;"), "2:23", "p", "Caption/Medium"), "\uFEFF" + withImport(`export const A = () => <p className={${caption}}>Hi</p>;`));
  check("textStyle: BOM, no import yet", style("\uFEFFexport const A = () => <p>Hi</p>;", "1:23", "p", "Heading/4"), "\uFEFF" + lines(tsImport, 'export const A = () => <p className={typographyStyles["Heading/4"]}>Hi</p>;'));

  // Replace: every use takes the new key (quotes kept); the same key is a no-op.
  check("textStyle: replace direct", style(withImport(`export const A = () => <p className={${caption}}>Hi</p>;`), "3:23", "p", "Heading/4"), withImport('export const A = () => <p className={typographyStyles["Heading/4"]}>Hi</p>;'));
  check("textStyle: replace in a template, quotes kept", style(withImport("export const A = () => <p className={`lead ${typographyStyles['Caption/Medium']}`}>Hi</p>;"), "3:23", "p", "Heading/4"), withImport("export const A = () => <p className={`lead ${typographyStyles['Heading/4']}`}>Hi</p>;"));
  check("textStyle: replace every use", style(withImport('export const A = () => <p className={cx(typographyStyles["Caption/Medium"], on && typographyStyles[`Body/Base/Regular`])}>Hi</p>;'), "3:23", "p", "Heading/4"), withImport('export const A = () => <p className={cx(typographyStyles["Heading/4"], on && typographyStyles[`Heading/4`])}>Hi</p>;'));
  const same = withImport(`export const A = () => <p className={${caption}}>Hi</p>;`);
  check("textStyle: same key is a no-op", style(same, "3:23", "p", "Caption/Medium"), same);

  // Remove: the use goes with its tidy-up; the attribute when nothing is left; the import with the file's last use.
  check("textStyle: remove direct (attribute and import go)", style(withImport(`export const A = () => <p id="x" className={${caption}}>Hi</p>;`), "3:23", "p", null), page('export const A = () => <p id="x">Hi</p>;'));
  check("textStyle: remove keeps the import other code uses", style(withImport(`export const A = () => <p className={${caption}}>Hi</p>;`, `export const B = () => <h2 className={${caption}}>Yo</h2>;`), "3:23", "p", null), withImport("export const A = () => <p>Hi</p>;", `export const B = () => <h2 className={${caption}}>Yo</h2>;`));
  check("textStyle: remove keeps an import typeof uses", style(withImport(`type K = keyof typeof typographyStyles;`, `export const A = () => <p className={${caption}}>Hi</p>;`), "4:23", "p", null), withImport("type K = keyof typeof typographyStyles;", "export const A = () => <p>Hi</p>;"));
  check("textStyle: remove drops only its specifier", style(lines('import { textStyleDefinitions, typographyStyles } from "../../tokens/typography.generated";', `export const A = () => <p className={${caption}}>Hi</p>;`), "2:23", "p", null), lines('import { textStyleDefinitions } from "../../tokens/typography.generated";', "export const A = () => <p>Hi</p>;"));
  check("textStyle: remove a snippet mention does not keep the import", style(withImport(`export const A = () => <p className={${caption}}>Hi</p>;`, "export const s = `<p className={typographyStyles[\"x\"]} />`;"), "3:23", "p", null), page("export const A = () => <p>Hi</p>;", "export const s = `<p className={typographyStyles[\"x\"]} />`;"));
  const removeIn = (className) => style(withImport(`export const A = () => <p className={${className}}>Hi</p>;`, "export const keep = typographyStyles;"), "3:23", "p", null);
  const kept = (attribute) => withImport(`export const A = () => <p${attribute}>Hi</p>;`, "export const keep = typographyStyles;");
  check("textStyle: remove from a template start", removeIn("`${typographyStyles[\"Caption/Medium\"]} lead x`"), kept(' className="lead x"'));
  check("textStyle: remove from a template end", removeIn("`lead ${typographyStyles[\"Caption/Medium\"]}`"), kept(' className="lead"'));
  check("textStyle: remove from a template middle", removeIn("`a ${typographyStyles[\"Caption/Medium\"]} b`"), kept(' className="a b"'));
  check("textStyle: remove between placeholders", removeIn("`${a} ${typographyStyles[\"Caption/Medium\"]} ${b}`"), kept(" className={`${a} ${b}`}"));
  check("textStyle: remove leaves a dynamic template", removeIn("`lead ${typographyStyles[\"Caption/Medium\"]} ${tone}`"), kept(" className={`lead ${tone}`}"));
  check("textStyle: remove a template's only class", removeIn("`${typographyStyles[\"Caption/Medium\"]}`"), kept(""));
  check("textStyle: remove a list's first item", removeIn('[typographyStyles["Caption/Medium"], "s", c].filter(Boolean).join(" ")'), kept(' className={["s", c].filter(Boolean).join(" ")}'));
  check("textStyle: remove a list's last item", removeIn('["s", typographyStyles["Caption/Medium"]].join(" ")'), kept(' className="s"'));
  check("textStyle: [E].join unwraps to E", removeIn('[tone, typographyStyles["Caption/Medium"]].filter(Boolean).join(" ")'), kept(' className={tone}'));
  check("textStyle: remove a list's only item", removeIn('[typographyStyles["Caption/Medium"]].filter(Boolean).join(" ")'), kept(""));
  check("textStyle: remove `cond && …` from cx", removeIn('cx("a", on && typographyStyles["Caption/Medium"])'), kept(' className={cx("a")}'));
  check("textStyle: remove every use", removeIn('cx(typographyStyles["Body/Base/Regular"], on && typographyStyles["Caption/Medium"])'), kept(""));
  check("textStyle: remove `c ? … : \"\"`", removeIn('`a ${on ? typographyStyles["Caption/Medium"] : ""}`'), kept(' className="a"'));
  check("textStyle: remove one branch of a real choice", removeIn('on ? typographyStyles["Caption/Medium"] : "muted"'), kept(' className={on ? "" : "muted"}'));
  check("textStyle: remove from a + concatenation", removeIn('"a " + typographyStyles["Caption/Medium"]'), kept(' className="a "'));
  const tallRemove = withImport("export const A = () => (", "  <p", '    id="x"', `    className={${caption}}`, "  >", "    Hi", "  </p>", ");");
  check("textStyle: remove an attribute line", style(tallRemove, "4:2", "p", null), page("export const A = () => (", "  <p", '    id="x"', "  >", "    Hi", "  </p>", ");"));
  const listLines = withImport("export const A = () => (", "  <p", "    className={[", '      "a",', `      ${caption},`, "      tone,", '    ].join(" ")}', "  >", "    Hi", "  </p>", ");");
  check("textStyle: remove a list line", style(listLines, "4:2", "p", null), page("export const A = () => (", "  <p", "    className={[", '      "a",', "      tone,", '    ].join(" ")}', "  >", "    Hi", "  </p>", ");"));
  const listPair = withImport("export const A = () => (", "  <p", "    className={[", '      "a",', `      ${caption},`, '    ].join(" ")}', "  >", "    Hi", "  </p>", ");");
  check("textStyle: a list left with one class unwraps", style(listPair, "4:2", "p", null), page("export const A = () => (", "  <p", '    className="a"', "  >", "    Hi", "  </p>", ");"));
  const plain = page('export const A = () => <p className="lead">Hi</p>;');
  check("textStyle: remove when there is none is a no-op", style(plain, "2:23", "p", null), plain);
  check("textStyle: an unknown form is refused", style(withImport(`export const A = () => <p className={pick(${caption})}>Hi</p>;`), "3:23", "p", null).code, "invalid");
  const removed = applyOps(lines(stack, "", tsImport, "", `export const A = () => <p className={${caption}}>Hi</p>;`), "5:23", "p", [{ op: "setTextStyle", value: null }], { typographyKeys: keys, file });
  check("textStyle: changed lines after a dropped import", [removed.changed, removed.code.split("\n")[3]], [{ from: 4, to: 4 }, "export const A = () => <p>Hi</p>;"]);

  // Checks: the key must be known (keys passed in), plain, a string or null; a new import needs the file.
  check("textStyle: unknown key refused", style(plain, "2:23", "p", "Body/Huge").code, "invalid");
  check("textStyle: keys required to set", style(plain, "2:23", "p", "Caption/Medium", { typographyKeys: undefined }).code, "invalid");
  check("textStyle: keys as an array", style(page("export const A = () => <p>Hi</p>;"), "2:23", "p", "Caption/Medium", { typographyKeys: [...keys] }), withImport(`export const A = () => <p className={${caption}}>Hi</p>;`));
  check("textStyle: quote in the key refused", style(plain, "2:23", "p", 'a"b', { typographyKeys: new Set(['a"b']) }).code, "invalid");
  check("textStyle: a number refused", style(plain, "2:23", "p", 4).code, "invalid");
  check("textStyle: removing needs no keys", style(withImport(`export const A = () => <p className={${caption}}>Hi</p>;`), "3:23", "p", null, { typographyKeys: undefined }), page("export const A = () => <p>Hi</p>;"));
  check("textStyle: a new import needs the file", style(page("export const A = () => <p>Hi</p>;"), "2:23", "p", "Caption/Medium", { file: undefined }).code, "invalid");
  check("textStyle: setTypography checks keys when given", applyOps(same, "3:23", "p", [{ op: "setTypography", from: "Caption/Medium", to: "Body/Huge" }], { typographyKeys: keys }).code, "invalid");

  // The example snippet follows the opening tag (the import is not in the snippet; the element moved one line).
  const example = lines(
    stack,
    "function Note() {",
    "  return <p className=\"note\">Saved</p>;",
    "}",
    "export const examples = [{",
    "  code: `<p className=\"note\">Saved</p>`,",
    "  render: () => <Note />,",
    "}];",
  );
  const noted = applyOps(example, "3:9", "p", [{ op: "setTextStyle", value: "Caption/Medium" }], { typographyKeys: keys, file });
  check("textStyle: snippet synced", [noted.snippet, noted.code.split("\n")[6]], [{ synced: true }, "  code: `<p className={\\`note \\${typographyStyles[\"Caption/Medium\"]}\\`}>Saved</p>`,"]);
  check("textStyle: snippet sync, changed line", noted.changed, { from: 4, to: 4 });
  const unnoted = applyOps(noted.code, "4:9", "p", [{ op: "setTextStyle", value: null }], { typographyKeys: keys, file });
  check("textStyle: snippet follows the removal, import dropped", [unnoted.snippet, unnoted.code], [{ synced: true }, example]);
}

/* ── example snippets follow the edit ───────────────────────────────────────────────────────────────────────────── */
{
  const page = (extra = "") => lines(
    "function SendExample() {",
    "  return (",
    "    <Stack gap=\"md\">",
    "      <Button level=\"primary\" type=\"submit\">",
    "        Send invoice",
    "      </Button>",
    "      <Heading>Invoice</Heading>",
    "    </Stack>",
    "  );",
    "}",
    "export const examples = [",
    "  {",
    "    title: \"Send\",",
    "    code: `<Stack gap=\"md\">",
    "  <Button level=\"primary\" type=\"submit\">Send invoice</Button>",
    "</Stack>`,",
    "    render: () => <SendExample />,",
    `  },${extra}`,
    "];",
  );
  const level = [{ op: "setProp", name: "level", value: { kind: "string", value: "secondary" } }];
  const synced = applyOps(page(), "4:6", "Button", level);
  check("snippet: opening tag synced", synced.code.split("\n")[14], '  <Button level="secondary" type="submit">Send invoice</Button>');
  check("snippet: reported", synced.snippet, { synced: true });
  check("snippet: changed range is the element's", synced.changed, { from: 4, to: 4 });
  const text = applyOps(page(), "4:6", "Button", [{ op: "setText", index: 0, value: "Send it" }]);
  check("snippet: text synced", [text.code.split("\n")[4], text.code.split("\n")[14]], ["        Send it", '  <Button level="primary" type="submit">Send it</Button>']);
  const both = applyOps(page(), "4:6", "Button", [...level, { op: "setText", index: 0, value: "Send it" }]);
  check("snippet: tag and text together", both.code.split("\n")[14], '  <Button level="secondary" type="submit">Send it</Button>');
  const notShown = applyOps(page(), "7:6", "Heading", [{ op: "setProp", name: "level", value: { kind: "number", value: 4 } }]);
  check("snippet: element not in the snippet", [notShown.snippet.synced, /does not show/.test(notShown.snippet.reason)], [false, true]);
  check("snippet: the source still changes", notShown.code.split("\n")[6], "      <Heading level={4}>Invoice</Heading>");
  const twoSnippets = applyOps(page("\n  { title: \"Other\", code: `<Button level=\"primary\" type=\"submit\">Pay</Button>` },"), "4:6", "Button", level);
  // Another example's snippet with the same tag is never touched: only the snippet of the example that renders it.
  check("snippet: another example's snippet untouched", [twoSnippets.snippet.synced, twoSnippets.code.includes('code: `<Button level="primary" type="submit">Pay')], [true, true]);
  const shared = applyOps(page("\n  { title: \"Again\", code: `<SendExample />`, render: () => <SendExample /> },"), "4:6", "Button", level);
  check("snippet: two examples render it → untouched", [shared.snippet.synced, /more than one example/.test(shared.snippet.reason)], [false, true]);
  const unrelated = applyOps(page().replace("render: () => <SendExample />", "render: () => <Other />"), "4:6", "Button", level);
  check("snippet: no example renders it → untouched", [unrelated.snippet.synced, unrelated.code.split("\n")[14]], [false, '  <Button level="primary" type="submit">Send invoice</Button>']);
  // Text only lands in JSX text, never in an attribute value or a comment that holds the same words.
  const attr = applyOps(page().replace("<Button level=\"primary\" type=\"submit\">Send invoice</Button>", "<Button aria-label=\"Send invoice\" />"), "4:6", "Button", [{ op: "setText", index: 0, value: "Send it" }]);
  check("snippet: text never lands in an attribute", [attr.snippet.synced, attr.code.includes('aria-label="Send invoice"')], [false, true]);
  const twice = applyOps(page().replace("</Stack>`", "  <Button level=\"primary\" type=\"submit\">Again</Button>\n</Stack>`"), "4:6", "Button", level);
  check("snippet: twice in one snippet → untouched", [twice.snippet.synced, /more than once/.test(twice.snippet.reason)], [false, true]);
  check("snippet: none in the file → no report", "snippet" in applyOps("const a = <Button level=\"primary\" />;", "1:10", "Button", level), false);
  check("snippet: snippets: false skips them", applyOps(page(), "4:6", "Button", level, { snippets: false }).code.split("\n")[14], '  <Button level="primary" type="submit">Send invoice</Button>');
  // A multi-line tag in a snippet above the element: re-indented, and the element's changed lines move down.
  const above = lines(
    "export const examples = [{",
    "  code: `<Form>",
    "  <Button",
    "    level=\"primary\"",
    "    type=\"submit\"",
    "  >Go</Button>",
    "</Form>`,",
    "  render: () => <Example />,",
    "}];",
    "function Example() {",
    "  return (",
    "    <Form>",
    "      <Button",
    "        level=\"primary\"",
    "        type=\"submit\"",
    "      >",
    "        Go",
    "      </Button>",
    "    </Form>",
    "  );",
    "}",
  );
  const added = applyOps(above, "13:6", "Button", [{ op: "setProp", name: "disabled", value: { kind: "boolean", value: true } }]);
  check("snippet: multi-line re-indented", added.code.split("\n").slice(1, 8), ["  code: `<Form>", "  <Button", "    level=\"primary\"", "    type=\"submit\"", "    disabled", "  >Go</Button>", "</Form>`,"]);
  check("snippet: changed lines follow the shift", added.changed, { from: 17, to: 17 });
  check("snippet: source edited", added.code.split("\n")[16], "        disabled");
  // Text of another element with the same words, or code that looks like text, is never touched.
  const otherTag = lines(
    "function Ex() {",
    "  return (",
    "    <Stack>",
    "      <Tab>Projects</Tab>",
    "      <Heading>Projects</Heading>",
    "    </Stack>",
    "  );",
    "}",
    "export const examples = [{ code: `<Heading>Projects</Heading>`, render: () => <Ex /> }];",
  );
  const tabText = applyOps(otherTag, "4:6", "Tab", [{ op: "setText", index: 0, value: "Clients" }]);
  check("snippet: text of a look-alike element untouched", [tabText.snippet.synced, tabText.code.includes("code: `<Heading>Projects</Heading>`")], [false, true]);
  const codeText = lines(
    "function Ex() {",
    "  return <Text>else</Text>;",
    "}",
    "export const examples = [{ code: `if (a) {\n  go();\n} else {\n  stop();\n}`, render: () => <Ex /> }];",
  );
  const elseText = applyOps(codeText, "2:9", "Text", [{ op: "setText", index: 0, value: "otherwise" }]);
  check("snippet: code that reads like the text untouched", [elseText.snippet.synced, elseText.code.includes("} else {")], [false, true]);
  // Removing the last attribute keeps a > that sits on its own line in the snippet.
  const ownLine = lines(
    "function Ex() {",
    "  return (",
    "    <Button",
    "      level=\"primary\"",
    "      type=\"submit\"",
    "    >",
    "      Go",
    "    </Button>",
    "  );",
    "}",
    "export const examples = [{",
    "  code: `<Button",
    "  level=\"primary\"",
    "  type=\"submit\"",
    ">",
    "  Go",
    "</Button>`,",
    "  render: () => <Ex />,",
    "}];",
  );
  const dropType = applyOps(ownLine, "3:4", "Button", [{ op: "removeProp", name: "type" }]);
  check("snippet: removal keeps > on its own line", [dropType.snippet.synced, dropType.code.split("\n").slice(10, 13)], [true, ["  code: `<Button", "  level=\"primary\"", ">"]]);
  const dropTypeCrlf = applyOps(ownLine.replace(/\n/g, "\r\n"), "3:4", "Button", [{ op: "removeProp", name: "type" }]);
  check("snippet: removal keeps > on its own line (CRLF)", dropTypeCrlf.code.split("\r\n").slice(10, 13), ["  code: `<Button", "  level=\"primary\"", ">"]);
  // Template-literal escapes: the source's backticks and ${ appear escaped in the snippet.
  const ticks = lines(
    "const A = () => <p className={`a ${b}`} id=\"x\">t</p>;",
    "export const examples = [{ code: `<p className={\\`a \\${b}\\`} id=\"x\">t</p>`, render: () => <A /> }];",
  );
  const escaped = applyOps(ticks, "1:16", "p", [{ op: "setProp", name: "id", value: { kind: "string", value: "y" } }]);
  check("snippet: backticks and ${ escaped", escaped.code.split("\n")[1], "export const examples = [{ code: `<p className={\\`a \\${b}\\`} id=\"y\">t</p>`, render: () => <A /> }];");
}

/* ── detach (detach.mjs through applyOps op "detach") ───────────────────────────────────────────────────────────── */
{
  const { DETACHABLE, cssRules, detachMark, detachPlan, detachSlots } = await import("./detach.mjs");
  const repo = [fileURLToPath(new URL("../../", import.meta.url))].find((candidate) => fs.existsSync(path.join(candidate, "src/platform/studio/history.ts")));
  const history = repo ? await import(pathToFileURL(path.join(repo, "src/platform/studio/history.ts")).href) : null;
  ok("detach: history.ts found (undo checks)", history);
  const typographyKeys = (() => {
    try {
      const source = fs.readFileSync(path.join(repo, "src/tokens/typography.generated.ts"), "utf8");
      const block = /export const typographyStyles = \{([\s\S]*?)\n\}/.exec(source)?.[1] ?? "";
      return new Set([...block.matchAll(/^\s*"([^"]+)":\s*"zen-type-/gm)].map((match) => match[1]));
    } catch {
      return new Set(["Body/Base/Bold", "Body/Base/Regular", "Body/Small/Regular", "Heading/4"]);
    }
  })();
  const PAGE = "src/platform/examples/pages/detach-selftest.tsx";
  const IMPORTS = [
    'import { useRef } from "react";',
    'import { Badge } from "../../../components/Badge";',
    'import { Card } from "../../../components/Card";',
    'import { DescriptionItem, DescriptionList } from "../../../components/DescriptionList";',
    'import { DockIcon } from "../../../components/DockIcon";',
    'import { EmptyState } from "../../../components/EmptyState";',
    'import { InlineMessage } from "../../../components/InlineMessage";',
    'import { Stack } from "../../../components/Layout";',
    'import { List, ListItem } from "../../../components/ListItem";',
    'import { Metric, MetricCard } from "../../../components/MetricWidget";',
    'import { Tag } from "../../../components/Tag";',
    'import { Text } from "../../../components/Text";',
  ];
  const page = (...body) => [...IMPORTS, "", ...body, ""].join("\n");
  /** "<line>:<column>" of the nth occurrence of `needle` (a "<Tag" opening), BOM not counted. */
  const locOf = (code, needle, nth = 0) => {
    const text = code.replace(/^﻿/, "");
    let at = -1;
    for (let i = 0; i <= nth; i += 1) at = text.indexOf(needle, at + 1);
    const before = text.slice(0, at);
    return `${before.split(/\r?\n/).length}:${at - Math.max(before.lastIndexOf("\n"), -1) - 1}`;
  };
  const guardSamples = [];
  /** Detach the nth `needle` element and run the checks every detach must pass; returns the result. */
  const detachAt = (label, code, needle, name, op = {}, { nth = 0, file = PAGE, componentCss } = {}) => {
    const result = applyOps(code, locOf(code, needle, nth), name, [{ op: "detach", ...op }], { file, typographyKeys, componentCss });
    if ("error" in result) return result;
    const before = code.replace(/^﻿/, "");
    const after = result.code.replace(/^﻿/, "");
    const beforeAst = parseSource(before);
    const afterAst = parseSource(after);
    ok(`${label}: re-parses`, afterAst && afterAst.errors.length <= beforeAst.errors.length);
    const root = describeElement(result.code, file, result.detached?.loc ?? "");
    ok(`${label}: detached.loc is the new root`, root && ["Box", "Stack"].includes(root.name));
    ok(`${label}: marked`, after.includes(detachMark(name)));
    ok(`${label}: component named`, result.detached?.component === name);
    if (history) {
      const patch = history.makePatch(code, result.code);
      check(`${label}: undo restores the original exactly`, history.textBeforeEdit(result.code, patch, true) === code, true);
      check(`${label}: undo on the hash-less path too`, history.textBeforeEdit(result.code, patch, false) === code, true);
    }
    guardSamples.push({ label, before: code, after: result.code });
    return result;
  };
  const changedLines = (result) => result.code.split(/\r?\n/).slice(result.changed.from - 1, result.changed.to);
  const importLines = (result) => result.code.split(/\r?\n/).filter((line) => line.startsWith("import"));
  const reason = (code, needle, name, options) => {
    const plan = detachPlan(code, locOf(code, needle), name, { file: PAGE, ...options });
    return plan.ok ? null : plan.reason;
  };

  check("detach: detachable components", DETACHABLE, ["Card", "ListItem", "MetricCard", "Metric", "EmptyState", "DescriptionList", "InlineMessage", "Badge", "Tag"]);
  check("detach: slot selector \"\" is the instance root", detachSlots("Card"), [{ key: "padding", kind: "padding", selector: "" }, { key: "paddingX", kind: "paddingX", selector: "" }, { key: "paddingY", kind: "paddingY", selector: "" }, { key: "radius", kind: "radius", selector: "" }]);
  check("detach: no slots for others", detachSlots("Button"), []);

  // Card — minimal (Card.tsx defaults: shadow, md) and full (as, theme border, sm, surface alt, aria/data/className/key/ref, sub-action object).
  {
    const src = page("export const A = () => (", "  <Card>", "    <Text>Plan</Text>", "  </Card>", ");");
    const plan = detachPlan(src, locOf(src, "<Card"), "Card", { file: PAGE });
    check("card: plan", [plan.ok, plan.component, plan.repeated, plan.slots.length], [true, "Card", false, 4]);
    const result = detachAt("card minimal", src, "<Card", "Card");
    check("card minimal: output", changedLines(result), [
      "  /* zen-detached: Card · Zen Studio */",
      '  <Box surface="surface" radius="2xl" padding="xl">',
      "    <Text>Plan</Text>",
      "  </Box>",
    ]);
    check("card minimal: Box joins the Layout import, Card's import goes", [importLines(result).includes('import { Box, Stack } from "../../../components/Layout";'), importLines(result).some((line) => line.includes("components/Card"))], [true, false]);
    check("card minimal: approximations", result.detached.approximations, [
      "Card theme shadow: Shadow/Bottom/Level-1 is dropped (Box has no shadow).",
      "Card padding is fixed at xl (Card-padding-medium follows the breakpoint: 24 desktop, 20 tablet and phone).",
    ]);
    check("card minimal: loc and changed", [result.detached.loc, result.changed], ["15:2", { from: 14, to: 17 }]);
    const measured = detachAt("card measured", src, "<Card", "Card", { measured: { padding: "lg", radius: "xlarge", gap: "nonsense", extra: "x" } });
    check("card measured: valid measured values win (long spelling normalised), others ignored", changedLines(measured)[1], '  <Box surface="surface" radius="xl" padding="lg">');
    const bad = detachAt("card bad measure", src, "<Card", "Card", { measured: { padding: "huge", radius: 3 } });
    check("card: invalid measured values fall back", changedLines(bad)[1], '  <Box surface="surface" radius="2xl" padding="xl">');
    const full = page(
      "export function A({ id, label, go }: { id: string; label: string; go: (id: string) => void }) {",
      "  const ref = useRef<HTMLElement>(null);",
      "  return (",
      "    <Stack gap=\"md\">",
      "      <Card key=\"k\" ref={ref} as=\"section\" theme=\"border\" spacing=\"sm\" surface=\"alt\" aria-labelledby={id} className=\"x\" data-plan=\"pro\" subAction={{ label: \"Edit plan\", icon: \"icon-edit-02-line\", onClick: () => go(id) }}>",
      "        <Text as=\"span\">Pro</Text>",
      "        {label}",
      "      </Card>",
      "    </Stack>",
      "  );",
      "}",
    );
    const fullResult = detachAt("card full", full, "<Card", "Card");
    check("card full: output", changedLines(fullResult), [
      "      {/* zen-detached: Card · Zen Studio */}",
      "      <Box",
      '        key="k"',
      "        ref={ref}",
      '        as="section"',
      '        surface="surface-alt"',
      '        border="pale"',
      '        radius="lg"',
      '        padding="md"',
      "        aria-labelledby={id}",
      '        className="x"',
      '        data-plan="pro"',
      "      >",
      '        <Stack direction="row" align="start" gap="xs">',
      '          <Stack gap="none" style={{ flex: 1 }}>',
      '            <Text as="span">Pro</Text>',
      "            {label}",
      "          </Stack>",
      "          <IconButton",
      '            appearance="flat"',
      '            level="primary"',
      '            size="sm"',
      '            aria-label="Edit plan"',
      "            onClick={() => go(id)}",
      '            icon="icon-edit-02-line"',
      "          />",
      "        </Stack>",
      "      </Box>",
    ]);
    check("card full: IconButton gets a new import, sorted among the components", importLines(fullResult).slice(1, 4), ['import { Badge } from "../../../components/Badge";', 'import { IconButton } from "../../../components/Button";', 'import { DescriptionItem, DescriptionList } from "../../../components/DescriptionList";']);
    for (const [theme, surface] of [["flat", "surface"], ["pale", "pale"], ["semi-pale", "pale"], ["border", "surface"]]) {
      const one = detachAt(`card ${theme}`, page(`export const A = () => <Card theme="${theme}"><Stack gap="sm"><Text>x</Text></Stack></Card>;`), "<Card", "Card");
      check(`card ${theme}: surface, a block child kept as is`, changedLines(one)[0], `export const A = () => /* zen-detached: Card · Zen Studio */ <Box surface="${surface}"${theme === "border" ? ' border="pale"' : ""} radius="2xl" padding="xl"><Stack gap="sm"><Text>x</Text></Stack></Box>;`);
    }
    const spaced = detachAt("card inline text", page('export const A = () => <Card spacing="small"> Hi <b>there</b></Card>;'), "<Card", "Card");
    check("card: edge whitespace stays inline in a Stack", changedLines(spaced).slice(0, 2), ['export const A = () => /* zen-detached: Card · Zen Studio */ <Box surface="surface" radius="lg" padding="md">', '  <Stack gap="none"> Hi <b>there</b></Stack>']);
    const alt = detachAt("card on an alt canvas", page('export const A = () => <Shell canvas="alt"><Card>x</Card></Shell>;'), "<Card", "Card");
    check("card: the inherited surface is flagged in a file with a Canvas/Alt shell", alt.detached.approximations[0], "Card follows an inherited --zen-card-surface (Surface/Alt on a Canvas/Alt shell); the Box uses Surface/Default.");
    const used = detachAt("card used elsewhere", page("export const A = () => <><Card>a</Card><Card>b</Card></>;"), "<Card", "Card");
    check("card: import kept while another Card remains", importLines(used).some((line) => line.includes("components/Card")), true);
  }

  // ListItem — minimal, full (as div, titleLines 2, caption conditional, icon name, && trailing, data-*, selected={false}), children slot.
  {
    const min = detachAt("list minimal", page("export const A = () => (", "  <List>", "    <ListItem title=\"Rent\" />", "  </List>", ");"), "<ListItem", "ListItem");
    check("list minimal: output", changedLines(min), [
      "    {/* zen-detached: ListItem · Zen Studio */}",
      '    <Stack as="li" direction="row" align="center" gap="md" paddingY="sm">',
      '      <Stack gap="2xs" style={{ flex: 1 }}>',
      '        <Text as="span" textStyle="Body/Base/Bold" truncate>Rent</Text>',
      "      </Stack>",
      "    </Stack>",
    ]);
    check("list minimal: ListItem stays imported for List", importLines(min).find((line) => line.includes("components/ListItem")), 'import { List } from "../../../components/ListItem";');
    const full = page(
      "export const A = ({ row, done }: { row: { id: string; name: string; due?: string }; done: boolean }) => (",
      "  <List inset=\"comfortable\">",
      "    <ListItem",
      "      key={row.id}",
      "      as=\"div\"",
      "      title={row.name}",
      "      titleLines={2}",
      "      caption={row.due ? `Due ${row.due}` : null}",
      "      leading=\"icon-clock-line\"",
      "      trailing={done && <Badge theme=\"green\" background=\"subtle\">Done</Badge>}",
      "      data-row={row.id}",
      "      selected={false}",
      "    />",
      "    <ListItem title=\"Open\" onClick={() => {}} />",
      "  </List>",
      ");",
    );
    const fullResult = detachAt("list full", full, "<ListItem", "ListItem");
    check("list full: the comfortable inset follows the breakpoint", fullResult.detached.approximations.filter((line) => line.startsWith("Its List")), ['Its List has inset="comfortable", which follows the breakpoint (Margin/Comfortable: xl on desktop and tablet, lg on phones); the detached row fixes paddingX xl.']);
    check("list full: output", changedLines(fullResult), [
      "    {/* zen-detached: ListItem · Zen Studio */}",
      "    <Stack",
      "      key={row.id}",
      '      as="div"',
      '      direction="row"',
      '      align="center"',
      '      gap="md"',
      '      paddingX="xl"',
      '      paddingY="sm"',
      "      data-row={row.id}",
      "    >",
      '      <Icon name="icon-clock-line" decorative />',
      '      <Stack gap="2xs" style={{ flex: 1 }}>',
      '        <Text as="span" textStyle="Body/Base/Bold" truncate={2}>{row.name}</Text>',
      '        {row.due ? <Text as="span" textStyle="Body/Small/Regular" tone="light">{`Due ${row.due}`}</Text> : null}',
      "      </Stack>",
      "      {done ? (",
      '        <Stack direction="row" align="center" gap="sm">',
      '          <Badge theme="green" background="subtle">Done</Badge>',
      "        </Stack>",
      "      ) : null}",
      "    </Stack>",
    ]);
    const inCard = detachAt("list in card", page("export const A = () => (", "  <Card>", "    <List>", "      <ListItem title=\"Rent\" caption=\"Due\" />", "    </List>", "  </Card>", ");"), "<ListItem", "ListItem");
    ok("list in card: a row pads sm above and below only (the Card pads it sideways)", /paddingY="sm"/.test(changedLines(inCard).join("\n")) && !/paddingX=/.test(changedLines(inCard).join("\n")));
    check("list in card: exact, nothing to note about padding", inCard.detached.approximations.filter((line) => /padding|inset|clickable/.test(line)), []);
    const measured = detachAt("list measured", page("export const A = () => <List><ListItem title=\"Rent\" /></List>;"), "<ListItem", "ListItem", { measured: { paddingX: "lg", titleStyle: "Body/Small/Bold", gap: "sm" } });
    ok("list measured: inset, gap and title style from the instance", /paddingX="lg"/.test(measured.code) && /paddingY="sm"/.test(measured.code) && /gap="sm"/.test(measured.code) && /textStyle="Body\/Small\/Bold"/.test(measured.code));
    // Padding (list-item.css, Figma List-Item since 2026-10-06): Padding/Small above and below, clickable or not; only a
    // deprecated List inset (its own or an outer List's) pads the row sideways.
    const rowPadding = (label, body, { needle = "<ListItem", op = {}, nth = 0 } = {}) => {
      const result = detachAt(`row padding ${label}`, page(body), needle, "ListItem", op, { nth });
      if ("error" in result) return [result.error];
      const root = result.code.split(/\r?\n/).slice(result.changed.from - 1, result.changed.to).join(" ");
      return [/paddingX="([^"]+)"/.exec(root)?.[1] ?? null, /paddingY="([^"]+)"/.exec(root)?.[1] ?? null];
    };
    const notes = (label, body, op = {}, needle = "<ListItem") => {
      const result = detachAt(`row notes ${label}`, page(body), needle, "ListItem", op);
      return "error" in result ? [result.error] : result.detached.approximations.filter((line) => /padding|inset|clickable|bleeds/.test(line));
    };
    const A = (inner) => `export const A = ({ f, on, rows, row }: { f: () => void; on: boolean; rows: string[]; row: { href?: string } }) => ${inner};`;
    check("row padding: static List", rowPadding("static", A('<List><ListItem title="a" /><ListItem title="b" /></List>')), [null, "sm"]);
    check("row padding: beside an onClick row", rowPadding("onClick", A('<List><ListItem title="a" /><ListItem title="b" onClick={f} /></List>')), [null, "sm"]);
    check("row padding: a selected row", rowPadding("selected", A('<List><ListItem title="a" /><ListItem title="b" selected /></List>')), [null, "sm"]);
    check("row padding: in a Card", rowPadding("card", A('<Card><List><ListItem title="a" /></List></Card>')), [null, "sm"]);
    check("row padding: in a padded Stack", rowPadding("padded stack", A('<Stack padding="xl"><List><ListItem title="a" /></List></Stack>')), [null, "sm"]);
    check("row padding: outside a List", rowPadding("no list", A('<Stack><ListItem as="div" title="a" /></Stack>')), [null, "sm"]);
    check("row padding: inset none", rowPadding("inset none", A('<List inset="none"><ListItem title="a" /><ListItem title="b" onClick={f} /></List>')), [null, "sm"]);
    check("row padding: inset compact", rowPadding("inset compact", A('<List inset="compact"><ListItem title="a" /></List>')), ["lg", "sm"]);
    check("row padding: inset auto", rowPadding("inset auto", A('<List inset={"auto"}><ListItem title="a" /></List>')), [null, "sm"]);
    check("row padding: inset={undefined} is auto", rowPadding("inset undefined", A('<List inset={undefined}><ListItem title="a" /></List>')), [null, "sm"]);
    check("row padding: the row in a map", rowPadding("mapped row", A('<List inset="compact"><ListItem title="Open" href="/a" />{rows.map((name) => <ListItem key={name} title={name} />)}</List>'), { needle: "<ListItem key", op: { instance: 0 } }), ["lg", "sm"]);
    check("row padding: an outer List's inset inherits", rowPadding("inherit", A('<List inset="compact"><ListItem title="o" onClick={f} /><ListItem title="p" trailing={<List><ListItem title="inner" /></List>} /></List>'), { needle: '<ListItem title="inner"' }), ["lg", "sm"]);
    check("row padding: an outer inset none inherits", rowPadding("inherit none", A('<List inset="none"><ListItem title="o" onClick={f} /><ListItem title="p" trailing={<List><ListItem title="inner" /></List>} /></List>'), { needle: '<ListItem title="inner"' }), [null, "sm"]);
    check("row padding: wrapped in a Stack inside an inset List", rowPadding("wrapped", A('<List inset="compact"><Stack><ListItem title="a" /></Stack></List>')), ["lg", "sm"]);
    check("row padding: measured none wins", rowPadding("measured none", A('<List><ListItem title="a" /></List>'), { op: { measured: { paddingX: "none", paddingY: "none" } } }), [null, null]);
    check("row padding: measured paddingY alone", rowPadding("measured y", A('<List><ListItem title="a" /></List>'), { op: { measured: { paddingY: "sm" } } }), [null, "sm"]);
    const aliased = (label, imports, body, needle = "<ListItem") => {
      const code = [...IMPORTS.filter((line) => !line.includes("components/ListItem")), ...imports, "", body, ""].join("\n");
      const result = detachAt(`row padding ${label}`, code, needle, "ListItem");
      if ("error" in result) return [result.error];
      const root = result.code.split(/\r?\n/).slice(result.changed.from - 1, result.changed.to).join(" ");
      return [/paddingX="([^"]+)"/.exec(root)?.[1] ?? null, /paddingY="([^"]+)"/.exec(root)?.[1] ?? null];
    };
    check("row padding: an aliased List import", aliased("alias", ['import { List as Rows, ListItem } from "../../../components/ListItem";'], 'export const A = () => <Rows inset="compact"><ListItem title="a" /></Rows>;'), ["lg", "sm"]);
    check("row padding: a namespace import", aliased("namespace", ['import * as Zen from "../../../components/ListItem";', 'import { ListItem } from "../../../components/ListItem";'], 'export const A = () => <Zen.List inset="compact"><ListItem title="a" /></Zen.List>;'), ["lg", "sm"]);
    check("row padding: a local List is not Zen's", aliased("local list", ['import { ListItem } from "../../../components/ListItem";'], 'const List = ({ children }: { children: React.ReactNode; inset?: string }) => <div>{children}</div>;\nexport const A = () => <List inset="compact"><ListItem title="a" /></List>;'), [null, "sm"]);
    check("row notes: exact cases note nothing", [notes("static", A('<List><ListItem title="a" /></List>')), notes("beside", A('<List><ListItem title="a" /><ListItem title="b" onClick={f} /></List>')), notes("helper", "export const Row = () => <ListItem title=\"x\" />;")], [[], [], []]);
    check("row notes: compact follows the breakpoint", notes("compact", A('<List inset="compact"><ListItem title="a" /><ListItem title="b" onClick={f} /></List>')), ['Its List has inset="compact", which follows the breakpoint (Margin/Compact: lg on desktop and tablet, md on phones); the detached row fixes paddingX lg.']);
    check("row notes: the breakpoint note names the measured value", notes("compact measured", A('<List inset="compact"><ListItem title="a" /></List>'), { measured: { paddingX: "md", paddingY: "sm" } }), ['Its List has inset="compact", which follows the breakpoint (Margin/Compact: lg on desktop and tablet, md on phones); the detached row fixes paddingX md.']);
    check("row notes: an inherited inset says so", notes("inherit", A('<List inset="compact"><ListItem title="o" onClick={f} /><ListItem title="p" trailing={<List><ListItem title="inner" /></List>} /></List>'), {}, '<ListItem title="inner"'), ['An outer List (its rows inherit --zen-list-inset) has inset="compact", which follows the breakpoint (Margin/Compact: lg on desktop and tablet, md on phones); the detached row fixes paddingX lg.']);
    check("row notes: a List inside the row notes nothing", notes("inner list", A('<List><ListItem title="a" trailing={<List><ListItem title="c" /></List>} /><ListItem title="b" onClick={f} /></List>')), []);
    const unknownStyle = detachAt("list unknown style", page("export const A = () => <List><ListItem title=\"Rent\" /></List>;"), "<ListItem", "ListItem", { measured: { titleStyle: "Body/Huge" } });
    ok("list: unknown text style ignored", /textStyle="Body\/Base\/Bold"/.test(unknownStyle.code));
    const kids = detachAt("list children", page("export const A = () => (", "  <List>", "    <ListItem title=\"x\" leading={<DockIcon icon=\"icon-home-02-solid\" />}>", "      <Text>Custom</Text>", "    </ListItem>", "  </List>", ");"), "<ListItem", "ListItem");
    check("list children: contents slot", changedLines(kids).slice(2, 5), ['      <DockIcon icon="icon-home-02-solid" />', '      <Stack gap="2xs" style={{ flex: 1 }}>', "        <Text>Custom</Text>"]);
    const named = detachAt("list leading variable", page("export const A = ({ icon }: { icon: string }) => <List><ListItem title=\"x\" leading={icon} /></List>;"), "<ListItem", "ListItem");
    ok("list: a leading variable is kept and flagged", named.detached.approximations.some((line) => line.startsWith("leading={icon} is placed as is")));
  }

  // MetricCard and Metric (MetricWidget.tsx): sizes, icon false, emoji, trend object / reference / call, title-highlight.
  {
    const card = detachAt("metric card", page(
      "export const A = ({ kpi }: { kpi: { label: string; value: string; trend?: { direction: \"positive\"; label: string } } }) => (",
      "  <MetricCard theme=\"border\" label={kpi.label} value={kpi.value} trend={kpi.trend} icon=\"icon-users-check-line\" iconTheme=\"accent\" subAction={<Text>…</Text>} />",
      ");",
    ), "<MetricCard", "MetricCard");
    check("metric card: output", changedLines(card), [
      "  /* zen-detached: MetricCard · Zen Studio */",
      '  <Box surface="surface" border="pale" radius="2xl" padding="xl">',
      '    <Stack direction="row" align="start" gap="xs">',
      '      <Stack gap="md" align="start" style={{ flex: 1 }}>',
      '        <DockIcon icon="icon-users-check-line" theme="accent" background="subtle" size="large" />',
      '        <Stack gap="2xs" align="start">',
      '          <Stack gap="3xs">',
      '            <Text as="span" textStyle="Body/Base/Regular" tone="light">{kpi.label}</Text>',
      '            <Text as="span" textStyle="Display/4">{kpi.value}</Text>',
      "          </Stack>",
      "          {kpi.trend ? <MetricTrend trend={kpi.trend.direction}>{kpi.trend.label}</MetricTrend> : null}",
      "        </Stack>",
      "      </Stack>",
      "      <Text>…</Text>",
      "    </Stack>",
      "  </Box>",
    ]);
    check("metric card: MetricTrend joins the MetricWidget import, MetricCard leaves it", importLines(card).find((line) => line.includes("MetricWidget")), 'import { Metric, MetricTrend } from "../../../components/MetricWidget";');
    const small = detachAt("metric sm", page('export const A = () => <Metric size="sm" label="Joined" value="5" icon={false} trend={{ direction: "negative", label: "-2" }} className="m" />;'), "<Metric", "Metric");
    check("metric sm: inline row, no icon, trend object", changedLines(small), [
      'export const A = () => /* zen-detached: Metric · Zen Studio */ <Stack direction="row" gap="sm" align="start" className="m">',
      '  <Stack gap="2xs" align="start">',
      '    <Stack gap="3xs">',
      '      <Text as="span" textStyle="Body/Small/Regular" tone="light">Joined</Text>',
      '      <Text as="span" textStyle="Heading/4">5</Text>',
      "    </Stack>",
      '    <MetricTrend trend="negative">-2</MetricTrend>',
      "  </Stack>",
      "</Stack>;",
    ]);
    const emoji = detachAt("metric emoji", page('export const A = () => <Metric size="md" label="Mood" value="Good" iconEmoji="🙂" />;'), "<Metric", "Metric");
    ok("metric emoji: DockIcon emoji, medium", changedLines(emoji).includes('  <DockIcon theme="emoji" emoji="🙂" background="subtle" size="medium" />'));
    const call = detachAt("metric trend call", page("const trendOf = (n: number) => (n ? { direction: \"positive\" as const, label: `${n}` } : undefined);", 'export const A = () => <Metric label="x" value="1" trend={trendOf(1)} />;'), "<Metric", "Metric");
    ok("metric: a computed trend is guarded with ?.", changedLines(call).some((line) => line.includes("{trendOf(1) ? <MetricTrend trend={trendOf(1)?.direction}>{trendOf(1)?.label}</MetricTrend> : null}")));
    const titled = detachAt("metric title-highlight", page('export const A = () => <Metric variant="title-highlight" size="lg" label="Spend" value="$4,210" action={<Text>›</Text>} />;'), "<Metric", "Metric");
    ok("metric title-highlight: header row with the action, contents gap lg", /<Stack gap="lg" style=\{\{ flex: 1 \}\}>/.test(titled.code) && /textStyle="Heading\/Subheading">Spend/.test(titled.code) && titled.detached.approximations.some((line) => line.startsWith("Title-Highlight")));
  }

  // EmptyState (EmptyState.tsx): defaults, full, no illustration + compact + style merge, inside a ChartCard.
  {
    const min = detachAt("empty minimal", page("export const A = () => (", "  <Stack>", "    <EmptyState title=\"No files\" />", "  </Stack>", ");"), "<EmptyState", "EmptyState");
    check("empty minimal: output", changedLines(min), [
      "    {/* zen-detached: EmptyState · Zen Studio */}",
      "    <Stack",
      '      as="section"',
      '      gap="xs"',
      '      style={{ width: "min(320px, 100%)", marginInline: "auto", paddingBottom: "var(--zen-spacing-padding-4-xlarge)" }}',
      "    >",
      '      <Stack align="center">',
      "        <EmptyStateIllustration />",
      "      </Stack>",
      '      <Stack gap="2xs">',
      '        <Heading level={3} textStyle="Heading/4" align="center">No files</Heading>',
      "      </Stack>",
      "    </Stack>",
    ]);
    check("empty minimal: EmptyStateIllustration replaces EmptyState in its import; Heading joins Text", [importLines(min).find((line) => line.includes("components/EmptyState")), importLines(min).find((line) => line.includes("components/Text"))], ['import { EmptyStateIllustration } from "../../../components/EmptyState";', 'import { Heading, Text } from "../../../components/Text";']);
    const full = detachAt("empty full", page(
      "export const A = ({ add, clear }: { add: () => void; clear: () => void }) => (",
      "  <EmptyState title=\"No expenses yet\" headingLevel={2} icon=\"icon-receipt-line\" aria-live=\"polite\" primaryAction={{ label: \"Add expense\", onClick: add }} secondaryAction={{ label: \"Clear\", onClick: clear, level: \"tertiary\" }}>",
      "    Add a receipt and it is approved by Friday.",
      "  </EmptyState>",
      ");",
    ), "<EmptyState", "EmptyState");
    check("empty full: body and actions", changedLines(full).slice(7, 21), [
      '    <Stack align="center">',
      '      <EmptyStateIllustration icon="icon-receipt-line" />',
      "    </Stack>",
      '    <Stack gap="xl">',
      '      <Stack gap="2xs">',
      '        <Heading level={2} textStyle="Heading/4" align="center">No expenses yet</Heading>',
      '        <Text textStyle="Body/Base/Regular" tone="light" align="center">',
      "          Add a receipt and it is approved by Friday.",
      "        </Text>",
      "      </Stack>",
      '      <Stack gap="sm" align="stretch">',
      '        <Button level="primary" onClick={add}>Add expense</Button>',
      '        <Button level="tertiary" onClick={clear}>Clear</Button>',
      "      </Stack>",
    ]);
    const bare = detachAt("empty bare", page('export const A = () => <EmptyState illustration={false} compactTitle title="Nothing here" style={{ maxWidth: 280 }} />;'), "<EmptyState", "EmptyState");
    ok("empty: compact title, no illustration, style merged after the defaults", /\.\.\.\{ maxWidth: 280 \} \}\}/.test(bare.code) && /textStyle="Body\/Extra\/Bold"/.test(bare.code) && !bare.code.includes("EmptyStateIllustration"));
    const chart = detachAt("empty in chart card", page('export const A = () => <ChartCard title="Spend" headingLevel={2}><EmptyState title="No data" /></ChartCard>;'), "<EmptyState", "EmptyState");
    ok("empty in a ChartCard: one level below the card title, Body/Extra/Bold", /<Heading level=\{3\} textStyle="Body\/Extra\/Bold"/.test(chart.code));
  }

  // DescriptionList (DescriptionList.tsx): inline + emphasis, stacked + divider + action, DescriptionItem children.
  {
    const inline = detachAt("dl inline", page("export const A = ({ total }: { total: string }) => (", "  <DescriptionList aria-label=\"Summary\" items={[", "    { term: \"Subtotal\", description: \"$311.90\" },", "    { term: \"Total\", description: total, emphasis: true },", "  ]} />", ");"), "<DescriptionList", "DescriptionList");
    check("dl inline: output", changedLines(inline), [
      "  /* zen-detached: DescriptionList · Zen Studio */",
      '  <Stack gap="xs" aria-label="Summary">',
      '    <Stack direction="row" align="baseline" gap="md">',
      '      <Text as="div" textStyle="Body/Small/Regular" tone="base" style={{ maxWidth: "50%" }}>Subtotal</Text>',
      '      <Text as="div" textStyle="Body/Base/Medium" align="end" style={{ flex: 1, minWidth: 0 }}>$311.90</Text>',
      "    </Stack>",
      '    <Divider color="high" />',
      '    <Stack direction="row" align="baseline" gap="md">',
      '      <Text as="div" textStyle="Body/Base/Bold" style={{ maxWidth: "50%" }}>Total</Text>',
      '      <Text as="div" textStyle="Body/Base/Bold" align="end" style={{ flex: 1, minWidth: 0 }}>{total}</Text>',
      "    </Stack>",
      "  </Stack>",
    ]);
    const stacked = detachAt("dl stacked", page("export const A = () => (", "  <DescriptionList layout=\"stacked\" divider items={[", "    { id: \"a\", term: \"Email\", description: \"a@b.co\", action: <Text>Copy</Text> },", "    { term: \"Phone\", description: \"+1\" },", "  ]} />", ");"), "<DescriptionList", "DescriptionList");
    check("dl stacked: divider rows, action beside the pair", changedLines(stacked).slice(1, 14), [
      '  <Stack gap="sm">',
      '    <Stack direction="row" align="center" justify="between" gap="md">',
      '      <Stack gap="2xs" style={{ flex: 1, minWidth: 0 }}>',
      '        <Text as="div" textStyle="Body/Small/Regular" tone="base">Email</Text>',
      '        <Text as="div" textStyle="Body/Base/Medium">a@b.co</Text>',
      "      </Stack>",
      "      <Text>Copy</Text>",
      "    </Stack>",
      "    <Divider />",
      '    <Stack gap="2xs">',
      '      <Text as="div" textStyle="Body/Small/Regular" tone="base">Phone</Text>',
      '      <Text as="div" textStyle="Body/Base/Medium">+1</Text>',
      "    </Stack>",
    ]);
    const kids = detachAt("dl children", page("export const A = () => (", "  <DescriptionList>", "    <DescriptionItem term=\"Client\" description=\"Phin & Co\" />", "    <DescriptionItem term=\"Total\" description=\"$9\" emphasis />", "  </DescriptionList>", ");"), "<DescriptionList", "DescriptionList");
    check("dl children: the DescriptionList import goes with its DescriptionItems", importLines(kids).some((line) => line.includes("components/DescriptionList")), false);
    ok("dl children: rows written out", changedLines(kids).includes('      <Text as="div" textStyle="Body/Base/Medium" align="end" style={{ flex: 1, minWidth: 0 }}>Phin & Co</Text>'));
    check("dl: mapped rows refused", reason(page("export const A = ({ rows }: { rows: { term: string; description: string }[] }) => <DescriptionList items={rows} />;"), "<DescriptionList", "DescriptionList"), "Its rows come from {rows}; detach needs the items written out as an array of objects.");
    check("dl: spread rows refused", reason(page("export const A = ({ rows }: { rows: { term: string; description: string }[] }) => <DescriptionList items={[...rows]} />;"), "<DescriptionList", "DescriptionList"), "Its items array builds rows from a spread (...rows); detach handles object literals, c ? {…} : {…}, ...(c ? [{…}] : []) and ...xs.map((x) => ({…})).");
    check("dl: a .map callback with a body refused", reason(page("export const A = ({ rows }: { rows: { t: string }[] }) => <DescriptionList items={rows.map((row) => { const term = row.t; return { term, description: term }; })} />;"), "<DescriptionList", "DescriptionList"), "Its rows come from a .map whose callback does more than return an object literal (rows.map((row) => { const term = row.t; return …).");
    // Conditional and mapped rows (…(c ? [{…}] : []), c ? {…} : {…}, …xs.map(…)), dividers between rendered rows only.
    const dynamic = detachAt("dl dynamic", page(
      "export const A = ({ lines, discount, paid }: { lines: { id: string; name: string; amount: string }[]; discount: boolean; paid: boolean }) => (",
      "  <DescriptionList divider items={[",
      "    ...lines.map((line) => ({ id: line.id, term: line.name, description: line.amount })),",
      "    ...(discount ? [{ term: \"Discount\", description: \"−$4\" }] : []),",
      "    paid ? { term: \"Paid\", description: \"$9\", emphasis: true } : { term: \"Due\", description: \"$9\", emphasis: true },",
      "  ]} />",
      ");",
    ), "<DescriptionList", "DescriptionList");
    check("dl dynamic: output", changedLines(dynamic), [
      "  /* zen-detached: DescriptionList · Zen Studio */",
      '  <Stack gap="sm">',
      "    {lines.map((line, zenRow) => (",
      '      <Stack key={line.id} gap="sm">',
      "        {zenRow > 0 ? <Divider /> : null}",
      '        <Stack direction="row" align="baseline" gap="md">',
      '          <Text as="div" textStyle="Body/Small/Regular" tone="base" style={{ maxWidth: "50%" }}>{line.name}</Text>',
      '          <Text as="div" textStyle="Body/Base/Medium" align="end" style={{ flex: 1, minWidth: 0 }}>{line.amount}</Text>',
      "        </Stack>",
      "      </Stack>",
      "    ))}",
      "    {discount ? (",
      "      <>",
      "        <Divider />",
      '        <Stack direction="row" align="baseline" gap="md">',
      '          <Text as="div" textStyle="Body/Small/Regular" tone="base" style={{ maxWidth: "50%" }}>Discount</Text>',
      '          <Text as="div" textStyle="Body/Base/Medium" align="end" style={{ flex: 1, minWidth: 0 }}>−$4</Text>',
      "        </Stack>",
      "      </>",
      "    ) : null}",
      "    {paid ? (",
      "      <>",
      '        <Divider color="high" />',
      '        <Stack direction="row" align="baseline" gap="md">',
      '          <Text as="div" textStyle="Body/Base/Bold" style={{ maxWidth: "50%" }}>Paid</Text>',
      '          <Text as="div" textStyle="Body/Base/Bold" align="end" style={{ flex: 1, minWidth: 0 }}>$9</Text>',
      "        </Stack>",
      "      </>",
      "    ) : (",
      "      <>",
      '        <Divider color="high" />',
      '        <Stack direction="row" align="baseline" gap="md">',
      '          <Text as="div" textStyle="Body/Base/Bold" style={{ maxWidth: "50%" }}>Due</Text>',
      '          <Text as="div" textStyle="Body/Base/Bold" align="end" style={{ flex: 1, minWidth: 0 }}>$9</Text>',
      "        </Stack>",
      "      </>",
      "    )}",
      "  </Stack>",
    ]);
    ok("dl dynamic: a hidden-rows rule is flagged", dynamic.detached.approximations.some((line) => line.startsWith("A rule shows above the first row")));
    const keyed = detachAt("dl mapped without id", page("export const A = ({ rows }: { rows: string[] }) => <DescriptionList items={rows.map((row) => ({ term: row, description: row.length }))} />;"), "<DescriptionList", "DescriptionList");
    ok("dl: mapped rows without an id are keyed by an added index", /rows\.map\(\(row, zenRow\) => \(\n\s+<Stack key=\{zenRow\}/.test(keyed.code));
  }

  // InlineMessage (InlineMessage.tsx): minimal, warning + action + className, custom visual, status alias + no icon.
  {
    const min = detachAt("inline message minimal", page('export const A = () => <InlineMessage title="Saved" />;'), "<InlineMessage", "InlineMessage");
    check("inline message minimal: output", changedLines(min), [
      'export const A = () => /* zen-detached: InlineMessage · Zen Studio */ <Box surface="subtle" radius="lg" padding="md" role="status">',
      '  <Stack direction="row" gap="sm" align="start">',
      '    <Icon name="icon-info-circle-solid" decorative />',
      '    <Stack gap="3xs">',
      '      <Text as="span" textStyle="Body/Base/Bold">Saved</Text>',
      "    </Stack>",
      "  </Stack>",
      "</Box>;",
    ]);
    const full = detachAt("inline message full", page("export const A = ({ undo }: { undo: () => void }) => (", "  <InlineMessage theme=\"warning\" title=\"Phin & Co has this invoice\" action={{ label: \"Undo\", onClick: undo }} className=\"m\">", "    Saving emails them the copy.", "  </InlineMessage>", ");"), "<InlineMessage", "InlineMessage");
    ok("inline message warning: alert role, tones, tertiary sm action", /role="alert" className="m"/.test(full.code) && /tone="warning">Phin & Co has this invoice/.test(full.code) && /<Button level="tertiary" size="sm" onClick=\{undo\}>Undo<\/Button>/.test(full.code));
    ok("inline message warning: the fill approximation is listed", full.detached.approximations[0].startsWith("Theme warning: the Warning/Subtle fill becomes Box surface subtle"));
    const custom = detachAt("inline message custom", page('export const A = () => <InlineMessage theme="custom" icon={<DockIcon icon="icon-home-02-solid" />} title="x" />;'), "<InlineMessage", "InlineMessage");
    ok("inline message custom: the visual as is", changedLines(custom).includes('    <DockIcon icon="icon-home-02-solid" />'));
    const plain = detachAt("inline message no icon", page('export const A = () => <InlineMessage status="success" icon={false}>Done</InlineMessage>;'), "<InlineMessage", "InlineMessage");
    ok("inline message: status alias → positive caption, icon={false} → none", /tone="positive">Done<\/Text>/.test(plain.code) && !/<Icon /.test(plain.code));
  }

  // Badge and Tag (Badge.tsx, Tag.tsx).
  {
    const min = detachAt("badge minimal", page("export const A = () => (", "  <Stack direction=\"row\">", "    <Badge>New</Badge>", "  </Stack>", ");"), "<Badge", "Badge");
    check("badge minimal: output", changedLines(min), [
      "    {/* zen-detached: Badge · Zen Studio */}",
      "    <Box",
      '      surface="subtle"',
      '      radius="full"',
      '      paddingX="xs"',
      '      paddingY="2xs"',
      '      style={{ width: "max-content", maxWidth: "100%" }}',
      "    >",
      '      <Stack direction="row" align="center" gap="2xs">',
      '        <Icon name="icon-circle-small-solid" size="sm" decorative />',
      '        <Text as="span" textStyle="Body/Base/Medium" truncate>New</Text>',
      "      </Stack>",
      "    </Box>",
    ]);
    const full = detachAt("badge full", page('export const A = () => <Badge size="sm" theme="green" background="subtle" leading="icon-check-line" aria-label="Paid">Paid</Badge>;'), "<Badge", "Badge");
    ok("badge sm green: paddings, icon xs, positive tone, aria kept", /paddingX="2xs"/.test(full.code) && /paddingY="3xs"/.test(full.code) && /<Icon name="icon-check-line" size="xs" decorative \/>/.test(full.code) && /tone="positive" truncate>Paid/.test(full.code) && /aria-label="Paid"/.test(full.code));
    const xs = detachAt("badge xs", page('export const A = () => <Badge size="xs" theme="neutral" background="subtle" leadingIcon={false}>3</Badge>;'), "<Badge", "Badge");
    ok("badge xs: Caption/Medium, no leading", /textStyle="Caption\/Medium" truncate>3/.test(xs.code) && !/<Icon /.test(xs.code) && !xs.detached.approximations.some((line) => line.startsWith("Badge neutral")));
    const tag = detachAt("tag minimal", page('export const A = () => <Tag>Design</Tag>;'), "<Tag", "Tag");
    ok("tag: static box, the Ghost fill as Surface, pale border, label", /<Box\n  surface="surface"\n  border="pale"\n  radius="full"/.test(tag.code) && /textStyle="Body\/Base\/Medium" truncate>Design/.test(tag.code));
    const photo = detachAt("tag photo", page('export const A = ({ src }: { src: string }) => <Tag photoSrc={src} disabled>Alex</Tag>;'), "<Tag", "Tag");
    ok("tag photo + disabled: Avatar 2xsmall, disabled tone", /<Avatar size="2xsmall" theme="photo" background="subtle" src=\{src\} alt="" \/>/.test(photo.code) && /tone="disabled"/.test(photo.code) && importLines(photo).includes('import { Avatar } from "../../../components/Avatar";'));
    // A builder page (*.zen.tsx, GĐ4 M4) takes no style: the Badge's max-content pill hugs through width="hug", the
    // primitives join the package import; a recipe whose layout needs a style is refused there, saying so.
    const builderPage = (element) => ['// @zen-page {"format":1,"title":"T"}', 'import { Board, Screen } from "@zen/design-system/builder";', `import { ${element.slice(1, element.search(/[\s>]/))}, Stack } from "@zen/design-system";`, "", "export default function Page() {", "  return (", "    <Board>", '      <Screen id="s" title="T" device="phone">', '        <Stack gap="md">', `          ${element}`, "        </Stack>", "      </Screen>", "    </Board>", "  );", "}", ""].join("\n");
    const onPage = builderPage("<Badge>New</Badge>");
    const pageBadge = applyOps(onPage, locOf(onPage, "<Badge"), "Badge", [{ op: "detach" }], { file: "local:p1.zen.tsx", typographyKeys });
    ok("badge on a builder page: width=\"hug\", no style", !("error" in pageBadge) && !/style=/.test(pageBadge.code) && /<Box surface="subtle" radius="full" paddingX="xs" paddingY="2xs" width="hug">/.test(pageBadge.code));
    check("badge on a builder page: primitives from the package", importLines(pageBadge).at(-1), 'import { Box, Icon, Stack, Text } from "@zen/design-system";');
    const emptyOnPage = builderPage('<EmptyState title="Nothing here" />');
    ok("empty state on a builder page: refused with the style it needs", /^EmptyState cannot be detached on a builder page yet: its layout needs an inline style/.test(detachPlan(emptyOnPage, locOf(emptyOnPage, "<EmptyState"), "EmptyState", { file: "local:p1.zen.tsx" }).reason ?? ""));
  }

  // Interactive instances and non-presentational components are refused with a reason.
  {
    const refused = (label, body, needle, name, expected) => check(`refuse: ${label}`, reason(page(body), needle, name), expected);
    refused("clickable card", "export const A = () => <Card onClick={() => {}}>x</Card>;", "<Card", "Card", "This Card is interactive (onClick={…}): a clickable or selectable card. Only presentational instances detach.");
    refused("selected card", "export const A = ({ on }: { on: boolean }) => <Card selected={on}>x</Card>;", "<Card", "Card", "This Card is interactive (selected={…}): a clickable or selectable card. Only presentational instances detach.");
    refused("deprecated active card", "export const A = () => <Card active>x</Card>;", "<Card", "Card", "This Card is interactive (active): a clickable or selectable card. Only presentational instances detach.");
    check("refuse: selected={false} is presentational", reason(page("export const A = () => <Card selected={false}>x</Card>;"), "<Card", "Card"), null);
    refused("clickable row", "export const A = () => <List><ListItem title=\"x\" onClick={() => {}} /></List>;", "<ListItem", "ListItem", "This ListItem is interactive (onClick={…}): a clickable or selected row. Only presentational instances detach.");
    refused("link row", "export const A = () => <List><ListItem title=\"x\" href=\"/a\" /></List>;", "<ListItem", "ListItem", "This ListItem is interactive (href={…}): a clickable or selected row. Only presentational instances detach.");
    refused("selected row", "export const A = () => <List><ListItem title=\"x\" selected /></List>;", "<ListItem", "ListItem", "This ListItem is interactive (selected): a clickable or selected row. Only presentational instances detach.");
    refused("removable badge", "export const A = () => <Badge remove onRemove={() => {}}>x</Badge>;", "<Badge", "Badge", "This Badge is interactive (remove): a removable badge. Only presentational instances detach.");
    refused("removable tag", "export const A = () => <Tag onRemove={() => {}}>x</Tag>;", "<Tag", "Tag", "This Tag is interactive (onRemove={…}): a removable or clickable tag. Only presentational instances detach.");
    refused("clickable tag", "export const A = () => <Tag onClick={() => {}}>x</Tag>;", "<Tag", "Tag", "This Tag is interactive (onClick={…}): a removable or clickable tag. Only presentational instances detach.");
    refused("dismissible message", "export const A = () => <InlineMessage title=\"x\" onClose={() => {}} />;", "<InlineMessage", "InlineMessage", "This InlineMessage is interactive (onClose={…}): a dismissible message. Only presentational instances detach.");
    refused("Button", "export const A = () => <Button>x</Button>;", "<Button", "Button", "<Button> is interactive; only presentational components detach (Card, ListItem, MetricCard, Metric, EmptyState, DescriptionList, InlineMessage, Badge, Tag).");
    refused("Table", "export const A = () => <Table rows={[]} columns={[]} />;", "<Table", "Table", "<Table> is interactive; only presentational components detach (Card, ListItem, MetricCard, Metric, EmptyState, DescriptionList, InlineMessage, Badge, Tag).");
    refused("Dialog", "export const A = () => <Dialog open title=\"x\" />;", "<Dialog", "Dialog", "<Dialog> is interactive; only presentational components detach (Card, ListItem, MetricCard, Metric, EmptyState, DescriptionList, InlineMessage, Badge, Tag).");
    refused("InputField", "export const A = () => <InputField label=\"x\" />;", "<InputField", "InputField", "<InputField> is interactive; only presentational components detach (Card, ListItem, MetricCard, Metric, EmptyState, DescriptionList, InlineMessage, Badge, Tag).");
    refused("a primitive", "export const A = () => <Stack />;", "<Stack", "Stack", "<Stack> is a layout primitive already.");
    refused("host markup", "export const A = () => <div />;", "<div", "div", "<div> is plain markup already; only Zen components detach.");
    refused("spread props", "export const A = (p: object) => <Card {...p}>x</Card>;", "<Card", "Card", "It spreads {...p}: detach needs every prop written out.");
    refused("bound theme", "export const A = ({ t }: { t: \"flat\" }) => <Card theme={t}>x</Card>;", "<Card", "Card", "Its theme comes from {t}; set a fixed theme before detaching.");
    refused("bound badge theme", "export const A = ({ s }: { s: { theme: \"green\" } }) => <Badge theme={s.theme}>x</Badge>;", "<Badge", "Badge", "Its theme comes from {s.theme}; set a fixed theme before detaching.");
    check("refuse: wrong name is stale", reason(page("export const A = () => <Card>x</Card>;"), "<Card", "Badge"), "Expected <Badge> at 14:23, found <Card>.");
    const editRefusal = applyOps(page("export const A = () => <Card onClick={() => {}}>x</Card>;"), "14:23", "Card", [{ op: "detach" }], { file: PAGE });
    check("refuse: the edit fails the same way", [editRefusal.code, editRefusal.error], ["invalid", "This Card is interactive (onClick={…}): a clickable or selectable card. Only presentational instances detach."]);
    check("refuse: detach alone", applyOps(page("export const A = () => <Card>x</Card>;"), "14:23", "Card", [{ op: "detach" }, { op: "removeProp", name: "theme" }], { file: PAGE }).error, "detach cannot be combined with other ops");
    check("refuse: bad instance", applyOps(page("export const A = () => <Card>x</Card>;"), "14:23", "Card", [{ op: "detach", instance: -1 }], { file: PAGE }).error, "detach `instance` must be a row index (0 or more)");
    const chrome = "// zen-studio-chrome\nexport function Chrome() { return <Card>x</Card>; }\n";
    check("refuse: docs chrome", detachPlan(chrome, locOf(chrome, "<Card"), "Card").reason, "<Card> is docs chrome (zen-studio-chrome).");
  }

  // .map rows: only the selected row detaches, as `index === K ? (detached) : (original)`.
  {
    const head = 'import { Badge } from "../../../components/Badge";';
    const mapped = (label, body, expectedHead, { instance = 1, needle = "<Badge" } = {}) => {
      const src = `${head}\n${body}\n`;
      const plan = detachPlan(src, locOf(src, needle), "Badge", { file: PAGE });
      check(`map ${label}: plan says repeated`, [plan.ok, plan.repeated], [true, true]);
      const result = detachAt(`map ${label}`, src, needle, "Badge", { instance });
      if ("error" in result) { failures.push(`map ${label}: ${result.error}`); return null; }
      const lines = result.code.split("\n");
      const at = lines.findIndex((line) => line.includes(" === "));
      check(`map ${label}: head`, lines[at], expectedHead);
      check(`map ${label}: the original row stays in the else branch`, /\) : \(\r?\n\s*(?:<ListItem[^\n]*)?<Badge/.test(result.code.slice(result.code.indexOf(" === "))), true);
      ok(`map ${label}: Badge import kept`, importLines(result).some((line) => line.includes("components/Badge")));
      return result;
    };
    const arrow = mapped("arrow body", "export const A = (rows: { id: string; label: string }[]) => rows.map((row) => <Badge key={row.id}>{row.label}</Badge>);", "export const A = (rows: { id: string; label: string }[]) => rows.map((row, zenIndex) => (zenIndex as number) === 1 ? (");
    if (arrow) {
      check("map arrow body: whole rewrite", arrow.code.split("\n").slice(5), [
        "  /* zen-detached: Badge · Zen Studio */",
        "  <Box",
        "    key={row.id}",
        '    surface="subtle"',
        '    radius="full"',
        '    paddingX="xs"',
        '    paddingY="2xs"',
        '    style={{ width: "max-content", maxWidth: "100%" }}',
        "  >",
        '    <Stack direction="row" align="center" gap="2xs">',
        '      <Icon name="icon-circle-small-solid" size="sm" decorative />',
        '      <Text as="span" textStyle="Body/Base/Medium" truncate>{row.label}</Text>',
        "    </Stack>",
        "  </Box>",
        ") : (",
        "  <Badge key={row.id}>{row.label}</Badge>",
        "));",
        "",
      ]);
      check("map: detached.loc is the detached branch's root", arrow.detached.loc, "7:2");
    }
    mapped("block body", "export const A = (rows: { id: string }[]) => rows.map((row) => {\n  const label = row.id.toUpperCase();\n  return <Badge key={row.id}>{label}</Badge>;\n});", "  return (zenIndex as number) === 1 ? (");
    mapped("JSX child", "export const A = (rows: { id: string }[]) => (\n  <ul>\n    {rows.map((row) => (\n      <li key={row.id}>\n        <Badge>{row.id}</Badge>\n      </li>\n    ))}\n  </ul>\n);", "        {(zenIndex as number) === 1 ? (");
    mapped("attribute value", "export const A = (rows: { id: string }[]) => rows.map((row) => <ListItem key={row.id} title={row.id} trailing={<Badge>{row.id}</Badge>} />);", "export const A = (rows: { id: string }[]) => rows.map((row, zenIndex) => <ListItem key={row.id} title={row.id} trailing={(zenIndex as number) === 1 ? (");
    mapped("existing index", "export const A = (rows: string[]) => rows.map((row, i) => <Badge key={i}>{row}</Badge>);", "export const A = (rows: string[]) => rows.map((row, i) => (i as number) === 1 ? (");
    mapped("destructured", "export const A = (rows: { id: string; label: string }[]) => rows.map(({ id, label }) => <Badge key={id}>{label}</Badge>);", "export const A = (rows: { id: string; label: string }[]) => rows.map(({ id, label }, zenIndex) => (zenIndex as number) === 1 ? (");
    mapped("typed param", "type Row = { id: string };\nexport const A = (rows: Row[]) => rows.map((row: Row) => <Badge key={row.id}>{row.id}</Badge>);", "export const A = (rows: Row[]) => rows.map((row: Row, zenIndex) => (zenIndex as number) === 1 ? (");
    mapped("bare param", "export const A = (rows: string[]) => rows.map(row => <Badge key={row}>{row}</Badge>);", "export const A = (rows: string[]) => rows.map((row, zenIndex) => (zenIndex as number) === 1 ? (");
    mapped("no params", "export const A = (rows: string[]) => rows.map(() => <Badge>x</Badge>);", "export const A = (rows: string[]) => rows.map((_zenItem, zenIndex) => (zenIndex as number) === 1 ? (");
    mapped("function expression", "export const A = (rows: string[]) => rows.map(function (row) { return <Badge key={row}>{row}</Badge>; });", "export const A = (rows: string[]) => rows.map(function (row, zenIndex) { return (zenIndex as number) === 1 ? (");
    mapped("filter().map()", "export const A = (rows: { on: boolean; id: string }[]) => rows.filter((row) => row.on).map((row) => <Badge key={row.id}>{row.id}</Badge>);", "export const A = (rows: { on: boolean; id: string }[]) => rows.filter((row) => row.on).map((row, zenIndex) => (zenIndex as number) === 1 ? (");
    mapped("optional call", "export const A = (rows?: string[]) => rows?.map((row) => <Badge key={row}>{row}</Badge>);", "export const A = (rows?: string[]) => rows?.map((row, zenIndex) => (zenIndex as number) === 1 ? (");
    mapped("name taken", "export const A = (rows: string[], zenIndex: number) => rows.map((row) => <Badge key={row}>{row}{zenIndex}</Badge>);", "export const A = (rows: string[], zenIndex: number) => rows.map((row, zenIndex2) => (zenIndex2 as number) === 1 ? (", { instance: 1 });
    const refusedMap = (label, body, expected) => check(`map refuse: ${label}`, reason(`${head}\n${body}\n`, "<Badge", "Badge"), expected);
    refusedMap("nested maps", "export const A = (groups: string[][]) => groups.map((rows) => rows.map((row) => <Badge key={row}>{row}</Badge>));", "It is inside nested .map callbacks; detach supports one level of .map.");
    refusedMap("conditional row", "export const A = (rows: { on: boolean; id: string }[]) => rows.map((row) => (row.on ? <Badge key={row.id}>x</Badge> : null));", "It renders only for some rows (inside a condition (? :)), so its position does not match the row index.");
    refusedMap("&& row", "export const A = (rows: { on: boolean; id: string }[]) => rows.map((row) => <li key={row.id}>{row.on && <Badge>x</Badge>}</li>);", "It renders only for some rows (inside a condition (&& / ||)), so its position does not match the row index.");
    refusedMap("early return", "export const A = (rows: string[]) => rows.map((row) => { if (!row) return null; return <Badge key={row}>{row}</Badge>; });", "The .map callback returns from more than one place, so some rows may not render it.");
    refusedMap("nested function", "export const A = (rows: string[]) => rows.map((row) => <Popover key={row} render={() => <Badge>{row}</Badge>} />);", "It renders inside a function nested in a .map callback, so which row it belongs to is unknown.");
    refusedMap("rest params", "export const A = (rows: string[]) => rows.map((...args) => <Badge key={String(args[1])}>x</Badge>);", "The .map callback takes ...rest parameters; name its index parameter first.");
    const noRowSource = `${head}\nexport const A = (rows: string[]) => rows.map((row) => <Badge key={row}>{row}</Badge>);\n`;
    const noRow = applyOps(noRowSource, locOf(noRowSource, "<Badge"), "Badge", [{ op: "detach" }], { file: PAGE });
    check("map: the edit needs instance", noRow.error, "This element renders once per row of a .map callback: pass `instance` (the row to detach, 0-based).");
    const notMap = applyOps(`${head}\nconst row = (label: string) => <Badge>{label}</Badge>;\nexport const A = (rows: string[]) => rows.map(row);\n`, "2:31", "Badge", [{ op: "detach", instance: 2 }], { file: PAGE });
    check("map: several instances outside a .map callback are refused", notMap.error, "It renders several times but not inside a .map callback, so one instance cannot be detached alone (detach would change every instance).");
    check("map: the plan refuses them with instances=N", detachPlan(`${head}\nconst row = (label: string) => <Badge>{label}</Badge>;\n`, "2:31", "Badge", { file: PAGE, instances: 3 }).reason, "It renders 3 times but not inside a .map callback, so one instance cannot be detached alone (detach would change every instance).");
    check("map: a single instance with instances=1 is fine", detachPlan(`${head}\nconst row = (label: string) => <Badge>{label}</Badge>;\n`, "2:31", "Badge", { file: PAGE, instances: 1 }).ok, true);
  }

  // Review fixes (2026-10-03). F1: a .map row above 0 keeps its own index comparisons valid TypeScript (the detached
  // branch's test is `(index as number) === K`, which never narrows the index); the tsc check runs on these drafts below.
  const tscSamples = [];
  {
    const rowSource = [
      'import { List, ListItem } from "../../../components/ListItem";',
      "export const A = ({ rows }: { rows: string[] }) => (",
      "  <List>",
      "    {rows.map((row, index) => (",
      '      <ListItem key={row} title={row} data-first={index === 0} caption={index === rows.length - 1 ? "Last" : undefined} />',
      "    ))}",
      "  </List>",
      ");",
      "",
    ].join("\n");
    for (const instance of [1, 3]) {
      const result = detachAt(`index cast row ${instance}`, rowSource, "<ListItem", "ListItem", { instance });
      ok(`index cast row ${instance}: (index as number) === ${instance}`, result.code.includes(`\n      (index as number) === ${instance} ? (\n`));
      ok(`index cast row ${instance}: the row's own comparison stays in both branches`, result.code.split("data-first={index === 0}").length === 3);
      tscSamples.push({ label: `index cast row ${instance}`, code: result.code });
    }
    // The control: the bare comparison the cast replaces is what TypeScript rejects (TS2367).
    const control = detachAt("index cast control", rowSource, "<ListItem", "ListItem", { instance: 1 }).code.replace("(index as number) === 1", "index === 1");
    tscSamples.push({ label: "control: a bare index === 1", code: control, expect: ["TS2367"] });

    // F2 support: the plan names the element the .map callback returns (the row's list = its rendered siblings), and
    // refuses a .map that runs in several places (`lists`, counted by the client).
    const loc = locOf(rowSource, "<ListItem");
    check("plan: mapRow is the element the callback returns", detachPlan(rowSource, loc, "ListItem", { file: PAGE }).mapRow, { loc: "5:6", name: "ListItem" });
    const liSource = 'import { Badge } from "../../../components/Badge";\nexport const A = (rows: string[]) => (\n  <ul>\n    {rows.map((row) => {\n      return (\n        <li key={row}>\n          <Badge>{row}</Badge>\n        </li>\n      );\n    })}\n  </ul>\n);\n';
    check("plan: mapRow of a block body is the returned element", detachPlan(liSource, locOf(liSource, "<Badge"), "Badge", { file: PAGE }).mapRow, { loc: "6:8", name: "li" });
    const fragmentSource = 'import { Badge } from "../../../components/Badge";\nexport const A = (rows: string[]) => rows.map((row) => <><Badge>{row}</Badge></>);\n';
    check("plan: a fragment row has no mapRow (no data-zen-src)", detachPlan(fragmentSource, locOf(fragmentSource, "<Badge"), "Badge", { file: PAGE }).mapRow, null);
    check("plan: no mapRow outside a .map", "mapRow" in detachPlan(page('export const A = () => <Tag>x</Tag>;'), locOf(page('export const A = () => <Tag>x</Tag>;'), "<Tag"), "Tag", { file: PAGE }), false);
    check("plan: a .map that runs in several places is refused", detachPlan(rowSource, loc, "ListItem", { file: PAGE, lists: 3 }).reason, "This list repeats in 3 places; detaching a row would change each of them.");
    check("plan: one list is fine", detachPlan(rowSource, loc, "ListItem", { file: PAGE, lists: 1, instances: 4 }).ok, true);
  }

  // F4: DescriptionList terms and values are Text as="div" (block values such as a Stack are valid inside); F10: rows no
  // longer share the action column; divider lists keep the recipe gap (their measured gap reads 0) and skip the gap slot.
  {
    const blockValue = detachAt("dl block value", page(
      "export const A = () => (",
      "  <DescriptionList items={[",
      '    { term: "Notes", description: <Stack gap="xs"><Text>Bring the badge</Text></Stack> },',
      '    { term: "Owner", description: "Alex", action: <Text as="span">Edit</Text> },',
      "  ]} />",
      ");",
    ), "<DescriptionList", "DescriptionList");
    const texts = changedLines(blockValue).filter((line) => /<Text (as="div" )?textStyle/.test(line));
    ok("dl block value: every term and value is a div", texts.length === 4 && texts.every((line) => line.includes('<Text as="div"')));
    ok("dl block value: the Stack sits in a div value", /<Text as="div" textStyle="Body\/Base\/Medium" align="end" style=\{\{ flex: 1, minWidth: 0 \}\}>\n\s*<Stack gap="xs">/.test(blockValue.code));
    ok("dl: the lost action column is flagged", blockValue.detached.approximations.some((line) => line.startsWith("Rows no longer share the action column")));
    tscSamples.push({ label: "dl block value", code: blockValue.code });
    const dividerSource = page('export const A = () => <DescriptionList divider items={[{ term: "a", description: "1" }, { term: "b", description: "2" }]} />;');
    check("dl divider: the plan skips the gap slot", detachPlan(dividerSource, locOf(dividerSource, "<DescriptionList"), "DescriptionList", { file: PAGE }).slots.map((slot) => slot.key), ["termStyle", "descriptionStyle"]);
    const divided = detachAt("dl divider measured", dividerSource, "<DescriptionList", "DescriptionList", { measured: { gap: "none" } });
    ok("dl divider: a measured gap of 0 is ignored", /<Stack gap="sm">/.test(divided.code));
    // F11: an always-rendered row ends "the rows before may be hidden" (no spurious rule approximation).
    const reset = detachAt("dl literal row first", page(
      "export const A = ({ rows, tip }: { rows: string[]; tip: boolean }) => (",
      "  <DescriptionList divider items={[",
      '    { term: "Subtotal", description: "$9" },',
      "    ...rows.map((row) => ({ term: row, description: row })),",
      '    ...(tip ? [{ term: "Tip", description: "$1" }] : []),',
      "  ]} />",
      ");",
    ), "<DescriptionList", "DescriptionList");
    ok("dl: no hidden-rows rule after an always-rendered row", !reset.detached.approximations.some((line) => line.startsWith("A rule shows above the first row")));
    tscSamples.push({ label: "dl literal row first", code: reset.code });
  }

  // F5: CSS keyed on the component's classes is listed (the dev server passes the repo's rules as componentCss).
  {
    const css = cssRules([
      "/* .zen-card { in a comment */",
      ".zen-card.pe-list-card {",
      "  padding: 4px 0;",
      "}",
      "@media (max-width: 600px) {",
      "  .pe-filter-panel > .zen-card__content,",
      "  .other .zen-card { gap: 0; }",
      "}",
      '.pe-list-card .zen-list-item__title { content: "{"; }',
      ".pe-x { color: red; }",
      ".zen-list:not(:is(.pe-list-card, .zen-card)) { margin: 0; }",
    ].join("\n"), "src/x.css");
    check("css rules: selectors naming a .zen- class, with their lines", css, [
      { file: "src/x.css", line: 2, selector: ".zen-card.pe-list-card" },
      { file: "src/x.css", line: 6, selector: ".pe-filter-panel > .zen-card__content, .other .zen-card" },
      { file: "src/x.css", line: 9, selector: ".pe-list-card .zen-list-item__title" },
      { file: "src/x.css", line: 11, selector: ".zen-list:not(:is(.pe-list-card, .zen-card))" },
    ]);
    const card = detachAt("css keyed card", page('export const A = ({ on }: { on: boolean }) => <Card className={`pe-list-card ${on ? "pe-on" : ""} pe-filter-panel`}>x</Card>;'), "<Card", "Card", {}, { componentCss: css });
    check("css keyed card: the compound and the part rule are listed", card.detached.approximations.filter((line) => line.startsWith("CSS keyed")), [
      "CSS keyed on the Card class stops applying: .zen-card.pe-list-card (src/x.css:2).",
      "CSS keyed on the Card class stops applying: .pe-filter-panel > .zen-card__content, .other .zen-card (src/x.css:6).".replace(", .other .zen-card", ""),
    ]);
    const row = detachAt("css keyed row", page('export const A = () => <List><ListItem className="pe-list-card" title="x" /></List>;'), "<ListItem", "ListItem", {}, { componentCss: css });
    check("css keyed row: only the ListItem's own part rule", row.detached.approximations.filter((line) => line.startsWith("CSS keyed")), ["CSS keyed on the ListItem class stops applying: .pe-list-card .zen-list-item__title (src/x.css:9)."]);
    // The rendered padding of such a card may differ per axis (padding: 4px 0): measured paddingX/paddingY are kept apart.
    const axes = detachAt("card padding per axis", page('export const A = () => <Card className="pe-list-card" spacing="small">x</Card>;'), "<Card", "Card", { measured: { padding: "3xs", paddingX: "none", paddingY: "3xsmall" } });
    ok("card padding per axis: paddingX and paddingY when they differ", /<Box surface="surface" radius="lg" paddingX="none" paddingY="3xs" className="pe-list-card">/.test(axes.code));
    const same = detachAt("card padding same axes", page('export const A = () => <Card spacing="small">x</Card>;'), "<Card", "Card", { measured: { padding: "lg", paddingX: "md", paddingY: "md" } });
    ok("card padding: equal axes are one padding", /<Box surface="surface" radius="lg" padding="md">/.test(same.code));
    const message = detachAt("message padding per axis", page('export const A = () => <InlineMessage title="x" />;'), "<InlineMessage", "InlineMessage", { measured: { paddingX: "lg", paddingY: "sm" } });
    ok("inline message padding per axis", /radius="lg" paddingX="lg" paddingY="sm" role="status"/.test(message.code));
    const plain = detachAt("css unrelated", page('export const A = () => <Card className="pe-x">x</Card>;'), "<Card", "Card", {}, { componentCss: css });
    check("css: a class no rule pairs with the component adds nothing", plain.detached.approximations.filter((line) => line.startsWith("CSS keyed")), []);
  }

  // F11: guards, comments, off handlers, phrasing parents; F9: the Tag keeps its fill (Surface = Neutral/Ghost).
  {
    const guard = (label, attrs, expected) => {
      const result = detachAt(`guard ${label}`, page(`export const A = ({ on, other, count, label }: { on: boolean; other: boolean; count: number; label: string }) => <List><ListItem title="x" ${attrs} /></List>;`), "<ListItem", "ListItem");
      check(`guard ${label}`, result.code.split("\n").find((line) => line.includes(" ? ") && line.includes("<Text"))?.trim().replace(/ \? .*/, ""), expected);
      tscSamples.push({ label: `guard ${label}`, code: result.code });
    };
    guard("a value that may be 0", "caption={on ? count : null}", "{on && count");
    guard("a logical test", "caption={on || other ? label : undefined}", "{(on || other) && label");
    guard("the alternate shown", "caption={on ? null : label}", "{!(on) && label");
    guard("a string stays unguarded", 'caption={on ? "Due" : null}', "{on");
    const chained = detachAt("guard a nested ternary", page(`export const A = ({ on, other }: { on: boolean; other: boolean }) => <List><ListItem title="x" caption={on ? "Top" : other ? "Bottom" : undefined} /></List>;`), "<ListItem", "ListItem");
    ok("guard: a nested ternary test is parenthesised", chained.code.includes('{(on ? "Top" : other ? "Bottom" : undefined) ? '));
    tscSamples.push({ label: "guard a nested ternary", code: chained.code });
    const commented = detachAt("opening-tag comments", page(
      "export const A = () => (",
      "  <Card",
      "    // keeps the stage height",
      "    style={{ minHeight: 0 }}",
      "    /* flat on purpose */",
      '    theme="flat"',
      "    // last",
      "  >",
      "    x",
      "  </Card>",
      ");",
    ), "<Card", "Card");
    check("comments: carried into the root's props", changedLines(commented).slice(1, 10), [
      "  <Box",
      "    /* flat on purpose */",
      "    // last",
      '    surface="surface"',
      '    radius="2xl"',
      '    padding="xl"',
      "    // keeps the stage height",
      "    style={{ minHeight: 0 }}",
      "  >",
    ]);
    const itemComment = detachAt("comment in a rebuilt value", page(
      "export const A = () => (",
      "  <DescriptionList layout=\"stacked\" items={[",
      "    // An address reads as a postal block.",
      "    { term: \"Ship to\", description: <Stack gap=\"none\"><span>1 Main St</span></Stack> },",
      "  ]} />",
      ");",
    ), "<DescriptionList", "DescriptionList");
    check("comments: one inside a rebuilt value leads the root", changedLines(itemComment).slice(1, 4), ["  <Stack", "    // An address reads as a postal block.", '    gap="md"']);
    ok("comments: the block value sits in a div Text", /<Text as="div" textStyle="Body\/Base\/Medium">\n\s*<Stack gap="none">/.test(itemComment.code));
    const offCard = detachAt("onClick={undefined}", page("export const A = () => <Card onClick={undefined}>x</Card>;"), "<Card", "Card");
    ok("off handlers: onClick={undefined} detaches and is not kept", !offCard.code.includes("onClick"));
    ok("off handlers: onClick={null} on a Tag detaches", !("error" in detachAt("onClick={null}", page("export const A = () => <Tag onClick={null}>x</Tag>;"), "<Tag", "Tag")));
    check("phrasing: a Badge in a <Text> paragraph is refused", reason(page("export const A = () => <Text>Status <Badge>New</Badge></Text>;"), "<Badge", "Badge"), 'It sits inside a paragraph (<Text>): the detached Badge is a <div> Box, which a <p> cannot hold. Give the text as="div" or move the badge out of it before detaching.');
    check("phrasing: a Tag in a <p> is refused", reason(page("export const A = () => <p>Hi <Tag>x</Tag></p>;"), "<Tag", "Tag"), 'It sits inside a paragraph (<p>): the detached Tag is a <div> Box, which a <p> cannot hold. Give the text as="div" or move the tag out of it before detaching.');
    const spanned = detachAt("phrasing span", page('export const A = () => <Text as="span">Status <Badge>New</Badge></Text>;'), "<Badge", "Badge");
    ok("phrasing: inside a span it is flagged", spanned.detached.approximations.includes('It sits inside <Text as="span"> (phrasing content): the detached <div> Box is invalid HTML there (browsers still show it).'));
    const divided = detachAt("phrasing div", page('export const A = () => <Text as="div">Status <Badge>New</Badge></Text>;'), "<Badge", "Badge");
    ok("phrasing: inside a div Text nothing is flagged", !divided.detached.approximations.some((line) => line.startsWith("It sits inside")));
    const attribute = detachAt("phrasing attribute", page('export const A = () => <List><ListItem title="x" trailing={<Badge>New</Badge>} /></List>;'), "<Badge", "Badge");
    ok("phrasing: an attribute value is not judged", !attribute.detached.approximations.some((line) => line.startsWith("It sits inside")));
    const tag = detachAt("tag fill", page('export const A = () => <Tag>Design</Tag>;'), "<Tag", "Tag");
    tscSamples.push({ label: "tag fill", code: tag.code });
    tscSamples.push({ label: "badge", code: divided.code });
  }

  // Comment marker placement: JSX child (own line / inline), expression (after return on the same line, own line), attribute.
  {
    const marks = (label, body, needle, name, expected) => {
      const result = detachAt(`mark ${label}`, page(body), needle, name);
      check(`mark ${label}`, result.code.split("\n").filter((line) => line.includes("zen-detached")), expected);
    };
    marks("JSX child on its own line", "export const A = () => (\n  <Stack>\n    <Tag>x</Tag>\n  </Stack>\n);", "<Tag", "Tag", ["    {/* zen-detached: Tag · Zen Studio */}"]);
    marks("JSX child inline", "export const A = () => <div>Hi <Tag>x</Tag></div>;", "<Tag", "Tag", ["export const A = () => <div>Hi {/* zen-detached: Tag · Zen Studio */}<Box"]);
    marks("after return", "export function A() {\n  return <Tag>x</Tag>;\n}", "<Tag", "Tag", ["  return /* zen-detached: Tag · Zen Studio */ <Box"]);
    marks("expression on its own line", "export function A() {\n  return (\n    <Tag>x</Tag>\n  );\n}", "<Tag", "Tag", ["    /* zen-detached: Tag · Zen Studio */"]);
    marks("attribute value", "export const A = () => <Stack><ListItem title=\"x\" trailing={<Tag>x</Tag>} /></Stack>;", "<Tag", "Tag", ['export const A = () => <Stack><ListItem title="x" trailing={/* zen-detached: Tag · Zen Studio */ <Box']);
    marks("bare attribute value", "export const A = () => <ListItem title=\"x\" trailing=<Tag>x</Tag> />;", "<Tag", "Tag", ['export const A = () => <ListItem title="x" trailing={/* zen-detached: Tag · Zen Studio */ <Box']);
  }

  // Imports: merge, add, remove (platform relative paths; templates through @zen/design-system), conflicts.
  {
    const template = [
      'import { useState } from "react";',
      "import {",
      "  Badge,",
      "  Card,",
      "  Icon,",
      "  Stack,",
      "  Text,",
      "  type IconName,",
      '} from "@zen/design-system";',
      "",
      "export function T({ icon }: { icon: IconName }) {",
      "  const [n] = useState(0);",
      "  return (",
      "    <Stack>",
      "      <Card>",
      "        <Badge leading={<Icon name={icon} />}>{n}</Badge>",
      "      </Card>",
      "    </Stack>",
      "  );",
      "}",
      "",
    ].join("\n");
    const file = "src/templates/DetachSelftest.tsx";
    const cardOut = detachAt("template card", template, "<Card", "Card", {}, { file });
    check("template: Box merged in code-point order, Card removed, multi-line kept", cardOut.code.split("\n").slice(0, 10), [
      'import { useState } from "react";',
      "import {",
      "  Badge,",
      "  Box,",
      "  Icon,",
      "  Stack,",
      "  Text,",
      "  type IconName,",
      '} from "@zen/design-system";',
      "",
    ]);
    const badgeOut = detachAt("template badge", template, "<Badge", "Badge", {}, { file });
    check("template: Box added, Badge removed", badgeOut.code.split("\n").slice(2, 8), ["  Box,", "  Card,", "  Icon,", "  Stack,", "  Text,", "  type IconName,"]);
    const bare = detachAt("template without imports", "export const T = () => <Tag>x</Tag>;\n", "<Tag", "Tag", {}, { file: "src/templates/Bare.tsx" });
    check("template without imports: a package import first", bare.code.split("\n")[0], 'import { Box, Stack, Text } from "@zen/design-system";');
    const platformBare = detachAt("platform without imports", "export const T = () => <Tag>x</Tag>;\n", "<Tag", "Tag", {}, { file: "src/platform/appLayer/bare.tsx" });
    check("platform without imports: relative component paths", platformBare.code.split("\n").slice(0, 2), ['import { Box, Stack } from "../../components/Layout";', 'import { Text } from "../../components/Text";']);
    const single = detachAt("single-line merge", 'import { Grid, type GridProps } from "../../../components/Layout";\nimport { Tag } from "../../../components/Tag";\nexport const T = (p: GridProps) => <Grid {...p}><Tag>x</Tag></Grid>;\n', "<Tag", "Tag");
    check("platform: merge keeps type specifiers last", single.code.split("\n")[0], 'import { Box, Grid, Stack, type GridProps } from "../../../components/Layout";');
    check("platform: the Tag import line goes; Text gets its own line", single.code.split("\n").slice(1, 3), ['import { Text } from "../../../components/Text";', "export const T = (p: GridProps) => <Grid {...p}>{/* zen-detached: Tag · Zen Studio */}<Box"]);
    const singleQuote = detachAt("quotes and semicolons", "import { Tag } from '../../../components/Tag'\nimport { Text } from '../../../components/Text'\nexport const T = () => <Text as=\"div\"><Tag>x</Tag></Text>\n", "<Tag", "Tag");
    check("platform: quote and semicolon style followed", singleQuote.code.split("\n").slice(0, 2), ["import { Box, Stack } from '../../../components/Layout'", "import { Text } from '../../../components/Text'"]);
    check("conflict: a local Stack", reason("import { Tag } from \"../../../components/Tag\";\nconst Stack = () => null;\nexport const T = () => <Tag>x</Tag>;\n", "<Tag", "Tag"), "The file declares its own Stack; rename it before detaching.");
    check("conflict: Text from elsewhere", reason("import { Tag } from \"../../../components/Tag\";\nimport { Text } from \"./myText\";\nexport const T = () => <Tag>x</Tag>;\n", "<Tag", "Tag"), 'The file\'s own Text (imported from "./myText") is not Zen\'s Text; rename it before detaching.');
    check("conflict: a type-only Box", reason("import { Tag } from \"../../../components/Tag\";\nimport type { Box } from \"../../../components/Layout\";\nexport const T = () => <Tag>x</Tag>;\n", "<Tag", "Tag"), 'The file\'s own Box (imported from "../../../components/Layout" as a type) is not Zen\'s Box; rename it before detaching.');
    const aliased = detachAt("aliased import", 'import { Stack as Row } from "../../../components/Layout";\nimport { Tag } from "../../../components/Tag";\nexport const T = () => <Row><Tag>x</Tag></Row>;\n', "<Tag", "Tag");
    check("aliased: Stack added beside the alias", aliased.code.split("\n")[0], 'import { Box, Stack as Row, Stack } from "../../../components/Layout";');
  }

  // CRLF and BOM: line endings kept, BOM kept, locations without the BOM, template literals never re-indented.
  {
    const crlf = "﻿" + [
      'import { Card } from "../../../components/Card";',
      'import { Text } from "../../../components/Text";',
      "export const A = () => (",
      '  <Card spacing="sm">',
      "    <Text>Hi</Text>",
      '    <Text as="span">{`multi',
      "  line`}</Text>",
      "  </Card>",
      ");",
      "",
    ].join("\r\n");
    const result = detachAt("crlf bom", crlf, "<Card", "Card");
    ok("crlf: BOM kept", result.code.startsWith("﻿"));
    ok("crlf: only CRLF line breaks", !/[^\r]\n/.test(result.code) && !/\r(?!\n)/.test(result.code));
    check("crlf: output", result.code.slice(1).split("\r\n").slice(0, 12), [
      'import { Box, Stack } from "../../../components/Layout";',
      'import { Text } from "../../../components/Text";',
      "export const A = () => (",
      "  /* zen-detached: Card · Zen Studio */",
      '  <Box surface="surface" radius="lg" padding="md">',
      '    <Stack gap="none">',
      "      <Text>Hi</Text>",
      '      <Text as="span">{`multi',
      "  line`}</Text>",
      "    </Stack>",
      "  </Box>",
      ");",
    ]);
    check("crlf: loc without the BOM", result.detached.loc, "5:2");
    const mapped = detachAt("crlf map", 'import { Tag } from "../../../components/Tag";\r\nexport const A = (rows: string[]) => (\r\n  <div>\r\n    {rows.map((row) => <Tag key={row}>{`a\r\n  ${row}`}</Tag>)}\r\n  </div>\r\n);\r\n', "<Tag", "Tag", { instance: 0 });
    ok("crlf map: CRLF kept, the template literal untouched in both branches", !/[^\r]\n/.test(mapped.code) && mapped.code.split("{`a\r\n  ${row}`}").length === 3);
  }

  // Every detach output above: no new style-guard or usage-guard findings (written to a temporary draft file).
  if (repo) {
    const { checkFile } = await import(pathToFileURL(path.join(repo, "tools/style-guard/check-styles.mjs")).href);
    const { rules } = await import(pathToFileURL(path.join(repo, "tools/usage-guard/check-usage.mjs")).href);
    const { createChecker } = await import(pathToFileURL(path.join(repo, "tools/usage-guard/engine.mjs")).href);
    const usage = createChecker(rules, { consumer: false, css: false });
    const draftDir = path.join(repo, "src/platform/examples/drafts");
    const draft = `src/platform/examples/drafts/zen-studio-detach-selftest-${process.pid}.tsx`;
    const count = (list) => list.reduce((map, key) => map.set(key, (map.get(key) ?? 0) + 1), new Map());
    const fresh = (before, after) => [...count(after)].filter(([key, n]) => n > (count(before).get(key) ?? 0)).map(([key]) => key);
    const created = !fs.existsSync(draftDir);
    try {
      fs.mkdirSync(draftDir, { recursive: true });
      for (const sample of guardSamples) {
        fs.writeFileSync(path.join(repo, draft), sample.before);
        const styleBefore = checkFile(draft).map((finding) => `${finding.rule}|${finding.context}`);
        fs.writeFileSync(path.join(repo, draft), sample.after);
        const styleAfter = checkFile(draft).map((finding) => `${finding.rule}|${finding.context}`);
        check(`guards ${sample.label}: style-guard`, fresh(styleBefore, styleAfter), []);
        const usageKeys = (text) => usage.checkFile(text, draft).map((finding) => `${finding.rule.id}|${finding.tag}`);
        check(`guards ${sample.label}: usage-guard`, fresh(usageKeys(sample.before), usageKeys(sample.after)), []);
      }
    } finally {
      fs.rmSync(path.join(repo, draft), { force: true });
      if (created) fs.rmSync(draftDir, { recursive: true, force: true });
    }
    ok("guards: samples checked", guardSamples.length > 40);

    // TypeScript (the repo's tsconfig) on chosen detach outputs, written as drafts: no error, or exactly the expected codes.
    const tscBin = (() => {
      try { return path.join(path.dirname(createRequire(path.join(repo, "package.json")).resolve("typescript/package.json")), "bin/tsc"); } catch { return null; }
    })();
    ok("tsc: typescript found", tscBin && fs.existsSync(tscBin));
    if (tscBin && fs.existsSync(tscBin)) {
      const names = tscSamples.map((_, i) => `zen-studio-detach-tsc-${process.pid}-${i}.tsx`);
      const config = `zen-studio-detach-tsconfig-${process.pid}.json`;
      const madeDir = !fs.existsSync(draftDir);
      try {
        fs.mkdirSync(draftDir, { recursive: true });
        tscSamples.forEach((sample, i) => fs.writeFileSync(path.join(draftDir, names[i]), sample.code));
        fs.writeFileSync(path.join(draftDir, config), JSON.stringify({ extends: "../../../../tsconfig.json", include: ["../../../vite-env.d.ts", ...names], exclude: [] }));
        const run = spawnSync(process.execPath, [tscBin, "-p", path.join(draftDir, config), "--pretty", "false"], { encoding: "utf8" });
        ok("tsc: ran", !run.error && run.status !== null);
        const lines = `${run.stdout ?? ""}${run.stderr ?? ""}`.split(/\r?\n/);
        const outside = lines.filter((line) => /error TS\d+/.test(line) && !line.includes("zen-studio-detach-tsc-"));
        check("tsc: no errors outside the drafts", outside, []);
        tscSamples.forEach((sample, i) => {
          const codes = lines.filter((line) => line.includes(names[i])).map((line) => /error (TS\d+)/.exec(line)?.[1]).filter(Boolean);
          check(`tsc ${sample.label}`, codes, sample.expect ?? []);
        });
      } finally {
        for (const name of [...names, config]) fs.rmSync(path.join(draftDir, name), { force: true });
        if (madeDir) fs.rmSync(draftDir, { recursive: true, force: true });
      }
    }
  }
}

/* ── wrap (applyOps op "wrap": the element inside a Box/Stack/Grid, its key moved, the Layout import, the snippet) ── */
{
  const repo = [fileURLToPath(new URL("../../", import.meta.url))].find((candidate) => fs.existsSync(path.join(candidate, "src/platform/studio/history.ts")));
  const history = repo ? await import(pathToFileURL(path.join(repo, "src/platform/studio/history.ts")).href) : null;
  const PAGE = "src/platform/examples/pages/wrap-selftest.tsx";
  const TEMPLATE = "src/templates/hr/WrapSelftest.tsx";
  const str = (value) => ({ kind: "string", value });
  /** "<line>:<column>" of the nth occurrence of `needle` (a "<Tag" opening), BOM not counted. */
  const locOf = (code, needle, nth = 0) => {
    const text = code.replace(/^﻿/, "");
    let at = -1;
    for (let i = 0; i <= nth; i += 1) at = text.indexOf(needle, at + 1);
    const before = text.slice(0, at);
    return `${before.split(/\r?\n/).length}:${at - Math.max(before.lastIndexOf("\n"), -1) - 1}`;
  };
  /** Wrap the nth `needle` element and run the checks every wrap must pass; returns the result (or the error). */
  const wrapAt = (label, code, needle, name, op = {}, { nth = 0, file = PAGE, snippets = true } = {}) => {
    const result = applyOps(code, locOf(code, needle, nth), name, [{ op: "wrap", tag: "Box", props: {}, ...op }], { file, snippets });
    if ("error" in result) return result;
    const before = parseSource(code.replace(/^﻿/, ""));
    const after = parseSource(result.code.replace(/^﻿/, ""));
    ok(`${label}: re-parses`, after && after.errors.length <= before.errors.length);
    const box = describeElement(result.code, file, result.wrapped?.loc ?? "");
    check(`${label}: wrapped.loc is the wrapper`, box?.name, op.tag ?? "Box");
    const kids = (box?.children ?? []).filter((child) => child.kind === "element");
    check(`${label}: the wrapper holds the element alone`, [kids.length, kids[0]?.name], [1, name]);
    if (history) {
      const patch = history.makePatch(code, result.code);
      check(`${label}: undo restores the original exactly`, history.textBeforeEdit(result.code, patch, true) === code, true);
    }
    return result;
  };
  const rows = (result, from, to) => result.code.split(/\r?\n/).slice(from - 1, to);
  const changedRows = (result) => rows(result, result.changed.from, result.changed.to);
  const importLines = (result) => result.code.split(/\r?\n/).filter((line) => line.startsWith("import"));

  const IMPORTS = [
    'import { Card } from "../../../components/Card";',
    'import { Divider } from "../../../components/Divider";',
    'import { DockIcon } from "../../../components/DockIcon";',
    'import { Stack } from "../../../components/Layout";',
    'import { ListItem } from "../../../components/ListItem";',
    'import { Text } from "../../../components/Text";',
  ];
  const src = [
    ...IMPORTS,
    "",
    "export function A({ items, open }: { items: { id: string; name: string }[]; open: boolean }) {",
    "  return (",
    "    <Stack gap=\"md\">",
    "      <Divider />",
    "      <Card title=\"Plan\">",
    "        <Text>Pro</Text>",
    "      </Card>",
    "      {items.map((item) => (",
    "        <ListItem key={item.id} title={item.name} leading={<DockIcon icon=\"icon-user-line\" />} />",
    "      ))}",
    "      {items.map((item) => <Text key={item.id}>{item.name}</Text>)}",
    "      {open ? <Text>Open</Text> : null}",
    "    </Stack>",
    "  );",
    "}",
    "",
  ].join("\n");

  // A self-closing element: own lines, one level deeper; Box joins the Layout import; the loc is the element's old one.
  {
    const result = wrapAt("wrap self-closing", src, "<Divider", "Divider", { props: { padding: str("md") } });
    check("wrap self-closing: output", changedRows(result), ['      <Box padding="md">', "        <Divider />", "      </Box>"]);
    check("wrap self-closing: Box merged into the Layout import", importLines(result)[3], 'import { Box, Stack } from "../../../components/Layout";');
    check("wrap self-closing: loc and changed", [result.wrapped.loc, result.changed], [locOf(src, "<Divider"), { from: 11, to: 13 }]);
    check("wrap self-closing: no snippet in the file → no report", "snippet" in result, false);
    check("wrap self-closing: nothing else changed", result.code.split("\n").length, src.split("\n").length + 2);
  }
  // An element with children: every line one level deeper; props in the given order, formatted like setProp.
  {
    const props = { padding: str("lg"), surface: str("surface"), width: { kind: "number", value: 240 }, maxWidth: { kind: "expression", code: "320" }, alignSelf: str("start") };
    const result = wrapAt("wrap children", src, "<Card", "Card", { props });
    check("wrap children: output", changedRows(result), [
      '      <Box padding="lg" surface="surface" width={240} maxWidth={320} alignSelf="start">',
      '        <Card title="Plan">',
      "          <Text>Pro</Text>",
      "        </Card>",
      "      </Box>",
    ]);
    const stack = wrapAt("wrap in a Stack", src, "<Card", "Card", { tag: "Stack", props: { gap: str("sm"), fillChildren: { kind: "boolean", value: true } } });
    check("wrap in a Stack: Stack is already imported, booleans as a bare name", [changedRows(stack)[0], importLines(stack)[3]], ['      <Stack gap="sm" fillChildren>', 'import { Stack } from "../../../components/Layout";']);
    const grid = wrapAt("wrap in a Grid", src, "<Card", "Card", { tag: "Grid" });
    check("wrap in a Grid: no props, Grid imported", [changedRows(grid)[0], importLines(grid)[3]], ["      <Grid>", 'import { Grid, Stack } from "../../../components/Layout";']);
    const long = wrapAt("wrap long props", src, "<Card", "Card", { props: { padding: str("lg"), surface: str("surface-alt"), border: str("subtle"), radius: str("xl"), width: str("fill"), minWidth: { kind: "number", value: 320 }, maxWidth: { kind: "number", value: 640 } } });
    check("wrap long props: one per line past 110 columns", changedRows(long), [
      "      <Box",
      '        padding="lg"',
      '        surface="surface-alt"',
      '        border="subtle"',
      '        radius="xl"',
      '        width="fill"',
      "        minWidth={320}",
      "        maxWidth={640}",
      "      >",
      '        <Card title="Plan">',
      "          <Text>Pro</Text>",
      "        </Card>",
      "      </Box>",
    ]);
  }
  // Inside a .map callback: the row's key moves to the wrapper (the element the callback returns needs it).
  {
    const result = wrapAt("wrap map row", src, "<ListItem", "ListItem");
    check("wrap map row: key moved to the wrapper", changedRows(result), [
      "        <Box key={item.id}>",
      '          <ListItem title={item.name} leading={<DockIcon icon="icon-user-line" />} />',
      "        </Box>",
    ]);
    const inline = wrapAt("wrap map row inline", src, "<Text key", "Text", { props: { padding: str("sm") } });
    check("wrap map row inline: inline, key moved", changedRows(inline), ['      {items.map((item) => <Box key={item.id} padding="sm"><Text>{item.name}</Text></Box>)}']);
    // A key alone on its line goes with its line; a key that ends the tag takes the line break before it.
    const own = ["export const B = ({ items }: { items: { id: string; name: string }[] }) => (", "  <Stack>", "    {items.map((item) => (", "      <ListItem", "        key={item.id}", "        title={item.name}", "      />", "    ))}", "  </Stack>", ");", ""].join("\n");
    check("wrap map row, key on its own line", changedRows(wrapAt("wrap key own line", own, "<ListItem", "ListItem")), ["      <Box key={item.id}>", "        <ListItem", "          title={item.name}", "        />", "      </Box>"]);
    const last = own.replace("        key={item.id}\n        title={item.name}\n      />", "        title={item.name}\n        key={item.id}>\n        Row\n      </ListItem>");
    check("wrap map row, key ending the tag", changedRows(wrapAt("wrap key ends tag", last, "<ListItem", "ListItem")), ["      <Box key={item.id}>", "        <ListItem", "          title={item.name}>", "          Row", "        </ListItem>", "      </Box>"]);
  }
  // Attribute and expression positions: inline, nothing re-indented. An attribute's own value is wrapped inline unless
  // cloning.json names the prop (see "Cloned elements" below); an element further inside the value is wrapped inline.
  {
    const attr = wrapAt("wrap attribute value", src, "<DockIcon", "DockIcon", { props: { padding: str("2xs") } });
    check("wrap attribute value: inline in the attribute", changedRows(attr), ['        <ListItem key={item.id} title={item.name} leading={<Box padding="2xs"><DockIcon icon="icon-user-line" /></Box>} />']);
    check("wrap attribute value: describe says ok", describeElement(src, PAGE, locOf(src, "<DockIcon"))?.wrap, { ok: true });
    const inside = src.replace('leading={<DockIcon icon="icon-user-line" />}', 'leading={<Stack><DockIcon icon="icon-user-line" /></Stack>}');
    const deeper = wrapAt("wrap inside an attribute value", inside, "<DockIcon", "DockIcon", { props: { padding: str("2xs") } });
    check("wrap inside an attribute value: inline in the attribute", changedRows(deeper), ['        <ListItem key={item.id} title={item.name} leading={<Stack><Box padding="2xs"><DockIcon icon="icon-user-line" /></Box></Stack>} />']);
    const cond = wrapAt("wrap conditional branch", src, "<Text>Open", "Text");
    check("wrap conditional branch: inline", changedRows(cond), ["      {open ? <Box><Text>Open</Text></Box> : null}"]);
    const bare = 'import { Icon } from "../../../components/Icon";\nexport const C = () => <Stack icon=<Icon name="x" /> />;\n';
    check("wrap a JSX attribute value without braces: inline", changedRows(wrapAt("wrap bare attribute value", bare, "<Icon name", "Icon")), ['export const C = () => <Stack icon=<Box><Icon name="x" /></Box> />;']);
  }
  // Cloned elements (src/platform/studio/cloning.json, read by jsx-source.mjs): Menu's trigger, AppShell's sidebar and
  // aside, Tooltip's and FormField's child, FormActions' Buttons (also through fragments, [ … ] and .map callbacks) and
  // ChatMessage's ChatPhotos / ChatCall; through {…}, ?:, && and either side of || / ??. Each refusal gives the list's
  // reason (never "give it its own size"); a sibling, another attribute's value or an element further in is wrapped.
  // Tooltip, FormField and ChatMessage clone or read a sole child: a child with a sibling that renders (not whitespace
  // with a line break, which JSX drops, nor a {/* comment */}) reaches them in an array and is wrapped. ChatPhotos and
  // ChatCall are only ever ChatMessage bodies (`anywhere`): refused in any position, also returned by a helper.
  // describeElement's `wrap` gives the same verdict as the op (and the nesting refusals), so the client can tell first.
  {
    const cloned = [
      'import { Button, IconButton } from "../../../components/Button";',
      'import { ChatCall, ChatFile, ChatMessage, ChatPhotos } from "../../../components/Chat";',
      'import { FormActions, FormField } from "../../../components/Form";',
      'import { Stack } from "../../../components/Layout";',
      'import { ListItem } from "../../../components/ListItem";',
      'import { Menu } from "../../../components/Menu";',
      'import { Tooltip } from "../../../components/Tooltip";',
      "export const M = ({ open, actions }: { open: boolean; actions: string[] }) => (",
      "  <Stack>",
      '    <Menu trigger={<IconButton aria-label="More actions" icon="icon-dots-horizontal-line" />} items={[]} />',
      '    <IconButton aria-label="Share" icon="icon-share-line" />',
      '    <Tooltip content="Send now">',
      "      <Button>Send</Button>",
      "    </Tooltip>",
      '    <Tooltip content="New">{open ? <Badge>New</Badge> : null}</Tooltip>',
      '    <Tooltip content="Help">{open && <Stack><Button>Help</Button></Stack>}</Tooltip>',
      '    <Zen.Tooltip content="Zen"><Button>Zen</Button></Zen.Tooltip>',
      '    <Tooltip content="Left">{<Button>Left</Button> || null}</Tooltip>',
      '    <Tooltip content="Fragment"><><Button>Fragment</Button></></Tooltip>',
      '    <Tooltip content="Mapped">{actions.map((action) => <Button key={action}>{action}</Button>)}</Tooltip>',
      '    <FormField label="Volume"><Slider aria-label="Volume" /></FormField>',
      '    <FormActions><Button>Save</Button><Link href="#">Cancel</Link></FormActions>',
      "    <FormActions><><Button>Back</Button></>{open ?? <Button>Skip</Button>}</FormActions>",
      '    <FormActions><Fragment><Button>Draft</Button></Fragment>{[<Button key="a">Archive</Button>]}</FormActions>',
      "    <FormActions>{actions.map((action) => <Button key={action}>{action}</Button>)}</FormActions>",
      "    <FormActions>{actions.map(function (action) { if (!action) return null; return <Button key={action}>Run</Button>; })}</FormActions>",
      "    <FormActions>{actions.map((action) => <Stack key={action}><Button>Nested</Button></Stack>)}</FormActions>",
      "    <FormActions>{<Button>First</Button> ?? null}</FormActions>",
      '    <ChatMessage side="you"><ChatPhotos photos={[]} /></ChatMessage>',
      '    <ChatMessage side="others">{open ? <ChatCall kind="voice" /> : null}</ChatMessage>',
      '    <ChatMessage side="you"><ChatFile name="Plan.pdf" /></ChatMessage>',
      '    <Tooltip content="Pair"><Button>Pair one</Button><Button>Pair two</Button></Tooltip>',
      '    <Tooltip content="Commented">',
      "      {/* the trigger */}",
      "      <Button>Commented</Button>",
      "    </Tooltip>",
      '    <Tooltip content="Nbsp">\u00a0',
      "      <Button>Nbsp</Button>",
      "    </Tooltip>",
      '    <Tooltip content="Spaced"> <Button>Spaced</Button></Tooltip>',
      '    <FormField label="Name">',
      '      <Input aria-label="Name" />',
      "    </FormField>",
      '    <FormField label="Full name"><Input aria-label="First" /><Input aria-label="Last" /></FormField>',
      '    <ChatMessage side="you"><ChatFile name="Brief.pdf" /><ChatCall kind="video" /></ChatMessage>',
      '    <Stack><ChatCall state="in-missed" /></Stack>',
      '    <ListItem title="Task" trailing={<Badge theme="green" background="subtle">Done</Badge>} />',
      "    <AppShell sidebar={<Sidebar items={[]} />} aside={(<SidePanel open />) as never} />",
      "  </Stack>",
      ");",
      "function bodyOf(kind: string) {",
      "  switch (kind) {",
      '    case "photo": return <ChatPhotos photos={moodboard} />;',
      '    case "call": return <ChatCall type="audio" />;',
      '    default: return <ChatFile name="Notes.txt" />;',
      "  }",
      "}",
      "",
    ].join("\n");
    const op = { tag: "Stack", props: { fillChildren: { kind: "boolean", value: true }, width: { kind: "number", value: 120 } } };
    const reasons = [];
    const refused = (label, needle, name, error, nth = 0) => {
      const result = wrapAt(label, cloned, needle, name, op, { nth });
      check(`${label}: refused`, [result.code, result.error], ["invalid", error]);
      check(`${label}: describe says so`, describeElement(cloned, PAGE, locOf(cloned, needle, nth))?.wrap, { ok: false, reason: error });
      reasons.push(result.error);
    };
    refused("wrap Menu trigger", "<IconButton aria-label=\"More", "IconButton", "<IconButton> is the Menu's trigger, which Menu clones; resize the Menu instead.");
    refused("wrap Tooltip child", "<Button>Send", "Button", "<Button> keeps its size inside a Tooltip, which clones it; change it in code.");
    refused("wrap Tooltip child in a ?: branch", "<Badge>New", "Badge", "<Badge> keeps its size inside a Tooltip, which clones it; change it in code.");
    refused("wrap Tooltip child after &&", "<Stack><Button>Help", "Stack", "<Stack> keeps its size inside a Tooltip, which clones it; change it in code.");
    refused("wrap Zen.Tooltip child", "<Button>Zen", "Button", "<Button> keeps its size inside a Tooltip, which clones it; change it in code.");
    refused("wrap Tooltip child on the left of ||", "<Button>Left", "Button", "<Button> keeps its size inside a Tooltip, which clones it; change it in code.");
    refused("wrap FormField control", "<Slider", "Slider", "<Slider> is the FormField's control, which FormField clones; resize the FormField instead.");
    const formActions = "FormActions sizes its Buttons (Large when stacked); resize the FormActions instead.";
    refused("wrap FormActions button", "<Button>Save", "Button", formActions);
    refused("wrap FormActions button in a fragment", "<Button>Back", "Button", formActions);
    refused("wrap FormActions button on the right of ??", "<Button>Skip", "Button", formActions);
    refused("wrap FormActions button in a <Fragment>", "<Button>Draft", "Button", formActions);
    refused("wrap FormActions button in an array", "<Button key=\"a\">Archive", "Button", formActions);
    refused("wrap FormActions button from a .map arrow", "<Button key={action}>{action}", "Button", formActions, 1);
    refused("wrap FormActions button returned by a .map function", "<Button key={action}>Run", "Button", formActions);
    refused("wrap FormActions button on the left of ??", "<Button>First", "Button", formActions);
    const chatBody = (element) => `${element} is a ChatMessage body, which ChatMessage reads by type; change it in code.`;
    refused("wrap ChatMessage photos", "<ChatPhotos", "ChatPhotos", chatBody("<ChatPhotos>"));
    refused("wrap ChatMessage call in a ?: branch", "<ChatCall", "ChatCall", chatBody("<ChatCall>"));
    // Sole child: whitespace with a line break and a {/* comment */} are no siblings (the Tooltip still clones it).
    const tooltip = (element) => `${element} keeps its size inside a Tooltip, which clones it; change it in code.`;
    refused("wrap a Tooltip's sole child between a comment and line breaks", "<Button>Commented", "Button", tooltip("<Button>"));
    refused("wrap a Tooltip's sole child after a no-break space and a line break", "<Button>Nbsp", "Button", tooltip("<Button>"));
    refused("wrap a FormField's sole control between line breaks", "<Input aria-label=\"Name", "Input", "<Input> is the FormField's control, which FormField clones; resize the FormField instead.");
    // anywhere: ChatPhotos / ChatCall beside another body, outside any ChatMessage, and returned by a helper's switch.
    refused("wrap a ChatCall beside another body (anywhere)", "<ChatCall kind=\"video", "ChatCall", chatBody("<ChatCall>"));
    refused("wrap a ChatCall outside a ChatMessage (anywhere)", "<ChatCall state=\"in-missed", "ChatCall", chatBody("<ChatCall>"));
    refused("wrap the ChatPhotos a helper returns from a switch (anywhere)", "<ChatPhotos photos={moodboard}", "ChatPhotos", chatBody("<ChatPhotos>"));
    refused("wrap the ChatCall a helper returns from a switch (anywhere)", "<ChatCall type=\"audio", "ChatCall", chatBody("<ChatCall>"));
    refused("wrap AppShell sidebar", "<Sidebar", "Sidebar", "<Sidebar> is the AppShell's sidebar, which AppShell checks by type and clones; change it in code.");
    refused("wrap AppShell aside through ( ) as", "<SidePanel", "SidePanel", "<SidePanel> is the AppShell's aside, which AppShell checks by type and clones; change it in code.");
    check("cloned: no reason suggests a size of the element's own", reasons.filter((reason) => /own size/i.test(reason)), []);
    const allowed = (label, needle, name, nth = 0) => {
      const result = wrapAt(label, cloned, needle, name, op, { nth });
      check(`${label}: wrapped`, [result.error ?? null, Boolean(result.wrapped)], [null, true]);
      check(`${label}: describe says ok`, describeElement(cloned, PAGE, locOf(cloned, needle, nth))?.wrap, { ok: true });
      return result;
    };
    const sibling = allowed("wrap the trigger's sibling", "<IconButton aria-label=\"Share", "IconButton");
    check("wrap the trigger's sibling: output, the Menu untouched", rows(sibling, 10, 13), [
      '    <Menu trigger={<IconButton aria-label="More actions" icon="icon-dots-horizontal-line" />} items={[]} />',
      "    <Stack fillChildren width={120}>",
      '      <IconButton aria-label="Share" icon="icon-share-line" />',
      "    </Stack>",
    ]);
    allowed("wrap the Menu itself", "<Menu", "Menu");
    allowed("wrap the Tooltip itself", "<Tooltip content=\"Send", "Tooltip");
    allowed("wrap inside the Tooltip's child", "<Button>Help", "Button");
    allowed("wrap a Button in a Tooltip's fragment (Tooltip clones the fragment)", "<Button>Fragment", "Button");
    allowed("wrap a Button in a Tooltip's .map (an array is not cloned)", "<Button key={action}>{action}", "Button", 0);
    allowed("wrap FormActions' non-Button child", "<Link", "Link");
    allowed("wrap a FormActions .map row that is not a Button", "<Stack key={action}>", "Stack");
    allowed("wrap a Button inside a FormActions row", "<Button>Nested", "Button");
    allowed("wrap a ChatMessage body it does not read by type", "<ChatFile", "ChatFile");
    // Several children reach a Tooltip or a FormField as an array, which they never clone.
    allowed("wrap the first of a Tooltip's two children", "<Button>Pair one", "Button");
    allowed("wrap the second of a Tooltip's two children", "<Button>Pair two", "Button");
    allowed("wrap a Tooltip child after a space on the tag's line (JSX keeps it: a \" \" child)", "<Button>Spaced", "Button");
    allowed("wrap one of a FormField's two children", "<Input aria-label=\"First", "Input");
    allowed("wrap a ChatFile beside a ChatCall", "<ChatFile name=\"Brief", "ChatFile");
    allowed("wrap the ChatFile a helper returns", "<ChatFile name=\"Notes", "ChatFile");
    // Another attribute's value is wrapped again (badge.tsx: a ListItem's trailing Badge), inline in the attribute.
    const trailing = allowed("wrap a ListItem's trailing Badge", "<Badge theme", "Badge");
    check("wrap a ListItem's trailing Badge: inline in the attribute", changedRows(trailing), ['    <ListItem title="Task" trailing={<Stack fillChildren width={120}><Badge theme="green" background="subtle">Done</Badge></Stack>} />']);
    // The shared list: every entry says why and gives a reason that names the element or the owner, never its own size.
    const entries = [...Object.entries(cloning.props), ...Object.entries(cloning.parents)];
    check("cloning.json: the props and parents the components clone", [Object.keys(cloning.props), Object.keys(cloning.parents)], [["Menu.trigger", "AppShell.sidebar", "AppShell.aside"], ["Tooltip", "FormField", "FormActions", "ChatMessage"]]);
    check("cloning.json: every entry has a why and a reason, none suggests its own size", entries.filter(([, entry]) => !(typeof entry.why === "string" && entry.why && typeof entry.reason === "string" && entry.reason && !/own size/i.test(entry.reason))).map(([key]) => key), []);
    check("cloning.json: anywhere only on ChatMessage, which names its bodies", Object.entries(cloning.parents).filter(([, entry]) => "anywhere" in entry).map(([key, entry]) => [key, entry.anywhere, entry.only]), [["ChatMessage", true, ["ChatPhotos", "ChatCall"]]]);
    // The verdict covers the nesting refusals too; docs chrome is never wrapped.
    const row = 'export const R = () => <table><tbody><tr><td>x</td></tr></tbody></table>;\n';
    check("describe wrap: a <tr> → its nesting reason", describeElement(row, PAGE, locOf(row, "<tr"))?.wrap, { ok: false, reason: wrapAt("wrap tr verdict", row, "<tr", "tr").error });
    const chrome = ["// zen-studio-chrome", "export function ExampleCard() {", "  return <div><span>x</span></div>;", "}", ""].join("\n");
    check("describe wrap: docs chrome → refused", describeElement(chrome, PAGE, "3:14")?.wrap.ok, false);
  }
  // Imports: a new line sorted among the component imports (the loc moves down), "@zen/design-system" files, a Layout
  // import spelled with /index, Box imported already, and a local Box (refused).
  {
    const fresh = ['import { Card } from "../../../components/Card";', 'import { Text } from "../../../components/Text";', "", 'export const B = () => <Card title="x"><Text>Hi</Text></Card>;', ""].join("\n");
    const result = wrapAt("wrap new import", fresh, "<Card", "Card");
    check("wrap new import: a sorted new import line", importLines(result), ['import { Card } from "../../../components/Card";', 'import { Box } from "../../../components/Layout";', 'import { Text } from "../../../components/Text";']);
    check("wrap new import: loc moved down a line, changed is the element's", [result.wrapped.loc, result.changed], ["5:23", { from: 5, to: 5 }]);
    check("wrap new import: inline after =>", rows(result, 5, 5), ['export const B = () => <Box><Card title="x"><Text>Hi</Text></Card></Box>;']);
    const pkg = ['import { Card, Stack, Text } from "@zen/design-system";', "", "export const T = () => (", "  <Stack>", "    <Card title=\"x\" />", "  </Stack>", ");", ""].join("\n");
    check("wrap template: merged into @zen/design-system", importLines(wrapAt("wrap template", pkg, "<Card", "Card", {}, { file: TEMPLATE })), ['import { Box, Card, Stack, Text } from "@zen/design-system";']);
    const bareTemplate = ["export const T = () => <div><span>x</span></div>;", ""].join("\n");
    const noImports = wrapAt("wrap template without imports", bareTemplate, "<span", "span", {}, { file: TEMPLATE });
    check("wrap template without imports: a new @zen/design-system line, loc moved", [importLines(noImports), noImports.wrapped.loc], [['import { Box } from "@zen/design-system";'], "2:28"]);
    const platformPkg = ['import { Stack, Text } from "@zen/design-system";', "export const P = () => <Stack><Text>x</Text></Stack>;", ""].join("\n");
    check("wrap platform file importing the package: merged there", importLines(wrapAt("wrap package platform", platformPkg, "<Text", "Text")), ['import { Box, Stack, Text } from "@zen/design-system";']);
    const indexed = ['import { Stack } from "../../../components/Layout/index";', "export const P = () => <Stack><b>x</b></Stack>;", ""].join("\n");
    check("wrap Layout/index import: merged into it", importLines(wrapAt("wrap layout index", indexed, "<b", "b")), ['import { Box, Stack } from "../../../components/Layout/index";']);
    const multiLine = ["import {", "  Grid,", "  Stack,", '} from "../../../components/Layout";', "export const P = () => <Stack><b>x</b></Stack>;", ""].join("\n");
    const merged = wrapAt("wrap one-per-line import", multiLine, "<b", "b");
    check("wrap one-per-line import: list kept, loc moved a line", [importLines(merged).length, merged.code.split("\n").slice(0, 5), merged.wrapped.loc], [1, ["import {", "  Box,", "  Grid,", "  Stack,", '} from "../../../components/Layout";'], "6:30"]);
    const has = ['import { Box, Stack } from "../../../components/Layout";', "export const P = () => <Stack><b>x</b></Stack>;", ""].join("\n");
    const already = wrapAt("wrap Box imported", has, "<b", "b");
    check("wrap Box imported: imports untouched", [importLines(already), already.wrapped.loc], [['import { Box, Stack } from "../../../components/Layout";'], "2:30"]);
    const local = ["const Box = () => null;", "export const P = () => <div><b>x</b></div>;", ""].join("\n");
    const refusedLocal = wrapAt("wrap local Box", local, "<b", "b");
    check("wrap local Box: refused", [refusedLocal.code, refusedLocal.error], ["invalid", "The file declares its own Box; rename it before wrapping."]);
    const foreign = ['import { Box } from "./my-box";', "export const P = () => <div><b>x</b></div>;", ""].join("\n");
    check("wrap foreign Box: refused", wrapAt("wrap foreign Box", foreign, "<b", "b").error, 'The file\'s own Box (imported from "./my-box") is not Zen\'s Box; rename it before wrapping.');
  }
  // Refusals: docs chrome, another op beside it, not a JSX element, bad tag or props, markup a <div> would break.
  {
    const chrome = ["// zen-studio-chrome", "export function ExampleCard() {", "  return <div><span>x</span></div>;", "}", ""].join("\n");
    check("wrap chrome: forbidden", wrapAt("wrap chrome", chrome, "<span", "span").code, "forbidden");
    const wrapOp = { op: "wrap", tag: "Box", props: {} };
    const setProp = { op: "setProp", name: "title", value: str("y") };
    const loc = locOf(src, "<Card");
    check("wrap with another op: refused", [applyOps(src, loc, "Card", [wrapOp, setProp]).error, applyOps(src, loc, "Card", [setProp, wrapOp]).error], ["wrap cannot be combined with other ops", "wrap cannot be combined with other ops"]);
    check("wrap twice in one request: refused", applyOps(src, loc, "Card", [wrapOp, wrapOp]).error, "wrap cannot be combined with other ops");
    const fragment = ["export const F = () => (", "  <>", "    <b>x</b>", "  </>", ");", ""].join("\n");
    check("wrap a fragment: not a JSX element", applyOps(fragment, "2:2", "Fragment", [wrapOp]).code, "not-found");
    check("wrap text: not a JSX element", applyOps(fragment, "3:7", "b", [wrapOp]).code, "not-found");
    check("wrap stale name: stale", applyOps(src, loc, "Text", [wrapOp]).code, "stale");
    check("wrap tag div: refused", wrapAt("wrap tag div", src, "<Card", "Card", { tag: "div" }).error, 'wrap puts the element in Box, Stack, Grid (not "div")');
    check("wrap props key: refused", wrapAt("wrap props key", src, "<Card", "Card", { props: { key: str("k") } }).code, "invalid");
    check("wrap props children: refused", wrapAt("wrap props children", src, "<Card", "Card", { props: { children: str("k") } }).code, "invalid");
    check("wrap props bad name: refused", wrapAt("wrap props bad name", src, "<Card", "Card", { props: { "bad name": str("k") } }).error, '"bad name" is not a JSX attribute name');
    check("wrap props bad expression: refused", wrapAt("wrap props bad expression", src, "<Card", "Card", { props: { width: { kind: "expression", code: "1 +" } } }).code, "invalid");
    check("wrap props not an object: refused", [wrapAt("wrap props array", src, "<Card", "Card", { props: [] }).code, wrapAt("wrap props string", src, "<Card", "Card", { props: "padding" }).code], ["invalid", "invalid"]);
    check("wrap props missing or null: no props", [applyOps(src, locOf(src, "<Card"), "Card", [{ op: "wrap" }], { file: PAGE }).code.includes("      <Box>\n"), wrapAt("wrap props null", src, "<Card", "Card", { props: null }).code.includes("      <Box>\n")], [true, true]);
    const nest = (body) => ['import { Text } from "../../../components/Text";', "export const N = () => (", ...body, ");", ""].join("\n");
    check("wrap inside <p>: refused", /inside a paragraph \(<p>\)/.test(wrapAt("wrap in p", nest(["  <p>Hi <b>x</b></p>"]), "<b", "b").error), true);
    check("wrap inside <Text>: refused", /inside a paragraph \(<Text>\)/.test(wrapAt("wrap in Text", nest(["  <Text>Hi <b>x</b></Text>"]), "<b", "b").error), true);
    check("wrap through phrasing inside <p>: refused", /inside a paragraph \(<p>\)/.test(wrapAt("wrap in span in p", nest(["  <p><span><b>x</b></span></p>"]), "<b", "b").error), true);
    check("wrap inside <Text as=\"div\">: allowed", wrapAt("wrap in Text div", nest(["  <Text as=\"div\"><b>x</b></Text>"]), "<b", "b").wrapped?.loc, "4:17");
    check("wrap a <tr>: refused", /<tr> only renders inside its <table>/.test(wrapAt("wrap tr", nest(["  <table><tbody><tr><td>x</td></tr></tbody></table>"]), "<tr", "tr").error), true);
    check("wrap a child of <tr> (td): refused", wrapAt("wrap td", nest(["  <table><tbody><tr><td>x</td></tr></tbody></table>"]), "<td", "td").code, "invalid");
    check("wrap a <div> inside <tbody>: refused", /directly inside <tbody>/.test(wrapAt("wrap in tbody", nest(["  <table><tbody><div>x</div></tbody></table>"]), "<div", "div").error), true);
    check("wrap inside a cell: allowed", Boolean(wrapAt("wrap in td", nest(["  <table><tbody><tr><td><b>x</b></td></tr></tbody></table>"]), "<b", "b").wrapped), true);
    check("wrap inside an attribute value under <p>: allowed", Boolean(wrapAt("wrap in p attribute", nest(["  <p><Tip content={<span><b>x</b></span>} /></p>"]), "<b", "b").wrapped), true);
    check("wrap inside an <svg>: refused", /inside an <svg>/.test(wrapAt("wrap in svg", nest(["  <svg><g><path d=\"M0 0\" /></g></svg>"]), "<path", "path").error), true);
    check("wrap inside a <foreignObject>: allowed", Boolean(wrapAt("wrap in foreignObject", nest(["  <svg><foreignObject><b>x</b></foreignObject></svg>"]), "<b", "b").wrapped), true);
    check("wrap an <svg>: allowed", Boolean(wrapAt("wrap svg", nest(["  <div><svg><path d=\"M0 0\" /></svg></div>"]), "<svg", "svg").wrapped), true);
  }
  // Lines inside a template literal keep their indentation; blank lines stay blank; CRLF and BOM kept.
  {
    const tpl = ["export const T = ({ name }: { name: string }) => (", "  <Stack>", "    <Card>", "      <Text>{`line one", "line two ${name}`}</Text>", "", "      <Text>After</Text>", "    </Card>", "  </Stack>", ");", ""].join("\n");
    check("wrap template literal lines: untouched", changedRows(wrapAt("wrap template literal", tpl, "<Card", "Card")), ["    <Box>", "      <Card>", "        <Text>{`line one", "line two ${name}`}</Text>", "", "        <Text>After</Text>", "      </Card>", "    </Box>"]);
    const crlf = `﻿${["import { Stack } from \"../../../components/Layout\";", "export const R = () => (", "  <Stack>", "    <Card>", "      <Text>Hi</Text>", "    </Card>", "  </Stack>", ");", ""].join("\r\n")}`;
    const result = wrapAt("wrap crlf bom", crlf, "<Card", "Card");
    check("wrap crlf bom: BOM and CRLF kept", [result.code.startsWith("﻿"), !/[^\r]\n/.test(result.code)], [true, true]);
    check("wrap crlf bom: output and loc without the BOM", [changedRows(result), result.wrapped.loc], [["    <Box>", "      <Card>", "        <Text>Hi</Text>", "      </Card>", "    </Box>"], "4:4"]);
    check("wrap snippets: false gives the same text", applyOps(src, locOf(src, "<Card"), "Card", [{ op: "wrap", tag: "Box", props: {} }], { file: PAGE, snippets: false }).code, wrapAt("wrap no snippets", src, "<Card", "Card").code);
  }
  // The example snippet follows: wrapped the same way on its own lines (escapes kept), or a reason.
  {
    const page = (extra = "", button = '<Button level="primary">Send</Button>') => [
      'import { Button } from "../../../components/Button";',
      'import { Stack } from "../../../components/Layout";',
      "function SendExample() {",
      "  return (",
      "    <Stack gap=\"md\">",
      `      ${button}`,
      "    </Stack>",
      "  );",
      "}",
      "export const examples = [",
      "  {",
      "    title: \"Send\",",
      "    code: `<Stack gap=\"md\">",
      `  ${button.replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}`,
      "</Stack>`,",
      "    render: () => <SendExample />,",
      `  },${extra}`,
      "];",
      "",
    ].join("\n");
    const result = wrapAt("wrap snippet", page(), "<Button", "Button", { props: { padding: str("sm") } });
    check("wrap snippet: synced", result.snippet, { synced: true });
    check("wrap snippet: the snippet's copy wrapped on its own lines", rows(result, 15, 19), ["    code: `<Stack gap=\"md\">", '  <Box padding="sm">', '    <Button level="primary">Send</Button>', "  </Box>", "</Stack>`,"]);
    check("wrap snippet: changed is the element's", result.changed, { from: 6, to: 8 });
    const root = wrapAt("wrap snippet root", page(), "<Stack gap", "Stack");
    check("wrap snippet root: the snippet's first line (after the backtick)", [root.snippet, rows(root, 15, 21)], [{ synced: true }, ["    code: `<Box>", '  <Stack gap="md">', '    <Button level="primary">Send</Button>', "  </Stack>", "</Box>`,", "    render: () => <SendExample />,", "  },"]]);
    const escaped = wrapAt("wrap snippet escapes", page("", "<Button level=\"primary\">{`Send ${1}`}</Button>"), "<Button", "Button");
    check("wrap snippet escapes: kept", [escaped.snippet, rows(escaped, 16, 18)], [{ synced: true }, ["  <Box>", "    <Button level=\"primary\">{\\`Send \\${1}\\`}</Button>", "  </Box>"]]);
    const missing = wrapAt("wrap snippet missing", page().replace("code: `<Stack gap=\"md\">\n  <Button level=\"primary\">Send</Button>", "code: `<Stack gap=\"md\">\n  <Button>Send</Button>"), "<Button", "Button");
    check("wrap snippet missing: reason, source still wrapped", [missing.snippet.synced, /does not show this code \(<Button>\)/.test(missing.snippet.reason), rows(missing, 6, 8)[0]], [false, true, "      <Box>"]);
    const twice = wrapAt("wrap snippet twice", page().replace("</Stack>`", "  <Button level=\"primary\">Send</Button>\n</Stack>`"), "<Button", "Button");
    check("wrap snippet twice: untouched", [twice.snippet.synced, /more than once/.test(twice.snippet.reason)], [false, true]);
    const shared = wrapAt("wrap snippet shared", page("\n  { title: \"Again\", code: `<SendExample />`, render: () => <SendExample /> },"), "<Button", "Button");
    check("wrap snippet: two examples render it → untouched", [shared.snippet.synced, /more than one example/.test(shared.snippet.reason)], [false, true]);
    check("wrap snippet: snippets: false → untouched, no report", (() => { const r = wrapAt("wrap snippet off", page(), "<Button", "Button", {}, { snippets: false }); return ["snippet" in r, rows(r, 16, 16)]; })(), [false, ['  <Button level="primary">Send</Button>']]);
    // A snippet above the element: its new lines move the wrapper's loc and changed range.
    const above = [
      'import { Button } from "../../../components/Button";',
      "export const examples = [",
      "  {",
      "    code: `<Button level=\"primary\">Send</Button>`,",
      "    render: () => <SendExample />,",
      "  },",
      "];",
      "function SendExample() {",
      "  return (",
      "    <div>",
      "      <Button level=\"primary\">Send</Button>",
      "    </div>",
      "  );",
      "}",
      "",
    ].join("\n");
    const moved = wrapAt("wrap snippet above", above, "<Button level=\"primary\">Send</Button>\n", "Button", {}, { nth: 0 });
    check("wrap snippet above: the snippet wrapped", [moved.snippet, rows(moved, 2, 8)], [{ synced: true }, ['import { Box } from "../../../components/Layout";', "export const examples = [", "  {", "    code: `<Box>", '  <Button level="primary">Send</Button>', "</Box>`,", "    render: () => <SendExample />,"]]);
    check("wrap snippet above: loc and changed moved by the import and the snippet", [moved.wrapped.loc, moved.changed], ["14:6", { from: 14, to: 16 }]);
  }
  // op "unwrap": a one-layer wrap undone (Ignore auto layout off on a floating Box): the exact text before the wrap.
  {
    const unwrapAt = (label, code, loc, name, { file = PAGE, snippets = true } = {}) => {
      const result = applyOps(code, loc, name, [{ op: "unwrap" }], { file, snippets });
      if ("error" in result) return result;
      const before = parseSource(code.replace(/^﻿/, ""));
      const after = parseSource(result.code.replace(/^﻿/, ""));
      ok(`${label}: re-parses`, after && after.errors.length <= before.errors.length);
      return result;
    };
    const float = { position: str("absolute"), constraintX: str("right"), insetRight: str("sm") };
    const roundTrip = (label, code, needle, name, opts = {}) => {
      const wrapped = wrapAt(`${label} (wrap)`, code, needle, name, { props: float }, opts);
      const back = unwrapAt(label, wrapped.code, wrapped.wrapped.loc, "Box", opts);
      check(`${label}: the text before the wrap`, back.code, code);
      check(`${label}: unwrapped.loc is the element`, [back.unwrapped?.loc, describeElement(back.code, opts.file ?? PAGE, back.unwrapped?.loc ?? "")?.name], [locOf(code, needle, opts.nth ?? 0), name]);
      return back;
    };
    roundTrip("unwrap own lines, Box import dropped", src, "<Card", "Card");
    roundTrip("unwrap self-closing", src, "<Divider", "Divider");
    roundTrip("unwrap a .map row: key back on the row", src, "<ListItem", "ListItem");
    roundTrip("unwrap inline .map row", src, "<Text key", "Text");
    roundTrip("unwrap inside a condition", src, "<Text>Open", "Text");
    roundTrip("unwrap template literal lines", ["export const T = ({ name }: { name: string }) => (", "  <Stack>", "    <Card>", "      <Text>{`line one", "line two ${name}`}</Text>", "", "      <Text>After</Text>", "    </Card>", "  </Stack>", ");", ""].join("\n"), "<Card", "Card");
    roundTrip("unwrap crlf bom", `﻿${["import { Stack } from \"../../../components/Layout\";", "export const R = () => (", "  <Stack>", "    <Card>", "      <Text>Hi</Text>", "    </Card>", "  </Stack>", ");", ""].join("\r\n")}`, "<Card", "Card");
    const page = [
      'import { Button } from "../../../components/Button";',
      'import { Stack } from "../../../components/Layout";',
      "function SendExample() {",
      "  return (",
      "    <Stack gap=\"md\">",
      '      <Button level="primary">Send</Button>',
      "    </Stack>",
      "  );",
      "}",
      "export const examples = [",
      "  {",
      "    title: \"Send\",",
      "    code: `<Stack gap=\"md\">",
      '  <Button level="primary">Send</Button>',
      "</Stack>`,",
      "    render: () => <SendExample />,",
      "  },",
      "];",
      "",
    ].join("\n");
    const synced = roundTrip("unwrap snippet", page, "<Button", "Button");
    check("unwrap snippet: synced", synced.snippet, { synced: true });
    // Another Box in the file keeps the import; the wrapper's props go with it.
    const kept = ['import { Box, Stack } from "../../../components/Layout";', "export const K = () => (", "  <Stack>", "    <Box padding=\"sm\">x</Box>", "    <Box position=\"absolute\" insetTop=\"xs\">", "      <b>y</b>", "    </Box>", "  </Stack>", ");", ""].join("\n");
    const keptResult = unwrapAt("unwrap Box still used", kept, locOf(kept, "<Box position"), "Box");
    check("unwrap Box still used: import kept, element out one level", [importLines(keptResult), keptResult.code.split("\n").slice(3, 6)], [['import { Box, Stack } from "../../../components/Layout";'], ["    <Box padding=\"sm\">x</Box>", "    <b>y</b>", "  </Stack>"]]);
    // Refusals: not a layout primitive, more than one layer, no layer, a comment beside the layer, another op beside it.
    const two = ["export const W = () => (", "  <Box>", "    <b>a</b>", "    <i>b</i>", "  </Box>", ");", ""].join("\n");
    check("unwrap two layers: refused", /more than its one layer/.test(unwrapAt("unwrap two", two, "2:2", "Box").error), true);
    const none = ["export const W = () => <Box>text</Box>;", ""].join("\n");
    check("unwrap no layer: refused", /holds no layer/.test(unwrapAt("unwrap none", none, "1:23", "Box").error), true);
    const comment = ["export const W = () => (", "  <Box>", "    {/* note */}", "    <b>a</b>", "  </Box>", ");", ""].join("\n");
    check("unwrap beside a comment: refused", unwrapAt("unwrap comment", comment, "2:2", "Box").code, "invalid");
    check("unwrap a Card: refused", unwrapAt("unwrap Card", src, locOf(src, "<Card"), "Card").error, "Only a Box, Stack, Grid can be unwrapped (not <Card>)");
    check("unwrap with another op: refused", applyOps(two, "2:2", "Box", [{ op: "unwrap" }, { op: "removeProp", name: "x" }]).error, "unwrap cannot be combined with other ops");
  }
}

/* ── wrap with siblings (op "wrap" + `with`: several layers of one parent into one Box/Stack, adjacent or moved up) ── */
{
  const repo = [fileURLToPath(new URL("../../", import.meta.url))].find((candidate) => fs.existsSync(path.join(candidate, "src/platform/studio/history.ts")));
  const history = repo ? await import(pathToFileURL(path.join(repo, "src/platform/studio/history.ts")).href) : null;
  const PAGE = "src/platform/examples/pages/wrap-many-selftest.tsx";
  const str = (value) => ({ kind: "string", value });
  const locOf = (code, needle, nth = 0) => {
    let at = -1;
    for (let i = 0; i <= nth; i += 1) at = code.indexOf(needle, at + 1);
    if (at < 0) throw new Error(`selftest: no ${needle} #${nth}`);
    const before = code.slice(0, at);
    return `${before.split(/\r?\n/).length}:${at - Math.max(before.lastIndexOf("\n"), -1) - 1}`;
  };
  /** Wrap the elements at `needles` ([needle, name, nth?], the first is the request's element) and run the checks every wrap must pass. */
  const wrapMany = (label, code, needles, op = {}, { file = PAGE, snippets = true, count = needles.length } = {}) => {
    const [[needle, name, nth = 0], ...others] = needles;
    const result = applyOps(code, locOf(code, needle, nth), name, [{ op: "wrap", tag: "Box", props: {}, with: others.map(([n, , k = 0]) => locOf(code, n, k)), ...op }], { file, snippets });
    if ("error" in result) return result;
    const before = parseSource(code);
    const after = parseSource(result.code);
    ok(`${label}: re-parses`, after && after.errors.length <= before.errors.length);
    const box = describeElement(result.code, file, result.wrapped?.loc ?? "");
    check(`${label}: wrapped.loc is the wrapper`, box?.name, op.tag ?? "Box");
    check(`${label}: the wrapper holds the layers`, (box?.children ?? []).filter((child) => child.kind !== "text" || child.value.trim()).length, count);
    if (history) {
      const patch = history.makePatch(code, result.code);
      check(`${label}: undo restores the original exactly`, history.textBeforeEdit(result.code, patch, true) === code, true);
    }
    return result;
  };
  const rows = (result, from, to) => result.code.split(/\r?\n/).slice(from - 1, to);
  const changedRows = (result) => rows(result, result.changed.from, result.changed.to);
  const importLines = (result) => result.code.split(/\r?\n/).filter((line) => line.startsWith("import"));
  const err = (result) => ("error" in result ? [result.code, result.error] : ["no error", ""]);

  const src = [
    'import { Button } from "../../../components/Button";',
    'import { Card } from "../../../components/Card";',
    'import { Stack } from "../../../components/Layout";',
    'import { Text } from "../../../components/Text";',
    "",
    "export function A({ items, open }: { items: { id: string; name: string }[]; open: boolean }) {",
    "  return (",
    "    <Stack gap=\"md\">",
    "      <Text>One</Text>",
    "      <Text>Two</Text>",
    "      {/* note */}",
    "      <Button>Go</Button>",
    "      <Card title=\"Plan\">",
    "        <Text>Pro</Text>",
    "      </Card>",
    "      {open && <Text>Open</Text>}",
    "      {items.map((item) => <Text key={item.id}>{item.name}</Text>)}",
    "      <span>Hi <b>bold</b> <i>it</i> <u>end</u></span>",
    "      <p>Hi <b>bold</b> <i>it</i></p>",
    "      <Button>A</Button><Button>B</Button>",
    "      <Text>Last</Text>",
    "    </Stack>",
    "  );",
    "}",
    "",
  ].join("\n");

  // Adjacent: wrapped where they stand, one level deeper; the tag joins the Layout import; the loc is the first one's.
  {
    const result = wrapMany("wrap many adjacent", src, [["<Text>One", "Text"], ["<Text>Two", "Text"]], { tag: "Stack", props: { direction: str("row"), gap: str("sm") } });
    check("wrap many adjacent: output", changedRows(result), ['      <Stack direction="row" gap="sm">', "        <Text>One</Text>", "        <Text>Two</Text>", "      </Stack>"]);
    check("wrap many adjacent: loc and changed", [result.wrapped.loc, result.changed], ["9:6", { from: 9, to: 12 }]);
    check("wrap many adjacent: Stack already imported", importLines(result)[2], 'import { Stack } from "../../../components/Layout";');
    const box = wrapMany("wrap many box", src, [["<Text>Two", "Text"], ["<Text>One", "Text"]]);
    check("wrap many box: order is the source's, whichever is the request's element", [changedRows(box), importLines(box)[2], box.wrapped.loc], [["      <Box>", "        <Text>One</Text>", "        <Text>Two</Text>", "      </Box>"], 'import { Box, Stack } from "../../../components/Layout";', "9:6"]);
  }
  // A {/* comment */} between adjacent layers goes in with them; a condition moves whole.
  {
    const comment = wrapMany("wrap many comment", src, [["<Text>Two", "Text"], ["<Button>Go", "Button"]]);
    check("wrap many comment: inside", changedRows(comment), ["      <Box>", "        <Text>Two</Text>", "        {/* note */}", "        <Button>Go</Button>", "      </Box>"]);
    const condition = wrapMany("wrap many condition", src, [["<Card", "Card"], ["<Text>Open", "Text"]]);
    check("wrap many condition: the whole {open && …}", changedRows(condition), ["      <Box>", '        <Card title="Plan">', "          <Text>Pro</Text>", "        </Card>", "        {open && <Text>Open</Text>}", "      </Box>"]);
  }
  // Not adjacent: the later layers move up into the wrapper after the first run; what sat between stays.
  {
    const result = wrapMany("wrap many moved", src, [["<Text>One", "Text"], ["<Card", "Card"], ["<Button>Go", "Button"]]);
    check("wrap many moved: output", rows(result, 9, 19), [
      "      <Box>",
      "        <Text>One</Text>",
      "        <Button>Go</Button>",
      '        <Card title="Plan">',
      "          <Text>Pro</Text>",
      "        </Card>",
      "      </Box>",
      "      <Text>Two</Text>",
      "      {/* note */}",
      "      {open && <Text>Open</Text>}",
      "      {items.map((item) => <Text key={item.id}>{item.name}</Text>)}",
    ]);
    check("wrap many moved: same line count + 2", result.code.split("\n").length, src.split("\n").length + 2);
    check("wrap many moved: changed spans the move", result.changed, { from: 9, to: 17 });
    const last = wrapMany("wrap many moved last", src, [["<Text>One", "Text"], ["<Text>Last", "Text"]]);
    check("wrap many moved last: the closing tag of the parent stays", rows(last, 9, 13).concat(rows(last, 23, 24)), ["      <Box>", "        <Text>One</Text>", "        <Text>Last</Text>", "      </Box>", "      <Text>Two</Text>", "      <Button>A</Button><Button>B</Button>", "    </Stack>"]);
  }
  // Inline: adjacent layers inside text get both tags around them; non-adjacent inline ones are refused.
  {
    const inline = wrapMany("wrap many inline", src, [["<b>bold</b> <i>", "b"], ["<i>it</i> <u>", "i"]]);
    check("wrap many inline: tags around them", rows(inline, 18, 18), ["      <span>Hi <Box><b>bold</b> <i>it</i></Box> <u>end</u></span>"]);
    const gap = applyOps(src, locOf(src, "<b>bold</b> <i>it</i> <u>"), "b", [{ op: "wrap", tag: "Box", props: {}, with: [locOf(src, "<u>end")] }], { file: PAGE });
    check("wrap many inline gap: refused", [gap.code, /shares its line/.test(gap.error)], ["invalid", true]);
    const shared = applyOps(src, locOf(src, "<Button>A"), "Button", [{ op: "wrap", tag: "Box", props: {}, with: [locOf(src, "<Text>Last")] }], { file: PAGE });
    check("wrap many shared line: adjacent B left out → refused", [shared.code, /shares its line/.test(shared.error)], ["invalid", true]);
    const both = wrapMany("wrap many same line", src, [["<Button>A", "Button"], ["<Button>B", "Button"]]);
    check("wrap many same line: wrapped together", changedRows(both), ["      <Box>", "        <Button>A</Button><Button>B</Button>", "      </Box>"]);
  }
  // Refusals: rows, parents, nesting, a paragraph, bad input; one named element is a single wrap.
  {
    check("wrap many map row: refused", err(applyOps(src, locOf(src, "<Text key"), "Text", [{ op: "wrap", tag: "Box", props: {}, with: [locOf(src, "<Text>Last")] }], { file: PAGE })).map((part, i) => (i ? /row of a list/.test(part) : part)), ["invalid", true]);
    check("wrap many parents: refused", err(applyOps(src, locOf(src, "<Text>One"), "Text", [{ op: "wrap", tag: "Box", props: {}, with: [locOf(src, "<Text>Pro")] }], { file: PAGE })).map((part, i) => (i ? /different parents/.test(part) : part)), ["invalid", true]);
    check("wrap many nested: refused", err(applyOps(src, locOf(src, "<Card"), "Card", [{ op: "wrap", tag: "Box", props: {}, with: [locOf(src, "<Text>Pro")] }], { file: PAGE })).map((part, i) => (i ? /is inside <Card>/.test(part) : part)), ["invalid", true]);
    check("wrap many paragraph: refused", err(applyOps(src, locOf(src, "<b>bold</b> <i>it</i></p>"), "b", [{ op: "wrap", tag: "Box", props: {}, with: [locOf(src, "<i>it</i></p>")] }], { file: PAGE })).map((part, i) => (i ? /paragraph/.test(part) : part)), ["invalid", true]);
    check("wrap many bad with", err(applyOps(src, locOf(src, "<Text>One"), "Text", [{ op: "wrap", tag: "Box", props: {}, with: "9:6" }], { file: PAGE }))[0], "invalid");
    check("wrap many missing loc", err(applyOps(src, locOf(src, "<Text>One"), "Text", [{ op: "wrap", tag: "Box", props: {}, with: ["99:1"] }], { file: PAGE }))[0], "not-found");
    const alone = applyOps(src, locOf(src, "<Text>One"), "Text", [{ op: "wrap", tag: "Box", props: {}, with: [locOf(src, "<Text>One")] }], { file: PAGE });
    check("wrap many alone = single wrap", alone.code, applyOps(src, locOf(src, "<Text>One"), "Text", [{ op: "wrap", tag: "Box", props: {} }], { file: PAGE }).code);
    const cloned = [
      'import { Button } from "../../../components/Button";',
      'import { FormActions } from "../../../components/Form";',
      "export const B = () => (",
      "  <FormActions>",
      "    <Button>Save</Button>",
      "    <Button>Cancel</Button>",
      "  </FormActions>",
      ");",
      "",
    ].join("\n");
    check("wrap many cloned: FormActions Buttons refused", err(applyOps(cloned, locOf(cloned, "<Button>Save"), "Button", [{ op: "wrap", tag: "Box", props: {}, with: [locOf(cloned, "<Button>Cancel")] }], { file: PAGE }))[0], "invalid");
    const chrome = ["// zen-studio-chrome", "export function C() {", "  return (", "    <div>", "      <b>x</b>", "      <i>y</i>", "    </div>", "  );", "}", ""].join("\n");
    check("wrap many chrome: forbidden", err(applyOps(chrome, locOf(chrome, "<b>"), "b", [{ op: "wrap", tag: "Box", props: {}, with: [locOf(chrome, "<i>")] }], { file: PAGE }))[0], "forbidden");
  }
  // The example snippet follows: the same region wrapped (or moved) in its copy, or a reason.
  {
    const page = (code = "  <Button>Send</Button>\n  <Button>Cancel</Button>\n  <Text>Note</Text>\n  <Button>Help</Button>") => [
      'import { Button } from "../../../components/Button";',
      'import { Stack } from "../../../components/Layout";',
      'import { Text } from "../../../components/Text";',
      "function SendExample() {",
      "  return (",
      "    <Stack gap=\"md\">",
      "      <Button>Send</Button>",
      "      <Button>Cancel</Button>",
      "      <Text>Note</Text>",
      "      <Button>Help</Button>",
      "    </Stack>",
      "  );",
      "}",
      "export const examples = [",
      "  {",
      "    title: \"Send\",",
      "    code: `<Stack gap=\"md\">",
      code,
      "</Stack>`,",
      "    render: () => <SendExample />,",
      "  },",
      "];",
      "",
    ].join("\n");
    const adjacent = wrapMany("wrap many snippet", page(), [["<Button>Send", "Button"], ["<Button>Cancel", "Button"]], { tag: "Stack", props: { direction: str("row"), gap: str("sm") } });
    check("wrap many snippet: synced", [adjacent.snippet, rows(adjacent, 19, 25)], [{ synced: true }, ['    code: `<Stack gap="md">', '  <Stack direction="row" gap="sm">', "    <Button>Send</Button>", "    <Button>Cancel</Button>", "  </Stack>", "  <Text>Note</Text>", "  <Button>Help</Button>"]]);
    const moved = wrapMany("wrap many snippet moved", page(), [["<Button>Send", "Button"], ["<Button>Help", "Button"]]);
    check("wrap many snippet moved: synced", [moved.snippet, rows(moved, 19, 26)], [{ synced: true }, ["    code: `<Stack gap=\"md\">", "  <Box>", "    <Button>Send</Button>", "    <Button>Help</Button>", "  </Box>", "  <Button>Cancel</Button>", "  <Text>Note</Text>", "</Stack>`,"]]);
    const missing = wrapMany("wrap many snippet missing", page("  <Button>Send</Button>\n  <Text>Note</Text>"), [["<Button>Send", "Button"], ["<Button>Cancel", "Button"]]);
    check("wrap many snippet missing: reason, source still wrapped", [missing.snippet.synced, /does not show this code \(<Button>, <Button>\)/.test(missing.snippet.reason)], [false, true]);
    const off = wrapMany("wrap many snippet off", page(), [["<Button>Send", "Button"], ["<Button>Cancel", "Button"]], {}, { snippets: false });
    check("wrap many snippet off: no report", "snippet" in off, false);
  }
}

/* ── admin drafts (drafts.mjs: draft bookkeeping, Save's rebase onto a changed disk, the persisted file) ───────── */
{
  const rows = (...items) => `${items.join("\n")}\n`;
  const base = rows("import { Button } from \"x\";", "", "export function A() {", "  return (", "    <div>", "      <em title=\"primary\">Go</em>", "      <p>one</p>", "      <p>two</p>", "      <p>three</p>", "      <p>four</p>", "      <p>five</p>", "      <span>end</span>", "    </div>", "  );", "}");
  const content = base.replace("title=\"primary\"", "title=\"tertiary\"");

  // nextDraft: a draft starts from the disk, keeps its base, and is dropped when it equals the disk again.
  const first = drafts.nextDraft(undefined, base, content, 1);
  check("drafts: new draft from the disk", first, { base, baseHash: sha1(base), content, updatedAt: 1 });
  const second = drafts.nextDraft(first, base.replace("one", "ONE"), content.replace("two", "TWO"), 2);
  check("drafts: a later change keeps the base", [second.base === base, second.baseHash, second.updatedAt], [true, sha1(base), 2]);
  check("drafts: content equal to the disk → no draft", drafts.nextDraft(first, base, base, 3), null);
  check("drafts: equal to a changed disk → no draft", drafts.nextDraft(first, "x\n", "x\n", 3), null);
  let threw = false;
  try { drafts.nextDraft(undefined, null, "x"); } catch { threw = true; }
  ok("drafts: a new draft needs the disk text", threw);

  // planSave: unchanged, plain write, rebase, conflicts.
  check("save: disk already holds the draft", await drafts.planSave(first, content), { text: content, rebased: false, unchanged: true });
  check("save: disk still the base → the draft", await drafts.planSave(first, base), { text: content, rebased: false });
  const outside = base.replace("<span>end</span>", "<span>END</span>");
  check("save: stale, other lines → rebased with both", await drafts.planSave(first, outside), { text: content.replace("<span>end</span>", "<span>END</span>"), rebased: true });
  const near = base.replace("<p>one</p>", "<p>ONE</p>");
  ok("save: stale, a context line changed → conflict", "conflict" in (await drafts.planSave(first, near)));
  const same = base.replace("title=\"primary\"", "title=\"accent\"");
  const clash = await drafts.planSave(first, same);
  ok("save: stale, the same line changed → conflict with a reason", "conflict" in clash && /changed/.test(clash.conflict));
  ok("save: gone from disk → conflict", "conflict" in (await drafts.planSave(first, null)));
  // Undone back to its base while the disk changed: no edits are left, so there is no draft (readers see the disk).
  check("drafts: undone to its base on a changed disk → no draft", drafts.nextDraft(first, outside, base, 4), null);
  // followDisk: a disk change re-applies the draft on the new text (both show), keeps it on a collision, drops it when
  // the disk now holds it.
  const followed = await drafts.followDisk(first, outside);
  check("follow: other lines changed → rebased onto the disk", followed.changed && followed.draft.base === outside && followed.draft.content === content.replace("<span>end</span>", "<span>END</span>") && followed.draft.baseHash === drafts.sha1(outside), true);
  check("follow: same line changed → kept as it was", await drafts.followDisk(first, same), { draft: first, changed: false });
  check("follow: disk still the base → kept", await drafts.followDisk(first, base), { draft: first, changed: false });
  check("follow: disk now holds the draft → dropped", await drafts.followDisk(first, content), { draft: null });
  check("follow: file gone → kept", await drafts.followDisk(first, null), { draft: first, changed: false });
  // Look-alikes: a copy of the drafted line elsewhere is left alone (its context differs); a copy of the drafted line
  // with its context makes the place ambiguous → refused, never written into the copy.
  const copy = "      <em title=\"primary\">Go</em>\n";
  const lookAlike = base.replace("      <span>end</span>\n", `      <span>end</span>\n${copy}`);
  check("save: a copy of the line elsewhere stays as it is", (await drafts.planSave(first, lookAlike)).text, content.replace("      <span>end</span>\n", `      <span>end</span>\n${copy}`));
  const twin = base.replace("      <span>end</span>\n", `      <span>end</span>\n  return (\n    <div>\n${copy}      <p>one</p>\n      <p>two</p>\n`);
  ok("save: drafted lines and their context duplicated on disk → conflict", "conflict" in (await drafts.planSave(first, twin)));
  // Two separate hunks (top and bottom): an outside change between them keeps both.
  const two = drafts.nextDraft(undefined, base, base.replace("import { Button }", "import { Button, Text }").replace("<span>end</span>", "<span>fin</span>"), 5);
  const middle = base.replace("<p>three</p>", "<p>THREE</p>");
  check("save: two hunks around an outside change", (await drafts.planSave(two, middle)).text, two.content.replace("<p>three</p>", "<p>THREE</p>"));
  // CRLF files keep their line endings through the rebase.
  const crlf = base.replace(/\n/g, "\r\n");
  const crlfDraft = drafts.nextDraft(undefined, crlf, crlf.replace("primary", "tertiary"), 6);
  check("save: CRLF rebase", (await drafts.planSave(crlfDraft, crlf.replace("end", "END"))).text, crlf.replace("primary", "tertiary").replace("end", "END"));
  check("rebase: disk = base → the draft", await drafts.rebaseDraft(base, content, base), content);
  check("rebase: draft = base → the disk", await drafts.rebaseDraft(base, base, outside), outside);

  // changedLines (git numstat-like).
  check("lines: same", drafts.changedLines(base, base), { added: 0, removed: 0 });
  check("lines: one changed line", drafts.changedLines(base, content), { added: 1, removed: 1 });
  check("lines: inserted", drafts.changedLines("a\nb\n", "a\nx\ny\nb\n"), { added: 2, removed: 0 });
  check("lines: deleted", drafts.changedLines("a\nx\ny\nb\n", "a\nb\n"), { added: 0, removed: 2 });
  check("lines: from empty", drafts.changedLines("", "a\nb\n"), { added: 2, removed: 0 });
  check("lines: last line break", drafts.changedLines("a\nb", "a\nb\n"), { added: 1, removed: 1 });
  check("lines: moved line", drafts.changedLines("a\nb\nc\n", "b\nc\na\n"), { added: 1, removed: 1 });

  // draftInfo (a GET /drafts row).
  check("info: fresh", drafts.draftInfo("src/platform/x.tsx", first, base), { file: "src/platform/x.tsx", baseHash: sha1(base), diskHash: sha1(base), stale: false, changedLines: { added: 1, removed: 1 }, updatedAt: 1 });
  check("info: stale", [drafts.draftInfo("f", first, outside).stale, drafts.draftInfo("f", first, outside).diskHash], [true, sha1(outside)]);
  check("info: gone", [drafts.draftInfo("f", first, null).stale, drafts.draftInfo("f", first, null).diskHash], [true, null]);

  // The persisted file: round trip, tolerant parse.
  const store = new Map([["src/platform/b.tsx", second], ["src/platform/a.tsx", first]]);
  const text = drafts.serializeDrafts(store);
  ok("persist: files sorted", text.indexOf("src/platform/a.tsx") < text.indexOf("src/platform/b.tsx"));
  const back = drafts.parseDrafts(text);
  check("persist: round trip", [[...back.drafts.keys()], back.drafts.get("src/platform/a.tsx"), back.dropped, back.error], [["src/platform/a.tsx", "src/platform/b.tsx"], first, 0, undefined]);
  check("persist: not JSON", drafts.parseDrafts("{oops").error, "not JSON");
  check("persist: another format", drafts.parseDrafts(JSON.stringify({ format: 99, drafts: {} })).error, "not a Zen Studio drafts file");
  check("persist: drafts not an object", drafts.parseDrafts(JSON.stringify({ format: 1, drafts: [] })).error, "not a Zen Studio drafts file");
  const mixed = JSON.stringify({ format: 1, drafts: {
    "src/platform/ok.tsx": { base: "a\n", baseHash: sha1("a\n"), content: "b\n", updatedAt: "soon" },
    "src/platform/bad-hash.tsx": { base: "a\n", baseHash: sha1("x"), content: "b\n", updatedAt: 1 },
    "src/platform/no-content.tsx": { base: "a\n", baseHash: sha1("a\n"), updatedAt: 1 },
    "../outside.tsx": { base: "a\n", baseHash: sha1("a\n"), content: "b\n", updatedAt: 1 },
    "src/platform/null.tsx": null,
  } });
  const parsed = drafts.parseDrafts(mixed, (file) => file.startsWith("src/"));
  check("persist: bad entries dropped", [[...parsed.drafts.keys()], parsed.dropped, parsed.drafts.get("src/platform/ok.tsx").updatedAt], [["src/platform/ok.tsx"], 4, 0]);

  // Fuzz: a draft edit and a disk edit (each replacing lines with new ones) rebase to both edits, or are refused;
  // never anything else. Lines repeat (a small vocabulary) so look-alikes occur.
  let seed = 11;
  const rand = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  let merged = 0;
  let refused = 0;
  let wrong = 0;
  for (let run = 0; run < 1500; run += 1) {
    const count = 6 + rand(30);
    const lines = Array.from({ length: count }, () => `  <p>${rand(count * 2)}</p>\n`);
    const replace = (list, from, length, fresh) => [...list.slice(0, from), ...fresh, ...list.slice(from + length)];
    const a = rand(count);
    const aLength = rand(Math.min(3, count - a) + 1);
    let b = rand(count);
    const bLength = rand(Math.min(3, count - b) + 1);
    if (b < a + aLength && a < b + bLength) b = (a + aLength + rand(4)) % count; // mostly separate
    const ours = Array.from({ length: 1 + rand(2) }, (_, k) => `  <b>draft ${run}.${k}</b>\n`);
    const theirs = Array.from({ length: 1 + rand(2) }, (_, k) => `  <i>disk ${run}.${k}</i>\n`);
    const baseText = lines.join("");
    const draftText = replace(lines, a, aLength, ours).join("");
    const diskText = replace(lines, b, Math.min(bLength, count - b), theirs).join("");
    const overlap = b < a + aLength && a < b + Math.min(bLength, count - b);
    const result = await drafts.rebaseDraft(baseText, draftText, diskText);
    if (result === null) { refused += 1; continue; }
    const [first, firstLength, firstFresh, last, lastLength, lastFresh] = a <= b ? [a, aLength, ours, b, Math.min(bLength, count - b), theirs] : [b, Math.min(bLength, count - b), theirs, a, aLength, ours];
    const expected = overlap ? null : replace(replace(lines, last, lastLength, lastFresh), first, firstLength, firstFresh).join("");
    if (result === expected) merged += 1;
    else wrong += 1;
  }
  check("rebase fuzz: never a wrong merge", wrong, 0);
  ok(`rebase fuzz: most separate edits merge (${merged} merged, ${refused} refused)`, merged > refused);
}

const total = passed + failures.length;
if (failures.length) {
  console.error(`zen-studio selftest: ${failures.length} of ${total} checks failed\n`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`zen-studio selftest: ${total} checks passed`);

// The Studio's undo history (src/platform/studio/history.ts: context hunks, never a write on a look-alike) has its own
// test with a fuzz; Node imports the .ts module directly (type stripping). The repo is two folders up (tools/studio),
// or, for a copy of this file elsewhere, where its node_modules (@babel/parser) resolve.
const historyTest = "src/platform/studio/history.selftest.mjs";
const repoRoots = [fileURLToPath(new URL("../../", import.meta.url))];
try {
  const parser = createRequire(import.meta.url).resolve("@babel/parser");
  repoRoots.push(parser.slice(0, parser.lastIndexOf(`${path.sep}node_modules${path.sep}`)));
} catch {
  // no other place to look
}
const historyPath = repoRoots.map((root) => path.join(root, historyTest)).find((candidate) => fs.existsSync(candidate));
if (!historyPath) {
  console.error(`zen-studio selftest: ${historyTest} not found`);
  process.exit(1);
}
const history = spawnSync(process.execPath, [historyPath], { encoding: "utf8" });
process.stdout.write(history.stdout);
process.stderr.write(history.stderr);
if (history.status !== 0) process.exit(1);

// Save and Discard per frame (frame-scope.mjs) have their own test next to it.
const frameScope = spawnSync(process.execPath, [fileURLToPath(new URL("./frame-scope.selftest.mjs", import.meta.url))], { encoding: "utf8" });
process.stdout.write(frameScope.stdout);
process.stderr.write(frameScope.stderr);
if (frameScope.status !== 0) process.exit(1);

// The slot ops (slots.mjs) have their own test next to it (it also runs tsc, style-guard and usage-guard on drafts).
const slots = spawnSync(process.execPath, [fileURLToPath(new URL("./slots.selftest.mjs", import.meta.url))], { encoding: "utf8" });
process.stdout.write(slots.stdout);
process.stderr.write(slots.stderr);
if (slots.status !== 0) process.exit(1);

// Drag to reorder / reparent / copy (op moveTo, arrange.mjs) has its own test next to it.
const arrange = spawnSync(process.execPath, [fileURLToPath(new URL("./arrange.selftest.mjs", import.meta.url))], { encoding: "utf8" });
process.stdout.write(arrange.stdout);
process.stderr.write(arrange.stderr);
if (arrange.status !== 0) process.exit(1);

// Data-slot items (insertItem, removeItem, duplicateItem, moveItem; items.mjs) have their own test next to it.
const items = spawnSync(process.execPath, [fileURLToPath(new URL("./items.selftest.mjs", import.meta.url))], { encoding: "utf8" });
process.stdout.write(items.stdout);
process.stderr.write(items.stderr);
if (items.status !== 0) process.exit(1);

// Figma property groups (inspector/propGroups.ts) have their own test next to them.
const propGroups = spawnSync(process.execPath, [fileURLToPath(new URL("../../src/platform/studio/inspector/propGroups.selftest.mjs", import.meta.url))], { encoding: "utf8" });
process.stdout.write(propGroups.stdout);
process.stderr.write(propGroups.stderr);
if (propGroups.status !== 0) process.exit(1);

// Props a component takes from another component's props type (inspector/inheritedProps.ts): its own test next to it.
const inherited = spawnSync(process.execPath, [fileURLToPath(new URL("../../src/platform/studio/inspector/inheritedProps.selftest.mjs", import.meta.url))], { encoding: "utf8" });
process.stdout.write(inherited.stdout);
process.stderr.write(inherited.stderr);
if (inherited.status !== 0) process.exit(1);

// Reset all overrides (inspector/resetAll.ts: which written props go back to their default) has its own test next to it.
const resetAll = spawnSync(process.execPath, [fileURLToPath(new URL("../../src/platform/studio/inspector/resetAll.selftest.mjs", import.meta.url))], { encoding: "utf8" });
process.stdout.write(resetAll.stdout);
process.stderr.write(resetAll.stderr);
if (resetAll.status !== 0) process.exit(1);

// The icon picker's suggestions (inspector/iconSuggestions.ts: Figma default, the file's icons) have their own test.
const iconSuggestions = spawnSync(process.execPath, [fileURLToPath(new URL("../../src/platform/studio/inspector/iconSuggestions.selftest.mjs", import.meta.url))], { encoding: "utf8" });
process.stdout.write(iconSuggestions.stdout);
process.stderr.write(iconSuggestions.stderr);
if (iconSuggestions.status !== 0) process.exit(1);

// Which components Detach can turn into primitives (detachable.ts, kept in step with detach.mjs's recipes).
const detachable = spawnSync(process.execPath, [fileURLToPath(new URL("../../src/platform/studio/detachable.selftest.mjs", import.meta.url))], { encoding: "utf8" });
process.stdout.write(detachable.stdout);
process.stderr.write(detachable.stderr);
if (detachable.status !== 0) process.exit(1);

// Starters (builder/starters/toDialect.ts: a frame's snapshot written as a builder page) have their own test.
const starters = spawnSync(process.execPath, [fileURLToPath(new URL("../../src/platform/studio/builder/starters/toDialect.selftest.mjs", import.meta.url))], { encoding: "utf8" });
process.stdout.write(starters.stdout);
process.stderr.write(starters.stderr);
if (starters.status !== 0) process.exit(1);

// Export (compile.mjs: a builder page as React, type-checked and harnessed) and its stand-in list have their own test.
const compiled = spawnSync(process.execPath, [fileURLToPath(new URL("./compile.selftest.mjs", import.meta.url))], { encoding: "utf8" });
process.stdout.write(compiled.stdout);
process.stderr.write(compiled.stderr);
if (compiled.status !== 0) process.exit(1);
const compileApi = spawnSync(process.execPath, [fileURLToPath(new URL("./compile-api-build.mjs", import.meta.url)), "--check"], { encoding: "utf8" });
process.stdout.write(compileApi.stdout);
process.stderr.write(compileApi.stderr);
if (compileApi.status !== 0) process.exit(1);
const zip = spawnSync(process.execPath, [fileURLToPath(new URL("./zip.selftest.mjs", import.meta.url))], { encoding: "utf8" });
process.stdout.write(zip.stdout);
process.stderr.write(zip.stderr);
if (zip.status !== 0) process.exit(1);
const handoff = spawnSync(process.execPath, [fileURLToPath(new URL("../../src/platform/studio/builder/export/handoff.selftest.mjs", import.meta.url))], { encoding: "utf8" });
process.stdout.write(handoff.stdout);
process.stderr.write(handoff.stderr);
if (handoff.status !== 0) process.exit(1);
const promoteTest = spawnSync(process.execPath, [fileURLToPath(new URL("./promote.selftest.mjs", import.meta.url))], { encoding: "utf8" });
process.stdout.write(promoteTest.stdout);
process.stderr.write(promoteTest.stderr);
if (promoteTest.status !== 0) process.exit(1);

// The Position section's model (Ignore auto layout, constraints, token offsets) has its own test next to it.
const position = spawnSync(process.execPath, [fileURLToPath(new URL("../../src/platform/studio/position/positionModel.selftest.mjs", import.meta.url))], { encoding: "utf8" });
process.stdout.write(position.stdout);
process.stderr.write(position.stderr);
if (position.status !== 0) process.exit(1);
