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
