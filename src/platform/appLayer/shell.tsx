import { useLayoutEffect, useState, type ReactNode } from "react";
import { APPSHELL_COPY, appShellParts } from "../../../tools/studio/appshell-placeholder.mjs";
import { ActionBar } from "../../components/ActionBar";
import { AlertBanner } from "../../components/AlertBanner";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader, AppShellPane, type AppShellCollapse, type AppShellMobileTop, type AppShellPaneTheme, type AppShellPattern } from "../../components/AppShell";
import { Avatar } from "../../components/Avatar";
import { Badge } from "../../components/Badge";
import { BottomNavigation, type BottomNavigationItem } from "../../components/BottomNavigation";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { Button, IconButton } from "../../components/Button";
import { Chip } from "../../components/Chip";
import { DashboardHeader } from "../../components/DashboardHeader";
import { EmptyState } from "../../components/EmptyState";
import { Icon, type IconName } from "../../components/Icon";
import { Stack } from "../../components/Layout";
import { PageHeader } from "../../components/PageHeader";
import { Search } from "../../components/Search";
import { Segmented } from "../../components/Segmented";
import { SidePanel } from "../../components/SidePanel";
import { Sidebar, SidebarMenuItem } from "../../components/Sidebar";
import { Stepper } from "../../components/Stepper";
import { Tabs } from "../../components/Tabs";
import { Text } from "../../components/Text";
import { TopNavigation, type TopNavigationAction } from "../../components/TopNavigation";
import accountPhoto from "../../templates/hr/assets/account-photo.jpg";
import { studio } from "../examples/data";
import { PlatformPhone } from "../PlatformPhone";
import { Panel, PlaygroundFilterChip, PlaygroundToggle, keepOnHotUpdate, option } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";
import "./shell.css";


/* ───────────── Figma's placeholders (tools/studio/appshell-placeholder.mjs) ───────────── */

// User 2026-10-26: "Cần phân biệt rõ AppShell và Layout Example … AppShell nên là dạng placeholder giống component trong
// trang ◇ Master-Layout". The playground draws Figma's Pattern/AppShell with its own placeholders ("Label" rows, Master ›
// Child, "Heading Text", an Empty State, "Replace Component Here" in the panes); real apps are the Layout examples below.
const C = APPSHELL_COPY;
/** The printed code: the same placeholders, without handlers (a frame to design on), the pictures as variables. */
const P = appShellParts({ media: { logo: "{logo}", account: "{photo}" } });

/** .Primitives/AppShell/Placeholder: a dashed Pale box naming what goes there, filling its slot (a pane, the backdrop). */
function Placeholder({ label = C.block, height = "fill" }: { label?: string; height?: "fill" | number | undefined }) {
  return (
    <Stack surface="pale" border="subtle" borderStyle="dashed" radius="lg" padding="md" align="center" justify="center" height={height}>
      <Text textStyle="Heading/4" tone="light">{label}</Text>
    </Stack>
  );
}

/** The workspace switcher of Figma's Sidebar and top bars: the mark, "Đìzai Studio" and its chevron. */
const shellLogo = (
  <Stack direction="row" gap="xs" align="center">
    <Avatar size="small" shape="square" theme="photo" src={studio.logo} alt="" />
    <Text as="span" textStyle="Body/Base/Bold">{C.workspace}</Text>
    <Icon name="icon-chevron-down-line" decorative />
  </Stack>
);
const shellMark = <Avatar size="small" shape="square" theme="photo" src={studio.logo} alt={C.workspace} />;
const labelIds = [1, 2, 3, 4, 5, 6].map((n) => `label-${n}`);
const footerRows = [
  { id: "settings", label: "Settings", icon: "icon-settings-01-line" as IconName },
  { id: "help-center", label: "Help center", icon: "icon-help-circle-line" as IconName },
  { id: "feedback", label: "Feedback", icon: "icon-message-chat-circle-line" as IconName },
];
const bottomItems: BottomNavigationItem[] = [1, 2, 3, 4].map((n) => ({ id: `label-${n}`, label: C.label, icon: "icon-home-smile-line", selectedIcon: "icon-home-smile-solid" }));

/* ───────────── Builder parts ───────────── */

/** A part of the shell: what renders, and the code the builder prints for it. */
type Part = { node: ReactNode; code: string };
const part = (node: ReactNode, code: string): Part => ({ node, code });
/** Indents every line after the first, so a multi-line part sits under the prop that holds it. */
const indent = (code: string, by: string) => code.split("\n").map((line, index) => (index === 0 ? line : by + line)).join("\n");
/** One element, or a fragment of several on their own lines. */
const group = (items: string[]) => (items.length === 1 ? items[0] : `<>\n${items.map((item) => `  ${indent(item, "  ")}`).join("\n")}\n</>`);
/** A JSX prop: on one line, or a multi-line element on its own lines between the braces. */
const attr = (name: string, value: string) => (value.includes("\n") && value.startsWith("<") && !value.startsWith("<>") ? `${name}={\n  ${indent(value, "  ")}\n}` : `${name}={${value}}`);


/** A preview frame: the shell fills it instead of the whole viewport and scrolls inside it. The outer box contains layout,
 *  so the navigation drawer covers the frame, not the docs page; the inner box scrolls. */
