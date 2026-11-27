#!/usr/bin/env node
/**
 * Installs the packed @zen-ds/vue into a throwaway app and checks what a real consumer would hit (the Vue twin of
 * scripts/verify-package.mjs).
 *
 *   npm run vue:verify-package                     npm run build:lib + vue-build.mjs, pack → temp app → checks (offline)
 *   npm run vue:verify-package -- --reuse-lib      reuse React's dist/ (CI, right after verify:package built it)
 *   npm run vue:verify-package -- --keep           keep the temp app and print its path
 *
 * Checks: exports resolve, the package is self-contained (no @zen-ds/core, React or path out of the package; only `vue`
 * outside it), no parity fixtures or docs-platform code, styles.css is React's, vue-tsc with skipLibCheck:false, vite
 * build, JS/CSS budgets, no font data in CSS, and renderToString in plain Node.
 * Offline: the tarball is unpacked into node_modules/@zen-ds/vue; vue and vite are linked from this repo's node_modules.
 * The tarball lands in dist-pack/vue/, apart from React's (release.yml publishes the newest one of each folder).
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { vueTsc } from "./vue-tsc.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = new Set(process.argv.slice(2));
// Button-only measured 36.9 KB gz on 2026-11-28 (Vue's runtime is most of it): 50 catches a component or the icon list
// leaking into every app. The CSS is React's, under React's budget.
const BUDGET = { buttonOnlyJsGz: 50 * 1024, cssGz: 110 * 1024 };
const results = [];
const pass = (label, detail = "") => results.push({ ok: true, label, detail });
const fail = (label, detail = "") => results.push({ ok: false, label, detail });
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const gz = (file) => zlib.gzipSync(fs.readFileSync(file)).length;
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(target) : [target];
});

function run(command, commandArgs, cwd, label) {
  const result = spawnSync(command, commandArgs, { cwd, encoding: "utf8", env: { ...process.env, FORCE_COLOR: "0" } });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.status === 0) pass(label, output.split("\n").filter((line) => line.startsWith("✓")).join("; "));
  else fail(label, output.split("\n").slice(-25).join("\n"));
  return { ok: result.status === 0, output };
}

// 1. Build and pack (no lifecycle scripts: npm 11 writes their logs into `npm pack --json`'s stdout)
execFileSync(process.execPath, [path.join(root, "tools/code-languages/vue-build.mjs"), ...(args.has("--reuse-lib") ? ["--reuse-lib"] : [])], { cwd: root, stdio: ["ignore", "inherit", "inherit"] });
const packDir = path.join(root, "dist-pack/vue");
fs.mkdirSync(packDir, { recursive: true });
const json = execFileSync("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", packDir], { cwd: path.join(root, "platforms/vue"), encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
const info = JSON.parse(json)[0];
const tarball = path.join(packDir, info.filename);
pass("npm pack", `${info.filename}: ${info.entryCount} files, ${kb(info.size)} packed, ${kb(info.unpackedSize)} unpacked`);

// 2. Temp app from the template
const app = fs.mkdtempSync(path.join(os.tmpdir(), "zen-vue-consumer-"));
fs.cpSync(path.join(root, "examples/vue-consumer-smoke"), app, { recursive: true });
const modules = path.join(app, "node_modules");
const pkgDir = path.join(modules, "@zen-ds/vue");
fs.mkdirSync(pkgDir, { recursive: true });
execFileSync("tar", ["-xzf", tarball, "-C", pkgDir, "--strip-components=1"]);
for (const name of ["vue", "vite"]) fs.symlinkSync(path.join(root, "node_modules", name), path.join(modules, name), "dir");
pass("install (offline: unpacked tarball + linked vue, vite)");

// 3. Package contents
const packageJson = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"));
if (packageJson.private) fail("package.json is publishable", '"private": true');
const missing = Object.entries(packageJson.exports).flatMap(([key, value]) => (typeof value === "string" ? [value] : Object.values(value))
  .filter((target) => !fs.existsSync(path.join(pkgDir, target))).map((target) => `${key} → ${target}`));
missing.length ? fail("exports resolve", missing.join("\n")) : pass("exports resolve", `${Object.keys(packageJson.exports).length} entry points`);

const shipped = walk(pkgDir).map((file) => path.relative(pkgDir, file).split(path.sep).join("/"));
const code = shipped.filter((file) => /\.(js|d\.ts)$/.test(file));
const outside = code.flatMap((file) => {
  // Comments out: a doc comment may quote an import (`import "@zen-ds/react/icons/all"` in the icon registry's).
  const text = fs.readFileSync(path.join(pkgDir, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return [...text.matchAll(/(?:from\s*|import\s*\(\s*|import\s+)(["'])([^"']+)\1/g)].map((match) => match[2])
    .filter((specifier) => specifier.startsWith(".") ? !path.resolve(path.dirname(path.join(pkgDir, file)), specifier).startsWith(pkgDir + path.sep) : !/^vue($|\/)/.test(specifier))
    .map((specifier) => `${file}: ${specifier}`);
});
outside.length ? fail("self-contained: only vue outside the package", outside.slice(0, 10).join("\n")) : pass("self-contained: only vue outside the package", `${code.length} modules and declarations`);
const strays = shipped.filter((file) => /\.parity\.|(^|\/)(platform|foundations)\/|\.tsx?$/.test(file) && !file.endsWith(".d.ts"));
strays.length ? fail("no parity fixtures, sources or docs-platform code shipped", strays.slice(0, 10).join("\n")) : pass("no parity fixtures, sources or docs-platform code shipped");
const cssInDts = code.filter((file) => file.endsWith(".d.ts") && /\.css["']/.test(fs.readFileSync(path.join(pkgDir, file), "utf8")));
cssInDts.length ? fail("no .css imports in .d.ts", cssInDts.join("\n")) : pass("no .css imports in .d.ts");
const reactCss = fs.readFileSync(path.join(root, "dist/styles.css"), "utf8").split("\n").slice(1).join("\n");
const vueCss = fs.readFileSync(path.join(pkgDir, "dist/styles.css"), "utf8").split("\n").slice(1).join("\n");
vueCss === reactCss ? pass("styles.css is @zen-ds/react's", kb(vueCss.length)) : fail("styles.css is @zen-ds/react's", "the stylesheet differs beyond its banner");
fs.existsSync(path.join(pkgDir, "dist/LICENSE.md")) ? pass("ships its licence") : fail("ships its licence", "dist/LICENSE.md is missing");

// 4. Types, build, SSR
const types = vueTsc(path.join(app, "tsconfig.json"));
types.ok ? pass("vue-tsc (skipLibCheck: false)") : fail("vue-tsc (skipLibCheck: false)", types.output.split("\n").slice(0, 25).join("\n"));
const build = run(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), "build", "--logLevel", "warn"], app, "vite build");
run(process.execPath, ["ssr.mjs"], app, "renderToString in Node");

// 5. Budgets (JS actually loaded by button-only.html: its entry script plus modulepreloads)
if (build.ok) {
  const out = path.join(app, "dist");
  const html = fs.readFileSync(path.join(out, "button-only.html"), "utf8");
  const scripts = [...html.matchAll(/(?:src|href)="\/([^"]+\.js)"/g)].map((match) => path.join(out, match[1]));
  const jsGz = scripts.reduce((sum, file) => sum + gz(file), 0);
  const cssFiles = walk(out).filter((file) => file.endsWith(".css"));
  const cssGz = Math.max(0, ...cssFiles.map(gz));
  const lazyChunks = walk(out).filter((file) => file.endsWith(".js")).length - scripts.length;
  (jsGz <= BUDGET.buttonOnlyJsGz ? pass : fail)(`budget: Button-only JS (incl. Vue) ≤ ${BUDGET.buttonOnlyJsGz / 1024} KB gz`, `${kb(jsGz)} in ${scripts.length} files (${lazyChunks} other chunks, e.g. lazy icon buckets)`);
  (cssGz <= BUDGET.cssGz ? pass : fail)(`budget: CSS ≤ ${BUDGET.cssGz / 1024} KB gz`, kb(cssGz));
  const fontData = cssFiles.some((file) => /data:font|base64,d09G/.test(fs.readFileSync(file, "utf8")));
  fontData ? fail("no inlined font data in CSS") : pass("no inlined font data in CSS", `${walk(out).filter((file) => /\.woff2?$/.test(file)).length} font files emitted`);
}

for (const result of results) {
  console.log(`${result.ok ? "✓" : "✗"} ${result.label}${result.detail && result.ok ? ` — ${result.detail}` : ""}`);
  if (!result.ok && result.detail) console.log(result.detail.replace(/^/gm, "    "));
}
if (args.has("--keep")) console.log(`app kept at ${app}`);
else fs.rmSync(app, { recursive: true, force: true });
const failed = results.filter((result) => !result.ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : `\nPackage OK (${path.relative(root, tarball)}).`);
process.exit(failed ? 1 : 0);
