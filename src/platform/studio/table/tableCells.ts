import { currentFiber, fiberOf, srcOf, type Fiber } from "../select/picker";

/*
 * Table rows and cells on the canvas (user, 2026-10-10: "Tôi vẫn chưa sửa được table cell từ template lẫn example",
 * "phải chọn được loại dữ liệu của cell", "giống Figma 100%"). Figma's Table is Primitives/Table/Header over
 * Primitives/Table/Data-Row instances of Table/Cell/Default (Content slot: Text-Cell, Avatar-Cell, Badge-Cell…); a Zen
 * Table draws them from `columns` × `rows`. A rendered cell is a <td class="zen-table__cell"> whose React key is its
 * column's id, in a <tr class="zen-table__row"> whose key is its row's id (getRowId); the Table component above them
 * holds the columns and rows it drew. Read-only: the edits go through the dev server (data-source.mjs).
 */

/** A column as the Table drew it (TableColumn's fields the Studio reads). */
export type TableColumnInfo = {
  id: string;
  header?: unknown;
  align?: "left" | "right";
  width?: string;
  sortable?: boolean;
  cell?: unknown;
  content?: string;
  field?: string;
  captionField?: string;
  mediaField?: string;
  bold?: boolean;
  onOpen?: unknown;
  edit?: unknown;
};

export type TableCellHit = {
  /** The Table component's fiber, and its annotated source (file:line:col) when an example writes it. */
  table: Fiber;
  src: string | null;
  root: HTMLElement | null;
  tr: HTMLTableRowElement;
  td: HTMLTableCellElement;
  /** The row's place among the rows the Table draws, and its key (getRowId). */
  row: number;
  rowKey: string | null;
  /** The column's place in `columns`, and the column as drawn. */
  column: number;
  columnDef: TableColumnInfo | null;
  /** The row's item as drawn. */
  item: unknown;
};

const keyOf = (fiber: Fiber | null) => {
  const key = (fiber as (Fiber & { key?: string | null }) | null)?.key;
  return typeof key === "string" ? key : null;
};

/** The Table component above a node of its table (the nearest fiber that holds `columns` and `rows`/`data` arrays). */
export function tableFiberOf(node: Node | null): Fiber | null {
  for (let fiber = fiberOf(node), guard = 0; fiber && guard < 200; fiber = fiber.return, guard++) {
    if (typeof fiber.type !== "function") continue;
    const props = currentFiber(fiber).memoizedProps ?? {};
    if (Array.isArray(props.columns) && (Array.isArray(props.rows) || Array.isArray(props.data))) return currentFiber(fiber);
  }
  return null;
}

/** The columns and rows a Table fiber drew. */
export function tableData(table: Fiber): { columns: TableColumnInfo[]; rows: unknown[] } {
  const props = table.memoizedProps ?? {};
  return { columns: (props.columns as TableColumnInfo[]) ?? [], rows: ((props.rows ?? props.data) as unknown[]) ?? [] };
}

/** Figma's layer names for a Table's own nodes (Table › Header, Data-Row › Table/Cell/Header, Table/Cell/Default). */
export const TABLE_PARTS = { row: "Data-Row", cell: "Cell", header: "Header", headerCell: "Header-Cell" } as const;

/** Figma's name for a node a Table draws (a body row, a cell, the header row, a header cell), or null for any other. */
export function tablePartName(element: Element): string | null {
  if (!element.parentElement?.closest(".zen-table")) return null;
  if (element instanceof HTMLTableRowElement) {
    if (element.classList.contains("zen-table__row")) return TABLE_PARTS.row;
    return element.parentElement?.tagName === "THEAD" ? TABLE_PARTS.header : null;
  }
  if (!(element instanceof HTMLTableCellElement) || element.classList.contains("zen-table__select")) return null;
  if (element.tagName === "TD" && element.classList.contains("zen-table__cell")) return TABLE_PARTS.cell;
  return element.tagName === "TH" && element.classList.contains("zen-table__header") ? TABLE_PARTS.headerCell : null;
}

/** The data rows of a table body, in order (the empty-state row left out). */
export const bodyRows = (tbody: Element) => Array.from(tbody.children).filter((child): child is HTMLTableRowElement => child instanceof HTMLTableRowElement && child.classList.contains("zen-table__row"));

