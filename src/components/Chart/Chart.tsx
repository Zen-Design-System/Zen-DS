import { useId, useMemo, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { Card, type CardSurface, type CardTheme } from "../Card";
import { EmptyStateCardContext } from "../EmptyState/EmptyState";
import { IconButton } from "../Button";
import { Icon } from "../Icon";
import { Segmented, type SegmentedOption } from "../Segmented";
import { TooltipSurface } from "../Tooltip";
import { VisuallyHidden } from "../VisuallyHidden";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./chart.css";
import "../Icon/core";

export interface ChartPoint { label: string; value: number }
export interface ChartSeries { id: string; label: string; /** CSS colour; defaults walk the Figma palette (Chart/Sector/Primary · Secondary · Cyan · Violet · Yellow …). */ color?: string }
export interface ChartStack { label: string; values: Record<string, number> }

/** Figma legend order: Chart/Sector/Primary, Chart/Sector/Secondary, then Support Solid colours. */
export const chartPalette = [
  "var(--zen-chart-sector-primary, #111)",
  "var(--zen-chart-sector-secondary, #ff66d4)",
  "var(--zen-color-background-support-cyan-solid, #21b8d8)",
  "var(--zen-color-background-support-violet-solid, #7a5af8)",
  "var(--zen-color-background-support-yellow-solid, #f5b800)",
  "var(--zen-color-background-support-green-solid, #2ea44f)",
  "var(--zen-color-background-support-orange-solid, #f5832a)",
] as const;

const defaultFormat = (value: number) => (Math.abs(value) >= 1000 ? `${Math.round(value / 100) / 10}K` : `${value}`);

/** Round the axis max up to a 5-step scale (Figma shows 6 labels: 0 … max). */
function niceScale(max: number, steps = 5) {
  if (max <= 0) return { top: steps, step: 1 };
  const raw = max / steps;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  return { top: step * steps, step };
}

interface PlotProps { format?: (value: number) => string; "aria-label": string; height?: number; className?: string }

function usePlotSelection(count: number, initial?: number) {
  const [active, setActive] = useState(initial ?? count - 1);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = event.key === "ArrowRight" ? active + 1 : event.key === "ArrowLeft" ? active - 1 : event.key === "Home" ? 0 : event.key === "End" ? count - 1 : null;
    if (next === null) return;
    event.preventDefault();
    setActive(Math.max(0, Math.min(count - 1, next)));
  };
  return { active: Math.min(active, count - 1), setActive, onKeyDown };
}

/** Shared frame: Y labels (Label/Small/Medium, Neutral/Light), dashed Border/Neutral/Pale grid (solid baseline), sector columns with X labels. */
function PlotFrame({ labels, ticks, top, format, active, setActive, onKeyDown, height, ariaLabel, tooltip, activeLine, children, className, summary }: {
  labels: string[]; ticks: number[]; top: number; format: (v: number) => string; active: number; setActive: (i: number) => void; onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  height: number; ariaLabel: string; tooltip: ReactNode; activeLine: "accent" | "neutral"; children: ReactNode; className?: string; summary: ReactNode;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <div className={["zen-chart", className].filter(Boolean).join(" ")} data-kind={activeLine === "accent" ? "line" : "bar"} style={{ "--zen-chart-height": `${height}px`, "--zen-chart-count": labels.length } as CSSProperties}>
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
        <div className="zen-chart__visual" aria-hidden="true">{children}</div>
        <div className="zen-chart__sectors">
          {labels.map((label, index) => (
            <button key={label + index} type="button" tabIndex={-1} className="zen-chart__sector" data-active={index === active ? activeLine : undefined} onPointerEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => setActive(index)} aria-hidden="true">
              <span className={`zen-chart__x ${typographyStyles["Label/Small/Medium"]}`}>{label}</span>
              {index === active ? <span className="zen-chart__tooltip"><TooltipSurface color="default" size="medium">{tooltip}</TooltipSurface></span> : null}
            </button>
          ))}
        </div>
        <VisuallyHidden as="p" id={`${id}-summary`} aria-live="polite">{summary}</VisuallyHidden>
      </div>
    </div>
  );
}

