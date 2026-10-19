#!/usr/bin/env node
// Self-test of ./penModel.ts (imported directly: Node strips the types): Figma's Pen and Pencil turned into a vector
// layer (plan docs/research/studio-f9-vectors-spec-2026-10-19.md F9a). Run: node src/platform/studio/draw/penModel.selftest.mjs
import { parseVectorPath, vectorBounds, vectorPathData } from "../../../components/Shape/geometry.ts";
import { pencilCommands, penCommands, smoothPoint, snap45, vectorCode, vectorLayer } from "./penModel.ts";

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

if (failures.length) {
  console.error(`✗ penModel selftest: ${failures.length} failed, ${passed} passed\n${failures.map((failure) => `  ${failure}`).join("\n")}`);
  process.exit(1);
}
console.log(`✓ penModel selftest: ${passed} checks pass.`);
