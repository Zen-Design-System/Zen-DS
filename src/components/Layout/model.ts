import { gapValue, paddingValue, type ZenGap, type ZenPadding } from "../_shared/scale";
import { cornerRadiusValue, cornerSmoothingStyle } from "../_shared/corners";
import { imageFillStyle, type PictureSize } from "../_shared/image-fill";
import { isPerBreakpoint, resolveAt, type Responsive, type ResponsiveBreakpoint } from "../_shared/responsive";
import { layoutSizing, type LayoutSizingProps } from "./sizing";
import { layoutPosition, type LayoutPositionProps } from "./position";
import { gridCell, gridTrackCount, type GridCellContextValue, type LayoutCellProps } from "./cell";
import { boxEffects, type BoxEffectProps } from "./effects";
import { frameAppearance, frameCorners, type FrameAppearanceProps, type FrameTransformProps } from "./appearance";

/*
 * Layout's framework-free part (the web core, src/core): what Stack, Grid, Box and Container write on their element for
 * a set of props (data-* attributes and custom properties), at their breakpoint, inside a Grid, with a tiled picture's
 * own size once it has loaded. React's frames (Layout.tsx) and the Vue port both draw from it, so the two stay the same
 * DOM (tools/code-languages/vue-parity.mjs). The props are documented on React's StackProps, GridProps and BoxProps.
 */

export const layoutElements = ["div", "section", "article", "aside", "header", "footer", "main", "nav", "form", "fieldset", "ul", "ol", "li"] as const;
/** Figma "Overflow scrolling": the frame scrolls along one axis and keeps the scroll inside it. */
export const layoutScrolls = ["x", "y"] as const;
export type LayoutScroll = (typeof layoutScrolls)[number];
export type LayoutElement = (typeof layoutElements)[number];

export const containerWidths = ["sm", "md", "lg", "xl", "full"] as const;
export type ContainerWidth = (typeof containerWidths)[number];

/** A column count (equal columns) or a CSS track list for unequal ones ("2fr 1fr", "minmax(0, 1fr) 320px"). */
export type GridTracks = number | string;
export type GridColumns = Responsive<GridTracks>;

type Attributes = Record<string, string | undefined>;
type Vars = Record<`--${string}`, string | undefined>;

/** What a frame writes on its element: data-* attributes, and custom properties that go under the caller's `style`. */
export type FrameOutput = { attributes: Attributes; vars: Vars };

/** Where a frame lays out: its breakpoint, the Grid it is a cell of (spans), and a tiled picture's own size once loaded. */
export type FrameContext = { breakpoint: ResponsiveBreakpoint; grid: GridCellContextValue | null; picture: PictureSize | null };

/** The props every frame (Stack, Grid, Box) takes beside its own layout. */
export type FrameModelProps = LayoutSizingProps & LayoutCellProps & LayoutPositionProps & FrameAppearanceProps & FrameTransformProps & BoxEffectProps & { hideOn?: readonly ResponsiveBreakpoint[] };

export type StackModelProps = FrameModelProps & {
  direction?: Responsive<"column" | "row">;
  gap?: Responsive<ZenGap>;
  align?: Responsive<"start" | "center" | "end" | "stretch" | "baseline">;
  justify?: Responsive<"start" | "center" | "end" | "between" | "around">;
  wrap?: Responsive<boolean>;
  fillChildren?: boolean;
  scroll?: LayoutScroll;
  padding?: Responsive<ZenPadding>;
  paddingX?: Responsive<ZenPadding>;
  paddingY?: Responsive<ZenPadding>;
};

export type GridModelProps = FrameModelProps & {
  columns?: GridColumns;
  minColumnWidth?: number | string;
  gap?: Responsive<ZenGap>;
  rowGap?: Responsive<ZenGap>;
  columnGap?: Responsive<ZenGap>;
  align?: "start" | "center" | "end" | "stretch";
  padding?: Responsive<ZenPadding>;
};

export type BoxModelProps = FrameModelProps & {
  padding?: Responsive<ZenPadding>;
  paddingX?: Responsive<ZenPadding>;
  paddingY?: Responsive<ZenPadding>;
  scroll?: LayoutScroll;
  group?: boolean;
  mask?: boolean;
};

