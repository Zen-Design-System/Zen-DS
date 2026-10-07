#!/usr/bin/env node
// Zen DS style guard — token discipline for the things that drift while building: spacing (padding / margin / gap),
// corner radius, typography, colour roles, shadows and slot sizes, in component CSS, platform CSS and inline styles; and raw
// top/right/bottom/left/inset offsets in examples and templates (position/token).
//
//   node tools/style-guard/check-styles.mjs [files or dirs…]   default: src/components, src/platform, src/templates
//     --json               print findings as JSON (for agents and tools/qa/run.mjs)
//     --all                also print findings that are already in the baseline (pre-existing debt)
//     --baseline-update    rewrite tools/style-guard/baseline.json from the current findings (debt only shrinks)
//     --list               print the rule registry as JSON
//
// Errors that are NOT in the baseline exit 1; warnings and baseline findings are printed only. Suppress one occurrence
// with a comment containing `zen-allow-<allow>: <reason>` within the four lines above it (same convention as
// tools/usage-guard). The reason is mandatory by convention and should cite Figma when Figma is the reason.
//
// Why: raw px spacing/radius/type do not follow the Component Size (density), Corner Radius and Typography modes, and a
// token used in the wrong role (a gap token as padding, a background token as text colour) breaks the Figma contract.
// Colour tokens in component CSS are also checked by usage-guard `color/token-only`; this guard adds platform CSS and
// inline styles, which usage-guard does not read.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASELINE_FILE = path.join(root, "tools/style-guard/baseline.json");
const rel = (file) => path.relative(root, path.resolve(root, file)).split(path.sep).join("/");

/* ── token scales (read from src/styles/tokens.css, default modes) ─────────────────────────────────────────────── */
const tokens = (() => {
  const css = fs.readFileSync(path.join(root, "src/styles/tokens.css"), "utf8");
  const block = (header) => { const i = css.indexOf(header); if (i < 0) return ""; const s = css.indexOf("{", i); return css.slice(s + 1, css.indexOf("}", s)); };
  // --zen-dm-N is N px; every other length token resolves through it.
  const dm = {};
  for (const m of css.matchAll(/--zen-dm-(\d+):\s*(\d+)px/g)) dm[`--zen-dm-${m[1]}`] = Number(m[2]);
  const px = (v) => { v = v.trim(); const d = v.match(/^var\((--zen-dm-\d+)\)$/); if (d) return dm[d[1]]; const p = v.match(/^(-?[\d.]+)px$/); return p ? Number(p[1]) : undefined; };
  const scale = (body, re) => { const out = new Map(); for (const m of body.matchAll(re)) { const n = px(m[2]); if (n !== undefined && !out.has(n)) out.set(n, `--${m[1]}`); } return out; };
  const spacingBody = css.slice(css.lastIndexOf(":root {", css.indexOf("--zen-spacing-gap-small")), css.indexOf("}", css.indexOf("--zen-spacing-gap-small")));
  const padding = scale(spacingBody, /--(zen-spacing-padding-[\w-]+):\s*([^;]+);/g);
  const gap = scale(spacingBody, /--(zen-spacing-gap-[\w-]+):\s*([^;]+);/g);
  const radius = scale(block(`[data-radius="rounded"] {`), /--(zen-corner-radius-(?!action|input)[\w-]+):\s*([^;]+);/g);
  // Typography (Dashboard, the default mode): font-size → style name.
  const typeBody = block(`[data-typography="dashboard"] {`);
  const typeSize = new Map();
  for (const m of typeBody.matchAll(/--zen-typography-font-size-([\w-]+):\s*(\d+)px;/g)) if (!typeSize.has(Number(m[2]))) typeSize.set(Number(m[2]), m[1]);
  const lineHeight = new Map();
  for (const m of typeBody.matchAll(/--zen-typography-line-height-([\w-]+):\s*(\d+)px;/g)) (lineHeight.get(Number(m[2])) ?? lineHeight.set(Number(m[2]), []).get(Number(m[2]))).push(m[1]);
  // Which (property → style) token sets a real text style uses, e.g. Body/Code = body-small size + body-code tracking.
  const combos = [];
  const typeCss = fs.readFileSync(path.join(root, "src/styles/typography.css"), "utf8");
  for (const [, body] of typeCss.matchAll(/\.zen-type-[\w-]+\s*\{([^}]*)\}/g)) combos.push(new Set([...body.matchAll(/--zen-typography-(font-size|line-height|letter-spacing)-([\w-]+)/g)].map((m) => `${m[1]}:${m[2]}`)));
  return { padding, gap, radius, typeSize, lineHeight, combos };
})();
const near = (map, n) => [...map.entries()].sort((a, b) => Math.abs(a[0] - n) - Math.abs(b[0] - n))[0];
const suggestLength = (map, n, what) => {
  if (map.has(Math.abs(n))) { const t = map.get(Math.abs(n)); return n < 0 ? `calc(-1 * var(${t}))` : `var(${t})`; }
  const [v, t] = near(map, Math.abs(n)) ?? [];
  return t ? `${Math.abs(n)}px is not on the ${what} scale — nearest is var(${t}) (${v}px); if Figma really uses ${Math.abs(n)}px, bind it to a component token` : `a ${what} token`;
};

