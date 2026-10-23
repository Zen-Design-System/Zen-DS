import { useContext, useEffect, useId, useRef, type ReactElement, type ReactNode, type Ref } from "react";
import { usePresence } from "../Motion";
import { IconButton } from "../Button";
import { ModalActions, type DialogAction } from "../Dialog";
import { modalIsOpen, openPopupTrigger, useModal, useOverlayHost } from "../Dialog/Dialog";
import { Icon, type IconName } from "../Icon";
import { renderIcon } from "../_shared/icon";
import { InlineOverlayContext, useOverlayOpen, type OverlayOpenProps } from "../_shared/overlay";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./side-panel.css";
import "../Icon/core";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useMergedRefs } from "../_shared/merge-refs";
import { dataAttributes } from "../_shared/data-attributes";

export type SidePanelType = "standard" | "modal";
export type SidePanelSize = "default" | "small";

export interface SidePanelProps extends OverlayOpenProps {
  /** Figma Header Heading (Heading/3). */
  title: ReactNode;
  /** Heading level of the title: 2 (default, an h2), or 1 / 3 to fit the page outline. Only the tag changes, not the text style. */
  headingLevel?: 1 | 2 | 3;
  /** Figma Caption (Body/Base/Regular, Neutral/Base). */
  description?: ReactNode;
  /** Figma Header-Contents slot: more header content under the caption (a status row, tabs, a search field), gap XSmall. */
  headerContent?: ReactNode;
  /** Figma Top-Customize slot, rendered above the header (e.g. a Stepper, a banner or a cover). */
  top?: ReactNode;
  /** Figma Back-Container: a back button (Button/Icon-Flat Small, icon-arrow-narrow-left-line) before the title, for a
   *  panel that drilled into a detail. Called on click; without it there is no back button. */
  onBack?: () => void;
  /** Accessible name of the back button. Default: the locale's “Back”. */
  backLabel?: string;
  /** Figma Type: Standard (docked beside the page, non-modal) · Modal (floating over a scrim, traps focus). */
  type?: SidePanelType;
  /** Figma Size: Default 440 · Small 360. */
  size?: SidePanelSize;
  /** @deprecated Figma's Side-Panel no longer draws a heading icon (removed on 2026-10-12). Modal only: a 44px icon above
   *  the title, still drawn for now; put an icon in `top` or `headerContent` instead. */
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
  /** Figma instance overrides: props of the back and close buttons and action Buttons it draws, by layer (`{ "Actions/Primary": { level: "accent" }, Close: { level: "secondary" } }`). Written by Zen Studio;
   *  app code sets onBack / the actions. */
  overrides?: NestedOverrides;
  /** Ref to the panel `<aside>` element; set while the panel is open. */
  ref?: Ref<HTMLElement>;
}

/**
 * Figma Side-Panel (1573:3128). Standard: a full-height Surface column with a 1px Border/Neutral/Pale left edge, rendered
 * in place (the page layout docks it); Escape closes it (from the panel or the page beside it, within its AppShell when
 * it docks in one) and focus returns to the
 * opener. Modal: a floating Background/Container panel (Corner-Radius/XLarge, Container
 * border, Effect/Container) 8px from the viewport edge over the scrim; focus is trapped and returns to the opener.
 * Sections, each Modal-Padding on every side: Top-Customize (optional) · Header (Header-Contents, gap XSmall: the row
 * back · title (Standard Heading/3, Modal Heading/4) · close, gap Medium; caption; more header content) · Contents
 * (gap Medium, scrolls) · Modal/Actions footer.
 */
