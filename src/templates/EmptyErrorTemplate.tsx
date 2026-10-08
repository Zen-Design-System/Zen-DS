/**
 * Template: empty and error states (the Projects page of a workspace). Copy it into your app, then replace the sample
 * data, the request and the handlers. Render it inside your app's <ZenProvider>. Uses only @zen/design-system
 * components, no custom CSS.
 *
 * - Loading: skeleton rows stand in for the table and a status announces it. In this demo the very first request
 *   fails, so the page opens on its error: a Negative InlineMessage whose Try again loads the projects.
 * - Filtered to nothing: Search and the Status and Lead chips narrow the table (on a phone the chips open Bottom
 *   Sheets); when nothing matches, its Empty State offers Clear filters (or Clear search).
 * - First use: the workspace switcher at the top of the Sidebar (or Bao's invite in Notifications) opens Đìzai Labs,
 *   which has no projects yet. Create project opens a validated ModalForm and the new project fills the table.
 * - Not found: a notification links to a project that was deleted since; the page says so and leads back to the list.
 * - A row opens its project in a Side Panel and stays selected while it is open; Notifications open in a Side Panel too.
 * - A button that replaces its own view (Try again, Clear filters, View all projects) hands focus to the list's Search.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppShell,
  AppShellAccount,
  AppShellAction,
  Avatar,
  Badge,
  BottomSheet,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Container,
  DescriptionList,
  DockIcon,
  EmptyState,
  Grid,
  Icon,
  InlineMessage,
  InputField,
  List,
  ListItem,
  Menu,
  ModalForm,
  PageHeader,
  Search,
  SelectField,
  SidePanel,
  Sidebar,
  SkeletonShape,
  SkeletonText,
  Stack,
  Table,
  TableBadges,
  TableMedia,
  TableText,
  Text,
  VisuallyHidden,
  plural,
  useFormState,
  useToast,
  useZen,
  type AvatarTheme,
  type BadgeTheme,
  type DockIconTheme,
  type IconName,
  type SidebarSection,
  type TableColumn,
} from "@zen/design-system";
import alexPhoto from "./hr/assets/account-photo.jpg";

/* ── Sample data: replace with your own ─────────────────────────────── */
/** "Now" for the sample timestamps: Wednesday, Sep 30, 2026 at 3:20 pm. */
const NOW = new Date(2026, 8, 30, 15, 20);
/** How long the sample request takes before it answers. */
const REQUEST_TIME = 700;

type WorkspaceId = "studio" | "labs";
const workspaces: Record<WorkspaceId, { name: string; initial: string; theme: AvatarTheme; about: string }> = {
  studio: { name: "Đìzai Studio", initial: "Đ", theme: "violet", about: "Client and studio work at Đìzai Studio." },
  labs: { name: "Đìzai Labs", initial: "L", theme: "teal", about: "Experiments and internal tools at Đìzai Labs." },
};
const workspaceIds = Object.keys(workspaces) as WorkspaceId[];

type Person = { name: string; theme: AvatarTheme; photo?: string };
/** The signed-in user: Alex Duong, Design Lead. */
const ME = "alex";
const people: Record<string, Person> = {
  alex: { name: "Alex Duong", theme: "blue", photo: alexPhoto },
  bao: { name: "Bao Nguyen", theme: "green" },
  chi: { name: "Chi Tran", theme: "pink" },
  duy: { name: "Duy Le", theme: "teal" },
  em: { name: "Em Pham", theme: "orange" },
  gia: { name: "Gia Pham", theme: "indigo" },
  hana: { name: "Hana Kim", theme: "plum" },
  minhanh: { name: "Minh Anh Vo", theme: "violet" },
};

type Status = "Active" | "On hold" | "Completed";
const statuses: Status[] = ["Active", "On hold", "Completed"];
const statusTheme: Record<Status, BadgeTheme> = { Active: "blue", "On hold": "yellow", Completed: "green" };

