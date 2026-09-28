#!/usr/bin/env node
/**
 * Zen Build-QA gate — run it after building or changing a component, playground or example, and before delivering.
 *
 *   npm run qa                        scope = files this Claude session edited since its last passing full run
 *                                     (ledger written by the PostToolUse hook; session from $CLAUDE_CODE_SESSION_ID)
 *   npm run qa -- --pages=card,chip   add pages          --files=src/a.css,src/b.tsx   add files
 *   npm run qa -- --all               every platform page (slow; for core components, tokens and shell changes)
 *   npm run qa -- --since=90          add every UI file modified in the last 90 minutes (or --since=<ISO time>)
 *   npm run qa -- --quick             fast loop while building: static gates + audit at 1512 (never counts as a pass)
 *
 * ① Static     tsc · style-guard (spacing/radius/type/colour/shadow tokens) · usage-guard · selftests · guidelines
 *              · figma-contract (when components changed) · tokens/styles checks (when styles changed)
 * ② Runtime    audit --smoke --quality --density at 1512 + 390 (text styles, hierarchy, token scale, concentric
 *              corners, Comfortable fit, edges, overflow…) and --dark at 1512
 * ③ Behaviour  focus ring, keyboard reach, APG keys (tabs, menus, dialogs…), dead clicks, hover feedback
 * ④ Coverage   the example matrix per page (states, edge cases, mobile, keyboard/a11y, composition)
 * ⑤ Visual     1512 + 390 contact sheets to LOOK at, with the UX rubric in skills/zen-build-qa/SKILL.md
 *
 * Writes .qa/reports/<stamp>.md/.json and updates .qa/sessions/<session>.json (read by the Stop hook).
 * Exit 0 = pass · 1 = findings to fix · 2 = the gate could not run (dev server down, crash).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { allPages, dirtyFiles, pagesForEdit, readLedger, uiKind, writeLedger } from "./lib.mjs";
import { checkFiles } from "../style-guard/check-styles.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const opt = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const flag = (name) => argv.includes(`--${name}`);
const list = (v) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const BASE = (opt("url") ?? "http://localhost:5173").replace(/\/$/, "");
const QUICK = flag("quick");
const SESSION = opt("session") ?? process.env.CLAUDE_CODE_SESSION_ID ?? null;
const started = Date.now();
const stamp = new Date(started).toISOString().replace(/[:.]/g, "-").slice(0, 19);
const runDir = path.join(root, ".qa", "runs", `${stamp}${SESSION ? `-${SESSION.slice(0, 8)}` : ""}`);
fs.mkdirSync(runDir, { recursive: true });
const rel = (f) => path.relative(root, path.resolve(root, f)).split(path.sep).join("/");
const say = (s) => process.stdout.write(`${s}\n`);

/* ── scope ──────────────────────────────────────────────────────────────────────────────────────────────────────── */
const PAGES = allPages(root);
const ledger = SESSION ? readLedger(root, SESSION) : { files: {}, runs: [] };
// --since=<minutes | ISO time>: every UI file modified since then (edits made outside the hooks — scripts, other tools —
// and, in a shared tree, other sessions' edits too).
const since = opt("since") ? (/^\d+$/.test(opt("since")) ? started - Number(opt("since")) * 60000 : Date.parse(opt("since"))) : null;
const recent = since ? ["src/components", "src/platform", "src/templates", "src/styles", "src/foundations"].flatMap((d) => fs.readdirSync(path.join(root, d), { recursive: true }).map((f) => `${d}/${String(f).split(path.sep).join("/")}`))
  .filter((f) => uiKind(f) && fs.statSync(path.join(root, f)).mtimeMs >= since) : [];
