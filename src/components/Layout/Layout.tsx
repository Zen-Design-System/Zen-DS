import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { gapValue, paddingValue, type ZenCornerRadius, type ZenGap, type ZenPadding } from "../_shared/scale";
import "./layout.css";
import { layoutSizing, type LayoutSizingProps } from "./sizing";
import { layoutPosition, type LayoutPositionProps } from "./position";
import { boxEffects, type BoxEffectProps } from "./effects";
import { cornerRadiusValue, type CornerRadiusProps } from "../_shared/corners";

export type { ZenCornerRadius, ZenGap, ZenPadding };
export { layoutAlignSelfValues, type LayoutAlignSelf, type LayoutSizing, type LayoutSizingProps, type LayoutWidthProps } from "./sizing";
export { layoutConstraintsX, layoutConstraintsY, layoutPositions, positionPropNames, type LayoutConstraintX, type LayoutConstraintY, type LayoutPosition, type LayoutPositionProps } from "./position";
export { boxEffectStyles, effectPropNames, type BoxEffectProps, type BoxEffectStyle } from "./effects";
export { cornerRadiusPropNames, radiusPropNames, type CornerRadiusProps } from "../_shared/corners";

export const layoutElements = ["div", "section", "article", "aside", "header", "footer", "main", "nav", "form", "fieldset", "ul", "ol", "li"] as const;
export type LayoutElement = (typeof layoutElements)[number];

type Vars = CSSProperties & Record<`--${string}`, string | number | undefined>;
// Custom properties inherit: a nested Stack/Box must reset its own padding, or it would pick up its parent's.
const own = (value: string | undefined) => value ?? "0px";
const withVars = (style: CSSProperties | undefined, vars: Record<`--${string}`, string | number | undefined>): CSSProperties =>
  ({ ...Object.fromEntries(Object.entries(vars).filter(([, value]) => value !== undefined)), ...style }) as Vars;

/* ───────────── Stack ───────────── */

export interface StackProps extends HTMLAttributes<HTMLElement>, LayoutSizingProps, LayoutPositionProps {
  /** column (default) stacks top to bottom; row lays items side by side. */
  direction?: "column" | "row";
  /** Space between items (Figma Spacing/Gap). Default md (16px). */
  gap?: ZenGap;
  /**
   * Cross-axis alignment. Default: rows center their items; columns stretch fields, cards and lists to the full width
   * while buttons, chips, badges, tags and avatars keep their own width (pass `align="stretch"` to stretch those too,
   * e.g. full-width buttons in a mobile footer).
   */
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  /** Main-axis distribution. `between` pushes the first and last items to the edges. */
  justify?: "start" | "center" | "end" | "between" | "around";
  /** Let row items wrap onto new lines. */
  wrap?: boolean;
  /**
   * Every child takes an equal share along the direction (Figma: all children Fill container), for children that have
   * no sizing props of their own (Button, Input, Card… but also a Divider or an Icon: wrap those in `<Box width="hug">`).
   * A child's own `width` (row) or `height` (column) wins; in a row children keep their own minimum width (a Button
   * never shrinks below its label). A column shares equally only when its height is Fixed or Fill (Buttons get
   * taller); with only a maxHeight the children keep their content height and shrink once it caps; without a height
   * they keep their content height.
   */
  fillChildren?: boolean;
  /** Space inside the stack (Figma Spacing/Padding). */
  padding?: ZenPadding;
  /** Horizontal padding (overrides `padding` on the sides). */
  paddingX?: ZenPadding;
  /** Vertical padding (overrides `padding` top and bottom), e.g. page content inside a Container that already has side margins. */
  paddingY?: ZenPadding;
  as?: LayoutElement;
  children?: ReactNode;
}

/**
 * One-dimensional layout with token spacing. Use it instead of hand-written flex CSS.
 *
 *   <Stack gap="lg">…sections…</Stack>
 *   <Stack direction="row" gap="sm" align="center" justify="between">…toolbar…</Stack>
 */
