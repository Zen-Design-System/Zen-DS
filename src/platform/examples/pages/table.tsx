import { useEffect, useId, useRef, useState } from "react";
import type { PlatformPage } from "../../PlatformExamples";
import type { ExampleDef } from "../types";
import { PlatformPhone } from "../../PlatformPhone";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { ActionBar } from "../../../components/ActionBar";
import { Avatar, AvatarStack, type AvatarSize } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Button, IconButton } from "../../../components/Button";
import { Chip } from "../../../components/Chip";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { Icon } from "../../../components/Icon";
import { InlineMessage } from "../../../components/InlineMessage";
import { Box, Container, Stack } from "../../../components/Layout";
import { PageHeader } from "../../../components/PageHeader";
import { ProgressBar } from "../../../components/Progress";
import { Search } from "../../../components/Search";
import { SidePanel } from "../../../components/SidePanel";
import { SkeletonText } from "../../../components/Skeleton";
import { Table, TableActions, TableBadges, TableMedia, TableTags, TableText, type TableBulkAction, type TableColumn, type TableSort } from "../../../components/Table";
import { Tag } from "../../../components/Tag";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import {
  TODAY, daysFromToday, files, formatBytes, formatDate, formatDue, formatMoney, formatRange, formatRelative, initials,
  invoiceStatusTheme, people, projectById, projectStatusTheme, projects, taskStatusTheme, tasks,
  type InvoiceStatus, type Person, type PersonId, type Project, type StudioFile, type TaskStatus,
} from "../data";
import { keepOnHotUpdate } from "../../hotData";
import "./table.css";

export const page: PlatformPage = "table";

/** People are Avatars: a photo when there is one, otherwise initials on the person's steady theme. */
function PersonAvatar({ person, size }: { person: Person; size: AvatarSize }) {
  return person.photo
    ? <Avatar size={size} theme="photo" src={person.photo} alt="" />
    : <Avatar size={size} theme={person.theme} background="subtle" alt="">{initials(person.name)}</Avatar>;
}

/* ───────────── 1. Sort by column: the studio's design and engineering people ───────────── */

type Member = { id: PersonId; joined: Date; hours: number };
// The team page's own order (by team, then by seniority) is what "no sort" returns to.
const members: Member[] = [
  { id: "alex", joined: new Date(2019, 2, 4), hours: 41.5 },
  { id: "gia", joined: new Date(2021, 4, 17), hours: 40 },
  { id: "chi", joined: new Date(2022, 6, 11), hours: 38 },
  { id: "ava", joined: new Date(2023, 1, 6), hours: 36.5 },
  { id: "emi", joined: new Date(2024, 9, 14), hours: 30 },
  { id: "bao", joined: new Date(2020, 8, 1), hours: 44.5 },
  { id: "khoa", joined: new Date(2022, 2, 28), hours: 39 },
  { id: "finn", joined: new Date(2025, 0, 13), hours: 42 },
  { id: "em", joined: new Date(2025, 7, 4), hours: 35.5 },
];
const memberSortValue: Record<string, (member: Member) => string | number> = {
  name: (member) => people[member.id].name,
  joined: (member) => member.joined.getTime(),
  hours: (member) => member.hours,
};
function sortMembers(rows: Member[], sort: TableSort | null) {
  if (!sort) return rows;
  const value = memberSortValue[sort.columnId];
  const sign = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = value(a), y = value(b);
    return sign * (typeof x === "string" ? x.localeCompare(String(y)) : x - Number(y));
  });
}
const memberColumns: TableColumn<Member>[] = [
  { id: "name", header: "Name", sortable: true, cell: (member) => <TableMedia bold media={<PersonAvatar person={people[member.id]} size="sm" />} caption={people[member.id].role}>{people[member.id].name}</TableMedia> },
  { id: "team", header: "Team", width: "150px", cell: (member) => <TableText>{people[member.id].team}</TableText> },
  { id: "location", header: "Location", width: "180px", cell: (member) => <TableText>{people[member.id].location}</TableText> },
  { id: "joined", header: "Joined", sortable: true, width: "150px", cell: (member) => <TableText>{formatDate(member.joined)}</TableText> },
  { id: "hours", header: "Hours this week", sortable: true, align: "right", width: "170px", cell: (member) => <TableText>{member.hours.toFixed(1)}</TableText> },
];

function SortExample() {
  const headingId = useId();
  const [sort, setSort] = useState<TableSort | null>({ columnId: "name", direction: "asc" });
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Heading level={4} id={headingId} textStyle="Heading/4">Design and engineering</Heading>
      <Table aria-labelledby={headingId} columns={memberColumns} rows={sortMembers(members, sort)} sort={sort} onSortChange={setSort} />
    </Stack>
  );
}

/* ───────────── 2. Act on selected rows: a Bulk-Action bar for the selection ───────────── */

