import { useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactElement, type ReactNode } from "react";
import { usePresence } from "../Motion";
import { ZenPortal } from "../Portal";
import { Button } from "../Button";
import { type DialogAction } from "../Dialog";
import { useModal } from "../Dialog/Dialog";
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
  /** Figma Search slot (a Search, under the header). */
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
  /** Scrim tap, Escape and drag-down dismiss (default true). */
  dismissible?: boolean;
  /** Render inside the nearest positioned ancestor instead of the viewport (device previews, embedded demos). */
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
 */
export function BottomSheet({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose, title, type = "modal", size = "flex", search, items = [], selectedId, onSelect, keepOpen = false, children, primaryAction, secondaryAction, actionsDirection = "horizontal", dismissible = true, inline = false, closeLabel: closeLabelProp, className }: BottomSheetProps) {
  const [open, onOpenChange] = useOverlayOpen({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose });
  const t = useZenLabels();
  const closeLabel = closeLabelProp ?? t.close;
  const id = useId().replace(/:/g, "");
  const panelRef = useRef<HTMLDivElement>(null);
  const drag =useRef<{ y: number; id: number } | null>(null);
  const [offset, setOffset] = useState(0);
  // Initial focus lands on the sheet itself (announced by its title), not on Close: a pointer-opened sheet shows no
  // stray focus ring and Tab still reaches Close first. `data-autofocus` inside the content overrides it.
  useModal(open, panelRef, dismissible, onOpenChange, "[data-autofocus]");
  const { mounted, phase } = usePresence(open, 200);
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
  const actionButtons = hasActions ? (
    <div className="zen-bottom-sheet__actions" data-direction={actionsDirection} data-count={primaryAction && secondaryAction ? 2 : 1}>
      {[actionsDirection === "vertical" ? primaryAction : secondaryAction, actionsDirection === "vertical" ? secondaryAction : primaryAction].map((action, index) => {
        if (!action) return null;
        const isPrimary = action === primaryAction;
        return (
          <Button key={index} appearance="main" level={action.level ?? (isPrimary ? "primary" : "tertiary")} size="lg" disabled={action.disabled} data-autofocus={action.autoFocus ? "" : undefined}
            onClick={() => (action.onClick ? action.onClick() : onOpenChange(false))}>{action.label}</Button>
        );
      })}
    </div>
  ) : null;

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
      {actionButtons ? <div className="zen-bottom-sheet__footer">{actionButtons}</div> : null}
    </div>
  );
  const overlay = (
    <div className="zen-bottom-sheet-overlay" data-state={phase} data-inline={inline ? "true" : undefined} onPointerDown={(event) => { if (!closing && dismissible && event.target === event.currentTarget) onOpenChange(false); }}>{sheet}</div>
  );
  return inline ? overlay : <ZenPortal>{overlay}</ZenPortal>;
}
