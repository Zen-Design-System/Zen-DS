import { cloneElement, isValidElement, useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type HTMLAttributes, type MouseEvent as ReactMouseEvent, type ReactElement, type ReactNode, type Ref } from "react";
import { IconButton } from "../Button";
import { useModal } from "../Dialog/Dialog";
import { Icon } from "../Icon";
import { usePresence } from "../Motion/usePresence";
import { SidePanel, type SidePanelProps } from "../SidePanel";
import { Sidebar, type SidebarProps } from "../Sidebar";
import type { TopNavigationProps } from "../TopNavigation";
import { VisuallyHidden } from "../VisuallyHidden";
import { useZen, useZenLabels } from "../_shared/zen-context";
import "../Motion/motion.css";
import "./app-shell.css";
import { SidebarShellContext, type SidebarRegistration, type SidebarShellState } from "../_shared/sidebar-shell";
import { InlineOverlayContext } from "../_shared/overlay";
import { SearchShapeContext } from "../_shared/search-shape";
import "../Icon/core";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useIsomorphicLayoutEffect } from "../_shared/use-isomorphic-layout-effect";
import { useStableCallback } from "../_shared/use-stable-callback";
import { useMergedRefs } from "../_shared/merge-refs";
import { AppShellChromeContext, AppShellContext, type AppShellChrome, type AppShellContextValue, type AppShellLayout } from "./context";

export { useAppShell, type AppShellContextValue, type AppShellLayout } from "./context";

/** Figma Pattern/AppShell/Desktop Layout (16258:1857). */
export const appShellPatterns = ["sidebar", "list-detail", "top-bar", "workspace", "docs", "focus", "grid"] as const;
export type AppShellPattern = (typeof appShellPatterns)[number];
/** Figma Pattern/AppShell/Desktop Collapse: where the Sidebar's collapse toggle sits. */
export const appShellCollapses = ["header", "sidebar", "none"] as const;
export type AppShellCollapse = (typeof appShellCollapses)[number];
/** Figma Pattern/AppShell/Mobile Top (16261:136204). */
export const appShellMobileTops = ["bar", "band", "band-sheet", "media"] as const;
export type AppShellMobileTop = (typeof appShellMobileTops)[number];
/** The band's fill (Top=Band, Band-Sheet): Figma's Stage / Band fill on ◇ Master-Layout · Example (D1, E2, E1, D5). */
export const appShellBands = ["subtle", "pale", "soft", "accent"] as const;
export type AppShellBand = (typeof appShellBands)[number];

