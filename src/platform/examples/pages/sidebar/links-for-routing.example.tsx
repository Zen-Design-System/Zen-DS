import { useId, useState, type AnchorHTMLAttributes, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, Badge, BadgeStatus, Breadcrumbs, Card, DescriptionList, DockIcon, EmptyState, FileIcon,
  Grid, Heading, Link, List, ListBox, ListItem, Menu, PageHeader, Sidebar, Stack, Text, Thumbnail, fileIconFormatOf, plural, useToast, useZen,
  type BadgeTheme, type BreadcrumbItemData, type IconName, type SidebarSection,
} from "@zen-ds/react";
import {
  activity, daysFromToday, files, formatBytes, formatDate, formatDay, formatDue, formatMoney, formatRelative, initials, invoiceStatusTheme, invoices, me,
  people, priorityTheme, projectProgress, projectStep, projects, studio, taskStep, tasks,
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
const fileRow = (f: StudioFile, open?: (f: StudioFile) => void): Row => ({ id: f.id, title: f.name, caption: `${formatBytes(f.bytes)} · ${people[f.owner].name} · ${formatRelative(f.updated)}`, leading: <FileIcon format={fileIconFormatOf(f.name)} size="xl" />, onClick: open ? () => open(f) : undefined });
const personRow = (p: Person): Row => ({ id: p.id, title: p.name, caption: `${p.role} · ${p.location}`, leading: personAvatar(p) });
const activityRow = (a: Activity, unread: boolean): Row => ({ id: a.id, title: people[a.actor].name, caption: `${a.verb[0].toUpperCase()}${a.verb.slice(1)} ${a.object} · ${formatRelative(a.at)}`, leading: personAvatar(people[a.actor]), trailing: unread ? <Badge theme="accent" background="subtle">New</Badge> : undefined });
const invoiceRow = (i: Invoice): Row => ({
  id: i.id, title: i.number, caption: `${i.client} · ${formatMoney(i.amount, true)} · Due ${formatDate(i.due)}`, leading: itemIcon("icon-receipt-line"),
  trailing: statusBadge(i.status, invoiceStatusTheme[i.status]),
});
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
/** What a page shows: its PageHeader (the header’s Main row), its trail (the top row) and its Body. */
type View = { title: string; description?: ReactNode; meta?: ReactNode; actions?: ReactNode; crumbs?: BreadcrumbItemData[]; body: ReactNode };
const pageHeader = ({ title, description, meta, actions }: View) => <PageHeader title={title} description={description} meta={meta} actions={actions} />;

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
function taskView(task: Task, back: BreadcrumbItemData[], project: Project | undefined): View {
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
const tasksOf = (projectId: string) => tasks.filter((t) => t.project === projectId);
const filesOf = (projectId: string) => files.filter((f) => f.project === projectId);

/** A project’s own page: its tasks (or, without any, its files or an empty state) beside its files and its team. */
function projectBody(p: Project, openTask: (t: Task) => void, openFile: (f: StudioFile) => void, empty: ReactNode): ReactNode {
  const taskRows = tasksOf(p.id).map((t) => taskRow(t, openTask));
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

// ——— Links for routing ——————————————————————————————————————————————————————————————————————————————
/** A plain click navigates in place; Cmd/Ctrl/Shift-click and a middle click stay with the browser. */
const plainClick = (event: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }) => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/** The app’s router link, passed as `linkAs` (your router’s Link, such as React Router’s, taking the item’s href). A
 *  plain click stays in the app: the Sidebar’s onClick hands the item to onItemClick, which navigates. Cmd/Ctrl-click,
 *  a middle click or Copy link address keep working, because every row is a real link. */
function RouterLink({ onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a {...rest} onClick={(event) => {
      if (!plainClick(event)) return;
      event.preventDefault();
      onClick?.(event);
    }} />
  );
}

const routeSections: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line", href: "/home" },
  { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line", href: "/inbox", counter: 3 },
  { id: "projects", label: "Projects", icon: "icon-folder-line", href: "/projects" },
  { id: "invoices", label: "Invoices", icon: "icon-receipt-line", href: "/invoices" },
] }];

export default function LinksForRouting() {
  const { toast } = useToast();
  const [path, setPath] = useState("/projects/lumen-banking");
  // The first part of the route picks the Sidebar item, so a project’s own page keeps Projects selected.
  const [, section, id, taskId] = path.split("/");
  const project = section === "projects" ? projects.find((p) => p.id === id) : undefined;
  const task = project ? tasks.find((t) => t.id === taskId) : undefined;
  const toProject = (p: Project): Row => ({ ...projectRow(p), onClick: () => setPath(`/projects/${p.id}`) });
  const download = (f: StudioFile) => toast({ title: "Download started", children: f.name });
  // The trail’s crumbs are links to their routes too.
  const projectsCrumb: BreadcrumbItemData = { id: "projects", label: "Projects", href: "/projects" };
  let view: View;
  if (project && task) {
    view = taskView(task, [projectsCrumb, { id: project.id, label: project.name, href: `/projects/${project.id}` }], project);
  } else if (project) {
    view = {
      crumbs: [projectsCrumb, { id: project.id, label: project.name }],
      title: project.name,
      meta: projectBadge(project),
      description: `${project.client} · Led by ${people[project.lead].name} · Due ${formatDate(project.due)}`,
      body: projectBody(project, (open) => setPath(`/projects/${project.id}/${open.id}`), download, (
        <EmptyState headingLevel={2} title="Nothing here yet" icon="icon-folder-line" secondaryAction={{ label: "Show all projects", onClick: () => setPath("/projects") }}>
          Tasks and files for {project.name} show up here.
        </EmptyState>
      )),
    };
  } else if (section === "projects") {
    view = { title: "Projects", description: plural(projects.length, "project"), body: <RowCard label="Projects" rows={projects.map(toProject)} /> };
  } else if (section === "inbox") {
    view = { title: "Inbox", description: plural(3, "unread message"), body: <RowCard label="Inbox" rows={activity.map((a) => activityRow(a, Boolean(a.unread)))} /> };
  } else if (section === "invoices") {
    view = { title: "Invoices", description: "Sent, paid and overdue this quarter", body: <RowCard label="Invoices" rows={invoices.map(invoiceRow)} /> };
  } else {
    view = {
      title: "Home",
      description: "Your projects at a glance",
      body: (
        <Pair>
          <RowCard heading label="Active projects" rows={projects.filter((p) => p.status === "Active").map(toProject)} seeAll={() => setPath("/projects")} />
          <RowCard heading label="Recent activity" rows={activity.slice(0, 4).map((a) => activityRow(a, Boolean(a.unread)))} seeAll={() => setPath("/inbox")} />
        </Pair>
      ),
    };
  }
  return (
    <AppShell
      sidebar={<Sidebar logo={studioLogo} logoCollapsed={studioMark} sections={routeSections} linkAs={RouterLink} selectedId={section} onItemClick={(item) => item.href && setPath(item.href)} />}
      header={(
        <AppShellHeader
          leading={view.crumbs ? (
            <Breadcrumbs master={false} items={view.crumbs}
              onNavigate={(item, event) => { if (!item.href || !plainClick(event)) return; event.preventDefault(); setPath(item.href); }} />
          ) : undefined}
          actions={<>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={3} onClick={() => setPath("/inbox")} />
            <AccountMenu />
          </>}
          main={pageHeader(view)}
        />
      )}
    >
      {view.body}
    </AppShell>
  );
}
