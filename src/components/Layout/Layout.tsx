import { useLayoutEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { gapValue, paddingValue, type ZenCornerRadius, type ZenGap, type ZenMargin, type ZenPadding } from "../_shared/scale";
import "./layout.css";
import { layoutSizing, type LayoutSizingProps } from "./sizing";
import { layoutPosition, type LayoutPositionProps } from "./position";
import { boxEffects, type BoxEffectProps, type FrameEffectProps } from "./effects";
import { frameAppearance, frameCorners, type FrameAppearanceProps, type FrameTransformProps } from "./appearance";
import { useImageFill } from "../_shared/image-fill";
import { cornerRadiusValue, cornerSmoothingStyle } from "../_shared/corners";
import { useMergedRefs } from "../_shared/merge-refs";
import { useModeScope, type ZenModes } from "../_shared/zen-context";
import { useBoxMask } from "./mask";

export type { ZenCornerRadius, ZenGap, ZenMargin, ZenPadding };
export { layoutAlignSelfValues, type LayoutAlignSelf, type LayoutSizing, type LayoutSizingProps, type LayoutWidthProps } from "./sizing";
export { layoutConstraintsX, layoutConstraintsY, layoutPositions, positionPropNames, type LayoutConstraintX, type LayoutConstraintY, type LayoutPosition, type LayoutPositionProps } from "./position";
export { boxEffectStyles, effectPropNames, type BoxEffectProps, type BoxEffectStyle, type FrameEffectProps } from "./effects";
export { cornerRadiusPropNames, radiusPropNames, type CornerRadiusProps, type CornerSmoothingProps } from "../_shared/corners";
export { boxSurfaces, frameAppearancePropNames, frameBorders, frameBorderSides, frameBorderStyles, frameFlips, zenBlendModes, type BoxSurface, type FrameAppearanceProps, type FrameBorder, type FrameBorderSide, type FrameBorderStyle, type FrameFlip, type FrameTransformProps, type ZenBlendMode } from "./appearance";

export const layoutElements = ["div", "section", "article", "aside", "header", "footer", "main", "nav", "form", "fieldset", "ul", "ol", "li"] as const;
/** Figma "Overflow scrolling": the frame scrolls along one axis and keeps the scroll inside it. */
export const layoutScrolls = ["x", "y"] as const;
export type LayoutScroll = (typeof layoutScrolls)[number];
export type LayoutElement = (typeof layoutElements)[number];

type Vars = CSSProperties & Record<`--${string}`, string | number | undefined>;
// Custom properties inherit: a nested Stack/Box must reset its own padding, or it would pick up its parent's.
const own = (value: string | undefined) => value ?? "0px";
const withVars = (style: CSSProperties | undefined, vars: Record<`--${string}`, string | number | undefined>): CSSProperties =>
  ({ ...Object.fromEntries(Object.entries(vars).filter(([, value]) => value !== undefined)), ...style }) as Vars;

/* ───────────── Stack ───────────── */

/** Figma's Change variable mode on a frame (Studio Variables v2, user 2026-10-23). */
export interface FrameModeProps {
  /**
   * The frame's own variable modes, one per ZenProvider axis: `{ theme: "dark" }` draws a dark card on a light page,
   * `{ density: "comfortable", breakpoint: "mobile" }` a phone-sized block on a desktop page. Written as the data-*
   * attributes tokens.css reads, and given to the components inside as their ZenProvider context (a component reading
   * the breakpoint or the theme sees the frame's). Unset axes inherit. Figma: Layer › Apply variable mode.
   */
  modes?: ZenModes;
}

export interface StackProps extends HTMLAttributes<HTMLElement>, LayoutSizingProps, LayoutPositionProps, FrameAppearanceProps, FrameTransformProps, FrameEffectProps, FrameModeProps {
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
   * Figma "Clip content" (frame clipsContent): children are clipped to the frame's padding box, as Figma clips a frame.
   * Off by default, so the shadow of a card inside shows past the frame's edge. Uses `overflow: clip` (no scroll
   * container).
   */
  clip?: boolean;
  /**
   * Figma "Overflow scrolling": `"y"` scrolls the content vertically, `"x"` sideways, inside the stack's own box (it
   * needs a height or a maxHeight for `"y"`, a width for `"x"`); the scroll stays inside (overscroll-behavior: contain).
   */
  scroll?: LayoutScroll;
  /**
   * Every child takes an equal share along the direction (Figma: all children Fill container), for children that have
   * no sizing props of their own (Button, Input, Card… but also a Divider or an Icon: wrap those in `<Box width="hug">`).
   * A child's own `width` (row) or `height` (column) wins; in a row children keep their own minimum width (a Button
   * never shrinks below its label). A column shares equally only when its height is Fixed or Fill (Buttons get
   * taller); with only a maxHeight the children keep their content height and shrink once it caps; without a height
   * they keep their content height.
   */
  fillChildren?: boolean;
  /** Space inside the stack (Figma Spacing/Padding), or a page margin that follows the breakpoint (`margin-comfortable`: 24, 20 on a phone; `margin-compact`: 20, 16 on a phone). */
  padding?: ZenPadding;
  /** Horizontal padding (overrides `padding` on the sides). */
  paddingX?: ZenPadding;
  /** Vertical padding (overrides `padding` top and bottom), e.g. page content inside a Container that already has side margins. */
  paddingY?: ZenPadding;
  as?: LayoutElement;
  children?: ReactNode;
  /** Ref to the rendered DOM element (the `as` element when set). */
  ref?: Ref<HTMLElement>;
}

