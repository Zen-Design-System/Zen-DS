/* App Shell examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one part of the frame of the studio's web app: the Sidebar and
   top bar with their utilities, a Search-led top bar on a white Canvas, a task panel on a flat Canvas, a sticky
   selection footer, the drawer in a narrow window, a workspace-wide banner, and the same app on a phone, where Top and Bottom Navigation take
   over. One elevation per screen, set by the Sidebar: shadow cards beside the default Sidebar, bordered ones otherwise. */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { AlertBanner } from "../../../components/AlertBanner";
import { AppShell, AppShellAccount, AppShellAction } from "../../../components/AppShell";
import { Avatar, AvatarStack } from "../../../components/Avatar";
import { Badge, type BadgeTheme } from "../../../components/Badge";
import { BottomNavigation, type BottomNavigationItem } from "../../../components/BottomNavigation";
import { BottomSheet } from "../../../components/BottomSheet";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { Dialog } from "../../../components/Dialog";
import { DockIcon, type DockIconTheme } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { useFormState } from "../../../components/Form";
import type { IconName } from "../../../components/Icon";
import { InputField, SelectField } from "../../../components/Input";
import { Box, Container, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem, ToggleListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { MetricCard } from "../../../components/MetricWidget";
import { PageHeader } from "../../../components/PageHeader";
import { Search } from "../../../components/Search";
import { SidePanel } from "../../../components/SidePanel";
import { Sidebar, type SidebarSection } from "../../../components/Sidebar";
import { Table, TableMedia, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import {
  activity, daysFromToday, files, formatBytes, formatCompactMoney, formatDate, formatDay, formatDue, formatMoney, formatRelative, formatTime, initials,
  invoiceStatusTheme, invoices, me, people, peopleList, priorityTheme, projectById, projectStatusTheme, projects, studio, taskStatusTheme, tasks,
  type Invoice, type Person, type PersonId, type Project, type ProjectStatus, type StudioFile, type Task, type TaskStatus, type Team,
} from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./app-shell.css";

export const page: PlatformPage = "app-shell";

// ——— Shared parts ——————————————————————————————————————————————————————————————————————————————————————
/** Photo when the person has one, else initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const badge = (label: string, theme: BadgeTheme) => <Badge theme={theme} background="subtle">{label}</Badge>;
const taskBadge = (status: TaskStatus) => badge(status, taskStatusTheme[status]);
/** The caption follows the status: open work shows when it is due, finished work when it was done. */
const taskWhen = (task: Task) => (task.status === "Done" ? `Done ${formatDay(task.due)}` : formatDue(task.due));
/** An activity row's caption: what happened, then when. "· when" stays whole on one line with its dot, and a date in
    the object stays whole, so no line ends on a dot and no time or date splits; on a narrow page an unread row leads
    with New, since its Badge steps aside there. */
const wholeDates = (text: string) => text.split(/([A-Z][a-z]{2} \d{1,2}(?: – [A-Z][a-z]{2} \d{1,2})?, \d{4})/).map((part, index) => (
  index % 2 ? <span key={index} className="px-app-shell-value">{part}</span> : part
));
/** Where a notification leads: the invoice list, the profile (leave), or the projects the task belongs to. */
const notificationTarget = (item: { verb: string; object: string }): "invoices" | "profile" | "projects" =>
  /^INV-/.test(item.object) ? "invoices" : /leave/.test(item.verb) ? "profile" : "projects";
const activityCaption = (item: { verb: string; object: string; at: Date }, leadNew = false) => (
  <>{leadNew ? "New ·\u00a0" : null}{wholeDates(`${item.verb[0].toUpperCase()}${item.verb.slice(1)} ${item.object}`)}{" "}<span className="px-app-shell-value">{`· ${formatRelative(item.at)}`}</span></>
);

/** The width of an element, kept current: tables fold their columns when the page beside the Sidebar gets narrow. */
function useWidth() {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return [setElement, width] as const;
}

/** A fixed-height app window: the AppShell fills it, and its drawer (below 1024px) covers the window. */
function AppFrame({ children }: { children: ReactNode }) {
  return <div className="px-app-shell-frame"><div className="px-app-shell-frame__scroll">{children}</div></div>;
}

/** The page beside the Sidebar: Container keeps the page margin; one h1 (the PageHeader), then the content xl apart. */
// maxWidth "full": a page whose content is a non-widget Table spans the page (user rule 2026-10-03); Home and the other pages keep lg.
function Page({ children, pageRef, maxWidth }: { children: ReactNode; pageRef?: (element: HTMLElement | null) => void; maxWidth?: "lg" | "full" }) {
  return <Container ref={pageRef} maxWidth={maxWidth}><Stack gap="xl" className="px-app-shell-page">{children}</Stack></Container>;
}

/* The studio's mark and name. The logo slot is 24px high (20px in Small-Density): the mark is an image that fills it. */
const studioLogo = <span className="px-app-shell-brand"><img src={studio.logo} alt="" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></span>;
const studioMark = <Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />;
const denseLogo = <span className="px-app-shell-brand"><img src={studio.logo} alt="" /><Text as="span" textStyle="Body/Small/Bold">{studio.name}</Text></span>;
const denseMark = <img className="px-app-shell-mark" src={studio.logo} alt={studio.name} />;

type CardTheme = "shadow" | "border";

/** Profile and Settings, the two pages the account menu opens. */
function AccountPage({ id, card }: { id: "profile" | "settings"; card: CardTheme }) {
  return id === "profile" ? (
    <Page>
      <PageHeader title="Profile" description={`${me.role} · ${me.team} team`} />
      {/* A readable width keeps each term near its value. */}
      <Card theme={card} className="px-app-shell-details">
        <DescriptionList items={[
          { term: "Name", description: me.name },
          { term: "Email", description: me.email },
          { term: "Office", description: me.location },
          { term: "Approves leave for", description: "Design team" },
        ]} />
      </Card>
    </Page>
  ) : (
    <Page>
      <PageHeader title="Settings" description={`The ${studio.name} workspace`} />
      <Card theme={card} className="px-app-shell-details">
        <DescriptionList items={[
          { term: "Workspace", description: studio.name },
          { term: "Domain", description: studio.domain },
          { term: "Plan", description: "Business · 48 seats" },
          { term: "Time zone", description: "Ho Chi Minh City (GMT+7)" },
        ]} />
      </Card>
    </Page>
  );
}

/** The account menu at the end of the top bar (Profile, Settings, Sign out) and what Sign out leads to. */
function useAccount(go: (page: "profile" | "settings") => void) {
  const [confirming, setConfirming] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const menu = (
    <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
      { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => go("profile") },
      { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => go("settings") },
      { type: "separator" },
      { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => setConfirming(true) },
    ]} />
  );
  const dialog = (
    <Dialog open={confirming} onOpenChange={setConfirming} title={`Sign out of ${studio.name}?`} icon={false}
      description="You'll need your studio email to sign in again."
      primaryAction={{ label: "Sign out", onClick: () => { setConfirming(false); setSignedOut(true); } }} secondaryAction={{ label: "Cancel" }} />
  );
  const screen = signedOut ? (
    <Stack align="center" justify="center" gap="md" padding="xl" className="px-app-shell-signed-out">
      <Stack align="center" gap="xs">
        <Heading level={1} textStyle="Heading/1" align="center">You’re signed out</Heading>
        <Text tone="base" align="center">{`Sign in to get back to ${studio.name}.`}</Text>
      </Stack>
      <Button level="primary" onClick={() => setSignedOut(false)}>Sign in</Button>
    </Stack>
  ) : null;
  return { menu, dialog, screen };
}

