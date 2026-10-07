// Self-test of op "moveTo" (tools/studio/arrange.mjs through slots.mjs applySlotOp). Run: node tools/studio/arrange.selftest.mjs
import assert from "node:assert/strict";
import { applySlotOp } from "./slots.mjs";
import { parseSource, sha1 } from "./jsx-source.mjs";

const FILE = "src/platform/examples/pages/arrange-demo.tsx";
const SOURCE = `import { useState } from "react";
import { Box, Stack } from "../../../components/Layout";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Text } from "../../../components/Text";

export function Demo() {
  const items = ["a", "b"];
  const [on, setOn] = useState(false);
  return (
    <Stack gap="md">
      <Text>One</Text>
      <Text>Two</Text>
      <Stack gap="sm">
        <Badge>Three</Badge>
      </Stack>
      <Box padding="md" />
      {items.map((item) => (
        <Stack key={item}>
          <Text>{item}</Text>
          <Badge>Row</Badge>
        </Stack>
      ))}
      {/* zen-detached: Card · Zen Studio */}
      <Box padding="sm">Detached</Box>
      <Button onClick={() => setOn(!on)}>Toggle</Button>
    </Stack>
  );
}

export function Other() {
  return (
    <Stack gap="md">
      <Text>Elsewhere</Text>
    </Stack>
  );
}
`;

/** "<line>:<column>" (Babel's 0-based column) of the n-th occurrence of `needle` in `text`. */
function locOf(text, needle, nth = 0) {
  let index = -1;
  for (let k = 0; k <= nth; k += 1) {
    index = text.indexOf(needle, index + 1);
    assert.ok(index >= 0, `"${needle}" #${nth} not found`);
  }
  const before = text.slice(0, index);
  const line = before.split("\n").length;
  return `${line}:${index - before.lastIndexOf("\n") - 1}`;
}

const run = (loc, name, op, code = SOURCE) => applySlotOp(code, loc, name, op, { file: FILE, hash: sha1(code) });
const lineOf = (code, needle) => code.split("\n").find((line) => line.includes(needle));
const order = (code, ...needles) => needles.map((needle) => code.indexOf(needle));
let passed = 0;
const test = (title, fn) => {
  try {
    fn();
    passed += 1;
  } catch (error) {
    console.error(`✗ ${title}`);
    throw error;
  }
};

const outer = locOf(SOURCE, '<Stack gap="md">');
const inner = locOf(SOURCE, '<Stack gap="sm">');
const one = locOf(SOURCE, "<Text>One");
const two = locOf(SOURCE, "<Text>Two");

test("reorder: Two before One in the same Stack", () => {
  const result = run(two, "Text", { op: "moveTo", parent: outer, before: one });
  assert.ok(!result.error, result.error);
  const [a, b] = order(result.code, "<Text>Two", "<Text>One");
  assert.ok(a < b, "Two now comes first");
  assert.equal(lineOf(result.code, "<Text>Two"), "      <Text>Two</Text>");
  assert.equal(result.moved.loc, locOf(result.code, "<Text>Two"));
  assert.ok(parseSource(result.code));
});

test("reorder: One after the inner Stack", () => {
  const result = run(one, "Text", { op: "moveTo", parent: outer, after: inner });
  assert.ok(!result.error, result.error);
  const [stack, moved, box] = order(result.code, '<Stack gap="sm">', "<Text>One", '<Box padding="md"');
  assert.ok(stack < moved && moved < box);
});

test("into another Stack: last child, its indentation", () => {
  const result = run(one, "Text", { op: "moveTo", parent: inner });
  assert.ok(!result.error, result.error);
  assert.equal(lineOf(result.code, "<Text>One"), "        <Text>One</Text>");
  const [badge, moved] = order(result.code, "<Badge>Three", "<Text>One");
  assert.ok(badge < moved);
  assert.equal(result.code.split("<Text>One").length, 2, "moved, not copied");
});

test("into a self-closing Box: it opens", () => {
  const result = run(one, "Text", { op: "moveTo", parent: locOf(SOURCE, '<Box padding="md"') });
  assert.ok(!result.error, result.error);
  assert.match(result.code, /<Box padding="md">\n {8}<Text>One<\/Text>\n {6}<\/Box>/);
});

