#!/usr/bin/env node
// Self-test of ./path-ops.mjs with Skia's PathOps (pathkit-wasm, loaded from its wasm file): shapes' outlines, boolean
// groups, Flatten, Outline stroke and the plan that keeps a page's boolean results up to date (plan F9b).
// Run: node tools/studio/path-ops.selftest.mjs
import fs from "node:fs";
import { createRequire } from "node:module";
import { applyOps } from "./jsx-source.mjs";
import { arcsToCubics, booleanResult, flattenResult, outlineStrokeResult, placedPath, planBooleans, shapeOutline } from "./path-ops.mjs";

const require = createRequire(import.meta.url);
const { default: PathKitInit } = await import("pathkit-wasm/bin/pathkit.js");
const kit = await PathKitInit({ wasmBinary: fs.readFileSync(require.resolve("pathkit-wasm/bin/pathkit.wasm")) });

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};
const boundsOf = (d) => { const path = kit.FromSVGString(d); const b = path.computeTightBounds(); path.delete(); return [b.fLeft, b.fTop, b.fRight, b.fBottom].map((v) => Math.round(v * 10) / 10); };
const square = (x, y, size = 100) => ({ type: "rectangle", insetLeft: x, insetTop: y, width: size, height: size });

check("outline: a rectangle, a line has none", [shapeOutline({ type: "rectangle", width: 10, height: 5 }), shapeOutline({ type: "line", width: 10 })], ["M 0 0 L 10 0 L 10 5 L 0 5 Z", null]);
check("outline: a vector fitted to its size", shapeOutline({ type: "vector", width: 20, height: 10, d: "M 0 0 L 10 5", viewBox: "0 0 10 5" }), "M 0 0 L 20 10");
const placed = placedPath(kit, { ...square(10, 20, 50), rotation: 90 });
const pb = placed.computeTightBounds();
check("placed: at its insets, turned about its centre", [pb.fLeft, pb.fTop, pb.fRight, pb.fBottom].map((v) => Math.round(v)), [10, 20, 60, 70]);
placed.delete();

check("arcs to cubics: a full circle is four quarter cubics, a quarter one", [(arcsToCubics(shapeOutline({ type: "ellipse", width: 100, height: 100 })).match(/C/g) ?? []).length, arcsToCubics("M 10 0 A 10 10 0 0 1 20 10")], [4, "M 10 0 C 15.523 0 20 4.477 20 10"]);
// A ticket stub: a rounded rectangle minus two half circles — compact cubics, not hundreds of quadratics.
const ticket = booleanResult(kit, "subtract", [{ type: "rectangle", insetLeft: 0, insetTop: 0, width: 240, height: 96, radius: "md" }, { type: "ellipse", insetLeft: -12, insetTop: 36, width: 24, height: 24 }, { type: "ellipse", insetLeft: 228, insetTop: 36, width: 24, height: 24 }]);
check("a boolean of rounded shapes stays short (cubics)", [ticket.d.length < 600, /Q/.test(ticket.d), boundsOf(ticket.d)], [true, false, [0, 0, 240, 96]]);

const two = [square(0, 0), square(50, 50)];
check("union: the box around both", boundsOf(booleanResult(kit, "union", two).d), [0, 0, 150, 150]);
check("subtract: the first minus the second (its box stays)", boundsOf(booleanResult(kit, "subtract", two).d), [0, 0, 100, 100]);
check("intersect: the overlap", boundsOf(booleanResult(kit, "intersect", two).d), [50, 50, 100, 100]);
check("exclude: both, the overlap a hole", [boundsOf(booleanResult(kit, "exclude", two).d), (booleanResult(kit, "exclude", two).d.match(/M/g) ?? []).length >= 2], [[0, 0, 150, 150], true]);
check("a ring: an ellipse minus a smaller one", boundsOf(booleanResult(kit, "subtract", [{ type: "ellipse", insetLeft: 0, insetTop: 0, width: 100, height: 100 }, { type: "ellipse", insetLeft: 25, insetTop: 25, width: 50, height: 50 }]).d), [0, 0, 100, 100]);
check("no outline: null", booleanResult(kit, "union", [{ type: "line", width: 10 }]), null);

const flat = flattenResult(kit, [square(10, 10, 20), square(100, 50, 20)]);
check("flatten: one vector over both, its d from its corner, two sub-paths", [flat.x, flat.y, flat.width, flat.height, (flat.d.match(/M/g) ?? []).length], [10, 10, 110, 60, 2]);
const outline = outlineStrokeResult(kit, { type: "line", insetLeft: 0, insetTop: 50, width: 100, strokeWeight: 4 });
check("outline stroke: a line's 4 px stroke as a 100 × 4 vector on it", [outline.x, outline.y, outline.width, outline.height], [0, 48, 100, 4]);
const inside = outlineStrokeResult(kit, { ...square(0, 0), strokeWeight: 10 });
check("outline stroke inside: within the rectangle", [inside.x, inside.y, inside.width, inside.height], [0, 0, 100, 100]);

const page = `// @zen-page {"format":1,"title":"B"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Box, Shape } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="B" device="phone">
        <Box width={300} height={200}>
          <Shape type="boolean" operation="subtract" position="absolute" insetLeft={10} insetTop={10} width={100} height={60}>
            <Shape type="rectangle" position="absolute" insetLeft={0} insetTop={0} width={100} height={60} />
            <Shape type="ellipse" position="absolute" insetLeft={70} insetTop={0} width={60} height={60} />
          </Shape>
        </Box>
      </Screen>
    </Board>
  );
}
`;
const [plan] = planBooleans(kit, page, { components: new Set(["Box", "Shape"]) });
check("plan: the stale group's d, viewBox and fill rule (PathOps results are even-odd)", [plan?.loc, plan?.ops.map((op) => op.name)], ["12:10", ["d", "viewBox", "fillRule"]]);
const written = applyOps(page, plan.loc, "Shape", plan.ops, { file: "local:b.zen.tsx" });
check("plan: written, the page is up to date", [Boolean(written.code), planBooleans(kit, written.code, { components: new Set(["Box", "Shape"]) })], [true, []]);
check("plan: the result is the rectangle with the ellipse's bite", boundsOf(/ d="([^"]+)"/.exec(written.code)[1]), [0, 0, 100, 60]);

if (failures.length) {
  console.error(`✗ path-ops selftest: ${failures.length} failed, ${passed} passed\n${failures.map((failure) => `  ${failure}`).join("\n")}`);
  process.exit(1);
}
console.log(`✓ path-ops selftest: ${passed} checks pass.`);
