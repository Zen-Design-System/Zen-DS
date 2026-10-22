// Zen Studio ↔ Figma: gradient fills (Studio parity, spec docs/research/studio-fill-gradient-smoothing-eyedropper-spec-2026-10-22.md
// §1; library src/components/_shared/gradient.ts). The push gives a shape or frame node `gradientFill`:
//   { type: "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND", angle?: number (CSS degrees),
//     stops: [{ position: 0–1, color: "Color/Background/…" (a colour variable) }] }
// and the importer (Zen plugin) and the direct paste (figma-native.mjs) a gradient paint whose stops are bound to those
// variables, its gradientTransform from `gradientTransform` below with the layer's own size. The pull reads the paint
// back (READ_GRADIENT_FILL) and gives the `gradient` prop again; a stop on a raw colour or a variable outside the paint
// palette is named in a note. Pure: `node src/components/_shared/gradient.selftest.mjs`.
//
// Figma's gradientTransform maps the layer's normalized box (u, v in 0–1) to the gradient's space: the gradient's
// position is t = m00·u + m01·v + m02 (measured in the Zen file, 2026-10-22):
// - linear: identity runs left → right (CSS 90deg); CSS draws its line through the centre, as long as the box's
//   projection on it, so for an angle θ in a w × h box: m00 = w·sinθ / L, m01 = −h·cosθ / L, L = |w·sinθ| + |h·cosθ|;
// - radial: identity is the ellipse from the centre to the edge midpoints (CSS `closest-side`);
// - angular: identity starts at 3 o'clock and turns clockwise (CSS `conic-gradient(from 90deg)`); another start turns
//   the matrix about the centre;
// - diamond: identity reaches the edge midpoints (drawn as four linear quadrants; gradient.ts).
import { shapeFillTokens } from "../../src/components/Shape/paint.ts";

const TYPES = { linear: "GRADIENT_LINEAR", radial: "GRADIENT_RADIAL", angular: "GRADIENT_ANGULAR", diamond: "GRADIENT_DIAMOND" };
const KINDS = Object.fromEntries(Object.entries(TYPES).map(([kind, type]) => [type, kind]));
const SLUG_OF = new Map(Object.entries(shapeFillTokens).map(([slug, variable]) => [variable, slug]));
const IDENTITY = [[1, 0, 0], [0, 1, 0]];

const finite = (value) => typeof value === "number" && Number.isFinite(value);
const round = (value, step = 10000) => Math.round(value * step) / step || 0;
const radians = (degrees) => (degrees * Math.PI) / 180;
/** An angle in [0, 360), to a tenth of a degree. */
const normal = (degrees) => { const turn = round(((degrees % 360) + 360) % 360, 10); return turn === 360 ? 0 : turn; };

/** An element's plain value of a prop (a literal, an array or an object of them). */
function plainOf(value) {
  if (!value) return undefined;
  if (value.kind === "literal") return value.value;
  if (value.kind === "array") return value.items.map(plainOf);
  if (value.kind === "object") return Object.fromEntries(Object.entries(value.fields).map(([name, field]) => [name, plainOf(field)]));
  return undefined;
}

/**
 * Figma's gradientTransform for a gradient type at a CSS angle in a w × h layer: the matrix that draws what
 * gradient.ts's CSS draws. Radial and diamond take no angle (Figma's defaults); an empty box counts as a square.
 */
export function gradientTransform(type, angle, width = 100, height = 100) {
  const kind = KINDS[type] ?? type;
  if (kind === "linear") {
    const w = width > 0 ? width : 1, h = height > 0 ? height : 1;
    const turn = radians(finite(angle) ? angle : 180);
    const sin = Math.sin(turn), cos = Math.cos(turn);
    const length = Math.abs(w * sin) + Math.abs(h * cos);
    const a = (w * sin) / length, b = (-h * cos) / length;
    // Row 1 is the perpendicular (Figma needs the matrix invertible; a linear paint does not read it).
    return [[round(a), round(b), round(0.5 - a / 2 - b / 2)], [round(-b), round(a), round(0.5 + b / 2 - a / 2)]];
  }
  if (kind === "angular" && finite(angle) && normal(angle - 90) !== 0) {
    const turn = radians(angle - 90);
    const cos = Math.cos(turn), sin = Math.sin(turn);
    return [[round(cos), round(sin), round(0.5 - cos / 2 - sin / 2)], [round(-sin), round(cos), round(0.5 + sin / 2 - cos / 2)]];
  }
  return IDENTITY.map((row) => [...row]);
}

/**
 * The CSS angle a gradient paint's transform draws (linear: its direction in a w × h layer; angular: where it starts),
 * and whether it is the one the CSS draws (`exact`: through the centre, as long as the box's projection; false when
 * its handles were moved in Figma).
 */
