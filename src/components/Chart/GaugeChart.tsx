import type { CSSProperties, ReactNode, Ref } from "react";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./chart.css";
import { ChartBlock, ChartLegend, formatOf, sectorAt, signatureOf, type ChartFormat, type ChartLegendPosition, type ChartPaletteName } from "./chartCore";

export interface GaugeChartProps {
  /** The reading, measured from 0 to `max` ("1,052 h", "82"). A value past `max` fills the ring and still reads as it is. */
  value: number;
  /** The value a full half ring stands for (default 100: the value is a percentage). */
  max?: number;
  /** A goal on the same scale, drawn as a Chart/Sector/Secondary tick across the ring and read under the figure. */
  target?: number;
  /** The legend's name for the value ("Billable"), as BulletChart's `actualLabel`. Default "Actual". */
  actualLabel?: string;
  /** The legend's name for the target and the start of the default caption. Default "Target". */
  targetLabel?: string;
  /** The line under the figure. Default: the target ("Target 85%"), or `actualLabel` when there is no target. */
  caption?: ReactNode;
  /** Width of the half ring in px (default 240, as Figma); the ring is a tenth of it thick. The gauge never grows past its box. */
  size?: number;
  /** How the figure, the target and the end labels read: a function, or a preset a Zen Studio page can write as
   *  text: `"compact"` 1.2K, `"currency"` $1.2K (in `currency`), `"percent"` 41% (the value as it is). Default: the
   *  share of `max` in whole percent ("82%", "0%", "100%"). */
  format?: ChartFormat;
  /** The currency of `format="currency"`: an ISO 4217 code ("USD", the default; "EUR", "VND"). Set alone it implies
   *  `format="currency"`. */
  currency?: string;
  /** The legend names the value and the target (Figma Show Legend). Default: on when there is a target. */
  showLegend?: boolean;
  /** Legend below (default), above, or beside the gauge (start / end). */
  legendPosition?: ChartLegendPosition;
  /** What the gauge measures, and when ("Billable share of logged hours, September 2026"). */
  "aria-label": string;
  /** Extra class on the chart (not the legend). */
  className?: string;
  /** Forwarded to the root `<div>` (the chart block that holds the plot and its legend). */
  ref?: Ref<HTMLDivElement>;
  /** Sweep the value from 0 on mount and when it changes; the target tick fades in after (default true; reduced motion fades). */
  animate?: boolean;
  /** Figma Color: `primary` (default) draws the value in Color Chart Sector/Primary and the target tick in Sector/Secondary;
   *  `secondary` the value in Sector/Secondary and the tick in Sector/Primary. */
  palette?: ChartPaletteName;
}

/** Figma Gauge: the tick runs 4px past both edges of the ring, 3px wide, at the default 240px width. */
const TICK_OVERSHOOT_PX = 4;
const TICK_PX = 3;

/**
 * Gauge in the shared chart language (docs/research/chart-family-spec-2026-10-12.md): one measure against a maximum as a
 * half ring a tenth of its width thick (Figma innerRadius 0.8) — the track Background/Neutral/Subtle, the value
 * Chart/Sector/Primary (Color Chart Sector/Primary) with flat ends, the target a 3px round-capped Chart/Sector/Secondary
 * tick 4px past both edges. The reading sits in the hole: the figure Heading/2 · Content/Neutral/Strongest over a
 * Body/Small/Regular · Content/Neutral/Base caption; the scale's ends (Label/Small/Medium · Content/Neutral/Light) sit
 * centred under the ring's two ends. The legend (Figma Show Legend) names the value and the target, Spacing/Gap/Small
 * apart. It is a `meter` (aria-valuenow, min 0, max `max`, value text "Billable 82%, Target 85%"): nothing in it can be
 * picked, so it takes no tab stop. Figma Chart/Gauge-Chart 15968:130382 (Color=Primary 15486:2467 · Secondary ↔ `palette`).
 */
