// Figma kit digest. Appended AFTER tools/figma-contract/figma-console-extract.js, both in the use_figma MCP tool /
// Figma console and in node (lib.mjs runs the two files in one vm context), so the two sides hash identically.
// It replaces __DIGEST and __HASHES with a version that is
//   · mode-independent: a paint, effect or gradient stop that carries a bound variable name (`v`) drops its resolved
//     colour (`c`), so moving a set into another mode frame or changing a token VALUE never changes a hash; only a
//     re-binding, a geometry change or a new layer does (token values are the token-sync job, not the contract's);
//   · order-independent: `h` covers the set's own fields plus its variants sorted by key, so a different child order
//     in Figma (or the order a patch appended a variant in) is never reported as a change.
// KIT_VERSION changes whenever the digest rules change: a lock made by another version must be rebuilt.
{
const G = globalThis;
// use_figma skips the children of invisible instances unless told otherwise; the Figma desktop console (where the stored
// contracts were captured) does not. Without this line a hidden `Dash` instance loses its children and a hidden nested
// instance disappears, so every set that has one hashes differently from its contract.
if (typeof figma !== 'undefined') figma.skipInvisibleInstanceChildren = false;
const KIT_VERSION = 2;
const paintLike = (o) => typeof o.v === 'string' && typeof o.c === 'string' && (typeof o.t === 'string' || typeof o.p === 'number');
// Layers that are hidden AND live inside an instance are ignored, and a hidden instance keeps no children: whether they
// were captured depends on the capture tool/era (the desktop console, older extractor runs and use_figma disagree), they
// are not visible and they belong to the master component. Hidden layers of the component itself are still hashed.
const norm = (o, inInst) => {
  if (Array.isArray(o)) return o.map((x) => norm(x, inInst));
  if (o && typeof o === 'object') {
    const r = {}, drop = paintLike(o), isInst = o.t === 'INSTANCE', inside = inInst || isInst;
    for (const k of Object.keys(o)) {
      if (drop && k === 'c') continue;
      if (k === 'c' && Array.isArray(o.c) && isInst && o.hidden === true) continue;
      if (k === 'c' && Array.isArray(o.c) && inside && o.t !== undefined) { r.c = o.c.filter((x) => !(x && x.hidden === true)).map((x) => norm(x, inside)); continue; }
      r[k] = norm(o[k], inside);
    }
    // Older captures kept the typography variable bindings of a text layer that has a text style; the current extractor drops them.
    if (o.t === 'TEXT' && typeof o.ts === 'string' && r.bv) { for (const k of ['fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing', 'paragraphSpacing', 'fontStyle']) delete r.bv[k]; if (!Object.keys(r.bv).length) delete r.bv; }
    return r;
  }
  return o;
};
const DIGEST = (e) => {
  const { variants, spec, ...meta } = e;
  // use_figma returns the set description HTML-escaped (&quot;), the desktop console does not: compare it unescaped.
  if (typeof meta.description === 'string') meta.description = meta.description.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const v = {};
  for (const x of variants || [{ vp: {}, spec }]) { let k = G.__KEY(x.vp); for (let i = 2; k in v; i++) k = G.__KEY(x.vp) + ' #' + i; v[k] = G.__FNV(JSON.stringify(norm(x.spec))); }
  const sorted = Object.keys(v).sort().map((k) => [k, v[k]]);
  return { id: e.id, n: e.name, h: G.__FNV(JSON.stringify([norm(meta), sorted])), v };
};
const HASHES = async (ids, filter) => { const out = []; for (const id of ids) { try { out.push(DIGEST(await G.__setSpec(id, filter))); } catch (err) { out.push({ id, error: String((err && err.message) || err).slice(0, 120) }); } } return out; };
Object.assign(G, { __DIGEST_RAW: G.__DIGEST, __DIGEST: DIGEST, __HASHES: HASHES, __NORM: norm, __KIT_VERSION: KIT_VERSION });
}
'figma-kit digest loaded';
