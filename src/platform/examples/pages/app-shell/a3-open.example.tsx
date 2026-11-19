import { useId, useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, Badge, BadgeCounter, Box, Breadcrumbs, Button, DashboardHeader, EmptyState, Grid, Heading,
  Icon, IconButton, InputField, List, ListBox, ListItem, Menu, MetricCard, ModalForm, PageHeader, Pagination, ProgressBar, Search, Sidebar, SidebarMenuItem,
  Stack, Table, TableActions, TableBadges, TableMedia, TableText, Text, VisuallyHidden, ZenProvider, useFormState, useToast, useZen,
  type AvatarTheme, type BadgeTheme, type IconName, type MetricTrendDirection, type SidebarSection, type TableColumn, type TableSort,
} from "@zen-ds/react";
import { people, studio } from "../../data";

// ——— The workspace's content (Figma texts): Đìzai Studio's Overview for Maya Chen on Sunday, Sep 22, 2024 ——————————————
const maya = { name: "Maya Chen", photo: people.ava.photo };

const navSections: SidebarSection[] = [
  { items: [
    { id: "overview", label: "Overview", icon: "icon-home-03-line" },
    { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line", counter: 3 },
    { id: "calendar", label: "Calendar", icon: "icon-calendar-line" },
  ] },
  { label: "Work", items: [
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "tasks", label: "Tasks", icon: "icon-check-square-line", counter: 8 },
    { id: "leads", label: "Leads", icon: "icon-target-04-line" },
  ] },
  { label: "People", items: [
    { id: "members", label: "Members", icon: "icon-users-line" },
    { id: "timesheets", label: "Timesheets", icon: "icon-clock-line", counter: 5 },
    { id: "payments", label: "Payments", icon: "icon-coins-stacked-01-line" },
  ] },
  { label: "Insights", items: [
    { id: "performance", label: "Performance", icon: "icon-line-chart-up-line" },
    { id: "reports", label: "Reports", icon: "icon-file-chart-line" },
    { id: "goals", label: "Goals", icon: "icon-flag-01-line" },
  ] },
];

type Kpi = { id: string; label: string; value: string; trend: { direction: MetricTrendDirection; label: string; subLabel?: string }; icon: IconName; hue: "orange" | "blue" | "violet" | "green"; detail: string };
/** One hue per metric family: the Dock-Icon's, and the card's Pale fill too. */
const kpis: Kpi[] = [
  { id: "tasks", label: "Tasks due this week", value: "23", trend: { direction: "negative", label: "5", subLabel: "overdue" }, icon: "icon-check-square-line", hue: "orange", detail: "5 are overdue, 3 of them on Onboarding v2." },
  { id: "meetings", label: "Meetings this week", value: "14", trend: { direction: "normal", label: "3", subLabel: "on Monday" }, icon: "icon-calendar-line", hue: "blue", detail: "Monday starts with the weekly standup at 9:00." },
  { id: "hours", label: "Hours last week", value: "2,535h", trend: { direction: "positive", label: "1.2%", subLabel: "vs. week 37" }, icon: "icon-clock-line", hue: "violet", detail: "5 timesheets still wait for approval." },
  { id: "leads", label: "Open leads", value: "38", trend: { direction: "positive", label: "6", subLabel: "this week" }, icon: "icon-target-04-line", hue: "green", detail: "Northwind moved to the pilot stage." },
];

type Meeting = { id: string; title: string; when: string; tag: string; theme: BadgeTheme };
const meetings: Meeting[] = [
  { id: "standup", title: "Weekly standup", when: "Mon, Sep 23 · 9:00 – 9:30 · Whole team", tag: "Team", theme: "blue" },
  { id: "q4", title: "Q4 planning", when: "Mon, Sep 23 · 14:00 – 15:30 · Room 2", tag: "Team", theme: "blue" },
  { id: "review", title: "Design review: Onboarding v2", when: "Tue, Sep 24 · 10:00 – 11:00 · Google Meet", tag: "Design", theme: "violet" },
  { id: "northwind", title: "Northwind weekly call", when: "Wed, Sep 25 · 15:00 – 16:00 · Google Meet", tag: "Sales", theme: "teal" },
  { id: "demo", title: "Sprint demo", when: "Fri, Sep 27 · 16:00 – 17:00 · Room 1", tag: "Team", theme: "blue" },
];

