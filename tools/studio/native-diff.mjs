// native-diff: the direct paste (figma-native.mjs) against Figma's own copy of the same export imported by the Zen
// plugin. The plugin builds through Figma's runtime (a property swap keeps what Figma keeps, variables resolve), so the
// copy of its frame is what a paste must carry. Every difference is listed by kind with its places: one missing rule
// shows once, with how many layers it breaks (user 2026-10-17: compare with Figma's own copy instead of finding the
// next bug by eye).
//
//   node tools/studio/native-diff.mjs --pkg=<export .figma.json> --oracle=<Figma copy .html> [--limit=3] [--json=<out>]
//
// The oracle: import the export with the Zen plugin in the Zen file, select its frame, Edit › Copy, and save the
// clipboard's html (`osascript -e 'the clipboard as «class HTML»'`, hex-decoded).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expandPack, nativeMessage } from "./figma-native.mjs";
import { readFigmaClipboard } from "./figma-kiwi.mjs";

const id = (guid) => (guid ? `${guid.sessionID}:${guid.localID}` : "");
const round = (value, step = 1) => Math.round(value / step) * step;
const hex = (c) => `#${[c.r, c.g, c.b].map((v) => Math.round((v ?? 0) * 255).toString(16).padStart(2, "0")).join("")}${c.a !== undefined && c.a < 0.999 ? Math.round(c.a * 100) + "%" : ""}`;

/** Fields a comparison skips: plugin data, what Figma derives again, versions, and Figma's swap bookkeeping noise. */
const NOISE = new Set([
  "guid", "guidPath", "phase", "parentIndex", "pluginData", "sharedPluginData", "overrideKey", "derivedSymbolData", "derivedSymbolDataLayoutVersion",
  "derivedTextData", "editInfo", "textExplicitLayoutVersion", "textUserLayoutVersion", "fontVersion", "stackLayoutVersion", "targetAspectRatio",
  "proportionsConstrained", "borderTopWeight", "borderBottomWeight", "borderLeftWeight", "borderRightWeight", "borderStrokeWeightsIndependent",
  "bordersTakeSpace", "description", "symbolDescription", "styleIdForGrid", "layoutGrids", "componentPropRefs", "transform", "type", "isSlotContent",
  "fillGeometry", "strokeGeometry", "vectorData", "symbolData", "componentPropAssignments", "variableConsumptionMap", "parameterConsumptionMap",
  "size", "name", "textData", "fillPaints", "strokePaints", "overriddenSymbolID", "styleIdForText", "styleIdForFill", "styleIdForStrokeFill",
  "styleIdForEffect", "authoredColor", "lines", "glyphs", "baselines", "fontMetaData", "textBidiVersion", "visible", "opacity",
]);
/** A frame's fields compared when either side sets them, with Figma's defaults for an absent one. */
const FRAME_FIELDS = {
  stackMode: "NONE", stackSpacing: 0, stackHorizontalPadding: 0, stackVerticalPadding: 0, stackPaddingRight: 0, stackPaddingBottom: 0,
  stackPrimaryAlignItems: "MIN", stackCounterAlignItems: "MIN", stackPrimarySizing: "FIXED", stackCounterSizing: "FIXED",
  stackChildPrimaryGrow: 0, stackChildAlignSelf: "AUTO", stackPositioning: "AUTO", stackWrap: "NO_WRAP", stackCounterSpacing: 0,
  frameMaskDisabled: false, rectangleTopLeftCornerRadius: 0, rectangleTopRightCornerRadius: 0, rectangleBottomLeftCornerRadius: 0,
  rectangleBottomRightCornerRadius: 0, cornerRadius: 0, strokeWeight: 1, strokeAlign: "INSIDE", gridRowGap: 0, gridColumnGap: 0,
  textAutoResize: "NONE", textAlignHorizontal: "LEFT", textAlignVertical: "TOP", maxLines: 0, textTruncation: "DISABLED",
  strokeCap: "NONE", strokeJoin: "MITER", minSize: null, maxSize: null, gridColumnsSizing: null, gridRowsSizing: null,
};

