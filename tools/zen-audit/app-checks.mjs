/**
 * In-page checks for `zen-ds audit` (tools/zen-audit/audit.mjs): the rendered-page checks of the docs audit
 * (tools/platform-audit/audit.mjs pageChecks), for a whole app page instead of the docs' example stages. Runs in the
 * browser through page.evaluate, so it stays self-contained (no imports, no outer variables).
 *
 *   overflow   (error) the page scrolls sideways, or an element (not in a scroll box or a fixed layer) runs past the window
 *   images     (error) an image that failed to load
 *   names      (error) a button, link, field or ARIA control with no accessible name
 *   nesting    (error) an interactive element inside another (a button in a link, a link in a button…)
 *   surfaces   (error) a Surface/Default box on a Canvas/Alt page with no closed border (same colour: it disappears)
 *   ids        (warn)  duplicate ids
 *   targets    (warn, phones) pointer targets smaller than 24×24 whose 24px circle meets another target (WCAG 2.5.8)
 *   contrast   (warn)  visible text below 3:1 on its composited background (disabled controls, inputs and code skipped)
 *   outline    (warn)  not exactly one h1, the outline not starting at the h1, a skipped heading level
 *
 * Opt one element out with `data-audit-skip` (with a reason in your code).
 */
export function appChecks({ mobile }) {
  const out = { overflow: [], images: [], names: [], nesting: [], surfaces: [], ids: [], targets: [], contrast: [], outline: [] };
  const skip = "[data-audit-skip], [aria-hidden='true'], [inert], .zen-visually-hidden:not(:focus-within)";
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && !el.closest(skip); };
  const where = (el) => {
    const region = el.closest("[data-audit-label], main, header, nav, aside, footer, [role='dialog'], section");
    const name = region?.getAttribute("data-audit-label") ?? region?.getAttribute("aria-label") ?? region?.querySelector("h1, h2, h3")?.textContent ?? region?.tagName.toLowerCase() ?? "page";
    return name.trim().slice(0, 32);
  };
  const describe = (el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
  const text = (el) => (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 28);

  // Overflow: the page itself, then elements past the window edge that no scroll box or fixed layer contains.
  const root = document.scrollingElement ?? document.documentElement;
  if (root.scrollWidth > root.clientWidth + 1) out.overflow.push(`the page scrolls sideways (${root.scrollWidth} > ${root.clientWidth}px)`);
  const vw = document.documentElement.clientWidth;
  let escaped = 0;
  for (const el of document.body.querySelectorAll("*")) {
    if (escaped >= 8 || !visible(el)) continue;
    const s = getComputedStyle(el);
    if (s.position === "fixed" || s.position === "sticky") continue;
    let contained = false;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ps = getComputedStyle(p);
      if (["auto", "scroll", "hidden", "clip"].includes(ps.overflowX) || ps.position === "fixed") { contained = true; break; }
    }
    if (contained) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 2 || r.left < -2) { out.overflow.push(`${where(el)}: ${describe(el)} runs ${Math.round(Math.max(r.right - vw, -r.left))}px past the window`); escaped += 1; }
  }

  for (const img of document.querySelectorAll("img")) if (img.complete && img.naturalWidth === 0 && visible(img)) out.images.push(`${where(img)}: ${img.getAttribute("src")?.slice(0, 60)}`);

  const nameOf = (el) => {
    if (el.getAttribute("aria-label")?.trim()) return el.getAttribute("aria-label");
    const lb = el.getAttribute("aria-labelledby"); if (lb) return lb.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim();
    if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l?.textContent.trim()) return l.textContent; }
    const wrap = el.closest("label"); if (wrap?.textContent.trim()) return wrap.textContent;
    if (el.getAttribute("title")) return el.getAttribute("title");
    if (el.matches("input[type='submit'], input[type='button']") && el.value) return el.value;
    return [...el.childNodes].map((n) => (n.nodeType === 3 ? n.textContent : n.nodeType === 1 && !n.closest("[aria-hidden='true']") ? (n.getAttribute?.("alt") ?? n.textContent) : "")).join("").trim();
  };
  for (const el of document.querySelectorAll("button, a[href], [role='button'], [role='tab'], [role='option'], [role='switch'], [role='checkbox'], [role='radio'], input:not([type='hidden']), select, textarea")) {
    if (!visible(el)) continue;
    if (!nameOf(el)?.trim()) out.names.push(`${where(el)}: ${describe(el)}`);
  }
  for (const el of document.querySelectorAll("button button, button a[href], a[href] button, a[href] a[href], button input, button select")) out.nesting.push(`${where(el)}: ${describe(el)} inside ${describe(el.parentElement.closest("button, a"))}`);
  const seen = new Map();
  for (const el of document.querySelectorAll("[id]")) seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
  for (const [id, n] of seen) if (n > 1) out.ids.push(`#${id} ×${n}`);

  if (mobile) {
    const targets = [];
    for (const el of document.querySelectorAll("button, a[href], [role='button'], input[type='checkbox'], input[type='radio']")) {
      if (!visible(el) || el.matches(":disabled, .zen-select__trigger, .zen-input__native") || parseFloat(getComputedStyle(el).opacity) === 0 || getComputedStyle(el).pointerEvents === "none") continue;
      if (el.closest("p") || getComputedStyle(el).display === "inline") continue;
      let w = el.offsetWidth, h = el.offsetHeight;
      for (const pseudo of ["::before", "::after"]) { const ps = getComputedStyle(el, pseudo); if (ps.content !== "none" && ps.position === "absolute" && ps.pointerEvents !== "none") { w = Math.max(w, parseFloat(ps.width) || 0); h = Math.max(h, parseFloat(ps.height) || 0); } }
      if (w <= 2 || h <= 2) continue;
      const r = el.getBoundingClientRect(), scale = el.offsetWidth ? r.width / el.offsetWidth : 1;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, hw = Math.max(r.width, w * scale) / 2, hh = Math.max(r.height, h * scale) / 2;
      targets.push({ el, w, h, scale, small: w < 24 || h < 24, cx, cy, box: { left: cx - hw, right: cx + hw, top: cy - hh, bottom: cy + hh } });
    }
    // WCAG 2.5.8 spacing exception: an undersized target passes when a 24px circle centred on it meets no other target
    // and no other undersized target's circle.
    const meets = (cx, cy, radius, box) => Math.hypot(Math.max(box.left - cx, 0, cx - box.right), Math.max(box.top - cy, 0, cy - box.bottom)) < radius;
    for (const t of targets) {
      if (!t.small) continue;
      const radius = 12 * t.scale;
      const crowded = targets.some((o) => o !== t && !o.el.contains(t.el) && !t.el.contains(o.el) && (o.small ? Math.hypot(o.cx - t.cx, o.cy - t.cy) < radius + 12 * o.scale : meets(t.cx, t.cy, radius, o.box)));
      if (crowded) out.targets.push(`${where(t.el)}: ${describe(t.el)} "${text(t.el)}" ${Math.round(t.w)}×${Math.round(t.h)}`);
    }
  }

  const parse = (c) => { const m = c?.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r, g, b, a }; };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { const layers = []; for (let p = el; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.backgroundImage !== "none") return null; const c = parse(s.backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let acc = { r: 255, g: 255, b: 255, a: 1 }; for (const l of layers.reverse()) acc = over(l, acc); return acc; };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const checked = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement; if (!el || checked.has(el) || !n.textContent.trim() || !visible(el)) continue; checked.add(el);
    if (/^[\p{Extended_Pictographic}\p{Emoji_Component}️‍\s]+$/u.test(n.textContent.trim()) && !/^[\d#*\s]+$/.test(n.textContent.trim())) continue;
    if (el.closest("[disabled], [aria-disabled='true'], [data-disabled='true'], input, textarea, pre, code, svg, .zen-skeleton, [data-audit-skip-contrast]")) continue;
    if (el.closest("label, [class*='-field'], .zen-checkbox, .zen-radio, .zen-toggle")?.querySelector(":disabled, [aria-disabled='true']")) continue;
    const s = getComputedStyle(el); const fg = parse(s.color); const bg = bgOf(el); if (!fg || !bg) continue;
    const c = over(fg, bg); const L1 = lum(c), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    if (ratio < 3 && parseFloat(s.opacity) > 0.5) out.contrast.push(`${where(el)}: "${n.textContent.trim().slice(0, 24)}" ${ratio.toFixed(2)}:1`);
  }

  // Surfaces (house rule §11): Surface/Default and Canvas/Alt are one colour, so a Surface box on a Canvas/Alt page needs a
  // closed border, outline or 0 0 0 ring; a shadow alone does not count. Painters are read from the loaded stylesheets.
  const painters = { canvas: [], surface: [] };
  const collect = (rules) => { for (const rule of rules) { if (rule.selectorText) { const t = rule.style?.cssText ?? ""; if (/background(-color)?\s*:[^;]*--zen-color-background-canvas-alt\b/.test(t)) painters.canvas.push(rule.selectorText); if (/background(-color)?\s*:[^;]*--zen-color-background-surface-default\b/.test(t)) painters.surface.push(rule.selectorText); } if (rule.cssRules?.length) collect(rule.cssRules); } };
  for (const sheet of document.styleSheets) { try { collect(sheet.cssRules); } catch { /* cross-origin sheet */ } }
  const matchesAny = (el, sels) => sels.some((sel) => { try { return el.matches(sel); } catch { return false; } });
  const ring = (shadow) => shadow !== "none" && shadow.split(/,(?![^()]*\))/).some((layer) => { const colour = parse(layer); const lengths = layer.replace(/rgba?\([^)]*\)/g, "").match(/-?[\d.]+px/g)?.map(parseFloat) ?? []; return (colour?.a ?? 1) > 0 && lengths.length >= 4 && lengths[0] === 0 && lengths[1] === 0 && lengths[2] === 0 && lengths[3] >= 0.5; });
  const framedBy = (s) => ["Top", "Right", "Bottom", "Left"].every((k) => parseFloat(s[`border${k}Width`]) >= 0.5 && s[`border${k}Style`] !== "none" && (parse(s[`border${k}Color`])?.a ?? 0) > 0) || (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0 && (parse(s.outlineColor)?.a ?? 0) > 0) || ring(s.boxShadow);
  const framed = (el) => framedBy(getComputedStyle(el)) || ["::before", "::after"].some((p) => { const ps = getComputedStyle(el, p); return ps.content !== "none" && framedBy(ps); });
  if (painters.canvas.length && painters.surface.length) {
    for (const el of document.body.querySelectorAll("*")) {
      if (!matchesAny(el, painters.surface) || !visible(el) || el.closest(".zen-top-nav, .zen-bottom-nav, .zen-sidebar")) continue;
      const own = parse(getComputedStyle(el).backgroundColor); if (!own || own.a < 1) continue;
      const box = el.getBoundingClientRect(); if (box.width < 40 || box.height < 24) continue;
      let host = el.parentElement;
      for (; host; host = host.parentElement) { const c = parse(getComputedStyle(host).backgroundColor); if (c && c.a > 0) break; }
      if (!host || !matchesAny(host, painters.canvas)) continue;
      const hc = parse(getComputedStyle(host).backgroundColor);
      if (Math.abs(hc.r - own.r) + Math.abs(hc.g - own.g) + Math.abs(hc.b - own.b) > 3) continue;
      if (!framed(el)) out.surfaces.push(`${where(el)}: ${describe(el)} on ${describe(host)} has no border`);
    }
  }

  // Outline: one h1 that names the page, the outline starts at it, no level skipped.
  const headings = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].filter((h) => visible(h) || h.closest(".zen-visually-hidden"));
  const h1s = headings.filter((h) => h.tagName === "H1");
  if (h1s.length !== 1) out.outline.push(h1s.length ? `${h1s.length} h1 (${h1s.map(text).join(", ")}) — a page has exactly one` : "no h1 — a page exposes exactly one h1 that names it (PageHeader, or the TopNavigation title)");
  if (headings.length && headings[0].tagName !== "H1") out.outline.push(`the outline starts at ${headings[0].tagName.toLowerCase()} "${text(headings[0])}" — start at the h1`);
  for (let i = 1; i < headings.length; i++) {
    const prev = Number(headings[i - 1].tagName[1]), level = Number(headings[i].tagName[1]);
    if (level > prev + 1) { out.outline.push(`${headings[i].tagName.toLowerCase()} "${text(headings[i])}" follows ${headings[i - 1].tagName.toLowerCase()} — a level is skipped`); break; }
  }
  return out;
}
