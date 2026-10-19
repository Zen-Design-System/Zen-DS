#!/usr/bin/env node
// Crop on the canvas selftest (F8b, cropModel.ts): moving the picture behind the layer, scaling it by a corner.
//   node src/platform/studio/draw/cropModel.selftest.mjs   summary; exit 1 on any failure
import assert from "node:assert/strict";
import { moved, scaled } from "./cropModel.ts";

let count = 0;
const test = (name, run) => { run(); count += 1; };
const box = { left: 100, top: 100, w: 200, h: 100 };
const half = { x: 25, y: 25, width: 50, height: 50 };

test("moving the picture right shows more of its left", () => assert.deepEqual(moved(half, 40, 0, box), { x: 15, y: 25, width: 50, height: 50 }));
test("the picture never leaves the window uncovered", () => assert.deepEqual(moved(half, -1000, 1000, box), { x: 50, y: 0, width: 50, height: 50 }));
test("a whole picture does not move", () => assert.deepEqual(moved({ x: 0, y: 0, width: 100, height: 100 }, 30, 30, box), { x: 0, y: 0, width: 100, height: 100 }));
test("scaling by the bottom-right corner keeps the top-left still", () => {
  // The picture is 400 × 200 at (0, 50); its se corner dragged by +100 → 500 × 250 from the same top-left.
  assert.deepEqual(scaled(half, "se", 100, 0, box), { x: 20, y: 20, width: 40, height: 40 });
});
test("scaling by the top-left corner keeps the bottom-right still", () => {
  const next = scaled(half, "nw", -100, 0, box);
  assert.deepEqual(next, { x: 40, y: 40, width: 40, height: 40 });
});
test("a picture is never scaled smaller than the window", () => assert.deepEqual(scaled(half, "se", -1000, -1000, box), { x: 0, y: 0, width: 100, height: 100 }));

console.log(`cropModel selftest: ${count} passed`);
