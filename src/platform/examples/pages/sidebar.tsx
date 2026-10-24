/* Sidebar examples (brief: docs/research/example-rebuild-brief-2026-09-30.md; rebuilt on the new AppShell 2026-10-19).
   Alex Duong moves around the Đìzai Studio app: the studio shell, the projects flyout on a collapsed rail, client
   workspaces, the studio handbook, routed links and a Starter plan. Each desktop screen is one AppShell
   (Pattern/AppShell/Desktop, Layout=Sidebar) in a window: the Sidebar beside the page, Header/AppShell with the trail or
   a Search in its top row and the page's PageHeader in its Main row, and the Body at the page margin (no Container).
   Below 1024px the shell opens the Sidebar as a drawer from the header's menu button; on a phone, from the Top
   Navigation's. */
import { cloneElement, createContext, useContext, useEffect, useId, useRef, useState, type AnchorHTMLAttributes, type ReactElement, type ReactNode, type Ref } from "react";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader, useAppShell, type AppShellLayout } from "../../../components/AppShell";
import { Avatar } from "../../../components/Avatar";
import { Badge, type BadgeTheme } from "../../../components/Badge";
import { BadgeStatus } from "../../../components/BadgeStatus";
import { Breadcrumbs, type BreadcrumbItemData } from "../../../components/Breadcrumbs";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { InlineMessage } from "../../../components/InlineMessage";
import type { IconName } from "../../../components/Icon";
import { Grid, Stack } from "../../../components/Layout";
import { Link } from "../../../components/Link";
import { List, ListBox, ListItem, type ListBoxTheme } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { PageHeader } from "../../../components/PageHeader";
import { Search } from "../../../components/Search";
import { Sidebar, SidebarMenuItem, SidebarMenuSection, SidebarSubHeader, SidebarSubMenu, type SidebarItem, type SidebarSection } from "../../../components/Sidebar";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { PlatformPhone } from "../../PlatformPhone";
import {
  activity, daysFromToday, files, formatBytes, formatCompactMoney, formatDate, formatDay, formatDue, formatMoney, formatRelative, initials,
  invoiceStatusTheme, invoices, me, people, peopleList, plans, priorityTheme, projectById, projectProgress, projectStep, projects, studio, taskStep,
  tasks, workspacePlan, type Activity, type Invoice, type Person, type PersonId, type Project, type StudioFile, type Task, type Team,
} from "../data";
import type { PlatformPage } from "../../PlatformExamples";
import { PreviewAppFrame, StudioLogo, StudioMark } from "../../PlatformFrames";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";

export const page: PlatformPage = "sidebar";

// ——— Shared page parts ——————————————————————————————————————————————————————————————————————————————————
type Row = { id: string; title: string; caption: string; leading: ReactNode; trailing?: ReactNode; onClick?: () => void };
type Canvas = "default" | "alt" | "flat";
/** Cards follow the Sidebar’s elevation, like the ListBox beside them (listBoxLook): the shadow beside the default
 *  Sidebar on the grey Default canvas, the Pale border on the white Alt and Flat canvases (usage rules §16). */
const cardLook: Record<Canvas, { theme: "shadow" | "border" }> = { default: { theme: "shadow" }, alt: { theme: "border" }, flat: { theme: "border" } };

const personAvatar = (p: Person) => p.photo
  ? <Avatar size="medium" theme="photo" src={p.photo} alt="" />
  : <Avatar size="medium" theme={p.theme} alt="">{initials(p.name)}</Avatar>;
const statusBadge = (label: string, theme: BadgeTheme) => <Badge theme={theme} background="subtle">{label}</Badge>;
/** A task's and a project's workflow step: BadgeStatus, the label in the data's words. */
const taskBadge = (task: Task) => <BadgeStatus status={taskStep[task.status]}>{task.status}</BadgeStatus>;
const projectBadge = (project: Project) => <BadgeStatus status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus>;
const itemIcon = (icon: IconName) => <DockIcon icon={icon} theme="neutral" background="subtle" size="medium" />;
const firstName = (p: Person) => p.name.split(" ")[0];

/** The caption follows the status: open work shows when it is due, finished work when it was done. */
const taskWhen = (t: Task) => (t.status === "Done" ? `Done ${formatDay(t.due)}` : formatDue(t.due));
/** Task rows open the task’s own page (its title reads in full there). */
const taskRow = (t: Task, open: (t: Task) => void): Row => ({ id: t.id, title: t.title, caption: `${t.key} · ${taskWhen(t)}`, leading: personAvatar(people[t.assignee]), trailing: taskBadge(t), onClick: () => open(t) });
const fileRow = (f: StudioFile, open?: (f: StudioFile) => void): Row => ({ id: f.id, title: f.name, caption: `${formatBytes(f.bytes)} · ${people[f.owner].name} · ${formatRelative(f.updated)}`, leading: <FileIcon format={fileIconFormatOf(f.name)} size="xl" />, onClick: open ? () => open(f) : undefined });
const personRow = (p: Person): Row => ({ id: p.id, title: p.name, caption: `${p.role} · ${p.location}`, leading: personAvatar(p) });
const activityRow = (a: Activity, unread: boolean): Row => ({ id: a.id, title: people[a.actor].name, caption: `${a.verb[0].toUpperCase()}${a.verb.slice(1)} ${a.object} · ${formatRelative(a.at)}`, leading: personAvatar(people[a.actor]), trailing: unread ? <Badge theme="accent" background="subtle">New</Badge> : undefined });
const invoiceRow = (i: Invoice): Row => ({
  id: i.id, title: i.number, caption: `${i.client} · ${formatMoney(i.amount, true)} · Due ${formatDate(i.due)}`, leading: itemIcon("icon-receipt-line"),
  trailing: statusBadge(i.status, invoiceStatusTheme[i.status]),
});
const projectRow = (p: Project): Row => ({ id: p.id, title: p.name, caption: `${p.client} · Due ${formatDate(p.due)}`, leading: itemIcon(p.icon), trailing: projectBadge(p) });
/** Hours and money by project, for Reports: how far along it is and how much of the budget is spent. */
const reportRow = (p: Project): Row => ({ id: p.id, title: p.name, caption: `${p.progress}% done · ${formatCompactMoney(p.spent)} of ${formatCompactMoney(p.budget)} spent`, leading: itemIcon(p.icon), trailing: projectBadge(p) });

/** A list’s elevation follows the Sidebar: beside the default Sidebar on the grey Default Canvas it takes the Sidebar’s
 *  shadow; the Alt and Flat Canvases are white like Surface/Default (with an Alt or Flat Sidebar), so the ListBox takes
 *  the Pale border there. */
const listBoxLook: Record<Canvas, ListBoxTheme> = { default: "shadow", alt: "border", flat: "border" };
/** One list in a ListBox. `heading`: a titled section (Heading/Subheading, its rows named by it), with an optional
 *  See all link to the page that holds the rest. */
function RowCard({ label, rows, canvas, heading = false, seeAll }: { label: string; rows: Row[]; canvas: Canvas; heading?: boolean; seeAll?: () => void }) {
  const headingId = useId();
  // A list squeezed into a narrow column (a phone-width window) keeps the title readable: the row’s Badge or amount
  // waits on the page the row opens. Measured on the List itself, so the width is the rows’ own inside the ListBox.
  const [listElement, setListElement] = useState<HTMLElement | null>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (!listElement) return undefined;
    const observer = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < 280));
    observer.observe(listElement);
    return () => observer.disconnect();
  }, [listElement]);
  return (
    <ListBox as={heading ? "section" : "div"} aria-labelledby={heading ? headingId : undefined} theme={listBoxLook[canvas]} header={heading ? (
      <Stack direction="row" justify="between" align="center" gap="xs">
        <Heading level={2} id={headingId} textStyle="Heading/Subheading">{label}</Heading>
        {/* A section head’s See all is underlined text, not a button. */}
        {seeAll ? <Text as="span" textStyle="Body/Small/Bold"><Link as="button" tone="inherit" onClick={seeAll}>See all</Link></Text> : null}
      </Stack>
    ) : undefined}>
      <List ref={setListElement} aria-label={heading ? undefined : label} aria-labelledby={heading ? headingId : undefined}>
        {rows.map(({ id, trailing, ...row }) => <ListItem key={id} as="li" titleLines={2} {...row} trailing={narrow ? undefined : trailing} />)}
      </List>
    </ListBox>
  );
}
/** Two sections side by side on a wide page, one above the other in a narrow window. */
const Pair = ({ children }: { children: ReactNode }) => <Grid columns={2} stackBelow={720} gap="md" align="start">{children}</Grid>;
const detailsCard = (items: { term: string; description: ReactNode }[], canvas: Canvas) => <Card {...cardLook[canvas]}><DescriptionList items={items} /></Card>;

/** A crumb of the header’s trail; `go` opens its page. */
type Crumb = BreadcrumbItemData & { go?: () => void };
/** What a page shows: its PageHeader (the header’s Main row), its trail (the top row) and its Body. */
type View = { title: string; description?: ReactNode; meta?: ReactNode; actions?: ReactNode; crumbs?: Crumb[]; body: ReactNode };
const pageHeader = ({ title, description, meta, actions }: View) => <PageHeader title={title} description={description} meta={meta} actions={actions} />;
/** The trail’s crumbs open their pages in place (client-side routing). */
const follow = (crumbs: Crumb[]) => (item: BreadcrumbItemData, event: { preventDefault: () => void }) => { event.preventDefault(); crumbs.find((crumb) => crumb.id === item.id)?.go?.(); };

