/* Menu examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one Menu decision: a table row opens the invoice while its ⋯
   holds the other actions, a page's More menu groups its commands and keeps an unavailable one visible with the
   reason, a New menu composes items with file icons and captions, the keyboard and letter shortcuts of an Actions
   menu, and a short row menu on a phone. */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader } from "../../../components/AppShell";
import { Avatar } from "../../../components/Avatar";
import { Badge, BadgeCounter } from "../../../components/Badge";
import { BottomNavigation, type BottomNavigationItem } from "../../../components/BottomNavigation";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { BottomSheet } from "../../../components/BottomSheet";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { Dialog, ModalForm } from "../../../components/Dialog";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { useFormState } from "../../../components/Form";
import { InputField } from "../../../components/Input";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Menu, MenuItem, type MenuEntry, type MenuItemData } from "../../../components/Menu";
import { PageHeader } from "../../../components/PageHeader";
import { ProgressBar } from "../../../components/Progress";
import { Search } from "../../../components/Search";
import { SidePanel } from "../../../components/SidePanel";
import { Sidebar, SidebarMenuItem, type SidebarSection } from "../../../components/Sidebar";
import { Table, TableActions, TableBadges, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { PreviewAppFrame, StudioLogo, StudioMark } from "../../PlatformFrames";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import {
  TODAY, activity, daysFromToday, files as studioFiles, formatBytes, formatDate, formatDue, formatMoney, formatRelative, initials, invoiceStatusTheme, invoices, me, people,
  projectById, projects, projectStatusTheme, studio, taskStatusTheme, tasks, type Invoice, type Person, type PersonId, type Project, type Task,
} from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";

export const page: PlatformPage = "menu";

const copyText = (text: string) => { void navigator.clipboard?.writeText(text).catch(() => null); };

// ——— The studio app's chrome (Project actions) and the Zen app's roots (Row menu on a phone) ————————————————————
/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const studioPlaces: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "projects", label: "Projects", icon: "icon-folder-line" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", counter: tasks.filter((task) => task.assignee === me.id && task.status !== "Done").length },
  { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
  { id: "people", label: "People", icon: "icon-users-line" },
] }];
const unreadActivity = activity.filter((item) => item.unread);

/** A place this example does not draw: the toast says so, and the navigation keeps the current screen. */
function useNotHere() {
  const { toast } = useToast();
  return (label: string) => toast({ title: `${label} isn't part of this example`, children: "This screen shows the menu." });
}

/** The studio's Sidebar on the page it shows; the other places toast that they are not drawn here. */
function StudioSidebar({ selectedId }: { selectedId: string }) {
  const notHere = useNotHere();
  return (
    <Sidebar logo={<StudioLogo src={studio.logo} name={studio.name} />} logoCollapsed={<StudioMark src={studio.logo} name={studio.name} />}
      sections={studioPlaces} selectedId={selectedId} onItemClick={(item) => { if (item.id !== selectedId) notHere(item.label); }}
      footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
  );
}

