import { useId, useRef, useState, type ReactNode } from "react";
import {
  AlertBanner, AppShell, AppShellAccount, AppShellHeader, Avatar, Badge, BadgeStatus, Button, Card, DescriptionList, DockIcon, Form, FormActions,
  FormFieldset, Grid, Heading, List, ListBox, ListItem, Menu, PageHeader, RadioButton, Sidebar, SidebarMenuItem, Stack, Text, Thumbnail, plural, useToast,
  useZen, type SidebarSection,
} from "@zen-ds/react";
import {
  TODAY, activity, daysFromToday, formatDate, formatDue, formatMoney, formatRange, formatRelative, formatTime, initials, me, people, plans, projectById,
  projectProgress, projectStep, projects, studio, taskStep, tasks, workspacePlan, type Person, type PersonId, type Project, type TaskStatus,
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

/** The studio’s Sidebar: the same destinations on every screen; `billingDot` marks Billing while a payment waits. */
function studioSidebar(selectedId: string, onItemClick: (id: StudioPageId) => void, billingDot = false) {
  const sections: SidebarSection[] = [{ items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "team", label: "Team", icon: "icon-users-line" },
    // A one-item group loses its title: Billing joins the list.
    { id: "billing", label: "Billing", icon: "icon-credit-card-line", notificationDot: billingDot },
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
const pageHeader = ({ title, eyebrow, description, meta, actions }: View) => <PageHeader title={title} eyebrow={eyebrow} description={description} meta={meta} actions={actions} />;

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

// ——— The failed payment ———————————————————————————————————————————————————————————————————————————————————————————
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

export default function PaymentFailed() {
  const { toast } = useToast();
  const [page, setPage] = useState<StudioPageId>("home");
  const [cardId, setCardId] = useState("mastercard");
  const [paid, setPaid] = useState(false);
  const paymentHeading = useRef<HTMLHeadingElement>(null);
  const receiptButton = useRef<HTMLButtonElement>(null);
  const paymentId = useId();
  const phone = useZen()?.breakpoint === "mobile";
  const card = payCards.find((item) => item.id === cardId)!;

  // The banner’s action leads to the fix: the Billing page, with focus on the payment that failed.
  const openBilling = () => { setPage("billing"); setTimeout(() => paymentHeading.current?.focus()); };
  // Paying swaps the form for the receipt: focus moves to Download receipt.
  const pay = () => {
    setPaid(true);
    setTimeout(() => receiptButton.current?.focus());
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
          // The plan Badge leads the row’s utilities (not on a phone); the account menu ends it.
          actions={<>
            {phone ? null : <Badge theme="accent" background="subtle">{`${plan.name} plan`}</Badge>}
            <AccountMenu onSettings={() => setPage("settings")} />
          </>}
          main={pageHeader(view)}
        />
      )}
    >
      {view.body}
    </AppShell>
  );
}
