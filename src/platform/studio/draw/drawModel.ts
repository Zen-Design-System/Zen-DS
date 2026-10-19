/*
 * Drawing on the canvas as Figma does (user, 2026-10-17: "vẽ các shape như figma … hành vi chỉnh sửa vẽ canvas, frame y
 * hệt Figma"; research docs/research/studio-figma-native-parity-2026-10-17.md §7 P1). Pure: the box a gesture draws and
 * the code it writes, so `drawModel.selftest.mjs` runs it in Node (type-only imports).
 *
 * Figma's rules, kept exactly:
 * - a click (no drag) places the default size, 100 × 100, its top-left at the point (a line: 100 long, to the right);
 * - a drag draws corner to corner; ⇧ keeps the sides equal (a line snaps to 45° steps); ⌥ draws from the centre;
 *   Space held moves what is being drawn (the caller moves the start point);
 * - the new layer goes into the top-most frame under the start point: in a frame without auto layout it sits at the
 *   point (Figma's X / Y, px); in an auto layout frame it joins the flow where the pointer is;
 * - names: Rectangle, Ellipse, Line, Arrow, Polygon, Star, Frame, Text.
 * - the Text tool (T, F6): a click makes an Auto width text at the point, a drag a text box of the dragged width (Auto
 *   height); the person types at once (edit/textCreate.ts).
 */

export const drawKinds = ["rectangle", "ellipse", "line", "arrow", "polygon", "star", "frame", "text"] as const;
export type DrawKind = (typeof drawKinds)[number];
export type ShapeKind = Exclude<DrawKind, "frame" | "text">;

export type Point = { x: number; y: number };
export type Box = { x: number; y: number; width: number; height: number };
export type DrawKeys = { shift: boolean; alt: boolean };

/** Figma's click size. */
export const CLICK_SIZE = 100;
/** Under this many screen px of travel a press is a click. */
export const CLICK_TRAVEL = 3;

export const isLineKind = (kind: DrawKind): kind is "line" | "arrow" => kind === "line" || kind === "arrow";

/** The layer name Figma gives what each tool draws (Layers panel, the size tag, the undo label). */
export const drawLabels: Record<DrawKind, string> = { rectangle: "Rectangle", ellipse: "Ellipse", line: "Line", arrow: "Arrow", polygon: "Polygon", star: "Star", frame: "Frame", text: "Text" };

/** The words a new text layer holds until the person types (selected, so the first key replaces them). */
export const NEW_TEXT = "Text";

const round = (value: number) => Math.round(value);

/**
 * The box a drag from `start` to `pointer` draws (both in the parent's px): ⇧ makes the sides equal, ⌥ draws from the
 * centre. A line's box is its unrotated box (see `drawLine`).
 */
export function drawBox(start: Point, pointer: Point, keys: DrawKeys): Box {
  let dx = pointer.x - start.x;
  let dy = pointer.y - start.y;
  if (keys.shift) {
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    dx = Math.sign(dx || 1) * side;
    dy = Math.sign(dy || 1) * side;
  }
  if (keys.alt) return { x: start.x - Math.abs(dx), y: start.y - Math.abs(dy), width: Math.abs(dx) * 2, height: Math.abs(dy) * 2 };
  return { x: Math.min(start.x, start.x + dx), y: Math.min(start.y, start.y + dy), width: Math.abs(dx), height: Math.abs(dy) };
}

/** A line from `start` to `pointer`: ⇧ snaps its angle to 45° steps, ⌥ makes `start` its middle. Returns both ends. */
export function drawLine(start: Point, pointer: Point, keys: DrawKeys): { from: Point; to: Point } {
  let dx = pointer.x - start.x;
  let dy = pointer.y - start.y;
  if (keys.shift) {
    const length = Math.hypot(dx, dy);
    const step = Math.PI / 4;
    const angle = Math.round(Math.atan2(dy, dx) / step) * step;
    dx = Math.cos(angle) * length;
    dy = Math.sin(angle) * length;
  }
  const to = { x: start.x + dx, y: start.y + dy };
  return keys.alt ? { from: { x: start.x - dx, y: start.y - dy }, to } : { from: start, to };
}

/** The unrotated box and Figma rotation (degrees, counter-clockwise positive) of a line between two points. */
export function lineBox(from: Point, to: Point): { box: Box; rotation: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  let rotation = length ? Math.round((-Math.atan2(dy, dx) * 180) / Math.PI * 100) / 100 : 0;
  if (rotation === -180) rotation = 180;
  return { box: { x: mid.x - length / 2, y: mid.y, width: length, height: 0 }, rotation: rotation || 0 };
}

/** What a click places: Figma's 100 × 100 with its top-left at the point (a line: 100 long, from the point to the right;
 *  a text: no box, it is as wide as its words). */
export function clickBox(kind: DrawKind, at: Point): Box {
  if (kind === "text") return { x: at.x, y: at.y, width: 0, height: 0 };
  return isLineKind(kind) ? { x: at.x, y: at.y, width: CLICK_SIZE, height: 0 } : { x: at.x, y: at.y, width: CLICK_SIZE, height: CLICK_SIZE };
}

/** Where the new layer goes: `free` (a frame without auto layout: at X / Y px) or `flow` (an auto layout frame). */
export type DrawPlacement = { mode: "free"; x: number; y: number } | { mode: "flow" };

const attr = (name: string, value: number) => `${name}={${value}}`;

/**
 * The JSX a drawn layer writes. Shapes: `<Shape type=…>` sized in px (a line has only its length, and its rotation);
 * Frame: a `<Box>` with Surface fill (Figma's white frame). In a free frame the layer is absolute at Figma's X / Y.
 */
export function drawCode(kind: DrawKind, box: Box, placement: DrawPlacement, rotation = 0): string {
  const width = Math.max(1, round(box.width));
  const height = Math.max(1, round(box.height));
  const placed = placement.mode === "free" ? ["position=\"absolute\"", attr("insetLeft", round(placement.x)), attr("insetTop", round(placement.y))] : [];
  // Text: Auto width (a click: one line as wide as its words, Text wrap={false}) or Auto height (a drag: that width). A
  // Text has no position props: in a free frame it floats in a Box at the point (Ignore auto layout's wrapper,
  // position/float.ts), which Layers and the canvas treat as the text itself.
  if (kind === "text") {
    const text = `<Text ${box.width >= 1 ? attr("width", width) : "wrap={false}"}>${NEW_TEXT}</Text>`;
    return placement.mode === "free" ? `<Box ${placed.join(" ")}>${text}</Box>` : text;
  }
  if (kind === "frame") return `<Box ${[...placed, attr("width", width), attr("height", height), "surface=\"surface\""].join(" ")} />`;
  const size = isLineKind(kind) ? [attr("width", width)] : [attr("width", width), attr("height", height)];
  const turn = rotation ? [attr("rotation", Math.round(rotation * 100) / 100)] : [];
  return `<Shape ${[`type="${kind}"`, ...placed, ...size, ...turn].join(" ")} />`;
}