// ——— 1. Studio app: Sidebar, top bar and page ——————————————————————————————————————————————————————————————
type StudioPage = "home" | "projects" | "invoices" | "notifications" | "profile" | "settings";
const studioPages: Record<StudioPage, string> = { home: "Home", projects: "Projects", invoices: "Invoices", notifications: "Notifications", profile: "Profile", settings: "Settings" };
const dueThisWeek = tasks.filter((task) => task.status !== "Done" && task.due <= daysFromToday(7)).sort((a, b) => +a.due - +b.due);
const outstanding = invoices.filter((invoice) => invoice.status === "Sent" || invoice.status === "Overdue").reduce((sum, invoice) => sum + invoice.amount, 0);

function StudioApp({ narrowWindow = false, notice = false }: { narrowWindow?: boolean; notice?: boolean }) {
  const { toast } = useToast();
  const [page, setPage] = useState<StudioPage>("home");
  const [noticeShown, setNoticeShown] = useState(notice);
  // Remember it per person in a real app (e.g. localStorage), so the rail stays the way they left it.
  const [collapsed, setCollapsed] = useState(false);
  const [unseen, setUnseen] = useState(3);
  // Opening a notification marks it read (its New goes) and goes to what it is about.
  const [read, setRead] = useState<string[]>([]);
  const [list, setList] = useState(projects);
  const [creating, setCreating] = useState(false);
  const [measure, width] = useWidth();
  const go = (next: StudioPage) => { setPage(next); if (next === "notifications") setUnseen(0); };
  const account = useAccount(go);
  const narrow = width > 0 && width < 640;
  // On a narrow page a trailing Badge would squeeze the row's title and caption, so it steps aside. A task's status is
  // secondary (the list is about what is due), so it waits for the wider page; a notification's New is what tells the
  // row apart, so it leads the caption instead.
  const compactRows = width > 0 && width < 480;
  const dueId = useId();
  const projectColumns: TableColumn<Project>[] = [
    { id: "project", header: "Project", cell: (row) => <TableMedia bold media={<DockIcon icon={row.icon} theme={row.theme} background="subtle" size="small" />} caption={row.client}>{row.name}</TableMedia> },
    // On a phone-width page no column has a fixed width, so they share the room instead of scrolling sideways.
    { id: "status", header: "Status", width: narrow ? undefined : "128px", cell: (row) => badge(row.status, projectStatusTheme[row.status]) },
    ...(narrow ? [] : [
      { id: "lead", header: "Lead", width: "168px", cell: (row: Project) => <TableText>{people[row.lead].name}</TableText> },
      { id: "due", header: "Due", width: "152px", cell: (row: Project) => <TableText>{formatDate(row.due)}</TableText> },
    ]),
  ];
  const invoiceColumns: TableColumn<Invoice>[] = [
    { id: "invoice", header: "Invoice", cell: (row) => <TableText bold caption={narrow ? `${row.client} · ${formatMoney(row.amount, true)}` : row.client}>{row.number}</TableText> },
    { id: "status", header: "Status", width: narrow ? undefined : "128px", cell: (row) => badge(row.status, invoiceStatusTheme[row.status]) },
    ...(narrow ? [] : [
      { id: "due", header: "Due", width: "152px", cell: (row: Invoice) => <TableText>{formatDate(row.due)}</TableText> },
      { id: "amount", header: "Amount", align: "right" as const, width: "136px", cell: (row: Invoice) => <TableText>{formatMoney(row.amount, true)}</TableText> },
    ]),
  ];

  let content: ReactNode;
  if (page === "profile" || page === "settings") content = <AccountPage id={page} card="shadow" />;
  else if (page === "projects") {
    content = (
      <Page pageRef={measure} maxWidth="full">
        <PageHeader title="Projects" description={plural(list.length, "project")}
          actions={<Button level="primary" onClick={() => setCreating(true)}>New project</Button>} />
        {/* A page's table lies on the Canvas: no Card. */}
        <Table aria-label="Projects" rows={list} columns={projectColumns} />
      </Page>
    );
  } else if (page === "invoices") {
    content = (
      <Page pageRef={measure} maxWidth="full">
        <PageHeader title="Invoices" description={`${formatMoney(outstanding)} outstanding`} />
        <Table aria-label="Invoices" rows={invoices} columns={invoiceColumns} />
      </Page>
    );
  } else if (page === "notifications") {
    content = (
      <Page pageRef={measure}>
        <PageHeader title="Notifications" description="Comments, reviews and approvals from the last week" />
        {/* A list of rows sits in a ListBox. */}
        <ListBox theme="shadow">
          <List aria-label="Notifications">
            {activity.map((item) => {
              const unread = item.unread && !read.includes(item.id);
              return (
                <ListItem key={item.id} title={people[item.actor].name}
                  caption={activityCaption(item, unread && compactRows)}
                  leading={<Avatar size="md" {...avatarOf(people[item.actor])} />}
                  trailing={unread && !compactRows ? badge("New", "accent") : undefined}
                  onClick={() => { setRead((ids) => ids.includes(item.id) ? ids : [...ids, item.id]); go(notificationTarget(item)); }} />
              );
            })}
          </List>
        </ListBox>
      </Page>
    );
  } else {
    content = (
      <Page pageRef={measure}>
        <PageHeader title="Home" description={`${plural(dueThisWeek.length, "task")} due this week across ${plural(new Set(dueThisWeek.map((task) => task.project)).size, "project")}`} />
        {/* Three peers share the neutral tile; a phone puts them two across. */}
        <Grid columns={{ mobile: 2, desktop: 3 }} gap="md">
          <MetricCard label="Active projects" value={String(list.filter((project) => project.status === "Active").length)} icon="icon-folder-line" theme="shadow" />
          <MetricCard label="Due this week" value={String(dueThisWeek.length)} icon="icon-calendar-line" theme="shadow" />
          <MetricCard label="Outstanding" value={formatCompactMoney(outstanding)} icon="icon-coins-line" theme="shadow" />
        </Grid>
        <Stack as="section" gap="md" aria-labelledby={dueId}>
          <Heading level={2} id={dueId} textStyle="Heading/4">Due this week</Heading>
          {/* zen-detached: Card · Zen Studio */}
          <ListBox theme="shadow">
            <List aria-labelledby={dueId}>
              {dueThisWeek.map((task) => (
                <ListItem key={task.id} title={task.title} titleLines={2} caption={`${task.key} · ${taskWhen(task)}`}
                  leading={<Avatar size="md" {...avatarOf(people[task.assignee])} />} trailing={compactRows ? undefined : taskBadge(task.status)} />
              ))}
            </List>
          </ListBox>
        </Stack>
      </Page>
    );
  }

  const sections: SidebarSection[] = [{ items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
  ] }];
  const shell = account.screen ?? (
    <AppShell
      // A message for the whole workspace sits above the shell and stays in view on every page.
      banner={noticeShown ? (
        <AlertBanner theme="warning" onClose={() => { setNoticeShown(false); toast({ title: "Notice hidden", action: { label: "Undo", onClick: () => setNoticeShown(true) } }); }}>
          Zen is read-only tonight from 11:00 pm to 1:00 am while the studio moves to a new data centre.
        </AlertBanner>
      ) : undefined}
      sidebar={<Sidebar logo={studioLogo} logoCollapsed={studioMark} sections={sections} selectedId={page} onItemClick={(item) => go(item.id as StudioPage)} />}
      sidebarCollapsed={collapsed}
      onSidebarCollapsedChange={setCollapsed}
      // The top bar: the toggle, the trail (Home first, no master icon: the Sidebar already says where you are)…
      header={<Breadcrumbs master={false} items={page === "home" ? [{ id: "home", label: "Home" }] : [{ id: "home", label: "Home" }, { id: page, label: studioPages[page] }]}
        onNavigate={(item, event) => { event.preventDefault(); go(item.id as StudioPage); }} />}
      // …then utilities only: the plan, Notifications with its unread count, the account menu last.
      headerActions={<>
        <Badge theme="accent" background="subtle" leadingIcon={false}>Business</Badge>
        <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unseen} onClick={() => go("notifications")} />
        {account.menu}
      </>}
    >
      {content}
    </AppShell>
  );
  return (
    <>
      {narrowWindow ? <div className="px-app-shell-window"><AppFrame>{shell}</AppFrame></div> : <AppFrame>{shell}</AppFrame>}
      {account.dialog}
      <DemoFieldDialog open={creating} onOpenChange={setCreating} title="New project" field={{ kind: "name", label: "Project name", placeholder: "Saola trail guide" }}
        submitLabel="Create project" confirm={(name) => `${name} created`}
        onSubmit={(name) => setList((current) => [{ ...projects[5], id: `new-${current.length}`, name, client: studio.name, icon: "icon-cube-line", theme: "neutral", status: "Planning", lead: "alex", start: daysFromToday(0), due: daysFromToday(60) }, ...current])} />
    </>
  );
}