function ShellFrame({ children, height }: { children: ReactNode; height: number }) {
  return <div className="pash-frame" style={{ height }}><div className="pash-frame__scroll">{children}</div></div>;
}

type WindowId = "1440" | "1280" | "1180" | "ipad" | "phone";
const windows: Record<WindowId, { label: string; width: number; height: number }> = {
  1440: { label: "Desktop · 1440", width: 1440, height: 900 },
  1280: { label: "Laptop · 1280", width: 1280, height: 800 },
  1180: { label: "iPad landscape · 1180", width: 1180, height: 820 },
  ipad: { label: "iPad portrait · 820", width: 820, height: 1180 },
  phone: { label: "Phone · 390", width: 390, height: 844 },
};

/** The preview row an element sits in: the room inside its padding, and whether Full screen covers the viewport with it. */
function usePreviewRow(element: HTMLElement | null) {
  const [room, setRoom] = useState(0);
  const [full, setFull] = useState(false);
  useLayoutEffect(() => {
    const row = element?.closest<HTMLElement>(".platform-example-row");
    if (!row) return undefined;
    const update = () => {
      const styles = getComputedStyle(row);
      setRoom(row.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight));
      setFull(row.getAttribute("data-fullscreen") === "true");
    };
    update();
    const resize = new ResizeObserver(update);
    resize.observe(row);
    const fullScreen = new MutationObserver(update);
    fullScreen.observe(row, { attributes: true, attributeFilter: ["data-fullscreen"] });
    return () => { resize.disconnect(); fullScreen.disconnect(); };
  }, [element]);
  return { room, full };
}

/**
 * A desktop window at its real CSS width, scaled down to the preview column (the shell lays out at its own width, so
 * `layout="auto"` picks the same structure an app would). In Full screen it fills the viewport instead.
 */
