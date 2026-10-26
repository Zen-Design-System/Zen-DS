// A Grid's cells as Layout.tsx lays them out (docs/research/grid-span-2026-10-26.md §5): CSS grid auto-placement, row
// by row, sparse (never back to an earlier hole, as Layout.tsx draws: no `dense`), each child taking its `span` columns
// (a number clamped to the columns, or "full": the whole row) and `rowSpan` rows. The push gives Figma's Grid auto layout
// each child's row, column and spans and the row count from it; the pull checks that Figma's cells read in that order;
// the Inspector counts the columns a row leaves empty. Isomorphic, pure.

/**
 * `items`: each child's `{ span, rowSpan }` in reading order (unset = 1); `columns`: the Grid's column count. Returns each
 * child's `{ row, col, span, rowSpan }` (from 0, spans clamped) and the number of rows.
 */
export function placeCells(items, columns) {
  const count = Math.max(1, Math.round(columns) || 1);
  const taken = [];
  const free = (row, col, width, height) => {
    for (let r = row; r < row + height; r += 1) for (let c = col; c < col + width; c += 1) if (taken[r]?.[c]) return false;
    return true;
  };
  const take = (row, col, width, height) => {
    for (let r = row; r < row + height; r += 1) for (let c = col; c < col + width; c += 1) (taken[r] ??= [])[c] = true;
  };
  let row = 0;
  let col = 0;
  const cells = items.map((item) => {
    const height = Math.max(1, Math.round(Number(item?.rowSpan)) || 1);
    if (item?.span === "full") {
      // A definite column (1 / -1): the cursor goes to column 0, a row down when it was past it, then down past what is taken.
      if (col > 0) row += 1;
      col = 0;
      while (!free(row, 0, count, height)) row += 1;
      take(row, 0, count, height);
      return { row, col: 0, span: count, rowSpan: height };
    }
    const width = Math.min(Math.max(1, Math.round(Number(item?.span)) || 1), count);
    for (;;) {
      if (col + width > count) { row += 1; col = 0; continue; }
      if (free(row, col, width, height)) break;
      col += 1;
    }
    take(row, col, width, height);
    const cell = { row, col, span: width, rowSpan: height };
    col += width;
    return cell;
  });
  const rows = cells.reduce((most, cell) => Math.max(most, cell.row + cell.rowSpan), 1);
  return { cells, rows, taken: Array.from({ length: rows }, (_, r) => Array.from({ length: count }, (_, c) => Boolean(taken[r]?.[c]))) };
}

/** The columns each row of a placement leaves empty (a hole in the grid). */
export function emptyColumns(placement) {
  return placement.taken.map((cells) => cells.filter((cell) => !cell).length);
}
