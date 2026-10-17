import { useId, useRef, useState, type CSSProperties, type HTMLAttributes, type Ref } from "react";
import { layoutPosition, type LayoutPositionProps } from "../Layout/position";
import { layoutSizing, withSizingVars, type LayoutSizingProps } from "../Layout/sizing";
import { cornerRadiusValue, type CornerRadiusProps } from "../_shared/corners";
import { useMergedRefs } from "../_shared/merge-refs";
import type { ZenCornerRadius } from "../_shared/scale";
import { useIsomorphicLayoutEffect } from "../_shared/use-isomorphic-layout-effect";
import { arrowHeadPath, ellipsePath, isFullArc, normalizeArc, pointsPath, polygonPoints, POLYGON_POINTS, starPoints, STAR_POINTS, STAR_RATIO } from "./geometry";
import { DEFAULT_LINE_STROKE, DEFAULT_SHAPE_FILL, fillPaint, strokePaint, type ShapeFill, type ShapeStroke } from "./paint";
import "./shape.css";

/** Figma's shape tools: Rectangle (R), Ellipse (O), Line (L), Arrow (⇧L), Polygon, Star. */
export const shapeTypes = ["rectangle", "ellipse", "line", "arrow", "polygon", "star"] as const;
export type ShapeType = (typeof shapeTypes)[number];
/** Figma strokeAlign INSIDE | CENTER | OUTSIDE. */
export const shapeStrokeAligns = ["inside", "center", "outside"] as const;
export type ShapeStrokeAlign = (typeof shapeStrokeAligns)[number];

/** Figma's default size for a shape placed with a click (100 × 100). */
export const SHAPE_DEFAULT_SIZE = 100;

