import { useEffect, useMemo, useState } from "react";
import { ZenPortalProvider } from "../components/Portal";
import { Button } from "../components/Button";
import { Sidebar, type SidebarItem, type SidebarSection } from "../components/Sidebar";
import { EmptyState } from "../components/EmptyState";
import { Search } from "../components/Search";
import { Icon, type IconName } from "../components/Icon";
import coverVectorLeft from "../assets/figma/official/cover-vector-left.svg";
import coverVectorRight from "../assets/figma/official/cover-vector-right.svg";
import { collections } from "../foundations/collections";
import { PlatformComponentPage, type PlatformPage } from "./PlatformExamples";
import { appLayerPages } from "./PlatformAppLayer";
import { appLayerPageIds, type AppLayerPage } from "./appLayer/types";
import { PlatformTopbar, PlatformTypographyContext, type PlatformBreadcrumb, type PlatformShellSettings } from "./PlatformTemplate";
import { typographyStyles } from "../tokens/typography.generated";
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
  { id: "metric", label: "Metric Widget" },
  { id: "rating", label: "Rating" },
  { id: "side-panel", label: "Side Panel" },
  { id: "uploader", label: "Uploader" },
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
  { id: "search", label: "Search" },
  { id: "segmented", label: "Segmented" },
  { id: "sidebar", label: "Sidebar" },
  { id: "skeleton", label: "Skeleton" },
  { id: "slider", label: "Slider" },
  { id: "stepper", label: "Stepper" },
  { id: "table", label: "Table" },
  { id: "tabs", label: "Tabs" },
  { id: "tag", label: "Tag" },
  { id: "toast", label: "Toast Message" },
  { id: "toggle", label: "Toggle" },
  { id: "tooltip", label: "Tooltip" },
  // Phase-2 app layer (src/platform/appLayer/*): each page appears once its group module defines it.
  ...Object.entries(appLayerPages).map(([id, meta]) => ({ id: id as PlatformPage, label: meta!.label })),
];
const componentPageIds = componentNavigation.map((item) => item.id);