type QuarterInvoice = { id: string; number: string; client: string; project: string; amount: number; status: InvoiceStatus; due: Date };
const quarterInvoices: QuarterInvoice[] = [
  { id: "inv-142", number: "INV-2026-0142", client: "Phin & Co", project: "Loyalty app", amount: 21000, status: "Sent", due: daysFromToday(25) },
  { id: "inv-141", number: "INV-2026-0141", client: "Lumen Bank", project: "Online banking redesign", amount: 40500, status: "Paid", due: daysFromToday(12) },
  { id: "inv-140", number: "INV-2026-0140", client: "Phin & Co", project: "Loyalty app", amount: 18750, status: "Paid", due: daysFromToday(-5) },
  { id: "inv-139", number: "INV-2026-0139", client: "Mekong Freight", project: "Shipment tracking", amount: 12880, status: "Overdue", due: daysFromToday(-14) },
  { id: "inv-138", number: "INV-2026-0138", client: "Hanoi Book Fair", project: "Book Fair 2026 website", amount: 9140.5, status: "Paid", due: daysFromToday(-20) },
  { id: "inv-137", number: "INV-2026-0137", client: "Phin & Co", project: "Loyalty app", amount: 15400, status: "Overdue", due: daysFromToday(-3) },
];
const invoiceColumns: TableColumn<QuarterInvoice>[] = [
  { id: "number", header: "Invoice", cell: (invoice) => <TableText bold caption={invoice.project}>{invoice.number}</TableText> },
  { id: "client", header: "Client", width: "170px", cell: (invoice) => <TableText>{invoice.client}</TableText> },
  // Open invoices say how long is left; a paid one has nothing left to count.
  { id: "due", header: "Due", width: "170px", cell: (invoice) => <TableText caption={invoice.status === "Paid" ? undefined : formatDue(invoice.due)}>{formatDate(invoice.due)}</TableText> },
  { id: "amount", header: "Amount (USD)", align: "right", width: "150px", cell: (invoice) => <TableText>{formatMoney(invoice.amount, true)}</TableText> },
  { id: "status", header: "Status", width: "120px", cell: (invoice) => <TableBadges><Badge theme={invoiceStatusTheme[invoice.status]} background="subtle">{invoice.status}</Badge></TableBadges> },
];

function BulkActionsExample() {
  const { toast } = useToast();
  const headingId = useId();
  const [rows, setRows] = useState(quarterInvoices);
  const [selected, setSelected] = useState<string[]>(["inv-139", "inv-137"]);
  const picked = rows.filter((invoice) => selected.includes(invoice.id));
  const unpaid = picked.filter((invoice) => invoice.status !== "Paid");
  const count = plural(picked.length, "invoice");
  const total = formatMoney(picked.reduce((sum, invoice) => sum + invoice.amount, 0), true);
  const markPaid = () => {
    const before = rows;
    const ids = unpaid.map((invoice) => invoice.id);
    setRows(rows.map((invoice) => ids.includes(invoice.id) ? { ...invoice, status: "Paid" } : invoice));
    // The bar leaves with the selection; the Table moves the focus to Select all rows.
    setSelected([]);
    toast({ title: `${plural(ids.length, "invoice")} marked as paid`, action: { label: "Undo", onClick: () => setRows(before) } });
  };
  // Each action says how many invoices it touches: the bar's tooltips and the More menu (phones) show the same names.
  const actions: TableBulkAction[] = [
    { id: "remind", group: "Payment", icon: "icon-mail-01-line", label: unpaid.length ? `Send ${plural(unpaid.length, "reminder")}` : "Send reminders",
      onClick: () => toast({ title: `${plural(unpaid.length, "reminder")} sent` }), disabled: !unpaid.length },
    { id: "paid", group: "Payment", icon: "icon-check-circle-line", label: unpaid.length ? `Mark ${plural(unpaid.length, "invoice")} as paid` : "Mark as paid", onClick: markPaid, disabled: !unpaid.length },
    { id: "pdf", group: "Share", icon: "icon-download-01-line", label: `Download ${plural(picked.length, "PDF")}`, onClick: () => toast({ title: `${count} downloaded` }) },
    { id: "links", group: "Share", icon: "icon-link-01-line", label: `Copy ${plural(picked.length, "payment link")}`, onClick: () => toast({ title: `${plural(picked.length, "payment link")} copied` }) },
  ];
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack direction="row" justify="between" align="center" gap="sm" wrap>
        <Heading level={4} id={headingId} textStyle="Heading/4">Q3 invoices</Heading>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">
          {picked.length ? `${total} selected` : plural(rows.length, "invoice")}
        </Text>
      </Stack>
      <Table aria-labelledby={headingId} columns={invoiceColumns} rows={rows} selectable selectedIds={selected} onSelectionChange={setSelected}
        bulkActions={actions} />
    </Stack>
  );
}

/* ───────────── 3. Open a row: read-only projects open their detail in a Side Panel ───────────── */

const projectColumns: TableColumn<Project>[] = [
  { id: "name", header: "Project", cell: (project) => <TableMedia bold media={<DockIcon size="sm" icon={project.icon} theme={project.theme} background="subtle" />} caption={project.client}>{project.name}</TableMedia> },
  { id: "lead", header: "Lead", width: "170px", cell: (project) => <TableMedia bold={false} media={<PersonAvatar person={people[project.lead]} size="xs" />}>{people[project.lead].name}</TableMedia> },
  { id: "due", header: "Due", width: "140px", cell: (project) => <TableText>{formatDate(project.due)}</TableText> },
  { id: "progress", header: "Progress", width: "160px", cell: (project) => <ProgressBar className="px-table-progress" value={project.progress} label aria-label={`${project.name} progress`} /> },
  { id: "status", header: "Status", width: "120px", cell: (project) => <TableBadges><Badge theme={projectStatusTheme[project.status]} background="subtle">{project.status}</Badge></TableBadges> },
  // A passive chevron says the row opens; the row itself is the target.
  { id: "open", header: <VisuallyHidden>Open</VisuallyHidden>, align: "right", width: "56px", cell: () => <Icon name="icon-chevron-right-line" size="base" decorative /> },
];