export interface ShapeProps extends Omit<HTMLAttributes<HTMLDivElement>, "children">, LayoutSizingProps, LayoutPositionProps, CornerRadiusProps {
  /**
   * The shape, as Figma's shape tools draw it: `rectangle` (default; Figma RECTANGLE), `ellipse` (ELLIPSE, with an arc),
   * `line` (LINE: `width` is its length, `rotation` its angle, no height), `arrow` (a LINE with Figma's "Line arrow" end
   * cap), `polygon` (REGULAR_POLYGON, `pointCount` corners) and `star` (STAR, `pointCount` tips, `starRatio`).
   */
  type?: ShapeType;
  /**
   * Fill: a Color/Background token by its path ("neutral-subtle", "accent-solid", "surface", "support-blue-soft"; list in
   * `shapeFills`), or "none". Default: Background/Support/Neutral/Soft, Figma's light grey; a line or arrow has none.
   */
  fill?: ShapeFill;
  /** Stroke: a Color/Border token by its path ("neutral-solid", "accent-subtle", "support-teal-solid"; `shapeStrokes`), or "none" (default; a line or arrow takes Border/Neutral/Solid). */
  stroke?: ShapeStroke;
  /** Stroke weight in px (Figma strokeWeight). Default 1. */
  strokeWeight?: number;
  /** Where the stroke sits on the edge: `inside` (default, as Figma's shapes), `center` (a line's) or `outside`. */
  strokeAlign?: ShapeStrokeAlign;
  /** Rectangle corner radius on the Corner-Radius tokens (Figma cornerRadius); `radiusTopLeft` … override single corners. */
  radius?: ZenCornerRadius;
  /** Ellipse arc Start in degrees, clockwise from 3 o'clock (Figma's Arc › Start; arcData.startingAngle). Default 0. */
  arcStart?: number;
  /** Ellipse arc Sweep in percent of a full turn (Figma's Arc › Sweep): 100 (default) the whole ellipse, 25 a quarter pie. */
  arcSweep?: number;
  /** Ellipse arc Ratio in percent (Figma's Arc › Ratio; arcData.innerRadius): the hole of a ring or donut. Default 0. */
  arcRatio?: number;
  /** Polygon corners or star tips (Figma Count, 3 … 60). Default 3 for a polygon, 5 for a star. */
  pointCount?: number;
  /** Star inner radius in percent of the outer one (Figma Ratio). Default 38.2. */
  starRatio?: number;
  /** Rotation in degrees, counter-clockwise positive, as Figma's rotation field. Turns the shape about its centre. */
  rotation?: number;
  /** Layer opacity in percent (Figma's layer opacity, 0 … 100). Default 100. */
  opacity?: number;
  /** Accessible name for a shape that means something (a status mark, a chart legend dot); without it the shape is decorative and hidden from assistive tech. */
  label?: string;
  /** Ref to the shape's root element. */
  ref?: Ref<HTMLDivElement>;
}

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isLine = (type: ShapeType) => type === "line" || type === "arrow";
/** A url(#id)-safe id from React's useId. */
const safeId = (id: string) => `zen-shape-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

/** The shape's drawn size: its own px props until it has been measured (a Fill axis), then what it measures. */
function useShapeSize(element: { current: HTMLDivElement | null }, width: unknown, height: unknown, line: boolean) {
  const [size, setSize] = useState(() => ({ width: finite(width) ? width : SHAPE_DEFAULT_SIZE, height: line ? 0 : finite(height) ? height : SHAPE_DEFAULT_SIZE }));
  useIsomorphicLayoutEffect(() => {
    const node = element.current;
    if (!node) return;
    const read = () => {
      const next = { width: node.offsetWidth, height: line ? 0 : node.offsetHeight };
      setSize((current) => (Math.abs(current.width - next.width) < 0.5 && Math.abs(current.height - next.height) < 0.5 ? current : next));
    };
    read();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, [line]);
  return size;
}

/**
 * Zen Shape: Figma's native shapes (Rectangle, Ellipse with its arc, Line, Arrow, Polygon, Star) for illustrations, marks
 * and decoration drawn in Zen Studio. Not a Figma library component: it maps to Figma's own nodes (RECTANGLE, ELLIPSE
 * with arcData, LINE, REGULAR_POLYGON, STAR) on export and import. Colours are Zen tokens only (`fill` from
 * Color/Background, `stroke` from Color/Border); the rectangle's radius takes the Corner-Radius tokens. It sizes and
 * places like a layout primitive: `width` / `height` (px or fill) and Figma's position props (in a free frame:
 * `position="absolute"` with px insets).
 */
export function Shape({
  type = "rectangle",
  fill,
  stroke,
  strokeWeight = 1,
  strokeAlign,
  radius,
  radiusTopLeft,
  radiusTopRight,
  radiusBottomRight,
  radiusBottomLeft,
  arcStart,
  arcSweep,
  arcRatio,
  pointCount,
  starRatio,
  rotation,
  opacity,
  label,
  width,
  height,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  alignSelf,
  position,
  constraintX,
  constraintY,
  insetTop,
  insetRight,
  insetBottom,
  insetLeft,
  className,
  style,
  ref,
  ...rest
}: ShapeProps) {
  const kind: ShapeType = (shapeTypes as readonly string[]).includes(type) ? type : "rectangle";
  const line = isLine(kind);
  const node = useRef<HTMLDivElement | null>(null);
  const merged = useMergedRefs(node, ref);
  const size = useShapeSize(node, width, height, line);
  const id = safeId(useId());
  const sizing = layoutSizing({ width, height: line ? undefined : height, minWidth, maxWidth, minHeight, maxHeight, alignSelf });
  const placed = layoutPosition({ position, constraintX, constraintY, insetTop, insetRight, insetBottom, insetLeft });
  const fillColor = fillPaint(fill ?? (line ? "none" : DEFAULT_SHAPE_FILL));
  const strokeColor = strokePaint(stroke ?? (line ? DEFAULT_LINE_STROKE : "none"));
  const weight = finite(strokeWeight) ? Math.max(0, strokeWeight) : 1;
  const align: ShapeStrokeAlign = line ? "center" : strokeAlign && (shapeStrokeAligns as readonly string[]).includes(strokeAlign) ? strokeAlign : "inside";
  const vars: Record<string, string | number | undefined> = {
    ...sizing.vars,
    ...placed.vars,
    "--zen-shape-fill": fillColor,
    "--zen-shape-stroke": strokeColor,
    "--zen-shape-stroke-weight": strokeColor && weight ? `${weight}px` : undefined,
    "--zen-shape-radius": kind === "rectangle" ? cornerRadiusValue(radius, { radiusTopLeft, radiusTopRight, radiusBottomRight, radiusBottomLeft }) : undefined,
    "--zen-shape-default-width": finite(width) ? undefined : `${SHAPE_DEFAULT_SIZE}px`,
    opacity: finite(opacity) ? Math.min(100, Math.max(0, opacity)) / 100 : undefined,
    transform: finite(rotation) && rotation % 360 !== 0 ? `rotate(${-rotation}deg)` : undefined,
  };
  const shown = Object.fromEntries(Object.entries(vars).filter(([, value]) => value !== undefined)) as CSSProperties;
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const };

  let drawing = null;
  if (kind !== "rectangle") {
    const w = Math.max(0, size.width);
    const h = Math.max(0, size.height);
    let d = "";
    if (kind === "ellipse") d = ellipsePath(w, h, normalizeArc({ start: arcStart, sweep: arcSweep, ratio: arcRatio }));
    else if (kind === "polygon") d = pointsPath(polygonPoints(w, h, pointCount ?? POLYGON_POINTS));
    else if (kind === "star") d = pointsPath(starPoints(w, h, pointCount ?? STAR_POINTS, starRatio ?? STAR_RATIO));
    const stroked = Boolean(strokeColor && weight);
    if (line) {
      const pad = Math.max(weight, kind === "arrow" ? Math.max(6, weight * 4) * 0.75 + weight : weight) + 1;
      drawing = (
        <svg className="zen-shape__drawing" data-line="true" viewBox={`0 ${-pad} ${w} ${pad * 2}`} width={w} height={pad * 2} style={{ top: -pad }} focusable="false" aria-hidden="true">
          {stroked ? <path d={`M 0 0 L ${w} 0${kind === "arrow" ? ` ${arrowHeadPath({ x: w, y: 0 }, weight)}` : ""}`} fill="none" stroke="var(--zen-shape-stroke)" strokeWidth={weight} strokeLinejoin="miter" /> : null}
        </svg>
      );
    } else {
      // Inside and outside strokes: a stroke twice as wide, cut to the shape (inside) or to what lies outside it.
      const doubled = align === "center" ? weight : weight * 2;
      const evenOdd = kind === "ellipse" && !isFullArc(normalizeArc({ start: arcStart, sweep: arcSweep, ratio: arcRatio })) ? "evenodd" : "nonzero";
      drawing = (
        <svg className="zen-shape__drawing" viewBox={`0 0 ${w || 1} ${h || 1}`} width={w} height={h} focusable="false" aria-hidden="true">
          {stroked && align !== "center" ? (
            <defs>
              {align === "inside" ? (
                <clipPath id={`${id}-cut`}>
                  <path d={d} clipRule={evenOdd} />
                </clipPath>
              ) : (
                <mask id={`${id}-cut`} maskUnits="userSpaceOnUse" x={-doubled} y={-doubled} width={w + doubled * 2} height={h + doubled * 2}>
                  <rect x={-doubled} y={-doubled} width={w + doubled * 2} height={h + doubled * 2} fill="white" />
                  <path d={d} fill="black" fillRule={evenOdd} />
                </mask>
              )}
            </defs>
          ) : null}
          {d && fillColor ? <path d={d} fill="var(--zen-shape-fill)" fillRule={evenOdd} /> : null}
          {d && stroked ? (
            <path
              d={d}
              fill="none"
              stroke="var(--zen-shape-stroke)"
              strokeWidth={doubled}
              strokeLinejoin="miter"
              clipPath={align === "inside" ? `url(#${id}-cut)` : undefined}
              mask={align === "outside" ? `url(#${id}-cut)` : undefined}
            />
          ) : null}
        </svg>
      );
    }
  }

  return (
    <div
      {...rest}
      {...a11y}
      ref={merged}
      className={["zen-shape", className].filter(Boolean).join(" ")}
      data-type={kind}
      data-stroke-align={strokeColor && weight ? align : undefined}
      {...sizing.attributes}
      {...placed.attributes}
      style={withSizingVars(style, shown as Record<`--${string}`, string>)}
    >
      {drawing}
    </div>
  );
}
