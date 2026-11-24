import { defineComponent, h, type PropType } from "vue";
import { scaleKey, skeletonClass, skeletonHeadingSizes, skeletonShapeSizes, skeletonTextBars, type SkeletonHeadingSize, type SkeletonShape as SkeletonShapeKind, type SkeletonShapeSize } from "@zen-ds/core";
import { dataAttrs } from "../../_shared/attrs";

export {
  skeletonHeadingSizes,
  skeletonShapes,
  skeletonShapeSizes,
  skeletonTextLines,
  type SkeletonHeadingSize,
  type SkeletonShape as SkeletonShapeKind,
  type SkeletonShapeSize,
} from "@zen-ds/core";

/** Pulse while loading (off for reduced motion). */
const animated = { type: Boolean, default: true };

/** The root's attributes: `data-*`, the merged class and style, hidden from assistive technology. */
const root = (attrs: Record<string, unknown>, base: string, pulse: boolean) => ({ ...dataAttrs(attrs), class: [skeletonClass(base, pulse), attrs.class], style: attrs.style, "aria-hidden": "true" });

/**
 * Figma Skeleton/Body-Text (1556:17566), React: components/Skeleton. 8px rounded bars, gap 8; the last of several lines
 * is 40px shorter. Takes `class`, `style` and `data-*` attributes, as React's.
 */
export const SkeletonText = defineComponent({
  name: "SkeletonText",
  inheritAttrs: false,
  props: {
    /** Figma No. of line: 1 · 2 · 3 · 5 (any positive number works). */
    lines: { type: Number, default: 3 },
    animated,
  },
  setup(props, { attrs }) {
    return () => h("span", root(attrs, "zen-skeleton-text", props.animated), skeletonTextBars(props.lines).map((index) => h("span", { key: index, class: "zen-skeleton__bar" })));
  },
});

/** Figma Skeleton/Heading-Text (1556:17593), React: components/Skeleton. A single rounded bar (Large 32 · Medium 24 · Small 16 high). */
export const SkeletonHeading = defineComponent({
  name: "SkeletonHeading",
  inheritAttrs: false,
  props: {
    /** Short (sm, md…) or Figma (small, medium…) spelling. */
    size: { type: String as PropType<SkeletonHeadingSize>, default: "md" },
    animated,
  },
  setup(props, { attrs }) {
    return () => h("span", { ...root(attrs, "zen-skeleton-heading", props.animated), "data-size": scaleKey(props.size, skeletonHeadingSizes) });
  },
});

/** Figma Skeleton/Shapes (1556:17525), React: components/Skeleton. Rectangle/Square Corner-Radius/Base, Pill/Round fully rounded. */
export const SkeletonShape = defineComponent({
  name: "SkeletonShape",
  inheritAttrs: false,
  props: {
    shape: { type: String as PropType<SkeletonShapeKind>, default: "rectangle" },
    /** Large 48 · Medium 40 · Small 32 · XSmall 24 · 2XSmall 20 high. Short (sm, md…) or Figma (small, medium…) spelling. */
    size: { type: String as PropType<SkeletonShapeSize>, default: "md" },
    animated,
  },
  setup(props, { attrs }) {
    return () => h("span", { ...root(attrs, "zen-skeleton-shape", props.animated), "data-shape": props.shape, "data-size": scaleKey(props.size, skeletonShapeSizes) });
  },
});
