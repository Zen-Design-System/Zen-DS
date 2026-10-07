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

if (failures.length) {
  console.log(`Studio E2E self-test: ${failures.length} failure(s), ${passed} passed`);
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`Studio E2E self-test: ${passed} checks passed (${rowIds.size} rows, ${ids.size} fixture ids)`);
