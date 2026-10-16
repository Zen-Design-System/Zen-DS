// The Zen library's keys (Studio → Figma in any file, docs/research/studio-copy-to-figma-2026-10-16.md §4). Outside the
// Zen file a component set, an icon or a style is imported by its key (the Plugin API cannot list a library's components
// or styles), and a variable through its collection's key (figma.teamLibrary lists a collection's variables by name).
// docs/figma-contracts/library-keys.json holds them, read from the live Zen file with use_figma (read-only). Two halves:
//
// - readCode(kind, { part, ids }): the code to run in use_figma on file 9nZv4uW2LT21yuHabMTCh1. "sets" reads the sets the
//   push writes (the contract's and the ids its code names), the variable collections and the styles; "icons" reads the
//   icon page. Each answer is one part ("PART i/n <part hash> <whole hash>", then lines of |-separated fields), checked by its hash on the
//   way back, since the answers are saved by hand.
// - libraryKeysFor(pkg, table): the keys one Figma package uses (its sets, icon names, text styles; every collection),
//   which the package carries as `library` for the plugin.
//
//   node tools/studio/library-keys.mjs code <sets|icons> [--part=N]         print the use_figma code (part N, from 0)
//   node tools/studio/library-keys.mjs write --sets=<files> --icons=<files>  answers (comma-separated part files) → json
//   node tools/studio/library-keys.mjs check                                sets the push names that have no key yet

/** The Zen file the keys come from, and its icon page. */
export const LIBRARY_FILE = "9nZv4uW2LT21yuHabMTCh1";
export const ICON_PAGE = "1340:4450";
/** Characters of one part: ASCII, so a part with its head line stays under use_figma's 20 KB answer. */
export const PART_SIZE = 12000;

