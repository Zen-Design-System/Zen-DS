import { useEffect, useMemo, useState } from "react";
import { Button, IconButton } from "../components/Button";
import { Sidebar, type SidebarSection } from "../components/Sidebar";
import { Icon, type IconName } from "../components/Icon";
import coverVectorLeft from "../assets/figma/official/cover-vector-left.svg";
import coverVectorRight from "../assets/figma/official/cover-vector-right.svg";
import { collections } from "../foundations/collections";
import { PlatformComponentPage, type PlatformPage } from "./PlatformExamples";
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
const componentNavigation: Array<{ id: PlatformPage; label: string }> = [
  { id: "accordion", label: "Accordion" },
  { id: "alert-banner", label: "Alert Banner" },
  { id: "avatar", label: "Avatar" },
  { id: "badge", label: "Badge" },
  { id: "breadcrumbs", label: "Breadcrumbs" },
  { id: "button", label: "Button" },
  { id: "checkbox", label: "Checkbox" },
  { id: "chip", label: "Chip/Pill" },
  { id: "date-picker", label: "Date Picker" },
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
  { id: "tabs", label: "Tabs" },
  { id: "tag", label: "Tag" },
  { id: "toast", label: "Toast Message" },
  { id: "toggle", label: "Toggle" },
  { id: "tooltip", label: "Tooltip" },
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

function OverviewPage({ onCardClick }: { onCardClick: (page: PlatformPage) => void }) {
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

const pageLabels: Record<PlatformPage, string> = {
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

export function PlatformApp() {
  const [activePage, setActivePage] = useState<PlatformPage>(getInitialPage);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [settings, setSettings] = useState<PlatformShellSettings>({ theme: "light", density: "compact", componentTheme: "neutral-s1", typography: "dashboard", radius: "rounded", emphasis: "medium" });
  const sidebarSections = useMemo(() => getSidebarSections(activePage, activeCollection), [activePage, activeCollection]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", activePage);
    window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
  }, [activePage]);

  return (
    // The shell is Typography Configuration Dashboard plus the platform-only Zen-Platform
    // overrides (platform.css); component previews apply the chip's mode themselves.
    <main className="official-platform" aria-label="Zen Design System platform" data-brand="zen" data-theme={settings.theme} data-component-theme={settings.componentTheme} data-density={settings.density} data-radius={settings.radius} data-emphasis={settings.emphasis} data-typography="dashboard">
      <Sidebar
        className="official-sidebar"
        density="medium"
        brand={(
          <div className="official-sidebar__brand">
            <span className="official-sidebar__brand-mark"><Icon name="icon-zen" size={28} /></span>
            <span className="official-sidebar__brand-name">Zen DS</span>
          </div>
        )}
        sections={sidebarSections}
        onItemClick={(item) => {
          if (collections.some((collection) => collection.slug === item.id)) {
            setActiveCollection(item.id);
            setActivePage("design-tokens");
          } else if (item.id in pageLabels) {
            setActiveCollection(null);
            setActivePage(item.id as PlatformPage);
          }
        }}
        footer={(
          <>
            <button aria-label="Download Figma"><Icon name="ic-figma-line" size="base" /><span>Download Figma</span></button>
            <button aria-label="Feedback"><Icon name="icon-message-chat-circle-line" size="base" /><span>Feedback</span></button>
          </>
        )}
      />

      <section className="official-content">
        <PlatformTopbar breadcrumbs={getBreadcrumbs(activePage, activeCollection)} settings={settings} showSettingsControls={componentPageIds.includes(activePage)} onSettingsChange={(changes) => setSettings((current) => ({ ...current, ...changes }))} />

        <div className="official-page">
          <PlatformTypographyContext value={settings.typography}>
            {activePage === "overviews" ? (
              <OverviewPage onCardClick={setActivePage} />
            ) : (
              <PlatformComponentPage page={activePage} activeCollection={activeCollection} onCollectionClick={(slug) => { setActiveCollection(slug); setActivePage("design-tokens"); }} />
            )}
          </PlatformTypographyContext>
        </div>

        {/* Figma Floating-Actions: Button/Icon-Main Medium Accent with icon-zen, 24px from the corner.
            zen-allow-accent: the floating feedback action is a promoted CTA by design. */}
        <IconButton className="official-feedback" appearance="main" level="accent" size="md" aria-label="Open feedback" icon={<Icon name="icon-zen" decorative />} />
      </section>
    </main>
  );
}
