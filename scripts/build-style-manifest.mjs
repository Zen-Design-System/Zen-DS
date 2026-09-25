import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/*
 * Figma local styles → CSS.
 * Source of truth: styles/source/figma/figma-styles.full.json, read with the Figma Plugin API
 * (every paint/effect keeps its bound variable, blur radius and glass parameters).
 * styles/source/figma/styles.json is the plugin export kept for reference/name checks.
 *
 * Conversion rules (match Figma Dev Mode `getCSSAsync()` output, verified 2026-09-24):
 *   - Shadows are listed top-most first in CSS, i.e. the reverse of Figma's effect array.
 *   - Shadow colours use their bound variable: var(--zen-<variable>, <resolved fallback>).
 *   - BACKGROUND_BLUR radius r → backdrop-filter: blur(r / 2); LAYER_BLUR r → filter: blur(r / 2).
 *   - GLASS has no CSS equivalent in Figma codegen; parameters are kept in the manifest only.
 *   - Paint layers are listed top-most first; bound colours use their variable.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exportPath = path.join(root, "styles/source/figma/styles.json");
const fullPath = path.join(root, "styles/source/figma/figma-styles.full.json");
const manifestPath = path.join(root, "src/styles/generated/style-manifest.json");
const cssPath = path.join(root, "src/styles/style-effects.css");
const tokensCssPath = path.join(root, "src/styles/tokens.css");

const exported = JSON.parse(fs.readFileSync(exportPath, "utf8")).styles;
const full = JSON.parse(fs.readFileSync(fullPath, "utf8"));
const definedVariables = new Set(
  [...fs.readFileSync(tokensCssPath, "utf8").matchAll(/(--zen-[\w-]+)\s*:/g)].map((match) => match[1]),
);

const toKebab = (value) =>
  value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
const px = (value) => (value === 0 ? "0" : `${Number(value.toFixed(3))}px`);
const rgba = (color, opacity = 1) => {
  const channel = (value) => Math.round(value * 255);
  const alpha = Number(((color.a ?? 1) * opacity).toFixed(4));
  return `rgba(${channel(color.r)}, ${channel(color.g)}, ${channel(color.b)}, ${alpha})`;
};
const missingVariables = new Set();
const colorRef = (color, variableName, opacity = 1) => {
  const fallback = rgba(color, opacity);
  if (!variableName) return fallback;
  const cssVariable = `--zen-${toKebab(variableName)}`;
  if (!definedVariables.has(cssVariable)) missingVariables.add(`${variableName} (${cssVariable})`);
  const reference = `var(${cssVariable}, ${rgba(color)})`;
  return opacity < 1 ? `color-mix(in srgb, ${reference} ${Number((opacity * 100).toFixed(2))}%, transparent)` : reference;
};

const effectCss = (style) => {
  const visible = style.effects.filter((effect) => effect.visible !== false);
  const shadows = visible
    .filter((effect) => effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW")
    .reverse()
    .map((effect) =>
      [
        effect.type === "INNER_SHADOW" ? "inset" : null,
        px(effect.offset?.x ?? 0),
        px(effect.offset?.y ?? 0),
        px(effect.radius ?? 0),
        px(effect.spread ?? 0),
        colorRef(effect.color, effect.bound?.color),
      ]
        .filter(Boolean)
        .join(" "),
    );
  const backgroundBlur = visible.find((effect) => effect.type === "BACKGROUND_BLUR");
  const layerBlur = visible.find((effect) => effect.type === "LAYER_BLUR");
  const glass = visible.filter((effect) => effect.type === "GLASS");
  return {
    boxShadow: shadows.length ? shadows.join(", ") : "none",
    backdropFilter: backgroundBlur ? `blur(${px(backgroundBlur.radius / 2)})` : null,
    filter: layerBlur ? `blur(${px(layerBlur.radius / 2)})` : null,
    glass: glass.map(({ radius, refraction, depth, lightAngle, lightIntensity, dispersion, splay }) => ({
      radius, refraction, depth, lightAngle, lightIntensity, dispersion, splay,
    })),
  };
};

const gradientAngle = (transform) => {
  // Invert Figma's 2×3 gradientTransform to find the start/end handles in unit node space.
  const [[a, b, c], [d, e, f]] = transform;
  const det = a * e - b * d;
  const invert = (u, v) => [(e * (u - c) - b * (v - f)) / det, (-d * (u - c) + a * (v - f)) / det];
  const [x0, y0] = invert(0, 0.5);
  const [x1, y1] = invert(1, 0.5);
  const degrees = (Math.atan2(x1 - x0, -(y1 - y0)) * 180) / Math.PI;
  return Number((((degrees % 360) + 360) % 360).toFixed(2));
};

const paintLayer = (paint) => {
  if (paint.visible === false) return null;
  const opacity = paint.opacity ?? 1;
  if (paint.type === "SOLID") {
    const color = colorRef(paint.color, paint.bound?.color, opacity);
    return { css: `linear-gradient(${color}, ${color})`, solid: color };
  }
  if (paint.type === "GRADIENT_LINEAR") {
    const stops = paint.gradientStops.map(
      (stop) => `${colorRef(stop.color, stop.bound?.color, opacity)} ${Number((stop.position * 100).toFixed(2))}%`,
    );
    return { css: `linear-gradient(${gradientAngle(paint.gradientTransform)}deg, ${stops.join(", ")})` };
  }
  return { css: null, unsupported: paint.type };
};

const effectStyles = full.effect.map((style) => {
  const token = toKebab(style.name);
  return {
    name: style.name,
    token,
    description: style.description,
    effects: style.effects,
    cssVariable: `--zen-style-${token}-shadow`,
    ...effectCss(style),
  };
});

const paintStyles = full.paint.map((style) => {
  const layers = style.paints.map(paintLayer).filter(Boolean);
  const cssLayers = layers.filter((layer) => layer.css).reverse();
  const single = layers.length === 1 && layers[0].solid;
  return {
    name: style.name,
    token: toKebab(style.name),
    type: style.paints[0]?.type.toLowerCase(),
    paints: style.paints,
    cssVariable: `--zen-style-${toKebab(style.name)}-fill`,
    color: single || null,
    background: cssLayers.length ? cssLayers.map((layer) => layer.css).join(", ") : null,
    unsupportedLayers: layers.filter((layer) => layer.unsupported).map((layer) => layer.unsupported),
  };
});

const manifest = {
  fileName: full.file,
  extractedAt: full.extractedAt,
  counts: {
    colors: paintStyles.length,
    textStyles: full.text.length,
    effectStyles: effectStyles.length,
    gridStyles: full.grid.length,
  },
  colors: paintStyles,
  textStyles: full.text,
  effectStyles,
  gridStyles: full.grid,
};

if (missingVariables.size) {
  throw new Error(`Figma styles reference variables missing from tokens.css:\n${[...missingVariables].join("\n")}`);
}

const css = [
  "/* Generated from styles/source/figma/figma-styles.full.json. Do not edit directly. */",
  ":root {",
  ...effectStyles.flatMap((effect) => [
    `  ${effect.cssVariable}: ${effect.boxShadow};`,
    ...(effect.backdropFilter ? [`  --zen-style-${effect.token}-backdrop-filter: ${effect.backdropFilter};`] : []),
    ...(effect.filter ? [`  --zen-style-${effect.token}-filter: ${effect.filter};`] : []),
  ]),
  ...paintStyles
    .filter((paint) => paint.background)
    .map((paint) => `  ${paint.cssVariable}: ${paint.color ?? paint.background};`),
  "}",
  "",
  ...effectStyles.flatMap((effect) => [
    ...(effect.glass.length ? [`/* ${effect.name}: Figma GLASS effect has no CSS equivalent; see style-manifest.json. */`] : []),
    `.zen-effect-${effect.token} {`,
    `  box-shadow: var(${effect.cssVariable});`,
    ...(effect.backdropFilter ? [`  backdrop-filter: var(--zen-style-${effect.token}-backdrop-filter);`] : []),
    ...(effect.filter ? [`  filter: var(--zen-style-${effect.token}-filter);`] : []),
    "}",
    "",
  ]),
  ...paintStyles
    .filter((paint) => paint.background)
    .flatMap((paint) => [
      ...(paint.unsupportedLayers.length ? [`/* ${paint.name}: ${paint.unsupportedLayers.join(", ")} layer(s) are not expressible in CSS. */`] : []),
      `.zen-fill-${paint.token} {`,
      `  background: ${paint.color ? `var(${paint.cssVariable})` : paint.background};`,
      "}",
      "",
    ]),
].join("\n");

const exportedNames = new Set(exported.effectStyles.map((style) => style.name));
const notInExport = effectStyles.filter((style) => !exportedNames.has(style.name)).map((style) => style.name);

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(cssPath, `${css}\n`);
console.log(
  `Generated ${paintStyles.length} color, ${full.text.length} text, ${effectStyles.length} effect and ${full.grid.length} grid styles.` +
    (notInExport.length ? ` Missing from the plugin export (styles.json): ${notInExport.join(", ")}.` : ""),
);