function DesktopWindow({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  const [probe, setProbe] = useState<HTMLSpanElement | null>(null);
  const { room, full } = usePreviewRow(probe);
  const anchor = <span ref={setProbe} hidden />;
  if (full) return <>{anchor}<ShellFrame height={height}>{children}</ShellFrame></>;
  const scale = room > 0 ? Math.min(1, room / width) : 1;
  return (
    <>
      {anchor}
      <div style={{ width: "100%", height: height * scale, visibility: room > 0 ? undefined : "hidden" }}>
        <div style={{ width, height, transform: scale < 1 ? `scale(${scale})` : undefined, transformOrigin: "top left" }}>
          <ShellFrame height={height}>{children}</ShellFrame>
        </div>
      </div>
    </>
  );
}

/** Lines under the preview window; Full screen leaves the viewport to the window. */
function PreviewNotes({ children }: { children: ReactNode }) {
  const [probe, setProbe] = useState<HTMLSpanElement | null>(null);
  const { full } = usePreviewRow(probe);
  return <><span ref={setProbe} hidden />{full ? null : children}</>;
}

/* ───────────── AppShell builder ───────────── */

const patternOptions = [option("sidebar", "Sidebar"), option("list-detail", "List-Detail"), option("top-bar", "Top-Bar"), option("workspace", "Workspace"), option("docs", "Docs"), option("focus", "Focus"), option("grid", "Grid")];
const patternLabel = Object.fromEntries(patternOptions.map((entry) => [entry.id, entry.label])) as Record<AppShellPattern, string>;
type Bottom = "tab-bar" | "floating" | "actions" | "none";
const bottomOptions = [option("tab-bar", "Tab-Bar"), option("floating", "Floating"), option("actions", "Actions"), option("none", "None")];
const topOptions = [option("bar", "Bar"), option("band", "Band"), option("band-sheet", "Band-Sheet"), option("media", "Media")];
const optionLabel = (options: { id: string; label: string }[], id: string) => options.find((entry) => entry.id === id)?.label ?? id;
const SIDEBAR_PATTERNS: AppShellPattern[] = ["sidebar", "list-detail", "grid"];

function AppShellPlayground() {
  // Desktop screens start on a 1440 window (Figma's desktop frame), scaled into the preview; phones start on the phone,
  // where a scaled desktop would be too small to read.
  const [wideScreen] = useState(() => typeof window !== "undefined" && Boolean(window.matchMedia?.("(min-width: 1024px)").matches));
  const [win, setWin] = useState<WindowId>(wideScreen ? "1440" : "phone");
  const [pattern, setPattern] = useState<AppShellPattern>("sidebar");
  const [collapse, setCollapse] = useState<AppShellCollapse>("header");
  const [canvas, setCanvas] = useState<"default" | "alt" | "flat">("default");
  // One elevation per screen: the grey Canvas takes the default Sidebar (shadow) and Shadow panes; a white Canvas a
  // Surface-alt or Flat Sidebar (optionally with its divider) and bordered panes; the flat Canvas a Flat Sidebar.
  const [sidebarStyle, setSidebarStyle] = useState<"default" | "alt" | "flat">("default");
  const [divider, setDivider] = useState(false);
  const chooseCanvas = (next: "default" | "alt" | "flat") => { setCanvas(next); setSidebarStyle(next === "default" ? "default" : next === "alt" ? "alt" : "flat"); setDivider(false); };
  const [collapsed, setCollapsed] = useState(false);
  const [topRow, setTopRow] = useState(true);
  const [withSections, setWithSections] = useState(false);
  const [notifications, setNotifications] = useState<"count" | "dot" | "none">("count");
  const [banner, setBanner] = useState(false);
  const [withLeading, setWithLeading] = useState(true);
  const [withTrailing, setWithTrailing] = useState(true);
  const [withProgress, setWithProgress] = useState(true);
  const [panel, setPanel] = useState(false);
  // Figma's Floating-Actions is on by default.
  const [floating, setFloating] = useState(true);
  const [mobile, setMobile] = useState(!wideScreen);
  const [mobileTop, setMobileTop] = useState<AppShellMobileTop>("bar");
  const [bottom, setBottom] = useState<Bottom>("tab-bar");
  // List-Detail starts on the Sidebar's rail (Figma Sidebar Expand=No).
  const choosePattern = (next: AppShellPattern) => { setPattern(next); setCollapsed(next === "list-detail"); setPanel(false); };
  // A phone or an upright iPad shows the mobile pattern: picking one adds the mobile parts (off again: the drawer).
  const chooseWindow = (next: WindowId) => { setWin(next); if (next === "ipad" || next === "phone") setMobile(true); };
  // The placeholders' own selection, so every row and tab answers a click.
  const [row, setRow] = useState("label-1");
  const [tab, setTab] = useState("label-1");
  const [section, setSection] = useState("label-1");
  // A playground has no toast host: the last handler that ran shows under the preview.
  const [ran, setRan] = useState<string | null>(null);
  const press = (label: string) => () => setRan(`${label} · onClick ran`);

  const sidebarPattern = SIDEBAR_PATTERNS.includes(pattern);
  const paneTheme: AppShellPaneTheme = canvas === "default" ? "shadow" : canvas === "flat" ? "flat-border" : "border";
  const glass = mobileTop === "media";

  /* ——— Header/AppShell: Master › Child, the bell and the account, "Heading Text" ——— */
  const crumbs = part(
    <Breadcrumbs master={false} items={[{ id: "master", label: C.master }, { id: "child", label: C.child }]} onNavigate={(item, event) => { event.preventDefault(); setRan(`${item.label} · onNavigate ran`); }} />,
    P.crumbs,
  );
  const actions = part(
    <>
      <AppShellAction icon="icon-bell-01-solid" aria-label="Notifications" count={notifications === "count" ? 8 : undefined} dot={notifications === "dot"} onClick={press("Notifications")} />
      <AppShellAccount name={C.account} src={accountPhoto} onClick={press(C.account)} />
    </>,
    P.actions({ notifications }),
  );
  const main = part(
    <PageHeader title={C.heading} actions={<>
      <IconButton level="tertiary" icon="icon-settings-01-line" aria-label="Settings" onClick={press("Settings")} />
      <Button level="tertiary" onClick={press(C.secondary)}>{C.secondary}</Button>
      <Button level="primary" onClick={press(C.mainAction)}>{C.mainAction}</Button>
    </>} />,
    P.main,
  );
  const sections = part(
    <Tabs aria-label="Sections" value={section} onValueChange={setSection} items={[1, 2, 3].map((n) => ({ id: `label-${n}`, label: C.label }))} />,
    `<Tabs aria-label="Sections" value={section} onValueChange={setSection} items={[\n${[1, 2, 3].map((n) => `  { id: "label-${n}", label: "${C.label}" },`).join("\n")}\n]} />`,
  );
  const logo = part(shellLogo, P.logo);
  const topTabs = part(
    <>{shellLogo}<Tabs variant="subtle" aria-label="Sections" value={section} onValueChange={setSection} items={[{ id: "label-1", label: C.label }, { id: "label-2", label: C.label }]} /></>,
    group([P.logo, P.tabs]),
  );
  const search = part(<Search aria-label={C.search} placeholder={C.search} />, P.search);
  const focusActions = part(
    <>
      <IconButton level="tertiary" icon="icon-help-circle-line" aria-label="Help" onClick={press("Help")} />
      <Button level="tertiary" onClick={press(C.saveExit)}>{C.saveExit}</Button>
    </>,
    P.focusActions,
  );

  /* ——— Panes, progress, side panel ——— */
  const pane = (title: string, { theme, action = true, height }: { theme?: AppShellPaneTheme; action?: boolean; height?: number } = {}) => part(
    <AppShellPane title={title} theme={theme ?? paneTheme}
      action={action ? <IconButton appearance="flat" level="secondary" size="sm" icon="icon-dots-vertical-line" aria-label={`${title} options`} onClick={press(`${title} options`)} /> : undefined}>
      <Placeholder height={height} />
    </AppShellPane>,
    P.pane({ title, theme: theme ?? (paneTheme === "shadow" ? undefined : paneTheme), action, height }),
  );
  const progress = part(<Stepper aria-label="Steps" current={0} steps={[1, 2, 3].map((n) => ({ id: `step-${n}`, title: C.stepTitle, caption: C.stepCaption }))} />, P.progress);
  const sidePanel = part(
    <SidePanel type="standard" size="small" title={C.paneTitle} open onOpenChange={setPanel}><Placeholder /></SidePanel>,
    P.sidePanel.replace(" open>", " open={panelOpen} onOpenChange={setPanelOpen}>"),
  );

  /* ——— Each pattern's parts (Pattern/AppShell/Desktop) ——— */
  let leading: Part | undefined;
  let center: Part | undefined;
  let headerActions: Part | undefined;
  let headerMain: Part | undefined;
  let leadingPane: Part | undefined;
  let trailingPane: Part | undefined;
  let progressPart: Part | undefined;
  if (sidebarPattern) {
    leading = topRow ? crumbs : undefined;
    headerActions = topRow ? actions : undefined;
    headerMain = main;
    leadingPane = pattern === "list-detail" ? pane(C.paneTitle) : undefined;
  } else if (pattern === "top-bar") {
    leading = topTabs;
    headerActions = actions;
    headerMain = main;
  } else if (pattern === "workspace") {
    leading = logo;
    headerActions = actions;
    leadingPane = withLeading ? pane("Layers") : undefined;
    trailingPane = withTrailing ? pane("Inspector") : undefined;
  } else if (pattern === "docs") {
    leading = logo;
    center = search;
    headerActions = actions;
    headerMain = main;
    leadingPane = withLeading ? pane(C.paneTitle, { theme: "canvas" }) : undefined;
    trailingPane = withTrailing ? pane("On this page", { theme: "canvas", action: false }) : undefined;
  } else {
    leading = logo;
    headerActions = focusActions;
    progressPart = withProgress ? progress : undefined;
    trailingPane = withTrailing ? pane("Summary", { height: 408 }) : undefined;
  }
  const headerSections = sidebarPattern && withSections ? sections : undefined;
  const header = <AppShellHeader leading={leading?.node} center={center?.node} actions={headerActions?.node} main={headerMain?.node} sections={headerSections?.node} />;
  const headerCode = `<AppShellHeader\n${[
    leading && attr("leading", leading.code),
    center && attr("center", center.code),
    headerActions && attr("actions", headerActions.code),
    headerMain && attr("main", headerMain.code),
    headerSections && attr("sections", headerSections.code),
  ].filter(Boolean).map((line) => `  ${indent(line as string, "  ")}`).join("\n")}\n/>`;
  const hasHeader = Boolean(leading || center || headerActions || headerMain || headerSections || (sidebarPattern && collapse === "header"));

  /* ——— Patterns/Sidebar: the switcher and six "Label" rows (Settings · Help center · Feedback below as Figma has them) ——— */
  const footerCount = pattern === "list-detail" ? 1 : collapse === "sidebar" ? 3 : 0;
  const sidebar = part(
    <Sidebar aria-label="Main" logo={shellLogo} logoCollapsed={shellMark} background={sidebarStyle} divider={divider} selectedId={row} onItemClick={(item) => setRow(item.id)}
      footer={footerCount ? <>{footerRows.slice(0, footerCount).map((entry) => <SidebarMenuItem key={entry.id} id={entry.id} label={entry.label} icon={entry.icon} />)}</> : undefined}>
      {labelIds.map((id) => <SidebarMenuItem key={id} id={id} label={C.label} icon="icon-home-03-line" />)}
    </Sidebar>,
    P.sidebar({ footer: footerCount }).replace('  aria-label="Main"', `  aria-label="Main"${sidebarStyle === "default" ? "" : `\n  background="${sidebarStyle}"`}${divider ? "\n  divider" : ""}`),
  );
  const bannerPart = part(<AlertBanner theme="info" onClose={() => setBanner(false)}>{C.banner}</AlertBanner>, P.banner);
  const floatingPart = part(
    // zen-allow-accent: Figma's Floating-Item is the promoted action (Button/Icon-Main Accent).
    <IconButton level="accent" icon="icon-zen" aria-label="Ask Zen AI" onClick={press("Ask Zen AI")} />,
    P.floatingActions,
  );
  const body = part(<EmptyState title={C.emptyTitle} headingLevel={2}>{C.emptyCaption}</EmptyState>, P.body());

  /* ——— Mobile parts (Pattern/AppShell/Mobile) ——— */
  const plus = (label: string): TopNavigationAction => ({ icon: "icon-plus-line", label, onClick: press(label) });
  const topNavigation = part(
    mobileTop === "media" ? <TopNavigation aria-label={C.mobileHeading} topBar leading={plus("Add")} trailing={[plus("New")]} />
      : mobileTop === "band-sheet" ? <TopNavigation largeTitle={C.mobileHeading} largeTitleAction={plus("Create")} />
        : <TopNavigation title={C.mobileHeading} largeTitle={C.mobileHeading} leading={plus("Add")} trailing={[plus("New")]} largeTitleAction={plus("Create")} />,
    P.topNavigation({ top: mobileTop }),
  );
  const hero = part(<Placeholder label={C.hero} height={160} />, P.hero);
  const backdrop = part(<Placeholder label={C.backdrop} />, P.backdrop);
  const bottomNavigation = part(
    <BottomNavigation type={bottom === "floating" ? "floating-glass" : undefined} aria-label="Main" value={tab} onValueChange={setTab} items={bottomItems}
      action={bottom === "floating" ? { icon: "icon-plus-line", label: "Add", onClick: press("Add") } : undefined} />,
    P.bottomNavigation({ bottom }),
  );
  const actionBar = part(
    <ActionBar direction="horizontal" surface={glass ? "glass" : undefined} secondaryAction={{ label: C.button, onClick: press(C.button) }} primaryAction={{ label: C.button, onClick: press(C.button) }} />,
    glass ? P.actionBar.replace('direction="horizontal"', 'direction="horizontal" surface="glass"') : P.actionBar,
  );
  const withHero = mobile && (mobileTop === "band" || mobileTop === "band-sheet");
  const withBackdrop = mobile && mobileTop === "media";
  const showFloating = floating && (sidebarPattern || pattern === "top-bar");

  // zen-allow-pattern-parts: the builder passes each pane and the progress only to the patterns that draw them (the Pattern picker sets pattern).
  const shell = (
    <AppShell
      pattern={pattern}
      collapse={sidebarPattern ? collapse : undefined}
      canvas={canvas}
      mainId="pash-playground-main"
      sidebar={sidebarPattern ? sidebar.node : undefined}
      sidebarCollapsed={sidebarPattern ? collapsed : undefined}
      onSidebarCollapsedChange={sidebarPattern ? setCollapsed : undefined}
      banner={banner ? bannerPart.node : undefined}
      header={hasHeader ? header : undefined}
      leadingPane={leadingPane?.node}
      trailingPane={trailingPane?.node}
      progress={progressPart?.node}
      sidePanel={panel && (sidebarPattern || pattern === "top-bar") ? sidePanel.node : undefined}
      floatingActions={showFloating ? floatingPart.node : undefined}
      mobileTop={mobile ? mobileTop : undefined}
      topNavigation={mobile ? topNavigation.node : undefined}
      hero={withHero ? hero.node : undefined}
      backdrop={withBackdrop ? backdrop.node : undefined}
      bottomNavigation={mobile && (bottom === "tab-bar" || bottom === "floating") ? bottomNavigation.node : undefined}
      actionBar={mobile && bottom === "actions" ? actionBar.node : undefined}
    >
      {body.node}
    </AppShell>
  );

  const withPanel = panel && (sidebarPattern || pattern === "top-bar");
  const props = [
    pattern === "sidebar" ? null : `pattern="${pattern}"`,
    sidebarPattern && collapse !== "header" ? `collapse="${collapse}"` : null,
    canvas === "default" ? null : `canvas="${canvas}"`,
    sidebarPattern ? attr("sidebar", sidebar.code) : null,
    banner ? attr("banner", bannerPart.code) : null,
    hasHeader ? attr("header", headerCode) : null,
    leadingPane ? attr("leadingPane", leadingPane.code) : null,
    trailingPane ? attr("trailingPane", trailingPane.code) : null,
    progressPart ? attr("progress", progressPart.code) : null,
    withPanel ? attr("sidePanel", sidePanel.code) : null,
    showFloating ? `// zen-allow-accent: Figma's Floating-Item is the promoted action (Button/Icon-Main Accent).\n${attr("floatingActions", floatingPart.code)}` : null,
    mobile && mobileTop !== "bar" ? `mobileTop="${mobileTop}"` : null,
    mobile ? attr("topNavigation", topNavigation.code) : null,
    withHero ? attr("hero", hero.code) : null,
    withBackdrop ? attr("backdrop", backdrop.code) : null,
    mobile && (bottom === "tab-bar" || bottom === "floating") ? attr("bottomNavigation", bottomNavigation.code) : null,
    mobile && bottom === "actions" ? attr("actionBar", actionBar.code) : null,
  ].filter(Boolean).map((line) => `  ${indent(line as string, "  ")}`).join("\n");
  const snippet = `<AppShell${props ? `\n${props}\n` : " "}>\n  ${indent(body.code, "  ")}\n</AppShell>`;
  // The import line names exactly the Zen components the snippet uses.
  const imports = [...new Set([...snippet.matchAll(/<([A-Z][A-Za-z]+)/g)].map((match) => match[1]))].sort().join(", ");

  // What the window shows: the desktop pattern from 1024px; narrower the mobile pattern with mobile parts, else the drawer.
  const frame = windows[win];
  const drawn = frame.width >= 1024 ? "desktop" : mobile ? "mobile" : "drawer";
  const note = drawn === "desktop"
    ? `${frame.label}: Pattern/AppShell/Desktop, Layout=${patternLabel[pattern]}${sidebarPattern ? `, Collapse=${optionLabel([option("header", "Header"), option("sidebar", "Sidebar"), option("none", "None")], collapse)}` : ""}${mobile ? "; the mobile parts wait for a window under 1024px" : ""}. Replace each placeholder with your page's own components; the Layout examples below show finished apps.`
    : drawn === "mobile"
      ? `${frame.label}: Pattern/AppShell/Mobile, Top=${optionLabel(topOptions, mobileTop)}, Bottom=${optionLabel(bottomOptions, bottom)}. The header, the panes and the Sidebar wait for 1024px.`
      : `${frame.label}: no mobile parts, so the narrow shell keeps its header${sidebarPattern ? " and opens the Sidebar as a drawer from the menu button" : ""}${leadingPane || trailingPane ? "; the panes stack around the page" : ""}.`;

  return (
    <Panel
      title="App Shell"
      previewClassName="pash-preview"
      screen
      controls={<>
        <PlaygroundFilterChip label="Window" value={win} onChange={(value) => chooseWindow((String(value) || "1440") as WindowId)} options={(Object.keys(windows) as WindowId[]).map((id) => option(id, windows[id].label))} />
        <PlaygroundFilterChip label="Layout" value={pattern} onChange={(value) => choosePattern((String(value) || "sidebar") as AppShellPattern)} options={patternOptions} />
        {sidebarPattern ? <PlaygroundFilterChip label="Collapse" value={collapse} onChange={(value) => setCollapse((String(value) || "header") as AppShellCollapse)} options={[option("header", "Header"), option("sidebar", "Sidebar"), option("none", "None")]} /> : null}
        {sidebarPattern ? <PlaygroundToggle label="Collapsed" selected={collapsed} onChange={setCollapsed} /> : null}
        <PlaygroundFilterChip label="Canvas" value={canvas} onChange={(value) => chooseCanvas((String(value) || "default") as "default" | "alt" | "flat")} options={[option("default", "Default (grey)"), option("alt", "Alt (white)"), option("flat", "Flat")]} />
        {sidebarPattern && canvas === "alt" ? <PlaygroundFilterChip label="Sidebar" value={sidebarStyle} onChange={(value) => setSidebarStyle((String(value) || "alt") as "alt" | "flat")} options={[option("alt", "Surface-alt"), option("flat", "Flat")]} /> : null}
        {sidebarPattern && canvas === "alt" ? <PlaygroundToggle label="Sidebar divider" selected={divider} onChange={setDivider} /> : null}
        {sidebarPattern ? <PlaygroundToggle label="Top row" selected={topRow} onChange={setTopRow} /> : null}
        {sidebarPattern ? <PlaygroundToggle label="Sections" selected={withSections} onChange={setWithSections} /> : null}
        {(sidebarPattern && topRow) || pattern === "top-bar" || pattern === "workspace" || pattern === "docs" ? <PlaygroundFilterChip label="Notifications" value={notifications} onChange={(value) => setNotifications((String(value) || "count") as "count" | "dot" | "none")} options={[option("count", "Count"), option("dot", "Dot"), option("none", "None")]} /> : null}
        {pattern === "workspace" || pattern === "docs" ? <PlaygroundToggle label="Leading pane" selected={withLeading} onChange={setWithLeading} /> : null}
        {pattern === "workspace" || pattern === "docs" || pattern === "focus" ? <PlaygroundToggle label="Trailing pane" selected={withTrailing} onChange={setWithTrailing} /> : null}
        {pattern === "focus" ? <PlaygroundToggle label="Progress" selected={withProgress} onChange={setWithProgress} /> : null}
        {sidebarPattern || pattern === "top-bar" ? <PlaygroundToggle label="Side panel" selected={panel} onChange={setPanel} /> : null}
        {sidebarPattern || pattern === "top-bar" ? <PlaygroundToggle label="Floating actions" selected={floating} onChange={setFloating} /> : null}
        <PlaygroundToggle label="Banner" selected={banner} onChange={setBanner} />
        <PlaygroundToggle label="Mobile parts" selected={mobile} onChange={setMobile} />
        {mobile ? <PlaygroundFilterChip label="Mobile top" value={mobileTop} onChange={(value) => setMobileTop((String(value) || "bar") as AppShellMobileTop)} options={topOptions} /> : null}
        {mobile ? <PlaygroundFilterChip label="Mobile bottom" value={bottom} onChange={(value) => setBottom((String(value) || "tab-bar") as Bottom)} options={bottomOptions} /> : null}
      </>}
      code={`import { ${imports} } from "@zen-ds/react";\n\n${snippet}`}
    >
      {win === "ipad" || win === "phone" ? (
        <Stack align="center" width="fill">
          <PlatformPhone key={win} device={win === "ipad" ? "ipad" : "iphone"} label="App Shell preview" maxHeight={720}
            canvas={mobile && (mobileTop === "band-sheet" || mobileTop === "media") ? "surface" : canvas === "default" ? "default" : canvas}
            statusBar={mobile && mobileTop === "media" ? "light" : "dark"}>
            {shell}
          </PlatformPhone>
        </Stack>
      ) : (
        <DesktopWindow key={win} width={frame.width} height={frame.height}>{shell}</DesktopWindow>
      )}
      <PreviewNotes>
        <Text as="p" textStyle="Body/Small/Regular" tone="base">{note}</Text>
        {ran ? <Text as="p" textStyle="Body/Small/Regular" tone="light" role="status">{ran}</Text> : null}
      </PreviewNotes>
    </Panel>
  );
}


/* ───────────── PageHeader ───────────── */

function PageHeaderPlayground() {
  const [withActions, setWithActions] = useState(true);
  const [withTabs, setWithTabs] = useState(false);
  const [withBreadcrumbs, setWithBreadcrumbs] = useState(false);
  const [withBack, setWithBack] = useState(false);
  const [tab, setTab] = useState("overview");
  const [clicks, setClicks] = useState(0);
  // Share reports what ran under the preview; Publish toggles the status (a playground has no toast host).
  const [shared, setShared] = useState(false);
  const [published, setPublished] = useState(false);
  return (
    <Panel
      title="Page Header"
      previewClassName="pash-preview"
      controls={<>
        <PlaygroundToggle label="Actions" selected={withActions} onChange={setWithActions} />
        <PlaygroundToggle label="Breadcrumbs" selected={withBreadcrumbs} onChange={setWithBreadcrumbs} />
        <PlaygroundToggle label="Back" selected={withBack} onChange={setWithBack} />
        <PlaygroundToggle label="Tabs" selected={withTabs} onChange={setWithTabs} />
      </>}
      code={`import { PageHeader } from "@zen-ds/react";

<PageHeader
  title="Brand refresh"
  description="Logo, colour and type updates for the 2026 launch."${withBack ? `
  back={{ label: "Projects", onClick: goBack }}` : ""}${withBreadcrumbs ? `
  breadcrumbs={<Breadcrumbs items={[{ id: "projects", label: "Projects" }, { id: "brand", label: "Brand refresh" }]} />}` : ""}${withActions ? `
  actions={<><Button level="tertiary" onClick={share}>Share</Button><Button level="primary" onClick={publish}>Publish</Button></>}` : ""}${withTabs ? `
  tabs={<Tabs aria-label="Project sections" items={sections} value={tab} onChange={setTab} />}` : ""}
/>`}
    >
      <div className="pash-page-header-stage">
        <PageHeader
          title="Brand refresh"
          description="Logo, colour and type updates for the 2026 launch."
          back={withBack ? { label: "Projects", onClick: () => setClicks((count) => count + 1) } : undefined}
          breadcrumbs={withBreadcrumbs ? <Breadcrumbs items={[{ id: "projects", label: "Projects" }, { id: "brand", label: "Brand refresh" }]} onNavigate={(_item, event) => event.preventDefault()} /> : undefined}
          meta={<Badge size="small" theme="green" background="subtle">{clicks ? "Back pressed" : published ? "Published" : "In review"}</Badge>}
          actions={withActions ? <><Button level="tertiary" onClick={() => setShared(true)}>Share</Button><Button level={published ? "tertiary" : "primary"} onClick={() => setPublished(!published)}>{published ? "Unpublish" : "Publish"}</Button></> : undefined}
          tabs={withTabs ? <Tabs aria-label="Project sections" items={[{ id: "overview", label: "Overview" }, { id: "files", label: "Files" }, { id: "activity", label: "Activity" }]} value={tab} onChange={setTab} /> : undefined}
        />
      </div>
      {shared ? <Text as="p" textStyle="Body/Small/Regular" tone="light" role="status">“Share” pressed · onClick ran</Text> : null}
    </Panel>
  );
}

type DashboardRow = "control-bar" | "navigation" | "main" | "custom";
const dashboardRows = [option("control-bar", "Control-Bar"), option("navigation", "Navigation"), option("main", "Main"), option("custom", "Custom")];

/** Dashboard Header playground: Figma's Type and each type's booleans (Search, Controls, Subheading, Actions,
 *  Nav-Center-Block, Nav-Trailing-Block, Child-Heading), on the row as the sections of an AppShell pad it. */
function DashboardHeaderPlayground() {
  const [type, setType] = useState<DashboardRow>("control-bar");
  const [search, setSearch] = useState(true);
  const [controls, setControls] = useState(true);
  const [subheading, setSubheading] = useState(false);
  const [actions, setActions] = useState(true);
  const [center, setCenter] = useState(false);
  const [trailing, setTrailing] = useState(true);
  const [childTitle, setChildTitle] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [ran, setRan] = useState<string | null>(null);
  const actionButtons = <><Button level="tertiary" onClick={() => setRan("“Export report” pressed · onClick ran")}>Export report</Button><Button level="primary" onClick={() => setRan("“Submit leave” pressed · onClick ran")}>Submit leave</Button></>;
  const statusChip = (
    <Chip variant="advanced" dropdown selected={status !== null} popoverLabel="Status" popoverItems={["Pending", "Approved", "Declined"].map((id) => ({ id, label: id, selected: status === id }))}
      onPopoverSelect={(item) => setStatus(status === item.id ? null : item.id)} onClearSelection={() => setStatus(null)}>{status ?? "Status"}</Chip>
  );
  const icons = <><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={8} onClick={() => setRan("Notifications pressed · onClick ran")} /><Avatar size="md" alt="Alex Duong" theme="indigo">AD</Avatar></>;
  const toggles = type === "control-bar"
    ? <><PlaygroundToggle label="Search" selected={search} onChange={setSearch} /><PlaygroundToggle label="Controls" selected={controls} onChange={setControls} /><PlaygroundToggle label="Subheading" selected={subheading} onChange={setSubheading} /><PlaygroundToggle label="Actions" selected={actions} onChange={setActions} /></>
    : type === "navigation"
      ? <><PlaygroundToggle label="Nav-Center-Block" selected={center} onChange={setCenter} /><PlaygroundToggle label="Nav-Trailing-Block" selected={trailing} onChange={setTrailing} /></>
      : type === "main"
        ? <><PlaygroundToggle label="Child-Heading" selected={childTitle} onChange={setChildTitle} /><PlaygroundToggle label="Subheading" selected={subheading} onChange={setSubheading} /><PlaygroundToggle label="Actions" selected={actions} onChange={setActions} /><PlaygroundToggle label="Nav-Trailing-Block" selected={trailing} onChange={setTrailing} /></>
        : null;
  const code = type === "control-bar"
    ? `<DashboardHeader${search ? `\n  search={<Search size="md" placeholder="Search leave requests" onValueChange={setQuery} />}` : ""}${controls ? "\n  controls={<Chip variant=\"advanced\" dropdown popoverLabel=\"Status\" popoverItems={statuses} onPopoverSelect={pick}>Status</Chip>}" : ""}${subheading ? "\n  subheading=\"96 results\"" : ""}${actions ? "\n  actions={<><Button level=\"tertiary\" onClick={exportCsv}>Export report</Button><Button level=\"primary\" onClick={submitLeave}>Submit leave</Button></>}" : ""}\n/>`
    : type === "navigation"
      ? `<DashboardHeader\n  type="navigation"\n  leading={<Breadcrumbs items={trail} onNavigate={go} />}${center ? "\n  center={<Search size=\"md\" placeholder=\"Search Đìzai Studio\" />}" : ""}${trailing ? "\n  trailing={<><AppShellAction icon=\"icon-bell-01-line\" aria-label=\"Notifications\" count={8} onClick={openInbox} /><Avatar size=\"md\" alt=\"Alex Duong\">AD</Avatar></>}" : ""}\n/>`
      : type === "main"
        ? `<DashboardHeader\n  type="main"\n  title="My leaves"${childTitle ? "\n  childTitle=\"2026\"" : ""}${subheading ? "\n  subheading=\"12 days left this year.\"" : ""}${actions ? "\n  actions={<><Button level=\"tertiary\" onClick={exportCsv}>Export report</Button><Button level=\"primary\" onClick={submitLeave}>Submit leave</Button></>}" : ""}${trailing ? "\n  trailing={<AppShellAction icon=\"icon-bell-01-line\" aria-label=\"Notifications\" count={8} onClick={openInbox} />}" : ""}\n/>`
        : `<DashboardHeader type="custom">\n  <Segmented aria-label="Reporting period" options={periods} value={period} onValueChange={setPeriod} />\n  <Text textStyle="Body/Base/Medium">Sep 1 – Sep 30, 2026</Text>\n</DashboardHeader>`;
  return (
    <Panel
      title="Dashboard Header"
      previewClassName="pash-preview"
      controls={<>
        <PlaygroundFilterChip label="Type" value={type} onChange={(value) => setType((String(value) || "control-bar") as DashboardRow)} options={dashboardRows} />
        {toggles}
      </>}
      code={`import { DashboardHeader } from "@zen-ds/react";\n\n${code}`}
    >
      <div className="pash-dashboard-header-stage">
        {type === "control-bar" ? (
          <DashboardHeader search={search ? <Search size="md" placeholder="Search leave requests" /> : undefined} controls={controls ? statusChip : undefined} subheading={subheading ? "96 results" : undefined} actions={actions ? actionButtons : undefined} />
        ) : type === "navigation" ? (
          <DashboardHeader type="navigation" leading={<Breadcrumbs items={[{ id: "home", label: "Home" }, { id: "leaves", label: "My leaves" }]} onNavigate={(_item, event) => event.preventDefault()} />} center={center ? <Search size="md" placeholder="Search Đìzai Studio" /> : undefined} trailing={trailing ? icons : undefined} />
        ) : type === "main" ? (
          <DashboardHeader type="main" title="My leaves" childTitle={childTitle ? "2026" : undefined} subheading={subheading ? "12 days left this year." : undefined} actions={actions ? actionButtons : undefined} trailing={trailing ? <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={8} onClick={() => setRan("Notifications pressed · onClick ran")} /> : undefined} />
        ) : (
          <DashboardHeader type="custom"><Segmented aria-label="Reporting period" options={[{ id: "week", label: "Week" }, { id: "month", label: "Month" }]} defaultValue="month" /><Text textStyle="Body/Base/Medium">Sep 1 – Sep 30, 2026</Text></DashboardHeader>
        )}
      </div>
      {ran ? <Text as="p" textStyle="Body/Small/Regular" tone="light" role="status">{ran}</Text> : null}
    </Panel>
  );
}


export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = keepOnHotUpdate(import.meta.hot, "pages", {
  "app-shell": {
    label: "App Shell",
    eyebrow: "Components / App Shell",
    title: "App Shell",
    description: "The app's frame, as Figma's Pattern/AppShell components (◇ Master-Layout) draw it: a placeholder to design on, with \"Label\" rows, Master › Child, \"Heading Text\", an Empty State and \"Replace Component Here\" in every pane. Pick the desktop Layout (Sidebar, List-Detail, Top-Bar, Workspace, Docs, Focus, Grid) and where the Sidebar's toggle sits, then the mobile parts (Top Bar, Band, Band-Sheet or Media; Bottom Tab-Bar, Floating or Actions), and replace each placeholder with your page's components. The Layout examples below are finished apps built on it.",
    playground: AppShellPlayground,
  },
  "page-header": {
    label: "Page Header",
    eyebrow: "Components / Page Header",
    title: "Page Header",
    description: "The top of an app page: breadcrumbs or Back, the h1 title with meta and actions, a description and section tabs.",
    playground: PageHeaderPlayground,
  },
  "dashboard-header": {
    label: "Dashboard Header",
    eyebrow: "Components / Dashboard Header",
    title: "Dashboard Header",
    description: "One row of a dashboard page's header (Figma ◇ Master-Layout Primitives/Dashboard/Header): a control bar with Search, filters, the result count and the page's actions; a navigation bar; the page title row; or your own row. Inside an AppShell the rows go in sections.",
    playground: DashboardHeaderPlayground,
  },
});

// The examples of these pages live in src/platform/examples/pages/<page>.tsx (examples/registry.ts).
export const examples: ExampleMap = {};
