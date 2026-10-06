import { isValidElement } from "react";
import { tokens } from "../../../tokens/generated";
import { textStyleDefinitions, typographyStyles } from "../../../tokens/typography.generated";

/*
 * What the part inspector reads from the canvas (read-only deep select): a part's props summarised, its text style,
 * auto layout, size and colours, with the Zen tokens whose computed value equals what the part renders. Token values
 * are read on the part's own DOM node (they follow the frame's preview modes), lazily and cached per node.
 */

/* ───────────── Props ───────────── */

function typeLabel(type: unknown): string {
  if (typeof type === "string") return type;
  if (typeof type === "function") return (type as { displayName?: string; name?: string }).displayName || (type as { name?: string }).name || "Component";
  if (type && typeof type === "object") {
    const object = type as { displayName?: string; render?: { displayName?: string; name?: string }; type?: unknown };
    return object.displayName || object.render?.displayName || object.render?.name || (object.type ? typeLabel(object.type) : "Component");
  }
  return "Component";
}

/** One value as the inspector shows it: primitives as written, arrays and objects summarised, functions as ƒ. */
export function summarise(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return JSON.stringify(value.length > 60 ? `${value.slice(0, 60)}…` : value);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
  if (typeof value === "function") return "ƒ";
  if (typeof value === "symbol") return value.toString();
  if (isValidElement(value)) return `<${typeLabel(value.type)} />`;
  if (Array.isArray(value)) {
    const first = value.find((item) => item !== null && item !== undefined);
    const of = first === undefined ? "" : ` of ${isValidElement(first) ? "elements" : Array.isArray(first) ? "arrays" : typeof first === "object" ? "objects" : `${typeof first}s`}`;
    return `[${value.length} ${value.length === 1 ? "item" : "items"}${value.length ? of : ""}]`;
  }
  if (typeof Element !== "undefined" && value instanceof Element) return `<${value.localName}>`;
  if (typeof value === "object") {
    const keys = Object.keys(value as object);
    return keys.length ? `{ ${keys.slice(0, 4).join(", ")}${keys.length > 4 ? ", …" : ""} }` : "{}";
  }
  return String(value);
}

/** Props worth listing: the ones set (not undefined), without React's and the Studio's own bookkeeping. */
export function listedProps(props: Record<string, unknown>): Array<[string, unknown]> {
  return Object.entries(props).filter(([name, value]) => value !== undefined && name !== "data-zen-src" && name !== "key" && name !== "ref" && !(name === "children" && (value === null || value === false)));
}

/*
 * The owner props that feed a part: a part prop that is the same object (reference) as something inside an owner prop
 * (Sidebar `sections` → the item a SidebarItem renders), or the same text (InputField `label` → InputLabel's children).
 * Booleans and numbers are too common to tell anything.
 */
export function drivingProps(ownerProps: Record<string, unknown>, partProps: Record<string, unknown>, text: string | null): string[] {
  const wanted = new Set<unknown>();
  for (const [name, value] of Object.entries(partProps)) {
    if (name === "data-zen-src" || name === "className" || name === "style" || typeof value === "function") continue;
    if ((typeof value === "string" && value.trim().length >= 2) || (value && typeof value === "object")) wanted.add(value);
    // A list the part renders from (its items may be the owner's own objects or elements).
    if (Array.isArray(value)) value.forEach((item) => { if (item && typeof item === "object") wanted.add(item); });
  }
  if (text && text.trim().length >= 2) wanted.add(text.trim());
  if (!wanted.size) return [];
  const found: string[] = [];
  for (const [name, value] of Object.entries(ownerProps)) {
    if (name === "data-zen-src" || name === "className" || name === "style" || typeof value === "function") continue;
    let budget = 3000;
    const seen = new Set<unknown>();
    const search = (current: unknown, depth: number): boolean => {
      if (budget-- <= 0) return false;
      if (wanted.has(current) || (typeof current === "string" && wanted.has(current.trim()))) return true;
      if (!current || typeof current !== "object" || depth > 5 || seen.has(current)) return false;
      seen.add(current);
      if (isValidElement(current)) return search((current.props as Record<string, unknown> | null)?.children, depth + 1);
      if (typeof Element !== "undefined" && current instanceof Element) return false;
      const values = Array.isArray(current) ? current : Object.values(current as Record<string, unknown>);
      return values.some((item) => search(item, depth + 1));
    };
    if (search(value, 0)) found.push(name);
  }
  return found;
}

