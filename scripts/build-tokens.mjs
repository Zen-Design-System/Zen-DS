import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HIGH_CONTRAST_MODE, HIGH_CONTRAST_ROLES, highContrastValues, neutralRampsOf } from "./high-contrast.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "tokens/source/figma");
const cssPath = path.join(root, "src/styles/tokens.css");
const tsPath = path.join(root, "src/tokens/generated.ts");
const catalogPath = path.join(root, "src/tokens/catalog.generated.json");

const sourceFiles = [
  ["global-colors.json", "global-colors"],
  ["global-dimensions.json", "global-dimensions"],
  ["base-colors-project.json", "base-colors-project"],
  ["mode-colors-semantic.json", "mode-colors-semantic"],
  ["component-theme.json", "component-colors-theme"],
  ["component-size.json", "component-size"],
  ["spacing.json", "spacing"],
  ["corner-radius.json", "corner-radius"],
  ["emphasis-level.json", "emphasis-level"],
  ["breakpoint-grids.json", "breakpoint-grids"],
  ["typography-configuration.json", "typography-configuration"],
];

const toKebab = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const collections = sourceFiles.map(([fileName, slug]) => {
  const json = JSON.parse(fs.readFileSync(path.join(sourceDir, fileName), "utf8"));
  const sourceName = Object.keys(json)[0];
  const source = json[sourceName];
  return { slug, sourceName, modes: source.modes, tokens: source.tokens };
});

const catalog = collections.flatMap((collection) =>
  collection.tokens.map((token) => ({
    ...token,
    collectionSlug: collection.slug,
    collectionName: collection.sourceName,
    modes: collection.modes,
  })),
);

const byName = new Map(catalog.map((token) => [token.name, token]));
if (byName.size !== catalog.length) {
  throw new Error("Duplicate token names detected. Run `npm run tokens:check` for details.");
}

const aliasPattern = /^\{(.+)\}$/;
for (const token of catalog) {
  for (const value of Object.values(token.valuesByMode)) {
    const alias = typeof value === "string" ? value.match(aliasPattern)?.[1] : null;
    if (alias && !byName.has(alias)) {
      throw new Error(`Missing alias target: ${token.name} → ${alias}`);
    }
  }
}

const cssName = (name) => `--zen-${toKebab(name)}`;
const isWeight = (name) => /font-weight/i.test(name);

const formatCssValue = (token, value) => {
  if (typeof value === "string") {
    const alias = value.match(aliasPattern)?.[1];
    if (alias) return `var(${cssName(alias)})`;
    if (token.type === "STRING") return JSON.stringify(value);
    return value;
  }
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") return isWeight(token.name) ? String(value) : `${value}px`;
  throw new Error(`Unsupported value for ${token.name}: ${JSON.stringify(value)}`);
};

const modeSelector = (slug, mode, modeIndex) => {
  const value = toKebab(mode);
  const selectors = {
    "global-colors": ":root",
    "global-dimensions": ":root",
    "base-colors-project": `[data-brand="${value}"]`,
    "mode-colors-semantic": `[data-theme="${value}"]`,
    "component-colors-theme": `[data-component-theme="${value}"]`,
    "component-size": `[data-density="${value}"]`,
    spacing: ":root",
    "corner-radius": `[data-radius="${value}"]`,
    "emphasis-level": `[data-emphasis="${value}"]`,
    "breakpoint-grids": `[data-breakpoint="${value}"]`,
    "typography-configuration": `[data-typography="${value}"]`,
  };
  const selector = selectors[slug];
  if (!selector) throw new Error(`No CSS selector configured for ${slug}`);
  // Component colours alias the semantic (data-theme) colours, and a custom property resolves where it is declared.
  // A nested light/dark scope (e.g. one card switched to dark) would keep the outer mode's component colours, so
  // each component theme is re-declared on every [data-theme] inside it (later blocks win at equal specificity).
  if (slug === "component-colors-theme") {
    const nested = `${selector},\n${selector} [data-theme]`;
    // The default theme's nested selector is wrapped in :where() (specificity 0): otherwise `:root [data-theme]` (0,2,0)
    // would beat an explicit `[data-component-theme="brand-s1"]` (0,1,0) on the same element — e.g. the app root that
    // carries both data-theme and data-component-theme — and switching the component theme would do nothing.
    return modeIndex === 0 ? `:root,\n:where(:root [data-theme]),\n${nested}` : nested;
  }
  if (modeIndex === 0 && selector !== ":root") return `:root,\n${selector}`;
  return selector;
};

