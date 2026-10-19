/* Alert Banner examples: page- and app-level conditions in Đìzai Studio's Zen workspace (brief:
   docs/research/example-rebuild-brief-2026-09-30.md; rebuilt on the new AppShell 2026-10-19). A banner says what is
   wrong with the whole page or app and how to fix it; the result of a single action is a Toast, and a message about one
   section is an Inline Message. On a desktop screen the banner sits in the AppShell's `banner` slot, above the whole
   shell (Pattern/AppShell/Desktop, Layout=Sidebar), so it stays in view while the page scrolls; on a phone it is the
   Top Navigation's `banner`, pinned under the bar (component-usage-rules §17). */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AlertBanner, type AlertBannerTheme } from "../../../components/AlertBanner";
import { AppShell, AppShellAccount, AppShellHeader } from "../../../components/AppShell";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { BottomNavigation } from "../../../components/BottomNavigation";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon } from "../../../components/DockIcon";
import { Form, FormActions, FormFieldset } from "../../../components/Form";
import type { IconName } from "../../../components/Icon";
import { Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { PageHeader } from "../../../components/PageHeader";
import { RadioButton } from "../../../components/RadioButton";
import { Sidebar, SidebarMenuItem, type SidebarSection } from "../../../components/Sidebar";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { PlatformPhone } from "../../PlatformPhone";
import {
  TODAY, activity, daysFromToday, formatDate, formatDay, formatDue, formatMoney, formatRange, formatRelative, formatTime, initials, me, people,
  plans, projectById, projectStatusTheme, projects, studio, taskStatusTheme, tasks, workspacePlan, type Person, type PersonId, type Project,
  type TaskStatus,
} from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { PreviewAppFrame, StudioLogo } from "../../PlatformFrames";
import { keepOnHotUpdate } from "../../hotData";

export const page: PlatformPage = "alert-banner";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, background: "subtle" as const, children: initials(person.name) };
const statusBadge = (status: TaskStatus) => <Badge theme={taskStatusTheme[status]} background="subtle">{status}</Badge>;
const projectBadge = (p: Project) => <Badge theme={projectStatusTheme[p.status]} background="subtle">{p.status}</Badge>;

// ——— The studio’s shell (examples 1–3) ————————————————————————————————————————————————————————————————————
type StudioPageId = "home" | "projects" | "team" | "billing" | "settings";
// The studio’s plan from the shared price list: Business, 48 seats at $24 a month = $1,152.
const plan = plans.find((item) => item.id === workspacePlan.plan)!;
const seats = workspacePlan.seats;
const amountDue = plan.seatMonthly * seats;
const dueThisWeek = tasks.filter((task) => task.status !== "Done" && task.due <= daysFromToday(7)).sort((a, b) => +a.due - +b.due).slice(0, 5);
const openProjects = projects.filter((project) => project.status !== "Completed");
const teamIds: PersonId[] = ["chi", "bao", "duy", "ava", "finn", "hana"];

/** The studio’s Sidebar: the same destinations on every screen; `billingDot` marks Billing while a payment waits. */
function studioSidebar(selectedId: string, onItemClick: (id: StudioPageId) => void, billingDot = false) {
  const sections: SidebarSection[] = [{ items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "team", label: "Team", icon: "icon-users-line" },
    // A one-item group loses its title: Billing joins the list (backlog batch 6b, user 2026-10-07).
    { id: "billing", label: "Billing", icon: "icon-credit-card-line", notificationDot: billingDot },
  ] }];
  return (
    <Sidebar
      // The mark is an image sized by the 24px header slot, so it stays inside it at every density.
      logo={<StudioLogo src={studio.logo} name={studio.name} />}
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

/** A titled list on the page: Heading/Subheading over its rows, in a Shadow ListBox beside the default Sidebar. Rows
 *  get `narrow` while the list is under 280px wide (a phone-width window), so they can leave their Badge to the page
 *  the row opens and keep the title readable. */
function Section({ label, children }: { label: string; children: (narrow: boolean) => ReactNode }) {
  const id = useId();
  const [list, setList] = useState<HTMLElement | null>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (!list) return undefined;
    const observer = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < 280));
    observer.observe(list);
    return () => observer.disconnect();
  }, [list]);
  return (
    <ListBox as="section" theme="shadow" aria-labelledby={id} header={<Heading level={2} id={id} textStyle="Heading/Subheading">{label}</Heading>}>
      <List ref={setList} aria-labelledby={id}>{children(narrow)}</List>
    </ListBox>
  );
}
const Pair = ({ children }: { children: ReactNode }) => <Grid columns={2} stackBelow={720} gap="md" align="start">{children}</Grid>;

