#!/usr/bin/env node
// Figma's width of each Assets item dropped on the empty canvas on its own (builder/boardPaste.ts dropOnBoard; user
// 2026-10-29: "giữ đúng chiều rộng như Figma khi thả ra canvas"): Figma's loose instance is as wide as its variant,
// where the variant keeps a width (FIXED, or FILL, which a loose instance turns into FIXED); a HUG variant hugs its
// content, as the Studio's floating layer does. The variant is the one the Studio's copy for Figma picks for the item
// (figma-push.mjs, then figma-native.mjs: the item's props choose it), its width and sizing read from the library.
//
//   node tools/studio/figma-widths.mjs code                  use_figma code (read only, file 9nZv4uW2LT21yuHabMTCh1):
//                                                           the width and horizontal sizing of the items' variants
//   node tools/studio/figma-widths.mjs read --file=a.json    its answer → docs/figma-contracts/component-widths.json
//   node tools/studio/figma-widths.mjs [--check]             the read → src/platform/studio/edit/assets/figmaWidths.generated.ts
import fs from "node:fs";
import path from "node:path";
import { items, components, root } from "./dnd-engine.mjs";
import { frameCode } from "./dialect.mjs";
import { figmaPackage } from "./figma-push.mjs";
import { repoMapping } from "./figma-pull.mjs";
import { expandPack, nativeMessage } from "./figma-native.mjs";

const CONTRACT = path.join(root, "docs/figma-contracts/component-widths.json");
const OUT = path.join(root, "src/platform/studio/edit/assets/figmaWidths.generated.ts");
const FILE = "9nZv4uW2LT21yuHabMTCh1";
/** Sets whose variants are as wide as their empty slot (Card: 105): an item's content decides its width, so it hugs. */
const SLOT_WIDTH_SETS = new Set(["Card"]);
/** Items the board refuses (edit/assets/assets.ts boardDropAt): an App shell goes on a Screen. */
const NOT_ON_BOARD = new Set(["AppShell"]);

const [mode = process.argv.includes("--help") ? "help" : "build"] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const option = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

/** Each item's one variant when it is dropped alone: item id → variant node id (an item of several layers, a frame or text: none). */
async function itemVariants() {
  const { NESTED_LAYERS } = await import(path.join(root, "src/platform/studio/inspector/nestedLayers.generated.ts"));
  const pack = expandPack(JSON.parse(fs.readFileSync(path.join(root, "docs/figma-contracts/native-pack.json"), "utf8")));
  const mapping = await repoMapping();
  const frame = frameCode({ kind: "screen", id: "screen-1", title: "Frame", device: "phone", empty: true, x: 0, y: 0, width: 390, height: 300 }).replace(/\s*\/>$/, ">");
  const variants = {};
  for (const item of items) {
    if (!item.code || NOT_ON_BOARD.has(item.root)) continue;
    const names = [...new Set([...item.code.matchAll(/<([A-Z]\w*)/g)].map((match) => match[1]))].filter((name) => components.has(name));
    const body = [frame, ...item.code.split("\n").map((line) => (line ? `  ${line}` : line)), "</Screen>"].map((line) => `      ${line}`).join("\n");
    const text = `import { Board, Screen } from "@zen-ds/react/builder";\nimport { ${names.join(", ")} } from "@zen-ds/react";\n\nexport const mock = {};\n\nexport default function Page() {\n  return (\n    <Board>\n${body}\n    </Board>\n  );\n}\n`;
    let counter = 0;
    const { pkg } = figmaPackage(text, { mapping, nestedLayers: NESTED_LAYERS, page: { id: "figma-widths" }, newId: () => `k${++counter}` });
    if (!pkg) continue;
    const { message, root: frameGuid } = nativeMessage(pkg, pack);
    const same = (a, b) => a?.sessionID === b?.sessionID && a?.localID === b?.localID;
    const layers = message.nodeChanges.filter((node) => same(node.parentIndex?.guid, frameGuid));
    const [only] = layers;
    if (layers.length !== 1 || only.type !== "INSTANCE" || !only.symbolData) continue;
    variants[item.id] = `${only.symbolData.symbolID.sessionID}:${only.symbolData.symbolID.localID}`;
  }
  return variants;
}

if (mode === "code") {
  const ids = [...new Set(Object.values(await itemVariants()))];
  process.stdout.write(`const ids = ${JSON.stringify(ids)};
const out = {};
for (const id of ids) {
  const node = await figma.getNodeByIdAsync(id);
  if (!node) continue;
  out[id] = [(node.parent && node.parent.type === "COMPONENT_SET" ? node.parent.name : node.name), Math.round(node.width), node.layoutSizingHorizontal];
}
return out;
`);
} else if (mode === "read") {
  const file = option("file");
  if (!file) { console.error("usage: figma-widths.mjs read --file=<use_figma answer.json>"); process.exit(1); }
  const variants = JSON.parse(fs.readFileSync(file, "utf8"));
  const contract = {
    note: "Width and horizontal sizing (layoutSizingHorizontal) of the variants the Studio's Assets items map to, read with use_figma from file 9nZv4uW2LT21yuHabMTCh1 (read only). Re-read: node tools/studio/figma-widths.mjs --help.",
    file: FILE,
    read: new Date().toISOString().slice(0, 10),
    variants,
  };
  fs.writeFileSync(CONTRACT, `${JSON.stringify(contract, null, 1)}\n`);
  console.log(`${Object.keys(variants).length} variants → ${path.relative(root, CONTRACT)}`);
} else if (mode === "build") {
  const { variants, read } = JSON.parse(fs.readFileSync(CONTRACT, "utf8"));
  const widths = {};
  const missing = [];
  for (const [id, variant] of Object.entries(await itemVariants())) {
    const entry = variants[variant];
    if (!entry) { missing.push(`${id} (${variant})`); continue; }
    const [set, width, sizing] = entry;
    if (sizing === "HUG" || SLOT_WIDTH_SETS.has(set)) continue;
    widths[id] = width;
  }
  const text = `// Generated by tools/studio/figma-widths.mjs from docs/figma-contracts/component-widths.json (Figma ${FILE}, read
// ${read}). Do not edit: run the script.

/** Figma's width of an Assets item dropped on the empty canvas on its own: its variant's, where Figma keeps that width
 *  (FIXED or FILL); an item missing here hugs its content in Figma too (builder/boardPaste.ts dropOnBoard). */
export const FIGMA_WIDTHS: Readonly<Record<string, number>> = {
${Object.entries(widths).map(([id, width]) => `  ${JSON.stringify(id)}: ${width},`).join("\n")}
};
`;
  if (missing.length) console.error(`not in the read (run \`code\` and \`read\` again): ${missing.join(", ")}`);
  if (process.argv.includes("--check")) {
    const stale = !fs.existsSync(OUT) || fs.readFileSync(OUT, "utf8") !== text;
    console.log(stale ? `✗ ${path.relative(root, OUT)} is stale: node tools/studio/figma-widths.mjs` : `✓ ${path.relative(root, OUT)}`);
    process.exit(stale || missing.length ? 1 : 0);
  }
  fs.writeFileSync(OUT, text);
  console.log(`${Object.keys(widths).length} items → ${path.relative(root, OUT)}`);
} else {
  console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((line) => line.startsWith("//")).join("\n"));
}
