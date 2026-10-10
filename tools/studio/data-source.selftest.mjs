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

/* ── Table cells (2026-10-10): a column's cell reads the row the Table draws, named by its key ──────────────────── */

const TABLES = "src/templates/TableDemo.tsx";
const tables = [
  "import { useMemo, useState } from \"react\";",
  "import { people } from \"../platform/examples/data\";",
  "const members = [",
  "  { id: \"ava\", hours: 36.5 },",
  "  { id: \"bao\", hours: 44.5 },",
  "];",
  "const teams = { design: { name: \"Design\" }, eng: { name: \"Engineering\" } };",
  "const memberColumns = [",
  "  { id: \"name\", header: \"Name\", cell: (member) => <TableMedia caption={people[member.id].role}>{people[member.id].name}</TableMedia> },",
  "  { id: \"hours\", header: \"Hours\", cell: (member) => <TableText>{member.hours}</TableText> },",
  "];",
  "const invoices = [",
  "  { number: \"INV-1\", client: \"Phin & Co\", team: \"design\", amount: 2100 },",
  "  { number: \"INV-2\", client: \"Lumen Bank\", team: \"eng\", amount: 4050 },",
  "];",
  "export function Demo() {",
  "  const [sort] = useState(null);",
  "  const [rows] = useState(invoices);",
  "  const shown = useMemo(() => rows.filter((row) => row.amount > 0), [rows]);",
  "  return (",
  "    <Stack>",
  "      <Table aria-label=\"Team\" columns={memberColumns} rows={sortMembers(members, sort)} />",
  "      <Table aria-label=\"Invoices\" getRowId={(row) => row.number} rows={shown} columns={[",
  "        { id: \"client\", header: \"Client\", cell: (row) => <TableText>{row.client}</TableText> },",
  "        { id: \"team\", header: \"Team\", cell: (row) => { const team = teams[row.team]; return <TableText>{team.name}</TableText>; } },",
  "        { id: \"amount\", header: \"Amount\", cell: (row) => <TableText>{money(row.amount)}</TableText> },",
  "      ]} />",
  "      <Table aria-label=\"Projects\" columns={[{ id: \"name\", header: \"Name\" }, { id: \"due\", header: \"Due\", field: \"due\" }]} rows={[",
  "        { id: \"loyalty\", name: \"Loyalty app\", due: \"Oct 14\" },",
  "        { id: \"banking\", name: \"Online banking\", due: \"Nov 2\" },",
  "      ]} />",
  "      <Table aria-label=\"Again\" columns={memberColumns} rows={members.slice(1)} />",
  "      {members.map((member) => <Text key={member.id}>{people[member.id].name}</Text>)}",
  "    </Stack>",
  "  );",
  "}",
  "",
].join("\n");
const tableFiles = new Map([...files, ["src/platform/examples/data.ts", files.get(DATA)]]);
const readTables = (rel) => tableFiles.get(rel) ?? null;
const tableLoc = (needle, name) => locOf(needle, name, tables);
const cellEdit = (needle, name, op) => dataFieldEdit(tables, TABLES, tableLoc(needle, name), name, op, { read: readTables });
const TEAM = tableLoc("aria-label=\"Team\"", "Table");
const AGAIN = tableLoc("aria-label=\"Again\"", "Table");
const text = (value) => ({ kind: "string", value });

test("cell: a lookup keyed by the row (people[member.id].name) is data the Studio edits", () => {
  const origin = originOf(tables, TABLES, tableLoc("{people[member.id].name}", "TableMedia"), { child: 0 }, { read: readTables });
  assert.equal(origin.kind, "cell");
  assert.equal(origin.editable, true, origin.reason);
  assert.equal(origin.file, DATA);
  assert.equal(originOf(tables, TABLES, tableLoc("{member.hours}", "TableText"), { child: 0 }, { read: readTables }).editable, true);
});

test("cell: a sorted Table finds the row by its key; the factory's argument changes in the data file", () => {
  const result = cellEdit("{people[member.id].name}", "TableMedia", { child: 0, row: 0, rowKey: "bao", table: TEAM, value: text("Bao Tran") });
  assert.ok(!result.error, result.error);
  assert.equal(result.file, DATA);
  assert.match(result.code, /bao: person\('bao', 'Bao Tran', 'Frontend Engineer'\)/);
  const caption = cellEdit("{people[member.id].name}", "TableMedia", { prop: "caption", row: 1, rowKey: "ava", table: TEAM, value: text("Lead researcher") });
  assert.match(caption.code, /ava: person\("ava", "Ava Chen", "Lead researcher"\)/);
});

