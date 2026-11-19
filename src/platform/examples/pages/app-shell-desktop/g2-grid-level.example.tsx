import { useId, useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, Badge, Box, Breadcrumbs, Button, Chip, DashboardHeader, DockIcon, EmptyState, Grid,
  Heading, Icon, Menu, MetricCard, PageHeader, Search, Sidebar, SidebarSubHeader, Stack, Table, TableBadges, TableMedia, TableText, Text,
  VisuallyHidden, useToast,
  type BadgeTheme, type SidebarSection, type TableColumn,
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

/**
 * The Time off level of an HR app in Layout=Grid (Figma ◇ Master-Layout G2): while the Sidebar shows a level inside the
 * app, its sub-header (back control over the level's title) leads the rows. Back returns to the main menu, where Time
 * off leads into the level again.
 */
export default function TimeOff() {
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
    { id: "type", header: "Type", cell: (row) => <TableMedia bold media={<DockIcon theme="emoji" emoji={leaveKinds[row.kind].emoji} size="md" />}>{leaveKinds[row.kind].name}</TableMedia> },
    { id: "submitted", header: "Submitted on", width: "180px", cell: (row) => <TableText>{row.submitted}</TableText> },
    { id: "dates", header: "From – to", width: "240px", cell: (row) => <TableText>{row.dates}</TableText> },
    { id: "total", header: "Total", width: "120px", align: "right", cell: (row) => <TableText>{`${row.days} days`}</TableText> },
    { id: "status", header: "Status", width: "140px", cell: (row) => <TableBadges><Badge theme={leaveTheme[row.status]} background="subtle">{row.status}</Badge></TableBadges> },
  ];

  return (
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
  );
}
