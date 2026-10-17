// The definition pack for Studio → Figma direct paste (docs/research/studio-native-paste-2026-10-17.md §3). A paste
// carries the skeletons of the variants it uses, so Figma maps its overrides onto the file's own components; component
// property assignments need each variant's own property ids, and text styles their node ids, which the Plugin API does
// not show. Both come from Figma's own clipboard: a probe frame with one instance of every variant the push can write
// (built with use_figma, on the QA page) is copied from Figma desktop, and the copies are read here.
//
//   node tools/studio/native-pack.mjs probe-code --part=N   use_figma code: instances of part N (0-based) of the push's sets
//   node tools/studio/native-pack.mjs probe-code --icons    use_figma code: an instance of every icon on the icon page,
//                                                           a frame that uses every text, paint and effect style, and one
//                                                           that binds every variable but the Global Colors primitives
//   node tools/studio/native-pack.mjs capture --frames=a:b,c:d [--keep]   macOS + Figma desktop: copy each probe frame,
//                                                           then write the pack (needs Accessibility for the terminal app)
//   node tools/studio/native-pack.mjs write --files=a.html,b.html   copies saved by hand → the pack
//   node tools/studio/native-pack.mjs check                 sets the push writes that the pack lacks
//
// Pack (docs/figma-contracts/native-pack.json): `sets` {id: {name, props: [[name, type, id, initial]]}}, `symbols`
// {id: {set?, name, w, h, mode?, defs: {setLevelPropId: ownPropId}, props? (a lone component's), nodes: [[id, parent, type, name, visible, w, h, x, y,
// main, refs, more]]}} (parent: a row index, -1 for the symbol; refs: [[ownPropId, field]]; more: a slot's layout
// fields, a grid's track ids, a nested instance's own assignments and the overrides its component sets below it), `styles` {name: [id, type]}, `variables` {name: [id,
// type]}; a set lists its `variants` in layer order (the first is Figma's default). `contents` {id: [node…]} are the slot
// contents a component sets on its nested instances, in full (a paste that edits one carries its own copy, as Figma
// does); their style and variable refs are node ids, their vector data inline (`{blob: base64}`). The schema Figma wrote
// rides along as figma-clipboard-schema.generated.mjs.

import { readFigmaClipboard, base64Of } from "./figma-kiwi.mjs";

export const PACK_FILE = "docs/figma-contracts/native-pack.json";
export const SCHEMA_MODULE = "tools/studio/figma-clipboard-schema.generated.mjs";
export const PACK_FILE_KEY = "9nZv4uW2LT21yuHabMTCh1";
export const PROBE_PAGE = "15872:3";
/** Sets per probe-code part (one use_figma call), and instances per probe frame (one copy Figma desktop handles). */
export const PROBE_SETS_PER_PART = 60;
export const PROBE_FRAME_SIZE = 550;
export const ICON_PAGE = "1340:4450";

const id = (guid) => (guid ? `${guid.sessionID}:${guid.localID}` : "");
/** Fields a slot's content frame copies from the slot (its auto layout), and a grid's own track ids. */
/** What a slot's content frame takes from the slot: everything it shows (layout, corners and their variables, clip, size
 * limits, fills, strokes, effects), not its identity or its links to the component's properties (Figma's own copies). */
/** A nested instance's own override fields a swap does not carry: its addressing, swaps and visibility (`ovs`), its
 *  assignments, plugin data and what Figma derives again. `overrideLevel` stays: it marks what Figma kept from a swap
 *  (the depth of the swapped layer), and a paste that restates the swap must restate those with it. */
