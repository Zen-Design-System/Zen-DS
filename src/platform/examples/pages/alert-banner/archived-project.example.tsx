import { useId, useRef, useState, type ReactNode, type Ref } from "react";
import {
  AlertBanner, AppShell, AppShellAccount, AppShellHeader, Avatar, Badge, BadgeStatus, Breadcrumbs, Button, Card, DescriptionList, DockIcon, Grid, Heading,
  InputField, List, ListBox, ListItem, Menu, ModalForm, PageHeader, Sidebar, SidebarMenuItem, Stack, Text, Thumbnail, plural, useFormState, useToast,
  useZen, type SidebarSection,
} from "@zen-ds/react";
import {
  activity, daysFromToday, formatDate, formatDay, formatDue, formatMoney, formatRelative, initials, me, people, plans, projectById, projectProgress,
  projectStep, projects, studio, taskStep, tasks, workspacePlan, type Person, type PersonId, type Project, type TaskStatus,
} from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, background: "subtle" as const, children: initials(person.name) };
const statusBadge = (status: TaskStatus) => <BadgeStatus status={taskStep[status]}>{status}</BadgeStatus>;
const projectBadge = (p: Project) => <BadgeStatus status={projectStep[p.status]} progress={projectProgress(p)}>{p.status}</BadgeStatus>;

// ——— The studio’s shell ————————————————————————————————————————————————————————————————————————————————————————————
type StudioPageId = "home" | "projects" | "team" | "billing" | "settings";
// The studio’s plan from the shared price list: Business, 48 seats at $24 a month = $1,152.
const plan = plans.find((item) => item.id === workspacePlan.plan)!;
const seats = workspacePlan.seats;
const dueThisWeek = tasks.filter((task) => task.status !== "Done" && task.due <= daysFromToday(7)).sort((a, b) => +a.due - +b.due).slice(0, 5);
const openProjects = projects.filter((project) => project.status !== "Completed");
const teamIds: PersonId[] = ["chi", "bao", "duy", "ava", "finn", "hana"];

/** The studio’s Sidebar: the same destinations on every screen. */
function studioSidebar(selectedId: string, onItemClick: (id: StudioPageId) => void) {
  const sections: SidebarSection[] = [{ items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "team", label: "Team", icon: "icon-users-line" },
    // A one-item group loses its title: Billing joins the list.
    { id: "billing", label: "Billing", icon: "icon-credit-card-line" },
  ] }];
  return (
    <Sidebar
      // The mark is a 2xs Thumbnail, sized for the 24px header slot, so it stays inside it at every density.
      logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
      logoCollapsed={<Avatar size="xs" shape="square" theme="photo" src={studio.logo} alt={studio.name} />}
      sections={sections}
      selectedId={selectedId}
      onItemClick={(item) => onItemClick(item.id as StudioPageId)}
      footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />}
    />
  );
}

/** The account button at the end of the header’s top row, with its menu. */
function AccountMenu({ onSettings }: { onSettings?: () => void }) {
  const { toast } = useToast();
  return (
    <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
      { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
      { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => (onSettings ? onSettings() : toast({ title: "Settings", children: "Notifications, security and billing." })) },
      { type: "separator" },
      { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: "See you soon, Alex." }) },
    ]} />
  );
}

/** A titled list on the page: Heading/Subheading over its rows, in a Shadow ListBox beside the default Sidebar. On a
 *  phone the rows get `narrow`, so they can leave their Badge to the page the row opens and keep the title readable. */
function Section({ label, children }: { label: string; children: (narrow: boolean) => ReactNode }) {
  const id = useId();
  const narrow = useZen()?.breakpoint === "mobile";
  return (
    <ListBox as="section" theme="shadow" aria-labelledby={id} header={<Heading level={2} id={id} textStyle="Heading/Subheading">{label}</Heading>}>
      <List aria-labelledby={id}>{children(narrow)}</List>
    </ListBox>
  );
}
const Pair = ({ children }: { children: ReactNode }) => <Grid columns={2} stackBelow={720} gap="md" align="start">{children}</Grid>;

/** What a page shows: its PageHeader (the header’s Main row) and its Body. */
type View = { title: string; eyebrow?: ReactNode; description?: ReactNode; meta?: ReactNode; actions?: ReactNode; body: ReactNode };
/** The page title takes focus (titleRef) when the buttons beside it leave. */
const pageHeader = ({ title, eyebrow, description, meta, actions }: View, titleRef: Ref<HTMLSpanElement>) => (
  <PageHeader title={<span ref={titleRef} tabIndex={-1}>{title}</span>} eyebrow={eyebrow} description={description} meta={meta} actions={actions} />
);

