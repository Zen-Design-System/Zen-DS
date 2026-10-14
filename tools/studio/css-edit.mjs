// Zen Studio Main component, M2 (spec docs/research/studio-main-component-spec-2026-10-09.md §3.5): a token edit of a
// library component's CSS. One declaration of one rule changes to another existing token, and nothing else in the file
// moves (postcss keeps the text around it as it was). The dev-server plugin (vite-plugin-zen-studio.mjs, POST /css-edit)
// puts the result into the file's draft; tools/studio/css-edit.selftest.mjs checks this module.
import postcss from "postcss";

/** A library component's own stylesheet: src/components/<Folder>/<name>.css. */
export const isComponentCss = (rel) => typeof rel === "string" && /^src\/components\/[A-Za-z0-9]+\/[a-z0-9-]+\.css$/.test(rel);

/**
 * One selector as the browser's CSSOM writes it and as a stylesheet may: whitespace collapsed, none around combinators
 * and inside parentheses, attribute values double-quoted (`[data-size=xs]` → `[data-size="xs"]`).
 */
export function normalizeSelector(selector) {
  return String(selector)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/'/g, '"')
    .replace(/\[\s*([\w-]+)\s*([~|^$*]?=)\s*([^"\]\s]+)\s*\]/g, '[$1$2"$3"]')
    .replace(/\s+/g, " ")
    .replace(/\s*([>+~,])\s*/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

const normalizeMedia = (media) => String(media ?? "").replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").replace(/\s*:\s*/g, ":").trim();

/** Every custom property a stylesheet defines (`--zen-…: …`). */
export function definedTokens(texts) {
  const names = new Set();
  for (const text of texts) for (const match of String(text).matchAll(/(--zen-[a-z0-9-]+)\s*:/g)) names.add(match[1]);
  return names;
}

export class CssEditError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

/** The token a value names: `var(--zen-…)` and nothing else. */
export const tokenOf = (value) => /^var\(\s*(--zen-[a-z0-9-]+)\s*\)$/.exec(String(value).trim())?.[1] ?? null;

/**
 * Sets `prop` in the last rule of `css` whose selector list holds `selector` (inside `@media media`, or at the top level
 * when `media` is empty) to `value`, an existing token. Returns the new text and the declaration's 1-based line.
 */
export function editDeclaration(css, { selector, media = "", prop, value }, tokens) {
  if (typeof selector !== "string" || !selector.trim()) throw new CssEditError("invalid", "Missing `selector`");
  if (typeof prop !== "string" || !/^(--[\w-]+|[a-z-]+)$/.test(prop)) throw new CssEditError("invalid", "Missing or malformed `prop`");
  const token = tokenOf(value);
  if (!token) throw new CssEditError("invalid", "The value must be one token: var(--zen-…)");
  if (!tokens.has(token)) throw new CssEditError("invalid", `${token} is not a token of the design system`);
  if (token === prop) throw new CssEditError("invalid", `${prop} cannot read itself`);
  let root;
  try {
    root = postcss.parse(css);
  } catch (error) {
    throw new CssEditError("invalid", `The stylesheet does not parse: ${error.reason ?? error.message}`);
  }
  const wanted = normalizeSelector(selector);
  const wantedMedia = normalizeMedia(media);
  let target = null;
  root.walkRules((rule) => {
    const parent = rule.parent;
    const inMedia = parent?.type === "atrule" && parent.name === "media" ? normalizeMedia(parent.params) : "";
    if (parent?.type === "atrule" && parent.name !== "media") return;
    if (inMedia !== wantedMedia) return;
    if (!rule.selectors.some((one) => normalizeSelector(one) === wanted)) return;
    const decls = rule.nodes.filter((node) => node.type === "decl" && node.prop === prop);
    if (decls.length) target = decls[decls.length - 1];
  });
  if (!target) throw new CssEditError("not-found", `No ${prop} in ${selector}${wantedMedia ? ` (@media ${wantedMedia})` : ""}`);
  const line = target.source?.start?.line ?? 0;
  target.value = `var(${token})`;
  return { css: root.toString(), line };
}
