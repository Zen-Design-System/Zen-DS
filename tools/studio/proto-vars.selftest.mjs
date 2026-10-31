#!/usr/bin/env node
// Self-test of a builder page's prototype variables (tools/studio/proto-vars.mjs). Run: node tools/studio/proto-vars.selftest.mjs
import { evaluate, operandCode, protoValueCode, protoVarsIn, resolveItems, varType, varsIn, withStartValues } from "./proto-vars.mjs";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

const v = (name) => ({ kind: "ref", root: "vars", path: [name] });
const op = (name, ...args) => ({ kind: "expr", op: name, args });
const vars = { count: 2, label: "Cart", on: false, range: "Any time" };
const read = (ref) => (ref.root === "vars" ? vars[ref.path[0]] : ref.root === "row" ? { title: "Last 3 months" }[ref.path[0]] : undefined);

check("varType", ["a", 1, true, null, [], Number.NaN].map(varType), ["text", "number", "boolean", null, null, null]);
check("evaluate: literals and refs", [evaluate("a", read), evaluate(v("count"), read), evaluate({ kind: "ref", root: "row", path: ["title"] }, read)], ["a", 2, "Last 3 months"]);
check("evaluate: arithmetic", [evaluate(op("+", v("count"), 1), read), evaluate(op("-", 5, v("count")), read), evaluate(op("*", v("count"), 3), read), evaluate(op("/", 6, v("count")), read), evaluate(op("/", 1, 0), read)], [3, 3, 6, 3, 0]);
check("evaluate: + joins text", evaluate(op("+", v("label"), op("+", " (", op("+", v("count"), ")"))), read), "Cart (2)");
check("evaluate: comparisons and logic", [evaluate(op("===", v("range"), "Any time"), read), evaluate(op("!==", v("range"), "Any time"), read), evaluate(op("<", v("count"), 3), read), evaluate(op(">=", v("count"), 3), read), evaluate(op("!", v("on")), read), evaluate(op("&&", v("on"), v("count")), read), evaluate(op("||", v("on"), v("count")), read)], [true, false, true, false, true, false, 2]);

check("operandCode: precedence", [operandCode(op("+", v("count"), 1)), operandCode(op("*", op("+", v("count"), 1), 2)), operandCode(op("-", 5, op("-", v("count"), 1))), operandCode(op("!", op("===", v("range"), "Any time"))), operandCode(op("&&", op("!", v("on")), op(">", v("count"), 0)))], ["vars.count + 1", "(vars.count + 1) * 2", "5 - (vars.count - 1)", "!(vars.range === \"Any time\")", "!vars.on && vars.count > 0"]);
check("varsIn", varsIn(op("&&", v("on"), op(">", v("count"), v("count")))), ["on", "count"]);

const action = { kind: "proto", action: "if", args: [v("on"), { kind: "proto", action: "run", args: [{ kind: "proto", action: "set", args: ["count", op("+", v("count"), 1)] }, { kind: "proto", action: "navigate", args: ["home", { animation: "push" }] }] }] };
check("protoValueCode: nested actions", protoValueCode(action), 'proto.if(vars.on, proto.run(proto.set("count", vars.count + 1), proto.navigate("home", {"animation":"push"})))');
check("protoVarsIn: set and read", protoVarsIn(action), ["on", "count"]);
check("resolveItems: a row's field now, a variable later", resolveItems([{ kind: "proto", action: "set", args: ["range", { kind: "ref", root: "row", path: ["title"] }] }, op("===", v("range"), { kind: "ref", root: "row", path: ["title"] })], read), [{ kind: "proto", action: "set", args: ["range", "Last 3 months"] }, op("===", v("range"), "Last 3 months")]);

const layer = { kind: "element", name: "Chip", props: { selected: op("!==", v("range"), "Any time"), hidden: op("!", v("on")), title: { kind: "ref", root: "mock", path: ["t"] }, disabled: op("===", v("range"), { kind: "ref", root: "row", path: [] }) }, children: [v("range"), { kind: "map", source: { root: "mock", path: ["rows"] }, item: "row", node: { kind: "element", name: "Text", props: {}, children: [v("count")] } }] };
check("withStartValues: reads of variables as their start values; a row's condition and the mock stay", withStartValues(layer, vars), { kind: "element", name: "Chip", props: { selected: { kind: "literal", value: false }, hidden: { kind: "literal", value: true }, title: { kind: "ref", root: "mock", path: ["t"] }, disabled: op("===", v("range"), { kind: "ref", root: "row", path: [] }) }, children: [{ kind: "text", value: "Any time" }, { kind: "map", source: { root: "mock", path: ["rows"] }, item: "row", node: { kind: "element", name: "Text", props: {}, children: [{ kind: "text", value: "2" }] } }] });

if (failures.length) {
  console.error(`proto-vars selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ proto-vars selftest: ${passed} checks pass.`);
