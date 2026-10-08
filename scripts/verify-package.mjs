/**
 * Installs the packed library into a throwaway app and checks what a real consumer would hit.
 *
 *   npm run verify:package                 build:lib, pack → temp app → checks (offline)
 *   npm run verify:package -- --no-pack    reuse the newest dist-pack/*.tgz
 *   npm run verify:package -- --registry   real `npm install` of the tarball + publint + attw (needs network)
 *   npm run verify:package -- --keep       keep the temp app and print its path
 *
 * Checks: exports resolve, `tsc` with skipLibCheck:false, `vite build`, JS/CSS budgets, no font data or docs-platform
 * code in the output, no CSS imports left in .d.ts files, and `renderToString` in plain Node.
 * Offline mode unpacks the tarball into node_modules/@zen-ds/react and links react, react-dom, vite,
 * @vitejs/plugin-react and the React types from this repo's node_modules.
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const BUDGET = { buttonOnlyJsGz: 90 * 1024, cssGz: 110 * 1024 };
const results = [];
const pass = (label, detail = "") => results.push({ ok: true, label, detail });
const fail = (label, detail = "") => results.push({ ok: false, label, detail });
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const gz = (file) => zlib.gzipSync(fs.readFileSync(file)).length;

function run(command, commandArgs, cwd, label) {
  const result = spawnSync(command, commandArgs, { cwd, encoding: "utf8", env: { ...process.env, FORCE_COLOR: "0" } });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.status === 0) pass(label);
  else fail(label, output.split("\n").slice(-25).join("\n"));
  return { ok: result.status === 0, output };
}

// 1. Pack
const packDir = path.join(root, "dist-pack");
fs.mkdirSync(packDir, { recursive: true });
let tarball;
if (args.has("--no-pack")) {
  tarball = fs.readdirSync(packDir).filter((file) => file.endsWith(".tgz")).map((file) => path.join(packDir, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  if (!tarball) throw new Error("No dist-pack/*.tgz; run without --no-pack.");
} else {
  // Build first, then pack without lifecycle scripts: npm 11 (CI) writes the prepack build's log (vite's coloured
  // "building…", whose escape codes contain "[") into `npm pack --json`'s stdout, which then no longer parses.
  execFileSync("npm", ["run", "build:lib"], { cwd: root, stdio: ["ignore", "inherit", "inherit"] });
  const json = execFileSync("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", packDir], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  const info = JSON.parse(json)[0];
  tarball = path.join(packDir, info.filename);
  pass("npm pack", `${info.filename}: ${info.entryCount} files, ${kb(info.size)} packed, ${kb(info.unpackedSize)} unpacked`);
}

// 2. Temp app from the template
const app = fs.mkdtempSync(path.join(os.tmpdir(), "zen-consumer-"));
fs.cpSync(path.join(root, "examples/consumer-smoke"), app, { recursive: true });
const modules = path.join(app, "node_modules");
fs.mkdirSync(modules, { recursive: true });

if (args.has("--registry")) {
  run("npm", ["install", "--no-audit", "--no-fund", tarball, "react@^19", "react-dom@^19", "-D", "vite@^8", "@vitejs/plugin-react", "typescript@^7", "@types/react@^19", "@types/react-dom@^19"], app, "npm install (registry)");
} else {
  const pkg = path.join(modules, "@zen-ds/react");
  fs.mkdirSync(pkg, { recursive: true });
  execFileSync("tar", ["-xzf", tarball, "-C", pkg, "--strip-components=1"]);
  for (const name of ["react", "react-dom", "scheduler", "vite", "@vitejs/plugin-react", "@types/react", "@types/react-dom"]) {
    const target = path.join(root, "node_modules", name);
    if (!fs.existsSync(target)) continue;
    fs.mkdirSync(path.dirname(path.join(modules, name)), { recursive: true });
    fs.symlinkSync(target, path.join(modules, name), "dir");
  }
  pass("install (offline: unpacked tarball + linked peers)");
}
const pkgDir = path.join(modules, "@zen-ds/react");

// 3. Package contents
const packageJson = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"));
const missing = Object.entries(packageJson.exports).flatMap(([key, value]) => {
  const targets = typeof value === "string" ? [value] : Object.values(value);
  return targets.filter((target) => !fs.existsSync(path.join(pkgDir, target))).map((target) => `${key} → ${target}`);
});
missing.length ? fail("exports resolve", missing.join("\n")) : pass("exports resolve", `${Object.keys(packageJson.exports).length} entry points`);

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(target) : [target];
});
const shipped = walk(pkgDir);
const cssInDts = shipped.filter((file) => file.endsWith(".d.ts") && /\.css["']/.test(fs.readFileSync(file, "utf8")));
cssInDts.length ? fail("no .css imports in .d.ts", cssInDts.map((file) => path.relative(pkgDir, file)).join("\n")) : pass("no .css imports in .d.ts");
const docsLeak = shipped.filter((file) => /\/(platform|foundations)\//.test(path.relative(pkgDir, file)) || /PlatformApp|official-platform/.test(file.endsWith(".js") ? fs.readFileSync(file, "utf8") : ""));
docsLeak.length ? fail("no docs-platform code shipped", docsLeak.slice(0, 5).map((file) => path.relative(pkgDir, file)).join("\n")) : pass("no docs-platform code shipped");
for (const doc of ["AGENTS.consumer.md", "llms.txt", "docs/getting-started.md", "docs/guidelines/index.json", "docs/api"]) {
  if (!fs.existsSync(path.join(pkgDir, doc))) fail(`ships ${doc}`);
}

// 4. Types, build, SSR
const tsc = path.join(root, "node_modules/.bin/tsc");
run(tsc, ["-p", "tsconfig.json"], app, "tsc (skipLibCheck: false)");
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
  const allJs = walk(out).filter((file) => file.endsWith(".js"));
  const lazyChunks = allJs.length - scripts.length;
  (jsGz <= BUDGET.buttonOnlyJsGz ? pass : fail)("budget: Button-only JS (incl. React) ≤ 90 KB gz", `${kb(jsGz)} in ${scripts.length} files (${lazyChunks} other chunks, e.g. lazy icon buckets)`);
  (cssGz <= BUDGET.cssGz ? pass : fail)("budget: CSS ≤ 110 KB gz", kb(cssGz));
  const fontData = cssFiles.some((file) => /data:font|base64,d09G/.test(fs.readFileSync(file, "utf8")));
  fontData ? fail("no inlined font data in CSS") : pass("no inlined font data in CSS", `${walk(out).filter((file) => /\.woff2?$/.test(file)).length} font files emitted`);
  const platformInJs = allJs.filter((file) => /official-platform|PlatformApp|TASA Explorer/.test(fs.readFileSync(file, "utf8")));
  platformInJs.length ? fail("no docs-platform code in app bundle", platformInJs.map((file) => path.basename(file)).join(", ")) : pass("no docs-platform code in app bundle");
}

// 6. Usage harness shipped with the package: zen-usage (app mode) and the ESLint plugin
const zenUsage = path.join(pkgDir, "tools/usage-guard/cli.mjs");
if (!packageJson.bin?.["zen-usage"] || !fs.existsSync(zenUsage)) fail("ships the zen-usage bin", "package.json bin.zen-usage or tools/usage-guard/cli.mjs is missing");
else {
  run(process.execPath, [zenUsage], app, "zen-usage passes on the template app");
  fs.writeFileSync(path.join(app, "src/usage-bad.tsx"), 'import { IconButton } from "@zen-ds/react";\nexport const Bad = () => <IconButton icon="icon-plus-line" />;\n');
  const bad = spawnSync(process.execPath, [zenUsage, "--json", "src/usage-bad.tsx"], { cwd: app, encoding: "utf8" });
  const found = (() => { try { return JSON.parse(bad.stdout).map((f) => f.rule); } catch { return []; } })();
  bad.status === 1 && found.includes("icon-button/needs-name") ? pass("zen-usage catches a nameless IconButton (exit 1)") : fail("zen-usage catches a nameless IconButton (exit 1)", `exit ${bad.status}: ${found.join(", ") || bad.stderr}`);
  fs.rmSync(path.join(app, "src/usage-bad.tsx"));
  run(process.execPath, ["--input-type=module", "-e", 'const { default: zen } = await import("@zen-ds/react/eslint"); if (!zen.rules.usage || !zen.configs.recommended) process.exit(1);'], app, "ESLint plugin loads from @zen-ds/react/eslint");
}

// 7. MCP server shipped with the package: initialize, list tools, answer a search and a harness check over stdio
const mcpServer = path.join(pkgDir, "mcp/server.mjs");
if (!packageJson.bin?.["zen-ds-mcp"] || !fs.existsSync(mcpServer)) fail("ships the zen-ds-mcp bin", "package.json bin.zen-ds-mcp or mcp/server.mjs is missing");
else {
  const requests = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "verify-package", version: "1" } } },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "search_icons", arguments: { query: "search" } } },
    { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "check_usage", arguments: { code: 'import { IconButton } from "@zen-ds/react";\nexport const A = () => <IconButton icon="icon-plus-line" />;', filename: "A.tsx" } } },
    { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "get_component", arguments: { name: "Table" } } },
  ];
  const out = spawnSync(process.execPath, [mcpServer], { cwd: app, input: `${requests.map((r) => JSON.stringify(r)).join("\n")}\n`, encoding: "utf8", timeout: 20000 });
  const replies = new Map(out.stdout.split("\n").filter(Boolean).map((line) => { try { const m = JSON.parse(line); return [m.id, m]; } catch { return [null, null]; } }));
  const textOf = (id) => replies.get(id)?.result?.content?.map((c) => c.text).join("\n") ?? "";
  const ok = replies.get(1)?.result?.serverInfo?.name === "zen-ds" && (replies.get(2)?.result?.tools?.length ?? 0) >= 8
    && /icon-search-medium-line/.test(textOf(3)) && /icon-button\/needs-name/.test(textOf(4)) && /## Props/.test(textOf(5));
  ok ? pass("zen-ds-mcp answers over stdio", `${replies.get(2).result.tools.length} tools; icons, harness and component docs resolve from the package`) : fail("zen-ds-mcp answers over stdio", `${out.stdout.slice(0, 600)}${out.stderr.slice(0, 400)}`);
}

// 8. zen-ds init / doctor in the temp app (the template imports styles.css and renders ZenProvider)
const zenDs = path.join(pkgDir, "tools/zen-ds.mjs");
if (!packageJson.bin?.["zen-ds"] || !fs.existsSync(zenDs)) fail("ships the zen-ds bin", "package.json bin.zen-ds or tools/zen-ds.mjs is missing");
else {
  run(process.execPath, [zenDs, "init"], app, "zen-ds init writes AGENTS.md / CLAUDE.md / .mcp.json");
  const again = spawnSync(process.execPath, [zenDs, "init"], { cwd: app, encoding: "utf8" });
  /nothing changed/.test(again.stdout) ? pass("zen-ds init is idempotent") : fail("zen-ds init is idempotent", again.stdout);
  run(process.execPath, [zenDs, "doctor"], app, "zen-ds doctor passes on the template app");
  const npmrcFile = path.join(app, ".npmrc");
  const npmrc = fs.readFileSync(npmrcFile, "utf8");
  const registry = packageJson.publishConfig?.registry;
  npmrc.includes(`@zen-ds:registry=${registry}`) ? pass("zen-ds init adds the @zen-ds registry line to .npmrc", registry) : fail("zen-ds init adds the @zen-ds registry line to .npmrc", npmrc);
  // doctor: a token written into the project's .npmrc fails, an env reference passes.
  const host = new URL(registry).host;
  const doctorWith = (line) => { fs.writeFileSync(npmrcFile, `${npmrc}${line}\n`); return spawnSync(process.execPath, [zenDs, "doctor"], { cwd: app, encoding: "utf8" }); };
  const literal = doctorWith(`//${host}/:_authToken=abc123`);
  const fromEnv = doctorWith(`//${host}/:_authToken=\${ZEN_DS_NPM_TOKEN}`);
  fs.writeFileSync(npmrcFile, npmrc);
  literal.status === 1 && /✗ no registry token/.test(literal.stdout) && fromEnv.status === 0
    ? pass("zen-ds doctor flags a registry token written in .npmrc") : fail("zen-ds doctor flags a registry token written in .npmrc", `${literal.stdout}\n${fromEnv.stdout}`);
}

// 9. Registry-only extras
if (args.has("--registry")) {
  run("npx", ["--yes", "publint", pkgDir], app, "publint");
  run("npx", ["--yes", "@arethetypeswrong/cli", "--pack", pkgDir, "--profile", "esm-only"], app, "attw");
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
