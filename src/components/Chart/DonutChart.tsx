import { useId, type CSSProperties, type ReactNode } from "react";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./chart.css";
import { ChartBlock, ChartLegend, ChartSummary, colourAt, defaultFormat, signatureOf, staggerStyle, useChartId, useChartSelection, type ChartLegendPosition, type ChartSlice } from "./chartCore";

export interface DonutChartProps {
  /** The shares of one total (`{ id, label, value }`), drawn clockwise from 12 o'clock in palette order. Keep 2–7 slices. */
  data: ChartSlice[];
  /** Formats the centre figure and the summary. */
  format?: (value: number) => string;
  /** Diameter in px (default 200). The ring is 22% of it; it never grows past its box. */
  size?: number;
  /** What the chart shows ("Spending by category, September 2026"). */
  "aria-label": string;
  /** The total figure. Default: the total, formatted. The active slice's value replaces it while one is picked. */
  value?: ReactNode;
  /** The caption of the total ("Invoiced in Q3"). Default: the locale's “Total”. */
  label?: ReactNode;
  /** Where the total sits: in the hole (`centre`, default), or above the legend in a start column beside the ring
   *  (`start`: the hole stays empty, the legend lists down that column; Figma Total=Start). */
  totalPosition?: "centre" | "start";
  /** A % pill on every slice of 6% or more (default true). */
  showPercent?: boolean;
  /** The legend names every slice (default true; colour is never the only key). */
  showLegend?: boolean;
  /** Legend below (default), above, or beside the ring (start / end). With `totalPosition="start"` it is always in the
   *  start column, under the total. */
  legendPosition?: ChartLegendPosition;
  className?: string;
  /** Grow every slice from its start angle on mount and when the data changes (default true; reduced motion fades). */
  animate?: boolean;
}

const RING = 22; // % of the diameter
const GAP_PX = 4;

/**
 * Donut chart in the shared chart language (docs/research/chart-family-spec-2026-10-12.md): slices in palette order,
 * parted by 4px gaps of the same width from the hole to the rim (a mask, so the card shows through), a Surface/Default %
 * pill (Label/Small/Medium) on each slice of 6% or more, and the total in the centre (Heading/4, Caption/Regular caption)
 * — or, with `totalPosition="start"`, beside the ring above the legend (Body/Small/Regular caption, Heading/3 figure, as
 * the Chart Card's description and value). Hover or ←/→ pick a slice: the centre shows it and the others dim; Home/End jump
 * to the first and last slice, and leaving the chart shows the total again. Figma Chart/Donut-Chart 15324:80365
 * (Legend=Bottom · Start).
 */
