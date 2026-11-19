import { useId, useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, BadgeStatus, Breadcrumbs, Button, Grid, Heading, IconButton, InputField, Menu, MetricCard,
  ModalForm, PageHeader, Sidebar, SidebarMenuItem, Stack, Table, TableMedia, TableText, Text, Thumbnail, plural, useFormState, useToast, useZen,
  type SidebarSection, type TableColumn,
} from "@zen-ds/react";
import {
  activity, daysFromToday, formatDate, formatMoney, formatRelative, initials, me, people, projectById, projectStep, studio, tasks, taskStep,
  type Person, type PersonId, type ProjectStatus, type TaskStatus,
} from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };

// "Page actions" is a page of the Đìzai Studio app: one AppShell (pattern sidebar) with the studio's Sidebar, the
// header's top row (the trail, notifications, the account) and the project's PageHeader in its Main row, where the page's
// actions live. The Body pads the page, so the content starts at the page margin without a Container.
const studioPlaces: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "projects", label: "Projects", icon: "icon-folder-line" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line" },
  { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
  { id: "people", label: "People", icon: "icon-users-line" },
] }];
const unread = activity.filter((item) => item.unread);

/** The top row's utilities: notifications (the count clears once read) and the account menu, last. */
function StudioActions() {
  const { toast } = useToast();
  const [count, setCount] = useState(unread.length);
  const latest = unread[0];
  return (
    <>
      <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={count} onClick={() => {
        setCount(0);
        toast({ title: count ? plural(count, "new notification") : "You're all caught up", children: `${people[latest.actor].name} ${latest.verb} ${latest.object} · ${formatRelative(latest.at)}` });
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

const loyalty = projectById("phin-loyalty");
type TaskRow = { id: string; key: string; title: string; assignee: PersonId; status: TaskStatus; due: Date };
const loyaltyTasks: TaskRow[] = [
  ...tasks.filter((task) => task.project === "phin-loyalty").map(({ id, key, title, assignee, status, due }) => ({ id, key, title, assignee, status, due })),
  { id: "p1", key: "PHIN-226", title: "Write the rewards FAQ", assignee: "linh", status: "To do", due: daysFromToday(9) },
  { id: "p2", key: "PHIN-208", title: "Draw the loyalty tier badges", assignee: "gia", status: "Done", due: daysFromToday(-4) },
];

// On a phone the assignee joins the task's caption, so no fixed-width column is cut (backlog batch 6b).
const phoneTaskColumns: TableColumn<TaskRow>[] = [
  { id: "task", header: "Task", cell: (row) => <TableText bold caption={`${row.key} · ${people[row.assignee].name}`}>{row.title}</TableText> },
  { id: "status", header: "Status", cell: (row) => <BadgeStatus status={taskStep[row.status]}>{row.status}</BadgeStatus> },
];
const taskColumns: TableColumn<TaskRow>[] = [
  { id: "task", header: "Task", cell: (row) => <TableText bold caption={row.key}>{row.title}</TableText> },
  { id: "assignee", header: "Assignee", width: "200px", cell: (row) => <TableMedia bold={false} media={<Avatar size="xs" {...avatarOf(people[row.assignee])} />}>{people[row.assignee].name}</TableMedia> },
  { id: "status", header: "Status", width: "140px", cell: (row) => <BadgeStatus status={taskStep[row.status]}>{row.status}</BadgeStatus> },
  { id: "due", header: "Due", width: "140px", cell: (row) => <TableText>{formatDate(row.due)}</TableText> },
];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function PageActions() {
  const { toast } = useToast();
  const [rows, setRows] = useState(loyaltyTasks);
  const [status, setStatus] = useState<ProjectStatus>(loyalty.status);
  const [dialog, setDialog] = useState<"share" | "task" | null>(null);
  const tasksId = useId();
  const phone = useZen()?.breakpoint === "mobile";
  const open = rows.filter((row) => row.status !== "Done").length;
  /** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This screen shows where each action sits." });
  // New task adds a row at the top; its key continues the project's sequence.
  const addTask = (title: string) => setRows((list) => [{ id: `new-${list.length}`, key: `PHIN-${224 + list.length}`, title, assignee: "alex", status: "To do", due: daysFromToday(7) }, ...list]);
  const putOnHold = () => {
    setStatus("On hold");
    toast({ title: "Project put on hold", children: "The team stops getting reminders for its tasks.", action: { label: "Undo", onClick: () => setStatus("Active") } });
  };
  // Share: one email field; a valid address closes the dialog and a toast confirms the invite.
  const share = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email }) => {
      const text = email.trim();
      if (!text) return { email: "Enter an email address" };
      return { email: emailPattern.test(text) ? undefined : "Enter a valid email address, like name@company.com" };
    },
    onSubmit: ({ email }, { reset }) => {
      setDialog(null);
      reset();
      toast({ type: "positive", title: `Invite sent to ${email.trim()}` });
    },
  });
  // New task: one name field; the task joins the table and a toast confirms it.
  const newTask = useFormState<{ name: string }>({
    initialValues: { name: "" },
    validate: ({ name }) => ({ name: name.trim() ? undefined : "Enter a task name" }),
    onSubmit: ({ name }, { reset }) => {
      addTask(name.trim());
      setDialog(null);
      reset();
      toast({ type: "positive", title: "Task created" });
    },
  });
  // Cancel, Escape and the scrim close a dialog and clear what was typed.
  const changeShare = (next: boolean) => { setDialog(next ? "share" : null); if (!next) share.reset(); };
  const changeNewTask = (next: boolean) => { setDialog(next ? "task" : null); if (!next) newTask.reset(); };
  return (
    <>
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
        header={(
          <AppShellHeader
            // A Sub-level trail beside the collapse toggle; the top row keeps utilities only, the page's actions sit in its Main row.
            leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: loyalty.id, label: loyalty.name }]}
              onNavigate={(_, event) => { event.preventDefault(); notHere("Projects"); }} />}
            actions={<StudioActions />}
            main={(
              <PageHeader
                eyebrow={loyalty.client}
                title={loyalty.name}
                meta={<BadgeStatus status={projectStep[status]}>{status}</BadgeStatus>}
                description={`Points, rewards and checkout for the Phin & Co coffee app. Launch is due ${formatDate(loyalty.due)}.`}
                actions={<>
                  <Button level="tertiary" startIcon="icon-share-01-line" onClick={() => setDialog("share")}>Share</Button>
                  <Menu align="end" trigger={<IconButton icon="icon-dots-horizontal-line" aria-label="More actions" />} items={[
                    { id: "duplicate", label: "Duplicate project", icon: "icon-copy-line", onSelect: () => toast({ title: "Project duplicated", children: `${loyalty.name} (copy) is in Projects, without its tasks' history.` }) },
                    { id: "hold", label: "Put on hold", icon: "icon-pause-circle-line", disabled: status === "On hold", onSelect: putOnHold },
                  ]} />
                  <Button level="primary" startIcon="icon-plus-line" onClick={() => setDialog("task")}>New task</Button>
                </>}
              />
            )}
          />
        )}
      >
        {/* Sections of the page, xl apart: the project in three numbers (Shadow, the Sidebar's elevation), then its
            tasks. The task table is the section's content: it lies on the page under its h2, no Card. */}
        <Stack gap="xl">
          <Grid columns={3} gap="md" stackBelow={640}>
            <MetricCard theme="shadow" label="Progress" value={`${loyalty.progress}%`} icon="icon-check-done-line" trend={{ direction: "positive", label: "6%", subLabel: "this week" }} />
            <MetricCard theme="shadow" label="Budget spent" value={formatMoney(loyalty.spent)} icon="icon-wallet-02-line" trend={{ direction: "normal", label: formatMoney(loyalty.budget), subLabel: "budget" }} />
            <MetricCard theme="shadow" label="Open tasks" value={String(open)} icon="icon-check-square-line" trend={{ direction: "normal", label: String(rows.length - open), subLabel: "done" }} />
          </Grid>
          <Stack as="section" gap="md" aria-labelledby={tasksId}>
            <Heading level={2} id={tasksId} textStyle="Heading/4">Tasks</Heading>
            <Table aria-labelledby={tasksId} columns={phone ? phoneTaskColumns : taskColumns} rows={rows} />
          </Stack>
        </Stack>
      </AppShell>
      <ModalForm open={dialog === "share"} onOpenChange={changeShare} title={`Share ${loyalty.name}`}
        description="They can view the project and comment on tasks." onSubmit={share.handleSubmit}
        primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email" type="email" autoComplete="off" placeholder="name@phinco.vn" data-autofocus="" {...share.field("email")} />
      </ModalForm>
      <ModalForm open={dialog === "task"} onOpenChange={changeNewTask} title="New task" onSubmit={newTask.handleSubmit}
        primaryAction={{ label: "Create task" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Task name" type="text" autoComplete="off" placeholder="Design the rewards screen" data-autofocus="" {...newTask.field("name")} />
      </ModalForm>
    </>
  );
}
