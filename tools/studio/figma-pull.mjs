#!/usr/bin/env node
// A Figma frame made with the Zen library → a Zen Studio page (core rebuild M6, docs/research/studio-doc-engine-plan-
// 2026-10-10.md §4.6, plan criterion 6). Two halves:
//
// - figmaReadCode(nodeId): the code to run in use_figma (read-only) on file 9nZv4uW2LT21yuHabMTCh1. It returns the frame
//   as JSON: auto-layout frames (gap / padding with their bound variable names, alignment), text (characters, text style
//   name), and each Zen instance (its component set, its properties by Figma name, its first text, and the nested
//   instances whose properties were overridden, by their layer path: "Sub-Action", "Sub-Action/Leading-Icon").
// - pageFromFigma(frame, { title, mapping }): that JSON → the page's TSX (dialect format 1, printed by doc.mjs). An
//   instance becomes its component with the properties that differ from the set's defaults (figmaProps.generated.ts maps
//   names and options), its overridden nested instances become `overrides`, an auto-layout frame a Stack, a text layer a
//   Text. What has no Zen mapping is left out and named in `notes`.
//
//   node tools/studio/figma-pull.mjs code <nodeId>              print the use_figma code for that frame
//   node tools/studio/figma-pull.mjs page <frame.json> [--title=…] [--out=<file.zen.tsx>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { printPage } from "./doc.mjs";

/* ── layer names ────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * The name an `overrides` path uses for a Figma layer. A layer named after its component (an instance nobody renamed)
 * holds slashes, which a path cannot: a private primitive (".Primitives/Date-Picker/Time-Picker",
 * "Primitives/Segmented/Item-1") is known by its last part without a "-N" count ("Time-Picker", "Item"), a library
 * component ("Avatar/Single", "Search/Default") by its first ("Avatar", "Search"). Any other name is itself.
 * (Copied into figmaReadCode, which runs in Figma; tools/figma-contract/nested-paths.mjs checks the code by it.)
 */
export function layerKey(name) {
  const text = String(name ?? "");
  if (!text.includes("/")) return text;
  const parts = text.replace(/^\./, "").split("/").filter(Boolean);
  if (parts[0] === "Primitives") return parts[parts.length - 1].replace(/-\d+$/, "");
  return parts[0];
}

/* ── reading in Figma (use_figma) ───────────────────────────────────────────────────────────────────────────────── */

/** The use_figma code that returns the frame `nodeId` as JSON (read-only: it changes nothing in the file). */
export function figmaReadCode(nodeId) {
  return `
// Zen Studio · figma-pull: reads frame ${JSON.stringify(nodeId)} as JSON (read-only).
figma.skipInvisibleInstanceChildren = false;
const layerKey = ${layerKey.toString()};
const variableName = async (id) => { if (!id) return null; const v = await figma.variables.getVariableByIdAsync(id); return v ? v.name : null; };
const setOf = async (instance) => {
  const main = await instance.getMainComponentAsync();
  if (!main) return null;
  const set = main.parent && main.parent.type === "COMPONENT_SET" ? main.parent : main;
  return { id: set.id, name: set.name };
};
const propsOf = async (instance) => {
  const out = {};
  for (const [key, prop] of Object.entries(instance.componentProperties || {})) {
    const name = key.replace(/#[^#]*$/, "");
    if (prop.type === "INSTANCE_SWAP") { const swapped = await figma.getNodeByIdAsync(prop.value); out[name] = swapped ? swapped.name : String(prop.value); }
    else out[name] = prop.value;
  }
  return out;
};
const firstText = (node) => { const text = node.findOne ? node.findOne((n) => n.type === "TEXT" && n.visible) : null; return text ? text.characters : null; };
const readInstance = async (instance) => {
  const out = { type: "INSTANCE", name: instance.name, set: await setOf(instance), props: await propsOf(instance), text: firstText(instance), nested: [] };
  const changed = new Set((instance.overrides || []).filter((o) => o.overriddenFields.some((f) => f === "componentProperties" || f === "characters")).map((o) => o.id));
  const walk = async (node, trail) => {
    for (const child of node.children || []) {
      if (!child.visible) continue;
      const next = child.type === "INSTANCE" ? [...trail, layerKey(child.name)] : trail;
      if (child.type === "INSTANCE" && changed.has(child.id)) out.nested.push({ path: next.join("/"), set: await setOf(child), props: await propsOf(child), text: firstText(child) });
      await walk(child, next);
    }
  };
  await walk(instance, []);
  return out;
};
const read = async (node) => {
  if (!node.visible) return null;
  if (node.type === "TEXT") {
    const style = typeof node.textStyleId === "string" && node.textStyleId ? await figma.getStyleByIdAsync(node.textStyleId) : null;
    return { type: "TEXT", name: node.name, characters: node.characters, textStyle: style ? style.name : null };
  }
  if (node.type === "INSTANCE") return readInstance(node);
  const out = { type: node.type, name: node.name, width: Math.round(node.width), height: Math.round(node.height), children: [] };
  if ("layoutMode" in node && node.layoutMode !== "NONE") {
    const bound = node.boundVariables || {};
    out.layout = {
      mode: node.layoutMode, gap: node.itemSpacing, gapVar: await variableName(bound.itemSpacing && bound.itemSpacing.id),
      padding: [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft],
      paddingVar: await variableName((bound.paddingTop || bound.paddingLeft || {}).id),
      primary: node.primaryAxisAlignItems, counter: node.counterAxisAlignItems, wrap: node.layoutWrap === "WRAP",
    };
  }
  for (const child of node.children || []) { const read_ = await read(child); if (read_) out.children.push(read_); }
  return out;
};
const node = await figma.getNodeByIdAsync(${JSON.stringify(nodeId)});
if (!node) throw new Error("No node " + ${JSON.stringify(nodeId)});
return JSON.stringify(await read(node));
`.trim();
}