export interface AppShellProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Figma Layout, the desktop structure (from 1024px: desktops and iPad landscape):
   * - `sidebar` (default): Sidebar · header + page · docked side panel.
   * - `list-detail`: the Sidebar's rail · `leadingPane` (a 360 list) · header + the selected item.
   * - `top-bar`: no Sidebar; the header across, its sections or centre holding the navigation.
   * - `workspace`: the header across the top · `leadingPane` · page · `trailingPane` (tools, properties).
   * - `docs`: as workspace, the page a centred 720 column for reading, the panes on the Canvas.
   * - `focus`: one task: the header across · `progress` · a 680 column with the `trailingPane` (a summary) beside it.
   * - `grid`: as `sidebar`, drawn in lines instead of surfaces (Layout=Grid, 16258:1857): the Sidebar takes Theme=Border,
   *   Density=Small (no fill, a Pale line on its inner edge) and the header Theme=Border & Divider, Density=Small (a
   *   Pale line under its top row), unless they set their own `theme` / `density`. Pair it with Boxes and Flat Cards;
   *   keep Subtle for the metric cards that should stand out (◇ Master-Layout Rule, 16823:85229).
   */
  pattern?: AppShellPattern;
  /**
   * Figma Collapse: where the Sidebar's collapse toggle sits. `header` (default): at the start of the header's top row ·
   * `sidebar`: in the Sidebar's own header, for a trail that starts with a Master crumb (two icons in a row clash) ·
   * `none`: no toggle (the rail follows `sidebarCollapsed` or `useAppShell().setSidebarCollapsed`).
   */
  collapse?: AppShellCollapse;
  /**
   * Figma Sidebar: the app's navigation, a <Sidebar> (the `sidebar` and `list-detail` patterns). From 1024px it sits
   * beside the page, expanded or collapsed to its rail; narrower, it opens as a modal drawer from the header's menu
   * button or `useAppShell().openNav()`. A Sidebar wrapped in a component of your own follows the shell too.
   */
  sidebar?: ReactNode;
  /** Figma Header/AppShell: the page's header, an <AppShellHeader> (top row, Main row, Sections). Sticks to the top. */
  header?: ReactNode;
  /** Figma Leading-Pane: an <AppShellPane> before the page (`list-detail` 360; `workspace`, `docs` Sidebar/Default-Width). */
  leadingPane?: ReactNode;
  /** Figma Trailing-Pane: an <AppShellPane> after the page (`workspace`, `docs` Sidebar/Default-Width; `focus` 376). */
  trailingPane?: ReactNode;
  /**
   * Figma Side-Panel: a right panel docked beside the page, usually <SidePanel type="standard">. It docks while the page
   * keeps a Tablet width (744px) beside it; otherwise a SidePanel opens as the modal panel.
   */
  sidePanel?: ReactNode;
  /** Figma Progress (`focus`): the task's steps under the header, usually a horizontal <Stepper>, centred. */
  progress?: ReactNode;
  /** Figma Floating-Actions: the page's floating buttons in the bottom-right corner, Margin-Comfortable from the edges. */
  floatingActions?: ReactNode;
  /** A full-width message strip above the whole shell, usually <AlertBanner> (trial ending, maintenance, offline). */
  banner?: ReactNode;
  /** Page background layer: default Canvas, alt (a white page) or flat (pair it with Sidebar background="flat"). */
  canvas?: "default" | "alt" | "flat";
  /**
   * Figma Pattern/AppShell/Mobile Top, the mobile structure (under 1024px: phones and iPad portrait):
   * - `bar` (default): the TopNavigation over the page, on the canvas's twin surface: Surface/Alt on the default canvas,
   *   Surface/Default on `canvas="alt"`, Surface/Flat on `canvas="flat"`.
   * - `band`: a Support/Brand/Subtle band with the TopNavigation (transparent) and the `hero`, then the page.
   * - `band-sheet`: the band fills the screen and the page rises over it as a sheet with 3XLarge top corners.
   * - `media`: a `backdrop` (photo, video, map) behind a liquid-overlay TopNavigation, the page as a sheet over it.
   */
  mobileTop?: AppShellMobileTop;
  /**
   * Mobile `band` / `band-sheet`: the band's fill (user, 2026-10-19). `subtle` Support/Brand/Subtle (default, the
   * pattern's own), `pale` Support/Brand/Pale, `soft` Support/Brand/Soft, `accent` Background/Accent/Solid. On `accent`
   * the TopNavigation takes `transparent-on-color` (unless it sets a type) and the hero's text takes `tone="on-accent"`
   * (content follows its Solid fill).
   */
  band?: AppShellBand;
  /** Mobile: the screen's <TopNavigation> (its h1, Back on a child screen, up to three actions). Its type follows `mobileTop` unless it sets one. */
  topNavigation?: ReactNode;
  /** Mobile Figma Hero (`band`, `band-sheet`): what the band shows under the TopNavigation (a balance, a profile, a summary). */
  hero?: ReactNode;
  /** Mobile Figma Backdrop (`media`): the photo, video or map behind the top of the screen. */
  backdrop?: ReactNode;
  /** Mobile Figma Bottom Tab-Bar | Floating: the root navigation, a <BottomNavigation> (`floating-glass` floats over the page). Root screens only. */
  bottomNavigation?: ReactNode;
  /**
   * Mobile Figma Bottom Actions: what the screen pins to the bottom: an <ActionBar> (`surface="glass"` over photos), or
   * the screen's input bar in the same place (a chat's ChatComposer, an AI prompt field).
   */
  actionBar?: ReactNode;
  /** Sidebar rail state when controlled; pair it with `onSidebarCollapsedChange`. */
  sidebarCollapsed?: boolean;
  /** Rail state to start from, uncontrolled. Default: the Sidebar's own `collapsed`; `list-detail` starts on the rail. */
  defaultSidebarCollapsed?: boolean;
  /** Called when the toggle (or `useAppShell().setSidebarCollapsed`) collapses or expands the Sidebar. Store it to keep the choice between visits. */
  onSidebarCollapsedChange?: (collapsed: boolean) => void;
  /** Drawer state when controlled (drawer and mobile layouts). */
  navOpen?: boolean;
  defaultNavOpen?: boolean;
  onNavOpenChange?: (open: boolean) => void;
  /** Accessible name of the navigation drawer. Default: the localized "Navigation". */
  navLabel?: string;
  /** Id of the main element, the target of the skip link. */
  mainId?: string;
  /**
   * Which structure to draw: `auto` (default) follows the shell's own width (1024px and up desktop; narrower, `mobile`
   * when a mobile part is given, else `drawer`), or force `desktop`, `drawer` or `mobile` (a design canvas, a preview).
   */
  layout?: "auto" | AppShellLayout;
  /** Figma Content: the page (the Body pads Margin-Comfortable; Spacing/Gap/XSmall on desktop, Layout-Mobile/Section-Gap on mobile). */
  children?: ReactNode;
  /** Figma instance overrides, by layer (`{ Close: { level: "secondary" } }`). Written by Zen Studio; app code sets the props. */
  overrides?: NestedOverrides;
  /** The root `<div>` element. */
  ref?: Ref<HTMLDivElement>;
}

