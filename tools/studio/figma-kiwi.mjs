// Figma's own clipboard format, so a Studio ⌘C pastes straight onto the Figma canvas (docs/research/
// studio-native-paste-2026-10-17.md). The clipboard's text/html carries two spans: figmeta (base64 JSON) and figma (base64
// "fig-kiwi" buffer: 8-byte magic, uint32 version, then chunks [uint32 length + bytes]: the kiwi schema, then the message,
// each deflate-raw; Figma's own copies use zstd for the message, which only reading them needs). The message is a kiwi
// (evanw/kiwi) binary value of the schema it travels with. Isomorphic: CompressionStream in the browser, node:zlib in Node.
//
//   decodeSchema(bytes) · encodeMessage(schema, value, { strict }) · decodeMessage(schema, bytes)
//   figmaClipboardHtml({ schemaDeflated, schema, message, meta }) → the text/html Figma pastes
//   readFigmaClipboard(html) → { meta, version, schemaDeflated, schema, message } (Node: also reads zstd)

export const FIG_KIWI_MAGIC = "fig-kiwi";
const NATIVE = ["bool", "byte", "int", "uint", "float", "string", "int64", "uint64"];
const KINDS = ["ENUM", "STRUCT", "MESSAGE"];
const utf8 = new TextEncoder();
const fromUtf8 = new TextDecoder();

class Reader {
  constructor(bytes) { this.b = bytes; this.i = 0; }
  byte() { if (this.i >= this.b.length) throw new Error("kiwi: read past the end"); return this.b[this.i++]; }
  bool() { return this.byte() !== 0; }
  uint() { let v = 0, s = 0, c; do { c = this.byte(); v |= (c & 127) << s; s += 7; } while (c & 128 && s < 35); return v >>> 0; }
  int() { const v = this.uint(); return v & 1 ? ~(v >>> 1) : v >>> 1; }
  uint64() { let v = 0n, s = 0n, c; do { c = this.byte(); v |= BigInt(c & 127) << s; s += 7n; } while (c & 128 && s < 70n); return v; }
  int64() { const v = this.uint64(); return v & 1n ? ~(v >> 1n) : v >> 1n; }
  float() {
    if (this.b[this.i] === 0) { this.i++; return 0; }
    let bits = this.b[this.i] | (this.b[this.i + 1] << 8) | (this.b[this.i + 2] << 16) | (this.b[this.i + 3] << 24);
    this.i += 4;
    bits = (bits << 23) | (bits >>> 9);
    const view = new DataView(new ArrayBuffer(4));
    view.setInt32(0, bits, true);
    return view.getFloat32(0, true);
  }
  string() { const start = this.i; while (this.b[this.i] !== 0) this.i++; const text = fromUtf8.decode(this.b.subarray(start, this.i)); this.i++; return text; }
  bytes(n) { const out = this.b.subarray(this.i, this.i + n); this.i += n; return out; }
}

class Writer {
  constructor() { this.n = 0; this.buf = new Uint8Array(1 << 16); }
  grow(k) { if (this.n + k > this.buf.length) { const next = new Uint8Array(Math.max(this.buf.length * 2, this.n + k)); next.set(this.buf.subarray(0, this.n)); this.buf = next; } }
  byte(v) { this.grow(1); this.buf[this.n++] = v & 255; }
  bool(v) { this.byte(v ? 1 : 0); }
  uint(v) { v >>>= 0; do { let c = v & 127; v >>>= 7; if (v) c |= 128; this.byte(c); } while (v); }
  int(v) { this.uint((v << 1) ^ (v >> 31)); }
  uint64(v) { v = BigInt(v); do { let c = Number(v & 127n); v >>= 7n; if (v) c |= 128; this.byte(c); } while (v); }
  int64(v) { v = BigInt(v); this.uint64(v < 0n ? ((-v) << 1n) - 1n : v << 1n); }
  float(v) {
    const view = new DataView(new ArrayBuffer(4));
    view.setFloat32(0, v, true);
    let bits = view.getInt32(0, true);
    bits = (bits >>> 23) | (bits << 9);
    if ((bits & 255) === 0) { this.byte(0); return; }
    this.byte(bits); this.byte(bits >> 8); this.byte(bits >> 16); this.byte(bits >> 24);
  }
  string(text) { const b = utf8.encode(text); this.grow(b.length + 1); this.buf.set(b, this.n); this.n += b.length; this.byte(0); }
  bytes(b) { this.grow(b.length); this.buf.set(b, this.n); this.n += b.length; }
  done() { return this.buf.slice(0, this.n); }
}

