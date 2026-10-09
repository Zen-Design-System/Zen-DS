import { useId, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactElement, type ReactNode } from "react";
import { usePresence } from "../Motion";
import { Button } from "../Button";
import { type DialogAction } from "../Dialog";
import { modalFieldSelector, useModal, useOverlayHost } from "../Dialog/Dialog";
import { Icon, type IconName } from "../Icon";
import { TopNavigationActionButton } from "../TopNavigation";
import { renderIcon } from "../_shared/icon";
import { useOverlayOpen, type OverlayOpenProps } from "../_shared/overlay";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./bottom-sheet.css";
import "../Icon/core";

/** Figma Type: Modal (contents + Actions footer) · Action (a list of Sheet-Actions items). */
export type BottomSheetType = "modal" | "action";
/** Figma Size: Flex (hugs its content) · Max-Fixed (full height, minus the top gap). */
export type BottomSheetSize = "flex" | "max";

export interface BottomSheetItem {
  id: string;
  label: ReactNode;
  /** Leading icon: an icon name or an element. */
  icon?: IconName | ReactElement;
  /** Trailing content (Figma Trailing): a hint, badge or chevron. */
  trailing?: ReactNode;
  disabled?: boolean;
  /** Destructive items use Negative content. */
  destructive?: boolean;
}

export interface BottomSheetProps extends OverlayOpenProps {
  /** Figma Header-Bar heading (Heading-Text H3). */
  title: ReactNode;
  type?: BottomSheetType;
  size?: BottomSheetSize;
  /** Figma Search slot (a Search, under the header). The Search takes focus when the sheet opens (`data-autofocus` elsewhere wins). */
  search?: ReactNode;
  /** Action type: Figma Items slot. */
  items?: BottomSheetItem[];
  /** Action type: the item shown as Single-Selected (Active/Accent/Subtle + check). */
  selectedId?: string;
  /** Action type: called with the item; the sheet closes unless `keepOpen` is set. */
  onSelect?: (item: BottomSheetItem) => void;
  keepOpen?: boolean;
  /** Modal type: Figma Contents slot. */
  children?: ReactNode;
  primaryAction?: DialogAction;
  secondaryAction?: DialogAction;
  /** Figma .Primitives/Bottom-Sheet/Actions Direction. */
  actionsDirection?: "horizontal" | "vertical";
  /** Modal type: your own Footer content in place of the Actions (Figma's Footer holds any Buttons instance, e.g.
   *  `.Primitives/Date-Picker/Footer-Actions`: a summary next to a Primary). It keeps the footer's padding and stays
   *  put while the body scrolls. Ignored when `primaryAction` / `secondaryAction` are set. */
  footer?: ReactNode;
  /**
   * Modal type: makes the sheet a form (same contract as ModalForm `onSubmit`). The body and the Actions footer are
   * wrapped in a `<form>`: Enter in a field submits it and the primary action becomes `type="submit"`, so it submits
   * instead of closing (its `onClick`, if any, still runs first). The default is prevented; close the sheet from the
   * handler when the submit succeeds. Pass `form.handleSubmit` from useFormState so a failed submit focuses the first
   * invalid field. Don't nest a `<Form>` in the children. The Search slot stays outside the form. The first field (the
   * Search, when there is one) takes focus when the sheet opens; put `data-autofocus` on another control to start there.
   */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  /** Scrim tap, Escape and drag-down dismiss (default true). */
  dismissible?: boolean;
  /** Render inside the nearest positioned ancestor instead of the viewport (embedded demos). Not needed in a device frame
   *  (`[data-zen-overlay-root]`, e.g. a phone preview): a sheet opened there renders in that frame by itself. */
  inline?: boolean;
  /** Accessible name of the close button. Default: the locale's “Close”. */
  closeLabel?: string;
  className?: string;
}

/**
 * Figma Bottom-Sheet (4059:14161, page ❖ Bottom Sheet): Background/Container, top corners 28, Shadow/Top/Level-2, over the
 * Overlay scrim. Top-Indicator (40×5 Neutral/Subtle grabber) · Header-Bar (Heading/3 + 44px Tertiary close) · Search ·
 * Body (Modal: padding 20, gap 16 · Action: padding 4, 48px items) · Footer (Large buttons, padding 12/20).
 * Focus is trapped (shared Dialog `useModal`), Escape/scrim/drag-down close, and the sheet slides up/down with `usePresence`.
 * Initial focus: `data-autofocus`, else the Search or first field of a form sheet, else the sheet itself.
 * Modal + `onSubmit`: body and footer become a `<form>` (Form rule: Enter submits; the primary action is the submit button).
 */
