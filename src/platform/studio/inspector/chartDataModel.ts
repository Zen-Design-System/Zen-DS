import type { AttrShape, EditOp, EditValue, ObjectShape, ShapeField, SourceAttr } from "../types";

/*
 * A chart's data as the Inspector's Data section edits it (ChartDataSection.tsx; user 2026-10-28: "Chart cũng tương tự.
 * cho phép thêm bớt sector, nhập số cho từng sector để xem chart", scope approved 2026-10-30: every chart with data, a
 * sector's label and number, colours from the palette in order). One row per sector (a slice, a period, a stage, a
 * goal, a heatmap row), one column per number it holds (its value, a series, the comparison line, a heatmap column), and
 * for charts whose columns are a list (series, a line's comparison, heatmap columns) that list with add, rename and remove.
 *
 * Reads the attributes as the source wrote them (literals in place, or a same-file const's literal: edits only). Every
 * intent is ONE apply (one draft change, one undo step): a label or a number is op setField on the item (the layout
 * stays as written); adding or removing a row, a series or a column rewrites the props it touches as one literal each
 * (op setProp, in the list's own layout: one line, or one item per line at the written indent), fields the table does
 * not show (an id, a colour, a forecast flag, a target, code) kept as written.
 *
 * Pure: no DOM, no React, type-only imports and erasable TypeScript, so `node chartDataModel.selftest.mjs` imports it.
 */

export type ChartDataKind = "points" | "slices" | "bullets" | "series" | "combo" | "line" | "heatmap";

/** A cell: its literal, null when unset (an empty field), or `bound` code the table shows but never writes. */
export type ChartCell = { value: number | boolean | null; bound?: string };
export type ChartColumn = {
  /** The item's field ("value", "target", "projected", "bar", "line"), a series id, "compare", or a heatmap column's place. */
  key: string;
  label: string;
  /** `flag`: a yes/no field (BarChart `projected`, drawn hatched). */
  kind: "number" | "flag";
  /** A field an item may leave out (BarChart `target`): clearing the cell removes it. */
  optional?: boolean;
};
export type ChartRow = { label: string | null; labelBound?: string; cells: ChartCell[] };
/** Columns the person adds, renames and removes: series, a heatmap's columns, a line and its comparison. */
export type ChartList = {
  title: "Series" | "Columns" | "Lines";
  /** What one entry is called ("Series", "Column", "Line"). */
  item: string;
  entries: Array<{ label: string | null; removable: boolean; colour: number | null }>;
  addable: boolean;
};

type Layout = { item: string; close: string } | null;
type Source = {
  items: ObjectShape[];
  layout: Layout;
  series?: { items: ObjectShape[]; layout: Layout; ids: string[] };
  compare?: { object: ObjectShape; values: Array<number | null> | null } | null;
  heatmap?: { rows: string[]; columns: string[]; values: number[][]; layouts: { rows: Layout; columns: Layout; values: Layout } };
};

export type ChartTable = {
  component: string;
  kind: ChartDataKind;
  /** What one row is: "Slice", "Period", "Stage", "Item", "Ring", "Goal", "Bar", "Row". */
  row: string;
  rows: ChartRow[];
  columns: ChartColumn[];
  list: ChartList | null;
  /** Each row draws in its own palette colour (Donut slices, Radial rings): the row's place. */
  rowColours: boolean;
  /** Rows, series and columns can be added and removed: the data is written in place (a const's literal edits only). */
  structural: boolean;
  /** The const the data is written in (`revenue`, line 12), when not in place. */
  via?: { name: string; line: number };
  /** Counts past what the chart or Figma draws (they warn, never block). */
  notes: string[];
  source: Source;
};

type Spec = { kind: ChartDataKind; row: string; advised?: number; note?: string; series?: number; seriesNote?: string };

/* The advised counts follow the usage harness (tools/usage-guard/check-usage.mjs chart/*) and the Figma sets (Sector
 * 4 · 6 · 7 · 12 periods, tools/studio/figma-charts.mjs; seven Color Chart Sector styles). */