/* ── mapping data ───────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * The Figma → code mapping from the repo's data: `figmaProps` (inspector/figmaProps.generated.ts FIGMA_PROPS), `contract`
 * (docs/figma-contracts/component-properties.json: each set's id, name and property defaults) and `apiProps` (component
 * → Map of its code props to their code default, from docs/api). Sets are found by id and by name.
 */
export function figmaMapping({ figmaProps, contract, apiProps = {}, textStyles = null }) {
  const contractSets = new Map();
  for (const page of contract.pages ?? []) for (const set of page.sets ?? []) { contractSets.set(set.id, set); contractSets.set(set.name, set); }
  const sets = new Map();
  const register = (set, entry) => { if (set) { sets.set(set.id, entry); sets.set(set.name, entry); } };
  for (const [code, props] of Object.entries(figmaProps)) {
    const own = props.own.filter((item) => item.type !== "SET");
    const choice = props.own.find((item) => item.type === "SET");
    const defaultsOf = (set) => Object.fromEntries((set?.props ?? []).map((prop) => [prop.name, prop.default]));
    if (choice) {
      const first = Object.values(choice.options ?? {})[0];
      for (const [name, value] of Object.entries(choice.options ?? {})) {
        const set = contractSets.get(name);
        register(set ?? { id: name, name }, { code, own, toggles: props.toggles, defaults: defaultsOf(set), setProp: choice.prop, setValue: value, setDefault: first });
      }
    }
    const set = contractSets.get(props.figma);
    register(set ?? { id: props.figma, name: props.figma }, { code, own, toggles: props.toggles, defaults: defaultsOf(set) });
  }
  return { sets, apiProps, textStyles: textStyles ? new Set(textStyles) : null };
}

/* ── converting ─────────────────────────────────────────────────────────────────────────────────────────────────── */

const literal = (value) => ({ kind: "literal", value });
const TEXT_PROPS = /^(Label|Text|Title|Content)$/;
/** Spacing/Gap and Spacing/Padding in px (src/components/_shared/scale.ts), for a value bound to no variable. */
const GAP_PX = [[0, "none"], [2, "3xs"], [4, "2xs"], [8, "xs"], [12, "sm"], [16, "md"], [24, "lg"], [32, "xl"], [40, "2xl"], [48, "3xl"], [64, "giant"], [88, "xgiant"], [144, "2xgiant"]];
const PADDING_PX = [[0, "none"], [2, "3xs"], [4, "2xs"], [8, "xs"], [12, "sm"], [16, "md"], [20, "lg"], [24, "xl"], [32, "2xl"], [40, "3xl"], [48, "4xl"]];
const LONG_TO_SHORT = { "3-xsmall": "3xs", "3xsmall": "3xs", "2-xsmall": "2xs", "2xsmall": "2xs", xsmall: "xs", small: "sm", medium: "md", large: "lg", xlarge: "xl", "2-xlarge": "2xl", "2xlarge": "2xl", "3-xlarge": "3xl", "3xlarge": "3xl", "4-xlarge": "4xl", "4xlarge": "4xl" };

/** A spacing step: from its variable's name ("Spacing/Gap/Medium" → md) or the nearest step to the px value. */
function spacingStep(variable, px, table) {
  if (variable) {
    const last = variable.split("/").pop().trim().toLowerCase().replace(/\s+/g, "-");
    const step = LONG_TO_SHORT[last] ?? last;
    if (table.some(([, key]) => key === step)) return step;
  }
  if (typeof px !== "number") return null;
  return table.reduce((best, entry) => (Math.abs(entry[0] - px) < Math.abs(best[0] - px) ? entry : best))[1];
}

