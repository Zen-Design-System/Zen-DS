import { useId, useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, Badge, BadgeStatus, Breadcrumbs, Button, Card, DescriptionList, Grid, Heading,
  InputField, List, ListBox, ListItem, Menu, ModalForm, PageHeader, SidePanel, Sidebar, SidebarMenuItem, Stack, Text, Thumbnail,
  plural, useFormState, useToast, type SidebarItem, type SidebarSection,
} from "@zen-ds/react";
import { activity, daysFromToday, formatDate, formatDue, initials, me, people, priorityTheme, projectById, studio, taskStep, tasks, type Person, type Task } from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. The text beside it already names them. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };

/* Đìzai Studio's navigation: the same Sidebar on every page, its current page selected. */
const studioNav: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "clients", label: "Clients", icon: "icon-briefcase-line" },
    { id: "people", label: "People", icon: "icon-users-line" },
  ] },
  { label: "Finance", items: [
    { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
    { id: "expenses", label: "Expenses", icon: "icon-wallet-02-line" },
  ] },
];
const here = "projects";
const unreadActivity = activity.filter((item) => item.unread);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Milestone = { id: string; name: string; done: number; total: number; date: Date; finished?: boolean };
const milestones: Milestone[] = [
  { id: "discovery", name: "Discovery and research", done: 8, total: 8, date: daysFromToday(-40), finished: true },
  { id: "rewards", name: "Points and rewards", done: 6, total: 9, date: daysFromToday(9) },
  { id: "android", name: "Android launch", done: 1, total: 7, date: daysFromToday(33) },
];
const loyaltyTasks = tasks.filter((task) => task.project === "phin-loyalty" && task.status !== "Done");
const loyalty = projectById("phin-loyalty");