/** What a page shows: its PageHeader (the header’s Main row) and its Body. */
type View = { title: string; eyebrow?: ReactNode; description?: ReactNode; meta?: ReactNode; actions?: ReactNode; body: ReactNode };
const pageHeader = ({ title, eyebrow, description, meta, actions }: View) => <PageHeader title={title} eyebrow={eyebrow} description={description} meta={meta} actions={actions} />;

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
/** The workspace’s details, on Settings. */
const workspaceCard = (
  <Card theme="shadow">
    <DescriptionList items={[
      { term: "Workspace", description: studio.name },
      { term: "Domain", description: studio.domain },
      { term: "Plan", description: `${plan.name} · ${plural(seats, "seat")} · billed ${workspacePlan.billing}` },
    ]} />
  </Card>
);

/* ───────────── 1. Payment failed (AppShell banner) ───────────── */

const graceEnds = daysFromToday(7);
const period = formatRange(daysFromToday(1), daysFromToday(31));
const payCards = [
  { id: "visa", label: "Visa ending 4242", caption: `Declined yesterday at ${formatTime(daysFromToday(-1, 6, 12))}` },
  { id: "mastercard", label: "Mastercard ending 8810", caption: "Expires Mar 2028" },
];
/** The plan’s last three bills, all paid with the Visa before it was declined. */
const pastBills = [
  { id: "bill-sep", period: "September 2026", paid: daysFromToday(-29) },
  { id: "bill-aug", period: "August 2026", paid: daysFromToday(-60) },
  { id: "bill-jul", period: "July 2026", paid: daysFromToday(-91) },
];

