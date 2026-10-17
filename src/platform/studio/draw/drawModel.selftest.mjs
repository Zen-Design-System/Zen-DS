// node src/platform/studio/draw/drawModel.selftest.mjs — the draw model (drawModel.ts) and the Shape geometry.
import assert from "node:assert/strict";
import { clickBox, drawBox, drawCode, drawLine, lineBox } from "./drawModel.ts";
import { arcData, arcFromData, ellipseAngle, ellipsePath, normalizeArc, polygonPoints, starPoints } from "../../../components/Shape/geometry.ts";

let count = 0;
const test = (name, run) => { run(); count += 1; };

test("drag corner to corner", () => assert.deepEqual(drawBox({ x: 10, y: 10 }, { x: 70, y: 40 }, { shift: false, alt: false }), { x: 10, y: 10, width: 60, height: 30 }));
test("drag up-left", () => assert.deepEqual(drawBox({ x: 70, y: 40 }, { x: 10, y: 10 }, { shift: false, alt: false }), { x: 10, y: 10, width: 60, height: 30 }));
test("⇧ keeps the sides equal", () => assert.deepEqual(drawBox({ x: 0, y: 0 }, { x: 60, y: 20 }, { shift: true, alt: false }), { x: 0, y: 0, width: 60, height: 60 }));
test("⌥ draws from the centre", () => assert.deepEqual(drawBox({ x: 50, y: 50 }, { x: 70, y: 60 }, { shift: false, alt: true }), { x: 30, y: 40, width: 40, height: 20 }));
test("⇧⌥ square from the centre", () => assert.deepEqual(drawBox({ x: 50, y: 50 }, { x: 60, y: 80 }, { shift: true, alt: true }), { x: 20, y: 20, width: 60, height: 60 }));
test("click = 100 × 100 at the point", () => assert.deepEqual(clickBox("ellipse", { x: 12, y: 8 }), { x: 12, y: 8, width: 100, height: 100 }));
test("click line = 100 long", () => assert.deepEqual(clickBox("line", { x: 0, y: 0 }), { x: 0, y: 0, width: 100, height: 0 }));
test("⇧ line snaps to 45°", () => {
  const { to } = drawLine({ x: 0, y: 0 }, { x: 100, y: 90 }, { shift: true, alt: false });
  assert.ok(Math.abs(to.x - to.y) < 1e-9);
});
test("line box: down-right 45° is Figma −45°", () => {
  const { box, rotation } = lineBox({ x: 0, y: 0 }, { x: 100, y: 100 });
  assert.equal(rotation, -45);
  assert.ok(Math.abs(box.width - Math.SQRT2 * 100) < 1e-9);
  assert.equal(box.y, 50);
});
test("line box: right to left is 180°", () => assert.equal(lineBox({ x: 100, y: 0 }, { x: 0, y: 0 }).rotation, 180));
test("free code", () => assert.equal(drawCode("ellipse", { x: 10.4, y: 20.6, width: 80, height: 40 }, { mode: "free", x: 10.4, y: 20.6 }), '<Shape type="ellipse" position="absolute" insetLeft={10} insetTop={21} width={80} height={40} />'));
test("flow code", () => assert.equal(drawCode("rectangle", { x: 0, y: 0, width: 100, height: 100 }, { mode: "flow" }), '<Shape type="rectangle" width={100} height={100} />'));
test("line code has its rotation, no height", () => assert.equal(drawCode("line", { x: 0, y: 0, width: 141.42, height: 0 }, { mode: "flow" }, -45), '<Shape type="line" width={141} rotation={-45} />'));
test("frame code is a Surface Box", () => assert.equal(drawCode("frame", { x: 0, y: 0, width: 200, height: 120 }, { mode: "free", x: 4, y: 8 }), '<Box position="absolute" insetLeft={4} insetTop={8} width={200} height={120} surface="surface" />'));

// Shape geometry (src/components/Shape/geometry.ts)
test("arc normalises", () => assert.deepEqual(normalizeArc({ start: -90, sweep: 140, ratio: -5 }), { start: 270, sweep: 100, ratio: 0 }));
test("arcData round trip", () => {
  const arc = { start: 90, sweep: 25, ratio: 50 };
  const data = arcData(arc);
  assert.ok(Math.abs(data.startingAngle - Math.PI / 2) < 1e-9 && Math.abs(data.endingAngle - Math.PI) < 1e-9 && data.innerRadius === 0.5);
  assert.deepEqual(arcFromData(data), arc);
});
test("full ellipse path is two arcs", () => assert.equal((ellipsePath(100, 50).match(/A /g) ?? []).length, 2));
test("pie path goes to the centre", () => assert.match(ellipsePath(100, 100, { start: 0, sweep: 25, ratio: 0 }), /L 50 50 Z$/));
test("ring segment has an inner arc", () => assert.equal((ellipsePath(100, 100, { start: 0, sweep: 75, ratio: 50 }).match(/A /g) ?? []).length, 2));
test("ring has outer and inner ellipses", () => assert.equal((ellipsePath(100, 100, { sweep: 100, ratio: 40 }).match(/M /g) ?? []).length, 2));
test("zero sweep draws nothing", () => assert.equal(ellipsePath(100, 100, { sweep: 0 }), ""));
test("angle clockwise from 3 o'clock", () => {
  assert.equal(ellipseAngle(100, 100, { x: 100, y: 50 }), 0);
  assert.equal(ellipseAngle(100, 100, { x: 50, y: 100 }), 90);
  assert.equal(ellipseAngle(200, 100, { x: 100, y: 0 }), 270);
});
test("triangle fills its box (Figma)", () => {
  const points = polygonPoints(100, 80, 3);
  assert.deepEqual(points.map((point) => [Math.round(point.x), Math.round(point.y)]), [[50, 0], [100, 80], [0, 80]]);
});
test("star tips touch the box", () => {
  const points = starPoints(100, 100, 5, 38.2);
  assert.equal(points.length, 10);
  assert.equal(Math.round(Math.min(...points.map((point) => point.y))), 0);
  assert.equal(Math.round(Math.max(...points.map((point) => point.x))), 100);
});

console.log(`drawModel selftest: ${count} passed`);
