#!/usr/bin/env node
// Gradient fill selftest (Studio parity, spec docs/research/studio-fill-gradient-smoothing-eyedropper-spec-2026-10-22.md
// §1): the CSS layers a frame or rectangle paints a gradient with, an SVG shape's gradient, and Figma's gradient paint
// both ways (tools/studio/figma-gradient.mjs: CSS angle ↔ gradientTransform, stops on colour variables).
//   node src/components/_shared/gradient.selftest.mjs   summary; exit 1 on any failure
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { gradientAngle, gradientFillOf, gradientFillProps, gradientTransform } from "../../../tools/studio/figma-gradient.mjs";

// gradient.ts imports ../Shape/paint without an extension (the bundler's way): bundled with esbuild, as
// Layout/position.selftest.mjs does, instead of imported by Node directly.
const here = (file) => fileURLToPath(new URL(file, import.meta.url));
async function load(entry) {
  const out = await build({ entryPoints: [here(entry)], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "error" });
  return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`);
}
const { gradientLayers, gradientStops, gradientStyle, svgGradient } = await load("./gradient.ts");

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n      got      ${a}\n      expected ${e}`);
}
const near = (label, actual, expected) => check(label, actual.map((row) => row.map((value) => Math.round(value * 1000) / 1000)), expected);

const two = [{ color: "accent-solid", at: 0 }, { color: "info-solid", at: 100 }];
const accent = "var(--zen-color-background-accent-solid-default)";
const info = "var(--zen-color-background-info-solid-default)";

// The library's CSS.
check("no gradient: nothing", gradientStyle(undefined), { attributes: {}, vars: {} });
check("one stop: nothing", gradientLayers({ type: "linear", stops: [two[0]] }), null);
check("unknown type: nothing", gradientLayers({ type: "conic", stops: two }), null);
check("unknown slug left out", gradientStops({ type: "linear", stops: [...two, { color: "no-such", at: 50 }] }).length, 2);
check("stops sorted by place", gradientStops({ type: "linear", stops: [two[1], two[0]] }).map((stop) => stop.at), [0, 100]);
check("stops without a place spread evenly", gradientStops({ type: "linear", stops: [{ color: "accent-solid" }, { color: "info-solid" }, { color: "neutral-solid" }] }).map((stop) => stop.at), [0, 50, 100]);
check("linear: down by default", gradientLayers({ type: "linear", stops: two }).image, `linear-gradient(180deg, ${accent} 0%, ${info} 100%)`);
check("linear: its angle", gradientLayers({ type: "linear", angle: 45, stops: two }).image, `linear-gradient(45deg, ${accent} 0%, ${info} 100%)`);
check("radial: closest side", gradientLayers({ type: "radial", stops: two }).image, `radial-gradient(closest-side, ${accent} 0%, ${info} 100%)`);
check("angular: from 3 o'clock", gradientLayers({ type: "angular", stops: two }).image, `conic-gradient(from 90deg, ${accent} 0%, ${info} 100%)`);
const diamond = gradientLayers({ type: "diamond", stops: two });
check("diamond: four quadrants, stops at half", diamond.image.split("linear-gradient(").length - 1, 4);
check("diamond: the edge midpoint is 100%", diamond.image.includes(`${accent} 0%, ${info} 50%`), true);
check("diamond: each a quarter", diamond.size, "50% 50%, 50% 50%, 50% 50%, 50% 50%");
check("style: data-gradient and its vars", Object.keys(gradientStyle({ type: "radial", stops: two }).vars), ["--zen-gradient", "--zen-gradient-size", "--zen-gradient-position", "--zen-gradient-repeat"]);
check("style: the type on the attribute", gradientStyle({ type: "angular", stops: two }).attributes, { "data-gradient": "angular" });
check("svg: down", svgGradient({ type: "linear", stops: two }), { kind: "linear", x1: 0.5, y1: 0, x2: 0.5, y2: 1, stops: gradientStops({ type: "linear", stops: two }) });
check("svg: right", (({ x1, y1, x2, y2 }) => [x1, y1, x2, y2])(svgGradient({ type: "linear", angle: 90, stops: two })), [0, 0.5, 1, 0.5]);
check("svg: 45° corner to corner", (({ x1, y1, x2, y2 }) => [x1, y1, x2, y2])(svgGradient({ type: "linear", angle: 45, stops: two })), [0, 1, 1, 0]);
check("svg: angular draws radial", svgGradient({ type: "angular", stops: two }).kind, "radial");

