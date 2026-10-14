#!/usr/bin/env node
// Nested layer names, code vs Figma (core rebuild M7, docs/research/studio-doc-engine-plan-2026-10-10.md §4.3): every
// layer name a component gives `nest()` (src/components/_shared/nested.tsx: the Figma layer path `overrides` uses,
// "Sub-Action", "Leading-Icon") must be the name of a nested instance in that component's Figma sets
// (docs/figma-contracts/*.json), so a Figma rename, or a nested instance added or removed, shows up here, and a frame
// pulled from Figma (tools/studio/figma-pull.mjs) maps its overrides. Names are read per component: the nest() calls in
// its own function and in the same file's helpers it renders (InputField → FieldShell). Components with no contract are
// listed as not covered.
//
//   node tools/figma-contract/nested-paths.mjs            report
//   node tools/figma-contract/nested-paths.mjs --check    exit 1 when a name is not in Figma
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { layerKey } from "../studio/figma-pull.mjs";
import { parseSource } from "../studio/jsx-source.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Code layer names Figma's captured sets do not have, on purpose, with why. Kept short: a new entry needs a reason a
 * reviewer can check in the Figma file.
 */
const ALLOWED = {
  Chip: { "Badge-Counter": "inside .Chip/Trailing (333:82245, Select Type=Multiple), whose layers the Chip contract does not capture; suites/chip-trailing.mjs checks it" },
  TextAreaField: { Leading: "Figma's Input/Text-Area has no Leading or Trailing (nested-layers.json); the code's text area takes them as the other fields do", Trailing: "Figma's Input/Text-Area has no Leading or Trailing (nested-layers.json); the code's text area takes them as the other fields do" },
  Search: { Filter: "Figma draws it as Search/Filter-Icon or Search/Filter-Dropdown by Theme: one code layer for both" },
  Segmented: { "Badge-Counter": "inside Item (Primitives/Segmented/Item-N), whose layers the contract does not capture", Leading: "inside Item, whose layers the contract does not capture" },
  Sidebar: { "Badge-Counter": "inside Item (Primitives/Side-Bar/Menu-Item), whose layers the contract does not capture" },
  // Read 2026-10-12 (nested-layers.json), after the Figma layers were renamed to Zen's names (layer-renames in
  // docs/figma-contracts): what is left is structure Figma draws differently, items it leaves unnamed, or layers it
  // does not draw. Zen's names win (user, 2026-10-12): Icon-Wrapper holds one icon, Leading any visual.
  AlertBanner: { Leading: "Figma draws the status icon in Icon-Wrapper › Icon, shown by its Leading property; the code's Leading takes any node" },
  BottomNavigation: { Item: "Figma's items are unnamed instances of .Primitives/Bottom-Navigation/Items/Default, Floating or Floating-Glass" },
  ChatComposer: { Action: "Figma names each leading action by its job (More, Voice, Photo); the code's come from data, one layer name for all" },
  ChatConversationItem: { "Avatar-Group": "the item's Figma set (…/List-Item/Content) is its text part; the avatars sit in the List-Item around it", Avatar: "the item's Figma set (…/List-Item/Content) is its text part; the avatars sit in the List-Item around it" },
  ListItem: { Leading: "Figma's List-Item leads with Avatar/Single; a leading icon is the code's" },
  Metric: { Counter: "a second Badge (the count) Figma's Metric-Inline sets do not draw" },
  MetricCard: {
    Counter: "a second Badge (the count) Figma's Metric-Inline sets do not draw",
    // MetricCard type (2026-10-14): layers of Figma's Metric-Card set (6643:64008), outside the Metric-Inline sets this
    // component's contract reads; figma-metric.mjs maps the set itself.
    "Progress-Bar": "Metric-Card Type=Goal-Progress (15481:1803) › Metric-Body › Progress-Bar, beside the Metric-Inline",
    Column: "Metric-Card Type=Comparison (15481:1848) › Columns › Column, a frame per column holding a Metric-Inline",
  },
  Pagination: { Page: "Figma names each page by its number (1, 2, 3, …)" },
  Popover: { Avatar: "a Popover item can lead with an Avatar in code; Figma's Popover/Default sample has none", Badge: "a Popover item can end with a Badge in code; Figma's Popover/Default sample has none" },
  SidePanel: { Icon: "the deprecated `icon` prop: Figma removed the heading icon (Icon-Wrapper) on 2026-10-12", Back: "unnamed in Figma: Back-Container › Wrapper › Button/Icon-Flat" },
  Stepper: { Step: "Figma's steps are unnamed instances of .Primitives/Stepper/Step-Horizontal or Step-Vertical" },
  Tag: { Avatar: "Figma's Tag shows its photo through Leading (Image, Status inside), no Avatar layer" },
  Toast: { Leading: "Figma draws the icon in Icon-Wrapper › Icon; the code's Leading (icon prop) takes any node" },
  FileUpload: { Retry: "Figma's File-Item shows Replace and Remove; Retry is the code's, for a failed upload" },
  DatePickerSheet: { Apply: "unnamed in Figma: Date-Picker/Mobile's Footer › Buttons (.Primitives/Bottom-Sheet/Actions) › Button/Main (read 2026-10-13)" },
};