type Message = { id: string; from: string; initials: string; theme: AvatarTheme; text: string; at: string };
const messages: Message[] = [
  { id: "lia", from: "Lia Campbell", initials: "LC", theme: "violet", text: "Can you review the onboarding copy before Tuesday?", at: "2h" },
  { id: "john", from: "John McLeod", initials: "JM", theme: "blue", text: "Northwind signed the pilot. Kickoff is on Oct 1.", at: "5h" },
  { id: "paul", from: "Paul Rivera", initials: "PR", theme: "teal", text: "Shared the Q3 leads report in Reports.", at: "Sat" },
  { id: "sarah", from: "Sarah Kim", initials: "SK", theme: "orange", text: "Out on Friday, Lisa covers my client calls.", at: "Fri" },
];

type Team = "Design" | "Product" | "Dev" | "Sales" | "Operations";
const teamTheme: Record<Team, BadgeTheme> = { Design: "violet", Product: "plum", Dev: "blue", Sales: "teal", Operations: "neutral" };
type Project = { id: string; name: string; summary: string; initials: string; theme: AvatarTheme; owner: string; teams: Team[]; done: number; total: number; due: Date };
/** The first page is Figma's six rows; the second page continues the same workspace. */
const projects: Project[] = [
  { id: "onboarding", name: "Onboarding v2", summary: "Self-serve sign-up flow", initials: "OV", theme: "pink", owner: "Alice Padilla", teams: ["Design", "Product"], done: 16, total: 21, due: new Date(2024, 8, 27) },
  { id: "mobile", name: "Mobile app 2.4", summary: "iOS and Android release", initials: "MA", theme: "violet", owner: "Lia Campbell", teams: ["Product", "Dev"], done: 10, total: 12, due: new Date(2024, 9, 4) },
  { id: "northwind", name: "Northwind pilot", summary: "New client onboarding", initials: "NW", theme: "blue", owner: "John McLeod", teams: ["Sales", "Operations"], done: 13, total: 20, due: new Date(2024, 9, 11) },
  { id: "q4-sales", name: "Q4 sales campaign", summary: "Outbound and partner leads", initials: "QS", theme: "teal", owner: "Paul Rivera", teams: ["Sales"], done: 19, total: 22, due: new Date(2024, 8, 30) },
  { id: "design-system", name: "Design system 3.0", summary: "Tokens, dark mode, docs", initials: "DS", theme: "orange", owner: "Maya Chen", teams: ["Design"], done: 8, total: 16, due: new Date(2024, 9, 18) },
  { id: "hiring", name: "Hiring: senior designer", summary: "3 candidates in the final round", initials: "HR", theme: "green", owner: "Maya Chen", teams: ["Operations"], done: 4, total: 15, due: new Date(2024, 9, 25) },
  { id: "help-center", name: "Help center refresh", summary: "New articles and search", initials: "HC", theme: "cyan", owner: "Sarah Kim", teams: ["Product"], done: 11, total: 14, due: new Date(2024, 9, 9) },
  { id: "brand", name: "Brand guidelines", summary: "Logo, colour and voice", initials: "BG", theme: "plum", owner: "Alice Padilla", teams: ["Design"], done: 9, total: 10, due: new Date(2024, 9, 2) },
  { id: "interviews", name: "Customer interviews", summary: "12 sessions with pilot clients", initials: "CI", theme: "indigo", owner: "Sarah Kim", teams: ["Product", "Design"], done: 7, total: 12, due: new Date(2024, 9, 16) },
  { id: "partner-portal", name: "Partner portal", summary: "Self-serve reseller dashboard", initials: "PP", theme: "crimson", owner: "John McLeod", teams: ["Sales", "Dev"], done: 6, total: 18, due: new Date(2024, 10, 1) },
  { id: "billing", name: "Billing migration", summary: "Invoices move to the new provider", initials: "BM", theme: "brown", owner: "Lia Campbell", teams: ["Dev", "Operations"], done: 3, total: 12, due: new Date(2024, 10, 8) },
  { id: "timesheets", name: "Timesheet automation", summary: "Weekly reminders and approvals", initials: "TA", theme: "purple", owner: "Paul Rivera", teams: ["Operations"], done: 2, total: 9, due: new Date(2024, 10, 15) },
];
const formatDue = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const ratio = (project: Project) => project.done / project.total;
function sortProjects(rows: Project[], sort: TableSort | null) {
  if (!sort) return rows;
  const key = sort.columnId === "progress" ? ratio : (project: Project) => +project.due;
  const sign = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => (key(a) - key(b)) * sign);
}

