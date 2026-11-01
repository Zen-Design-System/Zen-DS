import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ZenPortalProvider } from "../components/Portal";
import { AppShell, AppShellHeader, AppShellPane } from "../components/AppShell";
import { Badge } from "../components/Badge";
import { Breadcrumbs, type BreadcrumbItemData } from "../components/Breadcrumbs";
import { Button, IconButton } from "../components/Button";
import { Divider } from "../components/Divider";
import { Sidebar, SidebarSubMenu, type SidebarItem, type SidebarSection } from "../components/Sidebar";
import { EmptyState } from "../components/EmptyState";
import { Box, Stack } from "../components/Layout";
import { Link } from "../components/Link";
import { Search } from "../components/Search";
import { Text } from "../components/Text";
import { Icon, type IconName } from "../components/Icon";
import coverVectorLeft from "../assets/figma/official/cover-vector-left.svg";
import coverVectorRight from "../assets/figma/official/cover-vector-right.svg";
import { collections } from "../foundations/collections";
import { PlatformComponentPage, type PlatformPage } from "./PlatformExamples";
import { appLayerPages } from "./PlatformAppLayer";
import { appLayerPageIds, type AppLayerPage } from "./appLayer/types";
import { PlatformAppearancePanel, PlatformColorModeButton, PlatformTypographyContext, type PlatformShellSettings } from "./PlatformTemplate";
import { PlatformOnThisPage, usePageSections } from "./PlatformReference";
import { AccountMenu } from "./auth/AuthGate";
import { typographyStyles } from "../tokens/typography.generated";
import { version } from "../../package.json";
import "./platform.css";

const cards: Array<{ title: string; description: string; icon: IconName; page?: PlatformPage; layout: string }> = [
  { title: "Foundation", description: "We're excited to share that we're developing a new plugin to enhance the color ramp feature's customization options.", icon: "icon-book-open-solid", page: "design-tokens", layout: "foundation" },
  { title: "Components", description: "We're excited to share that we're developing a new plugin to enhance the color ramp feature's customization options.", icon: "icon-grid-01-solid", page: "button", layout: "components" },
  { title: "Patterns", description: "We're excited to share that we're developing a new plugin to enhance the color ramp feature's customization options.", icon: "icon-table-solid", page: "sidebar", layout: "patterns" },
  { title: "Resources & Tools", description: "We're excited to share that we're developing a new plugin to enhance the color ramp feature's customization options.", icon: "icon-tool-02-solid", page: "installation", layout: "resources" },
  { title: "Development", description: "We're excited to share that we're developing a new plugin to enhance the color ramp feature's customization options.", icon: "icon-code-02-line", page: "chip", layout: "development" },
];