/** The top row's utilities: notifications (the unread count clears once read) and the account menu, last. */
function StudioActions() {
  const { toast } = useToast();
  const [unread, setUnread] = useState(unreadActivity.length);
  const latest = unreadActivity[0];
  return (
    <>
      <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => {
        setUnread(0);
        toast({ title: unread ? plural(unread, "new notification") : "You're all caught up", children: `${people[latest.actor].name} ${latest.verb} ${latest.object} · ${formatRelative(latest.at)}` });
      }} />
      <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
        { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.location}` }) },
        { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => toast({ title: "Settings", children: "Workspace, notifications and billing." }) },
        { type: "separator" },
        { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
      ]} />
    </>
  );
}

/** Đìzai Studio's Zen app on a phone: the roots of its tab bar. The other roots are not drawn here, so a toast says so
 *  and the bar keeps this root. */
const zenRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "projects", label: "Projects", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
  { id: "files", label: "Files", icon: "icon-file-doc-line", selectedIcon: "icon-file-doc-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
function ZenRoots({ value }: { value: string }) {
  const notHere = useNotHere();
  return (
    <BottomNavigation aria-label={studio.name} showLabels items={zenRoots} value={value}
      onValueChange={(id) => { if (id !== value) notHere(zenRoots.find((item) => item.id === id)?.label ?? id); }} />
  );
}

// ——— 1. Row actions in a table: the row opens the invoice, its ⋯ holds the rest ——————————————————————
/** Where each client's invoices and reminders go. */
const billingEmail: Record<string, string> = {
  "Phin & Co": "trang.le@phinco.vn", "Lumen Bank": "ap@lumenbank.com", "Mekong Freight": "accounts@mekongfreight.vn",
  "Hanoi Book Fair": "finance@hanoibookfair.vn", "Saola Outdoor": "billing@saolaoutdoor.com",
};
const firstInvoices = [...invoices].sort((a, b) => b.number.localeCompare(a.number));
const nextNumber = (list: Invoice[]) => `INV-2026-${String(Math.max(...list.map((invoice) => Number(invoice.number.slice(-4)))) + 1).padStart(4, "0")}`;

function InvoiceRowActions() {
  const { toast } = useToast();
  const [rows, setRows] = useState(firstInvoices);
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Invoice | null>(null);
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const opened = rows.find((row) => row.id === openId);
  const update = (id: string, patch: Partial<Invoice>) => setRows((list) => list.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const send = (row: Invoice) => {
    update(row.id, { status: "Sent", issued: TODAY });
    toast({ title: "Invoice sent", children: `${row.number} to ${billingEmail[row.client]}`, action: { label: "Undo", onClick: () => update(row.id, { status: row.status, issued: row.issued }) } });
  };
  const remind = (row: Invoice) => toast({ title: "Reminder sent", children: `To ${billingEmail[row.client]}` });
  const markPaid = (row: Invoice) => {
    update(row.id, { status: "Paid" });
    toast({ type: "positive", title: "Invoice marked as paid", children: row.number, action: { label: "Undo", onClick: () => update(row.id, { status: row.status }) } });
  };
  const download = (row: Invoice) => toast({ title: "PDF downloaded", children: `${row.number}.pdf` });
  const duplicate = (row: Invoice) => {
    const copy: Invoice = { ...row, id: `copy-${Date.now()}`, number: nextNumber(rows), status: "Draft", issued: TODAY, due: daysFromToday(30) };
    setRows((list) => [copy, ...list]);
    toast({ title: "Invoice duplicated", children: `${copy.number} is a draft`, action: { label: "Undo", onClick: () => setRows((list) => list.filter((item) => item.id !== copy.id)) } });
  };
  // Deleting can't be undone, so it asks first; focus then moves to the next row's menu (or the heading).
  const remove = () => {
    if (!deleting) return;
    const index = rows.findIndex((row) => row.id === deleting.id);
    setRows((list) => list.filter((row) => row.id !== deleting.id));
    toast({ title: "Invoice deleted", children: deleting.number });
    setDeleting(null);
    requestAnimationFrame(() => {
      const triggers = sectionRef.current?.querySelectorAll<HTMLElement>('[aria-haspopup="menu"]') ?? [];
      (triggers[Math.min(index, triggers.length - 1)] ?? sectionRef.current?.querySelector<HTMLElement>("h4"))?.focus();
    });
  };

  // Only the actions that fit the invoice's status; Delete is last, after a separator.
  const actionsFor = (row: Invoice): MenuEntry[] => [
    ...(row.status === "Draft" ? [{ id: "send", label: "Send invoice", icon: "icon-send-01-line", onSelect: () => send(row) } as const] : []),
    ...(row.status === "Sent" || row.status === "Overdue" ? [
      { id: "remind", label: "Send reminder", icon: "icon-mail-01-line", onSelect: () => remind(row) } as const,
      { id: "paid", label: "Mark as paid", icon: "icon-check-circle-line", onSelect: () => markPaid(row) } as const,
    ] : []),
    { id: "pdf", label: "Download PDF", icon: "icon-download-01-line", onSelect: () => download(row) },
    { id: "duplicate", label: "Duplicate", icon: "icon-duplicate-line", onSelect: () => duplicate(row) },
    { type: "separator" },
    { id: "delete", label: "Delete invoice", icon: "icon-trash-line", danger: true, onSelect: () => setDeleting(row) },
  ];
  const columns: TableColumn<Invoice>[] = [
    { id: "number", header: "Invoice", cell: (row) => <TableText bold caption={projectById(row.project).name}>{row.number}</TableText> },
    { id: "client", header: "Client", width: "180px", cell: (row) => <TableText>{row.client}</TableText> },
    { id: "due", header: "Due", width: "140px", cell: (row) => <TableText>{formatDate(row.due)}</TableText> },
    { id: "amount", header: "Amount", align: "right", width: "140px", cell: (row) => <TableText>{formatMoney(row.amount, true)}</TableText> },
    { id: "status", header: "Status", width: "120px", cell: (row) => <TableBadges><Badge theme={invoiceStatusTheme[row.status]} background="subtle">{row.status}</Badge></TableBadges> },
    {
      id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", width: "72px",
      cell: (row) => (
        <TableActions>
          <Menu align="end" items={actionsFor(row)}
            trigger={<IconButton appearance="flat" level="primary" size="md" icon="icon-dots-horizontal-line" aria-label={`Actions for ${row.number}`} />} />
        </TableActions>
      ),
    },
  ];
  // The side panel's one action moves the invoice on.
  const panelAction = (row: Invoice) =>
    row.status === "Draft" ? { label: "Send invoice", onClick: () => { send(row); setOpenId(null); } }
      : row.status === "Paid" ? { label: "Download PDF", onClick: () => { download(row); setOpenId(null); } }
        : { label: "Mark as paid", onClick: () => { markPaid(row); setOpenId(null); } };

  return (
    <Stack as="section" ref={sectionRef} gap="md" aria-labelledby={headingId}>
      <Stack direction="row" justify="between" align="center" gap="xs" wrap>
        <Heading level={4} id={headingId} textStyle="Heading/4" tabIndex={-1}>Invoices</Heading>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "invoice")}</Text>
      </Stack>
      <Table aria-labelledby={headingId} columns={columns} rows={rows} onRowClick={(row) => setOpenId(row.id)}
        empty={<EmptyState size="sm" headingLevel={5} icon="icon-receipt-line" title="No invoices yet">Invoices you send to clients show here.</EmptyState>} />
      <SidePanel type="modal" size="small" open={Boolean(opened)} onOpenChange={(open) => { if (!open) setOpenId(null); }}
        title={opened?.number ?? ""} description={opened?.client}
        primaryAction={opened ? panelAction(opened) : undefined} secondaryAction={{ label: "Close" }}>
        {opened ? (
          <DescriptionList divider items={[
            { term: "Status", description: <Badge theme={invoiceStatusTheme[opened.status]} background="subtle">{opened.status}</Badge> },
            { term: "Project", description: projectById(opened.project).name },
            { term: "Billing email", description: billingEmail[opened.client] },
            { term: "Issued", description: formatDate(opened.issued) },
            { term: "Due", description: formatDate(opened.due) },
            { term: "Amount", description: formatMoney(opened.amount, true), emphasis: true },
          ]} />
        ) : null}
      </SidePanel>
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }} theme="negative"
        title={deleting ? `Delete ${deleting.number}?` : ""}
        description="The invoice and its payment history are removed for everyone. This can't be undone."
        primaryAction={{ label: "Delete invoice", level: "danger", onClick: remove }} secondaryAction={{ label: "Cancel" }} />
    </Stack>
  );
}

// ——— 2. Project actions: a page's More menu, grouped, with an unavailable action and why ————————————————
type ProjectState = Project & { archived?: boolean };
const openTasksOf = (projectId: string) => tasks.filter((task) => task.project === projectId && task.status !== "Done");
/** The fact that matters for each status: when it starts, when it is due, or when it finished. */
const timing = (project: Project) =>
  project.status === "Planning" ? `Starts ${formatDate(project.start)}`
    : project.status === "Completed" ? `Finished ${formatDate(project.due)}`
      : formatDue(project.due);

/** The width of an element, kept current (a list folds its row parts when its column gets narrow). */
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

/** A project's money and time, for the facts card. */
const budgetLine = (project: Project) => (project.budget ? `${formatMoney(project.spent)} of ${formatMoney(project.budget)}` : "Internal, not billed");

function ProjectActions() {
  const { toast } = useToast();
  const notHere = useNotHere();
  const [list, setList] = useState<ProjectState[]>(projects);
  const [openId, setOpenId] = useState<string | null>("phin-loyalty");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const [measureTasks, tasksWidth] = useWidth();
  const narrowTasks = tasksWidth > 0 && tasksWidth < 480;
  const tasksId = useId();
  const detailsId = useId();
  const teamId = useId();
  const filesId = useId();
  const shown = list.filter((project) => !project.archived);
  const project = shown.find((item) => item.id === openId);
  const focus = (selector: string) => requestAnimationFrame(() => frameRef.current?.querySelector<HTMLElement>(selector)?.focus());
  // Opening a project puts focus on Projects in the trail (the way back); the list puts it back on the row it left.
  const open = (id: string) => { setOpenId(id); focus(".zen-breadcrumbs button.zen-breadcrumb"); };
  const toProjects = (from?: string) => { setOpenId(null); focus(from ? `[data-project="${from}"] .zen-list-item__wrapper` : ".zen-list-item__wrapper"); };
  const update = (id: string, patch: Partial<ProjectState>) => setList((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const addProject = (name: string) => {
    const created: ProjectState = { ...projects[0], id: `new-${list.length}`, name, client: studio.name, icon: "icon-folder-line", theme: "neutral", status: "Planning", lead: me.id as PersonId, members: [me.id as PersonId], progress: 0, spent: 0, budget: 0, start: daysFromToday(7), due: daysFromToday(97) };
    setList((items) => [created, ...items]);
  };
  // Rename opens with the current name filled in, so a small change doesn't mean retyping it.
  const renameForm = useFormState<{ name: string }>({
    initialValues: { name: "" },
    validate: ({ name }) => ({ name: name.trim() ? undefined : "Enter a project name" }),
    onSubmit: ({ name }) => {
      if (!project) return;
      const before = project.name;
      update(project.id, { name: name.trim() });
      setRenaming(false);
      // Undo takes the toast's button away, so focus goes back to the More menu, which stays.
      toast({ title: "Project renamed", children: name.trim(), action: { label: "Undo", onClick: () => { update(project.id, { name: before }); focus('[aria-label^="More actions for"]'); } } });
    },
  });

  // The two screens of one studio page: the list of projects, and a project with its actions.
  let header: ReactNode;
  let body: ReactNode;
  let overlays: ReactNode = null;
  if (!project) {
    const q = query.trim().toLowerCase();
    const rows = shown.filter((item) => !q || `${item.name} ${item.client}`.toLowerCase().includes(q));
    header = (
      <AppShellHeader
        // A root page: a Search narrows the projects in the top row; the page's Primary sits in the Main row.
        leading={<Box width={320}><Search placeholder="Search projects" aria-label="Search projects" value={query} onValueChange={setQuery} clearable /></Box>}
        actions={<StudioActions />}
        main={<PageHeader title="Projects" description={`${plural(shown.length, "project")} for Đìzai Studio and its clients`}
          actions={<Button level="primary" startIcon="icon-plus-line" onClick={() => setCreating(true)}>New project</Button>} />}
      />
    );
    body = rows.length ? (
      // Rows on the Canvas: a ListBox at the Sidebar's elevation (Shadow).
      <ListBox theme="shadow">
        <List aria-label="Projects">
          {rows.map((item) => (
            <ListItem key={item.id} data-project={item.id} title={item.name} caption={`${item.client} · ${timing(item)}`}
              leading={<DockIcon icon={item.icon} theme={item.theme} background="subtle" />}
              trailing={<Badge theme={projectStatusTheme[item.status]} background="subtle">{item.status}</Badge>}
              onClick={() => open(item.id)} />
          ))}
        </List>
      </ListBox>
    ) : (
      <EmptyState headingLevel={2} icon="icon-search-medium-line" title="No projects match" secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>
        No project or client has “{query.trim()}” in its name.
      </EmptyState>
    );
  } else {
    const openTasks = openTasksOf(project.id);
    const projectFiles = studioFiles.filter((file) => file.project === project.id);
    const copyLink = () => { copyText(`https://zen.dizai.studio/projects/${project.id}`); toast({ title: "Link copied" }); };
    const duplicate = () => {
      const copy: ProjectState = { ...project, id: `${project.id}-copy-${list.length}`, name: `${project.name} (copy)`, status: "Planning", progress: 0, spent: 0, start: daysFromToday(7), due: daysFromToday(97) };
      setList((items) => [...items, copy]);
      toast({ title: "Project duplicated", children: copy.name, action: { label: "View", onClick: () => open(copy.id) } });
    };
    const hold = () => {
      const before = project.status;
      const next = before === "On hold" ? "Active" : "On hold";
      update(project.id, { status: next });
      toast({ title: next === "On hold" ? "Project put on hold" : "Project resumed", action: { label: "Undo", onClick: () => update(project.id, { status: before }) } });
    };
    // Archiving hides the project and can be undone; deleting can't, so it asks first.
    const archive = () => {
      update(project.id, { archived: true });
      toProjects();
      toast({ title: "Project archived", children: project.name, action: { label: "Undo", onClick: () => update(project.id, { archived: false }) } });
    };
    const remove = () => {
      setList((items) => items.filter((item) => item.id !== project.id));
      setDeleting(false);
      toProjects();
      toast({ title: "Project deleted", children: project.name });
    };

    const items: MenuEntry[] = [
      { type: "group", label: "Link and export", items: [
        { id: "copy", label: "Copy link", icon: "icon-link-01-line", onSelect: copyLink },
        { id: "report", label: "Export status report", icon: "icon-download-01-line", onSelect: () => toast({ title: "Report exported", children: `${project.name} status report.pdf` }) },
      ] },
      { type: "group", label: "Project", items: [
        { id: "rename", label: "Rename…", icon: "icon-edit-02-line", onSelect: () => { renameForm.reset({ name: project.name }); setRenaming(true); } },
        { id: "duplicate", label: "Duplicate project", icon: "icon-duplicate-line", onSelect: duplicate },
        ...(project.status === "Completed" ? [] : [project.status === "On hold"
          ? { id: "resume", label: "Resume project", icon: "icon-play-circle-line", onSelect: hold } as const
          : { id: "hold", label: "Put on hold", icon: "icon-pause-circle-line", onSelect: hold } as const]),
        // Unavailable right now: it stays in the menu, dimmed, and the caption says what to do first.
        { id: "archive", label: "Archive project", icon: "icon-archive-line", disabled: openTasks.length > 0,
          caption: openTasks.length ? `Close ${plural(openTasks.length, "open task")} first` : undefined, onSelect: archive },
      ] },
      { type: "separator" },
      { id: "delete", label: "Delete project", icon: "icon-trash-line", danger: true, onSelect: () => setDeleting(true) },
    ];
    header = (
      <AppShellHeader
        // The trail starts at a Sub level beside the collapse toggle; Projects goes back to the list.
        leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: project.id, label: project.name }]}
          onNavigate={(item) => { if (item.id === "projects") toProjects(project.id); }} />}
        actions={<StudioActions />}
        main={(
          <PageHeader eyebrow={project.client} title={project.name}
            meta={<Badge theme={projectStatusTheme[project.status]} background="subtle">{project.status}</Badge>}
            description={`Led by ${people[project.lead].name} · ${timing(project)}`}
            actions={<>
              <Button level="tertiary" startIcon="icon-user-plus-line" onClick={() => setSharing(true)}>Share</Button>
              <Menu align="end" items={items}
                trigger={<IconButton level="tertiary" size="md" icon="icon-dots-horizontal-line" aria-label={`More actions for ${project.name}`} />} />
            </>} />
        )}
      />
    );
    // The open tasks lead (they decide whether Archive is available); the facts and the team sit beside them, all on
    // Shadow surfaces at the Sidebar's elevation. In a narrow window the side column moves under the tasks.
    body = (
      <Grid columns={{ mobile: 1, desktop: "minmax(0, 2fr) minmax(0, 1fr)" }} gap="xl" align="start">
        <Stack gap="xl">
        <Stack as="section" gap="md" aria-labelledby={tasksId} ref={measureTasks}>
          <Heading level={2} id={tasksId} textStyle="Heading/4">Open tasks</Heading>
          {openTasks.length ? (
            <ListBox theme="shadow">
              <List aria-labelledby={tasksId}>
                {openTasks.map((task) => (
                  // In a narrow column the assignee's face and a trailing Badge would squeeze the title to an ellipsis:
                  // the status then leads the caption instead.
                  <ListItem key={task.id} title={task.title} titleLines={2}
                    caption={narrowTasks ? `${task.status} · ${task.key} · ${formatDue(task.due)}` : `${task.key} · ${people[task.assignee].name} · ${formatDue(task.due)}`}
                    leading={narrowTasks ? undefined : <Avatar size="md" {...avatarOf(people[task.assignee])} />}
                    trailing={narrowTasks ? undefined : <Badge theme={taskStatusTheme[task.status]} background="subtle">{task.status}</Badge>} />
                ))}
              </List>
            </ListBox>
          ) : (
            <Card theme="shadow">
              <EmptyState size="sm" headingLevel={3} icon="icon-check-done-line" title="No open tasks">Every task on this project is done.</EmptyState>
            </Card>
          )}
        </Stack>
        <Stack as="section" gap="md" aria-labelledby={filesId}>
          <Heading level={2} id={filesId} textStyle="Heading/4">Latest files</Heading>
          {projectFiles.length ? (
            <ListBox theme="shadow">
              <List aria-labelledby={filesId}>
                {projectFiles.map((file) => (
                  <ListItem key={file.id} title={file.name} caption={`${formatBytes(file.bytes)} · ${people[file.owner].name} · ${formatRelative(file.updated)}`}
                    leading={<FileIcon format={fileIconFormatOf(file.name)} />}
                    onClick={() => toast({ title: `Opening ${file.name}`, children: `${formatBytes(file.bytes)} · ${people[file.owner].name}` })} />
                ))}
              </List>
            </ListBox>
          ) : (
            <Card theme="shadow">
              <EmptyState size="sm" headingLevel={3} icon="icon-folder-line" title="No files yet">Files the team shares on this project show here.</EmptyState>
            </Card>
          )}
        </Stack>
        </Stack>
        <Stack gap="lg">
          <Card as="section" theme="shadow" aria-labelledby={detailsId}>
            <Stack gap="md">
              <Heading level={2} id={detailsId} textStyle="Heading/Subheading">Details</Heading>
              <ProgressBar value={project.progress} label="Progress" aria-label={`${project.name} progress`} layout="stacked" />
              <DescriptionList divider layout="inline" items={[
                { id: "client", term: "Client", description: project.client },
                { id: "start", term: "Started", description: formatDate(project.start) },
                { id: "due", term: "Due", description: formatDate(project.due) },
                { id: "budget", term: "Budget", description: budgetLine(project) },
              ]} />
            </Stack>
          </Card>
          <ListBox as="section" theme="shadow" aria-labelledby={teamId}
            header={(
              <Stack direction="row" gap="xs" align="center">
                <Heading level={2} id={teamId} textStyle="Heading/Subheading">Team</Heading>
                <BadgeCounter theme="neutral" background="subtle" value={project.members.length} aria-label={plural(project.members.length, "member")} />
              </Stack>
            )}>
            <List aria-labelledby={teamId}>
              {project.members.map((id) => (
                <ListItem key={id} title={people[id].name} caption={id === project.lead ? `${people[id].role} · Project lead` : people[id].role}
                  leading={<Avatar size="md" {...avatarOf(people[id])} />} />
              ))}
            </List>
          </ListBox>
        </Stack>
      </Grid>
    );
    overlays = (
      <>
        <DemoFieldDialog open={sharing} onOpenChange={setSharing} title={`Share ${project.name}`}
          description="They can view the project, its tasks and its files."
          field={{ kind: "email", label: "Email", placeholder: "name@company.com" }} submitLabel="Share project"
          confirm={(email) => `Shared with ${email}`} />
        <ModalForm open={renaming} onOpenChange={setRenaming} title="Rename project" onSubmit={renameForm.handleSubmit}
          primaryAction={{ label: "Rename project" }} secondaryAction={{ label: "Cancel" }}>
          <InputField label="Project name" autoComplete="off" data-autofocus="" {...renameForm.field("name")} />
        </ModalForm>
        <Dialog open={deleting} onOpenChange={setDeleting} theme="negative" title={`Delete ${project.name}?`}
          description={`Its ${plural(tasks.filter((task) => task.project === project.id).length, "task")}, files and invoices are removed for everyone. This can't be undone.`}
          primaryAction={{ label: "Delete project", level: "danger", onClick: remove }} secondaryAction={{ label: "Cancel" }} />
      </>
    );
  }

  return (
    // A page of the studio app: one AppShell (pattern sidebar), the studio's Sidebar on Projects, the header's top row
    // for the trail (or the list's Search) and the utilities, the page's title and actions in its Main row. The Body pads
    // the page, so the screens need no Container for the margins.
    <PreviewAppFrame frameRef={frameRef} height={{ min: 640, max: 820 }}>
      <AppShell sidebar={<StudioSidebar selectedId="projects" />} header={header}>
        {body}
        {overlays}
        <DemoFieldDialog open={creating} onOpenChange={setCreating} title="New project"
          description="It starts in Planning, led by you. Add the client and the team next."
          field={{ kind: "name", label: "Project name", placeholder: "Website refresh" }} submitLabel="Create project"
          confirm={(name) => `${name} created`} onSubmit={addProject} />
      </AppShell>
    </PreviewAppFrame>
  );
}

