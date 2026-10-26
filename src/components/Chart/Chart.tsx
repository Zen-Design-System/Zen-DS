import { useLayoutEffect, useMemo, useRef, type ReactNode, type Ref, type RefObject } from "react";
import { Card, type CardColor, type CardSpacing, type CardSurface, type CardTheme } from "../Card";
import type { LayoutCellProps } from "../Layout/cell";
import { EmptyStateCardContext } from "../EmptyState/EmptyState";
import { IconButton } from "../Button";
import { Icon } from "../Icon";
import { Segmented, type SegmentedOption } from "../Segmented";
import { useZenLabels } from "../_shared/zen-context";
import { renderIcon } from "../_shared/icon";
import type { IconName } from "../../icons/generated/names";
import { typographyStyles } from "../../tokens/typography.generated";
import "./chart.css";
import "../Icon/core";
import { useNested, type NestedOverrides } from "../_shared/nested";
import {
  ChartBlock, ChartFade, ChartLegend, PlotFrame, SeriesValues, chartFades, colourAt, defaultFormat, formatOf, meanOf, niceScale, signatureOf, staggerStyle, useChartId, useChartSelection,
  type ChartCompare, type ChartDatum, type ChartFill, type ChartFormat, type ChartPaletteName, type ChartPoint, type ChartSeries,
} from "./chartCore";
import { dataAttributes } from "../_shared/data-attributes";

export { chartPalette, type ChartCompare, type ChartDatum, type ChartFill, type ChartFormat, type ChartFormatPreset, type ChartLegendPosition, type ChartPaletteName, type ChartPoint, type ChartSeries, type ChartSlice, type ChartStack } from "./chartCore";

/** Smooth (Figma's curve: a horizontal tangent at each point) or straight segments through the points. */
function linePath(pts: readonly (readonly [number, number])[], curve: "smooth" | "linear") {
  return pts.map(([x, y], i) => {
    if (i === 0) return `M ${x} ${y}`;
    if (curve === "linear") return `L ${x} ${y}`;
    const [px, py] = pts[i - 1];
    const cx = (px + x) / 2;
    return `C ${cx} ${py} ${cx} ${y} ${x} ${y}`;
  }).join(" ");
}

/** The legend and Tooltip dots of the line and its comparison (the lines themselves are drawn in chart.css):
 *  Background/Accent/Solid and Background/Neutral/Solid, as the user's Figma legend. */
const LINE_SWATCH = "var(--zen-color-background-accent-solid-default, #ff66d4)";
const COMPARE_SWATCH = "var(--zen-color-background-neutral-solid-default, #111)";

export interface LineChartProps {
  /** One point per period (`{ label, value }`). Keep 4–12 periods. */
  data: ChartPoint[];
  /** What the line measures ("Invoiced"), named in the legend and the summary once there is a `compare`. Default: the
   *  aria-label. */
  label?: string;
  /** A comparison over the same periods — last year, the plan, what was collected — drawn as a 2px Border/Neutral/Solid
   *  line at 40%, dashed 4 / 5, with a legend (Figma Chart/Multi-Line-Chart): one value per point of `data`, in order. */
  compare?: ChartCompare;
  /** How axis labels, the Tooltip and the summary read: a function (`(v) => v + " GB"`), or a preset a Zen Studio page
   *  can write as text — `"compact"` 1.2K (the default), `"currency"` $1.2K (in `currency`), `"percent"` 41%. */
  format?: ChartFormat;
  /** The currency of `format="currency"`: an ISO 4217 code ("USD", the default; "EUR", "VND"). Set alone it implies
   *  `format="currency"`. */
  currency?: string;
  /** Height of the plot in px, lanes included (a seventh of it for the Tooltip lane on top and one for the X labels below,
   *  as Figma's 14-row Trend grid). */
  height?: number;
  /** What the chart shows and over which range ("Revenue invoiced per month, Apr – Sep 2026"). */
  "aria-label": string;
  className?: string;
  /** Forwarded to the root `<div>` (the chart block that holds the plot and its legend). */
  ref?: Ref<HTMLDivElement>;
  /** The point active at first (its Tooltip shows). Default: the last one. */
  initialIndex?: number;
  /** `smooth` (default, Figma's curve) or `linear` segments. */
  curve?: "smooth" | "linear";
  /** The area under the line: `area` (default: Figma's fade, Accent/Solid at the top to Accent/Subtle at the baseline, at
   *  30%) or `none`; `gradient` is deprecated and draws the same area. */
  fill?: ChartFill;
  /** The legend of the line and its comparison (default on with `compare`; colour is never the only key). */
  showLegend?: boolean;
  /** Legend above or below the plot (default bottom). */
  legendPosition?: "top" | "bottom";
  /** Draw the line in from the left on mount and when the data changes (default true; reduced motion fades). */
  animate?: boolean;
  /** A dotted line at the mean of the line (not the comparison), tagged "Avg $95.4K" (Figma Show Average). */
  showAverage?: boolean;
}

