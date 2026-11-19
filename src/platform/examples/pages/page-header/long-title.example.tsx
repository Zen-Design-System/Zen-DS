import { Fragment, useId, useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, BadgeStatus, Button, Card, DescriptionList, DockIcon, Grid, Heading, IconButton,
  InputField, List, ListBox, ListItem, Menu, ModalForm, PageHeader, Sidebar, SidebarMenuItem, Stack, Text, Thumbnail, plural, useFormState, useToast,
  type SidebarItem, type SidebarSection,
} from "@zen-ds/react";
import { activity, formatDate, formatMoney, formatRange, me, people, projectStep, studio, type ProjectStatus } from "../../data";

/** A row caption of whole values: it wraps between values, never inside a date or a name; each "· " stays with the value it introduces, so no line ends on a dot. */
const wholeValues = (...values: (string | false)[]) => values.filter((value): value is string => Boolean(value)).map((value, index) => (
  <Fragment key={`${index}:${value}`}>{index ? " " : null}{whole(`${index ? "· " : ""}${value}`)}</Fragment>
));
/** A run of words that never breaks: its spaces are no-break spaces. */
const whole = (text: string) => text.replace(/ /g, " ");

// ——— The app around the page ————————————————————————————————————————————————————————————————————————
/* Đìzai Studio's navigation: the same Sidebar on every page, its current page selected. */
const studioNav: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "clients", label: "Clients", icon: "icon-briefcase-line" },
    { id: "people", label: "People", icon: "icon-users-line" },
    { id: "time-off", label: "Time off", icon: "icon-calendar-line" },
  ] },
  { label: "Finance", items: [
    { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
    { id: "claims", label: "Expense claims", icon: "icon-wallet-02-line" },
  ] },
];
const unreadActivity = activity.filter((item) => item.unread);
const firstUnread = unreadActivity[0];

/**
 * One page of the studio's app: the AppShell (Layout=Sidebar, the toggle at the start of the header's top row) with the
 * Sidebar on the current page, the top row's utilities (an optional Search at its start, Notifications, the account
 * last) and the page's PageHeader as the header's Main row. The Body pads the page margins itself. `onNavigate` takes the
 * Sidebar rows the example can show (true when it did); any other row says it is not part of this example.
 */
function StudioApp({ here, onNavigate, leading, main, children }: {
  here: string; onNavigate?: (id: string) => boolean; leading?: ReactNode; main: ReactNode; children: ReactNode;
}) {
  const { toast } = useToast();
  const [unread, setUnread] = useState(unreadActivity.length);
  const goTo = (id: string, label: string) => {
    if (onNavigate?.(id) || id === here) return;
    toast({ title: `${label} isn’t part of this example`, children: "Each example on this page is one page of the studio’s app." });
  };
  const readAll = () => {
    toast(unread
      ? { title: plural(unread, "new notification"), children: `${people[firstUnread.actor].name} ${firstUnread.verb} “${firstUnread.object}”${unread > 1 ? `, and ${unread - 1} more` : ""}.` }
      : { title: "No new notifications", children: "You’re all caught up." });
    setUnread(0);
  };
  return (
    <AppShell
      sidebar={(
        // The logo slot is 24px tall: the mark is a 2xs Thumbnail that fits it at every density.
        <Sidebar logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
          logoCollapsed={<Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />}
          sections={studioNav} selectedId={here} onItemClick={(item: SidebarItem) => goTo(item.id, item.label)}
          footer={<>
            <SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />
            <SidebarMenuItem id="help" label="Help" icon="icon-help-circle-line" />
          </>} />
      )}
      header={(
        <AppShellHeader
          // The top row: utilities only (the page's actions are in its PageHeader).
          leading={leading}
          actions={<>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={readAll} />
            <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
              { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
              { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => goTo("settings", "Settings") },
              { type: "separator" },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: `See you soon, ${me.name.split(" ")[0]}.` }) },
            ]} />
          </>}
          // The Main row: the page's own header, its h1.
          main={main}
        />
      )}
    >
      {children}
    </AppShell>
  );
}

