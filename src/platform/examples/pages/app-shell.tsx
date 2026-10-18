/* App Shell examples: Figma's AppShell patterns (◇ Master-Layout 16254:1057) with Đìzai Studio's own apps, signed in as
   Alex Duong, Wednesday Sep 30, 2026, 10:30 am. Desktop patterns: the studio's web app (Sidebar), the people directory
   (the toggle in the Sidebar beside a Master crumb), leave requests (List-Detail), the client portal (Top-Bar), a
   design review (Workspace), the handbook (Docs) and project setup (Focus), plus the docked task panel, the sticky
   selection bar, the banner and the narrow window. Mobile patterns: the studio app on a phone (Bar + Tab-Bar), expenses
   (Band + Floating), a teammate's profile (Band-Sheet + Actions), a trail on the Saola guide (Media + glass Actions) and
   the studio app on an iPad held upright. One elevation per screen, set by the Sidebar and the Canvas. */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { AlertBanner } from "../../../components/AlertBanner";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader, AppShellPane } from "../../../components/AppShell";
import { Avatar, AvatarStack } from "../../../components/Avatar";
import { Badge, type BadgeTheme } from "../../../components/Badge";
import { BottomNavigation, type BottomNavigationItem } from "../../../components/BottomNavigation";
import { BottomSheet } from "../../../components/BottomSheet";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Checkbox } from "../../../components/Checkbox";
import { DescriptionList } from "../../../components/DescriptionList";
import { Dialog } from "../../../components/Dialog";
import { DockIcon, type DockIconTheme } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { useFormState } from "../../../components/Form";
import type { IconName } from "../../../components/Icon";
import { Image } from "../../../components/Image";
import { InputField, SelectField, TextAreaField } from "../../../components/Input";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem, ToggleListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { MetricCard } from "../../../components/MetricWidget";
import { PageHeader } from "../../../components/PageHeader";
import { Search } from "../../../components/Search";
import { SidePanel } from "../../../components/SidePanel";
import { Sidebar, type SidebarSection } from "../../../components/Sidebar";
import { Stepper } from "../../../components/Stepper";
import { Table, TableMedia, TableText, type TableColumn } from "../../../components/Table";
import { Tabs } from "../../../components/Tabs";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { platformMedia } from "../../PlatformMedia";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { PreviewAppFrame, StudioLogo, StudioMark } from "../../PlatformFrames";
import {
  activity, daysFromToday, files, formatBytes, formatCompactMoney, formatDate, formatDay, formatDue, formatMoney, formatRange, formatRelative, formatTime, initials,
  invoiceStatusTheme, invoices, leaveBalance, leaveRequests, leaveStatusTheme, me, people, peopleList, priorityTheme, projectById, projectStatusTheme, projects, studio, taskStatusTheme, tasks,
  type Invoice, type LeaveRequest, type LeaveStatus, type Person, type PersonId, type Project, type ProjectStatus, type StudioFile, type Task, type TaskStatus, type Team,
} from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";

export const page: PlatformPage = "app-shell";

// ——— Shared parts ——————————————————————————————————————————————————————————
/** Photo when the person has one, else initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const badge = (label: string, theme: BadgeTheme) => <Badge theme={theme} background="subtle">{label}</Badge>;
const taskBadge = (status: TaskStatus) => badge(status, taskStatusTheme[status]);
/** The caption follows the status: open work shows when it is due, finished work when it was done. */
const taskWhen = (task: Task) => (task.status === "Done" ? `Done ${formatDay(task.due)}` : formatDue(task.due));
/** A run of words that never breaks: its spaces are no-break spaces. */
const whole = (text: string) => text.replace(/ /g, " ");
/** Where a notification leads: the invoice list, the profile (leave), or the projects the task belongs to. */
const notificationTarget = (item: { verb: string; object: string }): "invoices" | "profile" | "projects" =>
  /^INV-/.test(item.object) ? "invoices" : /leave/.test(item.verb) ? "profile" : "projects";
const activityCaption = (item: { verb: string; object: string; at: Date }, leadNew = false) => (
  <>{leadNew ? "New · " : null}{`${item.verb[0].toUpperCase()}${item.verb.slice(1)} ${item.object}`}{" "}{whole(`· ${formatRelative(item.at)}`)}</>
);

/** The width of an element, kept current: tables fold their columns when the page beside the panes gets narrow. */
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
function AppFrame({ windowWidth, children }: { windowWidth?: number; children: ReactNode }) {
  return <PreviewAppFrame windowWidth={windowWidth}>{children}</PreviewAppFrame>;
}

/* The studio's mark and name. The logo slot is 24px high (20px in Small-Density): the mark is an image that fills it. */
const studioLogo = <StudioLogo src={studio.logo} name={studio.name} />;
const studioMark = <Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />;
const denseLogo = <StudioLogo src={studio.logo} name={studio.name} textStyle="Body/Small/Bold" />;
const denseMark = <StudioMark src={studio.logo} name={studio.name} />;

/** The account menu at the end of the header's top row (Profile, Settings, Sign out) and what Sign out leads to. */
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
    <Box surface="canvas" height="fill"><Stack align="center" justify="center" gap="md" padding="xl" height="fill">
      <Stack align="center" gap="xs">
        <Heading level={1} textStyle="Heading/1" align="center">You’re signed out</Heading>
        <Text tone="base" align="center">{`Sign in to get back to ${studio.name}.`}</Text>
      </Stack>
      <Button level="primary" onClick={() => setSignedOut(false)}>Sign in</Button>
    </Stack></Box>
  ) : null;
  return { menu, dialog, screen };
}

/** Profile and Settings, the two pages the account menu opens: the page's own header is the AppShellHeader's Main row. */
function accountPage(id: "profile" | "settings", card: "shadow" | "border") {
  return {
    main: id === "profile"
      ? <PageHeader title="Profile" description={`${me.role} · ${me.team} team`} />
      : <PageHeader title="Settings" description={`The ${studio.name} workspace`} />,
    body: (
      // A readable width keeps each term near its value.
      <Card theme={card} width="fill" maxWidth={440}>
        <DescriptionList items={id === "profile" ? [
          { term: "Name", description: me.name },
          { term: "Email", description: me.email },
          { term: "Office", description: me.location },
          { term: "Approves leave for", description: "Design team" },
        ] : [
          { term: "Workspace", description: studio.name },
          { term: "Domain", description: studio.domain },
          { term: "Plan", description: "Business · 48 seats" },
          { term: "Time zone", description: "Ho Chi Minh City (GMT+7)" },
        ]} />
      </Card>
    ),
  };
}

// ——— 1. Studio app (Layout=Sidebar, Collapse=Header) ——————————————————————————————————————————————————
type StudioPage = "home" | "projects" | "invoices" | "notifications" | "profile" | "settings";
const studioPages: Record<StudioPage, string> = { home: "Home", projects: "Projects", invoices: "Invoices", notifications: "Notifications", profile: "Profile", settings: "Settings" };
const dueThisWeek = tasks.filter((task) => task.status !== "Done" && task.due <= daysFromToday(7)).sort((a, b) => +a.due - +b.due);
const outstanding = invoices.filter((invoice) => invoice.status === "Sent" || invoice.status === "Overdue").reduce((sum, invoice) => sum + invoice.amount, 0);
const studioSections: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "projects", label: "Projects", icon: "icon-folder-line" },
  { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
] }];
type ProjectView = "all" | "active" | "planning";
const projectViews: Record<ProjectView, { label: string; filter: (project: Project) => boolean }> = {
  all: { label: "All", filter: () => true },
  active: { label: "Active", filter: (project) => project.status === "Active" },
  planning: { label: "Planning", filter: (project) => project.status === "Planning" },
};