/**
 * Figma Chart/Line-Chart (6643:63324): an Accent/Solid 2px line over an area fading Accent/Solid → Accent/Subtle, on a
 * dashed Border/Neutral/Pale grid with 6 Y labels; each X value is a sector (Active/Accent/Subtle rule, Solid when active)
 * and the active sector shows a Tooltip with its value. ←/→, Home/End move between points.
 */
export function LineChart({ data, format = defaultFormat, height = 280, "aria-label": ariaLabel, className, initialIndex }: PlotProps & { data: ChartPoint[]; initialIndex?: number }) {
  const t = useZenLabels();
  const { top, step } = useMemo(() => niceScale(Math.max(0, ...data.map((d) => d.value))), [data]);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const { active, setActive, onKeyDown } = usePlotSelection(data.length, initialIndex);
  const gradientId = useId().replace(/:/g, "");
  const n = Math.max(1, data.length);
  const pts = data.map((d, i) => [((i + 0.5) / n) * 100, 100 - (d.value / top) * 100] as const);
  const path = pts.map(([x, y], i) => {
    if (i === 0) return `M ${x} ${y}`;
    const [px, py] = pts[i - 1];
    const cx = (px + x) / 2;
    return `C ${cx} ${py} ${cx} ${y} ${x} ${y}`;
  }).join(" ");
  const area = pts.length ? `${path} L ${pts[pts.length - 1][0]} 100 L ${pts[0][0]} 100 Z` : "";
  const current = data[active];
  return (
    <PlotFrame labels={data.map((d) => d.label)} ticks={ticks} top={top} format={format} active={active} setActive={setActive} onKeyDown={onKeyDown} height={height} ariaLabel={ariaLabel} activeLine="accent" className={className}
      tooltip={current ? format(current.value) : null}
      summary={current ? `${current.label}: ${format(current.value)} (${t.chartPoint(active + 1, data.length)})` : t.noData}>
      <svg className="zen-chart__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--zen-color-background-accent-solid-default, #ff66d4)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--zen-color-background-accent-subtle-default, #ff029817)" stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={path} className="zen-chart__line" vectorEffect="non-scaling-stroke" />
      </svg>
      {current ? <span className="zen-chart__dot" style={{ left: `${pts[active][0]}%`, top: `${pts[active][1]}%` }} /> : null}
    </PlotFrame>
  );
}

/**
 * Figma Chart/Stack-Bar-Chart (6643:73471): one column per sector (2px side padding, 4px radius on the top segment),
 * segments in series order from the bottom, a 12px-dot legend (Caption/Regular), and a Tooltip with the active total.
 */
