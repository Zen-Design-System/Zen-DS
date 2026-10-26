export type CellItem = { span?: number | "full"; rowSpan?: number };
export type PlacedCell = { row: number; col: number; span: number; rowSpan: number };
export type Placement = { cells: PlacedCell[]; rows: number; taken: boolean[][] };
export function placeCells(items: readonly CellItem[], columns: number): Placement;
export function emptyColumns(placement: Placement): number[];