/** The pages every studio screen shares: Home, Projects and Team. */
function sharedView(page: StudioPageId, openProject?: (p: Project) => void): View {
  if (page === "projects") {
    return {
      title: "Projects",
      description: `${plural(openProjects.length, "open project")} across five clients`,
      body: (
        <ListBox theme="shadow">
          <List aria-label="Projects">
            {projects.map((project) => (
              <ListItem key={project.id} title={project.name} caption={`${project.client} · ${project.status === "Completed" ? "Launched" : "Due"} ${formatDate(project.due)}`}
                leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />}
                trailing={projectBadge(project)} onClick={openProject ? () => openProject(project) : undefined} />
            ))}
          </List>
        </ListBox>
      ),
    };
  }
  if (page === "team") {
    return {
      title: "Team",
      description: `${plural(seats, "person", "people")} in Ho Chi Minh City, Hanoi and Singapore`,
      body: (
        <ListBox theme="shadow">
          <List aria-label="Team">
            {teamIds.map((id) => <ListItem key={id} title={people[id].name} caption={`${people[id].role} · ${people[id].location}`} leading={<Avatar size="md" {...avatarOf(people[id])} />} />)}
          </List>
        </ListBox>
      ),
    };
  }
  return {
    title: "Home",
    description: `Good morning, Alex. ${plural(dueThisWeek.length, "task")} across your projects are due this week.`,
    body: (
      <Pair>
        <Section label="Due this week">
          {(narrow) => dueThisWeek.map((task) => (
            <ListItem key={task.id} title={task.title} titleLines={2} caption={`${projectById(task.project).client} · ${formatDue(task.due)}`}
              leading={<Avatar size="md" {...avatarOf(people[task.assignee])} />} trailing={narrow ? undefined : statusBadge(task.status)} />
          ))}
        </Section>
        <Section label="Since yesterday">
          {() => activity.slice(0, 4).map((a) => (
            <ListItem key={a.id} title={people[a.actor].name} titleLines={2} caption={`${a.verb[0].toUpperCase()}${a.verb.slice(1)} ${a.object} · ${formatRelative(a.at)}`}
              leading={<Avatar size="md" {...avatarOf(people[a.actor])} />} />
          ))}
        </Section>
      </Pair>
    ),
  };
}
/** The workspace’s details, on Settings and Billing. */
const workspaceCard = (
  <Card theme="shadow">
    <DescriptionList items={[
      { term: "Workspace", description: studio.name },
      { term: "Domain", description: studio.domain },
      { term: "Plan", description: `${plan.name} · ${plural(seats, "seat")} · billed ${workspacePlan.billing}` },
    ]} />
  </Card>
);

// ——— The archived project (a read-only page) ———————————————————————————————————————————————————————————————————————
type ProjectTask = { id: string; key: string; title: string; assignee: PersonId; status: TaskStatus; done?: Date };
const bookFair = projectById("bookfair-site");
const bookFairTasks: ProjectTask[] = [
  { id: "b1", key: "HBF-118", title: "Publish the exhibitor map", assignee: "gia", status: "Done", done: daysFromToday(-14) },
  { id: "b2", key: "HBF-121", title: "Fix the ticket page on Safari", assignee: "em", status: "Done", done: daysFromToday(-13) },
  { id: "b3", key: "HBF-124", title: "Hand the CMS over to the client", assignee: "linh", status: "Done", done: daysFromToday(-12) },
  { id: "b4", key: "HBF-127", title: "Write the post-launch report", assignee: "gia", status: "Done", done: daysFromToday(-3) },
];

