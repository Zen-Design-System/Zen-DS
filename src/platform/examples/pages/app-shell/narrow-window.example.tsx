import { useId, useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, Badge, BadgeStatus, Box, Breadcrumbs, Button, Card, DescriptionList,
  Dialog, DockIcon, Grid, Heading, InputField, List, ListBox, ListItem, Menu, MetricCard, ModalForm, PageHeader, Sidebar, Stack, Table, TableMedia,
  TableText, Tabs, Text, Thumbnail, plural, useFormState, useToast, useZen,
  type BadgeTheme, type SidebarSection, type TableColumn,
} from "@zen-ds/react";
import {
  activity, daysFromToday, formatCompactMoney, formatDate, formatDay, formatDue, formatMoney, formatRelative, initials, invoiceStatusTheme, invoices, me,
  people, projectProgress, projectStep, projects, studio, taskStep, tasks,
  type Invoice, type Person, type Project, type Task, type TaskStatus,
} from "../../data";

/** Photo when the person has one, else initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const badge = (label: string, theme: BadgeTheme) => <Badge theme={theme} background="subtle">{label}</Badge>;
const taskBadge = (status: TaskStatus) => <BadgeStatus status={taskStep[status]}>{status}</BadgeStatus>;
const projectBadge = (project: Project) => <BadgeStatus status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus>;
/** The caption follows the status: open work shows when it is due, finished work when it was done. */
const taskWhen = (task: Task) => (task.status === "Done" ? `Done ${formatDay(task.due)}` : formatDue(task.due));
/** A run of words that never breaks: its spaces are no-break spaces. */
const whole = (text: string) => text.replace(/ /g, " ");
/** Where a notification leads: the invoice list, the profile (leave), or the projects the task belongs to. */
const notificationTarget = (item: { verb: string; object: string }): "invoices" | "profile" | "projects" =>
  /^INV-/.test(item.object) ? "invoices" : /leave/.test(item.verb) ? "profile" : "projects";
const activityCaption = (item: { verb: string; object: string; at: Date }, leadNew = false) => (
  <>{leadNew ? "New · " : null}{`${item.verb[0].toUpperCase()}${item.verb.slice(1)} ${item.object}`}{" "}{whole(`· ${formatRelative(item.at)}`)}</>
);

/** Profile and Settings, the two pages the account menu opens: the page's own header is the AppShellHeader's Main row. */
function accountPage(id: "profile" | "settings") {
  return {
    main: id === "profile"
      ? <PageHeader title="Profile" description={`${me.role} · ${me.team} team`} />
      : <PageHeader title="Settings" description={`The ${studio.name} workspace`} />,
    body: (
      // A readable width keeps each term near its value.
      <Card theme="shadow" width="fill" maxWidth={440}>
        <DescriptionList items={id === "profile" ? [
          { term: "Name", description: me.name },
          { term: "Email", description: me.email },
          { term: "Office", description: me.location },
          { term: "Approves leave for", description: "Design team" },
        ] : [
          { term: "Workspace", description: studio.name },
          { term: "Domain", description: studio.domain },
          { term: "Plan", description: "Business · 48 seats" },
          { term: "Time zone", description: "Ho Chi Minh City (GMT+7)" },
        ]} />
      </Card>
    ),
  };
}

// ——— The studio app (Layout=Sidebar, Collapse=Header) ——————————————————————————————————————————————————————————
type Page = "home" | "projects" | "invoices" | "notifications" | "profile" | "settings";
const pageLabels: Record<Page, string> = { home: "Home", projects: "Projects", invoices: "Invoices", notifications: "Notifications", profile: "Profile", settings: "Settings" };
const dueThisWeek = tasks.filter((task) => task.status !== "Done" && task.due <= daysFromToday(7)).sort((a, b) => +a.due - +b.due);
const outstanding = invoices.filter((invoice) => invoice.status === "Sent" || invoice.status === "Overdue").reduce((sum, invoice) => sum + invoice.amount, 0);
const sections: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "projects", label: "Projects", icon: "icon-folder-line" },
  { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
] }];
type ProjectView = "all" | "active" | "planning";
const projectViews: Record<ProjectView, { label: string; filter: (project: Project) => boolean }> = {
  all: { label: "All", filter: () => true },
  active: { label: "Active", filter: (project) => project.status === "Active" },
  planning: { label: "Planning", filter: (project) => project.status === "Planning" },
};

