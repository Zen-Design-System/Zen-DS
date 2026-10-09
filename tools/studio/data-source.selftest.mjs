#!/usr/bin/env node
// Self-test of tools/studio/data-source.mjs (WP-C): originOf, dataFieldEdit and dataRowEdit on in-memory files. No
// server, no disk.
import assert from "node:assert/strict";
import { dataFieldEdit, dataRowEdit, isDataFile, originOf } from "./data-source.mjs";

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
const locOf = (needle, name, text = page) => {
  const lines = text.split("\n");
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

/* ── rows: removeElement / duplicateElement with `row` edit the list the .map reads (dataRowEdit) ── */

const rowAt = (needle, name, op, text = page) => dataRowEdit(text, PAGE, locOf(needle, name, text), name, op, { read });
const lists = [
  "import { useState } from \"react\";",
  "import { colours } from \"../data\";",
  "const steps = [{ id: 1, label: \"Plan\" }, { id: 2, label: \"Build\" }];",
  "const names = ['Ava Chen', 'Bao Le'];",
  "export function Lists() {",
  "  const [items] = useState(() => [{ id: \"x\" }]);",
  "  return (",
  "    <Stack>",
  "      {colours.map((colour) => <Tag key={colour} label={colour} />)}",
  "      {steps.map((step) => <Step key={step.id} label={step.label} />)}",
  "      {names.map((who, index) => <Avatar key={index} name={who} />)}",
  "      {names.map((who) => <Chip label={who} />)}",
  "      {items.map((item) => <Row key={item.id} />)}",
  "      {steps.map((step) => <Card key={`${step.id}-${step.label}`} />)}",
  "      {steps.map((step) => <Panel key={step.id}><Text>{step.label}</Text></Panel>)}",
  "    </Stack>",
  "  );",
  "}",
  "",
].join("\n");

test("row remove: a const list on lines of its own loses the row's line", () => {
  const result = rowAt("title={one.name}", "ListItem", { op: "removeElement", row: 0 });
  assert.equal(result.file, PAGE);
  assert.match(result.code, /const crew = \[\n {2}\{ id: "bao", name: "Bao Le"/);
  assert.doesNotMatch(result.code, /Ava Tran/);
  assert.equal(result.index, 0);
  assert.equal(result.state, false);
  // The element sits below its list: its loc moves up one line.
  const [line, column] = locOf("title={one.name}", "ListItem").split(":").map(Number);
  assert.equal(result.loc, `${line - 1}:${column}`);
  // The last row goes with the comma before it; the only row leaves an empty list.
  const last = rowAt("title={one.name}", "ListItem", { op: "removeElement", row: 1 });
  assert.match(last.code, /\{ id: "ava", name: "Ava Tran", role: "Design lead" \},\n\];/);
  const once = dataRowEdit(last.code, PAGE, locOf("title={one.name}", "ListItem", last.code), "ListItem", { op: "removeElement", row: 0 }, { read });
  assert.match(once.code, /const crew = \[\];/);
});

test("row duplicate: the copy follows the row, its string key gets a new value", () => {
  const result = rowAt("title={one.name}", "ListItem", { op: "duplicateElement", row: 0 });
  assert.match(result.code, /\{ id: "ava", name: "Ava Tran", role: "Design lead" \},\n {2}\{ id: "ava-copy", name: "Ava Tran", role: "Design lead" \},\n {2}\{ id: "bao"/);
  const again = dataRowEdit(result.code, PAGE, locOf("title={one.name}", "ListItem", result.code), "ListItem", { op: "duplicateElement", row: 0 }, { read });
  assert.match(again.code, /id: "ava-copy-2"/);
  // A key in a destructured field, behind .slice(1): row 0 is crew[1].
  const sliced = rowAt("<Badge key={name}", "Badge", { op: "duplicateElement", row: 0 });
  assert.equal(sliced.index, 1);
  assert.match(sliced.code, /name: "Bao Le copy"/);
});

test("row edits in another file, state, numbers, the index and no key", () => {
  const imported = rowAt("<Tag key={colour}", "Tag", { op: "duplicateElement", row: 1 }, lists);
  assert.equal(imported.file, DATA);
  assert.match(imported.code, /export const colours = \["red", "blue", "blue-copy"\];/);
  assert.match(rowAt("<Tag key={colour}", "Tag", { op: "removeElement", row: 0 }, lists).code, /export const colours = \["blue"\];/);
  assert.match(rowAt("<Step key={step.id}", "Step", { op: "duplicateElement", row: 0 }, lists).code, /\[\{ id: 1, label: "Plan" \}, \{ id: 3, label: "Plan" \}, \{ id: 2/);
  assert.match(rowAt("<Avatar key={index}", "Avatar", { op: "duplicateElement", row: 1 }, lists).code, /\['Ava Chen', 'Bao Le', 'Bao Le'\]/);
  assert.match(rowAt("<Chip label={who}", "Chip", { op: "duplicateElement", row: 0 }, lists).code, /\['Ava Chen', 'Ava Chen', 'Bao Le'\]/);
  const state = rowAt("{rows.map", "Text", { op: "duplicateElement", row: 1 });
  assert.equal(state.state, true);
  assert.match(state.code, /useState\(\[\{ title: "One" \}, \{ title: "Two" \}, \{ title: "Two copy" \}\]\)/);
});

test("row edits refused: a key built in code, items that are not data, filters, a lazy initializer", () => {
  assert.match(rowAt("<Card key=", "Card", { op: "duplicateElement", row: 0 }, lists).error, /key is built in the code/);
  assert.match(rowAt("[people.ava, people.bao]", "ListItem", { op: "duplicateElement", row: 0 }).error, /not written as text or a number/);
  assert.match(rowAt("crew.filter", "Tag", { op: "removeElement", row: 0 }).error, /filter/);
  assert.match(rowAt("<Row key={item.id}", "Row", { op: "removeElement", row: 0 }, lists).error, /starts from code/);
  assert.match(rowAt("title={one.name}", "ListItem", { op: "removeElement" }).error, /row index/);
  assert.match(rowAt("title={one.name}", "ListItem", { op: "removeElement", row: 5 }).error, /no row 6/);
  // A copy without a key change: removing a row of the inline list of members still works (no key involved).
  assert.match(rowAt("[people.ava, people.bao]", "ListItem", { op: "removeElement", row: 0 }).code, /\{\[people\.bao\]\.map/);
});

test("row move: the row swaps with the one before or after it in its data", () => {
  const down = rowAt("title={one.name}", "ListItem", { op: "moveElement", to: "next", row: 0 });
  assert.match(down.code, /const crew = \[\n {2}\{ id: "bao"[^\n]*\},\n {2}\{ id: "ava"[^\n]*\},\n\];/);
  // The swap keeps the text's length and lines: the element stays where it is.
  assert.equal(down.loc, locOf("title={one.name}", "ListItem"));
  assert.match(rowAt("<Tag key={colour}", "Tag", { op: "moveElement", to: "prev", row: 1 }, lists).code, /export const colours = \["blue", "red"\];/);
  assert.match(rowAt("title={one.name}", "ListItem", { op: "moveElement", to: "prev", row: 0 }).error, /already the first row/);
  assert.match(rowAt("title={one.name}", "ListItem", { op: "moveElement", to: "next", row: 1 }).error, /already the last row/);
  // Behind .slice(1) the first row shown is crew[1]: it cannot pass crew[0], which the canvas does not show.
  assert.match(rowAt("<Badge key={name}", "Badge", { op: "moveElement", to: "prev", row: 0 }).error, /already the first row/);
});

test("not a row's root: the op edits the code as usual", () => {
  assert.deepEqual(rowAt("<Panel key={step.id}><Text>", "Text", { op: "removeElement", row: 0 }, lists), { notRow: true });
  assert.deepEqual(rowAt("<Button size={size}", "Button", { op: "removeElement", row: 0 }), { notRow: true });
});

if (process.exitCode) console.log(`data-source self-test: failures above (${passed} passed)`);
else console.log(`✓ data-source (originOf · setDataField · row edits) self-test: ${passed} cases`);
