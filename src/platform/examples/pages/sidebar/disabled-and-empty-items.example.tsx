import { useId, useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellHeader, Avatar, Badge, BadgeStatus, DockIcon, EmptyState, Grid, Heading, InlineMessage, Link, List, ListBox, ListItem,
  Menu, PageHeader, Sidebar, Stack, Text, Thumbnail, plural, useToast, useZen,
  type BadgeTheme, type IconName, type SidebarSection,
} from "@zen-ds/react";
import {
  daysFromToday, formatCompactMoney, formatDate, formatDay, formatDue, formatMoney, initials, invoiceStatusTheme, invoices, me, people, projectProgress,
  projectStep, projects, studio, taskStep, tasks,
  type Invoice, type Person, type Project, type Task,
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
const invoiceRow = (i: Invoice): Row => ({
  id: i.id, title: i.number, caption: `${i.client} · ${formatMoney(i.amount, true)} · Due ${formatDate(i.due)}`, leading: itemIcon("icon-receipt-line"),
  trailing: statusBadge(i.status, invoiceStatusTheme[i.status]),
});
const projectRow = (p: Project): Row => ({ id: p.id, title: p.name, caption: `${p.client} · Due ${formatDate(p.due)}`, leading: itemIcon(p.icon), trailing: projectBadge(p) });
/** Hours and money by project, for Reports: how far along it is and how much of the budget is spent. */
const reportRow = (p: Project): Row => ({ id: p.id, title: p.name, caption: `${p.progress}% done · ${formatCompactMoney(p.spent)} of ${formatCompactMoney(p.budget)} spent`, leading: itemIcon(p.icon), trailing: projectBadge(p) });

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

// ——— The page in the header ——————————————————————————————————————————————————————————————————————————
/** What a page shows: its PageHeader (the header’s Main row) and its Body. */
type View = { title: string; description?: ReactNode; meta?: ReactNode; actions?: ReactNode; body: ReactNode };
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

/* The studio's mark and name. The logo slot has a fixed height (24px; 20px in Small-Density): the mark is a 2xs
   Thumbnail that fits it at every density, and the name uses a text style whose line fits it. */
const studioLogo = <Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>;
const studioMark = <Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />;
const openProjects = projects.filter((p) => p.status !== "Completed");
const dueThisWeek = tasks.filter((t) => t.status !== "Done" && t.due <= daysFromToday(7)).sort((a, b) => +a.due - +b.due).slice(0, 5);

/** A member on the Starter plan: destinations the plan doesn’t include stay in the Sidebar, disabled, so people learn
 *  they exist; an empty Inbox shows no counter. Upgrading turns them on. */
export default function SidebarStates() {
  const { toast } = useToast();
  const [page, setPage] = useState("home");
  const [business, setBusiness] = useState(false);
  const sections: SidebarSection[] = [
    { items: [
      { id: "home", label: "Home", icon: "icon-home-03-line" },
      // Nothing waits in the Inbox, so it has no counter and no dot.
      { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line" },
      { id: "projects", label: "Projects", icon: "icon-folder-line" },
    ] },
    { label: "Business plan", items: [
      { id: "invoices", label: "Invoices", icon: "icon-receipt-line", disabled: !business },
      { id: "reports", label: "Reports", icon: "icon-bar-chart-01-line", disabled: !business },
    ] },
  ];
  const upgrade = () => { setBusiness(true); toast({ type: "positive", title: "Switched to Business", children: "Invoices and Reports are on in the Sidebar." }); };
  const toProject = (p: Project): Row => ({ ...projectRow(p), onClick: () => toast({ title: p.name, children: `${p.client} · ${p.progress}% done` }) });
  let view: View;
  if (page === "inbox") {
    view = {
      title: "Inbox",
      description: "Mentions, approvals and comments",
      body: (
        <EmptyState headingLevel={2} icon="ic-inbox-01-line" title="You're all caught up"
          secondaryAction={{ label: "Open projects", onClick: () => setPage("projects") }}>New mentions and approvals show up here.</EmptyState>
      ),
    };
  } else if (page === "projects") {
    view = { title: "Projects", description: plural(openProjects.length, "open project"), body: <RowCard label="Projects" rows={openProjects.map(toProject)} /> };
  } else if (page === "invoices") {
    view = { title: "Invoices", description: "Sent, paid and overdue this quarter", body: <RowCard label="Invoices" rows={invoices.map(invoiceRow)} /> };
  } else if (page === "reports") {
    view = { title: "Reports", description: "Progress and budget by project", body: <RowCard label="Reports" rows={openProjects.map(reportRow)} /> };
  } else {
    view = {
      title: "Home",
      description: "Due this week across your projects",
      body: (
        <Stack gap="lg">
          {business ? null : (
            <InlineMessage theme="neutral" title="Invoices and Reports are on the Business plan" action={{ label: "Switch to Business", onClick: upgrade }}>
              They stay in the Sidebar, disabled, until the workspace switches plans.
            </InlineMessage>
          )}
          <Pair>
            <RowCard heading label="Due this week" rows={dueThisWeek.map((t) => ({ ...taskRow(t, () => setPage("projects")) }))} />
            <RowCard heading label="Projects" rows={openProjects.slice(0, 4).map(toProject)} seeAll={() => setPage("projects")} />
          </Pair>
        </Stack>
      ),
    };
  }
  return (
    <AppShell
      sidebar={<Sidebar logo={studioLogo} logoCollapsed={studioMark} sections={sections} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
      header={(
        <AppShellHeader
          // The plan Badge leads the row’s utilities; the account menu ends it.
          actions={<>
            <Badge theme={business ? "accent" : "neutral"} background="subtle">{business ? "Business plan" : "Starter plan"}</Badge>
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
