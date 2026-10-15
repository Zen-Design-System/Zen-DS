#!/usr/bin/env node
// The builder page document (doc.mjs, core rebuild M2): a print reads back as the same page, and an edit through the
// document gives the same page as the engine on the text (the engine is the oracle) while every element keeps its id —
// across a setProp, a move, a wrap and a copy (the copy takes a new one). M3: each edit, and its undo, says where every
// element went (locs / locMap), so a selection follows its element. Run: node tools/studio/doc.selftest.mjs
import fs from "node:fs";
import { dataFieldEdit } from "./data-source.mjs";
import { newPageText, parsePage } from "./dialect.mjs";
import { docFromText, editDoc, locMap, locsOf, printPage, withoutIds } from "./doc.mjs";
import { applyOps, sha1 } from "./jsx-source.mjs";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};
const FILE = "local:doc-test.zen.tsx";
const componentModules = new Map(["Avatar", "Badge", "Button", "Card", "List", "ListItem", "Stack", "Table", "Text", "MetricCard", "IconButton"].map((name) => [name, name]));
const engine = (code) => ({ file: FILE, componentModules, requiredChildren: new Set(), requiredProps: new Map(), hash: sha1(code) });
const tree = (text) => withoutIds(docFromText(text).doc);
let ids = 0;
const newId = () => `t${(ids += 1)}`;

/* ── a print reads back as the same page ───────────────────────────────────────────────────────────────────────── */

const RICH = `// @zen-page {"format":1,"title":"Rich page","os":"ios"}
import { Board, Screen, proto } from "@zen-ds/react/builder";
import { Avatar, Badge, Button, Card, List, ListItem, Stack, Table, Text } from "@zen-ds/react";

export const mock = {
  people: [
    { id: "alex", name: "Alex Duong", status: "Active", photo: "zen-media:alex", score: -3, lead: true, note: null },
    { id: "binh", name: "Binh \\"B\\" Tran", status: "Away", photo: "", score: 4.5, lead: false, note: "Line one" },
  ],
  title: "Team",
};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Rich page" device="desktop">
        <Stack gap="md" padding="xl">
          <Text textStyle="Heading/3">{mock.title}</Text>
          <Text>Quotes "inside" and {"braces {}"} stay</Text>
          <Text>{"  two  spaces  "}</Text>
          <Card subAction={{ label: "More", onClick: proto.toast("More") }} overrides={{ "Sub-Action": { level: "danger" }, "Row[a]/status/Badge": { theme: "red" } }}>
            <Badge leading={<Avatar size="xs" src="zen-media:alex" />}>New</Badge>
          </Card>
          <Table aria-label="People" columns={[{ id: "name", header: "Name", field: "name" }, { id: "status", header: "Status", field: "status", content: "badge" }]} rows={mock.people} selectable defaultSelectedIds={["binh"]} />
          <List>
            {mock.people.map((person) => <ListItem title={person.name} leading={<Avatar src={person.photo} alt={person["name"]} />} onClick={proto.navigate("screen-1")} />)}
          </List>
          <Button level="primary" disabled={false} count={3} onClick={proto.open("sheet")}>Pay</Button>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
const pages = {
  "rich page": RICH,
  "blank desktop": newPageText({ title: "Blank", device: "desktop", chrome: false }),
  "blank phone with chrome": newPageText({ title: "Phone", device: "phone" }),
  "empty page (no app frame, nothing in it)": newPageText({ title: "Empty", empty: true }),
};
const userPage = ".zen-studio/pages/admin-list-team-members-2.zen.tsx";
if (fs.existsSync(userPage)) pages["a page made in the Studio"] = fs.readFileSync(userPage, "utf8");

for (const [label, text] of Object.entries(pages)) {
  check(`${label}: valid`, parsePage(text).errors, []);
  const { doc, errors } = docFromText(text, { newId });
  check(`${label}: reads as a document`, errors, []);
  const printed = printPage(doc);
  check(`${label}: its print is valid`, parsePage(printed).errors, []);
  check(`${label}: its print reads back as the same page`, tree(printed), withoutIds(doc));
  check(`${label}: printing is stable`, printPage(docFromText(printed).doc), printed);
  const withIds = printPage(doc, { ids: true });
  check(`${label}: the engine's print keeps every id`, JSON.stringify(docFromText(withIds).doc), JSON.stringify(doc));
  const shown = locsOf(doc, printed);
  const engineView = locsOf(doc, withIds);
  check(`${label}: every element has a place in both prints`, [shown.locOf.size, engineView.locOf.size], [engineView.idAt.size, shown.idAt.size]);
}

