// Zen Studio Main component, M3 (spec docs/research/studio-main-component-spec-2026-10-09.md §3.6): after a library
// component's stylesheet is saved, its Figma contract suites run (tools/figma-contract/check.mjs reads the disk) and
// the checks that no longer match Figma go back to the Studio. The user's rule (2026-10-09): drift warns, the save
// stays unless the admin undoes it, and a kept drift becomes one line in docs/context/BACKLOG.md.
// tools/studio/parity.selftest.mjs checks the pure parts.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { contractSuites } from "../qa/lib.mjs";

/** The component folder of a stylesheet (src/components/Button/button.css → Button), else null. */
export const folderOf = (file) => /^src\/components\/([A-Za-z0-9]+)\/[a-z0-9-]+\.css$/.exec(file)?.[1] ?? null;

/** The contract suites that render a component folder (tools/qa/lib.mjs contractSuites). */
export function suitesFor(root, file) {
  const folder = folderOf(file);
  return folder ? contractSuites(root).filter((suite) => suite.folders.includes(folder)).map((suite) => suite.file) : [];
}

/** The checks of one suite's JSON results that fail, as rows the Studio lists. */
export function failingChecks(suite, results) {
  const rows = [];
  for (const result of results ?? []) {
    for (const check of result.checks ?? []) {
      if (check.ok) continue;
      rows.push({ suite: path.basename(suite, ".mjs"), mode: result.mode, variant: result.variant ?? {}, layer: check.layer, prop: check.prop, figma: String(check.figma ?? "").split("  [")[0], code: String(check.actual ?? check.dom ?? "") });
    }
  }
  return rows;
}

/** "Size=XSmall, Level=Primary": a Figma variant as Figma names it. */
export const variantText = (variant) => Object.entries(variant).map(([key, value]) => `${key}=${value}`).join(", ");

/** Mismatches folded across modes (light / dark / …): one row per suite, variant, layer and property. */
export function foldModes(rows) {
  const out = new Map();
  for (const row of rows) {
    const key = `${row.suite}|${variantText(row.variant)}|${row.layer}|${row.prop}`;
    const seen = out.get(key);
    if (seen) seen.modes.push(row.mode);
    else out.set(key, { ...row, modes: [row.mode] });
  }
  return [...out.values()];
}

/** Runs one suite: resolves to { suite, total, rows, error? } (never rejects). */
function runSuite(root, suite, tmp) {
  const json = path.join(tmp, `${path.basename(suite, ".mjs")}.json`);
  return new Promise((resolve) => {
    let output = "";
    const child = spawn(process.execPath, [path.join(root, "tools/figma-contract/check.mjs"), path.join(root, suite), `--json=${json}`], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", (error) => resolve({ suite, total: 0, rows: [], error: error.message }));
    child.on("close", () => {
      try {
        const results = JSON.parse(fs.readFileSync(json, "utf8"));
        const total = results.reduce((n, result) => n + (result.checks?.length ?? 0), 0);
        resolve({ suite, total, rows: failingChecks(suite, results) });
      } catch {
        resolve({ suite, total: 0, rows: [], error: output.trim().split("\n").slice(-3).join(" ") || "the check did not finish" });
      }
    });
  });
}

/** Runs suites `concurrency` at a time; resolves to { total, failures, rows (folded across modes), errors }. */
export async function runSuites(root, suites, { concurrency = 3 } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "zen-studio-parity-"));
  const queue = [...suites];
  const done = [];
  const worker = async () => {
    for (let suite = queue.shift(); suite; suite = queue.shift()) done.push(await runSuite(root, suite, tmp));
  };
  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, suites.length) }, worker));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const rows = done.flatMap((result) => result.rows);
  return {
    total: done.reduce((n, result) => n + result.total, 0),
    failures: rows.length,
    rows: foldModes(rows),
    errors: done.filter((result) => result.error).map((result) => `${path.basename(result.suite, ".mjs")}: ${result.error}`),
  };
}

/** The one backlog line a kept drift adds (docs/context/BACKLOG.md, Open items). */
export function backlogLine({ file, rows, failures, date }) {
  const first = rows[0];
  const variants = new Set(rows.map((row) => `${row.suite}|${variantText(row.variant)}`)).size;
  const example = first ? ` e.g. ${first.suite} {${variantText(first.variant)}} ${first.layer}.${first.prop}: Figma ${first.figma}, code ${first.code}` : "";
  return `- **P2 · Figma update from the Studio (${date}):** ${file} was saved off Figma in ${failures} check(s) across ${variants} variant(s);${example}. Update the Figma component (or change the token back), then re-run its suite.`;
}

/** BACKLOG.md with `line` first under "## Open items" (appended at the end when the heading is missing). */
export function insertBacklog(text, line) {
  const heading = /^## Open items[^\n]*\n\n?/m.exec(text);
  if (!heading) return `${text.replace(/\n*$/, "\n")}\n${line}\n`;
  const at = heading.index + heading[0].length;
  return `${text.slice(0, at)}${line}\n${text.slice(at)}`;
}