export function GaugeChart({ value: valueProp, max = 100, target: targetProp, actualLabel, targetLabel, caption, size = 240, format, currency, showLegend, legendPosition = "bottom", "aria-label": ariaLabel, className, animate = true, palette = "primary", ref }: GaugeChartProps) {
  const t = useZenLabels();
  // A reading that isn't a number reads 0 (aria-valuenow must be one); a target that isn't a number is no target.
  const value = Number.isFinite(valueProp) ? valueProp : 0;
  const target = targetProp !== undefined && Number.isFinite(targetProp) ? targetProp : undefined;
  const show = format !== undefined || currency ? formatOf(format, currency) : ((v: number) => `${Number.isFinite(v / max) ? Math.round((v / max) * 100) : 0}%`);
  const shareOf = (v: number) => (Number.isFinite(v / max) ? Math.max(0, Math.min(1, v / max)) : 0);
  const share = shareOf(value);
  const targetName = targetLabel ?? t.chartTarget;
  const valueName = actualLabel ?? t.chartActual;
  const targetText = target === undefined ? undefined : `${targetName} ${show(target)}`;
  const shownCaption = caption ?? targetText ?? actualLabel;
  const valueText = [`${actualLabel ? `${actualLabel} ` : ""}${show(value)}`, typeof caption === "string" ? caption : targetText].filter(Boolean).join(", ");
  const k = 100 / size; // px → viewBox units (the ring is 100 wide)
  const tick = target === undefined ? undefined : (() => {
    const angle = Math.PI * (1 - shareOf(target));
    const at = (r: number) => ({ x: 50 + r * Math.cos(angle), y: 50 - r * Math.sin(angle) });
    return { from: at(40 - TICK_OVERSHOOT_PX * k), to: at(50 + TICK_OVERSHOOT_PX * k) };
  })();
  const legend = (showLegend ?? target !== undefined)
    ? <ChartLegend gap="small" items={[{ id: "value", label: valueName, color: sectorAt(0, palette) }, ...(target === undefined ? [] : [{ id: "target", label: targetName, color: sectorAt(1, palette) }])]} />
    : undefined;
  return (
    <ChartBlock ref={ref} kind="gauge" legend={legend} position={legendPosition} className="zen-chart-round" palette={palette}>
      <div className={["zen-chart", "zen-chart--round", "zen-chart--gauge", className].filter(Boolean).join(" ")} data-kind="gauge" data-animate={animate ? undefined : "false"} style={{ "--zen-chart-size": `calc(${size}px + 2 * var(--zen-chart-grow, 0px))` } as CSSProperties}>
        <div className="zen-chart__gauge" role="meter" aria-label={ariaLabel} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.max(0, Math.min(max, value))} aria-valuetext={valueText}>
          <div className="zen-chart__gauge-dial" aria-hidden="true">
            <svg className="zen-chart__gauge-svg" viewBox="0 0 100 50" key={signatureOf([value, max, target ?? null])}>
              <path className="zen-chart__gauge-track" d="M 0 50 A 50 50 0 0 1 100 50 L 90 50 A 40 40 0 0 0 10 50 Z" />
              {share > 0 ? <path className="zen-chart__gauge-value" d="M 5 50 A 45 45 0 0 1 95 50" strokeWidth={10} pathLength={100} style={{ strokeDasharray: `${share * 100} ${101 - share * 100}` }} /> : null}
              {tick ? <line className="zen-chart__gauge-target" x1={tick.from.x} y1={tick.from.y} x2={tick.to.x} y2={tick.to.y} strokeWidth={TICK_PX * k} /> : null}
            </svg>
            <span className="zen-chart__gauge-readout">
              <span className={`zen-chart__gauge-figure ${typographyStyles["Heading/2"]}`}>{show(value)}</span>
              {shownCaption ? <span className={`zen-chart__gauge-caption ${typographyStyles["Body/Small/Regular"]}`}>{shownCaption}</span> : null}
            </span>
          </div>
          <div className="zen-chart__gauge-ends" aria-hidden="true">
            <span className={typographyStyles["Label/Small/Medium"]}>{show(0)}</span>
            <span className={typographyStyles["Label/Small/Medium"]}>{show(max)}</span>
          </div>
        </div>
      </div>
    </ChartBlock>
  );
}
