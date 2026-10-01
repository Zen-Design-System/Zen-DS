#!/usr/bin/env node
/**
 * Zen DS platform behaviour audit (Playwright). Drives every example card stage (`.pe-card__stage`) and playground preview
 * (`.platform-example-panel .platform-example-row`) with the keyboard and the mouse, and reports what the DOM/visual audit
 * (audit.mjs) cannot see — whether components and examples WORK and give interaction feedback:
 *   focus      (error) Tab through each stage: every focused element must look different from its resting state — outline,
 *              box-shadow, border colour, background, text colour/decoration or a ::before/::after ring, on the element, its
 *              descendants, its 2 nearest ancestors (a `:focus-within` field ring), its sibling mark (visually hidden
 *              checkbox input) or its <label> (WCAG 2.4.7). Also: focus landing on something not visible (collapsed,
 *              clipped, opacity 0), and menu items / dialog controls reached during the apg checks. A text field showing
 *              nothing but the caret is a warn ("while invalid" when it is in an error state). Rings are judged on the
 *              first two elements of each component kind per page (same kind, same CSS).
 *   keyboard   (error) controls present when the walk starts (buttons, links, fields, ARIA widgets, tabindex=0) that Tab
 *              never reaches — roving-tabindex composites (tablist, radiogroup, menu, menubar, listbox, grid, toolbar, tree;
 *              native radios by name) pass when one member is reachable; an explicit tabindex=-1 is a warn, and the
 *              tabindex=-1 stepper buttons of a reachable spinbutton / number field are exempt (APG spinbutton); Tab
 *              cycling or stuck inside an example (keyboard trap); pointer-only controls: `cursor: pointer` on something
 *              that is not focusable, holds no control and sits in none (div onClick).
 *   apg        (error; optional keys warn) WAI-ARIA APG keyboard contracts, only where the pattern is present: tablist
 *              arrows (Home/End warn), custom switch/checkbox Space, slider arrows, spinbutton / number field ArrowUp/Down
 *              change the value, menu button (Enter/ArrowDown opens a role=menu — aria-haspopup="menu" opening anything
 *              else is flagged — ArrowDown reaches an item, Escape closes and focus returns), dialogs opened by a click
 *              (focus inside, Tab kept inside a modal, Escape closes — warn when there is no close button — focus returns
 *              to the trigger), disclosure Enter toggles aria-expanded, combobox ArrowDown/Enter opens a listbox + Escape
 *              closes, popover Enter opens + Escape closes and returns focus; an arrow key that throws focus out of the
 *              example (a page shortcut taking it).
 *   deadclick  (warn) clicks every visible button of each example card (max 14 per card; the playground is exempt) and
 *              watches the DOM, focus, URL, file/download/popup events and animations for 300ms: nothing changed → a no-op
 *              handler. Selected/current items of a single-choice set are skipped; rows of one repeated kind that are all
 *              dead are reported once; a click that reloads or leaves the page is reported too.
 *   hover      (warn) buttons, links (not in running text), tabs, options, menu items, clickable cards (2 per component
 *              kind per page): hovering changes nothing on the element, its descendants or its 2 ancestors, and the cursor
 *              is not a pointer.
 * An interaction that throws (uncaught error / console.error) is reported under the check that caused it. A page the shared
 * dev server disturbed (HMR from another session's edit, a 5xx, a reload we did not start) is run once more; if it is
 * disturbed again a `run` warn says its results may be incomplete. A page gets a
 * time budget (--budget, default 90s; the heaviest pages, chat and templates, take ~35-40s); running out is a `timeout`
 * warn and the remaining checks are skipped.
 *
 * Findings are keyed "<page>@<viewport>|<check>|<card>|<message>" (messages carry no coordinates or generated ids; digits,
 * month and weekday names in element names are normalised) and compared with tools/platform-audit/behaviour-baseline.json:
 * known findings print as one count line per page, new ones in full. `--baseline-update` re-measures the pages × checks
 * that ran and keeps the rest of the file. Mark a region `data-audit-skip-behaviour` (with a comment saying why) to exempt it.
 *
 * Usage (the Vite dev server must be running):
 *   node tools/platform-audit/behaviour.mjs [--url=http://localhost:5173] [--pages=button,tabs] [--viewports=1512,390]
 *        [--checks=focus,keyboard,apg,deadclick,hover] [--out=report.json] [--baseline-update] [--no-baseline]
 *        [--budget=90] [--verbose]
 * Exit code: 0 no new error-level finding · 1 at least one NEW error-level finding · 2 the run crashed.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const require = createRequire(path.join(root, "package.json"));
const { chromium } = require("playwright");
// Motion (2026-10-01): reduced motion keeps fades (tokens/source/motion.json sets only the movement to 0), so every
// animation and transition is frozen at its end state: the probes read final states, not a fade in progress.
const FREEZE_MOTION = "*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }";
// The freeze stylesheet goes in on every document load (an init script), so a Vite HMR full reload from another session
// cannot drop it mid-check.
const freezeMotionInit = (css) => {
  const add = () => { if (document.getElementById("zen-freeze-motion")) return; const s = document.createElement("style"); s.id = "zen-freeze-motion"; s.textContent = css; (document.head ?? document.documentElement).appendChild(s); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add, { once: true }); else add();
};

const arg = (name, fallback) => { const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`)); if (!hit) return fallback; return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true; };
const BASE = String(arg("url", "http://localhost:5173")).replace(/\/$/, "");
const VIEWPORTS = String(arg("viewports", "1512")).split(",").map(Number).filter(Boolean);
const ALL_CHECKS = ["focus", "keyboard", "apg", "deadclick", "hover"];
const CHECKS = new Set(String(arg("checks", ALL_CHECKS.join(","))).split(",").map((c) => c.trim()).filter(Boolean));
const OUT = arg("out", null);
const UPDATE = Boolean(arg("baseline-update", false));
const NO_BASELINE = Boolean(arg("no-baseline", false));
const BUDGET = Number(arg("budget", 90)) * 1000;
const VERBOSE = Boolean(arg("verbose", false));
const BASELINE = path.join(root, "tools/platform-audit/behaviour-baseline.json");

/** Every page id the platform routes to (component nav + app-layer pages + foundations). Same as audit.mjs. */
function allPages() {
  const src = fs.readFileSync(path.join(root, "src/platform/PlatformApp.tsx"), "utf8");
  const nav = src.slice(src.indexOf("const componentNavigation"), src.indexOf("];", src.indexOf("const componentNavigation")));
  const ids = [...nav.matchAll(/id:\s*"([\w-]+)"/g)].map((m) => m[1]);
  // App-layer pages (Layout, Text, Form, Templates…) are registered from src/platform/appLayer, not componentNavigation.
  const appLayer = fs.readFileSync(path.join(root, "src/platform/appLayer/types.ts"), "utf8").match(/appLayerPageIds\s*=\s*\[([^\]]*)\]/)?.[1] ?? "";
  const layerIds = [...appLayer.matchAll(/"([\w-]+)"/g)].map((m) => m[1]);
  return ["overviews", "installation", "design-tokens", "typography", "iconography", ...[...new Set([...ids, ...layerIds])].sort()];
}
const PAGES = arg("pages", null) ? String(arg("pages")).split(",").map((p) => p.trim()).filter(Boolean) : allPages();

const IGNORED_CONSOLE = /\[vite\]|Download the React DevTools|favicon|ResizeObserver loop|status of 5\d\d/i;
/** The shared dev server changed the page under us (another session saved a file): HMR, a 5xx, a lost connection. */
const ENV_NOISE = /\[vite\].*(hot updated|Internal Server Error|server connection lost|failed to connect)|Failed to load resource: the server responded with a status of 5\d\d/i;
/** Where the mouse rests between probes: the top-left corner of the platform chrome, never over an example. */
const PARK = { x: 1, y: 1 };
const TAB_CAP = 60; // Tab presses per stage before giving up (a stage with more tab stops is not checked for reachability)
const HOVER_WAIT = 150;
const CLICK_CAP = 14;
const DIALOG_TABS = 12;

/**
 * In-page helpers, installed on every document (addInitScript) as window.__bhv. The Node side drives the keyboard and
 * mouse; these read the DOM. Elements are handed around by stable keys ("<region>:<list><index>") so a reload can
 * re-register the same elements.
 */