function ProjectDetail({ project }: { project: Project }) {
  const internal = project.budget === 0;
  return (
    <DescriptionList items={[
      { id: "status", term: "Status", description: <Badge theme={projectStatusTheme[project.status]} background="subtle">{project.status}</Badge> },
      { id: "lead", term: "Lead", description: people[project.lead].name },
      { id: "team", term: "Team", description: <AvatarStack max={4} items={project.members.map((id) => { const person = people[id]; return person.photo ? { theme: "photo" as const, src: person.photo, alt: person.name } : { theme: person.theme, alt: person.name, children: initials(person.name) }; })} /> },
      { id: "dates", term: "Dates", description: formatRange(project.start, project.due) },
      { id: "progress", term: "Progress", description: `${project.progress}%` },
      { id: "budget", term: "Budget", description: internal ? "Internal project" : formatMoney(project.budget) },
      { id: "spent", term: "Spent", description: internal ? "Not tracked" : `${formatMoney(project.spent)} (${Math.round((project.spent / project.budget) * 100)}%)` },
    ]} />
  );
}

function OpenRowExample() {
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = openId ? projectById(openId) : null;
  return (
    <Container maxWidth="full">
      <Stack paddingY="xl" gap="xl">
        <PageHeader title="Projects" description="Client and studio work, from planning to handover." />
        <Table aria-label="Projects" columns={projectColumns} rows={projects} onRowClick={(project) => setOpenId(project.id)} />
      </Stack>
      <SidePanel type="modal" open={Boolean(opened)} onOpenChange={(open) => { if (!open) setOpenId(null); }}
        title={opened?.name ?? ""} description={opened?.client}>
        {opened ? <ProjectDetail project={opened} /> : null}
      </SidePanel>
    </Container>
  );
}

/* ───────────── 4. Edit in place: the fields people correct every day ───────────── */

type SprintTask = { id: string; key: string; title: string; assignee: PersonId; status: TaskStatus; estimate: number; labels: string[] };
function pickTask(id: string) {
  const task = tasks.find((item) => item.id === id)!;
  return { id: task.id, key: task.key, title: task.title, assignee: task.assignee, status: task.status };
}
const sprintTasks: SprintTask[] = [
  { ...pickTask("t1"), estimate: 12, labels: ["design", "ios"] },
  { ...pickTask("t2"), estimate: 8, labels: ["api"] },
  { ...pickTask("t3"), estimate: 6, labels: ["android", "qa"] },
  { id: "t11", key: "PHIN-226", title: "Empty state for members with no points", assignee: "gia", status: "To do", estimate: 3.5, labels: ["design"] },
  { id: "t12", key: "PHIN-208", title: "Points balance widget", assignee: "chi", status: "Done", estimate: 10, labels: ["design", "ios"] },
];
const taskStatuses: TaskStatus[] = ["To do", "In progress", "In review", "Done"];
const loyaltyTeam: PersonId[] = ["chi", "bao", "em", "duy", "gia"];
const labelSuggestions = ["design", "ios", "android", "api", "qa", "copy"];
const validateEstimate = (value: string) => {
  const hours = Number(value);
  if (!value.trim() || Number.isNaN(hours) || hours <= 0 || hours > 80) return "Enter 0.5 to 80 hours";
  return (hours * 2) % 1 ? "Round to half an hour" : undefined;
};

function EditInPlaceExample() {
  const { toast } = useToast();
  const headingId = useId();
  const [rows, setRows] = useState(sprintTasks);
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = rows.find((row) => row.id === openId);
  const update = (id: string, patch: Partial<SprintTask>) => setRows((list) => list.map((row) => row.id === id ? { ...row, ...patch } : row));
  // Done tasks are locked, except their status, so a task can be reopened.
  const done = (row: SprintTask) => row.status === "Done";
  const columns: TableColumn<SprintTask>[] = [
    { id: "title", header: "Task", cell: (row) => <TableText bold caption={row.key}>{row.title}</TableText>, onOpen: (row) => setOpenId(row.id),
      edit: { type: "text", value: (row) => row.title, disabled: done, validate: (value) => value.trim() ? undefined : "Give the task a title",
        onCommit: (row, value) => update(row.id, { title: value.trim() }) } },
    { id: "assignee", header: "Assignee", width: "180px", cell: (row) => <TableMedia bold={false} media={<PersonAvatar person={people[row.assignee]} size="xs" />}>{people[row.assignee].name}</TableMedia>,
      edit: { type: "select", value: (row) => row.assignee, disabled: done, options: loyaltyTeam.map((id) => ({ value: id, label: people[id].name })),
        onCommit: (row, value) => update(row.id, { assignee: value as PersonId }) } },
    { id: "status", header: "Status", width: "150px", cell: (row) => <TableBadges><Badge theme={taskStatusTheme[row.status]} background="subtle">{row.status}</Badge></TableBadges>,
      edit: { type: "select", value: (row) => row.status, options: taskStatuses.map((status) => ({ value: status, label: status })),
        onCommit: (row, value) => {
          if (value === row.status) return;
          update(row.id, { status: value as TaskStatus });
          // A status change moves the task on the board, so it confirms in a Toast with Undo.
          toast({ title: `${row.key} moved to ${value}`, action: { label: "Undo", onClick: () => update(row.id, { status: row.status }) } });
        } } },
    { id: "estimate", header: "Estimate (h)", align: "right", width: "140px", cell: (row) => <TableText>{row.estimate.toFixed(1)}</TableText>,
      edit: { type: "number", value: (row) => row.estimate.toFixed(1), disabled: done, validate: validateEstimate,
        onCommit: (row, value) => update(row.id, { estimate: Number(value) }) } },
    { id: "labels", header: "Labels", width: "200px", cell: (row) => <TableTags>{row.labels.map((label) => <Tag key={label}>{label}</Tag>)}</TableTags>,
      edit: { type: "tags", value: (row) => row.labels, suggestions: labelSuggestions, disabled: done, onCommit: (row, labels) => update(row.id, { labels }) } },
  ];
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Heading level={4} id={headingId} textStyle="Heading/4">Loyalty app · Sprint 14</Heading>
      <Table className="px-table-titles" aria-labelledby={headingId} columns={columns} rows={rows} />
      <SidePanel type="modal" open={Boolean(opened)} onOpenChange={(open) => { if (!open) setOpenId(null); }}
        title={opened?.title ?? ""} description={opened ? `${opened.key} · Loyalty app` : undefined}>
        {opened ? (
          <DescriptionList items={[
            { id: "status", term: "Status", description: <Badge theme={taskStatusTheme[opened.status]} background="subtle">{opened.status}</Badge> },
            { id: "assignee", term: "Assignee", description: people[opened.assignee].name },
            { id: "estimate", term: "Estimate", description: plural(opened.estimate, "hour") },
            { id: "labels", term: "Labels", description: opened.labels.join(", ") || "None" },
          ]} />
        ) : null}
      </SidePanel>
    </Stack>
  );
}

