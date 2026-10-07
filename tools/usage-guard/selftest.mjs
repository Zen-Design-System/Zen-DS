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

const fixtures = fs.readdirSync(path.join(here, "fixtures")).map((f) => path.join(here, "fixtures", f));
const problems = [];
const allExpected = [];
for (const badFile of fixtures.filter((f) => /\/bad\.\w+$/.test(f))) {
  const name = path.basename(badFile);
  const expected = [...fs.readFileSync(badFile, "utf8").matchAll(/expect: ([\w/-]+)/g)].map((m) => m[1]);
  const reported = [...run(badFile).matchAll(/\[([\w/-]+)\]/g)].map((m) => m[1]);
  allExpected.push(...expected);
  const count = (list, id) => list.filter((r) => r === id).length;
  for (const id of new Set(expected)) if (count(reported, id) !== count(expected, id)) problems.push(`${name}: expected ${count(expected, id)} × "${id}", got ${count(reported, id)}`);
  for (const id of reported) if (!expected.includes(id)) problems.push(`${name}: unexpected "${id}"`);
}
for (const goodFile of fixtures.filter((f) => /\/good\.\w+$/.test(f))) {
  const report = run(goodFile);
  if (!/Usage rules pass/.test(report) || /\[/.test(report)) problems.push(`${path.basename(goodFile)} reported findings:\n${report}`);
}
// App-only rules (consumerOnly) are covered by the app fixture below instead of bad.*.
const appOnly = JSON.parse(execFileSync("node", [checker, "--list"], { encoding: "utf8" })).filter((rule) => rule.consumerOnly).map((rule) => rule.id);
const appFixtureIds = [...fs.readFileSync(path.join(here, "fixtures/consumer/App.tsx"), "utf8").matchAll(/expect: ([\w/-]+)/g)].map((m) => m[1]);
for (const id of rules) if (!allExpected.includes(id) && !(appOnly.includes(id) && appFixtureIds.includes(id))) problems.push(`rule "${id}" has no fixture in fixtures/bad.*${appOnly.includes(id) ? " or fixtures/consumer/App.tsx" : ""}`);

// App mode (zen-usage in an app, the ESLint plugin): only Zen imports are checked, aliases and namespaces included.
const appFixture = path.join(here, "fixtures/consumer/App.tsx");
const appExpected = [...fs.readFileSync(appFixture, "utf8").matchAll(/expect: ([\w/-]+)/g)].map((m) => m[1]).sort();
const cli = path.join(here, "cli.mjs");
let appJson;
try { appJson = execFileSync("node", [cli, "--consumer", "--json", appFixture], { encoding: "utf8" }); } catch (error) { appJson = error.stdout; }
const appReported = JSON.parse(appJson).map((f) => f.rule).sort();
if (appReported.join() !== appExpected.join()) problems.push(`consumer/App.tsx (zen-usage --consumer): expected ${appExpected.join(", ")}; got ${appReported.join(", ") || "nothing"}`);
try {
  const { Linter } = await import("eslint");
  const { default: zen } = await import("./eslint.mjs");
  const messages = new Linter({ configType: "flat" }).verify(fs.readFileSync(appFixture, "utf8"), [zen.configs.standalone], { filename: "App.tsx" });
  const eslintReported = messages.map((m) => m.message.match(/^\[([\w/-]+)\]/)?.[1] ?? `fatal: ${m.message}`).sort();
  if (eslintReported.join() !== appExpected.join()) problems.push(`consumer/App.tsx (ESLint zen/usage): expected ${appExpected.join(", ")}; got ${eslintReported.join(", ") || "nothing"}`);
} catch (error) {
  if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; // ESLint is a devDependency; skip where it isn't installed.
}

if (problems.length) { console.log(problems.map((p) => `✗ ${p}`).join("\n")); process.exit(1); }
console.log(`✓ Usage harness self-test: ${rules.length} rules, each caught in fixtures/bad.*; good.* clean; app mode and ESLint plugin agree on fixtures/consumer.`);
