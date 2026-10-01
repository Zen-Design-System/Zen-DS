#!/usr/bin/env node
/**
 * Zen DS platform QA audit (Playwright). Walks every Codebase Platform page and reports:
 *   errors      console errors / uncaught exceptions (HMR noise ignored)
 *   overflow    page horizontal scroll, and elements escaping an example stage / playground preview
 *   images      broken <img>
 *   names       interactive elements without an accessible name
 *   ids         duplicate ids (breaks aria-labelledby / label[for])
 *   nesting     interactive elements nested inside buttons / links
 *   targets     (mobile) pointer targets smaller than 24×24 (WCAG 2.5.8)
 *   contrast    visible text below 3:1 against its composited background (placeholders/disabled skipped)
 *   surfaces    a Surface/Default box whose backdrop is a Canvas/Alt page (the same colour) without a closed border (§11)
 *   sizes       a fixed-size visual (Avatar, Dock Icon, Icon) rendered off its declared size or out of square — stretched by a layout rule
 *   edges       text closer than 8px (sides) / 4px (top, bottom) to the inner edge of the box that visibly holds it — missing padding
 *   outline     heading outline per example (Typography › Content hierarchy): more than one h1 on a page (each phone frame is
 *               its own screen), a skipped level going down (h1 → h3), or a heading larger than the heading it sits under
 *               (inside one layer: the TopNavigation bar title, overlays and Sidebar/Drawer compare only within themselves)
 *   outline-*   (--quality, warn; --no-outline turns them off) page-like regions (screen:true examples, phone frames) without exactly one h1 (outline-h1) or whose
 *               outline does not start at it (outline-start); a heading inside a card larger than the card's title
 *               (outline-card); same-level sibling headings of one kind in different styles (outline-siblings)
 *   device      chat pieces that do not match their frame: a desktop ChatThread / ChatComposer in the phone, a mobile one in
 *               a desktop window (.pe-chat-desktop), chat examples outside any device frame, or the mobile hold on desktop
 *   typography  preview, guideline Do/Don't or portalled-overlay text (Dialog, Side Panel, Toast…) resolving the shell's Zen-Platform typography
 *               (TASA Explorer, looser heading tracking) instead of the preview's data-typography (Dashboard by default)
 *   playground  every Select option and Toggle in each playground, one axis at a time, re-running the checks
 *   smoke       (--smoke) clicks every button inside every example card once, then Escape; when the click opens a floating
 *               Popover it also hovers just beside and below it and fails if anything (e.g. a neighbouring message) paints over it
 *
 * Build-QA checks (opt-in; tools/platform-audit/quality-checks.mjs, run by `npm run qa`):
 *   scale       (--quality) text that is no Zen text style; example markup with padding / gap / radius / colour off the tokens
 *   roles       (--quality, warn) example markup using a token in the wrong role (background token as text colour…)
 *   hierarchy   (--quality) a content h1 ≠ Heading/1 (bar title and overlay titles exempt), an h2/h3 Heading/* smaller than
 *               the body text under it, an overlay title styled Heading/1
 *   rhythm      (--quality, warn) flat title/description, title not Strongest, other headings smaller than their body
 *               text (group headers exempt), visual headings, > 7 text styles, non-concentric nested corners, list rows
 *               inset twice
 *   density     (--density) Zen elements outgrown by their content, and new overflow/size/edge errors, at Comfortable
 *   fit         (--quality) text wider than its own box with no ellipsis and no scroll: it runs into its neighbours or is
 *               cut off, even inside an `overflow: hidden` ancestor (which `overflow` skips). With --density also at
 *               Comfortable ("at Comfortable: …")
 * These six are compared with tools/platform-audit/quality-baseline.json: pre-existing findings are listed as baseline and
 * do not fail the run; `--baseline-update` rewrites the entries of the pages and viewports in this run, and
 * `--baseline-update=fit` (a comma list of kinds) only those kinds — seed a new check without accepting the other kinds'
 * current findings (a peer's work in progress) as debt.
 * `--css=<file>` injects a stylesheet into every page before the checks: re-create a fixed bug (the old CSS) to prove a
 * check catches it, without editing the shared tree. It cannot be combined with --baseline-update.
 *
 * Usage:
 *   node tools/platform-audit/audit.mjs [--url=http://localhost:5173] [--pages=button,chip] [--viewports=1512,390]
 *                                       [--dark] [--no-playground] [--smoke] [--quality] [--density] [--out=report.json]
 *                                       [--baseline-update[=kinds]] [--no-baseline] [--css=file]
 * Exit code 1 when any error-level finding exists. See docs/qa/platform-audit.md and docs/qa/build-qa-process.md.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { qualityChecks, densitySnapshot, textFit } from "./quality-checks.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const require = createRequire(path.join(root, "package.json"));
const { chromium } = require("playwright");

const arg = (name, fallback) => { const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`)); if (!hit) return fallback; return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true; };
const BASE = String(arg("url", "http://localhost:5173")).replace(/\/$/, "");
const VIEWPORTS = String(arg("viewports", "1512,390")).split(",").map(Number);
const DARK = Boolean(arg("dark", false));
const PLAYGROUND = !arg("no-playground", false);
const SMOKE = Boolean(arg("smoke", false));
const OUT = arg("out", null);
const QUALITY = Boolean(arg("quality", false));
const DENSITY = Boolean(arg("density", false));
const BASELINE_FILE = path.join(root, "tools/platform-audit/quality-baseline.json");
// Motion (2026-10-01): reduced motion keeps fades (tokens/source/motion.json sets only the movement to 0), so every
// animation and transition is frozen at its end state: the checks read final colours, sizes and positions.
const FREEZE_MOTION = "*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }";
// The freeze stylesheet goes in on every document load (an init script), so a Vite HMR full reload from another session
// cannot drop it mid-check.
const freezeMotionInit = (css) => {
  const add = () => { if (document.getElementById("zen-freeze-motion")) return; const s = document.createElement("style"); s.id = "zen-freeze-motion"; s.textContent = css; (document.head ?? document.documentElement).appendChild(s); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add, { once: true }); else add();
};
const BASELINE_UPDATE = arg("baseline-update", false); // true, or a comma list of kinds to rewrite
// The outline-* warnings (2026-09-29) run by default since their baseline was seeded (2026-09-30); --no-outline turns
// them off. --outline is still accepted.
const OUTLINE = !arg("no-outline", false);
const OUTLINE_KINDS = ["outline-h1", "outline-start", "outline-card", "outline-siblings"];
const BASELINED = ["scale", "roles", "hierarchy", "rhythm", "density", "fit", "contrast", "targets", "outline-h1", "outline-start", "outline-card", "outline-siblings"]; // contrast, targets and outline-* stay warnings; baselined so only NEW ones are listed
const CSS = arg("css", null) ? fs.readFileSync(path.resolve(String(arg("css"))), "utf8") : null;
if (CSS && BASELINE_UPDATE) { console.error("--css cannot be combined with --baseline-update: the injected CSS is not the page's real state."); process.exit(2); }
const baseline = arg("no-baseline", false) ? {} : (() => { try { return JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8")).keys ?? {}; } catch { return {}; } })();

/** Every page id the platform routes to (component nav + app-layer pages + foundations). */
function allPages() {
  const src = fs.readFileSync(path.join(root, "src/platform/PlatformApp.tsx"), "utf8");
  const nav = src.slice(src.indexOf("const componentNavigation"), src.indexOf("];", src.indexOf("const componentNavigation")));
  const ids = [...nav.matchAll(/id:\s*"([\w-]+)"/g)].map((m) => m[1]);
  // App-layer pages (Layout, Text, Form, Templates…) are registered from src/platform/appLayer, not componentNavigation.
  const appLayer = fs.readFileSync(path.join(root, "src/platform/appLayer/types.ts"), "utf8").match(/appLayerPageIds\s*=\s*\[([^\]]*)\]/)?.[1] ?? "";
  const layerIds = [...appLayer.matchAll(/"([\w-]+)"/g)].map((m) => m[1]);
  return ["overviews", "installation", "design-tokens", "typography", "iconography", ...[...new Set([...ids, ...layerIds])].sort()];
}
const PAGES = arg("pages", null) ? String(arg("pages")).split(",") : allPages();

