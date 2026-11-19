import { useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, Badge, Breadcrumbs, Button, Chip, DashboardHeader, Menu, Sidebar, Stack, Table,
  TableMedia, TableText, Text, Thumbnail, plural, useToast, useZen,
  type TableColumn,
} from "@zen-ds/react";
import { formatRange, initials, leaveRequests, leaveStatusTheme, people, studio, type LeaveRequest, type LeaveStatus } from "../../data";

const statuses: LeaveStatus[] = ["Pending", "Approved", "Declined"];

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
/** On a phone the table keeps one column: the person, with the status, type and dates under the name. */
const phoneColumns: TableColumn<LeaveRequest>[] = [{
  id: "person", header: "Person", cell: (row) => {
    const person = people[row.person];
    return <TableMedia media={<Avatar size="small" src={person.photo} alt="" theme={person.photo ? "photo" : person.theme}>{initials(person.name)}</Avatar>} caption={`${row.status} · ${row.kind} · ${formatRange(row.from, row.to)}`}>{person.name}</TableMedia>;
  },
}];

const navSections = [{ items: [{ id: "home", label: "Home", icon: "icon-home-03-line" }, { id: "time-off", label: "Time off", icon: "icon-calendar-line" }, { id: "team", label: "Team", icon: "icon-users-line" }] }];

export default function DashboardPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState<LeaveStatus | null>(null);
  const [requests, setRequests] = useState(leaveRequests);
  const [waiting, setWaiting] = useState(true);
  const rows = requests.filter((row) => !status || row.status === status);
  const phone = useZen()?.breakpoint === "mobile";
  const alex = people.alex;
  // Only Time off is drawn here: the other rows and crumbs say so instead of selecting a page that doesn't change.
  const notHere = (label: string) => toast({ title: `${label} isn’t part of this example`, children: "This example shows the Time off page." });
  const pending = leaveRequests.filter((row) => row.status === "Pending");
  const submit = () => {
    const next: LeaveRequest = { id: `l${requests.length + 1}`, person: "alex", kind: "Annual leave", from: new Date(2026, 10, 16), to: new Date(2026, 10, 17), days: 2, status: "Pending", requested: new Date(2026, 8, 30, 10, 30) };
    setRequests((list) => [next, ...list]);
    toast({ type: "positive", title: "Leave submitted", children: `${next.kind} · ${formatRange(next.from, next.to)}`, action: { label: "Undo", onClick: () => setRequests((list) => list.filter((row) => row.id !== next.id)) } });
  };
  return (
    <AppShell
      sidebar={(
        // The studio's mark and name: a 2xs Thumbnail fits the 24px logo slot at every density.
        <Sidebar logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
          logoCollapsed={<Thumbnail src={studio.logo} alt={studio.name} size="2xs" />}
          sections={navSections} selectedId="time-off" onItemClick={(item) => { if (item.id !== "time-off") notHere(item.label); }} />
      )}
      header={(
        <AppShellHeader
          // The top row: the collapse toggle, then the trail (no Master icon beside the toggle), Notifications and
          // the account last.
          leading={<Breadcrumbs master={false} items={[{ id: "home", label: "Home" }, { id: "time-off", label: "Time off" }]} onNavigate={(item, event) => { event.preventDefault(); if (item.id !== "time-off") notHere(String(item.label)); }} />}
          actions={<>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" dot={waiting} onClick={() => {
              toast(waiting
                ? { title: `${plural(pending.length, "request")} wait for you`, children: `${pending.map((row) => people[row.person].name).join(" and ")} asked for annual leave.` }
                : { title: "No new notifications", children: "You’re all caught up." });
              setWaiting(false);
            }} />
            <Menu align="end" aria-label="Account" trigger={<AppShellAccount name={alex.name} src={alex.photo} />} items={[
              { id: "profile", label: "Profile", icon: "icon-user-line", onSelect: () => toast({ title: alex.name, children: `${alex.role} · ${alex.email}` }) },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out" }) },
            ]} />
          </>}
          // The Main row: the page title row with the page's one Primary.
          main={<DashboardHeader type="main" title="Time off" childTitle="2026" subheading="Leave requests from the Design team."
            actions={<Button level="primary" startIcon="icon-plus-line" onClick={submit}>Submit leave</Button>} />}
          // Sections: the control bar over the table, at the page margins.
          sections={<DashboardHeader controls={<FilterChip label="Status" options={statuses} value={status} onChange={setStatus} />} subheading={plural(rows.length, "request")}
            actions={<Button level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Export started", children: `time-off-2026.csv · ${plural(rows.length, "row")}` })}>Export report</Button>} />}
        />
      )}
    >
      {/* The Body pads the page margins: the table sits straight on the Canvas. */}
      <Table aria-label="Time off requests" rows={rows} columns={phone ? phoneColumns : columns} />
    </AppShell>
  );
}
