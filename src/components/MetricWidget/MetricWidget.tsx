import type { ReactNode, Ref } from "react";
import { Badge } from "../Badge";
import { Card, type CardColor, type CardSpacing, type CardSubAction, type CardTheme } from "../Card";
import { useCardContent } from "../Card/card-content";
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
import { dataAttributes } from "../_shared/data-attributes";

export type { MetricCategory } from "./MetricMarks";

export const metricSizes = ["xsmall", "small", "medium", "large", "xlarge"] as const;
/** CSS / Figma key (the `data-size` value). */
type MetricSizeKey = (typeof metricSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type MetricSize = "xs" | "sm" | "md" | "lg" | "xl" | "xsmall" | "small" | "medium" | "large" | "xlarge";
export type MetricTrendDirection = "positive" | "negative" | "normal";
/** Figma Metric-Trend Content: the badge's family on the fill under it. */
export type MetricTrendContent = "default" | "inverse" | "on-color";

/**
 * Figma .Primitives/Metrics/Metric-Trend (595:55134): a Small Badge. Content=Default is Subtle — Positive green
 * (arrow-circle-up), Negative red (arrow-circle-down), Normal neutral. On a Solid fill the badge takes the fill's family
 * whatever the direction (the arrow tells it): Inverse Solid on Neutral/Solid, On-Color Solid (a white pill) on Accent and
 * colour solids. Inside a Solid Card it follows the card unless `content` is set.
 */
export function MetricTrend({ trend = "normal", content: contentProp, children, ref }: {
  trend?: MetricTrendDirection;
  /** Figma Content (Default · Inverse · On-Color). Default: the enclosing Solid Card's family (Inverse on Neutral, On-Color
   *  on Accent and the hues), else Default. */
  content?: MetricTrendContent;
  children: ReactNode;
  /** Forwarded to the Badge's root `<span>`. */
  ref?: Ref<HTMLSpanElement>;
}) {
  const nest = useNested();
  const on = useCardContent();
  const content = contentProp ?? (on === "inverse" ? "inverse" : on ? "on-color" : "default");
  const theme = content !== "default" ? content : trend === "positive" ? "green" : trend === "negative" ? "red" : "neutral";
  const icon: IconName | null = trend === "positive" ? "icon-arrow-circle-up-solid" : trend === "negative" ? "icon-arrow-circle-down-solid" : null;
  return nest("Badge", <Badge ref={ref} size="small" theme={theme} background={content === "default" ? "subtle" : "solid"} leading={icon ? <Icon name={icon} decorative /> : undefined} leadingIcon={Boolean(icon)}>{children}</Badge>);
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
  /** Figma Dock-Icon: Neutral Subtle (Large at XLarge/Large, Medium below). `false` hides it. MetricCard type="tile":
   *  Neutral Solid, `icon-activity-line` by default. */
  icon?: IconName | false;
  /** Dock-Icon Theme — colour-code the metric's category (Figma instance swap). Default Neutral; a tile on a Solid card
   *  takes the fill's family (Inverse on Neutral, On-Color on Accent and the hues). */
  iconTheme?: DockIconTheme;
  /** Dock-Icon Background: Subtle (default) or Solid for the one metric that should lead. */
  iconBackground?: DockIconBackground;
  /** Dock-Icon Theme=Emoji: an emoji instead of an icon (e.g. team mood). */
  iconEmoji?: ReactNode;
  /** Figma Size: XLarge/Large stack the icon above the text; Medium–XSmall put it on the left. Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: MetricSize;
  /**
   * Figma Metric-Inline type. Icon-Highlight (default, 595:55188): the Dock-Icon leads, the label sits over the number.
   * Title-Highlight (7523:507049): the title on top (Body/Extra/Medium at XLarge–Medium, Caption above the number at
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
  /** Figma Metric-Color: a dot before the label (Corner-Radius/Rounded; Element-Size/Popular/XSmall on Icon-Highlight
   *  XLarge/Large, …/2XSmall below) that ties the metric to a chart series. `true` is Color/Background/Accent/Solid; a
   *  string is the series colour (`var(--zen-color-background-support-blue-solid)`). Title-Highlight draws it at
   *  Small/XSmall only (Figma's XLarge–Medium title row has no dot). */
  metricColor?: boolean | string;
  /** Icon-Highlight: Figma Counter — a Small Neutral Subtle Badge after the label, Spacing/Gap/2XSmall from it (a count
   *  of what the metric covers, e.g. "3" open invoices). */
  counter?: ReactNode;
  /** Title-Highlight, XLarge–Medium: Figma Label-Icon — a 24px icon (Element-Size/Popular/Medium) before the title,
   *  Spacing/Gap/XSmall from it. */
  labelIcon?: IconName | ReactNode;
  /** Title-Highlight: Figma Hint — an info icon (Content/Neutral/Light) after the title, 20px at XLarge–Medium and 12px
   *  after the Caption label at Small/XSmall, that shows this text in a Tooltip on hover and focus; say how the number
   *  is worked out. */
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
export function Metric({ label, value, trend, icon = "icon-home-02-solid", iconTheme = "neutral", iconBackground = "subtle", iconEmoji, size: sizeProp = "xl", variant = "icon-highlight", action, iconSize, custom, metricColor = false, counter, labelIcon, hint, className, overrides, ref, ...rest }: MetricProps) {
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
    // Figma Hint: 20px (Element-Size/Popular/Base) after the title at XLarge–Medium, 12px (…/XSmall) after the Caption label below.
    const hintMark = hint ? (
      <Tooltip content={hint} size="small">
        {/* zen-allow-raw-icon-button: Figma Hint is a bare info glyph (no button container), as InputLabel's tooltip icon; the Tooltip names and explains it. */}
        <button type="button" className="zen-metric__hint" aria-label={typeof hint === "string" ? hint : t.moreInformation}><Icon name="icon-info-circle-line" size={titled ? "base" : "xs"} decorative /></button>
      </Tooltip>
    ) : null;
    const body = (
      <>
        <div className="zen-metric__contents">
          {titled ? (
            <div className="zen-metric__header">
              {/* Figma Header › Label-Container: Wrapper ([Label-Icon] Label), then the Hint icon; the action stays at the end.
                  No Metric-Color here: Figma draws its dot only in the Caption row of Small/XSmall. */}
              <span className="zen-metric__title-row">
                <span className="zen-metric__title-label">
                  {labelIcon ? <span className="zen-metric__label-icon">{nest("Label-Icon", renderIcon(labelIcon, { size: "md" }))}</span> : null}
                  <span className={`zen-metric__title ${typographyStyles["Body/Extra/Medium"]}`}>{label}</span>
                </span>
                {hintMark}
              </span>
              {nest.slot(action)}
            </div>
          ) : null}
          <div className="zen-metric__content">
            {/* Figma Metric-Title: [Color] Label [Hint], Spacing/Gap/2XSmall apart. */}
            {titled ? null : <span className="zen-metric__label-row">{dot}<span className={`zen-metric__label ${typographyStyles["Caption/Regular"]}`}>{label}</span>{hintMark}</span>}
            <span className={`zen-metric__value ${typographyStyles[valueStyle[size]]}`}>{value}</span>
            {trend ? nest("Trend", <MetricTrend trend={trend.direction}>{trend.label}</MetricTrend>) : null}
          </div>
        </div>
        {mark}
      </>
    );
    return (
      <div {...dataAttributes(rest)} ref={ref} className={["zen-metric", className].filter(Boolean).join(" ")} data-size={size} data-variant="title-highlight" data-icon={mark ? dock : undefined} data-custom={custom ? "true" : undefined}>
        {/* Figma: the Dock-Icon is absolute inside Contents, so with a Custom-Slot it stays above the slot. */}
        {custom ? <><div className="zen-metric__body">{body}</div><div className="zen-metric__custom">{custom}</div></> : body}
      </div>
    );
  }
  return (
    <div {...dataAttributes(rest)} ref={ref} className={["zen-metric", className].filter(Boolean).join(" ")} data-size={size} data-layout={stacked ? "stacked" : "inline"}>
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
export const metricCardTypes = ["kpi", "sparkline", "spark-bars", "goal-progress", "comparison", "category-bar", "hero", "tile"] as const;
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
  /** Figma Metric-Number (Heading/1 since 2026-10-16, the user: the comparison's figures read as the card's numbers),
   *  pre-formatted: "$105,700". */
  value: ReactNode;
  /** Figma Trend: the column's Metric-Trend badge ("+9% vs. August"; normal for a plain note such as "1 invoice"). */
  trend?: { direction: MetricTrendDirection; label: ReactNode };
}

/** MetricProps (minus a required `value`) and the card's own props. */
export type MetricCardProps = Omit<MetricProps, "value" | "variant"> & {
  /** A KPI card's Figma Metric-Inline type (`type="kpi"`): `title-highlight` (default since 2026-10-16, the user: a KPI
   *  card is laid out like the typed widgets, its title on top, the number and trend at its foot, the Dock-Icon in the
   *  bottom-right corner) or `icon-highlight` (the Dock-Icon leads, the label over the number). A KPI card's `size`
   *  defaults to Large in Title-Highlight and XLarge in Icon-Highlight. The typed cards are always Title-Highlight. */
  variant?: "icon-highlight" | "title-highlight";
  /** Figma Metric-Number — pass it already formatted ("$1,680.68"). Every type shows it but `comparison`, whose columns
   *  carry the numbers. */
  value?: ReactNode;
  /** Card theme (Figma Metric-Card uses Shadow; Type=Hero a Brand Pale fill: theme="pale" color="brand" by default). */
  theme?: CardTheme;
  /** Card Color (Figma Card Color, for theme="pale", "subtle" or "solid"): the Card's hue. Solid Neutral is the dark widget; see Card. */
  color?: CardColor;
  /** Card Sub-Action (Figma: ⋮ Button/Icon-Flat). */
  subAction?: CardSubAction | ReactNode;
  /** Figma Metric-Card's Card Spacing (it is an exposed Card): Medium (default; Card-padding-medium, Corner-Radius/2XLarge)
   *  or Small (Card-padding-small, Corner-Radius/Large). `type="tile"` defaults to Small. On a phone, three or more
   *  cards side by side take Small (harness card/spacing-by-count; desktop cards keep Medium). Short (sm, md) or Figma
   *  (small, medium) spelling. */
  spacing?: CardSpacing;
  /** Forwarded to the Card's root `<div>` (not to the Metric inside it). */
  ref?: Ref<HTMLDivElement>;
  /**
   * Figma Metric-Card Type (6643:64008). `kpi` (default, 6643:64007): a Title-Highlight Metric, Large (`variant` picks
   * Icon-Highlight). Every other
   * type draws a Title-Highlight Metric (no Dock-Icon unless `icon` is set) over its own content, Spacing/Gap/Medium apart
   * (Figma Metric-Body): `sparkline` (15480:89548, Large) a trend line from `series`; `spark-bars` (15480:89594, Large)
   * bars from `series`, the last one current; `goal-progress` (15481:1803, Large) a stacked ProgressBar from `goal`;
   * `comparison` (15481:1848) the `label` as a Body/Extra/Medium title over the `comparison` columns; `category-bar`
   * (15481:1957, Large) a bar of shares from `categories` and a row per category; `hero` (15481:2047, XLarge) a neutral
   * trend line from `series` on a Brand Pale card (theme="solid" for the dark widget), with `footer` for its button;
   * `tile` (16104:4827) a phone stat tile, Figma Metric-Tile in a Card Spacing=Small: the title, number and trend over
   * the Dock-Icon. Its `size` is Medium (default: two-up, Display/4) or Small (three-up, Heading/3), and its content follows
   * the card's fill (Figma Content: Inverse on Solid Neutral, On-Accent, On-Color on Brand/Cyan/Orange, On-Bright on
   * Yellow).
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
  /** comparison: heading level of the title (default 3: a card inside an h2 section; 2 when the card sits directly under
   *  the page h1), as ChartCard's. The look stays Body/Extra/Medium: the level follows the outline, not the size. */
  headingLevel?: 2 | 3 | 4;
  /** Draw the marks in on mount and when their data changes (default true; reduced motion fades). */
  animate?: boolean;
};

/** The Metric size each Figma Metric-Card type draws. */
const typeSize: Record<Exclude<MetricCardType, "kpi" | "comparison" | "tile">, MetricSize> = { sparkline: "lg", "spark-bars": "lg", "goal-progress": "lg", "category-bar": "lg", hero: "xl" };

/** Figma Metric-Tile Size: Medium (two-up) or Small (three-up); the Metric spellings below Medium draw Small. */
const tileSmall = (size: MetricSize | undefined) => size === "sm" || size === "small" || size === "xs" || size === "xsmall";

/**
 * Figma Primitives/Metric/Metric-Tile (16104:4826): Value (Metric-Title Neutral/Base, Metric-Number Neutral/Strongest,
 * the trend; Spacing/Gap/2XSmall) over the Dock-Icon, Spacing/Gap/Small apart. Medium: Body/Small/Medium, Display/4,
 * Dock-Icon Medium; Small: Caption/Medium, Heading/3, Dock-Icon Small. Its Content follows the card it sits in: the text
 * reads the card's re-pointed tokens, the trend its Content, and the Dock-Icon Inverse on Solid Neutral, On-Color on Accent
 * and the hues (Neutral Solid elsewhere). The Dock-Icon is Background=Solid unless `iconBackground` says otherwise
 * (◇ Master-Layout · Example F1, F2, F6: Subtle tiles).
 */
function MetricTile({ label, value, trend, icon = "icon-activity-line", iconTheme, iconBackground = "solid", iconEmoji, size }: Pick<MetricProps, "label" | "value" | "trend" | "icon" | "iconTheme" | "iconBackground" | "iconEmoji" | "size">) {
  const nest = useNested();
  const on = useCardContent();
  const small = tileSmall(size);
  const theme = iconTheme ?? (on === "inverse" ? "inverse" : on ? "on-color" : "neutral");
  const dock = small ? "small" : "medium";
  const mark = iconEmoji ? <DockIcon theme="emoji" emoji={iconEmoji} background={iconBackground} size={dock} /> : icon ? <DockIcon icon={icon} theme={theme} background={iconBackground} size={dock} /> : null;
  return (
    <div className="zen-metric-tile" data-size={small ? "small" : "medium"}>
      <div className="zen-metric-tile__value">
        <span className={`zen-metric-tile__label ${typographyStyles[small ? "Caption/Medium" : "Body/Small/Medium"]}`}>{label}</span>
        <span className={`zen-metric-tile__number ${typographyStyles[small ? "Heading/3" : "Display/4"]}`}>{value}</span>
        {trend ? nest("Trend", <MetricTrend trend={trend.direction}>{trend.label}</MetricTrend>) : null}
      </div>
      {mark ? nest("Metric-Icon", mark) : null}
    </div>
  );
}

/**
 * Figma Metric-Card (6643:64008): a Card (Shadow, Spacing Medium) holding a Metric and a ⋮ Sub-Action. Type=KPI is an
 * XLarge Icon-Highlight Metric; the other types (see `type`) put their marks, bar or columns under a Title-Highlight one.
 */
export function MetricCard({ theme: themeProp, color: colorProp, subAction, spacing, className, overrides, type = "kpi", variant = "title-highlight", series, seriesLabel, goal, comparison, categories, format = defaultFormat, footer, headingLevel = 3, animate = true, ref, ...metric }: MetricCardProps) {
  const t = useZenLabels();
  // Figma Type=Hero: a Card whose fill is Support/Brand/Pale (its Solid Brand card, fill overridden) and a Metric-Trend
  // Content=On-Color (a white pill) on that fill; on a Solid card the trend follows the card (Solid Neutral, 15487:89034,
  // is Inverse). Written overrides still win.
  const hero = type === "hero";
  const theme = themeProp ?? (hero ? "pale" : "shadow");
  const nest = useNested(hero && theme !== "solid" ? { "Metric/Trend": { content: "on-color" }, ...overrides } : overrides);
  const color = colorProp ?? (hero && theme === "pale" ? "brand" : undefined);
  const values = (series ?? []).filter((value) => Number.isFinite(value));
  const seriesName = useSeriesName(values, format, seriesLabel);
  const card = (content: ReactNode) => (
    // zen-allow-overrides: MetricCard passes its own overrides on, so the Card's Sub-Action and the Metric's layers
    // (`Metric/Icon`) read the same table.
    <Card ref={ref} theme={theme} color={color} subAction={subAction} spacing={spacing ?? (type === "tile" ? "sm" : undefined)} className={["zen-metric-card", className].filter(Boolean).join(" ")} data-type={type === "kpi" ? undefined : type} overrides={overrides}>
      {content}
    </Card>
  );
  const foot = footer ? <div className="zen-metric-card__footer">{nest.slot(footer)}</div> : null;
  if (type === "kpi") {
    const kpi = { ...metric, variant, size: metric.size ?? (variant === "title-highlight" ? "lg" : "xl") } as const;
    return card(foot ? <div className="zen-metric-card__body">{nest("Metric", <Metric {...kpi} value={metric.value} />)}{foot}</div> : nest("Metric", <Metric {...kpi} value={metric.value} />));
  }
  if (type === "tile") {
    // Figma Metric-Card Type=Tile: the Card (Spacing=Small) around a Metric-Tile, whose content follows the card's fill.
    return card(nest("Metric-Tile", <MetricTile label={metric.label} value={metric.value} trend={metric.trend} icon={metric.icon} iconTheme={metric.iconTheme} iconBackground={metric.iconBackground} iconEmoji={metric.iconEmoji} size={metric.size} />));
  }
  if (type === "comparison") {
    // The title heads the columns under it, as a ChartCard's title: a heading (the outline), Body/Extra/Medium (the look,
    // Figma Metric-Card 2026-10-21).
    const Title = `h${headingLevel}` as const;
    return card(
      <div className="zen-metric-card__body">
        <Title className={`zen-metric-card__title ${typographyStyles["Body/Extra/Medium"]}`}>{metric.label}</Title>
        <div className="zen-metric-card__columns">
          {(comparison ?? []).map((item) => (
            <div key={item.id} className="zen-metric-card__column">
              {nest.at("Column", item.id)("Metric", <Metric variant="title-highlight" size="sm" icon={false} label={item.label} value={<span className={`zen-metric-card__column-value ${typographyStyles["Heading/1"]}`}>{item.value}</span>} trend={item.trend} />)}
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
      {/* Figma Metric-Card Type=Hero draws its number in Display/1 (2026-10-21); a size set on the card keeps its own step. */}
      {nest("Metric", <Metric icon={false} size={typeSize[type]} {...metric} variant="title-highlight"
        value={hero && metric.size === undefined ? <span className={`zen-metric-card__hero-value ${typographyStyles["Display/1"]}`}>{metric.value}</span> : metric.value} />)}
      {body}
      {foot}
    </div>,
  );
}