function StudioApp({ windowWidth, notice = false }: { windowWidth?: number; notice?: boolean }) {
  const { toast } = useToast();
  const [page, setPage] = useState<StudioPage>("home");
  const [noticeShown, setNoticeShown] = useState(notice);
  // Remember it per person in a real app (e.g. localStorage), so the rail stays the way they left it.
  const [collapsed, setCollapsed] = useState(false);
  const [unseen, setUnseen] = useState(3);
  const [read, setRead] = useState<string[]>([]);
  const [list, setList] = useState(projects);
  const [view, setView] = useState<ProjectView>("all");
  const [creating, setCreating] = useState(false);
  const [measure, width] = useWidth();
  const go = (next: StudioPage) => { setPage(next); if (next === "notifications") setUnseen(0); };
  const account = useAccount(go);
  const narrow = width > 0 && width < 640;
  const compactRows = width > 0 && width < 480;
  const dueId = useId();
  const projectColumns: TableColumn<Project>[] = [
    { id: "project", header: "Project", cell: (row) => <TableMedia bold media={<DockIcon icon={row.icon} theme={row.theme} background="subtle" size="small" />} caption={row.client}>{row.name}</TableMedia> },
    { id: "status", header: "Status", width: narrow ? undefined : "128px", cell: (row) => badge(row.status, projectStatusTheme[row.status]) },
    ...(narrow ? [] : [
      { id: "lead", header: "Lead", width: "168px", cell: (row: Project) => <TableMedia bold={false} media={<Avatar size="xsmall" {...avatarOf(people[row.lead])} />}>{people[row.lead].name}</TableMedia> },
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

  // Each page puts its own header (title, description, the page's Primary) in the header's Main row and its views in
  // Sections; the Body holds the content, already at the page margin.
  let main: ReactNode;
  let sections: ReactNode;
  let body: ReactNode;
  if (page === "profile" || page === "settings") ({ main, body } = accountPage(page, "shadow"));
  else if (page === "projects") {
    const shown = list.filter(projectViews[view].filter);
    main = <PageHeader title="Projects" description={plural(list.length, "project")} actions={<Button level="primary" onClick={() => setCreating(true)}>New project</Button>} />;
    sections = <Tabs aria-label="Project views" value={view} onValueChange={(id) => setView(id as ProjectView)}
      items={(Object.keys(projectViews) as ProjectView[]).map((id) => ({ id, label: projectViews[id].label, badge: list.filter(projectViews[id].filter).length }))} />;
    // A page's table lies on the Canvas: no Card.
    body = <div ref={measure}><Table aria-label={`${projectViews[view].label} projects`} rows={shown} columns={projectColumns} /></div>;
  } else if (page === "invoices") {
    main = <PageHeader title="Invoices" description={`${formatMoney(outstanding)} outstanding`} />;
    body = <div ref={measure}><Table aria-label="Invoices" rows={invoices} columns={invoiceColumns} /></div>;
  } else if (page === "notifications") {
    main = <PageHeader title="Notifications" description="Comments, reviews and approvals from the last week" />;
    body = (
      <ListBox theme="shadow">
        <List aria-label="Notifications">
          {activity.map((item) => {
            const unread = item.unread && !read.includes(item.id);
            return (
              <ListItem key={item.id} title={people[item.actor].name} caption={activityCaption(item, unread && compactRows)}
                leading={<Avatar size="md" {...avatarOf(people[item.actor])} />}
                trailing={unread && !compactRows ? badge("New", "accent") : undefined}
                onClick={() => { setRead((ids) => ids.includes(item.id) ? ids : [...ids, item.id]); go(notificationTarget(item)); }} />
            );
          })}
        </List>
      </ListBox>
    );
  } else {
    main = <PageHeader title="Home" description={`${plural(dueThisWeek.length, "task")} due this week across ${plural(new Set(dueThisWeek.map((task) => task.project)).size, "project")}`} />;
    body = (
      <Stack gap="xl" ref={measure}>
        {/* Three peers share the neutral tile. */}
        <Grid columns={{ mobile: 2, desktop: 3 }} gap="md">
          <MetricCard variant="icon-highlight" label="Active projects" value={String(list.filter((project) => project.status === "Active").length)} icon="icon-folder-line" theme="shadow" />
          <MetricCard variant="icon-highlight" label="Due this week" value={String(dueThisWeek.length)} icon="icon-calendar-line" theme="shadow" />
          <MetricCard variant="icon-highlight" label="Outstanding" value={formatCompactMoney(outstanding)} icon="icon-coins-line" theme="shadow" />
        </Grid>
        <Stack as="section" gap="md" aria-labelledby={dueId}>
          <Heading level={2} id={dueId} textStyle="Heading/4">Due this week</Heading>
          <ListBox theme="shadow">
            <List aria-labelledby={dueId}>
              {dueThisWeek.map((task) => (
                <ListItem key={task.id} title={task.title} titleLines={2} caption={`${task.key} · ${taskWhen(task)}`}
                  leading={<Avatar size="md" {...avatarOf(people[task.assignee])} />} trailing={compactRows ? undefined : taskBadge(task.status)} />
              ))}
            </List>
          </ListBox>
        </Stack>
      </Stack>
    );
  }

  const shell = account.screen ?? (
    <AppShell
      // A message for the whole workspace sits above the shell and stays in view on every page.
      banner={noticeShown ? (
        <AlertBanner theme="warning" onClose={() => { setNoticeShown(false); toast({ title: "Notice hidden", action: { label: "Undo", onClick: () => setNoticeShown(true) } }); }}>
          Zen is read-only tonight from 11:00 pm to 1:00 am while the studio moves to a new data centre.
        </AlertBanner>
      ) : undefined}
      sidebar={<Sidebar logo={studioLogo} logoCollapsed={studioMark} sections={studioSections} selectedId={page} onItemClick={(item) => go(item.id as StudioPage)} />}
      sidebarCollapsed={collapsed}
      onSidebarCollapsedChange={setCollapsed}
      header={(
        <AppShellHeader
          // The top row: the collapse toggle, the trail (Home first, no Master icon beside the toggle)…
          leading={<Breadcrumbs master={false} items={page === "home" ? [{ id: "home", label: "Home" }] : [{ id: "home", label: "Home" }, { id: page, label: studioPages[page] }]}
            onNavigate={(item, event) => { event.preventDefault(); go(item.id as StudioPage); }} />}
          // …then utilities only: the plan, Notifications with its unread count, the account menu last.
          actions={<>
            <Badge theme="accent" background="subtle" leadingIcon={false}>Business</Badge>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unseen} onClick={() => go("notifications")} />
            {account.menu}
          </>}
          main={main}
          sections={sections}
        />
      )}
    >
      {body}
    </AppShell>
  );
  return (
    <>
      <AppFrame windowWidth={windowWidth}>{shell}</AppFrame>
      {account.dialog}
      <DemoFieldDialog open={creating} onOpenChange={setCreating} title="New project" field={{ kind: "name", label: "Project name", placeholder: "Saola trail guide" }}
        submitLabel="Create project" confirm={(name) => `${name} created`}
        onSubmit={(name) => setList((current) => [{ ...projects[5], id: `new-${current.length}`, name, client: studio.name, icon: "icon-cube-line", theme: "neutral", status: "Planning", lead: "alex", start: daysFromToday(0), due: daysFromToday(60) }, ...current])} />
    </>
  );
}

// ——— 2. People directory (Collapse=Sidebar: the trail starts with the Master crumb) ———————————————————————————
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
const peoplePages: Record<PeoplePage, string> = { people: "People", teams: "Teams", activity: "Activity", profile: "Profile", settings: "Settings" };

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

  let main: ReactNode;
  let body: ReactNode;
  if (page === "profile" || page === "settings") ({ main, body } = accountPage(page, "border"));
  else if (page === "teams") {
    main = <PageHeader title="Teams" description={plural(teamList.length, "team")} />;
    body = (
      // On a white Canvas the cards take a Pale border, never a shadow.
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
    );
  } else if (page === "activity") {
    main = <PageHeader title="Activity" description="What changed in the studio this week" />;
    body = (
      <ListBox theme="border">
        <List aria-label="Activity">
          {activity.map((item) => (
            <ListItem key={item.id} title={people[item.actor].name} caption={activityCaption(item)} leading={<Avatar size="md" {...avatarOf(people[item.actor])} />} />
          ))}
        </List>
      </ListBox>
    );
  } else {
    main = <PageHeader title="People" description={q ? `${plural(shown.length, "person", "people")} match “${query.trim()}”` : `${plural(rows.length, "person", "people")} at ${studio.name}`}
      actions={<Button level="primary" startIcon="icon-user-plus-line" onClick={() => setInviting(true)}>Invite person</Button>} />;
    body = (
      <div ref={measure}>
        <Table aria-label="People" rows={shown} columns={columns}
          empty={<EmptyState headingLevel={2} icon="icon-search-medium-line" title="No people match" secondaryAction={{ label: "Show everyone", onClick: () => setQuery("") }}>Try a name, a role or a team.</EmptyState>} />
      </div>
    );
  }

  return (
    <>
      <AppFrame>
        {account.screen ?? (
          // A white Canvas takes a Surface-alt Sidebar and bordered cards. The trail starts with the workspace's Master
          // crumb (its home icon), so the collapse toggle moves into the Sidebar's header (Collapse=Sidebar): two icons
          // side by side at the start of the header read as one control.
          <AppShell canvas="alt" collapse="sidebar"
            sidebar={<Sidebar background="alt" logo={studioLogo} logoCollapsed={studioMark} selectedId={page} onItemClick={(item) => go(item.id as PeoplePage)}
              sections={[{ items: [
                { id: "people", label: "People", icon: "icon-users-line" },
                { id: "teams", label: "Teams", icon: "icon-grid-01-line" },
                { id: "activity", label: "Activity", icon: "icon-clock-line" },
              ] }]} />}
            header={(
              <AppShellHeader
                leading={<Breadcrumbs items={[{ id: "workspace", label: studio.name }, { id: page, label: peoplePages[page] }]}
                  onNavigate={(_, event) => { event.preventDefault(); go("people"); }} />}
                // The Search sits in the top row's middle (Figma Center-Slots, up to 400px): it finds people from any page.
                center={<Search placeholder="Search people" aria-label="Search people" value={query}
                  onValueChange={(value) => { setQuery(value); if (value.trim()) go("people"); }} />}
                actions={<>
                  <AppShellAction icon="icon-bell-01-line" aria-label="Activity" dot={news} aria-current={page === "activity" ? "page" : undefined} onClick={() => go("activity")} />
                  {account.menu}
                </>}
                main={main}
              />
            )}
          >
            {body}
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

// ——— 3. Leave requests (Layout=List-Detail) ————————————————————————————————————————————————————————————————
const leaveSections: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "leave", label: "Leave", icon: "icon-calendar-line" },
  { id: "people", label: "People", icon: "icon-users-line" },
  { id: "payroll", label: "Payroll", icon: "icon-wallet-02-line" },
] }];

function LeaveRequestsApp() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>(leaveRequests.filter((request) => request.person !== "alex"));
  const [openId, setOpenId] = useState(requests.find((request) => request.status === "Pending")?.id ?? requests[0].id);
  const [notifyTeam, setNotifyTeam] = useState(true);
  const request = requests.find((item) => item.id === openId) ?? requests[0];
  const person = people[request.person];
  const pending = requests.filter((item) => item.status === "Pending").length;
  const decide = (status: LeaveStatus) => {
    const before = request.status;
    setRequests((list) => list.map((item) => (item.id === request.id ? { ...item, status } : item)));
    toast({ title: status === "Approved" ? `${person.name.split(" ")[0]}’s leave approved` : `${person.name.split(" ")[0]}’s leave declined`, action: { label: "Undo", onClick: () => setRequests((list) => list.map((item) => (item.id === request.id ? { ...item, status: before } : item))) } });
  };
  // Who else is away those days: the approver's first question.
  const overlapping = leaveRequests.filter((item) => item.id !== request.id && item.status === "Approved" && item.from <= request.to && item.to >= request.from);
  return (
    <AppFrame>
      {/* List-Detail: the Sidebar starts on its rail, the requests sit in the leading pane (360) and the open request
          fills the page. Selecting a row changes the detail in place; the list keeps its scroll. */}
      <AppShell pattern="list-detail"
        sidebar={<Sidebar logo={studioLogo} logoCollapsed={studioMark} sections={leaveSections} selectedId="leave" />}
        leadingPane={(
          <AppShellPane title="Leave requests" action={<IconButton appearance="flat" level="secondary" size="sm" icon="icon-filter-lines-line" aria-label="Filter requests" />}>
            <List aria-label="Leave requests">
              {requests.map((item) => (
                <ListItem key={item.id} selected={item.id === request.id} title={people[item.person].name}
                  caption={`${item.kind} · ${formatRange(item.from, item.to)}`}
                  leading={<Avatar size="md" {...avatarOf(people[item.person])} />}
                  trailing={badge(item.status, leaveStatusTheme[item.status])}
                  onClick={() => setOpenId(item.id)} />
              ))}
            </List>
          </AppShellPane>
        )}
        header={(
          <AppShellHeader
            leading={<Breadcrumbs master={false} items={[{ id: "leave", label: "Leave" }, { id: "requests", label: `Requests · ${pending} pending` }]} />}
            actions={<AppShellAccount name={me.name} src={me.photo} />}
            main={(
              <PageHeader title={`${person.name} · ${request.kind}`} description={`${formatRange(request.from, request.to)} · ${plural(request.days, "working day")} · requested ${formatRelative(request.requested)}`}
                actions={request.status === "Pending" ? <>
                  <Button level="tertiary" onClick={() => decide("Declined")}>Decline</Button>
                  <Button level="primary" onClick={() => decide("Approved")}>Approve</Button>
                </> : badge(request.status, leaveStatusTheme[request.status])} />
            )}
          />
        )}
      >
        <Grid columns={{ mobile: 1, desktop: 2 }} gap="md">
          <Card theme="shadow">
            <Stack gap="md">
              <Heading level={2} textStyle="Heading/4">Request</Heading>
              <DescriptionList items={[
                { term: "Person", description: `${person.name} · ${person.role}` },
                { term: "Type", description: request.kind },
                { term: "Dates", description: formatRange(request.from, request.to) },
                { term: "Note", description: request.note ?? "No note" },
              ]} />
            </Stack>
          </Card>
          <Card theme="shadow">
            <Stack gap="md">
              <Heading level={2} textStyle="Heading/4">Also away</Heading>
              {overlapping.length ? (
                <List aria-label="Also away those days">
                  {overlapping.map((item) => (
                    <ListItem key={item.id} title={people[item.person].name} caption={`${item.kind} · ${formatRange(item.from, item.to)}`} leading={<Avatar size="md" {...avatarOf(people[item.person])} />} />
                  ))}
                </List>
              ) : <Text tone="base">Nobody else on the {person.team} team is away those days.</Text>}
              <Checkbox label={`Tell the ${person.team} team once it’s decided`} checked={notifyTeam} onCheckedChange={setNotifyTeam} />
            </Stack>
          </Card>
        </Grid>
      </AppShell>
    </AppFrame>
  );
}

