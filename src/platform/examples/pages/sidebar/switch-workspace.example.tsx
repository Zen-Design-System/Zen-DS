import { useId, useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellHeader, Avatar, Badge, BadgeStatus, Breadcrumbs, Card, DescriptionList, DockIcon, EmptyState, FileIcon, Grid, Heading,
  IconButton, InputField, Link, List, ListBox, ListItem, Menu, ModalForm, PageHeader, Sidebar, Stack, Text, fileIconFormatOf, plural, useFormState,
  useToast, useZen,
  type BadgeTheme, type BreadcrumbItemData, type IconName, type SidebarItem, type SidebarSection,
} from "@zen-ds/react";
import {
  activity, daysFromToday, files, formatBytes, formatDate, formatDay, formatDue, formatMoney, formatRelative, initials, invoiceStatusTheme, invoices, me,
  people, peopleList, priorityTheme, projectById, projectProgress, projectStep, projects, studio, taskStep, tasks, workspacePlan,
  type Activity, type Invoice, type Person, type Project, type StudioFile, type Task,
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
const fileRow = (f: StudioFile): Row => ({ id: f.id, title: f.name, caption: `${formatBytes(f.bytes)} · ${people[f.owner].name} · ${formatRelative(f.updated)}`, leading: <FileIcon format={fileIconFormatOf(f.name)} size="xl" /> });
const personRow = (p: Person): Row => ({ id: p.id, title: p.name, caption: `${p.role} · ${p.location}`, leading: personAvatar(p) });
const activityRow = (a: Activity, unread: boolean): Row => ({ id: a.id, title: people[a.actor].name, caption: `${a.verb[0].toUpperCase()}${a.verb.slice(1)} ${a.object} · ${formatRelative(a.at)}`, leading: personAvatar(people[a.actor]), trailing: unread ? <Badge theme="accent" background="subtle">New</Badge> : undefined });
const invoiceRow = (i: Invoice): Row => ({
  id: i.id, title: i.number, caption: `${i.client} · ${formatMoney(i.amount, true)} · Due ${formatDate(i.due)}`, leading: itemIcon("icon-receipt-line"),
  trailing: statusBadge(i.status, invoiceStatusTheme[i.status]),
});
const projectRow = (p: Project): Row => ({ id: p.id, title: p.name, caption: `${p.client} · Due ${formatDate(p.due)}`, leading: itemIcon(p.icon), trailing: projectBadge(p) });

/** One list in a ListBox. On the white Alt Canvas (with a Sidebar on the canvas) the ListBox takes the Pale border
 *  (usage rules §16). `heading`: a titled section (Heading/Subheading, its rows named by it), with an optional See all
 *  link to the page that holds the rest. */
function RowCard({ label, rows, heading = false, seeAll }: { label: string; rows: Row[]; heading?: boolean; seeAll?: () => void }) {
  const headingId = useId();
  // A list on a phone-width screen keeps the title readable: the row’s Badge waits on the page the row opens.
  const narrow = useZen()?.breakpoint === "mobile";
  return (
    <ListBox as={heading ? "section" : "div"} aria-labelledby={heading ? headingId : undefined} theme="border" header={heading ? (
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
/** Cards take the Pale border too, like the ListBox beside them. */
const detailsCard = (items: { term: string; description: ReactNode }[]) => <Card theme="border"><DescriptionList items={items} /></Card>;

// ——— The page in the header ——————————————————————————————————————————————————————————————————————————
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

const tasksOf = (projectId: string) => tasks.filter((t) => t.project === projectId);
const filesOf = (projectId: string) => files.filter((f) => f.project === projectId);
const dueThisWeek = tasks.filter((t) => t.status !== "Done" && t.due <= daysFromToday(7)).sort((a, b) => +a.due - +b.due).slice(0, 5);

// ——— The workspaces ————————————————————————————————————————————————————————————————————————————————
type Workspace = { id: string; label: string; mark: ReactNode; sections: SidebarSection[]; members: number; role: string };
const nav = (id: string, label: string, icon: IconName, extra: Partial<SidebarItem> = {}): SidebarItem => ({ id, label, icon, ...extra });
const baseWorkspaces: Workspace[] = [
  { id: "ws-dizai", label: studio.name, mark: <Avatar size="medium" shape="square" theme="photo" src={studio.logo} alt="" />, members: workspacePlan.seats, role: "Admin",
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

export default function SwitchWorkspace() {
  const { toast } = useToast();
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

  // New workspace and New project: one field each; a submit checks it, closes the dialog and confirms with a toast.
  const newWorkspace = useFormState<{ name: string }>({
    initialValues: { name: "" },
    validate: ({ name }) => ({ name: name.trim() ? undefined : "Enter a workspace name" }),
    onSubmit: ({ name }, { reset }) => {
      addWorkspace(name.trim());
      setDialog(null);
      reset();
      toast({ type: "positive", title: `${name.trim()} created` });
    },
  });
  const newProject = useFormState<{ name: string }>({
    initialValues: { name: "" },
    validate: ({ name }) => ({ name: name.trim() ? undefined : "Enter a project name" }),
    onSubmit: ({ name }, { reset }) => {
      setCreated((current) => ({ ...current, [workspace.id]: [...(current[workspace.id] ?? []), name.trim()] }));
      setDialog(null);
      reset();
      toast({ type: "positive", title: `${name.trim()} created` });
    },
  });

  const label = workspace.sections.flatMap((s) => s.items).find((item) => item.id === page)?.label ?? "Settings";
  const projectId = clientProject[workspace.id];
  // The trail starts at the workspace (its home); its own home page has none.
  const toHome: Crumb = { id: "workspace", label: workspace.label, go: () => setPage(homeId) };
  const crumbs: Crumb[] | undefined = page === homeId ? undefined : [toHome, { id: page, label, go: () => setTaskId(null) }];
  let body: ReactNode;
  if (page === "settings") body = detailsCard([{ term: "Workspace", description: workspace.label }, { term: "Members", description: plural(workspace.members, "person", "people") }, { term: "Your role", description: workspace.role }]);
  else if (workspace.id.startsWith("ws-new")) {
    const names = created[workspace.id] ?? [];
    body = names.length
      ? <RowCard label="Projects" rows={names.map((name, index) => ({ id: `${index}`, title: name, caption: `Planning · created by ${people.alex.name}`, leading: itemIcon("icon-cube-line") }))} />
      : <EmptyState headingLevel={2} title="No projects yet" icon="icon-folder-line" primaryAction={{ label: "New project", onClick: () => setDialog("project") }}>Projects you create in {workspace.label} show up here.</EmptyState>;
  } else if (projectId) {
    const p = projectById(projectId);
    const open = tasksOf(p.id).filter((t) => t.status !== "Done");
    const latest = projectId === "phin-loyalty"
      ? <RowCard heading label="Latest feedback" rows={feedbackRows} seeAll={() => setPage("feedback")} />
      : <RowCard heading label="Recent files" rows={filesOf(p.id).map((f) => fileRow(f))} seeAll={() => setPage("files")} />;
    body = page === "tasks" ? <RowCard label="Tasks" rows={tasksOf(p.id).map((t) => taskRow(t, openTask))} />
      : page === "files" ? <RowCard label="Files" rows={filesOf(p.id).map((f) => fileRow(f))} />
        : page === "feedback" ? <RowCard label="Feedback" rows={feedbackRows} />
          : (
            <Pair>
              <Stack gap="md">
                {detailsCard([{ term: "Project", description: p.name }, { term: "Lead", description: people[p.lead].name }, { term: "Status", description: projectBadge(p) }, { term: "Due", description: formatDate(p.due) }])}
                {latest}
              </Stack>
              <RowCard heading label="Open tasks" rows={open.map((t) => taskRow(t, openTask))} seeAll={() => setPage("tasks")} />
            </Pair>
          );
  } else {
    body = page === "inbox" ? <RowCard label="Inbox" rows={activity.map((a) => activityRow(a, Boolean(a.unread)))} />
      : page === "projects" ? <RowCard label="Projects" rows={projects.map(projectRow)} />
        : page === "people" ? <RowCard label="People" rows={peopleList.slice(0, 6).map(personRow)} />
          : page === "invoices" ? <RowCard label="Invoices" rows={invoices.map(invoiceRow)} />
            : (
              <Pair>
                <RowCard heading label="Due this week" rows={dueThisWeek.map((t) => taskRow(t, openTask))} />
                <RowCard heading label="Recent activity" rows={activity.slice(0, 4).map((a) => activityRow(a, Boolean(a.unread)))} seeAll={() => setPage("inbox")} />
              </Pair>
            );
  }
  const view: View = task
    ? taskView(task, crumbs ?? [toHome], projectById(task.project))
    : { crumbs, title: label, description: `${workspace.label} · ${plural(workspace.members, "member")}`, body };

  return (
    <>
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
      <ModalForm open={dialog === "workspace"} onOpenChange={(open) => { setDialog(open ? "workspace" : null); if (!open) newWorkspace.reset(); }} title="New workspace"
        onSubmit={newWorkspace.handleSubmit} primaryAction={{ label: "Create workspace" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Workspace name" autoComplete="off" placeholder="Saola Outdoor" data-autofocus="" {...newWorkspace.field("name")} />
      </ModalForm>
      <ModalForm open={dialog === "project"} onOpenChange={(open) => { setDialog(open ? "project" : null); if (!open) newProject.reset(); }} title="New project"
        onSubmit={newProject.handleSubmit} primaryAction={{ label: "Create project" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Project name" autoComplete="off" placeholder="Brand guidelines" data-autofocus="" {...newProject.field("name")} />
      </ModalForm>
    </>
  );
}
