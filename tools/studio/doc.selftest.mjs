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
import { Board, Screen, proto } from "@zen/design-system/builder";
import { Avatar, Badge, Button, Card, List, ListItem, Stack, Table, Text } from "@zen/design-system";

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
  const visit = (node) => { out.push(node); for (const value of Object.values(node.props)) if (value.kind === "element") visit(value.node); for (const child of node.children) { if (child.kind === "element") visit(child); else if (child.kind === "map") visit(child.node); } };
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
check("a loc with nothing there is refused, as the engine refuses it", editDoc(start, startText, { file: FILE, loc: "999:0", name: "Button", ops: [{ op: "removeElement" }] }, { applyOps, dataFieldEdit, sha1, options: engine(startText) }).code, "not-found");

if (failures.length) {
  console.error(`doc selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`doc selftest: ${passed} passed`);
