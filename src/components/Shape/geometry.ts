/**
 * Shape geometry, Figma's own (pure: Shape.tsx draws it, Zen Studio's arc handles and the Figma push read it).
 *
 * Every shape is drawn in its own box (0,0 … width,height), as Figma draws a node in its bounds:
 * - Ellipse: the ellipse inscribed in the box. Figma arcData = { startingAngle, endingAngle, innerRadius } in radians,
 *   clockwise from 3 o'clock (the y axis points down). The props spell it as Figma's design panel does: Start in
 *   degrees, Sweep and Ratio in percent.
 * - Polygon and Star: a regular polygon (star) with its first point at 12 o'clock, stretched so its own bounds fill the
 *   box: a triangle's apex touches the top edge and its base the bottom edge, as in Figma.
 * - Line and Arrow: a horizontal segment through the box's vertical centre; the angle is the layer's rotation.
 */

export type Point = { x: number; y: number };

/** Figma's ellipse arc as the design panel shows it: Start (°), Sweep (%), Ratio (%). */
export type ShapeArc = { start: number; sweep: number; ratio: number };

export const FULL_ARC: ShapeArc = { start: 0, sweep: 100, ratio: 0 };
/** Figma's default star inner radius (Ratio 38.2 %). */
export const STAR_RATIO = 38.2;
export const POLYGON_POINTS = 3;
export const STAR_POINTS = 5;

const TAU = Math.PI * 2;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 1000) / 1000;
const finite = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

/** Start in [0, 360), Sweep and Ratio in [0, 100]; unset parts take the full ellipse's. */
export function normalizeArc(arc: Partial<ShapeArc> | undefined): ShapeArc {
  const start = ((finite(arc?.start, 0) % 360) + 360) % 360;
  return { start: round(start), sweep: round(clamp(finite(arc?.sweep, 100), 0, 100)), ratio: round(clamp(finite(arc?.ratio, 0), 0, 100)) };
}

/** True when the arc draws the whole ellipse with no hole (Figma's plain ellipse). */
export const isFullArc = (arc: ShapeArc) => arc.sweep >= 100 && arc.ratio <= 0;

/** Figma arcData (radians) for an arc, and back. */
export function arcData(arc: ShapeArc): { startingAngle: number; endingAngle: number; innerRadius: number } {
  const startingAngle = (arc.start * Math.PI) / 180;
  return { startingAngle, endingAngle: startingAngle + (arc.sweep / 100) * TAU, innerRadius: arc.ratio / 100 };
}
export function arcFromData(data: { startingAngle?: number; endingAngle?: number; innerRadius?: number } | undefined): ShapeArc {
  const start = finite(data?.startingAngle, 0);
  const end = finite(data?.endingAngle, TAU);
  return normalizeArc({ start: (start * 180) / Math.PI, sweep: (Math.abs(end - start) / TAU) * 100, ratio: finite(data?.innerRadius, 0) * 100 });
}

/** The point at `degrees` (clockwise from 3 o'clock) on the ellipse inscribed in w × h, scaled by `scale` (1 = rim). */
export function ellipsePoint(width: number, height: number, degrees: number, scale = 1): Point {
  const angle = (degrees * Math.PI) / 180;
  return { x: width / 2 + (width / 2) * scale * Math.cos(angle), y: height / 2 + (height / 2) * scale * Math.sin(angle) };
}

/** The angle in degrees [0, 360), clockwise from 3 o'clock, of `point` seen from the centre of a w × h ellipse. */
export function ellipseAngle(width: number, height: number, point: Point): number {
  const dx = (point.x - width / 2) / Math.max(width / 2, 1e-6);
  const dy = (point.y - height / 2) / Math.max(height / 2, 1e-6);
  const degrees = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (degrees + 360) % 360;
}

/** How far `point` is from the centre along the rim's scale (0 centre, 1 on the rim) of a w × h ellipse. */
export function ellipseScale(width: number, height: number, point: Point): number {
  const dx = (point.x - width / 2) / Math.max(width / 2, 1e-6);
  const dy = (point.y - height / 2) / Math.max(height / 2, 1e-6);
  return Math.hypot(dx, dy);
}

const f = (value: number) => String(round(value));
const at = (point: Point) => `${f(point.x)} ${f(point.y)}`;

