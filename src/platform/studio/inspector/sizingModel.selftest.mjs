#!/usr/bin/env node
// Zen Studio Size group selftest: the view model and the EditOp[] each intent writes, from ./sizingModel.ts (imported
// directly: Node strips the types), without a server or a browser.
//   node src/platform/studio/inspector/sizingModel.selftest.mjs     summary; exit 1 on any failure
import {
  alignFromCss, alignSelfOps, alignSelfOptions, axisTooltip, axisView, editLabel, effectiveAlign, fillCaption, fillChildrenOps,
  holdValues, holds, limitOps, limitSuffix, optimisticOf, parseLimit, parseSizingInput, releaseValues, removeLimitsOps, scrubbed, settleValues, sizingOps,
  sizingPropNames, stepBase, stepped, valueKey,
} from "./sizingModel.ts";

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const unset = { state: "unset" };
const lit = (value) => ({ state: "literal", value, raw: "" });
const bound = (expression) => ({ state: "bound", expression, raw: `{${expression}}` });
const spread = (live) => ({ state: "spread", via: "{...rest}", live });
const noLive = { mode: null, px: null };
const row = { kind: "row", fillChildren: false };
const column = { kind: "column", fillChildren: false };
const grid = { kind: "grid", fillChildren: false };
const other = { kind: "other", fillChildren: false };
const set = (name, value) => ({ op: "setProp", name, value: typeof value === "number" ? { kind: "number", value } : typeof value === "boolean" ? { kind: "boolean", value } : { kind: "string", value } });
const remove = (name) => ({ op: "removeProp", name });

/* ── view ── */
check("unset → Auto, editable", [axisView("width", unset, noLive, row).text, axisView("width", unset, noLive, row).editable, axisView("width", unset, noLive, row).written], ["Auto", true, false]);
check("literal hug", axisView("width", lit("hug"), noLive, row).text, "Hug");
check("literal fill", axisView("height", lit("fill"), noLive, column).mode, "fill");
check("literal number → Fixed px", [axisView("width", lit(312.4), noLive, row).mode, axisView("width", lit(312.4), noLive, row).text], ["fixed", "312"]);
check("unknown literal shows as written", [axisView("width", lit("312"), noLive, row).unknown, axisView("width", lit("312"), noLive, row).text], ["312", "312"]);
check("bound: live DOM, read-only", (() => { const v = axisView("width", bound("w"), { mode: "fixed", px: 200 }, row); return [v.mode, v.text, v.editable, v.via]; })(), ["fixed", "200", false, "w"]);
check("spread: fed value first", (() => { const v = axisView("width", spread("fill"), { mode: null, px: null }, row); return [v.mode, v.editable, v.source]; })(), ["fill", false, "spread"]);
check("spread without a value: live DOM", axisView("height", spread(undefined), { mode: "hug", px: null }, row).text, "Hug");
check("fillChildren row parent: width Fill from parent", (() => { const v = axisView("width", unset, noLive, { kind: "row", fillChildren: true }); return [v.text, v.fromParent, v.written]; })(), ["Fill", true, false]);
check("fillChildren row parent: height stays Auto", axisView("height", unset, noLive, { kind: "row", fillChildren: true }).text, "Auto");
check("fillChildren column parent: height Fill", axisView("height", unset, noLive, { kind: "column", fillChildren: true }).fromParent, true);

/* ── typing ── */
check("type 312 → fixed", parseSizingInput("312"), { kind: "fixed", px: 312 });
check("type 312px → fixed", parseSizingInput(" 312 px "), { kind: "fixed", px: 312 });
check("type 12,6 → fixed 13", parseSizingInput("12,6"), { kind: "fixed", px: 13 });
check("type 0 → invalid", parseSizingInput("0").kind, "invalid");
check("type h → hug", parseSizingInput("h"), { kind: "hug" });
check("type HUG → hug", parseSizingInput("HUG"), { kind: "hug" });
check("type f → fill", parseSizingInput("f"), { kind: "fill" });
check("type fi → fill", parseSizingInput("fi"), { kind: "fill" });
check("type fix → fixed at current", parseSizingInput("fix"), { kind: "fixed-current" });
check("type fixed → fixed at current", parseSizingInput("Fixed"), { kind: "fixed-current" });
check("type auto → auto", parseSizingInput("auto"), { kind: "auto" });
check("type empty → revert", parseSizingInput("  "), { kind: "revert" });
check("type 100% → explains Fill", parseSizingInput("100%"), { kind: "invalid", message: "Sizes are px numbers: use Fill for 100%" });
check("type junk → invalid", parseSizingInput("wide", "height"), { kind: "invalid", message: "Height takes a number, Hug or Fill" });