export const Stack = forwardRef<HTMLElement, StackProps>(function Stack(
  { direction = "column", gap = "md", align, justify, wrap = false, fillChildren = false, padding, paddingX, paddingY, width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf, position, constraintX, constraintY, insetTop, insetRight, insetBottom, insetLeft, as: Element = "div", className, style, children, ...rest },
  ref,
) {
  const sizing = layoutSizing({ width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf });
  const placed = layoutPosition({ position, constraintX, constraintY, insetTop, insetRight, insetBottom, insetLeft });
  return (
    <Element
      {...rest}
      ref={ref as never}
      className={["zen-stack", className].filter(Boolean).join(" ")}
      data-direction={direction}
      data-align={align ?? (direction === "row" ? "center" : undefined)}
      data-justify={justify}
      data-wrap={wrap ? "true" : undefined}
      data-fill-children={fillChildren ? "true" : undefined}
      data-padded={(paddingX ?? padding) && (paddingX ?? padding) !== "none" ? "true" : undefined}
      {...sizing.attributes}
      {...placed.attributes}
      style={withVars(style, { "--zen-stack-gap": gapValue(gap), "--zen-stack-padding-block": own(paddingValue(paddingY ?? padding)), "--zen-stack-padding-inline": own(paddingValue(paddingX ?? padding)), ...sizing.vars, ...placed.vars })}
    >
      {children}
    </Element>
  );
});

/* ───────────── Grid ───────────── */

/** A column count (equal columns) or a CSS track list for unequal ones ("2fr 1fr", "minmax(0, 1fr) 320px"). */
export type GridTracks = number | string;
export type GridColumns = GridTracks | { mobile?: GridTracks; tablet?: GridTracks; desktop?: GridTracks };

export interface GridProps extends HTMLAttributes<HTMLElement>, LayoutSizingProps, LayoutPositionProps {
  /**
   * Fixed column count, or per breakpoint (`{ mobile: 1, tablet: 2, desktop: 3 }`, following ZenProvider's
   * breakpoint). A string is a track list for unequal columns: `{ mobile: 1, desktop: "2fr 1fr" }` puts a main column
   * next to an aside. Omit it to fit as many `minColumnWidth` columns as the width allows.
   */
  columns?: GridColumns;
  /** Responsive auto-fill: every column is at least this wide (px or CSS length). Default 240. */
  minColumnWidth?: number | string;
  /** Space between cells. Default md (16px). */
  gap?: ZenGap;
  rowGap?: ZenGap;
  columnGap?: ZenGap;
  /** Vertical alignment of cells. Default stretch (equal-height cards). */
  align?: "start" | "center" | "end" | "stretch";
  padding?: ZenPadding;
  as?: LayoutElement;
  children?: ReactNode;
}

/** grid-template-columns for a column count (equal, shrinkable columns) or a track list as written. */
const tracks = (value: GridTracks | undefined) => (value === undefined ? undefined : typeof value === "number" ? `repeat(${value}, minmax(0, 1fr))` : value);

/**
 * Two-dimensional layout for cards, tiles and form columns.
 *
 *   <Grid minColumnWidth={280}>…cards…</Grid>
 *   <Grid columns={{ mobile: 1, desktop: 2 }} gap="lg">…fields…</Grid>
 *   <Grid columns={{ mobile: 1, desktop: "2fr 1fr" }} gap="lg" align="start">…main…aside…</Grid>
 */
export const Grid = forwardRef<HTMLElement, GridProps>(function Grid(
  { columns, minColumnWidth = 240, gap = "md", rowGap, columnGap, align, padding, width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf, position, constraintX, constraintY, insetTop, insetRight, insetBottom, insetLeft, as: Element = "div", className, style, children, ...rest },
  ref,
) {
  const sizing = layoutSizing({ width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf });
  const placed = layoutPosition({ position, constraintX, constraintY, insetTop, insetRight, insetBottom, insetLeft });
  const perBreakpoint = typeof columns === "object" ? columns : undefined;
  const fixed = typeof columns === "object" ? undefined : columns;
  const desktop = tracks(fixed ?? perBreakpoint?.desktop ?? perBreakpoint?.tablet ?? perBreakpoint?.mobile);
  const min = typeof minColumnWidth === "number" ? `${minColumnWidth}px` : minColumnWidth;
  return (
    <Element
      {...rest}
      ref={ref as never}
      className={["zen-grid", className].filter(Boolean).join(" ")}
      data-mode={desktop === undefined ? "fill" : perBreakpoint ? "responsive" : "fixed"}
      data-align={align}
      {...sizing.attributes}
      {...placed.attributes}
      style={withVars(style, {
        "--zen-grid-min": min,
        "--zen-grid-cols": desktop,
        "--zen-grid-cols-tablet": perBreakpoint ? tracks(perBreakpoint.tablet) ?? desktop : undefined,
        "--zen-grid-cols-mobile": perBreakpoint ? tracks(perBreakpoint.mobile ?? perBreakpoint.tablet) ?? desktop : undefined,
        "--zen-grid-row-gap": gapValue(rowGap ?? gap),
        "--zen-grid-column-gap": gapValue(columnGap ?? gap),
        "--zen-grid-padding": own(paddingValue(padding)),
        ...sizing.vars,
        ...placed.vars,
      })}
    >
      {children}
    </Element>
  );
});