/** The SVG path of the ellipse (or its arc) in a w × h box: full, pie, ring or ring segment. Empty for a 0 sweep. */
export function ellipsePath(width: number, height: number, arcInput?: Partial<ShapeArc>): string {
  const arc = normalizeArc(arcInput);
  const rx = width / 2;
  const ry = height / 2;
  const ratio = arc.ratio / 100;
  if (arc.sweep <= 0 || rx <= 0 || ry <= 0) return "";
  const ring = (scale: number) => {
    const a = ellipsePoint(width, height, arc.start, scale);
    const b = ellipsePoint(width, height, arc.start + 180, scale);
    return `M ${at(a)} A ${f(rx * scale)} ${f(ry * scale)} 0 1 1 ${at(b)} A ${f(rx * scale)} ${f(ry * scale)} 0 1 1 ${at(a)} Z`;
  };
  if (arc.sweep >= 100) return ratio > 0 ? `${ring(1)} ${ring(ratio)}` : ring(1);
  const end = arc.start + (arc.sweep / 100) * 360;
  const large = arc.sweep > 50 ? 1 : 0;
  const o0 = ellipsePoint(width, height, arc.start);
  const o1 = ellipsePoint(width, height, end);
  const outer = `M ${at(o0)} A ${f(rx)} ${f(ry)} 0 ${large} 1 ${at(o1)}`;
  if (ratio <= 0) return `${outer} L ${f(rx)} ${f(ry)} Z`;
  const i1 = ellipsePoint(width, height, end, ratio);
  const i0 = ellipsePoint(width, height, arc.start, ratio);
  return `${outer} L ${at(i1)} A ${f(rx * ratio)} ${f(ry * ratio)} 0 ${large} 0 ${at(i0)} Z`;
}

/** Fits points into the box: their own bounds stretched to 0,0 … w,h (Figma's polygon and star). */
function fitPoints(points: Point[], width: number, height: number): Point[] {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX || 1;
  const spanY = Math.max(...ys) - minY || 1;
  return points.map((point) => ({ x: ((point.x - minX) / spanX) * width, y: ((point.y - minY) / spanY) * height }));
}

/** A regular polygon's corners in a w × h box (3 … 60 points; Figma's Count). */
export function polygonPoints(width: number, height: number, count = POLYGON_POINTS): Point[] {
  const n = Math.round(clamp(finite(count, POLYGON_POINTS), 3, 60));
  const unit = Array.from({ length: n }, (_, index) => {
    const angle = -Math.PI / 2 + (index * TAU) / n;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  });
  return fitPoints(unit, width, height);
}

/** A star's points (outer and inner, alternating) in a w × h box: Count 3 … 60, Ratio = inner radius in % (Figma's). */
export function starPoints(width: number, height: number, count = STAR_POINTS, ratio = STAR_RATIO): Point[] {
  const n = Math.round(clamp(finite(count, STAR_POINTS), 3, 60));
  const inner = clamp(finite(ratio, STAR_RATIO), 0, 100) / 100;
  const unit = Array.from({ length: n * 2 }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI) / n;
    const radius = index % 2 ? inner : 1;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
  // The outer points span the bounds (inner ones sit inside), so a star's tips touch the box edges.
  return fitPoints(unit, width, height);
}

export const pointsPath = (points: Point[]) => (points.length ? `M ${points.map(at).join(" L ")} Z` : "");

/** A line's two ends in a w-long box (through the vertical centre at y = 0 of the line's own box). */
export function lineEnds(width: number): [Point, Point] {
  return [{ x: 0, y: 0 }, { x: width, y: 0 }];
}

/** The open arrowhead (Figma's "Line arrow" cap) at `tip` pointing right: two strokes back from the tip. */
export function arrowHeadPath(tip: Point, strokeWeight: number): string {
  const size = Math.max(6, strokeWeight * 4);
  return `M ${f(tip.x - size)} ${f(tip.y - size * 0.75)} L ${at(tip)} L ${f(tip.x - size)} ${f(tip.y + size * 0.75)}`;
}

/**
 * The drawn segment of a Line from its two ends (world px): the unrotated box (centre on the segment's midpoint, width =
 * its length) and Figma's rotation (degrees, counter-clockwise positive, as the design panel shows it).
 */
export function lineFromEnds(from: Point, to: Point): { x: number; y: number; width: number; rotation: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const width = Math.hypot(dx, dy);
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const rotation = round(dx === 0 && dy === 0 ? 0 : (-Math.atan2(dy, dx) * 180) / Math.PI);
  return { x: round(mid.x - width / 2), y: round(mid.y), width: round(width), rotation: rotation === -180 ? 180 : rotation || 0 };
}

/* ── vectors (Figma's VECTOR; plan F9) ───────────────────────────────────────────────────────────────────────────── */

/** The box a vector's `d` is written in (SVG viewBox "minX minY width height"). */
export type ViewBox = { x: number; y: number; width: number; height: number };
/** One command of a vector's path: absolute M (move), L (line), C (cubic), Q (quadratic) or Z (close), with its points. */
export type PathCommand = { command: "M" | "L" | "C" | "Q" | "Z"; points: Point[] };