function installHelpers() {
  if (window.__bhv) return;
  const B = { loadId: Math.random().toString(36).slice(2), regionEls: new Map(), reg: new Map(), focusKinds: new Map() };
  window.__bhv = B;

  const KEYBOARD = "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='tab'], [role='switch'], [role='checkbox'], [role='radio'], [role='slider'], [role='option'], [role='menuitem'], [role='menuitemcheckbox'], [role='menuitemradio'], [role='combobox'], [tabindex='0']";
  const INTERACTIVE = `${KEYBOARD}, summary, label, [role='link'], [role='gridcell'], [role='treeitem'], [role='spinbutton'], [role='textbox'], [role='searchbox'], [tabindex], [contenteditable]:not([contenteditable='false'])`;
  const COMPOSITE = "[role='tablist'], [role='radiogroup'], [role='menu'], [role='menubar'], [role='listbox'], [role='grid'], [role='treegrid'], [role='toolbar'], [role='tree']";
  const TOOLTIP = "[role='tooltip'], .zen-tooltip, .zen-tooltip-layer";
  const DIALOG = "[role='dialog'], [role='alertdialog'], dialog[open]";
  const POPUP = "[role='menu'], [role='listbox'], [role='dialog'], [role='alertdialog'], [role='grid'], [role='tree'], dialog[open], .zen-popover";
  const OVERLAY_ROOT = ".official-portal-root, [data-zen-overlay-root]";
  const SKIP = "[data-audit-skip-behaviour]";
  /** Attributes that follow the pointer or focus (not an effect of a click). */
  const IGNORE_ATTRS = new Set(["aria-describedby", "data-hover", "data-hovered", "data-pressed", "data-focus", "data-focused", "data-focus-visible"]);
  const CLOSE_NAME = /\b(close|cancel|dismiss|done|got it|not now|no thanks|keep|back|ok|okay)\b/i;
  const MONTHS = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\b/g;
  const DAYS = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tues?|Wed|Thu(?:rs?)?|Fri|Sat|Sun)\b/g;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  /** Jump finite animations/transitions to their end state so computed styles are final. */
  const finish = () => { for (const a of document.getAnimations()) { try { if (a.effect?.getComputedTiming?.().iterations !== Infinity) a.finish(); } catch { /* not finishable */ } } };
  B.finish = finish;

  // ── naming ──
  const stable = (text) => String(text ?? "").replace(/\s+/g, " ").trim().replace(MONTHS, "<month>").replace(DAYS, "<day>").replace(/\d+/g, "#").slice(0, 40).trim();
  const nameOf = (el) => {
    const aria = el.getAttribute("aria-label"); if (aria?.trim()) return aria;
    const lb = el.getAttribute("aria-labelledby");
    if (lb) { const text = lb.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim(); if (text) return text; }
    if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l?.textContent.trim()) return l.textContent; }
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) { const wrap = el.closest("label"); if (wrap?.textContent.trim()) return wrap.textContent; if (el.getAttribute("placeholder")) return el.getAttribute("placeholder"); }
    if (el.getAttribute("title")) return el.getAttribute("title");
    // Text nodes joined with spaces, so "Arrives" + "Thursday" stay two words (stable normalisation below).
    const parts = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: (n) => (n.nodeType === 1 && n.getAttribute("aria-hidden") === "true" ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.nodeType === 1) { if (n.tagName === "IMG" && n.getAttribute("alt")) parts.push(n.getAttribute("alt")); continue; }
      if (n.textContent.trim()) parts.push(n.textContent.trim());
    }
    return parts.join(" ");
  };
  const describe = (el) => {
    if (!el || el.nodeType !== 1) return "?";
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role");
    const classes = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean) : [];
    const cls = classes.find((c) => /^(zen|pe|platform|pg)-/.test(c) && !/^zen-type-/.test(c)) ?? classes.find((c) => !/^zen-type-/.test(c)) ?? "";
    const type = tag === "input" ? `[type=${el.type}]` : "";
    const name = stable(nameOf(el));
    return `${tag}${type}${role ? `[role=${role}]` : ""}${cls ? `.${cls}` : ""}${name ? ` "${name}"` : ""}`;
  };
  B.describe = describe;
  const label = (el) => (el.closest("[data-audit-label]")?.getAttribute("data-audit-label") ?? el.closest(".pe-card")?.querySelector("h3")?.textContent ?? el.closest(".platform-example-panel")?.querySelector("h2")?.textContent ?? "page").trim().slice(0, 40);
  /** Component "kind" (tag, role, classes, short data-* values, parent class): two of a kind behave alike. */
  const kindOf = (el) => {
    const cls = (x) => typeof x?.className === "string" ? x.className.trim().split(/\s+/).filter((c) => c && !/^zen-type-/.test(c)).sort().join(".") : "";
    const data = [...el.attributes].filter((a) => a.name.startsWith("data-") && !/id$/.test(a.name) && a.value.length <= 24).map((a) => `${a.name}=${a.value}`).sort().join(",");
    return `${el.tagName}|${el.getAttribute("role") ?? ""}|${cls(el)}|${data}|${cls(el.parentElement)}`;
  };

  // ── visibility ──
  const disabled = (el) => el.matches(":disabled") || !!el.closest("[aria-disabled='true']");
  /** Laid out: has a box, not display:none / visibility:hidden, not inside a collapsed (0-size) clipping parent. */
  const laidOut = (el) => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return false;
    const s = getComputedStyle(el); if (s.visibility !== "visible" || s.display === "none") return false;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const as = getComputedStyle(a);
      if (as.overflowX !== "visible" || as.overflowY !== "visible") { const ar = a.getBoundingClientRect(); if (ar.width < 1 || ar.height < 1) return false; }
    }
    return true;
  };
  /** Laid out and exposed (not aria-hidden / inert): a control a user can reach. Opacity is ignored. */
  B.rendered = (el) => laidOut(el) && !el.closest("[aria-hidden='true'], [inert]");
  /** Actually painted on screen (decorative aria-hidden marks count): laid out, ≥ 2px, not opacity 0, not clipped away. */
  B.shown = (el) => {
    if (!laidOut(el)) return false;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false;
    const box = { l: r.left, t: r.top, r: r.right, b: r.bottom };
    let skip = false, fixed = false;
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (parseFloat(s.opacity) < 0.05) return false;
      if (/inset\(50%/.test(s.clipPath) || /^rect\(0px,? 0px,? 0px,? 0px\)$/.test(s.clip)) return false;
      if (a !== el && !fixed) {
        const positioned = s.position !== "static" || s.transform !== "none";
        const clips = !skip || positioned;
        if (positioned) skip = false;
        if (clips && (s.overflowX !== "visible" || s.overflowY !== "visible")) {
          const ar = a.getBoundingClientRect();
          if (s.overflowX !== "visible") { box.l = Math.max(box.l, ar.left); box.r = Math.min(box.r, ar.right); }
          if (s.overflowY !== "visible") { box.t = Math.max(box.t, ar.top); box.b = Math.min(box.b, ar.bottom); }
          if (box.r - box.l < 1 || box.b - box.t < 1) return false;
        }
      }
      if (s.position === "absolute") skip = true;
      if (s.position === "fixed") fixed = true;
    }
    return true;
  };

  // ── visual signatures ──
  const alphaOf = (c) => {
    if (!c || c === "transparent") return 0;
    const slash = c.match(/\/\s*([\d.]+)(%?)\s*\)\s*$/); if (slash) return slash[2] ? parseFloat(slash[1]) / 100 : parseFloat(slash[1]);
    const m = c.match(/^rgba\(([^)]+)\)/); if (m) { const p = m[1].split(/[\s,]+/).filter(Boolean); return p.length >= 4 ? parseFloat(p[3]) : 1; }
    return 1;
  };
  const COLOUR_FN = /(?:rgba?|hsla?|color|oklch|oklab|lab|lch)\([^)]*\)/g;
  const shadowSig = (v) => {
    if (!v || v === "none") return "";
    return v.split(/,(?![^()]*\))/).map((layer) => layer.trim()).filter((layer) => {
      const colour = layer.match(COLOUR_FN)?.[0];
      if (colour && alphaOf(colour) === 0) return false;
      const lengths = layer.replace(COLOUR_FN, "").match(/-?[\d.]+px/g)?.map(parseFloat) ?? [];
      return lengths.some((n) => n !== 0);
    }).join(",");
  };
  const borderSig = (s) => ["Top", "Right", "Bottom", "Left"].map((k) => parseFloat(s[`border${k}Width`]) > 0 && !/^(none|hidden)$/.test(s[`border${k}Style`]) && alphaOf(s[`border${k}Color`]) > 0 ? `${s[`border${k}Width`]} ${s[`border${k}Style`]} ${s[`border${k}Color`]}` : "").join("|").replace(/^\|+$/, "");
  const outlineSig = (s) => s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0 && (s.outlineStyle === "auto" || alphaOf(s.outlineColor) > 0) ? `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} ${s.outlineOffset}` : "";
  const paint = (s) => [outlineSig(s), shadowSig(s.boxShadow), borderSig(s), alphaOf(s.backgroundColor) > 0 ? s.backgroundColor : "", s.backgroundImage !== "none" ? s.backgroundImage.slice(0, 60) : "", s.textDecorationLine !== "none" ? `${s.textDecorationLine} ${s.textDecorationStyle} ${s.textDecorationColor}` : ""];
  const pseudoSig = (el, which) => {
    const s = getComputedStyle(el, which);
    if (!s.content || s.content === "none" || s.content === "normal" || s.display === "none" || s.visibility !== "visible" || parseFloat(s.opacity) === 0) return "";
    const parts = paint(s); const text = s.content.replace(/^["']|["']$/g, "");
    if (!parts.some(Boolean) && !text) return "";
    return `${parts.join(";")};${text.slice(0, 12)};${s.opacity};${s.transform};${Math.round(parseFloat(s.width) || 0)}x${Math.round(parseFloat(s.height) || 0)}`;
  };
  const sig = (el) => {
    const s = getComputedStyle(el);
    if (s.display === "none") return "none";
    return [s.visibility, s.opacity, s.color, s.transform, s.filter, ...paint(s), pseudoSig(el, "::before"), pseudoSig(el, "::after")].join("|");
  };
  const tree = (n, max, into) => { let k = 0; for (const d of n.querySelectorAll("*")) { if (d.ownerSVGElement) continue; into.add(d); if (++k >= max) break; } };
  /** What may carry an element's focus indicator: itself + descendants, 2 ancestors, sibling marks, its <label>. */
  const compareSet = (el, rootEl) => {
    const set = new Set([el]); tree(el, 24, set);
    for (let a = el.parentElement, i = 0; a && i < 2 && a !== rootEl && (!rootEl || rootEl.contains(a)) && !a.matches(".pe-card__preview"); a = a.parentElement, i++) set.add(a);
    for (const sib of [el.nextElementSibling, el.previousElementSibling]) if (sib) { set.add(sib); tree(sib, 16, set); }
    const labels = [el.closest("label"), ...(el.id ? document.querySelectorAll(`label[for="${CSS.escape(el.id)}"]`) : [])].filter(Boolean);
    for (const l of labels) { set.add(l); tree(l, 16, set); }
    return set;
  };
  const hoverSet = (el, rootEl) => {
    const set = new Set([el]); tree(el, 16, set);
    for (let a = el.parentElement, i = 0; a && i < 2 && a !== rootEl && (!rootEl || rootEl.contains(a)) && !a.matches(".pe-card__preview"); a = a.parentElement, i++) set.add(a);
    return set;
  };
  const regionOf = (el) => [...B.regionEls.values()].find((r) => r.contains(el)) ?? null;
  const TEXT_ENTRY = "input:not([type='checkbox'], [type='radio'], [type='range'], [type='button'], [type='submit'], [type='reset'], [type='color'], [type='file'], [type='image']), textarea, [contenteditable]:not([contenteditable='false'])";
  /** How a focus finding names its element: description, text field (the caret shows focus), invalid state. */
  const focusInfo = (el) => ({ desc: describe(el), textEntry: el.matches(TEXT_ENTRY), invalid: el.getAttribute("aria-invalid") === "true" || !!el.closest("[data-state*='error']"), readOnly: !!el.readOnly || el.getAttribute("aria-readonly") === "true" || !!el.closest("[data-state='view-only'], [data-state='read-only']") });
  const tabbableControl = (el) => el.matches(KEYBOARD) || (el.hasAttribute("tabindex") && el.tabIndex >= 0);

  // ── regions ──
  const visibleDialogs = () => [...document.querySelectorAll(DIALOG)].filter((d) => B.rendered(d) && B.shown(d));
  const floatingPopups = () => [...document.querySelectorAll(POPUP)].filter((p) => (p.closest(OVERLAY_ROOT) || p.getAttribute("aria-modal") === "true") && !p.closest(SKIP) && B.rendered(p) && B.shown(p));
  B.regions = () => {
    B.regionEls.clear();
    const out = [];
    document.querySelectorAll(".pe-card").forEach((card, i) => {
      const stage = card.querySelector(".pe-card__stage"); if (!stage) return;
      const rid = `c${i}`; B.regionEls.set(rid, stage); out.push({ rid, label: label(stage), playground: false });
    });
    document.querySelectorAll(".platform-example-panel .platform-example-row").forEach((row, i) => {
      const rid = `p${i}`; B.regionEls.set(rid, row); out.push({ rid, label: label(row), playground: true });
    });
    B.baseDialogs = new Set(visibleDialogs());
    B.basePopups = new Set(floatingPopups());
    return out;
  };

  // ── focus walk (focus + keyboard) ──
  B.walkStart = (rid) => {
    const region = B.regionEls.get(rid); if (!region) return false;
    const active = document.activeElement; if (active && active !== document.body) active.blur();
    finish();
    B.rest = new Map();
    for (const el of region.querySelectorAll("*")) if (!el.ownerSVGElement) B.rest.set(el, sig(el));
    B.reached = new Set(); B.seenFocus = new WeakSet(); B.lastFocus = null;
    B.walkCandidates = [...region.querySelectorAll(KEYBOARD)].filter((el) => B.rendered(el) && !disabled(el) && !el.closest(SKIP));
    B.hadTabindex = region.getAttribute("tabindex");
    region.setAttribute("tabindex", "-1");
    region.focus({ preventScroll: true });
    return document.activeElement === region;
  };
  B.walkEnd = (rid) => {
    const region = B.regionEls.get(rid); if (!region) return;
    if (B.hadTabindex === null) region.removeAttribute("tabindex"); else region.setAttribute("tabindex", B.hadTabindex);
  };
  B.inspectFocus = async (rid) => {
    const region = B.regionEls.get(rid);
    let el = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    if (!region || !el || el === document.body || el === region || !region.contains(el)) return { inside: false, portal: !!el?.closest?.(OVERLAY_ROOT), desc: el && el !== document.body ? describe(el) : "" };
    const repeat = B.seenFocus.has(el), same = B.lastFocus === el;
    B.lastFocus = el; B.seenFocus.add(el); B.reached.add(el);
    if (repeat) return { inside: true, repeat, same, desc: describe(el) };
    const skip = !!el.closest(SKIP);
    // The ring itself is judged for the first two elements of each component kind per page (same kind, same ring);
    // text fields always (their ring depends on the field state, e.g. invalid).
    const kind = kindOf(el), judged = B.focusKinds.get(kind) ?? 0, judge = judged < 2 || el.matches(TEXT_ENTRY);
    await sleep(judge ? 24 : 8); finish();
    // Hidden focus target: nothing on screen shows where focus is (a visually hidden input shows it on its mark/label).
    const proxies = [el.closest("label"), el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null, el.nextElementSibling, el.previousElementSibling, el.matches("input") ? el.parentElement : null].filter(Boolean);
    const isHidden = () => !B.shown(el) && !proxies.some((p) => B.shown(p));
    let hidden = isHidden();
    if (hidden) { await sleep(150); finish(); hidden = document.activeElement === el && isHidden(); } // confirm before reporting
    if (!judge) return { inside: true, repeat: false, same, skip, hidden, changed: true, ...focusInfo(el) };
    B.focusKinds.set(kind, judged + 1);
    const ringChanged = () => {
      for (const n of compareSet(el, region)) {
        const before = B.rest.get(n);
        if (before === undefined) { if (region.contains(n) && B.shown(n)) return true; continue; }
        if (sig(n) !== before && B.shown(n)) return true;
      }
      return false;
    };
    let changed = ringChanged();
    if (!changed) { await sleep(150); finish(); changed = document.activeElement !== el || ringChanged(); } // confirm before reporting
    return { inside: true, repeat: false, same, skip, hidden, changed, ...focusInfo(el) };
  };
  /** Candidates Tab never reached; composites with roving tabindex pass when any member (or their owner) was reached. */
  B.unreached = (rid) => {
    const region = B.regionEls.get(rid); if (!region || !B.reached) return [];
    const reached = [...B.reached];
    const refsInto = (comp) => reached.some((r) => ["aria-controls", "aria-owns", "aria-activedescendant"].some((a) => (r.getAttribute(a) ?? "").split(/\s+/).filter(Boolean).some((id) => { const t = document.getElementById(id); return !!t && (t === comp || comp.contains(t) || t.contains(comp)); })));
    const groups = new Map(); const out = [];
    for (const el of B.walkCandidates ?? []) {
      if (!B.rendered(el) || disabled(el) || el.closest(SKIP)) continue; // gone or hidden since the walk started
      if (reached.some((r) => r === el || el.contains(r))) continue;
      const comp = el.closest(COMPOSITE);
      if (comp && region.contains(comp)) {
        if (reached.some((r) => r === comp || comp.contains(r)) || refsInto(comp)) continue;
        const g = groups.get(comp) ?? { el: comp, n: 0 }; g.n += 1; groups.set(comp, g); continue;
      }
      // Stepper buttons beside a spinbutton / number field are kept out of the Tab order by design (APG spinbutton,
      // React Aria NumberField): the field itself takes ArrowUp/ArrowDown — the apg check verifies that it does.
      if (el.getAttribute("tabindex") === "-1") {
        let stepper = false;
        for (let a = el.parentElement, i = 0; a && i < 4 && a !== region; a = a.parentElement, i += 1) {
          const spin = [...a.querySelectorAll("[role='spinbutton'], input[type='number']")];
          if (spin.length) { stepper = spin.some((x) => reached.includes(x)); break; }
        }
        if (stepper) continue;
      }
      if (el.matches("input[type='radio']") && el.name) {
        const mates = [...region.querySelectorAll("input[type='radio']")].filter((m) => m.name === el.name);
        if (mates.some((m) => reached.includes(m))) continue;
        const g = groups.get(`radio:${el.name}`) ?? { el: mates[0], n: 0, radio: true }; g.n += 1; groups.set(`radio:${el.name}`, g); continue;
      }
      // Explicitly taken out of the Tab order (tabindex=-1) is a choice: its action may live elsewhere (Escape clears,
      // an adjacent-month day, a duplicate of the row action) — a warning. A control that cannot take focus is an error.
      out.push(el.getAttribute("tabindex") === "-1" ? { severity: "warn", message: `${describe(el)} is removed from the Tab order (tabindex=-1): make sure its action is reachable another way` } : { severity: "error", message: `${describe(el)} is not keyboard reachable` });
    }
    for (const g of groups.values()) out.push({ severity: "error", message: g.radio ? `radio group of ${describe(g.el)}: no radio is keyboard reachable` : `${describe(g.el)}: none of its ${g.n} item(s) is keyboard reachable` });
    return out;
  };
  /** cursor:pointer on an element that is not a control, holds none, sits in none and has no tabindex (div onClick). */
  B.pointerOnly = (rid) => {
    const region = B.regionEls.get(rid); if (!region) return [];
    const out = [];
    for (const el of region.querySelectorAll("*")) {
      if (el.ownerSVGElement) continue;
      const s = getComputedStyle(el);
      if (s.cursor !== "pointer" || s.pointerEvents === "none") continue;
      if (el.parentElement && el.parentElement !== region && getComputedStyle(el.parentElement).cursor === "pointer") continue; // inherited: report the origin
      if (el.matches(INTERACTIVE) || el.closest(INTERACTIVE) || el.querySelector(INTERACTIVE) || el.closest(SKIP)) continue;
      if (!laidOut(el) || disabled(el)) continue;
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (x >= 0 && y >= 0 && x < innerWidth && y < innerHeight) { const hit = document.elementFromPoint(x, y); if (hit && !el.contains(hit) && hit.closest(INTERACTIVE)) continue; } // covered by a real control
      out.push(`${describe(el)} is clickable but not focusable (div onClick?)`);
    }
    return out;
  };

  // ── hover ──
  const runningText = (a) => { const p = a.parentElement; if (!p || !getComputedStyle(a).display.startsWith("inline")) return false; return [...p.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); };
  const selectedLike = "[aria-selected='true'], [aria-current]:not([aria-current='false']), [aria-pressed='true'], [aria-checked='true'], [data-selected='true']";
  B.collectHover = (rid) => {
    const region = B.regionEls.get(rid); if (!region) return [];
    const SEL = "button, a[href], [role='tab'], [role='option'], [role='menuitem'], [role='menuitemcheckbox'], [role='menuitemradio'], [role='button'], [data-clickable]:not([data-clickable='false']), [data-interactive]:not([data-interactive='false'])";
    const out = [];
    [...region.querySelectorAll(SEL)].forEach((el, i) => {
      const key = `${rid}:h${i}`; B.reg.set(key, el);
      if (!B.rendered(el) || disabled(el) || el.closest(SKIP) || el.matches(selectedLike)) return;
      if (el.matches("input, select, textarea, [role='combobox'], [role='textbox'], [role='slider'], [role='switch'], [role='checkbox'], [role='radio']")) return;
      if (el.closest(".zen-tooltip-anchor")) return; // an explicit <Tooltip> trigger: its hover feedback is the (delayed) tooltip
      const r = el.getBoundingClientRect(); if (r.width < 8 || r.height < 8) return;
      if (el.matches("a") && runningText(el)) return;
      out.push({ key, desc: describe(el), kind: kindOf(el) });
    });
    return out;
  };
  /** Scroll the element into view, let scroll-driven layout settle (collapsing headers), and return a point where the
   *  pointer actually hits it (null when covered). */
  B.pointAt = async (key) => {
    const el = B.reg.get(key); if (!el || !el.isConnected || !B.rendered(el)) return null;
    const v = el.getBoundingClientRect();
    if (v.top < 64 || v.left < 0 || v.bottom > innerHeight - 8 || v.right > innerWidth) {
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
      await sleep(50); finish(); await sleep(16);
    }
    const r = el.getBoundingClientRect();
    for (const [fx, fy] of [[0.5, 0.5], [0.25, 0.5], [0.75, 0.5], [0.5, 0.3], [0.5, 0.7]]) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      const hit = document.elementFromPoint(x, y);
      if (hit && (hit === el || el.contains(hit))) return { x: Math.round(x), y: Math.round(y) };
    }
    return null;
  };
  B.hoverRest = async (key) => {
    const p = await B.pointAt(key); if (!p) return null;
    await sleep(20); finish();
    const el = B.reg.get(key);
    B.hv = new Map([...hoverSet(el, regionOf(el))].map((n) => [n, sig(n)]));
    return p;
  };
  B.hoverCheck = (key) => {
    finish();
    const el = B.reg.get(key); if (!el || !B.hv) return null;
    if (!el.matches(":hover")) return { missed: true }; // layout moved under the pointer: no verdict
    let changed = false;
    for (const [n, s] of B.hv) if (n.isConnected && sig(n) !== s && B.shown(n)) { changed = true; break; }
    return { changed, cursor: getComputedStyle(el).cursor };
  };

  // ── APG keyboard contracts ──
  const tabsOf = (tl) => [...tl.querySelectorAll("[role='tab']")].filter((t) => t.closest("[role='tablist']") === tl && B.rendered(t));
  B.collectApg = (rid, registerOnly) => {
    const region = B.regionEls.get(rid); if (!region) return [];
    const usable = (el) => B.rendered(el) && !disabled(el) && !el.closest(SKIP);
    const groups = {
      tablist: [...region.querySelectorAll("[role='tablist']")],
      toggle: [...region.querySelectorAll("[role='switch'], [role='checkbox']")].filter((el) => !el.matches("input")),
      slider: [...region.querySelectorAll("[role='slider'], input[type='range']")],
      spinbutton: [...region.querySelectorAll("[role='spinbutton'], input[type='number']")].filter((el) => !el.readOnly),
      menu: [...region.querySelectorAll("[aria-haspopup='menu'][aria-expanded], [aria-haspopup='true'][aria-expanded]")].filter((el) => !el.matches("[role='combobox']")),
      popover: [...region.querySelectorAll("[aria-haspopup][aria-expanded]")].filter((el) => /^(dialog|grid|tree)$/.test(el.getAttribute("aria-haspopup")) && !el.matches("[role='combobox']")),
      combobox: [...region.querySelectorAll("[role='combobox'], [aria-haspopup='listbox']")].filter((el) => !el.matches("select")),
      disclosure: [...region.querySelectorAll("button[aria-expanded], [role='button'][aria-expanded]")].filter((el) => !el.matches("[aria-haspopup]:not([aria-haspopup='false']), [role='combobox']")),
    };
    const out = [];
    for (const [pattern, list] of Object.entries(groups)) list.forEach((el, i) => {
      const key = `${rid}:${pattern}${i}`; B.reg.set(key, el);
      if (registerOnly || !usable(el)) return;
      if (pattern === "tablist" && tabsOf(el).filter((t) => !disabled(t)).length < 2) return;
      out.push({ key, pattern, kind: `${pattern}|${kindOf(el)}`, desc: describe(el), enterOk: !(el.matches("input, textarea") && el.form), hp: el.getAttribute("aria-haspopup") ?? "" });
    });
    return out;
  };
  B.focusKey = (key, attr) => {
    const el = B.reg.get(key); if (!el?.isConnected) return null;
    const target = el.matches(KEYBOARD) || el.tabIndex >= 0 ? el : el.querySelector(KEYBOARD) ?? el;
    target.focus();
    const a = document.activeElement;
    return { focused: a === target || el.contains(a), value: attr ? el.getAttribute(attr) : null };
  };
  B.attrOf = (key, attr) => B.reg.get(key)?.getAttribute(attr) ?? null;
  B.tabsStart = (key) => {
    const tl = B.reg.get(key); if (!tl?.isConnected) return null;
    const tabs = tabsOf(tl), enabled = tabs.filter((t) => !disabled(t)); if (enabled.length < 2) return null;
    const sel = enabled.find((t) => t.getAttribute("aria-selected") === "true") ?? enabled[0];
    B.tabsOrig = sel; sel.focus();
    if (document.activeElement !== sel) return null;
    return { start: tabs.indexOf(sel), vertical: tl.getAttribute("aria-orientation") === "vertical" };
  };
  /** Where focus is in the tablist: index among its tabs, and whether it is the first/last (enabled) tab. */
  B.tabsFocus = (key) => {
    const tl = B.reg.get(key); const tabs = tl ? tabsOf(tl) : []; const enabled = tabs.filter((t) => !disabled(t));
    const a = document.activeElement; const index = tabs.indexOf(a);
    return { index, first: index >= 0 && (a === tabs[0] || a === enabled[0]), last: index >= 0 && (a === tabs[tabs.length - 1] || a === enabled[enabled.length - 1]) };
  };
  B.tabsRestore = () => { const t = B.tabsOrig; if (t?.isConnected && t.getAttribute("aria-selected") !== "true") t.click(); };
  const sliderNow = (el) => { const v = el.matches("input") ? el.value : el.getAttribute("aria-valuenow"); return v === null || v === "" ? null : Number(v); };
  B.sliderStart = (key) => {
    const el = B.reg.get(key); if (!el?.isConnected) return null;
    el.focus();
    const max = el.matches("input") ? Number(el.max || 100) : el.hasAttribute("aria-valuemax") ? Number(el.getAttribute("aria-valuemax")) : null;
    return { focused: document.activeElement === el, value: sliderNow(el), max };
  };
  B.sliderValue = (key) => { const el = B.reg.get(key); return el ? sliderNow(el) : null; };
  const spinNow = (el) => { const v = el.matches("input[type='number']") ? el.value : el.getAttribute("aria-valuenow") ?? (el.matches("input") ? el.value.replace(/[^\d.-]/g, "") : null); return v === null || v === "" || Number.isNaN(Number(v)) ? null : Number(v); };
  B.spinStart = (key) => {
    const el = B.reg.get(key); if (!el?.isConnected) return null;
    el.focus();
    return { focused: document.activeElement === el, value: spinNow(el) };
  };
  B.spinValue = (key) => { const el = B.reg.get(key); return el ? spinNow(el) : null; };
  B.popupSnap = () => { B.popBefore = new Set([...document.querySelectorAll(POPUP)].filter((p) => B.rendered(p) && B.shown(p))); };
  /** The popup a trigger opened (its aria-controls target, else a newly visible popup) and where focus is. */
  B.popupState = (key, want) => {
    finish();
    const el = B.reg.get(key); if (!el) return null;
    const live = (p) => B.rendered(p) && B.shown(p);
    const controlled = (el.getAttribute("aria-controls") ?? "").split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)).filter((p) => p && live(p));
    const fresh = [...document.querySelectorAll(POPUP)].filter((p) => live(p) && !B.popBefore?.has(p) && !p.closest(TOOLTIP));
    const candidates = [...controlled, ...fresh];
    const roleSel = want === "menu" ? "[role='menu']" : want === "listbox" ? "[role='listbox']" : null;
    const popup = roleSel ? candidates.map((p) => (p.matches(roleSel) ? p : p.querySelector(roleSel))).find((p) => p && live(p)) ?? null : candidates[0] ?? null;
    const other = popup ? null : candidates[0] ?? null;
    const a = document.activeElement;
    return {
      expanded: el.getAttribute("aria-expanded"),
      open: !!popup,
      other: !!other,
      otherRole: other ? other.getAttribute("role") ?? other.querySelector("[role='menu'], [role='listbox'], [role='dialog'], [role='grid'], [role='toolbar']")?.getAttribute("role") ?? "popup without a role" : "",
      activeIsItem: !!a && !!popup && popup.contains(a) && /^menuitem/.test(a.getAttribute("role") ?? ""),
      enabledItems: popup ? [...popup.querySelectorAll("[role^='menuitem'], [role='option']")].filter((i) => !disabled(i)).length : 0,
      activeOnTrigger: !!a && (a === el || el.contains(a)),
      // Focus thrown out of the example into platform chrome (not into a popup or an overlay layer).
      escaped: !!a && a !== document.body && !!regionOf(el) && !regionOf(el).contains(a) && !a.closest(`${OVERLAY_ROOT}, ${POPUP}`) ? describe(a) : "",
    };
  };
  /** Remember the focused element's look; prevFocusUnchanged() later tells whether it changed once focus moved on. */
  B.markFocus = (rootSel) => {
    const el = document.activeElement;
    if (!el || el === document.body) { B.mark = null; return false; }
    finish();
    const rootEl = (rootSel && el.closest(rootSel)) || el.parentElement;
    B.mark = { el, sigs: new Map([...compareSet(el, rootEl)].map((n) => [n, sig(n)])) };
    return true;
  };
  B.prevFocusUnchanged = () => {
    const m = B.mark; if (!m || !m.el.isConnected || !tabbableControl(m.el)) return null;
    const now = document.activeElement; if (now === m.el) return null;
    finish();
    let compared = 0;
    for (const [n, s] of m.sigs) {
      if (!n.isConnected) return null; // re-rendered: cannot tell
      if (now && now !== document.body && (n.contains(now) || now.contains(n))) continue; // the newly focused element and shared ancestors
      compared += 1;
      if (sig(n) !== s) return null;
    }
    return compared ? focusInfo(m.el) : null;
  };

  // ── clicks (deadclick + dialogs) ──
  const CHOSEN = "[aria-pressed='true'], [data-selected='true'], [data-active='true']";
  /** Clicking it again is a no-op by design: the selected tab/option/page, or the chosen one of a single-choice set
   *  (similar siblings — same tag, role, first class — where only this one is pressed/selected/active). */
  const selectedNoop = (el) => {
    if (el.matches("[aria-selected='true'], [aria-current]:not([aria-current='false']), [role='radio'][aria-checked='true']")) return true;
    if (!el.matches(CHOSEN)) return false;
    const alike = (x) => x.tagName === el.tagName && x.getAttribute("role") === el.getAttribute("role") && x.classList[0] === el.classList[0];
    for (let box = el.parentElement, depth = 0; box && depth < 3; box = box.parentElement, depth += 1) {
      const set = [...box.getElementsByTagName(el.tagName)].filter(alike);
      if (set.length > 1) return set.filter((x) => x.matches(CHOSEN)).length === 1;
    }
    return false;
  };
  B.collectButtons = (rid) => {
    const region = B.regionEls.get(rid); if (!region) return [];
    const out = [], seen = new Set();
    [...region.querySelectorAll("button, [role='button']")].forEach((el, i) => {
      const key = `${rid}:b${i}`; B.reg.set(key, el);
      if (!B.rendered(el) || disabled(el) || el.closest(SKIP) || selectedNoop(el)) return;
      const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return;
      const kind = kindOf(el), desc = describe(el), dup = `${kind}|${desc}`; if (seen.has(dup)) return; seen.add(dup);
      out.push({ key, desc, kind, tooltip: !!el.closest(".zen-tooltip-anchor") });
    });
    return out.slice(0, 40);
  };
  const handle = (o, recs) => {
    for (const rec of recs) {
      if (rec.type === "attributes") {
        if (IGNORE_ATTRS.has(rec.attributeName)) continue;
        if (rec.oldValue === rec.target.getAttribute(rec.attributeName)) continue;
      } else if (rec.type === "characterData") {
        if (rec.oldValue === rec.target.textContent) continue;
      } else {
        const nodes = [...rec.addedNodes, ...rec.removedNodes];
        if (!nodes.length || nodes.every((n) => (n.nodeType === 1 ? n.matches(TOOLTIP) || !!n.closest(TOOLTIP) : !(n.textContent ?? "").trim()))) continue;
      }
      const t = rec.target.nodeType === 1 ? rec.target : rec.target.parentElement;
      if (!t || t.closest(TOOLTIP)) continue;
      const layer = (t === document.body || !!t.closest(OVERLAY_ROOT)) && !t.closest(".zen-toast-stack, .zen-toast");
      if (!(layer || o.region.contains(t) || t.closest(".zen-toast-stack, [aria-live], [role='status'], [role='alert'], [role='log']"))) continue;
      o.muts += 1; if (layer) o.layer = true; if (!o.first) o.first = `${rec.type}${rec.attributeName ? `:${rec.attributeName}` : ""} on ${describe(t)}`;
    }
  };
  B.observeStart = (key) => {
    const el = B.reg.get(key); if (!el?.isConnected || disabled(el) || selectedNoop(el)) return false; // state moved on since collection
    const o = { el, region: regionOf(el) ?? document.body, muts: 0, first: "", active: document.activeElement, href: location.href, anims: new Set(document.getAnimations()), dialogs: new Set(visibleDialogs()) };
    o.observer = new MutationObserver((recs) => handle(o, recs));
    o.observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true, attributeOldValue: true, characterDataOldValue: true });
    B.obs = o;
    return true;
  };
  B.observeChanged = () => {
    const o = B.obs; if (!o) return true;
    if (o.muts) return true;
    const a = document.activeElement;
    if (a && a !== o.active && a !== document.body && a !== o.el && !o.el.contains(a)) return true;
    if (location.href !== o.href) return true;
    for (const an of document.getAnimations()) {
      if (o.anims.has(an)) continue;
      const t = an.effect?.target; if (!t || t.closest?.(TOOLTIP)) continue;
      if (an instanceof CSSTransition && (o.el.contains(t) || t.contains(o.el))) continue; // :active / :focus-within of the button itself
      return true;
    }
    return false;
  };
  B.observeStop = () => {
    const o = B.obs; if (!o) return null;
    handle(o, o.observer.takeRecords());
    const changed = B.observeChanged();
    o.observer.disconnect(); B.obs = null; B.dialogsBefore = o.dialogs;
    const a = document.activeElement;
    return { changed, why: o.first, layer: !!o.layer, away: !!a && a !== document.body && !o.region.contains(a), loadId: B.loadId };
  };
  B.newDialog = () => {
    const before = B.dialogsBefore ?? new Set();
    // Inline role=dialog content re-rendering inside an example (an inline calendar) is not a dialog opening.
    const d = visibleDialogs().find((x) => !before.has(x) && !B.baseDialogs?.has(x) && (!!x.closest(OVERLAY_ROOT) || x.getAttribute("aria-modal") === "true" || x.getAttribute("role") === "alertdialog" || x.matches("dialog")));
    if (!d) return null;
    B.reg.set("dlg", d);
    let modal = d.getAttribute("aria-modal") === "true" || d.getAttribute("role") === "alertdialog";
    try { modal = modal || d.matches("dialog:modal"); } catch { /* :modal unsupported */ }
    const hasClose = [...d.querySelectorAll("button, [role='button']")].some((b) => !disabled(b) && B.rendered(b) && CLOSE_NAME.test(nameOf(b)));
    return { modal, hasClose, desc: describe(d) };
  };
  B.dialogFocus = () => { const d = B.reg.get("dlg"); const a = document.activeElement; return { inside: !!d && !!a && (a === d || d.contains(a)) }; };
  B.dialogStep = () => {
    const d = B.reg.get("dlg"); const a = document.activeElement;
    const inside = !!d && !!a && (a === d || d.contains(a));
    const unchanged = B.prevFocusUnchanged();
    B.markFocus(DIALOG);
    return { inside, unchanged };
  };
  B.dialogClosed = (key) => {
    finish();
    const d = B.reg.get("dlg"); const closed = !d || !d.isConnected || !B.rendered(d) || !B.shown(d);
    const t = B.reg.get(key); const a = document.activeElement;
    return { closed, returned: !!t && !!a && (a === t || t.contains(a)) };
  };
  B.openOverlays = () => floatingPopups().filter((p) => !B.basePopups?.has(p)).length;
  B.closeOverlay = () => {
    const open = floatingPopups().filter((p) => !B.basePopups?.has(p));
    const top = open[open.length - 1]; if (!top) return false;
    const btn = [...top.querySelectorAll("button, [role='button']")].find((b) => !disabled(b) && B.rendered(b) && CLOSE_NAME.test(nameOf(b)));
    if (btn) { btn.click(); return true; }
    const overlay = top.parentElement?.closest("[class*='overlay']");
    if (overlay) { overlay.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); return true; }
    return false;
  };
  /** A spot to click that closes light-dismiss overlays and does nothing else: the card's (or playground's) title. */
  B.emptySpot = (rid) => {
    const region = B.regionEls.get(rid); if (!region) return null;
    const t = region.closest(".pe-card, .platform-example-panel")?.querySelector(".pe-card__titles h3, .pe-card__titles p, h2");
    if (!t) return null;
    t.scrollIntoView({ block: "center", behavior: "instant" });
    const r = t.getBoundingClientRect(); if (!r.width || !r.height) return null;
    return { x: Math.round(r.left + Math.min(r.width / 2, 24)), y: Math.round(r.top + r.height / 2) };
  };
  B.blur = () => { const a = document.activeElement; if (a && a !== document.body) a.blur(); };
}

