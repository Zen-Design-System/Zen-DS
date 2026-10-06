#!/usr/bin/env node
// Self-test of tools/studio/data-source.mjs (WP-C): originOf and dataFieldEdit on in-memory files. No server, no disk.
import assert from "node:assert/strict";
import { dataFieldEdit, isDataFile, originOf } from "./data-source.mjs";

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed += 1;
  } catch (error) {
    console.error(`✗ ${name}\n  ${error.message}`);
    process.exitCode = 1;
  }
};

const PAGE = "src/platform/examples/pages/demo.tsx";
const DATA = "src/platform/examples/data.ts";
const files = new Map([
  [DATA, [
    "const person = (id: string, name: string, role: string, extra: Partial<{ online: boolean }> = {}) => ({ id, name, role, email: `${id}@x`, ...extra });",
    "export const people = {",
    "  ava: person(\"ava\", \"Ava Chen\", \"UX Researcher\"),",
    "  bao: person('bao', 'Bao Nguyen', 'Frontend Engineer'),",
    "};",
    "export const studio = { name: \"Đìzai Studio\", seats: 12 };",
    "export const colours = [\"red\", \"blue\"];",
    "",
  ].join("\n")],
]);
const read = (rel) => files.get(rel) ?? null;

const page = [
  "import { useState } from \"react\";",
  "import { people, studio } from \"../data\";",
  "const crew = [",
  "  { id: \"ava\", name: \"Ava Tran\", role: \"Design lead\" },",
  "  { id: \"bao\", name: \"Bao Le\", role: \"Engineer\", seats: 3, active: true },",
  "];",
  "export function Demo() {",
  "  const [size, setSize] = useState(\"md\");",
  "  const [rows] = useState([{ title: \"One\" }, { title: \"Two\" }]);",
  "  const label = size === \"md\" ? \"Big\" : \"Small\";",
  "  return (",
  "    <Stack>",
  "      {crew.map((one) => <ListItem key={one.id} title={one.name} caption={one.role} />)}",
  "      {crew.slice(1).map(({ name, seats }) => <Badge key={name} count={seats}>{name}</Badge>)}",
  "      {[people.ava, people.bao].map((person) => <ListItem key={person.id} title={person.name} caption={person.role} />)}",
  "      {crew.filter((one) => one.active).map((one) => <Tag key={one.id} label={one.name} />)}",
  "      {rows.map((row) => <Text key={row.title}>{row.title}</Text>)}",
  "      <Text title={studio.name}>{label}</Text>",
  "      <Button size={size} level={size === \"md\" ? \"primary\" : \"tertiary\"}>Go</Button>",
  "    </Stack>",
  "  );",
  "}",
  "",
].join("\n");

/** loc of the first `<Name` whose line contains `needle`. */
const locOf = (needle, name) => {
  const lines = page.split("\n");
  const line = lines.findIndex((text) => text.includes(needle));
  assert.ok(line >= 0, `no line with ${needle}`);
  const column = lines[line].indexOf(`<${name}`);
  return `${line + 1}:${column}`;
};
const editAt = (needle, name, op) => dataFieldEdit(page, PAGE, locOf(needle, name), name, op, { read });

test("isDataFile: platform and template data, never the Studio or components", () => {
  assert.equal(isDataFile(DATA), true);
  assert.equal(isDataFile("src/templates/hr/data.ts"), true);
  assert.equal(isDataFile("src/platform/studio/store.ts"), false);
  assert.equal(isDataFile("src/components/Button/Button.tsx"), false);
});

test("origin: a .map row over a same-file const", () => {
  const origin = originOf(page, PAGE, locOf("title={one.name}", "ListItem"), { prop: "title" }, { read });
  assert.equal(origin.kind, "row");
  assert.equal(origin.editable, true);
  assert.deepEqual(origin.path, ["name"]);
});

