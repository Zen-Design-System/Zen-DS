import type { PathCommand, Point, ViewBox } from "../../../components/Shape/geometry";

/*
 * Figma's Pen and Pencil, the model (plan docs/research/studio-f9-vectors-spec-2026-10-19.md F9a; canvas: penTool.ts).
 * Pure, no runtime imports (the node selftest penModel.selftest.mjs imports it; the path's bounds and text come from
 * Shape's geometry.ts, passed in). Points are the frame's own px.
 *
 * - Pen: a click adds a corner, a press-drag a smooth point whose handles mirror (⌥ breaks the mirror while dragging);
 *   ⇧ keeps a segment and a handle to 45° steps; a click on the first point closes the path. The path between two points
 *   is a line unless one of them has a handle there (then a cubic).
 * - Pencil: the pointer's trail, simplified to cubic curves (Schneider's fit, as Figma smooths a pencil stroke).
 * - A drawn path becomes a vector layer: `d` from its own top-left (viewBox 0 0 w h), the layer at its box.
 */

/** One point of a pen path: where it is and its two handles (absolute; null: none, a corner on that side). */
export type PenPoint = { at: Point; in: Point | null; out: Point | null };

const round2 = (value: number) => Math.round(value * 100) / 100;
const same = (a: Point, b: Point) => Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;

/** `to` moved to the nearest 45° direction from `from` (⇧), keeping its distance along that direction. */
export function snap45(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const step = Math.PI / 4;
  const angle = Math.round(Math.atan2(dy, dx) / step) * step;
  const length = Math.hypot(dx, dy) * Math.cos(Math.atan2(dy, dx) - angle);
  return { x: from.x + Math.cos(angle) * length, y: from.y + Math.sin(angle) * length };
}

/** A smooth point at `at` dragged to `drag`: the out handle there, the in handle mirrored (unless `broken`, kept as `keep`). */
export function smoothPoint(at: Point, drag: Point, broken = false, keep: Point | null = null): PenPoint {
  const mirror = { x: 2 * at.x - drag.x, y: 2 * at.y - drag.y };
  return { at, out: same(at, drag) ? null : drag, in: same(at, drag) ? null : broken ? keep : mirror };
}

/** The path through `points` (closed: back to the first and Z), as absolute M / L / C / Z commands. */
export function penCommands(points: readonly PenPoint[], closed: boolean): PathCommand[] {
  if (!points.length) return [];
  const out: PathCommand[] = [{ command: "M", points: [points[0].at] }];
  const segment = (from: PenPoint, to: PenPoint) => {
    if (!from.out && !to.in) out.push({ command: "L", points: [to.at] });
    else out.push({ command: "C", points: [from.out ?? from.at, to.in ?? to.at, to.at] });
  };
  for (let i = 1; i < points.length; i++) segment(points[i - 1], points[i]);
  if (closed && points.length > 1) {
    segment(points[points.length - 1], points[0]);
    out.push({ command: "Z", points: [] });
  }
  return out;
}

/** A drawn path's vector layer: its box in the frame's px (`bounds`: geometry.ts vectorBounds) and the path from that box's top-left. */
export type VectorLayer = { x: number; y: number; width: number; height: number; commands: PathCommand[]; viewBox: string };
export function vectorLayer(commands: readonly PathCommand[], bounds: ViewBox | null): VectorLayer | null {
  if (!bounds) return null;
  const x = round2(bounds.x);
  const y = round2(bounds.y);
  const width = round2(bounds.width);
  const height = round2(bounds.height);
  const moved = commands.map((entry) => ({ command: entry.command, points: entry.points.map((point) => ({ x: point.x - x, y: point.y - y })) }));
  return { x, y, width, height, commands: moved, viewBox: `0 0 ${width} ${height}` };
}

/** The JSX of a drawn vector (`d`: geometry.ts vectorPathData of its commands): floating at its X / Y in a free frame, else sized in the flow. */
export function vectorCode(layer: VectorLayer, d: string, mode: "free" | "flow"): string {
  const placed = mode === "free" ? [`position="absolute"`, `insetLeft={${layer.x}}`, `insetTop={${layer.y}}`] : [];
  return `<Shape ${[`type="vector"`, ...placed, `width={${layer.width}}`, `height={${layer.height}}`, `d="${d}"`, `viewBox="${layer.viewBox}"`].join(" ")} />`;
}

