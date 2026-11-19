import { useState } from "react";
import {
  Avatar, Badge, Button, Chip, DashboardHeader, EmptyState, Search, Stack, Table, TableMedia, TableText, plural, useToast,
  type TableColumn,
} from "@zen-ds/react";
import { formatRange, leaveRequests, leaveStatusTheme, people, type LeaveKind, type LeaveRequest, type LeaveStatus } from "../../data";

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

export default function LeaveRequests() {
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
