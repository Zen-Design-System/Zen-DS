// Figma kit library: digests, the contracts lock, delta comparison and contract patching. Pure node, no dependencies.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
export const paths = {
  here, repo,
  contracts: path.join(repo, "docs/figma-contracts"),
  extractor: path.join(repo, "tools/figma-contract/figma-console-extract.js"),
  norm: path.join(here, "digest-norm.js"),
  lock: path.join(here, "contracts.lock.json"),
};
export const FILE_KEY = "9nZv4uW2LT21yuHabMTCh1";
/** Contract files that are superseded: their sets are not locked (button.json → button-text.json / button-icon.json). */
export const IGNORE_FILES = ["button.json"];
/** One use_figma result is capped near 20 KB, and a string comes back JSON-escaped: 15,000 characters per part. */
export const PART = 15000;

const read = (p) => fs.readFileSync(p, "utf8");
const plain = (x) => JSON.parse(JSON.stringify(x)); // detach from the vm realm

let ctx;
/** The extractor + kit digest loaded into one vm context: the same code use_figma runs, executed here in node. */
export function digester() {
  if (!ctx) { ctx = vm.createContext({}); vm.runInContext(read(paths.extractor), ctx); vm.runInContext(read(paths.norm), ctx); }
  return ctx;
}
export const keyOf = (vp) => digester().__KEY(vp);
export const digest = (entry) => plain(digester().__DIGEST(entry));
export const kitVersion = () => digester().__KIT_VERSION;
/** The code prefix of every use_figma call: extractor + kit digest. */
export const codePrefix = () => `${read(paths.extractor).trimEnd()}\n${read(paths.norm).trimEnd()}\n`;

/* ── contract files ─────────────────────────────────────────────────────────────────────────────────────────────── */
// The stored contracts were written by two tools: JS `JSON.stringify` (compact) and Python `json.dumps` (", " and ": "
// separators, non-ASCII escaped). A patch must write the file back byte-for-byte in the layout it had, or one changed
// variant would turn into a whole-file diff.
function serialize(data, { ind, nl, spaced, ascii }) {
  let s = JSON.stringify(data, null, ind);
  if (spaced || ascii) {
    let out = "", inStr = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (inStr) {
        if (ch === "\\") { out += ch + s[++i]; continue; }
        if (ch === '"') inStr = false;
        out += ascii && ch.charCodeAt(0) > 127 ? `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}` : ch;
      } else { out += ch; if (ch === '"') inStr = true; else if (spaced && (ch === "," || ch === ":")) out += " "; }
    }
    s = out;
  }
  return s + nl;
}
function detectStyle(raw, data) {
  for (const ind of [undefined, 1, 2, 4]) for (const nl of ["", "\n"]) for (const ascii of [false, true]) for (const spaced of ind === undefined ? [false, true] : [false]) {
    const style = { ind, nl, spaced, ascii };
    if (serialize(data, style) === raw) return style;
  }
  return null;
}
export function readContract(file, dir = paths.contracts) {
  const p = path.join(dir, file), raw = read(p), data = JSON.parse(raw);
  return { file, p, data, style: detectStyle(raw, data) };
}
/** Writes a contract back in the layout it had. An unknown layout is refused, never reformatted. */
export function writeContract(c, data) {
  if (!c.style) throw new Error(`${c.file}: its JSON layout is not one this kit reproduces exactly (JS compact, Python default or 1/2/4-space indent), so a patch would reformat the whole file; convert it first`);
  const tmp = `${c.p}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, serialize(data, c.style));
  fs.renameSync(tmp, c.p);
}

/* ── the lock: id → { name, file, h, v: { variant key: hash } } ─────────────────────────────────────────────────── */
export function buildLock({ dir = paths.contracts, ignore = IGNORE_FILES } = {}) {
  const sets = {}, duplicates = {};
  for (const file of fs.readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
    if (ignore.includes(file)) continue;
    const { data } = readContract(file, dir);
    if (!Array.isArray(data)) continue;
    for (const e of data) {
      if (!e || !e.id) continue;
      if (sets[e.id]) { (duplicates[e.id] ??= [sets[e.id].file]).push(file); continue; } // first file (alphabetical) wins
      const d = digest(e);
      sets[e.id] = { name: e.name, file, h: d.h, v: d.v };
    }
  }
  const sorted = Object.fromEntries(Object.entries(sets).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })));
  return { kit: kitVersion(), fileKey: FILE_KEY, sets: sorted, duplicates };
}
export const readLock = (p = paths.lock) => JSON.parse(read(p));
export const writeLock = (lock, p = paths.lock) => { const tmp = `${p}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify(lock, null, 1) + "\n"); fs.renameSync(tmp, p); };

