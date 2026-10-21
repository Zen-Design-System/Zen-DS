#!/usr/bin/env node
// Self-test of ./spacingDrag.ts (imported directly: Node strips the types): dragging an auto layout frame's gap or padding
// on the canvas snaps to the token ladder (Figma's handles, plan decision 1). Run: node src/platform/studio/select/spacingDrag.selftest.mjs
import { DRAG_LAYOUTS, dragAxis, draggedPx, everySide, nearestStep, previewProperties } from "./spacingDrag.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

// Spacing/Gap at Default density (src/styles/tokens.css): none 0, 3xs 2, 2xs 4, xs 8, sm 12, md 16, lg 24, xl 32, 2xl 40.
const ladder = [["none", 0], ["3xs", 2], ["2xs", 4], ["xs", 8], ["sm", 12], ["md", 16], ["lg", 24], ["xl", 32], ["2xl", 40]].map(([key, px]) => ({ key, px }));

check("padding left grows rightwards", dragAxis("padding", "left"), { axis: "x", sign: 1 });
check("padding right grows leftwards", dragAxis("padding", "right"), { axis: "x", sign: -1 });
check("padding top grows downwards", dragAxis("padding", "top"), { axis: "y", sign: 1 });
check("padding bottom grows upwards", dragAxis("padding", "bottom"), { axis: "y", sign: -1 });
check("a gap between columns drags along x", dragAxis("gap", "column"), { axis: "x", sign: 1 });
check("a gap between rows drags along y", dragAxis("gap", "row"), { axis: "y", sign: 1 });

check("travel at zoom 2 counts half in CSS px", draggedPx(12, 20, 1, 2), 22);
check("a right padding dragged right shrinks", draggedPx(16, 10, -1, 1), 6);
check("never below 0", draggedPx(4, -30, 1, 1), 0);

check("12 + 9 → 21 snaps to lg (24)", nearestStep(ladder, 21), { key: "lg", px: 24 });
check("a tie (20: md 16, lg 24) takes the smaller", nearestStep(ladder, 20), { key: "md", px: 16 });
check("0 snaps to none", nearestStep(ladder, 0), { key: "none", px: 0 });
check("past the top of the ladder stays on it", nearestStep(ladder, 300), { key: "2xl", px: 40 });
check("unmeasured steps are skipped", nearestStep([{ key: "xs", px: null }, { key: "sm", px: 12 }], 8), { key: "sm", px: 12 });
check("no steps: null", nearestStep([], 8), null);

check("⇧ sets every side", everySide({ shift: true, alt: false }), true);
check("⇧⌥ sets every side", everySide({ shift: true, alt: true }), true);
check("⌥ alone keeps the side's prop (both opposite sides in Zen)", everySide({ shift: false, alt: true }), false);

check("gap previews both gaps", previewProperties("gap"), ["row-gap", "column-gap"]);
check("columnGap previews its own", previewProperties("columnGap"), ["column-gap"]);
check("paddingX previews the inline sides", previewProperties("paddingX"), ["padding-inline-start", "padding-inline-end"]);
check("padding previews every side", previewProperties("padding"), ["padding-block-start", "padding-block-end", "padding-inline-start", "padding-inline-end"]);
check("an unknown prop previews nothing", previewProperties("spacing"), []);

check("Stack and Grid drag; Box (a free frame) does not", ["Stack", "Grid", "Box", "Card"].map((name) => DRAG_LAYOUTS.has(name)), [true, true, false, false]);

if (failures.length) {
  console.error(`spacingDrag selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`spacingDrag selftest: ${passed} passed`);