// ───────────────────────── Node side ─────────────────────────

class OverBudget extends Error {}
/** Two of a kind per page are enough: the same component variant behaves the same (keeps big pages inside the budget). */
const firstOfKind = (S, kind) => { const n = S.kinds.get(kind) ?? 0; S.kinds.set(kind, n + 1); return n < 2; };
const guard = (S) => { if (Date.now() > S.deadline) throw new OverBudget(); };
const ev = (page, fn, a) => page.evaluate(fn, a).catch((e) => { if (VERBOSE) console.error(`    evaluate: ${String(e.message).split("\n")[0]}`); return null; });
const settle = async (page, ms = 80) => { await page.waitForTimeout(ms); await ev(page, () => window.__bhv?.finish()); await page.waitForTimeout(30); };
const normaliseError = (e) => String(e).replace(/https?:\/\/\S+/g, "").replace(/\d+/g, "#").replace(/\s+/g, " ").trim().slice(0, 90);
/** Report an error the page raised while `what` ran, under the check that ran it. */
const drainErrors = (S, check, card, what) => { if (!S.errors.length) return; const first = normaliseError(S.errors[0]); S.errors.length = 0; S.add(check, "error", card, `${what} raised "${first}"`); };

async function load(S) {
  const { page } = S;
  S.loading = true;
  await page.goto(S.url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => undefined);
  await page.addStyleTag({ content: FREEZE_MOTION }).catch(() => undefined);
  S.loading = false;
  await page.waitForTimeout(400);
  await page.mouse.move(PARK.x, PARK.y).catch(() => undefined);
  S.regions = (await ev(page, () => window.__bhv.regions())) ?? [];
  S.loadId = await ev(page, () => window.__bhv.loadId);
  if (!S.loadId) throw new Error("page did not load"); // reported as a run warning, never as a clean page
  await ev(page, () => window.__bhv.finish());
}