test("cell: a column two Tables draw needs the Table; .slice(1) rows by key or by place", () => {
  assert.match(cellEdit("{member.hours}", "TableText", { child: 0, row: 0, rowKey: "bao", value: text("x") }).error, /2 Tables draw this column/);
  const byKey = cellEdit("{member.hours}", "TableText", { child: 0, row: 0, rowKey: "bao", table: AGAIN, value: { kind: "number", value: 40 } });
  assert.match(byKey.code, /\{ id: "bao", hours: 40 \}/);
  const byPlace = cellEdit("{member.hours}", "TableText", { child: 0, row: 0, table: AGAIN, value: { kind: "number", value: 41 } });
  assert.match(byPlace.code, /\{ id: "bao", hours: 41 \}/);
  // Text typed on the canvas keeps the data's kind: a number stays a number.
  assert.match(cellEdit("{member.hours}", "TableText", { child: 0, row: 0, rowKey: "bao", table: AGAIN, value: text(" 42.5 ") }).code, /\{ id: "bao", hours: 42\.5 \}/);
  assert.match(cellEdit("{member.hours}", "TableText", { child: 0, row: 0, rowKey: "bao", table: AGAIN, value: text("forty") }).error, /is a number in the data/);
  assert.match(cellEdit("{member.hours}", "TableText", { child: 0, row: 0, table: TEAM, value: { kind: "number", value: 1 } }).error, /sortMembers\(members, sort\), which does not write this row/);
});

test("cell: rows through useMemo, a filter and useState(list); getRowId names the key; a local const lookup", () => {
  const client = cellEdit("{row.client}", "TableText", { child: 0, row: 1, rowKey: "INV-2", value: text("Lumen") });
  assert.ok(!client.error, client.error);
  assert.match(client.code, /\{ number: "INV-2", client: "Lumen", team: "eng", amount: 4050 \}/);
  assert.equal(client.state, true);
  const team = cellEdit("{team.name}", "TableText", { child: 0, row: 0, rowKey: "INV-1", value: text("Design ops") });
  assert.ok(!team.error, team.error);
  assert.match(team.code, /design: \{ name: "Design ops" \}/);
  const money = originOf(tables, TABLES, tableLoc("{money(row.amount)}", "TableText"), { child: 0 }, { read: readTables });
  assert.equal(money.editable, false);
  assert.match(cellEdit("{row.client}", "TableText", { child: 0, row: 1, rowKey: "INV-9", value: text("x") }).error, /does not write this row/);
});

test("cell: a key the code computes (a factory's default param): the row is the item whose written fields match", () => {
  const admin = [
    "const emailOf = (name) => `${name.toLowerCase().replace(\" \", \".\")}@x.studio`;",
    "const member = (name, role, status, email = emailOf(name)) => ({ id: email, name, email, role, status });",
    "const seed = [",
    "  member(\"Khoa Dang\", \"Owner\", \"Active\"),",
    "  member(\"Linh Hoang\", \"Admin\", \"Active\"),",
    "  { ...member(\"Alex Duong\", \"Member\", \"Active\"), photo: \"alex.jpg\" },",
    "];",
    "export function Admin({ query }) {",
    "  const [members] = useState(seed);",
    "  const rows = members.filter((one) => one.name.includes(query));",
    "  return <Table aria-label=\"Members\" rows={rows} columns={[{ id: \"role\", header: \"Role\", cell: (row) => <TableText>{row.role}</TableText> }]} />;",
    "}",
    "",
  ].join("\n");
  const FILE = "src/templates/AdminDemo.tsx";
  const loc = locOf("<TableText>{row.role}", "TableText", admin);
  const fields = { id: "linh.hoang@x.studio", name: "Linh Hoang", email: "linh.hoang@x.studio", role: "Admin", status: "Active" };
  const result = dataFieldEdit(admin, FILE, loc, "TableText", { child: 0, row: 1, rowKey: "linh.hoang@x.studio", rowFields: fields, value: text("Member") }, { read: readTables });
  assert.ok(!result.error, result.error);
  assert.match(result.code, /member\("Linh Hoang", "Member", "Active"\)/);
  // `{ ...member(…), photo }`: the factory call is the item's own, so its argument is the row's role.
  const spread = dataFieldEdit(admin, FILE, loc, "TableText", { child: 0, row: 2, rowKey: "alex.duong@x.studio", rowFields: { name: "Alex Duong", role: "Member", photo: "alex.jpg" }, value: text("Admin") }, { read: readTables });
  assert.ok(!spread.error, spread.error);
  assert.match(spread.code, /\{ \.\.\.member\("Alex Duong", "Admin", "Active"\), photo: "alex\.jpg" \}/);
  // Fewer than two written fields that match: no guess.
  const same = dataFieldEdit(admin, FILE, loc, "TableText", { child: 0, row: 0, rowKey: "x", rowFields: { status: "Active", id: "x" }, value: text("Member") }, { read: readTables });
  assert.match(same.error, /does not write this row/);
});