// ——— 4. Client portal (Layout=Top-Bar) ——————————————————————————————————————————————————————————————————————
type PortalTab = "overview" | "files" | "invoices";
const phinProjects = projects.filter((project) => project.client === "Phin & Co");
const phinInvoices = invoices.filter((invoice) => invoice.client === "Phin & Co");
const phinFiles = files.filter((file) => phinProjects.some((project) => project.id === file.project));

function ClientPortalApp() {
  const { toast } = useToast();
  const [tab, setTab] = useState<PortalTab>("overview");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const fileColumns: TableColumn<StudioFile>[] = [
    { id: "name", header: "Name", cell: (file) => <TableMedia bold media={<FileIcon format={fileIconFormatOf(file.name)} size="base" />}>{file.name}</TableMedia> },
    { id: "updated", header: "Shared", width: "200px", cell: (file) => <TableText>{formatRelative(file.updated)}</TableText> },
    { id: "size", header: "Size", align: "right", width: "96px", cell: (file) => <TableText>{formatBytes(file.bytes)}</TableText> },
  ];
  const invoiceColumns: TableColumn<Invoice>[] = [
    { id: "invoice", header: "Invoice", cell: (row) => <TableText bold>{row.number}</TableText> },
    { id: "status", header: "Status", width: "128px", cell: (row) => badge(row.status, invoiceStatusTheme[row.status]) },
    { id: "due", header: "Due", width: "152px", cell: (row) => <TableText>{formatDate(row.due)}</TableText> },
    { id: "amount", header: "Amount", align: "right", width: "136px", cell: (row) => <TableText>{formatMoney(row.amount, true)}</TableText> },
  ];
  const shownFiles = phinFiles.filter((file) => !q || file.name.toLowerCase().includes(q));
  return (
    <AppFrame>
      {/* Top-Bar: a client sees one company, so there is no Sidebar; the header runs across the window, the portal's
          views are its Sections (Tabs) and the Search sits in the top row's middle. */}
      <AppShell pattern="top-bar" canvas="alt"
        header={(
          <AppShellHeader
            leading={<StudioLogo src={studio.logo} name={`${studio.name} · Phin & Co`} />}
            center={<Search placeholder="Search shared files" aria-label="Search shared files" value={query} onValueChange={(value) => { setQuery(value); if (value.trim()) setTab("files"); }} />}
            actions={<>
              <AppShellAction icon="icon-message-circle-line" aria-label="Messages" dot onClick={() => toast({ title: "Hana Kim replies within a working day" })} />
              <AppShellAccount name="Lan Phạm" />
            </>}
            main={<PageHeader title="Phin & Co" description={`Your projects with ${studio.name} · account director ${people.hana.name}`}
              actions={<Button level="primary" startIcon="icon-upload-01-line" onClick={() => toast({ title: "Upload brief", children: "Briefs go straight to Hana." })}>Upload brief</Button>} />}
            sections={<Tabs aria-label="Portal" value={tab} onValueChange={(id) => setTab(id as PortalTab)} items={[
              { id: "overview", label: "Overview" },
              { id: "files", label: "Files", badge: phinFiles.length },
              { id: "invoices", label: "Invoices", badge: phinInvoices.length },
            ]} />}
          />
        )}
      >
        {tab === "overview" ? (
          <Grid as="ul" minColumnWidth={280} gap="md" aria-label="Projects">
            {phinProjects.map((project) => (
              <Card as="li" key={project.id} theme="border">
                <Stack gap="md">
                  <Stack direction="row" gap="sm" align="center" justify="between">
                    <DockIcon icon={project.icon} theme={project.theme} background="subtle" />
                    {badge(project.status, projectStatusTheme[project.status])}
                  </Stack>
                  <Stack gap="xs">
                    <Heading level={2} textStyle="Heading/Subheading">{project.name}</Heading>
                    <Text textStyle="Body/Small/Regular" tone="base">{`Led by ${people[project.lead].name} · due ${formatDate(project.due)}`}</Text>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Grid>
        ) : tab === "files" ? (
          <Table aria-label="Shared files" rows={shownFiles} columns={fileColumns}
            empty={<EmptyState size="sm" headingLevel={2} icon="icon-search-medium-line" title="No files match" secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>Try a project name or a file type.</EmptyState>} />
        ) : (
          <Table aria-label="Invoices" rows={phinInvoices} columns={invoiceColumns} />
        )}
      </AppShell>
    </AppFrame>
  );
}

// ——— 5. Design review (Layout=Workspace) ——————————————————————————————————————————————————————————————————
const reviewFiles = files.filter((file) => /\.fig$/.test(file.name));
const reviewComments: { id: string; author: PersonId; text: string; at: Date; resolved?: boolean }[] = [
  { id: "c1", author: "chi", text: "The points total reads as a button here: can it lose the border?", at: daysFromToday(0, 9, 5) },
  { id: "c2", author: "ava", text: "Research says people look for the expiry date first. Move it above the history?", at: daysFromToday(0, 9, 40) },
  { id: "c3", author: "bao", text: "Months with no visits: the empty row height doesn’t match the others.", at: daysFromToday(-1, 17, 20) },
  { id: "c4", author: "emi", text: "Counter motion is in the prototype, 280 ms ease-out.", at: daysFromToday(-1, 15, 0), resolved: true },
];

function DesignReviewApp() {
  const { toast } = useToast();
  const [openId, setOpenId] = useState(reviewFiles[0]?.id ?? files[0].id);
  const [comments, setComments] = useState(reviewComments);
  const [draft, setDraft] = useState("");
  const file = files.find((item) => item.id === openId) ?? files[0];
  const project = projectById(file.project);
  const open = comments.filter((comment) => !comment.resolved);
  return (
    <AppFrame>
      {/* Workspace: the header runs across the top; the files to review sit in the leading pane and the comments in the
          trailing one, both Sidebar/Default-Width (the same on both sides), with the frame under review between them. */}
      <AppShell pattern="workspace"
        header={(
          <AppShellHeader
            leading={<Breadcrumbs master={false} items={[{ id: "reviews", label: "Design reviews" }, { id: project.id, label: project.name }, { id: file.id, label: file.name }]} />}
            actions={<>
              <AvatarStack size="sm" items={[people.chi, people.ava, people.bao].map((person) => ({ src: person.photo, alt: person.name, theme: "photo" as const }))} />
              <Button level="tertiary" startIcon="icon-share-01-line" onClick={() => toast({ title: "Link copied", children: "Anyone at the studio can comment." })}>Share</Button>
              <AppShellAccount name={me.name} src={me.photo} />
            </>}
          />
        )}
        leadingPane={(
          <AppShellPane title="Files">
            <List aria-label="Files in review">
              {reviewFiles.map((item) => (
                <ListItem key={item.id} selected={item.id === file.id} title={item.name} caption={formatRelative(item.updated)}
                  leading={<FileIcon format={fileIconFormatOf(item.name)} size="lg" />} onClick={() => setOpenId(item.id)} />
              ))}
            </List>
          </AppShellPane>
        )}
        trailingPane={(
          <AppShellPane title={`Comments · ${open.length}`}>
            <List aria-label="Comments">
              {comments.map((comment) => (
                <ListItem key={comment.id} title={people[comment.author].name} titleLines={1}
                  caption={<>{comment.text}{" "}{whole(`· ${comment.resolved ? "Resolved · " : ""}${formatRelative(comment.at)}`)}</>}
                  leading={<Avatar size="small" {...avatarOf(people[comment.author])} />} />
              ))}
            </List>
            <form onSubmit={(event) => {
              event.preventDefault();
              if (!draft.trim()) return;
              setComments((list) => [...list, { id: `c${list.length + 1}`, author: "alex", text: draft.trim(), at: daysFromToday(0) }]);
              setDraft("");
            }}>
              <Stack gap="xs">
                <TextAreaField label="Add a comment" placeholder="Reply to the team" value={draft} onValueChange={setDraft} rows={2} />
                <Button type="submit" level="primary" size="sm" disabled={!draft.trim()}>Comment</Button>
              </Stack>
            </form>
          </AppShellPane>
        )}
      >
        <Stack gap="md">
          <PageHeader title={file.name} description={`${project.name} · ${formatBytes(file.bytes)} · edited ${formatRelative(file.updated)} by ${people[file.owner].name}`} headingLevel={1} />
          <Card theme="shadow" spacing="sm">
            <Image src={platformMedia.site[5].src} alt={`Frame under review in ${file.name}`} ratio="16:9" />
          </Card>
        </Stack>
      </AppShell>
    </AppFrame>
  );
}

// ——— 6. Studio handbook (Layout=Docs) ——————————————————————————————————————————————————————————————————
const handbookChapters = [
  { id: "welcome", title: "Welcome to Đìzai" },
  { id: "leave", title: "Leave and time off" },
  { id: "expenses", title: "Expenses" },
  { id: "equipment", title: "Equipment" },
  { id: "security", title: "Security basics" },
];
const leaveSectionsOnPage = [
  { id: "allowance", title: "Your allowance" },
  { id: "asking", title: "Asking for leave" },
  { id: "sick", title: "When you’re sick" },
  { id: "public-holidays", title: "Public holidays" },
];

function HandbookApp() {
  const [chapter, setChapter] = useState("leave");
  const baseId = useId();
  return (
    <AppFrame>
      {/* Docs: a reading column (at most 720) between the contents and "On this page", both on the Canvas (Theme=Canvas) so
          nothing competes with the text. */}
      <AppShell pattern="docs" canvas="alt"
        header={(
          <AppShellHeader
            leading={<StudioLogo src={studio.logo} name="Studio handbook" />}
            center={<Search placeholder="Search the handbook" aria-label="Search the handbook" />}
            actions={<AppShellAccount name={me.name} src={me.photo} />}
          />
        )}
        leadingPane={(
          <AppShellPane title="Contents" theme="canvas">
            <List aria-label="Chapters">
              {handbookChapters.map((item) => (
                <ListItem key={item.id} selected={item.id === chapter} title={item.title} leading="icon-book-open-line" onClick={() => setChapter(item.id)} />
              ))}
            </List>
          </AppShellPane>
        )}
        trailingPane={(
          <AppShellPane title="On this page" theme="canvas">
            <List aria-label="On this page">
              {leaveSectionsOnPage.map((section) => <ListItem key={section.id} title={section.title} href={`#${baseId}-${section.id}`} />)}
            </List>
          </AppShellPane>
        )}
      >
        <Stack as="article" gap="xl">
          <Stack gap="xs">
            <Text textStyle="Body/Small/Bold" tone="light">Handbook · updated Sep 12, 2026 by {people.minhAnh.name}</Text>
            <Heading level={1} textStyle="Heading/1">{handbookChapters.find((item) => item.id === chapter)?.title}</Heading>
          </Stack>
          <Stack as="section" gap="sm" id={`${baseId}-allowance`}>
            <Heading level={2} textStyle="Heading/3">Your allowance</Heading>
            <Text>Everyone gets {leaveBalance["Annual leave"]?.perYear} days of annual leave a year and {leaveBalance["Sick leave"]?.perYear} days of sick leave. Unused annual leave carries over until the end of March.</Text>
          </Stack>
          <Stack as="section" gap="sm" id={`${baseId}-asking`}>
            <Heading level={2} textStyle="Heading/3">Asking for leave</Heading>
            <Text>Ask in Zen at least two weeks ahead for anything longer than three days. Your team lead approves it, usually within a day; you’ll see who else is away before you send it.</Text>
          </Stack>
          <Stack as="section" gap="sm" id={`${baseId}-sick`}>
            <Heading level={2} textStyle="Heading/3">When you’re sick</Heading>
            <Text>Tell your lead before 10:00 am and log it when you’re back. From the third day in a row we need a doctor’s note.</Text>
          </Stack>
          <Stack as="section" gap="sm" id={`${baseId}-public-holidays`}>
            <Heading level={2} textStyle="Heading/3">Public holidays</Heading>
            <Text>The studio follows Vietnam’s public holidays, including five days for Tết. Remote teammates follow their own country’s calendar.</Text>
          </Stack>
        </Stack>
      </AppShell>
    </AppFrame>
  );
}

// ——— 7. Project setup (Layout=Focus) ——————————————————————————————————————————————————————————————————
const setupSteps = [
  { id: "details", title: "Details" },
  { id: "team", title: "Team" },
  { id: "budget", title: "Budget" },
  { id: "review", title: "Review" },
];

function ProjectSetupApp() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const form = useFormState<{ name: string; client: string; brief: string }>({
    initialValues: { name: "Trail guide app", client: "Saola Outdoor", brief: "Offline maps and safety check-ins for guided treks in Hà Giang." },
    validate: (values) => ({ name: values.name.trim() ? undefined : "Enter a project name" }),
    onSubmit: () => { setStep((current) => Math.min(current + 1, setupSteps.length - 1)); },
  });
  return (
    <AppFrame>
      {/* Focus: one task with nothing else to click. The header keeps only the way out; the steps sit under it and the
          form shares a centred column with its summary pane. */}
      <AppShell pattern="focus"
        header={(
          <AppShellHeader
            leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: "new", label: "New project" }]} />}
            actions={<Button level="tertiary" onClick={() => toast({ title: "Draft saved", children: "Finish it from Projects any time." })}>Save and close</Button>}
          />
        )}
        progress={<Stepper aria-label="New project" steps={setupSteps} current={step} onStepClick={(_, index) => { if (index < step) setStep(index); }} />}
        trailingPane={(
          <AppShellPane title="Summary">
            <Box padding="sm">
              <DescriptionList items={[
                { term: "Project", description: form.values.name || "Not set yet" },
                { term: "Client", description: form.values.client },
                { term: "Lead", description: me.name },
                { term: "Starts", description: formatDate(daysFromToday(14)) },
              ]} />
            </Box>
          </AppShellPane>
        )}
      >
        <form onSubmit={form.handleSubmit}>
          <Stack gap="xl">
            <Stack gap="xs">
              <Heading level={1} textStyle="Heading/2">{setupSteps[step].title}</Heading>
              <Text tone="base">{step === 0 ? "What the project is and who it’s for." : "This demo stops here: go back to Details to change them."}</Text>
            </Stack>
            {step === 0 ? (
              <Stack gap="lg">
                <InputField label="Project name" {...form.field("name")} />
                <SelectField label="Client" options={[...new Set(projects.map((project) => project.client))].map((client) => ({ value: client, label: client }))} {...form.selectField("client")} />
                <TextAreaField label="Brief" helpText="Two or three lines the team will read first." rows={3} {...form.field("brief")} />
              </Stack>
            ) : null}
            <Stack direction="row" gap="sm" justify="end">
              {step > 0 ? <Button level="tertiary" onClick={() => setStep(step - 1)}>Back</Button> : null}
              <Button type="submit" level="primary">Continue</Button>
            </Stack>
          </Stack>
        </form>
      </AppShell>
    </AppFrame>
  );
}

