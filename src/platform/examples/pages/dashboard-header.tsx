/* Dashboard Header examples (Figma ◇ Master-Layout, Primitives/Dashboard/Header 4122:33402). Đìzai Studio, signed in as
   Alex Duong, Wednesday Sep 30, 2026. The rows a dashboard page's header is built from: the control bar over the leave
   requests table (Search, filter Chips, the count, the actions), the navigation bar, the rows inside an AppShell (Figma
   Header/Dashboard), a row of your own and a narrow column. Phones name their screens with the Top Navigation and filter
   in one scrolling Chip row instead (see Top navigation and Chip › Mobile filter row). */
import { useEffect, useState } from "react";
import { AppShell, AppShellAccount, AppShellAction } from "../../../components/AppShell";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { Button } from "../../../components/Button";
import { Chip } from "../../../components/Chip";
import { DashboardHeader } from "../../../components/DashboardHeader";
import { EmptyState } from "../../../components/EmptyState";
import { Icon } from "../../../components/Icon";
import { Box, Container, Stack } from "../../../components/Layout";
import { Menu, type MenuItemData } from "../../../components/Menu";
import { Search } from "../../../components/Search";
import { Segmented } from "../../../components/Segmented";
import { Sidebar } from "../../../components/Sidebar";
import { Table, TableMedia, TableText, type TableColumn } from "../../../components/Table";
import { Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { keepOnHotUpdate } from "../../hotData";
import type { PlatformPage } from "../../PlatformExamples";
import { figmaSidebarBrand } from "../../PlatformSidebarBrand";
import { formatRange, leaveRequests, leaveStatusTheme, people, type LeaveKind, type LeaveRequest, type LeaveStatus } from "../data";
import type { ExampleDef } from "../types";
import "./dashboard-header.css";

export const page: PlatformPage = "dashboard-header";

const statuses: LeaveStatus[] = ["Pending", "Approved", "Declined"];
const kinds: LeaveKind[] = ["Annual leave", "Sick leave", "Unpaid leave"];

/** A filter Chip: Chip Advanced whose Popover picks one value; picked again (or cleared) it shows every row. */
function FilterChip<T extends string>({ label, options, value, onChange }: { label: string; options: T[]; value: T | null; onChange: (next: T | null) => void }) {
  return (
    <Chip variant="advanced" dropdown selected={value !== null} popoverLabel={label}
      popoverItems={options.map((option) => ({ id: option, label: option, selected: value === option }))}
      onPopoverSelect={(item) => onChange(value === item.id ? null : (item.id as T))} onClearSelection={() => onChange(null)}>
      {value ?? label}
    </Chip>
  );
}

const columns: TableColumn<LeaveRequest>[] = [
  { id: "person", header: "Person", cell: (row) => { const person = people[row.person]; return <TableMedia media={<Avatar size="xs" src={person.photo} alt="" theme={person.photo ? "photo" : person.theme}>{person.name.slice(0, 1)}</Avatar>}>{person.name}</TableMedia>; } },
  { id: "kind", header: "Type", width: "160px", cell: (row) => <TableText>{row.kind}</TableText> },
  { id: "dates", header: "Dates", width: "200px", cell: (row) => <TableText>{formatRange(row.from, row.to)}</TableText> },
  { id: "days", header: "Days", width: "88px", align: "right", cell: (row) => <TableText>{plural(row.days, "day")}</TableText> },
  { id: "status", header: "Status", width: "136px", cell: (row) => <Badge size="medium" theme={leaveStatusTheme[row.status]} background="subtle">{row.status}</Badge> },
];

// ——— 1. Control bar over a table ————————————————————————————————————————————————————————————
function LeaveRequests() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LeaveStatus | null>(null);
  const [kind, setKind] = useState<LeaveKind | null>(null);
  const [requests, setRequests] = useState(leaveRequests);
  const needle = query.trim().toLowerCase();
  const rows = requests.filter((row) => (!status || row.status === status) && (!kind || row.kind === kind) && (!needle || `${people[row.person].name} ${row.kind}`.toLowerCase().includes(needle)));
  const filtered = Boolean(needle || status || kind);
  const clear = () => { setQuery(""); setStatus(null); setKind(null); };
  const submit = () => {
    const next: LeaveRequest = { id: `l${requests.length + 1}`, person: "alex", kind: "Annual leave", from: new Date(2026, 10, 16), to: new Date(2026, 10, 17), days: 2, status: "Pending", requested: new Date(2026, 8, 30, 10, 30) };
    setRequests((list) => [next, ...list]);
    toast({ type: "positive", title: "Leave submitted", children: `${next.kind} · ${formatRange(next.from, next.to)}`, action: { label: "Undo", onClick: () => setRequests((list) => list.filter((row) => row.id !== next.id)) } });
  };
  return (
    <Stack gap="md" width="fill">
      <DashboardHeader
        search={<Search size="md" placeholder="Search leave requests" value={query} onValueChange={setQuery} onClear={() => setQuery("")} />}
        controls={<><FilterChip label="Status" options={statuses} value={status} onChange={setStatus} /><FilterChip label="Type" options={kinds} value={kind} onChange={setKind} /></>}
        subheading={plural(rows.length, "leave request")}
        actions={<>
          <Button level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Export started", children: `leave-requests.csv · ${plural(rows.length, "row")}` })}>Export report</Button>
          <Button level="primary" startIcon="icon-plus-line" onClick={submit}>Submit leave</Button>
        </>}
      />
      {/* The page's table sits on the Canvas: no Card */}
      <Table aria-label="Leave requests" rows={rows} columns={columns}
        empty={<EmptyState size="sm" icon="icon-search-medium-line" title="No leave requests match" secondaryAction={filtered ? { label: "Clear filters", onClick: clear } : undefined}>Try another name, or clear the filters.</EmptyState>} />
    </Stack>
  );
}

