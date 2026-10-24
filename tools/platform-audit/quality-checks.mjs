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
 *   roles      (warn)  example markup that paints text with a background/border token, a fill with a content token…;
 *              a Surface/Default box on the Canvas/Default stage with a border or a shadow (§16 default pairing)
 *   hierarchy  (error) content hierarchy (Typography › Content hierarchy, review 2026-09-29): a content h1 smaller than
 *              Heading/1 — Heading/1 or a larger Display / Display-Extra style (an emphasis page: a home, a welcome; the
 *              user 2026-10-19); the TopNavigation bar title and overlay titles are exempt — an h2/h3 in a Heading/* style
 *              smaller than the body text right under it, an overlay title styled Heading/1 (h1 or h2 are both fine)
 *   rhythm     (warn)  a title and the text under it that look identical (flat hierarchy), a title not in the
 *              Strongest tone (tone read from the token that paints it; a Body/Small/Bold group header may be Base), any
 *              other heading smaller than the body text right under it (Body/Small/Bold group headers are kickers and
 *              exempt), an overlay title below h2, a Heading/* styled line that is not a heading (and not a value or a wordmark: the name after its Avatar / Icon / Dock Icon mark, a brand or logo wrapper), more
 *              than seven text styles in one example (eight on a whole screen; the .pth-outline readout and the navigation chrome, Sidebar and TopNavigation compact bar, not counted), nested corners that are not
 *              concentric (outer = inner + inset, each corner on its own; the Luxury radius mode is skipped), list rows padded twice
 *   density    (error) (densitySnapshot, compared by audit.mjs) Zen elements whose in-flow content outgrows them once
 *              Component Size is Comfortable
 *   fit        (error) (textFit) text wider than its own box with no ellipsis and no scroll: it runs into what sits next
 *              to it, or is cut off mid-text. The platform `overflow` check skips anything inside an `overflow: hidden`
 *              ancestor, so on 2026-09-28 a Segmented whose items shrank below their labels read "404 No resultsFirst use"
 *              and nothing was reported
 *   card-gap   (error) (widgetLayout) a MetricCard or ChartCard stretched by its row whose content stops short, leaving an
 *              empty band at its foot while a neighbour fills its height (the user 2026-10-16: a 48px Spark-Bars beside
 *              64px sparklines left a 16px gap under it)
 *   legend-column (error) (widgetLayout) a chart legend of three or more items stacked one per line under (or over) its
 *              chart, with room for a row beside nothing (the user 2026-10-16: wrap it like Figma's auto layout)
 *   toolbar-search (error) (widgetLayout) a Search wider than 240px in a toolbar row beside other controls, at 768px
 *              and wider (the user 2026-10-24: a toolbar Search stretched across the row; harness search/toolbar-width)
 *
 * Opt out one element (with a reason in code) by `data-audit-skip-quality`.
 */