/** The account button at the end of the header’s top row, with its menu. */
function AccountMenu({ onSettings }: { onSettings?: () => void }) {
  const { toast } = useToast();
  return (
    <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
      { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
      { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => (onSettings ? onSettings() : toast({ title: "Settings", children: "Notifications, security and billing." })) },
      { type: "separator" },
      { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: `See you soon, ${firstName(me)}.` }) },
    ]} />
  );
}

/** Tells the example which structure the shell drew (desktop, drawer, mobile): useAppShell works inside the shell only. */
function ShellLayout({ onLayout }: { onLayout: (layout: AppShellLayout) => void }) {
  const layout = useAppShell()?.layout;
  useEffect(() => { if (layout) onLayout(layout); }, [layout, onLayout]);
  return null;
}

/** A task opened from a list: the Sidebar keeps the list’s destination selected, and the trail leads back to it. */
function taskView(task: Task, back: Crumb[], project: Project | undefined, canvas: Canvas): View {
  const assignee = people[task.assignee];
  const lead = people[project?.lead ?? "alex"];
  return {
    crumbs: [...back, { id: task.id, label: task.key }],
    title: task.title,
    meta: taskBadge(task),
    description: project ? `${project.name} · ${taskWhen(task)}` : taskWhen(task),
    body: (
      <Pair>
        {detailsCard([
          { term: "Assignee", description: assignee.name },
          { term: "Priority", description: statusBadge(task.priority, priorityTheme[task.priority]) },
          { term: "Due", description: formatDate(task.due) },
          { term: "Comments", description: plural(task.comments, "comment") },
        ], canvas)}
        <RowCard heading label="Activity" canvas={canvas} rows={[
          { id: "status", title: assignee.name, caption: `Moved it to ${task.status} · ${formatRelative(daysFromToday(-1, 16, 20))}`, leading: personAvatar(assignee) },
          { id: "created", title: lead.name, caption: `${lead === assignee ? "Created it" : `Created it for ${firstName(assignee)}`} · ${formatDate(daysFromToday(-9))}`, leading: personAvatar(lead) },
        ]} />
      </Pair>
    ),
  };
}

/** A fixed-height app window: the AppShell fills it, and its navigation drawer (below 1024px) covers the frame. */
const AppFrame = ({ children, frameRef }: { children: ReactNode; frameRef?: Ref<HTMLDivElement> }) => <PreviewAppFrame frameRef={frameRef} height={{ min: 560, max: 760 }}>{children}</PreviewAppFrame>;

/* The studio's mark and name. The logo slot has a fixed height (24px; 20px in Small-Density), so the mark is an image that
   fills it and the name uses a text style whose line fits it: nothing grows past the slot at Comfortable density. */
const studioLogo = <StudioLogo src={studio.logo} name={studio.name} />;
const handbookLogo = <StudioLogo src={studio.logo} name={studio.name} textStyle="Body/Small/Bold" />;
const studioMark = <Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />;
const handbookMark = <StudioMark src={studio.logo} name={studio.name} />;
const openProjects = projects.filter((p) => p.status !== "Completed");
const tasksOf = (projectId: string) => tasks.filter((t) => t.project === projectId);
const filesOf = (projectId: string) => files.filter((f) => f.project === projectId);
const dueThisWeek = tasks.filter((t) => t.status !== "Done" && t.due <= daysFromToday(7)).sort((a, b) => +a.due - +b.due).slice(0, 5);
/** The studio’s plan, from the shared price list: Business, 48 seats, billed monthly. */
const studioPlan = plans.find((plan) => plan.id === workspacePlan.plan)!;
const studioSeats = workspacePlan.seats;

/** A project’s own page: its tasks (or, without any, its files or an empty state) beside its files and its team. */
function projectBody(p: Project, canvas: Canvas, extraTasks: Task[], openTask: (t: Task) => void, openFile: (f: StudioFile) => void, empty: ReactNode): ReactNode {
  const taskRows = [...tasksOf(p.id), ...extraTasks].map((t) => taskRow(t, openTask));
  const fileRows = filesOf(p.id).map((f) => fileRow(f, openFile));
  const filesBox = fileRows.length ? <RowCard heading label="Files" rows={fileRows} canvas={canvas} /> : null;
  const team = p.members.map((id) => ({ ...personRow(people[id]), caption: id === p.lead ? `${people[id].role} · Lead` : people[id].role }));
  return (
    <Pair>
      {taskRows.length ? <RowCard heading label="Tasks" rows={taskRows} canvas={canvas} /> : filesBox ?? empty}
      <Stack gap="md">
        {taskRows.length ? filesBox : null}
        <RowCard heading label="Team" rows={team} canvas={canvas} />
      </Stack>
    </Pair>
  );
}