const PERIODS = "Figma draws 12 periods";
const SPECS: Readonly<Record<string, Spec>> = {
  LineChart: { kind: "line", row: "Period", advised: 12, note: PERIODS },
  BarChart: { kind: "points", row: "Bar", advised: 12, note: "Figma draws 12 bars" },
  FunnelChart: { kind: "points", row: "Stage", advised: 6, note: "a funnel shows 3–6 stages" },
  BarList: { kind: "points", row: "Item", advised: 8, note: "a bar list ranks 3–8 items" },
  DonutChart: { kind: "slices", row: "Slice", advised: 7, note: "the palette has 7 colours" },
  RadialChart: { kind: "slices", row: "Ring", advised: 7, note: "the palette has 7 colours" },
  BulletChart: { kind: "bullets", row: "Goal", advised: 4, note: "a bullet chart shows 1–4 goals" },
  StackBarChart: { kind: "series", row: "Period", advised: 12, note: PERIODS, series: 7, seriesNote: "the palette has 7 colours" },
  AreaChart: { kind: "series", row: "Period", advised: 12, note: PERIODS, series: 4, seriesNote: "a stacked area reads 2–4 parts" },
  GroupedBarChart: { kind: "series", row: "Period", advised: 12, note: PERIODS, series: 3, seriesNote: "grouped bars compare 2–3 series" },
  ComboChart: { kind: "combo", row: "Period", advised: 12, note: PERIODS },
  HeatmapChart: { kind: "heatmap", row: "Row" },
};

/** The props the Data section edits for a chart (left out of Properties when it reads them); none for other components. */
export function chartDataProps(component: string): readonly string[] {
  const kind = SPECS[component]?.kind;
  if (!kind) return [];
  if (kind === "line") return ["data", "compare"];
  if (kind === "series") return ["data", "series"];
  if (kind === "heatmap") return ["rows", "columns", "values"];
  return ["data"];
}

/** The chart's other props the table reads (column names, which columns show): literals as written, else undefined. */
export type ChartOwner = Readonly<Record<string, unknown>>;

const lastAttr = (attributes: readonly SourceAttr[], name: string) => attributes.filter((attr) => attr.name === name && attr.kind !== "spread").at(-1);
/** The index of the last field named `key` (a key written twice: the last one counts, as in JS), -1 for none. */
function lastAt(fields: readonly ShapeField[], key: string): number {
  for (let index = fields.length - 1; index >= 0; index -= 1) if (fields[index].key === key) return index;
  return -1;
}
const fieldOf = (object: ObjectShape, key: string): ShapeField | undefined => object.fields[lastAt(object.fields, key)];
const text = (field: ShapeField | undefined) => (field?.kind === "string" ? field.value : null);

function cellOf(field: ShapeField | undefined, kind: ChartColumn["kind"] = "number"): ChartCell {
  if (!field) return { value: kind === "flag" ? false : null };
  if (kind === "flag" && field.kind === "boolean") return { value: field.value };
  if (kind === "number" && field.kind === "number") return { value: field.value };
  return { value: null, bound: String(field.value) };
}

/** The list's layout as written: one line, or one item per line at its indent (the closing bracket's indent after). */
function layoutOf(code: string | undefined): Layout {
  if (!code || !code.includes("\n")) return null;
  const lines = code.split("\n");
  const first = lines.slice(1).find((line) => line.trim() && !/^\s*[\]}]/.test(line));
  return { item: /^\s*/.exec(first ?? "  ")![0], close: /^\s*/.exec(lines.at(-1) ?? "")![0] };
}