/** Escape, click the card title (light dismiss), close what is still open (close button, overlay), reload as a last resort. */
async function reset(S, region, reRegister) {
  const { page } = S;
  await page.keyboard.press("Escape").catch(() => undefined);
  await settle(page, 60);
  const spot = await ev(page, (rid) => window.__bhv.emptySpot(rid), region.rid);
  if (spot) { await page.mouse.click(spot.x, spot.y).catch(() => undefined); await settle(page, 60); }
  let open = await ev(page, () => window.__bhv.openOverlays());
  if (open) { await ev(page, () => window.__bhv.closeOverlay()); await settle(page, 150); open = await ev(page, () => window.__bhv.openOverlays()); }
  if (open) { await page.keyboard.press("Escape").catch(() => undefined); await settle(page, 120); open = await ev(page, () => window.__bhv.openOverlays()); }
  const lid = await ev(page, () => window.__bhv?.loadId ?? null);
  if (open || lid !== S.loadId || page.url() !== S.url) { await load(S); if (reRegister) await reRegister(); }
  await page.mouse.move(PARK.x, PARK.y).catch(() => undefined);
  await ev(page, () => window.__bhv.blur());
}
const resetFocus = async (page) => {
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.mouse.move(PARK.x, PARK.y).catch(() => undefined);
  await ev(page, () => window.__bhv.blur());
};

