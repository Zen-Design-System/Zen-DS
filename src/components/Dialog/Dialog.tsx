import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { usePresence } from "../Motion";
import { ZenPortal } from "../Portal";
import { Button, IconButton, type ButtonLevel } from "../Button";
import { Icon, type IconName } from "../Icon";
import { renderIcon } from "../_shared/icon";
import { useOverlayOpen, type OverlayOpenProps } from "../_shared/overlay";
import { useZenLabels } from "../_shared/zen-context";
import { countInvalidFields, focusFirstInvalidField } from "../Form/focus";
import { VisuallyHidden } from "../VisuallyHidden";
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

export type DialogAction = {
  label: ReactNode;
  onClick?: () => void;
  level?: ButtonLevel;
  disabled?: boolean;
  autoFocus?: boolean;
  /** `submit` makes the button submit a form, as ActionBar actions can: the `form` it names (a SidePanel's body form sits
   *  outside the actions), so Enter in a field submits too. Without `onClick` a submit button only submits. */
  type?: "button" | "submit";
  /** id of the <form> a `submit` action submits (Button `form`). */
  form?: string;
};

const focusableSelector = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

/**
 * The fields a modal focuses first, in DOM order: text inputs (a Search too), checkboxes and radios, native selects, text
 * areas, rich text, and a SelectField's trigger button (its native <select> is hidden with tabIndex -1, so it never
 * matches and the trigger is the field). Shared with BottomSheet.
 */
export const modalFieldSelector = ":is(input:not([type='hidden']), select, textarea, [contenteditable='true'], .zen-select__trigger):not(:disabled):not([tabindex='-1'])";

/** The native radios grouped with `node` (same name and form) inside `root`, or null when `node` is not a named radio. */
function radioGroupOf(node: Element | null, root: ParentNode): HTMLInputElement[] | null {
  if (!(node instanceof HTMLInputElement) || node.type !== "radio" || !node.name) return null;
  return Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]')).filter((radio) => radio.name === node.name && radio.form === node.form);
}

/** Where Tab lands for `node`: in a native radio group that is its checked radio (the group's one tab stop), else `node`. */
function tabStopOf(node: HTMLElement, root: ParentNode): HTMLElement {
  return radioGroupOf(node, root)?.find((radio) => radio.checked && !radio.disabled) ?? node;
}

/** `active` is the tab stop `node` stands for: the node itself, or another radio of its group. */
function isSameTabStop(active: Element | null, node: HTMLElement, root: ParentNode): boolean {
  return active === node || Boolean(radioGroupOf(node, root)?.includes(active as HTMLInputElement));
}

/** A control whose popup is open (a Select trigger, a combobox, a Menu or picker button): an Escape on it is the popup's. */
const openPopupTrigger = '[aria-expanded="true"]:is([aria-haspopup]:not([aria-haspopup="false"]), [role="combobox"])';

/** Open modals, oldest first. Only the last (topmost) one answers Escape and traps Tab: a Dialog opened over a ModalForm
 * closes alone, and the form underneath does not pull focus back into itself. */
const modalStack: object[] = [];

/**
 * Shared modal behaviour: focus the first target, trap Tab, Escape closes, body scroll is locked, focus returns to the opener.
 * Internal to the design system (Dialog, ModalForm, SidePanel): imported from "../Dialog/Dialog", not re-exported publicly.
 *
 * Escape belongs to the innermost thing that is open. The modal ignores it when an inner popup already handled it
 * (`event.defaultPrevented`: Select lists, date pickers, Menus, Popovers call preventDefault on their own Escape), when it
 * was pressed on a control whose popup was open at that moment (`aria-expanded="true"` with `aria-haspopup` or
 * role=combobox, read before any handler runs), and when another modal is open on top of it. The key listeners sit on
 * `window`, after every document-level popup listener, so those have had their turn first.
 */