/* ───────────── 5. No matching rows: filters that leave nothing keep the table ───────────── */

const studioFiles: StudioFile[] = [
  ...files,
  { id: "f7", name: "Points history – flows.fig", bytes: 9_800_000, owner: "chi", project: "phin-loyalty", updated: daysFromToday(-3, 15, 10) },
  { id: "f8", name: "Transfer journey map.pdf", bytes: 3_400_000, owner: "ava", project: "lumen-banking", updated: daysFromToday(-6, 10, 0) },
  { id: "f9", name: "Customs hold states.fig", bytes: 6_200_000, owner: "duy", project: "mekong-tracking", updated: daysFromToday(-8, 14, 45) },
];
const fileTypes = [
  { id: "design", label: "Design files", test: (name: string) => name.endsWith(".fig") },
  { id: "document", label: "Documents", test: (name: string) => /\.(pdf|docx)$/.test(name) },
  { id: "slides", label: "Presentations", test: (name: string) => name.endsWith(".key") },
  { id: "sheet", label: "Spreadsheets", test: (name: string) => name.endsWith(".xlsx") },
  { id: "video", label: "Videos", test: (name: string) => name.endsWith(".mp4") },
];
const fileOwners = [...new Set(studioFiles.map((file) => file.owner))].map((id) => people[id]);
const fileColumns: TableColumn<StudioFile>[] = [
  { id: "name", header: "Name", cell: (file) => <TableMedia bold media={<FileIcon format={fileIconFormatOf(file.name)} size="lg" />} caption={projectById(file.project).name}>{file.name}</TableMedia> },
  { id: "owner", header: "Owner", width: "170px", cell: (file) => <TableMedia bold={false} media={<PersonAvatar person={people[file.owner]} size="xs" />}>{people[file.owner].name}</TableMedia> },
  { id: "updated", header: "Updated", width: "190px", cell: (file) => <TableText>{formatRelative(file.updated)}</TableText> },
  { id: "size", header: "Size", align: "right", width: "110px", cell: (file) => <TableText>{formatBytes(file.bytes)}</TableText> },
];

function NoMatchesExample() {
  const headingId = useId();
  // Someone looked for Chi's prototype video: nothing matches, and the table says so in place.
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [typeId, setTypeId] = useState<string | null>("video");
  const [ownerId, setOwnerId] = useState<PersonId | null>("chi");
  const type = fileTypes.find((item) => item.id === typeId);
  const owner = ownerId ? people[ownerId] : null;
  const words = query.trim().toLowerCase();
  const rows = studioFiles.filter((file) => (!type || type.test(file.name)) && (!ownerId || file.owner === ownerId) && (!words || file.name.toLowerCase().includes(words)));
  // Clear filters leaves with the empty state: focus moves to the search, where the next filter starts.
  const clearAll = () => { setQuery(""); setTypeId(null); setOwnerId(null); searchRef.current?.focus(); };
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Heading level={4} id={headingId} textStyle="Heading/4">Files</Heading>
      <Stack direction="row" gap="xs" align="center" wrap>
        <Box className="px-table-search"><Search ref={searchRef} placeholder="Search files" value={query} onValueChange={setQuery} /></Box>
        <Chip variant="advanced" selected={Boolean(type)} popoverLabel="Type"
          popoverItems={fileTypes.map((item) => ({ id: item.id, label: item.label, selected: item.id === typeId }))}
          onPopoverSelect={(item) => setTypeId(item.id)} onClearSelection={() => setTypeId(null)}>
          {type?.label ?? "Type"}
        </Chip>
        <Chip variant="advanced" selected={Boolean(owner)} popoverLabel="Owner" photoSrc={owner?.photo} theme={owner?.photo ? "leading-photo" : undefined}
          popoverItems={fileOwners.map((person) => ({ id: person.id, label: person.name, selected: person.id === ownerId, theme: "avatar-small" as const,
            ...(person.photo ? { photoSrc: person.photo } : { leading: <PersonAvatar person={person} size="sm" /> }) }))}
          onPopoverSelect={(item) => setOwnerId(item.id as PersonId)} onClearSelection={() => setOwnerId(null)}>
          {owner?.name ?? "Owner"}
        </Chip>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "file")}</Text>
      </Stack>
      <Table className="px-table-keep-empty" aria-labelledby={headingId} columns={fileColumns} rows={rows}
        empty={<Box className="px-table-empty-view"><EmptyState headingLevel={5} illustration title="No files match" secondaryAction={{ label: "Clear filters", onClick: clearAll }} icon="icon-file-doc-line">
          Try another type or owner, or search by name.
        </EmptyState></Box>} />
    </Stack>
  );
}

/* ───────────── 6. First run: an empty table that starts the job ───────────── */

type Guest = { id: string; email: string; invited: Date };

