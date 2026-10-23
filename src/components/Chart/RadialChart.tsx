import type { CSSProperties, ReactNode, Ref } from "react";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./chart.css";
import { ChartBlock, ChartLegend, ChartSummary, colourAt, ringSize, signatureOf, staggerStyle, useChartId, useChartSelection, type ChartLegendPosition, type ChartPaletteName, type ChartRingSize, type ChartSlice } from "./chartCore";
import { dataAttributes } from "../_shared/data-attributes";

export interface RadialChartProps {
  /** One ring per measure, outermost first (`{ id, label, value }`), each measured against `max`. Keep 1–4 rings. */
  data: ChartSlice[];
  /** The value a full ring stands for (default 100: the values are percentages). */
  max?: number;
  /** Formats the centre figure and the summary. Default: the share of `max` in whole percent ("43%"). */
  format?: (value: number) => string;
  /** Diameter (Figma Size): `small` 120 · `medium` 168 (default) · `large` 240 · `xlarge` 320 px, in either spelling
   *  (`sm` … `xl`); a number still sets px. Rings are 10px with 8px between them (6px and 4px at Small, so four still fit);
   *  the chart never grows past its box, and a stretched Chart Card grows it. Small shows the centre figure alone
   *  (Body/Base/Bold), XLarge in Display/4. */
  size?: ChartRingSize | number;
  /** What the chart shows ("Budget used by area, September 2026"). */
  "aria-label": string;
  /** The centre figure. Default: the outer ring's value, formatted. The active ring's value replaces it while one is picked. */
  value?: ReactNode;
  /** The caption under the centre figure. Default: the outer ring's label. */
  label?: ReactNode;
  /** The legend names every ring (default true; colour is never the only key). */
  showLegend?: boolean;
  /** Legend below (default), above, or beside the rings (start / end). */
  legendPosition?: ChartLegendPosition;
  className?: string;
  /** Forwarded to the root `<div>` (the chart block that holds the plot and its legend). */
  ref?: Ref<HTMLDivElement>;
  /** Sweep every ring from 12 o'clock to its value on mount and when the data changes (default true; reduced motion fades). */
  animate?: boolean;
  /** Figma Color: `primary` (default) colours the rings in palette order; `secondary` swaps the first two (the outer ring
   *  Color Chart Sector/Secondary, the next Sector/Primary). A ring's own `color` still wins. */
  palette?: ChartPaletteName;
}

/** Ring width and the gap between rings, in px (Figma Radial-Chart; Small is thinner so four rings still fit). */
const RINGS = { small: { ring: 6, gap: 4 }, regular: { ring: 10, gap: 8 } };

/**
 * Radial chart (ring gauges) in the shared chart language (docs/research/chart-family-spec-2026-10-12.md): concentric
 * 10px rings in palette order with round ends, each over a dotted Border/Neutral/Subtle track, and a centre figure
 * (Heading/4, Caption/Regular caption). Hover or ←/→ pick a ring: the centre shows it and the others dim; Home/End jump
 * to the outer and inner ring. Figma Chart/Radial-Chart 15325:1135 (Legend=Bottom · End; Size=Small 120 · Medium 168 ·
 * Large 240 · XLarge 320; Color=Primary · Secondary ↔ `palette`).
 */
export function RadialChart({ data, max = 100, format, size = "medium", "aria-label": ariaLabel, value, label, showLegend = true, legendPosition = "bottom", className, animate = true, palette = "primary", ref, ...rest }: RadialChartProps) {
  const t = useZenLabels();
  const id = useChartId();
  const { active, setActive, onKeyDown } = useChartSelection(data.length, null);
  const show = format ?? ((v: number) => `${Number.isFinite(v / max) ? Math.round((v / max) * 100) : 0}%`);
  const { px, step } = ringSize(size);
  const { ring: RING_PX, gap: GAP_PX } = step === "small" ? RINGS.small : RINGS.regular;
  const k = 100 / px; // px → viewBox units
  const rings = data.map((d, i) => ({ d, i, colour: colourAt(d, i, palette), r: 50 - k * (RING_PX / 2 + i * (RING_PX + GAP_PX)), share: Number.isFinite(d.value / max) ? Math.max(0, Math.min(100, (d.value / max) * 100)) : 0 }));
  const current = active === null ? undefined : rings[active];
  const lead = rings[0];
  const summary = !lead ? t.noData : current
    ? `${current.d.label}: ${show(current.d.value)} (${t.chartPoint(current.i + 1, data.length)})`
    : rings.map((ring) => `${ring.d.label} ${show(ring.d.value)}`).join(", ");
  const legend = showLegend ? <ChartLegend items={rings.map((ring) => ({ id: ring.d.id, label: ring.d.label, color: ring.colour }))} /> : undefined;
  return (
    <ChartBlock {...dataAttributes(rest)} ref={ref} kind="radial" legend={legend} position={legendPosition} className="zen-chart-round" palette={palette}>
      <div className={["zen-chart", "zen-chart--round", className].filter(Boolean).join(" ")} data-kind="radial" data-size={step} data-animate={animate ? undefined : "false"} style={{ "--zen-chart-size": `calc(${px}px + var(--zen-chart-grow, 0px))` } as CSSProperties}>
        <div className="zen-chart__round" role="group" aria-roledescription="chart" aria-label={ariaLabel} aria-describedby={`${id}-summary`} tabIndex={0}
          onKeyDown={onKeyDown} onBlur={() => setActive(null)} onPointerLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) setActive(null); }}
          data-picked={current ? "true" : undefined}>
          <svg className="zen-chart__ring-svg" viewBox="0 0 100 100" aria-hidden="true" key={signatureOf(data.map((d) => d.value))}>
            <g transform="rotate(-90 50 50)">
              {rings.map((ring) => <circle key={`t-${ring.d.id}`} className="zen-chart__track" cx="50" cy="50" r={ring.r} strokeWidth={k * 2} style={{ strokeDasharray: `0 ${k * 6}` }} />)}
              {rings.filter((ring) => ring.share > 0).map((ring) => (
                <circle key={ring.d.id} className="zen-chart__arc" cx="50" cy="50" r={ring.r} strokeWidth={k * RING_PX} pathLength={100}
                  data-active={ring.i === active ? "true" : undefined}
                  style={staggerStyle(ring.i, { stroke: ring.colour, strokeDasharray: `${ring.share} ${100 - ring.share + 1}` })}
                  onPointerEnter={() => setActive(ring.i)} />
              ))}
            </g>
          </svg>
          <span className="zen-chart__centre" aria-hidden="true">
            <span className={`zen-chart__centre-value ${typographyStyles[step === "small" ? "Body/Base/Bold" : step === "xlarge" ? "Display/4" : "Heading/4"]}`}>{current ? show(current.d.value) : value ?? (lead ? show(lead.d.value) : "")}</span>
            {step !== "small" ? <span className={`zen-chart__centre-label ${typographyStyles["Caption/Regular"]}`}>{current ? current.d.label : label ?? lead?.d.label}</span> : null}
          </span>
          <ChartSummary id={`${id}-summary`}>{summary}</ChartSummary>
        </div>
      </div>
    </ChartBlock>
  );
}
