#!/usr/bin/env node
/**
 * Builds the publishable @zen-ds/vue into platforms/vue/dist (Code view, plan docs/research/code-languages-plan-2026-10-03.md
 * §12). The Vue components draw with the same stylesheet as @zen-ds/react, so the React library build runs first and
 * its styles.css, reset.css and fonts are shipped as they are.
 *
 *   node tools/code-languages/vue-build.mjs               npm run build:lib, then the Vue build
 *   node tools/code-languages/vue-build.mjs --reuse-lib   use the dist/ the React build left (CI, right after verify:package)
 *
 * platforms/vue/dist:
 *   index.js, components/…, _shared/…   one file per source module (apps tree-shake), vue external
 *   core/…                              the web core the components import (src/core and what it reaches, as src/…):
 *                                       `@zen-ds/core` is a path alias inside this repo, not a package, so it ships inside
 *   *.d.ts                              declarations (tsc on TypeScript 5, as vue-tsc), `@zen-ds/core` rewritten to ./core
 *   styles.css, reset.css, fonts/       React's, with the banner naming this package
 *   LICENSE.md
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pkg = path.join(root, "platforms/vue");
const vueSrc = path.join(pkg, "src");
const repoSrc = path.join(root, "src");
const out = path.join(pkg, "dist");
const lib = path.join(root, "dist");
const fail = (message) => { console.error(`✗ ${message}`); process.exit(1); };

// 1. React's stylesheet
if (!process.argv.includes("--reuse-lib")) execFileSync("npm", ["run", "build:lib"], { cwd: root, stdio: ["ignore", "inherit", "inherit"] });
for (const file of ["styles.css", "reset.css", "fonts"]) {
  if (!fs.existsSync(path.join(lib, file))) fail(`dist/${file} is missing: run npm run build:lib first (or drop --reuse-lib).`);
}

// 2. JavaScript: the package's modules at the root of dist, the web core's under dist/core
const outputName = (id) => {
  const relative = id.startsWith(vueSrc + path.sep) ? path.relative(vueSrc, id) : id.startsWith(repoSrc + path.sep) ? path.join("core", path.relative(repoSrc, id)) : null;
  return relative && relative.split(path.sep).join("/").replace(/\.(tsx?|mjs|js)$/, ".js");
};
await build({
  configFile: false,
  root: pkg,
  publicDir: false,
  logLevel: "warn",
  resolve: { alias: { "@zen-ds/core": path.join(repoSrc, "core/index.ts") } },
  build: {
    outDir: out,
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    lib: { entry: { index: path.join(vueSrc, "index.ts") }, formats: ["es"] },
    rolldownOptions: {
      external: [/^vue($|\/)/],
      output: {
        preserveModules: true,
        entryFileNames: (chunk) => (chunk.facadeModuleId && outputName(chunk.facadeModuleId)) || "[name].js",
      },
    },
  },
});

// 3. Declarations: tsc on TypeScript 5 into a temp folder (paths as in the repo), then moved like the JavaScript
const declarations = fs.mkdtempSync(path.join(os.tmpdir(), "zen-vue-types-"));
const tsc = spawnSync(process.execPath, [path.join(root, "node_modules/typescript5/bin/tsc"), "-p", path.join(pkg, "tsconfig.build.json"), "--declarationDir", declarations], { cwd: root, encoding: "utf8" });
if (tsc.status !== 0) fail(`declarations (tsc -p platforms/vue/tsconfig.build.json):\n${tsc.stdout}${tsc.stderr}`);
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(target) : [target];
});
const coreEntry = path.join(out, "core/core/index.js");
for (const file of walk(declarations)) {
  const relative = path.relative(declarations, file);
  const fromVue = relative.startsWith(`platforms${path.sep}vue${path.sep}src${path.sep}`);
  const fromRepo = relative.startsWith(`src${path.sep}`);
  if (!fromVue && !fromRepo) fail(`declaration outside the package and the web core: ${relative}`);
  const target = fromVue ? path.join(out, path.relative(path.join("platforms", "vue", "src"), relative)) : path.join(out, "core", path.relative("src", relative));
  let text = fs.readFileSync(file, "utf8");
  let toCore = path.relative(path.dirname(target), coreEntry).split(path.sep).join("/");
  if (!toCore.startsWith(".")) toCore = `./${toCore}`;
  text = text.replace(/(["'])@zen-ds\/core\1/g, `$1${toCore}$1`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}
fs.rmSync(declarations, { recursive: true, force: true });

// 4. Styles, fonts and licence (the banner, the only line naming the package, names this one)
for (const file of ["styles.css", "reset.css"]) {
  const [banner, ...rest] = fs.readFileSync(path.join(lib, file), "utf8").split("\n");
  fs.writeFileSync(path.join(out, file), [banner.replaceAll("@zen-ds/react", "@zen-ds/vue"), ...rest].join("\n"));
}
fs.cpSync(path.join(lib, "fonts"), path.join(out, "fonts"), { recursive: true });
fs.copyFileSync(path.join(root, "LICENSE.md"), path.join(out, "LICENSE.md"));

// 5. Nothing may still point at the repo: the alias, React, or a path out of dist
const shipped = walk(out).filter((file) => /\.(js|d\.ts)$/.test(file));
const leaks = shipped.flatMap((file) => {
  const text = fs.readFileSync(file, "utf8");
  const specifiers = [...text.matchAll(/(?:from\s*|import\s*\(\s*|import\s+)(["'])([^"']+)\1/g)].map((match) => match[2]);
  return specifiers
    .filter((specifier) => specifier === "@zen-ds/core" || /^react(-dom)?($|\/)/.test(specifier) || (specifier.startsWith(".") && !path.resolve(path.dirname(file), specifier).startsWith(out + path.sep)))
    .map((specifier) => `${path.relative(out, file)}: ${specifier}`);
});
if (leaks.length) fail(`imports that leave the package:\n${leaks.slice(0, 20).join("\n")}`);
const files = walk(out);
console.log(`✓ @zen-ds/vue built: ${files.filter((file) => file.endsWith(".js")).length} modules, ${files.filter((file) => file.endsWith(".d.ts")).length} declarations, styles.css from @zen-ds/react (${path.relative(root, out)})`);
