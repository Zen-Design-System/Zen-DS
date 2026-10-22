#!/usr/bin/env node
// Self-test of the Appearance / Effects model (./appearanceModel.ts, imported directly: Node strips the types).
// Run: node src/platform/studio/appearance/appearanceModel.selftest.mjs
import fs from "node:fs";
import { addGradientStop, cardThemeEffect, cornerClear, cornerPick, defaultEffect, EFFECT_STYLES, effectAvailability, effectKey, effectLayers, effectWarnings, gradientCode, gradientOf, isMixed, removeGradientStop, retypeGradient, setGradientStop, startGradient, uniformClear, uniformPick, widestGapAt } from "./appearanceModel.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};
const set = (name, value) => ({ op: "setProp", name, value: { kind: "string", value } });
const remove = (name) => ({ op: "removeProp", name });

// Canonical corner writes (spec §3.3 / §4.3).
check("uniform pick drops the corners", uniformPick({ radius: "md", corners: { radiusTopLeft: "xl" } }, "lg"), [set("radius", "lg"), remove("radiusTopLeft")]);
check("uniform clear", uniformClear({ radius: "md", corners: { radiusBottomRight: "xs" } }), [remove("radius"), remove("radiusBottomRight")]);
check("uniform clear with nothing written", uniformClear({ corners: {} }), []);
check("chat tail: one corner differs", cornerPick({ radius: "xl", corners: {} }, "radiusBottomRight", "xs"), [set("radiusBottomRight", "xs")]);
check("the last differing corner back to radius: removed", cornerPick({ radius: "xl", corners: { radiusBottomRight: "xs" } }, "radiusBottomRight", "xl"), [remove("radiusBottomRight")]);
check("all four equal after a pick: radius only", cornerPick({ radius: "md", corners: { radiusTopLeft: "lg", radiusTopRight: "lg", radiusBottomRight: "lg" } }, "radiusBottomLeft", "lg"), [set("radius", "lg"), remove("radiusTopLeft"), remove("radiusTopRight"), remove("radiusBottomRight")]);
check("sheet top from nothing", cornerPick({ corners: {} }, "radiusTopLeft", "3xl"), [set("radiusTopLeft", "3xl")]);
check("a corner equal to radius, not written: nothing", cornerPick({ radius: "sm", corners: {} }, "radiusTopLeft", "sm"), []);
check("corner clear", [cornerClear({ radius: "sm", corners: { radiusTopLeft: "lg" } }, "radiusTopLeft"), cornerClear({ corners: {} }, "radiusTopLeft")], [[remove("radiusTopLeft")], []]);
check("mixed", [isMixed({ radius: "md", corners: {} }), isMixed({ radius: "md", corners: { radiusTopLeft: "xl" } }), isMixed({ corners: { radiusTopLeft: "xl" } })], [false, true, true]);

// Effects (spec §4.2).
const shadow = EFFECT_STYLES[0];
const blur = EFFECT_STYLES.find((style) => style.kind === "blur");
check("9 styles, keys match style-effects.css", [EFFECT_STYLES.length, effectKey("Shadow/Bottom/Level-1"), effectKey("Effect/Overlay")], [9, "shadow-bottom-level-1", "effect-overlay"]);
check("shadow availability", ["surface", "subtle", "surface-alt", undefined].map((surface) => effectAvailability(shadow, surface)), [{ ok: true }, { ok: false, reason: "Not on a tinted fill" }, { ok: false, reason: "Not on a tinted fill" }, { ok: false, reason: "Needs the Surface fill" }]);
check("blur availability", ["pale", "surface"].map((surface) => effectAvailability(blur, surface).ok), [true, false]);
check("+ Add effect", [defaultEffect("surface"), defaultEffect("surface", "bottom"), defaultEffect("pale"), "reason" in defaultEffect(undefined), "reason" in defaultEffect("surface-alt")], [{ style: "Shadow/Bottom/Level-1" }, { style: "Shadow/Top/Level-1" }, { style: "Effect/Overlay" }, true, true]);
check("warnings: shadow on a tinted fill", effectWarnings({ effectStyle: "Shadow/Bottom/Level-1", surface: "subtle" }).map((w) => w.fixLabel), ["Remove"]);
check("warnings: shadow without a fill", effectWarnings({ effectStyle: "Shadow/Bottom/Level-2" }).map((w) => w.fix), [[set("surface", "surface")]]);
check("warnings: shadow + border", effectWarnings({ effectStyle: "Shadow/Bottom/Level-1", surface: "surface", border: "pale" }).map((w) => w.fixLabel), ["Remove border"]);
check("warnings: blur on an opaque fill", effectWarnings({ effectStyle: "Effect/Overlay", surface: "surface" }).length, 1);
check("no warnings when it renders", [effectWarnings({ effectStyle: "Shadow/Bottom/Level-1", surface: "surface" }).length, effectWarnings({ effectStyle: "Effect/Overlay", surface: "pale" }).length, effectWarnings({}).length], [0, 0, 0]);
check("card themes: shadow, blur, none; defaults per card; not a card", [
  cardThemeEffect("Card", undefined), cardThemeEffect("MetricCard", "semi-pale"), cardThemeEffect("ChartCard", undefined), cardThemeEffect("Card", "border"), cardThemeEffect("Box", "shadow"),
], [{ theme: "shadow", style: "Shadow/Bottom/Level-1" }, { theme: "semi-pale", style: "Effect/Overlay" }, { theme: "default", style: null }, { theme: "border", style: null }, null]);
// Effect settings: the layers of the real manifest, in Figma order.
const manifest = JSON.parse(fs.readFileSync(new URL("../../../styles/generated/style-manifest.json", import.meta.url), "utf8"));
const manifestStyle = (name) => (manifest.effectStyles ?? []).find((style) => style.name === name);
const level1 = effectLayers(manifestStyle("Shadow/Bottom/Level-1")?.effects ?? []);
check("effect layers: Level-1's first drop shadow", level1[0], "Drop shadow · X 0 · Y 4 · Blur 8 · Spread −4 · Shadow/Neutral/Base");
check("effect layers: the overlay's background blur at the CSS radius", effectLayers(manifestStyle("Effect/Overlay")?.effects ?? []), ["Background blur · 50"]);
check("every Box effect style is in the manifest", EFFECT_STYLES.every((style) => manifestStyle(style.name)), true);

