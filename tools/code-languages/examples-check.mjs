#!/usr/bin/env node
// Portable example snippets (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11). Each example is a file,
// src/platform/examples/pages/<page>/<slug>.example.tsx: its page renders the default export and shows the file's text
// (`?raw`, through exampleCode). This check keeps that true and compiles what readers copy:
//   1. an example file imports only react, @zen-ds/react and the demo world (../../data, shown as ./demo), and has a
//      default export component;
//   2. a page that shows an example file's text renders that same file, and every example file is shown;
//   3. examples still written as a code string beside their render (not moved yet) never grow: per page file, the count
//      stays at or under tools/code-languages/examples-baseline.json (--write records the new counts; the last P2b
//      slice brings every page to 0);
//   4. every snippet, as the Code view shows it, type-checks in a generated project beside demo.ts (the copy readers get),
//      the way it would in their app (--no-compile skips this step).
//
//   npm run examples:check [-- --write] [-- --no-compile]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(root, "package.json"));
const { parse } = require("@babel/parser");
const { exampleCode, demoFileOf } = await import(pathToFileURL(path.join(root, "src/platform/examples/exampleCode.ts")).href);

const argv = process.argv.slice(2);
const WRITE = argv.includes("--write");
const COMPILE = !argv.includes("--no-compile");
const PAGES = path.join(root, "src/platform/examples/pages");
const DATA = path.join(root, "src/platform/examples/data.ts");
const BASELINE = path.join(root, "tools/code-languages/examples-baseline.json");
/** Example lists outside examples/pages that P2b moves too (the Typography page's hierarchy examples). */
const OTHER_LISTS = ["src/platform/PlatformTypographyHierarchy.tsx"];

const rel = (file) => path.relative(root, file).split(path.sep).join("/");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));
const parseFile = (file) => parse(fs.readFileSync(file, "utf8"), { sourceType: "module", plugins: ["typescript", "jsx"] });
/** Every node under `node` (a plain walk: enough for imports, objects and identifiers). */
function* nodes(node) {
  if (!node || typeof node.type !== "string") return;
  yield node;
  for (const [key, value] of Object.entries(node)) {
    if (key === "loc" || key === "start" || key === "end" || key === "extra") continue;
    if (Array.isArray(value)) for (const item of value) yield* nodes(item);
    else if (value && typeof value.type === "string") yield* nodes(value);
  }
}
const problems = [];

/* ── 1. example files ───────────────────────────────────────────────────────────────────────────────────────────── */
const exampleFiles = walk(PAGES).filter((file) => file.endsWith(".example.tsx")).sort();
const allowed = (file, source) => source === "react" || source === "@zen-ds/react" || (/^(\.\.\/)+data$/.test(source) && path.resolve(path.dirname(file), `${source}.ts`) === DATA);
for (const file of exampleFiles) {
  if (!/^src\/platform\/examples\/pages\/[\w-]+\/[\w-]+\.example\.tsx$/.test(rel(file))) problems.push(`${rel(file)}: an example file sits in examples/pages/<page>/<slug>.example.tsx`);
  const ast = parseFile(file);
  let component = false;
  for (const statement of ast.program.body) {
    if (statement.type === "ImportDeclaration" && !allowed(file, statement.source.value)) {
      problems.push(`${rel(file)}: imports "${statement.source.value}" — an example imports only react, @zen-ds/react and the demo world ("../../data", shown as "./demo"), so the copied code runs as it is`);
    }
    if ((statement.type === "ExportNamedDeclaration" || statement.type === "ExportAllDeclaration") && statement.source) problems.push(`${rel(file)}: re-exports "${statement.source.value}" — an example file holds one example`);
    if (statement.type === "ExportDefaultDeclaration") component = statement.declaration.type === "FunctionDeclaration" && /^[A-Z]/.test(statement.declaration.id?.name ?? "");
  }
  if (!component) problems.push(`${rel(file)}: has no \`export default function Name()\` — the page renders the file's default export, a component`);
  for (const node of nodes(ast.program)) if (node.type === "Import") problems.push(`${rel(file)}: loads a module with import() — keep the example in one file`);
}

