/* Sidebar examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Alex Duong moves around the Đìzai Studio
   app: the studio shell, the projects flyout on a collapsed rail, client workspaces and the studio handbook. Shells sit
   in an AppShell, which opens the Sidebar as a drawer below 1024px; the rail-and-flyout shell stays a rail. */
import { createContext, useContext, useEffect, useRef, useState, type AnchorHTMLAttributes, type ReactNode, type Ref } from "react";
import { AppShell } from "../../../components/AppShell";
import { Avatar } from "../../../components/Avatar";
import { Badge, type BadgeTheme } from "../../../components/Badge";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { Icon, type IconName } from "../../../components/Icon";
import { Container, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem, type ListBoxTheme } from "../../../components/ListItem";
import { PageHeader } from "../../../components/PageHeader";
import { Search } from "../../../components/Search";
import { Sidebar, SidebarSubMenu, type SidebarItem, type SidebarSection } from "../../../components/Sidebar";
import { Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { PlatformPhone } from "../../PlatformPhone";
import {
  activity, daysFromToday, files, formatBytes, formatDate, formatDay, formatDue, formatMoney, formatRelative, initials, invoiceStatusTheme,
  invoices, people, peopleList, plans, priorityTheme, projectById, projectStatusTheme, projects, studio, taskStatusTheme, tasks, workspacePlan,
  type Activity, type Invoice, type Person, type PersonId, type Project, type StudioFile, type Task, type Team,
} from "../data";
import type { PlatformPage } from "../../PlatformExamples";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./sidebar.css";

export const page: PlatformPage = "sidebar";

// ——— Shared page parts: every page in these shells is a PageHeader over one List ——————————————————————————————
type Row = { id: string; title: string; caption: string; leading: ReactNode; trailing?: ReactNode; onClick?: () => void };
type Canvas = "default" | "alt" | "flat";
/** Cards follow the page Canvas: a Surface with a Pale border on Default and Flat (a shadow alone never separates it),
 *  Surface/Alt (flat, no shadow on a tinted fill) on Alt. */
const cardLook: Record<Canvas, { theme: "flat" | "border"; surface?: "alt" }> = { default: { theme: "border" }, alt: { theme: "flat", surface: "alt" }, flat: { theme: "border" } };

const personAvatar = (p: Person) => p.photo
  ? <Avatar size="medium" theme="photo" src={p.photo} alt="" />
  : <Avatar size="medium" theme={p.theme} alt="">{initials(p.name)}</Avatar>;
const statusBadge = (label: string, theme: BadgeTheme) => <Badge theme={theme} background="subtle">{label}</Badge>;
const itemIcon = (icon: IconName) => <DockIcon icon={icon} theme="neutral" background="subtle" size="medium" />;

/** The caption follows the status: open work shows when it is due, finished work when it was done. */
const taskWhen = (t: Task) => (t.status === "Done" ? `Done ${formatDay(t.due)}` : formatDue(t.due));
/** Task rows open the task's own page (its title reads in full there). */
const taskRow = (t: Task, open: (t: Task) => void): Row => ({ id: t.id, title: t.title, caption: `${t.key} · ${taskWhen(t)}`, leading: personAvatar(people[t.assignee]), trailing: statusBadge(t.status, taskStatusTheme[t.status]), onClick: () => open(t) });
const fileRow = (f: StudioFile, open?: (f: StudioFile) => void): Row => ({ id: f.id, title: f.name, caption: `${formatBytes(f.bytes)} · ${people[f.owner].name} · ${formatRelative(f.updated)}`, leading: <FileIcon format={fileIconFormatOf(f.name)} size="xl" />, onClick: open ? () => open(f) : undefined });
const personRow = (p: Person): Row => ({ id: p.id, title: p.name, caption: `${p.role} · ${p.location}`, leading: personAvatar(p) });
const activityRow = (a: Activity, unread: boolean): Row => ({ id: a.id, title: people[a.actor].name, caption: `${a.verb[0].toUpperCase()}${a.verb.slice(1)} ${a.object} · ${formatRelative(a.at)}`, leading: personAvatar(people[a.actor]), trailing: unread ? <Badge theme="accent" background="subtle">New</Badge> : undefined });
const invoiceRow = (i: Invoice): Row => ({
  id: i.id, title: i.number, caption: `${i.client} · ${formatMoney(i.amount, true)} · Due ${formatDate(i.due)}`, leading: itemIcon("icon-receipt-line"),
  trailing: statusBadge(i.status, invoiceStatusTheme[i.status]),
});
const projectRow = (p: Project): Row => ({ id: p.id, title: p.name, caption: `${p.client} · Due ${formatDate(p.due)}`, leading: itemIcon(p.icon), trailing: statusBadge(p.status, projectStatusTheme[p.status]) });

/** The page's one List, in a ListBox whose elevation follows the Sidebar: beside the default Sidebar on the grey Default
 *  Canvas it takes the Sidebar's shadow; the Alt and Flat Canvases are white like Surface/Default (with an Alt or Flat
 *  Sidebar), so the ListBox takes the Pale border there. */
const listBoxLook: Record<Canvas, ListBoxTheme> = { default: "shadow", alt: "border", flat: "border" };
function RowCard({ label, rows, canvas }: { label: string; rows: Row[]; canvas: Canvas }) {
  // A page squeezed beside a rail (a phone-width window) keeps the title readable: the row's Badge or amount waits on
  // the page the row opens. Measured on the List itself, so the width is the rows' own inside the ListBox.
  const [listElement, setListElement] = useState<HTMLElement | null>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (!listElement) return undefined;
    const observer = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < 280));
    observer.observe(listElement);
    return () => observer.disconnect();
  }, [listElement]);
  return (
    <ListBox theme={listBoxLook[canvas]}>
      <List ref={setListElement} aria-label={label}>{rows.map(({ id, trailing, ...row }) => <ListItem key={id} as="li" {...row} trailing={narrow ? undefined : trailing} />)}</List>
    </ListBox>
  );
}