/** The data cells of a row (the selection checkbox left out). */
export const rowCells = (tr: Element) => Array.from(tr.children).filter((child): child is HTMLTableCellElement => child instanceof HTMLTableCellElement && child.classList.contains("zen-table__cell") && !child.classList.contains("zen-table__select"));

/** The Table cell a node is drawn in (a text node, the cell's content or the <td> itself), or null. */
export function tableCellOf(node: Node | null): TableCellHit | null {
  const element = node instanceof Element ? node : node?.parentElement ?? null;
  const td = element?.closest<HTMLTableCellElement>("td.zen-table__cell");
  if (!td || td.classList.contains("zen-table__select")) return null;
  const tr = td.parentElement;
  if (!(tr instanceof HTMLTableRowElement) || !tr.classList.contains("zen-table__row") || !tr.parentElement) return null;
  const table = tableFiberOf(td);
  if (!table) return null;
  const { columns, rows } = tableData(table);
  const row = bodyRows(tr.parentElement).indexOf(tr);
  const columnId = keyOf(fiberOf(td));
  const column = columnId === null ? rowCells(tr).indexOf(td) : columns.findIndex((candidate) => candidate?.id === columnId);
  if (row < 0 || column < 0) return null;
  return {
    table,
    src: srcOf(table),
    root: tr.closest<HTMLElement>(".zen-table"),
    tr,
    td,
    row,
    rowKey: keyOf(fiberOf(tr)),
    column,
    columnDef: columns[column] ?? null,
    item: rows[row],
  };
}

/** A row's plain fields (text, numbers, booleans; at most 16), sent with a cell's edit to find the row in the data. */
export function rowFieldsOf(item: unknown): Record<string, string | number | boolean> | undefined {
  if (!item || typeof item !== "object" || Array.isArray(item)) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
    if (Object.keys(out).length >= 16) break;
    if (typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Where op setDataField finds a Table cell's row: its place, key and plain fields, and the Table's loc in `file`. */
export type CellDataTarget = { row: number; rowKey?: string; rowFields?: Record<string, string | number | boolean>; table?: string };

/**
 * The row an element a column's `cell` writes is drawn for (`host`: one of its DOM nodes, inside the cell), as op
 * setDataField takes it: a prop bound to the row (an Avatar's `src={row.photo}`, a Badge's
 * `theme={statusTheme[row.status]}`) is written in that row's data. Null outside a Table cell.
 */
export function cellDataTarget(host: Element | null | undefined, file: string | undefined): CellDataTarget | null {
  const hit = host ? tableCellOf(host) : null;
  if (!hit) return null;
  const table = hit.src ? /^(.*):(\d+:\d+)$/.exec(hit.src) : null;
  const rowFields = rowFieldsOf(hit.item);
  return { row: hit.row, ...(hit.rowKey !== null ? { rowKey: hit.rowKey } : {}), ...(rowFields ? { rowFields } : {}), ...(table && table[1] === file ? { table: table[2] } : {}) };
}

/** A row field's value as the Table draws it as text (TableText, a Badge…), or null for anything else. */
export function fieldText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

/**
 * The row field a text drawn by a column without `cell` comes from: its `field` (by default the column's id), a list's
 * item in it (Badge and Tag cells draw one per item), or its `captionField` (the Subtext). Null when the text is none
 * of them.
 */
export function cellFieldOf(hit: TableCellHit, text: string, normalize: (value: string) => string): string[] | null {
  const column = hit.columnDef;
  if (!column || column.cell || !hit.item || typeof hit.item !== "object") return null;
  const record = hit.item as Record<string, unknown>;
  const label = column.field ?? column.id;
  const wanted = normalize(text);
  const same = (value: unknown) => {
    const shown = fieldText(value);
    return shown !== null && normalize(shown) === wanted;
  };
  if (same(record[label])) return [label];
  const list = record[label];
  if (Array.isArray(list)) {
    const index = list.findIndex(same);
    if (index >= 0) return [label, String(index)];
  }
  if (column.captionField && same(record[column.captionField])) return [column.captionField];
  return null;
}
