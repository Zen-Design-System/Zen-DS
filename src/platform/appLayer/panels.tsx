import { Fragment, useCallback, useId, useRef, useState } from "react";
import { AppShellAction } from "../../components/AppShell";
import { Avatar } from "../../components/Avatar";
import { Badge } from "../../components/Badge";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { Button, IconButton } from "../../components/Button";
import { Card } from "../../components/Card";
import { Checkbox } from "../../components/Checkbox";
import { Chip } from "../../components/Chip";
import { DescriptionList } from "../../components/DescriptionList";
import { Divider } from "../../components/Divider";
import { EmptyState } from "../../components/EmptyState";
import { FileIcon } from "../../components/FileIcon";
import type { IconName } from "../../components/Icon";
import { InlineMessage } from "../../components/InlineMessage";
import { DateField, InputField, NumberField, SelectField, TextAreaField } from "../../components/Input";
import { Grid, Stack } from "../../components/Layout";
import { List, ListItem } from "../../components/ListItem";
import { MetricCard } from "../../components/MetricWidget";
import { PageHeader } from "../../components/PageHeader";
import { ProgressBar } from "../../components/Progress";
import { Search } from "../../components/Search";
import { SidePanel } from "../../components/SidePanel";
import { Table, TableActions, TableBadges, TableMedia, TableText } from "../../components/Table";
import { TabPanel, Tabs } from "../../components/Tabs";
import { Heading, Text, plural } from "../../components/Text";
import { Toggle } from "../../components/Toggle";
import { useToast, type ToastOptions } from "../../components/Toast";
import { VisuallyHidden } from "../../components/VisuallyHidden";
import { DemoFieldDialog } from "../PlatformDemoActions";
import { GroupLabel, KindMark, PersonAvatar, ThingMark, allowance, kindLabel, requestBadge, requestsInitial, staff, statusBadge, type LeaveKind, type LeaveRequest, type Person, type RequestStatus } from "./hrDemo";
import { keepOnHotUpdate } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";
import "./panels.css";

/*
 * Side Panel examples (platform only): each one is a small HR-Platform screen, so the panel opens from something real
 * (a table row, a filter chip, a canvas layer, the bell, a Request leave button) and its contents are a full record, not a stub.
 */

const documents = [
  { name: "Employment contract.pdf", format: "pdf", size: "412 KB · signed Mar 1" },
  { name: "ID card.jpg", format: "photo", size: "1.2 MB" },
  { name: "Tax declaration 2026.xlsx", format: "sheet", size: "86 KB" },
] as const;


/** toast() whose one action (Undo) also closes the toast once it ran. */
function useActionToast() {
  const { toast, dismiss } = useToast();
  return useCallback((options: ToastOptions & { action: { label: string; onClick: () => void } }) => {
    const id = toast({ ...options, action: { ...options.action, onClick: () => { options.action.onClick(); dismiss(id); } } });
  }, [toast, dismiss]);
}

/* ───────────── 1 · Employee profile from a table row ───────────── */

function PersonDetails({ person, tab, onTabChange }: { person: Person; tab: string; onTabChange: (tab: string) => void }) {
  const { toast } = useToast();
  const idPrefix = `psp-person-${useId().replace(/[^a-z0-9]/gi, "")}`;
  return (
    <Stack gap="lg">
      <Stack direction="row" gap="md" align="center">
        <PersonAvatar person={person} size="xlarge" />
        <Stack gap="2xs">
          <Stack direction="row" gap="2xs" wrap>
            <Badge size="sm" theme={statusBadge[person.status].theme} background="subtle">{statusBadge[person.status].label}</Badge>
            <Badge size="sm" theme="neutral" background="subtle">Full-time</Badge>
          </Stack>
          <Text as="span" textStyle="Body/Small/Regular" tone="light">{person.id} · joined {person.start}</Text>
        </Stack>
      </Stack>
      <Tabs idPrefix={idPrefix} aria-label={`${person.name}: details`} value={tab} onValueChange={onTabChange} items={[
        { id: "overview", label: "Overview" },
        { id: "time-off", label: "Time off" },
        { id: "documents", label: "Documents", badge: documents.length },
      ]} />
      <TabPanel idPrefix={idPrefix} id="overview" hidden={tab !== "overview"}>
        <DescriptionList divider items={[
          { term: "Email", description: person.email },
          { term: "Phone", description: person.phone },
          { term: "Manager", description: person.manager },
          { term: "Office", description: person.location },
          { term: "Start date", description: person.start },
        ]} />
      </TabPanel>
      <TabPanel idPrefix={idPrefix} id="time-off" hidden={tab !== "time-off"}>
        <Stack gap="lg">
          <ProgressBar value={Math.round((person.annual / allowance.annual) * 100)} label={`Annual leave · ${person.annual} of ${allowance.annual} days used`} />
          <ProgressBar value={Math.round((person.sick / allowance.sick) * 100)} label={`Sick leave · ${person.sick} of ${allowance.sick} days used`} />
          <Stack gap="2xs">
            <GroupLabel>Upcoming</GroupLabel>
            <List aria-label="Upcoming time off">
              {person.status === "leave"
                ? <ListItem title="Annual leave" caption="Sep 28 – Oct 2 · 5 days" leading={<KindMark kind="annual" />} trailing={<Badge size="sm" theme="orange" background="subtle">Now</Badge>} />
                : <ListItem title="Annual leave" caption="Oct 14 – Oct 15 · 2 days" leading={<KindMark kind="annual" />} trailing={<Badge size="sm" theme="green" background="subtle">Approved</Badge>} />}
              <ListItem title="New Year's Day" caption="Jan 1, 2027 · public holiday, office closed" leading={<ThingMark icon="icon-flag-01-line" theme="red" />} />
            </List>
          </Stack>
        </Stack>
      </TabPanel>
      <TabPanel idPrefix={idPrefix} id="documents" hidden={tab !== "documents"}>
        <List aria-label="Documents">
          {documents.map((doc) => (
            <ListItem key={doc.name} title={doc.name} caption={doc.size} leading={<FileIcon format={doc.format} size="xl" />}
              trailing={<IconButton appearance="flat" level="primary" size="md" aria-label={`Download ${doc.name}`} icon="icon-download-01-line" onClick={() => toast({ title: `${doc.name} downloaded` })} />} />
          ))}
        </List>
      </TabPanel>
    </Stack>
  );
}

