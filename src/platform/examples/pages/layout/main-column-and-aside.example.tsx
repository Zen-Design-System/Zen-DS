import { useId, useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, BadgeStatus, Breadcrumbs, Button, Card, Chip, DescriptionList, EmptyState, Grid, Heading,
  InputField, List, ListBox, ListItem, Menu, ModalForm, PageHeader, Sidebar, SidebarMenuItem, Stack, Table, TableMedia, TableText, Text, Thumbnail, plural,
  useFormState, useToast, useZen, type SidebarSection, type TableColumn,
} from "@zen-ds/react";
import {
  activity, daysFromToday, formatDate, formatMoney, formatRelative, initials, me, people, projectById, projectProgress, projectStep, studio, taskStep, tasks,
  type Person, type PersonId, type TaskStatus,
} from "../../data";

/** Photo when the person has one, else initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const statusBadge = (status: TaskStatus) => <BadgeStatus status={taskStep[status]}>{status}</BadgeStatus>;
const taskStatuses: TaskStatus[] = ["To do", "In progress", "In review", "Done"];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** An email field's error: empty, or not an address. */
const checkEmail = (email: string) => {
  const text = email.trim();
  if (!text) return "Enter an email address";
  return emailPattern.test(text) ? undefined : "Enter a valid email address, like name@company.com";
};

// "Main column and aside" is a page of the Đìzai Studio app: one AppShell (pattern sidebar) with the studio's Sidebar,
// the header's top row (the trail, notifications, the account) and the page's PageHeader in its Main row. The Body pads
// the page (Margin-Comfortable), so the layout starts at the page margin without a Container.
const myOpenTasks = tasks.filter((task) => task.assignee === me.id && task.status !== "Done").length;
const studioPlaces: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "projects", label: "Projects", icon: "icon-folder-line" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", counter: myOpenTasks },
  { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
  { id: "people", label: "People", icon: "icon-users-line" },
] }];
const unreadActivity = activity.filter((item) => item.unread);

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

const lumen = projectById("lumen-banking");
type ProjectTask = { id: string; key: string; title: string; assignee: PersonId; status: TaskStatus; due: Date };
const lumenTasks: ProjectTask[] = [
  { id: "t5", key: "LUM-091", title: "Audit the account overview for WCAG 2.2", assignee: "alex", status: "To do", due: daysFromToday(0) },
  { id: "t4", key: "LUM-088", title: "Run five usability sessions on transfers", assignee: "ava", status: "In progress", due: daysFromToday(3) },
  { id: "l96", key: "LUM-096", title: "Design the transfer limits screen", assignee: "alex", status: "In review", due: daysFromToday(4) },
  { id: "l99", key: "LUM-099", title: "Build the account overview API", assignee: "khoa", status: "In progress", due: daysFromToday(6) },
  { id: "l97", key: "LUM-097", title: "Map the card controls flow", assignee: "ava", status: "To do", due: daysFromToday(8) },
  { id: "l101", key: "LUM-101", title: "Write the release notes for phase 1", assignee: "hana", status: "To do", due: daysFromToday(12) },
  { id: "t6", key: "LUM-095", title: "Spike: passkey sign-in on iOS", assignee: "finn", status: "Done", due: daysFromToday(-2) },
];
type TeamRow = { id: string; title: string; caption: string; person?: Person };
const lumenTeam: TeamRow[] = lumen.members.map((id) => ({ id, title: people[id].name, caption: id === lumen.lead ? `${people[id].role} · Project lead` : people[id].role, person: people[id] }));