test("edit: crew[1].name in the const, the file's own quotes", () => {
  const result = editAt("title={one.name}", "ListItem", { prop: "title", row: 1, value: { kind: "string", value: "Bao L." } });
  assert.ok(!result.error, result.error);
  assert.equal(result.file, PAGE);
  assert.match(result.code, /\{ id: "bao", name: "Bao L\.", role: "Engineer"/);
  assert.equal(result.source, "crew[1].name");
});

test("edit: .slice(1) shifts the row; a destructured param; a number field", () => {
  const result = editAt("count={seats}", "Badge", { prop: "count", row: 0, value: { kind: "number", value: 5 } });
  assert.ok(!result.error, result.error);
  assert.match(result.code, /role: "Engineer", seats: 5, active: true/);
});

test("edit: an expression child of a .map row", () => {
  const result = editAt("count={seats}", "Badge", { child: 0, row: 0, value: { kind: "string", value: "Bao" } });
  assert.ok(!result.error, result.error);
  assert.match(result.code, /\{ id: "bao", name: "Bao", role/);
});

test("edit: a row of member items resolved in an import, through a factory, single quotes kept", () => {
  const origin = originOf(page, PAGE, locOf("caption={person.role}", "ListItem"), { prop: "caption" }, { read });
  assert.equal(origin.kind, "row");
  assert.equal(origin.editable, true);
  assert.equal(origin.file, DATA);
  const result = editAt("caption={person.role}", "ListItem", { prop: "caption", row: 1, value: { kind: "string", value: "Engineer" } });
  assert.ok(!result.error, result.error);
  assert.equal(result.file, DATA);
  assert.match(result.code, /bao: person\('bao', 'Bao Nguyen', 'Engineer'\)/);
});

test("edit: a field the factory computes is refused with the reason", () => {
  const result = dataFieldEdit(page.replace("caption={person.role}", "caption={person.email}"), PAGE, locOf("caption={person.role}", "ListItem"), "ListItem", { prop: "caption", row: 0, value: { kind: "string", value: "x" } }, { read });
  assert.match(result.error, /person\(…\) builds "email" in its own code/);
});

test("refused: rows filtered before .map (a canvas row is not the data's row)", () => {
  const origin = originOf(page, PAGE, locOf("label={one.name}", "Tag"), { prop: "label" }, { read });
  assert.equal(origin.editable, false);
  assert.match(origin.reason, /filter\(…\) before \.map/);
});

test("rows from a useState initializer are state: refused here (setStateInit's job)", () => {
  const result = editAt("{row.title}", "Text", { child: 0, row: 1, value: { kind: "string", value: "Deux" } });
  assert.match(result.error, /state the example changes/);
});

test("data read by path from an import: studio.name", () => {
  const origin = originOf(page, PAGE, locOf("title={studio.name}", "Text"), { prop: "title" }, { read });
  assert.equal(origin.kind, "data");
  assert.equal(origin.editable, true);
  const result = editAt("title={studio.name}", "Text", { prop: "title", value: { kind: "string", value: "Dizai" } });
  assert.ok(!result.error, result.error);
  assert.equal(result.file, DATA);
  assert.match(result.code, /export const studio = \{ name: "Dizai", seats: 12 \};/);
});

test("state, conditional and computed values say why", () => {
  assert.equal(originOf(page, PAGE, locOf("<Button size={size}", "Button"), { prop: "size" }, { read }).kind, "state");
  assert.equal(originOf(page, PAGE, locOf("<Button size={size}", "Button"), { prop: "level" }, { read }).kind, "conditional");
  const child = originOf(page, PAGE, locOf("title={studio.name}", "Text"), { child: 0 }, { read });
  assert.equal(child.editable, false);
  assert.match(editAt("<Button size={size}", "Button", { prop: "size", value: { kind: "string", value: "sm" } }).error, /initial value/);
});

test("bad input: row missing, literal prop, wrong value kind, stale name", () => {
  assert.match(editAt("title={one.name}", "ListItem", { prop: "title", value: { kind: "string", value: "x" } }).error, /row index/);
  assert.match(editAt("title={one.name}", "ListItem", { prop: "title", row: 0, value: { kind: "expression", code: "x" } }).error, /string, number or boolean/);
  assert.match(dataFieldEdit(page, PAGE, locOf("title={one.name}", "ListItem"), "Badge", { prop: "title", row: 0, value: { kind: "string", value: "x" } }, { read }).error, /Expected <Badge>/);
  assert.match(editAt("title={one.name}", "ListItem", { prop: "title", row: 9, value: { kind: "string", value: "x" } }).error, /no row 10/);
});

if (process.exitCode) console.log(`data-source self-test: failures above (${passed} passed)`);
else console.log(`✓ data-source (originOf · setDataField) self-test: ${passed} cases`);
