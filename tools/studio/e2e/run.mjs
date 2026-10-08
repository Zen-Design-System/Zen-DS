#!/usr/bin/env node
// Zen Studio E2E harness (GĐ0 of docs/research/studio-builder-plan-2026-10-05.md): drives the Studio UI in Chromium on
// its own dev server and writes a feature matrix (works / broken per feature) to .qa/studio-e2e/<stamp>.{json,md}.
//
//   npm run studio:e2e                          every group
//   npm run studio:e2e -- --only=shell,select   some groups
//   npm run studio:e2e -- --update-baseline     record this run as the baseline (after a fix)
//   npm run studio:e2e -- --shard=2/4            the 2nd of 4 contiguous slices of the selected rows (CI, or one slice
//                                                after the other: shards in one tree share the save fixture)
//   flags: --host=<example page id> (default uploader) · --port=<n> · --rows=<id,id> · --no-retry · --headed · --keep
//          · --watch-all (the server watches the whole tree; by default it watches only the files the harness writes, so
//          a peer's edit to a Studio module never hot-updates a run mid-row)
//
// Safety: the fixture (fixtures/host-page.tsx) is only ever a DRAFT of the host page on this server; the one file the
// harness saves (src/platform/examples/e2e/StudioSaveFixture.tsx) is snapshotted first and restored byte for byte
// after the run. Any other disk change to the host page or examples/data.ts made by the harness is undone; a change
// made meanwhile by someone else is reported, never overwritten. A run that was killed (its lock file
// .qa/studio-e2e/.running-<pid>.json left behind, the process gone) is put right at the next start: its snapshot, else
// git's HEAD, restores what it had written. Exit 0 = no regression, 1 = regression, 2 = safety.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { studioApi } from "./lib/api.mjs";
import { compare, createMatrix, readBaseline, readFlaky, writeBaseline, writeReport } from "./lib/matrix.mjs";
import { startServer } from "./lib/server.mjs";
import { launchBrowser, openStudio, sleep } from "./lib/studio.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const args = process.argv.slice(2);
const flag = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const has = (name) => args.includes(`--${name}`);

const GROUPS = ["shell", "select", "inspector", "appearance", "layout", "builder", "library", "instance", "starters", "handoff", "keyboard", "structural", "data", "overlays", "drafts", "gate"];
const only = flag("only")?.split(",").map((g) => g.trim()).filter(Boolean) ?? GROUPS;
const unknown = only.filter((g) => !GROUPS.includes(g));
if (unknown.length) {
  console.error(`Unknown group(s): ${unknown.join(", ")} (have: ${GROUPS.join(", ")})`);
  process.exit(2);
}
const host = flag("host") ?? "uploader";
/** --rows=K-09,I-02: only these rows (debugging); the groups they belong to still open. */
const onlyRows = flag("rows")?.split(",").map((id) => id.trim()).filter(Boolean) ?? null;
const hostFile = `src/platform/examples/pages/${host}.tsx`;
const saveFile = "src/platform/examples/e2e/StudioSaveFixture.tsx";
const dataFile = "src/platform/examples/data.ts";
const ROW_TIMEOUT = 20_000;
/** --shard=k/n: this run's slice of the selected rows (contiguous, so a shard opens few groups). */
const shard = (() => {
  const value = flag("shard");
  if (value === undefined) return null;
  const match = /^(\d+)\/(\d+)$/.exec(value);
  const [k, n] = match ? [Number(match[1]), Number(match[2])] : [0, 0];
  if (!match || n < 1 || k < 1 || k > n) {
    console.error(`--shard takes k/n with 1 ≤ k ≤ n (got ${value})`);
    process.exit(2);
  }
  return { k, n };
})();

const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const fixtureSource = read("tools/studio/e2e/fixtures/host-page.tsx").replaceAll("__HOST_PAGE__", host);
let seed = 0;
const fixtureText = () => fixtureSource.replace("__SEED__", String(seed));

if (!fs.existsSync(path.join(root, hostFile))) {
  console.error(`No host page ${hostFile}`);
  process.exit(2);
}

