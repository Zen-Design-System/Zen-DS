import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "icons/source");
const outputPath = path.join(root, "src/icons/generated/iconData.ts");
const manifestPath = path.join(root, "src/icons/generated/icon-manifest.json");

const toKebab = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const listSvgFiles = (directory) => {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSvgFiles(absolutePath);
    return entry.isFile() && entry.name.toLowerCase().endsWith(".svg") ? [absolutePath] : [];
  });
};

const rejectUnsafeSvg = (svg, file) => {
  const unsafePatterns = [
    [/<script\b/i, "script element"],
    [/<foreignObject\b/i, "foreignObject element"],
    [/\son[a-z]+\s*=/i, "event handler"],
    [/javascript:/i, "javascript URL"],
    [/<iframe\b/i, "iframe element"],
  ];
  for (const [pattern, label] of unsafePatterns) {
    if (pattern.test(svg)) throw new Error(`${file}: unsafe ${label}`);
  }
};

const parseLength = (value) => {
  const match = String(value ?? "").match(/^([0-9.]+)/);
  return match ? Number(match[1]) : null;
};

const parseSvg = (file) => {
  let svg = fs.readFileSync(file, "utf8").trim();
  rejectUnsafeSvg(svg, file);
  svg = svg.replace(/<\?xml[\s\S]*?\?>/gi, "").replace(/<!doctype[\s\S]*?>/gi, "").trim();

  const match = svg.match(/^<svg\b([^>]*)>([\s\S]*)<\/svg>$/i);
  if (!match) throw new Error(`${file}: expected one root <svg> element`);

  const attributes = match[1];
  let content = match[2].trim();
  const viewBoxMatch = attributes.match(/\bviewBox=["']([^"']+)["']/i);
  const widthMatch = attributes.match(/\bwidth=["']([^"']+)["']/i);
  const heightMatch = attributes.match(/\bheight=["']([^"']+)["']/i);
  const width = parseLength(widthMatch?.[1]);
  const height = parseLength(heightMatch?.[1]);
  const viewBox = viewBoxMatch?.[1] ?? (width && height ? `0 0 ${width} ${height}` : null);
  if (!viewBox) throw new Error(`${file}: missing viewBox and numeric width/height fallback`);

  const presentationAttributeNames = [
    "fill",
    "stroke",
    "color",
    "opacity",
    "fill-opacity",
    "stroke-opacity",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-miterlimit",
    "fill-rule",
    "clip-rule",
  ];
  let rootPresentation = presentationAttributeNames
    .map((name) => attributes.match(new RegExp(`\\b${name}=["'][^"']+["']`, "i"))?.[0])
    .filter(Boolean)
    .join(" ");

  const visibleContent = content.replace(/<defs\b[\s\S]*?<\/defs>/gi, "");
  const paints = [...`${rootPresentation} ${visibleContent}`.matchAll(/\b(?:fill|stroke)=["']([^"']+)["']/gi)]
    .map((result) => result[1].trim())
    .filter((value) => !/^(none|currentColor)$/i.test(value) && !/^url\(/i.test(value));
  const uniquePaints = [...new Set(paints.map((value) => value.toLowerCase()))];
  const colorMode = uniquePaints.length <= 1 ? "monochrome" : "multicolor";

  if (colorMode === "monochrome") {
    const replacePaints = (value) => value.replace(
      /\b(fill|stroke)=["'](?!none["']|currentColor["']|url\()[^"']+["']/gi,
      '$1="currentColor"',
    );
    rootPresentation = rootPresentation.replace(
      /\b(fill|stroke)=["'](?!none["']|currentColor["']|url\()[^"']+["']/gi,
      '$1="currentColor"',
    );
    content = content
      .split(/(<defs\b[\s\S]*?<\/defs>)/gi)
      .map((part) => (/^<defs\b/i.test(part) ? part : replacePaints(part)))
      .join("");
  }

  if (rootPresentation) content = `<g ${rootPresentation}>${content}</g>`;

  return { viewBox, content, colorMode };
};

const files = listSvgFiles(sourceDir).sort();
const icons = files.map((file) => {
  const relativePath = path.relative(sourceDir, file).replace(/\.svg$/i, "");
  const name = toKebab(relativePath.split(path.sep).join("/"));
  if (!name) throw new Error(`${file}: could not derive an icon name`);
  return { name, source: path.relative(root, file), ...parseSvg(file) };
});

const duplicateNames = icons
  .map((icon) => icon.name)
  .filter((name, index, names) => names.indexOf(name) !== index);
if (duplicateNames.length) {
  throw new Error(`Duplicate generated icon names: ${[...new Set(duplicateNames)].join(", ")}`);
}

// ── Output ────────────────────────────────────────────────────────────────────────────────────────────────────────
// The runtime never ships the whole set by default (1.7 MB). It is split into:
// - names.ts    the `IconName` union + `iconNames` (types stay small: no 1.7 MB literal type in the .d.ts);
// - aliases.ts  plain names for icons that only exist in cuts (icon-search-line → icon-search-medium-line);
// - core.ts     the icons Zen components use themselves (string literals found in src/components), registered at start;
// - buckets/    every other icon, in BUCKETS files keyed by a hash of the name, loaded on first use by <Icon>;
// - loaders.ts  the hash + one dynamic import per bucket;
// - all.ts      the whole set (docs platform, galleries, apps that prefer no lazy loading: `@zen-ds/react/icons/all`).
// 256 small buckets (~6 icons, 2–4 KB gzip each): an app pays a few KB per icon it uses; the loader table stays ~1 KB gzip.
const BUCKETS = 256;
const generatedDir = path.dirname(outputPath);
const bucketDir = path.join(generatedDir, "buckets");
const header = "/* Generated by `npm run icons:build` (scripts/build-icons.mjs). Do not edit directly. */";
const names = icons.map((icon) => icon.name);
const nameSet = new Set(names);
const definition = ({ viewBox, content, colorMode }) => ({ viewBox, content, colorMode });

// FNV-1a (32-bit). Keep in sync with iconBucket() in loaders.ts below.
const bucketOf = (name) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < name.length; index += 1) {
    hash ^= name.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % BUCKETS;
};

// Core = every string literal in component source that is an icon name (covers maps, ternaries and prop defaults).
const componentDir = path.join(root, "src/components");
const listSourceFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const absolutePath = path.join(directory, entry.name);
  if (entry.isDirectory()) return listSourceFiles(absolutePath);
  return /\.(tsx?|mjs)$/.test(entry.name) && !/\.stories\./.test(entry.name) ? [absolutePath] : [];
});
// Comments are skipped: an icon named in a JSDoc example (Button's `startIcon="icon-plus-line"`) is not drawn by Zen.
export const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
const core = new Set();
for (const file of listSourceFiles(componentDir)) {
  const source = stripComments(fs.readFileSync(file, "utf8"));
  for (const match of source.matchAll(/["'`]([a-z0-9][a-z0-9-]*)["'`]/g)) if (nameSet.has(match[1])) core.add(match[1]);
}

// Plain names for icons that only exist in cuts (icon-search-small/medium/large-line, icon-chevron-left-line-small/
// medium): the plain name is what everyone types first, so it is a valid IconName that draws the Medium cut.
const aliases = Object.fromEntries(names.flatMap((name) => {
  const match = name.match(/^(.+)-medium-(line|solid)$/) ?? name.match(/^(.+)-(line|solid)-medium$/);
  const plain = match && `${match[1]}-${match[2]}`;
  return plain && !nameSet.has(plain) ? [[plain, name]] : [];
}).sort(([a], [b]) => a.localeCompare(b)));

const pad = (index) => String(index).padStart(3, "0");
const record = (list) => JSON.stringify(Object.fromEntries(list.map((icon) => [icon.name, definition(icon)])), null, 2);
const buckets = Array.from({ length: BUCKETS }, () => []);
// Every icon lives in a bucket, core ones too: an app can draw a core icon with <Icon> before (or without) any
// component that registers the core set.
for (const icon of icons) buckets[bucketOf(icon.name)].push(icon);

fs.mkdirSync(bucketDir, { recursive: true });
for (const stale of fs.readdirSync(bucketDir)) fs.rmSync(path.join(bucketDir, stale));
// The old single-file output; its content now lives in all.ts.
if (fs.existsSync(outputPath)) fs.rmSync(outputPath);

const write = (file, lines) => fs.writeFileSync(path.join(generatedDir, file), `${lines.join("\n")}\n`);

write("names.ts", [
  header,
  'export type IconColorMode = "monochrome" | "multicolor";',
  "export type IconDefinition = {",
  "  readonly viewBox: string;",
  "  readonly content: string;",
  "  readonly colorMode: IconColorMode;",
  "};",
  "",
  `/** Every Zen icon name (${names.length}), then ${Object.keys(aliases).length} plain aliases that draw a Medium cut (see aliases.ts). Names follow the Figma layer path, e.g. \`icon-home-03-line\`, \`icon-search-medium-line\`, \`icon-chevron-left-line-medium\`. */`,
  "export type IconName =",
  ...[...names, ...Object.keys(aliases)].map((name, index, all) => `  | ${JSON.stringify(name)}${index === all.length - 1 ? ";" : ""}`),
  "",
  "/** The icons themselves (aliases excluded). */",
  "export const iconNames: readonly IconName[] = [",
  ...names.map((name) => `  ${JSON.stringify(name)},`),
  "];",
]);

// Small on purpose: the Icon runtime imports it (names.ts, 40 KB, stays out of app bundles).
write("aliases.ts", [
  header,
  'import type { IconName } from "./names";',
  "",
  "/** Plain names for icons that only exist in cuts (small / medium / large): each draws the Medium cut. */",
  `export const iconAliases: Readonly<Record<string, IconName>> = ${JSON.stringify(aliases, null, 2)};`,
]);

write("core.ts", [
  header,
  "// Icons that Zen components render themselves; registered when <Icon> loads, so they draw synchronously.",
  'import type { IconDefinition, IconName } from "./names";',
  "",
  `export const coreIcons: Partial<Record<IconName, IconDefinition>> = ${record(icons.filter((icon) => core.has(icon.name)))};`,
]);

buckets.forEach((list, index) => {
  fs.writeFileSync(path.join(bucketDir, `b${pad(index)}.ts`), [
    header,
    'import type { IconDefinition } from "../names";',
    "",
    `const icons: Record<string, IconDefinition> = ${record(list)};`,
    "export default icons;",
    "",
  ].join("\n"));
});

write("loaders.ts", [
  header,
  'import type { IconDefinition } from "./names";',
  "",
  `export const ICON_BUCKETS = ${BUCKETS};`,
  "",
  "/** FNV-1a hash of the name → bucket index (same function as scripts/build-icons.mjs). */",
  "export function iconBucket(name: string): number {",
  "  let hash = 0x811c9dc5;",
  "  for (let index = 0; index < name.length; index += 1) {",
  "    hash ^= name.charCodeAt(index);",
  "    hash = Math.imul(hash, 0x01000193) >>> 0;",
  "  }",
  `  return hash % ${BUCKETS};`,
  "}",
  "",
  "type Bucket = { default: Record<string, IconDefinition> };",
  "export const iconBucketLoaders: ReadonlyArray<() => Promise<Bucket>> = [",
  ...buckets.map((_, index) => `  () => import("./buckets/b${pad(index)}"),`),
  "];",
]);

write("all.ts", [
  header,
  "// The complete icon set as one record (no lazy loading). Import through `src/icons/all.ts`, which also registers it.",
  'import type { IconDefinition, IconName } from "./names";',
  ...buckets.map((_, index) => `import b${pad(index)} from "./buckets/b${pad(index)}";`),
  "",
  "export const iconData = {",
  ...buckets.map((_, index) => `  ...b${pad(index)},`),
  "} as Record<IconName, IconDefinition>;",
]);

fs.writeFileSync(
  manifestPath,
  `${JSON.stringify(
    {
      count: icons.length,
      monochrome: icons.filter((icon) => icon.colorMode === "monochrome").length,
      multicolor: icons.filter((icon) => icon.colorMode === "multicolor").length,
      core: core.size,
      buckets: BUCKETS,
      aliases,
      icons: icons.map(({ name, source, viewBox, colorMode }) => ({
        name,
        source,
        viewBox,
        colorMode,
        bucket: bucketOf(name),
        core: core.has(name),
      })),
    },
    null,
    2,
  )}\n`,
);

const sizes = buckets.map((list) => list.length);
console.log(`Generated ${icons.length} icons from ${files.length} SVG files: ${core.size} core, ${BUCKETS} lazy buckets (${Math.min(...sizes)}–${Math.max(...sizes)} icons each).`);
