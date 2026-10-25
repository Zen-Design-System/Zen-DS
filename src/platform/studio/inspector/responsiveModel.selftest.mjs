// Self-test of ./responsiveModel.ts (imported directly: Node strips the types): per-breakpoint layout props in the
// Inspector — reading what the source writes, writing the editing breakpoint's key, collapsing to plain, Reset and Same on
// every breakpoint (docs/research/studio-responsive-breakpoints-2026-10-26.md §4).
//   node src/platform/studio/inspector/responsiveModel.selftest.mjs
import { breakpointsWithOwn, objectCode, ownProps, resetOps, responsiveOps, responsivePropsOf, responsiveRead, sameEverywhereOps, shownAt, valueAt } from "./responsiveModel.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

/** A written attribute as the source reader gives it: a string, a literal expression, or an object of literals. */
const string = (name, value) => ({ name, kind: "string", value, raw: `${name}="${value}"`, line: 1 });
const expression = (name, value) => ({ name, kind: "expression", value, raw: `${name}={${value}}`, line: 1 });
const object = (name, fields) => ({ name, kind: "expression", value: objectCode(fields), raw: "", line: 1, shape: { type: "object", fields: Object.entries(fields).map(([key, value]) => ({ key, kind: typeof value, value })) } });

// ── Reading.
check("Stack's responsive props (columns has its own field)", responsivePropsOf("Stack"), ["direction", "gap", "align", "justify", "wrap", "padding", "paddingX", "paddingY"]);
check("Grid's leave columns to ColumnsField", responsivePropsOf("Grid"), ["gap", "rowGap", "columnGap", "padding"]);
check("Card has none", responsivePropsOf("Card"), []);
check("unset", responsiveRead([], "gap"), { kind: "unset" });
check("a string", responsiveRead([string("direction", "row")], "direction"), { kind: "value", value: "row" });
check("a boolean expression", responsiveRead([expression("wrap", "true")], "wrap"), { kind: "value", value: true });
check("per breakpoint", responsiveRead([object("direction", { desktop: "row", mobile: "column" })], "direction"), { kind: "responsive", values: { desktop: "row", mobile: "column" } });
check("code it cannot read", responsiveRead([expression("gap", "space")], "gap"), { kind: "code" });
check("resolveAt order", [valueAt({ desktop: "row", mobile: "column" }, "tablet"), valueAt({ mobile: "column" }, "desktop"), valueAt({ desktop: "lg", tablet: "md" }, "mobile")], ["row", "column", "md"]);
check("shown at a breakpoint", [shownAt({ kind: "value", value: "row" }, "mobile"), shownAt({ kind: "unset" }, "mobile")], ["row", undefined]);

// ── Writing the editing breakpoint's key.
const ctx = (breakpoint, attributes, component = "Stack") => ({ component, attributes, breakpoint });
const setDirection = (value) => [{ op: "setProp", name: "direction", value: { kind: "string", value } }];
check("desktop, plain: written plain", responsiveOps(setDirection("row"), ctx("desktop", [])), setDirection("row"));
check("mobile, plain row → column: per breakpoint", responsiveOps(setDirection("column"), ctx("mobile", [string("direction", "row")])), [{ op: "setProp", name: "direction", value: { kind: "expression", code: '{ desktop: "row", mobile: "column" }' } }]);
check("mobile, unset (default column) → row: desktop keeps its default", responsiveOps(setDirection("row"), ctx("mobile", [])), [{ op: "setProp", name: "direction", value: { kind: "expression", code: '{ desktop: "column", mobile: "row" }' } }]);
check("mobile back to desktop's value: collapses to plain", responsiveOps(setDirection("row"), ctx("mobile", [object("direction", { desktop: "row", mobile: "column" })])), setDirection("row"));
check("desktop on a per-breakpoint prop: its key only", responsiveOps(setDirection("column"), ctx("desktop", [object("direction", { desktop: "row", tablet: "row", mobile: "column" })])), [{ op: "setProp", name: "direction", value: { kind: "expression", code: '{ desktop: "column", tablet: "row", mobile: "column" }' } }]);
check("desktop to the narrower ones' value: plain again", responsiveOps(setDirection("column"), ctx("desktop", [object("direction", { desktop: "row", mobile: "column" })])), setDirection("column"));
check("tablet between: a key of its own", responsiveOps([{ op: "setProp", name: "gap", value: { kind: "string", value: "sm" } }], ctx("tablet", [string("gap", "lg")])), [{ op: "setProp", name: "gap", value: { kind: "expression", code: '{ desktop: "lg", tablet: "sm" }' } }]);
check("removeProp on mobile writes the default there", responsiveOps([{ op: "removeProp", name: "direction" }], ctx("mobile", [string("direction", "row")])), [{ op: "setProp", name: "direction", value: { kind: "expression", code: '{ desktop: "row", mobile: "column" }' } }]);
check("removeProp of a prop without a default drops the key", responsiveOps([{ op: "removeProp", name: "paddingX" }], ctx("mobile", [object("paddingX", { desktop: "xl", mobile: "md" })])), [{ op: "setProp", name: "paddingX", value: { kind: "string", value: "xl" } }]);
check("other props pass through", responsiveOps([{ op: "setProp", name: "clip", value: { kind: "boolean", value: true } }], ctx("mobile", [])), [{ op: "setProp", name: "clip", value: { kind: "boolean", value: true } }]);
check("code is left alone", responsiveOps([{ op: "setProp", name: "gap", value: { kind: "string", value: "sm" } }], ctx("mobile", [expression("gap", "space")])), [{ op: "setProp", name: "gap", value: { kind: "string", value: "sm" } }]);

// ── Own values, Reset, Same on every breakpoint.
const written = [object("direction", { desktop: "row", mobile: "column" }), object("gap", { desktop: "lg", tablet: "md" }), string("padding", "xl")];
check("own props on mobile", ownProps("Stack", written, "mobile"), ["direction"]);
check("breakpoints with own values", breakpointsWithOwn("Stack", written), ["desktop", "tablet", "mobile"]);
check("Reset mobile: its keys go", resetOps("Stack", written, "mobile"), [{ op: "setProp", name: "direction", value: { kind: "string", value: "row" } }]);
check("Reset desktop does nothing", resetOps("Stack", written, "desktop"), []);
check("Same on every breakpoint, from mobile", sameEverywhereOps("Stack", written, "mobile"), [{ op: "setProp", name: "direction", value: { kind: "string", value: "column" } }, { op: "setProp", name: "gap", value: { kind: "string", value: "md" } }]);

if (failures.length) {
  console.error(`responsive model selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ responsive model selftest: ${passed} checks pass.`);
