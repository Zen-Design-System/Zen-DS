#!/usr/bin/env node
// Reset all overrides (./resetAll.ts, imported directly: Node strips the types): which written props go back to their
// default and which stay (the user's Q4 answer: keep the content). Run: node src/platform/studio/inspector/resetAll.selftest.mjs
import { isFixedValue, resetAllProps } from "./resetAll.ts";

const failures = [];
let passed = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const attr = (name, kind, value, extra = {}) => ({ name, kind, value, raw: "", line: 1, ...extra });
const str = (name, value) => attr(name, "string", value);
const on = (name) => attr(name, "true");
const expr = (name, value, extra) => attr(name, "expression", value, extra);
const spec = (name, editor) => ({ name, editor });

const buttonSpecs = [spec("appearance", "enum"), spec("level", "enum"), spec("size", "enum"), spec("startIcon", "icon"), spec("endIcon", "icon"), spec("fullWidth", "boolean"), spec("disabled", "boolean"), spec("type", "enum"), spec("aria-label", "string"), spec("loading", "boolean")];
const none = new Set();

// The spec's example: <Button level="primary" size="lg" startIcon="icon-plus-line" onClick={save}>Lưu</Button> → <Button onClick={save}>Lưu</Button>
check("Button: variants and icon go, the handler stays", resetAllProps([str("level", "primary"), str("size", "lg"), str("startIcon", "icon-plus-line"), expr("onClick", "save")], buttonSpecs, none), ["level", "size", "startIcon"]);
check("booleans, shorthand or braced", resetAllProps([on("fullWidth"), expr("disabled", "true"), expr("loading", "false")], buttonSpecs, none), ["fullWidth", "disabled", "loading"]);
check("braced string literal", resetAllProps([expr("level", '"accent"')], buttonSpecs, none), ["level"]);
check("bound to code stays", resetAllProps([expr("level", "level"), expr("size", "compact ? \"sm\" : \"md\""), expr("disabled", "busy", { origin: { kind: "bound-state", reads: ["busy"] } })], buttonSpecs, none), []);
check("a useState initial stays (its row edits the state)", resetAllProps([expr("disabled", "locked", { state: { name: "locked", value: true, line: 2 } })], buttonSpecs, none), []);
check("spreads and undocumented attributes stay", resetAllProps([attr("…", "spread", "rest"), str("className", "x"), str("data-testid", "t")], buttonSpecs, none), []);
check("type and aria-* stay (what it does, what it is called)", resetAllProps([str("type", "submit"), str("aria-label", "Save")], buttonSpecs, none), []);
check("a required design prop stays", resetAllProps([str("level", "primary"), str("size", "lg")], buttonSpecs, new Set(["level"])), ["size"]);
check("the last write counts", resetAllProps([str("size", "lg"), expr("size", "size")], buttonSpecs, none), []);
check("each prop once", resetAllProps([str("size", "lg"), str("size", "sm")], buttonSpecs, none), ["size"]);

// Content stays: text, numbers, data, values and open state.
const fieldSpecs = [spec("label", "node"), spec("helpText", "node"), spec("size", "enum"), spec("state", "enum"), spec("labelOptional", "boolean"), spec("value", "string"), spec("defaultValue", "string"), spec("rows", "number"), spec("headingLevel", "number-enum"), spec("open", "boolean"), spec("checked", "boolean"), spec("items", "readonly"), spec("textStyle", "typography"), spec("truncate", "truncate")];
check("text, numbers, data, value, open and the heading level stay; switches and variants go", resetAllProps([
  str("label", "Email"), str("helpText", "We never share it"), str("size", "lg"), str("state", "disabled"), on("labelOptional"), str("value", "a@b.c"),
  str("defaultValue", "x"), expr("rows", "4"), expr("headingLevel", "3"), on("open"), on("checked"), expr("items", "[{ id: 1 }]", { shape: { type: "array", items: [] } }),
  str("textStyle", "Body/Small/Regular"), on("truncate"),
], fieldSpecs, none), ["size", "state", "labelOptional", "checked", "textStyle", "truncate"]);

// What counts as a fixed value
check("fixed values", [on("a"), str("a", "x"), expr("a", "false"), expr("a", "-2.5"), expr("a", "'x'"), expr("a", "x"), expr("a", "{ a: 1 }", { shape: { type: "object", fields: [] } }), attr("…", "spread", "rest")].map(isFixedValue), [true, true, true, true, true, false, false, false]);

if (failures.length) {
  console.error(`resetAll selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ Reset all overrides selftest: ${passed} checks pass.`);
