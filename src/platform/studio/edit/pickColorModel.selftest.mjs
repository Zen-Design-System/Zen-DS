#!/usr/bin/env node
// Self-test of Pick color's model (./pickColorModel.ts, imported directly: Node strips the types): what a picked colour
// paints on a layer, which palette option it takes (its variable exactly, else the nearest colour), and the ops.
// Run: node src/platform/studio/edit/pickColorModel.selftest.mjs
import { chooseOption, pickOps, pickTargetOf, rgbOfHex } from "./pickColorModel.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

check("targets: a Shape's fill, a frame's surface, a text tone, nothing on a Button", [pickTargetOf("Shape", null), pickTargetOf("Stack", null), pickTargetOf("Text", ["neutral-base", "accent"]), pickTargetOf("Button", null)],
  [{ prop: "fill", palette: "fill" }, { prop: "surface", palette: "surface" }, { prop: "tone", palette: "tone" }, null]);
check("targets: a dotted name is its component", pickTargetOf("Layout.Box", null), { prop: "surface", palette: "surface" });

const options = [
  { option: "accent-solid", cssVar: "--zen-color-background-accent-solid-default", rgb: { r: 247, g: 85, b: 201 } },
  { option: "info-solid", cssVar: "--zen-color-background-info-solid-default", rgb: { r: 15, g: 115, b: 255 } },
  { option: "neutral-subtle", cssVar: "--zen-color-background-neutral-subtle-default", rgb: { r: 240, g: 240, b: 240 } },
  { option: "unreadable", cssVar: "--zen-none", rgb: null },
];
check("its variable exactly, whatever the colour", chooseOption(options, ["--zen-color-content-accent", "--zen-color-background-info-solid-default"], { r: 0, g: 0, b: 0 }), { option: "info-solid", exact: true });
check("else the nearest colour", chooseOption(options, ["--zen-color-content-accent"], { r: 250, g: 90, b: 190 }), { option: "accent-solid", exact: false });
check("a near-white pixel → the subtle grey", chooseOption(options, [], rgbOfHex("#F4F4F4")), { option: "neutral-subtle", exact: false });
check("nothing to match", chooseOption(options, [], null), null);

const written = (entries) => new Map(entries);
check("ops: the prop", pickOps({ prop: "fill", palette: "fill" }, "info-solid", written([["fill", "accent-solid"]])), [{ op: "setProp", name: "fill", value: { kind: "string", value: "info-solid" } }]);
check("ops: a fill takes a gradient's place", pickOps({ prop: "surface", palette: "surface" }, "pale", written([["gradient", null]])), [{ op: "setProp", name: "surface", value: { kind: "string", value: "pale" } }, { op: "removeProp", name: "gradient" }]);
check("ops: a tone leaves a gradient alone; the same colour writes nothing", [pickOps({ prop: "tone", palette: "tone" }, "accent", written([["tone", "accent"], ["gradient", null]]))], [[]]);
check("hex: EyeDropper's sRGBHex", [rgbOfHex("#0f73ff"), rgbOfHex("rgb(1,2,3)"), rgbOfHex(undefined)], [{ r: 15, g: 115, b: 255 }, null, null]);

if (failures.length) {
  console.error(`✗ Pick color model selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ Pick color model selftest: ${passed} checks pass.`);
