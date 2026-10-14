/* The marks a typed MetricCard draws under its number (Figma Metric-Card 6643:64008, the Type axis; docs/research/
   widget-patterns-spec-2026-10-14.md "As built (metric-types)"): the sparkline, the spark bars and the category bar.
   Internal parts: MetricCard `type` is the public API. Palette, draw-in and reduced motion follow the chart family
   (chartCore, docs/research/chart-family-spec-2026-10-12.md §2–§3). */
import type { CSSProperties } from "react";
import { colourAt, defaultFormat, signatureOf, staggerStyle, useChartId } from "../Chart/chartCore";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";

/** The finite values of a series, in order. */
const finite = (values: readonly number[] | undefined) => (values ?? []).filter((value) => Number.isFinite(value));

/** The accessible name of a series: `label`, else "Trend over 12 periods: from 61 to 106, low 61, high 106". */
export function useSeriesName(values: readonly number[], format: (value: number) => string = defaultFormat, label?: string) {
  const t = useZenLabels();
  if (label) return label;
  if (!values.length) return t.noData;
  return t.metricSeries(values.length, format(values[0]), format(values[values.length - 1]), format(Math.min(...values)), format(Math.max(...values)));
}

/** Figma's Sparkline frame (Type=Sparkline 15480:89548 and Type=Hero 15481:2047, both 64 tall since 2026-10-14). */
const SPARK_HEIGHT = 64;
/** The line keeps 4px clear of the frame's top and bottom (Figma Line y 4, h 56). */
const INSET = 4;

/**
 * Figma Metric-Card Sparkline: a 2px line (round caps and joins) over an area whose top edge is the line and which runs
 * to the frame's bottom, fading from the Solid token down to the Subtle one, the whole area at 16%. `tone="accent"`
 * (Type=Sparkline): Border/Accent/Solid, the area Accent/Solid → Accent/Subtle. `tone="neutral"` (Type=Hero):
 * Border/Neutral/Solid, the area Neutral/Solid → Neutral/Subtle. Draws in left → right; reduced motion fades.
 */
