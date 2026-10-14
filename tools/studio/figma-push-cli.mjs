#!/usr/bin/env node
// CLI of tools/studio/figma-push.mjs (core rebuild Q4): a page file as the Figma JSON the Zen plugin's Import from Studio
// places. Node only (figma-push.mjs itself stays isomorphic).
//
//   node tools/studio/figma-push-cli.mjs <page.zen.tsx> [--out=<page.figma.json>]   notes go to stderr
import fs from "node:fs";
import path from "node:path";
import { figmaPackage } from "./figma-push.mjs";
import { repoMapping } from "./figma-pull.mjs";
import { NESTED_LAYERS } from "../../src/platform/studio/inspector/nestedLayers.generated.ts";

const [file] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const out = process.argv.find((arg) => arg.startsWith("--out="))?.slice(6);
if (!file) {
  console.error("usage: figma-push-cli.mjs <page.zen.tsx> [--out=<page.figma.json>]");
  process.exit(1);
}
// The page id: the file's name (a page the Studio keeps is "<id>.zen.tsx"), so importing it again updates its frame.
const id = file.split("/").pop().replace(/\.zen\.tsx$|\.tsx$/, "");
// Keys: the page's data-zen-id where it has them, else counted in order (k1, k2…): the same file, the same keys.
let counter = 0;
const { pkg, notes } = figmaPackage(fs.readFileSync(file, "utf8"), { mapping: await repoMapping(), nestedLayers: NESTED_LAYERS, page: { id }, newId: () => `k${++counter}` });
if (!pkg) {
  for (const note of notes) console.error(`error: ${note}`);
  process.exit(1);
}
// Pictures: a file of the repo (a path from the page's folder or the repo root) goes in; an upload or library key
// (zen-asset:, zen-media:) lives in the Studio's browser — export from the Studio to carry it.
for (const src of Object.keys(pkg.images ?? {})) {
  const candidates = [path.resolve(path.dirname(file), src), path.resolve(src.replace(/^\//, ""))];
  const found = /^zen-(asset|media):/.test(src) ? null : candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (found) pkg.images[src] = fs.readFileSync(found).toString("base64");
  else notes.push(`the picture ${src} is not a repo file: export the page from the Studio to carry it`);
}
const json = `${JSON.stringify(pkg, null, 2)}\n`;
if (out) fs.writeFileSync(out, json);
else process.stdout.write(json);
for (const note of notes) console.error(`note: ${note}`);
