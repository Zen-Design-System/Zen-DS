import fs from "node:fs";

const source = JSON.parse(fs.readFileSync("styles/source/figma/text-styles.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("src/styles/generated/text-style-manifest.json", "utf8"));
const sourceNames = new Set(source.textStyles.map((style) => style.name));
const generatedNames = new Set(manifest.styles.map((style) => style.name));

console.log(`Figma text styles: ${source.textStyles.length}`);
console.log(`Generated text styles: ${manifest.count}`);
console.log(`Letter-spacing units: ${JSON.stringify(manifest.units)}`);

if (
  sourceNames.size !== source.textStyles.length ||
  generatedNames.size !== manifest.count ||
  manifest.count !== source.textStyles.length ||
  [...sourceNames].some((name) => !generatedNames.has(name))
) {
  process.exitCode = 1;
}
