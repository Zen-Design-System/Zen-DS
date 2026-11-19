import { useId, useRef, useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, BadgeCounter, BadgeStatus, Box, Breadcrumbs, Button, Card, DescriptionList, Dialog,
  DockIcon, EmptyState, FileIcon, Grid, Heading, IconButton, InputField, List, ListBox, ListItem, Menu, ModalForm, PageHeader, ProgressBar, Search,
  Sidebar, SidebarMenuItem, Stack, Text, Thumbnail, fileIconFormatOf, plural, useFormState, useToast, useZen, type MenuEntry, type SidebarSection,
} from "@zen-ds/react";
import {
  activity, daysFromToday, files, formatBytes, formatDate, formatDue, formatMoney, formatRelative, initials, me, people, projectProgress, projectStep,
  projects, studio, taskStep, tasks, type Person, type PersonId, type Project,
} from "../../data";

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
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

type ProjectState = Project & { archived?: boolean };
const openTasksOf = (projectId: string) => tasks.filter((task) => task.project === projectId && task.status !== "Done");
/** The fact that matters for each status: when it starts, when it is due, or when it finished. */
const timing = (project: Project) =>
  project.status === "Planning" ? `Starts ${formatDate(project.start)}`
    : project.status === "Completed" ? `Finished ${formatDate(project.due)}`
      : formatDue(project.due);
/** A project's money and time, for the facts card. */
const budgetLine = (project: Project) => (project.budget ? `${formatMoney(project.spent)} of ${formatMoney(project.budget)}` : "Internal, not billed");

