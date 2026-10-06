#!/usr/bin/env node
// The Studio edit engine runs in the browser as well as in Node (Studio builder GĐ2, spec
// docs/research/studio-builder-pages-spec-2026-10-06.md §3 2a): no Node imports in its modules, and the shims give
// Node's answers. Run: node tools/studio/engine-iso.selftest.mjs
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { posix } from "./posix.mjs";
import { sha1 } from "./sha1.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

/** The engine's modules (what the browser bundle imports). */
export const ENGINE = ["jsx-source", "slots", "arrange", "items", "detach", "data-source", "shared-code", "posix", "sha1", "dialect"];
for (const name of ENGINE) {
  const text = fs.readFileSync(path.join(here, `${name}.mjs`), "utf8");
  const node = [...text.matchAll(/^\s*import\s[^;]*?from\s+["']((?:node:)?[a-z_]+)["']/gm)].map((match) => match[1]).filter((spec) => spec.startsWith("node:") || ["fs", "path", "crypto", "os", "url", "child_process"].includes(spec));
  check(`${name}.mjs imports no Node module`, node, []);
}

for (const text of ["", "abc", "a".repeat(55), "a".repeat(56), "a".repeat(64), "Tiếng Việt 🎉  ", fs.readFileSync(path.join(here, "jsx-source.mjs"), "utf8")]) {
  check(`sha1 of ${text.length} chars`, sha1(text), createHash("sha1").update(text, "utf8").digest("hex"));
}

const pairs = [["src/platform/examples/pages", "src/components/Button"], ["src/platform", "src/platform/examples/pages/card.tsx"], ["a/b/c", "a/b/c"], ["src/templates/hr", "src/index.ts"], ["", "src"]];
for (const [from, to] of pairs) check(`relative ${from} → ${to}`, posix.relative(from, to), path.posix.relative(from, to));
for (const value of ["src/platform/x.tsx", "x.tsx", "/", "src/", "a/b/", ""]) check(`dirname ${value}`, posix.dirname(value), path.posix.dirname(value));
for (const parts of [["src/platform", "../components/Button"], ["a", "./b", "c/../d"], ["a/", "/b"], ["..", "a"]]) check(`join ${parts.join(" + ")}`, posix.join(...parts), path.posix.join(...parts));
for (const value of ["a//b/./c/..", "../x/../../y", "/a/../..", "a/b/"]) check(`normalize ${value}`, posix.normalize(value), path.posix.normalize(value));

if (failures.length) {
  console.error(`engine-iso selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ engine-iso selftest: ${passed} checks pass.`);
