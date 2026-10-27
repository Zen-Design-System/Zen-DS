import { parseSrc, studioApi } from "../api";
import { libraryOf, pageComponents } from "../project/projectLibrary";
import type { LocalComponents } from "../builder/render/renderPage";
import type { EditOp } from "../types";
import { axisFor, cellsCode, cellsComponent, slotComponents } from "./cellComponents";
import { columnShape, edit, fieldOf, rowOp } from "./columnSource";
import { fieldText, tableData, type TableCellHit } from "./tableCells";

/*
 * A project component put into a Table cell's Content slot, as Figma's slot takes an instance (user, 2026-10-24: "muốn
 * hiển thị value loại gì thì add instance đó vào slot của cell trong table là được"): with a Cell selected, the component
 * from Assets or ⇧I, or a drag from Assets onto a cell. A column says it once per value (`cells`), so the set goes in for
 * the whole column (every variant, matched to the values by name, cellComponents.ts) and this row takes a value the set
 * draws: its own when a variant names it, else the set's first.
 */

/** A project component as Assets lists it: its id and the page that holds it (null: the Table's own page). */
export type CellComponent = { id: string; page: string | null; name: string };

/**
 * The components a page's Table cells can hold: its project's library (every page of the project, by page id), else the
 * page's own (a draft has no project, and the canvas keeps no library for it: projectLibrary.ts useProjectLibrary).
 */
export function cellLibrary(localPage: string | null): ReadonlyMap<string, LocalComponents> | undefined {
  if (!localPage) return undefined;
  const library = libraryOf(localPage);
  if (library) return library;
  const own = pageComponents(localPage);
  return own?.size ? new Map([[localPage, own]]) : undefined;
}

/** The project's set `component` names (Assets' page id → null for the Table's own page), or null for a lone main. */
const setOf = (component: CellComponent, localPage: string | null) => {
  const page = component.page === localPage ? null : component.page;
  return slotComponents(cellLibrary(localPage), localPage).find((candidate) => candidate.id === component.id && candidate.page === page) ?? null;
};

/** Why `component` can't go in the cell's slot, known without reading the file (a drag says it at once), or null. */
export function cellRefusal(hit: TableCellHit, component: CellComponent, localPage: string | null): string | null {
  if (!hit.columnDef) return "Not a Table cell";
  if (hit.columnDef.cell) return "This column's cells are set in code";
  return setOf(component, localPage) ? null : `${component.name} has no variants: a column's cells take a component set (one variant per value)`;
}

/** The edits that put `component` in the cell's slot, or why they can't. */
export async function cellInstanceEdit(hit: TableCellHit, component: CellComponent, localPage: string | null): Promise<{ table: Awaited<ReturnType<typeof studioApi.element>>; ops: EditOp[]; label: string } | { reason: string }> {
  const refused = cellRefusal(hit, component, localPage);
  const column = hit.columnDef;
  if (refused || !column) return { reason: refused ?? "Not a Table cell" };
  const at = hit.src ? parseSrc(hit.src) : null;
  if (!at) return { reason: "The Table is not written in a file the Studio edits" };
  const table = await studioApi.element(at.file, at.loc);
  const shape = columnShape(table, column.id);
  if (!shape || "reason" in shape) return { reason: shape?.reason ?? "The Table's columns are not written" };
  const set = setOf(component, localPage)!;
  const field = column.field ?? column.id;
  const values = tableData(hit.table).rows.map((row) => fieldText((row as Record<string, unknown> | null)?.[field])).filter((value): value is string => Boolean(value));
  const axis = axisFor(set, values);
  const ops: EditOp[] = [];
  const written = fieldOf(shape.shape, "cells");
  const holding = cellsComponent(written && "value" in written ? String(written.value) : undefined);
  if (!holding || holding.id !== set.id || holding.page !== set.page) ops.push({ op: "setField", name: "columns", index: shape.index, key: "cells", value: { kind: "expression", code: cellsCode(set, axis) } });
  const own = fieldText((hit.item as Record<string, unknown> | null)?.[field]);
  const value = own && set.axes[axis].includes(own) ? own : set.axes[axis][0];
  if (value !== own) ops.push(rowOp(hit, [field], { kind: "string", value }));
  if (!ops.length) return { reason: `${set.name} is in this cell's slot already` };
  return { table, ops, label: `${typeof column.header === "string" ? column.header : column.id}, row ${hit.row + 1}: Content → ${set.name}${value !== own ? ` (${value})` : ""}` };
}

/** Puts `component` in the cell's slot; false (with the reason in the status line) when it can't. */
export async function putInCell(hit: TableCellHit, component: CellComponent, localPage: string | null, refuse: (reason: string) => void): Promise<boolean> {
  const plan = await cellInstanceEdit(hit, component, localPage);
  if ("reason" in plan) { refuse(plan.reason); return false; }
  return edit(plan.table, plan.ops, plan.label);
}