// ——— 2. Navigation bar ——————————————————————————————————————————————————————————————————————
const trail = [{ id: "home", label: "Home" }, { id: "time-off", label: "Time off" }, { id: "my-leaves", label: "My leaves" }];
/** The width of an element, kept current: a phone-width bar trades the trail for Back. */
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
function NavigationBar() {
  const [depth, setDepth] = useState(trail.length);
  const [unread, setUnread] = useState(8);
  const [note, setNote] = useState<string | null>(null);
  const [measure, width] = useWidth();
  const alex = people.alex;
  // A narrow bar has no room for the trail beside the actions: Back to the parent takes its place (as PageHeader's back).
  const narrow = width > 0 && width < 480;
  const parent = depth > 1 ? trail[depth - 2] : undefined;
  // On a phone Help moves into the account menu, so the bar keeps room for Back.
  const help: MenuItemData = { id: "help", label: "Help", icon: "icon-help-circle-line", onSelect: () => setNote("Help opened") };
  return (
    <Stack gap="xs" width="fill" ref={measure}>
      <DashboardHeader
        type="navigation"
        leading={narrow && parent
          ? <Button appearance="flat" level="primary" size="sm" startIcon={<Icon name="icon-chevron-left-line-medium" decorative />} onClick={() => setDepth(depth - 1)}>{parent.label}</Button>
          : <Breadcrumbs items={trail.slice(0, depth)} onNavigate={(item, event) => { event.preventDefault(); setDepth(trail.findIndex((crumb) => crumb.id === item.id) + 1); }} />}
        trailing={<>
          <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => { setUnread(0); setNote(unread ? `${plural(unread, "notification")} marked read` : "No new notifications"); }} />
          {narrow ? null : <AppShellAction icon="icon-help-circle-line" aria-label="Help" onClick={help.onSelect} />}
          <Menu align="end" aria-label="Account" trigger={<AppShellAccount name={alex.name} src={alex.photo} />}
            items={[{ id: "profile", label: "Profile", icon: "icon-user-line", onSelect: () => setNote("Profile opened") }, ...(narrow ? [help] : []), { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => setNote("Signed out") }]} />
        </>}
      />
      {depth < trail.length ? <Button level="tertiary" size="sm" onClick={() => setDepth(trail.length)}>Back to My leaves</Button> : null}
      {note ? <Text as="p" textStyle="Body/Small/Regular" tone="light" role="status">{note}</Text> : null}
    </Stack>
  );
}

