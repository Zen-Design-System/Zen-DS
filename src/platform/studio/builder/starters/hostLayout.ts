import { radiusValue, type ZenCornerRadius } from "../../../../components/_shared/scale";
import { textStyleKey, toneKey } from "../../inspector/detach";
import { colorTokensFor } from "../../inspector/partInfo";
import { tokenPx } from "../../select/spacing";
import { LIBRARY_PHOTOS, MEDIA_PREFIX } from "../library/media";
import type { SnapChild, SnapNode, SnapValue } from "./toDialect";

/*
 * Starters, HTML tags (Studio builder GĐ3b M2, spec docs/research/studio-builder-starters-spec-2026-10-07.md §3b, the
 * user's Q3: into Layout by token): an example's own HTML (a `div` row of buttons, a `p` of text) becomes what a page
 * holds, read from what the browser renders.
 * - A box with a flex or grid layout becomes a Stack (direction, gap, alignment, wrap) or a Grid (its column count);
 *   a plain block of several children a Stack whose gap is the space between them. Its padding goes with it. A
 *   background, border or corner radius makes it a Box (Surface, Border, Radius) around that layout.
 * - Spacing and radius take the nearest token on the element (its modes applied); one that matches none exactly is noted.
 * - Text tags become Text (h1–h6: Heading) with the text style and tone they render in; `a` a Link, `img` an Image,
 *   `hr` a Divider. A wrapper around one thing with nothing of its own goes (the platform's example frame).
 * - What a page cannot hold (svg, form fields, video) is left out, noted; so is what is hidden (aria-hidden, display none).
 */

type Note = (text: string) => void;

/** A library photo's URL in this build → its `zen-media:` key (any other text unchanged). */
const absolute = (src: string) => { try { return new URL(src, document.baseURI).href; } catch { return src; } };
const photoKeys = new Map(LIBRARY_PHOTOS.flatMap((entry) => [[entry.photo.src, `${MEDIA_PREFIX}${entry.key}`], [absolute(entry.photo.src), `${MEDIA_PREFIX}${entry.key}`]]));
export const libraryMedia = (value: string) => photoKeys.get(value) ?? value;

const GAP_KEYS = ["none", "3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "giant", "xgiant", "2xgiant"];
const PADDING_KEYS = ["none", "3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"];
const RADIUS_KEYS: ZenCornerRadius[] = ["none", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "full"];

/** Box Surface / Border by the token their CSS paints with (layout.css). */
const SURFACES: Record<string, string> = {
  "--zen-color-background-surface-default": "surface",
  "--zen-color-background-surface-alt": "surface-alt",
  "--zen-color-background-neutral-subtle-default": "subtle",
  "--zen-color-background-neutral-pale-default": "pale",
};
const BORDERS: Record<string, string> = {
  "--zen-color-border-neutral-pale-default": "pale",
  "--zen-color-border-neutral-subtle-default": "subtle",
};

const TEXT_TAGS = new Set(["p", "span", "label", "small", "strong", "em", "b", "i", "li", "dt", "dd", "figcaption", "legend", "code", "time", "cite", "q", "abbr", "mark", "sub", "sup", "h1", "h2", "h3", "h4", "h5", "h6"]);
/** Text's `as` values (Text.tsx): a text tag outside them renders as Text's default. */
const TEXT_AS = new Set(["p", "span", "div", "strong", "em", "small", "label", "li", "dt", "dd", "figcaption", "legend", "code", "time"]);
const LEFT_OUT = new Set(["svg", "canvas", "video", "audio", "iframe", "object", "embed", "input", "select", "textarea", "table", "math"]);
/** Stack / Grid / Box `as` values (Layout.tsx). */
const LAYOUT_AS = new Set(["section", "article", "aside", "header", "footer", "main", "nav", "ul", "ol", "li"]);

const lit = (value: string | number | boolean): SnapValue => ({ kind: "literal", value });
const TRANSPARENT = /^(transparent|rgba\(.*,\s*0\)|.*\/\s*0\))$/;

