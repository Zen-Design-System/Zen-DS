import type { ReactNode } from "react";
import { Badge } from "../Badge";
import { Card, type CardSubAction, type CardTheme } from "../Card";
import { DockIcon, type DockIconBackground, type DockIconTheme } from "../DockIcon";
import { Icon, type IconName } from "../Icon";
import { scaleKey } from "../_shared/scale";
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
  className?: string;
}

/**
 * Figma Primitives/Metric/Metric-Inline/Icon-Highlight (595:55188): Dock-Icon + Contents (gap 2XSmall) of
 * Label (Neutral/Light) over the Metric-Number (Neutral/Strongest), then the trend.
 */
export function Metric({ label, value, trend, icon = "icon-home-02-solid", iconTheme = "neutral", iconBackground = "subtle", iconEmoji, size: sizeProp = "xl", className }: MetricProps) {
  const size = scaleKey(sizeProp, metricSizes);
  const stacked = size === "xlarge" || size === "large";
  return (
    <div className={["zen-metric", className].filter(Boolean).join(" ")} data-size={size} data-layout={stacked ? "stacked" : "inline"}>
      {iconEmoji ? <DockIcon theme="emoji" emoji={iconEmoji} background={iconBackground} size={stacked ? "large" : "medium"} />
        : icon ? <DockIcon icon={icon} theme={iconTheme} background={iconBackground} size={stacked ? "large" : "medium"} /> : null}
      <div className="zen-metric__contents">
        <div className="zen-metric__content">
          <span className={`zen-metric__label ${typographyStyles[labelStyle[size]]}`}>{label}</span>
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
