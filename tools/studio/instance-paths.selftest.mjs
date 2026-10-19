// Self-test for tools/studio/instance-paths.mjs and the dialect's `<Use overrides>` checks (F7b): a main's layers by
// their path inside an instance, overrides that name a layer (or one inside it) with literal values.
import { componentSets, localComponents, mainLayerPaths, parsePage } from "./dialect.mjs";
import { instanceLayerPaths } from "./instance-paths.mjs";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

const page = (use) => `// @zen-page {"format":1,"title":"Paths"}
import { Board, Component, ComponentSet, Screen, Use } from "@zen-ds/react/builder";
import { Badge, Icon, Stack, Text } from "@zen-ds/react";

export default function Paths() {
  return (
    <Board>
      <Screen id="screen-1" title="Paths" device="desktop">
        <Stack gap="lg">
          <Component id="tag" name="Tag">
            <Stack direction="row">
              <Badge>New</Badge>
            </Stack>
          </Component>
          <Component id="card" name="Card">
            <Stack>
              <Text>Title</Text>
              <Stack direction="row" data-name="Row">
                <Icon name="icon-star-01-line" />
                <Text>One</Text>
                <Text>Two</Text>
              </Stack>
              <Use of="tag" />
            </Stack>
          </Component>
          ${use}
        </Stack>
      </Screen>
    </Board>
  );
}
`;
const components = new Set(["Badge", "Icon", "Stack", "Text"]);
const tree = parsePage(page('<Use of="card" />'), { components });
check("the page parses", tree.errors.map((error) => error.message), []);
const model = { mains: localComponents(tree.board), sets: componentSets(tree.board) };
const card = model.mains.find((main) => main.id === "card");
const paths = [...mainLayerPaths(card, model).values()];
check("a main's layers by path: given names, [i] on same names, a nested instance by its component's name", paths, ["Text", "Row", "Row/Icon", "Row/Text[0]", "Row/Text[1]", "Tag"]);
check("the root is the instance itself: no path", mainLayerPaths(card, model).has(card.root), false);
check("no main: no paths", instanceLayerPaths(null).size, 0);

const errorsOf = (use) => parsePage(page(use), { components }).errors.map((error) => error.message);
check("overrides of its layers, a nested instance's and a nested component's own layer", errorsOf('<Use of="card" overrides={{ Text: { children: "Hello" }, "Row/Text[1]": { hidden: true }, Tag: { "props.Label": "Hot" }, "Tag/Badge": { theme: "positive" }, "Row/Icon/Glyph": { size: "sm" } }} />'), []);
check("an override of no layer is refused (below a frame, only the layers it lists)", errorsOf('<Use of="card" overrides={{ "Row/Text[2]": { hidden: true }, "Row/Badge": { hidden: true } }} />'), ["<Use> overrides no layer Row/Text[2] of Card", "<Use> overrides no layer Row/Badge of Card"]);
check("overrides take literal values", errorsOf('<Use of="card" overrides={{ Text: { tone: ["base"] } }} />'), ["overrides of Text take literal values"]);
check("overrides is an object", errorsOf('<Use of="card" overrides="Text" />'), ["overrides is an object: overrides={{ Text: { children: \"Done\" } }}"]);

if (failures.length) {
  console.error(`instance-paths selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ instance-paths selftest: ${passed} checks pass.`);
