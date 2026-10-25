#!/usr/bin/env node
// Zen Studio E2E self-test (no browser, no server): the fixtures parse, every data-e2e id a scenario names exists in a
// fixture, row ids are unique, and the baseline names no row that is gone. Runs in `npm run studio:selftest`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { e2eLocs } from "./lib/source.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const failures = [];
let passed = 0;
const ok = (label, condition) => { if (condition) passed += 1; else failures.push(label); };

const host = fs.readFileSync(path.join(here, "fixtures/host-page.tsx"), "utf8").replaceAll("__HOST_PAGE__", "uploader").replace("__SEED__", "0");
const save = fs.readFileSync(path.join(root, "src/platform/examples/e2e/StudioSaveFixture.tsx"), "utf8");
let ids = new Set();
try {
  ids = new Set([...e2eLocs(host).keys(), ...e2eLocs(save).keys()]);
  ok("fixtures parse", true);
} catch (error) {
  ok(`fixtures parse (${error.message})`, false);
}
ok("host fixture keeps the page placeholder", /export const page: PlatformPage = "__HOST_PAGE__"/.test(fs.readFileSync(path.join(here, "fixtures/host-page.tsx"), "utf8")));
ok("host fixture renders the seed marker", /Seed __SEED__/.test(fs.readFileSync(path.join(here, "fixtures/host-page.tsx"), "utf8")));

const named = /(?:\bat|freshSelect|expectSource|\bcount)\(ctx, "([\w-]+)"|(?:countOf|locOf)\([^,()]+(?:\([^)]*\))?, "([\w-]+)"/g;
const rowIds = new Map();
for (const file of fs.readdirSync(path.join(here, "scenarios")).filter((f) => f.endsWith(".mjs"))) {
  const text = fs.readFileSync(path.join(here, "scenarios", file), "utf8");
  for (const match of text.matchAll(named)) {
    const id = match[1] ?? match[2];
    ok(`${file}: data-e2e="${id}" exists in a fixture`, ids.has(id));
  }
  const mod = await import(pathToFileURL(path.join(here, "scenarios", file)).href);
  ok(`${file} exports rows`, Array.isArray(mod.rows) && mod.rows.length > 0);
  for (const row of mod.rows ?? []) {
    ok(`${row.id}: unique row id (also in ${rowIds.get(row.id)})`, !rowIds.has(row.id));
    rowIds.set(row.id, file);
    ok(`${row.id}: has a feature and a run()`, typeof row.feature === "string" && typeof row.run === "function");
  }
}

const baselineFile = path.join(here, "matrix.baseline.json");
if (fs.existsSync(baselineFile)) {
  const baseline = JSON.parse(fs.readFileSync(baselineFile, "utf8")).rows ?? {};
  for (const id of Object.keys(baseline)) ok(`baseline row ${id} still exists`, rowIds.has(id));
}

// compare() against the baseline (user, 2026-10-25): a new row that comes back broken fails like a regression; a new row
// that works, a baselined-broken row, a flaky one and a row past the --budget (skip) do not.
{
  const { compare } = await import(pathToFileURL(path.join(here, "lib/matrix.mjs")).href);
  const baseline = { "OLD-1": "works", "OLD-2": "broken", "OLD-3": "broken" };
  const v = compare([
    { id: "OLD-1", status: "broken" }, { id: "OLD-2", status: "broken" }, { id: "OLD-3", status: "works" },
    { id: "NEW-1", status: "broken" }, { id: "NEW-2", status: "works" }, { id: "NEW-3", status: "skip", notRun: true },
    { id: "FLAKY-1", status: "broken" },
  ], baseline, new Set(["FLAKY-1"]));
  const ids = (rows) => rows.map((row) => row.id).join();
  ok("compare: a new row broken is in newBroken", ids(v.newBroken) === "NEW-1");
  ok("compare: a new row that works is fresh, not newBroken", ids(v.fresh) === "NEW-1,NEW-2");
  ok("compare: a baselined-broken row stays allowed", !ids(v.regressions).includes("OLD-2") && !ids(v.newBroken).includes("OLD-2"));
  ok("compare: works → broken is still the regression", ids(v.regressions) === "OLD-1");
  ok("compare: broken → works is fixed", ids(v.fixed) === "OLD-3");
  ok("compare: a flaky row missing from the rows counts as baselined broken", ![...v.newBroken, ...v.fresh, ...v.fixed].some((row) => row.id === "FLAKY-1"));
  ok("compare: a row past the --budget is never a new-row failure", ![...v.newBroken, ...v.fresh].some((row) => row.id === "NEW-3"));
}

// The run's watcher (lib/server.mjs peerIgnore, 2026-10-08): the files the harness writes and their folders are watched,
// everything else under src/ and tools/ is not, and the rest of the tree is left to Vite's own rules.
{
  const { peerIgnore } = await import(pathToFileURL(path.join(here, "lib/server.mjs")).href);
  const ignored = peerIgnore(root, ["src/platform/examples/e2e/StudioSaveFixture.tsx", "src/platform/examples/data.ts"]);
  const at = (rel) => ignored(path.join(root, rel));
  ok("watch: the save fixture, data.ts and their folders", [at("src/platform/examples/e2e/StudioSaveFixture.tsx"), at("src/platform/examples/data.ts"), at("src/platform/examples"), at("src/platform"), at("src")].every((value) => value === false));
  ok("watch: a peer's Studio module or tool is not", at("src/platform/studio/StudioApp.tsx") && at("tools/studio/slots.mjs") && at("src/platform/examples/pages/card.tsx"));
  ok("watch: outside src/ and tools/ Vite decides", at("vite.studio.config.ts") === false && at("node_modules/.cache/zen-studio/x.json") === false);
}

if (failures.length) {
  console.log(`Studio E2E self-test: ${failures.length} failure(s), ${passed} passed`);
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`Studio E2E self-test: ${passed} checks passed (${rowIds.size} rows, ${ids.size} fixture ids)`);
