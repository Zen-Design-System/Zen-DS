#!/usr/bin/env node
// Zen DS usage harness — the rule registry: machine-checkable rules from docs/guidelines/*.md.
// The scanner lives in engine.mjs, the command line in cli.mjs (`zen-usage`), the ESLint plugin in eslint.mjs.
//
//   node tools/usage-guard/check-usage.mjs [files or dirs…]   check (default: platform, components, styles, templates)
//   node tools/usage-guard/check-usage.mjs --list              print the rule registry as JSON (for AI agents)
//
// Errors exit 1; warnings are printed only. Suppress one occurrence with a comment containing
// `zen-allow-<allow>: <reason>` within the four lines above the element (the reason is mandatory by convention).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { classesOf, interactionRe, layoutClasses, learnLayoutClasses, loadLayoutClasses } from "./engine.mjs";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
/** A Zen-DS checkout (sources present) rather than the installed package (dist + docs only). */
export const isRepo = fs.existsSync(path.join(root, "src/components"));
/** Shipped with the package by `npm run build:lib` (Zen's own layout classes; the package has no src/**\/*.css). */
const packagedContext = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, "dist/usage-context.json"), "utf8")); } catch { return null; } })();
const INPUTS = ["InputField", "SelectField", "DateField", "NumberField", "TextAreaField", "AutocompleteField", "RichTextField"];
const FOCUSABLE_TRIGGERS = ["Button", "IconButton", "button", "a", "Chip", "Link", "input", "TabItem", "Toggle", ...INPUTS, "Search"];

/* ── attribute helpers ─────────────────────────────────────────────── */
// A spread ({...props}) or a template interpolation (${…} in generated code samples) may supply any prop,
// so presence checks treat it as "maybe present" instead of reporting a false positive.
// An elided code sample (`<IconButton aria-label="Bold" … />`) may hold any prop too.
const opaque = (attrs) => /\{\s*\.\.\.|\$\{|…/.test(attrs);
// `has` is strict (used by prohibitions); `present` is lenient (used by requirements).
const has = (attrs, name) => new RegExp(`(^|[\\s{])${name}(=|\\s|$|/)`).test(attrs);
const present = (attrs, name) => has(attrs, name) || opaque(attrs);
const literal = (attrs, name) => attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
const expr = (attrs, name) => { const i = attrs.search(new RegExp(`(?:^|\\s)${name}=\\{`)); if (i < 0) return undefined; let d = 0, j = attrs.indexOf("{", i); const s = j; for (; j < attrs.length; j++) { if (attrs[j] === "{") d++; else if (attrs[j] === "}" && --d === 0) break; } return attrs.slice(s + 1, j); };
const value = (attrs, name) => literal(attrs, name) ?? expr(attrs, name);
// Top-level attributes only: every {…} expression is collapsed so props of nested elements don't count.
const topLevel = (attrs) => { let out = "", depth = 0; for (const ch of attrs) { if (ch === "{") { if (depth++ === 0) out += "{"; } else if (ch === "}") { if (--depth === 0) out += "}"; } else if (depth === 0) out += ch; } return out; };
const named = (a) => present(a, "aria-label") || present(a, "aria-labelledby");
const text = (children) => children.replace(/<[^>]*>/g, " ").replace(/\{[^}]*\}/g, " x ").replace(/\s+/g, " ").trim();
/** Top-level attributes with their values: Map(name → { expr } | { literal } | { bare: true }); nested elements' props are skipped. */
const topAttrs = (attrs) => {
  const out = new Map();
  for (let i = 0; i < attrs.length;) {
    const m = /^\s*([A-Za-z_][\w:.-]*)/.exec(attrs.slice(i));
    if (!m) { i += 1; continue; }
    const name = m[1]; i += m[0].length;
    if (attrs[i] !== "=") { out.set(name, { bare: true }); continue; }
    i += 1;
    if (attrs[i] === "\"" || attrs[i] === "'") { const close = attrs.indexOf(attrs[i], i + 1); out.set(name, { literal: attrs.slice(i + 1, close) }); i = close < 0 ? attrs.length : close + 1; continue; }
    if (attrs[i] !== "{") continue;
    let depth = 0, j = i;
    for (; j < attrs.length; j++) { if (attrs[j] === "{") depth++; else if (attrs[j] === "}" && --depth === 0) break; }
    out.set(name, { expr: attrs.slice(i + 1, j) }); i = j + 1;
  }
  return out;
};
// A handler that does nothing: () => {}, () => undefined, (value) => null, () => void 0 (interaction/no-noop-handler).
const NOOP_FN = /^\s*(async\s*)?\(\s*[\w\s,]*\)\s*=>\s*(\{\s*\}|undefined|null|void 0)\s*$/;
const NOOP_KEY = /\b(on[A-Z]\w*)\s*:\s*(async\s*)?\(\s*[\w\s,]*\)\s*=>\s*(\{\s*\}|undefined|null|void 0)\s*[,}]/;
/** Props that take action objects ({ label, onClick }) or lists of them. */
const ACTION_OBJECTS = /^(action|primaryAction|secondaryAction|actions|items)$/;
/** Inside a template string (the platform's code samples): documentation, not a live example. */
const inCodeSample = (src, end) => ((src.slice(0, end).match(/(?<!\\)`/g) ?? []).length) % 2 === 1;
// interaction/action-without-handler: actions passed with no handler at all (the no-op rule only sees empty ones).
/** Text parts of template literals (code samples), as [from, to) ranges: one pass per file, cached. Unlike inCodeSample's
 *  backtick count it follows `${…}`, so a sample nested in a playground's code (`${flag ? `<Button …>` : ""}`) counts
 *  too. Comments are skipped (their backticks are prose). */
let sampleSource = null, sampleRanges = [];
const templateText = (src) => {
  if (src === sampleSource) return sampleRanges;
  const ranges = [], stack = [];
  for (let i = 0; i < src.length; i++) {
    const ch = src[i], top = stack[stack.length - 1];
    if (top?.text) {
      if (ch === "\\") i += 1;
      else if (ch === "`") { ranges.push([top.from, i]); stack.pop(); }
      else if (ch === "$" && src[i + 1] === "{") { ranges.push([top.from, i]); stack.push({ depth: 0 }); i += 1; }
      continue;
    }
    if (ch === "/" && src[i + 1] === "*" && /[\s{}()[\];,:=?|&!>]/.test(src[i - 1] ?? "\n")) { const close = src.indexOf("*/", i + 2); i = close < 0 ? src.length : close + 1; continue; }
    if (ch === "/" && src[i + 1] === "/" && /[\s;{}(),]/.test(src[i - 1] ?? "\n")) { const eol = src.indexOf("\n", i); i = eol < 0 ? src.length : eol; continue; }
    if (ch === "`") stack.push({ text: true, from: i + 1 });
    else if (top && ch === "{") top.depth += 1;
    else if (top && ch === "}") { if (top.depth > 0) top.depth -= 1; else { stack.pop(); stack[stack.length - 1].from = i + 1; } }
  }
  sampleSource = src; sampleRanges = ranges;
  return ranges;
};
const inTemplateText = (src, index) => templateText(src).some(([from, to]) => index >= from && index < to);
/** Component internals get their handlers through props: the rule judges the repo's demo code (platform examples and
 *  playgrounds, templates, fixtures), never src/components, and never apps (repoOnly). */
const COMPONENT_SOURCE = /(^|[\\/])src[\\/]components[\\/]/;
/** Action-object props ({ icon?, label, onClick? }): without onClick the action is drawn, focusable, and does nothing.
 *  Dialog, ModalForm, SidePanel and BottomSheet are left out on purpose: they give ModalActions an onDefault that
 *  closes the overlay, so their actions without onClick close it (the documented default). */
const ACTION_PROPS = {
  TopNavigation: ["leading", "trailing", "largeTitleAction"], TopNavigationActionButton: ["action"], BottomNavigation: ["action"],
  EmptyState: ["primaryAction", "secondaryAction"],
  AlertBanner: ["action"], InlineMessage: ["action"], Toast: ["action"], ActionBar: ["primaryAction", "secondaryAction"],
  Card: ["subAction"], MetricCard: ["subAction"], AiChatBubble: ["actions"], AiChatBlock: ["suggestions"],
  ModalActions: ["primaryAction", "secondaryAction", "tertiaryAction"], // only without onDefault
};
/** Lists whose entries are pressed through the component's handler. `own`: an entry can bring its own (onSelect,
 *  href), so only literal entries are judged; otherwise a list without the handler is dead whatever it holds. */
const ITEM_LISTS = {
  Menu: { props: ["items"], handler: "onSelect", own: true },
  Breadcrumbs: { props: ["items"], handler: "onNavigate", own: true },
  Sidebar: { props: ["sections"], handler: "onItemClick", own: true },
  SidebarSubMenu: { props: ["items", "sections"], handler: "onItemClick", own: true },
  BottomSheet: { props: ["items"], handler: "onSelect", own: false },
  Popover: { props: ["items"], handler: "onSelect", own: false },
  BottomNavigation: { props: ["items"], handler: "onValueChange", own: false },
};
/** Props that make a button do something when pressed. */
const PRESS_PROPS = ["onClick", "onPointerDown", "onPointerUp", "onMouseDown", "onMouseUp", "href", "to", "form"];
/** Object literals in an expression, with their nesting depth among objects. A `{` after `=`, `>` or a word is a JSX
 *  container or a block, not an object: it is skipped with everything inside it. Strings are skipped. */