/** Below this width the shell leaves the desktop structure (the Tablet and Mobile breakpoints; iPad portrait is 744). */
const DESKTOP_MIN_WIDTH = 1024;
/** The Tablet breakpoint: the least room the page keeps beside a docked side panel. */
const TABLET_MIN_WIDTH = 744;
/** Figma Side-Panel Size=Small, assumed until the docked panel has been measured once. */
const SIDE_PANEL_DEFAULT_WIDTH = 360;
const DRAWER_SHELL = { drawer: true };
/** The patterns that keep the Sidebar beside the page; the others put the header across the top. */
const SIDEBAR_PATTERNS = new Set<AppShellPattern>(["sidebar", "list-detail", "grid"]);
/** Figma's TopNavigation type for each mobile Top, when the screen's own TopNavigation sets none. */
const TOP_NAV_TYPE: Record<Exclude<AppShellMobileTop, "bar">, TopNavigationProps["type"]> = { band: "transparent", "band-sheet": "transparent", media: "liquid-overlay" };
/**
 * The Bar's TopNavigation takes the canvas's twin (Figma theme pairing, Theme-01…08; screen-rules §1): Canvas/Default ↔
 * Surface/Alt (Type=Alt), Canvas/Alt ↔ Surface/Default (Type=Default), Canvas/Flat ↔ Surface/Flat, which Top-Navigation
 * has no type for: a Default bar, repainted Surface/Flat in app-shell.css, as Figma screens override it by variable.
 */
const BAR_TYPE: Record<NonNullable<AppShellProps["canvas"]>, TopNavigationProps["type"]> = { default: "alt", alt: "default", flat: "default" };

/**
 * An element's border-box size on one axis in CSS px, kept current by a ResizeObserver: 0 without the element; a hidden
 * element keeps the last size. The layout size (offsetWidth), not the rendered one: inside a scaled preview (a CSS
 * transform, such as a zoomed design canvas) the shell still lays out at its own width and must pick the same layout.
 */
function useElementSize(element: HTMLElement | null, axis: "width" | "height"): number {
  const [size, setSize] = useState(0);
  useIsomorphicLayoutEffect(() => {
    if (!element) { setSize(0); return undefined; }
    const read = () => { const value = axis === "width" ? element.offsetWidth : element.offsetHeight; if (value > 0) setSize(value); };
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    // After a resize the observer's own border box: reading offsetWidth there laid the page out again whenever another
    // callback had written a style first (3.3 s on the App Shell board, 2026-10-25). Rounded as offsetWidth is.
    const observer = new ResizeObserver((entries) => {
      const box = entries[entries.length - 1]?.borderBoxSize?.[0];
      if (!box) { read(); return; }
      const value = Math.round(axis === "width" ? box.inlineSize : box.blockSize);
      if (value > 0) setSize(value);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, axis]);
  return size;
}

/**
 * On phones the floating actions hide while the page scrolls down and come back on a scroll up, so they never cover a
 * row's controls mid-scroll. Whatever scrolls the shell (the window or an ancestor) counts; a scroll inside the shell's
 * own parts (a list, a panel) does not.
 */
function useHideOnScroll(root: HTMLElement | null, enabled: boolean): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!enabled || !root) { setHidden(false); return undefined; }
    const last = new WeakMap<object, number>();
    const onScroll = (event: Event) => {
      const target = event.target;
      const scroller = target instanceof Element ? target : document.scrollingElement;
      if (!scroller || !(scroller === document.scrollingElement || scroller.contains(root))) return;
      const top = scroller.scrollTop;
      const before = last.get(scroller) ?? top;
      last.set(scroller, top);
      if (top <= 0) setHidden(false);
      else if (top - before > 4) setHidden(true);
      else if (before - top > 4) setHidden(false);
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, [root, enabled]);
  return hidden;
}

