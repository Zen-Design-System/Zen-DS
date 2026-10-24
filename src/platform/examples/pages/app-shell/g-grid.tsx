/* App Shell examples · g-grid: Figma ◇ Master-Layout's Layout=Grid (Pattern/AppShell/Desktop, 16258:1857), added by the
   user on 2026-10-21 with its Rule (16823:85229: "Nếu dùng Theme grid thì ưu tiên các Box, Card Flat, Chỉ dùng Subtle
   cho các metric card để nhấn"). G1 is the Rule's demo (16817:58511): Đìzai Studio's Team performance. G2 is the
   Example for Subheader-sidebar (16823:89311): the Time off level of an HR app, with Primitives/Sub-Header-Sidebar at
   the top of the Sidebar. Both draw the shell in lines: Patterns/Sidebar Theme=Border · Density=Small and Header/AppShell
   Theme=Border & Divider · Density=Small (the pattern's defaults); every box is a Flat Card on the grey Canvas. */
import { useId, useMemo, useState } from "react";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader } from "../../../../components/AppShell";
import { Avatar, type AvatarTheme } from "../../../../components/Avatar";
import { Badge, BadgeCounter, type BadgeTheme } from "../../../../components/Badge";
import { Breadcrumbs } from "../../../../components/Breadcrumbs";
import { Button, IconButton } from "../../../../components/Button";
import { BarChart, ChartCard, LineChart } from "../../../../components/Chart";
import { Chip } from "../../../../components/Chip";
import { DashboardHeader } from "../../../../components/DashboardHeader";
import { EmptyState } from "../../../../components/EmptyState";
import { type IconName } from "../../../../components/Icon";
import { Box, Grid, Stack } from "../../../../components/Layout";
import { Menu } from "../../../../components/Menu";
import { MetricCard, type MetricTrendDirection } from "../../../../components/MetricWidget";
import { PageHeader } from "../../../../components/PageHeader";
import { Pagination } from "../../../../components/Pagination";
import { ProgressBar } from "../../../../components/Progress";
import { ZenProvider } from "../../../../components/Provider";
import { Search } from "../../../../components/Search";
import { Sidebar, SidebarMenuItem, SidebarSubHeader, type SidebarSection } from "../../../../components/Sidebar";
import { Table, TableActions, TableBadges, TableMedia, TableText, type TableColumn, type TableSort } from "../../../../components/Table";
import { Heading } from "../../../../components/Text";
import { useToast } from "../../../../components/Toast";
import { VisuallyHidden } from "../../../../components/VisuallyHidden";
import { DockIcon } from "../../../../components/DockIcon";
import { PreviewAppFrame } from "../../../PlatformFrames";
import { studio } from "../../data";
import type { ExampleDef } from "../../types";
import { brand, maya, navSections, useWidth } from "./a-compositions";

/** The rail keeps the workspace's mark: Figma's Avatar/Single 32 in the 64px Border rail. */
const railMark = <Avatar size="sm" shape="square" theme="photo" src={studio.logo} alt={studio.name} />;

