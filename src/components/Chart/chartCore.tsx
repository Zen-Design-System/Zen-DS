/* The chart family's shared language (docs/research/chart-family-spec-2026-10-12.md §2–4): palette, scale, legend,
   the cartesian plot frame, keyboard selection and the draw-in motion. Every chart in this folder is built from it. */
import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type Ref, type RefObject } from "react";
import { useMergedRefs } from "../_shared/merge-refs";
import { scaleKey } from "../_shared/scale";
import { TooltipSurface } from "../Tooltip";
import { VisuallyHidden } from "../VisuallyHidden";
import { typographyStyles } from "../../tokens/typography.generated";

export interface ChartPoint {
  label: string;
  value: number;
  /** BarChart: a forecast or a period not closed yet, drawn hatched (Figma .Chart/Hatch: Border/Neutral/Pale stripes on
   *  Support/Neutral/Pale). */
  projected?: boolean;
  /** BarChart: the goal for this bar, drawn as a hatched track behind it; the Tooltip reads "value of target". */
  target?: number;
}
/** How a LineChart fills the area under its line: `area` (Figma's fade, Accent/Solid at the top to Accent/Subtle at the
 *  baseline, at 30%) or `none`. `gradient` is deprecated (the area itself is the fade) and draws the same area. */
export type ChartFill = "area" | "none" | "gradient";
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
 *  Support Cyan, Violet, Yellow and Orange Solid, Support Green Soft. Figma paints chart marks with those styles.
 *  Sectors 3–7 read `--zen-chart-sector-tertiary … -septenary` first (a Zen Studio project's theme sets them; nothing in
 *  tokens.css does), so an app without them gets exactly these colours. */
export const chartPalette = [
  "var(--zen-chart-sector-primary, #ff66d4)",
  "var(--zen-chart-sector-secondary, #111)",
  "var(--zen-chart-sector-tertiary, var(--zen-color-background-support-cyan-solid, #21b8d8))",
  "var(--zen-chart-sector-quaternary, var(--zen-color-background-support-violet-solid, #7a5af8))",
  "var(--zen-chart-sector-quinary, var(--zen-color-background-support-yellow-solid, #f5b800))",
  "var(--zen-chart-sector-senary, var(--zen-color-background-support-orange-solid, #f5832a))",
  "var(--zen-chart-sector-septenary, var(--zen-color-background-support-green-soft, #acdaae))",
] as const;

/** The colour of the series (or slice) at `index`: its own colour, else the palette in order. */
export const colourAt = (item: { color?: string } | undefined, index: number) => item?.color ?? chartPalette[index % chartPalette.length];

/** The fade under an area, per palette slot (Figma Chart/Line-Chart's Trend and Chart/Area-Chart, 2026-10-14): a
 *  vertical gradient from a Solid colour at the area's highest point to its Subtle at the baseline, the whole area at 30%
 *  (chart.css). Figma binds Background/Accent, Background/Neutral and Background/Support/Cyan Solid → Subtle for the first
 *  three bands; the later slots fade their palette hue the same way (Green Soft → Green Subtle; a project's sector to its
 *  `-subtle`). */
export const chartFades = [
  ["var(--zen-color-background-accent-solid-default, #ff66d4)", "var(--zen-color-background-accent-subtle-default, rgb(255 102 212 / 12%))"],
  ["var(--zen-color-background-neutral-solid-default, #111)", "var(--zen-color-background-neutral-subtle-default, rgb(2 2 2 / 7%))"],
  [chartPalette[2], "var(--zen-chart-sector-tertiary-subtle, var(--zen-color-background-support-cyan-subtle, rgb(0 168 236 / 16%)))"],
  [chartPalette[3], "var(--zen-chart-sector-quaternary-subtle, var(--zen-color-background-support-violet-subtle, rgb(122 90 248 / 16%)))"],
  [chartPalette[4], "var(--zen-chart-sector-quinary-subtle, var(--zen-color-background-support-yellow-subtle, rgb(245 184 0 / 16%)))"],
  [chartPalette[5], "var(--zen-chart-sector-senary-subtle, var(--zen-color-background-support-orange-subtle, rgb(245 131 42 / 16%)))"],
  [chartPalette[6], "var(--zen-chart-sector-septenary-subtle, var(--zen-color-background-support-green-subtle, rgb(172 218 174 / 16%)))"],
] as const;

/** The fade of the series at `index`: the palette slot's Solid → Subtle, or a series' own `color` fading to 16% of itself
 *  (about the Support ramps' Subtle). */
export const fadeAt = (item: { color?: string } | undefined, index: number) => {
  if (item?.color) return { top: item.color, bottom: item.color, bottomOpacity: 0.16 };
  const [top, bottom] = chartFades[index % chartFades.length];
  return { top, bottom, bottomOpacity: undefined };
};