function FirstRunExample() {
  const { toast } = useToast();
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [inviting, setInviting] = useState(false);
  // Invite guest moves between the empty state and the header, and a removed row takes its button with it: focus
  // follows to whichever Invite guest is on screen, never to <body>.
  const focusInvite = () => requestAnimationFrame(() =>
    [...(sectionRef.current?.querySelectorAll("button") ?? [])].find((button) => button.textContent === "Invite guest")?.focus());
  const invite = (email: string) => {
    setGuests((list) => [...list, { id: email, email, invited: TODAY }]);
    focusInvite();
  };
  const remove = (guest: Guest) => {
    const before = guests;
    setGuests(guests.filter((item) => item.id !== guest.id));
    toast({ title: "Guest removed", action: { label: "Undo", onClick: () => setGuests(before) } });
    focusInvite();
  };
  const columns: TableColumn<Guest>[] = [
    { id: "guest", header: "Guest", cell: (guest) => <TableMedia bold media={<Avatar size="sm" theme="green" background="subtle" alt="">{guest.email[0].toUpperCase()}</Avatar>} caption="Can comment">{guest.email}</TableMedia> },
    { id: "invited", header: "Invited", width: "150px", cell: (guest) => <TableText>{formatRelative(guest.invited)}</TableText> },
    { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", width: "72px", cell: (guest) => (
      <TableActions><IconButton appearance="flat" level="primary" size="md" icon="icon-trash-line" aria-label={`Remove ${guest.email}`} onClick={() => remove(guest)} /></TableActions>
    ) },
  ];
  return (
    <Stack as="section" ref={sectionRef} gap="md" aria-labelledby={headingId}>
      <Stack direction="row" justify="between" align="center" gap="sm">
        <Stack gap="xs">
          <Heading level={4} id={headingId} textStyle="Heading/4">Guests</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Brand refresh · Saola Outdoor</Text>
        </Stack>
        {/* Once the table has rows, the empty state's action moves up here. */}
        {guests.length ? <Button level="tertiary" startIcon="icon-user-plus-line" onClick={() => setInviting(true)}>Invite guest</Button> : null}
      </Stack>
      <Table className="px-table-keep-empty" aria-labelledby={headingId} columns={columns} rows={guests}
        empty={<Box className="px-table-empty-view"><EmptyState headingLevel={5} illustration title="No guests yet" primaryAction={{ label: "Invite guest", onClick: () => setInviting(true) }}>
          Invite people from Saola Outdoor to review designs and leave comments.
        </EmptyState></Box>} />
      <DemoFieldDialog open={inviting} onOpenChange={setInviting} title="Invite a guest" description="Guests can view Brand refresh and comment on designs."
        field={{ kind: "email", label: "Email", placeholder: "name@saola.vn" }} submitLabel="Send invite"
        confirm={(email) => `Invite sent to ${email}`} onSubmit={invite} />
    </Stack>
  );
}

/* ───────────── 7. Load error: say it failed, keep the way to try again ───────────── */

type Expense = { id: string; item: string; person: PersonId; date: Date; amount: number };
const expenses: Expense[] = [
  { id: "e1", item: "Figma seats for October", person: "alex", date: daysFromToday(-29), amount: 1080 },
  { id: "e2", item: "Client lunch with Phin & Co", person: "duy", date: daysFromToday(-18), amount: 86.4 },
  { id: "e3", item: "Usability session incentives", person: "ava", date: daysFromToday(-9), amount: 250 },
  { id: "e4", item: "Stock photos for Brand refresh", person: "gia", date: daysFromToday(-4), amount: 29.99 },
];
const expenseColumns: TableColumn<Expense>[] = [
  { id: "item", header: "Expense", cell: (expense) => <TableText bold caption={people[expense.person].name}>{expense.item}</TableText> },
  { id: "date", header: "Date", width: "150px", cell: (expense) => <TableText>{formatDate(expense.date)}</TableText> },
  { id: "amount", header: "Amount (USD)", align: "right", width: "150px", cell: (expense) => <TableText>{formatMoney(expense.amount, true)}</TableText> },
];
// While loading, the same columns hold one placeholder per cell, shaped like what replaces it.
const placeholder = (width: "short" | "long") => <SkeletonText lines={1} className={`px-table-skeleton px-table-skeleton--${width}`} />;
const loadingColumns: TableColumn<number>[] = [
  { id: "item", header: "Expense", cell: () => <TableText bold caption={placeholder("short")}>{placeholder("long")}</TableText> },
  { id: "date", header: "Date", width: "150px", cell: () => <TableText>{placeholder("short")}</TableText> },
  { id: "amount", header: "Amount (USD)", align: "right", width: "150px", cell: () => <TableText>{placeholder("short")}</TableText> },
];

function LoadErrorExample() {
  const headingId = useId();
  const regionRef = useRef<HTMLElement>(null);
  const [state, setState] = useState<"error" | "loading" | "ready">("error");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const load = () => {
    setState("loading");
    // Try again leaves with the message (and Refresh is disabled while loading): focus moves to the table's place, not <body>.
    regionRef.current?.focus();
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("ready"), 1400);
  };
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack direction="row" justify="between" align="center" gap="sm">
        <Heading level={4} id={headingId} textStyle="Heading/4">September expenses</Heading>
        <IconButton appearance="flat" level="primary" size="md" icon="icon-refresh-cw-01-line" aria-label="Refresh expenses" disabled={state === "loading"} onClick={load} />
      </Stack>
      <Box ref={regionRef} tabIndex={-1} aria-busy={state === "loading"}>
        {state === "error" ? (
          <InlineMessage theme="negative" title="Expenses couldn't load" action={{ label: "Try again", onClick: load }}>
            The finance service didn't answer in time. Your expenses are safe.
          </InlineMessage>
        ) : state === "loading" ? (
          <Table aria-labelledby={headingId} columns={loadingColumns} rows={[1, 2, 3, 4]} getRowId={String} />
        ) : (
          <Table aria-labelledby={headingId} columns={expenseColumns} rows={expenses} />
        )}
      </Box>
      <VisuallyHidden role="status">{state === "loading" ? "Loading expenses" : state === "ready" ? `${plural(expenses.length, "expense")} loaded` : ""}</VisuallyHidden>
    </Stack>
  );
}