/* ── ops ── */
const autoW = axisView("width", unset, noLive, row);
const hugW = axisView("width", lit("hug"), noLive, row);
const fixedW = axisView("width", lit(320), noLive, row);
check("Auto → Hug writes hug", sizingOps(autoW, { kind: "hug" }, 312), [set("width", "hug")]);
check("Hug → Hug writes nothing", sizingOps(hugW, { kind: "hug" }, 312), null);
check("Hug → Fill", sizingOps(hugW, { kind: "fill" }, 312), [set("width", "fill")]);
check("Auto → 200", sizingOps(autoW, { kind: "fixed", px: 200 }, 312), [set("width", 200)]);
check("320 → 320 writes nothing", sizingOps(fixedW, { kind: "fixed", px: 320 }, 312), null);
check("Fixed at current (measured)", sizingOps(hugW, { kind: "fixed-current" }, 311.6), [set("width", 312)]);
check("Fixed at current while fixed: nothing", sizingOps(fixedW, { kind: "fixed-current" }, 300), null);
check("reset written", sizingOps(fixedW, { kind: "auto" }, 312), [remove("width")]);
check("reset unset: nothing", sizingOps(autoW, { kind: "auto" }, 312), null);
check("bound: never writes", sizingOps(axisView("width", bound("w"), noLive, row), { kind: "hug" }, 1), null);
check("unknown literal → hug writes", sizingOps(axisView("width", lit("312"), noLive, row), { kind: "hug" }, 1), [set("width", "hug")]);
check("unknown literal → reset removes", sizingOps(axisView("width", lit("312"), noLive, row), { kind: "auto" }, 1), [remove("width")]);
check("Fill from parent → Fill writes (makes it explicit)", sizingOps(axisView("width", unset, noLive, { kind: "row", fillChildren: true }), { kind: "fill" }, 100), [set("width", "fill")]);

/* ── keys / scrub ── */
check("step base: fixed px", stepBase(fixedW, 312), 320);
check("step base: hug → measured", stepBase(hugW, 311.6), 312);
check("↑ +1", stepped(320, 1), 321);
check("Shift+↓ −8 never below 1", stepped(4, -8), 1);
check("scrub 9 px → +4", scrubbed(100, 9, false), 104);
check("scrub −9 px shift → −32", scrubbed(100, -9, true), 68);

/* ── limits ── */
check("parse limit", [parseLimit("120"), parseLimit(" "), parseLimit("12px"), parseLimit("x")], [120, null, 12, "invalid"]);
check("limit set", limitOps("minWidth", 120, unset), [set("minWidth", 120)]);
check("limit same: nothing", limitOps("minWidth", 120, lit(120)), null);
check("limit cleared → remove", limitOps("maxWidth", null, lit(640)), [remove("maxWidth")]);
check("limit cleared unset: nothing", limitOps("maxWidth", null, unset), null);
check("limit 0 allowed (minHeight={0})", limitOps("minHeight", 0, unset), [set("minHeight", 0)]);
check("remove min and max: written ones, one request", removeLimitsOps({ minWidth: lit(120), maxWidth: unset, maxHeight: lit(400), minHeight: bound("h") }), [remove("minWidth"), remove("maxHeight")]);
check("remove min and max: none written", removeLimitsOps({ minWidth: unset }), null);
check("limit suffix", [limitSuffix(120, 640), limitSuffix(null, 640), limitSuffix(null, null)], [" · min 120 / max 640", " · max 640", ""]);

/* ── align / children ── */
check("align options: row", alignSelfOptions(row).map((o) => o.name), ["Top", "Middle", "Bottom", "Stretch"]);
check("align options: grid", alignSelfOptions(grid)[3].icon, "icon-chevron-selector-vertical-line");
check("align options: column", alignSelfOptions(column).map((o) => o.name), ["Left", "Center", "Right", "Stretch"]);
check("css keywords", ["flex-start", "center", "flex-end", "stretch", "normal", "auto", "first baseline", "self-end"].map(alignFromCss), ["start", "center", "end", "stretch", "stretch", null, "baseline", "end"]);
check("effective: own wins", effectiveAlign("flex-end", "center"), { value: "end", baseline: false });
check("effective: auto → parent", effectiveAlign("auto", "center"), { value: "center", baseline: false });
check("effective: grid normal → stretch", effectiveAlign("auto", "normal"), { value: "stretch", baseline: false });
check("effective: baseline → top", effectiveAlign("auto", "baseline"), { value: "start", baseline: true });
check("alignSelf pick", alignSelfOps("center", unset), [set("alignSelf", "center")]);
check("alignSelf same: nothing", alignSelfOps("center", lit("center")), null);
check("alignSelf reset", alignSelfOps(null, lit("end")), [remove("alignSelf")]);
check("alignSelf bound: nothing", alignSelfOps("end", bound("a")), null);
check("fill equally", fillChildrenOps(true, unset), [set("fillChildren", true)]);
check("own size removes", fillChildrenOps(false, lit(true)), [remove("fillChildren")]);
check("own size removes a written false too", fillChildrenOps(false, lit(false)), [remove("fillChildren")]);
check("own size unset: nothing", fillChildrenOps(false, unset), null);

