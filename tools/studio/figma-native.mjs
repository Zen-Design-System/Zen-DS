// A Studio export (format zen-studio-figma, tools/studio/figma-push.mjs) as Figma's own clipboard, so ⌘V lands real
// layers on the Figma canvas without the plugin (docs/research/studio-native-paste-2026-10-17.md). It does what the
// plugin's importer does (zen-ds-figma-plugin src/plugin/studio-import.js), written as Figma's nodes: frames, texts and
// shapes as they are; an instance as its variant (chosen by the VARIANT props), its other props as assignments with the
// variant's own property ids, labels, text lists, icons and edits as overrides by guidPath, slots as slot content; the
// skeletons of every variant used ride along so Figma maps the overrides onto the file's own components
// (docs/figma-contracts/native-pack.json). Variables bind by id, styles by their node id. Figma lays out auto layout and
// text again when it pastes, so sizes here are first guesses.
//
//   nativeMessage(pkg, pack, pictures?) → { message, root, notes }  the NODE_CHANGES message (pure, for selftests)
//   figmaPasteHtml(pkg, pack, { toPng }) → { html, notes }  the text/html Figma pastes (pictures ride in it as blobs)

import { decodeSchema, inflateRaw, bytesOf, base64Of, figmaClipboardHtml } from "./figma-kiwi.mjs";
import { FIGMA_CLIPBOARD_SCHEMA } from "./figma-clipboard-schema.generated.mjs";

const LABEL_PROPS = ["Label", "Text", "Title", "Content"];
const IDENTITY = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };
const DOCUMENT = { sessionID: 0, localID: 0 }, PAGE = { sessionID: 0, localID: 1 }, INTERNAL = { sessionID: 20015894, localID: 2 };
/** New nodes, grid tracks and slot content take ids in a session no file uses; Figma gives pasted nodes new ids. */
const SESSION = 2147480000;
const UNSET = Number.NaN;
const TEXT_FIELDS = { textAlignVertical: "TOP", fontVariantCommonLigatures: true, fontVariantContextualLigatures: true, fontVersion: "1", textUserLayoutVersion: 5, textExplicitLayoutVersion: 1, fontVariations: [], textBidiVersion: 1, emojiImageSet: "APPLE", strokeWeight: 1, strokeAlign: "OUTSIDE", strokeJoin: "MITER", textDecorationSkipInk: true, listSpacing: 0 };
const FRAME_FIELDS = { strokeWeight: 1, strokeAlign: "INSIDE", strokeJoin: "MITER" };

const guid = (text) => { const [a, b] = String(text).replace(/^VariableID:/, "").split(":").map(Number); return { sessionID: a, localID: b }; };
const key = (g) => `${g.sessionID}:${g.localID}`;
const position = (index) => (index < 90 ? String.fromCharCode(0x21 + index) : "~".repeat(Math.floor(index / 90)) + String.fromCharCode(0x21 + (index % 90)));
const at = (x, y) => ({ ...IDENTITY, m02: x || 0, m12: y || 0 });
const lines = (characters) => String(characters).split("\n").map(() => ({ lineType: "PLAIN", styleId: 0, indentationLevel: 0, sourceDirectionality: "AUTO", listStartOffset: 0, isFirstLineOfList: false }));
const textData = (characters) => ({ characters: String(characters), lines: lines(characters) });
const aliasOf = (id, resolved) => ({ value: { alias: { guid: guid(id) } }, dataType: "ALIAS", resolvedDataType: resolved });
/** Auto layout padding's variable fields, in the importer's order (top, right, bottom, left). */
const PADDING_FIELDS = ["STACK_PADDING_TOP", "STACK_PADDING_RIGHT", "STACK_PADDING_BOTTOM", "STACK_PADDING_LEFT"];
/** Padding (top, right, bottom, left) as Figma's fields. */
const paddingFields = ([top, right, bottom, left]) => ({ stackVerticalPadding: top, stackPaddingRight: right, stackPaddingBottom: bottom, stackHorizontalPadding: left });
/** Sets a node's or an override's consumption-map entries by field (each replacing the field's earlier one); `drop`'s fields lose theirs. */
function consume(target, map, entries, drop = []) {
  const fields = new Set([...entries.map((entry) => entry.variableField), ...drop]);
  const all = [...(target[map]?.entries ?? []).filter((entry) => !fields.has(entry.variableField)), ...entries];
  if (all.length) target[map] = { entries: all }; else delete target[map];
}