/** "no visible focus indicator" — an error, but a warn for text fields (the caret still shows where focus is). */
const noFocusRing = (S, card, info, where = "") => {
  const state = info.invalid ? " while invalid" : info.readOnly ? " while read-only" : "";
  if (info.textEntry) S.add("focus", "warn", card, `${info.desc}${where}: text field shows no focus indicator besides the caret${state}`);
  else S.add("focus", "error", card, `${info.desc}${where} has no visible focus indicator${state}`);
};

// ── 1+2. focus + keyboard ──
async function focusWalk(S, region) {
  const { page, add } = S; const card = region.label;
  S.errors.length = 0;
  await page.mouse.move(PARK.x, PARK.y).catch(() => undefined);
  if (!await ev(page, (rid) => window.__bhv.walkStart(rid), region.rid)) return;
  let ended = "cap";
  try {
    for (let i = 0; i < TAB_CAP; i++) {
      guard(S);
      await page.keyboard.press("Tab");
      const r = await ev(page, (rid) => window.__bhv.inspectFocus(rid), region.rid);
      if (!r) { ended = "error"; break; }
      if (!r.inside) { ended = r.portal ? "portal" : "left"; break; }
      if (r.repeat) {
        ended = "trap";
        add("keyboard", "error", card, r.same ? `Tab does not leave ${r.desc} (keyboard trap)` : `Tab cycles back to ${r.desc} without leaving the example (keyboard trap)`);
        break;
      }
      S.stats.stops += 1;
      if (r.skip) continue;
      if (r.hidden) add("focus", "error", card, `${r.desc}: focus lands on an element that is not visible`);
      else if (!r.changed) noFocusRing(S, card, r);
    }
  } finally {
    await ev(page, (rid) => window.__bhv.walkEnd(rid), region.rid);
  }
  if (ended === "portal") add("keyboard", "warn", card, "Tab moves focus into an overlay outside the example");
  if (CHECKS.has("keyboard")) {
    if (ended === "left") for (const f of (await ev(page, (rid) => window.__bhv.unreached(rid), region.rid)) ?? []) add("keyboard", f.severity, card, f.message);
    for (const m of (await ev(page, (rid) => window.__bhv.pointerOnly(rid), region.rid)) ?? []) add("keyboard", "error", card, m);
  }
  drainErrors(S, CHECKS.has("focus") ? "focus" : "keyboard", card, "Tab navigation");
  await ev(page, () => window.__bhv.blur());
}