/** An area's fade as an SVG gradient: top → bottom over the area's own bounds (objectBoundingBox), as Figma's linear
 *  gradient on the area vector. Paint the area with `fill="url(#id)"`. */
export function ChartFade({ id, top, bottom, bottomOpacity }: { id: string; top: string; bottom: string; bottomOpacity?: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style={{ stopColor: top }} />
      <stop offset="1" style={{ stopColor: bottom, stopOpacity: bottomOpacity }} />
    </linearGradient>
  );
}

/** "1.2K" from 1,000 up, else the value to one decimal at most (a mean of 306.666… reads "306.7"). */
export const defaultFormat = (value: number) => (Math.abs(value) >= 1000 ? `${Math.round(value / 100) / 10}K` : `${Math.round(value * 10) / 10}`);

/** A ring chart's diameter steps (Figma Donut-Chart / Radial-Chart Size; the user 2026-10-16). */
export const chartRingSizes = ["small", "medium", "large", "xlarge"] as const;
/** Small 120 · Medium 168 (default) · Large 240 · XLarge 320 px, in either spelling (`sm` … `xl`). */
export type ChartRingSize = (typeof chartRingSizes)[number] | "sm" | "md" | "lg" | "xl";
const RING_SIZE_PX: Record<(typeof chartRingSizes)[number], number> = { small: 120, medium: 168, large: 240, xlarge: 320 };

/** A ring's diameter in px and its step (which centre text it fits): a named size, or a number of px (the nearest step). */
export function ringSize(size: ChartRingSize | number | undefined): { px: number; step: (typeof chartRingSizes)[number] } {
  if (typeof size === "number") return { px: size, step: size < 144 ? "small" : size < 204 ? "medium" : size < 280 ? "large" : "xlarge" };
  const key = scaleKey(size ?? "medium", chartRingSizes);
  const step = (chartRingSizes as readonly string[]).includes(key) ? key : "medium";
  return { px: RING_SIZE_PX[step], step };
}

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
 * it. `initial` null starts with no active item (Donut and Radial show their overview until one is picked). Until an
 * item is picked the active one follows `initial`, so data that arrives after mount shows its default item (not "No
 * data"); a pick stays, clamped into the data, and `setActive(undefined)` hands it back to the default.
 */
export function useChartSelection(count: number, initial: number | null, keys: Keys = "horizontal") {
  const [picked, setActive] = useState<number | null | undefined>(undefined);
  const wanted = picked === undefined ? initial : picked;
  const active = wanted === null || count === 0 ? null : Math.max(0, Math.min(count - 1, wanted));
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const step = STEP[keys][event.key];
    const next = step !== undefined ? (active === null ? (step < 0 ? count - 1 : 0) : active + step) : event.key === "Home" ? 0 : event.key === "End" ? count - 1 : null;
    if (next === null || count === 0) return;
    event.preventDefault();
    setActive(Math.max(0, Math.min(count - 1, next)));
  };
  return { active, setActive, onKeyDown };
}

/** Legend (Figma Legend item 6643:73387, .Chart/Legend-Item 15321:79362): a 12px dot, Spacing/Gap/2XSmall before its
 *  Caption/Regular label. `gap`: `xsmall` (default) keeps items Spacing/Gap/XSmall apart and rows Spacing/Gap/2XSmall, as
 *  the Multi-Line, Donut and Radial legends (15426:2587, 15324:1041, 15325:1076); `small` keeps items Spacing/Gap/Small
 *  apart and rows Spacing/Gap/XSmall, as every phase-2 legend (Area 15484:2653, Grouped-Bar 15485:2511, Combo 15485:2581,
 *  Gauge 15486:2489, Bullet 15487:2554). `align="start"` leads at the start instead of centring (Bullet). */
export function ChartLegend({ items, className, gap = "xsmall", align = "center" }: { items: { id: string; label: ReactNode; color: string }[]; className?: string; gap?: "xsmall" | "small"; align?: "center" | "start" }) {
  return (
    <ul className={["zen-chart__legend", className].filter(Boolean).join(" ")} data-gap={gap === "small" ? "small" : undefined} data-align={align === "start" ? "start" : undefined}>
      {items.map((item) => <li key={item.id} className={typographyStyles["Caption/Regular"]}><span className="zen-chart__swatch" style={{ background: item.color }} aria-hidden="true" />{item.label}</li>)}
    </ul>
  );
}

/**
 * A round chart's legend (or total column) beside the ring: true once the box is too narrow and the flex row has put it
 * under or over the ring, so chart.css turns that column into a centred row that wraps (Figma auto layout Wrap) instead
 * of a tall list beside nothing. The flex basis decides the wrap, not the legend's content, so the switch never loops.
 */