/* ───────────── 8. On a phone: fixed columns scroll sideways instead of wrapping ───────────── */

// The Design team Alex approves: the studio people from the shared data, plus the designers it does not list.
const designer = (id: string, name: string, role: string, theme: Person["theme"], location: Person["location"]): Person =>
  ({ id, name, role, team: "Design", theme, location, email: `${name.split(" ")[0].toLowerCase()}@dizai.studio` });
type Timesheet = { person: Person; hours: number[] };
const weekStart = daysFromToday(-9);
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const timesheets: Timesheet[] = [
  { person: people.alex, hours: [8, 8.5, 9, 8, 7.5] },
  { person: people.chi, hours: [8, 8, 8.5, 8, 6] },
  { person: people.ava, hours: [7.5, 8, 8, 8, 8] },
  { person: people.gia, hours: [8, 9, 8, 8.5, 8] },
  { person: people.emi, hours: [6, 6, 6, 6, 6] },
  { person: designer("quang", "Quang Tran", "Visual Designer", "blue", "Hanoi"), hours: [8, 8, 8, 8, 8] },
  { person: designer("thao", "Thao Nguyen", "Product Designer", "crimson", "Ho Chi Minh City"), hours: [8.5, 8, 9, 8, 7] },
  { person: designer("long", "Long Pham", "Content Designer", "brown", "Ho Chi Minh City"), hours: [8, 7.5, 8, 8, 8] },
  { person: designer("vy", "Vy Le", "Product Designer", "purple", "Hanoi"), hours: [8, 8, 8, 4, 0] },
  { person: designer("hieu", "Hieu Do", "Illustrator", "red", "Ho Chi Minh City"), hours: [7, 8, 8, 8, 8] },
  { person: designer("nam", "Nam Hoang", "Interaction Designer", "indigo", "Ho Chi Minh City"), hours: [9, 8.5, 8, 8, 8] },
  { person: designer("my", "My Dang", "Design Intern", "violet", "Ho Chi Minh City"), hours: [4, 4, 4, 4, 4] },
  { person: designer("khanh", "Khanh Vu", "UI Designer", "pink", "Hanoi"), hours: [8, 8, 7.5, 8, 8] },
  { person: designer("trang", "Trang Bui", "Design Researcher", "plum", "Ho Chi Minh City"), hours: [8, 8, 8, 8, 6.5] },
].sort((a, b) => a.person.name.localeCompare(b.person.name));
const weekTotal = (sheet: Timesheet) => sheet.hours.reduce((sum, hours) => sum + hours, 0);
const timesheetColumns: TableColumn<Timesheet>[] = [
  { id: "person", header: "Person", width: "150px", cell: (sheet) => <TableMedia bold={false} media={<PersonAvatar person={sheet.person} size="xs" />}>{sheet.person.name}</TableMedia> },
  ...weekDays.map((day, index): TableColumn<Timesheet> => ({ id: day, header: day, align: "right", width: "64px", cell: (sheet) => <TableText>{sheet.hours[index].toFixed(1)}</TableText> })),
  { id: "total", header: "Total", align: "right", width: "80px", cell: (sheet) => <TableText bold>{weekTotal(sheet).toFixed(1)}</TableText> },
];

