import { Fragment, useMemo, type CSSProperties, type Ref } from "react";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./chart.css";
import { AverageLine, ChartBlock, ChartSummary, PlotFrame, formatOf, meanOf, niceScale, signatureOf, staggerStyle, useChartId, useChartSelection, type ChartFormat, type ChartPaletteName, type ChartPoint } from "./chartCore";
import { dataAttributes } from "../_shared/data-attributes";

export interface BarChartProps {
  /** One bar per category or period (`{ label, value }`); mark a forecast `projected` (hatched) and give a bar a `target`
   *  to draw its goal as a hatched track behind it. Keep 3–12 bars. */
  data: ChartPoint[];
  /** `vertical` columns over periods (default) or `horizontal` bars for categories with longer names (Q1–Q4, teams). */
  orientation?: "vertical" | "horizontal";
  /** How axis labels, the Tooltip and the summary read: a function, or a preset a Zen Studio page can write as
   *  text: `"compact"` 1.2K, `"currency"` $1.2K (in `currency`), `"percent"` 41%. Default: 1.2K. */
  format?: ChartFormat;
  /** The currency of `format="currency"`: an ISO 4217 code ("USD", the default; "EUR", "VND"). Set alone it implies
   *  `format="currency"`. */
  currency?: string;
  /** Height of a vertical plot in px, lanes included. Horizontal charts take the height of their rows. */
  height?: number;
  /** What the chart shows and over which range ("Revenue per month, Jan – Dec 2026"). */
  "aria-label": string;
  className?: string;
  /** Forwarded to the root `<div>` (the chart block that holds the plot and its legend). */
  ref?: Ref<HTMLDivElement>;
  /** The bar active at first (painted Chart/Sector/Secondary, its Tooltip shown). Default: the last bar that isn't projected. */
  initialIndex?: number;
  /** Colour of the bars, any CSS colour. Default Chart/Sector/Primary (Chart/Sector/Secondary with `palette="secondary"`). */
  color?: string;
  /** Colour of the active bar, any CSS colour. Default Chart/Sector/Secondary (Chart/Sector/Primary with `palette="secondary"`). */
  activeColor?: string;
  /** Figma Color: `primary` (default) draws Color Chart Sector/Primary bars with the active one in Sector/Secondary;
   *  `secondary` draws Sector/Secondary bars with the active one in Sector/Primary. `color` / `activeColor` still win. */
  palette?: ChartPaletteName;
  /** Grow the bars from the baseline on mount and when the data changes (default true; reduced motion fades). */
  animate?: boolean;
  /** A dotted line at the mean of the bars that aren't projected, tagged "Avg $87.8K" (Figma Show Average). */
  showAverage?: boolean;
}

/**
 * Bar chart in the shared chart language (docs/research/chart-family-spec-2026-10-12.md): Chart/Sector/Primary bars with
 * Corner-Radius/Small, the active one Chart/Sector/Secondary with its Tooltip; projected bars and target tracks hatched
 * in Border/Neutral/Subtle. Vertical: the Line chart's frame (dashed grid, 6 Y labels, X pills, ←/→). Horizontal: a
 * category column, 24px bars, a value column at the end of the rows (the active one in Strongest; no Tooltip floats over
 * the bars, the user 2026-10-13) and a value axis below (↑/↓). Home/End jump to the first and last bar. Figma Chart/Bar-Chart
 * 15321:84071 (Orientation=Vertical 15321:80574 · Horizontal 15321:82941; Color=Primary · Secondary ↔ `palette`); the hatch is
 * .Chart/Hatch 15321:475.
 */
