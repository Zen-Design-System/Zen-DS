import { useState, type ReactNode } from "react";
import { AlertBanner } from "../../components/AlertBanner";
import { AppShell, AppShellAccount, AppShellAction } from "../../components/AppShell";
import { Avatar, type AvatarTheme } from "../../components/Avatar";
import { Badge, BadgeCounter } from "../../components/Badge";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { Button, IconButton } from "../../components/Button";
import { Card } from "../../components/Card";
import { DescriptionList } from "../../components/DescriptionList";
import { DockIcon } from "../../components/DockIcon";
import { EmptyState } from "../../components/EmptyState";
import { Icon, type IconName } from "../../components/Icon";
import { Container, Stack } from "../../components/Layout";
import { List, ListItem } from "../../components/ListItem";
import { Menu, type MenuEntry } from "../../components/Menu";
import { PageHeader } from "../../components/PageHeader";
import { SidePanel } from "../../components/SidePanel";
import { Sidebar, type SidebarSection } from "../../components/Sidebar";
import { Table, TableMedia, TableText } from "../../components/Table";
import { Tabs } from "../../components/Tabs";
import { Text, plural } from "../../components/Text";
import { useToast } from "../../components/Toast";
import { DemoFieldDialog } from "../PlatformDemoActions";
import { figmaSidebarBrand } from "../PlatformSidebarBrand";
import { Panel, PlaygroundFilterChip, PlaygroundToggle, keepOnHotUpdate, option } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";
import { BillingBannerExample, HomeRailExample, HrPhoneExample, HrWorkspaceExample, PeopleAdminExample, TimeOffDrawerExample, WorkbenchFlatExample } from "./shellScreens";
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
              <DescriptionList layout="stacked" items={[{ term: "Role", description: "Owner" }, { term: "Joined", description: "Jan 12, 2024" }, { term: "Last active", description: "Just now" }]} />
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

function ListPageHeaderExample() {
  const { toast } = useToast();
  const [count, setCount] = useState(4);
  return <PageHeader title="Members" meta={<BadgeCounter value={count} />} description={`${plural(count, "person", "people")} can access Zen Studio.`} actions={<><Button level="tertiary" onClick={() => toast({ type: "positive", title: `Exported ${plural(count, "member")} as CSV` })}>Export</Button><Button level="primary" onClick={() => setCount((value) => value + 1)}>Invite member</Button></>} />;
}

const headerProjects: { id: string; name: string; description: string; files: number; icon: IconName }[] = [
  { id: "brand", name: "Brand refresh", description: "Logo, colour and type updates for the 2026 launch.", files: 12, icon: "icon-palette-solid" },
  { id: "site", name: "Website relaunch", description: "New pricing and product pages before the November launch.", files: 8, icon: "icon-browser-solid" },
  { id: "beta", name: "Mobile app beta", description: "Onboarding and payments for the first 500 testers.", files: 5, icon: "icon-rocket-solid" },
];

/** Back returns to the Projects list inside the demo; a project row opens its detail page again. */
function DetailPageHeaderExample() {
  const [openId, setOpenId] = useState<string | null>("brand");
  const [tab, setTab] = useState("overview");
  const [published, setPublished] = useState<string[]>([]);
  const project = headerProjects.find((entry) => entry.id === openId);
  if (!project) {
    return (
      <Stack gap="lg">
        <PageHeader title="Projects" description={`${plural(headerProjects.length, "project")} in Zen Studio.`} />
        <Card theme="border" spacing="small" className="pe-list-card">
          <List aria-label="Projects">
            {headerProjects.map((entry) => {
              const live = published.includes(entry.id);
              return (
                <ListItem key={entry.id} title={entry.name} caption={`${plural(entry.files, "file")} · ${live ? "Published" : "In review"}`}
                  leading={<DockIcon icon={entry.icon} theme="neutral" background="subtle" />}
                  trailing={<Icon name="icon-chevron-right-line-small" decorative />}
                  onClick={() => { setOpenId(entry.id); setTab("overview"); }} />
              );
            })}
          </List>
        </Card>
      </Stack>
    );
  }
  const isPublished = published.includes(project.id);
  return (
    <PageHeader
      back={{ label: "Projects", onClick: () => setOpenId(null) }}
      title={project.name}
      meta={<Badge size="small" theme={isPublished ? "blue" : "green"} background="subtle">{isPublished ? "Published" : "In review"}</Badge>}
      description={project.description}
      actions={<Button level={isPublished ? "tertiary" : "primary"} onClick={() => setPublished((list) => (isPublished ? list.filter((id) => id !== project.id) : [...list, project.id]))}>{isPublished ? "Unpublish" : "Publish"}</Button>}
      tabs={<Tabs aria-label="Project sections" items={[{ id: "overview", label: "Overview" }, { id: "files", label: "Files", badge: project.files }, { id: "activity", label: "Activity" }]} value={tab} onChange={setTab} />}
    />
  );
}

