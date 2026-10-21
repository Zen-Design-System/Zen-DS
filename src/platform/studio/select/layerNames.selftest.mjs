#!/usr/bin/env node
// Zen Studio layer names selftest: ./layerNames.ts (imported directly: Node strips the types). The Design panel's heading
// reads Frame / Group as Figma UI3's does (panelTitle), while Layers and exports keep the code name (layerName); and the
// instance look's helpers (tools/studio/instance-look.mjs: Figma's Appearance on a Zen instance).
//   node src/platform/studio/select/layerNames.selftest.mjs     summary; exit 1 on any failure
import { layerName, panelTitle } from "./layerNames.ts";
import { instanceLookCode, instanceLookStyle, takesInstanceLook } from "../../../../tools/studio/instance-look.mjs";

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

check("heading: a frame is Frame, a group Group (Figma UI3)", [panelTitle("Box", {}), panelTitle("Stack", { direction: "row" }), panelTitle("Grid", {}), panelTitle("Box", { group: true })], ["Frame", "Frame", "Frame", "Group"]);
check("heading: a shape as drawn, a component by its name", [panelTitle("Shape", { type: "ellipse" }), panelTitle("Button", {}), panelTitle("Box", { "data-zen-main-name": "Card A" })], ["Ellipse", "Button", "Card A"]);
check("Layers keep the code name", [layerName("Box", {}), layerName("Stack", {}), layerName("Box", { group: true })], ["Box", "Stack", "Box"]);

check("instance look: Zen components that forward style; not frames or Shape", [takesInstanceLook("Button"), takesInstanceLook("Card"), takesInstanceLook("Stack"), takesInstanceLook("Shape"), takesInstanceLook("Avatar")], [true, true, false, false, false]);
check("instance look: percent → CSS opacity, blend → mix-blend-mode", instanceLookStyle({ opacity: 40, blendMode: "multiply" }), { opacity: 0.4, mixBlendMode: "multiply" });
check("instance look: Figma's defaults write nothing", [instanceLookStyle({ opacity: 100, blendMode: "pass-through" }), instanceLookStyle({})], [null, null]);
check("instance look: its style as code", instanceLookCode({ opacity: 0.4, mixBlendMode: "multiply" }), '{ opacity: 0.4, mixBlendMode: "multiply" }');

console.log(`layerNames selftest: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exit(1);
}
