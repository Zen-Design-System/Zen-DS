import fs from "node:fs";

// Checks the generated manifest against the Figma Plugin API extraction (authoritative)
// and reports styles the plugin export (styles.json) is missing.
const full = JSON.parse(fs.readFileSync("styles/source/figma/figma-styles.full.json", "utf8"));
const exported = JSON.parse(fs.readFileSync("styles/source/figma/styles.json", "utf8")).styles;
const manifest = JSON.parse(fs.readFileSync("src/styles/generated/style-manifest.json", "utf8"));
const pairs = { colors: ["paint", "colors"], textStyles: ["text", "textStyles"], effectStyles: ["effect", "effectStyles"], gridStyles: ["grid", "gridStyles"] };

for (const [key, [fullKey, exportKey]] of Object.entries(pairs)) {
  const sourceNames = new Set(full[fullKey].map((style) => style.name));
  const manifestNames = new Set(manifest[key].map((style) => style.name));
  const missing = [...sourceNames].filter((name) => !manifestNames.has(name));
  if (missing.length) throw new Error(`${key}: missing generated styles: ${missing.join(", ")}`);
  const notExported = [...sourceNames].filter((name) => !exported[exportKey].some((style) => style.name === name));
  console.log(`${key}: ${manifest[key].length}/${sourceNames.size}${notExported.length ? ` (not in plugin export: ${notExported.join(", ")})` : ""}`);
}
