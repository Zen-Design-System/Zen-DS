import { useMemo, type CSSProperties, type Ref } from "react";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./chart.css";
import { ChartBlock, ChartLegend, PlotFrame, SeriesValues, defaultFormat, niceScale, sectorAt, signatureOf, staggerStyle, useChartSelection, type ChartPaletteName } from "./chartCore";
import { dataAttributes } from "../_shared/data-attributes";

/** One period of a ComboChart: the bar's value (start axis) and the line's value (end axis). */
export interface ChartComboDatum { label: string; bar: number; line: number }

export interface ComboChartProps {
  /** One period per item (`{ label: "Sep", bar: 105700, line: 41 }`). Keep 4–12 periods. */
  data: ChartComboDatum[];
  /** What the bars measure ("Revenue"), named in the legend, the Tooltip order and the summary (harness: chart/combo-needs-labels). */
  barLabel: string;
  /** What the line measures ("Margin"), named in the legend and the summary. */
  lineLabel: string;
  /** Formats the bars' values and the start axis (`$105.7K`). Default: 1.2K. */
  format?: (value: number) => string;
  /** Formats the line's values and the end axis (`41%`). Default: 1.2K. */
  lineFormat?: (value: number) => string;
  /** The top of the end axis (100 for a share in %). Default: a round top over the line's values, on the same gridlines
   *  as the start axis. */
  lineMax?: number;
  /** Height of the plot in px, lanes included (36px above the grid for the Tooltip, 28px below it for the X labels). */
  height?: number;
  /** What the chart shows and over which range ("Revenue and margin per month, Apr – Sep 2026"). */
  "aria-label": string;
  /** Extra class on the chart frame (both axes and the plot; the legend sits outside it). */
  className?: string;
  /** Forwarded to the root `<div>` (the chart block that holds the plot and its legend). */
  ref?: Ref<HTMLDivElement>;
  /** The period active at first (its Tooltip reads both values). Default: the last one. */
  initialIndex?: number;
  /** Figma Show Legend: the legend names the bars and the line; keep it (harness: chart/series-need-legend). Default on. */
  showLegend?: boolean;
  /** Legend above or below the plot (default bottom). */
  legendPosition?: "top" | "bottom";
  /** Grow the bars from the baseline and wipe the line in from the left on mount and when the data changes (default
   *  true; reduced motion fades). */
  animate?: boolean;
  /** Figma Color: `primary` (default) draws Color Chart Sector/Primary bars and a Sector/Secondary line; `secondary`
   *  draws Sector/Secondary bars and a Sector/Primary line and dots. */
  palette?: ChartPaletteName;
}

/** The end axis' step for `count` steps that reach `max`: 1 · 2 · 2.5 · 5 × 10ⁿ, as niceScale picks the start axis'. */
function stepFor(max: number, count: number) {
  if (!(max > 0)) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max / count));
  return [1, 2, 2.5, 5, 10, 20].map((m) => m * magnitude).find((s) => s * count >= max - 1e-9) ?? max / count;
}
const round = (value: number) => Math.round(value * 1e6) / 1e6;

/**
 * Figma Chart/Combo-Chart (15485:2519; Color=Primary · Secondary ↔ `palette`): two measures over the same periods on two axes. Bars (Color Chart Sector/Primary,
 * 20px, half the period's column with room to spare, up to 40px; Corner-Radius/XSmall on the top corners) read the start axis; a straight 2px Color Chart Sector/Secondary line
 * (round caps) with an 8px dot on every period (Surface/Default, 2px ring) reads the end axis. Both axes take
 * Label/Small/Medium in Content/Neutral/Light, Spacing/Padding/XSmall from the plot (the start one right-aligned, the end
 * one left-aligned) and share the dashed 4 / 4 Border/Neutral/Pale gridlines over a solid Border/Active/Neutral/Subtle
 * baseline. The active period keeps its bar (the others ease to 88%), its dot grows to 12px, and the Tooltip in the top
 * lane reads both values after their dots; X labels under the plot (the active one a pill). The legend (Figma Show
 * Legend) names both measures Spacing/Gap/Medium under the plot, its items Spacing/Gap/Small apart. ←/→ and Home/End
 * move between periods; hover picks one.
 */
