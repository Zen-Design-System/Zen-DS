import { useCallback, useEffect, useId, useRef, useState, type HTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { IconButton } from "../Button";
import { Icon } from "../Icon";
import { ZenPortal } from "../Portal";
import { VisuallyHidden } from "../VisuallyHidden";
import { useZen, useZenLabels } from "../_shared/zen-context";
import "../Motion/motion.css";
import "./app-shell.css";
import "../Icon/core";

export interface AppShellProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Left navigation, usually <Sidebar>. Below 1024px it moves into a drawer opened from the header's menu button. */
  sidebar?: ReactNode;
  /** Top bar content on the left (it grows): search, breadcrumbs. On small screens the drawer's menu button comes first. */
  header?: ReactNode;
  /** Top bar actions on the right: notifications, help, the account menu. */
  headerActions?: ReactNode;
  /** A sticky bar at the bottom of the main column, e.g. BottomNavigation on phones. */
  footer?: ReactNode;
  /** Page background layer: default Canvas, alt (a white page) or flat (pair it with Sidebar background="flat"). */
  canvas?: "default" | "alt" | "flat";
  /** Drawer state when controlled (small screens). */
  navOpen?: boolean;
  defaultNavOpen?: boolean;
  onNavOpenChange?: (open: boolean) => void;
  /** Accessible name of the navigation drawer and its menu button's target. Default: the locale's “Navigation”. */
  navLabel?: string;
  /** id of <main>, the target of the "Skip to content" link. Default: a generated unique id. */
  mainId?: string;
  /** Force the layout; by default it follows ZenProvider's breakpoint (tablet and mobile use the drawer). */
  layout?: "auto" | "sidebar" | "drawer";
  /** The page. */
  children?: ReactNode;
}

function useCompactLayout(layout: AppShellProps["layout"]): boolean {
  const breakpoint = useZen()?.breakpoint;
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(max-width: 1023.98px)").matches : false);
  useEffect(() => {
    if (breakpoint || typeof window === "undefined" || !window.matchMedia) return undefined;
    const list = window.matchMedia("(max-width: 1023.98px)");
    const update = () => setNarrow(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [breakpoint]);
  if (layout === "sidebar") return false;
  if (layout === "drawer") return true;
  return breakpoint ? breakpoint !== "desktop" : narrow;
}

/**
 * The frame of a web app: navigation, a sticky top bar and the main content, with a skip link. From 1024px the
 * Sidebar sits beside the content; below, it becomes a drawer (scrim, Escape and choosing a page close it).
 *
 *   <AppShell sidebar={<Sidebar … />} header={<Search … />}>
 *     <Container><PageHeader title="Team members" /> …</Container>
 *   </AppShell>
 */
export function AppShell({
  sidebar,
  header,
  headerActions,
  footer,
  canvas = "default",
  navOpen: controlledOpen,
  defaultNavOpen = false,
  onNavOpenChange,
  navLabel: navLabelProp,
  mainId: requestedMainId,
  layout = "auto",
  className,
  children,
  ...rest
}: AppShellProps) {
  const t = useZenLabels();
  const navLabel = navLabelProp ?? t.navigation;
  const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const mainId = requestedMainId ?? `zen-main-${generatedId}`;
  const compact = useCompactLayout(layout);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultNavOpen);
  const open = compact && (controlledOpen ?? uncontrolledOpen);
  const menuRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const setOpen = useCallback((next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onNavOpenChange?.(next);
    if (!next) requestAnimationFrame(() => menuRef.current?.focus());
  }, [controlledOpen, onNavOpenChange]);

  // Opening moves focus into the drawer; the page behind stays still.
  useEffect(() => {
    if (!open) return undefined;
    const first = drawerRef.current?.querySelector<HTMLElement>("a[href], button:not([disabled]), input, [tabindex]:not([tabindex='-1'])");
    first?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  const onDrawerKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.stopPropagation(); setOpen(false); return; }
    // aria-modal: Tab and Shift+Tab wrap inside the drawer (real Tab stops only, as in the shared useModal).
    if (event.key !== "Tab" || !drawerRef.current) return;
    const stops = Array.from(drawerRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]"))
      .filter((node) => node.tabIndex >= 0 && !node.closest("[inert], [hidden]") && node.getClientRects().length > 0);
    const first = stops[0], last = stops[stops.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  // Choosing a page (a link or a nav item without children) closes the drawer.
  const onDrawerClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest("a[href], .zen-sidebar__item");
    if (target && target.getAttribute("aria-expanded") === null) setOpen(false);
  };

  return (
    <div {...rest} className={["zen-app-shell", className].filter(Boolean).join(" ")} data-canvas={canvas} data-layout={compact ? "drawer" : "sidebar"}>
      <VisuallyHidden as="a" href={`#${mainId}`} focusable>{t.skipToContent}</VisuallyHidden>
      {sidebar && !compact ? <div className="zen-app-shell__sidebar">{sidebar}</div> : null}
      <div className="zen-app-shell__column">
        {header || headerActions || (sidebar && compact) ? (
          <header className="zen-app-shell__header">
            {sidebar && compact ? (
              // zen-allow-filter-button: this button opens the navigation drawer (a dialog), not a choice list.
              <IconButton ref={menuRef} level="tertiary" size="md" aria-label={t.openNavigation} aria-expanded={open} aria-haspopup="dialog" icon={<Icon name="icon-menu-01-line" />} onClick={() => setOpen(true)} />
            ) : null}
            <div className="zen-app-shell__header-content">{header}</div>
            {headerActions ? <div className="zen-app-shell__header-actions">{headerActions}</div> : null}
          </header>
        ) : null}
        <main id={mainId} className="zen-app-shell__main" tabIndex={-1}>{children}</main>
        {footer ? <div className="zen-app-shell__footer">{footer}</div> : null}
      </div>
      {sidebar && open ? (
        <ZenPortal>
          <div className="zen-app-shell__overlay">
            <div className="zen-app-shell__scrim" aria-hidden="true" onPointerDown={() => setOpen(false)} />
            <div ref={drawerRef} className="zen-app-shell__drawer" role="dialog" aria-modal="true" aria-label={navLabel} onKeyDown={onDrawerKeyDown} onClick={onDrawerClick}>
              {sidebar}
            </div>
          </div>
        </ZenPortal>
      ) : null}
    </div>
  );
}