/* ── delta: the lock against what __HASHES returned from the live file ─────────────────────────────────────────── */
/** live = the array `__HASHES` returned (summary rows `{id,n,h}` or full rows with `v`). */
export function compare(lock, live) {
  return live.map((r) => {
    const s = lock.sets[r.id];
    const base = { id: r.id, name: s?.name ?? r.n };
    if (r.error) return { ...base, status: "error", error: r.error };
    if (!s) return { ...base, status: "new" };
    if (r.h === s.h) return { ...base, status: "unchanged" };
    if (!r.v) return { ...base, status: "changed", note: "hash differs; list the variants with `code hashes --full` to see which" };
    const changed = [], added = [], removed = [];
    for (const k of new Set([...Object.keys(s.v), ...Object.keys(r.v)])) {
      if (!(k in r.v)) removed.push(k); else if (!(k in s.v)) added.push(k); else if (r.v[k] !== s.v[k]) changed.push(k);
    }
    const status = changed.length || added.length || removed.length ? "variants" : "meta";
    return { ...base, status, changed, added, removed };
  });
}

/* ── patch: merge changed variants (from `code fetch`) into a stored contract, refresh the lock ─────────────────── */
/** Variant keys of a stored entry, index-aligned with entry.variants (a duplicate key gets ' #2'…, as in the digest). */
const variantKeys = (entry) => Object.keys(digest(entry).v);

export function applyPatch({ lock, setId, fetched, remove = [], file, dir = paths.contracts, write = true }) {
  const known = lock.sets[setId];
  const target = known?.file ?? file;
  if (!target) throw new Error(`set ${setId} is not in the lock: pass --file=<contract .json> to say where it belongs`);
  const c = readContract(target, dir);
  if (!Array.isArray(c.data)) throw new Error(`${target}: not an array of sets`);
  const fe = fetched.find((e) => e.id === setId);
  if (!fe) throw new Error(`the fetched data has no set ${setId} (it has: ${fetched.map((e) => e.id).join(", ") || "none"})`);
  const at = c.data.findIndex((e) => e.id === setId);
  let next, summary;
  if (!Array.isArray(fe.variants)) { next = fe; summary = { replaced: [], added: [], removed: [], whole: true }; }
  else {
    const old = at >= 0 ? c.data[at] : { variants: [] };
    const oldKeys = at >= 0 ? variantKeys(old) : [];
    const list = [...(old.variants ?? [])], byKey = new Map(oldKeys.map((k, i) => [k, i]));
    const fKeys = variantKeys(fe), replaced = [], added = [];
    fe.variants.forEach((v, i) => {
      const k = fKeys[i];
      if (byKey.has(k)) { list[byKey.get(k)] = v; replaced.push(k); } else { list.push(v); added.push(k); }
    });
    const gone = new Set(remove);
    const removed = oldKeys.filter((k) => gone.has(k));
    for (const k of removed) list[byKey.get(k)] = null;
    next = { ...fe, variants: list.filter(Boolean) };
    summary = { replaced, added, removed, whole: false };
  }
  const data = [...c.data];
  if (at >= 0) data[at] = next; else data.push(next);
  const d = digest(next);
  const updated = { ...lock, sets: { ...lock.sets, [setId]: { name: next.name, file: target, h: d.h, v: d.v } } };
  updated.sets = Object.fromEntries(Object.entries(updated.sets).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })));
  if (write) { writeContract(c, data); }
  return { file: target, summary, digest: d, lock: updated };
}
