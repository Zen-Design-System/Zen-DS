import { useState, type ReactNode } from "react";
import { AlertBanner } from "../../components/AlertBanner";
import { AppShell, AppShellAccount, AppShellAction } from "../../components/AppShell";
import { Avatar } from "../../components/Avatar";
import { Badge, BadgeCounter } from "../../components/Badge";
import { BottomNavigation } from "../../components/BottomNavigation";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { Button, IconButton } from "../../components/Button";
import { Card } from "../../components/Card";
import { DescriptionList } from "../../components/DescriptionList";
import { EmptyState } from "../../components/EmptyState";
import { Icon } from "../../components/Icon";
import { Container, Stack } from "../../components/Layout";
import { List, ListItem } from "../../components/ListItem";
import { Menu, type MenuEntry } from "../../components/Menu";
import { PageHeader } from "../../components/PageHeader";
import { ZenProvider } from "../../components/Provider";
import { Search } from "../../components/Search";
import { SidePanel } from "../../components/SidePanel";
import { Sidebar, type SidebarSection } from "../../components/Sidebar";
import { Table, TableBadges, TableText } from "../../components/Table";
import { Tabs } from "../../components/Tabs";
import { Text, plural } from "../../components/Text";
import { useToast } from "../../components/Toast";
import { PlatformPhone } from "../PlatformPhone";
import { DemoFieldDialog } from "../PlatformDemoActions";
import { figmaSidebarBrand } from "../PlatformSidebarBrand";
import { bottomNavItems } from "../PlatformMobileData";
import { Panel, PlaygroundFilterChip, PlaygroundToggle, option } from "./shared";
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

const members = [
  { id: "ava", name: "Ava Chen", email: "ava@zen.studio", role: "Owner" },
  { id: "bao", name: "Bao Nguyen", email: "bao@zen.studio", role: "Admin" },
  { id: "chi", name: "Chi Tran", email: "chi@zen.studio", role: "Member" },
  { id: "duy", name: "Duy Le", email: "duy@zen.studio", role: "Member" },
];

const projects = [
  { id: "brand", title: "Brand refresh", caption: "Updated today · 6 people" },
  { id: "mobile", title: "Mobile app", caption: "Updated yesterday · 4 people" },
  { id: "docs", title: "Docs platform", caption: "Updated Monday · 3 people" },
];

function MembersTable() {
  return (
    <Table aria-label="Members" rows={members} getRowId={(row) => row.id}
      columns={[
        { id: "name", header: "Name", cell: (row) => <Stack direction="row" gap="sm"><Avatar size="small" theme="blue" background="subtle" alt="">{row.name.slice(0, 1)}</Avatar><Stack gap="3xs"><Text as="span" textStyle="Body/Base/Medium">{row.name}</Text><Text as="span" textStyle="Body/Small/Regular" tone="base">{row.email}</Text></Stack></Stack> },
        { id: "role", header: "Role", cell: (row) => <TableText>{row.role}</TableText> },
      ]} />
  );
}