export default function StudioInANarrowWindow() {
  const { toast } = useToast();
  const breakpoint = useZen()?.breakpoint;
  const [page, setPage] = useState<Page>("home");
  // Remember it per person in a real app (e.g. localStorage), so the rail stays the way they left it.
  const [collapsed, setCollapsed] = useState(false);
  const [unseen, setUnseen] = useState(3);
  const [read, setRead] = useState<string[]>([]);
  const [list, setList] = useState(projects);
  const [view, setView] = useState<ProjectView>("all");
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const go = (next: Page) => { setPage(next); if (next === "notifications") setUnseen(0); };
  // On a phone the tables keep two columns and fold the rest into the caption, and the rows drop their trailing badge.
  const narrow = breakpoint === "mobile";
  const compactRows = breakpoint === "mobile";
  const dueId = useId();
  const projectColumns: TableColumn<Project>[] = [
    { id: "project", header: "Project", cell: (row) => <TableMedia bold media={<DockIcon icon={row.icon} theme={row.theme} background="subtle" size="small" />} caption={row.client}>{row.name}</TableMedia> },
    { id: "status", header: "Status", width: narrow ? undefined : "128px", cell: (row) => projectBadge(row) },
    ...(narrow ? [] : [
      { id: "lead", header: "Lead", width: "168px", cell: (row: Project) => <TableMedia bold={false} media={<Avatar size="xsmall" {...avatarOf(people[row.lead])} />}>{people[row.lead].name}</TableMedia> },
      { id: "due", header: "Due", width: "152px", cell: (row: Project) => <TableText>{formatDate(row.due)}</TableText> },
    ]),
  ];
  const invoiceColumns: TableColumn<Invoice>[] = [
    { id: "invoice", header: "Invoice", cell: (row) => <TableText bold caption={narrow ? `${row.client} · ${formatMoney(row.amount, true)}` : row.client}>{row.number}</TableText> },
    { id: "status", header: "Status", width: narrow ? undefined : "128px", cell: (row) => badge(row.status, invoiceStatusTheme[row.status]) },
    ...(narrow ? [] : [
      { id: "due", header: "Due", width: "152px", cell: (row: Invoice) => <TableText>{formatDate(row.due)}</TableText> },
      { id: "amount", header: "Amount", align: "right" as const, width: "136px", cell: (row: Invoice) => <TableText>{formatMoney(row.amount, true)}</TableText> },
    ]),
  ];
  // New project: one name field; the project joins the list and a toast confirms it.
  const newProject = useFormState<{ name: string }>({
    initialValues: { name: "" },
    validate: ({ name }) => ({ name: name.trim() ? undefined : "Enter a project name" }),
    onSubmit: ({ name }, { reset }) => {
      const text = name.trim();
      setList((current) => [{ ...projects[5], id: `new-${current.length}`, name: text, client: studio.name, icon: "icon-cube-line", theme: "neutral", status: "Planning", lead: "alex", start: daysFromToday(0), due: daysFromToday(60) }, ...current]);
      setCreating(false);
      reset();
      toast({ type: "positive", title: `${text} created` });
    },
  });
  // Cancel, Escape and the scrim close the dialog and clear what was typed.
  const changeCreating = (next: boolean) => { setCreating(next); if (!next) newProject.reset(); };

  // Each page puts its own header (title, description, the page's Primary) in the header's Main row and its views in
  // Sections; the Body holds the content, already at the page margin.
  let main: ReactNode;
  let sectionsRow: ReactNode;
  let body: ReactNode;
  if (page === "profile" || page === "settings") ({ main, body } = accountPage(page));
  else if (page === "projects") {
    const shown = list.filter(projectViews[view].filter);
    main = <PageHeader title="Projects" description={plural(list.length, "project")} actions={<Button level="primary" onClick={() => setCreating(true)}>New project</Button>} />;
    sectionsRow = <Tabs aria-label="Project views" value={view} onValueChange={(id) => setView(id as ProjectView)}
      items={(Object.keys(projectViews) as ProjectView[]).map((id) => ({ id, label: projectViews[id].label, badge: list.filter(projectViews[id].filter).length }))} />;
    // A page's table lies on the Canvas: no Card.
    body = <Table aria-label={`${projectViews[view].label} projects`} rows={shown} columns={projectColumns} />;
  } else if (page === "invoices") {
    main = <PageHeader title="Invoices" description={`${formatMoney(outstanding)} outstanding`} />;
    body = <Table aria-label="Invoices" rows={invoices} columns={invoiceColumns} />;
  } else if (page === "notifications") {
    main = <PageHeader title="Notifications" description="Comments, reviews and approvals from the last week" />;
    body = (
      <ListBox theme="shadow">
        <List aria-label="Notifications">
          {activity.map((item) => {
            const unread = item.unread && !read.includes(item.id);
            return (
              <ListItem key={item.id} title={people[item.actor].name} caption={activityCaption(item, unread && compactRows)}
                leading={<Avatar size="md" {...avatarOf(people[item.actor])} />}
                trailing={unread && !compactRows ? badge("New", "accent") : undefined}
                onClick={() => { setRead((ids) => ids.includes(item.id) ? ids : [...ids, item.id]); go(notificationTarget(item)); }} />
            );
          })}
        </List>
      </ListBox>
    );
  } else {
    main = <PageHeader title="Home" description={`${plural(dueThisWeek.length, "task")} due this week across ${plural(new Set(dueThisWeek.map((task) => task.project)).size, "project")}`} />;
    body = (
      <Stack gap="xl">
        {/* Three peers share the neutral tile. */}
        <Grid columns={{ mobile: 2, desktop: 3 }} gap="md">
          <MetricCard variant="icon-highlight" label="Active projects" value={String(list.filter((project) => project.status === "Active").length)} icon="icon-folder-line" theme="shadow" />
          <MetricCard variant="icon-highlight" label="Due this week" value={String(dueThisWeek.length)} icon="icon-calendar-line" theme="shadow" />
          <MetricCard variant="icon-highlight" label="Outstanding" value={formatCompactMoney(outstanding)} icon="icon-coins-line" theme="shadow" />
        </Grid>
        <Stack as="section" gap="md" aria-labelledby={dueId}>
          <Heading level={2} id={dueId} textStyle="Heading/4">Due this week</Heading>
          <ListBox theme="shadow">
            <List aria-labelledby={dueId}>
              {dueThisWeek.map((task) => (
                <ListItem key={task.id} title={task.title} titleLines={2} caption={`${task.key} · ${taskWhen(task)}`}
                  leading={<Avatar size="md" {...avatarOf(people[task.assignee])} />} trailing={compactRows ? undefined : taskBadge(task.status)} />
              ))}
            </List>
          </ListBox>
        </Stack>
      </Stack>
    );
  }

  return (
    <>
      {signedOut ? (
        <Box surface="canvas" height="fill"><Stack align="center" justify="center" gap="md" padding="xl" height="fill">
          <Stack align="center" gap="xs">
            <Heading level={1} textStyle="Heading/1" align="center">You’re signed out</Heading>
            <Text tone="base" align="center">{`Sign in to get back to ${studio.name}.`}</Text>
          </Stack>
          <Button level="primary" onClick={() => setSignedOut(false)}>Sign in</Button>
        </Stack></Box>
      ) : (
        // Nothing here is about the width: layout="auto" (the default) follows the shell's own width, so under 1024px the
        // header puts a menu button where the toggle was and the Sidebar opens as a modal drawer.
        <AppShell
          sidebar={(
            <Sidebar sections={sections} selectedId={page} onItemClick={(item) => go(item.id as Page)}
              logo={(
                <Stack direction="row" gap="xs" align="center">
                  <Thumbnail src={studio.logo} alt="" size="2xs" />
                  <Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text>
                </Stack>
              )}
              logoCollapsed={<Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />} />
          )}
          sidebarCollapsed={collapsed}
          onSidebarCollapsedChange={setCollapsed}
          header={(
            <AppShellHeader
              // The top row: the collapse toggle, the trail (Home first, no Master icon beside the toggle)…
              leading={<Breadcrumbs master={false} items={page === "home" ? [{ id: "home", label: "Home" }] : [{ id: "home", label: "Home" }, { id: page, label: pageLabels[page] }]}
                onNavigate={(item, event) => { event.preventDefault(); go(item.id as Page); }} />}
              // …then utilities only: the plan (not on a phone), Notifications with its unread count, the account menu last.
              actions={<>
                {breakpoint === "mobile" ? null : <Badge theme="accent" background="subtle" leadingIcon={false}>Business</Badge>}
                <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unseen} onClick={() => go("notifications")} />
                <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
                  { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => go("profile") },
                  { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => go("settings") },
                  { type: "separator" },
                  { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => setConfirming(true) },
                ]} />
              </>}
              main={main}
              sections={sectionsRow}
            />
          )}
        >
          {body}
        </AppShell>
      )}
      <Dialog open={confirming} onOpenChange={setConfirming} title={`Sign out of ${studio.name}?`} icon={false}
        description="You'll need your studio email to sign in again."
        primaryAction={{ label: "Sign out", onClick: () => { setConfirming(false); setSignedOut(true); } }} secondaryAction={{ label: "Cancel" }} />
      <ModalForm open={creating} onOpenChange={changeCreating} title="New project" onSubmit={newProject.handleSubmit}
        primaryAction={{ label: "Create project" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Project name" type="text" autoComplete="off" placeholder="Saola trail guide" data-autofocus="" {...newProject.field("name")} />
      </ModalForm>
    </>
  );
}
