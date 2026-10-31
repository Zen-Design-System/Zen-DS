#!/usr/bin/env node
// Self-test of the edits to a page's prototype variables (tools/studio/proto-vars-edit.mjs, op "pageVars").
// Run: node tools/studio/proto-vars-edit.selftest.mjs
import { editPageVars, freeVarName, varUsesIn } from "./proto-vars-edit.mjs";
import { applyOps } from "./jsx-source.mjs";
import { parsePage } from "./dialect.mjs";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};
const throws = (fn) => { try { fn(); return null; } catch (error) { return error.message; } };

const page = (vars, body) => `// @zen-page {"format":1,"title":"Vars"}
import { Board, Overlay, Screen, proto } from "@zen-ds/react/builder";
import { Button, Chip, Stack, Text } from "@zen-ds/react";

export const mock = { ranges: ["Any time", "Last 3 months"] };${vars === null ? "" : `\nexport const vars = ${vars};`}

export default function Page() {
  return (
    <Board>
      <Screen id="home" title="Home" device="phone">
        <Stack gap="md">
${body.map((line) => `          ${line}`).join("\n")}
        </Stack>
      </Screen>
    </Board>
  );
}
`;
const valid = (text) => parsePage(text).errors.map((error) => `${error.line}: ${error.message}`);
const varsLine = (text) => text.split("\n").find((line) => line.startsWith("export const vars")) ?? null;

// Add: the first one goes after the mock data; the next one joins it.
const empty = page(null, ["<Text>Hi</Text>"]);
const one = editPageVars(empty, { add: { name: "dateRange", value: "Any time" } });
check("add: the first variable after the mock", [varsLine(one), one.indexOf("export const vars") > one.indexOf("export const mock"), valid(one)], ['export const vars = { dateRange: "Any time" };', true, []]);
const two = editPageVars(one, { add: { name: "count", value: 0 } });
check("add: the next one joins it", varsLine(two), 'export const vars = { dateRange: "Any time", count: 0 };');
check("add: a taken or bad name is refused", [throws(() => editPageVars(two, { add: { name: "count", value: 1 } })), throws(() => editPageVars(two, { add: { name: "2x", value: 1 } }))], ["There is a variable named count already", "2x is not a name a variable can have (letters, digits, _ and $)"]);

// Set: the start value, in the variable's kind.
check("set: a new start value in its kind", varsLine(editPageVars(two, { set: { name: "count", value: "5" } })), 'export const vars = { dateRange: "Any time", count: 5 };');

const used = page('{ dateRange: "Any time", count: 0, on: false }', [
  '<Chip selected={vars.dateRange !== "Any time"}>{vars.dateRange}</Chip>',
  "<Text hidden={!vars.on}>Welcome</Text>",
  '{mock.ranges.map((range) => <Button disabled={vars.dateRange === range} onClick={proto.run(proto.set("dateRange", range), proto.close())}>{range}</Button>)}',
  '<Button onClick={proto.set("count", vars.count + 1)}>Add</Button>',
  '<Button onClick={proto.if(vars.on, proto.navigate("home"), proto.toast({ title: "No" }))}>Go</Button>',
]);
check("the test page is valid", valid(used), []);
check("varUsesIn: reads and sets", varUsesIn(used), { dateRange: 4, on: 2, count: 2 });

// Rename: the declaration, every read and every Set variable.
const renamed = editPageVars(used, { rename: { from: "dateRange", to: "period" } });
check("rename: everywhere", [varsLine(renamed), (renamed.match(/vars\.period/g) ?? []).length, renamed.includes('proto.set("period", range)'), renamed.includes("dateRange"), valid(renamed)], ['export const vars = { period: "Any time", count: 0, on: false };', 3, true, false, []]);

// Retype: the start value and literal Set variable values.
const retyped = editPageVars(page('{ flag: "true" }', ['<Button onClick={proto.set("flag", "false")}>a</Button>', '<Text hidden={vars.flag === "true"}>a</Text>']), { retype: { name: "flag", type: "boolean" } });
check("retype: text → boolean", [varsLine(retyped), retyped.includes('proto.set("flag", false)'), valid(retyped)], ["export const vars = { flag: true };", true, []]);

// Remove: reads become start values, a row's condition goes, Set variable goes (from proto.run, or its attribute).
const removedRange = editPageVars(used, { remove: "dateRange" });
check("remove: reads at the start value, the row's condition and its set gone", [varsLine(removedRange), removedRange.includes('<Chip selected={false}>{"Any time"}</Chip>'), removedRange.includes("disabled="), removedRange.includes("onClick={proto.run(proto.close())}"), valid(removedRange)], ["export const vars = { count: 0, on: false };", true, false, true, []]);
const removedCount = editPageVars(used, { remove: "count" });
check("remove: a Set variable alone in its attribute takes the attribute", [removedCount.includes("<Button>Add</Button>"), valid(removedCount)], [true, []]);
check("remove: a read in a Conditional becomes the start value", editPageVars(used, { remove: "on" }).includes('onClick={proto.if(false, proto.navigate("home"), proto.toast({ title: "No" }))}'), true);
check("remove: a Set variable in a Conditional's branch is refused", throws(() => editPageVars(page("{ on: false }", ['<Button onClick={proto.if(vars.on, proto.set("on", false))}>a</Button>']), { remove: "on" })), "A Conditional sets this variable: change that action first");
const last = editPageVars(page("{ on: false }", ["<Text>a</Text>"]), { remove: "on" });
check("remove: the last one takes the declaration", [varsLine(last), valid(last)], [null, []]);

check("freeVarName", freeVarName("text", ["text1", "text2", "count"]), "text3");

// The engine op, on the page's Board.
const board = (text) => { const line = text.split("\n").findIndex((row) => row.includes("<Board>")); return `${line + 1}:${text.split("\n")[line].indexOf("<Board>")}`; };
const viaOp = applyOps(empty, board(empty), "Board", [{ op: "pageVars", change: { add: { name: "on", value: true } } }]);
check("op pageVars: on the Board", varsLine(viaOp.code), "export const vars = { on: true };");
check("op pageVars: refused on another layer, or with other ops", [applyOps(empty, board(empty), "Board", [{ op: "pageVars", change: {} }, { op: "removeProp", name: "x" }]).error, applyOps(empty, board(empty), "Board", [{ op: "pageVars", change: { remove: "nope" } }]).error], ["pageVars cannot be combined with other ops", "No variable named nope"]);

if (failures.length) {
  console.error(`proto-vars-edit selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ proto-vars-edit selftest: ${passed} checks pass.`);
