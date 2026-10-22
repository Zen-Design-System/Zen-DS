// node tools/studio/relayout.selftest.mjs — Add / Remove auto layout as one code change (relayout.mjs).
import assert from "node:assert/strict";
import { relayoutCode } from "./relayout.mjs";

let count = 0;
const test = (name, run) => { run(); count += 1; };
const at = (text, element) => ({ start: text.indexOf(element), end: text.indexOf(element) + element.length });

const page = `    <Screen>
      <Box position="absolute" insetLeft={40} insetTop={24} width={320} height={200}>
        <Shape type="ellipse" position="absolute" insetLeft={16} insetTop={16} width={80} height={80} />
        <Stack position="absolute" insetLeft={120} insetTop={16} gap="xs">
          <Text>Hello</Text>
        </Stack>
      </Box>
    </Screen>`;
const box = page.slice(page.indexOf("<Box"), page.indexOf("</Box>") + "</Box>".length);

test("add auto layout: the frame becomes a Stack, its layers leave their place", () => {
  const code = relayoutCode(page, at(page, box), {
    tag: "Stack", set: { direction: "row", gap: "lg", padding: "md" }, remove: ["width", "height"],
    children: [{ remove: ["position", "insetLeft", "insetTop"] }, { remove: ["position", "insetLeft", "insetTop"] }],
  });
  assert.equal(code, `<Stack position="absolute" insetLeft={40} insetTop={24} direction="row" gap="lg" padding="md">
  <Shape type="ellipse" width={80} height={80} />
  <Stack gap="xs">
    <Text>Hello</Text>
  </Stack>
</Stack>`);
});

test("order: the layers in the new order", () => {
  const code = relayoutCode(page, at(page, box), { tag: "Stack", order: [1, 0] });
  assert.ok(code.indexOf("<Stack position") < code.indexOf("<Shape"), code);
});

test("wrap: a Box with a fill keeps it and gets a Stack inside", () => {
  const filled = page.replace("height={200}>", 'height={200} surface="surface">');
  const element = filled.slice(filled.indexOf("<Box"), filled.indexOf("</Box>") + 6);
  const code = relayoutCode(filled, at(filled, element), { tag: "Box", set: { padding: "md" }, remove: ["width", "height"], wrap: { tag: "Stack", set: { direction: "row", gap: "lg" } }, children: [{ remove: ["position"] }, {}] });
  assert.match(code, /^<Box position="absolute" insetLeft=\{40\} insetTop=\{24\} surface="surface" padding="md">\n  <Stack direction="row" gap="lg">\n    <Shape type="ellipse" insetLeft/);
  assert.match(code, /\n  <\/Stack>\n<\/Box>$/);
});

test("remove auto layout: a Stack becomes a Box, its layers take X / Y", () => {
  const stack = `<Stack direction="row" gap="md" padding="sm">
  <Button>Save</Button>
  <Button level="tertiary">Cancel</Button>
</Stack>`;
  const code = relayoutCode(stack, { start: 0, end: stack.length }, {
    tag: "Box", set: { width: 240, height: 64 }, remove: ["direction", "gap", "padding"],
    children: [{ float: { set: { position: "absolute", insetLeft: 12, insetTop: 12 } } }, { float: { set: { position: "absolute", insetLeft: 108, insetTop: 12 } } }],
  });
  assert.equal(code, `<Box width={240} height={64}>
  <Box position="absolute" insetLeft={12} insetTop={12}>
    <Button>Save</Button>
  </Box>
  <Box position="absolute" insetLeft={108} insetTop={12}>
    <Button level="tertiary">Cancel</Button>
  </Box>
</Box>`);
});

test("an empty frame: one self-closing tag", () => assert.equal(relayoutCode("<Box width={10} />", { start: 0, end: 18 }, { tag: "Stack", remove: ["width"] }), "<Stack />"));
test("unwrap: a float wrapper gives its layer back", () => {
  const free = `<Box width={300} height={100}>
  <Box position="absolute" insetLeft={8} insetTop={8}>
    <Button>Save</Button>
  </Box>
</Box>`;
  assert.equal(relayoutCode(free, { start: 0, end: free.length }, { tag: "Stack", remove: ["width", "height"], children: [{ unwrap: true }] }), `<Stack>
  <Button>Save</Button>
</Stack>`);
});
const whole = (code) => ({ start: 0, end: code.length });
const mapped = "<Box>{items.map((item) => <Text>{item}</Text>)}</Box>";
test("a .map among the layers is refused", () => assert.throws(() => relayoutCode(mapped, whole(mapped), { tag: "Stack" }), /list or code/));
test("loose words are refused", () => assert.throws(() => relayoutCode("<Box>Hello</Box>", whole("<Box>Hello</Box>"), { tag: "Stack" }), /text of its own/));

// An empty painted frame still takes auto layout: its Box keeps the fill and holds an empty Stack (autolayout matrix,
// 2026-10-17: it stayed a Box with nothing inside).
const painted = '<Box surface="surface" width={200} height={100} />';
test("an empty painted frame gets its auto layout Stack", () => assert.equal(relayoutCode(painted, whole(painted), { tag: "Box", remove: ["width", "height"], children: [], order: [], wrap: { tag: "Stack", set: { direction: "row" } } }), `<Box surface="surface">
  <Stack direction="row" />
</Box>`));

test("an empty plan writes the element as it is, a Text's words too (Detach of a Text main)", () => {
  const text = `    <Component id="promo" name="Promo">\n      <Text tone="light">\n        Promo\n      </Text>\n    </Component>`;
  const element = `<Text tone="light">\n        Promo\n      </Text>`;
  assert.equal(relayoutCode(text, at(text, element), {}), `<Text tone="light">\n  Promo\n</Text>`);
});

console.log(`relayout selftest: ${count} passed`);
