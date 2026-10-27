#!/usr/bin/env node
// Zen Studio insert placement selftest: freeInsertAt / widgetWidthIn from ./insertPlace.ts (imported directly: Node
// strips the types), without a browser. docs/research/studio-ux-review-2026-10-27.md §2.4, decision A.
//   node src/platform/studio/edit/insertPlace.selftest.mjs      summary; exit 1 on any failure
import { freeInsertAt, PAGE_GAP, PAGE_MARGIN_DESKTOP, PAGE_MARGIN_PHONE, pageMarginFor, WIDGET_MIN_WIDTH, widgetWidthIn } from "./insertPlace.ts";

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const desktop = { width: 1512 };
const card = (x, y, width = 240, height = 156) => ({ x, y, width, height });

// An empty frame: the margin corner.
check("empty frame → the margin corner", freeInsertAt(desktop, [], null, null), { x: 24, y: 24 });
check("empty phone frame → its margin", freeInsertAt({ width: 390 }, [], null, null, { margin: PAGE_MARGIN_PHONE }), { x: 20, y: 20 });

// Beside the selection: to its right, the gap apart, tops aligned.
const first = card(24, 24);
check("beside the selection", freeInsertAt(desktop, [first], first, null), { x: 24 + 240 + 16, y: 24 });
check("the gap is the page gap", freeInsertAt(desktop, [first], first, null).x - (first.x + first.width), PAGE_GAP);

// Nothing selected: beside the last layer.
const second = card(280, 24);
check("nothing selected → beside the last layer", freeInsertAt(desktop, [first, second], null, null), { x: 280 + 240 + 16, y: 24 });

// A new row when the spot would pass the right margin (judged with the new layer's width when known).
const third = card(536, 24);
check("a wide layer that does not fit → a new row under the lowest layer", freeInsertAt(desktop, [first, second, third], third, 800), { x: 24, y: 24 + 156 + 16 });
check("a layer that fits exactly stays in the row", freeInsertAt({ width: 24 + 240 + 16 + 240 + 24 }, [first], first, 240), { x: 280, y: 24 });
check("one px too wide → a new row", freeInsertAt({ width: 24 + 240 + 16 + 240 + 24 - 1 }, [first], first, 240), { x: 24, y: 196 });
// Unknown width: the reference's width stands in.
check("unknown width → judged with the reference's", freeInsertAt({ width: 24 + 240 + 16 + 239 + 24 }, [first], first, null), { x: 24, y: 196 });
// The new row goes under the lowest layer of the whole frame, not only under the reference.
const tall = card(24, 196, 400, 300);
check("the new row clears the lowest layer", freeInsertAt(desktop, [first, tall], first, 1400), { x: 24, y: 196 + 300 + 16 });
// Rounding: fractional boxes round to whole px.
check("rounds to px", freeInsertAt(desktop, [card(24.4, 24.6, 240.2, 156)], card(24.4, 24.6, 240.2, 156), null), { x: 281, y: 25 });

// The widget width: a third of the content row between the margins, at least WIDGET_MIN_WIDTH; a phone the whole row.
check("widget width on a 1512 Screen", widgetWidthIn(1512, "desktop"), Math.floor((1512 - 48 - 32) / 3));
check("widget width is 477 on 1512", widgetWidthIn(1512, "desktop"), 477);
check("widget width never under the minimum", widgetWidthIn(600, "desktop"), WIDGET_MIN_WIDTH);
check("widget width on a phone: the row", widgetWidthIn(390, "phone"), 390 - 2 * PAGE_MARGIN_PHONE);
check("tablet margin is the desktop's", pageMarginFor("tablet"), PAGE_MARGIN_DESKTOP);
check("unknown device margin is the desktop's", pageMarginFor(null), PAGE_MARGIN_DESKTOP);

if (failures.length) {
  console.error(`insertPlace selftest: ${failures.length} failure(s), ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`insertPlace selftest: ${passed} checks passed`);
