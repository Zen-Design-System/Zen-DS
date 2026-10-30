#!/usr/bin/env node
// Zen Studio chart Data section selftest: ./chartDataModel.ts read from the real parser (tools/studio/jsx-source.mjs
// describeElement) on every chart the Assets panel inserts (slots/palette.ts), each edit applied with the real engine
// (applyOps) and read back, without a server or a browser.
//   node src/platform/studio/inspector/chartDataModel.selftest.mjs     summary; exit 1 on any failure
import { chartFigma } from "../../../../tools/studio/figma-charts.mjs";
import { applyOps, describeElement } from "../../../../tools/studio/jsx-source.mjs";
import { paletteItem } from "../slots/palette.ts";
import {
  addEntry, addRow, chartDataProps, freshId, nextLabel, readChartTable, removeEntry, removeRow, setCell, setEntryLabel, setRowLabel,
} from "./chartDataModel.ts";

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const FILE = "src/platform/studio/e2e-chart.zen.tsx";
const LOC = "3:4";
/** A page holding `jsx` (its first line at 3:4, the others indented the same). */
const page = (jsx) => `export default function Page() {\n  return (\n${jsx.split("\n").map((line) => `    ${line}`).join("\n")}\n  );\n}\n`;
const read = (code, owner = {}) => {
  const element = describeElement(code, FILE, LOC);
  return readChartTable(element.name, element.attributes, owner);
};
/** The edit applied: the new page text (a failure is recorded and the old text kept). */
function apply(label, code, edit) {
  if (!edit) { failures.push(`${label}: no edit`); return code; }
  const element = describeElement(code, FILE, LOC);
  const result = applyOps(code, LOC, element.name, edit.ops, { file: FILE });
  if ("error" in result) { failures.push(`${label}: ${result.error}`); return code; }
  passed += 1;
  return result.code;
}
const labels = (table) => table.rows.map((row) => row.label);
/** The element's props as plain data, as the Figma push reads them (literals only: the edits write nothing else). */
function valuesOf(code) {
  const element = describeElement(code, FILE, LOC);
  const values = {};
  for (const attr of element.attributes) {
    if (attr.kind === "string") values[attr.name] = attr.value;
    else if (attr.kind === "true") values[attr.name] = true;
    else if (attr.kind === "expression") values[attr.name] = Function(`"use strict"; return (${attr.value});`)();
  }
  return { name: element.name, values };
}
const column = (table, index) => table.rows.map((row) => row.cells[index].value);

/* ── labels and ids for what is added ─────────────────────────────────────────────────────────────────────────── */

check("next month", nextLabel(["Jul", "Aug", "Sep"], "Period"), "Oct");
check("months wrap", nextLabel(["Nov", "Dec"], "Period"), "Jan");
check("a month and its year", nextLabel(["Oct 2026"], "Period"), "Nov 2026");
check("long weekdays", nextLabel(["Monday"], "Column"), "Tuesday");
check("quarters wrap", nextLabel(["Q3", "Q4"], "Period"), "Q1");
check("a trailing number", nextLabel(["Week 3"], "Period"), "Week 4");
check("a year", nextLabel(["2025"], "Period"), "2026");
check("words: the row word and the count", nextLabel(["Lumen Bank", "Phin & Co"], "Slice"), "Slice 3");
check("never a label the list has", nextLabel(["Slice 3", "Other"], "Slice"), "Slice 4");
check("an empty list", nextLabel([], "Period"), "Period 1");
check("slice id from words", freshId("Other clients", ["lumen"], "slice"), "other-clients");
check("slice id kept apart", freshId("Other clients", ["other-clients"], "slice"), "other-clients-2");
check("Vietnamese words", freshId("Đối tác mới", [], "slice"), "doi-tac-moi");
check("series key", freshId("Series 3", ["design"], "series", true), "series3");
check("series key from words", freshId("Client services", [], "series", true), "clientServices");
check("series key kept apart", freshId("Design", ["design"], "series", true), "design2");
check("a key never starts with a digit", freshId("2027", [], "series", true), "series");

check("props: donut", chartDataProps("DonutChart"), ["data"]);
check("props: line", chartDataProps("LineChart"), ["data", "compare"]);
check("props: stacked", chartDataProps("StackBarChart"), ["data", "series"]);
check("props: heatmap", chartDataProps("HeatmapChart"), ["rows", "columns", "values"]);
check("props: gauge has none", chartDataProps("GaugeChart"), []);

/* ── every chart the Assets panel inserts reads, grows, shrinks and takes a number ──────────────────────────── */

