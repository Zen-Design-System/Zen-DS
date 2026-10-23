import type { CSSProperties, ReactNode, Ref } from "react";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./chart.css";
import { ChartBlock, ChartSummary, formatOf, signatureOf, staggerStyle, useChartId, useChartSelection, type ChartFormat, type ChartPoint } from "./chartCore";
import { dataAttributes } from "../_shared/data-attributes";

export interface BarListProps {
  /** One row per item (`{ label, value }`), already ranked by you, largest first: the list never reorders, and the
   *  largest value is the full length every other bar is measured against. Keep 3–8 rows (fold the rest into "Other"). */
  data: ChartPoint[];
  /** Column labels above the rows: what the items are (start) and what the values measure (end), e.g.
   *  `{ label: "Client", value: "Revenue" }`. Caption/Medium, Content/Neutral/Light. */
  headers?: { label: ReactNode; value: ReactNode };
  /** How each row's value and the summary read: a function (`(v) => "$" + v.toLocaleString("en-US")` → "$96,400"), or a
   *  preset a Zen Studio page can write as text — `"compact"` 96.4K (the default), `"currency"` $96.4K (in `currency`),
   *  `"percent"` 41%. */
  format?: ChartFormat;
  /** The currency of `format="currency"`: an ISO 4217 code ("USD", the default; "EUR", "VND"). Set alone it implies
   *  `format="currency"`. */
  currency?: string;
  /** What the list ranks and over which range ("Revenue by client, 2026 so far"). */
  "aria-label": string;
  /** Extra class on the chart. */
  className?: string;
  /** Forwarded to the root `<div>` (the chart block that holds the plot and its legend). */
  ref?: Ref<HTMLDivElement>;
  /** The row active at first, its bar at 48% (the others 24%). Default 0: the leader. ↑/↓, Home/End and hover move it. */
  initialIndex?: number;
  /** Grow the bars from the start on mount and when the data changes (default true; reduced motion fades). */
  animate?: boolean;
}

/**
 * Bar list: a ranking of 3–8 items, each a 32px row whose bar is as long as its share of the leader (Color Chart
 * Sector/Primary at 24%, the active row 48%, Corner-Radius/Small), the name inside the bar (Body/Small/Medium,
 * Content/Neutral/Strongest, Spacing/Padding/Small in) and the value at the end (Body/Small/Medium, Strongest, a column
 * Spacing/Gap/Small after the bars); rows Spacing/Gap/XSmall apart, optional column labels above (Caption/Medium,
 * Content/Neutral/Light). ↑/↓ and Home/End move the active row, hover picks one; the summary reads its name and value.
 * Figma Chart/Bar-List 15487:2473 (the chart body; the header is ChartCard's).
 */
export function BarList({ data, headers, format: formatProp, currency, "aria-label": ariaLabel, className, initialIndex = 0, animate = true, ref, ...rest }: BarListProps) {
  const format = formatOf(formatProp, currency);
  const t = useZenLabels();
  const id = useChartId();
  const { active, setActive, onKeyDown } = useChartSelection(data.length, initialIndex, "vertical");
  const leader = Math.max(0, ...data.map((d) => d.value));
  const share = (value: number) => (leader > 0 ? Math.max(0, Math.min(1, value / leader)) : 0);
  const current = active === null ? undefined : data[active];
  const summary = current ? `${current.label}: ${format(current.value)} (${t.chartPoint(active! + 1, data.length)})` : t.noData;
  return (
    <ChartBlock {...dataAttributes(rest)} ref={ref} kind="bar-list">
      <div className={["zen-chart", "zen-chart--list", className].filter(Boolean).join(" ")} data-kind="bar-list" data-animate={animate ? undefined : "false"}>
        <div className="zen-chart__list" style={{ "--zen-chart-count": data.length } as CSSProperties} role="group" aria-roledescription="chart" aria-label={ariaLabel} aria-describedby={`${id}-summary`} tabIndex={0} onKeyDown={onKeyDown}>
          {headers ? (
            <div className={`zen-chart__list-head ${typographyStyles["Caption/Medium"]}`} aria-hidden="true">
              <span>{headers.label}</span>
              <span>{headers.value}</span>
            </div>
          ) : null}
          <div className="zen-chart__list-rows" key={signatureOf(data.map((d) => [d.label, d.value]))}>
            {data.map((d, i) => (
              <div key={d.label + i} className="zen-chart__list-row" data-active={i === active ? "true" : undefined} aria-hidden="true" onPointerEnter={() => setActive(i)} onClick={() => setActive(i)}>
                <span className="zen-chart__list-track">
                  <span className="zen-chart__list-bar" style={staggerStyle(i, { "--zen-chart-share": share(d.value) } as CSSProperties)} />
                  <span className={`zen-chart__list-name ${typographyStyles["Body/Small/Medium"]}`}>{d.label}</span>
                </span>
                <span className={`zen-chart__list-value ${typographyStyles["Body/Small/Medium"]}`}>{format(d.value)}</span>
              </div>
            ))}
          </div>
          <ChartSummary id={`${id}-summary`}>{summary}</ChartSummary>
        </div>
      </div>
    </ChartBlock>
  );
}