const files = [...new Set([...(SESSION ? dirtyFiles(ledger, root) : []), ...list(opt("files")).map(rel), ...recent])].filter((f) => fs.existsSync(path.join(root, f)));
const notes = [];
if (since && !recent.length) notes.push(`no UI file changed since ${new Date(since).toLocaleString("en-GB")}`);
const pages = new Set(list(opt("pages")));
for (const f of files) {
  const hinted = ledger.files?.[f]?.pages;
  const found = hinted?.length ? { pages: hinted, notes: ledger.files[f].notes ?? [] } : pagesForEdit(root, f, [], PAGES);
  found.pages.forEach((p) => pages.add(p)); found.notes.forEach((n) => notes.includes(n) || notes.push(n));
}
if (flag("all")) PAGES.forEach((p) => pages.add(p));
for (const p of pages) if (!PAGES.includes(p)) { notes.push(`unknown page "${p}" ignored`); pages.delete(p); }
const uiFiles = files.filter((f) => uiKind(f));
if (!files.length && !pages.size) {
  say(SESSION ? "Nothing to check: this session has no UI edits recorded since its last passing run (edits are recorded by the PostToolUse hook). Pass --pages=…, --files=… or --since=<minutes> to check something else." : "Nothing to check: pass --pages=…, --files=… or --since=<minutes> (or run inside a Claude session that edited UI files).");
  process.exit(0);
}
const P = [...pages];
say(`Zen Build-QA gate${QUICK ? " (quick)" : ""} — ${SESSION ? `session ${SESSION.slice(0, 8)}` : "manual"} · ${files.length} file(s) · pages: ${P.join(", ") || "(none)"}`);
for (const n of notes) say(`  note: ${n}`);

/* ── helpers ────────────────────────────────────────────────────────────────────────────────────────────────────── */
const steps = []; // { group, name, status: "pass"|"fail"|"warn"|"skip", detail, items: [] }
const run = (cmd, args, timeoutMs = 600000) => { const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout: timeoutMs, env: { ...process.env, FORCE_COLOR: "0" } }); return { code: r.status ?? (r.error ? 2 : 1), out: `${r.stdout ?? ""}${r.stderr ?? ""}`, error: r.error }; };
const step = (group, name, status, detail = "", items = []) => { steps.push({ group, name, status, detail, items }); say(`  ${{ pass: "✓", fail: "✗", warn: "⚠", skip: "–" }[status]} ${name}${detail ? ` — ${detail}` : ""}`); for (const i of items.slice(0, 15)) say(`      ${i}`); if (items.length > 15) say(`      … ${items.length - 15} more (see the report)`); };
const tail = (out, re = /✗|error|Error/) => out.split("\n").filter((l) => re.test(l)).slice(0, 40).map((l) => l.trim());