/** Someone invited by email (Add employee): Onboarding from today, in the New hires team until a manager places them. */
const invitee = (email: string, count: number): Person => {
  const name = email.split("@")[0].split(/[._-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ") || email;
  const initials = name.split(" ").map((part) => part.charAt(0)).join("").slice(0, 2).toUpperCase();
  return { id: `EMP-NEW-${count}`, name, initials, theme: "teal", role: "Invited", department: "New hires", status: "onboarding", start: "Sep 30, 2026", email, phone: "Not added yet", manager: "Alex Duong", location: "Ho Chi Minh City", annual: 0, sick: 0 };
};

function PeopleDirectoryExample() {
  const { toast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  const [people, setPeople] = useState(staff);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [inviting, setInviting] = useState(false);
  const person = people.find((entry) => entry.id === openId);
  const term = query.trim().toLowerCase();
  const rows = people.filter((entry) => `${entry.name} ${entry.role} ${entry.department}`.toLowerCase().includes(term));
  const open = (entry: Person) => { setTab("overview"); setOpenId(entry.id); };
  return (
    <div className="psp-screen">
      <PageHeader title="People" description={`${plural(people.length, "employee")} in 3 offices`}
        actions={<Button level="primary" startIcon="icon-plus-line" onClick={() => setInviting(true)}>Add employee</Button>} />
      {/* The page's table sits straight on the page (usage rules §14): toolbar, then the table. */}
      <Stack gap="md">
        <div className="psp-toolbar">
          <Search ref={searchRef} placeholder="Search name, role or team" aria-label="Search people" value={query} onValueChange={setQuery} />
          <Text as="span" textStyle="Body/Small/Regular" tone="light">{plural(rows.length, "person", "people")}</Text>
        </div>
        {/* The open row stays selected while its panel shows it. */}
        <Table aria-label="Employees" rows={rows} getRowId={(row) => row.id} onRowClick={open} selectedIds={person ? [person.id] : []}
          empty={<EmptyState illustration={false} icon="icon-users-line" title="No one matches" secondaryAction={{ label: "Clear search", onClick: () => { setQuery(""); searchRef.current?.focus(); } }}>Try a name, a role or a team.</EmptyState>}
          columns={[
            { id: "name", header: "Employee", cell: (row) => <TableMedia media={<PersonAvatar person={row} />} caption={row.role}>{row.name}</TableMedia> },
            { id: "department", header: "Team", cell: (row) => <TableText>{row.department}</TableText> },
            { id: "location", header: "Office", cell: (row) => <TableText>{row.location}</TableText> },
            { id: "start", header: "Start date", cell: (row) => <TableText>{row.start}</TableText> },
            { id: "status", header: "Status", cell: (row) => <TableBadges><Badge size="sm" theme={statusBadge[row.status].theme} background="subtle">{statusBadge[row.status].label}</Badge></TableBadges> },
          ]} />
      </Stack>
      <SidePanel open={Boolean(person)} onOpenChange={(value) => { if (!value) setOpenId(null); }} type="modal" title={person?.name ?? ""} description={person ? `${person.role} · ${person.department}` : undefined}
        primaryAction={{ label: "Send message", onClick: () => { if (person) toast({ title: `Chat with ${person.name} opened`, children: "It is in your Inbox." }); setOpenId(null); } }}
        secondaryAction={{ label: "Close" }}>
        {person ? <PersonDetails person={person} tab={tab} onTabChange={setTab} /> : null}
      </SidePanel>
      {/* The same invite as App Shell › People admin: the person joins the table as Onboarding. */}
      <DemoFieldDialog open={inviting} onOpenChange={setInviting} title="Add employee" description="They get an email to finish their profile."
        field={{ kind: "email", label: "Work email", placeholder: "name@dizai.studio" }} submitLabel="Send invite" confirm={(email) => `Invite sent to ${email}`}
        onSubmit={(email) => { setQuery(""); setPeople((list) => [invitee(email, list.length + 1), ...list]); }} />
    </div>
  );
}

/* ───────────── 2 · Filters for an approval queue ───────────── */

type Filters = { status: RequestStatus[]; kinds: LeaveKind[]; department: string; long: boolean };
const noFilters: Filters = { status: [], kinds: [], department: "all", long: false };
const pendingOnly: Filters = { ...noFilters, status: ["pending"] };
const departments = ["Design", "Engineering", "Product"];

const matches = (request: LeaveRequest, filters: Filters, term = "") =>
  (!filters.status.length || filters.status.includes(request.status))
  && (!filters.kinds.length || filters.kinds.includes(request.kind))
  && (filters.department === "all" || request.person.department === filters.department)
  && (!filters.long || request.days >= 5)
  && request.person.name.toLowerCase().includes(term);
const filterCount = (filters: Filters) => filters.status.length + filters.kinds.length + (filters.department === "all" ? 0 : 1) + (filters.long ? 1 : 0);
const toggled = <T,>(list: T[], value: T, on: boolean) => (on ? [...list, value] : list.filter((entry) => entry !== value));

function ApprovalFiltersExample() {
  const actionToast = useActionToast();
  const statusId = useId();
  const kindId = useId();
  const tableRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [requests, setRequests] = useState(requestsInitial);
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState<Filters>(pendingOnly);
  const [draft, setDraft] = useState<Filters>(pendingOnly);
  const [open, setOpen] = useState(false);
  const term = query.trim().toLowerCase();
  const rows = requests.filter((request) => matches(request, applied, term));
  const preview = requests.filter((request) => matches(request, draft, term)).length;
  const active = filterCount(applied);
  /** Focus a row's decision button once the table has re-rendered: `index` picks the n-th one left, else the last. */
  const focusDecision = (action: string, index = 0) => requestAnimationFrame(() => {
    const buttons = tableRef.current?.querySelectorAll<HTMLButtonElement>(`button[data-decide="${action}"]`);
    (buttons?.[index] ?? buttons?.[(buttons?.length ?? 0) - 1] ?? searchRef.current)?.focus();
  });
  // Approve or reject acts at once and offers Undo. The row leaves the Pending view, so focus moves on to the same
  // button of the next request instead of falling to the page.
  const decide = (request: LeaveRequest, status: RequestStatus) => {
    const index = rows.filter((row) => row.status === "pending").findIndex((row) => row.id === request.id);
    const restore = () => { setRequests((list) => list.map((entry) => (entry.id === request.id ? { ...entry, status: request.status } : entry))); focusDecision(status, index); };
    setRequests((list) => list.map((entry) => (entry.id === request.id ? { ...entry, status } : entry)));
    actionToast({ title: `${kindLabel[request.kind]} ${status}`, children: `${request.person.name} · ${request.dates}`, action: { label: "Undo", onClick: restore } });
    focusDecision(status, index);
  };
  return (
    <div className="psp-screen">
      <PageHeader title="Approvals" description="Leave requests from your teams" />
      {/* The page's table sits straight on the page (usage rules §14): toolbar, then the table. */}
      <Stack gap="md">
        <div className="psp-toolbar">
          <Search ref={searchRef} placeholder="Search by name" aria-label="Search requests" value={query} onValueChange={setQuery} />
          {/* Filters are an Advanced Chip: the counter shows how many are on, × clears them. */}
          <Chip leading="icon-filter-lines-line" selectionMode="multiple" selectionCount={active} selected={active > 0} aria-haspopup="dialog"
            onClick={() => { setDraft(applied); setOpen(true); }} onClearSelection={active ? () => setApplied(noFilters) : undefined}>All filters</Chip>
          <Text as="span" textStyle="Body/Small/Regular" tone="light">{plural(rows.length, "request")}</Text>
        </div>
        <Table ref={tableRef} aria-label="Leave requests" rows={rows} getRowId={(row) => row.id}
          empty={<EmptyState illustration={false} icon="icon-filter-lines-line" title="No requests match" secondaryAction={{ label: "Clear filters", onClick: () => { setApplied(noFilters); setQuery(""); searchRef.current?.focus(); } }}>Change or clear the filters to see more.</EmptyState>}
          columns={[
            { id: "person", header: "Employee", cell: (row) => <TableMedia media={<PersonAvatar person={row.person} />} caption={row.person.department}>{row.person.name}</TableMedia> },
            { id: "kind", header: "Type", cell: (row) => <TableText>{kindLabel[row.kind]}</TableText> },
            { id: "dates", header: "Dates", cell: (row) => <TableText caption={plural(row.days, "day")}>{row.dates}</TableText> },
            { id: "status", header: "Status", cell: (row) => <TableBadges><Badge size="sm" theme={requestBadge[row.status].theme} background="subtle">{requestBadge[row.status].label}</Badge></TableBadges> },
            { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", cell: (row) => row.status === "pending" ? (
              <TableActions>
                <IconButton appearance="flat" level="primary" size="md" data-decide="rejected" aria-label={`Reject ${row.person.name}'s ${kindLabel[row.kind].toLowerCase()}`} icon="icon-x-line" onClick={() => decide(row, "rejected")} />
                <IconButton appearance="flat" level="primary" size="md" data-decide="approved" aria-label={`Approve ${row.person.name}'s ${kindLabel[row.kind].toLowerCase()}`} icon="icon-check-line" onClick={() => decide(row, "approved")} />
              </TableActions>
            ) : null },
          ]} />
      </Stack>
      <SidePanel open={open} onOpenChange={setOpen} type="modal" size="small" title="Filters" description="Leave requests"
        primaryAction={{ label: `Show ${plural(preview, "result")}`, onClick: () => { setApplied(draft); setOpen(false); } }}
        secondaryAction={{ label: "Reset", onClick: () => setDraft(noFilters) }}>
        {/* Direct children of the panel body span its width (the Toggle too). */}
          <Stack gap="xs" role="group" aria-labelledby={statusId}>
            <GroupLabel id={statusId}>Status</GroupLabel>
            {(Object.keys(requestBadge) as RequestStatus[]).map((status) => (
              <Checkbox key={status} label={requestBadge[status].label} caption={plural(requests.filter((request) => request.status === status).length, "request")}
                checked={draft.status.includes(status)} onCheckedChange={(on) => setDraft((current) => ({ ...current, status: toggled(current.status, status, on) }))} />
            ))}
          </Stack>
          <Divider decorative />
          <Stack gap="xs" role="group" aria-labelledby={kindId}>
            <GroupLabel id={kindId}>Leave type</GroupLabel>
            {(Object.keys(kindLabel) as LeaveKind[]).map((kind) => (
              <Checkbox key={kind} label={kindLabel[kind]} checked={draft.kinds.includes(kind)} onCheckedChange={(on) => setDraft((current) => ({ ...current, kinds: toggled(current.kinds, kind, on) }))} />
            ))}
          </Stack>
          <Divider decorative />
          <SelectField label="Team" value={draft.department} onValueChange={(department) => setDraft((current) => ({ ...current, department }))}
            options={[{ value: "all", label: "All teams" }, ...departments.map((name) => ({ value: name, label: name }))]} />
          <Toggle label="5 days or longer" caption="Long requests need a second approver" checked={draft.long} onCheckedChange={(long) => setDraft((current) => ({ ...current, long }))} />
      </SidePanel>
    </div>
  );
}

/* ───────────── 3 · Docked inspector beside a page builder ───────────── */

type Radius = "none" | "medium" | "large" | "2xlarge";
type Layer = { id: string; name: string; kind: string; width: number; height: number; radius: Radius; visible: boolean };
const radiusOptions: Array<{ value: Radius; label: string }> = [
  { value: "none", label: "None (0)" },
  { value: "medium", label: "Medium (12)" },
  { value: "large", label: "Large (16)" },
  { value: "2xlarge", label: "2XLarge (24)" },
];
const layersInitial: Layer[] = [
  { id: "nav", name: "Navigation", kind: "Header", width: 1200, height: 72, radius: "none", visible: true },
  { id: "hero", name: "Hero banner", kind: "Image", width: 1200, height: 420, radius: "2xlarge", visible: true },
  { id: "features", name: "Feature grid", kind: "Grid", width: 1200, height: 320, radius: "large", visible: true },
  { id: "footer", name: "Footer", kind: "Footer", width: 1200, height: 160, radius: "none", visible: true },
];
const layerIcon: Record<string, IconName> = { Header: "icon-layout-top-line", Image: "icon-image-line", Grid: "icon-grid-01-line", Footer: "icon-layout-bottom-line" };
/** Each radius option's Corner-Radius token (Medium 12 is Corner-Radius/Base). */
const radiusToken: Record<Exclude<Radius, "none">, string> = { medium: "var(--zen-corner-radius-base)", large: "var(--zen-corner-radius-large)", "2xlarge": "var(--zen-corner-radius-2-xlarge)" };

function InspectorExample() {
  const { toast } = useToast();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [layers, setLayers] = useState(layersInitial);
  const [selectedId, setSelectedId] = useState("hero");
  const [open, setOpen] = useState(true);
  const layer = layers.find((entry) => entry.id === selectedId) ?? layers[0];
  const update = (patch: Partial<Layer>) => setLayers((list) => list.map((entry) => (entry.id === layer.id ? { ...entry, ...patch } : entry)));
  // A docked (Standard) panel is not modal, so it does not hand focus back by itself: Close and Escape return it to the
  // toolbar button that shows the panel.
  const showPanel = (next: boolean) => { setOpen(next); if (!next) requestAnimationFrame(() => toggleRef.current?.focus()); };
  return (
    <div className="psp-studio">
      <div className="psp-studio__main">
        <PageHeader title="Homepage" breadcrumbs={<Breadcrumbs items={[{ id: "site", label: "Dizai website" }, { id: "page", label: "Homepage" }]}
          onNavigate={(item, event) => { event.preventDefault(); toast({ title: String(item.label), children: "12 pages · last published yesterday." }); }} />}
          actions={<>
            <IconButton ref={toggleRef} appearance="main" level="tertiary" aria-label="Inspector" aria-pressed={open} icon="icon-layout-right-line" onClick={() => setOpen((value) => !value)} />
            <Button level="primary" onClick={() => toast({ title: "Homepage published", children: "dizai.studio is up to date." })}>Publish</Button>
          </>} />
        <div className="psp-studio__body">
          <Stack gap="2xs" className="psp-studio__layers">
            <GroupLabel>Layers</GroupLabel>
            <List aria-label="Layers">
              {layers.map((entry) => (
                <ListItem key={entry.id} title={entry.name} caption={entry.visible ? entry.kind : `${entry.kind} · hidden`} selected={entry.id === selectedId}
                  leading={<ThingMark size="sm" icon={entry.visible ? layerIcon[entry.kind] ?? "icon-layout-alt-02-line" : "icon-eye-off-line"} />} onClick={() => { setSelectedId(entry.id); setOpen(true); }} />
              ))}
            </List>
          </Stack>
          {/* The artboard is a picture of the page; the Layers list is how you pick a layer. */}
          <div className="psp-artboard" aria-hidden="true">
            {layers.map((entry) => (
              <div key={entry.id} className="psp-artboard__layer" data-selected={entry.id === selectedId || undefined} data-hidden={!entry.visible || undefined}
                style={{ blockSize: `${Math.max(24, Math.round(entry.height / 6))}px`, inlineSize: `${Math.min(100, Math.round((entry.width / 1200) * 100))}%`, borderRadius: entry.radius === "none" ? 0 : radiusToken[entry.radius] }}>
                <Text as="span" textStyle="Caption/Regular" tone="light">{entry.name} · {entry.width} × {entry.height}</Text>
              </div>
            ))}
          </div>
        </div>
      </div>
      <SidePanel open={open} onOpenChange={showPanel} type="standard" size="small" title={layer.name} description={`${layer.kind} · Homepage`}>
          <InputField label="Layer name" value={layer.name} onValueChange={(name) => update({ name })} />
          <Grid columns="repeat(auto-fit, minmax(min(100%, 140px), 1fr))" gap="sm">
            <NumberField label="Width" value={layer.width} min={320} max={1440} step={10} onValueChange={(width) => update({ width: width ?? 320 })} />
            <NumberField label="Height" value={layer.height} min={24} max={1200} step={8} onValueChange={(height) => update({ height: height ?? 24 })} />
          </Grid>
          <SelectField label="Corner radius" value={layer.radius} options={radiusOptions} onValueChange={(radius) => update({ radius: radius as Radius })} />
          <Divider decorative />
          <Toggle label="Show on the page" caption="Hidden layers stay in the file" checked={layer.visible} onCheckedChange={(visible) => update({ visible })} />
      </SidePanel>
    </div>
  );
}

/* ───────────── 4 · Notifications from the bell ───────────── */

type Notice = { id: string; person: Person; detail: string; time: string; group: "Today" | "Earlier"; kind: "mention" | "file" | "request"; unread: boolean };
// Times follow the relative ladder (today is Wednesday, Sep 30).
const noticesInitial: Notice[] = [
  { id: "n1", person: staff[0], detail: "Mentioned you: “Can you check the spacing on the pricing cards?”", time: "2 minutes ago", group: "Today", kind: "mention", unread: true },
  { id: "n2", person: staff[1], detail: "Requested annual leave, Oct 6 – Oct 10", time: "18 minutes ago", group: "Today", kind: "request", unread: true },
  { id: "n3", person: staff[2], detail: "Uploaded brand-kit.zip (24 MB)", time: "9:40 am", group: "Today", kind: "file", unread: true },
  { id: "n4", person: staff[3], detail: "Mentioned you: “Ship the new onboarding on Monday.”", time: "Monday at 4:15 pm", group: "Earlier", kind: "mention", unread: false },
  { id: "n5", person: staff[4], detail: "Uploaded test-report.pdf (3 MB)", time: "Sunday at 11:20 am", group: "Earlier", kind: "file", unread: false },
];
const noticeFilters = [{ id: "all", label: "All" }, { id: "mention", label: "Mentions" }, { id: "request", label: "Requests" }, { id: "file", label: "Files" }] as const;

function NotificationsExample() {
  const firstListRef = useRef<HTMLUListElement>(null);
  const [notices, setNotices] = useState(noticesInitial);
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const unread = notices.filter((notice) => notice.unread).length;
  const shown = notices.filter((notice) => filter === "all" || notice.kind === filter);
  const read = (id?: string) => setNotices((list) => list.map((notice) => (id === undefined || notice.id === id ? { ...notice, unread: false } : notice)));
  // Mark all read turns itself off, so focus moves on to the first notification instead of falling out of the panel.
  const readAll = () => { read(); requestAnimationFrame(() => firstListRef.current?.querySelector<HTMLElement>("button")?.focus()); };
  return (
    <Card theme="border" spacing="medium">
      <Stack direction="row" gap="md" align="center" justify="between">
        <Stack direction="row" gap="sm" align="center">
          <Avatar size="medium" shape="square" theme="violet" background="subtle" alt="">DW</Avatar>
          <Stack gap="none">
            <Text as="span" textStyle="Body/Base/Bold">Dizai website</Text>
            <Text as="span" textStyle="Caption/Regular" tone="light">5 members · updated 2 minutes ago</Text>
          </Stack>
        </Stack>
        <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} />
      </Stack>
      <SidePanel open={open} onOpenChange={setOpen} type="modal" size="small" title="Notifications" description={unread ? `${plural(unread, "unread notification")}` : "You are all caught up"}>
        <Stack gap="md">
          <Stack direction="row" gap="2xs" wrap role="group" aria-label="Show">
            {noticeFilters.map((option) => <Chip level="primary" key={option.id} variant="normal" size="small" selected={filter === option.id} aria-pressed={filter === option.id} onClick={() => setFilter(option.id)}>{option.label}</Chip>)}
          </Stack>
          {shown.length ? (["Today", "Earlier"] as const).filter((group) => shown.some((notice) => notice.group === group)).map((group, index) => {
            const items = shown.filter((notice) => notice.group === group);
            return (
              <Stack key={group} gap="2xs">
                <div className="psp-toolbar">
                  <GroupLabel>{group}</GroupLabel>
                  {index === 0 ? <Button appearance="flat" level="primary" size="sm" disabled={!unread} onClick={readAll}>Mark all read</Button> : null}
                </div>
                <List ref={index === 0 ? firstListRef : undefined} aria-label={`${group} notifications`}>
                  {items.map((notice) => (
                    <ListItem key={notice.id} title={notice.person.name} caption={`${notice.detail} · ${notice.time}`} leading={<PersonAvatar person={notice.person} size="medium" />} onClick={() => read(notice.id)}
                      trailing={notice.unread ? <><Badge size="xs" theme="accent" background="subtle" aria-hidden="true">New</Badge><VisuallyHidden>Unread</VisuallyHidden></> : undefined} />
                  ))}
                </List>
              </Stack>
            );
          }) : <EmptyState illustration={false} icon="icon-bell-01-line" title="Nothing here" headingLevel={3}>No notifications of this kind.</EmptyState>}
        </Stack>
      </SidePanel>
    </Card>
  );
}

/* ───────────── 5 · Request leave (a form in a panel) ───────────── */

type MyRequest = { id: string; kind: Exclude<LeaveKind, "remote">; dates: string; days: number; status: RequestStatus };
const balances = { annual: 15, sick: 12, unpaid: 5 };
const shortDate = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
/** DateField text (MM/DD/YYYY, typed or picked) → a date, or null while it is incomplete or not a real day. */
const parseDay = (text: string) => {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const date = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
  return date.getMonth() === Number(match[1]) - 1 ? date : null;
};
/** Working days from → to, both included (weekends skipped). */
const workingDays = (from: Date, to: Date) => {
  let days = 0;
  for (const day = new Date(from); day <= to; day.setDate(day.getDate() + 1)) if (day.getDay() % 6 !== 0) days += 1;
  return days;
};

function SubmitLeaveExample() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<MyRequest[]>([{ id: "r1", kind: "annual", dates: "Aug 18 – Aug 19", days: 2, status: "approved" }]);
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [kind, setKind] = useState<MyRequest["kind"]>("annual");
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const pendingDays = (type: MyRequest["kind"]) => requests.filter((request) => request.kind === type && request.status !== "rejected").reduce((sum, request) => sum + request.days, 0);
  const left = (type: MyRequest["kind"]) => balances[type] - pendingDays(type);
  const end = halfDay ? from : to;
  const days = from && end && end >= from ? (halfDay ? 0.5 : workingDays(from, end)) : 0;
  const fromError = tried && !from ? "Choose the first day" : undefined;
  const toError = !halfDay && from && to && to < from ? "The last day is before the first" : tried && !halfDay && !to ? "Choose the last day" : undefined;
  const openForm = () => { setFormKey((value) => value + 1); setKind("annual"); setFrom(null); setTo(null); setHalfDay(false); setReason(""); setTried(false); setOpen(true); };
  const submit = () => {
    setTried(true);
    if (!from || !end || end < from || days > left(kind)) return;
    const dates = halfDay || from.getTime() === end.getTime() ? shortDate(from) : `${shortDate(from)} – ${shortDate(end)}`;
    setRequests((list) => [{ id: `r${list.length + 1}`, kind, dates, days, status: "pending" }, ...list]);
    setOpen(false);
    toast({ type: "positive", title: "Leave request sent", children: `${kindLabel[kind]} · ${dates} · Duy Le approves it` });
  };
  return (
    <Stack gap="md">
      <Grid columns="repeat(auto-fit, minmax(min(100%, 200px), 1fr))" gap="sm">
        <MetricCard theme="border" size="md" label="Annual leave" value={plural(left("annual"), "day")} iconTheme="emoji" iconEmoji="🏝️" />
        <MetricCard theme="border" size="md" label="Sick leave" value={plural(left("sick"), "day")} iconTheme="emoji" iconEmoji="🤒" />
        <MetricCard theme="border" size="md" label="Unpaid leave" value={plural(left("unpaid"), "day")} iconTheme="emoji" iconEmoji="🥵" />
      </Grid>
      <Card theme="border" spacing="small">
        <Stack gap="xs">
          {/* The card's title is a widget title (Heading/Subheading); its one action sits beside it. */}
          <div className="psp-toolbar">
            <Heading level={2} textStyle="Heading/Subheading">My requests</Heading>
            <Button level="primary" size="sm" startIcon="icon-plus-line" aria-haspopup="dialog" onClick={openForm}>Request leave</Button>
          </div>
          <List aria-label="My requests">
            {requests.map((request) => (
              <ListItem key={request.id} title={kindLabel[request.kind]} caption={`${request.dates} · ${plural(request.days, "day")}`} leading={<KindMark kind={request.kind} />}
                trailing={<Badge size="sm" theme={requestBadge[request.status].theme} background="subtle">{requestBadge[request.status].label}</Badge>} />
            ))}
          </List>
        </Stack>
      </Card>
      <SidePanel open={open} onOpenChange={setOpen} type="modal" title="Request leave" description="Duy Le, your manager, approves it."
        primaryAction={{ label: "Send request", onClick: submit }} secondaryAction={{ label: "Cancel" }}>
        <Fragment key={formKey}>
          <SelectField label="Leave type" value={kind} onValueChange={(value) => setKind(value as MyRequest["kind"])}
            options={(Object.keys(balances) as Array<MyRequest["kind"]>).map((type) => ({ value: type, label: `${kindLabel[type]} · ${plural(left(type), "day")} left` }))} />
          <Toggle label="Half day" caption="Morning or afternoon of one day" checked={halfDay} onCheckedChange={setHalfDay} />
          <Grid columns="repeat(auto-fit, minmax(min(100%, 150px), 1fr))" gap="sm">
            <DateField label={halfDay ? "Day" : "First day"} onValueChange={(text) => setFrom(parseDay(text))} error={fromError} />
            {halfDay ? null : <DateField label="Last day" onValueChange={(text) => setTo(parseDay(text))} error={toError} />}
          </Grid>
          <TextAreaField label="Note for your manager" labelOptional placeholder="Handover, who covers for you…" value={reason} onValueChange={setReason} />
          {days > 0 ? (
            <InlineMessage theme={days > left(kind) ? "negative" : "info"} title={`${days === 0.5 ? "Half a day" : plural(days, "working day")} of ${kindLabel[kind].toLowerCase()}`}>
              {days > left(kind) ? `You have ${plural(left(kind), "day")} left: shorten the dates or pick another type.` : `${plural(left(kind) - days, "day")} left after this request.`}
            </InlineMessage>
          ) : null}
        </Fragment>
      </SidePanel>
    </Stack>
  );
}

