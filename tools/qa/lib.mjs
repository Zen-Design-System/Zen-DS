// Shared helpers for the Build-QA gate (tools/qa/run.mjs) and its Claude Code hooks (tools/qa/hooks/*).
// Plain Node, no dependencies, fast enough to run after every edit.
import fs from "node:fs";
import path from "node:path";

/** The Zen DS repo that owns `file` (nearest package.json named @zen/design-system), or null. */
export function repoRootOf(file) {
  let dir = path.dirname(path.resolve(file));
  for (let i = 0; i < 12 && dir !== path.dirname(dir); i++, dir = path.dirname(dir)) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg)) { try { if (JSON.parse(fs.readFileSync(pkg, "utf8")).name === "@zen/design-system") return dir; } catch { /* keep walking */ } }
  }
  return null;
}
export const relTo = (root, file) => path.relative(root, path.resolve(file)).split(path.sep).join("/");

/** Hand-written UI: components, platform (playgrounds + examples), templates, foundations pages and hand-kept styles. */
export function uiKind(rel) {
  if (/\.stories\.(tsx|css)$|\.generated\.|^src\/icons\/generated\//.test(rel)) return null;
  if (/^src\/components\/.+\.(tsx|ts|css)$/.test(rel)) return "component";
  if (/^src\/(platform|foundations)\/.+\.(tsx|ts|css)$/.test(rel)) return "platform";
  if (/^src\/templates\/.+\.(tsx|ts|css)$/.test(rel)) return "template";
  if (/^src\/styles\/.+\.css$/.test(rel)) return "styles";
  return null;
}

/* ── pages ──────────────────────────────────────────────────────────────────────────────────────────────────────── */
export function allPages(root) {
  const src = fs.readFileSync(path.join(root, "src/platform/PlatformApp.tsx"), "utf8");
  const nav = src.slice(src.indexOf("const componentNavigation"), src.indexOf("];", src.indexOf("const componentNavigation")));
  const ids = [...nav.matchAll(/id:\s*"([\w-]+)"/g)].map((m) => m[1]);
  let layer = "";
  try { layer = fs.readFileSync(path.join(root, "src/platform/appLayer/types.ts"), "utf8").match(/appLayerPageIds\s*=\s*\[([^\]]*)\]/)?.[1] ?? ""; } catch { /* older checkout */ }
  return ["overviews", "installation", "design-tokens", "typography", "iconography", ...new Set([...ids, ...[...layer.matchAll(/"([\w-]+)"/g)].map((m) => m[1])])];
}
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const FOLDER_PAGE = { ListItem: "list-item", MetricWidget: "metric", Icon: "iconography", FileIcon: "uploader", Provider: "installation" };
/** Components that most pages render: a change there is checked on a representative set of pages too. */
export const CORE = new Set(["_shared", "Portal", "Motion", "Provider", "Icon", "Text", "Button", "Popover", "Layout", "Tooltip", "Input", "ListItem"]);
export const REPRESENTATIVE = ["button", "card", "dialog", "popover", "list-item", "chat", "templates"];
const FOUNDATION_PAGE = { FoundationOverview: "overviews", TokenCollectionPage: "design-tokens", TokenTableView: "design-tokens", TextStylesGallery: "typography", IconGallery: "iconography" };