/* ── an edit through the document = the engine's edit on the text; ids stay ────────────────────────────────────── */

const start = docFromText(RICH, { newId }).doc;
const startText = printPage(start);
const nodes = (doc) => {
  const out = [];
  const visitChild = (child) => { if (child.kind === "element") visit(child); else if (child.kind === "map") visit(child.node); };
  const visit = (node) => { out.push(node); for (const value of Object.values(node.props)) { if (value.kind === "element") visit(value.node); else if (value.kind === "fragment") value.children.forEach(visitChild); } node.children.forEach(visitChild); };
  visit(doc.board);
  return out;
};
const byName = (doc, name, index = 0) => nodes(doc).filter((node) => node.name === name)[index];
const locIn = (doc, text, node) => locsOf(doc, text).locOf.get(node.id);
/** What starts at "line:col" (1-based line, 0-based column) of `text`. */
const textAt = (text, loc) => { const [line, column] = loc.split(":").map(Number); return text.split("\n")[line - 1]?.slice(column) ?? ""; };

/** M3: the edit's locs send each element of the old text to the same element in the new one (its own tag there), the
 *  removed ones to null; locMap the other way (undo) sends each one back where it was. */
function followed(label, through) {
  const kept = nodes(start).filter((node) => nodes(through.doc).some((other) => other.id === node.id));
  const gone = nodes(start).filter((node) => !kept.includes(node));
  const wrong = kept.filter((node) => { const next = through.locs?.[locIn(start, startText, node)]; return !next || !textAt(through.text, next).startsWith(`<${node.name}`) || next !== locIn(through.doc, through.text, node); });
  check(`${label}: locs send every kept element to its own tag in the new text`, wrong.map((node) => node.name), []);
  check(`${label}: locs send the removed ones to null`, gone.map((node) => through.locs?.[locIn(start, startText, node)] ?? null), gone.map(() => null));
  const back = locMap(through.doc, through.text, start, startText);
  const lost = kept.filter((node) => back?.[locIn(through.doc, through.text, node)] !== locIn(start, startText, node));
  check(`${label}: locMap (undo) sends each one back where it was`, lost.map((node) => node.name), []);
}

/** The same request on the text (engine) and on the document; the pages must match. */
function both(label, name, index, ops) {
  const node = byName(start, name, index);
  const loc = locIn(start, startText, node);
  const direct = applyOps(startText, loc, name, typeof ops === "function" ? ops((other, at = 0) => locIn(start, startText, byName(start, other, at))) : ops, engine(startText));
  const request = { file: FILE, loc, name, ops: typeof ops === "function" ? ops((other, at = 0) => locIn(start, startText, byName(start, other, at))) : ops };
  const through = editDoc(start, startText, request, { applyOps, dataFieldEdit, sha1, options: engine(startText) });
  check(`${label}: the engine accepts it`, direct.error ?? null, null);
  check(`${label}: the document accepts it`, through.error ?? null, null);
  if (direct.error || through.error) return null;
  check(`${label}: same page as the engine's`, withoutIds(through.doc), tree(direct.code));
  check(`${label}: the text is the engine's own (the person's formatting stays)`, through.text, direct.code);
  check(`${label}: ids followed the edit`, through.ids, true);
  followed(label, through);
  return { through, direct };
}