/** A message read for comparing: nodes by id, children in order, names of what its ids and keys refer to. */
function readMessage(message, pack, extraNames) {
  const nodes = new Map(), children = new Map();
  for (const node of message.nodeChanges) nodes.set(id(node.guid), node);
  for (const node of message.nodeChanges) {
    const parent = id(node.parentIndex?.guid);
    if (!parent) continue;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(node);
  }
  for (const list of children.values()) list.sort((a, b) => (a.parentIndex.position < b.parentIndex.position ? -1 : a.parentIndex.position > b.parentIndex.position ? 1 : 0));
  const names = new Map(extraNames ?? []), byKey = new Map();
  for (const [name, [vid, , k]] of Object.entries(pack.variables)) { names.set(vid, name); if (k) byKey.set(k, name); }
  for (const [name, [sid]] of Object.entries(pack.styles)) names.set(sid, name);
  for (const node of message.nodeChanges) {
    if (node.type !== "VARIABLE" && !(node.styleType && node.styleType !== "NONE")) continue;
    names.set(id(node.guid), node.name);
    if (node.key) byKey.set(node.key, node.name);
  }
  return { message, nodes, children, names, byKey };
}

/** Names for symbols and property definitions: the pack's, then the oracle's own SYMBOL nodes. */
function namesFrom(pack, oracle) {
  const symbols = new Map(), defs = new Map();
  for (const [sid, symbol] of Object.entries(pack.symbols)) {
    const set = symbol.set ? pack.sets[symbol.set] : null;
    symbols.set(sid, set ? `${set.name} / ${symbol.name}` : symbol.name);
    for (const [name, , defId] of symbol.props ?? []) defs.set(defId, name);
    if (set) for (const [setLevel, own] of Object.entries(symbol.defs ?? {})) { const prop = set.props.find((p) => p[2] === setLevel); if (prop) defs.set(own, prop[0]); }
  }
  for (const set of Object.values(pack.sets)) for (const [name, , defId] of set.props) defs.set(defId, name);
  for (const node of oracle.message.nodeChanges) {
    if (node.type === "SYMBOL" && !symbols.has(id(node.guid))) symbols.set(id(node.guid), node.name);
    for (const def of node.componentPropDefs ?? []) if (def.name && !defs.has(id(def.id))) defs.set(id(def.id), def.name);
  }
  return { symbols, defs };
}

class Diff {
  constructor(pack, ours, theirs, limit) {
    this.pack = pack;
    this.ours = ours;
    this.theirs = theirs;
    this.limit = limit;
    this.named = namesFrom(pack, theirs);
    this.kinds = new Map();
    this.counts = { INSTANCE: 0, FRAME: 0, TEXT: 0, other: 0, overrides: 0 };
  }
  report(kind, where, ours, theirs) {
    if (!this.kinds.has(kind)) this.kinds.set(kind, { count: 0, examples: [] });
    const entry = this.kinds.get(kind);
    entry.count++;
    if (entry.examples.length < this.limit) entry.examples.push({ where, ours, theirs });
  }

  // --- values as names ---------------------------------------------------------------------------------------------