/** Nearest `  key: [` of an examples map above `index` (the map key is the page id). */
function mapKeyBefore(src, index) {
  const head = src.slice(0, index);
  const hits = [...head.matchAll(/\n {2}"?([a-z][\w-]*)"?:\s*\[/g)];
  return hits.length ? hits[hits.length - 1][1] : null;
}
/** Page ids for a position in a platform source file (an example function, an examples-map entry, a playground branch). */
export function pagesAt(src, index, pages) {
  const out = new Set();
  const inPlayground = [...src.slice(0, index).matchAll(/page === "([\w-]+)"/g)].pop();
  const mapStart = src.search(/\n(export )?const \w*[eE]xamples\w*\s*(:[^=]+)?=\s*\{/);
  if (mapStart >= 0 && index > mapStart) { const k = mapKeyBefore(src, index); if (k && pages.includes(k)) out.add(k); }
  else {
    const fn = [...src.slice(0, index).matchAll(/\n(?:export )?(?:function (\w+)|const (\w+)\s*=\s*(?:\([^)]*\)|\w+)\s*=>)/g)].pop();
    const name = fn?.[1] ?? fn?.[2];
    if (name && mapStart >= 0) for (const use of src.slice(mapStart).matchAll(new RegExp(`<${name}\\b|\\b${name}\\(`, "g"))) { const k = mapKeyBefore(src, mapStart + use.index); if (k && pages.includes(k)) out.add(k); }
    if (!out.size && inPlayground && pages.includes(inPlayground[1])) out.add(inPlayground[1]);
  }
  return [...out];
}
/** Page ids that render the edited region of `rel`. `snippets` are the edited strings when known (hooks pass them). */
export function pagesForEdit(root, rel, snippets = [], pages = allPages(root)) {
  const out = new Set(); const notes = [];
  const kind = uiKind(rel); if (!kind) return { pages: [], notes };
  const comp = rel.match(/^src\/components\/([^/]+)\//)?.[1];
  if (comp) {
    const page = FOLDER_PAGE[comp] ?? kebab(comp);
    if (pages.includes(page)) out.add(page);
    if (CORE.has(comp)) { REPRESENTATIVE.forEach((p) => out.add(p)); notes.push(`${comp} is used by most pages: a representative set is checked; run with --all before delivering a core change`); }
    return { pages: [...out], notes };
  }
  if (kind === "template") return { pages: ["templates"], notes };
  if (kind === "styles") { REPRESENTATIVE.forEach((p) => out.add(p)); notes.push("global styles changed: also run tokens:check / styles:check, and --all before delivering"); return { pages: [...out], notes }; }
  const base = path.basename(rel).replace(/\.\w+$/, "");
  if (FOUNDATION_PAGE[base]) return { pages: [FOUNDATION_PAGE[base]], notes };
  const abs = path.join(root, rel);
  const src = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
  if (rel.endsWith(".css")) {
    // A platform stylesheet: find the pages whose examples use the edited classes.
    const classes = [...new Set(snippets.flatMap((s) => [...s.matchAll(/\.((?:pe|pg|platform|official)-[\w-]+)/g)].map((m) => m[1].replace(/__.*|--.*/, ""))))].slice(0, 6);
    const dir = path.join(root, "src/platform");
    const tsx = fs.readdirSync(dir, { recursive: true }).filter((f) => String(f).endsWith(".tsx")).map((f) => path.join(dir, String(f)));
    for (const cls of classes) for (const file of tsx) {
      const s = fs.readFileSync(file, "utf8"); let n = 0;
      for (const m of s.matchAll(new RegExp(`\\b${cls}\\b`, "g"))) { pagesAt(s, m.index, pages).forEach((p) => out.add(p)); if (++n >= 3) break; }
    }
    if (!classes.length || !out.size) notes.push(`${rel}: could not tell which pages use the edited rules — pass --pages`);
    if (/^\.?official-|platform-(app|sidebar|topbar|shell)/.test(classes.join(" "))) { out.add("overviews"); notes.push("platform shell styles changed: check the shell at 1512, 1024 and 390"); }
    return { pages: [...out], notes };
  }
  if (/PlatformApp\.tsx$/.test(rel)) { ["overviews", "button", "chat"].forEach((p) => out.add(p)); notes.push("platform shell changed: check navigation, the drawer at ≤1024 and deep links"); }
  else for (const snip of snippets.filter((s) => s && s.length > 8)) {
    const at = src.indexOf(snip.slice(0, 400)); if (at < 0) continue;
    pagesAt(src, at, pages).forEach((p) => out.add(p));
  }
  // An app-layer module owns a `pages` map: when the edit cannot be placed, check every page the module owns.
  if (!out.size && /^src\/platform\/appLayer\//.test(rel)) {
    const i = src.search(/\nexport const pages\b[^=]*=\s*\{/);
    if (i >= 0) for (const m of src.slice(i, src.indexOf("\n};", i)).matchAll(/\n {2}"?([a-z][\w-]*)"?:\s*\{/g)) if (pages.includes(m[1])) out.add(m[1]);
  }
  if (!out.size) notes.push(`${rel}: could not tell which pages the edit renders on — pass --pages`);
  return { pages: [...out], notes };
}

/* ── per-session ledger (.qa/sessions/<session>.json) ───────────────────────────────────────────────────────────── */
export const ledgerPath = (root, session) => path.join(root, ".qa", "sessions", `${String(session).replace(/[^\w-]/g, "")}.json`);
export function readLedger(root, session) {
  try { return JSON.parse(fs.readFileSync(ledgerPath(root, session), "utf8")); } catch { return { session, files: {}, runs: [] }; }
}
export function writeLedger(root, session, ledger) {
  const file = ledgerPath(root, session);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(ledger, null, 2));
  fs.renameSync(tmp, file);
}
/** Files this session edited after their last passing full QA run (files deleted since then no longer count). */
export const dirtyFiles = (ledger, root = ledger.repo) => Object.entries(ledger.files ?? {})
  .filter(([rel, f]) => (!f.passedAt || f.editedAt > f.passedAt) && (!root || fs.existsSync(path.join(root, rel))))
  .map(([rel]) => rel);
