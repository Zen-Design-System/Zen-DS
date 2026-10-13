import { Fragment, useState, type CSSProperties, type KeyboardEvent } from "react";
import { TooltipSurface } from "../Tooltip";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./chart.css";
import { ChartBlock, ChartSummary, anchorStyle, defaultFormat, signatureOf, staggerStyle, useChartId } from "./chartCore";

export interface HeatmapChartProps {
  /** Row labels, top to bottom ("1 pm", "2 pm"…). */
  rows: string[];
  /** Column labels, left to right ("Mon", "Tue"…). */
  columns: string[];
  /** One value per row per column: `values[row][column]`. */
  values: number[][];
  /** Formats the Tooltip and the summary ("14 sessions"). */
  format?: (value: number) => string;
  /** The value of the deepest step. Default: the largest value. */
  max?: number;
  /** What the chart shows ("Studio sessions by weekday and hour, September 2026"). */
  "aria-label": string;
  /** The Less → More scale under the grid (default true). */
  showLegend?: boolean;
  className?: string;
  /** Fade the cells in, row by row, on mount and when the values change (default true; reduced motion only fades). */
  animate?: boolean;
}

const LEVELS = [0, 1, 2, 3, 4] as const;
/** 5 steps of the Support/Brand ramp: Pale · Subtle · Soft · Solid · Deep. */
const levelOf = (value: number, max: number) => (value <= 0 || max <= 0 ? 0 : Math.min(4, Math.floor((value / max) * 5)));

/**
 * Heatmap in the shared chart language (docs/research/chart-family-spec-2026-10-12.md): a 24px-tall cell per row ×
 * column (Corner-Radius/Small, Spacing/Gap/2XSmall apart) on 5 Support/Brand steps, column labels on top and row labels
 * on the left (Label/Small/Medium, Neutral/Light), a Less → More scale (Caption/Regular). Hover or the arrow keys pick a
 * cell (its row and column labels light up and its Tooltip reads "Tue 1 pm · 55 h"); Home/End jump to the row's first and
 * last cell. Figma Chart/Heatmap-Chart 15326:1043.
 */
export function HeatmapChart({ rows, columns, values, format = defaultFormat, max: maxProp, "aria-label": ariaLabel, showLegend = true, className, animate = true }: HeatmapChartProps) {
  const t = useZenLabels();
  const id = useChartId();
  const [active, setActive] = useState<[number, number] | null>(null);
  const valueAt = (r: number, c: number) => values[r]?.[c] ?? 0;
  const flat = rows.flatMap((_, r) => columns.map((__, c) => ({ r, c, v: valueAt(r, c) })));
  const max = maxProp ?? Math.max(0, ...flat.map((cell) => cell.v));
  const peak = flat.reduce<(typeof flat)[number] | undefined>((best, cell) => (!best || cell.v > best.v ? cell : best), undefined);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const [r, c] = active ?? [0, -1];
    const moves: Record<string, [number, number]> = { ArrowRight: [r, c + 1], ArrowLeft: [r, c - 1], ArrowDown: [r + 1, Math.max(0, c)], ArrowUp: [r - 1, Math.max(0, c)], Home: [r, 0], End: [r, columns.length - 1] };
    const next = moves[event.key];
    if (!next || !rows.length || !columns.length) return;
    event.preventDefault();
    setActive([Math.max(0, Math.min(rows.length - 1, next[0])), Math.max(0, Math.min(columns.length - 1, next[1]))]);
  };
  const cellText = (r: number, c: number) => `${columns[c]}, ${rows[r]}: ${format(valueAt(r, c))}`;
  const summary = !flat.length ? t.noData : active ? cellText(active[0], active[1]) : peak ? `${t.chartHighest}: ${cellText(peak.r, peak.c)}` : t.noData;
  const legend = showLegend ? (
    <div className={`zen-chart__scale ${typographyStyles["Caption/Regular"]}`} aria-hidden="true">
      <span>{t.chartLess}</span>
      {LEVELS.map((level) => <span key={level} className="zen-chart__scale-step" data-level={level} />)}
      <span>{t.chartMore}</span>
    </div>
  ) : undefined;
  return (
    <ChartBlock kind="heatmap" legend={legend} position="bottom">
      <div className={["zen-chart", "zen-chart--heatmap", className].filter(Boolean).join(" ")} data-kind="heatmap" data-animate={animate ? undefined : "false"} style={{ "--zen-chart-columns": columns.length } as CSSProperties}>
        <div className="zen-chart__heat" role="group" aria-roledescription="chart" aria-label={ariaLabel} aria-describedby={`${id}-summary`} tabIndex={0}
          onKeyDown={onKeyDown} onBlur={() => setActive(null)} onPointerLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) setActive(null); }}>
          <span aria-hidden="true" />
          {columns.map((column, c) => <span key={column + c} className={`zen-chart__heat-label ${typographyStyles["Label/Small/Medium"]}`} data-axis="column" data-active={active?.[1] === c ? "true" : undefined} aria-hidden="true">{column}</span>)}
          <div className="zen-chart__cells" key={signatureOf(values)}>
            {rows.map((row, r) => (
              <Fragment key={row + r}>
                <span className={`zen-chart__heat-label ${typographyStyles["Label/Small/Medium"]}`} data-axis="row" data-active={active?.[0] === r ? "true" : undefined} aria-hidden="true">{row}</span>
                {columns.map((column, c) => {
                  const on = active?.[0] === r && active[1] === c;
                  return (
                    <span key={column + c} className="zen-chart__cell" data-level={levelOf(valueAt(r, c), max)} data-active={on ? "true" : undefined} aria-hidden="true"
                      style={staggerStyle(r + c)} onPointerEnter={() => setActive([r, c])}>
                      {on ? <span className="zen-chart__cell-tip" style={anchorStyle(c, columns.length)}><TooltipSurface color="default" size="medium">{`${column} ${row} · ${format(valueAt(r, c))}`}</TooltipSurface></span> : null}
                    </span>
                  );
                })}
              </Fragment>
            ))}
          </div>
          <ChartSummary id={`${id}-summary`}>{summary}</ChartSummary>
        </div>
      </div>
    </ChartBlock>
  );
}
