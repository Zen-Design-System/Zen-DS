#!/usr/bin/env node
// Zen DS usage harness — machine-checkable rules from docs/guidelines/*.md.
//
//   node tools/usage-guard/check-usage.mjs [files or dirs…]   check JSX (default: src/platform)
//   node tools/usage-guard/check-usage.mjs --list              print the rule registry as JSON (for AI agents)
//
// Errors exit 1; warnings are printed only. Suppress one occurrence with a comment containing
// `zen-allow-<allow>: <reason>` within the four lines above the element (the reason is mandatory by convention).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const INPUTS = ["InputField", "SelectField", "DateField", "NumberField", "TextAreaField", "AutocompleteField", "RichTextField"];
const FOCUSABLE_TRIGGERS = ["Button", "IconButton", "button", "a", "Chip", "Link", "input", "TabItem", "Toggle", ...INPUTS, "Search"];

/* ── attribute helpers ─────────────────────────────────────────────── */
// A spread ({...props}) or a template interpolation (${…} in generated code samples) may supply any prop,
// so presence checks treat it as "maybe present" instead of reporting a false positive.
const opaque = (attrs) => /\{\s*\.\.\.|\$\{/.test(attrs);
// `has` is strict (used by prohibitions); `present` is lenient (used by requirements).
const has = (attrs, name) => new RegExp(`(^|[\\s{])${name}(=|\\s|$|/)`).test(attrs);
const present = (attrs, name) => has(attrs, name) || opaque(attrs);
const literal = (attrs, name) => attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
const expr = (attrs, name) => { const i = attrs.search(new RegExp(`(?:^|\\s)${name}=\\{`)); if (i < 0) return undefined; let d = 0, j = attrs.indexOf("{", i); const s = j; for (; j < attrs.length; j++) { if (attrs[j] === "{") d++; else if (attrs[j] === "}" && --d === 0) break; } return attrs.slice(s + 1, j); };
const value = (attrs, name) => literal(attrs, name) ?? expr(attrs, name);
const named = (a) => present(a, "aria-label") || present(a, "aria-labelledby");
const text = (children) => children.replace(/<[^>]*>/g, " ").replace(/\{[^}]*\}/g, " x ").replace(/\s+/g, " ").trim();

/* ── rule registry ─────────────────────────────────────────────────── */
// Each rule: id, components (JSX tag names), severity, allow (suppression token), guideline, summary, check(ctx) → message | null.
export const rules = [
  { id: "button/secondary-justified", components: ["Button", "IconButton"], severity: "error", allow: "secondary", guideline: "docs/guidelines/button.md",
    summary: "Secondary is a rare highlight; default to Primary (main CTA) or Tertiary.",
    check: ({ attrs }) => /\bsecondary\b/.test(value(attrs, "level") ?? "") && "uses level secondary — use primary (main CTA) or tertiary, or justify with zen-allow-secondary." },
  { id: "button/filter-is-chip", components: ["Button", "IconButton"], severity: "error", allow: "filter-button", guideline: "docs/guidelines/chip.md",
    summary: "Filter, sort and scope pickers are Chip (variant=advanced), never buttons.",
    check: ({ attrs, children }) => (has(attrs, "aria-haspopup") || /^(sort|filter)\b/i.test(text(children))) && "opens a choice list — use <Chip variant=\"advanced\"> with popoverItems." },
  { id: "button/accent-is-promoted", components: ["Button", "IconButton"], severity: "warn", allow: "accent", guideline: "docs/guidelines/button.md",
    summary: "Accent is for promoted CTAs (upsell, onboarding) only.",
    check: ({ attrs }) => /\baccent\b/.test(value(attrs, "level") ?? "") && "uses level accent — only for a promoted CTA; otherwise primary." },
  { id: "button/destructive-is-danger", components: ["Button"], severity: "warn", allow: "destructive", guideline: "docs/guidelines/button.md",
    summary: "Irreversible actions (Delete, Remove, Discard) use Danger or Danger-Subtle.",
    check: ({ attrs, children }) => /^(delete|remove|discard|destroy)\b/i.test(text(children)) && !/danger/.test(value(attrs, "level") ?? "") && `"${text(children)}" is destructive — use level danger (or danger-subtle).` },
  { id: "icon-button/needs-name", components: ["IconButton"], severity: "error", allow: "unnamed", guideline: "docs/guidelines/button.md",
    summary: "Icon-only buttons need an aria-label.",
    check: ({ attrs }) => !named(attrs) && "has no aria-label." },
  { id: "input/no-disabled", components: INPUTS, severity: "error", allow: "disabled-input", guideline: "docs/guidelines/input.md",
    summary: "Inputs use Read-only, never Disabled (Search is the only exception).",
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
    check: ({ children }) => { const first = children.match(/<([A-Za-z]+)/)?.[1]; return first && !FOCUSABLE_TRIGGERS.includes(first) && `wraps <${first}>, which is not focusable — wrap a Button/IconButton/link.`; } },
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
  { id: "progress/needs-label", components: ["ProgressBar", "ProgressCircle"], severity: "error", allow: "progress-label", guideline: "docs/guidelines/progress.md",
    summary: "Progress needs a visible label or an aria-label.",
    check: ({ attrs }) => !present(attrs, "label") && !named(attrs) && "has neither label nor aria-label." },
];

// CLI only when executed directly (build-guidelines.mjs imports the registry).
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();

function main() {
  if (process.argv.includes("--list")) {
    console.log(JSON.stringify(rules.map(({ check, ...rule }) => rule), null, 2));
    process.exit(0);
  }

  /* ── scanner ───────────────────────────────────────────────────────── */
  const targets = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const files = (targets.length ? targets : ["src/platform"]).flatMap((target) => {
    const abs = path.resolve(root, target);
    if (!fs.existsSync(abs)) return [];
    if (fs.statSync(abs).isFile()) return [abs];
    return fs.readdirSync(abs, { recursive: true }).map((f) => path.join(abs, f)).filter((f) => /\.tsx$/.test(f) && !/\.stories\.tsx$/.test(f));
  });

  /** Scan `<Tag …>` from index `start`; returns { attrs, end, selfClosing } honouring {…}, strings and template literals. */
  function readTag(src, start) {
    let i = start, depth = 0, quote = null;
    while (i < src.length) {
      const ch = src[i];
      // Escapes (\` inside code-sample template strings) never open or close anything.
      if (ch === "\\") { i += 2; continue; }
      if (quote) { if (ch === quote) quote = null; }
      else if (ch === '"' || ch === "'" || ch === "`") quote = ch;
      else if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ">" && depth === 0 && src[i - 1] !== "=") return { attrs: src.slice(start, i), end: i + 1, selfClosing: src[i - 1] === "/" };
      i++;
    }
    return null;
  }

  /** Children source of a non-self-closing element, balancing nested tags of the same name. */
  function readChildren(src, tag, from) {
    const open = new RegExp(`<${tag}\\b`, "g"), close = `</${tag}>`;
    let depth = 1, i = from;
    while (depth > 0) {
      const nextClose = src.indexOf(close, i); if (nextClose < 0) return "";
      open.lastIndex = i; const nextOpen = open.exec(src);
      if (nextOpen && nextOpen.index < nextClose) { depth++; i = nextOpen.index + 1; } else { depth--; i = nextClose + close.length; if (depth === 0) return src.slice(from, nextClose); }
    }
    return "";
  }

  const lineOf = (src, index) => src.slice(0, index).split("\n").length;
  const allowed = (src, index, token) => src.slice(Math.max(0, src.lastIndexOf("\n", index - 1) - 500), index).split("\n").slice(-5).some((line) => line.includes(`zen-allow-${token}`));
  const byTag = new Map();
  for (const rule of rules) for (const c of rule.components) byTag.set(c, [...(byTag.get(c) ?? []), rule]);
  const tagRe = new RegExp(`<(${[...byTag.keys()].join("|")})\\b(?![.\\w])`, "g");

  const findings = [];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    // Files that intentionally render wrong usage (the Don't illustrations) opt out with this marker.
    if (/^\/\/ zen-usage-guard: dont-examples/m.test(src)) continue;
    const rel = path.relative(root, file);
    let match;
    tagRe.lastIndex = 0;
    while ((match = tagRe.exec(src))) {
      const tag = match[1];
      const read = readTag(src, match.index + match[0].length);
      if (!read) continue;
      const children = read.selfClosing ? "" : readChildren(src, tag, read.end);
      for (const rule of byTag.get(tag)) {
        const message = rule.check({ tag, attrs: read.attrs, children });
        if (message && !allowed(src, match.index, rule.allow)) findings.push({ rel, line: lineOf(src, match.index), tag, rule, message });
      }
    }
  }

  const errors = findings.filter((f) => f.rule.severity === "error");
  for (const f of findings) console.log(`${f.rule.severity === "error" ? "✗" : "⚠"} ${f.rel}:${f.line} [${f.rule.id}] <${f.tag}> ${f.message}  → ${f.rule.guideline}`);
  if (errors.length) {
    console.log(`\n${errors.length} error(s), ${findings.length - errors.length} warning(s). Suppress a deliberate case with "zen-allow-<allow>: <reason>".`);
    process.exit(1);
  }
  console.log(`✓ Usage rules pass (${files.length} files, ${rules.length} rules${findings.length ? `, ${findings.length} warning(s)` : ""}).`);
}
