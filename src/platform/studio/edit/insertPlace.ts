/*
 * Where a click-inserted layer lands in a frame without auto layout (Figma's frame; a Screen with no layout root, a Box
 * whose layers float). The user's decision for docs/research/studio-ux-review-2026-10-27.md §2.4 (A, 2026-10-27): an
 * inserted component keeps its own size and lands beside the selection with the page gap, as Figma inserts an instance
 * at its own size; never a block stretched to the Screen's width. Pure (no DOM, erasable TypeScript), so
 * `node insertPlace.selftest.mjs` imports it; the clipboard (edit/clipboard.ts pasteAt) reads the canvas and calls it.
 */

/** The page gap between inserted layers: Spacing/Gap/Medium, the widget gap of component-usage-rules §13 (a widget grid
 *  is one section with md 16 between its cards) and of the dashboard rule. */
export const PAGE_GAP = 16;
/** The page margin from the frame's edges: `margin-comfortable` (Spacing/Padding/XLarge 24 on desktop and tablet, 20
 *  on a phone), the padding a page's root Stack takes. */
export const PAGE_MARGIN_DESKTOP = 24;
export const PAGE_MARGIN_PHONE = 20;
/** A widget never narrower than this when the frame gives it a width (a KPI card, a chart card). */
export const WIDGET_MIN_WIDTH = 320;

export type PlaceBox = { x: number; y: number; width: number; height: number };

/** Components with no width of their own: a chart's plot is `minmax(0, 1fr)`, a bar or a line fills its row; in a
 *  shrink-to-fit box they collapse, so their floating Box gets the widget width (widgetWidthIn). Everything else hugs
 *  its content (a Metric card its label and value, a Table its columns, a Button its label). */
const WIDTHLESS = new Set(["ChartCard", "LineChart", "AreaChart", "BarChart", "StackBarChart", "GroupedBarChart", "ComboChart", "HeatmapChart", "DonutChart", "RadialChart", "GaugeChart", "FunnelChart", "BarList", "BulletChart", "Divider", "ProgressBar", "Slider", "SliderField", "AlertBanner", "InlineMessage", "SkeletonText", "SkeletonHeading"]);
export const needsWidth = (root: string) => WIDTHLESS.has(root);

export const pageMarginFor = (device: string | null | undefined) => (device === "phone" ? PAGE_MARGIN_PHONE : PAGE_MARGIN_DESKTOP);

/**
 * The width a component with no width of its own (a chart card: its plot is `minmax(0, 1fr)` and collapses in a
 * shrink-to-fit box) floats at in a frame `blockWidth` wide: a third of the content row between the page margins (the
 * dashboard rule's row of three KPI cards: 477 on a 1512 Screen), at least WIDGET_MIN_WIDTH; on a phone the whole row.
 */
export function widgetWidthIn(blockWidth: number, device: string | null | undefined, gap = PAGE_GAP, margin = pageMarginFor(device)): number {
  const row = Math.max(0, blockWidth - 2 * margin);
  if (device === "phone") return Math.round(row);
  return Math.max(WIDGET_MIN_WIDTH, Math.floor((row - 2 * gap) / 3));
}

/**
 * Where the new layer floats, in the frame's own px: beside the reference layer (`beside`: the selection; none: the
 * frame's last layer), to its right the page gap apart with their tops aligned; a new row at the page margin, the gap
 * under the lowest layer, when that spot would pass the frame's right margin (judged with `width`, the new layer's when
 * it is known, else the reference's: the common case inserts another of the same kind); the margin corner in an empty
 * frame. Figma's insert places at the pointer or the view's centre; a click in Assets has no pointer on the canvas, so
 * the layers form the row a person would drag them into, and ⇧A then makes it an auto layout.
 */
export function freeInsertAt(block: { width: number }, layers: readonly PlaceBox[], beside: PlaceBox | null, width: number | null, options: { gap?: number; margin?: number } = {}): { x: number; y: number } {
  const gap = options.gap ?? PAGE_GAP;
  const margin = options.margin ?? PAGE_MARGIN_DESKTOP;
  const reference = beside ?? layers[layers.length - 1] ?? null;
  if (!reference) return { x: margin, y: margin };
  const x = reference.x + reference.width + gap;
  const estimate = width ?? reference.width;
  if (x + estimate <= block.width - margin + 0.5) return { x: Math.round(x), y: Math.round(reference.y) };
  const bottom = Math.max(reference.y + reference.height, ...layers.map((layer) => layer.y + layer.height));
  return { x: margin, y: Math.round(bottom + gap) };
}
