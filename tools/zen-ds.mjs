#!/usr/bin/env node
// `npx zen-ds <command>` — set an app up for building with Zen DS (and for AI agents working on it).
//
//   zen-ds init     add the AI entry points to the app: AGENTS.md section, CLAUDE.md (@AGENTS.md), .mcp.json (zen-ds MCP
//                   server); prints the ESLint and setup snippets. Idempotent: re-running changes nothing.
//   zen-ds doctor   check the app's setup: package + React versions, styles.css imported, ZenProvider rendered,
//                   ESLint plugin / MCP / AGENTS wired. Exit 1 when something required is missing.
//   zen-ds check    same as `zen-usage` (the usage harness on ./src).
//   zen-ds audit    load pages in Chromium and check what people see: overflow, names, contrast, the heading outline,
//                   Zen text styles and tokens, text that does not fit, axe-core (when installed); screenshots at 1440 and
//                   390 (tools/zen-audit/audit.mjs). Needs Playwright in the app.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(fs.readFileSync(path.join(pkgRoot, "package.json"), "utf8"));
const app = process.cwd();
const rel = (file) => path.relative(app, file) || ".";
const exists = (file) => fs.existsSync(path.join(app, file));
const readApp = (file) => { try { return fs.readFileSync(path.join(app, file), "utf8"); } catch { return null; } };

const AGENTS_MARKER = "<!-- zen-ds -->";
const agentsSection = `${AGENTS_MARKER}
## UI: Zen Design System (@zen-ds/react ${pkg.version})

Build every screen from Zen components; do not hand-write buttons, inputs, menus, layout wrappers or text styles.
1. Read \`node_modules/@zen-ds/react/AGENTS.consumer.md\` once (setup, the rules that go wrong most, API facts).
2. Pick components with the \`zen-ds\` MCP tools (\`list_components\`, \`get_component\`, \`search_icons\`, \`get_template\`) or
   \`node_modules/@zen-ds/react/docs/guidelines/index.json\`; props for each are in \`docs/api/<slug>.json\`.
3. Start screens from a template (\`get_template\` / \`node_modules/@zen-ds/react/src/templates\`).
4. After every change run \`npx zen-usage\` (or the MCP \`check_usage\` tool) and fix each ✗; \`npx zen-ds doctor\` checks the setup.
5. Check the screens you changed as rendered: \`npx zen-ds audit http://localhost:5173/<route>\` (overflow, names, outline, Zen
   text styles and tokens, text that does not fit; screenshots at 1440 and 390) and fix each ✗.
${AGENTS_MARKER}
`;

function init() {
  const changes = [];
  // AGENTS.md: append (or refresh) the Zen section between markers.
  const agentsFile = path.join(app, "AGENTS.md");
  const agents = readApp("AGENTS.md");
  if (agents === null) { fs.writeFileSync(agentsFile, `# Agent guide\n\n${agentsSection}`); changes.push(`created ${rel(agentsFile)}`); }
  else if (!agents.includes(AGENTS_MARKER)) { fs.writeFileSync(agentsFile, `${agents.replace(/\s*$/, "\n\n")}${agentsSection}`); changes.push(`added the Zen section to ${rel(agentsFile)}`); }
  else {
    const updated = agents.replace(new RegExp(`${AGENTS_MARKER}[\\s\\S]*?${AGENTS_MARKER}\\n?`), agentsSection);
    if (updated !== agents) { fs.writeFileSync(agentsFile, updated); changes.push(`refreshed the Zen section in ${rel(agentsFile)}`); }
  }
  // CLAUDE.md: Claude Code reads it; point it at AGENTS.md.
  const claude = readApp("CLAUDE.md");
  if (claude === null) { fs.writeFileSync(path.join(app, "CLAUDE.md"), "@AGENTS.md\n"); changes.push("created CLAUDE.md (@AGENTS.md)"); }
  else if (!/@AGENTS\.md/.test(claude)) { fs.writeFileSync(path.join(app, "CLAUDE.md"), `${claude.replace(/\s*$/, "\n\n")}@AGENTS.md\n`); changes.push("CLAUDE.md now imports @AGENTS.md"); }
  // .mcp.json: the zen-ds MCP server.
  let mcp = { mcpServers: {} };
  try { mcp = JSON.parse(readApp(".mcp.json") ?? '{"mcpServers":{}}'); } catch { console.error("✗ .mcp.json is not valid JSON; left unchanged."); mcp = null; }
  if (mcp && !mcp.mcpServers?.["zen-ds"]) {
    mcp.mcpServers = { ...(mcp.mcpServers ?? {}), "zen-ds": { command: "npx", args: ["zen-ds-mcp"] } };
    fs.writeFileSync(path.join(app, ".mcp.json"), `${JSON.stringify(mcp, null, 2)}\n`);
    changes.push("registered the zen-ds MCP server in .mcp.json");
  }
  console.log(changes.length ? changes.map((c) => `✓ ${c}`).join("\n") : "✓ Already set up (nothing changed).");
  console.log(`
Next steps (not automated — they touch your code):
  1. Entry file:  import "@zen-ds/react/styles.css";
  2. Root:        <ZenProvider theme="system"> <App /> </ZenProvider>   (import { ZenProvider } from "@zen-ds/react")
  3. ESLint (flat config), optional:
       import zen from "@zen-ds/react/eslint";
       export default [ ...yourConfig, zen.configs.recommended ];   // or zen.configs.standalone without a JSX parser
Then run: npx zen-ds doctor`);
  return 0;
}

