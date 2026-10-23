import { useMemo, type CSSProperties, type Ref } from "react";
import { TooltipSurface } from "../Tooltip";
import { useZenLabels } from "../_shared/zen-context";
import "./chart.css";
import { ChartBlock, ChartFade, ChartLegend, PlotFrame, colourAt, fadeAt, formatOf, niceScale, signatureOf, useChartId, useChartSelection, type ChartDatum, type ChartFormat, type ChartPaletteName, type ChartSeries } from "./chartCore";

export interface AreaChartProps {
  /** One period per item, a value per series id (`{ label: "Sep", values: { design: 750, … } }`). Keep 4–12 periods. */
  data: ChartDatum[];
  /** The measured series, bottom first: one for `type="area"` (only the first is drawn), 2–4 for `"stacked"`
   *  (harness: chart/area-series-count). Lines walk the Figma styles Color Chart Sector/Primary …, areas fade from the
   *  slot's Solid to its Subtle (Accent, Neutral, Support Cyan …; `chartFades`), unless a series sets `color`. */
  series: ChartSeries[];
  /** Figma Type: `area` (default) — one measure as a line over its fading area; `stacked` — 2–4 series as fading bands
   *  stacked bottom-up with a line on top of each band, so the top line reads the period's total. */
  type?: "area" | "stacked";
  /** How axis labels, the Tooltip and the summary read (`2,210 h`, `$23.4K`): a function, or a preset a Zen Studio
   *  page can write as text: `"compact"` 1.2K, `"currency"` $1.2K (in `currency`), `"percent"` 41%. Default: 1.2K. */
  format?: ChartFormat;
  /** The currency of `format="currency"`: an ISO 4217 code ("USD", the default; "EUR", "VND"). Set alone it implies
   *  `format="currency"`. */
  currency?: string;
  /** Height of the plot in px, lanes included (6px above the grid for the top Y label, 28px below it for the X labels). */
  height?: number;
  /** What the chart shows and over which range ("Billable hours per month, Apr – Sep 2026"). */
  "aria-label": string;
  /** Extra class on the chart frame (the axes and the plot; the legend sits outside it). */
  className?: string;
  /** Forwarded to the root `<div>` (the chart block that holds the plot and its legend). */
  ref?: Ref<HTMLDivElement>;
  /** The period active at first (its dots, rule and Tooltip show). Default: the last one. */
  initialIndex?: number;
  /** Figma Show Legend: the legend names every series. Default: on for `stacked`, off for a single `area` (the card title
   *  names its one measure). Keep it on a stacked chart (harness: chart/series-need-legend). */
  showLegend?: boolean;
  /** Legend above or below the plot (default bottom). */
  legendPosition?: "top" | "bottom";
  /** Wipe the areas in from the left on mount and when the data changes (default true; reduced motion fades). */
  animate?: boolean;
  /** Figma Color: `primary` (default) walks the palette in order; `secondary` swaps the first two series' lines and fades —
   *  a single area draws a Color Chart Sector/Secondary line over the Neutral fade, a stacked chart's bottom band takes the
   *  Neutral pair and the next the Accent pair. A series' own `color` still wins. */
  palette?: ChartPaletteName;
}

/** A point's place in the plot, in % of its width and height: x on the period's centre, y from the top. */
type Point = readonly [number, number];
const pathOf = (pts: readonly Point[]) => pts.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ");

/**
 * Figma Chart/Area-Chart (set 15484:2663; Type=Area 15484:2552 · Type=Stacked 15484:2605; Color=Primary · Secondary ↔ `palette`): straight 2px lines (round caps)
 * in the Color Chart Sector styles (`chartPalette`) from the first period's centre to the last, each over an area that
 * fades top → bottom from Solid to Subtle at 30% (Figma 2026-10-14: Background/Accent, then Neutral, then Support/Cyan,
 * as the line chart's area; `chartFades`) — one area, or stacked bands — on the bar charts' frame: Y labels (Label/Small/Medium,
 * Content/Neutral/Light) right-aligned in a column Spacing/Padding/XSmall before the plot, dashed 4 / 4
 * Border/Neutral/Pale gridlines, a solid Border/Active/Neutral/Subtle baseline, X labels under it (the active one a pill).
 * The active period shows a 12px dot on each line (Surface/Default, 2px ring in the series colour), a 1px
 * Border/Active/Neutral/Subtle rule from the top dot to the baseline and the Tooltip beside the dot, a dot's width away:
 * the value, or the stack's total. The legend (Figma Show Legend) sits Spacing/Gap/Medium under the plot, its items
 * Spacing/Gap/Small apart. ←/→ and Home/End move between periods; hover picks one.
 */
