import { useId, useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, Badge, BadgeCounter, BarChart, Box, Breadcrumbs, Button, ChartCard, DashboardHeader,
  EmptyState, Grid, Heading, Icon, IconButton, LineChart, Menu, MetricCard, PageHeader, Pagination, ProgressBar, Search, Sidebar, SidebarMenuItem,
  Stack, Table, TableActions, TableBadges, TableMedia, TableText, Text, VisuallyHidden, ZenProvider, useToast, useZen,
  type AvatarTheme, type BadgeTheme, type IconName, type MetricTrendDirection, type SidebarSection, type TableColumn, type TableSort,
} from "@zen-ds/react";
import { people, studio } from "../../data";

const maya = { name: "Maya Chen", photo: people.ava.photo };
/* The workspace's mark and name (Figma Header-Content: an Avatar Small square, Body/Extra/Bold, the switcher chevron);
   the collapsed rail keeps the mark: Figma's Avatar/Single 32 in the 64px Border rail. */
const brand = (
  <Stack direction="row" gap="xs" align="center">
    <Avatar size="sm" shape="square" theme="photo" src={studio.logo} alt="" />
    <Stack direction="row" gap="3xs" align="center">
      <Text as="span" textStyle="Body/Extra/Bold">{studio.name}</Text>
      <Icon name="icon-chevron-down-line" decorative />
    </Stack>
  </Stack>
);
const railMark = <Avatar size="sm" shape="square" theme="photo" src={studio.logo} alt={studio.name} />;
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
const kpis: Kpi[] = [
  { id: "time", label: "Avg time worked", value: "7h 34m", trend: { direction: "positive", label: "1.2%", subLabel: "vs. last week" }, icon: "icon-clock-line", hue: "violet", detail: "Per member per day, Mon – Fri." },
  { id: "activity", label: "Team activity", value: "56%", trend: { direction: "negative", label: "4%", subLabel: "vs. last week" }, icon: "icon-activity-line", hue: "orange", detail: "Tracked time with keyboard or mouse activity." },
  { id: "earned", label: "Earned this week", value: "$8,562", trend: { direction: "positive", label: "12.4%", subLabel: "vs. last week" }, icon: "icon-coins-stacked-01-line", hue: "green", detail: "Billable hours at each member's rate." },
  { id: "projects", label: "Projects worked", value: "12", trend: { direction: "normal", label: "2", subLabel: "new this week" }, icon: "icon-folder-line", hue: "blue", detail: "Onboarding v2 and Partner portal started this week." },
];
const weeks = ["Aug 5", "Aug 12", "Aug 19", "Aug 26", "Sep 2", "Sep 9", "Sep 16"];
const hoursRanges = [{ id: "quarterly", label: "Quarterly" }, { id: "monthly", label: "Monthly" }, { id: "weekly", label: "Weekly" }];
const hoursBy: Record<string, { team: number[]; company: number[]; labels: string[]; value: string }> = {
  weekly: { labels: weeks, team: [36.5, 37.2, 35.8, 38.4, 36.9, 37.1, 37.8], company: [32.6, 33.1, 31.9, 33.4, 32.2, 32.8, 32.4], value: "37h 50m this week" },
  monthly: { labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], team: [148, 152, 146, 139, 150, 155], company: [134, 137, 131, 128, 136, 139], value: "155h this month" },
  quarterly: { labels: ["Q4 '23", "Q1 '24", "Q2 '24", "Q3 '24"], team: [448, 462, 446, 452], company: [402, 410, 398, 404], value: "452h this quarter" },
};
/** Sales team this week, highest first: 647 leads. */
const leads = [
  { label: "Paul", value: 98 }, { label: "Alex", value: 94 }, { label: "Sam", value: 88 }, { label: "Andy", value: 84 },
  { label: "Jany", value: 79 }, { label: "Sarah", value: 72 }, { label: "Mike", value: 70 }, { label: "Lisa", value: 62 },
];

