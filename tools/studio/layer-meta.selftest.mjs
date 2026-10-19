// Self-test for tools/studio/layer-meta.mjs (plan docs/research/studio-figma-design-parity-2026-10-18.md F1): Figma's layer
// names and locks on a builder page — automatic names in page order, a name the person gave, a lock — read by the
// dialect, kept by the export (the name) or left out of it (the lock), and Figma's batch rename.
// Run: node tools/studio/layer-meta.selftest.mjs
import { compileReact } from "./compile.mjs";
import { parsePage, validateDialect } from "./dialect.mjs";
import { autoLayerNames, batchNames, givenNameOf, isAutomaticName, isLockedValue, textWordsOf } from "./layer-meta.mjs";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

const PAGE = `// @zen-page {"format":1,"title":"Names"}
import { Board, Component, Screen, Use } from "@zen-ds/react/builder";
import { Button, Shape, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Home" device="desktop">
        <Stack>
          <Text>Welcome back, Alex</Text>
          <Stack direction="row" data-name="Price row" data-locked>
            <Shape type="ellipse" width={24} height={24} />
            <Shape type="rectangle" width={24} height={24} />
            <Shape type="ellipse" width={24} height={24} />
          </Stack>
          <Button>Buy</Button>
          <Component id="tag" name="Tag">
            <Stack direction="row"><Text>New</Text></Stack>
          </Component>
          <Use of="tag" data-name="Hot tag" data-locked />
        </Stack>
      </Screen>
    </Board>
  );
}
`;

const page = parsePage(PAGE, { components: new Set(["Button", "Shape", "Stack", "Text"]) });
check("the page is valid dialect (an instance carries a data-name and a lock)", page.errors, []);
check("validateDialect refuses other props on <Use>", validateDialect(PAGE.replace('<Use of="tag" data-name="Hot tag" data-locked />', '<Use of="tag" title="x" />'), { components: new Set(["Button", "Shape", "Stack", "Text"]) }).map((error) => error.message), ["<Use> takes of, variant, props and overrides only, not title"]);
const names = [...autoLayerNames(page.board).values()];
check("automatic names: frames and shapes numbered per kind in page order, text by its words", names, ["Frame 1", "Welcome back, Alex", "Frame 2", "Ellipse 1", "Rectangle 1", "Ellipse 2", "Frame 3", "New"]);
const row = page.board.children[0].children[0].children.find((child) => child.kind === "element" && child.props["data-name"]);
check("a layer's given name and lock", [givenNameOf(row), isLockedValue(row.props["data-locked"])], ["Price row", true]);
check("no given name: blank or missing", [givenNameOf({ props: { "data-name": { kind: "literal", value: "  " } } }), givenNameOf({ props: {} })], [null, null]);
check("lock values", [isLockedValue(true), isLockedValue("true"), isLockedValue({ kind: "literal", value: true }), isLockedValue(false), isLockedValue(undefined)], [true, true, true, false, false]);
check("text words: one line, cut with …", [textWordsOf({ children: [{ kind: "text", value: "  Hello\n  world " }] }), textWordsOf({ children: [{ kind: "text", value: "x".repeat(70) }] })?.length, textWordsOf({ children: [] })], ["Hello world", 60, null]);
check("automatic names Figma and the Studio give", [isAutomaticName("Frame 12", { name: "Stack" }), isAutomaticName("Rectangle", { name: "Shape" }), isAutomaticName("Hello", { name: "Text", children: [{ kind: "text", value: "Hello" }] }), isAutomaticName("Hero", { name: "Stack" }), isAutomaticName("", { name: "Stack" })], [true, true, true, false, true]);

const code = compileReact(PAGE, { file: "names.zen.tsx" }).code;
check("export keeps a layer's name, never its lock", [code.includes('data-name="Price row"'), code.includes("data-locked")], [true, false]);

check("batch rename: the current name, numbers up and down, padded", batchNames(["Card", "Card", "Card"], "$& $n · $NN"), ["Card 1 · 03", "Card 2 · 02", "Card 3 · 01"]);
check("batch rename: start from", batchNames(["a", "b"], "Item $nnn", { start: 9 }), ["Item 009", "Item 010"]);
check("batch rename: match replaces that part only", batchNames(["Button primary", "Button secondary"], "CTA", { match: "Button" }), ["CTA primary", "CTA secondary"]);

if (failures.length) {
  console.error(`✗ layer-meta selftest: ${failures.length} failed, ${passed} passed\n${failures.map((failure) => `  ${failure}`).join("\n")}`);
  process.exit(1);
}
console.log(`✓ layer-meta selftest: ${passed} checks pass.`);
