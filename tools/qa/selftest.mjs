#!/usr/bin/env node
// Build-QA gate self-test (no browser, no server): the shard plans of the runtime jobs and the Studio E2E (lib.mjs).
// Runs in `npm run qa:selftest`, and in the gate when tools/qa is in scope.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { E2E_ROW_SECONDS, SHARD_TARGET_S, auxKind, e2eRowSeconds, e2eVerdictLines, pageEstimator, pageSeconds, planE2E, planShards, readTimings, retryPagesFrom, shardCapS, writeTimings } from "./lib.mjs";

const failures = [];
let passed = 0;
const ok = (label, condition) => { if (condition) passed += 1; else failures.push(label); };
const pages = (n) => Array.from({ length: n }, (_, i) => `p${i}`);

// planShards: about SHARD_TARGET_S each, every item once, input order kept inside a shard, the heaviest shard first.
{
  const items = pages(59);
  const plan = planShards(items, () => 150);
  ok("59 pages × 150 s → shards of ≤ 10 min", plan.length === Math.ceil((59 * 150) / SHARD_TARGET_S) && plan.every((s) => s.seconds <= SHARD_TARGET_S));
  ok("every page in exactly one shard", plan.flatMap((s) => s.items).sort().join() === [...items].sort().join());
  ok("a shard keeps the page order", plan.every((s) => s.items.every((p, i) => i === 0 || items.indexOf(s.items[i - 1]) < items.indexOf(p))));
  ok("the heaviest shard first", plan.every((s, i) => i === 0 || plan[i - 1].seconds >= s.seconds));
}
{
  // A heavy page (app-shell, 41 screens) gets a shard of its own; the light ones share.
  const est = (p) => (p === "app-shell" ? 900 : 20);
  const plan = planShards(["button", "app-shell", "card", "chip"], est);
  ok("a page over the target runs alone", plan[0].items.join() === "app-shell" && plan.length === 2 && plan[1].items.join() === "button,card,chip");
}
ok("min shards when the work is small", planShards(pages(9), () => 5, { min: 2 }).length === 2);
ok("never more shards than pages", planShards(pages(2), () => 5000).length === 2);
ok("no pages, no shards", planShards([], () => 10).length === 0);
ok("a bad estimate counts as 1 s", planShards(pages(3), () => Number.NaN).length === 1);

// shardCapS: 3× the plan, never under 30 min.
ok("cap: 30 min floor", shardCapS(100) === 1800);
ok("cap: 3× a long plan", shardCapS(900) === 2700);

// pageEstimator: the page's timing, else the median of the timed pages, else the fallback.
{
  const est = pageEstimator({ a: 10, b: 30, c: 200 }, 99);
  ok("estimator: a timed page", est("c") === 200);
  ok("estimator: an untimed page takes the median", est("z") === 30);
  ok("estimator: nothing timed takes the fallback", pageEstimator(undefined, 45)("x") === 45);
}

// pageSeconds: the gap before each "✓|⚠|✗ <page>@<width>" line, summed over widths; other lines are ignored.
{
  const marks = [
    [4000, "✓ button@1512                    clean"],
    [9000, "↻ card@1512: the page reloaded during the audit"],
    [10000, "✗ card@1512                      overflow:1"],
    [12500, "⚠ button@390                     fit:1"],
    [20000, "✓ card@1512-dark                 clean"],
    [21000, "✗ [overflow] card@1512: document scrolls horizontally"],
    [21500, "✓ No error-level findings across 4 page runs."],
  ];
  const s = pageSeconds(marks);
  ok("page seconds: summed over widths", s.button === 6.5 && s.card === 13.5);
  ok("page seconds: summary lines are not pages", Object.keys(s).sort().join() === "button,card");
}

// planE2E: about SHARD_TARGET_S per shard; the budget and the hard stop follow the plan.
{
  const full = planE2E(338, 4.5);
  ok("E2E: 338 rows × 4.5 s → 3 shards", full.n === 3 && full.planned < SHARD_TARGET_S + 60);
  ok("E2E: budget ≥ 30 min and 3× the plan; hard stop 10 min later", full.budget === shardCapS(full.planned) && full.cap === full.budget + 600);
  ok("E2E: a quick run is one shard", planE2E(52, 4.5).n === 1);
  ok("E2E: slower rows, more shards", planE2E(338, 9).n > full.n);
  ok("E2E: no rows still plans one shard", planE2E(0, 4.5).n === 1);
}

