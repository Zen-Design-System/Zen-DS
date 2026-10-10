import { useState, type ReactNode } from "react";
import { AlertBanner } from "../../components/AlertBanner";
import { AppShell, AppShellAccount, AppShellAction } from "../../components/AppShell";
import { Avatar, type AvatarTheme } from "../../components/Avatar";
import { Badge } from "../../components/Badge";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { Button, IconButton } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Container, Stack } from "../../components/Layout";
import { Menu, type MenuEntry } from "../../components/Menu";
import { PageHeader } from "../../components/PageHeader";
import { SidePanel } from "../../components/SidePanel";
import { Sidebar, type SidebarSection } from "../../components/Sidebar";
import { Table, TableMedia, TableText } from "../../components/Table";
import { Tabs } from "../../components/Tabs";
import { Text, plural } from "../../components/Text";
import { figmaSidebarBrand } from "../PlatformSidebarBrand";
import { Panel, PlaygroundFilterChip, PlaygroundToggle, keepOnHotUpdate, option } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";
import "./shell.css";

/* ───────────── Sample data ───────────── */

const navSections: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "members", label: "Members", icon: "icon-users-line" },
    { id: "billing", label: "Billing", icon: "icon-credit-card-line" },
  ] },
];
const navLabel = (id: string) => navSections[0].items.find((item) => item.id === id)?.label ?? "Home";
/** Top-bar Breadcrumbs for a first-level page: Home › Page (Figma HR-Platform: Breadcrumbs Small, no Master icon — the toggle leads). */
const shellCrumbs = (id: string) => (id === "home" ? [{ id: "home", label: "Home" }] : [{ id: "home", label: "Home" }, { id, label: navLabel(id) }]);

const members: { id: string; name: string; initials: string; theme: AvatarTheme; email: string; role: string }[] = [
  { id: "ava", name: "Ava Chen", initials: "AC", theme: "blue", email: "ava@zen.studio", role: "Owner" },
  { id: "bao", name: "Bao Nguyen", initials: "BN", theme: "green", email: "bao@zen.studio", role: "Admin" },
  { id: "chi", name: "Chi Tran", initials: "CT", theme: "purple", email: "chi@zen.studio", role: "Member" },
  { id: "duy", name: "Duy Le", initials: "DL", theme: "red", email: "duy@zen.studio", role: "Member" },
];

/** The page's content table sits straight on the page (no Card): usage rules §14. */
function MembersTable() {
  return (
    <Table aria-label="Members" rows={members} getRowId={(row) => row.id}
      columns={[
        { id: "name", header: "Name", cell: (row) => <TableMedia bold media={<Avatar size="small" theme={row.theme} background="subtle" alt="">{row.initials}</Avatar>} caption={row.email}>{row.name}</TableMedia> },
        { id: "role", header: "Role", cell: (row) => <TableText>{row.role}</TableText> },
      ]} />
  );
}

/** The other pages of the sample navigation: an empty state in product copy with its one next step. */
const emptyPages: Record<string, { title: string; body: string; action: string }> = {
  home: { title: "Welcome to Zen Studio", body: "Start your first project, then invite the people who work on it.", action: "New project" },
  projects: { title: "No projects yet", body: "Projects you create show up here for the whole team.", action: "New project" },
  billing: { title: "No invoices yet", body: "Your first invoice arrives on Nov 1, 2026.", action: "Add payment method" },
};
function EmptyPage({ id, onAction }: { id: string; onAction: (label: string) => void }) {
  const page = emptyPages[id] ?? emptyPages.projects;
  return <EmptyState title={page.title} headingLevel={2} illustration={false} primaryAction={{ label: page.action, onClick: () => onAction(page.action) }}>{page.body}</EmptyState>;
}

