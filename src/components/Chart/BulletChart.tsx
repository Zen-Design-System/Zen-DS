import type { CSSProperties, Ref } from "react";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./chart.css";
import { ChartBlock, ChartLegend, ChartSummary, formatOf, niceScale, sectorAt, signatureOf, staggerStyle, useChartId, useChartSelection, type ChartFormatPreset, type ChartLegendPosition, type ChartPaletteName } from "./chartCore";
import { dataAttributes } from "../_shared/data-attributes";

/** One goal of a BulletChart: what it measures, where it stands and where it should be. */
export interface ChartBullet {
  /** The goal's name ("Revenue", "New clients"). */
  label: string;
  /** Where it stands now: the bar. */
  value: number;
  /** Where it should be: the tick. */
  target: number;
  /** The value the full track stands for. Default: a round number at least 10% above the larger of value and target, so
   *  the tick never sits on the track's end (900 → 1,000, 24 → 30, 85 → 100). */
  max?: number;
}

export interface BulletChartProps {
  /** One row per goal (`{ label, value, target, max }`); each row has its own scale, so goals in different units can
   *  share the chart. Keep 1–4 rows. */
  data: ChartBullet[];
  /** The legend's name for the bar. Default the label "Actual". */
  actualLabel?: string;
  /** The legend's name for the tick. Default the label "Target". */
  targetLabel?: string;
  /** Show the legend that names the bar and the tick (Figma Show Legend, default true). */
  showLegend?: boolean;
  /** Legend below the rows (default) or above them. */
  legendPosition?: Extract<ChartLegendPosition, "top" | "bottom">;
  /** How the value and the target of a row ("$798K of $900K") and the summary read. A function gets the row too, so
   *  each goal can take its own unit: `(v, row) => (row.label === "Utilisation" ? v + "%" : String(v))`; or a
   *  preset a Zen Studio page can write as text: `"compact"` 1.2K (the default), `"currency"` $1.2K (in
   *  `currency`), `"percent"` 41%. */
  format?: ((value: number, row: ChartBullet) => string) | ChartFormatPreset;
  /** The currency of `format="currency"`: an ISO 4217 code ("USD", the default; "EUR", "VND"). Set alone it implies
   *  `format="currency"`. */
  currency?: string;
  /** What the goals are and for which period ("Quarter goals, Q3 2026"). */
  "aria-label": string;
  /** Extra class on the chart (not the legend). */
  className?: string;
  /** Forwarded to the root `<div>` (the chart block that holds the plot and its legend). */
  ref?: Ref<HTMLDivElement>;
  /** A row active at first (the others' marks dim). Default none: every row reads alike until one is picked. */
  initialIndex?: number;
  /** Grow the bars from the start and fade the ticks in on mount and when the data changes (default true; reduced
   *  motion fades). */
  animate?: boolean;
  /** Figma Color: `primary` (default) draws the bars in Color Chart Sector/Primary and the target ticks in Sector/Secondary;
   *  `secondary` the bars in Sector/Secondary and the ticks in Sector/Primary. */
  palette?: ChartPaletteName;
}

/**
 * Bullet chart: 1–4 goals, each a row with its label (Body/Small/Medium, Content/Neutral/Strongest) and "actual of
 * target" (Body/Small/Regular, Content/Neutral/Base) above a 16px Corner-Radius/Rounded track (Border/Neutral/Subtle/
 * Pressed at 50%: Figma's Color Chart Sector/On-Color/Tertiary), the actual as an 8px Color Chart Sector/Primary bar inset
 * 4px, and the target as a 3px Color Chart Sector/Secondary tick 24px tall; rows Spacing/Gap/Medium apart, label and
 * track Spacing/Gap/XSmall. A legend (Spacing/Gap/Small between items) names the bar and the tick. ↑/↓ and Home/End
 * pick a row (the others' marks dim), hover too; the summary reads "Revenue: $798K of $900K (1 of 3)".
 * Figma Chart/Bullet-Chart 15968:130554 (Color=Primary 15487:2516 · Secondary ↔ `palette`; the chart body and Show Legend; the
 * header is ChartCard's).
 */
export function BulletChart({ data, actualLabel, targetLabel, showLegend = true, legendPosition = "bottom", format, currency, "aria-label": ariaLabel, className, initialIndex, animate = true, palette = "primary", ref, ...rest }: BulletChartProps) {
  const t = useZenLabels();
  const id = useChartId();
  const { active, setActive, onKeyDown } = useChartSelection(data.length, initialIndex ?? null, "vertical");
  const preset = typeof format === "function" ? null : formatOf(format, currency);
  const show = (value: number, row: ChartBullet) => (typeof format === "function" ? format(value, row) : preset!(value));
  const rows = data.map((d, i) => {
    const max = d.max ?? niceScale(Math.max(d.value, d.target) * 1.1).top;
    const share = (v: number) => (max > 0 && Number.isFinite(v / max) ? Math.max(0, Math.min(1, v / max)) : 0);
    return { d, i, actual: share(d.value), target: share(d.target), reading: t.chartOfTarget(show(d.value, d), show(d.target, d)) };
  });
  const current = active === null ? undefined : rows[active];
  const summary = !rows.length ? t.noData : current
    ? `${current.d.label}: ${current.reading} (${t.chartPoint(current.i + 1, rows.length)})`
    : rows.map((row) => `${row.d.label} ${row.reading}`).join(", ");
  const legend = showLegend ? (
    <ChartLegend gap="small" align="start" items={[{ id: "actual", label: actualLabel ?? t.chartActual, color: sectorAt(0, palette) }, { id: "target", label: targetLabel ?? t.chartTarget, color: sectorAt(1, palette) }]} />
  ) : undefined;
  return (
    <ChartBlock {...dataAttributes(rest)} ref={ref} kind="bullet" legend={legend} position={legendPosition} palette={palette}>
      <div className={["zen-chart", "zen-chart--bullet", className].filter(Boolean).join(" ")} data-kind="bullet" data-animate={animate ? undefined : "false"}>
        <div className="zen-chart__bullets" role="group" aria-roledescription="chart" aria-label={ariaLabel} aria-describedby={`${id}-summary`} tabIndex={0}
          onKeyDown={onKeyDown} onBlur={() => setActive(null)} onPointerLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) setActive(null); }}
          data-picked={current ? "true" : undefined}>
          <div className="zen-chart__bullet-rows" style={{ "--zen-chart-count": rows.length } as CSSProperties} key={signatureOf(rows.map((row) => [row.actual, row.target]))}>
            {rows.map((row) => (
              <div key={row.d.label + row.i} className="zen-chart__bullet" data-active={row.i === active ? "true" : undefined} aria-hidden="true" onPointerEnter={() => setActive(row.i)} onClick={() => setActive(row.i)}>
                <span className="zen-chart__bullet-head">
                  <span className={`zen-chart__bullet-name ${typographyStyles["Body/Small/Medium"]}`}>{row.d.label}</span>
                  <span className={`zen-chart__bullet-reading ${typographyStyles["Body/Small/Regular"]}`}>{row.reading}</span>
                </span>
                <span className="zen-chart__bullet-track" style={{ "--zen-chart-actual": row.actual, "--zen-chart-target": row.target } as CSSProperties}>
                  {row.actual > 0 ? <span className="zen-chart__bullet-actual" style={staggerStyle(row.i)} /> : null}
                  <span className="zen-chart__bullet-target" style={staggerStyle(row.i)} />
                </span>
              </div>
            ))}
          </div>
          <ChartSummary id={`${id}-summary`}>{summary}</ChartSummary>
        </div>
      </div>
    </ChartBlock>
  );
}
