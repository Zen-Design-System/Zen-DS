// UI Foundations deck — slide builders for the Figma MCP (use_figma), file WxivIlv1HgC9NEMwtw9MOS, page 727:2.
// Stored in the file as shared plugin data ('uifdeck', 'lib'). Load it in a use_figma call with:
//   const L = await (new Function('figma', figma.root.getSharedPluginData('uifdeck', 'lib')))(figma);
// then: const sec = L.section('Lesson 02 · Figma essentials', 2); await L.slide(sec, 0, {...}); L.fit(sec);
// Rules for this file: no backticks and no template placeholders (it is uploaded inside String.raw).
// Slide data: see README.md next to this file.
return (async function () {
  const page = await figma.getNodeByIdAsync('727:2');
  await figma.setCurrentPageAsync(page);
  const FONTS = [['Paytone One', 'Regular'], ['Kalam', 'Bold'], ['Courier Prime', 'Regular'], ['Inter', 'Regular'], ['Inter', 'Medium'], ['Inter', 'Semi Bold'], ['Inter', 'Bold'], ['JetBrains Mono', 'Regular']];
  await Promise.all(FONTS.map(function (f) { return figma.loadFontAsync({ family: f[0], style: f[1] }); }));

  // ---------- local deck variables, styles, components ----------
  const VAR = {};
  const VIDS = { paper: 'VariableID:747:434', ink: 'VariableID:747:435', soft: 'VariableID:747:436', photo: 'VariableID:747:437', edge: 'VariableID:747:438', clip: 'VariableID:747:439', note: 'VariableID:747:440', noteEdge: 'VariableID:747:441' };
  for (const k in VIDS) VAR[k] = await figma.variables.getVariableByIdAsync(VIDS[k]);
  const bind = function (v) { return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v); };
  const styles = await figma.getLocalTextStylesAsync();
  const TS = function (n) { const s = styles.find(function (x) { return x.name === n; }); if (!s) throw new Error('text style missing: ' + n); return s; };
  const FX = (await figma.getLocalEffectStylesAsync()).find(function (s) { return s.name === 'Typed/Photo shadow'; });
  const CID = { paper: '749:434', ruleD: '749:435', ruleS: '749:437', header: '749:440', footer: '749:446', note: '749:449', point: '749:451', stamp: '749:454', clip: '749:459', toc: '749:460' };
  const COMP = {};
  for (const k in CID) COMP[k] = await figma.getNodeByIdAsync(CID[k]);
  const P = { hL: 'Left#749:0', hR: 'Right#749:1', fL: 'Left#749:2', fP: 'Page#749:3', note: 'Note#749:4', pN: 'Number#749:5', pT: 'Text#749:6', sT: 'Title#749:7', sS: 'Sub#749:8', tN: 'Number#749:9', tT: 'Title#749:10', tP: 'Page#749:11' };

  // ---------- Zen (ZEN Kaiz Official-Sep2026) ----------
  const ZK = { ink: '405d6d45bf73d56595d2c4f5fd31e174329af48e', base: 'f58749d8214b555b4238cee532402f3bf81e0412', white: '8788dacce4375c9239df92233f62b12b4376eddd', canvas: '945384780ce2571182cca64d13509a3ce5c2d783', subtle: '13bc78461511f25591a28abaaea22c25da6bb04f', accent: '7741cf6bc49113198871974200e1bf151d34fe2c', accentText: '7402c914f4c8f169b1a048b1fe2fd05c8bfd71fc', accentSoft: '14875126bb3f44deab957a19a4cbc5afa432ef3b', yellow: '69986b4e3de6af11ba65c9551efdd0b8a3fa7560', pink: '5fca0e90998d3cd4ec95a15e566478c8a674bc8a', blue: '87929d27b3bd990a7bbb58ba4b8f6f21bc9fea6b', green: '7a1eaa3e6b995dc6a62f0c305b1de76b8204cd60', orange: '5e9d7890c69c8996198d6fc640b56eae89bae648', red: 'b136c075d9de2ee272cb8bcd2bf85057b6991b87' };
  const ZCOL = { semantic: '7774e0fe481c02ab5d95ec0f6a966077e2691a45', global: '1b7fef9f6fefa34d517837bddd07516b3638bd52' };
  const ZSET = { button: 'd47c79f66db5221b0e0ed5ed092be99c415ec2a6', textField: 'e98b29a6380d63ec5dbc74df9f6c4fb3d12b22f8', toggle: '9685499bb16e5adde62b70f3f09ede154e4768d9', chip: '429d0424ba78d07ed3c210dcd6596a3855929ab4', badge: 'e04184cde218771d3e734046e3aa3d9565c421f0', avatar: 'b265695291520a35b77abf3e1c6b356a484cdb5e', avatarStack: '2ebaab32253aee4d20c12aa6511387c939109d49', progress: '5fa68b850c2fa9279d8fe59dafcc695c8fbaaa90', topNav: '78a6be5df5f6d27f7a8f0f614828f8a0b8232a4d', toast: '0d7a99c3e639cd9e6c8dd16b27dc38bdb289eb38', inline: '0268229da5d742f5d5ab9090b1e8ecfeeb077d25', dialog: 'a0f4c619c2215361db64cd5d96688bd898c0edf9', stepper: 'a7bc2869d2cc60cbdd9147f5289bbca0b24f0939', tabBar: '011887f6c65a545c3930917b1b0eb50aa8e73219', checkbox: '8c2ccea77198f44cd83b340cc1fc06dd9ffaba91', skeleton: 'a5f13a26db3b706c864325e3d948b39d78056c8a' };
  const ZEFFECT = { 'Level-1': '04a115e43e3d4b64c72c5d7f177bcf320f9e504e', 'Level-3': '81497aed8f034c429d9ed55aa4ebf2d8a1e25ed0', 'Level-4': 'a965f689ee2616f39c322f6985356161e6ad6202' };
  const zvCache = {}, zsetCache = {}, zlist = {};
  async function zvar(name) {
    if (zvCache[name]) return zvCache[name];
    let key = ZK[name];
    if (!key) {
      for (const c of ['global', 'semantic']) {
        if (!zlist[c]) zlist[c] = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(ZCOL[c]);
        const hit = zlist[c].find(function (v) { return v.name === name; }) || zlist[c].find(function (v) { return v.name.endsWith('/' + name) || v.name.endsWith(name); });
        if (hit) { key = hit.key; break; }
      }
    }
    if (!key) throw new Error('Zen variable not found: ' + name);
    zvCache[name] = await figma.variables.importVariableByKeyAsync(key);
    return zvCache[name];
  }
  async function zpaint(name) { return bind(await zvar(name)); }
  async function zset(name) {
    if (!zsetCache[name]) zsetCache[name] = await figma.importComponentSetByKeyAsync(ZSET[name]);
    return zsetCache[name];
  }
  async function loadFontsIn(n) {
    const m = new Map();
    const texts = n.type === 'TEXT' ? [n] : n.findAll(function (x) { return x.type === 'TEXT'; });
    for (const t of texts) {
      const fns = t.characters.length ? t.getRangeAllFontNames(0, t.characters.length) : [t.fontName];
      for (const fn of fns) if (fn && fn.family) m.set(fn.family + '|' + fn.style, fn);
    }
    await Promise.all(Array.from(m.values()).map(function (fn) { return figma.loadFontAsync(fn); }));
  }
  // Zen instance: variant = { Size: 'Small', Level: 'Primary' }, text = { Text: 'Save' } (component TEXT props or nested text layer names)
  async function zi(name, variant, text) {
    const set = await zset(name);
    variant = variant || {};
    const keys = Object.keys(variant);
    let comp = set.children.find(function (c) { return keys.every(function (k) { return c.name.indexOf(k + '=' + variant[k]) >= 0; }); });
    if (!comp) comp = set.defaultVariant;
    const inst = comp.createInstance();
    if (text) await setText(inst, text);
    return inst;
  }
  async function setText(inst, text) {
    const props = inst.componentProperties || {};
    const direct = {};
    const nested = {};
    for (const k in text) {
      const pk = Object.keys(props).find(function (p) { return p.split('#')[0] === k && props[p].type === 'TEXT'; });
      if (pk) direct[pk] = text[k]; else nested[k] = text[k];
    }
    if (Object.keys(direct).length) inst.setProperties(direct);
    for (const k in nested) {
      let t = inst.findAll(function (n) { return n.type === 'TEXT' && n.name === k; })[0];
      if (!t) { const all = inst.findAll(function (n) { return n.type === 'TEXT'; }); if (all.length === 1) t = all[0]; }
      if (!t) continue;
      await loadFontsIn(t);
      t.characters = nested[k];
    }
  }
  function boolProp(inst, name, value) {
    const props = inst.componentProperties || {};
    const pk = Object.keys(props).find(function (p) { return p.split('#')[0] === name && props[p].type === 'BOOLEAN'; });
    if (pk) { const o = {}; o[pk] = value; inst.setProperties(o); }
  }

  // ---------- text helpers ----------
  async function T(str, style, color, name) {
    const t = figma.createText(); await t.setTextStyleIdAsync(TS(style).id);
    t.characters = str; t.fills = [bind(color || VAR.ink)]; if (name) t.name = name; return t;
  }
  // Zen UI text (Inter) for illustrations
  async function Z(str, size, weight, color, name) {
    const t = figma.createText(); t.fontName = { family: 'Inter', style: weight || 'Regular' }; t.fontSize = size || 16;
    t.lineHeight = { unit: 'PERCENT', value: 130 }; t.characters = str; t.fills = [await zpaint(color || 'ink')]; t.name = name || str.slice(0, 24); return t;
  }
  function al(dir, name, gap) { const f = figma.createAutoLayout(dir, { name: name, itemSpacing: gap || 0 }); f.fills = []; return f; }
  function fixW(f, w) { f.resize(w, Math.max(f.height, 1)); f.counterAxisSizingMode = 'FIXED'; f.primaryAxisSizingMode = 'AUTO'; }
  function wrapText(t, w) { t.resize(w, t.height); t.textAutoResize = 'HEIGHT'; return t; }
  async function card(name, w, opts) {
    opts = opts || {};
    const c = al('VERTICAL', name, opts.gap == null ? 10 : opts.gap);
    c.paddingLeft = c.paddingRight = opts.pad == null ? 20 : opts.pad; c.paddingTop = c.paddingBottom = opts.pad == null ? 18 : opts.pad;
    c.fills = [await zpaint(opts.fill || 'white')]; c.cornerRadius = opts.radius == null ? 16 : opts.radius;
    if (opts.stroke !== false) { c.strokes = [await zpaint(opts.stroke || 'subtle')]; c.strokeWeight = 1; }
    if (w) fixW(c, w);
    return c;
  }
  function svg(str) { return figma.createNodeFromSvg(str); }
  async function recolor(node, colorName) {
    const p = await zpaint(colorName || 'ink');
    for (const v of node.findAll(function (n) { return n.type === 'VECTOR'; })) {
      if (v.strokes && v.strokes.length) v.strokes = [p];
      if (v.fills && v.fills.length) v.fills = [p];
    }
    return node;
  }
  async function arrowH(w, colorName) {
    const n = svg('<svg width="' + w + '" height="20" viewBox="0 0 ' + w + ' 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 10 H' + (w - 3) + '" stroke="#000" stroke-width="2"/><path d="M' + (w - 11) + ' 4 L' + (w - 2) + ' 10 L' + (w - 11) + ' 16" stroke="#000" stroke-width="2" stroke-linejoin="round"/></svg>');
    n.name = 'Arrow'; return recolor(n, colorName);
  }
  async function arrowV(h, colorName) {
    const n = svg('<svg width="20" height="' + h + '" viewBox="0 0 20 ' + h + '" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 1 V' + (h - 3) + '" stroke="#000" stroke-width="2"/><path d="M4 ' + (h - 11) + ' L10 ' + (h - 2) + ' L16 ' + (h - 11) + '" stroke="#000" stroke-width="2" stroke-linejoin="round"/></svg>');
    n.name = 'Arrow'; return recolor(n, colorName);
  }
  // free arrow between two points (used by boxes)
  async function arrowXY(W, H, x1, y1, x2, y2, colorName, dashed) {
    const a = Math.atan2(y2 - y1, x2 - x1), L = 12, S = 6;
    const hx1 = x2 - L * Math.cos(a) + S * Math.sin(a), hy1 = y2 - L * Math.sin(a) - S * Math.cos(a);
    const hx2 = x2 - L * Math.cos(a) - S * Math.sin(a), hy2 = y2 - L * Math.sin(a) + S * Math.cos(a);
    const dash = dashed ? ' stroke-dasharray="6 6"' : '';
    const n = svg('<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '" stroke="#000" stroke-width="2"' + dash + '/><path d="M' + hx1 + ' ' + hy1 + ' L' + x2 + ' ' + y2 + ' L' + hx2 + ' ' + hy2 + '" stroke="#000" stroke-width="2" stroke-linejoin="round"/></svg>');
    n.name = 'Arrow'; return recolor(n, colorName);
  }
  async function labelUnder(node, text) {
    const col = al('VERTICAL', 'Item', 10); col.counterAxisAlignItems = 'CENTER';
    col.appendChild(node);
    if (text) col.appendChild(await T(text, 'Typed/Label', VAR.soft, 'Label'));
    return col;
  }

  // ---------- illustrations: each returns a node; figure() fits it into the photo ----------
  const ILLO = {};
  // grid of cards: { cols, items: [{ tag, theme, title, text }] }
  ILLO.cards = async function (p) {
    const cols = p.cols || 3, gap = 16, w = Math.floor((p.width || 760) - gap * (cols - 1)) / cols;
    const grid = al('VERTICAL', 'Cards', gap);
    let row = null;
    for (let i = 0; i < p.items.length; i++) {
      if (i % cols === 0) { row = al('HORIZONTAL', 'Row', gap); grid.appendChild(row); }
      const it = p.items[i];
      const c = await card(it.title || 'Card', w);
      if (it.tag) c.appendChild(await zi('badge', { Size: 'Small', Theme: it.theme || 'Accent', Background: 'Subtle' }, { Text: it.tag }));
      if (it.title) c.appendChild(wrapText(await Z(it.title, p.titleSize || 22, 'Bold'), w - 40));
      if (it.text) c.appendChild(wrapText(await Z(it.text, 17, 'Regular', 'base'), w - 40));
      row.appendChild(c);
    }
    return grid;
  };
  // process: { items: [{ label, sub }], loop: bool, highlight: index }
  ILLO.flow = async function (p) {
    const n = p.items.length, aw = 36, w = Math.floor(((p.width || 760) - aw * (n - 1)) / n);
    const wrap = al('VERTICAL', 'Flow', 14); wrap.counterAxisAlignItems = 'CENTER';
    const row = al('HORIZONTAL', 'Steps', 0); row.counterAxisAlignItems = 'CENTER'; wrap.appendChild(row);
    for (let i = 0; i < n; i++) {
      const it = p.items[i];
      const hi = p.highlight === i;
      const c = await card(it.label, w, { fill: hi ? 'accentSoft' : 'white', pad: 14, gap: 6 });
      c.counterAxisAlignItems = 'CENTER';
      if (p.numbered !== false) c.appendChild(await Z(String(i + 1).padStart(2, '0'), 14, 'Semi Bold', 'accentText'));
      const t = wrapText(await Z(it.label, 19, 'Bold'), w - 28); t.textAlignHorizontal = 'CENTER'; c.appendChild(t);
      if (it.sub) { const s = wrapText(await Z(it.sub, 15, 'Regular', 'base'), w - 28); s.textAlignHorizontal = 'CENTER'; c.appendChild(s); }
      row.appendChild(c);
      if (i < n - 1) row.appendChild(await arrowH(aw));
    }
    if (p.loop) {
      const W = Math.round(row.width), back = svg('<svg width="' + W + '" height="44" viewBox="0 0 ' + W + ' 44" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M' + (W - w / 2) + ' 2 V30 H' + (w / 2) + ' V8" stroke="#000" stroke-width="2" stroke-dasharray="6 6"/><path d="M' + (w / 2 - 6) + ' 14 L' + (w / 2) + ' 4 L' + (w / 2 + 6) + ' 14" stroke="#000" stroke-width="2"/></svg>');
      back.name = 'Loop'; await recolor(back, 'accentText'); wrap.appendChild(back);
      if (p.loopLabel) wrap.appendChild(await T(p.loopLabel, 'Typed/Label', VAR.soft, 'Loop label'));
    }
    return wrap;
  };
  // columns: { cols: [{ head, tag, theme, rows: [] }] }
  ILLO.compare = async function (p) {
    const n = p.cols.length, gap = 16, w = Math.floor(((p.width || 760) - gap * (n - 1)) / n);
    const row = al('HORIZONTAL', 'Compare', gap);
    for (const col of p.cols) {
      const c = await card(col.head, w, { gap: 12 });
      if (col.tag) c.appendChild(await zi('badge', { Size: 'Small', Theme: col.theme || 'Neutral', Background: 'Subtle' }, { Text: col.tag }));
      c.appendChild(wrapText(await Z(col.head, 24, 'Bold'), w - 40));
      for (const r of col.rows) c.appendChild(wrapText(await Z('·  ' + r, 17, 'Regular', 'base'), w - 40));
      row.appendChild(c);
    }
    return row;
  };
  // nested rings: { rings: [{ label, sub }] } outer first
  ILLO.nested = async function (p) {
    const colors = p.colors || ['canvas', 'white', 'accentSoft', 'yellow', 'pink'];
    let inner = null;
    for (let i = p.rings.length - 1; i >= 0; i--) {
      const r = p.rings[i];
      const f = al('VERTICAL', r.label, 10); f.paddingLeft = f.paddingRight = 22; f.paddingTop = 16; f.paddingBottom = 22;
      f.cornerRadius = 22; f.fills = [await zpaint(colors[i % colors.length])]; f.strokes = [await zpaint('subtle')]; f.strokeWeight = 1;
      f.appendChild(await Z(r.label, 20, 'Bold'));
      if (r.sub) f.appendChild(await Z(r.sub, 15, 'Regular', 'base'));
      if (inner) f.appendChild(inner);
      if (!inner && p.core) { f.minWidth = 180; }
      inner = f;
    }
    return inner;
  };
  // bars: { items: [{ label, value, note }], max, unit, color }
  ILLO.bars = async function (p) {
    const max = p.max || Math.max.apply(null, p.items.map(function (i) { return i.value; }));
    const list = al('VERTICAL', 'Bars', p.gap || 12);
    for (const it of p.items) {
      const r = al('HORIZONTAL', it.label, 14); r.counterAxisAlignItems = 'CENTER';
      const lab = await T(it.label, 'Typed/Label', VAR.ink, 'Label'); lab.resize(p.labelW || 150, lab.height); lab.textAutoResize = 'HEIGHT';
      const bar = figma.createRectangle(); bar.name = 'Bar'; bar.resize(Math.max(4, Math.round((p.barW || 440) * it.value / max)), p.barH || 22); bar.cornerRadius = 4; bar.fills = [await zpaint(it.color || p.color || 'accent')];
      r.appendChild(lab); r.appendChild(bar);
      r.appendChild(await T((it.note || (it.value + (p.unit || ''))), 'Typed/Label', VAR.soft, 'Value'));
      list.appendChild(r);
    }
    return list;
  };
  // swatches: { rows: [[{ name: 'Zen variable name or short key', label, sub }]] }
  ILLO.swatches = async function (p) {
    const grid = al('VERTICAL', 'Swatches', 18);
    for (const row of p.rows) {
      const r = al('HORIZONTAL', 'Row', p.gap || 12);
      for (const s of row) {
        const col = al('VERTICAL', s.label || s.name, 6);
        const chip = figma.createRectangle(); chip.name = 'Swatch'; chip.resize(p.w || 96, p.h || 72); chip.cornerRadius = 10;
        chip.fills = [await zpaint(s.name)]; chip.strokes = [await zpaint('subtle')]; chip.strokeWeight = 1;
        col.appendChild(chip);
        if (s.label) col.appendChild(await Z(s.label, 15, 'Semi Bold'));
        if (s.sub) col.appendChild(await Z(s.sub, 13, 'Regular', 'base'));
        r.appendChild(col);
      }
      grid.appendChild(r);
    }
    return grid;
  };
  // type specimen: { rows: [{ label, size, weight, text, family }] }
  ILLO.type = async function (p) {
    const list = al('VERTICAL', 'Type', p.gap || 14);
    for (const it of p.rows) {
      const r = al('HORIZONTAL', it.label, 20); r.counterAxisAlignItems = 'CENTER';
      const lab = await T(it.label, 'Typed/Label', VAR.soft, 'Label'); lab.resize(p.labelW || 170, lab.height); lab.textAutoResize = 'HEIGHT';
      const t = figma.createText(); const fam = it.family || 'Inter'; const fn = { family: fam, style: it.weight || 'Regular' };
      await figma.loadFontAsync(fn); t.fontName = fn; t.fontSize = it.size; t.characters = it.text; t.fills = [await zpaint('ink')]; t.name = 'Sample';
      if (it.lh) t.lineHeight = { unit: 'PERCENT', value: it.lh };
      r.appendChild(lab); r.appendChild(t);
      if (it.width) wrapText(t, it.width);
      list.appendChild(r);
    }
    return list;
  };
  // components with labels: { items: [{ comp, v: {variant}, text: {prop: value}, bools: {prop: bool}, label }], cols }
  ILLO.strip = async function (p) {
    const cols = p.cols || p.items.length;
    const grid = al('VERTICAL', 'Strip', p.rowGap || 28); grid.counterAxisAlignItems = 'CENTER';
    let row = null;
    for (let i = 0; i < p.items.length; i++) {
      if (i % cols === 0) { row = al('HORIZONTAL', 'Row', p.gap || 32); row.counterAxisAlignItems = 'MAX'; grid.appendChild(row); }
      const it = p.items[i];
      const inst = await zi(it.comp, it.v, it.text);
      if (it.bools) for (const b in it.bools) boolProp(inst, b, it.bools[b]);
      if (it.scale) inst.rescale(it.scale);
      row.appendChild(await labelUnder(inst, it.label));
    }
    return grid;
  };
  // checklist: { title, items: [{ text, checked }] }
  ILLO.checklist = async function (p) {
    const c = await card('Checklist', p.width || 560, { gap: 14, pad: 28 });
    if (p.title) c.appendChild(await Z(p.title, 22, 'Bold'));
    for (const it of p.items) {
      const inst = await zi('checkbox', { State: 'Default', Select: it.checked ? 'Yes' : 'No', 'Check-Side': 'Left' });
      const t = inst.findAll(function (n) { return n.type === 'TEXT'; })[0];
      if (t) { await loadFontsIn(t); t.characters = it.text; }
      c.appendChild(inst); inst.layoutSizingHorizontal = 'FILL';
      const box = inst.children[0]; if (box && 'layoutSizingHorizontal' in box) box.layoutSizingHorizontal = 'FILL';
    }
    return c;
  };
  // form: { title, fields: [{ label, value, state }], button }
  ILLO.form = async function (p) {
    const c = await card('Form', p.width || 460, { gap: 14, pad: 28 });
    if (p.title) c.appendChild(await Z(p.title, 24, 'Bold'));
    for (const f of p.fields) {
      const inst = await zi('textField', { Size: 'Medium (Base)', State: f.state || 'Inputted' });
      const texts = inst.findAll(function (n) { return n.type === 'TEXT'; });
      await loadFontsIn(inst);
      const lab = texts.find(function (n) { return n.name === 'Label'; }), val = texts.find(function (n) { return n.name === 'Text'; });
      if (lab) lab.characters = f.label; if (val) val.characters = f.value || '';
      if (f.help) { boolProp(inst, 'Help-Text', true); const h = inst.findAll(function (n) { return n.type === 'TEXT' && /help|caption/i.test(n.name); })[0]; if (h) { await loadFontsIn(h); h.characters = f.help; } }
      c.appendChild(inst); inst.layoutSizingHorizontal = 'FILL';
    }
    if (p.button) { const b = await zi('button', { Size: 'Medium (Base)', Level: 'Primary', State: 'Default' }, { Text: p.button }); c.appendChild(b); b.layoutSizingHorizontal = 'FILL'; }
    return c;
  };
  // code card: { title, lines: [] }
  ILLO.code = async function (p) {
    const c = await card('Code', p.width || 640, { fill: 'ink', stroke: false, pad: 26, gap: 6, radius: 14 });
    if (p.title) c.appendChild(await Z(p.title, 13, 'Semi Bold', 'white'));
    for (const l of p.lines) {
      const t = figma.createText(); t.fontName = { family: 'JetBrains Mono', style: 'Regular' }; t.fontSize = p.size || 17;
      t.characters = l || ' '; t.fills = [await zpaint('white')]; t.name = 'Line'; c.appendChild(t);
    }
    return c;
  };
  // timeline: { items: [{ label, sub }] }
  ILLO.timeline = async function (p) {
    const n = p.items.length, w = Math.floor((p.width || 760) / n);
    const wrap = figma.createFrame(); wrap.name = 'Timeline'; wrap.fills = []; wrap.resize(w * n, p.height || 220);
    const line = figma.createRectangle(); line.resize(w * n - w, 3); line.x = w / 2; line.y = 60; line.fills = [await zpaint('ink')]; wrap.appendChild(line);
    for (let i = 0; i < n; i++) {
      const dot = figma.createEllipse(); dot.resize(22, 22); dot.x = i * w + w / 2 - 11; dot.y = 50; dot.fills = [await zpaint(p.items[i].color || (i === p.highlight ? 'accent' : 'white'))]; dot.strokes = [await zpaint('ink')]; dot.strokeWeight = 3; wrap.appendChild(dot);
      const lab = wrapText(await Z(p.items[i].label, 18, 'Bold'), w - 12); lab.textAlignHorizontal = 'CENTER'; lab.x = i * w + 6; lab.y = 90; wrap.appendChild(lab);
      if (p.items[i].sub) { const s = wrapText(await Z(p.items[i].sub, 15, 'Regular', 'base'), w - 12); s.textAlignHorizontal = 'CENTER'; s.x = i * w + 6; s.y = 92 + lab.height; wrap.appendChild(s); }
      if (p.items[i].top) { const tp = wrapText(await Z(p.items[i].top, 13, 'Semi Bold', 'accentText'), w - 12); tp.textAlignHorizontal = 'CENTER'; tp.x = i * w + 6; tp.y = 18; wrap.appendChild(tp); }
    }
    return wrap;
  };
  // double diamond: { labels: [4], phases: [2] }
  ILLO.diamond = async function (p) {
    const W = 760, H = 360;
    const f = figma.createFrame(); f.name = 'Double diamond'; f.fills = []; f.resize(W, H);
    const d = svg('<svg width="' + W + '" height="300" viewBox="0 0 ' + W + ' 300" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 150 L195 10 L380 150 L195 290 Z" stroke="#000" stroke-width="3"/><path d="M380 150 L565 10 L750 150 L565 290 Z" stroke="#000" stroke-width="3"/><path d="M195 10 V290 M565 10 V290" stroke="#000" stroke-width="1.5" stroke-dasharray="6 6"/></svg>');
    d.name = 'Shape'; await recolor(d, 'ink'); f.appendChild(d); d.y = 50;
    const fills = svg('<svg width="' + W + '" height="300" viewBox="0 0 ' + W + ' 300" xmlns="http://www.w3.org/2000/svg"><path d="M10 150 L195 10 L380 150 L195 290 Z" fill="#000"/><path d="M380 150 L565 10 L750 150 L565 290 Z" fill="#000"/></svg>');
    fills.name = 'Fill'; f.insertChild(0, fills); fills.y = 50; fills.opacity = 0.18;
    const vs = fills.findAll(function (n) { return n.type === 'VECTOR'; });
    if (vs[0]) vs[0].fills = [await zpaint('accent')]; if (vs[1]) vs[1].fills = [await zpaint('yellow')];
    const xs = [102, 288, 472, 658];
    for (let i = 0; i < 4; i++) { const t = await Z(p.labels[i], 18, 'Bold'); t.textAlignHorizontal = 'CENTER'; f.appendChild(t); t.x = xs[i] - t.width / 2; t.y = 190; }
    if (p.phases) for (let i = 0; i < 2; i++) { const t = await T(p.phases[i], 'Typed/Label', VAR.soft, 'Phase'); f.appendChild(t); t.x = (i === 0 ? 195 : 565) - t.width / 2; t.y = 10; }
    return f;
  };
  // layout grid: { cols, gutter, margin, label, w, h }
  ILLO.grid = async function (p) {
    const W = p.w || 700, H = p.h || 420;
    const f = figma.createFrame(); f.name = 'Grid ' + p.cols; f.resize(W, H); f.cornerRadius = 14; f.fills = [await zpaint('white')]; f.strokes = [await zpaint('subtle')]; f.strokeWeight = 1; f.clipsContent = true;
    const m = p.margin, g = p.gutter, cw = (W - 2 * m - g * (p.cols - 1)) / p.cols;
    for (let i = 0; i < p.cols; i++) { const r = figma.createRectangle(); r.resize(cw, H); r.x = m + i * (cw + g); r.y = 0; r.fills = [await zpaint('pink')]; r.opacity = 0.55; r.name = 'Column'; f.appendChild(r); }
    if (p.label) { const t = await T(p.label, 'Typed/Label', VAR.ink, 'Label'); f.appendChild(t); t.x = m; t.y = H - 40; }
    return f;
  };
  // free diagram: { w, h, nodes: [{ id, label, sub, x, y, w, color, tag }], edges: [[from, to, dashed]] }
  ILLO.boxes = async function (p) {
    const W = p.w || 760, H = p.h || 460;
    const f = figma.createFrame(); f.name = 'Diagram'; f.fills = []; f.resize(W, H); f.clipsContent = false;
    const pos = {};
    for (const nd of p.nodes) {
      const c = await card(nd.label, nd.w || 180, { fill: nd.color || 'white', pad: 14, gap: 6 });
      c.counterAxisAlignItems = 'CENTER';
      if (nd.tag) c.appendChild(await zi('badge', { Size: 'XSmall', Theme: nd.theme || 'Accent', Background: 'Subtle' }, { Text: nd.tag }));
      const t = wrapText(await Z(nd.label, nd.size || 18, 'Bold'), (nd.w || 180) - 28); t.textAlignHorizontal = 'CENTER'; c.appendChild(t);
      if (nd.sub) { const s = wrapText(await Z(nd.sub, 14, 'Regular', 'base'), (nd.w || 180) - 28); s.textAlignHorizontal = 'CENTER'; c.appendChild(s); }
      f.appendChild(c); c.x = nd.x; c.y = nd.y; pos[nd.id] = c;
    }
    const clipTo = function (c, tx, ty) {
      const cx = c.x + c.width / 2, cy = c.y + c.height / 2, dx = tx - cx, dy = ty - cy;
      const s = Math.min(Math.abs((c.width / 2 + 6) / (dx || 1e-6)), Math.abs((c.height / 2 + 6) / (dy || 1e-6)));
      return [cx + dx * s, cy + dy * s];
    };
    for (const e of p.edges || []) {
      const a = pos[e[0]], b = pos[e[1]];
      const ac = [a.x + a.width / 2, a.y + a.height / 2], bc = [b.x + b.width / 2, b.y + b.height / 2];
      const p1 = clipTo(a, bc[0], bc[1]), p2 = clipTo(b, ac[0], ac[1]);
      const ar = await arrowXY(W, H, p1[0], p1[1], p2[0], p2[1], 'ink', e[2]);
      f.insertChild(0, ar); ar.x = 0; ar.y = 0;
      if (e[3]) { const t = await T(e[3], 'Typed/Label', VAR.soft, 'Edge label'); f.appendChild(t); t.x = (p1[0] + p2[0]) / 2 - t.width / 2; t.y = (p1[1] + p2[1]) / 2 - 26; }
    }
    return f;
  };
  // property sheet beside a Zen instance: { comp, v, text, scale, rows: [[k, v]] | 'auto' }
  ILLO.spec = async function (p) {
    const row = al('HORIZONTAL', 'Spec', 48); row.counterAxisAlignItems = 'CENTER';
    const inst = await zi(p.comp, p.v, p.text);
    const rows = [];
    if (p.rows === 'auto' || !p.rows) {
      const lay = [inst].concat(inst.findAll(function (n) { return 'layoutMode' in n; })).filter(function (n) { return n.layoutMode && n.layoutMode !== 'NONE'; }).sort(function (a, b) { return (b.paddingLeft + b.paddingTop + b.itemSpacing) - (a.paddingLeft + a.paddingTop + a.itemSpacing); })[0];
      if (lay) {
        rows.push(['Direction', lay.layoutMode === 'HORIZONTAL' ? 'Horizontal' : 'Vertical']);
        rows.push(['Gap', String(lay.itemSpacing)]);
        rows.push(['Padding', lay.paddingTop + ' / ' + lay.paddingRight + ' / ' + lay.paddingBottom + ' / ' + lay.paddingLeft]);
      }
      rows.push(['Size', Math.round(inst.width) + ' × ' + Math.round(inst.height)]);
      const rad = [inst].concat(inst.findAll(function (n) { return 'cornerRadius' in n; })).map(function (n) { return typeof n.cornerRadius === 'number' ? n.cornerRadius : 0; }).filter(function (r) { return r > 0; })[0];
      rows.push(['Radius', String(rad || 0)]);
    } else for (const r of p.rows) rows.push(r);
    if (p.extra) for (const r of p.extra) rows.push(r);
    const holder = al('VERTICAL', 'Instance', 12); holder.counterAxisAlignItems = 'CENTER';
    holder.appendChild(inst); inst.rescale(p.scale || 2);
    if (p.label) holder.appendChild(await T(p.label, 'Typed/Label', VAR.soft, 'Label'));
    row.appendChild(holder);
    const sheet = al('VERTICAL', 'Sheet', 10);
    for (const r of rows) {
      const line = al('HORIZONTAL', r[0], 12);
      const k = await T(r[0], 'Typed/Label', VAR.soft, 'Key'); k.resize(120, k.height); k.textAutoResize = 'HEIGHT';
      line.appendChild(k); line.appendChild(await Z(r[1], 19, 'Semi Bold'));
      sheet.appendChild(line);
    }
    row.appendChild(sheet);
    return row;
  };
  // a simple table: { head: [], rows: [[]], widths: [] }
  ILLO.table = async function (p) {
    const c = await card('Table', null, { pad: 0, gap: 0, radius: 14 });
    const widths = p.widths || p.head.map(function () { return Math.floor(720 / p.head.length); });
    const mk = async function (cells, head) {
      const r = al('HORIZONTAL', head ? 'Head' : 'Row', 0);
      if (head) r.fills = [await zpaint('canvas')];
      for (let i = 0; i < cells.length; i++) {
        const cell = al('VERTICAL', 'Cell', 0); cell.paddingLeft = cell.paddingRight = 16; cell.paddingTop = cell.paddingBottom = 12; fixW(cell, widths[i]);
        cell.appendChild(wrapText(await Z(String(cells[i]), head ? 15 : 17, head ? 'Semi Bold' : 'Regular', head ? 'base' : 'ink'), widths[i] - 32));
        r.appendChild(cell);
      }
      return r;
    };
    c.appendChild(await mk(p.head, true));
    for (const r of p.rows) { const line = figma.createRectangle(); line.resize(widths.reduce(function (a, b) { return a + b; }, 0), 1); line.fills = [await zpaint('subtle')]; c.appendChild(line); c.appendChild(await mk(r, false)); }
    return c;
  };
  // lesson index card for opening pages: { num, title, terms: [], project }
  ILLO.lessonCard = async function (p) {
    const c = await card('Lesson card', 620, { gap: 14, pad: 34, radius: 6 });
    c.appendChild(await T('LESSON ' + p.num, 'Typed/Label', VAR.soft, 'Kicker'));
    c.appendChild(wrapText(await T(p.title, 'Typed/Title S', VAR.ink, 'Title'), 552));
    if (p.terms) {
      c.appendChild(await T('KEY TERMS', 'Typed/Label', VAR.soft, 'Terms head'));
      const row = al('HORIZONTAL', 'Terms', 8); row.layoutWrap = 'WRAP'; row.counterAxisSpacing = 8; c.appendChild(row); row.layoutSizingHorizontal = 'FILL';
      for (const t of p.terms) row.appendChild(await zi('chip', { Size: 'Small', Level: 'Secondary', Theme: 'Text-Only', State: 'Default', Select: 'No' }, { Text: t }));
    }
    if (p.project) { c.appendChild(await T('YOUR PROJECT', 'Typed/Label', VAR.soft, 'Project head')); c.appendChild(wrapText(await Z(p.project, 17, 'Medium'), 552)); }
    return c;
  };
  // phone with Zen parts: { title, items: [strip items], button }
  ILLO.phone = async function (p) {
    const ph = al('VERTICAL', 'Phone', 0); ph.cornerRadius = 40; ph.clipsContent = true; ph.fills = [await zpaint('white')]; ph.strokes = [await zpaint('ink')]; ph.strokeWeight = 8;
    fixW(ph, 390);
    const nav = await zi('topNav', { Type: p.navType || 'Default', Margin: 'Comfortable' });
    ph.appendChild(nav); nav.layoutSizingHorizontal = 'FILL';
    if (p.title) { const ts = nav.findAll(function (n) { return n.type === 'TEXT'; }); await loadFontsIn(nav); const big = ts.sort(function (a, b) { return (b.fontSize === figma.mixed ? 0 : b.fontSize) - (a.fontSize === figma.mixed ? 0 : a.fontSize); })[0]; if (big) big.characters = p.title; }
    const body = al('VERTICAL', 'Body', 14); body.paddingLeft = body.paddingRight = 20; body.paddingTop = 12; body.paddingBottom = 24;
    ph.appendChild(body); body.layoutSizingHorizontal = 'FILL';
    for (const it of p.items || []) {
      const inst = await zi(it.comp, it.v, it.text);
      if (it.bools) for (const b in it.bools) boolProp(inst, b, it.bools[b]);
      body.appendChild(inst); if (it.fill) inst.layoutSizingHorizontal = 'FILL';
    }
    if (p.button) { const b = await zi('button', { Size: 'Large', Level: 'Primary', State: 'Default' }, { Text: p.button }); body.appendChild(b); b.layoutSizingHorizontal = 'FILL'; }
    return ph;
  };
  // several illustrations side by side: { parts: [{ kind, ... }], gap }
  ILLO.row = async function (p) {
    const r = al('HORIZONTAL', 'Row', p.gap || 32); r.counterAxisAlignItems = 'CENTER';
    for (const part of p.parts) r.appendChild(await build(part));
    return r;
  };
  ILLO.column = async function (p) {
    const r = al('VERTICAL', 'Column', p.gap || 24); r.counterAxisAlignItems = 'CENTER';
    for (const part of p.parts) r.appendChild(await build(part));
    return r;
  };
  ILLO.text = async function (p) {
    return wrapText(await (p.typed ? T(p.text, p.style || 'Typed/Deck', VAR.ink, 'Text') : Z(p.text, p.size || 18, p.weight || 'Regular', p.color)), p.width || 600);
  };
  // real images: { cols, width, boxH, items: [{ src, iw, ih, cover, boxH, mark, tag, theme, title, sub, source }] }
  // Each image is an empty rectangle named 'Image · <src>' with the image's aspect, fitted (or, with cover, cropped)
  // in a box; fill it with upload_assets (nodeIds, scaleMode FILL). mark: 'do' | 'dont' adds a Zen badge.
  ILLO.images = async function (p) {
    const cols = p.cols || 2, gap = p.gap || 16, pad = p.pad == null ? 16 : p.pad;
    const w = Math.floor(((p.width || 780) - gap * (cols - 1)) / cols), bw = w - 2 * pad;
    const grid = al('VERTICAL', 'Images', gap); let row = null;
    for (let k = 0; k < p.items.length; k++) {
      if (k % cols === 0) { row = al('HORIZONTAL', 'Row', gap); grid.appendChild(row); }
      const it = p.items[k];
      const c = await card(it.title || it.src, w, { gap: 10, pad: pad });
      const head = al('HORIZONTAL', 'Head', 8); head.counterAxisAlignItems = 'CENTER';
      if (it.mark) head.appendChild(await zi('badge', { Size: 'Small', Theme: it.mark === 'do' ? 'Green' : 'Red', Background: 'Solid' }, { Text: it.mark === 'do' ? 'Do' : 'Don’t' }));
      if (it.tag) head.appendChild(await zi('badge', { Size: 'Small', Theme: it.theme || 'Neutral', Background: 'Subtle' }, { Text: it.tag }));
      if (it.title) head.appendChild(await Z(it.title, p.titleSize || 20, 'Bold'));
      if (head.children.length) c.appendChild(head); else head.remove();
      const bh = it.boxH || p.boxH || 220;
      const box = figma.createFrame(); box.name = 'Box'; box.resize(bw, bh); box.fills = [await zpaint(it.boxFill || 'canvas')];
      box.cornerRadius = 8; box.clipsContent = true;
      const im = figma.createRectangle(); im.name = 'Image · ' + it.src;
      const s = it.cover ? Math.max(bw / it.iw, bh / it.ih) : Math.min(bw / it.iw, bh / it.ih, it.maxScale || 99);
      im.resize(Math.round(it.iw * s), Math.round(it.ih * s));
      im.x = Math.round((bw - im.width) / 2); im.y = it.cover && it.top ? 0 : Math.round((bh - im.height) / 2);
      im.fills = [await zpaint('subtle')]; box.appendChild(im); c.appendChild(box);
      for (const t of [].concat(it.sub || [])) c.appendChild(wrapText(await Z(t, p.subSize || 17, 'Regular', 'base'), bw));
      if (it.source) c.appendChild(wrapText(await Z(it.source, 15, 'Regular', 'base', 'Source'), bw));
      row.appendChild(c); c.layoutAlign = 'STRETCH';
    }
    return grid;
  };
  // custom: { draw: 'js function body string', receives (api) and returns a node }
  ILLO.custom = async function (p) {
    const fn = new Function('api', 'return (async () => {' + p.draw + '})()');
    return await fn(API);
  };
  async function build(spec) {
    if (!spec) return null;
    const fn = ILLO[spec.kind];
    if (!fn) throw new Error('unknown illustration kind: ' + spec.kind);
    const n = await fn(spec);
    if (spec.name) n.name = spec.name;
    return n;
  }

  // ---------- slide structure ----------
  function section(name, row) {
    let s = page.children.find(function (c) { return c.type === 'SECTION' && c.name === name; });
    if (!s) { s = figma.createSection(); s.name = name; s.resizeWithoutConstraints(4000, 1300); }
    s.x = 0; s.y = row * 2600; return s;
  }
  function fit(s) {
    let maxX = 0, maxY = 0;
    for (const c of s.children) { maxX = Math.max(maxX, c.x + c.width); maxY = Math.max(maxY, c.y + c.height); }
    s.resizeWithoutConstraints(Math.ceil(maxX + 80), Math.ceil(Math.max(maxY + 140, 1300)));
    return s;
  }
  function clearSlide(s, name) {
    for (const c of s.children.filter(function (n) { return n.name === name || n.name === 'Keynote · ' + name; })) c.remove();
  }
  async function fitTitle(t, maxW) {
    if (t.width <= maxW) return;
    const words = t.characters.replace(/\n/g, ' ').split(/\s+/).filter(Boolean);
    const probe = t.clone(); probe.textAutoResize = 'WIDTH_AND_HEIGHT';
    const lines = []; let cur = '';
    for (const wd of words) { const next = cur ? cur + ' ' + wd : wd; probe.characters = next; if (probe.width > maxW && cur) { lines.push(cur); cur = wd; } else cur = next; }
    if (cur) lines.push(cur);
    probe.remove(); t.characters = lines.join('\n');
  }
  async function reillo(slideId, spec) {
    const f = await figma.getNodeByIdAsync(slideId);
    const ph = f.findOne(function (n) { return n.name === 'Photo'; });
    const old = ph.findOne(function (n) { return n.name === 'Illustration'; }); if (old) old.remove();
    const rot = ph.rotation; ph.rotation = 0;
    const n = await build(spec); n.name = 'Illustration'; ph.appendChild(n);
    const s = Math.min((ph.width - 60) / n.width, (ph.height - 60) / n.height, spec.maxScale || 1.25);
    if (Math.abs(s - 1) > 0.01) n.rescale(s);
    ph.rotation = rot;
    return audit(f);
  }
  // edit a keynote in place: edits = [[heading, text]]; a heading the keynote lacks is added before 'Chuyển ý'
  async function knSet(slideId, edits) {
    const f = await figma.getNodeByIdAsync(slideId), sec = f.parent;
    const g = sec.children.find(function (n) { return n.name === 'Keynote · ' + f.name; });
    const card2 = g.children.find(function (n) { return n.name === 'Card'; });
    const texts = g.children.filter(function (n) { return n.type === 'TEXT'; }).sort(function (a, b) { return a.y - b.y; });
    const list = texts.map(function (t, i) { return { n: t, gap: i < texts.length - 1 ? Math.round(texts[i + 1].y - t.y - t.height) : 26 }; });
    for (const e of edits) {
      const body = g.children.find(function (n) { return n.type === 'TEXT' && n.name === e[0] + ' · text'; });
      if (body) { await loadFontsIn(body); body.characters = e[1]; continue; }
      const h = await T(e[0], 'Typed/Keynote Head', VAR.ink, e[0]), b = await T(e[1], 'Typed/Keynote', VAR.ink, e[0] + ' · text');
      for (const t of [h, b]) { g.appendChild(t); t.resize(card2.width - 80, t.height); t.textAutoResize = 'HEIGHT'; t.x = card2.x + 40; }
      let at = list.findIndex(function (it) { return it.n.name === 'Chuyển ý'; }); if (at < 0) at = list.length;
      list.splice(at, 0, { n: h, gap: 8 }, { n: b, gap: 26 });
    }
    let cy = list[0].n.y;
    for (const it of list) { it.n.y = cy; cy += it.n.height + it.gap; }
    card2.resize(card2.width, Math.max(cy - 26 + 40 - card2.y, 1080));
    return { keynote: g.id, height: Math.round(card2.height) };
  }
  async function textCol(parent, d, w) {
    const col = al('VERTICAL', 'Text', 28); parent.appendChild(col); fixW(col, w || 820);
    if (d.note) { const n = COMP.note.createInstance(); col.appendChild(n); const o = {}; o[P.note] = d.note; n.setProperties(o); n.name = 'Margin note'; }
    if (d.title) { const t = await T(d.title, d.titleStyle || 'Typed/Title', VAR.ink, 'Title'); col.appendChild(t); await fitTitle(t, w || 820); }
    if (d.deck) { const t = await T(d.deck, 'Typed/Deck', VAR.ink, 'Deck'); col.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT'; }
    if (d.points) {
      const r = COMP.ruleS.createInstance(); col.appendChild(r); r.layoutSizingHorizontal = 'FILL'; r.name = 'Rule';
      const list = al('VERTICAL', 'Points', 14); col.appendChild(list); list.layoutSizingHorizontal = 'FILL';
      for (let k = 0; k < d.points.length; k++) {
        const i = COMP.point.createInstance(); list.appendChild(i); i.layoutSizingHorizontal = 'FILL';
        const o = {}; o[P.pN] = '(' + (k + 1) + ')'; o[P.pT] = d.points[k]; i.setProperties(o); i.name = 'Point ' + (k + 1);
      }
    }
    return col;
  }
  async function figure(parent, d) {
    const fig = al('VERTICAL', 'Figure', 26); parent.appendChild(fig); fig.layoutSizingHorizontal = 'FILL'; fig.paddingTop = 10; fig.clipsContent = false;
    const ph = al('VERTICAL', 'Photo'); ph.primaryAxisAlignItems = 'CENTER'; ph.counterAxisAlignItems = 'CENTER';
    ph.resize(d.photoW || 846, d.photoH || 640); ph.primaryAxisSizingMode = 'FIXED'; ph.counterAxisSizingMode = 'FIXED';
    ph.fills = [bind(VAR.photo)]; ph.strokes = [bind(VAR.edge)]; ph.strokeWeight = 1; ph.clipsContent = true;
    await ph.setEffectStyleIdAsync(FX.id);
    fig.appendChild(ph);
    if (d.illo) {
      const n = await build(d.illo); n.name = 'Illustration';
      ph.appendChild(n);
      const s = Math.min((ph.width - 60) / n.width, (ph.height - 60) / n.height, d.illo.maxScale || 1.25);
      if (Math.abs(s - 1) > 0.01) n.rescale(s);
    }
    ph.rotation = -1.2;
    const cl = COMP.clip.createInstance(); fig.appendChild(cl); cl.layoutPositioning = 'ABSOLUTE'; cl.x = 64; cl.y = -24; cl.rotation = -1.2; cl.name = 'Clip';
    const cap = await T(d.caption, 'Typed/Caption', VAR.ink, 'Caption'); fig.appendChild(cap); cap.layoutSizingHorizontal = 'FILL'; cap.textAutoResize = 'HEIGHT';
    return fig;
  }
  // ---------- example pages: text column + pinned photos ('not this' / 'do this') ----------
  // d.photos: [{ illo, label, caption, rot, h }]; one photo takes the whole width
  async function photoCard(w, h, illo, rot) {
    const ph = al('VERTICAL', 'Photo'); ph.primaryAxisAlignItems = 'CENTER'; ph.counterAxisAlignItems = 'CENTER';
    ph.resize(w, h); ph.primaryAxisSizingMode = 'FIXED'; ph.counterAxisSizingMode = 'FIXED';
    ph.fills = [bind(VAR.photo)]; ph.strokes = [bind(VAR.edge)]; ph.strokeWeight = 1; ph.clipsContent = true;
    await ph.setEffectStyleIdAsync(FX.id);
    if (illo) {
      const n = await build(illo); n.name = 'Illustration'; ph.appendChild(n);
      const s = Math.min((w - 48) / n.width, (h - 48) / n.height, illo.maxScale || 1.25);
      if (Math.abs(s - 1) > 0.01) n.rescale(s);
    }
    ph.rotation = rot || 0;
    return ph;
  }
  async function figure2(parent, d) {
    const n = d.photos.length, gap = 48, W = Math.floor((1752 - (d.textW || 600) - 72 - gap * (n - 1)) / n);
    const row = al('HORIZONTAL', 'Figures', gap); parent.appendChild(row); row.layoutSizingHorizontal = 'FILL'; row.clipsContent = false;
    for (let k = 0; k < n; k++) {
      const p = d.photos[k];
      const fig = al('VERTICAL', 'Figure ' + (k + 1), 16); row.appendChild(fig); fixW(fig, W); fig.clipsContent = false;
      if (p.label) fig.appendChild(await T(p.label, 'Typed/Script S', VAR.ink, 'Label'));
      const ph = await photoCard(W, p.h || d.photoH || 560, p.illo, p.rot == null ? (k % 2 ? 1.2 : -1.4) : p.rot); fig.appendChild(ph);
      if (p.caption) { const cap = await T(p.caption, 'Typed/Caption', VAR.ink, 'Caption'); fig.appendChild(cap); cap.layoutSizingHorizontal = 'FILL'; cap.textAutoResize = 'HEIGHT'; }
      const cl = COMP.clip.createInstance(); fig.appendChild(cl); cl.layoutPositioning = 'ABSOLUTE'; cl.rotation = ph.rotation; cl.name = 'Clip';
      cl.x = W - 110; cl.y = ph.y - 30;
    }
    return row;
  }
  // order the pages of a section by name ('026' < '026a' < '027') and re-space them with their keynotes
  function reflow(sec) {
    const frames = sec.children.filter(function (n) { return n.type === 'FRAME' && /^\d{3}[a-z]? · /.test(n.name); });
    frames.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
    frames.forEach(function (f, i) {
      f.x = 80 + i * 3200; f.y = 140;
      const g = sec.children.find(function (n) { return n.name === 'Keynote · ' + f.name; });
      if (g) { g.x = f.x + 1980; g.y = f.y; }
    });
    return fit(sec);
  }
  // ---------- UI mock helpers (Zen variables, Inter) ----------
  async function screen(name, w, opts) {
    opts = opts || {};
    const s = al('VERTICAL', name, opts.gap || 0);
    s.paddingLeft = s.paddingRight = opts.pad == null ? 20 : opts.pad; s.paddingTop = opts.padTop == null ? 20 : opts.padTop; s.paddingBottom = opts.padBottom == null ? 24 : opts.padBottom;
    s.fills = [await zpaint(opts.fill || 'white')]; s.cornerRadius = opts.radius == null ? 28 : opts.radius;
    s.strokes = [await zpaint('subtle')]; s.strokeWeight = 1; s.clipsContent = true; fixW(s, w);
    return s;
  }
  // spec marker (Zen accent text colour) for the vertical gap between the bottom of a and the top of b, inside scr at x
  async function redline(scr, a, b, x, label) {
    const sb = scr.absoluteBoundingBox, ab = a.absoluteBoundingBox, bb = b.absoluteBoundingBox;
    const y1 = Math.round(ab.y + ab.height - sb.y), h = Math.max(Math.round(bb.y - sb.y) - y1, 2);
    const red = await zpaint('accentText');
    const g = figma.createFrame(); g.name = 'Redline ' + (label || h); g.fills = []; g.clipsContent = false;
    scr.appendChild(g); g.layoutPositioning = 'ABSOLUTE'; g.resize(12, h); g.x = x; g.y = y1;
    const ln = figma.createRectangle(); g.appendChild(ln); ln.resize(2, h); ln.x = 5; ln.y = 0; ln.fills = [red];
    for (const yy of [0, h - 2]) { const t = figma.createRectangle(); g.appendChild(t); t.resize(12, 2); t.x = 0; t.y = yy; t.fills = [red]; }
    const tag = al('HORIZONTAL', 'Tag'); tag.paddingLeft = tag.paddingRight = 6; tag.paddingTop = tag.paddingBottom = 1; tag.cornerRadius = 6; tag.fills = [red];
    tag.appendChild(await Z(String(label || h), 14, 'Bold', 'white')); g.appendChild(tag); tag.x = 16; tag.y = Math.round(h / 2 - 11);
    return g;
  }
  // numbered marker at the top-right corner of node, inside scr
  async function pin(scr, node, num, color) {
    const sb = scr.absoluteBoundingBox, nb = node.absoluteBoundingBox;
    const p = al('HORIZONTAL', 'Pin ' + num); p.primaryAxisAlignItems = 'CENTER'; p.counterAxisAlignItems = 'CENTER';
    p.resize(26, 26); p.primaryAxisSizingMode = 'FIXED'; p.counterAxisSizingMode = 'FIXED'; p.cornerRadius = 13; p.fills = [await zpaint(color || 'accentText')];
    p.appendChild(await Z(String(num), 14, 'Bold', 'white'));
    scr.appendChild(p); p.layoutPositioning = 'ABSOLUTE'; p.x = Math.round(nb.x - sb.x + nb.width - 14); p.y = Math.round(nb.y - sb.y - 12);
    return p;
  }
  async function keynote(sec, f, d) {
    const W = 1040, PAD = 40, TW = W - PAD * 2, x = f.x + 1920 + 60, y = f.y;
    const nodes = []; let cy = y + PAD;
    const put = async function (str, style, color, name, gapAfter) {
      const t = await T(str, style, color, name); sec.appendChild(t);
      t.resize(TW, t.height); t.textAutoResize = 'HEIGHT'; t.x = x + PAD; t.y = cy;
      cy += t.height + gapAfter; nodes.push(t); return t;
    };
    await put('Keynote · ' + d.name, 'Typed/Keynote Head', VAR.ink, 'Head', 8);
    await put('Thời lượng: ' + d.time, 'Typed/Keynote', VAR.soft, 'Time', 10);
    await put(Array(33).fill('-').join(' '), 'Typed/Rule', VAR.soft, 'Rule', 22);
    for (const sct of d.kn) { await put(sct[0], 'Typed/Keynote Head', VAR.ink, sct[0], 8); await put(sct[1], 'Typed/Keynote', VAR.ink, sct[0] + ' · text', 26); }
    const card2 = figma.createRectangle(); sec.appendChild(card2); card2.name = 'Card';
    card2.resize(W, Math.max(cy - 26 + PAD - y, 1080)); card2.x = x; card2.y = y;
    card2.fills = [bind(VAR.note)]; card2.strokes = [bind(VAR.noteEdge)]; card2.strokeWeight = 1;
    const g = figma.group([card2].concat(nodes), sec); g.name = 'Keynote · ' + d.name; g.insertChild(0, card2);
    return g;
  }
  async function frameFor(sec, i, d) {
    clearSlide(sec, d.name);
    const f = figma.createFrame(); sec.appendChild(f); f.name = d.name; f.x = 80 + i * 3200; f.y = 140; f.resize(1920, 1080);
    f.layoutMode = 'VERTICAL'; f.primaryAxisSizingMode = 'FIXED'; f.counterAxisSizingMode = 'FIXED';
    f.paddingTop = 44; f.paddingBottom = 40; f.paddingLeft = 84; f.paddingRight = 84; f.itemSpacing = 0;
    f.fills = [bind(VAR.paper)]; f.clipsContent = true;
    const bg = COMP.paper.createInstance(); f.appendChild(bg); bg.layoutPositioning = 'ABSOLUTE'; bg.x = 0; bg.y = 0; bg.name = 'Paper'; bg.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
    const h = COMP.header.createInstance(); f.appendChild(h); h.layoutSizingHorizontal = 'FILL'; h.name = 'Header';
    const ho = {}; ho[P.hL] = 'UI FOUNDATIONS — COURSE FILE\nRef. No.: ' + d.ref; ho[P.hR] = 'Hanoi, 12 October 2026\n' + d.where; h.setProperties(ho);
    return f;
  }
  async function finish(sec, f, d) {
    const ft = COMP.footer.createInstance(); f.appendChild(ft); ft.layoutSizingHorizontal = 'FILL'; ft.name = 'Footer';
    const fo = {}; fo[P.fL] = 'Đìzai® Studio · Zen DS'; fo[P.fP] = '— ' + d.page + ' —'; ft.setProperties(fo);
    if (d.stamp) {
      const s = COMP.stamp.createInstance(); f.appendChild(s); s.layoutPositioning = 'ABSOLUTE'; s.name = 'Stamp';
      const so = {}; so[P.sT] = d.stamp[0]; so[P.sS] = d.stamp[1]; s.setProperties(so); s.rotation = 9; s.x = 1920 - 50 - s.width; s.y = 1080 - 110 - s.height;
    }
    const k = await keynote(sec, f, d);
    return { slide: f.id, keynote: k.id, issues: audit(f) };
  }
  // standard page: text column + pinned photo
  async function slide(sec, i, d) {
    if (d.layout === 'part') return part(sec, i, d);
    const f = await frameFor(sec, i, d);
    const main = al('HORIZONTAL', 'Main', 72); f.appendChild(main); main.layoutSizingHorizontal = 'FILL'; main.layoutSizingVertical = 'FILL'; main.paddingTop = 40; main.paddingBottom = 24;
    if (d.layout === 'example') { await textCol(main, d, d.textW || 600); await figure2(main, d); }
    else { await textCol(main, d); await figure(main, d); }
    return finish(sec, f, d);
  }
  // part divider: { title: 'Part 2:\nFoundations', deck, lessons: [[num, title, page]], quote: [text, by], note }
  async function part(sec, i, d) {
    const f = await frameFor(sec, i, d);
    const main = al('VERTICAL', 'Main', 12); f.appendChild(main); main.layoutSizingHorizontal = 'FILL'; main.layoutSizingVertical = 'FILL'; main.paddingTop = 32; main.paddingBottom = 24;
    const n = COMP.note.createInstance(); main.appendChild(n); const no = {}; no[P.note] = d.note || 'next part'; n.setProperties(no); n.name = 'Margin note';
    const pt = await T(d.title, 'Typed/Title Display', VAR.ink, 'Title'); main.appendChild(pt); await fitTitle(pt, 1752);
    const row = al('HORIZONTAL', 'Row', 72); main.appendChild(row); row.layoutSizingHorizontal = 'FILL'; row.paddingTop = 4;
    const col = await textCol(row, { deck: d.deck });
    const r = COMP.ruleS.createInstance(); col.appendChild(r); r.layoutSizingHorizontal = 'FILL'; r.name = 'Rule';
    const list = al('VERTICAL', 'Lessons', 2); col.appendChild(list); list.layoutSizingHorizontal = 'FILL';
    for (const ls of d.lessons) { const t = COMP.toc.createInstance(); list.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.name = 'Lesson ' + ls[0]; const to = {}; to[P.tN] = ls[0]; to[P.tT] = ls[1]; to[P.tP] = ls[2]; t.setProperties(to); }
    if (d.quote) {
      const q = al('VERTICAL', 'Quote', 14); row.appendChild(q); q.layoutSizingHorizontal = 'FILL'; q.paddingTop = 4;
      const qt = await T('“' + d.quote[0] + '”', 'Typed/Deck', VAR.ink, 'Quote text'); q.appendChild(qt); qt.layoutSizingHorizontal = 'FILL'; qt.textAutoResize = 'HEIGHT';
      q.appendChild(await T('— ' + d.quote[1], 'Typed/Caption', VAR.soft, 'Attribution'));
    }
    return finish(sec, f, d);
  }
  function audit(f) {
    const issues = [];
    const box = function (n) { return n.absoluteBoundingBox; };
    const main = f.findOne(function (n) { return n.name === 'Main'; });
    if (!main) return issues;
    const mb = box(main);
    for (const t of main.findAll(function (n) { return n.type === 'TEXT' && (n.name === 'Title' || n.name === 'Deck' || n.name === 'Caption'); })) {
      const tb = box(t), pb = box(t.parent);
      if (tb.x + tb.width > pb.x + pb.width + 1) issues.push('text wider than its column: ' + t.characters.slice(0, 30).replace(/\n/g, ' / '));
    }
    const lim = mb.y + mb.height - main.paddingBottom + 1;
    for (const c of main.children) { const cb = box(c); if (cb.y + cb.height > lim) issues.push(c.name + ' overflows by ' + Math.round(cb.y + cb.height - lim)); }
    for (const pnt of main.findAll(function (n) { return n.type === 'INSTANCE' && /^Point /.test(n.name); })) {
      const txt = pnt.componentProperties[P.pT].value; if (txt.length > 46) issues.push('long point (' + txt.length + '): ' + txt.slice(0, 30));
    }
    for (const ill of f.findAll(function (n) { return n.name === 'Illustration'; })) {
      const ph = ill.parent; if (ill.width > ph.width - 40 || ill.height > ph.height - 40) issues.push('illustration tight in photo');
    }
    const stamp = f.findOne(function (n) { return n.name === 'Stamp'; }), cap = f.findOne(function (n) { return n.type === 'TEXT' && n.name === 'Caption'; });
    if (stamp && cap) { const sb = box(stamp), cb = box(cap); const ink = Math.min(cap.characters.length * 12, cb.width); if (sb.x < cb.x + ink && sb.y < cb.y + cb.height && sb.y + sb.height > cb.y) issues.push('stamp overlaps caption'); }
    return issues;
  }
  const API = { page: page, VAR: VAR, bind: bind, T: T, Z: Z, zi: zi, zvar: zvar, zpaint: zpaint, setText: setText, boolProp: boolProp, al: al, fixW: fixW, wrapText: wrapText, card: card, svg: svg, recolor: recolor, arrowH: arrowH, arrowV: arrowV, arrowXY: arrowXY, labelUnder: labelUnder, build: build, ILLO: ILLO, ZEFFECT: ZEFFECT, section: section, fit: fit, slide: slide, part: part, audit: audit, loadFontsIn: loadFontsIn, reillo: reillo, fitTitle: fitTitle, knSet: knSet, reflow: reflow, screen: screen, redline: redline, pin: pin };
  return API;
})();