export function BarChart({ data, orientation = "vertical", format: formatProp, currency, height = 280, "aria-label": ariaLabel, className, initialIndex, color, activeColor, palette = "primary", animate = true, showAverage = false, ref, ...rest }: BarChartProps) {
  const format = formatOf(formatProp, currency);
  const t = useZenLabels();
  const id = useChartId();
  const signature = signatureOf(data.map((d) => [d.value, d.target ?? null, d.projected ?? false]));
  const { top, ticks } = useMemo(() => niceScale(Math.max(0, ...data.map((d) => Math.max(d.value, d.target ?? 0)))), [signature]); // eslint-disable-line react-hooks/exhaustive-deps -- deliberate content-hash memo: keyed on the data signature, not its identity
  const lastClosed = data.reduce((found, d, i) => (d.projected ? found : i), data.length - 1);
  const horizontal = orientation === "horizontal";
  const { active, setActive, onKeyDown } = useChartSelection(data.length, initialIndex ?? lastClosed, horizontal ? "vertical" : "horizontal");
  const current = active === null ? undefined : data[active];
  const valueText = (d: ChartPoint) => `${d.target !== undefined ? t.chartOfTarget(format(d.value), format(d.target)) : format(d.value)}${d.projected ? ` · ${t.chartProjected}` : ""}`;
  const mean = showAverage ? meanOf(data.filter((d) => !d.projected).map((d) => d.value)) : undefined;
  const average = mean === undefined ? undefined : { value: mean, label: t.chartAverage(format(mean)) };
  const summary = `${current ? `${current.label}: ${valueText(current)} (${t.chartPoint(active! + 1, data.length)})` : t.noData}${mean === undefined ? "" : `; ${t.chartAverageLong(format(mean))}`}`;
  const colours = { ...(color ? { "--zen-chart-bar": color } : null), ...(activeColor ? { "--zen-chart-bar-active": activeColor } : null) } as CSSProperties;
  const pct = (v: number) => `${(v / top) * 100}%`;

  if (!horizontal) {
    return (
      <ChartBlock {...dataAttributes(rest)} ref={ref} kind="bar" palette={palette}>
        <PlotFrame labels={data.map((d) => d.label)} ticks={ticks} top={top} format={format} active={active} setActive={setActive} onKeyDown={onKeyDown} height={height} ariaLabel={ariaLabel} activeLine="neutral" className={className} kind="bar" animate={animate}
          tooltip={current ? valueText(current) : null} summary={summary} average={average}>
          <div className="zen-chart__bars" key={signature} style={colours}>
            {data.map((d, i) => (
              <span key={d.label + i} className="zen-chart__column" data-active={i === active ? "true" : undefined}>
                {d.target !== undefined ? <span className="zen-chart__target" style={{ height: pct(d.target) }} /> : null}
                <span className="zen-chart__bar" data-projected={d.projected ? "true" : undefined} style={staggerStyle(i, { height: pct(d.value) })} />
              </span>
            ))}
          </div>
        </PlotFrame>
      </ChartBlock>
    );
  }

  return (
    <ChartBlock {...dataAttributes(rest)} ref={ref} kind="bar" palette={palette}>
      <div className={["zen-chart", "zen-chart--horizontal", className].filter(Boolean).join(" ")} data-kind="bar" data-orientation="horizontal" data-animate={animate ? undefined : "false"} style={colours}>
        <div className="zen-chart__hplot" role="group" aria-roledescription="chart" aria-label={ariaLabel} aria-describedby={`${id}-summary`} tabIndex={0} onKeyDown={onKeyDown} data-average={average ? "true" : undefined}
          style={{ "--zen-chart-count": data.length } as CSSProperties}>
          <div className="zen-chart__hgrid" aria-hidden="true">
            {ticks.map((tick) => <span key={tick} data-base={tick === 0 ? "true" : undefined} style={{ left: pct(tick) }} />)}
            {average ? <AverageLine direction="down" label={average.label} style={{ left: pct(average.value), "--zen-chart-anchor": average.value / top } as CSSProperties} /> : null}
          </div>
          <div className="zen-chart__hrows" key={signature}>
            {data.map((d, i) => (
              <Fragment key={d.label + i}>
                <span className={`zen-chart__hlabel ${typographyStyles["Label/Small/Medium"]}`} data-active={i === active ? "true" : undefined} aria-hidden="true" style={{ gridRow: i + 1 }} onPointerEnter={() => setActive(i)}>{d.label}</span>
                <span className="zen-chart__htrack" data-active={i === active ? "true" : undefined} aria-hidden="true" style={{ gridRow: i + 1 }} onPointerEnter={() => setActive(i)} onClick={() => setActive(i)}>
                  {d.target !== undefined ? <span className="zen-chart__target" style={{ width: pct(d.target) }} /> : null}
                  <span className="zen-chart__bar" data-projected={d.projected ? "true" : undefined} style={staggerStyle(i, { width: pct(d.value) })} />
                </span>
                {/* The value column: every row's value at its end, the active one in Strongest — nothing floats over the bars. */}
                <span className={`zen-chart__hvalue ${typographyStyles["Label/Small/Medium"]}`} data-active={i === active ? "true" : undefined} aria-hidden="true" style={{ gridRow: i + 1 }} onPointerEnter={() => setActive(i)}>{format(d.value)}</span>
              </Fragment>
            ))}
          </div>
          <div className="zen-chart__haxis" aria-hidden="true">{ticks.map((tick) => <span key={tick} className={typographyStyles["Label/Small/Medium"]} style={{ left: pct(tick) }}>{format(tick)}</span>)}</div>
          <ChartSummary id={`${id}-summary`}>{summary}</ChartSummary>
        </div>
      </div>
    </ChartBlock>
  );
}
