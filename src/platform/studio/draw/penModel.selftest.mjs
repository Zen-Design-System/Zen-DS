#!/usr/bin/env node
// Self-test of ./penModel.ts (imported directly: Node strips the types): Figma's Pen and Pencil turned into a vector
// layer (plan docs/research/studio-f9-vectors-spec-2026-10-19.md F9a). Run: node src/platform/studio/draw/penModel.selftest.mjs
import { parseVectorPath, vectorBounds, vectorPathData } from "../../../components/Shape/geometry.ts";
import { moveHandle, movePoint, pencilCommands, penCommands, removePoint, smoothPoint, snap45, subpathCommands, subpathsOf, vectorCode, vectorLayer } from "./penModel.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};
const corner = (x, y) => ({ at: { x, y }, in: null, out: null });

check("⇧: 45° steps", [snap45({ x: 0, y: 0 }, { x: 10, y: 1 }), snap45({ x: 0, y: 0 }, { x: 10, y: 9 })].map((p) => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 })), [{ x: 10, y: 0 }, { x: 9.5, y: 9.5 }]);
check("smooth point: mirrored handles", smoothPoint({ x: 10, y: 10 }, { x: 20, y: 10 }), { at: { x: 10, y: 10 }, out: { x: 20, y: 10 }, in: { x: 0, y: 10 } });
check("smooth point: ⌥ keeps the in handle", smoothPoint({ x: 10, y: 10 }, { x: 20, y: 10 }, true, { x: 10, y: 0 }).in, { x: 10, y: 0 });

const open = penCommands([corner(10, 10), corner(50, 10), corner(50, 40)], false);
check("corners: lines", vectorPathData(open), "M 10 10 L 50 10 L 50 40");
const closed = penCommands([corner(10, 10), corner(50, 10), corner(50, 40)], true);
check("closed: back to the first point, Z", vectorPathData(closed), "M 10 10 L 50 10 L 50 40 L 10 10 Z");
const curve = penCommands([smoothPoint({ x: 0, y: 20 }, { x: 10, y: 0 }), corner(40, 20)], false);
check("a handle makes a cubic", vectorPathData(curve), "M 0 20 C 10 0 40 20 40 20");

const layer = vectorLayer(open, vectorBounds(open));
const d = vectorPathData(layer.commands);
check("the layer at the path's box, d from its corner", [layer.x, layer.y, layer.width, layer.height, d, layer.viewBox], [10, 10, 40, 30, "M 0 0 L 40 0 L 40 30", "0 0 40 30"]);
check("free: floating at its X / Y", vectorCode(layer, d, "free"), '<Shape type="vector" position="absolute" insetLeft={10} insetTop={10} width={40} height={30} d="M 0 0 L 40 0 L 40 30" viewBox="0 0 40 30" />');
check("flow: sized only", vectorCode(layer, d, "flow"), '<Shape type="vector" width={40} height={30} d="M 0 0 L 40 0 L 40 30" viewBox="0 0 40 30" />');
check("the written d reads back as a vector path", parseVectorPath(d)?.length, 3);

// Pencil: a quarter circle sampled densely becomes a few cubics within 1 px, starting and ending where the trail does.
const trail = Array.from({ length: 60 }, (_, i) => { const a = (i / 59) * (Math.PI / 2); return { x: 100 * Math.cos(a), y: 100 * Math.sin(a) }; });
const pencil = pencilCommands(trail, 1);
check("pencil: M then cubics", [pencil[0].command, pencil.slice(1).every((entry) => entry.command === "C")], ["M", true]);
check("pencil: few curves for a smooth trail", pencil.length <= 4, true);
check("pencil: ends where the trail ends", pencil.at(-1).points[2], trail.at(-1));
check("pencil: a trail of one point draws nothing", pencilCommands([{ x: 1, y: 1 }]), []);

// Vertex edit: commands ↔ points with handles, round trip; moves; Delete.
const wave = parseVectorPath("M 0 20 C 13 0 27 0 40 20 C 53 40 67 40 80 20");
const wavePaths = subpathsOf(wave);
check("sub-paths: points with handles", wavePaths.map((path) => path.points.map((point) => [point.at.x, point.in ? 1 : 0, point.out ? 1 : 0])), [[[0, 0, 1], [40, 1, 1], [80, 1, 0]]]);
check("round trip", vectorPathData(subpathCommands(wavePaths)), "M 0 20 C 13 0 27 0 40 20 C 53 40 67 40 80 20");
const box = subpathsOf(parseVectorPath("M 0 0 L 10 0 L 10 10 Z M 20 20 L 30 20"));
check("two sub-paths, the first closed", box.map((path) => [path.points.length, path.closed]), [[3, true], [2, false]]);
check("a closed path ending on its start keeps one point there", subpathsOf(parseVectorPath("M 0 0 L 10 0 L 0 0 Z"))[0].points.length, 2);
check("a quadratic raised to its cubic", vectorPathData(subpathCommands(subpathsOf(parseVectorPath("M 0 0 Q 15 30 30 0")))), "M 0 0 C 10 20 20 20 30 0");
check("move a point: its handles move with it", vectorPathData(subpathCommands(movePoint(wavePaths, { path: 0, index: 1 }, { x: 5, y: -5 }))), "M 0 20 C 13 0 32 -5 45 15 C 58 35 67 40 80 20");
check("move a handle, the other mirrored", vectorPathData(subpathCommands(moveHandle(wavePaths, { path: 0, index: 1 }, "out", { x: 50, y: 20 }, true))), "M 0 20 C 13 0 16.146 20 40 20 C 50 20 67 40 80 20");
check("Delete a point", vectorPathData(subpathCommands(removePoint(box, { path: 0, index: 1 }))), "M 0 0 L 10 10 M 20 20 L 30 20");
check("Delete leaves a sub-path of one point: it goes", vectorPathData(subpathCommands(removePoint(box, { path: 1, index: 0 }))), "M 0 0 L 10 0 L 10 10 L 0 0 Z");

if (failures.length) {
  console.error(`✗ penModel selftest: ${failures.length} failed, ${passed} passed\n${failures.map((failure) => `  ${failure}`).join("\n")}`);
  process.exit(1);
}
console.log(`✓ penModel selftest: ${passed} checks pass.`);
