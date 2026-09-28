/**
 * In-page quality checks for tools/platform-audit/audit.mjs (--quality, --density). Each exported function runs in the
 * browser through page.evaluate, so it must stay self-contained (no imports, no outer variables).
 *
 * They answer "is it built to the system?" on the rendered page — what the static guards cannot see (inline styles,
 * inherited values, mode switches) and what a screenshot shows only to a careful eye:
 *
 *   scale      (error) text whose size / line height / tracking / weight / family is no Zen text style (anywhere in a
 *              preview); example markup (non-`zen-*` elements) with padding, gap or corner radius off the token scale, or
 *              a colour that is no --zen-color-* token in the current theme and modes
 *   roles      (warn)  example markup that paints text with a background/border token, a fill with a content token…
 *   hierarchy  (error) content hierarchy (Typography › Content hierarchy): an h1 that is not Heading/1, a heading smaller
 *              than the body text it introduces, an overlay title that is not an h2 or is Heading/1
 *   rhythm     (warn)  a title and the text under it that look identical (flat hierarchy), a title not in the
 *              Strongest tone, a Heading/* styled line that is not a heading (and not a value), more than six text styles
 *              in one example, nested corners that are not concentric (outer = inner + inset), list rows padded twice
 *   density    (error) (densitySnapshot, compared by audit.mjs) Zen elements whose in-flow content outgrows them once
 *              Component Size is Comfortable
 *
 * Opt out one element (with a reason in code) by `data-audit-skip-quality`.
 */

