#!/usr/bin/env node
// Self-test of the ScaleField model (./scale.ts, imported directly: Node strips the types).
// Run: node src/platform/studio/inspector/controls/scale.selftest.mjs
import { isMarginKey, scaleOfType, scaleStep, stepKey } from "./scale.ts";

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

// Steps read under their Figma variable's name (user 2026-10-17: Figma's words, not the code's), then the value.
check("steps read as token + value", [scaleStep("md", 16), scaleStep("none", 0), scaleStep("full", 999, "radius"), scaleStep("xs", 7.5), scaleStep("lg", null)], [{ label: "Medium", meta: "16px" }, { label: "None", meta: "0px" }, { label: "Rounded" }, { label: "XSmall", meta: "7.5px" }, { label: "Large" }]);
check("radius names", [scaleStep("md", 12, "radius"), scaleStep("margin-comfortable", 24, "padding")], [{ label: "Base", meta: "12px" }, { label: "Margin-Comfortable", meta: "24px" }]);

const ladder = ["none", "xs", "sm", "md", "lg"];
check("step up / down", [stepKey(ladder, "md", 1), stepKey(ladder, "md", -2)], ["lg", "xs"]);
check("clamped at the ends", [stepKey(ladder, "lg", 3), stepKey(ladder, "none", -1)], ["lg", "none"]);
check("from nothing", [stepKey(ladder, undefined, 1), stepKey(ladder, "huge", -1), stepKey([], "md", 1)], ["none", "lg", undefined]);

// The page margins a padding takes (ZenMargin, user 2026-10-17): still the padding scale, named as Figma names them.
check("padding with the page margins", scaleOfType('"none" | ZenScaleInput | "4xl" | ZenMargin'), "padding");
check("a margin reads by its Figma name, with its px", scaleStep("margin-comfortable", 24), { label: "Margin-Comfortable", meta: "24px" });
check("margins are not steps", [isMarginKey("margin-compact"), isMarginKey("xl"), isMarginKey("none")], [true, false, false]);

if (failures.length) {
  console.error(`ScaleField selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ ScaleField model selftest: ${passed} checks pass.`);