test("copy (⌥-drag): the original stays, the answer is inserted", () => {
  const result = run(one, "Text", { op: "moveTo", parent: inner, copy: true });
  assert.ok(!result.error, result.error);
  assert.equal(result.code.split("<Text>One").length, 3);
  assert.ok(result.inserted?.loc);
});

test("refused: into itself", () => {
  const result = run(outer, "Stack", { op: "moveTo", parent: inner });
  assert.ok(result.error);
});

test("refused: a .map row's name cannot leave its row", () => {
  const result = run(locOf(SOURCE, "<Text>{item}"), "Text", { op: "moveTo", parent: outer });
  assert.match(result.error, /`item`/);
});

test("allowed: a row's element that reads nothing leaves the row", () => {
  const result = run(locOf(SOURCE, "<Badge>Row"), "Badge", { op: "moveTo", parent: outer, before: one });
  assert.ok(!result.error, result.error);
  assert.equal(lineOf(result.code, "<Badge>Row"), "      <Badge>Row</Badge>");
});

test("refused: state of one example cannot go to another", () => {
  const result = run(locOf(SOURCE, "<Button onClick"), "Button", { op: "moveTo", parent: locOf(SOURCE, '<Stack gap="md">', 1) });
  assert.match(result.error, /`(setOn|on)`/);
});

test("a .map row names its whole {items.map(…)} child as a sibling", () => {
  const result = run(one, "Text", { op: "moveTo", parent: outer, after: locOf(SOURCE, "<Stack key") });
  assert.ok(!result.error, result.error);
  const [map, moved, marker] = order(result.code, "items.map", "<Text>One", "zen-detached");
  assert.ok(map < moved && moved < marker, "after the whole map expression");
});

test("refused: already there", () => {
  const result = run(one, "Text", { op: "moveTo", parent: outer, before: two });
  assert.match(result.error, /already there/);
});

test("refused: a .map row's root", () => {
  const result = run(locOf(SOURCE, "<Stack key"), "Stack", { op: "moveTo", parent: outer });
  assert.match(result.error, /\.map/);
});

test("the zen-detached marker moves with its element", () => {
  const result = run(locOf(SOURCE, '<Box padding="sm"'), "Box", { op: "moveTo", parent: outer, before: one });
  assert.ok(!result.error, result.error);
  const [marker, box, first] = order(result.code, "zen-detached", '<Box padding="sm"', "<Text>One");
  assert.ok(marker < box && box < first);
  assert.equal(result.code.split("zen-detached").length, 2);
  assert.equal(result.moved.loc, locOf(result.code, '<Box padding="sm"'));
});

test("into another example function: a name-free element moves", () => {
  const result = run(two, "Text", { op: "moveTo", parent: locOf(SOURCE, '<Stack gap="md">', 1) });
  assert.ok(!result.error, result.error);
  const [elsewhere, moved] = order(result.code, "<Text>Elsewhere", "<Text>Two");
  assert.ok(elsewhere < moved);
});

test("stale hash refused", () => {
  const result = applySlotOp(SOURCE, one, "Text", { op: "moveTo", parent: inner }, { file: FILE, hash: "0".repeat(40) });
  assert.equal(result.code, "stale");
});

test("bad input refused", () => {
  assert.ok(run(one, "Text", { op: "moveTo" }).error);
  assert.ok(run(one, "Text", { op: "moveTo", parent: outer, before: one, after: two }).error);
  assert.ok(run(one, "Text", { op: "moveTo", parent: "99:0" }).error);
});

const CLONES = `import { Stack } from "../../../components/Layout";
import { Button, IconButton } from "../../../components/Button";
import { Tooltip } from "../../../components/Tooltip";
import { FormActions } from "../../../components/Form";
import { Text } from "../../../components/Text";

export function Clones() {
  return (
    <Stack gap="md">
      <Tooltip content="Edit">
        <IconButton icon="icon-edit-line" aria-label="Edit" />
      </Tooltip>
      <FormActions>
        <Button level="tertiary">Cancel</Button>
        <Button>Save</Button>
      </FormActions>
      <Text>Note</Text>
      <Stack gap="sm" />
    </Stack>
  );
}
`;

