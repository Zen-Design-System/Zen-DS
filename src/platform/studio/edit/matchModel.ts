import { autoNameBase, givenNameOf } from "../../../../tools/studio/layer-meta.mjs";
import type { PageChild, PageNode, PageValue } from "../builder/render/renderPage";

/*
 * Figma's Select matching layers (⌥⌘A) and Select all with same › on a page you made, as pure functions of the page's
 * tree (parsePage's Board). The user's rule (2026-10-22):
 * - Matching layers are Figma's identical layers in other frames: the same name, the same parent names and the same place
 *   in the hierarchy (help.figma.com "Identify matching objects"). Never in the same frame. A frame in a Section matches
 *   only frames in that Section. A name compares as Figma would have it here: a given name (data-name) as written, an
 *   automatic one by its kind without its page-wide number ("Rectangle", not "Rectangle 2"), an instance by its
 *   component and variant, a text that was never renamed by its text style.
 * - Same fill / stroke / effect / text properties / font / instance / properties look across the whole page.
 */

/** What the page around the tree knows: the frame each top-level element is, a frame's Section, styles, variant axes. */
export type MatchContext = {
  /** The Section a frame sits in ("section:<id>"), or null. */
  sectionOf: (frameId: string) => string | null;
  /** The props that are a component's Figma variant axes, with their defaults (Button: level primary, size md…). */
  variantAxes: (component: string) => ReadonlyArray<{ prop: string; default: string }>;
  /** A text style's font: family and weight ("Inter Semi Bold"). */
  fontOf: (textStyle: string) => string | null;
};

export type SameKind = "properties" | "fill" | "stroke" | "effect" | "text" | "font" | "instance";

type Entry = { node: PageNode; frameId: string; path: PageNode[] };

const TEXT_NAMES = new Set(["Text", "Heading"]);
const LAYOUT_NAMES = new Set(["Box", "Stack", "Grid", "Shape", "Image", "TextRun"]);
const HEADING_STYLES: Readonly<Record<number, string>> = { 1: "Heading/1", 2: "Heading/4", 3: "Heading/Subheading", 4: "Body/Extra/Bold", 5: "Body/Base/Bold", 6: "Body/Base/Bold" };

const literal = (value: PageValue | undefined): unknown => (value?.kind === "literal" ? value.value : undefined);
const prop = (node: PageNode, name: string): unknown => literal(node.props[name]);

/** A board frame's id as the canvas names it ("screen:home", "overlay:sheet", "section:a"). */
export function frameIdOf(frame: PageNode): string {
  const id = String(prop(frame, "id") ?? "untitled");
  const state = prop(frame, "state");
  if (frame.name === "Overlay") return `overlay:${id}`;
  if (frame.name === "Section") return `section:${id}`;
  return `screen:${id}${typeof state === "string" ? `:${state}` : ""}`;
}

/** Every layer of the page with its frame and its parents (from the frame's top-level layer down to it). */
export function pageLayers(board: PageNode | null): Map<string, Entry> {
  const out = new Map<string, Entry>();
  const visit = (node: PageNode, frameId: string, parents: PageNode[]) => {
    const path = [...parents, node];
    out.set(node.loc, { node, frameId, path });
    for (const value of Object.values(node.props)) {
      if (value.kind === "element") visit(value.node, frameId, path);
      else if (value.kind === "fragment") children(value.children, frameId, path);
    }
    children(node.children, frameId, path);
  };
  const children = (list: PageChild[], frameId: string, parents: PageNode[]) => {
    for (const child of list) {
      if (child.kind === "element") visit(child, frameId, parents);
      else if (child.kind === "map") visit(child.node, frameId, parents);
    }
  };
  for (const frame of board?.children ?? []) {
    if (frame.kind !== "element" || frame.name === "Section") continue;
    const frameId = frameIdOf(frame);
    for (const value of Object.values(frame.props)) if (value.kind === "element") visit(value.node, frameId, []);
    children(frame.children, frameId, []);
  }
  return out;
}

/** A text layer's style (its own, else its component's default). */
function textStyleOf(node: PageNode): string {
  const own = prop(node, "textStyle");
  if (typeof own === "string") return own;
  if (node.name === "Heading") return HEADING_STYLES[Number(prop(node, "level") ?? 2)] ?? "Heading/4";
  return "Body/Base/Regular";
}

const isInstance = (node: PageNode) => node.name === "Use" || (!LAYOUT_NAMES.has(node.name) && !TEXT_NAMES.has(node.name) && /^[A-Z]/.test(node.name));
const componentOf = (node: PageNode) => (node.name === "Use" ? `use:${String(prop(node, "of") ?? "")}` : node.name);

