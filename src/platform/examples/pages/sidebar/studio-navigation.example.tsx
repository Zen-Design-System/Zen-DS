import { useId, useRef, useState, type ReactNode, type Ref } from "react";
import {
  AppShell, AppShellAccount, AppShellHeader, Avatar, Badge, BadgeStatus, Breadcrumbs, Button, Card, DescriptionList, DockIcon, EmptyState, FileIcon, Grid,
  Heading, IconButton, InputField, Link, List, ListBox, ListItem, Menu, ModalForm, PageHeader, Search, Sidebar, SidebarMenuItem, Stack, Text, Thumbnail,
  fileIconFormatOf, plural, useFormState, useToast, useZen,
  type BadgeTheme, type BreadcrumbItemData, type IconName, type SidebarSection,
} from "@zen-ds/react";
import {
  activity, daysFromToday, files, formatBytes, formatDate, formatDay, formatDue, formatRelative, initials, me, people, plans, priorityTheme, projectById,
  projectProgress, projectStep, projects, studio, taskStep, tasks, workspacePlan,
  type Activity, type Person, type PersonId, type Project, type StudioFile, type Task,
} from "../../data";

// ——— The rows of a page ————————————————————————————————————————————————————————————————————————————————
type Row = { id: string; title: string; caption: string; leading: ReactNode; trailing?: ReactNode; onClick?: () => void };

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
const projectRow = (p: Project): Row => ({ id: p.id, title: p.name, caption: `${p.client} · Due ${formatDate(p.due)}`, leading: itemIcon(p.icon), trailing: projectBadge(p) });

/** One list in a ListBox. Beside the default Sidebar on the grey Default Canvas it takes the Sidebar’s shadow (usage
 *  rules §16). `heading`: a titled section (Heading/Subheading, its rows named by it), with an optional See all link to
 *  the page that holds the rest. */
function RowCard({ label, rows, heading = false, seeAll }: { label: string; rows: Row[]; heading?: boolean; seeAll?: () => void }) {
  const headingId = useId();
  // A list on a phone-width screen keeps the title readable: the row’s Badge waits on the page the row opens.
  const narrow = useZen()?.breakpoint === "mobile";
  return (
    <ListBox as={heading ? "section" : "div"} aria-labelledby={heading ? headingId : undefined} theme="shadow" header={heading ? (
      <Stack direction="row" justify="between" align="center" gap="xs">
        <Heading level={2} id={headingId} textStyle="Heading/Subheading">{label}</Heading>
        {/* A section head’s See all is underlined text, not a button. */}
        {seeAll ? <Text as="span" textStyle="Body/Small/Bold"><Link as="button" tone="inherit" onClick={seeAll}>See all</Link></Text> : null}
      </Stack>
    ) : undefined}>
      <List aria-label={heading ? undefined : label} aria-labelledby={heading ? headingId : undefined}>
        {rows.map(({ id, trailing, ...row }) => <ListItem key={id} as="li" titleLines={2} {...row} trailing={narrow ? undefined : trailing} />)}
      </List>
    </ListBox>
  );
}
/** Two sections side by side on a wide page, one above the other in a narrow window. */
const Pair = ({ children }: { children: ReactNode }) => <Grid columns={2} stackBelow={720} gap="md" align="start">{children}</Grid>;
/** Cards take the Sidebar’s elevation too, like the ListBox beside them. */
const detailsCard = (items: { term: string; description: ReactNode }[]) => <Card theme="shadow"><DescriptionList items={items} /></Card>;

// ——— The page in the header ——————————————————————————————————————————————————————————————————————————
/** A crumb of the header’s trail; `go` opens its page. */
type Crumb = BreadcrumbItemData & { go?: () => void };
/** What a page shows: its PageHeader (the header’s Main row), its trail (the top row) and its Body. */
type View = { title: string; description?: ReactNode; meta?: ReactNode; actions?: ReactNode; crumbs?: Crumb[]; body: ReactNode };
/** The page title takes focus (titleRef) when the button beside it leaves. */
const pageHeader = ({ title, description, meta, actions }: View, titleRef: Ref<HTMLSpanElement>) => (
  <PageHeader title={<span ref={titleRef} tabIndex={-1}>{title}</span>} description={description} meta={meta} actions={actions} />
);
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

