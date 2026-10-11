// Zen Studio → Figma (core rebuild Q4, spec docs/research/studio-figma-push-spec-2026-10-12.md §3.1): a page as the JSON
// figmaReadCode (figma-pull.mjs) returns, so the Zen plugin's Import from Studio places it and a later pull reads it back
// the same — the round trip is the test (figma-push.selftest.mjs). Isomorphic: no Node imports; the caller passes the
// mapping (figma-pull.mjs repoMapping / figmaMapping) and the nested layers (inspector/nestedLayers.generated.ts).
//
//   figmaFromPage(text, { mapping, nestedLayers }) → { frame, notes }    every node keyed by its element's document id
//   figmaPackage(text, { mapping, nestedLayers, page: { id, title } }) → { pkg, notes }   the file the plugin imports
//
// P0 covers frames (Stack, Grid), text and instances (variant, boolean, text and icon properties, the label, slot
// content, `overrides` as nested instances, an icon-only control's name). Data slots, node slots, Table, Dashboard
// header, absolute layers and pictures are P2: they are noted, not written.
import { docFromText } from "./doc.mjs";
import { GAP_PX, LONG_TO_SHORT, PADDING_PX, sameValue } from "./figma-steps.mjs";

/** A spacing step's Figma variable name: md → Medium ("Spacing/Gap/Medium"). */
const STEP_NAMES = { "3xs": "3XSmall", "2xs": "2XSmall", xs: "XSmall", sm: "Small", md: "Medium", lg: "Large", xl: "XLarge", "2xl": "2XLarge", "3xl": "3XLarge", "4xl": "4XLarge", giant: "Giant", xgiant: "XGiant", "2xgiant": "2XGiant" };
/** The width of a Screen's frame by its device (figma-pull's deviceOf reads it back). */
const DEVICE_WIDTH = { phone: 390, tablet: 768, desktop: 1440 };
const DRAWN_BY_PULL = new Set(["Board", "Screen", "Overlay"]);

const short = (step) => LONG_TO_SHORT[step] ?? step;
const pxOf = (step, table) => table.find(([, key]) => key === short(step))?.[0];
/** A page element's Figma id (figma-pull figmaDocId, the other way): "f14243-64878" → "14243:64878"; an id the pull added (".place") is none. */
export function figmaIdOf(docId) {
  const match = /^f([A-Za-z0-9_-]+)$/.exec(docId ?? "");
  return match ? match[1].replace(/_/g, ";").replace(/-/g, ":") : undefined;
}

const literalOf = (value) => (value?.kind === "literal" ? value.value : undefined);
const textOf = (element) => element.children.filter((child) => child.kind === "text").map((child) => child.value).join("");

/** The mapping's sets by code component (several for a component that is several Figma sets: Button's appearance). */
function setsByCode(mapping) {
  const out = new Map();
  for (const entry of new Set(mapping.sets.values())) out.set(entry.code, [...(out.get(entry.code) ?? []), entry]);
  return out;
}

/**
 * The Figma properties of an instance from its code props (instanceProps in figma-pull.mjs, the other way): every
 * mapped property whose code value is known (written, else the code default), by Figma name and Figma option.
 * `only`: write just these code props (a nested override names what it changes).
 */
function figmaProps(entry, code, mapping, notes, where, only = null) {
  const props = {};
  const defaults = mapping.apiProps[entry.code];
  const valueOf = (prop) => (prop in code ? code[prop] : only ? undefined : defaults?.get(prop));
  // A component that is several Figma sets (Sidebar: Basic, Workspace, Small-Density) maps the properties of them all:
  // write only those this set has (its contract's property names), when the contract knows the set.
  const known = entry.defaults && Object.keys(entry.defaults).length ? new Set(Object.keys(entry.defaults)) : null;
  const ownedBySet = (name) => !known || known.has(name);
  const swaps = new Map();
  for (const item of entry.own) {
    if (only && !only.has(item.prop)) continue;
    if (!ownedBySet(item.label ?? item.prop)) continue;
    const value = valueOf(item.prop);
    if (value === undefined) continue;
    const name = item.label ?? item.prop;
    if (item.type === "VARIANT") {
      const option = Object.entries(item.options ?? {}).find(([, codeValue]) => sameValue(codeValue, String(value)))?.[0];
      if (option) props[name] = option;
      else notes.push(`${where}: ${item.prop}="${value}" has no Figma option in ${name}`);
    } else if (item.type === "BOOLEAN") props[name] = Boolean(value);
    else if (item.type === "TEXT" && typeof value === "string") props[name] = value;
    else if (item.type === "INSTANCE_SWAP" && typeof value === "string") swaps.set(item.prop, { name, icon: value });
  }
  for (const toggle of entry.toggles ?? []) {
    if (only && !only.has(toggle.prop)) continue;
    if (!ownedBySet(toggle.label)) continue;
    const value = valueOf(toggle.prop);
    const swap = swaps.get(toggle.prop);
    if (swap || typeof toggle.on !== "string" || toggle.on === "slot") props[toggle.label] = value !== undefined && value !== false && value !== null;
    else props[toggle.label] = value === toggle.on;
  }
  for (const swap of swaps.values()) props[swap.name] = swap.icon;
  return props;
}