const CHARTS = [
  ["line-chart", "line", 3, 1], ["multi-line-chart", "line", 3, 2], ["column-chart", "points", 6, 1], ["horizontal-bar-chart", "points", 4, 2],
  ["donut-chart", "slices", 4, 1], ["radial-chart", "slices", 3, 1], ["funnel-chart", "points", 4, 1], ["bar-list", "points", 5, 1],
  ["bullet-chart", "bullets", 3, 2], ["bar-chart", "series", 3, 2], ["area-chart", "series", 6, 1], ["stacked-area-chart", "series", 6, 3],
  ["grouped-bar-chart", "series", 6, 2], ["combo-chart", "combo", 6, 2], ["heatmap-chart", "heatmap", 5, 5],
];
for (const [id, kind, rowCount, columnCount] of CHARTS) {
  const owner = id === "horizontal-bar-chart" ? { orientation: "horizontal" } : {};
  let code = page(paletteItem(id).build({}));
  const table = read(code, owner);
  if (!table) { failures.push(`${id}: no table`); continue; }
  check(`${id}: kind`, table.kind, kind);
  check(`${id}: rows`, table.rows.length, rowCount);
  check(`${id}: number columns`, table.columns.filter((col) => col.kind === "number").length, columnCount);
  check(`${id}: structural`, table.structural, true);
  check(`${id}: every cell read`, table.rows.every((row) => row.label !== null && row.cells.every((cell) => !cell.bound)), true);

  // Add a row: one more, named in turn, its numbers those of the last.
  code = apply(`${id}: add a row`, code, addRow(table));
  const grown = read(code, owner);
  check(`${id}: added`, grown.rows.length, rowCount + 1);
  check(`${id}: the new row copies the last one's numbers`, grown.rows.at(-1).cells.map((cell) => cell.value), table.rows.at(-1).cells.map((cell) => cell.value));
  check(`${id}: the new row's label`, grown.rows.at(-1).label, nextLabel(labels(table), table.row));

  // A number typed into the first row's first column.
  code = apply(`${id}: set a number`, code, setCell(grown, 0, 0, 4321));
  check(`${id}: the number`, read(code, owner).rows[0].cells[0].value, 4321);

  // A label typed.
  code = apply(`${id}: rename a row`, code, setRowLabel(read(code, owner), 1, "Renamed"));
  check(`${id}: the label`, read(code, owner).rows[1].label, "Renamed");

  // Remove the first row.
  code = apply(`${id}: remove a row`, code, removeRow(read(code, owner), 0));
  const shrunk = read(code, owner);
  check(`${id}: removed`, shrunk.rows.length, rowCount);
  check(`${id}: the others moved up`, shrunk.rows[0].label, "Renamed");

  // The Figma push still draws the edited chart: its set, and a Sector that holds every period.
  code = apply(`${id}: grow again`, code, addRow(shrunk));
  if (shrunk.list?.addable) code = apply(`${id}: add a column`, code, addEntry(read(code, owner)));
  const { name, values } = valuesOf(code);
  const notes = [];
  let pushed = null;
  try { pushed = chartFigma(name, values, notes, id); } catch (error) { failures.push(`${id}: the push threw ${error.message}`); }
  check(`${id}: pushed`, Boolean(pushed?.set), true);
  if (pushed?.props.Sector) check(`${id}: Sector holds the periods`, Number.parseInt(pushed.props.Sector, 10) >= Math.min(12, values.data.length), true);
}

/* ── kinds in detail ────────────────────────────────────────────────────────────────────────────────────────────── */