// ——— 2. Search in the top bar, on a white Canvas ——————————————————————————————————————————————————————————————
type PeoplePage = "people" | "teams" | "activity" | "profile" | "settings";
type Row = { id: string; name: string; role: string; team: Team | "Not set yet"; location: string; person?: Person };
const directory: Row[] = [...peopleList].sort((a, b) => a.name.localeCompare(b.name)).map((person) => ({ id: person.id, name: person.name, role: person.role, team: person.team, location: person.location, person }));
const teamList: { team: Team; icon: IconName; theme: DockIconTheme }[] = [
  { team: "Design", icon: "icon-palette-line", theme: "pink" },
  { team: "Engineering", icon: "icon-code-02-line", theme: "blue" },
  { team: "Delivery", icon: "icon-target-04-line", theme: "orange" },
  { team: "Client Services", icon: "icon-users-line", theme: "purple" },
  { team: "Operations", icon: "icon-briefcase-line", theme: "teal" },
];

function PeopleDirectoryApp() {
  const [page, setPage] = useState<PeoplePage>("people");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(directory);
  const [news, setNews] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [measure, width] = useWidth();
  const go = (next: PeoplePage) => { setPage(next); if (next === "activity") setNews(false); };
  const account = useAccount(go);
  const narrow = width > 0 && width < 640;
  const q = query.trim().toLowerCase();
  const shown = rows.filter((row) => !q || `${row.name} ${row.role} ${row.team} ${row.location}`.toLowerCase().includes(q));
  const columns: TableColumn<Row>[] = [
    { id: "person", header: "Person", cell: (row) => (
      <TableMedia bold caption={row.role} media={row.person ? <Avatar size="small" {...avatarOf(row.person)} /> : <Avatar size="small" theme="neutral" background="subtle" alt="">{row.name.slice(0, 2).toUpperCase()}</Avatar>}>{row.name}</TableMedia>
    ) },
    { id: "team", header: "Team", width: narrow ? undefined : "176px", cell: (row) => <TableText>{row.team}</TableText> },
    ...(narrow ? [] : [{ id: "office", header: "Office", width: "176px", cell: (row: Row) => <TableText>{row.location}</TableText> }]),
  ];

  let content: ReactNode;
  if (page === "profile" || page === "settings") content = <AccountPage id={page} card="border" />;
  else if (page === "teams") {
    content = (
      <Page>
        <PageHeader title="Teams" description={plural(teamList.length, "team")} />
        {/* On a white Canvas the cards take a Pale border, never a shadow. */}
        <Grid as="ul" minColumnWidth={240} gap="md" aria-label="Teams">
          {teamList.map(({ team, icon, theme }) => {
            const members = peopleList.filter((person) => person.team === team);
            return (
              <Card as="li" key={team} theme="border">
                <Stack gap="md">
                  <DockIcon icon={icon} theme={theme} background="subtle" />
                  <Stack gap="xs">
                    <Heading level={2} textStyle="Heading/Subheading">{team}</Heading>
                    <Text textStyle="Body/Small/Regular" tone="base">{plural(members.length, "person", "people")}</Text>
                  </Stack>
                  <AvatarStack size="sm" items={members.map((person) => (person.photo ? { src: person.photo, alt: person.name, theme: "photo" as const } : { alt: person.name, theme: person.theme }))} />
                  <Button level="tertiary" aria-label={`View people in ${team}`} onClick={() => { setQuery(team); go("people"); }}>View people</Button>
                </Stack>
              </Card>
            );
          })}
        </Grid>
      </Page>
    );
  } else if (page === "activity") {
    content = (
      <Page>
        <PageHeader title="Activity" description="What changed in the studio this week" />
        <ListBox theme="border">
          <List aria-label="Activity">
            {activity.map((item) => (
              <ListItem key={item.id} title={people[item.actor].name} caption={activityCaption(item)}
                leading={<Avatar size="md" {...avatarOf(people[item.actor])} />} />
            ))}
          </List>
        </ListBox>
      </Page>
    );
  } else {
    content = (
      <Page pageRef={measure} maxWidth="full">
        <PageHeader title="People" description={q ? `${plural(shown.length, "person", "people")} match “${query.trim()}”` : `${plural(rows.length, "person", "people")} at ${studio.name}`}
          actions={<Button level="primary" startIcon="icon-user-plus-line" onClick={() => setInviting(true)}>Invite person</Button>} />
        <Table aria-label="People" rows={shown} columns={columns}
          empty={<EmptyState headingLevel={2} illustration={false} title="No people match" secondaryAction={{ label: "Show everyone", onClick: () => setQuery("") }}>Try a name, a role or a team.</EmptyState>} />
      </Page>
    );
  }

  return (
    <>
      <AppFrame>
        {account.screen ?? (
          // A white Canvas (alt) takes a Surface-alt Sidebar and bordered cards: no shadows on this screen.
          <AppShell canvas="alt"
            sidebar={<Sidebar background="alt" logo={studioLogo} logoCollapsed={studioMark} selectedId={page} onItemClick={(item) => go(item.id as PeoplePage)}
              sections={[{ items: [
                { id: "people", label: "People", icon: "icon-users-line" },
                { id: "teams", label: "Teams", icon: "icon-grid-01-line" },
                { id: "activity", label: "Activity", icon: "icon-clock-line" },
              ] }]} />}
            // A Search leads the top bar: it finds people from any page and opens the directory with the results.
            header={<Stack direction="row" fillChildren width={240}><Search placeholder="Search people" aria-label="Search people" value={query}
              onValueChange={(value) => { setQuery(value); if (value.trim()) go("people"); }} /></Stack>}
            headerActions={<>
              <AppShellAction icon="icon-bell-01-line" aria-label="Activity" dot={news} onClick={() => go("activity")} />
              {account.menu}
            </>}
          >
            {content}
          </AppShell>
        )}
      </AppFrame>
      {account.dialog}
      <DemoFieldDialog open={inviting} onOpenChange={setInviting} title="Invite person" field={{ kind: "email", label: "Email address", placeholder: "name@dizai.studio" }}
        submitLabel="Send invite" confirm={(email) => `Invite sent to ${email}`}
        onSubmit={(email) => setRows((list) => [{ id: email, name: email, role: "Invited", team: "Not set yet", location: "Not set yet" }, ...list])} />
    </>
  );
}

