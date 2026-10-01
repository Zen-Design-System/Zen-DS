import { useEffect, useId, useRef, type ReactElement, type ReactNode } from "react";
import { usePresence } from "../Motion";
import { ZenPortal } from "../Portal";
import { IconButton } from "../Button";
import { ModalActions, type DialogAction } from "../Dialog";
import { useModal } from "../Dialog/Dialog";
import { Icon, type IconName } from "../Icon";
import { renderIcon } from "../_shared/icon";
import { useOverlayOpen, type OverlayOpenProps } from "../_shared/overlay";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./side-panel.css";
import "../Icon/core";

export type SidePanelType = "standard" | "modal";
export type SidePanelSize = "default" | "small";

export interface SidePanelProps extends OverlayOpenProps {
  /** Figma Header Heading (Heading/3). */
  title: ReactNode;
  /** Heading level of the title: 2 (default, an h2), or 1 / 3 to fit the page outline. Only the tag changes, not the text style. */
  headingLevel?: 1 | 2 | 3;
  /** Figma Caption (Body/Base/Regular, Neutral/Base). */
  description?: ReactNode;
  /** Figma Type: Standard (docked beside the page, non-modal) · Modal (floating over a scrim, traps focus). */
  type?: SidePanelType;
  /** Figma Size: Default 440 · Small 360. */
  size?: SidePanelSize;
  /** Modal only: the 44px heading icon, an icon name (Figma shows icon-info-circle-solid) or an element. */
  icon?: IconName | ReactElement;
  /** Figma Contents slot. */
  children?: ReactNode;
  primaryAction?: DialogAction;
  secondaryAction?: DialogAction;
  /** Escape / scrim click close a modal panel (default true). */
  dismissible?: boolean;
  /** Accessible name of the close button. Default: the locale's “Close panel”. */
  closeLabel?: string;
  className?: string;
}

/**
 * Figma Side-Panel (1573:3128). Standard: a full-height Surface column with a 1px Border/Neutral/Pale left edge, rendered
 * in place (the page layout docks it). Modal: a floating Background/Container panel (Corner-Radius/XLarge, Container
 * border, Effect/Container) 8px from the viewport edge over the scrim; focus is trapped and returns to the opener.
 * Header (Modal-Padding, gap Medium): title (Standard Heading/3, Modal Heading/4 under the 44px icon) · caption; the close
 * button is pinned to the header's top-right corner; Contents; Modal/Actions footer.
 */
export function SidePanel({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose, title, headingLevel = 2, description, type = "standard", size = "default", icon, children, primaryAction, secondaryAction, dismissible = true, closeLabel: closeLabelProp, className }: SidePanelProps) {
  const [open, onOpenChange] = useOverlayOpen({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose });
  const t = useZenLabels();
  const closeLabel = closeLabelProp ?? t.closePanel;
  const id = useId().replace(/:/g, "");
  const panelRef = useRef<HTMLElement>(null);
  const modal = type === "modal";
  // Modal: the shared Dialog/ModalForm focus trap (autofocus, Tab trap, Escape, scroll lock, focus return).
  useModal(open && modal, panelRef, dismissible, onOpenChange, "[data-autofocus], .zen-side-panel__close");
  // Standard (non-modal): Escape closes only while focus is inside the panel.
  useEffect(() => {
    if (!open || modal) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && panelRef.current?.contains(document.activeElement)) { event.preventDefault(); onOpenChange(false); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, modal, onOpenChange]);
  // Stay mounted while the exit animation plays; focus return / scroll unlock already ran when `open` went false.
  const { mounted, phase } = usePresence(open, modal ? 200 : 120);
  if (!mounted) return null;
  const closing = phase === "closing";
  const Title = `h${headingLevel}` as const;
  const panel = (
    <aside
      ref={panelRef}
      data-state={phase}
      inert={closing}
      aria-hidden={closing || undefined}
      className={["zen-side-panel", className].filter(Boolean).join(" ")}
      data-type={type}
      data-size={size}
      role={modal ? "dialog" : "complementary"}
      aria-modal={modal || undefined}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-desc` : undefined}
      tabIndex={modal ? -1 : undefined}
    >
      <header className="zen-side-panel__header">
        {modal && icon ? <span className="zen-side-panel__icon" aria-hidden="true">{renderIcon(icon)}</span> : null}
        <div className="zen-side-panel__heading">
          <Title id={`${id}-title`} className={`zen-side-panel__title ${typographyStyles[modal ? "Heading/4" : "Heading/3"]}`}>{title}</Title>
        </div>
        {description ? <p id={`${id}-desc`} className={`zen-side-panel__description ${typographyStyles["Body/Base/Regular"]}`}>{description}</p> : null}
      </header>
      {children ? <div className="zen-side-panel__body">{children}</div> : null}
      {/* Figma: a 20px Wrapper at the header's top-right corner holds the 32px Small Icon-Flat, so the button
          overhangs it by 6px. Standard: Wrapper at Modal-Padding; Modal: inside a 28px Close-Container (padding 4)
          on the icon row. */}
      <IconButton className="zen-side-panel__close" appearance="flat" level="primary" size="sm" aria-label={closeLabel} onClick={() => onOpenChange(false)} icon={<Icon name="icon-x-small-line" />} />
      {primaryAction || secondaryAction ? <ModalActions className="zen-side-panel__actions" primaryAction={primaryAction} secondaryAction={secondaryAction} onDefault={() => onOpenChange(false)} /> : null}
    </aside>
  );
  if (!modal) return panel;
  if (typeof document === "undefined") return null;
  return (
    <ZenPortal><div className="zen-side-panel-overlay" data-state={phase} onPointerDown={(event) => { if (!closing && dismissible && event.target === event.currentTarget) onOpenChange(false); }}>{panel}</div></ZenPortal>
  );
}
