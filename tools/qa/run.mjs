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
 *   npm run qa -- --quick             fast loop while building: static gates + audit at 1512 (never counts as a pass)
 *   npm run qa -- --tokens-base=HEAD~1  diff the token files against another ref (default HEAD) for the token scope
 *
 * ① Static     tsc · style-guard (spacing/radius/type/colour/shadow tokens) · usage-guard · guidelines (stale docs of
 *              your components are regenerated) · harness self-tests (when tools/usage-guard or tools/style-guard changed)
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
import { spawnSync } from "node:child_process";
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
const BASE = (opt("url") ?? "http://localhost:5173").replace(/\/$/, "");
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
// and concentric corners (sizes). Figma suites of the consumers and tokens:check still run.
const TOKEN_ONLY = !ALL && !QUICK && Boolean(tokens && !tokens.error && tokens.changed.length && !tokens.scale.length) && uiFiles.length > 0 && uiFiles.every((f) => TOKEN_STYLE_FILES.includes(f));
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
const step = (group, name, status, detail = "", items = []) => { steps.push({ group, name, status, detail, items }); say(`  ${{ pass: "✓", fail: "✗", warn: "⚠", skip: "–" }[status]} ${name}${detail ? ` — ${detail}` : ""}`); for (const i of items.slice(0, 15)) say(`      ${i}`); if (items.length > 15) say(`      … ${items.length - 15} more (see the report)`); };
const tail = (out, re = /✗|error|Error/) => out.split("\n").filter((l) => re.test(l)).slice(0, 40).map((l) => l.trim());
const compFolders = new Set(files.map((f) => f.match(/^src\/components\/([^/]+)\//)?.[1]).filter(Boolean));
const BACKLOG = "write one Backlog line (priority + pointer) in docs/context/BACKLOG.md; fix it only if that is in the approved task";

/* ── ① static ───────────────────────────────────────────────────────────────────────────────────────────────────── */
say("\n① Static gates");
if (TOKEN_ONLY) step("static", "TypeScript", "skip", "token-only change");
else {
  const r = run("npx", ["tsc", "--noEmit", "-p", "."]);
  step("static", "TypeScript", r.code === 0 ? "pass" : "fail", r.code === 0 ? "" : "type errors", r.code === 0 ? [] : tail(r.out, /error TS/));
}
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
{
  const inScope = new Set([...compFolders, ...(tokens?.folders ?? [])]);
  const everything = ALL || auxHas(/^tools\/figma-contract\//) || SHARED_LOGIC;
  if (QUICK) step("static", "Figma contracts", "skip", "quick run");
  else if (everything) {
    const r = run(process.execPath, ["tools/figma-contract/run-all.mjs"], 900000);
    step("static", "Figma contracts (all suites)", r.code === 0 ? "pass" : "fail", `${ALL ? "--all" : auxHas(/^tools\/figma-contract\//) ? "tools/figma-contract changed" : "_shared changed"}${r.code === 0 ? "" : " — a component no longer matches its Figma contract"}`, r.code === 0 ? [] : tail(r.out, /✗|FAIL|mismatch/i));
  } else {
    const all = contractSuites(root);
    const suites = all.filter((s) => s.folders.some((f) => inScope.has(f)));
    const interactions = INTERACTION_FOLDERS.some((f) => inScope.has(f));
    if (!suites.length && !interactions) step("static", "Figma contracts", "skip", inScope.size ? `no contract suite covers ${[...inScope].join(", ")}` : "no component files in scope");
    else {
      const items = []; let failed = 0;
      for (const s of suites) {
        const r = run(process.execPath, [path.join(root, "tools/figma-contract/check.mjs"), path.join(root, s.file)], 300000);
        const summary = r.out.trim().split("\n").at(-1) ?? s.file;
        if (r.code !== 0) { failed += 1; items.push(`✗ ${path.basename(s.file)}: ${summary}`, ...r.out.split("\n").filter((l) => l.includes("✗")).slice(0, 8).map((l) => `  ${l.trim()}`)); }
      }
      if (interactions) { const r = run(process.execPath, ["tools/figma-contract/interactions.mjs"], 300000); if (r.code !== 0) { failed += 1; items.push(`✗ interactions: ${r.out.trim().split("\n").at(-1)}`, ...tail(r.out, /✗/).slice(0, 8)); } }
      step("static", "Figma contracts", failed ? "fail" : "pass", `${suites.length} of ${all.length} suite(s)${interactions ? " + interactions" : ""} for ${[...inScope].join(", ")}${failed ? " — a component no longer matches its Figma contract" : ""}`, items);
    }
  }
}
// Browser tests (S5d): Vitest on the tests related to the edited component files; the full suite for tests/**, _shared, --all.
if (!QUICK && fs.existsSync(path.join(root, "node_modules/.bin/vitest"))) {
  const name = "Browser tests (Vitest: smoke + axe baseline + interactions)";
  const hint = "npm test fails (after a deliberate a11y fix: ZEN_UPDATE_AXE=1 npm test -- tests/smoke)";
  const failRe = /FAIL|×|AssertionError|expected|Error:/;
  const counted = (out) => out.replace(/\x1b\[[0-9;]*m/g, "").match(/Test Files\s+([^\n]*)/)?.[1]?.trim() ?? "";
  const full = ALL || auxHas(/^tests\//) || SHARED_LOGIC;
  const related = [...new Set([...files.filter((f) => /^src\/components\//.test(f)), ...(tokens?.consumers ?? []).map((c) => c.file).filter((f) => /^src\/components\//.test(f))])];
  if (full) {
    const r = run("npx", ["vitest", "run", "--reporter=dot"], 900000);
    step("static", name, r.code === 0 ? "pass" : "fail", `full suite (${ALL ? "--all" : auxHas(/^tests\//) ? "tests/** changed" : "_shared changed"}) · ${counted(r.out)}${r.code === 0 ? "" : ` — ${hint}`}`, r.code === 0 ? [] : tail(r.out, failRe));
  } else if (related.length) {
    let r = run("npx", ["vitest", "related", ...related, "--run", "--reporter=dot", "--passWithNoTests"], 900000);
    let how = `related to ${related.length} file(s) in scope (edited, or using a changed token)`;
    if (r.code !== 0 && !/Test Files/.test(r.out) && /unknown (command|option)|not supported|CACError/i.test(r.out)) {
      r = run("npx", ["vitest", "run", "--reporter=dot"], 900000);
      how = "vitest related is not supported here: ran the full suite";
    }
    step("static", name, r.code === 0 ? "pass" : "fail", `${how} · ${counted(r.out) || "no related test files"}${r.code === 0 ? "" : ` — ${hint}`}`, r.code === 0 ? [] : tail(r.out, failRe));
  } else step("static", name, "skip", "no component or test files in scope");
}
if (files.some((f) => /^src\/(styles|tokens)\//.test(f)) || auxHas(/^(src\/tokens|tokens\/source|styles\/source)\//)) {
  for (const s of ["tokens:check", "styles:check"]) { const r = run("npm", ["run", "-s", s]); step("static", s, r.code === 0 ? "pass" : "fail", "", r.code === 0 ? [] : tail(r.out, /./).slice(0, 10)); }
}

/* ── ② runtime + ③ behaviour ─────────────────────────────────────────────────────────────────────────────────── */
// Fail fast (S5e): a static ✗ already fails the run; the browser steps (minutes per page) wait for the fix.
const staticFailed = steps.filter((s) => s.group === "static" && s.status === "fail");
const failFast = staticFailed.length > 0 && !KEEP_GOING && P.length > 0;
const serverUp = failFast ? false : await fetch(BASE, { signal: AbortSignal.timeout(4000) }).then((r) => r.ok).catch(() => false);
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
  const main = path.join(runDir, "audit.json");
  const args = ["tools/platform-audit/audit.mjs", `--url=${BASE}`, `--pages=${P.join(",")}`, `--out=${main}`, "--quality"];
  if (QUICK) args.push("--viewports=1512", "--no-playground");
  else if (TOKEN_ONLY) args.push("--viewports=1512,390", ...(TOKEN_SIZES ? ["--density"] : []));
  else args.push("--viewports=1512,390", "--smoke", "--density");
  const r = run(process.execPath, args, 1800000);
  const report = readAudit(main);
  if (!report) step("runtime", "Platform audit", "fail", `audit crashed (exit ${r.code})`, tail(r.out, /./).slice(-12));
  else { const { errs, warns } = auditItems(report); const known = Object.values(report.baselined ?? {}).flatMap((k) => Object.values(k)).flat().length; step("runtime", `Platform audit ${QUICK ? "1512" : TOKEN_ONLY ? `1512 + 390 · quality${TOKEN_SIZES ? " · density" : ""} (token fast path)` : "1512 + 390 · smoke · quality · density"}`, errs.length ? "fail" : warns.length ? "warn" : "pass", `${errs.length} error(s), ${warns.length} new warning(s)${known ? `, ${known} baseline` : ""}`, [...errs, ...warns.map((w) => `⚠ ${w}`)]); }
  if (!QUICK) {
    const dark = path.join(runDir, "audit-dark.json");
    const d = run(process.execPath, ["tools/platform-audit/audit.mjs", `--url=${BASE}`, `--pages=${P.join(",")}`, "--viewports=1512", "--dark", "--no-playground", "--quality", `--out=${dark}`], 1800000);
    const dr = readAudit(dark);
    if (!dr) step("runtime", "Dark mode audit", "fail", `audit crashed (exit ${d.code})`, tail(d.out, /./).slice(-8));
    else { const { errs, warns } = auditItems(dr); const known = Object.values(dr.baselined ?? {}).flatMap((k) => Object.values(k)).flat().length; step("runtime", "Dark mode audit", errs.length ? "fail" : warns.length ? "warn" : "pass", `${errs.length} error(s), ${warns.length} new warning(s)${known ? `, ${known} baseline` : ""}`, [...errs, ...warns.map((w) => `⚠ ${w}`)]); }

    say("\n③ Behaviour");
    const script = path.join(root, "tools/platform-audit/behaviour.mjs");
    if (TOKEN_ONLY) step("behaviour", "Behaviour probes", "skip", "token-only change: focus, keyboard and click behaviour cannot change");
    else if (!fs.existsSync(script)) step("behaviour", "Behaviour probes", "skip", "tools/platform-audit/behaviour.mjs is not installed yet");
    else {
      const out = path.join(runDir, "behaviour.json");
      const b = run(process.execPath, [script, `--url=${BASE}`, `--pages=${P.join(",")}`, `--out=${out}`], 1800000);
      const br = readAudit(out);
      if (!br) step("behaviour", "Behaviour probes", b.code === 0 ? "pass" : "fail", b.code === 0 ? "" : `crashed (exit ${b.code})`, tail(b.out, /./).slice(-8));
      else {
        const all = Object.entries(br.pages ?? {}).flatMap(([key, fs_]) => (fs_ ?? []).map((f) => ({ ...f, key })));
        const fresh = all.filter((f) => f.new !== false); const errs = fresh.filter((f) => f.severity === "error"); const warns = fresh.filter((f) => f.severity !== "error");
        step("behaviour", "Focus ring · keyboard reach · APG keys · dead clicks · hover", errs.length ? "fail" : warns.length ? "warn" : "pass", `${errs.length} error(s), ${warns.length} new warning(s), ${all.length - fresh.length} baseline`, [...errs, ...warns].map((f) => `${f.severity === "error" ? "✗" : "⚠"} [${f.check}] ${f.key} ${f.card ? `${f.card}: ` : ""}${f.message}`));
      }
    }
  }
}

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
}
process.exit(process.exitCode ?? 0);
