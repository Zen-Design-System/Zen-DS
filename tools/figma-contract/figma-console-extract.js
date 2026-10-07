// Figma contract extractor. Runs unchanged in the Figma desktop console and in the use_figma MCP tool
// (see README "Refreshing the Figma data"). It never touches `window` (use_figma binds it read-only to
// undefined): internals live in this block, the public helpers are set on globalThis.
{
const G = globalThis;
const __V = (G.__V = G.__V || {}), __ES = (G.__ES = G.__ES || {}), __TS = (G.__TS = G.__TS || {});
const __vname = async (id) => { if (!(id in __V)) { const v = await figma.variables.getVariableByIdAsync(id); __V[id] = v ? v.name : '?'; } return __V[id]; };
const __sname = async (id, cache) => { if (!id || typeof id !== 'string') return undefined; if (!(id in cache)) { try { const s = await figma.getStyleByIdAsync(id); cache[id] = s ? s.name : '?'; } catch (e) { cache[id] = '?'; } } return cache[id]; };
const __bvs = async (bv) => { if (!bv) return undefined; const o = {}; for (const [k, v] of Object.entries(bv)) { if (Array.isArray(v)) o[k] = await Promise.all(v.map(x => __vname(x.id))); else if (v && v.id) o[k] = await __vname(v.id); else if (v && typeof v === 'object') { const inner = {}; for (const [k2, v2] of Object.entries(v)) if (v2 && v2.id) inner[k2] = await __vname(v2.id); o[k] = inner; } } return Object.keys(o).length ? o : undefined; };
const __hex = (c, op) => { if (!c) return undefined; const a = (c.a ?? 1) * (op ?? 1); return '#' + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('') + (a < 0.999 ? Math.round(a * 255).toString(16).padStart(2, '0') : ''); };
const __paints = async (ps) => { if (!Array.isArray(ps) || !ps.length) return undefined; const out = []; for (const p of ps) { const o = { t: p.type }; if (p.visible === false) o.hidden = true; if (p.type === 'SOLID') o.c = __hex(p.color, p.opacity); else if (p.opacity !== 1) o.op = p.opacity; if (p.boundVariables && p.boundVariables.color) o.v = await __vname(p.boundVariables.color.id); if (p.gradientStops) o.stops = await Promise.all(p.gradientStops.map(async s => ({ p: +s.position.toFixed(3), c: __hex(s.color), v: s.boundVariables && s.boundVariables.color ? await __vname(s.boundVariables.color.id) : undefined }))); out.push(o); } return out; };
const __spec = async (n, depth) => {
  depth = depth || 0;
  const o = { n: n.name, t: n.type };
  if (n.visible === false) o.hidden = true;
  if (depth > 0) { o.x = +n.x.toFixed(2); o.y = +n.y.toFixed(2); }
  o.w = +n.width.toFixed(2); o.h = +n.height.toFixed(2);
  if (n.opacity !== undefined && n.opacity !== 1) o.op = n.opacity;
  if ('layoutMode' in n && n.layoutMode && n.layoutMode !== 'NONE') {
    o.lay = { m: n.layoutMode, pa: n.primaryAxisAlignItems, ca: n.counterAxisAlignItems, p: [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft], gap: n.itemSpacing, wrap: n.layoutWrap !== 'NO_WRAP' ? n.layoutWrap : undefined, psm: n.primaryAxisSizingMode, csm: n.counterAxisSizingMode };
  }
  if ('layoutSizingHorizontal' in n) o.sz = [n.layoutSizingHorizontal, n.layoutSizingVertical];
  if (n.layoutPositioning === 'ABSOLUTE') o.abs = true;
  if (n.minWidth) o.minW = n.minWidth; if (n.maxWidth) o.maxW = n.maxWidth; if (n.minHeight) o.minH = n.minHeight;
  if ('cornerRadius' in n) { if (n.cornerRadius === figma.mixed) o.r = [n.topLeftRadius, n.topRightRadius, n.bottomRightRadius, n.bottomLeftRadius]; else if (n.cornerRadius) o.r = n.cornerRadius; }
  if ('clipsContent' in n && n.clipsContent) o.clip = true;
  const f = await __paints(n.fills); if (f) o.fill = f;
  const s = await __paints(n.strokes); if (s) { o.stroke = s; o.sw = n.strokeWeight === figma.mixed ? [n.strokeTopWeight, n.strokeRightWeight, n.strokeBottomWeight, n.strokeLeftWeight] : n.strokeWeight; o.sa = n.strokeAlign; if (n.dashPattern && n.dashPattern.length) o.dash = n.dashPattern; }
  if (n.fillStyleId && typeof n.fillStyleId === 'string') o.fillStyle = await __sname(n.fillStyleId, __ES);
  if (n.effects && n.effects.length) { o.fx = []; for (const e of n.effects) { if (e.visible === false) continue; const x = { t: e.type }; if (e.radius !== undefined) x.r = e.radius; if (e.offset) x.o = [e.offset.x, e.offset.y]; if (e.spread) x.s = e.spread; if (e.color) x.c = __hex(e.color); if (e.boundVariables && e.boundVariables.color) x.v = await __vname(e.boundVariables.color.id); o.fx.push(x); } if (!o.fx.length) delete o.fx; }
  if (n.effectStyleId && typeof n.effectStyleId === 'string') o.fxStyle = await __sname(n.effectStyleId, __ES);
  if (n.strokeStyleId && typeof n.strokeStyleId === 'string') o.strokeStyle = await __sname(n.strokeStyleId, __ES);
  const bv = await __bvs(n.boundVariables); if (bv && n.type === 'TEXT' && typeof n.textStyleId === 'string') { for (const k of ['fontSize','fontFamily','fontWeight','lineHeight','letterSpacing','paragraphSpacing','fontStyle']) delete bv[k]; } if (bv) { delete bv.fills; delete bv.strokes; delete bv.effects; if (Object.keys(bv).length) o.bv = bv; }
  if (n.type === 'TEXT') {
    o.txt = n.characters.slice(0, 60);
    if (typeof n.textStyleId === 'string') o.ts = await __sname(n.textStyleId, __TS); else if (n.textStyleId === figma.mixed) o.ts = 'MIXED';
    if (n.fontSize !== figma.mixed) o.fs = n.fontSize; if (n.fontName !== figma.mixed) o.font = n.fontName.family + ' ' + n.fontName.style;
    if (n.lineHeight !== figma.mixed) o.lh = n.lineHeight.unit === 'AUTO' ? 'AUTO' : n.lineHeight.value + (n.lineHeight.unit === 'PERCENT' ? '%' : '');
    if (n.letterSpacing !== figma.mixed && n.letterSpacing.value) o.ls = n.letterSpacing.value + (n.letterSpacing.unit === 'PERCENT' ? '%' : '');
    o.align = [n.textAlignHorizontal, n.textAlignVertical]; if (n.textAutoResize !== 'WIDTH_AND_HEIGHT') o.auto = n.textAutoResize; if (n.textTruncation === 'ENDING') o.trunc = n.maxLines || true;
    if (n.textCase && n.textCase !== 'ORIGINAL' && n.textCase !== figma.mixed) o.case = n.textCase;
  }
  if (n.type === 'INSTANCE') {
    try { const mc = await n.getMainComponentAsync(); if (mc) o.main = (mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.name + ' / ' : '') + mc.name; } catch (e) { o.main = '?'; }
    let cp; try { cp = n.componentProperties; } catch (e) { o.propsError = true; } if (cp) { o.props = {}; for (const [k, v] of Object.entries(cp)) o.props[k.split('#')[0]] = v.value; }
  }
  if ('children' in n && n.children.length) { o.c = []; for (const ch of n.children) o.c.push(await __spec(ch, depth + 1)); }
  return o;
};
const __vpOf = (c) => { try { return c.variantProperties || {}; } catch (e) { return Object.fromEntries(c.name.split(',').map(p => p.split('=').map(x => x.trim()))); } };
const __setSpec = async (id, filter) => {
  const s = await figma.getNodeByIdAsync(id);
  const out = { id, name: s.name, type: s.type, description: s.description || undefined, docs: (s.documentationLinks || []).map(l => l.uri) };
  if (s.type === 'COMPONENT_SET') { out.props = {}; let defs = {}; try { defs = s.componentPropertyDefinitions; } catch (e) { out.defsError = String(e.message).slice(0, 80); } for (const [k, v] of Object.entries(defs)) out.props[k] = { t: v.type, d: v.defaultValue, o: v.variantOptions }; out.variants = []; for (const c of s.children) { if (filter && !filter(__vpOf(c))) continue; out.variants.push({ vp: __vpOf(c), d: c.description || undefined, spec: await __spec(c, 0) }); } }
  else out.spec = await __spec(s, 0);
  return out;
};
const __RUN = async (ids, filter) => { G.__OUT = []; for (const id of ids) G.__OUT.push(await __setSpec(id, filter)); G.__OUTS = JSON.stringify(G.__OUT); return 'ready ' + G.__OUTS.length; };
// Clipboard reads through the device bridge cap at ~256 kB: copy one padded chunk at a time with
// copy(__C(i)) for i < __N(). Padding keeps small chunks large enough to be saved to a file.
const __N = () => Math.ceil(G.__OUTS.length / 230000);
const __C = (i) => { const part = G.__OUTS.slice(i * 230000, (i + 1) * 230000); return part + ' '.repeat(Math.max(0, 130000 - part.length)); };
// Hashing: 32-bit FNV-1a over the UTF-16 code units of a string, as 8 hex digits.
const __FNV = (str) => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); };
// Variant key: the variant properties in Figma order, 'Size=Small,State=Default'. A plain component has key ''.
const __KEY = (vp) => Object.entries(vp || {}).map(([k, x]) => k + '=' + x).join(',');
// Digest of one extracted entry (a __RUN entry or a stored contract entry): h = the whole entry,
// v = { variant key: hash of JSON.stringify(spec) }. Same input, same digest, in Figma and in node.
const __DIGEST = (e) => { const v = {}; for (const x of e.variants || [{ vp: {}, spec: e.spec }]) { let k = __KEY(x.vp); for (let i = 2; k in v; i++) k = __KEY(x.vp) + ' #' + i; v[k] = __FNV(JSON.stringify(x.spec)); } return { id: e.id, n: e.name, h: __FNV(JSON.stringify(e)), v }; };
const __HASHES = async (ids, filter) => { const out = []; for (const id of ids) { try { out.push(__DIGEST(await __setSpec(id, filter))); } catch (e) { out.push({ id, error: String((e && e.message) || e).slice(0, 120) }); } } return out; };
Object.assign(G, { __vname, __sname, __bvs, __hex, __paints, __spec, __vpOf, __setSpec, __RUN, __N, __C, __FNV, __KEY, __DIGEST, __HASHES });
}
'extractor loaded';
