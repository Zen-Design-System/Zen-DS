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
 *   npm run qa -- --failed            after a failing run, with nothing in its scope edited since: re-run only what failed
 *                                     (a flaky shard or E2E row): the browser steps on the pages that had an error or no
 *                                     report, the Studio E2E only if it failed; TypeScript, contracts and Vitest stay passed
 *   npm run qa -- --isolated          run the browser steps on a private dev server (port 5200+, no HMR, no Studio
 *                                     drafts); used by itself when the shared server does not answer
 *   npm run qa -- --quick             fast loop while building: static gates + audit at 1512 (never counts as a pass)
 *   npm run qa -- --serial            run the steps one after another (default: tsc, contract suites and Vitest run side by side,
 *                                     and audit + dark audit + behaviour run side by side in shards of about 10 min planned
 *                                     from the last run's page timings, ZEN_QA_SHARDS=2 processes per job at a time; the
 *                                     contract suites run ZEN_QA_SUITES=4 at a time). The Studio E2E runs in shards of about
 *                                     10 min one after another, with one combined report (.qa/studio-e2e/<stamp>-gate.md)
 *   npm run qa -- --tokens-base=HEAD~1  diff the token files against another ref (default HEAD) for the token scope
 *
 * ① Static     tsc · style-guard (spacing/radius/type/colour/shadow tokens) · usage-guard · guidelines (stale docs of
 *              your components are regenerated) · harness self-tests (when tools/usage-guard, tools/style-guard, tools/qa or tools/platform-audit changed)
 *              · Layout self-test (npm run layout:selftest, when src/components/Layout, _shared/corners.ts or scale.ts, or the
 *              effect styles and token sources are in scope)
 *              · figma-contract suites of the components in scope · Vitest related to the edited files · tokens/styles
 *              checks (when styles changed). A static ✗ skips the browser steps unless --keep-going.
 * ② Runtime    audit --smoke --quality --density at 1512 + 390 + 320 (text styles, hierarchy, token scale, concentric
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
  INTERACTION_FOLDERS, LABELS_FILE, PAGE_SECONDS, REPRESENTATIVE, TOKEN_STYLE_FILES, allPages, auxKind, contractSuites, dirtyFiles,
  e2eRowSeconds, e2eVerdictLines, guidelineOwners, guidelineSlugOf, isExampleSource, markPassed, pageEstimator, pageSeconds, pagesForEdit, pendingAux, retryPagesFrom,
  pendingEdits, planE2E, planShards, primaryPages, readLedger, readTimings, sha1File, shardCapS, sheetsToReview, tokenScope, uiKind,
  writeLedger, writeTimings,
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
// --failed (process audit B.2, the user 2026-10-24): after a failing full run, with nothing in its scope edited since, re-run
// only what failed. TypeScript, the Figma contracts and Vitest keep their pass (the other static gates are quick and run
// again); the browser steps run on the pages that had an error or wrote no report; the Studio E2E only when it failed. A
// pass then completes the last run, so its files count as passed.
const RETRY = (() => {
  if (!flag("failed")) return null;
  const last = SESSION ? (ledger.runs ?? []).at(-1) : null;
  let report = null; try { report = last?.report ? JSON.parse(fs.readFileSync(path.join(root, last.report.replace(/\.md$/, ".json")), "utf8")) : null; } catch { /* gone */ }
  const scope = new Set([...(last?.files ?? []), ...(last?.aux ?? [])]);
  const editedAt = (f) => Math.max(ledger.files?.[f]?.editedAt ?? 0, ledger.aux?.[f]?.editedAt ?? 0);
  const edited = last ? [...files, ...aux].filter((f) => !scope.has(f) || editedAt(f) > last.at) : [];
  const why = !SESSION ? "no session" : !last ? "no earlier run in this session" : last.ok ? "the last run passed" : !last.full ? "the last run was not a full run"
    : !report ? "the last run's report is gone" : edited.length ? `${edited.length} file(s) edited since the last run: ${brief(edited, 4)}` : null;
  if (why) { notes.push(`--failed: running everything (${why})`); return null; }
  const lastStamp = new Date(last.at).toISOString().replace(/[:.]/g, "-").slice(0, 19);
  notes.push(`--failed: re-running what failed in the last run (${new Date(last.at).toLocaleString("en-GB")}): ${(last.failed ?? []).join(", ") || "—"}`);
  return { last, steps: report.steps ?? [], runDir: path.join(root, ".qa", "runs", `${lastStamp}-${SESSION.slice(0, 8)}`) };
})();
/** A static step that passed in the last run and is not re-run under --failed (its name, or the start of it). */
const passedBefore = (prefix) => Boolean(RETRY?.steps.some((x) => x.group === "static" && x.status === "pass" && x.name.startsWith(prefix)));
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
// `marks` collects the "✓|⚠|✗ <page>@<width>" lines with the time each arrived (page timings for the next shard plan), in
// awake time like the time limit's timer: a Mac asleep mid-run would otherwise charge the sleep to one page.
// `term`: at the time limit the process gets SIGTERM first (the Studio E2E puts the disk back), SIGKILL 15 s later.
const runAsync = (cmd, args, timeoutMs = 600000, { marks = null, term = false } = {}) => new Promise((resolve) => {
  const t0 = Date.now(), a0 = performance.now(); const c = spawn(cmd, args, { cwd: root, env: { ...process.env, FORCE_COLOR: "0" } }); let out = "", carry = "", killed = false, hard = 0;
  const timer = setTimeout(() => { killed = true; c.kill(term ? "SIGTERM" : "SIGKILL"); if (term) hard = setTimeout(() => c.kill("SIGKILL"), 15000); }, timeoutMs);
  const take = (d) => { out += d; if (!marks) return; const lines = `${carry}${d}`.split("\n"); carry = lines.pop(); for (const l of lines) if (/^[✓⚠✗] /.test(l)) marks.push([performance.now() - a0, l]); };
  const end = (code) => { clearTimeout(timer); clearTimeout(hard); resolve({ code, out, ms: Date.now() - t0, start: t0, end: Date.now(), killed }); };
  c.stdout.on("data", take); c.stderr.on("data", (d) => { out += d; });
  c.on("error", (e) => { out += String(e); end(2); }); c.on("close", (code) => end(code ?? 1));
});
// fn over items, at most `limit` at a time, results in input order. Each contract suite starts its own browser, so the
// scoped contract step runs ZEN_QA_SUITES (default 4) of them at once, one by one under --serial.
const pooled = async (items, limit, fn) => { const out = new Array(items.length); let next = 0; await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } })); return out; };
const SUITE_LIMIT = SERIAL ? 1 : Math.max(1, Number(process.env.ZEN_QA_SUITES ?? 4) || 4);
// The pages of a runtime job are independent (reports are keyed by page@width), so a job runs in shards planned from the
// last run's page timings (.qa/timings.json, lib.mjs planShards): each shard about 10 min, stopped at 3× its plan (never
// under 30 min), and the part reports are merged back into the one file the gate reads. The shards of all jobs share one
// pool of ZEN_QA_SHARDS (default 2) processes per job, the main audit's first; --serial runs them one at a time.
const SHARDS = Math.max(1, Number(process.env.ZEN_QA_SHARDS ?? 2) || 1);
const timings = readTimings(root);
let runtimePool = null;
const makePool = (limit) => { let active = 0; const queue = []; const next = () => { while (active < limit && queue.length) { const [fn, resolve] = queue.shift(); active += 1; fn().then(resolve).finally(() => { active -= 1; next(); }); } }; return (fn) => new Promise((resolve) => { queue.push([fn, resolve]); next(); }); };
const mergeReports = (reps) => { const m = { ...reps[0], pages: {} }; for (const r of reps) { Object.assign(m.pages, r.pages ?? {}); for (const k of ["baselined", "current", "smokeStats"]) if (r[k]) m[k] = { ...(m[k] ?? {}), ...r[k] }; } return m; };
const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; } };
const readJsonText = (out) => { try { return JSON.parse(out.trim().split("\n").at(-1)); } catch { return null; } };
const launchSharded = (job, cmd, baseArgs, pageList, finalOut) => {
  const estimate = pageEstimator(timings[job], PAGE_SECONDS[job]);
  const plan = planShards(pageList, estimate, { min: Math.min(SHARDS, Math.floor(pageList.length / 3)) });
  const argsFor = (pages, out) => baseArgs.map((a) => (a.startsWith("--pages=") ? `--pages=${pages.join(",")}` : a.startsWith("--out=") ? `--out=${out}` : a));
  const parts = plan.map((s, i) => {
    const out = plan.length === 1 ? finalOut : finalOut.replace(/\.json$/, `.part${i}.json`); const cap = shardCapS(s.seconds); const marks = [];
    return { ...s, out, cap, marks, job: runtimePool(() => runAsync(cmd, argsFor(s.items, out), cap * 1000, { marks })) };
  });
  let done = null;
  return () => (done ??= (async () => {
    const rs = await Promise.all(parts.map((x) => x.job));
    const reps = parts.map((x) => readJson(x.out));
    if (plan.length > 1 && reps.some(Boolean)) fs.writeFileSync(finalOut, JSON.stringify(mergeReports(reps.filter(Boolean)), null, 2));
    // A shard without a report (stopped at its limit, or crashed): its pages were not checked, which fails the step; the
    // findings of the other shards still count.
    const trouble = parts.flatMap((x, i) => (reps[i] ? [] : [`shard ${i + 1}/${parts.length} (${x.items.join(", ")}) wrote no report: ${rs[i].killed ? `stopped at its ${Math.round(x.cap / 60)}-min limit after ${Object.keys(pageSeconds(x.marks)).length} of ${x.items.length} page(s) (plan ${Math.round(x.seconds / 60)} min)` : `exit ${rs[i].code}`}`]));
    // Next plan: what each page took; the pages of a shard that hit its limit count as if they had shared it.
    const table = (timings[job] ??= {});
    parts.forEach((x, i) => { Object.assign(table, pageSeconds(x.marks)); if (rs[i].killed) for (const pg of x.items) table[pg] = Math.max(table[pg] ?? 0, estimate(pg), Math.round(x.cap / x.items.length)); });
    try { writeTimings(root, timings); } catch { /* timings are a hint */ }
    return { code: rs.find((r) => r.code !== 0)?.code ?? 0, out: rs.map((r) => r.out).join("\n"), ms: Math.max(...rs.map((r) => r.end)) - Math.min(...rs.map((r) => r.start)), shards: parts.length, trouble };
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
else if (passedBefore("TypeScript")) step("static", "TypeScript", "skip", "passed in the last run (--failed)");
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
for (const [name, script, dir] of [["Usage-guard self-test", "tools/usage-guard/selftest.mjs", "tools/usage-guard"], ["Style-guard self-test", "tools/style-guard/selftest.mjs", "tools/style-guard"], ["QA gate self-test", "tools/qa/selftest.mjs", "tools/qa"], ["Platform-audit self-test", "tools/platform-audit/selftest.mjs", "tools/platform-audit"]]) {
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
  else if (passedBefore("Figma contracts")) step("static", "Figma contracts", "skip", "passed in the last run (--failed)");
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
// Nested layer names (core rebuild M7): every nest() layer name a component gives `overrides` is a nested instance of its
// Figma sets (tools/figma-contract/nested-paths.mjs), for component files, the contracts or the Figma mapping in scope.
addJob(async () => {
  const relevant = ALL || compFolders.size > 0 || [...files, ...aux].some((f) => /^(tools\/figma-contract\/|docs\/figma-contracts\/)|figmaProps\.generated\.ts$|^tools\/studio\/figma-pull\.mjs$/.test(f));
  if (QUICK || !relevant) { step("static", "Nested layer names (code ↔ Figma)", "skip", QUICK ? "quick run" : "no component, contract or Figma-mapping files in scope"); return; }
  const r = await runAsync(process.execPath, ["tools/figma-contract/nested-paths.mjs", "--check"], 120000);
  step("static", "Nested layer names (code ↔ Figma)", r.code === 0 ? "pass" : "fail", r.out.trim().split("\n").at(-1)?.slice(0, 160) ?? "", r.code === 0 ? [] : tail(r.out, /✗|not in Figma|stale/));
});
// Browser tests (S5d): Vitest on the tests related to the edited component files; the full suite for tests/**, _shared, --all.
if (!QUICK && fs.existsSync(path.join(root, "node_modules/.bin/vitest"))) addJob(async () => {
  const name = "Browser tests (Vitest: smoke + axe baseline + interactions)";
  const hint = "npm test fails (after a deliberate a11y fix: ZEN_UPDATE_AXE=1 npm test -- tests/smoke)";
  const failRe = /FAIL|×|AssertionError|expected|Error:/;
  const counted = (out) => out.replace(/\x1b\[[0-9;]*m/g, "").match(/Test Files\s+([^\n]*)/)?.[1]?.trim() ?? "";
  if (passedBefore("Browser tests")) { step("static", name, "skip", "passed in the last run (--failed)"); return; }
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
// The audit's error kinds (audit.mjs SEVERITY, plus playground and smoke); the platform-audit self-test checks they match.
const ERROR_KINDS = new Set(["errors", "overflow", "counts", "images", "names", "nesting", "surfaces", "edges", "sizes", "typography", "device", "outline", "playground", "smoke", "scale", "hierarchy", "density", "fit", "card-gap", "legend-column", "toolbar-search", "table-lead", "item-row-gap", "clip"]);
const auditItems = (report) => { const errs = [], warns = []; for (const [key, entry] of Object.entries(report?.pages ?? {})) for (const [kind, items] of Object.entries(entry)) for (const item of items) (ERROR_KINDS.has(kind) ? errs : warns).push(`[${kind}] ${key}: ${item}`); return { errs, warns }; };
// The pages the browser steps run on: all of them, or under --failed the pages that had an error or no report last time
// ([] when the last run's browser steps all passed; all of them when they never ran).
let RP = P;
const retryPages = () => (RETRY ? retryPagesFrom({ steps: RETRY.steps, runDir: RETRY.runDir, pages: P, errorKinds: ERROR_KINDS, behaviour: fs.existsSync(path.join(root, "tools/platform-audit/behaviour.mjs")) }) : P);
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
} else if (P.length && !(RP = retryPages()).length) {
  step("runtime", "Browser steps", "skip", "passed in the last run (--failed)");
} else if (P.length) {
  say(`\n② Runtime audit${RP.length < P.length ? ` (--failed: ${RP.length} of ${P.length} page(s))` : ""}`);
  if (studioDrafts.length) {
    const lines = studioDrafts.map((d) => `${d.file} (+${d.changedLines?.added ?? 0} −${d.changedLines?.removed ?? 0}${files.includes(d.file) ? ", a file you edited" : ""})`);
    step("runtime", "Unsaved Zen Studio drafts", "warn", `${studioDrafts.length} file(s) on ${BASE} render from an unsaved Studio draft, not the disk: the browser checks and contact sheets show those drafts (Save or Discard them in the Studio toolbar's Unsaved list)`, lines);
  }
  const main = path.join(runDir, "audit.json");
  const args = ["tools/platform-audit/audit.mjs", `--url=${BASE}`, `--pages=${RP.join(",")}`, `--out=${main}`, "--quality"];
  if (QUICK) args.push("--viewports=1512", "--no-playground");
  // 320 (a small phone, the user 2026-10-16): what 390 hides — labels that overlap, rows that no longer fit.
  else if (TOKEN_ONLY) args.push("--viewports=1512,390,320", ...(TOKEN_SIZES ? ["--density"] : []));
  else args.push("--viewports=1512,390,320", "--smoke", "--density");
  const darkOut = path.join(runDir, "audit-dark.json");
  const behScript = path.join(root, "tools/platform-audit/behaviour.mjs");
  const behOut = path.join(runDir, "behaviour.json");
  const withBeh = !QUICK && !TOKEN_ONLY && fs.existsSync(behScript);
  runtimePool = makePool(SERIAL ? 1 : SHARDS * (QUICK ? 1 : withBeh ? 3 : 2));
  const jobMain = launchSharded(QUICK ? "audit-quick" : TOKEN_ONLY ? "audit-token" : "audit", process.execPath, args, RP, main);
  const jobDark = QUICK ? null : launchSharded("dark", process.execPath, ["tools/platform-audit/audit.mjs", `--url=${BASE}`, `--pages=${RP.join(",")}`, "--viewports=1512", "--dark", "--no-playground", "--quality", `--out=${darkOut}`], RP, darkOut);
  const jobBeh = withBeh ? launchSharded("behaviour", process.execPath, [behScript, `--url=${BASE}`, `--pages=${RP.join(",")}`, `--out=${behOut}`], RP, behOut) : null;
  // A job's shard count, and the shards that wrote no report (each one fails the step).
  const shardNote = (x) => `${x.shards > 1 ? ` · ${x.shards} shards` : ""}${x.trouble.length ? ` · ${x.trouble.length} shard(s) without a report` : ""}`;
  const shardItems = (x) => x.trouble.map((t) => `✗ ${t}`);
  const r = await jobMain();
  const report = readJson(main);
  if (!report) step("runtime", "Platform audit", "fail", `audit crashed (exit ${r.code})${shardNote(r)}`, [...shardItems(r), ...tail(r.out, /./).slice(-12)]);
  else { const { errs, warns } = auditItems(report); const known = Object.values(report.baselined ?? {}).flatMap((k) => Object.values(k)).flat().length; step("runtime", `Platform audit ${QUICK ? "1512" : TOKEN_ONLY ? `1512 + 390 + 320 · quality${TOKEN_SIZES ? " · density" : ""} (token fast path)` : "1512 + 390 + 320 · smoke · quality · density"}${secs(r)}`, errs.length || r.trouble.length ? "fail" : warns.length ? "warn" : "pass", `${errs.length} error(s), ${warns.length} new warning(s)${known ? `, ${known} baseline` : ""}${shardNote(r)}`, [...shardItems(r), ...errs, ...warns.map((w) => `⚠ ${w}`)]); }
  if (!QUICK) {
    const dark = darkOut;
    const d = await jobDark();
    const dr = readJson(dark);
    if (!dr) step("runtime", "Dark mode audit", "fail", `audit crashed (exit ${d.code})${shardNote(d)}`, [...shardItems(d), ...tail(d.out, /./).slice(-8)]);
    else { const { errs, warns } = auditItems(dr); const known = Object.values(dr.baselined ?? {}).flatMap((k) => Object.values(k)).flat().length; step("runtime", "Dark mode audit", errs.length || d.trouble.length ? "fail" : warns.length ? "warn" : "pass", `${errs.length} error(s), ${warns.length} new warning(s)${known ? `, ${known} baseline` : ""}${secs(d)}${shardNote(d)}`, [...shardItems(d), ...errs, ...warns.map((w) => `⚠ ${w}`)]); }

    say("\n③ Behaviour");
    const script = behScript;
    if (TOKEN_ONLY) step("behaviour", "Behaviour probes", "skip", "token-only change: focus, keyboard and click behaviour cannot change");
    else if (!fs.existsSync(script)) step("behaviour", "Behaviour probes", "skip", "tools/platform-audit/behaviour.mjs is not installed yet");
    else {
      const out = behOut;
      const b = await jobBeh();
      const br = readJson(out);
      if (!br) step("behaviour", "Behaviour probes", b.code === 0 && !b.trouble.length ? "pass" : "fail", b.code === 0 && !b.trouble.length ? "" : `crashed (exit ${b.code})${shardNote(b)}`, [...shardItems(b), ...tail(b.out, /./).slice(-8)]);
      else {
        const all = Object.entries(br.pages ?? {}).flatMap(([key, fs_]) => (fs_ ?? []).map((f) => ({ ...f, key })));
        const fresh = all.filter((f) => f.new !== false); const errs = fresh.filter((f) => f.severity === "error"); const warns = fresh.filter((f) => f.severity !== "error");
        step("behaviour", "Focus ring · keyboard reach · APG keys · dead clicks · hover", errs.length || b.trouble.length ? "fail" : warns.length ? "warn" : "pass", `${errs.length} error(s), ${warns.length} new warning(s), ${all.length - fresh.length} baseline${secs(b)}${shardNote(b)}`, [...shardItems(b), ...[...errs, ...warns].map((f) => `${f.severity === "error" ? "✗" : "⚠"} [${f.check}] ${f.key} ${f.card ? `${f.card}: ` : ""}${f.message}`)]);
      }
    }
  }
}

// Zen Studio E2E (tools/studio/e2e): drives the Studio UI on its own dev server (port 5190+, its own drafts), so it needs
// neither 5173 nor a page. A row that worked in matrix.baseline.json and now fails is a regression (exit 1), and a row
// not in it that comes back broken fails too (user, 2026-10-25); lib.mjs e2eVerdictLines.
// Shards (2026-10-22): the full matrix (338 rows) took 25 min alone and passed its 40-min limit under load, ending with
// "no summary". Its rows now run in shards one after another (they share the save fixture), each planned at about 10 min
// from the last run's seconds per row (lib.mjs planE2E), with a --budget after which a shard starts no row (those are
// reported as not run, a ✗) and a hard stop 10 min later; one combined report and regression list come out.
if (studioInScope && !staticFailed.length && RETRY?.steps.some((x) => x.name.startsWith("Studio E2E") && x.status === "pass")) {
  step("runtime", "Studio E2E (feature matrix)", "skip", "passed in the last run (--failed)");
} else if (studioInScope && !staticFailed.length) {
  say("\n② Studio E2E");
  const t0 = Date.now();
  const e2e = "tools/studio/e2e/run.mjs";
  const groups = QUICK ? ["--only=shell,select,inspector"] : [];
  const listed = readJsonText(run(process.execPath, [e2e, "--list", ...groups], 120000).out);
  const rowCount = listed?.rows ?? timings.e2e?.rows ?? 340;
  const plan = planE2E(rowCount, e2eRowSeconds(root, timings));
  const shards = [];
  for (let k = 1; k <= plan.n; k++) {
    if (plan.n > 1) say(`  shard ${k}/${plan.n} (about ${Math.round(plan.planned / 60)} min, budget ${Math.round(plan.budget / 60)} min) …`);
    const r = await runAsync(process.execPath, [e2e, ...groups, ...(plan.n > 1 ? [`--shard=${k}/${plan.n}`] : []), `--budget=${plan.budget}`], plan.cap * 1000, { term: true });
    const md = r.out.match(/Report: (\S+)/)?.[1];
    shards.push({ k, r, md, rep: md ? readJson(path.join(root, md.replace(/\.md$/, ".json"))) : null });
  }
  const { compare, readBaseline, readFlaky, writeReport } = await import(pathToFileURL(path.join(root, "tools/studio/e2e/lib/matrix.mjs")).href);
  const baselineFile = path.join(root, "tools/studio/e2e/matrix.baseline.json");
  const rows = shards.flatMap((x) => x.rep?.rows ?? []);
  const verdict = compare(rows, readBaseline(baselineFile), readFlaky(baselineFile));
  const count = (status) => rows.filter((row) => row.status === status).length;
  const notRun = rows.filter((row) => row.notRun);
  const ms = Date.now() - t0;
  let report = shards[0]?.md;
  if (plan.n > 1 && rows.length) {
    const first = shards.find((x) => x.rep)?.rep;
    report = rel(writeReport(path.join(root, ".qa/studio-e2e"), `${stamp}-gate`, rows, verdict, { host: first?.host, groups: first?.groups, ms, shards: shards.map((x) => ({ shard: `${x.k}/${plan.n}`, report: x.md ?? null, exit: x.r.code, ms: x.r.ms })), viteErrors: union(shards.map((x) => x.rep?.viteErrors ?? [])), viteErrorDetails: shards.flatMap((x) => x.rep?.viteErrorDetails ?? []).filter((entry, index, all) => all.findIndex((other) => other.line === entry.line) === index) }).md);
  }
  const trouble = shards.filter((x) => !x.rep || x.r.code === 2).map((x) => `✗ ${plan.n > 1 ? `shard ${x.k}/${plan.n}` : "the run"}: ${x.r.killed ? `stopped at its ${Math.round(plan.cap / 60)}-min limit` : `exit ${x.r.code}`}${x.rep ? "" : ", no report"}${x.r.code === 2 ? ` — ${tail(x.r.out, /error|Error|Stopped/).slice(0, 4).join(" | ")}` : ""}`);
  const lines = e2eVerdictLines(verdict);
  const failed = trouble.length || shards.some((x) => x.r.code !== 0) || lines.fail;
  step("runtime", "Studio E2E (feature matrix)", failed ? "fail" : verdict.fixed.length ? "warn" : "pass",
    `${count("works")} works · ${count("broken")} broken${count("skip") ? ` · ${count("skip")} skipped` : ""}${report ? ` · ${report}` : ""}${plan.n > 1 ? ` · ${plan.n} shards` : ""} · ${Math.round(ms / 1000)}s`, [
      ...lines.failed,
      notRun.length ? `✗ Not run (a shard reached its ${Math.round(plan.budget / 60)}-min budget): ${notRun.length} row(s): ${brief(notRun.map((row) => row.id), 12)}` : "",
      ...lines.listed,
      ...trouble,
      ...(plan.n > 1 ? shards.map((x) => `shard ${x.k}/${plan.n}: ${x.rep?.rows?.length ?? 0} row(s) · ${Math.round(x.r.ms / 1000)}s${x.md ? ` · ${x.md}` : ""}`) : []),
    ].filter(Boolean));
  // Next plan: seconds per row of a full matrix that ran to the end.
  const ran = rows.length - notRun.length;
  if (!QUICK && !trouble.length && ran >= 20) {
    timings.e2e = { perRow: Math.round(shards.reduce((a, x) => a + x.r.ms, 0) / ran / 100) / 10, rows: rowCount, at: new Date().toISOString() };
    try { writeTimings(root, timings); } catch { /* timings are a hint */ }
  }
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
// Matrix rows that do not apply to a page: SidePanel is a desktop surface (phones use a BottomSheet), so it owes no
// mobile example (user, 2026-10-07).
const NOT_APPLICABLE = { "side-panel": ["mobile"] };
const coverage = [];
const titledEntries = (body, entries) => {
  for (const t of body.matchAll(/\btitle:\s*(["'`])((?:\\.|(?!\1).)*)\1/g)) {
    const from = t.index; const next = body.slice(from + 1).search(/\btitle:\s*["'`]/);
    const chunk = body.slice(from, next < 0 ? undefined : from + 1 + next);
    entries.push({ title: t[2], text: chunk });
  }
};
for (const page of P) {
  const entries = [];
  // A page with its own examples/pages/<page>.tsx shows only that file's `examples` array (examples/registry.ts).
  const own = path.join(root, `src/platform/examples/pages/${page}.tsx`);
  if (fs.existsSync(own)) {
    const src = fs.readFileSync(own, "utf8");
    const m = /\nexport const examples\b[^=]*=\s*(?:keepOnHotUpdate\([^,]+,\s*"examples",\s*)?\[/.exec(src);
    if (m) titledEntries(arrayAt(src, m.index + m[0].length - 1), entries);
  } else sources.forEach((src) => {
    const start = src.search(/\n(export )?const \w*[eE]xamples\w*\s*(:[^=]+)?=\s*\{/); if (start < 0) return;
    const m = new RegExp(`\\n {2}"?${page}"?:\\s*\\[`).exec(src.slice(start)); if (!m) return;
    titledEntries(arrayAt(src, start + m.index + m[0].length - 1), entries);
  });
  if (!entries.length) { coverage.push({ page, count: 0, missing: [] }); continue; }
  const missing = MATRIX.filter(([name, re]) => !NOT_APPLICABLE[page]?.includes(name) && !entries.some((e) => re.test(e.text))).map(([n]) => n);
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
if (RETRY && P.length && !RP.length && !failFast) step("visual", "Contact sheets", "skip", "no page re-run (--failed): the last run's sheets stand");
else if (!QUICK && serverUp && P.length && !failFast) {
  say("\n⑤ Screenshots to review");
  // One folder per session (backlog batch C): sessions running the gate at once no longer overwrite each other's sheets.
  const shots = path.join(root, ".platform-shots", SESSION ? String(SESSION).slice(0, 8) : "manual");
  for (const page of RP) for (const width of [1512, 390]) {
    run(process.execPath, ["tools/platform-audit/shoot.mjs", page, `--width=${width}`, `--url=${BASE}`, `--out=${shots}`], 600000);
    const sheet = path.join(shots, `${page}-${width}.png`);
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
const TRIAGE = "Fix each NEW ⚠ now, and any pre-existing one you can fix at its owner in this change (user rule 2026-10-08: fix, do not defer); only a question for the user or designer, or work too large for this change, goes to the Backlog.";
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
