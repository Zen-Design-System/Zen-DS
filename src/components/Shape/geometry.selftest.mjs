#!/usr/bin/env node
// Self-test of the vector part of ./geometry.ts (imported directly: Node strips the types): a vector's `d` read and
// written back, its viewBox, its bounds (curves by their extremes) and its fit to the shape's size (plan
// docs/research/studio-f9-vectors-spec-2026-10-19.md). Run: node src/components/Shape/geometry.selftest.mjs
import { fitVectorPath, parseVectorPath, parseViewBox, vectorBounds, vectorPathData } from "./geometry.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

const square = parseVectorPath("M 0 0 L 10 0 L 10 10 L 0 10 Z");
check("absolute M L Z", square?.map((entry) => entry.command), ["M", "L", "L", "L", "Z"]);
check("written back", vectorPathData(square), "M 0 0 L 10 0 L 10 10 L 0 10 Z");
check("numbers after M are lines, commas and no spaces", parseVectorPath("M0,0 10,0 10-5")?.map((entry) => `${entry.command}${entry.points.map((p) => `${p.x},${p.y}`).join(" ")}`), ["M0,0", "L10,0", "L10,-5"]);
check("C and Q take their points", parseVectorPath("M 0 0 C 0 10 10 10 10 0 Q 15 -5 20 0")?.map((entry) => entry.points.length), [1, 3, 2]);
check("refused: relative, arcs, H / V, text, a missing number", ["m 0 0 l 1 1", "M 0 0 A 5 5 0 0 1 10 0", "M 0 0 H 10", "M 0 0 L x 1", "M 0 0 L 1", "L 1 1", ""].map(parseVectorPath), [null, null, null, null, null, null, null]);

check("viewBox", parseViewBox("0 -2 24 12.5"), { x: 0, y: -2, width: 24, height: 12.5 });
check("viewBox refused", ["0 0 10", "0 0 -1 4", "a b c d", undefined].map(parseViewBox), [null, null, null, null]);

check("bounds of lines", vectorBounds(parseVectorPath("M 5 5 L 15 2 L 9 20")), { x: 5, y: 2, width: 10, height: 18 });
// A cubic bulging past its ends: y reaches 7.5 (3/4 of the control points' 10), not 10.
check("bounds of a cubic: its extremes, not its control points", vectorBounds(parseVectorPath("M 0 0 C 0 10 10 10 10 0")), { x: 0, y: 0, width: 10, height: 7.5 });
check("bounds of a quadratic", vectorBounds(parseVectorPath("M 0 0 Q 5 10 10 0")), { x: 0, y: 0, width: 10, height: 5 });

check("fit: the viewBox stretched to the size", fitVectorPath(parseVectorPath("M 10 10 L 20 10 L 20 30 Z"), { x: 10, y: 10, width: 10, height: 20 }, 100, 40), "M 0 0 L 100 0 L 100 40 Z");
check("fit: a box with no height keeps that axis", fitVectorPath(parseVectorPath("M 0 5 L 10 5"), { x: 0, y: 5, width: 10, height: 0 }, 50, 0), "M 0 0 L 50 0");

if (failures.length) {
  console.error(`✗ Shape geometry selftest: ${failures.length} failed, ${passed} passed\n${failures.map((failure) => `  ${failure}`).join("\n")}`);
  process.exit(1);
}
console.log(`✓ Shape geometry selftest: ${passed} checks pass.`);