export function BottomSheet({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose, title, type = "modal", size = "flex", search, items = [], selectedId, onSelect, keepOpen = false, children, primaryAction, secondaryAction, actionsDirection = "horizontal", footer: footerContent, onSubmit, dismissible = true, inline = false, closeLabel: closeLabelProp, className }: BottomSheetProps) {
  const [open, onOpenChange] = useOverlayOpen({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose });
  const t = useZenLabels();
  const closeLabel = closeLabelProp ?? t.close;
  const id = useId().replace(/:/g, "");
  const panelRef = useRef<HTMLDivElement>(null);
  const drag =useRef<{ y: number; id: number } | null>(null);
  const [offset, setOffset] = useState(0);
  // Initial focus: `data-autofocus` inside the sheet wins. A form sheet (Modal + onSubmit) or a sheet with a Search slot
  // starts on its first field, the Search first when there is one (as ModalForm starts on its first field), so typing
  // can begin at once. Any other sheet focuses itself (announced by its title), not Close: a pointer-opened sheet shows
  // no stray focus ring and Tab still reaches Close first.
  const startsOnField = (type === "modal" && Boolean(onSubmit)) || Boolean(search);
  const { mounted, phase } = usePresence(open, 200);
  // Inside a device frame (`[data-zen-overlay-root]`: PlatformPhone, an app's device preview) the sheet opens in that
  // frame, as Dialog and Menu do, so it covers that screen only; elsewhere it goes to the page portal. `inline` keeps it
  // in its nearest positioned ancestor.
  const host = useOverlayHost(mounted && !inline);
  useModal(open && (inline || host.ready), panelRef, dismissible, onOpenChange, startsOnField ? modalFieldSelector : "[data-autofocus]");
  if (!mounted || typeof document === "undefined") return null;
  const closing = phase === "closing";

  // Drag the grabber/header down to dismiss (past 96px or a quarter of the sheet).
  const onDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dismissible || (event.target as HTMLElement).closest("button")) return;
    drag.current = { y: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onDragMove = (event: ReactPointerEvent<HTMLDivElement>) => { if (drag.current) setOffset(Math.max(0, event.clientY - drag.current.y)); };
  const onDragEnd = () => {
    if (!drag.current) return;
    drag.current = null;
    const height = panelRef.current?.offsetHeight ?? 400;
    if (offset > Math.min(96, height / 4)) onOpenChange(false);
    setOffset(0);
  };

  const hasActions = type === "modal" && (primaryAction || secondaryAction);
  // Form mode (Modal type + onSubmit), as in ModalForm: the primary submits the <form> instead of closing the sheet.
  const isForm = type === "modal" && Boolean(onSubmit);
  const actionButtons = hasActions ? (
    <div className="zen-bottom-sheet__actions" data-direction={actionsDirection} data-count={primaryAction && secondaryAction ? 2 : 1}>
      {[actionsDirection === "vertical" ? primaryAction : secondaryAction, actionsDirection === "vertical" ? secondaryAction : primaryAction].map((action, index) => {
        if (!action) return null;
        const isPrimary = action === primaryAction;
        const submits = isPrimary && isForm;
        return (
          <Button key={index} appearance="main" level={action.level ?? (isPrimary ? "primary" : "tertiary")} size="lg" disabled={action.disabled} data-autofocus={action.autoFocus ? "" : undefined}
            type={submits ? "submit" : "button"}
            onClick={submits && !action.onClick ? undefined : () => (action.onClick ? action.onClick() : onOpenChange(false))}>{action.label}</Button>
        );
      })}
    </div>
  ) : null;
  const body = (
    <div className="zen-bottom-sheet__body">
      {type === "action" ? (
        <ul className="zen-bottom-sheet__items" role="list">
          {items.map((item) => {
            const selected = item.id === selectedId;
            return (
              <li key={item.id}>
                <button type="button" className="zen-bottom-sheet__item" data-selected={selected ? "true" : undefined} data-destructive={item.destructive ? "true" : undefined} aria-pressed={selectedId !== undefined ? selected : undefined} disabled={item.disabled}
                  onClick={() => { onSelect?.(item); if (!keepOpen) onOpenChange(false); }}>
                  {item.icon ? renderIcon(item.icon) : null}
                  <span className={`zen-bottom-sheet__item-label ${typographyStyles["Body/Base/Medium"]}`}>{item.label}</span>
                  {item.trailing ? <span className="zen-bottom-sheet__item-trailing">{item.trailing}</span> : null}
                  {selected ? <Icon className="zen-bottom-sheet__check" name="icon-check-line" decorative /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : children}
    </div>
  );
  const footerSlot = actionButtons ?? (type === "modal" ? footerContent : null);
  const footer = footerSlot ? <div className="zen-bottom-sheet__footer">{footerSlot}</div> : null;

  const sheet = (
    <div
      ref={panelRef}
      className={["zen-bottom-sheet", className].filter(Boolean).join(" ")}
      data-type={type}
      data-size={size}
      data-state={phase}
      data-dragging={offset ? "true" : undefined}
      inert={closing}
      aria-hidden={closing || undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      style={offset ? { transform: `translateY(${offset}px)` } : undefined}
    >
      <div className="zen-bottom-sheet__top" onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>
        <span className="zen-bottom-sheet__grabber" aria-hidden="true" />
        <div className="zen-bottom-sheet__header">
          <h2 id={`${id}-title`} className={`zen-bottom-sheet__title ${typographyStyles["Heading/3"]}`}>{title}</h2>
          <div className="zen-bottom-sheet__close"><TopNavigationActionButton action={{ icon: "icon-x-medium-line", label: closeLabel, onClick: () => onOpenChange(false) }} variant="default" /></div>
        </div>
      </div>
      {search ? <div className="zen-bottom-sheet__search">{search}</div> : null}
      {isForm && onSubmit ? (
        <form className="zen-bottom-sheet__form" onSubmit={(event) => { event.preventDefault(); onSubmit(event); }}>{body}{footer}</form>
      ) : <>{body}{footer}</>}
    </div>
  );
  const overlay = (
    <div className="zen-bottom-sheet-overlay" data-state={phase} data-inline={inline || host.contained ? "true" : undefined} onPointerDown={(event) => { if (!closing && dismissible && event.target === event.currentTarget) onOpenChange(false); }}>{sheet}</div>
  );
  return inline ? overlay : <>{host.anchor}{host.ready ? host.place(overlay) : null}</>;
}
