import { useId, useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, AvatarStack, BadgeStatus, Breadcrumbs, Button, Card, DescriptionList, FileIcon, Grid,
  Heading, InputField, List, ListBox, ListItem, Menu, MetricCard, ModalForm, PageHeader, Sidebar, SidebarMenuItem, SkeletonShape, SkeletonText, Stack,
  TabPanel, Table, TableMedia, TableText, Tabs, Text, Thumbnail, fileIconFormatOf, plural, useFormState, useToast,
  type SidebarItem, type TableColumn,
} from "@zen-ds/react";
import {
  daysFromToday, files, formatBytes, formatDate, formatDue, formatMoney, formatRange, formatRelative, initials, me, people, projectById, projectProgress,
  projectStep, studio, tasks, taskStep, type Person, type PersonId, type StudioFile, type Task,
} from "../../data";

/** A person as an Avatar: their photo, or initials on their steady theme. */
const avatar = (p: Person, size: "xsmall" | "medium" = "medium") => p.photo
  ? <Avatar size={size} theme="photo" src={p.photo} alt="" />
  : <Avatar size={size} theme={p.theme} alt="">{initials(p.name)}</Avatar>;

const lumen = projectById("lumen-banking");
const lumenFiles: StudioFile[] = [
  { id: "lf1", name: "Lumen Bank SOW v3.pdf", bytes: 412_000, owner: "hana", project: lumen.id, updated: daysFromToday(0, 9, 12) },
  files.find((f) => f.id === "f2")!,
  { id: "lf2", name: "Transfers journey map.fig", bytes: 24_600_000, owner: "alex", project: lumen.id, updated: daysFromToday(-3, 15, 10) },
];
const lumenActivity = [
  { id: "la1", actor: "hana" as PersonId, text: "Shared Lumen Bank SOW v3", at: daysFromToday(0, 9, 12) },
  { id: "la2", actor: "ava" as PersonId, text: "Uploaded Usability plan – transfers.pdf", at: daysFromToday(-1, 16, 5) },
  { id: "la3", actor: "finn" as PersonId, text: "Moved Spike: passkey sign-in on iOS to Done", at: daysFromToday(-2, 11, 40) },
  { id: "la4", actor: "alex" as PersonId, text: "Created Audit the account overview for WCAG 2.2", at: daysFromToday(-6, 14, 0) },
];
const taskColumns: TableColumn<Task>[] = [
  { id: "task", header: "Task", cell: (t) => <TableText bold caption={t.key}>{t.title}</TableText> },
  { id: "assignee", header: "Assignee", width: "180px", cell: (t) => <TableMedia bold={false} media={avatar(people[t.assignee], "xsmall")}>{people[t.assignee].name}</TableMedia> },
  { id: "status", header: "Status", width: "140px", cell: (t) => <BadgeStatus status={taskStep[t.status]}>{t.status}</BadgeStatus> },
  { id: "due", header: "Due", width: "140px", cell: (t) => <TableText>{formatDate(t.due)}</TableText> },
];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ProjectSections() {
  // One idPrefix per rendered example, so tab and panel ids stay unique when the page shows it twice.
  const prefix = `project-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const { toast } = useToast();
  /** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the tabs." });
  const [unread, setUnread] = useState(2);
  const [tab, setTab] = useState("overview");
  const [taskList, setTaskList] = useState(() => tasks.filter((t) => t.project === lumen.id));
  const [dialog, setDialog] = useState<"share" | "task" | null>(null);
  // Activity loads the first time its tab opens; the panel shows a skeleton meanwhile.
  const [activityLoaded, setActivityLoaded] = useState(false);
  const select = (next: string) => {
    setTab(next);
    if (next === "activity" && !activityLoaded) setTimeout(() => setActivityLoaded(true), 900);
  };

  const open = taskList.filter((t) => t.status !== "Done").length;
  const addTask = (title: string) => {
    setTaskList((list) => [...list, { id: `new-${list.length}`, key: `LUM-${96 + list.length}`, title, project: lumen.id, assignee: "alex", status: "To do", priority: "Medium", due: daysFromToday(7), comments: 0 }]);
    setTab("tasks");
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
  // New task: one name field; the task joins the Tasks tab, which opens, and a toast confirms it.
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
  // Cancel, Escape and the scrim close a dialog and clear what was typed.
  const changeShare = (next: boolean) => { setDialog(next ? "share" : null); if (!next) share.reset(); };
  const changeNewTask = (next: boolean) => { setDialog(next ? "task" : null); if (!next) newTask.reset(); };

  const tabs = (
    <Tabs idPrefix={prefix} aria-label="Project sections" value={tab} onValueChange={select} items={[
      { id: "overview", label: "Overview", icon: "icon-layout-grid-01-line" },
      // Counts only while there is something to count: a badge of 0 is hidden.
      { id: "tasks", label: "Tasks", icon: "icon-check-square-line", badge: open || undefined },
      { id: "files", label: "Files", icon: "icon-folder-line", badge: lumenFiles.length },
      { id: "activity", label: "Activity", icon: "icon-activity-line" },
    ]} />
  );

  return (
    <>
      {/* The project page of the studio app: the trail and the utilities in the header's top row, the PageHeader in its
          Main row and the section tabs in its Sections row, so they stay with the title while the panel scrolls. */}
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
            selectedId="projects" onItemClick={(item: SidebarItem) => { if (item.id !== "projects") notHere(item.label); }}
            sections={[{ items: [
              { id: "home", label: "Home", icon: "icon-home-03-line" },
              { id: "projects", label: "Projects", icon: "icon-folder-line" },
              { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
              { id: "people", label: "People", icon: "icon-users-line" },
            ] }]}
            footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
        )}
        header={(
          <AppShellHeader
            leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: lumen.id, label: lumen.name }]}
              onNavigate={(_, event) => { event.preventDefault(); notHere("Projects"); }} />}
            actions={<>
              <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => {
                setUnread(0);
                toast({ title: unread ? `${plural(unread, "new update")} on ${lumen.name}` : "You're all caught up", children: `${people[lumenActivity[0].actor].name}: ${lumenActivity[0].text}` });
              }} />
              {/* The account menu, last in the top row. */}
              <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
                { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.location}` }) },
                { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
              ]} />
            </>}
            main={(
              <PageHeader
                eyebrow={lumen.client}
                title={lumen.name}
                meta={<BadgeStatus status={projectStep[lumen.status]} progress={projectProgress(lumen)}>{lumen.status}</BadgeStatus>}
                description={`${formatRange(lumen.start, lumen.due)} · Led by ${people[lumen.lead].name}`}
                actions={<><Button level="tertiary" onClick={() => setDialog("share")}>Share</Button><Button level="primary" onClick={() => setDialog("task")}>New task</Button></>}
              />
            )}
            sections={tabs}
          />
        )}
      >
        <TabPanel idPrefix={prefix} id="overview" hidden={tab !== "overview"}>
          <Stack gap="md">
            {/* As many 200px columns as fit, stretched to fill the row. Beside the default Sidebar every Surface takes its
                elevation: Shadow/Bottom/Level-1, no border (usage rules §16). */}
            <Grid columns="repeat(auto-fit, minmax(min(100%, 200px), 1fr))" gap="md">
              <MetricCard label="Progress" value={`${lumen.progress}%`} icon="icon-target-04-line" iconTheme="blue" theme="shadow" />
              <MetricCard label="Budget used" value={formatMoney(lumen.spent)} icon="icon-coins-line" iconTheme="green" theme="shadow" />
              <MetricCard label="Open tasks" value={`${open}`} icon="icon-check-square-line" iconTheme="orange" theme="shadow" />
            </Grid>
            {/* The project's facts beside its latest files: side content stops at xl (1440px) on a full-width page. */}
            <Grid columns="minmax(0, 1fr) minmax(0, 1fr)" stackBelow={720} gap="md" align="start" maxWidth={1440}>
              <Card theme="shadow" as="section" aria-labelledby={`${prefix}-facts`}>
                <Stack gap="md">
                  <Heading level={2} id={`${prefix}-facts`} textStyle="Heading/Subheading">Details</Heading>
                  <DescriptionList items={[
                    { term: "Account director", description: people.hana.name },
                    { term: "Budget", description: formatMoney(lumen.budget) },
                    { term: "Team", description: <AvatarStack size="xsmall" items={lumen.members.map((id) => people[id].photo ? { src: people[id].photo, alt: people[id].name } : { theme: people[id].theme, alt: people[id].name, children: initials(people[id].name) })} /> },
                    { term: "Due", description: formatDate(lumen.due) },
                  ]} />
                </Stack>
              </Card>
              <ListBox theme="shadow" as="section" aria-labelledby={`${prefix}-next`}
                header={<Heading level={2} id={`${prefix}-next`} textStyle="Heading/Subheading">Due next</Heading>}>
                <List aria-labelledby={`${prefix}-next`}>
                  {taskList.filter((t) => t.status !== "Done").sort((a, b) => a.due.getTime() - b.due.getTime()).slice(0, 3).map((t) => (
                    <ListItem key={t.id} title={t.title} titleLines={2} caption={`${t.key} · ${formatDue(t.due)}`} leading={avatar(people[t.assignee])}
                      onClick={() => setTab("tasks")} />
                  ))}
                </List>
              </ListBox>
            </Grid>
          </Stack>
        </TabPanel>

        {/* The task table is the section's content, so it lies on the page (no Card). */}
        <TabPanel idPrefix={prefix} id="tasks" hidden={tab !== "tasks"}>
          <Table aria-label="Tasks" rows={taskList} columns={taskColumns} />
        </TabPanel>

        {/* The file and activity rows sit in a ListBox: a box made only of List-Items, at the Sidebar's elevation. */}
        <TabPanel idPrefix={prefix} id="files" hidden={tab !== "files"}>
          <ListBox theme="shadow">
            <List aria-label="Files">
              {lumenFiles.map((f) => (
                <ListItem key={f.id} title={f.name} caption={`${formatBytes(f.bytes)} · ${people[f.owner].name} · ${formatRelative(f.updated)}`}
                  leading={<FileIcon format={fileIconFormatOf(f.name)} size="xl" />}
                  onClick={() => toast({ title: `Opening ${f.name}`, children: `${formatBytes(f.bytes)} · ${people[f.owner].name}` })} />
              ))}
            </List>
          </ListBox>
        </TabPanel>

        <TabPanel idPrefix={prefix} id="activity" hidden={tab !== "activity"}>
          <ListBox theme="shadow">
            {activityLoaded ? (
              <List aria-label="Activity">
                {lumenActivity.map((a) => <ListItem key={a.id} title={people[a.actor].name} caption={`${a.text} · ${formatRelative(a.at)}`} leading={avatar(people[a.actor])} />)}
              </List>
            ) : (
              // Placeholder rows are List-Items too (same padding, Avatar Medium, row gap), so nothing jumps on load.
              <List aria-busy="true" aria-label="Loading activity">
                {[0, 1, 2].map((row) => (
                  <ListItem key={row} aria-hidden="true" title="" leading={<SkeletonShape shape="round" size="md" />}>
                    <SkeletonText lines={2} />
                  </ListItem>
                ))}
              </List>
            )}
          </ListBox>
        </TabPanel>
      </AppShell>

      <ModalForm open={dialog === "share"} onOpenChange={changeShare} title={`Share ${lumen.name}`} onSubmit={share.handleSubmit}
        primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email address" type="email" autoComplete="off" placeholder="thu@lumenbank.com" data-autofocus="" {...share.field("email")} />
      </ModalForm>
      <ModalForm open={dialog === "task"} onOpenChange={changeNewTask} title="New task" onSubmit={newTask.handleSubmit}
        primaryAction={{ label: "Add task" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Task name" type="text" autoComplete="off" placeholder="Review the transfer limits copy" data-autofocus="" {...newTask.field("name")} />
      </ModalForm>
    </>
  );
}
