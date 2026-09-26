import type { ReactNode } from "react";
import { Button } from "../Button";
import { Icon, type IconName } from "../Icon";
import { typographyStyles } from "../../tokens/typography.generated";
import "./alert-banner.css";

export const alertBannerThemes = ["default", "info", "positive", "warning", "negative"] as const;
export const alertBannerSizes = ["medium", "small"] as const;
export type AlertBannerTheme = (typeof alertBannerThemes)[number];
export type AlertBannerSize = (typeof alertBannerSizes)[number];

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
  size?: AlertBannerSize;
  /** Figma Leading: `true` shows the theme icon, `false` hides it, or pass a custom icon. */
  leading?: boolean | ReactNode;
  /** Figma Action (Medium only): Button/Overlay Small Inverse. */
  action?: { label: ReactNode; onClick?: () => void };
  /** Shows the close control (icon-x-small-line). */
  onClose?: () => void;
  closeLabel?: string;
  className?: string;
}

/**
 * Figma Alert-Banner (6828:9393): a full-width Solid strip for page-level messages.
 * Medium 56px (padding Small/Large, gap Small, 20px icons) · Small 32px (padding XSmall/Medium, gap XSmall, 16px icons).
 * Warning uses Content/On-Brights; Info/Positive/Negative use Content/On-Colors; Default is Neutral/Solid + Inverse.
 */
export function AlertBanner({ children, theme = "default", size = "medium", leading = true, action, onClose, closeLabel = "Dismiss", className }: AlertBannerProps) {
  const leadingNode = leading === true ? <Icon name={themeIcon[theme]} decorative /> : leading || null;
  const urgent = theme === "negative" || theme === "warning";
  return (
    <div className={["zen-alert-banner", className].filter(Boolean).join(" ")} data-theme={theme} data-size={size} role={urgent ? "alert" : "status"}>
      {leadingNode ? <span className="zen-alert-banner__icon" aria-hidden="true">{leadingNode}</span> : null}
      <span className={`zen-alert-banner__message ${typographyStyles[size === "small" ? "Body/Small/Medium" : "Body/Base/Medium"]}`}>{children}</span>
      {action && size === "medium" ? (
        <Button className="zen-alert-banner__action" appearance="overlay" level="inverse" size="sm" onClick={action.onClick}>{action.label}</Button>
      ) : null}
      {onClose ? (
        <button type="button" className="zen-alert-banner__close" aria-label={closeLabel} onClick={onClose}>
          <Icon name="icon-x-small-line" decorative />
        </button>
      ) : null}
    </div>
  );
}