/** The key of `keys` whose token measures nearest to `px` on `element` ("none" = 0); `exact` when one matches. */
function nearest<T extends string>(keys: readonly T[], px: number, measure: (key: T) => number | null): { key: T; exact: boolean } | null {
  let best: { key: T; distance: number } | null = null;
  for (const key of keys) {
    const value = key === "none" ? 0 : measure(key);
    if (value === null || !Number.isFinite(value)) continue;
    const distance = Math.abs(value - px);
    if (!best || distance < best.distance - 0.01) best = { key, distance };
  }
  return best ? { key: best.key, exact: best.distance < 0.5 } : null;
}

/** The layout state of one conversion: notes once per kind, how many lengths took a token they do not match exactly. */
export type HostContext = { note: Note; rounded: { count: number } };

function spacing(element: Element, scale: "gap" | "padding", px: number, ctx: HostContext): string | null {
  const found = nearest(scale === "gap" ? GAP_KEYS : PADDING_KEYS, px, (key) => tokenPx(element, scale, key));
  if (found && !found.exact) ctx.rounded.count += 1;
  return found?.key ?? null;
}

/** A Spacing/Padding key for `px` on `element` (the nearest). */
export const paddingKeyFor = (element: Element, px: number, ctx: HostContext) => spacing(element, "padding", px, ctx);

function radius(element: Element, style: CSSStyleDeclaration, ctx: HostContext): string | null {
  const px = parseFloat(style.borderTopLeftRadius) || 0;
  if (!px) return null;
  const found = nearest(RADIUS_KEYS, px, (key) => {
    const variable = /var\((--[\w-]+)\)/.exec(radiusValue(key) ?? "")?.[1];
    const value = variable ? parseFloat(style.getPropertyValue(variable)) : NaN;
    return Number.isFinite(value) ? value : key === "full" ? 9999 : null;
  });
  if (found && !found.exact && found.key !== "full") ctx.rounded.count += 1;
  return found && found.key !== "none" ? found.key : null;
}

/** Padding as Stack / Grid / Box props: one key for all sides, else per axis (sides of an axis that differ: their mean). */
function paddingProps(element: Element, style: CSSStyleDeclaration, ctx: HostContext): Array<[string, SnapValue]> {
  const side = (name: string) => parseFloat(style.getPropertyValue(`padding-${name}`)) || 0;
  const x = (side("left") + side("right")) / 2;
  const y = (side("top") + side("bottom")) / 2;
  if (!x && !y) return [];
  if (Math.abs(x - y) < 0.5) {
    const key = spacing(element, "padding", x, ctx);
    return key && key !== "none" ? [["padding", lit(key)]] : [];
  }
  const out: Array<[string, SnapValue]> = [];
  const keyX = x ? spacing(element, "padding", x, ctx) : null;
  const keyY = y ? spacing(element, "padding", y, ctx) : null;
  if (keyX && keyX !== "none") out.push(["paddingX", lit(keyX)]);
  if (keyY && keyY !== "none") out.push(["paddingY", lit(keyY)]);
  return out;
}

/** The space between the element's rendered children along `axis` (their median), for a block or a flex box without gap. */
function spaceBetween(element: Element, axis: "row" | "column"): number {
  const rects = Array.from(element.children)
    .filter((child) => child instanceof HTMLElement && getComputedStyle(child).display !== "none" && getComputedStyle(child).position !== "absolute")
    .map((child) => child.getBoundingClientRect());
  const gaps: number[] = [];
  for (let index = 1; index < rects.length; index++) {
    const value = axis === "column" ? rects[index].top - rects[index - 1].bottom : rects[index].left - rects[index - 1].right;
    if (value >= 0) gaps.push(value);
  }
  if (!gaps.length) return 0;
  gaps.sort((a, b) => a - b);
  // Canvas zoom: lengths on screen ÷ the element's scale.
  const scale = element instanceof HTMLElement && element.offsetWidth ? element.getBoundingClientRect().width / element.offsetWidth : 1;
  return gaps[Math.floor(gaps.length / 2)] / (scale || 1);
}

const align = (value: string) => (value === "center" ? "center" : /(^|-)end$/.test(value) ? "end" : /(^|-)start$/.test(value) ? "start" : value === "baseline" ? "baseline" : null);
const justify = (value: string) => (value === "center" ? "center" : /(^|-)end$/.test(value) ? "end" : value === "space-between" ? "between" : value === "space-around" ? "around" : null);