function getSidebarSections(activePage: PlatformPage, activeCollection: string | null): SidebarSection[] {
  return [
    { items: [
      { id: "overviews", label: "Overviews", active: activePage === "overviews", icon: <Icon name="icon-home-03-line" size="base" /> },
      { id: "installation", label: "Installation", active: activePage === "installation", icon: <Icon name="icon-disc-line" size="base" /> },
    ] },
    { label: "Foundation", items: [
      { id: "design-tokens", label: "Design Tokens", active: activePage === "design-tokens", dropdown: true, icon: <Icon name="icon-beaker-01-line" size="base" />, children: collections.map((collection) => ({ id: collection.slug, label: collection.name, active: activeCollection === collection.slug })) },
      { id: "typography", label: "Typography", active: activePage === "typography", icon: <Icon name="icon-type-01-line" size="base" /> },
      { id: "iconography", label: "Iconography", active: activePage === "iconography", icon: <Icon name="icon-bezier-curve-02-line" size="base" /> },
    ] },
    // Components are listed A–Z by their label (new pages land in order automatically).
    { label: "Components", items: componentNavigation
      .map(({ id, label }) => ({ id, label, active: activePage === id, icon: <Icon name="icon-cube-line" size="base" /> }))
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
        const children = (item.children ?? []).filter((child) => matches(child.label))
          .map((child) => ({ ...child, icon: item.icon }));
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
          <Button className="official-download" level="primary" size="lg" startIcon={<Icon name="ic-figma-line" decorative />}>Download Figma</Button>
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
  "empty-state": "Empty State",
  "inline-message": "Inline Message",
  slider: "Slider",
  stepper: "Stepper",
  card: "Card",
  "dock-icon": "Dock Icon",
  "list-item": "List Item",
  table: "Table",
  "color-selector": "Color Selector",
  metric: "Metric Widget",
  rating: "Rating",
  "side-panel": "Side Panel",
  uploader: "Uploader",
  "ai-chat": "AI Chat",
  "bottom-navigation": "Bottom Navigation",
  "bottom-sheet": "Bottom Sheet",
  chart: "Chart",
  chat: "Chat",
  "top-navigation": "Top Navigation",
  ...(Object.fromEntries(appLayerPageIds.map((id) => [id, appLayerPages[id]?.label ?? id])) as Record<AppLayerPage, string>),
};

function getBreadcrumbs(activePage: PlatformPage, activeCollection: string | null): PlatformBreadcrumb[] {
  if (activePage === "overviews") return [{ label: "Overviews", current: true }];
  if (activePage === "installation") return [{ label: "Installation", current: true }];
  if (activePage === "design-tokens") {
    return activeCollection
      ? [{ label: "Design Tokens" }, { label: collections.find((collection) => collection.slug === activeCollection)?.name ?? activeCollection, current: true }]
      : [{ label: "Design Tokens", current: true }];
  }
  const foundationPages: PlatformPage[] = ["typography", "iconography"];
  if (componentPageIds.includes(activePage)) return [{ label: pageLabels[activePage], current: true }];
  return [{ label: foundationPages.includes(activePage) ? "Foundations" : "Components" }, { label: pageLabels[activePage], current: true }];
}

function getInitialPage(): PlatformPage {
  const requestedPage = new URLSearchParams(window.location.search).get("page");
  return requestedPage && requestedPage in pageLabels ? requestedPage as PlatformPage : "overviews";
}

function getInitialCollection(): string | null {
  const requested = new URLSearchParams(window.location.search).get("collection");
  return requested && collections.some((collection) => collection.slug === requested) ? requested : null;
}

export function PlatformApp() {
  const [activePage, setActivePage] = useState<PlatformPage>(getInitialPage);
  const [activeCollection, setActiveCollection] = useState<string | null>(getInitialCollection);
  const [navOpen, setNavOpen] = useState(false);
  // `?contrast=high` opens the docs in Zen-High-Contrast (the QA scripts' --contrast=high).
  const [settings, setSettings] = useState<PlatformShellSettings>(() => ({ theme: "light", density: "compact", componentTheme: "neutral-s1", typography: "dashboard", radius: "rounded", emphasis: "medium", contrast: typeof window !== "undefined" && new URLSearchParams(window.location.search).get("contrast") === "high" ? "high" : "standard" }));
  const [navQuery, setNavQuery] = useState("");
  const sidebarSections = useMemo(() => getSidebarSections(activePage, activeCollection), [activePage, activeCollection]);
  const visibleSections = useMemo(() => filterSidebarSections(sidebarSections, navQuery), [sidebarSections, navQuery]);
  const navResults = visibleSections.reduce((total, section) => total + section.items.length, 0);

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
  }, [activePage, activeCollection]);

  // Keep the current page's item visible in the scrolling rail (deep links to pages low in the list).
  useEffect(() => {
    document.querySelector('.official-sidebar [aria-current="page"]')?.scrollIntoView({ block: "nearest" });
  }, [activePage, activeCollection]);

  // Search's `shortcut` focuses the field on ⌘/Ctrl+K; on narrow screens the drawer must open too.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") setNavOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openNavItem = (item: SidebarItem) => {
    if (!item.children?.length) setNavOpen(false);
    if (collections.some((collection) => collection.slug === item.id)) {
      setActiveCollection(item.id);
      setActivePage("design-tokens");
    } else if (item.id in pageLabels) {
      setActiveCollection(null);
      setActivePage(item.id as PlatformPage);
    }
  };

  useEffect(() => {
    const onPopState =() => { setActivePage(getInitialPage()); setActiveCollection(getInitialCollection()); };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Narrow viewports: the navigation is a drawer; Escape closes it.
  useEffect(() => {
    if (!navOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setNavOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  // Overlays (Modal, Dialog, Side Panel, tooltips) portal into this node inside <main>, so they inherit the
  // platform's data-theme (light/dark), component theme, density, radius and emphasis.
  const [portalRoot, setPortalRoot] = useState<HTMLDivElement | null>(null);

  return (
    <ZenPortalProvider container={portalRoot}>
    {/* The shell is Typography Configuration Dashboard plus the platform-only Zen-Platform
        overrides (platform.css); component previews apply the chip's mode themselves. */}
    <main className="official-platform" aria-label="Zen Design System platform" data-nav-open={navOpen ? "true" : undefined} data-brand="zen" data-theme={settings.theme} data-component-theme={settings.componentTheme} data-density={settings.density} data-radius={settings.radius} data-emphasis={settings.emphasis} data-contrast={settings.contrast} data-typography="dashboard">
      <div id="official-navigation" className="official-nav">
      <Sidebar
        className="official-sidebar"
        density="medium"
        brand={(
          <div className="official-sidebar__brand">
            <span className="official-sidebar__brand-mark"><Icon name="icon-zen" size={28} /></span>
            <span className="official-sidebar__brand-name">Zen DS</span>
          </div>
        )}
        search={(
          <div className="official-sidebar__search" role="search">
            <Search
              size="small"
              placeholder="Search pages"
              aria-label="Search components and pages"
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
            <span className="official-sidebar__search-status" role="status" aria-live="polite" data-empty={navQuery.trim() && !navResults ? "true" : undefined}>
              {navQuery.trim() ? (navResults ? `${navResults} result${navResults === 1 ? "" : "s"}` : `No pages match “${navQuery.trim()}”`) : ""}
            </span>
            {navQuery.trim() && !navResults ? (
              <EmptyState className="official-sidebar__empty" title="No pages found" illustration={false} secondaryAction={{ label: "Clear search", onClick: () => setNavQuery("") }}>
                Nothing matches “{navQuery.trim()}”. Try a component name like “Button”.
              </EmptyState>
            ) : null}
          </div>
        )}
        sections={visibleSections}
        onItemClick={openNavItem}
        footer={(
          <>
            <button aria-label="Download Figma"><Icon name="ic-figma-line" size="base" /><span>Download Figma</span></button>
            <button aria-label="Feedback"><Icon name="icon-message-chat-circle-line" size="base" /><span>Feedback</span></button>
          </>
        )}
      />
      </div>
      {navOpen ? <button type="button" className="official-scrim" aria-label="Close navigation" tabIndex={-1} onClick={() => setNavOpen(false)} /> : null}

      <section className="official-content">
        <PlatformTopbar breadcrumbs={getBreadcrumbs(activePage, activeCollection)} settings={settings} showSettingsControls={componentPageIds.includes(activePage)} onSettingsChange={(changes) => setSettings((current) => ({ ...current, ...changes }))} navOpen={navOpen} onMenuClick={() => setNavOpen((open) => !open)} />

        <div className="official-page">
          <PlatformTypographyContext value={settings.typography}>
            {activePage === "overviews" ? (
              <OverviewPage onCardClick={setActivePage} />
            ) : (
              <PlatformComponentPage page={activePage} activeCollection={activeCollection} onCollectionClick={(slug) => { setActiveCollection(slug); setActivePage("design-tokens"); }} />
            )}
          </PlatformTypographyContext>
        </div>

      </section>
      {/* Portalled overlays (Dialog, Side Panel, Toast, Tooltip, Popover…) belong to the component previews, so they take the
          preview typography (the topbar chip, Dashboard by default) — never the shell's Zen-Platform overrides. */}
      <div ref={setPortalRoot} className="official-portal-root" data-typography={settings.typography} />
    </main>
    </ZenPortalProvider>
  );
}
