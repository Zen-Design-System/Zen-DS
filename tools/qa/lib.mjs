// Shared helpers for the Build-QA gate (tools/qa/run.mjs) and its Claude Code hooks (tools/qa/hooks/*).
// Plain Node, no dependencies, fast enough to run after every edit.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

/** The Zen DS repo that owns `file` (nearest package.json named @zen-ds/react), or null. */
export function repoRootOf(file) {
  let dir = path.dirname(path.resolve(file));
  for (let i = 0; i < 12 && dir !== path.dirname(dir); i++, dir = path.dirname(dir)) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg)) { try { if (JSON.parse(fs.readFileSync(pkg, "utf8")).name === "@zen-ds/react") return dir; } catch { /* keep walking */ } }
  }
  return null;
}
export const relTo = (root, file) => path.relative(root, path.resolve(file)).split(path.sep).join("/");

/** Hand-written UI: components, platform (playgrounds + examples), templates, foundations pages and hand-kept styles. */
export function uiKind(rel) {
  if (/\.stories\.(tsx|css)$|\.generated\.|^src\/icons\/generated\//.test(rel)) return null;
  if (/^src\/components\/.+\.(tsx|ts|css)$/.test(rel)) return "component";
  // Zen Studio (the canvas tool) and its E2E fixture render on no platform page: the gate checks them with the Studio
  // self-tests and the Studio E2E harness (tools/studio/e2e), not the page audit.
  if (/^src\/platform\/(studio|examples\/e2e)\/.+\.(tsx|ts|css)$/.test(rel)) return "studio";
  if (/^src\/(platform|foundations)\/.+\.(tsx|ts|css)$/.test(rel)) return "platform";
  if (/^src\/templates\/.+\.(tsx|ts|css)$/.test(rel)) return "template";
  if (/^src\/styles\/.+\.css$/.test(rel)) return "styles";
  return null;
}
/**
 * Files that scope the static gates but render no page: harness and contract tooling, tests, token and style sources.
 * The hook records them in `ledger.aux`; they never make a session "dirty" for the Stop hook.
 */
export function auxKind(rel) {
  if (/(^|\/)(node_modules|\.out)\//.test(rel)) return null;
  if (/^tools\/usage-guard\//.test(rel)) return "usage-guard";
  if (/^tools\/style-guard\//.test(rel)) return "style-guard";
  if (/^tools\/figma-contract\//.test(rel)) return "figma-contract";
  if (/^tools\/studio\//.test(rel)) return "studio";
  if (/^tests\//.test(rel)) return "tests";
  if (/^(tokens\/source|src\/tokens)\//.test(rel)) return "tokens";
  if (/^styles\/source\//.test(rel)) return "styles-source";
  if (/^scripts\/build-api\.mjs$/.test(rel)) return "guidelines";
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
/** The platform page of a component folder (src/components/<Folder>). */
export const folderPage = (folder) => FOLDER_PAGE[folder] ?? kebab(folder);
/** Components that most pages render: a change there is checked on a representative set of pages too. */
export const CORE = new Set(["_shared", "Portal", "Motion", "Provider", "Icon", "Text", "Button", "Popover", "Layout", "Tooltip", "Input", "ListItem"]);
export const REPRESENTATIVE = ["button", "card", "dialog", "popover", "list-item", "chat", "templates"];
const FOUNDATION_PAGE = { FoundationOverview: "overviews", TokenCollectionPage: "design-tokens", TokenTableView: "design-tokens", TextStylesGallery: "typography", PlatformTypographyHierarchy: "typography", IconGallery: "iconography" };
/** Custom properties generated from Figma variables / effect styles: an edit is a token value change (scoped by consumers). */
export const TOKEN_STYLE_FILES = ["src/styles/tokens.css", "src/styles/style-effects.css"];
/** Typography sources: text styles render on every page (tier L, --all before delivering). */
const TYPOGRAPHY_STYLE = /^src\/styles\/(typography|fonts)\.css$/;
const ALL_NOTE = "run with --all before delivering (tier L)";
/** The built-in label dictionary: a key edit reaches only the components that read those keys. */
export const LABELS_FILE = "src/components/_shared/labels.ts";
/** Keys added or changed in the label dictionary: from the edited snippets, else from `git diff HEAD` (read-only). */
export function labelKeys(root, snippets = []) {
  let text = snippets.join("\n");
  if (!text.trim()) {
    const r = spawnSync("git", ["diff", "-U0", "--no-color", "HEAD", "--", LABELS_FILE], { cwd: root, encoding: "utf8", timeout: 30000 });
    text = (r.stdout ?? "").split("\n").filter((l) => /^[+-](?![+-])/.test(l)).map((l) => l.slice(1)).join("\n");
  }
  return [...new Set([...text.matchAll(/^\s*([A-Za-z_]\w*)\??\s*:/gm)].map((m) => m[1]))];
}
/** Component folders (outside _shared) whose source names one of `keys`. */
export function labelUsers(root, keys) {
  if (!keys.length) return [];
  const re = new RegExp(`\\b(${keys.join("|")})\\b`); const dir = path.join(root, "src/components"); const out = new Set();
  for (const f of fs.readdirSync(dir, { recursive: true })) {
    const p = String(f).split(path.sep).join("/");
    if (!/\.tsx?$/.test(p) || p.startsWith("_shared/") || /\.stories\./.test(p)) continue;
    if (re.test(fs.readFileSync(path.join(dir, p), "utf8"))) out.add(p.split("/")[0]);
  }
  return [...out];
}

/** Nearest `  key: [` of an examples map above `index` (the map key is the page id). */
function mapKeyBefore(src, index) {
  const head = src.slice(0, index);
  const hits = [...head.matchAll(/\n {2}"?([a-z][\w-]*)"?:\s*\[/g)];
  return hits.length ? hits[hits.length - 1][1] : null;
}
/** The top-level function or arrow component that encloses `index`. */
function enclosingFn(src, index) {
  const fn = [...src.slice(0, index).matchAll(/\n(?:export )?(?:function (\w+)|const (\w+)\s*=\s*(?:\([^)]*\)|\w+)\s*=>)/g)].pop();
  return fn?.[1] ?? fn?.[2] ?? null;
}
/** Where `name` is rendered or called in `src` (its own `function name(` excluded). */
function usesOf(src, name) {
  return [...src.matchAll(new RegExp(`<${name}\\b|\\b${name}\\(`, "g"))].map((m) => m.index).filter((i) => !/function\s+$/.test(src.slice(Math.max(0, i - 12), i)));
}
/** Page ids for a position in a platform source file (an example function, an examples-map entry, a playground branch).
 *  A helper is followed through the functions that use it (a list inside an example inside the map), up to 3 levels. */
export function pagesAt(src, index, pages, depth = 0, seen = new Set()) {
  const out = new Set();
  const inPlayground = [...src.slice(0, index).matchAll(/page === "([\w-]+)"/g)].pop();
  const mapStart = src.search(/\n(export )?const \w*[eE]xamples\w*\s*(:[^=]+)?=\s*\{/);
  if (mapStart >= 0 && index > mapStart) { const k = mapKeyBefore(src, index); if (k && pages.includes(k)) out.add(k); }
  else {
    const name = enclosingFn(src, index);
    if (name && depth < 3 && !seen.has(name)) {
      seen.add(name);
      for (const at of usesOf(src, name)) pagesAt(src, at, pages, depth + 1, seen).forEach((p) => out.add(p));
    }
    if (!out.size && inPlayground && pages.includes(inPlayground[1])) out.add(inPlayground[1]);
  }
  return [...out];
}
/** The pages an app-layer module owns (its `export const pages = { id: {…} }` map). */
function appLayerPages(src, pages) {
  const i = src.search(/\nexport const pages\b[^=]*=\s*\{/);
  if (i < 0) return [];
  return [...src.slice(i, src.indexOf("\n};", i)).matchAll(/\n {2}"?([a-z][\w-]*)"?:\s*\{/g)].map((m) => m[1]).filter((p) => pages.includes(p));
}
/** Pages that render an exported platform component or helper from another file (PlatformPhone, ChartReportPanel…).
 *  A use that cannot be placed in a file counts for the file's own page(s): a foundation page, or an app-layer module. */
function pagesUsingExport(root, rel, name, pages) {
  const out = new Set();
  const dir = path.join(root, "src/platform");
  for (const f of fs.readdirSync(dir, { recursive: true }).map(String).filter((f) => f.endsWith(".tsx") && path.join("src/platform", f) !== rel)) {
    const s = fs.readFileSync(path.join(dir, f), "utf8");
    const uses = s.includes(name) ? usesOf(s, name) : [];
    if (!uses.length) continue;
    const found = new Set(uses.flatMap((at) => pagesAt(s, at, pages)));
    if (!found.size) {
      const own = FOUNDATION_PAGE[path.basename(f, ".tsx")];
      (own ? [own] : f.startsWith("appLayer/") ? appLayerPages(s, pages) : []).forEach((p) => found.add(p));
    }
    found.forEach((p) => out.add(p));
  }
  return out;
}
/** Pages whose examples use any of these platform classes (pe-/pg-/platform-/official-); every platform TSX is read once. */
function pagesForClasses(root, classes, pages) {
  const out = new Set();
  if (!classes.length) return out;
  const dir = path.join(root, "src/platform");
  const tsx = fs.readdirSync(dir, { recursive: true }).filter((f) => String(f).endsWith(".tsx")).map((f) => fs.readFileSync(path.join(dir, String(f)), "utf8"));
  for (const cls of classes) for (const s of tsx) {
    let n = 0;
    for (const m of s.matchAll(new RegExp(`\\b${cls}\\b`, "g"))) { pagesAt(s, m.index, pages).forEach((p) => out.add(p)); if (++n >= 3) break; }
  }
  return out;
}
const classesIn = (snippets) => [...new Set(snippets.flatMap((s) => [...s.matchAll(/\.((?:pe|pg|platform|official)-[\w-]+)/g)].map((m) => m[1].replace(/__.*|--.*/, ""))))];
const SHELL_CLASSES = /^\.?official-|platform-(app|sidebar|topbar|shell)/;

/** Page ids that render the edited region of `rel`. `snippets` are the edited strings when known (hooks pass them). */
export function pagesForEdit(root, rel, snippets = [], pages = allPages(root)) {
  const out = new Set(); const notes = [];
  const kind = uiKind(rel); if (!kind || kind === "studio") return { pages: [], notes };
  const comp = rel.match(/^src\/components\/([^/]+)\//)?.[1];
  if (rel === LABELS_FILE) {
    // New or re-worded built-in text: only the components that read those keys render differently.
    const keys = labelKeys(root, snippets); const users = labelUsers(root, keys);
    for (const c of users) { const p = folderPage(c); if (pages.includes(p)) out.add(p); }
    notes.push(keys.length ? `labels.ts: ${keys.length} key(s) (${keys.slice(0, 6).join(", ")}${keys.length > 6 ? ", …" : ""}) read by ${users.join(", ") || "no component yet"}` : "labels.ts: could not tell which keys changed — pass --pages");
    return { pages: [...out], notes };
  }
  if (comp) {
    const page = folderPage(comp);
    if (pages.includes(page)) out.add(page);
    if (CORE.has(comp)) {
      REPRESENTATIVE.forEach((p) => out.add(p));
      notes.push(comp === "_shared" ? `_shared is used by every component: a representative set is checked; ${ALL_NOTE}` : `${comp} is used by most pages: a representative set is checked too`);
    }
    return { pages: [...out], notes };
  }
  if (kind === "template") return { pages: ["templates"], notes };
  if (kind === "styles") {
    // Token values: run.mjs scopes them by the components and pages that consume the changed custom properties.
    if (TOKEN_STYLE_FILES.includes(rel)) return { pages: [], notes };
    REPRESENTATIVE.forEach((p) => out.add(p));
    notes.push(TYPOGRAPHY_STYLE.test(rel) ? `typography changed (text styles render on every page): a representative set is checked; ${ALL_NOTE}` : "global styles changed: a representative set is checked; also run tokens:check / styles:check");
    return { pages: [...out], notes };
  }
  const base = path.basename(rel).replace(/\.\w+$/, "");
  if (FOUNDATION_PAGE[base]) return { pages: [FOUNDATION_PAGE[base]], notes };
  const abs = path.join(root, rel);
  const src = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
  if (rel.endsWith(".css")) {
    // A platform stylesheet: find the pages whose examples use the edited classes.
    const classes = classesIn(snippets).slice(0, 6);
    pagesForClasses(root, classes, pages).forEach((p) => out.add(p));
    if (!classes.length || !out.size) notes.push(`${rel}: could not tell which pages use the edited rules — pass --pages`);
    if (SHELL_CLASSES.test(classes.join(" "))) { out.add("overviews"); notes.push(`platform shell styles changed: check the shell at 1512, 1024 and 390; ${ALL_NOTE}`); }
    return { pages: [...out], notes };
  }
  if (/PlatformApp\.tsx$/.test(rel)) { ["overviews", "button", "chat"].forEach((p) => out.add(p)); notes.push(`platform shell changed: check navigation, the drawer at ≤1024 and deep links; ${ALL_NOTE}`); }
  else for (const snip of snippets.filter((s) => s && s.length > 8)) {
    const at = src.indexOf(snip.slice(0, 400)); if (at < 0) continue;
    const found = pagesAt(src, at, pages);
    found.forEach((p) => out.add(p));
    // An exported component or helper rendered from other files (PlatformPhone → every page with a phone frame).
    const name = found.length ? null : enclosingFn(src, at);
    if (name && new RegExp(`\\nexport (?:function|const) ${name}\\b`).test(src)) pagesUsingExport(root, rel, name, pages).forEach((p) => out.add(p));
  }
  // An app-layer module owns a `pages` map: when the edit cannot be placed, check every page the module owns.
  if (!out.size && /^src\/platform\/appLayer\//.test(rel)) appLayerPages(src, pages).forEach((p) => out.add(p));
  if (!out.size) notes.push(`${rel}: could not tell which pages the edit renders on — pass --pages`);
  return { pages: [...out], notes };
}
/** Pages a file "owns" (its component's page, or the example/playground pages it edited): reviewed first. */
export function primaryPages(rel, hinted, pages) {
  const comp = rel.match(/^src\/components\/([^/]+)\//)?.[1];
  if (comp) { const p = folderPage(comp); return pages.includes(p) ? [p] : []; }
  const kind = uiKind(rel);
  return kind === "platform" || kind === "template" ? hinted.filter((p) => pages.includes(p)) : [];
}
/** Example sources: the example maps the coverage matrix reads (Showcases + app layer). */
export const isExampleSource = (rel) => /^src\/platform\/(\w*Showcases\.tsx$|appLayer\/)/.test(rel);

/** Component folders whose sources import one of `folders` (one level: the components that render them). */
export function importersOf(root, folders) {
  const want = new Set(folders); const out = new Set();
  const dir = path.join(root, "src/components");
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!d.isDirectory() || want.has(d.name) || d.name.startsWith("_")) continue;
    for (const f of fs.readdirSync(path.join(dir, d.name), { recursive: true })) {
      if (!/\.tsx?$/.test(String(f)) || /\.stories\./.test(String(f))) continue;
      const s = fs.readFileSync(path.join(dir, d.name, String(f)), "utf8");
      if ([...s.matchAll(/from\s+["'](?:\.\.\/)+([A-Za-z]\w*)(?:\/[^"']*)?["']/g)].some((m) => want.has(m[1]))) { out.add(d.name); break; }
    }
  }
  return [...out];
}

/* ── token scope (S4): changed custom properties → aliases → consumer CSS → pages ─────────────────────────────── */
/** Typography and spacing-scale tokens: their change reaches every page (tier L). */
export const SCALE_TOKEN = /^--zen-(typography|spacing|dm|margin)-|^--zen-emphasis-font-weight-/;
/**
 * Pages to check after a token value change. Reads `git diff -U0 <base> -- <token files>` (read-only), expands the
 * changed names to every --zen-* alias of them in the token files (transitively), greps component and platform CSS for
 * those names and maps the consumer files to pages: the component's own page, the pages of components that import it,
 * and, for platform CSS, the pages whose examples use the consuming rules.
 */
export function tokenScope(root, { base = "HEAD", pages = allPages(root) } = {}) {
  const res = { base, changed: [], aliases: [], scale: [], consumers: [], folders: [], importers: [], pages: [], primary: [], unmapped: [], error: null };
  let diff = "";
  for (const f of TOKEN_STYLE_FILES) {
    if (!fs.existsSync(path.join(root, f))) continue;
    const r = spawnSync("git", ["diff", "-U0", "--no-color", base, "--", f], { cwd: root, encoding: "utf8", timeout: 30000, maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) { res.error = `${(r.stderr || r.error?.message || "git diff failed").trim().split("\n")[0]}`; return res; }
    diff += r.stdout;
  }
  const changed = new Set([...diff.matchAll(/^[+-](?![+-])\s*(--zen-[\w-]+)\s*:/gm)].map((m) => m[1]));
  res.changed = [...changed];
  res.scale = res.changed.filter((n) => SCALE_TOKEN.test(n));
  // Aliases: --a: … var(--b) … makes --a change when --b does.
  const rev = new Map();
  for (const f of TOKEN_STYLE_FILES) {
    const abs = path.join(root, f); if (!fs.existsSync(abs)) continue;
    for (const m of fs.readFileSync(abs, "utf8").matchAll(/(--zen-[\w-]+)\s*:([^;]*);/g)) for (const r of m[2].matchAll(/var\(\s*(--zen-[\w-]+)/g)) {
      if (!rev.has(r[1])) rev.set(r[1], new Set()); rev.get(r[1]).add(m[1]);
    }
  }
  // Scale tokens reach every page: they are reported (and handled with --all), not expanded into consumers.
  const names = new Set(res.changed.filter((n) => !SCALE_TOKEN.test(n)));
  const queue = [...names];
  while (queue.length) { const n = queue.shift(); for (const a of rev.get(n) ?? []) if (!names.has(a) && !SCALE_TOKEN.test(a)) { names.add(a); queue.push(a); } }
  res.aliases = [...names].filter((n) => !changed.has(n));
  if (!names.size) return res;
  const out = new Set(); const primary = new Set(); const folders = new Set();
  for (const dir of ["src/components", "src/platform"]) {
    const abs = path.join(root, dir);
    for (const f of fs.readdirSync(abs, { recursive: true })) {
      const rel = `${dir}/${String(f).split(path.sep).join("/")}`;
      if (!rel.endsWith(".css") || /\.stories\.|\.generated\./.test(rel)) continue;
      const text = fs.readFileSync(path.join(root, rel), "utf8");
      if (!text.includes("--zen-")) continue;
      const hits = [...text.matchAll(/--zen-[\w-]+/g)].filter((m) => names.has(m[0]));
      if (!hits.length) continue;
      res.consumers.push({ file: rel, vars: [...new Set(hits.map((m) => m[0]))] });
      const comp = rel.match(/^src\/components\/([^/]+)\//)?.[1];
      if (comp === "_shared") { REPRESENTATIVE.forEach((p) => out.add(p)); continue; }
      if (comp) {
        folders.add(comp);
        const page = folderPage(comp);
        if (pages.includes(page)) { out.add(page); primary.add(page); } else res.unmapped.push(rel);
        continue;
      }
      // Platform CSS: the selectors of the rules that use a changed name → the pages whose examples use those classes.
      const selectors = hits.map((m) => { const open = text.lastIndexOf("{", m.index); const close = text.lastIndexOf("}", open); return open < 0 ? "" : text.slice(close + 1, open); });
      const classes = classesIn(selectors).slice(0, 40);
      const found = pagesForClasses(root, classes, pages);
      if (SHELL_CLASSES.test(classes.join(" "))) found.add("overviews");
      if (found.size) found.forEach((p) => out.add(p)); else res.unmapped.push(rel);
    }
  }
  res.folders = [...folders];
  res.importers = importersOf(root, res.folders);
  for (const d of res.importers) { const p = folderPage(d); if (pages.includes(p)) out.add(p); }
  res.pages = [...out];
  res.primary = [...primary];
  return res;
}

/* ── Figma contract suites and guideline owners (S5) ──────────────────────────────────────────────────────────── */
const SUITE_PREFIX = { button: "Button", checkbox: "Checkbox", radio: "RadioButton", chip: "Chip", popover: "Popover", input: "Input" };
const BLOCK_FOLDER = { "heading-field": "Input", "select-field": "Input" };
/** Folders that tools/figma-contract/interactions.mjs exercises (Checkbox, RadioButton, Chip, Popover, SelectField). */
export const INTERACTION_FOLDERS = ["Checkbox", "RadioButton", "Chip", "Popover", "Input"];
/** Every contract suite with the component folders it renders: its filename prefix plus the .zen-* blocks its map reads. */
export function contractSuites(root) {
  const dir = path.join(root, "tools/figma-contract/suites");
  if (!fs.existsSync(dir)) return [];
  const byKebab = new Map(fs.readdirSync(path.join(root, "src/components"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => [kebab(d.name), d.name]));
  const read = (f) => { try { return fs.readFileSync(path.join(dir, f), "utf8"); } catch { return ""; } };
  return fs.readdirSync(dir).filter((f) => f.endsWith(".mjs") && !f.startsWith("_")).sort().map((file) => {
    const folders = new Set();
    const prefix = SUITE_PREFIX[file.split(/[-.]/)[0]]; if (prefix) folders.add(prefix);
    let text = read(file);
    for (const m of text.matchAll(/from\s+["']\.\/(_[\w-]+\.mjs)["']/g)) text += read(m[1]);
    for (const m of text.matchAll(/\.zen-([a-z0-9]+(?:-[a-z0-9]+)*)/g)) { const f = BLOCK_FOLDER[m[1]] ?? byKebab.get(m[1]); if (f) folders.add(f); }
    return { file: `tools/figma-contract/suites/${file}`, folders: [...folders] };
  });
}
/** Guideline slug → component folders that feed it (tagsFor in build-guidelines.mjs + each folder's index.ts exports). */
export function guidelineOwners(root) {
  const owners = new Map();
  const dir = path.join(root, "src/components");
  const byName = new Map();
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const add = (slug) => { if (!owners.has(slug)) owners.set(slug, new Set()); owners.get(slug).add(d.name); };
    add(folderPage(d.name)); add(kebab(d.name));
    try { for (const m of fs.readFileSync(path.join(dir, d.name, "index.ts"), "utf8").matchAll(/\b([A-Z][A-Za-z0-9]+)\b/g)) if (!byName.has(m[1])) byName.set(m[1], d.name); } catch { /* no index */ }
  }
  try {
    const src = fs.readFileSync(path.join(root, "tools/usage-guard/build-guidelines.mjs"), "utf8");
    const start = src.indexOf("const tagsFor"); const block = start < 0 ? "" : src.slice(start, src.indexOf("};", start));
    for (const m of block.matchAll(/(?:"([\w-]+)"|(\b[a-z][\w]*))\s*:\s*\[([^\]]*)\]/g)) {
      const slug = m[1] ?? m[2];
      for (const n of m[3].matchAll(/"(\w+)"/g)) { const f = byName.get(n[1]); if (f) { if (!owners.has(slug)) owners.set(slug, new Set()); owners.get(slug).add(f); } }
    }
  } catch { /* builder missing */ }
  return owners;
}
/** The guideline slug a generated file belongs to (docs/guidelines/<slug>.md, docs/api/<slug>.json), or null (shared file). */
export const guidelineSlugOf = (rel) => rel.match(/^docs\/guidelines\/(?!README\.md$)([\w-]+)\.md$|^docs\/api\/([\w-]+)\.json$/)?.slice(1).find(Boolean) ?? null;

/* ── per-session ledger (.qa/sessions/<session>.json) ───────────────────────────────────────────────────────────── */
// v2: files[rel].edits = [{ at, pages, notes }] (pages/notes of each edit; an edit stops counting once a pass started after
// it), files[rel].pages/notes = the union of the pending edits (what v1 readers use), aux[rel] = { editedAt, passedAt },
// running = { pid, startedAt, pages } while a run is in progress, reviewed = sha1 of every contact sheet opened.
export const LEDGER_VERSION = 2;
export const ledgerPath = (root, session) => path.join(root, ".qa", "sessions", `${String(session).replace(/[^\w-]/g, "")}.json`);
const union = (lists) => [...new Set(lists.flat())];
export const pendingEdits = (f) => (Array.isArray(f?.edits) ? f.edits : []).filter((e) => (e?.at ?? 0) > (f?.passedAt ?? -1));
function syncFile(f) {
  const pend = pendingEdits(f);
  f.pages = union(pend.map((e) => e.pages ?? []));
  f.notes = union(pend.map((e) => e.notes ?? []));
}
/** Old ledgers (v1: accumulated pages/notes per file) load as v2: a file not passed since its last edit keeps one edit. */
export function migrateLedger(ledger) {
  if (!ledger || typeof ledger !== "object" || Array.isArray(ledger)) ledger = {};
  if (!ledger.files || typeof ledger.files !== "object") ledger.files = {};
  if (!Array.isArray(ledger.runs)) ledger.runs = [];
  for (const f of Object.values(ledger.files)) {
    if (!f || typeof f !== "object") continue;
    if (!Array.isArray(f.edits)) {
      const pending = !f.passedAt || (f.editedAt ?? 0) > f.passedAt;
      f.edits = pending ? [{ at: f.editedAt || 1, pages: f.pages ?? [], notes: f.notes ?? [] }] : [];
    }
    syncFile(f);
  }
  ledger.version = LEDGER_VERSION;
  return ledger;
}
export function readLedger(root, session) {
  let ledger;
  try { ledger = JSON.parse(fs.readFileSync(ledgerPath(root, session), "utf8")); } catch { ledger = { session, files: {}, runs: [] }; }
  ledger = migrateLedger(ledger);
  ledger.session ??= session;
  return ledger;
}
export function writeLedger(root, session, ledger) {
  const file = ledgerPath(root, session);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(ledger, null, 2));
  fs.renameSync(tmp, file);
}
/** Record one UI edit (its pages and notes) with its time; an identical earlier pending edit is replaced. */
export function recordEdit(ledger, rel, found, at = Date.now()) {
  const f = (ledger.files[rel] ??= {});
  const sig = (e) => JSON.stringify([[...(e.pages ?? [])].sort(), [...(e.notes ?? [])].sort()]);
  const entry = { at, pages: found.pages ?? [], notes: found.notes ?? [] };
  f.edits = [...pendingEdits(f).filter((e) => sig(e) !== sig(entry)), entry].slice(-40);
  f.editedAt = at;
  syncFile(f);
  return f;
}
/**
 * Other sessions that edited `rel` (a UI or aux file) within `withinMs`, from their ledgers in .qa/sessions, newest
 * first: [{ session, at }]. The post-edit hook warns with it, so two sessions notice a shared file before one overwrites
 * the other (Backlog P1 "Session setup", 2026-10-05).
 */
export function recentOtherEdits(root, session, rel, withinMs = 30 * 60 * 1000, now = Date.now()) {
  const dir = path.join(root, ".qa", "sessions");
  let names = [];
  try { names = fs.readdirSync(dir).filter((n) => n.endsWith(".json")); } catch { return []; }
  const mine = path.basename(ledgerPath(root, session));
  const out = [];
  for (const name of names) {
    if (name === mine) continue;
    try {
      const other = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
      const at = Math.max(other.files?.[rel]?.editedAt ?? 0, other.aux?.[rel]?.editedAt ?? 0);
      if (at && now - at < withinMs) out.push({ session: String(other.session ?? name.replace(/\.json$/, "")), at });
    } catch { /* an unreadable ledger */ }
  }
  return out.sort((a, b) => b.at - a.at);
}
/** Record an edit of a non-UI file that scopes the static gates (auxKind). */
export function recordAux(ledger, rel, at = Date.now()) {
  const a = ((ledger.aux ??= {})[rel] ??= {});
  a.kind = auxKind(rel); a.editedAt = at;
  return a;
}
/** Aux files edited since their last passing run. */
export const pendingAux = (ledger) => Object.entries(ledger.aux ?? {}).filter(([, a]) => !a.passedAt || (a.editedAt ?? 0) > a.passedAt).map(([rel]) => rel);
/** After a full PASS that started at `started`: edits made before it stop counting (pages, notes, edited lines). */
export function markPassed(ledger, files, started) {
  for (const rel of files) {
    const f = (ledger.files[rel] ??= { editedAt: 0, edits: [] });
    f.edits = (Array.isArray(f.edits) ? f.edits : []).filter((e) => (e.at ?? 0) > started);
    if ((f.editedAt ?? 0) <= started) { f.passedAt = started; f.ranges = []; }
    syncFile(f);
  }
  for (const a of Object.values(ledger.aux ?? {})) if ((a.editedAt ?? 0) <= started) a.passedAt = started;
}
/** Files this session edited after their last passing full QA run (files deleted since then no longer count). */
export const dirtyFiles = (ledger, root = ledger.repo) => Object.entries(ledger.files ?? {})
  .filter(([rel, f]) => f && typeof f === "object" && (!f.passedAt || f.editedAt > f.passedAt) && (!root || fs.existsSync(path.join(root, rel))))
  .map(([rel]) => rel);

/* ── run in progress (S2) ───────────────────────────────────────────────────────────────────────────────────────── */
export function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e?.code === "EPERM"; }
}
/** The ledger's run in progress, or null; a marker whose process is gone (or older than 6 h) is stale. */
export function runningRun(ledger) {
  const r = ledger.running;
  if (!r || typeof r !== "object") return null;
  const alive = pidAlive(r.pid) && Date.now() - (r.startedAt ?? 0) < 6 * 3600 * 1000;
  return alive ? r : null;
}

/* ── contact sheets (S3) ────────────────────────────────────────────────────────────────────────────────────────── */
export const sha1File = (file) => { try { return crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex"); } catch { return null; } };
/** PNG files opened with Read in a transcript (JSONL), scanning complete lines from byte `from`: { reads: [{ file, at }], size }. */
export function pngReads(transcript, from = 0) {
  const out = { reads: [], size: from };
  let size; try { const st = fs.statSync(transcript); if (!st.isFile()) return { reads: [], size: 0 }; size = st.size; } catch { return { reads: [], size: 0 }; }
  if (!(from >= 0) || from > size) from = 0;
  if (size === from) return { reads: [], size };
  const buf = Buffer.alloc(size - from);
  const fd = fs.openSync(transcript, "r");
  try { fs.readSync(fd, buf, 0, buf.length, from); } finally { fs.closeSync(fd); }
  const end = buf.lastIndexOf(0x0a);
  if (end < 0) return { reads: [], size: from };
  out.size = from + end + 1;
  for (const line of buf.subarray(0, end).toString("utf8").split("\n")) {
    if (!line.includes('"Read"') || !line.includes(".png")) continue;
    try {
      const o = JSON.parse(line); const at = Date.parse(o.timestamp ?? "") || 0;
      for (const c of o.message?.content ?? []) if (c?.type === "tool_use" && c.name === "Read" && /\.png$/i.test(String(c.input?.file_path ?? ""))) out.reads.push({ file: path.resolve(String(c.input.file_path)), at });
    } catch { /* partial or foreign line */ }
  }
  return out;
}
/**
 * Record the content hash of every contact sheet opened: the file as it is now when it has not changed since the Read,
 * otherwise the hash a run recorded for that path before the Read.
 */
export function recordReviewed(root, ledger, reads) {
  const reviewed = new Set(ledger.reviewed ?? []);
  const shots = (ledger.runs ?? []).flatMap((r) => r.sheets ?? []);
  for (const { file, at } of reads) {
    const rel = relTo(root, file);
    if (rel.startsWith("..") || path.isAbsolute(rel)) continue;
    let hash = null;
    try { if (fs.statSync(file).mtimeMs <= at + 2000) hash = sha1File(file); } catch { /* gone */ }
    if (!hash) hash = shots.filter((s) => s.path === rel && (s.at ?? 0) <= at).sort((a, b) => (a.at ?? 0) - (b.at ?? 0)).pop()?.hash ?? null;
    if (hash) reviewed.add(hash);
  }
  ledger.reviewed = [...reviewed].slice(-800);
  return ledger.reviewed;
}
export const SHEET_CAP = 12;
/**
 * The contact sheets of `run` still to review: content not reviewed yet in this session, own pages first (the pages
 * whose component or example files were edited), then 390 before 1512, capped at `cap`; the rest are optional.
 */
export function sheetsToReview(root, ledger, run, cap = SHEET_CAP) {
  const reviewed = new Set(ledger.reviewed ?? []);
  const sheets = Array.isArray(run?.sheets) ? run.sheets : (run?.shots ?? []).map((p) => {
    const m = path.basename(p).match(/^(.+)-(\d+)\.png$/);
    return { path: p, page: m?.[1] ?? p, width: Number(m?.[2] ?? 0), hash: sha1File(path.join(root, p)), primary: false };
  });
  const pending = [], unchanged = [], overwritten = []; const seen = new Set();
  for (const s of sheets) {
    if (!s?.hash) continue;
    if (reviewed.has(s.hash) || seen.has(s.hash)) { unchanged.push(s); continue; }
    seen.add(s.hash);
    if (sha1File(path.join(root, s.path)) !== s.hash) { overwritten.push(s); continue; }
    pending.push(s);
  }
  pending.sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0) || (a.width === 390 ? 0 : 1) - (b.width === 390 ? 0 : 1));
  // A finished run fixed its required set (`required` on each sheet): opening those ends the review, the rest stays
  // optional, so the cap is not a page size.
  if (sheets.some((s) => s && typeof s.required === "boolean")) return { required: pending.filter((s) => s.required), optional: pending.filter((s) => !s.required), unchanged, overwritten };
  return { required: pending.slice(0, cap), optional: pending.slice(cap), unchanged, overwritten };
}