// ——— 3. A New menu: composed items with file icons and a caption each ——————————————————————————————
type LoyaltyFile = { id: string; name: string; caption: string };
const firstFiles: LoyaltyFile[] = [
  { id: "f1", name: "Loyalty app – points history.fig", caption: `${formatBytes(18_400_000)} · Chi Tran · 13 minutes ago` },
  { id: "f3", name: "Rewards API contract.json", caption: `${formatBytes(86_000)} · Bao Nguyen · Monday at 9:40 am` },
  { id: "f8", name: "Android test plan.pdf", caption: `${formatBytes(640_000)} · Em Pham · Sep 22 at 4:15 pm` },
];
const kinds = {
  design: { label: "Design file", file: "Untitled design file", extension: "fig" },
  doc: { label: "Document", file: "Untitled document", extension: "docx" },
  sheet: { label: "Spreadsheet", file: "Untitled spreadsheet", extension: "xlsx" },
} as const;
type Kind = keyof typeof kinds;

function NewFileMenu() {
  const { toast } = useToast();
  const [files, setFiles] = useState(firstFiles);
  const titleId = useId();
  const count = useRef(0);
  const create = (kind: Kind) => {
    const { label, file, extension } = kinds[kind];
    const same = files.filter((item) => item.name.startsWith(file)).length;
    count.current += 1;
    const created: LoyaltyFile = { id: `new-${count.current}`, name: `${file}${same ? ` ${same + 1}` : ""}.${extension}`, caption: `Empty · ${people.alex.name} · Just now` };
    setFiles((list) => [created, ...list]);
    toast({ title: `${label} created`, children: created.name, action: { label: "Undo", onClick: () => setFiles((list) => list.filter((item) => item.id !== created.id)) } });
  };
  return (
    // A ListBox: the title, its caption and the New menu in its Header-Slot, the files in its Body-Slot.
    <ListBox as="section" aria-labelledby={titleId}
      header={<Stack direction="row" justify="between" align="center" gap="xs" wrap>
        <Stack gap="2xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Files</Heading>
          <Text as="span" textStyle="Body/Small/Regular" tone="base">Loyalty app · Phin & Co</Text>
        </Stack>
        {/* Composed items: any element is the icon, and each item runs its own onSelect. */}
        <Menu align="end" trigger={<Button level="tertiary" startIcon="icon-plus-line" endIcon="icon-chevron-down-line">New</Button>}>
          <MenuItem id="design" label="Design file" caption="A blank Figma canvas" icon={<FileIcon format="figma" />} onSelect={() => create("design")} />
          <MenuItem id="doc" label="Document" caption="A brief, notes or a spec" icon={<FileIcon format="doc" />} onSelect={() => create("doc")} />
          <MenuItem id="sheet" label="Spreadsheet" caption="A budget or a tracker" icon={<FileIcon format="sheet" />} onSelect={() => create("sheet")} />
        </Menu>
      </Stack>}>
      <List aria-labelledby={titleId}>
        {files.map((file) => (
          <ListItem key={file.id} title={file.name} titleLines={2} caption={file.caption} leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} />
        ))}
      </List>
    </ListBox>
  );
}

