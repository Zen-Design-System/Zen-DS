#!/usr/bin/env node
// Self-test of ./resizeSnap.ts (imported directly: Node strips the types): Figma's smart guides while resizing a layer in
// a free frame (plan F2). Run: node src/platform/studio/select/resizeSnap.selftest.mjs
import { resizeGuides, snapResize } from "./resizeSnap.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

// The E2E walk's free frame (tools/studio/e2e/scenarios/figma.mjs shapesText): a 358 × 200 Box, three shapes.
const frame = { x: 0, y: 0, width: 358, height: 200 };
const rect = { x: 20, y: 20, width: 80, height: 60 };
const ellipse = { x: 140, y: 40, width: 60, height: 60 };
const star = { x: 260, y: 10, width: 40, height: 40 };
const others = [frame, ellipse, star];
const free = { side: 0, centred: false, min: 8 };
const axes = (x, y = {}) => ({ x: { ...free, ...x }, y: { ...free, ...y } });
const resize = (axesOf, delta, extra = {}) => snapResize({ box: rect, axes: axesOf, delta, others, threshold: 6, ...extra });
const round = (box) => Object.fromEntries(Object.entries(box).map(([key, value]) => [key, Math.round(value * 100) / 100]));

// The right edge (handle e) at 137: the Ellipse's left edge is 3 px away.
const east = resize(axes({ side: 1 }), { x: 37, y: 0 });
check("e: the right edge snaps to the Ellipse's left edge (137 → 140)", [east.delta, east.box], [{ x: 40, y: 0 }, { x: 20, y: 20, width: 120, height: 60 }]);
check("e: one red guide at x 140, from the layer's top to the Ellipse's bottom", east.guides, [{ axis: "x", at: 140, from: 20, to: 100 }]);
check("e: 7 px away is too far (no snap, no guide)", resize(axes({ side: 1 }), { x: 33, y: 0 }), { delta: { x: 33, y: 0 }, box: { x: 20, y: 20, width: 113, height: 60 }, guides: [] });
check("e: a centre is a line too (168 → the Ellipse's centre 170)", resize(axes({ side: 1 }), { x: 68, y: 0 }).delta.x, 70);
check("threshold 0 (⌘ held): the exact delta", resize(axes({ side: 1 }), { x: 37, y: 0 }, { threshold: 0 }).delta.x, 37);

// The bottom edge (handle s) at 97: the frame's centre and the Ellipse's bottom are both at 100.
const south = resize(axes({}, { side: 1 }), { x: 0, y: 17 });
check("s: the bottom edge snaps to 100 (frame centre, Ellipse bottom)", [south.delta.y, south.box.height], [20, 80]);
check("s: the guide runs across every box on that line (the frame: 0 to 358)", south.guides, [{ axis: "y", at: 100, from: 0, to: 358 }]);

// The left edge (handle w) at 2: the frame's left edge.
const west = resize(axes({ side: -1 }), { x: -18, y: 0 });
check("w: the left edge snaps to the frame's left edge, the right edge stays", west.box, { x: 0, y: 20, width: 100, height: 60 });
check("w: the guide is the frame's edge", west.guides, [{ axis: "x", at: 0, from: 0, to: 200 }]);

// ⌥ from the centre: both edges move; the closer one snaps, the other mirrors it.
const centred = resize(axes({ side: 1, centred: true }), { x: 18, y: 0 });
check("⌥ e: the left edge (2) snaps to 0, the right edge mirrors it (120): the centre stays at 60", [centred.delta.x, centred.box], [20, { x: 0, y: 20, width: 120, height: 60 }]);
check("⌥ e: the guide is on the edge that snapped", centred.guides.map((guide) => [guide.axis, guide.at]), [["x", 0]]);
const centredRight = resize(axes({ side: 1, centred: true }), { x: 38, y: 0 });
check("⌥ e: the dragged edge snaps when it is the closer one (138 → 140; the left edge mirrors it to -20)", [centredRight.delta.x, centredRight.box.x, centredRight.box.width], [40, -20, 160]);

// ⇧ on a corner keeps the ratio: the closest snap on either axis drives both.
const ratioX = resize(axes({ side: 1 }, { side: 1 }), { x: 37, y: 27.75 }, { ratio: true });
check("⇧ se: the right edge snaps (137 → 140), the height follows the ratio", [ratioX.delta, round(ratioX.box)], [{ x: 40, y: 30 }, { x: 20, y: 20, width: 120, height: 90 }]);
const ratioY = resize(axes({ side: 1 }, { side: 1 }), { x: 31, y: 23.25 }, { ratio: true });
check("⇧ se: the bottom edge is the closer (103.25 → 100), the width follows", round(ratioY.box), { x: 20, y: 20, width: 106.67, height: 80 });
check("⇧ se: the ratio holds after the snap", Math.round((ratioY.box.width / ratioY.box.height) * 1000) / 1000, Math.round((80 / 60) * 1000) / 1000);
check("⇧ se: the guide is the bottom edge's", ratioY.guides.map((guide) => [guide.axis, guide.at]), [["y", 100]]);
check("⇧ on an edge (no corner): only the dragged axis snaps", resize(axes({ side: 1 }), { x: 37, y: 0 }, { ratio: true }).delta, { x: 40, y: 0 });

// The least size: a snap that would go below it is skipped for the next one.
const small = { x: 100, y: 0, width: 20, height: 20 };
const near = { x: 104, y: 50, width: 10, height: 10 };
const floor = snapResize({ box: small, axes: axes({ side: 1, min: 8 }), delta: { x: -14, y: 0 }, others: [near], threshold: 6 });
check("a snap below the least size (104: 4 px wide) gives way to the next line (109)", [floor.delta.x, floor.box.width], [-11, 9]);
const crushed = snapResize({ box: rect, axes: axes({ side: -1, min: 8 }), delta: { x: 90, y: 0 }, others, threshold: 6 });
check("w past the right edge: stops at the least size (8), its left edge at 92", [crushed.delta.x, crushed.box.x, crushed.box.width], [72, 92, 8]);
check("an axis the drag does not move keeps its delta, draws no guide", resize(axes({ side: 1 }), { x: 37, y: 5 }).delta.y, 5);

// Guides read on the box as it ends (also a line met without snapping, as Figma shows them).
check("resizeGuides: no line met, no guide", resizeGuides({ x: 20, y: 20, width: 113, height: 60 }, axes({ side: 1 }), others), []);
check("resizeGuides: both ⌥ edges on lines, a guide each", resizeGuides({ x: 0, y: 20, width: 140, height: 60 }, axes({ side: 1, centred: true }), others).map((guide) => guide.at), [0, 140]);

if (failures.length) {
  console.error(`✗ resizeSnap: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ resizeSnap: ${passed} checks passed`);