/* ───────────── Tokens under a node ───────────── */

const tokenVar = (value: string) => /^var\((--zen-[a-z0-9-]+)\)$/.exec(value)?.[1] ?? null;
const tokenVars = Object.values(tokens as Record<string, string>).flatMap((value) => tokenVar(value) ?? []);
const colorVars = tokenVars.filter((name) => name.startsWith("--zen-color-"));
const spacingVars = tokenVars.filter((name) => name.startsWith("--zen-spacing-"));

let context: CanvasRenderingContext2D | null | undefined;
/** A CSS colour as "r,g,b,a%" (alpha in whole percent), or null when the browser cannot read it. */
export function colorKey(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  context ??= typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  let normal = text;
  if (context) {
    // An invalid colour leaves fillStyle unchanged: set two different colours first to tell.
    context.fillStyle = "#000000";
    context.fillStyle = text;
    const first = String(context.fillStyle);
    context.fillStyle = "#ffffff";
    context.fillStyle = text;
    if (String(context.fillStyle) !== first) return null;
    normal = first;
  }
  const hex = /^#([0-9a-f]{6})$/i.exec(normal);
  if (hex) {
    const number = parseInt(hex[1], 16);
    return `${(number >> 16) & 255},${(number >> 8) & 255},${number & 255},100`;
  }
  const rgba = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+%?))?\s*\)$/i.exec(normal);
  if (rgba) {
    const alpha = rgba[4] === undefined ? 1 : rgba[4].endsWith("%") ? parseFloat(rgba[4]) / 100 : parseFloat(rgba[4]);
    return `${Math.round(+rgba[1])},${Math.round(+rgba[2])},${Math.round(+rgba[3])},${Math.round(alpha * 100)}`;
  }
  return normal.toLowerCase();
}

