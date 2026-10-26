import { CELL_COMPONENTS } from "../../../../tools/studio/responsive-props.mjs";
import type { EditOp, EditValue, SourceAttr } from "../types";

/*
 * The Inspector's Grid cell group (docs/research/grid-span-2026-10-26.md §4): a Grid child's Column span and Row span,
 * Figma Grid auto layout's column / row span, per breakpoint like the Layout fields (responsiveModel.ts writes the
 * editing breakpoint's key). A layer that takes no `span` (a Table, a Calendar) gets it through a `<Box span>` wrap, and
 * Reset on such a bare Box unwraps it again. Pure: gridCellModel.selftest.mjs runs it in Node.
 */

/** A column span as written: a whole number or the whole row. */
export type CellSpan = number | "full";

/** Whether `component` takes `span` / `rowSpan` itself (Layout/cell.ts): else the Studio wraps it in a Box. */
export const takesSpan = (component: string): boolean => (CELL_COMPONENTS as readonly string[]).includes(component);

/** What a span reads as at a breakpoint: 1 when unset, "full", or a whole number. */
export function spanOf(shown: string | number | boolean | undefined): CellSpan {
  if (shown === "full") return "full";
  const number = typeof shown === "number" ? shown : typeof shown === "string" ? Number(shown) : NaN;
  return Number.isFinite(number) && number >= 1 ? Math.round(number) : 1;
}

/** A span within the Grid's columns (null: auto-fill, where only "full" applies; a number shows as 1). */
export function clampSpan(span: CellSpan, columns: number | null): CellSpan {
  if (span === "full") return "full";
  if (columns === null) return 1;
  return Math.min(Math.max(1, span), Math.max(1, columns));
}

/** The words a span shows ("Full", "8 of 12"). */
export function spanLabel(span: CellSpan, columns: number | null): string {
  if (span === "full") return "Full";
  return columns === null ? String(span) : `${span} of ${columns}`;
}

const valueOf = (span: CellSpan): EditValue => (span === "full" ? { kind: "string", value: "full" } : { kind: "number", value: span });

/**
 * The plain op for one prop (responsiveOps turns it into the editing breakpoint's key): 1 is the default, so it removes
 * the prop (on a narrower breakpoint responsiveOps writes the default 1 there instead).
 */
export function spanOp(name: "span" | "rowSpan", next: CellSpan): EditOp {
  return next === 1 ? { op: "removeProp", name } : { op: "setProp", name, value: valueOf(next) };
}

/** A layer that takes no span: the one-op request that wraps it in `<Box span>` (the answer selects the Box). */
export function wrapForSpan(name: "span" | "rowSpan", next: CellSpan): EditOp | null {
  if (next === 1) return null;
  return { op: "wrap", tag: "Box", props: { [name]: valueOf(next) } };
}

/**
 * A Box that exists only to give its one child a span (what wrapForSpan made, or the same written by hand): no other
 * props, one element inside. Reset on it unwraps (the child takes the Grid cell again).
 */
export function isSpanWrapper(component: string, attributes: readonly SourceAttr[], elementChildren: number): boolean {
  if (component !== "Box" || elementChildren !== 1) return false;
  const names = attributes.filter((attr) => attr.kind !== "spread").map((attr) => attr.name).filter((name) => name !== "key");
  return names.length > 0 && names.every((name) => name === "span" || name === "rowSpan") && !attributes.some((attr) => attr.kind === "spread");
}

/**
 * How many columns a Grid lays out, from what the browser drew (computed grid-template-columns, one px track per column)
 * and whether it is an auto-fill Grid (Layout.tsx data-mode="fill": its count follows the width, so only "full" spans).
 */
export function columnsOf(computedTracks: string, mode: string | undefined): number | null {
  if (mode === "fill") return null;
  const tracks = computedTracks.trim().split(/\s+(?![^(]*\))/).filter((track) => track && track !== "none");
  return tracks.length || null;
}

/**
 * How full the row of a cell is, for the hint under the fields: the spans of a Grid's children in order (CSS
 * auto-placement, sparse, as Layout.tsx draws them) → the columns each row leaves empty. Row spans are taken into account.
 */
export function emptyColumnsByRow(spans: Array<{ span: CellSpan; rowSpan?: number }>, columns: number | null): number[] {
  if (columns === null || columns < 1) return [];
  const taken: boolean[][] = [];
  const isTaken = (row: number, column: number) => Boolean(taken[row]?.[column]);
  const take = (row: number, column: number) => { (taken[row] ??= [])[column] = true; };
  let row = 0;
  let column = 0;
  for (const cell of spans) {
    const width = cell.span === "full" ? columns : Math.min(Math.max(1, cell.span), columns);
    const height = Math.max(1, cell.rowSpan ?? 1);
    if (cell.span === "full") column = 0;
    // The next position from the cursor where `width` free columns fit (sparse: never back to an earlier hole).
    for (;;) {
      if (column + width > columns) { row += 1; column = 0; continue; }
      let free = true;
      for (let r = row; r < row + height && free; r += 1) for (let c = column; c < column + width; c += 1) if (isTaken(r, c)) { free = false; break; }
      if (free) break;
      column += 1;
    }
    for (let r = row; r < row + height; r += 1) for (let c = column; c < column + width; c += 1) take(r, c);
    column += width;
    if (cell.span === "full") { row += 1; column = 0; }
  }
  return taken.map((cells) => columns - Array.from({ length: columns }, (_, index) => cells?.[index]).filter(Boolean).length);
}
