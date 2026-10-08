/* Alert Banner examples: page- and app-level conditions in Đìzai Studio's Zen workspace (brief:
   docs/research/example-rebuild-brief-2026-09-30.md). A banner says what is wrong with the whole page or app and how to
   fix it; the result of a single action is a Toast, and a message about one section is an Inline Message. */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AlertBanner, type AlertBannerTheme } from "../../../components/AlertBanner";
import { AppShell } from "../../../components/AppShell";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon } from "../../../components/DockIcon";
import { Form, FormActions, FormFieldset } from "../../../components/Form";
import type { IconName } from "../../../components/Icon";
import { Box, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { PageHeader } from "../../../components/PageHeader";
import { RadioButton } from "../../../components/RadioButton";
import { Sidebar, type SidebarSection } from "../../../components/Sidebar";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { PlatformPhone } from "../../PlatformPhone";
import {
  TODAY, daysFromToday, formatDate, formatDay, formatDue, formatMoney, formatRange, formatTime, initials, people, plans, projectById,
  projectStatusTheme, projects, studio, taskStatusTheme, tasks, workspacePlan, type Person, type PersonId, type TaskStatus,
} from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import "./alert-banner.css";

export const page: PlatformPage = "alert-banner";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, background: "subtle" as const, children: initials(person.name) };

/** A page without its own shell keeps the page margin; its one h1 is the PageHeader title. */
const Page = ({ children, ...header }: { title: string; description?: ReactNode; eyebrow?: ReactNode; meta?: ReactNode; actions?: ReactNode; children: ReactNode }) => (
  <Stack gap="xl" className="px-alert-banner-page"><PageHeader {...header} />{children}</Stack>
);

/* ───────────── 1. Payment failed (AppShell banner) ───────────── */

type ShellPageId = "home" | "projects" | "team" | "billing";
// The studio's plan from the shared price list: Business, 48 seats at $24 a month = $1,152.
const plan = plans.find((item) => item.id === workspacePlan.plan)!;
const seats = workspacePlan.seats;
const amountDue = plan.seatMonthly * seats;
const graceEnds = daysFromToday(7);
const period = formatRange(daysFromToday(1), daysFromToday(31));
const payCards = [
  { id: "visa", label: "Visa ending 4242", caption: `Declined yesterday at ${formatTime(daysFromToday(-1, 6, 12))}` },
  { id: "mastercard", label: "Mastercard ending 8810", caption: "Expires Mar 2028" },
];
const dueThisWeek = tasks.filter((task) => task.status !== "Done" && task.due <= daysFromToday(7)).sort((a, b) => +a.due - +b.due).slice(0, 5);
const openProjects = projects.filter((project) => project.status !== "Completed");
const teamIds: PersonId[] = ["chi", "bao", "duy", "ava", "finn", "hana"];
const statusBadge = (status: TaskStatus) => <Badge theme={taskStatusTheme[status]} background="subtle">{status}</Badge>;