/** A layer's name as Select matching layers compares it (see the file's note). */
export function matchName(node: PageNode, context: Pick<MatchContext, "variantAxes">): string {
  const given = givenNameOf(node);
  if (given) return `name:${given}`;
  if (isInstance(node)) {
    const variant = node.name === "Use" ? String(prop(node, "variant") ?? "") : context.variantAxes(node.name).map((axis) => `${axis.prop}=${String(prop(node, axis.prop) ?? axis.default)}`).join(",");
    return `instance:${componentOf(node)}|${variant}`;
  }
  if (TEXT_NAMES.has(node.name)) return `text:${textStyleOf(node)}`;
  const base = autoNameBase(node);
  return base ? `auto:${base}` : `tag:${node.name}`;
}

/**
 * Figma's Select matching layers: the layers in other frames whose names, parent names and place match `loc`'s (its
 * frame's Section only). Empty for a layer outside a frame, a frame itself, or one with no match.
 */
export function matchingLocs(board: PageNode | null, loc: string, context: MatchContext): string[] {
  const layers = pageLayers(board);
  const source = layers.get(loc);
  if (!source) return [];
  const key = (entry: Entry) => entry.path.map((node) => matchName(node, context)).join(" / ");
  const want = key(source);
  const section = context.sectionOf(source.frameId);
  const out: string[] = [];
  for (const [other, entry] of layers) {
    if (other === loc || entry.frameId === source.frameId || entry.path.length !== source.path.length) continue;
    if (context.sectionOf(entry.frameId) !== section) continue;
    if (key(entry) === want) out.push(other);
  }
  return out;
}

/** A shape or frame's fill, a text's colour; null when it has none. */
function fillOf(node: PageNode): string | null {
  if (node.name === "Shape") {
    const type = String(prop(node, "type") ?? "rectangle");
    const value = prop(node, "fill");
    const none = type === "line" || type === "arrow" || (type === "vector" && !prop(node, "d"));
    const fill = typeof value === "string" ? value : none ? "none" : "default";
    return fill === "none" ? null : fill;
  }
  if (TEXT_NAMES.has(node.name)) return String(prop(node, "tone") ?? "strongest");
  if (node.name === "Box" || node.name === "Stack" || node.name === "Grid") {
    const surface = prop(node, "surface");
    return typeof surface === "string" && surface !== "none" ? surface : null;
  }
  return null;
}

/** A shape's stroke or a frame's border colour; null when it has none. */
function strokeOf(node: PageNode): string | null {
  const value = node.name === "Shape" ? prop(node, "stroke") : node.name === "Box" || node.name === "Stack" || node.name === "Grid" ? prop(node, "border") : undefined;
  const line = node.name === "Shape" && ["line", "arrow"].includes(String(prop(node, "type") ?? ""));
  const stroke = typeof value === "string" ? value : line ? "default" : null;
  return stroke && stroke !== "none" ? stroke : null;
}

const effectOf = (node: PageNode): string | null => { const value = prop(node, "effectStyle"); return typeof value === "string" && value !== "none" ? value : null; };

/** The value `kind` compares on a layer, or null when the layer has none of it. */
export function sameValue(node: PageNode, kind: SameKind, context: Pick<MatchContext, "fontOf">): string | null {
  switch (kind) {
    case "fill": return fillOf(node);
    case "stroke": return strokeOf(node);
    case "effect": return effectOf(node);
    case "text": return TEXT_NAMES.has(node.name) ? textStyleOf(node) : null;
    case "font": return TEXT_NAMES.has(node.name) ? context.fontOf(textStyleOf(node)) : null;
    case "instance": return isInstance(node) ? componentOf(node) : null;
    case "properties": {
      // The same kind of layer painted the same way: type, fill, stroke and its weight, effect, corners, opacity, blend.
      const type = node.name === "Shape" ? `Shape:${String(prop(node, "type") ?? "rectangle")}` : node.name;
      const weight = prop(node, node.name === "Shape" ? "strokeWeight" : "borderWeight");
      return [type, fillOf(node), strokeOf(node), weight, effectOf(node), prop(node, "radius"), prop(node, "opacity"), prop(node, "blendMode")].map((value) => String(value ?? "")).join("|");
    }
  }
}

/** Figma's Select all with same ›: every other layer of the page with the same `kind` value as `loc`'s. */
export function sameLocs(board: PageNode | null, loc: string, kind: SameKind, context: Pick<MatchContext, "fontOf">): { value: string | null; locs: string[] } {
  const layers = pageLayers(board);
  const source = layers.get(loc);
  const value = source ? sameValue(source.node, kind, context) : null;
  if (!source || value === null) return { value: null, locs: [] };
  const locs: string[] = [];
  for (const [other, entry] of layers) if (other !== loc && sameValue(entry.node, kind, context) === value) locs.push(other);
  return { value, locs };
}