/* ───────────── Pages and examples ───────────── */

export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = keepOnHotUpdate(import.meta.hot, "pages", {});

export const examples: ExampleMap = keepOnHotUpdate(import.meta.hot, "examples", {
  "side-panel": [
    { title: "Employee profile", screen: true, wide: true, description: "People directory (HR-Platform): a row opens a Modal panel with the whole record in Tabs (details, leave balances, documents); Close returns focus to the row. The table is read-only, so the row itself is the click target (onRowClick), not an Open button.", render: () => <PeopleDirectoryExample />, code: `// The table sits straight on the page; the open row stays selected while its panel shows it.
<Table rows={people} onRowClick={(row) => setOpenId(row.id)} selectedIds={openId ? [openId] : []} columns={[
  { id: "name", header: "Employee", cell: nameCell },
  …
]} />
<SidePanel open={Boolean(person)} onOpenChange={(open) => !open && setOpenId(null)} type="modal"
  title={person.name} description={\`\${person.role} · \${person.department}\`}
  primaryAction={{ label: "Send message", onClick: message }} secondaryAction={{ label: "Close" }}>
  <Tabs items={[{ id: "overview", label: "Overview" }, { id: "time-off", label: "Time off" }, { id: "documents", label: "Documents", badge: 3 }]} … />
  <TabPanel id="overview"><DescriptionList divider items={details} /></TabPanel>
</SidePanel>` },
    { title: "Filters for a queue", screen: true, wide: true, description: "Approvals: the All filters chip opens a Small Modal panel. The button counts the results before you apply; Reset clears the draft, × on the chip clears the applied filters. Approve or reject a row in place.", render: () => <ApprovalFiltersExample />, code: `<Chip leading="icon-filter-lines-line" selectionMode="multiple" selectionCount={active} selected={active > 0}
  aria-haspopup="dialog" onClick={openFilters} onClearSelection={clearAll}>All filters</Chip>
// Approve and Reject act at once and offer Undo; focus moves on to the next request.
toast({ title: "Annual leave approved", children: "Bao Nguyen · Oct 6 – Oct 10", action: { label: "Undo", onClick: restore } });
<SidePanel open={open} onOpenChange={setOpen} type="modal" size="small" title="Filters"
  primaryAction={{ label: \`Show \${preview} results\`, onClick: apply }}
  secondaryAction={{ label: "Reset", onClick: resetDraft }}>
  <Stack role="group" aria-labelledby="status-label">…<Checkbox label="Pending" caption="4 requests" /></Stack>
  <Divider decorative />
  <SelectField label="Team" … />
  <Toggle label="5 days or longer" … />
</SidePanel>` },
    { title: "Docked inspector", screen: true, wide: true, description: "A Standard panel docks beside a page builder, so the page stays live: pick a layer, then edit its name, size, radius and visibility and watch the artboard follow. The toolbar button shows and hides the panel.", render: () => <InspectorExample />, code: `<div className="builder">
  <main>…layers and artboard…</main>
  {/* Standard panels are not modal: Close and Escape hand focus back to the toolbar button (showPanel). */}
  <SidePanel open={open} onOpenChange={showPanel} type="standard" size="small" title={layer.name} description="Section · Homepage">
    <InputField label="Layer name" value={layer.name} onValueChange={rename} />
    <Grid columns={2}><NumberField label="Width" … /><NumberField label="Height" … /></Grid>
    <SelectField label="Corner radius" … />
    <Toggle label="Show on the page" … />
  </SidePanel>
</div>` },
    { title: "Notifications", wide: true, description: "The bell (App Shell action with an unread count) opens a read-only Modal panel: filter chips, Today / Earlier groups, a New badge with hidden “Unread” text. Opening an item or Mark all read clears the count.", render: () => <NotificationsExample />, code: `<AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} aria-haspopup="dialog" onClick={open} />
<SidePanel open={open} onOpenChange={setOpen} type="modal" size="small" title="Notifications" description="3 unread notifications">
  <Chip level="primary" variant="normal" size="small" selected={filter === "all"} aria-pressed={filter === "all"} onClick={…}>All</Chip> …
  <List aria-label="Today notifications">
    <ListItem title="Ava Chen" caption="Mentioned you: “…” · 2 minutes ago" onClick={markRead}
      trailing={<><Badge size="xs" theme="accent" background="subtle" aria-hidden="true">New</Badge><VisuallyHidden>Unread</VisuallyHidden></>} />
  </List>
</SidePanel>` },
    { title: "Request leave", wide: true, description: "My leaves (HR-Platform): Request leave opens a form in a Modal panel. It counts working days, warns when the balance is too small and validates the dates; the request joins the list as Pending and the balance drops.", render: () => <SubmitLeaveExample />, code: `<SidePanel open={open} onOpenChange={setOpen} type="modal" title="Request leave" description="Duy Le, your manager, approves it."
  primaryAction={{ label: "Send request", onClick: submit }} secondaryAction={{ label: "Cancel" }}>
  <SelectField label="Leave type" options={types} … />
  <Toggle label="Half day" … />
  <Grid columns={2}><DateField label="First day" error={fromError} … /><DateField label="Last day" … /></Grid>
  <TextAreaField label="Note for your manager" labelOptional … />
  <InlineMessage theme="info" title="2 working days of annual leave">13 days left after this request.</InlineMessage>
</SidePanel>` },
  ],
});