type SettingsRoute = "settings" | "billing" | "invoices";
const settingsCrumbs: Record<SettingsRoute, { id: SettingsRoute; label: string }[]> = {
  settings: [],
  billing: [{ id: "settings", label: "Settings" }, { id: "billing", label: "Billing" }],
  invoices: [{ id: "settings", label: "Settings" }, { id: "billing", label: "Billing" }, { id: "invoices", label: "Invoices" }],
};

/** The breadcrumbs navigate inside the demo: Settings and Billing are real pages that lead back to Invoices. */
function BreadcrumbHeaderExample() {
  const [route, setRoute] = useState<SettingsRoute>("invoices");
  const crumbs = settingsCrumbs[route].length ? <Breadcrumbs items={settingsCrumbs[route]} onNavigate={(item, event) => { event.preventDefault(); setRoute(item.id as SettingsRoute); }} /> : undefined;
  if (route === "invoices") return <PageHeader breadcrumbs={crumbs} title="Invoices" description="Download receipts for every payment." />;
  const rows = route === "settings"
    ? [{ id: "billing" as const, title: "Billing", caption: "Team plan · Visa ending 4242", icon: "icon-credit-card-solid" as const }, { id: "invoices" as const, title: "Invoices", caption: "12 receipts · last paid 1 October", icon: "icon-receipt-solid" as const }]
    : [{ id: "invoices" as const, title: "Invoices", caption: "12 receipts · last paid 1 October", icon: "icon-receipt-solid" as const }];
  return (
    <Stack gap="lg">
      {route === "settings"
        ? <PageHeader title="Settings" description="Workspace, members and billing for Zen Studio." />
        : <PageHeader breadcrumbs={crumbs} title="Billing" description="Team plan, 12 seats · renews on 1 November 2026." />}
      {route === "billing" ? (
        <Card theme="border">
          <DescriptionList divider items={[{ term: "Plan", description: "Team · 12 seats" }, { term: "Payment method", description: "Visa ending 4242" }, { term: "Next invoice", description: "$144.00 on 1 November" }]} />
        </Card>
      ) : null}
      <Card theme="border" spacing="small" className="pe-list-card">
        <List aria-label={route === "settings" ? "Settings" : "Billing"}>
          {rows.map((row) => <ListItem key={row.id} title={row.title} caption={row.caption} leading={<DockIcon icon={row.icon} theme="neutral" background="subtle" />} trailing={<Icon name="icon-chevron-right-line-small" decorative />} onClick={() => setRoute(row.id)} />)}
        </List>
      </Card>
    </Stack>
  );
}

function OverviewHeaderExample() {
  const [creating, setCreating] = useState(false);
  return (
    <>
      <PageHeader eyebrow="Good morning, Ava" title="Your workspace" description="3 projects need your review this week." actions={<Button level="primary" onClick={() => setCreating(true)}>New project</Button>} />
      <DemoFieldDialog open={creating} onOpenChange={setCreating} title="New project" description="You can invite people once it exists."
        field={{ kind: "name", label: "Project name", placeholder: "e.g. Spring campaign" }} submitLabel="Create project" confirm={(name) => `“${name}” created`} />
    </>
  );
}

/* ───────────── Toast (useToast) ───────────── */

const toastFiles = ["Q4 brief.pdf", "Moodboard.fig", "Budget.xlsx"];

