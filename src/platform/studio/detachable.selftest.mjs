#!/usr/bin/env node
// Zen Studio: the client's DETACHABLE list (./detachable.ts, imported directly: Node strips the types) must equal the
// dev server's list in tools/studio/detach.mjs (read as text, so this needs none of the server's dependencies).
//   node src/platform/studio/detachable.selftest.mjs   exit 1 on any failure
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { DETACHABLE, detachableList, isDetachableType, shortReason } from "./detachable.ts";

const failures = [];
let passed = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const serverFile = fileURLToPath(new URL("../../../tools/studio/detach.mjs", import.meta.url));
const source = fs.readFileSync(serverFile, "utf8");
const match = /export const DETACHABLE\s*=\s*\[([^\]]*)\]/.exec(source);
check("server list found in tools/studio/detach.mjs", Boolean(match), true);
const server = match ? [...match[1].matchAll(/"([^"]+)"|'([^']+)'/g)].map((item) => item[1] ?? item[2]) : [];

check("client DETACHABLE equals the server's", [...DETACHABLE], server);
for (const name of server) check(`isDetachableType(${name})`, isDetachableType(name), true);
for (const name of ["Avatar", "Button", "Tabs", "Box", "Stack", "div", "PhoneApproveExample", ""]) check(`isDetachableType(${name})`, isDetachableType(name), false);
check("detachableList", detachableList(), "Card, ListItem, MetricCard, Metric, EmptyState, DescriptionList, InlineMessage, Badge and Tag");

// shortReason: the first clause of a server reason, never cut inside quoted source.
const shortCases = [
  ["Its layout comes from {wide ? \"inline\" : \"stacked\"}; set a fixed layout before detaching.", "Its layout comes from {wide ? \"inline\" : \"stacked\"}"],
  ["Its trend comes from {{ value: 3 }}; write it as an object literal before detaching.", "Its trend comes from {{ value: 3 }}"],
  ["Its rows come from a .map whose callback does more than return an object literal (rows.map((r) => { const x = 1; return x; })).", "Its rows come from a .map whose callback does more than return an object literal"],
  ["It renders 3 times but not inside a .map callback, so one instance cannot be detached alone (detach would change every instance).", "It renders 3 times outside a .map"],
  ["It renders several times but not inside a .map callback, so one instance cannot be detached alone (detach would change every instance).", "It renders several times outside a .map"],
  ["This list repeats in 3 places; detaching a row would change each of them.", "This list repeats in 3 places"],
  ["This Tag is interactive (remove): it is a control. Only presentational instances detach.", "This Tag is interactive (remove)"],
  ["It spreads {...rest}: detach needs every prop written out.", "It spreads {...rest}"],
  ["Expected <Card> at 12:3, found <Box>.", "Expected <Card> at 12:3, found <Box>"],
  ["It sits inside a paragraph (<p> at line 4): the detached Card is a <div> Box.", "It sits inside a paragraph"],
  ["Card is not rendered right now — nothing to measure", "Card is not rendered right now"],
  ["This element renders once per row of a .map callback: pass `instance` (the row).", "This element renders once per row of a .map callback"],
  ["It has no rows to detach.", "It has no rows to detach"],
];
for (const [reason, expected] of shortCases) check(`shortReason(${reason.slice(0, 40)}…)`, shortReason(reason), expected);

if (failures.length) {
  console.error(`detachable selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`detachable selftest: ${passed} passed`);