type Kind = "product" | "website" | "brand" | "system" | "research";
const kinds: Record<Kind, { label: string; icon: IconName; theme: DockIconTheme }> = {
  product: { label: "Product design", icon: "icon-monitor-01-line", theme: "blue" },
  website: { label: "Website", icon: "icon-globe-01-line", theme: "teal" },
  brand: { label: "Brand", icon: "icon-palette-line", theme: "pink" },
  system: { label: "Design system", icon: "icon-layers-three-01-line", theme: "violet" },
  research: { label: "Research", icon: "icon-compass-line", theme: "orange" },
};
const clients = ["Internal", "Lotus Coffee Co.", "Saigon Bloom", "Mekong Travel", "Ledgerly", "Hanoi Metro", "Studio Marin"];

/** Due dates are calendar days; `updated` is a local timestamp. */
type Project = { id: string; name: string; kind: Kind; client: string; lead: string; status: Status; due: string | null; updated: string };
const seed: Record<WorkspaceId, Project[]> = {
  studio: [
    { id: "lotus-rewards", name: "Lotus Coffee rewards app", kind: "product", client: "Lotus Coffee Co.", lead: "alex", status: "Active", due: "2026-10-23", updated: "2026-09-30T14:52" },
    { id: "saigon-bloom-brand", name: "Saigon Bloom brand refresh", kind: "brand", client: "Saigon Bloom", lead: "bao", status: "Active", due: "2026-10-09", updated: "2026-09-30T13:05" },
    { id: "mekong-booking", name: "Mekong Travel booking flow", kind: "product", client: "Mekong Travel", lead: "chi", status: "Active", due: "2026-11-06", updated: "2026-09-30T11:40" },
    { id: "ledgerly-system", name: "Ledgerly design system", kind: "system", client: "Ledgerly", lead: "minhanh", status: "Active", due: "2026-10-30", updated: "2026-09-29T17:48" },
    { id: "hanoi-metro-kiosk", name: "Hanoi Metro ticket kiosk", kind: "product", client: "Hanoi Metro", lead: "duy", status: "On hold", due: "2026-12-11", updated: "2026-09-28T10:30" },
    { id: "accessibility-audit", name: "Q3 accessibility audit", kind: "research", client: "Internal", lead: "em", status: "Completed", due: "2026-09-25", updated: "2026-09-25T11:00" },
    { id: "careers-site", name: "Đìzai careers site", kind: "website", client: "Internal", lead: "gia", status: "On hold", due: "2027-01-15", updated: "2026-09-24T15:02" },
    { id: "marin-website", name: "Studio Marin website", kind: "website", client: "Studio Marin", lead: "hana", status: "Completed", due: "2026-09-18", updated: "2026-09-18T16:20" },
  ],
  // Created this morning: nothing in it yet.
  labs: [],
};

/** Each notification links somewhere; the Saigon Bloom pitch was deleted after Chi shared it. */
type Notice = { id: string; from: string; title: string; caption: string; workspace: WorkspaceId; project?: { id: string; name: string } };
const notices: Notice[] = [
  { id: "labs-invite", from: "bao", title: "Bao Nguyen invited you", caption: "Đìzai Labs workspace · 9:05 am", workspace: "labs" },
  { id: "pitch", from: "chi", title: "Chi Tran added you to a project", caption: "Saigon Bloom pitch · Yesterday at 4:12 pm", workspace: "studio", project: { id: "saigon-bloom-pitch", name: "Saigon Bloom pitch" } },
  { id: "kiosk", from: "duy", title: "Duy Le put a project on hold", caption: "Hanoi Metro ticket kiosk · Monday at 10:30 am", workspace: "studio", project: { id: "hanoi-metro-kiosk", name: "Hanoi Metro ticket kiosk" } },
];