/** Component pages shown in the sidebar (sorted A–Z at render time). */
export const componentNavigation: Array<{ id: PlatformPage; label: string }> = [
  { id: "color-selector", label: "Color Selector" },
  { id: "color-picker", label: "Color Picker" },
  { id: "slider-field", label: "Slider Field" },
  { id: "curve-preview", label: "Curve Preview" },
  { id: "metric", label: "Metric Widget" },
  { id: "rating", label: "Rating" },
  { id: "side-panel", label: "Side Panel" },
  { id: "uploader", label: "Uploader" },
  { id: "voice", label: "Voice" },
  { id: "ai-chat", label: "AI Chat" },
  { id: "bottom-navigation", label: "Bottom Navigation" },
  { id: "bottom-sheet", label: "Bottom Sheet" },
  { id: "chart", label: "Chart" },
  { id: "chat", label: "Chat" },
  { id: "top-navigation", label: "Top Navigation" },
  { id: "accordion", label: "Accordion" },
  { id: "alert-banner", label: "Alert Banner" },
  { id: "avatar", label: "Avatar" },
  { id: "badge", label: "Badge" },
  { id: "breadcrumbs", label: "Breadcrumbs" },
  { id: "button", label: "Button" },
  { id: "calendar", label: "Calendar" },
  { id: "card", label: "Card" },
  { id: "checkbox", label: "Checkbox" },
  { id: "chip", label: "Chip/Pill" },
  { id: "date-picker", label: "Date Picker" },
  { id: "divider", label: "Divider" },
  { id: "dock-icon", label: "Dock Icon" },
  { id: "empty-state", label: "Empty State" },
  { id: "inline-message", label: "Inline Message" },
  { id: "list-item", label: "List Item" },
  { id: "input", label: "Input" },
  { id: "dialog", label: "Modal & Dialog" },
  { id: "pagination", label: "Pagination" },
  { id: "popover", label: "Popover" },
  { id: "progress", label: "Progress" },
  { id: "radio-button", label: "Radio Button" },
  { id: "schedule", label: "Schedule" },
  { id: "search", label: "Search" },
  { id: "segmented", label: "Segmented" },
  { id: "shape", label: "Shape" },
  { id: "sidebar", label: "Sidebar" },
  { id: "skeleton", label: "Skeleton" },
  { id: "slider", label: "Slider" },
  { id: "stepper", label: "Stepper" },
  { id: "table", label: "Table" },
  { id: "sheet-table", label: "Sheet Table" },
  { id: "tabs", label: "Tabs" },
  { id: "tag", label: "Tag" },
  { id: "timeline", label: "Timeline" },
  { id: "toast", label: "Toast Message" },
  { id: "toggle", label: "Toggle" },
  { id: "tooltip", label: "Tooltip" },
  // Phase-2 app layer (src/platform/appLayer/*): each page appears once its group module defines it.
  ...Object.entries(appLayerPages).map(([id, meta]) => ({ id: id as PlatformPage, label: meta!.label })),
];
const componentPageIds = componentNavigation.map((item) => item.id);

/** The docs navigation (Figma B5 Leading-Pane): section labels and plain rows, no icons; the current page is selected. */
function getSidebarSections(activePage: PlatformPage, activeCollection: string | null): SidebarSection[] {
  return [
    { label: "Getting started", items: [
      { id: "overviews", label: "Overviews", active: activePage === "overviews" },
      { id: "installation", label: "Installation", active: activePage === "installation" },
    ] },
    { label: "Foundation", items: [
      { id: "design-tokens", label: "Design Tokens", active: activePage === "design-tokens" && !activeCollection, dropdown: true, children: collections.map((collection) => ({ id: collection.slug, label: collection.name, active: activeCollection === collection.slug })) },
      { id: "typography", label: "Typography", active: activePage === "typography" },
      { id: "iconography", label: "Iconography", active: activePage === "iconography" },
    ] },
    // Components are listed A–Z by their label (new pages land in order automatically).
    { label: "Components", items: componentNavigation
      .map(({ id, label }) => ({ id, label, active: activePage === id }))
      .sort((left, right) => left.label.localeCompare(right.label)) },
  ];
}

/** Case- and accent-insensitive text for matching ("Tokens", "tokens", "Tóken" all match "token"). */
const searchable = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Navigation search: keeps the items whose label matches every word of the query, per section.
 * A query word matches the start of a label word ("to" → Toast, Toggle, Design Tokens — not Button);
 * when that finds nothing, any substring counts. Nested pages (Design Tokens collections) match on their
 * own label and are listed on their own while searching, since a collapsed group would hide the match.
 */
function filterSidebarSections(sections: SidebarSection[], query: string): SidebarSection[] {
  const words = searchable(query).split(/\s+/).filter(Boolean);
  if (!words.length) return sections;
  const prefix = (label: string) => { const parts = searchable(label).split(/[^a-z0-9]+/); return words.every((word) => parts.some((part) => part.startsWith(word))); };
  const substring = (label: string) => words.every((word) => searchable(label).includes(word));
  const byPrefix = filterWith(sections, prefix);
  return byPrefix.length ? byPrefix : filterWith(sections, substring);
}