/** Before the shell has been measured (server render): the provider's breakpoint, then the viewport. */
function useGuessedDesktop(): boolean {
  const breakpoint = useZen()?.breakpoint;
  if (breakpoint) return breakpoint === "desktop";
  return !(typeof window !== "undefined" && window.matchMedia?.("(max-width: 1023.98px)").matches);
}

/** A choice in the drawer that navigates: a link, a Sidebar row or a Sidebar footer row (not a group, a menu trigger, a section title or the workspace rail). */
const NAVIGATION_TARGET = "a[href], button.zen-sidebar__item, .zen-sidebar__footer-content > button";

/**
 * The frame of an app, built on Figma's AppShell patterns (◇ Master-Layout 16254:1057): Pattern/AppShell/Desktop
 * (16258:1857) from 1024px, Pattern/AppShell/Mobile (16261:136204) below it when a mobile part is given, with a
 * "Skip to content" link, a modal navigation drawer and a docked or modal side panel.
 *
 * Desktop (`pattern`): Sidebar, Header/AppShell (`header`, an AppShellHeader), the Body (`children`, padded
 * Margin-Comfortable), the panes (`leadingPane`, `trailingPane`, AppShellPane), `progress`, `sidePanel` and
 * `floatingActions`. Mobile (`mobileTop`): the TopNavigation, the band's `hero` or the `backdrop`, the Body, then the
 * `bottomNavigation` or the `actionBar`. The Sidebar, the header, the panes and the bars stay in view while the page
 * scrolls (the window or the frame around the shell).
 *
 *   <AppShell sidebar={<Sidebar … />} header={<AppShellHeader leading={<Breadcrumbs … />} actions={…} main={<PageHeader … />} />}>
 *     …the page…
 *   </AppShell>
 */