/** The page beside the Sidebar: Container keeps the page margin; one h1 (the PageHeader title), then its content. */
function Page({ children, ...header }: { title: string; description?: ReactNode; eyebrow?: string; breadcrumbs?: ReactNode; meta?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return <Container><Stack gap="xl" className="px-sidebar-page"><PageHeader {...header} />{children}</Stack></Container>;
}

/** A task opened from a list: the Sidebar keeps the list's destination selected, and the trail leads back to it. */
function TaskPage({ task, from, project, canvas, onBack }: { task: Task; from: string; project?: string; canvas: Canvas; onBack: () => void }) {
  return (
    <Page
      breadcrumbs={<Breadcrumbs master={false} items={[{ id: "back", label: from }, { id: task.id, label: task.key }]} onNavigate={(_, event) => { event.preventDefault(); onBack(); }} />}
      title={task.title} meta={statusBadge(task.status, taskStatusTheme[task.status])} description={project ? `${project} · ${taskWhen(task)}` : taskWhen(task)}>
      {settingsList([
        { term: "Assignee", description: people[task.assignee].name },
        { term: "Priority", description: statusBadge(task.priority, priorityTheme[task.priority]) },
        { term: "Due", description: formatDate(task.due) },
        { term: "Comments", description: plural(task.comments, "comment") },
      ], canvas)}
    </Page>
  );
}

/** A fixed-height app window: the AppShell fills it, and its navigation drawer (below 1024px) covers the frame. */
const AppFrame = ({ children, frameRef }: { children: ReactNode; frameRef?: Ref<HTMLDivElement> }) => <div ref={frameRef} className="px-sidebar-frame"><div className="px-sidebar-frame__scroll">{children}</div></div>;

/* The studio's mark and name. The logo slot has a fixed height (24px; 20px in Small-Density), so the mark is an image that
   fills it and the name uses a text style whose line fits it: nothing grows past the slot at Comfortable density. */
const studioLogo = <span className="px-sidebar-brand"><img src={studio.logo} alt="" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></span>;
const handbookLogo = <span className="px-sidebar-brand"><img src={studio.logo} alt="" /><Text as="span" textStyle="Body/Small/Bold">{studio.name}</Text></span>;
const studioMark = <Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />;
const handbookMark = <img className="px-sidebar-mark" src={studio.logo} alt={studio.name} />;
const openProjects = projects.filter((p) => p.status !== "Completed");
const tasksOf = (projectId: string) => tasks.filter((t) => t.project === projectId);
const filesOf = (projectId: string) => files.filter((f) => f.project === projectId);
const dueThisWeek = tasks.filter((t) => t.status !== "Done" && t.due <= daysFromToday(7)).sort((a, b) => +a.due - +b.due).slice(0, 5);
const settingsList = (items: { term: string; description: ReactNode }[], canvas: Canvas) => <Card {...cardLook[canvas]}><DescriptionList items={items} /></Card>;
/** The studio's plan, from the shared price list: Business, 48 seats, billed monthly. */
const studioPlan = plans.find((plan) => plan.id === workspacePlan.plan)!;
const studioSeats = workspacePlan.seats;

/** A footer destination: the app's own button, an icon and a label. On the collapsed rail the Sidebar hides the label
 *  visually but keeps it as the button's name, and shows it as a tooltip like the rail's own items. */
function FooterButton({ icon, label, current, onClick }: { icon: IconName; label: string; current: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-current={current ? "page" : undefined} onClick={onClick}>
      <Icon name={icon} size="base" /><span>{label}</span>
    </button>
  );
}

// ——— 1. Studio navigation ——————————————————————————————————————————————————————————————————————————————
const myTaskIds = ["t5", "t2", "t8"]; // assigned to Alex, or waiting for his review
const helpRows: Row[] = [
  { id: "shortcuts", title: "Keyboard shortcuts", caption: "Move around Zen without the mouse", leading: itemIcon("icon-keyboard-line") },
  { id: "invite", title: "Invite your team", caption: "Add people and choose what they can see", leading: itemIcon("icon-users-plus-line") },
  { id: "figma", title: "Connect Figma", caption: "Show live designs on tasks and reviews", leading: itemIcon("icon-link-01-line") },
];

function StudioNavigationExample() {
  const { toast } = useToast();
  const [page, setPage] = useState("home");
  // Remember it per person in a real app (e.g. localStorage), so the rail stays the way they left it.
  const [collapsed, setCollapsed] = useState(false);
  const [unread, setUnread] = useState(["a1", "a2", "a3"]);
  const [seen, setSeen] = useState(false);
  const [added, setAdded] = useState<Project[]>([]);
  const [newTasks, setNewTasks] = useState<Task[]>([]);
  const [dialog, setDialog] = useState<"project" | "task" | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  const list = [...added, ...openProjects];
  const go = (id: string) => { setPage(id); setTaskId(null); if (id === "phin-loyalty") setSeen(true); };
  const openTask = (t: Task) => setTaskId(t.id);
  const frameRef = useRef<HTMLDivElement>(null);
  const markRead = () => {
    const before = unread;
    setUnread([]);
    // Mark all read goes once nothing is unread: focus moves to Inbox in the Sidebar, whose counter just cleared (or to
    // the menu button while the Sidebar is a closed drawer).
    requestAnimationFrame(() => {
      const inbox = frameRef.current?.querySelector<HTMLElement>('.zen-sidebar [aria-current="page"]');
      inbox?.focus();
      if (document.activeElement !== inbox) frameRef.current?.querySelector<HTMLElement>(".zen-app-shell__header button")?.focus();
    });
    toast({ title: "Messages marked as read", action: { label: "Undo", onClick: () => setUnread(before) } });
  };
  const addProject = (name: string) => {
    const id = `new-project-${added.length + 1}`;
    setAdded((current) => [{ ...projects[0], id, name, client: studio.name, icon: "icon-cube-line", status: "Planning", lead: "alex", start: daysFromToday(0), due: daysFromToday(60) }, ...current]);
    go(id);
  };
  const addTask = (title: string) => setNewTasks((current) => [...current, { id: `new-task-${current.length + 1}`, key: `${initials(list.find((p) => p.id === page)?.name ?? "New")}-${current.length + 1}`, title, project: page, assignee: "alex", status: "To do", priority: "Medium", due: daysFromToday(7), comments: 0 }]);

  const sections: SidebarSection[] = [
    { items: [
      { id: "home", label: "Home", icon: "icon-home-03-line" },
      // Counters for things to act on; hidden at zero.
      { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line", counter: unread.length || undefined },
      { id: "my-tasks", label: "My tasks", icon: "icon-check-square-line", counter: myTaskIds.length },
    ] },
    { label: "Projects",
      action: <IconButton appearance="flat" level="primary" size="sm" aria-label="New project" icon="icon-plus-line" onClick={() => setDialog("project")} />,
      // A dot for "something new" (a comment Alex hasn't seen), cleared once he opens the project.
      items: list.map((p) => ({ id: p.id, label: p.name, icon: p.icon, notificationDot: p.id === "phin-loyalty" && !seen })) },
  ];
  const footerButton = (id: string, icon: IconName, label: string) => (
    <FooterButton icon={icon} label={label} current={page === id} onClick={() => go(id)} />
  );

  const project = list.find((p) => p.id === page);
  const task = [...tasks, ...newTasks].find((t) => t.id === taskId);
  const pageTitle = project?.name ?? { inbox: "Inbox", "my-tasks": "My tasks", settings: "Settings", help: "Help" }[page] ?? "Home";
  let content: ReactNode;
  if (task) {
    content = <TaskPage task={task} from={pageTitle} project={list.find((p) => p.id === task.project)?.name ?? projectById(task.project).name} canvas="default" onBack={() => setTaskId(null)} />;
  } else if (project) {
    const rows = [...tasksOf(project.id), ...newTasks.filter((t) => t.project === project.id)].map((t) => taskRow(t, openTask));
    content = (
      <Page title={project.name} meta={statusBadge(project.status, projectStatusTheme[project.status])} description={`${project.client} · Due ${formatDate(project.due)}`}>
        {rows.length ? <RowCard label="Tasks" rows={rows} canvas="default" /> : (
          <EmptyState headingLevel={2} title="No tasks yet" icon="icon-check-square-line" primaryAction={{ label: "Add task", onClick: () => setDialog("task") }}>
            Tasks you add to {project.name} show up here.
          </EmptyState>
        )}
      </Page>
    );
  } else if (page === "inbox") {
    content = (
      <Page title="Inbox" description={unread.length ? plural(unread.length, "unread message") : "You’re all caught up."}
        actions={unread.length ? <Button level="tertiary" onClick={markRead}>Mark all read</Button> : undefined}>
        <RowCard label="Inbox" rows={activity.map((a) => activityRow(a, unread.includes(a.id)))} canvas="default" />
      </Page>
    );
  } else if (page === "my-tasks") {
    content = <Page title="My tasks" description="Assigned to you or waiting for your review"><RowCard label="My tasks" rows={tasks.filter((t) => myTaskIds.includes(t.id)).map((t) => taskRow(t, openTask))} canvas="default" /></Page>;
  } else if (page === "settings") {
    content = (
      <Page title="Settings" description={`Workspace details for ${studio.name}`}>
        {settingsList([{ term: "Workspace", description: studio.name }, { term: "Domain", description: studio.domain }, { term: "Members", description: plural(studioSeats, "person", "people") }, { term: "Plan", description: `${studioPlan.name} · ${plural(studioSeats, "seat")} · billed ${workspacePlan.billing}` }], "default")}
      </Page>
    );
  } else if (page === "help") {
    content = <Page title="Help" description="Guides for the studio’s Zen workspace"><RowCard label="Help articles" rows={helpRows} canvas="default" /></Page>;
  } else {
    content = <Page title="Home" description="Due this week across your projects"><RowCard label="Due this week" rows={dueThisWeek.map((t) => taskRow(t, openTask))} canvas="default" /></Page>;
  }

  return (
    <AppFrame frameRef={frameRef}>
      <AppShell
        sidebar={(
          <Sidebar
            logo={studioLogo}
            logoCollapsed={studioMark}
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            sections={sections}
            selectedId={page}
            onItemClick={(item) => go(item.id)}
            footer={<>{footerButton("settings", "icon-settings-01-line", "Settings")}{footerButton("help", "icon-help-circle-line", "Help")}</>}
          />
        )}
      >
        {content}
      </AppShell>
      <DemoFieldDialog open={dialog === "project"} onOpenChange={(open) => setDialog(open ? "project" : null)} title="New project"
        field={{ kind: "name", label: "Project name", placeholder: "Website refresh" }} submitLabel="Create project" confirm={(name) => `${name} created`} onSubmit={addProject} />
      <DemoFieldDialog open={dialog === "task"} onOpenChange={(open) => setDialog(open ? "task" : null)} title="New task"
        field={{ kind: "name", label: "Task name", placeholder: "Plan the kickoff workshop" }} submitLabel="Add task" confirm={() => "Task added"} onSubmit={addTask} />
    </AppFrame>
  );
}

// ——— 2. Projects flyout ——————————————————————————————————————————————————————————————————————————————
const pinnedIds = ["lumen-banking", "phin-loyalty"];

function ProjectsFlyoutExample() {
  const { toast } = useToast();
  const [page, setPage] = useState("lumen-banking");
  const [collapsed, setCollapsed] = useState(true);
  const [flyout, setFlyout] = useState(false);
  const [query, setQuery] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);

  const open = (id: string) => { setPage(id); setTaskId(null); setFlyout(false); setQuery(""); };
  const openTask = (t: Task) => setTaskId(t.id);
  // The flyout goes away on a pick or Escape: focus returns to Projects on the rail, the control that opened it.
  const shellRef = useRef<HTMLDivElement>(null);
  const focusProjects = () => requestAnimationFrame(() => [...(shellRef.current?.querySelectorAll<HTMLElement>(".zen-sidebar__item") ?? [])]
    .find((item) => item.textContent?.trim() === "Projects")?.focus());
  const download = (f: StudioFile) => toast({ title: "Download started", children: f.name });
  const onProject = projects.some((p) => p.id === page);
  // The flyout holds its own selection, so the rail marks Projects while the flyout marks the open project.
  const toItem = (p: Project): SidebarItem => ({ id: p.id, label: p.name, icon: p.icon, selected: p.id === page });
  const q = query.trim().toLowerCase();
  const matches = projects.filter((p) => !q || `${p.name} ${p.client}`.toLowerCase().includes(q));
  const flyoutSections: SidebarSection[] = [
    { label: "Pinned", items: matches.filter((p) => pinnedIds.includes(p.id)).map(toItem) },
    { label: "All projects", items: matches.filter((p) => !pinnedIds.includes(p.id)).map(toItem) },
  ].filter((section) => section.items.length);

  const sections: SidebarSection[] = [{ items: [
    { id: "home", label: "Home", icon: "icon-home-03-line", selected: page === "home" },
    { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line", counter: 3, selected: page === "inbox" },
    { id: "projects", label: "Projects", icon: "icon-folder-line", selected: onProject },
    { id: "files", label: "Files", icon: "icon-file-doc-line", selected: page === "files" },
    { id: "invoices", label: "Invoices", icon: "icon-receipt-line", selected: page === "invoices" },
  ] }];

  const project = projects.find((p) => p.id === page);
  const task = tasks.find((t) => t.id === taskId);
  const content = task ? <TaskPage task={task} from={project?.name ?? "Home"} project={projectById(task.project).name} canvas="alt" onBack={() => setTaskId(null)} />
    : project ? (
      <Page title={project.name} meta={statusBadge(project.status, projectStatusTheme[project.status])} description={`${project.client} · Due ${formatDate(project.due)}`}>
        {tasksOf(project.id).length ? <RowCard label="Tasks" rows={tasksOf(project.id).map((t) => taskRow(t, openTask))} canvas="alt" /> : <RowCard label="Files" rows={filesOf(project.id).map((f) => fileRow(f, download))} canvas="alt" />}
      </Page>
    ) : page === "inbox" ? <Page title="Inbox" description={plural(3, "unread message")}><RowCard label="Inbox" rows={activity.map((a) => activityRow(a, Boolean(a.unread)))} canvas="alt" /></Page>
      : page === "files" ? <Page title="Files" description="Recently updated across your projects"><RowCard label="Files" rows={files.map((f) => fileRow(f, download))} canvas="alt" /></Page>
        : page === "invoices" ? <Page title="Invoices" description="Sent, paid and overdue this quarter"><RowCard label="Invoices" rows={invoices.map(invoiceRow)} canvas="alt" /></Page>
          : <Page title="Home" description="Due this week across your projects"><RowCard label="Due this week" rows={dueThisWeek.map((t) => taskRow(t, openTask))} canvas="alt" /></Page>;

  return (
    // Canvas/Alt (a white page) → Sidebar background="alt".
    <div ref={shellRef} className="pe-shell pe-shell--tall px-sidebar-rail-shell" data-canvas="alt">
      <Sidebar
        background="alt"
        logo={studioLogo}
        logoCollapsed={studioMark}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        sections={sections}
        onItemClick={(item) => (item.id === "projects" ? setFlyout((shown) => !shown) : open(item.id))}
        subMenuLabel="Projects"
        onSubMenuClose={(event) => { setFlyout(false); setQuery(""); if (event.type === "keydown") focusProjects(); }}
        subMenu={flyout ? (
          <SidebarSubMenu
            search={<Search variant="popover" placeholder="Search projects" aria-label="Search projects" value={query} onValueChange={setQuery} autoFocus />}
            sections={flyoutSections}
            onItemClick={(item) => { open(item.id); focusProjects(); }}
          >
            {flyoutSections.length ? null : (
              <EmptyState headingLevel={2} illustration={false} title="No projects match" secondaryAction={{ label: "Show all projects", onClick: () => setQuery("") }}>
                Try a project or client name.
              </EmptyState>
            )}
          </SidebarSubMenu>
        ) : undefined}
      />
      <div className="px-sidebar-main">{content}</div>
    </div>
  );
}

// ——— 3. Switch workspace ——————————————————————————————————————————————————————————————————————————————
type Workspace = { id: string; label: string; mark: ReactNode; sections: SidebarSection[]; members: number; role: string };
const nav = (id: string, label: string, icon: IconName, extra: Partial<SidebarItem> = {}): SidebarItem => ({ id, label, icon, ...extra });
const baseWorkspaces: Workspace[] = [
  { id: "ws-dizai", label: studio.name, mark: <Avatar size="medium" shape="square" theme="photo" src={studio.logo} alt="" />, members: studioSeats, role: "Admin",
    sections: [{ items: [nav("home", "Home", "icon-home-03-line"), nav("inbox", "Inbox", "ic-inbox-01-line", { counter: 3 }), nav("projects", "Projects", "icon-folder-line"), nav("people", "People", "icon-users-line"), nav("invoices", "Invoices", "icon-receipt-line")] }] },
  { id: "ws-phin", label: "Phin & Co", mark: <Avatar size="medium" shape="square" theme="brown" alt="">PC</Avatar>, members: 9, role: "Guest",
    sections: [{ items: [nav("overview", "Overview", "icon-home-03-line"), nav("tasks", "Tasks", "icon-check-square-line"), nav("files", "Files", "icon-file-doc-line")] }, { label: "Shared with Phin & Co", items: [nav("feedback", "Feedback", "icon-message-chat-circle-line", { counter: 2 })] }] },
  { id: "ws-lumen", label: "Lumen Bank", mark: <Avatar size="medium" shape="square" theme="blue" alt="">LB</Avatar>, members: 14, role: "Member",
    sections: [{ items: [nav("overview", "Overview", "icon-home-03-line"), nav("tasks", "Tasks", "icon-check-square-line"), nav("files", "Files", "icon-file-doc-line")] }] },
];
const clientProject: Record<string, string> = { "ws-phin": "phin-loyalty", "ws-lumen": "lumen-banking" };
const feedbackRows: Row[] = [
  { id: "fb1", title: "Lan Tran", caption: "Can the points balance sit above the fold? · 13 minutes ago", leading: <Avatar size="medium" theme="crimson" alt="">LT</Avatar> },
  { id: "fb2", title: "Quang Ho", caption: "Approved the rewards screens for the pilot · Yesterday at 4:40 pm", leading: <Avatar size="medium" theme="indigo" alt="">QH</Avatar> },
];
/** Initials marks use themes whose white initials reach 3:1 (orange, cyan, green, teal and yellow do not). */
const newWorkspaceThemes = ["purple", "plum", "violet"] as const;

function SwitchWorkspaceExample() {
  const [workspaces, setWorkspaces] = useState(baseWorkspaces);
  const [active, setActive] = useState("ws-phin");
  // Each workspace keeps the page Alex had open in it.
  const [pages, setPages] = useState<Record<string, string>>({ "ws-dizai": "home", "ws-phin": "overview", "ws-lumen": "overview" });
  const [dialog, setDialog] = useState<"workspace" | "project" | null>(null);
  const [created, setCreated] = useState<Record<string, string[]>>({});
  const [taskId, setTaskId] = useState<string | null>(null);

  const workspace = workspaces.find((w) => w.id === active) ?? workspaces[0];
  const page = pages[workspace.id] ?? "home";
  const setPage = (id: string) => { setPages((current) => ({ ...current, [workspace.id]: id })); setTaskId(null); };
  const switchTo = (id: string) => { setActive(id); setTaskId(null); };
  const openTask = (t: Task) => setTaskId(t.id);
  const task = tasks.find((t) => t.id === taskId);
  const addWorkspace = (name: string) => {
    const id = `ws-new-${workspaces.length}`;
    const theme = newWorkspaceThemes[(workspaces.length - baseWorkspaces.length) % newWorkspaceThemes.length];
    setWorkspaces((current) => [...current, { id, label: name, mark: <Avatar size="medium" shape="square" theme={theme} alt="">{initials(name)}</Avatar>, members: 1, role: "Owner", sections: [{ items: [nav("home", "Home", "icon-home-03-line")] }] }]);
    switchTo(id);
  };

  const label = workspace.sections.flatMap((s) => s.items).find((item) => item.id === page)?.label ?? "Settings";
  const projectId = clientProject[workspace.id];
  let content: ReactNode;
  if (page === "settings") content = settingsList([{ term: "Workspace", description: workspace.label }, { term: "Members", description: plural(workspace.members, "person", "people") }, { term: "Your role", description: workspace.role }], "alt");
  else if (workspace.id.startsWith("ws-new")) {
    const names = created[workspace.id] ?? [];
    content = names.length
      ? <RowCard label="Projects" rows={names.map((name, index) => ({ id: `${index}`, title: name, caption: `Planning · created by ${people.alex.name}`, leading: itemIcon("icon-cube-line") }))} canvas="alt" />
      : <EmptyState headingLevel={2} title="No projects yet" icon="icon-folder-line" primaryAction={{ label: "New project", onClick: () => setDialog("project") }}>Projects you create in {workspace.label} show up here.</EmptyState>;
  }
  else if (projectId) {
    const p = projectById(projectId);
    content = page === "tasks" ? <RowCard label="Tasks" rows={tasksOf(p.id).map((t) => taskRow(t, openTask))} canvas="alt" />
      : page === "files" ? <RowCard label="Files" rows={filesOf(p.id).map((f) => fileRow(f))} canvas="alt" />
        : page === "feedback" ? <RowCard label="Feedback" rows={feedbackRows} canvas="alt" />
          : settingsList([{ term: "Project", description: p.name }, { term: "Lead", description: people[p.lead].name }, { term: "Status", description: statusBadge(p.status, projectStatusTheme[p.status]) }, { term: "Due", description: formatDate(p.due) }], "alt");
  } else {
    content = page === "inbox" ? <RowCard label="Inbox" rows={activity.map((a) => activityRow(a, Boolean(a.unread)))} canvas="alt" />
      : page === "projects" ? <RowCard label="Projects" rows={projects.map(projectRow)} canvas="alt" />
        : page === "people" ? <RowCard label="People" rows={peopleList.slice(0, 6).map(personRow)} canvas="alt" />
          : page === "invoices" ? <RowCard label="Invoices" rows={invoices.map(invoiceRow)} canvas="alt" />
            : <RowCard label="Due this week" rows={dueThisWeek.map((t) => taskRow(t, openTask))} canvas="alt" />;
  }

  return (
    <AppFrame>
      <AppShell canvas="alt" sidebar={(
        <Sidebar
          variant="workspace"
          background="alt"
          // Exactly one selected workspace: it carries the accent Focus-Ring in the rail.
          workspaceItems={workspaces.map((w) => ({ id: w.id, label: w.label, icon: w.mark, selected: w.id === workspace.id }))}
          workspaceAction={<IconButton appearance="main" level="tertiary" size="md" aria-label="Add workspace" icon="icon-plus-line" onClick={() => setDialog("workspace")} />}
          headerAction={<IconButton appearance="flat" level="primary" size="sm" aria-label="Workspace settings" icon="icon-settings-01-line" onClick={() => setPage("settings")} />}
          sections={workspace.sections}
          selectedId={page}
          // The rail and the header's name menu both switch workspace; the rest are pages.
          onItemClick={(item) => (item.id.startsWith("ws-") ? switchTo(item.id) : setPage(item.id))}
        />
      )}>
        {task
          ? <TaskPage task={task} from={label} project={projectById(task.project).name} canvas="alt" onBack={() => setTaskId(null)} />
          : <Page title={label} description={`${workspace.label} · ${plural(workspace.members, "member")}`}>{content}</Page>}
      </AppShell>
      <DemoFieldDialog open={dialog === "workspace"} onOpenChange={(open) => setDialog(open ? "workspace" : null)} title="New workspace" field={{ kind: "name", label: "Workspace name", placeholder: "Saola Outdoor" }}
        submitLabel="Create workspace" confirm={(name) => `${name} created`} onSubmit={addWorkspace} />
      <DemoFieldDialog open={dialog === "project"} onOpenChange={(open) => setDialog(open ? "project" : null)} title="New project" field={{ kind: "name", label: "Project name", placeholder: "Brand guidelines" }}
        submitLabel="Create project" confirm={(name) => `${name} created`} onSubmit={(name) => setCreated((current) => ({ ...current, [workspace.id]: [...(current[workspace.id] ?? []), name] }))} />
    </AppFrame>
  );
}

// ——— 4. Dense handbook navigation ——————————————————————————————————————————————————————————————————
type Doc = { id: string; title: string; summary: string; owner: PersonId; updated: Date };
type Chapter = { id: string; label: string; icon: IconName; docs: Doc[] };
const handbook: Chapter[] = [
  { id: "start", label: "Getting started", icon: "icon-rocket-line", docs: [
    { id: "welcome", title: "Welcome to Đìzai", summary: "Who we are, how the studio is organised and the people to meet in your first week.", owner: "minhAnh", updated: daysFromToday(-12) },
    { id: "accounts", title: "Tools and accounts", summary: "Figma, Zen and the client tools you get on day one, and who to ask for access.", owner: "finn", updated: daysFromToday(-3) },
  ] },
  { id: "work", label: "How we work", icon: "icon-layers-three-01-line", docs: [
    { id: "design-reviews", title: "Design reviews", summary: "When to ask for a review, how to prepare the file and how feedback is given.", owner: "alex", updated: daysFromToday(-1) },
    { id: "code-reviews", title: "Code reviews", summary: "Pull request size, who reviews what, and how fast a review should come back.", owner: "finn", updated: daysFromToday(-9) },
    { id: "client-meetings", title: "Client meetings", summary: "Agendas, notes and the follow-up email every client gets within a day.", owner: "hana", updated: daysFromToday(-21) },
  ] },
  { id: "people-ops", label: "People", icon: "icon-users-line", docs: [
    { id: "time-off", title: "Time off", summary: "Annual leave, sick days and how to ask for time off in Zen.", owner: "minhAnh", updated: daysFromToday(-2) },
    { id: "holidays", title: "Public holidays in Vietnam and Singapore", summary: "The 2026 holiday calendar for the Ho Chi Minh City, Hanoi and Singapore teams.", owner: "minhAnh", updated: daysFromToday(-30) },
  ] },
  { id: "money", label: "Expenses", icon: "icon-receipt-line", docs: [
    { id: "claims", title: "Claiming expenses", summary: "What the studio pays for, receipts, and when the money reaches your account.", owner: "mai", updated: daysFromToday(-6) },
  ] },
];
const allDocs = handbook.flatMap((chapter) => chapter.docs.map((doc) => ({ ...doc, chapter: chapter.label, icon: chapter.icon })));
const teams: { id: string; label: string; team: Team; icon: IconName }[] = [
  { id: "team-design", label: "Design", team: "Design", icon: "icon-palette-line" },
  { id: "team-engineering", label: "Engineering", team: "Engineering", icon: "icon-code-02-line" },
  { id: "team-delivery", label: "Delivery", team: "Delivery", icon: "icon-target-04-line" },
];

function HandbookNavigationExample() {
  const [page, setPage] = useState("recent");
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");

  const open = (id: string) => { setPage(id); setQuery(""); };
  const docRow = (doc: (typeof allDocs)[number]): Row => ({ id: doc.id, title: doc.title, caption: `${doc.chapter} · Updated ${formatDate(doc.updated)} by ${people[doc.owner].name}`, leading: itemIcon(doc.icon), onClick: () => open(doc.id) });
  const sections: SidebarSection[] = [
    { items: [nav("recent", "Recently updated", "icon-clock-line")] },
    // Chapters open in place (one level deep); the chapter holding the open page opens by itself.
    { label: "Handbook", items: handbook.map((chapter) => ({ id: chapter.id, label: chapter.label, icon: chapter.icon, children: chapter.docs.map((doc) => ({ id: doc.id, label: doc.title })) })) },
    { label: "Teams", items: teams.map((t) => nav(t.id, t.label, t.icon)) },
  ];

  const q = query.trim().toLowerCase();
  const doc = allDocs.find((d) => d.id === page);
  const team = teams.find((t) => t.id === page);
  let content: ReactNode;
  if (q) {
    const found = allDocs.filter((d) => `${d.title} ${d.summary}`.toLowerCase().includes(q));
    content = (
      <Page title="Search results" description={found.length ? `${plural(found.length, "page")} for “${query.trim()}”` : undefined}>
        {found.length ? <RowCard label="Search results" rows={found.map(docRow)} canvas="flat" /> : (
          <EmptyState headingLevel={2} title="No pages match" icon="icon-search-medium-line" secondaryAction={{ label: "Show recent pages", onClick: () => setQuery("") }}>
            Try another word, like “leave” or “review”.
          </EmptyState>
        )}
      </Page>
    );
  } else if (doc) {
    content = (
      <Page eyebrow={doc.chapter} title={doc.title} description={doc.summary}>
        {settingsList([{ term: "Owner", description: `${people[doc.owner].name}, ${people[doc.owner].role}` }, { term: "Last updated", description: formatDate(doc.updated) }, { term: "Applies to", description: "Everyone at the studio" }], "flat")}
      </Page>
    );
  } else if (team) {
    const members = peopleList.filter((p) => p.team === team.team);
    content = <Page title={`${team.label} team`} description={plural(members.length, "person", "people")}><RowCard label={`${team.label} team`} rows={members.map(personRow)} canvas="flat" /></Page>;
  } else {
    content = <Page title="Recently updated" description="Handbook pages changed in the last month"><RowCard label="Recently updated" rows={[...allDocs].sort((a, b) => +b.updated - +a.updated).map(docRow)} canvas="flat" /></Page>;
  }

  return (
    <AppFrame>
      {/* Canvas/Flat → Sidebar background="flat": navigation and page read as one plane. */}
      <AppShell canvas="flat" sidebar={(
        <Sidebar
          variant="small-density"
          background="flat"
          logo={handbookLogo}
          logoCollapsed={handbookMark}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          search={<Search size="small" placeholder="Search handbook" aria-label="Search handbook" value={query} onValueChange={setQuery} />}
          sections={sections}
          selectedId={q ? undefined : page}
          // A chapter opens in place; on the collapsed rail it expands the Sidebar first so its pages show.
          onItemClick={(item) => { if (!handbook.some((chapter) => chapter.id === item.id)) open(item.id); else if (collapsed) setCollapsed(false); }}
        />
      )}>
        {content}
      </AppShell>
    </AppFrame>
  );
}

// ——— 5. Links for routing ———————————————————————————————————————————————————————————————————————————
/** Navigation for the demo's routes; in an app this is your router (React Router, Next.js…). */
const NavigateContext = createContext<(path: string) => void>(() => undefined);

/** The app's router link, passed as `linkAs`: a plain click navigates in place, while Cmd/Ctrl-click, a middle click
 *  or Copy link address keep working, because every row is a real link. */
function RouterLink({ href = "", onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const navigate = useContext(NavigateContext);
  return (
    <a href={href} {...rest} onClick={(event) => {
      onClick?.(event);
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(href);
    }} />
  );
}

const routeSections: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line", href: "/home" },
  { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line", href: "/inbox", counter: 3 },
  { id: "projects", label: "Projects", icon: "icon-folder-line", href: "/projects" },
  { id: "invoices", label: "Invoices", icon: "icon-receipt-line", href: "/invoices" },
] }];

function LinksForRoutingExample() {
  const [path, setPath] = useState("/projects/lumen-banking");
  // The first part of the route picks the Sidebar item, so a project's own page keeps Projects selected.
  const [, section, id, taskId] = path.split("/");
  const project = section === "projects" ? projects.find((p) => p.id === id) : undefined;
  const task = project ? tasks.find((t) => t.id === taskId) : undefined;
  const toProject = (p: Project): Row => ({ ...projectRow(p), onClick: () => setPath(`/projects/${p.id}`) });
  let content: ReactNode;
  if (project && task) {
    content = <TaskPage task={task} from={project.name} project={project.name} canvas="default" onBack={() => setPath(`/projects/${project.id}`)} />;
  } else if (project) {
    content = (
      <Page breadcrumbs={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: project.id, label: project.name }]} onNavigate={(_, event) => { event.preventDefault(); setPath("/projects"); }} />}
        title={project.name} meta={statusBadge(project.status, projectStatusTheme[project.status])} description={`${project.client} · Due ${formatDate(project.due)}`}>
        {tasksOf(project.id).length
          ? <RowCard label="Tasks" rows={tasksOf(project.id).map((t) => taskRow(t, (open) => setPath(`/projects/${project.id}/${open.id}`)))} canvas="default" />
          : <RowCard label="Files" rows={filesOf(project.id).map((f) => fileRow(f))} canvas="default" />}
      </Page>
    );
  } else if (section === "projects") {
    content = <Page title="Projects" description={plural(projects.length, "project")}><RowCard label="Projects" rows={projects.map(toProject)} canvas="default" /></Page>;
  } else if (section === "inbox") {
    content = <Page title="Inbox" description={plural(3, "unread message")}><RowCard label="Inbox" rows={activity.map((a) => activityRow(a, Boolean(a.unread)))} canvas="default" /></Page>;
  } else if (section === "invoices") {
    content = <Page title="Invoices" description="Sent, paid and overdue this quarter"><RowCard label="Invoices" rows={invoices.map(invoiceRow)} canvas="default" /></Page>;
  } else {
    content = <Page title="Home" description="Your projects at a glance"><RowCard label="Active projects" rows={projects.filter((p) => p.status === "Active").map(toProject)} canvas="default" /></Page>;
  }
  return (
    <NavigateContext.Provider value={setPath}>
      <AppFrame>
        <AppShell sidebar={<Sidebar logo={studioLogo} logoCollapsed={studioMark} sections={routeSections} linkAs={RouterLink} selectedId={section} />}>
          {content}
        </AppShell>
      </AppFrame>
    </NavigateContext.Provider>
  );
}

