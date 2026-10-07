#!/usr/bin/env node
// Zen Studio board-layout selftest: packColumns / layoutBoard from ./boardLayout.ts (imported directly: Node strips the
// types), without a browser.
//   node src/platform/studio/board/boardLayout.selftest.mjs [--cases=3000] [--seed=7]   summary; exit 1 on any failure
// Checks: the opening board is the old flex-wrap layout exactly; x never depends on heights; a height change moves only
// the frames below the changed frame in its column, by exactly its delta (the largest push when several reach a frame);
// frames in one column never overlap; the section's size follows the frames.
import { layoutBoard, packColumns } from "./boardLayout.ts";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => arg.replace(/^--/, "").split("=")));
const CASES = Number(args.cases ?? 3000);
const SEED = Number(args.seed ?? 7);
const OPTIONS = { rowWidth: 2944, gap: 64 };
const RULES = [640, 1200, 1440];

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else if (failures.length < 40) failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
  else failures.push(label);
}
const ok = (label, condition) => check(label, Boolean(condition), true);

/** mulberry32 */
function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The section as it used to be: a 2944px flex-wrap row with 64px gaps, align-items flex-start (independent model). */
function flexWrap(widths, heights) {
  const lines = [];
  for (let index = 0; index < widths.length; index++) {
    const line = lines.at(-1);
    const used = line ? line.reduce((sum, i) => sum + widths[i], 0) + OPTIONS.gap * (line.length - 1) : 0;
    if (!line || used + OPTIONS.gap + widths[index] > OPTIONS.rowWidth) lines.push([index]);
    else line.push(index);
  }
  const out = [];
  let top = 0;
  for (const line of lines) {
    let left = 0;
    for (const index of line) {
      out[index] = { x: left, y: top };
      left += widths[index] + OPTIONS.gap;
    }
    top += Math.max(...line.map((index) => heights[index])) + OPTIONS.gap;
  }
  return out;
}

const items = (widths, heights, bases = heights) => widths.map((width, index) => ({ width, height: heights[index], base: bases[index] }));
const overlapsX = (a, aw, b, bw) => a < b + bw && b < a + aw;

// 1. Packing: the rows flex-wrap made.
check("four 640s per row", packColumns([640, 640, 640, 640, 640, 640], OPTIONS), [
  { x: 0, row: 0 }, { x: 704, row: 0 }, { x: 1408, row: 0 }, { x: 2112, row: 0 }, { x: 0, row: 1 }, { x: 704, row: 1 },
]);
check("two 1440 screens fill a row exactly", packColumns([1440, 1440, 1440], OPTIONS), [{ x: 0, row: 0 }, { x: 1504, row: 0 }, { x: 0, row: 1 }]);
check("1200 + 1200 leaves no room for a 640", packColumns([1200, 1200, 640], OPTIONS), [{ x: 0, row: 0 }, { x: 1264, row: 0 }, { x: 0, row: 1 }]);
check("640 + 1440 + 640 share a row", packColumns([640, 1440, 640], OPTIONS), [{ x: 0, row: 0 }, { x: 704, row: 0 }, { x: 2208, row: 0 }]);
check("a frame wider than the row gets its own row", packColumns([640, 4096, 640], OPTIONS), [{ x: 0, row: 0 }, { x: 0, row: 1 }, { x: 0, row: 2 }]);
check("no frames", layoutBoard([], OPTIONS), { positions: [], width: 2944, height: 0 });

// 2. The opening board (heights = base) is the flex-wrap layout, uneven rows included.
{
  const widths = [640, 640, 640, 640, 1200, 1200, 640];
  const heights = [300, 520.5, 410, 180, 700, 650.25, 90];
  const layout = layoutBoard(items(widths, heights), OPTIONS);
  check("opening = flex-wrap", layout.positions, flexWrap(widths, heights));
  check("opening size", { width: layout.width, height: layout.height }, { width: 2944, height: 520.5 + 64 + 700 + 64 + 90 });
}

// 3. One frame grows or shrinks: only the frames below it in its column move, by exactly that.
{
  const widths = [640, 640, 640, 640, 640, 640, 640, 640, 640];
  const base = [300, 500, 400, 200, 350, 250, 450, 150, 100];
  const opening = layoutBoard(items(widths, base), OPTIONS).positions;
  for (const dh of [839, -826, -66, 0.5]) {
    const heights = [...base];
    heights[1] += dh; // column 2 holds frames 1 and 5 (frame 8 opens row 3 in column 1)
    const moved = layoutBoard(items(widths, heights, base), OPTIONS).positions;
    const delta = moved.map((position, index) => ({ dx: position.x - opening[index].x, dy: position.y - opening[index].y }));
    check(`column 2 ${dh > 0 ? "+" : ""}${dh}: frames below move by dh, nothing else`, delta, widths.map((_, index) => ({ dx: 0, dy: index === 5 ? dh : 0 })));
  }
  // Back to the opening heights (Reset, undo): the opening board again.
  check("reset returns to the opening board", layoutBoard(items(widths, base, base), OPTIONS).positions, opening);
}

