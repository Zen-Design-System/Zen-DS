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
import { FIGMA_NAMED, LABEL_NAMED, NAME_PROP, isAutomaticName } from "./layer-meta.mjs";
import { BOX_SURFACE, GAP_PX, LONG_TO_SHORT, MARGIN_VARIABLE, PADDING_PX, sameValue } from "./figma-steps.mjs";
import { apiPropsOf, figmaMapping } from "./figma-map.mjs";
import { TOP_NAV_SET, TOP_NAV_TYPE_OF } from "./figma-top-nav.mjs";
import { chartFromFigma, chartHeaderOf, chartSetKey, headingHidden } from "./figma-charts.mjs";
import { READ_METRIC_CARD, isMetricCard, metricCardFromFigma, subActionFromFigma } from "./figma-metric.mjs";
import { BADGE_STATUS, changedProgress, propertyValueElement } from "./figma-property.mjs";
import { runsFromSegments } from "./text-runs.mjs";
import { dayFromText } from "../../src/components/Table/tableDates.ts";
import { ACTION_LAYERS, protoOfReaction } from "./figma-proto.mjs";
import { instanceLayerPaths } from "./instance-paths.mjs";
import { gradientFillProps, READ_GRADIENT_FILL } from "./figma-gradient.mjs";
import { imageFillProps, READ_IMAGE_FILL } from "./figma-image.mjs";
import { zenBlendOf } from "./blend-modes.mjs";
import { takesInstanceLook } from "./instance-look.mjs";
import { tokens } from "../../src/tokens/generated.ts";
import { contentTones, contentToneToken } from "../../src/components/_shared/contentTone.ts";
import { arcFromData, parseVectorPath, STAR_RATIO } from "../../src/components/Shape/geometry.ts";
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
${READ_IMAGE_FILL}
${READ_GRADIENT_FILL}
// Figma's arrow (⇧L, and the push's arrow): a VECTOR of two vertices on one level, one straight segment, a NONE start
// and an arrow cap at its end (its copy of a drawn arrow, 2026-10-20). Read behind \`in\` (Figma throws on a property a
// node type lacks).
const arrowLineOf = (node) => {
  if (node.type !== "VECTOR" || !("vectorNetwork" in node)) return false;
  try {
    const net = node.vectorNetwork;
    if (!net || net.vertices.length !== 2 || net.segments.length !== 1 || (net.regions || []).length) return false;
    const [a, b] = net.vertices;
    const seg = net.segments[0];
    const straight = [seg.tangentStart, seg.tangentEnd].every((t) => !t || (Math.abs(t.x) < 0.01 && Math.abs(t.y) < 0.01));
    return straight && Math.abs(a.y - b.y) < 0.01 && b.x > a.x && (a.strokeCap || "NONE") === "NONE" && /ARROW/.test(b.strokeCap || "");
  } catch (e) { return false; }
};
const textStyles = new Map();
const textStyleOf = async (id) => { if (!textStyles.has(id)) textStyles.set(id, await figma.getStyleByIdAsync(id)); return textStyles.get(id); };
const fillVariable = async (fills) => { const paint = Array.isArray(fills) ? fills.find((fill) => fill.visible !== false) : null; return paint ? await variableName(paint.boundVariables && paint.boundVariables.color && paint.boundVariables.color.id) : null; };
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
// A nested instance set to another variant of its set (a crumb's Item at Level Master where the primitive draws Sub):
// Figma lists no componentProperties override for it either, so it too is told from its owner's main component.
const ownLayers = new Map();
const variantIn = async (child, owner) => {
  if ((child.componentPropertyReferences || {}).mainComponent || !child.id.startsWith(owner.id + ";")) return false;
  const local = child.id.slice(owner.id.length + 1);
  if (local.includes(";")) return false;
  const main = await owner.getMainComponentAsync();
  if (!main) return false;
  if (!ownLayers.has(main.id)) ownLayers.set(main.id, new Map(main.findAll((n) => n.type === "INSTANCE").map((n) => [n.id, n])));
  const original = ownLayers.get(main.id).get(local);
  if (!original) return false;
  const [now, was] = [await child.getMainComponentAsync(), await original.getMainComponentAsync()];
  return Boolean(now && was && now.id !== was.id && now.parent && now.parent.type === "COMPONENT_SET" && now.parent.id === (was.parent && was.parent.id));
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
// Action-Bar/Mobile (figma-push actionBarParts): its Type, its Actions' button count and direction, each Button's
// properties and words, by the paths the push writes (\`Actions/Button[i]\`, under \`prefix\` inside a pattern).
const readActionBarParts = async (bar, prefix) => {
  const at = (rest) => (prefix ? prefix + "/" + rest : rest);
  const nested = prefix ? [{ path: prefix, props: await propsOf(bar) }] : [];
  const actions = bar.findOne((n) => n.type === "INSTANCE" && layerKey(n.name) === "Actions");
  if (!actions) return nested;
  nested.push({ path: at("Actions"), props: await propsOf(actions) });
  const buttons = actions.findAll((n) => n.type === "INSTANCE" && n.visible && layerKey(n.name) === "Button");
  for (let i = 0; i < buttons.length; i++) nested.push({ path: at("Actions/Button[" + i + "]"), props: await propsOf(buttons[i]), text: firstText(buttons[i]) });
  return nested;
};
// Pattern/AppShell/Mobile (figma-push mobileShellNode) in the shape the push writes: its Top-Navigation (read as
// readTopNav reads one), Bottom-Navigation and its Nav-Items, Action-Bar parts, its own slots by the frames they sit in
// (\`within\`), a hidden slot and the band's paint as edits, its own fill.
const readMobileShell = async (instance, set) => {
  const out = { type: "INSTANCE", id: instance.id, name: instance.name, set, props: await propsOf(instance), nested: [], slots: [], edits: [] };
  const own = await fillVariable(instance.fills);
  if (own) out.fill = own;
  const trailOf = (layer) => { const trail = []; for (let up = layer.parent; up && up.id !== instance.id; up = up.parent) { if (up.type === "INSTANCE") return null; trail.unshift(up.name); } return trail; };
  for (const layer of instance.findAll((n) => n.type === "INSTANCE" && n.visible)) {
    const trail = trailOf(layer);
    if (!trail) continue;
    const key = layerKey(layer.name);
    const path = trail.concat([key]).join("/");
    if (key === "Top-Navigation") { const top = await readTopNav(layer, await setOf(layer)); out.nested.push({ path, set: top.set, props: top.props, topNav: top.topNav }); }
    else if (key === "Bottom-Navigation") {
      out.nested.push({ path, set: await setOf(layer), props: await propsOf(layer) });
      const items = layer.findOne((n) => n.type === "SLOT" && n.name === "Nav-Items");
      const children = [];
      for (const item of items ? items.children : []) { const read_ = await read(item); if (read_) children.push(read_); }
      if (items) out.slots.push({ name: "Nav-Items", within: [path], children });
    } else if (key === "Action-Bar") out.nested.push(...(await readActionBarParts(layer, path)));
  }
  for (const slot of instance.findAll((n) => n.type === "SLOT")) {
    const within = trailOf(slot);
    if (!within) continue;
    let hidden = !slot.visible;
    for (let up = slot.parent; up && up.id !== instance.id && !hidden; up = up.parent) hidden = !up.visible;
    if (hidden) { out.edits.push({ layer: within.concat([slot.name]), visible: false }); continue; }
    const children = [];
    for (const inner of slot.children) { const read_ = await read(inner); if (read_) children.push(placed(read_, inner, slot)); }
    out.slots.push({ name: slot.name, within, children });
  }
  for (const frame of instance.children.filter((n) => n.type === "FRAME" && (n.name === "Band" || n.name === "Stage"))) {
    const paint = await fillVariable(frame.fills);
    if (paint) out.edits.push({ layer: [frame.name], fill: paint });
  }
  return out;
};
const readInstance = async (instance) => {
  const set = await setOf(instance);
  if (set && set.name === "Pattern/AppShell/Mobile") return readMobileShell(instance, set);
  if (set && set.name === "Action-Bar/Mobile") return { type: "INSTANCE", id: instance.id, name: instance.name, set, props: await propsOf(instance), nested: await readActionBarParts(instance, "") };
  // Its variant values too (Patterns/Sidebar: the Sidebar's theme, density and shadow).
  if (set && COMPOSITION.test(set.name)) return { ...(await readFrame(instance)), type: "FRAME", composition: set.name, compositionProps: await propsOf(instance) };
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
  // Ellipses whose arc the page changed (a Badge-Status ring's Progress: figma-property.mjs), by the instances they sit in.
  const arced = new Set((instance.overrides || []).filter((o) => o.overriddenFields.includes("arcData")).map((o) => o.id));
  const walk = async (node, trail, owner) => {
    for (const child of node.children || []) {
      if (!child.visible) continue;
      if (child.type === "ELLIPSE" && arced.has(child.id) && child.arcData) {
        out.arcs = out.arcs || [];
        out.arcs.push({ path: trail.join("/"), name: child.name, arc: { start: child.arcData.startingAngle, end: child.arcData.endingAngle, inner: child.arcData.innerRadius } });
      }
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
      if (child.type === "INSTANCE" && (changed.has(child.id) || avatarNamed || (await swappedIn(child, owner)) || (await variantIn(child, owner)))) out.nested.push({ path: next.join("/"), set: await setOf(child), props: await propsOf(child), text: firstText(child) });
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
  // Resized to a fixed width of its own (not its main's): the code's width (Card, ListBox).
  const mainOf = await instance.getMainComponentAsync();
  if (instance.layoutSizingHorizontal === "FIXED" && mainOf && Math.round(mainOf.width) !== Math.round(instance.width)) out.fixedWidth = Math.round(instance.width);
  // The instance's own layer opacity and blend (Figma's Appearance), when not the defaults (instance-look.mjs).
  if (typeof instance.opacity === "number" && instance.opacity < 1) out.opacity = instance.opacity;
  if (typeof instance.blendMode === "string" && instance.blendMode !== "PASS_THROUGH") out.blendMode = instance.blendMode;
  return out;
};
// What the Zen plugin's Import from Studio left on a layer (shared plugin data "zenstudio"): its Studio key (the element
// id it draws), and on the frame the Studio page and the export it came from.
const studioData = (node, name) => { try { return node.getSharedPluginData("zenstudio", name) || null; } catch (e) { return null; } };
// Prototype interactions (Zen-DS figma-proto.mjs's shape): a destination frame is named by the Studio frame id the Zen
// plugin kept on it ("screen:…", "overlay:…"), else "figma:<id>"; layer: a nested layer of an instance.
const destinationFrames = new Map();
const destinationOf = async (id) => {
  if (!id) return null;
  if (!destinationFrames.has(id)) {
    const dest = await figma.getNodeByIdAsync(id);
    destinationFrames.set(id, (dest && studioData(dest, "frame")) || "figma:" + id);
  }
  return destinationFrames.get(id);
};
const reactionsOf = async (node, layer) => {
  let list = [];
  try { list = node.reactions || []; } catch (e) { list = []; }
  const out = [];
  for (const reaction of list) {
    const trigger = reaction.trigger || {};
    for (const action of reaction.actions || (reaction.action ? [reaction.action] : [])) {
      if (!action) continue;
      const entry = { trigger: trigger.type || null };
      if (trigger.type === "AFTER_TIMEOUT") entry.timeout = trigger.timeout;
      if (action.type === "CLOSE" || action.type === "BACK") entry.action = action.type;
      else if (action.type === "NODE" && (action.navigation === "NAVIGATE" || action.navigation === "OVERLAY")) {
        entry.action = action.navigation;
        entry.to = await destinationOf(action.destinationId);
        const t = action.transition;
        if (t) {
          const curve = t.easing && t.easing.easingFunctionCubicBezier;
          entry.transition = { type: t.type, duration: t.duration };
          if (t.direction) entry.transition.direction = t.direction;
          if (curve) entry.transition.easing = [curve.x1, curve.y1, curve.x2, curve.y2];
        }
      } else entry.action = action.type + (action.navigation ? ":" + action.navigation : "");
      if (layer) entry.layer = layer;
      out.push(entry);
    }
  }
  return out;
};
const ROOT_ID = ${JSON.stringify(nodeId)};
// The Studio page the frame read was imported as (set once the frame is found, below).
let READ_PAGE = null;
// A component of the page itself (a main or set inside the frame read): its Studio id (the Zen plugin keeps it), else
// its Figma id. A library component, or one elsewhere in the file: null.
const pageOwn = (component) => { for (let at = component; at; at = at.parent) if (at.id === ROOT_ID) return studioData(component, "local") || component.id; return null; };
const ownerOf = (main) => (main && main.parent && main.parent.type === "COMPONENT_SET" ? main.parent : main);
// Another Studio page's component (Zen Studio's project components): a main the Zen plugin marked with its page and id,
// outside the frame read (in its own page's frame, or the holder frame it waits in). { page, local }, else null.
const studioPageOf = (node) => { for (let at = node; at && at.type !== "PAGE" && at.type !== "DOCUMENT"; at = at.parent) { const page = studioData(at, "page") || studioData(at, "components-of"); if (page) return page; } return null; };
const projectOwn = (component) => {
  if (!component || pageOwn(component)) return null;
  const local = studioData(component, "local");
  const page = local ? studioPageOf(component) : null;
  return local && page && page !== READ_PAGE ? { page, local } : null;
};
// A Zen component's instance (the library's, not one of the page's own components, nor another Studio page's).
const zenInstance = async (node) => { if (node.type !== "INSTANCE") return false; const owner = ownerOf(await node.getMainComponentAsync()); return !pageOwn(owner) && !projectOwn(owner); };
// A swap's component: the page's own (its id) or another by name (an icon).
const swapName = async (id) => {
  const component = typeof id === "string" ? await figma.getNodeByIdAsync(id) : null;
  return component ? pageOwn(ownerOf(component)) || component.name : id;
};
// An instance's variant and its text, boolean and swap values (its component properties).
const instanceValues = async (node) => {
  const variant = {};
  const props = {};
  for (const [key, entry] of Object.entries(node.componentProperties || {})) {
    const name = key.split("#")[0];
    if (entry.type === "VARIANT") variant[name] = entry.value;
    else if (entry.type === "INSTANCE_SWAP") props[name] = await swapName(entry.value);
    else if (entry.type === "TEXT" || entry.type === "BOOLEAN") props[name] = entry.value;
  }
  return { variant, props };
};
// A layer's child indices from an instance (figma-push layerOverrides' "at": an instance's layers mirror its main's).
// By id: a layer findAll gave inside an instance is not the same object as its parent's child (indexOf: -1, 2026-10-20).
const indexPath = (layer, top) => {
  const at = [];
  for (let at_ = layer; at_ && at_.id !== top.id; at_ = at_.parent) {
    const index = at_.parent ? at_.parent.children.findIndex((child) => child.id === at_.id) : -1;
    if (index < 0) return null;
    at.unshift(index);
  }
  return at;
};
const plainJson = (value) => JSON.stringify(value, (key, entry) => (key === "id" || key === "key" ? undefined : entry));
// An instance of the page's own main or set (figma-push Use): its variant and values; its overrides of its main's
// layers (instance.overrides: words, visibility, colour) by child indices, and the values a nested instance of the
// page's own components has that its counterpart in the main has not (Figma lists no override for a nested instance
// switched to another variant, checked 2026-10-20); what it puts in its main's slots, when that differs from its main's
// own content.
// An instance of another Studio page's component: its page and id, its variant and property values (its changes to the
// main's layers are left to that page's main).
const readProjectInstance = async (node, owner) => {
  const own = await instanceValues(node);
  const of = projectOwn(owner);
  return { type: "INSTANCE", id: node.id, name: node.name, local: of.local, page: of.page, ...(Object.keys(own.variant).length ? { variant: own.variant } : {}), ...(Object.keys(own.props).length ? { props: own.props } : {}) };
};
const readLocalInstance = async (node, owner) => {
  const out = { type: "INSTANCE", id: node.id, name: node.name, local: pageOwn(owner) };
  const own = await instanceValues(node);
  if (Object.keys(own.variant).length) out.variant = own.variant;
  if (Object.keys(own.props).length) out.props = own.props;
  const overrides = [];
  let changed = [];
  try { changed = ("overrides" in node && node.overrides) || []; } catch (e) { changed = []; }
  for (const entry of changed) {
    if (entry.id === node.id) continue;
    const layer = await figma.getNodeByIdAsync(entry.id);
    if (!layer) continue;
    // A layer in a slot is the instance's own content (below), not an override of its main; a layer inside a Zen
    // component is read with that component (below).
    let inSlot = layer.type === "SLOT";
    for (let up = layer.parent; up && up.id !== node.id && !inSlot; up = up.parent) inSlot = up.type === "SLOT" || await zenInstance(up);
    if (inSlot) continue;
    const at = indexPath(layer, node);
    if (!at) continue;
    const fields = entry.overriddenFields || [];
    const change = { at };
    if (fields.includes("characters") && layer.type === "TEXT") change.characters = layer.characters;
    if (fields.includes("visible")) change.visible = layer.visible;
    if (fields.includes("fills") && "fills" in layer && Array.isArray(layer.fills)) {
      const paint = layer.fills.find((fill) => fill.visible !== false);
      const name = paint ? await variableName(paint.boundVariables && paint.boundVariables.color && paint.boundVariables.color.id) : null;
      if (name) change.fill = name;
    }
    if (Object.keys(change).length > 1) overrides.push(change);
  }
  const main = await node.getMainComponentAsync();
  // The main's layer at the same child indices (an instance's layers mirror its main's).
  const counterpart = (at) => { let theirs = main; for (const index of at) theirs = theirs && "children" in theirs ? theirs.children[index] : null; return theirs; };
  for (const layer of node.findAll((each) => each.type === "INSTANCE")) {
    // Not a slot's content (the instance's own layers, below); a nested instance inside a nested one counts (Chip/Icon).
    let inSlot = false;
    for (let up = layer.parent; up && up.id !== node.id && !inSlot; up = up.parent) inSlot = up.type === "SLOT";
    if (inSlot || !pageOwn(ownerOf(await layer.getMainComponentAsync()))) continue;
    const at = indexPath(layer, node);
    const theirs = at ? counterpart(at) : null;
    if (!theirs || theirs.type !== "INSTANCE") continue;
    const mine = await instanceValues(layer);
    const base = await instanceValues(theirs);
    const differ = (values, from) => Object.fromEntries(Object.entries(values).filter(([name, value]) => from[name] !== value));
    const variant = differ(mine.variant, base.variant);
    const props = differ(mine.props, base.props);
    if (!Object.keys(variant).length && !Object.keys(props).length) continue;
    let change = overrides.find((each) => each.at.join(".") === at.join("."));
    if (!change) { change = { at }; overrides.push(change); }
    if (Object.keys(variant).length) change.variant = variant;
    if (Object.keys(props).length) change.props = props;
  }
  // A Zen component in the main (a Button, a Card): the properties this instance gives it that its main's does not
  // have, its label, and its own nested instances (figma-push layerOverrides props / text / nested; nested as
  // readInstance reads a placed one's).
  const touched = new Set(changed.filter((entry) => (entry.overriddenFields || []).some((field) => field === "componentProperties" || field === "characters")).map((entry) => entry.id));
  // Its own texts (not a nested instance's) this instance changed.
  const ownTextTouched = (instance) => { const seen = (parent) => (parent.children || []).some((child) => (child.type === "TEXT" && touched.has(child.id)) || (child.type !== "INSTANCE" && seen(child))); return seen(instance); };
  for (const layer of node.findAll((each) => each.type === "INSTANCE")) {
    if (!(await zenInstance(layer))) continue;
    let skip = false;
    for (let up = layer.parent; up && up.id !== node.id && !skip; up = up.parent) skip = up.type === "SLOT" || await zenInstance(up);
    if (skip) continue;
    const at = indexPath(layer, node);
    const theirs = at ? counterpart(at) : null;
    if (!theirs || theirs.type !== "INSTANCE") continue;
    const change = {};
    if (touched.has(layer.id)) {
      const mine = await propsOf(layer);
      const base = await propsOf(theirs);
      const differ = Object.fromEntries(Object.entries(mine).filter(([name, value]) => base[name] !== value));
      if (Object.keys(differ).length) change.props = differ;
    }
    if (ownTextTouched(layer)) change.text = firstText(layer);
    // Its nested instances this instance changed: only the properties that differ from the same layer in the main's
    // (a Pagination's Next keeps its own size and icon; the instance's change is its level).
    const nested = [];
    const walk = async (parent, mirror, trail) => {
      const kids = parent.children || [];
      for (let index = 0; index < kids.length; index++) {
        const child = kids[index];
        if (!child.visible || child.type === "SLOT") continue;
        const twin = mirror && "children" in mirror ? mirror.children[index] || null : null;
        const next = child.type === "INSTANCE" ? trail.concat([layerKey(child.name)]) : trail;
        if (child.type === "INSTANCE" && (touched.has(child.id) || ownTextTouched(child))) {
          const mine = await propsOf(child);
          const base = twin && twin.type === "INSTANCE" ? await propsOf(twin) : {};
          const props = Object.fromEntries(Object.entries(mine).filter(([name, value]) => base[name] !== value));
          nested.push({ path: next.join("/"), set: await setOf(child), props, ...(ownTextTouched(child) ? { text: firstText(child) } : {}) });
        }
        await walk(child, twin, next);
      }
    };
    await walk(layer, theirs, []);
    if (nested.length) change.nested = nested;
    if (!Object.keys(change).length) continue;
    const known = overrides.find((each) => each.at.join(".") === at.join("."));
    if (known) Object.assign(known, change);
    else overrides.push(Object.assign({ at }, change));
  }
  if (overrides.length) out.layerOverrides = overrides;
  const slots = [];
  for (const slot of node.findAll((layer) => layer.type === "SLOT")) {
    const at = indexPath(slot, node) || [];
    let theirs = main;
    for (const index of at) theirs = theirs && "children" in theirs ? theirs.children[index] : null;
    const children = (await Promise.all(slot.children.map(read))).filter(Boolean);
    const defaults = theirs && "children" in theirs ? (await Promise.all(theirs.children.map(read))).filter(Boolean) : [];
    if (plainJson(children) !== plainJson(defaults)) slots.push({ name: slot.name, children });
  }
  if (slots.length) out.slots = slots;
  return out;
};
const read = async (node) => {
  const out = await readLayer(node);
  const key = out ? studioData(node, "key") : null;
  if (key) out.key = key;
  // An instance the Zen plugin named (figma-push nameGiven): the person's name, or a name changed in Figma since, is its
  // layer's name; the one the import wrote otherwise is its component's or its content.
  const wrote = key && out.type === "INSTANCE" ? studioData(node, "name") : null;
  if (wrote) out.nameGiven = node.name !== wrote || studioData(node, "given") === "1";
  // A layer bound to its main's component property: the property's name by field (figma-push propRefs).
  let refs = null;
  try { refs = out ? node.componentPropertyReferences : null; } catch (e) { refs = null; }
  if (refs && Object.keys(refs).length) out.propRefs = Object.fromEntries(Object.entries(refs).map(([field, key]) => [field, String(key).split("#")[0]]));
  // Its Prototype interactions, and an instance's on its own layers (a Dialog's Primary button), by their path.
  const reactions = out ? await reactionsOf(node) : [];
  if (out && node.type === "INSTANCE") {
    for (const inner of node.findAll((layer) => { try { return (layer.reactions || []).length > 0; } catch (e) { return false; } })) {
      const names = [];
      for (let at = inner; at && at !== node; at = at.parent) names.unshift(at.name);
      reactions.push(...(await reactionsOf(inner, names.join("/"))));
    }
  }
  if (reactions.length) out.reactions = reactions;
  return out;
};
const readLayer = async (node) => {
  if (!node.visible) return null;
  if (node.type === "TEXT") {
    // Words with styles of their own (Figma's mixed styles): the layer's style and colour are its longest segment's,
    // the words that differ come as segments (Studio text-runs.mjs writes them as TextRun).
    const parts = node.characters.length ? node.getStyledTextSegments(["fontName", "textDecoration", "fills", "textStyleId"]) : [];
    const longest = parts.reduce((best, part) => (!best || part.end - part.start > best.end - best.start ? part : best), null);
    const styleId = typeof node.textStyleId === "string" ? node.textStyleId : longest ? longest.textStyleId : "";
    const style = typeof styleId === "string" && styleId ? await textStyleOf(styleId) : null;
    // The layer's name only when it is not its text (Figma names a text layer after its words).
    const align = node.textAlignHorizontal && node.textAlignHorizontal !== "LEFT" ? { align: node.textAlignHorizontal } : {};
    // Numbers: Tabular (Text tabularNumbers; a plugin can read it, not set it).
    const tabular = node.openTypeFeatures && node.openTypeFeatures.TNUM === true ? { tabular: true } : {};
    // Its colour: the Color/Content variable its fill is bound to (Text tone).
    const fill = await fillVariable(Array.isArray(node.fills) ? node.fills : longest ? longest.fills : null);
    const segments = [];
    for (const part of parts.length > 1 ? parts : []) {
      const own = typeof part.textStyleId === "string" && part.textStyleId ? await textStyleOf(part.textStyleId) : null;
      const font = part.fontName && part.fontName.style ? part.fontName.style : "";
      const styleFont = own && own.fontName && own.fontName.style ? own.fontName.style : style && !own && style.fontName ? style.fontName.style : "";
      const segment = { start: part.start, end: part.end };
      if (own && (!style || own.name !== style.name)) segment.textStyle = own.name;
      // A word made bold or italic with its font (Figma's ⌘B / ⌘I) rather than with a text style.
      if (/bold|black|heavy/i.test(font) && !/bold|black|heavy/i.test(styleFont)) segment.bold = true;
      if (/italic|oblique/i.test(font) && !/italic|oblique/i.test(styleFont)) segment.italic = true;
      if (part.textDecoration && part.textDecoration !== "NONE") segment.decoration = part.textDecoration;
      const partFill = await fillVariable(part.fills);
      if (partFill && partFill !== fill) segment.fill = partFill;
      if (Object.keys(segment).length > 2) segments.push(segment);
    }
    return { type: "TEXT", id: node.id, ...(node.name === node.characters ? {} : { name: node.name }), characters: node.characters, textStyle: style ? style.name : null, ...align, ...tabular, ...(fill ? { fill } : {}), ...(segments.length ? { segments } : {}) };
  }
  if (node.type === "INSTANCE") {
    const owner = ownerOf(await node.getMainComponentAsync());
    if (owner && pageOwn(owner)) return readLocalInstance(node, owner);
    if (owner && projectOwn(owner)) return readProjectInstance(node, owner);
    return readInstance(node);
  }
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
// Figma's shape nodes a Zen Shape draws (src/components/Shape); a VECTOR is Shape type="vector" (F9).
const SHAPE_READ = new Set(["RECTANGLE", "ELLIPSE", "LINE", "STAR", "POLYGON", "VECTOR", "BOOLEAN_OPERATION"]);
// A child that fills its auto-layout parent on an axis (Figma's Fill container), or one placed outside the auto layout
// (Ignore auto layout): its constraints and its box in the parent's.
// Figma's mask (isMask, Use as mask): the layer masks the ones above it in its parent (Zen Box mask, its first layer).
const maskOf = (out, child) => {
  if ("isMask" in child && child.isMask === true) out.isMask = true;
  return out;
};
const placed = (out, child, parent) => {
  // A GROUP has no constraints (Figma throws on reading them): its edges are its layers', read as left / top.
  const constraints = "constraints" in child ? child.constraints : { horizontal: "MIN", vertical: "MIN" };
  if (!("layoutMode" in parent) || parent.layoutMode === "NONE") {
    // A shape or a group in a frame without auto layout keeps its X / Y (a Zen Shape or Box group in a free frame: px
    // insets); a group's layers keep theirs inside it (Figma writes them in the group's parent's space).
    const inGroup = parent.type === "GROUP" || parent.type === "BOOLEAN_OPERATION";
    const w = out.shape ? out.shape.w : Math.round(child.width * 100) / 100;
    const h = out.shape ? out.shape.h : Math.round(child.height * 100) / 100;
    // Every layer of a frame without auto layout (Figma's free frame: shapes, frames, texts, instances) keeps its X / Y.
    if ("layoutMode" in parent || inGroup) out.absolute = { x: Math.round((child.x - (inGroup ? parent.x : 0)) * 100) / 100, y: Math.round((child.y - (inGroup ? parent.y : 0)) * 100) / 100, w, h, pw: Math.round(parent.width), ph: Math.round(parent.height), cx: constraints.horizontal, cy: constraints.vertical, free: true };
    return out;
  }
  // A grid cell keeps its minimum width (figma-push: columns that fit, counted for the page's width).
  const own = (key) => (key in child ? child[key] : undefined);
  if (parent.layoutMode === "GRID") {
    if (own("minWidth")) out.minW = child.minWidth;
    return out;
  }
  if (own("layoutPositioning") === "ABSOLUTE") {
    // X / Y to the hundredth: a vector sits where its path starts (Figma moves it there, often between pixels).
    out.absolute = { x: Math.round(child.x * 100) / 100, y: Math.round(child.y * 100) / 100, w: Math.round(child.width), h: Math.round(child.height), pw: Math.round(parent.width), ph: Math.round(parent.height), cx: constraints.horizontal, cy: constraints.vertical };
    return out;
  }
  if (own("layoutSizingHorizontal") === "FILL") out.fillW = true;
  if (own("layoutSizingVertical") === "FILL") out.fillH = true;
  if (own("minWidth")) out.minW = child.minWidth;
  if (own("maxWidth")) out.maxW = child.maxWidth;
  if (own("maxHeight")) out.maxH = child.maxHeight;
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
      // A project component's instance in the Content slot (one per value, figma-push tableNode): the layer itself.
      const content = cell.findOne((n) => n.type === "SLOT");
      const held = content ? content.children.find((child) => child.visible) : null;
      const heldOwner = held && held.type === "INSTANCE" ? ownerOf(await held.getMainComponentAsync()) : null;
      if (heldOwner && (pageOwn(heldOwner) || projectOwn(heldOwner))) {
        const layer = pageOwn(heldOwner) ? await readLocalInstance(held, heldOwner) : await readProjectInstance(held, heldOwner);
        cells.push({ ...base, kind: null, props: {}, layer, ...(props["Open-Button"] === true ? { open: true } : {}), texts: held.findAll((t) => t.type === "TEXT" && t.visible).map((t) => t.characters) });
        continue;
      }
      let kind = null;
      let kindProps = {};
      let kindName = null;
      const parts = [];
      for (const inner of cell.findAll((n) => n.type === "INSTANCE" && n.visible)) {
        const innerSet = await setOf(inner);
        if (!innerSet || /^(icon|ic)-/.test(innerSet.name)) continue;
        if (innerSet.name.startsWith("Primitives/Table/Cell/")) { if (!kind) { kind = innerSet.name.split("/").pop(); kindProps = await propsOf(inner); kindName = inner.name; } continue; }
        const text = firstText(inner);
        parts.push({ id: inner.id, set: innerSet, props: await propsOf(inner), ...(text !== null ? { text } : {}) });
      }
      // A Text-Cell named Date-Cell holds a date column's day (figma-push tableNode).
      cells.push({ ...base, kind, props: kindProps, ...(kindName === "Date-Cell" ? { date: true } : {}), ...(props["Open-Button"] === true ? { open: true } : {}), texts: cell.findAll((t) => t.type === "TEXT" && t.visible).map((t) => t.characters), ...(parts.length ? { parts } : {}) });
    }
    if (header && !out.header) out.header = cells;
    else out.rows.push({ id: row.id, cells });
  }
  return out;
};
// A frame of row frames whose first row is Table/Cell/Header cells and the others Table/Sheet/Cell cells (Figma
// Table/Sheet, figma-push sheetTableNode): one SheetTable. Each cell gives its width (or Fill) and its content: a
// Text-Cell (its label, Bold), a Code (its text) or a Keys frame (its Key chips and the separators between them).
const sheetSetNames = async (row) => {
  const names = [];
  for (const child of (row.children || []).filter((n) => n.visible)) names.push(child.type === "INSTANCE" ? ((await setOf(child)) || {}).name || "" : "");
  return names;
};
const isSheet = async (rows) => {
  if (rows.length < 2 || !rows.every((row) => row.type === "FRAME")) return false;
  const head = await sheetSetNames(rows[0]);
  if (!head.length || !head.every((name) => name === "Table/Cell/Header")) return false;
  for (const row of rows.slice(1)) {
    const names = await sheetSetNames(row);
    if (!names.length || !names.every((name) => name === "Table/Sheet/Cell")) return false;
  }
  return true;
};
const readSheet = async (node, rows, root) => {
  const out = { type: "SHEET", id: node.id, name: node.name, ...frameOf(node, root), header: [], rows: [] };
  const sizeOf = (cell) => ({ w: Math.round(cell.width), ...(cell.layoutSizingHorizontal === "FILL" ? { fill: true } : {}) });
  for (const cell of rows[0].children.filter((n) => n.visible)) {
    const props = await propsOf(cell);
    const named = Object.entries(props).find(([key, value]) => key.endsWith("Label") && typeof value === "string");
    out.header.push({ id: cell.id, ...sizeOf(cell), label: props.Label === false ? "" : named ? named[1] : firstText(cell) || "" });
  }
  for (const row of rows.slice(1)) {
    const cells = [];
    for (const cell of row.children.filter((n) => n.visible)) {
      const slot = cell.findOne((n) => n.type === "SLOT");
      const first = slot ? slot.children.find((n) => n.visible) : null;
      const read_ = { id: cell.id, ...sizeOf(cell), kind: "text", text: "" };
      if (first && first.type === "FRAME") {
        // Keys: each chip's Key and each separator, in order ("Tab / Shift + Tab").
        const parts = [];
        for (const part of first.children.filter((n) => n.visible)) {
          if (part.type === "TEXT") { parts.push(part.characters); continue; }
          if (part.type !== "INSTANCE") continue;
          const props = await propsOf(part);
          parts.push(typeof props.Key === "string" ? props.Key : firstText(part) || "");
        }
        Object.assign(read_, { kind: "keys", text: parts.join(" ") });
      } else if (first && first.type === "INSTANCE") {
        const set = (await setOf(first)) || {};
        const props = await propsOf(first);
        if (set.name === ".Primitives/Table/Sheet/Code") Object.assign(read_, { kind: "code", text: typeof props.Code === "string" ? props.Code : firstText(first) || "" });
        else Object.assign(read_, { text: firstText(first, "Label") || firstText(first) || "", ...(props.Bold === "Yes" ? { bold: true } : {}) });
      }
      cells.push(read_);
    }
    out.rows.push({ id: row.id, cells });
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
  // A property this node type has, else undefined: Figma throws on reading one it lacks (pointCount on a VECTOR,
  // clipsContent on a GROUP; the live Zen file 2026-10-19), where the mock returned undefined.
  const own = (key) => (key in node ? node[key] : undefined);
  // Figma's own shapes come back as Zen Shapes (figma-push shapeNode, the other way): size, colour variables, arc,
  // count, ratio, corner variable, rotation, opacity. Vectors and boolean groups stay drawings.
  if (SHAPE_READ.has(node.type)) {
    const solid = (paints) => (Array.isArray(paints) ? paints.find((paint) => paint.visible !== false && paint.type === "SOLID") : null) || null;
    const fillPaint = solid(node.fills);
    const strokePaint = solid(node.strokes);
    const boundId = (paint) => (paint && paint.boundVariables && paint.boundVariables.color ? paint.boundVariables.color.id : null);
    const radiusBinding = node.boundVariables && node.boundVariables.topLeftRadius ? node.boundVariables.topLeftRadius.id : null;
    // A mirrored shape (Zen flip, ⇧H): Figma reports it as turned 180°; its transform says mirror and the real turn
    // (as a frame's below; the live Zen file 2026-10-19 read a flipped Star back as rotation -180).
    const m = node.relativeTransform;
    const mirrored = Boolean(m) && m[0][0] * m[1][1] - m[0][1] * m[1][0] < 0;
    const turn = mirrored ? Math.round((Math.atan2(m[1][0], -m[0][0]) * 180) / Math.PI * 100) / 100 : Math.round((node.rotation || 0) * 100) / 100;
    const read_ = { type: node.type, name: node.name, shape: {
      w: Math.round(node.width * 100) / 100, h: Math.round(node.height * 100) / 100,
      fill: fillPaint ? (await variableName(boundId(fillPaint))) || "unbound" : null,
      stroke: strokePaint ? (await variableName(boundId(strokePaint))) || "unbound" : null,
      strokeWeight: typeof own("strokeWeight") === "number" ? node.strokeWeight : 1, strokeAlign: own("strokeAlign"), cap: typeof own("strokeCap") === "string" ? node.strokeCap : null, arrowLine: arrowLineOf(node),
      arc: node.type === "ELLIPSE" ? node.arcData : null, pointCount: own("pointCount"), innerRadius: own("innerRadius"),
      radius: typeof own("cornerRadius") === "number" ? node.cornerRadius : null, radiusVar: await variableName(radiusBinding),
      // Corner smoothing (0–1), when set.
      ...(typeof own("cornerSmoothing") === "number" && node.cornerSmoothing > 0 ? { smoothing: node.cornerSmoothing } : {}),
      rotation: turn, ...(mirrored ? { flip: "horizontal" } : {}), opacity: node.opacity, imageFill: readImageFill(node), gradientFill: await readGradientFill(node),
      // Its layer blend (Appearance › blend mode): Normal is a shape's default.
      ...("blendMode" in node && typeof node.blendMode === "string" && node.blendMode !== "NORMAL" ? { blendMode: node.blendMode } : {}),
      // A vector's own paths; a boolean group's result (its fill geometry: Figma combined its shapes, F9b).
      paths: node.type === "VECTOR" && Array.isArray(node.vectorPaths) ? node.vectorPaths.map((path) => ({ windingRule: path.windingRule, data: path.data }))
        : node.type === "BOOLEAN_OPERATION" && Array.isArray(node.fillGeometry) ? node.fillGeometry.map((path) => ({ windingRule: path.windingRule, data: path.data })) : null,
      operation: node.type === "BOOLEAN_OPERATION" ? node.booleanOperation : undefined,
    } };
    // A boolean group's shapes, each at its X / Y inside it.
    if (node.type === "BOOLEAN_OPERATION") {
      read_.children = [];
      for (const child of node.children || []) {
        if (child.visible === false) continue;
        const kid = await read(child);
        if (!kid) continue;
        placed(kid, child, node);
        read_.children.push(kid);
      }
    }
    return read_;
  }
  if (DRAWING.has(node.type)) return { type: node.type, name: node.name };
  const visible = (node.children || []).filter((child) => child.visible);
  if (visible.length && visible.every((child) => child.type === "INSTANCE")) {
    const sets = await Promise.all(visible.map(setOf));
    if (sets.every((set) => set && set.name === "Primitives/Table/Data-Row")) return readTable(node, visible, root);
  }
  if (await isSheet(visible)) return readSheet(node, visible, root);
  const out = { type: node.type, id: node.id, name: node.name, ...frameOf(node, root), children: [] };
  // A page's own main or set (figma-push localModel): its Studio id, description and link; a variant's values, or the
  // properties a set or lone main defines.
  if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
    out.local = studioData(node, "local") || node.id;
    if (node.description) out.description = node.description;
    const link = Array.isArray(node.documentationLinks) && node.documentationLinks[0] ? node.documentationLinks[0].uri : null;
    if (link) out.link = link;
    let definitions = {};
    try {
      if (node.parent && node.parent.type === "COMPONENT_SET") out.variant = node.variantProperties || {};
      else definitions = node.componentPropertyDefinitions || {};
    } catch (e) { definitions = {}; }
    const properties = [];
    for (const [key, definition] of Object.entries(definitions)) {
      if (definition.type === "VARIANT") continue;
      const property = { name: key.split("#")[0], type: definition.type };
      if (definition.type === "INSTANCE_SWAP") property.default = await swapName(definition.defaultValue);
      else if (definition.type !== "SLOT") property.default = definition.defaultValue;
      properties.push(property);
    }
    if (properties.length) out.properties = properties;
  }
  // A frame without auto layout (Figma's free frame): its own size, its layers at their X / Y (a Zen free Box).
  if (!root && own("layoutMode") === "NONE") out.fixed = { w: Math.round(node.width * 100) / 100, h: Math.round(node.height * 100) / 100 };
  // A GROUP's box (a Zen group's width and height; the live Zen file 2026-10-19 read none and the group came back NaN).
  if (node.type === "GROUP") Object.assign(out, { width: Math.round(node.width * 100) / 100, height: Math.round(node.height * 100) / 100 });
  // Clip content: a frame inside the page that clips (the page frame itself is the screen, which always does).
  if (!root && own("clipsContent") === true) out.clip = true;
  // Overflow scrolling (Stack / Box scroll) and a background bound to a colour variable (a Box's surface).
  if (!root && own("overflowDirection") && node.overflowDirection !== "NONE") out.scroll = node.overflowDirection;
  // Figma's explicit variable modes (Change variable mode): { collection name: mode name } (Studio Variables v2: modes).
  const explicit = own("explicitVariableModes");
  if (explicit && Object.keys(explicit).length) {
    const modes = {};
    for (const [collectionId, modeId] of Object.entries(explicit)) {
      let collection = null;
      try { collection = await figma.variables.getVariableCollectionByIdAsync(collectionId); } catch (e) { collection = null; }
      const mode = collection ? collection.modes.find((each) => each.modeId === modeId) : null;
      if (collection && mode) modes[collection.name] = mode.name;
    }
    if (Object.keys(modes).length) out.modes = modes;
  }
  const paint = !root && Array.isArray(own("fills")) ? node.fills.find((fill) => fill.visible !== false && fill.type === "SOLID") : null;
  const fill = paint ? await variableName(paint.boundVariables && paint.boundVariables.color && paint.boundVariables.color.id) : null;
  if (fill) out.fill = fill;
  // An image fill (F8, figma-image.mjs): the picture back by its Studio src.
  const imageFill = !root ? readImageFill(node) : null;
  if (imageFill) out.imageFill = imageFill;
  // A gradient fill (figma-gradient.mjs): its type, transform and stops' variables.
  const gradientFill = !root ? await readGradientFill(node) : null;
  if (gradientFill) out.gradientFill = gradientFill;
  // Its stroke (variable, weight per side, dash), corners and their variables, effect style, opacity, rotation and
  // mirror: one Zen frame (figma-push frameLook, the other way). The page frame itself is the Screen.
  if (!root) {
    const strokePaint = Array.isArray(own("strokes")) ? node.strokes.find((p) => p.visible !== false && p.type === "SOLID") : null;
    if (strokePaint) {
      out.stroke = (await variableName(strokePaint.boundVariables && strokePaint.boundVariables.color && strokePaint.boundVariables.color.id)) || "unbound";
      const sides = [own("strokeTopWeight"), own("strokeRightWeight"), own("strokeBottomWeight"), own("strokeLeftWeight")];
      out.strokeWeights = sides.every((v) => typeof v === "number") ? sides : [0, 1, 2, 3].map(() => (typeof own("strokeWeight") === "number" ? node.strokeWeight : 1));
      if (Array.isArray(own("dashPattern")) && node.dashPattern.length) out.dash = node.dashPattern;
    }
    const corners = [own("topLeftRadius"), own("topRightRadius"), own("bottomRightRadius"), own("bottomLeftRadius")].map((v) => (typeof v === "number" ? v : 0));
    if (corners.some((v) => v > 0)) {
      const bound = node.boundVariables || {};
      out.radii = corners;
      out.radiiVars = await Promise.all(["topLeftRadius", "topRightRadius", "bottomRightRadius", "bottomLeftRadius"].map((field) => variableName(bound[field] && bound[field].id)));
    }
    // Corner smoothing (0–1), when set.
    if (typeof own("cornerSmoothing") === "number" && node.cornerSmoothing > 0) out.cornerSmoothing = node.cornerSmoothing;
    if (typeof own("effectStyleId") === "string" && node.effectStyleId) {
      const style = await figma.getStyleByIdAsync(node.effectStyleId);
      if (style) out.effectStyle = style.name;
    }
    if (typeof node.opacity === "number" && node.opacity < 1) out.opacity = node.opacity;
    // Its layer blend: Pass through is a frame's and a group's default.
    if ("blendMode" in node && typeof node.blendMode === "string" && node.blendMode !== "PASS_THROUGH") out.blendMode = node.blendMode;
    // relativeTransform [[a, c, x], [b, d, y]] = R(θ)·S: a mirror (negative determinant) reads as a horizontal flip.
    const t = node.relativeTransform;
    if (t) {
      const mirrored = t[0][0] * t[1][1] - t[0][1] * t[1][0] < 0;
      const degrees = Math.round((Math.atan2(mirrored ? t[1][0] : -t[1][0], mirrored ? -t[0][0] : t[0][0]) * 180) / Math.PI * 100) / 100;
      if (mirrored) out.flip = "horizontal";
      if (degrees % 360 !== 0) out.rotation = degrees;
    }
  }
  const layout = await layoutOf(node);
  if (layout) out.layout = layout;
  // Fix position when scrolling: Figma's Fixed layers are a frame's last numberOfFixedChildren (figma-push sticky).
  const fixedFrom = (node.children || []).length - (own("numberOfFixedChildren") || 0);
  let index = -1;
  for (const child of node.children || []) {
    index += 1;
    const read_ = await read(child);
    if (!read_) continue;
    if (index >= fixedFrom) read_.scrollBehavior = "FIXED";
    // A grid's child: its cell (column and row from 0, its spans).
    if (own("layoutMode") === "GRID") read_.cell = { col: child.gridColumnAnchorIndex, row: child.gridRowAnchorIndex, span: child.gridColumnSpan, rowSpan: child.gridRowSpan };
    else placed(read_, child, node);
    maskOf(read_, child);
    out.children.push(read_);
  }
  return out;
};
// Figma's Sticky (Prototype > Scroll behavior) is not in the Plugin API; the frame's REST export carries it. Read only
// where something scrolls (a Sticky layer sticks to a scrolling frame).
const stickyIdsOf = async (root) => {
  const ids = new Set();
  try {
    const rest = await root.exportAsync({ format: "JSON_REST_V1" });
    const walk = (entry) => { if (entry.scrollBehavior === "STICKY_SCROLLS") ids.add(entry.id); (entry.children || []).forEach(walk); };
    walk(rest.document);
  } catch (e) { /* no REST export here: Sticky layers read as scrolling */ }
  return ids;
};
const scrolls = (entry) => Boolean(entry && (entry.scroll || (entry.children || []).some(scrolls) || (entry.slots || []).some((slot) => (slot.children || []).some(scrolls))));
const markSticky = (entry, ids) => {
  if (!entry || typeof entry !== "object") return;
  if (entry.id && ids.has(entry.id) && !entry.scrollBehavior) entry.scrollBehavior = "STICKY_SCROLLS";
  for (const child of entry.children || []) markSticky(child, ids);
  for (const slot of entry.slots || []) for (const child of slot.children || []) markSticky(child, ids);
};
const node = await figma.getNodeByIdAsync(${JSON.stringify(nodeId)});
if (!node) throw new Error("No node " + ${JSON.stringify(nodeId)});
READ_PAGE = studioPageOf(node);
// ASCII only (\\uXXXX for the rest): an answer with many non-ASCII characters was cut short in transit.
const result = node.type === "INSTANCE" || node.type === "TEXT" ? await read(node) : await readFrame(node, true);
if (("overflowDirection" in node && node.overflowDirection !== "NONE") || scrolls(result)) markSticky(result, await stickyIdsOf(node));
const json = JSON.stringify(result).replace(/[\\u0080-\\uffff]/g, (char) => "\\\\u" + char.charCodeAt(0).toString(16).padStart(4, "0"));
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
/**
 * Card and List-Box Theme names before 2026-10-21, as a file on an older library version still has them: Theme=Flat is
 * Default, Border × Surface=Flat is Flat-Border. Read only (B's suggestion): the push writes the new names, the code keeps
 * no alias.
 */
const LEGACY_THEME_CODES = new Set(["Card", "ListBox"]);
function legacyThemeProps(props) {
  if (props?.Theme === "Flat") return { ...props, Theme: "Default" };
  if (props?.Theme === "Border" && props.Surface === "Flat") return { ...props, Theme: "Flat-Border", Surface: "Default" };
  return props;
}

function instanceProps(item, set, mapping, notes, where) {
  if (LEGACY_THEME_CODES.has(set.code) && item.props) item = { ...item, props: legacyThemeProps(item.props) };
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

/** A workspace Side-Bar's panel slots, as the Basic Side-Bar names them (figma-push WORKSPACE_SLOTS, the other way). */
const FROM_WORKSPACE_SLOT = { "Child-Header-Content": "Header-Content", "Child-Body-Content": "Body-Content", "Child-Footer-Content": "Footer-Content" };
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
const SELECTED_PROP = { Sidebar: "selectedId", Segmented: "defaultValue", Tabs: "defaultValue", BottomNavigation: "value" };
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
/** What the Table draws for a cell's instance: an Avatar is Small over a Subtext (XSmall alone), square in a photo cell,
 *  Solid in the first column (`lead`) and Subtle elsewhere. */
const drawnProps = (code, column, lead = false) => (code === "Avatar" ? { ...TABLE_DRAWS.Avatar.props, ...(lead ? { background: "solid" } : {}), size: column.caption ? "sm" : "xs", shape: column.content === "photo" ? "square" : "circle" } : TABLE_DRAWS[code].props);

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
 * A Table column whose cells hold a project component's instance in their Content slot (figma-push tableNode, one per
 * value): `cells` (each value → its `<Use>`) and the rows' values, read from the variant property that differs from row
 * to row. Null for any other column.
 */
function layerColumn(cells, ctx) {
  const layers = cells.map((cell) => cell?.layer ?? null);
  if (!layers.some(Boolean)) return null;
  // The variant property that tells the values apart (the one whose value changes from row to row), else the first.
  const axes = [...new Set(layers.flatMap((layer) => Object.keys(layer?.variant ?? {})))];
  const axis = axes.find((name) => new Set(layers.map((layer) => layer?.variant?.[name])).size > 1) ?? axes[0];
  const values = cells.map((cell, at) => (layers[at] ? String(layers[at].variant?.[axis] ?? cell.texts?.[0] ?? "") : cell?.texts?.[0] ?? ""));
  const shown = new Map();
  layers.forEach((layer, at) => { if (layer && values[at] && !shown.has(values[at])) shown.set(values[at], layer); });
  // A set of this page lends every value of its variants, in its order, so a value no row shows stays in the select
  // (the Studio writes all of them; Figma's rows show only the used ones).
  const first = [...shown.values()][0];
  const set = first && !first.page ? ctx.local.variants.get(pageValue(first.local, ctx)) ?? [] : [];
  const order = [...new Set([...set.map((main) => main.variant?.[axis]).filter((value) => typeof value === "string" && value), ...shown.keys()])];
  const fields = {};
  for (const value of order) {
    const layer = shown.get(value) ?? { type: "INSTANCE", name: first.name, local: first.local, variant: { [axis]: value } };
    const element = useElement(layer, ctx);
    if (element) fields[value] = { kind: "element", node: element };
  }
  return Object.keys(fields).length ? { values, cells: { kind: "object", fields } } : null;
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
    // Cells that hold a project component's instance in their Content slot, one per value: the column's `cells`.
    const held = layerColumn(node.rows.map((row) => row.cells[index]), ctx);
    if (held) {
      const id = uniqueId(slug(head.label || `column ${index + 1}`), ids);
      const fields = { id: literal(id), header: literal(head.label ?? ""), cells: held.cells };
      if (head.sort) fields.sortable = literal(true);
      if ((cell.align ?? head.align) === "Right") fields.align = literal("right");
      if (!(cell.fill ?? head.fill) && (cell.w ?? head.w)) fields.width = literal(`${cell.w ?? head.w}px`);
      columns.push({ index, id, content: "layer", caption: false, fields, actions: null, values: held.values });
      continue;
    }
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
    // Date-Cells (figma-push: a date column's days in the locale's short form): the column edits as a date.
    const dated = content === "text" && node.rows.some((row) => row.cells[index]?.date);
    if (dated) fields.edit = literal("date");
    if (actions) fields.actions = { kind: "array", items: actions.map((action) => ({ kind: "object", fields: action.fields })) };
    if (cell.props?.Bold === "Yes") fields.bold = literal(true);
    const caption = cell.props?.Subtext === "Yes" || cell.props?.Caption === true;
    if (caption) fields.captionField = literal(`${id}Caption`);
    if (head.icon) {
      if (isZenIcon(head.icon, mapping)) fields.icon = literal(head.icon);
      else notes.push(`${where}: ${named}'s header icon "${head.icon}" is not a Zen icon (left out)`);
    }
    columns.push({ index, id, content, caption, fields, actions, dated });
  }
  // The rows: each cell's value under its column's id.
  const overrides = {};
  const rows = node.rows.map((row, at) => {
    const rowId = `row-${at + 1}`;
    const record = { id: rowId };
    for (const column of columns) {
      const cell = row.cells[column.index];
      if (!cell) continue;
      if (column.values) { record[column.id] = column.values[at] ?? ""; continue; }
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
        // A date column's day back as its ISO day ("10/25" → 2026-10-25, in the locale's order).
        record[column.id] = column.dated && cell.date ? dayFromText(shown[0] ?? "", ctx.locale) ?? shown[0] ?? "" : shown[0] ?? "";
        if (column.caption && shown[1]) record[`${column.id}Caption`] = shown[1];
      }
      // The Zen instances the cell draws, where Figma's differ from the Table's: that row's overrides.
      const drawn = parts.map((part) => ({ part, set: mapping.sets.get(part.set?.id) ?? mapping.sets.get(part.set?.name) })).filter(({ set }) => set && set.code !== "IconButton" && TABLE_DRAWS[set.code]);
      drawn.forEach(({ part, set }, index) => {
        const draws = TABLE_DRAWS[set.code];
        const figma = instanceProps(part, set, mapping, notes, `${where} › ${column.id}`);
        const defaults = mapping.apiProps[set.code];
        const fields = {};
        const expected = drawnProps(set.code, column, column === columns[0]);
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

/**
 * Figma Table/Sheet (a frame of row frames read by figmaReadCode as one SHEET) → the code's <SheetTable>: a column per
 * header cell (its label, a fixed width or Fill), its content from the first row's cell (text, Bold text, code, keys),
 * the rows written in the SheetTable under the columns' ids (figma-push sheetTableNode, the other way).
 */
function sheetElement(node, ctx) {
  const header = node.header ?? [];
  const sample = node.rows[0]?.cells ?? [];
  const ids = new Set();
  const columns = [];
  for (let index = 0; index < Math.max(header.length, sample.length); index += 1) {
    const head = header[index] ?? {};
    const cell = sample[index] ?? {};
    const id = uniqueId(slug(head.label || `column ${index + 1}`), ids);
    const fields = { id: literal(id), header: literal(head.label ?? "") };
    if (!(cell.fill ?? head.fill) && (cell.w ?? head.w)) fields.width = literal(`${cell.w ?? head.w}px`);
    if (cell.kind && cell.kind !== "text") fields.content = literal(cell.kind);
    if (cell.bold) fields.bold = literal(true);
    columns.push({ index, id, fields });
  }
  const rows = node.rows.map((row, at) => {
    const record = { id: literal(`row-${at + 1}`) };
    for (const column of columns) {
      const cell = row.cells[column.index];
      if (cell) record[column.id] = literal(String(cell.text ?? "").replace(/\u2028/g, " "));
    }
    return { kind: "object", fields: record };
  });
  const label = node.name.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  const props = { "aria-label": literal(label.charAt(0).toUpperCase() + label.slice(1)), columns: { kind: "array", items: columns.map((column) => ({ kind: "object", fields: column.fields })) }, rows: { kind: "array", items: rows } };
  return { kind: "element", name: "SheetTable", props, children: [] };
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

/**
 * The code's layer for a nested path the read names otherwise: Card's Sub-Action is a frame around its Button/Icon-Flat
 * since 2026-10-18, so the read (instances only) names the button "Button".
 */
const NESTED_ALIASES = { Card: { Button: "Sub-Action" } };
const nestedAlias = (code, path) => {
  const [first, ...rest] = String(path).split("/");
  const alias = NESTED_ALIASES[code]?.[first];
  return alias ? [alias, ...rest].join("/") : path;
};

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
      // The read keeps the layers that show: Child and SubHeading show by their own eyes since Header-Text is a slot.
      if (named("Child")) props.childTitle = literal(named("Child"));
      if (named("SubHeading")) props.subheading = literal(named("SubHeading"));
    } else {
      // No Header-Text read (the push's own JSON): the row's first text is the title, its `texts` the others, shown by
      // its edits (or by Child-Heading and Subheading, the switches before Header-Text became a slot).
      const shows = (layer, toggle) => node.edits?.find((edit) => edit.layer?.at?.(-1) === layer)?.visible ?? node.props?.[toggle] === true;
      if (typeof node.text === "string" && node.text) props.title = literal(node.text);
      if (shows("Child", "Child-Heading") && node.texts?.Child) props.childTitle = literal(node.texts.Child);
      if (shows("SubHeading", "Subheading") && node.texts?.SubHeading) props.subheading = literal(node.texts.SubHeading);
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
const NEEDS_NAME = LABEL_NAMED;
/** The elements that take Figma's resizing (width / height fill), src/components/Layout/sizing.ts. */
const SIZED = new Set(["Stack", "Grid", "Box", "Text", "Card", "ListBox"]);
/** Components sized like a layout layer whose Figma min / max width comes back as minWidth / maxWidth (Card.tsx, ListBox). */
const SIZED_INSTANCES = new Set(["Card", "ListBox"]);
const LAYOUT_FRAMES = new Set(["Stack", "Grid", "Box"]);
/** A toolbar Search's widest (the user 2026-10-24; harness search/toolbar-width). */
const TOOLBAR_SEARCH_MAX = 240;
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
 * BottomNavigation's look from its tabs (figma-push draws it on each): Label on is showLabels, an Accent Theme the accent
 * theme, a floating tab's -Surface / -Solid / plain Theme the selection (written where it is not the bar's default), and
 * the Default bar's Type=Action tab its action.
 */
function bottomNavLook(tabs, props, setName, ctx) {
  const type = /Floating-Glass$/.test(setName) ? "floating-glass" : /Floating$/.test(setName) ? "floating" : "default";
  const items = tabs.filter((tab) => tab.props?.Type !== "Action");
  if (items.some((tab) => tab.props?.Label === true)) props.showLabels = literal(true);
  const theme = String(items[0]?.props?.Theme ?? "");
  if (/^Accent/.test(theme)) props.theme = literal("accent");
  if (type !== "default" && theme) {
    const selection = /-Solid$/.test(theme) ? "solid" : /-Surface$/.test(theme) ? "surface" : "subtle";
    if (selection !== (type === "floating-glass" ? "subtle" : "surface")) props.selection = literal(selection);
  }
  const action = tabs.find((tab) => tab.props?.Type === "Action");
  const icon = action?.props?.["Icon-Src"];
  if (type === "default" && action && typeof icon === "string" && isZenIcon(icon, ctx.mapping)) {
    props.action = { kind: "object", fields: { icon: literal(icon), label: literal(action.name && action.name !== action.set?.name ? action.name : iconWords(icon)) } };
  }
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
  // A Bottom-Navigation tab keeps its label while Figma hides it (Label off is showLabels off, bottomNavLook).
  const tab = dataSlot.component === "BottomNavigation";
  const toItem = (item) => {
    // A placed tab's layer keeps its component's name: its label is its Label-Text (the push names the layer after it).
    const label = tab && typeof item.props?.["Label-Text"] === "string" && /\//.test(item.name ?? "") ? item.props["Label-Text"] : null;
    const shown = rail || tab ? { ...item, props: { ...item.props, Label: true }, text: item.text || label || item.name } : item;
    const fields = itemFields(shown, ctx, { labelKey, iconKey, where: `${where} › ${dataSlot.itemName}` });
    if (tab && item.props?.Noti === true) fields.dot = literal(true);
    // A count in its Badge-Counter (a Tab-Item with Badge on).
    const count = item.props?.Badge === true ? (item.nested ?? []).find((nested) => nested.path === "Badge-Counter")?.text : null;
    if (count) fields.badge = literal(/^\d+$/.test(count) ? Number(count) : count);
    if (isSelected(item)) selected ??= fields.id.value;
    return { kind: "object", fields };
  };
  // The Default bar's action is its Type=Action tab (bottomNavLook), not a destination.
  if (!dataSlot.nested) return { value: { kind: "array", items: rowsOf(slot.children ?? []).filter((row) => !(tab && row.props?.Type === "Action")).map(toItem) }, selected };
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
  // Patterns/Sidebar around its Side-Bar: the pattern itself, which reads as the Sidebar with its look (sidebarPattern).
  if (code === "Sidebar" && codeOf(sidebarPattern(node)?.inner, ctx) === "Sidebar") return node;
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
/** Figma's Header/AppShell (16783:71068): AppShellHeader on its own and the AppShell's header (figma-push HEADER_APPSHELL). */
const HEADER_APPSHELL = "Header/AppShell";
/** A header's actions: an Avatar named after a person at the end is the account (AppShellAccount; the push names it so). */
function headerActions(nodes, ctx) {
  return nodes.map((child, index) => {
    const element = convert(child, ctx);
    const name = child.name ?? "";
    if (element?.name === "Avatar" && index === nodes.length - 1 && name && !name.includes("/")) {
      const fields = { name: literal(name) };
      for (const prop of ["src", "theme"]) if (element.props[prop]) fields[prop] = element.props[prop];
      return { ...element, name: "AppShellAccount", props: fields, children: [] };
    }
    return element;
  }).filter(Boolean);
}
/**
 * Figma's Header/AppShell as AppShellHeader (figma-push appShellHeaderParts, the other way): its Theme and Density by the
 * map; Top-Elements' Leading-Slots, Center-Slots and Trailing-Slots its leading, center and actions while Top-Header
 * shows; Main-Element its main while Main shows; Sections its rows (the push's padding frame around each one dropped).
 * `collapse`: the Collapse Button's switch, which an AppShell reads as collapse="header" (on), else "sidebar" or "none" by the Side-Bar's own.
 */
/**
 * Header/AppShell in either shape: the push's instance (its slots listed), or the read of a placed one, a composition
 * frame whose slots sit in its layers (Sections › Main › Top-Header › Top-Elements, Main-Element, Sections).
 */
function appShellHeaderNode(node) {
  if (node?.type === "INSTANCE" && node.set?.name === HEADER_APPSHELL) return node;
  if (node?.type !== "FRAME" || node.composition !== HEADER_APPSHELL) return null;
  const slots = [];
  const walk = (layer) => { for (const child of layer.children ?? []) child.type === "SLOT" ? slots.push(child) : child.type !== "INSTANCE" && walk(child); };
  walk(node);
  return { type: "INSTANCE", id: node.id, name: node.name, set: { name: HEADER_APPSHELL }, props: node.compositionProps ?? {}, slots };
}
function appShellHeaderElement(node, ctx) {
  const { mapping, notes } = ctx;
  const set = node.set ? mapping.sets.get(node.set.id) ?? mapping.sets.get(node.set.name) : null;
  const own = set ? instanceProps(node, set, mapping, notes, `"${node.name}" (${HEADER_APPSHELL})`) : {};
  const props = Object.fromEntries(["theme", "density"].filter((name) => own[name]).map((name) => [name, own[name]]));
  const slot = (name) => (node.slots ?? []).find((entry) => entry.name === name);
  const elements = (nodes) => (nodes ?? []).map((child) => convert(child, ctx)).filter(Boolean);
  const place = (prop, element) => { if (element) props[prop] = { kind: "element", node: element }; };
  const top = node.props?.["Top-Header"] === false ? null : slot("Top-Elements");
  if (top) {
    const frame = (name) => (top.children ?? []).find((child) => child.name === name && child.visible !== false);
    const lead = frame("Leading-Slots"), centre = frame("Center-Slots"), trail = frame("Trailing-Slots");
    place("leading", oneOf(elements(lead?.children), { name: "Leading-Slots", layout: lead?.layout, source: lead }, ctx));
    place("center", centre ? oneOf(elements(centre.children), { name: "Center-Slots", layout: centre.layout, source: centre }, ctx) : null);
    place("actions", trail ? oneOf(headerActions(trail.children ?? [], ctx), { name: "Trailing-Slots", layout: trail.layout, source: trail }, ctx) : null);
  }
  const main = node.props?.Main === false ? null : slot("Main-Element");
  if (main) place("main", oneOf(elements(main.children), { name: "Main-Element", layout: main.layout, source: main }, ctx));
  const rows = elements(slot("Sections")?.children).map(unpadded);
  if (rows.length) place("sections", rows.length === 1 ? rows[0] : { kind: "element", name: "Stack", props: { gap: literal("none") }, children: rows });
  return { element: { kind: "element", name: "AppShellHeader", props, children: [] }, collapse: node.props?.["Collapse Button"] !== false };
}
/** The one instance a wrapper holds (Figma's Floating-Actions › Floating-Item › Button/Icon-Main), else the layer. */
const innermost = (node) => (node.type === "INSTANCE" || node.children?.length !== 1 ? node : innermost(node.children[0]));

/**
 * An app frame as AppShell (AppShell.tsx; figma-push.mjs appShellNode, the other way): a row of the Sidebar (an instance,
 * or the composition that wraps one), a column whose first row is the Dashboard header Type=Navigation, and an optional
 * Side-Panel. Read from Figma's ◇ Master-Layout (Main-Container › Header/Dashboard › Sections; Body with its Content
 * and Floating-Actions) and from the push's frames (Column › Header, Sections, Main). The rows give `header`, an
 * AppShellHeader: the navigation row its `leading` (Leading-Slots without the toggle AppShell draws), `center` and
 * `actions` (a named Avatar at their end is the account); a PageHeader row its `main`, the other rows `sections`. The
 * page frame's layers are the children (Body's padding kept in a Stack), then the layers after the page (an ActionBar);
 * a layer pinned outside the auto layout is the floating action.
 */
function appShellElement(node, ctx) {
  const layers = node.children ?? [];
  if (node.type === "INSTANCE" || node.layout?.mode !== "HORIZONTAL" || layers.length < 2 || layers.length > 3) return null;
  const sidebarNode = instanceIn(layers[0], "Sidebar", ctx);
  const column = layers[1];
  const asideNode = layers[2] ? instanceIn(layers[2], "SidePanel", ctx) : null;
  if (!sidebarNode || column.type === "INSTANCE" || column.layout?.mode !== "VERTICAL" || (layers[2] && !asideNode)) return null;
  const [headerNode, ...rest] = column.children ?? [];
  const props = { sidebar: { kind: "element", node: convert(sidebarNode, ctx) } };
  let after = rest;
  const appHeader = appShellHeaderNode(headerNode);
  if (appHeader) {
    // The header as Figma's Header/AppShell (pushed since 2026-10-21): its Collapse Button is the AppShell's toggle.
    const header = appShellHeaderElement(appHeader, ctx);
    if (Object.keys(header.element.props).length) props.header = { kind: "element", node: header.element };
    // No toggle in the header: the Side-Bar's own Collapse Button is collapse="sidebar", neither is "none".
    const sideBar = sidebarPattern(sidebarNode)?.inner ?? sidebarNode;
    if (!header.collapse) props.collapse = literal(sideBar.props?.["Collapse Button"] === true ? "sidebar" : "none");
  } else {
    // The Dashboard header rows pushed before it: the navigation row first.
    if (!isNavigation((headerNode ? rowsIn(headerNode) : [])[0], ctx)) return null;
    const rows = headerNode ? rowsIn(headerNode) : [];
    const headerProps = {};
    const nav = rows[0];
    const slotOf = (name) => (nav.slots ?? []).find((slot) => slot.name === name);
    // Top bar: Leading-Slots without the toggle (AppShell draws it; a design without one says collapse="none").
    const leadingSlot = slotOf("Leading-Slots");
    const leading = (leadingSlot?.children ?? []).map((child) => convert(child, ctx)).filter(Boolean);
    if (leading[0]?.name === "IconButton" && TOGGLE_ICON.test(leading[0].props.icon?.value ?? "")) leading.shift();
    else props.collapse = literal("none");
    const header = oneOf(leading, { name: "Leading-Slots", layout: leadingSlot?.layout, source: leadingSlot }, ctx);
    if (header) headerProps.leading = { kind: "element", node: unpadded(header) };
    const centerSlot = nav.props?.["Nav-Center-Block"] === false ? null : slotOf("Center-Slots");
    const center = centerSlot ? oneOf((centerSlot.children ?? []).map((child) => convert(child, ctx)).filter(Boolean), { name: "Center-Slots", layout: centerSlot.layout, source: centerSlot }, ctx) : null;
    if (center) headerProps.center = { kind: "element", node: center };
    const trailingSlot = slotOf("Trailing-Slots");
    // The account: an Avatar named after the person at the end of the actions (the push names it so).
    const trailing = headerActions(trailingSlot?.children ?? [], ctx);
    const actions = oneOf(trailing, { name: "Trailing-Slots", layout: trailingSlot?.layout, source: trailingSlot }, ctx);
    if (actions) headerProps.actions = { kind: "element", node: actions };
    // Sections: Header/Dashboard's other rows, or the push's Sections frame.
    const sectionNodes = rows.slice(1);
    if (after[0]?.type === "FRAME" && after[0].name === "Sections") { sectionNodes.push(...(after[0].children ?? [])); after = after.slice(1); }
    const rowElements = sectionNodes.map((row) => unpadded(convert(row, ctx))).filter(Boolean);
    // The Main row: the first PageHeader; the rows after it are the section rows.
    const sections = rowElements[0]?.name === "PageHeader" ? rowElements.slice(1) : rowElements;
    if (rowElements[0]?.name === "PageHeader") headerProps.main = { kind: "element", node: rowElements[0] };
    if (sections.length) headerProps.sections = { kind: "element", node: sections.length === 1 ? sections[0] : { kind: "element", name: "Stack", props: { gap: literal("none") }, children: sections } };
    if (Object.keys(headerProps).length) props.header = { kind: "element", node: { kind: "element", name: "AppShellHeader", props: headerProps, children: [] } };
  }
  // The page: the next frame's layers (Body's padding kept in a Stack around them); pinned layers are the floating action.
  const pinned = [];
  let children = [];
  const pageNode = after.find((part) => !part.absolute && part.type !== "INSTANCE" && part.type !== "TEXT");
  if (pageNode) {
    // The master layout's Body: the page is its Content slot's layers, Floating-Actions › Floating-Item the floating action.
    const bodyLayers = (pageNode.children ?? []).flatMap((child) => {
      if (child.name === "Floating-Actions") { pinned.push(child); return []; }
      return child.type === "SLOT" && child.name === "Content" ? child.children ?? [] : [child];
    });
    const inside = bodyLayers.filter((child) => (child.absolute ? (pinned.push(child), false) : true));
    const elements = inside.map((child) => convert(child, ctx)).filter(Boolean);
    const padding = pageNode.layout?.padding ?? [];
    // AppShell's Body pads Margin-Comfortable and spaces the page Gap/XSmall (app-shell.css): a Body padded so keeps a
    // Stack only for what else it does (its gap, its alignment), never the padding (the page would be padded twice).
    const asBody = pageNode.layout?.paddingVar === "Margin-Comfortable";
    const { padding: _padding, paddingVar: _paddingVar, paddingVars: _paddingVars, ...unpaddedLayout } = pageNode.layout ?? {};
    const own = asBody ? { ...pageNode, layout: unpaddedLayout } : pageNode;
    const bodyAsIs = asBody && (pageNode.layout?.gap ?? 0) === 8 && !["CENTER", "MAX"].includes(pageNode.layout?.counter);
    children = padding.some(Boolean) && !bodyAsIs ? [frameElement({ ...own, children: inside }, elements, ctx)] : elements;
  }
  const footer = after.filter((part) => part !== pageNode && !(part.absolute && pinned.push(part)) && after.indexOf(part) > after.indexOf(pageNode)).map((part) => convert(part, ctx)).filter(Boolean);
  // A desktop task's ActionBar is the page's last child (AppShell has no footer).
  children.push(...footer);
  if (pinned.length) {
    const { absolute, ...floating } = innermost(pinned[0]);
    const element = convert(floating, ctx);
    if (element) props.floatingActions = { kind: "element", node: element };
    if (pinned.length > 1) ctx.notes.push(`AppShell "${node.name}": ${pinned.length} layers sit outside the auto layout; the first is the floating action, the others are left out`);
  }
  if (asideNode) props.sidePanel = { kind: "element", node: convert(asideNode, ctx) };
  return { kind: "element", name: "AppShell", props, children };
}

/* ── phone AppShell (Pattern/AppShell/Mobile) ─────────────────────────────────────────────────────────────────── */

/** Figma's phone app frame (figma-push.mjs MOBILE_SHELL_SET, mobileShellNode: the other way). */
const MOBILE_SHELL = "Pattern/AppShell/Mobile";
/** Figma's ActionBar (Action-Bar/Mobile, 16326:6489): the phone pattern's bottom actions, or one standing alone. */
const ACTION_BAR = "Action-Bar/Mobile";
/**
 * Each Top option of the pattern: AppShell's `mobileTop`, and the layers holding its Top-Navigation, the page (Content),
 * the hero and the backdrop (figma-push.mjs MOBILE_SHELL_TOP).
 */
const MOBILE_SHELL_TOPS = {
  Bar: { top: "bar", nav: ["Top-Navigation"], content: ["Body"] },
  Band: { top: "band", nav: ["Band", "Top-Navigation"], content: ["Body"], hero: ["Band"] },
  "Band-Sheet": { top: "band-sheet", nav: ["Stage", "Top-Navigation"], content: ["Stage", "Sheet"], hero: ["Stage"] },
  Media: { top: "media", nav: ["Stage", "Top-Navigation"], content: ["Stage", "Sheet"], backdrop: ["Stage"] },
};
/** The band's paint → AppShell `band` (figma-push mobileShellNode; Figma's own Support/Brand/Subtle is the default). */
const MOBILE_BAND_OF = { "Background/Support/Brand/Pale": "pale", "Background/Support/Brand/Soft": "soft", "Background/Accent/Solid/Default": "accent" };
/** The pattern's fill → AppShell `canvas` (Canvas/Default is the pattern's own). */
const MOBILE_CANVAS_OF = { "Background/Canvas/Alt": "alt", "Background/Canvas/Flat": "flat" };
/** The bar AppShell gives its TopNavigation on each canvas (AppShell.tsx BAR_TYPE): a pulled bar of that type says nothing. */
const MOBILE_BAR_TYPE = { default: "alt", alt: "default", flat: "default" };
const sameLayers = (within, layers) => {
  const list = Array.isArray(within) ? within : within ? [within] : [];
  return list.length === layers.length && layers.every((name, index) => list[index] === name);
};

/**
 * Figma's Action-Bar/Mobile as ActionBar (figma-push.mjs actionBarParts, the other way): Type Glass is the glass surface;
 * its Actions Dual has a secondaryAction, Direction Horizontal the horizontal bar (Tertiary then Primary; Vertical puts
 * Primary first); each Button's words its label, its Level its level, its Leading-Icon its startIcon. `part`: the
 * pattern's Action-Bar (partOf) or a standalone instance; its nested paths start at its Actions.
 */
function actionBarElement(part, ctx) {
  const nested = part.nested ?? [];
  const actions = nested.find((entry) => entry.path === "Actions")?.props ?? {};
  const props = {};
  if (part.props?.Type === "Glass") props.surface = literal("glass");
  const horizontal = actions.Direction === "Horizontal";
  if (horizontal) props.direction = literal("horizontal");
  // A Button at its role's own level (ActionBar.tsx: primary, tertiary) says nothing.
  const action = (index, role) => {
    const button = nested.find((entry) => entry.path === `Actions/Button[${index}]`);
    if (!button) return null;
    const fields = {};
    const label = button.text ?? button.texts?.Label ?? button.texts?.Text;
    if (typeof label === "string" && label) fields.label = literal(label);
    const level = typeof button.props?.Level === "string" ? button.props.Level.toLowerCase() : null;
    if (level && level !== role) fields.level = literal(level);
    const icon = button.props?.["Leading-Icon"] === true ? button.props["Leading-Icon-Src"] : null;
    if (typeof icon === "string" && isZenIcon(icon, ctx.mapping)) fields.startIcon = { kind: "element", node: { kind: "element", name: "Icon", props: { name: literal(icon), decorative: literal(true) }, children: [] } };
    return fields.label ? { kind: "object", fields } : null;
  };
  const dual = actions.Button === "Dual";
  const [primary, secondary] = dual ? (horizontal ? [action(1, "primary"), action(0, "tertiary")] : [action(0, "primary"), action(1, "tertiary")]) : [action(0, "primary"), null];
  if (!primary) { ctx.notes.push(`ActionBar "${part.name ?? ACTION_BAR}": its button has no words, left out`); return null; }
  props.primaryAction = primary;
  if (secondary) props.secondaryAction = secondary;
  return { kind: "element", name: "ActionBar", props, children: [] };
}

/**
 * Figma's Pattern/AppShell/Mobile as AppShell (figma-push.mjs mobileShellNode, the other way): its Top is `mobileTop`;
 * the Top-Navigation at that Top's place is `topNavigation` (its type left unsaid when it is the one AppShell gives that
 * top on that canvas); Bottom Tab-Bar or Floating is the Bottom-Navigation as `bottomNavigation`, Actions the Action-Bar
 * as `actionBar`; the Content slot is the page, the Hero and Backdrop slots (when shown) `hero` and `backdrop`; the
 * band's paint is `band`, the pattern's fill `canvas`. Null for another layer.
 */
function mobileShellElement(node, ctx) {
  if (node.type !== "INSTANCE" || node.set?.name !== MOBILE_SHELL) return null;
  const look = node.props ?? {};
  const place = MOBILE_SHELL_TOPS[look.Top] ?? MOBILE_SHELL_TOPS.Bar;
  const props = {};
  if (place.top !== "bar") props.mobileTop = literal(place.top);
  const edits = node.edits ?? [];
  // A variable's name as the push writes it (a read gives its collection group too: Color/Background/…).
  const paint = (name) => String(name ?? "").replace(/^Color\//, "");
  const bandLayer = place.hero ?? place.backdrop;
  const band = bandLayer && place.top !== "media" ? MOBILE_BAND_OF[paint(edits.find((edit) => edit.fill && sameLayers(edit.layer, bandLayer))?.fill)] : undefined;
  if (band) props.band = literal(band);
  const canvas = MOBILE_CANVAS_OF[paint(node.fill)];
  if (canvas) props.canvas = literal(canvas);
  if (look["Top-Navigation"] !== false) {
    const top = convert(partOf(node, place.nav.join("/"), place.nav, TOP_NAV_SET), ctx);
    if (top?.name === "TopNavigation") {
      const given = place.top === "bar" ? MOBILE_BAR_TYPE[canvas ?? "default"] : place.top === "media" ? "liquid-overlay" : band === "accent" ? "transparent-on-color" : "transparent";
      if (top.props.type?.value === given) delete top.props.type;
      props.topNavigation = { kind: "element", node: top };
    } else if (top) ctx.notes.push(`AppShell "${node.name}": the Top-Navigation read as <${top.name}>, left out`);
  }
  if (look.Bottom === "Actions") {
    const bar = actionBarElement(partOf(node, "Action-Bar", ["Action-Bar"], { name: ACTION_BAR }), ctx);
    if (bar) props.actionBar = { kind: "element", node: bar };
  } else if (look.Bottom === "Tab-Bar" || look.Bottom === "Floating") {
    const fallback = { name: look.Bottom === "Floating" ? "Bottom-Navigation/Mobile/Floating" : "Bottom-Navigation/Mobile/Default" };
    const bottom = convert(partOf(node, "Bottom-Navigation", ["Bottom-Navigation"], fallback), ctx);
    if (bottom?.name === "BottomNavigation") props.bottomNavigation = { kind: "element", node: bottom };
  }
  const slotAt = (name, layers) => (node.slots ?? []).find((slot) => slot.name === name && sameLayers(slot.within, layers));
  for (const [prop, name] of [["hero", "Hero"], ["backdrop", "Backdrop"]]) {
    const layers = place[prop];
    if (!layers || edits.some((edit) => edit.visible === false && sameLayers(edit.layer, [...layers, name]))) continue;
    const slot = slotAt(name, layers);
    const element = oneOf((slot?.children ?? []).map((child) => convert(child, ctx)).filter(Boolean), { name, layout: slot?.layout, source: slot }, ctx);
    if (element) props[prop] = { kind: "element", node: element };
  }
  const content = slotAt("Content", place.content);
  const children = (content?.children ?? []).map((child) => convert(child, ctx)).filter(Boolean);
  if (look["Floating-Actions"] === true) ctx.notes.push(`AppShell "${node.name}": Floating-Actions on: the phone pattern's floating actions are not read yet`);
  return { kind: "element", name: "AppShell", props, children };
}

/** Figma's ◇ Master-Layout page pattern and the Sidebar pattern in it (figma-push.mjs MASTER_LAYOUT_SET). */
const MASTER_LAYOUT = "Patterns/Pages/Density-Medium";
/** Figma Patterns/Sidebar (6040:67524), renamed from "Patterns/Sidebar/Density-Medium" on 2026-10-21. */
const MASTER_SIDEBAR_PATTERN = "Patterns/Sidebar";
/** An instance's own writes the push placed under `path` of `owner` (its nested entries, its slots `within` starting with
 *  `layers`), at its own root again: the part as an instance of its own. */
function partOf(owner, path, layers, fallbackSet) {
  const nested = owner.nested ?? [];
  const own = nested.find((entry) => entry.path === path) ?? {};
  const prefix = `${path}/`;
  return {
    type: "INSTANCE", name: own.name ?? path, set: own.set ?? fallbackSet, props: own.props ?? {},
    ...(own.text !== undefined ? { text: own.text } : {}), ...(own.texts ? { texts: own.texts } : {}), ...(own.topNav ? { topNav: own.topNav } : {}),
    nested: nested.filter((entry) => entry.path.startsWith(prefix)).map((entry) => ({ ...entry, path: entry.path.slice(prefix.length) })),
    slots: (owner.slots ?? []).filter((slot) => Array.isArray(slot.within) && layers.every((name, i) => slot.within[i] === name)).map((slot) => {
      const rest = slot.within.slice(layers.length);
      const { within, ...bare } = slot;
      return rest.length ? { ...bare, within: rest.length === 1 ? rest[0] : rest } : bare;
    }),
  };
}

/** Patterns/Sidebar's Theme → Sidebar.tsx theme (figma-push.mjs SIDEBAR_PATTERN_THEME, the other way). */
const SIDEBAR_THEME_OF = { Border: "border", Borderless: "borderless", Carved: "carved", "Carved-Floating": "carved-floating" };
/**
 * Figma's Patterns/Sidebar around its Side-Bar → { inner, props }: the Side-Bar and the pattern's variant. A placed one
 * comes as a composition frame (readInstance), the push's as an instance with the Side-Bar's writes nested in it
 * (figma-push.mjs sidebarPatternNode). Null for anything else.
 */
function sidebarPattern(node) {
  if (node?.type === "FRAME" && node.composition === MASTER_SIDEBAR_PATTERN) {
    const shown = (node.children ?? []).filter((child) => child.visible !== false);
    return shown.length === 1 && shown[0].type === "INSTANCE" ? { inner: shown[0], props: node.compositionProps ?? {} } : null;
  }
  if (node?.type !== "INSTANCE" || node.set?.name !== MASTER_SIDEBAR_PATTERN) return null;
  const props = node.props ?? {};
  const layer = `Patterns/Density/Comfortable/Sidebar/${props.Expand === "No" ? "No" : "Yes"}`;
  // The Side-Bar's hidden layers: the pattern's edits inside it.
  const hide = (node.edits ?? []).filter((edit) => edit.visible === false && Array.isArray(edit.layer) && edit.layer.length === 2 && edit.layer[0] === layer).map((edit) => edit.layer[1]);
  const inner = partOf(node, "Patterns", [layer], { name: "Side-Bar/Master/Basic" });
  return { inner: { ...inner, name: node.name === MASTER_SIDEBAR_PATTERN ? "Side-Bar/Master/Basic" : node.name, ...(hide.length ? { hide } : {}) }, props };
}
/** A Sidebar's theme, density and shadow from its Patterns/Sidebar variant (Shadow=No on the Default theme only: the
 *  other themes' Shadow is the one variant Figma has). */
function sidebarLookProps(props) {
  const out = {};
  if (SIDEBAR_THEME_OF[props.Theme]) out.theme = literal(SIDEBAR_THEME_OF[props.Theme]);
  if (props.Density === "Small") out.density = literal("small");
  if (props.Shadow === "No" && (props.Theme ?? "Default") === "Default") out.shadow = literal(false);
  return out;
}

/**
 * Figma's ◇ Master-Layout as the push writes it (figma-push.mjs masterLayoutNode: an instance of Patterns/Pages/
 * Density-Medium with nested writes and slots) in the shape appShellElement reads, the one a placed master gives the
 * read (Patterns/… is a composition): the Side-Bar its Sidebar pattern holds, a column of Header/Dashboard's rows and
 * Body (the Content slot's layers; Floating-Item's action pinned), the Side-Panel. Null for another instance.
 */
function masterLayoutFrame(node) {
  if (node.type !== "INSTANCE" || node.set?.name !== MASTER_LAYOUT) return null;
  const props = node.props ?? {};
  const nested = node.nested ?? [];
  const slots = node.slots ?? [];
  const firstOf = (slot) => (Array.isArray(slot.within) ? slot.within[0] : slot.within);
  const slotNamed = (name) => slots.find((slot) => slot.name === name && firstOf(slot) !== MASTER_SIDEBAR_PATTERN && firstOf(slot) !== HEADER_APPSHELL);
  const partAt = (path, layers, fallbackSet) => partOf(node, path, layers, fallbackSet);
  const layers = [];
  if (props.Sidebar !== false) {
    const sidebarSlot = slots.find((slot) => firstOf(slot) === MASTER_SIDEBAR_PATTERN);
    const inner = sidebarSlot ? sidebarSlot.within.slice(0, 2) : [MASTER_SIDEBAR_PATTERN, "Patterns/Density/Comfortable/Sidebar/Yes"];
    // The Side-Bar's hidden layers: the master's edits inside it.
    const hide = (node.edits ?? []).filter((edit) => edit.visible === false && Array.isArray(edit.layer) && edit.layer.length === inner.length + 1 && inner.every((name, i) => edit.layer[i] === name)).map((edit) => edit.layer[inner.length]);
    const side = { ...partAt("Patterns/Patterns", inner, { name: "Side-Bar/Master/Basic" }), ...(hide.length ? { hide } : {}) };
    // In its pattern, whose variant gives the Sidebar's theme, density and shadow (sidebarPattern).
    layers.push({ type: "FRAME", name: MASTER_SIDEBAR_PATTERN, composition: MASTER_SIDEBAR_PATTERN, compositionProps: nested.find((entry) => entry.path === "Patterns")?.props ?? {}, layout: { mode: "VERTICAL" }, children: [side] });
  }
  // The rows as the read gives them: Dashboard header instances (their padding is the master's own).
  const rows = (slotNamed("Sections")?.children ?? []).map(({ padding, paddingVars, ...row }) => row);
  // The header: the master's Header/Dashboard swapped to Header/AppShell (pushed since 2026-10-21), its slots at its own
  // root again; else the Dashboard header rows pushed before it.
  const swapped = nested.find((entry) => entry.path === "Header/Dashboard" && entry.set?.name === HEADER_APPSHELL);
  const headerAt = () => (swapped
    ? { type: "INSTANCE", name: HEADER_APPSHELL, set: swapped.set, props: swapped.props ?? {}, slots: slots.filter((slot) => firstOf(slot) === HEADER_APPSHELL).map(({ within, ...slot }) => ({ ...slot, ...(within.length > 1 ? { within: within.slice(1) } : {}) })) }
    : { type: "FRAME", name: "Header/Dashboard", layout: { mode: "VERTICAL" }, children: rows });
  const floating = slotNamed("Floating-Item")?.children?.[0];
  layers.push({
    type: "FRAME", name: "Main-Container", layout: { mode: "VERTICAL" },
    children: [
      headerAt(),
      { type: "FRAME", name: "Body", layout: { mode: "VERTICAL", padding: [0, 0, 0, 0] }, children: slotNamed("Content")?.children ?? [] },
      ...(floating ? [{ ...floating, absolute: { cx: "MAX", cy: "MAX" } }] : []),
    ],
  });
  if (props["Side-Panel"]) layers.push(partAt("Side-Panel", ["Side-Panel"], { name: "Side-Panel" }));
  return { type: "FRAME", id: node.id, key: node.key, name: node.name, layout: { mode: "HORIZONTAL" }, children: layers };
}

/**
 * A frame's, shape's or text's own name back from Figma (layer-meta.mjs data-name): kept when it is not one Figma or the
 * push gives by itself (Frame 3, Stack, Rectangle, the layer's words, a value it already carries as a prop).
 */
function givenName(element, node) {
  // An instance whose name the person gave names its own element (instanceName), not a frame that places it.
  if (element.kind !== "element" || !FIGMA_NAMED.has(element.name) || element.props[NAME_PROP] || node.nameGiven) return;
  // A text layer names its Text, not the Stack that places it (an absolute text's wrapper).
  if (node.type === "TEXT" && element.name !== "Text") return;
  const name = typeof node.name === "string" ? node.name.trim() : "";
  if (!name || name === element.name || name === node.set?.name || isAutomaticName(name, element)) return;
  // A frame the push named by its code (Box, Stack, Grid) may come back as another of them (a filled frame that lays its
  // layers out is one Stack, decision 2): still its automatic name.
  if (LAYOUT_FRAMES.has(element.name) && LAYOUT_FRAMES.has(name)) return;
  if (Object.values(element.props).some((value) => value?.kind === "literal" && value.value === name)) return;
  element.props[NAME_PROP] = { kind: "literal", value: name };
}

/**
 * An instance's own name back from Figma (layer-meta.mjs data-name), the accessible name first (user 2026-10-23): one the
 * Zen plugin placed gives its name when the push wrote the person's data-name there or it was renamed in Figma since
 * (nameGiven); an icon button's name is its aria-label (above), never its data-name. Other instance names are their
 * component's, their content or the library's own layer names ("Item", "Action"): left alone. A component Figma pads
 * sits in the Stack that takes its padding (padded): the component takes the name.
 */
function instanceName(element, node, ctx) {
  if (!node.nameGiven || element?.kind !== "element") return;
  const own = element.name === "Stack" && element.children?.length === 1 && PADDED.has(element.children[0].name) ? element.children[0] : element;
  if (own.props[NAME_PROP] || NEEDS_NAME.has(own.name)) return;
  const name = typeof node.name === "string" ? node.name.trim() : "";
  if (!name || name === own.name || name === node.set?.name) return;
  if (node.local && name === ctx.local?.names.get(ctx.local.ids.get(node.local))) return;
  own.props[NAME_PROP] = literal(name);
}

/** Each element's Figma layer: its parent reads its Fill container from it. */
const SOURCE = new WeakMap();
/** A layer bound to a component property (figma-push propRefs and slot, the other way): its data-prop-* attribute. */
const BINDING_PROP = { characters: "data-prop-text", visible: "data-prop-visible", mainComponent: "data-prop-swap" };
function bindings(element, node) {
  if (element?.kind !== "element") return;
  for (const [field, name] of Object.entries(node.propRefs ?? {})) if (BINDING_PROP[field]) element.props[BINDING_PROP[field]] = literal(name);
  const slot = node.slot ?? (node.type === "SLOT" ? node.name : null);
  if (slot) element.props["data-prop-slot"] = literal(slot);
}
function convert(node, ctx) {
  let element = convertNode(node, ctx);
  // A Zen instance's own opacity and blend (Figma's Appearance): `opacity` / `blendMode` on it, as a frame's
  // (instance-look.mjs; the code draws them on its style).
  if (element && node.type === "INSTANCE" && !node.local && takesInstanceLook(element.name)) {
    if (typeof node.opacity === "number" && node.opacity < 1) element.props.opacity = literal(Math.round(node.opacity * 100));
    const blend = zenBlendOf(node.blendMode, true);
    if (blend) element.props.blendMode = literal(blend);
  }
  bindings(element, node);
  if (element && node.type === "INSTANCE") instanceName(element, node, ctx);
  if (element && !element.id) { const id = idOf(node, ctx); if (id) element.id = id; }
  // The layer's own element (not a wrapper that places it): an instance's overrides find its main's layers by it.
  if (element && ctx.innerOf) ctx.innerOf.set(node, element);
  // Fix position when scrolling (figma-push sticky): a Zen frame's Fixed is sticky by the edge it pins to (bottom: Figma
  // pins it out of the auto layout, the code keeps it in flow); Sticky is sticky="top", in flow. Other layers keep
  // their absolute place.
  if (element && node.scrollBehavior === "FIXED" && STICKY_ELEMENTS.has(element.name) && !node.absolute?.free) {
    element.props.sticky = literal(node.absolute?.cy === "MAX" ? "bottom" : "top");
  } else if (element && node.absolute) element = positioned(element, node, ctx);
  if (element && node.scrollBehavior === "STICKY_SCROLLS" && STICKY_ELEMENTS.has(element.name) && !element.props.position) element.props.sticky = literal("top");
  if (element && !SOURCE.has(element)) SOURCE.set(element, node);
  return element;
}

/** The layers that take `sticky` (Layout/position.ts), as figma-push's STICKY_FRAMES. */
const STICKY_ELEMENTS = new Set(["Stack", "Grid", "Box", "Shape"]);

/**
 * A layer Figma places outside the auto layout (Ignore auto layout): position="absolute" with its constraints and the
 * insets to its pinned edges (Spacing/Padding steps). A Text or a component is wrapped in a Stack that takes them.
 */
function positioned(element, node, ctx) {
  const box = node.absolute;
  // A Shape takes its own position props, in px: Figma's X / Y (its unrotated box, as Shape turns about its centre); so
  // does a group, or a frame placed in a frame without auto layout (free px insets, F3).
  // A Zen group pinned out of an auto layout (⌘G on floating layers) keeps px X / Y as well.
  const group = element.name === "Box" && element.props.group?.value === true;
  if (element.name === "Shape" || group || (box.free && ["Box", "Stack", "Grid"].includes(element.name))) {
    const shape = node.shape ?? {};
    const turn = ((shape.rotation ?? 0) * Math.PI) / 180;
    const w = shape.w ?? box.w;
    const h = element.props.type?.value === "line" || element.props.type?.value === "arrow" ? 0 : shape.h ?? box.h;
    // Figma's X / Y is where the turned (and mirrored, Zen flip) box's own corner lands: its centre is that corner plus
    // the half box through the same transform.
    const mirror = shape.flip === "horizontal" ? -1 : 1;
    const centre = { x: box.x + mirror * Math.cos(turn) * (w / 2) + Math.sin(turn) * (h / 2), y: box.y - mirror * Math.sin(turn) * (w / 2) + Math.cos(turn) * (h / 2) };
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
  // A text or a component in a free frame: the Studio's float wrapper (position/float.ts), a Box at its px X / Y.
  if (box.free) {
    const wrap = { position: literal("absolute"), ...(x !== "left" ? { constraintX: literal(x) } : {}), ...(y !== "top" ? { constraintY: literal(y) } : {}) };
    const round2 = (value) => Math.round(value * 100) / 100;
    if (x === "left" || x === "left-right") wrap.insetLeft = literal(round2(box.x));
    if (x === "right" || x === "left-right") wrap.insetRight = literal(round2(box.pw - box.x - box.w));
    if (y === "top" || y === "top-bottom") wrap.insetTop = literal(round2(box.y));
    if (y === "bottom" || y === "top-bottom") wrap.insetBottom = literal(round2(box.ph - box.y - box.h));
    return { kind: "element", ...(idOf(node, ctx, "place") ? { id: idOf(node, ctx, "place") } : {}), name: "Box", props: wrap, children: [element] };
  }
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
  // ChartCard's own default is Default (the Card's is Shadow).
  if (theme && !(theme.kind === "literal" && theme.value === "default")) props.theme = theme;
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
 * type (a LINE with an arrow cap, or Figma's arrow: a two-vertex VECTOR capped at its end, is an arrow), px size, fill and stroke by their variables (a colour that is no Zen
 * Background / Border variable is left at the default and noted), arc, count, ratio, corner radius variable, rotation
 * and opacity; Figma's defaults are left out, as the push leaves them out.
 */
function shapeElement(node, ctx) {
  const shape = node.shape;
  const where = `"${node.name}"`;
  const arrow = (node.type === "LINE" && typeof shape.cap === "string" && /ARROW/.test(shape.cap)) || (node.type === "VECTOR" && shape.arrowLine === true);
  const type = { RECTANGLE: "rectangle", ELLIPSE: "ellipse", LINE: arrow ? "arrow" : "line", POLYGON: "polygon", STAR: "star", VECTOR: arrow ? "arrow" : "vector", BOOLEAN_OPERATION: "boolean" }[node.type];
  const line = type === "line" || type === "arrow";
  const boolean = type === "boolean";
  // A boolean group writes its result as a vector does (its shapes come along as its children).
  const vector = type === "vector" || boolean;
  // A vector's path: Figma's vectorPaths in the node's px (absolute M / L / Q / C / Z), its box the viewBox.
  const d = vector ? (shape.paths ?? []).map((path) => path.data).join(" ").trim() : "";
  if (vector && !parseVectorPath(d)) { ctx.notes.push(`${where}: its vector path is not one Zen reads (${d ? "commands other than M / L / Q / C / Z" : "no path"}); left out`); return null; }
  const props = { type: literal(type), width: literal(round2(shape.w)) };
  if (!line) props.height = literal(round2(shape.h));
  if (boolean && shape.operation && shape.operation !== "UNION") props.operation = literal(String(shape.operation).toLowerCase());
  if (vector) {
    props.d = literal(d);
    props.viewBox = literal(`0 0 ${round2(shape.w)} ${round2(shape.h)}`);
    if ((shape.paths ?? []).some((path) => path.windingRule === "EVENODD")) props.fillRule = literal("evenodd");
  }
  const paint = (prop, value, map, fallback) => {
    if (value === null || value === undefined) { if (fallback !== "none") props[prop] = literal("none"); return; }
    const tone = map.get(value);
    if (tone && tone !== fallback) props[prop] = literal(tone);
    else if (!tone) ctx.notes.push(`${where}: its ${prop} ${value === "unbound" ? "is no colour variable" : `variable ${value} is no Zen ${prop === "fill" ? "Background" : "Border"} colour`}; the default is kept`);
  };
  // An image fill (F8, figma-image.mjs): the picture back by its Studio src; a shape with one has no colour unless given.
  const picture = line ? { props: {}, note: null } : imageFillProps(shape.imageFill, literal);
  Object.assign(props, picture.props);
  if (picture.note) ctx.notes.push(`${where}: ${picture.note}`);
  // A gradient fill (figma-gradient.mjs): its stops back on their colour variables; a shape with one has no colour unless given.
  const graded = line ? { props: {}, notes: [] } : gradientFillProps(shape.gradientFill, literal);
  Object.assign(props, graded.props);
  for (const note of graded.notes) ctx.notes.push(`${where}: ${note}`);
  paint("fill", line ? null : shape.fill, FILL_OF, line || (vector && !boolean) || shape.imageFill || graded.props.gradient ? "none" : DEFAULT_SHAPE_FILL);
  paint("stroke", shape.stroke, STROKE_OF, line || (vector && !boolean) ? DEFAULT_LINE_STROKE : "none");
  if (shape.stroke && shape.strokeWeight !== 1) props.strokeWeight = literal(round2(shape.strokeWeight));
  if (shape.stroke && !line && shape.strokeAlign && shape.strokeAlign !== (vector && !boolean ? "CENTER" : "INSIDE")) props.strokeAlign = literal(shape.strokeAlign.toLowerCase());
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
    // Corner smoothing: Figma's 0–1 as the code's % (the read's `smoothing`, the push's `cornerSmoothing`).
    const smoothing = shape.smoothing ?? node.cornerSmoothing;
    if (typeof smoothing === "number" && smoothing > 0) props.cornerSmoothing = literal(Math.round(smoothing * 100));
  }
  if (shape.rotation) props.rotation = literal(shape.rotation);
  if (shape.flip) props.flip = literal(shape.flip);
  if (typeof shape.opacity === "number" && shape.opacity < 1) props.opacity = literal(Math.round(shape.opacity * 100));
  if (zenBlendOf(shape.blendMode, false)) props.blendMode = literal(zenBlendOf(shape.blendMode, false));
  const children = boolean ? (node.children ?? []).map((child) => convert(child, ctx)).filter((child) => child?.name === "Shape") : [];
  return { kind: "element", name: "Shape", props, children };
}

function convertNode(node, ctx) {
  const { mapping, notes } = ctx;
  if (!node) return null;
  // Figma's Pattern/AppShell/Mobile: a phone AppShell with its bars; Action-Bar/Mobile on its own: an ActionBar.
  const phoneShell = mobileShellElement(node, ctx);
  if (phoneShell) return phoneShell;
  if (node.type === "INSTANCE" && node.set?.name === ACTION_BAR) return actionBarElement(node, ctx);
  // Figma's ◇ Master-Layout written by the push: AppShell (the read of a placed one comes as frames, below).
  const master = masterLayoutFrame(node);
  if (master) { const shell = appShellElement(master, ctx); if (shell) return shell; }
  // Figma's Header/AppShell on its own: AppShellHeader with its slots.
  const appHeader = appShellHeaderNode(node);
  if (appHeader) return appShellHeaderElement(appHeader, ctx).element;
  // Figma's Patterns/Sidebar: the Sidebar it holds, with the pattern's theme, density and shadow.
  const pattern = sidebarPattern(node);
  if (pattern && codeOf(pattern.inner, ctx) === "Sidebar") {
    const sidebar = convertNode(pattern.inner, ctx);
    if (sidebar?.name === "Sidebar") return { ...sidebar, props: { ...sidebar.props, ...sidebarLookProps(pattern.props) } };
  }
  if (node.shape) return shapeElement(node, ctx);
  if (DRAWINGS.has(node.type)) { ctx.drawings.push(node.name); return null; }
  // A page's own components (figma-push localModel, the other way): a set of variants, a main, an instance of either.
  if (node.type === "COMPONENT_SET") return componentSetElement(node, ctx);
  if (node.type === "COMPONENT") return componentElement(node, ctx);
  if (node.type === "INSTANCE" && node.local) return useElement(node, ctx);
  if (node.type === "TABLE") return tableElement(node, ctx);
  if (node.type === "SHEET") return sheetElement(node, ctx);
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
    // Words with styles of their own (Figma's mixed styles) are TextRuns inside the Text (text-runs.mjs).
    if (Array.isArray(node.segments) && node.segments.length) {
      const base = props.textStyle?.value ?? (level ? HEADING_STYLE[level] : "Body/Base/Regular");
      const toneOf = (fill) => TONE_OF.get(String(fill).replace(/^Color\//, "")) ?? null;
      const known = (style) => !mapping.textStyles || mapping.textStyles.has(style);
      const runs = runsFromSegments(characters, node.segments, { base, baseFill: node.fill ?? null, toneOf, known });
      runs.notes.forEach((note) => notes.push(`Text "${node.name ?? node.characters}": ${note}`));
      return { kind: "element", name: level ? "Heading" : "Text", props, children: runs.children };
    }
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
    // A component sized like a layout layer (Card, ListBox: sizing.ts) resized to a fixed width (the read gives it when
    // it is not its main's; the push writes it): its width.
    if (typeof node.fixedWidth === "number" && mapping.apiProps[set.code]?.has("width") && !props.width) props.width = literal(node.fixedWidth);
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
    // A workspace Side-Bar's panel slots (Child-…) are the Sidebar's own (figma-push WORKSPACE_SLOTS).
    if (set.code === "Sidebar") for (const slot of node.slots ?? []) slot.name = FROM_WORKSPACE_SLOT[slot.name] ?? slot.name;
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
        if (set.code === "BottomNavigation") bottomNavLook(rowsOf(slot.children ?? []), props, node.set?.name ?? "", ctx);
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
    // A PropertyField's value is its nested Value's Type, State and layers (figma-property.mjs): the cell element.
    if (set.code === "PropertyField") {
      // `label` is required in code: Figma's own default ("Status") is still the row's label.
      if (!props.label && typeof node.props?.Label === "string") {
        const rest = { ...props };
        for (const key of Object.keys(props)) delete props[key];
        Object.assign(props, { label: literal(node.props.Label) }, rest);
      }
      const cell = propertyValueElement(node, literal);
      children = [cell.element];
      for (const note of cell.notes) notes.push(`${where}: ${note}`);
    }
    // BadgeStatus' progress: its ring's Progress arc where the page changed it (figma-property.mjs); its label is its
    // children only where it is not the status' own word in Figma ("In Review").
    if (set.code === "BadgeStatus") {
      const progress = changedProgress(node, "Leading");
      if (progress !== null) props.progress = literal(progress);
      const own = BADGE_STATUS[props.status?.value ?? "to-do"];
      if (children.length === 1 && children[0].kind === "text" && children[0].value === own) children = [];
    }
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
    // An Avatar's Status layer: its .Primitives/Avatar/Status option is the status (figma-push writes it there).
    const avatarDot = set.code === "Avatar" && props.status?.value === true ? (node.nested ?? []).find((nested) => nested.path === "Status") : null;
    const dotStatus = String(avatarDot?.props?.Status ?? "").toLowerCase();
    if (["disabled", "pending", "inactive"].includes(dotStatus)) props.status = literal(dotStatus);
    const metric = METRIC_SET.test(setName);
    if (metric) metricParts(node, props, ctx);
    // A File-Item's Help-Text and Progress-Bar are its file's error and progress, a date picker's heading its title, a
    // chat message's Avatar and reaction pill its author and reactions (read above), a PropertyField's Value its cell
    // (below).
    const ownParts = (nested) => own.nested.has(nested) || (set.code === "Avatar" && nested.path === "Status") || set.code === "UploaderFileItem" || set.code === "DatePickerSheet" || (set.code === "PropertyField" && /^Value(\/|$)/.test(nested.path)) || (set.code === "ChatMessage" && (isAvatar(nested) || /^Bubble(\/|$)/.test(nested.path))) || (metric && /^(Trend|Metric-Icon)(\/|$)/.test(nested.path));
    for (const nested of (node.nested ?? []).filter((nested) => !ownParts(nested))) {
      const inner = nested.set ? mapping.sets.get(nested.set.id) ?? mapping.sets.get(nested.set.name) : null;
      if (!inner) { notes.push(`${where} › ${nested.path}: ${nested.set?.name ?? "?"} has no Zen component`); continue; }
      const path = nestedAlias(set.code, nested.path);
      const fields = instanceProps(nested, inner, mapping, notes, `${set.code} › ${path}`);
      if (Object.keys(fields).length) overrides[path] = { kind: "object", fields };
    }
    // Card's ⋮ Sub-Action shown is its subAction, the icon the Sub-Action's own (Card.tsx draws it so).
    const subAction = set.code === "Card" && node.props?.["Sub-Action"] === true;
    if (subAction) {
      const own = overrides["Sub-Action"];
      const icon = own?.fields.icon?.kind === "literal" ? own.fields.icon.value : undefined;
      // What Card.tsx draws there is no override: the icon, and its Button/Icon-Flat Small Secondary.
      const drawn = { appearance: ["flat"], level: ["secondary"], size: ["sm", "small"] };
      if (own) {
        delete own.fields.icon;
        for (const [name, values] of Object.entries(drawn)) if (own.fields[name]?.kind === "literal" && values.includes(own.fields[name].value)) delete own.fields[name];
        if (!Object.keys(own.fields).length) delete overrides["Sub-Action"];
      }
      props.subAction = subActionFromFigma(icon);
    }
    if (Object.keys(overrides).length) props.overrides = { kind: "object", fields: overrides };
    // A layer Figma shows with a boolean of its name that the code draws only when a prop is set.
    for (const layer of new Set((node.nested ?? []).filter((nested) => !ownParts(nested)).map((nested) => nested.path.split("/")[0]))) {
      if (subAction && layer === "Sub-Action") continue;
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
  // Figma's GROUP: a Zen group (Box group) of its layers at their X / Y inside it, sized to them (figma-push, the other way).
  if (node.type === "GROUP") {
    const { opacity, blendMode } = frameLookProps(node, ctx);
    return { kind: "element", name: "Box", props: { group: literal(true), ...maskProps(node, ctx), width: literal(round2(node.width)), height: literal(round2(node.height)), ...(opacity ? { opacity } : {}), ...(blendMode ? { blendMode } : {}) }, children };
  }
  return frameElement(node, children, ctx);
}

/** Figma's component property types by the page's (figma-push PROPERTY_TYPE, the other way). */
const PROPERTY_KIND = { TEXT: "text", BOOLEAN: "boolean", INSTANCE_SWAP: "swap", SLOT: "slot" };
const valuesObject = (values) => ({ kind: "object", fields: Object.fromEntries(Object.entries(values).map(([name, value]) => [name, literal(value)])) });
/** A Figma id or the Studio id a component came with → its id on the page; any other value as it is (an icon name). */
const pageValue = (value, ctx) => (typeof value === "string" && ctx.local.ids.has(value) ? ctx.local.ids.get(value) : value);

/**
 * The page's components and sets (Figma's COMPONENT / COMPONENT_SET in the frame): their ids on the page (the Studio
 * id a pushed one came with, else one from its name), their properties' defaults and each set's default variant.
 */
function localComponentsOf(frame) {
  const ids = new Map();
  const defaults = new Map();
  const firstVariant = new Map();
  /** Each COMPONENT as drawn, by its id on the page; a set's variants; the name a nested instance's layer takes. */
  const specs = new Map();
  const variants = new Map();
  const names = new Map();
  const taken = new Set();
  const walk = (node, set) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "COMPONENT_SET" || node.type === "COMPONENT") {
      const own = typeof node.local === "string" && node.local && !/^I?\d+:\d+/.test(node.local) ? node.local : null;
      const id = uniqueId(own ?? slug(set ? `${set.name ?? ""} ${node.name ?? ""}` : node.name ?? "component"), taken);
      for (const key of [node.local, node.id]) if (typeof key === "string" && key) ids.set(key, id);
      if (node.type === "COMPONENT_SET") {
        firstVariant.set(id, node.children?.find((child) => child.type === "COMPONENT") ?? null);
        variants.set(id, (node.children ?? []).filter((child) => child.type === "COMPONENT"));
      }
      if (node.type === "COMPONENT") specs.set(id, node);
      names.set(id, set ? set.name ?? id : node.name ?? id);
      if (!set) defaults.set(id, Object.fromEntries((node.properties ?? []).filter((property) => property.default !== undefined).map((property) => [property.name, property.default])));
    }
    for (const child of node.children ?? []) walk(child, node.type === "COMPONENT_SET" ? node : null);
    for (const slot of node.slots ?? []) for (const child of slot.children ?? []) walk(child, null);
  };
  walk(frame, null);
  return { ids, defaults, firstVariant, specs, variants, names };
}

/** A main's or set's description and link. */
const componentAbout = (node) => ({ ...(typeof node.description === "string" && node.description ? { description: literal(node.description) } : {}), ...(typeof node.link === "string" && node.link ? { link: literal(node.link) } : {}) });

/** A set's or lone main's properties: `{ Label: { type: "text", default: "Save" } }`. */
function propertiesValue(properties, ctx) {
  const fields = {};
  for (const property of properties ?? []) {
    const type = PROPERTY_KIND[property.type];
    if (!type) continue;
    const own = { type: literal(type) };
    if (property.default !== undefined) own.default = literal(pageValue(property.default, ctx));
    if (property.preferred?.length) own.preferred = { kind: "array", items: property.preferred.map((value) => literal(pageValue(value, ctx))) };
    fields[property.name] = { kind: "object", fields: own };
  }
  return Object.keys(fields).length ? { kind: "object", fields } : null;
}

const variantValues = (node) => node.variant ?? Object.fromEntries(String(node.name ?? "").split(",").map((pair) => pair.split("=").map((part) => part.trim())).filter((pair) => pair.length === 2 && pair[0]));

/** Figma's component set: `<ComponentSet>` around its variants. */
function componentSetElement(node, ctx) {
  const id = pageValue(node.local ?? node.id, ctx);
  const props = { id: literal(id), name: literal(node.name ?? id), ...componentAbout(node) };
  const properties = propertiesValue(node.properties, ctx);
  if (properties) props.properties = properties;
  const children = (node.children ?? []).filter((child) => child.type === "COMPONENT").map((child) => {
    child.variant ??= variantValues(child);
    return convert(child, ctx);
  }).filter(Boolean);
  return { kind: "element", name: "ComponentSet", props, children };
}

/** A main (a set's variant, or a lone one with its own properties): `<Component>` around its layer. */
function componentElement(node, ctx) {
  const id = pageValue(node.local ?? node.id, ctx);
  const props = { id: literal(id) };
  if (node.variant) props.variant = valuesObject(node.variant);
  else {
    props.name = literal(node.name ?? id);
    const properties = propertiesValue(node.properties, ctx);
    if (properties) props.properties = properties;
  }
  Object.assign(props, componentAbout(node));
  // Its layer: the push's one layer in a bare component frame; else the component frame itself is the layer.
  const bare = node.children?.length === 1 && !node.fill && !node.stroke && !node.layout?.padding?.some(Boolean);
  const inner = bare ? convert(node.children[0], ctx) : frameElement({ ...node, type: "FRAME" }, (node.children ?? []).map((child) => convert(child, ctx)).filter(Boolean), ctx);
  return { kind: "element", name: "Component", props, children: inner ? [inner] : [] };
}

/** An instance of the page's own main or set: `<Use>` with the variant and values that differ from its defaults. */
function useElement(node, ctx) {
  // An instance of another Studio page's component (project components): `<Use of page>` with the values it shows.
  if (typeof node.page === "string" && node.page) {
    const props = { of: literal(node.local), page: literal(node.page) };
    if (node.variant && Object.keys(node.variant).length) props.variant = valuesObject(node.variant);
    if (node.props && Object.keys(node.props).length) props.props = valuesObject(node.props);
    return { kind: "element", name: "Use", props, children: [] };
  }
  const of = pageValue(node.local, ctx);
  if (!ctx.local.ids.has(node.local)) { ctx.notes.push(`${node.name ?? "Instance"}: an instance of a component that is not on this page (left out)`); return null; }
  const props = { of: literal(of) };
  const first = ctx.local.firstVariant.get(of);
  const variant = node.variant ?? {};
  if (Object.keys(variant).length && (!first || Object.entries(variant).some(([name, value]) => variantValues(first)[name] !== value))) props.variant = valuesObject(variant);
  const defaults = ctx.local.defaults.get(of) ?? {};
  const values = Object.fromEntries(Object.entries(node.props ?? {}).map(([name, value]) => [name, pageValue(value, ctx)]).filter(([name, value]) => defaults[name] !== value));
  if (Object.keys(values).length) props.props = valuesObject(values);
  // What it puts in its main's slots (figma-push slots, the reader's slot content): `slots={{ Content: <…/> }}`.
  const fills = {};
  for (const slot of Array.isArray(node.slots) ? node.slots : []) {
    const layers = (slot.children ?? []).map((child) => convert(child, ctx)).filter(Boolean);
    if (layers.length) fills[slot.name] = layers.length === 1 ? { kind: "element", node: layers[0] } : { kind: "fragment", children: layers };
  }
  if (Object.keys(fills).length) props.slots = { kind: "object", fields: fills };
  const element = { kind: "element", name: "Use", props, children: [] };
  // Its overrides of its main's layers: placed once the whole page is converted (settleOverrides).
  if (Array.isArray(node.layerOverrides) && node.layerOverrides.length) (ctx.pendingOverrides ??= []).push({ element, node, of });
  return element;
}

/** The COMPONENT an instance shows: a set's variant with its values (else the set's first), or the lone main. */
function shownSpec(of, values, ctx) {
  const variants = ctx.local.variants.get(of);
  if (!variants) return ctx.local.specs.get(of) ?? null;
  const wanted = Object.entries(values ?? {});
  return variants.find((variant) => wanted.every(([name, value]) => variantValues(variant)[name] === value)) ?? variants[0] ?? null;
}

/**
 * The Studio's layer path (instance-paths.mjs) of the layer the child indices `at` reach in the drawn main `spec`, on
 * through the nested instances of the page's own components it passes ("Chip/Text": the Chip in this main, then the
 * Text in the Chip's main, in the variant the instance's overrides show: `variantAt` by the nested instance's indices).
 * Undefined: not a layer of a main on the page.
 */
function pathAt(spec, at, ctx, variantAt) {
  const component = ctx.innerOf.get(spec);
  const root = component?.children?.find((child) => child.kind === "element");
  if (!root) return undefined;
  const paths = instanceLayerPaths(root, (use) => ctx.local.names.get(use.props.of?.value) ?? null);
  let target = spec;
  for (let step = 0; step < at.length; step++) {
    target = target?.children?.[at[step]];
    if (!target) return undefined;
    if (target.type === "INSTANCE" && step < at.length - 1) {
      const prefix = paths.get(ctx.innerOf.get(target));
      const outer = at.slice(0, step + 1);
      const inner = prefix === undefined ? null : shownSpec(target.local, { ...(target.variant ?? {}), ...(variantAt(outer) ?? {}) }, ctx);
      const rest = inner ? pathAt(inner, at.slice(step + 1), ctx, (deeper) => variantAt([...outer, ...deeper])) : undefined;
      return rest === undefined ? undefined : { path: `${prefix}/${rest.path}`, target: rest.target };
    }
  }
  const path = paths.get(ctx.innerOf.get(target));
  return path === undefined ? undefined : { path, target };
}

/**
 * The code props an instance gives a Zen component in its main (figma-push layerOverrides props / text, the other
 * way): the component's props with this instance's Figma properties and label, against the main's own (`target`, the
 * main's read of that layer). A prop the main sets that the instance takes back to the component's default is that
 * default.
 */
function libraryOverride(target, override, set, ctx, where) {
  const quiet = [];
  const base = instanceProps({ props: target.props ?? {}, text: target.text }, set, ctx.mapping, quiet, where);
  const shown = instanceProps({ props: { ...(target.props ?? {}), ...(override.props ?? {}) }, text: typeof override.text === "string" ? override.text : target.text }, set, ctx.mapping, ctx.notes, where);
  const fields = {};
  for (const [name, value] of Object.entries(shown)) if (JSON.stringify(base[name]) !== JSON.stringify(value)) fields[name] = value;
  for (const name of Object.keys(base)) {
    const fallback = ctx.mapping.apiProps[set.code]?.get(name);
    if (!(name in shown) && fallback !== undefined) fields[name] = literal(fallback);
  }
  return fields;
}

/**
 * Each instance's overrides of its main's layers (figma-push layerOverrides, the reader's instance.overrides), as
 * `<Use overrides>` by the Studio's layer paths (pathAt; through nested instances: "Chip/Text"). Characters → its
 * words, visible → hidden, a Content colour → tone, a nested instance's values → variant.X / props.X. An override of a
 * layer the main does not draw (left out of the page) is a note.
 */
function settleOverrides(ctx) {
  for (const { element, node, of } of ctx.pendingOverrides ?? []) {
    const spec = shownSpec(of, node.variant, ctx);
    const component = spec ? ctx.innerOf.get(spec) : null;
    const root = component?.children?.find((child) => child.kind === "element");
    if (!root) { ctx.notes.push(`${node.name ?? "Instance"}: its overrides are left out (its main is not on the page)`); continue; }
    // A nested instance's variant as this instance overrides it: the layers inside it are that variant's.
    const variantAt = (at) => node.layerOverrides.find((override) => (override.at ?? []).join(".") === at.join("."))?.variant ?? null;
    const table = {};
    for (const override of node.layerOverrides) {
      const found = pathAt(spec, override.at ?? [], ctx, variantAt);
      if (found === undefined) { ctx.notes.push(`${node.name ?? "Instance"}: an override of a layer at ${(override.at ?? []).join(".")} is left out (not a layer of its main on the page)`); continue; }
      const { path, target } = found;
      const fields = { ...(table[path]?.fields ?? {}) };
      // A Zen component in the main (a Button, a Card): its props and label as code props; its own nested layers
      // ("Card/Sub-Action") as a placed component's overrides are read.
      if (target.type === "INSTANCE" && !target.local && target.set) {
        const where = `${node.name ?? "Instance"} › ${path}`;
        const set = ctx.mapping.sets.get(target.set.id) ?? ctx.mapping.sets.get(target.set.name);
        if (override.visible === false) fields.hidden = literal(true);
        const more = override.props || typeof override.text === "string" || override.nested?.length;
        if (!set && more) ctx.notes.push(`${where}: ${target.set.name} has no Zen component (its other overrides are left out)`);
        if (set && (override.props || typeof override.text === "string")) Object.assign(fields, libraryOverride(target, override, set, ctx, where));
        if (Object.keys(fields).length) table[path] = { kind: "object", fields };
        for (const nested of set ? override.nested ?? [] : []) {
          const inner = nested.set ? ctx.mapping.sets.get(nested.set.id) ?? ctx.mapping.sets.get(nested.set.name) : null;
          if (!inner) { ctx.notes.push(`${where} › ${nested.path}: ${nested.set?.name ?? "?"} has no Zen component`); continue; }
          const own = instanceProps(nested, inner, ctx.mapping, ctx.notes, `${where} › ${nested.path}`);
          const key = `${path}/${nested.path}`;
          if (Object.keys(own).length) table[key] = { kind: "object", fields: { ...(table[key]?.fields ?? {}), ...own } };
        }
        continue;
      }
      if (typeof override.characters === "string") fields.children = literal(override.characters);
      if (override.visible === false) fields.hidden = literal(true);
      const tone = typeof override.fill === "string" ? TONE_OF.get(override.fill.replace(/^Color\//, "")) : undefined;
      if (tone) fields.tone = literal(tone);
      for (const [name, value] of Object.entries(override.variant ?? {})) fields[`variant.${name}`] = literal(value);
      for (const [name, value] of Object.entries(override.props ?? {})) fields[`props.${name}`] = literal(pageValue(value, ctx));
      if (Object.keys(fields).length) table[path] = { kind: "object", fields };
    }
    if (Object.keys(table).length) element.props.overrides = { kind: "object", fields: table };
  }
}

/**
 * Figma's mask (the reader's isMask): a group or free frame whose bottom layer masks the others is a Zen Box with
 * `mask` (its first layer is the mask). A mask higher up masks only the layers above it, which Box mask cannot say: noted.
 */
function maskProps(node, ctx) {
  const index = (node.children ?? []).findIndex((child) => child.isMask);
  if (index < 0) return {};
  if (index > 0) { ctx.notes.push(`"${node.name}": its mask is not its bottom layer; left unmasked (Use as mask on the layers it masks)`); return {}; }
  return { mask: literal(true) };
}

/** A frame (or a slot) as a Stack in its auto layout; Figma's grid layout as a Grid. */
function frameElement(node, children, ctx) {
  // figma-push centres an AiChatBlock in a frame of its name: the block itself.
  if (node.name === "AiChatBlock" && children.length === 1 && children[0].name === "AiChatBlock") return children[0];
  const props = {};
  const layout = node.layout;
  // A mask in an auto layout frame (a plugin can make one): Box mask holds it only in a group or a free frame.
  if ((layout || !node.fixed) && (node.children ?? []).some((child) => child.isMask)) ctx.notes.push(`"${node.name}": a mask in an auto layout frame is left out; its mask layer draws (Use as mask on a group)`);
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
  // A free frame (Figma's frame without auto layout): a Box of its px size, its layers at their X / Y (figma-push, the
  // other way; positioned() gave them px insets).
  if (!layout && node.fixed) {
    const look = frameLookProps(node, ctx);
    return { kind: "element", name: "Box", props: { ...maskProps(node, ctx), width: literal(node.fixed.w), height: literal(node.fixed.h), ...look, ...(node.clip ? { clip: literal(true) } : {}) }, children };
  }
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
      // A toolbar Search is at most 240 wide (the user 2026-10-24, harness search/toolbar-width). Search has no width in
      // code (it fills its container), so one beside other layers sits in Zen's toolbar cell: Fixed at its Figma width
      // when that is 240 or less, else Fill up to 240. A phone Search (rounded) fills its row.
      if (row && children.length > 1) children.forEach((child, index) => {
        if (child.kind !== "element" || child.name !== "Search" || child.props.shape?.value === "rounded") return;
        const fixed = sources[index]?.fixedWidth;
        const fits = typeof fixed === "number" && fixed <= TOOLBAR_SEARCH_MAX;
        if (typeof fixed === "number" && !fits) ctx.notes.push(`Search in "${node.name}": ${fixed} px wide in Figma; a toolbar Search is at most ${TOOLBAR_SEARCH_MAX}, so the page caps it`);
        children[index] = { kind: "element", name: "Box", props: fits ? { width: literal(fixed) } : { width: literal("fill"), maxWidth: literal(TOOLBAR_SEARCH_MAX) }, children: [child] };
      });
    }
  } else if (children.length > 1) ctx.notes.push(`Frame "${node.name}" has no auto layout: its layers are stacked in order`);
  // Figma's Clip content: the Stack or Grid clips too (figmaReadCode leaves it off the page frame). Overflow scrolling
  // clips as well: Stack / Box scroll (both ways reads as vertical).
  const scroll = { VERTICAL: "y", HORIZONTAL: "x", BOTH: "y" }[node.scroll];
  if (node.scroll === "BOTH") ctx.notes.push(`Frame "${node.name}" scrolls both ways in Figma; the page scrolls it vertically`);
  if (node.clip && !scroll) props.clip = literal(true);
  // Its fill, stroke, corners, effect, opacity, rotation and flip (figma-push frameLook): Box, Stack and Grid take them
  // alike, so a Figma auto layout frame with a fill is one Stack or Grid (decision 2, plan 2026-10-18). A painted frame
  // that lays nothing out (one layer, or blocks with no gap and no alignment) stays a Box, as the push wrote it.
  const look = frameLookProps(node, ctx);
  if (scroll && grid) {
    // Grid has no Overflow scrolling: a Box scrolls around it and carries the frame's look.
    return { kind: "element", name: "Box", props: { scroll: literal(scroll), ...look }, children: [{ kind: "element", name: "Grid", props, children }] };
  }
  if (scroll) props.scroll = literal(scroll);
  // Figma's explicit variable modes on the frame (Studio Variables v2): the frame's `modes`.
  const modes = modesProp(node.modes);
  if (modes) props.modes = modes;
  const plain = !grid && Boolean(look.surface || look.border) && !Object.keys(props).some((name) => !BOX_PROPS.has(name) && name !== "gap") && (children.length <= 1 || props.gap?.value === "none");
  if (plain) {
    const { gap, ...boxProps } = props;
    return { kind: "element", name: "Box", props: { ...look, ...boxProps }, children };
  }
  return { kind: "element", name: grid ? "Grid" : "Stack", props: { ...props, ...look }, children };
}
/** Props a Box takes besides the look: a painted frame with only these is a Box. */
const BOX_PROPS = new Set(["padding", "paddingX", "paddingY", "clip", "scroll", "modes"]);
/** A ZenProvider axis by the Figma collection whose mode it picks (figma-push frameModes, the other way). */
const COLLECTION_AXIS = {
  "Mode Colors (Semantic)": "theme", "Component Theme": "componentTheme", "Component Size": "density", "Corner Radius": "radius",
  "Emphasis Level": "emphasis", "Breakpoint & Grids": "breakpoint", "Typography Configuration": "typography", "Base Colors (Project)": "brand",
};
const AXES = new Set(Object.values(COLLECTION_AXIS));
const modeIdOf = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
/**
 * The `modes` prop of a frame's explicit modes: the reader's { collection name: mode name } (axis → the mode's id), or
 * the push's own { axis: mode id } (a round trip). Collections that are no ZenProvider axis are left out.
 */
function modesProp(modes) {
  if (!modes || typeof modes !== "object") return null;
  const fields = Object.fromEntries(Object.entries(modes).flatMap(([key, mode]) => {
    if (typeof mode !== "string") return [];
    if (COLLECTION_AXIS[key]) return [[COLLECTION_AXIS[key], literal(modeIdOf(mode))]];
    return AXES.has(key) ? [[key, literal(mode)]] : [];
  }));
  return Object.keys(fields).length ? { kind: "object", fields } : null;
}
/** A Border variable → the frame border it draws (figma-push FRAME_STROKE, the other way). */
const BORDER_OF = { "Border/Neutral/Pale/Default": "pale", "Border/Neutral/Subtle/Default": "subtle" };

/**
 * A frame's look (figma-push frameLook, the other way) as Box / Stack / Grid props: surface, border with its weight,
 * one side and dash, the corners on Corner-Radius (radius plus only the corners that differ), effect style, opacity
 * (percent), rotation and flip. A value Zen has no token for is left out and noted.
 */
function frameLookProps(node, ctx) {
  const props = {};
  const where = `Frame "${node.name}"`;
  const surface = SURFACE_OF[String(node.fill ?? "").replace(/^Color\//, "")];
  if (surface) props.surface = literal(surface);
  else if (node.fill) ctx.notes.push(`${where}: its fill ${node.fill} is no Zen background layer (surface · surface-alt · subtle · pale · canvas); left without a fill`);
  // An image fill (F8, figma-image.mjs) over the fill.
  const picture = imageFillProps(node.imageFill, literal);
  Object.assign(props, picture.props);
  if (picture.note) ctx.notes.push(`${where}: ${picture.note}`);
  // A gradient fill (figma-gradient.mjs) over the fill, under the picture.
  const graded = gradientFillProps(node.gradientFill, literal);
  Object.assign(props, graded.props);
  for (const note of graded.notes) ctx.notes.push(`${where}: ${note}`);
  if (node.stroke) {
    const border = BORDER_OF[String(node.stroke).replace(/^Color\//, "")];
    // The read gives a weight per side; the push's own JSON (the round trip) its weight and one side.
    const one = typeof node.strokeWeight === "number" ? node.strokeWeight : 1;
    const weights = node.strokeWeights ?? ["top", "right", "bottom", "left"].map((side) => (!node.strokeSides || node.strokeSides === side ? one : 0));
    const drawn = weights.map((weight, index) => (weight > 0 ? index : -1)).filter((index) => index >= 0);
    if (!border) ctx.notes.push(`${where}: its stroke ${node.stroke === "unbound" ? "is no colour variable" : node.stroke} is no Zen frame border (Border/Neutral/Pale or Subtle); left without a stroke`);
    else if (drawn.length) {
      props.border = literal(border);
      const weight = Math.max(...drawn.map((index) => weights[index]));
      if (weight !== 1) props.borderWeight = literal(Math.round(weight * 100) / 100);
      if (drawn.length === 1) props.borderSides = literal(["top", "right", "bottom", "left"][drawn[0]]);
      else if (drawn.length < 4) ctx.notes.push(`${where}: its stroke draws ${drawn.length} sides; Zen draws all four or one`);
      if (Array.isArray(node.dash) && node.dash.length) {
        if (border === "subtle") props.borderStyle = literal("dashed");
        else ctx.notes.push(`${where}: a dashed Pale stroke; dashed borders are Subtle in Zen, so it is solid`);
      }
    }
  }
  // The read gives four corners; the push's own JSON one radius when they match.
  const radii = Array.isArray(node.radii) ? node.radii : typeof node.radius === "number" && node.radius > 0 ? [0, 1, 2, 3].map(() => node.radius) : null;
  const radiiVars = Array.isArray(node.radiiVars) ? node.radiiVars : [0, 1, 2, 3].map(() => node.radiusVar ?? null);
  if (radii) {
    const steps = radii.map((px, index) => (px > 0 ? RADIUS_OF[radiiVars[index] ?? ""] ?? null : "none"));
    if (steps.some((step) => step === null)) ctx.notes.push(`${where}: a corner radius (${radii.join(" / ")} px) is no Corner-Radius variable; left square`);
    else {
      // radius = the most common corner, then only the corners that differ (corners.ts canonical form).
      const counts = steps.reduce((map, step) => map.set(step, (map.get(step) ?? 0) + 1), new Map());
      const radius = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      if (radius !== "none") props.radius = literal(radius);
      ["radiusTopLeft", "radiusTopRight", "radiusBottomRight", "radiusBottomLeft"].forEach((name, index) => { if (steps[index] !== radius) props[name] = literal(steps[index]); });
    }
  }
  // Corner smoothing: Figma's 0–1 as the code's %.
  if (typeof node.cornerSmoothing === "number" && node.cornerSmoothing > 0) props.cornerSmoothing = literal(Math.round(node.cornerSmoothing * 100));
  if (node.effectStyle) {
    if (FRAME_EFFECT_STYLES.has(node.effectStyle)) props.effectStyle = literal(node.effectStyle);
    else ctx.notes.push(`${where}: its effect style ${node.effectStyle} is not one a frame takes; left out`);
  }
  if (typeof node.opacity === "number" && node.opacity < 1) props.opacity = literal(Math.round(node.opacity * 100));
  // Figma's layer blend (blend-modes.mjs): Pass through, the frame's default, is no prop.
  if (zenBlendOf(node.blendMode, true)) props.blendMode = literal(zenBlendOf(node.blendMode, true));
  if (node.rotation) props.rotation = literal(node.rotation);
  if (node.flip) props.flip = literal(node.flip);
  return props;
}
/** The effect styles a frame takes (Layout effects.ts boxEffectStyles). */
const FRAME_EFFECT_STYLES = new Set(["Shadow/Bottom/Level-1", "Shadow/Bottom/Level-2", "Shadow/Bottom/Level-3", "Shadow/Bottom/Level-4", "Shadow/Top/Level-1", "Shadow/Top/Level-2", "Shadow/Top/Level-3", "Shadow/Top/Level-4", "Effect/Overlay"]);
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
  // A time between runs (figma-push: a ChatDateDivider frame around its centred Caption text).
  const divider = (child) => child.type === "FRAME" && child.name === "ChatDateDivider" && (child.children ?? []).length === 1 && child.children[0].type === "TEXT"
    ? { kind: "element", name: "ChatDateDivider", props: {}, children: [{ kind: "text", value: child.children[0].characters ?? "" }] }
    : null;
  const children = (node.children ?? []).flatMap((child) => (child.type === "INSTANCE" && child.set?.name === CHAT_SECTION
    ? (child.slots ?? []).flatMap((slot) => slot.children ?? []).map((item) => convert(item, ctx))
    : [divider(child) ?? convert(child, ctx)])).filter(Boolean);
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
  // Figma Heading-Text Dropdown: the chevron comes back as titleDropdown (a menu's items are not in Figma).
  if (barTitle?.props?.Dropdown === true) { props.titleDropdown = literal(true); ctx.notes.push(`${where}: its title shows Figma's Dropdown chevron: give the title a titleMenu or an onTitleClick in the Studio`); }
  const large = shown["Expand-Heading"] === true ? read.large?.texts?.["Header-Text"] : undefined;
  if (large) {
    props.largeTitle = literal(large);
    const level = { H2: "h2", H3: "h3" }[read.large?.props?.Type];
    if (level) props.headingLevel = literal(level);
    if (read.large?.props?.Badges === true) ctx.notes.push(`${where}: the large title shows Figma's Badges row: give the TopNavigation largeTitleBadges in the Studio`);
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
export function pageFromFigma(frame, { title = frame?.name ?? "From Figma", mapping, file = null, locale = "en-US" }) {
  const ctx = { mapping, notes: [], ids: new Set(), drawings: [], keyOwners: new Map(), locale };
  // A copy: the slots take their owner's key (slotKeys), and a push's frame read back here stays as it was.
  frame = frame ? JSON.parse(JSON.stringify(frame)) : frame;
  slotKeys(frame);
  ctx.local = localComponentsOf(frame);
  ctx.innerOf = new Map();
  // The Screen's own canvas and height, which figma-push writes on the page frame: Screen props, not a Box surface.
  const screenProps = {};
  // The page frame's explicit variable modes are the Screen's (Studio Variables v2).
  const screenModes = modesProp(frame?.modes);
  if (screenModes) screenProps.modes = screenModes;
  const canvasFill = /^(?:Color\/)?Background\/Canvas\/(Default|Alt|Flat)$/.exec(String(frame?.fill ?? ""));
  if (canvasFill) {
    delete frame.fill;
    if (canvasFill[1] !== "Default") screenProps.canvas = literal(canvasFill[1].toLowerCase());
  }
  if (typeof frame?.minH === "number") {
    if (frame.minH !== (deviceOf(frame.width) === "phone" ? 844 : 900)) screenProps.height = literal(frame.minH);
    delete frame.minH;
  }
  // The frame's After delay (figma-proto.mjs): the Screen's onDelay.
  for (const reaction of frame?.reactions ?? []) {
    const made = protoOfReaction(reaction);
    if (made.prop === "onDelay") screenProps.onDelay = { kind: "proto", action: made.action, args: made.args };
    else ctx.notes.push(`the frame's ${made.note ?? `${made.prop} interaction`}: a Screen takes After delay only`);
  }
  const chrome = screenChrome(frame, ctx);
  let root = chrome ? chrome.root : convert(frame, ctx);
  settleOverrides(ctx);
  // The push's page frame around an app frame (a column holding only the AppShell): the AppShell itself.
  if (root?.name === "Stack" && root.children.length === 1 && root.children[0].name === "AppShell" && Object.keys(root.props).every((name) => name === "gap")) root = root.children[0];
  if (ctx.drawings.length) ctx.notes.push(`${ctx.drawings.length} drawings (vectors, shapes: ${[...new Set(ctx.drawings)].join(", ")}) are left out: a page has no layer for them`);
  if (ctx.charts) ctx.notes.push(`${ctx.charts} chart${ctx.charts > 1 ? "s" : ""}: the data is the Studio's sample for its kind (Figma's chart is a picture of its own sample data)`);
  for (const chart of ctx.chartHeads ?? []) ctx.notes.push(`${chart.name}: its heading (Title "${CHART_HEADS.get(chart).title}") shows in Figma; a chart's header is ChartCard's, so put the chart in a Card to keep it (left out)`);
  const own = (part) => (frame ? idOf(frame, ctx, part) : undefined);
  // A Stack, or an AppShell (an app frame), is the Screen's content as it is; anything else goes in a Stack.
  const content = root ? (root.name === "Stack" || root.name === "AppShell" ? root : { kind: "element", id: own("content"), name: "Stack", props: {}, children: [root] }) : null;
  // A phone AppShell with its own bars (Pattern/AppShell/Mobile) keeps them: the Screen's phone parts are decided as none,
  // so the Studio does not draw a phone header over them from a desktop header the page has not got
  // (responsive-header.mjs planPhoneSync links a Screen's parts only while it has no phoneLinked).
  const ownBars = content?.name === "AppShell" && ["topNavigation", "bottomNavigation", "actionBar"].some((prop) => content.props[prop]) && !chrome?.props?.topNavigation && !chrome?.props?.bottomNavigation;
  const screen = { kind: "element", id: own("screen"), name: "Screen", props: { id: literal("screen-1"), title: literal(title), device: literal(deviceOf(frame?.width)), ...screenProps, ...(chrome?.props ?? {}), ...(ownBars ? { phoneLinked: { kind: "array", items: [] } } : {}) }, children: content ? [content] : [] };
  const board = { kind: "element", id: own("board") ?? "board", name: "Board", props: {}, children: [screen] };
  // Elements no layer stands for take their place under their parent (deterministic: the same frame, the same ids).
  // The layers' own names (data-name) on the elements that are left once wrappers fold away; the page frame's name is
  // the Screen's title.
  const acted = new Set();
  const named = (element) => {
    const source = SOURCE.get(element);
    if (source && source !== frame) givenName(element, source);
    if (source && source !== frame && source.reactions && !acted.has(source)) { acted.add(source); pulledReactions(element, source, ctx); }
  };
  const walk = (node) => {
    node.children.forEach((child, index) => { if (child.kind === "element") { child.id ??= `${node.id}.${index}`; named(child); walk(child); } });
    for (const [name, value] of Object.entries(node.props)) if (value.kind === "element") { value.node.id ??= `${node.id}.${name}`; named(value.node); walk(value.node); }
  };
  walk(board);
  // A frame the Zen plugin placed from a Studio page: that page and the export it holds (figma-diff picks its base by them).
  const pushed = typeof frame?.page === "string" ? { page: frame.page, ...(typeof frame.version === "string" ? { version: frame.version } : {}) } : {};
  const source = frame?.id ? { figma: { file: frame.file ?? file, node: frame.id, ...pushed } } : {};
  const doc = { header: { format: 1, title, ...source }, mock: {}, board };
  return { text: printPage(doc), notes: ctx.notes, doc };
}

/**
 * A layer's Prototype interactions (figma-proto.mjs) as the element's proto props: On click → onClick, While hovering →
 * whileHovering; one on a Dialog's button → its action prop's onClick, when the page has that prop. What the Studio has
 * no word for (a reaction to a frame that is no Studio frame, a Smart animate) is a note.
 */
function pulledReactions(element, node, ctx) {
  for (const reaction of node.reactions ?? []) {
    const made = protoOfReaction(reaction);
    if (made.note) { ctx.notes.push(`${element.name}: ${made.note}`); continue; }
    const value = { kind: "proto", action: made.action, args: made.args };
    if (reaction.layer) {
      const field = Object.entries(ACTION_LAYERS[element.name] ?? {}).find(([, layer]) => layer === reaction.layer)?.[0];
      const holder = field ? element.props[field] : null;
      if (holder?.kind === "object") holder.fields[made.prop] = value;
      else ctx.notes.push(`${element.name}: the interaction on its ${String(reaction.layer).split("/").pop()} layer stays as the page has it`);
      continue;
    }
    if (made.prop === "onDelay") { ctx.notes.push(`${element.name}: After delay is a Screen's (on its frame), not a layer's`); continue; }
    element.props[made.prop] = value;
  }
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
