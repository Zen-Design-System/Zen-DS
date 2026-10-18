#!/usr/bin/env node
// A typed hex matched to Zen's colour variables (./colorMatch.ts, imported directly: Node strips the types).
// Run: node src/platform/studio/inspector/controls/colorMatch.selftest.mjs
import { colorDistance, hexOf, nearestColors, parseHex } from "./colorMatch.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

check("hex: six digits", parseHex("#F2F2F2"), { r: 242, g: 242, b: 242 });
check("hex: three digits, no #", parseHex("fff"), { r: 255, g: 255, b: 255 });
check("hex: not a colour", [parseHex("surface"), parseHex("#12345"), parseHex("")], [null, null, null]);
check("hex out", hexOf({ r: 242, g: 242, b: 242 }), "#F2F2F2");
check("distance: same is 0", colorDistance({ r: 1, g: 2, b: 3 }, { r: 1, g: 2, b: 3 }), 0);
const options = [
  { name: "white", color: { r: 255, g: 255, b: 255 } },
  { name: "pale", color: { r: 243, g: 243, b: 243 } },
  { name: "subtle", color: { r: 230, g: 230, b: 230 } },
  { name: "accent", color: { r: 247, g: 85, b: 201 } },
  { name: "none", color: null },
];
check("nearest to #F2F2F2: 243 then 230 (12 away) before 255 (13)", nearestColors(options, parseHex("#F2F2F2"), 2).map((option) => option.name), ["pale", "subtle"]);
check("nearest to a pink", nearestColors(options, parseHex("#F060C0"), 1).map((option) => option.name), ["accent"]);
check("no colour, no match", nearestColors([{ name: "none", color: null }], parseHex("#000")), []);

if (failures.length) {
  console.error(`✗ colorMatch selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ colorMatch selftest: ${passed} checks pass.`);