const nav: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "clients", label: "Clients", icon: "icon-briefcase-line" },
    { id: "reports", label: "Reports", icon: "icon-bar-chart-01-line" },
    { id: "settings", label: "Settings", icon: "icon-settings-01-line" },
  ] },
];

/* ── Helpers ─────────────────────────────────────────────────────────── */
/** Avatar text: two initials ("Minh Anh Vo" → "MV"). */
const initials = (name: string) => { const parts = name.split(" "); return `${parts[0][0]}${parts.length > 1 ? parts.at(-1)![0] : ""}`.toUpperCase(); };
const leadName = (id: string) => (id === ME ? `${people[id].name} (you)` : people[id].name);
const personAvatar = (id: string, size: "xs" | "md") => (
  <Avatar size={size} theme={people[id].theme} background="subtle" src={people[id].photo} alt="">{initials(people[id].name)}</Avatar>
);
/** "2026-10-23" → "Oct 23, 2026". */
const formatDate = (day: string) => {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
/** Timestamps follow one ladder: Just now · 13 minutes ago · 10:30 am · Yesterday at 10:30 am · Friday at 10:30 am ·
 * Sep 14 at 10:30 am · Dec 18, 2025. */
const clock = (date: Date) => date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
function whenUpdated(iso: string) {
  const date = new Date(iso);
  const minutes = Math.floor((NOW.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes === 1 ? "1 minute" : `${minutes} minutes`} ago`;
  const days = Math.round((dayStart(NOW) - dayStart(date)) / 86400000);
  if (days === 0) return clock(date);
  if (days === 1) return `Yesterday at ${clock(date)}`;
  if (days < 7) return `${date.toLocaleDateString("en-US", { weekday: "long" })} at ${clock(date)}`;
  if (date.getFullYear() === NOW.getFullYear()) return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${clock(date)}`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
/** A local timestamp for "now", in the same shape as the sample data. */
const stamp = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
/** A project's type as a Dock Icon: Small in the table, Medium in the phone list. */
const kindIcon = (kind: Kind, size: "sm" | "md") => <DockIcon icon={kinds[kind].icon} theme={kinds[kind].theme} background="subtle" size={size} />;
/** Medium in the table; Small beside a phone row's title, so the project name keeps its room. */
const statusBadge = (status: Status, size: "sm" | "md" = "md") => <Badge size={size} theme={statusTheme[status]} background="subtle">{status}</Badge>;

/* ── Table columns (most recently updated first); the loading rows mirror them, so the table keeps its shape ── */
const columnWidths = { lead: "200px", status: "128px", due: "136px" };
const columns: TableColumn<Project>[] = [
  { id: "project", header: "Project", cell: (row) => (
    <TableMedia bold caption={row.client} media={kindIcon(row.kind, "sm")}>{row.name}</TableMedia>
  ) },
  { id: "lead", header: "Lead", width: columnWidths.lead, cell: (row) => <TableMedia bold={false} media={personAvatar(row.lead, "xs")}>{leadName(row.lead)}</TableMedia> },
  { id: "status", header: "Status", width: columnWidths.status, cell: (row) => <TableBadges>{statusBadge(row.status)}</TableBadges> },
  { id: "due", header: "Due date", width: columnWidths.due, cell: (row) => (
    <TableText>{row.due ? formatDate(row.due) : <><Text as="span" aria-hidden="true">—</Text><VisuallyHidden>No due date</VisuallyHidden></>}</TableText>
  ) },
];
const loadingRows = ["1", "2", "3", "4", "5"];
const loadingColumns: TableColumn<string>[] = [
  { id: "project", header: "Project", cell: () => <Stack direction="row" gap="sm" align="center"><SkeletonShape shape="round" size="sm" /><SkeletonText lines={2} /></Stack> },
  { id: "lead", header: "Lead", width: columnWidths.lead, cell: () => <Stack direction="row" gap="sm" align="center"><SkeletonShape shape="round" size="xs" /><SkeletonText lines={1} /></Stack> },
  { id: "status", header: "Status", width: columnWidths.status, cell: () => <SkeletonShape shape="pill" size="xs" /> },
  { id: "due", header: "Due date", width: columnWidths.due, cell: () => <SkeletonText lines={1} /> },
];

type Request = { status: "loading" | "failed" | "ready"; failNext: boolean };
type Panel = { kind: "inbox" } | { kind: "project"; id: string } | null;

export function EmptyErrorTemplate() {
  const { toast, dismiss } = useToast();
  // Phones list the projects (List + ListItem, status trailing) instead of a table that would scroll sideways; the
  // project's Side Panel shows its lead and due date.
  const phone = useZen()?.breakpoint === "mobile";
  const [workspace, setWorkspace] = useState<WorkspaceId>("studio");
  const [projects, setProjects] = useState(seed);
  // In this demo the very first request fails, so the page opens on its error state; Try again and every later
  // request succeed.
  const [request, setRequest] = useState<Request>({ status: "loading", failNext: true });
  /** The name a stale link pointed to, while the page shows Not found. */
  const [missing, setMissing] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [leadFilter, setLeadFilter] = useState<string[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [unread, setUnread] = useState(notices.length);
  const [creating, setCreating] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  /** The phone's filter sheet. */
  const [sheet, setSheet] = useState<"status" | "lead" | null>(null);
  // A button that replaces the view it sits in (Try again, Clear filters, View all projects) sets this, and focus moves
  // to the list's search field once the list shows, instead of falling back to the page.
  const searchRef = useRef<HTMLInputElement>(null);
  const focusSearch = useRef(false);
  useEffect(() => {
    if (!focusSearch.current || !searchRef.current) return;
    focusSearch.current = false;
    searchRef.current.focus();
  });

  // Your request goes here, e.g. fetch(`/api/workspaces/${workspace}/projects`); the sample only waits a moment.
  useEffect(() => {
    if (request.status !== "loading") return;
    const timer = window.setTimeout(() => setRequest((current) => ({ status: current.failNext ? "failed" : "ready", failNext: false })), REQUEST_TIME);
    return () => window.clearTimeout(timer);
  }, [request.status, workspace]);

  const all = projects[workspace];
  const leads = useMemo(() => Object.keys(people).filter((id) => all.some((project) => project.lead === id)), [all]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((project) => (!q || project.name.toLowerCase().includes(q) || project.client.toLowerCase().includes(q))
        && (!statusFilter.length || statusFilter.includes(project.status))
        && (!leadFilter.length || leadFilter.includes(project.lead)))
      .sort((a, b) => b.updated.localeCompare(a.updated));
  }, [all, query, statusFilter, leadFilter]);
  const firstUse = request.status === "ready" && all.length === 0;
  const peek = panel?.kind === "project" ? all.find((project) => project.id === panel.id) : undefined;

  /* ── Actions ── */
  const notInDemo = (label: string) => toast({ title: `${label} isn't part of this demo` });
  const clearFilters = () => { setQuery(""); setStatusFilter([]); setLeadFilter([]); };
  const retry = () => { focusSearch.current = true; setRequest({ status: "loading", failNext: false }); };
  const showList = () => { setMissing(null); setPanel(null); };
  /** Not found's View all projects and its breadcrumb: the list replaces the page they sit on. */
  const backToList = () => { focusSearch.current = true; showList(); };
  const openProject = (id: string) => { setMissing(null); setPanel({ kind: "project", id }); };
  /** Another workspace means another request: the page starts again from its loading state. */
  const switchWorkspace = (id: WorkspaceId) => {
    setNavOpen(false);
    if (id === workspace) return;
    setWorkspace(id);
    setMissing(null);
    setPanel(null);
    clearFilters();
    setRequest({ status: "loading", failNext: false });
  };
  /** A notification opens what it links to, as a link from an email would; a project that no longer exists shows Not found. */
  const openNotice = (notice: Notice) => {
    switchWorkspace(notice.workspace);
    if (notice.project && projects[notice.workspace].some((project) => project.id === notice.project?.id)) openProject(notice.project.id);
    else {
      setPanel(null);
      setMissing(notice.project ? notice.project.name : null);
    }
  };

  const form = useFormState({
    initialValues: { name: "", client: "Internal", kind: "product", lead: ME },
    validate: (values) => {
      const name = values.name.trim();
      return {
        name: !name ? "Enter a project name, like Rewards app redesign"
          : all.some((project) => project.name.toLowerCase() === name.toLowerCase()) ? `${workspaces[workspace].name} already has a project called “${name}”`
          : undefined,
      };
    },
    onSubmit: (values, { reset }) => {
      const project: Project = { id: `${workspace}-${Date.now()}`, name: values.name.trim(), kind: values.kind as Kind, client: values.client, lead: values.lead, status: "Active", due: null, updated: stamp(NOW) };
      // The first project replaces the empty state whose Create project opened the form.
      if (!all.length) focusSearch.current = true;
      setProjects((current) => ({ ...current, [workspace]: [project, ...current[workspace]] }));
      setCreating(false);
      reset();
      const id = toast({ title: "Project created", children: project.name, action: { label: "View", onClick: () => { dismiss(id); openProject(project.id); } } });
    },
  });
  const startCreate = () => { form.reset(); setCreating(true); };

  /* ── Filters: Chip popovers on a desktop; on a phone each chip opens a Bottom Sheet with the same choices ── */
  const filters = {
    status: { label: "Status", options: statuses.map((status) => ({ id: status, label: status })), values: statusFilter, setValues: setStatusFilter },
    lead: { label: "Lead", options: leads.map((id) => ({ id, label: people[id].name })), values: leadFilter, setValues: setLeadFilter },
  };
  const filterChip = (id: keyof typeof filters) => {
    const { label, options, values, setValues } = filters[id];
    const shared = { variant: "advanced", size: "md", dropdown: true, selectionMode: "multiple", selected: values.length > 0, selectionCount: values.length, onClearSelection: () => setValues([]) } as const;
    const chipLabel = values.length === 1 ? options.find((option) => option.id === values[0])?.label : label;
    return phone
      ? <Chip key={id} {...shared} aria-haspopup="dialog" aria-expanded={sheet === id} onClick={() => setSheet(id)}>{chipLabel}</Chip>
      : (
        <Chip key={id} {...shared} popoverMultiple popoverLabel={label} popoverItems={options.map((option) => ({ ...option, selected: values.includes(option.id) }))}
          onPopoverSelect={(item) => setValues(toggle(values, item.id))}>{chipLabel}</Chip>
      );
  };
  const sheetFilter = sheet ? filters[sheet] : null;
  const filtered = statusFilter.length > 0 || leadFilter.length > 0;

  /* ── The region under the page header: one state at a time ── */
  let content;
  // Search fills its column; the filter chips (and Clear all, once both are on) share the rest. It shows while the
  // projects load too, so the rows stay where they are when the skeleton rows give way to the loaded ones.
  const toolbar = (
    <Grid columns={{ mobile: 1, desktop: "minmax(0, 320px) 1fr" }} gap="sm" align="center">
      <Search ref={searchRef} aria-label="Search projects" placeholder="Search projects" value={query} onValueChange={setQuery} />
      <Stack direction="row" gap="xs" align="center" wrap>
        {filterChip("status")}
        {filterChip("lead")}
        {statusFilter.length > 0 && leadFilter.length > 0 ? <Button level="tertiary" onClick={() => { setStatusFilter([]); setLeadFilter([]); }}>Clear all</Button> : null}
      </Stack>
    </Grid>
  );
  if (missing !== null) {
    content = (
      <EmptyState headingLevel={2} icon="icon-link-broken-01-line" title="Project not found" primaryAction={{ label: "View all projects", onClick: backToList }}>
        {missing} may have been deleted, or you no longer have access to it.
      </EmptyState>
    );
  } else if (request.status === "loading") {
    content = (
      <Stack gap="md">
        {toolbar}
        <Stack aria-busy="true">
          <VisuallyHidden role="status">Loading projects</VisuallyHidden>
          {phone ? (
            <List aria-label="Projects">
              {loadingRows.map((row) => <ListItem key={row} title={<SkeletonText lines={1} />} caption={<SkeletonText lines={1} />} leading={<SkeletonShape shape="round" size="md" />} />)}
            </List>
          ) : <Table aria-label="Projects" rows={loadingRows} getRowId={(row) => row} columns={loadingColumns} />}
        </Stack>
      </Stack>
    );
  } else if (request.status === "failed") {
    content = (
      // Side content stops at xl (1440px) on the full-width page (backlog batch 6b).
      <Box maxWidth={1440}>
        <InlineMessage theme="negative" title="Couldn't load projects" action={{ label: "Try again", onClick: retry }}>
          The server didn't respond in time. Your projects are safe.
        </InlineMessage>
      </Box>
    );
  } else if (firstUse) {
    content = (
      <EmptyState headingLevel={2} icon="icon-folder-plus-line" title="No projects yet" primaryAction={{ label: "Create project", onClick: startCreate }}>
        Create a project to plan the work, share files and track due dates in one place.
      </EmptyState>
    );
  } else {
    const noMatch = filtered || !query.trim()
      ? <EmptyState headingLevel={2} illustration={false} icon="icon-search-medium-line" title="No projects match" secondaryAction={{ label: "Clear filters", onClick: () => { focusSearch.current = true; clearFilters(); } }}>{query.trim() ? "Try another search, status or lead." : "Try another status or lead."}</EmptyState>
      : <EmptyState headingLevel={2} illustration={false} icon="icon-search-medium-line" title={`No results for “${query.trim()}”`} secondaryAction={{ label: "Clear search", onClick: () => { focusSearch.current = true; setQuery(""); } }}>Search by project or client name.</EmptyState>;
    content = (
      <Stack gap="md">
        {toolbar}
        {/* The open project's row stays selected while its panel shows. */}
        {!phone ? <Table aria-label="Projects" rows={shown} getRowId={(row) => row.id} columns={columns} selectedIds={peek ? [peek.id] : []} onRowClick={(row) => openProject(row.id)} empty={noMatch} />
          : shown.length ? (
            <List aria-label="Projects">
              {shown.map((project) => (
                <ListItem key={project.id} title={project.name} caption={project.client} leading={kindIcon(project.kind, "md")} trailing={statusBadge(project.status, "sm")}
                  selected={peek?.id === project.id} onClick={() => openProject(project.id)} />
              ))}
            </List>
          ) : noMatch}
      </Stack>
    );
  }

  return (
    <AppShell
      navOpen={navOpen}
      onNavOpenChange={setNavOpen}
      sidebar={(
        <Sidebar
          variant="workspace"
          workspaceItems={workspaceIds.map((id) => ({ id, label: workspaces[id].name, selected: id === workspace,
            icon: <Avatar size="md" shape="square" theme={workspaces[id].theme} background="solid" alt="">{workspaces[id].initial}</Avatar> }))}
          sections={nav}
          selectedId="projects"
          // Your router goes here: navigate(`/${item.id}`).
          onItemClick={(item) => {
            if (workspaceIds.includes(item.id as WorkspaceId)) switchWorkspace(item.id as WorkspaceId);
            else if (item.id === "projects") showList();
            else notInDemo(item.label);
          }}
        />
      )}
      header={missing !== null
        ? <Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: "missing", label: "Project not found" }]} onNavigate={(_item, event) => { event.preventDefault(); backToList(); }} />
        : undefined}
      headerActions={<>
        <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} aria-expanded={panel?.kind === "inbox"}
          onClick={() => { setUnread(0); setPanel((current) => (current?.kind === "inbox" ? null : { kind: "inbox" })); }} />
        <Menu align="end" trigger={<AppShellAccount name={people[ME].name} src={alexPhoto} />} items={[
          { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => notInDemo("Profile") },
          { type: "separator" },
          { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => notInDemo("Signing out") },
        ]} />
      </>}
      // Keyed by kind: a notification that opens a project mounts a new panel, which takes focus as a modal panel does.
      aside={panel?.kind === "inbox" ? (
        <SidePanel key="inbox" type="standard" title="Notifications" open onOpenChange={(open) => { if (!open) setPanel(null); }}>
          {/* The panel body scrolls with no top padding: sm above and below holds the first and last row's fill. */}
          <Box paddingY="sm">
            <List aria-label="Notifications">
              {notices.map((notice) => (
                <ListItem key={notice.id} title={notice.title} caption={notice.caption} leading={personAvatar(notice.from, "md")} onClick={() => openNotice(notice)} />
              ))}
            </List>
          </Box>
        </SidePanel>
      ) : peek ? (
        <SidePanel key="project" type="standard" title={peek.name} description={peek.client} open onOpenChange={(open) => { if (!open) setPanel(null); }}>
          <DescriptionList items={[
            { term: "Status", description: statusBadge(peek.status) },
            { term: "Type", description: kinds[peek.kind].label },
            { term: "Lead", description: leadName(peek.lead) },
            { term: "Due date", description: peek.due ? formatDate(peek.due) : "No due date" },
            { term: "Updated", description: whenUpdated(peek.updated) },
          ]} />
        </SidePanel>
      ) : undefined}
    >
      <Container maxWidth="full">
        <Stack gap="lg" paddingY="lg">
          <PageHeader
            title="Projects"
            description={workspaces[workspace].about}
            // One Primary per page: first use and Not found carry their own next step.
            actions={missing === null && !firstUse ? <Button level="primary" startIcon="icon-plus-line" onClick={startCreate}>New project</Button> : undefined}
          />
          {content}
        </Stack>
      </Container>

      <ModalForm open={creating} onOpenChange={setCreating} title="New project" onSubmit={form.handleSubmit}
        description={`Everyone in ${workspaces[workspace].name} can see it.`}
        primaryAction={{ label: "Create project" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Project name" placeholder="Rewards app redesign" autoComplete="off" data-autofocus="" {...form.field("name")} />
        <SelectField label="Client" options={clients.map((client) => ({ label: client, value: client }))} {...form.selectField("client")} />
        <SelectField label="Type" options={(Object.keys(kinds) as Kind[]).map((kind) => ({ label: kinds[kind].label, value: kind }))} {...form.selectField("kind")} />
        <SelectField label="Lead" options={Object.keys(people).map((id) => ({ label: leadName(id), value: id }))} {...form.selectField("lead")} />
      </ModalForm>

      {/* Phone filters: several choices can be on, so picking keeps the sheet open; Show closes it. */}
      <BottomSheet open={sheetFilter !== null} onOpenChange={(open) => { if (!open) setSheet(null); }} title={sheetFilter?.label ?? "Filter"}
        primaryAction={{ label: `Show ${plural(shown.length, "project")}` }}>
        {sheetFilter ? (
          <List aria-label={sheetFilter.label}>
            {sheetFilter.options.map((option) => {
              const selected = sheetFilter.values.includes(option.id);
              return <ListItem key={option.id} title={option.label} selected={selected} trailing={selected ? <Icon name="icon-check-line" size="base" decorative /> : undefined}
                onClick={() => sheetFilter.setValues(toggle(sheetFilter.values, option.id))} />;
            })}
          </List>
        ) : null}
      </BottomSheet>
    </AppShell>
  );
}