/** A project page in the studio app: Share beside a grouped More menu, and the projects list it belongs to. */
export default function ProjectActions() {
  const { toast } = useToast();
  const [list, setList] = useState<ProjectState[]>(projects);
  const [openId, setOpenId] = useState<string | null>("phin-loyalty");
  // The project that was open last: Back to the list lands on its row.
  const [fromId, setFromId] = useState("phin-loyalty");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Below the desktop breakpoint the tasks' column is narrow: the assignee's face and a trailing Badge would squeeze the
  // title, so the status leads the caption instead.
  const breakpoint = useZen()?.breakpoint;
  const narrowTasks = breakpoint === "mobile" || breakpoint === "tablet";
  const tasksId = useId();
  const detailsId = useId();
  const teamId = useId();
  const filesId = useId();
  // Focus follows the screen: a project focuses its title, the list the row it came from (or its title when that row
  // went away); Undo of a rename goes back to the More menu, which stays.
  const titleRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const shown = list.filter((project) => !project.archived);
  const project = shown.find((item) => item.id === openId);
  /** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This screen shows the menu." });
  const open = (id: string) => {
    setOpenId(id);
    setFromId(id);
    setTimeout(() => titleRef.current?.focus());
  };
  const toProjects = (row: "back" | "gone") => {
    setOpenId(null);
    setTimeout(() => (row === "back" ? rowRef : titleRef).current?.focus());
  };
  const update = (id: string, patch: Partial<ProjectState>) => setList((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
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
      toast({ title: "Project renamed", children: name.trim(), action: { label: "Undo", onClick: () => { update(project.id, { name: before }); setTimeout(() => moreRef.current?.focus()); } } });
    },
  });
  // New project and Share ask for one value: submitting checks it, closes and confirms with a toast; Cancel, Escape and
  // the scrim close them and clear what was typed.
  const newProject = useFormState<{ name: string }>({
    initialValues: { name: "" },
    validate: ({ name }) => ({ name: name.trim() ? undefined : "Enter a project name" }),
    onSubmit: ({ name }, { reset }) => {
      const created: ProjectState = { ...projects[0], id: `new-${list.length}`, name: name.trim(), client: studio.name, icon: "icon-folder-line", theme: "neutral", status: "Planning", lead: me.id as PersonId, members: [me.id as PersonId], progress: 0, spent: 0, budget: 0, start: daysFromToday(7), due: daysFromToday(97) };
      setList((items) => [created, ...items]);
      setCreating(false);
      reset();
      toast({ type: "positive", title: `${name.trim()} created` });
    },
  });
  const share = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email }) => {
      const text = email.trim();
      if (!text) return { email: "Enter an email address" };
      return { email: emailPattern.test(text) ? undefined : "Enter a valid email address, like name@company.com" };
    },
    onSubmit: ({ email }, { reset }) => {
      setSharing(false);
      reset();
      toast({ type: "positive", title: `Shared with ${email.trim()}` });
    },
  });
  const changeCreating = (next: boolean) => { setCreating(next); if (!next) newProject.reset(); };
  const changeSharing = (next: boolean) => { setSharing(next); if (!next) share.reset(); };

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
        main={<PageHeader title={<span ref={titleRef} tabIndex={-1}>Projects</span>} description={`${plural(shown.length, "project")} for Đìzai Studio and its clients`}
          actions={<Button level="primary" startIcon="icon-plus-line" onClick={() => setCreating(true)}>New project</Button>} />}
      />
    );
    body = rows.length ? (
      // Rows on the Canvas: a ListBox at the Sidebar's elevation (Shadow).
      <ListBox theme="shadow">
        <List aria-label="Projects">
          {rows.map((item) => (
            <ListItem key={item.id} ref={item.id === fromId ? rowRef : undefined} tabIndex={item.id === fromId ? -1 : undefined}
              title={item.name} caption={`${item.client} · ${timing(item)}`}
              leading={<DockIcon icon={item.icon} theme={item.theme} background="subtle" />}
              trailing={<BadgeStatus status={projectStep[item.status]} progress={projectProgress(item)}>{item.status}</BadgeStatus>}
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
    const projectFiles = files.filter((file) => file.project === project.id);
    const copyLink = () => {
      void navigator.clipboard?.writeText(`https://zen.dizai.studio/projects/${project.id}`).catch(() => undefined);
      toast({ title: "Link copied" });
    };
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
      toProjects("gone");
      toast({ title: "Project archived", children: project.name, action: { label: "Undo", onClick: () => update(project.id, { archived: false }) } });
    };
    const remove = () => {
      setList((items) => items.filter((item) => item.id !== project.id));
      setDeleting(false);
      toProjects("gone");
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
          onNavigate={(item) => { if (item.id === "projects") toProjects("back"); }} />}
        actions={<StudioActions />}
        main={(
          <PageHeader eyebrow={project.client} title={<span ref={titleRef} tabIndex={-1}>{project.name}</span>}
            meta={<BadgeStatus status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus>}
            description={`Led by ${people[project.lead].name} · ${timing(project)}`}
            actions={<>
              <Button level="tertiary" startIcon="icon-user-plus-line" onClick={() => setSharing(true)}>Share</Button>
              <Menu align="end" items={items}
                trigger={<IconButton ref={moreRef} level="tertiary" size="md" icon="icon-dots-horizontal-line" aria-label={`More actions for ${project.name}`} />} />
            </>} />
        )}
      />
    );
    // The open tasks lead (they decide whether Archive is available); the facts and the team sit beside them, all on
    // Shadow surfaces at the Sidebar's elevation. On a phone the side column moves under the tasks.
    body = (
      <Grid columns={{ mobile: 1, desktop: "minmax(0, 2fr) minmax(0, 1fr)" }} gap="xl" align="start">
        <Stack gap="xl">
          <Stack as="section" gap="md" aria-labelledby={tasksId}>
            <Heading level={2} id={tasksId} textStyle="Heading/4">Open tasks</Heading>
            {openTasks.length ? (
              <ListBox theme="shadow">
                <List aria-labelledby={tasksId}>
                  {openTasks.map((task) => (
                    <ListItem key={task.id} title={task.title} titleLines={2}
                      caption={narrowTasks ? `${task.status} · ${task.key} · ${formatDue(task.due)}` : `${task.key} · ${people[task.assignee].name} · ${formatDue(task.due)}`}
                      leading={narrowTasks ? undefined : <Avatar size="md" {...avatarOf(people[task.assignee])} />}
                      trailing={narrowTasks ? undefined : <BadgeStatus status={taskStep[task.status]}>{task.status}</BadgeStatus>} />
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
        <ModalForm open={sharing} onOpenChange={changeSharing} title={`Share ${project.name}`}
          description="They can view the project, its tasks and its files." onSubmit={share.handleSubmit}
          primaryAction={{ label: "Share project" }} secondaryAction={{ label: "Cancel" }}>
          <InputField label="Email" type="email" autoComplete="off" placeholder="name@company.com" data-autofocus="" {...share.field("email")} />
        </ModalForm>
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
    <AppShell
      sidebar={(
        <Sidebar
          logo={(
            <Stack direction="row" gap="xs" align="center">
              <Thumbnail src={studio.logo} alt="" size="2xs" />
              <Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text>
            </Stack>
          )}
          logoCollapsed={<Thumbnail src={studio.logo} alt={studio.name} size="2xs" />}
          sections={studioPlaces} selectedId="projects" onItemClick={(item) => { if (item.id !== "projects") notHere(item.label); }}
          footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
      )}
      header={header}
    >
      {body}
      {overlays}
      <ModalForm open={creating} onOpenChange={changeCreating} title="New project"
        description="It starts in Planning, led by you. Add the client and the team next." onSubmit={newProject.handleSubmit}
        primaryAction={{ label: "Create project" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Project name" type="text" autoComplete="off" placeholder="Website refresh" data-autofocus="" {...newProject.field("name")} />
      </ModalForm>
    </AppShell>
  );
}
