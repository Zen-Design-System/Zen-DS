import { useEffect, useRef, useState } from "react";
import { canvasApi } from "../canvas/viewport";
import { currentFiber, fiberOf, onSourceUpdate, srcOf, type Fiber, type FiberHit } from "../select/picker";
import { matchingTextStyles, textStylesOf } from "./partInfo";
import { typographyFamily } from "./propSchema";

/*
 * What the Text section reads from the canvas for a selected element: whether its rendered output holds text, whether
 * that text is its own (not rendered by another selectable element inside it), and the Zen text style it renders with.
 */

/** Host tags that are text by nature: a Text section whenever they render any text. */
export const hostTextTags = new Set([
  "p", "span", "label", "li", "a", "strong", "em", "small", "b", "i", "u", "s", "mark", "code", "kbd", "q", "cite", "abbr", "time", "sub", "sup",
  "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "figcaption", "dt", "dd", "legend", "caption", "summary",
]);

export type RenderedText = {
  /** The element's DOM holds visible text (its own or a child's). */
  holdsText: boolean;
  /** A text node sits directly in the element's first DOM node (div/td/th count as text holders only then). */
  directText: boolean;
  /** Some of that text belongs to this element, not to another annotated element inside it (a component's label). */
  ownText: boolean;
  /** The style it renders with: for a component, a text-style class on its text or an ancestor inside it; else (and for
   * a host element) the styles whose size, line height and weight equal the computed ones, the family of the class
   * around it first. Empty when none matches. */
  styles: string[];
  /** Where `styles` came from: a class, or matching the computed font. */
  source: "class" | "computed" | null;
  /** "14 / 20 · 400" (size / line height · weight), for a text that matches no Zen style. */
  metrics: string;
  /** A component's own text renders with the font around the component (no class or CSS of its own sets it). */
  inherits: boolean;
  /** Its computed text alignment as Zen's align (a parent may centre it); null when nothing renders. */
  align: "start" | "center" | "end" | "justify" | null;
  /** Its computed vertical alignment (align-content) as Zen's verticalAlign; null when nothing renders. */
  valign: "top" | "middle" | "bottom" | null;
  /** The box is taller than its text, so a vertical alignment shows (a Fixed or Fill height). */
  room: boolean;
  /** It renders inline (a span), where text alignment has no effect. */
  inline: boolean;
};

const MAX_TEXT_NODES = 60;
const MAX_OWN = 4;
const visible = (node: Node) => Boolean(node.textContent?.trim()) && Boolean(node.parentElement?.getClientRects().length) && !node.parentElement?.closest(".zen-visually-hidden");

function metricsOf(element: Element) {
  const style = getComputedStyle(element);
  const lineHeight = style.lineHeight === "normal" ? "normal" : String(Math.round(parseFloat(style.lineHeight) * 10) / 10);
  return `${Math.round(parseFloat(style.fontSize) * 10) / 10} / ${lineHeight} · ${style.fontWeight}`;
}

/**
 * The style `node` renders with. `withClass`: a text-style class on the node or an ancestor below `stop` names it (a
 * component's label span); otherwise the computed font is matched, ordered so the family of an inherited class comes first.
 */
function styleOf(node: Element, stop: Element | null, withClass: boolean): Pick<RenderedText, "styles" | "source" | "metrics"> {
  const classes = textStylesOf(node, stop).names;
  const metrics = metricsOf(node);
  if (withClass && classes.length) return { styles: classes, source: "class", metrics };
  const matched = matchingTextStyles(node);
  const family = classes[0] ? typographyFamily(classes[0]) : null;
  const rank = (name: string) => (classes.includes(name) ? 0 : family && typographyFamily(name) === family ? 1 : 2);
  const styles = [...matched].sort((a, b) => rank(a) - rank(b));
  return { styles, source: styles.length ? "computed" : null, metrics };
}

/** The annotation of the nearest JSX element that rendered `element` (the committed one: a re-render may have moved it). */
function ownerSrc(element: Element | null): string | null {
  let node: Node | null = element;
  let fiber: Fiber | null = null;
  while (node && !(fiber = fiberOf(node))) node = node.parentNode;
  for (let current = fiber, guard = 0; current && guard < 4000; current = current.return, guard += 1) {
    const src = srcOf(current);
    if (src) return srcOf(currentFiber(current)) ?? src;
  }
  return null;
}

const none: RenderedText = { holdsText: false, directText: false, ownText: false, styles: [], source: null, metrics: "", inherits: false, align: null, valign: null, room: false, inline: false };

/** The computed text-align as Zen's align: left / start → start, center, right / end → end (left and right flip in RTL). */
function alignOf(element: Element): RenderedText["align"] {
  const style = getComputedStyle(element);
  const rtl = style.direction === "rtl";
  switch (style.textAlign) {
    case "center":
    case "-webkit-center":
      return "center";
    case "start":
      return "start";
    case "end":
      return "end";
    case "left":
      return rtl ? "end" : "start";
    case "right":
      return rtl ? "start" : "end";
    case "justify":
      return "justify";
    default:
      return null;
  }
}

/** The computed align-content as Zen's verticalAlign: center → middle, end → bottom, anything else (normal) → top. */
function valignOf(element: Element): RenderedText["valign"] {
  const value = getComputedStyle(element).alignContent;
  return /center/.test(value) ? "middle" : /end/.test(value) ? "bottom" : "top";
}