/** Every layer name in a contract set, by name → the layer types it has there. */
function contractLayers(set) {
  const names = new Map();
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (typeof node.n === "string") names.set(node.n, new Set([...(names.get(node.n) ?? []), node.t]));
    for (const child of node.c ?? []) visit(child);
  };
  for (const variant of set.variants ?? []) visit(variant.spec);
  return names;
}

/**
 * docs/figma-contracts/nested-layers.json: each set's layer names with their types (I instance, F frame / slot, T text),
 * hidden layers included, read from the live file (2026-10-12). It stands in for a full contract the set does not have
 * and adds the layers a full contract dropped (hidden ones inside instances: Input's Leading and Trailing).
 */
function lightSets() {
  const file = path.join(root, "docs/figma-contracts/nested-layers.json");
  if (!fs.existsSync(file)) return new Map();
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const out = new Map();
  for (const [id, set] of Object.entries(data.sets ?? {})) {
    const layers = new Map(Object.entries(set.l ?? {}).map(([name, types]) => [name, new Set([...types].map((type) => ({ I: "INSTANCE", F: "FRAME", T: "TEXT" })[type] ?? type))]));
    const entry = { id, name: set.n, layers, file: "nested-layers.json" };
    out.set(id, entry);
    out.set(set.n, entry);
  }
  return out;
}

/** The contract sets by id and by name. */
function contractSets() {
  const dir = path.join(root, "docs/figma-contracts");
  const sets = new Map();
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".json") && name !== "component-properties.json" && name !== "nested-layers.json")) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    for (const set of Array.isArray(data) ? data : []) {
      if (!set?.id) continue;
      const entry = { ...set, file };
      sets.set(set.id, entry);
      sets.set(set.name, entry);
    }
  }
  return sets;
}