/**
 * One-dimensional layout with token spacing. Use it instead of hand-written flex CSS.
 *
 *   <Stack gap="lg">…sections…</Stack>
 *   <Stack direction="row" gap="sm" align="center" justify="between">…toolbar…</Stack>
 */
export function Stack({ direction = "column", gap = "md", align, justify, wrap = false, fillChildren = false, clip = false, scroll, padding, paddingX, paddingY, surface = "none", border = "none", borderWeight, borderSides, borderStyle, radius, radiusTopLeft, radiusTopRight, radiusBottomRight, radiusBottomLeft, cornerSmoothing, gradient, effectStyle, opacity, blendMode, rotation, flip, image, imageFit, imageCrop, imageScale, width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf, position, constraintX, constraintY, insetTop, insetRight, insetBottom, insetLeft, sticky, as: Element = "div", className, style, children, ref, modes, ...rest }: StackProps) {
  const scope = useModeScope(modes);
  const sizing = layoutSizing({ width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf });
  const placed = layoutPosition({ position, constraintX, constraintY, insetTop, insetRight, insetBottom, insetLeft, sticky });
  const look = frameAppearance({ surface, border, borderWeight, borderSides, borderStyle, gradient, opacity, blendMode, rotation, flip });
  const picture = useImageFill({ image, imageFit, imageCrop, imageScale });
  const corners = frameCorners(radius, { radiusTopLeft, radiusTopRight, radiusBottomRight, radiusBottomLeft });
  const smooth = cornerSmoothingStyle(cornerSmoothing);
  return (
    <Element
      {...rest}
      {...scope.attributes}
      ref={ref as never}
      className={["zen-stack", className].filter(Boolean).join(" ")}
      data-direction={direction}
      data-align={align ?? (direction === "row" ? "center" : undefined)}
      data-justify={justify}
      data-wrap={wrap ? "true" : undefined}
      data-fill-children={fillChildren ? "true" : undefined}
      data-scroll={scroll}
      data-padded={(paddingX ?? padding) && (paddingX ?? padding) !== "none" ? "true" : undefined}
      {...sizing.attributes}
      {...placed.attributes}
      {...look.attributes}
      {...picture.attributes}
      {...corners.attributes}
      {...smooth.attributes}
      {...boxEffects({ effectStyle, clip })}
      style={withVars(style, { "--zen-stack-gap": gapValue(gap), "--zen-stack-padding-block": own(paddingValue(paddingY ?? padding)), "--zen-stack-padding-inline": own(paddingValue(paddingX ?? padding)), ...sizing.vars, ...placed.vars, ...look.vars, ...picture.vars, ...corners.vars, ...smooth.vars })}
    >
      {scope.wrap(children)}
    </Element>
  );
}

/* ───────────── Grid ───────────── */

/** A column count (equal columns) or a CSS track list for unequal ones ("2fr 1fr", "minmax(0, 1fr) 320px"). */
export type GridTracks = number | string;
export type GridColumns = GridTracks | { mobile?: GridTracks; tablet?: GridTracks; desktop?: GridTracks };

export interface GridProps extends HTMLAttributes<HTMLElement>, LayoutSizingProps, LayoutPositionProps, FrameAppearanceProps, FrameTransformProps, FrameEffectProps, FrameModeProps {
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
  /**
   * One column whenever the Grid itself is narrower than this many px — its own width, not the page's breakpoint:
   * a two-column card that stacks in a narrow panel, a side panel or a phone-sized column. `columns` applies above it.
   */
  stackBelow?: number;
  padding?: ZenPadding;
  as?: LayoutElement;
  children?: ReactNode;
  /**
   * Figma "Clip content" (frame clipsContent): children are clipped to the frame's padding box, as Figma clips a frame.
   * Off by default, so the shadow of a card inside shows past the frame's edge. Uses `overflow: clip` (no scroll
   * container).
   */
  clip?: boolean;
  /** Ref to the rendered DOM element (the `as` element when set). */
  ref?: Ref<HTMLElement>;
}