function doctor() {
  const checks = [];
  const add = (ok, label, hint, required = true) => checks.push({ ok, label, hint, required });
  const appPkg = (() => { try { return JSON.parse(readApp("package.json")); } catch { return null; } })();
  const deps = { ...(appPkg?.dependencies ?? {}), ...(appPkg?.devDependencies ?? {}) };
  add(Boolean(appPkg), "package.json found", "run zen-ds from your app's root folder");
  add(Boolean(deps["@zen-ds/react"]), "@zen-ds/react is a dependency", "npm install @zen-ds/react");
  const reactVersion = (() => { try { return JSON.parse(fs.readFileSync(path.join(app, "node_modules/react/package.json"), "utf8")).version; } catch { return null; } })();
  add(Boolean(reactVersion && Number(reactVersion.split(".")[0]) >= 19), `React ≥ 19 installed${reactVersion ? ` (${reactVersion})` : ""}`, "npm install react@^19 react-dom@^19");
  const srcDir = exists("src") ? path.join(app, "src") : app;
  const sources = fs.existsSync(srcDir) ? fs.readdirSync(srcDir, { recursive: true }).map(String).filter((f) => /\.[jt]sx?$/.test(f) && !/node_modules|dist/.test(f)) : [];
  const text = sources.map((f) => fs.readFileSync(path.join(srcDir, f), "utf8"));
  add(text.some((t) => /@zen-ds\/react\/styles\.css/.test(t)), "styles.css is imported", 'add import "@zen-ds/react/styles.css" to your entry file (main.tsx)');
  add(text.some((t) => /<ZenProvider\b/.test(t)), "ZenProvider wraps the app", "render <ZenProvider> around your app (modes, Canvas, overlays, toasts)");
  add(!text.some((t) => /@zen-ds\/react\/(src|dist)\//.test(t)), "no deep imports into the package", 'import from "@zen-ds/react" (and /styles.css, /icons/all, /eslint), not from its src or dist folders');
  add(readApp("AGENTS.md")?.includes(AGENTS_MARKER) ?? false, "AGENTS.md has the Zen section", "npx zen-ds init", false);
  add(Boolean(readApp(".mcp.json")?.includes("zen-ds")), ".mcp.json registers the zen-ds MCP server", "npx zen-ds init", false);
  const eslintConfig = ["eslint.config.js", "eslint.config.mjs", "eslint.config.ts"].map(readApp).find(Boolean);
  add(Boolean(eslintConfig && /@zen-ds\/react\/eslint/.test(eslintConfig)), "ESLint uses @zen-ds/react/eslint", "add zen.configs.recommended to eslint.config.js (optional; npx zen-usage does the same)", false);
  for (const c of checks) console.log(`${c.ok ? "✓" : c.required ? "✗" : "○"} ${c.label}${c.ok ? "" : ` — ${c.hint}`}`);
  const failed = checks.filter((c) => !c.ok && c.required).length;
  console.log(failed ? `\n${failed} required check(s) failed.` : "\nZen DS setup looks right.");
  return failed ? 1 : 0;
}

export async function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  if (command === "init") return init();
  if (command === "doctor") return doctor();
  if (command === "check") { const { main: usage } = await import("./usage-guard/cli.mjs"); return usage(rest); }
  if (command === "audit") { const { audit } = await import("./zen-audit/audit.mjs"); return audit(rest); }
  console.log("usage: zen-ds init | doctor | check [paths…] | audit <url…>\n  init    add AGENTS.md / CLAUDE.md / .mcp.json entry points for AI agents\n  doctor  check the app's Zen setup\n  check   run the usage harness (same as zen-usage)\n  audit   check rendered pages in Chromium (overflow, names, outline, Zen tokens, fit, axe) + screenshots");
  return command ? 2 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) main().then((code) => process.exit(code));
