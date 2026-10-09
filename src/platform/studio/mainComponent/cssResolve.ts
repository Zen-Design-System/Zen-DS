/*
 * Where a library component's style comes from, read in the browser (spec docs/research/studio-main-component-spec-2026-10-09.md
 * §3.4). Vite's dev server loads each CSS file as <style data-vite-dev-id="…/src/components/Button/button.css">, so the
 * CSSOM says which rules declare a property, which of them match an element and in which file they are. For one
 * element this finds, per property the component's CSS sets on it, the winning declaration and the chain of custom
 * properties it reads (`gap: var(--zen-button-gap)` → `--zen-button-gap: var(--zen-button-spacing-xsmall-gap)` on
 * `.zen-button[data-size="xs"]` → … → `6px`), each step with its rule, file and the variant attributes it is scoped to.
 */

export type Declaration = {
  /** The property (`gap`, `--zen-button-gap`). */
  prop: string;
  /** Its value as written (`var(--zen-button-spacing-xsmall-gap)`). */
  value: string;
  important: boolean;
  /** The rule's selector that matched (one of its comma-separated selectors), or "style" for an inline style. */
  selector: string;
  /** The file under src/ ("src/components/Button/button.css"), or "" when unknown (inline, injected). */
  file: string;
  /** The element the declaration sits on (custom properties are inherited from an ancestor). */
  element: Element;
  /** The `[data-*="…"]` attributes the selector requires, as attribute → value (the variant scope). */
  scope: Readonly<Record<string, string>>;
  /** The `@media` the rule sits in ("" at the top level): an edit names it with the selector. */
  media: string;
};

export type StyleRow = {
  prop: string;
  /** What the element's own (or, for an inherited property, its nearest ancestor's) declaration says. */
  declaration: Declaration;
  /** The custom properties it reads, outermost first, to the first value that reads no other. */
  chain: Declaration[];
  /** The computed value. */
  computed: string;
  /** Inherited from an ancestor inside the variant (a part's colour from its root). */
  inherited: boolean;
};

type IndexedRule = { selectors: string[]; style: CSSStyleDeclaration; file: string; order: number; media: string };

const INHERITED = new Set(["color", "font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing", "text-align", "text-transform", "white-space", "visibility", "cursor"]);

let index: { sheets: number; byProp: Map<string, IndexedRule[]> } | null = null;

/** Drops the rule index (a CSS file was hot-updated). */
export function invalidateCssIndex() {
  index = null;
}

const fileOf = (sheet: CSSStyleSheet): string => {
  const owner = sheet.ownerNode instanceof Element ? sheet.ownerNode : null;
  const id = owner?.getAttribute("data-vite-dev-id") ?? sheet.href ?? "";
  const at = id.indexOf("/src/");
  return at >= 0 ? id.slice(at + 1).replace(/\?.*$/, "") : "";
};

/** Top-level commas only (not inside :is(…) or [attr="a,b"]). */
export function splitSelectors(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) { if (ch === quote && text[i - 1] !== "\\") quote = ""; continue; }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[") depth += 1;
    else if (ch === ")" || ch === "]") depth -= 1;
    else if (ch === "," && depth === 0) { parts.push(text.slice(start, i).trim()); start = i + 1; }
  }
  parts.push(text.slice(start).trim());
  return parts.filter(Boolean);
}

/** The shorthands a longhand may come from, nearest first (padding-inline-start → padding-inline, padding). */
export function shorthandsOf(prop: string): string[] {
  const out: string[] = [];
  if (/^border-(?:top|bottom|start|end)-(?:left|right|start|end)-radius$/.test(prop)) out.push("border-radius");
  if (prop === "row-gap" || prop === "column-gap") out.push("gap");
  const side = /^border-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?-(color|width|style)$/.exec(prop);
  if (side) out.push(`border-${side[1]}`);
  const parts = prop.split("-");
  while (parts.length > 1) {
    parts.pop();
    out.push(parts.join("-"));
  }
  return [...new Set(out)];
}

