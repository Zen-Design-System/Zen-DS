import { Fragment, useId, useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, Badge, BadgeStatus, Button, DockIcon, Grid, Heading, InputField, List, ListBox, ListItem,
  Menu, MetricCard, ModalForm, PageHeader, Sidebar, SidebarMenuItem, Stack, Text, Thumbnail, plural, useFormState, useToast, useZen, type BadgeTheme, type SidebarSection,
} from "@zen-ds/react";
import {
  activity, daysFromToday, formatCompactMoney, formatDate, formatDue, formatMoney, formatRelative, initials, invoiceStatusTheme, invoices, me, people,
  projectProgress, projectStep, projects, studio, taskStep, tasks, type Person,
} from "../../data";

/** Photo when the person has one, else initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
/** A row caption of whole values: it wraps between values, never inside a key or a name; each "· " stays with the value it introduces, so no line ends on a dot. */
const wholeValues = (...values: (string | false)[]) => values.filter((value): value is string => Boolean(value)).map((value, index) => (
  <Fragment key={`${index}:${value}`}>{index ? " " : null}{whole(`${index ? "· " : ""}${value}`)}</Fragment>
));
/** A run of words that never breaks: its spaces are no-break spaces. */
const whole = (text: string) => text.replace(/ /g, " ");

// "Elevated panel" is the Đìzai Studio app: one AppShell (pattern sidebar) with the studio's Sidebar, the header's top
// row (notifications, the account) and each page's PageHeader in its Main row. The Body pads the page
// (Margin-Comfortable), so the layout starts at the page margin without a Container.
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

type ShellPage = "home" | "projects" | "invoices";
/** Each page's one Primary: what it creates, and what the toast says once it has. */
const shellPages: Record<ShellPage, { create: string; submit: string; field: string; placeholder: string; done: (name: string) => string }> = {
  home: { create: "New task", submit: "Create task", field: "Task name", placeholder: "Review the transfer limits copy", done: (name) => `Task created: ${name}` },
  projects: { create: "New project", submit: "Create project", field: "Project name", placeholder: "Saola trail guide", done: (name) => `${name} created` },
  invoices: { create: "New invoice", submit: "Create draft", field: "Client", placeholder: "Saola Outdoor", done: (name) => `Draft invoice created for ${name}` },
};
const dueThisWeek = tasks.filter((task) => task.status !== "Done" && task.due <= daysFromToday(7, 23, 59)).sort((a, b) => a.due.getTime() - b.due.getTime());
const outstanding = invoices.filter((invoice) => invoice.status === "Sent" || invoice.status === "Overdue").reduce((sum, invoice) => sum + invoice.amount, 0);
const clientCount = new Set(projects.map((project) => project.client)).size;

/** A block of rows at the Sidebar's elevation: a ListBox with theme="shadow" (Shadow/Bottom/Level-1, no border). */
function ElevatedList({ children, header, ...name }: { children: ReactNode; header?: ReactNode; "aria-label"?: string; "aria-labelledby"?: string }) {
  return (
    <ListBox theme="shadow" header={header}>
      <List {...name}>{children}</List>
    </ListBox>
  );
}