/** A task opened from a list: the Sidebar keeps the list’s destination selected, and the trail leads back to it. */
function taskView(task: Task, back: Crumb[], project: Project | undefined): View {
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
        ])}
        <RowCard heading label="Activity" rows={[
          { id: "status", title: assignee.name, caption: `Moved it to ${task.status} · ${formatRelative(daysFromToday(-1, 16, 20))}`, leading: personAvatar(assignee) },
          { id: "created", title: lead.name, caption: `${lead === assignee ? "Created it" : `Created it for ${firstName(assignee)}`} · ${formatDate(daysFromToday(-9))}`, leading: personAvatar(lead) },
        ]} />
      </Pair>
    ),
  };
}

/* The studio's mark and name. The logo slot has a fixed height (24px; 20px in Small-Density): the mark is a 2xs
   Thumbnail that fits it at every density, and the name uses a text style whose line fits it. */
const studioLogo = <Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>;
const studioMark = <Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />;
const openProjects = projects.filter((p) => p.status !== "Completed");
const tasksOf = (projectId: string) => tasks.filter((t) => t.project === projectId);
const filesOf = (projectId: string) => files.filter((f) => f.project === projectId);
const dueThisWeek = tasks.filter((t) => t.status !== "Done" && t.due <= daysFromToday(7)).sort((a, b) => +a.due - +b.due).slice(0, 5);
/** The studio’s plan, from the shared price list: Business, 48 seats, billed monthly. */
const studioPlan = plans.find((plan) => plan.id === workspacePlan.plan)!;
const studioSeats = workspacePlan.seats;

/** A project’s own page: its tasks (or, without any, its files or an empty state) beside its files and its team. */
function projectBody(p: Project, extraTasks: Task[], openTask: (t: Task) => void, openFile: (f: StudioFile) => void, empty: ReactNode): ReactNode {
  const taskRows = [...tasksOf(p.id), ...extraTasks].map((t) => taskRow(t, openTask));
  const fileRows = filesOf(p.id).map((f) => fileRow(f, openFile));
  const filesBox = fileRows.length ? <RowCard heading label="Files" rows={fileRows} /> : null;
  const team = p.members.map((id) => ({ ...personRow(people[id]), caption: id === p.lead ? `${people[id].role} · Lead` : people[id].role }));
  return (
    <Pair>
      {taskRows.length ? <RowCard heading label="Tasks" rows={taskRows} /> : filesBox ?? empty}
      <Stack gap="md">
        {taskRows.length ? filesBox : null}
        <RowCard heading label="Team" rows={team} />
      </Stack>
    </Pair>
  );
}

// ——— The studio's navigation ————————————————————————————————————————————————————————————————————————
const myTaskIds = ["t5", "t2", "t8"]; // assigned to Alex, or waiting for his review
const helpRows: Row[] = [
  { id: "shortcuts", title: "Keyboard shortcuts", caption: "Move around Zen without the mouse", leading: itemIcon("icon-keyboard-line") },
  { id: "invite", title: "Invite your team", caption: "Add people and choose what they can see", leading: itemIcon("icon-users-plus-line") },
  { id: "figma", title: "Connect Figma", caption: "Show live designs on tasks and reviews", leading: itemIcon("icon-link-01-line") },
];
const admins: PersonId[] = ["minhAnh", "alex", "mai"];

