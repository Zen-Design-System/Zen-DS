import { useId, useMemo, type CSSProperties, type ReactNode } from "react";
import { Card, type CardSurface, type CardTheme } from "../Card";
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
  ChartBlock, ChartLegend, PlotFrame, SeriesValues, colourAt, defaultFormat, meanOf, niceScale, signatureOf, staggerStyle, useChartSelection,
  type ChartDatum, type ChartFill, type ChartPoint, type ChartSeries,
} from "./chartCore";

export { chartPalette, type ChartDatum, type ChartFill, type ChartLegendPosition, type ChartPoint, type ChartSeries, type ChartSlice, type ChartStack } from "./chartCore";

const isDatum = (item: ChartPoint | ChartDatum): item is ChartDatum => "values" in item;

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

/** The area under a line as a CSS mask, so a hatch keeps square 45° stripes in a plot that stretches to any size. */
const areaMask = (area: string) => {
  const url = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path d='${area}'/></svg>`)}")`;
  return { maskImage: url, WebkitMaskImage: url } as CSSProperties;
};

export interface LineChartProps {
  /** One point per period (`{ label, value }`) for one measure, or with `series` one value per series per period
   *  (`{ label, values: { income: 320, expenses: 210 } }`). Keep 4–12 periods. */
  data: ChartPoint[] | ChartDatum[];
  /** Two to four series drawn in palette order (Chart/Sector/Primary, Secondary, Support Cyan…), with a legend. Mark a
   *  comparison `dashed`; give the measured one a `fill`. Omit for one measure: an Accent line over an Accent area. */
  series?: ChartSeries[];
  /** Formats axis labels, the Tooltip and the summary (`$23.4K`, `52 GB`). Default: 1.2K. */
  format?: (value: number) => string;
  /** Height of the plot in px, lanes included (36px Tooltip lane on top, 28px X labels below). */
  height?: number;
  /** What the chart shows and over which range ("Revenue invoiced per month, Apr – Sep 2026"). */
  "aria-label": string;
  className?: string;
  /** The point active at first (its Tooltip shows). Default: the last one. */
  initialIndex?: number;
  /** `smooth` (default, Figma's curve) or `linear` segments. */
  curve?: "smooth" | "linear";
  /** One measure: the area under the line — `gradient` (default, Accent/Solid → Accent/Subtle), `hatch` or `none`. */
  fill?: ChartFill;
  /** Series legend (default on when there are series; colour is never the only key). */
  showLegend?: boolean;
  /** Legend above or below the plot (default bottom). */
  legendPosition?: "top" | "bottom";
  /** Draw the line in from the left on mount and when the data changes (default true; reduced motion fades). */
  animate?: boolean;
  /** A dotted line at the mean of the series (the first one with `series`), tagged "Avg $95.4K" (Figma Show Average). */
  showAverage?: boolean;
}

/**
 * Figma Chart/Line-Chart (6643:63324): an Accent/Solid 2px line over an area fading Accent/Solid → Accent/Subtle, on a
 * dashed Border/Neutral/Pale grid with 6 Y labels; each X value is a sector (Active/Accent/Subtle rule, Solid when active)
 * and the active sector shows a Tooltip with its value. With `series`: one 2px line per series in palette order (a
 * `dashed` comparison, a gradient or hatched `fill`) and a legend: Figma Chart/Multi-Line-Chart 15323:80980 (Fill=Hatch ·
 * None). ←/→, Home/End move between points.
 */
