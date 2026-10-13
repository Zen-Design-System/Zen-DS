/* The chart family's shared language (docs/research/chart-family-spec-2026-10-12.md §2–4): palette, scale, legend,
   the cartesian plot frame, keyboard selection and the draw-in motion. Every chart in this folder is built from it. */
import { useId, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { TooltipSurface } from "../Tooltip";
import { VisuallyHidden } from "../VisuallyHidden";
import { typographyStyles } from "../../tokens/typography.generated";

export interface ChartPoint {
  label: string;
  value: number;
  /** BarChart: a forecast or a period not closed yet, drawn hatched (Border/Neutral/Subtle stripes). */
  projected?: boolean;
  /** BarChart: the goal for this bar, drawn as a hatched track behind it; the Tooltip reads "value of target". */
  target?: number;
}
/** How a LineChart fills the area under its line. */
export type ChartFill = "gradient" | "none";
export interface ChartSeries {
  id: string;
  label: string;
  /** CSS colour; defaults walk the Figma colour styles Color Chart Sector/Primary · Secondary · Tertiary … Septenary. */
  color?: string;
}
/** A LineChart comparison: a dashed line over the same periods (last year, the plan), one value per point, in order. */
export interface ChartCompare { label: string; values: number[] }
/** One period of a stacked chart: a value per series id. */
export interface ChartDatum { label: string; values: Record<string, number> }
/** @deprecated Use ChartDatum (the same shape). */
export type ChartStack = ChartDatum;
/** One share of a DonutChart, or one ring of a RadialChart. */
export interface ChartSlice { id: string; label: string; value: number; color?: string }
/** Where a chart's legend sits. Top and bottom for every chart; start and end (beside the drawing) for Donut and Radial. */
export type ChartLegendPosition = "top" | "bottom" | "start" | "end";

/** The Figma colour styles "Color Chart Sector/Primary … Septenary", in order: Chart/Sector/Primary, Chart/Sector/Secondary,
 *  Support Cyan, Violet, Yellow and Orange Solid, Support Red Soft. Figma paints chart marks with those styles. */
export const chartPalette = [
  "var(--zen-chart-sector-primary, #ff66d4)",
  "var(--zen-chart-sector-secondary, #111)",
  "var(--zen-color-background-support-cyan-solid, #21b8d8)",
  "var(--zen-color-background-support-violet-solid, #7a5af8)",
  "var(--zen-color-background-support-yellow-solid, #f5b800)",
  "var(--zen-color-background-support-orange-solid, #f5832a)",
  "var(--zen-color-background-support-red-soft, #ffc0af)",
] as const;

/** The colour of the series (or slice) at `index`: its own colour, else the palette in order. */
export const colourAt = (item: { color?: string } | undefined, index: number) => item?.color ?? chartPalette[index % chartPalette.length];

export const defaultFormat = (value: number) => (Math.abs(value) >= 1000 ? `${Math.round(value / 100) / 10}K` : `${value}`);

/** Round the axis max up to a nice scale: the smallest top a 1 · 2 · 2.5 · 5 step reaches in at most 5 steps, so the
 *  marks use the plot (Figma shows up to 6 labels: 0 … max). */
export function niceScale(max: number, steps = 5) {
  if (!(max > 0)) return { top: steps, step: 1, ticks: Array.from({ length: steps + 1 }, (_, i) => i) };
  const magnitude = 10 ** Math.floor(Math.log10(max / steps));
  const step = [1, 2, 2.5, 5, 10, 20].map((m) => m * magnitude).find((s) => Math.ceil(max / s - 1e-9) <= steps) ?? max / steps;
  const count = Math.max(1, Math.ceil(max / step - 1e-9));
  return { top: step * count, step, ticks: Array.from({ length: count + 1 }, (_, i) => i * step) };
}

/** A key that changes when the drawn values change, so the marks layer re-mounts and draws itself in again. */
export const signatureOf = (values: readonly unknown[]) => JSON.stringify(values);

type Keys = "horizontal" | "vertical";
const STEP: Record<Keys, Record<string, number>> = {
  horizontal: { ArrowRight: 1, ArrowLeft: -1 },
  vertical: { ArrowDown: 1, ArrowUp: -1 },
};

/**
 * The active item of a one-dimensional chart: ←/→ (↑/↓ for horizontal bars) and Home/End move it, pointer hover sets
 * it. `initial` null starts with no active item (Donut and Radial show their overview until one is picked).
 */
export function useChartSelection(count: number, initial: number | null, keys: Keys = "horizontal") {
  const [active, setActive] = useState<number | null>(initial);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const current = active ?? -1;
    const step = STEP[keys][event.key];
    const next = step !== undefined ? (active === null && step < 0 ? count - 1 : current + step) : event.key === "Home" ? 0 : event.key === "End" ? count - 1 : null;
    if (next === null || count === 0) return;
    event.preventDefault();
    setActive(Math.max(0, Math.min(count - 1, next)));
  };
  return { active: active === null ? null : Math.min(active, count - 1), setActive, onKeyDown };
}

/** Legend (Figma Legend item 6643:73387, .Chart/Legend-Item 15321:79362): a 12px dot, Spacing/Gap/2XSmall before its
 *  Caption/Regular label. */
export function ChartLegend({ items, className }: { items: { id: string; label: ReactNode; color: string }[]; className?: string }) {
  return (
    <ul className={["zen-chart__legend", className].filter(Boolean).join(" ")}>
      {items.map((item) => <li key={item.id} className={typographyStyles["Caption/Regular"]}><span className="zen-chart__swatch" style={{ background: item.color }} aria-hidden="true" />{item.label}</li>)}
    </ul>
  );
}