type Team = "Design" | "Product" | "Dev" | "Sales" | "Operations";
const teamTheme: Record<Team, BadgeTheme> = { Design: "violet", Product: "plum", Dev: "blue", Sales: "teal", Operations: "neutral" };
type Member = { id: string; name: string; email: string; initials: string; theme: AvatarTheme; role: string; teams: Team[]; done: number; total: number; active: Date };
/** Figma's six rows, then the rest of the team on page two. */
const members: Member[] = [
  { id: "alice", name: "Alice Padilla", email: "alice.padilla@example.com", initials: "AP", theme: "pink", role: "Lead Product Designer", teams: ["Design", "Operations"], done: 16, total: 21, active: new Date(2024, 8, 22) },
  { id: "lia", name: "Lia Campbell", email: "lia.campbell@example.com", initials: "LC", theme: "violet", role: "Senior React Native Developer", teams: ["Product", "Dev"], done: 10, total: 12, active: new Date(2024, 8, 22) },
  { id: "john", name: "John McLeod", email: "john.mcleod@example.com", initials: "JM", theme: "blue", role: "Lead Sales Manager", teams: ["Sales", "Operations"], done: 13, total: 20, active: new Date(2024, 8, 21) },
  { id: "paul", name: "Paul Rivera", email: "paul.rivera@example.com", initials: "PR", theme: "teal", role: "Sales Executive", teams: ["Sales"], done: 19, total: 22, active: new Date(2024, 8, 21) },
  { id: "sarah", name: "Sarah Kim", email: "sarah.kim@example.com", initials: "SK", theme: "orange", role: "Account Executive", teams: ["Sales"], done: 8, total: 16, active: new Date(2024, 8, 20) },
  { id: "lisa", name: "Lisa Wong", email: "lisa.wong@example.com", initials: "LW", theme: "green", role: "Sales Development Rep", teams: ["Sales"], done: 4, total: 15, active: new Date(2024, 8, 18) },
  { id: "maya", name: "Maya Chen", email: "maya.chen@example.com", initials: "MC", theme: "cyan", role: "Design Director", teams: ["Design"], done: 8, total: 16, active: new Date(2024, 8, 22) },
  { id: "sam", name: "Sam Okafor", email: "sam.okafor@example.com", initials: "SO", theme: "indigo", role: "Sales Executive", teams: ["Sales"], done: 12, total: 14, active: new Date(2024, 8, 20) },
  { id: "andy", name: "Andy Tran", email: "andy.tran@example.com", initials: "AT", theme: "crimson", role: "Backend Developer", teams: ["Dev"], done: 9, total: 13, active: new Date(2024, 8, 19) },
  { id: "jany", name: "Jany Nguyen", email: "jany.nguyen@example.com", initials: "JN", theme: "plum", role: "Product Manager", teams: ["Product"], done: 11, total: 15, active: new Date(2024, 8, 22) },
  { id: "mike", name: "Mike Novak", email: "mike.novak@example.com", initials: "MN", theme: "brown", role: "Operations Lead", teams: ["Operations"], done: 6, total: 9, active: new Date(2024, 8, 17) },
  { id: "alex", name: "Alex Duong", email: "alex.duong@example.com", initials: "AD", theme: "purple", role: "Frontend Developer", teams: ["Dev", "Design"], done: 14, total: 18, active: new Date(2024, 8, 22) },
];
const formatDay = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const ratio = (member: Member) => member.done / member.total;
function sortMembers(rows: Member[], sort: TableSort | null) {
  if (!sort) return rows;
  const key = sort.columnId === "progress" ? ratio : (member: Member) => +member.active;
  const sign = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => (key(a) - key(b)) * sign);
}
/** The Pagination names what it counts: "6 per page", "1 – 6 of 12 members". */
const memberPagination = {
  results: (count: number) => `${count} per page`,
  resultsRange: (first: number, last: number, total: number) => `${first} – ${last} of ${total} ${total === 1 ? "member" : "members"}`,
};

