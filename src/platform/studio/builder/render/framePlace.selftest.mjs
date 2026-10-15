#!/usr/bin/env node
// Zen Studio free-frame selftest: placeFrames / snapBox from ./framePlace.ts (imported directly: Node strips the types).
//   node src/platform/studio/builder/render/framePlace.selftest.mjs   summary; exit 1 on any failure
import { FRAME_GAP, placeFrames, snapBox } from "./framePlace.ts";

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n      got      ${a}\n      expected ${e}`);
}

// A page written before free frames: the old row, 96 apart, from the origin.
check("unplaced frames keep the row", placeFrames([{ width: 1440, place: null }, { width: 390, place: null }, { width: 720, place: null }]), [{ x: 0, y: 0 }, { x: 1440 + FRAME_GAP, y: 0 }, { x: 1440 + 390 + 2 * FRAME_GAP, y: 0 }]);
check("placed frames sit where they are", placeFrames([{ width: 390, place: { x: -200, y: 300 } }, { width: 390, place: { x: 600, y: -40 } }]), [{ x: -200, y: 300 }, { x: 600, y: -40 }]);
// A frame added without a place (Prototype › Add screen) joins the row right of the placed ones, at their top.
check("unplaced after placed", placeFrames([{ width: 390, place: { x: 100, y: 50 } }, { width: 1440, place: { x: 1000, y: 200 } }, { width: 390, place: null }]), [{ x: 100, y: 50 }, { x: 1000, y: 200 }, { x: 1000 + 1440 + FRAME_GAP, y: 50 }]);
check("no frames", placeFrames([]), []);

// Snapping: the nearest edge or centre within the threshold, per axis, with its guide.
const others = [{ x: 0, y: 0, width: 400, height: 800 }];
const near = snapBox({ x: 503, y: 4, width: 390, height: 844 }, others, 6);
check("no x line within 6", near.dx, 0);
check("top snaps to top", near.dy, -4);
check("one horizontal guide across both", near.guides, [{ axis: "y", at: 0, from: 0, to: 893 }]);
const left = snapBox({ x: 402, y: 320, width: 390, height: 100 }, others, 6);
check("left edge snaps to the right edge", left.dx, -2);
check("vertical guide at 400", left.guides, [{ axis: "x", at: 400, from: 0, to: 800 }]);
const centre = snapBox({ x: 5, y: 1000, width: 390, height: 100 }, [{ x: 0, y: 0, width: 400, height: 800 }], 6);
check("centre snaps to centre (nearest wins)", centre.dx, 0);
check("far apart: nothing", snapBox({ x: 1000, y: 1000, width: 10, height: 10 }, others, 6), { dx: 0, dy: 0, guides: [] });
check("only the allowed edges snap", snapBox({ x: 397, y: 2000, width: 100, height: 10 }, others, 6, { x: [2], y: [2] }).dx, 0);

if (failures.length) {
  console.error(`framePlace selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ framePlace selftest: ${passed} checks pass.`);