/**
 * Figma Chart/Line-Chart (6643:63324): an Accent/Solid 2px line over an area fading Accent/Solid → Accent/Subtle, on a
 * dashed Border/Neutral/Pale grid with 6 Y labels; each X value is a sector, the active one marked by an Active/Accent/Solid
 * rule (idle sectors draw none, as Figma's Sector Default) and a Tooltip with its value. Like Figma's Chart-Visual it starts at the plot's left edge (level
 * with the first value) and ends on the last sector's centre. With `compare` it is Figma Chart/Multi-Line-Chart (set
 * 15501:3054, Sector 4 · 6 · 7 · 12): the same chart plus one dashed Border/Neutral/Solid line at 40%, both values in the
 * Tooltip and a legend. ←/→, Home/End move between points.
 */
export function LineChart({ data, label, compare, format: formatProp, currency, height = 280, "aria-label": ariaLabel, className, initialIndex, curve = "smooth", fill = "area", showLegend = true, legendPosition = "bottom", animate = true, showAverage = false, ref, ...rest }: LineChartProps) {
  const format = formatOf(formatProp, currency);
  const t = useZenLabels();
  const values = data.map((d) => d.value);
  const compared = compare ? data.map((_, i) => compare.values[i] ?? 0) : undefined;
  const signature = signatureOf([values, compared ?? null]);
  const { top, ticks } = useMemo(() => niceScale(Math.max(0, ...values, ...(compared ?? []))), [signature]); // eslint-disable-line react-hooks/exhaustive-deps -- deliberate content-hash memo: keyed on the data signature, not its identity
  const { active, setActive, onKeyDown } = useChartSelection(data.length, initialIndex ?? data.length - 1);
  const n = Math.max(1, data.length);
  const pointsOf = (list: number[]) => list.map((v, i) => [((i + 0.5) / n) * 100, 100 - (v / top) * 100] as const);
  const pts = pointsOf(values);
  // Figma's Chart-Visual spans from the plot's left edge: each line runs in level from x 0 to its first point.
  const leadIn = (list: readonly (readonly [number, number])[]) => (list.length ? [[0, list[0][1]] as const, ...list] : list);
  const path = linePath(leadIn(pts), curve);
  const area = pts.length ? `${path} L ${pts[pts.length - 1][0]} 100 L 0 100 Z` : "";
  const fadeId = `zen-chart-fade-${useChartId()}`;
  const comparePts = compared ? pointsOf(compared) : undefined;
  const name = label ?? ariaLabel;
  const current = active === null ? undefined : data[active];
  const position = current ? ` (${t.chartPoint(active! + 1, data.length)})` : "";
  const tooltip = !current ? null : compared
    ? <SeriesValues items={[{ id: "value", color: LINE_SWATCH, value: format(current.value) }, { id: "compare", color: COMPARE_SWATCH, value: format(compared[active!]) }]} />
    : format(current.value);
  const summary = !current ? t.noData : compared
    ? `${current.label}: ${name} ${format(current.value)}, ${compare!.label} ${format(compared[active!])}${position}`
    : `${current.label}: ${format(current.value)}${position}`;
  // Start-aligned, as Figma Chart/Multi-Line-Chart's Legend (15426:2587 and the other Sector variants: MIN).
  const legend = compare && showLegend ? <ChartLegend align="start" items={[{ id: "value", label: name, color: LINE_SWATCH }, { id: "compare", label: compare.label, color: COMPARE_SWATCH }]} /> : undefined;
  const mean = showAverage ? meanOf(values) : undefined;
  return (
    <ChartBlock {...dataAttributes(rest)} ref={ref} kind="line" legend={legend} position={legendPosition}>
      <PlotFrame labels={data.map((d) => d.label)} ticks={ticks} top={top} format={format} active={active} setActive={setActive} onKeyDown={onKeyDown} height={height} ariaLabel={ariaLabel} activeLine="accent" className={className} kind="line" animate={animate}
        tooltip={tooltip} summary={mean === undefined ? summary : `${summary}; ${t.chartAverageLong(format(mean))}`} average={mean === undefined ? undefined : { value: mean, label: t.chartAverage(format(mean)) }}>
        <div className="zen-chart__marks" key={signature}>
          <svg className="zen-chart__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Figma Trend › Chart-Visual › Base: a vertical fade over the area's bounds, Accent/Solid → Accent/Subtle. */}
            {fill === "none" ? null : (
              <>
                <defs><ChartFade id={fadeId} top={chartFades[0][0]} bottom={chartFades[0][1]} /></defs>
                <path className="zen-chart__area" d={area} fill={`url(#${fadeId})`} />
              </>
            )}
            {comparePts ? <path d={linePath(leadIn(comparePts), curve)} className="zen-chart__line" data-compare="true" vectorEffect="non-scaling-stroke" /> : null}
            <path d={path} className="zen-chart__line" vectorEffect="non-scaling-stroke" />
          </svg>
          {/* The active dots sit in the wiped layer, so each appears as the line reaches it. */}
          {active !== null && comparePts ? <span className="zen-chart__dot" data-compare="true" style={{ left: `${comparePts[active][0]}%`, top: `${comparePts[active][1]}%` }} /> : null}
          {active !== null && pts[active] ? <span className="zen-chart__dot" style={{ left: `${pts[active][0]}%`, top: `${pts[active][1]}%` }} /> : null}
        </div>
      </PlotFrame>
    </ChartBlock>
  );
}

