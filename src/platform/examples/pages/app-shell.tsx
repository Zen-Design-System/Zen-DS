/* App Shell examples. First the Figma page ◇ Master-Layout · Example (15902:109717) screen by screen, sections A–F in
   ./app-shell/* (user, 2026-10-19: "Các example Appshell nên build như trong Figma ◇ Master-Layout · Example"). Then the
   shell's behaviours with Đìzai Studio's own apps, signed in as Alex Duong, Wednesday Sep 30, 2026, 10:30 am: the
   toggle in the Sidebar beside a Master crumb, the docked task panel, the sticky selection bar, the banner, the narrow
   window (drawer) and the studio app on an iPad held upright. */
import { useEffect, useId, useState, type ReactNode } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { AlertBanner } from "../../../components/AlertBanner";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader } from "../../../components/AppShell";
import { Avatar, AvatarStack } from "../../../components/Avatar";
import { Badge, type BadgeTheme } from "../../../components/Badge";
import { BottomNavigation } from "../../../components/BottomNavigation";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { Dialog } from "../../../components/Dialog";
import { DockIcon, type DockIconTheme } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import type { IconName } from "../../../components/Icon";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { MetricCard } from "../../../components/MetricWidget";
import { PageHeader } from "../../../components/PageHeader";
import { Search } from "../../../components/Search";
import { SidePanel } from "../../../components/SidePanel";
import { Sidebar, type SidebarSection } from "../../../components/Sidebar";
import { Table, TableMedia, TableText, type TableColumn } from "../../../components/Table";
import { Tabs } from "../../../components/Tabs";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { PlatformPhone } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { PreviewAppFrame, StudioLogo, StudioMark } from "../../PlatformFrames";
import {
  activity, daysFromToday, files, formatBytes, formatCompactMoney, formatDate, formatDay, formatDue, formatMoney, formatRelative, initials,
  invoiceStatusTheme, invoices, me, people, peopleList, priorityTheme, projectById, projectStatusTheme, projects, studio, taskStatusTheme, tasks,
  type Invoice, type Person, type Project, type StudioFile, type Task, type TaskStatus, type Team,
} from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import { examples as compositions } from "./app-shell/a-compositions";
import { examples as desktop1 } from "./app-shell/b-desktop-1";
import { examples as desktop2 } from "./app-shell/b-desktop-2";
import { examples as mobile1 } from "./app-shell/c-mobile-1";
import { examples as mobile2 } from "./app-shell/c-mobile-2";
import { examples as expressive1 } from "./app-shell/d-expressive-1";
import { examples as expressive2 } from "./app-shell/d-expressive-2";
import { examples as consumer1 } from "./app-shell/e-consumer-1";
import { examples as consumer2 } from "./app-shell/e-consumer-2";
import { examples as smartHome1 } from "./app-shell/f-smart-home-1";
import { examples as smartHome2 } from "./app-shell/f-smart-home-2";
import { examples as smartHome3 } from "./app-shell/f-smart-home-3";

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
            actions={<Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
              { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: "Profile", children: me.name }) },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out" }) },
            ]} />}
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

// ——— 14. The studio app on an iPad held upright (Device=Tablet: the mobile shell) ———————————————————————————
function TabletPortraitApp() {
  const [root, setRoot] = useState("projects");
  const { toast } = useToast();
  return (
    <PlatformPhone device="ipad" label="Zen app on iPad" canvas="alt">
      {/* Upright an iPad is narrower than 1024, so the same AppShell draws its mobile parts (Top=Bar, Bottom=Tab-Bar);
          turned sideways it draws the Sidebar and the header. The Sidebar stays one tap away as the drawer. */}
      <AppShell
        sidebar={<Sidebar logo={studioLogo} sections={studioSections} selectedId={root} onItemClick={(item) => setRoot(item.id)} />}
        header={<AppShellHeader
          leading={<Breadcrumbs master={false} items={[{ id: "home", label: "Home" }, { id: "projects", label: "Projects" }]} onNavigate={(item, event) => { event.preventDefault(); setRoot(item.id); }} />}
          actions={<Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[{ id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out" }) }]} />}
        />}
        topNavigation={<TopNavigation title="Projects" largeTitle="Projects" trailing={[{ icon: "icon-plus-line", label: "New project", onClick: () => toast({ title: "New project", children: "The form opens here." }) }]} />}
        bottomNavigation={<BottomNavigation aria-label={studio.name} value={root} onValueChange={setRoot} showLabels items={[
          { id: "home", label: "Home", icon: "icon-home-smile-line", selectedIcon: "icon-home-smile-solid" },
          { id: "projects", label: "Projects", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
          { id: "invoices", label: "Invoices", icon: "icon-receipt-line", selectedIcon: "icon-receipt-solid" },
        ]} />}
      >
        {/* The grey phone screen (Surface/Alt, the shell's Canvas/Default) with the Tab-Bar: every box floats, Shadow
            cards (as C1). */}
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

/** The screens of Figma ◇ Master-Layout · Example (15902:109717), section by section: A background compositions, B desktop
 *  structures, C mobile structures, D expressive mobile, E consumer apps from references, F the smart-home concept on every
 *  device (user, 2026-10-19: "Các example Appshell nên build như trong Figma ◇ Master-Layout · Example"). */
const figmaExamples: ExampleDef[] = [...compositions, ...desktop1, ...desktop2, ...mobile1, ...mobile2, ...expressive1, ...expressive2, ...consumer1, ...consumer2, ...smartHome1, ...smartHome2, ...smartHome3];

/** What the shell does beyond the Figma screens: the toggle in the Sidebar, the docked panel, the narrow window, the banner. */
const behaviourExamples: ExampleDef[] = [
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
];

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [...figmaExamples, ...behaviourExamples]);
