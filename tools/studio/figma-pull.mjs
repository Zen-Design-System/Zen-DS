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
import { printPage } from "./doc.mjs";
import { BOX_SURFACE, GAP_PX, LONG_TO_SHORT, MARGIN_VARIABLE, PADDING_PX, sameValue } from "./figma-steps.mjs";
import { apiPropsOf, figmaMapping } from "./figma-map.mjs";
import { TOP_NAV_SET, TOP_NAV_TYPE_OF } from "./figma-top-nav.mjs";
import { chartFromFigma, chartHeaderOf, chartSetKey, headingHidden } from "./figma-charts.mjs";
import { READ_METRIC_CARD, isMetricCard, metricCardFromFigma } from "./figma-metric.mjs";
import { tokens } from "../../src/tokens/generated.ts";
import { contentTones, contentToneToken } from "../../src/components/_shared/contentTone.ts";
import { arcFromData, STAR_RATIO } from "../../src/components/Shape/geometry.ts";
import { DEFAULT_LINE_STROKE, DEFAULT_SHAPE_FILL, shapeFillTokens, shapeStrokeTokens } from "../../src/components/Shape/paint.ts";

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
// A nested icon, Dock-Icon, Avatar, thumbnail or flag swapped for another component without an instance-swap property
// (a List-Item's leading Avatar → a file icon): Figma lists no override for it, so it is told from the layer it stands
// for in its owner's main component.
const SWAPPABLE = /^(icon|ic)-|^(Dock-Icon|Avatar\\/Single|Thumbnail|Flag)$/;
const swappedIn = async (child, owner) => {
  if ((child.componentPropertyReferences || {}).mainComponent || !child.id.startsWith(owner.id + ";")) return false;
  const local = child.id.slice(owner.id.length + 1);
  if (local.includes(";")) return false;
  const set = await setOf(child);
  if (!set || !SWAPPABLE.test(set.name)) return false;
  const main = await owner.getMainComponentAsync();
  const original = main ? main.findOne((n) => n.id === local) : null;
  return Boolean(original && original.type === "INSTANCE" && (await setOf(original))?.id !== set.id);
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
// The first text a layer shows (a text inside a hidden layer shows nothing); \`name\`: the first so named.
const firstText = (node, name) => {
  for (const child of node.children || []) {
    if (!child.visible) continue;
    if (child.type === "TEXT" && (!name || child.name === name)) return child.characters;
    const inner = firstText(child, name);
    if (inner !== null) return inner;
  }
  return null;
};
// A composition of library components (Patterns/…, Header/…) is read inside, as a frame.
const COMPOSITION = /^(Patterns|Header|Templates?|Layouts?|Screens?)\\//;
// A Nav-Slot/Action: its layer name, the icon it draws (its first visible icon instance's component) and its dot.
const navActionOf = async (action) => {
  const props = await propsOf(action);
  let icon = null;
  for (const inner of action.findAll((n) => n.type === "INSTANCE" && n.visible)) {
    const main = await inner.getMainComponentAsync();
    if (main && /^(icon|ic)-/.test(main.name)) { icon = main.name; break; }
  }
  return { name: action.name, ...(icon ? { icon } : {}), ...(props["Noti-Dot"] === true ? { dot: true } : {}) };
};
// Top-Navigation/Mobile (figma-top-nav.mjs) by its layer names: the bar and large titles' texts, the leading action, each
// row's Trailing-Slot actions (both slots share that name) and what the Control-Slot holds.
const readTopNav = async (instance, set) => {
  const named = (name) => instance.findOne((n) => n.name === name);
  const texts = (node) => (node ? Object.fromEntries(node.findAll((n) => n.type === "TEXT" && n.visible).map((text) => [text.name, text.characters])) : {});
  const actionsIn = async (row) => {
    const slot = named(row) ? named(row).findOne((n) => n.type === "SLOT" && n.name === "Trailing-Slot") : null;
    const out = [];
    for (const child of (slot ? slot.children : []).filter((child) => child.visible && child.type === "INSTANCE")) out.push(await navActionOf(child));
    return out;
  };
  const bar = named("Top-Heading-Text"), large = named("Main-Heading-Text"), lead = named("Top-Leading");
  const leadAction = lead ? lead.findOne((n) => n.type === "INSTANCE" && n.name === "Action") : null;
  const controlSlot = instance.findOne((n) => n.type === "SLOT" && n.name === "Control-Slot");
  const control = [];
  for (const child of controlSlot ? controlSlot.children : []) { const read_ = await read(child); if (read_) control.push(read_); }
  const topNav = {
    bar: { props: bar ? await propsOf(bar) : {}, texts: texts(bar) },
    large: { props: large ? await propsOf(large) : {}, texts: texts(large) },
    leading: lead ? { props: await propsOf(lead), ...(leadAction ? { action: await navActionOf(leadAction) } : {}) } : null,
    barActions: await actionsIn("Navigator-bar"), titleActions: await actionsIn("Expand-Heading"), control,
  };
  return { type: "INSTANCE", id: instance.id, name: instance.name, set, props: await propsOf(instance), topNav };
};
// A chart (❖ Chart, figma-charts.mjs): its properties, whether its Heading shows (a chart on its own hides it) and the
// items its Segmented shows; its drawing is Figma's sample data, so its layers are not read.
const CHART_SET = /^Chart\\/(?!Chart-Card$)/;
const readChart = async (instance, set) => {
  const out = { type: "INSTANCE", id: instance.id, name: instance.name, set, props: await propsOf(instance) };
  const heading = instance.findOne((n) => n.type === "FRAME" && n.name === "Heading");
  if (heading && !heading.visible) out.headingHidden = true;
  const segmented = instance.findOne((n) => n.type === "INSTANCE" && n.name === "Segmented");
  const list = segmented && segmented.visible ? segmented.findOne((n) => n.type === "SLOT") : null;
  if (list) {
    out.ranges = [];
    for (const item of list.children) if (item.visible && item.type === "INSTANCE") out.ranges.push({ text: firstText(item), props: await propsOf(item) });
  }
  return out;
};
// A Metric-Card (figma-metric.mjs): its Type, texts, trends, Card and Hero button, in the shape figma-push writes.
${READ_METRIC_CARD}
const readInstance = async (instance) => {
  const set = await setOf(instance);
  if (set && COMPOSITION.test(set.name)) return { ...(await readFrame(instance)), type: "FRAME", composition: set.name };
  if (set && set.name === "Top-Navigation/Mobile") return readTopNav(instance, set);
  if (set && CHART_SET.test(set.name)) return readChart(instance, set);
  if (set && set.name === "Metric-Card") return readMetricCard(instance, set);
  // Chart/Chart-Card is a Card holding a chart: read as that Card.
  if (set && set.name === "Chart/Chart-Card") {
    const card = instance.findOne((n) => n.type === "INSTANCE" && n.name === "Card");
    if (card) return { ...(await readInstance(card)), id: instance.id, name: instance.name };
  }
  const out = { type: "INSTANCE", id: instance.id, name: instance.name, set, props: await propsOf(instance), text: firstText(instance), nested: [], slots: [] };
  // A chat message's text is its bubble's Message (its Avatar's initials come first).
  if (set && set.name === "Chat/Conversation/Bubble") out.text = firstText(instance, "Message");
  const changed = new Set((instance.overrides || []).filter((o) => o.overriddenFields.some((f) => f === "componentProperties" || f === "characters")).map((o) => o.id));
  // Avatars the push named after their person (a chat message's author, a read list's readers).
  const renamed = new Set((instance.overrides || []).filter((o) => o.overriddenFields.includes("name")).map((o) => o.id));
  const walk = async (node, trail, owner) => {
    for (const child of node.children || []) {
      if (!child.visible) continue;
      // A slot of a nested instance (a chat bubble's Chat/Reaction/Status › Emoji-Items): its layers, by the instance it
      // sits in (figma-push writes it as \`within\`). Its layers are walked on as before.
      if (child.type === "SLOT" && trail.length && child.children && child.children.length) {
        const children = [];
        for (const inner of child.children) { const read_ = await read(inner); if (read_) children.push(read_); }
        out.innerSlots = out.innerSlots || [];
        out.innerSlots.push({ name: child.name, within: owner.name, children });
      }
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
      // Its own texts (not a slot's, not a nested instance's): Dashboard/Header's Subheading count. A nested instance's
      // text the page changed (an input's value and help in its field primitives, a checkbox's label in its Content):
      // by its layer name, with the instance path it sits in.
      if (child.type === "TEXT" && !trail.length) { out.texts = out.texts || []; out.texts.push({ name: child.name, characters: child.characters }); }
      else if (child.type === "TEXT" && changed.has(child.id)) { out.texts = out.texts || []; out.texts.push({ name: child.name, characters: child.characters, path: trail.join("/") }); }
      const next = child.type === "INSTANCE" ? [...trail, layerKey(child.name)] : trail;
      const avatarNamed = child.type === "INSTANCE" && renamed.has(child.id) && (await setOf(child))?.name === "Avatar/Single";
      if (child.type === "INSTANCE" && (changed.has(child.id) || avatarNamed || (await swappedIn(child, owner)))) out.nested.push({ path: next.join("/"), set: await setOf(child), props: await propsOf(child), text: firstText(child) });
      await walk(child, next, child.type === "INSTANCE" ? child : owner);
    }
  };
  await walk(instance, [], instance);
  // Empty parts left out: an answer holds 20 KB. With slots, its layout (how they sit, for a set Zen has no component of).
  if (!out.nested.length) delete out.nested;
  if (!out.slots.length) delete out.slots;
  else { const layout = await layoutOf(instance); if (layout) out.layout = layout; }
  // An icon's size (an Icon, a FileIcon, a Flag): its width's size variable, else its width where it is not the component's.
  if (set && (/^(icon|ic)-/.test(set.name) || set.name === "Flag")) {
    // (A file icon keeps its aspect ratio: Figma binds its height only.)
    const bound = instance.boundVariables || {};
    const sizeVar = await variableName((bound.width || bound.height || {}).id);
    const main = await instance.getMainComponentAsync();
    if (sizeVar) out.sizeVar = sizeVar;
    else if (main && Math.round(main.width) !== Math.round(instance.width)) out.size = Math.round(instance.width);
  }
  // A Color-Selector swatch: the colour variable its own fill is bound to (the colour it offers).
  if (set && set.name === "Color-Selector") {
    const paint = (instance.fills || [])[0];
    const fill = await variableName(paint && paint.boundVariables && paint.boundVariables.color && paint.boundVariables.color.id);
    if (fill) out.fill = fill;
  }
  // A text-less instance (an icon button, Dashboard/Header's Action-Item): the icon it draws, by the icon's own name.
  if (out.text === null) {
    delete out.text;
    const glyph = instance.findOne((n) => n.type === "INSTANCE" && n.visible && /^(icon|ic)-/.test(n.name));
    if (glyph) out.icon = glyph.name;
  }
  return out;
};
// What the Zen plugin's Import from Studio left on a layer (shared plugin data "zenstudio"): its Studio key (the element
// id it draws), and on the frame the Studio page and the export it came from.
const studioData = (node, name) => { try { return node.getSharedPluginData("zenstudio", name) || null; } catch (e) { return null; } };
const read = async (node) => {
  const out = await readLayer(node);
  const key = out ? studioData(node, "key") : null;
  if (key) out.key = key;
  return out;
};
const readLayer = async (node) => {
  if (!node.visible) return null;
  if (node.type === "TEXT") {
    const style = typeof node.textStyleId === "string" && node.textStyleId ? await figma.getStyleByIdAsync(node.textStyleId) : null;
    // The layer's name only when it is not its text (Figma names a text layer after its words).
    const align = node.textAlignHorizontal && node.textAlignHorizontal !== "LEFT" ? { align: node.textAlignHorizontal } : {};
    // Numbers: Tabular (Text tabularNumbers; a plugin can read it, not set it).
    const tabular = node.openTypeFeatures && node.openTypeFeatures.TNUM === true ? { tabular: true } : {};
    // Its colour: the Color/Content variable its fill is bound to (Text tone).
    const paint = Array.isArray(node.fills) ? node.fills.find((fill) => fill.visible !== false) : null;
    const fill = paint ? await variableName(paint.boundVariables && paint.boundVariables.color && paint.boundVariables.color.id) : null;
    return { type: "TEXT", id: node.id, ...(node.name === node.characters ? {} : { name: node.name }), characters: node.characters, textStyle: style ? style.name : null, ...align, ...tabular, ...(fill ? { fill } : {}) };
  }
  if (node.type === "INSTANCE") return readInstance(node);
  return readFrame(node);
};
// Its auto layout without the values at Figma's defaults (none: null).
const layoutOf = async (node) => {
  if (!("layoutMode" in node) || node.layoutMode === "NONE") return null;
  const bound = node.boundVariables || {};
  const layout = { mode: node.layoutMode };
  // A grid's gap is its column gap (Figma keeps itemSpacing for stacks).
  const grid = node.layoutMode === "GRID";
  const gap = grid ? node.gridColumnGap : node.itemSpacing;
  if (gap) layout.gap = gap;
  const gapVar = await variableName(((grid ? bound.gridColumnGap : bound.itemSpacing) || {}).id);
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
// Figma's shape nodes a Zen Shape draws (src/components/Shape).
const SHAPE_READ = new Set(["RECTANGLE", "ELLIPSE", "LINE", "STAR", "POLYGON"]);
// A child that fills its auto-layout parent on an axis (Figma's Fill container), or one placed outside the auto layout
// (Ignore auto layout): its constraints and its box in the parent's.
const placed = (out, child, parent) => {
  if (!("layoutMode" in parent) || parent.layoutMode === "NONE") {
    // A shape in a frame without auto layout keeps its X / Y (a Zen Shape in a free frame: px insets).
    if (out.shape && "layoutMode" in parent) out.absolute = { x: Math.round(child.x * 100) / 100, y: Math.round(child.y * 100) / 100, w: out.shape.w, h: out.shape.h, pw: Math.round(parent.width), ph: Math.round(parent.height), cx: child.constraints ? child.constraints.horizontal : "MIN", cy: child.constraints ? child.constraints.vertical : "MIN", free: true };
    return out;
  }
  // A grid cell keeps its minimum width (figma-push: columns that fit, counted for the page's width).
  if (parent.layoutMode === "GRID") {
    if (child.minWidth) out.minW = child.minWidth;
    return out;
  }
  if (child.layoutPositioning === "ABSOLUTE") {
    out.absolute = { x: Math.round(child.x), y: Math.round(child.y), w: Math.round(child.width), h: Math.round(child.height), pw: Math.round(parent.width), ph: Math.round(parent.height), cx: child.constraints.horizontal, cy: child.constraints.vertical };
    return out;
  }
  if (child.layoutSizingHorizontal === "FILL") out.fillW = true;
  if (child.layoutSizingVertical === "FILL") out.fillH = true;
  if (child.minWidth) out.minW = child.minWidth;
  if (child.maxWidth) out.maxW = child.maxWidth;
  if (child.maxHeight) out.maxH = child.maxHeight;
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
        // Its Sort glyph shows the sorted column's direction (figma-push: arrow up / down; ↕ elsewhere).
        const glyph = props.Type === "Sort" ? cell.findOne((n) => n.type === "INSTANCE" && n.name === "Icon") : null;
        const glyphName = glyph ? (await setOf(glyph))?.name ?? "" : "";
        const sorted = /arrow-up/.test(glyphName) ? "asc" : /arrow-down/.test(glyphName) ? "desc" : null;
        cells.push({ ...base, label: props.Label === false ? "" : named ? named[1] : firstText(cell) || "", ...(props.Type === "Sort" ? { sort: true } : {}), ...(sorted ? { sorted } : {}), ...(props.Type === "Checkbox" ? { checkbox: true } : {}), ...(props.Icon === true && swap ? { icon: swap[1] } : {}) });
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
const frameOf = (node, root) => {
  if (!root) return {};
  const studio = Object.fromEntries(["key", "page", "version"].map((name) => [name, studioData(node, name)]).filter(([, value]) => value));
  return { ...(typeof figma.fileKey === "string" ? { file: figma.fileKey } : {}), width: Math.round(node.width), height: Math.round(node.height), ...studio };
};
const readFrame = async (node, root = false) => {
  // Figma's own shapes come back as Zen Shapes (figma-push shapeNode, the other way): size, colour variables, arc,
  // count, ratio, corner variable, rotation, opacity. Vectors and boolean groups stay drawings.
  if (SHAPE_READ.has(node.type)) {
    const solid = (paints) => (Array.isArray(paints) ? paints.find((paint) => paint.visible !== false && paint.type === "SOLID") : null) || null;
    const fillPaint = solid(node.fills);
    const strokePaint = solid(node.strokes);
    const boundId = (paint) => (paint && paint.boundVariables && paint.boundVariables.color ? paint.boundVariables.color.id : null);
    const radiusBinding = node.boundVariables && node.boundVariables.topLeftRadius ? node.boundVariables.topLeftRadius.id : null;
    return { type: node.type, name: node.name, shape: {
      w: Math.round(node.width * 100) / 100, h: Math.round(node.height * 100) / 100,
      fill: fillPaint ? (await variableName(boundId(fillPaint))) || "unbound" : null,
      stroke: strokePaint ? (await variableName(boundId(strokePaint))) || "unbound" : null,
      strokeWeight: typeof node.strokeWeight === "number" ? node.strokeWeight : 1, strokeAlign: node.strokeAlign, cap: typeof node.strokeCap === "string" ? node.strokeCap : null,
      arc: node.type === "ELLIPSE" ? node.arcData : null, pointCount: node.pointCount, innerRadius: node.innerRadius,
      radius: typeof node.cornerRadius === "number" ? node.cornerRadius : null, radiusVar: await variableName(radiusBinding),
      rotation: Math.round((node.rotation || 0) * 100) / 100, opacity: node.opacity,
    } };
  }
  if (DRAWING.has(node.type)) return { type: node.type, name: node.name };
  const visible = (node.children || []).filter((child) => child.visible);
  if (visible.length && visible.every((child) => child.type === "INSTANCE")) {
    const sets = await Promise.all(visible.map(setOf));
    if (sets.every((set) => set && set.name === "Primitives/Table/Data-Row")) return readTable(node, visible, root);
  }
  const out = { type: node.type, id: node.id, name: node.name, ...frameOf(node, root), children: [] };
  // Clip content: a frame inside the page that clips (the page frame itself is the screen, which always does).
  if (!root && node.clipsContent === true) out.clip = true;
  // Overflow scrolling (Stack / Box scroll) and a background bound to a colour variable (a Box's surface).
  if (!root && node.overflowDirection && node.overflowDirection !== "NONE") out.scroll = node.overflowDirection;
  const paint = !root && Array.isArray(node.fills) ? node.fills.find((fill) => fill.visible !== false) : null;
  const fill = paint ? await variableName(paint.boundVariables && paint.boundVariables.color && paint.boundVariables.color.id) : null;
  if (fill) out.fill = fill;
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

export { figmaMapping, apiPropsOf } from "./figma-map.mjs";

/* ── converting ─────────────────────────────────────────────────────────────────────────────────────────────────── */

const literal = (value) => ({ kind: "literal", value });
const TEXT_PROPS = /^(Label|Text|Title|Content)$/;

/** A spacing step: from its variable's name ("Spacing/Gap/Medium" → md) or the nearest step to the px value. */
function spacingStep(variable, px, table) {
  // A padding bound to a page margin (Breakpoint & Grids › Margin-Comfortable…) stays that margin (ZenMargin).
  if (variable && table === PADDING_PX) {
    const margin = Object.keys(MARGIN_VARIABLE).find((key) => MARGIN_VARIABLE[key] === variable.split("/").pop().trim());
    if (margin) return margin;
  }
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
    else if (!(toggle.on === "slot" && item.slots?.length)) notes.push(`${where}: ${toggle.label} on needs content the design does not carry (${toggle.prop})`);
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

/** A Heading's default text style by level (Text.tsx headingStyleByLevel; figma-push HEADING_STYLE). */
const HEADING_STYLE = { 1: "Heading/1", 2: "Heading/4", 3: "Heading/Subheading", 4: "Body/Extra/Bold", 5: "Body/Base/Bold", 6: "Body/Base/Bold" };
/** A Color/Content variable ("Content/Neutral/Base") → the Text tone that paints with it (contentTone.ts, the other way). */
const TONE_OF = new Map();
// The first tone of a token is its own name; the aliases after it (neutral-strongest, secondary…) paint the same.
for (const tone of contentTones) { const token = contentToneToken(tone); if (token && !TONE_OF.has(token)) TONE_OF.set(token, tone); }
/** Figma's layers a ListItem's leading can be (figma-push swaps them in at its Avatar). */
const LEADING_SETS = new Set(["Avatar/Single", "Dock-Icon", "icon-media-file", "Thumbnail", "Flag"]);
/**
 * A List-Item's parts (figma-push listItemParts, the other way): its Info-Content's Title and Subtitle (the reader's
 * Contents slot) or the push's own texts → title and caption; the instance at its Avatar → leading; what its Trailing
 * primitive's Actions slot holds → trailing.
 */
function listItemParts(node, props, ctx, own) {
  const contents = (node.slots ?? []).find((slot) => slot.name === "Contents");
  const info = contents?.children?.length === 1 && /Slot\/Info-Content$/.test(contents.children[0].set?.name ?? "") ? contents.children[0] : null;
  const infoTexts = info ? (info.slots ?? []).flatMap((slot) => slot.children ?? []).filter((child) => child.type === "TEXT") : [];
  const title = infoTexts.find((text) => text.name === "Title")?.characters ?? ownText(node, "Title");
  const caption = infoTexts.find((text) => text.name === "Subtitle")?.characters ?? ownText(node, "Subtitle");
  if (typeof title === "string" && title) props.title = literal(title);
  if (typeof caption === "string" && caption) props.caption = literal(caption);
  if (info) own.slots.add("Contents");
  const lead = (node.nested ?? []).find((nested) => LEADING_SETS.has(nested.set?.name) && !nested.path.includes("/"));
  if (lead) {
    own.nested.add(lead);
    const element = convert({ type: "INSTANCE", name: lead.path, set: lead.set, props: lead.props ?? {}, ...(typeof lead.text === "string" ? { text: lead.text } : {}) }, ctx);
    if (element) props.leading = { kind: "element", node: element };
  }
  // The Trailing primitive (Slot-Actions) is the frame of the trailing layer, not a layer of its own.
  for (const nested of node.nested ?? []) if (/^Trailing(\/|$)/.test(nested.path)) own.nested.add(nested);
  const actions = [...(node.innerSlots ?? []), ...(node.slots ?? [])].filter((slot) => slot.name === "Actions");
  const after = actions.flatMap((slot) => slot.children ?? []).map((child) => convert(child, ctx)).filter(Boolean);
  for (const slot of actions) own.slots.add(slot.name);
  if (after.length) props.trailing = { kind: "element", node: after.length === 1 ? after[0] : { kind: "element", name: "Stack", props: { direction: literal("row"), gap: literal("xs") }, children: after } };
}
/** Form fields drawn as Figma's Input/…-Field (figma-push fieldParts): Label, Text (value, else placeholder), Message. */
const FIELD_CODES = new Set(["InputField", "SelectField", "DateField", "NumberField", "TextAreaField", "AutocompleteField", "RichTextField"]);
function fieldParts(node, props, own) {
  const labelled = (node.nested ?? []).find((nested) => /(^|\/)Label$/.test(nested.path));
  const label = typeof labelled?.props?.Label === "string" ? labelled.props.Label : ownText(node, "Label") ?? labelled?.text;
  if (typeof label === "string" && label && node.props?.Label !== false) props.label = literal(label);
  if (labelled) own.nested.add(labelled);
  const shown = ownText(node, "Text");
  if (typeof shown === "string" && shown) props[node.props?.State === "Inputted" ? "defaultValue" : "placeholder"] = literal(shown);
  const message = ownText(node, "Message");
  // Help-Text on: its message (Figma's toggle alone would only say "Help text").
  if (node.props?.["Help-Text"] === true) {
    if (typeof message === "string" && message) props[node.props?.State === "Error" ? "errorMessage" : "helpText"] = literal(message);
    else if (props.helpText?.value === "Help text") delete props.helpText;
  }
}
/** Checkbox, RadioButton and Toggle keep their label (and caption, Subtext) in a nested Content primitive. */
const LABELLED_CONTROLS = new Set(["Checkbox", "RadioButton", "Toggle"]);
function controlLabelParts(node, props, own) {
  const content = (node.nested ?? []).find((nested) => nested.path === "Content");
  if (content) own.nested.add(content);
  const label = ownText(node, "Label") ?? content?.text ?? node.text;
  if (typeof label === "string" && label) props.label = literal(label);
  const caption = ownText(node, "Subtext");
  if (typeof caption === "string" && caption && content?.props?.Subtext !== false) props.caption = literal(caption);
}

/** Figma slots a component takes as a node prop, not as its children (Sidebar: Header-Content, Footer-Content). */
const SLOT_PROPS = {
  Sidebar: { "Header-Content": "brand", "Footer-Content": "footer" },
  DashboardHeader: { "Leading-Slots": "leading", "Center-Slots": "center", "Trailing-Slots": "trailing", "Control-Slots": "controls", "Action-Slots": "actions" },
  ListBox: { "Header-Slot": "header", "Footer-Slot": "footer" },
  // Metric-Inline's Custom-Slot: the Metric's (and so the MetricCard's) custom content (figma-push SLOT_OF_PROP).
  Metric: { "Custom-Slot": "custom" },
  MetricCard: { "Custom-Slot": "custom" },
  Metric: { "Custom-Slot": "custom" },
};
/**
 * A Sidebar header's own layers: Figma's sample LOGO and its Collapse button are the component's (Sidebar.tsx draws the
 * collapse control with onCollapsedChange; figma-push sidebarHeader), so only the rest is the page's brand.
 */
function sidebarBrandLayers(slot, ctx, where) {
  const logo = (layer) => layer.type === "INSTANCE" && /(^|\/)LOGO$/.test(layer.set?.name ?? "");
  const collapse = (layer) => layer.type === "INSTANCE" && /^icon-layout-(left|right)-line$/.test(layer.props?.["Leading-Icon-Src"] ?? layer.icon ?? "");
  const own = (layer) => logo(layer) || collapse(layer) || (layer.type === "FRAME" && (layer.children ?? []).length > 0 && layer.children.every(own));
  const instances = rowsOf(slot.children ?? []);
  if (instances.some(logo)) ctx.notes.push(`${where}: Figma's sample LOGO left out (the Sidebar's logo or brand is the page's)`);
  if (instances.some(collapse)) ctx.notes.push(`${where}: its Collapse button is the Sidebar's own (drawn with onCollapsedChange): left out`);
  return { ...slot, children: (slot.children ?? []).filter((layer) => !own(layer)) };
}

/** Primitive rows that stand as code elements where the code takes nodes (Sidebar footer: `<SidebarMenuItem>`). */
const ROW_ELEMENTS = { "Primitives/Side-Bar/Menu-Item/Master": "SidebarMenuItem" };
/** The prop that names a data slot's selected item (Figma's Select = Yes on the item). */
const SELECTED_PROP = { Sidebar: "selectedId", Segmented: "defaultValue", Tabs: "defaultValue" };
/** Components whose text prop is a plain text layer of their set (figma-push TEXT_PROP): the instance's text is it. */
const TEXT_PROP = { InputConditionItem: "label" };
/** An item's icon field where it is not `icon` (SegmentedOption `leading`). */
const ITEM_ICON = { Segmented: "leading" };
/* ── tables ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Figma's cell primitives (Primitives/Table/Cell/…) → the code Table's column `content` (Table.tsx TableCellContent). */
const CELL_CONTENT = { "Actions-Cell": "actions", "Text-Cell": "text", "Editabled-Cell": "text", "Dock-Icon-Cell": "dock-icon", "Basic-Icon-Cell": "icon", "Avatar-Cell": "avatar", "Photo-Cell": "photo", "Badge-Cell": "badge", "Tag-Cell": "tag", "Trend-Cell": "trend", "Progress-Cell": "progress" };
/** Cells that draw a picture beside their label (its text is the picture's: an emoji, not the label). */
const MEDIA_CONTENT = new Set(["avatar", "photo", "icon", "dock-icon"]);
/**
 * What the code's Table draws in its cells (Table.tsx cellOf / cellVisual): the layer name its `overrides` use and the
 * props it gives the component. A Figma instance that differs (a yellow Badge, an emoji Dock-Icon) is written as that
 * row's override.
 */
const TABLE_DRAWS = {
  Badge: { layer: "Badge", props: { size: "medium", theme: "neutral", background: "subtle", leadingIcon: false } },
  IconButton: { layer: "Button", props: { size: "md", level: "primary", appearance: "flat" } },
  DockIcon: { layer: "Dock-Icon", props: { size: "xs", theme: "neutral", background: "subtle" } },
  // An avatar / photo cell's Avatar (Table.tsx cellVisual): its size and shape follow the cell (see drawnProps).
  Avatar: { layer: "Avatar", props: { background: "subtle", theme: "neutral" } },
};
/** Table.tsx initialsOf: the first letters of the first two words. */
const tableInitials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("");
/** What the Table draws for a cell's instance: an Avatar is Small over a Subtext (XSmall alone), square in a photo cell. */
const drawnProps = (code, column) => (code === "Avatar" ? { ...TABLE_DRAWS.Avatar.props, size: column.caption ? "sm" : "xs", shape: column.content === "photo" ? "square" : "circle" } : TABLE_DRAWS[code].props);

/** Figma Actions-Cell's default button icon (docs/figma-contracts/table-cells.json). */
const ACTION_ICON = "icon-dots-vertical-line";
/** An icon-only row action's name, by its icon: what the button does, not what it draws. */
const ACTION_WORDS = [[/chevron-right|arrow-right|arrow-up-right|link-external/, "Open"], [/dots-(?:vertical|horizontal)|more/, "More actions"], [/edit|pencil/, "Edit"], [/trash|delete/, "Delete"], [/eye/, "View"], [/download/, "Download"], [/copy/, "Copy"], [/share/, "Share"], [/plus/, "Add"]];
const actionLabel = (icon) => ACTION_WORDS.find(([pattern]) => pattern.test(icon))?.[1] ?? iconWords(icon);

/**
 * An Actions-Cell's buttons (Button/Icon-Flat instances in its Actions slot) as the column's `actions`: icon (Figma's
 * default when not swapped), a name from the icon, and size / level where they differ from what the Table draws.
 */
function cellActions(cell, mapping, notes, where) {
  const ids = new Set();
  return (cell.parts ?? []).flatMap((part) => {
    const set = mapping.sets.get(part.set?.id) ?? mapping.sets.get(part.set?.name);
    if (set?.code !== "IconButton") return [];
    const figma = instanceProps(part, set, mapping, notes, where);
    const icon = typeof figma.icon?.value === "string" ? figma.icon.value : ACTION_ICON;
    const label = actionLabel(icon);
    const fields = { id: literal(uniqueId(slug(label), ids)), icon: literal(icon), label: literal(label) };
    for (const prop of ["size", "level"]) {
      if (figma[prop] && !sameValue(figma[prop].value, TABLE_DRAWS.IconButton.props[prop])) fields[prop] = figma[prop];
    }
    return [{ fields }];
  });
}

/**
 * Figma's Table (a frame of Primitives/Table/Data-Row instances, read by figmaReadCode as one TABLE) → the code's
 * <Table>: a column per header cell (its label, Sort, Align, a fixed width or Fill; its content from the first row's cell
 * primitive, Bold and Subtext from it), the rows written in the Table (as a design copy writes them: a later pull of the
 * frame compares them as the Table's prop, figma-diff.mjs), and each row's Zen instances that differ from
 * what the Table draws as `overrides` by layer ("Row[row-1]/status/Badge"). An Actions-Cell becomes `content: "actions"`
 * with the first row's buttons as the column's `actions` (cellActions). A cell the Table has no content for (a Radio)
 * leaves its column out, with a note.
 */
function tableElement(node, ctx) {
  const { mapping, notes } = ctx;
  const where = `Table "${node.name}"`;
  const header = node.header ?? [];
  const sample = node.rows[0]?.cells ?? [];
  const ids = new Set();
  const columns = [];
  // A first checkbox column is the Table's selection (figma-push: `selectable`), not a column of its own.
  const selectable = Boolean(header[0]?.checkbox);
  for (let index = selectable ? 1 : 0; index < Math.max(header.length, sample.length); index += 1) {
    const head = header[index] ?? {};
    const cell = sample[index] ?? {};
    // An Avatar-Cell with a Square Avatar is a photo cell without its picture (Table.tsx cellVisual; figma-push draws it so).
    const squareAvatar = cell.kind === "Avatar-Cell" && (cell.parts ?? []).some((part) => /^Avatar\b/.test(part.set?.name ?? "") && part.props?.Shape === "Square");
    const content = cell.kind === "Control-Cell" ? { Checkbox: "checkbox", Toggle: "toggle" }[cell.props?.Type] ?? null : squareAvatar ? "photo" : cell.kind ? CELL_CONTENT[cell.kind] ?? null : "text";
    const named = head.label ? `the “${head.label}” column` : `column ${index + 1}`;
    if (!content) { notes.push(`${where}: ${named} (${cell.kind}${cell.props?.Type ? ` ${cell.props.Type}` : ""}) has no Table content in code: left out`); continue; }
    // Actions-Cell: its icon buttons become the column's `actions` (the first row's; another row's own icon is an override).
    const actions = content === "actions" ? cellActions(cell, mapping, notes, `${where} › ${named}`) : null;
    if (actions && !actions.length) { notes.push(`${where}: ${named} (Actions-Cell) holds no icon button: left out`); continue; }
    const id = uniqueId(slug(head.label || (actions ? "actions" : `column ${index + 1}`)), ids);
    const fields = { id: literal(id), header: literal(head.label ?? "") };
    if (head.sort) fields.sortable = literal(true);
    if ((cell.align ?? head.align) === "Right") fields.align = literal("right");
    if (!(cell.fill ?? head.fill) && (cell.w ?? head.w)) fields.width = literal(`${cell.w ?? head.w}px`);
    if (content !== "text") fields.content = literal(content);
    if (actions) fields.actions = { kind: "array", items: actions.map((action) => ({ kind: "object", fields: action.fields })) };
    if (cell.props?.Bold === "Yes") fields.bold = literal(true);
    const caption = cell.props?.Subtext === "Yes" || cell.props?.Caption === true;
    if (caption) fields.captionField = literal(`${id}Caption`);
    if (head.icon) {
      if (isZenIcon(head.icon, mapping)) fields.icon = literal(head.icon);
      else notes.push(`${where}: ${named}'s header icon "${head.icon}" is not a Zen icon (left out)`);
    }
    columns.push({ index, id, content, caption, fields, actions });
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
      if (column.actions) {
        const mine = cellActions(cell, mapping, [], `${where} › ${column.id}`);
        mine.forEach((action, index) => {
          const shared = column.actions[index]?.fields ?? {};
          const fields = {};
          for (const prop of ["icon", "size", "level"]) {
            const value = action.fields[prop]?.value ?? (prop === "icon" ? undefined : TABLE_DRAWS.IconButton.props[prop]);
            const columnValue = shared[prop]?.value ?? (prop === "icon" ? undefined : TABLE_DRAWS.IconButton.props[prop]);
            if (value !== undefined && !sameValue(value, columnValue)) fields[prop] = literal(value);
          }
          if (Object.keys(fields).length) overrides[`Row[${rowId}]/${column.id}/${TABLE_DRAWS.IconButton.layer}${column.actions.length > 1 ? `[${index}]` : ""}`] = { kind: "object", fields };
        });
        continue;
      }
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
      const drawn = parts.map((part) => ({ part, set: mapping.sets.get(part.set?.id) ?? mapping.sets.get(part.set?.name) })).filter(({ set }) => set && set.code !== "IconButton" && TABLE_DRAWS[set.code]);
      drawn.forEach(({ part, set }, index) => {
        const draws = TABLE_DRAWS[set.code];
        const figma = instanceProps(part, set, mapping, notes, `${where} › ${column.id}`);
        const defaults = mapping.apiProps[set.code];
        const fields = {};
        const expected = drawnProps(set.code, column);
        for (const [prop, value] of Object.entries(expected)) {
          const mine = figma[prop]?.value ?? defaults?.get(prop);
          if (mine !== undefined && !sameValue(mine, value)) fields[prop] = literal(mine);
        }
        for (const [prop, value] of Object.entries(figma)) if (!(prop in expected) && prop !== "children") fields[prop] = value;
        // An avatar's own initials, where they are not the label's first two words (Table.tsx initialsOf).
        if (set.code === "Avatar" && typeof part.text === "string" && part.text && part.text !== tableInitials(String(record[column.id] ?? ""))) fields.children = literal(part.text);
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
  if (selectable) props.selectable = literal(true);
  const sortedAt = header.findIndex((head) => head.sorted);
  const sortedColumn = columns.find((column) => column.index === sortedAt);
  if (sortedColumn) props.sort = { kind: "object", fields: { columnId: literal(sortedColumn.id), direction: literal(header[sortedAt].sorted) } };
  return { kind: "element", name: "Table", props, children: [] };
}

/* ── Dashboard/Header ──────────────────────────────────────────────────────────────────────────────────────────── */

/** Components whose Figma rows carry a padding the component does not draw (Header/Dashboard pads each row). */
const PADDED = new Set(["DashboardHeader"]);

/** The element in a Stack with the row's padding (one step, or X and Y). */
function padded(element, node, ctx) {
  const [top = 0, right = 0, bottom = 0, left = 0] = node.layout.padding;
  if (top !== bottom || left !== right) ctx.notes.push(`${element.name} "${node.name}": padding ${[top, right, bottom, left].join("/")} differs by side; the Stack around it takes ${Math.max(top, bottom)} above and below, ${Math.max(left, right)} at the sides`);
  const step = (px) => spacingStep(null, px, PADDING_PX);
  const props = top === bottom && left === right && top === left ? { padding: literal(step(top)) } : { paddingX: literal(step(Math.max(left, right))), paddingY: literal(step(Math.max(top, bottom))) };
  return { kind: "element", ...(idOf(node, ctx, "pad") ? { id: idOf(node, ctx, "pad") } : {}), name: "Stack", props, children: [element] };
}

/** Every text layer in a slot's layers, with its layer name (a text layer named after its words has none). */
const slotTexts = (nodes) => nodes.flatMap((node) => (node.type === "TEXT" ? [node] : slotTexts(node.children ?? [])));

/**
 * What a Primitives/Dashboard/Header row holds outside its slot props (DashboardHeader): Type=Main's Header-Text
 * (title, Child-Heading, SubHeading), Control-Bar's Search and its Subheading count. The texts replace the toggles'
 * stand-ins. Returns the slots it took.
 */
function dashboardHeaderParts(node, props, ctx) {
  const handled = new Set();
  const type = props.type?.value ?? "control-bar";
  delete props.subheading;
  delete props.childTitle;
  if (type === "main") {
    const headerText = (node.slots ?? []).find((slot) => slot.name === "Header-Text");
    // Header-Text with layers of its own (a cover instead of Heading-Wrapper and SubHeading): a custom row keeps them all.
    const own = (headerText?.children ?? []).filter((child) => !(child.name === "Heading-Wrapper" || (child.type === "TEXT" && child.name === "SubHeading")));
    if (own.length) {
      props.type = literal("custom");
      ctx.notes.push(`DashboardHeader "${node.name}": its Header-Text holds layers of its own (${own.map((child) => child.name ?? child.type).join(", ")}), so the row is type="custom" with every slot's content`);
      return { handled, children: true };
    }
    if (headerText) {
      handled.add("Header-Text");
      const texts = slotTexts(headerText.children ?? []);
      const named = (name) => texts.find((text) => text.name === name)?.characters;
      const title = texts.find((text) => text.name !== "Child" && text.name !== "SubHeading")?.characters;
      if (title) props.title = literal(title.replace(/\u2028/g, " "));
      if (node.props?.["Child-Heading"] === true && named("Child")) props.childTitle = literal(named("Child"));
      if (node.props?.Subheading === true && named("SubHeading")) props.subheading = literal(named("SubHeading"));
    } else {
      // No Header-Text read (the push's own JSON): the row's first text is the title, its `texts` the others.
      if (typeof node.text === "string" && node.text) props.title = literal(node.text);
      if (node.props?.["Child-Heading"] === true && node.texts?.Child) props.childTitle = literal(node.texts.Child);
      if (node.props?.Subheading === true && node.texts?.SubHeading) props.subheading = literal(node.texts.SubHeading);
    }
  }
  if (type === "control-bar") {
    // Search: Search/Default Medium, its placeholder the text an override gave it.
    if (node.props?.Search !== false) {
      const typed = Array.isArray(node.texts) ? node.texts.find((text) => /^Search(\/|$)/.test(text.path ?? ""))?.characters : undefined;
      const placeholder = (node.nested ?? []).find((nested) => nested.path === "Search")?.text ?? typed ?? "Search";
      props.search = { kind: "element", node: { kind: "element", ...(idOf(node, ctx, "search") ? { id: idOf(node, ctx, "search") } : {}), name: "Search", props: { size: literal("md"), placeholder: literal(placeholder) }, children: [] } };
    }
    const count = ownText(node, "Subheading");
    if (node.props?.Subheading === true && count) props.subheading = literal(count);
  }
  return { handled, children: type === "custom" };
}

/** A known glyph's name for an icon-only action. */
const ACTION_NAMES = { bell: "Notifications", "message-chat-circle": "Messages", settings: "Settings", "help-circle": "Help", mail: "Inbox" };

/**
 * Primitives/Dashboard/Header/Action-Item (12280:19532) → AppShellAction: its icon (the glyph it draws), Theme Flat →
 * `appearance="flat"`, Notification with Noti-type Dot → `dot`, Number → `count` (the dot's number).
 */
function actionItem(node, ctx) {
  const icon = node.icon && isZenIcon(node.icon, ctx.mapping) ? node.icon : "icon-bell-01-line";
  if (!node.icon || icon !== node.icon) ctx.notes.push(`AppShellAction "${node.name}": the Action-Item's icon was not read (${node.icon ?? "none"}): it draws ${icon}`);
  const word = icon.replace(/^(icon|ic)-/, "").replace(/(-\d+)?-(line|solid|duotone)$/, "");
  const props = { icon: literal(icon), "aria-label": literal(node.name && !node.name.includes("/") ? node.name : ACTION_NAMES[word] ?? iconWords(icon)) };
  if (node.props?.Theme === "Flat") props.appearance = literal("flat");
  if (node.props?.Notification !== false) {
    const count = Number.parseInt(node.text ?? "", 10);
    if (node.props?.["Noti-type"] === "Number" && count > 0) props.count = literal(count);
    else props.dot = literal(true);
  }
  return { kind: "element", name: "AppShellAction", props, children: [] };
}

/** Icon-only controls the harness wants named (icon-button/needs-name): they get an aria-label. */
const NEEDS_NAME = new Set(["IconButton"]);
/** The elements that take Figma's resizing (width / height fill), src/components/Layout/sizing.ts. */
const SIZED = new Set(["Stack", "Grid", "Box", "Text", "Card", "ListBox"]);
/** Components sized like a layout layer whose Figma min / max width comes back as minWidth / maxWidth (Card.tsx, ListBox). */
const SIZED_INSTANCES = new Set(["Card", "ListBox"]);
const LAYOUT_FRAMES = new Set(["Stack", "Grid", "Box"]);
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
  // A Label variant (Tab-Item's True / False) shows or hides the label; it is not the label's text.
  const toggle = (value) => value === "True" || value === "False";
  const text = Object.entries(props).find(([name, value]) => TEXT_PROPS.test(name) && typeof value === "string" && !toggle(value))?.[1] ?? item.text ?? "";
  const label = props.Label === false || props.Label === "False" ? "" : text;
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

/**
 * Breadcrumbs' look from its crumbs' Item primitives (figma-push writes Level and Emphasis there; Sub and Default are
 * the primitive's own): a first crumb that is not Master turns `master` off, every crumb Medium is the trail's emphasis.
 */
function breadcrumbsLook(crumbs, props) {
  const look = (crumb) => (crumb.nested ?? []).find((nested) => nested.path === "Item")?.props ?? {};
  if (crumbs.length && look(crumbs[0]).Level !== "Master") props.master = literal(false);
  if (crumbs.length && crumbs.every((crumb) => look(crumb).Emphasis === "Medium")) props.emphasis = literal("medium");
}

/** A DescriptionList row (.Primitives/Description-List/Item): its Term and Value, Emphasis the closing total (figma-push ITEM_BUILDERS). */
function descriptionItem(item) {
  const props = item.props ?? {};
  const text = (name) => (typeof props[name] === "string" ? props[name] : ownText(item, name) ?? "");
  const fields = { term: literal(text("Term")), description: literal(text("Value")) };
  if (props.Emphasis === "Yes") fields.emphasis = literal(true);
  return { kind: "object", fields };
}

/** The instances of a slot, frames looked into (Breadcrumbs' Item-List, a section's rows). */
const rowsOf = (nodes) => nodes.flatMap((node) => (node.type === "INSTANCE" ? [node] : rowsOf(node.children ?? [])));
const isSelected = (item) => ["Select", "Selected", "Active"].some((name) => item.props?.[name] === "Yes" || item.props?.[name] === true);

/**
 * A data slot's items (src/platform/studio/slots/dataSlots.ts) from its Figma instances: the array the prop holds, and
 * the id of the item Figma shows selected. A nested slot (Sidebar `sections[n].items`): each frame a section, its
 * Section-Title's text the label, its other rows the list.
 */
function dataSlotValue(slot, dataSlot, ctx, where, rail = false) {
  if (dataSlot.component === "DescriptionList") return { value: { kind: "array", items: rowsOf(slot.children ?? []).map(descriptionItem) }, selected: null };
  const labelKey = /\btitle:/.test(dataSlot.newItem(0).code) ? "title" : "label";
  const iconKey = ITEM_ICON[dataSlot.component] ?? "icon";
  let selected = null;
  const toItem = (item) => {
    const shown = rail ? { ...item, props: { ...item.props, Label: true }, text: item.text || item.name } : item;
    const fields = itemFields(shown, ctx, { labelKey, iconKey, where: `${where} › ${dataSlot.itemName}` });
    // A count in its Badge-Counter (a Tab-Item with Badge on).
    const count = item.props?.Badge === true ? (item.nested ?? []).find((nested) => nested.path === "Badge-Counter")?.text : null;
    if (count) fields.badge = literal(/^\d+$/.test(count) ? Number(count) : count);
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
    } else groups.push({ rows: rowsOf(child.children ?? []), name: child.name ?? "" });
  }
  const sections = groups.map(({ rows, name }) => {
    const title = rows.find((row) => /Section-Title$/.test(row.set?.name ?? ""));
    const fields = {};
    if (title) fields.label = literal(title.text ?? "");
    else if (rail && /^Section (?!\d+$)(.+)$/.test(name ?? "")) fields.label = literal(name.slice(8));
    // A Divider between groups is not a row.
    fields[dataSlot.nested] = { kind: "array", items: rows.filter((row) => row !== title && !/(^|\/)Divider$/.test(row.set?.name ?? row.name ?? "")).map(toItem) };
    return { kind: "object", fields };
  });
  return { value: { kind: "array", items: sections }, selected };
}

/** A slot's layers as one node: the one layer, or a Stack of them in the slot's layout (none: null). */
function slotContent(slot, ctx) {
  const nodes = (slot.children ?? []).map((child) => convert(child, ctx)).filter(Boolean);
  if (nodes.length <= 1) return nodes[0] ?? null;
  const element = frameElement({ name: slot.name, layout: slot.layout }, nodes, ctx);
  const id = idOf(slot, ctx);
  if (id) element.id = id;
  SOURCE.set(element, slot);
  return element;
}

/* ── AppShell ───────────────────────────────────────────────────────────────────────────────────────────────────── */

/** The Zen component a layer is an instance of (null for a frame or an unmapped instance). */
const codeOf = (node, ctx) => (node?.type === "INSTANCE" && node.set ? (ctx.mapping.sets.get(node.set.id) ?? ctx.mapping.sets.get(node.set.name))?.code ?? null : null);
/** The layer itself when it is an instance of `code`, or the one instance a composition wraps (Patterns/Sidebar/… › Side-Bar/Master/Basic). */
const instanceIn = (node, code, ctx) => {
  if (!node) return null;
  if (codeOf(node, ctx) === code) return node;
  return node.type !== "INSTANCE" && node.children?.length === 1 ? instanceIn(node.children[0], code, ctx) : null;
};
const isNavigation = (node, ctx) => codeOf(node, ctx) === "DashboardHeader" && node.props?.Type === "Navigation";
/** A header's rows: Figma's Header/Dashboard holds them in its Sections slot, the push's Header frame directly. */
const rowsIn = (node) => (node.type === "INSTANCE" ? [node] : (node.children ?? []).flatMap((child) => (child.type === "SLOT" ? child.children ?? [] : [child])));
/** The collapse toggle or the phone's menu button, which AppShell draws itself at the start of the top bar. */
const TOGGLE_ICON = /^icon-(layout-(left|right)|menu-01)-line$/;
/** A Stack the pull adds around one element for its padding (a padded Dashboard header row): the element. */
const unpadded = (element) => (element?.name === "Stack" && element.children.length === 1 && Object.keys(element.props).every((name) => /^padding[XY]?$/.test(name)) ? element.children[0] : element);
/** Layers as one node: the one layer, or a Stack of them in `layout`. */
function oneOf(elements, { name, layout, source }, ctx) {
  if (elements.length <= 1) return elements[0] ?? null;
  const element = frameElement({ name, layout }, elements, ctx);
  const id = source ? idOf(source, ctx) : undefined;
  if (id) element.id = id;
  return element;
}
/** The one instance a wrapper holds (Figma's Floating-Actions › Floating-Item › Button/Icon-Main), else the layer. */
const innermost = (node) => (node.type === "INSTANCE" || node.children?.length !== 1 ? node : innermost(node.children[0]));

/**
 * An app frame as AppShell (AppShell.tsx; figma-push.mjs appShellNode, the other way): a row of the Sidebar (an instance,
 * or the composition that wraps one), a column whose first row is the Dashboard header Type=Navigation, and an optional
 * Side-Panel. Read from Figma's ◇ Master-Layout (Main-Container › Header/Dashboard › Sections; Body with its Content
 * and Floating-Actions) and from the push's frames (Column › Header, Sections, Main). The navigation row gives `header`
 * (its Leading-Slots without the toggle AppShell draws), `headerCenter` and `headerActions` (a named Avatar at their
 * end is the account); the other rows are `sections`; the page frame's layers the children (Body's padding kept in a
 * Stack); a layer pinned outside the auto layout the floating action; layers after the page the footer.
 */
function appShellElement(node, ctx) {
  const layers = node.children ?? [];
  if (node.type === "INSTANCE" || node.layout?.mode !== "HORIZONTAL" || layers.length < 2 || layers.length > 3) return null;
  const sidebarNode = instanceIn(layers[0], "Sidebar", ctx);
  const column = layers[1];
  const asideNode = layers[2] ? instanceIn(layers[2], "SidePanel", ctx) : null;
  if (!sidebarNode || column.type === "INSTANCE" || column.layout?.mode !== "VERTICAL" || (layers[2] && !asideNode)) return null;
  const [headerNode, ...rest] = column.children ?? [];
  const rows = headerNode ? rowsIn(headerNode) : [];
  if (!isNavigation(rows[0], ctx)) return null;
  const props = { sidebar: { kind: "element", node: convert(sidebarNode, ctx) } };
  const nav = rows[0];
  const slotOf = (name) => (nav.slots ?? []).find((slot) => slot.name === name);
  // Top bar: Leading-Slots without the toggle (AppShell draws it; a design without one says sidebarToggle={false}).
  const leadingSlot = slotOf("Leading-Slots");
  const leading = (leadingSlot?.children ?? []).map((child) => convert(child, ctx)).filter(Boolean);
  if (leading[0]?.name === "IconButton" && TOGGLE_ICON.test(leading[0].props.icon?.value ?? "")) leading.shift();
  else props.sidebarToggle = literal(false);
  const header = oneOf(leading, { name: "Leading-Slots", layout: leadingSlot?.layout, source: leadingSlot }, ctx);
  if (header) props.header = { kind: "element", node: unpadded(header) };
  const centerSlot = nav.props?.["Nav-Center-Block"] === false ? null : slotOf("Center-Slots");
  const center = centerSlot ? oneOf((centerSlot.children ?? []).map((child) => convert(child, ctx)).filter(Boolean), { name: "Center-Slots", layout: centerSlot.layout, source: centerSlot }, ctx) : null;
  if (center) props.headerCenter = { kind: "element", node: center };
  const trailingSlot = slotOf("Trailing-Slots");
  const trailingNodes = trailingSlot?.children ?? [];
  const trailing = trailingNodes.map((child, index) => {
    const element = convert(child, ctx);
    // The account: an Avatar named after the person at the end of the actions (the push names it so).
    const name = child.name ?? "";
    if (element?.name === "Avatar" && index === trailingNodes.length - 1 && name && !name.includes("/")) {
      const fields = { name: literal(name) };
      for (const prop of ["src", "theme"]) if (element.props[prop]) fields[prop] = element.props[prop];
      return { ...element, name: "AppShellAccount", props: fields, children: [] };
    }
    return element;
  }).filter(Boolean);
  const actions = oneOf(trailing, { name: "Trailing-Slots", layout: trailingSlot?.layout, source: trailingSlot }, ctx);
  if (actions) props.headerActions = { kind: "element", node: actions };
  // Sections: Header/Dashboard's other rows, or the push's Sections frame.
  const sectionNodes = rows.slice(1);
  let after = rest;
  if (after[0]?.type === "FRAME" && after[0].name === "Sections") { sectionNodes.push(...(after[0].children ?? [])); after = after.slice(1); }
  const sections = sectionNodes.map((row) => unpadded(convert(row, ctx))).filter(Boolean);
  if (sections.length) props.sections = { kind: "element", node: sections.length === 1 ? sections[0] : { kind: "element", name: "Stack", props: { gap: literal("none") }, children: sections } };
  // The page: the next frame's layers (Body's padding kept in a Stack around them); pinned layers are the floating action.
  const pinned = [];
  let children = [];
  const pageNode = after.find((part) => !part.absolute && part.type !== "INSTANCE" && part.type !== "TEXT");
  if (pageNode) {
    const inside = (pageNode.children ?? []).filter((child) => (child.absolute ? (pinned.push(child), false) : true));
    const elements = inside.map((child) => convert(child, ctx)).filter(Boolean);
    const padding = pageNode.layout?.padding ?? [];
    children = padding.some(Boolean) ? [frameElement({ ...pageNode, children: inside }, elements, ctx)] : elements;
  }
  const footer = after.filter((part) => part !== pageNode && !(part.absolute && pinned.push(part)) && after.indexOf(part) > after.indexOf(pageNode)).map((part) => convert(part, ctx)).filter(Boolean);
  if (footer.length) props.footer = { kind: "element", node: oneOf(footer, { name: "Footer", layout: { mode: "VERTICAL" } }, ctx) };
  if (pinned.length) {
    const { absolute, ...floating } = innermost(pinned[0]);
    const element = convert(floating, ctx);
    if (element) props.floatingAction = { kind: "element", node: element };
    if (pinned.length > 1) ctx.notes.push(`AppShell "${node.name}": ${pinned.length} layers sit outside the auto layout; the first is the floating action, the others are left out`);
  }
  if (asideNode) props.aside = { kind: "element", node: convert(asideNode, ctx) };
  return { kind: "element", name: "AppShell", props, children };
}

/** Each element's Figma layer: its parent reads its Fill container from it. */
const SOURCE = new WeakMap();
function convert(node, ctx) {
  let element = convertNode(node, ctx);
  if (element && !element.id) { const id = idOf(node, ctx); if (id) element.id = id; }
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
  // A Shape takes its own position props, in px: Figma's X / Y (its unrotated box, as Shape turns about its centre).
  if (element.name === "Shape") {
    const shape = node.shape ?? {};
    const turn = ((shape.rotation ?? 0) * Math.PI) / 180;
    const w = shape.w ?? box.w;
    const h = element.props.type?.value === "line" || element.props.type?.value === "arrow" ? 0 : shape.h ?? box.h;
    const centre = { x: box.x + Math.cos(turn) * (w / 2) + Math.sin(turn) * (h / 2), y: box.y - Math.sin(turn) * (w / 2) + Math.cos(turn) * (h / 2) };
    const left = Math.round((centre.x - w / 2) * 100) / 100;
    const top = Math.round((centre.y - h / 2) * 100) / 100;
    const cx = { MIN: "left", MAX: "right", CENTER: "center", STRETCH: "left-right", SCALE: "left-right" }[box.cx] ?? "left";
    const cy = { MIN: "top", MAX: "bottom", CENTER: "center", STRETCH: "top-bottom", SCALE: "top-bottom" }[box.cy] ?? "top";
    Object.assign(element.props, { position: literal("absolute"), ...(cx !== "left" ? { constraintX: literal(cx) } : {}), ...(cy !== "top" ? { constraintY: literal(cy) } : {}) });
    if (cx === "left" || cx === "left-right") element.props.insetLeft = literal(left);
    if (cx === "right" || cx === "left-right") element.props.insetRight = literal(Math.round((box.pw - left - w) * 100) / 100);
    if (cy === "top" || cy === "top-bottom") element.props.insetTop = literal(top);
    if (cy === "bottom" || cy === "top-bottom") element.props.insetBottom = literal(Math.round((box.ph - top - h) * 100) / 100);
    return element;
  }
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
  return { kind: "element", ...(idOf(node, ctx, "place") ? { id: idOf(node, ctx, "place") } : {}), name: "Stack", props, children: [element] };
}

/** Figma's Say-Hi text in AI/Chat-Block/Pale: its words are AiChatBlock's greeting (the locale's default left out). */
const AI_GREETING_LAYER = "How can I help you today?";
/**
 * Figma's AI/Chat-Block/Pale as AiChatBlock (figma-push aiChatBlockNode, the other way): its Say-Hi text the greeting,
 * the chips in Suggestions the suggestions (label, leading icon), its AI/Chat-Field the field it holds.
 */
function aiChatBlockElement(node, ctx) {
  const props = {};
  const slotOf = (name) => (node.slots ?? []).find((slot) => slot.name === name);
  const all = (nodes, type) => nodes.flatMap((child) => (child.type === type ? [child] : all(child.children ?? [], type)));
  const greeting = node.texts && !Array.isArray(node.texts) ? node.texts[AI_GREETING_LAYER] : all(slotOf("AI-Say Hi")?.children ?? [], "TEXT")[0]?.characters;
  if (typeof greeting === "string" && greeting !== AI_GREETING_LAYER) props.greeting = literal(greeting);
  const chips = node.props?.["Suggestion-Chips"] === false ? [] : all(slotOf("Suggestions")?.children ?? [], "INSTANCE");
  if (chips.length) {
    props.suggestions = { kind: "array", items: chips.map((chip) => {
      const fields = { label: literal(chip.text ?? chip.name ?? "") };
      const icon = chip.props?.Theme === "Leading-Icon" ? chip.props?.["Icon-Src"] ?? chip.swapIcon : null;
      if (typeof icon === "string" && isZenIcon(icon, ctx.mapping)) fields.icon = literal(icon);
      return { kind: "object", fields };
    }) };
  }
  // Its field's layer key is "AI" (studio-import.js layerKey: a name with "/" keys by its first part).
  const part = (node.nested ?? []).find((nested) => nested.path === "AI");
  const fieldSet = [...ctx.mapping.sets.values()].find((set) => set.code === "AiChatField");
  const field = fieldSet ? convert({ type: "INSTANCE", name: "AI/Chat-Field", set: { id: fieldSet.id, name: fieldSet.name }, props: part?.props ?? {}, ...(part?.texts ? { texts: part.texts } : {}), ...(part?.text ? { text: part.text } : {}) }, ctx) : null;
  return { kind: "element", name: "AiChatBlock", props, children: field ? [field] : [] };
}

/* ── charts (figma-charts.mjs) ── */

/** A chart whose Heading shows in Figma → its header (ChartCard's props), until the Card around it takes it. */
const CHART_HEADS = new WeakMap();
/** A ChartCard's open button: a builder page holds no handler, a toast stands in for the report it opens. */
const OPEN_REPORT = { kind: "proto", action: "toast", args: [{ title: "Open report" }] };

/**
 * A ❖ Chart instance as its code chart (figma-charts.mjs chartFromFigma): the set and its variants pick the chart and
 * its props, the data is the Studio palette sample's (Figma's drawing is a picture of its own sample).
 */
function chartElement(node, ctx) {
  const chart = chartFromFigma(node, ctx.notes, `"${node.name}" (${node.set?.name})`);
  if (!chart) return null;
  ctx.charts = (ctx.charts ?? 0) + 1;
  const element = { kind: "element", name: chart.name, props: chart.props, children: [] };
  if (!headingHidden(node)) {
    CHART_HEADS.set(element, chartHeaderOf(node));
    (ctx.chartHeads ??= new Set()).add(element);
  }
  return element;
}

/** A Card holding a chart with its header (figma-push chartCardNode, the other way): the ChartCard, its theme the Card's. */
function chartCardElement(chart, header, cardProps, where, ctx) {
  ctx.chartHeads?.delete(chart);
  const props = { title: literal(header.title) };
  if (header.icon) {
    if (isZenIcon(header.icon, ctx.mapping)) props.icon = literal(header.icon);
    else ctx.notes.push(`${where}: its chart's Icon swaps in "${header.icon}", not a Zen icon (left out)`);
  }
  if (header.description) props.description = literal(header.description);
  if (header.value) props.value = literal(header.value);
  if (header.ranges) props.ranges = { kind: "array", items: header.ranges.map((range) => ({ kind: "object", fields: { id: literal(range.id), label: literal(range.label) } })) };
  if (header.range) props.range = literal(header.range);
  if (header.open) props.onOpen = OPEN_REPORT;
  const { theme, color, surface, ...rest } = cardProps;
  // ChartCard's own default is Flat (the Card's is Shadow).
  if (theme && !(theme.kind === "literal" && theme.value === "flat")) props.theme = theme;
  else if (!theme) props.theme = literal("shadow");
  // Its Card's Color (Pale and Solid widgets): ChartCard passes it to its Card.
  if (color) props.color = color;
  if (surface) props.surface = surface;
  if (Object.keys(rest).length) ctx.notes.push(`${where}: ${Object.keys(rest).join(", ")} of its Card left out (ChartCard draws Card Medium)`);
  return { kind: "element", name: "ChartCard", props, children: [chart] };
}

/** Figma variable → Zen Shape fill / stroke (Shape/paint.ts, the push's map the other way). */
const FILL_OF = new Map(Object.entries(shapeFillTokens).map(([tone, variable]) => [variable, tone]));
const STROKE_OF = new Map(Object.entries(shapeStrokeTokens).map(([tone, variable]) => [variable, tone]));
const RADIUS_OF = { "Corner-Radius/2XSmall": "2xs", "Corner-Radius/XSmall": "xs", "Corner-Radius/Small": "sm", "Corner-Radius/Base": "md", "Corner-Radius/Large": "lg", "Corner-Radius/XLarge": "xl", "Corner-Radius/2XLarge": "2xl", "Corner-Radius/3XLarge": "3xl", "Corner-Radius/Rounded": "full" };
const round2 = (value) => Math.round(value * 100) / 100;

/**
 * A Figma shape (RECTANGLE, ELLIPSE, LINE, POLYGON, STAR) as a Zen Shape (figma-push shapeNode, the other way): its
 * type (a LINE with an arrow cap is an arrow), px size, fill and stroke by their variables (a colour that is no Zen
 * Background / Border variable is left at the default and noted), arc, count, ratio, corner radius variable, rotation
 * and opacity; Figma's defaults are left out, as the push leaves them out.
 */
function shapeElement(node, ctx) {
  const shape = node.shape;
  const where = `"${node.name}"`;
  const arrow = node.type === "LINE" && typeof shape.cap === "string" && /ARROW/.test(shape.cap);
  const type = { RECTANGLE: "rectangle", ELLIPSE: "ellipse", LINE: arrow ? "arrow" : "line", POLYGON: "polygon", STAR: "star" }[node.type];
  const line = type === "line" || type === "arrow";
  const props = { type: literal(type), width: literal(round2(shape.w)) };
  if (!line) props.height = literal(round2(shape.h));
  const paint = (prop, value, map, fallback) => {
    if (value === null || value === undefined) { if (fallback !== "none") props[prop] = literal("none"); return; }
    const tone = map.get(value);
    if (tone && tone !== fallback) props[prop] = literal(tone);
    else if (!tone) ctx.notes.push(`${where}: its ${prop} ${value === "unbound" ? "is no colour variable" : `variable ${value} is no Zen ${prop === "fill" ? "Background" : "Border"} colour`}; the default is kept`);
  };
  paint("fill", line ? null : shape.fill, FILL_OF, line ? "none" : DEFAULT_SHAPE_FILL);
  paint("stroke", shape.stroke, STROKE_OF, line ? DEFAULT_LINE_STROKE : "none");
  if (shape.stroke && shape.strokeWeight !== 1) props.strokeWeight = literal(round2(shape.strokeWeight));
  if (shape.stroke && !line && shape.strokeAlign && shape.strokeAlign !== "INSIDE") props.strokeAlign = literal(shape.strokeAlign.toLowerCase());
  if (type === "ellipse" && shape.arc) {
    const arc = arcFromData(shape.arc);
    if (arc.start) props.arcStart = literal(round2(arc.start));
    if (arc.sweep < 100) props.arcSweep = literal(round2(arc.sweep));
    if (arc.ratio > 0) props.arcRatio = literal(round2(arc.ratio));
  }
  if ((type === "polygon" && shape.pointCount !== 3) || (type === "star" && shape.pointCount !== 5)) props.pointCount = literal(shape.pointCount);
  if (type === "star" && typeof shape.innerRadius === "number" && Math.abs(shape.innerRadius * 100 - STAR_RATIO) > 0.05) props.starRatio = literal(round2(shape.innerRadius * 100));
  if (type === "rectangle") {
    const step = shape.radiusVar ? RADIUS_OF[shape.radiusVar] : null;
    if (step) props.radius = literal(step);
    else if (shape.radius) ctx.notes.push(`${where}: its corner radius ${shape.radius} px is no Corner-Radius variable; left square`);
  }
  if (shape.rotation) props.rotation = literal(shape.rotation);
  if (typeof shape.opacity === "number" && shape.opacity < 1) props.opacity = literal(Math.round(shape.opacity * 100));
  return { kind: "element", name: "Shape", props, children: [] };
}

function convertNode(node, ctx) {
  const { mapping, notes } = ctx;
  if (!node) return null;
  if (node.shape) return shapeElement(node, ctx);
  if (DRAWINGS.has(node.type)) { ctx.drawings.push(node.name); return null; }
  if (node.type === "TABLE") return tableElement(node, ctx);
  if (node.type === "TEXT") {
    const props = {};
    // Body/Base/Regular is Text's default (Text.tsx): the push writes it for Figma, the page leaves it out.
    if (node.textStyle && node.textStyle !== "Body/Base/Regular") {
      if (!mapping.textStyles || mapping.textStyles.has(node.textStyle)) props.textStyle = literal(node.textStyle);
      else notes.push(`Text "${node.name ?? node.characters}": text style "${node.textStyle}" is not a Zen text style`);
    }
    // Figma's soft line break (U+2028) reads as a space: a Text wraps by its width.
    const characters = (node.characters ?? "").replace(/\u2028/g, " ");
    const align = { CENTER: "center", RIGHT: "end", JUSTIFIED: "justify" }[node.align];
    if (align) props.align = literal(align);
    if (node.tabular) props.tabularNumbers = literal(true);
    // A layer named for a heading level ("Heading 2", "H2": figma-push names a Heading's layer so) is a Heading; its
    // level's own text style goes unsaid.
    const level = /^(?:heading|h)\s?([1-6])$/i.exec(String(node.name ?? "").trim())?.[1];
    if (level) {
      props.level = literal(Number(level));
      if (props.textStyle?.value === HEADING_STYLE[level]) delete props.textStyle;
      else if (!props.textStyle && node.textStyle === "Body/Base/Regular") props.textStyle = literal("Body/Base/Regular");
    }
    const tone = TONE_OF.get(String(node.fill ?? "").replace(/^Color\//, ""));
    if (tone && tone !== "strongest") props.tone = literal(tone);
    return { kind: "element", name: level ? "Heading" : "Text", props, children: [{ kind: "text", value: characters }] };
  }
  if (node.type === "INSTANCE") {
    const setName = node.set?.name ?? "";
    if (ROW_ELEMENTS[setName]) return { kind: "element", name: ROW_ELEMENTS[setName], props: itemFields(node, ctx, { where: ROW_ELEMENTS[setName] }), children: [] };
    if (setName === "Primitives/Dashboard/Header/Action-Item") return actionItem(node, ctx);
    if (setName === "AI/Chat-Block/Pale") return aiChatBlockElement(node, ctx);
    if (setName === TOP_NAV_SET.name) return topNavigationElement(node, ctx);
    if (setName === COLOR_SWATCH) return colorSelectorElement([node], null, ctx);
    // A file's type icon and a country's flag (figma-push FileIcon, Flag), with their size.
    if (setName === "icon-media-file") return { kind: "element", name: "FileIcon", props: { format: literal(String(node.props?.Format ?? "doc").toLowerCase()), ...iconSizeProps(node) }, children: [] };
    if (setName === "Flag" && node.props?.Name) return { kind: "element", name: "Flag", props: { name: literal(node.props.Name), ...(FLAG_SIZE_OF[node.sizeVar] ? { size: literal(FLAG_SIZE_OF[node.sizeVar]) } : {}) }, children: [] };
    if (setName === CHAT_SECTION) return chatThreadElement({ ...node, children: [node] }, ctx);
    // A chart (❖ Chart): its code chart with the Studio sample's data (figma-charts.mjs).
    if (chartSetKey(node.set)) return chartElement(node, ctx);
    // A Metric-Card: the MetricCard of its Type (figma-metric.mjs), its marks' data the Studio sample's.
    if (isMetricCard(node)) return { kind: "element", ...metricCardFromFigma(node, { notes, where: `"${node.name}" (Metric-Card)` }), children: [] };
    const set = node.set ? mapping.sets.get(node.set.id) ?? mapping.sets.get(setName) : null;
    if (!set) {
      // An icon of the set (icon-zen): an Icon.
      if (isZenIcon(setName, mapping)) return { kind: "element", name: "Icon", props: { name: literal(setName), ...iconSizeProps(node) }, children: [] };
      // A primitive with slots (Dashboard/Header): what its slots hold, in its layout.
      // Each slot a Stack in its layout; slots that sit in one frame of the instance, a Stack in that frame's layout.
      const groups = [];
      for (const slot of node.slots ?? []) {
        const content = (slot.children ?? []).map((child) => convert(child, ctx)).filter(Boolean);
        if (!content.length) continue;
        const element = frameElement({ name: slot.name, layout: slot.layout }, content, ctx);
        const id = idOf(slot, ctx);
        if (id) element.id = id;
        SOURCE.set(element, slot);
        const row = slot.parent && node.rows?.[slot.parent] ? slot.parent : null;
        if (row && groups.at(-1)?.row === row) groups.at(-1).items.push(element);
        else groups.push({ row, items: [element] });
      }
      const held = groups.map(({ row, items }) => {
        if (!row) return items;
        const frame = frameElement({ name: row, layout: node.rows[row] }, items, ctx);
        const id = idOf({ id: node.rowIds?.[row], key: node.rowKeys?.[row] }, ctx);
        if (id) frame.id = id;
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
    const { handled, children: slotsAreChildren } = set.code === "DashboardHeader" ? dashboardHeaderParts(node, props, ctx) : { handled: new Set(), children: false };
    // Parts a component reads from its own layers (a ListItem's title and leading, a field's label and help): the
    // slots and nested instances they used are not read again below.
    const own = { slots: new Set(), nested: new Set() };
    if (set.code === "ListItem") listItemParts(node, props, ctx, own);
    if (FIELD_CODES.has(set.code)) fieldParts(node, props, own);
    if (LABELLED_CONTROLS.has(set.code)) controlLabelParts(node, props, own);
    // An Emoji Dock-Icon draws its text, not its icon.
    if (set.code === "DockIcon" && node.props?.Theme === "Emoji" && typeof node.text === "string" && node.text.trim()) { props.emoji = literal(node.text.trim()); delete props.icon; }
    // Each slot: a data prop (Sidebar sections), a node prop (Sidebar footer) or the children (Card › Content). With
    // slots, the label text is theirs, not the instance's.
    const dataSlots = mapping.dataSlots?.[set.code] ?? [];
    const slotProps = SLOT_PROPS[set.code] ?? {};
    const slotted = [];
    // Item ids are the component's own (its rows and its footer share them, as selectedId does).
    const outerIds = ctx.ids;
    ctx.ids = new Set();
    // Figma's rail (Side-Bar Expand=No) is a collapsed Sidebar: its rows hide their labels (their layer names keep them),
    // its groups lose their titles (their frames' names keep them) and a Divider opens each later group (figma-push
    // sidebarRail, the other way).
    const rail = set.code === "Sidebar" && node.props?.Expand === "No";
    if (rail) props.collapsed = literal(true);
    // IconButton's level has no static default: the one Button.tsx resolves (Main Tertiary, Flat Primary, Overlay
    // Accent) is left out (figma-push writes it, the other way).
    if (set.code === "IconButton" && props.level?.kind === "literal" && props.level.value === ({ flat: "primary", overlay: "accent" }[props.appearance?.value] ?? "tertiary")) delete props.level;
    for (const slot of node.slots ?? []) {
      // A nested instance's slot (figma-push `within`): its owner reads it (a ChatMessage's reactions).
      if (handled.has(slot.name) || own.slots.has(slot.name) || slot.within) continue;
      if (slotsAreChildren) { slotted.push(slot); continue; }
      const dataSlot = dataSlots.find((candidate) => candidate.name === slot.name);
      if (dataSlot) {
        const { value, selected } = dataSlotValue(slot, dataSlot, ctx, where, rail);
        props[dataSlot.prop] = value;
        // A Segmented whose Item-List fills it splits its width (figma-push: fullWidth → the slot fills).
        if (set.code === "Segmented" && slot.fillW) props.fullWidth = literal(true);
        if (selected && SELECTED_PROP[set.code]) props[SELECTED_PROP[set.code]] = literal(selected);
        // Tabs and Segmented draw their look on each item (figma-push): the first item's Size (and a Segmented's Level).
        const look = rowsOf(slot.children ?? [])[0]?.props ?? {};
        if ((set.code === "Tabs" || set.code === "Segmented") && look.Size === "Small") props.size = literal("sm");
        if (set.code === "Segmented" && look.Level && look.Level !== "Secondary") props.level = literal(look.Level.toLowerCase());
        if (set.code === "Breadcrumbs") breadcrumbsLook(rowsOf(slot.children ?? []), props);
        continue;
      }
      if (slotProps[slot.name]) {
        const content = slotContent(set.code === "Sidebar" && slot.name === "Header-Content" ? sidebarBrandLayers(slot, ctx, where) : slot, ctx);
        if (content) props[slotProps[slot.name]] = { kind: "element", node: content };
        continue;
      }
      slotted.push(slot);
    }
    ctx.ids = outerIds;
    if (TEXT_PROP[set.code] && typeof node.text === "string" && node.text && !props[TEXT_PROP[set.code]]) props[TEXT_PROP[set.code]] = literal(node.text);
    // A File-Item's file: its Name, Size, State and Additional Caption (an alert's error, an upload's caption).
    if (set.code === "UploaderFileItem") {
      const shown = node.props ?? {};
      const name = String(shown["✏️ Name"] ?? node.text ?? "File");
      const state = String(shown.State ?? "Uploaded").toLowerCase();
      // An alert's error is its Help-Text's; an upload's progress the Progress-Bar's step (its middle value).
      const caption = state === "alert" ? (node.nested ?? []).find((nested) => nested.path === "Help-Text")?.text : shown["✏️ Additional Caption"];
      const step = (node.nested ?? []).find((nested) => nested.path === "Progress-Bar")?.props?.Progress;
      const fields = { id: literal(slug(name)), name: literal(name) };
      if (shown["✏️ Size"]) fields.size = literal(String(shown["✏️ Size"]));
      if (state !== "uploaded") fields.state = literal(state);
      if (caption && (state === "alert" || state === "uploading")) fields[state === "alert" ? "error" : "caption"] = literal(String(caption));
      if (state === "uploading" && step) fields.progress = literal({ None: 0, Low: 25, Medium: 50, Good: 80, Done: 100 }[step] ?? 0);
      props.file = { kind: "object", fields };
    }
    // A chat message's text is its bubble's Message (figma-push writes it there; the reader reads it as the text).
    if (set.code === "ChatMessage" && ownText(node, "Message")) props.children = literal(ownText(node, "Message"));
    let children = props.children && !node.slots?.some((slot) => !slot.within) ? [{ kind: "text", value: props.children.value }] : [];
    const slottedLayers = slotted.flatMap((slot) => slot.children ?? []);
    if (slottedLayers.length && takesChildren) children = slottedLayers.map((child) => convert(child, ctx)).filter(Boolean);
    else if (slottedLayers.length) notes.push(`${where}: what its ${slotted.map((slot) => slot.name).join(", ")} slot holds is left out (the component takes no content)`);
    delete props.children;
    const overrides = {};
    // Date-Picker/Mobile: range mode for its Multiple variants, its heading's text the title (unless the default).
    if (set.code === "DatePickerSheet") {
      // Figma shows it: the page opens it.
      props.open = literal(true);
      if (/^Multiple/.test(node.props?.Variant ?? "")) props.selectionMode = literal("range");
      const title = (node.nested ?? []).find((nested) => nested.path.split("/").pop() === "Main-Heading-Text");
      const text = title?.texts?.["Header-Text"] ?? title?.text;
      if (text && !["Choose date", "Choose dates", "Heading"].includes(text)) props.title = literal(text);
    }
    if (set.code === "ChatMessage") chatMessageParts(node, props, ctx);
    const metric = METRIC_SET.test(setName);
    if (metric) metricParts(node, props, ctx);
    // A File-Item's Help-Text and Progress-Bar are its file's error and progress, a date picker's heading its title, a
    // chat message's Avatar and reaction pill its author and reactions (read above).
    const ownParts = (nested) => own.nested.has(nested) || set.code === "UploaderFileItem" || set.code === "DatePickerSheet" || (set.code === "ChatMessage" && (isAvatar(nested) || /^Bubble(\/|$)/.test(nested.path))) || (metric && /^(Trend|Metric-Icon)(\/|$)/.test(nested.path));
    for (const nested of (node.nested ?? []).filter((nested) => !ownParts(nested))) {
      const inner = nested.set ? mapping.sets.get(nested.set.id) ?? mapping.sets.get(nested.set.name) : null;
      if (!inner) { notes.push(`${where} › ${nested.path}: ${nested.set?.name ?? "?"} has no Zen component`); continue; }
      const fields = instanceProps(nested, inner, mapping, notes, `${set.code} › ${nested.path}`);
      if (Object.keys(fields).length) overrides[nested.path] = { kind: "object", fields };
    }
    if (Object.keys(overrides).length) props.overrides = { kind: "object", fields: overrides };
    // A layer Figma shows with a boolean of its name (Card's Sub-Action) that the code draws only when a prop is set.
    for (const layer of new Set((node.nested ?? []).filter((nested) => !ownParts(nested)).map((nested) => nested.path.split("/")[0]))) {
      if (node.props?.[layer] === true && !set.toggles?.some((toggle) => toggle.label === layer)) notes.push(`${where}: ${layer} shows in Figma; set it on the ${set.code} in the Studio (its overrides apply once it is there)`);
    }
    // Metric-Inline alone is a Metric; a Card holding only one is the MetricCard (figma-push draws it so).
    const lone = children.length === 1 && children[0].kind === "element" && children[0].name === "Metric" ? children[0] : null;
    if (set.code === "Card" && lone && Object.keys(props).every((name) => name === "theme" || name === "color")) return { kind: "element", name: "MetricCard", props: { ...lone.props, ...props }, children: [] };
    // A Card holding one chart whose Heading shows is the ChartCard (figma-push draws it so).
    const charted = set.code === "Card" && children.length === 1 ? CHART_HEADS.get(children[0]) : undefined;
    if (charted) return chartCardElement(children[0], charted, props, where, ctx);
    // Dashboard/Header Type=Main is how figma-push draws a PageHeader (title, its description in SubHeading, actions):
    // the PageHeader comes back.
    if (set.code === "DashboardHeader" && props.type?.value === "main") {
      const { type: _type, subheading, ...rest } = props;
      return { kind: "element", name: "PageHeader", props: { ...rest, ...(subheading ? { description: subheading } : {}) }, children: [] };
    }
    const element = { kind: "element", name: metric ? "Metric" : set.code, props, children };
    // A row Figma pads (Header/Dashboard's Sections pad each Primitives/Dashboard/Header): a Stack takes its padding, as
    // an AppShell's sections would.
    return PADDED.has(set.code) && node.layout?.padding?.some(Boolean) ? padded(element, node, ctx) : element;
  }
  // Chat/Section/Conversation runs (figma-push chatThreadNode): a ChatThread; a message over its Read-List: its seenBy.
  if ((node.children ?? []).some((child) => child.type === "INSTANCE" && child.set?.name === CHAT_SECTION)) return chatThreadElement(node, ctx);
  const [message, readList] = node.children ?? [];
  if (node.children?.length === 2 && codeOf(message, ctx) === "ChatMessage" && readList.set?.name === READ_LIST) return withSeenBy(convert(message, ctx), readList, ctx);
  // A row of Color-Selector swatches (figma-push colorSelectorNode): a ColorSelector.
  const swatches = node.children ?? [];
  if (swatches.length && swatches.every((child) => child.type === "INSTANCE" && child.set?.name === COLOR_SWATCH)) return colorSelectorElement(swatches, node.name, ctx);
  // An app frame (Sidebar beside a column under the Dashboard header Type=Navigation): AppShell.
  const shell = appShellElement(node, ctx);
  if (shell) return shell;
  // A grid's layers in the order Figma places them (row by row), which the layers panel need not follow.
  const layers = node.layout?.mode === "GRID" ? [...(node.children ?? [])].sort((a, b) => (a.cell?.row ?? 0) - (b.cell?.row ?? 0) || (a.cell?.col ?? 0) - (b.cell?.col ?? 0)) : node.children ?? [];
  const children = layers.map((child) => convert(child, ctx)).filter(Boolean);
  // A frame whose layers were all left out (a drawing's wrapper) is left out with them.
  if (node.children?.length && !children.length) return null;
  return frameElement(node, children, ctx);
}

/** A frame (or a slot) as a Stack in its auto layout; Figma's grid layout as a Grid. */
function frameElement(node, children, ctx) {
  // figma-push centres an AiChatBlock in a frame of its name: the block itself.
  if (node.name === "AiChatBlock" && children.length === 1 && children[0].name === "AiChatBlock") return children[0];
  const props = {};
  const layout = node.layout;
  // A wrapping row whose layers all fill it, or a grid whose cells all keep, the same minimum width: a Grid of columns
  // that fit (figma-push draws one so, a grid where it knows the page's width; minColumnWidth).
  const cells = children.map((child) => SOURCE.get(child));
  const sameMin = cells.length && cells.every((cell) => cell?.minW && cell.minW === cells[0].minW);
  const fitMin = sameMin && ((layout?.mode === "HORIZONTAL" && layout.wrap && cells.every((cell) => cell.fillW)) || layout?.mode === "GRID") ? cells[0].minW : null;
  if (fitMin) {
    const gap = spacingStep(layout.gapVar, layout.gap ?? 0, GAP_PX);
    return { kind: "element", name: "Grid", props: { ...(fitMin !== 240 ? { minColumnWidth: literal(fitMin) } : {}), ...(gap !== "md" ? { gap: literal(gap) } : {}) }, children };
  }
  const grid = layout?.mode === "GRID";
  // A column of List-Items (figma-push draws List as one): a List, which spaces its rows itself (Gap/3XSmall).
  if (!grid && layout?.mode !== "HORIZONTAL" && children.length && children.every((child) => child.name === "ListItem") && !node.fill && !node.scroll) {
    return { kind: "element", name: "List", props: {}, children };
  }
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
      // Fill children stretch the Stack, unless one stops at a max width and the frame places it (centre, end).
      const placesCapped = layout.counter && layout.counter !== "MIN" && sources.some((source) => source?.maxW);
      const stretched = children.length > 0 && sources.every(across) && !placesCapped;
      const align = stretched ? "stretch" : { MIN: "start", CENTER: "center", MAX: "end", BASELINE: "baseline" }[layout.counter ?? "MIN"];
      if (align !== (row ? "center" : "stretch") && !(align === "start" && !row)) props.align = literal(align);
      const aligned = row ? align !== "stretch" : Boolean(props.align);
      const justify = { CENTER: "center", MAX: "end", SPACE_BETWEEN: "between" }[layout.primary];
      if (justify) props.justify = literal(justify);
      if (layout.wrap) props.wrap = literal(true);
      // A layout layer that fills (Fill container): along the Stack it takes the free space; across, it is said when the Stack aligns.
      children.forEach((child, index) => {
        if (SIZED_INSTANCES.has(child.name)) {
          if (sources[index]?.minW) child.props.minWidth = literal(sources[index].minW);
          if (sources[index]?.maxW) child.props.maxWidth = literal(sources[index].maxW);
        }
        // A layout frame's max width and height (figma-push maxW / maxH: a form at its width, a scrolling list's height).
        if (LAYOUT_FRAMES.has(child.name)) {
          if (sources[index]?.maxW) child.props.maxWidth = literal(sources[index].maxW);
          if (sources[index]?.maxH) child.props.maxHeight = literal(sources[index].maxH);
        }
        if (!SIZED.has(child.name)) return;
        if (along(sources[index])) child.props[row ? "width" : "height"] = literal("fill");
        if (across(sources[index]) && aligned) child.props[row ? "height" : "width"] = literal("fill");
      });
    }
  } else if (children.length > 1) ctx.notes.push(`Frame "${node.name}" has no auto layout: its layers are stacked in order`);
  // Figma's Clip content: the Stack or Grid clips too (figmaReadCode leaves it off the page frame). Overflow scrolling
  // clips as well: Stack / Box scroll (both ways reads as vertical).
  const scroll = { VERTICAL: "y", HORIZONTAL: "x", BOTH: "y" }[node.scroll];
  if (node.scroll === "BOTH") ctx.notes.push(`Frame "${node.name}" scrolls both ways in Figma; the page scrolls it vertically`);
  if (node.clip && !scroll) props.clip = literal(true);
  // A background on a Box surface's variable (figma-push BOX_SURFACE): a Box, around the Stack or Grid when the frame
  // lays its layers out more than a Box does (a Box takes padding, not gap or alignment).
  const surface = SURFACE_OF[String(node.fill ?? "").replace(/^Color\//, "")];
  if (!surface) {
    if (scroll && !grid) props.scroll = literal(scroll);
    const frame = { kind: "element", name: grid ? "Grid" : "Stack", props, children };
    return scroll && grid ? { kind: "element", name: "Box", props: { scroll: literal(scroll) }, children: [frame] } : frame;
  }
  const BOX = new Set(["padding", "paddingX", "paddingY", "clip"]);
  const boxProps = { surface: literal(surface), ...Object.fromEntries(Object.entries(props).filter(([name]) => BOX.has(name))), ...(scroll ? { scroll: literal(scroll) } : {}) };
  const rest = Object.fromEntries(Object.entries(props).filter(([name]) => !BOX.has(name)));
  const plain = !grid && !Object.keys(rest).some((name) => name !== "gap") && (children.length <= 1 || rest.gap?.value === "none");
  return { kind: "element", name: "Box", props: boxProps, children: plain ? children : [{ kind: "element", name: grid ? "Grid" : "Stack", props: rest, children }] };
}
/** A Color/Background variable → the Box surface it paints (figma-push BOX_SURFACE, the other way). */
const SURFACE_OF = Object.fromEntries(Object.entries(BOX_SURFACE).map(([surface, variable]) => [variable, surface]));

/** An icon's size from Figma (figma-push iconSizing, the other way): its Element-Size/Popular step, else its px. */
const ICON_SIZE_OF = { "2XSmall": "2xs", XSmall: "xs", Small: "sm", Medium: "md", Large: "lg", XLarge: "xl", "2XLarge": "2xl", "3XLarge": "3xl" };
const iconSizeProps = (node) => {
  const step = /^Element-Size\/Popular\/(.+)$/.exec(node.sizeVar ?? "")?.[1];
  if (ICON_SIZE_OF[step]) return { size: literal(ICON_SIZE_OF[step]) };
  return typeof node.size === "number" ? { size: literal(node.size) } : {};
};
/** A Flag's size variable → its size (flag.css). */
const FLAG_SIZE_OF = { "Image-Size/3XSmall": "small", "Image-Size/Small": "large" };

/** Figma's Metric-Inline sets (Metric; in a Card, MetricCard). */
const METRIC_SET = /^Primitives\/Metric\/Metric-Inline\//;
/** Figma .Primitives/Metrics/Metric-Trend's Trend option → MetricCard trend.direction (figma-push TREND_OPTION). */
const TREND_DIRECTION = { Positive: "positive", Negative: "negative", Normal: "normal" };
/** Metric-Trend's Badge theme by its Trend (Positive green, Negative red, Normal neutral) → the direction. */
const BADGE_DIRECTION = { Green: "positive", Red: "negative", Neutral: "normal" };

/**
 * Metric-Inline's parts as figma-push metricParts writes them: Label and Metric-Number, the Trend badge (direction and
 * label), the Metric-Icon Dock Icon (icon, theme, background).
 */
function metricParts(node, props, ctx) {
  const label = ownText(node, "Label");
  const value = ownText(node, "Metric-Number");
  if (label && node.props?.["Metric-Title"] !== false) props.label = literal(label);
  if (value) props.value = literal(value);
  // The trend: its Metric-Trend (the push's own JSON) or the Badge inside it (Figma's read: the override sits there).
  const trend = node.props?.Trend === true ? (node.nested ?? []).find((nested) => nested.path === "Trend") : null;
  const badge = node.props?.Trend === true ? (node.nested ?? []).find((nested) => nested.path === "Trend/Badge") : null;
  if (trend || badge) {
    const fields = { direction: literal(TREND_DIRECTION[trend?.props?.Trend] ?? BADGE_DIRECTION[badge?.props?.Theme] ?? "positive") };
    const text = trend?.textList?.[0] ?? trend?.text ?? badge?.props?.Text ?? badge?.text;
    if (text) fields.label = literal(text);
    props.trend = { kind: "object", fields };
  }
  const dock = node.props?.["Dock-Icon"] === true ? (node.nested ?? []).find((nested) => nested.path === "Metric-Icon") : null;
  const dockSet = dock ? [...ctx.mapping.sets.values()].find((set) => set.code === "DockIcon") : null;
  // Its Dock Icon: hidden is icon={false}; Metric's defaults (icon-home-02-solid, neutral, subtle) are left out.
  if (node.props?.["Dock-Icon"] === false) props.icon = literal(false);
  if (dock && dockSet) {
    const fields = instanceProps({ ...dock, set: dock.set ?? { id: dockSet.id, name: dockSet.name } }, dockSet, ctx.mapping, ctx.notes, "Metric › Metric-Icon");
    if (fields.icon && fields.icon.value !== "icon-home-02-solid") props.icon = fields.icon;
    if (fields.theme && fields.theme.value !== "neutral") props.iconTheme = fields.theme;
    if (fields.background && fields.background.value !== "subtle") props.iconBackground = fields.background;
  }
  delete props.children;
}

/** Figma's chat sets the push draws around ChatMessage (figma-push chatMessageNode, chatThreadNode). */
const CHAT_SECTION = "Chat/Section/Conversation";
const READ_LIST = "Chat/Section/Read-List";
/** The quick reactions' glyphs (Chat.tsx chatReactionEmojis; Figma's Emoji/Static draws the same, its Message text). */
const chatReactionEmojis = { like: "👍", heart: "❤️", lol: "😆", surprised: "😮", sad: "😢", angry: "😡" };
/** Figma Chat/Reaction/Emoji's Emoji option → the quick reaction (Chat.tsx chatReactionEmojis). */
const REACTION_OF = { Like: "like", Heart: "heart", LOL: "lol", Surprised: "surprised", Sad: "sad", Angry: "angry" };
/** An instance's own text layer by name: the reader's list, or the push's object. */
const ownText = (node, name) => (Array.isArray(node.texts) ? node.texts.find((text) => text.name === name)?.characters : node.texts?.[name]);
/** An Avatar the chat push drew: by its set, its path, or the person's name it carries as its layer name. */
const isAvatar = (nested) => nested.set?.name === "Avatar/Single" || /^Avatar(\[\d+\])?$/.test(nested.path);
/** The person's name an Avatar layer carries (figma-push names it), else none. */
const avatarName = (avatar) => avatar?.name ?? (avatar && !isAvatarPath(avatar.path) ? avatar.path : undefined);
const isAvatarPath = (path) => /^Avatar(\[\d+\])?$/.test(path ?? "");
/** A person from an Avatar in Figma: its layer's name (else its initials) the name, its Theme the theme. */
const personOf = (avatar, name) => {
  const fields = { name: literal(name ?? avatarName(avatar) ?? avatar?.text ?? "?") };
  const theme = String(avatar?.props?.Theme ?? "").toLowerCase();
  if (theme && theme !== "photo" && theme !== "neutral") fields.theme = literal(theme);
  return { kind: "object", fields };
};

/**
 * A chat message's parts as figma-push chatMessageNode draws them: the author from its Avatar (initials) and its Name
 * text, the reactions from its bubble's Chat/Reaction/Status (Emoji-Items, the total in Count).
 */
function chatMessageParts(node, props, ctx) {
  const where = `ChatMessage "${node.name}"`;
  const avatar = (node.nested ?? []).find(isAvatar);
  const name = ownText(node, "Name") ?? avatarName(avatar);
  if (node.props?.Side !== "You" && node.props?.Avatar !== false && (avatar || name)) {
    props.author = personOf(avatar, name);
    if (!name) ctx.notes.push(`${where}: its author is named by the Avatar's initials (${avatar?.text ?? "?"}); give the name in the Studio`);
  }
  if (node.props?.Reaction !== "Yes") return;
  const slot = [...(node.innerSlots ?? []), ...(node.slots ?? [])].find((item) => item.name === "Emoji-Items");
  // A quick reaction's option, unless its Message shows another emoji (one picked from the "+" panel).
  const plainGlyph = (text) => String(text ?? "").replace(/\uFE0F/g, "");
  const kindOf = (item) => {
    const quick = REACTION_OF[item.props?.Emoji];
    const glyph = ownText(item, "Message") ?? item.text;
    return quick && (!glyph || plainGlyph(glyph) === plainGlyph(chatReactionEmojis[quick])) ? quick : glyph ?? quick;
  };
  const kinds = (slot?.children ?? []).filter((item) => item.type === "INSTANCE").map(kindOf).filter(Boolean);
  if (!kinds.length) return;
  const pill = (node.nested ?? []).find((nested) => nested.path === "Bubble/Chat");
  const count = pill?.props?.Counter === "Yes" ? Number.parseInt(pill.texts?.Count ?? pill.text ?? "", 10) : 0;
  props.reactions = { kind: "array", items: kinds.map((kind, index) => ({ kind: "object", fields: { kind: literal(kind), ...(index === 0 && count > kinds.length ? { count: literal(count - kinds.length + 1) } : {}) } })) };
}

/** A message with the Read-List under it: its seenBy (each reader by the Avatar's initials; "5+" adds the Badge's count). */
function withSeenBy(element, readList, ctx) {
  if (element?.name !== "ChatMessage") return element;
  const avatars = (readList.nested ?? []).filter(isAvatar);
  const more = readList.props?.["Seen by"] === "5+" ? Number.parseInt(String((readList.nested ?? []).find((nested) => nested.path === "Badge")?.text ?? "").replace(/\D/g, ""), 10) || 0 : 0;
  const shown = readList.props?.["Seen by"] === "5+" ? 5 : Number(readList.props?.["Seen by"]) || avatars.length;
  const people = Array.from({ length: shown + more }, (_, index) => personOf(avatars[index], avatarName(avatars[index]) ?? avatars[index]?.text ?? `Reader ${index + 1}`));
  if (avatars.length < shown + more || avatars.some((avatar) => !avatarName(avatar))) ctx.notes.push(`ChatMessage "${readList.name}": readers Figma does not name are named by their initials (or "Reader N"); give their names in the Studio`);
  return { ...element, props: { ...element.props, seenBy: { kind: "array", items: people } } };
}

/** Chat/Section/Conversation runs as one ChatThread: each run's messages (its Conversations slot), the other layers between. */
function chatThreadElement(node, ctx) {
  const children = (node.children ?? []).flatMap((child) => (child.type === "INSTANCE" && child.set?.name === CHAT_SECTION
    ? (child.slots ?? []).flatMap((slot) => slot.children ?? []).map((item) => convert(item, ctx))
    : [convert(child, ctx)])).filter(Boolean);
  return { kind: "element", name: "ChatThread", props: {}, children };
}

/** Figma's colour swatch set; a token's Figma variable → its CSS value ("Color/Background/Support/Blue/Solid" → var(…)). */
const COLOR_SWATCH = "Color-Selector";
const CSS_OF_VARIABLE = new Map(Object.entries(tokens).filter(([, value]) => typeof value === "string" && value.startsWith("var(")));

/**
 * Color-Selector swatches as a ColorSelector (figma-push colorSelectorNode, the other way): each swatch a colour (its
 * fill's variable as the token's CSS value, its layer name the label), the one with Select=Yes the value; the row's name
 * (unless Figma's default) the group's aria-label.
 */
function colorSelectorElement(swatches, name, ctx) {
  const colors = [];
  let value = null;
  for (const swatch of swatches) {
    const css = swatch.fill ? CSS_OF_VARIABLE.get(swatch.fill.startsWith("Color/") ? swatch.fill : `Color/${swatch.fill}`) : undefined;
    if (!css) { ctx.notes.push(`ColorSelector: the swatch "${swatch.name}" is painted with no Zen colour variable: left out`); continue; }
    colors.push({ kind: "object", fields: { value: literal(css), label: literal(swatch.name && !swatch.name.includes("/") && swatch.name !== COLOR_SWATCH ? swatch.name : swatch.fill.split("/").slice(-2).join(" ")) } });
    if (swatch.props?.Select === "Yes") value = css;
  }
  const props = { colors: { kind: "array", items: colors } };
  if (value) props.value = literal(value);
  if (name && !/^(Frame|Stack|ColorSelector)( \d+)?$/.test(name)) props["aria-label"] = literal(name);
  return { kind: "element", name: "ColorSelector", props, children: [] };
}

/** The push's own Top-Navigation node (nested, slots) as readTopNav reads the placed instance: the round trip's input. */
function topNavOfPush(node) {
  const nested = (path) => (node.nested ?? []).find((entry) => entry.path === path);
  const actionsIn = (row) => ((node.slots ?? []).find((slot) => slot.name === "Trailing-Slot" && slot.within === row)?.children ?? []).map((item) => {
    const button = (item.nested ?? []).find((entry) => entry.path === "Button");
    return { name: item.name, ...(button?.swapIcon ? { icon: button.swapIcon } : {}), ...(item.props?.["Noti-Dot"] === true ? { dot: true } : {}) };
  });
  const leadAction = nested("Top-Leading/Action");
  return {
    bar: { props: nested("Top-Heading-Text")?.props ?? {}, texts: nested("Top-Heading-Text")?.texts ?? {} },
    large: { props: nested("Main-Heading-Text")?.props ?? {}, texts: nested("Main-Heading-Text")?.texts ?? {} },
    leading: { props: { Type: "Action", ...(nested("Top-Leading")?.props ?? {}) }, ...(leadAction ? { action: { name: leadAction.name ?? "Action", ...(leadAction.swapIcon ? { icon: leadAction.swapIcon } : {}), ...(leadAction.props?.["Noti-Dot"] === true ? { dot: true } : {}) } } : {}) },
    barActions: actionsIn("Navigator-bar"), titleActions: actionsIn("Expand-Heading"),
    control: (node.slots ?? []).find((slot) => slot.name === "Control-Slot")?.children ?? [],
  };
}

/**
 * Figma's Top-Navigation/Mobile as TopNavigation (figma-push topNavigationNode, the other way; read by readTopNav): its
 * type and margin, the bar title (an identity's title and subtitle), the large title and its level, the leading action,
 * the bar's and the large-title row's actions, what its Control-Slot holds. With the bar row hidden (Top-bar=false) the
 * large-title row's actions are the trailing ones (the code folds them there); a bar row over a large title without a
 * leading action is `topBar`.
 */
function topNavigationElement(node, ctx) {
  const shown = node.props ?? {};
  const read = node.topNav ?? topNavOfPush(node);
  const where = `TopNavigation "${node.name}"`;
  const props = {};
  const type = TOP_NAV_TYPE_OF[shown.Type];
  if (type && type !== "default") props.type = literal(type);
  if (shown.Margin === "Compact") props.margin = literal("compact");
  const action = (item) => {
    const icon = item.icon && isZenIcon(item.icon, ctx.mapping) ? item.icon : null;
    if (!icon) ctx.notes.push(`${where}: the action "${item.name}" draws ${item.icon ?? "no icon"}, not a Zen icon: it draws icon-plus-line`);
    const label = item.name && item.name !== "Action" && !item.name.includes("/") ? item.name : iconWords(icon ?? "icon-plus-line");
    return { kind: "object", fields: { icon: literal(icon ?? "icon-plus-line"), label: literal(label), ...(item.dot ? { dot: literal(true) } : {}) } };
  };
  const list = (items) => ({ kind: "array", items: items.map(action) });
  const bar = shown["Top-bar"] !== false;
  const barTitle = bar && shown["Top-Heading-Text"] !== false ? read.bar ?? {} : null;
  if (barTitle?.texts?.["Header-Text"]) props.title = literal(barTitle.texts["Header-Text"]);
  if (barTitle?.props?.Subheading === true && barTitle.texts?.Subheading) props.subtitle = literal(barTitle.texts.Subheading);
  const large = shown["Expand-Heading"] === true ? read.large?.texts?.["Header-Text"] : undefined;
  if (large) {
    props.largeTitle = literal(large);
    const level = { H2: "h2", H3: "h3" }[read.large?.props?.Type];
    if (level) props.headingLevel = literal(level);
  }
  const leading = bar && shown["Top-Leading"] !== false ? read.leading : null;
  if (leading?.props?.Type === "Visual") ctx.notes.push(`${where}: its leading visual (Nav-Slot/Visual) is left out: give the TopNavigation a leading in the Studio`);
  else if (leading?.action) props.leading = action(leading.action);
  const barActions = bar && shown["Top-Trailing"] !== false ? read.barActions ?? [] : [];
  const titleActions = large && shown["Expand-Trailing"] !== false ? read.titleActions ?? [] : [];
  if (bar) {
    if (barActions.length) props.trailing = list(barActions);
    if (titleActions.length) props.largeTitleAction = titleActions.length === 1 ? action(titleActions[0]) : list(titleActions);
    if (large && !props.leading && !props.subtitle) props.topBar = literal(true);
  } else if (titleActions.length) props.trailing = list(titleActions);
  if (shown["Control-Bar"] === true) {
    // The push pads the control in a "Control" frame (the code's control bar padding): its layer is the control.
    const layers = (read.control ?? []).flatMap((child) => (child.type === "FRAME" && child.name === "Control" && child.children?.length === 1 ? child.children : [child])).map((child) => convert(child, ctx)).filter(Boolean);
    // A Search in the control bar is Rounded unless it says otherwise (SearchShapeContext, user 2026-10-17): Figma's
    // Rounded needs no prop there, its Default is written out.
    const settleSearch = (el) => {
      if (el?.kind !== "element") return;
      if (el.name === "Search" && el.props?.variant?.value !== "popover") {
        if (el.props.shape?.kind === "literal" && el.props.shape.value === "rounded") delete el.props.shape;
        else if (el.props.shape === undefined) el.props.shape = literal("default");
      }
      for (const child of el.children ?? []) settleSearch(child);
    };
    layers.forEach(settleSearch);
    if (layers.length) props.controlBar = { kind: "element", node: layers.length === 1 ? layers[0] : { kind: "element", name: "Stack", props: {}, children: layers } };
  }
  return { kind: "element", name: "TopNavigation", props, children: [] };
}

/**
 * A phone Screen's app frame as the push draws it: Top-Navigation/Mobile, the "Content" frame, a Bottom Navigation
 * (either bar may be missing, not both). It gives the Screen's `topNavigation` and `bottomNavigation` back and Content's
 * layers as the page. Anything else: null.
 */
function mobileChrome(frame, ctx) {
  const parts = frame?.children ?? [];
  const at = parts.findIndex((part) => part.type === "FRAME" && part.name === "Content");
  if (at < 0 || at > 1 || parts.length > at + 2) return null;
  const top = at === 1 ? parts[0] : null;
  const bottom = parts[at + 1] ?? null;
  if ((!top && !bottom) || (top && top.set?.name !== TOP_NAV_SET.name) || (bottom && codeOf(bottom, ctx) !== "BottomNavigation")) return null;
  const props = {};
  if (top) props.topNavigation = { kind: "element", node: convert(top, ctx) };
  if (bottom) props.bottomNavigation = { kind: "element", node: convert(bottom, ctx) };
  const layers = (parts[at].children ?? []).map((child) => convert(child, ctx)).filter(Boolean);
  const root = layers.length === 1 ? layers[0] : { kind: "element", name: "Stack", props: { gap: literal("none") }, children: layers };
  return { props, root };
}

/**
 * A Studio Screen's app frame as the push draws it (figma-push.mjs, screen-chrome.mjs): the frame's one layer "Screen",
 * a row of the Sidebar and "Main" (its "Header" holding the Page header, then "Content"). It gives the Screen's
 * `sidebar` and `header` props back (the Dashboard header Type=Main as the PageHeader it renders) and Content's layers
 * as the page. Anything else: null.
 */
function screenChrome(frame, ctx) {
  const mobile = mobileChrome(frame, ctx);
  if (mobile) return mobile;
  const [row] = frame?.children ?? [];
  if (frame?.children?.length !== 1 || row.type !== "FRAME" || row.name !== "Screen" || row.layout?.mode !== "HORIZONTAL") return null;
  const sidebarNode = instanceIn(row.children?.[0], "Sidebar", ctx);
  const main = row.children?.[sidebarNode ? 1 : 0];
  if (!main || main.name !== "Main" || (row.children?.length ?? 0) > (sidebarNode ? 2 : 1)) return null;
  const headerFrame = main.children?.find((part) => part.name === "Header");
  const contentFrame = main.children?.find((part) => part.name === "Content");
  if (!contentFrame) return null;
  const props = {};
  if (sidebarNode) props.sidebar = { kind: "element", node: convert(sidebarNode, ctx) };
  const headerNode = headerFrame?.children?.[0];
  let header = headerNode ? unpadded(convert(headerNode, ctx)) : null;
  // The Page header: DashboardHeader type="main" draws a PageHeader (title, childTitle, description, actions, trailing).
  if (header?.name === "DashboardHeader" && header.props.type?.value === "main") {
    const { type, subheading, ...rest } = header.props;
    header = { ...header, name: "PageHeader", props: { ...rest, ...(subheading ? { description: subheading } : {}) } };
  }
  if (header) props.header = { kind: "element", node: header };
  const layers = (contentFrame.children ?? []).map((child) => convert(child, ctx)).filter(Boolean);
  const root = layers.length === 1 ? layers[0] : { kind: "element", name: "Stack", props: { gap: literal("none") }, children: layers };
  return { props, root };
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
  const ctx = { mapping, notes: [], ids: new Set(), drawings: [], keyOwners: new Map() };
  // A copy: the slots take their owner's key (slotKeys), and a push's frame read back here stays as it was.
  frame = frame ? JSON.parse(JSON.stringify(frame)) : frame;
  slotKeys(frame);
  const chrome = screenChrome(frame, ctx);
  let root = chrome ? chrome.root : convert(frame, ctx);
  // The push's page frame around an app frame (a column holding only the AppShell): the AppShell itself.
  if (root?.name === "Stack" && root.children.length === 1 && root.children[0].name === "AppShell" && Object.keys(root.props).every((name) => name === "gap")) root = root.children[0];
  if (ctx.drawings.length) ctx.notes.push(`${ctx.drawings.length} drawings (vectors, shapes: ${[...new Set(ctx.drawings)].join(", ")}) are left out: a page has no layer for them`);
  if (ctx.charts) ctx.notes.push(`${ctx.charts} chart${ctx.charts > 1 ? "s" : ""}: the data is the Studio's sample for its kind (Figma's chart is a picture of its own sample data)`);
  for (const chart of ctx.chartHeads ?? []) ctx.notes.push(`${chart.name}: its heading (Title "${CHART_HEADS.get(chart).title}") shows in Figma; a chart's header is ChartCard's, so put the chart in a Card to keep it (left out)`);
  const own = (part) => (frame ? idOf(frame, ctx, part) : undefined);
  // A Stack, or an AppShell (an app frame), is the Screen's content as it is; anything else goes in a Stack.
  const content = root ? (root.name === "Stack" || root.name === "AppShell" ? root : { kind: "element", id: own("content"), name: "Stack", props: {}, children: [root] }) : null;
  const screen = { kind: "element", id: own("screen"), name: "Screen", props: { id: literal("screen-1"), title: literal(title), device: literal(deviceOf(frame?.width)), ...(chrome?.props ?? {}) }, children: content ? [content] : [] };
  const board = { kind: "element", id: own("board") ?? "board", name: "Board", props: {}, children: [screen] };
  // Elements no layer stands for take their place under their parent (deterministic: the same frame, the same ids).
  const walk = (node) => {
    node.children.forEach((child, index) => { if (child.kind === "element") { child.id ??= `${node.id}.${index}`; walk(child); } });
    for (const [name, value] of Object.entries(node.props)) if (value.kind === "element") { value.node.id ??= `${node.id}.${name}`; walk(value.node); }
  };
  walk(board);
  // A frame the Zen plugin placed from a Studio page: that page and the export it holds (figma-diff picks its base by them).
  const pushed = typeof frame?.page === "string" ? { page: frame.page, ...(typeof frame.version === "string" ? { version: frame.version } : {}) } : {};
  const source = frame?.id ? { figma: { file: frame.file ?? file, node: frame.id, ...pushed } } : {};
  const doc = { header: { format: 1, title, ...source }, mock: {}, board };
  return { text: printPage(doc), notes: ctx.notes, doc };
}

/**
 * A layer's element id. A layer the Zen plugin placed from a Studio page keeps that element's id as its `key` (shared
 * plugin data), so a frame pushed from a page pulls back with the page's own ids (figma-diff then compares it with the
 * export it came from); a key a duplicated layer carries too goes to the first one. Any other layer: its Figma id
 * (figmaDocId). `part`: an element the layer adds (the Stack that places it).
 */
function idOf(node, ctx, part) {
  const key = typeof node?.key === "string" && node.key ? node.key : null;
  if (key) {
    const owner = ctx.keyOwners.get(key);
    if (!node.id || owner === undefined || owner === node.id) {
      if (node.id) ctx.keyOwners.set(key, node.id);
      return part ? `${key}.${part}` : key;
    }
  }
  return node?.id ? figmaDocId(node.id, part) : undefined;
}

/** A keyed instance's slots and rows, keyed by it (Figma's slots carry no key of their own); in place. */
function slotKeys(node) {
  if (!node || typeof node !== "object") return;
  const key = typeof node.key === "string" && node.key ? node.key : null;
  for (const slot of node.slots ?? []) {
    if (key) slot.key ??= `${key}.${slot.name}`;
    (slot.children ?? []).forEach(slotKeys);
  }
  for (const slot of node.innerSlots ?? []) (slot.children ?? []).forEach(slotKeys);
  if (key && node.rows) node.rowKeys = Object.fromEntries(Object.keys(node.rows).map((row) => [row, `${key}.${row}`]));
  (node.children ?? []).forEach(slotKeys);
}

/**
 * A Figma layer's id as a page element's document id: "14243:64878" → "f14243-64878", an instance's inner layer
 * "I1:2;3:4" → "fI1-2_3-4"; `part` for an element the layer adds (its Screen, the Stack that places it).
 */
export function figmaDocId(figmaId, part) {
  return `f${String(figmaId).replace(/:/g, "-").replace(/;/g, "_")}${part ? `.${part}` : ""}`;
}

/* ── CLI ────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Node's own modules, loaded only by the CLI and repoMapping: the Studio loads this file in the browser too (Export ›
 * Figma keeps the pull of each export, figma-diff's base), where they are never asked for.
 */
const nodeModule = (name) => import(/* @vite-ignore */ `node:${name}`);

/** The repo's mapping data (Node: the generated TS is plain enough for type stripping). */
export async function repoMapping(rootDir) {
  const { default: fs } = await nodeModule("fs");
  const { default: path } = await nodeModule("path");
  const { fileURLToPath, pathToFileURL } = await nodeModule("url");
  const root = rootDir ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const { FIGMA_PROPS } = await import(pathToFileURL(path.join(root, "src/platform/studio/inspector/figmaProps.generated.ts")).href);
  const contract = JSON.parse(fs.readFileSync(path.join(root, "docs/figma-contracts/component-properties.json"), "utf8"));
  const apiProps = apiPropsOf(fs.readdirSync(path.join(root, "docs/api")).filter((name) => name.endsWith(".json")).flatMap((file) => JSON.parse(fs.readFileSync(path.join(root, "docs/api", file), "utf8")).components ?? []));
  const { typographyStyles } = await import(pathToFileURL(path.join(root, "src/tokens/typography.generated.ts")).href).catch(() => ({ typographyStyles: null }));
  const iconSource = fs.readFileSync(path.join(root, "src/icons/generated/names.ts"), "utf8");
  const iconNames = [...new Set([...iconSource.matchAll(/"((?:icon|ic)-[a-z0-9-]+)"/g)].map((match) => match[1]))];
  const { DATA_SLOTS } = await import(pathToFileURL(path.join(root, "src/platform/studio/slots/dataSlots.ts")).href);
  return figmaMapping({ figmaProps: FIGMA_PROPS, contract, apiProps, textStyles: typographyStyles ? Object.keys(typographyStyles) : null, iconNames, dataSlots: DATA_SLOTS });
}

if (typeof process !== "undefined" && process.argv?.[1] && import.meta.url === (await nodeModule("url")).pathToFileURL((await nodeModule("path")).resolve(process.argv[1])).href) {
  const { default: fs } = await nodeModule("fs");
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