// ——— A long title ———————————————————————————————————————————————————————————————————————————————————
const phaseTwo = {
  title: "Lumen Bank online banking, phase 2: transfers, savings goals and card controls",
  from: new Date(2026, 9, 12), to: new Date(2027, 1, 26), lead: people.alex, budget: 118000,
};
/* The three workstreams the long title names. */
const workstreams = [
  { id: "transfers", name: "Transfers", lead: people.ava, from: new Date(2026, 9, 12), to: new Date(2026, 10, 27), icon: "icon-switch-horizontal-01-line", theme: "blue" },
  { id: "savings", name: "Savings goals", lead: people.chi, from: new Date(2026, 10, 2), to: new Date(2027, 0, 15), icon: "icon-piggy-bank-line", theme: "green" },
  { id: "cards", name: "Card controls", lead: people.finn, from: new Date(2026, 11, 7), to: new Date(2027, 1, 26), icon: "icon-credit-card-lock-line", theme: "purple" },
] as const;
const projectBadge = (status: ProjectStatus) => <BadgeStatus status={projectStep[status]}>{status}</BadgeStatus>;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function LongTitlePage() {
  const { toast } = useToast();
  const [status, setStatus] = useState<ProjectStatus>("Planning");
  const [dialog, setDialog] = useState<"share" | "task" | null>(null);
  const overviewId = useId();
  const scopeId = useId();
  const hold = () => {
    const before = status;
    setStatus(before === "On hold" ? "Planning" : "On hold");
    toast({ title: before === "On hold" ? "Project resumed" : "Project put on hold", action: { label: "Undo", onClick: () => setStatus(before) } });
  };
  // Share and New task: one field each; a submit checks it, closes the dialog and confirms with a toast.
  const share = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email }) => ({
      email: !email.trim() ? "Enter an email address" : !emailPattern.test(email.trim()) ? "Enter a valid email address, like name@company.com" : undefined,
    }),
    onSubmit: ({ email }, { reset }) => {
      setDialog(null);
      reset();
      toast({ type: "positive", title: `Project shared with ${email.trim()}` });
    },
  });
  const newTask = useFormState<{ name: string }>({
    initialValues: { name: "" },
    validate: ({ name }) => ({ name: name.trim() ? undefined : "Enter a task name" }),
    onSubmit: (_values, { reset }) => {
      setDialog(null);
      reset();
      toast({ type: "positive", title: "Task created" });
    },
  });
  return (
    <StudioApp here="projects"
      main={(
        // The title wraps (never truncates) and the actions keep their row beside it; when there is no room they wrap
        // under the title. Share, then More with the less frequent actions, then the Primary; on a phone the Primary
        // moves first and More still ends the row.
        <PageHeader title={phaseTwo.title} meta={projectBadge(status)}
          description={`Lumen Bank · ${formatRange(phaseTwo.from, phaseTwo.to)} · Led by ${phaseTwo.lead.name}`}
          actions={<>
            <Button level="tertiary" onClick={() => setDialog("share")}>Share</Button>
            <Menu align="end" trigger={<IconButton level="tertiary" icon="icon-dots-horizontal-line" aria-label="More actions" />} items={[
              { id: "link", label: "Copy link", icon: "icon-link-01-line", onSelect: () => { void navigator.clipboard?.writeText(`https://${studio.domain}/projects/lumen-phase-2`).catch(() => null); toast({ title: "Link copied" }); } },
              { id: "duplicate", label: "Duplicate project", icon: "icon-copy-line", onSelect: () => toast({ title: "Project duplicated", children: `Copy of ${phaseTwo.title}` }) },
              { type: "separator" },
              { id: "hold", label: status === "On hold" ? "Resume project" : "Put on hold", icon: "icon-pause-circle-line", onSelect: hold },
            ]} />
            <Button level="primary" onClick={() => setDialog("task")}>New task</Button>
          </>} />
      )}
    >
      <Grid columns={2} stackBelow={720} gap="md" align="start">
        <Card as="section" theme="shadow" aria-labelledby={overviewId}>
          <Stack gap="md">
            <Heading level={2} id={overviewId} textStyle="Heading/Subheading">Overview</Heading>
            <DescriptionList items={[
              { term: "Client", description: "Lumen Bank" },
              { term: "Lead", description: phaseTwo.lead.name },
              { term: "Starts", description: formatDate(phaseTwo.from) },
              { term: "Ends", description: formatDate(phaseTwo.to) },
              { term: "Budget", description: formatMoney(phaseTwo.budget) },
            ]} />
          </Stack>
        </Card>
        <ListBox as="section" theme="shadow" aria-labelledby={scopeId}
          header={<Heading level={2} id={scopeId} textStyle="Heading/Subheading">Scope</Heading>}>
          <List aria-labelledby={scopeId}>
            {workstreams.map((stream) => (
              <ListItem key={stream.id} title={stream.name} caption={wholeValues(stream.lead.name, formatRange(stream.from, stream.to))}
                leading={<DockIcon icon={stream.icon} theme={stream.theme} background="subtle" />}
                onClick={() => toast({ title: stream.name, children: `${stream.lead.name} leads it · starts ${formatDate(stream.from)}` })} />
            ))}
          </List>
        </ListBox>
      </Grid>
      <ModalForm open={dialog === "share"} onOpenChange={(open) => { setDialog(open ? "share" : null); if (!open) share.reset(); }} title="Share project"
        onSubmit={share.handleSubmit} primaryAction={{ label: "Share project" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email address" type="email" autoComplete="off" placeholder="name@lumenbank.com" data-autofocus="" {...share.field("email")} />
      </ModalForm>
      <ModalForm open={dialog === "task"} onOpenChange={(open) => { setDialog(open ? "task" : null); if (!open) newTask.reset(); }} title="New task"
        onSubmit={newTask.handleSubmit} primaryAction={{ label: "Create task" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Task name" autoComplete="off" placeholder="Plan the savings goals research" data-autofocus="" {...newTask.field("name")} />
      </ModalForm>
    </StudioApp>
  );
}