export function StackBarChart({ data, series, format = defaultFormat, height = 236, "aria-label": ariaLabel, className, initialIndex, showLegend = true }: PlotProps & { data: ChartStack[]; series: ChartSeries[]; initialIndex?: number; showLegend?: boolean }) {
  const t = useZenLabels();
  const totals = data.map((d) => series.reduce((sum, s) => sum + (d.values[s.id] ?? 0), 0));
  const { top, step } = useMemo(() => niceScale(Math.max(0, ...totals)), [totals.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const { active, setActive, onKeyDown } = usePlotSelection(data.length, initialIndex);
  const colour = (index: number) => series[index].color ?? chartPalette[index % chartPalette.length];
  const current = data[active];
  return (
    <div className="zen-chart-stack">
      <PlotFrame labels={data.map((d) => d.label)} ticks={ticks} top={top} format={format} active={active} setActive={setActive} onKeyDown={onKeyDown} height={height} ariaLabel={ariaLabel} activeLine="neutral" className={className}
        tooltip={current ? format(totals[active]) : null}
        summary={current ? `${current.label}: ${t.chartTotal(format(totals[active]))}; ${series.map((s) => `${s.label} ${format(current.values[s.id] ?? 0)}`).join(", ")}` : t.noData}>
        <div className="zen-chart__bars">
          {data.map((d, i) => (
            <span key={d.label + i} className="zen-chart__column" data-active={i === active ? "true" : undefined}>
              <span className="zen-chart__stack" style={{ height: `${(totals[i] / top) * 100}%` }}>
                {series.map((s, si) => {
                  const v = d.values[s.id] ?? 0;
                  return v > 0 ? <span key={s.id} className="zen-chart__segment" style={{ flexGrow: v, background: colour(si) }} /> : null;
                })}
              </span>
            </span>
          ))}
        </div>
      </PlotFrame>
      {showLegend ? (
        <ul className="zen-chart__legend">
          {series.map((s, si) => <li key={s.id} className={typographyStyles["Caption/Regular"]}><span className="zen-chart__swatch" style={{ background: colour(si) }} aria-hidden="true" />{s.label}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

export interface ChartCardProps {
  /** Figma Header Label (Heading/Subheading). */
  title: ReactNode;
  /** Heading level of the title: one level below the nearest heading above (default 3: a card inside an h2 section; 2
   *  when the card sits directly under the page h1). The look stays Heading/Subheading — the level follows the outline,
   *  not the size. An EmptyState in `children` takes the next level in Body/Extra/Bold, below the card title. */
  headingLevel?: 2 | 3 | 4;
  /** Figma Header trailing Button/Icon-Main XSmall Tertiary (chevron): opens the full report. */
  onOpen?: () => void;
  /** Accessible name of the open button. Default: the locale's “Open report”. */
  openLabel?: string;
  /** Figma Segmented (Secondary) range switch. */
  ranges?: SegmentedOption[];
  range?: string;
  onRangeChange?: (id: string) => void;
  /** The range switch fills the card and splits it into equal items (Figma Segmented FILL, default); `false` hugs its
   *  items, as on a wide card where a full-width switch would stretch far past its labels (Figma HUG). */
  rangesFullWidth?: boolean;
  /** Figma nested Card Theme: Flat (default) inside a panel or section; Shadow when the chart card sits on the canvas
   *  next to other Shadow cards (metric cards on a dashboard). */
  theme?: CardTheme;
  surface?: CardSurface;
  /** The chart, or an EmptyState before there is data (keep the card title; the Empty State is set one level below it). */
  children: ReactNode;
  className?: string;
}

/** Figma Chart/Chart-Card (6643:63528): Card Flat Medium (padding 24, radius 24) → header · Segmented · chart, gap 16. */
export function ChartCard({ title, headingLevel = 3, onOpen, openLabel: openLabelProp, ranges, range, onRangeChange, rangesFullWidth = true, theme = "flat", surface, children, className }: ChartCardProps) {
  const t = useZenLabels();
  const openLabel = openLabelProp ?? t.openReport;
  const Title = `h${headingLevel}` as const;
  return (
    <Card theme={theme} spacing="medium" surface={surface} className={["zen-chart-card", className].filter(Boolean).join(" ")}>
      <div className="zen-chart-card__body">
        <div className="zen-chart-card__header">
          <Title className={`zen-chart-card__title ${typographyStyles["Heading/Subheading"]}`}>{title}</Title>
          {onOpen ? <IconButton appearance="main" level="tertiary" size="2xs" aria-label={openLabel} onClick={onOpen} icon={<Icon name="icon-chevron-right-line-small" />} /> : null}
        </div>
        {ranges?.length ? <Segmented options={ranges} value={range} onValueChange={onRangeChange} fullWidth={rangesFullWidth} aria-label={t.range} /> : null}
        <EmptyStateCardContext.Provider value={headingLevel}>{children}</EmptyStateCardContext.Provider>
      </div>
    </Card>
  );
}
