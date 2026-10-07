#!/usr/bin/env node
// Self-test for the style guard: fixtures/bad.* must trigger every marked rule exactly as often as marked,
// fixtures/good.* must trigger nothing, and every registered rule must be covered by a bad.* fixture.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkFile, rules } from "./check-styles.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = fs.readdirSync(path.join(here, "fixtures")).map((f) => path.join(here, "fixtures", f));
const problems = [];
const allExpected = [];
const count = (list, id) => list.filter((r) => r === id).length;
for (const bad of fixtures.filter((f) => /\/bad\.\w+$/.test(f))) {
  const name = path.basename(bad);
  const expected = [...fs.readFileSync(bad, "utf8").matchAll(/expect: ([\w/-]+)/g)].map((m) => m[1]);
  const reported = checkFile(bad).map((f) => f.rule);
  allExpected.push(...expected);
  for (const id of new Set([...expected, ...reported])) if (count(reported, id) !== count(expected, id)) problems.push(`${name}: expected ${count(expected, id)} × "${id}", got ${count(reported, id)}`);
}
for (const good of fixtures.filter((f) => /\/good\.\w+$/.test(f))) {
  const found = checkFile(good);
  if (found.length) problems.push(`${path.basename(good)} reported:\n${found.map((f) => `    ${f.line}: ${f.rule} ${f.message}`).join("\n")}`);
}
for (const { id } of rules) if (!allExpected.includes(id)) problems.push(`rule "${id}" has no fixture in fixtures/bad.*`);

if (problems.length) { console.log(problems.map((p) => `✗ ${p}`).join("\n")); process.exit(1); }
console.log(`✓ Style guard self-test: ${rules.length} rules, each caught in fixtures/bad.*; good.* clean.`);