function PaymentFailedExample() {
  const { toast } = useToast();
  const [page, setPage] = useState<ShellPageId>("home");
  const [cardId, setCardId] = useState("mastercard");
  const [paid, setPaid] = useState(false);
  const paymentHeading = useRef<HTMLHeadingElement>(null);
  const receiptButton = useRef<HTMLButtonElement>(null);
  const focusOnPage = useRef<"payment" | "receipt" | null>(null);
  const paymentId = useId();
  const card = payCards.find((item) => item.id === cardId)!;

  // The banner's action leads to the fix: the Billing page, with focus on the payment that failed.
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

  const sections: SidebarSection[] = [
    { items: [
      { id: "home", label: "Home", icon: "icon-home-03-line" },
      { id: "projects", label: "Projects", icon: "icon-folder-line" },
      { id: "team", label: "Team", icon: "icon-users-line" },
      // A one-item group loses its title: Billing joins the list (backlog batch 6b, user 2026-10-07).
      { id: "billing", label: "Billing", icon: "icon-credit-card-line", notificationDot: !paid },
    ] },
  ];

  let content: ReactNode;
  if (page === "projects") {
    content = (
      <Page title="Projects" description={`${plural(openProjects.length, "open project")} across five clients`}>
        <ListBox theme="shadow">
          <List aria-label="Projects">
            {openProjects.map((project) => (
              <ListItem key={project.id} title={project.name} caption={`${project.client} · Due ${formatDate(project.due)}`}
                leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />}
                trailing={<Badge theme={projectStatusTheme[project.status]} background="subtle">{project.status}</Badge>} />
            ))}
          </List>
        </ListBox>
      </Page>
    );
  } else if (page === "team") {
    content = (
      <Page title="Team" description={`${plural(seats, "person", "people")} in Ho Chi Minh City and Hanoi`}>
        <ListBox theme="shadow">
          <List aria-label="Team">
            {teamIds.map((id) => <ListItem key={id} title={people[id].name} caption={`${people[id].role} · ${people[id].location}`} leading={<Avatar size="md" {...avatarOf(people[id])} />} />)}
          </List>
        </ListBox>
      </Page>
    );
  } else if (page === "billing") {
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
    content = (
      <Page title="Billing" description={`${plan.name} plan · ${plural(seats, "seat")} · billed ${workspacePlan.billing}`}>
        <Card theme="border" className="px-alert-banner-billing">
          {paid ? (
            <Stack as="section" gap="md" aria-labelledby={paymentId}>
              {summary}
              <Stack direction="row" justify="between" align="center" gap="md" wrap>
                <Text textStyle="Body/Small/Regular" tone="base">Paid {formatDate(TODAY)} with {card.label}</Text>
                <Button ref={receiptButton} level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Receipt downloaded" })}>Download receipt</Button>
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
      </Page>
    );
  } else {
    content = (
      <Page title="Home" description="Due this week across your projects">
        <ListBox theme="shadow">
          <List aria-label="Due this week">
            {dueThisWeek.map((task) => (
              <ListItem key={task.id} title={task.title} titleLines={2} caption={`${projectById(task.project).client} · ${formatDue(task.due)}`}
                leading={<Avatar size="md" {...avatarOf(people[task.assignee])} />} trailing={statusBadge(task.status)} />
            ))}
          </List>
        </ListBox>
      </Page>
    );
  }

  return (
    <div className="px-alert-banner-frame">
      <div className="px-alert-banner-frame__scroll">
        <AppShell
          banner={paid ? undefined : (
            // Critical: no close control. It leaves when the payment goes through.
            <AlertBanner theme="negative" action={{ label: "Update card", onClick: openBilling }}>
              Payment for the {plan.name} plan failed. Update your card by {formatDate(graceEnds)} to keep editing projects.
            </AlertBanner>
          )}
          sidebar={(
            <Sidebar
              // The mark is an image sized by the 24px header slot, so it stays inside it at every density.
              logo={<span className="px-alert-banner-brand"><img src={studio.logo} alt="" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></span>}
              logoCollapsed={<Avatar size="xs" shape="square" theme="photo" src={studio.logo} alt={studio.name} />}
              sections={sections}
              selectedId={page}
              onItemClick={(item) => setPage(item.id as ShellPageId)}
            />
          )}
        >
          {content}
        </AppShell>
      </div>
    </div>
  );
}

/* ───────────── 2. One banner at a time ───────────── */

type Notice = { theme: AlertBannerTheme; message: string; action?: { label: string; onClick: () => void }; onClose?: () => void };

function OneBannerExample() {
  const { toast } = useToast();
  const [figma, setFigma] = useState(false);
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

  return (
    <div ref={root} className="px-alert-banner-screen">
      {notice ? <AlertBanner theme={notice.theme} action={notice.action} onClose={notice.onClose}>{notice.message}</AlertBanner> : null}
      <Page title="Settings" description={`Connections and sign-in for ${studio.name}`}
        actions={maintenanceHidden ? <Button ref={showAgain} level="tertiary" startIcon="icon-bell-01-line" onClick={() => { moveFocus.current = true; setMaintenanceHidden(false); }}>Show notice again</Button> : undefined}>
        <ListBox>
          <List aria-label="Connections and sign-in">
            <ListItem title="Figma" caption={figma ? "Synced · designs on tasks update as you edit" : `Sync stopped yesterday at ${formatTime(daysFromToday(-1, 18, 12))}`}
              leading={<DockIcon icon="icon-layers-three-01-line" theme="purple" background="subtle" size="md" />}
              trailing={<Button level="tertiary" onClick={() => { setFigma(!figma); toast({ title: figma ? "Figma disconnected" : "Figma reconnected" }); }}>{figma ? "Disconnect" : "Reconnect"}</Button>} />
            <ListItem title="Two-step sign-in" caption={twoStep ? "On for everyone in the workspace" : "Off · required for everyone from Oct 12, 2026"}
              leading={<DockIcon icon="icon-passcode-lock-line" theme="blue" background="subtle" size="md" />}
              trailing={<Button level="tertiary" onClick={() => { setTwoStep(!twoStep); toast({ title: twoStep ? "Two-step sign-in turned off" : "Two-step sign-in turned on" }); }}>{twoStep ? "Turn off" : "Set up"}</Button>} />
          </List>
        </ListBox>
      </Page>
    </div>
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
  const [archived, setArchived] = useState(true);
  const [rows, setRows] = useState(bookFairTasks);
  const [adding, setAdding] = useState(false);
  const tasksId = useId();
  const root = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);
  // The button pressed goes away with the state it changed: focus moves to what took its place (New task once restored,
  // the banner's Restore project once archived), never to <body>.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    root.current?.querySelector<HTMLElement>(archived ? ".zen-alert-banner button" : ".zen-page-header [data-level='primary']")?.focus();
  }, [archived]);
  // Undo's toast closes as it runs, so Undo moves focus the same way.
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
  return (
    <div ref={root} className="px-alert-banner-screen">
      {archived ? (
        <AlertBanner action={{ label: "Restore project", onClick: restore }}>This project is archived, so it’s read-only. Restore it to add or change tasks.</AlertBanner>
      ) : null}
      <Page eyebrow={bookFair.client} title={bookFair.name} meta={<Badge theme={projectStatusTheme[bookFair.status]} background="subtle">{bookFair.status}</Badge>}
        description={`Launched ${formatDate(bookFair.due)} · ${plural(bookFair.members.length, "member")}`}
        actions={archived ? undefined : (
          <>
            <Button level="tertiary" startIcon="icon-archive-line" onClick={archive}>Archive project</Button>
            <Button level="primary" startIcon="icon-plus-line" onClick={() => setAdding(true)}>New task</Button>
          </>
        )}>
        <Stack as="section" gap="md" aria-labelledby={tasksId}>
          <Heading level={2} id={tasksId}>Tasks</Heading>
          <ListBox>
            <List aria-labelledby={tasksId}>
              {rows.map((row) => (
                <ListItem key={row.id} title={row.title} titleLines={2} caption={row.done ? `${row.key} · Done ${formatDay(row.done)}` : `${row.key} · Added just now`}
                  leading={<Avatar size="md" {...avatarOf(people[row.assignee])} />} trailing={statusBadge(row.status)} />
              ))}
            </List>
          </ListBox>
        </Stack>
      </Page>
      <DemoFieldDialog open={adding} onOpenChange={setAdding} title="New task" field={{ kind: "name", label: "Task name", placeholder: "Update the 2027 exhibitor list" }}
        submitLabel="Add task" confirm={() => "Task added"} onSubmit={addTask} />
    </div>
  );
}