// Custom properties inherit: a nested Stack/Box must reset its own padding, or it would pick up its parent's.
const own = (value: string | undefined) => value ?? "0px";
const hidden = (hideOn: readonly ResponsiveBreakpoint[] | undefined, at: ResponsiveBreakpoint) => (hideOn?.includes(at) ? "true" : undefined);

/** A frame's custom properties without the unset ones, in order. */
export const frameVars = (vars: Vars): Record<`--${string}`, string> => Object.fromEntries(Object.entries(vars).filter(([, value]) => value !== undefined)) as Record<`--${string}`, string>;

/** A frame's style: its custom properties under the caller's `style` (theirs win). */
export const frameStyle = <S extends object>(style: S | undefined, vars: Vars): S => ({ ...frameVars(vars), ...style }) as S;

/**
 * The breakpoint a frame lays itself out at: its own `modes.breakpoint`, else the nearest ZenProvider's (an app's
 * `auto`, a Studio Screen, a parent frame's modes), else desktop.
 */
export const frameBreakpoint = (modes: { breakpoint?: ResponsiveBreakpoint } | undefined, inherited: ResponsiveBreakpoint | undefined): ResponsiveBreakpoint => modes?.breakpoint ?? inherited ?? "desktop";

/** grid-template-columns for a column count (equal, shrinkable columns) or a track list as written. */
export const gridTracks = (value: GridTracks | undefined) => (value === undefined ? undefined : typeof value === "number" ? `repeat(${value}, minmax(0, 1fr))` : value);

/** Stack: responsive props resolve at the frame's breakpoint; the data-direction rules in layout.css read the result. */
export function stackModel(props: StackModelProps, { breakpoint: at, grid, picture }: FrameContext): FrameOutput {
  const direction = resolveAt(props.direction, at) ?? "column";
  const gap = resolveAt(props.gap, at) ?? "md";
  const align = resolveAt(props.align, at);
  const justify = resolveAt(props.justify, at);
  const wrap = resolveAt(props.wrap, at) ?? false;
  const padding = resolveAt(props.padding, at);
  const paddingX = resolveAt(props.paddingX, at);
  const paddingY = resolveAt(props.paddingY, at);
  const sizing = layoutSizing(props);
  const cell = gridCell(grid, props);
  const placed = layoutPosition(props);
  const look = frameAppearance(props);
  const image = imageFillStyle(props, picture);
  const corners = frameCorners(props.radius, props);
  const smooth = cornerSmoothingStyle(props.cornerSmoothing);
  const inline = paddingX ?? padding;
  return {
    attributes: {
      "data-hidden": hidden(props.hideOn, at),
      "data-direction": direction,
      "data-align": align ?? (direction === "row" ? "center" : undefined),
      "data-justify": justify,
      "data-wrap": wrap ? "true" : undefined,
      "data-fill-children": props.fillChildren ? "true" : undefined,
      "data-scroll": props.scroll,
      "data-padded": inline && inline !== "none" ? "true" : undefined,
      ...sizing.attributes,
      ...cell.attributes,
      ...placed.attributes,
      ...look.attributes,
      ...image.attributes,
      ...corners.attributes,
      ...smooth.attributes,
      ...boxEffects(props),
    },
    vars: { "--zen-stack-gap": gapValue(gap), "--zen-stack-padding-block": own(paddingValue(paddingY ?? padding)), "--zen-stack-padding-inline": own(paddingValue(inline)), ...sizing.vars, ...cell.vars, ...placed.vars, ...look.vars, ...image.vars, ...corners.vars, ...smooth.vars },
  };
}

/**
 * Grid: `stacked` is whether it is narrower than `stackBelow` (measured after layout; false before). `columns` is the
 * count its children's spans clamp to (cell.ts): one while it stacks, null in auto-fill. Columns resolve here too, not
 * in CSS: a [data-breakpoint] selector also matched a frame with its own modes inside.
 */
