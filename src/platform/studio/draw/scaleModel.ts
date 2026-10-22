/*
 * Figma's Scale tool (K) on a page you made, as numbers (plan docs/research/studio-figma-design-parity-2026-10-18.md,
 * the user's choice 2026-10-21): a layer and everything in it grow or shrink by one factor, keeping its proportions.
 * What the page writes in px (a number) is multiplied: sizes, a free layer's insets, stroke weights, and a gap, padding
 * or radius given in px. A Zen token keeps its step (a gap of md, a padding of lg, a radius step, a component's size, a
 * text style), and the status line names what was kept. A layer's place follows the anchor: the point of its box (or
 * of the box around the layers scaled together) that stays put. Any other number (rotation, opacity, shares, counts)
 * is left as written. No imports: `node scaleModel.selftest.mjs` runs it as is.
 */

/** A prop as the source writes it (SourceAttr's fields this model reads). */
export type ScaleAttr = { name: string; kind: string; value?: string };
/** A prop edit (the EditOp setProp this model writes). */
export type ScaleOp = { op: "setProp"; name: string; value: { kind: "number"; value: number } };
export type ScaleBox = { x: number; y: number; width: number; height: number };
/** The anchor: 0 = left / top, 0.5 = centre, 1 = right / bottom (Figma's 3 × 3 anchor points). */
export type ScaleAnchor = { x: 0 | 0.5 | 1; y: 0 | 0.5 | 1 };
export type ScalePin = "start" | "end" | "stretch" | "center";

/** Props in px that the factor multiplies, and the Zen steps a token there keeps (for the status line). */
const PX: Record<string, string> = {
  width: "", height: "", minWidth: "", maxWidth: "", minHeight: "", maxHeight: "", minColumnWidth: "",
  strokeWeight: "",
  gap: "gap", rowGap: "gap", columnGap: "gap",
  padding: "padding", paddingX: "padding", paddingY: "padding", paddingTop: "padding", paddingRight: "padding", paddingBottom: "padding", paddingLeft: "padding",
  radius: "radius", radiusTopLeft: "radius", radiusTopRight: "radius", radiusBottomRight: "radius", radiusBottomLeft: "radius",
  size: "sizes",
  insetTop: "insets", insetRight: "insets", insetBottom: "insets", insetLeft: "insets",
};
const INSETS = new Set(["insetTop", "insetRight", "insetBottom", "insetLeft"]);
/** Layers whose type comes from a text style (Zen has no px font size): the text keeps its style. */
const TEXTS = new Set(["Text", "Heading", "TextRun"]);

/** "2", "2x", "2×", "200%", "1,5" → 2 / 1.5; null for anything else (0 and below, or not a number). */
export function parseFactor(input: string): number | null {
  const text = input.trim().replace(",", ".").replace(/\s+/g, "");
  const match = /^(\d*\.?\d+)(%|x|×)?$/i.exec(text);
  if (!match) return null;
  const value = Number(match[1]) / (match[2] === "%" ? 100 : 1);
  return Number.isFinite(value) && value > 0 && value <= 100 ? value : null;
}

/** The factor as Figma's Scale field shows it ("1.5x"). */
export const factorText = (factor: number) => `${Math.round(factor * 1000) / 1000}x`;

/** A literal number as written (`width={320}`), else null (a token, a string, an expression). */
function written(attr: ScaleAttr): number | null {
  if (attr.kind !== "expression" || attr.value === undefined) return null;
  const value = Number(attr.value.trim());
  return Number.isFinite(value) ? value : null;
}

/** A px value times the factor: whole px (a size at least 1), a stroke to the hundredth. */
function scaled(name: string, value: number, factor: number): number {
  if (name === "strokeWeight") return Math.round(value * factor * 100) / 100;
  const next = Math.round(value * factor);
  return name === "width" || name === "height" ? Math.max(1, next) : next;
}

/**
 * The edits that scale one element by `factor`, and the Zen steps it keeps. `ownPlace`: the element whose place the
 * anchor sets (the layer scaled itself): its insets are left to insetOps; inside it, an inset scales with the rest.
 */
