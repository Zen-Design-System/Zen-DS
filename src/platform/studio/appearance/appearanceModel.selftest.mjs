#!/usr/bin/env node
// Self-test of the Appearance / Effects model (./appearanceModel.ts, imported directly: Node strips the types).
// Run: node src/platform/studio/appearance/appearanceModel.selftest.mjs
import { cornerClear, cornerPick, defaultEffect, EFFECT_STYLES, effectAvailability, effectKey, effectWarnings, isMixed, uniformClear, uniformPick } from "./appearanceModel.ts";

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

if (failures.length) {
  console.error(`appearanceModel selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ Appearance model selftest: ${passed} checks pass.`);