const cssBlocks = [];
for (const collection of collections) {
  collection.modes.forEach((mode, modeIndex) => {
    if (collection.slug === "global-colors" && mode === HIGH_CONTRAST_MODE) return; // its own block, below
    cssBlocks.push(`/* ${collection.sourceName} / ${mode} */`);
    cssBlocks.push(`${modeSelector(collection.slug, mode, modeIndex)} {`);
    for (const token of collection.tokens) {
      cssBlocks.push(`  ${cssName(token.name)}: ${formatCssValue(token, token.valuesByMode[mode])};`);
      // House rule: a surface filled with a Subtle / Pale / Surface-Alt background carries no drop shadow.
      // A component background that aliases one of those in this theme gets `<token>-shadow-off: none`;
      // components write `box-shadow: var(<their background>-shadow-off, <shadow>)` so the shadow drops per theme.
      if (collection.slug === "component-colors-theme" && /background/i.test(token.name)) {
        const value = token.valuesByMode[mode];
        const alias = typeof value === "string" ? value.match(aliasPattern)?.[1] : undefined;
        if (alias && /^Color\/Background\//.test(alias) && /(\/(Subtle|Pale)(\/|$)|Subtle\/|Pale\/|\/Surface\/Alt$|-Subtle$|-Pale$)/.test(alias)) {
          cssBlocks.push(`  ${cssName(token.name)}-shadow-off: 0 0 #0000;`); // an empty shadow layer: combinable in a shadow list, unlike `none`
        }
      }
    }
    cssBlocks.push("}", "");
  });
}

// Zen-High-Contrast (`data-contrast="high"`, ZenProvider `contrast`): the Global Colors values for Increase Contrast.
// Taken from the Global Colors mode of that name once Figma holds it; until then generated by scripts/high-contrast.mjs
// (the Zen Plugin runs the same algorithm). Only the values that differ are written. A custom property resolves where
// it is declared, so the Base Colors aliases are re-declared under a contrast scope too (`:where()`: an explicit
// data-brand on the same element keeps its own aliases); the semantic and component colours follow through the
// data-theme the scope carries (ZenProvider sets it).
{
  const globalColors = collections.find((collection) => collection.slug === "global-colors");
  const baseColors = collections.find((collection) => collection.slug === "base-colors-project");
  const figmaMode = globalColors.modes.find((mode) => mode === HIGH_CONTRAST_MODE);
  const values = figmaMode
    ? new Map(globalColors.tokens.map((token) => [token.name, token.valuesByMode[figmaMode]]))
    : highContrastValues({ tokens: globalColors.tokens }, neutralRampsOf(baseColors));
  const changed = globalColors.tokens.filter((token) => values.has(token.name) && String(values.get(token.name)).toUpperCase() !== String(token.valuesByMode[globalColors.modes[0]]).toUpperCase());
  cssBlocks.push(`/* ${globalColors.sourceName} / ${HIGH_CONTRAST_MODE} (${figmaMode ? "Figma" : "generated by scripts/high-contrast.mjs"}): ${changed.length} values */`);
  cssBlocks.push('[data-contrast="high"] {');
  for (const token of changed) cssBlocks.push(`  ${cssName(token.name)}: ${formatCssValue(token, values.get(token.name))};`);
  cssBlocks.push("}", "");
  // `contrast="standard"` inside a high-contrast scope puts the Zen values back.
  cssBlocks.push(`/* ${globalColors.sourceName} / ${globalColors.modes[0]} again, for a standard scope inside a high one */`);
  cssBlocks.push('[data-contrast="standard"] {');
  for (const token of changed) cssBlocks.push(`  ${cssName(token.name)}: ${formatCssValue(token, token.valuesByMode[globalColors.modes[0]])};`);
  cssBlocks.push("}", "");
  cssBlocks.push(`/* ${baseColors.sourceName} / ${baseColors.modes[0]}, re-declared under a contrast scope */`);
  cssBlocks.push(":where([data-contrast]) {");
  for (const token of baseColors.tokens) cssBlocks.push(`  ${cssName(token.name)}: ${formatCssValue(token, token.valuesByMode[baseColors.modes[0]])};`);
  cssBlocks.push("}", "");

  // The algorithm raises fixed steps (HIGH_CONTRAST_ROLES). Warn when a semantic text or Subtle border token aliases
  // a Neutral alpha step outside them: that token keeps its Zen value in high contrast.
  const semantic = collections.find((collection) => collection.slug === "mode-colors-semantic");
  const neutralRamps = neutralRampsOf(baseColors);
  const resolveGlobal = (value, depth = 0) => {
    const alias = typeof value === "string" ? value.match(aliasPattern)?.[1] : null;
    if (!alias || depth > 4) return null;
    const target = byName.get(alias);
    if (target?.collectionSlug === "global-colors") return alias;
    return target ? resolveGlobal(target.valuesByMode[target.modes[0]], depth + 1) : null;
  };
  const warned = new Set();
  for (const token of semantic.tokens) {
    const text = /^Color\/Content\//.test(token.name) && !/Disabled/.test(token.name);
    const border = /^Color\/Border\/.*\/Subtle\//.test(token.name) && !/Disabled/.test(token.name);
    if (!text && !border) continue;
    for (const value of Object.values(token.valuesByMode)) {
      const step = resolveGlobal(value)?.match(/^(?:Light|Dark)\/([A-Za-z]+)-Alpha\/(\d+)$/);
      if (!step || !neutralRamps.has(step[1])) continue;
      const steps = text ? HIGH_CONTRAST_ROLES.neutralText : HIGH_CONTRAST_ROLES.border;
      if (!steps.includes(Number(step[2])) && !(text && Number(step[2]) === 12) && !warned.has(`${token.name} ${step[0]}`)) {
        warned.add(`${token.name} ${step[0]}`);
        console.warn(`${HIGH_CONTRAST_MODE}: ${token.name} uses ${step[0]}, not a ${text ? "text" : "border"} step (${steps.join(", ")}), so it keeps its Zen value in high contrast.`);
      }
    }
  }
}