/* ── safety snapshot ─────────────────────────────────────────────────────────────────────────────────────────────── */
const guarded = [hostFile, saveFile, dataFile];
const stamp = `${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}${shard ? `-shard${shard.k}of${shard.n}` : ""}`;
const outDir = path.join(root, ".qa/studio-e2e");
fs.mkdirSync(outDir, { recursive: true });

/** Whether a process id still runs (a lock of a live run, maybe another shard, is left alone). */
const alive = (pid) => {
  try { process.kill(pid, 0); return true; } catch (error) { return error?.code === "EPERM"; }
};
/** What git's HEAD holds for `rel` (null: no git, or not tracked). */
const fromGit = (rel) => {
  const run = spawnSync("git", ["show", `HEAD:${rel}`], { cwd: root, encoding: "utf8" });
  return run.status === 0 ? run.stdout : null;
};
/**
 * A killed run never reached its finally: its lock names the snapshot it took. What it wrote (the save fixture always;
 * the host page or data.ts while they hold fixture text) goes back to that snapshot, else to git's HEAD.
 */
function recoverKilledRuns() {
  for (const name of fs.readdirSync(outDir).filter((entry) => /^\.running-\d+\.json$/.test(entry))) {
    let lock = null;
    try { lock = JSON.parse(fs.readFileSync(path.join(outDir, name), "utf8")); } catch { lock = null; }
    if (lock && Number.isInteger(lock.pid) && alive(lock.pid)) continue;
    for (const rel of lock?.guarded ?? guarded) {
      const now = read(rel);
      if (rel !== saveFile && !now.includes("Zen Studio E2E fixture")) continue;
      const kept = lock?.snapshot ? path.join(outDir, lock.snapshot, rel.replace(/\//g, "__")) : null;
      const before = kept && fs.existsSync(kept) ? fs.readFileSync(kept, "utf8") : fromGit(rel);
      if (before === null || before === now) continue;
      fs.writeFileSync(path.join(root, rel), before);
      console.log(`  restored ${rel} (left by a run that was stopped: ${kept && fs.existsSync(kept) ? lock.snapshot : "git HEAD"})`);
    }
    fs.rmSync(path.join(outDir, name), { force: true });
  }
}
recoverKilledRuns();
const snapshot = new Map(guarded.map((rel) => [rel, read(rel)]));
const lockFile = path.join(outDir, `.running-${process.pid}.json`);
// Keep the artefacts (report, screenshots, snapshot) of the 10 latest runs.
if (fs.existsSync(outDir)) {
  const stamps = [...new Set(fs.readdirSync(outDir).filter((name) => !name.startsWith(".")).map((name) => name.replace(/^snapshot-/, "").replace(/\.(json|md)$/, "")))].sort().reverse();
  for (const old of stamps.slice(10)) for (const name of [old, `snapshot-${old}`, `${old}.json`, `${old}.md`]) fs.rmSync(path.join(outDir, name), { recursive: true, force: true });
}
fs.mkdirSync(path.join(outDir, `snapshot-${stamp}`), { recursive: true });
for (const [rel, text] of snapshot) fs.writeFileSync(path.join(outDir, `snapshot-${stamp}`, rel.replace(/\//g, "__")), text);
fs.writeFileSync(lockFile, JSON.stringify({ pid: process.pid, snapshot: `snapshot-${stamp}`, guarded, started: new Date().toISOString() }));

/** Puts back what the harness may have written; returns notes about changes it must not touch. */
function restoreDisk() {
  const notes = [];
  for (const [rel, before] of snapshot) {
    const now = read(rel);
    if (now === before) continue;
    // Written by the harness: the save fixture always; the others only when they now hold fixture text.
    const ours = rel === saveFile || now.includes("Zen Studio E2E fixture");
    if (ours) {
      const abs = path.join(root, rel);
      const temp = `${abs}.e2e-restore-${process.pid}`;
      fs.writeFileSync(temp, before);
      fs.renameSync(temp, abs);
      notes.push(`restored ${rel}`);
    } else notes.push(`! ${rel} changed during the run by someone else — left as it is`);
  }
  return notes;
}

/* ── run ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const started = Date.now();
const matrix = createMatrix();
let server = null;
let browser = null;
let exitCode = 0;

try {
  console.log(`Zen Studio E2E · host page ${host} · groups ${only.join(", ")}`);
  // Only the files the harness writes are watched (unless --watch-all): the run keeps the code it started with.
  server = await startServer(root, { port: flag("port") ? Number(flag("port")) : undefined, ...(has("watch-all") ? {} : { watchOnly: guarded }) });
  console.log(`  server ${server.url}`);
  const api = studioApi(server.url);
  await api.ping();
  browser = await launchBrowser({ headed: has("headed") });

  /**
   * Every other draft dropped, the fixture seeded again as the host page's draft — in ONE write to the host page
   * (a discard followed at once by a write once left Vite serving the old text; row D-04 watches for it).
   */
  async function reseed() {
    const others = (await api.drafts()).drafts.map((row) => row.file).filter((file) => file !== hostFile);
    if (others.length) await api.discard(others);
    seed += 1;
    await api.put(hostFile, fixtureText());
    return seed;
  }

  const modules = new Map();
  for (const group of only) modules.set(group, await import(pathToFileURL(path.join(here, "scenarios", `${group}.mjs`)).href));
  // A shard runs its contiguous slice of the selected rows (sizes differ by one at most); a group without rows in it is
  // not opened.
  const selected = only.flatMap((group) => modules.get(group).rows.filter((row) => !onlyRows || onlyRows.includes(row.id)).map((row) => row.id));
  const inShard = shard ? new Set(selected.slice(Math.floor(((shard.k - 1) * selected.length) / shard.n), Math.floor((shard.k * selected.length) / shard.n))) : null;
  if (shard) console.log(`  shard ${shard.k}/${shard.n}: ${inShard.size} of ${selected.length} rows`);
  for (const group of only) {
    const mod = modules.get(group);
    if (inShard && !mod.rows.some((row) => inShard.has(row.id))) continue;
    console.log(`\n${group}`);
    await reseed();
    let session = null;
    const ctx = {
      api, host, file: hostFile, saveFile, dataFile, server, browser, root, outDir, stamp,
      /** The seed of the last reseed: the canvas shows "Seed <n>" once it renders that text. */
      seed: () => seed,
      reseed,
      /** The host page's effective text (the draft). */
      text: async () => (await api.source(hostFile)).content,
      /** A Studio page for this group (opened once; `fresh` reopens it). */
      async studio({ fresh = false, ...options } = {}) {
        if (session && !fresh && !Object.keys(options).length) {
          // A builder row left the page on a local page: back to the host page and its fixture first (waiting for the
          // fixture's seed there, then reloading that page, outran the next row's time limit).
          const shown = (() => { try { return new URL(session.page.url()).searchParams.get("page"); } catch { return null; } })();
          if (shown !== host) {
            await session.page.goto(`${server.url}/studio.html?page=${host}`, { waitUntil: "domcontentloaded" }).catch(() => undefined);
            await session.page.waitForSelector('[data-studio-frame="example:0"]', { timeout: 30_000 }).catch(() => undefined);
          }
          return session;
        }
        if (session) await session.context.close();
        session = await openStudio(browser, { url: server.url, page: host, ...options });
        await sleep(300);
        return session;
      },
    };
    // Open the Studio before the rows, outside their time limit: the first load of a server compiles the whole app.
    let openError = null;
    for (let tries = 0; tries < 2 && !openError; tries += 1) {
      try {
        await ctx.studio({ fresh: tries > 0 });
        break;
      } catch (error) {
        // A peer's edit can leave the app briefly broken while it hot-updates: wait and try once more.
        if (tries === 0) { await sleep(5000); continue; }
        openError = `the Studio did not open: ${String(error?.message ?? error).split("\n")[0]}`;
      }
    }
    for (const row of mod.rows) {
      if ((onlyRows && !onlyRows.includes(row.id)) || (inShard && !inShard.has(row.id))) continue;
      if (openError) {
        matrix.add({ id: row.id, group, feature: row.feature, wp: row.wp, status: "broken", ms: 0, error: openError });
        continue;
      }
      const t0 = Date.now();
      let status = "works";
      let evidence = null;
      let error = null;
      // A row that opens another platform page first (its first load compiles it) says how long it may take.
      const limit = Number.isFinite(row.timeout) ? row.timeout : ROW_TIMEOUT;
      const attempt = () => Promise.race([
        row.run(ctx),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out after ${limit / 1000} s`)), limit)),
      ]);
      try {
        try {
          evidence = await attempt();
        } catch (first) {
          // Peers edit the same source tree, and a hot update of a Studio file mid-row can break it: one retry on a fresh
          // page. A pass on retry is marked in the evidence, so a real race still shows (--no-retry turns this off).
          if (has("no-retry")) throw first;
          await ctx.studio({ fresh: true });
          evidence = await attempt();
          evidence = `${evidence ?? ""} (passed on retry; first try: ${String(first?.message ?? first).split("\n")[0].slice(0, 80)})`;
        }
        if (evidence && typeof evidence === "object" && evidence.skip) { status = "skip"; evidence = evidence.skip; }
      } catch (caught) {
        status = "broken";
        error = String(caught?.message ?? caught).split("\n")[0];
        if (session?.page && !session.page.isClosed()) {
          const shot = path.join(outDir, stamp, `${row.id}.png`);
          fs.mkdirSync(path.dirname(shot), { recursive: true });
          await session.page.screenshot({ path: shot }).catch(() => {});
        }
      }
      matrix.add({ id: row.id, group, feature: row.feature, wp: row.wp, status, ms: Date.now() - t0, evidence: evidence ?? undefined, error: error ?? undefined });
    }
    if (session) await session.context.close();
  }
  await api.discard().catch(() => {});
} catch (error) {
  console.error(`\nHarness error: ${error?.stack ?? error}`);
  exitCode = 2;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server && !has("keep")) await server.close().catch(() => {});
  const notes = restoreDisk();
  for (const note of notes) console.log(`  ${note}`);
  fs.rmSync(lockFile, { force: true });
  if (notes.some((note) => note.startsWith("!"))) exitCode = Math.max(exitCode, 0);
}

const baselineFile = path.join(here, "matrix.baseline.json");
const baseline = readBaseline(baselineFile);
const verdict = compare(matrix.rows, baseline, readFlaky(baselineFile));
const ms = Date.now() - started;
const report = writeReport(outDir, stamp, matrix.rows, verdict, { host, groups: only, ms, ...(shard ? { shard: `${shard.k}/${shard.n}` } : {}), viteErrors: [...new Set(server?.errors ?? [])] });
if (has("update-baseline")) writeBaseline(baselineFile, matrix.rows, baseline);

const count = (status) => matrix.rows.filter((row) => row.status === status).length;
if (server?.errors?.length) {
  const unique = [...new Set(server.errors)];
  console.log(`\nVite errors during the run (${server.errors.length}, ${unique.length} distinct):`);
  for (const line of unique.slice(0, 6)) console.log(`  ${line.slice(0, 200)}`);
}
console.log(`\n${count("works")} works · ${count("broken")} broken · ${count("skip")} skipped · ${Math.round(ms / 1000)} s`);
if (verdict.regressions.length) console.log(`✗ Regressions (worked in the baseline): ${verdict.regressions.map((r) => r.id).join(", ")}`);
if (verdict.fixed.length) console.log(`✓ Fixed since the baseline (run with --update-baseline to record): ${verdict.fixed.map((r) => r.id).join(", ")}`);
if (verdict.fresh.length && !has("update-baseline")) console.log(`  New rows (not in the baseline): ${verdict.fresh.map((r) => r.id).join(", ")}`);
console.log(`Report: ${path.relative(root, report.md)}`);
if (exitCode === 0 && verdict.regressions.length) exitCode = 1;
process.exit(exitCode);
