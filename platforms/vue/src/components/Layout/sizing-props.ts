import type { PropType } from "vue";
import type { LayoutAlignSelf, LayoutSizing } from "@zen-ds/core";

/** Figma auto layout's resizing (React: LayoutSizingProps, Layout/sizing.ts): Stack, Grid, Box, Text and Heading. */
export const layoutSizingProps = {
  /** Hug contents (`"hug"`), Fill container (`"fill"`) or a Fixed width in px. */
  width: { type: [String, Number] as PropType<LayoutSizing> },
  /** Hug contents (`"hug"`), Fill container (`"fill"`) or a Fixed height in px. */
  height: { type: [String, Number] as PropType<LayoutSizing> },
  minWidth: { type: Number },
  maxWidth: { type: Number },
  minHeight: { type: Number },
  maxHeight: { type: Number },
  /** This element's alignment inside its parent Stack or Grid cell. */
  alignSelf: { type: String as PropType<LayoutAlignSelf> },
};
