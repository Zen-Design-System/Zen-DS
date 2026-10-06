#!/usr/bin/env node
// Layout position selftest (spec docs/research/studio-position-effects-radius-spec-2026-10-03.md §3.6): layoutPosition()
// is inert unless absolute, always writes all four inset vars on the padding ladder, and falls back to left / top for an
// unknown constraint; cornerRadiusValue() keeps the single radius when no corner is set. position.ts imports its CSS and
// extension-less modules, so it is bundled with esbuild (CSS emptied) instead of imported by Node directly.
//   node src/components/Layout/position.selftest.mjs     summary; exit 1 on any failure
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const here = (file) => fileURLToPath(new URL(file, import.meta.url));
async function load(entry) {
  const out = await build({ entryPoints: [here(entry)], bundle: true, write: false, format: "esm", platform: "neutral", loader: { ".css": "empty" }, logLevel: "error" });
  return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`);
}
const { layoutPosition, layoutConstraintsX, layoutConstraintsY, positionPropNames } = await load("./position.ts");
const { cornerRadiusValue, radiusPropNames } = await load("../_shared/corners.ts");

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const inert = { attributes: {}, vars: {} };
const flush = { "--zen-layout-inset-top": "0px", "--zen-layout-inset-right": "0px", "--zen-layout-inset-bottom": "0px", "--zen-layout-inset-left": "0px" };

// Inert unless absolute: unset and static render nothing, even with constraints and insets set.
check("unset", layoutPosition({}), inert);
check("static", layoutPosition({ position: "static", constraintX: "right", insetRight: "sm" }), inert);
check("constraints without absolute", layoutPosition({ constraintX: "center", constraintY: "bottom", insetBottom: "md" }), inert);

// Absolute: defaults left / top, all four vars always written (a nested layer never inherits).
check("absolute defaults", layoutPosition({ position: "absolute" }), {
  attributes: { "data-position": "absolute", "data-constraint-x": "left", "data-constraint-y": "top" },
  vars: flush,
});
check("absolute insets on the padding ladder", layoutPosition({ position: "absolute", constraintX: "left-right", constraintY: "bottom", insetLeft: "sm", insetRight: "medium", insetBottom: "4xl", insetTop: "none" }), {
  attributes: { "data-position": "absolute", "data-constraint-x": "left-right", "data-constraint-y": "bottom" },
  vars: {
    "--zen-layout-inset-top": "0",
    "--zen-layout-inset-right": "var(--zen-spacing-padding-medium)",
    "--zen-layout-inset-bottom": "var(--zen-spacing-padding-4-xlarge)",
    "--zen-layout-inset-left": "var(--zen-spacing-padding-small)",
  },
});
check("four vars, always", Object.keys(layoutPosition({ position: "absolute", insetTop: "xs" }).vars).length, 4);

// Every listed constraint passes through; unknown values (Figma SCALE, typos) fall back to left / top.
for (const x of layoutConstraintsX) check(`constraintX ${x}`, layoutPosition({ position: "absolute", constraintX: x }).attributes["data-constraint-x"], x);
for (const y of layoutConstraintsY) check(`constraintY ${y}`, layoutPosition({ position: "absolute", constraintY: y }).attributes["data-constraint-y"], y);
check("constraintX scale → left", layoutPosition({ position: "absolute", constraintX: "scale" }).attributes["data-constraint-x"], "left");
check("constraintY scale → top", layoutPosition({ position: "absolute", constraintY: "scale" }).attributes["data-constraint-y"], "top");
check("constraint lists", [layoutConstraintsX, layoutConstraintsY], [["left", "right", "left-right", "center"], ["top", "bottom", "top-bottom", "center"]]);

// Corner radius: no corner set → exactly radiusValue(radius); otherwise TL TR BR BL with unset corners on radius (or 0).
check("radius only", cornerRadiusValue("xl", {}), "var(--zen-corner-radius-xlarge)");
check("nothing set", cornerRadiusValue(undefined, {}), undefined);
check("chat tail", cornerRadiusValue("xl", { radiusBottomRight: "xs" }), "var(--zen-corner-radius-xlarge) var(--zen-corner-radius-xlarge) var(--zen-corner-radius-xsmall) var(--zen-corner-radius-xlarge)");
check("sheet top", cornerRadiusValue(undefined, { radiusTopLeft: "3xl", radiusTopRight: "3xl" }), "var(--zen-corner-radius-3-xlarge) var(--zen-corner-radius-3-xlarge) 0px 0px");
check("image md fallback", cornerRadiusValue("md", { radiusTopLeft: "none" }), "0 var(--zen-corner-radius-base) var(--zen-corner-radius-base) var(--zen-corner-radius-base)");

// Owned prop sets (Studio filters them out of the generic Properties list).
check("position props", [...positionPropNames].sort(), ["constraintX", "constraintY", "insetBottom", "insetLeft", "insetRight", "insetTop", "position"]);
check("radius props", [...radiusPropNames].sort(), ["radius", "radiusBottomLeft", "radiusBottomRight", "radiusTopLeft", "radiusTopRight"]);

if (failures.length) {
  console.error(`position selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`position selftest: ${passed} passed`);