function PaymentFailedExample() {
  const { toast } = useToast();
  const [page, setPage] = useState<StudioPageId>("home");
  const [cardId, setCardId] = useState("mastercard");
  const [paid, setPaid] = useState(false);
  const paymentHeading = useRef<HTMLHeadingElement>(null);
  const receiptButton = useRef<HTMLButtonElement>(null);
  const focusOnPage = useRef<"payment" | "receipt" | null>(null);
  const paymentId = useId();
  const card = payCards.find((item) => item.id === cardId)!;

  // The banner’s action leads to the fix: the Billing page, with focus on the payment that failed.
  useEffect(() => {
    const target = focusOnPage.current === "payment" ? paymentHeading.current : focusOnPage.current === "receipt" ? receiptButton.current : null;
    focusOnPage.current = null;
    target?.focus();
  }, [page, paid]);
  const openBilling = () => { focusOnPage.current = "payment"; setPage("billing"); };
  const pay = () => {
    focusOnPage.current = "receipt";
    setPaid(true);
    toast({ type: "positive", title: "Payment received", children: `${formatMoney(amountDue, true)} charged to ${card.label}` });
  };

  let view: View;
  if (page === "billing") {
    const summary = (
      <>
        <Heading ref={paymentHeading} id={paymentId} tabIndex={-1} level={2} textStyle="Heading/Subheading">{paid ? "Paid" : "Payment due"}</Heading>
        <DescriptionList items={[
          { term: "Plan", description: `${plan.name} · ${plural(seats, "seat")}` },
          { term: "Period", description: period },
          { term: "Amount", description: formatMoney(amountDue, true), emphasis: true },
        ]} />
      </>
    );
    view = {
      title: "Billing",
      description: `${plan.name} plan · ${plural(seats, "seat")} · billed ${workspacePlan.billing}`,
      // The payment takes the page's width, so its form keeps the desktop footer (Pay on the right); the bills follow.
      body: (
        <Stack gap="lg">
          <Card theme="shadow">
            {paid ? (
              <Stack as="section" gap="md" aria-labelledby={paymentId}>
                {summary}
                <Stack direction="row" justify="between" align="center" gap="md" wrap>
                  <Text textStyle="Body/Small/Regular" tone="base">Paid {formatDate(TODAY)} with {card.label}</Text>
                  <Button ref={receiptButton} level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Receipt downloaded", children: `${plan.name} plan · ${period}` })}>Download receipt</Button>
                </Stack>
              </Stack>
            ) : (
              // Choosing a card and paying is a form: Enter pays, and the Primary sits on the right in FormActions.
              <Form onSubmit={pay} gap="md" aria-labelledby={paymentId}>
                {summary}
                <FormFieldset kind="radio" legend="Pay with">
                  {payCards.map((item) => (
                    <RadioButton key={item.id} name={`${paymentId}-card`} value={item.id} label={item.label} caption={item.caption}
                      checked={cardId === item.id} onCheckedChange={(checked) => { if (checked) setCardId(item.id); }} />
                  ))}
                </FormFieldset>
                <FormActions>
                  <Button level="primary" type="submit">Pay {formatMoney(amountDue, true)}</Button>
                </FormActions>
              </Form>
            )}
          </Card>
          <Section label="Past bills">
            {(narrow) => pastBills.map((bill) => (
              <ListItem key={bill.id} title={bill.period} caption={`${formatMoney(amountDue, true)} · Paid ${formatDate(bill.paid)} with Visa ending 4242`}
                leading={<DockIcon icon="icon-receipt-line" theme="neutral" background="subtle" size="md" />} trailing={narrow ? undefined : <Badge theme="green" background="subtle">Paid</Badge>}
                onClick={() => toast({ title: "Receipt downloaded", children: `${plan.name} plan · ${bill.period}` })} />
            ))}
          </Section>
        </Stack>
      ),
    };
  } else if (page === "settings") {
    view = { title: "Settings", description: `Workspace details for ${studio.name}`, body: workspaceCard };
  } else {
    view = sharedView(page);
  }

  return (
    <PreviewAppFrame height={{ min: 560, max: 760 }}>
      <AppShell
        banner={paid ? undefined : (
          // Critical: no close control. It leaves when the payment goes through.
          <AlertBanner theme="negative" action={{ label: "Update card", onClick: openBilling }}>
            Payment for the {plan.name} plan failed. Update your card by {formatDate(graceEnds)} to keep editing projects.
          </AlertBanner>
        )}
        sidebar={studioSidebar(page, setPage, !paid)}
        header={(
          <AppShellHeader
            // The plan Badge leads the row’s utilities; the account menu ends it.
            actions={<>
              <Badge theme="accent" background="subtle">{`${plan.name} plan`}</Badge>
              <AccountMenu onSettings={() => setPage("settings")} />
            </>}
            main={pageHeader(view)}
          />
        )}
      >
        {view.body}
      </AppShell>
    </PreviewAppFrame>
  );
}

/* ───────────── 2. One banner at a time ───────────── */

const recentSignIns: { id: string; person: PersonId; device: string; at: Date }[] = [
  { id: "s1", person: "alex", device: "Chrome on macOS", at: daysFromToday(0, 8, 2) },
  { id: "s2", person: "chi", device: "Zen for iPhone", at: daysFromToday(0, 7, 41) },
  { id: "s3", person: "finn", device: "Firefox on Windows", at: daysFromToday(-1, 22, 15) },
];

type Notice = { theme: AlertBannerTheme; message: string; action?: { label: string; onClick: () => void }; onClose?: () => void };

