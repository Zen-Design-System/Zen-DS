import { useId, useRef, useState, type ReactNode, type Ref } from "react";
import {
  AlertBanner, AppShell, AppShellAccount, AppShellHeader, Avatar, BadgeStatus, Button, Card, DescriptionList, DockIcon, Grid, Heading, List, ListBox,
  ListItem, Menu, PageHeader, Sidebar, SidebarMenuItem, Stack, Text, Thumbnail, plural, useToast, useZen, type AlertBannerTheme, type SidebarSection,
} from "@zen-ds/react";
import {
  activity, daysFromToday, formatDate, formatDue, formatMoney, formatRelative, formatTime, initials, me, people, plans, projectById, projectProgress,
  projectStep, projects, studio, taskStep, tasks, workspacePlan, type Person, type PersonId, type Project, type TaskStatus,
} from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, background: "subtle" as const, children: initials(person.name) };
const statusBadge = (status: TaskStatus) => <BadgeStatus status={taskStep[status]}>{status}</BadgeStatus>;
const projectBadge = (p: Project) => <BadgeStatus status={projectStep[p.status]} progress={projectProgress(p)}>{p.status}</BadgeStatus>;

// ——— The studio’s shell ————————————————————————————————————————————————————————————————————————————————————————————
type StudioPageId = "home" | "projects" | "team" | "billing" | "settings";
// The studio’s plan from the shared price list: Business, 48 seats at $24 a month = $1,152.
const plan = plans.find((item) => item.id === workspacePlan.plan)!;
const seats = workspacePlan.seats;
const amountDue = plan.seatMonthly * seats;
const dueThisWeek = tasks.filter((task) => task.status !== "Done" && task.due <= daysFromToday(7)).sort((a, b) => +a.due - +b.due).slice(0, 5);
const openProjects = projects.filter((project) => project.status !== "Completed");
const teamIds: PersonId[] = ["chi", "bao", "duy", "ava", "finn", "hana"];

/** The studio’s Sidebar: the same destinations on every screen. */
function studioSidebar(selectedId: string, onItemClick: (id: StudioPageId) => void) {
  const sections: SidebarSection[] = [{ items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "team", label: "Team", icon: "icon-users-line" },
    // A one-item group loses its title: Billing joins the list.
    { id: "billing", label: "Billing", icon: "icon-credit-card-line" },
  ] }];
  return (
    <Sidebar
      // The mark is a 2xs Thumbnail, sized for the 24px header slot, so it stays inside it at every density.
      logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
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

/** A titled list on the page: Heading/Subheading over its rows, in a Shadow ListBox beside the default Sidebar. On a
 *  phone the rows get `narrow`, so they can leave their Badge to the page the row opens and keep the title readable. */
function Section({ label, children }: { label: string; children: (narrow: boolean) => ReactNode }) {
  const id = useId();
  const narrow = useZen()?.breakpoint === "mobile";
  return (
    <ListBox as="section" theme="shadow" aria-labelledby={id} header={<Heading level={2} id={id} textStyle="Heading/Subheading">{label}</Heading>}>
      <List aria-labelledby={id}>{children(narrow)}</List>
    </ListBox>
  );
}
const Pair = ({ children }: { children: ReactNode }) => <Grid columns={2} stackBelow={720} gap="md" align="start">{children}</Grid>;

/** What a page shows: its PageHeader (the header’s Main row) and its Body. */
type View = { title: string; eyebrow?: ReactNode; description?: ReactNode; meta?: ReactNode; actions?: ReactNode; body: ReactNode };
/** The page title takes focus (titleRef) when what was focused leaves with a banner. */
const pageHeader = ({ title, eyebrow, description, meta, actions }: View, titleRef: Ref<HTMLSpanElement>) => (
  <PageHeader title={<span ref={titleRef} tabIndex={-1}>{title}</span>} eyebrow={eyebrow} description={description} meta={meta} actions={actions} />
);

/** The pages every studio screen shares: Home, Projects and Team. */
function sharedView(page: StudioPageId): View {
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
                trailing={projectBadge(project)} />
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

// ——— One banner at a time ——————————————————————————————————————————————————————————————————————————————————————————
const recentSignIns: { id: string; person: PersonId; device: string; at: Date }[] = [
  { id: "s1", person: "alex", device: "Chrome on macOS", at: daysFromToday(0, 8, 2) },
  { id: "s2", person: "chi", device: "Zen for iPhone", at: daysFromToday(0, 7, 41) },
  { id: "s3", person: "finn", device: "Firefox on Windows", at: daysFromToday(-1, 22, 15) },
];

type Notice = { theme: AlertBannerTheme; message: string; action?: { label: string; onClick: () => void }; onClose?: () => void };

export default function OneBanner() {
  const { toast } = useToast();
  const [page, setPage] = useState<StudioPageId>("settings");
  const [figma, setFigma] = useState(false);
  const [slack, setSlack] = useState(true);
  const [twoStep, setTwoStep] = useState(false);
  const [maintenanceHidden, setMaintenanceHidden] = useState(false);
  // After a banner action focus never lands on <body>: Reconnect stays focused as it turns into the next banner's Set up;
  // when the banner's button leaves with it, focus moves to the page title, and closing the notice focuses Show notice
  // again (and back).
  const titleRef = useRef<HTMLSpanElement>(null);
  const showAgainRef = useRef<HTMLButtonElement>(null);
  const focusTitle = () => setTimeout(() => titleRef.current?.focus());

  // The most severe open condition wins the one banner slot: broken (Negative) → upcoming (Warning) → news (Info).
  const reconnect = () => { setFigma(true); toast({ title: "Figma reconnected" }); };
  const setUpTwoStep = () => { setTwoStep(true); focusTitle(); toast({ title: "Two-step sign-in turned on" }); };
  const hideMaintenance = () => { setMaintenanceHidden(true); setTimeout(() => showAgainRef.current?.focus()); };
  const showNoticeAgain = () => { setMaintenanceHidden(false); focusTitle(); };
  const notice: Notice | null = !figma
    ? { theme: "negative", message: "Figma sync stopped. Designs on tasks won’t update until you reconnect.", action: { label: "Reconnect", onClick: reconnect } }
    : !twoStep
      ? { theme: "warning", message: "Two-step sign-in is required from Oct 12. Set it up now to keep access.", action: { label: "Set up", onClick: setUpTwoStep } }
      : !maintenanceHidden
        ? { theme: "info", message: "Zen is down for maintenance on Sunday, Oct 4, 2:00–3:00 am.", onClose: hideMaintenance }
        : null;

  const view: View = page === "settings" ? {
    title: "Settings",
    description: `Connections and sign-in for ${studio.name}`,
    actions: maintenanceHidden ? <Button ref={showAgainRef} level="tertiary" startIcon="icon-bell-01-line" onClick={showNoticeAgain}>Show notice again</Button> : undefined,
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
    <AppShell
      banner={notice ? <AlertBanner theme={notice.theme} action={notice.action} onClose={notice.onClose}>{notice.message}</AlertBanner> : undefined}
      sidebar={studioSidebar(page, setPage)}
      header={<AppShellHeader actions={<AccountMenu onSettings={() => setPage("settings")} />} main={pageHeader(view, titleRef)} />}
    >
      {view.body}
    </AppShell>
  );
}
