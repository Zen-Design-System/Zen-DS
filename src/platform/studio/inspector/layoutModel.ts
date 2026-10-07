/*
 * Pure model of the Layout section (spec docs/research/studio-inspector-redesign-2026-10-03.md, Phases 3, 4 and 6; plan
 * WP-D of docs/research/studio-builder-plan-2026-10-05.md): what the source writes → what the controls show, and each
 * gesture → the ops of ONE apply (one request, one draft change, one undo step). Writes stay minimal: a pick that equals
 * what already renders writes nothing, a default is reached by removing the prop. Type-only imports, so the node
 * selftest (layoutModel.selftest.mjs) imports it directly.
 */
import type { EditOp, EditValue } from "../types";

export type Literal = string | number | boolean;
/** The literal values the source writes; a prop it leaves out (or binds) is absent. */
export type Written = Readonly<Record<string, Literal | undefined>>;
/** A warning for a prop that does nothing where it is written, with its one-apply fix. */
export type LayoutWarning = { prop: string; text: string; fix: EditOp[] };

const editValue = (value: Literal): EditValue =>
  typeof value === "boolean" ? { kind: "boolean", value } : typeof value === "number" ? { kind: "number", value } : { kind: "string", value };
const set = (name: string, value: Literal): EditOp => ({ op: "setProp", name, value: editValue(value) });
const remove = (name: string): EditOp => ({ op: "removeProp", name });
const removeWritten = (w: Written, ...names: string[]) => names.filter((name) => w[name] !== undefined).map(remove);
/** `name` set to `value` unless the source already writes exactly that. */
const setIfNew = (w: Written, name: string, value: Literal) => (w[name] === value ? [] : [set(name, value)]);

/* ── Flow (Stack direction + wrap; FormFieldset direction) ─────────────────────────────────────────────────────── */

export type Flow = "vertical" | "horizontal" | "wrap";
const isRow = (direction: Literal | undefined) => direction === "row";

/** Vertical is the default (direction column), so it is reached by removing what the source writes. */
export function flowOf(w: Written): Flow {
  if (!isRow(w.direction)) return "vertical";
  return w.wrap === true ? "wrap" : "horizontal";
}

/** Vertical: direction and wrap removed. Horizontal: direction row, no wrap. Wrap: direction row + wrap. One apply. */
export function flowOps(w: Written, flow: Flow): EditOp[] {
  if (flow === "vertical") return removeWritten(w, "direction", "wrap");
  const direction = setIfNew(w, "direction", "row");
  if (flow === "horizontal") return [...direction, ...removeWritten(w, "wrap")];
  return [...direction, ...setIfNew(w, "wrap", true)];
}

/* ── Alignment (Stack align + justify; Figma's alignment box, Auto and the cross axis) ─────────────────────────── */

export const AXIS = ["start", "center", "end"] as const;
export type AxisValue = (typeof AXIS)[number];
const onAxis = (value: Literal | undefined): value is AxisValue => typeof value === "string" && (AXIS as readonly string[]).includes(value);
/** Justify values that space the items out (Figma's Auto): the gap becomes the minimum. */
const DISTRIBUTED = new Set(["between", "around", "evenly"]);

export type CrossMode = "position" | "stretch" | "baseline";
export type AlignView = {
  row: boolean;
  /** Auto: justify spaces the items (between, or around/evenly when the source has it). */
  auto: boolean;
  /** How the cross axis is set: a position (a cell / lane), stretched, or on the text baseline (rows). */
  cross: CrossMode;
  /** The cross axis as it renders when the source leaves align out: rows centre; columns stretch fields (buttons keep their width). */
  crossDefault: boolean;
  /** The cell as it renders: the written values, else the defaults (rows centre, columns start at the top). */
  align: AxisValue;
  justify: AxisValue;
  /** Nothing is written: the box shows the effective cell in the default tone. */
  unset: boolean;
};

