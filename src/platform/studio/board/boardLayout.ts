/*
 * Where the frames of a board section sit (world coordinates inside the section, before its padding). Pure: no DOM,
 * no React, erasable TypeScript only, so `node src/platform/studio/board/boardLayout.selftest.mjs` imports this file
 * directly.
 *
 * Like frames on a Figma canvas, a frame never moves sideways or to another column, whatever happens to the content:
 * - x comes from the RULE widths only (exampleWidth, never a width override): board order, left to right, rows of
 *   `rowWidth` with `gap` between frames (the packing the section's flex-wrap row did). It never changes in a session.
 * - y starts as those rows, laid out with the heights the frames had when the board opened (`base`): the opening board
 *   is the old flex-wrap layout exactly. From then on a frame moves only when a frame above it in its column changes
 *   height, by exactly that change: a frame's top keeps its opening gap to every earlier frame whose rule x-range overlaps
 *   its own (its column), and never less (the largest push wins). Frames in other columns stay where they are.
 * A width override renders a frame wider without moving anything (it may overlap its neighbour, as in Figma).
 */

export type BoardItem = {
  /** The rule width (exampleWidth): fixes the frame's column for the session. */
  width: number;
  /** The frame's height now (measured). */
  height: number;
  /** Its height when the board opened (the rows were laid out with it). */
  base: number;
};

export type BoardPlacement = { x: number; y: number };

export type BoardLayout = {
  /** One per item, in board order. */
  positions: BoardPlacement[];
  /** The frames' extent: at least `rowWidth` across (the section never narrows), the lowest bottom down. */
  width: number;
  height: number;
};

export type BoardLayoutOptions = { rowWidth: number; gap: number };

/** Rule x and row per frame: board order, left to right, a new row when the next frame no longer fits. */
export function packColumns(widths: readonly number[], { rowWidth, gap }: BoardLayoutOptions): Array<{ x: number; row: number }> {
  const placed: Array<{ x: number; row: number }> = [];
  let row = 0;
  let right = 0;
  let empty = true;
  for (const width of widths) {
    // A frame wider than the row still gets a row of its own (flex-wrap did the same).
    if (!empty && right + gap + width > rowWidth) {
      row += 1;
      empty = true;
    }
    const x = empty ? 0 : right + gap;
    placed.push({ x, row });
    right = x + width;
    empty = false;
  }
  return placed;
}

/** Do the rule x-ranges [a, a + aw) and [b, b + bw) share any width? (Edges that touch do not.) */
const sameColumn = (a: number, aw: number, b: number, bw: number) => a < b + bw && b < a + aw;

export function layoutBoard(items: readonly BoardItem[], options: BoardLayoutOptions): BoardLayout {
  const columns = packColumns(items.map((item) => item.width), options);
  // The opening rows: each as tall as its tallest frame at `base`.
  const rowTops: number[] = [];
  let rowTop = 0;
  let rowBottom = 0;
  columns.forEach(({ row }, index) => {
    if (rowTops[row] === undefined) {
      if (row > 0) rowTop = rowBottom + options.gap;
      rowTops[row] = rowTop;
      rowBottom = rowTop;
    }
    rowBottom = Math.max(rowBottom, rowTop + items[index].base);
  });
  // How far each frame has moved from its opening place: the largest push of the frames above it in its column.
  const shifts: number[] = [];
  const positions = columns.map(({ x, row }, index) => {
    let shift: number | null = null;
    for (let earlier = 0; earlier < index; earlier++) {
      if (!sameColumn(columns[earlier].x, items[earlier].width, x, items[index].width)) continue;
      const push = shifts[earlier] + items[earlier].height - items[earlier].base;
      shift = shift === null ? push : Math.max(shift, push);
    }
    shifts.push(shift ?? 0);
    return { x, y: rowTops[row] + (shift ?? 0) };
  });
  let width = options.rowWidth;
  let height = 0;
  positions.forEach(({ x, y }, index) => {
    width = Math.max(width, x + items[index].width);
    height = Math.max(height, y + items[index].height);
  });
  return { positions, width, height };
}
