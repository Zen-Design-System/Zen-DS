#!/usr/bin/env node
// Self-test of how the Studio reads a page's prototype variables (protoVarsModel.ts, W-52 B2).
// Run: node src/platform/studio/builder/proto/protoVarsModel.selftest.mjs
import { parsePage } from "../../../../../tools/studio/dialect.mjs";
import { actionCode, expressionCode, freeVarName, literalCode, operandWords, pageVarsOf, varReadOf, varUsesOf } from "./protoVarsModel.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

const page = `// @zen-page {"format":1,"title":"Vars"}
import { Board, Screen, proto } from "@zen-ds/react/builder";
import { Button, Chip, Stack, Text } from "@zen-ds/react";

export const mock = {};
export const vars = { dateRange: "Any time", count: 0, on: false };

export default function Page() {
  return (
    <Board>
      <Screen id="home" title="Home" device="phone">
        <Stack gap="md">
          <Chip selected={vars.dateRange !== "Any time"}>{vars.dateRange}</Chip>
          <Text hidden={!vars.on}>Welcome</Text>
          <Button onClick={proto.run(proto.set("count", vars.count + 1), proto.navigate("home"))}>Add</Button>
          <Text>Plain</Text>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
const tree = parsePage(page);
check("the page parses", tree.errors, []);
check("pageVarsOf: name, kind, start", pageVarsOf(tree), [{ name: "dateRange", type: "text", value: "Any time" }, { name: "count", type: "number", value: 0 }, { name: "on", type: "boolean", value: false }]);
const uses = varUsesOf(tree);
check("varUsesOf: one layer per use, each variable", [...uses.entries()].map(([name, locs]) => [name, locs.size]), [["dateRange", 1], ["on", 1], ["count", 1]]);
check("freeVarName", [freeVarName("text", ["text1"]), freeVarName("boolean", [])], ["text2", "boolean1"]);

const button = tree.board.children[0].children[0].children[2];
check("actionCode: several actions as written", actionCode(button.props.onClick), 'proto.run(proto.set("count", vars.count + 1), proto.navigate("home"))');
check("operandWords: an expression without vars.", operandWords(button.props.onClick.args[0].args[1]), "count + 1");
check("literalCode", [literalCode({ title: "Done", "x-y": 1 }), literalCode("a"), literalCode(false)], ['{ title: "Done", "x-y": 1 }', '"a"', "false"]);

const names = ["dateRange", "count", "on"];
check("expressionCode: names, == and words, quotes kept", [expressionCode("count + 1", names), expressionCode('dateRange == "Any time" and not on', names), expressionCode("count != 0 or on", names), expressionCode("'a' + dateRange", names)], ["vars.count + 1", 'vars.dateRange === "Any time" && ! vars.on', "vars.count !== 0 || vars.on", '"a" + vars.dateRange']);
check("expressionCode: an unknown name or nothing", [expressionCode("total + 1", names), expressionCode("  ", names)], [null, null]);
check("varReadOf: the forms a field reads", [varReadOf("vars.on"), varReadOf("!vars.on"), varReadOf('vars.dateRange === "Any time"'), varReadOf("vars.count !== 0"), varReadOf("mock.title"), varReadOf("!vars.a === 1")], [{ name: "on", words: "on" }, { name: "on", words: "not on" }, { name: "dateRange", words: 'dateRange is "Any time"' }, { name: "count", words: "count is not 0" }, null, null]);

if (failures.length) {
  console.error(`✗ protoVarsModel selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ protoVarsModel selftest: ${passed} checks pass.`);