export function alignView(w: Written): AlignView {
  const row = isRow(w.direction);
  const auto = typeof w.justify === "string" && DISTRIBUTED.has(w.justify);
  const cross: CrossMode = w.align === "stretch" ? "stretch" : w.align === "baseline" ? "baseline" : onAxis(w.align) ? "position" : row ? "position" : "stretch";
  return {
    row,
    auto,
    cross,
    crossDefault: w.align === undefined,
    align: onAxis(w.align) ? w.align : row ? "center" : "start",
    justify: onAxis(w.justify) ? w.justify : "start",
    unset: w.align === undefined && w.justify === undefined,
  };
}

/** A cell of the box: align and justify, each written only when it changes what renders. */
export function cellOps(w: Written, align: AxisValue, justify: AxisValue): EditOp[] {
  const view = alignView(w);
  const ops: EditOp[] = [];
  if (view.cross !== "position" || view.align !== align) ops.push(set("align", align));
  if (view.auto || view.justify !== justify) ops.push(set("justify", justify));
  return ops;
}

/** A cross-axis lane (Auto keeps the spacing): align only. */
export function laneAlignOps(w: Written, align: AxisValue): EditOp[] {
  const view = alignView(w);
  return view.cross === "position" && view.align === align ? [] : [set("align", align)];
}

/** A main-axis lane (the cross axis stretches or sits on the baseline): justify only. */
export function laneJustifyOps(w: Written, justify: AxisValue): EditOp[] {
  const view = alignView(w);
  return !view.auto && view.justify === justify ? [] : [set("justify", justify)];
}

/** X: Auto on (justify between) or off (justify removed: items pack at the start). */
export function autoOps(w: Written): EditOp[] {
  return alignView(w).auto ? [remove("justify")] : [set("justify", "between")];
}

/** The cross-axis control: Position goes back to a cell (rows: centre, the default; columns: start), Stretch, Text baseline. */
export function crossOps(w: Written, mode: CrossMode): EditOp[] {
  const view = alignView(w);
  if (mode === "position") {
    if (view.cross === "position" && !(view.crossDefault && !view.row)) return [];
    return view.row ? removeWritten(w, "align") : [set("align", "start")];
  }
  return setIfNew(w, "align", mode);
}

/** B: Text baseline on (rows) or back to the default. */
export const baselineOps = (w: Written): EditOp[] => (w.align === "baseline" ? [remove("align")] : [set("align", "baseline")]);

/** Reset alignment: align and justify removed in one apply. */
export const alignResetOps = (w: Written): EditOp[] => removeWritten(w, "align", "justify");

/** A gap pick: in Auto it leaves Auto (Figma: a number replaces Auto), else only the gap. */
export function gapOps(w: Written, key: string): EditOp[] {
  const auto = alignView(w).auto;
  return [...setIfNew(w, "gap", key), ...(auto ? [remove("justify")] : [])];
}

/** The gap list's Auto: justify between, the gap kept as the minimum. */
export const gapAutoOps = (w: Written): EditOp[] => (alignView(w).auto ? [] : [set("justify", "between")]);

/* ── Padding (Stack, Box: uniform or per axis) ─────────────────────────────────────────────────────────────────── */

/** Uniform while the source writes neither paddingX nor paddingY. */
export const paddingAxial = (w: Written) => w.paddingX !== undefined || w.paddingY !== undefined;

/** The uniform field: padding, or the axes when both are written equal; null when they differ (Mixed). */
export function uniformPadding(w: Written): string | null | undefined {
  if (!paddingAxial(w)) return typeof w.padding === "string" ? w.padding : undefined;
  const x = w.paddingX ?? w.padding;
  const y = w.paddingY ?? w.padding;
  return x === y && typeof x === "string" ? x : null;
}

/** All sides: padding written, paddingX and paddingY removed (one apply, as the canvas's Alt+click). */
export function uniformPaddingOps(w: Written, key: string): EditOp[] {
  return [...setIfNew(w, "padding", key), ...removeWritten(w, "paddingX", "paddingY")];
}

/* ── Gap (Grid: one gap, or row and column gaps) ───────────────────────────────────────────────────────────────── */

export const gapsSplit = (w: Written) => w.rowGap !== undefined || w.columnGap !== undefined;

/** The values "Use one gap" can keep: the column gap, the row gap, the gap (each once, in that order). */
export function relinkChoices(w: Written): string[] {
  return [...new Set([w.columnGap, w.rowGap, w.gap].filter((value): value is string => typeof value === "string"))];
}