/** Loose text in a layout goes into a Text of its own (a Stack does not style text). */
const wrapText = (children: SnapChild[]): SnapChild[] => children.flatMap((child): SnapChild[] => {
  if (child.kind !== "text") return [child];
  const text = child.value.trim();
  return text ? [{ kind: "element", name: "Text", props: [], children: [{ kind: "text", value: text }] }] : [];
});

function textNode(element: HTMLElement, tag: string, children: SnapChild[], root: Element): SnapChild[] {
  const hasText = children.some((child) => child.kind === "text" && child.value.trim());
  // Elements only (a span around an icon): nothing of its own.
  if (!hasText) return children;
  const props: Array<[string, SnapValue]> = [];
  const heading = /^h([1-6])$/.exec(tag);
  if (heading) props.push(["level", lit(Number(heading[1]))]);
  else if (tag !== "p" && TEXT_AS.has(tag)) props.push(["as", lit(tag)]);
  const style = textStyleKey(element, root);
  if (style && (heading || style !== "Body/Base/Regular")) props.push(["textStyle", lit(style)]);
  const tone = toneKey(element);
  if (tone && tone !== "strongest") props.push(["tone", lit(tone)]);
  const trimmed = children.map((child, index) => (child.kind !== "text" ? child : {
    kind: "text" as const,
    value: index === 0 ? child.value.replace(/^\s+/, "") : index === children.length - 1 ? child.value.replace(/\s+$/, "") : child.value,
  }));
  return [{ kind: "element", name: heading ? "Heading" : "Text", props, children: trimmed }];
}

/**
 * What one rendered HTML element becomes on a page; `children`: its content, already converted. `root`: the frame (text
 * styles are read inside it).
 */
export function hostNode(element: HTMLElement, tag: string, children: SnapChild[], root: Element, ctx: HostContext): SnapChild[] {
  if (element.getAttribute("aria-hidden") === "true") return [];
  const style = getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return [];
  if (tag === "br") return [{ kind: "text", value: "\n" }];
  if (tag === "style" || tag === "script" || tag === "template" || tag === "noscript") return [];
  if (tag === "hr") return [{ kind: "element", name: "Divider", props: [], children: [] }];
  if (LEFT_OUT.has(tag)) { ctx.note(`<${tag}>: left out (a page holds library components)`); return []; }
  if (tag === "img") {
    const src = element.getAttribute("src");
    if (!src) return [];
    return [{ kind: "element", name: "Image", props: [["src", lit(libraryMedia((element as HTMLImageElement).currentSrc || src))], ["alt", lit(element.getAttribute("alt") ?? "")]], children: [] }];
  }
  if (tag === "a") {
    const href = element.getAttribute("href");
    const text = children.every((child) => child.kind === "text");
    if (href && text && children.length) return [{ kind: "element", name: "Link", props: [["href", lit(href)]], children }];
    return textNode(element, "span", children, root);
  }
  if (TEXT_TAGS.has(tag)) return textNode(element, tag, children, root);

  // A box: its layout, its padding, and a Box for what it paints.
  const kids = wrapText(children);
  const background = TRANSPARENT.test(style.backgroundColor) ? null : colorTokensFor(element, style.backgroundColor, "background").map((token) => SURFACES[token]).find(Boolean) ?? "unknown";
  const borderWidth = parseFloat(style.borderTopWidth) || 0;
  const border = borderWidth && style.borderTopStyle !== "none" ? colorTokensFor(element, style.borderTopColor, "border").map((token) => BORDERS[token]).find(Boolean) ?? "unknown" : null;
  const corner = background || border ? radius(element, style, ctx) : null;
  if (background === "unknown" || border === "unknown") ctx.note("A background or border colour that no Box surface or border token paints: left out");
  const surface = background && background !== "unknown" ? background : null;
  const outline = border && border !== "unknown" ? border : null;
  const padding = paddingProps(element, style, ctx);
  const painted = Boolean(surface || outline || corner);
  if (!kids.length) return painted ? [{ kind: "element", name: "Box", props: boxProps(surface, outline, corner, padding), children: [] }] : [];
  if (kids.length === 1 && !painted && !padding.length) return kids;

  let layout: SnapNode | null = null;
  if (kids.length > 1) {
    const grid = style.display.includes("grid");
    const flex = style.display.includes("flex");
    const props: Array<[string, SnapValue]> = [];
    const semantic = LAYOUT_AS.has(tag) ? tag : null;
    if (grid) {
      const columns = style.gridTemplateColumns.split(/\s+(?![^(]*\))/).filter(Boolean).length;
      if (columns > 1) props.push(["columns", lit(columns)]);
      const gap = spacing(element, "gap", parseFloat(style.rowGap) || parseFloat(style.columnGap) || 0, ctx);
      if (gap) props.push(["gap", lit(gap)]);
    } else {
      const row = flex && style.flexDirection.startsWith("row");
      if (row) props.push(["direction", lit("row")]);
      const cssGap = flex ? parseFloat(row ? style.columnGap : style.rowGap) || 0 : 0;
      const gap = spacing(element, "gap", cssGap || spaceBetween(element, row ? "row" : "column"), ctx);
      if (gap) props.push(["gap", lit(gap)]);
      if (flex) {
        const alignment = align(style.alignItems);
        if (alignment) props.push(["align", lit(alignment)]);
        const justification = justify(style.justifyContent);
        if (justification) props.push(["justify", lit(justification)]);
        if (style.flexWrap === "wrap") props.push(["wrap", lit(true)]);
      }
    }
    if (semantic) props.push(["as", lit(semantic)]);
    if (!painted) props.push(...padding);
    layout = { kind: "element", name: grid ? "Grid" : "Stack", props, children: kids };
  }
  if (!painted) return layout ? [layout] : kids;
  return [{ kind: "element", name: "Box", props: boxProps(surface, outline, corner, padding), children: layout ? [layout] : kids }];
}