/** A chart with its legend before or after it (top / bottom; start / end beside it for round charts). */
export function ChartBlock({ legend, position = "bottom", kind, children, className, layout }: { legend?: ReactNode; position?: ChartLegendPosition; kind: string; children: ReactNode; className?: string; layout?: string }) {
  return (
    <div className={["zen-chart-block", className].filter(Boolean).join(" ")} data-kind={kind} data-legend={legend ? position : undefined} data-layout={layout}>
      {children}
      {legend}
    </div>
  );
}

/** The live summary every chart keeps under its plot: the active item, read politely on each move. */
export function ChartSummary({ id, children }: { id: string; children: ReactNode }) {
  return <VisuallyHidden as="p" id={id} aria-live="polite">{children}</VisuallyHidden>;
}

export const useChartId = () => useId().replace(/:/g, "");

/** `--zen-chart-anchor`: where a floating Tooltip hangs from its item, 0 (its left edge) … 1 (its right edge), the item's
 *  place along the plot. The first item's Tooltip starts at its left, the last ends at its right, so it never leaves the
 *  plot while it is narrower than the plot. */
export const anchorStyle = (index: number, count: number) => ({ "--zen-chart-anchor": (index + 0.5) / Math.max(1, count) } as CSSProperties);

/** `--zen-chart-i`: the stagger index of a mark (its delay is a multiple of a motion token, see chart.css). */
export const staggerStyle = (index: number, extra?: CSSProperties) => ({ "--zen-chart-i": index, ...extra } as CSSProperties);

/**
 * Cartesian frame shared by LineChart, BarChart (vertical) and StackBarChart: Y labels (Label/Small/Medium,
 * Neutral/Light), dashed Border/Neutral/Pale grid (solid baseline), one sector column per X value with its X label (a
 * pill when active) and the active item's Tooltip in the 36px top lane.
 */
export function PlotFrame({ labels, ticks, top, format, active, setActive, onKeyDown, height, ariaLabel, tooltip, activeLine, children, className, summary, kind, animate, average }: {
  labels: string[]; ticks: number[]; top: number; format: (v: number) => string; active: number | null; setActive: (i: number) => void; onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  height: number; ariaLabel: string; tooltip: ReactNode; activeLine: "accent" | "neutral"; children: ReactNode; className?: string; summary: ReactNode; kind: "line" | "bar" | "stack"; animate: boolean;
  /** The average line (showAverage): its value and the tag's text. */
  average?: { value: number; label: string };
}) {
  const id = useChartId();
  return (
    <div className={["zen-chart", className].filter(Boolean).join(" ")} data-kind={kind} data-animate={animate ? undefined : "false"} data-dense={labels.length > 8 ? "true" : undefined} style={{ "--zen-chart-height": `${height}px`, "--zen-chart-count": labels.length } as CSSProperties}>
      <div className="zen-chart__y" aria-hidden="true">
        {ticks.map((tick) => <span key={tick} className={typographyStyles["Label/Small/Medium"]} style={{ bottom: `calc(28px + (100% - 64px) * ${tick / top})` }}>{format(tick)}</span>)}
      </div>
      <div
        className="zen-chart__plot"
        role="group"
        aria-roledescription="chart"
        aria-label={ariaLabel}
        aria-describedby={`${id}-summary`}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div className="zen-chart__grid" aria-hidden="true">{ticks.map((tick) => <span key={tick} data-base={tick === 0 ? "true" : undefined} style={{ bottom: `${(tick / top) * 100}%` }} />)}</div>
        <div className="zen-chart__visual" aria-hidden="true">
          {children}
          {average ? <AverageLine label={average.label} style={{ bottom: `${(average.value / top) * 100}%` }} /> : null}
        </div>
        <div className="zen-chart__sectors">
          {labels.map((label, index) => (
            <button key={label + index} type="button" tabIndex={-1} className="zen-chart__sector" data-active={index === active ? activeLine : undefined} onPointerEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => setActive(index)} aria-hidden="true">
              <span className={`zen-chart__x ${typographyStyles["Label/Small/Medium"]}`}>{label}</span>
              {index === active && tooltip ? <span className="zen-chart__tooltip" style={anchorStyle(index, labels.length)}><TooltipSurface color="default" size="medium">{tooltip}</TooltipSurface></span> : null}
            </button>
          ))}
        </div>
        <ChartSummary id={`${id}-summary`}>{summary}</ChartSummary>
      </div>
    </div>
  );
}

/** The mean of the values a chart averages (none → no line). */
export const meanOf = (values: number[]) => (values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : undefined);

/**
 * Average line (`showAverage`): a dotted Border/Neutral/Solid rule at the mean, with an "Avg" tag in the Tooltip's
 * colours (Background/Neutral/Solid, Content/Inverse/Strongest, Label/Small/Medium) whose tip points along the rule. Across
 * the plot on vertical charts (the tag at its start), down the plot on horizontal bars (the tag on top).
 */
export function AverageLine({ label, style, direction = "across" }: { label: string; style: CSSProperties; direction?: "across" | "down" }) {
  return (
    <span className="zen-chart__average" data-direction={direction} style={style}>
      <span className={`zen-chart__average-tag ${typographyStyles["Label/Small/Medium"]}`}>{label}</span>
    </span>
  );
}

/** A Tooltip line for several series: "● $320  ● $210", each value after its series dot. */
export function SeriesValues({ items }: { items: { id: string; color: string; value: string }[] }) {
  return (
    <span className="zen-chart__tip-values">
      {items.map((item) => <span key={item.id} className="zen-chart__tip-value"><span className="zen-chart__tip-dot" style={{ background: item.color }} aria-hidden="true" />{item.value}</span>)}
    </span>
  );
}