export default function ArchivedProject() {
  const { toast } = useToast();
  const [page, setPage] = useState<StudioPageId>("projects");
  const [projectId, setProjectId] = useState<string | null>(bookFair.id);
  const [archived, setArchived] = useState(true);
  const [rows, setRows] = useState(bookFairTasks);
  const [adding, setAdding] = useState(false);
  const titleRef = useRef<HTMLSpanElement>(null);
  const newTaskRef = useRef<HTMLButtonElement>(null);
  const project = projectId ? projectById(projectId) : undefined;
  const onBookFair = project?.id === bookFair.id;
  // The button pressed goes away with the state it changed: focus moves to what took its place (New task once restored,
  // the page title once archived), never to <body>. Undo’s toast closes as it runs, so Undo moves focus the same way.
  const change = (next: boolean) => {
    setArchived(next);
    setTimeout(() => (next ? titleRef : newTaskRef).current?.focus());
  };
  // Restoring is undoable, so it acts at once and the Toast offers Undo. One id: only the latest change can be undone.
  const restore = () => {
    change(false);
    toast({ id: "project-state", title: "Project restored", action: { label: "Undo", onClick: () => change(true) } });
  };
  const archive = () => {
    change(true);
    toast({ id: "project-state", title: "Project archived", action: { label: "Undo", onClick: () => change(false) } });
  };
  const addTask = (title: string) => setRows((list) => [...list, { id: `new-${list.length}`, key: `HBF-${128 + list.length - bookFairTasks.length}`, title, assignee: "alex", status: "To do" }]);
  const go = (id: StudioPageId) => { setPage(id); setProjectId(null); };
  // New task asks for a name: submitting checks it, adds the task, closes and confirms with a toast; Cancel, Escape and
  // the scrim close it, and focus returns to New task.
  const newTask = useFormState<{ title: string }>({
    initialValues: { title: "" },
    validate: ({ title }) => ({ title: title.trim() ? undefined : "Enter a task name" }),
    onSubmit: ({ title }, { reset }) => {
      addTask(title.trim());
      setAdding(false);
      reset();
      toast({ type: "positive", title: "Task added" });
    },
  });
  const changeAdding = (next: boolean) => { setAdding(next); if (!next) newTask.reset(); };

  let view: View;
  if (project) {
    const projectRows: ProjectTask[] = onBookFair ? rows : tasks.filter((t) => t.project === project.id).map((t) => ({ id: t.id, key: t.key, title: t.title, assignee: t.assignee, status: t.status }));
    const readOnly = onBookFair && archived;
    view = {
      eyebrow: project.client,
      title: project.name,
      meta: readOnly ? <Badge theme="neutral" background="subtle">Archived</Badge> : projectBadge(project),
      description: `${project.status === "Completed" ? "Launched" : "Due"} ${formatDate(project.due)} · ${plural(project.members.length, "member")}`,
      // Archived: read-only, so the actions that change it are gone; the banner offers the way back.
      actions: readOnly ? undefined : (
        <>
          {onBookFair ? <Button level="tertiary" startIcon="icon-archive-line" onClick={archive}>Archive project</Button> : null}
          <Button ref={newTaskRef} level="primary" startIcon="icon-plus-line" onClick={() => (onBookFair ? setAdding(true) : toast({ title: "New task", children: `Adds a task to ${project.name}.` }))}>New task</Button>
        </>
      ),
      body: (
        <Grid columns="minmax(0, 2fr) minmax(0, 1fr)" stackBelow={720} gap="md" align="start">
          <Section label="Tasks">
            {(narrow) => projectRows.map((row) => (
              <ListItem key={row.id} title={row.title} titleLines={2} caption={row.done ? `${row.key} · Done ${formatDay(row.done)}` : onBookFair ? `${row.key} · Added just now` : row.key}
                leading={<Avatar size="md" {...avatarOf(people[row.assignee])} />} trailing={narrow ? undefined : statusBadge(row.status)} />
            ))}
          </Section>
          <Card theme="shadow">
            <DescriptionList items={[
              { term: "Client", description: project.client },
              { term: "Lead", description: people[project.lead].name },
              { term: "Team", description: project.members.map((id) => people[id].name.split(" ")[0]).join(", ") },
              { term: "Budget", description: `${formatMoney(project.spent)} of ${formatMoney(project.budget)}` },
            ]} />
          </Card>
        </Grid>
      ),
    };
  } else if (page === "billing") {
    view = { title: "Billing", description: `${plan.name} plan · ${plural(seats, "seat")} · billed ${workspacePlan.billing}`, body: workspaceCard };
  } else if (page === "settings") {
    view = { title: "Settings", description: `Workspace details for ${studio.name}`, body: workspaceCard };
  } else {
    view = sharedView(page, (p) => setProjectId(p.id));
  }

  return (
    <>
      <AppShell
        // The archived project’s condition: the banner shows while that project is open, above the shell so it stays in
        // view as the tasks scroll; other pages open without it.
        banner={onBookFair && archived ? (
          <AlertBanner action={{ label: "Restore project", onClick: restore }}>This project is archived, so it’s read-only. Restore it to add or change tasks.</AlertBanner>
        ) : undefined}
        sidebar={studioSidebar(project ? "projects" : page, go)}
        header={(
          <AppShellHeader
            leading={project ? (
              <Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: project.id, label: project.name }]}
                onNavigate={(item, event) => { event.preventDefault(); if (item.id === "projects") go("projects"); }} />
            ) : undefined}
            actions={<AccountMenu onSettings={() => go("settings")} />}
            main={pageHeader(view, titleRef)}
          />
        )}
      >
        {view.body}
      </AppShell>
      <ModalForm open={adding} onOpenChange={changeAdding} title="New task" onSubmit={newTask.handleSubmit}
        primaryAction={{ label: "Add task" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Task name" autoComplete="off" placeholder="Update the 2027 exhibitor list" data-autofocus="" {...newTask.field("title")} />
      </ModalForm>
    </>
  );
}
