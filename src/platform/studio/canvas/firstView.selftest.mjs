#!/usr/bin/env node
// Zen Studio first-view selftest: firstViewOf / oneRow / readsFromTop from ./firstView.ts (imported directly: Node
// strips the types), without a browser. docs/research/studio-ux-review-2026-10-27.md §2.3, §7.3.
//   node src/platform/studio/canvas/firstView.selftest.mjs      summary; exit 1 on any failure
import { FIT_MIN_ZOOM, firstViewOf, fitZoomOf, oneRow, readsFromTop, unionOf } from "./firstView.ts";

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

/** The visible canvas between the panels on a 1512 × 982 window (272 + 320 of panels, as the gate's E2E viewport). */
const box = { width: 904, height: 982 };
const screen = (x, y, width = 1512, height = 982) => ({ kind: "screen", rect: { x, y, width, height } });
const overlay = (x, y) => ({ kind: "overlay", rect: { x, y, width: 820, height: 640 } });

// quan-ly-task: three Screens and fourteen Overlays on three rows → the first Screen.
const quanLyTask = [screen(0, 0, 1440, 960), screen(-1560, 0, 1440, 2094), screen(0, 1120, 1440, 1012), overlay(1540, 0), overlay(2360, 0), overlay(3180, 0), overlay(4000, 0), overlay(1540, 1120), overlay(2360, 1120), ...[0, 820, 1640, 2460, 3280, 4100, 4920, 5740].map((x) => overlay(x, 2240))];
check("three rows → the first Screen", firstViewOf(quanLyTask, box), { kind: "frame", rect: { x: 0, y: 0, width: 1440, height: 960 } });
check("three rows are not one row", oneRow(quanLyTask.map((frame) => frame.rect)), false);

// A new Empty page: one Screen → fit (the Screen whole).
check("one Screen → fit", firstViewOf([screen(0, 0)], box), { kind: "fit", rect: { x: 0, y: 0, width: 1512, height: 982 } });

// A Screen with an overlay beside it, tops a little apart → one row, fit (2428 px wide: 33% in the box).
const row = [screen(0, 0, 1512, 982), overlay(1608, 40)];
check("a Screen and an overlay are one row", oneRow(row.map((frame) => frame.rect)), true);
const rowView = firstViewOf(row, box);
check("one row → fit", rowView.kind, "fit");
check("the fit's zoom stays readable", fitZoomOf(rowView.rect, box) >= FIT_MIN_ZOOM, true);
// Two overlays beside it (3344 px: 24%) are still one row, but under the floor: the Screen instead; ⇧1 fits them all.
const wider = [screen(0, 0, 1512, 982), overlay(1608, 40), overlay(2524, 40)];
check("a Screen and two overlays are one row", oneRow(wider.map((frame) => frame.rect)), true);
check("one row under the floor → the first Screen", firstViewOf(wider, box), { kind: "frame", rect: { x: 0, y: 0, width: 1512, height: 982 } });

// hr-expense-overview-2: nine frames on one row, 9154 px wide → fitting them would be 9%: the first Screen instead.
const wideRow = [overlay(1864, 236), overlay(2680, 236), overlay(3496, 236), overlay(4312, 236), overlay(5128, 236), overlay(5944, 236), overlay(6760, 236), screen(7783, 130, 1440, 900), screen(69, 172, 1512, 1020)];
check("one wide row fits under the floor → the first Screen (board order)", firstViewOf(wideRow, box), { kind: "frame", rect: { x: 7783, y: 130, width: 1440, height: 900 } });
check("the wide row's fit zoom is under the floor", fitZoomOf(unionOf(wideRow.map((frame) => frame.rect)), box) < FIT_MIN_ZOOM, true);

// Two Screens one under the other → the first Screen.
check("two rows of Screens → the first", firstViewOf([screen(0, 0), screen(0, 1100)], box), { kind: "frame", rect: { x: 0, y: 0, width: 1512, height: 982 } });
// A page of Overlays only, on two rows → its first frame.
check("no Screen → the first frame", firstViewOf([overlay(0, 0), overlay(0, 800)], box), { kind: "frame", rect: { x: 0, y: 0, width: 820, height: 640 } });
// Frames not drawn yet are left out; none drawn → null.
check("undrawn frames are left out", firstViewOf([{ kind: "screen", rect: { x: 0, y: 0, width: 0, height: 0 } }, screen(100, 0)], box), { kind: "fit", rect: { x: 100, y: 0, width: 1512, height: 982 } });
check("nothing drawn → null", firstViewOf([{ kind: "screen", rect: { x: 0, y: 0, width: 0, height: 0 } }], box), null);
check("no frames → null", firstViewOf([], box), null);

// Reading from the top: a desktop Screen and a phone Screen show whole; a very tall page reads from its top.
check("a desktop Screen shows whole", readsFromTop({ x: 0, y: 0, width: 1512, height: 982 }, box), false);
check("a phone Screen shows whole", readsFromTop({ x: 0, y: 0, width: 390, height: 844 }, box), false);
check("a long page (1512 × 2094) still shows whole", readsFromTop({ x: 0, y: 0, width: 1512, height: 2094 }, box), false);
check("a very long page (1512 × 4000) reads from its top", readsFromTop({ x: 0, y: 0, width: 1512, height: 4000 }, box), true);
check("fit zoom of a 1512 Screen in the box", Math.round(fitZoomOf({ x: 0, y: 0, width: 1512, height: 982 }, box) * 1000) / 1000, Math.round(((904 - 96) / 1512) * 1000) / 1000);
check("fit zoom never above 1", fitZoomOf({ x: 0, y: 0, width: 100, height: 100 }, box), 1);

if (failures.length) {
  console.error(`firstView selftest: ${failures.length} failure(s), ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`firstView selftest: ${passed} checks passed`);