/** "medium" and "md" are one step; other values compare as they are. */
const sameValue = (a, b) => a === b || (typeof a === "string" && typeof b === "string" && (LONG_TO_SHORT[a] ?? a) === (LONG_TO_SHORT[b] ?? b));

/**
 * The code props of an instance (or a nested one) that differ from the component's code default (docs/api; the Figma
 * set's default when the code has none); `children` its label text.
 */
function instanceProps(item, set, mapping, notes, where) {
  const props = {};
  const used = new Set();
  const defaults = mapping.apiProps[set.code];
  const isDefault = (prop, codeValue, figmaName, figmaValue) => (defaults?.get(prop) !== undefined ? sameValue(codeValue, defaults.get(prop)) : figmaValue === set.defaults[figmaName]);
  for (const entry of set.own) {
    const figmaName = entry.label ?? entry.prop;
    const value = item.props?.[figmaName];
    if (value === undefined) continue;
    used.add(figmaName);
    if (entry.type === "VARIANT") {
      const code = entry.options?.[value];
      if (code === undefined) { notes.push(`${where}: ${figmaName} "${value}" has no Zen value`); continue; }
      const codeValue = code === "true" ? true : code === "false" ? false : code;
      if (!isDefault(entry.prop, codeValue, figmaName, value)) props[entry.prop] = literal(codeValue);
      continue;
    }
    if (entry.type === "BOOLEAN") { if (!isDefault(entry.prop, Boolean(value), figmaName, value)) props[entry.prop] = literal(Boolean(value)); continue; }
    if (value === set.defaults[figmaName]) continue;
    if (entry.type === "TEXT") props[entry.prop] = literal(String(value));
    else if (entry.type === "INSTANCE_SWAP") {
      if (/^icon-[a-z0-9-]+$/.test(String(value))) props[entry.prop] = literal(String(value));
      else notes.push(`${where}: ${figmaName} swaps in "${value}", not a Zen icon`);
    }
  }
  for (const toggle of set.toggles ?? []) {
    const value = item.props?.[toggle.label];
    if (value === undefined) continue;
    used.add(toggle.label);
    if (value === set.defaults[toggle.label] || value !== true) continue;
    if (typeof toggle.on === "string" && toggle.on !== "slot") props[toggle.prop] = literal(toggle.on);
    else notes.push(`${where}: ${toggle.label} on needs content the design does not carry (${toggle.prop})`);
  }
  // Several Figma sets for one component (Button/Main, Button/Flat): the set is a code prop (appearance).
  if (set.setProp) {
    const codeDefault = defaults?.get(set.setProp);
    if (codeDefault !== undefined ? !sameValue(set.setValue, codeDefault) : set.setValue !== set.setDefault) props[set.setProp] = literal(set.setValue);
  }
  // The label: a text property no entry maps, or the instance's first text, when the component takes children.
  if (!defaults || defaults.has("children")) {
    const label = Object.entries(item.props ?? {}).find(([name, value]) => !used.has(name) && TEXT_PROPS.test(name) && typeof value === "string")?.[1] ?? item.text;
    if (typeof label === "string" && label.trim()) props.children = literal(label);
  }
  return props;
}

function convert(node, mapping, notes) {
  if (!node) return null;
  if (node.type === "TEXT") {
    const props = {};
    if (node.textStyle) {
      if (!mapping.textStyles || mapping.textStyles.has(node.textStyle)) props.textStyle = literal(node.textStyle);
      else notes.push(`Text "${node.name}": text style "${node.textStyle}" is not a Zen text style`);
    }
    return { kind: "element", name: "Text", props, children: [{ kind: "text", value: node.characters ?? "" }] };
  }
  if (node.type === "INSTANCE") {
    const set = node.set ? mapping.sets.get(node.set.id) ?? mapping.sets.get(node.set.name) : null;
    if (!set) { notes.push(`"${node.name}" (${node.set?.name ?? "no main component"}) has no Zen component: left out`); return null; }
    const props = instanceProps(node, set, mapping, notes, `${set.code} "${node.name}"`);
    const children = props.children ? [{ kind: "text", value: props.children.value }] : [];
    delete props.children;
    const overrides = {};
    for (const nested of node.nested ?? []) {
      const inner = nested.set ? mapping.sets.get(nested.set.id) ?? mapping.sets.get(nested.set.name) : null;
      if (!inner) { notes.push(`${set.code} "${node.name}" › ${nested.path}: ${nested.set?.name ?? "?"} has no Zen component`); continue; }
      const fields = instanceProps(nested, inner, mapping, notes, `${set.code} › ${nested.path}`);
      if (Object.keys(fields).length) overrides[nested.path] = { kind: "object", fields };
    }
    if (Object.keys(overrides).length) props.overrides = { kind: "object", fields: overrides };
    // A layer Figma shows with a boolean of its name (Card's Sub-Action) that the code draws only when a prop is set.
    for (const layer of new Set((node.nested ?? []).map((nested) => nested.path.split("/")[0]))) {
      if (node.props?.[layer] === true && !set.toggles?.some((toggle) => toggle.label === layer)) notes.push(`${set.code} "${node.name}": ${layer} shows in Figma; set it on the ${set.code} in the Studio (its overrides apply once it is there)`);
    }
    return { kind: "element", name: set.code, props, children };
  }
  const children = (node.children ?? []).map((child) => convert(child, mapping, notes)).filter(Boolean);
  const props = {};
  const layout = node.layout;
  if (layout) {
    if (layout.mode === "HORIZONTAL") props.direction = literal("row");
    const gap = spacingStep(layout.gapVar, layout.gap, GAP_PX);
    if (gap && gap !== "none") props.gap = literal(gap);
    const pads = layout.padding ?? [];
    if (pads.length && new Set(pads).size > 1) notes.push(`Frame "${node.name}": padding ${pads.join("/")} differs by side; the Stack takes ${Math.max(...pads)}`);
    const padding = spacingStep(layout.paddingVar, pads.length ? Math.max(...pads) : undefined, PADDING_PX);
    if (padding && padding !== "none") props.padding = literal(padding);
    const align = { CENTER: "center", MAX: "end", BASELINE: "baseline" }[layout.counter];
    if (align) props.align = literal(align);
    const justify = { CENTER: "center", MAX: "end", SPACE_BETWEEN: "between" }[layout.primary];
    if (justify) props.justify = literal(justify);
    if (layout.wrap) props.wrap = literal(true);
  } else if (children.length) notes.push(`Frame "${node.name}" has no auto layout: its layers are stacked in order`);
  return { kind: "element", name: "Stack", props, children };
}