test("cloning: a Tooltip's child stays; nothing lands in a Tooltip", () => {
  const out = run(locOf(CLONES, "<IconButton"), "IconButton", { op: "moveTo", parent: locOf(CLONES, '<Stack gap="md">') }, CLONES);
  assert.match(out.error, /Tooltip/);
  const into = run(locOf(CLONES, "<Text>Note"), "Text", { op: "moveTo", parent: locOf(CLONES, "<Tooltip") }, CLONES);
  assert.match(into.error, /one child/);
});

test("cloning: FormActions reorders its Buttons and takes Buttons only", () => {
  const swap = run(locOf(CLONES, "<Button>Save"), "Button", { op: "moveTo", parent: locOf(CLONES, "<FormActions"), before: locOf(CLONES, '<Button level="tertiary"') }, CLONES);
  assert.ok(!swap.error, swap.error);
  const text = run(locOf(CLONES, "<Text>Note"), "Text", { op: "moveTo", parent: locOf(CLONES, "<FormActions") }, CLONES);
  assert.match(text.error, /<Button> only/);
});

test("a block never lands inside text", () => {
  const out = run(locOf(CLONES, '<Stack gap="sm"'), "Stack", { op: "moveTo", parent: locOf(CLONES, "<Text>Note") }, CLONES);
  assert.match(out.error, /block/);
});

test("moveTo replace: the copy takes the replaced layer's place (paste to replace)", () => {
  const result = run(one, "Text", { op: "moveTo", parent: inner, replace: locOf(SOURCE, "<Badge>Three"), copy: true });
  assert.ok(!result.error, result.error);
  assert.ok(!result.code.includes("<Badge>Three"));
  assert.equal(lineOf(result.code, "<Text>One").trim(), "<Text>One</Text>");
  assert.equal(result.code.split("<Text>One").length, 3, "the original stays");
  assert.ok(result.code.includes('import { Badge }'), "Badge is still used by the .map row");
});

test("moveTo replace needs copy", () => {
  assert.match(run(one, "Text", { op: "moveTo", parent: inner, replace: locOf(SOURCE, "<Badge>Three") }).error, /copy/);
});

const paste = (parentLoc, op, code = SOURCE) => applySlotOp(code, parentLoc, "Stack", { op: "pasteCode", ...op }, { file: FILE, hash: sha1(code) });

test("pasteCode: Zen components join the imports, after a child", () => {
  const result = paste(inner, { code: '<Stack gap="xs">\n  <Tag>New</Tag>\n</Stack>', after: locOf(SOURCE, "<Badge>Three") });
  assert.ok(!result.error, result.error);
  assert.match(result.code, /import \{ Tag \} from "..\/..\/..\/components\/Tag";/);
  assert.match(result.code, /<Badge>Three<\/Badge>\n {8}<Stack gap="xs">\n {10}<Tag>New<\/Tag>\n {8}<\/Stack>/);
  assert.ok(result.inserted?.loc);
});

test("pasteCode: a name that exists where it lands is fine, one that does not is refused", () => {
  const ok = paste(outer, { code: "<Button onClick={() => setOn(!on)}>Again</Button>", before: one });
  assert.ok(!ok.error, ok.error);
  const bad = paste(locOf(SOURCE, '<Stack gap="md">', 1), { code: "<Button onClick={() => setOn(!on)}>Again</Button>" });
  assert.match(bad.error, /`(setOn|on)`/);
});