// Figma's transform (measured in the Zen file 2026-10-22).
near("linear 90°: identity", gradientTransform("GRADIENT_LINEAR", 90, 200, 100), [[1, 0, 0], [0, 1, 0]]);
near("linear 180°: top → bottom", gradientTransform("GRADIENT_LINEAR", 180, 200, 100), [[0, 1, 0], [-1, 0, 1]]);
near("linear 45° in a square: towards the top right", gradientTransform("GRADIENT_LINEAR", 45, 100, 100), [[0.5, -0.5, 0.5], [0.5, 0.5, 0]]);
near("linear 45° in a 2:1 box: by the box's projection", gradientTransform("GRADIENT_LINEAR", 45, 200, 100), [[0.667, -0.333, 0.333], [0.333, 0.667, 0]]);
near("radial: identity", gradientTransform("GRADIENT_RADIAL", 30, 200, 100), [[1, 0, 0], [0, 1, 0]]);
near("angular at 90: identity", gradientTransform("GRADIENT_ANGULAR", 90), [[1, 0, 0], [0, 1, 0]]);
near("angular at 180: a quarter turn", gradientTransform("GRADIENT_ANGULAR", 180), [[0, 1, 0], [-1, 0, 1]]);
for (const angle of [0, 30, 45, 90, 135, 180, 225, 300]) {
  const back = gradientAngle("GRADIENT_LINEAR", gradientTransform("GRADIENT_LINEAR", angle, 320, 120), 320, 120);
  check(`linear ${angle}° back`, back, { angle, exact: true });
}
check("angular 200° back", gradientAngle("GRADIENT_ANGULAR", gradientTransform("GRADIENT_ANGULAR", 200)), { angle: 200, exact: true });
check("linear handles moved off the centre", gradientAngle("GRADIENT_LINEAR", [[1, 0, 0.2], [0, 1, 0]], 100, 100).exact, false);
check("radial handles moved", gradientAngle("GRADIENT_RADIAL", [[2, 0, -0.5], [0, 2, -0.5]]).exact, false);

// Push: the element's prop as the node's gradientFill.
const literal = (value) => ({ kind: "literal", value });
const prop = (gradient) => ({ props: { gradient: { kind: "object", fields: Object.fromEntries(Object.entries(gradient).map(([name, value]) => [name, name === "stops" ? { kind: "array", items: value.map((stop) => ({ kind: "object", fields: Object.fromEntries(Object.entries(stop).map(([key, item]) => [key, literal(item)])) })) } : literal(value)])) } } });
check("push: linear stops on variables", gradientFillOf(prop({ type: "linear", angle: 45, stops: two })), { type: "GRADIENT_LINEAR", angle: 45, stops: [{ position: 0, color: "Color/Background/Accent/Solid/Default" }, { position: 1, color: "Color/Background/Info/Solid/Default" }] });
check("push: linear defaults to 180", gradientFillOf(prop({ type: "linear", stops: two })).angle, 180);
check("push: radial has no angle", "angle" in gradientFillOf(prop({ type: "radial", angle: 30, stops: two })), false);
check("push: one known stop is none", gradientFillOf(prop({ type: "linear", stops: [two[0], { color: "no-such", at: 100 }] })), null);
check("push: no prop", gradientFillOf({ props: {} }), null);

// Pull: the read paint back as the prop, and its notes.
const plain = (value) => (value?.kind === "literal" ? value.value : value?.kind === "array" ? value.items.map(plain) : value?.kind === "object" ? Object.fromEntries(Object.entries(value.fields).map(([name, field]) => [name, plain(field)])) : undefined);
const pulled = (fill) => { const out = gradientFillProps(fill, literal); return { gradient: plain(out.props.gradient), notes: out.notes }; };
const read = { type: "GRADIENT_LINEAR", transform: gradientTransform("GRADIENT_LINEAR", 45, 320, 120), stops: [{ position: 0, color: "Color/Background/Accent/Solid/Default" }, { position: 1, color: "Color/Background/Info/Solid/Default" }], width: 320, height: 120 };
check("pull: linear 45° back", pulled(read), { gradient: { type: "linear", angle: 45, stops: two }, notes: [] });
check("pull: 180 is the default (no angle)", pulled({ ...read, transform: gradientTransform("GRADIENT_LINEAR", 180, 320, 120) }).gradient, { type: "linear", stops: two });
check("pull: the push's JSON (angle, no transform)", pulled(gradientFillOf(prop({ type: "angular", angle: 200, stops: two }))).gradient, { type: "angular", angle: 200, stops: two });
check("pull: a raw-colour stop is left out and noted", pulled({ ...read, stops: [...read.stops, { position: 0.5, color: null }] }).notes, ["its gradient stop on a raw colour is left out: bind it to a colour variable in Figma"]);
check("pull: one stop left: no gradient", pulled({ ...read, stops: [read.stops[0], { position: 1, color: "Color/Content/Neutral/Default" }] }), { notes: ["its gradient stop on Color/Content/Neutral/Default is left out: a gradient takes the fill colours (Color/Background)", "its linear gradient is left out: it needs two stops on colour variables"] });
check("pull: moved radial handles noted", pulled({ type: "GRADIENT_RADIAL", transform: [[2, 0, -0.5], [0, 2, -0.5]], stops: read.stops, width: 100, height: 100 }).notes, ["its radial gradient's handles were moved in Figma: drawn from the centre to the edges"]);
check("pull: an image paint is no gradient", gradientFillProps({ type: "IMAGE" }, literal), { props: {}, notes: [] });

if (failures.length) {
  console.error(`✗ gradient selftest: ${failures.length} failed, ${passed} passed`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`✓ gradient selftest: ${passed} checks pass.`);
