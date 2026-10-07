#!/usr/bin/env node
/**
 * Zen Build-QA gate — run it after building or changing a component, playground or example, and before delivering.
 *
 *   npm run qa                        scope = the edits this Claude session made since its last passing full run
 *                                     (ledger written by the PostToolUse hook; session from $CLAUDE_CODE_SESSION_ID)
 *   npm run qa -- --only=divider,chip exactly these pages (the hinted pages of your edits are not rendered)
 *   npm run qa -- --pages=card,chip   add pages          --files=src/a.css,src/b.tsx   add files
 *   npm run qa -- --all               every platform page, every static gate in full (tier L: _shared, typography or
 *                                     spacing scale, platform shell)
 *   npm run qa -- --since=90          add every UI file modified in the last 90 minutes (or --since=<ISO time>)
 *   npm run qa -- --keep-going        run the browser steps even when a static gate failed (default: skip them)
 *   npm run qa -- --isolated          run the browser steps on a private dev server (port 5200+, no HMR, no Studio
 *                                     drafts); used by itself when the shared server does not answer
 *   npm run qa -- --quick             fast loop while building: static gates + audit at 1512 (never counts as a pass)
 *   npm run qa -- --serial            run the steps one after another (default: tsc, contract suites and Vitest run side by side,
 *                                     and audit + dark audit + behaviour run side by side, split over ZEN_QA_SHARDS=2 processes
 *                                     per job when 6+ pages are rendered; the contract suites run ZEN_QA_SUITES=4 at a time)
 *   npm run qa -- --tokens-base=HEAD~1  diff the token files against another ref (default HEAD) for the token scope
 *
 * ① Static     tsc · style-guard (spacing/radius/type/colour/shadow tokens) · usage-guard · guidelines (stale docs of
 *              your components are regenerated) · harness self-tests (when tools/usage-guard or tools/style-guard changed)
 *              · Layout self-test (npm run layout:selftest, when src/components/Layout, _shared/corners.ts or scale.ts, or the
 *              effect styles and token sources are in scope)
 *              · figma-contract suites of the components in scope · Vitest related to the edited files · tokens/styles
 *              checks (when styles changed). A static ✗ skips the browser steps unless --keep-going.
 * ② Runtime    audit --smoke --quality --density at 1512 + 390 (text styles, hierarchy, token scale, concentric
 *              corners, Comfortable fit, edges, overflow…) and --dark at 1512
 * ③ Behaviour  focus ring, keyboard reach, APG keys (tabs, menus, dialogs…), dead clicks, hover feedback
 * ④ Coverage   the example matrix of the pages whose examples you edited (other pages: one Backlog summary line)
 * ⑤ Visual     1512 + 390 contact sheets; the ones new to this session (≤ 12, own pages first, 390 first) to LOOK at,
 *              with the UX rubric in skills/zen-build-qa/SKILL.md
 *
 * Token value changes (src/styles/tokens.css, style-effects.css, tokens/source, src/tokens) are scoped by consumers:
 * the changed --zen-* names (git diff against HEAD, read-only) and their aliases → component/platform CSS that uses
 * them → those pages and the pages of components that import them.
 *
 * Writes .qa/reports/<stamp>.md/.json and updates .qa/sessions/<session>.json (read by the Stop hook): `running` while
 * the run is in progress, the run with its sheets' content hashes when it ends. ZEN_QA_ROOT=<repo> points the gate at
 * another checkout (used to test the gate itself).
 * Exit 0 = pass · 1 = findings to fix · 2 = the gate could not run (dev server down, crash).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync, spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  INTERACTION_FOLDERS, LABELS_FILE, REPRESENTATIVE, TOKEN_STYLE_FILES, allPages, auxKind, contractSuites, dirtyFiles, guidelineOwners,
  guidelineSlugOf, isExampleSource, markPassed, pagesForEdit, pendingAux, pendingEdits, primaryPages, readLedger, sha1File,
  sheetsToReview, tokenScope, uiKind, writeLedger,
} from "./lib.mjs";

const root = path.resolve(process.env.ZEN_QA_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));
const { checkFiles } = await import(pathToFileURL(path.join(root, "tools/style-guard/check-styles.mjs")).href);
const argv = process.argv.slice(2);
const opt = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const flag = (name) => argv.includes(`--${name}`);
const list = (v) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
let BASE = (opt("url") ?? "http://localhost:5173").replace(/\/$/, "");
// --isolated (or ZEN_QA_ISOLATED=1): the browser steps run on a private dev server (tools/qa/isolated-server.mjs) — no
// HMR from other sessions, no Studio drafts. Also the fallback when the shared server does not answer (no --url given).
const ISOLATED = flag("isolated") || process.env.ZEN_QA_ISOLATED === "1";
let isolatedServer = null;
const QUICK = flag("quick");
const ALL = flag("all");
const KEEP_GOING = flag("keep-going");
const ONLY = opt("only") !== undefined ? list(opt("only")) : null;
const SESSION = opt("session") ?? process.env.CLAUDE_CODE_SESSION_ID ?? null;
const started = Date.now();
const stamp = new Date(started).toISOString().replace(/[:.]/g, "-").slice(0, 19);
const runDir = path.join(root, ".qa", "runs", `${stamp}${SESSION ? `-${SESSION.slice(0, 8)}` : ""}`);
fs.mkdirSync(runDir, { recursive: true });
const rel = (f) => path.relative(root, path.resolve(root, f)).split(path.sep).join("/");
const say = (s) => process.stdout.write(`${s}\n`);
const union = (lists) => [...new Set(lists.flat())];
const brief = (items, n = 8) => `${items.slice(0, n).join(", ")}${items.length > n ? `, … (+${items.length - n})` : ""}`;

/* ── scope ──────────────────────────────────────────────────────────────────────────────────────────────────────── */
const PAGES = allPages(root);
const ledger = SESSION ? readLedger(root, SESSION) : { files: {}, runs: [] };
// --since=<minutes | ISO time>: every UI file modified since then (edits made outside the hooks — scripts, other tools —
// and, in a shared tree, other sessions' edits too).
const since = opt("since") ? (/^\d+$/.test(opt("since")) ? started - Number(opt("since")) * 60000 : Date.parse(opt("since"))) : null;
const recent = since ? ["src/components", "src/platform", "src/templates", "src/styles", "src/foundations"].flatMap((d) => fs.readdirSync(path.join(root, d), { recursive: true }).map((f) => `${d}/${String(f).split(path.sep).join("/")}`))
  .filter((f) => uiKind(f) && fs.statSync(path.join(root, f)).mtimeMs >= since) : [];
