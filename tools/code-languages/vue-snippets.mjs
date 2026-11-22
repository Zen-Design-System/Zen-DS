#!/usr/bin/env node
// The Vue code every example shows (Code view P3, plan docs/research/code-languages-plan-2026-10-03.md §4.5 and §12).
// For each example file whose components (and the library hooks it calls) are all ready in @zen-ds/vue
// (platforms/vue/code-language.json), the Vue emitter (src/platform/code/vue.ts) must translate it, and every emitted SFC
// must type-check with vue-tsc beside demo.ts for Vue, as a reader would paste it into a Vue app (vue-project.mjs). An
// example that uses a component not ported yet is counted, not translated: the Code view names the missing component.
// The playgrounds' snippets exist only while the docs render; tests/interaction/code-languages.test.tsx checks them.
//
//   node tools/code-languages/vue-snippets.mjs [--print=<page>/<slug>] [--keep]   (step 4 of npm run vue:check)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { typeCheckVue } from "./vue-project.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(root, "package.json"));
const esbuild = require("esbuild");
const { parse } = require("@babel/parser");

const argv = process.argv.slice(2);
const PRINT = argv.find((arg) => arg.startsWith("--print="))?.slice(8);
const KEEP = argv.includes("--keep");

// The emitter and the Code view's status logic, bundled for Node.
const cacheDir = path.join(root, "node_modules/.cache/zen-vue-snippets");
fs.mkdirSync(cacheDir, { recursive: true });
const bundle = path.join(cacheDir, `emitter-${process.pid}.mjs`);
await esbuild.build({
  stdin: { contents: 'export { emitVue } from "./src/platform/code/vue.ts"; export { exampleCode, demoFileOf, vueDemoOf } from "./src/platform/examples/exampleCode.ts"; export { snippetStatus } from "./src/platform/code/languages.ts";', resolveDir: root, loader: "ts" },
  outfile: bundle,
  bundle: true,
  platform: "node",
  format: "esm",
  external: ["@babel/parser"],
  logLevel: "error",
});
const { emitVue, exampleCode, demoFileOf, vueDemoOf, snippetStatus } = await import(pathToFileURL(bundle).href);
fs.rmSync(bundle, { force: true });

const status = JSON.parse(fs.readFileSync(path.join(root, "platforms/vue/code-language.json"), "utf8"));
const api = { exports: status.exports ?? [], components: status.components ?? {} };
const pages = path.join(root, "src/platform/examples/pages");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));
const files = walk(pages).filter((file) => file.endsWith(".example.tsx")).sort();

let shown = 0;
const untranslated = [];
const waiting = new Map();
const emitted = {};
const ids = {};
for (const file of files) {
  const id = path.relative(pages, file).replace(/\.example\.tsx$/, "");
  const code = exampleCode(fs.readFileSync(file, "utf8"));
  // What the Code view decides (code/languages.ts): ready when every component, and the owner of every library hook, is.
  const { status: vue, missing } = snippetStatus(code, "vue");
  if (vue === "not-yet") {
    for (const name of missing.length ? missing : ["(no component)"]) waiting.set(name, (waiting.get(name) ?? 0) + 1);
    continue;
  }
  const result = emitVue(parse, code, api);
  if (!result.ok) { untranslated.push(`${id}: ${result.reason}`); continue; }
  // An example is a whole module: every name it reads is declared or imported (a playground may be an excerpt).
  if (result.free.length) { untranslated.push(`${id}: reads ${result.free.join(", ")} without declaring them`); continue; }
  shown += 1;
  const name = `${id.replace(/[^\w]+/g, "_")}.vue`;
  emitted[name] = result.code;
  ids[name] = id;
  if (PRINT === id) console.log(result.code);
}

const ready = shown + untranslated.length;
const top = [...waiting].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => `${name} ${count}`).join(", ");
console.log(`Vue examples: ${shown}/${ready} examples whose components are all in @zen-ds/vue show Vue (${files.length - ready} wait for a component: ${top}…)`);
for (const line of untranslated) console.log(`  ✗ not translatable — ${line}`);
const demo = vueDemoOf(demoFileOf(fs.readFileSync(path.join(root, "src/platform/examples/data.ts"), "utf8")), status.types ?? []);
const types = typeCheckVue(emitted, { demo, keep: KEEP });
if (types.ok) console.log(`✓ Vue's compiler and vue-tsc: ${Object.keys(emitted).length} emitted example SFCs (and demo.ts for Vue) compile and type-check`);
else console.log(`✗ Vue's compiler or vue-tsc on the emitted examples:\n${types.output.split("\n").map((line) => `  ${line.replace(/snippets\/(\w+\.vue)/, (match, name) => (ids[name] ? `${ids[name]} (${name})` : match))}`).join("\n")}`);
if (KEEP) console.log(`Project kept at ${types.project}`);
process.exit(untranslated.length || !types.ok ? 1 : 0);