  ref(side, alias) {
    if (!alias) return "?";
    if (alias.assetRef) return side.byKey.get(alias.assetRef.key) ?? `key ${alias.assetRef.key.slice(0, 8)}`;
    if (alias.guid) return side.names.get(id(alias.guid)) ?? `id ${id(alias.guid)}`;
    return "?";
  }
  paints(side, list) {
    return (list ?? []).map((paint) => {
      const parts = [paint.type];
      if (paint.visible === false) parts.push("hidden");
      const alias = paint.colorVar?.value?.alias;
      if (alias) parts.push(`var ${this.ref(side, alias)}`);
      else if (paint.color) parts.push(hex(paint.color));
      if (paint.type?.startsWith("GRADIENT")) parts.push((paint.stops ?? []).map((stop) => hex(stop.color)).join(","));
      // A bound paint takes its variable's alpha on paste (Figma resolves it), so its stored opacity is not compared.
      if (!alias && paint.opacity !== undefined && Math.abs(paint.opacity - 1) > 0.005) parts.push(`${round(paint.opacity * 100)}%`);
      return parts.join(" ");
    }).join(" | ") || "none";
  }
  bindings(side, node) {
    const out = {};
    for (const map of [node.variableConsumptionMap, node.parameterConsumptionMap]) {
      for (const entry of map?.entries ?? []) {
        const alias = entry.variableData?.value?.alias;
        if (alias) out[entry.variableField] = this.ref(side, alias);
      }
    }
    return out;
  }
  styleName(side, ref) {
    if (!ref) return null;
    if (ref.assetRef) return side.byKey.get(ref.assetRef.key) ?? `key ${ref.assetRef.key.slice(0, 8)}`;
    if (ref.guid) return side.names.get(id(ref.guid)) ?? `id ${id(ref.guid)}`;
    return null;
  }
  symbol(guid) { return this.named.symbols.get(id(guid)) ?? id(guid); }
  def(guid) { return this.named.defs.get(id(guid)) ?? id(guid); }
  /** Assignments by property name: booleans, text, swapped components, slot contents (compared after as trees). */
  assignments(side, list) {
    const out = {};
    for (const a of list ?? []) {
      const value = a.varValue?.value ?? {};
      const name = this.def(a.defID);
      if (a.varValue?.dataType === "SLOT_CONTENT_ID") out[name] = "value" in a ? { slot: id(value.slotContentIdValue?.guid) } : { slot: null };
      else if ("boolValue" in value) out[name] = value.boolValue;
      else if (value.textDataValue) out[name] = value.textDataValue.characters;
      else if (value.symbolIdValue) out[name] = this.symbol(value.symbolIdValue.guid);
      else if (a.value && "boolValue" in a.value) out[name] = a.value.boolValue;
      else if (a.value?.textValue) out[name] = a.value.textValue.characters;
      else if (a.value?.guidValue) out[name] = this.symbol(a.value.guidValue);
      else out[name] = JSON.stringify(value).slice(0, 60);
    }
    return out;
  }
  /** A node's or override's visual fields as comparable strings. */
  fields(side, node) {
    const out = {};
    if (node.name !== undefined) out.name = node.name;
    if (node.visible !== undefined) out.visible = node.visible;
    if (node.opacity !== undefined && Math.abs(node.opacity - 1) > 0.005) out.opacity = round(node.opacity, 0.01);
    if (node.textData) out.text = node.textData.characters;
    if (node.fillPaints) out.fill = this.paints(side, node.fillPaints);
    if (node.strokePaints) out.stroke = this.paints(side, node.strokePaints);
    if (node.overriddenSymbolID) out.symbol = this.symbol(node.overriddenSymbolID);
    for (const field of ["styleIdForText", "styleIdForFill", "styleIdForStrokeFill", "styleIdForEffect"]) if (node[field]) out[field.replace("styleIdFor", "style ")] = this.styleName(side, node[field]);
    for (const [field, name] of Object.entries(this.bindings(side, node))) out[`bind ${field}`] = name;
    // Grid tracks have ids of their own on each side: compared by count, sizes and a cell's track index.
    for (const field of ["gridColumns", "gridRows"]) if (node[field]) out[field] = `${node[field].entries?.length ?? 0} tracks`;
    for (const field of ["gridColumnsSizing", "gridRowsSizing"]) if (node[field]) out[field] = JSON.stringify((node[field].entries ?? []).map((entry) => entry.trackSize), (k, v) => (typeof v === "number" ? round(v, 0.5) : v));
    for (const [field, tracks] of [["gridRowAnchor", "gridRows"], ["gridColumnAnchor", "gridColumns"]]) {
      if (!node[field]) continue;
      const parent = side.nodes.get(id(node.parentIndex?.guid));
      const index = (parent?.[tracks]?.entries ?? []).findIndex((entry) => id(entry.id) === id(node[field]));
      out[field] = index >= 0 ? `track ${index}` : "?";
    }
    for (const [field, value] of Object.entries(node)) {
      if (NOISE.has(field) || field in out) continue;
      out[field] = typeof value === "number" ? round(value, 0.5) : typeof value === "object" ? JSON.stringify(value, (k, v) => (typeof v === "bigint" ? Number(v) : typeof v === "number" ? round(v, 0.5) : v)).slice(0, 120) : value;
    }
    return out;
  }

  // --- trees -------------------------------------------------------------------------------------------------------

