#!/usr/bin/env node
// Self-test of tools/studio/rebind.mjs (core rebuild Q5(2)): a saved token edit of a component stylesheet becomes the
// Figma re-binding of the layers bound to the old variable in the variants the rule covers; a code-only token is named,
// not carried. Run: node tools/studio/rebind.selftest.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { changedTokens, rebindChanges, repoRebind } from "./rebind.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let passed = 0;
const failures = [];
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

const file = "src/components/Button/button.css";
const before = fs.readFileSync(path.join(root, file), "utf8");
const after = before.replace("--zen-button-radius: var(--zen-corner-radius-action-medium);", "--zen-button-radius: var(--zen-corner-radius-action-large);");
check("changedTokens: the md rule's radius now reads the large token", changedTokens(before, after), [{ selector: '.zen-button[data-size="md"]', media: "", prop: "--zen-button-radius", from: "--zen-corner-radius-action-medium", to: "--zen-corner-radius-action-large" }]);
check("changedTokens: an unchanged stylesheet has none", changedTokens(before, before), []);

const { pkg, notes } = await repoRebind({ root, file, before, after });
const sets = new Set(pkg?.changes.map((change) => change.set.name));
check("repoRebind: Button's Medium variants re-bound on their Container's corners, Corner-Radius/Action/Medium → …/Large", {
  format: pkg?.format,
  every: pkg?.changes.every((change) => change.layer === "Container" && /Radius$/.test(change.field) && change.from === "Corner-Radius/Action/Medium" && change.to === "Corner-Radius/Action/Large" && /Size=Medium/.test(change.variant)),
  some: (pkg?.changes.length ?? 0) > 0,
  buttonMain: sets.has("Button/Main"),
}, { format: "zen-studio-rebind", every: true, some: true, buttonMain: true });
check("repoRebind: nothing left out", notes, []);

// A token the Figma file does not hold (code-only) is named, not re-bound.
const codeOnly = rebindChanges({ changes: [{ selector: ".x", media: "", prop: "gap", from: "--zen-a", to: "--zen-not-in-figma" }], sets: [], figmaNames: new Map() });
check("a code-only token: noted, nothing re-bound", [codeOnly.rebind.length, codeOnly.notes.length], [0, 1]);

if (failures.length) {
  console.error(`✗ rebind selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ rebind selftest: ${passed} checks pass (${pkg.changes.length} layer fields re-bound in ${[...sets].join(", ")}).`);
