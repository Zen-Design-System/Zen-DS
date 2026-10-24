#!/usr/bin/env node
// Self-test of ./cellComponents.ts (imported directly: Node strips the types): a project component set in a Table
// column's Content slot, one instance per value (`cells`). Run: node src/platform/studio/table/cellComponents.selftest.mjs
import { axisFor, cellsCode, cellsComponent, slotComponents, slotKey } from "./cellComponents.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

const main = (set, variant) => ({ kind: "main", root: null, name: Object.values(variant).join(", "), set, variant, properties: [] });
const set = (name, variants) => ({ kind: "set", name, variants, properties: [] });
// This page: a Status set (Status × Size); the components page: a Priority set and a lone main (not a set).
const own = new Map([
  ["status", set("Trạng thái", ["s-todo", "s-doing", "s-done", "s-doing-lg"])],
  ["s-todo", main("status", { Status: "Cần làm", Size: "Medium" })],
  ["s-doing", main("status", { Status: "Đang làm", Size: "Medium" })],
  ["s-done", main("status", { Status: "Hoàn thành", Size: "Medium" })],
  ["s-doing-lg", main("status", { Status: "Đang làm", Size: "Large" })],
]);
const components = new Map([
  ["priority", set("Ưu tiên", ["p-high", "p-low"])],
  ["p-high", main("priority", { Level: "Cao" })],
  ["p-low", main("priority", { Level: "Thấp" })],
  ["logo", { kind: "main", root: null, name: "Logo", properties: [] }],
]);
const library = new Map([["components", components], ["tasks", own]]);

const sets = slotComponents(library, "tasks");
check("sets: this page's first, its own `<Use>` names no page; a lone main is not offered", sets.map((entry) => [entry.id, entry.page, entry.name]), [["status", null, "Trạng thái"], ["priority", "components", "Ưu tiên"]]);
check("sets: each variant property with its values in the set's order", sets[0].axes, { Status: ["Cần làm", "Đang làm", "Hoàn thành"], Size: ["Medium", "Large"] });
check("sets: no library, none", slotComponents(undefined, "tasks"), []);

check("axis: the property whose values name the column's values", axisFor(sets[0], ["Đang làm", "Hoàn thành", "Đang làm"]), "Status");
check("axis: none named, the first property", axisFor(sets[0], ["Late"]), "Status");
check("axis: a later property when it names more", axisFor(sets[0], ["Large", "Large"]), "Size");

const code = cellsCode(sets[0], "Status");
check("code: every value → an instance with that variant, in the set's order", code,
  '{ "Cần làm": <Use of="status" variant={{ "Status": "Cần làm" }} />, "Đang làm": <Use of="status" variant={{ "Status": "Đang làm" }} />, "Hoàn thành": <Use of="status" variant={{ "Status": "Hoàn thành" }} /> }');
check("code: another page's set names its page", cellsCode(sets[1], "Level"),
  '{ "Cao": <Use of="priority" page="components" variant={{ "Level": "Cao" }} />, "Thấp": <Use of="priority" page="components" variant={{ "Level": "Thấp" }} /> }');

check("read back: the set a written cells holds", [cellsComponent(code), cellsComponent(cellsCode(sets[1], "Level"))], [{ id: "status", page: null }, { id: "priority", page: "components" }]);
check("read back: two sets, or no instance, is none", [cellsComponent('{ a: <Use of="status" />, b: <Use of="priority" page="components" /> }'), cellsComponent("{ a: <Badge /> }"), cellsComponent(undefined)], [null, null, null]);
check("key: page and id", [slotKey(sets[0]), slotKey(sets[1])], ["component::status", "component:components:priority"]);

if (failures.length) {
  console.error(`✗ cellComponents selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ cellComponents selftest: ${passed} checks pass.`);