export function Sparkline({ values: raw, tone, name, animate }: { values: readonly number[] | undefined; tone: "accent" | "neutral"; name: string; animate: boolean }) {
  const fadeId = `zen-metric-fade-${useChartId()}`;
  const values = finite(raw);
  const height = SPARK_HEIGHT;
  const drawn = values.length === 1 ? [values[0], values[0]] : values;
  const min = Math.min(...drawn);
  const span = Math.max(...drawn) - min;
  const y = (value: number) => INSET + (span > 0 ? 1 - (value - min) / span : 0.5) * (height - 2 * INSET);
  const points = drawn.map((value, index) => [(index / Math.max(1, drawn.length - 1)) * 100, y(value)] as const);
  const line = points.map(([px, py], index) => `${index ? "L" : "M"} ${px} ${py}`).join(" ");
  return (
    <div className="zen-metric-spark" data-tone={tone} data-animate={animate ? undefined : "false"} role="img" aria-label={name}>
      {points.length ? (
        <div className="zen-metric-spark__marks" key={signatureOf(values)}>
          <svg className="zen-metric-spark__svg" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" className="zen-metric-spark__fade-top" />
                <stop offset="1" className="zen-metric-spark__fade-bottom" />
              </linearGradient>
            </defs>
            <path className="zen-metric-spark__area" d={`${line} L 100 ${height} L 0 ${height} Z`} fill={`url(#${fadeId})`} />
            <path className="zen-metric-spark__line" d={line} vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Figma Metric-Card Spark-Bars (15480:89594): a 48px row of bars, Spacing/Gap/2XSmall apart, bottom-aligned, each as wide
 * as the row allows, Corner-Radius/XSmall; Chart Sector/Primary, the last (current) bar Chart Sector/Secondary. Heights
 * are shares of the largest value. Each bar rises from the baseline (Slow, Emphasized, staggered); reduced motion fades.
 */
export function SparkBars({ values: raw, name, animate }: { values: readonly number[] | undefined; name: string; animate: boolean }) {
  const values = finite(raw);
  const max = Math.max(0, ...values);
  return (
    <div className="zen-metric-bars" data-animate={animate ? undefined : "false"} role="img" aria-label={name}>
      <div className="zen-metric-bars__marks" key={signatureOf(values)} aria-hidden="true">
        {values.map((value, index) => (
          <span key={index} className="zen-metric-bars__bar" data-current={index === values.length - 1 ? "true" : undefined}
            style={staggerStyle(index, { height: `${max > 0 ? (Math.max(0, value) / max) * 100 : 0}%` })} />
        ))}
      </div>
    </div>
  );
}

/** One share of a Category-Bar MetricCard. */
export interface MetricCategory {
  /** Stable key (React key and the row's identity). */
  id: string;
  /** The category's name (Figma .Chart/Legend-Item label, Caption/Regular). */
  label: string;
  /** Its amount, a number in the card's unit: the segment's length and the row's share come from it. */
  value: number;
  /** CSS colour of its segment and dot; defaults walk the chart palette (Color Chart Sector/Primary, Secondary, …). */
  color?: string;
}

/** Whole-number shares of `values` that add up to 100 (largest remainder), so the rows never read 99% or 101%. */
export function sharesOf(values: readonly number[]) {
  const positive = values.map((value) => (Number.isFinite(value) ? Math.max(0, value) : 0));
  const total = positive.reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) return positive.map(() => 0);
  const exact = positive.map((value) => (value / total) * 100);
  const shares = exact.map(Math.floor);
  const order = exact.map((value, index) => [value - Math.floor(value), index] as const).sort((a, b) => b[0] - a[0]);
  for (let left = 100 - shares.reduce((sum, value) => sum + value, 0), i = 0; left > 0 && i < order.length; left--, i++) shares[order[i][1]] += 1;
  return shares;
}

/**
 * Figma Metric-Card Category-Bar (15481:1957): a 12px bar of segments, Spacing/Gap/2XSmall apart, Corner-Radius/XSmall,
 * each as long as its share of the total, in the chart palette; under it (Spacing/Gap/Medium) one row per category,
 * Spacing/Gap/XSmall apart: the legend item (12px dot, Spacing/Gap/2XSmall, Caption/Regular · Neutral/Strongest), the
 * amount (Body/Small/Medium · Neutral/Strongest) and the share (Body/Small/Regular · Neutral/Base, end-aligned). The bar
 * is decorative; the rows say every number. Segments grow from the start (Slow, Emphasized, staggered); reduced motion
 * fades.
 */
export function CategoryBar({ categories, format = defaultFormat, animate }: { categories: readonly MetricCategory[] | undefined; format?: (value: number) => string; animate: boolean }) {
  const list = categories ?? [];
  const shares = sharesOf(list.map((item) => item.value));
  return (
    <div className="zen-metric-categories" data-animate={animate ? undefined : "false"}>
      <div className="zen-metric-categories__bar" key={signatureOf(list.map((item) => item.value))} aria-hidden="true">
        {list.map((item, index) => (Number.isFinite(item.value) && item.value > 0
          ? <span key={item.id} className="zen-metric-categories__segment" style={staggerStyle(index, { flexGrow: item.value, background: colourAt(item, index) } as CSSProperties)} />
          : null))}
      </div>
      <ul className="zen-metric-categories__rows">
        {list.map((item, index) => (
          <li key={item.id} className="zen-metric-categories__row">
            <span className={`zen-metric-categories__name ${typographyStyles["Caption/Regular"]}`}><span className="zen-metric-categories__dot" style={{ background: colourAt(item, index) }} aria-hidden="true" />{item.label}</span>
            <span className={`zen-metric-categories__amount ${typographyStyles["Body/Small/Medium"]}`}>{format(item.value)}</span>
            <span className={`zen-metric-categories__share ${typographyStyles["Body/Small/Regular"]}`}>{`${shares[index]}%`}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
