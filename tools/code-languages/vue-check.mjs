#!/usr/bin/env node
// The Vue port's gate (Code view P3, plan docs/research/code-languages-plan-2026-10-03.md §3.C), run in CI:
//   1. the web core (src/core) reaches no React, no stylesheet and no .tsx, so a port can import it;
//   2. DOM and API parity of every ported component (vue-parity.mjs; platforms/vue/code-language.json up to date);
//   3. vue-tsc type-checks the package;
//   4. every example whose components are all ported shows Vue that type-checks (vue-snippets.mjs; the playgrounds are
//      checked by tests/interaction/code-languages.test.tsx, as they exist only while the docs render).
//
//   npm run vue:check
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { vueTsc } from "./vue-tsc.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(root, "package.json"));
const esbuild = require("esbuild");
const failures = [];

/* 1. The web core's boundary */
const core = path.join(root, "src/core/index.ts");
const { metafile } = await esbuild.build({ entryPoints: [core], bundle: true, write: false, metafile: true, platform: "neutral", format: "esm", logLevel: "silent", packages: "external" });
const inputs = Object.keys(metafile.inputs);
const imports = Object.values(metafile.inputs).flatMap((input) => input.imports.map((item) => item.path));
const leaks = [
  ...inputs.filter((file) => /\.(tsx|css)$/.test(file)),
  ...imports.filter((name) => /^(react|react-dom)(\/|$)/.test(name) || /\.css$/.test(name)),
];
if (leaks.length) failures.push(`src/core reaches React or a stylesheet: ${[...new Set(leaks)].join(", ")} — move the pure logic into a model.ts and keep the import out of the core`);
else console.log(`✓ web core: ${inputs.length} modules, no React, no stylesheet`);

/* 2. Parity */
const parity = spawnSync(process.execPath, [path.join(root, "tools/code-languages/vue-parity.mjs")], { cwd: root, encoding: "utf8" });
process.stdout.write(parity.stdout);
process.stderr.write(parity.stderr);
if (parity.status !== 0) failures.push("Vue parity failed (above)");

/* 3. Types */
const types = vueTsc(path.join(root, "platforms/vue/tsconfig.json"));
if (types.ok) console.log("✓ vue-tsc: platforms/vue type-checks");
else failures.push(`vue-tsc: platforms/vue\n${types.output}`);

/* 4. The examples' Vue: every example whose components are all ported translates and type-checks */
const snippets = spawnSync(process.execPath, [path.join(root, "tools/code-languages/vue-snippets.mjs")], { cwd: root, encoding: "utf8" });
process.stdout.write(snippets.stdout);
process.stderr.write(snippets.stderr);
if (snippets.status !== 0) failures.push("Vue examples failed (above)");

if (failures.length) {
  console.error(`\nvue:check failed:\n${failures.map((failure) => `  ✗ ${failure}`).join("\n")}`);
  process.exit(1);
}
if (!fs.existsSync(path.join(root, "platforms/vue/code-language.json"))) console.warn("platforms/vue/code-language.json is missing: run npm run vue:parity -- --write");
console.log("vue:check passed");
