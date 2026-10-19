#!/usr/bin/env node
// Self-test of ./spacingModel.ts (imported directly: Node strips the types): Figma's equal spacing while moving a layer in
// a free frame (plan F2). Run: node src/platform/studio/edit/spacingModel.selftest.mjs
import { equalSpacing } from "./spacingModel.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

const frame = { x: 0, y: 0, width: 400, height: 200 };
const a = { x: 20, y: 50, width: 40, height: 40 };
const b = { x: 80, y: 50, width: 40, height: 40 };
// A third box moved near "the same gap again" after b (gap 20 → x 140).
const moved = { x: 143, y: 52, width: 40, height: 40 };
const snap = equalSpacing(moved, [frame, a, b], 6);
check("snaps to the gap its neighbours have (20 → x 140)", [snap.dx, snap.dy], [-3, 0]);
check("marks the two equal gaps, with their px", snap.marks.map((mark) => [mark.axis, mark.from, mark.to, mark.gap]).sort(), [["x", 120, 140, 20], ["x", 60, 80, 20]].sort());
check("too far: no snap", equalSpacing({ ...moved, x: 160 }, [frame, a, b], 6), { dx: 0, dy: 0, marks: [] });
// Centred between two neighbours.
const left = { x: 0, y: 0, width: 20, height: 20 };
const right = { x: 100, y: 0, width: 20, height: 20 };
const middle = equalSpacing({ x: 48, y: 0, width: 20, height: 20 }, [left, right], 6);
check("centred between two neighbours: equal gaps on both sides", [middle.dx, middle.marks.map((mark) => mark.gap)], [2, [30, 30]]);
check("an axis already snapped to an edge is skipped", equalSpacing(moved, [frame, a, b], 6, { x: true }).dx, 0);
// Vertical: a column.
const top = { x: 10, y: 0, width: 30, height: 10 };
const mid = { x: 10, y: 20, width: 30, height: 10 };
check("works down a column too", equalSpacing({ x: 10, y: 42, width: 30, height: 10 }, [top, mid], 6).dy, -2);

if (failures.length) {
  console.error(`✗ spacingModel selftest: ${failures.length} failed, ${passed} passed\n${failures.map((failure) => `  ${failure}`).join("\n")}`);
  process.exit(1);
}
console.log(`✓ spacingModel selftest: ${passed} checks pass.`);
