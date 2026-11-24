// vue-tsc for the Vue port's checks (vue-check.mjs). It runs on TypeScript 5 (the `typescript5` alias): vue-tsc drives
// TypeScript's JS API, which TypeScript 7 no longer ships.
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Type-checks a tsconfig project with vue-tsc: `{ ok, output }`. */
export function vueTsc(project) {
  const run = spawnSync(process.execPath, ["-e", `process.argv = [process.argv[0], "vue-tsc", "-p", ${JSON.stringify(project)}]; require("vue-tsc").run(require.resolve("typescript5/lib/tsc"));`], { cwd: root, encoding: "utf8" });
  return { ok: run.status === 0, output: `${run.stdout}${run.stderr}`.trim() };
}
