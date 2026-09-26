#!/usr/bin/env node
// Self-test for the usage harness: fixtures/bad.tsx must trigger every rule exactly where marked,
// fixtures/good.tsx must trigger nothing, and every registered rule must be covered by bad.tsx.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname);
const checker = path.join(here, "check-usage.mjs");
const run = (file) => { try { return execFileSync("node", [checker, file], { encoding: "utf8" }); } catch (error) { return error.stdout; } };
const rules = JSON.parse(execFileSync("node", [checker, "--list"], { encoding: "utf8" })).map((rule) => rule.id);

const badFile = path.join(here, "fixtures/bad.tsx");
const expected = [...fs.readFileSync(badFile, "utf8").matchAll(/expect: ([\w/-]+)/g)].map((m) => m[1]);
const reported = [...run(badFile).matchAll(/\[([\w/-]+)\]/g)].map((m) => m[1]);
const goodReport = run(path.join(here, "fixtures/good.tsx"));

const problems = [];
for (const id of expected) if (reported.filter((r) => r === id).length !== 1) problems.push(`bad.tsx: expected exactly one "${id}", got ${reported.filter((r) => r === id).length}`);
for (const id of reported) if (!expected.includes(id)) problems.push(`bad.tsx: unexpected "${id}"`);
for (const id of rules) if (!expected.includes(id)) problems.push(`rule "${id}" has no fixture in bad.tsx`);
if (!/Usage rules pass/.test(goodReport) || /\[/.test(goodReport)) problems.push(`good.tsx reported findings:\n${goodReport}`);

if (problems.length) { console.log(problems.map((p) => `✗ ${p}`).join("\n")); process.exit(1); }
console.log(`✓ Usage harness self-test: ${rules.length} rules, each caught in bad.tsx; good.tsx clean.`);
