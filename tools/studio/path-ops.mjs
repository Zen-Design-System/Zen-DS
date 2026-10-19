// Zen Studio path operations (plan docs/research/studio-f9-vectors-spec-2026-10-19.md F9b): Figma's boolean groups
// (Union, Subtract, Intersect, Exclude), Flatten and Outline stroke on Zen Shapes, computed with Skia's PathOps
// (pathkit-wasm, the user's pick 2026-10-19). Isomorphic and import-light: the PathKit instance is passed in as `kit`
// (the Studio loads it in the browser, draw/pathKit.ts; the selftest in Node with its wasm file).
//
//   shapeOutline(props)                     → path data of a Shape's fill in its own box (0,0 … w,h), or null
//   placedPath(kit, props)                  → an SkPath of that outline in its parent's px (insets, rotation, flip)
//   booleanResult(kit, operation, operands) → { d, fillRule } of a boolean group, in its own px, or null
//   flattenResult(kit, layers)              → { x, y, width, height, d } of several shapes as one vector, or null
//   outlineStrokeResult(kit, props)         → { x, y, width, height, d } of a shape's stroke as a filled vector, or null
//   planBooleans(kit, text, { components }) → [{ loc, name, ops }]: the first boolean group whose written result is stale
//
// A layer's props are the dialect's literal values ({ type: "ellipse", width: 60, … }). Figma's boolean order: the
// first shape (bottom-most) is the base Subtract keeps; Exclude is XOR; every result is simplified.

import { ellipsePath, fitVectorPath, normalizeArc, parseVectorPath, parseViewBox, pointsPath, polygonPoints, POLYGON_POINTS, starPoints, STAR_POINTS, STAR_RATIO, vectorBounds, vectorPathData } from "../../src/components/Shape/geometry.ts";
import { parsePage } from "./dialect.mjs";

/** A rectangle's Corner-Radius step → px (Rounded mode, as figma-push writes it); full: half the shorter side. */
const RADIUS_PX = { none: 0, "2xs": 2, "2xsmall": 2, xs: 4, xsmall: 4, sm: 8, small: 8, md: 12, medium: 12, base: 12, lg: 16, large: 16, xl: 20, xlarge: 20, "2xl": 24, "2xlarge": 24, "3xl": 28, "3xlarge": 28, full: Infinity };
const OPS = { union: "UNION", subtract: "DIFFERENCE", intersect: "INTERSECT", exclude: "XOR" };
const num = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const round = (value) => Math.round(value * 1000) / 1000;
const round2 = (value) => Math.round(value * 100) / 100;