function listCode(items: readonly string[], layout: Layout): string {
  if (!layout || !items.length) return `[${items.join(", ")}]`;
  return `[\n${items.map((item) => `${layout.item}${item},`).join("\n")}\n${layout.close}]`;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const keyCode = (key: string) => (IDENTIFIER.test(key) ? key : JSON.stringify(key));
function valueCode(field: ShapeField): string {
  if (field.kind === "string") return JSON.stringify(field.value);
  if (field.kind === "number") return Object.is(field.value, -0) ? "0" : String(field.value);
  if (field.kind === "boolean") return String(field.value);
  return field.value;
}
function objectCode(fields: readonly ShapeField[]): string {
  if (!fields.length) return "{}";
  return `{ ${fields.map((field) => (field.kind === "spread" ? `...${field.value}` : `${keyCode(field.key)}: ${valueCode(field)}`)).join(", ")} }`;
}
/** A field set to a literal (or removed with null), in place when written, else appended. */
function withField(fields: readonly ShapeField[], key: string, value: string | number | boolean | null): ShapeField[] {
  const next: ShapeField = typeof value === "string" ? { key, kind: "string", value } : typeof value === "number" ? { key, kind: "number", value } : { key, kind: "boolean", value: value as boolean };
  const at = lastAt(fields, key);
  if (value === null) return fields.filter((field) => field.key !== key);
  return at < 0 ? [...fields, next] : fields.map((field, index) => (index === at ? next : field));
}
/** A series item's `values` object rebuilt (its fields as written) by `change`. */
function withValues(item: ObjectShape, change: (fields: ShapeField[]) => ShapeField[]): ShapeField[] {
  const written = fieldOf(item, "values");
  const inner = written?.kind === "expression" && written.shape?.type === "object" ? written.shape.fields : [];
  const values: ShapeField = { key: "values", kind: "expression", value: objectCode(change([...inner])) };
  return written ? item.fields.map((field) => (field === written ? values : field)) : [...item.fields, values];
}

const numberItems = (shape: AttrShape | undefined): Array<number | null> | null =>
  shape?.type === "array" ? shape.items.map((item) => (item.type === "value" && item.kind === "number" ? Number(item.value) : null)) : null;
const stringItems = (shape: AttrShape | undefined): string[] | null => {
  if (shape?.type !== "array") return null;
  const out = shape.items.map((item) => (item.type === "value" && item.kind === "string" ? String(item.value) : null));
  return out.every((item): item is string => item !== null) ? out : null;
};
const NUMBER = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i;
/** A heatmap row written as `[38, 41, 40]`: its numbers, null when anything else is in it. */
function numberRow(code: string): number[] | null {
  const body = /^\[([\s\S]*)\]$/.exec(code.trim())?.[1];
  if (body === undefined) return null;
  const parts = body.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.every((part) => NUMBER.test(part)) ? parts.map(Number) : null;
}

/** "13 periods", "4 series". */
const plural = (count: number, word: string) => `${count} ${word.toLowerCase()}${count === 1 || word === "Series" ? "" : "s"}`;

/** The table of the chart's data, or null when its data is not literals the Studio can read (it stays as written). */
export function readChartTable(component: string, attributes: readonly SourceAttr[], owner: ChartOwner = {}): ChartTable | null {
  const spec = SPECS[component];
  if (!spec) return null;
  if (spec.kind === "heatmap") return readHeatmap(component, spec, attributes);
  const data = lastAttr(attributes, "data");
  if (data?.kind !== "expression" || data.shape?.type !== "array" || !data.shape.items.every((item) => item.type === "object")) return null;
  const items = data.shape.items as ObjectShape[];
  const via = data.shapeVia;
  const source: Source = { items, layout: layoutOf(data.value) };
  const labelOf = (item: ObjectShape) => {
    const field = fieldOf(item, "label");
    return field?.kind === "string" ? { label: field.value } : { label: null, labelBound: field ? String(field.value) : "" };
  };
  let columns: ChartColumn[] = [];
  let list: ChartList | null = null;
  const notes: string[] = [];

  if (spec.kind === "series") {
    const series = lastAttr(attributes, "series");
    if (series?.kind !== "expression" || series.shape?.type !== "array" || !series.shape.items.every((item) => item.type === "object")) return null;
    const entries = series.shape.items as ObjectShape[];
    const ids = entries.map((entry) => text(fieldOf(entry, "id")));
    if (!ids.every((id): id is string => Boolean(id))) return null;
    source.series = { items: entries, layout: layoutOf(series.value), ids };
    columns = entries.map((entry, index) => ({ key: ids[index], label: text(fieldOf(entry, "label")) ?? ids[index], kind: "number" }));
    list = { title: "Series", item: "Series", entries: entries.map((entry, index) => ({ label: text(fieldOf(entry, "label")), removable: entries.length > 1, colour: index })), addable: !via && !series.shapeVia };
    if (spec.series && entries.length > spec.series) notes.push(`${plural(entries.length, "Series")}: ${spec.seriesNote}`);
  } else if (spec.kind === "line") {
    columns = [{ key: "value", label: typeof owner.label === "string" && owner.label ? owner.label : "Value", kind: "number" }];
    const compare = lastAttr(attributes, "compare");
    const entries: ChartList["entries"] = [{ label: typeof owner.label === "string" ? owner.label : null, removable: false, colour: null }];
    if (compare?.kind === "expression" && compare.shape?.type === "object") {
      const values = fieldOf(compare.shape, "values");
      source.compare = { object: compare.shape, values: values?.kind === "expression" ? numberItems(values.shape) : null };
      const label = text(fieldOf(compare.shape, "label"));
      columns.push({ key: "compare", label: label ?? "Compare", kind: "number" });
      entries.push({ label, removable: true, colour: null });
    } else if (compare) return null;
    else source.compare = null;
    list = { title: "Lines", item: "Line", entries, addable: !compare && !via };
  } else if (spec.kind === "combo") {
    columns = [
      { key: "bar", label: typeof owner.barLabel === "string" && owner.barLabel ? owner.barLabel : "Bar", kind: "number" },
      { key: "line", label: typeof owner.lineLabel === "string" && owner.lineLabel ? owner.lineLabel : "Line", kind: "number" },
    ];
  } else if (spec.kind === "bullets") {
    columns = [{ key: "value", label: "Value", kind: "number" }, { key: "target", label: "Target", kind: "number" }];
  } else {
    columns = [{ key: "value", label: "Value", kind: "number" }];
    if (component === "BarChart") {
      // A target is the horizontal bars' track (Figma Bar-Chart Horizontal); a forecast the vertical bars' hatch.
      if (owner.orientation === "horizontal" || items.some((item) => fieldOf(item, "target"))) columns.push({ key: "target", label: "Target", kind: "number", optional: true });
      if (owner.orientation !== "horizontal") columns.push({ key: "projected", label: "Forecast", kind: "flag", optional: true });
    }
  }

  const rows: ChartRow[] = items.map((item, index) => {
    const label = labelOf(item);
    const cells = columns.map((column): ChartCell => {
      if (spec.kind === "series") {
        const values = fieldOf(item, "values");
        if (values?.kind !== "expression" || values.shape?.type !== "object") return { value: null, bound: values ? String(values.value) : "" };
        return cellOf(fieldOf(values.shape, column.key));
      }
      if (column.key === "compare") {
        const value = source.compare?.values?.[index];
        return value === undefined || value === null ? { value: null, bound: source.compare?.values ? "" : "code" } : { value };
      }
      return cellOf(fieldOf(item, column.key), column.kind);
    });
    return { ...label, cells };
  });
  if (spec.advised && rows.length > spec.advised) notes.push(`${plural(rows.length, spec.row)}: ${spec.note}`);
  return { component, kind: spec.kind, row: spec.row, rows, columns, list, rowColours: spec.kind === "slices", structural: !via, ...(via ? { via } : {}), notes, source };
}

function readHeatmap(component: string, spec: Spec, attributes: readonly SourceAttr[]): ChartTable | null {
  const [rowsAttr, columnsAttr, valuesAttr] = ["rows", "columns", "values"].map((name) => lastAttr(attributes, name));
  if ([rowsAttr, columnsAttr, valuesAttr].some((attr) => attr?.kind !== "expression" || !attr.shape || attr.shapeVia)) return null;
  const rows = stringItems(rowsAttr!.shape);
  const columns = stringItems(columnsAttr!.shape);
  const shape = valuesAttr!.shape;
  if (!rows || !columns || shape?.type !== "array") return null;
  const values = shape.items.map((item) => (item.type === "value" && item.kind === "expression" ? numberRow(String(item.value)) : null));
  if (!values.every((row): row is number[] => row !== null) || values.length !== rows.length || values.some((row) => row.length !== columns.length)) return null;
  return {
    component, kind: "heatmap", row: spec.row, rowColours: false, structural: true, notes: [],
    rows: rows.map((label, index) => ({ label, cells: values[index].map((value) => ({ value })) })),
    columns: columns.map((label, index) => ({ key: String(index), label, kind: "number" })),
    list: { title: "Columns", item: "Column", entries: columns.map((label) => ({ label, removable: columns.length > 1, colour: null })), addable: true },
    source: { items: [], layout: null, heatmap: { rows, columns, values, layouts: { rows: layoutOf(rowsAttr!.value), columns: layoutOf(columnsAttr!.value), values: layoutOf(valuesAttr!.value) } } },
  };
}

/* ── names for what is added ─────────────────────────────────────────────────────────────────────────────────────── */

const SEQUENCES: ReadonlyArray<readonly string[]> = [
  ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  ["Q1", "Q2", "Q3", "Q4"],
];

/**
 * The label after the last one: the next month, weekday or quarter (a year after it kept: "Dec 2026" → "Jan 2026" is
 * not guessed, the year stays), the next number ("Week 3" → "Week 4", "2025" → "2026"), else "<Word> <n>"; never one
 * the list has.
 */
export function nextLabel(labels: ReadonlyArray<string | null>, word: string): string {
  const taken = new Set(labels.filter((label): label is string => typeof label === "string"));
  const last = [...labels].reverse().find((label): label is string => typeof label === "string" && label.trim() !== "")?.trim();
  let next: string | null = null;
  if (last) {
    for (const sequence of SEQUENCES) {
      const match = /^(\S+)(\s.*)?$/.exec(last);
      const at = match ? sequence.indexOf(match[1]) : -1;
      if (at >= 0) { next = `${sequence[(at + 1) % sequence.length]}${match![2] ?? ""}`; break; }
    }
    const number = next === null ? /^(.*?)(\d+)$/.exec(last) : null;
    if (number) next = `${number[1]}${Number(number[2]) + 1}`;
  }
  let candidate = next ?? `${word} ${labels.length + 1}`;
  for (let bump = labels.length + 2; taken.has(candidate); bump += 1) candidate = `${word} ${bump}`;
  return candidate;
}

/**
 * An id for a new slice or series from its label, apart from the ids written: a slice's in words ("Other clients" →
 * "other-clients"), a series' as a key its rows' `values` write bare (`key`: "Series 3" → "series3").
 */
export function freshId(label: string, taken: ReadonlyArray<string | null>, word: string, key = false): string {
  const words = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\u0111/g, "d").split(/[^a-z0-9]+/).filter(Boolean);
  const joined = key ? words.map((part, index) => (index ? part[0].toUpperCase() + part.slice(1) : part)).join("") : words.join("-");
  const base = joined && !(key && /^\d/.test(joined)) ? joined : word.toLowerCase();
  const used = new Set(taken.filter(Boolean));
  let id = base;
  for (let n = 2; used.has(id); n += 1) id = key ? `${base}${n}` : `${base}-${n}`;
  return id;
}

