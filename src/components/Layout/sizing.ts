/**
 * Figma auto-layout resizing for the layout primitives (Stack, Grid, Box) and Text / Heading: Hug contents, Fill
 * container or a Fixed size per axis, min/max sizes, and the child's alignment inside its parent Stack or Grid.
 *
 * Rendering: data attributes (`data-w`, `data-h` = hug | fill | fixed, `data-self`, `data-min-w` …) plus the px values
 * as inline custom properties (`--zen-layout-width` …). The rules in layout.css read the parent: inside a Stack, fill
 * grows along its direction and stretches across it. Unset props render nothing.
 */
import type { CSSProperties } from "react";
import "./layout.css";

/** One axis of Figma resizing: "hug" (Hug contents), "fill" (Fill container) or a number (Fixed size, in px). */
export type LayoutSizing = "hug" | "fill" | number;

export const layoutAlignSelfValues = ["start", "center", "end", "stretch"] as const;
/** A child's alignment inside its parent Stack (across the stack's direction) or Grid cell (vertically). */
export type LayoutAlignSelf = (typeof layoutAlignSelfValues)[number];

/** Horizontal sizing: shared by Stack, Grid, Box, Text and Heading. */
export interface LayoutWidthProps {
  /**
   * Horizontal resizing, as in Figma auto layout. Unset keeps the element's usual width.
   * `"hug"` (Hug contents): as wide as its content, never grows or stretches.
   * `"fill"` (Fill container): in a row Stack it takes an equal share of the space left after each child's padding
   * and may shrink to 0; in a column Stack it stretches across; in a Grid cell or a plain block it takes the full
   * width. Fill children in a wrapping row need a `minWidth` to wrap.
   * A number: Fixed width in px, which never shrinks in a flex row. Sizes include padding and border (border-box).
   * (Container's `maxWidth` is a different prop: a token width, sm…full.)
   * Prefer hug or fill; use Fixed only for widths that really are fixed (a side column, a preview frame).
   */
  width?: LayoutSizing;
  /** Minimum width in px (Figma min width). Wins over fill's shrink-to-0. */
  minWidth?: number;
  /** Maximum width in px (Figma max width), e.g. a readable line length for a Fill block of text. */
  maxWidth?: number;
  /**
   * This element's alignment inside its parent: start · center · end · stretch across a Stack's
   * direction (vertical in a row, horizontal in a column), vertical inside a Grid cell. Overrides the parent's `align`
   * for this child. A `"fill"` size on the same axis still fills; in a column, alignSelf then places it once maxWidth
   * stops it. No effect outside a Stack or Grid.
   */
  alignSelf?: LayoutAlignSelf;
}

/** Both axes: Stack, Grid, Box, Text and Heading (a Text height is Figma's Fixed size text box). */
export interface LayoutSizingProps extends LayoutWidthProps {
  /**
   * Vertical resizing, as in Figma auto layout. Unset keeps the element's usual height.
   * `"hug"` (Hug contents): as tall as its content, never grows or stretches.
   * `"fill"` (Fill container): in a column Stack it takes an equal share of the free height; it shrinks below its
   * content only when the column has a height of its own (Fixed, Fill or maxHeight), else it keeps its content height
   * (pass `minHeight={0}` for a scrolling child of a column sized from outside). In a row Stack it stretches to the
   * row's height; in a Grid cell it fills the cell (over alignSelf); in a plain block it takes 100% (the parent needs
   * a height).
   * A number: Fixed height in px, which does not shrink in a column Stack.
   */
  height?: LayoutSizing;
  /** Minimum height in px (Figma min height). Wins over fill's shrink-to-0. */
  minHeight?: number;
  /** Maximum height in px (Figma max height). */
  maxHeight?: number;
}

const px = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? `${Math.max(0, value)}px` : undefined);
const sizingMode = (value: LayoutSizing | undefined) => (value === "hug" || value === "fill" ? value : px(value) ? "fixed" : undefined);
const flag = (value: unknown) => (px(value) ? "true" : undefined);

export interface LayoutSizingOutput {
  /** Data attributes to spread on the element; every key is undefined when its prop is unset. */
  attributes: Record<`data-${string}`, string | undefined>;
  /** Inline custom properties with the px values; empty when no numeric prop is set. */
  vars: Record<`--${string}`, string>;
}

/** Data attributes and custom properties for the sizing props. Unset props produce nothing. */
export function layoutSizing({ width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf }: LayoutSizingProps): LayoutSizingOutput {
  const values: Record<`--${string}`, string | undefined> = {
    "--zen-layout-width": typeof width === "number" ? px(width) : undefined,
    "--zen-layout-height": typeof height === "number" ? px(height) : undefined,
    "--zen-layout-min-width": px(minWidth),
    "--zen-layout-max-width": px(maxWidth),
    "--zen-layout-min-height": px(minHeight),
    "--zen-layout-max-height": px(maxHeight),
  };
  return {
    attributes: {
      "data-w": sizingMode(width),
      "data-h": sizingMode(height),
      "data-min-w": flag(minWidth),
      "data-max-w": flag(maxWidth),
      "data-min-h": flag(minHeight),
      "data-max-h": flag(maxHeight),
      "data-self": alignSelf && (layoutAlignSelfValues as readonly string[]).includes(alignSelf) ? alignSelf : undefined,
    },
    vars: Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) as Record<`--${string}`, string>,
  };
}

/** `style` with the sizing custom properties underneath it; the same object (or undefined) when there are none. */
export function withSizingVars<T extends CSSProperties | undefined>(style: T, vars: LayoutSizingOutput["vars"]): T | CSSProperties {
  return Object.keys(vars).length ? ({ ...vars, ...style } as CSSProperties) : style;
}