/* ── value helpers ──────────────────────────────────────────────────────────────────────────────────────────────── */
// Remove var(…)/env(…) including nested parens: their fallbacks may hold raw values by convention.
const stripFns = (v) => { let prev; do { prev = v; v = v.replace(/\b(var|env)\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)/g, " "); } while (v !== prev); return v; };
const rawLengths = (v) => [...stripFns(v).replace(/url\([^)]*\)/g, " ").matchAll(/(?<![\w#.-])(-?\d*\.?\d+)(px|rem|em)\b/g)].map((m) => ({ n: m[2] === "px" ? Number(m[1]) : Number(m[1]) * 16, text: m[0] }));
const RAW_COLOUR = /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|\b(white|black|red|blue|green|gray|grey|orange|yellow|purple|pink)\b/i;
const tokenFamily = (v) => [...v.matchAll(/--zen-color-(background|content|border|focus|shadow)-/g)].map((m) => m[1]);
const typeTokens = (v) => [...v.matchAll(/--zen-typography-(font-size|line-height|letter-spacing)-([\w-]+)/g)].map((m) => ({ kind: m[1], style: m[2] }));

/* ── selector heuristics ────────────────────────────────────────────────────────────────────────────────────────── */
const words = (sel) => sel.replace(/:(not|has)\((?:[^()]|\([^()]*\))*\)/g, " ").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const SLOT_WORD = /^(icon|avatar|mark|thumb|thumbnail|media|leading|trailing|slot|logo|glyph|swatch|dot|photo|image|img|emoji)$/;
const FIELD_WORD = /^(input|field|select|textarea|search|picker|combobox|date|number|autocomplete|richtext|editor|composer)$/;
const ACTION_WORD = /^(button|btn|chip|tag|segmented|segment|toggle|switch|tab|tabs|pill|action|actions|control|trigger|fab|cta|badge|link|stepper|pagination|page|item|option|menuitem|close|dismiss|remove|clear|handle|thumb|knob)$/;

/* ── rule registry ──────────────────────────────────────────────────────────────────────────────────────────────── */
// scope: which files a rule reads — "css" (stylesheets), "inline" (style={{…}} in TSX), "jsx" (JSX elements).
export const rules = [
  { id: "spacing/token", severity: "error", allow: "raw-spacing", scope: ["css", "inline"], guideline: "docs/qa/build-qa-process.md#spacing",
    summary: "Padding, margin and gap use --zen-spacing-* tokens (padding-* for insets, gap-* for space between items); raw px does not follow Component Size. ±1px border compensation is fine." },
  { id: "spacing/role", severity: "warn", allow: "spacing-role", scope: ["css", "inline"], guideline: "docs/qa/build-qa-process.md#spacing",
    summary: "Padding takes Spacing/Padding/* and gap takes Spacing/Gap/* (Figma scopes them separately)." },
  { id: "radius/token", severity: "error", allow: "raw-radius", scope: ["css", "inline"], guideline: "docs/qa/build-qa-process.md#radius",
    summary: "Corner radius uses --zen-corner-radius-* (action-* on controls, input-* on fields, rounded for always-round); raw px ignores the Corner Radius mode (Rounded/Smooth/Standard/Luxury)." },
  { id: "radius/role", severity: "warn", allow: "radius-role", scope: ["css"], guideline: "docs/qa/build-qa-process.md#radius",
    summary: "Corner-Radius/Input/* belongs to fields and Corner-Radius/Action/* to controls; containers use the container scale (small … xgiant)." },
  { id: "type/token", severity: "error", allow: "raw-type", scope: ["css", "inline"], guideline: "docs/qa/build-qa-process.md#typography",
    summary: "Text uses a Figma text style (<Text>/<Heading> or .zen-type-*) or the --zen-typography-* / --zen-emphasis-font-weight-* tokens — never a raw font-size, line-height, letter-spacing, weight or family." },
  { id: "type/mixed-style", severity: "error", allow: "mixed-type", scope: ["css"], guideline: "docs/qa/build-qa-process.md#typography",
    summary: "font-size, line-height and letter-spacing in one rule come from the same text style (Heading/4 size with Heading/4 line height)." },
  { id: "type/token-role", severity: "error", allow: "type-role", scope: ["css"], guideline: "docs/qa/build-qa-process.md#typography",
    summary: "Each typography token goes on its own property (font-size tokens on font-size, line-height tokens on line-height…)." },
  { id: "type/derived", severity: "warn", allow: "derived-type", scope: ["css"], guideline: "docs/qa/build-qa-process.md#typography",
    summary: "Don't calc() a typography token into a new size: it creates an off-scale text style. Pick the style Figma uses." },
  { id: "type/visual-heading", severity: "warn", allow: "visual-heading", scope: ["jsx"], guideline: "docs/guidelines/text.md",
    summary: "A title styled Heading/* is a <Heading level> (the outline follows the look); <Text textStyle=\"Heading/…\"> is only for values and wordmarks." },
  { id: "type/raw-heading", severity: "warn", allow: "raw-heading", scope: ["jsx"], guideline: "docs/guidelines/text.md",
    summary: "Examples and templates render headings with <Heading level> (a Zen text style), not a bare <h1>–<h6>." },
  { id: "color/token", severity: "error", allow: "raw-colour", scope: ["css", "inline"], guideline: "docs/guidelines/content-colors.md",
    summary: "Platform CSS and inline styles use --zen-color-* tokens too (component CSS is covered by usage-guard color/token-only)." },
  { id: "color/role", severity: "error", allow: "colour-role", scope: ["css", "inline"], guideline: "docs/guidelines/content-colors.md",
    summary: "Text colour comes from Color/Content/*, fills from Color/Background/*, strokes from Color/Border/*: a background or border token is never text colour." },
  { id: "color/role-fill", severity: "warn", allow: "colour-role", scope: ["css", "inline"], guideline: "docs/guidelines/background-layers.md",
    summary: "Backgrounds use Color/Background/* and borders Color/Border/*; a content (text/icon) token as a fill or border needs a reason (icon masks are fine)." },
  { id: "shadow/token", severity: "error", allow: "raw-shadow", scope: ["css", "inline"], guideline: "docs/guidelines/background-layers.md",
    summary: "Elevation uses --zen-style-*-shadow tokens; hand-written shadows ignore theme and mode. Rings (0 0 0 Npx token) and inset hairlines are fine." },
  { id: "size/slot-token", severity: "warn", allow: "slot-size", scope: ["css"], guideline: "docs/qa/build-qa-process.md#density",
    summary: "A slot that holds a token-sized child (icon, avatar, thumbnail, mark) is sized with the same token or a calc of it, so Comfortable density does not overflow it." },
  { id: "position/token", severity: "warn", allow: "raw-position", scope: ["css", "inline"], guideline: "docs/guidelines/layout.md",
    summary: "Examples and templates pin a layer with Stack/Grid/Box position=\"absolute\" + constraintX/constraintY + Spacing/Padding insets (Figma constraints), not raw top/right/bottom/left/inset lengths or percentages; 0, auto and token offsets are fine." },
];
const RULE = Object.fromEntries(rules.map((r) => [r.id, r]));

/* ── declaration checks (shared by CSS and inline styles) ───────────────────────────────────────────────────────── */
const SPACING_PROP = /^(padding|margin)(-(top|right|bottom|left|inline|block|inline-start|inline-end|block-start|block-end))?$|^(gap|row-gap|column-gap|grid-gap|grid-row-gap|grid-column-gap)$/;
const RADIUS_PROP = /^border(-(top|bottom|start|end)-(left|right|start|end))?-radius$/;
const TYPE_PROP = /^(font-size|line-height|letter-spacing|font-weight|font-family|font)$/;
const COLOUR_PROP = /^(color|background|background-color|border|border-(top|right|bottom|left|inline|block)(-color)?|border-color|outline|outline-color|fill|stroke|box-shadow|caret-color|text-decoration-color|column-rule-color|accent-color)$/;
const SIZE_PROP = /^(width|height|min-width|min-height|flex-basis|inline-size|block-size)$/;
const POSITION_PROP = /^(top|right|bottom|left|inset|inset-(inline|block)(-(start|end))?)$/;
/** position/token reads examples and templates only (component CSS owns its overlays: focus rings, status dots). */
const POSITION_SCOPE = /^src\/platform\/examples\/|^src\/templates\/|^tools\/style-guard\/fixtures\//;
// A custom property whose name says what it is (e.g. --zen-chat-bubble-gap: 6px) is checked like that property.
const TOKEN_NAMESPACE = /^--zen-(typography|spacing|corner-radius|dm|color|emphasis|element-size|style|motion|margin|gutter|modal|card-padding|viewport)-/;
const roleOfCustom = (name) => TOKEN_NAMESPACE.test(name) ? null : /radius/.test(name) ? "border-radius" : /(^|-)(padding|inset-x|inset-y|gutter)(-|$)/.test(name) ? "padding" : /(^|-)(gap|spacing)(-|$)/.test(name) ? "gap" : /(font-size|line-height|letter-spacing)/.test(name) ? name.match(/font-size|line-height|letter-spacing/)[0] : null;

/**
 * Checks one declaration. Returns [{ rule, message }]. `ctx` = { selector, body, file, inline }.
 * `body` is the whole rule block (for rules that look at sibling declarations).
 */
function checkDecl(prop, value, ctx) {
  const out = [];
  const add = (rule, message) => out.push({ rule, message });
  const p = prop.startsWith("--") ? roleOfCustom(prop) : prop;
  if (!p) return out;
  const v = value.trim();
  const platformOrInline = ctx.inline || /^src\/(platform|templates)\/|^tools\/style-guard\/fixtures\//.test(ctx.file);

  if (SPACING_PROP.test(p)) {
    const isGap = /gap$/.test(p);
    for (const { n, text } of rawLengths(v)) {
      if (Math.abs(n) <= 1) continue; // hairline / border compensation
      const map = isGap || p.startsWith("margin") ? tokens.gap : tokens.padding;
      add("spacing/token", `raw ${text} in \`${prop}: ${v}\` → ${suggestLength(map, n, isGap || p.startsWith("margin") ? "gap" : "padding")}`);
      break;
    }
    const reserves = /calc\(/.test(v) && /--zen-(element|image|button|icon|avatar|checkbox|toggle|chip|input)-/.test(v);
    if (/^padding/.test(p) && /--zen-spacing-gap-/.test(v) && !reserves) add("spacing/role", `\`${prop}\` uses a Spacing/Gap token — insets take --zen-spacing-padding-*`);
    if (isGap && /--zen-spacing-padding-/.test(v)) add("spacing/role", `\`${prop}\` uses a Spacing/Padding token — space between items takes --zen-spacing-gap-*`);
  }

  if (RADIUS_PROP.test(p)) {
    for (const { n, text } of rawLengths(v)) {
      if (Math.abs(n) <= 1) continue;
      const hint = n >= 999 ? "var(--zen-corner-radius-rounded) for always-round shapes, or var(--zen-corner-radius-action-<size>) on controls so the Corner Radius mode applies" : suggestLength(tokens.radius, n, "corner radius");
      add("radius/token", `raw ${text} in \`${prop}: ${v}\` → ${hint}`);
      break;
    }
    const w = words(ctx.selector ?? "");
    if (!ctx.inline && /--zen-corner-radius-input-/.test(v) && !w.some((x) => FIELD_WORD.test(x))) add("radius/role", `\`${ctx.selector?.trim().slice(0, 60)}\` is not a field but uses Corner-Radius/Input`);
    if (!ctx.inline && /--zen-corner-radius-action-/.test(v) && !w.some((x) => ACTION_WORD.test(x) || FIELD_WORD.test(x))) add("radius/role", `\`${ctx.selector?.trim().slice(0, 60)}\` is not a control but uses Corner-Radius/Action — containers use small…xgiant`);
  }

  if (TYPE_PROP.test(p)) {
    const stripped = stripFns(v);
    if (p === "font-weight") {
      if (/\b([1-9]00|[1-9]50|bold|bolder|lighter)\b/.test(stripped)) add("type/token", `raw weight in \`${prop}: ${v}\` → var(--zen-emphasis-font-weight-regular|medium|semi-bold|bold) (weights follow the Emphasis mode)`);
    } else if (p === "font-family") {
      if (/[a-z]/i.test(stripped.replace(/\b(inherit|initial|unset|sans-serif|serif|monospace|system-ui|ui-sans-serif|ui-monospace|-apple-system)\b/g, "").replace(/["',\s]/g, "")) && !/var\(--zen-typography-font-family-/.test(v))
        add("type/token", `raw family in \`${prop}: ${v.slice(0, 60)}\` → var(--zen-typography-font-family-sans|heading|display|button|dev)`);
    } else if (p === "font") {
      if (!/^(inherit|initial|unset)$/.test(v)) {
        const raw = rawLengths(v);
        if (raw.length || /\b[1-9]00\b/.test(stripped)) add("type/token", `raw values in \`font: ${v.slice(0, 70)}\` → a text style (.zen-type-* / <Text textStyle>) or the typography tokens`);
      }
    } else {
      const raw = rawLengths(v).filter(({ n }) => n !== 0);
      const unitless = p === "line-height" && /^\s*(\d*\.?\d+)\s*$/.test(stripped) && !/^\s*(1|0)\s*$/.test(stripped);
      if (raw.length || unitless) {
        const size = p === "font-size" && raw[0] ? raw[0].n : undefined;
        const style = size !== undefined ? tokens.typeSize.get(size) : undefined;
        const lh = p === "line-height" && raw[0] ? tokens.lineHeight.get(raw[0].n) : undefined;
        const hint = lh ? `var(--zen-typography-line-height-${lh[0]}) (the ${lh.slice(0, 3).join(" / ")} line height) — together with that style's size` : size === undefined ? "the text style's tokens (or a .zen-type-* class)" : style ? `the ${style} style (var(--zen-typography-font-size-${style}) + its line height and letter spacing, or .zen-type-${style}-*)` : `${size}px is not a Zen text size — pick the nearest style (${[...tokens.typeSize.entries()].sort((a, b) => Math.abs(a[0] - size) - Math.abs(b[0] - size)).slice(0, 2).map(([s, n]) => `${n} ${s}px`).join(", ")})`;
        add("type/token", `raw ${raw[0]?.text ?? stripped.trim()} in \`${prop}: ${v.slice(0, 60)}\` → ${hint}`);
      }
    }
    for (const t of typeTokens(v)) if (p !== "font" && !prop.startsWith("--") && t.kind !== p) add("type/token-role", `\`${prop}\` is set from a ${t.kind} token (${t.style})`);
    if (/calc\([^;]*--zen-typography-(font-size|line-height)-/.test(v)) add("type/derived", `\`${prop}: ${v.slice(0, 70)}\` computes a new size from a text-style token`);
  }

  if (COLOUR_PROP.test(p)) {
    const stripped = stripFns(v).replace(/\b(transparent|currentcolor|inherit|initial|unset|none)\b/gi, "");
    if (platformOrInline && RAW_COLOUR.test(stripped)) add("color/token", `raw colour in \`${prop}: ${v.slice(0, 70)}\` → a --zen-color-* token`);
    const fam = tokenFamily(v);
    if (/^(color|-webkit-text-fill-color)$/.test(p) && fam.some((f) => f === "background" || f === "border"))
      add("color/role", `text colour \`${prop}: ${v.slice(0, 70)}\` uses a ${fam.find((f) => f !== "content")} token — text uses --zen-color-content-*`);
    const dim = (k) => { const mm = (ctx.body ?? "").match(new RegExp(`(^|[;{\\s])${k}\\s*:\\s*([\\d.]+)px`)); return mm ? Number(mm[2]) : undefined; };
    const glyph = (dim("width") !== undefined && dim("width") <= 12 && (dim("height") ?? 99) <= 12) || (dim("width") ?? 99) <= 2 || (dim("height") ?? 99) <= 2;
    const masked = glyph || /(^|[;{\s])(-webkit-)?mask(-image)?\s*:/.test(ctx.body ?? "");
    if (/^background(-color)?$/.test(p) && fam.includes("content") && !masked && !fam.includes("background"))
      add("color/role-fill", `\`${prop}\` is painted with a content token — fills use --zen-color-background-* (content is for text and icons)`);
    if (/^(border|border-color|outline|outline-color|border-(top|right|bottom|left|inline|block)(-color)?)$/.test(p) && fam.includes("content") && !fam.includes("border") && !fam.includes("focus"))
      add("color/role-fill", `\`${prop}\` strokes with a content token — borders use --zen-color-border-*`);
  }

  if (p === "box-shadow" || (p === "filter" && /drop-shadow/.test(v))) {
    const layers = stripFns(v).split(/,(?![^()]*\))/).map((l) => l.trim()).filter(Boolean);
    const raw = layers.find((l) => { const nums = [...l.matchAll(/(-?\d*\.?\d+)(px)?\b/g)].map((m) => Number(m[1])); if (/^(none|inherit|initial|unset)$/.test(l) || nums.length < 2) return false; if (/\binset\b/.test(l) && nums.every((n) => Math.abs(n) <= 2)) return false; if (nums.length >= 3 && nums[0] === 0 && nums[1] === 0 && nums[2] === 0) return false; if (nums.length >= 3 && nums[2] === 0 && (nums[3] ?? 0) === 0 && Math.abs(nums[0]) <= 2 && Math.abs(nums[1]) <= 2) return false; return nums.some((n) => n !== 0); });
    if (raw) add("shadow/token", `hand-written shadow \`${raw.slice(0, 60)}\` → var(--zen-style-shadow-bottom-level-N-shadow) / --zen-style-effect-*-shadow (rings 0 0 0 Npx are fine)`);
  }

  if (!ctx.inline && SIZE_PROP.test(p) && words(ctx.selector ?? "").some((w) => SLOT_WORD.test(w))) {
    const raw = rawLengths(v).find(({ n }) => n >= 12);
    if (raw && !/%|fr|vw|vh|ch|auto|fit-content|max-content|min-content/.test(stripFns(v).replace(/-?\d*\.?\d+(px|rem|em)/g, ""))) add("size/slot-token", `\`${ctx.selector.trim().slice(0, 50)} { ${prop}: ${v.slice(0, 40)} }\` sizes a slot in px → the token of what it holds (var(--zen-image-size-*), var(--zen-element-size-popular-*), var(--zen-button-size-*)…)`);
  }

  // Offsets in examples and templates (Studio Phase 2 spec 2026-10-03 §3.6, approved): a layer placed by hand with a raw
  // length or percentage is a Stack/Grid/Box position="absolute" with constraints and Spacing/Padding insets. 0, auto and
  // token offsets (var(--zen-spacing-padding-*), calc(-1 * var(…))) pass; var() fallbacks are not read.
  if (POSITION_PROP.test(p) && POSITION_SCOPE.test(ctx.file ?? "")) {
    const raw = [...stripFns(v).matchAll(/(?<![\w#.-])(-?\d*\.?\d+)(px|rem|em|%|vh|vw|vmin|vmax|dvh|svh|lvh|ch)(?![\w-])/g)].find((m) => Number(m[1]) !== 0);
    if (raw) {
      const n = Number(raw[1]), pct = raw[2] === "%";
      const hint = pct && Math.abs(n) === 50 ? "constraintX/constraintY=\"center\" on a <Box position=\"absolute\"> (exact centre, no translate)"
        : pct && Math.abs(n) >= 100 ? "a layer outside its parent is a floating component (Popover, Tooltip) or a component prop, not an inset"
        : "pin the layer with <Box position=\"absolute\"> + constraintX/constraintY and insetTop/Right/Bottom/Left on the Spacing/Padding scale (or var(--zen-spacing-padding-*))";
      add("position/token", `raw ${raw[0]} in \`${prop}: ${v.slice(0, 70)}\` → ${hint}`);
    }
  }
  return out;
}

/* ── suppression ────────────────────────────────────────────────────────────────────────────────────────────────── */
const allowedAt = (lines, lineNo, allow) => { for (let i = Math.max(0, lineNo - 5); i < lineNo; i++) if (lines[i]?.includes(`zen-allow-${allow}`)) return true; return false; };
const lineOf = (src, index) => src.slice(0, index).split("\n").length;

/* ── CSS ────────────────────────────────────────────────────────────────────────────────────────────────────────── */
function checkCss(file, src) {
  const findings = [];
  // Blank comments but keep their newlines, so line numbers stay true.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
  const lines = src.split("\n");
  const re = /([^{}]+)\{([^{}]*)\}/g; let m;
  while ((m = re.exec(code))) {
    const selector = m[1].replace(/^[\s\S]*[;}]/, "").trim();
    if (/^@(font-face|keyframes)|^(from|to|\d+%)(\s*,\s*(from|to|\d+%))*$/.test(selector)) continue;
    const bodyStart = m.index + m[0].indexOf("{") + 1;
    let offset = 0;
    for (const decl of m[2].split(";")) {
      const at = bodyStart + offset; offset += decl.length + 1;
      const i = decl.indexOf(":"); if (i < 0) continue;
      const prop = decl.slice(0, i).trim().toLowerCase(); const value = decl.slice(i + 1).trim();
      if (!prop || !value) continue;
      const lineNo = lineOf(code, at + decl.search(/\S/));
      for (const f of checkDecl(prop, value, { selector, body: m[2], file })) {
        if (allowedAt(lines, lineNo, RULE[f.rule].allow)) continue;
        findings.push({ file, line: lineNo, ...f, context: `${selector.replace(/\s+/g, " ").slice(0, 80)} { ${prop}: ${value.replace(/\s+/g, " ")} }` });
      }
    }
    // Mixed text styles across the declarations of one rule.
    const styles = new Map(); const pairs = new Set();
    for (const decl of m[2].split(";")) {
      const k = decl.slice(0, decl.indexOf(":")).trim(); if (!k || k.startsWith("--")) continue; // custom props define tokens
      for (const t of typeTokens(decl)) { (styles.get(t.style) ?? styles.set(t.style, new Set()).get(t.style)).add(t.kind); pairs.add(`${t.kind}:${t.style}`); }
    }
    if (styles.size > 1 && !tokens.combos.some((c) => [...pairs].every((x) => c.has(x)))) {
      const lineNo = lineOf(code, bodyStart);
      if (!allowedAt(lines, lineNo, RULE["type/mixed-style"].allow)) findings.push({ file, line: lineNo, rule: "type/mixed-style", message: `mixes text styles ${[...styles.keys()].join(" + ")} in one rule — size, line height and tracking come from one style`, context: `${selector.replace(/\s+/g, " ").slice(0, 80)} { ${[...styles.keys()].join(" + ")} }` });
    }
  }
  return findings;
}

/* ── TSX: inline styles + JSX typography ────────────────────────────────────────────────────────────────────────── */
const camelToKebab = (k) => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const UNITLESS = /^(lineHeight|fontWeight|opacity|zIndex|flex|flexGrow|flexShrink|order)$/;
function balanced(src, open) { let d = 0; for (let j = open; j < src.length; j++) { if (src[j] === "{") d++; else if (src[j] === "}" && --d === 0) return j; } return -1; }
/** Top-level `key: value` pairs of an object literal body (string / number / template literals only). */
function objectPairs(body) {
  const pairs = []; let depth = 0, start = 0, quote = null;
  const push = (s, at) => { const mm = s.match(/^\s*["']?([A-Za-z-]+)["']?\s*:\s*([\s\S]+?)\s*$/); if (mm) pairs.push({ key: mm[1], raw: mm[2], at }); };
  for (let j = 0; j < body.length; j++) {
    const c = body[j];
    if (quote) { if (c === quote && body[j - 1] !== "\\") quote = null; continue; }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if ("({[".includes(c)) depth++;
    else if (")}]".includes(c)) depth--;
    else if (c === "," && depth === 0) { push(body.slice(start, j), start); start = j + 1; }
  }
  push(body.slice(start), start);
  return pairs;
}
function checkTsx(file, src) {
  const findings = [];
  const lines = src.split("\n");
  // Inline style objects: style={{ … }} (also inside code-sample template strings, which consumers copy).
  for (const m of src.matchAll(/\bstyle=\{\{/g)) {
    const open = m.index + m[0].length - 1; const close = balanced(src, open); if (close < 0) continue;
    const body = src.slice(open + 1, close);
    for (const { key, raw, at } of objectPairs(body)) {
      const lit = raw.match(/^(-?\d*\.?\d+)$/) ? { v: raw, num: true } : raw.match(/^["'`]([^"'`$]*)["'`]$/) ? { v: raw.slice(1, -1), num: false } : null;
      if (!lit) continue; // expressions (tokens passed in, computed values) are the caller's business
      const prop = camelToKebab(key);
      const value = lit.num && !UNITLESS.test(key) && Number(lit.v) !== 0 ? `${lit.v}px` : lit.v;
      const lineNo = lineOf(src, open + 1 + at + raw.length);
      for (const f of checkDecl(prop, value, { selector: "", body: "", file, inline: true })) {
        if (allowedAt(lines, lineNo, RULE[f.rule].allow)) continue;
        findings.push({ file, line: lineNo, ...f, message: `inline style: ${f.message}`, context: `style={{ ${key}: ${raw} }}` });
      }
    }
  }
  const exampleFile = /^src\/(templates\/|platform\/(Platform\w*Showcases|PlatformMobile\w*|appLayer\/))|^tools\/style-guard\/fixtures\//.test(file);
  // <Text textStyle="Heading/…">Title</Text> renders a <p>/<span>: a visual heading without a place in the outline.
  for (const m of src.matchAll(/<Text\b([^>]*?)textStyle="(Heading\/(?:1|2|3|4|Subheading))"([^>]*)>([\s\S]{0,120}?)<\/Text>/g)) {
    const children = m[4].trim(); const attrs = m[1] + m[3];
    const value = /^\{[^}]*(value|count|total|amount|price|percent|stat|metric|number|sum|\.length)[^}]*\}$/i.test(children) || /^[\s\d$€£¥%.,+\-−×/:]+$/.test(children);
    const wordmark = /logo=\{?\s*$/.test(src.slice(Math.max(0, m.index - 30), m.index)) || /\bbrand|logo|wordmark\b/i.test(attrs);
    if (value || wordmark || !children) continue;
    const lineNo = lineOf(src, m.index);
    if (allowedAt(lines, lineNo, RULE["type/visual-heading"].allow)) continue;
    findings.push({ file, line: lineNo, rule: "type/visual-heading", message: `<Text textStyle="${m[2]}"> around "${children.replace(/\s+/g, " ").slice(0, 40)}" looks like a title but is not a heading → <Heading level={…} textStyle="${m[2]}">`, context: `<Text textStyle="${m[2]}">${children.slice(0, 40)}</Text>` });
  }
  if (exampleFile) {
    for (const m of src.matchAll(/<h([1-6])\b([^>]*)>/g)) {
      // A Zen text style, or platform chrome (panel/page titles set in the platform's own typography), is fine.
      if (/zen-type-|zen-heading|typographyStyles\[|["'`\s](platform|official)-[\w-]+/.test(m[2])) continue;
      const lineNo = lineOf(src, m.index);
      if (allowedAt(lines, lineNo, RULE["type/raw-heading"].allow)) continue;
      findings.push({ file, line: lineNo, rule: "type/raw-heading", message: `bare <h${m[1]}> in an example → <Heading level={${m[1]}}> so it takes a Zen text style and tone`, context: `<h${m[1]}${m[2].slice(0, 40)}>` });
    }
  }
  return findings;
}

/* ── files ──────────────────────────────────────────────────────────────────────────────────────────────────────── */
// Deliberately wrong previews, generated code and token sources are not hand-written UI.
const EXEMPT = /(^|\/)(node_modules|dist|storybook-static)\/|\.stories\.(tsx|css)$|\.generated\.|^src\/styles\/|^src\/icons\/|^src\/platform\/PlatformGuidelineVisuals\.tsx$|^tools\/(?!style-guard\/fixtures\/)/;
export function isChecked(file) { const r = rel(file); return /\.(css|tsx)$/.test(r) && !EXEMPT.test(r); }
function collect(target) {
  const abs = path.resolve(root, target);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isFile()) return [abs];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? collect(path.join(abs, d.name)) : [path.join(abs, d.name)]);
}
export const DEFAULT_TARGETS = ["src/components", "src/platform", "src/templates"];

export function checkFile(file) {
  const r = rel(file); if (!isChecked(r)) return [];
  const src = fs.readFileSync(path.resolve(root, r), "utf8");
  if (/zen-style-guard-disable-file/.test(src.slice(0, 600))) return [];
  const found = r.endsWith(".css") ? checkCss(r, src) : checkTsx(r, src);
  return found.map((f) => ({ ...f, severity: RULE[f.rule].severity, key: `${r}|${f.rule}|${f.context}` }));
}

export function loadBaseline() { try { return JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8")).keys ?? {}; } catch { return {}; } }
/** Marks findings that the baseline already records (per key and count, so a new copy of an old violation is still new). */
export function markNew(findings, baseline = loadBaseline()) {
  const seen = new Map();
  return findings.map((f) => { const n = (seen.get(f.key) ?? 0) + 1; seen.set(f.key, n); return { ...f, new: n > (baseline[f.key] ?? 0) }; });
}
export function checkFiles(files, { baseline } = {}) {
  const findings = files.flatMap((f) => collect(f)).filter(isChecked).flatMap((f) => checkFile(f));
  return markNew(findings, baseline);
}

/* ── CLI ────────────────────────────────────────────────────────────────────────────────────────────────────────── */
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  if (flags.has("--list")) { console.log(JSON.stringify(rules.map(({ id, severity, allow, scope, guideline, summary }) => ({ id, severity, allow, scope, guideline, summary })), null, 2)); process.exit(0); }
  const targets = args.filter((a) => !a.startsWith("--"));
  const findings = checkFiles(targets.length ? targets : DEFAULT_TARGETS);
  if (flags.has("--baseline-update")) {
    const keys = {}; for (const f of findings) keys[f.key] = (keys[f.key] ?? 0) + 1;
    fs.writeFileSync(BASELINE_FILE, JSON.stringify({ generated: new Date().toISOString(), note: "Pre-existing style-guard debt. New findings fail; fix these when you touch them, then run --baseline-update.", total: findings.length, keys }, null, 2) + "\n");
    console.log(`Baseline → ${rel(BASELINE_FILE)} (${findings.length} findings in ${new Set(findings.map((f) => f.file)).size} files)`);
    process.exit(0);
  }
  if (flags.has("--json")) { console.log(JSON.stringify(findings, null, 2)); process.exit(findings.some((f) => f.new && f.severity === "error") ? 1 : 0); }
  const shown = flags.has("--all") ? findings : findings.filter((f) => f.new);
  for (const f of shown) console.log(`${f.severity === "error" ? "✗" : "⚠"} ${f.file}:${f.line}  ${f.rule}${f.new ? "" : " (baseline)"}  ${f.message}`);
  const newErrors = findings.filter((f) => f.new && f.severity === "error").length, newWarns = findings.filter((f) => f.new && f.severity === "warn").length;
  const old = findings.filter((f) => !f.new).length;
  console.log(`\n${newErrors ? `✗ ${newErrors} new error(s)` : "✓ No new errors"}, ${newWarns} new warning(s); ${old} baseline finding(s)${flags.has("--all") ? "" : " hidden (--all shows them)"}.`);
  process.exit(newErrors ? 1 : 0);
}
