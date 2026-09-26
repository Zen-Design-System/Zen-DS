import type { ReactNode } from "react";
import { Button, type ButtonAppearance, type ButtonLevel } from "../Button";
import { Icon, type IconName } from "../Icon";
import { typographyStyles } from "../../tokens/typography.generated";
import "./toast.css";

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
  /** Figma Title (Body/Base/Bold). */
  title?: ReactNode;
  /** Figma Caption (Body/Small/Regular). */
  children?: ReactNode;
  /** `false` hides the leading icon; a node replaces it. */
  icon?: boolean | ReactNode;
  /** Figma Actions: one Small button. */
  action?: { label: ReactNode; onClick?: () => void };
  /** Shows the close control (icon-x-small-line). */
  onClose?: () => void;
  closeLabel?: string;
  className?: string;
}

/**
 * Figma Toast-Message (1579:13276): Corner-Radius/2XLarge surface with Effect/Popover, padding Medium/Large,
 * gap Medium; the Body groups the Title/Caption stack (gap 3XSmall) with the action (gap XSmall).
 * Subtle is the Popover surface with a 1px OUTSIDE Border/Popover/Subtle stroke.
 */
export function Toast({ type = "neutral", title, children, icon = true, action, onClose, closeLabel = "Dismiss", className }: ToastProps) {
  const leading = icon === true ? <Icon name={typeIcon[type]} decorative /> : icon || null;
  const urgent = type === "negative" || type === "warning";
  const button = actionButton[type];
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
        <button type="button" className="zen-toast__close" aria-label={closeLabel} onClick={onClose}>
          <Icon name="icon-x-small-line" decorative />
        </button>
      ) : null}
    </div>
  );
}