// ——— 3. A docked task panel, on a flat Canvas ——————————————————————————————————————————————————————————————
type View = "all" | "mine" | "review";
const views: Record<View, { label: string; icon: IconName; description: string; filter: (task: Task) => boolean }> = {
  all: { label: "All tasks", icon: "icon-check-square-line", description: "Every open project at the studio", filter: () => true },
  mine: { label: "Assigned to me", icon: "icon-user-circle-line", description: `Tasks ${me.name} owns`, filter: (task) => task.assignee === "alex" },
  review: { label: "In review", icon: "icon-eye-line", description: "Waiting for a reviewer", filter: (task) => task.status === "In review" },
};

function TaskWorkbench() {
  const { toast } = useToast();
  const [view, setView] = useState<View>("all");
  const [collapsed, setCollapsed] = useState(true);
  const [rows, setRows] = useState(tasks);
  const [openId, setOpenId] = useState<string | null>(null);
  const [measure, width] = useWidth();
  const narrow = width > 0 && width < 560;
  const shown = rows.filter(views[view].filter);
  const task = rows.find((item) => item.id === openId);
  const setStatus = (id: string, status: TaskStatus) => setRows((list) => list.map((item) => (item.id === id ? { ...item, status } : item)));
  const columns: TableColumn<Task>[] = [
    // The column that names the row is bold, as TableMedia is by default.
    { id: "task", header: "Task", cell: (row) => <TableText bold caption={narrow ? `${row.key} · ${people[row.assignee].name}` : row.key}>{row.title}</TableText> },
    ...(narrow ? [] : [{ id: "assignee", header: "Assignee", width: "168px", cell: (row: Task) => <TableMedia bold={false} media={<Avatar size="xsmall" {...avatarOf(people[row.assignee])} />}>{people[row.assignee].name}</TableMedia> }]),
    { id: "status", header: "Status", width: narrow ? undefined : "136px", cell: (row) => taskBadge(row.status) },
  ];
  return (
    <AppFrame>
      {/* A flat Canvas pairs with a flat Sidebar: navigation and page are one plane, so the cards take a border. With no
          top bar, the Sidebar keeps its own collapse control (onCollapsedChange). */}
      <AppShell canvas="flat"
        sidebar={<Sidebar variant="small-density" background="flat" logo={denseLogo} logoCollapsed={denseMark} collapsed={collapsed} onCollapsedChange={setCollapsed}
          selectedId={view} onItemClick={(item) => { setView(item.id as View); setOpenId(null); }}
          sections={[{ items: (Object.keys(views) as View[]).map((id) => ({ id, label: views[id].label, icon: views[id].icon, counter: rows.filter(views[id].filter).filter((item) => item.status !== "Done").length || undefined })) }]} />}
        // The task opens beside the page; when the page would get narrower than a tablet, the panel opens as a modal.
        aside={(
          <SidePanel type="standard" size="small" open={Boolean(task)} onOpenChange={(open) => { if (!open) setOpenId(null); }}
            title={task?.title ?? ""} description={task ? `${task.key} · ${projectById(task.project).name}` : undefined}
            primaryAction={task ? (task.status === "Done"
              ? { label: "Reopen task", onClick: () => setStatus(task.id, "To do") }
              : { label: "Mark as done", onClick: () => { const before = task.status; setStatus(task.id, "Done"); toast({ title: "Task completed", action: { label: "Undo", onClick: () => setStatus(task.id, before) } }); } }) : undefined}
            secondaryAction={{ label: "Close" }}>
            {task ? (
              <DescriptionList divider items={[
                { term: "Status", description: taskBadge(task.status) },
                { term: "Priority", description: badge(task.priority, priorityTheme[task.priority]) },
                { term: "Assignee", description: people[task.assignee].name },
                { term: "Due", description: formatDate(task.due) },
                { term: "Comments", description: plural(task.comments, "comment") },
              ]} />
            ) : null}
          </SidePanel>
        )}
      >
        <Page pageRef={measure} maxWidth="full">
          <PageHeader title={views[view].label} description={`${views[view].description} · ${plural(shown.length, "task")}`} />
          <Table aria-label={views[view].label} rows={shown} columns={columns} onRowClick={(row) => setOpenId(row.id)} />
        </Page>
      </AppShell>
    </AppFrame>
  );
}

// ——— 4. A sticky selection footer ————————————————————————————————————————————————————————————————————————
type Folder = "all" | "clients" | "studio";
const moreFiles: StudioFile[] = [
  { id: "f7", name: "Lumen Bank SOW v3.pdf", bytes: 412_000, owner: "hana", project: "lumen-banking", updated: daysFromToday(0, 9, 12) },
  { id: "f8", name: "Transfers journey map.fig", bytes: 24_600_000, owner: "alex", project: "lumen-banking", updated: daysFromToday(-3, 15, 10) },
  { id: "f9", name: "Session highlights.mp4", bytes: 48_200_000, owner: "emi", project: "lumen-banking", updated: daysFromToday(-4, 17, 45) },
  { id: "f10", name: "Points history – copy deck.docx", bytes: 64_000, owner: "linh", project: "phin-loyalty", updated: daysFromToday(-1, 11, 20) },
  { id: "f11", name: "Customs hold states.pdf", bytes: 980_000, owner: "duy", project: "mekong-tracking", updated: daysFromToday(-6, 10, 0) },
  { id: "f12", name: "Saola moodboard.fig", bytes: 36_100_000, owner: "gia", project: "saola-brand", updated: daysFromToday(-4, 10, 15) },
  { id: "f13", name: "Zen tokens 0.4.json", bytes: 142_000, owner: "bao", project: "zen-ds", updated: daysFromToday(-2, 16, 30) },
  { id: "f14", name: "Studio handbook.pdf", bytes: 3_900_000, owner: "minhAnh", project: "zen-ds", updated: daysFromToday(-12, 9, 0) },
];
const allFiles = [...files, ...moreFiles].sort((a, b) => +b.updated - +a.updated);
const folders: Record<Folder, { label: string; icon: IconName; filter: (file: StudioFile) => boolean }> = {
  all: { label: "All files", icon: "icon-file-doc-line", filter: () => true },
  clients: { label: "Client work", icon: "icon-briefcase-line", filter: (file) => projectById(file.project).client !== studio.name },
  studio: { label: "Studio", icon: "icon-building-02-line", filter: (file) => projectById(file.project).client === studio.name },
};