/** A kiwi schema from its binary form: definitions by name, each field with its type name. */
export function decodeSchema(bytes) {
  const r = new Reader(bytes);
  const count = r.uint();
  const defs = [];
  for (let i = 0; i < count; i++) {
    const name = r.string();
    const kind = KINDS[r.byte()];
    const n = r.uint();
    const fields = [];
    for (let j = 0; j < n; j++) fields.push({ name: r.string(), type: r.int(), isArray: r.byte() === 1, value: r.uint() });
    defs.push({ name, kind, fields });
  }
  for (const def of defs) {
    for (const field of def.fields) field.typeName = field.type < 0 ? NATIVE[~field.type] : defs[field.type].name;
    def.byName = Object.fromEntries(def.fields.map((field) => [field.name, field]));
    def.byValue = new Map(def.fields.map((field) => [field.value, field]));
  }
  return { defs, byName: Object.fromEntries(defs.map((def) => [def.name, def])) };
}

function readValue(schema, r, typeName) {
  switch (typeName) {
    case "bool": return r.bool();
    case "byte": return r.byte();
    case "int": return r.int();
    case "uint": return r.uint();
    case "float": return r.float();
    case "string": return r.string();
    case "int64": return r.int64();
    case "uint64": return r.uint64();
  }
  const def = schema.byName[typeName];
  if (def.kind === "ENUM") { const v = r.uint(); return def.byValue.get(v)?.name ?? v; }
  if (def.kind === "STRUCT") { const out = {}; for (const field of def.fields) out[field.name] = readField(schema, r, field); return out; }
  const out = {};
  for (;;) {
    const v = r.uint();
    if (v === 0) return out;
    const field = def.byValue.get(v);
    if (!field) throw new Error(`kiwi: ${typeName} has no field ${v}`);
    out[field.name] = readField(schema, r, field);
  }
}
function readField(schema, r, field) {
  if (!field.isArray) return readValue(schema, r, field.typeName);
  const n = r.uint();
  if (field.typeName === "byte") return Array.from(r.bytes(n));
  const out = [];
  for (let i = 0; i < n; i++) out.push(readValue(schema, r, field.typeName));
  return out;
}

/** A message (or any root type) from its kiwi bytes. */
export const decodeMessage = (schema, bytes, root = "Message") => readValue(schema, new Reader(bytes), root);

function writeValue(schema, w, typeName, value, strict, path) {
  switch (typeName) {
    case "bool": return w.bool(value);
    case "byte": return w.byte(value);
    case "int": return w.int(value);
    case "uint": return w.uint(value);
    case "float": return w.float(value);
    case "string": return w.string(String(value));
    case "int64": return w.int64(value);
    case "uint64": return w.uint64(value);
  }
  const def = schema.byName[typeName];
  if (def.kind === "ENUM") {
    const field = typeof value === "number" ? def.byValue.get(value) : def.byName[value];
    if (!field) throw new Error(`kiwi: ${path} — ${typeName} has no value ${value}`);
    return w.uint(field.value);
  }
  if (value === null || typeof value !== "object") throw new Error(`kiwi: ${path} — ${typeName} needs an object, got ${value}`);
  if (strict) for (const key of Object.keys(value)) if (!def.byName[key] && value[key] !== undefined) throw new Error(`kiwi: ${path} — ${typeName} has no field "${key}"`);
  if (def.kind === "STRUCT") { for (const field of def.fields) writeField(schema, w, field, value[field.name], strict, `${path}.${field.name}`); return; }
  for (const field of def.fields) {
    if (value[field.name] === undefined) continue;
    w.uint(field.value);
    writeField(schema, w, field, value[field.name], strict, `${path}.${field.name}`);
  }
  w.uint(0);
}
function writeField(schema, w, field, value, strict, path) {
  if (!field.isArray) return writeValue(schema, w, field.typeName, value, strict, path);
  w.uint(value.length);
  if (field.typeName === "byte") return w.bytes(Uint8Array.from(value));
  value.forEach((item, index) => writeValue(schema, w, field.typeName, item, strict, `${path}[${index}]`));
}

