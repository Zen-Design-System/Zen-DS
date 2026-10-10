// Self-test of tools/studio/parity.mjs (Main component M3): run with `node tools/studio/parity.selftest.mjs`.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { backlogLine, failingChecks, foldModes, folderOf, insertBacklog, suitesFor, variantText } from "./parity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let failed = 0;
const ok = (name, value) => { if (!value) { failed += 1; console.log(`✗ ${name}`); } };

ok("folder of a component stylesheet", folderOf("src/components/Button/button.css") === "Button" && folderOf("src/styles/tokens.css") === null);
const suites = suitesFor(root, "src/components/Button/button.css");
ok(`Button's suites (${suites.length})`, suites.includes("tools/figma-contract/suites/button-main.mjs") && suites.every((file) => file.startsWith("tools/figma-contract/suites/")));
ok("no suites for a stylesheet outside the components", suitesFor(root, "src/styles/tokens.css").length === 0);

const results = [
  { mode: "light/neutral-s1", variant: { Size: "XSmall", Level: "Primary", State: "Default" }, checks: [{ layer: "Container", prop: "h", figma: 24, actual: 32, ok: false }, { layer: "Container", prop: "w", figma: 80, actual: 80, ok: true }] },
  { mode: "dark/neutral-s1", variant: { Size: "XSmall", Level: "Primary", State: "Default" }, checks: [{ layer: "Container", prop: "h", figma: 24, actual: 32, ok: false }] },
  { mode: "light/neutral-s1", variant: { Size: "XSmall", Level: "Accent", State: "Default" }, checks: [{ layer: "Container", prop: "fill", figma: "rgb(1, 2, 3)  [Accent]", actual: "rgb(4, 5, 6)", ok: false }] },
];
const rows = failingChecks("tools/figma-contract/suites/button-main.mjs", results);
ok("failing checks only", rows.length === 3 && rows.every((row) => row.suite === "button-main"));
ok("Figma value without its token note", rows[2].figma === "rgb(1, 2, 3)");
const folded = foldModes(rows);
ok("modes folded", folded.length === 2 && folded[0].modes.join(",") === "light/neutral-s1,dark/neutral-s1");
ok("variant text", variantText({ Size: "XSmall", Level: "Primary" }) === "Size=XSmall, Level=Primary");

const line = backlogLine({ file: "src/components/Button/button.css", rows: folded, failures: 3, date: "2026-10-10" });
ok("backlog line", line.startsWith("- **P2 · Figma update from the Studio (2026-10-10):** src/components/Button/button.css was saved off Figma in 3 check(s) across 2 variant(s); e.g. button-main {Size=XSmall, Level=Primary, State=Default} Container.h: Figma 24, code 32.") && !line.includes("\n"));
const backlog = "# Backlog\n\nIntro.\n\n## Open items\n\n- first\n\n## Backlog\n";
ok("inserted first under Open items", insertBacklog(backlog, "- new") === "# Backlog\n\nIntro.\n\n## Open items\n\n- new\n- first\n\n## Backlog\n");
ok("appended without the heading", insertBacklog("# B\n", "- new") === "# B\n\n- new\n");

console.log(failed ? `✗ parity selftest: ${failed} failed` : "✓ parity selftest");
process.exit(failed ? 1 : 0);