/* ── edits ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type ChartEdit = { ops: EditOp[]; label: string };

const literalValue = (value: string | number | boolean): EditValue =>
  typeof value === "string" ? { kind: "string", value } : typeof value === "number" ? { kind: "number", value } : { kind: "boolean", value };
const expression = (code: string): EditValue => ({ kind: "expression", code });
const rowName = (table: ChartTable, row: number) => table.rows[row]?.label ?? `${table.row} ${row + 1}`;
const show = (value: number | boolean | string | null) => (value === null ? "empty" : typeof value === "string" ? `"${value}"` : String(value));

/** The data list rewritten from item fields. */
const dataProp = (table: ChartTable, items: ReadonlyArray<readonly ShapeField[]>): EditOp => ({ op: "setProp", name: "data", value: expression(listCode(items.map(objectCode), table.source.layout)) });
const fieldsOf = (table: ChartTable) => table.source.items.map((item) => item.fields);

/** A row's label. */
export function setRowLabel(table: ChartTable, row: number, label: string): ChartEdit | null {
  if (!table.rows[row]) return null;
  const name = `${table.component} › ${rowName(table, row)} › Label → ${show(label)}`;
  const heat = table.source.heatmap;
  if (heat) {
    const rows = heat.rows.map((written, index) => (index === row ? label : written));
    return { ops: [{ op: "setProp", name: "rows", value: expression(listCode(rows.map((item) => JSON.stringify(item)), heat.layouts.rows)) }], label: name };
  }
  return { ops: [{ op: "setField", name: "data", index: row, key: "label", value: literalValue(label) }], label: name };
}

