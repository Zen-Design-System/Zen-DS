import { useEffect, useId, useRef, type FormEvent, type ReactNode, type RefObject } from "react";
import { usePresence } from "../Motion";
import { ZenPortal } from "../Portal";
import { Button, IconButton, type ButtonLevel } from "../Button";
import { Icon, type IconName } from "../Icon";
import { renderIcon } from "../_shared/icon";
import { useOverlayOpen, type OverlayOpenProps } from "../_shared/overlay";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./dialog.css";
import "../Icon/core";

export const dialogThemes = ["default", "info", "positive", "warning", "negative"] as const;
export type DialogTheme = (typeof dialogThemes)[number];
/** Figma .Primitives/Modal/Actions `Direction`. */
export const modalActionDirections = ["horizontal", "vertical"] as const;
export type ModalActionDirection = (typeof modalActionDirections)[number];
/** Figma Modal/Forms `Layout`. */
export const modalFormLayouts = ["basic", "1-3", "half-half", "3-4", "big"] as const;
export type ModalFormLayout = (typeof modalFormLayouts)[number];

const themeIcon: Record<DialogTheme, IconName> = {
  default: "icon-info-circle-solid",
  info: "icon-info-circle-solid",
  positive: "icon-check-circle-solid",
  warning: "icon-alert-triangle-solid",
  negative: "icon-info-hexagon-solid",
};

export type DialogAction = { label: ReactNode; onClick?: () => void; level?: ButtonLevel; disabled?: boolean; autoFocus?: boolean };

const focusableSelector = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

/**
 * Shared modal behaviour: focus the first target, trap Tab, Escape closes, body scroll is locked, focus returns to the opener.
 * Internal to the design system (Dialog, ModalForm, SidePanel): imported from "../Dialog/Dialog", not re-exported publicly.
 */
export function useModal(open: boolean, panelRef: RefObject<HTMLElement | null>, dismissible: boolean, onOpenChange: (open: boolean) => void, initialSelector: string) {
  const openerRef = useRef<Element | null>(null);
  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement;
    const panel = panelRef.current;
    // The first enabled, tabbable match wins; a disabled target (Send before the form is valid) falls through to the
    // next one, then to the first control that can take focus. With no preferred target at all (BottomSheet) the panel
    // itself takes focus, so a pointer-opened sheet shows no stray ring on Close.
    const pick = (selector: string) => Array.from(panel?.querySelectorAll<HTMLElement>(selector) ?? []).find((node) => !node.matches(":disabled") && node.tabIndex >= 0);
    const hasPreferred = Boolean(panel?.querySelector("[data-autofocus]") ?? panel?.querySelector(initialSelector));
    const initial = pick("[data-autofocus]") ?? pick(initialSelector) ?? (hasPreferred ? pick(focusableSelector) : undefined) ?? panel;
    initial?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) { event.preventDefault(); onOpenChange(false); return; }
      if (event.key !== "Tab" || !panel) return;
      // Only real Tab stops: roving-tabindex items (inactive tabs, radios, grid cells) and hidden or inert nodes are skipped,
      // or the "last" stop would be one Tab never reaches and focus would leave the modal.
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter((node) => node.tabIndex >= 0 && !node.closest("[inert], [hidden]") && node.getClientRects().length > 0);
      if (!nodes.length) { event.preventDefault(); return; }
      const first = nodes[0], last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel || !panel.contains(active))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (active === last || !panel.contains(active))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, dismissible, onOpenChange, panelRef, initialSelector]);
}

export interface ModalActionsProps {
  primaryAction?: DialogAction;
  secondaryAction?: DialogAction;
  tertiaryAction?: DialogAction;
  /** Figma `Direction`: Horizontal = [Tertiary] … [Secondary][Primary]; Vertical = full-width Primary, Secondary, Tertiary. */
  direction?: ModalActionDirection;
  /** Runs for an action without its own onClick (usually closes the modal). */
  onDefault?: () => void;
  /** Makes the primary button submit the surrounding <form>. */
  submitPrimary?: boolean;
  className?: string;
}

/** Figma .Primitives/Modal/Actions (694:9383): Direction × Button (Single · Dual · Triple), Button/Main Medium, gap Small. */
export function ModalActions({ primaryAction, secondaryAction, tertiaryAction, direction = "horizontal", onDefault, submitPrimary = false, className }: ModalActionsProps) {
  const count = [primaryAction, secondaryAction, tertiaryAction].filter(Boolean).length;
  if (!count) return null;
  const render = (action: DialogAction | undefined, fallbackLevel: ButtonLevel, key: "primary" | "secondary" | "tertiary") => action ? (
    <Button key={key} appearance="main" level={action.level ?? fallbackLevel} size="md" disabled={action.disabled}
      type={key === "primary" && submitPrimary ? "submit" : "button"}
      data-autofocus={action.autoFocus ? "" : undefined} data-action={key}
      onClick={key === "primary" && submitPrimary && !action.onClick ? undefined : () => (action.onClick ? action.onClick() : onDefault?.())}>{action.label}</Button>
  ) : null;
  return (
    <div className={["zen-modal-actions", className].filter(Boolean).join(" ")} data-direction={direction} data-count={count}>
      {render(tertiaryAction, "tertiary", "tertiary")}
      <div className="zen-modal-actions__main">
        {render(secondaryAction, "tertiary", "secondary")}
        {render(primaryAction, "primary", "primary")}
      </div>
    </div>
  );
}

