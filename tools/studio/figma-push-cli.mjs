#!/usr/bin/env node
// CLI of tools/studio/figma-push.mjs (core rebuild Q4): a page file as the Figma JSON the Zen plugin's Import from Studio
// places. Node only (figma-push.mjs itself stays isomorphic).
//
//   node tools/studio/figma-push-cli.mjs <page.zen.tsx> [--out=<page.figma.json>]   notes go to stderr
import fs from "node:fs";
import { figmaFromPage } from "./figma-push.mjs";
import { repoMapping } from "./figma-pull.mjs";
import { NESTED_LAYERS } from "../../src/platform/studio/inspector/nestedLayers.generated.ts";

const [file] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const out = process.argv.find((arg) => arg.startsWith("--out="))?.slice(6);
if (!file) {
  console.error("usage: figma-push-cli.mjs <page.zen.tsx> [--out=<page.figma.json>]");
  process.exit(1);
}
const { frame, notes } = figmaFromPage(fs.readFileSync(file, "utf8"), { mapping: await repoMapping(), nestedLayers: NESTED_LAYERS });
if (!frame) {
  for (const note of notes) console.error(`error: ${note}`);
  process.exit(1);
}
const json = `${JSON.stringify({ format: "zen-studio-figma", version: 1, frame }, null, 2)}\n`;
if (out) fs.writeFileSync(out, json);
else process.stdout.write(json);
for (const note of notes) console.error(`note: ${note}`);