// Code-owned motion tokens (tokens/source/motion.json): Figma variables cannot hold easing curves, so they live in
// code and stay out of the Figma catalog. Movement (distances, scale steps) is a factor that reduced motion sets to 0.
const motionSource = JSON.parse(fs.readFileSync(path.join(root, "tokens/source/motion.json"), "utf8")).Motion;
const motionValue = (token, value) => {
  if (token.type === "DURATION") return `${value}ms`;
  if (token.type === "EASING") return value.join(",") === "0,0,1,1" ? "linear" : `cubic-bezier(${value.join(", ")})`;
  if (token.type === "FACTOR") return String(value);
  throw new Error(`Unsupported motion token type for ${token.name}: ${token.type}`);
};
const reduced = motionSource.tokens.filter((token) => token.reducedMotion !== undefined);
cssBlocks.push(
  "/* Motion (code-owned, tokens/source/motion.json) */",
  ":root {",
  ...motionSource.tokens.map((token) => `  ${cssName(token.name)}: ${motionValue(token, token.value)};`),
  "}",
  "@media (prefers-reduced-motion: reduce) {",
  "  :root {",
  ...reduced.map((token) => `    ${cssName(token.name)}: ${motionValue(token, token.reducedMotion)};`),
  "  }",
  "}",
  "",
);

const css = [
  "/* Generated from the 11 Figma JSON exports and the code-owned motion tokens. Do not edit directly. */",
  ...cssBlocks,
].join("\n");

const tokenReferences = Object.fromEntries(
  [...byName.keys()].sort().map((name) => [name, `var(${cssName(name)})`]),
);
const collectionContract = Object.fromEntries(
  collections.map((collection) => [
    collection.slug,
    {
      name: collection.sourceName,
      modes: collection.modes,
      variableCount: collection.tokens.length,
    },
  ]),
);
const ts = [
  "/* Generated from the 11 Figma JSON exports. Do not edit directly. */",
  `export const tokens = ${JSON.stringify(tokenReferences, null, 2)} as const;`,
  "",
  `export const tokenCollections = ${JSON.stringify(collectionContract, null, 2)} as const;`,
  "",
  "/** Code-owned motion tokens (tokens/source/motion.json): CSS reference, value and when to use each. */",
  `export const motionTokens = ${JSON.stringify(Object.fromEntries(motionSource.tokens.map((token) => [token.name, { css: `var(${cssName(token.name)})`, type: token.type, value: motionValue(token, token.value), ...(token.reducedMotion !== undefined ? { reducedMotion: motionValue(token, token.reducedMotion) } : {}), use: token.use }])), null, 2)} as const;`,
  "",
  `export const motionRules = ${JSON.stringify(motionSource.rules, null, 2)} as const;`,
  "",
  "export type TokenName = keyof typeof tokens;",
  "export type MotionTokenName = keyof typeof motionTokens;",
  "export type TokenCollectionName = keyof typeof tokenCollections;",
  "",
].join("\n");

fs.mkdirSync(path.dirname(cssPath), { recursive: true });
fs.mkdirSync(path.dirname(tsPath), { recursive: true });
fs.writeFileSync(cssPath, css);
fs.writeFileSync(tsPath, ts);
fs.writeFileSync(
  catalogPath,
  `${JSON.stringify({ collections: collectionContract, tokens: catalog }, null, 2)}\n`,
);

console.log(`Generated ${catalog.length} tokens across ${collections.length} collections.`);
