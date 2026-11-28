#!/usr/bin/env node
// Self-test of who is on a page and who holds its soft lock (./presenceModel.ts, imported directly: Node strips the types).
// Run: node src/platform/studio/collab/presenceModel.selftest.mjs
import { claimsEdit, livePeople, lockedBy, lockHolder, othersOn, personName, PRESENCE_TTL } from "./presenceModel.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

const now = 1_000_000;
const row = (user, editing, { seen = now, created = 0, name = "" } = {}) => ({ id: `p-${user}-${created}`, user, email: `${user}@x.io`, name, editing, seen, created });

check("a row past the TTL is someone who left", livePeople([row("al", true, { seen: now - PRESENCE_TTL - 1 })], now), []);
check("one per person, their latest", livePeople([row("al", false, { seen: now - 5000, created: 1 }), row("al", true, { seen: now, created: 1 })], now).map((item) => item.editing), [true]);
check("oldest arrival first", livePeople([row("bo", false, { created: 5 }), row("al", false, { created: 2 })], now).map((item) => item.user), ["al", "bo"]);
check("the first editor holds the lock", lockHolder([row("bo", true, { created: 5 }), row("al", true, { created: 2 })], now)?.user, "al");
check("nobody edits: no lock", lockHolder([row("al", false)], now), null);
check("someone else holds it: I view", lockedBy([row("al", true, { created: 1 }), row("me", false, { created: 2 })], "me", now, false)?.user, "al");
check("I hold it", lockedBy([row("me", true, { created: 1 }), row("al", true, { created: 2 })], "me", now, false), null);
check("Edit anyway", lockedBy([row("al", true, { created: 1 })], "me", now, true), null);
check("the holder left: the lock lifts", lockedBy([row("al", true, { seen: now - PRESENCE_TTL - 1 })], "me", now, false), null);
check("a writer claims edit when free", claimsEdit(true, [row("al", false)], "me", now, false), true);
check("a writer views while locked", claimsEdit(true, [row("al", true)], "me", now, false), false);
check("a viewer never claims edit", claimsEdit(false, [], "me", now, false), false);
check("others leave me out", othersOn([row("me", true), row("al", false, { created: 3 })], "me", now).map((item) => item.user), ["al"]);
check("a name, else the email's first part", [personName({ name: " Bích ", email: "b@x.io" }), personName({ name: "", email: "bich@x.io" })], ["Bích", "bich"]);

if (failures.length) {
  console.error(`presenceModel selftest: ${failures.length} failed, ${passed} passed\n${failures.map((line) => `✗ ${line}`).join("\n")}`);
  process.exit(1);
}
console.log(`presenceModel selftest: ${passed} passed`);
