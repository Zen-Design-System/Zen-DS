import { computed, defineComponent, h, inject, onBeforeUnmount, onMounted, onUpdated, provide, ref, shallowRef, useId, watch, type ComputedRef, type InjectionKey, type PropType, type SlotsType, type VNodeArrayChildren, type VNodeChild } from "vue";
import {
  boxMaskOutline,
  boxModel,
  containerModel,
  frameBreakpoint,
  frameModeScope,
  frameVars,
  gridCell,
  gridModel,
  imageFillMode,
  knownPictureSize,
  maskClipId,
  pictureSizeProbe,
  sameMaskOutline,
  shownPicture,
  stackModel,
  type BoxEffectStyle,
  type ContainerWidth,
  type FrameBorder,
  type FrameBorderSide,
  type FrameBorderStyle,
  type FrameFill,
  type FrameFlip,
  type GridCellContextValue,
  type GridColumns,
  type ImageCrop,
  type ImageFillMode,
  type LayoutCellOutput,
  type LayoutCellProps,
  type LayoutConstraintX,
  type LayoutConstraintY,
  type LayoutElement,
  type LayoutInset,
  type LayoutPosition,
  type LayoutScroll,
  type LayoutSpan,
  type LayoutSticky,
  type MaskOutline,
  type PictureSize,
  type Responsive,
  type ResponsiveBreakpoint,
  type ZenBlendMode,
  type ZenCornerRadius,
  type ZenGap,
  type ZenGradient,
  type ZenModeAxis,
  type ZenPadding,
} from "@zen-ds/core";
import { restAttrs } from "../../_shared/attrs";
import { useZen, zenContextKey, type ZenContextValue } from "../../_shared/context";
import { layoutSizingProps } from "./sizing-props";

export {
  boxEffectStyles,
  boxSurfaces,
  containerWidths,
  frameBorders,
  frameBorderSides,
  frameBorderStyles,
  frameFlips,
  layoutAlignSelfValues,
  layoutConstraintsX,
  layoutConstraintsY,
  layoutElements,
  layoutPositions,
  layoutScrolls,
  zenBlendModes,
  type BoxEffectStyle,
  type BoxSurface,
  type ContainerWidth,
  type FrameBorder,
  type FrameBorderSide,
  type FrameBorderStyle,
  type FrameFill,
  type FrameFlip,
  type GridColumns,
  type GridTracks,
  type LayoutAlignSelf,
  type LayoutCellOutput,
  type LayoutCellProps,
  type LayoutConstraintX,
  type LayoutConstraintY,
  type LayoutElement,
  type LayoutPosition,
  type LayoutScroll,
  type LayoutSizing,
  type LayoutSpan,
  type ZenBlendMode,
} from "@zen-ds/core";

/** A frame's own variable modes, one per ZenProvider axis (React: ZenModes). */
export type FrameModes = { theme?: "light" | "dark"; breakpoint?: ResponsiveBreakpoint } & Partial<Record<ZenModeAxis, string>>;

/* ───────────── Contexts ───────────── */

/** What the nearest Grid tells its children (React: GridCellContext): read on each render, so spans follow it. */
const gridCellKey: InjectionKey<() => GridCellContextValue> = Symbol("zen-grid-cell");

/** The cell attributes for a child of the nearest Grid (React: useGridCell); call in setup, read `.value` while rendering. */
export function useGridCell(props: LayoutCellProps): ComputedRef<LayoutCellOutput> {
  const grid = inject(gridCellKey, null);
  return computed(() => gridCell(grid?.() ?? null, { span: props.span, rowSpan: props.rowSpan }));
}

/** An object whose properties are read from `read()` each time (a context value that follows its sources). */
function liveView<T extends object>(read: () => T): T {
  return new Proxy({} as T, {
    get: (_target, key) => Reflect.get(read(), key),
    has: (_target, key) => key in read(),
    ownKeys: () => Reflect.ownKeys(read()),
    getOwnPropertyDescriptor: (_target, key) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(read(), key);
      return descriptor && { ...descriptor, configurable: true };
    },
  });
}

