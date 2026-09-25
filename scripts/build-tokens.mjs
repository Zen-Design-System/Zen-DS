import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  if (modeIndex === 0 && selector !== ":root") return `:root,\n${selector}`;
  return selector;
};

const cssBlocks = [];
for (const collection of collections) {
  collection.modes.forEach((mode, modeIndex) => {
    cssBlocks.push(`/* ${collection.sourceName} / ${mode} */`);
    cssBlocks.push(`${modeSelector(collection.slug, mode, modeIndex)} {`);
    for (const token of collection.tokens) {
      cssBlocks.push(`  ${cssName(token.name)}: ${formatCssValue(token, token.valuesByMode[mode])};`);
    }
    cssBlocks.push("}", "");
  });
}

const css = [
  "/* Generated from the 11 Figma JSON exports. Do not edit directly. */",
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
  "export type TokenName = keyof typeof tokens;",
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
