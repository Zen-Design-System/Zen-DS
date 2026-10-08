import type { ReactNode } from "react";
import { Badge } from "../Badge";
import { Card, type CardSubAction, type CardTheme } from "../Card";
import { DockIcon, type DockIconBackground, type DockIconTheme } from "../DockIcon";
import { Icon, type IconName } from "../Icon";
import { Tooltip } from "../Tooltip";
import { renderIcon } from "../_shared/icon";
import { scaleKey } from "../_shared/scale";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./metric-widget.css";
import "../Icon/core";

export const metricSizes = ["xsmall", "small", "medium", "large", "xlarge"] as const;
/** CSS / Figma key (the `data-size` value). */
type MetricSizeKey = (typeof metricSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type MetricSize = "xs" | "sm" | "md" | "lg" | "xl" | "xsmall" | "small" | "medium" | "large" | "xlarge";
export type MetricTrendDirection = "positive" | "negative" | "normal";

/** Figma .Primitives/Metrics/Metric-Trend (595:55134): a Small Subtle Badge — Positive green (arrow-circle-up), Negative red (arrow-circle-down), Normal neutral. */
export function MetricTrend({ trend = "normal", children }: { trend?: MetricTrendDirection; children: ReactNode }) {
  const theme = trend === "positive" ? "green" : trend === "negative" ? "red" : "neutral";
  const icon: IconName | null = trend === "positive" ? "icon-arrow-circle-up-solid" : trend === "negative" ? "icon-arrow-circle-down-solid" : null;
  return <Badge size="small" theme={theme} background="subtle" leading={icon ? <Icon name={icon} decorative /> : undefined} leadingIcon={Boolean(icon)}>{children}</Badge>;
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
  /** Dock-Icon size (Figma instance swap): Medium 40 or Large 56. Default: Large at XLarge/Large, Medium below. */
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
}

/** Figma Metric-Color: the series dot before a label. */
function MetricColorDot({ color }: { color: boolean | string }) {
  return <span className="zen-metric__color" aria-hidden="true" style={typeof color === "string" ? { background: color } : undefined} />;
}

/**
 * Figma Primitives/Metric/Metric-Inline/Icon-Highlight (595:55188): Dock-Icon + Contents (gap 2XSmall) of
 * Label (Neutral/Light) over the Metric-Number (Neutral/Strongest), then the trend.
 */
export function Metric({ label, value, trend, icon = "icon-home-02-solid", iconTheme = "neutral", iconBackground = "subtle", iconEmoji, size: sizeProp = "xl", variant = "icon-highlight", action, iconSize, custom, metricColor = false, counter, labelIcon, hint, className }: MetricProps) {
  const t = useZenLabels();
  const size = scaleKey(sizeProp, metricSizes);
  const dot = metricColor ? <MetricColorDot color={metricColor} /> : null;
  const stacked = size === "xlarge" || size === "large";
  if (variant === "title-highlight") {
    // Figma Title-Highlight: a title row at XLarge–Medium, the Caption label inside the content at Small/XSmall.
    const titled = size === "xlarge" || size === "large" || size === "medium";
    const dock = iconSize ? (iconSize === "lg" || iconSize === "large" ? "large" : "medium") : stacked ? "large" : "medium";
    const mark = iconEmoji ? <DockIcon className="zen-metric__icon" theme="emoji" emoji={iconEmoji} background={iconBackground} size={dock} />
      : icon ? <DockIcon className="zen-metric__icon" icon={icon} theme={iconTheme} background={iconBackground} size={dock} /> : null;
    const body = (
      <>
        <div className="zen-metric__contents">
          {titled ? (
            <div className="zen-metric__header">
              {/* Figma Header › Label-Container: [Label-Icon] Label, then the Hint icon; the action stays at the end. */}
              <span className="zen-metric__title-row">
                {dot}
                {labelIcon ? <span className="zen-metric__label-icon">{renderIcon(labelIcon, { size: "md" })}</span> : null}
                <span className={`zen-metric__title ${typographyStyles["Heading/Subheading"]}`}>{label}</span>
                {/* zen-allow-raw-icon-button: Figma Hint is a bare 20px info glyph (no button container), as InputLabel's tooltip icon; the Tooltip names and explains it. */}
                {hint ? <Tooltip content={hint} size="small"><button type="button" className="zen-metric__hint" aria-label={typeof hint === "string" ? hint : t.moreInformation}><Icon name="icon-info-circle-line" size="base" decorative /></button></Tooltip> : null}
              </span>
              {action}
            </div>
          ) : null}
          <div className="zen-metric__content">
            {titled ? null : <span className="zen-metric__label-row">{dot}<span className={`zen-metric__label ${typographyStyles["Caption/Regular"]}`}>{label}</span></span>}
            <span className={`zen-metric__value ${typographyStyles[valueStyle[size]]}`}>{value}</span>
            {trend ? <MetricTrend trend={trend.direction}>{trend.label}</MetricTrend> : null}
          </div>
        </div>
        {mark}
      </>
    );
    return (
      <div className={["zen-metric", className].filter(Boolean).join(" ")} data-size={size} data-variant="title-highlight" data-icon={mark ? dock : undefined} data-custom={custom ? "true" : undefined}>
        {/* Figma: the Dock-Icon is absolute inside Contents, so with a Custom-Slot it stays above the slot. */}
        {custom ? <><div className="zen-metric__body">{body}</div><div className="zen-metric__custom">{custom}</div></> : body}
      </div>
    );
  }
  return (
    <div className={["zen-metric", className].filter(Boolean).join(" ")} data-size={size} data-layout={stacked ? "stacked" : "inline"}>
      {iconEmoji ? <DockIcon theme="emoji" emoji={iconEmoji} background={iconBackground} size={stacked ? "large" : "medium"} />
        : icon ? <DockIcon icon={icon} theme={iconTheme} background={iconBackground} size={stacked ? "large" : "medium"} /> : null}
      <div className="zen-metric__contents">
        <div className="zen-metric__content">
          {/* Figma Metric-Title: [Color] Label [Counter], Spacing/Gap/2XSmall apart. */}
          <span className="zen-metric__label-row">
            {dot}
            <span className={`zen-metric__label ${typographyStyles[labelStyle[size]]}`}>{label}</span>
            {counter !== undefined && counter !== null && counter !== false ? <Badge className="zen-metric__counter" size="small" theme="neutral" background="subtle">{counter}</Badge> : null}
          </span>
          <span className={`zen-metric__value ${typographyStyles[valueStyle[size]]}`}>{value}</span>
        </div>
        {trend ? <MetricTrend trend={trend.direction}>{trend.label}</MetricTrend> : null}
      </div>
    </div>
  );
}

export interface MetricCardProps extends MetricProps {
  /** Card theme (Figma Metric-Card uses Shadow). */
  theme?: CardTheme;
  /** Card Sub-Action (Figma: ⋮ Button/Icon-Flat). */
  subAction?: CardSubAction | ReactNode;
}

/** Figma Metric-Card (6643:64008): a Card (Shadow, Spacing Medium) holding an XLarge Metric and a ⋮ Sub-Action. */
export function MetricCard({ theme = "shadow", subAction, className, ...metric }: MetricCardProps) {
  return (
    <Card theme={theme} subAction={subAction} className={["zen-metric-card", className].filter(Boolean).join(" ")}>
      <Metric {...metric} />
    </Card>
  );
}