// ——— 8. A docked task panel, on a flat Canvas ——————————————————————————————————————————————————————————————
type View = "all" | "mine" | "review";
const views: Record<View, { label: string; icon: IconName; description: string; filter: (task: Task) => boolean }> = {
  all: { label: "All tasks", icon: "icon-check-square-line", description: "Every open project at the studio", filter: () => true },
  mine: { label: "Assigned to me", icon: "icon-user-circle-line", description: `Tasks ${me.name} owns`, filter: (task) => task.assignee === "alex" },
  review: { label: "In review", icon: "icon-eye-line", description: "Waiting for a reviewer", filter: (task) => task.status === "In review" },
};

function TaskWorkbench() {
  const { toast } = useToast();
  const [view, setView] = useState<View>("all");
  const [rows, setRows] = useState(tasks);
  const [openId, setOpenId] = useState<string | null>(null);
  const [measure, width] = useWidth();
  const narrow = width > 0 && width < 560;
  const shown = rows.filter(views[view].filter);
  const task = rows.find((item) => item.id === openId);
  const setStatus = (id: string, status: TaskStatus) => setRows((list) => list.map((item) => (item.id === id ? { ...item, status } : item)));
  const columns: TableColumn<Task>[] = [
    { id: "task", header: "Task", cell: (row) => <TableText bold caption={narrow ? `${row.key} · ${people[row.assignee].name}` : row.key}>{row.title}</TableText> },
    ...(narrow ? [] : [{ id: "assignee", header: "Assignee", width: "168px", cell: (row: Task) => <TableMedia bold={false} media={<Avatar size="xsmall" {...avatarOf(people[row.assignee])} />}>{people[row.assignee].name}</TableMedia> }]),
    { id: "status", header: "Status", width: narrow ? undefined : "136px", cell: (row) => taskBadge(row.status) },
  ];
  return (
    <AppFrame>
      {/* A flat Canvas pairs with a flat Sidebar: navigation and page are one plane. There is no top row, so the
          collapse toggle lives in the Sidebar's header (collapse="sidebar"). */}
      <AppShell canvas="flat" collapse="sidebar" defaultSidebarCollapsed
        sidebar={<Sidebar variant="small-density" background="flat" logo={denseLogo} logoCollapsed={denseMark}
          selectedId={view} onItemClick={(item) => { setView(item.id as View); setOpenId(null); }}
          sections={[{ items: (Object.keys(views) as View[]).map((id) => ({ id, label: views[id].label, icon: views[id].icon, counter: rows.filter(views[id].filter).filter((item) => item.status !== "Done").length || undefined })) }]} />}
        header={<AppShellHeader main={<PageHeader title={views[view].label} description={`${views[view].description} · ${plural(shown.length, "task")}`} />} />}
        // The task opens beside the page; when the page would get narrower than a tablet, the panel opens as a modal.
        sidePanel={(
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
        <div ref={measure}>
          <Table aria-label={views[view].label} rows={shown} columns={columns} onRowClick={(row) => setOpenId(row.id)} />
        </div>
      </AppShell>
    </AppFrame>
  );
}

// ——— 9. A sticky selection bar ————————————————————————————————————————————————————————————————————————————
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
  return (
    <AppFrame>
      <AppShell
        sidebar={<Sidebar logo={studioLogo} logoCollapsed={studioMark} selectedId={folder} onItemClick={(item) => { setFolder(item.id as Folder); setSelected([]); }}
          sections={[{ items: (Object.keys(folders) as Folder[]).map((id) => ({ id, label: folders[id].label, icon: folders[id].icon })) }]} />}
        header={(
          <AppShellHeader
            leading={<Breadcrumbs master={false} items={[{ id: "files", label: "Files" }, { id: folder, label: folders[folder].label }]} onNavigate={(_, event) => { event.preventDefault(); setFolder("all"); }} />}
            actions={<AppShellAccount name={me.name} src={me.photo} />}
            main={<PageHeader title={folders[folder].label} description={`${plural(shown.length, "file")} · newest first`} />}
          />
        )}
      >
        <div ref={measure}>
          <Table aria-label={folders[folder].label} rows={shown} columns={columns} selectable selectedIds={selected} onSelectionChange={setSelected} />
        </div>
        {/* The bar sticks to the bottom of the page while rows are selected (ActionBar position="sticky"). */}
        {selected.length ? (
          <ActionBar direction="horizontal" summary={`${plural(selected.length, "file")} selected`}
            secondaryAction={{ label: "Clear selection", onClick: () => setSelected([]) }}
            primaryAction={{ label: "Download", onClick: () => { toast({ title: "Download started", children: plural(selected.length, "file") }); setSelected([]); } }} />
        ) : null}
      </AppShell>
    </AppFrame>
  );
}

// ——— 10. The studio app on a phone (Top=Bar, Bottom=Tab-Bar) ———————————————————————————————————————————
type Root = "home" | "projects" | "profile";
type PhoneProject = { id: string; name: string; client: string; icon: IconName; theme: DockIconTheme; status: ProjectStatus; due: Date };
const phoneProjects: PhoneProject[] = projects.map(({ id, name, client, icon, theme, status, due }) => ({ id, name, client, icon, theme, status, due })).sort((a, b) => a.name.localeCompare(b.name));
const meetings = [
  { id: "m1", title: "Design critique", start: daysFromToday(0, 11, 0), where: "Studio room 2", project: "phin-loyalty" },
  { id: "m2", title: "Lumen Bank check-in", start: daysFromToday(0, 14, 0), where: "Video call", project: "lumen-banking" },
  { id: "m3", title: "Zen office hours", start: daysFromToday(0, 16, 30), where: "Studio room 1", project: "zen-ds" },
];
const clientOptions = [...new Set(phoneProjects.map((project) => project.client))].map((client) => ({ value: client, label: client }));
const phoneRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-smile-line", selectedIcon: "icon-home-smile-solid" },
  { id: "projects", label: "Projects", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
  { id: "profile", label: "Profile", icon: "icon-user-circle-line", selectedIcon: "icon-user-circle-solid" },
];

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
  const [pushed, setPushed] = useState<string | null>(null);
  const [unseen, setUnseen] = useState(true);
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
  // Tapping the current root again scrolls it back to the top; another root opens at its top.
  const openRoot = (id: string) => {
    if (id === root && !pushed) screen.scrollTop();
    setRoot(id as Root);
    setPushed(null);
  };
  const bottom = <BottomNavigation aria-label={studio.name} items={phoneRoots} value={root} onValueChange={openRoot} showLabels />;
  const project = list.find((item) => item.id === pushed);

  let top: ReactNode;
  let body: ReactNode;
  if (project) {
    top = <TopNavigation type="compact-alt" title={project.name} scrollRef={screenRef}
      leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go(`[data-project="${project.id}"] .zen-list-item__wrapper`, () => setPushed(null)) }} />;
    body = (
      <Card theme="flat">
        <DescriptionList items={[
          { term: "Client", description: project.client },
          { term: "Status", description: badge(project.status, projectStatusTheme[project.status]) },
          { term: project.status === "Completed" ? "Finished" : "Due", description: formatDate(project.due) },
        ]} />
      </Card>
    );
  } else if (root === "projects") {
    // The page's Primary (New project) becomes the root's trailing action.
    top = <TopNavigation title="Projects" largeTitle="Projects" scrollRef={screenRef} trailing={[{ icon: "icon-plus-line", label: "New project", onClick: () => setCreating(true) }]} />;
    body = (
      <ListBox>
        <List aria-label="Projects">
          {list.map((item) => (
            <ListItem key={item.id} data-project={item.id} title={item.name} caption={item.client}
              leading={<DockIcon icon={item.icon} theme={item.theme} background="subtle" size="md" />}
              trailing={badge(item.status, projectStatusTheme[item.status])}
              onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setPushed(item.id))} />
          ))}
        </List>
      </ListBox>
    );
  } else if (root === "profile") {
    top = <TopNavigation title="Profile" largeTitle="Profile" scrollRef={screenRef} />;
    body = (
      <>
        <ListBox>
          <List aria-label="Signed in as">
            <ListItem title={me.name} caption={`${me.role} · ${me.location}`} leading={<Avatar size="md" {...avatarOf(me)} />} />
          </List>
        </ListBox>
        <Group id={`${baseId}-notify`} title="Notifications">
          <List aria-labelledby={`${baseId}-notify`}>
            <ToggleListItem title="Push notifications" caption="Comments, reviews and approvals" checked={push} onCheckedChange={setPush} />
            <ToggleListItem title="Daily email digest" caption="Every morning at 8:00 am" checked={digest} onCheckedChange={setDigest} />
          </List>
        </Group>
      </>
    );
  } else {
    // Home: the web app's Notifications becomes the root's trailing action, with a dot until it is opened.
    top = <TopNavigation title="Home" largeTitle="Home" scrollRef={screenRef} topBar={false}
      trailing={[{ icon: "icon-bell-01-line", label: unseen ? "Notifications, new" : "Notifications", dot: unseen, onClick: () => { setUnseen(false); toast({ title: "3 notifications", children: "Chi, Ava and Bao commented this morning." }); } }]} />;
    body = (
      <>
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
              <ListItem key={task.id} title={task.title} caption={`${task.key} · ${formatDue(task.due)}`} leading={<Avatar size="md" {...avatarOf(people[task.assignee])} />} />
            ))}
          </List>
        </Group>
      </>
    );
  }
  return (
    <PlatformPhone key={pushed ?? root} label="Zen app" canvas="alt" screenRef={screenRef}>
      {screen.anchor}
      {/* The Bar pattern: the TopNavigation (its large title folds as the screen scrolls), the Body at the phone's
          margins, the Tab-Bar on every root screen and on screens pushed from them. */}
      <AppShell topNavigation={top} bottomNavigation={bottom}>{body}</AppShell>
      <BottomSheet inline open={creating} onOpenChange={(open) => { setCreating(open); if (!open) form.reset(); }} title="New project" onSubmit={form.handleSubmit}
        primaryAction={{ label: "Create project" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Project name" placeholder="Saola trail guide" data-autofocus="" {...form.field("name")} />
        <SelectField label="Client" options={clientOptions} {...form.selectField("client")} />
      </BottomSheet>
    </PlatformPhone>
  );
}

// ——— 11. Expenses (Top=Band, Bottom=Floating) ——————————————————————————————————————————————————————————————
const expenses = [
  { id: "e1", merchant: "Phin & Co Lê Lợi", category: "Client coffee", icon: "icon-coffee-cup-line" as IconName, theme: "orange" as DockIconTheme, amount: 186_000, at: daysFromToday(0, 8, 40), receipt: true },
  { id: "e2", merchant: "Grab", category: "Transport · Lumen Bank", icon: "icon-car-01-line" as IconName, theme: "green" as DockIconTheme, amount: 94_000, at: daysFromToday(-1, 18, 15), receipt: true },
  { id: "e3", merchant: "Fahasa", category: "Books · research", icon: "icon-book-open-line" as IconName, theme: "blue" as DockIconTheme, amount: 420_000, at: daysFromToday(-2, 12, 5), receipt: false },
  { id: "e4", merchant: "Vietjet Air", category: "Flight · Hanoi kickoff", icon: "icon-plane-line" as IconName, theme: "purple" as DockIconTheme, amount: 2_350_000, at: daysFromToday(-4, 7, 20), receipt: true },
  { id: "e5", merchant: "Highlands Coffee", category: "Workshop snacks", icon: "icon-coffee-cup-line" as IconName, theme: "orange" as DockIconTheme, amount: 310_000, at: daysFromToday(-5, 15, 0), receipt: false },
  { id: "e6", merchant: "Grab", category: "Transport · Saola Outdoor", icon: "icon-car-01-line" as IconName, theme: "green" as DockIconTheme, amount: 128_000, at: daysFromToday(-6, 9, 45), receipt: true },
];
const dong = (amount: number) => `${amount.toLocaleString("vi-VN")} ₫`;

function ExpensesPhone() {
  const { toast } = useToast();
  const [root, setRoot] = useState("expenses");
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  const missing = expenses.filter((item) => !item.receipt).length;
  return (
    <PlatformPhone label="Expenses app" canvas="default">
      {/* Band: a brand band holds the transparent TopNavigation and this month's total (the Hero); the expenses list
          follows on the Canvas and the floating glass bar rides over it. */}
      <AppShell mobileTop="band"
        topNavigation={<TopNavigation title="Expenses" largeTitle="Expenses" trailing={[{ icon: "icon-plus-line", label: "Add expense", onClick: () => toast({ title: "Add expense", children: "Scan a receipt or type it in." }) }]} />}
        hero={(
          <Stack gap="md">
            <Stack gap="2xs">
              <Text textStyle="Body/Small/Medium" tone="base">September so far</Text>
              <Text as="p" textStyle="Heading/1">{dong(total)}</Text>
              <Text textStyle="Body/Small/Regular" tone="base">{`${plural(expenses.length, "expense")} · ${plural(missing, "receipt")} to add`}</Text>
            </Stack>
            <Stack direction="row" gap="sm">
              <Button level="primary" startIcon="icon-camera-line" onClick={() => toast({ title: "Camera opens here" })}>Scan receipt</Button>
              <Button level="tertiary" startIcon="icon-route-line" onClick={() => toast({ title: "Mileage", children: "Log a trip from the map." })}>Add mileage</Button>
            </Stack>
          </Stack>
        )}
        bottomNavigation={<BottomNavigation type="floating-glass" aria-label="Expenses app" value={root} onValueChange={setRoot} items={[
          { id: "home", label: "Home", icon: "icon-home-smile-line", selectedIcon: "icon-home-smile-solid" },
          { id: "expenses", label: "Expenses", icon: "icon-receipt-line", selectedIcon: "icon-receipt-solid" },
          { id: "cards", label: "Cards", icon: "icon-credit-card-line", selectedIcon: "icon-credit-card-solid" },
        ]} />}
      >
        <Stack as="section" gap="xs" aria-label="Recent expenses">
          <Heading level={2} textStyle="Heading/4">Recent</Heading>
          <ListBox>
            <List aria-label="Recent expenses">
              {expenses.map((item) => (
                <ListItem key={item.id} title={item.merchant} caption={`${item.category} · ${formatRelative(item.at)}`}
                  leading={<DockIcon icon={item.icon} theme={item.theme} background="subtle" size="md" />}
                  value={dong(item.amount)} valueCaption={item.receipt ? "Receipt added" : "No receipt"} />
              ))}
            </List>
          </ListBox>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— 12. A teammate's profile (Top=Band-Sheet, Bottom=Actions) ——————————————————————————————————————————————
function ProfilePhone() {
  const { toast } = useToast();
  const person = people.chi;
  const away = leaveRequests.find((request) => request.person === person.id && request.status !== "Declined");
  const theirProjects = projects.filter((project) => project.lead === person.id || tasks.some((task) => task.project === project.id && task.assignee === person.id));
  return (
    <PlatformPhone label="Zen app" canvas="surface">
      {/* Band-Sheet: the band fills the screen behind the person's photo and name; their details rise over it as a
          sheet, and the two ways to reach them stay pinned at the bottom (Bottom=Actions). */}
      <AppShell mobileTop="band-sheet"
        topNavigation={<TopNavigation type="transparent" aria-label={person.name} topBar
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to People" }) }}
          trailing={[{ icon: "icon-share-01-line", label: "Share contact", onClick: () => toast({ title: "Contact card copied" }) }]} />}
        hero={(
          <Stack align="center" gap="sm">
            <Avatar size="2xlarge" {...avatarOf(person)} />
            <Stack align="center" gap="2xs">
              <Heading level={1} textStyle="Heading/2" align="center">{person.name}</Heading>
              <Text tone="base" align="center">{`${person.role} · ${person.team} · ${person.location}`}</Text>
            </Stack>
          </Stack>
        )}
        actionBar={<ActionBar direction="horizontal" secondaryAction={{ label: "Call", onClick: () => toast({ title: `Calling ${person.name}…` }) }}
          primaryAction={{ label: "Message", onClick: () => toast({ title: "Message", children: `${person.name.split(" ")[0]} is in Hanoi, 10:30 am there too.` }) }} />}
      >
        <DescriptionList items={[
          { term: "Email", description: `${person.id}@${studio.domain}` },
          { term: "Office", description: person.location },
          { term: "Reports to", description: me.name },
          { term: "Away", description: away ? `${formatRange(away.from, away.to)} · ${away.status}` : "Not this month" },
        ]} />
        <Stack as="section" gap="xs" aria-label="Working on">
          <Heading level={2} textStyle="Heading/4">Working on</Heading>
          <List aria-label="Working on">
            {theirProjects.map((project) => (
              <ListItem key={project.id} title={project.name} caption={project.client} leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />}
                trailing={badge(project.status, projectStatusTheme[project.status])} />
            ))}
          </List>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— 13. A trail on the Saola guide (Top=Media, Bottom=Actions glass) ———————————————————————————————————————
function TrailPhone() {
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  return (
    <PlatformPhone label="Saola trail guide" canvas="surface" statusBar="light">
      {/* Media: the trail's photo fills the top behind a liquid-overlay TopNavigation; the guide rises over it as a sheet
          and the Action bar keeps the route one tap away. */}
      <AppShell mobileTop="media"
        backdrop={<Image src={platformMedia.mountainRoad.src} alt={platformMedia.mountainRoad.alt} />}
        topNavigation={<TopNavigation aria-label="Mã Pí Lèng loop" topBar
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to trails" }) }}
          trailing={[
            { icon: saved ? "icon-bookmark-solid" : "icon-bookmark-line", label: saved ? "Saved" : "Save trail", onClick: () => setSaved((value) => !value) },
            { icon: "icon-share-01-line", label: "Share trail", onClick: () => toast({ title: "Trail link copied" }) },
          ]} />}
        actionBar={<ActionBar direction="horizontal" summary="Next guided walk Sat, Oct 3 · 6 spots"
          primaryAction={{ label: "Start route", onClick: () => toast({ title: "Route started", children: "Offline map ready · check-ins every 2 hours" }) }} />}
      >
        <Stack gap="xs">
          <Text textStyle="Body/Small/Bold" tone="light">Hà Giang · Saola Outdoor</Text>
          <Heading level={1} textStyle="Heading/2">Mã Pí Lèng loop</Heading>
        </Stack>
        <Grid columns={3} gap="sm">
          {[
            { label: "Distance", value: "14.2 km" },
            { label: "Climb", value: "820 m" },
            { label: "Time", value: "5–6 h" },
          ].map((stat) => (
            <Card key={stat.label} theme="pale" spacing="sm">
              <Stack gap="2xs">
                <Text textStyle="Body/Small/Regular" tone="base">{stat.label}</Text>
                <Text as="p" textStyle="Heading/Subheading">{stat.value}</Text>
              </Stack>
            </Card>
          ))}
        </Grid>
        <Text>A ridge walk above the Nho Quế river: limestone switchbacks, two homestays for water, and the pass at sunrise. Check in at the Khau Vai gate; the guide carries the satellite beacon.</Text>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— 14. The studio app on an iPad held upright (Device=Tablet: the mobile shell) ———————————————————————————
function TabletPortraitApp() {
  const [root, setRoot] = useState("projects");
  return (
    <PlatformPhone device="ipad" label="Zen app on iPad" canvas="alt">
      {/* Upright an iPad is narrower than 1024, so the same AppShell draws its mobile parts (Top=Bar, Bottom=Tab-Bar);
          turned sideways it draws the Sidebar and the header. The Sidebar stays one tap away as the drawer. */}
      <AppShell
        sidebar={<Sidebar logo={studioLogo} sections={studioSections} selectedId={root} onItemClick={(item) => setRoot(item.id)} />}
        header={<AppShellHeader leading={<Breadcrumbs master={false} items={[{ id: "home", label: "Home" }, { id: "projects", label: "Projects" }]} />} actions={<AppShellAccount name={me.name} src={me.photo} />} />}
        topNavigation={<TopNavigation title="Projects" largeTitle="Projects" trailing={[{ icon: "icon-plus-line", label: "New project", onClick: () => undefined }]} />}
        bottomNavigation={<BottomNavigation aria-label={studio.name} value={root} onValueChange={setRoot} showLabels items={[
          { id: "home", label: "Home", icon: "icon-home-smile-line", selectedIcon: "icon-home-smile-solid" },
          { id: "projects", label: "Projects", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
          { id: "invoices", label: "Invoices", icon: "icon-receipt-line", selectedIcon: "icon-receipt-solid" },
        ]} />}
      >
        <Grid as="ul" minColumnWidth={280} gap="md" aria-label="Projects">
          {projects.map((project) => (
            <Card as="li" key={project.id} theme="shadow">
              <Stack gap="md">
                <Stack direction="row" gap="sm" align="center" justify="between">
                  <DockIcon icon={project.icon} theme={project.theme} background="subtle" />
                  {badge(project.status, projectStatusTheme[project.status])}
                </Stack>
                <Stack gap="xs">
                  <Heading level={2} textStyle="Heading/Subheading">{project.name}</Heading>
                  <Text textStyle="Body/Small/Regular" tone="base">{`${project.client} · due ${formatDate(project.due)}`}</Text>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Grid>
      </AppShell>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Studio app",
    description: "The studio's web app on the Sidebar pattern. The header's top row starts with the collapse toggle and the trail and keeps only utilities on the right (the plan, Notifications with its unread count, the account menu). Each page's own header (its title and Primary) is the Main row, Projects' views are its Sections, and the Body holds the content at the page margin.",
    wide: true,
    screen: true,
    render: () => <StudioApp />,
    code: `const [collapsed, setCollapsed] = useState(false); // store it per person

<AppShell
  sidebar={<Sidebar logo={logo} logoCollapsed={mark} sections={sections} selectedId={page} onItemClick={(item) => go(item.id)} />}
  sidebarCollapsed={collapsed}
  onSidebarCollapsedChange={setCollapsed}
  header={
    <AppShellHeader
      leading={<Breadcrumbs master={false} items={[{ id: "home", label: "Home" }, { id: "projects", label: "Projects" }]} onNavigate={navigate} />}
      actions={<>
        <Badge theme="accent" background="subtle" leadingIcon={false}>Business</Badge>
        <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unseen} onClick={() => go("notifications")} />
        <Menu align="end" trigger={<AppShellAccount name="Alex Duong" src={alex.photo} />} items={accountItems} />
      </>}
      main={<PageHeader title="Projects" description="6 projects" actions={<Button level="primary" onClick={newProject}>New project</Button>} />}
      sections={<Tabs aria-label="Project views" value={view} onValueChange={setView} items={views} />}
    />
  }
>
  <Table aria-label="Active projects" rows={shown} columns={columns} />
</AppShell>`,
  },
  {
    title: "Toggle in the Sidebar",
    description: "The people directory's trail starts with the workspace's Master crumb and its home icon, so the collapse toggle moves into the Sidebar's own header (collapse=\"sidebar\"): two icons at the start of the header read as one control. The Search sits in the middle of the top row (up to 400px) and finds people from any page. On a white Canvas the Sidebar is Surface-alt and cards take a Pale border.",
    wide: true,
    screen: true,
    render: () => <PeopleDirectoryApp />,
    code: `<AppShell
  canvas="alt"
  collapse="sidebar"
  sidebar={<Sidebar background="alt" logo={logo} sections={sections} selectedId={page} onItemClick={(item) => go(item.id)} />}
  header={
    <AppShellHeader
      leading={<Breadcrumbs items={[{ id: "workspace", label: "Đìzai Studio" }, { id: "people", label: "People" }]} />}
      center={<Search placeholder="Search people" aria-label="Search people" value={query} onValueChange={setQuery} />}
      actions={<>
        <AppShellAction icon="icon-bell-01-line" aria-label="Activity" dot={hasNews} onClick={() => go("activity")} />
        <Menu align="end" trigger={<AppShellAccount name="Alex Duong" src={alex.photo} />} items={accountItems} />
      </>}
      main={<PageHeader title="People" description="14 people at Đìzai Studio" actions={<Button level="primary" startIcon="icon-user-plus-line" onClick={invite}>Invite person</Button>} />}
    />
  }
>
  <Table aria-label="People" rows={shown} columns={columns} empty={noMatches} />
</AppShell>`,
  },
  {
    title: "List and detail",
    description: "Leave requests on the List-Detail pattern: the Sidebar starts on its rail, the requests fill the leading pane (360) and the open one fills the page, with Approve and Decline in its header. Picking a row changes the detail in place and the list keeps its scroll; Undo in the toast puts a decision back.",
    wide: true,
    screen: true,
    render: () => <LeaveRequestsApp />,
    code: `<AppShell
  pattern="list-detail"
  sidebar={<Sidebar logo={logo} logoCollapsed={mark} sections={sections} selectedId="leave" />}
  leadingPane={
    <AppShellPane title="Leave requests" action={<IconButton appearance="flat" level="secondary" size="sm" icon="icon-filter-lines-line" aria-label="Filter requests" />}>
      <List aria-label="Leave requests">
        {requests.map((request) => (
          <ListItem key={request.id} selected={request.id === openId} title={request.name} caption={\`\${request.kind} · \${request.dates}\`}
            leading={<Avatar size="md" src={request.photo} alt="" />} trailing={<Badge theme="yellow" background="subtle">Pending</Badge>}
            onClick={() => setOpenId(request.id)} />
        ))}
      </List>
    </AppShellPane>
  }
  header={
    <AppShellHeader
      leading={<Breadcrumbs master={false} items={[{ id: "leave", label: "Leave" }, { id: "requests", label: "Requests · 2 pending" }]} />}
      actions={<AppShellAccount name="Alex Duong" src={alex.photo} />}
      main={<PageHeader title="Chi Tran · Annual leave" description="Oct 19 – 21, 2026 · 3 working days"
        actions={<><Button level="tertiary" onClick={decline}>Decline</Button><Button level="primary" onClick={approve}>Approve</Button></>} />}
    />
  }
>
  <Grid columns={{ mobile: 1, desktop: 2 }} gap="md">…</Grid>
</AppShell>`,
  },
  {
    title: "Top bar",
    description: "Phin & Co's client portal on the Top-Bar pattern: a client sees one company, so there is no Sidebar. The header runs across the window with the portal's views as its Sections and the file Search in the middle of the top row; Upload brief is the page's one Primary.",
    wide: true,
    screen: true,
    render: () => <ClientPortalApp />,
    code: `<AppShell
  pattern="top-bar"
  canvas="alt"
  header={
    <AppShellHeader
      leading={<StudioLogo src={logo} name="Đìzai Studio · Phin & Co" />}
      center={<Search placeholder="Search shared files" aria-label="Search shared files" value={query} onValueChange={setQuery} />}
      actions={<><AppShellAction icon="icon-message-circle-line" aria-label="Messages" dot /><AppShellAccount name="Lan Phạm" /></>}
      main={<PageHeader title="Phin & Co" description="Your projects with Đìzai Studio" actions={<Button level="primary" startIcon="icon-upload-01-line">Upload brief</Button>} />}
      sections={<Tabs aria-label="Portal" value={tab} onValueChange={setTab} items={tabs} />}
    />
  }
>
  {tab === "files" ? <Table aria-label="Shared files" rows={files} columns={columns} /> : overview}
</AppShell>`,
  },
  {
    title: "Workspace",
    description: "A design review on the Workspace pattern: the header runs across the top, the files under review sit in the leading pane and the comments in the trailing one, both Sidebar/Default-Width, with the frame between them. Each pane scrolls on its own; a comment posts to the end of the list.",
    wide: true,
    screen: true,
    render: () => <DesignReviewApp />,
    code: `<AppShell
  pattern="workspace"
  header={<AppShellHeader leading={<Breadcrumbs master={false} items={trail} />} actions={<><AvatarStack size="sm" items={reviewers} /><Button level="tertiary" startIcon="icon-share-01-line">Share</Button><AppShellAccount name="Alex Duong" src={alex.photo} /></>} />}
  leadingPane={<AppShellPane title="Files"><List aria-label="Files in review">{fileRows}</List></AppShellPane>}
  trailingPane={
    <AppShellPane title="Comments · 3">
      <List aria-label="Comments">{commentRows}</List>
      <TextAreaField label="Add a comment" value={draft} onValueChange={setDraft} rows={2} />
    </AppShellPane>
  }
>
  <PageHeader title="Points history v4.fig" description="Loyalty app · edited 2 hours ago by Chi Tran" />
  <Card theme="shadow" spacing="sm"><Image src={frame} alt="Frame under review" ratio="16:9" /></Card>
</AppShell>`,
  },
  {
    title: "Docs",
    description: "The studio handbook on the Docs pattern: a reading column of at most 720 between the contents and On this page, both on the Canvas (theme=\"canvas\") so nothing competes with the text. The handbook Search sits in the middle of the top row.",
    wide: true,
    screen: true,
    render: () => <HandbookApp />,
    code: `<AppShell
  pattern="docs"
  canvas="alt"
  header={<AppShellHeader leading={<StudioLogo src={logo} name="Studio handbook" />} center={<Search placeholder="Search the handbook" aria-label="Search the handbook" />} actions={<AppShellAccount name="Alex Duong" src={alex.photo} />} />}
  leadingPane={<AppShellPane title="Contents" theme="canvas"><List aria-label="Chapters">{chapters}</List></AppShellPane>}
  trailingPane={<AppShellPane title="On this page" theme="canvas"><List aria-label="On this page">{anchors}</List></AppShellPane>}
>
  <Stack as="article" gap="xl">
    <Heading level={1} textStyle="Heading/1">Leave and time off</Heading>
    …
  </Stack>
</AppShell>`,
  },
  {
    title: "Focus",
    description: "Setting up a project on the Focus pattern: one task with nothing else to click. The header keeps only Save and close, the steps sit under it, and the form shares a centred column (at most 680) with its summary pane, which follows what is typed.",
    wide: true,
    screen: true,
    render: () => <ProjectSetupApp />,
    code: `<AppShell
  pattern="focus"
  header={<AppShellHeader leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: "new", label: "New project" }]} />}
    actions={<Button level="tertiary" onClick={saveAndClose}>Save and close</Button>} />}
  progress={<Stepper aria-label="New project" steps={steps} current={step} />}
  trailingPane={<AppShellPane title="Summary"><DescriptionList items={summary} /></AppShellPane>}
>
  <form onSubmit={form.handleSubmit}>
    <InputField label="Project name" {...form.field("name")} />
    …
    <Button type="submit" level="primary">Continue</Button>
  </form>
</AppShell>`,
  },
  {
    title: "Task panel",
    description: "A row opens its task in the side panel, a standard Side Panel. It docks beside the page only while the page keeps a tablet width (744px) next to it; in a narrower window it opens as a modal panel. Mark as done updates the row and the counters, with Undo in the toast. The flat Canvas pairs with a flat Sidebar, and with no top row the collapse toggle is in the Sidebar.",
    wide: true,
    screen: true,
    render: () => <TaskWorkbench />,
    code: `<AppShell
  canvas="flat"
  collapse="sidebar"
  sidebar={<Sidebar variant="small-density" background="flat" sections={sections} selectedId={view} onItemClick={(item) => setView(item.id)} />}
  header={<AppShellHeader main={<PageHeader title="All tasks" description="Every open project at the studio · 10 tasks" />} />}
  sidePanel={
    <SidePanel type="standard" size="small" open={Boolean(task)} onOpenChange={(open) => !open && setOpenId(null)}
      title={task?.title} description={\`\${task?.key} · \${project.name}\`}
      primaryAction={{ label: "Mark as done", onClick: markDone }} secondaryAction={{ label: "Close" }}>
      <DescriptionList divider items={details} />
    </SidePanel>
  }
>
  <Table aria-label="All tasks" rows={rows} columns={columns} onRowClick={(row) => setOpenId(row.id)} />
</AppShell>`,
  },
  {
    title: "Selection bar",
    description: "Selecting files brings up an ActionBar that sticks to the bottom of the page with the count, Clear selection and Download, and leaves when nothing is selected.",
    wide: true,
    screen: true,
    render: () => <FilesApp />,
    code: `<AppShell sidebar={sidebar} header={<AppShellHeader leading={trail} actions={account} main={<PageHeader title="All files" description="14 files · newest first" />} />}>
  <Table aria-label="All files" rows={files} columns={columns} selectable selectedIds={selected} onSelectionChange={setSelected} />
  {selected.length ? (
    <ActionBar direction="horizontal" summary={\`\${plural(selected.length, "file")} selected\`}
      secondaryAction={{ label: "Clear selection", onClick: () => setSelected([]) }}
      primaryAction={{ label: "Download", onClick: download }} />
  ) : null}
</AppShell>`,
  },
  {
    title: "Banner above the shell",
    description: "The banner holds a workspace-wide AlertBanner above the whole shell: it stays in view on every page and while the page scrolls, and the sticky Sidebar and header sit under it. Dismissing it hides it on every page, with Undo in the toast.",
    wide: true,
    screen: true,
    render: () => <StudioApp notice />,
    code: `<AppShell
  banner={noticeShown ? (
    <AlertBanner theme="warning" onClose={dismiss}>
      Zen is read-only tonight from 11:00 pm to 1:00 am while the studio moves to a new data centre.
    </AlertBanner>
  ) : undefined}
  sidebar={sidebar}
  header={header}
>
  {page}
</AppShell>`,
  },
  {
    title: "Narrow window",
    description: "The studio app in a window narrower than 1024px with no phone parts: the header puts a menu button where the toggle was and the Sidebar opens as a modal drawer. Focus moves to the current page, Tab stays inside, and Close, Escape or the scrim close it; picking a page closes it and moves focus to the page.",
    wide: true,
    render: () => <StudioApp windowWidth={900} />,
    code: `// Nothing changes in the code: layout="auto" (the default) follows the shell's own width.
<AppShell sidebar={sidebar} header={header}>
  {page}
</AppShell>`,
  },
  {
    title: "Phone app",
    description: "The studio app on a phone with the Bar pattern: the TopNavigation (its large title folds as the list scrolls), the Body at the phone's margins and the Tab-Bar on every root. Tapping the current root again scrolls it back to the top; a project opens on a pushed screen with Back.",
    render: () => <PhoneApp />,
    code: `<PlatformPhone screenRef={screenRef}>
  <AppShell
    topNavigation={<TopNavigation title="Projects" largeTitle="Projects" scrollRef={screenRef}
      trailing={[{ icon: "icon-plus-line", label: "New project", onClick: () => setCreating(true) }]} />}
    bottomNavigation={<BottomNavigation aria-label="Đìzai Studio" value={root} onValueChange={open} showLabels items={roots} />}
  >
    <ListBox>
      <List aria-label="Projects">{projectRows}</List>
    </ListBox>
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "Band with a hero",
    description: "Expenses on the Band pattern: a brand band holds the transparent TopNavigation and this month's total with the two quick actions; the expenses follow on the Canvas and the floating glass bar rides over them.",
    render: () => <ExpensesPhone />,
    code: `<AppShell
  mobileTop="band"
  topNavigation={<TopNavigation title="Expenses" largeTitle="Expenses" trailing={[{ icon: "icon-plus-line", label: "Add expense", onClick: add }]} />}
  hero={
    <Stack gap="md">
      <Text textStyle="Body/Small/Medium" tone="base">September so far</Text>
      <Text as="p" textStyle="Heading/1">3.488.000 ₫</Text>
      <Stack direction="row" gap="sm">
        <Button level="primary" startIcon="icon-camera-line">Scan receipt</Button>
        <Button level="tertiary" startIcon="icon-route-line">Add mileage</Button>
      </Stack>
    </Stack>
  }
  bottomNavigation={<BottomNavigation type="floating-glass" aria-label="Expenses app" value={root} onValueChange={setRoot} items={roots} />}
>
  <ListBox><List aria-label="Recent expenses">{expenseRows}</List></ListBox>
</AppShell>`,
  },
  {
    title: "Profile on a sheet",
    description: "A teammate's profile on the Band-Sheet pattern: the band fills the screen behind their photo and name, their details rise over it as a sheet, and Message and Call stay pinned at the bottom in an Action bar.",
    render: () => <ProfilePhone />,
    code: `<AppShell
  mobileTop="band-sheet"
  topNavigation={<TopNavigation type="transparent" aria-label="Chi Tran" topBar leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
  hero={<Stack align="center" gap="sm"><Avatar size="2xlarge" src={chi.photo} alt="" /><Heading level={1} textStyle="Heading/2">Chi Tran</Heading></Stack>}
  actionBar={<ActionBar direction="horizontal" secondaryAction={{ label: "Call", onClick: call }} primaryAction={{ label: "Message", onClick: message }} />}
>
  <DescriptionList items={details} />
</AppShell>`,
  },
  {
    title: "Photo behind the page",
    description: "A trail on the Saola guide with the Media pattern: the photo fills the top behind a liquid-overlay TopNavigation, the guide rises over it as a sheet, and the Action bar keeps Start route one tap away. Over a photo that runs under it, the bar takes surface=\"glass\".",
    render: () => <TrailPhone />,
    code: `<AppShell
  mobileTop="media"
  backdrop={<Image src={trail.photo} alt="A mountain road curving above a green valley" />}
  topNavigation={<TopNavigation aria-label="Mã Pí Lèng loop" topBar leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }}
    trailing={[{ icon: "icon-bookmark-line", label: "Save trail", onClick: save }, { icon: "icon-share-01-line", label: "Share trail", onClick: share }]} />}
  actionBar={<ActionBar direction="horizontal" summary="Next guided walk Sat, Oct 3 · 6 spots" primaryAction={{ label: "Start route", onClick: start }} />}
>
  <Heading level={1} textStyle="Heading/2">Mã Pí Lèng loop</Heading>
  …
</AppShell>`,
  },
  {
    title: "iPad held upright",
    description: "The same AppShell on an iPad held upright: narrower than 1024, it draws its mobile parts (Bar and Tab-Bar) instead of the Sidebar and the header; turned sideways it draws the desktop pattern. The Sidebar stays reachable as the drawer.",
    render: () => <TabletPortraitApp />,
    code: `// One shell for both orientations: under 1024px the mobile parts win when they are given.
<AppShell
  sidebar={sidebar}
  header={header}
  topNavigation={<TopNavigation title="Projects" largeTitle="Projects" />}
  bottomNavigation={<BottomNavigation aria-label="Đìzai Studio" value={root} onValueChange={setRoot} showLabels items={roots} />}
>
  <Grid as="ul" minColumnWidth={280} gap="md" aria-label="Projects">{projectCards}</Grid>
</AppShell>`,
  },
]);