// ——— 1. Studio navigation ——————————————————————————————————————————————————————————————————————————————
const myTaskIds = ["t5", "t2", "t8"]; // assigned to Alex, or waiting for his review
const helpRows: Row[] = [
  { id: "shortcuts", title: "Keyboard shortcuts", caption: "Move around Zen without the mouse", leading: itemIcon("icon-keyboard-line") },
  { id: "invite", title: "Invite your team", caption: "Add people and choose what they can see", leading: itemIcon("icon-users-plus-line") },
  { id: "figma", title: "Connect Figma", caption: "Show live designs on tasks and reviews", leading: itemIcon("icon-link-01-line") },
];
const admins: PersonId[] = ["minhAnh", "alex", "mai"];

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
  const [query, setQuery] = useState("");

  const list = [...added, ...openProjects];
  const allTasks = [...tasks, ...newTasks];
  const go = (id: string) => { setPage(id); setTaskId(null); setQuery(""); if (id === "phin-loyalty") setSeen(true); };
  const openTask = (t: Task) => { setTaskId(t.id); setQuery(""); };
  const frameRef = useRef<HTMLDivElement>(null);
  const markRead = () => {
    const before = unread;
    setUnread([]);
    // Mark all read goes once nothing is unread: focus moves to Inbox in the Sidebar, whose counter just cleared (or to
    // the menu button while the Sidebar is a closed drawer).
    requestAnimationFrame(() => {
      const inbox = frameRef.current?.querySelector<HTMLElement>('.zen-sidebar [aria-current="page"]');
      inbox?.focus();
      if (document.activeElement !== inbox) frameRef.current?.querySelector<HTMLElement>(".zen-app-shell-header__toggle button")?.focus();
    });
    toast({ title: "Messages marked as read", action: { label: "Undo", onClick: () => setUnread(before) } });
  };
  const addProject = (name: string) => {
    const id = `new-project-${added.length + 1}`;
    setAdded((current) => [{ ...projects[0], id, name, client: studio.name, icon: "icon-cube-line", theme: "indigo", status: "Planning", lead: "alex", members: ["alex"], progress: 0, start: daysFromToday(0), due: daysFromToday(60) }, ...current]);
    go(id);
  };
  const addTask = (title: string) => setNewTasks((current) => [...current, { id: `new-task-${current.length + 1}`, key: `${initials(list.find((p) => p.id === page)?.name ?? "New")}-${current.length + 1}`, title, project: page, assignee: "alex", status: "To do", priority: "Medium", due: daysFromToday(7), comments: 0 }]);
  const download = (f: StudioFile) => toast({ title: "Download started", children: f.name });

  const sections: SidebarSection[] = [
    { items: [
      { id: "home", label: "Home", icon: "icon-home-03-line" },
      // Counters for things to act on; hidden at zero.
      { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line", counter: unread.length || undefined },
      { id: "my-tasks", label: "My tasks", icon: "icon-check-square-line", counter: myTaskIds.length },
    ] },
    { label: "Projects",
      action: <IconButton appearance="flat" level="primary" size="sm" aria-label="New project" icon="icon-plus-line" onClick={() => setDialog("project")} />,
      // A dot for "something new" (a comment Alex hasn’t seen), cleared once he opens the project.
      items: list.map((p) => ({ id: p.id, label: p.name, icon: p.icon, notificationDot: p.id === "phin-loyalty" && !seen })) },
  ];

  const project = list.find((p) => p.id === page);
  const task = allTasks.find((t) => t.id === taskId);
  const pageTitle = project?.name ?? { inbox: "Inbox", "my-tasks": "My tasks", settings: "Settings", help: "Help" }[page] ?? "Home";
  const q = query.trim().toLowerCase();
  let view: View;
  if (q) {
    const rows = [
      ...list.filter((p) => `${p.name} ${p.client}`.toLowerCase().includes(q)).map((p) => ({ ...projectRow(p), onClick: () => go(p.id) })),
      ...allTasks.filter((t) => `${t.title} ${t.key}`.toLowerCase().includes(q)).map((t) => taskRow(t, openTask)),
    ];
    view = {
      title: "Search results",
      description: rows.length ? `${plural(rows.length, "result")} for “${query.trim()}”` : `Nothing in ${studio.name} matches “${query.trim()}”`,
      body: rows.length ? <RowCard label="Search results" rows={rows} canvas="default" /> : (
        <EmptyState headingLevel={2} title="No projects or tasks match" icon="icon-search-medium-line" secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>
          Try a client, a project or a task key such as LUM-091.
        </EmptyState>
      ),
    };
  } else if (task) {
    view = taskView(task, [{ id: "back", label: pageTitle, go: () => setTaskId(null) }], list.find((p) => p.id === task.project) ?? projectById(task.project), "default");
  } else if (project) {
    const extra = newTasks.filter((t) => t.project === project.id);
    const hasTasks = tasksOf(project.id).length + extra.length > 0;
    view = {
      title: project.name,
      meta: projectBadge(project),
      description: `${project.client} · Led by ${people[project.lead].name} · Due ${formatDate(project.due)}`,
      // The page’s one Primary; an empty project offers it in its empty state instead.
      actions: hasTasks ? <Button level="primary" startIcon="icon-plus-line" onClick={() => setDialog("task")}>Add task</Button> : undefined,
      body: projectBody(project, "default", extra, openTask, download, (
        <EmptyState headingLevel={2} title="No tasks yet" icon="icon-check-square-line" primaryAction={{ label: "Add task", onClick: () => setDialog("task") }}>
          Tasks you add to {project.name} show up here.
        </EmptyState>
      )),
    };
  } else if (page === "inbox") {
    view = {
      title: "Inbox",
      description: unread.length ? plural(unread.length, "unread message") : "You’re all caught up.",
      actions: unread.length ? <Button level="tertiary" startIcon="icon-check-line" onClick={markRead}>Mark all read</Button> : undefined,
      body: <RowCard label="Inbox" rows={activity.map((a) => activityRow(a, unread.includes(a.id)))} canvas="default" />,
    };
  } else if (page === "my-tasks") {
    view = { title: "My tasks", description: "Assigned to you or waiting for your review", body: <RowCard label="My tasks" rows={tasks.filter((t) => myTaskIds.includes(t.id)).map((t) => taskRow(t, openTask))} canvas="default" /> };
  } else if (page === "settings") {
    view = {
      title: "Settings",
      description: `Workspace details for ${studio.name}`,
      body: (
        <Pair>
          {detailsCard([{ term: "Workspace", description: studio.name }, { term: "Domain", description: studio.domain }, { term: "Members", description: plural(studioSeats, "person", "people") }, { term: "Plan", description: `${studioPlan.name} · ${plural(studioSeats, "seat")} · billed ${workspacePlan.billing}` }], "default")}
          <RowCard heading label="Admins" rows={admins.map((id) => personRow(people[id]))} canvas="default" />
        </Pair>
      ),
    };
  } else if (page === "help") {
    view = { title: "Help", description: "Guides for the studio’s Zen workspace", body: <RowCard label="Help articles" rows={helpRows.map((row) => ({ ...row, onClick: () => toast({ title: row.title, children: row.caption }) }))} canvas="default" /> };
  } else {
    view = {
      title: "Home",
      description: `Good morning, ${firstName(me)}. ${plural(dueThisWeek.length, "task")} across your projects are due this week.`,
      body: (
        <Pair>
          <RowCard heading label="Due this week" rows={dueThisWeek.map((t) => taskRow(t, openTask))} canvas="default" />
          <RowCard heading label="Recent activity" rows={activity.slice(0, 4).map((a) => activityRow(a, unread.includes(a.id)))} canvas="default" seeAll={() => go("inbox")} />
        </Pair>
      ),
    };
  }

  return (
    <AppFrame frameRef={frameRef}>
      <AppShell
        // The shell owns the rail: its toggle starts the header’s top row (collapse="header", the default).
        sidebarCollapsed={collapsed}
        onSidebarCollapsedChange={setCollapsed}
        sidebar={(
          <Sidebar
            logo={studioLogo}
            logoCollapsed={studioMark}
            sections={sections}
            selectedId={page}
            onItemClick={(item) => go(item.id)}
            // Figma Footer-Content: Menu-Items like the body’s, selected and handled by the same selectedId / onItemClick.
            footer={<>
              <SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />
              <SidebarMenuItem id="help" label="Help" icon="icon-help-circle-line" />
            </>}
          />
        )}
        header={(
          <AppShellHeader
            // A task’s trail leads back to the list it was opened from; a Sidebar destination has none.
            leading={view.crumbs ? <Breadcrumbs master={false} items={view.crumbs} onNavigate={follow(view.crumbs)} /> : undefined}
            center={<Search placeholder="Search projects and tasks" aria-label={`Search ${studio.name}`} value={query} onValueChange={setQuery} />}
            actions={<AccountMenu onSettings={() => go("settings")} />}
            main={pageHeader(view)}
          />
        )}
      >
        {view.body}
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
  const [layout, setLayout] = useState<AppShellLayout>("desktop");
  const [mentions, setMentions] = useState(true);

  const open = (id: string) => { setPage(id); setTaskId(null); setFlyout(false); setQuery(""); };
  const openTask = (t: Task) => setTaskId(t.id);
  // The flyout goes away on a pick or Escape: focus returns to Projects on the rail, the control that opened it.
  const frameRef = useRef<HTMLDivElement>(null);
  const focusProjects = () => requestAnimationFrame(() => [...(frameRef.current?.querySelectorAll<HTMLElement>(".zen-sidebar__item") ?? [])]
    .find((item) => item.textContent?.trim() === "Projects")?.focus());
  const download = (f: StudioFile) => toast({ title: "Download started", children: f.name });
  const project = projects.find((p) => p.id === page);
  const onProjects = page === "projects" || Boolean(project);
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
    { id: "projects", label: "Projects", icon: "icon-folder-line", selected: onProjects },
    { id: "files", label: "Files", icon: "icon-file-doc-line", selected: page === "files" },
    { id: "invoices", label: "Invoices", icon: "icon-receipt-line", selected: page === "invoices" },
  ] }];

  const toProjects: Crumb = { id: "projects", label: "Projects", go: () => open("projects") };
  const toProject = (p: Project): Row => ({ ...projectRow(p), onClick: () => open(p.id) });
  const task = tasks.find((t) => t.id === taskId);
  let view: View;
  if (task && project) {
    view = taskView(task, [toProjects, { id: project.id, label: project.name, go: () => setTaskId(null) }], project, "alt");
  } else if (project) {
    view = {
      crumbs: [toProjects, { id: project.id, label: project.name }],
      title: project.name,
      meta: projectBadge(project),
      description: `${project.client} · Led by ${people[project.lead].name} · Due ${formatDate(project.due)}`,
      body: projectBody(project, "alt", [], openTask, download, (
        <EmptyState headingLevel={2} title="Nothing here yet" icon="icon-folder-line" secondaryAction={{ label: "Show all projects", onClick: () => open("projects") }}>
          Tasks and files for {project.name} show up here.
        </EmptyState>
      )),
    };
  } else if (page === "projects") {
    view = {
      title: "Projects",
      description: `${plural(projects.length, "project")} · ${pinnedIds.length} pinned`,
      body: (
        <Stack gap="lg">
          <RowCard heading label="Pinned" rows={projects.filter((p) => pinnedIds.includes(p.id)).map(toProject)} canvas="alt" />
          <RowCard heading label="All projects" rows={projects.filter((p) => !pinnedIds.includes(p.id)).map(toProject)} canvas="alt" />
        </Stack>
      ),
    };
  } else if (page === "inbox") {
    view = { title: "Inbox", description: plural(3, "unread message"), body: <RowCard label="Inbox" rows={activity.map((a) => activityRow(a, Boolean(a.unread)))} canvas="alt" /> };
  } else if (page === "files") {
    view = { title: "Files", description: "Recently updated across your projects", body: <RowCard label="Files" rows={files.map((f) => fileRow(f, download))} canvas="alt" /> };
  } else if (page === "invoices") {
    view = { title: "Invoices", description: "Sent, paid and overdue this quarter", body: <RowCard label="Invoices" rows={invoices.map(invoiceRow)} canvas="alt" /> };
  } else {
    view = {
      title: "Home",
      description: "Due this week across your projects",
      body: (
        <Pair>
          <RowCard heading label="Due this week" rows={dueThisWeek.map((t) => taskRow(t, openTask))} canvas="alt" />
          <RowCard heading label="Recent files" rows={files.slice(0, 4).map((f) => fileRow(f, download))} canvas="alt" seeAll={() => open("files")} />
        </Pair>
      ),
    };
  }

  return (
    <AppFrame frameRef={frameRef}>
      {/* Canvas/Alt (a white page) → the Sidebar sits on the canvas: Surface/Default (the canvas's own colour) with no
          shadow and a Pale divider, and bordered boxes (theme/navigation-surface). The rail starts collapsed. */}
      <AppShell canvas="alt" sidebarCollapsed={collapsed} onSidebarCollapsedChange={setCollapsed}
        sidebar={(
          <Sidebar
            shadow={false}
            divider
            logo={studioLogo}
            logoCollapsed={studioMark}
            sections={sections}
            // On the rail Projects opens the flyout; the drawer (below 1024px) shows the whole navigation, so there
            // Projects opens the projects page.
            onItemClick={(item) => (item.id !== "projects" ? open(item.id) : layout === "desktop" ? setFlyout((shown) => !shown) : open("projects"))}
            subMenuLabel="Projects"
            onSubMenuClose={(event) => { setFlyout(false); setQuery(""); if (event.type === "keydown") focusProjects(); }}
            subMenu={flyout && layout === "desktop" ? (
              <SidebarSubMenu
                search={<Search variant="popover" placeholder="Search projects" aria-label="Search projects" value={query} onValueChange={setQuery} autoFocus />}
                sections={flyoutSections}
                onItemClick={(item) => { open(item.id); focusProjects(); }}
              >
                {flyoutSections.length ? null : (
                  <EmptyState headingLevel={2} size="sm" icon="icon-search-medium-line" title="No projects match" secondaryAction={{ label: "Show all projects", onClick: () => setQuery("") }}>
                    Try a project or client name.
                  </EmptyState>
                )}
              </SidebarSubMenu>
            ) : undefined}
          />
        )}
        header={(
          <AppShellHeader
            leading={view.crumbs ? <Breadcrumbs master={false} items={view.crumbs} onNavigate={follow(view.crumbs)} /> : undefined}
            actions={<>
              <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" dot={mentions}
                onClick={() => { setMentions(false); toast({ title: "Chi Tran mentioned you", children: "“Can you check the points history empty state?” · Loyalty app" }); }} />
              <AccountMenu />
            </>}
            main={pageHeader(view)}
          />
        )}
      >
        <ShellLayout onLayout={setLayout} />
        {view.body}
      </AppShell>
    </AppFrame>
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
/** Initials marks use themes whose white initials reach 3:1 (golden, teal, cyan, orange and yellow do not). */
const newWorkspaceThemes = ["purple", "plum", "violet"] as const;
/** The role reads as a Badge in the header’s top row: what Alex may do in this workspace. */
const roleTheme: Record<string, BadgeTheme> = { Admin: "accent", Owner: "accent", Member: "neutral", Guest: "yellow" };

function SwitchWorkspaceExample() {
  const [workspaces, setWorkspaces] = useState(baseWorkspaces);
  const [active, setActive] = useState("ws-phin");
  // Each workspace keeps the page Alex had open in it.
  const [pages, setPages] = useState<Record<string, string>>({ "ws-dizai": "home", "ws-phin": "overview", "ws-lumen": "overview" });
  const [dialog, setDialog] = useState<"workspace" | "project" | null>(null);
  const [created, setCreated] = useState<Record<string, string[]>>({});
  const [taskId, setTaskId] = useState<string | null>(null);

  const workspace = workspaces.find((w) => w.id === active) ?? workspaces[0];
  const homeId = workspace.sections[0].items[0].id;
  const page = pages[workspace.id] ?? homeId;
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
  // The trail starts at the workspace (its home); its own home page has none.
  const toHome: Crumb = { id: "workspace", label: workspace.label, go: () => setPage(homeId) };
  const crumbs: Crumb[] | undefined = page === homeId ? undefined : [toHome, { id: page, label, go: () => setTaskId(null) }];
  let body: ReactNode;
  if (page === "settings") body = detailsCard([{ term: "Workspace", description: workspace.label }, { term: "Members", description: plural(workspace.members, "person", "people") }, { term: "Your role", description: workspace.role }], "alt");
  else if (workspace.id.startsWith("ws-new")) {
    const names = created[workspace.id] ?? [];
    body = names.length
      ? <RowCard label="Projects" rows={names.map((name, index) => ({ id: `${index}`, title: name, caption: `Planning · created by ${people.alex.name}`, leading: itemIcon("icon-cube-line") }))} canvas="alt" />
      : <EmptyState headingLevel={2} title="No projects yet" icon="icon-folder-line" primaryAction={{ label: "New project", onClick: () => setDialog("project") }}>Projects you create in {workspace.label} show up here.</EmptyState>;
  } else if (projectId) {
    const p = projectById(projectId);
    const open = tasksOf(p.id).filter((t) => t.status !== "Done");
    const latest = projectId === "phin-loyalty"
      ? <RowCard heading label="Latest feedback" rows={feedbackRows} canvas="alt" seeAll={() => setPage("feedback")} />
      : <RowCard heading label="Recent files" rows={filesOf(p.id).map((f) => fileRow(f))} canvas="alt" seeAll={() => setPage("files")} />;
    body = page === "tasks" ? <RowCard label="Tasks" rows={tasksOf(p.id).map((t) => taskRow(t, openTask))} canvas="alt" />
      : page === "files" ? <RowCard label="Files" rows={filesOf(p.id).map((f) => fileRow(f))} canvas="alt" />
        : page === "feedback" ? <RowCard label="Feedback" rows={feedbackRows} canvas="alt" />
          : (
            <Pair>
              <Stack gap="md">
                {detailsCard([{ term: "Project", description: p.name }, { term: "Lead", description: people[p.lead].name }, { term: "Status", description: projectBadge(p) }, { term: "Due", description: formatDate(p.due) }], "alt")}
                {latest}
              </Stack>
              <RowCard heading label="Open tasks" rows={open.map((t) => taskRow(t, openTask))} canvas="alt" seeAll={() => setPage("tasks")} />
            </Pair>
          );
  } else {
    body = page === "inbox" ? <RowCard label="Inbox" rows={activity.map((a) => activityRow(a, Boolean(a.unread)))} canvas="alt" />
      : page === "projects" ? <RowCard label="Projects" rows={projects.map(projectRow)} canvas="alt" />
        : page === "people" ? <RowCard label="People" rows={peopleList.slice(0, 6).map(personRow)} canvas="alt" />
          : page === "invoices" ? <RowCard label="Invoices" rows={invoices.map(invoiceRow)} canvas="alt" />
            : (
              <Pair>
                <RowCard heading label="Due this week" rows={dueThisWeek.map((t) => taskRow(t, openTask))} canvas="alt" />
                <RowCard heading label="Recent activity" rows={activity.slice(0, 4).map((a) => activityRow(a, Boolean(a.unread)))} canvas="alt" seeAll={() => setPage("inbox")} />
              </Pair>
            );
  }
  const view: View = task
    ? taskView(task, crumbs ?? [toHome], projectById(task.project), "alt")
    : { crumbs, title: label, description: `${workspace.label} · ${plural(workspace.members, "member")}`, body };

  return (
    <AppFrame>
      <AppShell canvas="alt"
        sidebar={(
          <Sidebar
            variant="workspace"
            divider
            // Exactly one selected workspace: it carries the accent Focus-Ring in the rail.
            workspaceItems={workspaces.map((w) => ({ id: w.id, label: w.label, icon: w.mark, selected: w.id === workspace.id }))}
            workspaceAction={<IconButton appearance="main" level="tertiary" size="md" aria-label="Add workspace" icon="icon-plus-line" onClick={() => setDialog("workspace")} />}
            headerAction={<IconButton appearance="flat" level="primary" size="sm" aria-label="Workspace settings" icon="icon-settings-01-line" onClick={() => setPage("settings")} />}
            sections={workspace.sections}
            selectedId={page}
            // The rail and the header’s name menu both switch workspace; the rest are pages.
            onItemClick={(item) => (item.id.startsWith("ws-") ? switchTo(item.id) : setPage(item.id))}
          />
        )}
        // The workspace Sidebar has no rail to collapse, so the top row starts with the trail.
        header={(
          <AppShellHeader
            leading={view.crumbs ? <Breadcrumbs master={false} items={view.crumbs} onNavigate={follow(view.crumbs)} /> : undefined}
            actions={<>
              <Badge theme={roleTheme[workspace.role] ?? "neutral"} background="subtle">{workspace.role}</Badge>
              <AccountMenu onSettings={() => setPage("settings")} />
            </>}
            main={pageHeader(view)}
          />
        )}
      >
        {view.body}
      </AppShell>
      <DemoFieldDialog open={dialog === "workspace"} onOpenChange={(open) => setDialog(open ? "workspace" : null)} title="New workspace" field={{ kind: "name", label: "Workspace name", placeholder: "Saola Outdoor" }}
        submitLabel="Create workspace" confirm={(name) => `${name} created`} onSubmit={addWorkspace} />
      <DemoFieldDialog open={dialog === "project"} onOpenChange={(open) => setDialog(open ? "project" : null)} title="New project" field={{ kind: "name", label: "Project name", placeholder: "Brand guidelines" }}
        submitLabel="Create project" confirm={(name) => `${name} created`} onSubmit={(name) => setCreated((current) => ({ ...current, [workspace.id]: [...(current[workspace.id] ?? []), name] }))} />
    </AppFrame>
  );
}

// ——— 4. Dense handbook navigation ——————————————————————————————————————————————————————————————————
type Doc = { id: string; title: string; summary: string; owner: PersonId; updated: Date; points: string[] };
type Chapter = { id: string; label: string; icon: IconName; docs: Doc[] };
const handbook: Chapter[] = [
  { id: "start", label: "Getting started", icon: "icon-rocket-line", docs: [
    { id: "welcome", title: "Welcome to Đìzai", summary: "Who we are, how the studio is organised and the people to meet in your first week.", owner: "minhAnh", updated: daysFromToday(-12), points: ["Đìzai has 48 people in Ho Chi Minh City, Hanoi and Singapore, in five teams.", "Your first week: a studio tour on Monday, lunch with your team on Wednesday and a project to shadow on Friday.", "Your buddy comes from another team; Minh Anh pairs you before your first day."] },
    { id: "accounts", title: "Tools and accounts", summary: "Figma, Zen and the client tools you get on day one, and who to ask for access.", owner: "finn", updated: daysFromToday(-3), points: ["Google Workspace, Figma, Zen and Slack are ready on your first morning.", "Client tools (their Jira, Confluence or Figma) come from the account director on the project.", "Lost access or a new laptop? Ask in #it-help; someone answers within the hour."] },
  ] },
  { id: "work", label: "How we work", icon: "icon-layers-three-01-line", docs: [
    { id: "design-reviews", title: "Design reviews", summary: "When to ask for a review, how to prepare the file and how feedback is given.", owner: "alex", updated: daysFromToday(-1), points: ["Ask for a review when a flow works end to end, not when every screen is polished.", "Share the Figma link with the question you want answered and the decision it unblocks.", "Reviewers reply within one working day, in comments on the file: kind, specific and with a reason."] },
    { id: "code-reviews", title: "Code reviews", summary: "Pull request size, who reviews what, and how fast a review should come back.", owner: "finn", updated: daysFromToday(-9), points: ["Keep pull requests under 400 lines, and split a refactor from the feature that needs it.", "The project’s tech lead reviews; a second engineer joins for anything that touches payments or sign-in.", "A first review comes back within four working hours."] },
    { id: "client-meetings", title: "Client meetings", summary: "Agendas, notes and the follow-up email every client gets within a day.", owner: "hana", updated: daysFromToday(-21), points: ["Send the agenda a day before, with the decisions you need from the client.", "One person takes the notes in Zen while the meeting runs.", "The follow-up email with decisions and next steps goes out within a day."] },
  ] },
  { id: "people-ops", label: "People", icon: "icon-users-line", docs: [
    { id: "time-off", title: "Time off", summary: "Annual leave, sick days and how to ask for time off in Zen.", owner: "minhAnh", updated: daysFromToday(-2), points: ["Everyone gets 18 days of annual leave a year, plus the public holidays where they live.", "Ask in Zen under Time off at least two weeks ahead for more than three days in a row.", "Sick days need no approval: tell your lead, then log them when you are back."] },
    { id: "holidays", title: "Public holidays in Vietnam and Singapore", summary: "The 2026 holiday calendar for the Ho Chi Minh City, Hanoi and Singapore teams.", owner: "minhAnh", updated: daysFromToday(-30), points: ["Vietnam: Tết (five days around Feb 17), Hùng Kings’ Day, Apr 30 – May 1 and Sep 1 – 2.", "Singapore: Chinese New Year (Feb 17 – 18), Good Friday (Apr 3), National Day (Aug 9) and Christmas Day.", "Working with a client in another country? Check their holidays before you book a review."] },
  ] },
  { id: "money", label: "Expenses", icon: "icon-receipt-line", docs: [
    { id: "claims", title: "Claiming expenses", summary: "What the studio pays for, receipts, and when the money reaches your account.", owner: "mai", updated: daysFromToday(-6), points: ["The studio pays for client travel, books and courses (up to $500 a year) and one home office set-up.", "Add the receipt in Zen under Expenses within 30 days.", "Approved claims are paid with your next salary, on the 25th."] },
  ] },
];
const allDocs = handbook.flatMap((chapter) => chapter.docs.map((doc) => ({ ...doc, chapter: chapter.label, chapterId: chapter.id, icon: chapter.icon })));
const teams: { id: string; label: string; team: Team; icon: IconName }[] = [
  { id: "team-design", label: "Design", team: "Design", icon: "icon-palette-line" },
  { id: "team-engineering", label: "Engineering", team: "Engineering", icon: "icon-code-02-line" },
  { id: "team-delivery", label: "Delivery", team: "Delivery", icon: "icon-target-04-line" },
];

function HandbookNavigationExample() {
  const { toast } = useToast();
  // Opens on a handbook page: its chapter open in the Sidebar, its trail in the header.
  const [page, setPage] = useState("design-reviews");
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [changes, setChanges] = useState(true);

  const open = (id: string) => { setPage(id); setQuery(""); };
  const docRow = (doc: (typeof allDocs)[number]): Row => ({ id: doc.id, title: doc.title, caption: `${doc.chapter} · Updated ${formatDate(doc.updated)} by ${people[doc.owner].name}`, leading: itemIcon(doc.icon), onClick: () => open(doc.id) });
  const q = query.trim().toLowerCase();
  const doc = allDocs.find((d) => d.id === page);
  const chapter = handbook.find((c) => c.id === page);
  const team = teams.find((t) => t.id === page);
  let view: View;
  if (q) {
    const found = allDocs.filter((d) => `${d.title} ${d.summary}`.toLowerCase().includes(q));
    view = {
      title: "Search results",
      description: found.length ? `${plural(found.length, "page")} for “${query.trim()}”` : `No handbook page mentions “${query.trim()}”`,
      body: found.length ? <RowCard label="Search results" rows={found.map(docRow)} canvas="flat" /> : (
        <EmptyState headingLevel={2} title="No pages match" icon="icon-search-medium-line" secondaryAction={{ label: "Show recent pages", onClick: () => setQuery("") }}>
          Try another word, like “leave” or “review”.
        </EmptyState>
      ),
    };
  } else if (doc) {
    const siblings = allDocs.filter((d) => d.chapterId === doc.chapterId && d.id !== doc.id);
    view = {
      // The trail names the chapter, so the page needs no eyebrow; the chapter crumb opens the chapter’s own page.
      crumbs: [{ id: doc.chapterId, label: doc.chapter, go: () => open(doc.chapterId) }, { id: doc.id, label: doc.title }],
      title: doc.title,
      description: doc.summary,
      actions: <Button level="tertiary" startIcon="icon-link-01-line" onClick={() => toast({ title: "Link copied", children: `${studio.domain}/handbook/${doc.id}` })}>Copy link</Button>,
      // The page reads in the wide column; who owns it and what else the chapter holds sit beside it.
      body: (
        <Grid columns="minmax(0, 2fr) minmax(0, 1fr)" stackBelow={720} gap="md" align="start">
          <Card {...cardLook.flat}>
            <Stack gap="md">
              <Heading level={2} textStyle="Heading/Subheading">In short</Heading>
              <Stack as="ol" gap="sm">
                {doc.points.map((point) => <Text key={point} as="li">{point}</Text>)}
              </Stack>
            </Stack>
          </Card>
          <Stack gap="md">
            {detailsCard([{ term: "Owner", description: people[doc.owner].name }, { term: "Updated", description: formatDate(doc.updated) }, { term: "Applies to", description: "Everyone" }], "flat")}
            {siblings.length ? <RowCard heading label={`More in ${doc.chapter}`} rows={siblings.map(docRow)} canvas="flat" /> : null}
          </Stack>
        </Grid>
      ),
    };
  } else if (chapter) {
    view = { title: chapter.label, description: plural(chapter.docs.length, "page"), body: <RowCard label={chapter.label} rows={allDocs.filter((d) => d.chapterId === chapter.id).map(docRow)} canvas="flat" /> };
  } else if (team) {
    const members = peopleList.filter((p) => p.team === team.team);
    view = { title: `${team.label} team`, description: plural(members.length, "person", "people"), body: <RowCard label={`${team.label} team`} rows={members.map(personRow)} canvas="flat" /> };
  } else {
    view = { title: "Recently updated", description: "Handbook pages changed in the last month", body: <RowCard label="Recently updated" rows={[...allDocs].sort((a, b) => +b.updated - +a.updated).map(docRow)} canvas="flat" /> };
  }

  return (
    <AppFrame>
      {/* Canvas/Flat → Sidebar background="flat": navigation and page read as one plane. */}
      <AppShell canvas="flat" sidebarCollapsed={collapsed} onSidebarCollapsedChange={setCollapsed}
        sidebar={(
          <Sidebar
            variant="small-density"
            background="flat"
            logo={handbookLogo}
            logoCollapsed={handbookMark}
            search={<Search size="small" placeholder="Search handbook" aria-label="Search handbook" value={query} onValueChange={setQuery} />}
            selectedId={q ? undefined : page}
            // A chapter opens in place; on the collapsed rail it expands the Sidebar first so its pages show.
            onItemClick={(item) => { if (!handbook.some((c) => c.id === item.id)) open(item.id); else if (collapsed) setCollapsed(false); }}
          >
            {/* Figma Body-Content as children: Menu-Items and titled groups, the same rows as a sections array. */}
            <SidebarMenuItem id="recent" label="Recently updated" icon="icon-clock-line" />
            {/* Chapters open in place (one level deep); the chapter holding the open page opens by itself. */}
            <SidebarMenuSection label="Handbook">
              {handbook.map((c) => (
                <SidebarMenuItem key={c.id} id={c.id} label={c.label} icon={c.icon}>
                  {c.docs.map((d) => <SidebarMenuItem key={d.id} id={d.id} label={d.title} />)}
                </SidebarMenuItem>
              ))}
            </SidebarMenuSection>
            <SidebarMenuSection label="Teams">
              {teams.map((t) => <SidebarMenuItem key={t.id} id={t.id} label={t.label} icon={t.icon} />)}
            </SidebarMenuSection>
          </Sidebar>
        )}
        header={(
          <AppShellHeader
            leading={view.crumbs ? <Breadcrumbs master={false} items={view.crumbs} onNavigate={follow(view.crumbs)} /> : undefined}
            actions={<>
              <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" dot={changes}
                onClick={() => { setChanges(false); toast({ title: "2 pages changed this week", children: "Design reviews and Time off" }); }} />
              <AccountMenu />
            </>}
            main={pageHeader(view)}
          />
        )}
      >
        {view.body}
      </AppShell>
    </AppFrame>
  );
}

// ——— 5. Links for routing ———————————————————————————————————————————————————————————————————————————
/** Navigation for the demo’s routes; in an app this is your router (React Router, Next.js…). */
const NavigateContext = createContext<(path: string) => void>(() => undefined);
/** A plain click navigates in place; Cmd/Ctrl/Shift-click and a middle click stay with the browser. */
const plainClick = (event: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }) => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/** The app’s router link, passed as `linkAs`: a plain click navigates in place, while Cmd/Ctrl-click, a middle click
 *  or Copy link address keep working, because every row is a real link. */
