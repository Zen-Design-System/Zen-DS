import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectionsManifest, manifestText, sourceFiles, tokenOutputs } from "./token-outputs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "tokens/source/figma");
const cssPath = path.join(root, "src/styles/tokens.css");
const tsPath = path.join(root, "src/tokens/generated.ts");
const catalogPath = path.join(root, "src/tokens/catalog.generated.json");
const modesPath = path.join(root, "src/tokens/modes.generated.ts");

// The build itself is scripts/token-outputs.mjs (shared with the Zen Studio dev server's Variables drafts).
// Every collection in the folder: the 11 Figma exports and those made in Zen Studio (one mode each).
const { css, ts, modesTs, catalog, count, collections, made } = tokenOutputs({
  readSource: (fileName) => JSON.parse(fs.readFileSync(path.join(sourceDir, fileName), "utf8")),
  files: sourceFiles(fs.readdirSync(sourceDir)),
  motion: JSON.parse(fs.readFileSync(path.join(root, "tokens/source/motion.json"), "utf8")),
});

fs.mkdirSync(path.dirname(cssPath), { recursive: true });
fs.mkdirSync(path.dirname(tsPath), { recursive: true });
fs.writeFileSync(cssPath, css);
fs.writeFileSync(tsPath, ts);
fs.writeFileSync(catalogPath, catalog);
fs.writeFileSync(modesPath, modesTs);
// The docs' manifest: the entries of the collections made in Zen Studio follow their files (none: the file as it was).
const manifestPath = path.join(root, "tokens/source/figma.collections.json");
const manifestBefore = fs.readFileSync(manifestPath, "utf8");
const manifestAfter = manifestText(collectionsManifest(JSON.parse(manifestBefore), made));
if (manifestAfter !== manifestBefore) fs.writeFileSync(manifestPath, manifestAfter);

console.log(`Generated ${count} tokens across ${collections} collections.`);