/** FNV-1a (32 bit) of a text, as 8 hex digits: the same in Figma and in Node. */
export function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * The use_figma code that reads one part of `kind` (read-only: it changes nothing in the file). Lines, fields split by |:
 * sets   `S|C <id> <key> <name> <set id>` (C: a lone component, or a variant with its set's id), `X <id>` (no such node),
 *        `N <id> <type> <name>` (not a component), `V <key> <collection>`, `T|P|E <key> <text|paint|effect style>`;
 * icons  `S|C <key> <name>` (an icon set, a lone icon component).
 */
export function readCode(kind, { part = 0, ids = [] } = {}) {
  const lines = kind === "icons" ? `
const page = await figma.getNodeByIdAsync(${JSON.stringify(ICON_PAGE)});
await figma.setCurrentPageAsync(page);
for (const node of page.findAllWithCriteria({ types: ["COMPONENT_SET", "COMPONENT"] })) {
  if (node.type === "COMPONENT" && node.parent && node.parent.type === "COMPONENT_SET") continue;
  lines.push([node.type === "COMPONENT_SET" ? "S" : "C", node.key, esc(node.name)].join("|"));
}
lines.sort((a, b) => (a.split("|")[2] < b.split("|")[2] ? -1 : a.split("|")[2] > b.split("|")[2] ? 1 : 0));` : `
const ids = ${JSON.stringify(ids)};
const seen = new Set(ids);
for (const id of ids) {
  let node = null;
  try { node = await figma.getNodeByIdAsync(id); } catch (e) { }
  if (!node) { lines.push("X|" + id); continue; }
  if (node.type !== "COMPONENT" && node.type !== "COMPONENT_SET") { lines.push(["N", id, node.type, esc(node.name)].join("|")); continue; }
  const set = node.type === "COMPONENT" && node.parent && node.parent.type === "COMPONENT_SET" ? node.parent : null;
  lines.push([node.type === "COMPONENT_SET" ? "S" : "C", id, node.key, esc(node.name), set ? set.id : ""].join("|"));
  if (set && !seen.has(set.id)) { seen.add(set.id); lines.push(["S", set.id, set.key, esc(set.name), ""].join("|")); }
}
for (const collection of await figma.variables.getLocalVariableCollectionsAsync()) lines.push(["V", collection.key, esc(collection.name)].join("|"));
for (const [kind, styles] of [["T", await figma.getLocalTextStylesAsync()], ["P", await figma.getLocalPaintStylesAsync()], ["E", await figma.getLocalEffectStylesAsync()]]) {
  for (const style of styles) lines.push([kind, style.key, esc(style.name)].join("|"));
}`;
  return `
// Zen Studio · library-keys: reads the Zen library's ${kind} keys (read-only).
const fnv1a = ${fnv1a.toString()};
// ASCII only (\\uXXXX for the rest): an answer with many non-ASCII characters was cut short in transit.
const esc = (text) => String(text).replace(/[\\t\\r\\n]/g, " ").replace(/\\|/g, "\\\\u007c").replace(/[\\u0080-\\uffff]/g, (char) => "\\\\u" + char.charCodeAt(0).toString(16).padStart(4, "0"));
const lines = [];
${lines.trim()}
const text = lines.join("\\n");
const parts = Math.max(1, Math.ceil(text.length / ${PART_SIZE}));
const slice = text.slice(${part} * ${PART_SIZE}, (${part} + 1) * ${PART_SIZE});
return "PART " + (${part} + 1) + "/" + parts + " " + fnv1a(slice) + " " + fnv1a(text) + "\\n" + slice;
`.trim();
}

/** The lines of one kind from its answers (any order), each part and the whole checked by their hashes. */
export function joinParts(texts) {
  const parts = texts.map((text) => {
    const head = /^PART (\d+)\/(\d+) ([0-9a-f]{8}) ([0-9a-f]{8})\n/.exec(text);
    if (!head) throw new Error("library-keys: an answer without its PART head line");
    const data = text.slice(head[0].length);
    if (fnv1a(data) !== head[3]) throw new Error(`library-keys: part ${head[1]}/${head[2]} does not match its hash (copied wrong?)`);
    return { index: Number(head[1]), count: Number(head[2]), whole: head[4], data };
  }).sort((a, b) => a.index - b.index);
  const count = parts[0]?.count ?? 0;
  if (parts.length !== count || parts.some((item, at) => item.index !== at + 1)) throw new Error(`library-keys: ${parts.length} of ${count} parts given`);
  const text = parts.map((item) => item.data).join("");
  if (fnv1a(text) !== parts[0].whole) throw new Error("library-keys: the parts are from different reads (the whole hash differs)");
  return text ? text.split("\n").map((line) => line.split("|")) : [];
}

const unescape = (text) => text.replace(/\\u([0-9a-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
const sorted = (entries) => Object.fromEntries([...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

/** The table from the two reads' lines. */
export function tableFrom({ sets: setLines, icons: iconLines }, { read }) {
  const sets = [], missing = [], collections = [], icons = [];
  const styles = { text: [], paint: [], effect: [] };
  for (const [kind, ...rest] of setLines) {
    if (kind === "S" || kind === "C") {
      const [id, key, name, set] = rest;
      sets.push([id, { name: unescape(name), type: kind === "S" ? "COMPONENT_SET" : "COMPONENT", key, ...(set ? { set } : {}) }]);
    } else if (kind === "X" || kind === "N") missing.push(rest[0]);
    else if (kind === "V") collections.push([unescape(rest[1]), rest[0]]);
    else if (kind === "T" || kind === "P" || kind === "E") styles[{ T: "text", P: "paint", E: "effect" }[kind]].push([unescape(rest[1]), rest[0]]);
  }
  const iconSets = [];
  for (const [kind, key, name] of iconLines) (kind === "S" ? iconSets : icons).push([unescape(name), key]);
  return {
    note: "Keys of the Zen library's assets, read with use_figma from file 9nZv4uW2LT21yuHabMTCh1 (read-only): the sets the Studio's Figma push writes (by node id), the icons (by name), the variable collections and the styles (by name). The Zen plugin's Import from Studio imports them by key in files that use the published library. A key only imports once its asset is published. Re-read: node tools/studio/library-keys.mjs --help.",
    file: LIBRARY_FILE,
    read,
    sets: sorted(sets),
    ...(missing.length ? { missing: missing.sort() } : {}),
    icons: sorted(icons),
    iconSets: sorted(iconSets),
    collections: sorted(collections),
    styles: { text: sorted(styles.text), paint: sorted(styles.paint), effect: sorted(styles.effect) },
  };
}

/**
 * The keys a package uses (its `library`): its instances' sets (and a variant's set) by id and the icons it swaps in or
 * sets as an INSTANCE_SWAP value by name, each `{ key, type }` (the plugin imports a set and a component differently);
 * its text styles by name; every variable collection (the plugin finds a variable by name in them).
 */
export function libraryKeysFor(pkg, table) {
  const sets = {}, icons = {}, styles = {};
  const addSet = (id) => {
    const entry = table.sets[id];
    if (!entry || sets[id]) return;
    sets[id] = { key: entry.key, type: entry.type };
    if (entry.set) addSet(entry.set);
  };
  const addName = (name) => {
    if (table.icons[name]) icons[name] = { key: table.icons[name], type: "COMPONENT" };
    else if (table.iconSets[name]) icons[name] = { key: table.iconSets[name], type: "COMPONENT_SET" };
  };
  const visit = (value, field) => {
    if (typeof value === "string") {
      if (field === "textStyle" && table.styles.text[value]) styles[value] = table.styles.text[value];
      else addName(value);
      return;
    }
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach((item) => visit(item, field)); return; }
    if (field === "set" && typeof value.id === "string") { addSet(value.id); if (!table.sets[value.id] && typeof value.name === "string") addName(value.name); return; }
    for (const [key, item] of Object.entries(value)) if (key !== "images") visit(item, key);
  };
  visit(pkg.frame, "frame");
  return { file: table.file, read: table.read, sets, icons, styles, collections: { ...table.collections } };
}

/** The set ids the push can write: the contract's and the ones its code names (charts, Flag, FileIcon, nav…). */
export function pushSetIds(contract, sources) {
  const ids = new Set(contract.pages.flatMap((page) => page.sets.map((set) => set.id)));
  for (const text of sources) for (const match of text.matchAll(/["'`](\d{2,6}:\d{1,7})["'`]/g)) ids.add(match[1]);
  return [...ids].sort();
}

const nodeModule = (name) => import(/* @vite-ignore */ `node:${name}`);

/** The push's sources whose set ids count (the figma-*.mjs modules and the generated inspector maps). */
async function repoSources(fs, path, root) {
  const dir = path.join(root, "tools/studio");
  const files = fs.readdirSync(dir).filter((file) => /^(figma|screen|slots|arrange|nested).*\.mjs$/.test(file) && !file.includes("selftest")).map((file) => path.join(dir, file));
  files.push(path.join(root, "src/platform/studio/inspector/figmaProps.generated.ts"), path.join(root, "src/platform/studio/inspector/nestedLayers.generated.ts"));
  return files.filter((file) => fs.existsSync(file)).map((file) => fs.readFileSync(file, "utf8"));
}

if (typeof process !== "undefined" && process.argv?.[1] && import.meta.url === (await nodeModule("url")).pathToFileURL((await nodeModule("path")).resolve(process.argv[1])).href) {
  const { default: fs } = await nodeModule("fs");
  const { default: path } = await nodeModule("path");
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
  const out = path.join(root, "docs/figma-contracts/library-keys.json");
  const contract = JSON.parse(fs.readFileSync(path.join(root, "docs/figma-contracts/component-properties.json"), "utf8"));
  const [command, arg] = process.argv.slice(2);
  const option = (name) => process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3);
  const ids = pushSetIds(contract, await repoSources(fs, path, root));
  if (command === "code" && (arg === "sets" || arg === "icons")) console.log(readCode(arg, { part: Number(option("part") ?? 0), ids }));
  else if (command === "write" && option("sets") && option("icons")) {
    const read = (files) => joinParts(files.split(",").map((file) => fs.readFileSync(file, "utf8").replace(/\r?\n$/, "")));
    const table = tableFrom({ sets: read(option("sets")), icons: read(option("icons")) }, { read: option("date") ?? new Date().toISOString().slice(0, 10) });
    fs.writeFileSync(out, `${JSON.stringify(table, null, 2)}\n`);
    console.log(`library-keys: ${Object.keys(table.sets).length} sets, ${Object.keys(table.icons).length} icons + ${Object.keys(table.iconSets).length} icon sets, ${Object.keys(table.collections).length} collections, ${Object.values(table.styles).reduce((sum, list) => sum + Object.keys(list).length, 0)} styles${table.missing ? `; not components: ${table.missing.join(", ")}` : ""}`);
  } else if (command === "check") {
    const table = JSON.parse(fs.readFileSync(out, "utf8"));
    const without = ids.filter((id) => !table.sets[id] && !(table.missing ?? []).includes(id));
    if (without.length) {
      console.error(`library-keys: ${without.length} set(s) the push can write have no key yet (${without.join(", ")}): re-read with "code sets"`);
      process.exit(1);
    }
    console.log(`library-keys: every set the push can write (${ids.length}) has a key (read ${table.read})`);
  } else {
    console.error("usage: library-keys.mjs code <sets|icons> [--part=N] | write --sets=<part files> --icons=<part files> [--date=YYYY-MM-DD] | check");
    process.exit(1);
  }
}