/* ── ① static ───────────────────────────────────────────────────────────────────────────────────────────────────── */
say("\n① Static gates");
{
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
    targets.length ? [`${errs.length} new error(s), ${warns.length} new warning(s)`, debtHere.length ? `${debtHere.length} old finding(s) on the lines you changed — fix them now` : "", debtElsewhere ? `${debtElsewhere} old finding(s) elsewhere in the touched files (baseline)` : "", debtUnknown ? `${debtUnknown} old finding(s) in files whose edited lines are unknown (--files/--since/Bash; baseline — fix any on lines you touched)` : ""].filter(Boolean).join("; ") : "no UI files in scope",
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
for (const [name, script] of [["Usage-guard self-test", "tools/usage-guard/selftest.mjs"], ["Style-guard self-test", "tools/style-guard/selftest.mjs"]]) {
  const r = run(process.execPath, [script]);
  step("static", name, r.code === 0 ? "pass" : "fail", "", r.code === 0 ? [] : tail(r.out, /✗/));
}
{
  const r = run(process.execPath, ["tools/usage-guard/build-guidelines.mjs", "--check"]);
  step("static", "Guidelines + props docs in sync", r.code === 0 ? "pass" : "fail", r.code === 0 ? "" : "run npm run guidelines:build", r.code === 0 ? [] : tail(r.out, /./).slice(0, 10));
}
if (files.some((f) => /^src\/components\//.test(f)) && !QUICK) {
  const r = run(process.execPath, ["tools/figma-contract/run-all.mjs"], 900000);
  step("static", "Figma contracts", r.code === 0 ? "pass" : "fail", r.code === 0 ? "" : "a component no longer matches its Figma contract", r.code === 0 ? [] : tail(r.out, /✗|FAIL|mismatch/i));
} else step("static", "Figma contracts", "skip", QUICK ? "quick run" : "no component files in scope");
if (files.some((f) => /^src\/components\//.test(f)) && !QUICK && fs.existsSync(path.join(root, "node_modules/.bin/vitest"))) {
  // Browser tests: every component renders, the axe baseline holds, size spellings and interactions still work.
  const r = run("npx", ["vitest", "run", "--reporter=dot"], 900000);
  step("static", "Browser tests (Vitest: smoke + axe baseline + interactions)", r.code === 0 ? "pass" : "fail", r.code === 0 ? "" : "npm test fails (after a deliberate a11y fix: ZEN_UPDATE_AXE=1 npm test -- tests/smoke)", r.code === 0 ? [] : tail(r.out, /FAIL|×|AssertionError|expected|Error:/));
}
if (files.some((f) => /^src\/(styles|tokens)\//.test(f))) {
  for (const s of ["tokens:check", "styles:check"]) { const r = run("npm", ["run", "-s", s]); step("static", s, r.code === 0 ? "pass" : "fail", "", r.code === 0 ? [] : tail(r.out, /./).slice(0, 10)); }
}

/* ── ② runtime + ③ behaviour ─────────────────────────────────────────────────────────────────────────────────── */
const serverUp = await fetch(BASE, { signal: AbortSignal.timeout(4000) }).then((r) => r.ok).catch(() => false);
const ERROR_KINDS = new Set(["errors", "overflow", "images", "names", "nesting", "surfaces", "edges", "sizes", "typography", "device", "outline", "playground", "smoke", "scale", "hierarchy", "density", "fit"]);
const readAudit = (file) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; } };
const auditItems = (report) => { const errs = [], warns = []; for (const [key, entry] of Object.entries(report?.pages ?? {})) for (const [kind, items] of Object.entries(entry)) for (const item of items) (ERROR_KINDS.has(kind) ? errs : warns).push(`[${kind}] ${key}: ${item}`); return { errs, warns }; };
let shots = [];
if (!P.length && uiFiles.some((f) => ["component", "platform", "template"].includes(uiKind(f)))) {
  step("runtime", "Page mapping", "fail", "the edited UI files could not be mapped to a platform page, so nothing was rendered — re-run with --pages=<ids> (see the notes above)");
} else if (P.length && !serverUp) {
  step("runtime", "Dev server", "fail", `${BASE} does not answer — start it (preview_start "zen-platform", or npm run dev in Zen-DS) and re-run`);
} else if (P.length) {
  say("\n② Runtime audit");
  const main = path.join(runDir, "audit.json");
  const args = ["tools/platform-audit/audit.mjs", `--url=${BASE}`, `--pages=${P.join(",")}`, `--out=${main}`, "--quality"];
  if (QUICK) args.push("--viewports=1512", "--no-playground"); else args.push("--viewports=1512,390", "--smoke", "--density");
  const r = run(process.execPath, args, 1800000);
  const report = readAudit(main);
  if (!report) step("runtime", "Platform audit", "fail", `audit crashed (exit ${r.code})`, tail(r.out, /./).slice(-12));
  else { const { errs, warns } = auditItems(report); const known = Object.values(report.baselined ?? {}).flatMap((k) => Object.values(k)).flat().length; step("runtime", `Platform audit ${QUICK ? "1512" : "1512 + 390 · smoke · quality · density"}`, errs.length ? "fail" : warns.length ? "warn" : "pass", `${errs.length} error(s), ${warns.length} warning(s)${known ? `, ${known} baseline` : ""}`, [...errs, ...warns.map((w) => `⚠ ${w}`)]); }
  if (!QUICK) {
    const dark = path.join(runDir, "audit-dark.json");
    const d = run(process.execPath, ["tools/platform-audit/audit.mjs", `--url=${BASE}`, `--pages=${P.join(",")}`, "--viewports=1512", "--dark", "--no-playground", "--quality", `--out=${dark}`], 1800000);
    const dr = readAudit(dark);
    if (!dr) step("runtime", "Dark mode audit", "fail", `audit crashed (exit ${d.code})`, tail(d.out, /./).slice(-8));
    else { const { errs, warns } = auditItems(dr); step("runtime", "Dark mode audit", errs.length ? "fail" : warns.length ? "warn" : "pass", `${errs.length} error(s), ${warns.length} warning(s)`, [...errs, ...warns.map((w) => `⚠ ${w}`)]); }

    say("\n③ Behaviour");
    const script = path.join(root, "tools/platform-audit/behaviour.mjs");
    if (!fs.existsSync(script)) step("behaviour", "Behaviour probes", "skip", "tools/platform-audit/behaviour.mjs is not installed yet");
    else {
      const out = path.join(runDir, "behaviour.json");
      const b = run(process.execPath, [script, `--url=${BASE}`, `--pages=${P.join(",")}`, `--out=${out}`], 1800000);
      const br = readAudit(out);
      if (!br) step("behaviour", "Behaviour probes", b.code === 0 ? "pass" : "fail", b.code === 0 ? "" : `crashed (exit ${b.code})`, tail(b.out, /./).slice(-8));
      else {
        const all = Object.entries(br.pages ?? {}).flatMap(([key, fs_]) => (fs_ ?? []).map((f) => ({ ...f, key })));
        const fresh = all.filter((f) => f.new !== false); const errs = fresh.filter((f) => f.severity === "error"); const warns = fresh.filter((f) => f.severity !== "error");
        step("behaviour", "Focus ring · keyboard reach · APG keys · dead clicks · hover", errs.length ? "fail" : warns.length ? "warn" : "pass", `${errs.length} error(s), ${warns.length} warning(s), ${all.length - fresh.length} baseline`, [...errs, ...warns].map((f) => `${f.severity === "error" ? "✗" : "⚠"} [${f.check}] ${f.key} ${f.card ? `${f.card}: ` : ""}${f.message}`));
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
for (const c of coverage) step("coverage", `${c.page}: ${c.count} example(s)`, c.count === 0 ? "skip" : c.count < 4 || c.missing.length ? "warn" : "pass", c.count === 0 ? "no example map entry (playground-only page?)" : [c.count < 4 ? "fewer than 4 examples" : "", c.missing.length ? `not covered: ${c.missing.join(", ")} — add examples or note why they do not apply` : ""].filter(Boolean).join(" · "));

/* ── ⑤ screenshots ──────────────────────────────────────────────────────────────────────────────────────────────── */
if (!QUICK && serverUp && P.length) {
  say("\n⑤ Screenshots to review");
  for (const page of P) for (const width of [1512, 390]) {
    run(process.execPath, ["tools/platform-audit/shoot.mjs", page, `--width=${width}`, `--url=${BASE}`], 600000);
    const sheet = path.join(root, ".platform-shots", `${page}-${width}.png`);
    if (fs.existsSync(sheet) && fs.statSync(sheet).mtimeMs >= started) shots.push(sheet);
  }
  step("visual", "Contact sheets (open every one and review with the UX rubric)", shots.length ? "pass" : "warn", `${shots.length} image(s)`, shots.map((s) => rel(s)));
}

/* ── verdict, report, ledger ────────────────────────────────────────────────────────────────────────────────────── */
const failed = steps.filter((s) => s.status === "fail");
const warned = steps.filter((s) => s.status === "warn");
const couldNotRun = steps.some((s) => s.name === "Dev server" && s.status === "fail");
const ok = failed.length === 0;
const full = !QUICK && serverUp;
const finished = Date.now();
const icon = { pass: "✓", fail: "✗", warn: "⚠", skip: "–" };
const md = [
  `# Build-QA ${ok ? (full ? "PASS" : "PASS (quick — not a delivery pass)") : "FAIL"} — ${new Date(started).toLocaleString("en-GB")}`,
  "",
  `- Session: ${SESSION ?? "manual"} · duration ${Math.round((finished - started) / 1000)}s`,
  `- Files (${files.length}): ${files.map((f) => `\`${f}\``).join(", ") || "—"}`,
  `- Pages: ${P.join(", ") || "—"}`,
  ...notes.map((n) => `- Note: ${n}`),
  "",
  ...["static", "runtime", "behaviour", "coverage", "visual"].flatMap((g) => { const s = steps.filter((x) => x.group === g); return s.length ? [`## ${g[0].toUpperCase()}${g.slice(1)}`, "", ...s.flatMap((x) => [`- ${icon[x.status]} **${x.name}**${x.detail ? ` — ${x.detail}` : ""}`, ...x.items.slice(0, 60).map((i) => `  - ${i}`)]), ""] : []; }),
  "## Tóm tắt để báo cáo (deliver)",
  "",
  `QA gate: **${ok ? "PASS" : "FAIL"}**${full ? "" : " (chưa đủ: quick hoặc thiếu dev server)"} · ${P.length} trang (${P.join(", ") || "—"}) · ${files.length} file.`,
  ...steps.filter((s) => s.status !== "skip").map((s) => `- ${icon[s.status]} ${s.name}${s.detail ? ` — ${s.detail}` : ""}`),
  shots.length ? `- Ảnh đã chụp: ${shots.map((s) => `\`${rel(s)}\``).join(", ")} — phải mở xem từng ảnh và đối chiếu UX rubric trước khi deliver.` : "",
  "",
].join("\n");
const reportFile = path.join(root, ".qa", "reports", `${stamp}${SESSION ? `-${SESSION.slice(0, 8)}` : ""}.md`);
fs.mkdirSync(path.dirname(reportFile), { recursive: true });
fs.writeFileSync(reportFile, md);
fs.writeFileSync(reportFile.replace(/\.md$/, ".json"), JSON.stringify({ started, finished, ok, full, session: SESSION, files, pages: P, notes, steps, shots: shots.map(rel) }, null, 2));

if (SESSION) {
  const fresh = readLedger(root, SESSION); // re-read: the hook may have recorded edits while we ran
  fresh.runs = [...(fresh.runs ?? []), { at: started, finishedAt: finished, ok, full, pages: P, files, failed: failed.map((s) => s.name), report: rel(reportFile), shots: shots.map(rel) }].slice(-20);
  if (ok && full) for (const f of files) { const e = (fresh.files ??= {})[f] ?? (fresh.files[f] = { editedAt: 0 }); if ((e.editedAt ?? 0) <= started) e.passedAt = started; }
  writeLedger(root, SESSION, fresh);
}

say(`\n${ok ? "✓" : "✗"} Build-QA ${ok ? "PASS" : "FAIL"}${QUICK ? " (quick run: re-run without --quick before delivering)" : ""} — ${failed.length} failing step(s), ${warned.length} with warnings. Report: ${rel(reportFile)}`);
if (!ok) say("Fix every ✗ at its owner (component CSS/TSX, example, playground), then run `npm run qa` again. Pre-existing debt is in the baselines and does not fail the gate.");
if (ok && shots.length) say("Next: open every contact sheet listed above (Read the PNG), review it with the UX rubric in skills/zen-build-qa/SKILL.md, fix what you see, and include the summary from the report when you deliver.");
if (warned.length) say("Triage every ⚠: fix it, or say in the delivery why it stays.");
process.exit(couldNotRun ? 2 : ok ? 0 : 1);