/** grid-template-columns for a column count (equal, shrinkable columns) or a track list as written. */
const tracks = (value: GridTracks | undefined) => (value === undefined ? undefined : typeof value === "number" ? `repeat(${value}, minmax(0, 1fr))` : value);

/**
 * Grid `stackBelow`: whether the element is narrower than `below` px, measured before paint and on every resize. The
 * returned ref also fills the forwarded one.
 */
function useStackBelow(below: number | undefined, forwarded: Ref<HTMLElement> | undefined) {
  const [stacked, setStacked] = useState(false);
  const node = useRef<HTMLElement | null>(null);
  const measure = useMergedRefs(node, forwarded);
  useLayoutEffect(() => {
    const element = node.current;
    if (!element || typeof below !== "number") { setStacked(false); return undefined; }
    const update = () => setStacked(element.getBoundingClientRect().width < below);
    update();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [below]);
  return { stacked: typeof below === "number" && stacked, measure };
}

/**
 * Two-dimensional layout for cards, tiles and form columns.
 *
 *   <Grid minColumnWidth={280}>…cards…</Grid>
 *   <Grid columns={{ mobile: 1, desktop: 2 }} gap="lg">…fields…</Grid>
 *   <Grid columns={{ mobile: 1, desktop: "2fr 1fr" }} gap="lg" align="start">…main…aside…</Grid>
 */
export function Grid({ columns, minColumnWidth = 240, gap = "md", rowGap, columnGap, align, stackBelow, padding, clip = false, surface = "none", border = "none", borderWeight, borderSides, borderStyle, radius, radiusTopLeft, radiusTopRight, radiusBottomRight, radiusBottomLeft, cornerSmoothing, gradient, effectStyle, opacity, blendMode, rotation, flip, image, imageFit, imageCrop, imageScale, width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf, position, constraintX, constraintY, insetTop, insetRight, insetBottom, insetLeft, sticky, as: Element = "div", className, style, children, ref, modes, ...rest }: GridProps) {
  const scope = useModeScope(modes);
  const sizing = layoutSizing({ width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf });
  const placed = layoutPosition({ position, constraintX, constraintY, insetTop, insetRight, insetBottom, insetLeft, sticky });
  const perBreakpoint = typeof columns === "object" ? columns : undefined;
  const fixed = typeof columns === "object" ? undefined : columns;
  const desktop = tracks(fixed ?? perBreakpoint?.desktop ?? perBreakpoint?.tablet ?? perBreakpoint?.mobile);
  const min = typeof minColumnWidth === "number" ? `${minColumnWidth}px` : minColumnWidth;
  const { stacked, measure } = useStackBelow(stackBelow, ref);
  const look = frameAppearance({ surface, border, borderWeight, borderSides, borderStyle, gradient, opacity, blendMode, rotation, flip });
  const picture = useImageFill({ image, imageFit, imageCrop, imageScale });
  const corners = frameCorners(radius, { radiusTopLeft, radiusTopRight, radiusBottomRight, radiusBottomLeft });
  const smooth = cornerSmoothingStyle(cornerSmoothing);
  return (
    <Element
      {...rest}
      {...scope.attributes}
      ref={measure as never}
      className={["zen-grid", className].filter(Boolean).join(" ")}
      data-mode={desktop === undefined ? "fill" : perBreakpoint ? "responsive" : "fixed"}
      data-stacked={stacked ? "true" : undefined}
      data-align={align}
      {...sizing.attributes}
      {...placed.attributes}
      {...look.attributes}
      {...picture.attributes}
      {...corners.attributes}
      {...smooth.attributes}
      {...boxEffects({ effectStyle, clip })}
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
        ...look.vars, ...picture.vars,
        ...corners.vars,
        ...smooth.vars,
      })}
    >
      {scope.wrap(children)}
    </Element>
  );
}

/* ───────────── Box ───────────── */

