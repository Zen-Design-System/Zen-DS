#!/usr/bin/env node
// Self-test of ./arrangeModel.ts (imported directly: Node strips the types): Figma's align, distribute and tidy up for
// several layers (plan docs/research/studio-figma-design-parity-2026-10-18.md F2). Run: node src/platform/studio/edit/arrangeModel.selftest.mjs
import { alignMoves, distributeMoves, tidyMoves, unionOf } from "./arrangeModel.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};
const at = (boxes, moves) => boxes.map((box, index) => ({ x: box.x + moves[index].dx, y: box.y + moves[index].dy }));

const three = [{ x: 10, y: 40, width: 40, height: 20 }, { x: 100, y: 10, width: 20, height: 60 }, { x: 60, y: 90, width: 30, height: 30 }];
check("union", unionOf(three), { x: 10, y: 10, width: 110, height: 110 });
check("align left: every left edge at the selection's", at(three, alignMoves(three, "left")).map((box) => box.x), [10, 10, 10]);
check("align right: every right edge at the selection's", at(three, alignMoves(three, "right")).map((box, index) => box.x + three[index].width), [120, 120, 120]);
check("align top / bottom", [at(three, alignMoves(three, "top")).map((box) => box.y), at(three, alignMoves(three, "bottom")).map((box, index) => box.y + three[index].height)], [[10, 10, 10], [120, 120, 120]]);
check("align centres: every centre at the selection's, the other axis stays", [at(three, alignMoves(three, "hcenter")).map((box, index) => box.x + three[index].width / 2), alignMoves(three, "hcenter").map((move) => move.dy), alignMoves(three, "vcenter").map((move) => move.dx)], [[65, 65, 65], [0, 0, 0], [0, 0, 0]]);

const row = [{ x: 0, y: 0, width: 20, height: 20 }, { x: 25, y: 0, width: 20, height: 20 }, { x: 100, y: 0, width: 20, height: 20 }];
check("distribute horizontal: first and last stay, equal gaps", at(row, distributeMoves(row, "x")).map((box) => box.x), [0, 50, 100]);
check("distribute: fewer than 3 layers do not move", distributeMoves(row.slice(0, 2), "x"), [{ dx: 0, dy: 0 }, { dx: 0, dy: 0 }]);
const column = [{ x: 0, y: 90, width: 20, height: 10 }, { x: 0, y: 0, width: 20, height: 30 }, { x: 0, y: 40, width: 20, height: 10 }];
check("distribute vertical: in their order on the canvas, not the selection's", at(column, distributeMoves(column, "y")).map((box) => box.y), [90, 0, 55]);

const ragged = [{ x: 3, y: 0, width: 30, height: 10 }, { x: 40, y: 2, width: 30, height: 10 }, { x: 90, y: -1, width: 30, height: 10 }];
check("tidy up a row: tops lined up, the gaps' median (7 and 20 → 14)", at(ragged, tidyMoves(ragged)), [{ x: 3, y: -1 }, { x: 47, y: -1 }, { x: 91, y: -1 }]);
const stack = [{ x: 5, y: 0, width: 30, height: 10 }, { x: 0, y: 30, width: 30, height: 10 }, { x: 2, y: 50, width: 30, height: 10 }];
check("tidy up a column: lefts lined up, the gaps' median (20 and 10 → 15)", at(stack, tidyMoves(stack)), [{ x: 0, y: 0 }, { x: 0, y: 25 }, { x: 0, y: 50 }]);
const grid = [{ x: 0, y: 0, width: 20, height: 20 }, { x: 30, y: 2, width: 20, height: 20 }, { x: 1, y: 33, width: 20, height: 20 }, { x: 29, y: 30, width: 20, height: 20 }];
check("tidy up a grid: rows and columns, one gap each (x 10 and 8 → 9, y 8)", at(grid, tidyMoves(grid)), [{ x: 0, y: 0 }, { x: 29, y: 0 }, { x: 0, y: 28 }, { x: 29, y: 28 }]);

if (failures.length) {
  console.error(`✗ arrangeModel selftest: ${failures.length} failed, ${passed} passed\n${failures.map((failure) => `  ${failure}`).join("\n")}`);
  process.exit(1);
}
console.log(`✓ arrangeModel selftest: ${passed} checks pass.`);