const files = [...new Set([...(SESSION ? dirtyFiles(ledger, root) : []), ...list(opt("files")).map(rel), ...recent])].filter((f) => fs.existsSync(path.join(root, f)));
// Tooling, tests and token sources edited since the last pass (they scope the static gates; they render no page).
const aux = [...new Set([...(SESSION ? pendingAux(ledger) : []), ...files.filter((f) => auxKind(f))])].filter((f) => fs.existsSync(path.join(root, f)));
const auxHas = (re) => aux.some((f) => re.test(f));
const notes = [];
if (since && !recent.length) notes.push(`no UI file changed since ${new Date(since).toLocaleString("en-GB")}`);
const hinted = new Set(); const primary = new Set(); const examplePages = new Set();
for (const f of files) {
  // Only the edits made after the file's last passing run count (S1); files without a ledger entry are mapped afresh.
  const pend = pendingEdits(ledger.files?.[f]);
  const pendPages = union(pend.map((e) => e.pages ?? [])), pendNotes = union(pend.map((e) => e.notes ?? []));
  const found = TOKEN_STYLE_FILES.includes(f) ? { pages: [], notes: [] } : pendPages.length ? { pages: pendPages, notes: pendNotes } : pagesForEdit(root, f, [], PAGES);
  found.pages.forEach((p) => hinted.add(p)); found.notes.forEach((n) => notes.includes(n) || notes.push(n));
  primaryPages(f, found.pages, PAGES).forEach((p) => primary.add(p));
  if (isExampleSource(f)) found.pages.forEach((p) => examplePages.add(p));
}
// Token value changes: the pages that consume the changed custom properties (S4).
let tokens = null;
if (files.some((f) => TOKEN_STYLE_FILES.includes(f)) || auxHas(/^(tokens\/source|src\/tokens)\//)) {
  const base = opt("tokens-base") ?? "HEAD";
  tokens = tokenScope(root, { base, pages: PAGES });
  const representative = (why) => { REPRESENTATIVE.forEach((p) => hinted.add(p)); notes.push(`token scope: ${why}; checking the representative set (${REPRESENTATIVE.join(", ")})`); };
  if (tokens.error) representative(`git diff against ${base} failed (${tokens.error})`);
  else if (!tokens.changed.length) representative(`no --zen-* custom property in ${TOKEN_STYLE_FILES.join(" / ")} differs from ${base}${auxHas(/^(tokens\/source|src\/tokens)\//) ? " (run npm run tokens:build after editing tokens/source?)" : ""}`);
  else {
    if (tokens.scale.length) { REPRESENTATIVE.forEach((p) => hinted.add(p)); notes.push(`typography/spacing scale tokens changed (${brief(tokens.scale, 6)}): a representative set is checked; run with --all before delivering (tier L)`); }
    const values = tokens.changed.filter((n) => !tokens.scale.includes(n));
    if (values.length) {
      if (tokens.pages.length) {
        tokens.pages.forEach((p) => hinted.add(p)); tokens.primary.forEach((p) => primary.add(p));
        notes.push(`token scope (git diff ${base}): ${values.length} changed custom propert${values.length === 1 ? "y" : "ies"} (${brief(values, 6)}) + ${tokens.aliases.length} alias(es) → consumer CSS: ${brief(tokens.consumers.map((c) => c.file), 10)} → pages: ${tokens.pages.join(", ")}`);
      } else representative(`no component or platform CSS uses the ${values.length} changed custom propert${values.length === 1 ? "y" : "ies"} (${brief(values, 6)}) or their aliases`);
      if (tokens.unmapped.length) notes.push(`token scope: could not map ${brief(tokens.unmapped, 6)} to a page — pass --pages if they render somewhere`);
    }
  }
}
const pages = new Set();
if (ONLY) {
  ONLY.forEach((p) => pages.add(p));
  const skipped = [...hinted].filter((p) => !pages.has(p));
  if (skipped.length) notes.push(`--only: ${skipped.length} hinted page(s) not rendered: ${brief(skipped, 12)} (their files stay pending until those pages pass too)`);
  if (opt("pages") || ALL) notes.push("--only decides the pages: --pages / --all pages are ignored");
} else {
  list(opt("pages")).forEach((p) => pages.add(p));
  hinted.forEach((p) => pages.add(p));
  if (ALL) PAGES.forEach((p) => pages.add(p));
}
for (const p of pages) if (!PAGES.includes(p)) { notes.push(`unknown page "${p}" ignored`); pages.delete(p); }
const uiFiles = files.filter((f) => uiKind(f));
if (!files.length && !aux.length && !pages.size) {
  say(SESSION ? "Nothing to check: this session has no UI edits recorded since its last passing run (edits are recorded by the PostToolUse hook). Pass --only=…, --pages=…, --files=… or --since=<minutes> to check something else." : "Nothing to check: pass --only=…, --pages=…, --files=… or --since=<minutes> (or run inside a Claude session that edited UI files).");
  process.exit(0);
}
const P = [...pages];
// Token fast path: only token values changed (no scale token, no other UI file). Consumers pick the new values up by
// themselves, so behaviour, smoke clicks and TypeScript cannot change; what can is contrast (colours) and fit, overflow
// and concentric corners (sizes). Figma suites of the consumers and tokens:check still run. `npm run tokens:build`
// writes tokens.css through a script, which the edit ledger never records: an edited token source counts as well.
const TOKEN_ONLY = !ALL && !QUICK && Boolean(tokens && !tokens.error && tokens.changed.length && !tokens.scale.length) && uiFiles.every((f) => TOKEN_STYLE_FILES.includes(f)) && (uiFiles.length > 0 || auxHas(/^(tokens\/source|src\/tokens)\//));
const TOKEN_SIZES = TOKEN_ONLY && [...tokens.changed, ...tokens.aliases].some((n) => /radius|spacing|size|padding|gap|margin|width|height|weight|--zen-dm-/.test(n));
if (TOKEN_ONLY) notes.push(`token fast path: only token values changed — contrast${TOKEN_SIZES ? " + fit/overflow/corners (sizes changed, Comfortable too)" : ""} on the consumer pages; no behaviour probes, smoke clicks or TypeScript`);
// _shared logic (scale, icon, context…) reaches every component; the label dictionary does not.
const SHARED_LOGIC = files.some((f) => /^src\/components\/_shared\//.test(f) && f !== LABELS_FILE);
say(`Zen Build-QA gate${QUICK ? " (quick)" : ""} — ${SESSION ? `session ${SESSION.slice(0, 8)}` : "manual"} · ${uiFiles.length} UI file(s)${aux.length ? ` · ${aux.length} tool/test/token file(s)` : ""} · pages: ${P.join(", ") || "(none)"}`);
for (const n of notes) say(`  note: ${n}`);

/* ── run in progress (read by the Stop hook): set now, removed when the run ends, however it ends ─────────────────── */
let marked = false;
const clearRunning = () => {
  if (!marked) return; marked = false;
  try { const l = readLedger(root, SESSION); if (l.running?.pid === process.pid) { delete l.running; writeLedger(root, SESSION, l); } } catch { /* ledger unreadable */ }
};
if (SESSION) {
  try { const l = readLedger(root, SESSION); l.running = { pid: process.pid, startedAt: started, pages: P, quick: QUICK }; l.repo ??= root; writeLedger(root, SESSION, l); marked = true; } catch { /* no ledger */ }
  // No signal handlers: a handled SIGTERM would wait for the running child step; a killed run leaves a marker whose pid
  // is gone, which the Stop hook ignores and clears.
  process.on("exit", clearRunning);
}

try {
/* ── helpers ────────────────────────────────────────────────────────────────────────────────────────────────────── */
const steps = []; // { group, name, status: "pass"|"fail"|"warn"|"skip", detail, items: [] }
const run = (cmd, args, timeoutMs = 600000) => { const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout: timeoutMs, env: { ...process.env, FORCE_COLOR: "0" } }); return { code: r.status ?? (r.error ? 2 : 1), out: `${r.stdout ?? ""}${r.stderr ?? ""}`, error: r.error }; };
// Runtime jobs (audit, dark audit, behaviour) are independent processes that only read the shared baselines and write their own
// --out file, so they run side by side; --serial (or ZEN_QA_SERIAL=1) restores one-after-another if timing-sensitive checks ever flake.
const SERIAL = flag("serial") || process.env.ZEN_QA_SERIAL === "1";
const runAsync = (cmd, args, timeoutMs = 600000) => new Promise((resolve) => { const t0 = Date.now(); const c = spawn(cmd, args, { cwd: root, env: { ...process.env, FORCE_COLOR: "0" } }); let out = ""; const timer = setTimeout(() => c.kill("SIGKILL"), timeoutMs); c.stdout.on("data", (d) => { out += d; }); c.stderr.on("data", (d) => { out += d; }); c.on("error", (e) => { clearTimeout(timer); resolve({ code: 2, out: String(e), ms: Date.now() - t0 }); }); c.on("close", (code) => { clearTimeout(timer); resolve({ code: code ?? 1, out, ms: Date.now() - t0 }); }); });
const launch = (cmd, args, timeoutMs) => { let p = null; const go = () => (p ??= runAsync(cmd, args, timeoutMs)); if (!SERIAL) go(); return go; };
// fn over items, at most `limit` at a time, results in input order. Each contract suite starts its own browser, so the
// scoped contract step runs ZEN_QA_SUITES (default 4) of them at once, one by one under --serial.
const pooled = async (items, limit, fn) => { const out = new Array(items.length); let next = 0; await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } })); return out; };
const SUITE_LIMIT = SERIAL ? 1 : Math.max(1, Number(process.env.ZEN_QA_SUITES ?? 4) || 4);
// The pages of a runtime job are independent (reports are keyed by page@width), so a run of 6+ pages is also split in
// ZEN_QA_SHARDS (default 2) processes per job and the part reports are merged back into the one file the gate reads.
const mergeReports = (reps) => { const m = { ...reps[0], pages: {} }; for (const r of reps) { Object.assign(m.pages, r.pages ?? {}); for (const k of ["baselined", "current", "smokeStats"]) if (r[k]) m[k] = { ...(m[k] ?? {}), ...r[k] }; } return m; };
const launchSharded = (cmd, baseArgs, pageList, finalOut, timeoutMs) => {
  const n = SERIAL ? 1 : Math.max(1, Math.min(Number(process.env.ZEN_QA_SHARDS ?? 2) || 1, Math.floor(pageList.length / 3)));
  const argsFor = (pages, out) => baseArgs.map((a) => (a.startsWith("--pages=") ? `--pages=${pages.join(",")}` : a.startsWith("--out=") ? `--out=${out}` : a));
  if (n <= 1) return launch(cmd, argsFor(pageList, finalOut), timeoutMs);
  const groups = Array.from({ length: n }, () => []); pageList.forEach((pg, i) => groups[i % n].push(pg));
  const parts = groups.map((g, i) => { const out = finalOut.replace(/\.json$/, `.part${i}.json`); return { out, job: launch(cmd, argsFor(g, out), timeoutMs) }; });
  let done = null;
  return () => (done ??= (async () => {
    const rs = await Promise.all(parts.map((x) => x.job()));
    const reps = parts.map((x) => { try { return JSON.parse(fs.readFileSync(x.out, "utf8")); } catch { return null; } });
    if (reps.every(Boolean)) fs.writeFileSync(finalOut, JSON.stringify(mergeReports(reps), null, 2));
    return { code: rs.find((r) => r.code !== 0)?.code ?? 0, out: rs.map((r) => r.out).join("\n"), ms: Math.max(...rs.map((r) => r.ms)) };
  })());
};
const secs = (r) => (r?.ms ? ` · ${Math.round(r.ms / 1000)}s` : "");
const step = (group, name, status, detail = "", items = []) => { steps.push({ group, name, status, detail, items }); say(`  ${{ pass: "✓", fail: "✗", warn: "⚠", skip: "–" }[status]} ${name}${detail ? ` — ${detail}` : ""}`); for (const i of items.slice(0, 15)) say(`      ${i}`); if (items.length > 15) say(`      … ${items.length - 15} more (see the report)`); };
const tail = (out, re = /✗|error|Error/) => out.split("\n").filter((l) => re.test(l)).slice(0, 40).map((l) => l.trim());
const compFolders = new Set(files.map((f) => f.match(/^src\/components\/([^/]+)\//)?.[1]).filter(Boolean));
const BACKLOG = "write one Backlog line (priority + pointer) in docs/context/BACKLOG.md; fix it only if that is in the approved task";

/* ── ① static ───────────────────────────────────────────────────────────────────────────────────────────────────── */
say("\n① Static gates");
const staticJobs = [], serialJobs = []; // heavy static gates run beside the cheap synchronous ones; --serial runs them one by one
const addJob = (fn) => { if (SERIAL) serialJobs.push(fn); else staticJobs.push(fn()); };
if (TOKEN_ONLY) step("static", "TypeScript", "skip", "token-only change");
else addJob(async () => {
  const r = await runAsync("npx", ["tsc", "--noEmit", "-p", "."]);
  step("static", "TypeScript", r.code === 0 ? "pass" : "fail", r.code === 0 ? "" : "type errors", r.code === 0 ? [] : tail(r.out, /error TS/));
});
// Lines this session changed (recorded by the PostToolUse hook for Edit/Write): findings there are "yours"; the rest of
// a touched file is old debt, reported as a count so a one-line change is not buried under the file's history. Files
// with no recorded lines (--files, --since, Bash edits) are "unknown": their old findings are counted, never called yours.
const where = (file, line) => { const r = ledger.files?.[file]?.ranges; if (!r?.length) return "unknown"; return r.some(([a, b]) => line >= a - 3 && line <= b + 3) ? "mine" : "elsewhere"; };
{
  const targets = uiFiles.length ? uiFiles : [];
  const found = targets.length ? checkFiles(targets) : [];
  const fresh = found.filter((f) => f.new); const errs = fresh.filter((f) => f.severity === "error"); const warns = fresh.filter((f) => f.severity === "warn");
  const old = found.filter((f) => !f.new);
  const debtHere = old.filter((f) => where(f.file, f.line) === "mine"), debtUnknown = old.filter((f) => where(f.file, f.line) === "unknown").length, debtElsewhere = old.length - debtHere.length - debtUnknown;
  step("static", "Style guard (spacing · radius · typography · colour roles · shadows · slots)", errs.length ? "fail" : warns.length || debtHere.length ? "warn" : targets.length ? "pass" : "skip",
    targets.length ? [`${errs.length} new error(s), ${warns.length} new warning(s)`, debtHere.length ? `${debtHere.length} old finding(s) on the lines you changed (baseline debt: ${BACKLOG})` : "", debtElsewhere ? `${debtElsewhere} old finding(s) elsewhere in the touched files (baseline)` : "", debtUnknown ? `${debtUnknown} old finding(s) in files whose edited lines are unknown (--files/--since/Bash; baseline)` : ""].filter(Boolean).join("; ") : "no UI files in scope",
    [...errs, ...warns, ...debtHere].map((f) => `${f.severity === "error" && f.new ? "✗" : "⚠"} ${f.file}:${f.line} ${f.rule}${f.new ? "" : " (baseline)"} — ${f.message}`));
}
{
  const targets = uiFiles.filter((f) => /\.(tsx|css)$/.test(f));
  if (targets.length) {
    const r = run(process.execPath, ["tools/usage-guard/check-usage.mjs", ...targets]);
    const warn = r.out.split("\n").filter((l) => /^\s*⚠/.test(l)).map((l) => l.trim());
    const at = (l) => { const m = l.match(/(src\/[^\s:]+):(\d+)/); return m ? where(m[1], Number(m[2])) : "unknown"; };
    const mine = warn.filter((l) => at(l) === "mine"), unknown = warn.filter((l) => at(l) === "unknown"), elsewhere = warn.length - mine.length - unknown.length;
    step("static", "Usage guard (component rules, colour roles, borders, layers)", r.code === 0 ? (mine.length ? "warn" : "pass") : "fail",
      r.code === 0 ? [`${mine.length} warning(s) in your edits`, elsewhere ? `${elsewhere} pre-existing warning(s) elsewhere in the touched files` : "", unknown.length ? `${unknown.length} warning(s) in files whose edited lines are unknown — check the ones near your change` : ""].filter(Boolean).join("; ") : "rule violations",
      [...tail(r.out, /^\s*✗/), ...mine, ...unknown.slice(0, 8).map((l) => `${l} (edited lines unknown)`)]);
  } else step("static", "Usage guard", "skip", "no TSX/CSS in scope");
}
// Harness self-tests: only when the harness itself changed (S5a).
for (const [name, script, dir] of [["Usage-guard self-test", "tools/usage-guard/selftest.mjs", "tools/usage-guard"], ["Style-guard self-test", "tools/style-guard/selftest.mjs", "tools/style-guard"]]) {
  if (!ALL && !aux.some((f) => f.startsWith(`${dir}/`))) { step("static", name, "skip", `no ${dir} edits since the last pass`); continue; }
  const r = run(process.execPath, [script]);
  step("static", name, r.code === 0 ? "pass" : "fail", "", r.code === 0 ? [] : tail(r.out, /✗/));
}
// Layout self-tests (npm run layout:selftest: position constraints, per-corner radius, Box effect gating): only when
// what they read is in scope: src/components/Layout, _shared/corners.ts and scale.ts (the inset and radius token names),
// and the generated effect styles with their token sources (a renamed or removed style must not drop a Box shadow on the
// token fast path).
{
  const name = "Layout self-test (position · corners · effects)";
  const layoutFile = (f) => f.startsWith("src/components/Layout/") || f === "src/components/_shared/corners.ts" || f === "src/components/_shared/scale.ts"
    || f === "src/styles/style-effects.css" || /^(tokens\/source|src\/tokens)\//.test(f);
  if (!ALL && ![...files, ...aux].some(layoutFile)) step("static", name, "skip", "no src/components/Layout, _shared/corners.ts or scale.ts, style-effects.css or token source edits since the last pass");
  else {
    const r = run("npm", ["run", "-s", "layout:selftest"]);
    step("static", name, r.code === 0 ? "pass" : "fail", r.code === 0 ? "" : "npm run layout:selftest fails", r.code === 0 ? [] : tail(r.out, /./).slice(0, 20));
  }
}
// Zen Studio self-tests (npm run studio:selftest: source ops, drafts, slots, arrange, items, the E2E fixtures): only when
// Studio files are in scope (src/platform/studio, its E2E fixture, tools/studio).
const studioInScope = ALL || [...files, ...aux].some((f) => uiKind(f) === "studio" || auxKind(f) === "studio");
if (!studioInScope) step("static", "Studio self-tests", "skip", "no Zen Studio edits since the last pass");
else {
  const r = run("npm", ["run", "-s", "studio:selftest"]);
  step("static", "Studio self-tests", r.code === 0 ? "pass" : "fail", r.code === 0 ? "" : "npm run studio:selftest fails", r.code === 0 ? [] : tail(r.out, /✗|fail/i).slice(0, 20));
}
// Guidelines + props docs (S5b): stale docs of components this session edited are regenerated; another session's stale
// docs are a warning, not a failure.
{
  const name = "Guidelines + props docs in sync";
  const r = run(process.execPath, ["tools/usage-guard/build-guidelines.mjs", "--check"]);
  const stale = (r.out.match(/Guidelines are stale: ([^\n]*?)\. Run npm run guidelines:build/)?.[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (r.code === 0) step("static", name, "pass");
  else if (!stale.length) step("static", name, "fail", "run npm run guidelines:build", tail(r.out, /./).slice(0, 10));
  else {
    const edited = new Set([...Object.keys(ledger.files ?? {}), ...Object.keys(ledger.aux ?? {}), ...files]);
    const generator = [...edited].some((f) => /^tools\/usage-guard\/(guidelines\.source|check-usage|build-guidelines)\.mjs$|^scripts\/build-api\.mjs$/.test(f));
    const folders = new Set([...edited].map((f) => f.match(/^src\/components\/([^/]+)\//)?.[1]).filter(Boolean));
    const owners = guidelineOwners(root);
    const mine = [], others = [], shared = [];
    for (const s of stale) { const slug = guidelineSlugOf(s); if (!slug) shared.push(s); else (generator || [...(owners.get(slug) ?? [])].some((f) => folders.has(f)) ? mine : others).push(s); }
    // Shared outputs (index.json, llms.txt, *.generated.json) follow the per-component files; alone, they are yours when
    // you edited a component or the generator.
    ((mine.length || (!others.length && (generator || folders.size))) ? mine : others).push(...shared);
    if (!others.length) {
      run(process.execPath, ["tools/usage-guard/build-guidelines.mjs"]);
      const c = run(process.execPath, ["tools/usage-guard/build-guidelines.mjs", "--check"]);
      step("static", name, c.code === 0 ? "pass" : "fail", c.code === 0 ? `regenerated: ${brief(mine, 10)} (npm run guidelines:build ran automatically: the stale files belong to components you edited)` : "still stale after npm run guidelines:build", c.code === 0 ? [] : tail(c.out, /./).slice(0, 10));
    } else if (!mine.length) {
      step("static", name, "warn", `stale docs of components this session did not edit (another session's work, not a failure here): ${brief(others, 10)} — mention it in your report; do not regenerate them for that session`);
    } else {
      step("static", name, "fail", `stale docs of components you edited: ${brief(mine, 10)} — run npm run guidelines:build (it also rewrites ${brief(others, 6)}, another session's work: say so in your report)`);
    }
  }
}
// Figma contracts (S5c): the suites of the components in scope (edited, or consuming a changed token); all of them when
// the contract tooling, _shared or --all is in play.
addJob(async () => {
  const inScope = new Set([...compFolders, ...(tokens?.folders ?? [])]);
  const everything = ALL || auxHas(/^tools\/figma-contract\//) || SHARED_LOGIC;
  if (QUICK) step("static", "Figma contracts", "skip", "quick run");
  else if (everything) {
    const r = await runAsync(process.execPath, ["tools/figma-contract/run-all.mjs"], 900000);
    step("static", "Figma contracts (all suites)", r.code === 0 ? "pass" : "fail", `${ALL ? "--all" : auxHas(/^tools\/figma-contract\//) ? "tools/figma-contract changed" : "_shared changed"}${r.code === 0 ? "" : " — a component no longer matches its Figma contract"}`, r.code === 0 ? [] : tail(r.out, /✗|FAIL|mismatch/i));
  } else {
    const all = contractSuites(root);
    const suites = all.filter((s) => s.folders.some((f) => inScope.has(f)));
    const interactions = INTERACTION_FOLDERS.some((f) => inScope.has(f));
    if (!suites.length && !interactions) step("static", "Figma contracts", "skip", inScope.size ? `no contract suite covers ${[...inScope].join(", ")}` : "no component files in scope");
    else {
      const items = []; let failed = 0;
      const results = await pooled(suites, SUITE_LIMIT, (s) => runAsync(process.execPath, [path.join(root, "tools/figma-contract/check.mjs"), path.join(root, s.file)], 300000));
      for (const [i, s] of suites.entries()) {
        const r = results[i];
        const summary = r.out.trim().split("\n").at(-1) ?? s.file;
        if (r.code !== 0) { failed += 1; items.push(`✗ ${path.basename(s.file)}: ${summary}`, ...r.out.split("\n").filter((l) => l.includes("✗")).slice(0, 8).map((l) => `  ${l.trim()}`)); }
      }
      if (interactions) { const r = await runAsync(process.execPath, ["tools/figma-contract/interactions.mjs"], 300000); if (r.code !== 0) { failed += 1; items.push(`✗ interactions: ${r.out.trim().split("\n").at(-1)}`, ...tail(r.out, /✗/).slice(0, 8)); } }
      step("static", "Figma contracts", failed ? "fail" : "pass", `${suites.length} of ${all.length} suite(s)${interactions ? " + interactions" : ""} for ${[...inScope].join(", ")}${failed ? " — a component no longer matches its Figma contract" : ""}`, items);
    }
  }
});
// Browser tests (S5d): Vitest on the tests related to the edited component files; the full suite for tests/**, _shared, --all.
if (!QUICK && fs.existsSync(path.join(root, "node_modules/.bin/vitest"))) addJob(async () => {
  const name = "Browser tests (Vitest: smoke + axe baseline + interactions)";
  const hint = "npm test fails (after a deliberate a11y fix: ZEN_UPDATE_AXE=1 npm test -- tests/smoke)";
  const failRe = /FAIL|×|AssertionError|expected|Error:/;
  const counted = (out) => out.replace(/\x1b\[[0-9;]*m/g, "").match(/Test Files\s+([^\n]*)/)?.[1]?.trim() ?? "";
  const full = ALL || auxHas(/^tests\//) || SHARED_LOGIC;
  const related = [...new Set([...files.filter((f) => /^src\/components\//.test(f)), ...(tokens?.consumers ?? []).map((c) => c.file).filter((f) => /^src\/components\//.test(f))])];
  if (full) {
    const r = await runAsync("npx", ["vitest", "run", "--reporter=dot"], 900000);
    step("static", name, r.code === 0 ? "pass" : "fail", `full suite (${ALL ? "--all" : auxHas(/^tests\//) ? "tests/** changed" : "_shared changed"}) · ${counted(r.out)}${r.code === 0 ? "" : ` — ${hint}`}`, r.code === 0 ? [] : tail(r.out, failRe));
  } else if (related.length) {
    let r = await runAsync("npx", ["vitest", "related", ...related, "--run", "--reporter=dot", "--passWithNoTests"], 900000);
    let how = `related to ${related.length} file(s) in scope (edited, or using a changed token)`;
    if (r.code !== 0 && !/Test Files/.test(r.out) && /unknown (command|option)|not supported|CACError/i.test(r.out)) {
      r = await runAsync("npx", ["vitest", "run", "--reporter=dot"], 900000);
      how = "vitest related is not supported here: ran the full suite";
    }
    step("static", name, r.code === 0 ? "pass" : "fail", `${how} · ${counted(r.out) || "no related test files"}${r.code === 0 ? "" : ` — ${hint}`}`, r.code === 0 ? [] : tail(r.out, failRe));
  } else step("static", name, "skip", "no component or test files in scope");
});
if (files.some((f) => /^src\/(styles|tokens)\//.test(f)) || auxHas(/^(src\/tokens|tokens\/source|styles\/source)\//)) {
  for (const s of ["tokens:check", "styles:check"]) { const r = run("npm", ["run", "-s", s]); step("static", s, r.code === 0 ? "pass" : "fail", "", r.code === 0 ? [] : tail(r.out, /./).slice(0, 10)); }
}

for (const fn of serialJobs) await fn();
await Promise.all(staticJobs);

/* ── ② runtime + ③ behaviour ─────────────────────────────────────────────────────────────────────────────────── */
// Fail fast (S5e): a static ✗ already fails the run; the browser steps (minutes per page) wait for the fix.
const staticFailed = steps.filter((s) => s.group === "static" && s.status === "fail");
const failFast = staticFailed.length > 0 && !KEEP_GOING && P.length > 0;
let serverUp = failFast ? false : await fetch(BASE, { signal: AbortSignal.timeout(4000) }).then((r) => r.ok).catch(() => false);
if (!failFast && P.length && !opt("url") && (ISOLATED || !serverUp)) {
  const why = ISOLATED ? "--isolated" : `${BASE} does not answer`;
  try {
    const { startIsolatedServer } = await import(pathToFileURL(path.join(root, "tools/qa/isolated-server.mjs")).href);
    isolatedServer = await startIsolatedServer(root);
    BASE = isolatedServer.url;
    serverUp = await fetch(BASE, { signal: AbortSignal.timeout(20000) }).then((r) => r.ok).catch(() => false);
    say(`\n  Browser steps on a private dev server ${BASE} (${why}): no HMR from other sessions, no Studio drafts`);
  } catch (error) {
    say(`\n  Could not start the isolated dev server (${error.message}); using ${BASE}`);
  }
}
// Zen Studio keeps admin edits as drafts on the dev server until someone saves them, and the server renders a drafted
// file from its draft: the browser steps below then check that unsaved text, while the static gates read the disk.
// List them, so a run never measures someone's unsaved edits without saying so.
const studioDrafts = serverUp ? await (async () => {
  try {
    const ping = await fetch(`${BASE}/__zen-studio/ping`, { signal: AbortSignal.timeout(3000) }).then((r) => (r.ok ? r.json() : null));
    if (!ping?.drafts || !ping.token) return [];
    const reply = await fetch(`${BASE}/__zen-studio/drafts`, { headers: { "x-zen-studio-token": ping.token, "x-zen-studio-role": "viewer" }, signal: AbortSignal.timeout(3000) }).then((r) => (r.ok ? r.json() : null));
    return Array.isArray(reply?.drafts) ? reply.drafts : [];
  } catch {
    return [];
  }
})() : [];
const ERROR_KINDS = new Set(["errors", "overflow", "images", "names", "nesting", "surfaces", "edges", "sizes", "typography", "device", "outline", "playground", "smoke", "scale", "hierarchy", "density", "fit"]);
const readAudit = (file) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; } };
const auditItems = (report) => { const errs = [], warns = []; for (const [key, entry] of Object.entries(report?.pages ?? {})) for (const [kind, items] of Object.entries(entry)) for (const item of items) (ERROR_KINDS.has(kind) ? errs : warns).push(`[${kind}] ${key}: ${item}`); return { errs, warns }; };
const sheets = [];
let review = { required: [], optional: [], unchanged: [], overwritten: [] };
const skipped = [];
if (failFast) {
  skipped.push(QUICK ? "platform audit (1512)" : "platform audit (1512 + 390)", ...(QUICK ? [] : ["dark mode audit", "behaviour probes", "contact sheets"]));
  step("runtime", "Browser steps", "skip", `skipped because a static gate failed (${staticFailed.map((s) => s.name).join(", ")}): ${skipped.join(", ")} — fix the static ✗ and run again, or pass --keep-going to run them anyway`);
} else if (!P.length && uiFiles.some((f) => ["component", "platform", "template"].includes(uiKind(f)))) {
  step("runtime", "Page mapping", "fail", "the edited UI files could not be mapped to a platform page, so nothing was rendered — re-run with --pages=<ids> (see the notes above)");
} else if (P.length && !serverUp) {
  step("runtime", "Dev server", "fail", `${BASE} does not answer — start it (preview_start "zen-platform", or npm run dev in Zen-DS) and re-run`);
} else if (P.length) {
  say("\n② Runtime audit");
  if (studioDrafts.length) {
    const lines = studioDrafts.map((d) => `${d.file} (+${d.changedLines?.added ?? 0} −${d.changedLines?.removed ?? 0}${files.includes(d.file) ? ", a file you edited" : ""})`);
    step("runtime", "Unsaved Zen Studio drafts", "warn", `${studioDrafts.length} file(s) on ${BASE} render from an unsaved Studio draft, not the disk: the browser checks and contact sheets show those drafts (Save or Discard them in the Studio toolbar's Unsaved list)`, lines);
  }
  const main = path.join(runDir, "audit.json");
  const args = ["tools/platform-audit/audit.mjs", `--url=${BASE}`, `--pages=${P.join(",")}`, `--out=${main}`, "--quality"];
  if (QUICK) args.push("--viewports=1512", "--no-playground");
  else if (TOKEN_ONLY) args.push("--viewports=1512,390", ...(TOKEN_SIZES ? ["--density"] : []));
  else args.push("--viewports=1512,390", "--smoke", "--density");
  const darkOut = path.join(runDir, "audit-dark.json");
  const behScript = path.join(root, "tools/platform-audit/behaviour.mjs");
  const behOut = path.join(runDir, "behaviour.json");
  const jobMain = launchSharded(process.execPath, args, P, main, 1800000);
  const jobDark = QUICK ? null : launchSharded(process.execPath, ["tools/platform-audit/audit.mjs", `--url=${BASE}`, `--pages=${P.join(",")}`, "--viewports=1512", "--dark", "--no-playground", "--quality", `--out=${darkOut}`], P, darkOut, 1800000);
  const jobBeh = QUICK || TOKEN_ONLY || !fs.existsSync(behScript) ? null : launchSharded(process.execPath, [behScript, `--url=${BASE}`, `--pages=${P.join(",")}`, `--out=${behOut}`], P, behOut, 1800000);
  const r = await jobMain();
  const report = readAudit(main);
  if (!report) step("runtime", "Platform audit", "fail", `audit crashed (exit ${r.code})`, tail(r.out, /./).slice(-12));
  else { const { errs, warns } = auditItems(report); const known = Object.values(report.baselined ?? {}).flatMap((k) => Object.values(k)).flat().length; step("runtime", `Platform audit ${QUICK ? "1512" : TOKEN_ONLY ? `1512 + 390 · quality${TOKEN_SIZES ? " · density" : ""} (token fast path)` : "1512 + 390 · smoke · quality · density"}${secs(r)}`, errs.length ? "fail" : warns.length ? "warn" : "pass", `${errs.length} error(s), ${warns.length} new warning(s)${known ? `, ${known} baseline` : ""}`, [...errs, ...warns.map((w) => `⚠ ${w}`)]); }
  if (!QUICK) {
    const dark = darkOut;
    const d = await jobDark();
    const dr = readAudit(dark);
    if (!dr) step("runtime", "Dark mode audit", "fail", `audit crashed (exit ${d.code})`, tail(d.out, /./).slice(-8));
    else { const { errs, warns } = auditItems(dr); const known = Object.values(dr.baselined ?? {}).flatMap((k) => Object.values(k)).flat().length; step("runtime", "Dark mode audit", errs.length ? "fail" : warns.length ? "warn" : "pass", `${errs.length} error(s), ${warns.length} new warning(s)${known ? `, ${known} baseline` : ""}${secs(d)}`, [...errs, ...warns.map((w) => `⚠ ${w}`)]); }

    say("\n③ Behaviour");
    const script = behScript;
    if (TOKEN_ONLY) step("behaviour", "Behaviour probes", "skip", "token-only change: focus, keyboard and click behaviour cannot change");
    else if (!fs.existsSync(script)) step("behaviour", "Behaviour probes", "skip", "tools/platform-audit/behaviour.mjs is not installed yet");
    else {
      const out = behOut;
      const b = await jobBeh();
      const br = readAudit(out);
      if (!br) step("behaviour", "Behaviour probes", b.code === 0 ? "pass" : "fail", b.code === 0 ? "" : `crashed (exit ${b.code})`, tail(b.out, /./).slice(-8));
      else {
        const all = Object.entries(br.pages ?? {}).flatMap(([key, fs_]) => (fs_ ?? []).map((f) => ({ ...f, key })));
        const fresh = all.filter((f) => f.new !== false); const errs = fresh.filter((f) => f.severity === "error"); const warns = fresh.filter((f) => f.severity !== "error");
        step("behaviour", "Focus ring · keyboard reach · APG keys · dead clicks · hover", errs.length ? "fail" : warns.length ? "warn" : "pass", `${errs.length} error(s), ${warns.length} new warning(s), ${all.length - fresh.length} baseline${secs(b)}`, [...errs, ...warns].map((f) => `${f.severity === "error" ? "✗" : "⚠"} [${f.check}] ${f.key} ${f.card ? `${f.card}: ` : ""}${f.message}`));
      }
    }
  }
}

// Zen Studio E2E (tools/studio/e2e): drives the Studio UI on its own dev server (port 5190+, its own drafts), so it needs
// neither 5173 nor a page. A row that worked in matrix.baseline.json and now fails is a regression (exit 1).
if (studioInScope && !staticFailed.length) {
  say("\n② Studio E2E");
  const t0 = Date.now();
  // 25 min: the full matrix (147 rows, 2026-10-07) runs about 15; it outgrew the 15 min limit it had.
  const r = run("npm", ["run", "-s", "studio:e2e", "--", ...(QUICK ? ["--only=shell,select,inspector"] : [])], 1500000);
  const summary = r.out.match(/(\d+) works · (\d+) broken/)?.[0] ?? "no summary";
  const regressions = r.out.match(/✗ Regressions[^\n]*/)?.[0];
  const fixed = r.out.match(/✓ Fixed since the baseline[^\n]*/)?.[0];
  const report = r.out.match(/Report: (\S+)/)?.[1];
  step("runtime", "Studio E2E (feature matrix)", r.code === 0 ? (fixed ? "warn" : "pass") : "fail",
    `${summary}${report ? ` · ${report}` : ""} · ${Math.round((Date.now() - t0) / 1000)}s`, [regressions, fixed, r.code === 2 ? tail(r.out, /error|Error/).slice(0, 6).join(" | ") : ""].filter(Boolean));
} else if (studioInScope) step("runtime", "Studio E2E (feature matrix)", "skip", "skipped because a static gate failed");

/* ── ④ example coverage ─────────────────────────────────────────────────────────────────────────────────────────── */
say("\n④ Example coverage");
function skipLiteral(src, i) { const q = src[i]; for (let j = i + 1; j < src.length; j++) { if (src[j] === "\\") { j++; continue; } if (q === "`" && src[j] === "$" && src[j + 1] === "{") { let d = 1; j += 2; for (; j < src.length && d; j++) { if (src[j] === "{") d++; else if (src[j] === "}") d--; else if ("'\"`".includes(src[j])) j = skipLiteral(src, j); } j--; continue; } if (src[j] === q) return j; } return src.length; }
function arrayAt(src, open) { let d = 0; for (let j = open; j < src.length; j++) { const c = src[j]; if ("'\"`".includes(c)) { j = skipLiteral(src, j); continue; } if (c === "/" && src[j + 1] === "/") { j = src.indexOf("\n", j); continue; } if (c === "[") d++; else if (c === "]" && --d === 0) return src.slice(open, j + 1); } return ""; }
const exampleFiles = [...fs.readdirSync(path.join(root, "src/platform")).filter((f) => /Showcases\.tsx$/.test(f)).map((f) => `src/platform/${f}`), ...fs.readdirSync(path.join(root, "src/platform/appLayer")).filter((f) => f.endsWith(".tsx")).map((f) => `src/platform/appLayer/${f}`)];
const sources = exampleFiles.map((f) => fs.readFileSync(path.join(root, f), "utf8"));
const MATRIX = [
  ["states", /\b(empty|no (data|results?|items|messages|files|matches)|nothing|error|errors|fail(ed|ure)?|invalid|retry|loading|skeleton|pending|disabled|read-only|readonly|success|saved|offline|expired|limit|validation)\b/i],
  ["edge cases", /\b(long|truncat\w*|overflow|many|lots|wrap\w*|narrow|single|one item|zero|max\w*|min\w*|dense|large|bulk|hundreds|thousands|edge)\b/i],
  ["mobile", /PlatformPhone|\b(mobile|phone|touch|swipe|tap)\b/i],
  ["keyboard / a11y", /\b(keyboard|screen reader|aria-?\w*|focus\w*|shortcut|a11y|accessib\w*|announce\w*|live region|arrow keys|escape)\b/i],
];
const coverage = [];
for (const page of P) {
  const entries = [];
  sources.forEach((src) => {
    const start = src.search(/\n(export )?const \w*[eE]xamples\w*\s*(:[^=]+)?=\s*\{/); if (start < 0) return;
    const m = new RegExp(`\\n {2}"?${page}"?:\\s*\\[`).exec(src.slice(start)); if (!m) return;
    const body = arrayAt(src, start + m.index + m[0].length - 1);
    for (const t of body.matchAll(/\btitle:\s*(["'`])((?:\\.|(?!\1).)*)\1/g)) {
      const from = t.index; const next = body.slice(from + 1).search(/\btitle:\s*["'`]/);
      const chunk = body.slice(from, next < 0 ? undefined : from + 1 + next);
      entries.push({ title: t[2], text: chunk });
    }
  });
  if (!entries.length) { coverage.push({ page, count: 0, missing: [] }); continue; }
  const missing = MATRIX.filter(([, re]) => !entries.some((e) => re.test(e.text))).map(([n]) => n);
  const tags = new Set(entries.flatMap((e) => [...e.text.matchAll(/<([A-Z][A-Za-z]+)\b/g)].map((x) => x[1])));
  if (tags.size < 3) missing.push("composition");
  coverage.push({ page, count: entries.length, missing });
}
// Only the pages whose examples this run's edits touched get the matrix (S6b); the others' gaps are known debt.
const gap = (c) => c.count > 0 && (c.count < 4 || c.missing.length > 0);
for (const c of coverage.filter((x) => examplePages.has(x.page))) step("coverage", `${c.page}: ${c.count} example(s)`, c.count === 0 ? "skip" : gap(c) ? "warn" : "pass", c.count === 0 ? "no example map entry (playground-only page?)" : [c.count < 4 ? "fewer than 4 examples" : "", c.missing.length ? `not covered: ${c.missing.join(", ")}` : "", gap(c) ? `${BACKLOG.replace("fix it", "add examples")}` : ""].filter(Boolean).join(" · "));
const known = coverage.filter((x) => !examplePages.has(x.page) && gap(x));
if (known.length) step("coverage", `${known.length} page${known.length === 1 ? "" : "s"} with known coverage gaps (Backlog)`, "skip", known.map((c) => c.page).join(", "));
else if (!coverage.some((x) => examplePages.has(x.page))) step("coverage", "Example matrix", "skip", "no example source edited for the pages in scope");

/* ── ⑤ screenshots ──────────────────────────────────────────────────────────────────────────────────────────────── */
if (!QUICK && serverUp && P.length && !failFast) {
  say("\n⑤ Screenshots to review");
  for (const page of P) for (const width of [1512, 390]) {
    run(process.execPath, ["tools/platform-audit/shoot.mjs", page, `--width=${width}`, `--url=${BASE}`], 600000);
    const sheet = path.join(root, ".platform-shots", `${page}-${width}.png`);
    let mtime = 0; try { mtime = fs.statSync(sheet).mtimeMs; } catch { /* not shot */ }
    if (mtime >= started) sheets.push({ path: rel(sheet), page, width, hash: sha1File(sheet), at: Math.round(mtime), primary: primary.has(page) });
  }
  // What the Stop hook will ask for: sheets whose content is new to this session, own pages first, 390 first, ≤ 12.
  review = sheetsToReview(root, SESSION ? readLedger(root, SESSION) : { reviewed: [] }, { sheets });
  // Token fast path: the consumer components' own pages are the ones to look at; pages that only import them are optional.
  if (TOKEN_ONLY) { const own = review.required.filter((s) => s.primary); if (own.length) { review.optional = [...review.required.filter((s) => !s.primary), ...review.optional]; review.required = own; } }
  const rest = [...review.optional, ...review.overwritten];
  step("visual", review.required.length ? `Contact sheets: open these ${review.required.length} (new content; own pages first, 390 before 1512)` : "Contact sheets", sheets.length ? "pass" : "warn",
    `${sheets.length} image(s)${rest.length ? ` · ${rest.length} optional` : ""}${review.unchanged.length ? ` · ${review.unchanged.length} unchanged since you reviewed them (not needed)` : ""}`,
    [...review.required.map((s) => s.path), ...rest.map((s) => `(optional) ${s.path}`)]);
}

/* ── verdict, report, ledger ────────────────────────────────────────────────────────────────────────────────────── */
const failed = steps.filter((s) => s.status === "fail");
const warned = steps.filter((s) => s.status === "warn");
const couldNotRun = steps.some((s) => s.name === "Dev server" && s.status === "fail");
const ok = failed.length === 0;
const full = !QUICK && (serverUp || !P.length);
const finished = Date.now();
const icon = { pass: "✓", fail: "✗", warn: "⚠", skip: "–" };
const TRIAGE = "Triage NEW ⚠ only; pre-existing warnings are debt: note them in the Backlog (Scope lock), do not fix them in this task.";
const md = [
  `# Build-QA ${ok ? (full ? "PASS" : "PASS (quick — not a delivery pass)") : "FAIL"} — ${new Date(started).toLocaleString("en-GB")}`,
  "",
  `- Session: ${SESSION ?? "manual"} · duration ${Math.round((finished - started) / 1000)}s`,
  `- Files (${files.length}): ${files.map((f) => `\`${f}\``).join(", ") || "—"}`,
  ...(aux.length ? [`- Tool/test/token files (${aux.length}): ${aux.map((f) => `\`${f}\``).join(", ")}`] : []),
  `- Pages: ${P.join(", ") || "—"}${ONLY ? " (--only)" : ""}`,
  ...notes.map((n) => `- Note: ${n}`),
  "",
  ...["static", "runtime", "behaviour", "coverage", "visual"].flatMap((g) => { const s = steps.filter((x) => x.group === g); return s.length ? [`## ${g[0].toUpperCase()}${g.slice(1)}`, "", ...s.flatMap((x) => [`- ${icon[x.status]} **${x.name}**${x.detail ? ` — ${x.detail}` : ""}`, ...x.items.slice(0, 60).map((i) => `  - ${i}`)]), ""] : []; }),
  warned.length ? `> ${TRIAGE}\n` : "",
  "## Tóm tắt để báo cáo (deliver)",
  "",
  `QA gate: **${ok ? "PASS" : "FAIL"}**${full ? "" : " (chưa đủ: quick hoặc thiếu dev server)"} · ${P.length} trang (${P.join(", ") || "—"}) · ${files.length} file.`,
  ...steps.filter((s) => s.status !== "skip").map((s) => `- ${icon[s.status]} ${s.name}${s.detail ? ` — ${s.detail}` : ""}`),
  review.required.length ? `- Ảnh cần mở (nội dung mới): ${review.required.map((s) => `\`${s.path}\``).join(", ")} — mở xem từng ảnh và đối chiếu UX rubric trước khi deliver.` : sheets.length ? `- Ảnh đã chụp: ${sheets.length}, không có ảnh mới cần xem (${review.unchanged.length} ảnh giống ảnh đã xem).` : "",
  "",
].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
const reportFile = path.join(root, ".qa", "reports", `${stamp}${SESSION ? `-${SESSION.slice(0, 8)}` : ""}.md`);
fs.mkdirSync(path.dirname(reportFile), { recursive: true });
fs.writeFileSync(reportFile, md);
fs.writeFileSync(reportFile.replace(/\.md$/, ".json"), JSON.stringify({ started, finished, ok, full, session: SESSION, files, aux, pages: P, only: ONLY, notes, tokens, skipped, steps, shots: sheets.map((s) => s.path), sheets, review: { required: review.required.map((s) => s.path), optional: [...review.optional, ...review.overwritten].map((s) => s.path), unchanged: review.unchanged.map((s) => s.path) } }, null, 2));

if (SESSION) {
  const fresh = readLedger(root, SESSION); // re-read: the hook may have recorded edits while we ran
  const mustOpen = new Set(review.required.map((s) => s.path));
  fresh.runs = [...(fresh.runs ?? []), { at: started, finishedAt: finished, ok, full, pages: P, files, aux, failed: failed.map((s) => s.name), report: rel(reportFile), shots: sheets.map((s) => s.path), sheets: sheets.map((s) => ({ ...s, required: mustOpen.has(s.path) })) }].slice(-20);
  fresh.runs.slice(0, -5).forEach((r) => { delete r.sheets; }); // hashes of older runs are no longer needed
  // --only: a file whose pending edits hint pages that were not rendered stays pending.
  const covered = (f) => !ONLY || pendingEdits(fresh.files[f] ?? {}).flatMap((e) => e.pages ?? []).every((p) => P.includes(p));
  if (ok && full) markPassed(fresh, files.filter((f) => uiKind(f) && covered(f)), started);
  if (fresh.running?.pid === process.pid) delete fresh.running;
  writeLedger(root, SESSION, fresh);
  marked = false;
}

say(`\n${ok ? "✓" : "✗"} Build-QA ${ok ? "PASS" : "FAIL"}${QUICK ? " (quick run: re-run without --quick before delivering)" : ""} — ${failed.length} failing step(s), ${warned.length} with warnings. Report: ${rel(reportFile)}`);
if (!ok) say(`Fix every ✗ in your change at its owner (component CSS/TSX, example, playground), then run \`npm run qa\` again.${failFast ? " The browser steps were skipped (static ✗); they run once the static gates pass (or with --keep-going)." : ""} Pre-existing debt is in the baselines and does not fail the gate.`);
if (ok && review.required.length) say(`Next: open the ${review.required.length} contact sheet(s) listed as new above (Read the PNG), review them with the UX rubric in skills/zen-build-qa/SKILL.md, fix what you see in your change, and include the summary from the report when you deliver.`);
if (warned.length) say(TRIAGE);
process.exitCode = couldNotRun ? 2 : ok ? 0 : 1;
} finally {
  clearRunning();
  if (isolatedServer) await isolatedServer.close().catch(() => undefined);
}
process.exit(process.exitCode ?? 0);