  /** Pairs two child lists by type and name in order (longest common subsequence); the rest are missing / extra. */
  align(a, b) {
    const keyOf = (node) => `${node.type}|${node.name}`;
    const n = a.length, m = b.length;
    const table = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) table[i][j] = keyOf(a[i]) === keyOf(b[j]) ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    const pairs = [], onlyA = [], onlyB = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (keyOf(a[i]) === keyOf(b[j])) { pairs.push([a[i], b[j]]); i++; j++; }
      else if (table[i + 1][j] >= table[i][j + 1]) onlyA.push(a[i++]);
      else onlyB.push(b[j++]);
    }
    while (i < n) onlyA.push(a[i++]);
    while (j < m) onlyB.push(b[j++]);
    // Same type, renamed: pair in order.
    for (const node of [...onlyA]) {
      const k = onlyB.findIndex((other) => other.type === node.type);
      if (k < 0) continue;
      pairs.push([node, onlyB[k]]);
      onlyA.splice(onlyA.indexOf(node), 1);
      onlyB.splice(k, 1);
    }
    return { pairs, onlyA, onlyB };
  }
  /** Whether a frame-like node's size along x / y is its own (not hugging its content, not filling its parent). */
  fixedAxes(node, parent) {
    const mode = node.stackMode ?? "NONE";
    const parentMode = parent?.stackMode ?? "NONE";
    let w = true, h = true;
    if (mode === "HORIZONTAL" || mode === "GRID") { if ((node.stackPrimarySizing ?? "FIXED") !== "FIXED") w = false; if (/^RESIZE_TO_FIT/.test(node.stackCounterSizing ?? "")) h = false; }
    if (mode === "VERTICAL") { if ((node.stackPrimarySizing ?? "FIXED") !== "FIXED") h = false; if (/^RESIZE_TO_FIT/.test(node.stackCounterSizing ?? "")) w = false; }
    if (node.type === "TEXT") { const resize = node.textAutoResize ?? "NONE"; if (resize === "WIDTH_AND_HEIGHT") { w = false; h = false; } if (resize === "HEIGHT") h = false; }
    if (parentMode === "HORIZONTAL") { if (node.stackChildPrimaryGrow) w = false; if (node.stackChildAlignSelf === "STRETCH") h = false; }
    if (parentMode === "VERTICAL") { if (node.stackChildPrimaryGrow) h = false; if (node.stackChildAlignSelf === "STRETCH") w = false; }
    if (parentMode === "GRID") { w = false; h = false; }
    if (node.type === "INSTANCE") { w = false; h = false; } // an instance's size follows its component; its overrides say otherwise
    return { w, h };
  }
  compareFields(kindPrefix, where, a, b, { defaults = {} } = {}) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const va = k in a ? a[k] : defaults[k];
      const vb = k in b ? b[k] : defaults[k];
      if (JSON.stringify(va) === JSON.stringify(vb)) continue;
      const kind = !(k in a) && !(k in defaults) ? "missing" : !(k in b) && !(k in defaults) ? "extra" : "differs";
      this.report(`${kindPrefix} ${k}: ${kind}`, where, va, vb);
    }
  }
  node(a, b, where, parentA, parentB) {
    this.counts[a.type in this.counts ? a.type : "other"]++;
    const fa = this.fields(this.ours, a), fb = this.fields(this.theirs, b);
    const defaults = { visible: true, fill: "none", stroke: "none" };
    for (const [field, value] of Object.entries(FRAME_FIELDS)) if (value !== null) defaults[field] = value;
    delete fa.name; delete fb.name;
    if (a.type === "INSTANCE") {
      // An instance node repeats its component's frame fields: only what differs from the component is the instance's.
      delete fa.text; delete fb.text;
      const main = this.theirs.nodes.get(id(b.symbolData?.symbolID));
      if (main) {
        const own = this.fields(this.theirs, main);
        for (const k of new Set([...Object.keys(fa), ...Object.keys(fb), ...Object.keys(own)])) {
          if (!(k in fa) && k in own) fa[k] = own[k];
          if (!(k in fb) && k in own) fb[k] = own[k];
        }
      }
    }
    // A fill or stroke from a style compares by the style.
    if (fa["style Fill"] && fb["style Fill"]) { delete fa.fill; delete fb.fill; }
    if (fa["style StrokeFill"] && fb["style StrokeFill"]) { delete fa.stroke; delete fb.stroke; }
    this.compareFields(a.type, where, fa, fb, { defaults });
    // A slot content's size is its slot's.
    if (a.isSlotContent || b.isSlotContent) parentA = parentB = { stackMode: "GRID" };
    const fixedA = this.fixedAxes(a, parentA), fixedB = this.fixedAxes(b, parentB);
    if (fixedA.w && fixedB.w && Math.abs((a.size?.x ?? 0) - (b.size?.x ?? 0)) > 2) this.report(`${a.type} width (fixed): differs`, where, round(a.size?.x ?? 0), round(b.size?.x ?? 0));
    if (fixedA.h && fixedB.h && Math.abs((a.size?.y ?? 0) - (b.size?.y ?? 0)) > 2) this.report(`${a.type} height (fixed): differs`, where, round(a.size?.y ?? 0), round(b.size?.y ?? 0));
    if (fixedA.w !== fixedB.w) this.report(`${a.type} width sizing: differs`, where, fixedA.w ? "fixed" : "hug/fill", fixedB.w ? "fixed" : "hug/fill");
    if (fixedA.h !== fixedB.h) this.report(`${a.type} height sizing: differs`, where, fixedA.h ? "fixed" : "hug/fill", fixedB.h ? "fixed" : "hug/fill");
    if (a.type === "INSTANCE") this.instance(a, b, where);
    const { pairs, onlyA, onlyB } = this.align(this.ours.children.get(id(a.guid)) ?? [], this.theirs.children.get(id(b.guid)) ?? []);
    for (const node of onlyA) this.report(`layer extra (${node.type})`, `${where}/${node.name}`, node.name, null);
    for (const node of onlyB) this.report(`layer missing (${node.type})`, `${where}/${node.name}`, null, node.name);
    for (const [x, y] of pairs) this.node(x, y, `${where}/${y.name}`, a, b);
  }
  /** The layer names along a guidPath, from the oracle (it carries every component's layers). */
  pathName(guids) { return guids.map((guid) => this.theirs.nodes.get(id(guid))?.name ?? id(guid)).join("/"); }
  instance(a, b, where) {
    if (id(a.symbolData?.symbolID) !== id(b.symbolData?.symbolID)) this.report("INSTANCE component: differs", where, this.symbol(a.symbolData?.symbolID), this.symbol(b.symbolData?.symbolID));
    const own = id(b.symbolData?.symbolID);
    // Figma may write several entries for one layer (its own change, then what it kept from a swap): merged.
    const entries = (side, node) => {
      const map = new Map();
      for (const entry of node.symbolData?.symbolOverrides ?? []) {
        const guids = entry.guidPath?.guids ?? [];
        const k = guids.length === 1 && id(guids[0]) === own ? "" : guids.map(id).join("/");
        const prev = map.get(k);
        if (!prev) { map.set(k, { guids, entry }); continue; }
        const merged = { ...prev.entry, ...entry };
        if (prev.entry.componentPropAssignments || entry.componentPropAssignments) merged.componentPropAssignments = [...(prev.entry.componentPropAssignments ?? []), ...(entry.componentPropAssignments ?? [])];
        map.set(k, { guids, entry: merged });
      }
      return map;
    };
    const ea = entries(this.ours, a), eb = entries(this.theirs, b);
    // The instance's own assignments (on the node, or Figma's entry for its own symbol).
    const ownA = this.assignments(this.ours, [...(a.componentPropAssignments ?? []), ...(ea.get("")?.entry.componentPropAssignments ?? [])]);
    const ownB = this.assignments(this.theirs, [...(b.componentPropAssignments ?? []), ...(eb.get("")?.entry.componentPropAssignments ?? [])]);
    this.compareAssignments("INSTANCE prop", where, ownA, ownB);
    ea.delete(""); eb.delete("");
    for (const k of new Set([...ea.keys(), ...eb.keys()])) {
      this.counts.overrides++;
      const ra = ea.get(k), rb = eb.get(k);
      const guids = (rb ?? ra).guids;
      const at = `${where} › ${this.pathName(guids)}`;
      const fa = ra ? this.fields(this.ours, ra.entry) : {};
      const fb = rb ? this.fields(this.theirs, rb.entry) : {};
      const level = (f) => f.overrideLevel;
      if (!ra && Object.keys(fb).length) { this.report(`override missing: ${Object.keys(fb).sort().join(", ")}`, at, null, fb); continue; }
      if (!rb && Object.keys(fa).length) { this.report(`override extra: ${Object.keys(fa).sort().join(", ")}`, at, fa, null); continue; }
      if (level(fa) !== level(fb)) this.report("override overrideLevel: differs", at, level(fa), level(fb));
      delete fa.overrideLevel; delete fb.overrideLevel;
      this.compareFields("override", at, fa, fb);
      const aa = this.assignments(this.ours, ra?.entry.componentPropAssignments), ab = this.assignments(this.theirs, rb?.entry.componentPropAssignments);
      if (Object.keys(aa).length || Object.keys(ab).length) this.compareAssignments("override prop", at, aa, ab);
    }
  }
  compareAssignments(prefix, where, a, b) {
    for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const va = a[name], vb = b[name];
      if (va && typeof va === "object" && vb && typeof vb === "object" && "slot" in va && "slot" in vb) {
        if (va.slot && vb.slot) {
          const ca = this.ours.nodes.get(va.slot), cb = this.theirs.nodes.get(vb.slot);
          if (ca && cb) this.node(ca, cb, `${where} [${name}]`, null, null);
        } else if (Boolean(va.slot) !== Boolean(vb.slot)) this.report(`${prefix} slot content: ${va.slot ? "extra" : "missing"}`, `${where} [${name}]`, va.slot, vb.slot);
        continue;
      }
      if (JSON.stringify(va) === JSON.stringify(vb)) continue;
      const kind = va === undefined ? "missing" : vb === undefined ? "extra" : "differs";
      this.report(`${prefix} ${typeof (va ?? vb) === "object" ? "slot" : name}: ${kind}`, `${where} {${name}}`, va, vb);
    }
  }
}