// Timings round-trip, and the E2E seconds per row: the gate's measure, else the newest report of 20+ rows.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "zen-qa-selftest-"));
  try {
    ok("timings: none yet", Object.keys(readTimings(root)).length === 0);
    ok("E2E per row: the default", e2eRowSeconds(root, {}) === E2E_ROW_SECONDS);
    const dir = path.join(root, ".qa", "studio-e2e");
    fs.mkdirSync(dir, { recursive: true });
    const report = (rows, ms) => JSON.stringify({ ms, rows: Array.from({ length: rows }, (_, i) => ({ id: `R-${i}` })) });
    fs.writeFileSync(path.join(dir, "2026-10-21T10-00-00.json"), report(338, 1521000));
    fs.writeFileSync(path.join(dir, "2026-10-22T10-00-00.json"), report(3, 30000));
    ok("E2E per row: the newest report of 20+ rows", e2eRowSeconds(root, {}) === 4.5);
    writeTimings(root, { e2e: { perRow: 7.2 }, audit: { card: 80 } });
    const t = readTimings(root);
    ok("timings round-trip", t.audit.card === 80);
    ok("E2E per row: the gate's measure first", e2eRowSeconds(root, t) === 7.2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// retryPagesFrom (--failed, process audit B.2): which pages a re-run audits again.
{
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "zen-qa-retry-"));
  try {
    const errorKinds = new Set(["overflow", "edges"]);
    const pagesIn = ["badge", "card", "chip", "divider"];
    const fail = [{ group: "runtime", name: "Platform audit 1512 + 390 + 320", status: "fail" }, { group: "runtime", name: "Dark mode audit", status: "pass" }];
    // The main audit: an error on card, only a warning kind on chip; divider is in no report (its shard stopped).
    fs.writeFileSync(path.join(runDir, "audit.json"), JSON.stringify({ pages: { "badge@1512": {}, "card@390": { edges: ["x"] }, "chip@1512": { contrast: ["w"] } } }));
    fs.writeFileSync(path.join(runDir, "audit-dark.json"), JSON.stringify({ pages: { "badge@1512": {}, "card@1512": {}, "chip@1512": {}, "divider@1512": {} } }));
    const redo = retryPagesFrom({ steps: fail, runDir, pages: pagesIn, errorKinds, behaviour: false });
    ok("--failed: the page with an error and the page no report saw", redo.join() === "card,divider");
    ok("--failed: browser steps that all passed re-run nothing", retryPagesFrom({ steps: [{ group: "runtime", name: "Platform audit", status: "pass" }], runDir, pages: pagesIn, errorKinds }).length === 0);
    ok("--failed: browser steps a static ✗ skipped re-run every page", retryPagesFrom({ steps: [{ group: "runtime", name: "Browser steps", status: "skip" }], runDir, pages: pagesIn, errorKinds }).join() === pagesIn.join());
    fs.writeFileSync(path.join(runDir, "behaviour.json"), JSON.stringify({ pages: { "badge@1512": [{ severity: "error" }], "card@1512": [], "chip@1512": [{ severity: "error", new: false }], "divider@1512": [] } }));
    const withBehaviour = retryPagesFrom({ steps: fail, runDir, pages: pagesIn, errorKinds, behaviour: true });
    ok("--failed: a new behaviour error re-runs its page; a baselined one does not", withBehaviour.join() === "badge,card,divider");
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
}

// The Studio E2E step's verdict (user, 2026-10-25): a new row that comes back broken fails the gate like a regression; a
// new row that works passes and is listed to record; a row the baseline marks broken stays allowed.
{
  const { compare } = await import(new URL("../studio/e2e/lib/matrix.mjs", import.meta.url).href);
  const baseline = { "OLD-1": "works", "OLD-2": "broken" };
  const verdictOf = (rows) => e2eVerdictLines(compare(rows, baseline, new Set()));
  const newBroken = verdictOf([{ id: "OLD-1", status: "works" }, { id: "NEW-1", status: "broken" }]);
  ok("E2E verdict: a new row broken fails", newBroken.fail && newBroken.failed.join() === "✗ New rows broken (not in the baseline): NEW-1");
  const newWorks = verdictOf([{ id: "OLD-1", status: "works" }, { id: "NEW-2", status: "works" }]);
  ok("E2E verdict: a new row that works passes, listed to record", !newWorks.fail && !newWorks.failed.length && /^✓ New rows that work .*--update-baseline\): NEW-2$/.test(newWorks.listed.join()));
  const knownBroken = verdictOf([{ id: "OLD-1", status: "works" }, { id: "OLD-2", status: "broken" }]);
  ok("E2E verdict: a baselined-broken row stays allowed", !knownBroken.fail && !knownBroken.failed.length && !knownBroken.listed.length);
  const regression = verdictOf([{ id: "OLD-1", status: "broken" }]);
  ok("E2E verdict: a regression still fails", regression.fail && /^✗ Regressions .*: OLD-1$/.test(regression.failed.join()));
  const budget = verdictOf([{ id: "NEW-3", status: "skip", notRun: true }]);
  ok("E2E verdict: a new row past the budget is not a new-row failure", !budget.fail && !budget.failed.length);
}

// The harness self-tests run when their folder is in scope: an edit there must count as a tool file (auxKind), or the
// step never runs (2026-10-24: tools/platform-audit was not one, so its self-test was always skipped).
{
  const source = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "run.mjs"), "utf8");
  const list = source.match(/for \(const \[name, script, dir\] of (\[\[.*?\]\])\)/)?.[1];
  const dirs = list ? JSON.parse(list).map(([, , dir]) => dir) : [];
  ok("run.mjs lists the harness self-tests", dirs.length >= 4);
  for (const dir of dirs) ok(`${dir} edits count as tool files (auxKind)`, Boolean(auxKind(`${dir}/x.mjs`)));
}

if (failures.length) {
  console.log(`QA gate self-test: ${failures.length} failure(s), ${passed} passed`);
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`QA gate self-test: ${passed} checks passed`);