test("cell: a column without `cell` draws its field: op setDataField { field } on the Table", () => {
  const rows = originOf(tables, TABLES, tableLoc("aria-label=\"Projects\"", "Table"), { tableRows: true }, { read: readTables });
  assert.equal(rows.kind, "rows");
  assert.equal(rows.editable, true);
  const result = cellEdit("aria-label=\"Projects\"", "Table", { field: ["name"], row: 1, rowKey: "banking", value: text("Banking") });
  assert.ok(!result.error, result.error);
  assert.match(result.code, /\{ id: "banking", name: "Banking", due: "Nov 2" \}/);
  // A field the row lacks: added to the row written in place (a picture for a row without one).
  const added = cellEdit("aria-label=\"Projects\"", "Table", { field: ["photo"], row: 0, rowKey: "loyalty", value: text("zen-media:avatar-ava") });
  assert.ok(!added.error, added.error);
  assert.match(added.code, /\{ id: "loyalty", name: "Loyalty app", due: "Oct 14", photo: "zen-media:avatar-ava" \}/);
  // …never to a factory's object (people.bao is person(…)).
  assert.match(cellEdit("{people[member.id].name}", "TableMedia", { child: 0, path: ["photo"], row: 0, rowKey: "bao", table: TEAM, value: text("x") }).error ?? "", /builds "photo"|no "photo"|not written|computed/);
});

test("cell: a field the row lacks is added in the row's own style (a line per field)", () => {
  const page = [
    "const rows = [",
    "  {",
    "    id: \"a\",",
    "    name: \"Ava\",",
    "  },",
    "];",
    "export function Demo() {",
    "  return <Table aria-label=\"People\" rows={rows} columns={[{ id: \"name\", header: \"Name\", cell: (row) => <TableMedia media={<Avatar src={row.photo} alt=\"\" />}>{row.name}</TableMedia> }]} />;",
    "}",
    "",
  ].join("\n");
  const FILE = "src/templates/AddDemo.tsx";
  const loc = locOf("<Avatar src={row.photo}", "Avatar", page);
  assert.equal(originOf(page, FILE, loc, { prop: "src" }, { read: readTables }).editable, true);
  const result = dataFieldEdit(page, FILE, loc, "Avatar", { prop: "src", row: 0, rowKey: "a", value: text("zen-media:avatar-ava") }, { read: readTables });
  assert.ok(!result.error, result.error);
  assert.match(result.code, /    name: "Ava",\n    photo: "zen-media:avatar-ava",\n  \},/);
});

test("row: a .map row's lookup (people[member.id].name) edits the entry its id names", () => {
  const result = cellEdit("{people[member.id].name}</Text>", "Text", { child: 0, row: 0, value: text("Ava T.") });
  assert.ok(!result.error, result.error);
  assert.match(result.code, /ava: person\("ava", "Ava T\.", "UX Researcher"\)/);
});

test("param: a prop of a component of the file is edited where it is used; `path` reads further into the data there", () => {
  const helper = [
    "import { people } from \"../platform/examples/data\";",
    "function Pill({ person, size }) {",
    "  return <Avatar size={size} alt={person.role} />;",
    "}",
    "const rows = [{ id: \"r1\", owner: \"bao\" }];",
    "export function Demo() {",
    "  return <Table aria-label=\"Owners\" rows={rows} columns={[{ id: \"owner\", header: \"Owner\", cell: (row) => <TableMedia media={<Pill person={people[row.owner]} size=\"sm\" />}>x</TableMedia> }]} />;",
    "}",
    "",
  ].join("\n");
  const FILE = "src/templates/PillDemo.tsx";
  const avatar = locOf("<Avatar size={size}", "Avatar", helper);
  const size = originOf(helper, FILE, avatar, { prop: "size" }, { read: readTables });
  assert.deepEqual([size.kind, size.editable, size.component, size.prop, size.path], ["param", true, "Pill", "size", []]);
  const role = originOf(helper, FILE, avatar, { prop: "alt" }, { read: readTables });
  assert.deepEqual([role.kind, role.prop, role.path], ["param", "person", ["role"]]);
  assert.match(dataFieldEdit(helper, FILE, avatar, "Avatar", { prop: "alt", value: text("x") }, { read: readTables }).error, /where <Pill> is used/);
  // The use: person={people[row.owner]} then .role, in the cell's row.
  const pill = locOf("<Pill person=", "Pill", helper);
  const result = dataFieldEdit(helper, FILE, pill, "Pill", { prop: "person", path: ["role"], row: 0, rowKey: "r1", value: text("Staff engineer") }, { read: readTables });
  assert.ok(!result.error, result.error);
  assert.match(result.code, /bao: person\('bao', 'Bao Nguyen', 'Staff engineer'\)/);
});

if (process.exitCode) console.log(`data-source self-test: failures above (${passed} passed)`);
else console.log(`✓ data-source (originOf · setDataField · row edits) self-test: ${passed} cases`);
