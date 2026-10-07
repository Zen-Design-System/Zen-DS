/**
 * Figma "Ignore auto layout" (layoutPositioning ABSOLUTE) and constraints for the layout primitives (Stack, Grid, Box).
 * Spec: docs/research/studio-position-effects-radius-spec-2026-10-03.md §3.1.
 *
 * Rendering: data attributes (`data-position="absolute"`, `data-constraint-x`, `data-constraint-y`) plus the four edge
 * offsets as the element's own custom properties (`--zen-layout-inset-top|right|bottom|left`, always all four, so a
 * nested absolute child never inherits its parent's). position.css reads them. Unset or `position="static"` renders
 * nothing, so existing pages keep their exact output (the sizing contract, sizing.ts).
 *
 * Offsets are Spacing/Padding tokens only (none … 4xl). There are no negative or percentage offsets: overhangs (status
 * dots, notification badges, a Card sub-action) belong to the components that own them.
 */
import { paddingValue, type ZenPadding } from "../_shared/scale";
import "./position.css";

/** Figma layoutPositioning AUTO | ABSOLUTE, spelled as the CSS keywords (as ActionBar's own `position`). */
export const layoutPositions = ["static", "absolute"] as const;
export type LayoutPosition = (typeof layoutPositions)[number];
/** Figma horizontal constraint MIN | MAX | STRETCH | CENTER. Figma SCALE needs percentages, which are not tokens. */
export const layoutConstraintsX = ["left", "right", "left-right", "center"] as const;
export type LayoutConstraintX = (typeof layoutConstraintsX)[number];
/** Figma vertical constraint MIN | MAX | STRETCH | CENTER. */
export const layoutConstraintsY = ["top", "bottom", "top-bottom", "center"] as const;
export type LayoutConstraintY = (typeof layoutConstraintsY)[number];

export interface LayoutPositionProps {
  /**
   * Figma "Ignore auto layout" (layoutPositioning ABSOLUTE). `"absolute"` takes the element out of its parent's flow
   * and pins it to the parent Stack, Grid, Box or Card with `constraintX` / `constraintY`; siblings, `gap`, `justify`
   * and the parent's Hug size ignore it, as in Figma. Siblings written after it paint above it (Figma auto layout
   * "Last on top"), so put background media first. Default `"static"` (in flow). Only Stack, Grid and Box take it:
   * wrap a Text or a component in a Box. Badges, status dots and a Card sub-action are component props, never insets.
   */
  position?: LayoutPosition;
  /**
   * Figma horizontal constraint, read only with `position="absolute"`: `left` (default, Figma Left) · `right` (Right)
   * · `left-right` (Left & right: stretches between the two offsets, `width` is ignored) · `center` (Center: exact
   * centre, the X offsets are ignored). Figma Scale is not offered (it needs percentages, which are not tokens).
   */
  constraintX?: LayoutConstraintX;
  /**
   * Figma vertical constraint, read only with `position="absolute"`: `top` (default) · `bottom` · `top-bottom`
   * (Top & bottom: stretches between the two offsets, `height` is ignored) · `center` (exact centre).
   */
  constraintY?: LayoutConstraintY;
  /**
   * Offset from the parent's top edge on Spacing/Padding (none 0 · 3xs 2 · 2xs 4 · xs 8 · sm 12 · md 16 · lg 20 ·
   * xl 24 · 2xl 32 · 3xl 40 · 4xl 48; Figma Y snapped to the padding ladder). Read only when `constraintY` pins the
   * top edge (`top`, `top-bottom`). Default none (flush). Measured from the parent's padding box, as Figma ignores the
   * frame's padding for absolute children.
   */
  insetTop?: ZenPadding;
  /** Offset from the parent's right edge on Spacing/Padding. Read only when `constraintX` is `right` or `left-right`. Default none. */
  insetRight?: ZenPadding;
  /** Offset from the parent's bottom edge on Spacing/Padding. Read only when `constraintY` is `bottom` or `top-bottom`. Default none. */
  insetBottom?: ZenPadding;
  /** Offset from the parent's left edge on Spacing/Padding (Figma X snapped to the ladder). Read only when `constraintX` is `left` or `left-right`. Default none. */
  insetLeft?: ZenPadding;
}

/** Prop names owned by the Position section (Studio filters these out of the generic Properties list). */
export const positionPropNames: ReadonlySet<string> = new Set(["position", "constraintX", "constraintY", "insetTop", "insetRight", "insetBottom", "insetLeft"]);

export interface LayoutPositionOutput {
  /** Data attributes to spread on the element; empty unless `position="absolute"`. */
  attributes: Record<`data-${string}`, string>;
  /** The four inset custom properties; empty unless `position="absolute"`. */
  vars: Record<`--${string}`, string>;
}

const inset = (token: ZenPadding | undefined) => paddingValue(token) ?? "0px";

/**
 * Data attributes and custom properties for the position props, the same `{ attributes, vars }` shape as
 * `layoutSizing()`. Unset or static produces nothing; an unknown constraint falls back to left / top.
 */
export function layoutPosition({ position, constraintX, constraintY, insetTop, insetRight, insetBottom, insetLeft }: LayoutPositionProps): LayoutPositionOutput {
  if (position !== "absolute") return { attributes: {}, vars: {} };
  const x = constraintX && (layoutConstraintsX as readonly string[]).includes(constraintX) ? constraintX : "left";
  const y = constraintY && (layoutConstraintsY as readonly string[]).includes(constraintY) ? constraintY : "top";
  return {
    attributes: { "data-position": "absolute", "data-constraint-x": x, "data-constraint-y": y },
    vars: {
      "--zen-layout-inset-top": inset(insetTop),
      "--zen-layout-inset-right": inset(insetRight),
      "--zen-layout-inset-bottom": inset(insetBottom),
      "--zen-layout-inset-left": inset(insetLeft),
    },
  };
}
