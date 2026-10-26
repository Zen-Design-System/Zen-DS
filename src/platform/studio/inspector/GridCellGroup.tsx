import { useEffect, useId, useState } from "react";
import { IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { typographyStyles } from "../../../tokens/typography.generated";
import { BREAKPOINT_LABELS } from "../../../../tools/studio/screen-devices.mjs";
import { breakpointOf, primaryBreakpointOf } from "../select/gridTracks";
import type { SourceAttr } from "../types";
import { ScrubNumberField } from "./controls/ScrubNumberField";
import type { FieldApi } from "./fieldApi";
import { clampSpan, columnsOf, emptyColumnsByRow, isSpanWrapper, spanLabel, spanOf, spanOp, takesSpan, wrapForSpan, type CellSpan } from "./gridCellModel";
import { responsiveOps, responsiveRead, shownAt, type Breakpoint } from "./responsiveModel";
import { optimisticOf } from "./sizingModel";
import "./sizing.css";

/*
 * The Layout section's Grid cell group (docs/research/grid-span-2026-10-26.md §4), under Resizing when the selected layer
 * sits in a Grid: Column span (1 … the Grid's columns, or the whole row) and Row span, Figma Grid auto layout's column /
 * row span, and the whole row as a toggle. They edit the breakpoint the Screen shows (responsiveModel.ts writes its key).
 * A layer that takes no span is wrapped in a `<Box span>` on its first span (the Box is selected then); back to one
 * column and one row, such a bare Box unwraps again. The note under the fields says when a row of the Grid leaves
 * columns empty (gridCellModel.ts emptyColumnsByRow).
 */

type GridInfo = { columns: number | null; stacked: boolean; cells: Array<{ span: CellSpan; rowSpan: number }>; index: number };

/** The layout parent (display: contents wrappers skipped), when it is a Zen Grid: the group shows only then. */
export function gridOf(host: HTMLElement | null): HTMLElement | null {
  let parent = host?.parentElement ?? null;
  while (parent && getComputedStyle(parent).display === "contents") parent = parent.parentElement;
  return parent?.matches(".zen-grid") ? parent : null;
}

/** The Grid's columns as drawn and its cells' spans as the library rendered them (data-span, --zen-cell-span). */
function readGrid(host: HTMLElement | null): GridInfo | null {
  const grid = gridOf(host);
  if (!grid || !host) return null;
  const cells = Array.from(grid.children).filter((child): child is HTMLElement => child instanceof HTMLElement && getComputedStyle(child).display !== "none");
  const spanOfCell = (cell: HTMLElement): CellSpan => (cell.dataset.span === "full" ? "full" : cell.dataset.span === "true" ? spanOf(Number(cell.style.getPropertyValue("--zen-cell-span"))) : 1);
  const rowSpanOfCell = (cell: HTMLElement) => (cell.dataset.rowSpan === "true" ? Math.max(1, Number(cell.style.getPropertyValue("--zen-cell-row-span")) || 1) : 1);
  return {
    columns: grid.dataset.stacked === "true" ? 1 : columnsOf(getComputedStyle(grid).gridTemplateColumns, grid.dataset.mode),
    stacked: grid.dataset.stacked === "true",
    cells: cells.map((cell) => ({ span: spanOfCell(cell), rowSpan: rowSpanOfCell(cell) })),
    index: cells.findIndex((cell) => cell === host || cell.contains(host)),
  };
}

/** The Grid around `host`, read again when its attributes, children or size change (an edit, HMR, a resize). */
function useGridInfo(host: HTMLElement | null): GridInfo | null {
  const [info, setInfo] = useState(() => readGrid(host));
  useEffect(() => {
    const grid = gridOf(host);
    setInfo(readGrid(host));
    if (!grid) return undefined;
    const update = () => setInfo((current) => { const next = readGrid(host); return JSON.stringify(next) === JSON.stringify(current) ? current : next; });
    const mutations = new MutationObserver(update);
    mutations.observe(grid, { attributes: true, childList: true, subtree: false, attributeFilter: ["data-span", "data-row-span", "data-stacked", "data-mode", "style"] });
    for (const child of Array.from(grid.children)) mutations.observe(child, { attributes: true, attributeFilter: ["data-span", "data-row-span", "style"] });
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    resize?.observe(grid);
    return () => { mutations.disconnect(); resize?.disconnect(); };
  }, [host]);
  return info;
}

export function GridCellGroup({ api, component, attributes, host, elementChildren }: {
  api: FieldApi;
  component: string;
  /** The layer's attributes as written (span / rowSpan per breakpoint). */
  attributes: readonly SourceAttr[];
  /** The selection's rendered element. */
  host: HTMLElement | null;
  /** Elements written inside the layer (a bare span Box holds one). */
  elementChildren: number;
}) {
  const labelId = useId();
  const grid = useGridInfo(host);
  if (!grid || !host) return null;
  const editing: Breakpoint = breakpointOf(host);
  const primary: Breakpoint = primaryBreakpointOf(host);
  const own = takesSpan(component);
  const spanRead = responsiveRead(attributes, "span");
  const rowRead = responsiveRead(attributes, "rowSpan");
  const span = own ? spanOf(shownAt(spanRead, editing)) : 1;
  const rowSpan = own ? spanOf(shownAt(rowRead, editing)) : 1;
  const shownSpan = clampSpan(span, grid.columns);
  const perBreakpoint = spanRead.kind === "responsive" || rowRead.kind === "responsive";
  const where = editing === primary && !perBreakpoint ? "" : ` on ${BREAKPOINT_LABELS[editing]}`;
  const disabled = api.disabled || spanRead.kind === "code" || rowRead.kind === "code";
  const wrapper = isSpanWrapper(component, attributes, elementChildren);

  const write = (name: "span" | "rowSpan", next: CellSpan) => {
    // A bare span Box back to one column and one row everywhere: it goes, and its layer takes the cell again.
    const other = responsiveRead(attributes, name === "span" ? "rowSpan" : "span");
    const mine = responsiveRead(attributes, name);
    if (wrapper && next === 1 && other.kind === "unset" && mine.kind !== "responsive") {
      void api.apply([{ op: "unwrap" }], "Box span removed");
      return;
    }
    if (own) {
      const ops = responsiveOps([spanOp(name, next)], { component, attributes, breakpoint: editing, primary, defaults: { span: 1, rowSpan: 1 } });
      if (ops.length) void api.apply(ops, `${component} ${name === "span" ? "column span" : "row span"} ${spanLabel(next, grid.columns)}${where}`, optimisticOf(ops));
      return;
    }
    // No span of its own: a Box around it takes the cell (its value at the editing breakpoint, as the Box would write it).
    const planned = responsiveOps([spanOp(name, next)], { component: "Box", attributes: [], breakpoint: editing, primary, defaults: { span: 1, rowSpan: 1 } })[0];
    const wrap = wrapForSpan(name, next);
    if (!wrap || wrap.op !== "wrap" || planned?.op !== "setProp") return;
    void api.apply([{ ...wrap, props: { [name]: planned.value } }], `${component} in a Box that spans ${spanLabel(next, grid.columns)}${where}`);
  };
  const empty = grid.stacked ? [] : emptyColumnsByRow(grid.cells, grid.columns);
  const holes = empty.map((count, row) => ({ row, count })).filter((entry) => entry.count > 0);
  const note = grid.stacked
    ? "The Grid stacks into one column here: every cell takes the row."
    : grid.columns === null
      ? "This Grid fits its columns to the width: a cell can take the whole row only."
      : holes.length
        ? `Row ${holes[0].row + 1} leaves ${holes[0].count} of ${grid.columns} columns empty.`
        : null;

  return (
    <div className="studio-sizing" role="group" aria-labelledby={labelId} data-prop="span">
      <span id={labelId} className={`studio-sizing__label ${typographyStyles["Caption/Regular"]}`}>{`Grid cell${where}`}</span>
      <div className="studio-sizing__pair">
        <ScrubNumberField
          label={<Icon name="icon-columns-03-line" size="sm" decorative />}
          name="Column span"
          value={shownSpan === "full" ? null : shownSpan}
          placeholder={shownSpan === "full" ? "Full" : "1"}
          min={1}
          max={grid.columns ?? 1}
          disabled={disabled || grid.columns === null || grid.stacked}
          onCommit={(next) => write("span", clampSpan(next, grid.columns))}
        />
        <ScrubNumberField
          label={<Icon name="icon-rows-03-line" size="sm" decorative />}
          name="Row span"
          value={rowSpan === "full" ? 1 : rowSpan}
          min={1}
          max={12}
          disabled={disabled || grid.stacked}
          onCommit={(next) => write("rowSpan", Math.max(1, Math.round(next)))}
        />
        <span className="studio-sizing__slot">
          {/* zen-allow-secondary: the pressed state of a toggle (the whole row), as Sizing's Constrain proportions. */}
          <IconButton icon="icon-expand-01-line" aria-label="Take the whole row" aria-pressed={shownSpan === "full"} tooltip="Take the whole row"
            level={shownSpan === "full" ? "secondary" : "tertiary"} size="xs" disabled={disabled || grid.stacked} onClick={() => write("span", shownSpan === "full" ? 1 : "full")} />
        </span>
      </div>
      {note ? <p className={`studio-inspector__note ${typographyStyles["Caption/Regular"]}`}>{note}</p> : null}
    </div>
  );
}