function FilesApp() {
  const { toast } = useToast();
  const [folder, setFolder] = useState<Folder>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [measure, width] = useWidth();
  const [page, setPage] = useState<"files" | "profile" | "settings">("files");
  const account = useAccount(setPage);
  const openFolder = (next: Folder) => { setPage("files"); setFolder(next); setSelected([]); };
  const narrow = width > 0 && width < 640;
  const shown = allFiles.filter(folders[folder].filter);
  const columns: TableColumn<StudioFile>[] = [
    { id: "name", header: "Name", cell: (file) => <TableMedia bold media={<FileIcon format={fileIconFormatOf(file.name)} size={narrow ? "lg" : "base"} />} caption={narrow ? `${formatBytes(file.bytes)} · ${formatRelative(file.updated)}` : undefined}>{file.name}</TableMedia> },
    ...(narrow ? [] : [
      { id: "owner", header: "Owner", width: "168px", cell: (file: StudioFile) => <TableMedia bold={false} media={<Avatar size="xsmall" {...avatarOf(people[file.owner])} />}>{people[file.owner].name}</TableMedia> },
      { id: "updated", header: "Modified", width: "200px", cell: (file: StudioFile) => <TableText>{formatRelative(file.updated)}</TableText> },
      { id: "size", header: "Size", align: "right" as const, width: "96px", cell: (file: StudioFile) => <TableText>{formatBytes(file.bytes)}</TableText> },
    ]),
  ];
  const download = () => {
    toast({ title: "Download started", children: plural(selected.length, "file") });
    setSelected([]);
  };
  return (
    <>
      <AppFrame>
        {account.screen ?? (
          // Starts on the icon rail (defaultSidebarCollapsed), so the table gets the width; the toggle expands it.
          <AppShell defaultSidebarCollapsed
            sidebar={<Sidebar logo={studioLogo} logoCollapsed={studioMark} selectedId={page === "files" ? folder : undefined} onItemClick={(item) => openFolder(item.id as Folder)}
              sections={[{ items: (Object.keys(folders) as Folder[]).map((id) => ({ id, label: folders[id].label, icon: folders[id].icon })) }]} />}
            header={<Breadcrumbs master={false} items={[{ id: "files", label: "Files" }, ...(page === "files" ? [{ id: folder, label: folders[folder].label }] : [{ id: page, label: page === "profile" ? "Profile" : "Settings" }])]}
              onNavigate={(_, event) => { event.preventDefault(); openFolder("all"); }} />}
            headerActions={account.menu}
            // The footer sticks to the bottom of the page column while rows are selected.
            footer={page === "files" && selected.length ? (
              <ActionBar position="static" direction="horizontal" summary={`${plural(selected.length, "file")} selected`}
                secondaryAction={{ label: "Clear selection", onClick: () => setSelected([]) }}
                primaryAction={{ label: "Download", onClick: download }} />
            ) : undefined}
          >
            {page === "files" ? (
              <Page pageRef={measure} maxWidth="full">
                <PageHeader title={folders[folder].label} description={`${plural(shown.length, "file")} · newest first`} />
                <Table aria-label={folders[folder].label} rows={shown} columns={columns} selectable selectedIds={selected} onSelectionChange={setSelected} />
              </Page>
            ) : <AccountPage id={page} card="shadow" />}
          </AppShell>
        )}
      </AppFrame>
      {account.dialog}
    </>
  );
}

// ——— 6. The same app on a phone ————————————————————————————————————————————————————————————————————————
type Root = "home" | "projects" | "profile";
type PhoneProject = { id: string; name: string; client: string; icon: IconName; theme: DockIconTheme; status: ProjectStatus; due: Date };
const sideProjects: PhoneProject[] = [
  { id: "phin-gift", name: "Gift cards", client: "Phin & Co", icon: "icon-gift-01-line", theme: "orange", status: "Active", due: daysFromToday(21) },
  { id: "phin-barista", name: "Barista training app", client: "Phin & Co", icon: "icon-coffee-cup-line", theme: "orange", status: "Completed", due: daysFromToday(-40) },
  { id: "lumen-cards", name: "Card controls", client: "Lumen Bank", icon: "icon-credit-card-line", theme: "blue", status: "Planning", due: daysFromToday(120) },
  { id: "lumen-savings", name: "Savings goals", client: "Lumen Bank", icon: "icon-piggy-bank-line", theme: "blue", status: "Active", due: daysFromToday(64) },
  { id: "mekong-driver", name: "Driver app", client: "Mekong Freight", icon: "icon-route-line", theme: "teal", status: "On hold", due: daysFromToday(150) },
  { id: "bookfair-portal", name: "Exhibitor portal", client: "Hanoi Book Fair", icon: "icon-ticket-01-line", theme: "purple", status: "Completed", due: daysFromToday(-60) },
  { id: "saola-trails", name: "Trail guide app", client: "Saola Outdoor", icon: "icon-map-line", theme: "green", status: "Planning", due: daysFromToday(140) },
  { id: "studio-site", name: "Studio website", client: studio.name, icon: "icon-globe-01-line", theme: "indigo", status: "Active", due: daysFromToday(45) },
];
const phoneProjects: PhoneProject[] = [...projects.map(({ id, name, client, icon, theme, status, due }) => ({ id, name, client, icon, theme, status, due })), ...sideProjects]
  .sort((a, b) => a.name.localeCompare(b.name));
const meetings = [
  { id: "m1", title: "Design critique", start: daysFromToday(0, 11, 0), where: "Studio room 2", project: "phin-loyalty" },
  { id: "m2", title: "Lumen Bank check-in", start: daysFromToday(0, 14, 0), where: "Video call", project: "lumen-banking" },
  { id: "m3", title: "Zen office hours", start: daysFromToday(0, 16, 30), where: "Studio room 1", project: "zen-ds" },
];
const recentFiles = [...files].sort((a, b) => +b.updated - +a.updated).slice(0, 3);
const clientOptions = [...new Set(phoneProjects.map((project) => project.client))].map((client) => ({ value: client, label: client }));