export interface StackBarChartProps {
  /** One column per period, a value per series id (`{ label: "Sep", values: { design: 2650, … } }`). */
  data: ChartDatum[];
  /** The stacked series, bottom first, in palette order unless a series sets `color`. */
  series: ChartSeries[];
  /** How axis labels, the Tooltip total and the summary read: a function, or a preset a Zen Studio page can write
   *  as text: `"compact"` 1.2K, `"currency"` $1.2K (in `currency`), `"percent"` 41%. Default: 1.2K. */
  format?: ChartFormat;
  /** The currency of `format="currency"`: an ISO 4217 code ("USD", the default; "EUR", "VND"). Set alone it implies
   *  `format="currency"`. */
  currency?: string;
  /** Height of the plot in px, lanes included. */
  height?: number;
  /** What the chart shows and over which range. */
  "aria-label": string;
  className?: string;
  /** Forwarded to the root `<div>` (the chart block that holds the plot and its legend). */
  ref?: Ref<HTMLDivElement>;
  /** The column active at first. Default: the last one. */
  initialIndex?: number;
  /** The legend names every colour; keep it (harness: chart/stack-needs-legend). */
  showLegend?: boolean;
  /** Legend above or below the plot (default bottom). */
  legendPosition?: "top" | "bottom";
  /** Grow the columns from the baseline on mount and when the data changes (default true; reduced motion fades). */
  animate?: boolean;
  /** A dotted line at the mean of the column totals, tagged "Avg 5.9K h" (Figma Show Average). */
  showAverage?: boolean;
  /** Figma Color: `primary` (default) stacks the series in palette order; `secondary` swaps the first two (the bottom
   *  segment Color Chart Sector/Secondary, the next Sector/Primary). A series' own `color` still wins. */
  palette?: ChartPaletteName;
}

/**
 * Figma Chart/Stack-Bar-Chart (6643:73471; Color=Primary · Secondary ↔ `palette`): one column per sector (2px side padding, Corner-Radius/Small on the column),
 * segments in series order from the bottom, a 12px-dot legend (Caption/Regular), and a Tooltip with the active total.
 */