// ── 5. hover ──
async function hoverPass(S, region) {
  const { page, add } = S; const card = region.label;
  const items = ((await ev(page, (rid) => window.__bhv.collectHover(rid), region.rid)) ?? []).filter((it) => firstOfKind(S, `hover|${it.kind}`));
  for (const it of items) {
    guard(S);
    await page.mouse.move(PARK.x, PARK.y).catch(() => undefined);
    const pos = await ev(page, (k) => window.__bhv.hoverRest(k), it.key);
    if (!pos) continue;
    await page.mouse.move(pos.x, pos.y).catch(() => undefined);
    await page.waitForTimeout(HOVER_WAIT);
    const r = await ev(page, (k) => window.__bhv.hoverCheck(k), it.key);
    S.stats.hovers += 1;
    if (r && !r.missed && !r.changed && r.cursor !== "pointer") add("hover", "warn", card, `${it.desc} has no hover feedback`);
  }
  await page.mouse.move(PARK.x, PARK.y).catch(() => undefined);
}

// ── 4. APG keyboard contracts ──
async function tabsFlow(S, card, it) {
  const { page, add } = S;
  const t0 = await ev(page, (k) => window.__bhv.tabsStart(k), it.key);
  if (!t0) return;
  const next = t0.vertical ? "ArrowDown" : "ArrowRight";
  await page.keyboard.press(next); await settle(page, 60);
  const t1 = await ev(page, (k) => window.__bhv.tabsFocus(k), it.key);
  if (!t1 || t1.index < 0 || t1.index === t0.start) add("apg", "error", card, `${it.desc}: ${next} does not move focus to another tab`);
  else {
    await page.keyboard.press("End"); await settle(page, 60);
    if (!(await ev(page, (k) => window.__bhv.tabsFocus(k), it.key))?.last) add("apg", "warn", card, `${it.desc}: End does not move focus to the last tab`);
    await page.keyboard.press("Home"); await settle(page, 60);
    if (!(await ev(page, (k) => window.__bhv.tabsFocus(k), it.key))?.first) add("apg", "warn", card, `${it.desc}: Home does not move focus to the first tab`);
  }
  await ev(page, () => window.__bhv.tabsRestore());
}
async function toggleFlow(S, card, it) {
  const { page, add } = S;
  const a0 = await ev(page, (k) => window.__bhv.focusKey(k, "aria-checked"), it.key);
  if (!a0?.focused) return;
  await page.keyboard.press("Space"); await settle(page, 60);
  const a1 = await ev(page, (k) => window.__bhv.attrOf(k, "aria-checked"), it.key);
  if (a1 === a0.value) add("apg", "error", card, `${it.desc}: Space does not toggle aria-checked`);
  else { await page.keyboard.press("Space"); await settle(page, 40); }
}
async function sliderFlow(S, card, it) {
  const { page, add } = S;
  const v0 = await ev(page, (k) => window.__bhv.sliderStart(k), it.key);
  if (!v0?.focused) return;
  if (v0.value === null || Number.isNaN(v0.value)) { add("apg", "error", card, `${it.desc}: slider exposes no aria-valuenow`); return; }
  const press = async (key) => { await page.keyboard.press(key); await settle(page, 50); return ev(page, (k) => window.__bhv.sliderValue(k), it.key); };
  if ((await press("ArrowRight")) > v0.value) { await press("ArrowLeft"); return; }
  if ((await press("ArrowUp")) > v0.value) { await press("ArrowDown"); return; }
  if (v0.max !== null && v0.value >= v0.max && (await press("ArrowLeft")) < v0.value) { await press("ArrowRight"); return; }
  add("apg", "error", card, `${it.desc}: ArrowRight/ArrowUp does not increase the value`);
}
async function spinFlow(S, card, it) {
  const { page, add } = S;
  const v0 = await ev(page, (k) => window.__bhv.spinStart(k), it.key);
  if (!v0?.focused || v0.value === null) return; // an empty field has no value to step from
  const press = async (key) => { await page.keyboard.press(key); await settle(page, 50); return ev(page, (k) => window.__bhv.spinValue(k), it.key); };
  if ((await press("ArrowUp")) > v0.value) { await press("ArrowDown"); return; }
  if ((await press("ArrowDown")) < v0.value) { await press("ArrowUp"); return; } // already at its maximum
  add("apg", "error", card, `${it.desc}: ArrowUp/ArrowDown does not change the value`);
}
async function menuFlow(S, card, it) {
  const { page, add } = S;
  const state = () => ev(page, (k) => window.__bhv.popupState(k, "menu"), it.key);
  await ev(page, () => window.__bhv.popupSnap());
  if (!(await ev(page, (k) => window.__bhv.focusKey(k), it.key))?.focused) return;
  await page.keyboard.press("Enter"); await settle(page, 180);
  let s = await state();
  if (s && !s.open && !s.other && s.expanded !== "true") {
    await page.keyboard.press("Escape"); await settle(page, 60);
    await ev(page, (k) => window.__bhv.focusKey(k), it.key);
    await page.keyboard.press("ArrowDown"); await settle(page, 180);
    s = await state();
    if (s?.escaped) add("apg", "error", card, `${it.desc}: ArrowDown moves focus out of the example (a page shortcut takes the key)`);
  }
  if (!s) return;
  if (!s.open) {
    if (!s.other && s.expanded !== "true") { add("apg", "error", card, `${it.desc}: menu button does not open its menu with Enter or ArrowDown`); return; }
    // It opened something that is not a role=menu: aria-haspopup="menu" promises a menu (screen readers announce one).
    // aria-haspopup="true" is held to the popover contract only. Either way Escape must close it and return focus.
    if (it.hp === "menu") add("apg", "error", card, `${it.desc}: aria-haspopup="menu" but it opens a ${s.otherRole || "popup that is not a role=menu"}`);
    await resetFocus(page);
    return popoverFlow(S, card, it);
  }
  if (s.expanded !== "true") add("apg", "error", card, `${it.desc}: aria-expanded is not "true" while the menu is open`);
  await page.keyboard.press("ArrowDown"); await settle(page, 60);
  s = await state();
  if (s && !s.activeIsItem && s.enabledItems === 0) add("apg", "warn", card, `${it.desc}: every item of its menu is disabled and skipped, so ArrowDown reaches none (APG keeps disabled items focusable)`);
  else if (!s?.activeIsItem) add("apg", "error", card, `${it.desc}: ArrowDown does not move focus onto a menu item`);
  else if (CHECKS.has("focus")) {
    // The focused item must look different from the same item once focus moved on.
    await ev(page, () => window.__bhv.markFocus("[role='menu']"));
    await page.keyboard.press("ArrowDown"); await settle(page, 60);
    const same = await ev(page, () => window.__bhv.prevFocusUnchanged());
    if (same) noFocusRing(S, card, same, ` (menu of ${it.desc})`);
  }
  await page.keyboard.press("Escape"); await settle(page, 180);
  s = await state();
  if (s?.open) add("apg", "error", card, `${it.desc}: Escape does not close the menu`);
  else if (s?.expanded === "true") add("apg", "error", card, `${it.desc}: aria-expanded stays "true" after the menu closes`);
  else if (s && !s.activeOnTrigger) add("apg", "error", card, `${it.desc}: focus does not return to the menu button after Escape`);
}
async function popoverFlow(S, card, it) {
  const { page, add } = S;
  const state = () => ev(page, (k) => window.__bhv.popupState(k, null), it.key);
  await ev(page, () => window.__bhv.popupSnap());
  if (!(await ev(page, (k) => window.__bhv.focusKey(k), it.key))?.focused) return;
  await page.keyboard.press("Enter"); await settle(page, 180);
  let s = await state();
  if (!s) return;
  if (!s.open && s.expanded !== "true") { add("apg", "error", card, `${it.desc}: popover trigger does not open with Enter`); return; }
  await page.keyboard.press("Escape"); await settle(page, 180);
  s = await state();
  if (!s) return;
  if (s.open || s.expanded === "true") add("apg", "error", card, `${it.desc}: Escape does not close its popover`);
  else if (!s.activeOnTrigger) add("apg", "error", card, `${it.desc}: focus does not return to the trigger after Escape`);
}
async function comboFlow(S, card, it) {
  const { page, add } = S;
  const state = () => ev(page, (k) => window.__bhv.popupState(k, "listbox"), it.key);
  await ev(page, () => window.__bhv.popupSnap());
  if (!(await ev(page, (k) => window.__bhv.focusKey(k), it.key))?.focused) return;
  await settle(page, 100);
  let s = await state();
  if (s && !s.open) {
    await page.keyboard.press("ArrowDown"); await settle(page, 180); s = await state();
    if (s?.escaped) add("apg", "error", card, `${it.desc}: ArrowDown moves focus out of the example (a page shortcut takes the key)`);
  }
  if (s && !s.open && it.enterOk) {
    await page.keyboard.press("Escape"); await settle(page, 60);
    if ((await ev(page, (k) => window.__bhv.focusKey(k), it.key))?.focused) { await page.keyboard.press("Enter"); await settle(page, 180); s = await state(); }
  }
  if (!s) return;
  if (!s.open) {
    add("apg", "error", card, s.other || s.expanded === "true" ? `${it.desc}: combobox opens a popup that is not a role=listbox` : `${it.desc}: combobox does not open a listbox with ArrowDown or Enter`);
    return;
  }
  await page.keyboard.press("Escape"); await settle(page, 180);
  s = await state();
  if (!s) return;
  if (s.open) add("apg", "error", card, `${it.desc}: Escape does not close the listbox`);
  else if (!s.activeOnTrigger) add("apg", "warn", card, `${it.desc}: focus does not return to the combobox after Escape`);
}
async function disclosureFlow(S, card, it) {
  const { page, add } = S;
  const e0 = await ev(page, (k) => window.__bhv.focusKey(k, "aria-expanded"), it.key);
  if (!e0?.focused) return;
  await page.keyboard.press("Enter"); await settle(page, 120);
  const e1 = await ev(page, (k) => window.__bhv.attrOf(k, "aria-expanded"), it.key);
  if (e1 === e0.value) { add("apg", "error", card, `${it.desc}: Enter does not toggle aria-expanded`); return; }
  // Put it back: Enter again while focus is still on it, else Escape (and Enter on the trigger if still expanded).
  const on = await ev(page, (k) => window.__bhv.focusKey(k, "aria-expanded"), it.key);
  if (on?.value !== e0.value) { await page.keyboard.press("Enter"); await settle(page, 80); }
}
const FLOWS = { tablist: tabsFlow, toggle: toggleFlow, slider: sliderFlow, spinbutton: spinFlow, menu: menuFlow, popover: popoverFlow, combobox: comboFlow, disclosure: disclosureFlow };

