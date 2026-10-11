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
//   Text. What has no Zen mapping is left out and named in `notes`. Every element's document id comes from its Figma
//   layer and the header names the frame, so Import pages… in the Studio keeps them, and importing a later pull of the
//   same frame opens Update from Figma (figma-diff.mjs) instead of making a second page.
//
//   node tools/studio/figma-pull.mjs code <nodeId> [--part=N]   print the use_figma code for that frame (part N, from 0)
//   node tools/studio/figma-pull.mjs page <part files…> [--title=…] [--file=<key>] [--out=<file.zen.tsx>] [--no-ids]
//                                                              use_figma's answers → the page to import
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

/**
 * The use_figma code that returns the frame `nodeId` as JSON (read-only: it changes nothing in the file). A use_figma
 * answer holds at most 20 KB: the JSON comes in parts of PART_SIZE characters, `part` picks one ("PART 1/2" then the
 * text); `joinParts` puts them back together.
 */
export function figmaReadCode(nodeId, { part = 0 } = {}) {
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
// A composition of library components (Patterns/…, Header/…) is read inside, as a frame.
const COMPOSITION = /^(Patterns|Header|Templates?|Layouts?|Screens?)\\//;
const readInstance = async (instance) => {
  const set = await setOf(instance);
  if (set && COMPOSITION.test(set.name)) return { ...(await readFrame(instance)), type: "FRAME", composition: set.name };
  const out = { type: "INSTANCE", id: instance.id, name: instance.name, set, props: await propsOf(instance), text: firstText(instance), nested: [], slots: [] };
  const changed = new Set((instance.overrides || []).filter((o) => o.overriddenFields.some((f) => f === "componentProperties" || f === "characters")).map((o) => o.id));
  const walk = async (node, trail) => {
    for (const child of node.children || []) {
      if (!child.visible) continue;
      // The instance's own slot (Card › Content): its layers are the page's content, read as such.
      if (child.type === "SLOT" && !trail.length) {
        const children = [];
        for (const inner of child.children || []) { const read_ = await read(inner); if (read_) children.push(placed(read_, inner, child)); }
        const layout = await layoutOf(child);
        const slot = placed({ id: child.id, name: child.name, ...(layout ? { layout } : {}), children }, child, node);
        // Slots side by side in a frame of the instance (Dashboard/Header's Leading and Trailing): that frame's layout.
        if (node !== instance) {
          slot.parent = node.name;
          out.rows = out.rows || {};
          if (!(node.name in out.rows)) { out.rows[node.name] = await layoutOf(node); out.rowIds = out.rowIds || {}; out.rowIds[node.name] = node.id; }
        }
        out.slots.push(slot);
        continue;
      }
      const next = child.type === "INSTANCE" ? [...trail, layerKey(child.name)] : trail;
      if (child.type === "INSTANCE" && changed.has(child.id)) out.nested.push({ path: next.join("/"), set: await setOf(child), props: await propsOf(child), text: firstText(child) });
      await walk(child, next);
    }
  };
  await walk(instance, []);
  // Empty parts left out: an answer holds 20 KB. With slots, its layout (how they sit, for a set Zen has no component of).
  if (!out.nested.length) delete out.nested;
  if (!out.slots.length) delete out.slots;
  else { const layout = await layoutOf(instance); if (layout) out.layout = layout; }
  if (out.text === null) delete out.text;
  return out;
};
const read = async (node) => {
  if (!node.visible) return null;
  if (node.type === "TEXT") {
    const style = typeof node.textStyleId === "string" && node.textStyleId ? await figma.getStyleByIdAsync(node.textStyleId) : null;
    // The layer's name only when it is not its text (Figma names a text layer after its words).
    const align = node.textAlignHorizontal && node.textAlignHorizontal !== "LEFT" ? { align: node.textAlignHorizontal } : {};
    return { type: "TEXT", id: node.id, ...(node.name === node.characters ? {} : { name: node.name }), characters: node.characters, textStyle: style ? style.name : null, ...align };
  }
  if (node.type === "INSTANCE") return readInstance(node);
  return readFrame(node);
};
// Its auto layout without the values at Figma's defaults (none: null).
const layoutOf = async (node) => {
  if (!("layoutMode" in node) || node.layoutMode === "NONE") return null;
  const bound = node.boundVariables || {};
  const layout = { mode: node.layoutMode };
  if (node.itemSpacing) layout.gap = node.itemSpacing;
  const gapVar = await variableName(bound.itemSpacing && bound.itemSpacing.id);
  if (gapVar) layout.gapVar = gapVar;
  const padding = [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft];
  if (padding.some(Boolean)) layout.padding = padding;
  const paddingVar = await variableName((bound.paddingTop || bound.paddingLeft || {}).id);
  if (paddingVar) layout.paddingVar = paddingVar;
  if (node.primaryAxisAlignItems !== "MIN") layout.primary = node.primaryAxisAlignItems;
  if (node.counterAxisAlignItems !== "MIN") layout.counter = node.counterAxisAlignItems;
  if (node.layoutWrap === "WRAP") layout.wrap = true;
  if (node.layoutMode === "GRID") layout.grid = { columns: node.gridColumnCount, rows: node.gridRowCount, rowGap: node.gridRowGap, columnGap: node.gridColumnGap };
  return layout;
};
// A drawing (vector, shape) by its type and name only: the page has no layer for it.
const DRAWING = new Set(["VECTOR", "RECTANGLE", "ELLIPSE", "LINE", "STAR", "POLYGON", "BOOLEAN_OPERATION"]);
// A child that fills its auto-layout parent on an axis (Figma's Fill container), or one placed outside the auto layout
// (Ignore auto layout): its constraints and its box in the parent's.
const placed = (out, child, parent) => {
  if (!("layoutMode" in parent) || parent.layoutMode === "NONE" || parent.layoutMode === "GRID") return out;
  if (child.layoutPositioning === "ABSOLUTE") {
    out.absolute = { x: Math.round(child.x), y: Math.round(child.y), w: Math.round(child.width), h: Math.round(child.height), pw: Math.round(parent.width), ph: Math.round(parent.height), cx: child.constraints.horizontal, cy: child.constraints.vertical };
    return out;
  }
  if (child.layoutSizingHorizontal === "FILL") out.fillW = true;
  if (child.layoutSizingVertical === "FILL") out.fillH = true;
  return out;
};
// A frame of the Table's rows (Primitives/Table/Data-Row instances, Figma's Table): one table, cell by cell. A row of
// Table/Cell/Header cells is the header; each other cell gives its content primitive (Text-Cell, Badge-Cell…), its texts,
// its width (or Fill) and alignment, and the Zen instances it draws (a Badge, a Dock-Icon, with the text in each).
const readTable = async (node, rows, root) => {
  const out = { type: "TABLE", id: node.id, name: node.name, ...frameOf(node, root), header: null, rows: [] };
  for (const row of rows) {
    const slot = row.findOne((n) => n.type === "SLOT");
    const cells = [];
    let header = false;
    for (const cell of (slot ? slot.children : []).filter((child) => child.visible)) {
      const set = await setOf(cell);
      const props = await propsOf(cell);
      const base = { id: cell.id, w: Math.round(cell.width), ...(cell.layoutSizingHorizontal === "FILL" ? { fill: true } : {}), ...(props.Align && props.Align !== "Left" ? { align: props.Align } : {}) };
      if (set && set.name.endsWith("Table/Cell/Header")) {
        header = true;
        const named = Object.entries(props).find(([key, value]) => key.endsWith("Label") && typeof value === "string");
        const swap = Object.entries(props).find(([key]) => key.endsWith("-Src"));
        cells.push({ ...base, label: props.Label === false ? "" : named ? named[1] : firstText(cell) || "", ...(props.Type === "Sort" ? { sort: true } : {}), ...(props.Icon === true && swap ? { icon: swap[1] } : {}) });
        continue;
      }
      let kind = null;
      let kindProps = {};
      const parts = [];
      for (const inner of cell.findAll((n) => n.type === "INSTANCE" && n.visible)) {
        const innerSet = await setOf(inner);
        if (!innerSet || /^(icon|ic)-/.test(innerSet.name)) continue;
        if (innerSet.name.startsWith("Primitives/Table/Cell/")) { if (!kind) { kind = innerSet.name.split("/").pop(); kindProps = await propsOf(inner); } continue; }
        const text = firstText(inner);
        parts.push({ id: inner.id, set: innerSet, props: await propsOf(inner), ...(text !== null ? { text } : {}) });
      }
      cells.push({ ...base, kind, props: kindProps, ...(props["Open-Button"] === true ? { open: true } : {}), texts: cell.findAll((t) => t.type === "TEXT" && t.visible).map((t) => t.characters), ...(parts.length ? { parts } : {}) });
    }
    if (header && !out.header) out.header = cells;
    else out.rows.push({ id: row.id, cells });
  }
  return out;
};
// The frame read: its file (a pulled page remembers where it came from) and its size (the page's device).
const frameOf = (node, root) => (root ? { ...(typeof figma.fileKey === "string" ? { file: figma.fileKey } : {}), width: Math.round(node.width), height: Math.round(node.height) } : {});
const readFrame = async (node, root = false) => {
  if (DRAWING.has(node.type)) return { type: node.type, name: node.name };
  const visible = (node.children || []).filter((child) => child.visible);
  if (visible.length && visible.every((child) => child.type === "INSTANCE")) {
    const sets = await Promise.all(visible.map(setOf));
    if (sets.every((set) => set && set.name === "Primitives/Table/Data-Row")) return readTable(node, visible, root);
  }
  const out = { type: node.type, id: node.id, name: node.name, ...frameOf(node, root), children: [] };
  const layout = await layoutOf(node);
  if (layout) out.layout = layout;
  for (const child of node.children || []) {
    const read_ = await read(child);
    if (!read_) continue;
    // A grid's child: its cell (column and row from 0, its spans).
    if (node.layoutMode === "GRID") read_.cell = { col: child.gridColumnAnchorIndex, row: child.gridRowAnchorIndex, span: child.gridColumnSpan, rowSpan: child.gridRowSpan };
    else placed(read_, child, node);
    out.children.push(read_);
  }
  return out;
};
const node = await figma.getNodeByIdAsync(${JSON.stringify(nodeId)});
if (!node) throw new Error("No node " + ${JSON.stringify(nodeId)});
// ASCII only (\\uXXXX for the rest): an answer with many non-ASCII characters was cut short in transit.
const json = JSON.stringify(node.type === "INSTANCE" || node.type === "TEXT" ? await read(node) : await readFrame(node, true)).replace(/[\\u0080-\\uffff]/g, (char) => "\\\\u" + char.charCodeAt(0).toString(16).padStart(4, "0"));
const parts = Math.max(1, Math.ceil(json.length / ${PART_SIZE}));
return "PART " + (${part} + 1) + "/" + parts + "\\n" + json.slice(${part} * ${PART_SIZE}, (${part} + 1) * ${PART_SIZE});
`.trim();
}

/** The characters of one part: ASCII (escaped), so one part with its "PART i/n" line stays under use_figma's 20 KB answer. */
export const PART_SIZE = 12000;

/** The frame's JSON from use_figma's answers (one or several "PART i/n" texts, in any order; plain JSON too). */
export function joinParts(texts) {
  const parts = texts.map((text) => {
    const head = /^PART (\d+)\/(\d+)\n/.exec(text);
    return head ? { index: Number(head[1]), count: Number(head[2]), data: text.slice(head[0].length) } : { index: 1, count: 1, data: text };
  }).sort((a, b) => a.index - b.index);
  const count = parts[0]?.count ?? 0;
  if (parts.length !== count || parts.some((item, at) => item.index !== at + 1)) throw new Error(`figma-pull: ${parts.length} of ${count} parts given`);
  return JSON.parse(parts.map((item) => item.data).join(""));
}

/* ── mapping data ───────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * The Figma → code mapping from the repo's data: `figmaProps` (inspector/figmaProps.generated.ts FIGMA_PROPS), `contract`
 * (docs/figma-contracts/component-properties.json: each set's id, name and property defaults) and `apiProps` (component
 * → Map of its code props to their code default, from docs/api). Sets are found by id and by name. `dataSlots` (slots/dataSlots.ts
 * DATA_SLOTS): the Figma slots whose items the code takes as data (Sidebar sections, Breadcrumbs items).
 */
export function figmaMapping({ figmaProps, contract, apiProps = {}, textStyles = null, iconNames = null, dataSlots = {} }) {
  const contractSets = new Map();
  for (const page of contract.pages ?? []) for (const set of page.sets ?? []) { contractSets.set(set.id, set); contractSets.set(set.name, set); }
  const sets = new Map();
  const register = (set, entry) => { if (set) { sets.set(set.id, entry); sets.set(set.name, entry); } };
  const defaultsOf = (set) => Object.fromEntries((set?.props ?? []).map((prop) => [prop.name, prop.default]));
  for (const [code, props] of Object.entries(figmaProps)) {
    const own = props.own.filter((item) => item.type !== "SET");
    const choice = props.own.find((item) => item.type === "SET");
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
  // A set whose only property is its data slot (Breadcrumbs: Item-List, a one-option Size) has no FIGMA_PROPS entry.
  for (const [code, slots] of Object.entries(dataSlots)) {
    for (const slot of slots) {
      const set = slot.figma && contractSets.get(slot.figma.node);
      if (set && !sets.has(set.id)) register(set, { code, own: [], toggles: [], defaults: defaultsOf(set) });
    }
  }
  return { sets, apiProps, textStyles: textStyles ? new Set(textStyles) : null, iconNames: iconNames ? new Set(iconNames) : null, dataSlots };
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

/** A Zen icon name: in the icon set (src/icons/generated/names.ts: icon-…, and the ic-… brand marks), else by its prefix. */
const isZenIcon = (name, mapping) => (mapping.iconNames ? mapping.iconNames.has(name) : /^(icon|ic)-[a-z0-9-]+$/.test(name));

/** "medium" and "md" are one step; other values compare as they are. */
const sameValue = (a, b) => a === b || (typeof a === "string" && typeof b === "string" && (LONG_TO_SHORT[a] ?? a) === (LONG_TO_SHORT[b] ?? b));

/**
 * The code props of an instance (or a nested one) that differ from the component's code default (docs/api; the Figma
 * set's default when the code has none); `children` its label text.
 */
function instanceProps(item, set, mapping, notes, where) {
  const props = {};
  const used = new Set();
  const swaps = new Map();
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
    if (entry.type === "INSTANCE_SWAP") {
      // Held until the toggles are read: a swap shows only while its toggle (Leading-Icon) is on.
      const icon = String(value);
      swaps.set(entry.prop, { figmaName, icon, zen: isZenIcon(icon, mapping), isDefault: value === set.defaults[figmaName] });
      continue;
    }
    if (value === set.defaults[figmaName]) continue;
    if (entry.type === "TEXT") props[entry.prop] = literal(String(value));
  }
  const toggled = new Set();
  for (const toggle of set.toggles ?? []) {
    const value = item.props?.[toggle.label];
    if (value === undefined) continue;
    used.add(toggle.label);
    toggled.add(toggle.prop);
    if (value !== true) continue;
    // On: the icon its swap property holds (the default too: without the prop the code draws none), else its `on`.
    const swap = swaps.get(toggle.prop);
    if (swap) {
      if (swap.zen) props[toggle.prop] = literal(swap.icon);
      else notes.push(`${where}: ${swap.figmaName} swaps in "${swap.icon}", not a Zen icon (left out)`);
      continue;
    }
    if (value === set.defaults[toggle.label]) continue;
    if (typeof toggle.on === "string" && toggle.on !== "slot") props[toggle.prop] = literal(toggle.on);
    else notes.push(`${where}: ${toggle.label} on needs content the design does not carry (${toggle.prop})`);
  }
  // A swap no toggle governs: written when it differs from Figma's default.
  for (const [prop, swap] of swaps) {
    if (toggled.has(prop) || swap.isDefault) continue;
    if (swap.zen) props[prop] = literal(swap.icon);
    else notes.push(`${where}: ${swap.figmaName} swaps in "${swap.icon}", not a Zen icon (left out)`);
  }
  // Several Figma sets for one component (Button/Main, Button/Flat): the set is a code prop (appearance).
  if (set.setProp) {
    const codeDefault = defaults?.get(set.setProp);
    if (codeDefault !== undefined ? !sameValue(set.setValue, codeDefault) : set.setValue !== set.setDefault) props[set.setProp] = literal(set.setValue);
  }
  // The label: a text property no entry maps, or the instance's first text, when the component takes children.
  // A field (Search, an input) takes it as its placeholder.
  const label = Object.entries(item.props ?? {}).find(([name, value]) => !used.has(name) && TEXT_PROPS.test(name) && typeof value === "string")?.[1] ?? item.text;
  if (typeof label === "string" && label.trim()) {
    if (!defaults || defaults.has("children")) props.children = literal(label);
    else if (defaults.has("placeholder")) props.placeholder = literal(label);
  }
  return props;
}

/** Figma slots a component takes as a node prop, not as its children (Sidebar: Header-Content, Footer-Content). */
const SLOT_PROPS = { Sidebar: { "Header-Content": "brand", "Footer-Content": "footer" } };
/** Primitive rows that stand as code elements where the code takes nodes (Sidebar footer: `<SidebarMenuItem>`). */
const ROW_ELEMENTS = { "Primitives/Side-Bar/Menu-Item/Master": "SidebarMenuItem" };
/** The prop that names a data slot's selected item (Figma's Select = Yes on the item). */
const SELECTED_PROP = { Sidebar: "selectedId", Segmented: "defaultValue", Tabs: "defaultValue" };
/** An item's icon field where it is not `icon` (SegmentedOption `leading`). */
const ITEM_ICON = { Segmented: "leading" };
/* ── tables ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Figma's cell primitives (Primitives/Table/Cell/…) → the code Table's column `content` (Table.tsx TableCellContent). */
const CELL_CONTENT = { "Text-Cell": "text", "Editabled-Cell": "text", "Dock-Icon-Cell": "dock-icon", "Basic-Icon-Cell": "icon", "Avatar-Cell": "avatar", "Photo-Cell": "photo", "Badge-Cell": "badge", "Tag-Cell": "tag", "Trend-Cell": "trend", "Progress-Cell": "progress" };
/** Cells that draw a picture beside their label (its text is the picture's: an emoji, not the label). */
const MEDIA_CONTENT = new Set(["avatar", "photo", "icon", "dock-icon"]);
/**
 * What the code's Table draws in its cells (Table.tsx cellOf / cellVisual): the layer name its `overrides` use and the
 * props it gives the component. A Figma instance that differs (a yellow Badge, an emoji Dock-Icon) is written as that
 * row's override.
 */
const TABLE_DRAWS = {
  Badge: { layer: "Badge", props: { size: "medium", theme: "neutral", background: "subtle", leadingIcon: false } },
  DockIcon: { layer: "Dock-Icon", props: { size: "xs", theme: "neutral", background: "subtle" } },
};

/**
 * Figma's Table (a frame of Primitives/Table/Data-Row instances, read by figmaReadCode as one TABLE) → the code's
 * <Table>: a column per header cell (its label, Sort, Align, a fixed width or Fill; its content from the first row's cell
 * primitive, Bold and Subtext from it), the rows written in the Table (as a design copy writes them: a later pull of the
 * frame compares them as the Table's prop, figma-diff.mjs), and each row's Zen instances that differ from
 * what the Table draws as `overrides` by layer ("Row[row-1]/status/Badge"). A cell the Table has no content for (Actions,
 * a Radio) leaves its column out, with a note.
 */
function tableElement(node, ctx) {
  const { mapping, notes } = ctx;
  const where = `Table "${node.name}"`;
  const header = node.header ?? [];
  const sample = node.rows[0]?.cells ?? [];
  const ids = new Set();
  const columns = [];
  for (let index = 0; index < Math.max(header.length, sample.length); index += 1) {
    const head = header[index] ?? {};
    const cell = sample[index] ?? {};
    const content = cell.kind === "Control-Cell" ? { Checkbox: "checkbox", Toggle: "toggle" }[cell.props?.Type] ?? null : cell.kind ? CELL_CONTENT[cell.kind] ?? null : "text";
    const named = head.label ? `the “${head.label}” column` : `column ${index + 1}`;
    if (!content) { notes.push(`${where}: ${named} (${cell.kind}${cell.props?.Type ? ` ${cell.props.Type}` : ""}) has no Table content in code: left out`); continue; }
    const id = uniqueId(slug(head.label || `column ${index + 1}`), ids);
    const fields = { id: literal(id), header: literal(head.label ?? "") };
    if (head.sort) fields.sortable = literal(true);
    if ((cell.align ?? head.align) === "Right") fields.align = literal("right");
    if (!(cell.fill ?? head.fill) && (cell.w ?? head.w)) fields.width = literal(`${cell.w ?? head.w}px`);
    if (content !== "text") fields.content = literal(content);
    if (cell.props?.Bold === "Yes") fields.bold = literal(true);
    const caption = cell.props?.Subtext === "Yes" || cell.props?.Caption === true;
    if (caption) fields.captionField = literal(`${id}Caption`);
    if (head.icon) {
      if (isZenIcon(head.icon, mapping)) fields.icon = literal(head.icon);
      else notes.push(`${where}: ${named}'s header icon "${head.icon}" is not a Zen icon (left out)`);
    }
    columns.push({ index, id, content, caption, fields });
  }
  // The rows: each cell's value under its column's id.
  const overrides = {};
  const rows = node.rows.map((row, at) => {
    const rowId = `row-${at + 1}`;
    const record = { id: rowId };
    for (const column of columns) {
      const cell = row.cells[column.index];
      if (!cell) continue;
      const parts = cell.parts ?? [];
      const own = new Set(parts.map((part) => part.text).filter((text) => typeof text === "string"));
      const texts = (cell.texts ?? []).map((text) => text.replace(/\u2028/g, " "));
      if (column.content === "badge" || column.content === "tag") {
        const items = parts.filter((part) => /^(Badge|Tag)\b/.test(part.set?.name ?? "")).map((part) => part.props?.Text ?? part.text ?? "");
        record[column.id] = items.length === 1 ? items[0] : items.length ? items : texts[0] ?? "";
      } else if (column.content === "progress") {
        record[column.id] = Number.parseFloat(texts[0] ?? "") || 0;
      } else if (column.content === "checkbox" || column.content === "toggle") {
        record[column.id] = parts.some((part) => part.props?.State === "Checked" || part.props?.Checked === true || part.props?.Select === "Yes");
      } else {
        // A picture's own text (an emoji Dock-Icon's) is not the label.
        const shown = MEDIA_CONTENT.has(column.content) ? texts.filter((text) => !own.has(text)) : texts;
        record[column.id] = shown[0] ?? "";
        if (column.caption && shown[1]) record[`${column.id}Caption`] = shown[1];
      }
      // The Zen instances the cell draws, where Figma's differ from the Table's: that row's overrides.
      const drawn = parts.map((part) => ({ part, set: mapping.sets.get(part.set?.id) ?? mapping.sets.get(part.set?.name) })).filter(({ set }) => set && TABLE_DRAWS[set.code]);
      drawn.forEach(({ part, set }, index) => {
        const draws = TABLE_DRAWS[set.code];
        const figma = instanceProps(part, set, mapping, notes, `${where} › ${column.id}`);
        const defaults = mapping.apiProps[set.code];
        const fields = {};
        for (const [prop, value] of Object.entries(draws.props)) {
          const mine = figma[prop]?.value ?? defaults?.get(prop);
          if (mine !== undefined && !sameValue(mine, value)) fields[prop] = literal(mine);
        }
        for (const [prop, value] of Object.entries(figma)) if (!(prop in draws.props) && prop !== "children") fields[prop] = value;
        // An emoji Dock-Icon draws its emoji (the instance's text), not an icon.
        if (fields.theme?.value === "emoji") { delete fields.icon; if (part.text) fields.emoji = literal(part.text); }
        if (Object.keys(fields).length) overrides[`Row[${rowId}]/${column.id}/${draws.layer}${drawn.length > 1 ? `[${index}]` : ""}`] = { kind: "object", fields };
      });
    }
    return record;
  });
  // Its accessible name: the frame's, unless Figma's default ("Table-Rows" reads as "Table rows").
  const label = node.name.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  const props = { "aria-label": literal(label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()), columns: { kind: "array", items: columns.map((column) => ({ kind: "object", fields: column.fields })) }, rows: { kind: "array", items: rows.map((row) => ({ kind: "object", fields: Object.fromEntries(Object.entries(row).map(([name, value]) => [name, Array.isArray(value) ? { kind: "array", items: value.map(literal) } : literal(value)])) })) } };
  if (Object.keys(overrides).length) props.overrides = { kind: "object", fields: overrides };
  return { kind: "element", name: "Table", props, children: [] };
}