function buildIndex() {
  const byProp = new Map<string, IndexedRule[]>();
  let order = 0;
  const visit = (rules: CSSRuleList, file: string, media: string) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        const entry: IndexedRule = { selectors: splitSelectors(rule.selectorText), style: rule.style, file, order: order++, media };
        const seen = new Set<string>();
        for (let i = 0; i < rule.style.length; i += 1) {
          // A shorthand that reads var() (`border-radius: var(--zen-button-radius)`) lists its longhands with no value:
          // the declaration is the shorthand's, as the stylesheet writes it (and as an edit must name it).
          const longhand = rule.style[i];
          const prop = rule.style.getPropertyValue(longhand) ? longhand : shorthandsOf(longhand).find((name) => rule.style.getPropertyValue(name)) ?? longhand;
          if (seen.has(prop)) continue;
          seen.add(prop);
          const list = byProp.get(prop);
          if (list) list.push(entry);
          else byProp.set(prop, [entry]);
        }
      } else if (rule instanceof CSSMediaRule) {
        if (window.matchMedia(rule.media.mediaText).matches) visit(rule.cssRules, file, rule.media.mediaText);
      } else if (rule instanceof CSSSupportsRule) {
        if (CSS.supports(rule.conditionText)) visit(rule.cssRules, file, media);
      } else if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules) {
        visit((rule as CSSGroupingRule).cssRules, file, media);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try { rules = sheet.cssRules; } catch { continue; }
    visit(rules, fileOf(sheet), "");
  }
  index = { sheets: document.styleSheets.length, byProp };
  return index;
}

const rulesFor = (prop: string) => {
  const current = index && index.sheets === document.styleSheets.length ? index : buildIndex();
  return current.byProp.get(prop) ?? [];
};

/** [ids, classes / attributes / pseudo-classes, types / pseudo-elements] of one complex selector. */
export function specificity(selector: string): [number, number, number] {
  const total: [number, number, number] = [0, 0, 0];
  const add = (other: [number, number, number]) => { total[0] += other[0]; total[1] += other[1]; total[2] += other[2]; };
  let i = 0;
  const readArgs = () => {
    let depth = 1;
    const start = i;
    while (i < selector.length && depth) { if (selector[i] === "(") depth += 1; else if (selector[i] === ")") depth -= 1; i += 1; }
    return selector.slice(start, i - 1);
  };
  const max = (list: string) => splitSelectors(list).map(specificity).reduce<[number, number, number]>((best, item) => (compare(item, best) > 0 ? item : best), [0, 0, 0]);
  while (i < selector.length) {
    const ch = selector[i];
    if (ch === "#") { total[0] += 1; i += 1; while (i < selector.length && /[\w-]/.test(selector[i])) i += 1; }
    else if (ch === ".") { total[1] += 1; i += 1; while (i < selector.length && /[\w-]/.test(selector[i])) i += 1; }
    else if (ch === "[") { total[1] += 1; while (i < selector.length && selector[i] !== "]") i += 1; i += 1; }
    else if (ch === ":") {
      const element = selector[i + 1] === ":";
      i += element ? 2 : 1;
      const start = i;
      while (i < selector.length && /[\w-]/.test(selector[i])) i += 1;
      const name = selector.slice(start, i).toLowerCase();
      const args = selector[i] === "(" ? (i += 1, readArgs()) : null;
      if (element) total[2] += 1;
      else if (name === "where") continue;
      else if ((name === "is" || name === "not" || name === "has" || name === "matches") && args !== null) add(max(args));
      else total[1] += 1;
    } else if (/[a-zA-Z]/.test(ch)) { total[2] += 1; while (i < selector.length && /[\w-]/.test(selector[i])) i += 1; }
    else i += 1;
  }
  return total;
}

const compare = (a: [number, number, number], b: [number, number, number]) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** The `[data-x="y"]` attributes a selector requires (outside :not(), and not inside :is() lists). */
export function scopeOf(selector: string): Record<string, string> {
  const scope: Record<string, string> = {};
  const outside = selector.replace(/:(?:not|is|where|has)\((?:[^()]|\([^()]*\))*\)/g, "");
  for (const match of outside.matchAll(/\[(data-[\w-]+)(?:=["']?([^"'\]]*)["']?)?\]/g)) scope[match[1]] = match[2] ?? "";
  return scope;
}