/** Whether the element's box is taller than its text (room for a vertical alignment), in screen px (the canvas zooms). */
function roomOf(element: Element): boolean {
  if (!(element instanceof HTMLElement) || !element.offsetHeight) return false;
  const box = element.getBoundingClientRect();
  const scale = box.height / element.offsetHeight;
  const style = getComputedStyle(element);
  const chrome = ["paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth"].reduce((sum, key) => sum + (parseFloat(style[key as "paddingTop"]) || 0), 0);
  // The text's height is its lines × the line height: glyph boxes (a range's rects) are shorter than the line box.
  const range = document.createRange();
  range.selectNodeContents(element);
  const lineHeight = (style.lineHeight === "normal" ? parseFloat(style.fontSize) * 1.2 : parseFloat(style.lineHeight)) * scale;
  const centers = Array.from(range.getClientRects()).filter((rect) => rect.height > 0).map((rect) => rect.top + rect.height / 2).sort((a, b) => a - b);
  const lines = centers.reduce((count, center, index) => (index === 0 || center - centers[index - 1] > lineHeight / 2 ? count + 1 : count), 0);
  const content = Math.max(lines * lineHeight, range.getBoundingClientRect().height);
  return box.height - chrome * scale - content > Math.max(1, scale);
}

/**
 * Why an alignment shows no effect on the canvas yet, for the row's note (`align` / `verticalAlign`, the props' names):
 * text alignment needs a block; vertical alignment a box taller than its text (Figma applies it to a fixed height only).
 */
export function alignmentHint(prop: string, rendered: RenderedText): string | undefined {
  if (prop === "align" && rendered.inline) return "Shows on a block: this text renders inline";
  if (prop === "verticalAlign" && !rendered.room) return "Shows when the box is taller than its text (Height Fixed or Fill)";
  return undefined;
}

/** Alignment facts of the element: computed alignments, room, and whether it renders inline. */
const alignmentOf = (element: Element) => ({ align: alignOf(element), valign: valignOf(element), room: roomOf(element), inline: getComputedStyle(element).display === "inline" });

/** Reads the rendered text of a selected element (`src` is its annotation). */
export function readRenderedText(hit: FiberHit | null, src: string): RenderedText {
  const host = hit?.hosts.find((element) => element.isConnected) ?? null;
  if (!hit || !host) return none;
  try {
    const frame = host.closest("[data-studio-frame]");
    const directText = Array.from(host.childNodes).some((child) => child.nodeType === Node.TEXT_NODE && Boolean(child.textContent?.trim()));
    let holdsText = false;
    // The elements holding this element's own text (a component's title and caption…), up to MAX_OWN.
    const owns: Element[] = [];
    let seen = 0;
    for (const root of hit.hosts) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node && seen < MAX_TEXT_NODES && owns.length < MAX_OWN; node = walker.nextNode()) {
        if (!visible(node)) continue;
        seen += 1;
        holdsText = true;
        // The text belongs to the nearest annotated element that rendered it: this one, or one inside it.
        const parent = node.parentElement;
        if (parent && !owns.includes(parent) && ownerSrc(parent) === src) owns.push(parent);
      }
      if (owns.length >= MAX_OWN || seen >= MAX_TEXT_NODES) break;
    }
    // An empty text still reports its alignment (the Text section shows it).
    if (!holdsText) return { ...none, ...alignmentOf(host) };
    const base = { holdsText, directText, ownText: owns.length > 0, ...alignmentOf(host) };
    // A host element is its own text holder (named by the font it inherits or its class).
    if (!hit.isComponent) return { ...base, ...styleOf(host, frame, false), inherits: false };
    if (!owns.length) return { ...base, styles: [], source: null, metrics: "", inherits: false };
    // A component's labels: a text-style class inside the component names each, else its font (set by the component's
    // CSS, or the same as around the component: inherited).
    const first = owns[0];
    const root = hit.hosts.find((element) => element.contains(first)) ?? host;
    const each = owns.map((own) => styleOf(own, hit.hosts.find((element) => element.contains(own)) ?? host, true));
    const styles = [...new Set(each.flatMap((style) => style.styles.slice(0, 1)))];
    const source = each.some((style) => style.source === "class") ? "class" : styles.length ? "computed" : null;
    const inherits = source !== "class" && Boolean(root.parentElement) && metricsOf(first) === metricsOf(root.parentElement!);
    return { ...base, styles, source, metrics: each[0].metrics, inherits };
  } catch {
    return none;
  }
}

const same = (a: RenderedText, b: RenderedText) => a.holdsText === b.holdsText && a.directText === b.directText && a.ownText === b.ownText && a.source === b.source && a.metrics === b.metrics && a.inherits === b.inherits && a.align === b.align && a.valign === b.valign && a.room === b.room && a.inline === b.inline && a.styles.join("|") === b.styles.join("|");

/** The rendered text of the selection, re-read as the canvas changes (HMR, preview modes, playground properties). */
export function useRenderedText(getHit: () => FiberHit | null, src: string, instance: number): RenderedText {
  const [info, setInfo] = useState<RenderedText>(none);
  const getHitRef = useRef(getHit);
  getHitRef.current = getHit;
  useEffect(() => {
    let alive = true;
    const read = () => {
      if (!alive) return;
      const next = readRenderedText(getHitRef.current(), src);
      setInfo((current) => (same(current, next) ? current : next));
    };
    read();
    let timer = 0;
    const schedule = () => {
      if (timer) return;
      timer = window.setTimeout(() => { timer = 0; read(); }, 250);
    };
    const world = canvasApi.getWorldElement();
    const observer = new MutationObserver(schedule);
    if (world) observer.observe(world, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "style", "data-align", "data-valign", "data-h", "data-theme", "data-density", "data-typography", "data-emphasis", "data-contrast"] });
    const offUpdate = onSourceUpdate(schedule);
    // Fonts may still be loading on the first read.
    void document.fonts?.ready.then(schedule);
    return () => { alive = false; observer.disconnect(); window.clearTimeout(timer); offUpdate(); };
  }, [src, instance]);
  return info;
}
