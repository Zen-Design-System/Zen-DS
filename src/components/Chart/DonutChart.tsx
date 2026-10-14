import { useId, type CSSProperties, type ReactNode, type Ref } from "react";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./chart.css";
import { ChartBlock, ChartLegend, ChartSummary, colourAt, defaultFormat, signatureOf, useChartId, useChartSelection, type ChartLegendPosition, type ChartSlice } from "./chartCore";

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
  /** Forwarded to the root `<div>` (the chart block that holds the plot and its legend). */
  ref?: Ref<HTMLDivElement>;
  /** Grow every slice from its start angle on mount and when the data changes (default true; reduced motion fades). */
  animate?: boolean;
}

const RING = 22; // % of the diameter
const GAP_PX = 4;
const CORNER_PX = 4;

/**
 * One slice as a filled path: an annular sector between `from` and `to` (radians, clockwise from 12 o'clock) whose two
 * cut edges stay parallel to the slice's boundary radii, `halfGap` away from them, with every corner rounded by
 * `corner`. The outline is drawn inset by `corner` and stroked `2 × corner` wide with round joins in the same colour,
 * so the painted shape keeps the full radii and gap and gets round corners (viewBox units, centre 50 50).
 */
function slicePath(from: number, to: number, outer: number, inner: number, halfGap: number, corner: number) {
  const ro = outer - corner;
  const ri = inner + corner;
  const h = halfGap + corner;
  const edge = (r: number) => {
    const shift = Math.asin(Math.min(1, h / r));
    const a = from + shift;
    const b = to - shift;
    return b > a ? [a, b] : [(from + to) / 2, (from + to) / 2];
  };
  const at = (r: number, a: number) => `${(50 + r * Math.sin(a)).toFixed(3)} ${(50 - r * Math.cos(a)).toFixed(3)}`;
  const [oa, ob] = edge(ro);
  const [ia, ib] = edge(ri);
  return `M ${at(ro, oa)} A ${ro} ${ro} 0 ${ob - oa > Math.PI ? 1 : 0} 1 ${at(ro, ob)} L ${at(ri, ib)} A ${ri} ${ri} 0 ${ib - ia > Math.PI ? 1 : 0} 0 ${at(ri, ia)} Z`;
}

/**
 * Donut chart in the shared chart language (docs/research/chart-family-spec-2026-10-12.md): slices in palette order,
 * parted by 4px gaps of the same width from the hole to the rim, each slice's corners rounded 4px, a Surface/Default %
 * pill (Label/Small/Medium) on each slice of 6% or more, and the total in the centre (Heading/4, Caption/Regular caption)
 * — or, with `totalPosition="start"`, beside the ring above the legend (Body/Small/Regular caption, Heading/2 figure, as
 * the Chart Card's description and value). Hover or ←/→ pick a slice: the centre shows it and the others dim; Home/End jump
 * to the first and last slice, and leaving the chart shows the total again. Figma Chart/Donut-Chart 15324:80365
 * (Legend=Bottom · Start).
 */
export function DonutChart({ data, format = defaultFormat, size = 200, "aria-label": ariaLabel, value, label, totalPosition = "centre", showPercent = true, showLegend = true, legendPosition = "bottom", className, animate = true, ref }: DonutChartProps) {
  const t = useZenLabels();
  const id = useChartId();
  const sweepId = `${useId().replace(/:/g, "")}-sweep`;
  const { active, setActive, onKeyDown } = useChartSelection(data.length, null);
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);
  const r = 50 - RING / 2;
  const unit = 100 / size; // px → viewBox units (100 = the diameter)
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
            {/* The draw-in: a ring that sweeps clockwise from 12 o'clock uncovers the slices (reduced motion: it fades). */}
            <mask id={sweepId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
              <circle className="zen-chart__sweep" cx="50" cy="50" r={r} fill="none" stroke="white" strokeWidth={RING + 2} pathLength={100} transform="rotate(-90 50 50)" />
            </mask>
          </defs>
          <g mask={`url(#${sweepId})`}>
            {drawn.length === 1 ? (
              <circle className="zen-chart__slice" cx="50" cy="50" r={r} fill="none" strokeWidth={RING} style={{ stroke: drawn[0].colour }}
                data-active={drawn[0].i === active ? "true" : undefined} onPointerEnter={() => setActive(drawn[0].i)} />
            ) : drawn.map((s) => (
              // Straight 4px gaps and 4px round corners: the path is inset by the corner and stroked back out with round joins.
              <path key={s.d.id} className="zen-chart__slice" strokeWidth={CORNER_PX * unit * 2} strokeLinejoin="round"
                d={slicePath((s.start / 100) * Math.PI * 2, ((s.start + s.share) / 100) * Math.PI * 2, 50, 50 - RING, (GAP_PX / 2) * unit, CORNER_PX * unit)}
                data-active={s.i === active ? "true" : undefined}
                style={{ fill: s.colour, stroke: s.colour }}
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
      <ChartBlock ref={ref} kind="donut" className="zen-chart-round" layout="total-start">
        <div className="zen-chart__side">
          <div className="zen-chart__total" aria-hidden="true">
            <span className={`zen-chart__total-label ${typographyStyles["Body/Small/Regular"]}`}>{caption}</span>
            <span className={`zen-chart__total-value ${typographyStyles["Heading/2"]}`}>{figure}</span>
          </div>
          {legend}
        </div>
        {ring}
      </ChartBlock>
    );
  }
  return (
    <ChartBlock ref={ref} kind="donut" legend={legend} position={legendPosition} className="zen-chart-round">
      {ring}
    </ChartBlock>
  );
}
