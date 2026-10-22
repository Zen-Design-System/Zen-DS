// node src/platform/studio/draw/scaleModel.selftest.mjs — Figma's Scale tool (K) as numbers (scaleModel.ts).
import assert from "node:assert/strict";
import { anchorOfCorner, anchoredBox, dragFactor, factorText, insetOps, parseFactor, scaleOps, scaleStatus } from "./scaleModel.ts";

let count = 0;
const test = (name, run) => { run(); count += 1; };
const n = (name, value) => ({ name, kind: "expression", value: String(value) });
const s = (name, value) => ({ name, kind: "string", value });
const ops = (list) => Object.fromEntries(list.map((op) => [op.name, op.value.value]));

test("the field takes 2, 2x, 2×, 200%, 1,5", () => assert.deepEqual(["2", "2x", "2×", "200%", "1,5", " 0.5 "].map(parseFactor), [2, 2, 2, 2, 1.5, 0.5]));
test("the field refuses 0, a word, a minus", () => assert.deepEqual(["0", "abc", "-2", "", "2px", "1000"].map(parseFactor), [null, null, null, null, null, null]));
test("the field shows Figma's 1.5x", () => assert.deepEqual([factorText(1.5), factorText(2), factorText(1 / 3)], ["1.5x", "2x", "0.333x"]));

test("px sizes, stroke and a px gap double", () => {
  const { ops: out, kept } = scaleOps("Shape", [n("width", 120), n("height", 80), n("strokeWeight", 1.5), n("gap", 12), n("rotation", 30), n("opacity", 50)], 2);
  assert.deepEqual(ops(out), { width: 240, height: 160, strokeWeight: 3, gap: 24 });
  assert.equal(kept.size, 0);
});
test("tokens keep their step and are named", () => {
  const { ops: out, kept } = scaleOps("Stack", [s("gap", "md"), s("padding", "lg"), s("radius", "md"), s("width", "fill"), n("width", 320)], 2);
  assert.deepEqual(ops(out), { width: 640 });
  assert.deepEqual([...kept].sort(), ["gap", "padding", "radius"]);
});
test("a text keeps its style; a component its size step", () => {
  assert.deepEqual([...scaleOps("Text", [n("width", 200)], 2).kept], ["text"]);
  assert.deepEqual(ops(scaleOps("Text", [n("width", 200)], 2).ops), { width: 400 });
  assert.deepEqual([...scaleOps("Button", [s("size", "md")], 2).kept], ["sizes"]);
  assert.deepEqual(ops(scaleOps("Icon", [n("size", 20)], 1.5).ops), { size: 30 });
});
test("inside the scaled layer an inset scales; the layer's own inset is the anchor's", () => {
  assert.deepEqual(ops(scaleOps("Shape", [n("insetLeft", 40), n("insetTop", 10)], 2).ops), { insetLeft: 80, insetTop: 20 });
  assert.deepEqual(ops(scaleOps("Shape", [n("insetLeft", 40), n("width", 10)], 2, { ownPlace: true }).ops), { width: 20 });
});
test("a binding or an expression is left as written", () => assert.deepEqual(scaleOps("Box", [{ name: "width", kind: "expression", value: "size * 2" }], 2).ops, []));
test("a size never goes below 1 px", () => assert.deepEqual(ops(scaleOps("Box", [n("width", 1), n("height", 2)], 0.1).ops), { height: 1 }));

test("anchor top-left: the corner stays", () => assert.deepEqual(anchoredBox({ x: 40, y: 20, width: 100, height: 50 }, 2, { x: 0, y: 0 }), { x: 40, y: 20, width: 200, height: 100 }));
test("anchor centre: grows both ways", () => assert.deepEqual(anchoredBox({ x: 40, y: 20, width: 100, height: 50 }, 2, { x: 0.5, y: 0.5 }), { x: -10, y: -5, width: 200, height: 100 }));
test("anchor bottom-right", () => assert.deepEqual(anchoredBox({ x: 40, y: 20, width: 100, height: 50 }, 0.5, { x: 1, y: 1 }), { x: 90, y: 45, width: 50, height: 25 }));
test("two layers scale about the box around them", () => {
  const around = { x: 0, y: 0, width: 200, height: 100 };
  assert.deepEqual(anchoredBox({ x: 100, y: 50, width: 100, height: 50 }, 2, { x: 0, y: 0 }, around), { x: 200, y: 100, width: 200, height: 100 });
});
test("a corner drag keeps the opposite corner", () => assert.deepEqual([anchorOfCorner({ x: 1, y: 1 }), anchorOfCorner({ x: 0, y: 0 }), anchorOfCorner({ x: 1, y: 0 })], [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]));
test("the drag factor follows the diagonal", () => {
  const box = { x: 0, y: 0, width: 100, height: 50 };
  assert.equal(dragFactor(box, { x: 0, y: 0 }, { x: 200, y: 100 }), 2);
  assert.equal(dragFactor(box, { x: 0, y: 0 }, { x: 50, y: 25 }), 0.5);
  assert.equal(dragFactor(box, { x: 0, y: 0 }, { x: -50, y: -50 }), 0.01);
});
test("insets follow the pins: left, right, left-right, centre", () => {
  const next = { x: 40, y: 20, width: 200, height: 100 };
  const inner = { width: 400, height: 300 };
  assert.deepEqual(ops(insetOps({ x: "start", y: "start" }, inner, next).ops), { insetLeft: 40, insetTop: 20 });
  assert.deepEqual(ops(insetOps({ x: "end", y: "end" }, inner, next).ops), { insetRight: 160, insetBottom: 180 });
  assert.deepEqual(ops(insetOps({ x: "stretch", y: "start" }, inner, next).ops), { insetLeft: 40, insetRight: 160, insetTop: 20 });
  const centred = insetOps({ x: "center", y: "start" }, inner, next);
  assert.deepEqual([ops(centred.ops), centred.dropConstraint], [{ insetLeft: 40, insetTop: 20 }, { x: true, y: false }]);
});
test("the status names the steps kept, in order", () => {
  assert.equal(scaleStatus(2, ["text", "gap", "padding", "gap"]), "Scaled 200% · Zen steps kept: gap, padding, text");
  assert.equal(scaleStatus(0.5, []), "Scaled 50%");
});

console.log(`✓ scale model selftest: ${count} checks pass.`);