export function StackBarChart({ data, series, format: formatProp, currency, height = 236, "aria-label": ariaLabel, className, initialIndex, showLegend = true, legendPosition = "bottom", animate = true, showAverage = false, palette = "primary", ref, ...rest }: StackBarChartProps) {
  const format = formatOf(formatProp, currency);
  const t = useZenLabels();
  const totals = data.map((d) => series.reduce((sum, s) => sum + (d.values[s.id] ?? 0), 0));
  const { top, ticks } = useMemo(() => niceScale(Math.max(0, ...totals)), [totals.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps -- deliberate content-hash memo: keyed on the data signature, not its identity
  const { active, setActive, onKeyDown } = useChartSelection(data.length, initialIndex ?? data.length - 1);
  const current = active === null ? undefined : data[active];
  const legend = showLegend ? <ChartLegend items={series.map((s, si) => ({ id: s.id, label: s.label, color: colourAt(s, si, palette) }))} /> : undefined;
  const mean = showAverage ? meanOf(totals) : undefined;
  const summary = current ? `${current.label}: ${t.chartTotal(format(totals[active!]))}; ${series.map((s) => `${s.label} ${format(current.values[s.id] ?? 0)}`).join(", ")}` : t.noData;
  return (
    <ChartBlock {...dataAttributes(rest)} ref={ref} kind="stack" legend={legend} position={legendPosition} className="zen-chart-stack" palette={palette}>
      <PlotFrame labels={data.map((d) => d.label)} ticks={ticks} top={top} format={format} active={active} setActive={setActive} onKeyDown={onKeyDown} height={height} ariaLabel={ariaLabel} activeLine="neutral" className={className} kind="stack" animate={animate}
        tooltip={current ? format(totals[active!]) : null}
        summary={mean === undefined ? summary : `${summary}; ${t.chartAverageLong(format(mean))}`} average={mean === undefined ? undefined : { value: mean, label: t.chartAverage(format(mean)) }}>
        <div className="zen-chart__bars" key={totals.join(",")}>
          {data.map((d, i) => (
            <span key={d.label + i} className="zen-chart__column" data-active={i === active ? "true" : undefined}>
              <span className="zen-chart__stack" style={staggerStyle(i, { height: `${(totals[i] / top) * 100}%` })}>
                {series.map((s, si) => {
                  const v = d.values[s.id] ?? 0;
                  return v > 0 ? <span key={s.id} className="zen-chart__segment" style={{ flexGrow: v, background: colourAt(s, si, palette) }} /> : null;
                })}
              </span>
            </span>
          ))}
        </div>
      </PlotFrame>
    </ChartBlock>
  );
}

/** `span` / `rowSpan`: the card's columns and rows in its Grid (a hero chart over 8 of 12 columns). */
export interface ChartCardProps extends LayoutCellProps {
  /** Figma Header Label (Body/Extra/Medium, 2026-10-21). */
  title: ReactNode;
  /** Heading level of the title: one level below the nearest heading above (default 3: a card inside an h2 section; 2
   *  when the card sits directly under the page h1). The look stays Body/Extra/Medium — the level follows the outline,
   *  not the size. An EmptyState in `children` takes the next level in Body/Extra/Bold, below the card title. */
  headingLevel?: 2 | 3 | 4;
  /** Icon before the title (20px, Content/Neutral/Strongest): an icon name or a node. Decorative; the title names the card. */
  icon?: IconName | ReactNode;
  /** What the figure is ("Available revenue in your wallet"), Body/Small/Regular: the top of Figma's Metric, under the
   *  Segmented (Chart/Line-Chart: Padding/Small above, Gap/3XSmall to the value). */
  description?: ReactNode;
  /** The headline figure the chart explains ("$4,346.00"), Display/4 (Figma Chart-Card Metric > Value), under the
   *  description and the Segmented. */
  value?: ReactNode;
  /** Figma Header trailing Button/Icon-Main XSmall Tertiary (chevron): opens the full report. */
  onOpen?: () => void;
  /** Accessible name of the open button. Default: the locale's “Open report”. */
  openLabel?: string;
  /** Figma Segmented (Secondary) range switch. */
  ranges?: SegmentedOption[];
  range?: string;
  onRangeChange?: (id: string) => void;
  /** The range switch fills the card and splits it into equal items (Figma Segmented FILL, default); `false` hugs its
   *  items, as on a wide card where a full-width switch would stretch far past its labels (Figma HUG). */
  rangesFullWidth?: boolean;
  /** Figma nested Card Theme: Default (default, the Surface alone) inside a panel or section; Shadow when the chart card
   *  sits on the canvas next to other Shadow cards (metric cards on a dashboard); the other themes follow the Card rules
   *  for the page's Canvas (harness theme/box-on-canvas). */
  theme?: CardTheme;
  /** Figma nested Card Color, for theme="pale", "subtle" or "solid": the Card's hue (Solid Neutral is the dark widget; see Card). */
  color?: CardColor;
  /** Figma nested Card Surface: default · alt (Default, Border); see Card. A chart on a Canvas/Flat page takes theme="flat-border". */
  surface?: CardSurface;
  /** Figma nested Card Spacing: Medium (default; Card-padding-medium, Corner-Radius/2XLarge) · Small (Card-padding-small,
   *  Corner-Radius/Large) · XSmall (Card-padding-xsmall, Corner-Radius/Base), for a chart in a narrow tile or a row of
   *  several on a phone. Short (md, sm, xs) or Figma (medium, small, xsmall) spelling. */
  spacing?: CardSpacing;
  /** The chart, or an EmptyState before there is data (keep the card title; the Empty State is set one level below it). */
  children: ReactNode;
  className?: string;
  /** Forwarded to the Card's root `<div>`. */
  ref?: Ref<HTMLDivElement>;
  /** Figma instance overrides: props of the open button and range control it draws, by layer (`{ Open: { level: "secondary" }, "Ranges/Item[week]": { level: "primary" } }`). Written by Zen Studio;
   *  app code sets onOpen / ranges. */
  overrides?: NestedOverrides;
}

/** An element's border-box height in layout px: as precise as the layout (offsetHeight rounds) and unscaled by any
 *  transform around it (getBoundingClientRect is not). */
function layoutHeight(element: HTMLElement) {
  const style = getComputedStyle(element);
  const height = Number.parseFloat(style.height);
  if (!Number.isFinite(height)) return element.offsetHeight;
  if (style.boxSizing === "border-box") return height;
  return height + (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0) + (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
}

/**
 * A Chart Card stretched by its grid row (Figma's cards hug, so this is code's call; the user 2026-10-16: "scale the
 * chart"): the free height under the content goes to the chart as `--zen-chart-grow`. Plots add it to their height, rings
 * to their size, row charts spread their rows (chart.css); what cannot grow sits in the middle of what is left.
 *
 * Every card on the page is measured together, with every grow off (growCards): measured alone with the other cards still
 * grown, two cards of a row held each other up, so a card that was briefly taller (a range switch, a late font) left its
 * row that much taller for good; and the page paid one layout per card. Measured in layout px (layoutHeight): inside a
 * scaled preview (Zen Studio's canvas) getBoundingClientRect is the zoom times larger, and mixed with the CSS gap the grow
 * came out the zoom times too small, or, above 100 %, fed itself (80 M px at 240 %, 2026-10-25).
 */
function useChartGrow(body: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const node = body.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    growCards.add(node);
    return () => growCards.remove(node);
  }, [body]);
  // Every render: watch the children there are now (a range switch, a metric or an EmptyState may come and go).
  useLayoutEffect(() => {
    if (body.current) growCards.sync(body.current);
  });
}

/** The ChartCard bodies on the page and the one observer that watches them and their children: a change to any of them
 *  measures them all (every grow off, every height read, every grow written: one layout). */
const growCards = (() => {
  const children = new Map<HTMLElement, Set<Element>>();
  let observer: ResizeObserver | null = null;
  const measure = () => {
    const bodies = Array.from(children.keys()).filter((node) => node.isConnected);
    for (const node of bodies) node.style.setProperty("--zen-chart-grow", "0px");
    const frees = bodies.map((node) => {
      const items = Array.from(node.children) as HTMLElement[];
      if (items.length < 2) return 0;
      const gap = parseFloat(getComputedStyle(node).rowGap) || 0;
      const natural = items.reduce((sum, item) => sum + layoutHeight(item), 0) + gap * (items.length - 1);
      return Math.floor(layoutHeight(node) - natural);
    });
    bodies.forEach((node, index) => { if (frees[index] > 0) node.style.setProperty("--zen-chart-grow", `${frees[index]}px`); });
  };
  // Cards that mount measure once the commit is done, before the first paint (one layout for all of them). A change
  // after that measures on the next frame: measured inside the observer's callback, a change to a card's child (a
  // header, the chart) resized the bodies above it, which the observer can no longer report that frame ("ResizeObserver
  // loop completed with undelivered notifications").
  let mountQueued = false;
  let frame = 0;
  const measureAfterCommit = () => {
    if (mountQueued) return;
    mountQueued = true;
    queueMicrotask(() => { mountQueued = false; measure(); });
  };
  const measureNextFrame = () => {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; measure(); });
  };
  /** Observes the card's new children once (observing one again would report it again) and lets go of the gone. Border
   *  boxes: a padding change (a density mode, the metric's top padding) moves the free height too. */
  const sync = (node: HTMLElement) => {
    const watched = children.get(node);
    if (!watched || !observer) return;
    const now = new Set<Element>(Array.from(node.children));
    for (const child of watched) if (!now.has(child)) { observer.unobserve(child); watched.delete(child); }
    for (const child of now) if (!watched.has(child)) { observer.observe(child, { box: "border-box" }); watched.add(child); }
  };
  const add = (node: HTMLElement) => {
    observer ??= new ResizeObserver(measureNextFrame);
    children.set(node, new Set());
    observer.observe(node, { box: "border-box" });
    sync(node);
    measureAfterCommit();
  };
  const remove = (node: HTMLElement) => {
    const watched = children.get(node);
    if (!watched || !observer) return;
    for (const child of watched) observer.unobserve(child);
    observer.unobserve(node);
    children.delete(node);
    if (!children.size) {
      observer.disconnect();
      observer = null;
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
  return { add, sync, remove };
})();

/**
 * Figma Chart/Chart-Card (6643:63528): Card Flat Medium (padding 24, radius 24) → header · Segmented · chart, gap 16.
 * The header row holds an optional icon, the title and the open chevron; a description and the headline value follow it
 * (every Figma chart card's Show Icon · Icon · Title · Show Description · Description · Show Value · Value · Show Ranges ·
 * Show Open properties).
 */
export function ChartCard({ title, headingLevel = 3, icon, description, value, onOpen, openLabel: openLabelProp, ranges, range, onRangeChange, rangesFullWidth = true, theme = "default", color, surface, spacing = "medium", children, className, overrides, ref, ...rest }: ChartCardProps) {
  const nest = useNested(overrides);
  const t = useZenLabels();
  const openLabel = openLabelProp ?? t.openReport;
  const Title = `h${headingLevel}` as const;
  const body = useRef<HTMLDivElement>(null);
  useChartGrow(body);
  const hasValue = value !== undefined && value !== null && value !== false;
  return (
    <Card {...dataAttributes(rest)} span={rest.span} rowSpan={rest.rowSpan} ref={ref} theme={theme} color={color} spacing={spacing} surface={surface} className={["zen-chart-card", className].filter(Boolean).join(" ")}>
      <div ref={body} className="zen-chart-card__body">
        <div className="zen-chart-card__header">
          <div className="zen-chart-card__titlebar">
            {icon ? <span className="zen-chart-card__icon" aria-hidden="true">{renderIcon(icon, { size: 20 })}</span> : null}
            <Title className={`zen-chart-card__title ${typographyStyles["Body/Extra/Medium"]}`}>{nest.slot(title)}</Title>
            {onOpen ? nest("Open", <IconButton appearance="main" level="tertiary" size="2xs" aria-label={openLabel} onClick={onOpen} icon={<Icon name="icon-chevron-right-line-small" />} />) : null}
          </div>
        </div>
        {ranges?.length ? nest("Ranges", <Segmented options={ranges} value={range} onValueChange={onRangeChange} fullWidth={rangesFullWidth} aria-label={t.range} />) : null}
        {/* Figma Metric (Chart/Line-Chart, 2026-10-21): the description over the value, always under the Segmented. */}
        {description || hasValue ? (
          <div className="zen-chart-card__metric">
            {description ? <p className={`zen-chart-card__description ${typographyStyles["Body/Small/Regular"]}`}>{description}</p> : null}
            {hasValue ? <p className={`zen-chart-card__value ${typographyStyles["Display/4"]}`}>{value}</p> : null}
          </div>
        ) : null}
        <EmptyStateCardContext.Provider value={headingLevel}>{nest.slot(children)}</EmptyStateCardContext.Provider>
      </div>
    </Card>
  );
}
