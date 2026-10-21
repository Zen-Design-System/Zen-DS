// Self-test of op "moveTo" (tools/studio/arrange.mjs through slots.mjs applySlotOp). Run: node tools/studio/arrange.selftest.mjs
import assert from "node:assert/strict";
import { applySlotOp } from "./slots.mjs";
import { parseSource, sha1 } from "./jsx-source.mjs";
import { floatAt } from "./arrange.mjs";

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

test("refused: a for-of variable or a catch parameter cannot leave its body", () => {
  const code = SOURCE.replace("export function Other() {\n", "export function Other() {\n  const rows = [];\n  for (const row of [1, 2]) rows.push(<Box key={row}><Text>{row}</Text></Box>);\n  try { go(); } catch (error) { rows.push(<Box><Badge>{String(error)}</Badge></Box>); }\n");
  const target = locOf(code, '<Stack gap="md">', 1);
  assert.match(run(locOf(code, "<Text>{row}"), "Text", { op: "moveTo", parent: target }, code).error, /`row` \(a loop variable\)/);
  assert.match(run(locOf(code, "<Badge>{String"), "Badge", { op: "moveTo", parent: target }, code).error, /`error` \(a caught error\)/);
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

// A child written in code moves as that block (user, 2026-10-09: "mọi thao tác … tự do như Figma"): dragging a .map row
// moves the whole {items.map(…)} list, a condition's element the whole {on && …}.
test("a .map row moves with its whole {items.map(…)} block", () => {
  const result = run(locOf(SOURCE, "<Stack key"), "Stack", { op: "moveTo", parent: outer });
  assert.ok(!result.error, result.error);
  const [button, map] = order(result.code, "<Button onClick", "items.map");
  assert.ok(button > 0 && button < map, "the whole map expression after the last child");
  assert.equal(result.code.split("items.map").length, 2, "one list, moved (not copied)");
  assert.ok(parseSource(result.code), "parses");
});

test("refused: a .map row's block where its list is not in scope", () => {
  const result = run(locOf(SOURCE, "<Stack key"), "Stack", { op: "moveTo", parent: locOf(SOURCE, '<Stack gap="md">', 1) });
  assert.match(result.error, /items/);
});

const CONDITIONAL = SOURCE.replace("      <Box padding=\"md\" />\n", "      <Box padding=\"md\" />\n      {on && <Badge>On</Badge>}\n");
test("a condition's element moves with its {on && …} block", () => {
  assert.notEqual(CONDITIONAL, SOURCE);
  const result = run(locOf(CONDITIONAL, "<Badge>On"), "Badge", { op: "moveTo", parent: outer, before: locOf(CONDITIONAL, "<Text>One") }, CONDITIONAL);
  assert.ok(!result.error, result.error);
  const [block, first] = order(result.code, "{on && <Badge>On</Badge>}", "<Text>One");
  assert.ok(block > 0 && block < first, "the whole condition first");
  assert.equal(result.code.split("on && <Badge>").length, 2, "moved, not copied");
});

test("moveElement: a condition's element and a .map row step past a sibling as their blocks", () => {
  const up = run(locOf(CONDITIONAL, "<Badge>On"), "Badge", { op: "moveElement", to: "prev" }, CONDITIONAL);
  assert.ok(!up.error, up.error);
  const [block, box] = order(up.code, "{on && <Badge>On</Badge>}", '<Box padding="md" />');
  assert.ok(block < box, "before the Box it followed");
  const down = run(locOf(SOURCE, "<Stack key"), "Stack", { op: "moveElement", to: "next" });
  assert.ok(!down.error, down.error);
  const [detached, map] = order(down.code, "<Box padding=\"sm\">Detached", "items.map");
  assert.ok(detached < map, "the list after the next child");
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

test("floatAt (F3 Paste here): the group's corner at the point, offsets kept, constraints gone, others in a Box", () => {
  assert.equal(floatAt('<Shape type="rectangle" position="absolute" constraintX="right" insetLeft={40} insetRight={8} insetTop={30} />', { x: 100, y: 50 }),
    '<Shape position="absolute" insetLeft={100} insetTop={50} type="rectangle" />');
  assert.equal(floatAt('<Box position="absolute" insetLeft={10} insetTop={20}>\n  <Text>A</Text>\n</Box>\n<Shape\n  position="absolute"\n  insetLeft={30}\n  insetTop={5}\n/>', { x: 0, y: 0 }),
    '<Box position="absolute" insetLeft={0} insetTop={15}>\n  <Text>A</Text>\n</Box>\n<Shape position="absolute" insetLeft={20} insetTop={0}\n/>');
  assert.equal(floatAt("<Button>Go</Button>", { x: 12.4, y: 7 }), '<Box position="absolute" insetLeft={12} insetTop={7}>\n  <Button>Go</Button>\n</Box>');
});

test("pasteCode at: the layers land floating at the point", () => {
  const result = paste(inner, { code: '<Shape type="ellipse" position="absolute" insetLeft={300} insetTop={200} />', at: { x: 16, y: 24 } });
  assert.ok(!result.error, result.error);
  assert.match(result.code, /<Shape position="absolute" insetLeft=\{16\} insetTop=\{24\} type="ellipse" \/>/);
  assert.match(paste(inner, { code: "<Text>x</Text>", at: { x: "a" } }).error, /`at`/);
});

test("group (F3 Frame selection / ⌘G): floating layers into one floating Box, each keeping its place", () => {
  const code = ['import { Box, Shape } from "../../../components/Layout";', "export function Demo() {", "  return (", "    <Box width={358} height={220}>", '      <Shape type="rectangle" position="absolute" insetLeft={20} insetTop={20} width={80} height={60} />', '      <Shape type="ellipse" position="absolute" insetLeft={140} insetTop={40} width={60} height={60} />', '      <Shape type="star" position="absolute" constraintX="right" insetRight={10} insetTop={10} width={40} height={40} />', "    </Box>", "  );", "}", ""].join("\n");
  const rect = locOf(code, '<Shape type="rectangle"');
  const ellipse = locOf(code, '<Shape type="ellipse"');
  const result = applySlotOp(code, rect, "Shape", { op: "group", with: [ellipse], box: { x: 20, y: 20, width: 180, height: 80 }, kids: { [rect]: { x: 0, y: 0 }, [ellipse]: { x: 120, y: 20 } }, props: { name: { kind: "string", value: "Group 1" } } }, { file: FILE, hash: sha1(code) });
  assert.ok(!result.error, result.error);
  assert.equal(result.code.split("\n").slice(3, 9).join("\n"), [
    "    <Box width={358} height={220}>",
    '      <Box position="absolute" insetLeft={20} insetTop={20} width={180} height={80} name="Group 1">',
    '        <Shape position="absolute" insetLeft={0} insetTop={0} type="rectangle" width={80} height={60} />',
    '        <Shape position="absolute" insetLeft={120} insetTop={20} type="ellipse" width={60} height={60} />',
    "      </Box>",
    '      <Shape type="star" position="absolute" constraintX="right" insetRight={10} insetTop={10} width={40} height={40} />',
  ].join("\n"), "where the frontmost of them was: the unselected Star stays in front");
  assert.equal(result.inserted.loc, locOf(result.code, '<Box position="absolute"'));
  // The last layers of their frame (nothing after them): the Box stands where the Star was.
  const star = locOf(code, '<Shape type="star"');
  const tail = applySlotOp(code, ellipse, "Shape", { op: "group", with: [star], box: { x: 140, y: 10, width: 208, height: 90 }, kids: { [ellipse]: { x: 0, y: 30 }, [star]: { x: 168, y: 0 } } }, { file: FILE, hash: sha1(code) });
  assert.ok(!tail.error, tail.error);
  assert.match(tail.code, /insetTop=\{20\} width=\{80\} height=\{60\} \/>\n {6}<Box position="absolute" insetLeft=\{140\} insetTop=\{10\} width=\{208\} height=\{90\}>\n {8}<Shape position="absolute" insetLeft=\{0\} insetTop=\{30\} type="ellipse"[^\n]*\n {8}<Shape position="absolute" insetLeft=\{168\} insetTop=\{0\} type="star" width=\{40\} height=\{40\} \/>\n {6}<\/Box>\n {4}<\/Box>/);
  const flow = applySlotOp(code, rect, "Shape", { op: "group", with: [ellipse], flow: true, box: { x: 0, y: 0, width: 180, height: 80 }, kids: { [rect]: { x: 0, y: 0 }, [ellipse]: { x: 120, y: 20 } }, props: { group: { kind: "boolean", value: true } } }, { file: FILE, hash: sha1(code) });
  assert.ok(!flow.error, flow.error);
  assert.match(flow.code, /<Box width=\{180\} height=\{80\} group>/, "in auto layout: no position of its own; group as a bare prop");
  const missing = applySlotOp(code, rect, "Shape", { op: "group", with: [ellipse], box: { x: 0, y: 0, width: 1, height: 1 }, kids: { [rect]: { x: 0, y: 0 } } }, { file: FILE, hash: sha1(code) });
  assert.match(missing.error, /no place/);
});

test("ungroup (F3 ⇧⌘G): the layers take the group's place, floating where they were, or in the flow", () => {
  const code = ['import { Box, Shape, Stack } from "../../../components/Layout";', "export function Demo() {", "  return (", "    <Box width={358} height={220}>", '      <Box position="absolute" insetLeft={20} insetTop={20} width={180} height={80} name="Group 1">', '        <Shape position="absolute" insetLeft={0} insetTop={0} type="rectangle" width={80} height={60} />', '        <Shape\n          position="absolute"\n          insetLeft={120}\n          insetTop={20}\n          type="ellipse"\n        />', "      </Box>", "    </Box>", "  );", "}", ""].join("\n");
  const group = locOf(code, '<Box position="absolute"');
  const rect = locOf(code, '<Shape position="absolute" insetLeft={0}');
  const ellipse = locOf(code, "<Shape\n");
  const result = applySlotOp(code, group, "Box", { op: "ungroup", kids: { [rect]: { x: 20, y: 20 }, [ellipse]: { x: 140, y: 40 } } }, { file: FILE, hash: sha1(code) });
  assert.ok(!result.error, result.error);
  assert.equal(result.code.split("\n").slice(3, 7).join("\n"), [
    "    <Box width={358} height={220}>",
    '      <Shape position="absolute" insetLeft={20} insetTop={20} type="rectangle" width={80} height={60} />',
    '      <Shape position="absolute" insetLeft={140} insetTop={40}',
    '        type="ellipse"',
  ].join("\n"));
  assert.deepEqual(result.moved.locs, { [rect]: "5:6", [ellipse]: "6:6" });
  const flow = applySlotOp(code, group, "Box", { op: "ungroup" }, { file: FILE, hash: sha1(code) });
  assert.ok(!flow.error, flow.error);
  assert.match(flow.code, /<Box width=\{358\} height=\{220\}>\n {6}<Shape type="rectangle" width=\{80\} height=\{60\} \/>\n {6}<Shape\n {8}type="ellipse"\n {6}\/>\n {4}<\/Box>/);
  assert.match(applySlotOp(code, group, "Box", { op: "ungroup", kids: { [rect]: { x: 1, y: 1 } } }, { file: FILE, hash: sha1(code) }).error, /every layer/);
});

test("components (F3, a page you made): Create component of several floating layers, Create multiple components", () => {
  const PAGE = "local:demo.zen.tsx";
  const code = ['import { Board, Screen } from "@zen-ds/react/builder";', 'import { Box, Shape } from "@zen-ds/react";', "", "export default function Page() {", "  return (", "    <Board>", '      <Screen id="screen-1" title="One" device="phone">', "        <Box width={358} height={220}>", '          <Shape type="rectangle" position="absolute" insetLeft={20} insetTop={20} width={80} height={60} />', '          <Shape type="ellipse" position="absolute" insetLeft={140} insetTop={40} width={60} height={60} />', "        </Box>", "      </Screen>", "    </Board>", "  );", "}", ""].join("\n");
  const rect = locOf(code, '<Shape type="rectangle"');
  const ellipse = locOf(code, '<Shape type="ellipse"');
  const one = applySlotOp(code, rect, "Shape", { op: "group", with: [ellipse], box: { x: 20, y: 20, width: 180, height: 80 }, kids: { [rect]: { x: 0, y: 0 }, [ellipse]: { x: 120, y: 20 } }, component: { id: "shapes", name: "Shapes" } }, { file: PAGE, hash: sha1(code) });
  assert.ok(!one.error, one.error);
  assert.match(one.code, /^import \{ Board, Component, Screen \} from "@zen-ds\/react\/builder";/);
  assert.match(one.code, /<Box width=\{358\} height=\{220\}>\n {10}<Component id="shapes" name="Shapes">\n {12}<Box position="absolute" insetLeft=\{20\} insetTop=\{20\} width=\{180\} height=\{80\}>\n {14}<Shape position="absolute" insetLeft=\{0\}[^\n]*\n {14}<Shape[^\n]*\n {12}<\/Box>\n {10}<\/Component>\n {8}<\/Box>/);
  assert.equal(one.inserted.loc, locOf(one.code, '<Box position="absolute"'));
  const each = applySlotOp(code, rect, "Shape", { op: "many", action: "components", locs: [rect, ellipse], names: { [rect]: { id: "rectangle", name: "Rectangle" }, [ellipse]: { id: "ellipse", name: "Ellipse" } } }, { file: PAGE, hash: sha1(code) });
  assert.ok(!each.error, each.error);
  assert.match(each.code, /<Component id="rectangle" name="Rectangle">\n {12}<Shape type="rectangle"[^\n]*\n {10}<\/Component>\n {10}<Component id="ellipse" name="Ellipse">\n {12}<Shape type="ellipse"[^\n]*\n {10}<\/Component>/);
  assert.equal(each.code.split('"@zen-ds/react/builder"').length, 2, "one builder import");
  assert.match(applySlotOp(code, rect, "Shape", { op: "many", action: "components", locs: [rect, ellipse], names: { [rect]: { id: "r", name: "R" } } }, { file: PAGE, hash: sha1(code) }).error, /names/);
});

test("group as a boolean group (F9b) and as one vector (Flatten / Outline stroke)", () => {
  const code = ['import { Box } from "../../../components/Layout";', 'import { Shape } from "../../../components/Shape";', "export function Demo() {", "  return (", "    <Box width={358} height={220}>", '      <Shape type="rectangle" position="absolute" insetLeft={20} insetTop={20} width={80} height={60} />', '      <Shape type="ellipse" position="absolute" insetLeft={60} insetTop={40} width={60} height={60} />', "    </Box>", "  );", "}", ""].join("\n");
  const rect = locOf(code, '<Shape type="rectangle"');
  const ellipse = locOf(code, '<Shape type="ellipse"');
  const boolean = applySlotOp(code, rect, "Shape", { op: "group", tag: "Shape", with: [ellipse], box: { x: 20, y: 20, width: 100, height: 80 }, kids: { [rect]: { x: 0, y: 0 }, [ellipse]: { x: 40, y: 20 } }, props: { type: { kind: "string", value: "boolean" }, operation: { kind: "string", value: "subtract" } } }, { file: FILE, hash: sha1(code) });
  assert.ok(!boolean.error, boolean.error);
  assert.match(boolean.code, /<Shape position="absolute" insetLeft=\{20\} insetTop=\{20\} width=\{100\} height=\{80\} type="boolean" operation="subtract">\n {8}<Shape position="absolute" insetLeft=\{0\} insetTop=\{0\} type="rectangle"[^\n]*\n {8}<Shape position="absolute" insetLeft=\{40\} insetTop=\{20\} type="ellipse"[^\n]*\n {6}<\/Shape>/);
  const flat = applySlotOp(code, rect, "Shape", { op: "group", tag: "Shape", childless: true, with: [ellipse], box: { x: 20, y: 20, width: 100, height: 80 }, props: { type: { kind: "string", value: "vector" }, d: { kind: "string", value: "M 0 0 L 10 0 Z" }, viewBox: { kind: "string", value: "0 0 100 80" } } }, { file: FILE, hash: sha1(code) });
  assert.ok(!flat.error, flat.error);
  assert.match(flat.code, /<Box width=\{358\} height=\{220\}>\n {6}<Shape position="absolute" insetLeft=\{20\} insetTop=\{20\} width=\{100\} height=\{80\} type="vector" d="M 0 0 L 10 0 Z" viewBox="0 0 100 80" \/>\n {4}<\/Box>/);
  assert.match(applySlotOp(code, rect, "Shape", { op: "group", tag: "Shape", with: [ellipse], box: { x: 0, y: 0, width: 1, height: 1 }, kids: {} }, { file: FILE, hash: sha1(code) }).error, /boolean group or one vector/);
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

test("many duplicate answers every copy by its original (inserted.locs)", () => {
  const result = many(one, "Text", { action: "duplicate", locs: [two, one] });
  assert.ok(!result.error, result.error);
  assert.deepEqual(result.inserted.locs, { [one]: locOf(result.code, "<Text>One", 1), [two]: locOf(result.code, "<Text>Two", 1) });
});

test("many moveTo: layers land together in source order, each answered at its new place", () => {
  const sm = locOf(SOURCE, '<Stack gap="sm">');
  const result = many(one, "Text", { action: "moveTo", locs: [two, one], parent: sm });
  assert.ok(!result.error, result.error);
  assert.match(result.code, /<Stack gap="sm">\n {8}<Badge>Three<\/Badge>\n {8}<Text>One<\/Text>\n {8}<Text>Two<\/Text>\n {6}<\/Stack>/);
  assert.equal(result.code.split("<Text>One").length, 2);
  assert.deepEqual(result.moved.locs, { [one]: locOf(result.code, "<Text>One"), [two]: locOf(result.code, "<Text>Two") });
  // In front of a child that stays; a copy keeps the originals (inserted).
  const front = many(one, "Text", { action: "moveTo", locs: [one, two], parent: sm, before: locOf(SOURCE, "<Badge>Three") });
  assert.match(front.code, /<Stack gap="sm">\n {8}<Text>One<\/Text>\n {8}<Text>Two<\/Text>\n {8}<Badge>Three<\/Badge>/);
  const other = locOf(SOURCE, '<Stack gap="md">', 1);
  const copied = many(one, "Text", { action: "moveTo", copy: true, locs: [one, two], parent: other });
  assert.ok(!copied.error, copied.error);
  assert.equal(copied.code.split("<Text>One").length, 3);
  assert.match(copied.code, /<Text>Elsewhere<\/Text>\n {6}<Text>One<\/Text>\n {6}<Text>Two<\/Text>/);
  assert.deepEqual(copied.inserted.locs, { [one]: locOf(copied.code, "<Text>One", 1), [two]: locOf(copied.code, "<Text>Two", 1) });
});

test("many moveTo refuses: already there, beside a moving layer, a name it reads, into itself", () => {
  assert.match(many(one, "Text", { action: "moveTo", locs: [one, two], parent: outer, before: locOf(SOURCE, '<Stack gap="sm">') }).error, /already there/);
  assert.match(many(one, "Text", { action: "moveTo", locs: [one, two], parent: outer, after: two }).error, /not moving/);
  assert.match(many(one, "Text", { action: "moveTo", locs: [one, locOf(SOURCE, "<Button onClick")], parent: locOf(SOURCE, '<Stack gap="md">', 1) }).error, /`(setOn|on)`/);
  assert.match(many(one, "Text", { action: "moveTo", locs: [one, locOf(SOURCE, '<Stack gap="sm">')], parent: locOf(SOURCE, '<Stack gap="sm">') }).error, /inside itself/);
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

/* ── F7c: an instance's slot from the canvas (slot-fill.mjs) ─────────────────────────────────────────────────────── */

const PAGE_FILE = "local:slots-demo.zen.tsx";
const SLOTTED = `// @zen-page {"format":1,"title":"Slots"}
import { Board, Component, Screen, Use } from "@zen-ds/react/builder";
import { Badge, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Slots" device="desktop">
        <Stack gap="xl" padding="xl">
          <Component id="panel" name="Panel" properties={{ Content: { type: "slot" }, Footer: { type: "slot" } }}>
            <Stack padding="md">
              <Text>Title</Text>
              <Stack data-prop-slot="Content" gap="sm">
                <Text>Empty</Text>
              </Stack>
              <Stack data-prop-slot="Footer" direction="row" />
            </Stack>
          </Component>
          <Use of="panel" />
          <Use of="panel" slots={{ Content: <Text>Filled</Text> }} />
          <Badge>Loose</Badge>
          <Text>Spare</Text>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
const onPage = (loc, name, op, code = SLOTTED) => applySlotOp(code, loc, name, op, { file: PAGE_FILE, hash: sha1(code) });
const bare = locOf(SLOTTED, '<Use of="panel" />');
const filled = locOf(SLOTTED, '<Use of="panel" slots');
const loose = locOf(SLOTTED, "<Badge>Loose");
/** The page's code from its first instance on (the main's own layers left out). */
const instances = (code) => code.slice(code.indexOf("<Use of="));

test("slot: a layer dropped into an instance's empty slot keeps its main's layers there (Figma's default content)", () => {
  const result = onPage(loose, "Badge", { op: "moveTo", parent: bare, slot: "Content", index: 1 });
  assert.ok(!result.error, result.error);
  assert.match(result.code, /<Use of="panel" slots=\{\{ Content: <>\n {12}<Text>Empty<\/Text>\n {12}<Badge>Loose<\/Badge>\n {10}<\/> \}\} \/>/);
  assert.equal(result.code.split("<Badge>Loose").length, 2, "moved, not copied");
  assert.equal(result.moved.loc, locOf(result.code, "<Badge>Loose"));
  assert.match(result.code, /<Stack data-prop-slot="Content" gap="sm">\n {16}<Text>Empty<\/Text>/, "the main is untouched");
  assert.ok(parseSource(result.code));
});

test("slot: index 0 puts it before the main's layers; another slot of the same instance is its own entry", () => {
  const first = onPage(loose, "Badge", { op: "moveTo", parent: bare, slot: "Content", index: 0 });
  assert.ok(!first.error, first.error);
  const [badge, empty] = order(instances(first.code), "<Badge>Loose", "<Text>Empty");
  assert.ok(badge < empty);
  const footer = onPage(locOf(SLOTTED, "<Text>Spare"), "Text", { op: "moveTo", parent: bare, slot: "Footer" });
  assert.ok(!footer.error, footer.error);
  assert.match(footer.code, /<Use of="panel" slots=\{\{ Footer: <Text>Spare<\/Text> \}\} \/>/, "an empty slot of the main takes the one layer as its value");
});

test("slot: into a filled slot before its layer (a fragment of both); pasteCode of an Assets item after it", () => {
  const moved = onPage(loose, "Badge", { op: "moveTo", parent: filled, slot: "Content", before: locOf(SLOTTED, "<Text>Filled") });
  assert.ok(!moved.error, moved.error);
  assert.match(moved.code, /slots=\{\{ Content: <>\n {12}<Badge>Loose<\/Badge>\n {12}<Text>Filled<\/Text>\n {10}<\/> \}\}/);
  const pasted = onPage(filled, "Use", { op: "pasteCode", code: "<Text>New</Text>", slot: "Content", index: 1 });
  assert.ok(!pasted.error, pasted.error);
  assert.match(pasted.code, /slots=\{\{ Content: <>\n {12}<Text>Filled<\/Text>\n {12}<Text>New<\/Text>\n {10}<\/> \}\}/);
  assert.equal(pasted.inserted.loc, locOf(pasted.code, "<Text>New"));
});

test("slot: the last layer dragged out of a slot takes `slots` away; one of several leaves the others", () => {
  const out = onPage(locOf(SLOTTED, "<Text>Filled"), "Text", { op: "moveTo", parent: locOf(SLOTTED, '<Stack gap="xl"'), after: loose });
  assert.ok(!out.error, out.error);
  assert.equal(out.code.split('<Use of="panel" />').length, 3, "both instances plain");
  const [badge, text] = order(out.code, "<Badge>Loose", "<Text>Filled");
  assert.ok(badge < text);
  const two = onPage(loose, "Badge", { op: "moveTo", parent: filled, slot: "Content", index: 1 });
  const back = onPage(locOf(two.code, "<Badge>Loose"), "Badge", { op: "moveTo", parent: locOf(two.code, '<Stack gap="xl"') }, two.code);
  assert.ok(!back.error, back.error);
  assert.match(back.code, /slots=\{\{ Content: <>\n {12}<Text>Filled<\/Text>\n {10}<\/> \}\}/);
  assert.ok(parseSource(back.code));
});

test("slot: reorder inside a slot; its own place is refused; ⌥ copy to another instance's slot", () => {
  const two = onPage(loose, "Badge", { op: "moveTo", parent: filled, slot: "Content", index: 1 }).code;
  const use = locOf(two, '<Use of="panel" slots');
  const reordered = onPage(locOf(two, "<Badge>Loose"), "Badge", { op: "moveTo", parent: use, slot: "Content", index: 0 }, two);
  assert.ok(!reordered.error, reordered.error);
  const [badge, text] = order(reordered.code, "<Badge>Loose", "<Text>Filled");
  assert.ok(badge < text);
  assert.match(onPage(locOf(SLOTTED, "<Text>Filled"), "Text", { op: "moveTo", parent: filled, slot: "Content", index: 0 }).error, /already there/);
  const copied = onPage(locOf(SLOTTED, "<Text>Filled"), "Text", { op: "moveTo", parent: bare, slot: "Content", copy: true });
  assert.ok(!copied.error, copied.error);
  assert.equal(copied.code.split("<Text>Filled").length, 3, "the original stays");
  assert.ok(copied.inserted?.loc);
});

test("slot: a layer inside the slot's one layer moves beside it (the slot becomes a fragment of both)", () => {
  const nested = SLOTTED.replace("slots={{ Content: <Text>Filled</Text> }}", "slots={{ Content: <Stack><Text>In</Text><Badge>Deep</Badge></Stack> }}");
  const result = onPage(locOf(nested, "<Badge>Deep"), "Badge", { op: "moveTo", parent: locOf(nested, '<Use of="panel" slots'), slot: "Content", index: 1 }, nested);
  assert.ok(!result.error, result.error);
  assert.match(result.code, /slots=\{\{ Content: <>\n {12}<Stack><Text>In<\/Text><\/Stack>\n {12}<Badge>Deep<\/Badge>\n {10}<\/> \}\}/);
});

test("slot: refused on a layer that is no instance, a slot the main lacks, several layers at once", () => {
  assert.match(onPage(loose, "Badge", { op: "moveTo", parent: locOf(SLOTTED, '<Stack gap="xl"'), slot: "Content" }).error, /<Use>/);
  assert.match(onPage(loose, "Badge", { op: "moveTo", parent: bare, slot: "Header" }).error, /Panel has no slot Header/);
  assert.match(onPage(bare, "Use", { op: "many", action: "moveTo", locs: [loose], parent: filled, slot: "Content" }).error ?? "", /one layer at a time/);
  assert.match(onPage(loose, "Badge", { op: "moveTo", parent: bare, slot: "Content", index: -1 }).error, /index/);
});

console.log(`✓ arrange (moveTo · pasteCode · replaceElement · many) self-test: ${passed} cases`);
