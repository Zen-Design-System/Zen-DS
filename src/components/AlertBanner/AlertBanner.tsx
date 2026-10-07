import type { ReactNode } from "react";
import { Button } from "../Button";
import { Icon, type IconName } from "../Icon";
import { useIconTooltip } from "../Tooltip";
import { renderIcon } from "../_shared/icon";
import { scaleKey } from "../_shared/scale";
import { toneFromStatus, type StatusAlias } from "../_shared/status";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./alert-banner.css";
import "../Icon/core";

export const alertBannerThemes = ["default", "info", "positive", "warning", "negative"] as const;
export const alertBannerSizes = ["medium", "small"] as const;
export type AlertBannerTheme = (typeof alertBannerThemes)[number];
/** CSS / Figma key (the `data-size` value). */
type AlertBannerSizeKey = (typeof alertBannerSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type AlertBannerSize = "md" | "sm" | "medium" | "small";

/** Figma Alert-Banner Leading icon per Theme. */
const themeIcon: Record<AlertBannerTheme, IconName> = {
  default: "icon-info-circle-line",
  info: "icon-info-circle-solid",
  positive: "icon-check-solid",
  warning: "icon-alert-triangle-solid",
  negative: "icon-x-circle-solid",
};

export interface AlertBannerProps {
  /** The alert message (Body/Base/Medium; Small: Body/Small/Medium). */
  children: ReactNode;
  theme?: AlertBannerTheme;
  /** @deprecated Use theme: success → positive, error → negative (warning and info are the same). */
  status?: StatusAlias;
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: AlertBannerSize;
  /** Figma Leading: `true` shows the theme icon, `false` hides it, or pass a custom icon (an icon name or a node). */
  leading?: boolean | IconName | ReactNode;
  /** Figma Action (Medium only): Button/Overlay Small Inverse. */
  action?: { label: ReactNode; onClick?: () => void };
  /** Shows the close control (icon-x-small-line). */
  onClose?: () => void;
  /** Accessible name of the close control. Default: the locale's “Dismiss”. */
  closeLabel?: string;
  className?: string;
}

/**
 * Figma Alert-Banner (6828:9393): a full-width Solid strip for page-level messages.
 * Medium 56px (padding Small/Large, gap Small, 20px icons) · Small 32px (padding XSmall/Medium, gap XSmall, 16px icons).
 * Warning uses Content/On-Brights; Info/Positive/Negative use Content/On-Colors; Default is Neutral/Solid + Inverse.
 */
export function AlertBanner({ children, theme: themeProp, status, size: sizeProp = "md", leading = true, action, onClose, closeLabel: closeLabelProp, className }: AlertBannerProps) {
  const theme: AlertBannerTheme = themeProp ?? toneFromStatus(status) ?? "default";
  const t = useZenLabels();
  const closeLabel = closeLabelProp ?? t.dismiss;
  const size = scaleKey(sizeProp, alertBannerSizes);
  const leadingNode = leading === true ? <Icon name={themeIcon[theme]} decorative /> : leading ? renderIcon(leading) : null;
  const urgent = theme === "negative" || theme === "warning";
  const closeTip = useIconTooltip(onClose ? closeLabel : false);
  return (
    <div className={["zen-alert-banner", className].filter(Boolean).join(" ")} data-tone={theme} data-size={size} role={urgent ? "alert" : "status"}>
      {leadingNode ? <span className="zen-alert-banner__icon" aria-hidden="true">{leadingNode}</span> : null}
      <span className={`zen-alert-banner__message ${typographyStyles[size === "small" ? "Body/Small/Medium" : "Body/Base/Medium"]}`}>{children}</span>
      {action && size === "medium" ? (
        <Button className="zen-alert-banner__action" appearance="overlay" level="inverse" size="sm" onClick={action.onClick}>{action.label}</Button>
      ) : null}
      {onClose ? (
        <button type="button" className="zen-alert-banner__close" aria-label={closeLabel} {...closeTip.bind({ onClick: onClose })}>
          <Icon name="icon-x-small-line" decorative />{closeTip.tooltip}
        </button>
      ) : null}
    </div>
  );
}