async function apgPass(S, region) {
  const { page } = S; const card = region.label;
  const items = ((await ev(page, (rid) => window.__bhv.collectApg(rid), region.rid)) ?? []).filter((it) => firstOfKind(S, it.kind));
  for (const it of items) {
    guard(S);
    S.errors.length = 0;
    await resetFocus(page);
    S.stats.apg += 1;
    if (VERBOSE) console.log(`    apg ${it.pattern}: ${it.desc}`);
    await FLOWS[it.pattern](S, card, it);
    drainErrors(S, "apg", card, `${it.desc} (keyboard)`);
    await reset(S, region, () => ev(page, (rid) => window.__bhv.collectApg(rid, true), region.rid));
  }
}

async function dialogFlow(S, region, trigger, dlg) {
  const { page, add } = S; const card = region.label;
  await settle(page, 120);
  const st = await ev(page, () => window.__bhv.dialogFocus());
  if (!st) return;
  if (dlg.modal && !st.inside) add("apg", "error", card, `${trigger.desc} opens a modal dialog but focus stays outside it`);
  if (dlg.modal && st.inside) {
    // The opening focus is programmatic (no :focus-visible after a pointer click): judge only what Tab reached.
    await ev(page, () => { window.__bhv.mark = null; });
    for (let i = 0; i < DIALOG_TABS; i++) {
      await page.keyboard.press("Tab"); await page.waitForTimeout(40);
      const r = await ev(page, () => window.__bhv.dialogStep());
      if (!r) break;
      if (r.unchanged && CHECKS.has("focus")) noFocusRing(S, card, r.unchanged, ` (in the dialog of ${trigger.desc})`);
      if (!r.inside) {
        add("apg", "error", card, `${trigger.desc} opens a modal dialog that does not keep Tab inside`);
        await ev(page, () => { const d = window.__bhv.reg.get("dlg"); (d?.querySelector("button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])") ?? d)?.focus(); });
        break;
      }
    }
  }
  await page.keyboard.press("Escape"); await settle(page, 250);
  const after = await ev(page, (k) => window.__bhv.dialogClosed(k), trigger.key);
  if (!after) return;
  if (!after.closed) add("apg", dlg.hasClose ? "error" : "warn", card, dlg.hasClose ? `${trigger.desc} opens a dialog that Escape does not close` : `${trigger.desc} opens a dialog that Escape does not close (no close button: intentionally non-dismissable?)`);
  else if (!after.returned) add("apg", "error", card, `${trigger.desc}: focus does not return to it after its dialog closes`);
}

// ── 3. dead clicks (+ dialogs opened by a click, for apg) ──
async function clickPass(S, region) {
  const { page, add } = S; const card = region.label;
  const reportDead = CHECKS.has("deadclick") && !region.playground;
  if (!reportDead && !CHECKS.has("apg")) return;
  const reRegister = () => ev(page, (rid) => window.__bhv.collectButtons(rid), region.rid);
  const buttons = (await reRegister()) ?? [];
  // Dead clicks by component kind: in a repeated kind (4+ in the card, i.e. list rows), once two do nothing and none
  // worked the rest are presumed dead too — one grouped finding instead of a click and a line per row of an inert list.
  const kinds = new Map(), counts = new Map();
  for (const b of buttons) counts.set(b.kind, (counts.get(b.kind) ?? 0) + 1);
  let clicked = 0;
  for (const b of buttons) {
    if (clicked >= CLICK_CAP) break;
    guard(S);
    const k = kinds.get(b.kind) ?? { dead: [], skipped: 0, alive: false }; kinds.set(b.kind, k);
    if (reportDead && k.dead.length >= 2 && !k.alive && counts.get(b.kind) >= 4) { k.skipped += 1; continue; }
    // The same button (kind + name) already worked twice on this page, in other examples: skip the repeat.
    if ((S.working.get(`${b.kind}|${b.desc}`) ?? 0) >= 2) continue;
    const pos = await ev(page, (key) => window.__bhv.pointAt(key), b.key);
    if (!pos) continue;
    await page.mouse.move(pos.x, pos.y).catch(() => undefined);
    await page.waitForTimeout(25);
    if (!await ev(page, (key) => window.__bhv.observeStart(key), b.key)) continue;
    S.errors.length = 0; S.external.hit = false; S.stats.clicks += 1; clicked += 1;
    await page.mouse.down().catch(() => undefined); await page.mouse.up().catch(() => undefined);
    await page.waitForFunction(() => !window.__bhv?.obs || window.__bhv.observeChanged(), null, { timeout: 300, polling: 25 }).catch(() => undefined);
    const o = await ev(page, () => window.__bhv?.observeStop?.() ?? { loadId: window.__bhv?.loadId ?? null });
    if (page.url() !== S.url || o?.loadId !== S.loadId) {
      k.alive = true;
      if (reportDead) add("deadclick", "warn", card, `${b.desc}: click reloads or leaves the page (form submit without preventDefault?)`);
      await load(S); await reRegister();
      continue;
    }
    drainErrors(S, CHECKS.has("deadclick") ? "deadclick" : "apg", card, `clicking ${b.desc}`);
    // An explicit <Tooltip> trigger (truncated name, annotation pin, label info) may do nothing on click by design.
    if (!o?.changed && !S.external.hit) { if (!b.tooltip) k.dead.push(b.desc); continue; }
    k.alive = true; S.working.set(`${b.kind}|${b.desc}`, (S.working.get(`${b.kind}|${b.desc}`) ?? 0) + 1);
    if (VERBOSE && o?.why) console.log(`    ${b.desc} → ${o.why}`);
    if (o?.layer || o?.away || S.external.hit) {
      // Something opened on an overlay layer (dialog, sheet, menu, popover) or focus left the example.
      if (CHECKS.has("apg")) {
        await settle(page, 150);
        const dlg = await ev(page, () => window.__bhv.newDialog());
        if (dlg) { S.stats.dialogs += 1; if (VERBOSE) console.log(`    dialog from ${b.desc}: ${dlg.desc} modal=${dlg.modal} close=${dlg.hasClose}`); await dialogFlow(S, region, b, dlg); }
      }
      await reset(S, region, reRegister);
    } else {
      // An in-place change (a toggle, a counter, an inline panel): Escape is enough to drop transient state.
      await page.keyboard.press("Escape").catch(() => undefined);
    }
  }
  if (!reportDead) return;
  for (const [kind, k] of kinds) {
    if (!k.dead.length) continue;
    if (k.alive || counts.get(kind) < 4 || k.dead.length + k.skipped < 3) for (const d of k.dead) add("deadclick", "warn", card, `${d}: click had no visible effect (no-op handler?)`);
    else {
      // One line per inert repeated kind, named by the kind, its count and its first row (stable across runs).
      const first = buttons.find((b) => b.kind === kind).desc, name = first.match(/ ".*"$/)?.[0] ?? "";
      add("deadclick", "warn", card, `${first.slice(0, first.length - name.length)} ×${counts.get(kind)} (first:${name}): none of the clicks had a visible effect (no-op handlers?)`);
    }
  }
}