const IGNORED_CONSOLE = /\[vite\]|Download the React DevTools|favicon|ResizeObserver loop/i;

/** In-page checks, scoped to `scopeSel` (defaults to the whole platform). Runs in the browser. */
function pageChecks({ scopeSel, mobile }) {
  const out = { overflow: [], images: [], names: [], ids: [], nesting: [], targets: [], contrast: [], surfaces: [], edges: [], sizes: [], typography: [], device: [], outline: [], "outline-h1": [], "outline-start": [], "outline-card": [], "outline-siblings": [] };
  const scope = scopeSel ? document.querySelector(scopeSel) : document;
  if (!scope) return out;
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && !el.closest("[aria-hidden='true'], [inert], .zen-visually-hidden:not(:focus-within)"); };
  const label = (el) => (el.closest("[data-audit-label]")?.getAttribute("data-audit-label") ?? el.closest(".pe-card")?.querySelector("h3")?.textContent ?? el.closest(".platform-example-panel")?.querySelector("h2")?.textContent ?? "page").trim().slice(0, 40);
  const describe = (el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;

  // Overflow: children escaping a stage/preview horizontally (scroll containers and fixed layers excluded).
  const stages = scope.querySelectorAll(".pe-card__stage, .platform-example-panel .platform-example-row, .platform-guideline-visual, [class*='pgv-'][class*='preview']");
  for (const stage of stages) {
    // A preview that deliberately scrolls horizontally (desktop-only patterns on phones) is not an overflow.
    if (["auto", "scroll"].includes(getComputedStyle(stage).overflowX)) continue;
    const sr = stage.getBoundingClientRect();
    if (stage.scrollWidth > stage.clientWidth + 1 && !["auto", "scroll"].includes(getComputedStyle(stage).overflowX)) out.overflow.push(`${label(stage)}: stage scrolls (${stage.scrollWidth} > ${stage.clientWidth})`);
    for (const el of stage.querySelectorAll("*")) {
      if (!visible(el)) continue;
      const s = getComputedStyle(el);
      if (s.position === "fixed") continue;
      let clipped = false;
      for (let p = el.parentElement; p && p !== stage; p = p.parentElement) { const ps = getComputedStyle(p); if (["auto", "scroll", "hidden", "clip"].includes(ps.overflowX)) { clipped = true; break; } }
      if (clipped) continue;
      const r = el.getBoundingClientRect();
      if (r.right > sr.right + 2 || r.left < sr.left - 2) { out.overflow.push(`${label(el)}: ${describe(el)} escapes by ${Math.round(Math.max(r.right - sr.right, sr.left - r.left))}px`); break; }
    }
  }
  // Broken images.
  for (const img of scope.querySelectorAll("img")) if (img.complete && img.naturalWidth === 0 && visible(img)) out.images.push(`${label(img)}: ${img.getAttribute("src")?.slice(0, 60)}`);
  // Accessible names.
  const nameOf = (el) => {
    if (el.getAttribute("aria-label")?.trim()) return el.getAttribute("aria-label");
    const lb = el.getAttribute("aria-labelledby"); if (lb) return lb.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim();
    if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l?.textContent.trim()) return l.textContent; }
    const wrap = el.closest("label"); if (wrap?.textContent.trim()) return wrap.textContent;
    if (el.getAttribute("title")) return el.getAttribute("title");
    const text = [...el.childNodes].map((n) => n.nodeType === 3 ? n.textContent : n.nodeType === 1 && !n.closest("[aria-hidden='true']") ? (n.getAttribute?.("alt") ?? n.textContent) : "").join("").trim();
    return text;
  };
  for (const el of scope.querySelectorAll("button, a[href], [role='button'], [role='tab'], [role='option'], [role='switch'], [role='checkbox'], [role='radio'], input:not([type='hidden']), select, textarea")) {
    if (!visible(el) || el.closest("[aria-hidden='true']")) continue;
    if (!nameOf(el)?.trim()) out.names.push(`${label(el)}: ${describe(el)}`);
  }
  // Duplicate ids.
  const seen = new Map();
  for (const el of scope.querySelectorAll("[id]")) seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
  for (const [id, n] of seen) if (n > 1) out.ids.push(`#${id} ×${n}`);
  // Interactive nesting.
  for (const el of scope.querySelectorAll("button button, button a[href], a[href] button, a[href] a[href], button input, button select")) out.nesting.push(`${label(el)}: ${describe(el)} inside ${describe(el.parentElement.closest("button, a"))}`);
  // Mobile pointer targets.
  if (mobile) {
    // Effective hit box = the element plus any absolutely positioned ::before/::after layer (hit-area expanders).
    const hitBox = (el) => {
      const r = el.getBoundingClientRect(); let w = r.width, h = r.height;
      for (const pseudo of ["::before", "::after"]) {
        const ps = getComputedStyle(el, pseudo);
        if (ps.content === "none" || ps.position !== "absolute" || ps.pointerEvents === "none") continue;
        w = Math.max(w, parseFloat(ps.width) || 0); h = Math.max(h, parseFloat(ps.height) || 0);
      }
      return { w, h };
    };
    for (const el of scope.querySelectorAll("button, a[href], [role='button'], input[type='checkbox'], input[type='radio']")) {
      if (!visible(el)) continue;
      // The whole field wrapper is the click target for Select/Date triggers; native inputs under custom marks are hidden.
      if (el.matches(".zen-select__trigger, .zen-input__native") || parseFloat(getComputedStyle(el).opacity) === 0 || getComputedStyle(el).pointerEvents === "none" || el.matches(":disabled")) continue;
      const r = el.getBoundingClientRect(); if (r.width <= 2 || r.height <= 2) continue;
      const { w, h } = hitBox(el);
      if ((w < 24 || h < 24) && !el.closest("p, li > a:only-child") && getComputedStyle(el).display !== "inline") out.targets.push(`${label(el)}: ${describe(el)} ${Math.round(w)}×${Math.round(h)}`);
    }
  }
  // Contrast (text < 3:1 on its composited background).
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r, g, b, a }; };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { const layers = []; for (let p = el; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.backgroundImage !== "none") return null; const c = parse(s.backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let acc = { r: 255, g: 255, b: 255, a: 1 }; for (const l of layers.reverse()) acc = over(l, acc); return acc; };
  const walker = document.createTreeWalker(scope === document ? document.body : scope, NodeFilter.SHOW_TEXT);
  const checked = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement; if (!el || checked.has(el) || !n.textContent.trim() || !visible(el)) continue; checked.add(el);
    // Emoji are colour glyphs: their `color` is irrelevant, so a pure-emoji run is not text contrast.
    if (/^[\p{Extended_Pictographic}\p{Emoji_Component}️‍\s]+$/u.test(n.textContent.trim()) && !/^[\d#*\s]+$/.test(n.textContent.trim())) continue;
    if (el.closest("[disabled], [aria-disabled='true'], [data-state='disabled'], [data-disabled='true'], input, textarea, .zen-skeleton, pre, code, svg, [data-audit-skip-contrast], .zen-chart__svg") || el.closest(".platform-guideline-visual__dont, [data-verdict='dont']")) continue;
    // Labels of disabled controls are exempt (WCAG 1.4.3 "inactive UI component").
    const control = el.closest("label, .zen-checkbox, .zen-radio, .zen-toggle, .zen-field, .zen-input-field, [class*='-field']");
    if (control?.querySelector(":disabled, [aria-disabled='true']")) continue;
    const s = getComputedStyle(el); const fg = parse(s.color); const bg = bgOf(el); if (!fg || !bg) continue;
    const c = over(fg, bg); const L1 = lum(c), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    if (ratio < 3 && parseFloat(s.opacity) > 0.5) out.contrast.push(`${label(el)}: "${n.textContent.trim().slice(0, 24)}" ${ratio.toFixed(2)}:1`);
  }
  // Surfaces (§11): Canvas/Alt and Surface/Default are the same colour, so a Surface/Default box whose backdrop is a Canvas/Alt
  // page needs a closed border (all four sides, an outline or a 0 0 0 Npx ring, on the box or its ::before/::after). A shadow
  // alone does not count. Painters are read from the loaded stylesheets, so the check follows the tokens, not class names.
  const painters = { canvas: [], surface: [] };
  const collect = (rules) => {
    for (const rule of rules) {
      if (rule.selectorText) {
        const t = rule.style?.cssText ?? "";
        if (/background(-color)?\s*:[^;]*--zen-color-background-canvas-alt\b/.test(t)) painters.canvas.push(rule.selectorText);
        if (/background(-color)?\s*:[^;]*--zen-color-background-surface-default\b/.test(t)) painters.surface.push(rule.selectorText);
      }
      if (rule.cssRules?.length) collect(rule.cssRules);
    }
  };
  for (const sheet of document.styleSheets) { try { collect(sheet.cssRules); } catch { /* cross-origin sheet */ } }
  const matchesAny = (el, sels) => sels.some((sel) => { try { return el.matches(sel); } catch { return false; } });
  const ring = (shadow) => shadow !== "none" && shadow.split(/,(?![^()]*\))/).some((layer) => {
    const colour = parse(layer); const lengths = layer.replace(/rgba?\([^)]*\)/g, "").match(/-?[\d.]+px/g)?.map(parseFloat) ?? [];
    return (colour?.a ?? 1) > 0 && lengths.length >= 4 && lengths[0] === 0 && lengths[1] === 0 && lengths[2] === 0 && lengths[3] >= 0.5;
  });
  const framedBy = (s) => ["Top", "Right", "Bottom", "Left"].every((k) => parseFloat(s[`border${k}Width`]) >= 0.5 && s[`border${k}Style`] !== "none" && (parse(s[`border${k}Color`])?.a ?? 0) > 0)
    || (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0 && (parse(s.outlineColor)?.a ?? 0) > 0) || ring(s.boxShadow);
  const framed = (el) => framedBy(getComputedStyle(el)) || ["::before", "::after"].some((p) => { const ps = getComputedStyle(el, p); return ps.content !== "none" && framedBy(ps); });
  if (painters.canvas.length && painters.surface.length) {
    for (const el of scope.querySelectorAll("*")) {
      if (!matchesAny(el, painters.surface) || !visible(el)) continue;
      // Navigation bars are not boxes on the page; they keep their own separators.
      if (el.closest(".zen-top-nav, .zen-bottom-nav, .zen-sidebar, [data-audit-skip-surface]")) continue;
      const own = parse(getComputedStyle(el).backgroundColor); if (!own || own.a < 1) continue;
      const box = el.getBoundingClientRect(); if (box.width < 40 || box.height < 24) continue;
      let host = el.parentElement;
      for (; host; host = host.parentElement) { const c = parse(getComputedStyle(host).backgroundColor); if (c && c.a > 0) break; }
      if (!host || !matchesAny(host, painters.canvas)) continue;
      const hc = parse(getComputedStyle(host).backgroundColor);
      if (Math.abs(hc.r - own.r) + Math.abs(hc.g - own.g) + Math.abs(hc.b - own.b) > 3) continue;
      if (!framed(el)) out.surfaces.push(`${label(el)}: ${describe(el)} on ${describe(host)} has no border`);
    }
  }
  // Edges: text keeps ≥ 8px (left/right) and ≥ 4px (top/bottom) from the inner edge of the box that visibly holds it — the nearest
  // ancestor with its own background colour (different from what is behind it) or a closed frame. Text inside a control is the
  // control's business (buttons, fields, chips, badges, tags … own their padding), so it is skipped.
  const CONTROL = "button, a[href], input, textarea, select, [role='button'], [role='option'], [role='tab'], [role='menuitem'], [role='switch'], .zen-chip, .zen-badge, .zen-tag, .zen-button, .zen-avatar, .zen-dock-icon, .zen-tooltip, th, td, pre, code, svg, mark, .pe-mark, kbd, [data-audit-skip-edges]";
  // A box paints when its composited colour differs from the composited colour behind it (so faint tints like Pale count).
  const paints = (el) => { const c = parse(getComputedStyle(el).backgroundColor); if (!c || c.a === 0) return false; const own = bgOf(el), back = el.parentElement ? bgOf(el.parentElement) : { r: 255, g: 255, b: 255 }; return Boolean(own && back) && Math.abs(back.r - own.r) + Math.abs(back.g - own.g) + Math.abs(back.b - own.b) > 6; };
  const boxOf = (el) => {
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      if (a.matches(".official-platform, .pe-card, .platform-example-panel, .platform-phone, .platform-phone__screen, main")) return null;
      const s = getComputedStyle(a); if (["auto", "scroll"].includes(s.overflowY) || ["auto", "scroll"].includes(s.overflowX)) return null;
      if (paints(a) || framedBy(s)) return a;
    }
    return null;
  };
  const srOnly = (el) => { for (let a = el; a && a !== document.body; a = a.parentElement) { const r = a.getBoundingClientRect(); const cs = getComputedStyle(a); if ((r.width <= 1 || r.height <= 1) && ["hidden", "clip"].includes(cs.overflowX)) return true; if (/inset\(50%/.test(cs.clipPath)) return true; } return false; };
  const seenEdge = new Set();
  const edgeWalker = document.createTreeWalker(scope === document ? document.body : scope, NodeFilter.SHOW_TEXT);
  for (let n = edgeWalker.nextNode(); n; n = edgeWalker.nextNode()) {
    const el = n.parentElement; if (!el || !n.textContent.trim() || !visible(el) || el.closest(CONTROL)) continue;
    // Screen-reader-only text (a 1×1 clipped status line) is not on screen, so it has no padding to check.
    if (srOnly(el)) continue;
    const box = boxOf(el); if (!box || box.closest(CONTROL) || seenEdge.has(box)) continue;
    const br = box.getBoundingClientRect(); if (br.width < 60 || br.height < 24) continue;
    const bs = getComputedStyle(box);
    const inner = { left: br.left + parseFloat(bs.borderLeftWidth), right: br.right - parseFloat(bs.borderRightWidth), top: br.top + parseFloat(bs.borderTopWidth), bottom: br.bottom - parseFloat(bs.borderBottomWidth) };
    const range = document.createRange(); range.selectNodeContents(n); const full = range.getBoundingClientRect(); if (!full.width || !full.height) continue;
    // Only the visible part counts: truncated text (overflow hidden + ellipsis) is clipped by its own box, not the card's edge.
    const tr = { left: full.left, right: full.right, top: full.top, bottom: full.bottom };
    for (let c = el; c && c !== box; c = c.parentElement) {
      const cs = getComputedStyle(c); const cr = c.getBoundingClientRect();
      if (["hidden", "clip"].includes(cs.overflowX)) { tr.left = Math.max(tr.left, cr.left); tr.right = Math.min(tr.right, cr.right); }
      if (["hidden", "clip"].includes(cs.overflowY)) { tr.top = Math.max(tr.top, cr.top); tr.bottom = Math.min(tr.bottom, cr.bottom); }
    }
    const gaps = { left: tr.left - inner.left, right: inner.right - tr.right, top: tr.top - inner.top, bottom: inner.bottom - tr.bottom };
    const tight = Object.entries(gaps).filter(([side, gap]) => gap > -1 && gap < (side === "left" || side === "right" ? 7.5 : 3.5));
    if (tight.length) { seenEdge.add(box); out.edges.push(`${label(el)}: "${n.textContent.trim().slice(0, 24)}" ${tight.map(([side, gap]) => `${side} ${Math.round(gap)}px`).join(", ")} inside ${describe(box)}`); }
  }
  // Sizes: fixed-size visuals keep their declared box. Avatar = --zen-avatar-size square; Dock Icon and Icon stay square.
  for (const el of scope.querySelectorAll(".zen-avatar, .zen-dock-icon, svg.zen-icon, .zen-icon")) {
    if (!visible(el) || el.closest("[data-audit-skip-sizes]")) continue;
    const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
    const k = el.closest(".platform-phone") ? el.closest(".platform-phone").getBoundingClientRect().width / el.closest(".platform-phone").offsetWidth : 1;
    const w = r.width / k, h = r.height / k;
    // Only a px size is a declared size; a percentage (Avatar filling a Popover leading slot) follows its slot.
    const rawSize = el.matches(".zen-avatar") ? getComputedStyle(el).getPropertyValue("--zen-avatar-size").trim() : "";
    const declared = /^[\d.]+px$/.test(rawSize) ? parseFloat(rawSize) : NaN;
    if (Math.abs(w - h) > 1.5) out.sizes.push(`${label(el)}: ${describe(el)} is ${Math.round(w)}×${Math.round(h)} (not square)`);
    else if (Number.isFinite(declared) && Math.abs(w - declared) > 1.5) out.sizes.push(`${label(el)}: ${describe(el)} is ${Math.round(w)}px, declared ${declared}px`);
  }
  // Typography: Zen-Platform (TASA Explorer headings, looser tracking) is chrome-only. Previews and everything portalled
  // into .official-portal-root must resolve a preview data-typography scope, never the shell's.
  const shell = document.querySelector(".official-platform");
  const leaks = new Map(); // one finding per overlay / preview: first offending node + count
  for (const el of scope.querySelectorAll(".official-portal-root [class*='zen-type-'], [data-typography]:not(.official-platform) [class*='zen-type-'], :is(.pg-example__stage, .platform-guideline-visual) [class*='zen-type-']")) {
    if (!visible(el)) continue;
    const font = getComputedStyle(el).fontFamily.split(",")[0].replace(/"/g, "");
    if (el.closest("[data-typography]") !== shell && !/TASA Explorer/i.test(font)) continue;
    const holder = el.closest(".official-portal-root > *") ?? el.closest("[data-typography]:not(.official-platform)") ?? el;
    const hit = leaks.get(holder) ?? { el, font, n: 0 }; hit.n += 1; leaks.set(holder, hit);
  }
  // Device: examples show each chat piece in its own frame — Mobile variants in the phone, Desktop variants in a desktop
  // window — and the mobile hold layer (Chat/Mobile/Bubble/Overlay) never runs on desktop.
  for (const el of scope.querySelectorAll(".pe-card__stage :is(.zen-chat-thread, .zen-chat-composer, .zen-chat-convo), .platform-example-panel :is(.zen-chat-thread, .zen-chat-composer)")) {
    if (!visible(el)) continue;
    const phone = el.closest(".platform-phone"), desk = el.closest(".pe-chat-desktop");
    const dev = el.matches(".zen-chat-convo") ? null : el.dataset.device ?? "mobile";
    const where = phone ? "inside the phone" : desk ? "inside a desktop window" : "outside any device frame";
    const msg = !phone && !desk ? `${label(el)}: ${describe(el)} is shown ${where}` : dev && ((phone && dev !== "mobile") || (desk && dev !== "desktop")) ? `${label(el)}: ${describe(el)} is ${dev} ${where}` : null;
    if (msg && !out.device.includes(msg)) out.device.push(msg);
  }
  for (const el of scope.querySelectorAll('.zen-chat-thread[data-device="desktop"] [data-holdable="true"]')) {
    if (visible(el)) { out.device.push(`${label(el)}: a desktop message uses the mobile hold (Hover toolbar + right-click menu instead)`); break; }
  }
  // Outline (Typography › Content hierarchy, review 2026-09-29). Each example / playground preview is read as pages: every
  // phone frame is one screen, the rest of the region one more. Errors (outline): more than one h1 on a page (overlay
  // titles not counted), a skipped level going down (h1 → h3; going back up may jump), a heading visually larger than the
  // heading it sits under — compared inside one layer only: the TopNavigation bar title, an overlay and a fixed region
  // (Sidebar, Drawer, Bottom Navigation) are layers of their own. Warnings: outline-h1 a page-like region (a screen:true
  // example, i.e. a card with Full screen, or a phone frame) without exactly one h1 (a visually hidden h1 and the bar-title
  // h1 count); outline-start its outline not starting at h1; outline-card a heading inside a card larger than the card's
  // title; outline-siblings same-level siblings of one kind (sections, card titles, group headers) under one parent in
  // different styles.
  const HEADING = "h1, h2, h3, h4, h5, h6, [role='heading']";
  const OVERLAY = "[role='dialog']:not(.pe-card), [role='alertdialog'], .zen-side-panel, .zen-bottom-sheet";
  const FIXED = ".zen-sidebar, .zen-drawer, .zen-bottom-nav";
  const CARD = ".zen-card, .zen-chart-card, .zen-metric-card";
  const levelOf = (h) => Number(h.getAttribute("aria-level")) || (/^H[1-6]$/.test(h.tagName) ? Number(h.tagName[1]) : 2);
  // In the outline (what a screen reader lists): visually hidden headings count, aria-hidden / display:none ones do not.
  const inOutline = (h) => { const s = getComputedStyle(h); return s.display !== "none" && s.visibility !== "hidden" && !h.closest("[aria-hidden='true'], [inert], [hidden], .pth-outline"); };
  const isBar = (h) => Boolean(h.closest(".zen-top-nav__bar") || h.matches(".zen-top-nav__title"));
  const layerOf = (h) => (isBar(h) ? "bar" : h.closest(`${OVERLAY}, ${FIXED}`) ?? "page");
  const headText = (h) => h.textContent.trim().replace(/\s+/g, " ").slice(0, 24);
  const typeOf = (h) => {
    let el = h; const w = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (n.textContent.trim()) { el = n.parentElement; break; }
    const s = getComputedStyle(el); const size = parseFloat(s.fontSize);
    const cls = [el, ...(el === h ? [] : [h])].map((x) => (typeof x.className === "string" ? x.className : "").match(/zen-type-([\w-]+)/)?.[1]).find(Boolean);
    return { size, key: `${size}/${s.fontWeight}`, name: cls ?? `${size}px/${s.fontWeight}` };
  };
  const ids = new Map(); const idOf = (el) => ids.get(el) ?? ids.set(el, ids.size + 1).get(el);
  const note = (kind, msg) => { if (!out[kind].includes(msg)) out[kind].push(msg); };
  const screenCard = (region) => { const card = region.closest(".pe-card"); return Boolean(card && (card.matches("[data-screen='true']") || [...card.querySelectorAll(".pe-card__actions button")].some((b) => /full screen/i.test(b.textContent)))); };
  for (const region of scope.querySelectorAll(".pe-card__stage, .platform-example-panel .platform-example-row, .platform-example-panel .platform-mobile-preview")) {
    const phones = [...region.querySelectorAll(".platform-phone")];
    const pages = [
      ...phones.map((p) => ({ root: p, name: `${label(region)} › ${(p.getAttribute("aria-label") ?? "phone").replace(/\s*\(.*\)$/, "")}`, pageLike: true, skip: [] })),
      { root: region, name: label(region), pageLike: !phones.length && screenCard(region), skip: phones },
    ];
    for (const pg of pages) {
      const all = [...pg.root.querySelectorAll(HEADING)].filter((h) => inOutline(h) && !pg.skip.some((p) => p.contains(h)));
      const heads = all.filter(visible);
      if (!heads.length && !pg.pageLike) continue;
      const titles = (list) => list.filter((h) => levelOf(h) === 1 && !h.closest(OVERLAY));
      const h1s = titles(heads).length;
      if (h1s > 1) note("outline", `${pg.name}: ${h1s} h1 on one ${pg.root === region ? "page" : "screen"} — one page title per page`);
      const stack = [];
      for (const h of heads) {
        const level = levelOf(h), size = parseFloat(getComputedStyle(h).fontSize), layer = layerOf(h);
        const prev = stack[stack.length - 1];
        if (prev && level > prev.level + 1) note("outline", `${pg.name}: "${headText(h)}" is h${level} right under h${prev.level} — don't skip a level`);
        while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
        const parent = stack[stack.length - 1];
        if (parent && parent.layer === layer && size > parent.size + 0.5) note("outline", `${pg.name}: "${headText(h)}" (h${level}, ${size}px) is larger than its h${parent.level} "${parent.text}" (${parent.size}px)`);
        stack.push({ level, size, layer, text: headText(h) });
      }
      // outline-h1 / outline-start: a page or screen names itself with exactly one h1, and its outline starts there.
      if (pg.pageLike) {
        const named = titles(all);
        const first = all.find((h) => !h.closest(`${OVERLAY}, ${FIXED}`));
        if (!named.length) note("outline-h1", `${pg.name}: no h1 — a page or screen exposes exactly one h1 that names it (PageHeader or TopNavigation large title in Heading/1; a compact bar title is the h1 in its bar style)${first ? `; the outline starts at h${levelOf(first)} "${headText(first)}"` : ""}`);
        else if (named.length > 1 && h1s <= 1) note("outline-h1", `${pg.name}: ${named.length} h1 (${named.map((h) => `"${headText(h)}"`).join(", ")}) — exactly one h1 per page or screen, visually hidden ones included`);
        if (first && levelOf(first) !== 1) note("outline-start", `${pg.name}: the outline starts at h${levelOf(first)} "${headText(first)}" — a page or screen starts at its h1 title and steps down from it`);
      }
      // outline-card: inside a card nothing outranks the card's own title (EmptyState h3 Heading/4 in a ChartCard h3 Subheading).
      for (const card of pg.root.querySelectorAll(CARD)) {
        const inCard = heads.filter((h) => card.contains(h) && layerOf(h) === "page");
        const title = inCard[0]; if (!title) continue;
        const ts = typeOf(title);
        const over = inCard.slice(1).find((h) => typeOf(h).size > ts.size + 0.5);
        if (over) note("outline-card", `${pg.name}: "${headText(over)}" (h${levelOf(over)}, ${typeOf(over).name} ${typeOf(over).size}px) is larger than its card's title "${headText(title)}" (h${levelOf(title)}, ${ts.name} ${ts.size}px) — inside a card nothing outranks the card title: one level below it in a smaller style, or let the title name it`);
      }
      // outline-siblings: same level, same parent, same kind of content → one style.
      const groups = new Map(); const path = [];
      for (const h of heads) {
        const level = levelOf(h), layer = layerOf(h);
        while (path.length && path[path.length - 1].level >= level) path.pop();
        const parent = path[path.length - 1]?.el ?? null;
        path.push({ level, el: h });
        if (layer === "bar" || (layer !== "page" && layer.matches(FIXED))) continue;
        const t = typeOf(h); const card = h.closest(CARD);
        const kind = t.name === "body-small-bold" ? "group header" : card ? (heads.find((x) => card.contains(x)) === h ? "card title" : "card heading") : "section title";
        const key = `${parent ? idOf(parent) : 0}|${layer === "page" ? "page" : idOf(layer)}|${level}|${kind}|${kind === "card heading" ? idOf(card) : ""}`;
        (groups.get(key) ?? groups.set(key, []).get(key)).push({ h, t, kind, level, parent });
      }
      for (const list of groups.values()) {
        const styles = [...new Map(list.map((x) => [x.t.key, x])).values()];
        if (styles.length < 2) continue;
        const [a, b] = styles;
        note("outline-siblings", `${pg.name}: sibling h${a.level} ${a.kind}s${a.parent ? ` under "${headText(a.parent)}"` : ""} use ${styles.length} styles — "${headText(a.h)}" ${a.t.name}, "${headText(b.h)}" ${b.t.name}; the same kind of content takes one style${a.kind === "section title" ? " (section titles: Heading/4)" : a.kind === "card title" ? " (card titles: Heading/Subheading)" : ""}`);
      }
    }
  }
  for (const [holder, { el, font, n }] of leaks) out.typography.push(`${label(el)}: ${describe(holder)} renders ${n} text node(s) in the platform typography (e.g. ${describe(el)}, ${font}) — its container needs the preview data-typography`);
  return out;
}

const sum = (r) => Object.values(r).reduce((n, list) => n + list.length, 0);
const SEVERITY = { errors: "error", overflow: "error", images: "error", names: "error", ids: "warn", nesting: "error", targets: "warn", contrast: "warn", surfaces: "error", edges: "error", sizes: "error", typography: "error", device: "error", outline: "error", "outline-h1": "warn", "outline-start": "warn", "outline-card": "warn", "outline-siblings": "warn", scale: "error", roles: "warn", hierarchy: "error", rhythm: "warn", density: "error", fit: "error" };

async function run() {
  const browser = await chromium.launch();
  const report = { base: BASE, date: new Date().toISOString(), viewports: VIEWPORTS, dark: DARK, pages: {} };
  for (const width of VIEWPORTS) {
    const mobile = width < 768;
    const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 1000 }, reducedMotion: "reduce", deviceScaleFactor: 1 });
    await context.addInitScript(freezeMotionInit, FREEZE_MOTION);
    const page = await context.newPage();
    let errors = [];
    page.on("pageerror", (e) => errors.push(e.message.split("\n")[0]));
    page.on("console", (m) => { if (m.type() === "error" && !IGNORED_CONSOLE.test(m.text())) errors.push(m.text().split("\n")[0].slice(0, 200)); });
    page.on("filechooser", (fc) => fc.setFiles([]).catch(() => undefined));
    for (const id of PAGES) for (let attempt = 1; attempt <= 3; attempt++) try {
      // Other sessions edit the shared tree, so Vite HMR may reload the page mid-check: the page is then audited again.
      errors = [];
      if (report.baselined?.[`${id}@${width}${DARK ? "-dark" : ""}`]) delete report.baselined[`${id}@${width}${DARK ? "-dark" : ""}`];
      await page.goto(`${BASE}/?page=${id}`, { waitUntil: "networkidle" }).catch(() => undefined);
      if (DARK) await page.getByRole("button", { name: "Dark mode" }).first().click().catch(() => undefined);
      if (CSS) await page.addStyleTag({ content: CSS }).catch(() => undefined);
      await page.addStyleTag({ content: FREEZE_MOTION }).catch(() => undefined);
      await page.waitForTimeout(500);
      await page.evaluate(() => document.getAnimations().forEach((a) => a.finish())).catch(() => undefined);
      const base = await page.evaluate(pageChecks, { scopeSel: ".official-platform", mobile });
      const docOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      if (docOverflow) base.overflow.unshift("document scrolls horizontally");
      const entry = { ...base, errors: [...errors], playground: [], smoke: [] };
      // Build-QA: token scale, text styles, content hierarchy, rhythm (quality-checks.mjs). Playground and smoke add theirs below.
      const addQuality = (q, prefix = "") => { for (const kind of ["scale", "roles", "hierarchy", "rhythm", "fit"]) for (const item of q?.[kind] ?? []) { const msg = `${prefix}${item}`; if (!entry[kind].includes(msg) && !entry[kind].includes(item)) entry[kind].push(msg); } };
      // One scope's quality kinds: qualityChecks (text styles, tokens, hierarchy, rhythm) and textFit (text wider than its box).
      const quality = async (scopeSel, crash = false) => ({
        ...await page.evaluate(qualityChecks, { scopeSel }).catch((e) => (crash ? { scale: [`quality checks crashed: ${e.message.split("\n")[0]}`] } : null)),
        ...await page.evaluate(textFit, { scopeSel }).catch((e) => (crash ? { fit: [`text-fit check crashed: ${e.message.split("\n")[0]}`] } : null)),
      });
      if (QUALITY || DENSITY) Object.assign(entry, { scale: [], roles: [], hierarchy: [], rhythm: [], density: [], fit: [] });
      if (QUALITY) addQuality(await quality(".official-platform", true));
      if (DENSITY) {
        // Component Size: compare every Zen box Compact vs Comfortable; content that outgrows its box only in Comfortable is a
        // wrapper sized in px around a token-sized child (memory: density-safe slots). New layout errors count too.
        const setDensity = (d) => page.evaluate((d) => { const els = document.querySelectorAll(".official-platform, .official-portal-root"); const before = [...els].map((e) => e.getAttribute("data-density")); els.forEach((e) => e.setAttribute("data-density", d)); return before; }, d);
        const original = await setDensity("compact"); await page.waitForTimeout(200);
        const compact = await page.evaluate(densitySnapshot);
        const fitCompact = await page.evaluate(textFit, { scopeSel: ".official-platform" }).catch(() => null);
        await setDensity("comfortable"); await page.waitForTimeout(300);
        const comfortable = await page.evaluate(densitySnapshot);
        // Text that outgrows its box only at Comfortable (larger type and padding in the same width).
        const fitRoomy = await page.evaluate(textFit, { scopeSel: ".official-platform" }).catch(() => null);
        (fitRoomy?.fit ?? []).forEach((item, i) => { const msg = `at Comfortable: ${item}`; if (!fitCompact?.where.includes(fitRoomy.where[i]) && !entry.fit.includes(msg)) entry.fit.push(msg); });
        for (const [k, c] of Object.entries(comfortable)) { const a = compact[k]; if (a && c.over > 1.5 && (a.over <= 1.5 ? c.over > a.over + 1 : c.over > a.over * 1.5 + 2)) { const msg = `${c.text} outgrows its box by ${c.over}px at Comfortable (${a.over}px at Compact)`; if (!entry.density.includes(msg)) entry.density.push(msg); } }
        const roomy = await page.evaluate(pageChecks, { scopeSel: ".official-platform", mobile });
        for (const kind of ["overflow", "sizes", "edges"]) for (const item of roomy[kind]) if (!entry[kind].includes(item)) entry.density.push(`${kind} at Comfortable: ${item}`);
        await page.evaluate((vals) => document.querySelectorAll(".official-platform, .official-portal-root").forEach((e, i) => vals[i] == null ? e.removeAttribute("data-density") : e.setAttribute("data-density", vals[i])), original);
        await page.waitForTimeout(150);
      }

      if (PLAYGROUND) {
        const panel = page.locator(".platform-example-panel").first();
        if (await panel.count()) {
          const selects = panel.locator(".platform-playground-controls select");
          for (let i = 0; i < await selects.count(); i++) {
            const sel = selects.nth(i);
            const name = await sel.getAttribute("aria-label");
            const original = await sel.inputValue().catch(() => "");
            const values = await sel.evaluate((s) => [...s.options].filter((o) => !o.disabled).map((o) => o.value));
            for (const v of values) {
              errors = [];
              await sel.selectOption(v).catch(() => undefined);
              await page.waitForTimeout(120);
              const r = await page.evaluate(pageChecks, { scopeSel: ".platform-example-panel", mobile });
              const findings = [...errors.map((e) => `error: ${e}`), ...r.overflow, ...r.images, ...r.names.map((n) => `unnamed ${n}`), ...r.nesting, ...r.surfaces.map((n) => `surface ${n}`), ...r.edges.map((n) => `edge ${n}`), ...r.sizes.map((n) => `size ${n}`), ...r.typography.map((n) => `type ${n}`), ...r.device.map((n) => `device ${n}`)];
              if (findings.length) entry.playground.push(`${name}=${v}: ${findings.join(" · ")}`);
              if (QUALITY) addQuality(await quality(".platform-example-panel"), `${name}=${v}: `);
            }
            await sel.selectOption(original).catch(() => undefined);
          }
          const toggles = panel.locator(".platform-playground-controls [role='switch'], .platform-playground-controls button[aria-pressed]");
          for (let i = 0; i < await toggles.count(); i++) {
            const t = toggles.nth(i); const name = await t.getAttribute("aria-label");
            errors = [];
            await t.click().catch(() => undefined); await page.waitForTimeout(120);
            const r = await page.evaluate(pageChecks, { scopeSel: ".platform-example-panel", mobile });
            const findings = [...errors.map((e) => `error: ${e}`), ...r.overflow, ...r.images, ...r.names.map((n) => `unnamed ${n}`), ...r.nesting, ...r.surfaces.map((n) => `surface ${n}`), ...r.edges.map((n) => `edge ${n}`), ...r.sizes.map((n) => `size ${n}`), ...r.typography.map((n) => `type ${n}`), ...r.device.map((n) => `device ${n}`)];
            if (findings.length) entry.playground.push(`${name} toggled: ${findings.join(" · ")}`);
            if (QUALITY) addQuality(await quality(".platform-example-panel"), `${name} toggled: `);
            await t.click().catch(() => undefined); await page.waitForTimeout(60);
          }
        }
      }

      if (SMOKE) {
        const cards = page.locator(".pe-card");
        for (let c = 0; c < await cards.count(); c++) {
          const card = cards.nth(c); const title = (await card.locator("h3").first().textContent().catch(() => ""))?.trim();
          const buttons = card.locator(".pe-card__stage button:visible");
          const n = Math.min(await buttons.count(), 14);
          for (let b = 0; b < n; b++) {
            errors = [];
            await buttons.nth(b).click({ timeout: 800, trial: false }).catch(() => undefined);
            await page.waitForTimeout(80);
            // What a click opens (dialogs, side panels, sheets, popovers) is only on screen now: check its sizes, edges and typography too.
            const opened = await page.evaluate(pageChecks, { scopeSel: null, mobile }).catch(() => null);
            const layout = opened ? [...opened.sizes.map((n) => `size ${n}`), ...opened.edges.map((n) => `edge ${n}`), ...opened.typography.map((n) => `type ${n}`), ...opened.device.map((n) => `device ${n}`)] : [];
            // Layer: an open floating Popover stays on top even while the pointer hovers what sits around it.
            // Finish the popover's enter animation first: sampled mid-slide, its edge points miss it (2026-10-01).
            await page.evaluate(() => document.getAnimations().forEach((a) => a.finish())).catch(() => undefined);
            const floating = await page.evaluate(() => [...document.querySelectorAll(".zen-popover")].map((el) => ({ cs: getComputedStyle(el), r: el.getBoundingClientRect() }))
              .filter(({ cs, r }) => ["absolute", "fixed"].includes(cs.position) && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight)
              .map(({ r }) => ({ x: r.left, y: r.top, w: r.width, h: r.height }))).catch(() => []);
            for (const r of floating.slice(0, 1)) {
              for (const [mx, my] of [[r.x - 6, r.y + r.h / 2], [r.x + r.w / 2, r.y + r.h + 6]]) {
                await page.mouse.move(mx, my).catch(() => undefined); await page.waitForTimeout(60);
                const over = await page.evaluate((box) => {
                  for (const [fx, fy] of [[0.5, 0.5], [0.15, 0.85], [0.85, 0.85], [0.5, 0.95]]) {
                    const hit = document.elementFromPoint(box.x + box.w * fx, box.y + box.h * fy);
                    // Toasts (z-index 1100) are the top notification layer by design, above menus and dialogs; a toast left by
                    // an earlier smoke click may overlap the popover near the bottom of small viewports.
                    if (hit && !hit.closest(".zen-popover, .zen-tooltip, [role='tooltip'], .zen-toast-stack")) return typeof hit.className === "string" && hit.className.trim() ? hit.className.trim().split(/\s+/).slice(0, 2).join(".") : hit.tagName.toLowerCase();
                  }
                  return null;
                }, r).catch(() => null);
                if (over) { layout.push(`layer ${over} paints over the open popover`); break; }
              }
            }
            // Overlays opened by the click (dialogs, sheets, menus) get the text-style and hierarchy checks too.
            if (QUALITY) addQuality(await quality(".official-portal-root"), `${title} → opened: `);
            await page.keyboard.press("Escape").catch(() => undefined);
            if (errors.length || layout.length) entry.smoke.push(`${title} #${b}: ${[...errors, ...new Set(layout)].join(" · ")}`);
          }
        }
      }

      const key = `${id}@${width}${DARK ? "-dark" : ""}`;
      // Baseline: pre-existing Build-QA findings (quality-baseline.json) are reported apart and do not fail the run.
      let known = 0;
      if (!OUTLINE) for (const kind of OUTLINE_KINDS) if (entry[kind]) entry[kind] = [];
      for (const kind of BASELINED) {
        if (!entry[kind]) continue;
        const seen = new Map(); const fresh = [];
        for (const item of entry[kind]) { const k = `${key}|${kind}|${item}`; const nth = (seen.get(k) ?? 0) + 1; seen.set(k, nth); (report.current ??= {})[k] = nth; if (nth <= (baseline[k] ?? 0)) { ((report.baselined ??= {})[key] ??= {})[kind] = [...(report.baselined[key][kind] ?? []), item]; known += 1; } else fresh.push(item); }
        entry[kind] = fresh;
      }
      report.pages[key] = entry;
      const n = sum(entry);
      console.log(`${n ? "✗" : "✓"} ${key.padEnd(30)} ${n ? Object.entries(entry).filter(([, l]) => l.length).map(([k, l]) => `${k}:${l.length}`).join(" ") : "clean"}${known ? ` (+${known} baseline)` : ""}`);
      break;
    } catch (e) {
      if (attempt < 3 && /Execution context was destroyed|navigation|Target (page|closed)|frame was detached/i.test(e.message)) { console.log(`↻ ${id}@${width}: the page reloaded during the audit (HMR from another session?) — auditing it again`); await page.waitForTimeout(1500); continue; }
      throw e;
    }
    await context.close();
  }
  await browser.close();

  // Summary.
  let hardErrors = 0;
  const lines = [];
  for (const [key, entry] of Object.entries(report.pages)) {
    for (const [kind, list] of Object.entries(entry)) {
      if (!list.length) continue;
      const sev = kind === "playground" || kind === "smoke" ? "error" : SEVERITY[kind];
      if (sev === "error") hardErrors += list.length;
      for (const item of list.slice(0, 12)) lines.push(`${sev === "error" ? "✗" : "⚠"} [${kind}] ${key}: ${item}`);
      if (list.length > 12) lines.push(`  … ${list.length - 12} more ${kind} on ${key}`);
    }
  }
  console.log("\n" + (lines.join("\n") || "No findings."));
  const knownTotal = Object.values(report.baselined ?? {}).flatMap((kinds) => Object.values(kinds)).flat().length;
  if (knownTotal) console.log(`\n${knownTotal} pre-existing Build-QA finding(s) are in tools/platform-audit/quality-baseline.json (listed in --out under "baselined").`);
  if (BASELINE_UPDATE && (QUALITY || DENSITY)) {
    // Replace only the page runs of this invocation; other pages keep their recorded debt. With --baseline-update=<kinds>,
    // only those kinds are replaced and the other kinds of these runs keep their entries.
    let stored = {}; try { stored = JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8")).keys ?? {}; } catch { /* first run */ }
    const runs = new Set(Object.keys(report.pages));
    const kinds = typeof BASELINE_UPDATE === "string" ? new Set(BASELINE_UPDATE.split(",")) : null;
    const replaced = (k) => runs.has(k.slice(0, k.indexOf("|"))) && (!kinds || kinds.has(k.split("|")[1]));
    const keys = Object.fromEntries(Object.entries(stored).filter(([k]) => !replaced(k)));
    for (const [k, n] of Object.entries(report.current ?? {})) if (replaced(k)) keys[k] = n;
    fs.writeFileSync(BASELINE_FILE, JSON.stringify({ generated: new Date().toISOString(), note: "Pre-existing Build-QA findings (audit.mjs --quality/--density). New findings fail; fix these when you touch the page, then re-run with --baseline-update.", total: Object.values(keys).reduce((a, b) => a + b, 0), keys }, null, 2) + "\n");
    console.log(`Baseline → tools/platform-audit/quality-baseline.json (${Object.keys(keys).length} keys${kinds ? `; replaced ${[...kinds].join(", ")} only` : ""})`);
    process.exit(0);
  }
  if (OUT) { fs.writeFileSync(path.resolve(String(OUT)), JSON.stringify(report, null, 2)); console.log(`\nReport → ${OUT}`); }
  console.log(`\n${hardErrors ? `✗ ${hardErrors} error-level finding(s)` : "✓ No error-level findings"} across ${Object.keys(report.pages).length} page runs.`);
  process.exit(hardErrors ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(2); });
