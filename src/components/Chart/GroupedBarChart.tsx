import { useMemo, type Ref } from "react";
import { useZenLabels } from "../_shared/zen-context";
import "./chart.css";
import { ChartBlock, ChartLegend, PlotFrame, SeriesValues, colourAt, defaultFormat, niceScale, signatureOf, staggerStyle, useChartSelection, type ChartDatum, type ChartSeries } from "./chartCore";

export interface GroupedBarChartProps {
  /** One group per period or category, a value per series id (`{ label: "Sep", values: { invoiced: 105700, collected: 88300 } }`).
   *  Keep 3–12 groups. */
  data: ChartDatum[];
  /** The compared series, 2–3, side by side in each group in this order (harness: chart/grouped-series-count). Colours
   *  walk the Figma styles Color Chart Sector/Primary · Secondary · Tertiary unless a series sets `color`. */
  series: ChartSeries[];
  /** Formats axis labels, the Tooltip and the summary. Default: 1.2K. */
  format?: (value: number) => string;
  /** Height of the plot in px, lanes included (36px above the grid for the Tooltip, 28px below it for the X labels). */
  height?: number;
  /** What the chart shows and over which range ("Invoiced and collected per month, Apr – Sep 2026"). */
  "aria-label": string;
  /** Extra class on the chart frame (the axes and the plot; the legend sits outside it). */
  className?: string;
  /** Forwarded to the root `<div>` (the chart block that holds the plot and its legend). */
  ref?: Ref<HTMLDivElement>;
  /** The group active at first (its Tooltip shows every series' value). Default: the last one. */
  initialIndex?: number;
  /** Figma Show Legend: the legend names every series; keep it (harness: chart/series-need-legend). Default on. */
  showLegend?: boolean;
  /** Legend above or below the plot (default bottom). */
  legendPosition?: "top" | "bottom";
  /** Grow the bars from the baseline on mount and when the data changes (default true; reduced motion fades). */
  animate?: boolean;
}

/**
 * Figma Chart/Grouped-Bar-Chart (15485:2457): per period a group of 12px bars, one per series, Spacing/Gap/2XSmall
 * apart, centred in the period's column; each bar takes its series' Color Chart Sector style (`chartPalette`) with
 * Corner-Radius/XSmall on its top corners. The bar charts' frame: Y labels (Label/Small/Medium, Content/Neutral/Light)
 * right-aligned Spacing/Padding/XSmall before the plot, dashed 4 / 4 Border/Neutral/Pale gridlines over a solid
 * Border/Active/Neutral/Subtle baseline, X labels under it (the active one a pill). The active group keeps its colours
 * (the others ease to 88%, as stacked columns), its Border/Active/Neutral/Subtle rule and the Tooltip in the top lane,
 * which reads every series' value after its dot. The legend (Figma Show Legend) sits Spacing/Gap/Medium under the plot,
 * its items Spacing/Gap/Small apart. ←/→ and Home/End move between groups; hover picks one.
 */
export function GroupedBarChart({ data, series, format = defaultFormat, height = 280, "aria-label": ariaLabel, className, initialIndex, showLegend = true, legendPosition = "bottom", animate = true, ref }: GroupedBarChartProps) {
  const t = useZenLabels();
  const values = data.map((d) => series.map((s) => Math.max(0, d.values[s.id] ?? 0)));
  const signature = signatureOf([series.map((s) => s.id), values]);
  const { top, ticks } = useMemo(() => niceScale(Math.max(0, ...values.flat())), [signature]); // eslint-disable-line react-hooks/exhaustive-deps -- deliberate content-hash memo: keyed on the data signature, not its identity
  const { active, setActive, onKeyDown } = useChartSelection(data.length, initialIndex ?? data.length - 1);
  const current = active === null ? undefined : data[active];
  const valueOf = (s: ChartSeries) => format(current?.values[s.id] ?? 0);
  const summary = current && series.length ? `${current.label}: ${series.map((s) => `${s.label} ${valueOf(s)}`).join(", ")} (${t.chartPoint(active! + 1, data.length)})` : t.noData;
  const legend = showLegend && series.length ? <ChartLegend gap="small" items={series.map((s, si) => ({ id: s.id, label: s.label, color: colourAt(s, si) }))} /> : undefined;
  return (
    <ChartBlock ref={ref} kind="grouped-bar" legend={legend} position={legendPosition}>
      <PlotFrame labels={data.map((d) => d.label)} ticks={ticks} top={top} format={format} active={active} setActive={setActive} onKeyDown={onKeyDown} height={height} ariaLabel={ariaLabel}
        activeLine="neutral" className={["zen-chart--grouped", className].filter(Boolean).join(" ")} kind="bar" animate={animate} summary={summary}
        tooltip={current ? <SeriesValues items={series.map((s, si) => ({ id: s.id, color: colourAt(s, si), value: valueOf(s) }))} /> : null}>
        <div className="zen-chart__bars" key={signature}>
          {data.map((d, i) => (
            <span key={d.label + i} className="zen-chart__group" data-active={i === active ? "true" : undefined}>
              {series.map((s, si) => <span key={s.id} className="zen-chart__group-bar" style={staggerStyle(i, { height: `${(values[i][si] / top) * 100}%`, background: colourAt(s, si) })} />)}
            </span>
          ))}
        </div>
      </PlotFrame>
    </ChartBlock>
  );
}
