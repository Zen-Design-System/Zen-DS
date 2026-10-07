#!/usr/bin/env node
// Zen Studio Position section selftest: the EditOp[] each gesture writes, from ./positionModel.ts (imported directly:
// Node strips the types), without a server or a browser.
//   node src/platform/studio/position/positionModel.selftest.mjs     summary; exit 1 on any failure
import { constraintOps, floatOps, floatPlan, floatSummary, pinOf, pinOfConstraint, readInsets, snap, unfloatOps } from "./positionModel.ts";

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const ladder = [["none", 0], ["3xs", 2], ["2xs", 4], ["xs", 8], ["sm", 12], ["md", 16], ["lg", 20], ["xl", 24], ["2xl", 32], ["3xl", 40], ["4xl", 48]].map(([key, px]) => ({ key, px }));
const lit = (value) => ({ state: "literal", value, raw: "" });
const unset = { state: "unset" };
const set = (name, value) => ({ op: "setProp", name, value: { kind: "string", value } });
const remove = (name) => ({ op: "removeProp", name });
/** An axis inside a parent padded 16 on both sides. */
const axis = (start, end, pad = 16) => ({ start, end, padStart: pad, padEnd: pad });

// snap: nearest step, ties to the smaller one, past 4xl clamped.
check("snap exact", snap(12, ladder), { key: "sm", px: 12, clamped: false, from: 12 });
check("snap nearest", snap(13, ladder).key, "sm");
check("snap tie → smaller", snap(10, ladder).key, "xs");
check("snap zero", snap(0.4, ladder).key, "none");
check("snap negative → none", snap(-3, ladder).key, "none");
check("snap past the ladder: clamped", snap(137, ladder), { key: "4xl", px: 48, clamped: true, from: 137 });

// pinOf: spanning the content box → stretch; centred → center; else the nearer edge.
check("pin spans content", pinOf(axis(16, 16), false), "stretch");
check("pin fill", pinOf(axis(40, 200), true), "stretch");
check("pin centred", pinOf(axis(100, 100.5), false), "center");
check("pin near start", pinOf(axis(16, 200), false), "start");
check("pin near end", pinOf(axis(200, 12), false), "end");
check("pin flush both edges with no padding: stretch", pinOf(axis(0, 0, 0), false), "stretch");
check("pin spans but sizes the parent (tallest in a row): start", pinOf({ ...axis(0, 0, 0), shared: false }, false), "start");
check("pin sizes the parent but Fill: stretch", pinOf({ ...axis(0, 0, 0), shared: false }, true), "stretch");
check("pin of constraints", [pinOfConstraint("x", "left-right"), pinOfConstraint("y", "bottom"), pinOfConstraint("x", undefined)], ["stretch", "end", "start"]);
check("insets read", [readInsets("x", "stretch"), readInsets("y", "end"), readInsets("x", "center")], [["insetLeft", "insetRight"], ["insetBottom"], []]);

// floatPlan: a full-width card near the top → left and right md, top md.
{
  const plan = floatPlan({ x: axis(16, 16), y: axis(16, 300) }, ladder);
  check("float full width", plan.props, { position: "absolute", constraintX: "left-right", insetLeft: "md", insetRight: "md", insetTop: "md" });
  check("float full width pins", plan.pins, { x: "stretch", y: "start" });
}
// A button in the bottom-right corner → right sm, bottom xs.
check("float bottom right", floatPlan({ x: axis(240, 12), y: axis(180, 8) }, ladder).props, { position: "absolute", constraintX: "right", insetRight: "sm", constraintY: "bottom", insetBottom: "xs" });
// Flush top-left: only position (left / top and none are the defaults).
check("float flush top left", floatPlan({ x: axis(0, 300, 0), y: axis(0, 200, 0) }, ladder).props, { position: "absolute" });
// Far from every edge: the nearer one, clamped to 4xl.
{
  const plan = floatPlan({ x: axis(90, 400), y: axis(137, 300) }, ladder);
  check("float far: clamped", [plan.props, plan.snaps.map((entry) => entry.snap.clamped)], [{ position: "absolute", insetLeft: "4xl", insetTop: "4xl" }, [true, true]]);
  check("float summary says so", floatSummary("Card", plan.snaps, plan.pins), "Card ignores auto layout · left 4xl · 48 (was 90), top 4xl · 48 (was 137) · offsets stop at 4xl");
}
// Fill and Align in parent stop working: removed; the filled axis stretches.
{
  const plan = floatPlan({ x: axis(16, 120), y: axis(16, 300) }, ladder, { width: lit("fill"), height: unset, alignSelf: lit("center") });
  check("float fill: removes", plan.removes, ["width", "alignSelf"]);
  check("float fill: ops", floatOps(plan), [remove("width"), remove("alignSelf"), set("position", "absolute"), set("constraintX", "left-right"), set("insetLeft", "md"), set("insetRight", "4xl"), set("insetTop", "md")]);
}
// Centred on both axes: no insets.
check("float centred", floatPlan({ x: axis(100, 100), y: axis(50, 50) }, ladder).props, { position: "absolute", constraintX: "center", constraintY: "center" });

// unfloat: every written position prop goes, a spread one stays (the spread still feeds it).
check("unfloat", unfloatOps({ position: lit("absolute"), constraintX: lit("right"), constraintY: unset, insetTop: unset, insetRight: lit("sm"), insetBottom: unset, insetLeft: { state: "spread", via: "{...p}", live: "xs" } }), [remove("position"), remove("constraintX"), remove("insetRight")]);

// constraintOps: Left → Right keeps the place (right inset measured), drops the left one.
{
  const written = { position: lit("absolute"), constraintX: unset, insetLeft: lit("md"), insetRight: unset, width: unset };
  const { ops } = constraintOps("x", "end", axis(16, 24), ladder, written);
  check("constraint left → right", ops, [set("constraintX", "right"), remove("insetLeft"), set("insetRight", "xl")]);
}
// Right → Left (default): the constraint prop goes.
check("constraint right → left", constraintOps("x", "start", axis(8, 300), ladder, { constraintX: lit("right"), insetRight: lit("sm"), insetLeft: unset }).ops, [remove("constraintX"), set("insetLeft", "xs"), remove("insetRight")]);
// → Left and right: both insets, and a written width goes.
check("constraint → stretch", constraintOps("x", "stretch", axis(16, 16), ladder, { constraintX: unset, insetLeft: lit("md"), insetRight: unset, width: lit(320) }).ops, [set("constraintX", "left-right"), set("insetRight", "md"), remove("width")]);
// → Center: every inset of the axis goes.
check("constraint → center", constraintOps("y", "center", axis(20, 20), ladder, { constraintY: lit("bottom"), insetTop: unset, insetBottom: lit("sm") }).ops, [set("constraintY", "center"), remove("insetBottom")]);
// Align (flush): the edge, no inset.
check("align right", constraintOps("x", "end", axis(30, 30), ladder, { constraintX: unset, insetLeft: lit("md"), insetRight: unset }, { flush: true }).ops, [set("constraintX", "right"), remove("insetLeft")]);
check("align top again: nothing to write", constraintOps("y", "start", axis(0, 50), ladder, { constraintY: unset, insetTop: unset, insetBottom: unset }, { flush: true }).ops, []);

if (failures.length) {
  console.error(`✗ Position model selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ Position model selftest: ${passed} checks pass.`);