/** One gap again: gap written, rowGap and columnGap removed. */
export function relinkOps(w: Written, key: string): EditOp[] {
  return [...setIfNew(w, "gap", key), ...removeWritten(w, "rowGap", "columnGap")];
}

/* ── Columns (Grid) ────────────────────────────────────────────────────────────────────────────────────────────── */

export type ColumnsMode = "auto-fit" | "count" | "tracks";
export const BREAKPOINTS = ["mobile", "tablet", "desktop"] as const;
export type BreakpointKey = (typeof BREAKPOINTS)[number];
/** What `columns` holds: a value (number or track string), per breakpoint, or code the inspector cannot read. */
export type ColumnsValue =
  | { kind: "unset" }
  | { kind: "value"; value: number | string }
  | { kind: "responsive"; values: Partial<Record<BreakpointKey, number | string>> }
  | { kind: "code" };

export const columnsModeOf = (value: number | string | undefined): ColumnsMode => (value === undefined ? "auto-fit" : typeof value === "number" ? "count" : "tracks");

/** The key Grid reads at `breakpoint` (Layout.tsx: the breakpoint's own, then the nearest written), else undefined. */
export function columnsAt(values: Partial<Record<BreakpointKey, number | string>>, breakpoint: BreakpointKey): BreakpointKey | undefined {
  const order: Record<BreakpointKey, BreakpointKey[]> = { desktop: ["desktop", "tablet", "mobile"], tablet: ["tablet", "desktop", "mobile"], mobile: ["mobile", "tablet", "desktop"] };
  return order[breakpoint].find((key) => values[key] !== undefined);
}

/** "2fr 1fr" ↔ count: equal fr tracks for a count, the track count of a list (null when it cannot be split simply). */
export const tracksFor = (count: number) => Array.from({ length: Math.max(1, count) }, () => "1fr").join(" ");
export function countOf(tracks: string): number | null {
  const parts = tracks.trim().split(/\s+(?![^(]*\))/).filter(Boolean);
  return parts.length && !/repeat\(/.test(tracks) ? parts.length : null;
}

/** A mode change of a plain value: Auto-fit removes columns; Count and Tracks convert the current value. */
export function columnsModeOps(current: number | string | undefined, mode: ColumnsMode, rendered: number): EditOp[] {
  if (mode === columnsModeOf(current)) return [];
  if (mode === "auto-fit") return [remove("columns")];
  const count = typeof current === "string" ? countOf(current) ?? rendered : typeof current === "number" ? current : rendered;
  return mode === "count" ? [set("columns", Math.min(12, Math.max(1, count)))] : [set("columns", tracksFor(count))];
}

/** One breakpoint's value of a responsive `columns`: setField of that key (the other keys keep their source text). */
export function columnsFieldOp(key: BreakpointKey, value: number | string): EditOp {
  return { op: "setField", name: "columns", key, value: editValue(value) };
}

/* ── Warnings: written props that do nothing here ──────────────────────────────────────────────────────────────── */

export function layoutWarnings(component: string, w: Written): LayoutWarning[] {
  const out: LayoutWarning[] = [];
  if (component === "Stack" && w.wrap === true && !isRow(w.direction)) out.push({ prop: "wrap", text: "Wrap does nothing in a vertical stack.", fix: [remove("wrap")] });
  if (component === "Stack" && w.align === "baseline" && !isRow(w.direction)) out.push({ prop: "align", text: "Text baseline only applies to rows.", fix: [remove("align")] });
  if (component === "Grid" && w.minColumnWidth !== undefined && w.columns !== undefined) out.push({ prop: "minColumnWidth", text: "Min column width is ignored while Columns is set.", fix: [remove("minColumnWidth")] });
  if (component === "Grid" && w.gap !== undefined && w.rowGap !== undefined && w.columnGap !== undefined) out.push({ prop: "gap", text: "Gap is ignored: row and column gaps are both set.", fix: [remove("gap")] });
  if (component === "FormActions" && w.inset !== undefined && w.sticky !== true) out.push({ prop: "inset", text: "Side inset only applies when pinned.", fix: [remove("inset")] });
  return out;
}
