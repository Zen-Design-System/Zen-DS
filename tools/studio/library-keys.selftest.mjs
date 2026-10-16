// Self-test of tools/studio/library-keys.mjs (Studio → Figma in any file, docs/research/studio-copy-to-figma-2026-10-16.md
// P0): the read code against a stand-in figma, parts checked by their hashes, the table, and the keys real packages carry.
// Run: node tools/studio/library-keys.selftest.mjs
import fs from "node:fs";
import { PART_SIZE, fnv1a, joinParts, libraryKeysFor, pushSetIds, readCode, tableFrom } from "./library-keys.mjs";
import { figmaPackage } from "./figma-push.mjs";
import { pageFromFigma, repoMapping } from "./figma-pull.mjs";
import { NESTED_LAYERS } from "../../src/platform/studio/inspector/nestedLayers.generated.ts";

let passed = 0;
const failures = [];
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};
const ok = (label, value) => check(label, Boolean(value), true);
const throws = (label, run, pattern) => {
  try { run(); failures.push(`${label}: did not throw`); } catch (error) { check(label, pattern.test(error.message), true); }
};
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
/** Runs a read's code the way use_figma does (top-level await, `return`), against a stand-in `figma`. */
const run = (code, figma) => new AsyncFunction("figma", code)(figma);
const key = (seed) => fnv1a(seed).repeat(5);

// 1. The hash: FNV-1a 32 bit, the same in Figma's code and here.
check("fnv1a of nothing", fnv1a(""), "811c9dc5");
check("fnv1a of a", fnv1a("a"), "e40c292c");

// 2. The sets read: sets, a lone component, a variant (its set comes too), a frame, a missing id, collections, styles.
const nodes = {
  "1:1": { type: "COMPONENT_SET", key: key("button"), name: "Button/Main" },
  "1:2": { type: "COMPONENT", key: key("flag"), name: "Flag|Big Ünïcode" },
  "1:3": { type: "COMPONENT", key: key("variant"), name: "Type=Navigation", parent: { type: "COMPONENT_SET", id: "1:9", key: key("header"), name: "Primitives/Dashboard/Header" } },
  "1:4": { type: "FRAME", key: "", name: "Overviews" },
};
const figmaSets = {
  getNodeByIdAsync: async (id) => nodes[id] ?? null,
  variables: { getLocalVariableCollectionsAsync: async () => [{ key: key("spacing"), name: "Spacing" }] },
  getLocalTextStylesAsync: async () => [{ key: key("h1"), name: "Heading/1" }],
  getLocalPaintStylesAsync: async () => [{ key: key("chart"), name: "Color Chart Sector/Primary" }],
  getLocalEffectStylesAsync: async () => [{ key: key("shadow"), name: "Effect/Container" }],
};
const setsAnswer = await run(readCode("sets", { ids: ["1:1", "1:2", "1:3", "1:4", "1:5"] }), figmaSets);
check("sets read: one part, its head line", /^PART 1\/1 [0-9a-f]{8} [0-9a-f]{8}\n/.test(setsAnswer), true);
const setLines = joinParts([setsAnswer]);
check("sets read: lines (| and non-ASCII escaped, the variant's set after it)", setLines.map((line) => line[0] + (line[1] ?? "")), ["S1:1", "C1:2", "C1:3", "S1:9", "N1:4", "X1:5", `V${key("spacing")}`, `T${key("h1")}`, `P${key("chart")}`, `E${key("shadow")}`]);
ok("sets read: ASCII only", /^[\x00-\x7f]*$/.test(setsAnswer));

// 3. The icons read, in parts: sorted by name, a variant inside an icon set left out, each part and the whole checked.
const iconNodes = Array.from({ length: 400 }, (_, index) => ({ type: "COMPONENT", key: key(`icon${index}`), name: `icon-n${String(399 - index).padStart(3, "0")}-line`, parent: { type: "PAGE" } }));
iconNodes.push({ type: "COMPONENT_SET", key: key("file"), name: "icon-media-file", parent: { type: "PAGE" } }, { type: "COMPONENT", key: key("pdf"), name: "Format=PDF", parent: { type: "COMPONENT_SET" } });
const figmaIcons = { getNodeByIdAsync: async () => ({ findAllWithCriteria: () => iconNodes }), setCurrentPageAsync: async () => {} };
const first = await run(readCode("icons", { part: 0 }), figmaIcons);
const count = Number(/^PART 1\/(\d+)/.exec(first)[1]);
ok("icons read: 401 icons need more than one part", count > 1);
const answers = [first];
for (let part = 1; part < count; part++) answers.push(await run(readCode("icons", { part }), figmaIcons));
check("icons read: a part holds PART_SIZE characters", answers[0].split("\n").slice(1).join("\n").length, PART_SIZE);
const iconLines = joinParts([...answers].reverse());
check("icons read: sorted by name, the set kept, its variant left out", [iconLines.length, iconLines[0][2], iconLines.at(-1)[2], iconLines.find((line) => line[0] === "S")?.[2]], [401, "icon-media-file", "icon-n399-line", "icon-media-file"]);
throws("a part copied wrong is refused", () => joinParts([answers[0].replace(/[0-9a-f](?=\|icon-n)/, (c) => (c === "0" ? "1" : "0")), ...answers.slice(1)]), /does not match its hash/);
throws("a missing part is refused", () => joinParts(answers.slice(1)), /parts given/);