/** On a phone the Sidebar is the AppShell drawer: the menu button slides it in over a scrim; a pick closes it. */
const phonePages: Record<string, { title: string; caption: string }> = {
  home: { title: "Home", caption: "Due this week across your projects" },
  inbox: { title: "Inbox", caption: "Mentions, approvals and comments" },
  projects: { title: "Projects", caption: "Everything the studio is working on" },
  reports: { title: "Reports", caption: "Hours and budgets by project" },
};
function SidebarOnPhone() {
  const [page, setPage] = useState("home");
  const sections: SidebarSection[] = [{ items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line", counter: 3 },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "reports", label: "Reports", icon: "icon-bar-chart-01-line" },
  ] }];
  const current = phonePages[page];
  const due = tasks.filter((t) => t.status !== "Done").slice(0, 4);
  return (
    <PlatformPhone label="Zen app">
      <AppShell layout="drawer" sidebar={<Sidebar logo={studioLogo} sections={sections} selectedId={page} onItemClick={(item) => setPage(item.id)} />}>
        <Container>
          <Stack gap="lg" paddingY="md">
            <PageHeader title={current.title} description={current.caption} />
            <List aria-label={`${current.title} tasks`}>
              {due.map((t) => <ListItem key={t.id} title={t.title} caption={`${projectById(t.project).name} · ${formatDue(t.due)}`} />)}
            </List>
          </Stack>
        </Container>
      </AppShell>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Studio navigation",
    description: "The app’s main Sidebar in an AppShell: counters for things to act on, a dot for something new, New project on the Projects title, and Settings and Help in the footer. A task opened from a list keeps that destination selected; below 1024px the shell opens the Sidebar as a drawer.",
    wide: true,
    screen: true,
    render: () => <StudioNavigationExample />,
    code: `const [page, setPage] = useState("home");
const [collapsed, setCollapsed] = useState(false); // remember it per person

// A footer destination: icon + label. On the collapsed rail the Sidebar hides the label visually, keeps it as the
// button's name and shows it as a tooltip.
function FooterButton({ icon, label, current, onClick }) {
  return (
    <button type="button" aria-current={current ? "page" : undefined} onClick={onClick}>
      <Icon name={icon} size="base" /><span>{label}</span>
    </button>
  );
}

<AppShell sidebar={
  <Sidebar
    // The logo slot is 24px tall: an image that fills it, never a component that grows with density.
    logo={<span className="brand"><img src={logo} alt="" /><Text as="span" textStyle="Body/Base/Bold">Đìzai Studio</Text></span>}
    logoCollapsed={<Avatar size="xsmall" shape="square" theme="photo" src={logo} alt="Đìzai Studio" />}
    collapsed={collapsed}
    onCollapsedChange={setCollapsed}
    selectedId={page}
    onItemClick={(item) => setPage(item.id)}
    sections={[
      { items: [
        { id: "home", label: "Home", icon: "icon-home-03-line" },
        { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line", counter: unread.length || undefined },
        { id: "my-tasks", label: "My tasks", icon: "icon-check-square-line", counter: 3 },
      ] },
      { label: "Projects",
        action: <IconButton appearance="flat" level="primary" size="sm" aria-label="New project" icon="icon-plus-line" onClick={openNewProject} />,
        items: projects.map((p) => ({ id: p.id, label: p.name, icon: p.icon, notificationDot: p.hasUnseenComments })) },
    ]}
    footer={<>
      <FooterButton icon="icon-settings-01-line" label="Settings" current={page === "settings"} onClick={() => setPage("settings")} />
      <FooterButton icon="icon-help-circle-line" label="Help" current={page === "help"} onClick={() => setPage("help")} />
    </>}
  />
}>
  <StudioPage id={page} />
</AppShell>`,
  },
  {
    title: "Projects flyout",
    description: "A collapsed rail keeps the page wide; Projects opens a flyout with search and Pinned / All projects sections instead of a long inline list. Escape or a press outside closes it (onSubMenuClose); after Escape or a pick, focus returns to Projects. The rail shows each name as a tooltip on hover or focus.",
    wide: true,
    screen: true,
    render: () => <ProjectsFlyoutExample />,
    code: `const [flyout, setFlyout] = useState(false);
const [query, setQuery] = useState("");
const open = (id) => { setPage(id); setFlyout(false); setQuery(""); };
// A pick or Escape removes the flyout: focus returns to Projects on the rail.
const focusProjects = () => projectsItemRef.current?.focus();

// Canvas/Alt page → background="alt"
<Sidebar
  background="alt"
  collapsed={collapsed}
  onCollapsedChange={setCollapsed}
  sections={[{ items: [
    { id: "home", label: "Home", icon: "icon-home-03-line", selected: page === "home" },
    { id: "projects", label: "Projects", icon: "icon-folder-line", selected: isProjectPage },
    …
  ] }]}
  onItemClick={(item) => item.id === "projects" ? setFlyout(!flyout) : open(item.id)}
  subMenuLabel="Projects"
  onSubMenuClose={(event) => { setFlyout(false); setQuery(""); if (event.type === "keydown") focusProjects(); }}
  subMenu={flyout && (
    <SidebarSubMenu
      search={<Search variant="popover" placeholder="Search projects" aria-label="Search projects" value={query} onValueChange={setQuery} autoFocus />}
      sections={[
        { label: "Pinned", items: pinned.map(toItem) },
        { label: "All projects", items: others.map(toItem) },
      ].filter((section) => section.items.length)}
      onItemClick={(item) => { open(item.id); focusProjects(); }}
    >
      {noMatches && (
        <EmptyState headingLevel={2} illustration={false} title="No projects match"
          secondaryAction={{ label: "Show all projects", onClick: () => setQuery("") }}>
          Try a project or client name.
        </EmptyState>
      )}
    </SidebarSubMenu>
  )}
/>`,
  },
  {
    title: "Switch workspace",
    description: "For people in more than one workspace: the rail lists them with the active one ringed, the header name switches too, and each workspace brings its own sections and keeps the page left open in it. Add workspace ends the rail and settings sit beside the name; on a Canvas/Alt page the Sidebar takes background=\"alt\".",
    wide: true,
    screen: true,
    render: () => <SwitchWorkspaceExample />,
    code: `<AppShell canvas="alt" sidebar={
  <Sidebar
    variant="workspace"
    background="alt"
    workspaceItems={workspaces.map((w) => ({ id: w.id, label: w.name, icon: w.mark, selected: w.id === active }))}
    workspaceAction={<IconButton appearance="main" level="tertiary" size="md" aria-label="Add workspace" icon="icon-plus-line" onClick={openNewWorkspace} />}
    headerAction={<IconButton appearance="flat" level="primary" size="sm" aria-label="Workspace settings" icon="icon-settings-01-line" onClick={() => setPage("settings")} />}
    sections={current.sections}
    selectedId={page}
    onItemClick={(item) => isWorkspace(item.id) ? setActive(item.id) : setPage(item.id)}
  />
}>
  <WorkspacePage workspace={current} page={page} />
</AppShell>`,
  },
  {
    title: "Handbook with chapters",
    description: "A knowledge base with many pages uses Small-Density: search in the header, chapters that open in place one level deep, and a Flat background on a Canvas/Flat page so navigation and page read as one plane. A long page title ellipsizes in the Sidebar and reads in full on its page.",
    wide: true,
    screen: true,
    render: () => <HandbookNavigationExample />,
    code: `<AppShell canvas="flat" sidebar={
  <Sidebar
    variant="small-density"
    background="flat"
    collapsed={collapsed}
    onCollapsedChange={setCollapsed}
    search={<Search size="small" placeholder="Search handbook" aria-label="Search handbook" value={query} onValueChange={setQuery} />}
    sections={[
      { items: [{ id: "recent", label: "Recently updated", icon: "icon-clock-line" }] },
      { label: "Handbook", items: chapters.map((c) => ({
        id: c.id, label: c.label, icon: c.icon,
        children: c.docs.map((doc) => ({ id: doc.id, label: doc.title })),
      })) },
      { label: "Teams", items: teams },
    ]}
    selectedId={page} // opens the chapter that holds the page
    onItemClick={(item) => { if (!isChapter(item.id)) setPage(item.id); }}
  />
}>
  {query ? <SearchResults query={query} /> : <HandbookPage id={page} />}
</AppShell>`,
  },
  {
    title: "Links for routing",
    description: "Destinations are real links: each item has an href and linkAs is the app's router link, so a click navigates in place while Cmd-click and Copy link address work as on any link. selectedId comes from the route, so a project's own page keeps Projects selected.",
    wide: true,
    screen: true,
    render: () => <LinksForRoutingExample />,
    code: `// Your router's link: a plain click navigates in the app; modified clicks stay with the browser.
const RouterLink = ({ href, onClick, ...rest }) => (
  <a href={href} {...rest} onClick={(event) => {
    onClick?.(event);
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    navigate(href);
  }} />
);

const section = pathname.split("/")[1]; // "/projects/lumen-banking" → "projects"

<AppShell sidebar={
  <Sidebar
    logo={logo}
    linkAs={RouterLink}
    selectedId={section}
    sections={[{ items: [
      { id: "home", label: "Home", icon: "icon-home-03-line", href: "/home" },
      { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line", href: "/inbox", counter: 3 },
      { id: "projects", label: "Projects", icon: "icon-folder-line", href: "/projects" },
      { id: "invoices", label: "Invoices", icon: "icon-receipt-line", href: "/invoices" },
    ] }]}
  />
}>
  <Routes />
</AppShell>`,
  },
  {
    title: "On a phone",
    description: "On a phone the same Sidebar is the AppShell drawer: the menu button slides it in, floating over a scrim, with focus on the current page; a pick, Escape or the scrim closes it and the page below changes.",
    render: () => <SidebarOnPhone />,
    code: `// Under 1024px the shell does this by itself (layout="auto"); "drawer" pins it for a phone-only app.
<AppShell layout="drawer"
  sidebar={<Sidebar logo={logo} sections={sections} selectedId={page} onItemClick={(item) => setPage(item.id)} />}>
  <Container>
    <PageHeader title={current.title} description={current.caption} />
    <List aria-label={\`\${current.title} tasks\`}>{/* rows */}</List>
  </Container>
</AppShell>`,
  },
]);