const KEEP_SKIP = new Set(["guidPath", "overriddenSymbolID", "visible", "componentPropAssignments", "pluginData", "overrideKey", "derivedSymbolData", "derivedTextData", "textData", "editInfo", "targetAspectRatio", "proportionsConstrained", "borderTopWeight", "borderBottomWeight", "borderLeftWeight", "borderRightWeight"]);
const SLOT_SKIP = new Set(["guid", "phase", "parentIndex", "type", "name", "visible", "size", "transform", "componentPropRefs", "pluginData", "overrideKey", "derivedSymbolData", "derivedSymbolDataLayoutVersion", "editInfo", "isSlot"]);
const slotLayout = (node) => {
  const out = Object.fromEntries(Object.entries(node).filter(([key]) => !SLOT_SKIP.has(key)));
  if (out.parameterConsumptionMap) out.parameterConsumptionMap = { entries: (out.parameterConsumptionMap.entries ?? []).filter((entry) => entry.variableData?.value?.alias) };
  return out;
};
/** A layer's links to its component's properties: componentPropRefs, and the PROP_REF entries Figma keeps some only in. */
const PROP_FIELDS = ["VISIBLE", "TEXT_DATA", "OVERRIDDEN_SYMBOL_ID", "SLOT_CONTENT_ID"];
function refsOf(node) {
  const out = (node.componentPropRefs ?? []).filter((ref) => !ref.isDeleted).map((ref) => [id(ref.defID), ref.componentPropNodeField]);
  for (const entry of node.parameterConsumptionMap?.entries ?? []) {
    const def = entry.variableData?.value?.propRefValue?.defId;
    if (def && PROP_FIELDS.includes(entry.variableField) && !out.some(([d, f]) => d === id(def) && f === entry.variableField)) out.push([id(def), entry.variableField]);
  }
  return out;
}
const isSlot = (node) => refsOf(node).some(([, field]) => field === "SLOT_CONTENT_ID");
const round = (value) => Math.round((value ?? 0) * 100) / 100;

/** The use_figma code that adds part `part` of `ids` to the probe: frames of up to PROBE_FRAME_SIZE instances. */
export function probeCode(ids, part) {
  const slice = ids.slice(part * PROBE_SETS_PER_PART, (part + 1) * PROBE_SETS_PER_PART);
  return `
// Zen Studio · native-pack probe, part ${part + 1}/${Math.ceil(ids.length / PROBE_SETS_PER_PART)}: one instance of every variant (temporary; removed after the capture).
const ids = ${JSON.stringify(slice)};
const qa = await figma.getNodeByIdAsync(${JSON.stringify(PROBE_PAGE)});
await figma.setCurrentPageAsync(qa);
let probe = qa.children.find((n) => n.name === "Native pack probe");
if (!probe) { probe = figma.createFrame(); probe.name = "Native pack probe"; probe.fills = []; probe.clipsContent = false; qa.appendChild(probe); probe.x = 6000; probe.y = 0; }
const frames = [];
let frame = null, count = 0, x = 0, y = 0, rowH = 0;
const next = () => { frame = figma.createFrame(); frame.name = "Probe " + (probe.children.length + 1); frame.fills = []; frame.clipsContent = false; probe.appendChild(frame); frame.x = 0; frame.y = probe.children.reduce((h, c) => Math.max(h, c === frame ? 0 : c.y + c.height + 100), 0); frames.push(frame); count = 0; x = 0; y = 0; rowH = 0; };
for (const setId of ids) {
  const node = await figma.getNodeByIdAsync(setId);
  if (!node) continue;
  const variants = node.type === "COMPONENT_SET" ? node.children.filter((v) => v.type === "COMPONENT") : [node];
  if (!frame || count + variants.length > ${PROBE_FRAME_SIZE}) next();
  for (const variant of variants) {
    const instance = variant.createInstance();
    frame.appendChild(instance);
    instance.x = x; instance.y = y;
    x += instance.width + 8; rowH = Math.max(rowH, instance.height);
    if (x > 6000) { x = 0; y += rowH + 8; rowH = 0; }
    count++;
  }
  x = 0; y += rowH + 24; rowH = 0;
  frame.resize(6400, Math.max(1, y));
}
return frames.map((f) => f.id).join(",");
`.trim();
}

