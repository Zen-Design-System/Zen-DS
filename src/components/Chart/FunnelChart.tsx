import type { CSSProperties, Ref } from "react";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./chart.css";
import { ChartBlock, ChartSummary, defaultFormat, signatureOf, staggerStyle, useChartId, useChartSelection, type ChartPaletteName, type ChartPoint } from "./chartCore";

export interface FunnelChartProps {
  /** One stage per step, first contact first (`{ label, value }`): each bar is as wide as its share of the first stage.
   *  Keep 3–6 stages. */
  data: ChartPoint[];
  /** Formats the counts under the stage names and in the summary (the shares are whole percent of the first stage). */
  format?: (value: number) => string;
  /** What the funnel shows and over which range ("Leads to signed projects, Q3 2026"). */
  "aria-label": string;
  /** Extra class on the chart (not the legend). */
  className?: string;
  /** Forwarded to the root `<div>` (the chart block that holds the plot and its legend). */
  ref?: Ref<HTMLDivElement>;
  /** The stage picked at first (the others dim). Default none: every stage at full strength until one is hovered or reached
   *  with ↑/↓. */
  initialIndex?: number;
  /** Open every bar from its centre on mount and when the data changes (default true; reduced motion fades). */
  animate?: boolean;
  /** Figma Color: `primary` (default) draws the stages in Color Chart Sector/Primary and the last in Sector/Secondary;
   *  `secondary` the stages in Sector/Secondary and the last in Sector/Primary. */
  palette?: ChartPaletteName;
}

/**
 * Funnel in the shared chart language (docs/research/chart-family-spec-2026-10-12.md): one row per stage — the name
 * (Body/Small/Medium · Content/Neutral/Strongest) over its count (Caption/Regular · Content/Neutral/Base) in an 84px start
 * column, a 32px bar centred in its track as wide as its share of the first stage (Chart/Sector/Primary, the last stage
 * Chart/Sector/Secondary, Corner-Radius/Small), and the share at the end (Body/Small/Medium, right-aligned). Rows
 * Spacing/Gap/XSmall apart, columns Spacing/Gap/Small. Stages are pickable like horizontal bars: hover or ↑/↓ and
 * Home/End pick one (the others dim) and the summary reads its name, count and share. Figma Chart/Funnel-Chart 15968:130460
 * (Color=Primary 15486:2497 · Secondary ↔ `palette`).
 */
export function FunnelChart({ data, format = defaultFormat, "aria-label": ariaLabel, className, initialIndex, animate = true, palette = "primary", ref }: FunnelChartProps) {
  const t = useZenLabels();
  const id = useChartId();
  const initial = initialIndex ?? null;
  const { active, setActive, onKeyDown } = useChartSelection(data.length, initial, "vertical");
  const first = data[0];
  const shareOf = (v: number) => (first && first.value > 0 ? Math.max(0, Math.min(100, (v / first.value) * 100)) : 0);
  const shareText = (v: number) => `${Math.round(shareOf(v))}%`;
  const current = active === null ? undefined : data[active];
  const summary = !first ? t.noData : current
    ? `${current.label}: ${format(current.value)}${active! > 0 ? `, ${t.chartShareOf(shareText(current.value), first.label)}` : ""} (${t.chartPoint(active! + 1, data.length)})`
    : data.map((d) => `${d.label} ${format(d.value)} (${shareText(d.value)})`).join(", ");
  return (
    <ChartBlock ref={ref} kind="funnel" palette={palette}>
      <div className={["zen-chart", "zen-chart--funnel", className].filter(Boolean).join(" ")} data-kind="funnel" data-animate={animate ? undefined : "false"}>
        <div className="zen-chart__funnel" role="group" aria-roledescription="chart" aria-label={ariaLabel} aria-describedby={`${id}-summary`} tabIndex={0}
          onKeyDown={onKeyDown} onBlur={() => setActive(initial)} onPointerLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) setActive(initial); }}
          data-picked={current ? "true" : undefined} style={{ "--zen-chart-count": data.length } as CSSProperties}>
          <div className="zen-chart__stages" key={signatureOf(data.map((d) => d.value))}>
            {data.map((d, i) => (
              <div key={d.label + i} className="zen-chart__stage" data-active={i === active ? "true" : undefined} data-last={i === data.length - 1 && i > 0 ? "true" : undefined} aria-hidden="true"
                onPointerEnter={() => setActive(i)} onClick={() => setActive(i)}>
                <span className="zen-chart__stage-label">
                  <span className={`zen-chart__stage-name ${typographyStyles["Body/Small/Medium"]}`}>{d.label}</span>
                  <span className={`zen-chart__stage-count ${typographyStyles["Caption/Regular"]}`}>{format(d.value)}</span>
                </span>
                <span className="zen-chart__stage-track">
                  {d.value > 0 ? <span className="zen-chart__stage-bar" style={staggerStyle(i, { width: `${shareOf(d.value)}%` })} /> : null}
                </span>
                <span className={`zen-chart__stage-share ${typographyStyles["Body/Small/Medium"]}`}>{shareText(d.value)}</span>
              </div>
            ))}
          </div>
          <ChartSummary id={`${id}-summary`}>{summary}</ChartSummary>
        </div>
      </div>
    </ChartBlock>
  );
}