// Fill › Gradient (spec 2026-10-22 §1).
const two = [{ color: "accent-solid", at: 0 }, { color: "info-solid", at: 100 }];
check("gradient: read from what the element renders", gradientOf({ state: "bound", live: { type: "linear", angle: 45, stops: two }, expression: "" }), { type: "linear", angle: 45, stops: two });
check("gradient: read from its code", gradientOf({ state: "bound", expression: '{ type: "radial", stops: [{ color: "accent-solid", at: 0 }, { color: "info-solid", at: 100 },] }' }), { type: "radial", stops: two });
check("gradient: none unset or unknown", [gradientOf({ state: "unset" }), gradientOf({ state: "bound", live: { type: "conic", stops: two } })], [null, null]);
check("gradient: code leaves the default angle out", [gradientCode({ type: "linear", angle: 180, stops: two }), gradientCode({ type: "angular", angle: 200, stops: two }), gradientCode({ type: "radial", angle: 30, stops: [two[0]] })],
  ['{ type: "linear", stops: [{ color: "accent-solid", at: 0 }, { color: "info-solid", at: 100 }] }', '{ type: "angular", angle: 200, stops: [{ color: "accent-solid", at: 0 }, { color: "info-solid", at: 100 }] }', '{ type: "radial", stops: [{ color: "accent-solid", at: 0 }] }']);
check("gradient: a new one fades its colour to transparent", [startGradient("linear", "info-solid"), startGradient("diamond", undefined).stops[0].color], [{ type: "linear", stops: [{ color: "info-solid", at: 0 }, { color: "neutral-flat", at: 100 }] }, "accent-solid"]);
check("gradient: retype keeps stops; an angle only between angled types", [retypeGradient({ type: "linear", angle: 45, stops: two }, "angular").angle, "angle" in retypeGradient({ type: "linear", angle: 45, stops: two }, "radial")], [45, false]);
check("gradient: + adds a stop in the widest gap, in the colour before it", addGradientStop({ type: "linear", stops: [{ color: "accent-solid", at: 0 }, { color: "info-solid", at: 20 }, { color: "neutral-flat", at: 100 }] }).stops.at(-1), { color: "info-solid", at: 60 });
check("gradient: a stop at a place (a click on the bar)", [addGradientStop({ type: "linear", stops: two }, 12.4).stops.at(-1), widestGapAt({ type: "linear", stops: [two[0]] })], [{ color: "accent-solid", at: 12 }, 50]);
check("gradient: keeps two stops", [removeGradientStop({ type: "linear", stops: two }, 0).stops.length, removeGradientStop({ type: "linear", stops: [...two, two[1]] }, 0).stops.length], [2, 2]);
check("gradient: a stop's place is a whole percent in 0–100", setGradientStop({ type: "linear", stops: two }, 1, { at: 140.4 }).stops[1].at, 100);

if (failures.length) {
  console.error(`appearanceModel selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ Appearance model selftest: ${passed} checks pass.`);
