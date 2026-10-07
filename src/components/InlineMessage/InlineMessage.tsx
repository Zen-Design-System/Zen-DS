import type { ReactNode } from "react";
import { Button } from "../Button";
import { Icon, type IconName } from "../Icon";
import { useIconTooltip } from "../Tooltip";
import { renderIcon } from "../_shared/icon";
import { toneFromStatus, type StatusAlias } from "../_shared/status";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./inline-message.css";
import "../Icon/core";

export const inlineMessageThemes = ["neutral", "info", "positive", "warning", "negative", "custom"] as const;
export type InlineMessageTheme = (typeof inlineMessageThemes)[number];

/** Figma Inline-Message icon per Theme (Custom takes a Visual instead). */
const themeIcon: Record<Exclude<InlineMessageTheme, "custom">, IconName> = {
  neutral: "icon-info-circle-solid",
  info: "icon-info-circle-solid",
  positive: "icon-check-circle-solid",
  warning: "icon-alert-triangle-solid",
  negative: "icon-alert-octagon-solid",
};

export interface InlineMessageProps {
  theme?: InlineMessageTheme;
  /** @deprecated Use theme: success → positive, error → negative (warning and info are the same). */
  status?: StatusAlias;
  /** Figma Title (Body/Base/Bold). */
  title?: ReactNode;
  /** Figma Caption (Body/Small/Regular). */
  children?: ReactNode;
  /** `false` hides the icon; an icon name or a node replaces it. Theme=Custom: the Visual slot (defaults to a 36px image placeholder). */
  icon?: boolean | IconName | ReactNode;
  /** Figma Action: one Button/Main Small Tertiary under the text. */
  action?: { label: ReactNode; onClick?: () => void };
  /** Shows the close control (icon-x-small-line, Content/Neutral/Light). */
  onClose?: () => void;
  /** Accessible name of the close control. Default: the locale's “Dismiss”. */
  closeLabel?: string;
  className?: string;
}

/**
 * Figma Inline-Message (595:54857): a Subtle-surface message inside the content it describes.
 * Padding Medium, gap Small, Corner-Radius/Large. Icon Content/<theme>/Light, title Strongest, caption Base.
 */
export function InlineMessage({ theme: themeProp, status, title, children, icon = true, action, onClose, closeLabel: closeLabelProp, className }: InlineMessageProps) {
  const theme: InlineMessageTheme = themeProp ?? toneFromStatus(status) ?? "neutral";
  const t = useZenLabels();
  const closeLabel = closeLabelProp ?? t.dismiss;
  const leading = icon === true
    ? (theme === "custom" ? <Icon name="icon-image-solid" decorative /> : <Icon name={themeIcon[theme]} decorative />)
    : icon ? renderIcon(icon) : null;
  const urgent = theme === "negative" || theme === "warning";
  const closeTip = useIconTooltip(onClose ? closeLabel : false);
  return (
    <div className={["zen-inline-message", className].filter(Boolean).join(" ")} data-tone={theme} role={urgent ? "alert" : "status"}>
      <div className="zen-inline-message__container">
        {leading ? <span className="zen-inline-message__icon" aria-hidden="true">{leading}</span> : null}
        <div className="zen-inline-message__content">
          <div className="zen-inline-message__text">
            {title ? <span className={`zen-inline-message__title ${typographyStyles["Body/Base/Bold"]}`}>{title}</span> : null}
            {children ? <span className={`zen-inline-message__caption ${typographyStyles["Body/Small/Regular"]}`}>{children}</span> : null}
          </div>
          {action ? <Button className="zen-inline-message__action" appearance="main" level="tertiary" size="sm" onClick={action.onClick}>{action.label}</Button> : null}
        </div>
      </div>
      {onClose ? (
        <button type="button" className="zen-inline-message__close" aria-label={closeLabel} {...closeTip.bind({ onClick: onClose })}>
          <Icon name="icon-x-small-line" decorative />{closeTip.tooltip}
        </button>
      ) : null}
    </div>
  );
}