function OneBannerExample() {
  const { toast } = useToast();
  const [page, setPage] = useState<StudioPageId>("settings");
  const [figma, setFigma] = useState(false);
  const [slack, setSlack] = useState(true);
  const [twoStep, setTwoStep] = useState(false);
  const [maintenanceHidden, setMaintenanceHidden] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const showAgain = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef(false);

  // The most severe open condition wins the one banner slot: broken (Negative) → upcoming (Warning) → news (Info).
  const reconnect = () => { moveFocus.current = true; setFigma(true); toast({ title: "Figma reconnected" }); };
  const setUpTwoStep = () => { moveFocus.current = true; setTwoStep(true); toast({ title: "Two-step sign-in turned on" }); };
  const hideMaintenance = () => { moveFocus.current = true; setMaintenanceHidden(true); };
  const notice: Notice | null = !figma
    ? { theme: "negative", message: "Figma sync stopped. Designs on tasks won’t update until you reconnect.", action: { label: "Reconnect", onClick: reconnect } }
    : !twoStep
      ? { theme: "warning", message: "Two-step sign-in is required from Oct 12. Set it up now to keep access.", action: { label: "Set up", onClick: setUpTwoStep } }
      : !maintenanceHidden
        ? { theme: "info", message: "Zen is down for maintenance on Sunday, Oct 4, 2:00–3:00 am.", onClose: hideMaintenance }
        : null;

  // After a banner action (or Show notice again), focus stays in the banner slot (the next banner) or lands on Show notice
  // again, never on <body>.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    (root.current?.querySelector<HTMLElement>(".zen-alert-banner button") ?? showAgain.current)?.focus();
  });

  const view: View = page === "settings" ? {
    title: "Settings",
    description: `Connections and sign-in for ${studio.name}`,
    actions: maintenanceHidden ? <Button ref={showAgain} level="tertiary" startIcon="icon-bell-01-line" onClick={() => { moveFocus.current = true; setMaintenanceHidden(false); }}>Show notice again</Button> : undefined,
    body: (
      <Pair>
        <Section label="Connections and sign-in">
          {() => <>
          <ListItem title="Figma" caption={figma ? "Synced · designs on tasks update as you edit" : `Sync stopped yesterday at ${formatTime(daysFromToday(-1, 18, 12))}`}
            leading={<DockIcon icon="icon-layers-three-01-line" theme="purple" background="subtle" size="md" />}
            trailing={<Button level="tertiary" onClick={() => { setFigma(!figma); toast({ title: figma ? "Figma disconnected" : "Figma reconnected" }); }}>{figma ? "Disconnect" : "Reconnect"}</Button>} />
          <ListItem title="Slack" caption={slack ? "Posts reviews and approvals to #studio-updates" : "Off · reviews and approvals stay in Zen"}
            leading={<DockIcon icon="icon-message-chat-circle-line" theme="green" background="subtle" size="md" />}
            trailing={<Button level="tertiary" onClick={() => { setSlack(!slack); toast({ title: slack ? "Slack disconnected" : "Slack connected" }); }}>{slack ? "Disconnect" : "Connect"}</Button>} />
          <ListItem title="Two-step sign-in" caption={twoStep ? "On for everyone in the workspace" : "Off · required for everyone from Oct 12, 2026"}
            leading={<DockIcon icon="icon-passcode-lock-line" theme="blue" background="subtle" size="md" />}
            trailing={<Button level="tertiary" onClick={() => { setTwoStep(!twoStep); toast({ title: twoStep ? "Two-step sign-in turned off" : "Two-step sign-in turned on" }); }}>{twoStep ? "Turn off" : "Set up"}</Button>} />
          </>}
        </Section>
        <Stack gap="md">
          {workspaceCard}
          {/* Who signed in lately, and how: what two-step sign-in will protect. */}
          <Section label="Recent sign-ins">
            {() => recentSignIns.map((entry) => (
              <ListItem key={entry.id} title={people[entry.person].name} titleLines={2} caption={`${entry.device} · ${people[entry.person].location} · ${formatRelative(entry.at)}`}
                leading={<Avatar size="md" {...avatarOf(people[entry.person])} />} />
            ))}
          </Section>
        </Stack>
      </Pair>
    ),
  } : page === "billing" ? {
    title: "Billing",
    description: `${plan.name} plan · ${plural(seats, "seat")} · billed ${workspacePlan.billing}`,
    body: <Card theme="shadow"><DescriptionList items={[{ term: "Next bill", description: `${formatMoney(amountDue, true)} on ${formatDate(daysFromToday(1))}` }, { term: "Pays with", description: "Mastercard ending 8810" }]} /></Card>,
  } : sharedView(page);

  return (
    <PreviewAppFrame frameRef={root} height={{ min: 560, max: 760 }}>
      <AppShell
        banner={notice ? <AlertBanner theme={notice.theme} action={notice.action} onClose={notice.onClose}>{notice.message}</AlertBanner> : undefined}
        sidebar={studioSidebar(page, setPage)}
        header={<AppShellHeader actions={<AccountMenu onSettings={() => setPage("settings")} />} main={pageHeader(view)} />}
      >
        {view.body}
      </AppShell>
    </PreviewAppFrame>
  );
}