export function DonutChart({ data, format = defaultFormat, size = 200, "aria-label": ariaLabel, value, label, totalPosition = "centre", showPercent = true, showLegend = true, legendPosition = "bottom", className, animate = true }: DonutChartProps) {
  const t = useZenLabels();
  const id = useChartId();
  const maskId = `${useId().replace(/:/g, "")}-gaps`;
  const { active, setActive, onKeyDown } = useChartSelection(data.length, null);
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);
  const r = 50 - RING / 2;
  const gap = (GAP_PX / size) * 100; // the gap's width in viewBox units (100 = the diameter)
  let start = 0;
  const slices = data.map((d, i) => {
    const share = total > 0 ? (Math.max(0, d.value) / total) * 100 : 0;
    const slice = { d, i, share, start, colour: colourAt(d, i), percent: Math.round(share) };
    start += share;
    return slice;
  });
  const current = active === null ? undefined : slices[active];
  const summary = total <= 0 ? t.noData : current
    ? `${current.d.label}: ${format(current.d.value)}, ${current.percent}% (${t.chartPoint(current.i + 1, data.length)})`
    : `${t.total} ${format(total)}; ${slices.map((s) => `${s.d.label} ${s.percent}%`).join(", ")}`;
  const legend = showLegend ? <ChartLegend items={slices.map((s) => ({ id: s.d.id, label: s.d.label, color: s.colour }))} /> : undefined;
  const drawn = slices.filter((s) => s.share > 0);
  const figure = current ? format(current.d.value) : value ?? format(total);
  const caption = current ? current.d.label : label ?? t.total;
  const ring = (
    <div className={["zen-chart", "zen-chart--round", className].filter(Boolean).join(" ")} data-kind="donut" data-animate={animate ? undefined : "false"} style={{ "--zen-chart-size": `${size}px` } as CSSProperties}>
      <div className="zen-chart__round" role="group" aria-roledescription="chart" aria-label={ariaLabel} aria-describedby={`${id}-summary`} tabIndex={0}
        onKeyDown={onKeyDown} onBlur={() => setActive(null)} onPointerLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) setActive(null); }}
        data-picked={current ? "true" : undefined}>
        <svg className="zen-chart__ring-svg" viewBox="0 0 100 100" aria-hidden="true" key={signatureOf(data.map((d) => d.value))}>
          <defs>
            {/* The gaps: a straight cut of the same width along each slice edge, so they stay even from hole to rim. */}
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
              <rect x="0" y="0" width="100" height="100" fill="white" />
              {drawn.length > 1 ? drawn.map((s) => {
                const angle = (s.start / 100) * Math.PI * 2;
                return <line key={s.d.id} x1="50" y1="50" x2={50 + 52 * Math.cos(angle)} y2={50 + 52 * Math.sin(angle)} stroke="black" strokeWidth={gap} />;
              }) : null}
            </mask>
          </defs>
          <g transform="rotate(-90 50 50)" mask={`url(#${maskId})`}>
            {drawn.map((s) => (
              <circle key={s.d.id} className="zen-chart__slice" cx="50" cy="50" r={r} strokeWidth={RING} pathLength={100}
                data-active={s.i === active ? "true" : undefined}
                style={staggerStyle(s.i, { stroke: s.colour, strokeDasharray: `${Math.max(0.001, s.share)} ${100 - s.share}`, strokeDashoffset: -s.start })}
                onPointerEnter={() => setActive(s.i)} />
            ))}
          </g>
        </svg>
        {showPercent ? slices.filter((s) => s.share >= 6).map((s) => {
          const angle = ((s.start + s.share / 2) / 100) * Math.PI * 2 - Math.PI / 2;
          return (
            <span key={s.d.id} className={`zen-chart__pill ${typographyStyles["Label/Small/Medium"]}`} aria-hidden="true" data-dim={current && s.i !== active ? "true" : undefined}
              style={{ left: `${50 + r * Math.cos(angle)}%`, top: `${50 + r * Math.sin(angle)}%` }}>{s.percent}%</span>
          );
        }) : null}
        {totalPosition === "centre" ? (
          <span className="zen-chart__centre" aria-hidden="true">
            <span className={`zen-chart__centre-value ${typographyStyles["Heading/4"]}`}>{figure}</span>
            <span className={`zen-chart__centre-label ${typographyStyles["Caption/Regular"]}`}>{caption}</span>
          </span>
        ) : null}
        <ChartSummary id={`${id}-summary`}>{summary}</ChartSummary>
      </div>
    </div>
  );
  if (totalPosition === "start") {
    return (
      <ChartBlock kind="donut" className="zen-chart-round" layout="total-start">
        <div className="zen-chart__side">
          <div className="zen-chart__total" aria-hidden="true">
            <span className={`zen-chart__total-label ${typographyStyles["Body/Small/Regular"]}`}>{caption}</span>
            <span className={`zen-chart__total-value ${typographyStyles["Heading/3"]}`}>{figure}</span>
          </div>
          {legend}
        </div>
        {ring}
      </ChartBlock>
    );
  }
  return (
    <ChartBlock kind="donut" legend={legend} position={legendPosition} className="zen-chart-round">
      {ring}
    </ChartBlock>
  );
}