export function useModal(open: boolean, panelRef: RefObject<HTMLElement | null>, dismissible: boolean, onOpenChange: (open: boolean) => void, initialSelector: string) {
  const openerRef = useRef<Element | null>(null);
  useEffect(() => {
    if (!open) return undefined;
    const entry = {};
    modalStack.push(entry);
    openerRef.current = document.activeElement;
    const panel = panelRef.current;
    // The first enabled, tabbable match wins; a disabled target (Send before the form is valid) falls through to the
    // next one, then to the first control that can take focus. With no preferred target at all (BottomSheet) the panel
    // itself takes focus, so a pointer-opened sheet shows no stray ring on Close. A radio match lands where Tab would:
    // the group's checked radio (a ColorSelector or RadioButton group), not its first one; `data-autofocus` is taken as is.
    const pick = (selector: string) => Array.from(panel?.querySelectorAll<HTMLElement>(selector) ?? []).find((node) => !node.matches(":disabled") && node.tabIndex >= 0);
    const hasPreferred = Boolean(panel?.querySelector("[data-autofocus]") ?? panel?.querySelector(initialSelector));
    const field = pick(initialSelector) ?? (hasPreferred ? pick(focusableSelector) : undefined);
    const initial = pick("[data-autofocus]") ?? (field && panel ? tabStopOf(field, panel) : field) ?? panel;
    initial?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Captured before React or any popup handles the key: a Select trigger closes its list on Escape (aria-expanded turns
    // false) before the bubbling listener below runs, so the open state is read here.
    let popupEscape: Event | null = null;
    const onKeyCapture = (event: KeyboardEvent) => {
      popupEscape = event.key === "Escape" && event.target instanceof Element && event.target.matches(openPopupTrigger) ? event : null;
    };
    const onKey = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== entry) return;
      if (event.key === "Escape") {
        if (!dismissible || event.defaultPrevented || event === popupEscape) return;
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      // Only real Tab stops: roving-tabindex items (inactive tabs, radios, grid cells) and hidden or inert nodes are skipped,
      // or the "last" stop would be one Tab never reaches and focus would leave the modal.
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter((node) => node.tabIndex >= 0 && !node.closest("[inert], [hidden]") && node.getClientRects().length > 0);
      if (!nodes.length) { event.preventDefault(); return; }
      // A native radio group is one stop (its checked radio), so the ends compare by group: Shift+Tab from the checked
      // radio of a group that opens the modal wraps to the end instead of leaving it.
      const first = nodes[0], last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (isSameTabStop(active, first, panel) || active === panel || !panel.contains(active))) { event.preventDefault(); tabStopOf(last, panel).focus(); }
      else if (!event.shiftKey && (isSameTabStop(active, last, panel) || !panel.contains(active))) { event.preventDefault(); tabStopOf(first, panel).focus(); }
    };
    window.addEventListener("keydown", onKeyCapture, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKeyCapture, true);
      window.removeEventListener("keydown", onKey);
      const index = modalStack.lastIndexOf(entry);
      if (index >= 0) modalStack.splice(index, 1);
      document.body.style.overflow = previousOverflow;
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, dismissible, onOpenChange, panelRef, initialSelector]);
}

/**
 * Where a Dialog or ModalForm renders. Inside a device frame (`[data-zen-overlay-root]`: PlatformPhone and app device
 * previews) it renders in that frame, as Menu and the Chat hold layer do, so it covers that screen only and scales with
 * it; elsewhere it goes to the page's ZenPortal. A modal has no trigger to start the search from, so an empty
 * <template> rendered in place while the modal is mounted finds the frame; the modal itself renders once the frame is
 * known (a layout effect, so still before the first paint) and its focus trap starts only then.
 */