function useBesideWrapped(block: RefObject<HTMLDivElement | null>, on: boolean) {
  const [wrapped, setWrapped] = useState(false);
  useLayoutEffect(() => {
    const node = block.current;
    if (!on || !node || typeof ResizeObserver === "undefined") { setWrapped(false); return; }
    const measure = () => {
      const ring = node.querySelector(":scope > .zen-chart--round");
      const beside = Array.from(node.children).find((child) => child !== ring);
      if (!ring || !beside) return;
      const a = ring.getBoundingClientRect();
      const b = beside.getBoundingClientRect();
      setWrapped(b.top >= a.bottom - 1 || b.bottom <= a.top + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [block, on]);
  return wrapped;
}

/** A chart with its legend before or after it (top / bottom; start / end beside it for round charts). */
export function ChartBlock({ legend, position = "bottom", kind, children, className, layout, ref }: { legend?: ReactNode; position?: ChartLegendPosition; kind: string; children: ReactNode; className?: string; layout?: string; ref?: Ref<HTMLDivElement> }) {
  const own = useRef<HTMLDivElement>(null);
  const merged = useMergedRefs(own, ref);
  const beside = Boolean(legend && (position === "start" || position === "end")) || layout === "total-start";
  const wrapped = useBesideWrapped(own, beside);
  return (
    <div ref={merged} className={["zen-chart-block", className].filter(Boolean).join(" ")} data-kind={kind} data-legend={legend ? position : undefined} data-layout={layout} data-wrapped={beside && wrapped ? "true" : undefined}>
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

/** Ref for a floating Tooltip centred on its item (Figma: the Tooltip CENTER on the active sector's rule, the active
 *  cell). It moves off that centre only by what it would cross the chart's edge, as `--zen-chart-shift` in CSS px (the
 *  screen overflow divided by the chart's scale, so a zoomed Studio frame shifts it right too); it measures again when the
 *  chart or the Tooltip resizes. */
export const placeTip = (tip: HTMLElement | null) => {
  const box = tip?.closest<HTMLElement>(".zen-chart");
  if (!tip || !box) return;
  const place = () => {
    tip.style.setProperty("--zen-chart-shift", "0px");
    const t = tip.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    const scale = tip.offsetWidth ? t.width / tip.offsetWidth : 1;
    const shift = t.width >= b.width ? b.left - t.left : t.left < b.left ? b.left - t.left : t.right > b.right ? b.right - t.right : 0;
    tip.style.setProperty("--zen-chart-shift", `${shift / (scale || 1)}px`);
  };
  place();
  if (typeof ResizeObserver === "undefined") return;
  const observer = new ResizeObserver(place);
  observer.observe(box);
  observer.observe(tip);
  return () => observer.disconnect();
};

/** `--zen-chart-i`: the stagger index of a mark (its delay is a multiple of a motion token, see chart.css). */
export const staggerStyle = (index: number, extra?: CSSProperties) => ({ "--zen-chart-i": index, ...extra } as CSSProperties);

/**
 * Cartesian frame shared by LineChart, BarChart (vertical) and StackBarChart: Y labels (Label/Small/Medium,
 * Neutral/Light), dashed Border/Neutral/Pale grid (solid baseline), one sector column per X value with its X label (a
 * pill when active) and the active item's Tooltip in the top lane (chart.css: a seventh of the plot for line and stack, as
 * Figma's 14-row Trend grid; 36px / 28px for bars).
 */
export function PlotFrame({ labels, ticks, top, format, active, setActive, onKeyDown, height, ariaLabel, tooltip, activeLine, children, className, summary, kind, animate, average }: {
  labels: string[]; ticks: number[]; top: number; format: (v: number) => string; active: number | null; setActive: (i: number) => void; onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  height: number; ariaLabel: string; tooltip: ReactNode; activeLine: "accent" | "neutral"; children: ReactNode; className?: string; summary: ReactNode; kind: "line" | "bar" | "stack"; animate: boolean;
  /** The average line (showAverage): its value and the tag's text. */
  average?: { value: number; label: string };
}) {
  const id = useChartId();
  return (
    <div className={["zen-chart", className].filter(Boolean).join(" ")} data-kind={kind} data-animate={animate ? undefined : "false"} data-dense={labels.length > 8 ? "true" : undefined} style={{ "--zen-chart-height": `calc(${height}px + var(--zen-chart-grow, 0px))`, "--zen-chart-base": `${height}px`, "--zen-chart-count": labels.length } as CSSProperties}>
      <div className="zen-chart__y" aria-hidden="true">
        {ticks.map((tick) => <span key={tick} className={typographyStyles["Label/Small/Medium"]} style={{ bottom: `calc(var(--zen-chart-lane-bottom) + (100% - var(--zen-chart-lane-top) - var(--zen-chart-lane-bottom)) * ${tick / top})` }}>{format(tick)}</span>)}
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
              {index === active && tooltip ? <span className="zen-chart__tooltip" ref={placeTip}><TooltipSurface color="default" size="medium">{tooltip}</TooltipSurface></span> : null}
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