/* ── 2 + 3. the pages that show them ────────────────────────────────────────────────────────────────────────────── */
const listFiles = [...walk(PAGES).filter((file) => file.endsWith(".tsx") && !file.endsWith(".example.tsx")), ...OTHER_LISTS.map((file) => path.join(root, file))].sort();
const counts = {};
const shown = new Set();
for (const file of listFiles) {
  const ast = parseFile(file);
  const imports = new Map();
  for (const statement of ast.program.body) {
    if (statement.type !== "ImportDeclaration") continue;
    for (const specifier of statement.specifiers) imports.set(specifier.local.name, statement.source.value);
  }
  let notMoved = 0;
  for (const node of nodes(ast.program)) {
    if (node.type !== "ObjectExpression") continue;
    const prop = (name) => node.properties.find((p) => p.type === "ObjectProperty" && (p.key.name ?? p.key.value) === name);
    if (!prop("title") || !prop("code") || !prop("render")) continue;
    const code = prop("code").value;
    const raw = code.type === "CallExpression" && code.callee.name === "exampleCode" && code.arguments[0]?.type === "Identifier" ? imports.get(code.arguments[0].name) : null;
    if (!raw || !/\.example\.tsx\?raw$/.test(raw)) { notMoved += 1; continue; }
    const source = raw.replace(/\.tsx\?raw$/, "");
    const exampleFile = path.resolve(path.dirname(file), `${source}.tsx`);
    shown.add(exampleFile);
    const renders = [...nodes(prop("render").value)].some((n) => (n.type === "JSXIdentifier" || n.type === "Identifier") && imports.get(n.name) === source);
    if (!renders) problems.push(`${rel(file)}: "${prop("title").value.value ?? "an example"}" shows ${source}.tsx but does not render its default export`);
  }
  if (notMoved) counts[rel(file)] = notMoved;
}
for (const file of exampleFiles) if (!shown.has(file)) problems.push(`${rel(file)}: no page shows it (exampleCode(<its ?raw>) beside a render of its default export)`);

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")).pages ?? {} : {};
const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
if (WRITE) {
  fs.writeFileSync(BASELINE, `${JSON.stringify({
    $comment: "Examples still written as a code string beside their render, per page file: P2b moves them to *.example.tsx files (plan docs/research/code-languages-plan-2026-10-03.md §11). A count may only go down. Written by npm run examples:check -- --write.",
    total,
    pages: counts,
  }, null, 2)}\n`);
} else {
  for (const [file, count] of Object.entries(counts)) {
    if (count > (baseline[file] ?? 0)) problems.push(`${file}: ${count} example(s) written as a code string (baseline ${baseline[file] ?? 0}) — a new example is a ${path.basename(file, ".tsx")}/<slug>.example.tsx file whose text the page shows (docs/guides/example-patterns.md › Portable examples)`);
  }
  const stale = Object.entries(baseline).filter(([file, count]) => (counts[file] ?? 0) < count).map(([file]) => file);
  if (stale.length) problems.push(`the baseline still counts examples that moved (${stale.join(", ")}) — run npm run examples:check -- --write`);
}

/* ── 4. compile what readers copy ───────────────────────────────────────────────────────────────────────────────── */
let compiled = 0;
if (COMPILE && exampleFiles.length) {
  // One directory per run: two checks at once (the gate beside a session's own run) never write over each other.
  const dir = path.join(root, `node_modules/.cache/zen-examples-fixture-${process.pid}`);
  process.on("exit", () => fs.rmSync(dir, { recursive: true, force: true }));
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const names = new Map();
  for (const file of exampleFiles) {
    const name = `${path.basename(path.dirname(file))}--${path.basename(file, ".example.tsx")}.tsx`;
    names.set(name, file);
    fs.writeFileSync(path.join(dir, name), `${exampleCode(fs.readFileSync(file, "utf8"))}\n`);
  }
  fs.writeFileSync(path.join(dir, "demo.ts"), demoFileOf(fs.readFileSync(DATA, "utf8")));
  fs.writeFileSync(path.join(dir, "env.d.ts"), '/// <reference types="vite/client" />\n');
  fs.writeFileSync(path.join(dir, "tsconfig.json"), `${JSON.stringify({
    extends: path.join(root, "tsconfig.json"),
    compilerOptions: { paths: { "@zen-ds/react": [path.join(root, "src/index.ts")] }, noUnusedLocals: true },
    include: ["./*.ts", "./*.tsx"],
  }, null, 2)}\n`);
  try {
    // --pretty false: the plain "file(line,col): error TS…" lines, whatever the environment says about colour (the QA
    // gate sets FORCE_COLOR=0, which tsc 7 took as a reason to print its coloured, multi-line format).
    execFileSync(path.join(root, "node_modules/.bin/tsc"), ["-p", path.join(dir, "tsconfig.json"), "--pretty", "false"], { cwd: root, encoding: "utf8", stdio: "pipe", maxBuffer: 64 * 1024 * 1024 });
    compiled = exampleFiles.length;
  } catch (error) {
    const out = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    // Errors in the library itself belong to tsc on the repo; here only the snippets and demo.ts count.
    const lines = out.split("\n").filter((line) => /zen-examples-fixture-\d+\//.test(line));
    for (const line of lines) {
      const match = line.match(/zen-examples-fixture-\d+\/([^(:]+)[(:](\d+)/);
      const file = match && names.get(match[1]);
      problems.push(`${file ? `${rel(file)}:${match[2]}` : match?.[1] ?? "fixture"} (as copied): ${line.replace(/^.*?error /, "error ")}`);
    }
    // The fixture turns on noUnusedLocals (an unused import in a copied snippet is noise), which the library's own sources
    // do not follow: their findings are not the snippets'. tsc that failed without any finding did not run.
    if (!lines.length && !/error TS\d+/.test(out)) problems.push(`the fixture project did not compile:\n${out.slice(0, 2000)}`);
    else if (!lines.length) compiled = exampleFiles.length;
  }
}

if (problems.length) {
  console.log(problems.map((problem) => `✗ ${problem}`).join("\n"));
  process.exit(1);
}
console.log(`✓ Example snippets: ${exampleFiles.length} example file(s) shown by their pages${COMPILE ? `, ${compiled} compiled as copied (with demo.ts)` : ""}; ${total} example(s) still a code string${WRITE ? " (baseline written)" : " (at or under the baseline)"}.`);