/** The first argument of a nest() / nest.at() call as a layer name: a string, or a template's text before `[`. */
function layerName(node) {
  if (!node) return null;
  if (node.type === "StringLiteral") return node.value.replace(/\[.*$/, "");
  if (node.type === "TemplateLiteral") return node.quasis[0]?.value.cooked.replace(/\[.*$/, "") || null;
  return null;
}

/** The component a nest() call draws: the first JSX element in its second argument (a ternary's first branch), or Icon for renderIcon(…). */
function layerComponent(node, depth = 0) {
  if (!node || typeof node.type !== "string" || depth > 6) return null;
  if (node.type === "JSXElement") return node.openingElement.name.type === "JSXIdentifier" && /^[A-Z]/.test(node.openingElement.name.name) ? node.openingElement.name.name : null;
  if (node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "renderIcon") return "Icon";
  for (const key of ["consequent", "alternate", "expression", "right", "left", "arguments"]) {
    const value = node[key];
    for (const child of Array.isArray(value) ? value : [value]) {
      const found = layerComponent(child, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/** Per function of a file (its name → { names, renders, layers }): the nest() layer names it calls (and the component each draws) and the local JSX it renders. */
function fileFunctions(text) {
  const ast = parseSource(text);
  const functions = new Map();
  if (!ast) return functions;
  const nameOf = (node, parent) => {
    if (node.id?.name) return node.id.name;
    if (parent?.type === "VariableDeclarator" && parent.id?.type === "Identifier") return parent.id.name;
    return null;
  };
  // The function each node sits in: the outermost named function (a component and its inner callbacks are one).
  const visit = (node, owner, parent) => {
    if (!node || typeof node.type !== "string") return;
    let current = owner;
    const isFunction = node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression";
    if (isFunction && !owner) {
      // forwardRef(function X(…)) / memo(…) / const X = (…) => …
      const name = nameOf(node, parent) ?? (parent?.type === "CallExpression" ? parent.__declared : null);
      if (name && /^[A-Z]/.test(name)) { current = name; if (!functions.has(name)) functions.set(name, { names: new Set(), renders: new Set(), layers: new Map() }); }
    }
    if (current) {
      const fn = functions.get(current);
      if (node.type === "CallExpression") {
        const callee = node.callee;
        const isNest = (callee.type === "Identifier" && callee.name === "nest") || (callee.type === "MemberExpression" && callee.object?.type === "Identifier" && callee.object.name === "nest" && callee.property?.name === "at");
        const name = isNest ? layerName(node.arguments[0]) : null;
        if (name) fn.names.add(name);
        const drawn = name && callee.type === "Identifier" ? layerComponent(node.arguments[1]) : null;
        if (drawn && !fn.layers.has(name)) fn.layers.set(name, drawn);
      }
      if (node.type === "JSXOpeningElement" && node.name.type === "JSXIdentifier" && /^[A-Z]/.test(node.name.name)) fn.renders.add(node.name.name);
    }
    // `const X = forwardRef(function (…) {…})`: the call's function takes the declarator's name.
    if (node.type === "VariableDeclarator" && node.init?.type === "CallExpression" && node.id?.type === "Identifier") node.init.__declared = node.id.name;
    for (const key of Object.keys(node)) {
      if (key === "loc" || key === "__declared") continue;
      const value = node[key];
      if (Array.isArray(value)) for (const child of value) visit(child, current, node);
      else if (value && typeof value.type === "string") visit(value, current, node);
    }
  };
  visit(ast.program, null, null);
  return functions;
}

/** A component's layer names: its own and those of the same file's helpers it renders (recursively). */
function namesWithHelpers(functions, name, seen = new Set()) {
  if (seen.has(name) || !functions.has(name)) return new Set();
  seen.add(name);
  const fn = functions.get(name);
  const out = new Set(fn.names);
  for (const rendered of fn.renders) for (const inner of namesWithHelpers(functions, rendered, seen)) out.add(inner);
  return out;
}

/** A component's nested layers with the component each draws: its own and those of its same-file helpers. */
function layersWithHelpers(functions, name, seen = new Set()) {
  if (seen.has(name) || !functions.has(name)) return new Map();
  seen.add(name);
  const fn = functions.get(name);
  const out = new Map(fn.layers);
  for (const rendered of fn.renders) for (const [layer, component] of layersWithHelpers(functions, rendered, seen)) if (!out.has(layer)) out.set(layer, component);
  return out;
}

/**
 * Owner component → its nested layers → the component each draws (`Card: { "Sub-Action": "IconButton" }`), read from
 * the nest() calls in src/components (core rebuild Q4: a Studio page's `overrides` pushed to Figma name the nested
 * instance's component). A layer whose component the source does not say (an element built elsewhere) is left out.
 */
export function nestedLayers() {
  const out = {};
  const dir = path.join(root, "src/components");
  for (const folder of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, folder);
    if (folder.startsWith("_") || !fs.statSync(full).isDirectory()) continue;
    for (const file of fs.readdirSync(full).filter((name) => name.endsWith(".tsx") && !name.includes(".stories")).sort()) {
      const functions = fileFunctions(fs.readFileSync(path.join(full, file), "utf8"));
      for (const [component] of functions) {
        const layers = layersWithHelpers(functions, component);
        if (layers.size) out[component] = Object.fromEntries([...layers].sort(([a], [b]) => a.localeCompare(b)));
      }
    }
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

export async function nestedPaths() {
  const { FIGMA_PROPS } = await import(pathToFileURL(path.join(root, "src/platform/studio/inspector/figmaProps.generated.ts")).href);
  const sets = contractSets();
  const light = lightSets();
  const rows = [];
  const dir = path.join(root, "src/components");
  for (const folder of fs.readdirSync(dir)) {
    const full = path.join(dir, folder);
    if (folder.startsWith("_") || !fs.statSync(full).isDirectory()) continue;
    for (const file of fs.readdirSync(full).filter((name) => name.endsWith(".tsx") && !name.includes(".stories"))) {
      const functions = fileFunctions(fs.readFileSync(path.join(full, file), "utf8"));
      for (const [component] of functions) {
        const entry = FIGMA_PROPS[component];
        if (!entry) continue;
        const names = namesWithHelpers(functions, component);
        if (!names.size) continue;
        const ids = [entry.figma, ...entry.own.filter((item) => item.type === "SET").flatMap((item) => Object.keys(item.options ?? {}))];
        const found = [...new Set(ids.map((id) => sets.get(id)).filter(Boolean))];
        const read = [...new Set(ids.map((id) => light.get(id)).filter(Boolean))];
        const layers = new Map();
        for (const set of found) for (const [name, types] of contractLayers(set)) layers.set(name, new Set([...(layers.get(name) ?? []), ...types]));
        for (const set of read) for (const [name, types] of set.layers) layers.set(name, new Set([...(layers.get(name) ?? []), ...types]));
        if (!found.length && read.length) found.push(...read);
        const instances = [...layers].filter(([, types]) => types.has("INSTANCE")).map(([name]) => name);
        // No contract, or one that captured no nested instance (Popover: its items are slot content): not judged.
        if (!found.length || !instances.length) { rows.push({ component, file: `${folder}/${file}`, names: [...names], covered: false, missing: [] }); continue; }
        // A layer named after its component ("Avatar/Single", ".Primitives/Date-Picker/Time-Picker") is known by its key.
        const known = new Set([...layers.keys(), ...instances.map(layerKey)]);
        const allowed = ALLOWED[component] ?? {};
        rows.push({
          component, file: `${folder}/${file}`, names: [...names], covered: true, contracts: [...new Set(found.map((set) => set.file))], instances,
          missing: [...names].filter((name) => !known.has(name) && !allowed[name]),
          allowed: [...names].filter((name) => !known.has(name) && allowed[name]).map((name) => `${name}: ${allowed[name]}`),
        });
      }
    }
  }
  return rows;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const rows = await nestedPaths();
  const covered = rows.filter((row) => row.covered);
  const bad = covered.filter((row) => row.missing.length);
  for (const row of covered) {
    console.log(`${row.missing.length ? "✗" : "✓"} ${row.component} (${row.contracts.join(", ")}): ${row.names.join(", ")}${row.missing.length ? `\n    not in Figma: ${row.missing.join(", ")}\n    Figma's nested instances: ${row.instances.join(", ")}` : ""}`);
    for (const line of row.allowed) console.log(`    allowed · ${line}`);
  }
  console.log(`\n${covered.length - bad.length}/${covered.length} components with a contract match Figma; not covered (no contract): ${rows.filter((row) => !row.covered).map((row) => row.component).join(", ")}`);
  // An entry for a name the code no longer has, or that Figma now has, goes: the list stays what is true today.
  const stale = Object.entries(ALLOWED).flatMap(([component, names]) => Object.keys(names).filter((name) => !rows.some((row) => row.component === component && row.allowed?.some((line) => line.startsWith(`${name}:`)))).map((name) => `${component}.${name}`));
  if (stale.length) console.log(`stale ALLOWED entries (remove them): ${stale.join(", ")}`);
  if (process.argv.includes("--check") && (bad.length || stale.length)) process.exit(1);
}
