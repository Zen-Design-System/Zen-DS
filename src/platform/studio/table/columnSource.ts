import { applyEdit } from "../api";
import { inspectorStatus } from "../inspector/status";
import type { EditOp, EditValue, ObjectShape, SourceAttr, SourceElement } from "../types";
import { rowFieldsOf } from "./tableCells";

/*
 * A Table's columns and rows as written, for the edits the Studio makes on them (the Cell inspector, TableCellPanel.tsx,
 * and an instance put into a cell's Content slot, cellInstance.ts).
 */

/** One edit on an element, its answer reported in the status line when refused. */
export async function edit(element: SourceElement | null, ops: EditOp[], label: string): Promise<boolean> {
  if (!element) return false;
  const response = await applyEdit({ file: element.file, loc: element.loc, name: element.name, ops, hash: element.hash }, label);
  if (!response.ok) inspectorStatus.set("negative", ("error" in response && response.error) || "Not saved");
  return response.ok;
}

export const attr = (element: SourceElement | null, name: string): SourceAttr | undefined => element?.attributes.filter((candidate) => candidate.name === name).at(-1);

/**
 * The column's object literal in the Table's `columns` (written in place or in a same-file const): its index there and
 * its fields, found by the column's id. Null with why when the columns are not written as a list the Studio edits.
 */
export function columnShape(table: SourceElement | null, id: string): { index: number; shape: ObjectShape } | { reason: string } | null {
  if (!table) return null;
  const columns = attr(table, "columns");
  const shape = columns?.shape;
  if (shape?.type !== "array") return { reason: columns ? `The columns come from {${(columns.value ?? "").slice(0, 40)}}; edit them in the code` : "The Table has no columns" };
  const index = shape.items.findIndex((item) => item.type === "object" && item.fields.some((field) => field.key === "id" && field.kind === "string" && field.value === id));
  const item = shape.items[index];
  return item?.type === "object" ? { index, shape: item } : { reason: `The column "${id}" is not written in the list; edit it in the code` };
}

export const fieldOf = (shape: ObjectShape, key: string) => [...shape.fields].reverse().find((field) => field.key === key);

/** Op setDataField on a cell's row (found by its place, key and plain fields: data-source.mjs). */
export function rowOp(cell: { row: number; rowKey: string | null; item: unknown }, field: string[], value: EditValue): EditOp {
  return { op: "setDataField", field, row: cell.row, ...(cell.rowKey !== null ? { rowKey: cell.rowKey } : {}), rowFields: rowFieldsOf(cell.item), value };
}