export function LineChart({ data, series, format = defaultFormat, height = 280, "aria-label": ariaLabel, className, initialIndex, curve = "smooth", fill, showLegend = true, legendPosition = "bottom", animate = true, showAverage = false }: LineChartProps) {
  const t = useZenLabels();
  const multi = Boolean(series?.length);
  const lines: ChartSeries[] = multi ? series! : [{ id: "value", label: ariaLabel, fill: fill ?? "gradient" }];
  const valueOf = (d: ChartPoint | ChartDatum, id: string) => (isDatum(d) ? d.values[id] ?? 0 : d.value);
  const values = data.map((d) => lines.map((s) => valueOf(d, s.id)));
  const signature = signatureOf(values);
  const { top, ticks } = useMemo(() => niceScale(Math.max(0, ...values.flat())), [signature]); // eslint-disable-line react-hooks/exhaustive-deps
  const { active, setActive, onKeyDown } = useChartSelection(data.length, initialIndex ?? data.length - 1);
  const gradientId = useId().replace(/:/g, "");
  const n = Math.max(1, data.length);
  const drawn = lines.map((s, si) => {
    const pts = data.map((d, i) => [((i + 0.5) / n) * 100, 100 - (valueOf(d, s.id) / top) * 100] as const);
    const path = linePath(pts, curve);
    const area = pts.length ? `${path} L ${pts[pts.length - 1][0]} 100 L ${pts[0][0]} 100 Z` : "";
    return { s, si, pts, path, area, colour: multi ? colourAt(s, si) : "var(--zen-color-border-accent-solid-default, #ff66d4)", fill: s.fill ?? (multi ? "none" : "gradient") };
  });
  const current = active === null ? undefined : data[active];
  const position = current ? ` (${t.chartPoint(active! + 1, data.length)})` : "";
  const tooltip = !current ? null : multi
    ? <SeriesValues items={drawn.map((l) => ({ id: l.s.id, color: l.colour, value: format(valueOf(current, l.s.id)) }))} />
    : format(valueOf(current, "value"));
  const summary = !current ? t.noData : multi
    ? `${current.label}: ${drawn.map((l) => `${l.s.label} ${format(valueOf(current, l.s.id))}`).join(", ")}${position}`
    : `${current.label}: ${format(valueOf(current, "value"))}${position}`;
  const legend = multi && showLegend ? <ChartLegend items={drawn.map((l) => ({ id: l.s.id, label: l.s.label, color: l.colour }))} /> : undefined;
  const mean = showAverage ? meanOf(values.map((row) => row[0])) : undefined;
  return (
    <ChartBlock kind="line" legend={legend} position={legendPosition}>
      <PlotFrame labels={data.map((d) => d.label)} ticks={ticks} top={top} format={format} active={active} setActive={setActive} onKeyDown={onKeyDown} height={height} ariaLabel={ariaLabel} activeLine="accent" className={className} kind="line" animate={animate}
        tooltip={tooltip} summary={mean === undefined ? summary : `${summary}; ${t.chartAverageLong(format(mean))}`} average={mean === undefined ? undefined : { value: mean, label: t.chartAverage(format(mean)) }}>
        <div className="zen-chart__marks" key={signature}>
          {drawn.filter((l) => l.fill === "hatch" && l.area).map((l) => <span key={`h-${l.s.id}`} className="zen-chart__hatch" style={{ "--zen-chart-colour": l.colour, ...areaMask(l.area) } as CSSProperties} />)}
          <svg className="zen-chart__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              {drawn.filter((l) => l.fill === "gradient").map((l) => (
                <linearGradient key={l.s.id} id={`${gradientId}-${l.si}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={multi ? l.colour : "var(--zen-color-background-accent-solid-default, #ff66d4)"} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={multi ? l.colour : "var(--zen-color-background-accent-subtle-default, #ff029817)"} stopOpacity={multi ? 0.02 : 0.4} />
                </linearGradient>
              ))}
            </defs>
            {drawn.filter((l) => l.fill === "gradient").map((l) => <path key={`a-${l.s.id}`} className="zen-chart__area" d={l.area} fill={`url(#${gradientId}-${l.si})`} />)}
            {drawn.map((l) => <path key={`l-${l.s.id}`} d={l.path} className="zen-chart__line" data-dashed={l.s.dashed ? "true" : undefined} style={multi ? { stroke: l.colour } : undefined} vectorEffect="non-scaling-stroke" />)}
          </svg>
          {/* The active dots sit in the wiped layer, so each appears as the line reaches it. */}
          {active !== null ? drawn.map((l) => <span key={`d-${l.s.id}`} className="zen-chart__dot" style={{ left: `${l.pts[active][0]}%`, top: `${l.pts[active][1]}%`, ...(multi ? { borderColor: l.colour } : null) }} />) : null}
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
  /** Formats axis labels, the Tooltip total and the summary. */
  format?: (value: number) => string;
  /** Height of the plot in px, lanes included. */
  height?: number;
  /** What the chart shows and over which range. */
  "aria-label": string;
  className?: string;
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
}

/**
 * Figma Chart/Stack-Bar-Chart (6643:73471): one column per sector (2px side padding, Corner-Radius/Small on the column),
 * segments in series order from the bottom, a 12px-dot legend (Caption/Regular), and a Tooltip with the active total.
 */
export function StackBarChart({ data, series, format = defaultFormat, height = 236, "aria-label": ariaLabel, className, initialIndex, showLegend = true, legendPosition = "bottom", animate = true, showAverage = false }: StackBarChartProps) {
  const t = useZenLabels();
  const totals = data.map((d) => series.reduce((sum, s) => sum + (d.values[s.id] ?? 0), 0));
  const { top, ticks } = useMemo(() => niceScale(Math.max(0, ...totals)), [totals.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const { active, setActive, onKeyDown } = useChartSelection(data.length, initialIndex ?? data.length - 1);
  const current = active === null ? undefined : data[active];
  const legend = showLegend ? <ChartLegend items={series.map((s, si) => ({ id: s.id, label: s.label, color: colourAt(s, si) }))} /> : undefined;
  const mean = showAverage ? meanOf(totals) : undefined;
  const summary = current ? `${current.label}: ${t.chartTotal(format(totals[active!]))}; ${series.map((s) => `${s.label} ${format(current.values[s.id] ?? 0)}`).join(", ")}` : t.noData;
  return (
    <ChartBlock kind="stack" legend={legend} position={legendPosition} className="zen-chart-stack">
      <PlotFrame labels={data.map((d) => d.label)} ticks={ticks} top={top} format={format} active={active} setActive={setActive} onKeyDown={onKeyDown} height={height} ariaLabel={ariaLabel} activeLine="neutral" className={className} kind="stack" animate={animate}
        tooltip={current ? format(totals[active!]) : null}
        summary={mean === undefined ? summary : `${summary}; ${t.chartAverageLong(format(mean))}`} average={mean === undefined ? undefined : { value: mean, label: t.chartAverage(format(mean)) }}>
        <div className="zen-chart__bars" key={totals.join(",")}>
          {data.map((d, i) => (
            <span key={d.label + i} className="zen-chart__column" data-active={i === active ? "true" : undefined}>
              <span className="zen-chart__stack" style={staggerStyle(i, { height: `${(totals[i] / top) * 100}%` })}>
                {series.map((s, si) => {
                  const v = d.values[s.id] ?? 0;
                  return v > 0 ? <span key={s.id} className="zen-chart__segment" style={{ flexGrow: v, background: colourAt(s, si) }} /> : null;
                })}
              </span>
            </span>
          ))}
        </div>
      </PlotFrame>
    </ChartBlock>
  );
}

export interface ChartCardProps {
  /** Figma Header Label (Heading/Subheading). */
  title: ReactNode;
  /** Heading level of the title: one level below the nearest heading above (default 3: a card inside an h2 section; 2
   *  when the card sits directly under the page h1). The look stays Heading/Subheading — the level follows the outline,
   *  not the size. An EmptyState in `children` takes the next level in Body/Extra/Bold, below the card title. */
  headingLevel?: 2 | 3 | 4;
  /** Icon before the title (20px, Content/Neutral/Strongest): an icon name or a node. Decorative; the title names the card. */
  icon?: IconName | ReactNode;
  /** One line under the title that says what the figure is ("Available revenue in your wallet"), Body/Small/Regular. */
  description?: ReactNode;
  /** The headline figure the chart explains ("$4,346.00"), Heading/3 like a medium Metric. */
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
  /** Figma nested Card Theme: Flat (default) inside a panel or section; Shadow when the chart card sits on the canvas
   *  next to other Shadow cards (metric cards on a dashboard). */
  theme?: CardTheme;
  surface?: CardSurface;
  /** The chart, or an EmptyState before there is data (keep the card title; the Empty State is set one level below it). */
  children: ReactNode;
  className?: string;
  /** Figma instance overrides: props of the open button and range control it draws, by layer (`{ Open: { level: "secondary" }, "Ranges/Item[week]": { level: "primary" } }`). Written by Zen Studio;
   *  app code sets onOpen / ranges. */
  overrides?: NestedOverrides;
}

/**
 * Figma Chart/Chart-Card (6643:63528): Card Flat Medium (padding 24, radius 24) → header · Segmented · chart, gap 16.
 * The header row holds an optional icon, the title and the open chevron; a description and the headline value follow it
 * (every Figma chart card's Show Icon · Icon · Title · Show Description · Description · Show Value · Value · Show Ranges ·
 * Show Open properties).
 */
export function ChartCard({ title, headingLevel = 3, icon, description, value, onOpen, openLabel: openLabelProp, ranges, range, onRangeChange, rangesFullWidth = true, theme = "flat", surface, children, className, overrides }: ChartCardProps) {
  const nest = useNested(overrides);
  const t = useZenLabels();
  const openLabel = openLabelProp ?? t.openReport;
  const Title = `h${headingLevel}` as const;
  return (
    <Card theme={theme} spacing="medium" surface={surface} className={["zen-chart-card", className].filter(Boolean).join(" ")}>
      <div className="zen-chart-card__body">
        <div className="zen-chart-card__header">
          <div className="zen-chart-card__titlebar">
            {icon ? <span className="zen-chart-card__icon" aria-hidden="true">{renderIcon(icon, { size: 20 })}</span> : null}
            <Title className={`zen-chart-card__title ${typographyStyles["Heading/Subheading"]}`}>{nest.slot(title)}</Title>
            {onOpen ? nest("Open", <IconButton appearance="main" level="tertiary" size="2xs" aria-label={openLabel} onClick={onOpen} icon={<Icon name="icon-chevron-right-line-small" />} />) : null}
          </div>
          {description ? <p className={`zen-chart-card__description ${typographyStyles["Body/Small/Regular"]}`}>{description}</p> : null}
          {value !== undefined && value !== null && value !== false ? <p className={`zen-chart-card__value ${typographyStyles["Heading/3"]}`}>{value}</p> : null}
        </div>
        {ranges?.length ? nest("Ranges", <Segmented options={ranges} value={range} onValueChange={onRangeChange} fullWidth={rangesFullWidth} aria-label={t.range} />) : null}
        <EmptyStateCardContext.Provider value={headingLevel}>{nest.slot(children)}</EmptyStateCardContext.Provider>
      </div>
    </Card>
  );
}
