// node src/platform/studio/inspector/controls/numberMath.selftest.mjs — Figma-style number input (numberMath.ts).
import assert from "node:assert/strict";
import { arrowStep, evaluateNumber, scrubValue } from "./numberMath.ts";

const cases = [
  ["12", 0, 12], ["12.5", 0, 12.5], ["100/3", 0, 100 / 3], ["(24+8)*2", 0, 64], ["+8", 10, 18], ["-4", 10, -4], ["*2", 10, 20],
  ["/2", 10, 5], ["24px", 0, 24], ["45°", 0, 45], ["50%", 0, 50], ["2x3", 0, 6], ["1,5", 0, 1.5], [" 7 ", 0, 7],
  ["abc", 0, null], ["", 0, null], ["1/0", 0, null], ["2+", 0, null], ["alert(1)", 0, null], ["(1+2", 0, null],
];
for (const [input, current, expected] of cases) {
  const value = evaluateNumber(input, current);
  if (expected === null) assert.equal(value, null, input);
  else assert.ok(Math.abs(value - expected) < 1e-9, `${input} → ${value}`);
}
assert.equal(arrowStep(false), 1);
assert.equal(arrowStep(true), 10);
assert.equal(scrubValue(10, 5.4, false), 15);
assert.equal(scrubValue(10, -3, true), -20);
console.log(`numberMath selftest: ${cases.length + 4} passed`);