{
  const result = both("setProp", "Button", 0, [{ op: "setProp", name: "level", value: { kind: "string", value: "secondary" } }]);
  if (result) {
    const before = new Set(nodes(start).map((node) => node.id));
    check("setProp: every element keeps its id", nodes(result.through.doc).every((node) => before.has(node.id)), true);
    check("setProp: the shown text has no ids", result.through.text.includes("data-zen-id"), false);
  }
}
both("removeProp", "Table", 0, [{ op: "removeProp", name: "defaultSelectedIds" }]);
both("setField in an object prop", "Card", 0, [{ op: "setField", name: "subAction", key: "label", value: { kind: "string", value: "Options" } }]);
{
  const result = both("duplicateElement", "Button", 0, [{ op: "duplicateElement" }]);
  if (result) {
    const original = byName(start, "Button").id;
    const buttons = nodes(result.through.doc).filter((node) => node.name === "Button");
    check("duplicate: two Buttons, the first keeps its id, the copy gets a new one", [buttons.length, buttons[0].id === original, buttons[1].id !== original], [2, true, true]);
    const copy = locsOf(result.through.doc, result.through.text).locOf.get(buttons[1].id);
    check("duplicate: the answer points at the copy in the shown text", result.through.answer.inserted?.loc, copy);
  }
}
{
  const result = both("removeElement", "Text", 1, [{ op: "removeElement" }]);
  if (result) check("removeElement: the others keep their ids", byName(result.through.doc, "Table").id, byName(start, "Table").id);
}
{
  const result = both("moveElement next", "Card", 0, [{ op: "moveElement", to: "next" }]);
  if (result) {
    const card = byName(start, "Card");
    check("move: the moved Card keeps its id", byName(result.through.doc, "Card").id, card.id);
    check("move: the answer points at it in the shown text", result.through.answer.moved?.loc, locsOf(result.through.doc, result.through.text).locOf.get(card.id));
  }
}
{
  const result = both("wrap in a Stack", "Button", 0, [{ op: "wrap", tag: "Stack", props: { gap: { kind: "string", value: "sm" } } }]);
  if (result) {
    const button = byName(start, "Button");
    check("wrap: the Button keeps its id inside the new Stack", byName(result.through.doc, "Button").id, button.id);
    const wrapper = locsOf(result.through.doc, result.through.text).idAt.get(result.through.answer.wrapped?.loc);
    check("wrap: the answer points at the new Stack (a new id)", [Boolean(wrapper), wrapper !== button.id], [true, true]);
  }
}
both("insertChild", "Stack", 0, [{ op: "insertChild", code: '<Badge theme="accent">Beta</Badge>' }]);
both("moveTo another parent", "Badge", 0, (loc) => [{ op: "moveTo", parent: loc("Stack"), after: loc("Table") }]);
{
  const row = byName(start, "ListItem");
  const loc = locIn(start, startText, row);
  const direct = dataFieldEdit(startText, FILE, loc, "ListItem", { op: "setDataField", prop: "title", row: 1, value: { kind: "string", value: "Binh Tran" } });
  const through = editDoc(start, startText, { file: FILE, loc, name: "ListItem", ops: [{ op: "setDataField", prop: "title", row: 1, value: { kind: "string", value: "Binh Tran" } }] }, { applyOps, dataFieldEdit, sha1, options: engine(startText) });
  check("setDataField: accepted", [direct.error ?? null, through.error ?? null], [null, null]);
  if (!direct.error && !through.error) check("setDataField: same page as the engine's", withoutIds(through.doc), tree(direct.code));
}
{
  // M4: one row of a .map takes its own value for a fixed prop (setRowProp); the page stays valid, ids stay.
  const row = byName(start, "ListItem");
  const loc = locIn(start, startText, row);
  const op = { op: "setRowProp", name: "description", row: 1, value: { kind: "string", value: "Away today" } };
  const direct = dataFieldEdit(startText, FILE, loc, "ListItem", op);
  const through = editDoc(start, startText, { file: FILE, loc, name: "ListItem", ops: [op] }, { applyOps, dataFieldEdit, sha1, options: engine(startText) });
  check("setRowProp: accepted", [direct.error ?? null, through.error ?? null], [null, null]);
  if (!direct.error && !through.error) {
    check("setRowProp: same page as the data edit's", withoutIds(through.doc), tree(direct.code));
    check("setRowProp: the row's field and the binding are written", [/name: "Binh \\"B\\" Tran"[^}]*description: "Away today"/.test(through.text), /<ListItem description=\{person\.description\}/.test(through.text)], [true, true]);
    check("setRowProp: ids followed the edit", [through.ids, byName(through.doc, "ListItem").id], [true, row.id]);
  }
}
check("a loc with nothing there is refused, as the engine refuses it", editDoc(start, startText, { file: FILE, loc: "999:0", name: "Button", ops: [{ op: "removeElement" }] }, { applyOps, dataFieldEdit, sha1, options: engine(startText) }).code, "not-found");
// M6 (a Figma update): code an op brings with data-zen-id sets those ids in the document, and the page's text never shows them.
{
  const button = byName(start, "Button");
  const code = '<Stack gap="sm" data-zen-id="fpull-1"><Text data-zen-id="fpull-2">From Figma</Text></Stack>';
  const through = editDoc(start, startText, { file: FILE, loc: locIn(start, startText, button), name: "Button", ops: [{ op: "replaceElement", code }] }, { applyOps, dataFieldEdit, sha1, options: engine(startText) });
  check("code with ids: the text has none", [typeof through.text === "string", /data-zen-id/.test(through.text ?? ""), /<Stack gap="sm">\s*<Text>From Figma<\/Text>\s*<\/Stack>/.test(through.text ?? "")], [true, false, true]);
  check("code with ids: the document takes them", [through.ids, nodes(through.doc).filter((node) => node.id.startsWith("fpull-")).map((node) => `${node.name}#${node.id}`)], [true, ["Stack#fpull-1", "Text#fpull-2"]]);
}