export interface DialogProps extends OverlayOpenProps {
  title: ReactNode;
  /** Heading level of the title: 2 (default, an h2), or 1 / 3 to fit the page outline. Only the tag changes, not the text style. */
  headingLevel?: 1 | 2 | 3;
  /** Figma Caption (Body/Base/Regular, Neutral/Base). */
  description?: ReactNode;
  theme?: DialogTheme;
  /** Figma Modal-Icon. Defaults to true (the theme's icon); `false` hides it; an icon name or a node replaces it. */
  icon?: boolean | IconName | ReactNode;
  /** Primary action (Level=Primary by default). */
  primaryAction?: DialogAction;
  /** Secondary action beside the primary (Level=Tertiary). */
  secondaryAction?: DialogAction;
  /** Third action, placed on the far left on desktop (Button=Triple). */
  tertiaryAction?: DialogAction;
  /** Figma .Primitives/Modal/Actions `Direction`. Mobile (≤ 480px) is always vertical. */
  actionsDirection?: ModalActionDirection;
  /** Figma Custom slot, rendered between the heading and the actions. */
  children?: ReactNode;
  /** Close when the overlay is clicked. Default true; set false for destructive confirmations in progress. */
  dismissible?: boolean;
  className?: string;
}

/** Figma Modal/Dialog (841:17177): Theme × Device. Desktop 440px, Heading/3; ≤ 480px viewport switches to the Mobile
 * layout (Heading/4, stacked full-width actions). Focus is trapped while open and restored to the opener on close. */
