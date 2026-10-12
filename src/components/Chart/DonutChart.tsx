import type { CSSProperties, ReactNode } from "react";
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
  /** The centre figure. Default: the total, formatted. The active slice's value replaces it while one is picked. */
  value?: ReactNode;
  /** The caption under the centre figure. Default: the locale's “Total”. */
  label?: ReactNode;
  /** A % pill on every slice of 6% or more (default true). */
  showPercent?: boolean;
  /** The legend names every slice (default true; colour is never the only key). */
  showLegend?: boolean;
  /** Legend below (default), above, or beside the ring (start / end). */
  legendPosition?: ChartLegendPosition;
  className?: string;
  /** Grow every slice from its start angle on mount and when the data changes (default true; reduced motion fades). */
  animate?: boolean;
}

const RING = 22; // % of the diameter
const GAP_PX = 4;

/**
 * Donut chart in the shared chart language (docs/research/chart-family-spec-2026-10-12.md): slices in palette order with
 * 4px gaps, a Surface/Default % pill (Label/Small/Medium) on each slice of 6% or more, and the total in the centre
 * (Heading/4, Caption/Regular caption). Hover or ←/→ pick a slice: the centre shows it and the others dim; Home/End jump
 * to the first and last slice, and leaving the chart shows the total again. Figma Chart/Donut-Chart 15324:80365
 * (Legend=Bottom · Start).
 */
export function DonutChart({ data, format = defaultFormat, size = 200, "aria-label": ariaLabel, value, label, showPercent = true, showLegend = true, legendPosition = "bottom", className, animate = true }: DonutChartProps) {
  const t = useZenLabels();
  const id = useChartId();
  const { active, setActive, onKeyDown } = useChartSelection(data.length, null);
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);
  const r = 50 - RING / 2;
  const gap = (GAP_PX / (Math.PI * size * (r / 50))) * 100; // in pathLength units (100 = the whole ring)
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
  return (
    <ChartBlock kind="donut" legend={legend} position={legendPosition} className="zen-chart-round">
      <div className={["zen-chart", "zen-chart--round", className].filter(Boolean).join(" ")} data-kind="donut" data-animate={animate ? undefined : "false"} style={{ "--zen-chart-size": `${size}px` } as CSSProperties}>
        <div className="zen-chart__round" role="group" aria-roledescription="chart" aria-label={ariaLabel} aria-describedby={`${id}-summary`} tabIndex={0}
          onKeyDown={onKeyDown} onBlur={() => setActive(null)} onPointerLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) setActive(null); }}
          data-picked={current ? "true" : undefined}>
          <svg className="zen-chart__ring-svg" viewBox="0 0 100 100" aria-hidden="true" key={signatureOf(data.map((d) => d.value))}>
            <g transform="rotate(-90 50 50)">
              {slices.filter((s) => s.share > 0).map((s) => {
                const dash = Math.max(0.001, s.share - (data.length > 1 ? gap : 0));
                return (
                  <circle key={s.d.id} className="zen-chart__slice" cx="50" cy="50" r={r} strokeWidth={RING} pathLength={100}
                    data-active={s.i === active ? "true" : undefined}
                    style={staggerStyle(s.i, { stroke: s.colour, strokeDasharray: `${dash} ${100 - dash}`, strokeDashoffset: -(s.start + (data.length > 1 ? gap / 2 : 0)) })}
                    onPointerEnter={() => setActive(s.i)} />
                );
              })}
            </g>
          </svg>
          {showPercent ? slices.filter((s) => s.share >= 6).map((s) => {
            const angle = ((s.start + s.share / 2) / 100) * Math.PI * 2 - Math.PI / 2;
            return (
              <span key={s.d.id} className={`zen-chart__pill ${typographyStyles["Label/Small/Medium"]}`} aria-hidden="true" data-dim={current && s.i !== active ? "true" : undefined}
                style={{ left: `${50 + r * Math.cos(angle)}%`, top: `${50 + r * Math.sin(angle)}%` }}>{s.percent}%</span>
            );
          }) : null}
          <span className="zen-chart__centre" aria-hidden="true">
            <span className={`zen-chart__centre-value ${typographyStyles["Heading/4"]}`}>{current ? format(current.d.value) : value ?? format(total)}</span>
            <span className={`zen-chart__centre-label ${typographyStyles["Caption/Regular"]}`}>{current ? current.d.label : label ?? t.total}</span>
          </span>
          <ChartSummary id={`${id}-summary`}>{summary}</ChartSummary>
        </div>
      </div>
    </ChartBlock>
  );
}