/** A cell's number (or a forecast flag); null clears an optional field (a target), a flag off removes it. */
export function setCell(table: ChartTable, row: number, column: number, value: number | boolean | null): ChartEdit | null {
  const col = table.columns[column];
  if (!table.rows[row] || !col) return null;
  if (value === null && !col.optional) return null;
  const label = `${table.component} › ${rowName(table, row)} › ${col.label} → ${show(value)}`;
  const heat = table.source.heatmap;
  if (heat) {
    if (typeof value !== "number") return null;
    const values = heat.values.map((cells, r) => (r === row ? cells.map((cell, c) => (c === column ? value : cell)) : cells));
    return { ops: [{ op: "setProp", name: "values", value: expression(listCode(values.map((cells) => `[${cells.join(", ")}]`), heat.layouts.values)) }], label };
  }
  if (table.kind === "series") {
    return { ops: [{ op: "setField", name: "data", index: row, path: [{ key: "values" }], key: col.key, value: value === null ? null : literalValue(value) }], label };
  }
  if (col.key === "compare") {
    const values = table.source.compare?.values;
    if (!values || typeof value !== "number") return null;
    const next = table.rows.map((_, index) => (index === row ? value : values[index] ?? 0));
    return { ops: [{ op: "setField", name: "compare", key: "values", value: expression(`[${next.join(", ")}]`) }], label };
  }
  // A forecast flag off is left out (`projected: false` reads as noise), as an optional switch elsewhere.
  const written = col.kind === "flag" && value === false ? null : value;
  return { ops: [{ op: "setField", name: "data", index: row, key: col.key, value: written === null ? null : literalValue(written) }], label };
}

