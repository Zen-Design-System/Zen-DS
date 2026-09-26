import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button, type ButtonLevel } from "../Button";
import { Icon, type IconName } from "../Icon";
import { typographyStyles } from "../../tokens/typography.generated";
import "./dialog.css";

export const dialogThemes = ["default", "info", "positive", "warning", "negative"] as const;
export type DialogTheme = (typeof dialogThemes)[number];

const themeIcon: Record<DialogTheme, IconName> = {
  default: "icon-info-circle-solid",
  info: "icon-info-circle-solid",
  positive: "icon-check-circle-solid",
  warning: "icon-alert-triangle-solid",
  negative: "icon-info-hexagon-solid",
};

export type DialogAction = { label: ReactNode; onClick?: () => void; level?: ButtonLevel; disabled?: boolean; autoFocus?: boolean };

export interface DialogProps {
  open: boolean;
  /** Called with false on Escape, overlay click, or when an action without its own handler is pressed. */
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Figma Caption (Body/Base/Regular, Neutral/Base). */
  description?: ReactNode;
  theme?: DialogTheme;
  /** Figma Modal-Icon. Defaults to true; pass a node to override the themed icon. */
  icon?: boolean | ReactNode;
  /** Primary action (Level=Primary by default). */
  primaryAction?: DialogAction;
  /** Secondary action beside the primary (Level=Tertiary). */
  secondaryAction?: DialogAction;
  /** Third action, placed on the far left on desktop (Button=Triple). */
  tertiaryAction?: DialogAction;
  /** Figma Custom slot, rendered between the heading and the actions. */
  children?: ReactNode;
  /** Close when the overlay is clicked. Default true; set false for destructive confirmations in progress. */
  dismissible?: boolean;
  className?: string;
}

const focusableSelector = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Figma Modal/Dialog (841:17177): Theme × Device. Desktop 440px, Heading/3; ≤ 480px viewport switches to the Mobile
 * layout (Heading/4, stacked full-width actions). Focus is trapped while open and restored to the opener on close. */
export function Dialog({ open, onOpenChange, title, description, theme = "default", icon = true, primaryAction, secondaryAction, tertiaryAction, children, dismissible = true, className }: DialogProps) {
  const id = useId().replace(/:/g, "");
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement;
    const panel = panelRef.current;
    const initial = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>(".zen-dialog__actions .zen-button:last-child") ?? panel;
    initial?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) { event.preventDefault(); onOpenChange(false); return; }
      if (event.key !== "Tab" || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector));
      if (!nodes.length) { event.preventDefault(); return; }
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, dismissible, onOpenChange]);
  if (!open || typeof document === "undefined") return null;
  const renderAction = (action: DialogAction | undefined, fallbackLevel: ButtonLevel, key: string) => action ? (
    <Button key={key} appearance="main" level={action.level ?? fallbackLevel} size="md" disabled={action.disabled} data-autofocus={action.autoFocus ? "" : undefined} data-action={key} onClick={() => (action.onClick ? action.onClick() : onOpenChange(false))}>{action.label}</Button>
  ) : null;
  const iconNode = icon === false ? null : icon === true ? <Icon name={themeIcon[theme]} decorative /> : icon;
  const hasActions = Boolean(primaryAction || secondaryAction || tertiaryAction);
  return createPortal(
    <div className="zen-dialog-overlay" onPointerDown={(event) => { if (dismissible && event.target === event.currentTarget) onOpenChange(false); }}>
      <div ref={panelRef} role={theme === "negative" || theme === "warning" ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-desc` : undefined} tabIndex={-1} className={["zen-dialog", className].filter(Boolean).join(" ")} data-theme={theme}>
        <div className="zen-dialog__content">
          <div className="zen-dialog__heading">
            {iconNode ? <span className="zen-dialog__icon" aria-hidden="true">{iconNode}</span> : null}
            <h2 id={`${id}-title`} className={`zen-dialog__title ${typographyStyles["Heading/3"]}`}>{title}</h2>
          </div>
          {description ? <p id={`${id}-desc`} className={`zen-dialog__description ${typographyStyles["Body/Base/Regular"]}`}>{description}</p> : null}
        </div>
        {children ? <div className="zen-dialog__custom">{children}</div> : null}
        {hasActions ? (
          <div className="zen-dialog__actions" data-count={[primaryAction, secondaryAction, tertiaryAction].filter(Boolean).length}>
            {renderAction(tertiaryAction, "tertiary", "tertiary")}
            <div className="zen-dialog__actions-main">
              {renderAction(secondaryAction, "tertiary", "secondary")}
              {renderAction(primaryAction, "primary", "primary")}
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