// ——— 3. The rows of a dashboard page (Figma Header/Dashboard) —————————————————————————————————————
const navSections = [{ items: [{ id: "home", label: "Home", icon: "icon-home-03-line" }, { id: "time-off", label: "Time off", icon: "icon-calendar-line" }, { id: "team", label: "Team", icon: "icon-users-line" }] }];
function DashboardPage() {
  const { toast } = useToast();
  const [section, setSection] = useState("time-off");
  const [status, setStatus] = useState<LeaveStatus | null>(null);
  const rows = leaveRequests.filter((row) => !status || row.status === status);
  return (
    <AppShell
      className="pe-dashboard-shell"
      sidebar={<Sidebar {...figmaSidebarBrand} sections={navSections} selectedId={section} onItemClick={(item) => setSection(item.id)} />}
      header={<Breadcrumbs items={[{ id: "home", label: "Home" }, { id: "time-off", label: "Time off" }]} onNavigate={(item, event) => { event.preventDefault(); setSection(item.id); }} />}
      headerActions={<AppShellAction icon="icon-bell-01-line" aria-label="Notifications" dot onClick={() => toast({ title: "No new notifications" })} />}
      sections={<>
        <DashboardHeader type="main" title="Time off" childTitle="2026" subheading="Leave requests from the Design team."
          actions={<Button level="primary" startIcon="icon-plus-line" onClick={() => toast({ type: "positive", title: "Leave submitted", children: "Annual leave · Nov 16 – Nov 17, 2026" })}>Submit leave</Button>} />
        <DashboardHeader controls={<FilterChip label="Status" options={statuses} value={status} onChange={setStatus} />} subheading={plural(rows.length, "request")}
          actions={<Button level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Export started", children: "time-off-2026.csv" })}>Export report</Button>} />
      </>}
    >
      <Container maxWidth="full"><Table aria-label="Time off requests" rows={rows} columns={columns} /></Container>
    </AppShell>
  );
}

// ——— 4. A row of your own ————————————————————————————————————————————————————————————————————
const periods = [{ id: "week", label: "Week" }, { id: "month", label: "Month" }, { id: "quarter", label: "Quarter" }];
const periodRange: Record<string, string> = { week: "Sep 28 – Oct 4, 2026", month: "Sep 1 – Sep 30, 2026", quarter: "Jul 1 – Sep 30, 2026" };
function ReportingPeriod() {
  const [period, setPeriod] = useState("month");
  const [team, setTeam] = useState<string | null>(null);
  return (
    <DashboardHeader type="custom" className="pe-dashboard-page">
      <Segmented aria-label="Reporting period" options={periods} value={period} onValueChange={setPeriod} />
      <Text textStyle="Body/Base/Medium">{periodRange[period]}</Text>
      <FilterChip label="All teams" options={["Design", "Engineering", "Delivery"]} value={team} onChange={setTeam} />
    </DashboardHeader>
  );
}

// ——— 5. A narrow column ————————————————————————————————————————————————————————————————————————
function NarrowColumn() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LeaveStatus | null>(null);
  return (
    <Box width="fill" maxWidth={480}>
      <DashboardHeader
        search={<Search size="md" placeholder="Search requests" value={query} onValueChange={setQuery} onClear={() => setQuery("")} />}
        controls={<FilterChip label="Status" options={statuses} value={status} onChange={setStatus} />}
        actions={<Button level="primary" onClick={() => toast({ type: "positive", title: "Leave submitted" })}>Submit leave</Button>}
      />
    </Box>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Control bar over a table",
    description: "The leave requests list: Search filters by person or type, Status and Type are filter Chips, the count follows the filters, and the page's actions sit on the right — Tertiary Export, then the one Primary (first on a phone). No match shows the empty table with Clear filters.",
    wide: true,
    render: () => <LeaveRequests />,
    code: `<Stack gap="md">
  <DashboardHeader
    search={<Search size="md" placeholder="Search leave requests" value={query} onValueChange={setQuery} onClear={() => setQuery("")} />}
    controls={<>
      <Chip variant="advanced" dropdown selected={status !== null} popoverLabel="Status" popoverItems={statusItems}
        onPopoverSelect={(item) => setStatus(item.id)} onClearSelection={() => setStatus(null)}>{status ?? "Status"}</Chip>
      <Chip variant="advanced" dropdown selected={kind !== null} popoverLabel="Type" popoverItems={kindItems}
        onPopoverSelect={(item) => setKind(item.id)} onClearSelection={() => setKind(null)}>{kind ?? "Type"}</Chip>
    </>}
    subheading={plural(rows.length, "leave request")}
    actions={<>
      <Button level="tertiary" startIcon="icon-download-01-line" onClick={exportCsv}>Export report</Button>
      <Button level="primary" startIcon="icon-plus-line" onClick={submitLeave}>Submit leave</Button>
    </>}
  />
  {/* The page's table sits on the Canvas: no Card */}
  <Table aria-label="Leave requests" rows={rows} columns={columns}
    empty={<EmptyState size="sm" icon="icon-search-medium-line" title="No leave requests match" secondaryAction={{ label: "Clear filters", onClick: clear }}>Try another name, or clear the filters.</EmptyState>} />
</Stack>`,
  },
  {
    title: "Navigation bar",
    description: "Where the page is, then the notifications, Help and the account on the right — the navigation row on its own, for a page outside an AppShell. Notifications marks the 8 unread as read; a crumb goes back up the trail. On a phone Back to the parent takes the trail's place and Help moves into the account menu.",
    wide: true,
    render: () => <NavigationBar />,
    code: `<DashboardHeader
  type="navigation"
  leading={<Breadcrumbs items={trail} onNavigate={go} />}
  trailing={<>
    <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={markRead} />
    <AppShellAction icon="icon-help-circle-line" aria-label="Help" onClick={openHelp} />
    <Menu align="end" aria-label="Account" trigger={<AppShellAccount name="Alex Duong" src={photo} />} items={accountItems} />
  </>}
/>`,
  },
  {
    title: "The rows of a dashboard page",
    description: "Figma's Header/Dashboard: inside an AppShell the rows go in sections — the page title row (type main: the title, a second title in Light and one line under it) and a control bar — and the shell pads each one. The app frame's own top bar stays AppShell's header.",
    wide: true,
    screen: true,
    render: () => <DashboardPage />,
    code: `<AppShell
  sidebar={<Sidebar sections={sections} selectedId={section} onItemClick={(item) => setSection(item.id)} />}
  header={<Breadcrumbs items={crumbs} onNavigate={go} />}
  headerActions={<AppShellAction icon="icon-bell-01-line" aria-label="Notifications" dot onClick={openInbox} />}
  sections={<>
    <DashboardHeader type="main" title="Time off" childTitle="2026" subheading="Leave requests from the Design team."
      actions={<Button level="primary" startIcon="icon-plus-line" onClick={submitLeave}>Submit leave</Button>} />
    <DashboardHeader controls={statusChip} subheading={plural(rows.length, "request")}
      actions={<Button level="tertiary" startIcon="icon-download-01-line" onClick={exportCsv}>Export report</Button>} />
  </>}
>
  <Container maxWidth="full"><Table aria-label="Time off requests" rows={rows} columns={columns} /></Container>
</AppShell>`,
  },
  {
    title: "A row of your own",
    description: "Type custom takes any content, Gap/Medium apart and centred: here the reporting period (Segmented), its dates and a team filter, between the title row and the report.",
    wide: true,
    render: () => <ReportingPeriod />,
    code: `<DashboardHeader type="custom">
  <Segmented aria-label="Reporting period" options={periods} value={period} onValueChange={setPeriod} />
  <Text textStyle="Body/Base/Medium">{periodRange[period]}</Text>
  <Chip variant="advanced" dropdown selected={team !== null} popoverLabel="All teams" popoverItems={teamItems}
    onPopoverSelect={(item) => setTeam(item.id)} onClearSelection={() => setTeam(null)}>{team ?? "All teams"}</Chip>
</DashboardHeader>`,
  },
  {
    title: "A narrow column",
    description: "Squeezed by a Sidebar and a docked panel (here 480px), the control bar wraps instead of shrinking its parts: the Search keeps its width and the Primary moves to the next line, Gap/XSmall under it. On a phone the Search takes a line of its own.",
    render: () => <NarrowColumn />,
    code: `{/* a 480px column */}
<DashboardHeader
  search={<Search size="md" placeholder="Search requests" value={query} onValueChange={setQuery} onClear={() => setQuery("")} />}
  controls={statusChip}
  actions={<Button level="primary" onClick={submitLeave}>Submit leave</Button>}
/>`,
  },
]);