/**
 * A row after the last one: a copy of it (its numbers, a forecast flag, a target: the chart keeps its shape) under the
 * next label, a slice with a fresh id and without the last one's own colour; the line's comparison takes the same value
 * again. An empty chart gets its first row at 0.
 */
export function addRow(table: ChartTable): ChartEdit | null {
  if (!table.structural) return null;
  const label = nextLabel(table.rows.map((row) => row.label), table.row);
  const name = `${table.component} › Add ${table.row.toLowerCase()} ${label}`;
  const heat = table.source.heatmap;
  if (heat) {
    const rows = [...heat.rows, label];
    const values = [...heat.values, [...(heat.values.at(-1) ?? heat.columns.map(() => 0))]];
    return { ops: [
      { op: "setProp", name: "rows", value: expression(listCode(rows.map((item) => JSON.stringify(item)), heat.layouts.rows)) },
      { op: "setProp", name: "values", value: expression(listCode(values.map((cells) => `[${cells.join(", ")}]`), heat.layouts.values)) },
    ], label: name };
  }
  const last = table.source.items.at(-1);
  let fields: ShapeField[] = last ? last.fields.filter((field) => field.key !== "color") : [];
  if (!last) {
    if (table.kind === "series") fields = [{ key: "values", kind: "expression", value: objectCode((table.source.series?.ids ?? []).map((id) => ({ key: id, kind: "number", value: 0 }))) }];
    else for (const column of table.columns) if (column.kind === "number" && !column.optional && column.key !== "compare") fields.push({ key: column.key, kind: "number", value: 0 });
  }
  if (table.kind === "slices") {
    // A slice's id names it among the others (React keys, the legend): `{ id, label, value }` as the palette writes it.
    const ids = table.source.items.map((item) => text(fieldOf(item, "id")));
    fields = [{ key: "id", kind: "string", value: freshId(label, ids, table.row) }, { key: "label", kind: "string", value: label }, ...fields.filter((field) => field.key !== "id" && field.key !== "label")];
  } else fields = withField(fields, "label", label);
  const ops: EditOp[] = [dataProp(table, [...fieldsOf(table), fields])];
  const compare = table.source.compare;
  if (compare?.values) ops.push({ op: "setField", name: "compare", key: "values", value: expression(`[${[...compare.values.map((value) => value ?? 0), compare.values.at(-1) ?? 0].join(", ")}]`) });
  return { ops, label: name };
}

/** A row out (the last one stays: a chart keeps one). */
export function removeRow(table: ChartTable, row: number): ChartEdit | null {
  if (!table.structural || !table.rows[row] || table.rows.length < 2) return null;
  const name = `${table.component} › Remove ${table.row.toLowerCase()} ${rowName(table, row)}`;
  const heat = table.source.heatmap;
  if (heat) {
    return { ops: [
      { op: "setProp", name: "rows", value: expression(listCode(heat.rows.filter((_, index) => index !== row).map((item) => JSON.stringify(item)), heat.layouts.rows)) },
      { op: "setProp", name: "values", value: expression(listCode(heat.values.filter((_, index) => index !== row).map((cells) => `[${cells.join(", ")}]`), heat.layouts.values)) },
    ], label: name };
  }
  const ops: EditOp[] = [dataProp(table, fieldsOf(table).filter((_, index) => index !== row))];
  const compare = table.source.compare;
  if (compare?.values) ops.push({ op: "setField", name: "compare", key: "values", value: expression(`[${compare.values.filter((_, index) => index !== row).map((value) => value ?? 0).join(", ")}]`) });
  return { ops, label: name };
}