function filterWith(sections: SidebarSection[], matches: (label: string) => boolean): SidebarSection[] {
  return sections
    .map((section) => ({
      ...section,
      action: undefined,
      items: section.items.flatMap((item): SidebarItem[] => {
        const own = matches(item.label) ? [{ ...item, children: undefined, dropdown: false }] : [];
        const children = (item.children ?? []).filter((child) => matches(child.label));
        return [...own, ...children];
      }),
    }))
    .filter((section) => section.items.length);
}

export function OverviewPage({ onCardClick }: { onCardClick: (page: PlatformPage) => void }) {
  return (
    <div className="official-overview">
      <section className="official-cover" aria-labelledby="official-cover-title">
        <div className="official-cover__vector official-cover__vector--left" aria-hidden="true"><img src={coverVectorLeft} alt="" /></div>
        <div className="official-cover__vector official-cover__vector--right" aria-hidden="true"><img src={coverVectorRight} alt="" /></div>
        <span className="official-cover__logo" aria-hidden="true" />
        <span className={`official-cover__kaiz ${typographyStyles["All-Caps/M-BOLD"]}`}>KAIZ</span>
        <div className="official-cover__body">
          <h1 id="official-cover-title">Zen<br />Design<br />System</h1>
          <span className="official-cover__divider" aria-hidden="true" />
          <div className="official-cover__meta"><span className={typographyStyles["All-Caps/M-BOLD"]}>v1.0.2</span><span className={typographyStyles["All-Caps/M-BOLD"]}>Đìzai® Studio</span><span className={typographyStyles["All-Caps/M-BOLD"]}>2026</span></div>
        </div>
      </section>

      <div className="official-overview__content">
        <section className="official-intro">
          <h2>Zen® Design System is a comprehensive set of UI Components, Design Guidelines, and Code. It empowers you to build beautiful and user-friendly interfaces quickly and efficiently.</h2>
          <Button className="official-download" level="primary" size="lg" startIcon={<Icon name="ic-figma-line" decorative />} onClick={openInNewTab(ZEN_FIGMA_URL)}>Download Figma</Button>
        </section>

        <section className="official-card-grid" aria-label="Zen platform sections">
          {cards.map((card) => (
            <button key={card.title} className={`official-card official-card--${card.layout}`} onClick={() => card.page && onCardClick(card.page)} type="button">
              <span className="official-card__content">
                <span className="official-card__container">
                  <span className="official-card__icon"><Icon name={card.icon} size="lg" /></span>
                  <span className="official-card__texts">
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                  </span>
                </span>
              </span>
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}

export const pageLabels: Record<PlatformPage, string> = {
  overviews: "Overviews",
  installation: "Installation",
  "design-tokens": "Design Tokens",
  typography: "Typography",
  iconography: "Iconography",
  button: "Button",
  chip: "Chip/Pill",
  sidebar: "Sidebar",
  input: "Input",
  search: "Search",
  segmented: "Segmented",
  toggle: "Toggle",
  avatar: "Avatar",
  checkbox: "Checkbox",
  "radio-button": "Radio Button",
  badge: "Badge",
  popover: "Popover",
  tag: "Tag",
  calendar: "Calendar",
  schedule: "Schedule",
  timeline: "Timeline",
  "date-picker": "Date Picker",
  tooltip: "Tooltip",
  tabs: "Tabs",
  breadcrumbs: "Breadcrumbs",
  progress: "Progress",
  dialog: "Modal & Dialog",
  accordion: "Accordion",
  "alert-banner": "Alert Banner",
  pagination: "Pagination",
  skeleton: "Skeleton",
  toast: "Toast Message",
  divider: "Divider",
  shape: "Shape",
  "empty-state": "Empty State",
  "inline-message": "Inline Message",
  slider: "Slider",
  stepper: "Stepper",
  card: "Card",
  "dock-icon": "Dock Icon",
  "list-item": "List Item",
  table: "Table",
  "sheet-table": "Sheet Table",
  "color-selector": "Color Selector",
  "color-picker": "Color Picker",
  "slider-field": "Slider Field",
  "curve-preview": "Curve Preview",
  metric: "Metric Widget",
  rating: "Rating",
  "side-panel": "Side Panel",
  uploader: "Uploader",
  voice: "Voice",
  "ai-chat": "AI Chat",
  "bottom-navigation": "Bottom Navigation",
  "bottom-sheet": "Bottom Sheet",
  chart: "Chart",
  chat: "Chat",
  "top-navigation": "Top Navigation",
  ...(Object.fromEntries(appLayerPageIds.map((id) => [id, appLayerPages[id]?.label ?? id])) as Record<AppLayerPage, string>),
};

/** Figma B5 breadcrumb row: Docs (the Master crumb, home icon) › the section when it has a page › the current page. */
function getBreadcrumbs(activePage: PlatformPage, activeCollection: string | null): BreadcrumbItemData[] {
  const docs: BreadcrumbItemData = { id: "overviews", label: "Docs", href: "?page=overviews" };
  if (activePage === "design-tokens" && activeCollection) {
    return [docs, { id: "design-tokens", label: "Design Tokens", href: "?page=design-tokens" }, { id: activeCollection, label: collections.find((collection) => collection.slug === activeCollection)?.name ?? activeCollection }];
  }
  if (activePage === "typography" || activePage === "iconography") {
    return [docs, { id: "design-tokens", label: "Foundations", href: "?page=design-tokens" }, { id: activePage, label: pageLabels[activePage] }];
  }
  return [docs, { id: activePage, label: pageLabels[activePage] }];
}

function getInitialPage(): PlatformPage {
  const requestedPage = new URLSearchParams(window.location.search).get("page");
  return requestedPage && requestedPage in pageLabels ? requestedPage as PlatformPage : "overviews";
}

function getInitialCollection(): string | null {
  const requested = new URLSearchParams(window.location.search).get("collection");
  return requested && collections.some((collection) => collection.slug === requested) ? requested : null;
}

/** The live Zen Figma library and the team's feedback board, each in a new tab (the docs' Download Figma and Feedback). */
const ZEN_FIGMA_URL = "https://www.figma.com/design/9nZv4uW2LT21yuHabMTCh1";
const ZEN_FEEDBACK_URL = "https://github.com/Zen-Design-System/Zen-DS/issues/new";
const openInNewTab = (url: string) => () => { window.open(url, "_blank", "noopener,noreferrer"); };

/** Pages that read as text (guides): the B5 720 reading column. Component and foundation pages keep the width their previews need. */
const readingPages = new Set<PlatformPage>(["installation"]);

/** A media query as state (the shell's desktop structure from 1024px, the "On this page" pane from 1280 or 1600px). */
function useMedia(query: string) {
  const subscribe = useCallback((onChange: () => void) => { const list = window.matchMedia(query); list.addEventListener("change", onChange); return () => list.removeEventListener("change", onChange); }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => true);
}

export function PlatformApp() {
  const [activePage, setActivePage] = useState<PlatformPage>(getInitialPage);
  const [activeCollection, setActiveCollection] = useState<string | null>(getInitialCollection);
  const [navOpen, setNavOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [helpful, setHelpful] = useState<"yes" | "no" | null>(null);
  // `?contrast=high` opens the docs in Zen-High-Contrast (the QA scripts' --contrast=high).
  const [settings, setSettings] = useState<PlatformShellSettings>(() => ({ theme: "light", density: "compact", componentTheme: "neutral-s1", typography: "dashboard", radius: "rounded", emphasis: "medium", contrast: typeof window !== "undefined" && new URLSearchParams(window.location.search).get("contrast") === "high" ? "high" : "standard" }));
  const [navQuery, setNavQuery] = useState("");
  const wide = useMedia("(min-width: 1024px)");
  // "On this page" takes 248px: from 1280px on text and foundation pages; component pages keep that width for their
  // previews (a 1512 window leaves them ~1216px, as before B5) and show it from 1600px.
  const tocRoom = useMedia(componentPageIds.includes(activePage) ? "(min-width: 1600px)" : "(min-width: 1280px)");
  const pageRef = useRef<HTMLDivElement>(null);
  const focusDrawerSearch = useRef(false);
  const pageSections = usePageSections(pageRef);
  const componentPage = componentPageIds.includes(activePage);
  const sidebarSections = useMemo(() => getSidebarSections(activePage, activeCollection), [activePage, activeCollection]);
  const visibleSections = useMemo(() => filterSidebarSections(sidebarSections, navQuery), [sidebarSections, navQuery]);
  const navResults = visibleSections.reduce((total, section) => total + section.items.length, 0);
  const query = navQuery.trim();

  // Each page is a history entry, so Back/Forward and shared links work; a new page starts at the top.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", activePage);
    if (activePage === "design-tokens" && activeCollection) url.searchParams.set("collection", activeCollection);
    else url.searchParams.delete("collection");
    const next = `${url.pathname}?${url.searchParams.toString()}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.pushState(null, "", next);
      window.scrollTo({ top: 0 });
    }
    const collectionName = activeCollection ? collections.find((collection) => collection.slug === activeCollection)?.name : undefined;
    document.title = `${collectionName ?? pageLabels[activePage]} · Zen DS`;
    setHelpful(null);
  }, [activePage, activeCollection]);

  // Keep the current page's row visible in the scrolling navigation pane (deep links to pages low in the list).
  useEffect(() => {
    document.querySelector('.official-nav-pane [aria-current="page"]')?.scrollIntoView({ block: "nearest" });
  }, [activePage, activeCollection, wide]);

  // The header Search's `shortcut` focuses it on ⌘/Ctrl+K; on narrow windows the search lives in the drawer, so open it.
  useEffect(() => {
    if (wide) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openDrawerSearch(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [wide]);

  // The drawer focuses the current page's row when it opens; a search request moves focus on to its field.
  useEffect(() => {
    if (!navOpen || !focusDrawerSearch.current) return undefined;
    focusDrawerSearch.current = false;
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector<HTMLInputElement>(".zen-app-shell__drawer .official-nav-search input")?.focus()));
    return () => cancelAnimationFrame(frame);
  }, [navOpen]);

  useEffect(() => {
    const onPopState = () => { setActivePage(getInitialPage()); setActiveCollection(getInitialCollection()); };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // The Appearance panel belongs to component pages: leaving one closes it.
  useEffect(() => { if (!componentPage) setAppearanceOpen(false); }, [componentPage]);

  function openDrawerSearch() { focusDrawerSearch.current = true; setNavOpen(true); }

  const goTo = (page: PlatformPage, collection: string | null = null) => { setActiveCollection(collection); setActivePage(page); };
  const openNavItem = (item: SidebarItem) => {
    if (!item.children?.length) setNavOpen(false);
    if (collections.some((collection) => collection.slug === item.id)) goTo("design-tokens", item.id);
    else if (item.id in pageLabels) goTo(item.id as PlatformPage);
  };

  // Overlays (Modal, Dialog, Side Panel, tooltips) portal into this node inside the platform root, so they inherit the
  // platform's data-theme (light/dark), component theme, density, radius and emphasis.
  const [portalRoot, setPortalRoot] = useState<HTMLDivElement | null>(null);

  const navSearch = (
    <Search
      className="official-nav-search"
      placeholder="Search docs"
      aria-label="Search docs"
      shortcut="k"
      value={navQuery}
      onChange={(event) => setNavQuery(event.target.value)}
      onClear={() => setNavQuery("")}
      onKeyDown={(event) => {
        // Enter opens the first match; Escape clears the query.
        if (event.key === "Enter") {
          const first = visibleSections[0]?.items[0];
          if (first) { openNavItem(first); setNavQuery(""); }
        }
        if (event.key === "Escape" && navQuery) { event.preventDefault(); event.stopPropagation(); setNavQuery(""); }
      }}
    />
  );
  const searchStatus = (
    <Text className="official-nav-status" textStyle="Caption/Regular" tone="light" role="status" aria-live="polite">
      {query ? (navResults ? `${navResults} result${navResults === 1 ? "" : "s"}` : `No pages match “${query}”`) : ""}
    </Text>
  );
  const searchEmpty = query && !navResults ? (
    <EmptyState size="sm" icon="icon-search-medium-line" title="No pages found" headingLevel={2} secondaryAction={{ label: "Clear search", onClick: () => setNavQuery("") }}>
      Nothing matches “{query}”. Try a component name like “Button”.
    </EmptyState>
  ) : null;
  const openFigma = openInNewTab(ZEN_FIGMA_URL);
  const openFeedback = openInNewTab(ZEN_FEEDBACK_URL);
  const appearanceButton = componentPage ? (
    wide
      ? <Button appearance="flat" level="primary" startIcon="icon-sliders-04-line" aria-expanded={appearanceOpen} onClick={() => setAppearanceOpen((open) => !open)}>Appearance</Button>
      : <IconButton appearance="flat" level="primary" icon="icon-sliders-04-line" aria-label="Appearance" aria-expanded={appearanceOpen} onClick={() => setAppearanceOpen((open) => !open)} />
  ) : null;

  return (
    <ZenPortalProvider container={portalRoot}>
    {/* The shell is Typography Configuration Dashboard plus the platform-only Zen-Platform overrides (platform.css);
        component previews apply the Appearance panel's modes themselves. */}
    <div className="official-platform" data-brand="zen" data-theme={settings.theme} data-component-theme={settings.componentTheme} data-density={settings.density} data-radius={settings.radius} data-emphasis={settings.emphasis} data-contrast={settings.contrast} data-typography="dashboard" data-page-width={readingPages.has(activePage) ? "reading" : "wide"}>
      {/* Figma B5 · Docs / Learning (◇ Master-Layout 15917:6719): Layout=Docs on Canvas/Flat, the header across, the docs
          navigation and "On this page" in two Canvas panes (no box). Under 1024px the navigation opens as the drawer. */}
      <AppShell
        className="official-shell"
        pattern="docs"
        canvas="flat"
        layout={wide ? "desktop" : "drawer"}
        navOpen={navOpen}
        onNavOpenChange={setNavOpen}
        navLabel="Documentation"
        header={(
          <AppShellHeader
            leading={(
              <a className="official-brand" href="?page=overviews" aria-label={`Zen DS v${version}, home`} onClick={(event) => { event.preventDefault(); goTo("overviews"); }}>
                <Icon name="icon-zen" size={28} decorative />
                <span className="official-brand__name">
                  {/* zen-allow-visual-heading: Figma B5 brand name (Leading-Slots), a product name inside the home link, not a section title. */}
                  <Text as="span" textStyle="Heading/4">Zen DS</Text>
                  <Badge size="sm" theme="neutral" background="solid" leadingIcon={false}>{`v${version}`}</Badge>
                </span>
              </a>
            )}
            center={wide ? <div role="search">{navSearch}</div> : undefined}
            actions={wide ? (
              <>
                {appearanceButton}
                <PlatformColorModeButton theme={settings.theme} onChange={(theme) => setSettings((current) => ({ ...current, theme }))} />
                <Button appearance="flat" level="primary" onClick={openFeedback}>Feedback</Button>
                <Button level="primary" startIcon="ic-figma-line" onClick={openFigma}>Download Figma</Button>
                <AccountMenu />
              </>
            ) : (
              <>
                <IconButton appearance="flat" level="primary" icon="icon-search-line" aria-label="Search docs" aria-keyshortcuts="Meta+K Control+K" onClick={openDrawerSearch} />
                {appearanceButton}
                <PlatformColorModeButton theme={settings.theme} onChange={(theme) => setSettings((current) => ({ ...current, theme }))} />
                <AccountMenu />
              </>
            )}
          />
        )}
        // Narrow windows: the navigation, its search and the Figma / Feedback links in the drawer's Sidebar.
        sidebar={wide ? undefined : (
          <Sidebar
            className="official-nav-pane official-drawer"
            aria-label="Documentation"
            background="flat"
            shadow={false}
            brand={(
              <span className="official-brand">
                <Icon name="icon-zen" size={28} decorative />
                {/* zen-allow-visual-heading: the product name in the drawer's brand slot, not a section title. */}
                <Text as="span" textStyle="Heading/4">Zen DS</Text>
              </span>
            )}
            search={<div className="official-nav-search-block" role="search">{navSearch}{searchStatus}{searchEmpty}</div>}
            sections={visibleSections}
            onItemClick={openNavItem}
            footer={(
              <>
                <button type="button" onClick={openFigma}><Icon name="ic-figma-line" size="base" decorative /><span>Download Figma</span></button>
                <button type="button" onClick={openFeedback}><Icon name="icon-message-chat-circle-line" size="base" decorative /><span>Feedback</span></button>
              </>
            )}
          />
        )}
        leadingPane={wide ? (
          <AppShellPane theme="canvas" aria-label="Documentation" className="official-nav-pane">
            {query ? <Box paddingX="xs">{searchStatus}</Box> : null}
            {navResults ? <SidebarSubMenu sections={visibleSections} onItemClick={openNavItem} /> : searchEmpty}
            {query ? null : searchStatus}
          </AppShellPane>
        ) : undefined}
        trailingPane={wide && tocRoom && !appearanceOpen && pageSections.length > 1 ? (
          <AppShellPane theme="canvas" aria-label="On this page">
            <PlatformOnThisPage items={pageSections} />
            <Divider />
            <Text textStyle="Body/Small/Medium">Was this page helpful?</Text>
            {helpful ? (
              <Text role="status" textStyle="Body/Small/Regular" tone="light">
                {helpful === "yes" ? "Thanks: glad it helped." : <>Thanks. <Link href={ZEN_FEEDBACK_URL} external>Tell us what was missing</Link></>}
              </Text>
            ) : (
              <Stack direction="row" gap="xs">
                {/* zen-allow-vague-label: Figma B5 Yes / No answer "Was this page helpful?" right above them. */}
                <Button level="tertiary" size="sm" onClick={() => setHelpful("yes")}>Yes</Button>
                {/* zen-allow-vague-label: the answer to the question above. */}
                <Button level="tertiary" size="sm" onClick={() => setHelpful("no")}>No</Button>
              </Stack>
            )}
          </AppShellPane>
        ) : undefined}
        sidePanel={componentPage ? <PlatformAppearancePanel open={appearanceOpen} onOpenChange={setAppearanceOpen} settings={settings} onSettingsChange={(changes) => setSettings((current) => ({ ...current, ...changes }))} /> : undefined}
      >
        {activePage === "overviews" ? null : (
          <Breadcrumbs className="official-breadcrumbs" items={getBreadcrumbs(activePage, activeCollection)}
            onNavigate={(item, event) => { event.preventDefault(); goTo(item.id as PlatformPage); }} />
        )}
        <div ref={pageRef} className="official-page">
          <PlatformTypographyContext value={settings.typography}>
            {activePage === "overviews" ? (
              <OverviewPage onCardClick={(page) => goTo(page)} />
            ) : (
              <PlatformComponentPage page={activePage} activeCollection={activeCollection} onCollectionClick={(slug) => goTo("design-tokens", slug)} />
            )}
          </PlatformTypographyContext>
        </div>
      </AppShell>
      {/* Portalled overlays (Dialog, Side Panel, Toast, Tooltip, Popover…) belong to the component previews, so they take the
          preview typography (the Appearance panel, Dashboard by default) — never the shell's Zen-Platform overrides. */}
      <div ref={setPortalRoot} className="official-portal-root" data-typography={settings.typography} />
    </div>
    </ZenPortalProvider>
  );
}
