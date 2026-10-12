#!/usr/bin/env node
// Re-reads docs/figma-contracts/nested-layers.json from the live Figma file: each component set's layer names (I
// instance, F frame / slot, T text), hidden layers included, which tools/figma-contract/nested-paths.mjs checks the
// code's nest() names against where a set has no full contract or a full contract dropped hidden layers.
//
//   node tools/figma-contract/nested-layers-read.mjs code [--ids=a,b] [--per=10]   prints use_figma code, one block per part
//   node tools/figma-contract/nested-layers-read.mjs merge part1.json part2.json…  writes nested-layers.json (today's date)
//
// Read-only (use_figma on file 9nZv4uW2LT21yuHabMTCh1). Default ids: the sets already in nested-layers.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const target = path.join(root, "docs/figma-contracts/nested-layers.json");
const current = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, "utf8")) : { sets: {} };

/** The use_figma code for `ids` (answers stay ASCII: a use_figma answer is cut short by other characters). */
export function readCode(ids) {
  return `figma.skipInvisibleInstanceChildren = false;
const ids = ${JSON.stringify(ids)};
const esc = (s) => s.replace(/[^\\x20-\\x7e]/g, (c) => "\\\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
const out = {};
for (const id of ids) {
  const node = await figma.getNodeByIdAsync(id);
  if (!node) { out[id] = null; continue; }
  const variants = node.type === "COMPONENT_SET" ? node.children : [node];
  const names = {};
  for (const variant of variants) variant.findAll(() => true).forEach((n) => {
    const t = n.type === "INSTANCE" ? "I" : n.type === "TEXT" ? "T" : (n.type === "FRAME" || n.type === "SLOT") ? "F" : null;
    if (!t) return;
    const seen = names[n.name] || (names[n.name] = "");
    if (!seen.includes(t)) names[n.name] = seen + t;
  });
  out[id] = { n: node.name, v: variants.length, l: names };
}
return esc(JSON.stringify(out));`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [command, ...rest] = process.argv.slice(2);
  const option = (name) => rest.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (command === "code") {
    const ids = option("ids")?.split(",").filter(Boolean) ?? Object.keys(current.sets ?? {});
    const per = Number(option("per") ?? 10);
    for (let index = 0; index < ids.length; index += per) console.log(`// part ${index / per + 1}\n${readCode(ids.slice(index, index + per))}\n`);
  } else if (command === "merge") {
    const sets = { ...(current.sets ?? {}) };
    for (const file of rest.filter((arg) => !arg.startsWith("--"))) Object.assign(sets, JSON.parse(fs.readFileSync(file, "utf8")));
    const now = new Date();
    const captured = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    fs.writeFileSync(target, `${JSON.stringify({ ...current, captured, sets }, null, 1)}\n`);
    console.log(`wrote ${path.relative(root, target)}: ${Object.keys(sets).length} sets`);
  } else {
    console.error("usage: nested-layers-read.mjs code [--ids=a,b] [--per=10] | merge part.json…");
    process.exit(1);
  }
}