/** A list entry's name: a series' label, a heatmap column, the line's `label` or its comparison's. */
export function setEntryLabel(table: ChartTable, entry: number, label: string): ChartEdit | null {
  if (!table.list?.entries[entry]) return null;
  const name = `${table.component} › ${table.list.item} ${entry + 1} › Label → ${show(label)}`;
  const heat = table.source.heatmap;
  if (heat) {
    const columns = heat.columns.map((written, index) => (index === entry ? label : written));
    return { ops: [{ op: "setProp", name: "columns", value: expression(listCode(columns.map((item) => JSON.stringify(item)), heat.layouts.columns)) }], label: name };
  }
  if (table.kind === "line") return { ops: [entry === 0 ? { op: "setProp", name: "label", value: literalValue(label) } : { op: "setField", name: "compare", key: "label", value: literalValue(label) }], label: name };
  return { ops: [{ op: "setField", name: "series", index: entry, key: "label", value: literalValue(label) }], label: name };
}

/**
 * A series, a heatmap column or the line's comparison after the last: named in turn, each row's number copied from the
 * last column (the chart keeps its shape until the numbers are typed).
 */
export function addEntry(table: ChartTable): ChartEdit | null {
  if (!table.list?.addable) return null;
  const heat = table.source.heatmap;
  if (heat) {
    const label = nextLabel(heat.columns, "Column");
    return { ops: [
      { op: "setProp", name: "columns", value: expression(listCode([...heat.columns, label].map((item) => JSON.stringify(item)), heat.layouts.columns)) },
      { op: "setProp", name: "values", value: expression(listCode(heat.values.map((cells) => `[${[...cells, cells.at(-1) ?? 0].join(", ")}]`), heat.layouts.values)) },
    ], label: `${table.component} › Add column ${label}` };
  }
  if (table.kind === "line") {
    const values = table.rows.map((row) => (typeof row.cells[0]?.value === "number" ? row.cells[0].value : 0));
    return { ops: [{ op: "setProp", name: "compare", value: expression(`{ label: "Compare", values: [${values.join(", ")}] }`) }], label: `${table.component} › Add the comparison line` };
  }
  const series = table.source.series;
  if (!series || !table.structural) return null;
  const label = nextLabel(series.items.map((item) => text(fieldOf(item, "label"))), "Series");
  const id = freshId(label, series.ids, "series", true);
  const from = series.ids.at(-1);
  const items = [...series.items.map((item) => objectCode(item.fields)), objectCode([{ key: "id", kind: "string", value: id }, { key: "label", kind: "string", value: label }])];
  const data = table.source.items.map((item) => withValues(item, (fields) => {
    const copy = from === undefined ? undefined : fields[lastAt(fields, from)];
    return [...fields, { key: id, kind: "number", value: copy?.kind === "number" ? copy.value : 0 }];
  }));
  return { ops: [{ op: "setProp", name: "series", value: expression(listCode(items, series.layout)) }, dataProp(table, data)], label: `${table.component} › Add series ${label}` };
}

/** A series, a heatmap column or the comparison line out, with its numbers in every row (one entry stays). */
export function removeEntry(table: ChartTable, entry: number): ChartEdit | null {
  const item = table.list?.entries[entry];
  if (!item?.removable) return null;
  const named = `${table.list!.item.toLowerCase()} ${item.label ?? entry + 1}`;
  const heat = table.source.heatmap;
  if (heat) {
    return { ops: [
      { op: "setProp", name: "columns", value: expression(listCode(heat.columns.filter((_, index) => index !== entry).map((label) => JSON.stringify(label)), heat.layouts.columns)) },
      { op: "setProp", name: "values", value: expression(listCode(heat.values.map((cells) => `[${cells.filter((_, index) => index !== entry).join(", ")}]`), heat.layouts.values)) },
    ], label: `${table.component} › Remove ${named}` };
  }
  if (table.kind === "line") return { ops: [{ op: "removeProp", name: "compare" }], label: `${table.component} › Remove the comparison line` };
  const series = table.source.series;
  if (!series || !table.structural) return null;
  const id = series.ids[entry];
  const items = series.items.filter((_, index) => index !== entry).map((written) => objectCode(written.fields));
  const data = table.source.items.map((written) => withValues(written, (fields) => fields.filter((field) => field.key !== id)));
  return { ops: [{ op: "setProp", name: "series", value: expression(listCode(items, series.layout)) }, dataProp(table, data)], label: `${table.component} › Remove ${named}` };
}