// 4. Columns of different widths: a wide frame under several columns moves with the largest push; it stays while
//    another column still holds it; its own column below it follows it.
{
  const widths = [640, 640, 640, 640, 1440, 1440, 640];
  // Row 0: 640s at x 0, 704, 1408, 2112. Row 1: a screen at 0–1440 (under frames 0, 1 and 2: 1408 < 1440) and one at
  // 1504–2944 (under 2 and 3). Row 2: a 640 at 0 (under the first screen).
  const base = [300, 300, 300, 300, 400, 400, 100];
  const opening = layoutBoard(items(widths, base), OPTIONS).positions;
  const shift = (heights) => layoutBoard(items(widths, heights, base), OPTIONS).positions.map((position, index) => position.y - opening[index].y);
  check("frame 0 +200: the screen under it and the frame under that move 200; the other screen stays", shift([500, 300, 300, 300, 400, 400, 100]), [0, 0, 0, 0, 200, 0, 200]);
  check("frame 2 +50: both screens move 50 (it is in both columns)", shift([300, 300, 350, 300, 400, 400, 100]), [0, 0, 0, 0, 50, 50, 50]);
  check("frame 0 -250: frames 1 and 2 still hold the screen, nothing moves", shift([50, 300, 300, 300, 400, 400, 100]), [0, 0, 0, 0, 0, 0, 0]);
  check("frames 0, 1, 2 lift by 250, 100, 120: the screen comes up by the smallest lift", shift([50, 200, 180, 300, 400, 400, 100]), [0, 0, 0, 0, -100, 0, -100]);
  check("the screen itself grows: only the frame under it moves", shift([300, 300, 300, 300, 640, 400, 100]), [0, 0, 0, 0, 0, 0, 240]);
}

// 5. Fuzz: random boards and random height changes.
const rand = random(SEED);
const pick = (list) => list[Math.floor(rand() * list.length)];
for (let run = 0; run < CASES; run++) {
  const count = 1 + Math.floor(rand() * 16);
  const widths = Array.from({ length: count }, () => (rand() < 0.02 ? 3000 + Math.floor(rand() * 1000) : pick(RULES)));
  const base = Array.from({ length: count }, () => Math.round(rand() * 1500 * 64) / 64);
  const opening = layoutBoard(items(widths, base), OPTIONS);
  check(`#${run} opening = flex-wrap`, opening.positions, flexWrap(widths, base));
  // Any heights: x is the rule packing; frames of one column keep at least the gap; the size follows the frames.
  const heights = base.map((height) => (rand() < 0.4 ? Math.max(0, height + Math.round((rand() - 0.5) * 2000)) : height));
  const layout = layoutBoard(items(widths, heights, base), OPTIONS);
  const packed = packColumns(widths, OPTIONS);
  check(`#${run} x never moves`, layout.positions.map((position) => position.x), packed.map((column) => column.x));
  let clear = true;
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < i; j++) {
      if (overlapsX(packed[j].x, widths[j], packed[i].x, widths[i]) && layout.positions[i].y < layout.positions[j].y + heights[j] + OPTIONS.gap - 1e-9) clear = false;
    }
  }
  ok(`#${run} one column never overlaps`, clear);
  check(`#${run} size`, { width: layout.width, height: layout.height }, {
    width: Math.max(OPTIONS.rowWidth, ...layout.positions.map((position, index) => position.x + widths[index])),
    height: Math.max(0, ...layout.positions.map((position, index) => position.y + heights[index])),
  });
  // One frame changes from the opening board: the frames that move are exactly the ones below it in its column (for a
  // growth: every frame reached through the column; for a shrink: those it alone holds up), by exactly the delta.
  const k = Math.floor(rand() * count);
  const dh = Math.round((rand() - 0.5) * 1800);
  const single = [...base];
  single[k] = Math.max(0, base[k] + dh);
  const delta = single[k] - base[k];
  const after = layoutBoard(items(widths, single, base), OPTIONS).positions;
  const below = new Set([k]);
  const held = new Set([k]);
  for (let i = k + 1; i < count; i++) {
    const supports = [];
    for (let j = 0; j < i; j++) if (overlapsX(packed[j].x, widths[j], packed[i].x, widths[i])) supports.push(j);
    if (supports.some((j) => below.has(j))) below.add(i);
    if (supports.length && supports.every((j) => held.has(j))) held.add(i);
  }
  const expected = after.map((_, index) => {
    if (index === k) return 0;
    if (delta > 0) return below.has(index) ? delta : 0;
    return held.has(index) ? delta : 0;
  });
  check(`#${run} frame ${k} ${delta}: only its column below moves, by exactly the delta`, after.map((position, index) => ({ dx: position.x - opening.positions[index].x, dy: position.y - opening.positions[index].y })),
    expected.map((dy) => ({ dx: 0, dy })));
}

console.log(`boardLayout selftest: ${passed} passed, ${failures.length} failed (${CASES} fuzz cases, seed ${SEED})`);
if (failures.length) {
  for (const failure of failures.slice(0, 40)) console.log(`  FAIL ${failure}`);
  process.exit(1);
}