function UseToastExample() {
  const { toast } = useToast();
  const [files, setFiles] = useState(toastFiles);
  const remove = (name: string) => {
    setFiles((list) => list.filter((file) => file !== name));
    toast({ type: "neutral", title: `“${name}” moved to trash`, action: { label: "Undo", onClick: () => setFiles((list) => (list.includes(name) ? list : [...list, name])) } });
  };
  if (!files.length) {
    return (
      <EmptyState illustration={false} icon="icon-folder-line" title="No files in this project"
        primaryAction={{ label: "Upload files", onClick: () => { setFiles(toastFiles); toast({ title: `${plural(toastFiles.length, "file")} uploaded` }); } }}>
        Briefs, designs and budgets you add show up here.
      </EmptyState>
    );
  }
  return (
    <List aria-label="Files">
      {files.map((name) => <ListItem key={name} title={name} caption="Edited today" trailing={<IconButton aria-label={`Delete ${name}`} level="tertiary" icon={<Icon name="icon-trash-line" />} onClick={() => remove(name)} />} />)}
    </List>
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

export const examples: ExampleMap = keepOnHotUpdate(import.meta.hot, "examples", {
  "app-shell": [
    { title: "HR workspace", screen: true, wide: true, description: "The HR-Platform templates linked into one app: the Home icon rail, then each module (Time off, Expenses, Workbench) with its own Sidebar, Back and Breadcrumbs; the top bar keeps the plan Badge, Settings, the Inbox count and the account. Open Time off › Configurations › Leave types, or go Back to Home and pick Expenses. A new page starts at the top with focus on it; pages outside the demo say so.", render: () => <HrWorkspaceExample />, code: `// One AppShell for every page (src/templates/hr/HrShell.tsx); each page passes its module, page and crumbs.
<AppShell
  sidebar={module === "home"
    ? <Sidebar aria-label="Modules" collapsed sections={railSections} selectedId="home" onItemClick={openModule} footer={appStore} />
    : <Sidebar brand={<WorkspaceBrand />} search={<BackAndTitle title="Time off" />} sections={timeOff.sections} selectedId={page} onItemClick={navigate} footer={appStore} />}
  header={<Breadcrumbs master={false} items={[{ id: "home", label: "Home" }, { id: "time-off", label: "Time off" }, { id: "my-leaves", label: "My leaves" }]} onNavigate={goHome} />}
  headerActions={<>
    <Badge size="md" theme="neutral" background="subtle" leading="icon-package-solid">Pro</Badge>
    <AppShellAction icon="icon-settings-01-line" aria-label="Settings" onClick={openSettings} />
    <AppShellAction icon="ic-inbox-01-line" aria-label="Inbox" count={unread} aria-expanded={inboxOpen} onClick={openInbox} />
    <Menu align="end" trigger={<AppShellAccount name="Alex Duong" />} items={accountItems} onSelect={runAccountAction} />
  </>}
  aside={inboxOpen ? <SidePanel type="standard" size="small" title="Inbox" open onOpenChange={setInboxOpen}>…</SidePanel> : aside}
  // zen-allow-accent: the assistant launcher is the promoted action (Figma HR-Platform Floating-Item).
  floatingAction={<IconButton level="accent" icon="icon-zen" aria-label="Ask Zen AI" onClick={openAssistant} />}
>
  <Container><PageHeader title="My leaves" actions={requestLeave} />…</Container>
</AppShell>` },
    { title: "People admin", screen: true, wide: true, description: "A white Canvas with a Flat Sidebar and its divider, so every card is bordered (no shadows). A Search leads the top bar and filters the directory from any page; Notifications shows a dot until it is opened. The directory table sits straight on the page, and Add employee puts the invitee in it as Onboarding. A team's View people searches the directory for it, New team adds a card, and a new hire's row opens their checklist in a Side Panel.", render: () => <PeopleAdminExample />, code: `<AppShell
  canvas="alt"
  sidebar={<Sidebar background="flat" divider brand={<WorkspaceBrand />} sections={peopleNav} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
  header={<Search aria-label="Search people" placeholder="Search people, roles or teams" value={query} onValueChange={setQuery} />}
  headerActions={<>
    <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" dot={unseen} onClick={openNotifications} />
    <Menu align="end" trigger={<AppShellAccount name="Alex Duong" />} items={accountItems} onSelect={runAccountAction} />
  </>}
>
  <Container>
    <PageHeader title="Directory" meta={<BadgeCounter value={48} />} description="Everyone at Đìzai Studio, across 3 offices."
      actions={<><Button level="tertiary" onClick={exportCsv}>Export</Button><Button level="primary" onClick={addEmployee}>Add employee</Button></>} />
    <Grid columns="repeat(auto-fit, minmax(min(100%, 160px), 1fr))"><MetricCard theme="border" label="Headcount" value="48" trend={{ direction: "positive", label: "+3 in Sep" }} /> …</Grid>
    {/* The page's table: straight on the page, no Card */}
    <Table aria-label="People" rows={shown} columns={columns} empty={<EmptyState title="No one matches" secondaryAction={{ label: "Clear search", onClick: clearSearch }} />} />
  </Container>
</AppShell>` },
    { title: "Home on the rail", screen: true, wide: true, description: "defaultSidebarCollapsed starts on the icon rail (Figma HR/Sidebar Expand=No): each icon names its module in a tooltip and the toggle before the Breadcrumbs expands it. Home is a dashboard: who is out, your tasks (tick them off) and what is coming up. Request leave opens the same form on Home and Time off; the toast's View opens Time off with the request on top.", render: () => <HomeRailExample />, code: `<AppShell
  defaultSidebarCollapsed
  onSidebarCollapsedChange={(collapsed) => localStorage.setItem("sidebar-collapsed", String(collapsed))}
  sidebar={<Sidebar brand={<WorkspaceBrand />} logoCollapsed={<WorkspaceMark />} sections={railSections} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
  header={<Breadcrumbs master={false} items={crumbs} onNavigate={go} />}
  headerActions={<><Badge size="md" theme="neutral" background="subtle" leading="icon-package-solid">Pro</Badge><Account /></>}
>
  <Container>
    <PageHeader eyebrow="Wednesday, September 30" title="Home" description="Good morning, Alex. …" actions={<Button level="primary" onClick={requestLeave}>Request leave</Button>} />
    {/* Grey Canvas + the default Sidebar: Shadow cards, no border */}
    <Grid columns="repeat(auto-fit, minmax(min(100%, 260px), 1fr))" align="start">
      <Card theme="shadow"><Heading level={2} textStyle="Heading/Subheading">Out today</Heading><List>…</List></Card>
      <Card theme="shadow"><Heading level={2} textStyle="Heading/Subheading">My tasks</Heading><Checkbox … /></Card>
      <Card theme="shadow"><Heading level={2} textStyle="Heading/Subheading">Coming up</Heading><List>…</List></Card>
    </Grid>
  </Container>
</AppShell>` },
    { title: "Drawer in a narrow shell", screen: true, description: "A white Canvas with a Surface-alt Sidebar and bordered cards. Time off at tablet width: under 1024px the menu button opens the Sidebar as a modal drawer (focus moves to the current page, Tab stays inside, Close / Escape / the scrim close it). A request row opens it in a Side Panel (Approve · Decline); the row menu decides in place, the Sidebar counter follows, and the toast's Undo puts the request back.", render: () => <TimeOffDrawerExample />, code: `<AppShell
  canvas="alt"
  sidebar={<Sidebar background="alt" brand={<WorkspaceBrand />} sections={[{ items: [
    { id: "my-leaves", label: "My leaves", icon: "icon-send-01-line" },
    { id: "approvals", label: "Approvals", icon: "icon-check-done-line", counter: waiting.length || undefined },
    { id: "calendar", label: "Calendar", icon: "icon-calendar-line" },
  ] }]} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
  header={<Breadcrumbs master={false} items={crumbs} onNavigate={go} />}
>
  …
</AppShell>
// layout="auto" (default) follows the shell's own width; layout="drawer" forces the drawer for this preview.` },
    { title: "Banner", screen: true, wide: true, description: "banner holds an AlertBanner above the whole shell (a card about to expire); it stays in view while the page scrolls. Update card saves a new one and clears the banner; the Billing page shows the plan, the seats (Add 10 seats, with Undo) and the invoices, a page section whose table sits straight on the page.", render: () => <BillingBannerExample />, code: `<AppShell
  banner={cardExpiring ? <AlertBanner theme="warning" action={{ label: "Update card", onClick: updateCard }} onClose={dismiss}>
    Your Visa ending 1881 expires in 3 days. Update it to keep the Pro plan.
  </AlertBanner> : undefined}
  sidebar={<Sidebar brand={<WorkspaceBrand />} sections={settingsNav} selectedId="billing" onItemClick={go} />}
  header={<Breadcrumbs master={false} items={[{ id: "home", label: "Home" }, { id: "settings", label: "Settings" }, { id: "billing", label: "Billing" }]} onNavigate={go} />}
>
  …
</AppShell>` },
    { title: "Flat canvas", screen: true, wide: true, description: "canvas=“flat” with Sidebar background=“flat”: navigation and page share one plane (Workbench, Figma HR-Platform). With no top bar, the Sidebar keeps its own collapse control (onCollapsedChange). A task row opens the task in a docked panel (aside); the arrow is its quick move, with Undo in the toast.", render: () => <WorkbenchFlatExample />, code: `<AppShell canvas="flat"
  sidebar={<Sidebar background="flat" collapsed={collapsed} onCollapsedChange={setCollapsed} logo={<WorkspaceMark />} productName="Đìzai Studio" logoCollapsed={<WorkspaceMark />}
    sections={workbenchNav} selectedId="tasks" onItemClick={go} />}>
  <Container>
    <PageHeader title="Tasks" description="Product Design space · 5 open tasks" actions={<Button level="primary" onClick={newTask}>New task</Button>} />
    <Grid columns="repeat(auto-fit, minmax(min(100%, 250px), 1fr))" align="start">{columns.map((column) => <Card theme="border" key={column.id}>…</Card>)}</Grid>
  </Container>
</AppShell>` },
    { title: "Phone app", description: "Phones skip the Sidebar: BottomNavigation switches the HR app's roots (Home, Time off, Inbox with a dot, Profile). Each root is a Top Navigation whose large title folds into the bar as its list scrolls; tapping the current tab again scrolls back to the top. Request leave (+) opens a Bottom Sheet form, and the request heads Time off.", wide: true, render: () => <HrPhoneExample />, code: `<ZenProvider typography="mobile">
  {/* One screen per tab (key): it opens at the top and its title folds again */}
  <PlatformPhone key={tab} headerOverlay screenRef={screenRef}
    header={<TopNavigation type="alt" title={label} largeTitle={label} scrollRef={screenRef}
      trailing={[{ icon: "icon-plus-line", label: "Request leave", onClick: () => setRequesting(true) }]} />}
    footer={<BottomNavigation items={items} value={tab}
      onValueChange={(id) => (id === tab ? screenRef.current?.scrollTo({ top: 0, behavior: "smooth" }) : setTab(id))} />}>
    <Stack gap="lg" padding="lg">
      <Card theme="border"><Heading level={2} textStyle="Heading/Subheading">Leave balance</Heading><DescriptionList divider items={balances} /></Card>
      <List aria-label="Coming up">…</List>
    </Stack>
    <BottomSheet inline open={requesting} onOpenChange={setRequesting} title="Request leave"
      primaryAction={{ label: "Send request", onClick: send }} secondaryAction={{ label: "Cancel" }}>
      <FormFieldset legend="Leave type" kind="radio" direction="row">…</FormFieldset><DateField label="First day" … /><DateField label="Last day" … />
    </BottomSheet>
  </PlatformPhone>
</ZenProvider>` },
  ],
  "page-header": [
    { title: "List page", wide: true, description: "Title with a count Badge, a description and Tertiary + Primary actions (one Primary per page).", render: () => <ListPageHeaderExample />, code: `<PageHeader title="Members" meta={<BadgeCounter value={count} />}
  description={\`\${plural(count, "person", "people")} can access Zen Studio.\`}
  actions={<><Button level="tertiary" onClick={exportCsv}>Export</Button><Button level="primary" onClick={invite}>Invite member</Button></>} />` },
    { title: "Detail page", wide: true, description: "Back (chevron) to the parent list, a status Badge, one action and Tabs for the page's sections. Back opens the Projects list; a project row opens its page again.", render: () => <DetailPageHeaderExample />, code: `<PageHeader
  back={{ label: "Projects", onClick: goBack }}
  title="Brand refresh"
  meta={<Badge size="small" theme={published ? "blue" : "green"} background="subtle">{published ? "Published" : "In review"}</Badge>}
  description="Logo, colour and type updates for the 2026 launch."
  actions={<Button level={published ? "tertiary" : "primary"} onClick={() => setPublished(!published)}>{published ? "Unpublish" : "Publish"}</Button>}
  tabs={<Tabs aria-label="Project sections" items={sections} value={tab} onChange={setTab} />}
/>` },
    { title: "Nested page", wide: true, description: "Breadcrumbs above the title for pages deeper than one level. Settings and Billing open their own pages, which lead back to Invoices.", render: () => <BreadcrumbHeaderExample />, code: `<PageHeader
  breadcrumbs={<Breadcrumbs items={[{ id: "settings", label: "Settings" }, { id: "billing", label: "Billing" }, { id: "invoices", label: "Invoices" }]} />}
  title="Invoices"
  description="Download receipts for every payment."
/>` },
    { title: "Overview page", wide: true, description: "An eyebrow (Body/Small/Medium) above the Heading/1 title for top-level overview pages.", render: () => <OverviewHeaderExample />, code: `<PageHeader eyebrow="Good morning, Ava" title="Your workspace"
  description="3 projects need your review this week." actions={<Button level="primary" onClick={() => setCreating(true)}>New project</Button>} />` },
  ],
  toast: [
    { title: "useToast()", description: "Call toast() after an action; ZenProvider hosts the stack. Deleting a file shows an Undo action that restores it; with every file gone the list becomes an Empty State.", render: () => <UseToastExample />, code: `const { toast } = useToast();

function remove(name: string) {
  setFiles((list) => list.filter((file) => file !== name));
  toast({ type: "neutral", title: \`“\${name}” moved to trash\`, action: { label: "Undo", onClick: () => restore(name) } });
}` },
  ],
});
