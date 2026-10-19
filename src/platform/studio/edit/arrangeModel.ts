/*
 * Figma's align, distribute and tidy up for several layers (plan docs/research/studio-figma-design-parity-2026-10-18.md
 * F2): where each box goes, in the canvas px of the frame (unscaled). Pure — no DOM, no React — so the node selftest
 * (arrangeModel.selftest.mjs) imports it directly; edit/alignLayers.ts measures the boxes and writes the moves.
 *
 * - Align: several layers to the edge or centre of the box around them all (Figma aligns to the selection; one layer
 *   aligns to its frame, edit/figmaKeys.ts).
 * - Distribute: three or more layers, the first and the last stay, the gaps between them become equal.
 * - Tidy up: layers in a row or a column take the gap they mostly have; layers in a grid take rows and columns with one
 *   gap each, as Figma's Tidy up.
 */

export type Box = { x: number; y: number; width: number; height: number };
export type AlignEdge = "left" | "right" | "top" | "bottom" | "hcenter" | "vcenter";
export type Move = { dx: number; dy: number };

/** The box around every box. */
export function unionOf(boxes: readonly Box[]): Box {
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

const round = (value: number) => Math.round(value);

/** Each box's move to `edge` of the box around them all. */
export function alignMoves(boxes: readonly Box[], edge: AlignEdge): Move[] {
  const all = unionOf(boxes);
  return boxes.map((box) => {
    const dx = edge === "left" ? all.x - box.x : edge === "right" ? all.x + all.width - (box.x + box.width) : edge === "hcenter" ? all.x + all.width / 2 - (box.x + box.width / 2) : 0;
    const dy = edge === "top" ? all.y - box.y : edge === "bottom" ? all.y + all.height - (box.y + box.height) : edge === "vcenter" ? all.y + all.height / 2 - (box.y + box.height / 2) : 0;
    return { dx: round(dx), dy: round(dy) };
  });
}

/** Equal gaps between the boxes along `axis` (x: horizontal spacing); the first and the last stay. Fewer than 3: none. */
export function distributeMoves(boxes: readonly Box[], axis: "x" | "y"): Move[] {
  const moves: Move[] = boxes.map(() => ({ dx: 0, dy: 0 }));
  if (boxes.length < 3) return moves;
  const start = (box: Box) => (axis === "x" ? box.x : box.y);
  const size = (box: Box) => (axis === "x" ? box.width : box.height);
  const order = boxes.map((box, index) => ({ box, index })).sort((a, b) => start(a.box) - start(b.box) || a.index - b.index);
  const first = order[0].box;
  const last = order[order.length - 1].box;
  const span = start(last) + size(last) - start(first);
  const gap = (span - order.reduce((sum, entry) => sum + size(entry.box), 0)) / (order.length - 1);
  let at = start(first);
  for (const entry of order) {
    const delta = round(at - start(entry.box));
    moves[entry.index] = axis === "x" ? { dx: delta, dy: 0 } : { dx: 0, dy: delta };
    at += size(entry.box) + gap;
  }
  return moves;
}

/** Whether two boxes overlap along `axis` (share some of their extent there). */
const overlaps = (a: Box, b: Box, axis: "x" | "y") => (axis === "y" ? a.y < b.y + b.height && b.y < a.y + a.height : a.x < b.x + b.width && b.x < a.x + a.width);

/** The boxes in rows (top to bottom), each row left to right: a box joins a row it shares height with. */
function rowsOf(boxes: readonly Box[]): number[][] {
  const order = boxes.map((box, index) => ({ box, index })).sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
  const rows: Array<{ band: Box; members: number[] }> = [];
  for (const entry of order) {
    const row = rows.find((candidate) => overlaps(candidate.band, entry.box, "y"));
    if (row) { row.members.push(entry.index); row.band = unionOf([row.band, entry.box]); }
    else rows.push({ band: { ...entry.box }, members: [entry.index] });
  }
  return rows.sort((a, b) => a.band.y - b.band.y).map((row) => row.members.sort((a, b) => boxes[a].x - boxes[b].x));
}

/** The middle value (the gap most of the layers have), never below 0. */
function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted[Math.floor(sorted.length / 2)];
  return Math.max(0, round(sorted.length % 2 ? middle : (sorted[sorted.length / 2 - 1] + middle) / 2));
}

/**
 * Figma's Tidy up: a row (or a column) takes the gap its layers mostly have, top (left) edges lined up; a grid takes
 * rows of equal gaps and columns as wide as their widest layer, from the top left corner of the selection.
 */
export function tidyMoves(boxes: readonly Box[]): Move[] {
  const moves: Move[] = boxes.map(() => ({ dx: 0, dy: 0 }));
  if (boxes.length < 2) return moves;
  const all = unionOf(boxes);
  const rows = rowsOf(boxes);
  // One column: every layer on its own row.
  if (rows.length === boxes.length) {
    const gaps = rows.slice(1).map((row, at) => boxes[row[0]].y - (boxes[rows[at][0]].y + boxes[rows[at][0]].height));
    const gap = median(gaps);
    let y = all.y;
    for (const [index] of rows) {
      moves[index] = { dx: round(all.x - boxes[index].x), dy: round(y - boxes[index].y) };
      y += boxes[index].height + gap;
    }
    return moves;
  }
  const columns = Math.max(...rows.map((row) => row.length));
  const columnWidth = Array.from({ length: columns }, (_, column) => Math.max(0, ...rows.map((row) => (row[column] !== undefined ? boxes[row[column]].width : 0))));
  const rowHeight = rows.map((row) => Math.max(...row.map((index) => boxes[index].height)));
  const gapX = median(rows.flatMap((row) => row.slice(1).map((index, at) => boxes[index].x - (boxes[row[at]].x + boxes[row[at]].width))));
  const gapY = rows.length > 1 ? median(rows.slice(1).map((row, at) => Math.min(...row.map((index) => boxes[index].y)) - Math.max(...rows[at].map((index) => boxes[index].y + boxes[index].height)))) : 0;
  let y = all.y;
  rows.forEach((row, rowAt) => {
    let x = all.x;
    row.forEach((index, column) => {
      moves[index] = { dx: round(x - boxes[index].x), dy: round(y - boxes[index].y) };
      x += (rows.length > 1 ? columnWidth[column] : boxes[index].width) + gapX;
    });
    y += rowHeight[rowAt] + gapY;
  });
  return moves;
}