const objectLiterals = (source) => {
  const out = [], open = [];
  for (let i = 0, quote = null; i < source.length; i++) {
    const ch = source[i];
    if (quote) { if (ch === "\\") i += 1; else if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "{") {
      const before = source.slice(0, i).trimEnd().slice(-1);
      if (before && !"([,:?|&".includes(before)) { // skip a JSX container or a block
        for (let depth = 0, q = null; i < source.length; i++) { const c = source[i]; if (q) { if (c === "\\") i += 1; else if (c === q) q = null; } else if (c === '"' || c === "'" || c === "`") q = c; else if (c === "{") depth += 1; else if (c === "}" && --depth === 0) break; }
        continue;
      }
      open.push(i);
    } else if (ch === "}" && open.length) { const from = open.pop(); out.push({ from, depth: open.length, text: source.slice(from, i + 1) }); }
  }
  return out.sort((a, b) => a.from - b.from);
};
/** Top-level properties of an object literal: Map(key → value source); `{ label, onClick }` shorthand gives "", a spread "...". */
const objectProps = (literal) => {
  const body = literal.slice(1, -1), props = new Map();
  const take = (segment) => {
    const s = segment.trim(); if (!s) return;
    if (s.startsWith("...")) { props.set("...", s.slice(3)); return; }
    const m = s.match(/^(?:["']([^"']+)["']|([A-Za-z_$][\w$]*))\s*(?::([\s\S]*))?$/) ?? s.match(/^()([A-Za-z_$][\w$]*)\s*\(/);
    if (m) props.set(m[1] || m[2], m[3]?.trim() ?? "");
  };
  let depth = 0, start = 0;
  for (let i = 0, quote = null; i < body.length; i++) {
    const ch = body[i];
    if (quote) { if (ch === "\\") i += 1; else if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if ("{[(".includes(ch)) depth += 1;
    else if ("}])".includes(ch)) depth -= 1;
    else if (ch === "," && depth === 0) { take(body.slice(start, i)); start = i + 1; }
  }
  take(body.slice(start));
  return props;
};
/** Pressing it does something: its own handler or link, a submit, or props spread in from elsewhere. */
const handlesPress = (props) => ["onClick", "onSelect", "href", "to", "..."].some((key) => props.has(key)) || /["'`]submit["'`]/.test(props.get("type") ?? "");
/** An entry someone can press: a label or an icon, not a section/group holding other entries, not pinned disabled. */
const pressable = (props) => (props.has("label") || props.has("icon")) && !props.has("items") && !props.has("children")
  && !/^["'`](separator|group)["'`]$/.test(props.get("type") ?? "") && props.get("disabled") !== "true";
const actionName = (props) => { const v = props.get("label") ?? props.get("aria-label") ?? ""; return `"${(v.match(/^["'`]([^"'`]*)["'`]$/)?.[1] ?? v).slice(0, 40) || "unnamed"}"`; };
/** Props spread in (`{...rest}`) may bring the handler. (Not `opaque`: live code builds names with `${…}` too.) */
const spreadsProps = (attrs) => /(^|\s)\{\s*\.\.\./.test(attrs);
/** The element at `start` sits inside the `prop={…}` expression of an enclosing tag (a Menu's trigger). */
const insideProp = (src, start, prop) => {
  const from = src.lastIndexOf(`${prop}={`, start); if (from < 0 || start - from > 600) return false;
  let depth = 0;
  for (let i = from + prop.length + 1; i < start; i++) { if (src[i] === "{") depth += 1; else if (src[i] === "}") depth -= 1; }
  return depth > 0;
};
/** A bare boolean or `{true}`: the state is pinned for the whole example. */
const pinnedOn = (own, name) => own.get(name)?.bare === true || /^\s*true\s*$/.test(own.get(name)?.expr ?? "");

/* ── rule registry ─────────────────────────────────────────────────── */
// Each rule: id, components (JSX tag names), severity, allow (suppression token), guideline, summary, check(ctx) → message | null.
// Border contract (docs/component-usage-rules.md §6): only the border of a CLOSED container is covered —
// all-sides border/border-color/outline, a 0 0 0 1px ring or an SVG stroke. Single edges and lines are not.
const closedBorder = (body, tone) => new RegExp(
  `(^|[;{\\s])(border|border-color|outline|stroke)\\s*:[^;]*--zen-color-border-neutral-${tone}-` +
  `|box-shadow\\s*:[^;]*\\b0\\s+0\\s+0\\s+(1px|var\\([^)]*\\))\\s+var\\(--zen-color-border-neutral-${tone}-`).test(body);
// Dashed strokes always step up to Neutral/Subtle (§6 "Dividers and dashed strokes"); returns the offending declaration.
// §9: an outer (elevation) shadow — not inset, not a 0 0 0 Npx ring, not an empty/transparent layer, and not a
// component shadow guarded by `var(--…-shadow-off, …)` (the token build empties it where the fill is tinted).
const outerShadow = (value) => {
  const v = (value ?? "").trim();
  if (!v || v === "none" || /^var\(--[a-z0-9-]+-shadow-off,/.test(v)) return false;
  return v.split(/,(?![^()]*\))/).map((layer) => layer.trim()).some((layer) => layer && !/\binset\b/.test(layer)
    && !/^0(px)?\s+0(px)?\s+0(px)?\s+[\d.]+px\b/.test(layer) && !/#0000\b|transparent|rgba?\([^)]*,\s*0\)/.test(layer)
    && (/--zen-style-[a-z0-9-]*shadow\b/.test(layer) || /^-?[\d.]+(px)?\s+-?[\d.]+(px)?\s+[\d.]+px/.test(layer)));
};
// §11: Canvas/Alt and Surface/Default are the same colour in every mode, so a Surface/Default box on a Canvas/Alt page needs a
// closed border (any all-sides border / outline, or a 0 0 0 Npx ring in a --zen-color-border-* token). A shadow alone does not count.
const hasFrame = (body) => /(^|[;{\s])(border|outline)(-color)?\s*:[^;]*--zen-color-border-/.test(body)
  || /box-shadow\s*:[^;]*\b0(px)?\s+0(px)?\s+0(px)?\s+[\d.]+px\s+var\(--zen-color-border-/.test(body);
/** Selectors in the same stylesheet that paint Canvas/Alt. */
const canvasAltPainters = (src) => [...src.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, , body]) => /(^|[;{\s])background(-color)?\s*:[^;]*--zen-color-background-canvas-alt\b/.test(body))
  .flatMap(([, sel]) => sel.split(",").map((part) => part.trim()).filter(Boolean));
const isDashed = (body) => /\bdashed\b|stroke-dasharray\s*:/.test(body);
const weakDash = (body) => isDashed(body) && (body.match(/(^|[;{\s])(border(-[\w-]+)?|outline(-color)?|stroke)\s*:[^;]*/g) ?? [])
  .map((d) => d.trim()).find((d) => !/--zen-color-border-neutral-subtle-/.test(d) && /(#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|var\(--zen-color-)/i.test(d));
const isMedia = (selector) => /avatar|photo|image|img|visual|illustration|graphic|thumb|media/i.test(selector);
const actionableWord = /^(button|btn|input|field|control|trigger|chip|tag|segmented|segment|checkbox|radio|toggle|switch|select|picker|search|option|tab|link|dropzone|upload|stepper|selectable|clickable|interactive|swatch)$/i;
const isActionable = ({ selector, interactive }) => interactionRe.test(selector)
  || classesOf(selector).some((c) => interactive.has(c) || c.split(/[-_]+/).some((w) => actionableWord.test(w)));

// Number of `{ id: … }` entries in a literal array prop (undefined when the prop is a variable).
// Elided samples ("…"), spreads, template interpolations and mapped arrays are not counted.
const literalCount = (attrs, name) => { const v = expr(attrs, name); return v && /^\s*\[/.test(v) && !/…|\.\.\.|\$\{|\.map\(/.test(v) ? (v.match(/\{\s*id\s*:/g) ?? []).length : undefined; };
// The next sibling element after `end`, skipping whitespace and {/* comments */}.
const nextSibling = (src, end) => { const rest = src.slice(end).replace(/^(\s|\{\/\*[\s\S]*?\*\/\})*/, ""); const tag = rest.match(/^<([A-Za-z]+)\b([^>]*)/); return tag && { tag: tag[1], attrs: tag[2] }; };
/** Layout facts per CSS class (engine.mjs): learned from every stylesheet under src/ in the repo, from the packaged context otherwise. */
if (isRepo) {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? walk(path.join(dir, d.name)) : d.name.endsWith(".css") ? [path.join(dir, d.name)] : []);
  for (const file of walk(path.join(root, "src"))) learnLayoutClasses(fs.readFileSync(file, "utf8"));
} else loadLayoutClasses(packagedContext?.layoutClasses);
const classList = (attrs) => (literal(attrs, "className") ?? expr(attrs, "className") ?? "").match(/[\w-]+/g) ?? [];
/** How a parent lays out its children across the row: "grid" (justify-items stretch), "column" (flex column, align-items stretch) or null. */
const stretchKind = (attrs) => {
  const style = expr(attrs, "style") ?? "", cls = classList(attrs);
  const grid = /display\s*:\s*["'](inline-)?grid["']/.test(style) || (!/display\s*:/.test(style) && cls.some((c) => layoutClasses.grid.has(c)));
  const column = /flexDirection\s*:\s*["']column/.test(style) || (!/display\s*:\s*["']grid/.test(style) && cls.some((c) => layoutClasses.column.has(c)));
  if (grid) return /justifyItems\s*:\s*["'](?!stretch)/.test(style) || cls.some((c) => layoutClasses.keepsJustify.has(c)) ? null : "grid";
  if (column) return /alignItems\s*:\s*["'](?!stretch)/.test(style) || cls.some((c) => layoutClasses.keepsAlign.has(c)) ? null : "column";
  return null;
};
/** Every size prop takes the short scale (sm, md…) or the long Figma spelling (small, medium…): compare through `step()`. */
const LONG_STEP = { "3xsmall": "3xs", "2xsmall": "2xs", "2-xsmall": "2xs", xsmall: "xs", small: "sm", medium: "md", large: "lg", xlarge: "xl", "2xlarge": "2xl", "2-xlarge": "2xl", "3xlarge": "3xl", "3-xlarge": "3xl" };
const step = (size) => (size === undefined ? undefined : LONG_STEP[size] ?? size);
const SMALL_BUTTON = /^(2xs|xs|sm|2xsmall|xsmall|small)$/;
/** Back navigation (label "Back" / "Go back" / "Quay lại") drawn with a left arrow instead of the chevron. */
const BACK_LABEL = /^\s*(back|go back|quay lại|trở lại)\b/i;
const ARROW_LEFT = /icon-arrow(-narrow)?-left-/;
const backArrowObject = (source) => [...(source ?? "").matchAll(/\{[^{}]*\}/g)].some(([o]) => ARROW_LEFT.test(o) && /label\s*:\s*["'`]\s*(back|go back|quay lại|trở lại)\b/i.test(o));
/** Every icon name (src/icons/generated/names.ts in the repo, dist/icons/generated/names.js in the package). */
const ICON_NAMES = (() => {
  for (const dir of ["src/icons/generated", "dist/icons/generated"]) {
    const ext = dir.startsWith("src") ? "ts" : "js";
    try {
      const src = fs.readFileSync(path.join(root, dir, `names.${ext}`), "utf8");
      const names = new Set(src.slice(src.indexOf("iconNames")).match(/"(?:icon|ic)-[a-z0-9-]+"/g).map((q) => q.slice(1, -1)));
      // Plain aliases of icons that only come in cuts (icon-search-line → icon-search-medium-line) are valid too.
      try { for (const [, alias] of fs.readFileSync(path.join(root, dir, `aliases.${ext}`), "utf8").matchAll(/"((?:icon|ic)-[a-z0-9-]+)":/g)) names.add(alias); } catch { /* a build without aliases */ }
      return names;
    } catch { /* next */ }
  }
  return null;
})();
/** Words from other icon sets → Zen's (icon-close-line → icon-x-…, icon-gear-line → icon-settings-…). */
const ICON_SYNONYMS = { close: ["x"], cross: ["x"], dismiss: ["x"], magnifier: ["search"], find: ["search"], bin: ["trash"], garbage: ["trash"], gear: ["settings"], cog: ["settings"], more: ["dots"], ellipsis: ["dots"], kebab: ["dots"], pencil: ["edit"], add: ["plus"], person: ["user"], profile: ["user"], account: ["user"], notification: ["bell"], back: ["chevron", "left"], forward: ["chevron", "right"], email: ["mail"], hamburger: ["menu"] };
/** The closest icon names to a wrong one: most shared words, then shortest edit distance (icon-search-line → icon-search-medium-line). */
const closestIcons = (name, count = 3) => {
  const words = name.replace(/^(icon|ic)-/, "").split("-").flatMap((word) => [word, ...(ICON_SYNONYMS[word] ?? [])]);
  const distance = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
  const meaningful = (w) => !/^(line|solid|\d+)$/.test(w);
  return [...ICON_NAMES].map((candidate) => { const parts = candidate.replace(/^(icon|ic)-/, "").split("-"); const common = words.filter((w) => parts.includes(w)); return { candidate, shared: common.length, meaning: common.filter(meaningful).length, d: distance(name, candidate) }; })
    // Ties go to the medium cut, Zen's default size (search → icon-search-medium-line), then to the closest spelling.
    .map((c) => ({ ...c, medium: c.meaning > 0 && /-medium(-|$)/.test(c.candidate) && !words.includes("medium") ? 1 : 0 }))
    .sort((a, b) => b.meaning - a.meaning || b.shared - a.shared || b.medium - a.medium || a.d - b.d).slice(0, count).map((c) => c.candidate);
};
/** Literal icon names in an element's props: name="…", icon="…", startIcon="…", endIcon="…" (JSX string attributes only). */
const literalIconNames = (attrs) => [...attrs.matchAll(/(?:^|\s)(?:name|icon|startIcon|endIcon|leadingIcon|trailingIcon)="((?:icon|ic)-[a-z0-9-]+)"/g)].map((m) => m[1]);
/** Props marked `@deprecated` in the component sources (component → prop → "Use …" hint), read from docs/api. */
const DEPRECATED = {};
const deprecatedComponents = [];
/** Controlled props and the handlers that change them (component → prop → handlers), and the components a no-op handler
 *  is checked on: read from docs/api for the interaction/* rules. */
const CONTROLLED = {};
const controlledComponents = [];
const handlerComponents = [];
/** Components with their own no-op rule (chat/no-locked-interaction). */
const CHAT_LOCKED = ["ChatMessage", "ChatFile", "ChatPhotos", "ChatCall", "ChatComposer", "ChatConversationItem", "ChatReactionPicker"];
/** The type of a handler's first argument: "(date: Date | null) => void" → "Date|null". */
const firstArgType = (type = "") => {
  const head = type.match(/^\(\s*\w+\??\s*:\s*/); if (!head) return undefined;
  let depth = 0, out = "";
  for (const ch of type.slice(head[0].length)) {
    if ("([{<".includes(ch)) depth += 1; else if (")]}>".includes(ch) && depth-- === 0) break; else if (ch === "," && depth === 0) break;
    out += ch;
  }
  return out.replace(/\s+/g, "");
};
// Prop P is controlled when the component also takes on<P>Change whose first argument has P's type (value → onValueChange,
// month → onMonthChange, pageSize → onPageSizeChange; `search: boolean` is not paired with onSearchChange(text)). value and
// checked also count the deprecated onChange, open counts onClose. Popover `open` stays with popover/controlled-close.
function setInteractionProps(apiDocs) {
  for (const key of Object.keys(CONTROLLED)) delete CONTROLLED[key];
  const takesHandlers = new Set();
  for (const doc of apiDocs) for (const c of doc.components ?? []) {
    const props = new Map((c.props ?? []).map((p) => [p.name, p]));
    // Every component: DOM wrappers (Button, IconButton, Link…) take onClick without documenting it.
    if (!CHAT_LOCKED.includes(c.name)) takesHandlers.add(c.name);
    for (const [name, prop] of props) {
      if (/^(on[A-Z]|default[A-Z])/.test(name) || (c.name === "Popover" && name === "open")) continue;
      const change = props.get(`on${name[0].toUpperCase()}${name.slice(1)}Change`);
      if (!change || firstArgType(change.type) !== String(prop.type ?? "").replace(/\s+/g, "")) continue;
      (CONTROLLED[c.name] ??= {})[name] = [change.name, ...(/^(value|checked)$/.test(name) && props.has("onChange") ? ["onChange"] : []), ...(name === "open" && props.has("onClose") ? ["onClose"] : [])];
    }
  }
  // DatePicker with showActions commits through onApply(value, range), which changes value and range too. `range`
  // (DatePickerRange | null) never matches onRangeChange's argument, so it is paired by hand.
  const datePicker = apiDocs.flatMap((doc) => doc.components ?? []).find((c) => c.name === "DatePicker");
  if (datePicker?.props?.some((p) => p.name === "onApply")) {
    CONTROLLED.DatePicker?.value?.push("onApply");
    if (datePicker.props.some((p) => p.name === "range")) (CONTROLLED.DatePicker ??= {}).range = ["onRangeChange", "onApply"];
  }
  controlledComponents.splice(0, controlledComponents.length, ...Object.keys(CONTROLLED).sort());
  handlerComponents.splice(0, handlerComponents.length, ...[...takesHandlers].sort());
}
/** Refill the maps from API docs (build-guidelines passes the freshly built ones, so the rules never lag a build). */
export function setDeprecatedProps(apiDocs) {
  for (const key of Object.keys(DEPRECATED)) delete DEPRECATED[key];
  for (const doc of apiDocs) for (const c of doc.components ?? []) for (const p of c.props ?? []) if (p.deprecated) (DEPRECATED[c.name] ??= {})[p.name] = p.deprecated;
  deprecatedComponents.splice(0, deprecatedComponents.length, ...Object.keys(DEPRECATED).sort());
  setInteractionProps(apiDocs);
}
try {
  const dir = path.join(root, "docs/api");
  setDeprecatedProps(fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))));
} catch { /* docs not built yet */ }
const vague = /^(ok|okay|click here|here|submit|go|yes|no)$/i;
const onOff = /^(on|off|enabled|disabled|active|inactive|yes|no)$/i;
// Raw colour values once every var(…) (and its fallback) is stripped.
const rawColour = (body) => (body.match(/(^|[;{\s])(color|background(-color)?|border(-[a-z-]+)?|fill|stroke|box-shadow|outline(-color)?|caret-color)\s*:[^;}]*/g) ?? [])
  .map((d) => d.trim()).find((d) => /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(d.replace(/var\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)/g, "")));
const focusSel = /:focus(-visible)?\b(?!-within)|\[data-state="focused"\]/;
// A focus rule that removes the outline must be answered by another focus rule (same base class) that draws a ring.
const dropsFocus = ({ selector, body, src }) => {
  if (!focusSel.test(selector) || !/(^|[;{\s])outline\s*:\s*(none|0)\b/.test(body) || /box-shadow|border|background|text-decoration/.test(body)) return false;
  const base = classesOf(selector)[0]; if (!base) return false;
  return ![...src.matchAll(/([^{}]+)\{([^{}]*)\}/g)].some((r) => r[1].includes(`.${base}`) && focusSel.test(r[1]) && /box-shadow|border\s*:|outline\s*:\s*[1-9]|background/.test(r[2]));
};
// Focus that looks like the state it starts from (focus/state-parity, focus/selected-fill-only).
/** A selector list split at its top-level commas. */
const selectorParts = (selector) => { const out = []; let depth = 0, cur = ""; for (const ch of selector) { if (ch === "(") depth += 1; if (ch === ")") depth -= 1; if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; };
const FOCUS_PSEUDO = /:focus(-visible|-within)?\b(?!-)/;
/** Static previews of the focused state (Figma State=Focused/Typing) are not resting states. */
const FOCUS_PREVIEW = /\[data-state=["']?(focus|focused|typing)["']?\]/;
const TRANSIENT_STATE = /:(hover|active)\b|\[data-state=["']?(hover|pressed|focus|focused|typing)["']?\]/;
const SELECTED_STATE = /\.is-selected\b|\[aria-(selected|checked|pressed)=["']?true|\[data-selected=["']?true|\[aria-current|\[data-state=["']?(selected|active)["']?\]/;
const normSelector = (s) => s.replace(/\s+/g, " ").replace(/\s*([>+~])\s*/g, "$1").trim();
/** The resting selectors a focus selector starts from: the focus pseudo (and the :not(…) guards right after it) removed,
 *  one :is(a, b) expanded. */
const restingOf = (sel) => {
  const s = sel.replace(/:focus(-visible|-within)?\b(?!-)((:not\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\))*)/g, "");
  const is = s.match(/:is\(((?:[^()]|\([^()]*\))*)\)/);
  return is ? selectorParts(is[1]).map((alt) => normSelector(s.replace(is[0], alt))) : [normSelector(s)];
};
const hasFill = (body) => /(^|[;{\s])background(-color)?\s*:/.test(body);
/** Draws a focus indicator other than a fill: an outline with a width, a box-shadow ring, a border. */
const drawsRing = (body) => /(^|[;{\s])outline\s*:(?!\s*(?:0|none)\b)[^;]*\d/.test(body) || /(^|[;{\s])outline-(width|style|color)\s*:/.test(body)
  || /box-shadow\s*:\s*(?!none\b)[^;]+/.test(body) || /(^|[;{\s])border(?![-a-z]*radius)(-[a-z]+)*\s*:/.test(body);

// Content colour roles (docs/component-usage-rules.md §7). Text-colour declarations: `color`, or a custom property
// whose name ends in content/text/label/caption/title/color (icon-only properties such as --x-icon are excluded).
const textColourDecls = (body) => (body.match(/(^|[;{\s])(color|--[\w-]*(content|text|label|caption|title|colou?r))\s*:[^;]*/g) ?? []).map((d) => d.trim()).filter((d) => !/^--[\w-]*icon/.test(d));
// "Lights" group: content families whose Light level resolves (through every alias, in any mode) to the
// Sky, Mint, Yellow or Zen primitive scales — colours with similar low contrast. Derived from tokens.css so a
// brand or token change moves the group automatically; the fallback mirrors the 2026-09-26 mapping.
const LIGHT_SCALES = /^(sky|mint|yellow|zen)$/;
const lightsFamilies = (() => {
  try {
    const css = fs.readFileSync(path.join(root, isRepo ? "src/styles/tokens.css" : "dist/styles.css"), "utf8");
    const defs = {};
    for (const m of css.matchAll(/--([\w-]+):\s*var\(--([\w-]+)\)/g)) (defs[m[1]] ??= new Set()).add(m[2]);
    const roots = (name, seen = new Set()) => seen.has(name) ? [] : (seen.add(name), defs[name] ? [...defs[name]].flatMap((next) => roots(next, seen)) : [name]);
    const families = Object.keys(defs).map((k) => k.match(/^zen-color-content-([a-z-]+)-light$/)?.[1]).filter(Boolean)
      .filter((family) => roots(`zen-color-content-${family}-light`).some((r) => LIGHT_SCALES.test(r.replace(/^zen-(light|dark)-/, "").replace(/-\d+$/, ""))));
    return families.length ? families : null;
  } catch { return null; }
})() ?? ["accent", "warning", "support-yellow"];
const LIGHTS_FAMILY = lightsFamilies.join("|");
const NEUTRAL_FAMILY = "neutral|inverse|on-black-overlay|on-white-overlay";
const COLOUR_FAMILY = "accent|info|positive|negative|warning|support-[a-z]+";
// Role words come from the element the rule styles (the last compound of each selector in a list).
const roleWords = (selector) => selector.split(",").flatMap((part) => classesOf(part.trim().split(/\s*[>+~]\s*|\s+/).pop() ?? "")).flatMap((c) => c.split(/[-_]+/));
// Background layers (docs/guidelines/background-layers.md): 1 Canvas · 2 Surface · 3 other colours · 4 Container (Modal,
// Bottom-Sheet) · 5 Popover. Only real `background` / `background-color` paints count — custom-property definitions don't.
const bgDecl = (body, re) => (body.match(/(^|[;{\s])background(-color)?\s*:[^;]*/g) ?? []).map((d) => d.trim()).find((d) => re.test(d));
const LAYER = {
  any: /--zen-color-background-[\w-]+/,
  canvas: /--zen-color-background-canvas-(default|alt|flat)\b/,
  surfaceFlat: /--zen-color-background-surface-flat\b/,
  container: /--zen-color-background-container\b/,
  popover: /--zen-color-background-popover-(default|overlay)\b/,
};
const isRootSel = (selector) => selector.split(",").every((part) => /^\s*(:root|html|body)(\s*[:[][^\s]*)?\s*$/.test(part));
const isPageSel = (selector) => /(^|[\s,>])(:root|html|body)\b|page|app\b|app-|shell|layout|canvas|stage|preview|frame|screen|main|platform|fill/i.test(selector);
const isNavSel = (selector) => /nav|topbar|top-bar|header|appbar|app-bar|bottom|tab-?bar|toolbar|sidebar|rail|dock|menubar/i.test(selector);
const isModalSel = (selector) => /modal|dialog|sheet|drawer/i.test(selector);
const isOverlaySel = (selector) => /popover|tooltip|menu|dropdown|flyout|submenu|toast|picker|listbox|overlay|combobox|autocomplete|command|popup|hovercard/i.test(selector);
const isTitleSel = (selector) => roleWords(selector).some((w) => /^(title|heading|headline)$/i.test(w));
const isBodySel = (selector) => roleWords(selector).some((w) => /^(body|description|paragraph|desc)$/i.test(w));

// Top-level `{ … }` objects of a literal array expression (e.g. Table columns), for per-column checks.
const arrayObjects = (expr) => { if (!expr || !/^\s*\[/.test(expr) || /\.map\(|\$\{/.test(expr)) return []; const out = []; let depth = 0, start = -1; for (let i = 0; i < expr.length; i++) { const ch = expr[i]; if (ch === "{") { if (depth++ === 0) start = i; } else if (ch === "}") { if (--depth === 0 && start >= 0) out.push(expr.slice(start, i + 1)); } } return out; };
// Attribute strings of every <Tag …> opening tag inside a JSX snippet (children of a rule's element), with braces,
// strings and arrow functions balanced like readTag: `openingTags(children, "Button")` → ['level="primary" size="lg"', …].
const openingTags = (src, tag) => [...(src ?? "").matchAll(new RegExp(`<${tag}\\b(?![.\\w])`, "g"))].map((m) => {
  let i = m.index + m[0].length, depth = 0, quote = null;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === "\\") { i++; continue; }
    if (quote) { if (ch === quote) quote = null; }
    else if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0 && src[i - 1] !== "=") break;
  }
  return src.slice(m.index + m[0].length, i);
});
// A Button's level from its own attributes (nested elements in startIcon etc. are ignored): level="x" or level={"x"}.
const levelOf = (attrs) => literal(topLevel(attrs), "level") ?? expr(attrs, "level")?.replace(/["'`\s]/g, "");
// The level set inside an ActionBar action object ({ label, level: "danger" }), if any.
const actionLevel = (object) => object?.match(/\blevel\s*:\s*["'`]([\w-]+)["'`]/)?.[1];
export const rules = [
  { id: "button/secondary-justified", components: ["Button", "IconButton"], severity: "error", allow: "secondary", guideline: "docs/guidelines/button.md",
    summary: "Secondary is a rare highlight; default to Primary (main CTA) or Tertiary.",
    check: ({ attrs }) => /\bsecondary\b/.test(value(attrs, "level") ?? "") && "uses level secondary — use primary (main CTA) or tertiary, or justify with zen-allow-secondary." },
  { id: "button/filter-is-chip", components: ["Button", "IconButton"], severity: "error", allow: "filter-button", guideline: "docs/guidelines/chip.md",
    summary: "Filter, sort and scope pickers are Chip (variant=advanced), never buttons.",
    check: ({ attrs, children }) => {
      const label = text(children) || literal(attrs, "aria-label") || "";
      // "Sort", "Filter", "Filters", "All filters", or a filter glyph (icon-filter-*) on the button.
      const filterish = /^(all\s+)?(sort|filters?)\b/i.test(label) || /icon-filter/.test(value(attrs, "startIcon") ?? value(attrs, "icon") ?? "");
      // A button that opens a list of choices (listbox/tree/grid popup) is a picker; one that opens a menu of actions
      // (aria-haspopup="menu"/"true"), a dialog or a sheet is not.
      const pickerPopup = /^(listbox|tree|grid)$/.test(literal(attrs, "aria-haspopup") ?? "");
      return (pickerPopup || filterish) && "opens a choice list — use <Chip variant=\"advanced\"> (popoverItems, or onClick + aria-haspopup=\"dialog\" for a filter panel).";
    } },
  { id: "button/accent-is-promoted", components: ["Button", "IconButton"], severity: "warn", allow: "accent", guideline: "docs/guidelines/button.md",
    summary: "Accent is for promoted CTAs (upsell, onboarding) only.",
    check: ({ attrs }) => /\baccent\b/.test(value(attrs, "level") ?? "") && "uses level accent — only for a promoted CTA; otherwise primary." },
  { id: "button/destructive-is-danger", components: ["Button"], severity: "warn", allow: "destructive", guideline: "docs/guidelines/button.md",
    summary: "Irreversible actions (Delete, Remove, Discard) use Danger or Danger-Subtle.",
    check: ({ attrs, children }) => /^(delete|remove|discard|destroy)\b/i.test(text(children)) && !/danger/.test(value(attrs, "level") ?? "") && `"${text(children)}" is destructive — use level danger (or danger-subtle).` },
  { id: "icon-button/needs-name", components: ["IconButton"], severity: "error", allow: "unnamed", guideline: "docs/guidelines/button.md",
    summary: "Icon-only buttons need an aria-label.",
    check: ({ attrs }) => !named(attrs) && "has no aria-label." },
  { id: "icon-button/needs-action", components: ["IconButton"], severity: "warn", allow: "no-action", guideline: "docs/guidelines/button.md",
    summary: "An IconButton does something: it has onClick (or href, or type=\"submit\"), unless it is a Menu trigger (the Menu wires it).",
    check: ({ attrs, parent, src, start }) => {
      // `${…}` and "…" only make a code sample opaque; in live code aria-label={`Edit ${name}`} is just a label.
      if (["onClick", "href", "onPointerDown", "onMouseDown"].some((name) => has(attrs, name)) || spreadsProps(attrs) || (opaque(attrs) && inTemplateText(src, start)) || /\btype="(submit|reset)"/.test(attrs)) return null;
      // `<Menu trigger={<IconButton …/>}>` (self-closing too): the owner wires the trigger.
      if (/\btrigger=\{\s*(\(\s*)?$/.test(src.slice(Math.max(0, start - 40), start))) return null;
      if (["Menu", "MenuTrigger", "Popover"].includes(parent()?.tag ?? "")) return null;
      return "has no onClick, href or type=\"submit\" — an icon-only button that does nothing; wire its action (or show the icon without a button).";
    } },
  { id: "icon-button/tooltip", components: ["IconButton"], severity: "warn", allow: "no-tooltip", guideline: "docs/guidelines/button.md",
    summary: "Icon-only buttons show their name as a tooltip after 1s of hover (at once on keyboard focus); IconButton does it by default — turn it off only when a visible label sits right beside it.",
    check: ({ attrs }) => /(^|\s)tooltip=\{\s*false\s*\}/.test(attrs) && "turns its tooltip off — sighted mouse users then can't learn what the icon does; keep the default (its aria-label) or pass a longer tooltip." },
  { id: "button/icon-only-raw", components: ["button"], severity: "warn", allow: "raw-icon-button", guideline: "docs/guidelines/button.md",
    summary: "An icon-only action is an IconButton (or uses useIconTooltip), so it gets the Zen tokens, focus ring and the 1s name tooltip — not a hand-built <button> with just an <Icon>.",
    // Icon-only = nothing but <Icon … /> inside (any other tag or {expression} may carry text, so it is not flagged).
    check: ({ attrs, children }) => /<Icon\b/.test(children) && !children.replace(/<Icon\b[^>]*\/>/g, "").trim() && !/useIconTooltip|\.bind\(/.test(attrs) && "is a raw icon-only <button> — use <IconButton aria-label=… icon={…} /> (tooltip built in) or spread useIconTooltip(label).bind() onto it." },
  { id: "input/no-disabled", components: [...INPUTS, "Search"], severity: "error", allow: "disabled-input", guideline: "docs/guidelines/input.md",
    summary: "Inputs (Search included) never use Disabled; fields use Read-only.",
    check: ({ attrs }) => has(attrs, "disabled") && !/disabled=\{false\}/.test(attrs) && "is disabled — use readOnly." },
  { id: "input/needs-label", components: INPUTS, severity: "error", allow: "unlabelled-input", guideline: "docs/guidelines/input.md",
    summary: "Every field has a visible label (or an aria-label when the context labels it).",
    check: ({ attrs }) => !present(attrs, "label") && !named(attrs) && "has neither label nor aria-label." },
  { id: "search/needs-name", components: ["Search"], severity: "warn", allow: "unnamed", guideline: "docs/guidelines/search.md",
    summary: "Search needs a placeholder that says what is searched, or an aria-label.",
    check: ({ attrs }) => !present(attrs, "placeholder") && !named(attrs) && "has no placeholder/aria-label describing what it searches." },
  { id: "choice/needs-label", components: ["Checkbox", "RadioButton", "Toggle"], severity: "error", allow: "unlabelled-choice", guideline: "docs/guidelines/checkbox.md",
    summary: "Checkbox, Radio and Toggle always carry a label.",
    check: ({ attrs }) => !present(attrs, "label") && !named(attrs) && "has no label (the Figma default text would render)." },
  { id: "radio/needs-name", components: ["RadioButton"], severity: "error", allow: "radio-name", guideline: "docs/guidelines/radio-button.md",
    summary: "Radios share a name so arrow keys move within one group.",
    check: ({ attrs }) => !present(attrs, "name") && "has no name — radios must belong to a named group." },
  { id: "chip/popover-needs-advanced", components: ["Chip"], severity: "error", allow: "chip-variant", guideline: "docs/guidelines/chip.md",
    summary: "Only Chip variant=advanced opens a Popover.",
    check: ({ attrs }) => has(attrs, "popoverItems") && /normal|number-only/.test(value(attrs, "variant") ?? "") && "has popoverItems but is not variant=\"advanced\"." },
  { id: "removable/needs-handler", components: ["Badge", "Tag"], severity: "error", allow: "remove-handler", guideline: "docs/guidelines/badge.md",
    summary: "A remove affordance must be wired to onRemove.",
    check: ({ attrs }) => has(attrs, "remove") && !/remove=\{false\}/.test(attrs) && !present(attrs, "onRemove") && "shows remove but has no onRemove." },
  { id: "badge-counter/cap", components: ["BadgeCounter"], severity: "warn", allow: "counter-cap", guideline: "docs/guidelines/badge.md",
    summary: "Counters cap at 99+.",
    check: ({ attrs }) => { const v = Number(value(attrs, "value")); return Number.isFinite(v) && v > 99 && "shows a value above 99 — pass \"99+\"."; } },
  { id: "avatar/needs-alt", components: ["Avatar"], severity: "error", allow: "avatar-alt", guideline: "docs/guidelines/avatar.md",
    summary: "Avatars need alt (the person's name; alt=\"\" only when the name is shown next to it).",
    check: ({ attrs }) => !present(attrs, "alt") && "has no alt." },
  { id: "tooltip/focusable-trigger", components: ["Tooltip"], severity: "error", allow: "tooltip-trigger", guideline: "docs/guidelines/tooltip.md",
    summary: "Tooltips wrap a focusable element so keyboard users can reach them.",
    check: ({ children }) => { const open = children.match(/<([A-Za-z]+)\b([^>]*)>/); const first = open?.[1]; const focusable = /tabIndex=(\{0\}|"0")|role="button"/.test(open?.[2] ?? ""); return first && !focusable && !FOCUSABLE_TRIGGERS.includes(first) && `wraps <${first}>, which is not focusable — wrap a Button/IconButton/link (or give it tabIndex={0} and a name).`; } },
  { id: "tooltip/short", components: ["Tooltip"], severity: "warn", allow: "tooltip-length", guideline: "docs/guidelines/tooltip.md",
    summary: "Tooltip text stays under ~80 characters and holds no interactive content.",
    check: ({ attrs }) => (literal(attrs, "content")?.length ?? 0) > 80 && "content is longer than 80 characters — use a Popover or inline help." },
  { id: "tabs/needs-label", components: ["Tabs"], severity: "error", allow: "tabs-label", guideline: "docs/guidelines/tabs.md",
    summary: "A tablist needs an aria-label.",
    check: ({ attrs }) => !named(attrs) && "has no aria-label." },
  { id: "segmented/needs-label", components: ["Segmented"], severity: "warn", allow: "segmented-label", guideline: "docs/guidelines/segmented.md",
    summary: "Segmented needs an aria-label naming what it switches.",
    check: ({ attrs }) => !named(attrs) && "has no aria-label." },
  { id: "dialog/needs-title", components: ["Dialog"], severity: "error", allow: "dialog-title", guideline: "docs/guidelines/dialog.md",
    summary: "Dialogs always have a title.",
    check: ({ attrs }) => !present(attrs, "title") && "has no title." },
  { id: "dialog/negative-uses-danger", components: ["Dialog"], severity: "error", allow: "dialog-danger", guideline: "docs/guidelines/dialog.md",
    summary: "A negative (destructive) dialog's primary action uses level danger.",
    check: ({ attrs }) => literal(attrs, "theme") === "negative" && has(attrs, "primaryAction") && !/level:\s*"danger/.test(value(attrs, "primaryAction") ?? "") && "is theme negative but its primaryAction is not level \"danger\"." },
  { id: "popover/controlled-close", components: ["Popover"], severity: "warn", allow: "popover-close", guideline: "docs/guidelines/popover.md",
    summary: "A controlled Popover needs onOpenChange so outside-click and Escape can close it.",
    check: ({ attrs }) => { const v = expr(attrs, "open"); return v !== undefined && v.trim() !== "true" && !present(attrs, "onOpenChange") && "is controlled (open={…}) without onOpenChange."; } },
  { id: "popover/explicit-open", components: ["Popover", "PopoverSearch", "PopoverManualAddNew"], severity: "error", allow: "popover-open", guideline: "docs/guidelines/popover.md",
    summary: "Popover is closed by default: pass `open` (open={isOpen} with onOpenChange, or a bare `open` for an always-visible surface).",
    check: ({ attrs }) => (present(attrs, "open") ? null : "has no `open` prop, so it never shows (Popover is closed by default).") },
  { id: "box/border-matches-action", components: ["Box"], severity: "warn", allow: "box-border", guideline: "docs/guidelines/layout.md",
    summary: "A Box border follows the border rule: subtle only when the box is actionable (onClick, href, role=button), pale when it is static.",
    check: ({ attrs }) => { const border = literal(attrs, "border"); if (!border || opaque(attrs)) return null; const actionable = has(attrs, "onClick") || has(attrs, "href") || literal(attrs, "role") === "button"; if (border === "subtle" && !actionable) return 'is static but uses border="subtle" — static boxes use border="pale" (clickable tiles: Card).'; if (border === "pale" && actionable) return 'is clickable but uses border="pale" — actionable boxes use border="subtle", or use Card.'; return null; } },
  { id: "page-header/one-primary", components: ["PageHeader"], severity: "error", allow: "page-header-primary", guideline: "docs/guidelines/page-header.md",
    summary: "PageHeader actions hold at most one Primary button (the page's main action), after the Tertiary ones.",
    check: ({ attrs }) => { const actions = expr(attrs, "actions") ?? ""; const primaries = (actions.match(/level="primary"/g) ?? []).length; return primaries > 1 ? `has ${primaries} Primary buttons in actions — keep one Primary; the rest are Tertiary.` : null; } },
  { id: "toast/needs-title", components: ["Toast"], severity: "error", allow: "toast-title", guideline: "docs/guidelines/toast.md",
    summary: "A toast states its outcome in a title.",
    check: ({ attrs }) => !present(attrs, "title") && "has no title." },
  { id: "alert-banner/small-no-action", components: ["AlertBanner"], severity: "error", allow: "banner-action", guideline: "docs/guidelines/alert-banner.md",
    summary: "Small alert banners are message-only (Figma Small has no Actions).",
    check: ({ attrs }) => step(literal(attrs, "size")) === "sm" && has(attrs, "action") && "is size small but has an action — use size md (medium)." },
  { id: "navigation/back-chevron", components: ["TopNavigation", "TopNavigationActionButton", "IconButton", "Button"], severity: "error", allow: "back-arrow", guideline: "docs/guidelines/top-navigation.md",
    summary: "Back actions on mobile and tablet use a left chevron (icon-chevron-left-line-medium), never a left arrow.",
    check: ({ tag, attrs, children }) => {
      const hit = tag === "TopNavigation" || tag === "TopNavigationActionButton"
        ? backArrowObject(attrs)
        : ARROW_LEFT.test(attrs + children) && (BACK_LABEL.test(literal(attrs, "aria-label") ?? "") || BACK_LABEL.test(text(children)));
      return hit && "draws Back with a left arrow — use icon-chevron-left-line-medium (the platform back affordance on mobile/tablet); arrows mean \"move content\", not \"go up a level\".";
    } },
  { id: "button/flat-level", components: ["Button", "IconButton"], severity: "error", allow: "flat-level", guideline: "docs/guidelines/button.md",
    summary: "Button/Flat has levels primary · secondary · accent · danger · positive only; any other level falls back to the Main look (border + shadow). Close / dismiss icon buttons are Flat Primary.",
    check: ({ attrs }) => { const lvl = literal(attrs, "level"); return literal(attrs, "appearance") === "flat" && lvl && !["primary", "secondary", "accent", "danger", "positive"].includes(lvl) && `is appearance flat with level "${lvl}", which Flat doesn't have — use level primary (the plain flat button).`; } },
  { id: "button/small-full-width", components: ["Button"], severity: "error", allow: "small-full-width", guideline: "docs/guidelines/button.md",
    summary: "Small buttons (2xs · xs · sm) always hug their label; a full-width button is size md or larger (Figma CTA = Medium, full width).",
    check: ({ attrs, parent }) => {
      const size = literal(attrs, "size"); if (!size || !SMALL_BUTTON.test(size)) return null;
      const style = expr(attrs, "style") ?? "", cls = classList(attrs);
      const own = /width\s*:\s*["']100%|flex\s*:\s*1\b|(align|justify)Self\s*:\s*["']stretch/.test(style) || cls.some((c) => layoutClasses.fullWidth.has(c));
      const p = own ? null : parent(), kind = p && stretchKind(p.attrs);
      if (!own && !kind) return null;
      // Opting out only works on the parent's cross axis: justify-self in a grid, align-self in a flex column.
      if (kind === "grid" && (/justifySelf\s*:\s*["'](?!stretch)/.test(style) || cls.some((c) => layoutClasses.hugX.has(c)))) return null;
      if (kind === "column" && (/alignSelf\s*:\s*["'](?!stretch)/.test(style) || cls.some((c) => layoutClasses.hugY.has(c)))) return null;
      return `is size "${size}" but ${own ? "is set to full width" : `stretches across its <${p.tag}> (${kind === "grid" ? "grid" : "flex column"})`} — use size="md" (or larger) for a full-width button, or keep it small and let it hug its label (${kind === "column" ? 'alignSelf: "flex-start"' : 'justifySelf: "start"'}, or put it in a row).`;
    } },
  { id: "file-icon/not-an-action", components: ["Button", "IconButton"], severity: "error", allow: "file-icon-action", guideline: "docs/guidelines/file-icon.md",
    summary: "FileIcon identifies a file's type; it is never the icon of a button or action.",
    check: ({ attrs, children }) => (/<FileIcon\b/.test(children) || /<FileIcon\b/.test(value(attrs, "icon") ?? "") || /<FileIcon\b/.test(value(attrs, "startIcon") ?? "")) && "uses a FileIcon as a button icon — use a system Icon (icon-*-line) for actions; FileIcon sits next to the file name." },
  { id: "button/vague-label", components: ["Button"], severity: "warn", allow: "vague-label", guideline: "docs/guidelines/button.md",
    summary: "Labels start with a verb and name the outcome (\"Save changes\"), never \"OK\", \"Submit\" or \"Click here\".",
    check: ({ children }) => vague.test(text(children)) && `label "${text(children)}" is vague — name the outcome with a verb ("Save changes", "Delete project").` },
  { id: "button/one-primary", components: ["Button"], severity: "warn", allow: "two-primary", guideline: "docs/guidelines/button.md",
    summary: "One Main Primary per surface: never two Primary buttons side by side (Flat/Overlay levels are exempt).",
    check: ({ attrs, src, end }) => { const mainPrimary = (a) => /level="primary"/.test(a) && !/appearance="(flat|overlay)"/.test(a); if (!mainPrimary(attrs)) return null; const next = nextSibling(src, end); return next?.tag === "Button" && mainPrimary(next.attrs) && "is followed by another Primary button — keep one Primary and make the other Tertiary."; } },
  { id: "toggle/label-names-setting", components: ["Toggle"], severity: "error", allow: "toggle-label", guideline: "docs/guidelines/toggle.md",
    summary: "A Toggle's label names the setting (\"Email notifications\"), never its state (\"On\").",
    check: ({ attrs }) => onOff.test(literal(attrs, "label") ?? "") && `label "${literal(attrs, "label")}" describes the state — name the setting; the switch shows the state.` },
  { id: "tooltip/no-interactive-content", components: ["Tooltip"], severity: "error", allow: "tooltip-content", guideline: "docs/guidelines/tooltip.md",
    summary: "Tooltip content is plain text: no buttons, links or handlers (it disappears on blur).",
    check: ({ attrs }) => /<(Button|IconButton|a|Link|Chip|input)\b|onClick/.test(value(attrs, "content") ?? "") && "puts interactive content inside a tooltip — use a Popover." },
  { id: "tooltip/disabled-trigger", components: ["Tooltip"], severity: "warn", allow: "tooltip-disabled", guideline: "docs/guidelines/tooltip.md",
    summary: "A disabled control cannot receive focus, so a tooltip on it is unreachable by keyboard; explain the reason inline.",
    check: ({ children }) => { const first = children.match(/<[A-Za-z]+\b([^>]*)>/)?.[1] ?? ""; return has(first, "disabled") && !/disabled=\{false\}/.test(first) && "wraps a disabled control — keyboard users never see it; put the reason in help text or a caption."; } },
  { id: "tabs/item-count", components: ["Tabs"], severity: "warn", allow: "tab-count", guideline: "docs/guidelines/tabs.md",
    summary: "Tabs hold 2–7 items; more → Sidebar or a SelectField, one → no tabs.",
    check: ({ attrs }) => { const n = literalCount(attrs, "items"); return n !== undefined && (n < 2 || n > 7) && `has ${n} tab(s) — keep 2–7.`; } },
  { id: "segmented/option-count", components: ["Segmented"], severity: "warn", allow: "segment-count", guideline: "docs/guidelines/segmented.md",
    summary: "Segmented holds 2–5 options; more → Tabs or SelectField.",
    check: ({ attrs }) => { const n = literalCount(attrs, "options"); return n !== undefined && (n < 2 || n > 5) && `has ${n} option(s) — keep 2–5 (more → Tabs or SelectField).`; } },
  { id: "chip/multiple-needs-count", components: ["Chip"], severity: "warn", allow: "chip-count", guideline: "docs/guidelines/chip.md",
    summary: "A multiple-selection Chip shows how many values are active with selectionCount.",
    check: ({ attrs }) => literal(attrs, "selectionMode") === "multiple" && !present(attrs, "selectionCount") && "is selectionMode multiple without selectionCount — the counter is the only cue that filters are applied." },
  { id: "dialog/no-nested", components: ["Dialog"], severity: "error", allow: "nested-dialog", guideline: "docs/guidelines/dialog.md",
    summary: "Never stack dialogs: a Dialog does not open another Dialog.",
    check: ({ children }) => /<Dialog\b/.test(children) && "contains another Dialog — replace the content in place or use a page." },
  { id: "accordion/no-nested", components: ["Accordion"], severity: "error", allow: "nested-accordion", guideline: "docs/guidelines/accordion.md",
    summary: "Accordions are one level deep: no Accordion inside an Accordion.",
    check: ({ children }) => /<Accordion\b/.test(children) && "contains another Accordion — flatten the list or link to a page." },
  { id: "pagination/worth-paging", components: ["Pagination"], severity: "warn", allow: "short-pagination", guideline: "docs/guidelines/pagination.md",
    summary: "Paginate only when there are 3+ pages; otherwise show everything.",
    check: ({ attrs }) => { const n = Number(value(attrs, "pageCount")); return Number.isFinite(n) && n > 0 && n < 3 && `has pageCount ${n} — show the whole list instead.`; } },
  { id: "progress/value-range", components: ["ProgressBar", "ProgressCircle"], severity: "error", allow: "progress-range", guideline: "docs/guidelines/progress.md",
    summary: "Progress value is a percentage between 0 and 100.",
    check: ({ attrs }) => { const n = Number(value(attrs, "value")); return Number.isFinite(n) && (n < 0 || n > 100) && `has value ${n} — pass a percentage (0–100).`; } },
  { id: "toast/concise", components: ["Toast"], severity: "warn", allow: "toast-copy", guideline: "docs/guidelines/toast.md",
    summary: "Toast titles state an outcome in ≤ 60 characters and never ask a question.",
    check: ({ attrs }) => { const t = literal(attrs, "title") ?? ""; return (t.length > 60 || t.includes("?")) && (t.includes("?") ? "asks a question — decisions belong in a Dialog." : "title is longer than 60 characters — shorten it or move detail to the caption."); } },
  { id: "input/placeholder-not-label", components: INPUTS, severity: "warn", allow: "placeholder-label", guideline: "docs/guidelines/input.md",
    summary: "Placeholder shows an example or format, never repeats the label.",
    check: ({ attrs }) => { const l = literal(attrs, "label"), p = literal(attrs, "placeholder"); return l && p && l.trim().toLowerCase() === p.trim().toLowerCase() && "repeats its label as the placeholder — use an example value or format (\"name@company.com\")."; } },
  { id: "sidebar/submenu-close", components: ["Sidebar"], severity: "warn", allow: "submenu-close", guideline: "docs/guidelines/sidebar.md",
    summary: "A Sidebar with a subMenu flyout wires onSubMenuClose so Escape and outside presses close it.",
    check: ({ attrs }) => has(attrs, "subMenu") && !/subMenu=\{(null|undefined|false)\}/.test(attrs) && !present(attrs, "onSubMenuClose") && "has a subMenu flyout without onSubMenuClose — Escape and outside presses can't close it." },
  { id: "list-item/inset-not-padding", css: true, components: [], severity: "warn", allow: "list-inset", guideline: "docs/guidelines/list-item.md",
    summary: "List rows take their horizontal inset from the layout (List inset / --zen-list-inset), never a padding override on .zen-list-item — a fixed padding double-indents rows inside Modals, Side Panels and Cards.",
    check: (css) => !/ListItem\/list-item\.css$/.test(css.file ?? "") && /\.zen-list-item\b(?![_-])/.test(css.selector) && /(^|;)\s*padding(-inline|-left|-right|-inline-start|-inline-end)?\s*:/.test(css.body) && "overrides the row padding — set <List inset> or --zen-list-inset on the container instead." },
  { id: "content/lights-no-light-text", css: true, components: [], severity: "error", allow: "lights-light-text", guideline: "docs/guidelines/content-colors.md",
    summary: "Lights-group text (families referencing Sky, Mint, Yellow or Zen — today Accent, Warning, Support/Yellow) never uses the Light level — Base at most (Light fails contrast); Light stays for icons.",
    check: (css) => { const d = textColourDecls(css.body).find((x) => new RegExp(`--zen-color-content-(${LIGHTS_FAMILY})-light`).test(x)); return d && `sets Lights-group text to Light in \`${d.slice(0, 70)}\` — use -base or -strongest (Light is allowed only for icons).`; } },
  { id: "content/title-is-strongest", css: true, components: [], severity: "warn", allow: "title-level", guideline: "docs/guidelines/content-colors.md",
    summary: "Neutral-family titles and headings use Strongest (Primary level); Base is for secondary text and Light for tertiary text.",
    check: (css) => { if (!isTitleSel(css.selector)) return null; const d = textColourDecls(css.body).find((x) => new RegExp(`--zen-color-content-(${NEUTRAL_FAMILY})-(base|light)\\b`).test(x)); return d && `colours a title with \`${d.slice(0, 70)}\` — titles use the -strongest level.`; } },
  { id: "content/colour-light-is-highlight", css: true, components: [], severity: "warn", allow: "colour-light-body", guideline: "docs/guidelines/content-colors.md",
    summary: "In colour families, Strongest/Base are for running text on Subtle backgrounds; Light is only for text or icons that must stand out, never body copy.",
    check: (css) => { if (!isBodySel(css.selector)) return null; const d = textColourDecls(css.body).find((x) => new RegExp(`--zen-color-content-(${COLOUR_FAMILY})-light\\b`).test(x)); return d && `uses a colour Light level for body text (\`${d.slice(0, 70)}\`) — use -base or -strongest; keep Light for highlights.`; } },
  { id: "divider/no-double", components: ["Divider"], severity: "warn", allow: "double-divider", guideline: "docs/guidelines/divider.md",
    summary: "One divider between two groups — never two Dividers in a row.",
    check: ({ src, end }) => nextSibling(src, end)?.tag === "Divider" && "is followed by another Divider — keep one line between groups." },
  { id: "inline-message/needs-content", components: ["InlineMessage"], severity: "error", allow: "empty-message", guideline: "docs/guidelines/inline-message.md",
    summary: "An Inline Message says something: a title, a caption, or both.",
    check: ({ attrs, children }) => !present(attrs, "title") && !text(children) && !opaque(attrs) && "has neither title nor caption." },
  { id: "inline-message/custom-needs-visual", components: ["InlineMessage"], severity: "warn", allow: "custom-visual", guideline: "docs/guidelines/inline-message.md",
    summary: "Theme Custom exists for your own visual (avatar, logo, thumbnail); pass it via icon.",
    check: ({ attrs }) => literal(attrs, "theme") === "custom" && !present(attrs, "icon") && "is theme custom without an icon — it would show the image placeholder; pass a visual or use a status theme." },
  { id: "empty-state/needs-title", components: ["EmptyState"], severity: "error", allow: "empty-title", guideline: "docs/guidelines/empty-state.md",
    summary: "Every Empty State has a title that says what is empty.",
    check: ({ attrs }) => !present(attrs, "title") && "has no title." },
  { id: "empty-state/action-label", components: ["EmptyState"], severity: "warn", allow: "vague-label", guideline: "docs/guidelines/empty-state.md",
    summary: "Empty State actions name the next step (\"Create project\"), never \"OK\" or \"Click here\".",
    check: ({ attrs }) => { const labels = [value(attrs, "primaryAction"), value(attrs, "secondaryAction")].map((v) => v?.match(/label:\s*"([^"]*)"/)?.[1]).filter(Boolean); const bad = labels.find((l) => vague.test(l)); return bad && `action "${bad}" is vague — name the next step with a verb.`; } },
  { id: "empty-state/way-out-tertiary", components: ["EmptyState"], severity: "warn", allow: "way-out-primary", guideline: "docs/guidelines/empty-state.md",
    summary: "A way out of an empty result (Clear filters, Clear search, Reset) is secondaryAction (Tertiary); primaryAction is the next step (\"Create project\").",
    check: ({ attrs }) => { const label = value(attrs, "primaryAction")?.match(/label:\s*["'`]([^"'`]*)["'`]/)?.[1]; return Boolean(label) && /^(clear|reset|show all)\b/i.test(label) && `puts "${label}" in primaryAction — a way out of an empty result is secondaryAction (Tertiary); keep primaryAction for the next step.`; } },
  { id: "table/actions-flat", components: ["TableActions"], severity: "warn", allow: "table-action-style", guideline: "docs/guidelines/table.md",
    summary: "Row actions in TableActions are Button/Icon-Flat Medium (IconButton appearance=\"flat\" level=\"primary\"), so rows don't fill with outlined buttons.",
    check: ({ children }) => { const plain = openingTags(children, "IconButton").filter((a) => literal(topLevel(a), "appearance") !== "flat"); return plain.length > 0 && `holds ${plain.length} IconButton(s) without appearance="flat" — row actions are Button/Icon-Flat Medium (appearance="flat" level="primary").`; } },
  { id: "stepper/needs-label", components: ["Stepper"], severity: "warn", allow: "stepper-label", guideline: "docs/guidelines/stepper.md",
    summary: "A Stepper needs an aria-label naming the process (\"Checkout\").",
    check: ({ attrs }) => !named(attrs) && "has no aria-label — it would be announced as \"Progress\"." },
  { id: "stepper/step-count", components: ["Stepper"], severity: "warn", allow: "step-count", guideline: "docs/guidelines/stepper.md",
    summary: "Steppers hold 2–7 steps; one step is not a process, more than 7 needs grouping.",
    check: ({ attrs }) => { const n = literalCount(attrs, "steps"); return n !== undefined && (n < 2 || n > 7) && `has ${n} step(s) — keep 2–7.`; } },
  { id: "slider/needs-name", components: ["Slider"], severity: "error", allow: "slider-name", guideline: "docs/guidelines/slider.md",
    summary: "A Slider needs an accessible name (aria-label or aria-labelledby).",
    // FormField names its child through aria-labelledby (its visible label).
    check: ({ attrs, parent }) => !named(attrs) && parent()?.tag !== "FormField" && "has no aria-label or aria-labelledby — or wrap it in <FormField label=…>." },
  { id: "slider/white-no-small", components: ["Slider"], severity: "error", allow: "white-small", guideline: "docs/guidelines/slider.md",
    summary: "Theme White exists in Medium and Large only (Figma); Small falls back to Neutral.",
    check: ({ attrs }) => literal(attrs, "theme") === "white" && step(literal(attrs, "size")) === "sm" && "is theme white at size small — use md or lg (medium or large) on media." },
  { id: "slider/solid-icon", components: ["Slider"], severity: "warn", allow: "slider-line-icon", guideline: "docs/guidelines/slider.md",
    summary: "The Slider leading icon uses the Solid style (it sits inside the filled track).",
    check: ({ attrs }) => /-line$/.test(literal(attrs, "icon") ?? "") && `uses ${literal(attrs, "icon")} — use the -solid icon.` },
  { id: "richtext/value-not-onchange", components: ["RichTextField"], severity: "error", allow: "richtext-onchange", guideline: "docs/guidelines/input.md",
    summary: "RichTextField reports content through onValueChange(html, text); it has no onChange(event).",
    check: ({ attrs }) => has(attrs, "onChange") && "wires onChange — use onValueChange(html, text)." },
  { id: "card/clickable-no-nested-controls", components: ["Card"], severity: "error", allow: "card-nested-control", guideline: "docs/guidelines/card.md",
    summary: "A clickable Card (onClick) is one button: it must not contain buttons, links, inputs or a subAction.",
    check: ({ attrs, children }) => has(topLevel(attrs), "onClick") && !opaque(attrs) && (/<(Button|IconButton|a|Link|Checkbox|RadioButton|Toggle|Chip|InputField|Search)\b/.test(children) || has(attrs, "subAction")) && "is clickable but contains another control — make the card static, or move the control out." },
  { id: "list-item/clickable-row-toggle", components: ["ListItem"], severity: "warn", allow: "row-toggle", guideline: "docs/guidelines/list-item.md",
    summary: "A clickable row (onClick/href) doesn't also carry a Toggle or Checkbox — the row click and the switch compete. Trailing icon buttons are fine (Figma Slot-Actions).",
    check: ({ attrs }) => (has(topLevel(attrs), "onClick") || has(topLevel(attrs), "href")) && !opaque(attrs) && /<(Toggle|ToggleButton|Checkbox|RadioButton)\b/.test(`${value(attrs, "trailing") ?? ""} ${value(attrs, "leading") ?? ""}`) && "is clickable and also holds a Toggle/Checkbox/Radio (leading or trailing) — an input inside the row button is invalid; keep the row static and let the control own the click." },
  { id: "dock-icon/emoji-needs-glyph", components: ["DockIcon"], severity: "warn", allow: "dock-emoji", guideline: "docs/guidelines/dock-icon.md",
    summary: "Theme=Emoji needs the emoji prop (otherwise a placeholder face renders).",
    check: ({ attrs }) => literal(attrs, "theme") === "emoji" && !present(attrs, "emoji") && "is theme emoji without an emoji." },
  { id: "heading/h1-is-heading-1", components: ["Heading", "Text", "h1"], severity: "error", allow: "h1-style", guideline: "docs/guidelines/text.md",
    summary: "An h1 is the page title and always uses Heading/1, as in the Figma Master-Layout: no other textStyle on a level 1 Heading, a Text rendered as h1 or a raw h1.",
    check: ({ tag, attrs }) => {
      if (tag === "h1") { const n = attrs.match(/Heading\/(\d)|zen-type-heading-(\d)/); const level = n && (n[1] ?? n[2]); return level && level !== "1" && `uses Heading/${level} — an h1 is Heading/1.`; }
      const h1 = tag === "Heading" ? /\blevel=(\{1\}|"1")/.test(attrs) : literal(attrs, "as") === "h1";
      const style = h1 ? literal(attrs, "textStyle") : undefined;
      return style && style !== "Heading/1" && `is an h1 styled "${style}" — an h1 is Heading/1; drop textStyle, or use level 2 for a section title.`;
    } },
  { id: "table/title-heading-4", components: ["Text", "Heading"], severity: "warn", allow: "table-title", guideline: "docs/guidelines/table.md",
    summary: "A table's title is Heading/4 — via the Table `caption` or a Heading/4 Text or Heading directly above the <Table>.",
    check: ({ attrs, src, end }) => { const style = literal(attrs, "textStyle") ?? literal(attrs, "style"); if (!style || style === "Heading/4") return null; return nextSibling(src, end)?.tag === "Table" && `titles the table below with "${style}" — table titles are Heading/4 (or pass the title as <Table caption>).`; } },
  { id: "table/needs-name", components: ["Table"], severity: "error", allow: "table-name", guideline: "docs/guidelines/table.md",
    summary: "A Table is named by a caption or aria-label.",
    check: ({ attrs }) => !present(attrs, "caption") && !named(attrs) && "has neither caption nor aria-label." },
  { id: "table/interaction-needs-handler", components: ["Table"], severity: "warn", allow: "table-handler", guideline: "docs/guidelines/table.md",
    summary: "Selectable tables need onSelectionChange; sortable columns need onSortChange.",
    check: ({ attrs }) => { if (opaque(attrs)) return null; if (has(attrs, "selectable") && !/selectable=\{false\}/.test(attrs) && !present(attrs, "onSelectionChange")) return "is selectable without onSelectionChange."; return /sortable:\s*true/.test(value(attrs, "columns") ?? "") && !present(attrs, "onSortChange") && "has sortable columns without onSortChange."; } },
  { id: "list-item/trailing-button-medium", components: ["ListItem"], severity: "warn", allow: "trailing-size", guideline: "docs/guidelines/list-item.md",
    summary: "Buttons in a List-Item trailing slot are size Medium (md).",
    check: ({ attrs }) => { const t = value(attrs, "trailing") ?? ""; const bad = [...t.matchAll(/<(?:IconButton|Button)\b[^]*?size="([^"]+)"/g)].map((m) => m[1]).find((size) => step(size) !== "md"); return bad && `has a trailing button at size "${bad}" — use size="md".`; } },
  { id: "button/compact-size-special", components: ["Button"], severity: "warn", allow: "compact-button", guideline: "docs/guidelines/button.md",
    summary: "Text buttons at XSmall/2XSmall are for special compact pills only — like the App Store's Get / Install / Open next to a list row. Actions in examples, cards, toolbars and forms use sm or larger.",
    check: ({ attrs }) => { const size = value(attrs, "size"); return (step(size) === "xs" || step(size) === "2xs") && `is size "${size}" — use sm (or larger); keep xs/2xs for Get/Install-style row pills and justify with zen-allow-compact-button.`; } },
  { id: "chat/reply-cancellable", components: ["ChatComposer"], severity: "warn", allow: "reply-cancel", guideline: "docs/guidelines/chat.md",
    summary: "A ChatComposer showing a reply (replyTo) also takes onCancelReply, so × and Escape can drop the reply.",
    check: ({ attrs }) => has(topLevel(attrs), "replyTo") && !has(topLevel(attrs), "onCancelReply") && "sets replyTo without onCancelReply — the \u201cReplying to\u201d bar can't be dismissed." },
  { id: "popover/bulk-action-limit", components: ["PopoverBulkAction", "PopoverBunkAction"], severity: "warn", allow: "bulk-action", guideline: "docs/guidelines/popover.md",
    summary: "Popover/Bulk-Action is a named toolbar (aria-label) of at most 6 Button/Icon-Flat Medium actions — more belongs in a context menu or side panel.",
    check: ({ attrs, children }) => { if (!has(topLevel(attrs), "aria-label")) return "has no aria-label — name the selection toolbar (\"Selection actions\", \"Actions for 3 files\")."; const n = ((children ?? "").match(/<IconButton\b/g) ?? []).length; return n > 6 && `has ${n} actions — keep Bulk-Action to 6 and move the rest into a context menu.`; } },
  { id: "badge/count-uses-counter", components: ["Badge"], severity: "warn", allow: "badge-count", guideline: "docs/guidelines/badge.md",
    summary: "A bare count (a number, or an expression like count / length / total / unread) is a Badge-Counter, not a Badge — BadgeCounter keeps the round pill and a min width equal to its height.",
    check: ({ children }) => { const c = (children ?? "").trim(); const numeric = /^\d+\+?$/.test(c) || /^\{\s*(String\()?[\w.$]*(count|length|total|unread|countIn)\b[^}]*\}$/i.test(c); return numeric && `shows a count (\`${c.slice(0, 40)}\`) — use <BadgeCounter value={…} />.`; } },
  { id: "table/media-size-by-subtext", components: ["TableMedia"], severity: "warn", allow: "table-media-size", guideline: "docs/guidelines/table.md",
    summary: "TableMedia follows the Figma cell primitives: with a caption (Subtext=Yes) Avatar/Photo is Small 32px and a basic Icon lg 28px; without one Avatar is XSmall 24px and Icon base 20px; Dock Icon follows Avatar (XSmall 24px → Small 32px with a caption).",
    check: ({ attrs }) => {
      const media = value(attrs, "media") ?? ""; const captioned = has(topLevel(attrs), "caption");
      const size = (tag) => (media.match(new RegExp(`<${tag}\\b[^>]*?\\bsize="([^"]+)"`)) ?? [])[1];
      if (/<Avatar\b/.test(media)) { const want = captioned ? "small" : "xsmall"; const got = size("Avatar"); if (step(got) !== step(want)) return `uses Avatar size "${got ?? "default"}" ${captioned ? "with" : "without"} a caption — use "${want}".`; }
      if (/<DockIcon\b/.test(media)) { const want = captioned ? "small" : "xsmall"; const got = size("DockIcon"); if (step(got) !== step(want)) return `uses DockIcon size "${got ?? "default"}" ${captioned ? "with" : "without"} a caption — use "${want}".`; }
      if (/<Icon\b/.test(media)) { const want = captioned ? "lg" : "base"; const got = size("Icon"); if ((got ?? "base") !== want) return `uses Icon size "${got ?? "default"}" ${captioned ? "with" : "without"} a caption — use "${want}".`; }
      return null;
    } },
  { id: "table/editor-needs-commit", components: ["Table"], severity: "error", allow: "editor-commit", guideline: "docs/guidelines/table.md",
    summary: "An editable column (edit: { … }) saves through onCommit; without it edits are silently lost.",
    check: ({ attrs }) => { const col = arrayObjects(expr(attrs, "columns")).find((c) => /\bedit:\s*\{/.test(c) && !/onCommit/.test(c)); return col && `has an editable column without onCommit (${(col.match(/id:\s*"([^"]+)"/) ?? [])[1] ?? "column"}).`; } },
  { id: "table/editor-number-right", components: ["Table"], severity: "warn", allow: "editor-align", guideline: "docs/guidelines/table.md",
    summary: "Number editors live in right-aligned columns, like the numbers they edit.",
    check: ({ attrs }) => { const col = arrayObjects(expr(attrs, "columns")).find((c) => /type:\s*"number"/.test(c) && !/align:\s*"right"/.test(c)); return col && `edits numbers in a left-aligned column (${(col.match(/id:\s*"([^"]+)"/) ?? [])[1] ?? "column"}) — add align: "right".`; } },
  { id: "table/editor-number-validate", components: ["Table"], severity: "warn", allow: "editor-validate", guideline: "docs/guidelines/table.md",
    summary: "Number editors validate input (range, integer) and explain the error inline.",
    check: ({ attrs }) => { const col = arrayObjects(expr(attrs, "columns")).find((c) => /type:\s*"number"/.test(c) && !/validate/.test(c)); return col && `has a number editor without validate (${(col.match(/id:\s*"([^"]+)"/) ?? [])[1] ?? "column"}).`; } },
  { id: "rating/needs-name", components: ["Rating", "OpinionScale", "NpsScale", "ColorSelector"], severity: "warn", allow: "choice-name", guideline: "docs/guidelines/rating.md",
    summary: "Rating, Opinion/NPS scales and Color Selector are radio groups: name them with aria-label (the question or the setting).",
    check: ({ attrs }) => !named(attrs) && "has no aria-label — screen readers would only hear a generic group name." },
  { id: "metric/formatted-value", components: ["Metric", "MetricCard"], severity: "warn", allow: "metric-format", guideline: "docs/guidelines/metric.md",
    summary: "Metric values are passed pre-formatted with units and separators (\"$1,680.68\", \"2.1%\"), never a raw number.",
    check: ({ attrs }) => /^\s*-?\d+(\.\d+)?\s*$/.test(expr(attrs, "value") ?? "") && `passes a raw number (${expr(attrs, "value")?.trim()}) — format it with units and separators.` },
  { id: "uploader/needs-label", components: ["FileUpload"], severity: "warn", allow: "upload-label", guideline: "docs/guidelines/uploader.md",
    summary: "A File Upload has a visible label saying what to upload.",
    check: ({ attrs }) => !present(attrs, "label") && "has no label." },
  { id: "uploader/accept-caption", components: ["FileUpload"], severity: "warn", allow: "upload-caption", guideline: "docs/guidelines/uploader.md",
    summary: "When accept limits file types, say so up front in the caption or help text (types and max size).",
    check: ({ attrs }) => present(attrs, "accept") && !present(attrs, "caption") && !present(attrs, "helpText") && "restricts file types (accept) without telling users — add a caption like \"PDF only. Max 2 MB\"." },
  { id: "side-panel/not-for-confirmations", components: ["SidePanel"], severity: "warn", allow: "panel-confirm", guideline: "docs/guidelines/side-panel.md",
    summary: "Destructive confirmations belong in a Dialog, not a Side Panel.",
    check: ({ attrs }) => /label:\s*"(Delete|Remove|Discard|Destroy)\b/i.test(value(attrs, "primaryAction") ?? "") && "asks for a destructive confirmation — use a negative Dialog." },
  { id: "segmented/control-bar-full-width", components: ["TopNavigation", "BottomSheet"], severity: "warn", allow: "segmented-hug", guideline: "docs/guidelines/segmented.md",
    summary: "On mobile, a Segmented in a Top Navigation control bar or a Bottom Sheet spans the container with equal items (fullWidth).",
    check: ({ tag, attrs, children }) => { const where = tag === "TopNavigation" ? expr(attrs, "controlBar") ?? "" : children; const seg = [...where.matchAll(/<Segmented\b([^>]*)>/g)].find(([, a]) => !/\bfullWidth\b/.test(a)); return seg && `has a Segmented that hugs its labels — pass fullWidth so the items share the ${tag === "TopNavigation" ? "control bar" : "sheet"} width.`; } },
  { id: "top-navigation/max-two-trailing", components: ["TopNavigation"], severity: "warn", allow: "nav-trailing", guideline: "docs/guidelines/top-navigation.md",
    summary: "At most two trailing actions in a Top Navigation (a searchAction counts as one while collapsed); move the rest into a ⋯ Bottom Sheet.",
    check: ({ attrs }) => {
      const v = expr(attrs, "trailing"); if (!v || /\.map\(|\.\.\./.test(v)) return null;
      const n = (v.match(/\{\s*icon\s*:/g) ?? []).length, search = has(attrs, "searchAction") ? 1 : 0;
      return n + search > 2 && (search ? `has ${n} trailing actions plus searchAction — while collapsed the Search action takes a slot and the last action is hidden; keep one other trailing action.` : `has ${n} trailing actions — keep two and put the rest in a "More" Bottom Sheet.`);
    } },
  { id: "top-navigation/search-folds-to-action", components: ["TopNavigation"], severity: "warn", allow: "nav-search-fold", guideline: "docs/guidelines/top-navigation.md",
    summary: "A collapsing Top Navigation whose control bar is a Search passes searchAction, so Search stays one tap away (top-right) while the bar is folded.",
    check: ({ attrs }) => has(attrs, "collapsed") && /<Search\b/.test(expr(attrs, "controlBar") ?? "") && !present(attrs, "searchAction") && "collapses with a Search control bar but no searchAction — pass searchAction={{ label, onClick }} so a Search action replaces the bar while collapsed." },
  { id: "bottom-navigation/destinations", components: ["BottomNavigation"], severity: "error", allow: "nav-destinations", guideline: "docs/guidelines/bottom-navigation.md",
    summary: "Bottom Navigation holds 3–5 root destinations.",
    check: ({ attrs }) => { const n = literalCount(attrs, "items"); return n !== undefined && (n < 3 || n > 5) && `has ${n} destinations — use 3–5 (2 → Segmented/Tabs, 6+ → a More destination or Sidebar).`; } },
  { id: "bottom-sheet/action-needs-items", components: ["BottomSheet"], severity: "error", allow: "sheet-items", guideline: "docs/guidelines/bottom-sheet.md",
    summary: "An Action bottom sheet lists its actions in `items`.",
    check: ({ attrs }) => literal(attrs, "type") === "action" && !present(attrs, "items") && "is type=\"action\" without items — pass the actions as items (or use the Modal type for content)." },
  { id: "chat/others-need-author", components: ["ChatMessage"], severity: "warn", allow: "chat-author", guideline: "docs/guidelines/chat.md",
    summary: "Messages from others name their author (avatar + accessible name).",
    check: ({ attrs }) => literal(attrs, "side") === "others" && !present(attrs, "author") && "is from others without an author — pass author={{ name, src }}." },
  { id: "chat/no-locked-interaction", components: ["ChatMessage", "ChatFile", "ChatPhotos", "ChatCall", "ChatComposer", "ChatConversationItem", "ChatReactionPicker"], severity: "warn", allow: "chat-locked", guideline: "docs/guidelines/chat.md",
    summary: "Every Chat interaction works wherever the component is shown: no no-op handlers, and every message can be held/hovered and reacted to (examples wire it with useChatDemo).",
    check: ({ tag, attrs, src, end }) => {
      // Code samples (template strings) are documentation, not live examples: skip tags inside backticks.
      if (((src.slice(0, end).match(/(?<!\\)`/g) ?? []).length) % 2 === 1) return null;
      const noop = attrs.match(/\b(onOpen|onAction|onSend|onMore|onClick|onRetry|onReact|onHoldAction|onMoreReactions)=\{\s*\(\)\s*=>\s*(undefined|\{\s*\})\s*\}/);
      if (noop) return `passes a no-op ${noop[1]} — the interaction looks available but does nothing; make it do something visible.`;
      return tag === "ChatMessage" && !has(attrs, "holdActions") && !has(attrs, "onReact") && !/\{\s*\.\.\./.test(attrs) && "has no hold/hover actions or reactions — every message is interactive (spread useChatDemo().act(id, side) in examples).";
    } },
  { id: "chat/reactions-name-people", components: ["ChatMessage"], severity: "warn", allow: "chat-reactors", guideline: "docs/guidelines/chat.md",
    summary: "Reactions say who reacted (`by`), so pressing the pill can list the people — a bare count hides them.",
    check: ({ attrs, src, end }) => {
      if (((src.slice(0, end).match(/(?<!\\)`/g) ?? []).length) % 2 === 1) return null; // code samples
      const bare = arrayObjects(expr(attrs, "reactions")).find((r) => /\bkind\s*:/.test(r) && !/\bby\s*:/.test(r));
      return bare && `has a reaction without \`by\` (${(bare.match(/kind\s*:\s*"([^"]+)"/) ?? [])[1] ?? "reaction"}) — pass \`by\` (the people who reacted) so the pill opens "who reacted".`;
    } },
  { id: "chat/hold-delete-destructive", components: ["ChatMessage"], severity: "warn", allow: "hold-delete", guideline: "docs/guidelines/chat.md",
    summary: "A Delete / Remove / Unsend hold action is marked destructive (Content/Negative/Light).",
    check: ({ attrs }) => { const v = expr(attrs, "holdActions") ?? ""; return [...v.matchAll(/\{[^{}]*\}/g)].some(([o]) => /label\s*:\s*["'`](Delete|Remove|Unsend)/i.test(o) && !/destructive\s*:\s*true/.test(o)) && "has a Delete action that isn't destructive — add destructive: true (or use chatHoldActions)."; } },
  { id: "ai-chat/no-actions-while-streaming", components: ["AiChatBubble"], severity: "warn", allow: "ai-streaming-actions", guideline: "docs/guidelines/ai-chat.md",
    summary: "Hide Copy / Regenerate / feedback while the assistant is thinking or an answer is still streaming.",
    check: ({ attrs }) => { const actions = expr(attrs, "actions") ?? ""; return (has(attrs, "streaming") || has(attrs, "thinking")) && !/(streaming|thinking)=\{\s*false\s*\}/.test(attrs) && !actions.includes("?") && /\[\s*\{/.test(actions) && "shows actions on a streaming answer — show them once it finishes (actions={busy ? [] : …})."; } },
  { id: "chart/stack-needs-legend", components: ["StackBarChart"], severity: "error", allow: "chart-legend", guideline: "docs/guidelines/chart.md",
    summary: "Stack-bar charts keep their legend so colour is never the only key.",
    check: ({ attrs }) => /showLegend=\{\s*false\s*\}/.test(attrs) && "hides the legend — colour alone can't identify a series; keep showLegend." },
  { id: "uploader/no-noop-replace", components: ["FileUpload", "UploaderFileItem"], severity: "warn", allow: "noop-replace", guideline: "docs/guidelines/uploader.md",
    summary: "Never pass a no-op onReplace; omit it so Replace re-opens the file picker.",
    check: ({ attrs }) => /^\s*\(\s*[\w,\s]*\)\s*=>\s*(\{\s*\}|undefined|null|void 0)\s*$/.test(expr(attrs, "onReplace") ?? "x") && "passes a no-op onReplace — the Replace action would do nothing; omit it (Replace re-opens the picker) or replace the file." },
  { id: "border/subtle-static-box", css: true, components: [], severity: "warn", allow: "subtle-static-box", guideline: "docs/guidelines/borders.md",
    summary: "A closed box nobody can act on is framed with Neutral/Pale; Neutral/Subtle signals an actionable container.",
    check: (css) => closedBorder(css.body, "subtle") && !isDashed(css.body) && !isMedia(css.selector) && !isActionable(css) && "frames a static box with Border/Neutral/Subtle — non-actionable containers use --zen-color-border-neutral-pale-default." },
  { id: "border/pale-actionable-box", css: true, components: [], severity: "warn", allow: "pale-actionable-box", guideline: "docs/guidelines/borders.md",
    summary: "Actionable containers (hover/press/focus, form controls, clickable cards) use Neutral/Subtle; Pale has no interaction states.",
    check: (css) => closedBorder(css.body, "pale") && !isDashed(css.body) && !isMedia(css.selector) && isActionable(css) && "frames an actionable box with Border/Neutral/Pale — use --zen-color-border-neutral-subtle-* (hover/pressed)." },
  { id: "border/dashed-is-subtle", css: true, components: [], severity: "warn", allow: "dashed-color", guideline: "docs/guidelines/borders.md",
    summary: "Dashed lines and strokes (dashed dividers, empty states, drop zones, Read-only fields) use Neutral/Subtle — never Pale or a raw colour.",
    check: (css) => { const d = weakDash(css.body); return d && `draws a dashed stroke with \`${d.slice(0, 70)}\` — dashed strokes use --zen-color-border-neutral-subtle-default.`; } },
  { id: "layer/root-is-canvas", css: true, components: [], severity: "error", allow: "root-background", guideline: "docs/guidelines/background-layers.md",
    summary: "The page (:root / html / body) is layer 1 and paints a Canvas token: canvas-default (most designs), canvas-alt (white pages) or canvas-flat.",
    check: (css) => { if (!isRootSel(css.selector)) return null; const d = bgDecl(css.body, LAYER.any); return d && !LAYER.canvas.test(d) && `paints the page with \`${d.slice(0, 70)}\` — the page background is --zen-color-background-canvas-default (or -alt / -flat).`; } },
  { id: "layer/canvas-is-page", css: true, components: [], severity: "error", allow: "canvas-layer", guideline: "docs/guidelines/background-layers.md",
    summary: "Canvas is only the page layer; components never paint Canvas — cards and containers on the page use Surface.",
    check: (css) => { const d = bgDecl(css.body, LAYER.canvas); if (!d) return null; if (/src\/components\//.test(css.file) || !isPageSel(css.selector)) return `paints \`${d.slice(0, 70)}\` on a component — Canvas is the page; use --zen-color-background-surface-default (or -alt) for containers on it.`; return null; } },
  { id: "layer/surface-flat-is-navigation", css: true, components: [], severity: "warn", allow: "surface-flat", guideline: "docs/guidelines/background-layers.md",
    summary: "Surface/Flat is for top/bottom navigation containers on a Canvas/Flat page, so both modes read as one seamless surface.",
    check: (css) => { const d = bgDecl(css.body, LAYER.surfaceFlat); return d && !isNavSel(css.selector) && `uses Surface/Flat outside navigation (\`${d.slice(0, 60)}\`) — cards use surface-default or -alt; Flat is for top/bottom navigation.`; } },
  { id: "surface/no-shadow-on-tinted", css: true, components: [], severity: "error", allow: "tinted-shadow", guideline: "docs/guidelines/background-layers.md",
    summary: "A Subtle / Pale / Surface-Alt background never casts a drop shadow (inset effects and 0 0 0 Npx rings are fine); guard component shadows with <bg>-shadow-off.",
    check: ({ body }) => {
      const bg = body.match(/(?:^|[;{\s])background(?:-color)?\s*:([^;]+)/)?.[1] ?? "";
      if (!/--zen-color-background-[a-z0-9-]*(subtle|pale)[a-z0-9-]*|--zen-color-background-surface-alt\b/.test(bg)) return false;
      const shadow = body.match(/(?:^|[;{\s])box-shadow\s*:([^;]+)/)?.[1] ?? "";
      return outerShadow(shadow) && `pairs a tinted background (${bg.trim().match(/--zen-color-background-[a-z0-9-]+/)?.[0]}) with a drop shadow — drop the shadow (§9), keep only a 0 0 0 1px ring or an inset effect.`;
    } },
  { id: "layer/surface-on-canvas-alt-border", css: true, components: [], severity: "error", allow: "surface-on-canvas-alt", guideline: "docs/guidelines/background-layers.md",
    summary: "Canvas/Alt and Surface/Default are the same colour: a Surface/Default box on a Canvas/Alt page needs a border (Pale if static, Subtle if actionable) — a shadow alone is not enough.",
    check: (css) => {
      if (!/(^|[;{\s])background(-color)?\s*:[^;]*--zen-color-background-surface-default\b/.test(css.body) || hasFrame(css.body)) return null;
      const parts = css.selector.split(",").map((part) => part.trim());
      const host = canvasAltPainters(css.src ?? "").find((painter) => parts.some((part) => part !== painter && (part.startsWith(`${painter} `) || part.includes(` ${painter} `))));
      return host && `puts a Surface/Default box inside \`${host.slice(0, 50)}\` (Canvas/Alt, the same colour) with no border — add a 0 0 0 1px ring in --zen-color-border-neutral-pale-default (Subtle if actionable) or use surface-alt.`;
    } },
  { id: "layer/container-is-modal", css: true, components: [], severity: "warn", allow: "container-layer", guideline: "docs/guidelines/background-layers.md",
    summary: "Background/Container (layer 4) is reserved for Modal and Bottom-Sheet panels.",
    check: (css) => { const d = bgDecl(css.body, LAYER.container); return d && !isModalSel(css.selector) && `uses Background/Container outside a modal or sheet (\`${d.slice(0, 60)}\`) — cards on the page use Surface.`; } },
  { id: "layer/popover-is-overlay", css: true, components: [], severity: "warn", allow: "popover-layer", guideline: "docs/guidelines/background-layers.md",
    summary: "Background/Popover (layer 5, the top layer) is for floating overlays: popovers, menus, tooltips, pickers, flyouts, toasts.",
    check: (css) => { const d = bgDecl(css.body, LAYER.popover); return d && !isOverlaySel(css.selector) && `uses Background/Popover on an in-flow element (\`${d.slice(0, 60)}\`) — Popover is the floating top layer; in-page boxes use Surface.`; } },
  { id: "color/token-only", css: true, components: [], severity: "error", allow: "raw-colour", guideline: "docs/guidelines/borders.md",
    summary: "Component CSS uses --zen-* colour tokens (raw values only as var() fallbacks); raw colours break theme and mode switching.",
    check: (css) => { if (/src\/(platform|styles)\//.test(css.file)) return null; const d = rawColour(css.body); return d && `uses a raw colour in \`${d.slice(0, 70)}\` — use a --zen-color-* token (raw values only as var() fallbacks).`; } },
  { id: "focus/visible-ring", css: true, components: [], severity: "error", allow: "focus-ring", guideline: "docs/guidelines/button.md",
    summary: "Removing the outline on focus requires a replacement ring (Focus/Accent) on the same element.",
    check: (css) => dropsFocus(css) && "removes the focus outline and nothing in this file draws a replacement ring — keyboard users lose their place." },
  { id: "motion/reduced-motion", css: true, components: [], severity: "warn", allow: "motion", guideline: "docs/guidelines/skeleton.md",
    summary: "Every animation has a prefers-reduced-motion fallback in the same file.",
    check: (css) => /(^|[;{\s])animation(-name)?\s*:\s*(?!none)/.test(css.body) && !/prefers-reduced-motion/.test(css.src) && "animates without a prefers-reduced-motion: reduce fallback in this file." },
  { id: "progress/needs-label", components: ["ProgressBar", "ProgressCircle"], severity: "error", allow: "progress-label", guideline: "docs/guidelines/progress.md",
    summary: "Progress needs a visible label or an aria-label.",
    check: ({ attrs }) => !present(attrs, "label") && !named(attrs) && "has neither label nor aria-label." },
  { id: "progress/quota-scale", components: ["ProgressBar"], severity: "warn", allow: "progress-scale", guideline: "docs/guidelines/progress.md",
    summary: "A Status bar that measures usage against a limit (storage, quota, seats, credits) uses scale=\"quota\" so high values turn Warning/Negative, not green.",
    check: ({ attrs }) => literal(attrs, "theme") === "status" && !has(attrs, "scale") && /storage|quota|usage|used|seats|credits|limit|disk|bandwidth/i.test(`${value(attrs, "label") ?? ""} ${value(attrs, "aria-label") ?? ""}`) && "measures usage against a limit on the completion scale (high = green) — add scale=\"quota\"." },
  { id: "segmented/icon-only-needs-name", components: ["Segmented"], severity: "error", allow: "segment-name", guideline: "docs/guidelines/segmented.md",
    summary: "Icon-only segments (label null / empty) carry an \"aria-label\" in their option.",
    check: ({ attrs }) => { const o = arrayObjects(expr(attrs, "options")).find((obj) => /\blabel:\s*(null|undefined|""|<Icon\b)/.test(obj) && !/"aria-label"\s*:/.test(obj)); return o && `has an icon-only segment without "aria-label" (${(o.match(/id:\s*"([^"]+)"/) ?? [])[1] ?? "option"}).`; } },
  { id: "color-selector/token-values", components: ["ColorSelector"], severity: "warn", allow: "swatch-raw", guideline: "docs/guidelines/color-selector.md",
    summary: "Swatch values are colour tokens (var(--zen-color-…)), never raw hex/rgb, so they follow theme and mode.",
    check: ({ attrs }) => { const v = expr(attrs, "colors") ?? ""; const raw = v.match(/value\s*:\s*["'`](#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i) ?? v.match(/\[\s*["'](#[0-9a-f]{3,8})["']/i); return raw && `uses a raw colour value (${raw[1]}) — pass var(--zen-color-background-support-<hue>-solid) and map it back to your id.`; } },
  { id: "layout/use-stack", components: ["div", "section"], consumerOnly: true, severity: "warn", allow: "raw-layout", guideline: "docs/guidelines/layout.md",
    summary: "Arrange children with Stack or Grid (gap, padding and columns come from spacing tokens), not a div with an inline flex/grid style. (App mode only.)",
    check: ({ attrs }) => { const style = expr(attrs, "style") ?? ""; return /display\s*:\s*["'](inline-)?(flex|grid)["']/.test(style) && `lays out its children with an inline ${/grid/.test(style) ? "grid" : "flex"} style — use <${/grid/.test(style) ? "Grid columns" : "Stack direction"} gap="md">, so spacing comes from the Zen tokens.`; } },
  { id: "text/use-text", components: ["h1", "h2", "h3", "h4", "h5", "h6", "p"], consumerOnly: true, severity: "warn", allow: "raw-text", guideline: "docs/guidelines/text.md",
    summary: "Headings and paragraphs are <Heading level> and <Text>: raw h1–h6/p keep the browser margins and no Zen text style. (App mode only.)",
    check: ({ tag, attrs }) => (literal(attrs, "className") ?? "").includes("zen-type-") ? null : `is a raw <${tag}> — use ${tag === "p" ? "<Text>" : `<Heading level={${tag.slice(1)}}>`} (Zen text style and colour, no browser margins).` },
  { id: "api/deprecated-prop", components: deprecatedComponents, consumerOnly: true, severity: "warn", allow: "deprecated", guideline: "docs/guidelines/README.md",
    summary: "A deprecated prop still works but has a canonical name (onValueChange, onCheckedChange, checked, selected, level…); apps get a warning with the replacement. (App mode only; the repo migrates gradually.)",
    check: ({ tag, attrs }) => { const map = DEPRECATED[tag] ?? {}; const own = topLevel(attrs); const hit = Object.keys(map).find((prop) => has(own, prop)); return hit && `uses deprecated \`${hit}\` — ${map[hit].replace(/\.$/, "")}.`; } },
  { id: "icon/unknown-name", components: ["Icon", "IconButton", "Button", "MenuItem", "EmptyState", "Stepper", "DockIcon", "Slider", "Metric", "MetricCard", "SidePanel"], severity: "error", allow: "icon-name", guideline: "docs/guidelines/icon.md",
    summary: "Icon names must exist (1,598 names that follow the Figma layer path, e.g. icon-search-medium-line); search them instead of guessing (MCP search_icons, or the Iconography page).",
    check: ({ attrs }) => { if (!ICON_NAMES) return null; const bad = literalIconNames(attrs).find((n) => !ICON_NAMES.has(n)); return bad && `uses unknown icon "${bad}" — did you mean ${closestIcons(bad).map((n) => `"${n}"`).join(", ")}?`; } },
  { id: "icon/size-token", components: ["Icon"], severity: "error", allow: "icon-size", guideline: "docs/guidelines/icon.md",
    summary: "Icon size is a size token (2xs · xs · sm · base · md · lg · xl · 2xl · 3xl) or a number of pixels; any other string is passed to CSS and the SVG falls back to its intrinsic size.",
    check: ({ attrs }) => { const size = literal(attrs, "size"); return size !== undefined && !/^(2xs|xs|sm|base|md|lg|xl|2xl|3xl)$/.test(size) && !/^\d+(\.\d+)?(px|rem|em)$|^var\(--/.test(size) && `has size="${size}", which is not an Icon size — use 2xs · xs · sm · base · md · lg · xl · 2xl · 3xl or a number.`; } },
  { id: "copy/plural-count", components: ["Text", "Badge", "ListItem", "Chip", "Tag", "InlineMessage", "EmptyState"], severity: "warn", allow: "plural", guideline: "docs/guidelines/badge.md",
    summary: "Counts agree with their noun (1 item · 2 items): build the phrase with a plural helper, never `{list.length} items`.",
    check: ({ attrs, children }) => {
      // Template literals in props (`${x.length} files`) and JSX text ({x.length} files); a word followed by "=" is the next prop, not copy.
      const hits = [...`${attrs}`.matchAll(/\$\{\s*[\w.]+\.length\s*\}\s+([a-z]+)\b(?!\s*=)/gi), ...`${children}`.matchAll(/\{\s*[\w.]+\.length\s*\}\s+([a-z]+)\b(?!\s*=)/gi)];
      const noun = hits.map((m) => m[1]).find((w) => !/^(of|to|in|on|at|by|for|from|with|and|or|selected|left|more|remaining|out|per|new|total|active|done|open|unread|online|pending|archived|completed|x)$/i.test(w));
      return noun && `prints a count straight before "${noun}" — "1 ${noun}" / "2 ${noun}" can't both be right; use a plural helper (plural(n, "item")).`;
    } },
  { id: "form/actions-order", components: ["FormActions"], severity: "warn", allow: "actions-order", guideline: "docs/guidelines/form.md",
    summary: "FormActions lists Tertiary (cancel) first and Primary (submit) last; it puts Primary on the right, or on top when the actions stack on a phone.",
    check: ({ children }) => {
      // Buttons in source order; no level = Primary (the Button default); level={…} is unknown and ignored.
      const levels = [...children.matchAll(/<Button\b((?:[^>{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)>/g)].map(([, a]) => literal(a, "level") ?? (has(a, "level") ? null : "primary"));
      const primary = levels.indexOf("primary");
      return primary >= 0 && levels.slice(primary + 1).includes("tertiary") && "puts the Primary button before a Tertiary one — write Tertiary (cancel) first and Primary (submit) last; FormActions places Primary on the right, or on top when stacked.";
    } },
  { id: "form/submit-button", components: ["FormActions"], severity: "warn", allow: "form-submit", guideline: "docs/guidelines/form.md",
    summary: "One Button in FormActions is type=\"submit\" (Zen Buttons default to type=\"button\"), so both the button and Enter in a field submit the form.",
    check: ({ children }) => /<Button\b/.test(children) && !/\{\s*\.\.\./.test(children) && !/<Button\b[^>]*\btype=(?:"submit"|\{)/.test(children) && "has no type=\"submit\" Button — Zen Buttons default to type=\"button\", so neither the button nor Enter submits the form; add type=\"submit\" to the Primary button." },
  { id: "form/toggle-outside-form", components: ["Form"], severity: "warn", allow: "form-toggle", guideline: "docs/guidelines/form.md",
    summary: "Toggles apply at once, so they never wait for a Form's submit: use a Checkbox for values the submit saves, and keep instant Toggles outside the Form.",
    check: ({ children }) => /<(Toggle|ToggleButton)\b/.test(children) && "contains a Toggle — a switch implies the change applies at once; use a Checkbox (saved with the form) or move the Toggle out of the Form and save it on change." },
  { id: "form-fieldset/needs-legend", components: ["FormFieldset"], severity: "error", allow: "fieldset-legend", guideline: "docs/guidelines/form.md",
    summary: "Every FormFieldset has a legend that names the group; screen readers read it before each option.",
    check: ({ attrs }) => !present(attrs, "legend") && "has no legend — name the group (legend=\"Delivery\"); add hideLegend when a heading right above already names it." },
  { id: "form-fieldset/radio-kind", components: ["FormFieldset"], severity: "warn", allow: "fieldset-kind", guideline: "docs/guidelines/form.md",
    summary: "A FormFieldset of RadioButtons sets kind=\"radio\", so it becomes a radiogroup that carries aria-required and aria-invalid.",
    check: ({ attrs, children }) => /<RadioButton\b/.test(children) && !opaque(attrs) && expr(attrs, "kind") === undefined && literal(attrs, "kind") !== "radio" && "groups RadioButtons without kind=\"radio\" — add it so the fieldset is a radiogroup (role, aria-required, aria-invalid)." },
  { id: "link/needs-href", components: ["Link"], severity: "error", allow: "link-href", guideline: "docs/guidelines/link.md",
    summary: "A Link goes somewhere: give it href, or a router link through `as` (+ `to`). An action on the page is a Button.",
    check: ({ attrs }) => !present(attrs, "href") && !present(attrs, "as") && !present(attrs, "to") && "has no href (and no `as` router link) — a link must navigate; for an action on this page use a Button (level=\"tertiary\" or appearance=\"flat\")." },
  { id: "link/vague-text", components: ["Link"], severity: "warn", allow: "vague-link", guideline: "docs/guidelines/link.md",
    summary: "Link text names the destination on its own (“Billing settings”), never “click here”, “here”, “read more” or “learn more”.",
    check: ({ attrs, children }) => { const label = text(children); return /^(click here|here|read more|learn more|more|see more|this link|link)$/i.test(label) && !named(attrs) && `says "${label}" — name the destination ("Pricing plans", "Billing settings"); screen-reader users often list links out of context.`; } },
  { id: "link/new-tab-is-external", components: ["Link"], severity: "warn", allow: "new-tab", guideline: "docs/guidelines/link.md",
    summary: "A link that opens a new tab uses `external` (icon + hidden “(opens in a new tab)” + rel), not a bare target=\"_blank\".",
    check: ({ attrs }) => literal(attrs, "target") === "_blank" && !has(attrs, "external") && "sets target=\"_blank\" without external — use external so the icon, the hidden “(opens in a new tab)” and rel=\"noopener noreferrer\" come with it." },
  { id: "link/inherit-needs-underline", components: ["Link"], severity: "warn", allow: "link-underline", guideline: "docs/guidelines/link.md",
    summary: "A tone=\"inherit\" link keeps its default underline (always): in the text's own colour the underline is the only cue.",
    check: ({ attrs }) => literal(attrs, "tone") === "inherit" && ["hover", "none"].includes(literal(attrs, "underline") ?? "") && `is tone="inherit" with underline="${literal(attrs, "underline")}" — nothing marks it as a link until it is hovered; keep the default underline (always).` },
  { id: "menu/not-for-selection", components: ["Menu", "MenuItem"], severity: "warn", allow: "menu-selection", guideline: "docs/guidelines/menu.md",
    summary: "A Menu runs actions. Choosing a value (a selected or checked item) is a SelectField, a Segmented or a Chip + Popover.",
    check: ({ tag, attrs }) => (tag === "MenuItem" ? has(attrs, "selected") || has(attrs, "checked") : /\b(selected|checked)\s*:/.test(expr(attrs, "items") ?? "")) && "marks an item selected or checked — a Menu is for actions; pick values with SelectField, Segmented or Chip variant=\"advanced\" (Popover)." },
  { id: "menu/needs-trigger", components: ["Menu"], severity: "error", allow: "menu-trigger", guideline: "docs/guidelines/menu.md",
    summary: "A Menu has a trigger: a Button, or an IconButton whose aria-label names the object (“Actions for INV-1042”).",
    check: ({ attrs }) => !present(attrs, "trigger") && "has no trigger — nothing can open it; pass trigger={<IconButton aria-label=… icon={…} />} or a Button." },
  { id: "layout/scroll-anchor-flex-end", css: true, components: [], severity: "warn", allow: "flex-end-scroll", guideline: "docs/guidelines/chat.md",
    summary: "A scrolling column that anchors content to the bottom uses margin-top:auto on its first child; justify-content:flex-end pushes overflow above the scroll origin where it can't be reached.",
    check: (css) => /justify-content\s*:\s*flex-end/.test(css.body) && /overflow(-y)?\s*:\s*(auto|scroll)/.test(css.body) && /flex-direction\s*:\s*column/.test(css.body) && "anchors a scrolling column with justify-content:flex-end — overflowing items become unreachable; use `> :first-child { margin-top: auto }`." },
  { id: "image/needs-alt", components: ["Image", "Thumbnail"], severity: "error", allow: "image-alt", guideline: "docs/guidelines/image.md",
    summary: "Image and Thumbnail always carry alt: what the picture shows, or alt=\"\" when it is decorative or the text beside it already names it.",
    check: ({ attrs }) => !present(attrs, "alt") && "has no alt — describe what the picture shows, or pass alt=\"\" when text next to it already names it." },
  { id: "image/alt-describes", components: ["Image", "Thumbnail"], severity: "warn", allow: "image-alt-text", guideline: "docs/guidelines/image.md",
    summary: "alt describes the picture in context: never a file name, and never \"image of…\" / \"photo of…\" (screen readers already announce an image).",
    check: ({ attrs }) => { const alt = literal(attrs, "alt")?.trim(); return Boolean(alt) && (/\.(jpe?g|png|gif|webp|avif|svg|heic)$/i.test(alt) || /^(an? )?(image|picture|photo|photograph|graphic|icon) of\b/i.test(alt)) && `alt "${alt}" is a file name or starts with "image of" — say what the picture shows ("White houses and a windmill by the sea").`; } },
  { id: "action-bar/one-primary", components: ["ActionBar"], severity: "error", allow: "two-primary", guideline: "docs/guidelines/action-bar.md",
    summary: "An Action Bar holds one Primary, the screen's main action; everything else is Tertiary (or Danger when irreversible).",
    check: ({ attrs, children }) => {
      const own = topLevel(attrs);
      const objects = (has(own, "primaryAction") && (actionLevel(value(attrs, "primaryAction")) ?? "primary") === "primary" ? 1 : 0) + (actionLevel(value(attrs, "secondaryAction")) === "primary" ? 1 : 0);
      const n = objects + openingTags(children, "Button").filter((a) => levelOf(a) === "primary").length;
      return n > 1 && `holds ${n} Primary actions — keep one Primary (the main action) and make the others Tertiary.`;
    } },
  { id: "action-bar/primary-order", components: ["ActionBar"], severity: "warn", allow: "action-order", guideline: "docs/guidelines/action-bar.md",
    summary: "Button children follow the visual order: Primary first (on top) in a vertical bar, last (at the end) in a horizontal one. primaryAction / secondaryAction are ordered for you.",
    check: ({ attrs, children }) => {
      if (expr(attrs, "direction") !== undefined) return null; // chosen at run time (per breakpoint): use primaryAction / secondaryAction
      const levels = openingTags(children, "Button").map(levelOf);
      const at = levels.indexOf("primary");
      if (levels.length < 2 || at < 0) return null;
      const horizontal = literal(attrs, "direction") === "horizontal";
      return horizontal
        ? at !== levels.length - 1 && "lists the Primary before other buttons in a horizontal bar — put it last (Tertiary · Primary)."
        : at !== 0 && "lists the Primary after other buttons in a vertical bar — put it first so it sits on top.";
    } },
  { id: "action-bar/full-width-size", components: ["ActionBar"], severity: "error", allow: "small-full-width", guideline: "docs/guidelines/action-bar.md",
    summary: "A vertical Action Bar stretches its buttons across the width, so they are size lg (the mobile footer CTA), never 2xs · xs · sm.",
    check: ({ attrs, children }) => {
      if (literal(attrs, "direction") === "horizontal" || expr(attrs, "direction") !== undefined) return null;
      const small = openingTags(children, "Button").map((a) => literal(topLevel(a), "size")).find((size) => size && SMALL_BUTTON.test(size));
      return small && `stretches a size "${small}" Button across a vertical bar — use size="lg" (or primaryAction / secondaryAction, which size themselves).`;
    } },
  { id: "visually-hidden/focusable-shows", components: ["VisuallyHidden"], severity: "error", allow: "hidden-focus", guideline: "docs/guidelines/visually-hidden.md",
    summary: "Hidden content that takes keyboard focus (a skip link, a button) needs focusable, so it becomes visible while focused (WCAG 2.4.7).",
    check: ({ attrs, children }) => {
      const focusable = has(attrs, "focusable") && !/focusable=\{\s*false\s*\}/.test(attrs);
      const takesFocus = literal(attrs, "as") === "a" || /<(a|button|Button|IconButton|Link|input|select|textarea|InputField|Checkbox)\b|tabIndex=\{\s*0\s*\}|tabIndex="0"/.test(children);
      return takesFocus && !focusable && "hides a link or control that takes focus — keyboard users would land on something invisible; add focusable (it shows while focused) or move the control out.";
    } },
  { id: "description-list/one-emphasis", components: ["DescriptionList"], severity: "warn", allow: "two-totals", guideline: "docs/guidelines/description-list.md",
    summary: "One emphasised row per list: the total that closes the calculation.",
    check: ({ attrs, children }) => {
      const n = (value(attrs, "items")?.match(/\bemphasis\s*:\s*true\b/g) ?? []).length + openingTags(children, "DescriptionItem").filter((a) => has(topLevel(a), "emphasis") && !/emphasis=\{\s*false\s*\}/.test(a)).length;
      return n > 1 && `emphasises ${n} rows — keep emphasis for the one total; the rows above it stay regular.`;
    } },
  // Locked interactions and invisible focus, found by the behaviour probes (npm run platform:behaviour, 2026-09-28).
  { id: "interaction/no-noop-handler", components: handlerComponents, severity: "warn", allow: "noop-handler", guideline: "docs/guidelines/README.md",
    summary: "Every interaction a Zen control offers works: no no-op handlers (`() => {}`, `() => undefined`), which leave a field that ignores typing and ↑/↓ or a Dismiss that stays. Chat has chat/no-locked-interaction.",
    check: ({ attrs, src, end }) => {
      if (inCodeSample(src, end) || /@storybook\//.test(src)) return null; // code samples and stories are documentation
      for (const [name, v] of topAttrs(attrs)) {
        if (v.expr === undefined) continue;
        // onReplace: uploader/no-noop-replace (omitting it re-opens the picker).
        if (/^on[A-Z]/.test(name) && name !== "onReplace" && NOOP_FN.test(v.expr)) return `passes a no-op ${name} — the control looks usable but does nothing; wire it so something visible happens, or leave the prop out.`;
        const key = ACTION_OBJECTS.test(name) && v.expr.match(NOOP_KEY);
        if (key) return `passes a no-op ${key[1]} in ${name} — that action does nothing; make it do something visible or leave the action out.`;
      }
      return null;
    } },
  { id: "interaction/controlled-needs-handler", components: controlledComponents, severity: "warn", allow: "controlled-handler", guideline: "docs/guidelines/README.md",
    summary: "A controlled prop comes with its change handler (month + onMonthChange, value + onValueChange, open + onOpenChange, pageSize + onPageSizeChange…): without it nothing can change the value and the control is frozen, e.g. a DatePicker whose Previous/Next do nothing. Bare booleans (a fixed preview) and `x ? true : undefined` pins pass.",
    check: ({ tag, attrs, src, end }) => {
      if (opaque(attrs) || /@storybook\//.test(src)) return null;
      const own = topAttrs(attrs);
      if (own.has("readOnly") || own.has("disabled") || /read-only|disabled/.test(own.get("state")?.literal ?? "")) return null;
      for (const [prop, handlers] of Object.entries(CONTROLLED[tag] ?? {})) {
        const v = own.get(prop);
        if (!v || v.bare || /^\s*(true|false)\s*$|\bundefined\b/.test(v.expr ?? "")) continue;
        if (tag === "Chip" && prop === "popoverOpen" && !own.has("popoverItems")) continue; // mirrors a sheet it opens, owns no popover
        if (!handlers.some((h) => own.has(h))) return `passes ${prop} without ${handlers.join(" or ")}, so nothing can change it and the control is frozen${inCodeSample(src, end) ? " (a code sample: readers copy it)" : ""} — keep ${prop} in state and add ${handlers[0]}.`;
      }
      return null;
    } },
  // The behaviour probes (2026-09-28): an inline "Report period" whose Cancel and Submit both only closed, doing nothing.
  { id: "date-picker/actions-need-apply", components: ["DatePicker"], severity: "warn", allow: "date-apply", guideline: "docs/guidelines/date-picker.md",
    summary: "A DatePicker with showActions commits in onApply(value, range): picks are a draft that Submit applies and Cancel drops. Without onApply the app never hears what Submit applied.",
    check: ({ attrs, src, end }) => {
      if (/@storybook\//.test(src) || spreadsProps(attrs)) return null;
      const own = topAttrs(attrs);
      const actions = own.get("showActions");
      if (!actions || /^\s*false\s*$/.test(actions.expr ?? "") || own.has("onApply")) return null;
      return `passes showActions without onApply, so Submit applies nothing the app can read${inCodeSample(src, end) ? " (a code sample: readers copy it)" : ""} — commit the picked value in onApply(value, range); Cancel returns to the applied value by itself.`;
    } },
  { id: "interaction/action-without-handler", repoOnly: true, components: ["Button", "button", ...new Set([...Object.keys(ACTION_PROPS), ...Object.keys(ITEM_LISTS)])], severity: "warn", allow: "action-handler", guideline: "docs/guidelines/README.md",
    summary: "Repo examples, playgrounds and templates: every action does something when pressed. Flags a `Button` or `<button>` without onClick / href / type=\"submit\" (IconButton: icon-button/needs-action), an action object ({ icon, label }) in leading, trailing, action, primaryAction, secondaryAction, subAction or actions without onClick, and pressable items whose list has no onSelect / onNavigate / onItemClick / onValueChange. Documented defaults pass: Dialog, ModalForm, SidePanel and BottomSheet actions close the overlay; a Menu opens from its trigger. Apps are not judged.",
    check: ({ tag, attrs, children, src, start, end, file }) => {
      if (inTemplateText(src, start) || /@storybook\//.test(src) || COMPONENT_SOURCE.test(file ?? "")) return null; // code samples, stories, component internals
      const own = topAttrs(attrs);
      if (tag === "Button" || tag === "button") {
        if (spreadsProps(attrs) || PRESS_PROPS.some((p) => own.has(p)) || /submit|reset/.test(own.get("type")?.literal ?? own.get("type")?.expr ?? "")) return null;
        if (pinnedOn(own, "disabled") || pinnedOn(own, "loading") || own.get("aria-disabled")?.literal === "true" || own.get("aria-hidden")?.literal === "true") return null;
        // A Menu clones its trigger and adds the click that opens it: trigger={<Button …/>} (a ternary too), or
        // `const t = <Button …/>` used as trigger={t}.
        const variable = src.slice(Math.max(0, start - 80), start).match(/\b(?:const|let)\s+(\w+)\s*=\s*\(?\s*$/)?.[1];
        if (insideProp(src, start, "trigger") || (variable && new RegExp(`\\btrigger=\\{\\s*${variable}\\s*\\}`).test(src))) return null;
        const name = own.get("aria-label")?.literal ?? own.get("aria-label")?.expr ?? (children ?? "").replace(/<[^>]*>/g, " ").replace(/\{[^{}]*\}/g, "…").replace(/\s+/g, " ").trim();
        return `"${(name || "unnamed").slice(0, 40)}" has no onClick (or href, type="submit"), so pressing it does nothing — make it do something visible (open a sheet or dialog, select, confirm in place, navigate inside the demo) or leave it out.`;
      }
      const dead = [];
      if (!(tag === "ModalActions" && own.has("onDefault"))) for (const prop of ACTION_PROPS[tag] ?? []) {
        const v = own.get(prop)?.expr; if (!v || /^\s*\(?\s*</.test(v)) continue; // a node, not an action object
        const names = objectLiterals(v).filter((o) => o.depth === 0).map((o) => objectProps(o.text)).filter((p) => (p.has("label") || p.has("icon")) && !handlesPress(p)).map(actionName);
        if (names.length) dead.push(`${prop} ${names.join(", ")}`);
      }
      const list = ITEM_LISTS[tag];
      const listLive = !list || own.has(list.handler) || spreadsProps(attrs) || (tag === "BottomSheet" && own.get("type")?.literal !== "action") || (tag === "BottomNavigation" && own.has("value"));
      if (!listLive) for (const prop of list.props) {
        const v = own.get(prop); if (!v) continue;
        if (!list.own) { dead.push(prop); continue; } // entries cannot bring their own handler
        if (v.expr === undefined) continue;
        let entries = objectLiterals(v.expr).map((o) => objectProps(o.text)).filter(pressable);
        if (tag === "Breadcrumbs") entries = entries.slice(0, -1); // the last crumb is the current page, not a button
        const names = entries.filter((p) => !handlesPress(p)).map(actionName);
        if (names.length) dead.push(`${prop} ${names.join(", ")}`);
      }
      if (!dead.length) return null;
      const fix = list && !listLive ? ` (add ${list.handler}${list.own ? ", or give each entry its own handler or href" : ""})` : "";
      return `passes ${dead.join("; ")} with no handler, so pressing them does nothing${fix} — make each one do something visible (open a sheet or dialog, select, confirm in place, navigate inside the demo) or leave it out.`;
    } },
  { id: "focus/state-parity", css: true, components: [], severity: "error", allow: "focus-parity", guideline: "docs/guidelines/input.md",
    summary: "Focus never looks like the state it starts from: a :focus / :focus-visible / :focus-within selector is not listed in the same rule as its resting state (an error field whose focus changed nothing). Give focus its own rule with the ring (WCAG 2.4.7).",
    check: ({ selector }) => {
      const list = selectorParts(selector);
      const resting = new Set(list.filter((p) => !FOCUS_PSEUDO.test(p) && !TRANSIENT_STATE.test(p)).map(normSelector));
      const hit = resting.size ? list.find((p) => FOCUS_PSEUDO.test(p) && !FOCUS_PREVIEW.test(p) && restingOf(p).some((r) => resting.has(r))) : undefined;
      return hit ? `styles \`${hit.slice(0, 70)}\` in the same rule as its resting state, so focus changes nothing there — give the focus selector its own rule that adds the ring (WCAG 2.4.7).` : null;
    } },
  { id: "focus/selected-fill-only", css: true, components: [], severity: "warn", allow: "focus-fill", guideline: "docs/guidelines/popover.md",
    summary: "An item with a filled selected state shows keyboard focus with the Focus/Accent ring, not a fill alone: Selected, Flat/Hover and Flat/Pressed can be the same alpha, so focus on or beside a selected item vanishes.",
    check: ({ selector, body, src }) => {
      if (!hasFill(body) || drawsRing(body)) return null;
      const rules = [...src.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, b]) => [selectorParts(sel), b]);
      for (const part of selectorParts(selector).filter((p) => /:focus(-visible)?\b(?!-)/.test(p))) {
        const item = classesOf(part.split(/:focus/)[0].split(/[\s>+~]+/).pop())[0]; if (!item) continue;
        const onItem = new RegExp(`\\.${item}(?![\\w-])`);
        const selectedFill = rules.some(([parts, b]) => parts.some((q) => onItem.test(q) && SELECTED_STATE.test(q) && !FOCUS_PSEUDO.test(q)) && hasFill(b));
        const ringed = rules.some(([parts, b]) => parts.some((q) => onItem.test(q) && FOCUS_PSEUDO.test(q)) && drawsRing(b));
        if (selectedFill && !ringed) return `shows focus on .${item} with a fill only, and its selected state is a fill too — on or beside a selected item focus can vanish; draw the 3px Focus/Accent ring (inset where a scrolling list clips).`;
      }
      return null;
    } },
];

// CLI only when executed directly (build-guidelines.mjs, cli.mjs, eslint.mjs and the MCP server import the registry).
// No top-level await: cli.mjs imports this module, which must finish evaluating first.
if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  import("./cli.mjs").then(({ main }) => process.exit(main()));
}