/**
 * A layout primitive or text written with a className (an example's own CSS: `.platform-…` sets its gap, padding,
 * alignment, text style): what that CSS renders, as the props it does not write itself. `have`: the props written.
 */
export function classProps(name: string, element: HTMLElement, have: ReadonlySet<string>, root: Element, ctx: HostContext): Array<[string, SnapValue]> {
  const style = getComputedStyle(element);
  const out: Array<[string, SnapValue]> = [];
  const add = (prop: string, value: string | number | boolean | null) => { if (value !== null && value !== "none" && !have.has(prop)) out.push([prop, lit(value)]); };
  const padding = () => { if (!["padding", "paddingX", "paddingY"].some((prop) => have.has(prop))) out.push(...paddingProps(element, style, ctx)); };
  if (name === "Text" || name === "Heading") {
    add("textStyle", textStyleKey(element, root));
    const tone = toneKey(element);
    if (tone !== "strongest") add("tone", tone);
    return out;
  }
  if (name === "Stack" && style.display.includes("flex")) {
    const row = style.flexDirection.startsWith("row");
    if (row) add("direction", "row");
    add("gap", spacing(element, "gap", parseFloat(row ? style.columnGap : style.rowGap) || 0, ctx));
    add("align", align(style.alignItems));
    add("justify", justify(style.justifyContent));
    if (style.flexWrap === "wrap") add("wrap", true);
    padding();
  } else if (name === "Grid" && style.display.includes("grid")) {
    const columns = style.gridTemplateColumns.split(/\s+(?![^(]*\))/).filter(Boolean).length;
    if (columns > 1) add("columns", columns);
    add("gap", spacing(element, "gap", parseFloat(style.rowGap) || parseFloat(style.columnGap) || 0, ctx));
    padding();
  } else if (name === "Box") {
    if (!TRANSPARENT.test(style.backgroundColor)) add("surface", colorTokensFor(element, style.backgroundColor, "background").map((token) => SURFACES[token]).find(Boolean) ?? null);
    if ((parseFloat(style.borderTopWidth) || 0) && style.borderTopStyle !== "none") add("border", colorTokensFor(element, style.borderTopColor, "border").map((token) => BORDERS[token]).find(Boolean) ?? null);
    add("radius", radius(element, style, ctx));
    padding();
  }
  return out;
}

function boxProps(surface: string | null, border: string | null, corner: string | null, padding: Array<[string, SnapValue]>): Array<[string, SnapValue]> {
  const props: Array<[string, SnapValue]> = [];
  if (surface) props.push(["surface", lit(surface)]);
  if (border) props.push(["border", lit(border)]);
  if (corner) props.push(["radius", lit(corner)]);
  return [...props, ...padding];
}
