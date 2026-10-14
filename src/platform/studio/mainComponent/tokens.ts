/*
 * The tokens an admin may put in place of another in a library component's CSS (spec
 * docs/research/studio-main-component-spec-2026-10-09.md §2, M2): never a new one — only custom properties the design
 * system defines on the document (src/styles/tokens.css and the component tokens there), with the value each stands for
 * now. A token's choices are its family first (the same name at another step of the scale: button-spacing-*-gap,
 * spacing-gap-*, dm-*), then every token of the same kind (a length, or a colour of the same role).
 */

export type TokenChoice = { name: string; value: string };

const SCALE = /^(?:\d+-?x?(?:small|large)|x?(?:small|large)|medium|base|2xs|xs|sm|md|lg|xl|2xl|3xl|\d+)$/;
const isColour = (value: string) => /^(#|rgba?\(|hsla?\(|oklch\(|oklab\(|color\(|lab\(|lch\()/i.test(value);

let cache: { sheets: number; tokens: TokenChoice[] } | null = null;

/** Every `--zen-*` the document defines at its root (any colour or density mode), with its value now. */
export function documentTokens(): TokenChoice[] {
  if (cache && cache.sheets === document.styleSheets.length) return cache.tokens;
  const names = new Set<string>();
  const visit = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        // A token is defined for the whole document: :root, html or a mode attribute on it.
        if (!/^(:root|html)\b|^\[data-[\w-]+/.test(rule.selectorText.trim())) continue;
        for (let i = 0; i < rule.style.length; i += 1) if (rule.style[i].startsWith("--zen-")) names.add(rule.style[i]);
      } else if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules) {
        visit((rule as CSSGroupingRule).cssRules);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try { visit(sheet.cssRules); } catch { /* a cross-origin sheet */ }
  }
  const computed = getComputedStyle(document.documentElement);
  const tokens = [...names].map((name) => ({ name, value: computed.getPropertyValue(name).trim() })).filter((token) => token.value).sort((a, b) => a.name.localeCompare(b.name));
  cache = { sheets: document.styleSheets.length, tokens };
  return tokens;
}

/** Whether a custom property is one of the document's tokens (not a component's own variable such as --zen-button-gap). */
export const isDocumentToken = (name: string) => documentTokens().some((token) => token.name === name);

/** The name with every scale step as `*`: --zen-button-spacing-xsmall-gap → --zen-button-spacing-*-gap. */
export function familyOf(name: string): string {
  // A step written in two parts (2-xsmall) is one step.
  return name.split("-").map((part) => (SCALE.test(part) ? "*" : part)).join("-").replace(/\*(?:-\*)+/g, "*");
}

/** --zen-color-content-neutral-strongest → content; a background / border colour likewise. */
const colourRole = (name: string) => /^--zen-color-(content|background|border|focus|overlay|shadow)-/.exec(name)?.[1] ?? null;

/** The choices for a declaration that reads `current`, for a property `prop` (its family first, then its kind). */
export function tokenChoices(current: string, prop: string): TokenChoice[] {
  const all = documentTokens();
  const now = all.find((token) => token.name === current);
  const colour = now ? isColour(now.value) : /color|background|border|fill|stroke|shadow/.test(prop);
  const family = familyOf(current);
  const sameFamily = family !== current ? all.filter((token) => familyOf(token.name) === family) : [];
  const role = colourRole(current) ?? (prop === "color" ? "content" : /background/.test(prop) ? "background" : /border|outline/.test(prop) ? "border" : null);
  const sameKind = all.filter((token) => {
    if (colour !== isColour(token.value)) return false;
    if (colour) return role ? colourRole(token.name) === role : Boolean(colourRole(token.name));
    // Lengths: the global scales (spacing, dimensions, corner radii, sizes), not every component's own.
    return /^--zen-(spacing|dm|corner-radius|size|border-width|stroke)-/.test(token.name);
  });
  const seen = new Set<string>();
  const out: TokenChoice[] = [];
  for (const token of [...(now ? [now] : []), ...sameFamily, ...sameKind]) {
    if (seen.has(token.name)) continue;
    seen.add(token.name);
    out.push(token);
  }
  return out;
}