export default function StudioNavigation() {
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
  const titleRef = useRef<HTMLSpanElement>(null);

  const list = [...added, ...openProjects];
  const allTasks = [...tasks, ...newTasks];
  const go = (id: string) => { setPage(id); setTaskId(null); setQuery(""); if (id === "phin-loyalty") setSeen(true); };
  const openTask = (t: Task) => { setTaskId(t.id); setQuery(""); };
  const markRead = () => {
    const before = unread;
    setUnread([]);
    // Mark all read goes once nothing is unread: focus moves to the page title beside it.
    setTimeout(() => titleRef.current?.focus());
    toast({ title: "Messages marked as read", action: { label: "Undo", onClick: () => setUnread(before) } });
  };
  const addProject = (name: string) => {
    const id = `new-project-${added.length + 1}`;
    setAdded((current) => [{ ...projects[0], id, name, client: studio.name, icon: "icon-cube-line", theme: "indigo", status: "Planning", lead: "alex", members: ["alex"], progress: 0, start: daysFromToday(0), due: daysFromToday(60) }, ...current]);
    go(id);
  };
  const addTask = (title: string) => setNewTasks((current) => [...current, { id: `new-task-${current.length + 1}`, key: `${initials(list.find((p) => p.id === page)?.name ?? "New")}-${current.length + 1}`, title, project: page, assignee: "alex", status: "To do", priority: "Medium", due: daysFromToday(7), comments: 0 }]);
  const download = (f: StudioFile) => toast({ title: "Download started", children: f.name });

  // New project and New task: one field each; a submit checks it, closes the dialog and confirms with a toast.
  const newProject = useFormState<{ name: string }>({
    initialValues: { name: "" },
    validate: ({ name }) => ({ name: name.trim() ? undefined : "Enter a project name" }),
    onSubmit: ({ name }, { reset }) => {
      addProject(name.trim());
      setDialog(null);
      reset();
      toast({ type: "positive", title: `${name.trim()} created` });
    },
  });
  const newTask = useFormState<{ name: string }>({
    initialValues: { name: "" },
    validate: ({ name }) => ({ name: name.trim() ? undefined : "Enter a task name" }),
    onSubmit: ({ name }, { reset }) => {
      addTask(name.trim());
      setDialog(null);
      reset();
      toast({ type: "positive", title: "Task added" });
    },
  });

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
      body: rows.length ? <RowCard label="Search results" rows={rows} /> : (
        <EmptyState headingLevel={2} title="No projects or tasks match" icon="icon-search-medium-line" secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>
          Try a client, a project or a task key such as LUM-091.
        </EmptyState>
      ),
    };
  } else if (task) {
    view = taskView(task, [{ id: "back", label: pageTitle, go: () => setTaskId(null) }], list.find((p) => p.id === task.project) ?? projectById(task.project));
  } else if (project) {
    const extra = newTasks.filter((t) => t.project === project.id);
    const hasTasks = tasksOf(project.id).length + extra.length > 0;
    view = {
      title: project.name,
      meta: projectBadge(project),
      description: `${project.client} · Led by ${people[project.lead].name} · Due ${formatDate(project.due)}`,
      // The page’s one Primary; an empty project offers it in its empty state instead.
      actions: hasTasks ? <Button level="primary" startIcon="icon-plus-line" onClick={() => setDialog("task")}>Add task</Button> : undefined,
      body: projectBody(project, extra, openTask, download, (
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
      body: <RowCard label="Inbox" rows={activity.map((a) => activityRow(a, unread.includes(a.id)))} />,
    };
  } else if (page === "my-tasks") {
    view = { title: "My tasks", description: "Assigned to you or waiting for your review", body: <RowCard label="My tasks" rows={tasks.filter((t) => myTaskIds.includes(t.id)).map((t) => taskRow(t, openTask))} /> };
  } else if (page === "settings") {
    view = {
      title: "Settings",
      description: `Workspace details for ${studio.name}`,
      body: (
        <Pair>
          {detailsCard([{ term: "Workspace", description: studio.name }, { term: "Domain", description: studio.domain }, { term: "Members", description: plural(studioSeats, "person", "people") }, { term: "Plan", description: `${studioPlan.name} · ${plural(studioSeats, "seat")} · billed ${workspacePlan.billing}` }])}
          <RowCard heading label="Admins" rows={admins.map((id) => personRow(people[id]))} />
        </Pair>
      ),
    };
  } else if (page === "help") {
    view = { title: "Help", description: "Guides for the studio’s Zen workspace", body: <RowCard label="Help articles" rows={helpRows.map((row) => ({ ...row, onClick: () => toast({ title: row.title, children: row.caption }) }))} /> };
  } else {
    view = {
      title: "Home",
      description: `Good morning, ${firstName(me)}. ${plural(dueThisWeek.length, "task")} across your projects are due this week.`,
      body: (
        <Pair>
          <RowCard heading label="Due this week" rows={dueThisWeek.map((t) => taskRow(t, openTask))} />
          <RowCard heading label="Recent activity" rows={activity.slice(0, 4).map((a) => activityRow(a, unread.includes(a.id)))} seeAll={() => go("inbox")} />
        </Pair>
      ),
    };
  }

  return (
    <>
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
            main={pageHeader(view, titleRef)}
          />
        )}
      >
        {view.body}
      </AppShell>
      <ModalForm open={dialog === "project"} onOpenChange={(open) => { setDialog(open ? "project" : null); if (!open) newProject.reset(); }} title="New project"
        onSubmit={newProject.handleSubmit} primaryAction={{ label: "Create project" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Project name" autoComplete="off" placeholder="Website refresh" data-autofocus="" {...newProject.field("name")} />
      </ModalForm>
      <ModalForm open={dialog === "task"} onOpenChange={(open) => { setDialog(open ? "task" : null); if (!open) newTask.reset(); }} title="New task"
        onSubmit={newTask.handleSubmit} primaryAction={{ label: "Add task" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Task name" autoComplete="off" placeholder="Plan the kickoff workshop" data-autofocus="" {...newTask.field("name")} />
      </ModalForm>
    </>
  );
}