/** A path (absolute M, L, C, Q, Z, as the push writes them) as subpaths, scaled by sx, sy; a quadratic as its cubic (Figma's own). */
export function parsePath(d, sx = 1, sy = 1) {
  const tokens = String(d).match(/[MLCQZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const subpaths = [];
  let current = null, command = null, i = 0;
  const point = () => [Number(tokens[i++]) * sx, Number(tokens[i++]) * sy];
  while (i < tokens.length) {
    if (/^[MLCQZ]$/i.test(tokens[i])) command = tokens[i++].toUpperCase();
    if (command === "M") { current = { start: point(), segments: [], closed: false }; subpaths.push(current); command = "L"; }
    else if (command === "L" && current) current.segments.push({ to: point() });
    else if (command === "C" && current) { const c1 = point(), c2 = point(); current.segments.push({ c1, c2, to: point() }); }
    else if (command === "Q" && current) {
      const from = current.segments.length ? current.segments[current.segments.length - 1].to : current.start;
      const q = point(), to = point();
      current.segments.push({ c1: [from[0] + (2 / 3) * (q[0] - from[0]), from[1] + (2 / 3) * (q[1] - from[1])], c2: [to[0] + (2 / 3) * (q[0] - to[0]), to[1] + (2 / 3) * (q[1] - to[1])], to });
    }
    else if (command === "Z") { if (current) current.closed = true; command = null; }
    else i++;
  }
  return subpaths;
}

/** The bounds of subpaths' curves (a cubic's extremes, not its control points). */
export function pathBounds(subpaths) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const add = ([x, y]) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
  const cubicAt = (a, b, c, d, t) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;
  const extremes = (a, b, c, d) => {
    const qa = -a + 3 * b - 3 * c + d, qb = 2 * (a - 2 * b + c), qc = b - a;
    if (Math.abs(qa) < 1e-9) return Math.abs(qb) < 1e-9 ? [] : [-qc / qb];
    const disc = qb * qb - 4 * qa * qc;
    if (disc < 0) return [];
    return [(-qb + Math.sqrt(disc)) / (2 * qa), (-qb - Math.sqrt(disc)) / (2 * qa)];
  };
  for (const sub of subpaths) {
    add(sub.start);
    let from = sub.start;
    for (const segment of sub.segments) {
      add(segment.to);
      if (segment.c1) for (const axis of [0, 1]) for (const t of extremes(from[axis], segment.c1[axis], segment.c2[axis], segment.to[axis])) if (t > 0 && t < 1) {
        const p = [cubicAt(from[0], segment.c1[0], segment.c2[0], segment.to[0], t), cubicAt(from[1], segment.c1[1], segment.c2[1], segment.to[1], t)];
        add(p);
      }
      from = segment.to;
    }
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Figma's vector network blob: uint32 counts (vertices, segments, regions); a vertex [style, x, y]; a segment [style,
 * start, tangent start x/y, end, tangent end x/y] (tangents relative to their vertex); a region [style << 1 | NONZERO,
 * loops, (segments, indexes…)…]. Coordinates are shifted by (dx, dy) so the shape starts at its node's origin.
 * Each closed subpath is a NONZERO region of its own, unless `regions` groups them: [{ subpaths: [index…], evenOdd }]
 * (one region with a loop per subpath; Figma's even-odd path is one region with style 0, its copy 2026-10-20).
 */
export function vectorNetwork(subpaths, dx = 0, dy = 0, { regions: groups = null } = {}) {
  const vertices = [], segments = [], loops = [];
  const near = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
  for (const sub of subpaths) {
    const first = vertices.length;
    vertices.push(sub.start);
    let previous = first;
    const loop = [];
    sub.segments.forEach((segment, k) => {
      const closing = sub.closed && k === sub.segments.length - 1 && near(segment.to, sub.start);
      const end = closing ? first : vertices.push(segment.to) - 1;
      const from = vertices[previous], to = vertices[end];
      segments.push({ start: previous, end, t0: segment.c1 ? [segment.c1[0] - from[0], segment.c1[1] - from[1]] : [0, 0], t1: segment.c2 ? [segment.c2[0] - to[0], segment.c2[1] - to[1]] : [0, 0] });
      loop.push(segments.length - 1);
      previous = end;
    });
    if (sub.closed && previous !== first) { segments.push({ start: previous, end: first, t0: [0, 0], t1: [0, 0] }); loop.push(segments.length - 1); }
    loops.push(sub.closed && loop.length ? loop : null);
  }
  const regions = (groups ?? loops.map((loop, index) => ({ subpaths: [index], evenOdd: false })))
    .map((group) => ({ flag: group.evenOdd ? 0 : 1, loops: group.subpaths.map((index) => loops[index]).filter(Boolean) }))
    .filter((region) => region.loops.length);
  const size = 12 + vertices.length * 12 + segments.length * 28 + regions.reduce((sum, region) => sum + 8 + region.loops.reduce((n, loop) => n + 4 + loop.length * 4, 0), 0);
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  let at = 0;
  const u32 = (v) => { view.setUint32(at, v, true); at += 4; };
  const f32 = (v) => { view.setFloat32(at, v, true); at += 4; };
  u32(vertices.length); u32(segments.length); u32(regions.length);
  for (const [x, y] of vertices) { u32(0); f32(x - dx); f32(y - dy); }
  for (const segment of segments) { u32(0); u32(segment.start); f32(segment.t0[0]); f32(segment.t0[1]); u32(segment.end); f32(segment.t1[0]); f32(segment.t1[1]); }
  for (const region of regions) { u32(region.flag); u32(region.loops.length); for (const loop of region.loops) { u32(loop.length); for (const index of loop) u32(index); } }
  return bytes;
}

/** A vector's node fields for subpaths: its size and offset (the shape's bounds) and the network (`options`: vectorNetwork's). */
function vectorFields(subpaths, options) {
  const { minX, minY, maxX, maxY } = pathBounds(subpaths);
  const size = { x: Math.max(0.01, maxX - minX), y: Math.max(0.01, maxY - minY) };
  return { minX, minY, size, vectorData: { vectorNetworkBlob: { blob: base64Of(vectorNetwork(subpaths, minX, minY, options)) }, normalizedSize: size } };
}

/** Whether a laid-out frame (Figma's fields) hugs its content along x and y: an unset primary sizing hugs. */
function hugsOf(node) {
  const mode = node.stackMode ?? "NONE";
  if (mode === "NONE") return { hugW: false, hugH: false };
  const horizontal = mode === "HORIZONTAL" || mode === "GRID";
  const primary = node.stackPrimarySizing !== "FIXED", counter = /^RESIZE_TO_FIT/.test(node.stackCounterSizing ?? "");
  return horizontal ? { hugW: primary, hugH: counter } : { hugW: counter, hugH: primary };
}

/** The importer's short name for a layer: a set's first segment, a primitive's last (studio-import.js layerKey). */
export function layerKey(name) {
  const text = String(name ?? "");
  if (text.indexOf("/") < 0) return text;
  const parts = text.replace(/^\./, "").split("/").filter(Boolean);
  return parts[0] === "Primitives" ? parts[parts.length - 1].replace(/-\d+$/, "") : parts[0];
}

/** The pack read for lookups: each symbol's rows as a tree, names to ids. */
export function indexPack(pack) {
  const trees = new Map();
  const byName = new Map();
  for (const [id, symbol] of Object.entries(pack.symbols)) if (!symbol.set && !byName.has(symbol.name)) byName.set(symbol.name, id);
  for (const [id, set] of Object.entries(pack.sets)) if (!byName.has(set.name)) byName.set(set.name, id);
  const tree = (id) => {
    if (trees.has(id)) return trees.get(id);
    const symbol = pack.symbols[id];
    if (!symbol) return null;
    const rows = symbol.nodes.map(([rowId, parent, type, name, visible, w, h, x, y, main, refs, more]) => ({ id: rowId, parent, type, name, visible: visible !== 0, w, h, x, y, main: main || "", refs: refs || [], more: more || {}, children: [] }));
    const roots = [];
    rows.forEach((row, index) => (row.parent < 0 ? roots : rows[row.parent].children).push(index));
    const entry = { id, ...symbol, rows, roots };
    trees.set(id, entry);
    return entry;
  };
  return { pack, tree, byName, styles: pack.styles, variables: pack.variables };
}

/**
 * A guidPath under one component (`from`) as the same layers under another (`to`), by their names from the root, level
 * by level through nested instances; a lone layer of a kind (an icon's one Vector) matches when the names differ.
 */
function matchLayers(index, from, to, rel) {
  const namesOf = (tree, row) => { const out = []; for (let r = row; r; r = r.parent < 0 ? null : tree.rows[r.parent]) out.unshift(r.name); return out.join("/"); };
  const out = [];
  for (const step of rel) {
    if (!from || !to) return null;
    const row = from.rows.find((r) => r.id === step);
    if (!row) return null;
    const names = namesOf(from, row);
    let match = to.rows.find((r) => namesOf(to, r) === names);
    if (!match) { const same = to.rows.filter((r) => r.type === row.type); if (same.length === 1 && from.rows.filter((r) => r.type === row.type).length === 1) match = same[0]; }
    if (!match) return null;
    out.push(match.id);
    from = index.tree(row.main);
    to = index.tree(match.main);
  }
  return out;
}

/** A variant's property values from its name ("Size=Small, Level=Primary"). */
const variantValues = (name) => Object.fromEntries(String(name).split(",").map((part) => part.split("=").map((s) => s.trim())).filter((pair) => pair.length === 2));
const variantOf = (options, on) => options.find((option) => (on ? ["yes", "true", "on"] : ["no", "false", "off"]).includes(String(option).toLowerCase())) ?? null;

// --- pictures (image fills, F8: tools/studio/figma-image.mjs) -------------------------------------------------------

/** A picture file's type and pixel size from its header (PNG, JPEG, GIF, WebP: what Figma's image paint takes), or null. */
export function pictureKind(bytes) {
  const u16 = (at) => (bytes[at] << 8) | bytes[at + 1];
  const u16le = (at) => bytes[at] | (bytes[at + 1] << 8);
  const u24le = (at) => bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
  const u32 = (at) => ((bytes[at] << 24) >>> 0) + (bytes[at + 1] << 16) + (bytes[at + 2] << 8) + bytes[at + 3];
  const ascii = (at, length) => String.fromCharCode(...bytes.subarray(at, at + length));
  if (bytes.length >= 24 && bytes[0] === 0x89 && ascii(1, 3) === "PNG") return { mime: "image/png", width: u32(16), height: u32(20) };
  if (bytes.length >= 10 && ascii(0, 4) === "GIF8") return { mime: "image/gif", width: u16le(6), height: u16le(8) };
  if (bytes.length >= 30 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
    const chunk = ascii(12, 4);
    if (chunk === "VP8X") return { mime: "image/webp", width: 1 + u24le(24), height: 1 + u24le(27) };
    if (chunk === "VP8L") return { mime: "image/webp", width: 1 + (((bytes[22] & 0x3f) << 8) | bytes[21]), height: 1 + (((bytes[24] & 0x0f) << 10) | (bytes[23] << 2) | ((bytes[22] & 0xc0) >> 6)) };
    return { mime: "image/webp", width: u16le(26) & 0x3fff, height: u16le(28) & 0x3fff };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    // The first start-of-frame segment (SOF0…SOF15 but DHT, JPG and DAC) holds the size.
    for (let at = 2; at + 9 < bytes.length;) {
      if (bytes[at] !== 0xff) break;
      const marker = bytes[at + 1];
      if (marker === 0xff) { at += 1; continue; }
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { mime: "image/jpeg", width: u16(at + 7), height: u16(at + 5) };
      at += marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 ? 2 : 2 + u16(at + 2);
    }
    return { mime: "image/jpeg", width: 0, height: 0 };
  }
  return null;
}

/** A picture's layer name in Figma: its file name without the extension (Figma's own when a file is placed). */
const pictureName = (src) => { const file = decodeURIComponent(String(src).split(/[?#]/)[0].split("/").pop() || ""); return file.replace(/\.[a-z0-9]+$/i, "") || "Image"; };

/**
 * The export's pictures (`pkg.images`: src → base64 bytes) as Figma names them: an image paint holds the SHA-1 of the
 * bytes, and the bytes ride in the message's blobs (Image.dataBlob). Figma desktop placed fresh PNG, JPEG and GIF
 * pictures sent so, never one named only by a URL in the meta (a data: or local http URL: test pastes, 2026-10-19), nor
 * a WebP: `toPng` (the Studio's canvas) turns a WebP into PNG. A picture the paste cannot take has a reason.
 */
export async function nativePictures(images, { toPng = null } = {}) {
  const out = new Map();
  for (const [src, data] of Object.entries(images ?? {})) {
    if (typeof data !== "string" || !data) continue;
    let bytes = bytesOf(data);
    let kind = pictureKind(bytes);
    if (!kind) { out.set(src, { reason: "not a PNG, JPEG, GIF or WebP" }); continue; }
    if (kind.mime === "image/webp") {
      let png = null;
      try { png = toPng ? await toPng(bytes, kind.mime) : null; } catch { png = null; }
      if (!png || pictureKind(png)?.mime !== "image/png") { out.set(src, { reason: "a WebP (Figma's paste takes PNG, JPEG and GIF pictures)" }); continue; }
      bytes = png;
      kind = pictureKind(png);
    }
    const hash = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-1", bytes));
    const hex = Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("");
    out.set(src, { hash: Array.from(hash), hex, name: pictureName(src), width: kind.width, height: kind.height, bytes });
  }
  return out;
}

/** A Studio Shape's node type → Figma's (its clipboard names) and the layer name Figma gives a drawn one. */
const SHAPE_TYPES = { RECTANGLE: ["ROUNDED_RECTANGLE", "Rectangle"], ELLIPSE: ["ELLIPSE", "Ellipse"], LINE: ["LINE", "Line"], POLYGON: ["REGULAR_POLYGON", "Polygon"], STAR: ["STAR", "Star"], VECTOR: ["VECTOR", "Vector"], BOOLEAN_OPERATION: ["BOOLEAN_OPERATION", "Union"] };
/** figma-push's boolean operations → Figma's clipboard enum (Exclude is XOR). */
const BOOLEAN_OPERATIONS = { UNION: "UNION", SUBTRACT: "SUBTRACT", INTERSECT: "INTERSECT", EXCLUDE: "XOR" };
/** figma-image.mjs scale modes → Figma's (its Crop is STRETCH with the shown part as the paint's transform). */
const IMAGE_SCALE_MODES = { FILL: "FILL", FIT: "FIT", CROP: "STRETCH", TILE: "TILE" };
const IMAGE_FITS = Object.fromEntries(Object.entries(IMAGE_SCALE_MODES).map(([fit, mode]) => [mode, fit]));
/** A component layer's fills when it shows a picture (the pack's `img`; a slot content's own fills), or null. */
const pictureFillsOf = (ref) => (ref.kind === "row" ? ref.row.more.img ?? null : (ref.tmpl.fillPaints ?? []).some((paint) => paint.type === "IMAGE") ? ref.tmpl.fillPaints : null);
/** An `imageFill` as Figma's IMAGE paint (the fields of Figma's own copy of a placed picture, 2026-10-19). */
export function imagePaint(fill, picture) {
  const mode = IMAGE_SCALE_MODES[fill.scaleMode] ?? "FILL";
  const crop = mode === "STRETCH" && fill.crop ? fill.crop : null;
  const unit = (value, fallback) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback);
  const ref = { hash: picture.hash, name: picture.name };
  return {
    type: "IMAGE", opacity: 1, visible: true, blendMode: "NORMAL",
    // The plugin's imageTransform [[w, 0, x], [0, h, y]]: the part of the picture the layer shows, in fractions.
    transform: crop ? { m00: unit(crop.width, 1) || 1, m01: 0, m02: unit(crop.x, 0), m10: 0, m11: unit(crop.height, 1) || 1, m12: unit(crop.y, 0) } : IDENTITY,
    image: ref, imageThumbnail: { ...ref }, animationFrame: 0, imageScaleMode: mode, imageShouldColorManage: true, rotation: 0,
    scale: mode === "TILE" && fill.scale > 0 ? fill.scale : 1,
    ...(picture.width && picture.height ? { originalImageWidth: picture.width, originalImageHeight: picture.height } : {}),
    thumbHash: [], altText: "",
  };
}

/** A layer turned (degrees, counter-clockwise) and flipped about its centre at x, y, w, h: R(θ)·S (the importer's turnAboutCentre). */
function turned(x, y, w, h, degrees, flip) {
  const r = ((degrees || 0) * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r);
  const sx = flip === "horizontal" || flip === "both" ? -1 : 1, sy = flip === "vertical" || flip === "both" ? -1 : 1;
  const a = cos * sx, c = sin * sy, b = -sin * sx, d = cos * sy;
  const cx = x + w / 2, cy = y + h / 2;
  return { m00: a, m01: c, m02: cx - (a * w / 2 + c * h / 2), m10: b, m11: d, m12: cy - (b * w / 2 + d * h / 2) };
}

class Writer {
  constructor(pkg, index, pictures = new Map()) {
    this.pkg = pkg;
    this.index = index;
    this.pictures = pictures;
    /** The pictures this paste uses: hash → bytes (one message blob each). */
    this.pictureBytes = new Map();
    /** Page-local components (planLocals): by the page's component id, and by their spec. */
    this.locals = new Map();
    this.localSpecs = new Map();
    /** The main whose layers are being written (their property refs name its definitions). */
    this.mainNow = null;
    /** Each written parent's children in order, and the main layers bound to a property (key → [defId, field]). */
    this.kids = new Map();
    this.bound = new Map();
    this.pendingOverrides = [];
    this.notes = [];
    this.next = 1;
    this.scene = [];
    this.internal = [];
    this.symbolsUsed = new Set();
    this.order = new Map();
    this.materialized = [];
    this.childCache = new Map();
  }
  /** Indexes of a content node's children (contents list nodes depth first, each with its parent's index). */
  childIndexes(template, index) {
    if (!this.childCache.has(template)) {
      const map = new Map();
      this.index.pack.contents[template].forEach((node, i) => { if (!map.has(node.p)) map.set(node.p, []); map.get(node.p).push(i); });
      this.childCache.set(template, map);
    }
    return this.childCache.get(template).get(index) ?? [];
  }
  /** Layers appended inside a copied content node (the importer's edits.append on a frame). */
  appendTo(node, specs) {
    const info = { mode: node.stackMode ?? "NONE", w: node.size?.x, h: node.size?.y, internal: true, ...hugsOf(node) };
    for (const spec of specs) this.build(spec, node.guid, info);
  }
  /** Copied contents: their instances take their builds' final state; all go to the internal canvas. */
  finishContents() {
    for (let i = 0; i < this.materialized.length; i++) {
      const record = this.materialized[i];
      record.nodes.forEach((node, index) => {
        const sub = record.build.subs.get(`${record.content.key}#${index}`);
        if (!sub) { if (node.type === "INSTANCE") this.symbolsUsed.add(key(node.symbolData.symbolID)); return; }
        this.symbolsUsed.add(sub.symbol);
        node.symbolData = { ...node.symbolData, symbolID: guid(sub.symbol), symbolOverrides: sub.overridesList(sub.symbol) };
        if (sub.assignments.length) node.componentPropAssignments = sub.assignments; else delete node.componentPropAssignments;
      });
      this.internal.push(...record.nodes);
    }
  }
  fresh() { return { sessionID: SESSION, localID: this.next++ }; }
  place(parent) { const k = key(parent); const i = this.order.get(k) ?? 0; this.order.set(k, i + 1); return position(i); }
  note(text) { this.notes.push(text); }

  variable(name) {
    const variables = this.index.variables;
    const found = variables[name] ?? variables[`Color/${name}`] ?? (name.startsWith("Color/") ? variables[name.slice(6)] : null);
    if (!found) this.note(`no variable ${name}`);
    return found ? found[0] : null;
  }
  style(name, where) {
    const found = this.index.styles[name];
    if (!found) this.note(`${where}: no style ${name}`);
    return found ?? null;
  }
  paint(name, where) {
    const id = this.variable(name);
    if (!id) return [];
    return [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1, visible: true, blendMode: "NORMAL", colorVar: aliasOf(id, "COLOR") }];
  }
  bindings(entries) {
    const list = entries.filter(([, name]) => name).map(([field, name, type]) => [field, this.variable(name), type]).filter(([, id]) => id);
    return list.length ? { parameterConsumptionMap: { entries: list.map(([variableField, id, type]) => ({ variableData: aliasOf(id, type ?? "FLOAT"), variableField })) } } : {};
  }

  /** Every node of a spec under `parent` (a guid), at `index` among its siblings. */
  build(spec, parent, parentInfo) {
    const node = this.buildNode(spec, parent, parentInfo);
    if (node && spec.propRefs) this.bindProps(node, spec);
    if (spec.slot) this.note(`${spec.name || spec.type}: a slot in a page's component is not in a direct paste yet (Import from Studio makes it)`);
    return node;
  }
  buildNode(spec, parent, parentInfo) {
    const where = spec.name || spec.type;
    if (spec.type === "COMPONENT_SET") return this.componentSet(spec, parent, parentInfo);
    if (spec.type === "COMPONENT") return this.component(spec, parent, parentInfo);
    if (spec.type === "INSTANCE" && spec.local) return this.localInstance(spec, parent, parentInfo);
    if (spec.type === "FRAME") return this.frame(spec, parent, parentInfo);
    if (spec.type === "TEXT") return this.text(spec, parent, parentInfo);
    // A Studio Shape (figma-push shapeNode, `shape: true`) as Figma's own rectangle or ellipse; a chart mark's ELLIPSE
    // (an arc painted with styles) below.
    if (spec.shape && SHAPE_TYPES[spec.type]) return this.shape(spec, parent, parentInfo);
    if (spec.shape) { this.note(`${where}: a ${String(spec.type).toLowerCase()} shape is not in a direct paste yet (Import from Studio places it)`); return null; }
    if (spec.type === "ELLIPSE") return this.ellipse(spec, parent, parentInfo);
    if (spec.type === "INSTANCE") return this.instance(spec, parent, parentInfo);
    if (spec.type === "VECTOR") return this.vector(spec, parent, parentInfo);
    this.note(`${where}: ${spec.type} is not placed`);
    return null;
  }

  push(node, parentInfo) {
    (parentInfo?.internal ? this.internal : this.scene).push(node);
    const parent = node.parentIndex ? key(node.parentIndex.guid) : null;
    if (parent) { if (!this.kids.has(parent)) this.kids.set(parent, []); this.kids.get(parent).push(node); }
    return node;
  }

  /** The sizing a node takes in its parent (the importer's applyPlacement) as Figma's child fields. */
  /**
   * Fill along an axis only where the parent has room to give. Along a parent's main axis, a parent that hugs gives none
   * (CSS: a percentage in a shrink-to-fit box is the content's size; Figma collapses such a child), so the child hugs.
   * Across it, Figma stretches a child to the tallest sibling even in a hugging parent (a sidebar beside the content).
   */
  fills(spec, parentInfo) {
    const mode = parentInfo?.mode ?? "NONE";
    return { w: !!spec.fillW && !(mode === "HORIZONTAL" && parentInfo?.hugW), h: !!spec.fillH && !(mode === "VERTICAL" && parentInfo?.hugH) };
  }
  childFields(spec, parentInfo, ownMode) {
    const out = {};
    const parentMode = parentInfo?.mode ?? "NONE";
    const fill = this.fills(spec, parentInfo);
    if (parentMode === "HORIZONTAL" || parentMode === "VERTICAL") {
      const along = parentMode === "HORIZONTAL" ? fill.w : fill.h;
      const across = parentMode === "HORIZONTAL" ? fill.h : fill.w;
      if (along) out.stackChildPrimaryGrow = 1;
      if (across) out.stackChildAlignSelf = "STRETCH";
    } else if (parentMode === "GRID") {
      // A grid cell fills its track's width by growing and its height by stretching (Figma's copy of the plugin's
      // grid cells): one axis no longer fills both (a hugging Segmented grew, cells stretched to the row).
      if (fill.w) out.stackChildPrimaryGrow = 1;
      if (fill.h) out.stackChildAlignSelf = "STRETCH";
      if (spec.cell && parentInfo.tracks) {
        const row = parentInfo.tracks.rows[spec.cell.row], col = parentInfo.tracks.cols[spec.cell.col];
        if (row && col) { out.gridRowAnchor = row; out.gridColumnAnchor = col; }
        if (spec.cell.span > 1) out.gridColumnSpan = spec.cell.span;
      }
    }
    if (spec.minW || spec.minH || spec.maxW || spec.maxH) {
      // Figma writes 0 for the axis without a minimum (its copy of the plugin's import).
      if (spec.minW || spec.minH) out.minSize = { value: { x: spec.minW ?? 0, y: spec.minH ?? 0 } };
      if (spec.maxW || spec.maxH) out.maxSize = { value: { x: spec.maxW ?? UNSET, y: spec.maxH ?? UNSET } };
    }
    if (spec.absolute && parentMode !== "GRID" && parentMode !== "NONE") {
      const box = spec.absolute;
      out.stackPositioning = "ABSOLUTE";
      out.horizontalConstraint = box.cx === "STRETCH" ? "STRETCH" : box.cx === "MAX" ? "MAX" : box.cx === "CENTER" ? "CENTER" : "MIN";
      out.verticalConstraint = box.cy === "STRETCH" ? "STRETCH" : box.cy === "MAX" ? "MAX" : box.cy === "CENTER" ? "CENTER" : "MIN";
    }
    void ownMode;
    return out;
  }

  /** x/y of a node in a free-form parent (a slot's `place` box, or an absolute box), from the parent's size. */
  position(spec, parentInfo, w, h) {
    const box = spec.place;
    if (box && parentInfo) {
      const pw = parentInfo.w ?? 0, ph = parentInfo.h ?? 0;
      return { x: (box.x || 0) * pw - (box.center ? w / 2 : 0), y: (box.y || 0) * ph - (box.center ? h / 2 : 0), w: typeof box.w === "number" ? box.w * pw : w, h: typeof box.h === "number" ? box.h * ph : h };
    }
    const abs = spec.absolute;
    if (abs && parentInfo) {
      const pw = parentInfo.w ?? 0, ph = parentInfo.h ?? 0;
      const width = abs.cx === "STRETCH" ? Math.max(1, pw - abs.left - abs.right) : w;
      const height = abs.cy === "STRETCH" ? Math.max(1, ph - abs.top - abs.bottom) : h;
      const x = abs.cx === "STRETCH" ? abs.left : abs.cx === "MAX" ? pw - width - abs.right : abs.cx === "CENTER" ? (pw - width) / 2 : abs.left;
      const y = abs.cy === "STRETCH" ? abs.top : abs.cy === "MAX" ? ph - height - abs.bottom : abs.cy === "CENTER" ? (ph - height) / 2 : abs.top;
      return { x, y, w: width, h: height };
    }
    return { x: 0, y: 0, w, h };
  }

  /** A first guess at a spec's size (Figma lays the paste out again; centring a hug frame needs its size now). */
  estimate(spec) {
    if (spec.type === "TEXT") {
      const font = (spec.textStyle && this.index.styles[spec.textStyle]?.[2]) || {};
      const size = font.fontSize ?? 14;
      return { w: Math.max(1, String(spec.characters ?? "").length * size * 0.55), h: font.lineHeight?.units === "PIXELS" ? font.lineHeight.value : Math.round(size * 1.4) };
    }
    if (spec.type === "INSTANCE") {
      const tree = this.index.tree(this.mainFor(spec.set) ?? "");
      return { w: spec.size || spec.fixedWidth || tree?.w || 100, h: spec.size || tree?.h || 40 };
    }
    // A free frame (layoutMode NONE) and a grid: their own size (a free frame's layers float, they size nothing).
    if (spec.type !== "FRAME" || !spec.layout || spec.layout.mode === "GRID" || spec.layout.mode === "NONE") return { w: spec.fixedWidth || 100, h: spec.fixedHeight || 100 };
    const kids = (spec.children ?? []).filter((child) => !child.absolute).map((child) => this.estimate(child));
    const [top, right, bottom, left] = spec.layout.padding ?? [0, 0, 0, 0];
    const gap = (spec.layout.gap || 0) * Math.max(0, kids.length - 1);
    const horizontal = spec.layout.mode === "HORIZONTAL";
    const along = kids.reduce((sum, kid) => sum + (horizontal ? kid.w : kid.h), 0) + gap;
    const across = kids.reduce((max, kid) => Math.max(max, horizontal ? kid.h : kid.w), 0);
    const w = spec.fixedWidth || (horizontal ? along : across) + left + right, h = spec.fixedHeight || (horizontal ? across : along) + top + bottom;
    return { w: Math.max(1, w), h: Math.max(1, h) };
  }

  /** Auto layout of a frame spec (the importer's applyLayout) as Figma's fields, and the grid's new track ids. */
  layout(spec, frameSpecLayout, sizing) {
    const layout = frameSpecLayout;
    if (!layout) return { fields: {}, mode: "NONE" };
    const grid = layout.mode === "GRID";
    const padding = layout.padding ?? [0, 0, 0, 0];
    const fields = { stackMode: grid ? "GRID" : layout.mode };
    if (padding[0]) fields.stackVerticalPadding = padding[0];
    if (padding[1]) fields.stackPaddingRight = padding[1];
    if (padding[2]) fields.stackPaddingBottom = padding[2];
    if (padding[3]) fields.stackHorizontalPadding = padding[3];
    const vars = [];
    const pads = Array.isArray(layout.paddingVars) ? layout.paddingVars : layout.paddingVar ? [layout.paddingVar, layout.paddingVar, layout.paddingVar, layout.paddingVar] : [];
    PADDING_FIELDS.forEach((field, i) => vars.push([field, pads[i]]));
    const rowGap = layout.rowGap == null ? layout.gap || 0 : layout.rowGap;
    let tracks = null;
    if (grid) {
      const columns = layout.grid?.columns || 1, rows = layout.grid?.rows || 1;
      const cols = Array.from({ length: columns }, () => this.fresh()), rowIds = Array.from({ length: rows }, () => this.fresh());
      const track = (size) => {
        const type = size?.type === "FIXED" ? "FIXED" : size?.type === "HUG" ? "HUG" : "FLEX";
        const value = type === "HUG" ? 1 : Math.max(0.01, Number(size?.value ?? 1) || 0);
        return { minSizing: { type, value }, maxSizing: { type, value } };
      };
      fields.gridColumns = { entries: cols.map((id, i) => ({ id, position: position(i) })) };
      fields.gridRows = { entries: rowIds.map((id, i) => ({ id, position: position(i) })) };
      fields.gridColumnsSizing = { entries: cols.map((id, i) => ({ id, trackSize: track(layout.grid?.sizes?.[i]) })) };
      fields.gridRowsSizing = { entries: rowIds.map((id, i) => { const size = layout.grid?.rowSizes?.[i]; return { id, trackSize: track(size && size.type === "FLEX" ? size : { type: "HUG" }) }; }) };
      fields.gridColumnGap = layout.gap || 0;
      fields.gridRowGap = rowGap;
      vars.push(["GRID_COLUMN_GAP", layout.gapVar], ["GRID_ROW_GAP", layout.rowGapVar || layout.gapVar]);
      tracks = { cols, rows: rowIds };
    } else {
      if (layout.gap) fields.stackSpacing = layout.gap;
      vars.push(["STACK_SPACING", layout.gapVar]);
      // The Plugin API's SPACE_BETWEEN is SPACE_EVENLY in Figma's own data (its SPACE_BETWEEN is another value).
      if (layout.primary && layout.primary !== "MIN") fields.stackPrimaryAlignItems = layout.primary === "SPACE_BETWEEN" ? "SPACE_EVENLY" : layout.primary;
      if (layout.counter && layout.counter !== "MIN") fields.stackCounterAlignItems = layout.counter;
      if (layout.mode === "HORIZONTAL" && layout.wrap) {
        fields.stackWrap = "WRAP";
        if (rowGap) fields.stackCounterSpacing = rowGap;
        vars.push(["STACK_COUNTER_SPACING", layout.rowGapVar || layout.gapVar]);
      }
    }
    // Hug or fixed along the frame's own axes (a grid's primary axis is its width).
    const horizontalPrimary = grid || layout.mode === "HORIZONTAL";
    const primaryHug = horizontalPrimary ? sizing.w === "HUG" : sizing.h === "HUG";
    const counterHug = horizontalPrimary ? sizing.h === "HUG" : sizing.w === "HUG";
    fields.stackPrimarySizing = primaryHug ? "RESIZE_TO_FIT_WITH_IMPLICIT_SIZE" : "FIXED";
    fields.stackCounterSizing = counterHug ? "RESIZE_TO_FIT_WITH_IMPLICIT_SIZE" : "FIXED";
    return { fields, vars, mode: fields.stackMode, tracks };
  }

  frame(spec, parent, parentInfo, { root = false, id: given = null } = {}) {
    const id = given ?? this.fresh();
    const fill = this.fills(spec, parentInfo);
    const sizing = root ? { w: "FIXED", h: "HUG" } : { w: fill.w ? "FILL" : spec.fixedWidth ? "FIXED" : "HUG", h: fill.h ? "FILL" : "HUG" };
    const { fields, vars = [], mode, tracks } = this.layout(spec, spec.layout, sizing);
    const guess = root ? { w: this.pkg.frame.width || 1440, h: 100 } : this.estimate(spec);
    const w = guess.w, h = guess.h;
    const pos = this.position(spec, parentInfo, w, h);
    const node = {
      guid: id, phase: "CREATED", parentIndex: { guid: parent, position: this.place(parent) }, type: "FRAME", name: spec.name || "Stack", visible: true, opacity: 1,
      size: { x: pos.w, y: pos.h }, transform: at(pos.x, pos.y), ...FRAME_FIELDS,
      fillPaints: spec.fill ? this.paint(spec.fill, spec.name) : [],
      frameMaskDisabled: spec.clip !== true,
      ...fields,
      ...(root ? {} : this.childFields(spec, parentInfo)),
      // The page frame's own minimum (the Screen's height): no parent to place it in, but its size limits apply.
      ...(root && spec.minH ? { minSize: { value: { x: 0, y: spec.minH } } } : {}),
    };
    if (spec.fillStyle) { const style = this.style(spec.fillStyle, spec.name); if (style) node.styleIdForFill = { guid: guid(style[0]) }; }
    if (typeof spec.radius === "number") {
      for (const corner of ["rectangleTopLeftCornerRadius", "rectangleTopRightCornerRadius", "rectangleBottomLeftCornerRadius", "rectangleBottomRightCornerRadius"]) node[corner] = spec.radius;
      node.rectangleCornerRadiiIndependent = true;
      if (spec.radiusVar) vars.push(["RECTANGLE_TOP_LEFT_CORNER_RADIUS", spec.radiusVar], ["RECTANGLE_TOP_RIGHT_CORNER_RADIUS", spec.radiusVar], ["RECTANGLE_BOTTOM_LEFT_CORNER_RADIUS", spec.radiusVar], ["RECTANGLE_BOTTOM_RIGHT_CORNER_RADIUS", spec.radiusVar]);
    }
    if (spec.scroll && spec.scroll !== "NONE") node.scrollDirection = spec.scroll;
    if (typeof spec.strokeBottom === "number") { node.borderBottomWeight = spec.strokeBottom; node.borderTopWeight = 0; node.borderLeftWeight = 0; node.borderRightWeight = 0; node.borderStrokeWeightsIndependent = true; }
    Object.assign(node, this.bindings(vars));
    if (spec.fill) node.fillPaints = this.paint(spec.fill, spec.name);
    this.imageFill(node, spec, spec.name || "Frame");
    this.push(node, parentInfo);
    const info = { mode, tracks, w: pos.w, h: pos.h, internal: parentInfo?.internal, hugW: mode !== "NONE" && sizing.w === "HUG", hugH: mode !== "NONE" && sizing.h === "HUG" };
    for (const child of spec.children ?? []) this.build(child, id, info);
    return node;
  }

  text(spec, parent, parentInfo) {
    const id = this.fresh();
    const style = spec.textStyle ? this.style(spec.textStyle, `Text "${spec.characters}"`) : null;
    const font = style?.[2] ?? { fontName: { family: "Inter", style: "Regular", postscript: "Inter-Regular" }, fontSize: 14, lineHeight: { value: 20, units: "PIXELS" } };
    const characters = String(spec.characters ?? "");
    const size = font.fontSize ?? 14;
    const w = Math.max(1, Math.round(characters.length * size * 0.56)), h = font.lineHeight?.units === "PIXELS" ? font.lineHeight.value : Math.round(size * 1.4);
    const pos = this.position(spec, parentInfo, w, h);
    const node = {
      guid: id, phase: "CREATED", parentIndex: { guid: parent, position: this.place(parent) }, type: "TEXT", name: spec.name || characters.slice(0, 40) || "Text", visible: true, opacity: 1,
      size: { x: pos.w, y: pos.h }, transform: at(pos.x, pos.y), ...TEXT_FIELDS, ...font, textData: textData(characters),
      textAutoResize: this.fills(spec, parentInfo).w ? "HEIGHT" : "WIDTH_AND_HEIGHT", autoRename: !spec.name,
      textAlignHorizontal: spec.align || "LEFT",
      fillPaints: spec.fill ? this.paint(spec.fill, `Text "${characters}"`) : [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1, visible: true, blendMode: "NORMAL" }],
      ...this.childFields(spec, parentInfo),
    };
    if (style) node.styleIdForText = { guid: guid(style[0]) };
    const runs = this.textRuns(spec, font, characters);
    if (runs) node.textData = { ...node.textData, ...runs };
    return this.push(node, parentInfo);
  }

  /**
   * Words with styles of their own (TextRun; figma-push `segments`, text-runs.mjs) as Figma keeps them: a style id per
   * character and the table of what each id changes (a text style, the font for bold / italic, a decoration, a colour
   * variable). Bold is the font of Zen's Bold text styles (Inter Semi Bold), as TextRun's emphasis weight.
   */
  textRuns(spec, base, characters) {
    if (!Array.isArray(spec.segments) || !spec.segments.length) return null;
    const ids = new Array(characters.length).fill(0);
    const table = [];
    const emphasis = this.index.styles["Body/Base/Bold"]?.[2]?.fontName?.style ?? "Semi Bold";
    spec.segments.forEach((segment, index) => {
      const styleID = index + 1;
      const own = segment.textStyle ? this.style(segment.textStyle, `Text "${characters}"`) : null;
      const fields = own ? { styleIdForText: { guid: guid(own[0]) }, ...structuredClone(own[2]) } : {};
      const font = fields.fontName ?? base.fontName;
      let weight = font.style.replace(/\s*Italic$/i, "") || "Regular";
      if (weight === "Italic") weight = "Regular";
      if (segment.bold && !/bold|black|heavy/i.test(weight)) weight = emphasis;
      const italic = segment.italic || /italic/i.test(font.style);
      const fontStyle = italic ? (weight === "Regular" ? "Italic" : `${weight} Italic`) : weight;
      if (fontStyle !== font.style) fields.fontName = { family: font.family, style: fontStyle, postscript: `${font.family.replace(/\s+/g, "")}-${fontStyle.replace(/\s+/g, "")}` };
      if (segment.decoration) fields.textDecoration = segment.decoration;
      if (segment.fill) fields.fillPaints = this.paint(segment.fill, `Text "${characters}"`);
      if (!Object.keys(fields).length) return;
      table.push({ styleID, ...fields });
      for (let at = Math.max(0, segment.start); at < Math.min(characters.length, segment.end); at += 1) ids[at] = styleID;
    });
    return table.length ? { characterStyleIDs: ids, styleOverrideTable: table } : null;
  }

  /** Paint style fields: the style's id and its paints (Figma shows the paints; the id keeps them bound). */
  paintStyle(name, where) {
    const style = this.style(name, where);
    return style ? { id: { guid: guid(style[0]) }, paints: structuredClone(style[2]?.fillPaints ?? []) } : null;
  }
  /** A path (the importer's VECTOR with `d`, `box`, `place`), scaled into its free-form parent. */
  vector(spec, parent, parentInfo) {
    const box = spec.place ?? { x: 0, y: 0, w: 1, h: 1 };
    const pw = parentInfo?.w ?? spec.box?.w ?? 100, ph = parentInfo?.h ?? spec.box?.h ?? 100;
    const sx = (typeof box.w === "number" ? box.w : 1) * pw / (spec.box?.w || 100), sy = (typeof box.h === "number" ? box.h : 1) * ph / (spec.box?.h || 100);
    const shape = vectorFields(parsePath(spec.d, sx, sy));
    const node = {
      guid: this.fresh(), phase: "CREATED", parentIndex: { guid: parent, position: this.place(parent) }, type: "VECTOR", name: spec.name || "Slice", visible: true, opacity: 1,
      size: shape.size, transform: at((box.x || 0) * pw + shape.minX, (box.y || 0) * ph + shape.minY), vectorData: shape.vectorData,
      strokeWeight: typeof spec.strokeWeight === "number" ? spec.strokeWeight : 1, strokeAlign: "CENTER", strokeJoin: spec.strokeJoin || "ROUND", fillPaints: [], strokePaints: [],
    };
    const fill = spec.fillStyle ? this.paintStyle(spec.fillStyle, node.name) : null;
    if (fill) { node.styleIdForFill = fill.id; node.fillPaints = fill.paints; }
    const stroke = spec.strokeStyle ? this.paintStyle(spec.strokeStyle, node.name) : null;
    if (stroke) { node.styleIdForStrokeFill = stroke.id; node.strokePaints = stroke.paints; }
    return this.push(node, parentInfo);
  }
  /** The importer's `vector` edit: a polyline from the points of `vector.d`, scaled to the layer's parent. */
  reshape(node, parentSize, vector) {
    const sx = vector.w ? parentSize.x / vector.w : 1, sy = vector.h ? parentSize.y / vector.h : 1;
    const numbers = String(vector.d).match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
    const points = [];
    for (let i = 0; i + 1 < numbers.length; i += 2) points.push([Number(numbers[i]) * sx, Number(numbers[i + 1]) * sy]);
    if (!points.length) return;
    const shape = vectorFields([{ start: points[0], segments: points.slice(1).map((to) => ({ to })), closed: /z/i.test(String(vector.d)) }]);
    node.vectorData = shape.vectorData;
    node.size = shape.size;
    node.transform = { ...(node.transform ?? IDENTITY), m02: shape.minX, m12: shape.minY };
    delete node.fillGeometry;
    delete node.strokeGeometry;
  }

  /**
   * A layer's picture (`imageFill`, figma-image.mjs) as Figma's IMAGE paint over its colour (the importer's
   * applyImageFill), its bytes a blob of the message (nativeMessage gives `dataBlob` its index). The Studio src rides as the importer's shared plugin data
   * ("zenstudio", "image") for the pull: Figma keeps shared data as an entry with no plugin id, keyed "namespace-key"
   * (its own copy of such a layer, 2026-10-19).
   */
  imageFill(node, spec, where) {
    const fill = spec.imageFill;
    if (!fill?.src) return;
    const picture = this.pictureFor(fill.src, where);
    if (!picture) return;
    node.fillPaints = [...(node.fillPaints ?? []), this.picturePaint(fill, picture)];
    // The paints are the layer's own now (setting fills detaches a fill style in Figma too).
    delete node.styleIdForFill;
    node.pluginData = [...(node.pluginData ?? []), { pluginID: "", key: "zenstudio-image", value: String(fill.src) }];
  }

  /** The export's picture `src` (its bytes go into the message as a blob), or null with a note. */
  pictureFor(src, where) {
    const picture = this.pictures.get(src);
    if (!picture?.hash) { this.note(`${where}: ${picture?.reason ? `its picture is ${picture.reason}` : `its picture was not in the export (${src})`}`); return null; }
    this.pictureBytes.set(picture.hex, picture.bytes);
    return picture;
  }
  /** An `imageFill`'s IMAGE paint whose image and thumbnail name the picture's blob (nativeMessage gives it its index). */
  picturePaint(fill, picture) {
    const paint = imagePaint(fill, picture);
    paint.image.dataBlob = paint.imageThumbnail.dataBlob = { picture: picture.hex };
    return paint;
  }

  /**
   * A Studio Shape (figma-push shapeNode, the importer's `spec.shape` branch) as Figma's own layer, written as Figma's
   * copy of the importer's layers writes it (2026-10-20): its px size (a line: its length, no height), Color/Background
   * fill and Color/Border stroke variables, opacity, rotation and flip about its centre, and its picture; a rectangle's
   * Corner-Radius variable, an ellipse's arc, an arrow's end cap, a polygon's or star's count and a star's inner radius,
   * a path's vector network from `vectorPaths` (sized to its curve, where the Studio box puts it), a boolean group's
   * operation over its shapes.
   */
  shape(spec, parent, parentInfo) {
    const name = spec.name || SHAPE_TYPES[spec.type][1];
    const line = spec.type === "LINE";
    let pos = this.position(spec, parentInfo, spec.fixedWidth ?? 100, line ? 0 : spec.fixedHeight ?? 100);
    let path = null;
    if (spec.type === "VECTOR") {
      // Every vectorPaths entry is one region of its own winding rule; the layer is its curve's bounds in the box.
      const subpaths = [], regions = [];
      for (const entry of spec.vectorPaths ?? []) { const parsed = parsePath(entry.data); regions.push({ subpaths: parsed.map((_, k) => subpaths.length + k), evenOdd: entry.windingRule === "EVENODD" }); subpaths.push(...parsed); }
      if (!subpaths.length) { this.note(`${name}: a path without points is not placed`); return null; }
      path = vectorFields(subpaths, { regions });
      pos = { x: pos.x + path.minX, y: pos.y + path.minY, w: path.size.x, h: path.size.y };
    }
    const node = {
      guid: this.fresh(), phase: "CREATED", parentIndex: { guid: parent, position: this.place(parent) }, type: SHAPE_TYPES[spec.type][0], name, visible: true,
      opacity: typeof spec.opacity === "number" ? spec.opacity : 1, size: { x: pos.w, y: line ? 0 : pos.h },
      transform: (typeof spec.rotation === "number" && spec.rotation) || spec.flip ? turned(pos.x, pos.y, pos.w, line ? 0 : pos.h, spec.rotation, spec.flip) : at(pos.x, pos.y),
      strokeWeight: spec.stroke && typeof spec.strokeWeight === "number" ? spec.strokeWeight : 1, strokeAlign: (spec.stroke && spec.strokeAlign) || (line || path ? "CENTER" : "INSIDE"), strokeJoin: "MITER",
      fillPaints: spec.fill ? this.paint(spec.fill, name) : [], strokePaints: spec.stroke ? this.paint(spec.stroke, name) : [],
      ...this.childFields(spec, parentInfo),
    };
    if (spec.type === "RECTANGLE" && typeof spec.radius === "number") {
      for (const corner of ["rectangleTopLeftCornerRadius", "rectangleTopRightCornerRadius", "rectangleBottomLeftCornerRadius", "rectangleBottomRightCornerRadius"]) node[corner] = spec.radius;
      node.rectangleCornerRadiiIndependent = true;
      if (spec.radiusVar) Object.assign(node, this.bindings(["RECTANGLE_TOP_LEFT_CORNER_RADIUS", "RECTANGLE_TOP_RIGHT_CORNER_RADIUS", "RECTANGLE_BOTTOM_LEFT_CORNER_RADIUS", "RECTANGLE_BOTTOM_RIGHT_CORNER_RADIUS"].map((field) => [field, spec.radiusVar])));
    }
    if (spec.type === "ELLIPSE" && spec.arc) node.arcData = { startingAngle: spec.arc.start || 0, endingAngle: spec.arc.end || 0, innerRadius: spec.arc.inner || 0 };
    if (line && spec.endCap) node.strokeCap = spec.endCap;
    if (spec.type === "POLYGON" || spec.type === "STAR") node.count = typeof spec.pointCount === "number" ? spec.pointCount : spec.type === "STAR" ? 5 : 3;
    if (spec.type === "STAR" && typeof spec.innerRadius === "number") node.starInnerScale = spec.innerRadius;
    if (path) node.vectorData = path.vectorData;
    if (spec.type === "BOOLEAN_OPERATION") { node.booleanOperation = BOOLEAN_OPERATIONS[spec.booleanOperation] ?? "UNION"; node.vectorOperationVersion = 1; }
    if (!line) this.imageFill(node, spec, name);
    this.push(node, parentInfo);
    // A boolean group's shapes, each at its X / Y inside it (Figma combines them).
    if (spec.type === "BOOLEAN_OPERATION") for (const child of spec.children ?? []) this.build(child, node.guid, { mode: "NONE", w: pos.w, h: pos.h, internal: parentInfo?.internal });
    return node;
  }

  ellipse(spec, parent, parentInfo) {
    const pos = this.position(spec, parentInfo, 100, 100);
    const node = {
      guid: this.fresh(), phase: "CREATED", parentIndex: { guid: parent, position: this.place(parent) }, type: "ELLIPSE", name: spec.name || "Arc", visible: true, opacity: 1,
      size: { x: pos.w, y: pos.h }, transform: at(pos.x, pos.y), strokeWeight: spec.strokeWeight ?? 1, strokeAlign: "CENTER", strokeJoin: spec.strokeJoin || "ROUND", fillPaints: [], strokePaints: [],
    };
    const fill = spec.fillStyle ? this.paintStyle(spec.fillStyle, node.name) : null;
    if (fill) { node.styleIdForFill = fill.id; node.fillPaints = fill.paints; }
    const stroke = spec.strokeStyle ? this.paintStyle(spec.strokeStyle, node.name) : null;
    if (stroke) { node.styleIdForStrokeFill = stroke.id; node.strokePaints = stroke.paints; }
    if (spec.arc) node.arcData = { startingAngle: spec.arc.start || 0, endingAngle: spec.arc.end || 0, innerRadius: spec.arc.inner || 0 };
    return this.push(node, parentInfo);
  }

  // --- instances --------------------------------------------------------------------------------------------------

  /** The variant (or lone component) a set reference starts from: Figma's default variant. */
  mainFor(set) {
    const pack = this.index.pack;
    if (set?.id && pack.sets[set.id]) return pack.sets[set.id].variants?.[0] ?? null;
    if (set?.id && pack.symbols[set.id]) return set.id;
    const byName = set?.name ? this.index.byName.get(set.name) : null;
    if (byName) return pack.sets[byName] ? pack.sets[byName].variants?.[0] ?? null : byName;
    return null;
  }
  propsOf(symbolId) {
    const tree = this.index.tree(symbolId);
    if (!tree) return [];
    return tree.set ? this.index.pack.sets[tree.set]?.props ?? [] : tree.props ?? [];
  }
  /** The variant of `symbolId`'s set whose values match `values` (the rest stay as they are). */
  variantWith(symbolId, values) {
    const tree = this.index.tree(symbolId);
    if (!tree?.set || !Object.keys(values).length) return symbolId;
    const want = { ...variantValues(tree.name), ...values };
    const set = this.index.pack.sets[tree.set];
    const match = (set.variants ?? []).find((id) => { const own = variantValues(this.index.pack.symbols[id].name); return Object.keys(want).every((k) => own[k] === want[k]); });
    return match ?? null;
  }
  /** An icon or component by name (INSTANCE_SWAP values, swapIcon). */
  componentNamed(name) {
    const id = this.index.byName.get(String(name));
    if (!id) return null;
    return this.index.pack.sets[id] ? this.index.pack.sets[id].variants?.[0] ?? null : id;
  }

  instance(spec, parent, parentInfo) {
    const where = spec.name || spec.type;
    let main = this.mainFor(spec.set);
    if (!main) return this.placeholder(spec, parent, parentInfo, where);
    const inst = new InstanceBuild(this, main, where);
    inst.applyProps([], spec.props, where);
    main = inst.symbol;
    if (typeof spec.text === "string") inst.label([], spec.text, where);
    inst.texts([], spec, where);
    if (spec.swapIcon) inst.swapIcon([], spec.swapIcon, where);
    for (const nested of spec.nested ?? []) inst.nested(nested, where);
    // After the nested edits: the picture goes to the layer of the variant they show (an Avatar-Cell's Avatar, Photo).
    if (spec.image) inst.picture(spec.image, where);
    const tree = this.index.tree(main);
    const id = this.fresh();
    const w = spec.size || spec.fixedWidth || tree.w, h = spec.size || tree.h;
    const pos = this.position(spec, parentInfo, w, h);
    const node = {
      // No stroke fields: on an instance they override its component's (a nav item's 3px outside ring became 1px inside).
      guid: id, phase: "CREATED", parentIndex: { guid: parent, position: this.place(parent) }, type: "INSTANCE", name: spec.name || tree.name, visible: true, opacity: 1,
      size: { x: pos.w, y: pos.h }, transform: at(pos.x, pos.y),
      symbolData: { symbolID: guid(main), symbolOverrides: [], uniformScaleFactor: 1 },
      ...this.childFields(spec, parentInfo),
    };
    const rootOverride = inst.root;
    if (spec.name) rootOverride.name = spec.name;
    if (spec.size || spec.fixedWidth) rootOverride.size = { x: pos.w, y: pos.h };
    if (node.minSize) rootOverride.minSize = node.minSize;
    if (node.maxSize) rootOverride.maxSize = node.maxSize;
    if (spec.fill) rootOverride.fillPaints = this.paint(spec.fill, where);
    if (spec.sizeVar) consume(rootOverride, "parameterConsumptionMap", this.bindings([["WIDTH", spec.sizeVar], ["HEIGHT", spec.sizeVar]]).parameterConsumptionMap?.entries ?? []);
    // An instance's own padding (a Dashboard header row as the master layout pads it): its self override, values and
    // variables, as Figma's copy of the master's rows keeps them (the node's fields only show the values; a paste of
    // them alone left the row unpadded, 2026-10-17).
    if (Array.isArray(spec.padding)) {
      Object.assign(node, paddingFields(spec.padding));
      Object.assign(rootOverride, paddingFields(spec.padding));
      consume(rootOverride, "parameterConsumptionMap", this.bindings(PADDING_FIELDS.map((field, i) => [field, spec.paddingVars?.[i]])).parameterConsumptionMap?.entries ?? []);
    }
    // Filling an axis its component binds to a variable (the master layout's Viewport-Width) lets the binding go, as
    // Figma's own Fill does: kept, Figma sized the pasted master back to 1512 after laying it out at 1440 (2026-10-17).
    {
      const fill = this.fills(spec, parentInfo);
      const loose = [fill.w && "WIDTH", fill.h && "HEIGHT"].filter((field) => field && tree.bound?.includes(field)).map((variableField) => ({ variableField }));
      if (loose.length) { consume(rootOverride, "parameterConsumptionMap", loose); consume(rootOverride, "variableConsumptionMap", loose); }
    }
    if (typeof spec.strokeBottom === "number") Object.assign(rootOverride, { borderBottomWeight: spec.strokeBottom, borderTopWeight: 0, borderLeftWeight: 0, borderRightWeight: 0, borderStrokeWeightsIndependent: true });
    // Hug or fill along the instance's own axes (the importer's layoutSizing on an instance).
    if (tree.mode && tree.mode !== "NONE") {
      const horizontalPrimary = tree.mode === "HORIZONTAL" || tree.mode === "GRID";
      const fill = this.fills(spec, parentInfo);
      const sizeOf = (axis) => (axis === "w" ? (fill.w ? "FILL" : spec.hugW || spec.fillW ? "HUG" : spec.fixedWidth ? "FIXED" : null) : fill.h ? "FILL" : spec.hugH || spec.fillH ? "HUG" : null);
      const primary = sizeOf(horizontalPrimary ? "w" : "h"), counter = sizeOf(horizontalPrimary ? "h" : "w");
      if (primary) rootOverride.stackPrimarySizing = primary === "HUG" ? "RESIZE_TO_FIT_WITH_IMPLICIT_SIZE" : "FIXED";
      if (counter) rootOverride.stackCounterSizing = counter === "HUG" ? "RESIZE_TO_FIT_WITH_IMPLICIT_SIZE" : "FIXED";
    }
    for (const slot of spec.slots ?? []) inst.slot(slot, where, parentInfo);
    for (const edit of spec.edits ?? []) inst.edit(edit, where, parentInfo);
    for (const hug of spec.hugLayers ?? []) inst.hugLayer(hug, where);
    for (const name of spec.hide ?? []) inst.hide(name, where);
    node.symbolData.symbolID = guid(inst.symbol);
    node.symbolData.symbolOverrides = inst.overridesList(inst.symbol);
    if (inst.assignments.length) node.componentPropAssignments = inst.assignments;
    this.push(node, parentInfo);
    return node;
  }

  placeholder(spec, parent, parentInfo, where) {
    const name = spec.set?.name || spec.name || "Component";
    this.note(`${where}: no component ${name} in the pack (a placeholder keeps its place)`);
    return this.frame({ type: "FRAME", name: `${spec.name || name} — not in the Zen library yet`, layout: { mode: "HORIZONTAL", padding: [8, 12, 8, 12] }, children: [{ type: "TEXT", characters: name }] }, parent, parentInfo);
  }

  /** Slot content: a frame on the internal canvas that the slot's assignment points at. */
  slotContent(slotRow, slotSpec, parentInfo) {
    const id = this.fresh();
    const layout = { ...(slotRow.more.slot ?? {}) };
    delete layout.stackChildAlignSelf; delete layout.stackChildPrimaryGrow; delete layout.stackPositioning; delete layout.detachedSymbolId;
    const frame = {
      guid: id, phase: "CREATED", parentIndex: { guid: INTERNAL, position: this.place(INTERNAL) }, type: "FRAME", name: slotRow.name, isSlotContent: true, visible: true, opacity: 1,
      size: { x: slotRow.w, y: slotRow.h }, transform: at(slotRow.x, slotRow.y), ...FRAME_FIELDS, frameMaskDisabled: true, ...layout,
      overrideKey: { sessionID: 4294967295, localID: 4294967295 },
    };
    if (slotSpec.hugW || slotSpec.hugH || slotSpec.fillW) {
      const horizontalPrimary = frame.stackMode === "HORIZONTAL" || frame.stackMode === "GRID";
      const set = (axis, value) => { if (horizontalPrimary === (axis === "w")) frame.stackPrimarySizing = value; else frame.stackCounterSizing = value; };
      if (slotSpec.hugW) set("w", "RESIZE_TO_FIT_WITH_IMPLICIT_SIZE");
      if (slotSpec.hugH) set("h", "RESIZE_TO_FIT_WITH_IMPLICIT_SIZE");
      if (slotSpec.fillW) set("w", "FIXED");
    }
    this.internal.push(frame);
    const tracks = slotRow.more.cols ? { cols: slotRow.more.cols.map(guid), rows: slotRow.more.rows.map(guid) } : frame.gridColumns ? { cols: frame.gridColumns.entries.map((entry) => entry.id), rows: frame.gridRows.entries.map((entry) => entry.id) } : null;
    const info = { mode: frame.stackMode ?? "NONE", tracks, w: slotRow.w, h: slotRow.h, internal: true, ...hugsOf(frame) };
    for (const child of slotSpec.children ?? []) this.build(child, id, info);
    void parentInfo;
    return id;
  }

  /** The skeleton nodes of every symbol used, and their sets (the internal canvas). */
  // --- page-local components (Studio <Component>, <ComponentSet>, <Use>; figma-push COMPONENT, COMPONENT_SET) --------

  /**
   * Ids for the page's components before anything is written (an instance may come before its main): a lone main's
   * symbol and property definitions; a set's frame, its definitions (variant ones too) and, per variant, its symbol and
   * its own definitions of the set's (Figma's copy of a set: `parentPropDefId`, 2026-10-20).
   */
  planLocals(frame) {
    const walk = (spec) => {
      if (!spec || typeof spec !== "object") return;
      if (spec.type === "COMPONENT_SET") {
        const defs = new Map();
        for (const property of spec.properties ?? []) if (LOCAL_PROP_TYPES[property.type]) defs.set(property.name, { id: this.fresh(), type: LOCAL_PROP_TYPES[property.type], initial: property.default });
        const orders = new Map();
        for (const variant of spec.children ?? []) for (const [name, value] of Object.entries(variant.variant ?? {})) { if (!orders.has(name)) orders.set(name, []); if (!orders.get(name).includes(String(value))) orders.get(name).push(String(value)); }
        const variantDefs = new Map([...orders.keys()].map((name) => [name, this.fresh()]));
        const record = { kind: "set", spec, guid: this.fresh(), defs, orders, variantDefs, variants: [] };
        for (const child of spec.children ?? []) {
          const variant = { kind: "variant", spec: child, set: record, guid: this.fresh(), values: child.variant ?? {}, own: new Map([...defs.keys()].map((name) => [name, this.fresh()])) };
          record.variants.push(variant);
          this.localSpecs.set(child, variant);
        }
        this.localSpecs.set(spec, record);
        if (spec.local) this.locals.set(spec.local, record);
      } else if (spec.type === "COMPONENT" && !this.localSpecs.has(spec)) {
        const defs = new Map();
        for (const property of spec.properties ?? []) if (LOCAL_PROP_TYPES[property.type]) defs.set(property.name, { id: this.fresh(), type: LOCAL_PROP_TYPES[property.type], initial: property.default });
        const record = { kind: "main", spec, guid: this.fresh(), defs };
        this.localSpecs.set(spec, record);
        if (spec.local) this.locals.set(spec.local, record);
      }
      for (const child of spec.children ?? []) walk(child);
      for (const slot of spec.slots ?? []) for (const child of slot.children ?? []) walk(child);
    };
    walk(frame);
  }
  /** A definition as Figma's copy writes it (its initial value twice: value and varValue). */
  propDef(name, def, at) {
    return { id: def.id, name, initialValue: localValue(def.type, def.initial).value, sortPosition: position(at), type: def.type, preferredValues: {}, varValue: localValue(def.type, def.initial).varValue };
  }
  /** Property names a main's layers may use, and the definition each names in this main (a variant's own). */
  defOf(main, name) {
    if (main.kind === "main") return main.defs.get(name) ? { id: main.defs.get(name).id, type: main.defs.get(name).type } : null;
    const def = main.set.defs.get(name);
    return def ? { id: main.own.get(name), type: def.type } : null;
  }
  /** A Studio main (<Component>): Figma's SYMBOL, laid out as a frame; a lone one defines its properties, a variant names its values. */
  component(spec, parent, parentInfo) {
    const record = this.localSpecs.get(spec);
    const outer = this.mainNow;
    this.mainNow = record;
    const node = this.frame(spec, parent, parentInfo, { id: record.guid });
    this.mainNow = outer;
    node.type = "SYMBOL";
    node.name = spec.name || "Component";
    if (record.kind === "main") {
      const defs = [...record.defs].map(([name, def], i) => this.propDef(name, def, i + 1));
      if (defs.length) node.componentPropDefs = defs;
      for (const property of spec.properties ?? []) if (!LOCAL_PROP_TYPES[property.type]) this.note(`${node.name}: its ${property.type.toLowerCase()} property ${property.name} is not in a direct paste yet (Import from Studio defines it)`);
    } else {
      if (record.own.size) node.componentPropDefs = [...record.own].map(([name, own]) => ({ id: own, parentPropDefId: record.set.defs.get(name).id }));
      node.variantPropSpecs = Object.entries(record.values).map(([name, value]) => ({ propDefId: record.set.variantDefs.get(name), value: String(value) }));
    }
    return node;
  }
  /** A Studio <ComponentSet>: Figma's state group frame (its variants in it), its definitions and variant value orders. */
  componentSet(spec, parent, parentInfo) {
    const record = this.localSpecs.get(spec);
    const node = this.frame(spec, parent, parentInfo, { id: record.guid });
    node.name = spec.name || "Component set";
    node.isStateGroup = true;
    node.stateGroupPropertyValueOrders = [...record.orders].map(([property, values]) => ({ property, values }));
    node.componentPropDefs = [
      ...[...record.defs].map(([name, def], i) => this.propDef(name, def, i + 1)),
      ...[...record.variantDefs].map(([name, id], i) => ({ id, name, initialValue: {}, sortPosition: position(record.defs.size + i + 1), type: "VARIANT", preferredValues: {}, varValue: { value: { textValue: "" }, dataType: "STRING", resolvedDataType: "STRING" } })),
    ];
    for (const property of spec.properties ?? []) if (!LOCAL_PROP_TYPES[property.type]) this.note(`${node.name}: its ${property.type.toLowerCase()} property ${property.name} is not in a direct paste yet (Import from Studio defines it)`);
    return node;
  }
  /** A layer of a main bound to its properties (figma-push `propRefs`: characters, visible): Figma's refs and PROP_REF links. */
  bindProps(node, spec) {
    const main = this.mainNow;
    if (!main) return;
    for (const [field, name] of Object.entries(spec.propRefs)) {
      const kind = { characters: ["TEXT_DATA", "TEXT_DATA"], visible: ["VISIBLE", "BOOLEAN"] }[field];
      const def = this.defOf(main, name);
      if (!kind || !def || (field === "characters" && node.type !== "TEXT")) { this.note(`${node.name}: its ${field} bound to ${name} is not in a direct paste yet`); continue; }
      (node.componentPropRefs ??= []).push({ defID: def.id, componentPropNodeField: kind[0] });
      consume(node, "parameterConsumptionMap", [{ variableData: { value: { propRefValue: { defId: def.id } }, dataType: "PROP_REF", resolvedDataType: kind[1] }, variableField: kind[0] }]);
      this.bound.set(`${key(node.guid)}|${kind[0]}`, def.id);
    }
  }
  /** A Studio <Use> of the page's own component: its main's variant, its property values, its layer overrides (later). */
  localInstance(spec, parent, parentInfo) {
    const where = spec.name || "Instance";
    const record = this.locals.get(spec.local);
    if (!record) { this.note(`${where}: its component ${spec.local} is not in this paste (copy the frame that holds it too)`); return this.placeholder({ ...spec, set: { name: spec.name } }, parent, parentInfo, where); }
    const wanted = spec.variant ?? {};
    const main = record.kind === "set" ? record.variants.find((v) => Object.entries(wanted).every(([name, value]) => String(v.values[name]) === String(value))) ?? record.variants[0] : record;
    if (!main) { this.note(`${where}: its component set ${spec.local} has no variants`); return null; }
    const guess = this.estimate(main.spec);
    const pos = this.position(spec, parentInfo, guess.w, guess.h);
    const node = {
      guid: this.fresh(), phase: "CREATED", parentIndex: { guid: parent, position: this.place(parent) }, type: "INSTANCE", name: spec.name || main.spec.name || "Instance", visible: true, opacity: 1,
      size: { x: pos.w, y: pos.h }, transform: at(pos.x, pos.y), symbolData: { symbolID: main.guid, uniformScaleFactor: 1 },
      ...this.childFields(spec, parentInfo),
    };
    const assignments = [];
    for (const [name, value] of Object.entries(spec.props ?? {})) {
      const def = this.defOf(main, name);
      if (!def) { this.note(`${where}: no property ${name} on its component`); continue; }
      assignments.push(localAssignment(def, value));
    }
    if (assignments.length) node.componentPropAssignments = assignments;
    if (spec.slots?.length) this.note(`${where}: what it puts in its component's slots is not in a direct paste yet (Import from Studio fills them)`);
    if (spec.layerOverrides?.length) this.pendingOverrides.push({ node, main, overrides: spec.layerOverrides, where });
    return this.push(node, parentInfo);
  }
  /**
   * The instances' overrides of their main's layers (figma-push `layerOverrides`: `at` = child indexes in the main),
   * once every main is written: a text's characters and a layer's visibility (through its property when bound, as
   * Figma rewrites them), a text's fill.
   */
  finishLocals() {
    for (const { node, main, overrides, where } of this.pendingOverrides) {
      for (const override of overrides) {
        let layer = { guid: main.guid };
        for (const index of override.at ?? []) layer = this.kids.get(key(layer.guid))?.[index] ?? null;
        if (!layer || layer.guid === main.guid) { this.note(`${where}: an override of a layer its main does not draw`); continue; }
        const entry = () => { const list = (node.symbolData.symbolOverrides ??= []); let found = list.find((e) => key(e.guidPath.guids[0]) === key(layer.guid)); if (!found) { found = { guidPath: { guids: [layer.guid] } }; list.push(found); } return found; };
        const viaProp = (field, value) => {
          const defId = this.bound.get(`${key(layer.guid)}|${field}`);
          if (!defId) return false;
          const list = (node.componentPropAssignments ??= []);
          const assignment = localAssignment({ id: defId, type: field === "TEXT_DATA" ? "TEXT" : "BOOL" }, value);
          const at = list.findIndex((a) => key(a.defID) === key(defId));
          if (at >= 0) list[at] = assignment; else list.push(assignment);
          return true;
        };
        if (typeof override.characters === "string" && !viaProp("TEXT_DATA", override.characters)) entry().textData = textData(override.characters);
        if (typeof override.visible === "boolean" && !viaProp("VISIBLE", override.visible)) entry().visible = override.visible;
        if (override.fill) entry().fillPaints = this.paint(override.fill, where);
        if (override.variant || override.props) this.note(`${where}: a nested instance's variant or properties in its main are not in a direct paste yet`);
      }
    }
  }

  skeletons() {
    const out = [];
    const done = new Set(), sets = new Set();
    const queue = [...this.symbolsUsed];
    while (queue.length) {
      const id = queue.shift();
      if (done.has(id)) continue;
      done.add(id);
      const tree = this.index.tree(id);
      if (!tree) continue;
      let parent = INTERNAL;
      if (tree.set) {
        if (!sets.has(tree.set)) {
          sets.add(tree.set);
          const set = this.index.pack.sets[tree.set];
          out.push({ guid: guid(tree.set), phase: "CREATED", parentIndex: { guid: INTERNAL, position: this.place(INTERNAL) }, type: "FRAME", name: set.name, isStateGroup: true, visible: false, opacity: 1, transform: IDENTITY,
            componentPropDefs: set.props.filter(([, type]) => type !== "VARIANT").map(([name, type, propId, initial], i) => ({ id: guid(propId), name, type, sortPosition: position(i), initialValue: initialValue(type, initial) })) });
        }
        parent = guid(tree.set);
      }
      const ownDefs = Object.entries(tree.defs ?? {}).map(([setLevel, own]) => ({ id: guid(own), parentPropDefId: guid(setLevel) }));
      const lonePropDefs = (tree.props ?? []).filter(([, type]) => type !== "VARIANT").map(([name, type, propId, initial], i) => ({ id: guid(propId), name, type, sortPosition: position(i), initialValue: initialValue(type, initial) }));
      out.push({ guid: guid(id), phase: "CREATED", parentIndex: { guid: parent, position: this.place(parent) }, type: "SYMBOL", name: tree.name, visible: true, opacity: 1, size: { x: tree.w, y: tree.h }, transform: IDENTITY,
        ...(ownDefs.length || lonePropDefs.length ? { componentPropDefs: [...lonePropDefs, ...ownDefs] } : {}) });
      tree.rows.forEach((row, index) => {
        const parentId = row.parent < 0 ? guid(id) : guid(tree.rows[row.parent].id);
        const node = { guid: guid(row.id), phase: "CREATED", parentIndex: { guid: parentId, position: position(row.parent < 0 ? tree.roots.indexOf(index) : tree.rows[row.parent].children.indexOf(index)) }, type: row.type, name: row.name, visible: row.visible, opacity: 1, size: { x: row.w, y: row.h }, transform: at(row.x, row.y) };
        if (row.main) {
          node.symbolData = { symbolID: guid(row.main) };
          node.overrideKey = guid(row.id);
          queue.push(row.main);
          // The component's own changes to this nested instance, as its definition holds them. When a paste swaps the
          // instance's icon, Figma works out what the swap keeps from this definition, not from the paste's entries: a
          // bare skeleton kept no colour (Dock-Icon's icon back to its own black, 2026-10-17 paste tests F/G).
          const overrides = definitionOverrides(row);
          if (overrides.length) node.symbolData.symbolOverrides = overrides;
          for (const entry of overrides) if (entry.overriddenSymbolID) queue.push(key(entry.overriddenSymbolID));
          const assigns = (row.more.assigns ?? []).filter((a) => !isSlotAssignment(a));
          if (assigns.length) {
            node.componentPropAssignments = structuredClone(assigns);
            for (const a of assigns) if (a.varValue?.value?.symbolIdValue) queue.push(key(a.varValue.value.symbolIdValue.guid));
          }
        }
        if (row.refs.length) node.componentPropRefs = row.refs.map(([defId, field]) => ({ defID: guid(defId), componentPropNodeField: field }));
        if (row.more.pcm) node.parameterConsumptionMap = { entries: structuredClone(row.more.pcm) };
        if (row.more.cols) { node.stackMode = "GRID"; node.gridColumns = { entries: row.more.cols.map((c, i) => ({ id: guid(c), position: position(i) })) }; node.gridRows = { entries: row.more.rows.map((r, i) => ({ id: guid(r), position: position(i) })) }; }
        out.push(node);
      });
    }
    return out;
  }
}

/**
 * A nested instance's overrides in its component's definition, from the pack: its own entry (`keep.self`, addressed by
 * its symbol), its entries on its component's layers (`keep.ovs`), and the swaps and visibility it sets (`ovs`).
 */
function definitionOverrides(row) {
  const byPath = new Map();
  const at = (guids) => {
    const k = guids.join("/");
    if (!byPath.has(k)) byPath.set(k, { guidPath: { guids: guids.map(guid) } });
    return byPath.get(k);
  };
  // Figma's order: the entries on the component's layers, then the instance's own.
  for (const [rel, fields] of row.more.keep?.ovs ?? []) Object.assign(at(rel), structuredClone(fields));
  for (const [rel, o] of row.more.ovs ?? []) {
    const entry = at(rel);
    if (o.s) entry.overriddenSymbolID = guid(o.s);
    if (typeof o.v === "boolean") entry.visible = o.v;
  }
  if (row.more.keep?.self) Object.assign(at([row.main]), structuredClone(row.more.keep.self));
  return [...byPath.values()];
}

/** figma-push's local property types → Figma's (its clipboard calls a boolean BOOL); swaps and slots wait. */
const LOCAL_PROP_TYPES = { TEXT: "TEXT", BOOLEAN: "BOOL" };
/** A local property value as Figma's definition (value) and assignment (varValue) carry it. */
function localValue(type, value) {
  if (type === "BOOL") { const on = value === undefined ? true : value === true || value === "true"; return { value: { boolValue: on }, varValue: { value: { boolValue: on }, dataType: "BOOLEAN", resolvedDataType: "BOOLEAN" } }; }
  const text = textData(value === undefined ? "" : String(value));
  return { value: { textValue: text }, varValue: { value: { textDataValue: text }, dataType: "TEXT_DATA", resolvedDataType: "TEXT_DATA" } };
}
/** An instance's assignment of a local property (Figma's copy: its definition id, value and varValue). */
function localAssignment(def, value) {
  const { value: v, varValue } = localValue(def.type, value);
  return { defID: def.id, value: v, varValue };
}

function initialValue(type, initial) {
  if (type === "BOOL") return { boolValue: !!initial };
  if (type === "TEXT") return { textValue: textData(initial ?? "") };
  if (type === "INSTANCE_SWAP" && initial) return { guidValue: guid(initial) };
  return {};
}

const slotDefOf = (row) => row.refs.find(([, field]) => field === "SLOT_CONTENT_ID")?.[0] ?? null;
const isSlotAssignment = (a) => a.varValue?.dataType === "SLOT_CONTENT_ID";
const ALL_ONES = { sessionID: 4294967295, localID: 4294967295 };

/**
 * One instance being written: the pasted instance, or an instance inside a slot content this paste copies. Layers are
 * refs: a `row` of a component (reached by guidPath from this instance: overrides), or a `content` node of a slot
 * content a component sets on one of its nested instances (Figma copies such a content when one of its layers changes:
 * the copy is real nodes, assigned to the slot by an override on that nested instance).
 */
class InstanceBuild {
  constructor(writer, symbol, where, { template = null, parent = null, content = null } = {}) {
    this.w = writer;
    this.symbol = symbol;
    this.where = where;
    this.byPath = new Map();
    this.root = {};
    this.assignments = [];
    this.swaps = new Map();
    this.kept = new Map();
    this.copies = new Map();
    this.subs = new Map();
    this.parent = parent;
    this.content = content;
    this.base = new Map();
    writer.symbolsUsed.add(symbol);
    if (template) {
      for (const entry of template.symbolData?.symbolOverrides ?? []) {
        const k = entry.guidPath.guids.map(key).join("/");
        this.byPath.set(k, structuredClone(entry));
        this.base.set(k, { ...(entry.overriddenSymbolID ? { s: key(entry.overriddenSymbolID) } : {}), ...(typeof entry.visible === "boolean" ? { v: entry.visible } : {}) });
      }
      this.assignments = structuredClone(template.componentPropAssignments ?? []);
    }
  }
  /**
   * Overrides components set below a guidPath (swaps `s`, visibility `v`), outer levels first as Figma resolves them:
   * this paste's, the copied content's, then each nested instance's own component, outermost first.
   */
  inherited(path) {
    const out = new Map();
    const put = (k, o) => { const prev = out.get(k) ?? {}; out.set(k, { ...o, ...prev }); };
    let symbol = this.symbol;
    for (let i = 0; i < path.length; i++) {
      const row = this.w.index.tree(symbol)?.rows.find((r) => r.id === path[i]);
      if (!row || row.type !== "INSTANCE") break;
      const abs = path.slice(0, i + 1).join("/");
      symbol = this.swaps.get(abs) ?? this.base.get(abs)?.s ?? out.get(abs)?.s ?? row.main;
      for (const [rel, o] of row.more.ovs ?? []) put(`${abs}/${rel.join("/")}`, o);
    }
    return out;
  }
  /** A change to an instance inside a slot content needs that content copied. */
  touch() { if (this.parent) this.parent.materialize(this.content); }
  override(path) {
    this.touch();
    const k = path.join("/");
    if (!this.byPath.has(k)) this.byPath.set(k, { guidPath: { guids: path.map(guid) } });
    return this.byPath.get(k);
  }
  /** The overrides, the instance's own first (it addresses the variant the instance shows). */
  overridesList(symbol) {
    const out = [...this.byPath.values(), ...this.kept.values()];
    if (Object.keys(this.root).length) out.unshift({ guidPath: { guids: [guid(symbol)] }, ...this.root });
    return out;
  }
  /** The symbol shown at a guidPath (the instance's own for []), swaps included. */
  symbolAt(path) {
    let symbol = this.symbol;
    const inherited = new Map();
    // The assignments the component holding a nested instance sets on it (a Metric-Trend's Badge: Leading-Icon-Src).
    let ownerAssigns = [];
    for (let i = 0; i < path.length; i++) {
      const row = this.w.index.tree(symbol)?.rows.find((r) => r.id === path[i]);
      if (!row || row.type !== "INSTANCE") return null;
      const abs = path.slice(0, i + 1).join("/");
      const assigned = ownerAssigns.find((a) => a.varValue?.dataType === "SYMBOL_ID" && row.refs.some(([d, f]) => f === "OVERRIDDEN_SYMBOL_ID" && d === key(a.defID)));
      symbol = this.swaps.get(abs) ?? this.base.get(abs)?.s ?? inherited.get(abs) ?? (assigned ? key(assigned.varValue.value.symbolIdValue.guid) : null) ?? row.main;
      for (const [rel, o] of row.more.ovs ?? []) { const k = `${abs}/${rel.join("/")}`; if (o.s && !inherited.has(k)) inherited.set(k, o.s); }
      ownerAssigns = row.more.assigns ?? [];
    }
    return symbol;
  }
  /** The component row at a guidPath. */
  rowAt(path) {
    if (!path.length) return null;
    return this.w.index.tree(this.symbolAt(path.slice(0, -1)))?.rows.find((r) => r.id === path[path.length - 1]) ?? null;
  }

  // --- layers ---------------------------------------------------------------------------------------------------

  rowRefs(symbol, indexes, prefix) {
    const tree = this.w.index.tree(symbol);
    return tree ? indexes.map((index) => ({ build: this, kind: "row", path: [...prefix, tree.rows[index].id], row: tree.rows[index], symbol, type: tree.rows[index].type, name: tree.rows[index].name })) : [];
  }
  contentRefs(content, indexes) {
    const list = this.w.index.pack.contents[content.template];
    return indexes.map((index) => ({ build: this, kind: "content", content, index, tmpl: list[index], type: list[index].type, name: list[index].name }));
  }
  /** The content a nested instance (at `ownerPath`) shows in its slot `slotDef`, when its component sets one. */
  contentFor(ownerPath, slotDef) {
    if (!ownerPath.length) return null;
    const k = `${ownerPath.join("/")}|${slotDef}`;
    const copy = this.copies.get(k);
    if (copy) return copy.content;
    // A component's slot assignment without a `value` is a leftover Figma does not show (the slot keeps its own layers).
    // The owner's assignment names the slot of the variant its component placed; a page that swaps that variant (a
    // Metric-Card Tile's Card made Solid) still shows it: both ids stand for one set-level property.
    const row = this.rowAt(ownerPath);
    const setLevelOf = (symbol, own) => { const tree = this.w.index.tree(symbol); return Object.entries(tree?.defs ?? {}).find(([, id]) => id === own)?.[0] ?? own; };
    const wanted = setLevelOf(this.symbolAt(ownerPath), slotDef);
    const a = (row?.more.assigns ?? []).find((x) => isSlotAssignment(x) && "value" in x && (key(x.defID) === slotDef || setLevelOf(row.main, key(x.defID)) === wanted));
    if (!a) return null;
    const template = key(a.varValue.value.slotContentIdValue.guid);
    return this.w.index.pack.contents[template] ? { key: k, template, owner: ownerPath, slotDef } : null;
  }
  /** Direct children of a ref (Figma's tree: an instance shows its component's layers, a slot its content). */
  expand(ref) {
    if (ref.kind === "row") {
      if (ref.type === "INSTANCE") { const inner = this.symbolAt(ref.path); const tree = this.w.index.tree(inner); return tree ? this.rowRefs(inner, tree.roots, ref.path) : []; }
      const slotDef = slotDefOf(ref.row);
      const content = slotDef ? this.contentFor(ref.path.slice(0, -1), slotDef) : null;
      if (content) return this.contentRefs(content, this.w.childIndexes(content.template, 0));
      return this.rowRefs(ref.symbol, ref.row.children, ref.path.slice(0, -1));
    }
    if (ref.type === "INSTANCE") { const sub = this.subFor(ref.content, ref.index); const tree = this.w.index.tree(sub.symbol); return tree ? sub.rowRefs(sub.symbol, tree.roots, []) : []; }
    return this.contentRefs(ref.content, this.w.childIndexes(ref.content.template, ref.index));
  }
  /** The layers of a scope ({build, path}: an instance) or under a ref, depth first; `own` stops at nested instances. */
  static walk(refs, own, out = []) {
    for (const ref of refs) { out.push(ref); if (ref.type === "INSTANCE" && own) continue; InstanceBuild.walk(ref.build.expand(ref), own, out); }
    return out;
  }
  scopeRefs(path) { const symbol = this.symbolAt(path); const tree = this.w.index.tree(symbol); return tree ? this.rowRefs(symbol, tree.roots, path) : []; }
  layers(path = [], own = false) { return InstanceBuild.walk(this.scopeRefs(path), own); }
  descendants(ref) { return ref ? InstanceBuild.walk(ref.build.expand(ref), false) : this.layers([]); }
  childrenOf(ref) { return ref ? ref.build.expand(ref) : this.scopeRefs([]); }
  /** The instance scope of an instance ref (an instance inside a content copy is its own build). */
  scopeOf(ref) {
    if (ref.kind === "row") return { build: ref.build, path: ref.path };
    return { build: ref.build.subFor(ref.content, ref.index), path: [] };
  }

  // --- slot content copies --------------------------------------------------------------------------------------

  subFor(content, index) {
    const k = `${content.key}#${index}`;
    if (!this.subs.has(k)) {
      const tmpl = this.w.index.pack.contents[content.template][index];
      this.subs.set(k, new InstanceBuild(this.w, key(tmpl.symbolData.symbolID), `${this.where} › ${tmpl.name}`, { template: tmpl, parent: this, content }));
    }
    return this.subs.get(k);
  }
  /** Copy a component's slot content for this instance and assign the copy to the slot (as Figma does on an edit). */
  materialize(content) {
    if (this.copies.has(content.key)) return this.copies.get(content.key);
    const list = this.w.index.pack.contents[content.template];
    const ids = list.map(() => this.w.fresh());
    const rank = new Map();
    const nodes = list.map((tmpl, i) => {
      const { id: _id, p, ...fields } = structuredClone(tmpl);
      const parentGuid = i === 0 ? INTERNAL : ids[p];
      const siblings = rank.get(p) ?? 0; rank.set(p, siblings + 1);
      const node = { guid: ids[i], phase: "CREATED", parentIndex: { guid: parentGuid, position: i === 0 ? this.w.place(INTERNAL) : position(siblings) }, ...fields };
      if (i === 0) node.isSlotContent = true;
      if (node.type !== "INSTANCE") node.overrideKey = ALL_ONES;
      return node;
    });
    // Layers appended to the copy later (an edit's `append`: a Goal-Progress card's hint) go after its own children:
    // the writer's next position for each copied parent starts past them (a shared "!" let Figma put the hint first).
    for (const [p, count] of rank) if (p >= 0) this.w.order.set(key(ids[p]), Math.max(this.w.order.get(key(ids[p])) ?? 0, count));
    const record = { content, nodes, root: ids[0], build: this };
    this.copies.set(content.key, record);
    this.w.materialized.push(record);
    // Only the slot's assignment, as Figma's copy writes it: the component's other assignments stay its own.
    const owner = this.override(content.owner);
    const assignments = (owner.componentPropAssignments ??= []);
    const slot = { defID: guid(content.slotDef), value: {}, varValue: { value: { slotContentIdValue: { guid: ids[0] } }, dataType: "SLOT_CONTENT_ID", resolvedDataType: "SLOT_CONTENT_ID" } };
    const at = assignments.findIndex((a) => key(a.defID) === content.slotDef);
    if (at >= 0) assignments[at] = slot; else assignments.push(slot);
    return record;
  }

  // --- writes on refs -------------------------------------------------------------------------------------------

  /** The node a content ref writes to (its copy), or the override entry a row ref writes to. */
  target(ref) {
    if (ref.kind === "row") return ref.build.override(ref.path);
    return ref.build.materialize(ref.content).nodes[ref.index];
  }
  /** A component layer bound to a property: Figma keeps a change to it as that property's assignment on its owner. */
  boundDef(ref, field) { return ref.kind === "row" ? ref.row.refs.find(([, f]) => f === field)?.[0] ?? null : null; }
  assignOwn(ref, defId, value, varValue) {
    const list = ref.build.assignmentsAt(ref.path.slice(0, -1));
    const assignment = { defID: guid(defId), value, varValue };
    const at = list.findIndex((a) => key(a.defID) === defId);
    if (at >= 0) list[at] = assignment; else list.push(assignment);
  }
  setText(ref, text) {
    const def = this.boundDef(ref, "TEXT_DATA");
    if (def) { this.assignOwn(ref, def, { textValue: textData(text) }, { value: { textDataValue: textData(text) }, dataType: "TEXT_DATA", resolvedDataType: "TEXT_DATA" }); return; }
    this.target(ref).textData = textData(text);
  }
  setVisible(ref, visible) {
    // Already so: nothing to write (the plugin's setProperties writes no override for it either).
    if (this.visibleOf(ref) === visible) return;
    const def = this.boundDef(ref, "VISIBLE");
    if (def) { this.assignOwn(ref, def, { boolValue: visible }, { value: { boolValue: visible }, dataType: "BOOLEAN", resolvedDataType: "BOOLEAN" }); return; }
    this.target(ref).visible = visible;
  }
  visibleOf(ref) {
    if (ref.kind === "content") { const copy = ref.build.copies.get(ref.content.key); return (copy ? copy.nodes[ref.index].visible : ref.tmpl.visible) !== false; }
    const b = ref.build;
    const entry = b.byPath.get(ref.path.join("/"));
    if (entry && typeof entry.visible === "boolean") return entry.visible;
    const set = b.inherited(ref.path.slice(0, -1)).get(ref.path.join("/"));
    if (set && typeof set.v === "boolean") return set.v;
    const ownerPath = ref.path.slice(0, -1);
    const assigned = ownerPath.length ? [...(b.byPath.get(ownerPath.join("/"))?.componentPropAssignments ?? []), ...(b.rowAt(ownerPath)?.more.assigns ?? [])] : b.assignments;
    for (const [defId, field] of ref.row.refs) if (field === "VISIBLE") { const a = assigned.find((x) => key(x.defID) === defId); if (a && a.value && "boolValue" in a.value) return a.value.boolValue; }
    return ref.row.visible;
  }
  shownSymbolOf(ref) {
    if (ref.kind === "row") return ref.build.symbolAt(ref.path);
    return ref.build.subFor(ref.content, ref.index).symbol;
  }
  swapRef(ref, symbol) {
    this.w.symbolsUsed.add(symbol);
    if (ref.kind === "row") {
      const def = this.boundDef(ref, "OVERRIDDEN_SYMBOL_ID");
      if (def) { ref.build.swaps.set(ref.path.join("/"), symbol); this.assignOwn(ref, def, { guidValue: guid(symbol) }, { value: { symbolIdValue: { guid: guid(symbol) } }, dataType: "SYMBOL_ID", resolvedDataType: "SYMBOL_ID" }); ref.build.carry(ref.path, symbol); return; }
      ref.build.swap(ref.path, symbol);
      return;
    }
    const sub = ref.build.subFor(ref.content, ref.index);
    sub.touch();
    sub.symbol = symbol;
  }

  // --- the importer's steps, on a scope ({build, path}) -------------------------------------------------------------

  swap(path, symbol) {
    this.w.symbolsUsed.add(symbol);
    if (!path.length) { this.touch(); this.symbol = symbol; return; }
    this.swaps.set(path.join("/"), symbol);
    this.override(path).overriddenSymbolID = guid(symbol);
    this.carry(path, symbol);
  }
  /**
   * What Figma keeps when the layer at `path` swaps to another component (a property, an icon, another set or variant),
   * as its copy of the plugin's import writes it: the layer's own overrides of its old component (`keep.self`: a renamed
   * layer's name, its size variables, its fill) and its overrides on the old component's layers matched by name in the
   * new one (`keep.ovs`), in entries of their own marked with the swapped layer's depth (`overrideLevel`). Without them a
   * swapped icon pastes at its own 20px, black, renamed.
   */
  carry(path, target) {
    const row = this.rowAt(path);
    const from = row?.type === "INSTANCE" ? this.w.index.tree(row.main) : null;
    const to = this.w.index.tree(target);
    if (!from || !to || target === row.main) return;
    const level = path.length;
    const keep = row.more.keep ?? {};
    // A variant of the same set brings its own look: Figma keeps only the layer's name (Metric-Icon's Dock-Icon theme).
    if (from.set && from.set === to.set) {
      if (keep.self?.name) this.keptAt(path, level).name ??= keep.self.name;
      return;
    }
    if (keep.self) {
      const entry = this.keptAt(path, level);
      // A size bound to variables is left to them, as Figma's copy writes a kept entry.
      const bound = [...(keep.self.variableConsumptionMap?.entries ?? []), ...(keep.self.parameterConsumptionMap?.entries ?? [])].some((b) => (b.variableField === "WIDTH" || b.variableField === "HEIGHT") && b.variableData?.value?.alias);
      for (const [field, value] of Object.entries(keep.self)) if (field !== "overrideLevel" && !(bound && (field === "size" || field === "targetAspectRatio"))) entry[field] ??= structuredClone(value);
    }
    for (const [rel, fields] of keep.ovs ?? []) {
      const mapped = matchLayers(this.w.index, from, to, rel);
      if (!mapped) continue;
      const layer = this.keptAt([...path, ...mapped], level + (fields.overrideLevel ?? 0));
      for (const [field, value] of Object.entries(fields)) if (field !== "overrideLevel") layer[field] ??= structuredClone(value);
    }
  }
  keptAt(path, level) {
    this.touch();
    const k = path.join("/");
    if (!this.kept.has(k)) this.kept.set(k, { guidPath: { guids: path.map(guid) }, overrideLevel: level });
    return this.kept.get(k);
  }
  applyProps(path, props, where) {
    if (!props) return;
    let symbol = this.symbolAt(path);
    const defs = this.w.propsOf(symbol);
    const wanted = {};
    for (const [name, value] of Object.entries(props)) {
      const def = defs.find(([defName]) => defName === name);
      if (!def) { this.w.note(`${where}: ${name} is not a property of ${this.w.index.tree(symbol)?.name ?? symbol}`); continue; }
      if (def[1] !== "VARIANT") continue;
      let option = value;
      if (typeof value === "boolean") { const options = (this.w.index.pack.sets[this.w.index.tree(symbol).set]?.variants ?? []).map((id) => variantValues(this.w.index.pack.symbols[id].name)[name]); option = variantOf([...new Set(options)], value) ?? value; }
      wanted[name] = String(option);
    }
    if (Object.keys(wanted).length) {
      const next = this.w.variantWith(symbol, wanted);
      if (!next) this.w.note(`${where}: no variant with ${JSON.stringify(wanted)}`);
      else if (next !== symbol) { this.swap(path, next); symbol = next; }
    }
    for (const [name, value] of Object.entries(props)) {
      const def = defs.find(([defName]) => defName === name);
      if (def && def[1] !== "VARIANT" && def[1] !== "SLOT") this.assign(path, symbol, def, value, where);
    }
  }
  /**
   * The assignment list of the instance at `path`. A nested one's override lists only what this paste changes, as
   * Figma's own copy does: Figma merges it with the component's assignments, and restating a swap the component sets
   * applies it again without what Figma kept from it (an icon back at 20px, black).
   */
  assignmentsAt(path) {
    if (!path.length) { this.touch(); return this.assignments; }
    const entry = this.override(path);
    entry.componentPropAssignments ??= [];
    return entry.componentPropAssignments;
  }
  assign(path, symbol, def, value, where) {
    const [name, type, setLevel] = def;
    const tree = this.w.index.tree(symbol);
    const own = tree.set ? tree.defs?.[setLevel] : setLevel;
    if (!own) { this.w.note(`${where}: ${name} has no id on ${tree.name}`); return; }
    // An icon the instance already shows takes no assignment (the plugin skips it): set again, Figma swaps it afresh
    // without what it kept (memory: INSTANCE_SWAP colour loss). Booleans and texts are written as Figma's copy does.
    const listed = (path.length ? this.byPath.get(path.join("/"))?.componentPropAssignments : this.assignments)?.some((a) => key(a.defID) === own);
    let assignment;
    if (type === "BOOL") assignment = { defID: guid(own), value: { boolValue: !!value }, varValue: { value: { boolValue: !!value }, dataType: "BOOLEAN", resolvedDataType: "BOOLEAN" } };
    else if (type === "TEXT") assignment = { defID: guid(own), value: { textValue: textData(value) }, varValue: { value: { textDataValue: textData(value) }, dataType: "TEXT_DATA", resolvedDataType: "TEXT_DATA" } };
    else if (type === "INSTANCE_SWAP") {
      const target = this.w.componentNamed(value);
      if (!target) { this.w.note(`${where}: no component named ${value} for ${name}`); return; }
      const bound = this.layers(path).filter((layer) => layer.kind === "row" && layer.build === this && layer.row.refs.some(([d, f]) => d === own && f === "OVERRIDDEN_SYMBOL_ID"));
      if (!listed && bound.length && bound.every((layer) => this.symbolAt(layer.path) === target)) return;
      this.w.symbolsUsed.add(target);
      assignment = { defID: guid(own), value: { guidValue: guid(target) }, varValue: { value: { symbolIdValue: { guid: guid(target) } }, dataType: "SYMBOL_ID", resolvedDataType: "SYMBOL_ID" } };
      for (const layer of bound) { this.carry(layer.path, target); this.swaps.set(layer.path.join("/"), target); }
    } else return;
    const list = this.assignmentsAt(path);
    const existing = list.findIndex((a) => key(a.defID) === own);
    if (existing >= 0) list[existing] = assignment; else list.push(assignment);
  }
  label(path, text, where) {
    const symbol = this.symbolAt(path);
    const def = this.w.propsOf(symbol).find(([name, type]) => type === "TEXT" && LABEL_PROPS.includes(name));
    if (def) { this.assign(path, symbol, def, text, where); return; }
    const first = this.layers(path).find((ref) => ref.type === "TEXT" && this.visibleOf(ref));
    if (!first) { this.w.note(`${where}: no text layer for "${text}"`); return; }
    this.setText(first, text);
  }
  texts(path, spec, where) {
    if (spec.textList?.length) {
      let targets = this.layers(path, true).filter((ref) => ref.type === "TEXT" && this.visibleOf(ref));
      if (!targets.length) targets = this.layers(path, false).filter((ref) => ref.type === "TEXT" && this.visibleOf(ref));
      spec.textList.forEach((text, i) => { if (targets[i]) this.setText(targets[i], text); });
      if (spec.textList.length > targets.length) this.w.note(`${where}: ${spec.textList.length} texts for ${targets.length} text layers`);
    }
    for (const [name, text] of Object.entries(spec.texts ?? {})) {
      const ref = this.layers(path).find((item) => item.type === "TEXT" && item.name === name);
      if (!ref) { this.w.note(`${where}: no text layer ${name}`); continue; }
      this.setText(ref, text);
    }
  }
  /**
   * `image` (an Avatar's photo, a table cell's picture): the export's picture fills the first layer of the instance that
   * shows one in its component (the importer's applyImage), as that layer fills it, its other fills kept.
   */
  picture(src, where) {
    const picture = this.w.pictureFor(src, where);
    if (!picture) return;
    const own = this.w.index.tree(this.symbol)?.img ?? null;
    const ref = own ? null : this.layers([]).find((layer) => pictureFillsOf(layer));
    const fills = own ?? (ref ? pictureFillsOf(ref) : null);
    if (!fills) { this.w.note(`${where}: no image layer for its picture`); return; }
    const paints = fills.map((paint) => (paint.type === "IMAGE" ? { ...this.w.picturePaint({ scaleMode: IMAGE_FITS[paint.imageScaleMode] ?? "FILL" }, picture), visible: paint.visible !== false, opacity: paint.opacity ?? 1 } : structuredClone(paint)));
    if (ref) this.target(ref).fillPaints = paints;
    else { this.touch(); this.root.fillPaints = paints; }
  }
  swapIcon(path, iconName, where) {
    const icon = this.w.componentNamed(iconName);
    if (!icon) { this.w.note(`${where}: no icon component ${iconName}`); return; }
    const target = this.layers(path).find((ref) => ref.type === "INSTANCE" && /^(icon|ic)-/.test(this.w.index.tree(this.shownSymbolOf(ref))?.name ?? ""));
    if (!target) { this.w.note(`${where}: no icon inside to swap for ${iconName}`); return; }
    this.swapRef(target, icon);
  }
  /** A nested instance by the importer's path ("Name[i]/Inner"). */
  nestedAt(pathText) {
    let current = null;
    const segments = String(pathText).split("/");
    for (let i = 0; i < segments.length; i++) {
      // A layer named with slashes ("Button/Main", the Hero's button beside a hidden Button/Icon-Main): its full name
      // first, longest first; else the segment (a name or its first part, layerKey).
      let whole = null;
      for (let j = segments.length; j > i + 1 && !whole; j--) {
        const full = segments.slice(i, j).join("/");
        whole = this.descendants(current).find((ref) => ref.type === "INSTANCE" && ref.name === full) ?? null;
        if (whole) i = j - 1;
      }
      if (whole) { current = whole; continue; }
      const segment = segments[i];
      const match = /^(.*?)(?:\[(\d+)\])?$/.exec(segment);
      const name = match[1], index = match[2] ? Number(match[2]) : 0;
      const instances = this.descendants(current).filter((ref) => ref.type === "INSTANCE");
      let found = instances.filter((ref) => ref.name === name || layerKey(ref.name) === name);
      if (found.length <= index) found = instances.filter((ref) => { const shown = this.w.index.tree(this.shownSymbolOf(ref)); const set = shown?.set ? this.w.index.pack.sets[shown.set]?.name : shown?.name; return ref.name === name || layerKey(ref.name) === name || layerKey(set) === name; });
      if (!found[index]) return null;
      current = found[index];
    }
    return current;
  }
  nested(nested, where) {
    let ref = this.nestedAt(nested.path);
    if (!ref && nested.set?.name) ref = this.nestedAt(swappedPath(nested.path, nested.set.name));
    const at = `${where} › ${nested.path}`;
    if (!ref) { this.w.note(`${at}: no such nested instance`); return; }
    if (nested.set) {
      const target = this.w.mainFor(nested.set);
      const shown = this.w.index.tree(this.shownSymbolOf(ref));
      if (!target) this.w.note(`${at}: no component ${nested.set.name} in the pack`);
      else if (shown && (shown.set ?? shown.id) !== (this.w.index.tree(target).set ?? target)) this.swapRef(ref, target);
    }
    if (nested.name) this.target(ref).name = nested.name;
    const scope = this.scopeOf(ref);
    scope.build.applyProps(scope.path, nested.props, at);
    if (typeof nested.text === "string") scope.build.label(scope.path, nested.text, at);
    scope.build.texts(scope.path, nested, at);
    if (nested.swapIcon) scope.build.swapIcon(scope.path, nested.swapIcon, at);
    // As wide as its content (a chart's Segmented that is not full width): its own sizing, and no longer filling its
    // parent (only the sizing left the pasted Segmented stretched across the chart, where the plugin's import hugs).
    if (nested.hugW) this.sizeLayer(ref, { hugW: true }, at);
  }
  /** The importer's layerIn: names or keys, ">" for a direct child, [i] for the i-th match. */
  layerIn(pathSpec) {
    let current = null;
    for (const segment of Array.isArray(pathSpec) ? pathSpec : String(pathSpec).split("/")) {
      const match = /^(>?)(.*?)(?:\[(\d+)\])?$/.exec(segment);
      const name = match[2];
      const pool = match[1] ? this.childrenOf(current) : this.descendants(current);
      current = pool.filter((ref) => ref.name === name || layerKey(ref.name) === name)[match[3] ? Number(match[3]) : 0] ?? null;
      if (!current) return null;
    }
    return current;
  }
  slot(slotSpec, where, parentInfo) {
    const scope = slotSpec.within ? (Array.isArray(slotSpec.within) ? this.layerIn(slotSpec.within) : this.layers([]).find((ref) => ref.name === slotSpec.within)) : null;
    if (slotSpec.within && !scope) { this.w.note(`${where}: no layer ${slotSpec.within} for its ${slotSpec.name}`); return; }
    const slots = this.descendants(scope).filter((ref) => ref.kind === "row" && slotDefOf(ref.row));
    const slot = slots.find((ref) => ref.name === slotSpec.name) ?? (slots.length === 1 ? slots[0] : null);
    if (!slot) { this.w.note(`${where}: no slot ${slotSpec.name} for its ${(slotSpec.children ?? []).length} layers`); return; }
    this.fillSlot(slot, slotSpec, parentInfo);
  }
  fillSlot(slot, slotSpec, parentInfo) {
    const slotDef = slotDefOf(slot.row);
    // A copy of the component's content for this slot (made for an earlier edit) gives way to the new content.
    const copyKey = `${slot.path.slice(0, -1).join("/")}|${slotDef}`;
    const replaced = slot.build.copies.get(copyKey);
    if (replaced) { slot.build.copies.delete(copyKey); this.w.materialized = this.w.materialized.filter((record) => record !== replaced); }
    const content = this.w.slotContent(slot.row, slotSpec, parentInfo);
    // The slot layer hugs or fills as its content frame does (the plugin sets the SLOT's sizing: Figma keeps an override).
    if (slotSpec.hugW || slotSpec.hugH || slotSpec.fillW) this.sizeLayer(slot, { hugW: slotSpec.hugW, hugH: slotSpec.hugH, fillW: slotSpec.fillW }, slotSpec.name);
    const assignment = { defID: guid(slotDef), value: {}, varValue: { value: { slotContentIdValue: { guid: content } }, dataType: "SLOT_CONTENT_ID", resolvedDataType: "SLOT_CONTENT_ID" } };
    const list = slot.build.assignmentsAt(slot.path.slice(0, -1));
    const at = list.findIndex((a) => key(a.defID) === slotDef);
    if (at >= 0) list[at] = assignment; else list.push(assignment);
  }
  edit(edit, where, parentInfo) {
    const at = `${where} › ${Array.isArray(edit.layer) ? edit.layer.join(" › ") : edit.layer}`;
    const ref = this.layerIn(edit.layer);
    if (!ref) { this.w.note(`${at}: no such layer`); return; }
    if (typeof edit.visible === "boolean") this.setVisible(ref, edit.visible);
    if (typeof edit.characters === "string" && ref.type === "TEXT") this.setText(ref, edit.characters);
    if (edit.hugW || edit.hugH || edit.fillW || edit.fillH) this.sizeLayer(ref, edit, at);
    if (Array.isArray(edit.padding)) {
      // A component layer's padding: the override names the sides it binds and, without variableData, the sides it
      // unbinds (Figma's own copy of an unbound Body padding, 2026-10-17); a copied layer simply loses its bindings.
      const entry = this.target(ref);
      const bound = this.w.bindings(PADDING_FIELDS.map((field, i) => [field, edit.paddingVars?.[i]])).parameterConsumptionMap?.entries ?? [];
      Object.assign(entry, paddingFields(edit.padding));
      if (ref.kind === "row") {
        const open = PADDING_FIELDS.filter((field) => !bound.some((b) => b.variableField === field)).map((variableField) => ({ variableField }));
        consume(entry, "parameterConsumptionMap", [...bound, ...open]);
        consume(entry, "variableConsumptionMap", open);
      } else {
        consume(entry, "parameterConsumptionMap", bound, PADDING_FIELDS);
        consume(entry, "variableConsumptionMap", [], PADDING_FIELDS);
      }
    }
    if (Array.isArray(edit.columns)) {
      const cols = ref.kind === "row" ? ref.row.more.cols?.map(guid) : ref.tmpl.gridColumns?.entries.map((entry) => entry.id);
      if (cols) this.target(ref).gridColumnsSizing = { entries: cols.map((col, i) => { const value = Math.max(0.01, Number(edit.columns[i]) || 0); return { id: col, trackSize: { minSizing: { type: "FLEX", value }, maxSizing: { type: "FLEX", value } } }; }) };
    }
    if (typeof edit.share === "number") { const w = ref.kind === "row" ? ref.row.w : ref.tmpl.size?.x, h = ref.kind === "row" ? ref.row.h : ref.tmpl.size?.y; this.target(ref).size = { x: w, y: Math.max(0.01, edit.share * h) }; }
    if (edit.vector) {
      if (ref.kind === "content" && ref.type === "VECTOR") {
        const record = ref.build.materialize(ref.content);
        const parentNode = ref.tmpl.p >= 0 ? this.w.index.pack.contents[ref.content.template][ref.tmpl.p] : null;
        this.w.reshape(record.nodes[ref.index], parentNode?.size ?? ref.tmpl.size ?? { x: 100, y: 100 }, edit.vector);
      } else this.w.note(`${at}: a vector inside a component can only change inside a slot`);
    }
    if (edit.append) {
      if (ref.kind === "row" && slotDefOf(ref.row)) this.fillSlot(ref, { children: edit.append }, parentInfo);
      else if (ref.kind === "content") this.w.appendTo(ref.build.materialize(ref.content).nodes[ref.index], edit.append);
      else this.w.note(`${at}: layers can only be added inside a slot`);
    }
  }
  /**
   * A layer's size along an axis as Figma's override writes it (Figma's copy of a master layout that grows with its page,
   * 2026-10-17): hugging (`hugW`/`hugH`) sets its own sizing on that axis to its content and stops it growing or
   * stretching in its parent; filling (`fillW`/`fillH`) grows it along its parent's direction or stretches it across.
   */
  sizeLayer(ref, sizing, at) {
    const modes = this.modesOf(ref);
    if (!modes.parent) { this.w.note(`${at}: no auto layout around it to size it in`); return; }
    const entry = this.target(ref);
    for (const axis of ["W", "H"]) {
      const hug = sizing[`hug${axis}`], fill = sizing[`fill${axis}`];
      if (!hug && !fill) continue;
      const horizontal = axis === "W";
      const along = (modes.parent === "HORIZONTAL" || modes.parent === "GRID") === horizontal;
      if (hug) {
        if (modes.own !== "NONE") entry[(modes.own === "HORIZONTAL" || modes.own === "GRID") === horizontal ? "stackPrimarySizing" : "stackCounterSizing"] = "RESIZE_TO_FIT_WITH_IMPLICIT_SIZE";
        if (along) entry.stackChildPrimaryGrow = 0; else entry.stackChildAlignSelf = "AUTO";
      } else if (along) entry.stackChildPrimaryGrow = 1;
      else entry.stackChildAlignSelf = "STRETCH";
    }
  }
  /** A layer's own auto layout direction and its parent's: a component layer's from the pack (a frame's `mode`, a slot's
   *  layout, a nested instance's component), a copied layer's from its node (null: a parent this paste cannot see). */
  modesOf(ref) {
    if (ref.kind === "row") {
      const modeOf = (row, path) => (row.type === "INSTANCE" ? this.w.index.tree(ref.build.symbolAt(path))?.mode : row.more.mode ?? row.more.slot?.stackMode) ?? "NONE";
      const owner = this.w.index.tree(ref.symbol);
      return { own: modeOf(ref.row, ref.path), parent: ref.row.parent < 0 ? owner?.mode ?? "NONE" : modeOf(owner.rows[ref.row.parent], null) };
    }
    const list = this.w.index.pack.contents[ref.content.template];
    const own = ref.type === "INSTANCE" ? this.w.index.tree(key(ref.tmpl.symbolData.symbolID))?.mode ?? "NONE" : ref.tmpl.stackMode ?? "NONE";
    return { own, parent: ref.tmpl.p >= 0 ? list[ref.tmpl.p].stackMode ?? "NONE" : null };
  }
  hugLayer(hug, where) {
    const ref = this.layers([]).find((item) => item.name === hug.name);
    if (!ref) { this.w.note(`${where}: no layer ${hug.name} to hug`); return; }
    // By the layer's own direction, and no longer growing in its parent (a List-Box's Container-Slot is a column: its
    // height was written on the wrong axis, Figma's copy of the plugin's import hugs it as below).
    this.sizeLayer(ref, { hugW: hug.w, hugH: hug.h }, `${where} › ${hug.name}`);
  }
  hide(name, where) {
    const ref = this.layers([]).find((item) => item.name === name);
    if (!ref) { this.w.note(`${where}: no layer ${name} to hide`); return; }
    this.setVisible(ref, false);
  }
}

function swappedPath(pathText, setName) {
  const segments = String(pathText).split("/");
  const last = /^(.*?)(\[\d+\])?$/.exec(segments.pop());
  segments.push(layerKey(setName) + (last[2] || ""));
  return segments.join("/");
}

/** The paste's NODE_CHANGES message for an export (pure). `pictures`: the export's pictures by src (nativePictures). */
export function nativeMessage(pkg, pack, pictures = new Map()) {
  if (!pkg || pkg.format !== "zen-studio-figma" || !pkg.frame) throw new Error("Not a Zen Studio export");
  const writer = new Writer(pkg, indexPack(pack), pictures);
  writer.planLocals(pkg.frame);
  const root = writer.frame(pkg.frame, PAGE, null, { root: true });
  writer.finishLocals();
  writer.finishContents();
  const skeletons = writer.skeletons();
  const nodeChanges = [
    { guid: DOCUMENT, phase: "CREATED", type: "DOCUMENT", name: "Document", visible: true, opacity: 1, transform: IDENTITY },
    { guid: PAGE, phase: "CREATED", parentIndex: { guid: DOCUMENT, position: "!" }, type: "CANVAS", name: "Page 1", visible: true, opacity: 1, transform: IDENTITY, backgroundOpacity: 1, backgroundEnabled: true },
    { guid: INTERNAL, phase: "CREATED", parentIndex: { guid: DOCUMENT, position: "\"" }, type: "CANVAS", name: "Internal Only Canvas", visible: false, opacity: 1, transform: IDENTITY, backgroundOpacity: 1, backgroundEnabled: true, internalOnly: true },
    ...skeletons, ...writer.internal, ...writer.scene,
  ];
  const message = {
    type: "NODE_CHANGES", sessionID: 0, ackID: 0, pasteID: Math.floor(Math.random() * 2 ** 31), pasteFileKey: pack.file, pasteIsPartiallyOutsideEnclosingFrame: false,
    isCut: false, pasteEditorType: "DESIGN", publishedAssetGuids: [], pasteAssetType: "UNKNOWN", blobs: [],
    clipboardSelectionRegions: [{ parent: PAGE, nodes: [root.guid], pasteIsPartiallyOutsideEnclosingFrame: false, focusType: "NONE" }],
    nodeChanges,
  };
  // Vector data rides inline in the pack ({blob: base64}): the message keeps it in `blobs`, by index.
  const blobIndex = (value) => { message.blobs.push({ bytes: Array.from(bytesOf(value.blob)) }); return message.blobs.length - 1; };
  for (const node of nodeChanges) {
    if (node.vectorData?.vectorNetworkBlob?.blob !== undefined) node.vectorData.vectorNetworkBlob = blobIndex(node.vectorData.vectorNetworkBlob);
    for (const geometry of [...(node.fillGeometry ?? []), ...(node.strokeGeometry ?? [])]) if (geometry.commandsBlob?.blob !== undefined) geometry.commandsBlob = blobIndex(geometry.commandsBlob);
  }
  // A picture's bytes: one blob, which its paints' image and thumbnail name.
  const pictureBlobs = new Map();
  const pictureBlob = (hex) => {
    if (!pictureBlobs.has(hex)) { message.blobs.push({ bytes: writer.pictureBytes.get(hex) }); pictureBlobs.set(hex, message.blobs.length - 1); }
    return pictureBlobs.get(hex);
  };
  // Layers' own fills and an instance's overrides (a component's picture layer).
  const fillLists = (node) => [node.fillPaints, ...(node.symbolData?.symbolOverrides ?? []).map((entry) => entry.fillPaints)];
  for (const node of nodeChanges) for (const paint of fillLists(node).flatMap((list) => list ?? [])) for (const ref of [paint.image, paint.imageThumbnail]) if (ref?.dataBlob?.picture) ref.dataBlob = pictureBlob(ref.dataBlob.picture);
  return { message, root: root.guid, notes: writer.notes };
}

let schemaPromise = null;
/** The text/html Figma pastes for an export; `toPng` turns a WebP picture into PNG bytes (nativePictures). */
export async function figmaPasteHtml(pkg, pack, { toPng = null } = {}) {
  schemaPromise ??= (async () => { const deflated = bytesOf(FIGMA_CLIPBOARD_SCHEMA.deflated); return { deflated, schema: decodeSchema(await inflateRaw(deflated)) }; })();
  const { deflated, schema } = await schemaPromise;
  const { message, root, notes } = nativeMessage(pkg, pack, await nativePictures(pkg?.images, { toPng }));
  const html = await figmaClipboardHtml({ version: FIGMA_CLIPBOARD_SCHEMA.version, schemaDeflated: deflated, schema, message, meta: { fileKey: pack.file, pasteID: message.pasteID, selectedNodeData: `${key(root)}|4|0|0` } });
  return { html, notes };
}
