import type { ReactNode, Ref } from "react";
import { Badge } from "../Badge";
import { Card, type CardColor, type CardSubAction, type CardTheme } from "../Card";
import { DockIcon, type DockIconBackground, type DockIconTheme } from "../DockIcon";
import { Icon, type IconName } from "../Icon";
import { ProgressBar } from "../Progress";
import { Tooltip } from "../Tooltip";
import { renderIcon } from "../_shared/icon";
import { scaleKey } from "../_shared/scale";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./metric-widget.css";
import "../Icon/core";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { defaultFormat } from "../Chart/chartCore";
import { CategoryBar, SparkBars, Sparkline, useSeriesName, type MetricCategory } from "./MetricMarks";

export type { MetricCategory } from "./MetricMarks";

export const metricSizes = ["xsmall", "small", "medium", "large", "xlarge"] as const;
/** CSS / Figma key (the `data-size` value). */
type MetricSizeKey = (typeof metricSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type MetricSize = "xs" | "sm" | "md" | "lg" | "xl" | "xsmall" | "small" | "medium" | "large" | "xlarge";
export type MetricTrendDirection = "positive" | "negative" | "normal";

/** Figma .Primitives/Metrics/Metric-Trend (595:55134): a Small Subtle Badge — Positive green (arrow-circle-up), Negative red (arrow-circle-down), Normal neutral. */
export function MetricTrend({ trend = "normal", children, ref }: {
  trend?: MetricTrendDirection;
  children: ReactNode;
  /** Forwarded to the Badge's root `<span>`. */
  ref?: Ref<HTMLSpanElement>;
}) {
  const nest = useNested();
  const theme = trend === "positive" ? "green" : trend === "negative" ? "red" : "neutral";
  const icon: IconName | null = trend === "positive" ? "icon-arrow-circle-up-solid" : trend === "negative" ? "icon-arrow-circle-down-solid" : null;
  return nest("Badge", <Badge ref={ref} size="small" theme={theme} background="subtle" leading={icon ? <Icon name={icon} decorative /> : undefined} leadingIcon={Boolean(icon)}>{children}</Badge>);
}

/** Figma Metric-Inline label and number text styles per Size. */
const labelStyle: Record<MetricSizeKey, keyof typeof typographyStyles> = { xlarge: "Body/Base/Regular", large: "Body/Base/Regular", medium: "Body/Small/Regular", small: "Body/Small/Regular", xsmall: "Caption/Regular" };
const valueStyle: Record<MetricSizeKey, keyof typeof typographyStyles> = { xlarge: "Display/4", large: "Heading/1", medium: "Heading/3", small: "Heading/4", xsmall: "Heading/Subheading" };

export interface MetricProps {
  /** Figma Metric-Title. */
  label: ReactNode;
  /** Figma Metric-Number — pass it already formatted ("$1,680.68"). */
  value: ReactNode;
  /** Figma Trend: { direction, label } → Metric-Trend badge. */
  trend?: { direction: MetricTrendDirection; label: ReactNode };
  /** Figma Dock-Icon: Neutral Subtle (Large at XLarge/Large, Medium below). `false` hides it. */
  icon?: IconName | false;
  /** Dock-Icon Theme — colour-code the metric's category (Figma instance swap). Default Neutral. */
  iconTheme?: DockIconTheme;
  /** Dock-Icon Background: Subtle (default) or Solid for the one metric that should lead. */
  iconBackground?: DockIconBackground;
  /** Dock-Icon Theme=Emoji: an emoji instead of an icon (e.g. team mood). */
  iconEmoji?: ReactNode;
  /** Figma Size: XLarge/Large stack the icon above the text; Medium–XSmall put it on the left. Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: MetricSize;
  /**
   * Figma Metric-Inline type. Icon-Highlight (default, 595:55188): the Dock-Icon leads, the label sits over the number.
   * Title-Highlight (7523:507049): the title on top (Heading/Subheading at XLarge–Medium, Caption above the number at
   * Small/XSmall), the number and trend under it, the Dock-Icon pinned to the bottom-right corner.
   */
  variant?: "icon-highlight" | "title-highlight";
  /** Title-Highlight, XLarge–Medium: the title row's action (Figma Button/Icon-Main XSmall Tertiary, e.g. a chevron that opens the breakdown). */
  action?: ReactNode;
  /** Dock-Icon size (Figma instance swap): Medium 40 or Large 48. Default: Large at XLarge/Large, Medium below. */
  iconSize?: "md" | "lg" | "medium" | "large";
  /**
   * Title-Highlight: Figma Custom-Slot (Custom=Yes, added 2026-10-07): your own content under the contents — a sparkline,
   * a ProgressBar, a breakdown — Spacing/Gap/Medium below at XLarge/Large, Spacing/Gap/Small at Medium–XSmall. The
   * Dock-Icon stays at the contents' bottom-right corner.
   */
  custom?: ReactNode;
  /** Figma Metric-Color: a dot before the label (Element-Size/Popular/XSmall, Corner-Radius/Rounded) that ties the
   *  metric to a chart series. `true` is Color/Background/Accent/Solid; a string is the series colour
   *  (`var(--zen-color-background-support-blue-solid)`). */
  metricColor?: boolean | string;
  /** Icon-Highlight: Figma Counter — a Small Neutral Subtle Badge after the label, Spacing/Gap/2XSmall from it (a count
   *  of what the metric covers, e.g. "3" open invoices). */
  counter?: ReactNode;
  /** Title-Highlight, XLarge–Medium: Figma Label-Icon — a 24px icon (Element-Size/Popular/Medium) before the title. */
  labelIcon?: IconName | ReactNode;
  /** Title-Highlight, XLarge–Medium: Figma Hint — an info icon after the title (20px, Content/Neutral/Light) that shows
   *  this text in a Tooltip on hover and focus; say how the number is worked out. */
  hint?: ReactNode;
  className?: string;
  /** Forwarded to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
  /** Figma instance overrides: props of the icon, trend and counter it draws, by layer (`{ Icon: { theme: "accent" }, "Trend/Badge": { theme: "orange" } }`). Written by Zen Studio;
   *  app code sets icon / trend / counter. */
  overrides?: NestedOverrides;
}

/** Figma Metric-Color: the series dot before a label. */
function MetricColorDot({ color }: { color: boolean | string }) {
  return <span className="zen-metric__color" aria-hidden="true" style={typeof color === "string" ? { background: color } : undefined} />;
}

/**
 * Figma Primitives/Metric/Metric-Inline/Icon-Highlight (595:55188): Dock-Icon + Contents (gap 2XSmall) of
 * Label (Neutral/Light) over the Metric-Number (Neutral/Strongest), then the trend.
 */
export function Metric({ label, value, trend, icon = "icon-home-02-solid", iconTheme = "neutral", iconBackground = "subtle", iconEmoji, size: sizeProp = "xl", variant = "icon-highlight", action, iconSize, custom, metricColor = false, counter, labelIcon, hint, className, overrides, ref }: MetricProps) {
  const nest = useNested(overrides);
  const t = useZenLabels();
  const size = scaleKey(sizeProp, metricSizes);
  const dot = metricColor ? <MetricColorDot color={metricColor} /> : null;
  const stacked = size === "xlarge" || size === "large";
  if (variant === "title-highlight") {
    // Figma Title-Highlight: a title row at XLarge–Medium, the Caption label inside the content at Small/XSmall.
    const titled = size === "xlarge" || size === "large" || size === "medium";
    const dock = iconSize ? (iconSize === "lg" || iconSize === "large" ? "large" : "medium") : stacked ? "large" : "medium";
    const mark = nest("Icon", iconEmoji ? <DockIcon className="zen-metric__icon" theme="emoji" emoji={iconEmoji} background={iconBackground} size={dock} />
      : icon ? <DockIcon className="zen-metric__icon" icon={icon} theme={iconTheme} background={iconBackground} size={dock} /> : null);
    const body = (
      <>
        <div className="zen-metric__contents">
          {titled ? (
            <div className="zen-metric__header">
              {/* Figma Header › Label-Container: [Label-Icon] Label, then the Hint icon; the action stays at the end. */}
              <span className="zen-metric__title-row">
                {dot}
                {labelIcon ? <span className="zen-metric__label-icon">{nest("Label-Icon", renderIcon(labelIcon, { size: "md" }))}</span> : null}
                <span className={`zen-metric__title ${typographyStyles["Heading/Subheading"]}`}>{label}</span>
                {/* zen-allow-raw-icon-button: Figma Hint is a bare 20px info glyph (no button container), as InputLabel's tooltip icon; the Tooltip names and explains it. */}
                {hint ? <Tooltip content={hint} size="small"><button type="button" className="zen-metric__hint" aria-label={typeof hint === "string" ? hint : t.moreInformation}><Icon name="icon-info-circle-line" size="base" decorative /></button></Tooltip> : null}
              </span>
              {nest.slot(action)}
            </div>
          ) : null}
          <div className="zen-metric__content">
            {titled ? null : <span className="zen-metric__label-row">{dot}<span className={`zen-metric__label ${typographyStyles["Caption/Regular"]}`}>{label}</span></span>}
            <span className={`zen-metric__value ${typographyStyles[valueStyle[size]]}`}>{value}</span>
            {trend ? nest("Trend", <MetricTrend trend={trend.direction}>{trend.label}</MetricTrend>) : null}
          </div>
        </div>
        {mark}
      </>
    );
    return (
      <div ref={ref} className={["zen-metric", className].filter(Boolean).join(" ")} data-size={size} data-variant="title-highlight" data-icon={mark ? dock : undefined} data-custom={custom ? "true" : undefined}>
        {/* Figma: the Dock-Icon is absolute inside Contents, so with a Custom-Slot it stays above the slot. */}
        {custom ? <><div className="zen-metric__body">{body}</div><div className="zen-metric__custom">{custom}</div></> : body}
      </div>
    );
  }
  return (
    <div ref={ref} className={["zen-metric", className].filter(Boolean).join(" ")} data-size={size} data-layout={stacked ? "stacked" : "inline"}>
      {nest("Icon", iconEmoji ? <DockIcon theme="emoji" emoji={iconEmoji} background={iconBackground} size={stacked ? "large" : "medium"} />
        : icon ? <DockIcon icon={icon} theme={iconTheme} background={iconBackground} size={stacked ? "large" : "medium"} /> : null)}
      <div className="zen-metric__contents">
        <div className="zen-metric__content">
          {/* Figma Metric-Title: [Color] Label [Counter], Spacing/Gap/2XSmall apart. */}
          <span className="zen-metric__label-row">
            {dot}
            <span className={`zen-metric__label ${typographyStyles[labelStyle[size]]}`}>{label}</span>
            {counter !== undefined && counter !== null && counter !== false ? nest("Counter", <Badge className="zen-metric__counter" size="small" theme="neutral" background="subtle">{counter}</Badge>) : null}
          </span>
          <span className={`zen-metric__value ${typographyStyles[valueStyle[size]]}`}>{value}</span>
        </div>
        {trend ? nest("Trend", <MetricTrend trend={trend.direction}>{trend.label}</MetricTrend>) : null}
      </div>
    </div>
  );
}

/** Figma Metric-Card Type (6643:64008): what the card draws under its title and number. */
export const metricCardTypes = ["kpi", "sparkline", "spark-bars", "goal-progress", "comparison", "category-bar", "hero"] as const;
export type MetricCardType = (typeof metricCardTypes)[number];

/** Goal-Progress: how far the metric has come toward its goal (Figma Progress-Bar Theme=Accent, Layout=Stacked). */
export interface MetricGoal {
  /** The amount reached so far, a number in the goal's unit (108400). The bar fills value / target. */
  value: number;
  /** The goal in the same unit (135000). */
  target: number;
  /** The bar's label (Figma Progress-Bar Label, Body/Base/Bold): "of $135,000 goal". Default "of {format(target)} goal". */
  label?: ReactNode;
  /** The text at the end of the row (Figma Value, Body/Base/Regular). Default: the rounded share, past 100% too ("112%"). */
  valueLabel?: ReactNode;
}

/** Comparison: one column (Figma Metric-Inline/Title-Highlight Size=Small, no Dock-Icon). */
export interface MetricComparisonItem {
  /** Stable key (React key and the column's Studio layer). */
  id: string;
  /** Figma Label (Caption/Regular · Neutral/Light): "Invoiced". */
  label: ReactNode;
  /** Figma Metric-Number (Heading/4), pre-formatted: "$105,700". */
  value: ReactNode;
  /** Figma Trend: the column's Metric-Trend badge ("+9% vs. August"; normal for a plain note such as "1 invoice"). */
  trend?: { direction: MetricTrendDirection; label: ReactNode };
}

/** MetricProps (minus a required `value`) and the card's own props. */
export type MetricCardProps = Omit<MetricProps, "value"> & {
  /** Figma Metric-Number — pass it already formatted ("$1,680.68"). Every type shows it but `comparison`, whose columns
   *  carry the numbers. */
  value?: ReactNode;
  /** Card theme (Figma Metric-Card uses Shadow; Type=Hero a Brand Pale fill: theme="pale" color="brand" by default). */
  theme?: CardTheme;
  /** Card Color (Figma Card Color, for theme="pale" or "solid"): the Card's hue. Solid Neutral is the dark widget; see Card. */
  color?: CardColor;
  /** Card Sub-Action (Figma: ⋮ Button/Icon-Flat). */
  subAction?: CardSubAction | ReactNode;
  /** Forwarded to the Card's root `<div>` (not to the Metric inside it). */
  ref?: Ref<HTMLDivElement>;
  /**
   * Figma Metric-Card Type (6643:64008). `kpi` (default, 6643:64007): an Icon-Highlight Metric, as before. Every other
   * type draws a Title-Highlight Metric (no Dock-Icon unless `icon` is set) over its own content, Spacing/Gap/Medium apart
   * (Figma Metric-Body): `sparkline` (15480:89548, Large) a trend line from `series`; `spark-bars` (15480:89594, Large)
   * bars from `series`, the last one current; `goal-progress` (15481:1803, Large) a stacked ProgressBar from `goal`;
   * `comparison` (15481:1848) the `label` as a Heading/Subheading title over the `comparison` columns; `category-bar`
   * (15481:1957, Large) a bar of shares from `categories` and a row per category; `hero` (15481:2047, XLarge) a neutral
   * trend line from `series` on a Brand Pale card (theme="solid" for the dark widget), with `footer` for its button.
   */
  type?: MetricCardType;
  /** sparkline · spark-bars · hero: the values in order, oldest first; the last is the current period (the Secondary bar).
   *  The line spans the lowest to the highest value. The card's `value` and `trend` say the numbers; the marks get an
   *  accessible summary. */
  series?: readonly number[];
  /** sparkline · spark-bars · hero: the marks' accessible name, instead of "Trend over 12 periods: from … to …, low …, high …". */
  seriesLabel?: string;
  /** goal-progress: the amount reached and the goal. */
  goal?: MetricGoal;
  /** comparison: two to four columns side by side (Spacing/Gap/Medium, a Border/Neutral/Subtle rule before each but the
   *  first); they stack on a narrow card. */
  comparison?: readonly MetricComparisonItem[];
  /** category-bar: the parts of the card's `value`, largest first (two to seven: the chart palette has seven colours). */
  categories?: readonly MetricCategory[];
  /** How a number of `series`, `goal` and `categories` reads (the summary, the goal's label, each category's amount).
   *  Default "1.2K". */
  format?: (value: number) => string;
  /** Content under the type's own (Figma Hero: a Small Button — level="primary" on a hue card, appearance="overlay"
   *  level="inverse" on Solid Neutral, as Figma's Button/Overlay Inverse). */
  footer?: ReactNode;
  /** Draw the marks in on mount and when their data changes (default true; reduced motion fades). */
  animate?: boolean;
};

/** The Metric size each Figma Metric-Card type draws. */
const typeSize: Record<Exclude<MetricCardType, "kpi" | "comparison">, MetricSize> = { sparkline: "lg", "spark-bars": "lg", "goal-progress": "lg", "category-bar": "lg", hero: "xl" };

/**
 * Figma Metric-Card (6643:64008): a Card (Shadow, Spacing Medium) holding a Metric and a ⋮ Sub-Action. Type=KPI is an
 * XLarge Icon-Highlight Metric; the other types (see `type`) put their marks, bar or columns under a Title-Highlight one.
 */
export function MetricCard({ theme: themeProp, color: colorProp, subAction, className, overrides, type = "kpi", series, seriesLabel, goal, comparison, categories, format = defaultFormat, footer, animate = true, ref, ...metric }: MetricCardProps) {
  const t = useZenLabels();
  // Figma Type=Hero: a Card whose fill is Support/Brand/Pale (its Solid Brand card, fill overridden) and a trend badge
  // Theme=On-Color, Background=Solid (a white pill) on that fill; Solid Neutral (15487:89034) is the dark Hero. Written
  // overrides still win.
  const hero = type === "hero";
  const nest = useNested(hero ? { "Metric/Trend/Badge": { theme: "on-color", background: "solid" }, ...overrides } : overrides);
  const theme = themeProp ?? (hero ? "pale" : "shadow");
  const color = colorProp ?? (hero && theme === "pale" ? "brand" : undefined);
  const values = (series ?? []).filter((value) => Number.isFinite(value));
  const seriesName = useSeriesName(values, format, seriesLabel);
  const card = (content: ReactNode) => (
    // zen-allow-overrides: MetricCard passes its own overrides on, so the Card's Sub-Action and the Metric's layers
    // (`Metric/Icon`) read the same table.
    <Card ref={ref} theme={theme} color={color} subAction={subAction} className={["zen-metric-card", className].filter(Boolean).join(" ")} data-type={type === "kpi" ? undefined : type} overrides={overrides}>
      {content}
    </Card>
  );
  const foot = footer ? <div className="zen-metric-card__footer">{nest.slot(footer)}</div> : null;
  if (type === "kpi") return card(foot ? <div className="zen-metric-card__body">{nest("Metric", <Metric {...metric} value={metric.value} />)}{foot}</div> : nest("Metric", <Metric {...metric} value={metric.value} />));
  if (type === "comparison") {
    return card(
      <div className="zen-metric-card__body">
        <span className={`zen-metric-card__title ${typographyStyles["Heading/Subheading"]}`}>{metric.label}</span>
        <div className="zen-metric-card__columns">
          {(comparison ?? []).map((item) => (
            <div key={item.id} className="zen-metric-card__column">
              {nest.at("Column", item.id)("Metric", <Metric variant="title-highlight" size="sm" icon={false} label={item.label} value={item.value} trend={item.trend} />)}
            </div>
          ))}
        </div>
        {foot}
      </div>,
    );
  }
  const percent = goal && goal.target > 0 ? (goal.value / goal.target) * 100 : 0;
  const body = type === "sparkline" || hero ? <Sparkline values={values} tone={hero ? "neutral" : "accent"} name={seriesName} animate={animate} />
    : type === "spark-bars" ? <SparkBars values={values} name={seriesName} animate={animate} />
    : type === "category-bar" ? <CategoryBar categories={categories} format={format} animate={animate} />
    : goal ? nest("Progress-Bar", <ProgressBar layout="stacked" theme="accent" value={percent} label={goal.label ?? t.metricGoalOf(format(goal.target))} valueLabel={goal.valueLabel ?? `${Math.round(percent)}%`} />)
    : null;
  return card(
    <div className="zen-metric-card__body">
      {nest("Metric", <Metric icon={false} size={typeSize[type]} {...metric} value={metric.value} variant="title-highlight" />)}
      {body}
      {foot}
    </div>,
  );
}