/**
 * A frame's modes as its children's ZenProvider context (React: useModeScope's wrap): the frame's axes over its parent's,
 * so a component inside that reads the breakpoint or the theme sees the frame's. Renders only its content.
 */
const FrameModeScope = defineComponent({
  name: "ZenFrameModes",
  props: { own: { type: Object as PropType<Partial<Record<ZenModeAxis, unknown>>>, required: true } },
  setup(props, { slots }) {
    const parent = useZen();
    provide(zenContextKey, liveView(() => ({ ...(parent ?? {}), ...props.own }) as ZenContextValue));
    return () => slots.default?.();
  },
});

/** The content, inside the frame's mode scope when it sets modes (frameModeScope). */
function scoped(scope: { own: Partial<Record<ZenModeAxis, unknown>> } | null, slot: (() => VNodeChild) | undefined, extra: VNodeChild = null): VNodeArrayChildren {
  return [scope ? h(FrameModeScope, { own: scope.own }, slot ? { default: slot } : undefined) : slot?.(), extra];
}

/**
 * A tiled picture's own size once it has loaded (React: usePictureSize): null on the server and before the load, as
 * React's first render; the probe starts after mount.
 */
function usePictureSize(source: () => string | undefined): () => PictureSize | null {
  const loaded = ref(0);
  onMounted(() => {
    watch(source, (src, _was, onCleanup) => {
      if (src) onCleanup(pictureSizeProbe(src, () => { loaded.value += 1; }));
    }, { immediate: true });
  });
  return () => {
    void loaded.value;
    const src = source();
    return src ? knownPictureSize(src) : null;
  };
}

/** The picture a frame tiles (Tile needs its own size), else undefined. */
const tiled = (image: string | undefined, fit: string | undefined) => {
  const src = shownPicture(image);
  return src && imageFillMode(fit) === "tile" ? src : undefined;
};

/* ───────────── Props ───────────── */

// A responsive value is the value or an object per breakpoint. No Boolean in a string prop's types: Vue would turn an
// unset one into false.
const responsive = <T extends string>() => [String, Object] as PropType<Responsive<T>>;