/** The set of a code component: by its set prop (Button appearance="flat" → Button/Flat), else its only set. */
function entryFor(name, code, byCode, mapping) {
  const entries = byCode.get(name);
  if (!entries?.length) return null;
  const chooser = entries.find((entry) => entry.setProp);
  if (!chooser) return entries[0];
  const value = code[chooser.setProp] ?? mapping.apiProps[name]?.get(chooser.setProp) ?? chooser.setDefault;
  return entries.find((entry) => entry.setValue === value) ?? entries.find((entry) => !entry.setProp) ?? entries[0];
}

/** Literal props of an element ({ prop: value }); other kinds are noted by the caller. */
function codeProps(element) {
  return Object.fromEntries(Object.entries(element.props).filter(([, value]) => value.kind === "literal").map(([name, value]) => [name, value.value]));
}

/**
 * `text`: print the page with its ids (doc.mjs printPage(doc, { ids: true })) so the keys stay the same from one export to
 * the next; an element without one takes `newId()` (doc.mjs's random id by default, a counter in the CLI).
 */
export function figmaFromPage(text, { mapping, nestedLayers = {}, newId } = {}) {
  const notes = [];
  const { doc, errors } = docFromText(text, newId ? { newId } : {});
  if (!doc) return { frame: null, notes: errors.map((error) => error.message) };
  const byCode = setsByCode(mapping);
  const screen = doc.board.children.find((child) => child.kind === "element" && child.name === "Screen");
  if (!screen) return { frame: null, notes: ["the page has no Screen"] };
  if (doc.board.children.filter((child) => child.kind === "element").length > 1) notes.push("only the first Screen is pushed (P0)");

  // Each node carries its element's document id (`key`): the plugin keeps it on the layer, so importing the page again
  // updates the same layers (Zen plugin src/plugin/studio-import.js).
  const convert = (element, parent) => {
    const node = convertElement(element, parent);
    if (node && element.id) node.key = element.id;
    return node;
  };
  const convertElement = (element, parent) => {
    if (element.kind !== "element") return null;
    const id = figmaIdOf(element.id);
    const code = codeProps(element);
    if (code.position === "absolute") notes.push(`${element.name}: a layer outside the auto layout goes in flow (absolute layers are P2)`);
    if (element.name === "Stack" || element.name === "Grid" || element.name === "Box") return frameNode(element, code, id, parent);
    if (element.name === "Text") {
      const align = { center: "CENTER", end: "RIGHT", justify: "JUSTIFIED" }[code.align];
      return { type: "TEXT", ...(id ? { id } : {}), characters: textOf(element), ...(code.textStyle ? { textStyle: code.textStyle } : {}), ...(align ? { align } : {}) };
    }
    if (element.name === "Icon" && typeof code.name === "string") return { type: "INSTANCE", ...(id ? { id } : {}), name: code.name, set: { id: null, name: code.name }, props: {} };
    return instanceNode(element, code, id);
  };

  const fills = (element, parent) => {
    const code = codeProps(element);
    const row = parent?.direction === "row";
    return { fillW: code.width === "fill" || (!row && parent?.stretch), fillH: code.height === "fill" || (row && parent?.stretch) };
  };

  function frameNode(element, code, id) {
    const grid = element.name === "Grid";
    const row = code.direction === "row";
    const layout = { mode: grid ? "GRID" : row ? "HORIZONTAL" : "VERTICAL" };
    const gap = code.gap ?? "md";
    layout.gap = pxOf(gap, GAP_PX) ?? 0;
    if (short(gap) !== "none" && STEP_NAMES[short(gap)]) layout.gapVar = `Spacing/Gap/${STEP_NAMES[short(gap)]}`;
    const pad = (step) => pxOf(step ?? "none", PADDING_PX) ?? 0;
    const x = pad(code.paddingX ?? code.padding);
    const y = pad(code.paddingY ?? code.padding);
    layout.padding = [y, x, y, x];
    if (code.padding && !code.paddingX && !code.paddingY && short(code.padding) !== "none") layout.paddingVar = `Spacing/Padding/${STEP_NAMES[short(code.padding)]}`;
    if (grid) layout.grid = { columns: Number(code.columns ?? 1) };
    const align = code.align ?? (row ? "center" : "stretch");
    if (!grid) {
      layout.counter = { start: "MIN", center: "CENTER", end: "MAX", baseline: "BASELINE" }[align] ?? "MIN";
      layout.primary = { center: "CENTER", end: "MAX", between: "SPACE_BETWEEN" }[code.justify] ?? "MIN";
      if (code.wrap) layout.wrap = true;
    }
    const context = { direction: row ? "row" : "column", stretch: !grid && align === "stretch" };
    const children = element.children.map((child) => {
      const node = convert(child, context);
      if (!node || grid) return node;
      const { fillW, fillH } = fills(child, context);
      return { ...node, ...(fillW ? { fillW: true } : {}), ...(fillH ? { fillH: true } : {}) };
    }).filter(Boolean);
    if (grid) children.forEach((child, index) => { child.cell = { col: index % layout.grid.columns, row: Math.floor(index / layout.grid.columns), span: 1 }; });
    return { type: "FRAME", ...(id ? { id } : {}), name: element.name, layout, children };
  }

  function instanceNode(element, code, id) {
    const where = `${element.name}${id ? ` (${id})` : ""}`;
    const entry = entryFor(element.name, code, byCode, mapping);
    if (!entry) {
      notes.push(`${where}: no Figma set for ${element.name} (left out)`);
      return null;
    }
    for (const [name, value] of Object.entries(element.props)) {
      if (value.kind === "array" || (value.kind === "object" && name !== "overrides")) notes.push(`${where}: ${name} is data (data slots are P2): not written`);
      if (value.kind === "element") notes.push(`${where}: ${name} holds layers (node slots are P2): not written`);
    }
    const props = figmaProps(entry, code, mapping, notes, where);
    const node = { type: "INSTANCE", ...(id ? { id } : {}), name: typeof code["aria-label"] === "string" ? code["aria-label"] : entry.name, set: { id: entry.id, name: entry.name }, props };
    const label = textOf(element);
    if (label) node.text = label;
    const layers = element.children.filter((child) => child.kind === "element");
    if (layers.length) node.slots = [{ name: entry.slots?.[0] ?? "Content", children: layers.map((child) => convert(child, { direction: "column", stretch: true })).filter(Boolean) }];
    const overrides = element.props.overrides;
    if (overrides?.kind === "object") {
      node.nested = [];
      for (const [path, value] of Object.entries(overrides.fields)) {
        if (value.kind !== "object") continue;
        // The nested instance's component, layer by layer from the owner (Card › Sub-Action → IconButton).
        let owner = element.name;
        for (const segment of path.split("/")) owner = owner ? nestedLayers[owner]?.[segment.replace(/\[.*$/, "")] : null;
        const fields = Object.fromEntries(Object.entries(value.fields).filter(([, field]) => field.kind === "literal").map(([name, field]) => [name, field.value]));
        const inner = owner ? entryFor(owner, fields, byCode, mapping) : null;
        if (!inner) { notes.push(`${where} › ${path}: its component is not known (override left out)`); continue; }
        node.nested.push({ path, set: { id: inner.id, name: inner.name }, props: figmaProps(inner, fields, mapping, notes, `${where} › ${path}`, new Set(Object.keys(fields))), ...(typeof fields.children === "string" ? { text: fields.children } : {}) });
      }
      if (!node.nested.length) delete node.nested;
    }
    return node;
  }

  const title = literalOf(screen.props.title) ?? doc.header?.title ?? "Studio page";
  const device = literalOf(screen.props.device) ?? "desktop";
  const content = screen.children.find((child) => child.kind === "element");
  const root = content && content.name === "Stack" ? frameNode(content, codeProps(content), figmaIdOf(content.id)) : { type: "FRAME", name: title, layout: { mode: "VERTICAL", gap: 0, padding: [0, 0, 0, 0] }, children: content ? [convert(content, null)].filter(Boolean) : [] };
  for (const element of [doc.board, screen]) for (const name of Object.keys(element.props)) if (!["id", "title", "device"].includes(name) && !DRAWN_BY_PULL.has(name)) notes.push(`${element.name} ${name}: not pushed (P0)`);
  if (content?.id && root.type === "FRAME") root.key = content.id;
  const frame = { ...root, name: title, width: DEVICE_WIDTH[device] ?? DEVICE_WIDTH.desktop, ...(doc.header?.figma?.file ? { file: doc.header.figma.file } : {}) };
  if (doc.header?.figma?.node) frame.id = doc.header.figma.node;
  return { frame, notes };
}

/** The file the Zen plugin's Import from Studio reads: `{ format: "zen-studio-figma", version: 1, page, frame }`. */
export function figmaPackage(text, { mapping, nestedLayers = {}, page = {}, newId } = {}) {
  const { frame, notes } = figmaFromPage(text, { mapping, nestedLayers, newId });
  if (!frame) return { pkg: null, notes };
  return { pkg: { format: "zen-studio-figma", version: 1, page: { id: page.id ?? null, title: page.title ?? frame.name }, frame }, notes };
}