export default function ProjectPage() {
  const { toast } = useToast();
  const [unread, setUnread] = useState(unreadActivity.length);
  const [open, setOpen] = useState<Task[]>(loyaltyTasks);
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const baseId = useId();
  const opened = open.find((task) => task.id === openId);
  const first = unreadActivity[0];
  /** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows text and headings." });
  const addTask = (title: string) => setOpen((list) => [...list, {
    id: `new-${list.length}`, key: `PHIN-${230 + list.length}`, title, project: "phin-loyalty", assignee: "alex", status: "To do", priority: "Medium", due: daysFromToday(7), comments: 0,
  }]);

  // New task and Share each ask for one value: checked on submit, then the dialog closes and a toast confirms it.
  const newTask = useFormState<{ name: string }>({
    initialValues: { name: "" },
    validate: ({ name }) => ({ name: name.trim() ? undefined : "Enter a task name" }),
    onSubmit: ({ name }, { reset }) => {
      addTask(name.trim());
      setCreating(false);
      reset();
      toast({ type: "positive", title: "Task created" });
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
      toast({ type: "positive", title: `Project shared with ${email.trim()}` });
    },
  });

  return (
    // One page of the studio's app: AppShell Layout=Sidebar, the trail and the utilities in the header's top row and the
    // page's PageHeader, its one h1, as the Main row. The Body pads the page margins itself.
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
          sections={studioNav} selectedId={here} onItemClick={(item: SidebarItem) => { if (item.id !== here) notHere(item.label); }}
          footer={<>
            <SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />
            <SidebarMenuItem id="help" label="Help" icon="icon-help-circle-line" />
          </>} />
      )}
      header={(
        <AppShellHeader
          leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: loyalty.id, label: loyalty.name }]}
            onNavigate={(item, event) => { event.preventDefault(); notHere(String(item.label)); }} />}
          actions={<>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => {
              toast(unread
                ? { title: plural(unread, "new notification"), children: `${people[first.actor].name} ${first.verb} “${first.object}”.` }
                : { title: "No new notifications", children: "You’re all caught up." });
              setUnread(0);
            }} />
            <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
              { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
              { type: "separator" },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: `See you soon, ${me.name.split(" ")[0]}.` }) },
            ]} />
          </>}
          // The page title: PageHeader renders the screen's one h1 in Heading/1, in the header's Main row.
          main={<PageHeader title={loyalty.name} description={`${loyalty.client} · Led by ${people[loyalty.lead].name} · Due ${formatDate(loyalty.due)}`}
            actions={<>
              <Button level="tertiary" startIcon="icon-share-01-line" onClick={() => setSharing(true)}>Share</Button>
              <Button level="primary" startIcon="icon-plus-line" onClick={() => setCreating(true)}>New task</Button>
            </>} />}
        />
      )}
    >
      {/* Sections of the page, xl apart: each an h2 in Heading/4. Beside the Sidebar every box takes its elevation (Shadow). */}
      <Stack gap="xl">
        <Stack as="section" gap="md" aria-labelledby={`${baseId}-milestones`}>
          <Heading level={2} id={`${baseId}-milestones`} textStyle="Heading/4">Milestones</Heading>
          <Grid columns={{ mobile: 1, desktop: 3 }} gap="md">
            {milestones.map((milestone) => (
              <Card key={milestone.id} as="section" theme="shadow" aria-labelledby={`${baseId}-${milestone.id}`}>
                {/* Card titles sit one level below the section (h3) and are always Heading/Subheading; the lines under
                    them step down in tone, not in size. */}
                <Stack gap="xs">
                  <Heading level={3} id={`${baseId}-${milestone.id}`} textStyle="Heading/Subheading">{milestone.name}</Heading>
                  <Text textStyle="Body/Small/Regular" tone="base">{`${milestone.done} of ${plural(milestone.total, "task")} done`}</Text>
                  <Text textStyle="Caption/Regular" tone="light">{`${milestone.finished ? "Finished" : "Due"} ${formatDate(milestone.date)}`}</Text>
                </Stack>
              </Card>
            ))}
          </Grid>
        </Stack>
        <Grid columns="minmax(0, 2fr) minmax(0, 1fr)" stackBelow={880} gap="xl" align="start">
          <Stack as="section" gap="md" aria-labelledby={`${baseId}-tasks`}>
            <Heading level={2} id={`${baseId}-tasks`} textStyle="Heading/4">Open tasks</Heading>
            <ListBox theme="shadow">
              <List aria-labelledby={`${baseId}-tasks`}>
                {open.map((task) => (
                  // No leading visual: the title keeps the room to wrap beside the status, even on a narrow screen. The
                  // whole row opens the task.
                  <ListItem key={task.id} title={task.title} titleLines={2} caption={`${task.key} · ${people[task.assignee].name} · ${formatDue(task.due)}`}
                    trailing={<BadgeStatus status={taskStep[task.status]}>{task.status}</BadgeStatus>} onClick={() => setOpenId(task.id)} />
                ))}
              </List>
            </ListBox>
          </Stack>
          <Stack as="section" gap="md" aria-labelledby={`${baseId}-team`}>
            <Heading level={2} id={`${baseId}-team`} textStyle="Heading/4">Team</Heading>
            <ListBox theme="shadow">
              <List aria-labelledby={`${baseId}-team`}>
                {loyalty.members.map((id) => (
                  <ListItem key={id} title={people[id].name} caption={id === loyalty.lead ? `${people[id].role} · Project lead` : people[id].role}
                    leading={<Avatar size="md" {...avatarOf(people[id])} />}
                    onClick={() => toast({ title: people[id].name, children: `${people[id].role} · ${people[id].email}` })} />
                ))}
              </List>
            </ListBox>
          </Stack>
        </Grid>
      </Stack>
      <SidePanel type="modal" size="small" open={Boolean(opened)} onOpenChange={(next) => { if (!next) setOpenId(null); }}
        title={opened?.title ?? ""} description={opened ? `${opened.key} · ${loyalty.name}` : undefined}>
        {opened ? (
          <DescriptionList divider items={[
            { id: "status", term: "Status", description: <BadgeStatus status={taskStep[opened.status]}>{opened.status}</BadgeStatus> },
            { id: "assignee", term: "Assignee", description: people[opened.assignee].name },
            { id: "priority", term: "Priority", description: <Badge theme={priorityTheme[opened.priority]} background="subtle">{opened.priority}</Badge> },
            { id: "due", term: "Due", description: formatDate(opened.due) },
          ]} />
        ) : null}
      </SidePanel>
      <ModalForm open={creating} onOpenChange={(next) => { setCreating(next); if (!next) newTask.reset(); }} title="New task" description="It goes to the Loyalty app, assigned to you."
        onSubmit={newTask.handleSubmit} primaryAction={{ label: "Create task" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Task name" autoComplete="off" placeholder="Review the reward animations" data-autofocus="" {...newTask.field("name")} />
      </ModalForm>
      <ModalForm open={sharing} onOpenChange={(next) => { setSharing(next); if (!next) share.reset(); }} title="Share Loyalty app" description="They can view the project and its open tasks."
        onSubmit={share.handleSubmit} primaryAction={{ label: "Share project" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email" type="email" autoComplete="off" placeholder="name@phinco.vn" data-autofocus="" {...share.field("email")} />
      </ModalForm>
    </AppShell>
  );
}