/**
 * Đìzai Studio's Team performance in Layout=Grid (Figma ◇ Master-Layout G1): the shell drawn in lines (the Sidebar
 * Theme=Border · Density=Small, the header Theme=Border & Divider · Density=Small, the pattern's defaults); every box
 * is a Flat Card on the grey Canvas.
 */
// narrowKpis: the four KPI cards need about 1,040px beside the Sidebar to keep each value on one line (Figma: 294 each
// at 1,224); narrower, they take two columns. Pass whether the page's column is narrower than that; without it the
// cards follow the breakpoint.
export default function TeamPerformance({ narrowKpis }: { narrowKpis?: boolean }) {
  const { toast } = useToast();
  const breakpoint = useZen()?.breakpoint;
  const id = useId();
  const membersId = `${id}-members`;
  const [range, setRange] = useState("weekly");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<TableSort | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const kpiColumns = (narrowKpis ?? (breakpoint === "tablet" || breakpoint === "mobile")) ? 2 : 4;
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "Team performance shows the Grid pattern." });
  const hours = hoursBy[range];
  const q = query.trim().toLowerCase();
  const found = sortMembers(members.filter((member) => !q || `${member.name} ${member.email} ${member.role} ${member.teams.join(" ")}`.toLowerCase().includes(q)), sort);
  const current = Math.min(page, Math.max(1, Math.ceil(found.length / pageSize)));
  const shown = found.slice((current - 1) * pageSize, current * pageSize);

  const columns: TableColumn<Member>[] = [
    { id: "member", header: "Member", cell: (row) => (
      <TableMedia bold caption={row.email} media={<Avatar size="sm" theme={row.theme} background="solid" alt="">{row.initials}</Avatar>}>{row.name}</TableMedia>
    ) },
    { id: "role", header: "Role", width: "240px", cell: (row) => <TableText>{row.role}</TableText> },
    { id: "team", header: "Team", width: "220px", cell: (row) => (
      <TableBadges>{row.teams.map((team) => <Badge key={team} size="md" theme={teamTheme[team]} background="subtle" leadingIcon={false}>{team}</Badge>)}</TableBadges>
    ) },
    { id: "progress", header: "Task progress", width: "200px", sortable: true, cell: (row) => (
      <ProgressBar theme="neutral" value={Math.round(ratio(row) * 100)} label={`${row.done}/${row.total}`} aria-label={`${row.name}: ${row.done} of ${row.total} tasks done`} />
    ) },
    { id: "active", header: "Last active", width: "160px", sortable: true, cell: (row) => <TableText>{formatDay(row.active)}</TableText> },
    { id: "more", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", width: "72px", cell: (row) => (
      <TableActions>
        <Menu align="end" trigger={<IconButton appearance="flat" level="primary" size="md" icon="icon-dots-vertical-line" aria-label={`More for ${row.name}`} />} items={[
          { id: "profile", label: "Open profile", icon: "icon-user-circle-line", onSelect: () => notHere("The member's profile") },
          { id: "message", label: "Send a message", icon: "icon-message-chat-circle-line", onSelect: () => toast({ title: `Message to ${row.name}`, children: "Opens in Inbox." }) },
          { id: "timesheet", label: "View timesheet", icon: "icon-clock-line", onSelect: () => toast({ title: `${row.name}'s timesheet`, children: "Week 38 · Sep 16 – 22" }) },
        ]} />
      </TableActions>
    ) },
  ];

  return (
    <AppShell pattern="grid"
      sidebar={(
        <Sidebar brand={brand} logoCollapsed={railMark} sections={navSections} selectedId="performance"
          onItemClick={(item) => { if (item.id !== "performance") notHere(item.label); }}
          footer={<>
            <SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />
            <SidebarMenuItem id="help" label="Help center" icon="icon-help-circle-line" />
          </>} />
      )}
      header={(
        <AppShellHeader
          leading={<Breadcrumbs items={[{ id: "insights", label: "Insights" }, { id: "performance", label: "Team performance" }]} onNavigate={(item, event) => { event.preventDefault(); notHere(String(item.label)); }} />}
          actions={<>
            <AppShellAction icon="icon-bell-01-solid" aria-label="Notifications" count={3} onClick={() => toast({ title: "3 notifications", children: "Lia, John and Paul wrote since Friday." })} />
            <Menu align="end" trigger={<AppShellAccount name={maya.name} src={maya.photo} />} items={[
              { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => notHere("Profile") },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => notHere("Signing out") },
            ]} />
          </>}
          main={(
            <PageHeader title="Team performance" description={`Week 38 · Sep 16 – 22, 2024 · ${members.length} members across 5 teams`}
              actions={<>
                <Button level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Report exported", children: "team-performance-week-38.csv" })}>Export</Button>
                <Button level="primary" startIcon="icon-user-plus-line" onClick={() => toast({ title: "Invite a member", children: "They join the team you pick." })}>Add member</Button>
              </>} />
          )}
        />
      )}
    >
      <Stack gap="xl">
        <Stack gap="md">
          <Grid columns={kpiColumns} stackBelow={560} gap="md">
            {kpis.map((kpi) => (
              <MetricCard key={kpi.id} type="kpi" size="xl" theme="default" label={kpi.label} value={kpi.value} trend={kpi.trend}
                icon={kpi.icon} iconTheme={kpi.hue} iconBackground="solid" iconSize="lg"
                action={<IconButton appearance="main" level="tertiary" size="xs" icon="icon-chevron-right-line-small" aria-label={`Open ${kpi.label.toLowerCase()}`} onClick={() => toast({ title: `${kpi.label}: ${kpi.value}`, children: kpi.detail })} />} />
            ))}
          </Grid>
          <Grid columns={2} stackBelow={880} gap="md">
            <ChartCard headingLevel={2} title="Time worked" metricLabel="Hours per member per week, last 7 weeks" value={hours.value}
              ranges={hoursRanges} range={range} onRangeChange={setRange}>
              <LineChart key={range} aria-label={`Hours worked per member, ${range}: this team and the company average`} height={240} label="This team" legendPosition="top"
                data={hours.labels.map((label, index) => ({ label, value: hours.team[index] }))} compare={{ label: "Company average", values: hours.company }}
                format={(value) => `${Math.round(value)}h`} />
            </ChartCard>
            <ChartCard headingLevel={2} title="Leads by salesperson" metricLabel="Sales team this week, highest first" value="647 leads">
              <BarChart aria-label="Leads per salesperson this week, highest first" height={240} data={leads} format={(value) => String(value)} />
            </ChartCard>
          </Grid>
        </Stack>

        {/* Members: the toolbar, the table on the page (no box), the inline pagination. */}
        <ZenProvider labels={memberPagination} paint={false} portal={false}>
          <Stack as="section" gap="md" aria-labelledby={membersId}>
            <DashboardHeader type="custom">
              <Stack direction="row" gap="md" align="center" width="fill">
                <Stack direction="row" gap="xs" align="center" width="fill">
                  <Heading level={2} id={membersId} textStyle="Heading/4">Members</Heading>
                  <BadgeCounter size="sm" theme="neutral" background="subtle" value={members.length} />
                </Stack>
                <Box width={240}>
                  <Search placeholder="Search members" aria-label="Search members" value={query} onValueChange={(value) => { setQuery(value); setPage(1); }} />
                </Box>
              </Stack>
            </DashboardHeader>
            <Table aria-labelledby={membersId} rows={shown} columns={columns} sort={sort} onSortChange={(next) => { setSort(next); setPage(1); }}
              empty={<EmptyState headingLevel={3} icon="icon-search-medium-line" title="No members match" secondaryAction={{ label: "Show all members", onClick: () => setQuery("") }}>Try a name, a role or a team.</EmptyState>} />
            {found.length ? <Pagination theme="inline" aria-label="Members pages" page={current} onPageChange={setPage} pageSize={pageSize} total={found.length}
              pageSizeOptions={[6, 12]} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /> : null}
          </Stack>
        </ZenProvider>
      </Stack>
    </AppShell>
  );
}