test("pasteCode with state (an Assets item): fresh names, the hook in the component, useState kept imported once", () => {
  const code = '<Stack direction="row">\n  <Button onClick={() => setOn(true)}>Open</Button>\n  <Text>{on ? "Open" : "Closed"}</Text>\n</Stack>';
  const result = paste(outer, { code, state: [{ name: "on", initial: "false" }] });
  assert.ok(!result.error, result.error);
  // `on` / `setOn` are taken in the file: the pasted item reads on2 / setOn2, never the Demo's own state.
  assert.match(result.code, /export function Demo\(\) \{\n {2}const \[on2, setOn2\] = useState\(false\);\n {2}const items/);
  assert.match(result.code, /<Button onClick=\{\(\) => setOn2\(true\)\}>Open<\/Button>/);
  assert.equal(result.code.split('import { useState } from "react";').length, 2);
  const media = paste(outer, { code: "<Image src={platformMedia.feed[0].src} alt={platformMedia.feed[0].alt} />", state: [] });
  assert.ok(!media.error, media.error);
  assert.match(media.code, /import \{ platformMedia \} from "\.\.\/\.\.\/PlatformMedia";/);
});

test("pasteCode replace: the replaced layer goes, its unused import too", () => {
  const code = SOURCE.replace("      {items.map((item) => (\n        <Stack key={item}>\n          <Text>{item}</Text>\n          <Badge>Row</Badge>\n        </Stack>\n      ))}\n", "");
  const result = paste(locOf(code, '<Stack gap="sm">'), { code: "<Text>Instead</Text>", replace: locOf(code, "<Badge>Three") }, code);
  assert.ok(!result.error, result.error);
  assert.ok(!result.code.includes("Badge"), "Badge and its import are gone");
  assert.match(result.code, /<Stack gap="sm">\n {8}<Text>Instead<\/Text>\n {6}<\/Stack>/);
});

test("pasteCode refuses what is not JSX elements, and Tooltip / text parents", () => {
  assert.ok(paste(outer, { code: "hello" }).error);
  assert.ok(paste(outer, { code: "<><Text>a</Text></>" }).error);
  assert.ok(paste(outer, { code: "<Text>a</Text> and text" }).error);
  const tip = applySlotOp(CLONES, locOf(CLONES, "<Tooltip"), "Tooltip", { op: "pasteCode", code: "<Text>x</Text>" }, { file: FILE, hash: sha1(CLONES) });
  assert.match(tip.error, /one child/);
});

test("pasteCode: several layers paste in order, at one place", () => {
  const result = paste(inner, { code: "<Text>First</Text>\n<Badge>Second</Badge>", after: locOf(SOURCE, "<Badge>Three") });
  assert.ok(!result.error, result.error);
  assert.match(result.code, /<Badge>Three<\/Badge>\n {8}<Text>First<\/Text>\n {8}<Badge>Second<\/Badge>\n {6}<\/Stack>/);
  assert.equal(result.inserted.loc, locOf(result.code, "<Text>First"));
});

const many = (loc, name, op, code = SOURCE) => applySlotOp(code, loc, name, { op: "many", ...op }, { file: FILE, hash: sha1(code) });

test("many remove: several layers in one edit, a nested one goes with its parent", () => {
  const result = many(one, "Text", { action: "remove", locs: [one, two, inner, locOf(SOURCE, "<Badge>Three")] });
  assert.ok(!result.error, result.error);
  assert.ok(!result.code.includes("<Text>One") && !result.code.includes("<Text>Two") && !result.code.includes("<Badge>Three"));
  assert.ok(result.removed);
  assert.ok(parseSource(result.code));
});

test("many duplicate: each copy right after its original, the first copy answered", () => {
  const result = many(one, "Text", { action: "duplicate", locs: [two, one] });
  assert.ok(!result.error, result.error);
  assert.match(result.code, /<Text>One<\/Text>\n {6}<Text>One<\/Text>\n {6}<Text>Two<\/Text>\n {6}<Text>Two<\/Text>/);
  assert.equal(result.inserted.loc, locOf(result.code, "<Text>One", 1));
});

test("many setProps: the same props on every layer, one edit", () => {
  const result = many(one, "Text", { action: "setProps", locs: [one, two], ops: [{ op: "setProp", name: "tone", value: { kind: "string", value: "base" } }] });
  assert.ok(!result.error, result.error);
  assert.match(result.code, /<Text tone="base">One<\/Text>\n {6}<Text tone="base">Two<\/Text>/);
  assert.ok(result.updated);
});

test("many setProps works in any annotated file; remove / duplicate in shared code ask first (WP-B2)", () => {
  const shared = "src/platform/examples/e2e/Shared.tsx";
  const props = applySlotOp(SOURCE, one, "Text", { op: "many", action: "setProps", locs: [one, two], ops: [{ op: "setProp", name: "tone", value: { kind: "string", value: "base" } }] }, { file: shared, hash: sha1(SOURCE) });
  assert.ok(!props.error, props.error);
  assert.match(props.code, /<Text tone="base">One<\/Text>/);
  const remove = applySlotOp(SOURCE, one, "Text", { op: "many", action: "remove", locs: [one, two] }, { file: shared, hash: sha1(SOURCE) });
  assert.equal(remove.code, "confirm");
  assert.match(remove.error ?? "", /shared code/);
  const confirmed = applySlotOp(SOURCE, one, "Text", { op: "many", action: "remove", locs: [one, two] }, { file: shared, hash: sha1(SOURCE), shared: true });
  assert.ok(!confirmed.error, confirmed.error);
  const playground = applySlotOp(SOURCE, one, "Text", { op: "many", action: "remove", locs: [one, two] }, { file: "src/platform/PlatformExamples.tsx", hash: sha1(SOURCE), shared: true });
  assert.match(playground.error ?? "", /example pages/);
});

test("many refuses a bad action, no locs, and a .map row", () => {
  assert.ok(many(one, "Text", { action: "explode", locs: [one] }).error);
  assert.ok(many(one, "Text", { action: "remove", locs: [] }).error);
  assert.match(many(one, "Text", { action: "remove", locs: [locOf(SOURCE, "<Stack key")] }).error, /\.map/);
});

test("many setProps with opsByLoc: each layer its own props, an outer and an inner one, one edit", () => {
  const stack = locOf(SOURCE, '<Stack gap="sm">');
  const badge = locOf(SOURCE, "<Badge>Three");
  const result = many(stack, "Stack", { action: "setProps", locs: [stack, badge], opsByLoc: { [stack]: [{ op: "removeProp", name: "gap" }], [badge]: [{ op: "setProp", name: "size", value: { kind: "string", value: "sm" } }] } });
  assert.ok(!result.error, result.error);
  assert.match(result.code, /<Stack>\n {8}<Badge size="sm">Three<\/Badge>/);
  assert.ok(result.updated);
  assert.match(many(stack, "Stack", { action: "setProps", locs: [stack, badge], opsByLoc: { [stack]: [{ op: "removeProp", name: "gap" }] } }).error, /opsByLoc/);
});

test("many move: two layers step down together, each answered at its new place (backlog batch 5c)", () => {
  const stack = locOf(SOURCE, '<Stack gap="sm">');
  const result = many(one, "Text", { action: "move", to: "next", locs: [two, one] });
  assert.ok(!result.error, result.error);
  assert.match(result.code, /<Stack gap="md">\n {6}<Stack gap="sm">\n {8}<Badge>Three<\/Badge>\n {6}<\/Stack>\n {6}<Text>One<\/Text>\n {6}<Text>Two<\/Text>/);
  assert.deepEqual(result.moved.locs, { [one]: locOf(result.code, "<Text>One"), [two]: locOf(result.code, "<Text>Two") });
  assert.equal(result.moved.loc, locOf(result.code, "<Text>One"));
  // A layer at the edge stays while the other one steps; none can move → refused.
  const gap = many(one, "Text", { action: "move", to: "prev", locs: [one, stack] });
  assert.ok(!gap.error, gap.error);
  assert.match(gap.code, /<Text>One<\/Text>\n {6}<Stack gap="sm">[\s\S]*<\/Stack>\n {6}<Text>Two<\/Text>/);
  assert.deepEqual(gap.moved.locs, { [one]: locOf(gap.code, "<Text>One"), [stack]: locOf(gap.code, '<Stack gap="sm">') });
  assert.match(many(one, "Text", { action: "move", to: "prev", locs: [one, two] }).error, /already the first/);
  // A detach marker moves with its layer; layers of two parents are refused.
  const box = locOf(SOURCE, '<Box padding="sm"');
  const marked = many(box, "Box", { action: "move", to: "prev", locs: [box] });
  assert.ok(!marked.error, marked.error);
  assert.ok(marked.code.indexOf("zen-detached") < marked.code.indexOf("items.map"), "the marker moved with the Box");
  assert.match(many(one, "Text", { action: "move", to: "next", locs: [one, locOf(SOURCE, "<Badge>Three")] }).error, /different parents/);
  assert.match(many(one, "Text", { action: "move", to: "up", locs: [one] }).error, /`to`/);
});

/* ── replaceElement (Swap instance, GĐ4 M2) ── */

const swap = (loc, name, op, code = SOURCE) => applySlotOp(code, loc, name, { op: "replaceElement", ...op }, { file: FILE, hash: sha1(code) });

test("replaceElement: the new layer in the old one's place, its components imported, the old import kept while used", () => {
  const result = swap(locOf(SOURCE, "<Badge>Three"), "Badge", { code: "<Tag>New</Tag>" });
  assert.ok(!result.error, result.error);
  assert.match(result.code, /<Stack gap="sm">\n {8}<Tag>New<\/Tag>\n {6}<\/Stack>/);
  assert.match(result.code, /import \{ Tag \} from "..\/..\/..\/components\/Tag";/);
  assert.match(result.code, /import \{ Badge \}/, "Badge stays imported: the .map row still uses it");
  assert.equal(result.inserted.loc, locOf(result.code, "<Tag>New"));
});

const LEADING = `import { Avatar } from "../../../components/Avatar";
import { List, ListItem } from "../../../components/ListItem";

export function People({ people }) {
  return (
    <List>
      {people.map((one) => (
        <ListItem key={one.id} title={one.name} leading={<Avatar key={one.id} alt={one.name} size="md" />} />
      ))}
    </List>
  );
}
`;

test("replaceElement in a prop: Avatar → DockIcon in ListItem leading, key kept, the unused Avatar import goes", () => {
  const result = swap(locOf(LEADING, "<Avatar"), "Avatar", { code: '<DockIcon icon="icon-home-03-solid" />' }, LEADING);
  assert.ok(!result.error, result.error);
  assert.match(result.code, /leading=\{<DockIcon key=\{one\.id\} icon="icon-home-03-solid" \/>\}/);
  assert.match(result.code, /import \{ DockIcon \} from "..\/..\/..\/components\/DockIcon";/);
  assert.ok(!result.code.includes("Avatar"), "Avatar and its import are gone");
});

test("replaceElement: a .map row keeps its key; later lines take the row's indentation", () => {
  const result = swap(locOf(SOURCE, "<Stack key"), "Stack", { code: '<Box padding="sm">\n  <Text>Row</Text>\n</Box>' });
  assert.ok(!result.error, result.error);
  assert.match(result.code, /\{items\.map\(\(item\) => \(\n {8}<Box key=\{item\} padding="sm">\n {10}<Text>Row<\/Text>\n {8}<\/Box>\n {6}\)\)\}/);
});

test("replaceElement refuses what is not one JSX element, unknown names, data-zen-src, a stale hash and a non-Button in FormActions", () => {
  const badge = locOf(SOURCE, "<Badge>Three");
  assert.ok(swap(badge, "Badge", { code: "hello" }).error);
  assert.ok(swap(badge, "Badge", { code: "<Text>a</Text><Text>b</Text>" }).error);
  assert.match(swap(badge, "Badge", { code: "<Button onClick={save}>Go</Button>" }).error, /`save`/);
  assert.match(swap(badge, "Badge", { code: '<Text data-zen-src="x">a</Text>' }).error, /data-zen-src/);
  assert.equal(applySlotOp(SOURCE, badge, "Badge", { op: "replaceElement", code: "<Tag>New</Tag>" }, { file: FILE, hash: "old" }).code, "stale");
  // FormActions clones its Buttons (cloning.json: only Button); a Tooltip's trigger may be any one element.
  const actions = applySlotOp(CLONES, locOf(CLONES, "<Button", 0), "Button", { op: "replaceElement", code: "<Text>x</Text>" }, { file: FILE, hash: sha1(CLONES) });
  assert.match(actions.error ?? "", /FormActions/);
  const trigger = applySlotOp(CLONES, locOf(CLONES, "<IconButton"), "IconButton", { op: "replaceElement", code: '<Button>Edit</Button>' }, { file: FILE, hash: sha1(CLONES) });
  assert.ok(!trigger.error, trigger.error);
});

console.log(`✓ arrange (moveTo · pasteCode · replaceElement · many) self-test: ${passed} cases`);
