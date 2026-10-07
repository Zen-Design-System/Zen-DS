import fs from "node:fs";
import path from "node:path";

const sourceDir = "icons/source";
const manifestPath = "src/icons/generated/icon-manifest.json";
const listSvgFiles = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSvgFiles(target);
    return entry.isFile() && entry.name.toLowerCase().endsWith(".svg") ? [target] : [];
  });

const files = listSvgFiles(sourceDir);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const uniqueNames = new Set(manifest.icons.map((icon) => icon.name));

console.log(`SVG source files: ${files.length}`);
console.log(`Generated icons: ${manifest.count}`);
console.log(`Monochrome: ${manifest.monochrome}`);
console.log(`Multicolor: ${manifest.multicolor}`);

if (manifest.count !== files.length || uniqueNames.size !== manifest.count) {
  process.exitCode = 1;
}

// Plain aliases must point at a real icon and never shadow one.
const aliases = Object.entries(manifest.aliases ?? {});
const badAliases = aliases.filter(([alias, target]) => uniqueNames.has(alias) || !uniqueNames.has(target));
console.log(`Plain aliases: ${aliases.length}${badAliases.length ? ` (${badAliases.length} broken: ${badAliases.map(([a, t]) => `${a} → ${t}`).join(", ")})` : ""}`);
if (badAliases.length) process.exitCode = 1;

// Every component that draws a built-in icon (an icon name in its code, comments excluded) imports "../Icon/core",
// which registers the core set; otherwise its icons would wait for a lazy bucket on first paint.
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
const iconNames = new Set(manifest.icons.map((icon) => icon.name));
const listSources = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  if (entry.isDirectory()) return entry.name === "Icon" || entry.name === "_shared" ? [] : listSources(target);
  return /\.tsx?$/.test(entry.name) && !/\.stories\./.test(entry.name) ? [target] : [];
});
const missingCore = listSources("src/components").filter((file) => {
  const source = fs.readFileSync(file, "utf8");
  const drawsIcon = [...stripComments(source).matchAll(/["'`]([a-z0-9][a-z0-9-]*)["'`]/g)].some((m) => iconNames.has(m[1]));
  return drawsIcon && !source.includes('import "../Icon/core";');
});
console.log(`Components drawing built-in icons without the core import: ${missingCore.length}`);
if (missingCore.length) {
  console.log(missingCore.map((file) => `  ✗ ${file} — add: import "../Icon/core";`).join("\n"));
  process.exitCode = 1;
}