/* ───────────── 3. Archived project (read-only page) ───────────── */

type ProjectTask = { id: string; key: string; title: string; assignee: PersonId; status: TaskStatus; done?: Date };
const bookFair = projectById("bookfair-site");
const bookFairTasks: ProjectTask[] = [
  { id: "b1", key: "HBF-118", title: "Publish the exhibitor map", assignee: "gia", status: "Done", done: daysFromToday(-14) },
  { id: "b2", key: "HBF-121", title: "Fix the ticket page on Safari", assignee: "em", status: "Done", done: daysFromToday(-13) },
  { id: "b3", key: "HBF-124", title: "Hand the CMS over to the client", assignee: "linh", status: "Done", done: daysFromToday(-12) },
  { id: "b4", key: "HBF-127", title: "Write the post-launch report", assignee: "gia", status: "Done", done: daysFromToday(-3) },
];

function ArchivedProjectExample() {
  const { toast } = useToast();
  const [page, setPage] = useState<StudioPageId>("projects");
  const [projectId, setProjectId] = useState<string | null>(bookFair.id);
  const [archived, setArchived] = useState(true);
  const [rows, setRows] = useState(bookFairTasks);
  const [adding, setAdding] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);
  const project = projectId ? projectById(projectId) : undefined;
  const onBookFair = project?.id === bookFair.id;
  // The button pressed goes away with the state it changed: focus moves to what took its place (New task once restored,
  // the banner’s Restore project once archived), never to <body>.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    root.current?.querySelector<HTMLElement>(archived ? ".zen-alert-banner button" : ".zen-page-header [data-level='primary']")?.focus();
  }, [archived]);
  // Undo’s toast closes as it runs, so Undo moves focus the same way.
  const change = (next: boolean) => { moveFocus.current = true; setArchived(next); };
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
          <Button level="primary" startIcon="icon-plus-line" onClick={() => (onBookFair ? setAdding(true) : toast({ title: "New task", children: `Adds a task to ${project.name}.` }))}>New task</Button>
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
    <PreviewAppFrame frameRef={root} height={{ min: 560, max: 760 }}>
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
            main={pageHeader(view)}
          />
        )}
      >
        {view.body}
      </AppShell>
      <DemoFieldDialog open={adding} onOpenChange={setAdding} title="New task" field={{ kind: "name", label: "Task name", placeholder: "Update the 2027 exhibitor list" }}
        submitLabel="Add task" confirm={() => "Task added"} onSubmit={addTask} />
    </PreviewAppFrame>
  );
}

/* ───────────── 4. Offline on a phone (Small) ───────────── */