export function SidePanel({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose, title, headingLevel = 2, description, headerContent, top, onBack, backLabel: backLabelProp, type = "standard", size = "default", icon, children, primaryAction, secondaryAction, dismissible = true, closeLabel: closeLabelProp, className, overrides, ref, ...rest }: SidePanelProps) {
  const nest = useNested(overrides);
  const [open, onOpenChange] = useOverlayOpen({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose });
  const t = useZenLabels();
  const closeLabel = closeLabelProp ?? t.closePanel;
  const backLabel = backLabelProp ?? t.back;
  const id = useId().replace(/:/g, "");
  const panelRef = useRef<HTMLElement>(null);
  const mergedPanelRef = useMergedRefs(panelRef, ref);
  const modal = type === "modal";
  const inline = useContext(InlineOverlayContext);
  // Stay mounted while the exit animation plays; focus return / scroll unlock already run when `open` goes false.
  const { mounted, phase } = usePresence(open, modal ? 200 : 120);
  // Modal: inside a device frame or a Studio frame (`[data-zen-overlay-root]`) it opens in that frame, as Dialog does;
  // elsewhere in the page's ZenPortal.
  const host = useOverlayHost(mounted && modal && !inline);
  // Modal: the shared Dialog/ModalForm focus trap (autofocus, Tab trap, Escape, scroll lock, focus return), once it is
  // placed.
  useModal(open && modal && (inline || host.ready), panelRef, dismissible, onOpenChange, "[data-autofocus], .zen-side-panel__close", { isolate: !inline, container: host.container });
  // Standard (non-modal): Escape closes the docked panel from inside it and from the page beside it (the row that opened
  // it), unless an inner popup or a modal owns the key or the press was in a text field on the page. Closing returns focus
  // to the opener when focus was in the panel (or fell to the body as it closed). Listeners on window, as useModal's, so
  // document-level popup handlers have their turn first.
  const openerRef = useRef<Element | null>(null);
  const closable = !modal && Boolean(onOpenChangeProp || onClose);
  useEffect(() => {
    if (!open || !closable) return undefined;
    openerRef.current = document.activeElement;
    let popupEscape: Event | null = null;
    const onKeyCapture = (event: KeyboardEvent) => { popupEscape = event.key === "Escape" && event.target instanceof Element && event.target.matches(openPopupTrigger) ? event : null; };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event === popupEscape || modalIsOpen()) return;
      const target = event.target instanceof Element ? event.target : null;
      const inside = Boolean(target && panelRef.current?.contains(target));
      // "The page beside it" is the app the panel docks in: docked in an AppShell, a press outside that shell (another
      // app on the same page, a docs page's other examples) is not its business.
      const shell = panelRef.current?.closest(".zen-app-shell");
      if (!inside && shell && target && !shell.contains(target)) return;
      if (!inside && target?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyCapture, true);
    window.addEventListener("keydown", onKey);
    const panel = panelRef.current;
    return () => {
      window.removeEventListener("keydown", onKeyCapture, true);
      window.removeEventListener("keydown", onKey);
      const active = document.activeElement;
      const opener = openerRef.current;
      if (opener instanceof HTMLElement && opener.isConnected && (!active || active === document.body || panel?.contains(active))) opener.focus();
    };
  }, [open, closable, onOpenChange]);
  if (!mounted) return null;
  const closing = phase === "closing";
  const Title = `h${headingLevel}` as const;
  const panel = (
    <aside
      {...dataAttributes(rest)} ref={mergedPanelRef}
      data-state={phase}
      inert={closing}
      aria-hidden={closing || undefined}
      className={["zen-side-panel", className].filter(Boolean).join(" ")}
      data-type={type}
      data-closable={closable || undefined}
      data-size={size}
      role={modal ? "dialog" : "complementary"}
      aria-modal={modal || undefined}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-desc` : undefined}
      tabIndex={modal ? -1 : undefined}
    >
      {top ? <div className="zen-side-panel__top">{nest.slot(top)}</div> : null}
      <header className="zen-side-panel__header">
        {modal && icon ? <span className="zen-side-panel__icon" aria-hidden="true">{nest("Icon", renderIcon(icon))}</span> : null}
        {/* Figma Header row: the 32px Small Icon-Flat buttons sit in 20px Wrappers and overhang them by 6px (Standard
            close), or in 28px Back- / Close-Containers (padding 2XSmall) and overhang by 2px (back; Modal close). */}
        <div className="zen-side-panel__heading">
          {onBack ? nest("Back", <IconButton className="zen-side-panel__back" appearance="flat" level="primary" size="sm" aria-label={backLabel} onClick={onBack} icon={<Icon name="icon-arrow-narrow-left-line" />} />) : null}
          <Title id={`${id}-title`} className={`zen-side-panel__title ${typographyStyles[modal ? "Heading/4" : "Heading/3"]}`}>{title}</Title>
          {nest("Close", <IconButton className="zen-side-panel__close" appearance="flat" level="primary" size="sm" aria-label={closeLabel} onClick={() => onOpenChange(false)} icon={<Icon name="icon-x-small-line" />} />)}
        </div>
        {description ? <p id={`${id}-desc`} className={`zen-side-panel__description ${typographyStyles["Body/Base/Regular"]}`}>{description}</p> : null}
        {headerContent ? <div className="zen-side-panel__header-content">{nest.slot(headerContent)}</div> : null}
      </header>
      {children ? <div className="zen-side-panel__body">{nest.slot(children)}</div> : null}
      {primaryAction || secondaryAction ? nest("Actions", <ModalActions className="zen-side-panel__actions" primaryAction={primaryAction} secondaryAction={secondaryAction} onDefault={() => onOpenChange(false)} />) : null}
    </aside>
  );
  if (!modal) return panel;
  if (typeof document === "undefined") return null;
  const overlay = <div className="zen-side-panel-overlay" data-state={phase} data-contained={host.contained ? "true" : undefined} onPointerDown={(event) => { if (!closing && dismissible && event.target === event.currentTarget) onOpenChange(false); }}>{panel}</div>;
  if (inline) return overlay;
  return <>{host.anchor}{host.ready ? host.place(overlay) : null}</>;
}