/** The differences between our message for `pkg` and the oracle's (both read by readFigmaClipboard / nativeMessage). */
export function diffMessages(pack, oursMessage, oursRoot, theirsMessage, { limit = 3 } = {}) {
  const ours = readMessage(oursMessage, pack);
  const theirs = readMessage(theirsMessage, pack);
  const diff = new Diff(pack, ours, theirs, limit);
  const theirsRoot = id(theirsMessage.clipboardSelectionRegions?.[0]?.nodes?.[0]);
  const a = ours.nodes.get(id(oursRoot)), b = theirs.nodes.get(theirsRoot);
  if (!a || !b) throw new Error("native-diff: a root is missing");
  diff.node(a, b, b.name ?? "frame", null, null);
  const kinds = [...diff.kinds.entries()].map(([kind, entry]) => ({ kind, ...entry })).sort((x, y) => y.count - x.count);
  return { counts: diff.counts, kinds };
}

if (process.argv[1] && import.meta.url === `file://${path.resolve(process.argv[1])}`) {
  const option = (name) => process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  if (!option("pkg") || !option("oracle")) {
    console.error("usage: native-diff.mjs --pkg=<export .figma.json> --oracle=<Figma copy .html> [--limit=3] [--json=<out>]");
    process.exit(1);
  }
  const pack = expandPack(JSON.parse(fs.readFileSync(path.join(root, "docs/figma-contracts/native-pack.json"), "utf8")));
  const pkg = JSON.parse(fs.readFileSync(option("pkg"), "utf8"));
  const theirs = await readFigmaClipboard(fs.readFileSync(option("oracle"), "utf8"));
  if (!theirs) throw new Error("native-diff: the oracle holds no Figma clipboard");
  const { message, root: oursRoot } = nativeMessage(pkg, pack);
  const result = diffMessages(pack, message, oursRoot, theirs.message, { limit: Number(option("limit") ?? 3) });
  if (option("json")) fs.writeFileSync(option("json"), JSON.stringify(result, null, 1));
  const total = result.kinds.reduce((sum, kind) => sum + kind.count, 0);
  console.log(`native-diff: ${result.counts.INSTANCE} instances, ${result.counts.FRAME} frames, ${result.counts.TEXT} texts, ${result.counts.overrides} overrides compared; ${total} differences of ${result.kinds.length} kinds`);
  const show = (value) => (value === null || value === undefined ? "—" : typeof value === "object" ? JSON.stringify(value).slice(0, 160) : String(value).slice(0, 160));
  for (const kind of result.kinds) {
    console.log(`\n${String(kind.count).padStart(5)}× ${kind.kind}`);
    for (const example of kind.examples) console.log(`        ${example.where.slice(-150)}\n          ours: ${show(example.ours)}\n          figma: ${show(example.theirs)}`);
  }
}
