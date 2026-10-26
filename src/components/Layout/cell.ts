/**
 * A Grid's cell span (docs/research/grid-span-2026-10-26.md): Figma Grid auto layout's column span and row span of a
 * child (gridColumnSpan / gridRowSpan), for a dashboard's widgets in one grid (a hero over 8 of 12 columns beside a
 * companion over 4).
 *
 * The Grid shares the column count it lays out at and whether it stacks (GridCellContext); a direct child clamps its
 * span to it, so a span never makes CSS add columns. Rendering: `data-span` (`"true"` or `"full"`) and `data-row-span`
 * plus `--zen-cell-span` / `--zen-cell-row-span`, which layout.css reads on a Grid's direct children only. Placement stays
 * CSS auto-placement in reading order (no `dense`), so a span that doesn't fit the rest of a row starts the next one.
 */
import { createContext, useContext } from "react";
import { resolveAt, type Responsive, type ResponsiveBreakpoint } from "../_shared/responsive";

/** Columns a cell takes: a whole number (clamped to the Grid's columns) or `"full"`, the whole row. */
export type LayoutSpan = number | "full";

/** A Grid child's span, shared by Stack, Grid, Box, Card, ListBox, ChartCard and MetricCard. */
export interface LayoutCellProps {
  /**
   * How many of the parent Grid's columns this child takes (Figma Grid auto layout › column span): a whole number, or
   * `"full"` for the whole row. Per breakpoint too, as the Grid's `columns`: `{ desktop: 8, tablet: "full" }` (a
   * breakpoint without its own value takes the next wider one's). Never more than the Grid's columns; every cell takes
   * the whole row while the Grid stacks (`stackBelow`, one column). In a Grid without `columns` (auto-fill) only `"full"`
   * applies. Default 1. No effect outside a Grid.
   */
  span?: Responsive<LayoutSpan>;
  /**
   * How many rows this child takes in the parent Grid (Figma Grid auto layout › row span): a list beside two stacked
   * charts. Per breakpoint too; dropped while the Grid stacks. Default 1. No effect outside a Grid.
   */
  rowSpan?: Responsive<number>;
}

/** What a Grid tells its children: its column count at its breakpoint (null: auto-fill), whether it stacks, and where it lays out. */
export interface GridCellContextValue {
  columns: number | null;
  stacked: boolean;
  breakpoint: ResponsiveBreakpoint;
}

export const GridCellContext = createContext<GridCellContextValue | null>(null);

export interface LayoutCellOutput {
  /** Data attributes to spread on the element; empty when the element is no spanning Grid cell. */
  attributes: Record<`data-${string}`, string | undefined>;
  /** Inline custom properties with the spans; empty when there are none. */
  vars: Record<`--${string}`, string>;
}

const none: LayoutCellOutput = { attributes: {}, vars: {} };
const whole = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? Math.max(1, Math.round(value)) : null);

/**
 * How many columns a track list lays out: a count, `repeat(n, …)` (n times its tracks), or the top-level tracks of a list
 * ("2fr 1fr", "minmax(0, 1fr) 320px"); null for auto-fill / auto-fit or a list it can't read.
 */
export function gridTrackCount(tracks: number | string | undefined): number | null {
  if (typeof tracks === "number") return whole(tracks);
  if (typeof tracks !== "string" || /auto-(fill|fit)/.test(tracks)) return null;
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of tracks.trim()) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (/\s/.test(char) && depth === 0) {
      if (current) parts.push(current);
      current = "";
    } else current += char;
  }
  if (current) parts.push(current);
  let count = 0;
  for (const part of parts) {
    const repeat = /^repeat\(\s*(\d+)\s*,(.*)\)$/s.exec(part);
    if (repeat) {
      const inner = gridTrackCount(repeat[2]);
      if (inner === null) return null;
      count += Number(repeat[1]) * inner;
    } else if (!part.startsWith("[")) count += 1; // a line name ([main-start]) is no track
  }
  return count || null;
}

/** The cell attributes for `span` / `rowSpan` inside `grid` (pure: the Grid's context passed in). */
export function gridCell(grid: GridCellContextValue | null, { span, rowSpan }: LayoutCellProps): LayoutCellOutput {
  if (!grid || (span === undefined && rowSpan === undefined)) return none;
  const stacked = grid.stacked || grid.columns === 1;
  const columns = resolveAt(span, grid.breakpoint);
  const rows = stacked ? null : whole(resolveAt(rowSpan, grid.breakpoint));
  const across = columns === "full" ? "full" : grid.columns === null || stacked ? null : Math.min(whole(columns) ?? 1, grid.columns);
  const spans = across === "full" || (across !== null && across > 1);
  return {
    attributes: { "data-span": across === "full" ? "full" : spans ? "true" : undefined, "data-row-span": rows !== null && rows > 1 ? "true" : undefined },
    vars: {
      ...(typeof across === "number" && across > 1 ? { "--zen-cell-span": String(across) } : {}),
      ...(rows !== null && rows > 1 ? { "--zen-cell-row-span": String(rows) } : {}),
    },
  };
}

/** The cell attributes for a child of the nearest Grid. */
export function useGridCell(props: LayoutCellProps): LayoutCellOutput {
  return gridCell(useContext(GridCellContext), props);
}
