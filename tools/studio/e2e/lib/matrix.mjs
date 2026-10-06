// Zen Studio E2E: the feature matrix. Every row ends as works / broken / skip; the baseline (matrix.baseline.json) says
// what each row did last time it was accepted. works → broken is a regression (exit 1); broken → works is a fix the
// baseline should record (`--update-baseline`). Rows not in the baseline are new: reported, never a failure.
import fs from "node:fs";
import path from "node:path";

export function createMatrix() {
  const rows = [];
  return {
    rows,
    add(row) {
      rows.push(row);
      const mark = row.status === "works" ? "✓" : row.status === "broken" ? "✗" : "–";
      const detail = row.status === "works" ? row.evidence : row.error ?? row.evidence;
      console.log(`  ${mark} ${row.id.padEnd(6)} ${row.feature}${detail ? `  · ${String(detail).slice(0, 140)}` : ""}`);
    },
  };
}

export function readBaseline(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")).rows ?? {};
  } catch {
    return {};
  }
}

/** Row ids the baseline marks flaky (a race): never reported as fixed when they happen to pass. */
export function readFlaky(file) {
  try {
    return new Set(Object.keys(JSON.parse(fs.readFileSync(file, "utf8")).flaky ?? {}));
  } catch {
    return new Set();
  }
}

/** { regressions, fixed, fresh } against the baseline (id → status). */
export function compare(rows, baseline, flaky = new Set()) {
  const regressions = [];
  const fixed = [];
  const fresh = [];
  for (const row of rows) {
    if (row.status === "skip") continue;
    const before = baseline[row.id];
    if (!before) fresh.push(row);
    else if (before === "works" && row.status === "broken") regressions.push(row);
    else if (before === "broken" && row.status === "works" && !flaky.has(row.id)) fixed.push(row);
  }
  return { regressions, fixed, fresh };
}

export function writeBaseline(file, rows, previous) {
  const next = { ...previous };
  for (const row of rows) if (row.status !== "skip") next[row.id] = row.status;
  const sorted = Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })));
  // `flaky` (row id → why) is kept by hand: a flaky row stays "broken" here until its race is fixed.
  let flaky = {};
  try { flaky = JSON.parse(fs.readFileSync(file, "utf8")).flaky ?? {}; } catch { /* first baseline */ }
  for (const id of Object.keys(flaky)) sorted[id] = "broken";
  fs.writeFileSync(file, `${JSON.stringify({ note: "Zen Studio E2E baseline: row id → works | broken. Update with `npm run studio:e2e -- --update-baseline` after a fix; rows in `flaky` stay broken until their race is fixed.", rows: sorted, flaky }, null, 2)}\n`);
}

export function writeReport(dir, stamp, rows, verdict, meta) {
  fs.mkdirSync(dir, { recursive: true });
  const json = path.join(dir, `${stamp}.json`);
  const md = path.join(dir, `${stamp}.md`);
  fs.writeFileSync(json, `${JSON.stringify({ stamp, ...meta, verdict: { regressions: verdict.regressions.map((r) => r.id), fixed: verdict.fixed.map((r) => r.id), fresh: verdict.fresh.map((r) => r.id) }, rows }, null, 2)}\n`);
  const count = (status) => rows.filter((row) => row.status === status).length;
  const lines = [
    `# Zen Studio E2E — ${stamp}`,
    "",
    `${count("works")} works · ${count("broken")} broken · ${count("skip")} skipped · host page \`${meta.host}\` · ${Math.round(meta.ms / 1000)} s`,
    "",
    verdict.regressions.length ? `**Regressions:** ${verdict.regressions.map((r) => r.id).join(", ")}` : "No regressions against the baseline.",
    verdict.fixed.length ? `**Fixed since the baseline:** ${verdict.fixed.map((r) => r.id).join(", ")}` : "",
    "",
    "| Row | Area | Feature | WP | Status | Evidence |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.id} | ${row.group} | ${row.feature} | ${row.wp ?? ""} | ${row.status} | ${String(row.status === "works" ? row.evidence ?? "" : row.error ?? row.evidence ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 220)} |`),
    "",
  ].filter((line, i, all) => line !== "" || all[i - 1] !== "");
  fs.writeFileSync(md, `${lines.join("\n")}\n`);
  return { json, md };
}