/** The pages of the sample navigation that have no content in the demo: an empty state, not instructions. */
function EmptyPage({ id }: { id: string }) {
  return <EmptyState title={`No ${navLabel(id).toLowerCase()} yet`} headingLevel={2} illustration={false}>What you add here shows up for the whole team.</EmptyState>;
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
  const [topBar, setTopBar] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<"count" | "dot" | "none">("count");
  const [banner, setBanner] = useState(false);
  const [panel, setPanel] = useState(false);
  const [floating, setFloating] = useState(false);
  const [page, setPage] = useState("members");
  // A playground has no toast host: the last handler that ran shows under the preview.
  const [ran, setRan] = useState<string | null>(null);
  const flat = canvas === "flat";
  const props = [
    layout === "auto" ? "" : `\n  layout="${layout}" // previews only: apps leave layout on auto`,
    canvas === "default" ? "" : `\n  canvas="${canvas}"`,
    `\n  sidebarCollapsed={collapsed}\n  onSidebarCollapsedChange={setCollapsed}`,
    `\n  sidebar={<Sidebar logo={<Logo />}${flat ? ` background="flat"` : ""} sections={sections} selectedId={page} onItemClick={(item) => navigate(item.id)} />}`,
    topBar ? `\n  header={<Breadcrumbs master={false} items={crumbs} onNavigate={go} />}\n  headerActions={<>\n    <AppShellAction icon="icon-bell-01-line" aria-label="Notifications"${notifications === "count" ? " count={3}" : notifications === "dot" ? " dot" : ""} onClick={openNotifications} />\n    <Menu align="end" trigger={<AppShellAccount name="Ava Chen" />} items={accountItems} onSelect={choose} />\n  </>}` : "",
    banner ? `\n  banner={<AlertBanner theme="info" onClose={dismiss}>Scheduled maintenance tonight, 22:00–23:00.</AlertBanner>}` : "",
    panel ? `\n  aside={<SidePanel type="standard" size="small" title="Ava Chen" open={open} onOpenChange={setOpen}>…</SidePanel>}` : "",
    floating ? `\n  // zen-allow-accent: the assistant launcher is the promoted action (Figma HR-Platform Floating-Item).\n  floatingAction={<IconButton level="accent" icon="icon-zen" aria-label="Ask Zen AI" onClick={openAssistant} />}` : "",
  ].join("");
  return (
    <Panel
      title="App Shell"
      previewClassName="pash-preview"
      controls={<>
        {wideScreen ? <PlaygroundFilterChip label="Layout" value={layout} onChange={(value) => setLayout((String(value) || "auto") as "auto" | "sidebar" | "drawer")} options={[option("auto", "Auto (by shell width)"), option("sidebar", "Sidebar"), option("drawer", "Drawer")]} /> : null}
        <PlaygroundFilterChip label="Canvas" value={canvas} onChange={(value) => setCanvas((String(value) || "default") as "default" | "alt" | "flat")} options={[option("default"), option("alt"), option("flat")]} />
        <PlaygroundToggle label="Top bar" selected={topBar} onChange={setTopBar} />
        <PlaygroundToggle label="Collapsed" selected={collapsed} onChange={setCollapsed} />
        <PlaygroundFilterChip label="Notifications" value={notifications} onChange={(value) => setNotifications((String(value) || "count") as "count" | "dot" | "none")} options={[option("count", "Count"), option("dot", "Dot"), option("none", "None")]} />
        <PlaygroundToggle label="Banner" selected={banner} onChange={setBanner} />
        <PlaygroundToggle label="Side panel" selected={panel} onChange={setPanel} />
        <PlaygroundToggle label="Floating action" selected={floating} onChange={setFloating} />
      </>}
      code={`import { AlertBanner, AppShell, AppShellAccount, AppShellAction, Breadcrumbs, Container, IconButton, Menu, PageHeader, SidePanel, Sidebar } from "@zen/design-system";

<AppShell${props}
>
  <Container>
    <PageHeader title="Members" actions={<Button level="primary" onClick={invite}>Invite member</Button>} />
    …
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
          sidebar={<Sidebar {...figmaSidebarBrand} background={flat ? "flat" : "default"} sections={navSections} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
          header={topBar ? <Breadcrumbs master={false} items={shellCrumbs(page)} onNavigate={(item, event) => { event.preventDefault(); setPage(item.id); }} /> : undefined}
          headerActions={topBar ? <>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={notifications === "count" ? 3 : undefined} dot={notifications === "dot"} onClick={() => { setNotifications("none"); setRan("Notifications · onClick ran, unread cleared"); }} />
            <Menu align="end" trigger={<AppShellAccount name="Ava Chen" theme="blue" />} items={accountItems} onSelect={(item) => setRan(`${item.label} · onSelect ran`)} />
          </> : undefined}
          banner={banner ? <AlertBanner theme="info" onClose={() => setBanner(false)}>Scheduled maintenance tonight, 22:00–23:00.</AlertBanner> : undefined}
          aside={panel ? (
            <SidePanel type="standard" size="small" title="Ava Chen" description="Owner · ava@zen.studio" open onOpenChange={setPanel}>
              <DescriptionList layout="stacked" items={[{ term: "Role", description: "Owner" }, { term: "Joined", description: "12 Jan 2024" }, { term: "Last active", description: "Now" }]} />
            </SidePanel>
          ) : undefined}
          // zen-allow-accent: Figma HR-Platform Floating-Item — the promoted assistant launcher.
          floatingAction={floating ? <IconButton level="accent" icon="icon-zen" aria-label="Ask Zen AI" onClick={() => setRan("Ask Zen AI · onClick ran")} /> : undefined}
        >
          <Container>
            <Stack gap="xl" className="pash-page">
              <PageHeader title={navLabel(page)} description={page === "members" ? `${plural(members.length, "person", "people")} in Zen Studio` : undefined} actions={page === "members" ? <Button level="primary" onClick={() => setRan("Invite member · onClick ran")}>Invite member</Button> : undefined} />
              {page === "members" ? <MembersTable /> : <EmptyPage id={page} />}
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
const hrNav: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "inbox", label: "Inbox", icon: "icon-mail-01-line" },
  ] },
  { label: "Time off", items: [
    { id: "leaves", label: "My leaves", icon: "icon-send-01-line" },
    { id: "approvals", label: "Approvals", icon: "icon-check-verified-line", counter: 3 },
    { id: "calendar", label: "Calendar", icon: "icon-calendar-line" },
  ] },
  { label: "Company", items: [
    { id: "people", label: "People", icon: "icon-users-line" },
    { id: "expenses", label: "Expenses", icon: "icon-coins-line" },
  ] },
];
const hrPages: Record<string, { title: string; section?: { id: string; label: string } }> = {
  home: { title: "Home" },
  inbox: { title: "Inbox" },
  leaves: { title: "My leaves", section: { id: "leaves", label: "Time off" } },
  approvals: { title: "Approvals", section: { id: "leaves", label: "Time off" } },
  calendar: { title: "Calendar", section: { id: "leaves", label: "Time off" } },
  people: { title: "People", section: { id: "people", label: "Company" } },
  expenses: { title: "Expenses", section: { id: "people", label: "Company" } },
};
const hrCrumbs = (id: string) => {
  const page = hrPages[id];
  if (id === "home") return [{ id: "home", label: "Home" }];
  return [{ id: "home", label: "Home" }, ...(page.section ? [{ id: `section:${page.section.id}`, label: page.section.label }] : []), { id, label: page.title }];
};
type LeaveRequest = { id: string; type: string; dates: string; days: number; status: "Pending" | "Approved" | "Rejected" };
const leaveSeed: LeaveRequest[] = [
  { id: "r1", type: "Annual leave", dates: "12–13 Mar 2026", days: 2, status: "Pending" },
  { id: "r2", type: "Sick leave", dates: "28 Feb 2026", days: 1, status: "Approved" },
  { id: "r3", type: "Annual leave", dates: "18–19 Feb 2026", days: 2, status: "Rejected" },
  { id: "r4", type: "Unpaid leave", dates: "30 Jan 2026", days: 1, status: "Approved" },
];
const leaveTone = { Pending: "yellow", Approved: "green", Rejected: "red" } as const;
const hrNotifications = [
  { id: "n1", title: "Bao approved your leave", caption: "12–13 Mar · 2 min ago", page: "leaves" },
  { id: "n2", title: "Chi asked for 1 day off", caption: "Sick leave · 1 h ago", page: "approvals" },
  { id: "n3", title: "Hung Kings Festival added", caption: "Public holiday · Yesterday", page: "calendar" },
];

function HrWorkspaceExample() {
  const { toast } = useToast();
  const [page, setPage] = useState("leaves");
  const [requests, setRequests] = useState(leaveSeed);
  const [unread, setUnread] = useState(12);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const openInbox = () => { setInboxOpen((open) => !open); setUnread(0); };
  return (
    <ShellFrame height={560}>
      <AppShell mainId="pash-hr-main"
        sidebar={<Sidebar {...figmaSidebarBrand} sections={hrNav} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
        header={<Breadcrumbs master={false} items={hrCrumbs(page)} onNavigate={(item, event) => { event.preventDefault(); setPage(item.id.replace("section:", "")); }} />}
        headerActions={<>
          <Badge size="md" theme="neutral" background="subtle" leading="icon-package-solid">Pro</Badge>
          <AppShellAction icon="icon-settings-01-line" aria-label="Settings" onClick={() => toast({ title: "Settings", children: "Leave types, holidays and approval flows." })} />
          <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} aria-expanded={inboxOpen} onClick={openInbox} />
          <Menu align="end" trigger={<AppShellAccount name="Alex Duong" theme="blue" />} items={accountItems} onSelect={(item) => toast({ title: item.id === "sign-out" ? "Signed out of the demo" : `${item.label} opened` })} />
        </>}
        aside={inboxOpen ? (
          <SidePanel type="standard" size="small" title="Notifications" open onOpenChange={setInboxOpen}>
            <List aria-label="Notifications">
              {hrNotifications.map((item) => <ListItem key={item.id} title={item.title} caption={item.caption} onClick={() => { setPage(item.page); setInboxOpen(false); }} />)}
            </List>
          </SidePanel>
        ) : undefined}
        // zen-allow-accent: Figma HR-Platform Floating-Item — the promoted assistant launcher.
        floatingAction={<IconButton level="accent" icon="icon-zen" aria-label="Ask Zen AI" onClick={() => toast({ title: "Zen AI is ready", children: "Ask about leave balances, holidays or approvals." })} />}
      >
        <Container>
          <Stack gap="xl" className="pash-page">
            <PageHeader title={hrPages[page].title} actions={page === "leaves" ? <Button level="primary" startIcon={<Icon name="icon-plus-line" decorative />} onClick={() => setSubmitting(true)}>Submit leave</Button> : undefined} />
            {page === "leaves" ? (
              <Table aria-label="Leave requests" rows={requests} getRowId={(row) => row.id}
                columns={[
                  { id: "type", header: "Type", cell: (row) => <TableText>{row.type}</TableText> },
                  { id: "dates", header: "Dates", cell: (row) => <TableText>{row.dates}</TableText> },
                  { id: "days", header: "Total", cell: (row) => <TableText>{plural(row.days, "day")}</TableText> },
                  { id: "status", header: "Status", cell: (row) => <TableBadges><Badge size="sm" theme={leaveTone[row.status]} background="subtle">{row.status}</Badge></TableBadges> },
                ]} />
            ) : <EmptyState title={`Nothing in ${hrPages[page].title.toLowerCase()} yet`} headingLevel={2} illustration={false}>New requests and updates from your team show up here.</EmptyState>}
          </Stack>
        </Container>
      </AppShell>
      <DemoFieldDialog open={submitting} onOpenChange={setSubmitting} title="Submit leave" description="Your manager gets the request for approval."
        field={{ kind: "name", label: "Reason", placeholder: "e.g. Family trip" }} submitLabel="Submit request" confirm={() => "Leave request sent for approval"}
        onSubmit={(reason) => { setPage("leaves"); setRequests((list) => [{ id: `r${list.length + 1}`, type: reason, dates: "2–3 Apr 2026", days: 2, status: "Pending" }, ...list]); }} />
    </ShellFrame>
  );
}

function AdminAppExample() {
  const { toast } = useToast();
  const [page, setPage] = useState("members");
  const [query, setQuery] = useState("");
  const [inviting, setInviting] = useState(false);
  const [unseen, setUnseen] = useState(true);
  const shown = members.filter((member) => member.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <ShellFrame>
      <AppShell mainId="pash-admin-main"
        sidebar={<Sidebar {...figmaSidebarBrand} sections={navSections} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
        header={<Search aria-label="Search members" placeholder="Search members" value={query} onChange={(event) => { setQuery(event.target.value); setPage("members"); }} />}
        headerActions={<>
          <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" dot={unseen} onClick={() => { setUnseen(false); toast({ title: "Bao joined Zen Studio", children: "2 min ago" }); }} />
          <Menu align="end" trigger={<AppShellAccount name="Ava Chen" theme="blue" />} items={accountItems} onSelect={(item) => toast({ title: item.id === "sign-out" ? "Signed out of the demo" : `${item.label} opened` })} />
        </>}
      >
        <Container>
          <Stack gap="xl" className="pash-page">
            <PageHeader title={navLabel(page)} meta={page === "members" ? <BadgeCounter value={shown.length} /> : undefined} description={page === "members" ? "Manage who can access Zen Studio." : undefined} actions={page === "members" ? <><Button level="tertiary" onClick={() => toast({ type: "positive", title: `Exported ${plural(shown.length, "member")} as CSV` })}>Export</Button><Button level="primary" onClick={() => setInviting(true)}>Invite member</Button></> : undefined} />
            {page === "members" ? (
              <Table aria-label="Members" rows={shown} getRowId={(row) => row.id} empty={<Text tone="base">No members match “{query}”.</Text>}
                columns={[{ id: "name", header: "Name", cell: (row) => <TableText>{row.name}</TableText> }, { id: "email", header: "Email", cell: (row) => <TableText>{row.email}</TableText> }, { id: "role", header: "Role", cell: (row) => <TableText>{row.role}</TableText> }]} />
            ) : <EmptyPage id={page} />}
          </Stack>
        </Container>
      </AppShell>
      <DemoFieldDialog open={inviting} onOpenChange={setInviting} title="Invite to Zen Studio" description="They get an email with a link to join."
        field={{ kind: "email", label: "Email address", placeholder: "name@company.com" }} submitLabel="Send invite" confirm={(email) => `Invite sent to ${email}`} />
    </ShellFrame>
  );
}

function RailExample() {
  const { toast } = useToast();
  const [page, setPage] = useState("projects");
  const [opened, setOpened] = useState<string | null>(null);
  return (
    <ShellFrame height={460}>
      <AppShell mainId="pash-rail-main" defaultSidebarCollapsed
        sidebar={<Sidebar {...figmaSidebarBrand} sections={navSections} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
        header={<Breadcrumbs master={false} items={shellCrumbs(page)} onNavigate={(item, event) => { event.preventDefault(); setPage(item.id); }} />}
        headerActions={<Menu align="end" trigger={<AppShellAccount name="Ava Chen" theme="blue" />} items={accountItems} onSelect={(item) => toast({ title: item.id === "sign-out" ? "Signed out of the demo" : `${item.label} opened` })} />}
      >
        <Container>
          <Stack gap="xl" className="pash-page">
            <PageHeader title={navLabel(page)} description={page === "projects" ? `${plural(projects.length, "active project")}` : undefined} />
            {page === "projects" ? (
              <Card spacing="small" className="pe-list-card">
                <List aria-label="Projects">
                  {projects.map((project) => <ListItem key={project.id} title={project.title} caption={project.caption} selected={opened === project.id} onClick={() => setOpened(project.id)} />)}
                </List>
              </Card>
            ) : <EmptyPage id={page} />}
          </Stack>
        </Container>
      </AppShell>
    </ShellFrame>
  );
}

function DrawerExample() {
  const { toast } = useToast();
  const [page, setPage] = useState("home");
  const [opened, setOpened] = useState<string | null>(null);
  return (
    <ShellFrame height={460}>
      <AppShell layout="drawer" mainId="pash-drawer-main"
        sidebar={<Sidebar {...figmaSidebarBrand} sections={navSections} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
        header={<Breadcrumbs master={false} items={shellCrumbs(page)} onNavigate={(item, event) => { event.preventDefault(); setPage(item.id); }} />}
        headerActions={<Menu align="end" trigger={<AppShellAccount name="Ava Chen" theme="blue" />} items={accountItems} onSelect={(item) => toast({ title: item.id === "sign-out" ? "Signed out of the demo" : `${item.label} opened` })} />}
      >
        <Container>
          <Stack gap="xl" className="pash-page">
            <PageHeader title={navLabel(page)} />
            {page === "home" || page === "projects" ? (
              <Card spacing="small" className="pe-list-card">
                <List aria-label="Recent projects">
                  {projects.map((project) => <ListItem key={project.id} title={project.title} caption={project.caption} selected={opened === project.id} onClick={() => setOpened(project.id)} />)}
                </List>
              </Card>
            ) : <EmptyPage id={page} />}
          </Stack>
        </Container>
      </AppShell>
    </ShellFrame>
  );
}

const invoices = [
  { id: "inv-0142", number: "INV-0142", date: "1 Sep 2026", amount: "$1,680.00" },
  { id: "inv-0131", number: "INV-0131", date: "1 Aug 2026", amount: "$1,680.00" },
  { id: "inv-0120", number: "INV-0120", date: "1 Jul 2026", amount: "$1,540.00" },
  { id: "inv-0109", number: "INV-0109", date: "1 Jun 2026", amount: "$1,540.00" },
  { id: "inv-0098", number: "INV-0098", date: "1 May 2026", amount: "$1,540.00" },
];

function BannerExample() {
  const { toast } = useToast();
  const [page, setPage] = useState("billing");
  const [notice, setNotice] = useState(true);
  const [updating, setUpdating] = useState(false);
  return (
    <ShellFrame height={460}>
      <AppShell mainId="pash-banner-main"
        banner={notice ? <AlertBanner theme="warning" action={{ label: "Update card", onClick: () => { setPage("billing"); setUpdating(true); } }} onClose={() => setNotice(false)}>Your card expires in 3 days. Update it to keep your plan.</AlertBanner> : undefined}
        sidebar={<Sidebar {...figmaSidebarBrand} sections={navSections} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
        header={<Breadcrumbs master={false} items={shellCrumbs(page)} onNavigate={(item, event) => { event.preventDefault(); setPage(item.id); }} />}
        headerActions={<Menu align="end" trigger={<AppShellAccount name="Ava Chen" theme="blue" />} items={accountItems} onSelect={(item) => toast({ title: item.id === "sign-out" ? "Signed out of the demo" : `${item.label} opened` })} />}
      >
        <Container>
          <Stack gap="xl" className="pash-page">
            <PageHeader title={navLabel(page)} description={page === "billing" ? "Team plan · renews on 1 Oct 2026" : undefined} />
            {page === "billing" ? (
              <Table aria-label="Invoices" rows={invoices} getRowId={(row) => row.id}
                columns={[{ id: "number", header: "Invoice", cell: (row) => <TableText>{row.number}</TableText> }, { id: "date", header: "Date", cell: (row) => <TableText>{row.date}</TableText> }, { id: "amount", header: "Amount", align: "right", cell: (row) => <TableText>{row.amount}</TableText> }]} />
            ) : <EmptyPage id={page} />}
          </Stack>
        </Container>
      </AppShell>
      <DemoFieldDialog open={updating} onOpenChange={setUpdating} title="Update card" description="We charge the new card from the next invoice."
        field={{ kind: "name", label: "Name on card", placeholder: "e.g. Ava Chen" }} submitLabel="Save card" confirm={() => "Card updated"} onSubmit={() => setNotice(false)} />
    </ShellFrame>
  );
}

function FlatCanvasExample() {
  const [page, setPage] = useState("projects");
  const [collapsed, setCollapsed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [list, setList] = useState(projects);
  return (
    <ShellFrame height={440}>
      <AppShell canvas="flat" mainId="pash-flat-main"
        sidebar={<Sidebar {...figmaSidebarBrand} background="flat" collapsed={collapsed} onCollapsedChange={setCollapsed} sections={navSections} selectedId={page} onItemClick={(item) => setPage(item.id)} />}>
        <Container>
          <Stack gap="xl" className="pash-page">
            <PageHeader title={navLabel(page)} actions={page === "projects" ? <Button level="primary" onClick={() => setCreating(true)}>New project</Button> : undefined} />
            {page === "projects" ? (
              <Card spacing="small" theme="border" className="pe-list-card">
                <List aria-label="Projects">{list.map((project) => <ListItem key={project.id} title={project.title} caption={project.caption} />)}</List>
              </Card>
            ) : <EmptyPage id={page} />}
          </Stack>
        </Container>
      </AppShell>
      <DemoFieldDialog open={creating} onOpenChange={setCreating} title="New project" description="You can invite people once it exists."
        field={{ kind: "name", label: "Project name", placeholder: "e.g. Spring campaign" }} submitLabel="Create project" confirm={(name) => `“${name}” created`}
        onSubmit={(name) => setList((items) => [{ id: `p${items.length + 1}`, title: name, caption: "Created just now · 1 person" }, ...items])} />
    </ShellFrame>
  );
}

function PhoneAppExample() {
  const [tab, setTab] = useState(bottomNavItems[0].id);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ZenProvider typography="mobile" paint={false} portal={false} breakpoint="mobile">
      <PlatformPhone footer={<BottomNavigation items={bottomNavItems} value={tab} onValueChange={setTab} />}>
        <Stack gap="lg" padding="lg">
          <PageHeader title={bottomNavItems.find((item) => item.id === tab)?.label ?? "Home"} description={`${plural(projects.length, "project")} updated this week`} />
          <List aria-label="Recent">
            {projects.map((project) => <ListItem key={project.id} title={project.title} caption={project.caption} selected={open === project.id} onClick={() => setOpen(project.id)} />)}
          </List>
        </Stack>
      </PlatformPhone>
    </ZenProvider>
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

function DetailPageHeaderExample() {
  const [tab, setTab] = useState("overview");
  const [back, setBack] = useState(false);
  const [published, setPublished] = useState(false);
  return (
    <PageHeader
      back={{ label: back ? "Back to projects (pressed)" : "Projects", onClick: () => setBack(true) }}
      title="Brand refresh"
      meta={<Badge size="small" theme={published ? "blue" : "green"} background="subtle">{published ? "Published" : "In review"}</Badge>}
      description="Logo, colour and type updates for the 2026 launch."
      actions={<Button level={published ? "tertiary" : "primary"} onClick={() => setPublished(!published)}>{published ? "Unpublish" : "Publish"}</Button>}
      tabs={<Tabs aria-label="Project sections" items={[{ id: "overview", label: "Overview" }, { id: "files", label: "Files", badge: 12 }, { id: "activity", label: "Activity" }]} value={tab} onChange={setTab} />}
    />
  );
}

function BreadcrumbHeaderExample() {
  const [crumb, setCrumb] = useState("Invoices");
  return (
    <PageHeader
      breadcrumbs={<Breadcrumbs items={[{ id: "settings", label: "Settings" }, { id: "billing", label: "Billing" }, { id: "invoices", label: crumb }]} onNavigate={(item, event) => { event.preventDefault(); setCrumb(`Invoices (from ${String(item.label)})`); }} />}
      title="Invoices"
      description="Download receipts for every payment."
    />
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

function UseToastExample() {
  const { toast } = useToast();
  const [files, setFiles] = useState(["Q4 brief.pdf", "Moodboard.fig", "Budget.xlsx"]);
  const remove = (name: string) => {
    setFiles((list) => list.filter((file) => file !== name));
    toast({ type: "neutral", title: `“${name}” moved to trash`, action: { label: "Undo", onClick: () => setFiles((list) => (list.includes(name) ? list : [...list, name])) } });
  };
  return (
    <List aria-label="Files">
      {files.map((name) => <ListItem key={name} title={name} caption="Edited today" trailing={<IconButton aria-label={`Delete ${name}`} level="tertiary" icon={<Icon name="icon-trash-line" />} onClick={() => remove(name)} />} />)}
      {files.length === 0 ? <ListItem title="No files" caption="Undo from the toast to bring them back" /> : null}
    </List>
  );
}

export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = {
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
};

export const examples: ExampleMap = {
  "app-shell": [
    { title: "HR workspace", screen: true, wide: true, description: "The Figma HR-Platform pattern: the toggle and Breadcrumbs lead the top bar; a plan Badge, Settings, Notifications with an unread count, and the account menu trail it. Notifications opens a side panel, docked beside the page when the page keeps a tablet width (full screen), modal otherwise; the assistant floats bottom-right.", render: () => <HrWorkspaceExample />, code: `<AppShell
  sidebar={<Sidebar logo={<Logo />} sections={sections} selectedId={page} onItemClick={(item) => navigate(item.id)} />}
  header={<Breadcrumbs master={false} items={crumbs} onNavigate={(item, event) => { event.preventDefault(); navigate(item.id); }} />}
  headerActions={<>
    <Badge size="md" theme="neutral" background="subtle" leading="icon-package-solid">Pro</Badge>
    <AppShellAction icon="icon-settings-01-line" aria-label="Settings" onClick={openSettings} />
    <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} aria-expanded={inboxOpen} onClick={openInbox} />
    <Menu align="end" trigger={<AppShellAccount name="Alex Duong" src={photo} />} items={accountItems} onSelect={runAccountAction} />
  </>}
  aside={inboxOpen ? <SidePanel type="standard" size="small" title="Notifications" open onOpenChange={setInboxOpen}>…</SidePanel> : undefined}
  // zen-allow-accent: the assistant launcher is the promoted action (Figma HR-Platform Floating-Item).
  floatingAction={<IconButton level="accent" icon="icon-zen" aria-label="Ask Zen AI" onClick={openAssistant} />}
>
  <Container>
    <PageHeader title="My leaves" actions={<Button level="primary" startIcon={<Icon name="icon-plus-line" decorative />} onClick={submitLeave}>Submit leave</Button>} />
    <Table aria-label="Leave requests" rows={requests} getRowId={(row) => row.id} columns={columns} />
  </Container>
</AppShell>
// The toggle before the Breadcrumbs collapses the Sidebar to its rail (on by default when there is a top bar).` },
    { title: "Admin app", screen: true, wide: true, description: "A Search leads the top bar; Notifications shows a dot until it is opened. Search filters the members table.", render: () => <AdminAppExample />, code: `<AppShell
  sidebar={<Sidebar logo={<Logo />} sections={sections} selectedId={page} onItemClick={(item) => navigate(item.id)} />}
  header={<Search aria-label="Search members" placeholder="Search members" value={query} onChange={(e) => setQuery(e.target.value)} />}
  headerActions={<>
    <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" dot={unseen} onClick={openNotifications} />
    <Menu align="end" trigger={<AppShellAccount name="Ava Chen" />} items={accountItems} onSelect={runAccountAction} />
  </>}
>
  <Container>
    <PageHeader title="Members" description="Manage who can access Zen Studio."
      actions={<><Button level="tertiary" onClick={exportCsv}>Export</Button><Button level="primary" onClick={() => setInviting(true)}>Invite member</Button></>} />
    <Table aria-label="Members" rows={shown} getRowId={(row) => row.id} columns={columns} />
  </Container>
</AppShell>` },
    { title: "Collapsed rail", screen: true, wide: true, description: "defaultSidebarCollapsed starts on the icon rail; each icon names its page in a tooltip, and the toggle before the Breadcrumbs expands it again.", render: () => <RailExample />, code: `<AppShell
  defaultSidebarCollapsed
  onSidebarCollapsedChange={(collapsed) => localStorage.setItem("sidebar-collapsed", String(collapsed))}
  sidebar={<Sidebar logo={<Logo />} logoCollapsed={<Mark />} sections={sections} selectedId={page} onItemClick={(item) => navigate(item.id)} />}
  header={<Breadcrumbs master={false} items={crumbs} onNavigate={go} />}
  headerActions={<Menu align="end" trigger={<AppShellAccount name="Ava Chen" />} items={accountItems} onSelect={runAccountAction} />}
>
  …
</AppShell>` },
    { title: "Drawer in a narrow shell", screen: true, description: "Under 1024px the menu button opens the Sidebar as a modal drawer: focus moves to the current page, Tab stays inside, and Close, Escape or the scrim closes it. Picking a page closes it and moves focus to the page.", render: () => <DrawerExample />, code: `<AppShell
  sidebar={<Sidebar logo={<Logo />} sections={sections} selectedId={page} onItemClick={(item) => navigate(item.id)} />}
  header={<Breadcrumbs master={false} items={crumbs} onNavigate={go} />}
>
  …
</AppShell>
// layout="auto" (default) follows the shell's own width; layout="drawer" forces the drawer for this preview.` },
    { title: "Banner", screen: true, wide: true, description: "banner holds an AlertBanner above the whole shell; it stays in view while the page scrolls, and Update card or Dismiss clears it.", render: () => <BannerExample />, code: `<AppShell
  banner={notice ? <AlertBanner theme="warning" action={{ label: "Update card", onClick: updateCard }} onClose={() => setNotice(false)}>Your card expires in 3 days. Update it to keep your plan.</AlertBanner> : undefined}
  sidebar={<Sidebar … />}
  header={<Breadcrumbs master={false} items={crumbs} onNavigate={go} />}
>
  …
</AppShell>` },
    { title: "Flat canvas", screen: true, wide: true, description: "canvas=“flat” with Sidebar background=“flat”: navigation and page share one plane. With no top bar, the Sidebar keeps its own collapse control in its header (onCollapsedChange).", render: () => <FlatCanvasExample />, code: `<AppShell canvas="flat"
  sidebar={<Sidebar background="flat" collapsed={collapsed} onCollapsedChange={setCollapsed} logo={<Logo />} sections={sections} selectedId={page} onItemClick={(item) => navigate(item.id)} />}>
  <PageHeader title="Projects" actions={<Button level="primary" onClick={() => setCreating(true)}>New project</Button>} />
</AppShell>` },
    { title: "Phone app", description: "Phones skip the Sidebar: BottomNavigation switches sections and PageHeader keeps the same structure in mobile typography.", wide: true, render: () => <PhoneAppExample />, code: `<ZenProvider typography="mobile" density="comfortable">
  <Stack gap="lg" padding="lg">
    <PageHeader title="Home" description="3 projects updated this week" />
    <List aria-label="Recent">…</List>
  </Stack>
  <BottomNavigation items={items} value={tab} onValueChange={setTab} />
</ZenProvider>` },
  ],
  "page-header": [
    { title: "List page", description: "Title with a count Badge, a description and Tertiary + Primary actions (one Primary per page).", render: () => <ListPageHeaderExample />, code: `<PageHeader title="Members" meta={<BadgeCounter value={count} />}
  description={\`\${plural(count, "person", "people")} can access Zen Studio.\`}
  actions={<><Button level="tertiary" onClick={exportCsv}>Export</Button><Button level="primary" onClick={invite}>Invite member</Button></>} />` },
    { title: "Detail page", description: "Back (chevron) to the parent list, a status Badge, one action and Tabs for the page's sections.", render: () => <DetailPageHeaderExample />, code: `<PageHeader
  back={{ label: "Projects", onClick: goBack }}
  title="Brand refresh"
  meta={<Badge size="small" theme={published ? "blue" : "green"} background="subtle">{published ? "Published" : "In review"}</Badge>}
  description="Logo, colour and type updates for the 2026 launch."
  actions={<Button level={published ? "tertiary" : "primary"} onClick={() => setPublished(!published)}>{published ? "Unpublish" : "Publish"}</Button>}
  tabs={<Tabs aria-label="Project sections" items={sections} value={tab} onChange={setTab} />}
/>` },
    { title: "Nested page", description: "Breadcrumbs above the title for pages deeper than one level.", render: () => <BreadcrumbHeaderExample />, code: `<PageHeader
  breadcrumbs={<Breadcrumbs items={[{ id: "settings", label: "Settings" }, { id: "billing", label: "Billing" }, { id: "invoices", label: "Invoices" }]} />}
  title="Invoices"
  description="Download receipts for every payment."
/>` },
    { title: "Overview page", description: "An eyebrow (Body/Small/Medium) above the Heading/1 title for top-level overview pages.", render: () => <OverviewHeaderExample />, code: `<PageHeader eyebrow="Good morning, Ava" title="Your workspace"
  description="3 projects need your review this week." actions={<Button level="primary" onClick={() => setCreating(true)}>New project</Button>} />` },
  ],
  toast: [
    { title: "useToast()", description: "Call toast() after an action; ZenProvider hosts the stack. Deleting a file shows an Undo action that restores it.", render: () => <UseToastExample />, code: `const { toast } = useToast();

function remove(name: string) {
  setFiles((list) => list.filter((file) => file !== name));
  toast({ type: "neutral", title: \`“\${name}” moved to trash\`, action: { label: "Undo", onClick: () => restore(name) } });
}` },
  ],
};