/** What Stack, Grid and Box share (React: their props beside their own layout). */
const frameProps = {
  ...layoutSizingProps,
  /** Columns this child takes in its parent Grid: a number or `"full"`, per breakpoint too. */
  span: { type: [Number, String, Object] as PropType<Responsive<LayoutSpan>> },
  /** Rows this child takes in its parent Grid, per breakpoint too. */
  rowSpan: { type: [Number, Object] as PropType<Responsive<number>> },
  /** Figma "Ignore auto layout": `"absolute"` pins it to its parent with the constraints. */
  position: { type: String as PropType<LayoutPosition> },
  constraintX: { type: String as PropType<LayoutConstraintX> },
  constraintY: { type: String as PropType<LayoutConstraintY> },
  /** Offsets on Spacing/Padding, or px in a free frame. */
  insetTop: { type: [String, Number] as PropType<LayoutInset> },
  insetRight: { type: [String, Number] as PropType<LayoutInset> },
  insetBottom: { type: [String, Number] as PropType<LayoutInset> },
  insetLeft: { type: [String, Number] as PropType<LayoutInset> },
  /** Figma "Fix position when scrolling": sticks to the scrolling ancestor's top or bottom edge. */
  sticky: { type: String as PropType<LayoutSticky> },
  /** Fill: a background layer or any Color/Background token by its path. */
  surface: { type: String as PropType<FrameFill>, default: "none" },
  /** Stroke: `pale` (static) or `subtle` (actionable). */
  border: { type: String as PropType<FrameBorder>, default: "none" },
  borderWeight: { type: Number },
  borderSides: { type: String as PropType<FrameBorderSide> },
  borderStyle: { type: String as PropType<FrameBorderStyle> },
  /** Corner radius on the Corner-Radius tokens; the four corners override it one by one. */
  radius: { type: String as PropType<ZenCornerRadius> },
  radiusTopLeft: { type: String as PropType<ZenCornerRadius> },
  radiusTopRight: { type: String as PropType<ZenCornerRadius> },
  radiusBottomRight: { type: String as PropType<ZenCornerRadius> },
  radiusBottomLeft: { type: String as PropType<ZenCornerRadius> },
  /** Figma corner smoothing in % (a squircle). */
  cornerSmoothing: { type: Number },
  /** An image fill: the picture's URL, with its scale mode, crop and tile scale. */
  image: { type: String },
  imageFit: { type: String as PropType<ImageFillMode> },
  imageCrop: { type: Object as PropType<ImageCrop> },
  imageScale: { type: Number },
  /** A gradient fill whose stops are colour variables. */
  gradient: { type: Object as PropType<ZenGradient> },
  /** Layer opacity in percent. */
  opacity: { type: Number },
  blendMode: { type: String as PropType<ZenBlendMode> },
  /** Rotation in degrees, counter-clockwise, as Figma's. */
  rotation: { type: Number },
  flip: { type: String as PropType<FrameFlip> },
  /** A Figma effect style (shadows on `surface="surface"`, the overlay blur on subtle or pale). */
  effectStyle: { type: String as PropType<BoxEffectStyle> },
  /** The frame's own variable modes (`{ theme: "dark" }`), handed to the components inside. */
  modes: { type: Object as PropType<FrameModes> },
  /** Hides the frame at these breakpoints (it stays in the DOM). */
  hideOn: { type: Array as PropType<ResponsiveBreakpoint[]> },
  as: { type: String as PropType<LayoutElement>, default: "div" },
};

const defaultSlot = Object as SlotsType<{ default?: () => VNodeChild }>;

/* ───────────── Stack ───────────── */

/**
 * One-dimensional layout with token spacing (React: Stack). Use it instead of hand-written flex CSS.
 *
 *   <Stack gap="lg">…sections…</Stack>
 *   <Stack direction="row" gap="sm" align="center" justify="between">…toolbar…</Stack>
 *   <Stack :direction="{ desktop: 'row', mobile: 'column' }" gap="md">…stacks on phones…</Stack>
 */
export const Stack = defineComponent({
  name: "Stack",
  inheritAttrs: false,
  props: {
    ...frameProps,
    /** column (default) or row, per breakpoint too. */
    direction: { type: responsive<"column" | "row">(), default: "column" },
    /** Space between items (Figma Spacing/Gap), per breakpoint too. */
    gap: { type: responsive<ZenGap>(), default: "md" },
    /** Cross-axis alignment, per breakpoint too. */
    align: { type: responsive<"start" | "center" | "end" | "stretch" | "baseline">() },
    /** Main-axis distribution, per breakpoint too. */
    justify: { type: responsive<"start" | "center" | "end" | "between" | "around">() },
    /** Let row items wrap onto new lines, per breakpoint too. */
    wrap: { type: [Boolean, Object] as PropType<Responsive<boolean>>, default: false },
    /** Figma "Clip content". */
    clip: { type: Boolean, default: false },
    /** Figma "Overflow scrolling" along one axis. */
    scroll: { type: String as PropType<LayoutScroll> },
    /** Every child takes an equal share along the direction. */
    fillChildren: { type: Boolean, default: false },
    /** Space inside (Figma Spacing/Padding) or a page margin, per breakpoint too. */
    padding: { type: responsive<ZenPadding>() },
    paddingX: { type: responsive<ZenPadding>() },
    paddingY: { type: responsive<ZenPadding>() },
  },
  slots: defaultSlot,
  setup(props, { attrs, slots }) {
    const zen = useZen();
    const grid = inject(gridCellKey, null);
    const picture = usePictureSize(() => tiled(props.image, props.imageFit));
    return () => {
      const at = frameBreakpoint(props.modes, zen?.breakpoint);
      const scope = frameModeScope(props.modes);
      const stack = stackModel(props, { breakpoint: at, grid: grid?.() ?? null, picture: picture() });
      return h(props.as, { ...restAttrs(attrs), ...scope?.attributes, class: ["zen-stack", attrs.class], ...stack.attributes, style: [frameVars(stack.vars), attrs.style] }, scoped(scope, slots.default));
    };
  },
});

