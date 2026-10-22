#!/usr/bin/env node
// Zen Studio sections selftest (F4): which frames a Section holds, its contents, the box around frames, reading order
// for N / ⇧N, from ./sections.ts (imported directly: Node strips the types).
//   node src/platform/studio/board/sections.selftest.mjs   summary; exit 1 on any failure
import { boxAround, readingOrder, sectionAround, sectionContents, sectionMembers } from "./sections.ts";

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n      got      ${a}\n      expected ${e}`);
}

const box = (id, x, y, width, height) => ({ id, x, y, width, height });
const outer = box("section:outer", 0, 0, 2000, 1200);
const inner = box("section:inner", 100, 100, 900, 1000);
const home = box("screen:home", 200, 200, 390, 844);
const settings = box("screen:settings", 1200, 200, 390, 844);
const away = box("screen:away", 3000, 0, 390, 844);
const edge = box("overlay:sheet", 1900, 1100, 400, 300); // its middle (2100, 1250) is outside the outer section
const boxes = [outer, inner, home, settings, away, edge];

check("a frame belongs to the smallest section its middle lies in", sectionAround(home, boxes), "section:inner");
check("a frame only in the outer section", sectionAround(settings, boxes), "section:outer");
check("a frame outside every section", sectionAround(away, boxes), null);
check("a frame whose middle is outside", sectionAround(edge, boxes), null);
check("a section inside a section", sectionAround(inner, boxes), "section:outer");
check("a section never holds a larger one", sectionAround(outer, boxes), null);
check("members are one level", Object.fromEntries(sectionMembers(boxes)), { "section:outer": ["section:inner", "screen:settings"], "section:inner": ["screen:home"] });
check("contents are every level", sectionContents("section:outer", boxes), ["section:inner", "screen:home", "screen:settings"]);
check("an empty section has no contents", sectionContents("section:inner", [inner]), []);
// A copy that lands on its original (⌘D, ⌥-drag of a Section, FW-106): two Sections the same size, each middle in the
// other. The one written first holds the copy, never both each other (the loop overflowed sectionContents, 2026-10-22).
const original = box("section:original", 100, 100, 800, 600);
const copy = box("section:copy", 120, 120, 800, 600);
const framed = box("screen:framed", 200, 200, 390, 300);
const twins = [original, copy, framed];
check("of two same-size sections, the first written holds the second", [sectionAround(copy, twins), sectionAround(original, twins)], ["section:original", null]);
check("contents of overlapping twins end (no loop); the frame stays the original's", [sectionContents("section:original", twins), sectionContents("section:copy", twins)], [["section:copy", "screen:framed"], []]);
check("the box around frames, padded", boxAround([home, settings], 80), { x: 120, y: 120, width: 1550, height: 1004 });
check("no box around nothing", boxAround([], 80), null);

// Reading order: rows top to bottom, each left to right (a frame a little lower still in the row).
const a = box("screen:a", 0, 0, 390, 844);
const b = box("screen:b", 500, 40, 390, 844);
const c = box("screen:c", 1000, -20, 390, 844);
const d = box("screen:d", 0, 1000, 390, 844);
const e = box("screen:e", 600, 960, 390, 200);
check("reading order", readingOrder([d, b, e, a, c]).map((item) => item.id), ["screen:a", "screen:b", "screen:c", "screen:d", "screen:e"]);

if (failures.length) {
  console.error(`✗ sections selftest: ${failures.length} of ${passed + failures.length} failed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ sections selftest: ${passed} checks pass.`);