const ARITY: Readonly<Record<PathCommand["command"], number>> = { M: 1, L: 1, C: 3, Q: 2, Z: 0 };
const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i;
const TOKENS = /[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

/**
 * A vector's `d` as commands, or null when it holds anything but absolute M / L / C / Q / Z (relative commands, arcs,
 * H / V, S / T): the commands Figma's vectorPaths take, so a vector travels to and from Figma as written. Numbers after a
 * command repeat it (after M they are lines), as in SVG.
 */
export function parseVectorPath(d: string | undefined): PathCommand[] | null {
  if (typeof d !== "string" || !d.trim()) return null;
  if (d.replace(TOKENS, "").replace(/[\s,]/g, "")) return null;
  const tokens = d.match(TOKENS) ?? [];
  const out: PathCommand[] = [];
  let current: PathCommand["command"] | null = null;
  for (let i = 0; i < tokens.length; ) {
    if (!NUMBER.test(tokens[i])) {
      if (!(tokens[i] in ARITY)) return null;
      current = tokens[i] as PathCommand["command"];
      i += 1;
      if (current === "Z") { out.push({ command: "Z", points: [] }); continue; }
    } else if (!current || current === "Z") return null;
    const count = ARITY[current] * 2;
    const values = tokens.slice(i, i + count);
    if (values.length < count || values.some((value) => !NUMBER.test(value))) return null;
    const points: Point[] = [];
    for (let k = 0; k < count; k += 2) points.push({ x: Number(values[k]), y: Number(values[k + 1]) });
    out.push({ command: current, points });
    i += count;
    if (current === "M") current = "L";
  }
  return out.length && out[0].command === "M" ? out : null;
}

/** Commands back to `d` (numbers rounded to 3 places). */
export const vectorPathData = (commands: readonly PathCommand[]) =>
  commands.map((entry) => (entry.command === "Z" ? "Z" : `${entry.command} ${entry.points.map(at).join(" ")}`)).join(" ");

/** "minX minY width height" as a box, or null. */
export function parseViewBox(viewBox: string | undefined): ViewBox | null {
  const values = typeof viewBox === "string" ? viewBox.trim().split(/[\s,]+/).map(Number) : [];
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value)) || values[2] < 0 || values[3] < 0) return null;
  return { x: values[0], y: values[1], width: values[2], height: values[3] };
}

/** The extremes of one coordinate of a cubic (p0 … p3) or quadratic (p0 … p2) segment, its ends included. */
function curveRange(values: readonly number[]): [number, number] {
  const valueAt = (t: number) => {
    if (values.length === 3) return (1 - t) ** 2 * values[0] + 2 * (1 - t) * t * values[1] + t ** 2 * values[2];
    return (1 - t) ** 3 * values[0] + 3 * (1 - t) ** 2 * t * values[1] + 3 * (1 - t) * t ** 2 * values[2] + t ** 3 * values[3];
  };
  const ts = [0, 1];
  if (values.length === 3) {
    const denominator = values[0] - 2 * values[1] + values[2];
    if (denominator) ts.push((values[0] - values[1]) / denominator);
  } else {
    // The derivative's roots: a t² + b t + c = 0.
    const a = -values[0] + 3 * values[1] - 3 * values[2] + values[3];
    const b = 2 * (values[0] - 2 * values[1] + values[2]);
    const c = values[1] - values[0];
    if (Math.abs(a) < 1e-12) { if (b) ts.push(-c / b); }
    else {
      const disc = b * b - 4 * a * c;
      if (disc >= 0) ts.push((-b + Math.sqrt(disc)) / (2 * a), (-b - Math.sqrt(disc)) / (2 * a));
    }
  }
  const found = ts.filter((t) => t >= 0 && t <= 1).map(valueAt);
  return [Math.min(...found), Math.max(...found)];
}

/** The box around a path as drawn (curves by their extremes, not their control points), or null for an empty path. */
export function vectorBounds(commands: readonly PathCommand[]): ViewBox | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let pen: Point | null = null;
  let start: Point | null = null;
  const take = (x: [number, number], y: [number, number]) => {
    minX = Math.min(minX, x[0]); maxX = Math.max(maxX, x[1]);
    minY = Math.min(minY, y[0]); maxY = Math.max(maxY, y[1]);
  };
  for (const entry of commands) {
    if (entry.command === "Z") { pen = start; continue; }
    const end = entry.points[entry.points.length - 1];
    if (entry.command === "M") { start = end; take([end.x, end.x], [end.y, end.y]); }
    else if (entry.command === "L" || !pen) take([end.x, end.x], [end.y, end.y]);
    else {
      const from = pen;
      const all = [from, ...entry.points];
      take(curveRange(all.map((point) => point.x)), curveRange(all.map((point) => point.y)));
    }
    pen = end;
  }
  return Number.isFinite(minX) ? { x: round(minX), y: round(minY), width: round(maxX - minX), height: round(maxY - minY) } : null;
}

/**
 * A vector's path drawn in a `width` × `height` box: `d` from its viewBox, stretched as Figma scales a vector network
 * (a box with no width or height keeps that axis's scale 1).
 */
export function fitVectorPath(commands: readonly PathCommand[], box: ViewBox, width: number, height: number): string {
  const sx = box.width ? width / box.width : 1;
  const sy = box.height ? height / box.height : 1;
  return vectorPathData(commands.map((entry) => ({ command: entry.command, points: entry.points.map((point) => ({ x: (point.x - box.x) * sx, y: (point.y - box.y) * sy })) })));
}