// ——— G1 · Team performance (16817:58511) ————————————————————————————————————————————————————————————————————
type Kpi = { id: string; label: string; value: string; trend: { direction: MetricTrendDirection; label: string }; icon: IconName; hue: "orange" | "blue" | "violet" | "green"; detail: string };
const kpis: Kpi[] = [
  { id: "time", label: "Avg time worked", value: "7h 34m", trend: { direction: "positive", label: "+1.2% vs. last week" }, icon: "icon-clock-line", hue: "violet", detail: "Per member per day, Mon – Fri." },
  { id: "activity", label: "Team activity", value: "56%", trend: { direction: "negative", label: "−4% vs. last week" }, icon: "icon-activity-line", hue: "orange", detail: "Tracked time with keyboard or mouse activity." },
  { id: "earned", label: "Earned this week", value: "$8,562", trend: { direction: "positive", label: "+12.4% vs. last week" }, icon: "icon-coins-stacked-01-line", hue: "green", detail: "Billable hours at each member's rate." },
  { id: "projects", label: "Projects worked", value: "12", trend: { direction: "normal", label: "2 new this week" }, icon: "icon-folder-line", hue: "blue", detail: "Onboarding v2 and Partner portal started this week." },
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
const memberPagination = {
  results: (count: number) => `${count} per page`,
  resultsRange: (first: number, last: number, total: number) => `${first} – ${last} of ${total} ${total === 1 ? "member" : "members"}`,
};

function TeamPerformance() {
  const { toast } = useToast();
  const id = useId();
  const membersId = `${id}-members`;
  const [range, setRange] = useState("weekly");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<TableSort | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [measure, width] = useWidth();
  // Four KPI cards need about 1,040px to keep each value on one line (Figma: 294 each at 1,224), as A1–A4 do.
  const kpiColumns = width > 0 && width < 1040 ? 2 : 4;
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "Team performance shows the Grid pattern." });
  const hours = hoursBy[range];
  const q = query.trim().toLowerCase();
  const found = useMemo(() => sortMembers(members.filter((member) => !q || `${member.name} ${member.email} ${member.role} ${member.teams.join(" ")}`.toLowerCase().includes(q)), sort), [q, sort]);
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
    <PreviewAppFrame>
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
        <Stack gap="xl" ref={measure}>
          <Stack gap="md">
            <Grid columns={kpiColumns} stackBelow={560} gap="md">
              {kpis.map((kpi) => (
                <MetricCard key={kpi.id} type="kpi" size="xl" theme="default" label={kpi.label} value={kpi.value} trend={kpi.trend}
                  icon={kpi.icon} iconTheme={kpi.hue} iconBackground="solid" iconSize="lg"
                  action={<IconButton appearance="main" level="tertiary" size="xs" icon="icon-chevron-right-line-small" aria-label={`Open ${kpi.label.toLowerCase()}`} onClick={() => toast({ title: `${kpi.label}: ${kpi.value}`, children: kpi.detail })} />} />
              ))}
            </Grid>
            <Grid columns={2} stackBelow={880} gap="md">
              <ChartCard headingLevel={2} title="Time worked" description="Hours per member per week, last 7 weeks" value={hours.value}
                ranges={hoursRanges} range={range} onRangeChange={setRange}>
                <LineChart key={range} aria-label={`Hours worked per member, ${range}: this team and the company average`} height={240} label="This team" legendPosition="top"
                  data={hours.labels.map((label, index) => ({ label, value: hours.team[index] }))} compare={{ label: "Company average", values: hours.company }}
                  format={(value) => `${Math.round(value)}h`} />
              </ChartCard>
              <ChartCard headingLevel={2} title="Leads by salesperson" description="Sales team this week, highest first" value="647 leads">
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
    </PreviewAppFrame>
  );
}

// ——— G2 · Time off, a level inside the app (16823:89311) ——————————————————————————————————————————————————————
const rootSections: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "time-off", label: "Time off", icon: "icon-calendar-line" },
  { id: "expenses", label: "Expenses", icon: "icon-receipt-line" },
  { id: "people", label: "People", icon: "icon-users-line" },
  { id: "payroll", label: "Payroll", icon: "icon-coins-stacked-01-line" },
] }];
const timeOffSections: SidebarSection[] = [{ items: [
  { id: "my-leaves", label: "My leaves", icon: "icon-calendar-check-line" },
  { id: "approvals", label: "Approvals", icon: "icon-check-square-line", counter: 4 },
  { id: "calendar", label: "Calendar", icon: "icon-calendar-line" },
  { id: "workflow", label: "Workflow", icon: "icon-dataflow-03-line" },
  { id: "configurations", label: "Configurations", icon: "icon-settings-01-line" },
] }];

type LeaveKind = "annual" | "sick" | "unpaid";
const leaveKinds: Record<LeaveKind, { name: string; emoji: string; left: string }> = {
  annual: { name: "Annual leave", emoji: "🏝️", left: "15" },
  sick: { name: "Sick leave", emoji: "🤒", left: "12" },
  unpaid: { name: "Unpaid leave", emoji: "🥵", left: "5" },
};
type LeaveStatus = "Pending" | "Approved" | "Rejected";
const leaveTheme: Record<LeaveStatus, BadgeTheme> = { Pending: "yellow", Approved: "green", Rejected: "red" };
type Leave = { id: string; kind: LeaveKind; submitted: string; dates: string; days: number; status: LeaveStatus };
/** Figma's rows: submitted from May 2025 to March 2026. */
const leaves: Leave[] = [
  { id: "l9", kind: "annual", submitted: "Mar 2, 2026", dates: "Mar 12 – Mar 13, 2026", days: 2, status: "Pending" },
  { id: "l8", kind: "sick", submitted: "Feb 28, 2026", dates: "Mar 2 – Mar 3, 2026", days: 2, status: "Approved" },
  { id: "l7", kind: "unpaid", submitted: "Feb 18, 2026", dates: "Mar 15 – Mar 16, 2026", days: 2, status: "Rejected" },
  { id: "l6", kind: "annual", submitted: "Jan 30, 2026", dates: "Apr 1 – Apr 2, 2026", days: 2, status: "Approved" },
  { id: "l5", kind: "annual", submitted: "Jan 13, 2026", dates: "Apr 5 – Apr 6, 2026", days: 2, status: "Approved" },
  { id: "l4", kind: "sick", submitted: "Jan 1, 2026", dates: "Jan 1 – Jan 2, 2026", days: 2, status: "Approved" },
  { id: "l3", kind: "annual", submitted: "Dec 14, 2025", dates: "Apr 10 – Apr 11, 2026", days: 2, status: "Pending" },
  { id: "l2", kind: "unpaid", submitted: "Nov 11, 2025", dates: "Dec 22 – Dec 23, 2025", days: 2, status: "Approved" },
  { id: "l1", kind: "annual", submitted: "May 25, 2025", dates: "Jun 9 – Jun 10, 2025", days: 2, status: "Approved" },
];
const statusOptions = [{ id: "all", label: "All statuses" }, { id: "Pending", label: "Pending" }, { id: "Approved", label: "Approved" }, { id: "Rejected", label: "Rejected" }];

