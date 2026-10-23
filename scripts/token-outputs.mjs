// The token build's outputs (tokens.css, generated.ts, the catalog) from the Figma collections, as text. Pure: the
// files come in through `readSource`, so scripts/build-tokens.mjs (from disk) and the Zen Studio dev server (with the
// Variables window's drafts, docs/research/studio-figma-native-parity-2026-10-17.md §10) build the same CSS.
import { HIGH_CONTRAST_MODE, HIGH_CONTRAST_ROLES, highContrastValues, neutralRampsOf } from "./high-contrast.mjs";

/** The collections whose modes are a ZenProvider axis (each a data-* attribute, modeSelector below), by axis name. */
export const MODE_AXES = {
  "base-colors-project": "brand",
  "mode-colors-semantic": "theme",
  "component-colors-theme": "componentTheme",
  "component-size": "density",
  "corner-radius": "radius",
  "emphasis-level": "emphasis",
  "breakpoint-grids": "breakpoint",
  "typography-configuration": "typography",
};

/** The 11 Figma JSON exports in tokens/source/figma and the slug each is built under. */
export const SOURCE_FILES = [
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

/**
 * The collections of a tokens/source/figma listing (file names) and their slugs: the 11 Figma exports first, in their
 * order, then the collections made in Zen Studio (Studio Variables, user 2026-10-23: "chỉ một mode (:root)"), by file
 * name, each under its file name.
 */
export function sourceFiles(names) {
  const known = new Set(SOURCE_FILES.map(([file]) => file));
  const created = [...new Set(names)].filter((name) => /^[a-z0-9-]+\.json$/.test(name) && !known.has(name)).sort();
  return [...SOURCE_FILES, ...created.map((file) => [file, file.replace(/\.json$/, "")])];
}
/** A collection made in Zen Studio (not one of the 11 Figma exports): one mode, declared on :root. */
export const isCreatedSlug = (slug) => !SOURCE_FILES.some(([, known]) => known === slug);

/** The docs' manifest entries (tokens/source/figma.collections.json) of the collections made in Zen Studio. */
const MADE_IN = "Zen Studio";

/**
 * The manifest with its entries for the collections made in Zen Studio written from those collections (user
 * 2026-10-23: the Design Tokens page lists a new collection under the group Studio asked for): the 11 Figma entries
 * as they are, then one per made collection, by slug (`madeIn: "Zen Studio"`; its counts read from the collection).
 */
export function collectionsManifest(manifest, made) {
  const entry = ({ slug, sourceName, modes, tokens, body }) => {
    const types = {};
    for (const token of tokens) types[token.type] = (types[token.type] ?? 0) + 1;
    return {
      slug, name: sourceName, layer: body.layer ?? "semantic", variableCount: tokens.length, modes, types,
      hiddenVariableCount: tokens.filter((token) => token.hiddenFromPublishing === true).length,
      purpose: body.purpose ?? "", codeAxis: null, madeIn: MADE_IN,
    };
  };
  const kept = manifest.collections.filter((collection) => collection.madeIn !== MADE_IN);
  return { ...manifest, collections: [...kept, ...[...made].sort((a, b) => (a.slug < b.slug ? -1 : 1)).map(entry)] };
}

/** The manifest's text as the file writes it: arrays and objects of plain values on one line while they fit 160. */
export function manifestText(value) {
  const inline = (v) => {
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return `[${v.map(inline).join(", ")}]`;
    const entries = Object.entries(v);
    return entries.length ? `{ ${entries.map(([key, item]) => `${JSON.stringify(key)}: ${inline(item)}`).join(", ")} }` : "{}";
  };
  const write = (v, indent, lead) => {
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    const flat = inline(v);
    const nested = (Array.isArray(v) ? v : Object.values(v)).some((item) => item && typeof item === "object");
    if (!nested && indent.length + lead + flat.length <= 160) return flat;
    const inner = `${indent}  `;
    if (Array.isArray(v)) return `[\n${v.map((item) => inner + write(item, inner, 0)).join(",\n")}\n${indent}]`;
    return `{\n${Object.entries(v).map(([key, item]) => `${inner}${JSON.stringify(key)}: ${write(item, inner, JSON.stringify(key).length + 2)}`).join(",\n")}\n${indent}}`;
  };
  return `${write(value, "", 0)}\n`;
}

/**
 * `readSource(fileName)` → the parsed JSON of tokens/source/figma/<fileName>; `motion` → tokens/source/motion.json
 * parsed. Returns { css, ts, catalog (the catalog file's text), count, collections }. Throws on duplicate names and
 * missing alias targets, as the build does.
 */
export function tokenOutputs({ readSource, files = SOURCE_FILES, motion, warn = console.warn }) {
  const toKebab = (value) =>
    value
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

  const collections = files.map(([fileName, slug]) => {
    const json = readSource(fileName);
    const sourceName = Object.keys(json)[0];
    const source = json[sourceName];
    if (isCreatedSlug(slug) && source.modes.length !== 1) throw new Error(`${sourceName} (${fileName}): a collection made in Zen Studio has one mode only (:root), not ${source.modes.length}`);
    return { slug, sourceName, modes: source.modes, tokens: source.tokens, body: source };
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

  // Old names of renamed variables (`formerNames`, Zen Studio): an alias "{Old/Name}" another collection still writes
  // reads the variable under its new name (Figma's aliases follow the variable; the repo's catch up at the next sync).
  const renamed = new Map(catalog.flatMap((token) => (Array.isArray(token.formerNames) ? token.formerNames : []).filter((former) => !byName.has(former)).map((former) => [former, token.name])));
  const aliasPattern = /^\{(.+)\}$/;
  for (const token of catalog) {
    for (const value of Object.values(token.valuesByMode)) {
      const alias = typeof value === "string" ? value.match(aliasPattern)?.[1] : null;
      if (alias && !byName.has(alias) && !renamed.has(alias)) {
        throw new Error(`Missing alias target: ${token.name} → ${alias}`);
      }
    }
  }

  const cssName = (name) => `--zen-${toKebab(name)}`;
  const isWeight = (name) => /font-weight/i.test(name);

  const formatCssValue = (token, value) => {
    if (typeof value === "string") {
      const alias = value.match(aliasPattern)?.[1];
      if (alias) return `var(${cssName(renamed.get(alias) ?? alias)})`;
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
    // A collection made in Zen Studio has its one mode on :root.
    const selector = selectors[slug] ?? (isCreatedSlug(slug) ? ":root" : null);
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

  // A variable renamed in Zen Studio keeps its old names (`formerNames`, Studio Variables v2, user 2026-10-23): each is
  // declared beside it, in every block that declares it (a custom property resolves where it is declared), as
  // `--zen-old: var(--zen-new)`, so code and aliases that read the old name keep working while the harness warns.
  const formerLines = (token) => (Array.isArray(token.formerNames) ? token.formerNames : []).map((former) => `  ${cssName(former)}: var(${cssName(token.name)}); /* renamed to ${token.name} */`);
  const cssBlocks = [];
  // House rule: a surface filled with a Subtle / Pale / Surface-Alt background carries no drop shadow. A component
  // background that aliases one of those in a theme gets `<token>-shadow-off: 0 0 #0000` there; components write
  // `box-shadow: var(<their background>-shadow-off, <shadow>)` so the shadow drops per theme. Every other theme declares
  // the companion `initial` (the guaranteed-invalid value, so the fallback shadow applies): without it a theme nested
  // inside a tinted one (Neutral-S4 inside Neutral-S3) would inherit the outer theme's empty shadow (2026-09-29 finding).
  const tintedAlias = (value) => {
    const alias = typeof value === "string" ? value.match(aliasPattern)?.[1] : undefined;
    return Boolean(alias && /^Color\/Background\//.test(alias) && /(\/(Subtle|Pale)(\/|$)|Subtle\/|Pale\/|\/Surface\/Alt$|-Subtle$|-Pale$)/.test(alias));
  };
  const shadowOff = (collection, token) => collection.slug === "component-colors-theme" && /background/i.test(token.name) && collection.modes.some((mode) => tintedAlias(token.valuesByMode[mode]));
  for (const collection of collections) {
    collection.modes.forEach((mode, modeIndex) => {
      if (collection.slug === "global-colors" && mode === HIGH_CONTRAST_MODE) return; // its own block, below
      cssBlocks.push(`/* ${collection.sourceName} / ${mode} */`);
      cssBlocks.push(`${modeSelector(collection.slug, mode, modeIndex)} {`);
      for (const token of collection.tokens) {
        cssBlocks.push(`  ${cssName(token.name)}: ${formatCssValue(token, token.valuesByMode[mode])};`, ...formerLines(token));
        // The no-shadow companion (above): an empty shadow layer where the fill is tinted (combinable in a shadow list,
        // unlike `none`), `initial` in the other themes so a nested theme never inherits it.
        if (shadowOff(collection, token)) cssBlocks.push(`  ${cssName(token.name)}-shadow-off: ${tintedAlias(token.valuesByMode[mode]) ? "0 0 #0000" : "initial"};`);
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
    for (const token of changed) cssBlocks.push(`  ${cssName(token.name)}: ${formatCssValue(token, values.get(token.name))};`, ...formerLines(token));
    cssBlocks.push("}", "");
    // `contrast="standard"` inside a high-contrast scope puts the Zen values back.
    cssBlocks.push(`/* ${globalColors.sourceName} / ${globalColors.modes[0]} again, for a standard scope inside a high one */`);
    cssBlocks.push('[data-contrast="standard"] {');
    for (const token of changed) cssBlocks.push(`  ${cssName(token.name)}: ${formatCssValue(token, token.valuesByMode[globalColors.modes[0]])};`, ...formerLines(token));
    cssBlocks.push("}", "");
    cssBlocks.push(`/* ${baseColors.sourceName} / ${baseColors.modes[0]}, re-declared under a contrast scope */`);
    cssBlocks.push(":where([data-contrast]) {");
    for (const token of baseColors.tokens) cssBlocks.push(`  ${cssName(token.name)}: ${formatCssValue(token, token.valuesByMode[baseColors.modes[0]])};`, ...formerLines(token));
    cssBlocks.push("}", "");

    // The algorithm raises fixed steps (HIGH_CONTRAST_ROLES). Warn when a semantic text or Subtle border token aliases
    // a Neutral alpha step outside them: that token keeps its Zen value in high contrast.
    const semantic = collections.find((collection) => collection.slug === "mode-colors-semantic");
    const neutralRamps = neutralRampsOf(baseColors);
    const resolveGlobal = (value, depth = 0) => {
      const alias = typeof value === "string" ? value.match(aliasPattern)?.[1] : null;
      if (!alias || depth > 4) return null;
      const target = byName.get(renamed.get(alias) ?? alias);
      if (target?.collectionSlug === "global-colors") return target.name;
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
          warn(`${HIGH_CONTRAST_MODE}: ${token.name} uses ${step[0]}, not a ${text ? "text" : "border"} step (${steps.join(", ")}), so it keeps its Zen value in high contrast.`);
        }
      }
    }
  }

  // Code-owned motion tokens (tokens/source/motion.json): Figma variables cannot hold easing curves, so they live in
  // code and stay out of the Figma catalog. Movement (distances, scale steps) is a factor that reduced motion sets to 0.
  const motionSource = motion.Motion;
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

  // The collections made in Zen Studio, named in the headers (none: the headers as before).
  const created = collections.filter((collection) => isCreatedSlug(collection.slug)).length;
  const madeHere = created ? ` the ${created} ${created === 1 ? "collection" : "collections"} made in Zen Studio` : "";
  const css = [
    `/* Generated from the 11 Figma JSON exports${madeHere ? `,${madeHere}` : ""} and the code-owned motion tokens. Do not edit directly. */`,
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
    `/* Generated from the 11 Figma JSON exports${madeHere ? ` and${madeHere}` : ""}. Do not edit directly. */`,
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

  const catalogText = `${JSON.stringify({ collections: collectionContract, tokens: catalog }, null, 2)}\n`;
  // The mode lists of the ZenProvider axes (src/tokens/modes.generated.ts): a mode added or renamed in the collections
  // (Zen Studio's Variables, a Figma sync) is a ZenProvider value after the next build (Studio Variables v2, user
  // 2026-10-23: mode lists come from the tokens).
  const axes = collections.filter((collection) => MODE_AXES[collection.slug]);
  const modesTs = [
    "/* Generated from the Figma collections' modes (scripts/token-outputs.mjs). Do not edit directly. */",
    "/** Each ZenProvider axis: its mode ids, the data-* value tokens.css reads, in the collection's order. */",
    `export const tokenModes = ${JSON.stringify(Object.fromEntries(axes.map((collection) => [MODE_AXES[collection.slug], collection.modes.map(toKebab)])), null, 2)} as const;`,
    "",
    "/** The Figma name of each mode id, by axis. */",
    `export const tokenModeNames = ${JSON.stringify(Object.fromEntries(axes.map((collection) => [MODE_AXES[collection.slug], Object.fromEntries(collection.modes.map((mode) => [toKebab(mode), mode]))])), null, 2)} as const;`,
    "",
  ].join("\n");

  return { css, ts, modesTs, catalog: catalogText, count: catalog.length, collections: collections.length, made: collections.filter((collection) => isCreatedSlug(collection.slug)) };
}
