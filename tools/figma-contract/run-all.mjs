// Runs every Figma contract suite plus the interaction checks.
//   node tools/figma-contract/run-all.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
let failed = 0;
for (const file of fs.readdirSync(path.join(here, "suites")).filter((name) => name.endsWith(".mjs") && !name.startsWith("_")).sort()) {
  const run = spawnSync(process.execPath, [path.join(here, "check.mjs"), path.join(here, "suites", file)], { encoding: "utf8" });
  const summary = run.stdout.trim().split("\n").at(-1);
  console.log(`${run.status === 0 ? "✓" : "✗"} ${summary}`);
  if (run.status !== 0) { failed += 1; console.log(run.stdout.split("\n").filter((line) => line.includes("✗")).slice(0, 8).join("\n")); }
}
const interactions = spawnSync(process.execPath, [path.join(here, "interactions.mjs")], { encoding: "utf8" });
console.log(`${interactions.status === 0 ? "✓" : "✗"} ${interactions.stdout.trim().split("\n").at(-1)}`);
if (interactions.status !== 0) failed += 1;
process.exitCode = failed ? 1 : 0;