/** The kiwi bytes of a message. `strict` refuses a key the schema does not have (a typo would otherwise vanish). */
export function encodeMessage(schema, value, { root = "Message", strict = false } = {}) {
  const w = new Writer();
  writeValue(schema, w, root, value, strict, root);
  return w.done();
}

const isNode = typeof process !== "undefined" && !!process.versions?.node && typeof window === "undefined";
const zlib = () => import(/* @vite-ignore */ "node:zlib");

async function streamed(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}
/** Raw deflate (no zlib header), as the buffer's chunks are. */
export async function deflateRaw(bytes) {
  if (typeof CompressionStream === "function") return streamed(bytes, new CompressionStream("deflate-raw"));
  return new Uint8Array((await zlib()).deflateRawSync(bytes));
}
export async function inflateRaw(bytes) {
  if (typeof DecompressionStream === "function") return streamed(bytes, new DecompressionStream("deflate-raw"));
  return new Uint8Array((await zlib()).inflateRawSync(bytes));
}
/** A chunk Figma wrote: deflate-raw, or zstd for its messages (Node 22.15+ only). */
async function unpack(bytes) {
  if (bytes[0] === 0x28 && bytes[1] === 0xb5 && bytes[2] === 0x2f && bytes[3] === 0xfd) {
    if (!isNode) throw new Error("kiwi: a zstd chunk needs Node");
    const z = await zlib();
    if (typeof z.zstdDecompressSync !== "function") throw new Error("kiwi: this Node has no zstd");
    return new Uint8Array(z.zstdDecompressSync(bytes));
  }
  return inflateRaw(bytes);
}

export function base64Of(bytes) {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let binary = "";
  for (let at = 0; at < bytes.length; at += 0x8000) binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
  return btoa(binary);
}
export function bytesOf(base64) {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(base64, "base64"));
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

/** The fig-kiwi buffer: magic, version, then each chunk with its length. */
export function figKiwiBuffer(version, chunks) {
  const size = 12 + chunks.reduce((sum, chunk) => sum + 4 + chunk.length, 0);
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  out.set(utf8.encode(FIG_KIWI_MAGIC), 0);
  view.setUint32(8, version, true);
  let at = 12;
  for (const chunk of chunks) { view.setUint32(at, chunk.length, true); out.set(chunk, at + 4); at += 4 + chunk.length; }
  return out;
}

/**
 * The text/html Figma pastes: `schemaDeflated` (the schema chunk as Figma wrote it) and its decoded `schema`, the
 * `message` to encode, and `meta` (fileKey, selectedNodeData…). Strict: a key the schema lacks is an error.
 */
export async function figmaClipboardHtml({ version, schemaDeflated, schema, message, meta }) {
  const messageBytes = await deflateRaw(encodeMessage(schema, message, { strict: true }));
  const buffer = figKiwiBuffer(version, [schemaDeflated, messageBytes]);
  const metaText = base64Of(utf8.encode(JSON.stringify({ dataType: "scene", editorType: "design", environment: "www.figma.com", imageHashes: {}, ...meta })));
  return `<meta charset="utf-8"><span data-metadata="<!--(figmeta)${metaText}(/figmeta)-->"></span><span data-buffer="<!--(figma)${base64Of(buffer)}(/figma)-->"></span>`;
}

/** Figma's clipboard html read back: its meta, buffer version, schema and message (null when it is not Figma's). */
export async function readFigmaClipboard(html) {
  const metaMatch = /\(figmeta\)([A-Za-z0-9+/=]+)\(\/figmeta\)/.exec(html);
  const bufferMatch = /\(figma\)([A-Za-z0-9+/=]+)\(\/figma\)/.exec(html);
  if (!bufferMatch) return null;
  const buffer = bytesOf(bufferMatch[1]);
  if (fromUtf8.decode(buffer.subarray(0, 8)) !== FIG_KIWI_MAGIC) throw new Error("kiwi: not a fig-kiwi buffer");
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const version = view.getUint32(8, true);
  const chunks = [];
  for (let at = 12; at < buffer.length;) { const n = view.getUint32(at, true); chunks.push(buffer.subarray(at + 4, at + 4 + n)); at += 4 + n; }
  const schema = decodeSchema(await inflateRaw(chunks[0]));
  const message = decodeMessage(schema, await unpack(chunks[1]));
  const meta = metaMatch ? JSON.parse(fromUtf8.decode(bytesOf(metaMatch[1]))) : null;
  return { meta, version, schemaDeflated: chunks[0], schema, message };
}