export function AreaChart({ data, series, type = "area", format: formatProp, currency, height = 280, "aria-label": ariaLabel, className, initialIndex, showLegend, legendPosition = "bottom", animate = true, palette = "primary", ref }: AreaChartProps) {
  const format = formatOf(formatProp, currency);
  const t = useZenLabels();
  const stacked = type === "stacked";
  const drawn = stacked ? series : series.slice(0, 1);
  // The running total under and at the top of each series, per period (one series: its value over the baseline).
  const tops = drawn.map((_, si) => data.map((d) => drawn.slice(0, si + 1).reduce((sum, s) => sum + Math.max(0, d.values[s.id] ?? 0), 0)));
  const totals = tops.length ? tops[tops.length - 1] : data.map(() => 0);
  const signature = signatureOf([type, drawn.map((s) => s.id), tops]);
  const { top, ticks } = useMemo(() => niceScale(Math.max(0, ...totals)), [signature]); // eslint-disable-line react-hooks/exhaustive-deps -- deliberate content-hash memo: keyed on the data signature, not its identity
  const { active, setActive, onKeyDown } = useChartSelection(data.length, initialIndex ?? data.length - 1);
  const n = Math.max(1, data.length);
  const pointsOf = (list: number[]): Point[] => list.map((v, i) => [((i + 0.5) / n) * 100, 100 - (v / top) * 100]);
  const lines = tops.map(pointsOf);
  const bands = lines.map((upper, si) => {
    if (!upper.length) return "";
    const lower = si ? [...lines[si - 1]].reverse() : [[upper[upper.length - 1][0], 100], [upper[0][0], 100]] as Point[];
    return `${pathOf(upper)} ${lower.map(([x, y]) => `L ${x} ${y}`).join(" ")} Z`;
  });
  const current = active === null ? undefined : data[active];
  const position = current ? ` (${t.chartPoint(active! + 1, data.length)})` : "";
  const valueOf = (s: ChartSeries) => format(current?.values[s.id] ?? 0);
  const summary = !current || !drawn.length ? t.noData : stacked
    ? `${current.label}: ${t.chartTotal(format(totals[active!]))}; ${drawn.map((s) => `${s.label} ${valueOf(s)}`).join(", ")}${position}`
    : `${current.label}: ${valueOf(drawn[0])}${position}`;
  const legendOn = showLegend ?? drawn.length > 1;
  const legend = legendOn && drawn.length ? <ChartLegend gap="small" items={drawn.map((s, si) => ({ id: s.id, label: s.label, color: colourAt(s, si, palette) }))} /> : undefined;
  const peak = active !== null && lines.length ? lines[lines.length - 1][active] : undefined;
  const fadeId = `zen-chart-fade-${useChartId()}`;
  return (
    <ChartBlock ref={ref} kind="area" legend={legend} position={legendPosition} palette={palette}>
      <PlotFrame labels={data.map((d) => d.label)} ticks={ticks} top={top} format={format} active={active} setActive={setActive} onKeyDown={onKeyDown} height={height} ariaLabel={ariaLabel}
        activeLine="neutral" className={["zen-chart--area", className].filter(Boolean).join(" ")} kind="bar" animate={animate} tooltip={null} summary={summary}>
        <div className="zen-chart__marks" key={signature} data-type={type}>
          <svg className="zen-chart__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Figma Area / *-Area: each band's own vertical fade, Solid at its top → Subtle at its foot. */}
            <defs>{drawn.map((s, si) => <ChartFade key={s.id} id={`${fadeId}-${si}`} {...fadeAt(s, si, palette)} />)}</defs>
            {drawn.map((s, si) => (
              <g key={s.id}>
                <path className="zen-chart__area-band" d={bands[si]} fill={`url(#${fadeId}-${si})`} />
                <path className="zen-chart__area-line" d={pathOf(lines[si])} style={{ stroke: colourAt(s, si, palette) }} vectorEffect="non-scaling-stroke" />
              </g>
            ))}
          </svg>
          {/* The active period: the rule from the top dot down to the baseline, then a dot on each line; they sit in the
              wiped layer, so they appear as the lines reach them. */}
          {peak ? <span className="zen-chart__area-rule" style={{ left: `${peak[0]}%`, top: `${peak[1]}%` }} /> : null}
          {active !== null ? drawn.map((s, si) => lines[si][active] ? <span key={s.id} className="zen-chart__area-dot" style={{ left: `${lines[si][active][0]}%`, top: `${lines[si][active][1]}%`, borderColor: colourAt(s, si, palette) }} /> : null) : null}
        </div>
        {/* Figma: the Tooltip stands beside the active dot (before it on the plot's end half, after it on the start half). */}
        {peak && current ? (
          <span className="zen-chart__point-tip" key={active} data-side={peak[0] > 50 ? "start" : "end"} style={{ left: `${peak[0]}%`, "--zen-chart-y": `${peak[1]}%` } as CSSProperties}>
            <TooltipSurface color="default" size="medium">{stacked ? format(totals[active!]) : valueOf(drawn[0])}</TooltipSurface>
          </span>
        ) : null}
      </PlotFrame>
    </ChartBlock>
  );
}
