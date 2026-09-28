import type { ReactNode } from "react";
import { Button, type ButtonAppearance, type ButtonLevel } from "../Button";
import { Icon, type IconName } from "../Icon";
import { useIconTooltip } from "../Tooltip";
import { renderIcon } from "../_shared/icon";
import { toneFromStatus, type StatusAlias } from "../_shared/status";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./toast.css";
import "../Icon/core";

export const toastTypes = ["neutral", "subtle", "info", "positive", "warning", "negative"] as const;
export type ToastType = (typeof toastTypes)[number];

/** Figma Toast-Message leading icon per Type. */
const typeIcon: Record<ToastType, IconName> = {
  neutral: "icon-alert-circle-solid",
  subtle: "icon-alert-circle-solid",
  info: "icon-alert-circle-solid",
  positive: "icon-check-circle-solid",
  warning: "icon-alert-triangle-solid",
  negative: "icon-alert-octagon-solid",
};

/** Figma action button per Type: Neutral → Overlay Inverse, Subtle → Main Tertiary, coloured → Overlay White. */
const actionButton: Record<ToastType, { appearance: ButtonAppearance; level: ButtonLevel }> = {
  neutral: { appearance: "overlay", level: "inverse" },
  subtle: { appearance: "main", level: "tertiary" },
  info: { appearance: "overlay", level: "white" },
  positive: { appearance: "overlay", level: "white" },
  warning: { appearance: "overlay", level: "white" },
  negative: { appearance: "overlay", level: "white" },
};

export interface ToastProps {
  type?: ToastType;
  /** @deprecated Use type: success → positive, error → negative (warning and info are the same). */
  status?: StatusAlias;
  /** Figma Title (Body/Base/Bold). */
  title?: ReactNode;
  /** Figma Caption (Body/Small/Regular). */
  children?: ReactNode;
  /** `true` (default) shows the type's icon, `false` hides it; an icon name or a node replaces it. */
  icon?: boolean | IconName | ReactNode;
  /** Figma Actions: one Small button. */
  action?: { label: ReactNode; onClick?: () => void };
  /** Shows the close control (icon-x-small-line). */
  onClose?: () => void;
  /** Accessible name of the close control. Default: the locale's “Dismiss”. */
  closeLabel?: string;
  className?: string;
}

/**
 * Figma Toast-Message (1579:13276): Corner-Radius/2XLarge surface with Effect/Popover, padding Medium/Large,
 * gap Medium; the Body groups the Title/Caption stack (gap 3XSmall) with the action (gap XSmall).
 * Subtle is the Popover surface with a 1px OUTSIDE Border/Popover/Subtle stroke.
 */
export function Toast({ type: typeProp, status, title, children, icon = true, action, onClose, closeLabel: closeLabelProp, className }: ToastProps) {
  const type: ToastType = typeProp ?? toneFromStatus(status) ?? "neutral";
  const t = useZenLabels();
  const closeLabel = closeLabelProp ?? t.dismiss;
  const leading = icon === true ? <Icon name={typeIcon[type]} decorative /> : icon ? renderIcon(icon) : null;
  const urgent = type === "negative" || type === "warning";
  const button = actionButton[type];
  const closeTip = useIconTooltip(onClose ? closeLabel : false);
  return (
    <div className={["zen-toast", className].filter(Boolean).join(" ")} data-type={type} role={urgent ? "alert" : "status"}>
      {leading ? <span className="zen-toast__icon" aria-hidden="true">{leading}</span> : null}
      <div className="zen-toast__body">
        <div className="zen-toast__content">
          {title ? <span className={`zen-toast__title ${typographyStyles["Body/Base/Bold"]}`}>{title}</span> : null}
          {children ? <span className={`zen-toast__caption ${typographyStyles["Body/Small/Regular"]}`}>{children}</span> : null}
        </div>
        {action ? <Button className="zen-toast__action" appearance={button.appearance} level={button.level} size="sm" onClick={action.onClick}>{action.label}</Button> : null}
      </div>
      {onClose ? (
        <button type="button" className="zen-toast__close" aria-label={closeLabel} {...closeTip.bind({ onClick: onClose })}>
          <Icon name="icon-x-small-line" decorative />{closeTip.tooltip}
        </button>
      ) : null}
    </div>
  );
}