async function auditWork(S) {
  await load(S);
  S.stats.regions = S.regions.length;
  const timed = async (name, fn) => { const t = Date.now(); try { await fn(); } finally { S.stats[`t_${name}`] = Math.round((Date.now() - t) / 100) / 10; } };
  if (CHECKS.has("focus") || CHECKS.has("keyboard")) await timed("walk", async () => { for (const region of S.regions) { guard(S); await focusWalk(S, region); } });
  if (CHECKS.has("hover")) await timed("hover", async () => { for (const region of S.regions) { guard(S); await hoverPass(S, region); } });
  if (CHECKS.has("apg")) await timed("apg", async () => { for (const region of S.regions) { guard(S); await apgPass(S, region); } });
  if (CHECKS.has("deadclick") || CHECKS.has("apg")) await timed("click", async () => { for (const region of S.regions) { guard(S); await clickPass(S, region); } });
}

/** Audit a page; when the shared dev server disturbed it (HMR from another session's edit, a 5xx, a reload we did not
 *  start) run it once more, so concurrent edits never turn into findings. */
async function auditPage(context, id) {
  let res = await auditOnce(context, id);
  if (res.env) {
    if (VERBOSE) console.log(`    ${id}: the dev server reloaded/updated the page during the run — running it again`);
    res = await auditOnce(context, id);
    if (res.env) res.findings.push({ check: "run", severity: "warn", card: "page", message: "the dev server hot-updated or reloaded the page during the run (concurrent edits): results may be incomplete" });
  }
  return res;
}

async function auditOnce(context, id) {
  const page = await context.newPage();
  const findings = [], keys = new Set();
  const S = {
    page, id, url: `${BASE}/?page=${id}`, errors: [], external: { hit: false }, deadline: Date.now() + BUDGET, loadId: null, regions: [], closed: false, kinds: new Map(), working: new Map(), env: false, loading: false, stats: { regions: 0, stops: 0, hovers: 0, apg: 0, clicks: 0, dialogs: 0 },
    add: (check, severity, card, message) => {
      if (S.closed || (!CHECKS.has(check) && check !== "timeout" && check !== "run")) return;
      const k = `${check}|${card}|${message}`; if (keys.has(k)) return; keys.add(k);
      findings.push({ check, severity, card, message });
    },
  };
  page.on("pageerror", (e) => S.errors.push(e.message.split("\n")[0]));
  page.on("console", (m) => {
    if (ENV_NOISE.test(m.text())) S.env = true;
    if (m.type() === "error" && !IGNORED_CONSOLE.test(m.text())) S.errors.push(m.text().split("\n")[0].slice(0, 200));
  });
  page.on("domcontentloaded", () => { if (!S.loading && S.loadId) S.env = true; }); // a new document we did not load (HMR full reload)
  page.on("filechooser", (fc) => { S.external.hit = true; fc.setFiles([]).catch(() => undefined); });
  page.on("download", (d) => { S.external.hit = true; d.cancel().catch(() => undefined); });
  page.on("popup", (p) => { S.external.hit = true; p.close().catch(() => undefined); });
  page.on("dialog", (d) => { S.external.hit = true; d.dismiss().catch(() => undefined); });
  const budgetNote = `page exceeded the ${BUDGET / 1000}s behaviour budget (remaining checks skipped)`;
  const work = auditWork(S).then(() => "done", (e) => {
    if (e instanceof OverBudget) S.add("timeout", "warn", "page", budgetNote);
    else if (!S.closed) { S.add("run", "warn", "page", `behaviour run aborted: ${normaliseError(e?.message ?? e)}`); if (VERBOSE) console.error(e); }
    return "failed";
  });
  let timer;
  const hard = new Promise((resolve) => { timer = setTimeout(resolve, BUDGET + 20000, "hard"); });
  const result = await Promise.race([work, hard]);
  clearTimeout(timer);
  if (result === "hard") S.add("timeout", "warn", "page", budgetNote);
  S.closed = true;
  await page.close().catch(() => undefined);
  await Promise.race([work, new Promise((resolve) => setTimeout(resolve, 5000))]);
  return { findings, stats: S.stats, env: S.env };
}

const readBaseline = () => { try { return JSON.parse(fs.readFileSync(BASELINE, "utf8")); } catch { return { keys: {} }; } };
const countBy = (list) => Object.entries(list.reduce((acc, f) => ({ ...acc, [f.check]: (acc[f.check] ?? 0) + 1 }), {})).map(([k, n]) => `${k}:${n}`).join(" ");

async function run() {
  const unknown = [...CHECKS].filter((c) => !ALL_CHECKS.includes(c));
  if (unknown.length) { console.error(`Unknown check(s): ${unknown.join(", ")}. Use --checks=${ALL_CHECKS.join(",")}`); process.exit(2); }
  // A dead dev server would make every page look clean: fail the gate instead.
  const up = await fetch(`${BASE}/`).then((r) => r.ok).catch(() => false);
  if (!up) { console.error(`✗ The platform dev server is not reachable at ${BASE} (start it with npm run dev).`); process.exit(2); }
  const baseline = NO_BASELINE ? { keys: {} } : readBaseline();
  const report = { base: BASE, date: new Date().toISOString(), viewports: VIEWPORTS, checks: [...CHECKS], pages: {} };
  const browser = await chromium.launch();
  const started = Date.now();
  try {
    for (const width of VIEWPORTS) {
      const mobile = width < 768;
      const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 1000 }, reducedMotion: "reduce", deviceScaleFactor: 1 });
      await context.addInitScript(freezeMotionInit, FREEZE_MOTION);
      await context.addInitScript(installHelpers);
      for (const id of PAGES) {
        const t0 = Date.now();
        const key = `${id}@${width}`;
        const { findings, stats } = await auditPage(context, id);
        const seen = new Map();
        for (const f of findings) {
          const k = `${key}|${f.check}|${f.card}|${f.message}`;
          const n = (seen.get(k) ?? 0) + 1; seen.set(k, n);
          f.new = n > (baseline.keys?.[k] ?? 0);
        }
        report.pages[key] = findings;
        const fresh = findings.filter((f) => f.new);
        const mark = fresh.some((f) => f.severity === "error") ? "✗" : fresh.length ? "⚠" : "✓";
        console.log(`${mark} ${key.padEnd(30)} ${findings.length ? countBy(findings) : "clean"}${fresh.length ? ` · ${fresh.length} new` : ""} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
        if (VERBOSE) console.log(`    probed: ${Object.entries(stats).map(([k, n]) => `${k} ${n}`).join(" · ")}`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  let newErrors = 0, known = 0;
  const lines = [], knownLines = [];
  for (const [key, list] of Object.entries(report.pages)) {
    const old = list.filter((f) => !f.new);
    known += old.length;
    if (old.length) knownLines.push(`  ${key.padEnd(30)} ${old.length} known (${countBy(old)})`);
    for (const f of list.filter((x) => x.new)) {
      if (f.severity === "error") newErrors += 1;
      lines.push(`${f.severity === "error" ? "✗" : "⚠"} NEW [${f.check}] ${key} › ${f.card}: ${f.message}`);
    }
  }
  console.log(`\n${lines.join("\n") || "No new findings."}`);
  if (knownLines.length) console.log(`\nKnown (baseline) findings:\n${knownLines.join("\n")}`);
  if (OUT) { fs.writeFileSync(path.resolve(String(OUT)), JSON.stringify(report, null, 2)); console.log(`\nReport → ${OUT}`); }
  if (UPDATE) {
    // Re-measure only what ran (pages × checks); keep every other key of the file.
    const previous = readBaseline().keys ?? {};
    const keys = {};
    for (const [k, n] of Object.entries(previous)) {
      const [pv, check, , message = ""] = k.split("|");
      // Focus rings inside dialogs / menus are only seen while the apg flows run.
      const needs = check === "timeout" || check === "run" ? [] : check === "focus" && /\((in the dialog|menu) of /.test(message) ? ["focus", "apg"] : [check];
      if (report.pages[pv] && needs.every((c) => CHECKS.has(c))) continue; // re-measured by this run
      keys[k] = n;
    }
    for (const [pv, list] of Object.entries(report.pages)) for (const f of list) { const k = `${pv}|${f.check}|${f.card}|${f.message}`; keys[k] = (keys[k] ?? 0) + 1; }
    const sorted = Object.fromEntries(Object.entries(keys).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(BASELINE, `${JSON.stringify({ generated: new Date().toISOString(), keys: sorted }, null, 2)}\n`);
    console.log(`\nBaseline → ${path.relative(root, BASELINE)} (${Object.keys(sorted).length} keys)`);
  }
  const secs = ((Date.now() - started) / 1000).toFixed(0);
  console.log(`\n${newErrors && !UPDATE ? `✗ ${newErrors} new error-level finding(s)` : "✓ No new error-level findings"} across ${Object.keys(report.pages).length} page runs (${known} known, ${secs}s).`);
  process.exit(newErrors && !UPDATE ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(2); });