/* ── copy ── */
check("fill captions (width)", [row, column, grid, other].map((p) => fillCaption("width", p)), ["Equal share of the row", "Stretch across the column", "Fill the grid cell", "Full width"]);
check("fill captions (height)", [row, column, grid, other].map((p) => fillCaption("height", p)), ["Stretch to the row's height", "Equal share of the column", "Fill the grid cell", "Full height"]);
check("tooltip unset width", axisTooltip(autoW, row), "Not set: follows the parent (rows hug, columns stretch)");
check("tooltip fill, no Stack/Grid parent", axisTooltip(axisView("width", lit("fill"), noLive, other), other), "Fill = 100% of the container");
check("tooltip with limits", axisTooltip(fixedW, row, limitSuffix(120, null)), "Fixed width · 320 px · min 120");
check("tooltip bound", axisTooltip(axisView("width", bound("w"), noLive, row), row), "Bound to {w}: change it in the code");

/* ── labels, optimistic, holds ── */
check("label set", editLabel("Stack", [set("width", "fill")]), "Stack width → Fill");
check("label number", editLabel("Text", [set("width", 240)]), "Text width → 240");
check("label reset", editLabel("Box", [remove("height")]), "Box reset height");
check("label remove limits", editLabel("Grid", [remove("minWidth"), remove("maxWidth")]), "Grid min and max removed");
check("optimistic", optimisticOf([set("width", 12), remove("minWidth")]), { width: { state: "literal", value: 12, raw: "" }, minWidth: { state: "unset" } });
const source = { width: lit("fill"), minWidth: unset };
check("holds: already applied", holds([set("width", "fill"), remove("minWidth")], (name) => source[name] ?? unset), true);
check("holds: not applied", holds([set("width", "hug")], (name) => source[name] ?? unset), false);

/* ── optimistic values held until the panel's read catches up ── */
check("key: literal by value, not raw", [valueKey(lit(300)) === valueKey({ state: "literal", value: 300, raw: "{300}" }), valueKey(lit(300)) === valueKey(lit("300"))], [true, false]);
check("key: unset / bound / spread", [valueKey(unset), valueKey(bound("w")), valueKey(spread(12))], ["unset", "bound:w", "spread:{...rest}:12"]);
{
  const read = { width: lit(300), minWidth: lit(40) };
  const valueOf = (name) => read[name] ?? unset;
  const one = holdValues({}, optimisticOf([set("width", 301)]), valueOf);
  check("hold: base is the panel's read", one.width, { value: lit(301), base: valueKey(lit(300)), sent: [] });
  const two = holdValues(one, optimisticOf([set("width", 302)]), valueOf);
  check("hold again: keeps the base, remembers 301", [two.width.base, two.width.sent, two.width.value.value], [valueKey(lit(300)), [valueKey(lit(301))], 302]);
  check("settle: read still the base → kept", settleValues(two, valueOf) === two, true);
  check("settle: an earlier write landed → kept", settleValues(two, (name) => (name === "width" ? lit(301) : unset)) === two, true);
  check("settle: caught up (source or panel optimistic) → dropped", settleValues(two, (name) => (name === "width" ? { state: "literal", value: 302, raw: "{302}" } : unset)), {});
  check("settle: changed elsewhere (undo past the base, another edit) → dropped", settleValues(two, (name) => (name === "width" ? lit("fill") : unset)), {});
  const both = holdValues(two, optimisticOf([remove("minWidth")]), valueOf);
  check("settle: only the caught-up prop goes", Object.keys(settleValues(both, (name) => (name === "width" ? lit(302) : lit(40)))), ["minWidth"]);
  check("settle: a remove is caught up when the read is unset", settleValues(both, (name) => (name === "width" ? lit(302) : unset)), {});
  check("release: a refused write lets its values go", releaseValues(two, optimisticOf([set("width", 302)])), {});
  check("release: a later write's value stays", releaseValues(two, optimisticOf([set("width", 301)])) === two, true);
}

check("owned props", [...sizingPropNames].sort(), ["alignSelf", "fillChildren", "height", "maxHeight", "maxWidth", "minHeight", "minWidth", "width"]);

const total = passed + failures.length;
if (failures.length) {
  console.error(`sizingModel selftest: ${failures.length} of ${total} failed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`sizingModel selftest: ${passed}/${total} passed`);