export function gridModel(props: GridModelProps, { breakpoint: at, grid, picture }: FrameContext, stacked: boolean): FrameOutput & { columns: number | null } {
  const gap = resolveAt(props.gap, at) ?? "md";
  const rowGap = resolveAt(props.rowGap, at);
  const columnGap = resolveAt(props.columnGap, at);
  const padding = resolveAt(props.padding, at);
  const sizing = layoutSizing(props);
  const cell = gridCell(grid, props);
  const placed = layoutPosition(props);
  const columnsAt = resolveAt(props.columns, at);
  const columnTracks = gridTracks(columnsAt);
  const minColumnWidth = props.minColumnWidth === undefined ? 240 : props.minColumnWidth;
  const look = frameAppearance(props);
  const image = imageFillStyle(props, picture);
  const corners = frameCorners(props.radius, props);
  const smooth = cornerSmoothingStyle(props.cornerSmoothing);
  return {
    columns: stacked ? 1 : gridTrackCount(columnsAt),
    attributes: {
      "data-hidden": hidden(props.hideOn, at),
      "data-mode": columnTracks === undefined ? "fill" : isPerBreakpoint(props.columns) ? "responsive" : "fixed",
      "data-stacked": stacked ? "true" : undefined,
      "data-align": props.align,
      ...sizing.attributes,
      ...cell.attributes,
      ...placed.attributes,
      ...look.attributes,
      ...image.attributes,
      ...corners.attributes,
      ...smooth.attributes,
      ...boxEffects(props),
    },
    vars: {
      "--zen-grid-min": typeof minColumnWidth === "number" ? `${minColumnWidth}px` : minColumnWidth,
      "--zen-grid-cols": columnTracks,
      "--zen-grid-row-gap": gapValue(rowGap ?? gap),
      "--zen-grid-column-gap": gapValue(columnGap ?? gap),
      "--zen-grid-padding": own(paddingValue(padding)),
      ...sizing.vars, ...cell.vars,
      ...placed.vars,
      ...look.vars, ...image.vars,
      ...corners.vars,
      ...smooth.vars,
    },
  };
}

/**
 * Box. A group (Figma's) has no look of its own: no fill, picture, stroke, corners, effect, padding, scroll or clip;
 * only its opacity, blend, rotation and flip. The mask's clip-path variable (measured after layout) goes after these.
 */
export function boxModel(props: BoxModelProps, { breakpoint: at, grid, picture }: FrameContext): FrameOutput {
  const { group } = props;
  const padding = resolveAt(props.padding, at);
  const paddingX = resolveAt(props.paddingX, at);
  const paddingY = resolveAt(props.paddingY, at);
  const sizing = layoutSizing(props);
  const cell = gridCell(grid, props);
  const placed = layoutPosition(props);
  const look = group ? frameAppearance({ opacity: props.opacity, blendMode: props.blendMode, rotation: props.rotation, flip: props.flip }) : frameAppearance(props);
  const pad = group ? {} : { block: paddingY ?? padding, inline: paddingX ?? padding };
  const image = imageFillStyle(group ? {} : props, picture);
  const smooth = group ? { attributes: {}, vars: {} } : cornerSmoothingStyle(props.cornerSmoothing);
  return {
    attributes: {
      "data-hidden": hidden(props.hideOn, at),
      "data-group": group ? "true" : undefined,
      "data-mask": props.mask ? "true" : undefined,
      "data-scroll": group ? undefined : props.scroll,
      "data-padded": pad.inline && pad.inline !== "none" ? "true" : undefined,
      ...sizing.attributes,
      ...cell.attributes,
      ...placed.attributes,
      ...look.attributes,
      ...image.attributes,
      ...(group ? {} : boxEffects(props)),
      ...smooth.attributes,
    },
    vars: {
      "--zen-box-padding-block": own(paddingValue(pad.block)),
      "--zen-box-padding-inline": own(paddingValue(pad.inline)),
      "--zen-box-radius": group ? undefined : own(cornerRadiusValue(props.radius, props)),
      ...sizing.vars, ...cell.vars,
      ...placed.vars,
      ...look.vars, ...image.vars,
      ...smooth.vars,
    },
  };
}

/** Container: its width token and the breakpoint's page margin. */
export const containerModel = ({ maxWidth = "lg", gutter = true }: { maxWidth?: ContainerWidth; gutter?: boolean }) => ({ "data-width": maxWidth, "data-gutter": gutter ? "true" : undefined });