export function Dialog({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose, title, headingLevel = 2, description, theme = "default", icon = true, primaryAction, secondaryAction, tertiaryAction, actionsDirection = "horizontal", children, dismissible = true, className }: DialogProps) {
  const [open, onOpenChange] = useOverlayOpen({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose });
  const id = useId().replace(/:/g, "");
  const panelRef = useRef<HTMLDivElement>(null);
  useModal(open, panelRef, dismissible, onOpenChange, "input:not(:disabled), select:not(:disabled), textarea:not(:disabled), .zen-modal-actions [data-action='primary']");
  // Stay mounted for the exit animation; useModal already restored focus/scroll when `open` went false.
  const { mounted, phase } = usePresence(open, 200);
  if (!mounted || typeof document === "undefined") return null;
  const closing = phase === "closing";
  const iconNode = icon === false ? null : icon === true ? <Icon name={themeIcon[theme]} decorative /> : renderIcon(icon);
  const Title = `h${headingLevel}` as const;
  return (
    <ZenPortal><div className="zen-dialog-overlay" data-state={phase} onPointerDown={(event) => { if (!closing && dismissible && event.target === event.currentTarget) onOpenChange(false); }}>
      <div ref={panelRef} data-state={phase} inert={closing} aria-hidden={closing || undefined} role={theme === "negative" || theme === "warning" ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-desc` : undefined} tabIndex={-1} className={["zen-dialog", className].filter(Boolean).join(" ")} data-tone={theme}>
        <div className="zen-dialog__content">
          <div className="zen-dialog__heading">
            {iconNode ? <span className="zen-dialog__icon" aria-hidden="true">{iconNode}</span> : null}
            <Title id={`${id}-title`} className={`zen-dialog__title ${typographyStyles["Heading/3"]}`}>{title}</Title>
          </div>
          {description ? <p id={`${id}-desc`} className={`zen-dialog__description ${typographyStyles["Body/Base/Regular"]}`}>{description}</p> : null}
        </div>
        {children ? <div className="zen-dialog__custom">{children}</div> : null}
        <ModalActions className="zen-dialog__actions" primaryAction={primaryAction} secondaryAction={secondaryAction} tertiaryAction={tertiaryAction} direction={actionsDirection} onDefault={() => onOpenChange(false)} />
      </div>
    </div></ZenPortal>
  );
}

export interface ModalFormProps extends OverlayOpenProps {
  title?: ReactNode;
  /** Heading level of the title: 2 (default, an h2), or 1 / 3 to fit the page outline. Only the tag changes, not the text style. */
  headingLevel?: 1 | 2 | 3;
  /** Figma Caption (Body/Base/Regular, Neutral/Base, max 720px). */
  description?: ReactNode;
  /** Figma `Layout`: Basic 440 · 1-3 876 (240px side) · Half-Half 876 · 3-4 767 · Big 960. */
  layout?: ModalFormLayout;
  /** Figma Side-Content slot (1-3, Half-Half, 3-4): an illustration, preview, steps or summary beside the form. */
  side?: ReactNode;
  /** Figma Top-Customize slot, rendered above the header (e.g. a Stepper or a banner). */
  top?: ReactNode;
  /** Figma Default-Header. */
  header?: boolean;
  /** Figma Close: the 32px Button/Icon-Flat in the top-right corner. */
  closeButton?: boolean;
  /** Accessible name of the close button. Default: the locale's “Close”. */
  closeLabel?: string;
  /** Figma Main-Contents slot: the form fields (gap Medium). */
  children?: ReactNode;
  primaryAction?: DialogAction;
  secondaryAction?: DialogAction;
  tertiaryAction?: DialogAction;
  actionsDirection?: ModalActionDirection;
  /** Wraps the modal in a <form>: Enter or the primary button submits; the primary action becomes type=submit. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  dismissible?: boolean;
  className?: string;
}

/** Figma Modal/Forms (841:17182): a Container (radius Modal-Radius, Background/Container, 1px Container/Border,
 * Effect/Container) with Header (Heading/2 + caption), Body (Main-Contents) and Footer (Modal/Actions); the 1-3,
 * Half-Half and 3-4 layouts add a Side-Content column 4px apart. Below 720px the side column stacks above the form. */
export function ModalForm({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose, title, headingLevel = 2, description, layout = "basic", side, top, header = true, closeButton = true, closeLabel: closeLabelProp, children, primaryAction, secondaryAction, tertiaryAction, actionsDirection = "horizontal", onSubmit, dismissible = true, className }: ModalFormProps) {
  const [open, onOpenChange] = useOverlayOpen({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose });
  const t = useZenLabels();
  const closeLabel = closeLabelProp ?? t.close;
  const id = useId().replace(/:/g, "");
  const panelRef = useRef<HTMLDivElement>(null);
  useModal(open, panelRef, dismissible, onOpenChange, "input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [contenteditable='true'], .zen-modal-actions [data-action='primary']");
  const { mounted, phase } = usePresence(open, 200);
  if (!mounted || typeof document === "undefined") return null;
  const closing = phase === "closing";
  const hasSide = side !== undefined && side !== null && layout !== "basic" && layout !== "big";
  const Title = `h${headingLevel}` as const;
  const main = (
    <>
      {top ? <div className="zen-modal-form__top">{top}</div> : null}
      {header && (title || description) ? (
        <header className="zen-modal-form__header">
          {title ? <Title id={`${id}-title`} className={`zen-modal-form__title ${typographyStyles["Heading/2"]}`}>{title}</Title> : null}
          {description ? <p id={`${id}-desc`} className={`zen-modal-form__description ${typographyStyles["Body/Base/Regular"]}`}>{description}</p> : null}
        </header>
      ) : null}
      {children ? <div className="zen-modal-form__body">{children}</div> : null}
      <ModalActions className="zen-modal-form__footer" primaryAction={primaryAction} secondaryAction={secondaryAction} tertiaryAction={tertiaryAction} direction={actionsDirection} onDefault={() => onOpenChange(false)} submitPrimary={Boolean(onSubmit)} />
      {closeButton ? <IconButton className="zen-modal-form__close" appearance="flat" level="primary" size="sm" aria-label={closeLabel} icon={<Icon name="icon-x-medium-line" />} onClick={() => onOpenChange(false)} /> : null}
    </>
  );
  const inner = (
    <>
      {hasSide ? <aside className="zen-modal-form__side">{side}</aside> : null}
      <div className="zen-modal-form__main">{main}</div>
    </>
  );
  return (
    <ZenPortal><div className="zen-dialog-overlay" data-state={phase} onPointerDown={(event) => { if (!closing && dismissible && event.target === event.currentTarget) onOpenChange(false); }}>
      <div ref={panelRef} data-state={phase} inert={closing} aria-hidden={closing || undefined} role="dialog" aria-modal="true" aria-labelledby={title ? `${id}-title` : undefined} aria-describedby={description ? `${id}-desc` : undefined} tabIndex={-1}
        className={["zen-modal-form", className].filter(Boolean).join(" ")} data-layout={layout} data-side={hasSide ? "true" : "false"}>
        {onSubmit
          ? <form className="zen-modal-form__content" onSubmit={(event) => { event.preventDefault(); onSubmit(event); }}>{inner}</form>
          : <div className="zen-modal-form__content">{inner}</div>}
      </div>
    </div></ZenPortal>
  );
}
