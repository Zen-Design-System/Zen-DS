#!/usr/bin/env node
// Self-test of the Layout section model (./layoutModel.ts, imported directly: Node strips the types).
// Run: node src/platform/studio/inspector/layoutModel.selftest.mjs
import {
  alignResetOps, alignView, autoOps, baselineOps, cellOps, columnsAt, columnsFieldOp, columnsModeOps, countOf, crossOps, flowOf, flowOps,
  gapAutoOps, gapOps, laneAlignOps, laneJustifyOps, layoutWarnings, relinkChoices, relinkOps, tracksFor, uniformPadding, uniformPaddingOps,
} from "./layoutModel.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};
const str = (name, value) => ({ op: "setProp", name, value: { kind: "string", value } });
const bool = (name, value) => ({ op: "setProp", name, value: { kind: "boolean", value } });
const num = (name, value) => ({ op: "setProp", name, value: { kind: "number", value } });
const rm = (name) => ({ op: "removeProp", name });

// Flow: one apply per pick, defaults reached by removing.
check("flow of", [flowOf({}), flowOf({ direction: "row" }), flowOf({ direction: "row", wrap: true }), flowOf({ wrap: true })], ["vertical", "horizontal", "wrap", "vertical"]);
check("Wrap from unset", flowOps({}, "wrap"), [str("direction", "row"), bool("wrap", true)]);
check("Vertical from wrap", flowOps({ direction: "row", wrap: true }, "vertical"), [rm("direction"), rm("wrap")]);
check("Horizontal from wrap", flowOps({ direction: "row", wrap: true }, "horizontal"), [rm("wrap")]);
check("Vertical when nothing is written", flowOps({}, "vertical"), []);

// Alignment box.
check("row unset: middle left, position", alignView({ direction: "row" }), { row: true, auto: false, cross: "position", crossDefault: true, align: "center", justify: "start", unset: true });
check("column unset: smart stretch", alignView({}).cross, "stretch");
check("row: the effective cell writes nothing", cellOps({ direction: "row" }, "center", "start"), []);
check("row: a cell writes what changes", cellOps({ direction: "row" }, "end", "center"), [str("align", "end"), str("justify", "center")]);
check("column: a cell sets align (leaves stretch)", cellOps({}, "start", "start"), [str("align", "start")]);
check("Auto: a cell leaves Auto", cellOps({ direction: "row", justify: "between" }, "center", "start"), [str("justify", "start")]);
check("Auto lanes set align only", laneAlignOps({ direction: "row", justify: "between" }, "end"), [str("align", "end")]);
check("stretch lanes set justify only", laneJustifyOps({ align: "stretch" }, "center"), [str("justify", "center")]);
check("X toggles Auto", [autoOps({ direction: "row" }), autoOps({ direction: "row", justify: "between" })], [[str("justify", "between")], [rm("justify")]]);
check("cross axis", [crossOps({ direction: "row" }, "stretch"), crossOps({ direction: "row", align: "stretch" }, "position"), crossOps({}, "position"), crossOps({ align: "start" }, "position")], [[str("align", "stretch")], [rm("align")], [str("align", "start")], []]);
check("B toggles baseline", [baselineOps({ direction: "row" }), baselineOps({ direction: "row", align: "baseline" })], [[str("align", "baseline")], [rm("align")]]);
check("reset alignment", alignResetOps({ align: "end", justify: "center", gap: "sm" }), [rm("align"), rm("justify")]);
check("gap pick in Auto leaves Auto", gapOps({ justify: "between", gap: "xs" }, "md"), [str("gap", "md"), rm("justify")]);
check("gap pick", gapOps({ gap: "xs" }, "xs"), []);
check("gap Auto", [gapAutoOps({}), gapAutoOps({ justify: "between" })], [[str("justify", "between")], []]);

// Padding.
check("uniform padding", [uniformPadding({}), uniformPadding({ padding: "md" }), uniformPadding({ padding: "md", paddingX: "lg" }), uniformPadding({ paddingX: "sm", paddingY: "sm" })], [undefined, "md", null, "sm"]);
check("all sides collapses the axes", uniformPaddingOps({ paddingX: "lg", paddingY: "xs" }, "md"), [str("padding", "md"), rm("paddingX"), rm("paddingY")]);

// Grid gap.
check("relink choices", relinkChoices({ gap: "md", rowGap: "lg", columnGap: "md" }), ["md", "lg"]);
check("relink", relinkOps({ rowGap: "lg", columnGap: "sm" }, "lg"), [str("gap", "lg"), rm("rowGap"), rm("columnGap")]);

// Columns.
check("tracks ↔ count", [tracksFor(3), countOf("2fr 1fr"), countOf("minmax(0, 320px) 1fr"), countOf("repeat(3, 1fr)")], ["1fr 1fr 1fr", 2, 2, null]);
check("mode changes", [columnsModeOps(undefined, "count", 3), columnsModeOps(2, "tracks", 3), columnsModeOps("2fr 1fr", "count", 1), columnsModeOps(3, "auto-fit", 3), columnsModeOps(2, "count", 2)], [[num("columns", 3)], [str("columns", "1fr 1fr")], [num("columns", 2)], [rm("columns")], []]);
check("breakpoint read order", [columnsAt({ mobile: 1, desktop: 2 }, "tablet"), columnsAt({ mobile: 1 }, "desktop"), columnsAt({}, "mobile")], ["desktop", "mobile", undefined]);
check("breakpoint field op", columnsFieldOp("desktop", "2fr 1fr"), { op: "setField", name: "columns", key: "desktop", value: { kind: "string", value: "2fr 1fr" } });

// Warnings.
check("warnings", [
  layoutWarnings("Stack", { wrap: true }).map((w) => w.prop),
  layoutWarnings("Stack", { direction: "row", wrap: true }).length,
  layoutWarnings("Grid", { minColumnWidth: 200, columns: 2, gap: "md", rowGap: "sm", columnGap: "lg" }).map((w) => w.prop),
  layoutWarnings("FormActions", { inset: "md" }).map((w) => w.fix),
], [["wrap"], 0, ["minColumnWidth", "gap"], [[rm("inset")]]]);

if (failures.length) {
  console.error(`layoutModel selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ Layout model selftest: ${passed} checks pass.`);