export default function ElevatedPanels() {
  const { toast } = useToast();
  const [page, setPage] = useState<ShellPage>("home");
  const [creating, setCreating] = useState(false);
  const dueId = useId();
  const activityId = useId();
  /** A place this example does not draw: the toast says so, and the Sidebar keeps the current page. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the layout." });
  // A phone keeps each row's title readable: the status leads the caption instead of squeezing it as a trailing Badge.
  const narrow = useZen()?.breakpoint === "mobile";
  const badge = (theme: BadgeTheme, status: string) => (narrow ? undefined : <Badge theme={theme} background="subtle">{status}</Badge>);
  const create = shellPages[page];
  // Each page's Primary asks for one name: submitting checks it, closes, and a toast confirms.
  const form = useFormState<{ name: string }>({
    initialValues: { name: "" },
    validate: ({ name }) => ({ name: name.trim() ? undefined : `Enter a ${create.field.toLowerCase()}` }),
    onSubmit: ({ name }, { reset }) => {
      setCreating(false);
      reset();
      toast({ type: "positive", title: create.done(name.trim()) });
    },
  });
  // Cancel, Escape and the scrim close the dialog and clear what was typed.
  const changeCreating = (open: boolean) => { setCreating(open); if (!open) form.reset(); };
  const primary = <Button level="primary" startIcon="icon-plus-line" onClick={() => setCreating(true)}>{create.create}</Button>;
  let header: ReactNode;
  let content: ReactNode;
  if (page === "projects") {
    header = <PageHeader title="Projects" description={`${plural(projects.length, "project")} for ${plural(clientCount, "client")}`} actions={primary} />;
    content = (
      <ElevatedList aria-label="Projects">
        {projects.map((project) => (
          <ListItem key={project.id} title={project.name} titleLines={2}
            caption={wholeValues(narrow && project.status, project.client, `${project.progress}% done`, `Due ${formatDate(project.due)}`)}
            leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />}
            trailing={narrow ? undefined : <BadgeStatus status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus>} />
        ))}
      </ElevatedList>
    );
  } else if (page === "invoices") {
    header = <PageHeader title="Invoices" description={`${formatMoney(outstanding)} outstanding`} actions={primary} />;
    content = (
      <ElevatedList aria-label="Invoices">
        {invoices.map((invoice) => (
          <ListItem key={invoice.id} title={invoice.number}
            caption={wholeValues(narrow && invoice.status, invoice.client, formatMoney(invoice.amount), invoice.status === "Paid" ? `Issued ${formatDate(invoice.issued)}` : `Due ${formatDate(invoice.due)}`)}
            leading={<DockIcon icon="icon-receipt-line" theme="neutral" background="subtle" size="md" />}
            trailing={badge(invoiceStatusTheme[invoice.status], invoice.status)} />
        ))}
      </ElevatedList>
    );
  } else {
    header = <PageHeader title="Home" description={`Good morning, ${me.name.split(" ")[0]}. ${plural(dueThisWeek.length, "task")} due this week.`} actions={primary} />;
    content = (
      <>
        {/* MetricCard theme="shadow" is the same elevation: Shadow/Bottom/Level-1 and no border. */}
        <Grid columns={{ mobile: 1, desktop: 3 }} gap="md">
          <MetricCard label="Due this week" value={String(dueThisWeek.length)} icon="icon-calendar-line" theme="shadow" />
          <MetricCard label="Active projects" value={String(projects.filter((project) => project.status === "Active").length)} icon="icon-folder-line" theme="shadow" />
          <MetricCard label="Outstanding" value={formatCompactMoney(outstanding)} icon="icon-coins-line" theme="shadow" />
        </Grid>
        {/* The week's work beside what changed since yesterday: two blocks of rows at the same elevation. */}
        <Grid columns="minmax(0, 2fr) minmax(0, 1fr)" stackBelow={880} gap="md" align="start">
          <ElevatedList aria-labelledby={dueId} header={<Heading level={2} id={dueId} textStyle="Heading/Subheading">Due this week</Heading>}>
            {dueThisWeek.map((task) => (
              <ListItem key={task.id} title={task.title} titleLines={2} caption={wholeValues(narrow && task.status, task.key, formatDue(task.due))}
                leading={<Avatar size="md" {...avatarOf(people[task.assignee])} />} trailing={narrow ? undefined : <BadgeStatus status={taskStep[task.status]}>{task.status}</BadgeStatus>} />
            ))}
          </ElevatedList>
          <ElevatedList aria-labelledby={activityId} header={<Heading level={2} id={activityId} textStyle="Heading/Subheading">Since yesterday</Heading>}>
            {activity.slice(0, 5).map((item) => (
              <ListItem key={item.id} title={people[item.actor].name} titleLines={1} caption={`${item.verb} ${item.object} · ${formatRelative(item.at)}`}
                leading={<Avatar size="md" {...avatarOf(people[item.actor])} />} />
            ))}
          </ElevatedList>
        </Grid>
      </>
    );
  }
  return (
    // A Canvas/Default page beside the default Sidebar (Surface + Shadow/Bottom/Level-1, no border): every Surface on the
    // screen takes the same elevation.
    <>
      <AppShell
        sidebar={(
          <Sidebar
            logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
            logoCollapsed={<Thumbnail src={studio.logo} alt={studio.name} size="2xs" />}
            sections={studioPlaces} selectedId={page} onItemClick={(item) => (item.id in shellPages ? setPage(item.id as ShellPage) : notHere(item.label))}
            footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
        )}
        header={<AppShellHeader actions={<StudioActions />} main={header} />}
      >
        {/* The Body pads the page (Margin-Comfortable); the page's blocks sit xl apart. */}
        <Stack gap="xl">{content}</Stack>
      </AppShell>
      <ModalForm open={creating} onOpenChange={changeCreating} title={create.create} onSubmit={form.handleSubmit}
        primaryAction={{ label: create.submit }} secondaryAction={{ label: "Cancel" }}>
        <InputField label={create.field} type="text" autoComplete="off" placeholder={create.placeholder} data-autofocus="" {...form.field("name")} />
      </ModalForm>
    </>
  );
}