/** A Shape's fill outline in its own box (0,0 … w,h) as path data; null for a line, an arrow or an unknown size. */
export function shapeOutline(props) {
  const type = props.type ?? "rectangle";
  const w = num(props.width);
  const h = num(props.height);
  if (w === null || h === null) return null;
  if (type === "rectangle") {
    const r = Math.min(RADIUS_PX[String(props.radius ?? "none")] ?? 0, w / 2, h / 2);
    if (!r) return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
    return `M ${r} 0 L ${w - r} 0 A ${r} ${r} 0 0 1 ${w} ${r} L ${w} ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 0 ${h - r} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
  }
  if (type === "ellipse") return ellipsePath(w, h, normalizeArc({ start: props.arcStart, sweep: props.arcSweep, ratio: props.arcRatio }));
  if (type === "polygon") return pointsPath(polygonPoints(w, h, num(props.pointCount) ?? POLYGON_POINTS));
  if (type === "star") return pointsPath(starPoints(w, h, num(props.pointCount) ?? STAR_POINTS, num(props.starRatio) ?? STAR_RATIO));
  if (type === "vector" || type === "boolean") {
    const commands = parseVectorPath(typeof props.d === "string" ? props.d : "");
    const box = commands ? parseViewBox(props.viewBox) ?? vectorBounds(commands) : null;
    return commands && box ? fitVectorPath(commands, box, w, h) : null;
  }
  return null;
}

/** The 2D matrix (a b c / d e f) that places a layer's own box in its parent: its insets, then its turn and flip about its centre. */
function placement(props) {
  const w = num(props.width) ?? 0;
  const h = num(props.height) ?? 0;
  const left = num(props.insetLeft) ?? 0;
  const top = num(props.insetTop) ?? 0;
  // CSS turns clockwise (Shape writes rotate: -rotation), y down; the flip scales first (the individual transforms' order).
  const turn = (-(num(props.rotation) ?? 0) * Math.PI) / 180;
  const sx = props.flip === "horizontal" || props.flip === "both" ? -1 : 1;
  const sy = props.flip === "vertical" || props.flip === "both" ? -1 : 1;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const a = cos * sx;
  const b = -sin * sy;
  const d = sin * sx;
  const e = cos * sy;
  const cx = w / 2;
  const cy = h / 2;
  return [a, b, left + cx - a * cx - b * cy, d, e, top + cy - d * cx - e * cy];
}

/** A layer's outline as an SkPath in its parent's px, or null (no fill outline). The caller deletes it. */
export function placedPath(kit, props) {
  const outline = shapeOutline(props);
  if (!outline) return null;
  const path = kit.FromSVGString(outline);
  if (!path) return null;
  if ((props.type === "vector" || props.type === "boolean") && props.fillRule === "evenodd") path.setFillType(kit.FillType.EVENODD);
  const [a, b, c, d, e, f] = placement(props);
  path.transform(a, b, c, d, e, f, 0, 0, 1);
  return path;
}

/** PathKit's SVG string as Zen writes a vector's path (absolute M / L / Q / C / Z, numbers to 3 places). */
const tidy = (svg) => {
  const commands = parseVectorPath(svg);
  return commands ? vectorPathData(commands) : "";
};

/**
 * A boolean group's result in its own px (its shapes' insets are inside it): `d` and its fill rule. Null when none of
 * its shapes has an outline.
 */
export function booleanResult(kit, operation, operands) {
  const paths = operands.map((props) => placedPath(kit, props)).filter(Boolean);
  if (!paths.length) return null;
  const result = paths[0].copy();
  const op = kit.PathOp[OPS[operation] ?? OPS.union];
  for (const next of paths.slice(1)) result.op(next, op);
  result.simplify();
  const d = tidy(result.toSVGString());
  const fillRule = String(result.getFillTypeString?.() ?? "").toLowerCase().includes("evenodd") ? "evenodd" : "nonzero";
  paths.forEach((path) => path.delete());
  result.delete();
  return { d, fillRule };
}

/** `path`'s tight bounds and its data moved to start there: a new vector's box in its parent and its `d`. */
function asLayer(path) {
  const bounds = path.computeTightBounds();
  const x = round2(bounds.fLeft);
  const y = round2(bounds.fTop);
  path.transform(1, 0, -x, 0, 1, -y, 0, 0, 1);
  const d = tidy(path.toSVGString());
  return d ? { x, y, width: round2(bounds.fRight - bounds.fLeft), height: round2(bounds.fBottom - bounds.fTop), d } : null;
}

/** Figma's Flatten (⌘E): several layers' outlines in one vector (not combined: their paths side by side), in their parent's px. */
export function flattenResult(kit, layers) {
  const paths = layers.map((props) => placedPath(kit, props)).filter(Boolean);
  if (!paths.length) return null;
  const out = kit.NewPath();
  for (const path of paths) out.addPath(path);
  const layer = asLayer(out);
  paths.forEach((path) => path.delete());
  out.delete();
  return layer;
}

/**
 * Figma's Outline stroke (⌥⌘O): a layer's stroke as a filled vector in its parent's px — centred on its path, or cut to
 * inside / outside its fill as its stroke sits; a line or an arrow strokes its segment. Null without a stroke.
 */
export function outlineStrokeResult(kit, props) {
  const weight = num(props.strokeWeight) ?? 1;
  if (!weight) return null;
  const line = props.type === "line" || props.type === "arrow";
  const w = num(props.width);
  const source = line && w !== null ? `M 0 0 L ${w} 0` : shapeOutline(props);
  if (!source) return null;
  const align = line ? "center" : props.strokeAlign ?? (props.type === "vector" ? "center" : "inside");
  const placed = { ...props, height: line ? 0 : props.height };
  const [a, b, c, d, e, f] = placement(placed);
  const base = kit.FromSVGString(source);
  const stroke = base.copy().stroke({ width: align === "center" ? weight : weight * 2, join: kit.StrokeJoin.MITER, cap: kit.StrokeCap.BUTT });
  if (align === "inside") stroke.op(base, kit.PathOp.INTERSECT);
  else if (align === "outside") stroke.op(base, kit.PathOp.DIFFERENCE);
  stroke.simplify();
  stroke.transform(a, b, c, d, e, f, 0, 0, 1);
  const layer = asLayer(stroke);
  base.delete();
  stroke.delete();
  return layer;
}

/** A layer's literal props ({ name: value }), as the dialect reads them. */
const literals = (node) => Object.fromEntries(Object.entries(node.props ?? {}).filter(([, value]) => value?.kind === "literal").map(([name, value]) => [name, value.value]));

function* booleans(node) {
  for (const child of node.children ?? []) {
    if (child.kind !== "element") continue;
    yield* booleans(child);
    if (child.name === "Shape" && child.props?.type?.kind === "literal" && child.props.type.value === "boolean") yield child;
  }
}

/**
 * The first boolean group of a page whose written result (`d`, `viewBox`, `fillRule`) is not its shapes' combined outline
 * now, as the edit that writes it: [{ loc, name: "Shape", ops }]; [] when every one is up to date. Inner groups come first
 * (a group's shape may be a group), so a round per group settles a page.
 */
export function planBooleans(kit, text, { components } = {}) {
  const tree = parsePage(text, { components });
  if (!tree.board) return [];
  for (const node of booleans(tree.board)) {
    const own = literals(node);
    const width = num(own.width);
    const height = num(own.height);
    if (width === null || height === null) continue;
    const operands = (node.children ?? []).filter((child) => child.kind === "element" && child.name === "Shape").map(literals);
    const result = booleanResult(kit, own.operation ?? "union", operands);
    const d = result?.d ?? "";
    const viewBox = `0 0 ${round(width)} ${round(height)}`;
    const ops = [];
    if (own.d !== d && (d || own.d !== undefined)) ops.push(d ? { op: "setProp", name: "d", value: { kind: "string", value: d } } : { op: "removeProp", name: "d" });
    if (own.viewBox !== viewBox) ops.push({ op: "setProp", name: "viewBox", value: { kind: "string", value: viewBox } });
    const rule = result?.fillRule === "evenodd" ? "evenodd" : undefined;
    if (own.fillRule !== rule) ops.push(rule ? { op: "setProp", name: "fillRule", value: { kind: "string", value: rule } } : { op: "removeProp", name: "fillRule" });
    if (ops.length) return [{ loc: node.loc, name: "Shape", ops }];
  }
  return [];
}