/** The declaration of `prop` that applies to `element` itself (no inheritance), or null. */
function winning(element: Element, prop: string): Declaration | null {
  let best: { important: boolean; spec: [number, number, number]; order: number; declaration: Declaration } | null = null;
  for (const rule of rulesFor(prop)) {
    let matched: string | null = null;
    let spec: [number, number, number] = [0, 0, 0];
    for (const selector of rule.selectors) {
      let ok = false;
      try { ok = element.matches(selector); } catch { ok = false; }
      if (!ok) continue;
      const own = specificity(selector);
      if (matched === null || compare(own, spec) > 0) { matched = selector; spec = own; }
    }
    if (matched === null) continue;
    const important = rule.style.getPropertyPriority(prop) === "important";
    if (best && (best.important !== important ? best.important : compare(best.spec, spec) > 0 || (compare(best.spec, spec) === 0 && best.order > rule.order))) continue;
    best = { important, spec, order: rule.order, declaration: { prop, value: rule.style.getPropertyValue(prop).trim(), important, selector: matched, file: rule.file, element, scope: scopeOf(matched), media: rule.media } };
  }
  // An inline style wins, unless only the rule is !important.
  const style = element instanceof HTMLElement || element instanceof SVGElement ? element.style : null;
  const inline = style?.getPropertyValue(prop).trim() ?? "";
  const inlineImportant = style?.getPropertyPriority(prop) === "important";
  if (inline && (!best?.important || inlineImportant)) return { prop, value: inline, important: inlineImportant, selector: "style", file: "", element, scope: {}, media: "" };
  return best?.declaration ?? null;
}

/** The declaration of a custom property `name` that `element` sees: its own, else its nearest ancestor's. */
function customFor(element: Element, name: string): Declaration | null {
  for (let node: Element | null = element; node; node = node.parentElement) {
    const found = winning(node, name);
    if (found) return found;
  }
  return null;
}

/** `var(--a)` or `var(--a, fallback)` as the whole value: the name it reads. */
const soleVar = (value: string) => /^var\(\s*(--[\w-]+)\s*(?:,[\s\S]*)?\)$/.exec(value.trim())?.[1] ?? null;

/** The custom properties a value reads, one hop each, until a value that reads none (or a loop). */
export function chainOf(element: Element, value: string): Declaration[] {
  const chain: Declaration[] = [];
  const seen = new Set<string>();
  let name = soleVar(value);
  while (name && !seen.has(name) && chain.length < 12) {
    seen.add(name);
    const found = customFor(element, name);
    if (!found) break;
    chain.push(found);
    name = soleVar(found.value);
  }
  return chain;
}

/**
 * The style rows of `element` that the library's CSS sets: every property a src/components rule declares on it (or,
 * for an inherited one, on an ancestor up to `stop`), with its chain. Custom properties are left to the chains.
 */
export function styleRows(element: Element, stop: Element | null): StyleRow[] {
  const props = new Set<string>();
  const current = index && index.sheets === document.styleSheets.length ? index : buildIndex();
  for (const [prop, rules] of current.byProp) {
    if (prop.startsWith("--")) continue;
    if (rules.some((rule) => rule.file.startsWith("src/components/") && rule.selectors.some((selector) => { try { return element.matches(selector); } catch { return false; } }))) props.add(prop);
  }
  for (const prop of INHERITED) {
    if (props.has(prop)) continue;
    for (let node = element.parentElement; node && node !== stop?.parentElement; node = node.parentElement) {
      const found = winning(node, prop);
      if (found?.file.startsWith("src/components/")) { props.add(prop); break; }
    }
  }
  const computed = getComputedStyle(element);
  const rows: StyleRow[] = [];
  for (const prop of props) {
    let declaration = winning(element, prop);
    let inherited = false;
    if (!declaration && INHERITED.has(prop)) {
      for (let node = element.parentElement; node && !declaration; node = node.parentElement) {
        declaration = winning(node, prop);
        inherited = Boolean(declaration);
      }
    }
    if (!declaration || !declaration.file.startsWith("src/components/")) continue;
    rows.push({ prop, declaration, chain: chainOf(declaration.element, declaration.value), computed: computed.getPropertyValue(prop).trim(), inherited });
  }
  return rows;
}