export function scaleOps(name: string, attributes: readonly ScaleAttr[], factor: number, { ownPlace = false } = {}): { ops: ScaleOp[]; kept: Set<string> } {
  const ops: ScaleOp[] = [];
  const kept = new Set<string>();
  if (TEXTS.has(name)) kept.add("text");
  for (const attr of attributes) {
    if (!(attr.name in PX) || (ownPlace && INSETS.has(attr.name))) continue;
    const value = written(attr);
    if (value === null) {
      // A token (md, lg, "full"), Hug / Fill or a binding: as written. A string step is a Zen step kept.
      if (attr.kind === "string" && PX[attr.name]) kept.add(PX[attr.name]);
      continue;
    }
    const next = scaled(attr.name, value, factor);
    if (next !== value) ops.push({ op: "setProp", name: attr.name, value: { kind: "number", value: next } });
  }
  return { ops, kept };
}

/** `box` scaled by `factor` about the anchor point of `around` (its own box when it is scaled alone). */
export function anchoredBox(box: ScaleBox, factor: number, anchor: ScaleAnchor, around: ScaleBox = box): ScaleBox {
  const ax = around.x + around.width * anchor.x;
  const ay = around.y + around.height * anchor.y;
  return { x: ax + (box.x - ax) * factor, y: ay + (box.y - ay) * factor, width: box.width * factor, height: box.height * factor };
}

/** Figma's anchor for a drag of a resize corner: the opposite corner stays. */
export const anchorOfCorner = (corner: { x: 0 | 1; y: 0 | 1 }): ScaleAnchor => ({ x: corner.x === 0 ? 1 : 0, y: corner.y === 0 ? 1 : 0 });

/** The factor a corner drag gives: the pointer's distance from the anchor, along the box's diagonal, over the box's. */
export function dragFactor(box: ScaleBox, anchor: ScaleAnchor, pointer: { x: number; y: number }): number {
  const ax = box.x + box.width * anchor.x, ay = box.y + box.height * anchor.y;
  const cx = box.x + box.width * (1 - anchor.x), cy = box.y + box.height * (1 - anchor.y);
  const dx = cx - ax, dy = cy - ay;
  const length = dx * dx + dy * dy;
  if (!length) return 1;
  const along = ((pointer.x - ax) * dx + (pointer.y - ay) * dy) / length;
  return Math.max(0.01, Math.round(along * 100) / 100);
}

/**
 * A floating layer's insets for its new box (the box in its frame, `inner` the frame's inside size): each pinned side
 * follows the box (Left / Right / Left-right as its constraint writes them); a centred one is written from the left, as
 * a move writes it (alignLayers moveOps). Returns the edits, and whether the constraint goes (centre → left).
 */
export function insetOps(pins: { x: ScalePin; y: ScalePin }, inner: { width: number; height: number }, next: ScaleBox): { ops: ScaleOp[]; dropConstraint: { x: boolean; y: boolean } } {
  const ops: ScaleOp[] = [];
  const set = (name: string, value: number) => ops.push({ op: "setProp", name, value: { kind: "number", value: Math.round(value) } });
  const axis = (pin: ScalePin, start: string, end: string, offset: number, size: number, room: number) => {
    if (pin === "start" || pin === "stretch" || pin === "center") set(start, offset);
    if (pin === "end" || pin === "stretch") set(end, room - offset - size);
    return pin === "center";
  };
  const x = axis(pins.x, "insetLeft", "insetRight", next.x, next.width, inner.width);
  const y = axis(pins.y, "insetTop", "insetBottom", next.y, next.height, inner.height);
  return { ops, dropConstraint: { x, y } };
}

/** The status line after a scale: "Scaled 200% · Zen steps kept: gap, padding, text". */
export function scaleStatus(factor: number, kept: Iterable<string>): string {
  const order = ["gap", "padding", "radius", "insets", "sizes", "text"];
  const steps = [...new Set(kept)].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return `Scaled ${Math.round(factor * 100)}%${steps.length ? ` · Zen steps kept: ${steps.join(", ")}` : ""}`;
}