/** "#0A85FF" or "rgba(10, 133, 255, 0.5)" for a colour key. */
export function colorLabel(key: string, fallback: string): string {
  const match = /^(\d+),(\d+),(\d+),(\d+)$/.exec(key);
  if (!match) return fallback;
  const [r, g, b, a] = match.slice(1).map(Number);
  if (a === 100) return `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  return `rgba(${r}, ${g}, ${b}, ${a / 100})`;
}

type TokenIndex = { signature: string; colors: Map<string, string[]>; spacing: Map<number, string[]> };
const indexCache = new WeakMap<Element, TokenIndex>();
const modeAttributes = ["data-theme", "data-component-theme", "data-density", "data-typography", "data-radius", "data-emphasis", "data-contrast", "data-brand"];

/** The preview modes a node renders under: the cache is rebuilt when they change. */
function modeSignature(element: Element) {
  return modeAttributes.map((name) => element.closest(`[${name}]`)?.getAttribute(name) ?? "").join("|");
}

function tokenIndex(element: Element): TokenIndex {
  const signature = modeSignature(element);
  const cached = indexCache.get(element);
  if (cached && cached.signature === signature) return cached;
  const style = getComputedStyle(element);
  const colors = new Map<string, string[]>();
  for (const name of colorVars) {
    const key = colorKey(style.getPropertyValue(name));
    if (!key) continue;
    const list = colors.get(key);
    if (list) list.push(name);
    else colors.set(key, [name]);
  }
  const spacing = new Map<number, string[]>();
  for (const name of spacingVars) {
    const raw = style.getPropertyValue(name).trim();
    if (!/^-?[\d.]+px$/.test(raw)) continue;
    const px = Math.round(parseFloat(raw) * 100) / 100;
    const list = spacing.get(px);
    if (list) list.push(name);
    else spacing.set(px, [name]);
  }
  const index = { signature, colors, spacing };
  indexCache.set(element, index);
  return index;
}

/** The colour tokens equal to `value` under `element`, the ones of `role` (content, background, border) first. */
export function colorTokensFor(element: Element, value: string, role: "content" | "background" | "border"): string[] {
  const key = colorKey(value);
  if (!key) return [];
  const names = tokenIndex(element).colors.get(key) ?? [];
  const preferred = `--zen-color-${role}-`;
  return [...names].sort((a, b) => Number(b.startsWith(preferred)) - Number(a.startsWith(preferred)));
}

/** The spacing tokens equal to `px` under `element`, gap or padding tokens first. */
export function spacingTokensFor(element: Element, px: number, role: "gap" | "padding"): string[] {
  if (!px) return [];
  const names = tokenIndex(element).spacing.get(Math.round(px * 100) / 100) ?? [];
  const preferred = `--zen-spacing-${role}-`;
  return [...names].sort((a, b) => Number(b.startsWith(preferred)) - Number(a.startsWith(preferred)));
}

/* ───────────── Text style ───────────── */

const hasOwnText = (node: Element) => Array.from(node.childNodes).some((child) => child.nodeType === 3 && Boolean(child.textContent?.trim()));

/** The node that holds the part's visible text: the part itself, else its first descendant with text of its own. */
export function textHost(element: Element): Element | null {
  if (hasOwnText(element)) return element;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
  for (let node = walker.nextNode() as Element | null; node; node = walker.nextNode() as Element | null) {
    if (node.classList.contains("zen-visually-hidden") || !node.getClientRects().length) continue;
    if (hasOwnText(node)) return node;
  }
  return null;
}

const styleByClass = new Map(Object.entries(typographyStyles).map(([name, className]) => [className as string, name]));

/** Zen text styles (typographyStyles names) set by class on the node, else inherited from the nearest ancestor below `stop`. */
export function textStylesOf(element: Element, stop: Element | null): { names: string[]; from: Element | null } {
  for (let node: Element | null = element; node; node = node.parentElement) {
    const names = Array.from(node.classList).flatMap((className) => styleByClass.get(className) ?? []);
    if (names.length) return { names, from: node === element ? null : node };
    if (node === stop) break;
  }
  return { names: [], from: null };
}

const typeTokens = tokens as Record<string, string>;
const varOf = (tokenName: string | undefined) => (tokenName ? tokenVar(typeTokens[tokenName] ?? "") : null);
const matchCache = new WeakMap<Element, { signature: string; names: string[] }>();

/** Text styles whose size, line height and weight equal what the node renders (no class: set by component CSS). */
export function matchingTextStyles(element: Element): string[] {
  const signature = `${modeSignature(element)}|${getComputedStyle(element).font}`;
  const cached = matchCache.get(element);
  if (cached && cached.signature === signature) return cached.names;
  const style = getComputedStyle(element);
  const px = (value: string) => Math.round(parseFloat(value) * 10) / 10;
  const size = px(style.fontSize);
  const lineHeight = style.lineHeight === "normal" ? NaN : px(style.lineHeight);
  const weight = Number(style.fontWeight);
  const names: string[] = [];
  for (const definition of textStyleDefinitions as ReadonlyArray<{ name: string; tokens?: { size?: string; lineHeight?: string; weight?: string } }>) {
    const sizeVar = varOf(definition.tokens?.size);
    const lineVar = varOf(definition.tokens?.lineHeight);
    const weightVar = varOf(definition.tokens?.weight);
    if (!sizeVar || !lineVar || !weightVar) continue;
    if (px(style.getPropertyValue(sizeVar)) !== size) continue;
    if (px(style.getPropertyValue(lineVar)) !== lineHeight) continue;
    if (Number(style.getPropertyValue(weightVar).trim()) !== weight) continue;
    names.push(definition.name);
  }
  matchCache.set(element, { signature, names });
  return names;
}

/* ───────────── Layout, size, colours ───────────── */

export type SpacingValue = { px: number; tokens: string[] };
export type PartLayout = {
  display: string;
  direction?: string;
  wrap?: string;
  align?: string;
  justify?: string;
  rowGap?: SpacingValue;
  columnGap?: SpacingValue;
  columns?: string;
  padding: { top: SpacingValue; right: SpacingValue; bottom: SpacingValue; left: SpacingValue };
};

const pxOf = (value: string) => Math.round((parseFloat(value) || 0) * 100) / 100;

/** The node's computed auto layout (CSS pixels, not the canvas zoom) with the matching spacing tokens. */
export function layoutOf(element: Element): PartLayout {
  const style = getComputedStyle(element);
  const spacing = (value: string, role: "gap" | "padding"): SpacingValue => {
    const px = pxOf(value);
    return { px, tokens: spacingTokensFor(element, px, role) };
  };
  const flex = /flex/.test(style.display);
  const grid = /grid/.test(style.display);
  const layout: PartLayout = {
    display: style.display,
    padding: { top: spacing(style.paddingTop, "padding"), right: spacing(style.paddingRight, "padding"), bottom: spacing(style.paddingBottom, "padding"), left: spacing(style.paddingLeft, "padding") },
  };
  if (flex) {
    layout.direction = style.flexDirection;
    layout.wrap = style.flexWrap;
  }
  if (flex || grid) {
    layout.align = style.alignItems;
    layout.justify = style.justifyContent;
    const rowGap = style.rowGap === "normal" ? "0" : style.rowGap;
    const columnGap = style.columnGap === "normal" ? "0" : style.columnGap;
    layout.rowGap = spacing(rowGap, "gap");
    layout.columnGap = spacing(columnGap, "gap");
  }
  if (grid) {
    const tracks = style.gridTemplateColumns.split(/\s+(?![^(]*\))/).filter(Boolean);
    layout.columns = `${tracks.length} ${tracks.length === 1 ? "column" : "columns"}`;
  }
  return layout;
}

/** Width × height in CSS pixels (the canvas zoom divided out). */
export function sizeOf(element: Element): { width: number; height: number } {
  const rect = element.getBoundingClientRect();
  if (element instanceof HTMLElement && element.offsetWidth) {
    const scale = rect.width / element.offsetWidth || 1;
    return { width: Math.round(element.offsetWidth * 100) / 100, height: Math.round((rect.height / scale) * 100) / 100 };
  }
  // SVG and other nodes without offset sizes: the scale of the nearest HTML ancestor.
  let scale = 1;
  for (let node = element.parentElement; node; node = node.parentElement) {
    if (node.offsetWidth) { scale = node.getBoundingClientRect().width / node.offsetWidth || 1; break; }
  }
  return { width: Math.round((rect.width / scale) * 100) / 100, height: Math.round((rect.height / scale) * 100) / 100 };
}

export type ColourValue = { label: string; key: string; value: string; tokens: string[] };

/** Text, fill, background and border colours (the ones that show), with the matching colour tokens. */
export function coloursOf(element: Element): Array<{ name: string; colour: ColourValue }> {
  const style = getComputedStyle(element);
  const out: Array<{ name: string; colour: ColourValue }> = [];
  const add = (name: string, value: string, role: "content" | "background" | "border") => {
    const key = colorKey(value);
    if (!key || /,0$/.test(key)) return;
    out.push({ name, colour: { label: colorLabel(key, value), key, value, tokens: colorTokensFor(element, value, role) } });
  };
  add("Text", style.color, "content");
  if (element instanceof SVGElement) {
    if (style.fill && style.fill !== "none" && !style.fill.startsWith("url(")) add("Fill", style.fill, "content");
    if (style.stroke && style.stroke !== "none" && !style.stroke.startsWith("url(")) add("Stroke", style.stroke, "content");
  }
  add("Background", style.backgroundColor, "background");
  const borderWidth = Math.max(...["Top", "Right", "Bottom", "Left"].map((side) => parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) || 0));
  if (borderWidth > 0 && style.borderStyle !== "none") add(`Border ${Math.round(borderWidth * 100) / 100}px`, style.borderTopColor, "border");
  return out;
}