{
  // Donut: a new slice gets a fresh id first, no copied colour; the rows draw in palette colours.
  let code = page(`<DonutChart aria-label="Revenue by client" data={[{ id: "lumen", label: "Lumen", value: 89, color: "var(--x)" }, { id: "other", label: "Other", value: 12, color: "var(--y)" }]} />`);
  const table = read(code);
  check("donut: rows draw palette colours", table.rowColours, true);
  code = apply("donut: add", code, addRow(table));
  check("donut: written in one line, id first, no colour copied", /\{ id: "slice-3", label: "Slice 3", value: 12 \}\]/.test(code), true);
  // The last row stays: a chart keeps one.
  const one = page(`<DonutChart aria-label="x" data={[{ id: "a", label: "A", value: 1 }]} />`);
  check("donut: the last slice stays", removeRow(read(one), 0), null);
}
{
  // A multi-line list keeps one item per line at its indent.
  let code = page(`<FunnelChart aria-label="Leads"\n  data={[\n    { label: "Leads", value: 240 }, { label: "Qualified", value: 168 },\n  ]} />`);
  code = apply("multi-line: add", code, addRow(read(code)));
  check("multi-line: one item per line", code.includes(`      data={[\n        { label: "Leads", value: 240 },\n        { label: "Qualified", value: 168 },\n        { label: "Stage 3", value: 168 },\n      ]} />`), true);
}
{
  // BarChart: vertical bars carry a Forecast flag (off: the field goes), horizontal ones a Target that clears.
  let code = page(`<BarChart aria-label="x" data={[{ label: "Sep", value: 10 }, { label: "Oct", value: 12, projected: true }]} />`);
  let table = read(code);
  check("bar: vertical columns", table.columns.map((col) => col.key), ["value", "projected"]);
  check("bar: forecast flags", column(table, 1), [false, true]);
  code = apply("bar: forecast on", code, setCell(table, 0, 1, true));
  check("bar: forecast written", read(code).rows[0].cells[1].value, true);
  code = apply("bar: forecast off", code, setCell(read(code), 1, 1, false));
  check("bar: forecast off leaves no field", /projected: false/.test(code) || /label: "Oct", value: 12, projected/.test(code), false);
  code = apply("bar: add after a forecast keeps it", page(`<BarChart aria-label="x" data={[{ label: "Oct", value: 12, projected: true }]} />`), addRow(read(page(`<BarChart aria-label="x" data={[{ label: "Oct", value: 12, projected: true }]} />`))));
  check("bar: the next period is a forecast too", /\{ label: "Nov", value: 12, projected: true \}/.test(code), true);
  code = page(`<BarChart orientation="horizontal" aria-label="x" data={[{ label: "Design", value: 10, target: 12 }]} />`);
  table = read(code, { orientation: "horizontal" });
  check("bar: horizontal columns", table.columns.map((col) => col.key), ["value", "target"]);
  code = apply("bar: clear a target", code, setCell(table, 0, 1, null));
  check("bar: target cleared", /target/.test(code), false);
  check("bar: a value never clears", setCell(table, 0, 0, null), null);
}
{
  // LineChart: the comparison is a removable line; adding a period extends it; a new comparison copies the line.
  let code = page(paletteItem("multi-line-chart").build({}));
  let table = read(code, { label: "Invoiced" });
  check("line: lines", table.list.entries.map((entry) => [entry.label, entry.removable]), [["Invoiced", false], ["Collected", true]]);
  check("line: compare cells", column(table, 1), [91700, 95800, 88300]);
  code = apply("line: add a period", code, addRow(table));
  check("line: the comparison grows with it", read(code).rows.at(-1).cells[1].value, 88300);
  code = apply("line: a compare number", code, setCell(read(code), 0, 1, 1));
  check("line: compare number", column(read(code), 1), [1, 95800, 88300, 88300]);
  code = apply("line: rename the comparison", code, setEntryLabel(read(code), 1, "Plan"));
  check("line: comparison renamed", read(code).columns[1].label, "Plan");
  code = apply("line: remove the comparison", code, removeEntry(read(code), 1));
  table = read(code);
  check("line: no comparison", [table.columns.length, /compare/.test(code), table.list.addable], [1, false, true]);
  code = apply("line: add a comparison", code, addEntry(table));
  check("line: the comparison copies the line", column(read(code), 1), column(read(code), 0));
  code = apply("line: rename the line", code, setEntryLabel(read(code), 0, "Revenue"));
  check("line: the line's label is the chart's label", /label="Revenue"/.test(code), true);
}
{
  // Series: add, rename and remove a series; every row's values follow.
  let code = page(paletteItem("bar-chart").build({}));
  let table = read(code);
  check("series: list", table.list.entries.map((entry) => entry.label), ["Design", "Engineering"]);
  code = apply("series: add", code, addEntry(table));
  table = read(code);
  check("series: three columns", table.columns.map((col) => col.key), ["design", "engineering", "series3"]);
  check("series: the new column copies the last", column(table, 2), column(table, 1));
  code = apply("series: rename", code, setEntryLabel(table, 2, "Delivery"));
  check("series: renamed", read(code).list.entries[2].label, "Delivery");
  code = apply("series: a number in the new series", code, setCell(read(code), 0, 2, 7));
  check("series: number", read(code).rows[0].cells[2].value, 7);
  code = apply("series: remove the first", code, removeEntry(read(code), 0));
  table = read(code);
  check("series: two left", table.columns.map((col) => col.key), ["engineering", "series3"]);
  check("series: no design value left", /design:/.test(code), false);
  code = apply("series: remove another", code, removeEntry(table, 0));
  check("series: the last series stays", removeEntry(read(code), 0), null);
  // A missing value in a row is an empty cell; typing adds the key.
  code = page(`<GroupedBarChart aria-label="x" series={[{ id: "a", label: "A" }, { id: "b", label: "B" }]} data={[{ label: "Jan", values: { a: 1 } }]} />`);
  table = read(code);
  check("series: a missing value is empty", table.rows[0].cells.map((cell) => cell.value), [1, null]);
  code = apply("series: fill it", code, setCell(table, 0, 1, 5));
  check("series: filled", /values: \{ a: 1, b: 5 \}/.test(code), true);
  // Advised counts warn.
  const many = page(`<GroupedBarChart aria-label="x" series={[{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }, { id: "d", label: "D" }]} data={[{ label: "Jan", values: { a: 1, b: 1, c: 1, d: 1 } }]} />`);
  check("series: advised count", read(many).notes, ["4 series: grouped bars compare 2–3 series"]);
}
{
  // Combo: bar and line columns named by barLabel / lineLabel; no list.
  const table = read(page(paletteItem("combo-chart").build({})), { barLabel: "Revenue", lineLabel: "Margin (%)" });
  check("combo: columns", table.columns.map((col) => [col.key, col.label]), [["bar", "Revenue"], ["line", "Margin (%)"]]);
  check("combo: no list", table.list, null);
}
{
  // Heatmap: rows and columns of a grid.
  let code = page(paletteItem("heatmap-chart").build({}));
  let table = read(code);
  check("heatmap: columns list", table.list.entries.map((entry) => entry.label), ["Mon", "Tue", "Wed", "Thu", "Fri"]);
  code = apply("heatmap: add a column", code, addEntry(table));
  table = read(code);
  check("heatmap: the next weekday", table.columns.at(-1).label, "Sat");
  check("heatmap: each row copies its last value", column(table, 5), column(table, 4));
  code = apply("heatmap: a value", code, setCell(table, 2, 5, 99));
  check("heatmap: value", read(code).rows[2].cells[5].value, 99);
  code = apply("heatmap: remove a column", code, removeEntry(read(code), 0));
  check("heatmap: Mon gone", read(code).columns.map((col) => col.label), ["Tue", "Wed", "Thu", "Fri", "Sat"]);
  code = apply("heatmap: rename a column", code, setEntryLabel(read(code), 0, "Tuesday"));
  check("heatmap: renamed", read(code).columns[0].label, "Tuesday");
  check("heatmap: an uneven grid is not read", read(page(`<HeatmapChart aria-label="x" rows={["a"]} columns={["x", "y"]} values={[[1]]} />`)), null);
}
{
  // Data in a const: numbers and labels edit there, rows never (the reference would turn into a literal).
  const code = `const revenue = [{ label: "Jul", value: 1 }, { label: "Aug", value: 2 }];\nexport default function Page() {\n  return (\n    <LineChart aria-label="x" data={revenue} />\n  );\n}\n`;
  const element = describeElement(code, FILE, "4:4");
  const table = readChartTable(element.name, element.attributes, {});
  check("const: read", [table?.rows.length, table?.structural, table?.via?.name], [2, false, "revenue"]);
  check("const: no rows added", addRow(table), null);
  check("const: no rows removed", removeRow(table, 0), null);
  const result = applyOps(code, "4:4", "LineChart", setCell(table, 1, 0, 5).ops, { file: FILE });
  check("const: a number edits the const", "code" in result && result.code.includes(`{ label: "Aug", value: 5 }`), true);
}
{
  // Data the Studio cannot read stays as written (no table).
  check("bound data", read(page(`<LineChart aria-label="x" data={mock.revenue} />`)), null);
  check("no data", read(page(`<LineChart aria-label="x" />`)), null);
  // A number written as code shows bound and the rest stays editable.
  const table = read(page(`<BarList aria-label="x" data={[{ label: "A", value: total * 2 }, { label: "B", value: 3 }]} />`));
  check("a bound number", table.rows.map((row) => row.cells[0]), [{ value: null, bound: "total * 2" }, { value: 3 }]);
  // Too many periods warn.
  const long = Array.from({ length: 13 }, (_, i) => `{ label: "P${i + 1}", value: ${i} }`).join(", ");
  check("13 periods warn", read(page(`<LineChart aria-label="x" data={[${long}]} />`)).notes, ["13 periods: Figma draws 12 periods"]);
}

console.log(`chartDataModel selftest: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exit(1);
}