function PhoneTimesheetsExample() {
  const { toast } = useToast();
  // The phone's scroller: the large title folds as the table runs under the bar.
  const screenRef = useRef<HTMLDivElement>(null);
  const [approved, setApproved] = useState(false);
  const hours = timesheets.reduce((sum, sheet) => sum + weekTotal(sheet), 0);
  const approve = () => {
    setApproved(true);
    toast({ title: `${plural(timesheets.length, "timesheet")} approved`, action: { label: "Undo", onClick: () => setApproved(false) } });
  };
  return (
    <PlatformPhone label="Team hours" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="alt" title="Team hours" largeTitle="Team hours" scrollRef={screenRef} />}
      footer={<ActionBar position="static"
        summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{approved ? "Approved just now" : `${plural(timesheets.length, "timesheet")} · ${plural(hours, "hour")}`}</Text>}
        primaryAction={approved ? undefined : { label: "Approve timesheets", onClick: approve }}
        secondaryAction={approved ? { label: "Reopen timesheets", onClick: () => setApproved(false) } : undefined} />}>
      {/* The table lies on the screen inside its 20px margin, no card around it: its edge lines up with the title. */}
      <Stack gap="xs" padding="lg">
        <Text tone="base">Design team · {formatRange(weekStart, daysFromToday(-5))}</Text>
        <Table aria-label={`Design team hours, week of ${formatDate(weekStart)}`} columns={timesheetColumns} rows={timesheets} getRowId={(sheet) => sheet.person.id} />
      </Stack>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Sort by column",
    description: "Sortable headers are buttons with aria-sort: the first press sorts ascending, the next descending, the third returns the team page's own order. Numbers and their header align right.",
    wide: true,
    render: () => <SortExample />,
    code: `const [sort, setSort] = useState<TableSort | null>({ columnId: "name", direction: "asc" });

<Heading level={4} id="team-title" textStyle="Heading/4">Design and engineering</Heading>
<Table aria-labelledby="team-title" rows={sortMembers(members, sort)} sort={sort} onSortChange={setSort}
  columns={[
    { id: "name", header: "Name", sortable: true, cell: (m) => (
      <TableMedia bold media={<Avatar size="sm" theme="photo" src={m.photo} alt="" />} caption={m.role}>{m.name}</TableMedia>
    ) },
    { id: "team", header: "Team", width: "150px", cell: (m) => <TableText>{m.team}</TableText> },
    { id: "joined", header: "Joined", sortable: true, width: "150px", cell: (m) => <TableText>{formatDate(m.joined)}</TableText> },
    { id: "hours", header: "Hours this week", sortable: true, align: "right", width: "170px",
      cell: (m) => <TableText>{m.hours.toFixed(1)}</TableText> },
  ]} />`,
  },
  {
    title: "Act on selected rows",
    description: "Checking rows brings up the Table's bulk actions: a Popover/Bulk-Action bar under the table with the count and Clear selection, held at the bottom of the window on a long table; on a phone the actions that don't fit move into a More menu. Each action names how many invoices it touches; Mark as paid acts at once and the Toast can undo it.",
    wide: true,
    render: () => <BulkActionsExample />,
    code: `const [selected, setSelected] = useState<string[]>([]);
const picked = rows.filter((invoice) => selected.includes(invoice.id));
const count = plural(picked.length, "invoice");

<Stack direction="row" justify="between" align="center">
  <Heading level={4} id="invoices-title" textStyle="Heading/4">Q3 invoices</Heading>
  <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">
    {picked.length ? \`\${total} selected\` : plural(rows.length, "invoice")}
  </Text>
</Stack>
<Table aria-labelledby="invoices-title" rows={rows} columns={columns}
  selectable selectedIds={selected} onSelectionChange={setSelected}
  bulkActions={[
    { id: "remind", group: "Payment", icon: "icon-mail-01-line", label: \`Send \${plural(unpaid.length, "reminder")}\`, onClick: remind },
    { id: "paid", group: "Payment", icon: "icon-check-circle-line", label: \`Mark \${plural(unpaid.length, "invoice")} as paid\`, onClick: markPaid },
    { id: "pdf", group: "Share", icon: "icon-download-01-line", label: \`Download \${plural(picked.length, "PDF")}\`, onClick: download },
    { id: "links", group: "Share", icon: "icon-link-01-line", label: "Copy payment links", onClick: copyLinks },
  ]} />`,
  },
  {
    title: "Open a row",
    description: "A list page whose read-only rows open a record uses onRowClick: the whole row is the target, Tab reaches each row and Enter opens it. The project opens in a Side Panel, so the list stays in place.",
    wide: true,
    screen: true,
    render: () => <OpenRowExample />,
    code: `const [openId, setOpenId] = useState<string | null>(null);
const opened = projects.find((project) => project.id === openId);

<PageHeader title="Projects" description="Client and studio work, from planning to handover." />
{/* The table lies on the page: no Card around it. */}
<Table aria-label="Projects" rows={projects} onRowClick={(project) => setOpenId(project.id)} columns={[
  { id: "name", header: "Project", cell: (p) => (
    <TableMedia bold media={<DockIcon size="sm" icon={p.icon} theme={p.theme} background="subtle" />} caption={p.client}>{p.name}</TableMedia>
  ) },
  { id: "progress", header: "Progress", width: "160px", cell: (p) => <ProgressBar value={p.progress} label aria-label={\`\${p.name} progress\`} /> },
  { id: "status", header: "Status", width: "120px", cell: (p) => <TableBadges><Badge theme={statusTheme[p.status]} background="subtle">{p.status}</Badge></TableBadges> },
  { id: "open", header: <VisuallyHidden>Open</VisuallyHidden>, align: "right", width: "56px",
    cell: () => <Icon name="icon-chevron-right-line" size="base" decorative /> },
]} />
<SidePanel type="modal" open={Boolean(opened)} onOpenChange={(open) => !open && setOpenId(null)}
  title={opened?.name} description={opened?.client}>
  <DescriptionList items={details(opened)} />
</SidePanel>`,
  },
  {
    title: "Edit in place",
    description: "Only the fields people correct every day are editable, and Done tasks lock everything but their status. A click or Enter edits, Enter saves, Escape leaves; the estimate validates in its cell and a status change confirms in a Toast with Undo.",
    wide: true,
    render: () => <EditInPlaceExample />,
    code: `const done = (row) => row.status === "Done";

<Table aria-labelledby="sprint-title" rows={rows} columns={[
  { id: "title", header: "Task", cell: (row) => <TableText bold caption={row.key}>{row.title}</TableText>,
    onOpen: (row) => setOpenId(row.id),
    edit: { type: "text", value: (row) => row.title, disabled: done, validate: (v) => v.trim() ? undefined : "Give the task a title",
      onCommit: (row, title) => update(row.id, { title }) } },
  { id: "status", header: "Status", width: "150px", cell: (row) => <TableBadges><Badge …>{row.status}</Badge></TableBadges>,
    edit: { type: "select", value: (row) => row.status, options: statuses,
      onCommit: (row, status) => { update(row.id, { status }); toast({ title: \`\${row.key} moved to \${status}\`, action: { label: "Undo", onClick: undo } }); } } },
  { id: "estimate", header: "Estimate (h)", align: "right", width: "140px", cell: (row) => <TableText>{row.estimate.toFixed(1)}</TableText>,
    edit: { type: "number", value: (row) => row.estimate.toFixed(1), disabled: done, validate: validateEstimate,
      onCommit: (row, v) => update(row.id, { estimate: Number(v) }) } },
  { id: "labels", header: "Labels", width: "200px", cell: (row) => <TableTags>{row.labels.map((l) => <Tag key={l}>{l}</Tag>)}</TableTags>,
    edit: { type: "tags", value: (row) => row.labels, suggestions, disabled: done, onCommit: (row, labels) => update(row.id, { labels }) } },
]} />`,
  },
  {
    title: "No matching rows",
    description: "When search and filters leave nothing, the table keeps its header and the empty prop puts an Empty State across the columns, with Clear filters as the way back. The count beside the filters says the same in words.",
    wide: true,
    render: () => <NoMatchesExample />,
    code: `const rows = files.filter((file) => (!type || type.test(file.name)) && (!ownerId || file.owner === ownerId) && matches(file, query));

<Stack direction="row" gap="xs" align="center" wrap>
  <Search placeholder="Search files" value={query} onValueChange={setQuery} />
  <Chip variant="advanced" selected={Boolean(type)} popoverLabel="Type" popoverItems={typeItems}
    onPopoverSelect={(item) => setTypeId(item.id)} onClearSelection={() => setTypeId(null)}>{type?.label ?? "Type"}</Chip>
  <Chip variant="advanced" selected={Boolean(owner)} popoverLabel="Owner" popoverItems={ownerItems}
    onPopoverSelect={(item) => setOwnerId(item.id)} onClearSelection={() => setOwnerId(null)}>{owner?.name ?? "Owner"}</Chip>
  <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "file")}</Text>
</Stack>
<Table aria-labelledby="files-title" rows={rows} columns={columns}
  empty={<EmptyState headingLevel={5} illustration title="No files match"
    secondaryAction={{ label: "Clear filters", onClick: clearAll }} icon="icon-file-doc-line">
    Try another type or owner, or search by name.
  </EmptyState>} />`,
  },
  {
    title: "First run",
    description: "Before the first row, the empty table says what goes here and offers the one action that fills it. Once guests exist, Invite guest moves to the header and each row gets a Remove that the Toast can undo.",
    wide: true,
    render: () => <FirstRunExample />,
    code: `<Table aria-labelledby="guests-title" rows={guests} columns={[
  { id: "guest", header: "Guest", cell: (g) => <TableMedia bold media={<Avatar size="sm" … />} caption="Can comment">{g.email}</TableMedia> },
  { id: "invited", header: "Invited", width: "150px", cell: (g) => <TableText>{formatRelative(g.invited)}</TableText> },
  { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", width: "72px", cell: (g) => (
    <TableActions>
      <IconButton appearance="flat" level="primary" size="md" icon="icon-trash-line" aria-label={\`Remove \${g.email}\`} onClick={() => remove(g)} />
    </TableActions>
  ) },
]}
  empty={<EmptyState headingLevel={5} illustration={false} title="No guests yet"
    primaryAction={{ label: "Invite guest", onClick: openInvite }}>
    Invite people from Saola Outdoor to review designs and leave comments.
  </EmptyState>} />`,
  },
  {
    title: "Loading and errors",
    description: "A failed load is an Inline Message with Try again, not an empty table. While rows load, the same columns hold one Skeleton per cell, and a live region says when they have arrived.",
    wide: true,
    render: () => <LoadErrorExample />,
    code: `const [state, setState] = useState<"error" | "loading" | "ready">("error");

{state === "error" ? (
  <InlineMessage theme="negative" title="Expenses couldn't load" action={{ label: "Try again", onClick: load }}>
    The finance service didn't answer in time. Your expenses are safe.
  </InlineMessage>
) : state === "loading" ? (
  <Table aria-labelledby="expenses-title" rows={[1, 2, 3, 4]} getRowId={String} columns={[
    { id: "item", header: "Expense", cell: () => <TableText bold caption={<SkeletonText lines={1} />}><SkeletonText lines={1} /></TableText> },
    { id: "amount", header: "Amount (USD)", align: "right", width: "150px", cell: () => <TableText><SkeletonText lines={1} /></TableText> },
  ]} />
) : (
  <Table aria-labelledby="expenses-title" rows={expenses} columns={columns} />
)}
<VisuallyHidden role="status">{state === "ready" ? plural(expenses.length, "expense") + " loaded" : ""}</VisuallyHidden>`,
  },
  {
    title: "Narrow screen",
    description: "Columns with a fixed width keep their values on one line, so on a phone the table scrolls sideways with a swipe instead of wrapping names and numbers. The footer approves the week.",
    render: () => <PhoneTimesheetsExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);