/** The use_figma code that adds an instance of every icon component (the icon page) to the probe, in frames of PROBE_FRAME_SIZE, and a "Styles" frame that uses every local style once (their node ids). */
export function iconProbeCode() {
  return `
// Zen Studio · native-pack probe, icons: one instance of every icon component (temporary; removed after the capture).
const page = await figma.getNodeByIdAsync(${JSON.stringify(ICON_PAGE)});
await page.loadAsync();
const qa = await figma.getNodeByIdAsync(${JSON.stringify(PROBE_PAGE)});
let probe = qa.children.find((n) => n.name === "Native pack probe");
if (!probe) { probe = figma.createFrame(); probe.name = "Native pack probe"; probe.fills = []; probe.clipsContent = false; qa.appendChild(probe); probe.x = 6000; probe.y = 0; }
const icons = page.findAllWithCriteria({ types: ["COMPONENT"] });
const frames = [];
for (let at = 0; at < icons.length; at += ${PROBE_FRAME_SIZE}) {
  const frame = figma.createFrame(); frame.name = "Icons " + (frames.length + 1); frame.fills = []; frame.clipsContent = false; probe.appendChild(frame);
  frame.x = 7000 + frames.length * 1400; frame.y = 0;
  icons.slice(at, at + ${PROBE_FRAME_SIZE}).forEach((icon, n) => { const instance = icon.createInstance(); frame.appendChild(instance); instance.x = (n % 40) * 32; instance.y = Math.floor(n / 40) * 32; });
  frame.resize(1300, Math.ceil(Math.min(${PROBE_FRAME_SIZE}, icons.length - at) / 40) * 32);
  frames.push(frame);
}
const styles = figma.createFrame(); styles.name = "Styles"; styles.fills = []; probe.appendChild(styles); styles.x = 7000; styles.y = -400;
styles.layoutMode = "HORIZONTAL"; styles.primaryAxisSizingMode = "AUTO"; styles.counterAxisSizingMode = "AUTO"; styles.layoutWrap = "WRAP"; styles.resize(1300, 10); styles.primaryAxisSizingMode = "FIXED";
for (const style of await figma.getLocalTextStylesAsync()) { await figma.loadFontAsync(style.fontName); const text = figma.createText(); styles.appendChild(text); await text.setTextStyleIdAsync(style.id); text.characters = "Ag"; }
for (const style of await figma.getLocalPaintStylesAsync()) { const rect = figma.createRectangle(); rect.resize(8, 8); styles.appendChild(rect); await rect.setFillStyleIdAsync(style.id); }
for (const style of await figma.getLocalEffectStylesAsync()) { const rect = figma.createRectangle(); rect.resize(8, 8); styles.appendChild(rect); await rect.setEffectStyleIdAsync(style.id); }
frames.push(styles);
// Every variable once (the paste binds by id; Studio pages use tokens no component does), primitives aside.
const variables = figma.createFrame(); variables.name = "Variables"; variables.fills = []; variables.clipsContent = false; probe.appendChild(variables); variables.x = 7000; variables.y = -1200;
const skip = new Set((await figma.variables.getLocalVariableCollectionsAsync()).filter((c) => c.name === "Global Colors").map((c) => c.id));
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
let at = 0;
for (const v of (await figma.variables.getLocalVariablesAsync()).filter((v) => !skip.has(v.variableCollectionId))) {
  const x = (at % 50) * 12, y = Math.floor(at / 50) * 12; at++;
  if (v.resolvedType === "COLOR") { const r = figma.createRectangle(); r.resize(10, 10); variables.appendChild(r); r.x = x; r.y = y; r.fills = [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", v)]; }
  else if (v.resolvedType === "FLOAT") { const f = figma.createFrame(); f.resize(10, 10); f.layoutMode = "HORIZONTAL"; variables.appendChild(f); f.x = x; f.y = y; f.setBoundVariable("itemSpacing", v); }
  else if (v.resolvedType === "STRING") { const t = figma.createText(); variables.appendChild(t); t.x = x; t.y = y; t.characters = "a"; t.setBoundVariable("characters", v); }
  else if (v.resolvedType === "BOOLEAN") { const r = figma.createRectangle(); r.resize(10, 10); variables.appendChild(r); r.x = x; r.y = y; r.setBoundVariable("visible", v); }
}
variables.resize(620, Math.ceil(at / 50) * 12 + 12);
frames.push(variables);
return icons.length + " icons, the styles and " + at + " variables in " + frames.map((f) => f.id).join(",");
`.trim();
}