/* ───────────── Box ───────────── */

export const boxSurfaces = ["none", "surface", "surface-alt", "subtle", "pale"] as const;
export type BoxSurface = (typeof boxSurfaces)[number];

export interface BoxProps extends HTMLAttributes<HTMLElement>, LayoutSizingProps, LayoutPositionProps, BoxEffectProps, CornerRadiusProps {
  padding?: ZenPadding;
  paddingX?: ZenPadding;
  paddingY?: ZenPadding;
  /**
   * Background layer (docs/guidelines/background-layers.md): `surface` for cards and panels on the Canvas page,
   * `surface-alt` on a white (Alt) canvas, `subtle` / `pale` for wells. Never Canvas (the page), Flat (navigation) or
   * Container (modals and sheets use Dialog / BottomSheet).
   */
  surface?: BoxSurface;
  /** Closed-box border: `subtle` when the box is actionable, `pale` when it is static (docs/guidelines/borders.md). */
  border?: "none" | "pale" | "subtle";
  /** Corner radius on the Corner-Radius tokens (Figma cornerRadius, follows the radius mode); `radiusTopLeft` … `radiusBottomLeft` override single corners. */
  radius?: ZenCornerRadius;
  as?: LayoutElement;
  children?: ReactNode;
}

/**
 * A plain container with token padding, background layer, border and radius. For clickable or selectable tiles use
 * Card; for page width use Container.
 */
export const Box = forwardRef<HTMLElement, BoxProps>(function Box(
  { padding, paddingX, paddingY, surface = "none", border = "none", radius, radiusTopLeft, radiusTopRight, radiusBottomRight, radiusBottomLeft, effectStyle, clip, width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf, position, constraintX, constraintY, insetTop, insetRight, insetBottom, insetLeft, as: Element = "div", className, style, children, ...rest },
  ref,
) {
  const sizing = layoutSizing({ width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf });
  const placed = layoutPosition({ position, constraintX, constraintY, insetTop, insetRight, insetBottom, insetLeft });
  return (
    <Element
      {...rest}
      ref={ref as never}
      className={["zen-box", className].filter(Boolean).join(" ")}
      data-surface={surface === "none" ? undefined : surface}
      data-border={border === "none" ? undefined : border}
      data-padded={(paddingX ?? padding) && (paddingX ?? padding) !== "none" ? "true" : undefined}
      {...sizing.attributes}
      {...placed.attributes}
      {...boxEffects({ effectStyle, clip })}
      style={withVars(style, {
        "--zen-box-padding-block": own(paddingValue(paddingY ?? padding)),
        "--zen-box-padding-inline": own(paddingValue(paddingX ?? padding)),
        "--zen-box-radius": own(cornerRadiusValue(radius, { radiusTopLeft, radiusTopRight, radiusBottomRight, radiusBottomLeft })),
        ...sizing.vars,
        ...placed.vars,
      })}
    >
      {children}
    </Element>
  );
});

/* ───────────── Container ───────────── */

export const containerWidths = ["sm", "md", "lg", "xl", "full"] as const;
export type ContainerWidth = (typeof containerWidths)[number];

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  /** Content width: sm 640 (forms) · md 960 (settings, reading) · lg 1280 (dashboards, default) · xl 1440 · full (list and
   * table pages: a page whose content is a non-widget Table spans the whole width, no max). */
  maxWidth?: ContainerWidth;
  /** Page margin on both sides from the breakpoint tokens (24 desktop/tablet, 20 mobile). Default true. */
  gutter?: boolean;
  as?: LayoutElement;
  children?: ReactNode;
}

/** Centres page content at a readable width with the breakpoint's page margin. */
export const Container = forwardRef<HTMLElement, ContainerProps>(function Container(
  { maxWidth = "lg", gutter = true, as: Element = "div", className, children, ...rest },
  ref,
) {
  return (
    <Element {...rest} ref={ref as never} className={["zen-container", className].filter(Boolean).join(" ")} data-width={maxWidth} data-gutter={gutter ? "true" : undefined}>
      {children}
    </Element>
  );
});
