#!/usr/bin/env node
// Writing instance overrides (./overrides.ts, imported directly: Node strips the types): the table read from the owner,
// one prop set or removed, a layer reset, and the code and ops written. Run: node src/platform/studio/inspector/overrides.selftest.mjs
import { overrideOps, overridesCode, overrideTable, withOverride, withoutLayer } from "./overrides.ts";

const failures = [];
let passed = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

check("reads literals only", overrideTable({ "Sub-Action": { level: "danger", onClick() {}, size: 2, on: true }, bad: 3, empty: {} }), { "Sub-Action": { level: "danger", size: 2, on: true } });
check("reads nothing from a non-object", overrideTable(undefined), {});

const one = withOverride({}, "Sub-Action", "level", "danger");
check("sets a prop", one, { "Sub-Action": { level: "danger" } });
const two = withOverride(one, "Sub-Action/Leading-Icon", "name", "icon-plus-line");
check("adds a deeper layer", two, { "Sub-Action": { level: "danger" }, "Sub-Action/Leading-Icon": { name: "icon-plus-line" } });
check("does not change its input", one, { "Sub-Action": { level: "danger" } });
check("removing the last prop drops the layer", withOverride(two, "Sub-Action", "level", null), { "Sub-Action/Leading-Icon": { name: "icon-plus-line" } });
check("resets a layer", withoutLayer(two, "Sub-Action/Leading-Icon"), { "Sub-Action": { level: "danger" } });

check("code: quoted paths, plain prop names", overridesCode({ "Row[binh]/status/Badge": { theme: "red", "aria-label": "x", size: 2 } }), '{ "Row[binh]/status/Badge": { theme: "red", "aria-label": "x", size: 2 } }');
check("code: empty", overridesCode({}), "{}");

check("ops: set", overrideOps({}, one), [{ op: "setProp", name: "overrides", value: { kind: "expression", code: '{ "Sub-Action": { level: "danger" } }' } }]);
check("ops: unchanged", overrideOps(one, { "Sub-Action": { level: "danger" } }), []);
check("ops: emptied", overrideOps(one, {}), [{ op: "removeProp", name: "overrides" }]);

if (failures.length) {
  console.error(`overrides selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`overrides selftest: ${passed} passed`);
