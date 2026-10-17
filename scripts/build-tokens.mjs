import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tokenOutputs } from "./token-outputs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "tokens/source/figma");
const cssPath = path.join(root, "src/styles/tokens.css");
const tsPath = path.join(root, "src/tokens/generated.ts");
const catalogPath = path.join(root, "src/tokens/catalog.generated.json");

// The build itself is scripts/token-outputs.mjs (shared with the Zen Studio dev server's Variables drafts).
const { css, ts, catalog, count, collections } = tokenOutputs({
  readSource: (fileName) => JSON.parse(fs.readFileSync(path.join(sourceDir, fileName), "utf8")),
  motion: JSON.parse(fs.readFileSync(path.join(root, "tokens/source/motion.json"), "utf8")),
});

fs.mkdirSync(path.dirname(cssPath), { recursive: true });
fs.mkdirSync(path.dirname(tsPath), { recursive: true });
fs.writeFileSync(cssPath, css);
fs.writeFileSync(tsPath, ts);
fs.writeFileSync(catalogPath, catalog);

console.log(`Generated ${count} tokens across ${collections} collections.`);
