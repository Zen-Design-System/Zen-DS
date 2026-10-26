// Self-test of ./gridCellModel.ts (imported directly: Node strips the types): the Inspector's Grid cell group — which
// layers take span, what a span reads and writes, the Box wrap and its Reset, the columns a Grid lays out, and how many
// columns each row leaves empty (docs/research/grid-span-2026-10-26.md §4).
//   node src/platform/studio/inspector/gridCellModel.selftest.mjs
import { clampSpan, columnsOf, emptyColumnsByRow, isSpanWrapper, spanLabel, spanOf, spanOp, takesSpan, wrapForSpan } from "./gridCellModel.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};
const attr = (name, value) => ({ name, kind: "expression", value, raw: `${name}={${value}}`, line: 1 });

// ── Which layers take span.
check("the boxes of a widget grid take span", ["Stack", "Grid", "Box", "Card", "ListBox", "ChartCard", "MetricCard"].map(takesSpan), [true, true, true, true, true, true, true]);
check("a Table does not", takesSpan("Table"), false);

// ── Reading and clamping.
check("unset reads 1", spanOf(undefined), 1);
check("full", spanOf("full"), "full");
check("a number, a numeric string, junk", [spanOf(8), spanOf("4"), spanOf("wide"), spanOf(0)], [8, 4, 1, 1]);
check("clamped to the columns", [clampSpan(8, 4), clampSpan(3, 12), clampSpan("full", 4)], [4, 3, "full"]);
check("auto-fill: a number shows as 1", clampSpan(3, null), 1);
check("labels", [spanLabel(8, 12), spanLabel("full", 12), spanLabel(2, null)], ["8 of 12", "Full", "2"]);

// ── Writing.
check("span 8", spanOp("span", 8), { op: "setProp", name: "span", value: { kind: "number", value: 8 } });
check("full", spanOp("span", "full"), { op: "setProp", name: "span", value: { kind: "string", value: "full" } });
check("1 removes it (the default)", spanOp("rowSpan", 1), { op: "removeProp", name: "rowSpan" });
check("a Table: wrapped in a Box that spans", wrapForSpan("span", 8), { op: "wrap", tag: "Box", props: { span: { kind: "number", value: 8 } } });
check("nothing to wrap for 1", wrapForSpan("span", 1), null);
check("a bare span Box is a wrapper", isSpanWrapper("Box", [attr("span", "8")], 1), true);
check("a Box with a fill is not", isSpanWrapper("Box", [attr("span", "8"), { name: "surface", kind: "string", value: "subtle", raw: "", line: 1 }], 1), false);
check("a Box with two children is not", isSpanWrapper("Box", [attr("span", "8")], 2), false);
check("a Stack is not", isSpanWrapper("Stack", [attr("span", "8")], 1), false);

// ── The columns a Grid lays out.
check("12 px tracks", columnsOf("85.3333px ".repeat(12), "fixed"), 12);
check("a track list as drawn", columnsOf("458px 222px", "responsive"), 2);
check("auto-fill is unknown", columnsOf("240px 240px 240px", "fill"), null);

// ── Empty columns per row (CSS sparse auto-placement).
check("KPIs 3·3·3·3, then 8·4: full rows", emptyColumnsByRow([3, 3, 3, 3, 8, 4].map((span) => ({ span })), 12), [0, 0]);
check("8·4·4: a lone 4 leaves 8", emptyColumnsByRow([8, 4, 4].map((span) => ({ span })), 12), [0, 8]);
check("a span that doesn't fit starts the next row", emptyColumnsByRow([8, 6, 6].map((span) => ({ span })), 12), [4, 0]);
check("full after a part row ends it", emptyColumnsByRow([{ span: 6 }, { span: "full" }], 12), [6, 0]);
check("a list two rows tall beside the hero and two breakdowns", emptyColumnsByRow([{ span: 8 }, { span: 4, rowSpan: 2 }, { span: 4 }, { span: 4 }], 12), [0, 0]);
check("auto-fill: nothing to say", emptyColumnsByRow([{ span: 2 }], null), []);

if (failures.length) {
  console.error(`grid cell model selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ grid cell model selftest: ${passed} checks pass.`);