/** The frame's device: a phone up to 480 px wide, a tablet up to 1100, else a desktop. */
const deviceOf = (width) => (typeof width === "number" && width <= 480 ? "phone" : typeof width === "number" && width <= 1100 ? "tablet" : "desktop");

/** The frame (figmaReadCode's JSON) as a page: { text, notes }. The frame's own layout is the screen's Stack. */
export function pageFromFigma(frame, { title = frame?.name ?? "From Figma", mapping }) {
  const notes = [];
  const root = convert(frame, mapping, notes);
  const content = root ? (root.name === "Stack" ? root : { kind: "element", name: "Stack", props: {}, children: [root] }) : null;
  const screen = { kind: "element", name: "Screen", props: { id: literal("screen-1"), title: literal(title), device: literal(deviceOf(frame?.width)) }, children: content ? [content] : [] };
  const doc = { header: { format: 1, title }, mock: {}, board: { kind: "element", name: "Board", props: {}, children: [screen] } };
  return { text: printPage(doc), notes };
}

/* ── CLI ────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** The repo's mapping data (Node: the generated TS is plain enough for type stripping). */
export async function repoMapping(root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")) {
  const { FIGMA_PROPS } = await import(pathToFileURL(path.join(root, "src/platform/studio/inspector/figmaProps.generated.ts")).href);
  const contract = JSON.parse(fs.readFileSync(path.join(root, "docs/figma-contracts/component-properties.json"), "utf8"));
  const apiProps = {};
  for (const file of fs.readdirSync(path.join(root, "docs/api")).filter((name) => name.endsWith(".json"))) {
    const doc = JSON.parse(fs.readFileSync(path.join(root, "docs/api", file), "utf8"));
    for (const component of doc.components ?? []) {
      apiProps[component.name] = new Map((component.props ?? []).map((prop) => {
        let value;
        try { value = prop.default === null || prop.default === undefined ? undefined : JSON.parse(prop.default); } catch { value = undefined; }
        return [prop.name, value];
      }));
    }
  }
  const { typographyStyles } = await import(pathToFileURL(path.join(root, "src/tokens/typography.generated.ts")).href).catch(() => ({ typographyStyles: null }));
  return figmaMapping({ figmaProps: FIGMA_PROPS, contract, apiProps, textStyles: typographyStyles ? Object.keys(typographyStyles) : null });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [command, arg] = process.argv.slice(2);
  const option = (name) => process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (command === "code" && arg) console.log(figmaReadCode(arg));
  else if (command === "page" && arg) {
    const frame = JSON.parse(fs.readFileSync(arg, "utf8"));
    const { text, notes } = pageFromFigma(typeof frame === "string" ? JSON.parse(frame) : frame, { title: option("title"), mapping: await repoMapping() });
    if (option("out")) fs.writeFileSync(option("out"), text);
    else process.stdout.write(text);
    for (const note of notes) console.error(`note: ${note}`);
  } else {
    console.error("usage: figma-pull.mjs code <nodeId> | page <frame.json> [--title=…] [--out=<file.zen.tsx>]");
    process.exit(1);
  }
}
