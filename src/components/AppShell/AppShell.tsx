import { cloneElement, createContext, forwardRef, isValidElement, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type FocusEvent, type HTMLAttributes, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { Avatar, type AvatarTheme } from "../Avatar";
import { IconButton } from "../Button";
import { useModal } from "../Dialog/Dialog";
import { Icon, type IconName } from "../Icon";
import { usePresence } from "../Motion/usePresence";
import { SidePanel, type SidePanelProps } from "../SidePanel";
import { Sidebar, type SidebarProps } from "../Sidebar";
import { useIconTooltip } from "../Tooltip";
import { VisuallyHidden } from "../VisuallyHidden";
import { useZen, useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "../Motion/motion.css";
import "./app-shell.css";
import "../Icon/core";

export type AppShellLayout = "sidebar" | "drawer";

export interface AppShellContextValue {
  /** `sidebar`: the Sidebar sits beside the content (the shell is 1024px or wider) · `drawer`: it opens over the page. */
  layout: AppShellLayout;
  /** Whether the Sidebar is collapsed to its icon rail (sidebar layout). */
  sidebarCollapsed: boolean;
  /** Collapses the Sidebar to its rail or expands it again (sidebar layout). */
  setSidebarCollapsed: (collapsed: boolean) => void;
  /** Collapses an expanded Sidebar, expands a collapsed one. */
  toggleSidebar: () => void;
  /** Whether the navigation drawer is open (drawer layout). */
  navOpen: boolean;
  /** Opens the navigation drawer (drawer layout). */
  openNav: () => void;
  /** Closes the navigation drawer; focus returns to the menu button. */
  closeNav: () => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

/**
 * The nearest AppShell's layout and navigation state, or null outside one. For a navigation of your own: read
 * `sidebarCollapsed` to draw its rail, or call `closeNav()` after a route change the drawer did not see.
 */
export function useAppShell(): AppShellContextValue | null {
  return useContext(AppShellContext);
}

export interface AppShellProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Left navigation, usually <Sidebar>. When the shell is 1024px or wider it sits beside the content, expanded or
   * collapsed to its rail; narrower, it opens as a modal drawer from the top bar's menu button.
   */
  sidebar?: ReactNode;
  /** Top bar content after the toggle (it grows): Breadcrumbs (Figma HR-Platform) or a Search. */
  header?: ReactNode;
  /**
   * Top bar actions on the right, in this order: a plan Badge, AppShellAction buttons (notifications, settings, help),
   * then the account menu (`<Menu trigger={<AppShellAccount … />}>`). Page actions belong in the PageHeader.
   */
  headerActions?: ReactNode;
  /** A full-width message strip above the whole shell, usually <AlertBanner> (trial ending, maintenance, offline). It stays in view while the page scrolls. */
  banner?: ReactNode;
  /**
   * A right panel docked beside the content (Figma Side-Panel), usually <SidePanel type="standard">. It docks while the
   * page keeps at least a Tablet width (744px) beside it; otherwise a SidePanel opens as the modal panel and other
   * content stacks under the page.
   */
  aside?: ReactNode;
  /** One floating button in the bottom-right corner of the page (Figma Floating-Item), e.g. an assistant IconButton. The end of the page keeps room for it. */
  floatingAction?: ReactNode;
  /** A sticky bar at the bottom of the main column, e.g. an ActionBar. */
  footer?: ReactNode;
  /** Page background layer: default Canvas, alt (a white page) or flat (pair it with Sidebar background="flat"). */
  canvas?: "default" | "alt" | "flat";
  /** Sidebar rail state when controlled; pair it with `onSidebarCollapsedChange`. */
  sidebarCollapsed?: boolean;
  /** Initial rail state when uncontrolled. Default: the Sidebar's own `collapsed`, else expanded. */
  defaultSidebarCollapsed?: boolean;
  /** Called when the toggle (or `useAppShell().setSidebarCollapsed`) collapses or expands the Sidebar. Store it (e.g. localStorage) to keep the choice between visits. */
  onSidebarCollapsedChange?: (collapsed: boolean) => void;
  /**
   * The collapse toggle at the start of the top bar (Figma HR-Platform: icon-layout-left before the Breadcrumbs).
   * Default true: shown when the shell has a top bar (`header` or `headerActions`) and a Sidebar that can collapse.
   * A Sidebar with its own `onCollapsedChange` keeps its header control instead.
   */
  sidebarToggle?: boolean;
  /** Drawer state when controlled (narrow shells). */
  navOpen?: boolean;
  defaultNavOpen?: boolean;
  onNavOpenChange?: (open: boolean) => void;
  /** Accessible name of the navigation drawer. Default: the locale's “Navigation”. */
  navLabel?: string;
  /** id of <main>, the target of the "Skip to content" link. Default: a generated unique id. */
  mainId?: string;
  /** Force the layout. By default (`auto`) the shell's own width decides: narrower than 1024px uses the drawer. Force it only for previews and tests. */
  layout?: "auto" | "sidebar" | "drawer";
  /** The page. */
  children?: ReactNode;
}

/** Below this width the Sidebar leaves the page for a drawer (the Tablet and Mobile breakpoints). */
const SIDEBAR_MIN_SHELL_WIDTH = 1024;
/** The Tablet breakpoint: the least room the page keeps beside a docked side panel. */
const TABLET_MIN_WIDTH = 744;
/** Figma Side-Panel Size=Default, assumed until the docked panel has been measured once. */
const SIDE_PANEL_DEFAULT_WIDTH = 440;
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** An element's border-box size on one axis, kept current by a ResizeObserver: 0 without the element; a hidden element keeps the last size. */
function useElementSize(element: HTMLElement | null, axis: "width" | "height"): number {
  const [size, setSize] = useState(0);
  useIsomorphicLayoutEffect(() => {
    if (!element) { setSize(0); return undefined; }
    const read = () => { const rect = element.getBoundingClientRect(); const value = Math.round(axis === "width" ? rect.width : rect.height); if (value > 0) setSize(value); };
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(read);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, axis]);
  return size;
}

/** Before the shell has been measured (server render): the provider's breakpoint, then the viewport. */
function useGuessedDesktop(): boolean {
  const breakpoint = useZen()?.breakpoint;
  if (breakpoint) return breakpoint === "desktop";
  return !(typeof window !== "undefined" && window.matchMedia?.("(max-width: 1023.98px)").matches);
}

/**
 * Whether the top bar's content (Breadcrumbs, a Search) does not fit on one row beside the toggle and the actions.
 * The content is measured at its own one-line width, so the answer does not depend on the current layout. Then the
 * content takes a row of its own.
 */
function useStackedHeader(header: HTMLElement | null, content: HTMLElement | null, toggle: HTMLElement | null, actions: HTMLElement | null): boolean {
  const [stacked, setStacked] = useState(false);
  const measure = useCallback(() => {
    if (!header || !content) { setStacked(false); return; }
    const style = getComputedStyle(header);
    const room = header.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    if (room <= 0) return;
    const leadingGap = content.parentElement ? parseFloat(getComputedStyle(content.parentElement).columnGap) || 0 : 0;
    const toggleWidth = toggle?.getBoundingClientRect().width ?? 0;
    const actionsWidth = actions?.getBoundingClientRect().width ?? 0;
    // The content's one-line width: measured at max-content for a moment (no paint happens in between).
    const { flex, width } = content.style;
    content.style.flex = "none"; content.style.width = "max-content";
    const natural = content.getBoundingClientRect().width;
    content.style.flex = flex; content.style.width = width;
    const needed = natural + (toggleWidth ? toggleWidth + leadingGap : 0) + (actionsWidth ? actionsWidth + (parseFloat(style.columnGap) || 0) : 0);
    setStacked(needed > room + 0.5);
  }, [header, content, toggle, actions]);
  // After every render (the Breadcrumbs change with the page) and whenever the top bar resizes.
  useIsomorphicLayoutEffect(measure);
  useIsomorphicLayoutEffect(() => {
    if (!header || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => measure());
    observer.observe(header);
    return () => observer.disconnect();
  }, [header, measure]);
  return stacked;
}

/** A choice in the drawer that navigates: a link, a Sidebar row or a Sidebar footer row (not a group, a menu trigger, a section title or the workspace rail). */
const NAVIGATION_TARGET = "a[href], button.zen-sidebar__item, .zen-sidebar__footer-content > button";

/**
 * The frame of a web app (Figma ◇ Master-Layout Patterns/Pages/Density-Medium 4122:41886, as used by ◆ HR-Platform):
 * Sidebar navigation, a sticky top bar (Header/Dashboard Type=Navigation 4122:33400), the page, and optional banner,
 * docked side panel and floating action, with a "Skip to content" link. From 1024px the Sidebar sits beside the page
 * and the toggle at the start of the top bar collapses it to its rail; narrower, it opens as a modal drawer.
 *
 * Top bar: Margin-Comfortable top and sides, Spacing/Padding/XSmall bottom, a Button/Size/Medium row; toggle → content
 * Spacing/Gap/XSmall, leading → trailing Spacing/Gap/Medium, trailing actions Spacing/Gap/Small.
 *
 *   <AppShell sidebar={<Sidebar … />} header={<Breadcrumbs … />} headerActions={<AppShellAction … />}>
 *     <Container><PageHeader title="Team members" /> …</Container>
 *   </AppShell>
 */
export function AppShell({
  sidebar,
  header,
  headerActions,
  banner,
  aside,
  floatingAction,
  footer,
  canvas = "default",
  sidebarCollapsed: collapsedProp,
  defaultSidebarCollapsed,
  onSidebarCollapsedChange,
  sidebarToggle = true,
  navOpen: navOpenProp,
  defaultNavOpen = false,
  onNavOpenChange,
  navLabel: navLabelProp,
  mainId: requestedMainId,
  layout: layoutProp = "auto",
  className,
  style,
  children,
  ...rest
}: AppShellProps) {
  const t = useZenLabels();
  const navLabel = navLabelProp ?? t.navigation;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const mainId = requestedMainId ?? `zen-main-${uid}`;
  const sidebarId = `zen-sidebar-${uid}`;
  const mainRef = useRef<HTMLElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  // Measured parts (state refs, so a part that mounts later is measured too).
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
  const [bannerEl, setBannerEl] = useState<HTMLDivElement | null>(null);
  const [sidebarEl, setSidebarEl] = useState<HTMLDivElement | null>(null);
  const [asideEl, setAsideEl] = useState<HTMLDivElement | null>(null);
  const [floatingEl, setFloatingEl] = useState<HTMLDivElement | null>(null);
  const [headerEl, setHeaderEl] = useState<HTMLElement | null>(null);
  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);
  const [toggleEl, setToggleEl] = useState<HTMLSpanElement | null>(null);
  const [actionsEl, setActionsEl] = useState<HTMLDivElement | null>(null);
  const shellWidth = useElementSize(rootEl, "width");
  const guessedDesktop = useGuessedDesktop();
  // `auto` follows the shell's own width: narrower than 1024px uses the drawer.
  const layout: AppShellLayout = layoutProp === "sidebar" || layoutProp === "drawer" ? layoutProp : (shellWidth ? shellWidth >= SIDEBAR_MIN_SHELL_WIDTH : guessedDesktop) ? "sidebar" : "drawer";
  const compact = layout === "drawer";
  const bannerHeight = useElementSize(banner ? bannerEl : null, "height");
  const floatingHeight = useElementSize(floatingAction ? floatingEl : null, "height");
  const sidebarWidth = useElementSize(sidebar && !compact ? sidebarEl : null, "width");

  // Sidebar rail. A Zen Sidebar gets `collapsed` from the shell; one with its own onCollapsedChange keeps its header control.
  const sidebarElement = isValidElement<SidebarProps>(sidebar) && sidebar.type === Sidebar ? sidebar : null;
  const ownCollapse = sidebarElement?.props.onCollapsedChange;
  const canCollapse = sidebarElement
    ? sidebarElement.props.variant !== "workspace"
    : Boolean(sidebar) && (collapsedProp !== undefined || defaultSidebarCollapsed !== undefined || onSidebarCollapsedChange !== undefined);
  const [innerCollapsed, setInnerCollapsed] = useState(() => defaultSidebarCollapsed ?? Boolean(sidebarElement?.props.collapsed));
  const sidebarCollapsed = ownCollapse ? Boolean(sidebarElement?.props.collapsed) : Boolean(collapsedProp ?? innerCollapsed);
  const collapseHandlers = useRef({ ownCollapse, controlled: collapsedProp !== undefined, onSidebarCollapsedChange });
  collapseHandlers.current = { ownCollapse, controlled: collapsedProp !== undefined, onSidebarCollapsedChange };
  const setSidebarCollapsed = useCallback((next: boolean) => {
    const handlers = collapseHandlers.current;
    if (handlers.ownCollapse) { handlers.ownCollapse(next); return; }
    if (!handlers.controlled) setInnerCollapsed(next);
    handlers.onSidebarCollapsedChange?.(next);
  }, []);

  // Drawer. One stable setter: the shared focus trap re-runs whenever its handler changes identity.
  const [innerOpen, setInnerOpen] = useState(defaultNavOpen);
  const open = compact && Boolean(sidebar) && Boolean(navOpenProp ?? innerOpen);
  const openHandlers = useRef({ controlled: navOpenProp !== undefined, onNavOpenChange });
  openHandlers.current = { controlled: navOpenProp !== undefined, onNavOpenChange };
  const setNavOpen = useCallback((next: boolean) => {
    if (!openHandlers.current.controlled) setInnerOpen(next);
    openHandlers.current.onNavOpenChange?.(next);
  }, []);
  const closeFromModal = useCallback((next: boolean) => { if (!next) setNavOpen(false); }, [setNavOpen]);
  const presence = usePresence(open, 200);
  // Modal: focus the current page's row (else the drawer), trap Tab, Escape closes, the page stops scrolling, and
  // focus returns to the menu button.
  useModal(open, drawerRef, true, closeFromModal, '[aria-current="page"]');
  // Choosing a page closes the drawer and moves focus to the new content, not back to the menu button.
  const focusMainAfterClose = useRef(false);
  useEffect(() => {
    if (open || !focusMainAfterClose.current) return;
    focusMainAfterClose.current = false;
    // Runs after the focus trap's cleanup (which returns focus to the menu button) in the same commit, so it wins.
    mainRef.current?.focus({ preventScroll: true });
  }, [open]);
  const onDrawerClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const choice = (event.target as HTMLElement).closest<HTMLElement>(NAVIGATION_TARGET);
    if (!choice || !event.currentTarget.contains(choice) || choice.closest(".zen-sidebar__workspace-rail")) return;
    if (choice.matches(":disabled, [aria-disabled='true'], [aria-expanded], [aria-haspopup]")) return;
    focusMainAfterClose.current = true;
    setNavOpen(false);
  };

  const context = useMemo<AppShellContextValue>(() => ({
    layout,
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar: () => setSidebarCollapsed(!sidebarCollapsed),
    navOpen: open,
    openNav: () => setNavOpen(true),
    closeNav: () => setNavOpen(false),
  }), [layout, sidebarCollapsed, setSidebarCollapsed, open, setNavOpen]);

  const hasTopBar = Boolean(header || headerActions);
  const stackedHeader = useStackedHeader(headerEl, header ? contentEl : null, toggleEl, headerActions ? actionsEl : null);
  const showCollapseToggle = !compact && hasTopBar && sidebarToggle && canCollapse && !ownCollapse;
  const showMenuButton = compact && Boolean(sidebar);
  const inlineSidebar = sidebarElement && canCollapse && !ownCollapse ? cloneElement(sidebarElement, { collapsed: sidebarCollapsed }) : sidebar;
  // The drawer always shows the whole navigation: never the rail, and no collapse control inside a modal.
  const drawerSidebar = sidebarElement ? cloneElement(sidebarElement, { collapsed: false, onCollapsedChange: undefined }) : sidebar;
  // The aside docks beside the page (Figma Side-Panel Type=Standard) only while the page keeps a Tablet width next to
  // it; otherwise a SidePanel opens as the modal panel (Type=Modal) and anything else stacks under the page.
  const asideElement = isValidElement<SidePanelProps>(aside) && aside.type === SidePanel ? aside : null;
  const measuredAside = useElementSize(aside ? asideEl : null, "width");
  const lastAsideWidth = useRef(0);
  if (measuredAside > 0) lastAsideWidth.current = measuredAside;
  const asideDocked = !compact && (!shellWidth || shellWidth - sidebarWidth - (lastAsideWidth.current || SIDE_PANEL_DEFAULT_WIDTH) >= TABLET_MIN_WIDTH);

  const toggle = showCollapseToggle || showMenuButton ? (
    <span ref={setToggleEl} className="zen-app-shell__toggle">
      {showMenuButton ? (
        // zen-allow-filter-button: this button opens the navigation drawer (a dialog), not a choice list.
        <IconButton appearance="flat" level="primary" size="md" icon={<Icon name="icon-menu-01-line" />} aria-label={t.openNavigation} aria-haspopup="dialog" aria-expanded={open} onClick={() => setNavOpen(true)} />
      ) : (
        <IconButton appearance="flat" level="primary" size="md" icon={<Icon name={sidebarCollapsed ? "icon-layout-right-line" : "icon-layout-left-line"} />} aria-label={sidebarCollapsed ? t.expandSidebar : t.collapseSidebar} aria-expanded={!sidebarCollapsed} aria-controls={sidebarId} onClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
      )}
    </span>
  ) : null;

  // The banner's height offsets the sticky parts under it; the floating action's height is kept free at the end of the page.
  const shellStyle = banner || floatingAction ? ({ ...style, ...(banner ? { "--zen-app-shell-banner-height": `${bannerHeight}px` } : {}), ...(floatingAction ? { "--zen-app-shell-floating-height": `${floatingHeight}px` } : {}) } as CSSProperties) : style;

  return (
    <AppShellContext value={context}>
      <div {...rest} ref={setRootEl} className={["zen-app-shell", className].filter(Boolean).join(" ")} style={shellStyle} data-canvas={canvas} data-layout={layout} data-floating={floatingAction ? "true" : undefined} inert={open || undefined}>
        {/* Moves focus without touching the URL, so hash routers and history are left alone; href stays for no-JS. */}
        <VisuallyHidden as="a" href={`#${mainId}`} focusable onClick={(event) => { event.preventDefault(); mainRef.current?.focus(); }}>{t.skipToContent}</VisuallyHidden>
        {banner ? <div ref={setBannerEl} className="zen-app-shell__banner">{banner}</div> : null}
        <div className="zen-app-shell__frame">
          {sidebar && !compact ? <div ref={setSidebarEl} id={sidebarId} className="zen-app-shell__sidebar">{inlineSidebar}</div> : null}
          <div className="zen-app-shell__column">
            {hasTopBar || showMenuButton ? (
              <header ref={setHeaderEl} className="zen-app-shell__header" data-stacked={stackedHeader || undefined}>
                <div className="zen-app-shell__header-leading">
                  {toggle}
                  {header ? <div ref={setContentEl} className="zen-app-shell__header-content">{header}</div> : null}
                </div>
                {headerActions ? <div ref={setActionsEl} className="zen-app-shell__header-actions">{headerActions}</div> : null}
              </header>
            ) : null}
            <main ref={mainRef} id={mainId} className="zen-app-shell__main" tabIndex={-1}>{children}</main>
            {aside && !asideDocked && !asideElement ? <div className="zen-app-shell__aside" data-stacked="true">{aside}</div> : null}
            {floatingAction || footer ? (
              <div className="zen-app-shell__bottom">
                {floatingAction ? <div ref={setFloatingEl} className="zen-app-shell__floating">{floatingAction}</div> : null}
                {footer ? <div className="zen-app-shell__footer">{footer}</div> : null}
              </div>
            ) : null}
          </div>
          {aside && asideDocked ? <div ref={setAsideEl} className="zen-app-shell__aside">{aside}</div> : null}
        </div>
      </div>
      {asideElement && !asideDocked ? cloneElement(asideElement, { type: "modal" }) : null}
      {/* The drawer sits next to the shell, outside its inert subtree and inside the provider (so it keeps the token
          modes). Fixed to the viewport in an app; a preview frame that contains layout (container-type) holds it. */}
      {sidebar && presence.mounted ? (
        <div className="zen-app-shell__overlay" data-state={presence.phase}>
          <div className="zen-app-shell__scrim" aria-hidden="true" onPointerDown={() => setNavOpen(false)} />
          <div ref={drawerRef} className="zen-app-shell__drawer" role="dialog" aria-modal="true" aria-label={navLabel} tabIndex={-1} data-state={presence.phase} inert={presence.phase === "closing" || undefined} onClick={onDrawerClick}>
            <div className="zen-app-shell__drawer-panel">{drawerSidebar}</div>
            <div className="zen-app-shell__drawer-close">
              <IconButton level="tertiary" size="md" icon={<Icon name="icon-x-medium-line" />} aria-label={t.closeNavigation} onClick={() => setNavOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </AppShellContext>
  );
}

/* ───────────── Top bar parts ───────────── */

export type AppShellActionTone = "default" | "active" | "accent";

export interface AppShellActionProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Figma Leading-Icon: an icon name (`"icon-bell-01-line"`) or a node. */
  icon: IconName | ReactNode;
  /** The action's name (“Notifications”): its accessible name, with the unread count added, and its 1s tooltip. */
  "aria-label": string;
  /** Figma Noti-type=Number: the unread count on a badge. 0 hides it; above 99 it reads "99+" (the accessible name keeps the exact number). */
  count?: number;
  /** Figma Noti-type=Dot: something new without a count. Hidden while a count shows. */
  dot?: boolean;
  /** Figma Notification-Dot Theme: `default` Negative (needs attention) · `active` Positive · `accent`. */
  tone?: AppShellActionTone;
  /** Figma Theme: `tertiary` (Button/Icon-Main Medium Tertiary, 40px) · `flat` (Button/Icon-Flat Medium Primary: a 20px glyph with a 40px hit area). */
  appearance?: "tertiary" | "flat";
  /** Tooltip text. Default: `aria-label` (without the count). */
  tooltip?: ReactNode | false;
}

/**
 * Figma Primitives/Dashboard/Header/Action-Item (12280:19532): a top-bar icon action with an optional
 * Primitives/Notification-Dot (4116:21789). Dot 8px, Number Badge/Size/2XSmall high with Label/Small/Medium text, both on
 * Color/Background/{Negative|Positive|Accent}/Solid with a 2px Color/Border/Inverse ring, at the button's top-right.
 * It forwards its ref and props to the button, so it can be a <Menu trigger>.
 */
export const AppShellAction = forwardRef<HTMLButtonElement, AppShellActionProps>(function AppShellAction(
  { icon, count, dot = false, tone = "default", appearance = "tertiary", tooltip, className, "aria-label": label, ...buttonProps },
  ref,
) {
  const t = useZenLabels();
  const unread = typeof count === "number" && count > 0 ? Math.floor(count) : 0;
  const name = unread ? t.withUnread(label, unread) : dot ? t.withUnread(label) : label;
  return (
    <span className={["zen-app-shell-action", className].filter(Boolean).join(" ")} data-appearance={appearance}>
      <IconButton {...buttonProps} ref={ref} appearance={appearance === "flat" ? "flat" : "main"} level={appearance === "flat" ? "primary" : "tertiary"} size="md" icon={icon} aria-label={name} tooltip={tooltip ?? label} />
      {unread || dot ? (
        <span className="zen-app-shell-action__notification" data-style={unread ? "number" : "dot"} data-tone={tone} aria-hidden="true">
          {unread ? <span className={typographyStyles["Label/Small/Medium"]}>{unread > 99 ? "99+" : unread}</span> : null}
        </span>
      ) : null}
    </span>
  );
});

export interface AppShellAccountProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** The signed-in person's name: the accessible name (“Account: Ava Chen”), the tooltip and the initials without a photo. */
  name: string;
  /** Photo URL (Figma Avatar/Single Theme=Photo). */
  src?: string;
  /** Initials colour without a photo. Default neutral. */
  theme?: Exclude<AvatarTheme, "photo">;
}

/**
 * The account button at the end of the top bar: Figma Avatar/Single Circle Medium (Image-Size/Medium) as a button. Put
 * it in a Menu for the account actions: `<Menu align="end" trigger={<AppShellAccount name="Ava Chen" src={photo} />} items={…} />`.
 * Keyboard focus shows the Avatar's own focus ring.
 */
export const AppShellAccount = forwardRef<HTMLButtonElement, AppShellAccountProps>(function AppShellAccount(
  { name, src, theme = "neutral", className, type = "button", onFocus, onBlur, "aria-label": ariaLabel, ...buttonProps },
  ref,
) {
  const t = useZenLabels();
  const accessibleName = ariaLabel ?? t.accountOf(name);
  const [ring, setRing] = useState(false);
  // Name tooltip after 1s of hover, at once on keyboard focus, never on touch (house rule for icon-only controls).
  const tip = useIconTooltip(name, { placement: "bottom" });
  // bind() chains the tooltip's pointer and focus handlers after the caller's own (a Menu trigger passes some).
  const bound = tip.bind({
    ...buttonProps,
    onFocus: (event: FocusEvent<HTMLButtonElement>) => { setRing(event.currentTarget.matches(":focus-visible")); onFocus?.(event); },
    onBlur: (event: FocusEvent<HTMLButtonElement>) => { setRing(false); onBlur?.(event); },
  });
  return (
    <>
      <button {...bound} ref={ref} type={type} className={["zen-app-shell-account", className].filter(Boolean).join(" ")} aria-label={accessibleName}>
        {/* Without a photo, alt only generates the initials ("Ava Chen" → AC); the button's aria-label names it. */}
        <Avatar size="md" theme={src ? "photo" : theme} background="subtle" src={src} alt={src ? "" : name} focus={ring} />
      </button>
      {tip.tooltip}
    </>
  );
});