/* ── Pencil: a freehand trail fitted with cubic curves (Philip J. Schneider, Graphics Gems 1990) ─────────────────── */

type Vec = Point;
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
const unit = (a: Vec): Vec => { const length = Math.hypot(a.x, a.y) || 1; return { x: a.x / length, y: a.y / length }; };
const bezier = (c: Vec[], t: number): Vec => {
  const u = 1 - t;
  return add(add(scale(c[0], u * u * u), scale(c[1], 3 * u * u * t)), add(scale(c[2], 3 * u * t * t), scale(c[3], t * t * t)));
};

function chordParams(points: readonly Vec[]): number[] {
  const out = [0];
  for (let i = 1; i < points.length; i++) out.push(out[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  const total = out[out.length - 1] || 1;
  return out.map((value) => value / total);
}

function fitOne(points: readonly Vec[], u: readonly number[], tan1: Vec, tan2: Vec): Vec[] {
  const first = points[0];
  const last = points[points.length - 1];
  let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
  for (let i = 0; i < points.length; i++) {
    const t = u[i];
    const b1 = 3 * t * (1 - t) ** 2;
    const b2 = 3 * t * t * (1 - t);
    const a1 = scale(tan1, b1);
    const a2 = scale(tan2, b2);
    c00 += dot(a1, a1); c01 += dot(a1, a2); c11 += dot(a2, a2);
    const rest = sub(points[i], add(scale(first, (1 - t) ** 3 + b1), scale(last, b2 + t ** 3)));
    x0 += dot(a1, rest); x1 += dot(a2, rest);
  }
  const det = c00 * c11 - c01 * c01;
  let alpha1 = det ? (x0 * c11 - x1 * c01) / det : 0;
  let alpha2 = det ? (c00 * x1 - c01 * x0) / det : 0;
  const span = Math.hypot(last.x - first.x, last.y - first.y);
  if (!(alpha1 > 1e-6 * span) || !(alpha2 > 1e-6 * span)) alpha1 = alpha2 = span / 3;
  return [first, add(first, scale(tan1, alpha1)), add(last, scale(tan2, alpha2)), last];
}

function fit(points: readonly Vec[], tan1: Vec, tan2: Vec, error: number, out: Vec[][], depth = 0) {
  if (points.length === 2) {
    const span = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) / 3;
    out.push([points[0], add(points[0], scale(tan1, span)), add(points[1], scale(tan2, span)), points[1]]);
    return;
  }
  const u = chordParams(points);
  const curve = fitOne(points, u, tan1, tan2);
  let worst = 0;
  let split = Math.floor(points.length / 2);
  for (let i = 1; i < points.length - 1; i++) {
    const at = bezier(curve, u[i]);
    const distance = Math.hypot(at.x - points[i].x, at.y - points[i].y);
    if (distance > worst) { worst = distance; split = i; }
  }
  if (worst <= error || depth > 12) { out.push(curve); return; }
  const centre = unit(sub(points[split - 1], points[split + 1]));
  fit(points.slice(0, split + 1), tan1, centre, error, out, depth + 1);
  fit(points.slice(split), scale(centre, -1), tan2, error, out, depth + 1);
}

/** A pencil trail (the frame's px, in order) as M / C commands within `error` px of it (closed: ends on its start, Z). */
export function pencilCommands(trail: readonly Point[], error = 2, closed = false): PathCommand[] {
  const points = trail.filter((point, index) => index === 0 || Math.hypot(point.x - trail[index - 1].x, point.y - trail[index - 1].y) > 0.5);
  if (points.length < 2) return [];
  const curves: Vec[][] = [];
  fit(points, unit(sub(points[1], points[0])), unit(sub(points[points.length - 2], points[points.length - 1])), error, curves);
  const out: PathCommand[] = [{ command: "M", points: [points[0]] }];
  for (const curve of curves) out.push({ command: "C", points: [curve[1], curve[2], curve[3]] });
  if (closed) out.push({ command: "Z", points: [] });
  return out;
}
