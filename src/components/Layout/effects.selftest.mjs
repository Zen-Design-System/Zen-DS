#!/usr/bin/env node
// Box effects gating selftest (spec docs/research/studio-position-effects-radius-spec-2026-10-03.md §3.6): a CSS assertion
// that effects.css cannot paint a drop shadow on Subtle, Pale, Surface-Alt or no fill (component-usage-rules §9), that the
// background blur needs a translucent fill, that every listed style has exactly one rule on generated --zen-style-* tokens,
// and that `clip` is overflow: clip. Also checks effectStyleKey() against the generated .zen-effect-* class names.
//   node src/components/Layout/effects.selftest.mjs     summary; exit 1 on any failure
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (file) => fileURLToPath(new URL(file, import.meta.url));
const out = await build({ entryPoints: [here("./effects.ts")], bundle: true, write: false, format: "esm", platform: "neutral", loader: { ".css": "empty" }, logLevel: "error" });
const { boxEffectStyles, effectStyleKey, effectPropNames, boxEffects } = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`);

const css = readFileSync(here("./effects.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const generated = readFileSync(here("../../styles/style-effects.css"), "utf8");

let passed = 0;
const failures = [];
function check(label, ok, detail = "") {
  if (ok) passed += 1;
  else failures.push(`${label}${detail ? `\n    ${detail}` : ""}`);
}

const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => ({ selector: m[1].trim(), body: m[2].trim() }));
const effectRules = rules.filter((rule) => rule.selector.includes("[data-effect-style="));

// One rule per style, each keyed by the same value effectStyleKey() writes.
for (const style of boxEffectStyles) {
  const key = effectStyleKey(style);
  const matching = effectRules.filter((rule) => rule.selector.includes(`[data-effect-style="${key}"]`));
  check(`${style}: one rule`, matching.length === 1, `found ${matching.length}`);
  check(`${style}: generated class .zen-effect-${key} exists`, generated.includes(`.zen-effect-${key} {`));
}
check("no rule for an unlisted style", effectRules.length === boxEffectStyles.length, `${effectRules.length} rules for ${boxEffectStyles.length} styles`);

for (const rule of effectRules) {
  const isShadow = /\[data-effect-style="shadow-/.test(rule.selector);
  const surfaces = [...rule.selector.matchAll(/\[data-surface="([^"]+)"\]/g)].map((m) => m[1]);
  // Every value is a generated effect-style token: no raw shadow, blur, offset or colour.
  const values = rule.body.split(";").map((d) => d.trim()).filter(Boolean).map((d) => d.slice(d.indexOf(":") + 1).trim());
  check(`${rule.selector}: token values only`, values.every((v) => /^var\(--zen-style-[\w-]+\)$/.test(v)), rule.body);
  check(`${rule.selector}: is a .zen-box rule`, rule.selector.startsWith(".zen-box"));
  if (isShadow) {
    // §9: a drop shadow only on the Surface fill, never Subtle / Pale / Surface-Alt, never without a fill.
    check(`${rule.selector}: gated on surface="surface" only`, surfaces.length === 1 && surfaces[0] === "surface", `surfaces ${JSON.stringify(surfaces)}`);
    check(`${rule.selector}: paints box-shadow only`, /^box-shadow:\s*var\(--zen-style-shadow-(bottom|top)-level-[1-4]-shadow\);?$/.test(rule.body), rule.body);
  } else {
    // Effect/Overlay: blur only behind a translucent Subtle or Pale fill; no shadow.
    check(`${rule.selector}: gated on subtle or pale`, surfaces.length > 0 && surfaces.every((s) => s === "subtle" || s === "pale"), `surfaces ${JSON.stringify(surfaces)}`);
    check(`${rule.selector}: no box-shadow`, !/box-shadow/.test(rule.body), rule.body);
  }
}

// Nothing else in effects.css may cast a shadow (an ungated rule would reach every fill).
for (const rule of rules.filter((r) => !effectRules.includes(r))) check(`${rule.selector}: no shadow outside the gated rules`, !/box-shadow|backdrop-filter|filter:/.test(rule.body), rule.body);
check("clip is overflow: clip", rules.some((r) => r.selector === '.zen-box[data-clip="true"]' && /^overflow:\s*clip;?$/.test(r.body)));

// effectStyleKey and boxEffects.
check("key: Shadow/Bottom/Level-1", effectStyleKey("Shadow/Bottom/Level-1") === "shadow-bottom-level-1");
check("key: Effect/Overlay", effectStyleKey("Effect/Overlay") === "effect-overlay");
check("key: reserved Effect/Popover is refused", effectStyleKey("Effect/Popover") === undefined);
check("key: unset", effectStyleKey(undefined) === undefined);
check("boxEffects unset renders nothing", JSON.stringify(boxEffects({})) === JSON.stringify({ "data-effect-style": undefined, "data-clip": undefined }));
check("boxEffects clip", boxEffects({ clip: true })["data-clip"] === "true" && boxEffects({ clip: false })["data-clip"] === undefined);
check("effect props", JSON.stringify([...effectPropNames].sort()) === JSON.stringify(["clip", "effectStyle"]));

if (failures.length) {
  console.error(`effects selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`effects selftest: ${passed} passed`);