/* ───────────── Grid ───────────── */

/**
 * Two-dimensional layout for cards, tiles and form columns (React: Grid). A direct child takes several columns or rows
 * with `span` / `rowSpan`.
 *
 *   <Grid :min-column-width="280">…cards…</Grid>
 *   <Grid :columns="{ mobile: 1, desktop: 2 }" gap="lg">…fields…</Grid>
 */
export const Grid = defineComponent({
  name: "Grid",
  inheritAttrs: false,
  props: {
    ...frameProps,
    /** A column count or a track list ("2fr 1fr"), per breakpoint too; unset fits `minColumnWidth` columns. */
    columns: { type: [Number, String, Object] as PropType<GridColumns> },
    /** Auto-fill: every column is at least this wide (px or CSS length). */
    minColumnWidth: { type: [Number, String], default: 240 },
    /** Space between cells, per breakpoint too. */
    gap: { type: responsive<ZenGap>(), default: "md" },
    rowGap: { type: responsive<ZenGap>() },
    columnGap: { type: responsive<ZenGap>() },
    /** Vertical alignment of cells. */
    align: { type: String as PropType<"start" | "center" | "end" | "stretch"> },
    /** One column whenever the Grid itself is narrower than this many px. */
    stackBelow: { type: Number },
    /** Space inside, per breakpoint too. */
    padding: { type: responsive<ZenPadding>() },
    /** Figma "Clip content". */
    clip: { type: Boolean, default: false },
  },
  slots: defaultSlot,
  setup(props, { attrs, slots }) {
    const zen = useZen();
    const grid = inject(gridCellKey, null);
    const picture = usePictureSize(() => tiled(props.image, props.imageFit));
    // stackBelow: whether the element is narrower than it, measured after mount and on every resize.
    const element = shallowRef<HTMLElement | null>(null);
    const narrow = ref(false);
    onMounted(() => {
      watch(() => props.stackBelow, (below, _was, onCleanup) => {
        const node = element.value;
        if (!node || typeof below !== "number") { narrow.value = false; return; }
        const update = () => { narrow.value = node.getBoundingClientRect().width < below; };
        update();
        if (typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(update);
        observer.observe(node);
        onCleanup(() => observer.disconnect());
      }, { immediate: true });
    });
    const stacked = computed(() => typeof props.stackBelow === "number" && narrow.value);
    const at = computed(() => frameBreakpoint(props.modes, zen?.breakpoint));
    const model = computed(() => gridModel(props, { breakpoint: at.value, grid: grid?.() ?? null, picture: picture() }, stacked.value));
    // Its children's spans clamp to the columns it lays out: one while it stacks, none known in auto-fill.
    provide(gridCellKey, () => ({ columns: model.value.columns, stacked: stacked.value, breakpoint: at.value }));
    return () => {
      const scope = frameModeScope(props.modes);
      const { attributes, vars } = model.value;
      return h(props.as, { ...restAttrs(attrs), ...scope?.attributes, ref: element, class: ["zen-grid", attrs.class], ...attributes, style: [frameVars(vars), attrs.style] }, scoped(scope, slots.default));
    };
  },
});

/* ───────────── Box ───────────── */

/**
 * A frame without auto layout (React: Box, Figma's Frame): token padding, fill, stroke, corners and effect around
 * content that flows as blocks, or layers placed at X / Y. `group` is Figma's Group; `mask` clips the layers after the
 * first to its outline.
 */
export const Box = defineComponent({
  name: "Box",
  inheritAttrs: false,
  props: {
    ...frameProps,
    /** Space inside (Figma Spacing/Padding), per breakpoint too. */
    padding: { type: responsive<ZenPadding>() },
    paddingX: { type: responsive<ZenPadding>() },
    paddingY: { type: responsive<ZenPadding>() },
    /** Figma "Overflow scrolling" along one axis. */
    scroll: { type: String as PropType<LayoutScroll> },
    /** Figma's Group: no look of its own; it moves, turns, flips, fades and blends as one. */
    group: { type: Boolean, default: false },
    /** Figma's mask: the first layer's outline clips the layers after it. */
    mask: { type: Boolean, default: false },
    /** Figma "Clip content". */
    clip: { type: Boolean, default: false },
  },
  slots: defaultSlot,
  setup(props, { attrs, slots }) {
    const zen = useZen();
    const grid = inject(gridCellKey, null);
    // A group (Figma's) has no fill: no picture either.
    const picture = usePictureSize(() => (props.group ? undefined : tiled(props.image, props.imageFit)));
    // The mask (React: useBoxMask): measured after every render and when the mask layer resizes; none on the server.
    const id = maskClipId(useId());
    const element = shallowRef<HTMLElement | null>(null);
    const outline = shallowRef<MaskOutline | null>(null);
    let watched: { layer: Element; observer: ResizeObserver } | null = null;
    const measure = () => {
      const next = boxMaskOutline(element.value, props.mask);
      if (!sameMaskOutline(outline.value, next)) outline.value = next;
    };
    const sync = () => {
      measure();
      // The layer the ResizeObserver watches: the first one, which a reorder can change.
      const layer = props.mask ? element.value?.firstElementChild ?? null : null;
      if (watched?.layer === layer) return;
      watched?.observer.disconnect();
      watched = null;
      if (layer instanceof HTMLElement && typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(measure);
        observer.observe(layer);
        watched = { layer, observer };
      }
    };
    onMounted(sync);
    onUpdated(sync);
    onBeforeUnmount(() => { watched?.observer.disconnect(); watched = null; });
    return () => {
      const at = frameBreakpoint(props.modes, zen?.breakpoint);
      const scope = frameModeScope(props.modes);
      const box = boxModel(props, { breakpoint: at, grid: grid?.() ?? null, picture: picture() });
      const clip = props.mask ? outline.value : null;
      const defs = clip
        ? h("svg", { class: "zen-box__mask", width: "0", height: "0", "aria-hidden": "true", focusable: "false" }, [
            h("clipPath", { id, clipPathUnits: "userSpaceOnUse" }, [h("path", { d: clip.d, "clip-rule": clip.rule, transform: clip.transform })]),
          ])
        : null;
      const vars = { ...box.vars, ...(props.mask ? { "--zen-box-mask": clip ? `url(#${id})` : undefined } : {}) };
      return h(props.as, { ...restAttrs(attrs), ...scope?.attributes, ref: element, class: ["zen-box", attrs.class], ...box.attributes, style: [frameVars(vars), attrs.style] }, scoped(scope, slots.default, defs));
    };
  },
});

/* ───────────── Container ───────────── */

/** Centres page content at a readable width with the breakpoint's page margin (React: Container). */
export const Container = defineComponent({
  name: "Container",
  inheritAttrs: false,
  props: {
    /** Content width: sm 640 (forms) · md 960 (settings, reading) · lg 1280 (dashboards) · xl 1440 · full (list and table pages). */
    maxWidth: { type: String as PropType<ContainerWidth>, default: "lg" },
    /** Page margin on both sides from the breakpoint tokens. */
    gutter: { type: Boolean, default: true },
    as: { type: String as PropType<LayoutElement>, default: "div" },
  },
  slots: defaultSlot,
  setup(props, { attrs, slots }) {
    return () => h(props.as, { ...restAttrs(attrs), class: ["zen-container", attrs.class], style: attrs.style, ...containerModel(props) }, [slots.default?.()]);
  },
});