// narrowTasks: the Tasks card is too narrow for the table's columns (under 560 inside), so it lists title and status.
// Leave it out in your app: below the desktop breakpoint it is. The docs measure the card, narrower than the window.
export default function ProjectOverview({ narrowTasks }: { narrowTasks?: boolean }) {
  const { toast } = useToast();
  const breakpoint = useZen()?.breakpoint;
  const [rows, setRows] = useState(lumenTasks);
  const [team, setTeam] = useState(lumenTeam);
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [dialog, setDialog] = useState<"share" | "task" | "invite" | null>(null);
  const tasksId = useId();
  const teamId = useId();
  const detailsId = useId();
  /** A place this example does not draw: the toast says so, and the Sidebar keeps the current page. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the layout." });
  const shown = rows.filter((task) => !status || task.status === status);
  // A phone-width card lists the tasks (title and status) instead of a table: two table columns inside the card's
  // padding left the titles four lines tall. The assignee and due date wait for a wider page.
  const narrow = narrowTasks ?? (breakpoint === "tablet" || breakpoint === "mobile");
  const columns: TableColumn<ProjectTask>[] = [
    // The column that names the row is bold, as TableMedia is by default.
    { id: "task", header: "Task", cell: (task) => <TableText bold>{task.title}</TableText> },
    { id: "assignee", header: "Assignee", width: "176px", cell: (task) => <TableMedia bold={false} media={<Avatar size="xsmall" {...avatarOf(people[task.assignee])} />}>{people[task.assignee].name}</TableMedia> },
    { id: "status", header: "Status", width: "144px", cell: (task) => statusBadge(task.status) },
    { id: "due", header: "Due", width: "136px", cell: (task) => <TableText>{formatDate(task.due)}</TableText> },
  ];
  const tasksEmpty = <EmptyState headingLevel={3} size="sm" icon="icon-search-medium-line" title="No tasks match" secondaryAction={{ label: "Clear filter", onClick: () => setStatus(null) }}>Try another status.</EmptyState>;

  // Share, New task and Invite each open a dialog with one field: submitting checks it, closes, and a toast confirms;
  // Cancel, Escape and the scrim close it and clear what was typed.
  const share = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email }) => ({ email: checkEmail(email) }),
    onSubmit: ({ email }, { reset }) => {
      setDialog(null);
      reset();
      toast({ type: "positive", title: `Project shared with ${email.trim()}` });
    },
  });
  const newTask = useFormState<{ name: string }>({
    initialValues: { name: "" },
    validate: ({ name }) => ({ name: name.trim() ? undefined : "Enter a task name" }),
    onSubmit: ({ name }, { reset }) => {
      const title = name.trim();
      setRows((list) => [{ id: `new-${list.length}`, key: `LUM-${102 + list.length - lumenTasks.length}`, title, assignee: "alex", status: "To do", due: daysFromToday(7) }, ...list]);
      setDialog(null);
      reset();
      toast({ type: "positive", title: "Task created" });
    },
  });
  const invite = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email }) => ({ email: checkEmail(email) }),
    onSubmit: ({ email }, { reset }) => {
      const text = email.trim();
      setTeam((list) => [...list, { id: text, title: text, caption: "Invited just now" }]);
      setDialog(null);
      reset();
      toast({ type: "positive", title: `Invite sent to ${text}` });
    },
  });

  return (
    <>
      <AppShell
        sidebar={(
          <Sidebar
            logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
            logoCollapsed={<Thumbnail src={studio.logo} alt={studio.name} size="2xs" />}
            sections={studioPlaces} selectedId="projects" onItemClick={(item) => { if (item.id !== "projects") notHere(item.label); }}
            footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
        )}
        header={(
          <AppShellHeader
            // The trail starts at a Sub level beside the collapse toggle (no Master crumb next to it).
            leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: lumen.id, label: lumen.name }]}
              onNavigate={(_, event) => { event.preventDefault(); notHere("Projects"); }} />}
            actions={<StudioActions />}
            main={(
              <PageHeader title={lumen.name}
                meta={<BadgeStatus status={projectStep[lumen.status]} progress={projectProgress(lumen)}>{lumen.status}</BadgeStatus>}
                description={`${lumen.client} · ${lumen.progress}% done · Due ${formatDate(lumen.due)}`}
                actions={<><Button level="tertiary" onClick={() => setDialog("share")}>Share</Button><Button level="primary" onClick={() => setDialog("task")}>New task</Button></>} />
            )}
          />
        )}
      >
        {/* The Body pads the page, so the Grid starts at the page margin under the header. Main two-thirds, aside
            one-third, lg apart; in a narrow window the aside moves under the main column. The two columns stop at xl
            (1440px), so the 1/3 aside does not keep growing on a wide screen. */}
        <Grid columns={{ mobile: 1, desktop: "minmax(0, 2fr) minmax(0, 1fr)" }} gap="lg" align="start" maxWidth={1440}>
          {/* Every widget of the two columns is the same card at the Sidebar's elevation (Shadow/Bottom/Level-1, no
              border): their tops line up and their titles share one style. */}
          <Card as="section" theme="shadow" aria-labelledby={tasksId}>
            <Stack gap="md">
              <Stack direction="row" gap="xs" align="center" justify="between" wrap>
                <Heading level={2} id={tasksId} textStyle="Heading/Subheading">Tasks</Heading>
                <Chip variant="advanced" dropdown selected={status !== null} popoverLabel="Status"
                  popoverItems={taskStatuses.map((option) => ({ id: option, label: option, selected: option === status }))}
                  onPopoverSelect={(item) => setStatus(item.id === status ? null : (item.id as TaskStatus))}
                  onClearSelection={() => setStatus(null)}>
                  {status ?? "Status"}
                </Chip>
              </Stack>
              {narrow ? (
                shown.length ? (
                  <List aria-labelledby={tasksId}>
                    {shown.map((task) => <ListItem key={task.id} title={task.title} titleLines={2} trailing={statusBadge(task.status)} />)}
                  </List>
                ) : tasksEmpty
              ) : <Table aria-labelledby={tasksId} rows={shown} columns={columns} empty={tasksEmpty} />}
            </Stack>
          </Card>
          <Stack as="aside" gap="md" aria-label="About this project">
            {/* Rows → a ListBox (title and Invite in its header); Details is not rows → a Card. */}
            <ListBox as="section" theme="shadow" aria-labelledby={teamId}
              header={<Stack direction="row" gap="xs" align="center" justify="between">
                <Heading level={2} id={teamId} textStyle="Heading/Subheading">Team</Heading>
                <Button level="tertiary" startIcon="icon-user-plus-line" onClick={() => setDialog("invite")}>Invite</Button>
              </Stack>}>
              <List aria-labelledby={teamId}>
                {team.map((member) => (
                  <ListItem key={member.id} title={member.title} caption={member.caption}
                    leading={member.person ? <Avatar size="md" {...avatarOf(member.person)} /> : <Avatar size="md" theme="neutral" background="subtle" alt="">{member.title.slice(0, 2).toUpperCase()}</Avatar>} />
                ))}
              </List>
            </ListBox>
            <Card as="section" theme="shadow" aria-labelledby={detailsId}>
              <Stack gap="md">
                <Heading level={2} id={detailsId} textStyle="Heading/Subheading">Details</Heading>
                <DescriptionList items={[
                  { term: "Client", description: lumen.client },
                  { term: "Lead", description: people[lumen.lead].name },
                  { term: "Started", description: formatDate(lumen.start) },
                  { term: "Budget", description: formatMoney(lumen.budget) },
                  { term: "Spent", description: formatMoney(lumen.spent) },
                ]} divider />
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </AppShell>
      <ModalForm open={dialog === "share"} onOpenChange={(open) => { setDialog(open ? "share" : null); if (!open) share.reset(); }} title={`Share ${lumen.name}`} onSubmit={share.handleSubmit}
        primaryAction={{ label: "Share project" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email address" type="email" autoComplete="off" placeholder="name@lumenbank.com" data-autofocus="" {...share.field("email")} />
      </ModalForm>
      <ModalForm open={dialog === "task"} onOpenChange={(open) => { setDialog(open ? "task" : null); if (!open) newTask.reset(); }} title="New task" onSubmit={newTask.handleSubmit}
        primaryAction={{ label: "Create task" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Task name" type="text" autoComplete="off" placeholder="Review the savings goals flow" data-autofocus="" {...newTask.field("name")} />
      </ModalForm>
      <ModalForm open={dialog === "invite"} onOpenChange={(open) => { setDialog(open ? "invite" : null); if (!open) invite.reset(); }} title="Invite to the team" onSubmit={invite.handleSubmit}
        primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email address" type="email" autoComplete="off" placeholder="name@dizai.studio" data-autofocus="" {...invite.field("email")} />
      </ModalForm>
    </>
  );
}