/** The Pagination names what it counts: "6 per page", "1 – 6 of 12 projects" (Figma Pagination Theme=Inline). */
const projectPagination = {
  results: (count: number) => `${count} per page`,
  resultsRange: (first: number, last: number, total: number) => `${first} – ${last} of ${total} ${total === 1 ? "project" : "projects"}`,
};
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* The workspace's mark and name (Figma Header-Content: an Avatar Small square, Body/Extra/Bold, the switcher chevron);
   the collapsed rail keeps the mark. */
const brand = (
  <Stack direction="row" gap="xs" align="center">
    <Avatar size="sm" shape="square" theme="photo" src={studio.logo} alt="" />
    <Stack direction="row" gap="3xs" align="center">
      <Text as="span" textStyle="Body/Extra/Bold">{studio.name}</Text>
      <Icon name="icon-chevron-down-line" decorative />
    </Stack>
  </Stack>
);
const mark = <Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />;

/**
 * A3 · Open (Figma 15904:6185): white Canvas/Alt; the KPI cards are tinted Pale fills, one hue per metric family, with no
 * shadow and no border; the lists take a 1px border, and the Sidebar has no shadow.
 */
// narrowKpis: the page beside the Sidebar is under 1,040px, too narrow for four KPI cards with one-line titles, so they
// take two columns. Without it, the breakpoint decides.
export default function WorkspaceOpen({ narrowKpis }: { narrowKpis?: boolean }) {
  const { toast } = useToast();
  const breakpoint = useZen()?.breakpoint;
  const id = useId();
  const weekId = `${id}-week`;
  const inboxId = `${id}-inbox`;
  const projectsId = `${id}-projects`;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<TableSort | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [inviting, setInviting] = useState(false);
  const [creating, setCreating] = useState(false);
  // Four KPI cards need about 1,040px to keep each title on one line (Figma: 294 each at 1,224).
  const kpiColumns = (narrowKpis ?? (breakpoint === "tablet" || breakpoint === "mobile")) ? 2 : 4;
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "The Overview shows what the four compositions share." });

  const q = query.trim().toLowerCase();
  const found = sortProjects(projects.filter((project) => !q || `${project.name} ${project.summary} ${project.owner} ${project.teams.join(" ")}`.toLowerCase().includes(q)), sort);
  const pages = Math.max(1, Math.ceil(found.length / pageSize));
  const current = Math.min(page, pages);
  const shown = found.slice((current - 1) * pageSize, current * pageSize);

  // Invite: one email field; a toast confirms it.
  const invite = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email }) => {
      const text = email.trim();
      if (!text) return { email: "Enter an email address" };
      return { email: emailPattern.test(text) ? undefined : "Enter a valid email address, like name@company.com" };
    },
    onSubmit: ({ email }, { reset }) => {
      setInviting(false);
      reset();
      toast({ type: "positive", title: `Invite sent to ${email.trim()}` });
    },
  });
  // New task: one name field; a toast confirms it.
  const newTask = useFormState<{ name: string }>({
    initialValues: { name: "" },
    validate: ({ name }) => ({ name: name.trim() ? undefined : "Enter a task name" }),
    onSubmit: ({ name }, { reset }) => {
      setCreating(false);
      reset();
      toast({ type: "positive", title: `“${name.trim()}” added to this week` });
    },
  });
  // Cancel, Escape and the scrim close a dialog and clear what was typed.
  const changeInviting = (next: boolean) => { setInviting(next); if (!next) invite.reset(); };
  const changeCreating = (next: boolean) => { setCreating(next); if (!next) newTask.reset(); };

  const columns: TableColumn<Project>[] = [
    { id: "project", header: "Project", cell: (row) => (
      <TableMedia bold caption={row.summary} media={<Avatar size="sm" shape="square" theme={row.theme} background="solid" alt="">{row.initials}</Avatar>}>{row.name}</TableMedia>
    ) },
    { id: "owner", header: "Owner", width: "240px", cell: (row) => <TableText>{row.owner}</TableText> },
    { id: "team", header: "Team", width: "220px", cell: (row) => (
      <TableBadges>{row.teams.map((team) => <Badge key={team} size="md" theme={teamTheme[team]} background="subtle" leadingIcon={false}>{team}</Badge>)}</TableBadges>
    ) },
    { id: "progress", header: "Progress", width: "200px", sortable: true, cell: (row) => (
      <ProgressBar theme="neutral" value={Math.round(ratio(row) * 100)} label={`${row.done}/${row.total}`} aria-label={`${row.name}: ${row.done} of ${row.total} tasks done`} />
    ) },
    { id: "due", header: "Due date", width: "160px", sortable: true, cell: (row) => <TableText>{formatDue(row.due)}</TableText> },
    { id: "more", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", width: "72px", cell: (row) => (
      <TableActions>
        <Menu align="end" trigger={<IconButton appearance="flat" level="primary" size="md" icon="icon-dots-vertical-line" aria-label={`More for ${row.name}`} />} items={[
          { id: "open", label: "Open project", icon: "icon-folder-line", onSelect: () => notHere("The project page") },
          { id: "share", label: "Copy link", icon: "icon-link-01-line", onSelect: () => toast({ title: "Link copied", children: row.name }) },
          { id: "archive", label: "Archive", icon: "icon-archive-line", onSelect: () => toast({ title: `${row.name} archived` }) },
        ]} />
      </TableActions>
    ) },
  ];

  return (
    <>
      {/* zen-allow-mixed-boxes: Figma A3 · Open (15904:6185) tints the KPI cards Pale and keeps the two lists bordered. */}
      <AppShell
        canvas="alt"
        // The trail starts with the workspace's Master crumb (its home icon): the toggle sits in the Sidebar's header.
        collapse="sidebar"
        // Figma A1–A4 (15904:1616 / 2813 / 6185 / 8996): Patterns/Sidebar and Header/AppShell both Density=Small.
        sidebar={(
          <Sidebar density="small" shadow={false} brand={brand} logoCollapsed={mark} sections={navSections} selectedId="overview"
            onItemClick={(item) => { if (item.id !== "overview") notHere(item.label); }}
            footer={<>
              <SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />
              <SidebarMenuItem id="help" label="Help center" icon="icon-help-circle-line" />
              <SidebarMenuItem id="feedback" label="Feedback" icon="icon-message-chat-circle-line" />
            </>} />
        )}
        header={(
          <AppShellHeader
            density="small"
            leading={<Breadcrumbs items={[{ id: "workspace", label: "Workspace" }, { id: "overview", label: "Overview" }]} onNavigate={(item, event) => { event.preventDefault(); notHere(String(item.label)); }} />}
            actions={<>
              <AppShellAction icon="icon-bell-01-solid" aria-label="Notifications" count={3} onClick={() => toast({ title: "3 notifications", children: "Lia, John and Paul wrote since Friday." })} />
              <Menu align="end" trigger={<AppShellAccount name={maya.name} src={maya.photo} />} items={[
                { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => notHere("Profile") },
                { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => notHere("Settings") },
                { type: "separator" },
                { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => notHere("Signing out") },
              ]} />
            </>}
            main={(
              <PageHeader title="Good evening, Maya" description="Sunday, Sep 22, 2024 · Week 39 starts tomorrow: 14 meetings, 23 tasks due"
                actions={<>
                  <Button level="tertiary" startIcon="icon-user-plus-line" onClick={() => setInviting(true)}>Invite</Button>
                  <Button level="primary" startIcon="icon-plus-line" onClick={() => setCreating(true)}>New task</Button>
                </>} />
            )}
          />
        )}
      >
        <Stack gap="xl">
          {/* KPIs: four peers, each tinted Pale in its family's hue. */}
          <Grid columns={kpiColumns} stackBelow={560} gap="md">
            {kpis.map((kpi) => (
              <MetricCard key={kpi.id} type="kpi" size="xl" theme="pale" color={kpi.hue}
                label={kpi.label} value={kpi.value} trend={kpi.trend} icon={kpi.icon} iconTheme={kpi.hue} iconBackground="solid" iconSize="lg"
                action={<IconButton appearance="main" level="tertiary" size="xs" icon="icon-chevron-right-line-small" aria-label={`Open ${kpi.label.toLowerCase()}`} onClick={() => toast({ title: `${kpi.label}: ${kpi.value}`, children: kpi.detail })} />} />
            ))}
          </Grid>

          {/* The week ahead: the calendar beside the inbox (Figma 808 + 400). */}
          <Grid columns="minmax(0, 1fr) 400px" stackBelow={880} gap="md">
            <ListBox as="section" theme="border" aria-labelledby={weekId}
              header={<Heading level={2} id={weekId} textStyle="Heading/Subheading">Coming up this week</Heading>}
              footer={<Button level="tertiary" onClick={() => notHere("Calendar")}>Open calendar</Button>}>
              <List aria-labelledby={weekId}>
                {meetings.map((meeting) => (
                  <ListItem key={meeting.id} title={meeting.title} caption={meeting.when}
                    trailing={<Badge size="md" theme={meeting.theme} background="subtle">{meeting.tag}</Badge>}
                    onClick={() => toast({ title: meeting.title, children: meeting.when })} />
                ))}
              </List>
            </ListBox>
            <ListBox as="section" theme="border" aria-labelledby={inboxId}
              header={<Heading level={2} id={inboxId} textStyle="Heading/Subheading">Inbox · 3 unread</Heading>}
              footer={<Button level="tertiary" onClick={() => notHere("Inbox")}>Go to Inbox</Button>}>
              <List aria-labelledby={inboxId}>
                {messages.map((message) => (
                  <ListItem key={message.id} title={message.from} caption={message.text}
                    leading={<Avatar size="md" theme={message.theme} background="solid" alt={message.from}>{message.initials}</Avatar>}
                    trailing={<Text as="span" textStyle="Caption/Regular" tone="light">{message.at}</Text>}
                    onClick={() => toast({ title: message.from, children: message.text })} />
                ))}
              </List>
            </ListBox>
          </Grid>

          {/* Projects: a toolbar, the table on the page (no box), the inline pagination. Its provider names what the
              Pagination counts. */}
          <ZenProvider labels={projectPagination} paint={false} portal={false}>
            <Stack as="section" gap="md" aria-labelledby={projectsId}>
              <DashboardHeader type="custom">
                <Stack direction="row" gap="md" align="center" width="fill">
                  <Stack direction="row" gap="xs" align="center" width="fill">
                    <Heading level={2} id={projectsId} textStyle="Heading/4">Projects</Heading>
                    <BadgeCounter size="sm" theme="neutral" background="subtle" value={projects.length} />
                  </Stack>
                  <Box width={240}>
                    <Search placeholder="Search projects" aria-label="Search projects" value={query} onValueChange={(value) => { setQuery(value); setPage(1); }} />
                  </Box>
                </Stack>
              </DashboardHeader>
              <Table aria-labelledby={projectsId} rows={shown} columns={columns} sort={sort} onSortChange={(next) => { setSort(next); setPage(1); }}
                empty={<EmptyState headingLevel={3} icon="icon-search-medium-line" title="No projects match" secondaryAction={{ label: "Show all projects", onClick: () => setQuery("") }}>Try a project, an owner or a team.</EmptyState>} />
              {found.length ? (
                <Pagination theme="inline" aria-label="Projects pages" page={current} onPageChange={setPage} pageSize={pageSize} total={found.length}
                  pageSizeOptions={[6, 12]} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
              ) : null}
            </Stack>
          </ZenProvider>
        </Stack>
      </AppShell>
      <ModalForm open={inviting} onOpenChange={changeInviting} title={`Invite to ${studio.name}`} onSubmit={invite.handleSubmit}
        primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email address" type="email" autoComplete="off" placeholder="name@company.com" data-autofocus="" {...invite.field("email")} />
      </ModalForm>
      <ModalForm open={creating} onOpenChange={changeCreating} title="New task" onSubmit={newTask.handleSubmit}
        primaryAction={{ label: "Add task" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Task name" type="text" autoComplete="off" placeholder="Review the onboarding copy" data-autofocus="" {...newTask.field("name")} />
      </ModalForm>
    </>
  );
}