export interface BoxProps extends HTMLAttributes<HTMLElement>, LayoutSizingProps, LayoutPositionProps, BoxEffectProps, FrameAppearanceProps, FrameTransformProps, FrameModeProps {
  padding?: ZenPadding;
  paddingX?: ZenPadding;
  paddingY?: ZenPadding;
  /** Figma "Overflow scrolling": `"y"` scrolls vertically, `"x"` sideways, inside the box (the scroll stays inside). */
  scroll?: LayoutScroll;
  /**
   * Figma's Group (Zen Studio ⌘G): a box that only holds its layers together, at their X / Y inside it and sized to them
   * (Zen Studio writes its box). It has no look of its own: fill, stroke, corners, effect, padding, scroll and clip are
   * ignored. It moves, turns, flips, fades (opacity) and blends (blendMode) as one.
   */
  group?: boolean;
  /**
   * Figma's mask (Zen Studio ⌃⌘M "Use as mask", Figma `isMask` on the group's bottom layer): the box's first layer is
   * the mask and the layers after it show only inside its outline (a Shape's outline, or a layer's box with its
   * corners, turned and flipped as drawn). The mask layer itself draws nothing. Mostly on a `group`.
   */
  mask?: boolean;
  as?: LayoutElement;
  children?: ReactNode;
  /** Ref to the rendered DOM element (the `as` element when set). */
  ref?: Ref<HTMLElement>;
}

/**
 * A frame without auto layout (Figma's Frame): token padding, fill (background layer), stroke, corner radius and effect
 * around content that flows as blocks, or layers placed at X / Y. With auto layout the same frame is a Stack or Grid,
 * which take the same appearance props. For clickable or selectable tiles use Card; for page width use Container.
 */
export function Box({ padding, paddingX, paddingY, surface = "none", border = "none", borderWeight, borderSides, borderStyle, scroll, group, mask, radius, radiusTopLeft, radiusTopRight, radiusBottomRight, radiusBottomLeft, cornerSmoothing, gradient, effectStyle, clip, opacity, blendMode, rotation, flip, image, imageFit, imageCrop, imageScale, width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf, position, constraintX, constraintY, insetTop, insetRight, insetBottom, insetLeft, sticky, as: Element = "div", className, style, children, ref, modes, ...rest }: BoxProps) {
  const scope = useModeScope(modes);
  const sizing = layoutSizing({ width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf });
  const placed = layoutPosition({ position, constraintX, constraintY, insetTop, insetRight, insetBottom, insetLeft, sticky });
  // A group (Figma's) has no look of its own: only its opacity, rotation and flip.
  const look = group ? frameAppearance({ opacity, blendMode, rotation, flip }) : frameAppearance({ surface, border, borderWeight, borderSides, borderStyle, gradient, opacity, blendMode, rotation, flip });
  const pad = group ? {} : { block: paddingY ?? padding, inline: paddingX ?? padding };
  // A group (Figma's) has no fill: no picture either.
  const picture = useImageFill(group ? {} : { image, imageFit, imageCrop, imageScale });
  // A mask (Figma's): the first layer's outline clips the rest (mask.tsx).
  const masked = useBoxMask(Boolean(mask));
  const merged = useMergedRefs(masked.ref, ref);
  return (
    <Element
      {...rest}
      {...scope.attributes}
      ref={merged as never}
      className={["zen-box", className].filter(Boolean).join(" ")}
      data-group={group ? "true" : undefined}
      data-mask={mask ? "true" : undefined}
      data-scroll={group ? undefined : scroll}
      data-padded={pad.inline && pad.inline !== "none" ? "true" : undefined}
      {...sizing.attributes}
      {...placed.attributes}
      {...look.attributes}
      {...picture.attributes}
      {...(group ? {} : boxEffects({ effectStyle, clip }))}
      {...(group ? {} : cornerSmoothingStyle(cornerSmoothing).attributes)}
      style={withVars(style, {
        "--zen-box-padding-block": own(paddingValue(pad.block)),
        "--zen-box-padding-inline": own(paddingValue(pad.inline)),
        "--zen-box-radius": group ? undefined : own(cornerRadiusValue(radius, { radiusTopLeft, radiusTopRight, radiusBottomRight, radiusBottomLeft })),
        ...sizing.vars,
        ...placed.vars,
        ...look.vars, ...picture.vars,
        ...(group ? {} : cornerSmoothingStyle(cornerSmoothing).vars),
        ...masked.vars,
      })}
    >
      {scope.wrap(children)}
      {masked.defs}
    </Element>
  );
}

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
  /** Ref to the rendered DOM element (the `as` element when set). */
  ref?: Ref<HTMLElement>;
}

/** Centres page content at a readable width with the breakpoint's page margin. */
export function Container({ maxWidth = "lg", gutter = true, as: Element = "div", className, children, ref, ...rest }: ContainerProps) {
  return (
    <Element {...rest} ref={ref as never} className={["zen-container", className].filter(Boolean).join(" ")} data-width={maxWidth} data-gutter={gutter ? "true" : undefined}>
      {children}
    </Element>
  );
}
