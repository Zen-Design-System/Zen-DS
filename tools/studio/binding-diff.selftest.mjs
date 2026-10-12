#!/usr/bin/env node
// Self-test of tools/studio/binding-diff.mjs (core rebuild Q5(1)): Figma re-binds a layer's variable → the component
// stylesheet declaration that reads the old one is proposed reading the new one, once for all the variants it serves;
// composite values are left to a person, a variable with no CSS token waits for the token sync, and the repo as
// committed has no change. Run: node tools/studio/binding-diff.selftest.mjs
import fs from "node:fs";
import { applyProposals, bindingChanges, bindingsOf, cssVar, proposals, repoBindingDiff, repoStyles } from "./binding-diff.mjs";

let passed = 0;
const failures = [];
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

const before = JSON.parse(fs.readFileSync(new URL("../../docs/figma-contracts/button.json", import.meta.url), "utf8"));
// Figma moves Button/Main's Medium corner from Corner-Radius/Action/Medium to …/Large on every variant.
const after = structuredClone(before);
let rebound = 0;
for (const variant of after[0].variants) {
  const container = variant.spec.c?.[0];
  if (container?.bv?.topLeftRadius === "Corner-Radius/Action/Medium") { container.bv.topLeftRadius = "Corner-Radius/Action/Large"; rebound += 1; }
}
check("cssVar: a Figma variable's CSS name", cssVar("Corner-Radius/Action/Medium"), "--zen-corner-radius-action-medium");
check("bindingsOf: a layer's bound field by set, variant and layer path", [...bindingsOf(before).values()].find((binding) => binding.field === "topLeftRadius")?.layer, "Container");
const changes = bindingChanges(before, after);
check("bindingChanges: one per variant that changed", { count: changes.length, every: changes.every((change) => change.from === "Corner-Radius/Action/Medium" && change.to === "Corner-Radius/Action/Large" && change.layer === "Container") }, { count: rebound, every: true });

const { cssFiles, tokens } = repoStyles();
const found = proposals(changes, { cssFiles, folderOf: () => "Button", tokens });
check("proposals: one declaration for every variant that changed, in the md rule, ticked", found.map((item) => [item.file, item.selector, item.prop, item.from, item.to, item.status, item.ticked, item.because.length]), [["src/components/Button/button.css", '.zen-button[data-size="md"]', "--zen-button-radius", "var(--zen-corner-radius-action-medium)", "var(--zen-corner-radius-action-large)", "ready", true, rebound]]);
const written = applyProposals(cssFiles, found, tokens);
check("applyProposals: the md rule reads the new token, nothing else changed", (() => {
  const css = written.get("src/components/Button/button.css");
  const was = cssFiles.get("src/components/Button/button.css");
  return { now: css.includes("--zen-button-radius: var(--zen-corner-radius-action-large);"), lines: css.split("\n").filter((line, index) => line !== was.split("\n")[index]).length };
})(), { now: true, lines: 1 });

// A composite value is a person's call; a variable with no CSS token waits for the token sync.
const composite = new Map([["src/components/Demo/demo.css", ".demo[data-size=\"md\"] { padding: 0 var(--zen-spacing-padding-medium); }"]]);
const paddingChange = [{ set: { id: "1", name: "Demo" }, variant: "Size=Medium", values: { Size: "Medium" }, layer: "", field: "paddingLeft", from: "Spacing/Padding/Medium", to: "Spacing/Padding/Large" }];
check("a composite value: manual, not ticked", proposals(paddingChange, { cssFiles: composite, tokens }).map((item) => [item.status, item.ticked]), [["manual", false]]);
const missing = [{ ...paddingChange[0], to: "Spacing/Padding/Not-A-Token" }];
check("a variable with no CSS token: token-missing", proposals(missing, { cssFiles: new Map([["src/components/Demo/demo.css", ".demo { padding: var(--zen-spacing-padding-medium); }"]]), tokens }).map((item) => item.status), ["token-missing"]);

// The repo as committed: no binding changed.
const repo = await repoBindingDiff({ base: "HEAD" });
check("the committed contracts: no change, no proposal", [repo.changes.length, repo.proposals.length], [0, 0]);

if (failures.length) {
  console.error(`✗ binding-diff selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ binding-diff selftest: ${passed} checks pass.`);