// 4. The table.
const table = tableFrom({ sets: setLines, icons: iconLines }, { read: "2026-10-16" });
check("table: sets by id (a variant names its set), the frame and the missing id listed", [table.sets["1:2"].name, table.sets["1:3"].set, table.sets["1:9"].type, table.missing], ["Flag|Big Ünïcode", "1:9", "COMPONENT_SET", ["1:4", "1:5"]]);
check("table: icons, icon sets, collections, styles", [Object.keys(table.icons).length, table.iconSets["icon-media-file"], table.collections.Spacing, table.styles.text["Heading/1"], table.styles.effect["Effect/Container"]], [400, key("file"), key("spacing"), key("h1"), key("shadow")]);

// 5. The keys a package uses: its sets (a variant's set too), icon names wherever they are, its text styles; collections all.
const pkg = { frame: { type: "FRAME", children: [
  { type: "INSTANCE", set: { id: "1:3", name: "Type=Navigation" }, props: { Icon: "icon-n001-line", Label: "Home" }, nested: [{ path: "Leading", set: { id: "1:2", name: "Flag" } }] },
  { type: "TEXT", characters: "Title", textStyle: "Heading/1" },
  { type: "INSTANCE", set: { id: "1:404", name: "icon-media-file" }, swapIcon: "icon-n002-line" },
] } };
check("libraryKeysFor: the keys of what the package uses", libraryKeysFor(pkg, table), {
  file: "9nZv4uW2LT21yuHabMTCh1", read: "2026-10-16",
  sets: { "1:3": { key: key("variant"), type: "COMPONENT" }, "1:9": { key: key("header"), type: "COMPONENT_SET" }, "1:2": { key: key("flag"), type: "COMPONENT" } },
  icons: { "icon-n001-line": { key: table.icons["icon-n001-line"], type: "COMPONENT" }, "icon-media-file": { key: key("file"), type: "COMPONENT_SET" }, "icon-n002-line": { key: table.icons["icon-n002-line"], type: "COMPONENT" } },
  styles: { "Heading/1": key("h1") },
  collections: { Spacing: key("spacing") },
});
check("pushSetIds: the contract's and the code's ids, once", pushSetIds({ pages: [{ sets: [{ id: "2:1" }, { id: "2:2" }] }] }, ['const A = { id: "2:2" };', "set: '33:4'"]), ["2:1", "2:2", "33:4"]);

// 6. The repo's table (read 2026-10-16): every set the push can write has a key, every key is a Figma key.
const repo = JSON.parse(fs.readFileSync(new URL("../../docs/figma-contracts/library-keys.json", import.meta.url), "utf8"));
const keys = [...Object.values(repo.sets).map((entry) => entry.key), ...Object.values(repo.icons), ...Object.values(repo.iconSets), ...Object.values(repo.collections), ...Object.values(repo.styles).flatMap(Object.values)];
ok(`repo table: ${keys.length} keys, each 40 hex`, keys.every((value) => /^[0-9a-f]{40}$/.test(value)));
check("repo table: the 12 variable collections", Object.keys(repo.collections).length, 12);
const contract = JSON.parse(fs.readFileSync(new URL("../../docs/figma-contracts/component-properties.json", import.meta.url), "utf8"));
const withoutKey = contract.pages.flatMap((page) => page.sets.map((set) => set.id)).filter((id) => !repo.sets[id]);
check("repo table: every contract set has a key", withoutKey, []);

// 7. Real packages (frames pulled from the live file, pushed back) carry a key for every set, icon and text style they
//    use, and every variable they bind is a variable of the library (the plugin finds it by name in the collections).
const mapping = await repoMapping();
const variableNames = new Set(fs.readdirSync(new URL("../../tokens/source/figma/", import.meta.url)).flatMap((file) => Object.values(JSON.parse(fs.readFileSync(new URL(`../../tokens/source/figma/${file}`, import.meta.url), "utf8"))).flatMap((collection) => collection.tokens.map((token) => token.name))));
for (const fixture of ["figma-overviews", "figma-table", "figma-shell", "figma-chat", "figma-metric", "figma-parts"]) {
  const read = JSON.parse(fs.readFileSync(new URL(`./fixtures/${fixture}.json`, import.meta.url), "utf8"));
  const { text } = pageFromFigma(read.frame ?? read, { mapping });
  const { pkg: built } = figmaPackage(text, { mapping, nestedLayers: NESTED_LAYERS, page: { id: fixture }, libraryKeys: repo });
  if (!built) { failures.push(`${fixture}: no package`); continue; }
  const used = { sets: new Set(), icons: new Set(), styles: new Set(), variables: new Set() };
  const walk = (value, field) => {
    if (typeof value === "string") {
      if (field === "textStyle") used.styles.add(value);
      else if (/^(icon|ic)-/.test(value) && (field === "swapIcon" || field === "props")) used.icons.add(value);
      else if (/Var$/.test(field)) used.variables.add(value);
      else if (field === "fill") used.variables.add(variableNames.has(value) ? value : `Color/${value}`);
      return;
    }
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach((item) => walk(item, field)); return; }
    if (field === "set" && value.id) { used.sets.add(value.id); return; }
    for (const [name, item] of Object.entries(value)) walk(item, field === "props" ? "props" : name);
  };
  walk(built.frame, "frame");
  const library = built.library;
  check(`${fixture}: every set has a key (${used.sets.size})`, [...used.sets].filter((id) => !library.sets[id]), []);
  check(`${fixture}: every icon has a key (${used.icons.size})`, [...used.icons].filter((name) => !library.icons[name]), []);
  check(`${fixture}: every text style has a key (${used.styles.size})`, [...used.styles].filter((name) => !library.styles[name]), []);
  check(`${fixture}: every variable is the library's (${used.variables.size})`, [...used.variables].filter((name) => !variableNames.has(name)), []);
}

if (failures.length) {
  console.error(`✗ library-keys selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ library-keys selftest: ${passed} checks pass.`);