export function AppShell({
  pattern = "sidebar",
  collapse = "header",
  sidebar,
  header,
  leadingPane,
  trailingPane,
  sidePanel,
  progress,
  floatingActions,
  banner,
  canvas = "default",
  mobileTop = "bar",
  band = "subtle",
  topNavigation,
  hero,
  backdrop,
  bottomNavigation,
  actionBar,
  sidebarCollapsed: collapsedProp,
  defaultSidebarCollapsed,
  onSidebarCollapsedChange,
  navOpen: navOpenProp,
  defaultNavOpen = false,
  onNavOpenChange,
  navLabel: navLabelProp,
  mainId: requestedMainId,
  layout: layoutProp = "auto",
  className,
  style,
  children,
  overrides,
  ref,
  ...rest
}: AppShellProps) {
  const t = useZenLabels();
  const nest = useNested(overrides);
  const navLabel = navLabelProp ?? t.navigation;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const mainId = requestedMainId ?? `zen-main-${uid}`;
  const sidebarId = `zen-sidebar-${uid}`;
  const mainRef = useRef<HTMLElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
  const rootRef = useMergedRefs(ref, setRootEl);
  const [bannerEl, setBannerEl] = useState<HTMLDivElement | null>(null);
  const [headerEl, setHeaderEl] = useState<HTMLElement | null>(null);
  const [sidebarEl, setSidebarEl] = useState<HTMLDivElement | null>(null);
  const [sidePanelEl, setSidePanelEl] = useState<HTMLDivElement | null>(null);
  const shellWidth = useElementSize(rootEl, "width");
  const guessedDesktop = useGuessedDesktop();
  const zenBreakpoint = useZen()?.breakpoint;

  // Layout: from 1024px the pattern's desktop structure; narrower, Pattern/AppShell/Mobile when the screen has a mobile
  // part (phones and iPad portrait, the user's call 2026-10-18), else the header with the Sidebar in a drawer.
  const mobileParts = Boolean(topNavigation || bottomNavigation || actionBar || hero || backdrop);
  const wide = shellWidth ? shellWidth >= DESKTOP_MIN_WIDTH : guessedDesktop;
  const autoLayout: AppShellLayout = wide ? "desktop" : mobileParts ? "mobile" : "drawer";
  const layout: AppShellLayout = layoutProp === "auto" ? autoLayout : layoutProp === "mobile" && !mobileParts ? "drawer" : layoutProp;
  const desktop = layout === "desktop";
  const mobile = layout === "mobile";
  const sidebarBeside = desktop && Boolean(sidebar) && SIDEBAR_PATTERNS.has(pattern);
  const bannerHeight = useElementSize(banner ? bannerEl : null, "height");
  const headerHeight = useElementSize(header && !mobile ? headerEl : null, "height");
  const phone = zenBreakpoint === "mobile" || rootEl?.closest("[data-breakpoint]")?.getAttribute("data-breakpoint") === "mobile";
  const floatingHidden = useHideOnScroll(rootEl, Boolean(floatingActions) && phone);
  const sidebarWidth = useElementSize(sidebarBeside ? sidebarEl : null, "width");

  // Sidebar rail. A Zen Sidebar gets `collapsed` from the shell; one with its own onCollapsedChange keeps its header
  // control and the shell's requests go to it. A Sidebar passed straight in is read from its props; one deeper (wrapped
  // in an app component, a Stack, a Studio component) tells the shell the same through SidebarShellContext `register`.
  const [registered, setRegistered] = useState<SidebarRegistration | null>(null);
  const register = useCallback((entry: SidebarRegistration) => {
    setRegistered(entry);
    return () => setRegistered((current) => (current === entry ? null : current));
  }, []);
  const sidebarElement = isValidElement<SidebarProps>(sidebar) && sidebar.type === Sidebar ? sidebar : null;
  const rail: SidebarRegistration | null = sidebarElement ? {
    canCollapse: sidebarElement.props.variant !== "workspace",
    collapsed: sidebarElement.props.collapsed,
    owns: Boolean(sidebarElement.props.onCollapsedChange),
    request: (next) => sidebarElement.props.onCollapsedChange?.(next),
  } : registered;
  const ownCollapse = Boolean(rail?.owns);
  const canCollapse = rail ? rail.canCollapse : Boolean(sidebar);
  // List-Detail starts on the rail (Figma Sidebar Expand=No) unless told otherwise.
  const startCollapsed = defaultSidebarCollapsed ?? (pattern === "list-detail" ? true : Boolean(rail?.collapsed));
  const [innerCollapsed, setInnerCollapsed] = useState(startCollapsed);
  // The Sidebar's own `collapsed` is where an uncontrolled shell starts, and a change to it (the code edited, Zen
  // Studio's Collapsed toggle) moves the rail too; the toggle and setSidebarCollapsed still change it in between.
  const declaredCollapsed = rail?.collapsed;
  const [seenCollapsed, setSeenCollapsed] = useState(() => ({ known: Boolean(rail), collapsed: declaredCollapsed }));
  if (rail && (!seenCollapsed.known || declaredCollapsed !== seenCollapsed.collapsed)) {
    setSeenCollapsed({ known: true, collapsed: declaredCollapsed });
    // A change to it moves the rail; a wrapped Sidebar first heard of after the first render sets where it starts,
    // unless the shell has its own defaultSidebarCollapsed (or the Sidebar says nothing: the pattern's start stays).
    if (collapsedProp === undefined) {
      if (seenCollapsed.known) setInnerCollapsed(Boolean(declaredCollapsed));
      else if (defaultSidebarCollapsed === undefined && declaredCollapsed !== undefined) setInnerCollapsed(declaredCollapsed);
    }
  }
  const sidebarCollapsed = ownCollapse ? Boolean(declaredCollapsed) : Boolean(collapsedProp ?? innerCollapsed);
  const setSidebarCollapsed = useStableCallback((next: boolean) => {
    if (ownCollapse) { rail?.request(next); return; }
    if (collapsedProp === undefined) setInnerCollapsed(next);
    onSidebarCollapsedChange?.(next);
  });

  // Drawer. One stable setter: the shared focus trap re-runs whenever its handler changes identity.
  const [innerOpen, setInnerOpen] = useState(defaultNavOpen);
  const open = !desktop && Boolean(sidebar) && Boolean(navOpenProp ?? innerOpen);
  const setNavOpen = useStableCallback((next: boolean) => {
    if (navOpenProp === undefined) setInnerOpen(next);
    onNavOpenChange?.(next);
  });
  const closeFromModal = useCallback((next: boolean) => { if (!next) setNavOpen(false); }, [setNavOpen]);
  const presence = usePresence(open, 200);
  // Modal: focus the current page's row (else the drawer), trap Tab, Escape closes, the page stops scrolling, and focus
  // returns to the button that opened it.
  useModal(open, drawerRef, true, closeFromModal, '[aria-current="page"]');
  // Choosing a page closes the drawer and moves focus to the new content, not back to the menu button.
  const focusMainAfterClose = useRef(false);
  useEffect(() => {
    if (open || !focusMainAfterClose.current) return;
    focusMainAfterClose.current = false;
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

  // The header's top row starts with the collapse toggle (desktop, collapse="header") or the drawer's menu button.
  const shellToggles = sidebarBeside && canCollapse && !ownCollapse;
  const toggle: AppShellChrome["toggle"] = shellToggles && collapse === "header" ? "collapse" : layout === "drawer" && sidebar ? "menu" : null;
  const chrome = useMemo<AppShellChrome>(() => ({
    toggle,
    sidebarCollapsed,
    toggleSidebar: () => setSidebarCollapsed(!sidebarCollapsed),
    sidebarId,
    navOpen: open,
    openNav: () => setNavOpen(true),
    registerHeader: setHeaderEl,
    phone: layout === "drawer" && shellWidth > 0 && shellWidth < TABLET_MIN_WIDTH,
    headerTheme: pattern === "grid" ? "border-divider" : undefined,
    headerDensity: pattern === "grid" ? "small" : undefined,
  }), [toggle, sidebarCollapsed, setSidebarCollapsed, sidebarId, open, setNavOpen, layout, shellWidth, pattern]);
  // Sidebar reads these through SidebarShellContext, so a Sidebar wrapped in an app component follows the rail too. The
  // drawer always shows the whole navigation: never the rail, and no collapse control inside a modal.
  const inlineShell = useMemo<SidebarShellState>(() => ({
    collapsed: canCollapse && !ownCollapse ? sidebarCollapsed : undefined,
    expand: canCollapse && !ownCollapse ? () => setSidebarCollapsed(false) : undefined,
    toggleHere: shellToggles && collapse === "sidebar" ? setSidebarCollapsed : undefined,
    register,
    theme: pattern === "grid" ? "border" : undefined,
    density: pattern === "grid" ? "small" : undefined,
  }), [canCollapse, ownCollapse, sidebarCollapsed, setSidebarCollapsed, shellToggles, collapse, register, pattern]);

  // The side panel docks beside the page (Figma Side-Panel Type=Standard) only while the page keeps a Tablet width next
  // to it; otherwise a SidePanel opens as the modal panel (Type=Modal) and anything else stacks under the page.
  const sidePanelElement = isValidElement<SidePanelProps>(sidePanel) && sidePanel.type === SidePanel ? sidePanel : null;
  const measuredSidePanel = useElementSize(sidePanel ? sidePanelEl : null, "width");
  const [lastSidePanelWidth, setLastSidePanelWidth] = useState(0);
  if (measuredSidePanel > 0 && measuredSidePanel !== lastSidePanelWidth) setLastSidePanelWidth(measuredSidePanel);
  const sidePanelWidth = measuredSidePanel > 0 ? measuredSidePanel : lastSidePanelWidth;
  const sidePanelDocked = desktop && (!shellWidth || shellWidth - sidebarWidth - (sidePanelWidth || SIDE_PANEL_DEFAULT_WIDTH) >= TABLET_MIN_WIDTH);

  // The banner's height offsets the sticky parts under it; on the patterns with the header across the top, the panes
  // stick under the header too.
  const shellStyle = { ...style, "--zen-app-shell-banner-height": `${bannerHeight}px`, "--zen-app-shell-header-height": `${headerHeight}px` } as CSSProperties;
  const skip = <VisuallyHidden as="a" href={`#${mainId}`} focusable onClick={(event) => { event.preventDefault(); mainRef.current?.focus(); }}>{t.skipToContent}</VisuallyHidden>;
  const bannerPart = banner ? <div ref={setBannerEl} className="zen-app-shell__banner">{banner}</div> : null;
  const sidePanelPart = sidePanel && sidePanelDocked ? <div ref={setSidePanelEl} className="zen-app-shell__side-panel">{sidePanel}</div> : null;
  const floatingPart = floatingActions ? <div className="zen-app-shell__floating" data-hidden={floatingHidden ? "true" : undefined}><div className="zen-app-shell__floating-items">{nest.slot(floatingActions)}</div></div> : null;
  const pane = (part: ReactNode, side: "leading" | "trailing") => (part ? <div className="zen-app-shell__pane" data-side={side}>{nest.slot(part)}</div> : null);
  // On a phone (the mobile structure, or the drawer under tablet width) a Search that sets no `shape` is Rounded; a
  // Search can still say shape="default" (SearchShapeContext; user 2026-10-21: "AppShell mobile cũng mặc định Rounded",
  // "nhưng cho phép đổi").
  const phoneSearches = (part: ReactNode) => (mobile || chrome.phone ? <SearchShapeContext value="rounded">{part}</SearchShapeContext> : part);

  let frame: ReactNode;
  if (mobile) {
    // Pattern/AppShell/Mobile: Top (Bar · Band · Band-Sheet · Media) over the Body, then the Bottom (Tab-Bar · Floating ·
    // Actions); the TopNavigation takes Figma's type for the Top unless it sets its own.
    const topNav = isValidElement<TopNavigationProps>(topNavigation) && topNavigation.props.type === undefined
      ? cloneElement(topNavigation as ReactElement<TopNavigationProps>, { type: band === "accent" && (mobileTop === "band" || mobileTop === "band-sheet") ? "transparent-on-color" : mobileTop === "bar" ? BAR_TYPE[canvas] : TOP_NAV_TYPE[mobileTop] })
      : topNavigation;
    const top = topNav ? <div className="zen-app-shell__top-nav">{nest.slot(topNav)}</div> : null;
    const body = <main ref={mainRef} id={mainId} className="zen-app-shell__body" tabIndex={-1}>{nest.slot(children)}</main>;
    const bottom = floatingPart || actionBar || bottomNavigation ? (
      <div className="zen-app-shell__bottom">
        {floatingPart}
        {actionBar ? nest.slot(actionBar) : bottomNavigation ? <div className="zen-app-shell__bottom-nav">{nest.slot(bottomNavigation)}</div> : null}
      </div>
    ) : null;
    frame = mobileTop === "band" ? (
      <>
        <div className="zen-app-shell__band">{top}{hero ? <div className="zen-app-shell__hero">{nest.slot(hero)}</div> : null}</div>
        {body}{bottom}
      </>
    ) : mobileTop === "band-sheet" || mobileTop === "media" ? (
      <div className="zen-app-shell__stage" data-top={mobileTop}>
        {mobileTop === "media" && backdrop ? <div className="zen-app-shell__backdrop">{nest.slot(backdrop)}</div> : null}
        {top}
        {mobileTop === "band-sheet" && hero ? <div className="zen-app-shell__hero">{nest.slot(hero)}</div> : null}
        {mobileTop === "media" ? <div className="zen-app-shell__spacer" aria-hidden="true" /> : null}
        {body}{bottom}
      </div>
    ) : <>{top}{body}{bottom}</>;
  } else {
    // The header sticks to the top of the page (its own box, so a design canvas can find the slot).
    const headerPart = header ? <div className="zen-app-shell__header">{nest.slot(header)}</div> : null;
    const body = (
      <main ref={mainRef} id={mainId} className="zen-app-shell__body" tabIndex={-1}>
        {pattern === "docs" || pattern === "focus" ? <div className="zen-app-shell__column">{nest.slot(children)}</div> : nest.slot(children)}
        {/* Focus: the summary pane sits beside the column, inside the Body (Figma Body: Column + Trailing-Pane). */}
        {pattern === "focus" && desktop ? pane(trailingPane, "trailing") : null}
      </main>
    );
    // Narrow (drawer): the panes stack around the page, in reading order.
    const stackedPanes = !desktop;
    frame = desktop && SIDEBAR_PATTERNS.has(pattern) ? (
      <div className="zen-app-shell__frame">
        {sidebarBeside ? <div ref={setSidebarEl} id={sidebarId} className="zen-app-shell__sidebar"><SidebarShellContext value={inlineShell}>{sidebar}</SidebarShellContext></div> : null}
        {pattern === "list-detail" ? pane(leadingPane, "leading") : null}
        <div className="zen-app-shell__main">{headerPart}{body}{floatingPart}</div>
        {sidePanelPart}
      </div>
    ) : (
      <div className="zen-app-shell__frame" data-across="true">
        <div className="zen-app-shell__main">
          {headerPart}
          {pattern === "focus" && progress ? <div className="zen-app-shell__progress">{nest.slot(progress)}</div> : null}
          <div className="zen-app-shell__work">
            {desktop && (pattern === "workspace" || pattern === "docs") ? pane(leadingPane, "leading") : null}
            <div className="zen-app-shell__work-main">
              {stackedPanes ? pane(leadingPane, "leading") : null}
              {body}
              {stackedPanes ? pane(trailingPane, "trailing") : null}
            </div>
            {desktop && (pattern === "workspace" || pattern === "docs") ? pane(trailingPane, "trailing") : null}
            {sidePanelPart}
          </div>
          {floatingPart}
        </div>
      </div>
    );
  }

  return (
    <AppShellContext value={context}>
      <AppShellChromeContext value={chrome}>
        <div {...rest} ref={rootRef} className={["zen-app-shell", className].filter(Boolean).join(" ")} style={shellStyle}
          data-canvas={canvas} data-layout={layout} data-pattern={mobile ? undefined : pattern} data-top={mobile ? mobileTop : undefined}
          data-band={mobile && (mobileTop === "band" || mobileTop === "band-sheet") && band !== "subtle" ? band : undefined}
          data-bottom={mobile ? (actionBar ? "actions" : bottomNavigation ? "navigation" : "none") : undefined} inert={open || undefined}>
          {skip}
          {bannerPart}
          {phoneSearches(frame)}
          {/* A side panel that is not a SidePanel (no modal of its own) stacks under the page when it cannot dock. */}
          {sidePanel && !sidePanelDocked && !sidePanelElement ? <div className="zen-app-shell__side-panel" data-stacked="true">{phoneSearches(sidePanel)}</div> : null}
        </div>
        {/* The modal panel renders next to the shell, as the drawer does (InlineOverlayContext), so a preview frame holds it. */}
        {sidePanelElement && !sidePanelDocked ? <InlineOverlayContext value>{phoneSearches(cloneElement(sidePanelElement, { type: "modal" }))}</InlineOverlayContext> : null}
        {/* The drawer sits next to the shell, outside its inert subtree and inside the provider (so it keeps the token
            modes). Fixed to the viewport in an app; a preview frame that contains layout (container-type) holds it. */}
        {sidebar && presence.mounted ? (
          <div className="zen-app-shell__overlay" data-state={presence.phase}>
            <div className="zen-app-shell__scrim" aria-hidden="true" onPointerDown={() => setNavOpen(false)} />
            <div ref={drawerRef} className="zen-app-shell__drawer" role="dialog" aria-modal="true" aria-label={navLabel} tabIndex={-1} data-state={presence.phase} inert={presence.phase === "closing" || undefined} onClick={onDrawerClick}>
              <div className="zen-app-shell__drawer-panel"><SidebarShellContext value={DRAWER_SHELL}>{phoneSearches(sidebar)}</SidebarShellContext></div>
              <div className="zen-app-shell__drawer-close">
                {nest("Close", <IconButton level="tertiary" size="md" icon={<Icon name="icon-x-medium-line" />} aria-label={t.closeNavigation} onClick={() => setNavOpen(false)} />)}
              </div>
            </div>
          </div>
        ) : null}
      </AppShellChromeContext>
    </AppShellContext>
  );
}

export { AppShellHeader, AppShellAction, AppShellAccount, appShellHeaderThemes, appShellHeaderDensities, type AppShellHeaderProps, type AppShellHeaderTheme, type AppShellHeaderDensity, type AppShellActionProps, type AppShellAccountProps, type AppShellActionTone } from "./AppShellHeader";
export { AppShellPane, appShellPaneThemes, appShellPaneSurfaces, type AppShellPaneProps, type AppShellPaneTheme, type AppShellPaneSurface } from "./AppShellPane";
