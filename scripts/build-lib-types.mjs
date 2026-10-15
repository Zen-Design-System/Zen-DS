/**
 * Declarations for the library build: `tsc -p tsconfig.build.json`, then strip the CSS side-effect imports that
 * declaration emit keeps (`import "./button.css";`). An app's TypeScript would otherwise try to resolve them
 * (`noUncheckedSideEffectImports`), and the CSS ships as one file anyway (dist/styles.css).
 *
 *   node scripts/build-lib-types.mjs [--out=dist]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outArg = process.argv.find((arg) => arg.startsWith("--out="));
const out = path.resolve(root, outArg ? outArg.slice(6) : process.env.ZEN_LIB_OUT ?? "dist");

const tsc = spawnSync(path.join(root, "node_modules/.bin/tsc"), ["-p", "tsconfig.build.json", "--declarationDir", out], { cwd: root, stdio: "inherit" });
if (tsc.status !== 0) process.exit(tsc.status ?? 1);

// Hand-written declarations of the .mjs modules the entries import (src/ai-ui/*.d.mts): tsc emits nothing for them, so
// they are copied beside the built JavaScript (the emitted .d.ts import "./spec.mjs", which resolves to spec.d.mts).
const srcDir = path.join(root, "src");
const copyDeclarations = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) { if (!/^(platform|foundations|assets)$/.test(entry.name)) copyDeclarations(target); continue; }
    if (!entry.name.endsWith(".d.mts")) continue;
    const dest = path.join(out, path.relative(srcDir, target));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(target, dest);
  }
};
copyDeclarations(srcDir);

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(target) : /\.d\.m?ts$/.test(entry.name) ? [target] : [];
});

const problems = [];
let bytes = 0;
const files = walk(out);
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const cleaned = source.replace(/^import\s+["'][^"']+\.css["'];\s*\n/gm, "");
  if (cleaned !== source) fs.writeFileSync(file, cleaned);
  bytes += Buffer.byteLength(cleaned);
  if (/\.css["']/.test(cleaned)) problems.push(`${path.relative(out, file)} still references a .css file`);
  if (/from\s+["'][./]*(platform|foundations|assets)\//.test(cleaned)) problems.push(`${path.relative(out, file)} imports docs-only code`);
}
if (problems.length) {
  console.error(`✗ declarations:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ ${files.length} declaration files (${(bytes / 1024).toFixed(0)} KB)`);