const accountItems: MenuEntry[] = [
  { id: "profile", label: "Profile", icon: "icon-user-circle-line" },
  { id: "preferences", label: "Preferences", icon: "icon-settings-01-line" },
  { type: "separator" },
  { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line" },
];

/** A preview frame: the shell fills it instead of the whole viewport and scrolls inside it. The outer box contains layout,
 *  so the navigation drawer covers the frame, not the docs page; the inner box scrolls. */
function ShellFrame({ children, height = 520 }: { children: ReactNode; height?: number }) {
  return <div className="pash-frame" style={{ height }}><div className="pash-frame__scroll">{children}</div></div>;
}

/* ───────────── AppShell ───────────── */

function AppShellPlayground() {
  // The preview column is narrower than 1024px even on a desktop screen, so auto would always show the drawer there:
  // desktop screens start on the sidebar layout and get the Layout control; smaller screens keep auto (the drawer),
  // since a Sidebar beside a phone-width page leaves it no room.
  const [wideScreen] = useState(() => typeof window !== "undefined" && Boolean(window.matchMedia?.("(min-width: 1024px)").matches));
  const [layout, setLayout] = useState<"auto" | "sidebar" | "drawer">(wideScreen ? "sidebar" : "auto");
  const [canvas, setCanvas] = useState<"default" | "alt" | "flat">("default");
  // One elevation per screen: the grey Canvas takes the default Sidebar (shadow) and Shadow cards; a white Canvas takes a
  // Surface-alt or Flat Sidebar (optionally with its divider) and bordered cards; the flat Canvas a Flat Sidebar.
  const [sidebarStyle, setSidebarStyle] = useState<"default" | "alt" | "flat">("default");
  const [divider, setDivider] = useState(false);
  const chooseCanvas = (next: "default" | "alt" | "flat") => { setCanvas(next); setSidebarStyle(next === "default" ? "default" : next === "alt" ? "alt" : "flat"); setDivider(false); };
  const [topBar, setTopBar] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<"count" | "dot" | "none">("count");
  const [banner, setBanner] = useState(false);
  const [panel, setPanel] = useState(false);
  const [floating, setFloating] = useState(false);
  const [page, setPage] = useState("members");
  // A playground has no toast host: the last handler that ran shows under the preview.
  const [ran, setRan] = useState<string | null>(null);
  const props = [
    layout === "auto" ? "" : `\n  layout="${layout}" // previews only: apps leave layout on auto`,
    canvas === "default" ? "" : `\n  canvas="${canvas}"`,
    `\n  sidebarCollapsed={collapsed}\n  onSidebarCollapsedChange={setCollapsed}`,
    `\n  sidebar={<Sidebar logo={<Logo />} logoCollapsed={<LogoMark />} productName="Kaiz"${sidebarStyle === "default" ? "" : ` background="${sidebarStyle}"`}${divider ? " divider" : ""} sections={sections} selectedId={page} onItemClick={(item) => navigate(item.id)} />}`,
    topBar ? `\n  header={<Breadcrumbs master={false} items={crumbs} onNavigate={go} />}\n  headerActions={<>\n    <AppShellAction icon="icon-bell-01-line" aria-label="Notifications"${notifications === "count" ? " count={3}" : notifications === "dot" ? " dot" : ""} onClick={openNotifications} />\n    <Menu align="end" trigger={<AppShellAccount name="Ava Chen" theme="blue" />} items={accountItems} onSelect={choose} />\n  </>}` : "",
    banner ? `\n  banner={<AlertBanner theme="info" onClose={dismiss}>Scheduled maintenance tonight, 22:00–23:00.</AlertBanner>}` : "",
    panel ? `\n  aside={<SidePanel type="standard" size="small" title="Ava Chen" open={open} onOpenChange={setOpen}>…</SidePanel>}` : "",
    floating ? `\n  // zen-allow-accent: the assistant launcher is the promoted action (Figma HR-Platform Floating-Item).\n  floatingAction={<IconButton level="accent" icon="icon-zen" aria-label="Ask Zen AI" onClick={openAssistant} />}` : "",
  ].join("");
  // The import line names exactly what the snippet uses.
  const imports = ["AppShell", "Button", "Container", "PageHeader", "Sidebar", "Stack", "Table",
    ...(topBar ? ["AppShellAccount", "AppShellAction", "Breadcrumbs", "Menu"] : []), ...(banner ? ["AlertBanner"] : []),
    ...(panel ? ["SidePanel"] : []), ...(floating ? ["IconButton"] : [])].sort().join(", ");
  // The rail toggle only shows in the sidebar layout: the drawer always opens expanded.
  const railLayout = layout === "sidebar";
  return (
    <Panel
      title="App Shell"
      previewClassName="pash-preview"
      screen
      controls={<>
        {wideScreen ? <PlaygroundFilterChip label="Layout" value={layout} onChange={(value) => setLayout((String(value) || "auto") as "auto" | "sidebar" | "drawer")} options={[option("auto", "Auto (by shell width)"), option("sidebar", "Sidebar"), option("drawer", "Drawer")]} /> : null}
        <PlaygroundFilterChip label="Canvas" value={canvas} onChange={(value) => chooseCanvas((String(value) || "default") as "default" | "alt" | "flat")} options={[option("default", "Default (grey)"), option("alt", "Alt (white)"), option("flat", "Flat")]} />
        {canvas === "alt" ? <PlaygroundFilterChip label="Sidebar" value={sidebarStyle} onChange={(value) => setSidebarStyle((String(value) || "alt") as "alt" | "flat")} options={[option("alt", "Surface-alt"), option("flat", "Flat")]} /> : null}
        {canvas === "alt" ? <PlaygroundToggle label="Sidebar divider" selected={divider} onChange={setDivider} /> : null}
        <PlaygroundToggle label="Top bar" selected={topBar} onChange={setTopBar} />
        {railLayout ? <PlaygroundToggle label="Collapsed" selected={collapsed} onChange={setCollapsed} /> : null}
        <PlaygroundFilterChip label="Notifications" value={notifications} onChange={(value) => setNotifications((String(value) || "count") as "count" | "dot" | "none")} options={[option("count", "Count"), option("dot", "Dot"), option("none", "None")]} />
        <PlaygroundToggle label="Banner" selected={banner} onChange={setBanner} />
        <PlaygroundToggle label="Side panel" selected={panel} onChange={setPanel} />
        <PlaygroundToggle label="Floating action" selected={floating} onChange={setFloating} />
      </>}
      code={`import { ${imports} } from "@zen/design-system";

<AppShell${props}
>
  <Container maxWidth="full">
    <Stack gap="xl">
      <PageHeader title="Members" description="4 people in Zen Studio" actions={<Button level="primary" onClick={invite}>Invite member</Button>} />
      <Table aria-label="Members" rows={members} columns={columns} />
    </Stack>
  </Container>
</AppShell>`}
    >
      <ShellFrame>
        <AppShell
          layout={layout}
          canvas={canvas}
          mainId="pash-playground-main"
          sidebarCollapsed={collapsed}
          onSidebarCollapsedChange={setCollapsed}
          sidebar={<Sidebar {...figmaSidebarBrand} background={sidebarStyle} divider={divider} sections={navSections} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
          header={topBar ? <Breadcrumbs master={false} items={shellCrumbs(page)} onNavigate={(item, event) => { event.preventDefault(); setPage(item.id); }} /> : undefined}
          headerActions={topBar ? <>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={notifications === "count" ? 3 : undefined} dot={notifications === "dot"} onClick={() => { setNotifications("none"); setRan("Notifications · onClick ran, unread cleared"); }} />
            <Menu align="end" trigger={<AppShellAccount name="Ava Chen" theme="blue" />} items={accountItems} onSelect={(item) => setRan(`${item.label} · onSelect ran`)} />
          </> : undefined}
          banner={banner ? <AlertBanner theme="info" onClose={() => setBanner(false)}>Scheduled maintenance tonight, 22:00–23:00.</AlertBanner> : undefined}
          aside={panel ? (
            <SidePanel type="standard" size="small" title="Ava Chen" description="Owner · ava@zen.studio" open onOpenChange={setPanel}>
              {/* One text style for the details: the page around it already uses six (a calm hierarchy stays under ~7). */}
              <Text as="p" textStyle="Body/Base/Regular">Owner of Zen Studio since Jan 12, 2024. Active just now.</Text>
            </SidePanel>
          ) : undefined}
          // zen-allow-accent: Figma HR-Platform Floating-Item — the promoted assistant launcher.
          floatingAction={floating ? <IconButton level="accent" icon="icon-zen" aria-label="Ask Zen AI" onClick={() => setRan("Ask Zen AI · onClick ran")} /> : undefined}
        >
          {/* A list page whose content is a Table (not a widget): the table spans the page, no max width. */}
          <Container maxWidth="full">
            <Stack gap="xl" className="pash-page">
              <PageHeader title={navLabel(page)} description={page === "members" ? `${plural(members.length, "person", "people")} in Zen Studio` : undefined} actions={page === "members" ? <Button level="primary" onClick={() => setRan("Invite member · onClick ran")}>Invite member</Button> : undefined} />
              {page === "members" ? <MembersTable /> : <EmptyPage id={page} onAction={(label) => setRan(`${label} · primaryAction.onClick ran`)} />}
            </Stack>
          </Container>
        </AppShell>
      </ShellFrame>
      {ran ? <Text as="p" textStyle="Body/Small/Regular" tone="light" role="status">{ran}</Text> : null}
    </Panel>
  );
}

/* Figma ◆ HR-Platform (1128:29542), the Time Off module: Breadcrumbs after the toggle, a plan Badge, header actions with a
   notification count, the account menu and the floating assistant. */
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
      code={`import { PageHeader } from "@zen/design-system";

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

export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = keepOnHotUpdate(import.meta.hot, "pages", {
  "app-shell": {
    label: "App Shell",
    eyebrow: "Components / App Shell",
    title: "App Shell",
    description: "The frame of a web app (Figma ◇ Master-Layout, ◆ HR-Platform): Sidebar navigation, a sticky top bar with Breadcrumbs and actions, the page, and optional banner, side panel and floating action. From 1024px the toggle collapses the Sidebar to its rail; narrower, it opens as a drawer.",
    playground: AppShellPlayground,
  },
  "page-header": {
    label: "Page Header",
    eyebrow: "Components / Page Header",
    title: "Page Header",
    description: "The top of an app page: breadcrumbs or Back, the h1 title with meta and actions, a description and section tabs.",
    playground: PageHeaderPlayground,
  },
});

// The examples of these pages live in src/platform/examples/pages/<page>.tsx (examples/registry.ts).
export const examples: ExampleMap = {};