export function qualityChecks({ scopeSel }) {
  const out = { scale: [], roles: [], hierarchy: [], rhythm: [] };
  const scope = scopeSel ? document.querySelector(scopeSel) : document;
  if (!scope) return out;
  const REGION = ".pe-card__stage, .platform-example-panel .platform-example-row, .official-portal-root > *";
  const regions = [...(scope.matches?.(REGION) ? [scope] : []), ...scope.querySelectorAll(REGION)]
    .filter((r) => !r.closest(".platform-guideline-visual__dont, [data-verdict='dont']"));
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && parseFloat(s.opacity) > 0.05 && !el.closest("[aria-hidden='true'], [inert], .zen-visually-hidden:not(:focus-within), [data-audit-skip-quality]"); };
  const label = (el) => (el.closest("[data-audit-label]")?.getAttribute("data-audit-label") ?? el.closest(".pe-card")?.querySelector("h3")?.textContent ?? el.closest(".platform-example-panel")?.querySelector("h2")?.textContent ?? (el.closest(".official-portal-root") ? "overlay" : "page")).trim().slice(0, 40);
  const describe = (el) => `${el.tagName.toLowerCase()}${typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).filter((c) => !/^zen-type-/.test(c)).slice(0, 2).join(".") : ""}`;
  const push = (kind, msg) => { if (!out[kind].includes(msg)) out[kind].push(msg); };
  const px = (v) => parseFloat(v) || 0;
  const near = (a, b, t = 0.15) => Math.abs(a - b) <= t;
  const isInternal = (el) => typeof el.className === "string" && el.className.split(/\s+/).some((c) => c.startsWith("zen-") && !/^zen-(type-|text$|heading$)/.test(c));
  const isFrame = (el) => typeof el.className === "string" && /\bplatform-phone|\bpe-chat-desktop__(chrome|bar|dots)/.test(el.className);

  /* ── token values, resolved per mode scope (nearest element carrying a data-* mode) ─────────────────────────── */
  const tokenNames = (() => {
    const names = new Set();
    const walk = (rules) => { for (const r of rules) { if (r.style) for (let i = 0; i < r.style.length; i++) { const n = r.style[i]; if (n.startsWith("--zen-")) names.add(n); } if (r.cssRules?.length) walk(r.cssRules); } };
    for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch { /* cross-origin */ } }
    return [...names];
  })();
  const canvas = document.createElement("canvas").getContext("2d");
  const normColour = (c) => { if (!c) return null; canvas.fillStyle = "#010203"; canvas.fillStyle = c; const v = canvas.fillStyle; return v === "#010203" && !/^#010203$/i.test(c.trim()) ? null : v; };
  const MODE = "[data-theme], [data-density], [data-radius], [data-typography], [data-emphasis], [data-breakpoint], [data-component-theme]";
  const scopes = new Map();
  const modeScope = (el) => el.closest(MODE) ?? document.documentElement;
  const tokensFor = (el) => {
    const host = modeScope(el);
    if (scopes.has(host)) return scopes.get(host);
    const cs = getComputedStyle(host);
    const spacing = new Set([0]), radius = new Set([0]), colours = new Map();
    for (const name of tokenNames) {
      const v = cs.getPropertyValue(name).trim(); if (!v) continue;
      if (/^--zen-(spacing-|margin-|gutter$|modal-padding$|card-padding-|list-inset$)/.test(name) && /^-?[\d.]+px$/.test(v)) spacing.add(Math.abs(parseFloat(v)));
      else if (/^--zen-(corner-radius-|modal-radius$)/.test(name) && /^[\d.]+px$/.test(v)) radius.add(parseFloat(v));
      else if (/^--zen-color-/.test(name)) { const c = normColour(v); if (c) (colours.get(c) ?? colours.set(c, []).get(c)).push(name.replace("--zen-color-", "")); }
    }
    // Text styles: probe every .zen-type-* class inside this mode scope.
    const classes = new Set();
    const walk = (rules) => { for (const r of rules) { for (const m of (r.selectorText ?? "").matchAll(/\.zen-type-([\w-]+)/g)) classes.add(m[1]); if (r.cssRules?.length) walk(r.cssRules); } };
    for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch { /* cross-origin */ } }
    const probe = document.createElement("span"); probe.textContent = "x"; probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;left:-9999px;top:0";
    host.appendChild(probe);
    const styles = [];
    for (const c of classes) {
      probe.className = `zen-type-${c}`; const s = getComputedStyle(probe);
      styles.push({ name: c, fs: px(s.fontSize), lh: s.lineHeight === "normal" ? null : px(s.lineHeight), ls: s.letterSpacing === "normal" ? 0 : px(s.letterSpacing), fw: Number(s.fontWeight), ff: s.fontFamily.split(",")[0].replace(/["']/g, "").trim() });
    }
    probe.remove();
    const weights = new Set(["regular", "medium", "semi-bold", "bold"].map((w) => Number(cs.getPropertyValue(`--zen-emphasis-font-weight-${w}`).trim())).filter(Boolean));
    const entry = { spacing, radius, colours, styles, weights, families: new Set(styles.map((s) => s.ff)) };
    scopes.set(host, entry);
    return entry;
  };
  const styleOf = (el, t) => {
    const s = getComputedStyle(el); const fs = px(s.fontSize); const lh = s.lineHeight === "normal" ? null : px(s.lineHeight); const ls = s.letterSpacing === "normal" ? 0 : px(s.letterSpacing); const fw = Number(s.fontWeight);
    const ff = s.fontFamily.split(",")[0].replace(/["']/g, "").trim();
    const hits = t.styles.filter((x) => near(x.fs, fs) && lh !== null && x.lh !== null && near(x.lh, lh, 0.6) && near(x.ls, ls, 0.06));
    const exact = hits.find((x) => x.fw === fw) ?? hits[0];
    return { fs, lh, ls, fw, ff, name: exact?.name ?? null, weightOk: t.weights.has(fw) || hits.some((x) => x.fw === fw), familyOk: t.families.has(ff) };
  };
  const toneOf = (el, t) => { const c = normColour(getComputedStyle(el).color); return c ? (t.colours.get(c) ?? []) : []; };
  const nearestStyles = (fs, t) => [...new Map(t.styles.map((x) => [`${x.fs}/${x.lh}`, x])).values()].sort((a, b) => Math.abs(a.fs - fs) - Math.abs(b.fs - fs)).slice(0, 2).map((x) => `${x.name} ${x.fs}/${x.lh}`).join(" or ");
  const CONTROL = "button, a[href], input, textarea, select, [role='button'], [role='tab'], [role='option'], [role='menuitem'], [role='switch'], [role='checkbox'], [role='radio'], label, .zen-chip, .zen-badge, .zen-tag, .zen-avatar, .zen-dock-icon, .zen-tooltip, .zen-button, .zen-segmented, .zen-badge-counter, .zen-file-icon";
  const NUMERIC = /^[\s\d$€£¥₫%.,+\-−×/:()kKmMbB]+$/;

  for (const region of regions) {
    /* ── text: every text node's element resolves to a Zen text style ─────────────────────────────────────────── */
    const blocks = []; const seen = new Set();
    const walker = document.createTreeWalker(region, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement; const text = n.textContent.trim();
      if (!el || !text || seen.has(el) || !visible(el)) continue; seen.add(el);
      if (el.closest("svg, [data-audit-skip-type], .zen-chart__svg, .platform-code, pre, .zen-skeleton") || isFrame(el)) continue;
      if (/^[\p{Extended_Pictographic}\p{Emoji_Component}️‍\s]+$/u.test(text) && !/^[\d#*\s]+$/.test(text)) continue;
      const t = tokensFor(el); const st = styleOf(el, t);
      const where = `${label(el)}: "${text.slice(0, 24)}" (${describe(el)})`;
      const twin = !st.name && t.styles.find((x) => near(x.fs, st.fs) && st.lh !== null && x.lh !== null && near(x.lh, st.lh, 0.6));
      if (twin && !el.closest("code, kbd, samp")) push("scale", `${where} is ${st.fs}/${st.lh} like ${twin.name} but tracks ${st.ls}px instead of ${twin.ls}px — apply the whole text style (.zen-type-${twin.name}), not just its size`);
      else if (!st.name && !el.closest("code, kbd, samp")) push("scale", `${where} is ${st.fs}/${st.lh ?? "normal"} — no Zen text style; nearest ${nearestStyles(st.fs, t)}`);
      else if (!st.weightOk) push("scale", `${where} uses weight ${st.fw} — weights come from --zen-emphasis-font-weight-* (${[...t.weights].join("/")})`);
      else if (!st.familyOk && !el.closest("code, kbd, samp")) push("scale", `${where} is set in ${st.ff} — not a Zen typography family`);
      const heading = el.closest("h1, h2, h3, h4, h5, h6, [role='heading']");
      const level = heading ? Number(heading.getAttribute("aria-level") ?? heading.tagName.slice(1)) || 2 : 0;
      blocks.push({ el, text, st, level, heading, control: Boolean(el.closest(CONTROL)), tone: toneOf(el, t), top: el.getBoundingClientRect().top });
    }

    /* ── hierarchy ─────────────────────────────────────────────────────────────────────────────────────────────── */
    const content = blocks.filter((b) => !b.control);
    const bodySizes = content.filter((b) => !b.level && b.st.name && /^body-(base|extra|small)/.test(b.st.name)).map((b) => b.st.fs);
    const bodyMode = bodySizes.length ? bodySizes.sort((a, b) => bodySizes.filter((x) => x === b).length - bodySizes.filter((x) => x === a).length)[0] : null;
    for (const b of content.filter((x) => x.level)) {
      const where = `${label(b.el)}: "${b.text.slice(0, 24)}" (h${b.level})`;
      if (b.level === 1 && b.st.name && b.st.name !== "heading-1") push("hierarchy", `${where} is ${b.st.name} — an h1 is the page title and always Heading/1`);
      if (bodyMode && b.st.fs + 0.5 < bodyMode && b.heading.contains(b.el)) push("hierarchy", `${where} is ${b.st.fs}px, smaller than the ${bodyMode}px body text — a heading never reads below its content (use a lower level or emphasis instead)`);
      const overlay = b.el.closest("[role='dialog'], [role='alertdialog'], .zen-side-panel, .zen-bottom-sheet");
      if (overlay && overlay.querySelector("h1, h2, h3, h4, h5, h6, [role='heading']") === b.heading && (b.level !== 2 || b.st.name === "heading-1")) push("hierarchy", `${where} titles an overlay — overlay titles are h2 and never Heading/1`);
      if (b.tone.length && !b.tone.some((n) => /^content-.*-strongest$|^content-on-|^content-inverse/.test(n)) && b.tone.some((n) => /^content-neutral-(base|light)$/.test(n))) push("rhythm", `${where} is in a ${b.tone.find((n) => /^content-neutral/.test(n))} tone — titles use Strongest; lower the level, not the colour`);
    }
    // Flat hierarchy: a title and the next text block look the same.
    for (let i = 0; i < content.length - 1; i++) {
      const a = content[i], b = content[i + 1];
      if (!a.level || b.level || !a.st.name || !b.st.name) continue;
      if (a.st.name === b.st.name && a.st.fw === b.st.fw && a.tone.join() === b.tone.join() && b.top > a.top) push("rhythm", `${label(a.el)}: title "${a.text.slice(0, 20)}" and "${b.text.slice(0, 20)}" share ${a.st.name}/${a.st.fw} in the same tone — the title does not stand out (use the title style, or Base tone / a smaller style for the description)`);
    }
    // Visual headings: a Heading/* or Subheading line that is not a heading and not a value.
    for (const b of content) {
      if (b.level || !b.st.name || !/^heading-(1|3|4|subheading)$/.test(b.st.name) || NUMERIC.test(b.text) || (/\d/.test(b.text) && b.text.length < 12)) continue;
      if (b.el.closest(".zen-top-nav, .zen-sidebar, .zen-bottom-nav, [class*='logo'], [class*='brand'], .zen-metric, .zen-stat")) continue;
      push("rhythm", `${label(b.el)}: "${b.text.slice(0, 24)}" is styled ${b.st.name} but is not a heading — titles are <Heading level> so the outline matches what people see`);
    }
    const distinct = new Set(content.map((b) => b.st.name).filter(Boolean));
    if (distinct.size > 7) push("rhythm", `${label(region)}: ${distinct.size} text styles in one example (${[...distinct].join(", ")}) — a calm hierarchy uses 3–5 (a full page up to ~7)`);

    /* ── example markup: spacing, radius, colour on the token scale ──────────────────────────────────────────── */
    for (const el of region.querySelectorAll("*")) {
      if (isInternal(el) || isFrame(el) || !visible(el) || el.closest("svg")) continue;
      if (el.closest(".zen-chart__svg, [data-audit-skip-quality]")) continue;
      const s = getComputedStyle(el); const t = tokensFor(el); const where = `${label(el)}: ${describe(el)}`;
      const safe = ["top", "bottom"].map((k) => px(s.getPropertyValue(`--zen-safe-area-${k}`))).filter(Boolean);
      const offScale = (v) => { const n = Math.abs(px(v)); return n > 1 && ![...t.spacing].some((x) => Math.abs(x - n) <= 1 || safe.some((a) => Math.abs(x + a - n) <= 1)); };
      const pads = ["Top", "Right", "Bottom", "Left"].map((k) => s[`padding${k}`]).filter(offScale);
      if (pads.length) push("scale", `${where} has padding ${pads[0]} — not a --zen-spacing-padding-* value in this density`);
      for (const g of [s.rowGap, s.columnGap]) if (g && g !== "normal" && /^(flex|inline-flex|grid|inline-grid)$/.test(s.display) && offScale(g)) { push("scale", `${where} has gap ${g} — not a --zen-spacing-gap-* value in this density`); break; }
      for (const k of ["margin", "marginTop", "marginRight", "marginBottom", "marginLeft", "marginInline", "marginBlock"]) { const v = el.style[k]; if (v && /px/.test(v) && v.split(/\s+/).some(offScale)) { push("scale", `${where} has an inline margin ${v} — use a spacing token`); break; } }
      const r = el.getBoundingClientRect();
      for (const k of ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"]) {
        const v = s[k]; if (!v || v === "0px" || /%/.test(v)) continue;
        const n = px(v); if (n >= 999 || n >= Math.min(r.width, r.height) / 2 - 0.5) continue; // pills and circles
        if (![...t.radius].some((x) => Math.abs(x - n) <= 0.5)) { push("scale", `${where} has corner radius ${v} — not a --zen-corner-radius-* value in this radius mode`); break; }
      }
      // Colours set on this element (not inherited) must be tokens of the current theme, in the right role.
      const parent = el.parentElement ? getComputedStyle(el.parentElement) : null;
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (hasText && parent && s.color !== parent.color) {
        const names = t.colours.get(normColour(s.color)) ?? [];
        if (!names.length) push("scale", `${where} text colour ${s.color} is no --zen-color-* token in this theme`);
        else if (!names.some((n) => n.startsWith("content-"))) push("roles", `${where} text is painted with ${names[0]} — text uses Color/Content/*`);
      }
      const bg = normColour(s.backgroundColor);
      if (s.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor) && s.backgroundImage === "none" && bg) {
        const names = t.colours.get(bg) ?? []; const line = r.width <= 2.5 || r.height <= 2.5; const dot = r.width <= 12 && r.height <= 12;
        if (!names.length) push("scale", `${where} background ${s.backgroundColor} is no --zen-color-* token in this theme`);
        else if (!line && !dot && !names.some((n) => /^(background|border|focus|shadow)-/.test(n))) push("roles", `${where} fills with ${names[0]} — fills use Color/Background/*`);
      }
      for (const side of ["Top", "Right", "Bottom", "Left"]) {
        if (px(s[`border${side}Width`]) < 0.5 || s[`border${side}Style`] === "none") continue;
        const c = normColour(s[`border${side}Color`]); if (!c || /rgba\(0, 0, 0, 0\)/.test(s[`border${side}Color`])) continue;
        const names = t.colours.get(c) ?? [];
        if (!names.length) push("scale", `${where} border colour ${s[`border${side}Color`]} is no --zen-color-* token in this theme`);
        else if (!names.some((n) => /^(border|focus)-/.test(n))) push("roles", `${where} strokes with ${names[0]} — borders use Color/Border/*`);
        break;
      }
    }

    /* ── concentric corners and double insets (any element, internals included) ─────────────────────────────── */
    const paints = (el) => { const s = getComputedStyle(el); const bgc = s.backgroundColor; return (bgc && !/rgba\(0, 0, 0, 0\)|transparent/.test(bgc)) || s.backgroundImage !== "none" || ["Top", "Right", "Bottom", "Left"].every((k) => px(s[`border${k}Width`]) >= 0.5 && s[`border${k}Style`] !== "none") || /(^|,)\s*(rgba?\([^)]*\)\s*)?(inset\s+)?0px 0px 0px [\d.]+px/.test(s.boxShadow); };
    const radiusOf = (el) => px(getComputedStyle(el).borderTopLeftRadius);
    for (const outer of region.querySelectorAll("*")) {
      if (!visible(outer) || !paints(outer)) continue;
      const R = radiusOf(outer); const or = outer.getBoundingClientRect();
      if (R <= 0 || R >= 999 || R >= Math.min(or.width, or.height) / 2 - 0.5 || or.width < 60 || or.height < 40) continue;
      const os = getComputedStyle(outer);
      const inner = { left: or.left + px(os.borderLeftWidth), top: or.top + px(os.borderTopWidth), right: or.right - px(os.borderRightWidth), bottom: or.bottom - px(os.borderBottomWidth) };
      const kids = [...outer.querySelectorAll(":scope > *, :scope > * > *, :scope > * > * > *")];
      for (const kid of kids) {
        if (!visible(kid)) continue;
        const interactive = kid.matches("button, a[href], [role='button'], [role='option'], [role='menuitem'], .zen-list-item, .zen-card");
        if (!(paints(kid) || interactive)) continue;
        const r = radiusOf(kid); const kr = kid.getBoundingClientRect();
        if (r <= 0 || r >= 999 || r >= Math.min(kr.width, kr.height) / 2 - 0.5) continue;
        const d = [kr.left - inner.left, kr.top - inner.top, inner.right - kr.right];
        const dd = Math.min(...d);
        if (dd < 0 || Math.max(...d) - dd > 1.5 || dd > 16) continue;          // not uniformly inset near the corner
        if (dd === 0 && ["hidden", "clip"].includes(os.overflowX)) continue;   // clipped by the outer corner
        const want = r + dd;
        if (Math.abs(R - want) > 1.5 && (dd > 0 || R < r)) { push("rhythm", `${label(outer)}: ${describe(outer)} corner ${R}px vs inner ${describe(kid)} ${r}px + inset ${Math.round(dd)}px — nested corners are concentric (outer = inner + inset = ${Math.round(want)}px)`); break; }
      }
    }
    for (const row of region.querySelectorAll(".zen-list-item")) {
      let host = row.parentElement;
      while (host && host !== region && !paints(host)) host = host.parentElement;
      if (!host || host === region) continue;
      const hs = getComputedStyle(host), rs = getComputedStyle(row);
      const outerPad = row.getBoundingClientRect().left - host.getBoundingClientRect().left - px(hs.borderLeftWidth);
      if (outerPad >= 12 && px(rs.paddingLeft) >= 12) { push("rhythm", `${label(row)}: list rows in ${describe(host)} are inset twice (${Math.round(outerPad)}px container + ${px(rs.paddingLeft)}px row) — let <List inset> own the inset and pad the container with Padding/2XSmall`); break; }
    }
  }
  return out;
}

/** Density fit: call once per density; audit.mjs compares Compact vs Comfortable ("content outgrows its Zen box"). */
export function densitySnapshot() {
  const out = {};
  const roots = document.querySelectorAll(".pe-card__stage, .platform-example-panel .platform-example-row, .official-portal-root > *");
  roots.forEach((root, ri) => {
    root.querySelectorAll("*").forEach((el, i) => {
      const cls = typeof el.className === "string" ? el.className.split(/\s+/).filter((c) => c.startsWith("zen-") && !c.startsWith("zen-type")).slice(0, 2).join(".") : "";
      if (!cls) return;
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      if (!r.width || cs.display === "contents" || cs.display === "inline" || ["auto", "scroll"].includes(cs.overflowY) || ["auto", "scroll"].includes(cs.overflowX) || el.closest("[data-audit-skip-quality]")) return;
      let over = 0, kid = "";
      for (const k of el.children) {
        const ks = getComputedStyle(k); if (["absolute", "fixed"].includes(ks.position) || ks.display === "none") continue;
        const kr = k.getBoundingClientRect(); if (!kr.width && !kr.height) continue;
        const o = Math.max(kr.right - r.right, r.left - kr.left, kr.bottom - r.bottom, r.top - kr.top);
        if (o > over) { over = o; kid = typeof k.className === "string" ? k.className.split(/\s+/).filter((c) => c.startsWith("zen-") && !c.startsWith("zen-type")).slice(0, 1).join("") || k.tagName.toLowerCase() : k.tagName.toLowerCase(); }
      }
      const card = (el.closest("[data-audit-label]")?.getAttribute("data-audit-label") ?? el.closest(".pe-card")?.querySelector("h3")?.textContent ?? el.closest(".platform-example-panel")?.querySelector("h2")?.textContent ?? "overlay").trim().slice(0, 40);
      out[`${ri}:${i}`] = { over: Math.round(over * 10) / 10, text: `${card}: ${cls} ← ${kid}` };
    });
  });
  return out;
}