export function ComboChart({ data, barLabel, lineLabel, format = defaultFormat, lineFormat = defaultFormat, lineMax, height = 280, "aria-label": ariaLabel, className, initialIndex, showLegend = true, legendPosition = "bottom", animate = true, palette = "primary", ref, ...rest }: ComboChartProps) {
  const t = useZenLabels();
  // The bars and the line: Figma Color Chart Sector/Primary and Secondary, swapped by `palette` (CSS reads chart.css
  // --zen-chart-lead / -second).
  const BAR = sectorAt(0, palette);
  const LINE = sectorAt(1, palette);
  const bars = data.map((d) => Math.max(0, d.bar));
  const line = data.map((d) => Math.max(0, d.line));
  const signature = signatureOf([bars, line, lineMax ?? null]);
  const { top, ticks } = useMemo(() => niceScale(Math.max(0, ...bars)), [signature]); // eslint-disable-line react-hooks/exhaustive-deps -- deliberate content-hash memo: keyed on the data signature, not its identity
  // The end axis shares the start axis' gridlines: as many steps, each a round step that reaches the line's top.
  const count = Math.max(1, ticks.length - 1);
  const lineTop = lineMax && lineMax > 0 ? lineMax : stepFor(Math.max(0, ...line), count) * count;
  const lineTicks = ticks.map((_, i) => round((i * lineTop) / count));
  const { active, setActive, onKeyDown } = useChartSelection(data.length, initialIndex ?? data.length - 1);
  const n = Math.max(1, data.length);
  const pts = line.map((v, i) => [((i + 0.5) / n) * 100, 100 - (Math.min(v, lineTop) / lineTop) * 100] as const);
  const current = active === null ? undefined : data[active];
  const summary = current ? `${current.label}: ${barLabel} ${format(current.bar)}, ${lineLabel} ${lineFormat(current.line)} (${t.chartPoint(active! + 1, data.length)})` : t.noData;
  const legend = showLegend ? <ChartLegend gap="small" items={[{ id: "bar", label: barLabel, color: BAR }, { id: "line", label: lineLabel, color: LINE }]} /> : undefined;
  return (
    <ChartBlock {...dataAttributes(rest)} ref={ref} kind="combo" legend={legend} position={legendPosition} palette={palette}>
      <div className={["zen-chart-combo", className].filter(Boolean).join(" ")} style={{ "--zen-chart-height": `calc(${height}px + var(--zen-chart-grow, 0px))` } as CSSProperties}>
        <PlotFrame labels={data.map((d) => d.label)} ticks={ticks} top={top} format={format} active={active} setActive={setActive} onKeyDown={onKeyDown} height={height} ariaLabel={ariaLabel}
          activeLine="neutral" className="zen-chart--combo" kind="bar" animate={animate} summary={summary}
          tooltip={current ? <SeriesValues items={[{ id: "bar", color: BAR, value: format(current.bar) }, { id: "line", color: LINE, value: lineFormat(current.line) }]} /> : null}>
          <div className="zen-chart__bars" key={`bars${signature}`}>
            {data.map((d, i) => (
              <span key={d.label + i} className="zen-chart__combo-column" data-active={i === active ? "true" : undefined}>
                <span className="zen-chart__combo-bar" style={staggerStyle(i, { height: `${(bars[i] / top) * 100}%` })} />
              </span>
            ))}
          </div>
          <div className="zen-chart__marks" key={`line${signature}`}>
            <svg className="zen-chart__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path className="zen-chart__combo-line" d={pts.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ")} vectorEffect="non-scaling-stroke" />
            </svg>
            {pts.map(([x, y], i) => <span key={i} className="zen-chart__combo-dot" data-active={i === active ? "true" : undefined} style={{ left: `${x}%`, top: `${y}%` }} />)}
          </div>
        </PlotFrame>
        {/* Figma Y-Axis-End: the line's axis on the same gridlines, Spacing/Padding/XSmall after the plot. */}
        <div className="zen-chart__y zen-chart__y-end" aria-hidden="true">
          {lineTicks.map((tick, i) => <span key={i} className={typographyStyles["Label/Small/Medium"]} style={{ bottom: `calc(var(--zen-chart-lane-bottom) + (100% - var(--zen-chart-lane-top) - var(--zen-chart-lane-bottom)) * ${i / count})` }}>{lineFormat(tick)}</span>)}
        </div>
      </div>
    </ChartBlock>
  );
}