const hours = timesheets.reduce((sum, s) => sum + s.total, 0);

<PlatformPhone headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" title="Team hours" largeTitle="Team hours" scrollRef={screenRef} />}
  footer={<ActionBar position="static" summary={\`\${plural(timesheets.length, "timesheet")} · \${plural(hours, "hour")}\`}
    primaryAction={{ label: "Approve timesheets", onClick: approve }} />}>
  {/* padding 20 (Margin-Compact): the table's edge lines up with the large title */}
  <Stack gap="xs" padding="lg">
    <Text tone="base">Design team · Sep 21 – Sep 25, 2026</Text>
    <Table aria-label="Design team hours, week of Sep 21, 2026" rows={timesheets} getRowId={(s) => s.person.id} columns={[
      { id: "person", header: "Person", width: "150px", cell: (s) => <TableMedia bold={false} media={<Avatar size="xs" … />}>{s.person.name}</TableMedia> },
      ...["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => ({
        id: day, header: day, align: "right", width: "64px", cell: (s) => <TableText>{s.hours[i].toFixed(1)}</TableText>,
      })),
      { id: "total", header: "Total", align: "right", width: "80px", cell: (s) => <TableText bold>{s.total.toFixed(1)}</TableText> },
    ]} />
  </Stack>
</PlatformPhone>`,
  },
]);