/** The pack from Figma's copies (each `readFigmaClipboard` result). */
export function packFrom(copies, { read }) {
  const nodes = new Map(), blobsOf = new Map();
  for (const copy of copies) for (const node of copy.message.nodeChanges) if (!nodes.has(id(node.guid))) { nodes.set(id(node.guid), node); blobsOf.set(id(node.guid), copy.message.blobs ?? []); }
  // A variable or style the file holds twice: its own (guid = publishID) and an older copy subscribed from its published
  // library (guid ≠ publishID, e.g. 15052:45 for Content/Neutral/Strongest 22:18713). Content bound to the copy pastes
  // unresolved (white text), so every ref to a copy goes to the file's own node.
  const isOwn = (node) => !node.publishID || id(node.guid) === id(node.publishID);
  const ownOf = new Map();
  for (const node of nodes.values()) {
    if (!(node.type === "VARIABLE" || node.styleType) || isOwn(node)) continue;
    const own = nodes.get(id(node.publishID));
    if (own && isOwn(own) && own.type === node.type) ownOf.set(id(node.guid), own.guid);
  }
  // Library refs by key → node ids (a paste binds styles and variables by id), the file's own node first.
  const byKey = new Map();
  for (const node of nodes.values()) if (node.key && (node.styleType || node.type === "VARIABLE" || node.type === "VARIABLE_SET") && !ownOf.has(id(node.guid))) byKey.set(node.key, node.guid);
  const localRefs = (value) => {
    if (Array.isArray(value)) return value.map(localRefs);
    if (!value || typeof value !== "object") return typeof value === "bigint" ? Number(value) : value;
    const out = {};
    for (const [field, inner] of Object.entries(value)) {
      if (field === "assetRef" && inner?.key && byKey.has(inner.key)) { out.guid = byKey.get(inner.key); continue; }
      if (field === "guid" && ownOf.has(id(inner))) { out.guid = ownOf.get(id(inner)); continue; }
      out[field] = localRefs(inner);
    }
    return out;
  };
  // What Figma carries onto the new component when a nested instance is swapped (a property, an icon, another set or
  // variant): the instance's own overrides of its component. Figma keeps them in the instance's entry for its own symbol
  // (`self`: a renamed layer's name, a resize or its size variables, its fill) and in its entries for the component's
  // layers (`ovs`: an icon's colour on its Vector).
  const keepOf = (instance) => {
    const own = id(instance.symbolData?.symbolID);
    let self = null;
    const ovs = [];
    for (const entry of instance.symbolData?.symbolOverrides ?? []) {
      const path = entry.guidPath?.guids ?? [];
      if (!path.length) continue;
      const fields = Object.fromEntries(Object.entries(entry).filter(([field]) => !KEEP_SKIP.has(field)));
      // A paint's authored colour repeats its colour (Figma derives it again on paste).
      for (const field of ["fillPaints", "strokePaints"]) if (fields[field]) fields[field] = fields[field].map(({ authoredColor, ...paint }) => paint);
      if (path.length === 1 && id(path[0]) === own) {
        if (Object.keys(fields).length) self = localRefs(fields);
        continue;
      }
      if (Object.keys(fields).length) ovs.push([path.map(id), localRefs(fields)]);
    }
    return self || ovs.length ? { ...(self ? { self } : {}), ...(ovs.length ? { ovs } : {}) } : null;
  };
  const contentIds = new Set();
  const slotAssignments = (node) => [...(node.componentPropAssignments ?? []), ...(node.symbolData?.symbolOverrides ?? []).flatMap((entry) => entry.componentPropAssignments ?? [])].filter((a) => a.varValue?.dataType === "SLOT_CONTENT_ID");
  const children = new Map();
  for (const node of nodes.values()) {
    const parent = id(node.parentIndex?.guid);
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(node);
  }
  for (const list of children.values()) list.sort((a, b) => (a.parentIndex.position < b.parentIndex.position ? -1 : a.parentIndex.position > b.parentIndex.position ? 1 : 0));
  const sets = {}, symbols = {}, styles = {}, variables = {};
  for (const node of nodes.values()) {
    if (node.isStateGroup) {
      sets[id(node.guid)] = {
        name: node.name,
        props: (node.componentPropDefs ?? []).filter((def) => def.name && !def.isDeleted).map((def) => [def.name, def.type, id(def.id), initialOf(def.initialValue)]),
        variants: (children.get(id(node.guid)) ?? []).filter((child) => child.type === "SYMBOL").map((child) => id(child.guid)),
      };
    }
    if (ownOf.has(id(node.guid))) continue;
    if (node.styleType && node.key && node.styleType !== "NONE") styles[node.name] ??= node.styleType === "TEXT" ? [id(node.guid), node.styleType, textProps(node)] : node.styleType === "FILL" ? [id(node.guid), node.styleType, { fillPaints: localRefs(node.fillPaints ?? []) }] : [id(node.guid), node.styleType];
    // [id, type, key, version]: a paste binds by id in its own layers; in an instance override Figma writes the key.
    if (node.type === "VARIABLE" && !node.isDeleted) variables[node.name] ??= [id(node.guid), node.variableResolvedType ?? "", node.key ?? "", node.version ?? ""];
  }
  for (const node of nodes.values()) {
    if (node.type !== "SYMBOL") continue;
    const parent = nodes.get(id(node.parentIndex?.guid));
    const rows = [];
    const walk = (owner, at) => {
      for (const child of children.get(id(owner.guid)) ?? []) {
        const refs = refsOf(child);
        let more = isSlot(child) ? { slot: localRefs(slotLayout(child)) } : child.stackMode === "GRID" ? { cols: (child.gridColumns?.entries ?? []).map((entry) => id(entry.id)), rows: (child.gridRows?.entries ?? []).map((entry) => id(entry.id)) } : 0;
        if (child.type === "INSTANCE" && child.componentPropAssignments?.length) more = { ...(more || {}), assigns: localRefs(child.componentPropAssignments) };
        // The component's own overrides on this nested instance that change what shows below it: swaps and visibility.
        const ovs = (child.symbolData?.symbolOverrides ?? []).filter((entry) => entry.overriddenSymbolID || typeof entry.visible === "boolean").map((entry) => [entry.guidPath.guids.map(id), { ...(entry.overriddenSymbolID ? { s: id(entry.overriddenSymbolID) } : {}), ...(typeof entry.visible === "boolean" ? { v: entry.visible } : {}) }]);
        if (ovs.length) more = { ...(more || {}), ovs };
        const keep = child.type === "INSTANCE" ? keepOf(child) : null;
        if (keep) more = { ...(more || {}), keep };
        // An instance's size variables and its property links as Figma keeps them (a PROP_REF: Icon-Src drives its swap).
        // Figma works out what a property swap keeps only for an instance whose definition carries that link.
        if (child.type === "INSTANCE") {
          const entries = (child.parameterConsumptionMap?.entries ?? []).filter((entry) => entry.variableData?.value?.alias || entry.variableData?.dataType === "PROP_REF");
          if (entries.length) more = { ...(more || {}), pcm: localRefs(entries) };
        }
        if (child.type === "INSTANCE") for (const a of slotAssignments(child)) contentIds.add(id(a.varValue.value.slotContentIdValue.guid));
        const row = [id(child.guid), at, child.type, child.name, child.visible === false ? 0 : 1, round(child.size?.x), round(child.size?.y), round(child.transform?.m02), round(child.transform?.m12), child.symbolData ? id(child.symbolData.symbolID) : "", refs.length ? refs : 0, more];
        while (row.length > 9 && !row[row.length - 1]) row.pop();
        rows.push(row);
        if (child.type !== "INSTANCE") walk(child, rows.length - 1);
      }
    };
    walk(node, -1);
    symbols[id(node.guid)] = {
      ...(parent?.isStateGroup ? { set: id(parent.guid) } : {}),
      name: node.name,
      w: round(node.size?.x), h: round(node.size?.y),
      ...(node.stackMode && node.stackMode !== "NONE" ? { mode: node.stackMode } : {}),
      defs: Object.fromEntries((node.componentPropDefs ?? []).filter((def) => def.parentPropDefId && !def.isDeleted).map((def) => [id(def.parentPropDefId), id(def.id)])),
      ...(parent?.isStateGroup ? {} : propsOf(node)),
      nodes: rows,
    };
  }
  // Slot contents set inside components, in full; nested contents (a content's own instances setting slots) too.
  const contents = {};
  const STRIP = new Set(["guid", "parentIndex", "pluginData", "derivedTextData", "derivedSymbolData", "derivedSymbolDataLayoutVersion", "overrideKey", "editInfo", "phase"]);
  const queue = [...contentIds];
  while (queue.length) {
    const contentId = queue.shift();
    if (contents[contentId] || !nodes.has(contentId)) continue;
    const list = [];
    const add = (node, parentIndex) => {
      const blobs = blobsOf.get(id(node.guid));
      const entry = { id: id(node.guid), p: parentIndex };
      for (const [field, value] of Object.entries(node)) if (!STRIP.has(field)) entry[field] = localRefs(value);
      for (const geometry of [...(entry.fillGeometry ?? []), ...(entry.strokeGeometry ?? [])]) if (typeof geometry.commandsBlob === "number") geometry.commandsBlob = { blob: base64Of(Uint8Array.from(blobs[geometry.commandsBlob]?.bytes ?? [])) };
      if (entry.vectorData && typeof entry.vectorData.vectorNetworkBlob === "number") entry.vectorData.vectorNetworkBlob = { blob: base64Of(Uint8Array.from(blobs[entry.vectorData.vectorNetworkBlob]?.bytes ?? [])) };
      if (node.type === "INSTANCE") for (const a of slotAssignments(node)) queue.push(id(a.varValue.value.slotContentIdValue.guid));
      list.push(entry);
      const at = list.length - 1;
      for (const child of children.get(id(node.guid)) ?? []) add(child, at);
    };
    add(nodes.get(contentId), -1);
    contents[contentId] = list;
  }
  const sortedKeys = (object) => Object.fromEntries(Object.entries(object).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  return {
    note: "Skeletons of the Zen library's components for Studio → Figma direct paste, from Figma desktop copies of a probe frame (one instance per variant). Rebuild: node tools/studio/native-pack.mjs --help.",
    file: PACK_FILE_KEY,
    read,
    sets: sortedKeys(sets), symbols: sortedKeys(symbols), styles: sortedKeys(styles), variables: sortedKeys(variables), contents: sortedKeys(contents),
  };
}

/** A lone component's own property definitions (a set's live on the set). */
function propsOf(node) {
  const props = (node.componentPropDefs ?? []).filter((def) => def.name && !def.isDeleted).map((def) => [def.name, def.type, id(def.id), initialOf(def.initialValue)]);
  return props.length ? { props } : {};
}

/** A text style's own font fields, which a styled text node repeats. */
function textProps(node) {
  const out = {};
  for (const key of ["fontName", "fontSize", "lineHeight", "letterSpacing", "paragraphSpacing", "paragraphIndent", "textCase", "textDecoration", "fontVariations"]) if (node[key] !== undefined) out[key] = node[key];
  return out;
}

function initialOf(value) {
  if (!value) return null;
  if ("boolValue" in value) return value.boolValue;
  if (value.textValue) return value.textValue.characters ?? "";
  if (value.guidValue) return id(value.guidValue);
  return null;
}

/** The set and component ids the push can write (library-keys has every one, `library-keys check` keeps it so). */
export function pushIdsFrom(keys) {
  return Object.entries(keys.sets).filter(([, entry]) => entry.type === "COMPONENT_SET" || (entry.type === "COMPONENT" && !entry.set)).map(([key]) => key).sort();
}

/** The schema module's text: the deflated schema Figma wrote into its clipboard. */
export function schemaModule(copy, read) {
  return `// Generated by tools/studio/native-pack.mjs from a Figma desktop copy (do not edit): the kiwi schema Figma writes
// into its clipboard, deflate-raw, base64. figma-native.mjs encodes the paste against it; Figma reads the schema that
// travels with each paste, so an older one keeps working until Figma drops a field it needs.
export const FIGMA_CLIPBOARD_SCHEMA = {
  version: ${copy.version},
  read: "${read}",
  deflated: "${base64Of(copy.schemaDeflated)}",
};
`;
}

const nodeModule = (name) => import(/* @vite-ignore */ `node:${name}`);

/** macOS: select `nodeId` in Figma desktop, Edit › Copy, and return the clipboard's html (Esc first: a focused field would copy its text). */
async function copyFromFigma(nodeId, retry = true) {
  const { execFileSync } = await nodeModule("child_process");
  const osa = (...lines) => execFileSync("osascript", lines.flatMap((line) => ["-e", line]), { encoding: "utf8" }).trim();
  const jxa = (code) => execFileSync("osascript", ["-l", "JavaScript", "-e", code], { encoding: "utf8", maxBuffer: 1 << 30 }).trim();
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  jxa('ObjC.import("AppKit"); $.NSPasteboard.generalPasteboard.clearContents; ""');
  osa('tell application "Figma" to activate', "delay 0.8", 'tell application "System Events" to key code 53', "delay 0.3", 'tell application "System Events" to key code 53');
  execFileSync("open", ["-a", "Figma", `https://www.figma.com/design/${PACK_FILE_KEY}/Zen?node-id=${nodeId.replace(":", "-")}`]);
  await sleep(6000);
  osa('tell application "Figma" to activate', "delay 1", 'tell application "System Events" to tell process "Figma" to click menu item "Copy" of menu "Edit" of menu bar 1');
  for (let tries = 0; tries < 60; tries++) {
    await sleep(2000);
    const html = jxa('ObjC.import("AppKit"); const d = $.NSPasteboard.generalPasteboard.stringForType("public.html"); d.isNil() ? "" : d.js');
    if (html) return html;
  }
  // A copy right after use_figma built the frame can miss it (Figma desktop syncs a few seconds later): once more.
  if (retry) { await sleep(10000); return copyFromFigma(nodeId, false); }
  throw new Error(`native-pack: Figma put nothing on the clipboard for ${nodeId} (is Figma desktop open on the Zen file?)`);
}

if (typeof process !== "undefined" && process.argv?.[1] && import.meta.url === (await nodeModule("url")).pathToFileURL((await nodeModule("path")).resolve(process.argv[1])).href) {
  const { default: fs } = await nodeModule("fs");
  const { default: path } = await nodeModule("path");
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
  const [command] = process.argv.slice(2);
  const option = (name) => process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3);
  const keys = JSON.parse(fs.readFileSync(path.join(root, "docs/figma-contracts/library-keys.json"), "utf8"));
  const ids = pushIdsFrom(keys);
  const read = option("date") ?? new Date().toISOString().slice(0, 10);
  const write = async (htmls) => {
    const copies = [];
    for (const html of htmls) { const copy = await readFigmaClipboard(html); if (!copy) throw new Error("native-pack: a copy without Figma's buffer"); copies.push(copy); }
    const pack = packFrom(copies, { read });
    fs.writeFileSync(path.join(root, PACK_FILE), `${JSON.stringify(pack)}\n`);
    fs.writeFileSync(path.join(root, SCHEMA_MODULE), schemaModule(copies[copies.length - 1], read));
    const missing = ids.filter((key) => !pack.sets[key] && !pack.symbols[key]);
    console.log(`native-pack: ${Object.keys(pack.symbols).length} symbols in ${Object.keys(pack.sets).length} sets, ${Object.keys(pack.styles).length} styles, ${Object.keys(pack.variables).length} variables; ${(fs.statSync(path.join(root, PACK_FILE)).size / 1e6).toFixed(1)} MB${missing.length ? `; missing: ${missing.join(", ")}` : ""}`);
  };
  if (command === "probe-code" && process.argv.includes("--icons")) console.log(iconProbeCode());
  else if (command === "probe-code") console.log(probeCode(ids, Number(option("part") ?? 0)));
  else if (command === "capture" && option("frames")) {
    const htmls = [];
    for (const frame of option("frames").split(",")) { htmls.push(await copyFromFigma(frame)); console.log(`native-pack: copied ${frame} (${(htmls[htmls.length - 1].length / 1e6).toFixed(1)} MB)`); }
    await write(htmls);
  } else if (command === "write" && option("files")) await write(option("files").split(",").map((file) => fs.readFileSync(file, "utf8")));
  else if (command === "check") {
    const pack = JSON.parse(fs.readFileSync(path.join(root, PACK_FILE), "utf8"));
    const missing = ids.filter((key) => !pack.sets[key] && !pack.symbols[key]);
    if (missing.length) { console.error(`native-pack: ${missing.length} set(s) the push can write are not in the pack (${missing.join(", ")}): rebuild with probe-code + capture`); process.exit(1); }
    console.log(`native-pack: every set the push can write (${ids.length}) is in the pack (read ${pack.read})`);
  } else {
    console.error("usage: native-pack.mjs probe-code --part=N | capture --frames=<ids> | write --files=<html files> | check");
    process.exit(1);
  }
}