export function qualityChecks({ scopeSel, regionSel }) {
  const out = { scale: [], roles: [], hierarchy: [], rhythm: [], ladder: [] };
  const scope = scopeSel ? document.querySelector(scopeSel) : document;
  if (!scope) return out;
  // `regionSel`: what counts as product UI — the docs' example stages by default; an app audit (zen-ds audit) passes "body".
  const REGION = regionSel ?? ".pe-card__stage, .platform-example-panel .platform-example-row, .official-portal-root > *";
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
  // The spacing ladder (usage rules §13): name → Gap token suffix, resolved per mode scope like the other tokens. 3xs
  // (Gap/3XSmall, 2) joined it on 2026-10-19 (the user): two lines of one compact item, as Figma spaces them.
  const LADDER = [["3xs", "3-xsmall"], ["2xs", "2-xsmall"], ["xs", "xsmall"], ["sm", "small"], ["md", "medium"], ["lg", "large"], ["xl", "xlarge"]];
  const ladders = new Map();
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
    // A style is named by its metrics and family: Body/Code shares Body/Small's size, so text in the sans family that only
    // misses Body/Small's tracking must not pass as Body/Code (it falls to the scale check, which names the whole style).
    const hits = t.styles.filter((x) => near(x.fs, fs) && lh !== null && x.lh !== null && near(x.lh, lh, 0.6) && near(x.ls, ls, 0.06) && x.ff === ff);
    const exact = hits.find((x) => x.fw === fw) ?? hits[0];
    return { fs, lh, ls, fw, ff, name: exact?.name ?? null, weightOk: t.weights.has(fw) || hits.some((x) => x.fw === fw), familyOk: t.families.has(ff) };
  };
  const toneOf = (el, t) => { const c = normColour(getComputedStyle(el).color); return c ? (t.colours.get(c) ?? []) : []; };
  // Tone by token name. Several tokens share one colour (content-neutral-base = content-on-white-overlay-base in Light),
  // so the rgba alone cannot name the tone. The name comes from what paints the text: an inline var(), or the last
  // stylesheet rule matching the element (or the ancestor it inherits from) whose --zen-color-content-* token resolves to
  // the text's colour. null when nothing names it (callers fall back to toneOf).
  const colourRules = (() => {
    const index = new Map(); let order = 0;
    const walk = (rules, active) => {
      for (const r of rules) {
        if (r instanceof CSSMediaRule) { walk(r.cssRules, active && matchMedia(r.media.mediaText).matches); continue; }
        const token = active && r.selectorText ? r.style?.getPropertyValue("color").match(/var\(\s*--zen-color-(content-[\w-]+)/)?.[1] : null;
        if (token) for (const part of r.selectorText.split(/,(?![^(]*\))/)) {
          const sel = part.trim(); const subject = sel.split(/\s*[>+~]\s*|\s+/).pop() ?? "";
          const key = /\(/.test(sel) ? "*" : subject.match(/\.([\w-]+)/)?.[1] ?? "*"; // rules indexed by a class of the subject
          (index.get(key) ?? index.set(key, []).get(key)).push({ sel, name: token, order: order++ });
        }
        if (r.cssRules?.length) walk(r.cssRules, active);
      }
    };
    for (const sheet of document.styleSheets) { try { walk(sheet.cssRules, true); } catch { /* cross-origin */ } }
    return index;
  })();
  const tones = new Map();
  const toneName = (el) => {
    if (tones.has(el)) return tones.get(el);
    const target = normColour(getComputedStyle(el).color); let found = null;
    for (let a = el; a && target; a = a.parentElement) {
      const cs = getComputedStyle(a);
      const paints = (name) => normColour(cs.getPropertyValue(`--zen-color-${name}`).trim()) === target;
      const inline = a.style?.color?.match(/var\(\s*--zen-color-(content-[\w-]+)/)?.[1];
      if (inline) { found = paints(inline) ? inline : null; break; }
      const hits = [...(colourRules.get("*") ?? []), ...[...a.classList].flatMap((c) => colourRules.get(c) ?? [])].filter((r) => { try { return a.matches(r.sel); } catch { return false; } });
      if (!hits.length) { if (a.style?.color && a.style.color !== "inherit") break; continue; } // inherits: climb
      found = hits.filter((r) => paints(r.name)).sort((x, y) => y.order - x.order)[0]?.name ?? null;
      break;
    }
    tones.set(el, found);
    return found;
  };
  const HEADING = "h1, h2, h3, h4, h5, h6, [role='heading']";
  const OVERLAY = "[role='dialog'], [role='alertdialog'], .zen-side-panel, .zen-bottom-sheet";
  // The TopNavigation compact bar title is the screen's h1 in its bar style (decision 1), a layer of its own.
  const barTitle = (h) => Boolean(h.closest(".zen-top-nav__bar") || h.matches(".zen-top-nav__title"));
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
      const twins = st.name ? [] : t.styles.filter((x) => near(x.fs, st.fs) && st.lh !== null && x.lh !== null && near(x.lh, st.lh, 0.6));
      const twin = twins.find((x) => x.ff === st.ff && x.fw === st.fw) ?? twins.find((x) => x.ff === st.ff) ?? twins[0];
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
    const judged = new Set();
    content.forEach((b, i) => {
      if (!b.level || judged.has(b.heading)) return; // one verdict per heading, from its first text
      judged.add(b.heading);
      const where = `${label(b.el)}: "${b.text.slice(0, 24)}" (h${b.level})`;
      const overlay = b.el.closest(OVERLAY);
      const overlayTitle = Boolean(overlay) && overlay.querySelector(HEADING) === b.heading;
      const bar = barTitle(b.heading);
      const kicker = b.st.name === "body-small-bold"; // a list group header: a kicker label (decision 4)
      // A content h1 is the title shown large: Heading/1, or a larger Display / Display-Extra style on an emphasis page (a
      // home, a welcome: the user 2026-10-19), never smaller. The compact bar title and overlay titles are their own layers.
      if (b.level === 1 && b.st.name && !/^(heading-1|display-(extra-)?\d)$/.test(b.st.name) && !bar && !overlayTitle) push("hierarchy", `${where} is ${b.st.name} — a content h1 is the page title shown large: Heading/1 or a larger Display / Display-Extra style, never smaller (only the TopNavigation bar title keeps its bar style)`);
      // Overlay titles: h2 by default, h1 accepted (decision 5a); the component's own style, never Heading/1 (5b).
      if (overlayTitle && b.st.name === "heading-1") push("hierarchy", `${where} titles an overlay in Heading/1 — overlay titles keep the component's style (Dialog, Bottom Sheet, Side Panel Heading/3 · ModalForm Heading/2), never Heading/1`);
      else if (overlayTitle && b.level > 2) push("rhythm", `${where} titles an overlay — overlay titles are h2 by default (h1 is accepted)`);
      // Smaller than the text right under it: an error for an h2/h3 in a Heading/* style, a warning otherwise. Kickers
      // (Body/Small/Bold group headers) and the bar title are exempt.
      const next = kicker || bar ? null : content.slice(i + 1).find((x) => !x.level);
      if (next?.st.name && /^body-/.test(next.st.name) && b.st.fs + 0.5 < next.st.fs) {
        const error = /^heading-/.test(b.st.name ?? "") && (b.level === 2 || b.level === 3);
        push(error ? "hierarchy" : "rhythm", `${where} is ${b.st.fs}px, smaller than the ${next.st.fs}px text under it ("${next.text.slice(0, 20)}") — a heading never reads below its content (use a lower level or emphasis instead)`);
      }
      // Titles use Strongest; a kicker uses Light (user decision 2026-10-03). The tone is the token that paints the text, not
      // an rgba lookalike.
      const tone = toneName(b.el);
      if (tone) {
        if (kicker ? tone === "content-neutral-base" : /^content-neutral-(base|light)$/.test(tone)) push("rhythm", kicker ? `${where} is a Body/Small/Bold group header in ${tone} — group headers (kickers) use the Light tone` : `${where} is in a ${tone} tone — titles use Strongest; lower the level, not the colour`);
      } else if (!kicker && b.tone.length && !b.tone.some((n) => /^content-.*-strongest$|^content-on-|^content-inverse/.test(n)) && b.tone.some((n) => /^content-neutral-(base|light)$/.test(n))) push("rhythm", `${where} is in a ${b.tone.find((n) => /^content-neutral/.test(n))} tone — titles use Strongest; lower the level, not the colour`);
    });
    // Flat hierarchy: a title and the next text block look the same. The bar title is compared only within its own layer
    // (the app bar), so the content under it (a Body/Extra/Bold status line) is not its description.
    for (let i = 0; i < content.length - 1; i++) {
      const a = content[i], b = content[i + 1];
      if (!a.level || b.level || !a.st.name || !b.st.name || barTitle(a.heading)) continue;
      if (a.st.name === b.st.name && a.st.fw === b.st.fw && a.tone.join() === b.tone.join() && b.top > a.top) push("rhythm", `${label(a.el)}: title "${a.text.slice(0, 20)}" and "${b.text.slice(0, 20)}" share ${a.st.name}/${a.st.fw} in the same tone — the title does not stand out (use the title style, or Base tone / a smaller style for the description)`);
    }
    // Visual headings: a Heading/* or Subheading line that is not a heading and not a value.
    for (const b of content) {
      if (b.level || !b.st.name || !/^heading-(1|3|4|subheading)$/.test(b.st.name) || NUMERIC.test(b.text) || (/\d/.test(b.text) && b.text.length < 12)) continue;
      // Values styled as Subheading: a metric, a stat, a Dashboard Header's result count ("96 results").
      if (b.el.closest(".zen-top-nav, .zen-sidebar, .zen-bottom-nav, [class*='logo' i], [class*='brand' i], [data-brand], [data-logo], .zen-metric, .zen-stat, .zen-dashboard-header__subheading")) continue;
      // A wordmark, as the style-guard reads it (tools/style-guard/check-styles.mjs type/visual-heading): an inline name
      // right after its mark, an Avatar, Icon or Dock Icon leading a brand row ("[N] Northwind", "[Z] Zen Docs").
      const mark = b.el.previousElementSibling;
      if (b.el.tagName === "SPAN" && mark?.matches(".zen-avatar, .zen-dock-icon, .zen-icon, svg")) continue;
      push("rhythm", `${label(b.el)}: "${b.text.slice(0, 24)}" is styled ${b.st.name} but is not a heading — titles are <Heading level> so the outline matches what people see`);
    }
    // The Outline readout (.pth-outline, Typography › Content hierarchy) is platform annotation, not the example. The app's
    // navigation chrome, the Sidebar and the TopNavigation compact bar, is a layer of its own (as in the outline check),
    // the same on every page: its brand and section labels are not the page's hierarchy (2026-10-19: the Invoices page
    // rose from 8 to 9 styles only because it moved into the Sidebar shell).
    const chrome = ".pth-outline, .zen-app-shell__sidebar, .zen-sidebar, .zen-top-nav__bar";
    const distinct = new Set(content.filter((b) => !b.el.closest(chrome)).map((b) => b.st.name).filter(Boolean));
    // A whole screen (ExampleCard `screen`, the Templates) is a real page: h1, h4, Subheading, body regular / medium /
    // bold, small and caption make 8.
    const styleLimit = region.closest?.(".pe-card[data-screen='true']") ? 8 : 7;
    if (distinct.size > styleLimit) push("rhythm", `${label(region)}: ${distinct.size} text styles in one example (${[...distinct].join(", ")}) — a calm hierarchy uses 3–5 (a full page up to ~${styleLimit})`);

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
    // Per corner (Studio Phase 2, 2026-10-03: Box and Image take radiusTopLeft/TopRight/BottomRight/BottomLeft): each corner
    // of the outer box is compared with the same corner of a child inset uniformly near it. A child qualifies for a corner
    // when it sits at one distance from that corner's two edges and spans one of those edges (a top strip qualifies for
    // both top corners, a side strip for its two corners, a uniformly inset child for all four). Until 2026-10-03 only the
    // top-left corner of a child spanning the top edge was read; that case keeps its message, so its baseline entries still
    // match, and wins when an outer box has several findings. The Luxury radius mode is skipped: every step there is 2px,
    // so outer = inner + inset cannot hold on tokens.
    const CORNERS = [
      { key: "TopLeft", name: "top-left", sides: ["left", "top"], spans: ["right", "bottom"] },
      { key: "TopRight", name: "top-right", sides: ["right", "top"], spans: ["left", "bottom"] },
      { key: "BottomRight", name: "bottom-right", sides: ["right", "bottom"], spans: ["left", "top"] },
      { key: "BottomLeft", name: "bottom-left", sides: ["left", "bottom"], spans: ["right", "top"] },
    ];
    const cornerRadius = (s, key) => px(s[`border${key}Radius`]);
    const pill = (r, rect) => r >= 999 || r >= Math.min(rect.width, rect.height) / 2 - 0.5;
    for (const outer of region.querySelectorAll("*")) {
      if (!visible(outer) || !paints(outer) || outer.closest("[data-radius='luxury']")) continue;
      const os = getComputedStyle(outer); const or = outer.getBoundingClientRect();
      if (or.width < 60 || or.height < 40) continue;
      const Rs = Object.fromEntries(CORNERS.map(({ key }) => [key, cornerRadius(os, key)]));
      if (CORNERS.every(({ key }) => Rs[key] <= 0 || pill(Rs[key], or))) continue;
      const inner = { left: or.left + px(os.borderLeftWidth), top: or.top + px(os.borderTopWidth), right: or.right - px(os.borderRightWidth), bottom: or.bottom - px(os.borderBottomWidth) };
      const kids = [...outer.querySelectorAll(":scope > *, :scope > * > *, :scope > * > * > *")];
      let legacy = null, other = null;
      for (const kid of kids) {
        if (legacy) break;
        if (!visible(kid)) continue;
        // A modal overlay (AppShell's drawer, its modal aside) is inset from the viewport, not from the preview frame
        // that holds it in the docs (batch A2: the aside renders in place, as the drawer does): no concentric pair.
        const overlay = kid.closest(".zen-side-panel-overlay, .zen-app-shell__overlay");
        if (overlay && !outer.closest(".zen-side-panel-overlay, .zen-app-shell__overlay") && outer.contains(overlay)) continue;
        const interactive = kid.matches("button, a[href], [role='button'], [role='option'], [role='menuitem'], .zen-list-item, .zen-card");
        if (!(paints(kid) || interactive)) continue;
        const ks = getComputedStyle(kid); const kr = kid.getBoundingClientRect();
        // Radii are CSS px, rects are screen px: inside a scaled phone frame the insets are read back in CSS px.
        const k = outer.offsetWidth > 0 ? or.width / outer.offsetWidth : 1;
        const gap = { left: (kr.left - inner.left) / k, top: (kr.top - inner.top) / k, right: (inner.right - kr.right) / k, bottom: (inner.bottom - kr.bottom) / k };
        for (const corner of CORNERS) {
          const R = Rs[corner.key], r = cornerRadius(ks, corner.key);
          if (R <= 0 || pill(R, or) || r <= 0 || pill(r, kr)) continue;
          // Uniform along the corner's two edges and one spanned edge (the old check: left, top and right for top-left).
          const uniform = corner.spans.map((span) => [...corner.sides, span].map((side) => gap[side])).find((d) => Math.min(...d) >= 0 && Math.max(...d) - Math.min(...d) <= 1.5 && Math.min(...d) <= 16);
          if (!uniform) continue;                                                    // not uniformly inset near the corner
          const dd = Math.min(...uniform);
          if (dd === 0 && ["hidden", "clip"].includes(os.overflowX)) continue;     // clipped by the outer corner
          const want = r + dd;
          if (!(Math.abs(R - want) > 1.5 && (dd > 0 || R < r))) continue;
          const old = corner.key === "TopLeft" && Math.max(gap.left, gap.top, gap.right) - Math.min(gap.left, gap.top, gap.right) <= 1.5;
          const message = `${label(outer)}: ${describe(outer)} ${old ? "" : `${corner.name} `}corner ${R}px vs inner ${describe(kid)} ${r}px + inset ${Math.round(dd)}px — nested corners are concentric (outer = inner + inset = ${Math.round(want)}px)`;
          if (old) { legacy = message; break; }
          other ??= message;
        }
      }
      if (legacy ?? other) push("rhythm", legacy ?? other);
    }
    for (const row of region.querySelectorAll(".zen-list-item")) {
      let host = row.parentElement;
      while (host && host !== region && !paints(host)) host = host.parentElement;
      if (!host || host === region) continue;
      const hs = getComputedStyle(host), rs = getComputedStyle(row);
      const outerPad = row.getBoundingClientRect().left - host.getBoundingClientRect().left - px(hs.borderLeftWidth);
      if (outerPad >= 12 && px(rs.paddingLeft) >= 12) { push("rhythm", `${label(row)}: list rows in ${describe(host)} are inset twice (${Math.round(outerPad)}px container + ${px(rs.paddingLeft)}px row) — let <List inset> own the inset and pad the container with Padding/2XSmall`); break; }
    }

    /* ── default pairing (usage rules §16; backlog batch 9, user 2026-10-07): a Surface/Default box straight on the
       Canvas/Default stage is flat — white on the canvas already separates it — so a closed border or a shadow on it
       is a warning. Phones, shells (their elevation follows the Sidebar), Surface-in-Surface (the backdrop is not the
       canvas), clickable and selected cards and overlays keep their frames. */
    {
      const probe = (name) => { const el = document.createElement("span"); el.style.background = `var(--zen-color-background-${name})`; region.append(el); const c = normColour(getComputedStyle(el).backgroundColor); el.remove(); return c; };
      const surface = probe("surface-default");
      const canvasColour = probe("canvas-default");
      const backdropOf = (el) => { for (let a = el.parentElement; a; a = a.parentElement) { const c = getComputedStyle(a).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return normColour(c); if (a === region) break; } return normColour(getComputedStyle(region).backgroundColor); };
      const BOX = ".zen-card, .zen-list-box, .zen-metric-card, .zen-chart-card, .zen-box[data-surface]";
      // Playgrounds show the variant picked in their controls (a shadow one included), so they are not checked.
      const SKIP = ".platform-example-panel, .platform-phone, .zen-app-shell, .pe-shell, .platform-sidebar-stage, .zen-popover, .zen-menu, [role='dialog'], .zen-toast, .zen-tooltip, .zen-side-panel, .zen-bottom-sheet, [data-audit-skip-quality]";
      if (surface && canvasColour && surface !== canvasColour) {
        for (const box of region.querySelectorAll(BOX)) {
          if (!visible(box) || box.closest(SKIP) || box.closest("[data-interactive='true'], [data-selected='true'], [data-active='true'], [aria-selected='true'], [aria-checked='true'], [aria-current], a[href], button") || box.matches("[data-interactive='true'], [data-selected='true']")) continue;
          const bs = getComputedStyle(box);
          if (normColour(bs.backgroundColor) !== surface || backdropOf(box) !== canvasColour) continue;
          const bordered = ["Top", "Right", "Bottom", "Left"].every((k) => px(bs[`border${k}Width`]) >= 0.5 && bs[`border${k}Style`] !== "none" && !/rgba\(0, 0, 0, 0\)|transparent/.test(bs[`border${k}Color`]));
          // A shadow that shows: some layer with a visible colour and a blur, spread or offset (a transparent or
          // zero-size layer, as a selectable card keeps for its ring, is not one).
          const shadowed = bs.boxShadow && bs.boxShadow !== "none" && bs.boxShadow.split(/,(?![^(]*\))/).some((layer) => {
            const colour = /rgba?\([^)]*\)/.exec(layer)?.[0] ?? "";
            if (/rgba\([^)]*,\s*0\)$/.test(colour) || /transparent/.test(layer)) return false;
            return layer.replace(colour, "").match(/-?[\d.]+px/g)?.some((n) => parseFloat(n) !== 0);
          });
          if (bordered || shadowed) push("roles", `${label(box)}: ${describe(box)} is a Surface/Default box on Canvas/Default with ${bordered ? "a border" : "a shadow"} — the default pairing is flat (usage rules §16: Card/ListBox theme="flat", Box surface without border), unless a Sidebar, a white page or a Surface around it picks another pairing`);
        }
      }
    }

    /* ── spacing ladder (usage rules §13): the gap between elements is picked by their relationship from one ladder,
       3xs · 2xs · xs · sm · md · lg · xl (Gap tokens of this density), and a group's own gap is never wider than the gap
       that separates it from its siblings. Only the gaps a page author picks are read: Stack, Grid and example markup
       (components own their inner gaps, from Figma). A group that paints its own surface is grouped by its frame. */
    const authored = (el) => (el.classList.contains("zen-stack") || el.classList.contains("zen-grid") || !isInternal(el)) && !isFrame(el) && !el.closest("svg, .zen-chart__svg, [data-audit-skip-quality]");
    const flow = (el) => [...el.children].filter((k) => visible(k) && !["absolute", "fixed"].includes(getComputedStyle(k).position));
    const layoutOf = (el) => {
      const s = getComputedStyle(el); const kids = flow(el);
      if (kids.length < 2 || !/(flex|grid)$/.test(s.display)) return null;
      // An axis counts when two items sit side by side on it (one ends before the other starts), not when centred items
      // of different heights merely start at different offsets.
      const rs = kids.map((k) => k.getBoundingClientRect());
      const apart = (a, b) => rs.some((p) => rs.some((q) => q[a] >= p[b] - 1 && q !== p));
      const gap = { h: apart("left", "right") ? px(s.columnGap) : 0, v: apart("top", "bottom") ? px(s.rowGap) : 0 };
      if (/flex$/.test(s.display) && s.flexWrap === "nowrap") gap[s.flexDirection.startsWith("row") ? "v" : "h"] = 0;  // no cross-axis gap
      const kind = /grid$/.test(s.display) ? "grid" : s.flexDirection.startsWith("row") ? "row" : "column";
      return { gap, kind };
    };
    // The first words inside, so a finding can be found in the source.
    const hint = (el) => { const t = (el.textContent ?? "").trim().replace(/\s+/g, " "); return t ? ` ("${t.slice(0, 32)}${t.length > 32 ? "…" : ""}")` : ""; };
    const ladderOf = (el) => { const host = modeScope(el); if (!ladders.has(host)) { const cs = getComputedStyle(host); ladders.set(host, LADDER.map(([, k]) => px(cs.getPropertyValue(`--zen-spacing-gap-${k}`)))); } return ladders.get(host); };
    for (const el of region.querySelectorAll("*")) {
      if (!authored(el)) continue;
      const L = layoutOf(el); if (!L) continue;
      const steps = ladderOf(el); const where = `${label(el)}: ${describe(el)}${hint(el)}`;
      const off = ["v", "h"].map((a) => L.gap[a]).find((g) => g > 1 && !steps.some((x) => Math.abs(x - g) <= 1));
      if (off !== undefined) push("ladder", `${where} has gap ${off}px — not a spacing-ladder step (${LADDER.map(([n], i) => `${n} ${steps[i]}`).join(" · ")} px here; usage rules §13)`);
      // Only peer groups are compared: two or more sibling groups laid out alike (a heading or toolbar above one group is
      // a label → content relationship, which the ladder spaces closer than the group's own sections).
      const groups = flow(el).filter((kid) => authored(kid) && !paints(kid)).map((kid) => ({ kid, K: layoutOf(kid) })).filter((g) => g.K);
      for (const { kid, K } of groups) {
        if (groups.filter((g) => g.K.kind === K.kind).length < 2) continue;
        const axis = ["v", "h"].find((a) => L.gap[a] > 0 && K.gap[a] > L.gap[a] + 1);
        if (axis) push("ladder", `${where} spaces its groups ${L.gap[axis]}px apart but ${describe(kid)}${hint(kid)} spaces its own items ${K.gap[axis]}px (${axis === "v" ? "vertical" : "horizontal"}) — the gap between groups is at least one step wider than inside them (usage rules §13)`);
      }
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
      // Inert content (a collapsed Accordion panel) is not on screen: it keeps its size while its box collapses.
      if (!r.width || cs.display === "contents" || cs.display === "inline" || ["auto", "scroll"].includes(cs.overflowY) || ["auto", "scroll"].includes(cs.overflowX) || el.closest("[data-audit-skip-quality], [inert]")) return;
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

/**
 * Text fit: a label, button or line whose text is wider than its own box (scrollWidth > clientWidth), with no ellipsis and
 * no scroll. Its text runs into its neighbours even when an ancestor clips, or is cut off mid-text.
 *
 * Not reported: scroll containers, ellipsized text, faded edges (mask-image), screen-reader-only text, floating layers
 * sized to their content (tooltip bubbles), drawings and code, `data-audit-skip-quality`.
 *
 * Returns { fit, where }. `where[i]` is the stable part of `fit[i]`: audit.mjs matches it across densities.
 */
export function textFit({ scopeSel, regionSel }) {
  const out = { fit: [], where: [] };
  const scope = scopeSel ? document.querySelector(scopeSel) : document;
  if (!scope) return out;
  // `regionSel`: what counts as product UI — the docs' example stages by default; an app audit (zen-ds audit) passes "body".
  const REGION = regionSel ?? ".pe-card__stage, .platform-example-panel .platform-example-row, .official-portal-root > *";
  const regions = [...(scope.matches?.(REGION) ? [scope] : []), ...scope.querySelectorAll(REGION)]
    .filter((r) => !r.closest(".platform-guideline-visual__dont, [data-verdict='dont']"));
  const label = (el) => (el.closest("[data-audit-label]")?.getAttribute("data-audit-label") ?? el.closest(".pe-card")?.querySelector("h3")?.textContent ?? el.closest(".platform-example-panel")?.querySelector("h2")?.textContent ?? (el.closest(".official-portal-root") ? "overlay" : "page")).trim().slice(0, 40);
  const describe = (el) => `${el.tagName.toLowerCase()}${typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).filter((c) => !/^zen-type-/.test(c)).slice(0, 2).join(".") : ""}`;
  const px = (v) => parseFloat(v) || 0;
  const flat = (el) => /^(inline|contents)$/.test(getComputedStyle(el).display);
  // Example frames are not the text's box: content escaping them is the platform `overflow` check's business.
  const FRAME = ".pe-card__stage, .pe-card__preview, .platform-example-row";
  const SKIP = "svg, .zen-chart__svg, .platform-code, pre, textarea, select, option, .zen-skeleton, .zen-visually-hidden:not(:focus-within), [data-audit-skip-quality]";
  // A control owns its label: the walk climbs from a label span to its Segmented item, chip or tab, never past it.
  const CONTROL = "button, a[href], label, summary, [role='button'], [role='tab'], [role='option'], [role='menuitem'], [role='menuitemradio'], [role='menuitemcheckbox'], [role='switch'], [role='checkbox'], [role='radio'], [role='link'], .zen-chip, .zen-badge, .zen-tag";
  const BLOCK = /^(block|inline-block|list-item|flow-root|table-cell|table-caption)$/; // text-overflow works on block containers only
  const shown = (el) => { const s = getComputedStyle(el); return s.visibility !== "hidden" && s.display !== "none" && px(s.opacity) > 0.05; };
  const srOnly = (el) => { for (let a = el; a && a !== document.body; a = a.parentElement) { const r = a.getBoundingClientRect(); const s = getComputedStyle(a); if ((r.width <= 1 || r.height <= 1) && s.overflowX !== "visible") return true; if (/inset\(50%/.test(s.clipPath) || /rect\(0px,? 0px,? 0px,? 0px\)/.test(s.clip)) return true; } return false; };
  const turned = (t) => { if (!t || t === "none") return false; if (/matrix3d/.test(t)) return true; const [, b, c] = (t.match(/matrix\(([^)]+)\)/)?.[1] ?? "1,0,0,1").split(",").map(Number); return Math.abs(b) > 1e-3 || Math.abs(c) > 1e-3; };
  // Horizontal extent of a text node: the whole node (cheap), or its words only. The trailing spaces of pre-wrap text hang
  // past the line end by design, so a near miss is measured again word by word.
  const extent = (n, words) => {
    const rg = document.createRange(); let left = Infinity, right = -Infinity;
    const add = () => { for (const q of rg.getClientRects()) if (q.width > 0 && q.height > 0) { left = Math.min(left, q.left); right = Math.max(right, q.right); } };
    if (!words) { rg.selectNodeContents(n); add(); } else for (const m of n.textContent.matchAll(/\S+/g)) { rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length); add(); }
    return left < right ? { left, right } : null;
  };
  const flagged = new Set();
  for (const region of regions) {
    const walker = document.createTreeWalker(region, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent.trim(); const el = n.parentElement;
      if (!text || !el || el.closest(SKIP) || !shown(el)) continue;
      // A pure-emoji run: its glyph width comes from the platform's colour-emoji font (Apple, Noto…), 3px wider in the cloud
      // container than on macOS, so the same 32px picker cell "overflows" on one machine only. Not a layout finding.
      if (/^[\p{Extended_Pictographic}\p{Emoji_Component}\uFE0F\u200D\s]+$/u.test(text) && !/^[\d#*\s]+$/.test(text)) continue;
      let ext = extent(n, false), exact = false, words = null;
      if (!ext) continue;
      // The text's own boxes: its block, then wrappers that hold nothing but this label, up to the control that owns it.
      for (let a = el, depth = 0; a && depth < 8; depth++) {
        if (a.matches(FRAME)) break;
        if (flat(a)) { if (a === region) break; a = a.parentElement; continue; }
        const s = getComputedStyle(a);
        if (turned(s.transform) || !s.writingMode.startsWith("horizontal")) break;
        const r = a.getBoundingClientRect(); const k = a.offsetWidth ? r.width / a.offsetWidth : 1;  // phone frames scale
        const inL = r.left + px(s.borderLeftWidth) * k, inR = r.right - px(s.borderRightWidth) * k;      // padding box
        const cL = inL + px(s.paddingLeft) * k, cR = inR - px(s.paddingRight) * k;                      // content box
        const past = () => Math.max(0, cL - ext.left) + Math.max(0, ext.right - cR);
        let over = past();
        if (over > k && !exact) { ext = extent(n, true) ?? ext; exact = true; over = past(); }
        const clips = s.overflowX !== "visible";
        if (over > k) {
          if (["auto", "scroll"].includes(s.overflowX)) break;                                  // it scrolls
          if (clips && s.textOverflow === "ellipsis" && BLOCK.test(s.display)) break;           // it ellipsizes
          if ([s.maskImage, s.webkitMaskImage].some((m) => m && m !== "none")) break;           // it fades out
          if (clips && (ext.right <= inL || ext.left >= inR)) break;                            // moved out of view on purpose
          if (flagged.has(a) || srOnly(a)) break;
          flagged.add(a);
          const where = `${label(a)}: "${text.slice(0, 24)}" (${describe(a)})`;
          const beyond = ext.left < inL - k || ext.right > inR + k;                             // past the padding too
          const why = !beyond ? "fills its padding" : !clips ? "spills out of it" : s.textOverflow === "ellipsis"
            ? "is cut off: text-overflow: ellipsis does nothing on a flex or grid container, set it on the text's own block"
            : "is cut off with no ellipsis";
          out.where.push(where);
          out.fit.push(`${where} is ${Math.round(over / k)}px wider than its box and ${why} — give it room (flex-shrink: 0 / min-width: auto), wrap, ellipsize, or scroll the row`);
          break;
        }
        if (clips) ext = { left: Math.max(ext.left, inL), right: Math.min(ext.right, inR) };
        // A floating layer (tooltip bubble, corner badge) places itself: its parent's box is not its room.
        if (a === region || a.matches(CONTROL) || ["absolute", "fixed"].includes(s.position)) break;
        // Climb on only while the next box wraps this label and nothing else (a cell around a pill). A box holding other
        // text is a layout container: its children sit side by side and do not overlap.
        words ??= a.textContent.trim();
        let p = a.parentElement;
        while (p && p !== region && flat(p)) p = p.parentElement;
        if (!p || (!p.matches(CONTROL) && p.textContent.trim() !== words)) break;
        a = p;
      }
    }
  }
  return out;
}

/**
 * Widget layout (the user's review 2026-10-16): `card-gap` — a MetricCard or ChartCard stretched by its row (siblings of
 * one parent at the same top and height) whose content stops 12px or more above its foot while a neighbour's reaches
 * its own (within 4px); `legend-column` — a chart legend of three or more items one per line, under or over its chart
 * with nothing beside it, in a box wide enough for two items side by side (it should wrap as a row); `toolbar-search` —
 * a Search wider than 240px in a toolbar row, beside other controls (the user 2026-10-24), at a desktop or tablet width.
 */
export function widgetLayout({ scopeSel, regionSel }) {
  const out = { "card-gap": [], "legend-column": [], "toolbar-search": [] };
  const scope = scopeSel ? document.querySelector(scopeSel) : document;
  if (!scope) return out;
  const REGION = regionSel ?? ".pe-card__stage, .platform-example-panel .platform-example-row, .official-portal-root > *";
  const regions = [...(scope.matches?.(REGION) ? [scope] : []), ...scope.querySelectorAll(REGION)]
    .filter((r) => !r.closest(".platform-guideline-visual__dont, [data-verdict='dont']"));
  const label = (el) => (el.closest("[data-audit-label]")?.getAttribute("data-audit-label") ?? el.closest(".pe-card")?.querySelector("h3")?.textContent ?? el.closest(".platform-example-panel")?.querySelector("h2")?.textContent ?? (el.closest(".official-portal-root") ? "overlay" : "page")).trim().slice(0, 40);
  const px = (v) => parseFloat(v) || 0;
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && px(s.opacity) > 0.05 && !el.closest(".zen-visually-hidden, [data-audit-skip-quality]"); };
  const scaleOf = (el) => (el.offsetHeight ? el.getBoundingClientRect().height / el.offsetHeight : 1);
  const titleOf = (card) => (card.querySelector("h1, h2, h3, h4, h5, h6, [class*='__title'], [class*='__label']")?.textContent ?? "").trim().slice(0, 28);
  // The lowest painted content of a card: leaves (no element children), pictures and boxes with their own text.
  const contentBottom = (card) => {
    let bottom = -Infinity;
    for (const el of card.querySelectorAll("*")) {
      if (el.closest(".zen-card__sub-action") || !(el.children.length === 0 || el.matches("svg, img, canvas") || [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))) continue;
      if (el.closest("svg") && !el.matches("svg")) continue;
      if (!visible(el)) continue;
      bottom = Math.max(bottom, el.getBoundingClientRect().bottom);
    }
    return bottom;
  };
  const seen = new Set();
  for (const region of regions) {
    const cards = [...region.querySelectorAll(".zen-metric-card, .zen-chart-card")].filter((c) => !seen.has(c) && visible(c));
    const rows = new Map();
    for (const card of cards) {
      seen.add(card);
      const r = card.getBoundingClientRect();
      const key = card.parentElement;
      const row = rows.get(key) ?? rows.set(key, []).get(key);
      row.push({ card, top: r.top, height: r.height });
    }
    for (const row of rows.values()) {
      // Stretched siblings: one top, one height (a row of a grid or flex line).
      const lines = [];
      for (const item of row) { const line = lines.find((l) => Math.abs(l[0].top - item.top) <= 1 && Math.abs(l[0].height - item.height) <= 1); if (line) line.push(item); else lines.push([item]); }
      for (const line of lines) {
        if (line.length < 2) continue;
        const slack = line.map(({ card }) => {
          const k = scaleOf(card); const r = card.getBoundingClientRect(); const s = getComputedStyle(card);
          const foot = r.bottom - (px(s.paddingBottom) + px(s.borderBottomWidth)) * k;
          return { card, gap: (foot - contentBottom(card)) / k };
        });
        const least = Math.min(...slack.map((x) => x.gap));
        if (least > 4) continue;
        for (const { card, gap } of slack) if (gap >= 12) {
          const kind = card.matches(".zen-metric-card") ? "MetricCard" : "ChartCard";
          out["card-gap"].push(`${label(card)}: ${kind} "${titleOf(card)}" stops ${Math.round(gap)}px above its foot beside a card that fills the row — let its content fill the card (a ChartCard grows its chart, a MetricCard keeps its marks at the foot), or let the row's cards hug`);
        }
      }
    }
    for (const legend of region.querySelectorAll(".zen-chart__legend")) {
      if (!visible(legend)) continue;
      const items = [...legend.children].filter(visible);
      if (items.length < 3) continue;
      const rects = items.map((i) => i.getBoundingClientRect());
      if (new Set(rects.map((q) => Math.round(q.top))).size !== items.length) continue;          // not one per line
      if (Math.max(...rects.map((q) => q.left)) - Math.min(...rects.map((q) => q.left)) > 2) continue;
      const block = legend.closest(".zen-chart-block");
      if (!block) continue;
      let unit = legend; while (unit.parentElement && unit.parentElement !== block) unit = unit.parentElement;
      const L = unit.getBoundingClientRect();
      const beside = [...block.children].some((c) => c !== unit && visible(c) && (() => { const q = c.getBoundingClientRect(); return q.top < L.bottom - 1 && q.bottom > L.top + 1; })());
      if (beside) continue;
      const k = scaleOf(block);
      const widest = Math.max(...rects.map((q) => q.width)) / k;
      if (block.getBoundingClientRect().width / k < 2 * widest + 8) continue;                   // no room for a row
      out["legend-column"].push(`${label(legend)}: a chart legend stacks its ${items.length} items in a column under its chart with room for a row — let it wrap as a row (Figma auto layout Wrap)`);
    }
    // toolbar-search: a Search in a toolbar row is at most 240px wide (the user 2026-10-24). Its cell is the outermost
    // wrapper that holds only the Search; the row is the cell's parent laid out as a flex row or a grid, with a control
    // beside the cell on the same line. Phone searches fill their row, and the bars that size their own Search are left
    // out: an app's top bar (≤ 400, Figma Nav-Center-Block) and DashboardHeader's Control-Bar (320, Figma; BACKLOG).
    if (innerWidth < 768) continue;
    const SKIP_SEARCH = ".platform-phone, [data-breakpoint='mobile'], .zen-top-navigation, .zen-app-shell-header__bar, .zen-dashboard-header__search, .zen-dashboard-header__center, .platform-guideline-visual__dont, [data-verdict='dont'], [data-audit-skip-quality]";
    const CONTROL = "button, a[href], input, select, textarea, [role='button'], [role='radio'], [role='tab'], [role='combobox'], [role='switch'], [role='checkbox']";
    for (const search of region.querySelectorAll(".zen-search:not(.zen-search--rounded):not(.zen-search--popover)")) {
      if (!visible(search) || search.closest(SKIP_SEARCH)) continue;
      let cell = search;
      while (cell.parentElement && cell.parentElement !== region && [...cell.parentElement.children].filter(visible).length === 1) cell = cell.parentElement;
      const row = cell.parentElement, rs = row && getComputedStyle(row);
      if (!rs || !((rs.display.includes("flex") && rs.flexDirection.startsWith("row")) || rs.display.includes("grid"))) continue;
      const C = cell.getBoundingClientRect();
      const beside = [...row.children].find((c) => c !== cell && visible(c) && (c.matches(CONTROL) || c.querySelector(CONTROL)) && (() => { const q = c.getBoundingClientRect(); return q.top < C.bottom - 1 && q.bottom > C.top + 1; })());
      if (!beside) continue;
      const width = search.getBoundingClientRect().width / scaleOf(search);
      if (width <= 240.5) continue;
      const name = search.querySelector("input")?.getAttribute("aria-label") || search.querySelector("input")?.getAttribute("placeholder") || "Search";
      out["toolbar-search"].push(`${label(search)}: the toolbar Search "${name.slice(0, 28)}" is ${Math.round(width)}px wide beside other controls — a toolbar Search is at most 240px: wrap it in <Box width="fill" maxWidth={240}>, or give it a Grid column minmax(0, 240px)`);
    }
  }
  return out;
}

/**
 * Control reach (`clip`, BACKLOG "fit follow-ups", the user 2026-10-24): a control that fits its own text but cannot be
 * seen whole where it stands. `overflow` skips anything inside a clipping ancestor and `fit` measures text against its
 * own box, so neither sees these:
 *   - cut off: an `overflow: hidden | clip` (or `contain: paint`) ancestor hides part of it (a `flex-shrink: 0`
 *     Segmented in a clipping row loses the end of its last item);
 *   - hidden: it lies wholly past that edge while a sibling control of the same parent shows (the items after it);
 *   - covered: the middle of what shows of it is under another element of the example (a docked Side Panel over a card).
 *
 * Not reported: what a scroll container (`auto` / `scroll`) hides, since it scrolls into view; a device frame's bottom
 * edge (a phone screen shows the top of a longer page); a group hidden as a whole (a collapsed accordion); covers that
 * are floating layers (dialogs, menus, listboxes, popovers, tooltips, toasts, sheets, scrims), invisible hit areas, the
 * control's own label, the docs' chrome, a bar over a scroll container the control scrolls in, or a sticky or fixed
 * layer the content scrolls under (the first full run, 2026-10-24: all 137 covers were bottom bars, ActionBars,
 * headers and Gantt / Schedule label columns); `data-audit-skip-quality`.
 *
 * It scrolls the window to sample each control's middle with elementFromPoint, then scrolls it back.
 */
export function controlClip({ scopeSel, regionSel }) {
  const out = { clip: [] };
  const scope = scopeSel ? document.querySelector(scopeSel) : document;
  if (!scope) return out;
  const REGION = regionSel ?? ".pe-card__stage, .platform-example-panel .platform-example-row, .official-portal-root > *";
  const regions = [...(scope.matches?.(REGION) ? [scope] : []), ...scope.querySelectorAll(REGION)]
    .filter((r) => !r.closest(".platform-guideline-visual__dont, [data-verdict='dont']"));
  const label = (el) => (el.closest("[data-audit-label]")?.getAttribute("data-audit-label") ?? el.closest(".pe-card")?.querySelector("h3")?.textContent ?? el.closest(".platform-example-panel")?.querySelector("h2")?.textContent ?? (el.closest(".official-portal-root") ? "overlay" : "page")).trim().slice(0, 40);
  const describe = (el) => `${el.tagName.toLowerCase()}${typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).filter((c) => !/^zen-type-/.test(c)).slice(0, 2).join(".") : ""}`;
  const px = (v) => parseFloat(v) || 0;
  const CONTROL = "button, a[href], summary, input:not([type='hidden']), select, textarea, [role='button'], [role='tab'], [role='option'], [role='menuitem'], [role='menuitemradio'], [role='menuitemcheckbox'], [role='switch'], [role='checkbox'], [role='radio'], [role='link']";
  const SKIP = "[aria-hidden='true'], [inert], .zen-visually-hidden:not(:focus-within), [data-audit-skip-quality]";
  const FLOATING = "[role='dialog']:not(.pe-card), [role='alertdialog'], [aria-modal='true'], [role='menu'], [role='listbox'], [role='tooltip'], .zen-popover, .zen-toast, .zen-bottom-sheet, [class*='scrim'], [class*='backdrop']";
  const FRAME = ".platform-phone, .pe-chat-desktop, .pf-app-frame";
  const shown = (el) => { const s = getComputedStyle(el); return s.visibility !== "hidden" && s.display !== "none"; };
  const opaque = (el) => { for (let a = el; a && a !== document.body; a = a.parentElement) if (px(getComputedStyle(a).opacity) <= 0.05) return false; return true; };
  const nameOf = (el) => (el.getAttribute("aria-label") || el.textContent || el.getAttribute("value") || el.getAttribute("placeholder") || "").replace(/\s+/g, " ").trim().slice(0, 24);
  // What shows of `el`: its box cut by every clipping ancestor below the region, and the first ancestor that hides part of
  // it without scrolling (a frame's bottom edge aside), with the nearest scroll container (covers above it scroll by).
  const reach = (el, region) => {
    const r = el.getBoundingClientRect(); const k = el.offsetWidth ? r.width / el.offsetWidth : 1;
    const vis = { l: r.left, r: r.right, t: r.top, b: r.bottom };
    let cutBy = null, hidden = 0, axis = "", scroller = null;
    for (let a = el.parentElement; a && a !== region && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      const paint = /\b(paint|strict|content)\b/.test(s.contain);
      const clipX = s.overflowX !== "visible" || paint, clipY = s.overflowY !== "visible" || paint;
      if (!clipX && !clipY) continue;
      const scrollX = /auto|scroll/.test(s.overflowX), scrollY = /auto|scroll/.test(s.overflowY);
      if (scrollX || scrollY) scroller ??= a;
      const q = a.getBoundingClientRect(); const ka = a.offsetWidth ? q.width / a.offsetWidth : 1;
      const box = { l: q.left + px(s.borderLeftWidth) * ka, r: q.right - px(s.borderRightWidth) * ka, t: q.top + px(s.borderTopWidth) * ka, b: q.bottom - px(s.borderBottomWidth) * ka };
      const w = Math.max(0, vis.r - vis.l), h = Math.max(0, vis.b - vis.t);
      if (clipX) { vis.l = Math.max(vis.l, box.l); vis.r = Math.min(vis.r, box.r); }
      if (clipY) { vis.t = Math.max(vis.t, box.t); vis.b = Math.min(vis.b, box.b); }
      if (cutBy) continue;
      const hidX = clipX && !scrollX ? w - Math.max(0, vis.r - vis.l) : 0;
      const hidY = clipY && !scrollY && !a.matches(FRAME) ? h - Math.max(0, vis.b - vis.t) : 0;
      if (Math.max(hidX, hidY) > 2 * k) { cutBy = a; hidden = Math.max(hidX, hidY) / k; axis = hidX >= hidY ? "x" : "y"; }
    }
    return { vis, area: Math.max(0, vis.r - vis.l) * Math.max(0, vis.b - vis.t), cutBy, hidden, axis, scroller, k };
  };
  const candidates = [];
  for (const region of regions) {
    for (const el of region.querySelectorAll(CONTROL)) {
      if (el.closest(SKIP) || !shown(el) || !opaque(el)) continue;
      // A control inside another (a chip's remove button) is the outer one's business.
      const outer = el.parentElement?.closest(CONTROL);
      if (outer && region.contains(outer)) continue;
      const r = el.getBoundingClientRect(); if (r.width <= 2 || r.height <= 2) continue;
      candidates.push({ el, region, ...reach(el, region) });
    }
  }
  const flagged = new Set();
  const say = (el, msg) => { if (flagged.has(el)) return; flagged.add(el); if (!out.clip.includes(msg)) out.clip.push(msg); };
  for (const c of candidates) {
    if (!c.cutBy) continue;
    const what = `${label(c.el)}: ${describe(c.el)} "${nameOf(c.el)}"`;
    if (c.area > 0) { say(c.el, `${what} is cut off by ${describe(c.cutBy)} (${Math.round(c.hidden)}px of it hidden, ${c.axis === "x" ? "across" : "down"}) — give it room (flex-shrink / min-width), wrap the row, or let it scroll`); continue; }
    const siblings = candidates.filter((o) => o !== c && o.el.parentElement === c.el.parentElement);
    if (siblings.some((o) => o.area > 0)) say(c.el, `${what} is hidden past the edge of ${describe(c.cutBy)} while ${siblings.filter((o) => o.area > 0).length} of its siblings show — give the row room, wrap it, or let it scroll`);
  }
  // Covered: sample the middle of what shows, top to bottom, scrolling the window to it.
  const startX = scrollX, startY = scrollY;
  const pageY = (c) => (c.vis.t + c.vis.b) / 2 + scrollY;
  const order = candidates.filter((c) => c.area > 4 && !flagged.has(c.el)).map((c) => ({ c, y: pageY(c) })).sort((a, b) => a.y - b.y);
  for (const { c } of order) {
    let at = reach(c.el, c.region);
    let x = (at.vis.l + at.vis.r) / 2, y = (at.vis.t + at.vis.b) / 2;
    if (y < 96 || y > innerHeight - 24) { scrollBy(0, y - innerHeight / 2); at = reach(c.el, c.region); x = (at.vis.l + at.vis.r) / 2; y = (at.vis.t + at.vis.b) / 2; }
    if (at.area <= 4 || x < 0 || x > innerWidth || y < 0 || y > innerHeight) continue;
    const hit = document.elementFromPoint(x, y);
    if (!hit || hit === c.el || c.el.contains(hit) || hit.contains(c.el)) continue;
    // Only another element of an example (or an overlay layer), never the docs' own bars.
    if (!hit.closest(REGION) && !hit.closest(".official-portal-root")) continue;
    if (hit.closest(FLOATING) || hit.closest(SKIP) || !opaque(hit)) continue;
    if (hit.closest("label") && hit.closest("label").control === c.el) continue;
    // A bar over a scroll container: what scrolls under it is reached by scrolling. So is what passes under a sticky or
    // fixed layer (an AppShell's bottom bar, a docked ActionBar, a header, a Gantt's label column): that layer stays put
    // while the content scrolls.
    if (at.scroller && !at.scroller.contains(hit)) continue;
    let pinned = false;
    for (let a = hit; a && !a.contains(c.el); a = a.parentElement) if (/^(sticky|fixed)$/.test(getComputedStyle(a).position)) { pinned = true; break; }
    if (pinned) continue;
    say(c.el, `${label(c.el)}: ${describe(c.el)} "${nameOf(c.el)}" is covered by ${describe(hit)} — it cannot be seen or pressed there`);
  }
  scrollTo(startX, startY);
  return out;
}

/**
 * Segmented on a phone (`segmented-fit`, warn; segmented guideline, the user 2026-10-24 from the harness inventory): on a
 * phone a Segmented is used only when every label fits its equal share. It reports one that slides sideways (its items
 * are wider than the screen gives them) or a `fullWidth` one that cuts a label to an ellipsis: both want a single-choice
 * row of Normal Chips that scrolls. A phone is a viewport under 768px or a docs phone frame (`.platform-phone`).
 * A Segmented with `options` turns into that chip row by itself on a phone (Segmented.tsx, 2026-10-24), so what is left
 * here is one it cannot turn (segments drawn as children, icon-only segments, counters) or one outside a phone
 * breakpoint. `data-audit-skip-quality` opts one out.
 */
export function segmentedFit({ scopeSel, regionSel }) {
  const out = { "segmented-fit": [] };
  const scope = scopeSel ? document.querySelector(scopeSel) : document;
  if (!scope) return out;
  const REGION = regionSel ?? ".pe-card__stage, .platform-example-panel .platform-example-row, .official-portal-root > *";
  const regions = [...(scope.matches?.(REGION) ? [scope] : []), ...scope.querySelectorAll(REGION)]
    .filter((r) => !r.closest(".platform-guideline-visual__dont, [data-verdict='dont']"));
  const label = (el) => (el.closest("[data-audit-label]")?.getAttribute("data-audit-label") ?? el.closest(".pe-card")?.querySelector("h3")?.textContent ?? el.closest(".platform-example-panel")?.querySelector("h2")?.textContent ?? (el.closest(".official-portal-root") ? "overlay" : "page")).trim().slice(0, 40);
  const shown = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && !el.closest("[aria-hidden='true'], [inert]"); };
  const seen = new Set();
  for (const region of regions) {
    for (const seg of region.querySelectorAll(".zen-segmented")) {
      if (seen.has(seg) || !shown(seg) || seg.closest("[data-audit-skip-quality]")) continue;
      seen.add(seg);
      if (innerWidth >= 768 && !seg.closest(".platform-phone")) continue;
      const items = [...seg.querySelectorAll(".zen-segmented__item")].filter((item) => item.closest(".zen-segmented") === seg);
      const name = `Segmented "${seg.getAttribute("aria-label") ?? ""}"`;
      const fix = "use a single-choice row of Normal Chips that scrolls (segmented guideline: on a phone every label fits its equal share)";
      if (seg.scrollWidth > seg.clientWidth + 1) {
        // No px in the message: it is a baseline key, and text widths move with fonts.
        out["segmented-fit"].push(`${label(seg)}: ${name} slides sideways on a phone (its ${items.length} items are wider than the screen gives them) — ${fix}`);
        continue;
      }
      const cut = [...seg.querySelectorAll(".zen-segmented__label")].filter((l) => l.closest(".zen-segmented") === seg && shown(l) && l.scrollWidth > l.clientWidth + 1);
      if (cut.length) out["segmented-fit"].push(`${label(seg)}: ${name} cuts ${cut.length} of its ${items.length} labels on a phone ("${cut[0].textContent.trim().slice(0, 20)}"${cut.length > 1 ? " and more" : ""}) — ${fix}`);
    }
  }
  return out;
}