function RouterLink({ href = "", onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const navigate = useContext(NavigateContext);
  return (
    <a href={href} {...rest} onClick={(event) => {
      onClick?.(event);
      if (event.defaultPrevented || !plainClick(event)) return;
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
  const { toast } = useToast();
  const [path, setPath] = useState("/projects/lumen-banking");
  // The first part of the route picks the Sidebar item, so a project’s own page keeps Projects selected.
  const [, section, id, taskId] = path.split("/");
  const project = section === "projects" ? projects.find((p) => p.id === id) : undefined;
  const task = project ? tasks.find((t) => t.id === taskId) : undefined;
  const toProject = (p: Project): Row => ({ ...projectRow(p), onClick: () => setPath(`/projects/${p.id}`) });
  const download = (f: StudioFile) => toast({ title: "Download started", children: f.name });
  // The trail’s crumbs are links to their routes too.
  const projectsCrumb: Crumb = { id: "projects", label: "Projects", href: "/projects" };
  let view: View;
  if (project && task) {
    view = taskView(task, [projectsCrumb, { id: project.id, label: project.name, href: `/projects/${project.id}` }], project, "default");
  } else if (project) {
    view = {
      crumbs: [projectsCrumb, { id: project.id, label: project.name }],
      title: project.name,
      meta: projectBadge(project),
      description: `${project.client} · Led by ${people[project.lead].name} · Due ${formatDate(project.due)}`,
      body: projectBody(project, "default", [], (open) => setPath(`/projects/${project.id}/${open.id}`), download, (
        <EmptyState headingLevel={2} title="Nothing here yet" icon="icon-folder-line" secondaryAction={{ label: "Show all projects", onClick: () => setPath("/projects") }}>
          Tasks and files for {project.name} show up here.
        </EmptyState>
      )),
    };
  } else if (section === "projects") {
    view = { title: "Projects", description: plural(projects.length, "project"), body: <RowCard label="Projects" rows={projects.map(toProject)} canvas="default" /> };
  } else if (section === "inbox") {
    view = { title: "Inbox", description: plural(3, "unread message"), body: <RowCard label="Inbox" rows={activity.map((a) => activityRow(a, Boolean(a.unread)))} canvas="default" /> };
  } else if (section === "invoices") {
    view = { title: "Invoices", description: "Sent, paid and overdue this quarter", body: <RowCard label="Invoices" rows={invoices.map(invoiceRow)} canvas="default" /> };
  } else {
    view = {
      title: "Home",
      description: "Your projects at a glance",
      body: (
        <Pair>
          <RowCard heading label="Active projects" rows={projects.filter((p) => p.status === "Active").map(toProject)} canvas="default" seeAll={() => setPath("/projects")} />
          <RowCard heading label="Recent activity" rows={activity.slice(0, 4).map((a) => activityRow(a, Boolean(a.unread)))} canvas="default" seeAll={() => setPath("/inbox")} />
        </Pair>
      ),
    };
  }
  return (
    <NavigateContext.Provider value={setPath}>
      <AppFrame>
        <AppShell
          sidebar={<Sidebar logo={studioLogo} logoCollapsed={studioMark} sections={routeSections} linkAs={RouterLink} selectedId={section} />}
          header={(
            <AppShellHeader
              leading={view.crumbs ? (
                <Breadcrumbs master={false} items={view.crumbs}
                  onNavigate={(item, event) => { if (!item.href || !plainClick(event)) return; event.preventDefault(); setPath(item.href); }} />
              ) : undefined}
              actions={<>
                <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={3} onClick={() => setPath("/inbox")} />
                <AccountMenu />
              </>}
              main={pageHeader(view)}
            />
          )}
        >
          {view.body}
        </AppShell>
      </AppFrame>
    </NavigateContext.Provider>
  );
}

// ——— 6. Disabled and empty items ————————————————————————————————————————————————————————————————————
/** A member on the Starter plan: destinations the plan doesn’t include stay in the Sidebar, disabled, so people learn
 *  they exist; an empty Inbox shows no counter. Upgrading turns them on. */
function SidebarStates() {
  const { toast } = useToast();
  const [page, setPage] = useState("home");
  const [business, setBusiness] = useState(false);
  const sections: SidebarSection[] = [
    { items: [
      { id: "home", label: "Home", icon: "icon-home-03-line" },
      // Nothing waits in the Inbox, so it has no counter and no dot.
      { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line" },
      { id: "projects", label: "Projects", icon: "icon-folder-line" },
    ] },
    { label: "Business plan", items: [
      { id: "invoices", label: "Invoices", icon: "icon-receipt-line", disabled: !business },
      { id: "reports", label: "Reports", icon: "icon-bar-chart-01-line", disabled: !business },
    ] },
  ];
  const upgrade = () => { setBusiness(true); toast({ type: "positive", title: "Switched to Business", children: "Invoices and Reports are on in the Sidebar." }); };
  const toProject = (p: Project): Row => ({ ...projectRow(p), onClick: () => toast({ title: p.name, children: `${p.client} · ${p.progress}% done` }) });
  let view: View;
  if (page === "inbox") {
    view = {
      title: "Inbox",
      description: "Mentions, approvals and comments",
      body: (
        <EmptyState headingLevel={2} icon="ic-inbox-01-line" title="You're all caught up"
          secondaryAction={{ label: "Open projects", onClick: () => setPage("projects") }}>New mentions and approvals show up here.</EmptyState>
      ),
    };
  } else if (page === "projects") {
    view = { title: "Projects", description: plural(openProjects.length, "open project"), body: <RowCard label="Projects" rows={openProjects.map(toProject)} canvas="default" /> };
  } else if (page === "invoices") {
    view = { title: "Invoices", description: "Sent, paid and overdue this quarter", body: <RowCard label="Invoices" rows={invoices.map(invoiceRow)} canvas="default" /> };
  } else if (page === "reports") {
    view = { title: "Reports", description: "Progress and budget by project", body: <RowCard label="Reports" rows={openProjects.map(reportRow)} canvas="default" /> };
  } else {
    view = {
      title: "Home",
      description: "Due this week across your projects",
      body: (
        <Stack gap="lg">
          {business ? null : (
            <InlineMessage theme="neutral" title="Invoices and Reports are on the Business plan" action={{ label: "Switch to Business", onClick: upgrade }}>
              They stay in the Sidebar, disabled, until the workspace switches plans.
            </InlineMessage>
          )}
          <Pair>
            <RowCard heading label="Due this week" rows={dueThisWeek.map((t) => ({ ...taskRow(t, () => setPage("projects")) }))} canvas="default" />
            <RowCard heading label="Projects" rows={openProjects.slice(0, 4).map(toProject)} canvas="default" seeAll={() => setPage("projects")} />
          </Pair>
        </Stack>
      ),
    };
  }
  return (
    <AppFrame>
      <AppShell
        sidebar={<Sidebar logo={studioLogo} logoCollapsed={studioMark} sections={sections} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
        header={(
          <AppShellHeader
            // The plan Badge leads the row’s utilities; the account menu ends it.
            actions={<>
              <Badge theme={business ? "accent" : "neutral"} background="subtle">{business ? "Business plan" : "Starter plan"}</Badge>
              <AccountMenu />
            </>}
            main={pageHeader(view)}
          />
        )}
      >
        {view.body}
      </AppShell>
    </AppFrame>
  );
}

// ——— 7. On a phone ———————————————————————————————————————————————————————————————————————————————————
/** A phone section: rows in a Default box on the grey Canvas, titled (Heading/Subheading and See all) or named by `label`. */
function PhoneList({ label, rows, titled = false, seeAll }: { label: string; rows: Row[]; titled?: boolean; seeAll?: () => void }) {
  const headingId = useId();
  return (
    <ListBox as="section" aria-label={titled ? undefined : label} aria-labelledby={titled ? headingId : undefined} header={titled ? (
      <Stack direction="row" justify="between" align="center" gap="xs">
        <Heading level={2} id={headingId} textStyle="Heading/Subheading">{label}</Heading>
        {seeAll ? <Text as="span" textStyle="Body/Small/Bold"><Link as="button" tone="inherit" onClick={seeAll}>See all</Link></Text> : null}
      </Stack>
    ) : undefined}>
      <List aria-label={titled ? undefined : label} aria-labelledby={titled ? headingId : undefined}>
        {rows.map(({ id, ...row }) => <ListItem key={id} as="li" titleLines={2} {...row} />)}
      </List>
    </ListBox>
  );
}

/** On a phone the Sidebar is the AppShell drawer: the Top Navigation’s menu button slides it in; a pick closes it. */
function SidebarOnPhone() {
  const { toast } = useToast();
  const screenRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState("home");
  const [navOpen, setNavOpen] = useState(false);
  const [unread, setUnread] = useState(true);
  const go = (id: string) => { setPage(id); screenRef.current?.scrollTo({ top: 0 }); };
  const sections: SidebarSection[] = [
    { items: [
      { id: "home", label: "Home", icon: "icon-home-03-line" },
      { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line", counter: unread ? 3 : undefined },
      { id: "my-tasks", label: "My tasks", icon: "icon-check-square-line", counter: myTaskIds.length },
    ] },
    { label: "Projects", items: openProjects.map((p) => ({ id: p.id, label: p.name, icon: p.icon })) },
  ];
  const project = openProjects.find((p) => p.id === page);
  const taskList = (label: string, list: Task[], titled = false) => <PhoneList label={label} titled={titled} rows={list.map((t) => ({
    id: t.id, title: t.title, caption: `${projectById(t.project).name} · ${taskWhen(t)}`, leading: personAvatar(people[t.assignee]),
    onClick: () => toast({ title: t.key, children: `${t.title} · ${people[t.assignee].name}` }),
  }))} />;
  const messages = (list: Activity[], titled = false, seeAll?: () => void) => <PhoneList label={titled ? "Recent activity" : "Messages"} titled={titled} seeAll={seeAll} rows={list.map((a) => ({
    id: a.id, title: people[a.actor].name, caption: `${a.verb[0].toUpperCase()}${a.verb.slice(1)} ${a.object}`, leading: personAvatar(people[a.actor]),
    onClick: () => toast({ title: people[a.actor].name, children: `${a.verb[0].toUpperCase()}${a.verb.slice(1)} ${a.object}` }),
  }))} />;
  let title: string;
  let content: ReactNode;
  if (project) {
    title = project.name;
    content = <>
      <Text tone="light">{`${project.client} · ${project.progress}% done · Due ${formatDate(project.due)}`}</Text>
      {tasksOf(project.id).length ? taskList(`${project.name} tasks`, tasksOf(project.id)) : (
        <EmptyState headingLevel={2} size="sm" icon="icon-check-square-line" title="No tasks yet">Tasks added to {project.name} show up here.</EmptyState>
      )}
    </>;
  } else if (page === "inbox") {
    title = "Inbox";
    content = <>
      <Text tone="light">{unread ? plural(3, "unread message") : "You’re all caught up."}</Text>
      {messages(activity)}
    </>;
  } else if (page === "my-tasks") {
    title = "My tasks";
    content = <><Text tone="light">Assigned to you or waiting for your review</Text>{taskList("My tasks", tasks.filter((t) => myTaskIds.includes(t.id)))}</>;
  } else if (page === "settings") {
    title = "Settings";
    content = <Card theme="default"><DescriptionList items={[{ term: "Workspace", description: studio.name }, { term: "Plan", description: `${studioPlan.name} · ${plural(studioSeats, "seat")}` }, { term: "Signed in as", description: me.email }]} /></Card>;
  } else if (page === "help") {
    title = "Help";
    content = <PhoneList label="Help articles" rows={helpRows.map((row) => ({ ...row, onClick: () => toast({ title: row.title, children: row.caption }) }))} />;
  } else {
    title = "Home";
    content = <>
      <Text tone="light">{`Good morning, ${firstName(me)}. ${plural(dueThisWeek.length, "task")} across your projects are due this week.`}</Text>
      {taskList("Due this week", dueThisWeek, true)}
      {messages(activity.slice(0, 3), true, () => go("inbox"))}
    </>;
  }
  return (
    <PlatformPhone label="Zen app" screenRef={screenRef}>
      <AppShell navOpen={navOpen} onNavOpenChange={setNavOpen}
        sidebar={(
          <Sidebar logo={studioLogo} sections={sections} selectedId={page} onItemClick={(item) => go(item.id)}
            footer={<>
              <SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />
              <SidebarMenuItem id="help" label="Help" icon="icon-help-circle-line" />
            </>} />
        )}
        // Too many destinations for a bottom bar (every project, Settings, Help): the menu button opens the drawer.
        topNavigation={(
          <TopNavigation title={title} largeTitle={title} scrollRef={screenRef}
            leading={{ icon: "icon-menu-01-line", label: "Open navigation", onClick: () => setNavOpen(true) }}
            trailing={[{ icon: "icon-bell-01-line", label: unread ? "Notifications, 3 new" : "Notifications", dot: unread, onClick: () => { setUnread(false); go("inbox"); } }]} />
        )}
      >
        {content}
      </AppShell>
    </PlatformPhone>
  );
}

/* Recipe (user 2026-10-24: "a docs recipe now; parts later"): the HR-Platform Sidebar's account header and a module's
   Back + title, from the Sidebar's own slots. The brand is the workspace's square logo with its name over its email and a
   chevron-selector Menu at the end that switches workspace; inside a module the Sidebar shows a SidebarSubHeader (Back over
   the module's name), and its rail keeps the logo and the Back chevron. */
const accountModules: Record<string, { title: string; sections: SidebarSection[] }> = {
  projects: { title: "Projects", sections: [{ items: [nav("all", "All projects", "icon-folder-line"), nav("mine", "Assigned to me", "icon-user-check-line"), nav("archived", "Archived", "icon-archive-line")] }] },
};
function AccountHeaderExample() {
  const { toast } = useToast();
  const [active, setActive] = useState("ws-dizai");
  const [module, setModule] = useState<string | null>("projects");
  const [page, setPage] = useState("all");
  const workspace = baseWorkspaces.find((w) => w.id === active) ?? baseWorkspaces[0];
  const home: SidebarSection[] = [{ items: [nav("home", "Home", "icon-home-03-line"), nav("projects", "Projects", "icon-folder-line"), nav("people", "People", "icon-users-line")] }];
  const current = module ? accountModules[module] : null;
  const brand = (
    <Stack direction="row" gap="xs" align="center" width="fill">
      {workspace.mark}
      <Stack gap="none" width="fill" minWidth={0}>
        <Text as="span" textStyle="Body/Base/Bold" truncate>{workspace.label}</Text>
        <Text as="span" textStyle="Caption/Regular" tone="light" truncate>{`${workspace.role} · ${plural(workspace.members, "member")}`}</Text>
      </Stack>
      <Menu align="end" aria-label="Switch workspace" trigger={<IconButton appearance="flat" level="primary" size="sm" aria-label="Switch workspace" icon="icon-chevron-selector-vertical-line" />}
        items={baseWorkspaces.map((w) => ({ id: w.id, label: w.label, icon: cloneElement(w.mark as ReactElement<{ size?: string }>, { size: "2xsmall" }), caption: w.id === active ? "Current workspace" : w.role, onSelect: () => { setActive(w.id); setModule(null); toast({ title: `Switched to ${w.label}` }); } }))} />
    </Stack>
  );
  const label = (current?.sections ?? home).flatMap((section) => section.items).find((item) => item.id === (current ? page : "home"))?.label ?? "Home";
  return (
    <AppShell
      sidebar={(
        <Sidebar aria-label={current ? `${current.title} navigation` : "Workspace navigation"} brand={brand} logoCollapsed={workspace.mark}
          subHeader={current ? <SidebarSubHeader title={current.title} backLabel="Back to Home" onBack={() => setModule(null)} /> : undefined}
          sections={current ? current.sections : home} selectedId={current ? page : "home"}
          onItemClick={(item) => (current ? setPage(item.id) : accountModules[item.id] ? (setModule(item.id), setPage("all")) : toast({ title: item.label, children: "Not part of this demo." }))} />
      )}
      header={<AppShellHeader main={<PageHeader title={label} description={workspace.label} />} />}
    >
      <EmptyState size="sm" headingLevel={2} icon="icon-folder-line" title={`${label} in ${workspace.label}`}>Switch the workspace from the header's menu; open Projects to see the module's Back + title.</EmptyState>
    </AppShell>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Studio navigation",
    description: "The app’s main Sidebar in an AppShell: counters for things to act on, a dot for something new, New project on the Projects title, and Settings and Help in the footer. The collapse toggle starts the header’s top row and the shell keeps the rail state; a task opened from a list keeps that destination selected and puts its trail beside the toggle. Below 1024px the shell opens the Sidebar as a drawer.",
    wide: true,
    screen: true,
    render: () => <StudioNavigationExample />,
    code: `const [page, setPage] = useState("home");
const [collapsed, setCollapsed] = useState(false); // remember it per person

<AppShell
  sidebarCollapsed={collapsed}
  onSidebarCollapsedChange={setCollapsed} // the toggle starts the header's top row
  sidebar={
    <Sidebar
      // The logo slot is 24px tall: an image that fills it, never a component that grows with density.
      logo={<span className="brand"><img src={logo} alt="" /><Text as="span" textStyle="Body/Base/Bold">Đìzai Studio</Text></span>}
      logoCollapsed={<Avatar size="xsmall" shape="square" theme="photo" src={logo} alt="Đìzai Studio" />}
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
      // Footer-Content takes the same Menu-Items: selectedId and onItemClick cover them too.
      footer={<>
        <SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />
        <SidebarMenuItem id="help" label="Help" icon="icon-help-circle-line" />
      </>}
    />
  }
  header={
    <AppShellHeader
      // A task's trail starts at a Sub level beside the toggle; a Sidebar destination has none.
      leading={task && <Breadcrumbs master={false} items={[{ id: "back", label: "My tasks" }, { id: task.id, label: task.key }]} onNavigate={backToList} />}
      center={<Search placeholder="Search projects and tasks" aria-label="Search Đìzai Studio" value={query} onValueChange={setQuery} />}
      actions={<Menu align="end" trigger={<AppShellAccount name="Alex Duong" src={photo} />} items={accountItems} />}
      main={<PageHeader title="Inbox" description="3 unread messages" actions={<Button level="tertiary" onClick={markRead}>Mark all read</Button>} />}
    />
  }
>
  <StudioPage id={page} />
</AppShell>`,
  },
  {
    title: "Projects flyout",
    description: "A collapsed rail keeps the page wide; Projects opens a flyout with search and Pinned / All projects sections instead of a long inline list. Escape or a press outside closes it (onSubMenuClose); after Escape or a pick, focus returns to Projects. The rail shows each name as a tooltip, and the trail in the header leads back to Projects. In the drawer (below 1024px) the whole navigation shows, so Projects opens the projects page there.",
    wide: true,
    screen: true,
    render: () => <ProjectsFlyoutExample />,
    code: `const [collapsed, setCollapsed] = useState(true);
const [flyout, setFlyout] = useState(false);
const [query, setQuery] = useState("");
const { layout } = useAppShell(); // inside the shell: "desktop" draws the rail, "drawer" the whole Sidebar
const open = (id) => { setPage(id); setFlyout(false); setQuery(""); };

// Canvas/Alt page → the Sidebar on the canvas: Surface/Default, no shadow, a divider
<AppShell canvas="alt" sidebarCollapsed={collapsed} onSidebarCollapsedChange={setCollapsed}
  sidebar={
    <Sidebar
      shadow={false}
      divider
      sections={[{ items: [
        { id: "home", label: "Home", icon: "icon-home-03-line", selected: page === "home" },
        { id: "projects", label: "Projects", icon: "icon-folder-line", selected: isProjectPage },
        …
      ] }]}
      onItemClick={(item) => item.id !== "projects" ? open(item.id) : layout === "desktop" ? setFlyout(!flyout) : open("projects")}
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
        />
      )}
    />
  }
  header={
    <AppShellHeader
      leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: project.id, label: project.name }]} onNavigate={navigate} />}
      actions={<><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" dot onClick={openMentions} /><AccountMenu /></>}
      main={<PageHeader title={project.name} meta={<Badge theme="blue" background="subtle">Active</Badge>} description="Lumen Bank · Due Nov 21, 2026" />}
    />
  }
>
  <ProjectPage id={page} />
</AppShell>`,
  },
  {
    title: "Switch workspace",
    description: "For people in more than one workspace: the rail lists them with the active one ringed, the header name switches too, and each workspace brings its own sections and keeps the page left open in it. The header’s trail starts at the workspace and a Badge says Alex’s role there; on a Canvas/Alt page the Sidebar sits on the canvas (Surface/Default, no shadow) with a divider. The workspace Sidebar has no rail, so the top row has no collapse toggle.",
    wide: true,
    screen: true,
    render: () => <SwitchWorkspaceExample />,
    code: `<AppShell canvas="alt"
  sidebar={
    <Sidebar
      variant="workspace"
      divider
      workspaceItems={workspaces.map((w) => ({ id: w.id, label: w.name, icon: w.mark, selected: w.id === active }))}
      workspaceAction={<IconButton appearance="main" level="tertiary" size="md" aria-label="Add workspace" icon="icon-plus-line" onClick={openNewWorkspace} />}
      headerAction={<IconButton appearance="flat" level="primary" size="sm" aria-label="Workspace settings" icon="icon-settings-01-line" onClick={() => setPage("settings")} />}
      sections={current.sections}
      selectedId={page}
      onItemClick={(item) => isWorkspace(item.id) ? setActive(item.id) : setPage(item.id)}
    />
  }
  header={
    <AppShellHeader
      leading={<Breadcrumbs master={false} items={[{ id: "workspace", label: "Phin & Co" }, { id: "tasks", label: "Tasks" }]} onNavigate={navigate} />}
      actions={<><Badge theme="yellow" background="subtle">Guest</Badge><AccountMenu /></>}
      main={<PageHeader title="Tasks" description="Phin & Co · 9 members" />}
    />
  }
>
  <WorkspacePage workspace={current} page={page} />
</AppShell>`,
  },
  {
    title: "Account header and module title",
    description: "A recipe for an app whose Sidebar names the workspace and opens modules (HR-Platform). The brand is the workspace's square logo, its name over a short line, and a chevron-selector menu that switches workspace. Inside a module, a SidebarSubHeader puts Back over the module's name; the collapsed rail keeps the logo and the Back chevron.",
    wide: true,
    screen: true,
    render: () => <AccountHeaderExample />,
    code: `<Sidebar
  brand={
    <Stack direction="row" gap="xs" align="center" width="fill">
      <Avatar size="medium" shape="square" theme="photo" src={workspace.logo} alt="" />
      <Stack gap="none" width="fill" minWidth={0}>
        <Text as="span" textStyle="Body/Base/Bold" truncate>{workspace.name}</Text>
        <Text as="span" textStyle="Caption/Regular" tone="light" truncate>Admin · 24 members</Text>
      </Stack>
      <Menu align="end" aria-label="Switch workspace"
        trigger={<IconButton appearance="flat" level="primary" size="sm" aria-label="Switch workspace" icon="icon-chevron-selector-vertical-line" />}
        items={workspaces.map((w) => ({ id: w.id, label: w.name, icon: <Avatar size="2xsmall" shape="square" src={w.logo} alt="" />, onSelect: () => switchTo(w.id) }))} />
    </Stack>
  }
  logoCollapsed={<Avatar size="medium" shape="square" theme="photo" src={workspace.logo} alt={workspace.name} />}
  subHeader={module ? <SidebarSubHeader title="Projects" backLabel="Back to Home" onBack={() => setModule(null)} /> : undefined}
  sections={module ? projectSections : homeSections}
  selectedId={page}
  onItemClick={(item) => open(item.id)}
/>`,
  },
  {
    title: "Handbook with chapters",
    description: "A knowledge base with many pages uses Small-Density: search in the Sidebar, chapters that open in place one level deep, and a Flat background on a Canvas/Flat page so navigation and page read as one plane. A long page title ellipsizes in the Sidebar and reads in full on its page, under a trail whose chapter crumb lists the chapter’s pages.",
    wide: true,
    screen: true,
    render: () => <HandbookNavigationExample />,
    code: `<AppShell canvas="flat" sidebarCollapsed={collapsed} onSidebarCollapsedChange={setCollapsed}
  sidebar={
    <Sidebar
      variant="small-density"
      background="flat"
      search={<Search size="small" placeholder="Search handbook" aria-label="Search handbook" value={query} onValueChange={setQuery} />}
      selectedId={page} // opens the chapter that holds the page
      onItemClick={(item) => { if (!isChapter(item.id)) setPage(item.id); }}
    >
      {/* Body-Content as children (or the same rows as a sections array) */}
      <SidebarMenuItem id="recent" label="Recently updated" icon="icon-clock-line" />
      <SidebarMenuSection label="Handbook">
        {chapters.map((c) => (
          <SidebarMenuItem key={c.id} id={c.id} label={c.label} icon={c.icon}>
            {c.docs.map((doc) => <SidebarMenuItem key={doc.id} id={doc.id} label={doc.title} />)}
          </SidebarMenuItem>
        ))}
      </SidebarMenuSection>
      <SidebarMenuSection label="Teams">
        {teams.map((t) => <SidebarMenuItem key={t.id} id={t.id} label={t.label} icon={t.icon} />)}
      </SidebarMenuSection>
    </Sidebar>
  }
  header={
    <AppShellHeader
      leading={<Breadcrumbs master={false} items={[{ id: "work", label: "How we work" }, { id: "design-reviews", label: "Design reviews" }]} onNavigate={navigate} />}
      actions={<><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" dot onClick={showChanges} /><AccountMenu /></>}
      main={<PageHeader title="Design reviews" description="When to ask for a review…" actions={<Button level="tertiary" startIcon="icon-link-01-line" onClick={copyLink}>Copy link</Button>} />}
    />
  }
>
  {query ? <SearchResults query={query} /> : <HandbookPage id={page} />}
</AppShell>`,
  },
  {
    title: "Links for routing",
    description: "Destinations are real links: each item has an href and linkAs is the app's router link, so a click navigates in place while Cmd-click and Copy link address work as on any link. The header’s trail is links to the same routes, and selectedId comes from the route, so a project’s own page keeps Projects selected.",
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

<AppShell
  sidebar={
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
  }
  header={
    <AppShellHeader
      leading={
        <Breadcrumbs master={false}
          items={[{ id: "projects", label: "Projects", href: "/projects" }, { id: "lumen-banking", label: "Online banking redesign" }]}
          onNavigate={(item, event) => { if (event.metaKey || event.ctrlKey) return; event.preventDefault(); navigate(item.href); }} />
      }
      actions={<><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={3} onClick={() => navigate("/inbox")} /><AccountMenu /></>}
      main={<PageHeader title="Online banking redesign" />}
    />
  }
>
  <Routes />
</AppShell>`,
  },
  {
    title: "Disabled and empty items",
    description: "On the Starter plan, Invoices and Reports stay in the Sidebar but disabled: people see what the Business plan adds, the items skip clicks and keep their place, and Switch to Business turns them on, with the plan Badge in the header changing too. An empty Inbox shows no counter or dot, and its page says it is empty instead of showing a blank list.",
    wide: true,
    screen: true,
    render: () => <SidebarStates />,
    code: `const sections: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line" }, // nothing waiting: no counter
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
  ] },
  { label: "Business plan", items: [
    { id: "invoices", label: "Invoices", icon: "icon-receipt-line", disabled: !business },
    { id: "reports", label: "Reports", icon: "icon-bar-chart-01-line", disabled: !business },
  ] },
];

<AppShell
  sidebar={<Sidebar logo={logo} sections={sections} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
  header={
    <AppShellHeader
      actions={<><Badge theme="neutral" background="subtle">Starter plan</Badge><AccountMenu /></>}
      main={<PageHeader title="Home" description="Due this week across your projects" />}
    />
  }
>
  {!business && (
    <InlineMessage theme="neutral" title="Invoices and Reports are on the Business plan"
      action={{ label: "Switch to Business", onClick: upgrade }}>
      They stay in the Sidebar, disabled, until the workspace switches plans.
    </InlineMessage>
  )}
  {/* … */}
</AppShell>`,
  },
  {
    title: "On a phone",
    description: "On a phone the AppShell draws its mobile parts and the same Sidebar becomes its drawer: the Top Navigation’s menu button slides it in over a scrim, with focus on the current page; a pick, Escape or the scrim closes it and the page below changes. The drawer suits an app with more destinations than a bottom bar holds, such as every project plus Settings and Help.",
    render: () => <SidebarOnPhone />,
    code: `const [navOpen, setNavOpen] = useState(false);

<AppShell
  navOpen={navOpen}
  onNavOpenChange={setNavOpen}
  sidebar={<Sidebar logo={logo} sections={sections} footer={footer} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
  topNavigation={
    <TopNavigation title={current.title} largeTitle={current.title}
      leading={{ icon: "icon-menu-01-line", label: "Open navigation", onClick: () => setNavOpen(true) }}
      trailing={[{ icon: "icon-bell-01-line", label: "Notifications", dot: unread, onClick: openInbox }]} />
  }
>
  <Text tone="light">{current.caption}</Text>
  <ListBox as="section" aria-label={current.title}>
    <List aria-label={current.title}>{/* rows */}</List>
  </ListBox>
</AppShell>`,
  },
]);
