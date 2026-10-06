#!/usr/bin/env node
// Self-test of the ScaleField model (./scale.ts, imported directly: Node strips the types).
// Run: node src/platform/studio/inspector/controls/scale.selftest.mjs
import { scaleLabel, scaleOfType, stepKey } from "./scale.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

// The documented types (docs/api, api.generated.json) of the scale props.
check("gap", scaleOfType('"none" | ZenScaleInput | "giant" | "xgiant" | "2xgiant"'), "gap");
check("padding + insets", scaleOfType('"none" | ZenScaleInput | "4xl"'), "padding");
check("corner radius", scaleOfType('"none" | Exclude<ZenScaleInput, "3xs" | "3xsmall"> | "full"'), "radius");
check("not a scale", [scaleOfType('"md" | "sm" | "medium" | "small"'), scaleOfType("ZenScaleInput"), scaleOfType("boolean")], [null, null, null]);

check("labels", [scaleLabel("md", 16), scaleLabel("none", 0), scaleLabel("full", 999), scaleLabel("xs", 7.5), scaleLabel("lg", null)], ["md · 16", "none · 0", "full", "xs · 7.5", "lg"]);

const ladder = ["none", "xs", "sm", "md", "lg"];
check("step up / down", [stepKey(ladder, "md", 1), stepKey(ladder, "md", -2)], ["lg", "xs"]);
check("clamped at the ends", [stepKey(ladder, "lg", 3), stepKey(ladder, "none", -1)], ["lg", "none"]);
check("from nothing", [stepKey(ladder, undefined, 1), stepKey(ladder, "huge", -1), stepKey([], "md", 1)], ["none", "lg", undefined]);

if (failures.length) {
  console.error(`ScaleField selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ ScaleField model selftest: ${passed} checks pass.`);