/* ───────────── 4. Offline on a phone (Small) ───────────── */

type Connection = "offline" | "reconnecting" | "online" | "idle";
const connectionBanner: Record<Exclude<Connection, "idle">, { theme: AlertBannerTheme; leading: IconName; message: string }> = {
  offline: { theme: "negative", leading: "icon-wifi-off-line", message: `You’re offline. Showing tasks from ${formatTime(daysFromToday(0, 10, 12))}.` },
  reconnecting: { theme: "info", leading: "icon-refresh-cw-01-line", message: "Reconnecting…" },
  online: { theme: "positive", leading: "icon-wifi-line", message: "Back online. Your tasks are up to date." },
};
/** Alex's open tasks, soonest first: the list the phone kept from its last sync. */
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

function OfflinePhoneExample() {
  const screenRef = useRef<HTMLDivElement>(null);
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
  const list = connection === "offline" || connection === "reconnecting" ? myTasks : [...myTasks, newTask].sort((a, b) => +a.due - +b.due);
  const banner = connection === "idle" ? null : connectionBanner[connection];
  return (
    // The status banner always sits under the Top Navigation (its `banner` slot): pinned, edge to edge, it never
    // scrolls away, while the large title still folds as the list moves under the bar.
    <PlatformPhone label="My tasks" headerOverlay screenRef={screenRef} header={
      <TopNavigation type="alt" title="My tasks" largeTitle="My tasks" scrollRef={screenRef}
        trailing={[{ icon: "icon-refresh-cw-01-line", label: "Sync now", onClick: sync, disabled: connection === "reconnecting" }]}
        banner={banner ? <AlertBanner size="small" theme={banner.theme} leading={banner.leading}>{banner.message}</AlertBanner> : undefined} />
    }>
      {/* Static rows pad 0 at the sides: the screen's margin (lg, as the line under them) insets them. */}
      <Box paddingX="lg" paddingY="xs">
        <List aria-label="My tasks">
          {list.map((task) => {
            const project = projectById(task.project);
            return (
              <ListItem key={task.id} title={task.title} caption={`${project.name} · ${formatDue(task.due)}`}
                leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />} />
            );
          })}
        </List>
      </Box>
      <Box paddingX="lg" paddingY="sm">
        <Text textStyle="Caption/Regular" tone="light" role="status">{checking ? "Checking for updates…" : `Updated ${updated === TODAY ? "just now" : formatTime(updated)}`}</Text>
      </Box>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Payment failed",
    description: "A failed payment affects the whole workspace, so the banner sits in the AppShell banner slot and stays on every page. It has no close button: its action opens Billing, and it leaves once the payment goes through.",
    wide: true,
    screen: true,
    render: () => <PaymentFailedExample />,
    code: `<AppShell
  sidebar={<Sidebar sections={sections} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
  banner={paid ? undefined : (
    <AlertBanner theme="negative" action={{ label: "Update card", onClick: openBilling }}>
      Payment for the Business plan failed. Update your card by Oct 7, 2026 to keep editing projects.
    </AlertBanner>
  )}
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
    description: "Three conditions are open, but the page shows one banner: the most severe first. Fixing Figma brings up the two-step warning, then the maintenance notice, the only one that can be dismissed.",
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

{notice ? (
  <AlertBanner theme={notice.theme} action={notice.action} onClose={notice.onClose}>
    {notice.message}
  </AlertBanner>
) : null}
<PageHeader title="Settings" />`,
  },
  {
    title: "Archived project",
    description: "A Default banner explains why the page can’t be edited: the project is archived, so New task is gone. Restore project brings editing back at once, and the Toast offers Undo.",
    wide: true,
    screen: true,
    render: () => <ArchivedProjectExample />,
    code: `{archived ? (
  <AlertBanner action={{ label: "Restore project", onClick: restore }}>
    This project is archived, so it’s read-only. Restore it to add or change tasks.
  </AlertBanner>
) : null}
<PageHeader eyebrow="Hanoi Book Fair" title="Book Fair 2026 website"
  actions={archived ? undefined : <Button level="primary" startIcon="icon-plus-line" onClick={addTask}>New task</Button>} />

const restore = () => {
  setArchived(false);
  toast({ title: "Project restored", action: { label: "Undo", onClick: () => setArchived(true) } });
};`,
  },
  {
    title: "Offline on a phone",
    description: "On a phone a Small banner pinned under the Top Navigation reports the connection: Negative while offline, Info while it reconnects, Positive for a moment once back. It stays in view while the tasks scroll and the large title folds; Small banners carry no action, so Sync now lives in the bar.",
    render: () => <OfflinePhoneExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone headerOverlay screenRef={screenRef} header={
  <TopNavigation type="alt" title="My tasks" largeTitle="My tasks" scrollRef={screenRef}
    trailing={[{ icon: "icon-refresh-cw-01-line", label: "Sync now", onClick: sync, disabled: connection === "reconnecting" }]}
    banner={connection === "offline" ? (
      <AlertBanner size="small" theme="negative" leading="icon-wifi-off-line">You’re offline. Showing tasks from 10:12 am.</AlertBanner>
    ) : connection === "reconnecting" ? (
      <AlertBanner size="small" theme="info" leading="icon-refresh-cw-01-line">Reconnecting…</AlertBanner>
    ) : connection === "online" ? (
      <AlertBanner size="small" theme="positive" leading="icon-wifi-line">Back online. Your tasks are up to date.</AlertBanner>
    ) : undefined} />
}>
  <Box paddingX="lg" paddingY="xs">
    <List aria-label="My tasks">{/* 14 open tasks, soonest first */}</List>
  </Box>
</PlatformPhone>`,
  },
]);