function TimeOff() {
  const { toast } = useToast();
  const id = useId();
  const requestsId = `${id}-requests`;
  const [level, setLevel] = useState<"root" | "time-off">("time-off");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "My leaves shows the Sidebar's sub-level." });
  const q = query.trim().toLowerCase();
  const shown = leaves.filter((leave) => (status === "all" || leave.status === status) && (!q || `${leaveKinds[leave.kind].name} ${leave.dates} ${leave.status}`.toLowerCase().includes(q)));

  const columns: TableColumn<Leave>[] = [
    { id: "type", header: "Type", cell: (row) => <TableMedia bold media={<DockIcon theme="emoji" emoji={leaveKinds[row.kind].emoji} size="xsmall" />}>{leaveKinds[row.kind].name}</TableMedia> },
    { id: "submitted", header: "Submitted on", width: "180px", cell: (row) => <TableText>{row.submitted}</TableText> },
    { id: "dates", header: "From – to", width: "240px", cell: (row) => <TableText>{row.dates}</TableText> },
    { id: "total", header: "Total", width: "120px", align: "right", cell: (row) => <TableText>{`${row.days} days`}</TableText> },
    { id: "status", header: "Status", width: "140px", cell: (row) => <TableBadges><Badge theme={leaveTheme[row.status]} background="subtle">{row.status}</Badge></TableBadges> },
  ];

  return (
    <PreviewAppFrame>
      <AppShell pattern="grid"
        sidebar={level === "time-off" ? (
          <Sidebar brand={brand} logoCollapsed={railMark} sections={timeOffSections} selectedId="my-leaves"
            subHeader={<SidebarSubHeader title="Time off" backLabel="Back to the main menu" onBack={() => setLevel("root")} />}
            onItemClick={(item) => { if (item.id !== "my-leaves") notHere(item.label); }} />
        ) : (
          <Sidebar brand={brand} logoCollapsed={railMark} sections={rootSections} selectedId="time-off"
            onItemClick={(item) => { if (item.id === "time-off") setLevel("time-off"); else notHere(item.label); }} />
        )}
        header={(
          <AppShellHeader
            leading={<Breadcrumbs items={[{ id: "home", label: "Home" }, { id: "time-off", label: "Time off" }, { id: "my-leaves", label: "My leaves" }]}
              onNavigate={(item, event) => { event.preventDefault(); if (item.id === "home") setLevel("root"); else if (item.id === "time-off") setLevel("time-off"); }} />}
            actions={<>
              <Badge theme="violet" background="subtle" leadingIcon={false}>Pro</Badge>
              <AppShellAction icon="icon-bell-01-solid" aria-label="Notifications" count={12} onClick={() => toast({ title: "12 notifications", children: "4 leave requests wait for your approval." })} />
              <Menu align="end" trigger={<AppShellAccount name={maya.name} src={maya.photo} />} items={[
                { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => notHere("Profile") },
                { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => notHere("Signing out") },
              ]} />
            </>}
            main={<PageHeader title="My leaves" actions={<Button level="primary" startIcon="icon-plus-line" onClick={() => toast({ title: "New leave request", children: "Pick the type and the days; your lead approves it." })}>Submit leave</Button>} />}
          />
        )}
      >
        <Stack gap="xl">
          <Grid columns={3} stackBelow={720} gap="md">
            {(Object.keys(leaveKinds) as LeaveKind[]).map((kind) => (
              <MetricCard key={kind} type="kpi" size="xl" label={leaveKinds[kind].name} value={leaveKinds[kind].left} iconEmoji={leaveKinds[kind].emoji} iconSize="lg"
                trend={{ direction: "normal", label: "days left this year" }} />
            ))}
          </Grid>
          <Stack as="section" gap="md" aria-labelledby={requestsId}>
            {/* Figma's toolbar has no title: the section's heading is for screen readers only. */}
            <VisuallyHidden><Heading level={2} id={requestsId}>Leave requests</Heading></VisuallyHidden>
            <DashboardHeader type="custom">
              <Stack direction="row" gap="md" align="center" justify="between" width="fill" wrap>
                <Stack direction="row" gap="xs" align="center">
                  <Box width={240}><Search placeholder="Search" aria-label="Search leave requests" value={query} onValueChange={setQuery} /></Box>
                  <Chip variant="advanced" popoverLabel="Status" popoverItems={statusOptions.map((option) => ({ ...option, selected: option.id === status }))} onPopoverSelect={(item) => setStatus(item.id)}>
                    {statusOptions.find((option) => option.id === status)!.label}
                  </Chip>
                </Stack>
                <Button level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Report exported", children: "my-leaves-2026.csv" })}>Export report</Button>
              </Stack>
            </DashboardHeader>
            <Table aria-labelledby={requestsId} rows={shown} columns={columns}
              empty={<EmptyState headingLevel={3} icon="icon-search-medium-line" title="No requests match" secondaryAction={{ label: "Show all requests", onClick: () => { setQuery(""); setStatus("all"); } }}>Try another type, date or status.</EmptyState>} />
          </Stack>
        </Stack>
      </AppShell>
    </PreviewAppFrame>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "G1 · Grid",
    description: "Layout=Grid draws the Sidebar workspace in lines instead of surfaces: the Sidebar sits flush on the grey Canvas with a Pale line on its edge and 36px rows (Theme=Border, Density=Small), and the header's top row has a Pale line under it (Theme=Border & Divider). The boxes are Flat Cards and the table sits on the page; keep Subtle for a metric card that should stand out. Shell: AppShell/Desktop · Layout=Grid · Collapse=Header. Fits: Team analytics, HR, Ops, Admin.",
    wide: true,
    screen: true,
    render: () => <TeamPerformance />,
    code: `<AppShell pattern="grid" {/* the Sidebar takes theme="border" density="small", the header theme="border-divider" density="small" */}
  sidebar={<Sidebar brand={brand} logoCollapsed={mark} sections={nav} selectedId="performance" footer={…} />}
  header={<AppShellHeader leading={<Breadcrumbs items={trail} />} actions={…}
    main={<PageHeader title="Team performance" description="Week 38 · Sep 16 – 22, 2024" actions={…} />} />}>
  <Stack gap="xl">
    <Stack gap="md">
      <Grid columns={4} gap="md">{kpis.map((kpi) => <MetricCard type="kpi" size="xl" theme="default" … />)}</Grid> {/* no shadow, as the charts */}
      <Grid columns={2} gap="md">
        <ChartCard title="Time worked" ranges={ranges} range={range} onRangeChange={setRange}><LineChart … /></ChartCard>
        <ChartCard title="Leads by salesperson" value="647 leads"><BarChart aria-label="Leads per salesperson this week" data={leads} /></ChartCard>
      </Grid>
    </Stack>
    <Stack as="section" gap="md">{/* Members toolbar · Table · Pagination theme="inline" */}</Stack>
  </Stack>
</AppShell>`,
  },
  {
    title: "G2 · Grid, a level inside the app",
    description: "While the Sidebar shows a level inside the app, a Sidebar sub-header leads its rows: the back control over the level's title (Primitives/Sub-Header-Sidebar, Density=Small in the Grid). Back returns to the app's main menu, where Time off leads into the level again; the breadcrumb's Home and Time off do the same. The page keeps the Grid's Flat metric cards and the table on the Canvas. Shell: AppShell/Desktop · Layout=Grid. Fits: HR, Projects inside a workspace, Settings areas.",
    wide: true,
    screen: true,
    render: () => <TimeOff />,
    code: `const [level, setLevel] = useState<"root" | "time-off">("time-off");

<AppShell pattern="grid"
  sidebar={level === "time-off"
    ? <Sidebar sections={timeOff} selectedId="my-leaves"
        subHeader={<SidebarSubHeader title="Time off" backLabel="Back to the main menu" onBack={() => setLevel("root")} />} />
    : <Sidebar sections={main} selectedId="time-off" onItemClick={(item) => item.id === "time-off" && setLevel("time-off")} />}
  header={<AppShellHeader leading={<Breadcrumbs items={[home, timeOff, myLeaves]} />} actions={…}
    main={<PageHeader title="My leaves" actions={<Button level="primary">Submit leave</Button>} />} />}>
  <Grid columns={3} gap="md">{kinds.map((kind) => <MetricCard type="kpi" label={kind.name} value={kind.left} iconEmoji={kind.emoji} />)}</Grid>
  <Table aria-label="Leave requests" rows={requests} columns={columns} />
</AppShell>`,
  },
];