export function gradientAngle(type, transform, width = 100, height = 100) {
  const kind = KINDS[type] ?? type;
  const matrix = Array.isArray(transform) && transform.length === 2 && transform.every((row) => Array.isArray(row) && row.length === 3 && row.every(finite)) ? transform : null;
  if (!matrix) return { angle: undefined, exact: true };
  const near = (a, b) => a.every((row, r) => row.every((value, c) => Math.abs(value - b[r][c]) < 0.01));
  if (kind === "linear") {
    const w = width > 0 ? width : 1, h = height > 0 ? height : 1;
    const angle = normal((Math.atan2(matrix[0][0] / w, -matrix[0][1] / h) * 180) / Math.PI);
    const expected = gradientTransform("linear", angle, w, h);
    return { angle, exact: near([matrix[0]], [expected[0]]) };
  }
  if (kind === "angular") {
    const angle = normal(90 + (Math.atan2(matrix[0][1], matrix[0][0]) * 180) / Math.PI);
    return { angle: angle === 90 ? undefined : angle, exact: near(matrix, gradientTransform("angular", angle)) };
  }
  return { angle: undefined, exact: near(matrix, IDENTITY) };
}

/** The `gradientFill` of a Shape or frame element (its `gradient` prop), or null without two stops on colour variables. */
export function gradientFillOf(element) {
  const gradient = plainOf(element?.props?.gradient);
  if (!gradient || typeof gradient !== "object" || !TYPES[gradient.type] || !Array.isArray(gradient.stops)) return null;
  const stops = gradient.stops
    .map((stop, index, all) => ({ color: shapeFillTokens[stop?.color], at: finite(stop?.at) ? Math.min(100, Math.max(0, stop.at)) : all.length > 1 ? (index / (all.length - 1)) * 100 : 0 }))
    .filter((stop) => stop.color)
    .sort((a, b) => a.at - b.at)
    .map((stop) => ({ position: round(stop.at / 100), color: stop.color }));
  if (stops.length < 2) return null;
  const angle = gradient.type === "linear" ? (finite(gradient.angle) ? normal(gradient.angle) : 180) : gradient.type === "angular" && finite(gradient.angle) ? normal(gradient.angle) : undefined;
  return { type: TYPES[gradient.type], ...(angle !== undefined ? { angle } : {}), stops };
}

/**
 * The `gradient` prop a pulled node's `gradientFill` (READ_GRADIENT_FILL) writes, as the pull's object value, and the
 * notes for what cannot come back: a stop on a raw colour or on a variable outside the paint palette (left out), handles
 * moved off Figma's defaults (drawn at its angle across the layer).
 */
export function gradientFillProps(fill, literal) {
  if (!fill || typeof fill !== "object" || !KINDS[fill.type]) return { props: {}, notes: [] };
  const notes = [];
  const kind = KINDS[fill.type];
  const stops = (Array.isArray(fill.stops) ? fill.stops : []).flatMap((stop) => {
    const slug = typeof stop?.color === "string" ? SLUG_OF.get(stop.color) : undefined;
    if (!slug) {
      notes.push(stop?.color ? `its gradient stop on ${stop.color} is left out: a gradient takes the fill colours (Color/Background)` : "its gradient stop on a raw colour is left out: bind it to a colour variable in Figma");
      return [];
    }
    return [{ color: slug, at: finite(stop.position) ? round(stop.position * 100, 100) : 0 }];
  });
  if (stops.length < 2) {
    notes.push(`its ${kind} gradient is left out: it needs two stops on colour variables`);
    return { props: {}, notes };
  }
  // The read gives the paint's transform; the push's own JSON (the round trip) its angle.
  const { angle, exact } = fill.transform ? gradientAngle(fill.type, fill.transform, fill.width, fill.height) : { angle: finite(fill.angle) && !(kind === "angular" && normal(fill.angle) === 90) ? normal(fill.angle) : undefined, exact: true };
  if (!exact) notes.push(kind === "linear" || kind === "angular" ? `its ${kind} gradient's handles were moved in Figma: drawn at ${angle}° across the layer` : `its ${kind} gradient's handles were moved in Figma: drawn from the centre to the edges`);
  const fields = { type: literal(kind) };
  if (angle !== undefined && !(kind === "linear" && angle === 180)) fields.angle = literal(angle);
  fields.stops = { kind: "array", items: stops.map((stop) => ({ kind: "object", fields: { color: literal(stop.color), at: literal(stop.at) } })) };
  return { props: { gradient: { kind: "object", fields } }, notes };
}

/**
 * The reader's lines (figma-pull figmaReadCode, run in Figma): a node's first visible gradient paint as `gradientFill`,
 * each stop's colour variable by name (the reader's variableName; null for a raw colour) and the layer's size (a linear gradient's angle depends
 * on it). Every property is read behind `in` (Figma throws on one a node type lacks).
 */
export const READ_GRADIENT_FILL = `
const readGradientFill = async (node) => {
  const fills = "fills" in node ? node.fills : null;
  const paint = Array.isArray(fills) ? fills.find((fill) => String(fill.type).indexOf("GRADIENT_") === 0 && fill.visible !== false) : null;
  if (!paint) return null;
  const stops = await Promise.all((paint.gradientStops || []).map(async (stop) => ({
    position: stop.position,
    color: await variableName(stop.boundVariables && stop.boundVariables.color && stop.boundVariables.color.id),
  })));
  const t = paint.gradientTransform;
  return { type: paint.type, transform: Array.isArray(t) ? [[t[0][0], t[0][1], t[0][2]], [t[1][0], t[1][1], t[1][2]]] : null, stops, width: node.width, height: node.height };
};
`;