type Connection = "offline" | "reconnecting" | "online" | "idle";
const connectionBanner: Record<Exclude<Connection, "idle">, { theme: AlertBannerTheme; leading: IconName; message: string }> = {
  offline: { theme: "negative", leading: "icon-wifi-off-line", message: `You’re offline. Showing tasks from ${formatTime(daysFromToday(0, 10, 12))}.` },
  reconnecting: { theme: "info", leading: "icon-refresh-cw-01-line", message: "Reconnecting…" },
  online: { theme: "positive", leading: "icon-wifi-line", message: "Back online. Your tasks are up to date." },
};
/** Alex’s open tasks, soonest first: the list the phone kept from its last sync. */
type PhoneTask = { id: string; title: string; project: string; due: Date };
const myTasks: PhoneTask[] = [
  { id: "m1", title: "Audit the account overview", project: "lumen-banking", due: daysFromToday(0, 17, 0) },
  { id: "m2", title: "Review Chi’s points history screen", project: "phin-loyalty", due: daysFromToday(0, 18, 0) },
  { id: "m3", title: "Sign off the transfer flow prototype", project: "lumen-banking", due: daysFromToday(1) },
  { id: "m4", title: "Review the Metric card guidelines", project: "zen-ds", due: daysFromToday(1) },
  { id: "m5", title: "Prepare the Lumen Bank review", project: "lumen-banking", due: daysFromToday(2) },
  { id: "m6", title: "Approve Gia’s moodboard", project: "saola-brand", due: daysFromToday(2) },
  { id: "m7", title: "Pick the icon set for Dock Icons", project: "zen-ds", due: daysFromToday(3) },
  { id: "m8", title: "Write the QA handoff notes", project: "lumen-banking", due: daysFromToday(3) },
  { id: "m9", title: "Test the Android build with Em", project: "phin-loyalty", due: daysFromToday(5) },
  { id: "m10", title: "Update the dark mode tokens", project: "zen-ds", due: daysFromToday(6) },
  { id: "m11", title: "Check checkout copy with Linh", project: "phin-loyalty", due: daysFromToday(7) },
  { id: "m12", title: "Brief Emi on the launch motion", project: "saola-brand", due: daysFromToday(8) },
  { id: "m13", title: "Read Ava’s usability report", project: "lumen-banking", due: daysFromToday(9) },
  { id: "m14", title: "Plan the Zen 0.5 release", project: "zen-ds", due: daysFromToday(13) },
];
/** Assigned while the phone was offline: it arrives with the sync. */
const newTask: PhoneTask = { id: "m-new", title: "Review Bao’s rewards API", project: "phin-loyalty", due: daysFromToday(1, 12, 0) };
/** The list in sections by when it is due: up to and including `within` days from today. */
const dueGroups: { id: string; label: string; within: number }[] = [
  { id: "today", label: "Today", within: 0 },
  { id: "tomorrow", label: "Tomorrow", within: 1 },
  { id: "week", label: "This week", within: 7 },
  { id: "later", label: "Later", within: Infinity },
];
const daysAway = (d: Date) => Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(TODAY).setHours(0, 0, 0, 0)) / 86_400_000);
type PhoneTab = "home" | "my-tasks" | "inbox" | "projects";
const phoneTabs = [
  { id: "home", label: "Home", icon: "icon-home-01-line", selectedIcon: "icon-home-01-solid" },
  { id: "my-tasks", label: "My tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line", selectedIcon: "ic-inbox-01-solid" },
  { id: "projects", label: "Projects", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
] satisfies { id: PhoneTab; label: string; icon: IconName; selectedIcon: IconName }[];

/** A phone section: rows in a Flat box on the grey Canvas, under a Heading/Subheading. */
function PhoneSection({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <ListBox as="section" aria-labelledby={id} header={<Heading level={2} id={id} textStyle="Heading/Subheading">{label}</Heading>}>
      <List aria-labelledby={id}>{children}</List>
    </ListBox>
  );
}

function OfflinePhoneExample() {
  const { toast } = useToast();
  const screenRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<PhoneTab>("my-tasks");
  const [connection, setConnection] = useState<Connection>("offline");
  const [updated, setUpdated] = useState(daysFromToday(0, 10, 12));
  const [checking, setChecking] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
  const later = (ms: number, run: () => void) => { timers.current.push(window.setTimeout(run, ms)); };
  // The Small banner follows the connection: Negative offline, Info while it reconnects, Positive for a moment once back.
  const sync = () => {
    // Online already: check for changes; the line under the list says when the tasks were last updated.
    if (connection === "idle") { setChecking(true); later(800, () => { setChecking(false); setUpdated(TODAY); }); return; }
    setConnection("reconnecting");
    later(1200, () => { setConnection("online"); setUpdated(TODAY); });
    later(4200, () => setConnection("idle"));
  };
  const offline = connection === "offline" || connection === "reconnecting";
  const list = offline ? myTasks : [...myTasks, newTask].sort((a, b) => +a.due - +b.due);
  const banner = connection === "idle" ? null : connectionBanner[connection];
  const switchTab = (next: string) => { setTab(next as PhoneTab); screenRef.current?.scrollTo({ top: 0 }); };
  const title = phoneTabs.find((item) => item.id === tab)!.label;
  const taskRow = (task: PhoneTask) => {
    const project = projectById(task.project);
    return (
      <ListItem key={task.id} title={task.title} titleLines={2} caption={`${project.name} · ${formatDue(task.due)}`}
        leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />}
        onClick={() => toast({ title: task.title, children: offline ? "Saved on this phone; changes sync once you’re back online." : `${project.name} · ${formatDue(task.due)}` })} />
    );
  };
  const status = <Text textStyle="Caption/Regular" tone="light" role="status">{checking ? "Checking for updates…" : `Updated ${updated === TODAY ? "just now" : formatTime(updated)}`}</Text>;

  let content: ReactNode;
  if (tab === "home") {
    const today = list.filter((task) => daysAway(task.due) <= 0);
    content = <>
      <Text tone="light">{`Good morning, Alex. ${plural(today.length, "task")} due today, ${plural(list.length, "open task")} in all.`}</Text>
      <PhoneSection label="Due today">{today.map(taskRow)}</PhoneSection>
      <PhoneSection label="Next up">{list.filter((task) => daysAway(task.due) > 0).slice(0, 3).map(taskRow)}</PhoneSection>
      {status}
    </>;
  } else if (tab === "inbox") {
    content = <>
      <Text tone="light">{offline ? "Messages from your last sync. New ones arrive when you’re back online." : plural(activity.filter((a) => a.unread).length, "unread message")}</Text>
      <PhoneSection label="Messages">
        {activity.map((a) => (
          <ListItem key={a.id} title={people[a.actor].name} titleLines={2} caption={`${a.verb[0].toUpperCase()}${a.verb.slice(1)} ${a.object}`} leading={<Avatar size="md" {...avatarOf(people[a.actor])} />}
            onClick={() => toast({ title: people[a.actor].name, children: `${a.verb[0].toUpperCase()}${a.verb.slice(1)} ${a.object}` })} />
        ))}
      </PhoneSection>
    </>;
  } else if (tab === "projects") {
    content = (
      <PhoneSection label="Your projects">
        {openProjects.map((p) => (
          <ListItem key={p.id} title={p.name} caption={`${p.client} · ${p.progress}% done`} leading={<DockIcon icon={p.icon} theme={p.theme} background="subtle" size="md" />}
            onClick={() => toast({ title: p.name, children: `${p.client} · Due ${formatDate(p.due)}` })} />
        ))}
      </PhoneSection>
    );
  } else {
    content = <>
      {dueGroups.map((group, index) => {
        const after = index ? dueGroups[index - 1].within : -Infinity;
        const rows = list.filter((task) => daysAway(task.due) > after && daysAway(task.due) <= group.within);
        return rows.length ? <PhoneSection key={group.id} label={group.label}>{rows.map(taskRow)}</PhoneSection> : null;
      })}
      {status}
    </>;
  }

  return (
    <PlatformPhone label="Zen app" screenRef={screenRef}>
      <AppShell
        // The status banner is the Top Navigation’s (its `banner` slot, the phone’s AppShell banner): pinned under the
        // bar, edge to edge, it never scrolls away, while the large title still folds as the list moves under the bar.
        // It is the app’s condition, so it stays on every tab.
        topNavigation={(
          <TopNavigation title={title} largeTitle={title} scrollRef={screenRef}
            trailing={[{ icon: "icon-refresh-cw-01-line", label: "Sync now", onClick: sync, disabled: connection === "reconnecting" }]}
            banner={banner ? <AlertBanner size="small" theme={banner.theme} leading={banner.leading}>{banner.message}</AlertBanner> : undefined} />
        )}
        bottomNavigation={<BottomNavigation aria-label="Zen app" value={tab} onValueChange={switchTab} showLabels items={phoneTabs} />}
      >
        {content}
      </AppShell>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Payment failed",
    description: "A failed payment affects the whole workspace, so the banner sits in the AppShell’s banner slot, above the Sidebar and the header, and stays on every page. It has no close button: its action opens Billing with focus on the payment, and it leaves once the payment goes through.",
    wide: true,
    screen: true,
    render: () => <PaymentFailedExample />,
    code: `<AppShell
  banner={paid ? undefined : (
    <AlertBanner theme="negative" action={{ label: "Update card", onClick: openBilling }}>
      Payment for the Business plan failed. Update your card by Oct 7, 2026 to keep editing projects.
    </AlertBanner>
  )}
  sidebar={<Sidebar sections={sections} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
  header={
    <AppShellHeader
      actions={<><Badge theme="accent" background="subtle">Business plan</Badge><AccountMenu /></>}
      main={<PageHeader title="Billing" description="Business plan · 48 seats · billed monthly" />}
    />
  }
>
  {page === "billing" ? <BillingPage onPay={pay} /> : <HomePage />}
</AppShell>

const pay = () => {
  setPaid(true);
  toast({ type: "positive", title: "Payment received", children: "$1,152.00 charged to Mastercard ending 8810" });
};`,
  },
  {
    title: "One banner at a time",
    description: "Three conditions are open, but the shell shows one banner: the most severe first. Fixing Figma brings up the two-step warning, then the maintenance notice, the only one that can be dismissed; Show notice again brings it back.",
    wide: true,
    screen: true,
    render: () => <OneBannerExample />,
    code: `// Broken (Negative) → upcoming (Warning) → news (Info): only the first open one is shown.
const notice = !figma
  ? { theme: "negative", message: "Figma sync stopped. Designs on tasks won’t update until you reconnect.",
      action: { label: "Reconnect", onClick: reconnect } }
  : !twoStep
    ? { theme: "warning", message: "Two-step sign-in is required from Oct 12. Set it up now to keep access.",
        action: { label: "Set up", onClick: setUpTwoStep } }
    : !maintenanceHidden
      ? { theme: "info", message: "Zen is down for maintenance on Sunday, Oct 4, 2:00–3:00 am.",
          onClose: () => setMaintenanceHidden(true) }
      : null;

<AppShell
  banner={notice ? <AlertBanner theme={notice.theme} action={notice.action} onClose={notice.onClose}>{notice.message}</AlertBanner> : undefined}
  sidebar={<Sidebar sections={sections} footer={settings} selectedId="settings" onItemClick={open} />}
  header={<AppShellHeader actions={<AccountMenu />} main={<PageHeader title="Settings" description="Connections and sign-in for Đìzai Studio" />} />}
>
  <ConnectionsList />
</AppShell>`,
  },
  {
    title: "Archived project",
    description: "A Default banner explains why the page can’t be edited: the project is archived, so New task and Archive are gone. It shows while that project is open and stays in view as its tasks scroll; Restore project brings editing back at once, and the Toast offers Undo.",
    wide: true,
    screen: true,
    render: () => <ArchivedProjectExample />,
    code: `<AppShell
  banner={archived ? (
    <AlertBanner action={{ label: "Restore project", onClick: restore }}>
      This project is archived, so it’s read-only. Restore it to add or change tasks.
    </AlertBanner>
  ) : undefined}
  sidebar={<Sidebar sections={sections} selectedId="projects" onItemClick={open} />}
  header={
    <AppShellHeader
      leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: "bookfair-site", label: "Book Fair 2026 website" }]} onNavigate={navigate} />}
      actions={<AccountMenu />}
      main={
        <PageHeader eyebrow="Hanoi Book Fair" title="Book Fair 2026 website"
          actions={archived ? undefined : <Button level="primary" startIcon="icon-plus-line" onClick={addTask}>New task</Button>} />
      }
    />
  }
>
  <ProjectTasks />
</AppShell>

const restore = () => {
  setArchived(false);
  toast({ title: "Project restored", action: { label: "Undo", onClick: () => setArchived(true) } });
};`,
  },
  {
    title: "Offline on a phone",
    description: "On a phone the banner is the Top Navigation’s: a Small banner pinned under the bar reports the connection, Negative while offline, Info while it reconnects, Positive for a moment once back. It is the app’s condition, so it stays on every tab and in view while the tasks scroll and the large title folds; Small banners carry no action, so Sync now lives in the bar.",
    render: () => <OfflinePhoneExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<AppShell
  topNavigation={
    <TopNavigation title="My tasks" largeTitle="My tasks" scrollRef={screenRef}
      trailing={[{ icon: "icon-refresh-cw-01-line", label: "Sync now", onClick: sync, disabled: connection === "reconnecting" }]}
      banner={connection === "offline" ? (
        <AlertBanner size="small" theme="negative" leading="icon-wifi-off-line">You’re offline. Showing tasks from 10:12 am.</AlertBanner>
      ) : connection === "reconnecting" ? (
        <AlertBanner size="small" theme="info" leading="icon-refresh-cw-01-line">Reconnecting…</AlertBanner>
      ) : connection === "online" ? (
        <AlertBanner size="small" theme="positive" leading="icon-wifi-line">Back online. Your tasks are up to date.</AlertBanner>
      ) : undefined} />
  }
  bottomNavigation={<BottomNavigation aria-label="Zen app" value={tab} onValueChange={setTab} showLabels items={tabs} />}
>
  <TasksByDay /> {/* Today, Tomorrow, This week, Later */}
</AppShell>`,
  },
]);