export function useOverlayHost(mounted: boolean) {
  const anchorRef = useRef<HTMLTemplateElement>(null);
  const [host, setHost] = useState<HTMLElement | null | undefined>(undefined);
  useLayoutEffect(() => {
    setHost(mounted ? anchorRef.current?.closest<HTMLElement>("[data-zen-overlay-root]") ?? null : undefined);
  }, [mounted]);
  const anchor = mounted ? <template ref={anchorRef} data-zen-overlay-anchor="" /> : null;
  const place = (overlay: ReactNode) => (host ? createPortal(overlay, host) : <ZenPortal>{overlay}</ZenPortal>);
  return { contained: Boolean(host), ready: mounted && host !== undefined, anchor, place };
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
  const render = (action: DialogAction | undefined, fallbackLevel: ButtonLevel, key: "primary" | "secondary" | "tertiary") => {
    if (!action) return null;
    const submits = (action.type ?? (key === "primary" && submitPrimary ? "submit" : "button")) === "submit";
    return (
      <Button key={key} appearance="main" level={action.level ?? fallbackLevel} size="md" disabled={action.disabled}
        type={submits ? "submit" : "button"} form={action.form}
        data-autofocus={action.autoFocus ? "" : undefined} data-action={key}
        onClick={submits && !action.onClick ? undefined : () => (action.onClick ? action.onClick() : onDefault?.())}>{action.label}</Button>
    );
  };
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
 * layout (10153:7277: 350 of a 390 screen, so Padding/Large side margins; Heading/4, stacked full-width actions, at the
 * bottom clear of the safe area). Focus is trapped while open and restored to the opener on close.
 * Inside a device frame (`[data-zen-overlay-root]`, e.g. a phone preview) it opens in that frame, and the frame's width
 * picks the Device (an unsaved-changes guard on a phone screen). */
export function Dialog({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose, title, headingLevel = 2, description, theme = "default", icon = true, primaryAction, secondaryAction, tertiaryAction, actionsDirection = "horizontal", children, dismissible = true, className }: DialogProps) {
  const [open, onOpenChange] = useOverlayOpen({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose });
  const id = useId().replace(/:/g, "");
  const panelRef = useRef<HTMLDivElement>(null);
  // Stay mounted for the exit animation; useModal already restored focus/scroll when `open` went false.
  const { mounted, phase } = usePresence(open, 200);
  const host = useOverlayHost(mounted);
  useModal(open && host.ready, panelRef, dismissible, onOpenChange, `${modalFieldSelector}, .zen-modal-actions [data-action='primary']`);
  if (!mounted || typeof document === "undefined") return null;
  const closing = phase === "closing";
  const iconNode = icon === false ? null : icon === true ? <Icon name={themeIcon[theme]} decorative /> : renderIcon(icon);
  const Title = `h${headingLevel}` as const;
  const overlay = (
    <div className="zen-dialog-overlay" data-state={phase} data-modal="dialog" data-contained={host.contained ? "true" : undefined} onPointerDown={(event) => { if (!closing && dismissible && event.target === event.currentTarget) onOpenChange(false); }}>
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
    </div>
  );
  return <>{host.anchor}{host.ready ? host.place(overlay) : null}</>;
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
  /**
   * Wraps the modal in a <form noValidate>: Enter or the primary button submits; the primary action becomes type=submit.
   * The handler may return a promise and ModalForm waits for it; then, if any field is invalid (aria-invalid, as Form
   * reads it), focus moves to the first one and "N fields need attention" is announced, so a blocked submit lands on what
   * needs fixing.
   */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => unknown;
  /**
   * Skip the browser's own validation bubbles, as Form does: `required` fields don't block the submit, so `onSubmit`
   * always runs and shows the errors under each field. Default true; only applies with `onSubmit`.
   */
  noValidate?: boolean;
  /** Screen-reader message after a blocked submit. Default: the locale's "1 field needs attention" / "3 fields need attention". */
  invalidMessage?: (count: number) => string;
  dismissible?: boolean;
  className?: string;
}

/** Figma Modal/Forms (841:17182): a Container (radius Modal-Radius, Background/Container, 1px Container/Border,
 * Effect/Container) with Header (Heading/2 + caption), Body (Main-Contents) and Footer (Modal/Actions); the 1-3,
 * Half-Half and 3-4 layouts add a Side-Content column 4px apart. Below 720px the side column stacks above the form.
 * Inside a device frame (`[data-zen-overlay-root]`) it opens in that frame, like Dialog. With `onSubmit` it is a
 * `<form noValidate>` that behaves like Form: a blocked submit focuses the first invalid field and announces the count. */
export function ModalForm({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose, title, headingLevel = 2, description, layout = "basic", side, top, header = true, closeButton = true, closeLabel: closeLabelProp, children, primaryAction, secondaryAction, tertiaryAction, actionsDirection = "horizontal", onSubmit, noValidate = true, invalidMessage: invalidMessageProp, dismissible = true, className }: ModalFormProps) {
  const [open, onOpenChange] = useOverlayOpen({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose });
  const t = useZenLabels();
  const closeLabel = closeLabelProp ?? t.close;
  const invalidMessage = invalidMessageProp ?? t.fieldsNeedAttention;
  const id = useId().replace(/:/g, "");
  const panelRef = useRef<HTMLDivElement>(null);
  const { mounted, phase } = usePresence(open, 200);
  const host = useOverlayHost(mounted);
  useModal(open && host.ready, panelRef, dismissible, onOpenChange, `${modalFieldSelector}, .zen-modal-actions [data-action='primary']`);
  // The blocked-submit announcement (Form's live region): cleared on close, so a reopened modal starts silent.
  const [announcement, setAnnouncement] = useState("");
  const frame = useRef(0);
  useEffect(() => { if (!open) { cancelAnimationFrame(frame.current); setAnnouncement(""); } }, [open]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
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
  const announce = (message: string) => {
    // Clear first so the same message is read again after a second blocked submit (as Form does).
    setAnnouncement("");
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => { frame.current = requestAnimationFrame(() => setAnnouncement(message)); });
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    // A blocked submit: once the handler's errors have rendered, focus the first invalid field and announce how many need
    // attention (Form's helpers, same rule as Form). A valid submit that closes the modal finds nothing invalid (or the
    // form is inert or gone) and leaves focus alone.
    void Promise.resolve(onSubmit?.(event)).then(() => {
      requestAnimationFrame(() => {
        const count = form.isConnected && !form.closest("[inert]") ? countInvalidFields(form) : 0;
        if (!count) { setAnnouncement(""); return; }
        focusFirstInvalidField(form);
        announce(invalidMessage(count));
      });
    });
  };
  const overlay = (
    <div className="zen-dialog-overlay" data-state={phase} data-contained={host.contained ? "true" : undefined} onPointerDown={(event) => { if (!closing && dismissible && event.target === event.currentTarget) onOpenChange(false); }}>
      <div ref={panelRef} data-state={phase} inert={closing} aria-hidden={closing || undefined} role="dialog" aria-modal="true" aria-labelledby={title ? `${id}-title` : undefined} aria-describedby={description ? `${id}-desc` : undefined} tabIndex={-1}
        className={["zen-modal-form", className].filter(Boolean).join(" ")} data-layout={layout} data-side={hasSide ? "true" : "false"}>
        {onSubmit
          ? <form className="zen-modal-form__content" noValidate={noValidate} onSubmit={submit}>{inner}</form>
          : <div className="zen-modal-form__content">{inner}</div>}
        {onSubmit ? <VisuallyHidden className="zen-modal-form__live" role="status" aria-live="polite" aria-atomic="true">{announcement}</VisuallyHidden> : null}
      </div>
    </div>
  );
  return <>{host.anchor}{host.ready ? host.place(overlay) : null}</>;
}