/** One group of a grouped list: a white block under the kicker that names it, the kicker aligned with the row text. */
function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Stack as="section" gap="xs" aria-labelledby={id}>
      <Box paddingX="lg"><Heading level={2} id={id} textStyle="Body/Small/Bold" tone="light">{title}</Heading></Box>
      <ListBox>{children}</ListBox>
    </Stack>
  );
}

function PhoneApp() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const [root, setRoot] = useState<Root>("home");
  // A pushed screen over the current root: Notifications from Home, a project from Projects.
  const [pushed, setPushed] = useState<string | null>(null);
  const [unseen, setUnseen] = useState(true);
  const [read, setRead] = useState<string[]>([]);
  const [list, setList] = useState(phoneProjects);
  const [creating, setCreating] = useState(false);
  const [push, setPush] = useState(true);
  const [digest, setDigest] = useState(false);
  const form = useFormState<{ name: string; client: string }>({
    initialValues: { name: "", client: "Phin & Co" },
    validate: (values) => ({ name: values.name.trim() ? undefined : "Enter a project name" }),
    onSubmit: (values, { reset }) => {
      setList((current) => [{ id: `new-${current.length}`, name: values.name.trim(), client: values.client, icon: "icon-cube-line", theme: "neutral", status: "Planning", due: daysFromToday(90) }, ...current]);
      setCreating(false);
      reset();
      toast({ type: "positive", title: "Project created", children: values.name.trim() });
    },
  });
  const items: BottomNavigationItem[] = [
    { id: "home", label: "Home", icon: "icon-home-smile-line", selectedIcon: "icon-home-smile-solid" },
    { id: "projects", label: "Projects", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
    { id: "profile", label: "Profile", icon: "icon-user-circle-line", selectedIcon: "icon-user-circle-solid" },
  ];
  // Tapping the current root again scrolls it back to the top; another root opens at its top.
  const openRoot = (id: string) => {
    if (id === root && !pushed) screen.scrollTop();
    setRoot(id as Root);
    setPushed(null);
  };
  // The Bottom Navigation stays on pushed screens of the same root.
  const footer = <BottomNavigation aria-label={studio.name} items={items} value={root} onValueChange={openRoot} showLabels />;

  if (pushed === "notifications") {
    return (
      <PlatformPhone key="notifications" label="Zen app" headerOverlay screenRef={screenRef} footer={footer}
        header={<TopNavigation type="compact-alt" title="Notifications" scrollRef={screenRef}
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go('.zen-top-nav__action[aria-label^="Notifications"]', () => setPushed(null)) }} />}>
        {screen.anchor}
        {/* Rows have no side padding of their own: the screen margin (lg, 20px) insets the List. A row opens what it
            is about and marks itself read; an invoice stays a desk task (the web app). */}
        <Box paddingX="lg" paddingY="xs">
          <List aria-label="Notifications">
            {[...activity, ...moreActivity].map((item) => {
              const target = notificationTarget(item);
              const open = () => {
                setRead((ids) => ids.includes(item.id) ? ids : [...ids, item.id]);
                if (target === "invoices") toast({ title: `${item.object} is in the web app`, children: "Invoices stay on the desktop." });
                else screen.go('.zen-top-nav__action, .zen-list-item__wrapper', () => { setPushed(null); setRoot(target); });
              };
              return (
                <ListItem key={item.id} title={people[item.actor].name} caption={activityCaption(item, Boolean("unread" in item && item.unread) && !read.includes(item.id))}
                  leading={<Avatar size="md" {...avatarOf(people[item.actor])} />} onClick={open} />
              );
            })}
          </List>
        </Box>
      </PlatformPhone>
    );
  }
  const project = list.find((item) => item.id === pushed);
  if (project) {
    return (
      <PlatformPhone key={project.id} label="Zen app" canvas="alt" headerOverlay screenRef={screenRef} footer={footer}
        header={<TopNavigation type="compact-alt" title={project.name} scrollRef={screenRef}
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go(`[data-project="${project.id}"] .zen-list-item__wrapper`, () => setPushed(null)) }} />}>
        {screen.anchor}
        <Box padding="lg">
          <Card theme="flat">
            <DescriptionList items={[
              { term: "Client", description: project.client },
              { term: "Status", description: badge(project.status, projectStatusTheme[project.status]) },
              { term: project.status === "Completed" ? "Finished" : "Due", description: formatDate(project.due) },
            ]} />
          </Card>
        </Box>
      </PlatformPhone>
    );
  }

  if (root === "projects") {
    return (
      <PlatformPhone key="projects" label="Zen app" headerOverlay screenRef={screenRef} footer={footer}
        // The page's Primary (New project) becomes the root's trailing action.
        header={<TopNavigation type="alt" title="Projects" largeTitle="Projects" scrollRef={screenRef}
          trailing={[{ icon: "icon-plus-line", label: "New project", onClick: () => setCreating(true) }]} />}>
        {screen.anchor}
        {/* The screen margin (lg, 20px) insets the rows sideways; xs (8px) above and below, like a List-Box on a phone. */}
        <Box paddingX="lg" paddingY="xs">
          <List aria-label="Projects">
            {list.map((item) => (
              <ListItem key={item.id} data-project={item.id} title={item.name} caption={item.client}
                leading={<DockIcon icon={item.icon} theme={item.theme} background="subtle" size="md" />}
                trailing={badge(item.status, projectStatusTheme[item.status])}
                onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setPushed(item.id))} />
            ))}
          </List>
        </Box>
        <BottomSheet inline open={creating} onOpenChange={(open) => { setCreating(open); if (!open) form.reset(); }} title="New project" onSubmit={form.handleSubmit}
          primaryAction={{ label: "Create project" }} secondaryAction={{ label: "Cancel" }}>
          <InputField label="Project name" placeholder="Saola trail guide" data-autofocus="" {...form.field("name")} />
          <SelectField label="Client" options={clientOptions} {...form.selectField("client")} />
        </BottomSheet>
      </PlatformPhone>
    );
  }

  if (root === "profile") {
    return (
      // The account menu's job: a grouped list on Surface-Alt.
      <PlatformPhone key="profile" label="Zen app" canvas="alt" headerOverlay screenRef={screenRef} footer={footer}
        header={<TopNavigation type="alt" title="Profile" largeTitle="Profile" scrollRef={screenRef} />}>
        {screen.anchor}
        <Stack gap="lg" padding="lg">
          <ListBox>
            <List aria-label="Signed in as">
              <ListItem title={me.name} caption={`${me.role} · ${me.location}`} leading={<Avatar size="md" {...avatarOf(me)} />} />
            </List>
          </ListBox>
          <Group id={`${baseId}-account`} title="Account">
            <List aria-labelledby={`${baseId}-account`}>
              <ListItem title="Email" caption={me.email} leading={<DockIcon icon="icon-mail-01-line" theme="blue" background="subtle" size="md" />} />
              <ListItem title="Workspace" caption={`${studio.name} · Business`} leading={<DockIcon icon="icon-building-02-line" theme="indigo" background="subtle" size="md" />} />
              <ListItem title="Office" caption={me.location} leading={<DockIcon icon="icon-marker-pin-01-line" theme="green" background="subtle" size="md" />} />
            </List>
          </Group>
          {/* Settings rows whose whole surface is the switch: the switches line up on the block's right edge. */}
          <Group id={`${baseId}-notify`} title="Notifications">
            <List aria-labelledby={`${baseId}-notify`}>
              <ToggleListItem title="Push notifications" caption="Comments, reviews and approvals" checked={push} onCheckedChange={setPush} />
              <ToggleListItem title="Daily email digest" caption="Every morning at 8:00 am" checked={digest} onCheckedChange={setDigest} />
            </List>
          </Group>
        </Stack>
      </PlatformPhone>
    );
  }

  return (
    // Home: the top bar's Notifications becomes the root's trailing action, with a dot until it is opened.
    <PlatformPhone key="home" label="Zen app" canvas="alt" headerOverlay screenRef={screenRef} footer={footer}
      header={<TopNavigation type="alt" title="Home" largeTitle="Home" scrollRef={screenRef}
        trailing={[{ icon: "icon-bell-01-line", label: unseen ? "Notifications, new" : "Notifications", dot: unseen, onClick: () => screen.go('.platform-phone__screen .zen-list-item__wrapper', () => { setUnseen(false); setPushed("notifications"); }) }]}
        topBar={false} />}>
      {screen.anchor}
      <Stack gap="lg" padding="lg">
        <Group id={`${baseId}-today`} title="Today">
          <List aria-labelledby={`${baseId}-today`}>
            {meetings.map((meeting) => {
              const p = projectById(meeting.project);
              return <ListItem key={meeting.id} title={meeting.title} caption={`${formatTime(meeting.start)} · ${meeting.where}`} leading={<DockIcon icon={p.icon} theme={p.theme} background="subtle" size="md" />} />;
            })}
          </List>
        </Group>
        <Group id={`${baseId}-due`} title="Due this week">
          <List aria-labelledby={`${baseId}-due`}>
            {dueThisWeek.map((task) => (
              <ListItem key={task.id} title={task.title} titleLines={1} caption={`${task.key} · ${formatDue(task.due)}`} leading={<Avatar size="md" {...avatarOf(people[task.assignee])} />} />
            ))}
          </List>
        </Group>
        <Group id={`${baseId}-files`} title="Recent files">
          <List aria-labelledby={`${baseId}-files`}>
            {recentFiles.map((file) => (
              <ListItem key={file.id} title={file.name} titleLines={2} caption={`${formatBytes(file.bytes)} · ${formatRelative(file.updated)}`} leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} />
            ))}
          </List>
        </Group>
      </Stack>
    </PlatformPhone>
  );
}
/** Older notifications, so the list runs past the screen. */
const moreActivity: { id: string; actor: PersonId; verb: string; object: string; at: Date }[] = [
  { id: "a7", actor: "ava", verb: "added a clip to", object: "Session highlights", at: daysFromToday(-1, 8, 40) },
  { id: "a8", actor: "emi", verb: "mentioned you in", object: "Points counter motion", at: daysFromToday(-1, 14, 5) },
  { id: "a9", actor: "finn", verb: "closed", object: "Spike: passkey sign-in on iOS", at: daysFromToday(-2, 11, 20) },
  { id: "a10", actor: "em", verb: "filed 2 bugs on", object: "Loyalty app", at: daysFromToday(-3, 17, 30) },
  { id: "a11", actor: "gia", verb: "shared", object: "Saola moodboard", at: daysFromToday(-4, 10, 15) },
  { id: "a12", actor: "linh", verb: "edited", object: "Saola tone of voice", at: daysFromToday(-6, 15, 45) },
  { id: "a13", actor: "khoa", verb: "mapped", object: "Customs hold states", at: daysFromToday(-9, 9, 10) },
  { id: "a14", actor: "bao", verb: "published", object: "Zen tokens 0.4", at: daysFromToday(-12, 16, 30) },
];

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Studio app",
    description: "The frame of the studio's web app: the Sidebar, then a top bar that starts with the collapse toggle and the Breadcrumbs and keeps only utilities on the right (the plan, Notifications with its count, the account menu). Page actions stay in the PageHeader. Beside the default Sidebar every card takes its shadow and no border.",
    wide: true,
    screen: true,
    render: () => <StudioApp />,
    code: `const [collapsed, setCollapsed] = useState(false); // store it per person

<AppShell
  sidebar={<Sidebar logo={logo} logoCollapsed={mark} sections={sections} selectedId={page} onItemClick={(item) => go(item.id)} />}
  sidebarCollapsed={collapsed}
  onSidebarCollapsedChange={setCollapsed}
  header={<Breadcrumbs master={false} items={[{ id: "home", label: "Home" }, { id: "projects", label: "Projects" }]}
    onNavigate={(item, event) => { event.preventDefault(); go(item.id); }} />}
  headerActions={<>
    <Badge theme="accent" background="subtle" leadingIcon={false}>Business</Badge>
    <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unseen} onClick={() => go("notifications")} />
    <Menu align="end" trigger={<AppShellAccount name="Alex Duong" src={alex.photo} />} items={[
      { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => go("profile") },
      { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => go("settings") },
      { type: "separator" },
      { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: confirmSignOut },
    ]} />
  </>}
>
  <Container maxWidth="full">
    <Stack gap="xl">
      <PageHeader title="Projects" description="6 projects" actions={<Button level="primary" onClick={newProject}>New project</Button>} />
      <Table aria-label="Projects" rows={projects} columns={columns} />
    </Stack>
  </Container>
</AppShell>`,
  },
  {
    title: "Search in the top bar",
    description: "A people directory leads its top bar with a Search: typing from any page opens People with the matches, and a Team's View people searches for that team. Activity shows a dot until it is opened. On a white Canvas the Sidebar is Surface-alt and every card has a Pale border instead of a shadow.",
    wide: true,
    screen: true,
    render: () => <PeopleDirectoryApp />,
    code: `<AppShell
  canvas="alt"
  sidebar={<Sidebar background="alt" logo={logo} sections={sections} selectedId={page} onItemClick={(item) => go(item.id)} />}
  header={<Stack direction="row" fillChildren width={240}><Search placeholder="Search people" aria-label="Search people" value={query}
    onValueChange={(value) => { setQuery(value); if (value.trim()) go("people"); }} /></Stack>}
  headerActions={<>
    <AppShellAction icon="icon-bell-01-line" aria-label="Activity" dot={hasNews} onClick={() => go("activity")} />
    <Menu align="end" trigger={<AppShellAccount name="Alex Duong" src={alex.photo} />} items={accountItems} />
  </>}
>
  <Container maxWidth="full">
    <Stack gap="xl">
      <PageHeader title="People" description={\`\${plural(shown.length, "person", "people")} match “\${query}”\`}
        actions={<Button level="primary" startIcon="icon-user-plus-line" onClick={invite}>Invite person</Button>} />
      <Table aria-label="People" rows={shown} columns={columns}
        empty={<EmptyState headingLevel={2} illustration={false} title="No people match"
          secondaryAction={{ label: "Show everyone", onClick: () => setQuery("") }}>Try a name, a role or a team.</EmptyState>} />
    </Stack>
  </Container>
</AppShell>`,
  },
  {
    title: "Task panel",
    description: "A row opens its task in the aside, a standard Side Panel. It docks beside the page only while the page keeps a tablet width (744px) next to it, as in Full screen on a desktop; in a narrower window it opens as a modal panel. Mark as done updates the row and the counters, with Undo in the toast. The flat Canvas pairs with a flat Sidebar that keeps its own collapse control.",
    wide: true,
    screen: true,
    render: () => <TaskWorkbench />,
    code: `<AppShell
  canvas="flat"
  sidebar={<Sidebar variant="small-density" background="flat" collapsed={collapsed} onCollapsedChange={setCollapsed}
    sections={sections} selectedId={view} onItemClick={(item) => setView(item.id)} />}
  aside={
    <SidePanel type="standard" size="small" open={Boolean(task)} onOpenChange={(open) => !open && setOpenId(null)}
      title={task?.title} description={\`\${task?.key} · \${project.name}\`}
      primaryAction={{ label: "Mark as done", onClick: markDone }} secondaryAction={{ label: "Close" }}>
      <DescriptionList divider items={details} />
    </SidePanel>
  }
>
  <Container maxWidth="full">
    <Stack gap="xl">
      <PageHeader title="All tasks" description="Every open project at the studio · 10 tasks" />
      <Table aria-label="All tasks" rows={rows} columns={columns} onRowClick={(row) => setOpenId(row.id)} />
    </Stack>
  </Container>
</AppShell>`,
  },
  {
    title: "Selection footer",
    description: "Selecting files brings up the footer: an ActionBar that sticks to the bottom of the page column with the count, Clear selection and Download, and leaves when nothing is selected. The shell starts on the icon rail (defaultSidebarCollapsed) so the table gets the width.",
    wide: true,
    screen: true,
    render: () => <FilesApp />,
    code: `<AppShell
  defaultSidebarCollapsed
  sidebar={<Sidebar logo={logo} logoCollapsed={mark} sections={sections} selectedId={folder} onItemClick={(item) => setFolder(item.id)} />}
  header={<Breadcrumbs master={false} items={[{ id: "files", label: "Files" }, { id: folder, label: "All files" }]} onNavigate={goUp} />}
  headerActions={<Menu align="end" trigger={<AppShellAccount name="Alex Duong" src={alex.photo} />} items={accountItems} />}
  footer={selected.length ? (
    <ActionBar position="static" direction="horizontal" summary={\`\${plural(selected.length, "file")} selected\`}
      secondaryAction={{ label: "Clear selection", onClick: () => setSelected([]) }}
      primaryAction={{ label: "Download", onClick: download }} />
  ) : undefined}
>
  <Container maxWidth="full">
    <Stack gap="xl">
      <PageHeader title="All files" description="14 files · newest first" />
      <Table aria-label="All files" rows={files} columns={columns} selectable selectedIds={selected} onSelectionChange={setSelected} />
    </Stack>
  </Container>
</AppShell>`,
  },
  {
    title: "Narrow window",
    description: "The same app in a tablet-width window. Under 1024px the shell puts a menu button where the toggle was and opens the Sidebar as a modal drawer: focus moves to the current page, Tab stays inside, and Close, Escape or the scrim close it. Picking a page closes the drawer and moves focus to the page.",
    wide: true,
    render: () => <StudioApp narrowWindow />,
    code: `// Nothing changes in the code: layout="auto" (the default) follows the shell's own width.
<AppShell
  sidebar={<Sidebar logo={logo} sections={sections} selectedId={page} onItemClick={(item) => go(item.id)} />}
  header={<Breadcrumbs master={false} items={crumbs} onNavigate={navigate} />}
  headerActions={<>
    <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unseen} onClick={() => go("notifications")} />
    <Menu align="end" trigger={<AppShellAccount name="Alex Duong" src={alex.photo} />} items={accountItems} />
  </>}
>
  <Page id={page} />
</AppShell>`,
  },
  {
    title: "Banner above the shell",
    description: "The banner slot holds a workspace-wide AlertBanner above the whole shell: it stays in view on every page and while the page scrolls, and the sticky Sidebar and top bar sit under it. Dismissing it hides it on every page, with Undo in the toast.",
    wide: true,
    screen: true,
    render: () => <StudioApp notice />,
    code: `<AppShell
  banner={noticeShown ? (
    <AlertBanner theme="warning" onClose={dismiss}>
      Zen is read-only tonight from 11:00 pm to 1:00 am while the studio moves to a new data centre.
    </AlertBanner>
  ) : undefined}
  sidebar={<Sidebar logo={logo} logoCollapsed={mark} sections={sections} selectedId={page} onItemClick={(item) => go(item.id)} />}
  header={<Breadcrumbs master={false} items={crumbs} onNavigate={navigate} />}
  headerActions={<>
    <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unseen} onClick={() => go("notifications")} />
    <Menu align="end" trigger={<AppShellAccount name="Alex Duong" src={alex.photo} />} items={accountItems} />
  </>}
>
  <Page id={page} />
</AppShell>

const dismiss = () => {
  setNoticeShown(false);
  toast({ title: "Notice hidden", action: { label: "Undo", onClick: () => setNoticeShown(true) } });
};`,
  },
  {
    title: "Phone app",
    description: "A phone app doesn't use AppShell. The Sidebar's Home and Projects become a labelled Bottom Navigation with Profile in place of the account menu (Invoices, a desk task, stays in the web app); each root's large title folds as its list scrolls, Notifications becomes Home's trailing action with a dot, and New project moves into the Projects bar. Tapping the current root again scrolls it to the top.",
    render: () => <PhoneApp />,
    code: `const screenRef = useRef<HTMLDivElement>(null);
const open = (id) => { if (id === root) scrollToTop(); setRoot(id); };

<PlatformPhone key={root} headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" title="Projects" largeTitle="Projects" scrollRef={screenRef}
    trailing={[{ icon: "icon-plus-line", label: "New project", onClick: () => setCreating(true) }]} />}
  footer={<BottomNavigation aria-label="Đìzai Studio" value={root} onValueChange={open} showLabels items={[
    { id: "home", label: "Home", icon: "icon-home-smile-line", selectedIcon: "icon-home-smile-solid" },
    { id: "projects", label: "Projects", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
    { id: "profile", label: "Profile", icon: "icon-user-circle-line", selectedIcon: "icon-user-circle-solid" },
  ]} />}>
  {/* The screen margin insets the rows sideways; xs above and below, like a List-Box on a phone */}
  <Box paddingX="lg" paddingY="xs">
    <List aria-label="Projects">
      {projects.map((project) => (
        <ListItem key={project.id} title={project.name} caption={project.client}
          leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />}
          trailing={<Badge theme={projectStatusTheme[project.status]} background="subtle">{project.status}</Badge>}
          onClick={() => setOpenId(project.id)} />
      ))}
    </List>
  </Box>
</PlatformPhone>`,
  },
]);