/* ── a slot prop holding several layers (<>…</>, user 2026-10-16: as Figma's slot) ─────────────────────────────── */
{
  const FRAG = `// @zen-page {"format":1,"title":"Slots"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Badge, Button, List, ListItem } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Slots" device="desktop">
        <List>
          <ListItem title="Alex" trailing={<Badge>New</Badge>} />
          <ListItem title="Binh" trailing={<><Badge>One</Badge><Button level="tertiary">Two</Button></>} />
        </List>
      </Screen>
    </Board>
  );
}
`;
  check("fragment prop: the page is valid", parsePage(FRAG).errors, []);
  const value = parsePage(FRAG).board.children[0].children[0].children[1].props.trailing;
  check("fragment prop: read as the slot's layers", [value.kind, value.children.map((child) => child.name)], ["fragment", ["Badge", "Button"]]);
  const doc = docFromText(FRAG, { newId }).doc;
  const text = printPage(doc);
  check("fragment prop: its print reads back as the same page", tree(text), withoutIds(doc));
  check("fragment prop: the engine's print keeps every id", JSON.stringify(docFromText(printPage(doc, { ids: true })).doc), JSON.stringify(doc));
  check("fragment prop: every layer in it has a place", nodes(doc).every((node) => locsOf(doc, text).locOf.has(node.id)), true);
  const edit = (label, name, index, ops) => {
    const node = nodes(doc).filter((entry) => entry.name === name)[index];
    const loc = locsOf(doc, text).locOf.get(node.id);
    const direct = applyOps(text, loc, name, ops, engine(text));
    const through = editDoc(doc, text, { file: FILE, loc, name, ops }, { applyOps, dataFieldEdit, sha1, options: engine(text) });
    check(`${label}: the document accepts it`, through.error ?? null, null);
    if (!through.error) check(`${label}: same page as the engine's`, withoutIds(through.doc), tree(direct.code));
    return through;
  };
  const added = edit("a second layer in a one-layer slot", "ListItem", 0, [{ op: "insertChild", prop: "trailing", code: '<Button level="tertiary">Open</Button>' }]);
  if (!added.error) {
    const slot = byName(added.doc, "ListItem", 0).props.trailing;
    check("a second layer: the slot holds both, the first keeps its id", [slot.kind, slot.children.map((child) => child.name), slot.children[0].id], ["fragment", ["Badge", "Button"], byName(doc, "Badge", 0).id]);
  }
  const removed = edit("remove a layer from a slot", "Button", 0, [{ op: "removeElement" }]);
  if (!removed.error) check("remove: the other layer stays in the slot", byName(removed.doc, "ListItem", 1).props.trailing.children?.map((child) => child.name) ?? [byName(removed.doc, "ListItem", 1).props.trailing.node?.name], ["Badge"]);
  const copied = edit("duplicate a layer in a slot", "Badge", 1, [{ op: "duplicateElement" }]);
  if (!copied.error) check("duplicate: three layers in the slot", byName(copied.doc, "ListItem", 1).props.trailing.children.map((child) => child.name), ["Badge", "Badge", "Button"]);
  const moved = edit("move a layer within its slot", "Button", 0, [{ op: "moveElement", to: "prev" }]);
  if (!moved.error) check("move: the Button goes first", byName(moved.doc, "ListItem", 1).props.trailing.children.map((child) => child.name), ["Button", "Badge"]);
}

if (failures.length) {
  console.error(`doc selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`doc selftest: ${passed} passed`);