/** Icon-only controls the harness wants named (icon-button/needs-name): they get an aria-label. */
const NEEDS_NAME = new Set(["IconButton"]);
/** The elements that take Figma's resizing (width / height fill), src/components/Layout/sizing.ts. */
const SIZED = new Set(["Stack", "Grid", "Text"]);
/** Layers the page has no element for: drawings, kept out with one note. */
const DRAWINGS = new Set(["VECTOR", "RECTANGLE", "ELLIPSE", "LINE", "STAR", "POLYGON", "BOOLEAN_OPERATION"]);

const slug = (text) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
/** The id once per page: the second "Component" is component-2. */
function uniqueId(base, ids) {
  let id = base;
  for (let n = 2; ids.has(id); n += 1) id = `${base}-${n}`;
  ids.add(id);
  return id;
}
/** "icon-moon-01-solid" → "Moon": the name an icon-only item reads by. */
const iconWords = (icon) => {
  const words = icon.replace(/^(icon|ic)-/, "").replace(/(-\d+)?-(line|solid|duotone)$/, "").replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * A data item (or a row element's props) from a primitive instance (Menu-Item, Breadcrumb Item, Segment): its id, its
 * label (empty with Label off, then an aria-label from its icon) and its icon (Icon-Src while its Icon toggle is on).
 */
function itemFields(item, ctx, { labelKey = "label", iconKey = "icon", where }) {
  const props = item.props ?? {};
  const text = Object.entries(props).find(([name, value]) => TEXT_PROPS.test(name) && typeof value === "string")?.[1] ?? item.text ?? "";
  const label = props.Label === false ? "" : text;
  const iconSrc = Object.entries(props).find(([name]) => /^(Leading-)?Icon-Src$/.test(name))?.[1];
  const iconOn = Object.entries(props).find(([name]) => /^(Leading-)?Icon$/.test(name))?.[1];
  const icon = typeof iconSrc === "string" && iconOn !== false ? iconSrc : null;
  const fields = { id: literal(uniqueId(slug(label || (icon ? iconWords(icon) : "item")), ctx.ids)), [labelKey]: literal(label) };
  if (icon && isZenIcon(icon, ctx.mapping)) fields[iconKey] = literal(icon);
  else if (icon) ctx.notes.push(`${where} "${label || item.name}": Icon-Src "${icon}" is not a Zen icon (left out)`);
  if (!label) {
    fields["aria-label"] = literal(icon ? iconWords(icon) : item.name);
    ctx.notes.push(`${where} "${item.name}": no label shows in Figma; its aria-label "${fields["aria-label"].value}" comes from ${icon ? "its icon" : "its layer"}`);
  }
  if (props.Dropdown === true) ctx.notes.push(`${where} "${label}": Figma shows its dropdown; the design has no sub-items to write`);
  return fields;
}

/** The instances of a slot, frames looked into (Breadcrumbs' Item-List, a section's rows). */
const rowsOf = (nodes) => nodes.flatMap((node) => (node.type === "INSTANCE" ? [node] : rowsOf(node.children ?? [])));
const isSelected = (item) => ["Select", "Selected", "Active"].some((name) => item.props?.[name] === "Yes" || item.props?.[name] === true);

/**
 * A data slot's items (src/platform/studio/slots/dataSlots.ts) from its Figma instances: the array the prop holds, and
 * the id of the item Figma shows selected. A nested slot (Sidebar `sections[n].items`): each frame a section, its
 * Section-Title's text the label, its other rows the list.
 */
function dataSlotValue(slot, dataSlot, ctx, where) {
  const labelKey = /\btitle:/.test(dataSlot.newItem(0).code) ? "title" : "label";
  const iconKey = ITEM_ICON[dataSlot.component] ?? "icon";
  let selected = null;
  const toItem = (item) => {
    const fields = itemFields(item, ctx, { labelKey, iconKey, where: `${where} › ${dataSlot.itemName}` });
    if (isSelected(item)) selected ??= fields.id.value;
    return { kind: "object", fields };
  };
  if (!dataSlot.nested) return { value: { kind: "array", items: rowsOf(slot.children ?? []).map(toItem) }, selected };
  // Rows straight in the slot form a section of their own, each frame one.
  const groups = [];
  for (const child of slot.children ?? []) {
    if (child.type === "INSTANCE") {
      if (!groups.at(-1)?.loose) groups.push({ loose: true, rows: [] });
      groups.at(-1).rows.push(child);
    } else groups.push({ rows: rowsOf(child.children ?? []) });
  }
  const sections = groups.map(({ rows }) => {
    const title = rows.find((row) => /Section-Title$/.test(row.set?.name ?? ""));
    const fields = {};
    if (title) fields.label = literal(title.text ?? "");
    fields[dataSlot.nested] = { kind: "array", items: rows.filter((row) => row !== title).map(toItem) };
    return { kind: "object", fields };
  });
  return { value: { kind: "array", items: sections }, selected };
}

/** A slot's layers as one node: the one layer, or a Stack of them in the slot's layout (none: null). */
function slotContent(slot, ctx) {
  const nodes = (slot.children ?? []).map((child) => convert(child, ctx)).filter(Boolean);
  if (nodes.length <= 1) return nodes[0] ?? null;
  const element = frameElement({ name: slot.name, layout: slot.layout }, nodes, ctx);
  if (slot.id) element.id = figmaDocId(slot.id);
  SOURCE.set(element, slot);
  return element;
}

/** Each element's Figma layer: its parent reads its Fill container from it. */
const SOURCE = new WeakMap();
function convert(node, ctx) {
  let element = convertNode(node, ctx);
  if (element && !element.id && node.id) element.id = figmaDocId(node.id);
  if (element && node.absolute) element = positioned(element, node, ctx);
  if (element && !SOURCE.has(element)) SOURCE.set(element, node);
  return element;
}

/**
 * A layer Figma places outside the auto layout (Ignore auto layout): position="absolute" with its constraints and the
 * insets to its pinned edges (Spacing/Padding steps). A Text or a component is wrapped in a Stack that takes them.
 */
function positioned(element, node, ctx) {
  const box = node.absolute;
  const x = { MIN: "left", MAX: "right", CENTER: "center", STRETCH: "left-right", SCALE: "left-right" }[box.cx] ?? "left";
  const y = { MIN: "top", MAX: "bottom", CENTER: "center", STRETCH: "top-bottom", SCALE: "top-bottom" }[box.cy] ?? "top";
  const props = { position: literal("absolute"), constraintX: literal(x), constraintY: literal(y) };
  const far = [];
  const inset = (prop, px) => {
    const step = spacingStep(null, Math.max(0, px), PADDING_PX);
    if (step !== "none") props[prop] = literal(step);
    const stepPx = PADDING_PX.find(([, key]) => key === step)[0];
    if (Math.abs(stepPx - px) > 8) far.push(`${prop.slice(5).toLowerCase()} ${px} px`);
  };
  if (x === "left" || x === "left-right") inset("insetLeft", box.x);
  if (x === "right" || x === "left-right") inset("insetRight", box.pw - box.x - box.w);
  if (y === "top" || y === "top-bottom") inset("insetTop", box.y);
  if (y === "bottom" || y === "top-bottom") inset("insetBottom", box.ph - box.y - box.h);
  if (far.length) ctx.notes.push(`"${node.name ?? node.characters}" sits outside the auto layout; its ${far.join(", ")} offset is no Zen step (the nearest is taken)`);
  if (element.name === "Stack" || element.name === "Grid") {
    Object.assign(element.props, props);
    return element;
  }
  return { kind: "element", ...(node.id ? { id: figmaDocId(node.id, "place") } : {}), name: "Stack", props, children: [element] };
}

function convertNode(node, ctx) {
  const { mapping, notes } = ctx;
  if (!node) return null;
  if (DRAWINGS.has(node.type)) { ctx.drawings.push(node.name); return null; }
  if (node.type === "TABLE") return tableElement(node, ctx);
  if (node.type === "TEXT") {
    const props = {};
    if (node.textStyle) {
      if (!mapping.textStyles || mapping.textStyles.has(node.textStyle)) props.textStyle = literal(node.textStyle);
      else notes.push(`Text "${node.name ?? node.characters}": text style "${node.textStyle}" is not a Zen text style`);
    }
    // Figma's soft line break (U+2028) reads as a space: a Text wraps by its width.
    const characters = (node.characters ?? "").replace(/\u2028/g, " ");
    const align = { CENTER: "center", RIGHT: "end", JUSTIFIED: "justify" }[node.align];
    if (align) props.align = literal(align);
    return { kind: "element", name: "Text", props, children: [{ kind: "text", value: characters }] };
  }
  if (node.type === "INSTANCE") {
    const setName = node.set?.name ?? "";
    if (ROW_ELEMENTS[setName]) return { kind: "element", name: ROW_ELEMENTS[setName], props: itemFields(node, ctx, { where: ROW_ELEMENTS[setName] }), children: [] };
    const set = node.set ? mapping.sets.get(node.set.id) ?? mapping.sets.get(setName) : null;
    if (!set) {
      // An icon of the set (icon-zen): an Icon.
      if (isZenIcon(setName, mapping)) return { kind: "element", name: "Icon", props: { name: literal(setName) }, children: [] };
      // A primitive with slots (Dashboard/Header): what its slots hold, in its layout.
      // Each slot a Stack in its layout; slots that sit in one frame of the instance, a Stack in that frame's layout.
      const groups = [];
      for (const slot of node.slots ?? []) {
        const content = (slot.children ?? []).map((child) => convert(child, ctx)).filter(Boolean);
        if (!content.length) continue;
        const element = frameElement({ name: slot.name, layout: slot.layout }, content, ctx);
        if (slot.id) element.id = figmaDocId(slot.id);
        SOURCE.set(element, slot);
        const row = slot.parent && node.rows?.[slot.parent] ? slot.parent : null;
        if (row && groups.at(-1)?.row === row) groups.at(-1).items.push(element);
        else groups.push({ row, items: [element] });
      }
      const held = groups.map(({ row, items }) => {
        if (!row) return items;
        const frame = frameElement({ name: row, layout: node.rows[row] }, items, ctx);
        if (node.rowIds?.[row]) frame.id = figmaDocId(node.rowIds[row]);
        return frame;
      }).flat();
      if (held.length) {
        notes.push(`"${node.name}" (${setName}) has no Zen component: what its ${node.slots.map((slot) => slot.name).join(", ")} slots hold is kept in a Stack, its own layers are left out`);
        return frameElement({ name: node.name, layout: node.layout }, held, ctx);
      }
      notes.push(`"${node.name}" (${setName || "no main component"}) has no Zen component: left out`);
      return null;
    }
    const where = `${set.code} "${node.name}"`;
    const props = instanceProps(node, set, mapping, notes, where);
    // An icon-only control needs a name: its layer's, when the designer named it ("Collapse"), else its icon's words.
    if (NEEDS_NAME.has(set.code)) {
      const named = node.name && !node.name.includes("/") && node.name !== set.code && node.name !== setName ? node.name : null;
      const icon = typeof props.icon?.value === "string" ? props.icon.value : null;
      if (named || icon) props["aria-label"] = literal(named ?? iconWords(icon));
      if (!named && icon) notes.push(`${where}: its aria-label "${iconWords(icon)}" comes from its icon (Figma has no name for it)`);
    }
    const takesChildren = !mapping.apiProps[set.code] || mapping.apiProps[set.code].has("children");
    // Each slot: a data prop (Sidebar sections), a node prop (Sidebar footer) or the children (Card › Content). With
    // slots, the label text is theirs, not the instance's.
    const dataSlots = mapping.dataSlots?.[set.code] ?? [];
    const slotProps = SLOT_PROPS[set.code] ?? {};
    const slotted = [];
    // Item ids are the component's own (its rows and its footer share them, as selectedId does).
    const outerIds = ctx.ids;
    ctx.ids = new Set();
    for (const slot of node.slots ?? []) {
      const dataSlot = dataSlots.find((candidate) => candidate.name === slot.name);
      if (dataSlot) {
        const { value, selected } = dataSlotValue(slot, dataSlot, ctx, where);
        props[dataSlot.prop] = value;
        if (selected && SELECTED_PROP[set.code]) props[SELECTED_PROP[set.code]] = literal(selected);
        continue;
      }
      if (slotProps[slot.name]) {
        const content = slotContent(slot, ctx);
        if (content) props[slotProps[slot.name]] = { kind: "element", node: content };
        continue;
      }
      slotted.push(slot);
    }
    ctx.ids = outerIds;
    let children = props.children && !node.slots?.length ? [{ kind: "text", value: props.children.value }] : [];
    const slottedLayers = slotted.flatMap((slot) => slot.children ?? []);
    if (slottedLayers.length && takesChildren) children = slottedLayers.map((child) => convert(child, ctx)).filter(Boolean);
    else if (slottedLayers.length) notes.push(`${where}: what its ${slotted.map((slot) => slot.name).join(", ")} slot holds is left out (the component takes no content)`);
    delete props.children;
    const overrides = {};
    for (const nested of node.nested ?? []) {
      const inner = nested.set ? mapping.sets.get(nested.set.id) ?? mapping.sets.get(nested.set.name) : null;
      if (!inner) { notes.push(`${where} › ${nested.path}: ${nested.set?.name ?? "?"} has no Zen component`); continue; }
      const fields = instanceProps(nested, inner, mapping, notes, `${set.code} › ${nested.path}`);
      if (Object.keys(fields).length) overrides[nested.path] = { kind: "object", fields };
    }
    if (Object.keys(overrides).length) props.overrides = { kind: "object", fields: overrides };
    // A layer Figma shows with a boolean of its name (Card's Sub-Action) that the code draws only when a prop is set.
    for (const layer of new Set((node.nested ?? []).map((nested) => nested.path.split("/")[0]))) {
      if (node.props?.[layer] === true && !set.toggles?.some((toggle) => toggle.label === layer)) notes.push(`${where}: ${layer} shows in Figma; set it on the ${set.code} in the Studio (its overrides apply once it is there)`);
    }
    return { kind: "element", name: set.code, props, children };
  }
  // A grid's layers in the order Figma places them (row by row), which the layers panel need not follow.
  const layers = node.layout?.mode === "GRID" ? [...(node.children ?? [])].sort((a, b) => (a.cell?.row ?? 0) - (b.cell?.row ?? 0) || (a.cell?.col ?? 0) - (b.cell?.col ?? 0)) : node.children ?? [];
  const children = layers.map((child) => convert(child, ctx)).filter(Boolean);
  // A frame whose layers were all left out (a drawing's wrapper) is left out with them.
  if (node.children?.length && !children.length) return null;
  return frameElement(node, children, ctx);
}

/** A frame (or a slot) as a Stack in its auto layout; Figma's grid layout as a Grid. */
function frameElement(node, children, ctx) {
  const props = {};
  const layout = node.layout;
  const grid = layout?.mode === "GRID";
  if (grid) {
    // Layers that each span several of Figma's columns (8 columns, 2 each): the Grid takes the columns they fill a row with.
    let columns = layout.grid?.columns;
    const cells = (node.children ?? []).map((child) => child.cell).filter(Boolean);
    const spans = new Set(cells.map((cell) => cell.span));
    if (cells.length && spans.size === 1 && [...spans][0] > 1) {
      const span = [...spans][0];
      const filled = Math.max(...cells.map((cell) => cell.col + cell.span)) - Math.min(...cells.map((cell) => cell.col));
      const effective = Math.max(1, Math.round(filled / span));
      ctx.notes.push(`Grid "${node.name}": in Figma its ${cells.length} layers span ${span} of ${columns} columns each, ${effective} to a row; the Grid takes ${effective} columns`);
      columns = effective;
    }
    if (columns > 1) props.columns = literal(columns);
  }
  if (layout) {
    const row = layout.mode === "HORIZONTAL";
    if (row) props.direction = literal("row");
    // Stack and Grid take gap md unless told: a frame without a gap says none (with one layer it makes no difference).
    const gap = spacingStep(layout.gapVar, layout.gap ?? 0, GAP_PX);
    if (gap !== "md" && (gap !== "none" || children.length > 1)) props.gap = literal(gap);
    const gapPx = GAP_PX.find(([, key]) => key === gap)?.[0];
    if (!layout.gapVar && typeof layout.gap === "number" && Math.abs(gapPx - layout.gap) > 8) ctx.notes.push(`Frame "${node.name}": gap ${layout.gap} px is no Zen step; the Stack takes ${gap} (${gapPx} px)`);
    // Padding: one step, or X and Y; sides that all differ take the largest.
    const [top = 0, right = 0, bottom = 0, left = 0] = layout.padding ?? [];
    const put = (prop, px, variable) => { const step = spacingStep(variable, px, PADDING_PX); if (step !== "none") props[prop] = literal(step); };
    if (top === bottom && left === right && top === left) put("padding", top, layout.paddingVar);
    else if (top === bottom && left === right) { put("paddingX", left); put("paddingY", top); }
    else {
      put("padding", Math.max(top, right, bottom, left), layout.paddingVar);
      ctx.notes.push(`Frame "${node.name}": padding ${[top, right, bottom, left].join("/")} differs by side; the Stack takes ${Math.max(top, right, bottom, left)}`);
    }
    if (!grid) {
      // Figma aligns only the layers that do not fill across the frame: when every one does, the Stack stretches them.
      const sources = children.map((child) => SOURCE.get(child));
      const across = (source) => (row ? source?.fillH : source?.fillW);
      const along = (source) => (row ? source?.fillW : source?.fillH);
      // A row Stack centres by default (Layout.tsx), a column stretches: each writes only what differs.
      const stretched = children.length > 0 && sources.every(across);
      const align = stretched ? "stretch" : { MIN: "start", CENTER: "center", MAX: "end", BASELINE: "baseline" }[layout.counter ?? "MIN"];
      if (align !== (row ? "center" : "stretch") && !(align === "start" && !row)) props.align = literal(align);
      const aligned = row ? align !== "stretch" : Boolean(props.align);
      const justify = { CENTER: "center", MAX: "end", SPACE_BETWEEN: "between" }[layout.primary];
      if (justify) props.justify = literal(justify);
      if (layout.wrap) props.wrap = literal(true);
      // A layout layer that fills (Fill container): along the Stack it takes the free space; across, it is said when the Stack aligns.
      children.forEach((child, index) => {
        if (!SIZED.has(child.name)) return;
        if (along(sources[index])) child.props[row ? "width" : "height"] = literal("fill");
        if (across(sources[index]) && aligned) child.props[row ? "height" : "width"] = literal("fill");
      });
    }
  } else if (children.length > 1) ctx.notes.push(`Frame "${node.name}" has no auto layout: its layers are stacked in order`);
  return { kind: "element", name: grid ? "Grid" : "Stack", props, children };
}

/** The frame's device: a phone up to 480 px wide, a tablet up to 1100, else a desktop. */
const deviceOf = (width) => (typeof width === "number" && width <= 480 ? "phone" : typeof width === "number" && width <= 1100 ? "tablet" : "desktop");

/** The frame (figmaReadCode's JSON) as a page: { text, notes }. The frame's own layout is the screen's Stack. */
/**
 * The frame (figmaReadCode's JSON) as a page: { text, notes, doc }. The frame's own layout is the screen's Stack. Every
 * element's document id comes from its Figma layer (figmaDocId), and the header names the frame (`figma: { file, node }`):
 * a pulled page imported again finds its page and its layers (figma-diff.mjs). `text` is the plain page; the print with
 * ids, `printPage(doc, { ids: true })`, is what the Studio imports. `file`: the Figma file key when the read has none.
 */
export function pageFromFigma(frame, { title = frame?.name ?? "From Figma", mapping, file = null }) {
  const ctx = { mapping, notes: [], ids: new Set(), drawings: [] };
  const root = convert(frame, ctx);
  if (ctx.drawings.length) ctx.notes.push(`${ctx.drawings.length} drawings (vectors, shapes: ${[...new Set(ctx.drawings)].join(", ")}) are left out: a page has no layer for them`);
  const own = (part) => (frame?.id ? figmaDocId(frame.id, part) : undefined);
  const content = root ? (root.name === "Stack" ? root : { kind: "element", id: own("content"), name: "Stack", props: {}, children: [root] }) : null;
  const screen = { kind: "element", id: own("screen"), name: "Screen", props: { id: literal("screen-1"), title: literal(title), device: literal(deviceOf(frame?.width)) }, children: content ? [content] : [] };
  const board = { kind: "element", id: own("board") ?? "board", name: "Board", props: {}, children: [screen] };
  // Elements no layer stands for take their place under their parent (deterministic: the same frame, the same ids).
  const walk = (node) => {
    node.children.forEach((child, index) => { if (child.kind === "element") { child.id ??= `${node.id}.${index}`; walk(child); } });
    for (const [name, value] of Object.entries(node.props)) if (value.kind === "element") { value.node.id ??= `${node.id}.${name}`; walk(value.node); }
  };
  walk(board);
  const source = frame?.id ? { figma: { file: frame.file ?? file, node: frame.id } } : {};
  const doc = { header: { format: 1, title, ...source }, mock: {}, board };
  return { text: printPage(doc), notes: ctx.notes, doc };
}

/**
 * A Figma layer's id as a page element's document id: "14243:64878" → "f14243-64878", an instance's inner layer
 * "I1:2;3:4" → "fI1-2_3-4"; `part` for an element the layer adds (its Screen, the Stack that places it).
 */
export function figmaDocId(figmaId, part) {
  return `f${String(figmaId).replace(/:/g, "-").replace(/;/g, "_")}${part ? `.${part}` : ""}`;
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
  const iconSource = fs.readFileSync(path.join(root, "src/icons/generated/names.ts"), "utf8");
  const iconNames = [...new Set([...iconSource.matchAll(/"((?:icon|ic)-[a-z0-9-]+)"/g)].map((match) => match[1]))];
  const { DATA_SLOTS } = await import(pathToFileURL(path.join(root, "src/platform/studio/slots/dataSlots.ts")).href);
  return figmaMapping({ figmaProps: FIGMA_PROPS, contract, apiProps, textStyles: typographyStyles ? Object.keys(typographyStyles) : null, iconNames, dataSlots: DATA_SLOTS });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [command, arg] = process.argv.slice(2);
  const option = (name) => process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (command === "code" && arg) console.log(figmaReadCode(arg, { part: Number(option("part") ?? 0) }));
  else if (command === "page" && arg) {
    // Each use_figma answer saved to a file: one file, or one per part.
    const files = process.argv.slice(3).filter((item) => !item.startsWith("--"));
    const frame = joinParts(files.map((file) => fs.readFileSync(file, "utf8").replace(/\r?\n$/, "")));
    const { doc, notes } = pageFromFigma(frame, { title: option("title"), mapping: await repoMapping(), file: option("file") ?? null });
    // With each element's Figma id (data-zen-id): Import in the Studio keeps them, and a later pull updates the page.
    const text = printPage(doc, { ids: !process.argv.includes("--no-ids") });
    if (option("out")) fs.writeFileSync(option("out"), text);
    else process.stdout.write(text);
    for (const note of notes) console.error(`note: ${note}`);
  } else {
    console.error("usage: figma-pull.mjs code <nodeId> | page <part files…> [--title=…] [--file=<figma file key>] [--out=<file.zen.tsx>] [--no-ids]");
    process.exit(1);
  }
}
