/**
 * Figma's gradient fills (linear, radial, angular, diamond) on colour variables only (Zen's rule: a stop is a paint
 * slug, never a raw colour). Spec docs/research/studio-fill-gradient-smoothing-eyedropper-spec-2026-10-22.md §1.
 *
 * Drawn as CSS background layers, the way Figma's default handles place them:
 * - linear: `linear-gradient(angle)`, CSS's angle (0 up, 90 right, 180 down: the default);
 * - radial: an ellipse from the centre to the edges (`closest-side`, Figma's identity transform);
 * - angular: `conic-gradient(from angle)` around the centre (Figma's default starts at 3 o'clock: 90);
 * - diamond: four linear quadrants meeting at the centre, the last stop at the edges' midpoints (CSS has no diamond;
 *   user decision 2026-10-22).
 * A transparent stop comes from a variable that carries alpha: Figma ignores a bound stop's own alpha.
 */
import { fillPaint, type ShapeFill } from "../Shape/paint";

export const gradientTypes = ["linear", "radial", "angular", "diamond"] as const;
export type GradientType = (typeof gradientTypes)[number];

export interface GradientStop {
  /** The stop's colour: a paint slug (a colour variable), as a Shape's `fill`. */
  color: Exclude<ShapeFill, "none">;
  /** Where the stop sits along the gradient, 0–100 %. */
  at: number;
}

export interface ZenGradient {
  /** Figma's gradient type. */
  type: GradientType;
  /** Linear: the CSS angle (0 up, 90 right, 180 down: the default). Angular: where it starts (default 90, 3 o'clock). */
  angle?: number;
  /** Two or more stops, each a colour variable. */
  stops: GradientStop[];
}

export interface GradientFillProps {
  /**
   * A gradient fill (Figma's Linear, Radial, Angular or Diamond paint) whose stops are colour variables (paint slugs, as
   * a Shape's `fill`): it paints over the layer's fill colour (a Shape then has none unless `fill` is given) and under an
   * image fill. Diamond is drawn as four linear quadrants (CSS has none).
   */
  gradient?: ZenGradient;
}

export const gradientPropNames: ReadonlySet<string> = new Set(["gradient"]);

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const clamp = (value: number) => Math.min(100, Math.max(0, value));

/** The stops it can draw, in order: each `var(--zen-…)` and its place in % (an unknown slug is left out). */
export function gradientStops(gradient: ZenGradient | undefined): { paint: string; at: number }[] {
  return (gradient && Array.isArray(gradient.stops) ? gradient.stops : [])
    .map((stop) => ({ paint: fillPaint(stop?.color), at: finite(stop?.at) ? clamp(stop.at) : null }))
    .filter((stop): stop is { paint: string; at: number | null } => Boolean(stop.paint))
    .map((stop, index, all) => ({ ...stop, at: stop.at ?? (all.length > 1 ? (index / (all.length - 1)) * 100 : 0) }))
    .sort((a, b) => a.at - b.at);
}

/** The stops as a CSS list (`var(--zen-…) n%`), scaled; null below two. */
function stopList(gradient: ZenGradient, scale = 1): string | null {
  const stops = gradientStops(gradient);
  if (stops.length < 2) return null;
  return stops.map((stop) => `${stop.paint} ${Math.round(stop.at * scale * 100) / 100}%`).join(", ");
}

/**
 * An SVG shape's gradient (an ellipse, polygon, star or vector: Shape.tsx), in its bounding box: linear along its
 * angle, radial from the centre to the edges. SVG has no angular or diamond paint: those draw radial.
 */
export function svgGradient(gradient: ZenGradient | undefined): { kind: "linear"; x1: number; y1: number; x2: number; y2: number; stops: { paint: string; at: number }[] } | { kind: "radial"; stops: { paint: string; at: number }[] } | null {
  const stops = gradientStops(gradient);
  if (!gradient || stops.length < 2 || !(gradientTypes as readonly string[]).includes(gradient.type)) return null;
  if (gradient.type !== "linear") return { kind: "radial", stops };
  const turn = ((finite(gradient.angle) ? gradient.angle : 180) * Math.PI) / 180;
  const sin = Math.sin(turn), cos = Math.cos(turn);
  // CSS's gradient line, in a unit box: through the centre, as long as the box's projection on it.
  const half = (Math.abs(sin) + Math.abs(cos)) / 2;
  const round = (value: number) => Math.round(value * 10000) / 10000;
  return { kind: "linear", x1: round(0.5 - sin * half), y1: round(0.5 + cos * half), x2: round(0.5 + sin * half), y2: round(0.5 - cos * half), stops };
}

/**
 * The CSS background layers for a gradient: images, sizes, positions and repeats as lists of one layer (four for a
 * diamond). Null when it has fewer than two stops it can draw.
 */
export function gradientLayers(gradient: ZenGradient | undefined): { image: string; size: string; position: string; repeat: string } | null {
  if (!gradient || typeof gradient !== "object" || !(gradientTypes as readonly string[]).includes(gradient.type)) return null;
  if (gradient.type === "diamond") {
    // Each quadrant runs from the centre (its inner corner, 0 %) to its outer corner (100 %); the diamond's edge (the
    // gradient's 100 %) is at the box's edge midpoints, halfway along each quadrant's diagonal: stops at half.
    const stops = stopList(gradient, 0.5);
    if (!stops) return null;
    const quadrant = (to: string) => `linear-gradient(to ${to}, ${stops})`;
    return {
      image: [quadrant("top left"), quadrant("top right"), quadrant("bottom left"), quadrant("bottom right")].join(", "),
      size: "50% 50%, 50% 50%, 50% 50%, 50% 50%",
      position: "left top, right top, left bottom, right bottom",
      repeat: "no-repeat, no-repeat, no-repeat, no-repeat",
    };
  }
  const stops = stopList(gradient);
  if (!stops) return null;
  const angle = finite(gradient.angle) ? gradient.angle : gradient.type === "angular" ? 90 : 180;
  const image = gradient.type === "linear" ? `linear-gradient(${angle}deg, ${stops})`
    : gradient.type === "radial" ? `radial-gradient(closest-side, ${stops})`
    : `conic-gradient(from ${angle}deg, ${stops})`;
  return { image, size: "100% 100%", position: "0 0", repeat: "no-repeat" };
}

/** `data-gradient` and its layers' custom properties (read next to the attribute only, so a child never inherits them). */
export function gradientStyle(gradient: ZenGradient | undefined): { attributes: Record<string, string | undefined>; vars: Record<string, string | undefined> } {
  const layers = gradientLayers(gradient);
  if (!layers) return { attributes: {}, vars: {} };
  return {
    attributes: { "data-gradient": gradient!.type },
    vars: { "--zen-gradient": layers.image, "--zen-gradient-size": layers.size, "--zen-gradient-position": layers.position, "--zen-gradient-repeat": layers.repeat },
  };
}