// ——— 4. Keyboard: arrows, typeahead, Escape, and letter shortcuts ——————————————————————————————————
const reviewTask = tasks.find((task) => task.id === "t2")!;

function TaskActionsKeyboard() {
  const { toast } = useToast();
  const [assignee, setAssignee] = useState<PersonId>(reviewTask.assignee);
  const [watching, setWatching] = useState(false);
  const [copies, setCopies] = useState(0);
  const titleId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const task: Task = { ...reviewTask, assignee };
  const assignToMe = () => {
    if (assignee === "alex") return;
    const before = assignee;
    setAssignee("alex");
    toast({ title: "Task assigned to you", action: { label: "Undo", onClick: () => setAssignee(before) } });
  };
  const copyLink = () => { copyText(`https://zen.dizai.studio/tasks/${task.key}`); toast({ title: "Link copied", children: task.key }); };
  const duplicate = () => {
    setCopies((n) => n + 1);
    // Undo takes the toast's button away, so focus goes back to Actions, which stays.
    toast({ title: "Task duplicated", children: `PHIN-${227 + copies} is in To do`, action: { label: "Undo", onClick: () => {
      setCopies((n) => n - 1);
      cardRef.current?.querySelector<HTMLElement>('[aria-haspopup="menu"]')?.focus();
    } } });
  };
  const watch = () => { setWatching((on) => !on); toast({ title: watching ? "You stopped watching this task" : "You're watching this task" }); };
  // Each shortcut is the action's first letter, so typeahead in the open menu lands on the same item.
  const items: MenuItemData[] = [
    { id: "assign", label: "Assign to me", icon: "icon-user-check-line", shortcut: "A", disabled: assignee === "alex", caption: assignee === "alex" ? "Already assigned to you" : undefined, onSelect: assignToMe },
    { id: "copy", label: "Copy link", icon: "icon-link-01-line", shortcut: "C", onSelect: copyLink },
    { id: "duplicate", label: "Duplicate", icon: "icon-duplicate-line", shortcut: "D", onSelect: duplicate },
    { id: "watch", label: watching ? "Stop watching" : "Watch", icon: watching ? "icon-eye-off-line" : "icon-eye-line", shortcut: watching ? "S" : "W", onSelect: watch },
  ];
  // The app wires the shortcuts itself (Menu only shows them): here, while focus is on this task and the menu is closed.
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey || (event.target as HTMLElement).closest('[role="menu"], input, textarea')) return;
    const item = items.find((entry) => entry.shortcut === event.key.toUpperCase() && !entry.disabled);
    if (!item) return;
    event.preventDefault();
    item.onSelect?.();
  };
  return (
    <Card as="section" ref={cardRef} theme="default" aria-labelledby={titleId} onKeyDown={onKeyDown}>
      <Stack gap="md">
        <Stack gap="xs">
          <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${task.key} · ${projectById(task.project).name}`}</Text>
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">{task.title}</Heading>
        </Stack>
        <DescriptionList items={[
          { term: "Status", description: <Badge theme={taskStatusTheme[task.status]} background="subtle">{task.status}</Badge> },
          { term: "Assignee", description: people[task.assignee].name },
          { term: "Due", description: formatDate(task.due) },
          { term: "Watchers", description: plural(watching ? 3 : 2, "person", "people") },
        ]} />
        <Stack direction="row">
          <Menu items={items} trigger={<Button level="tertiary" endIcon="icon-chevron-down-line">Actions</Button>} />
        </Stack>
      </Stack>
    </Card>
  );
}

// ——— 5. On a phone: a short row menu beside a row that opens the file ——————————————————————————————
type PhoneFile = { id: string; name: string; bytes: number; owner: PersonId; updated: Date; offline: boolean };
const minutesAgo = (m: number) => new Date(TODAY.getTime() - m * 60_000);
const phoneFiles: PhoneFile[] = [
  { id: "p1", name: "Points history.fig", bytes: 18_400_000, owner: "chi", updated: minutesAgo(13), offline: true },
  { id: "p2", name: "Rewards API.json", bytes: 86_000, owner: "bao", updated: daysFromToday(-2, 9, 40), offline: false },
  { id: "p3", name: "Android test plan.pdf", bytes: 640_000, owner: "em", updated: daysFromToday(-8, 16, 15), offline: false },
  { id: "p4", name: "Store locator.fig", bytes: 9_800_000, owner: "chi", updated: daysFromToday(-1, 15, 20), offline: false },
  { id: "p5", name: "Loyalty brief v2.pdf", bytes: 1_100_000, owner: "duy", updated: daysFromToday(-12, 11, 0), offline: true },
  { id: "p6", name: "Sprint 6 report.xlsx", bytes: 420_000, owner: "duy", updated: daysFromToday(-3, 17, 30), offline: false },
  { id: "p7", name: "Onboarding flow.fig", bytes: 12_600_000, owner: "gia", updated: daysFromToday(-6, 10, 5), offline: false },
  { id: "p8", name: "Push copy.docx", bytes: 54_000, owner: "linh", updated: daysFromToday(-4, 14, 45), offline: false },
  { id: "p9", name: "App icon set.zip", bytes: 7_300_000, owner: "gia", updated: daysFromToday(-15, 9, 10), offline: false },
  { id: "p10", name: "Release notes 1.4.docx", bytes: 38_000, owner: "bao", updated: daysFromToday(-1, 18, 2), offline: false },
  { id: "p11", name: "Usability notes.pdf", bytes: 2_200_000, owner: "ava", updated: daysFromToday(-9, 13, 30), offline: false },
  { id: "p12", name: "Points rules.xlsx", bytes: 96_000, owner: "duy", updated: daysFromToday(-20, 10, 0), offline: false },
  { id: "p13", name: "Kickoff deck.key", bytes: 31_000_000, owner: "hana", updated: daysFromToday(-70, 15, 0), offline: false },
  { id: "p14", name: "Receipt scanner.mp4", bytes: 48_000_000, owner: "emi", updated: daysFromToday(-5, 16, 50), offline: false },
  { id: "p15", name: "Brand colours.pdf", bytes: 3_400_000, owner: "gia", updated: daysFromToday(-30, 12, 0), offline: false },
];
const back = "icon-chevron-left-line-medium" as const;

function PhoneFileMenu() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const recentId = useId();
  const earlierId = useId();
  const [files, setFiles] = useState(phoneFiles);
  const [openId, setOpenId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<PhoneFile | null>(null);
  const opened = files.find((file) => file.id === openId);
  const form = useFormState<{ name: string }>({
    initialValues: { name: "" },
    validate: ({ name }) => ({ name: !name.trim() ? "Enter a file name" : undefined }),
    onSubmit: ({ name }) => {
      if (!renaming) return;
      const ext = renaming.name.split(".").pop();
      const next = name.trim().endsWith(`.${ext}`) ? name.trim() : `${name.trim()}.${ext}`;
      setFiles((list) => list.map((file) => (file.id === renaming.id ? { ...file, name: next } : file)));
      setRenaming(null);
      toast({ title: "File renamed", children: next });
    },
  });
  useEffect(() => { if (renaming) form.reset({ name: renaming.name.replace(/\.[^.]+$/, "") }); }, [renaming]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleOffline = (file: PhoneFile) => {
    setFiles((list) => list.map((item) => (item.id === file.id ? { ...item, offline: !item.offline } : item)));
    toast({ title: file.offline ? "Offline copy removed" : "Available offline", children: file.name });
  };
  const remove = (file: PhoneFile) => {
    const index = files.findIndex((item) => item.id === file.id);
    setFiles((list) => list.filter((item) => item.id !== file.id));
    toast({ title: "File deleted", children: file.name, action: { label: "Undo", onClick: () => setFiles((list) => [...list.slice(0, index), file, ...list.slice(index)]) } });
  };
  const caption = (file: PhoneFile) => `${formatBytes(file.bytes)} · ${file.offline ? "Available offline" : formatRelative(file.updated)}`;

  const fileMenu = (file: PhoneFile) => (
    <Menu align="end"
      trigger={<IconButton appearance="flat" level="primary" size="md" icon="icon-dots-horizontal-line" aria-label={`More actions for ${file.name}`} />}
      items={[
        { id: "copy", label: "Copy link", icon: "icon-link-01-line", onSelect: () => { copyText(`https://zen.dizai.studio/files/${file.id}`); toast({ title: "Link copied" }); } },
        { id: "rename", label: "Rename…", icon: "icon-edit-02-line", onSelect: () => setRenaming(file) },
        { id: "offline", label: file.offline ? "Remove offline copy" : "Make available offline", icon: file.offline ? "icon-cloud-off-line" : "icon-download-cloud-01-line", onSelect: () => toggleOffline(file) },
        { type: "separator" },
        { id: "delete", label: "Delete file", icon: "icon-trash-line", danger: true, onSelect: () => remove(file) },
      ]} />
  );

  if (opened) {
    return (
      // A pushed screen: the compact bar with Back and the file's name (the screen's h1), the file's one action in the
      // Action bar the shell pins to the bottom, no tab bar.
      <PlatformPhone key={opened.id} label="Files" canvas="default" screenRef={screenRef}>
        <AppShell
          topNavigation={<TopNavigation type="compact-alt" title={opened.name} scrollRef={screenRef}
            leading={{ icon: back, label: "Back", onClick: () => screen.go(`[data-file="${opened.id}"] .zen-list-item__wrapper`, () => setOpenId(null)) }} />}
          actionBar={<ActionBar primaryAction={{ label: opened.offline ? "Remove offline copy" : "Make available offline", onClick: () => toggleOffline(opened) }} />}
        >
          {screen.anchor}
          <Stack gap="sm" align="center" paddingY="md">
            <FileIcon format={fileIconFormatOf(opened.name)} size="3xl" />
            <Text textStyle="Body/Small/Regular" tone="base" align="center">{`${formatBytes(opened.bytes)} · Loyalty app · Phin & Co`}</Text>
          </Stack>
          <Card theme="default">
            <DescriptionList divider layout="inline" items={[
              { term: "Size", description: formatBytes(opened.bytes) },
              { term: "Owner", description: people[opened.owner].name },
              { term: "Project", description: "Loyalty app" },
              { term: "Updated", description: formatRelative(opened.updated) },
              { term: "On this phone", description: opened.offline ? "Available offline" : "Online only" },
            ]} />
          </Card>
        </AppShell>
      </PlatformPhone>
    );
  }

  // Files changed this week first, then the rest; both keep the order they had.
  const weekAgo = daysFromToday(-7, 0, 0);
  const groups = [
    { id: recentId, title: "This week", rows: files.filter((file) => file.updated >= weekAgo) },
    { id: earlierId, title: "Earlier", rows: files.filter((file) => file.updated < weekAgo) },
  ].filter((group) => group.rows.length);
  return (
    // A tab root of Đìzai Studio's Zen app: the large title folds as the files scroll under the bar; the tab bar casts a
    // shadow, so the file groups take the same Shadow elevation.
    <PlatformPhone key="files" label="Files" canvas="default" screenRef={screenRef}>
      <AppShell
        topNavigation={<TopNavigation title="Files" largeTitle="Files" largeTitleSubheading={`Loyalty app · ${plural(files.length, "file")}`} scrollRef={screenRef} />}
        bottomNavigation={<ZenRoots value="files" />}
      >
        {screen.anchor}
        {groups.map((group) => (
          <Stack key={group.id} as="section" gap="xs" aria-labelledby={group.id}>
            <Box paddingX="lg"><Heading level={2} id={group.id} textStyle="Body/Small/Bold" tone="light">{group.title}</Heading></Box>
            <ListBox theme="shadow">
              <List aria-labelledby={group.id}>
                {group.rows.map((file) => (
                  // The row opens the file; its ⋯ is a separate target with a few short actions.
                  <ListItem key={file.id} data-file={file.id} title={file.name} caption={caption(file)}
                    leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
                    onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpenId(file.id))}
                    trailing={fileMenu(file)} />
                ))}
              </List>
            </ListBox>
          </Stack>
        ))}
        {/* Not inline: the sheet opens in the device frame, above the shell's tab bar. */}
        <BottomSheet open={Boolean(renaming)} onOpenChange={(open) => { if (!open) setRenaming(null); }} title="Rename file"
          onSubmit={form.handleSubmit} primaryAction={{ label: "Rename file" }} secondaryAction={{ label: "Cancel" }}>
          <InputField size="lg" label="File name" autoComplete="off" {...form.field("name")} />
        </BottomSheet>
      </AppShell>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Row actions in a table",
    wide: true,
    description: "The row opens the invoice in a Side Panel; each row's ⋯ holds the other actions, named after the invoice and fitted to its status. Delete is last, after a separator, and asks first in a negative Dialog; the menu floats above the table and flips up near the bottom. On a narrow screen the table scrolls sideways to the ⋯ column.",
    render: () => <InvoiceRowActions />,
    code: `const actionsFor = (row) => [
  ...(row.status === "Draft" ? [{ id: "send", label: "Send invoice", icon: "icon-send-01-line", onSelect: () => send(row) }] : []),
  ...(row.status === "Sent" || row.status === "Overdue" ? [
    { id: "remind", label: "Send reminder", icon: "icon-mail-01-line", onSelect: () => remind(row) },
    { id: "paid", label: "Mark as paid", icon: "icon-check-circle-line", onSelect: () => markPaid(row) },
  ] : []),
  { id: "pdf", label: "Download PDF", icon: "icon-download-01-line", onSelect: () => download(row) },
  { id: "duplicate", label: "Duplicate", icon: "icon-duplicate-line", onSelect: () => duplicate(row) },
  { type: "separator" },
  { id: "delete", label: "Delete invoice", icon: "icon-trash-line", danger: true, onSelect: () => setDeleting(row) },
];

<Table aria-labelledby={headingId} rows={rows} onRowClick={(row) => setOpenId(row.id)} columns={[
  { id: "number", header: "Invoice", cell: (row) => <TableText bold caption={project.name}>{row.number}</TableText> },
  // Client, Due, Amount (right), Status…
  { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", width: "72px", cell: (row) => (
    <TableActions>
      <Menu align="end" items={actionsFor(row)}
        trigger={<IconButton appearance="flat" level="primary" size="md" icon="icon-dots-horizontal-line" aria-label={\`Actions for \${row.number}\`} />} />
    </TableActions>
  ) },
]} />

<Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)} theme="negative"
  title={\`Delete \${deleting?.number}?\`} description="The invoice and its payment history are removed for everyone. This can't be undone."
  primaryAction={{ label: "Delete invoice", level: "danger", onClick: remove }} secondaryAction={{ label: "Cancel" }} />`,
  },
  {
    title: "Project actions",
    screen: true,
    description: "A project page in the studio app: Share stays a button in the PageHeader; the page's other commands sit in its More menu, grouped under labels, with Delete last. Archive stays visible but disabled while tasks are open, and its caption says what to do first. Projects in the trail returns to the list, where Search narrows the projects and New project adds one.",
    render: () => <ProjectActions />,
    code: `<AppShell
  sidebar={<Sidebar logo={studioLogo} sections={studioPlaces} selectedId="projects" />}
  header={<AppShellHeader
    leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: project.id, label: project.name }]} onNavigate={toProjects} />}
    actions={<>{notifications}{accountMenu}</>}
    main={(
      <PageHeader eyebrow={project.client} title={project.name}
        meta={<Badge theme={statusTheme[project.status]} background="subtle">{project.status}</Badge>}
        actions={<>
          <Button level="tertiary" startIcon="icon-user-plus-line" onClick={() => setSharing(true)}>Share</Button>
          <Menu align="end"
            trigger={<IconButton level="tertiary" size="md" icon="icon-dots-horizontal-line" aria-label={\`More actions for \${project.name}\`} />}
            items={[
              { type: "group", label: "Link and export", items: [
                { id: "copy", label: "Copy link", icon: "icon-link-01-line", onSelect: copyLink },
                { id: "report", label: "Export status report", icon: "icon-download-01-line", onSelect: exportReport },
              ] },
              { type: "group", label: "Project", items: [
                { id: "rename", label: "Rename…", icon: "icon-edit-02-line", onSelect: () => setRenaming(true) },
                { id: "duplicate", label: "Duplicate project", icon: "icon-duplicate-line", onSelect: duplicate },
                { id: "hold", label: "Put on hold", icon: "icon-pause-circle-line", onSelect: hold },
                { id: "archive", label: "Archive project", icon: "icon-archive-line", onSelect: archive,
                  disabled: openTasks.length > 0, caption: openTasks.length ? \`Close \${plural(openTasks.length, "open task")} first\` : undefined },
              ] },
              { type: "separator" },
              { id: "delete", label: "Delete project", icon: "icon-trash-line", danger: true, onSelect: () => setDeleting(true) },
            ]} />
        </>} />
    )} />}
>
  {/* The Body pads the page: open tasks beside the project's details and team, on Shadow surfaces. */}
  <Grid columns={{ mobile: 1, desktop: "minmax(0, 2fr) minmax(0, 1fr)" }} gap="xl" align="start">…</Grid>
</AppShell>`,
  },
  {
    title: "New file menu",
    description: "Without items, a Menu takes MenuItem children: a FileIcon is each item's icon and a caption says what it makes. Each choice adds an untitled file to the top of the list, and the toast can undo it.",
    render: () => <NewFileMenu />,
    code: `<Menu align="end" trigger={<Button level="tertiary" startIcon="icon-plus-line" endIcon="icon-chevron-down-line">New</Button>}>
  <MenuItem id="design" label="Design file" caption="A blank Figma canvas" icon={<FileIcon format="figma" />} onSelect={() => create("design")} />
  <MenuItem id="doc" label="Document" caption="A brief, notes or a spec" icon={<FileIcon format="doc" />} onSelect={() => create("doc")} />
  <MenuItem id="sheet" label="Spreadsheet" caption="A budget or a tracker" icon={<FileIcon format="sheet" />} onSelect={() => create("sheet")} />
</Menu>

const create = (kind) => {
  const file = { id: nextId(), name: \`\${kinds[kind].file}.\${kinds[kind].extension}\` };
  setFiles((list) => [file, ...list]);
  toast({ title: \`\${kinds[kind].label} created\`, action: { label: "Undo", onClick: () => setFiles((list) => list.filter((f) => f !== file)) } });
};`,
  },
  {
    title: "Keyboard and shortcuts",
    description: "Enter, Space or ↓ open the menu on the first item and ↑ on the last; the arrows, Home and End move, a letter jumps to the item it starts, and Escape returns focus to Actions. Each shortcut is that letter, wired by the app while the task has focus.",
    render: () => <TaskActionsKeyboard />,
    code: `const items = [
  { id: "assign", label: "Assign to me", icon: "icon-user-check-line", shortcut: "A", onSelect: assignToMe,
    disabled: assignee === "alex", caption: assignee === "alex" ? "Already assigned to you" : undefined },
  { id: "copy", label: "Copy link", icon: "icon-link-01-line", shortcut: "C", onSelect: copyLink },
  { id: "duplicate", label: "Duplicate", icon: "icon-duplicate-line", shortcut: "D", onSelect: duplicate },
  { id: "watch", label: watching ? "Stop watching" : "Watch", icon: watching ? "icon-eye-off-line" : "icon-eye-line", shortcut: watching ? "S" : "W", onSelect: watch },
];

// Menu only shows shortcuts; the app wires them (here: while focus is on the task and the menu is closed).
const onKeyDown = (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey || event.target.closest('[role="menu"], input, textarea')) return;
  const item = items.find((entry) => entry.shortcut === event.key.toUpperCase() && !entry.disabled);
  if (item) { event.preventDefault(); item.onSelect(); }
};

<Card as="section" theme="default" aria-labelledby={titleId} onKeyDown={onKeyDown}>
  {/* key, title, details… */}
  <Menu items={items} trigger={<Button level="tertiary" endIcon="icon-chevron-down-line">Actions</Button>} />
</Card>`,
  },
  {
    title: "Row menu on a phone",
    description: "Each file row opens the file, and its ⋯ is a separate target with four short actions; the menu opens inside the phone, lined up with the button. Rename opens a Bottom Sheet form, and Delete removes the row with Undo in the toast. The files sit on a tab root of the Zen app, grouped by when they changed.",
    render: () => <PhoneFileMenu />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone key="files" screenRef={screenRef}>
  <AppShell
    topNavigation={<TopNavigation title="Files" largeTitle="Files" largeTitleSubheading="Loyalty app · 15 files" scrollRef={screenRef} />}
    bottomNavigation={<BottomNavigation aria-label="Đìzai Studio" showLabels items={roots} value="files" onValueChange={navigate} />}
  >
    <Stack as="section" gap="xs" aria-labelledby="this-week">
      <Box paddingX="lg"><Heading level={2} id="this-week" textStyle="Body/Small/Bold" tone="light">This week</Heading></Box>
      <ListBox theme="shadow">
        <List aria-labelledby="this-week">
          {files.map((file) => (
            <ListItem key={file.id} title={file.name} caption={caption(file)}
              leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
              onClick={() => setOpenId(file.id)}
              trailing={<Menu align="end"
                trigger={<IconButton appearance="flat" level="primary" size="md" icon="icon-dots-horizontal-line" aria-label={\`More actions for \${file.name}\`} />}
                items={[
                  { id: "copy", label: "Copy link", icon: "icon-link-01-line", onSelect: () => copyLink(file) },
                  { id: "rename", label: "Rename…", icon: "icon-edit-02-line", onSelect: () => setRenaming(file) },
                  { id: "offline", label: file.offline ? "Remove offline copy" : "Make available offline",
                    icon: file.offline ? "icon-cloud-off-line" : "icon-download-cloud-01-line", onSelect: () => toggleOffline(file) },
                  { type: "separator" },
                  { id: "delete", label: "Delete file", icon: "icon-trash-line", danger: true, onSelect: () => remove(file) },
                ]} />} />
          ))}
        </List>
      </ListBox>
    </Stack>
    <BottomSheet open={Boolean(renaming)} onOpenChange={(open) => !open && setRenaming(null)} title="Rename file"
      onSubmit={form.handleSubmit} primaryAction={{ label: "Rename file" }} secondaryAction={{ label: "Cancel" }}>
      <InputField size="lg" label="File name" {...form.field("name")} />
    </BottomSheet>
  </AppShell>
</PlatformPhone>`,
  },
]);
