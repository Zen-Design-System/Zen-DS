import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ComponentType, type ReactNode, type Ref } from "react";
import { AlertBanner } from "../../components/AlertBanner";
import { AppShell, AppShellAccount, AppShellAction } from "../../components/AppShell";
import { Avatar, AvatarStack } from "../../components/Avatar";
import { Badge, BadgeCounter } from "../../components/Badge";
import { BottomNavigation, type BottomNavigationItem } from "../../components/BottomNavigation";
import { BottomSheet } from "../../components/BottomSheet";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { Button, IconButton } from "../../components/Button";
import { Card } from "../../components/Card";
import { Checkbox } from "../../components/Checkbox";
import { DescriptionList } from "../../components/DescriptionList";
import { ModalForm } from "../../components/Dialog";
import { EmptyState } from "../../components/EmptyState";
import { FormFieldset, useFormState, type FormState } from "../../components/Form";
import { DateField } from "../../components/Input";
import { Container, Grid, Stack } from "../../components/Layout";
import { List, ListItem } from "../../components/ListItem";
import { Menu, type MenuEntry } from "../../components/Menu";
import { MetricCard } from "../../components/MetricWidget";
import { PageHeader } from "../../components/PageHeader";
import { ProgressBar } from "../../components/Progress";
import { RadioButton } from "../../components/RadioButton";
import { ZenProvider } from "../../components/Provider";
import { Search } from "../../components/Search";
import { SidePanel } from "../../components/SidePanel";
import { Sidebar, type SidebarSection } from "../../components/Sidebar";
import { Table, TableActions, TableBadges, TableMedia, TableText } from "../../components/Table";
import { TopNavigation } from "../../components/TopNavigation";
import { Heading, Text, plural } from "../../components/Text";
import { useToast, type ToastOptions } from "../../components/Toast";
import { VisuallyHidden } from "../../components/VisuallyHidden";
import { HrRouterContext, hrModules, type HrNavigate } from "../../templates/hr/HrShell";
import { HrHomeTemplate } from "../../templates/hr/HrHomeTemplate";
import { HrMyLeavesTemplate } from "../../templates/hr/HrMyLeavesTemplate";
import { HrLeaveTypesTemplate } from "../../templates/hr/HrLeaveTypesTemplate";
import { HrPublicHolidayTemplate } from "../../templates/hr/HrPublicHolidayTemplate";
import { HrExpenseOverviewTemplate } from "../../templates/hr/HrExpenseOverviewTemplate";
import { HrMyExpensesTemplate } from "../../templates/hr/HrMyExpensesTemplate";
import { HrTasksTemplate } from "../../templates/hr/HrTasksTemplate";
import { PlatformPhone } from "../PlatformPhone";
import { DemoFieldDialog } from "../PlatformDemoActions";
import { GroupLabel, KindMark, PersonAvatar, ThingMark, kindEmoji, kindLabel, me, requestBadge, staff, statusBadge, type LeaveKind, type Person, type RequestStatus } from "./hrDemo";

/*
 * App Shell examples (platform only): every shell is a screen of the HR-Platform product in Figma (◆ HR-Platform), with
 * the same workspace, people and requests, so each example shows one AppShell feature inside a real page.
 */

/** A preview frame: the shell fills it instead of the viewport (see shell.css), and the drawer covers only the frame. */
function Frame({ children, height = 560, frameRef }: { children: ReactNode; height?: number; frameRef?: Ref<HTMLDivElement> }) {
  // The app inside follows the window's breakpoint, as it would in a browser: at 390 the HR pages take their phone layouts.
  return (
    <div ref={frameRef} className="pash-frame" style={{ height }}>
      <div className="pash-frame__scroll"><ZenProvider breakpoint="auto" paint={false} portal={false}>{children}</ZenProvider></div>
    </div>
  );
}

/** In-app navigation swaps the page inside the frame: the new page starts at the top, and when the control that navigated
 *  went with the old page (a row, Back, a crumb), focus moves to the new page's <main>, as the AppShell drawer does,
 *  instead of falling to <body>. Pass the returned ref to the Frame. */
function usePageChange(page: string) {
  const frameRef = useRef<HTMLDivElement>(null);
  const shown = useRef(page);
  useEffect(() => {
    if (shown.current === page) return;
    shown.current = page;
    const frame = frameRef.current;
    frame?.querySelector(".pash-frame__scroll")?.scrollTo({ top: 0 });
    if (!document.activeElement || document.activeElement === document.body) frame?.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
  }, [page]);
  return frameRef;
}

/** toast() whose one action (Undo, View) also closes the toast once it ran. */
function useActionToast() {
  const { toast, dismiss } = useToast();
  return useCallback((options: ToastOptions & { action: { label: string; onClick: () => void } }) => {
    const id = toast({ ...options, action: { ...options.action, onClick: () => { options.action.onClick(); dismiss(id); } } });
  }, [toast, dismiss]);
}

/** After a toast's View: the page it opens takes focus (the toast and its button are gone). */
const focusMain = (frameRef: { current: HTMLElement | null }) => requestAnimationFrame(() => frameRef.current?.querySelector<HTMLElement>("main")?.focus({ preventScroll: true }));

/** Pages a demo does not build answer like the HR templates: "<Page> isn't part of this demo" (navigation that leaves the
 *  screen, so a toast is enough). */
function useNotInDemo() {
  const { toast } = useToast();
  return useCallback((label: string) => { toast({ title: `${label} isn't part of this demo` }); }, [toast]);
}

/** One elevation per screen, set by the Sidebar: the default Sidebar (Surface + shadow) on the grey Canvas takes Shadow
 *  cards; an Alt or Flat Sidebar on a white or flat Canvas takes bordered cards. Each example picks one combination. */
type CardElevation = "shadow" | "border";
const CardElevationContext = createContext<CardElevation>("shadow");

const accountItems: MenuEntry[] = [
  { id: "profile", label: "My profile", icon: "icon-user-square-line" },
  { id: "preferences", label: "Preferences", icon: "icon-settings-01-line" },
  { type: "separator" },
  { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line" },
];

function Account() {
  const { toast } = useToast();
  return <Menu align="end" trigger={<AppShellAccount name="Alex Duong" theme="blue" />} items={accountItems} onSelect={(item) => toast({ title: item.id === "sign-out" ? "Signed out of the demo" : `${item.label} opened` })} />;
}

/** Figma Header-Content: the workspace (Avatar Square Small, name over email) and its switcher. */
function WorkspaceBrand() {
  const { toast } = useToast();
  return (
    <Stack direction="row" gap="xs" align="center" style={{ width: "100%" }}>
      <Avatar size="small" shape="square" theme="blue" background="subtle" alt="">ĐS</Avatar>
      <Stack gap="none" style={{ minWidth: 0, flex: 1 }}>
        <Text as="span" textStyle="Body/Base/Bold" truncate>Đìzai Studio</Text>
        <Text as="span" textStyle="Caption/Regular" tone="light" truncate>hello@dizai.studio</Text>
      </Stack>
      <IconButton appearance="flat" level="primary" size="sm" aria-label="Switch workspace" icon="icon-chevron-selector-vertical-line" onClick={() => toast({ title: "Workspaces", children: "Đìzai Studio is the only workspace in this demo." })} />
    </Stack>
  );
}
const workspaceMark = <Avatar size="small" shape="square" theme="blue" background="subtle" alt="Đìzai Studio">ĐS</Avatar>;

/** A card with a titled section: h2 in Heading/Subheading under the page's h1 (typography ladder). */
function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const theme = useContext(CardElevationContext);
  return (
    <Card theme={theme}>
      <Stack gap="sm">
        <Stack direction="row" gap="sm" align="center" justify="between">
          <Heading level={2} textStyle="Heading/Subheading">{title}</Heading>
          {action}
        </Stack>
        {children}
      </Stack>
    </Card>
  );
}

type MyRequest = { id: string; kind: LeaveKind; dates: string; days: number; status: RequestStatus };
const myRequestsSeed: MyRequest[] = [
  { id: "m1", kind: "annual", dates: "Oct 14 – Oct 15", days: 2, status: "pending" },
  { id: "m2", kind: "remote", dates: "Sep 18", days: 1, status: "approved" },
  { id: "m3", kind: "sick", dates: "Aug 4", days: 1, status: "approved" },
  { id: "m4", kind: "annual", dates: "Jul 21 – Jul 25", days: 5, status: "rejected" },
];

function RequestList({ requests, label = "My requests" }: { requests: MyRequest[]; label?: string }) {
  return (
    <List aria-label={label}>
      {requests.map((request) => (
        <ListItem key={request.id} title={kindLabel[request.kind]} caption={`${request.dates} · ${plural(request.days, "day")}`} leading={<KindMark kind={request.kind} />}
          trailing={<Badge size="sm" theme={requestBadge[request.status].theme} background="subtle">{requestBadge[request.status].label}</Badge>} />
      ))}
    </List>
  );
}

/** Days left per type before the requests sent in the demo (annual: 15 − 4 taken); remote work has no balance. */
const leftBase: Partial<Record<LeaveKind, number>> = { annual: 11, sick: 11, unpaid: 5 };
const daysLeft = (kind: LeaveKind, requests: MyRequest[]) => {
  const base = leftBase[kind];
  if (base === undefined) return undefined;
  return base - requests.filter((request) => request.id.startsWith("sent-") && request.kind === kind).reduce((sum, request) => sum + request.days, 0);
};

function BalanceCards({ requests }: { requests: MyRequest[] }) {
  const theme = useContext(CardElevationContext);
  return (
    <Grid columns="repeat(auto-fit, minmax(min(100%, 180px), 1fr))" gap="sm">
      <MetricCard theme={theme} size="md" label="Annual leave" value={plural(daysLeft("annual", requests) ?? 0, "day")} iconTheme="emoji" iconEmoji="🏝️" />
      <MetricCard theme={theme} size="md" label="Sick leave" value={plural(daysLeft("sick", requests) ?? 0, "day")} iconTheme="emoji" iconEmoji="🤒" />
      <MetricCard theme={theme} size="md" label="Unpaid leave" value={plural(daysLeft("unpaid", requests) ?? 0, "day")} iconTheme="emoji" iconEmoji="🥵" />
    </Grid>
  );
}

/* Request leave: one form for every HR screen here (a dialog on desktop, a Bottom Sheet on the phone), in the HR
   template's words (Request leave · Send request · Leave request sent). */
type LeaveDraft = { kind: string; start: string; end: string };
const leaveKinds: LeaveKind[] = ["annual", "sick", "unpaid", "remote"];
/** DateField text (MM/DD/YYYY, typed or picked) → a date, or null while it is incomplete or not a real day. */
const parseDay = (text: string) => {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const date = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
  return date.getMonth() === Number(match[1]) - 1 ? date : null;
};
/** Working days from → to, both included (weekends skipped). */
const workingDays = (from: Date, to: Date) => {
  let days = 0;
  for (const day = new Date(from); day <= to; day.setDate(day.getDate() + 1)) if (day.getDay() % 6 !== 0) days += 1;
  return days;
};
const shortDate = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Validated like the HR template: real MM/DD/YYYY dates, the last day on or after the first, at least one working day and
 *  no more days than are left. `onSent` gets the new Pending request. */
function useLeaveForm(requests: MyRequest[], onSent: (request: MyRequest) => void) {
  return useFormState<LeaveDraft>({
    initialValues: { kind: "annual", start: "", end: "" },
    validate: (values) => {
      const start = parseDay(values.start);
      const end = parseDay(values.end);
      const days = start && end && end >= start ? workingDays(start, end) : 0;
      const left = daysLeft(values.kind as LeaveKind, requests);
      return {
        start: !values.start.trim() ? "Enter the first day, like 10/12/2026" : !start ? "Enter the date as MM/DD/YYYY" : undefined,
        end: !values.end.trim() ? "Enter the last day, like 10/14/2026" : !end ? "Enter the date as MM/DD/YYYY"
          : start && end < start ? "Pick a day on or after the first day"
            : start && !days ? "Include at least one working day"
              : left !== undefined && days > left ? `You have ${plural(left, "day")} left: pick fewer days or another type` : undefined,
      };
    },
    onSubmit: (values, { reset }) => {
      const start = parseDay(values.start) as Date;
      const end = parseDay(values.end) as Date;
      const dates = start.getTime() === end.getTime() ? shortDate(start) : `${shortDate(start)} – ${shortDate(end)}`;
      onSent({ id: `sent-${Date.now()}`, kind: values.kind as LeaveKind, dates, days: workingDays(start, end), status: "pending" });
      reset();
    },
  });
}

/** The type is a radio group (four short choices, all visible): it also takes the form's first focus, so the dates'
 *  calendar does not open over the form as it appears. */
function LeaveFields({ form, requests }: { form: FormState<LeaveDraft>; requests: MyRequest[] }) {
  const left = daysLeft(form.values.kind as LeaveKind, requests);
  return <>
    <FormFieldset legend="Leave type" kind="radio" direction="row" helpText={left === undefined ? "Remote days have no balance" : `${plural(left, "day")} left`}>
      {leaveKinds.map((kind) => <RadioButton key={kind} label={kindLabel[kind]} {...form.radioField("kind", kind)} />)}
    </FormFieldset>
    <Grid columns="repeat(auto-fit, minmax(min(100%, 160px), 1fr))" gap="md" align="start">
      <DateField label="First day" {...form.dateField("start")} />
      <DateField label="Last day" {...form.dateField("end")} />
    </Grid>
  </>;
}

/** Request leave on a desktop screen: Cancel, Escape and the scrim drop the draft, and focus returns to the button. */
function LeaveRequestDialog({ open, onOpenChange, form, requests }: { open: boolean; onOpenChange: (open: boolean) => void; form: FormState<LeaveDraft>; requests: MyRequest[] }) {
  return (
    <ModalForm open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) form.reset(); }} title="Request leave" description="Duy Le, your manager, gets it for approval."
      onSubmit={form.handleSubmit} primaryAction={{ label: "Send request" }} secondaryAction={{ label: "Cancel" }}>
      <LeaveFields form={form} requests={requests} />
    </ModalForm>
  );
}

function PeopleTable({ rows, empty }: { rows: typeof staff; empty?: ReactNode }) {
  return (
    <Table aria-label="People" rows={rows} getRowId={(row) => row.id} empty={empty}
      columns={[
        { id: "name", header: "Employee", cell: (row) => <TableMedia media={<PersonAvatar person={row} />} caption={row.email}>{row.name}</TableMedia> },
        { id: "team", header: "Team", cell: (row) => <TableText caption={row.role}>{row.department}</TableText> },
        { id: "office", header: "Office", cell: (row) => <TableText>{row.location}</TableText> },
        { id: "status", header: "Status", cell: (row) => <TableBadges><Badge size="sm" theme={statusBadge[row.status].theme} background="subtle">{statusBadge[row.status].label}</Badge></TableBadges> },
      ]} />
  );
}

/* ───────────── 1 · HR workspace: the HR templates linked into one app ───────────── */

const hrRoutes: Record<string, ComponentType> = {
  home: HrHomeTemplate,
  "time-off/my-leaves": HrMyLeavesTemplate,
  "time-off/leave-types": HrLeaveTypesTemplate,
  "time-off/public-holiday": HrPublicHolidayTemplate,
  "expenses/overviews": HrExpenseOverviewTemplate,
  "expenses/my-expenses": HrMyExpensesTemplate,
  "workbench/tasks": HrTasksTemplate,
};
const moduleStart = { "time-off": "my-leaves", expenses: "overviews", workbench: "tasks" } as const;

export function HrWorkspaceExample() {
  const notInDemo = useNotInDemo();
  const [route, setRoute] = useState("time-off/my-leaves");
  const frameRef = usePageChange(route);
  const navigate = useCallback<HrNavigate>((target) => {
    if (target.module === "home") { setRoute("home"); return; }
    const page = target.page ?? moduleStart[target.module];
    const key = `${target.module}/${page}`;
    if (hrRoutes[key]) { setRoute(key); return; }
    // A group with pages under it (Time off › Configurations) only expands in the Sidebar; any other page answers, like
    // the templates do, instead of a click that does nothing.
    const item = hrModules[target.module].sections.flatMap((section) => section.items.flatMap((entry) => [entry, ...(entry.children ?? [])])).find((entry) => entry.id === page);
    if (!item?.children?.length) notInDemo(item?.label ?? hrModules[target.module].title);
  }, [notInDemo]);
  const Page = hrRoutes[route];
  return <Frame height={680} frameRef={frameRef}><HrRouterContext.Provider value={navigate}><Page key={route} /></HrRouterContext.Provider></Frame>;
}

/* ───────────── 2 · People admin: a Search leads the top bar ───────────── */

const peopleNav: SidebarSection[] = [
  { items: [
    { id: "directory", label: "Directory", icon: "icon-users-line" },
    { id: "teams", label: "Teams", icon: "icon-building-02-line" },
    { id: "onboarding", label: "Onboarding", icon: "icon-user-plus-line", counter: 2 },
    { id: "org-chart", label: "Org chart", icon: "icon-dataflow-03-line" },
  ] },
  { label: "Settings", items: [
    { id: "roles", label: "Roles & access", icon: "icon-shield-tick-line" },
  ] },
];
const giang: Person = { ...staff[2], id: "EMP-0211", name: "Giang Vo", initials: "GV", theme: "orange", role: "People Partner", department: "People & Ops", status: "onboarding", start: "Oct 6, 2026", email: "giang.vo@dizai.studio" };
const teams = [
  { id: "design", name: "Design", lead: "Ava Chen", people: 9, members: [staff[0], staff[2]] },
  { id: "engineering", name: "Engineering", lead: "Hai Do", people: 21, members: [staff[1], staff[4], staff[3]] },
  { id: "product", name: "Product", lead: "Duy Le", people: 6, members: [staff[3], staff[0]] },
  { id: "people-ops", name: "People & Ops", lead: "Giang Vo", people: 5, members: [giang] },
];
const onboardingSteps = ["Sign the contract", "Set up the laptop", "Create the work accounts", "Meet the team", "Welcome lunch", "First-week check-in"];
const newHires = [
  { id: "em", person: staff[4], start: "Started Sep 22" },
  { id: "giang", person: giang, start: "Starts Oct 6" },
];
/** Someone invited by email (Add employee): Onboarding from today, in the New hires team until a manager places them. */
const invitee = (email: string, count: number): Person => {
  const name = email.split("@")[0].split(/[._-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ") || email;
  const initials = name.split(" ").map((part) => part.charAt(0)).join("").slice(0, 2).toUpperCase();
  return { id: `EMP-NEW-${count}`, name, initials, theme: "teal", role: "Invited", department: "New hires", status: "onboarding", start: "Sep 30, 2026", email, phone: "Not added yet", manager: "Alex Duong", location: "Ho Chi Minh City", annual: 0, sick: 0 };
};

export function PeopleAdminExample() {
  const cardTheme: CardElevation = "border";
  const { toast } = useToast();
  const notInDemo = useNotInDemo();
  const searchRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState("directory");
  const frameRef = usePageChange(page);
  const [query, setQuery] = useState("");
  const [unseen, setUnseen] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [invited, setInvited] = useState<Person[]>([]);
  const [teamList, setTeamList] = useState(teams);
  const [creatingTeam, setCreatingTeam] = useState(false);
  // Each new hire's checklist: the steps done so far (the row opens it in a panel).
  const [done, setDone] = useState<Record<string, string[]>>({ em: onboardingSteps.slice(0, 3), giang: onboardingSteps.slice(0, 1) });
  const [hireId, setHireId] = useState<string | null>(null);
  const hire = newHires.find((entry) => entry.id === hireId);
  const people = [...invited, ...staff, giang];
  const term = query.trim().toLowerCase();
  const rows = people.filter((person) => `${person.name} ${person.role} ${person.department}`.toLowerCase().includes(term));
  const headcount = 48 + invited.length;
  const go = (id: string) => {
    const item = peopleNav.flatMap((section) => section.items).find((entry) => entry.id === id);
    if (id === "org-chart" || id === "roles") notInDemo(item?.label ?? "This page");
    else setPage(id);
  };
  // A team's people: the Directory, searched for the team.
  const viewTeam = (name: string) => { setQuery(name); setPage("directory"); };
  return (
    <CardElevationContext.Provider value={cardTheme}>
      <Frame height={640} frameRef={frameRef}>
      <AppShell canvas="alt" mainId="pash-people-main"
        sidebar={<Sidebar background="flat" divider aria-label="People navigation" brand={<WorkspaceBrand />} sections={peopleNav} selectedId={page} onItemClick={(item) => go(item.id)} />}
        header={<Search ref={searchRef} aria-label="Search people" placeholder="Search people, roles or teams" value={query} onValueChange={(value) => { setQuery(value); setPage("directory"); }} />}
        headerActions={<>
          <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" dot={unseen} onClick={() => { setUnseen(false); toast({ title: "Giang Vo accepted the offer", children: "Starts Oct 6 · People & Ops" }); }} />
          <Account />
        </>}
      >
        <Container>
          <Stack gap="xl" className="pash-page">
            {page === "directory" ? <>
              <PageHeader title="Directory" meta={<BadgeCounter value={headcount} />} description="Everyone at Đìzai Studio, across 3 offices."
                actions={<><Button level="tertiary" onClick={() => toast({ type: "positive", title: `Exported ${plural(headcount, "person", "people")} as CSV` })}>Export</Button><Button level="primary" startIcon="icon-plus-line" onClick={() => setInviting(true)}>Add employee</Button></>} />
              <Grid columns="repeat(auto-fit, minmax(min(100%, 160px), 1fr))" gap="sm">
                <MetricCard theme={cardTheme} size="md" label="Headcount" value="48" icon="icon-users-line" trend={{ direction: "positive", label: "+3 in Sep" }} />
                <MetricCard theme={cardTheme} size="md" label="New hires" value="3" icon="icon-user-plus-line" iconTheme="accent" trend={{ direction: "normal", label: "This quarter" }} />
                <MetricCard theme={cardTheme} size="md" label="Out today" value="2" icon="icon-calendar-heart-line" trend={{ direction: "normal", label: "Bao, Chi" }} />
                <MetricCard theme={cardTheme} size="md" label="Open roles" value="4" icon="icon-flag-01-line" trend={{ direction: "negative", label: "2 overdue" }} />
              </Grid>
              {/* The directory is the page's content: its table sits straight on the page (usage rules §14). */}
              <Stack gap="xs">
                <PeopleTable rows={rows} empty={<EmptyState illustration={false} icon="icon-users-line" title="No one matches" secondaryAction={{ label: "Clear search", onClick: () => { setQuery(""); searchRef.current?.focus(); } }}>Try a name, a role or a team.</EmptyState>} />
                <Text as="span" textStyle="Body/Small/Regular" tone="light">{term ? plural(rows.length, "result") : `Showing ${rows.length} of ${plural(headcount, "person", "people")}`}</Text>
              </Stack>
            </> : null}
            {page === "teams" ? <>
              <PageHeader title="Teams" description={`${plural(teamList.length, "team")} · 41 people with a team`} actions={<Button level="primary" startIcon="icon-plus-line" onClick={() => setCreatingTeam(true)}>New team</Button>} />
              <Grid columns="repeat(auto-fit, minmax(min(100%, 240px), 1fr))" gap="md">
                {teamList.map((team) => (
                  <Card key={team.id} theme={cardTheme}>
                    <Stack gap="sm">
                      <Heading level={2} textStyle="Heading/Subheading">{team.name}</Heading>
                      <Text as="span" textStyle="Body/Small/Regular" tone="base">Lead: {team.lead} · {plural(team.people, "person", "people")}</Text>
                      {team.members.length ? (
                        <Stack direction="row" gap="sm" align="center" justify="between">
                          <AvatarStack max={3} items={team.members.map((member) => ({ theme: member.theme, alt: member.name, children: member.initials }))} />
                          <Button level="tertiary" size="sm" aria-label={`View the ${team.name} team`} onClick={() => viewTeam(team.name)}>View people</Button>
                        </Stack>
                      ) : <Text as="span" textStyle="Body/Small/Regular" tone="light">No members yet</Text>}
                    </Stack>
                  </Card>
                ))}
              </Grid>
            </> : null}
            {page === "onboarding" ? <>
              <PageHeader title="Onboarding" description="2 people are starting this month." />
              <Card theme={cardTheme} spacing="small">
                <List aria-label="New hires">
                  {newHires.map((entry) => {
                    const count = done[entry.id]?.length ?? 0;
                    return (
                      <ListItem key={entry.id} title={entry.person.name} caption={`${entry.person.role} · ${entry.start}`} leading={<PersonAvatar person={entry.person} size="medium" />}
                        selected={entry.id === hireId} onClick={() => setHireId(entry.id)}
                        trailing={<Badge size="sm" theme={count === onboardingSteps.length ? "green" : count > 2 ? "blue" : "neutral"} background="subtle">{`${count} of ${plural(onboardingSteps.length, "task")}`}</Badge>} />
                    );
                  })}
                </List>
              </Card>
            </> : null}
          </Stack>
        </Container>
      </AppShell>
      {/* A new hire's checklist: each tick saves at once and the row's count follows. */}
      <SidePanel type="modal" size="small" open={Boolean(hire)} onOpenChange={(open) => { if (!open) setHireId(null); }}
        title={hire ? `${hire.person.name}'s onboarding` : "Onboarding"} description={hire ? `${hire.person.role} · ${hire.start}` : undefined}>
        {hire ? <>
          <ProgressBar value={Math.round(((done[hire.id]?.length ?? 0) / onboardingSteps.length) * 100)} label={`${done[hire.id]?.length ?? 0} of ${onboardingSteps.length} tasks done`} />
          <Stack gap="sm" role="group" aria-label="Checklist">
            {onboardingSteps.map((step) => (
              <Checkbox key={step} label={step} checked={done[hire.id]?.includes(step) ?? false}
                onCheckedChange={(on) => setDone((map) => ({ ...map, [hire.id]: on ? onboardingSteps.filter((entry) => entry === step || map[hire.id]?.includes(entry)) : (map[hire.id] ?? []).filter((entry) => entry !== step) }))} />
            ))}
          </Stack>
        </> : null}
      </SidePanel>
      <DemoFieldDialog open={inviting} onOpenChange={setInviting} title="Add employee" description="They get an email to finish their profile."
        field={{ kind: "email", label: "Work email", placeholder: "name@dizai.studio" }} submitLabel="Send invite" confirm={(email) => `Invite sent to ${email}`}
        onSubmit={(email) => { setQuery(""); setInvited((list) => [invitee(email, list.length + 1), ...list]); }} />
      <DemoFieldDialog open={creatingTeam} onOpenChange={setCreatingTeam} title="New team" description="You lead it until you pick someone else."
        field={{ kind: "name", label: "Team name", placeholder: "e.g. Research" }} submitLabel="Create team" confirm={(name) => `${name} team created`}
        onSubmit={(name) => setTeamList((list) => [...list, { id: `team-${list.length + 1}`, name, lead: "Alex Duong", people: 0, members: [] }])} />
    </Frame>
    </CardElevationContext.Provider>
  );
}

/* ───────────── 3 · Home on the icon rail (defaultSidebarCollapsed) ───────────── */

const railNav: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "profile", label: "My profile", icon: "icon-user-square-line" },
    { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line", counter: 3 },
  ] },
  { label: "Modules", items: [
    { id: "people", label: "People", icon: "icon-users-line" },
    { id: "documents", label: "Documents", icon: "icon-file-doc-line" },
    { id: "expenses", label: "Expenses", icon: "icon-coin-02-line" },
    { id: "time-off", label: "Time off", icon: "icon-calendar-heart-line" },
    { id: "workbench", label: "Workbench", icon: "icon-dataflow-03-line" },
  ] },
];
const railLabel = (id: string) => railNav.flatMap((section) => section.items).find((item) => item.id === id)?.label ?? "Home";
/** The pages this demo builds; the other modules answer with a toast, as in the HR workspace. */
const railPages = ["home", "time-off", "people"];
const homeTasks = [
  { id: "t1", label: "Approve Bao Nguyen's leave", caption: "5 days from Oct 6 · due today" },
  { id: "t2", label: "Review September expenses", caption: "12 claims · due Oct 3" },
  { id: "t3", label: "Welcome Em Pham", caption: "Onboarding step 4 · due Oct 1" },
];

export function HomeRailExample() {
  const cardTheme: CardElevation = "shadow";
  const actionToast = useActionToast();
  const notInDemo = useNotInDemo();
  const [page, setPage] = useState("home");
  const frameRef = usePageChange(page);
  const [done, setDone] = useState<string[]>([]);
  const [requests, setRequests] = useState(myRequestsSeed);
  const [requesting, setRequesting] = useState(false);
  // Request leave works from Home and from Time off; View opens Time off, where the request now heads the list.
  const form = useLeaveForm(requests, (request) => {
    setRequests((list) => [request, ...list]);
    setRequesting(false);
    actionToast({ type: "positive", title: "Leave request sent", children: `${kindLabel[request.kind]} · ${request.dates}`, action: { label: "View", onClick: () => { setPage("time-off"); focusMain(frameRef); } } });
  });
  const go = (id: string) => { if (railPages.includes(id)) setPage(id); else notInDemo(railLabel(id)); };
  const crumbs = page === "home" ? [{ id: "home", label: "Home" }] : [{ id: "home", label: "Home" }, { id: page, label: railLabel(page) }];
  const requestLeave = <Button level="primary" startIcon="icon-plus-line" aria-haspopup="dialog" onClick={() => setRequesting(true)}>Request leave</Button>;
  return (
    <CardElevationContext.Provider value={cardTheme}>
      <Frame height={640} frameRef={frameRef}>
      <AppShell mainId="pash-rail-main" defaultSidebarCollapsed
        sidebar={<Sidebar aria-label="Modules" brand={<WorkspaceBrand />} logoCollapsed={workspaceMark} sections={railNav} selectedId={page} onItemClick={(item) => go(item.id)} />}
        header={<Breadcrumbs master={false} items={crumbs} onNavigate={(item, event) => { event.preventDefault(); go(item.id); }} />}
        headerActions={<>
          <Badge size="md" theme="neutral" background="subtle" leading="icon-package-solid">Pro</Badge>
          <Account />
        </>}
      >
        <Container>
          <Stack gap="xl" className="pash-page">
            {page === "home" ? <>
              <PageHeader eyebrow="Wednesday, September 30" title="Home" description="Good morning, Alex. 2 people are out today and 3 tasks are waiting for you." actions={requestLeave} />
              <Grid columns="repeat(auto-fit, minmax(min(100%, 260px), 1fr))" gap="md" align="start">
                <Section title="Out today">
                  <List aria-label="Out today">
                    <ListItem title="Bao Nguyen" caption="Annual leave · back Oct 13" leading={<PersonAvatar person={staff[1]} size="medium" />} />
                    <ListItem title="Chi Tran" caption="Sick leave · back tomorrow" leading={<PersonAvatar person={staff[2]} size="medium" />} />
                  </List>
                </Section>
                <Section title="My tasks" action={<BadgeCounter value={homeTasks.length - done.length} />}>
                  <Stack gap="sm">
                    {homeTasks.map((task) => <Checkbox key={task.id} label={task.label} caption={task.caption} checked={done.includes(task.id)} onCheckedChange={(on) => setDone((list) => (on ? [...list, task.id] : list.filter((id) => id !== task.id)))} />)}
                  </Stack>
                </Section>
                <Section title="Coming up">
                  <List aria-label="Coming up">
                    <ListItem title="Company retreat" caption="Fri, Nov 13 · office closed" leading={<ThingMark icon="icon-flag-01-line" theme="accent" />} />
                    <ListItem title="New Year's Day" caption="Fri, Jan 1 · public holiday" leading={<ThingMark icon="icon-calendar-line" theme="red" />} />
                    <ListItem title="Lunar New Year" caption="Feb 4 – Feb 10 · public holiday" leading={<ThingMark icon="icon-calendar-line" theme="red" />} />
                  </List>
                </Section>
              </Grid>
            </> : null}
            {page === "time-off" ? <>
              <PageHeader title="Time off" actions={requestLeave} />
              <BalanceCards requests={requests} />
              <Section title="My requests"><RequestList requests={requests} /></Section>
            </> : null}
            {page === "people" ? <>
              <PageHeader title="People" meta={<BadgeCounter value={48} />} />
              {/* The page's table sits straight on the page (usage rules §14). */}
              <PeopleTable rows={staff} />
            </> : null}
          </Stack>
        </Container>
      </AppShell>
      <LeaveRequestDialog open={requesting} onOpenChange={setRequesting} form={form} requests={requests} />
    </Frame>
    </CardElevationContext.Provider>
  );
}

/* ───────────── 4 · Time off in a narrow shell (drawer) ───────────── */

const timeOffNav: SidebarSection[] = [
  { items: [
    { id: "my-leaves", label: "My leaves", icon: "icon-send-01-line" },
    { id: "approvals", label: "Approvals", icon: "icon-check-done-line", counter: 3 },
    { id: "calendar", label: "Calendar", icon: "icon-calendar-line" },
  ] },
];
const approvalsSeed = [
  { id: "a1", person: staff[1], kind: "annual" as LeaveKind, dates: "Oct 6 – Oct 10", days: 5 },
  { id: "a2", person: staff[0], kind: "remote" as LeaveKind, dates: "Oct 2", days: 1 },
  { id: "a3", person: staff[4], kind: "unpaid" as LeaveKind, dates: "Oct 20 – Oct 24", days: 5 },
];
const calendarMonths = [
  { month: "October", items: [
    { id: "c1", title: "Bao Nguyen · Annual leave", caption: "Oct 6 – Oct 10", person: staff[1] },
    { id: "c2", title: "You · Annual leave", caption: "Oct 14 – Oct 15 · pending", person: me },
  ] },
  { month: "November", items: [
    { id: "c3", title: "Company retreat", caption: "Nov 13 · office closed", person: undefined },
    { id: "c4", title: "Duy Le · Annual leave", caption: "Nov 3 – Nov 7", person: staff[3] },
  ] },
];

export function TimeOffDrawerExample() {
  const cardTheme: CardElevation = "border";
  const actionToast = useActionToast();
  const notInDemo = useNotInDemo();
  const [page, setPage] = useState("approvals");
  const frameRef = usePageChange(page);
  const [requests, setRequests] = useState(myRequestsSeed);
  const [approvals, setApprovals] = useState(approvalsSeed);
  const [requesting, setRequesting] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const reviewing = approvals.find((entry) => entry.id === reviewId);
  const label = timeOffNav[0].items.find((item) => item.id === page)?.label ?? "My leaves";
  const form = useLeaveForm(requests, (request) => {
    setRequests((list) => [request, ...list]);
    setRequesting(false);
    actionToast({ type: "positive", title: "Leave request sent", children: `${kindLabel[request.kind]} · ${request.dates}`, action: { label: "View", onClick: () => { setPage("my-leaves"); focusMain(frameRef); } } });
  });
  /** Once the list has re-rendered, focus the n-th request's row (or the last one, or the page when none is left). */
  const focusRow = (index: number) => requestAnimationFrame(() => {
    const rows = Array.from(frameRef.current?.querySelectorAll("li[data-approval]") ?? []).map((row) => row.querySelector("button"));
    (rows[index] ?? rows[rows.length - 1] ?? frameRef.current?.querySelector<HTMLElement>("main"))?.focus();
  });
  // Approve and Decline act at once and offer Undo, which puts the request back in its place. The decided row leaves
  // the list, so focus moves on to the next request instead of falling to the page.
  const decide = (id: string, approved: boolean) => {
    const index = approvals.findIndex((entry) => entry.id === id);
    const request = approvals[index];
    if (!request) return;
    setApprovals((list) => list.filter((entry) => entry.id !== id));
    setReviewId(null);
    const undo = () => { setApprovals((list) => { const next = list.filter((entry) => entry.id !== id); next.splice(index, 0, request); return next; }); focusRow(index); };
    actionToast({ type: approved ? "positive" : "neutral", title: `${kindLabel[request.kind]} ${approved ? "approved" : "declined"}`, children: `${request.person.name} · ${request.dates}`, action: { label: "Undo", onClick: undo } });
    focusRow(index);
  };
  const nav = timeOffNav.map((section) => ({ ...section, items: section.items.map((item) => (item.id === "approvals" ? { ...item, counter: approvals.length || undefined } : item)) }));
  // Annual leave left after the request; Remote work and Unpaid leave do not use the annual balance.
  const annualAfter = reviewing && reviewing.kind === "annual" ? 15 - reviewing.person.annual - reviewing.days : null;
  return (
    <CardElevationContext.Provider value={cardTheme}>
      <Frame height={600} frameRef={frameRef}>
      <AppShell canvas="alt" layout="drawer" mainId="pash-drawer-main"
        sidebar={<Sidebar background="alt" aria-label="Time off navigation" brand={<WorkspaceBrand />} sections={nav} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
        header={<Breadcrumbs master={false} items={[{ id: "home", label: "Home" }, { id: "time-off", label: "Time off" }, { id: page, label }]} onNavigate={(item, event) => { event.preventDefault(); if (item.id === "home") notInDemo("Home"); else setPage(item.id === "time-off" ? "my-leaves" : item.id); }} />}
        headerActions={<Account />}
      >
        <Container>
          <Stack gap="xl" className="pash-page">
            {page === "my-leaves" ? <>
              <PageHeader title="My leaves" actions={<Button level="primary" startIcon="icon-plus-line" aria-haspopup="dialog" onClick={() => setRequesting(true)}>Request leave</Button>} />
              <BalanceCards requests={requests} />
              <Section title="Requests"><RequestList requests={requests} /></Section>
            </> : null}
            {page === "approvals" ? <>
              <PageHeader title="Approvals" description={approvals.length ? `${plural(approvals.length, "request")} waiting for you` : "You are all caught up"} />
              <Card theme={cardTheme} spacing="small">
                {approvals.length ? (
                  <List aria-label="Waiting for approval">
                    {approvals.map((request) => (
                      <ListItem key={request.id} data-approval={request.id} title={request.person.name} caption={`${kindLabel[request.kind]} · ${request.dates}`} leading={<PersonAvatar person={request.person} size="medium" />}
                        selected={request.id === reviewId} onClick={() => setReviewId(request.id)}
                        // One trailing button keeps the row readable in a narrow shell; the Menu holds both decisions.
                        trailing={<Menu align="end" onSelect={(item) => decide(request.id, item.id === "approve")}
                          trigger={<IconButton appearance="flat" level="primary" size="md" aria-label={`Review ${request.person.name}'s request`} icon="icon-dots-horizontal-line" />}
                          items={[{ id: "approve", label: "Approve", icon: "icon-check-line" }, { id: "decline", label: "Decline", icon: "icon-x-line" }]} />} />
                    ))}
                  </List>
                ) : <EmptyState headingLevel={2} illustration={false} icon="icon-check-done-line" title="No requests waiting" secondaryAction={{ label: "Open calendar", onClick: () => setPage("calendar") }}>New requests from your team show up here.</EmptyState>}
              </Card>
            </> : null}
            {page === "calendar" ? <>
              <PageHeader title="Calendar" description="Who is out, and when the office is closed." />
              {calendarMonths.map((month) => (
                <Stack key={month.month} gap="2xs">
                  <GroupLabel>{month.month}</GroupLabel>
                  <Card theme={cardTheme} spacing="small">
                    <List aria-label={`${month.month} time off`}>
                      {month.items.map((entry) => <ListItem key={entry.id} title={entry.title} caption={entry.caption} leading={entry.person ? <PersonAvatar person={entry.person} size="medium" /> : <ThingMark icon="icon-flag-01-line" theme="accent" />} />)}
                    </List>
                  </Card>
                </Stack>
              ))}
            </> : null}
          </Stack>
        </Container>
      </AppShell>
      <SidePanel type="modal" size="small" open={Boolean(reviewing)} onOpenChange={(open) => { if (!open) setReviewId(null); }}
        title={reviewing ? `${reviewing.person.name}'s request` : "Request"} description={reviewing ? `${kindLabel[reviewing.kind]} · ${plural(reviewing.days, "day")}` : undefined}
        primaryAction={{ label: "Approve", onClick: () => { if (reviewing) decide(reviewing.id, true); } }}
        secondaryAction={{ label: "Decline", onClick: () => { if (reviewing) decide(reviewing.id, false); } }}>
        {reviewing ? <>
          <Stack direction="row" gap="sm" align="center">
            <PersonAvatar person={reviewing.person} size="medium" />
            <Stack gap="none">
              <Text as="span" textStyle="Body/Base/Bold">{reviewing.person.name}</Text>
              <Text as="span" textStyle="Caption/Regular" tone="light">{reviewing.person.role} · {reviewing.person.department}</Text>
            </Stack>
          </Stack>
          <DescriptionList divider items={[
            { term: "Type", description: <Stack direction="row" gap="xs" align="center" justify="end"><KindMark kind={reviewing.kind} size="sm" /><span>{kindLabel[reviewing.kind]}</span></Stack> },
            { term: "Dates", description: reviewing.dates },
            { term: "Working days", description: plural(reviewing.days, "day") },
            ...(annualAfter === null ? [] : [{ term: "Annual leave after", description: annualAfter >= 0 ? `${plural(annualAfter, "day")} left`
              : <Badge size="sm" theme="orange" background="subtle">{plural(-annualAfter, "day")} over</Badge> }]),
          ]} />
        </> : null}
      </SidePanel>
      <LeaveRequestDialog open={requesting} onOpenChange={setRequesting} form={form} requests={requests} />
    </Frame>
    </CardElevationContext.Provider>
  );
}

/* ───────────── 5 · Billing with a banner above the shell ───────────── */

const settingsNav: SidebarSection[] = [
  { label: "Settings", items: [
    { id: "general", label: "General", icon: "icon-settings-01-line" },
    { id: "members", label: "Members", icon: "icon-users-line" },
    { id: "billing", label: "Billing", icon: "icon-credit-card-line" },
    { id: "integrations", label: "Integrations", icon: "icon-dataflow-03-line" },
  ] },
];
const invoices = [
  { id: "inv-0142", number: "INV-0142", date: "Sep 1, 2026", seats: 48, amount: "$192.00" },
  { id: "inv-0131", number: "INV-0131", date: "Aug 1, 2026", seats: 47, amount: "$188.00" },
  { id: "inv-0120", number: "INV-0120", date: "Jul 1, 2026", seats: 45, amount: "$180.00" },
  { id: "inv-0109", number: "INV-0109", date: "Jun 1, 2026", seats: 45, amount: "$180.00" },
];

export function BillingBannerExample() {
  const cardTheme: CardElevation = "shadow";
  const { toast } = useToast();
  const actionToast = useActionToast();
  const notInDemo = useNotInDemo();
  const invoicesId = useId();
  const [cardOk, setCardOk] = useState(false);
  const [notice, setNotice] = useState(true);
  const [updating, setUpdating] = useState(false);
  const addSeatsRef = useRef<HTMLButtonElement>(null);
  const [seats, setSeats] = useState(50);
  const used = 48;
  // Adding seats acts at once and offers Undo; the Seats card shows the new total.
  const addSeats = () => {
    const before = seats;
    setSeats(before + 10);
    actionToast({ type: "positive", title: "10 seats added", children: `${before + 10} seats from the next invoice.`, action: { label: "Undo", onClick: () => { setSeats(before); addSeatsRef.current?.focus(); } } });
  };
  // Billing is the one Settings page built here; the others answer like every page outside the demo.
  const open = (item: { id: string; label: ReactNode }) => { if (item.id !== "billing") notInDemo(String(item.label)); };
  return (
    <CardElevationContext.Provider value={cardTheme}>
      <Frame height={620}>
      <AppShell mainId="pash-banner-main"
        banner={notice && !cardOk ? <AlertBanner theme="warning" action={{ label: "Update card", onClick: () => setUpdating(true) }} onClose={() => setNotice(false)}>Your Visa ending 1881 expires in 3 days. Update it to keep the Pro plan.</AlertBanner> : undefined}
        sidebar={<Sidebar aria-label="Settings navigation" brand={<WorkspaceBrand />} sections={settingsNav} selectedId="billing" onItemClick={open} />}
        header={<Breadcrumbs master={false} items={[{ id: "home", label: "Home" }, { id: "settings", label: "Settings" }, { id: "billing", label: "Billing" }]} onNavigate={(item, event) => { event.preventDefault(); open(item); }} />}
        headerActions={<Account />}
      >
        <Container>
          <Stack gap="xl" className="pash-page">
            <PageHeader title="Billing" description="Pro plan · renews on Oct 1, 2026" actions={<Button level="tertiary" onClick={() => toast({ title: "Plans", children: "Pro is $4 per person a month; Business adds payroll." })}>Compare plans</Button>} />
            <Grid columns="repeat(auto-fit, minmax(min(100%, 280px), 1fr))" gap="md" align="start">
              <Section title="Plan">
                <DescriptionList divider items={[
                  { term: "Plan", description: "Pro · $4/person" },
                  { term: "Next invoice", description: "$192.00 on Oct 1" },
                  { term: "Payment method", description: cardOk ? "Visa ending 4242 · expires 09/29" : <Stack direction="row" gap="2xs" align="center" wrap><span>Visa ending 1881</span><Badge size="sm" theme="orange" background="subtle">Expires Oct 3</Badge></Stack>,
                    action: <Button level="tertiary" size="sm" onClick={() => setUpdating(true)}>Update<VisuallyHidden> payment method</VisuallyHidden></Button> },
                ]} />
              </Section>
              <Section title="Seats">
                <Stack gap="sm">
                  <ProgressBar value={Math.round((used / seats) * 100)} scale="quota" label={`${used} of ${seats} seats used`} />
                  <Text textStyle="Body/Small/Regular" tone="base">{plural(seats - used, "seat")} left. New people past {seats} are added to the next invoice at $4 each.</Text>
                  <Button ref={addSeatsRef} level="tertiary" size="sm" className="pac-stack-start" onClick={addSeats}>Add 10 seats</Button>
                </Stack>
              </Section>
            </Grid>
            {/* Invoices is a section of the page, so its table sits straight on the page under an h2 (usage rules §14). */}
            <Stack as="section" gap="md" aria-labelledby={invoicesId}>
              <Heading level={2} id={invoicesId}>Invoices</Heading>
              <Table aria-label="Invoices" rows={invoices} getRowId={(row) => row.id}
                columns={[
                  { id: "number", header: "Invoice", cell: (row) => <TableText bold caption={row.date}>{row.number}</TableText> },
                  { id: "seats", header: "Seats", align: "right", cell: (row) => <TableText>{row.seats}</TableText> },
                  { id: "amount", header: "Amount", align: "right", cell: (row) => <TableText>{row.amount}</TableText> },
                  { id: "status", header: "Status", cell: () => <TableBadges><Badge size="sm" theme="green" background="subtle">Paid</Badge></TableBadges> },
                  { id: "download", header: <VisuallyHidden>Download</VisuallyHidden>, align: "right", cell: (row) => <TableActions><IconButton appearance="flat" level="primary" size="md" aria-label={`Download ${row.number}`} icon="icon-download-01-line" onClick={() => toast({ title: `${row.number}.pdf downloaded` })} /></TableActions> },
                ]} />
            </Stack>
          </Stack>
        </Container>
      </AppShell>
      <DemoFieldDialog open={updating} onOpenChange={setUpdating} title="Update payment method" description="The next invoice on Oct 1 goes to the new card."
        field={{ kind: "name", label: "Name on card", placeholder: "e.g. Alex Duong" }} submitLabel="Save card" confirm={() => "Card updated"} onSubmit={() => setCardOk(true)} />
    </Frame>
    </CardElevationContext.Provider>
  );
}

/* ───────────── 6 · Workbench tasks on a flat canvas ───────────── */

type TaskStatus = "todo" | "doing" | "done";
type Task = { id: string; title: string; due: string; person: (typeof staff)[number]; status: TaskStatus };
const columns: Array<{ id: TaskStatus; label: string; next?: TaskStatus; nextLabel?: string }> = [
  { id: "todo", label: "To do", next: "doing", nextLabel: "In progress" },
  { id: "doing", label: "In progress", next: "done", nextLabel: "Done" },
  { id: "done", label: "Done" },
];
const tasksSeed: Task[] = [
  { id: "k1", title: "Onboarding checklist v2", due: "Oct 3", person: staff[2], status: "todo" },
  { id: "k2", title: "Leave policy for 2027", due: "Oct 10", person: staff[3], status: "todo" },
  { id: "k3", title: "Expense categories audit", due: "Oct 14", person: staff[0], status: "todo" },
  { id: "k4", title: "Payroll export to CSV", due: "Oct 1", person: staff[1], status: "doing" },
  { id: "k5", title: "Holiday calendar sync", due: "Oct 2", person: staff[4], status: "doing" },
  { id: "k6", title: "Remote work approvals", due: "Sep 26", person: staff[3], status: "done" },
];
const workbenchNav: SidebarSection[] = [
  { items: [
    { id: "overviews", label: "Overviews", icon: "icon-pie-chart-03-line" },
    { id: "tasks", label: "Tasks", icon: "icon-check-square-broken-line" },
    { id: "workflow", label: "Workflow", icon: "icon-dataflow-03-line" },
  ] },
  { label: "Space", items: [
    { id: "space-product-design", label: "Product Design", icon: <Avatar size="xsmall" shape="square" theme="violet" background="subtle" alt="">P</Avatar> },
    { id: "space-development", label: "Development", icon: <Avatar size="xsmall" shape="square" theme="blue" background="subtle" alt="">D</Avatar> },
  ] },
];

export function WorkbenchFlatExample() {
  const cardTheme: CardElevation = "border";
  const actionToast = useActionToast();
  const notInDemo = useNotInDemo();
  const [page, setPage] = useState("tasks");
  const frameRef = usePageChange(page);
  const [collapsed, setCollapsed] = useState(false);
  const [tasks, setTasks] = useState(tasksSeed);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  /** Focus a task's row once the board has re-rendered (it may have moved to another column). */
  const focusTask = (id: string) => requestAnimationFrame(() => frameRef.current?.querySelector<HTMLElement>(`li[data-task="${id}"] button`)?.focus());
  // A move acts at once and offers Undo. From a row's arrow, focus follows the task to its new column (and back on
  // Undo); from the panel it stays in the panel.
  const move = (task: Task, status: TaskStatus, fromRow = false) => {
    const from = task.status;
    setTasks((list) => list.map((entry) => (entry.id === task.id ? { ...entry, status } : entry)));
    actionToast({ title: `“${task.title}” moved to ${columns.find((column) => column.id === status)?.label ?? ""}`,
      action: { label: "Undo", onClick: () => { setTasks((list) => list.map((entry) => (entry.id === task.id ? { ...entry, status: from } : entry))); focusTask(task.id); } } });
    if (fromRow) focusTask(task.id);
  };
  const opened = tasks.find((task) => task.id === openId);
  const openedColumn = columns.find((column) => column.id === opened?.status);
  // Tasks is the Product Design space's board; Workflow and the other space are outside the demo.
  const go = (id: string, label: string) => {
    if (id === "tasks" || id === "overviews") setPage(id);
    else if (id === "space-product-design") setPage("tasks");
    else notInDemo(label);
  };
  return (
    <CardElevationContext.Provider value={cardTheme}>
      <Frame height={620} frameRef={frameRef}>
      <AppShell canvas="flat" mainId="pash-flat-main"
        // A task row opens the task beside the board (a docked Standard panel); the arrow stays its quick action.
        aside={opened && openedColumn ? (
          <SidePanel type="standard" size="small" title={opened.title} description={`Product Design · ${openedColumn.label}`} open onOpenChange={(open) => { if (!open) setOpenId(null); }}
            primaryAction={openedColumn.next ? { label: `Move to ${openedColumn.nextLabel}`, onClick: () => move(opened, openedColumn.next as TaskStatus) } : { label: "Reopen", onClick: () => move(opened, "todo") }}
            secondaryAction={{ label: "Close" }}>
            <DescriptionList divider items={[
              { term: "Status", description: <Badge size="sm" theme={opened.status === "done" ? "green" : opened.status === "doing" ? "blue" : "neutral"} background="subtle">{openedColumn.label}</Badge> },
              { term: "Assignee", description: <Stack direction="row" gap="xs" align="center" justify="end"><PersonAvatar person={opened.person} size="small" /><span>{opened.person.name}</span></Stack> },
              { term: "Due", description: opened.due },
              { term: "Space", description: "Product Design" },
            ]} />
          </SidePanel>
        ) : undefined}
        sidebar={<Sidebar aria-label="Workbench navigation" background="flat" collapsed={collapsed} onCollapsedChange={setCollapsed} logo={workspaceMark} productName="Đìzai Studio" logoCollapsed={workspaceMark} sections={workbenchNav} selectedId={page}
          onItemClick={(item) => go(item.id, item.label)} />}>
        <Container>
          <Stack gap="xl" className="pash-page">
            {page === "overviews" ? <>
              <PageHeader title="Overviews" description="Workbench across both spaces" />
              <Grid columns="repeat(auto-fit, minmax(min(100%, 180px), 1fr))" gap="sm">
                <MetricCard theme={cardTheme} size="md" label="Open tasks" value={String(tasks.filter((task) => task.status !== "done").length)} icon="icon-check-square-broken-line" />
                <MetricCard theme={cardTheme} size="md" label="Due this week" value="3" icon="icon-calendar-line" trend={{ direction: "negative", label: "1 overdue" }} />
                <MetricCard theme={cardTheme} size="md" label="Done in September" value="14" icon="icon-check-done-line" trend={{ direction: "positive", label: "+4 vs. August" }} />
              </Grid>
            </> : null}
            {page === "tasks" ? <>
            <PageHeader title="Tasks" description={`Product Design space · ${plural(tasks.filter((task) => task.status !== "done").length, "open task")}`}
              actions={<Button level="primary" startIcon="icon-plus-line" onClick={() => setCreating(true)}>New task</Button>} />
            <Grid columns="repeat(auto-fit, minmax(min(100%, 250px), 1fr))" gap="md" align="start">
              {columns.map((column) => {
                const items = tasks.filter((task) => task.status === column.id);
                return (
                  <Section key={column.id} title={column.label} action={<BadgeCounter value={items.length} />}>
                    {items.length ? (
                      <List aria-label={column.label}>
                        {items.map((task) => (
                          <ListItem key={task.id} data-task={task.id} title={task.title} caption={`Due ${task.due} · ${task.person.name}`} leading={<PersonAvatar person={task.person} size="medium" />}
                            selected={task.id === openId} onClick={() => setOpenId(task.id)}
                            trailing={column.next
                              ? <IconButton appearance="flat" level="primary" size="md" aria-label={`Move “${task.title}” to ${column.nextLabel}`} icon="icon-arrow-right-line" onClick={() => move(task, column.next as TaskStatus, true)} />
                              : <IconButton appearance="flat" level="primary" size="md" aria-label={`Reopen “${task.title}”`} icon="icon-refresh-cw-01-line" onClick={() => move(task, "todo", true)} />} />
                        ))}
                      </List>
                    ) : <Text textStyle="Body/Small/Regular" tone="light">Nothing here yet.</Text>}
                  </Section>
                );
              })}
            </Grid>
            </> : null}
          </Stack>
        </Container>
      </AppShell>
      <DemoFieldDialog open={creating} onOpenChange={setCreating} title="New task" description="It starts in To do; assign it from the task."
        field={{ kind: "name", label: "Task name", placeholder: "e.g. Update the handbook" }} submitLabel="Create task" confirm={(name) => `“${name}” added to To do`}
        onSubmit={(name) => setTasks((list) => [{ id: `k${list.length + 1}`, title: name, due: "Oct 17", person: staff[0], status: "todo" }, ...list])} />
    </Frame>
    </CardElevationContext.Provider>
  );
}

/* ───────────── 7 · The HR app on a phone ───────────── */

/** Colleagues who only appear on the phone (initials Avatars, one steady theme each). */
const colleague = (id: string, name: string, initials: string, theme: Person["theme"], role: string, department: string): Person =>
  ({ ...staff[3], id, name, initials, theme, role, department, email: `${name.split(" ")[0].toLowerCase()}@dizai.studio` });
const linh = colleague("EMP-0102", "Linh Vo", "LV", "indigo", "COO", "Operations");
const hai = colleague("EMP-0120", "Hai Do", "HD", "cyan", "Engineering Lead", "Engineering");
const hana = colleague("EMP-0177", "Hana Kim", "HK", "pink", "Data Analyst", "Product");
const minhAnh = colleague("EMP-0190", "Minh Anh Vo", "MV", "yellow", "People Partner", "People & Ops");

// Alex's inbox, newest first; times follow the relative ladder (today is Wednesday, Sep 30).
const phoneNotices = [
  { id: "p1", person: staff[3], title: "Duy Le approved your annual leave", caption: "Oct 14 – Oct 15 · 2 minutes ago", unread: true },
  { id: "p2", person: staff[0], title: "Ava Chen mentioned you", caption: "“Can you check the welcome email?” · 18 minutes ago", unread: true },
  { id: "p3", person: staff[1], title: "Bao Nguyen is out from Monday", caption: "Annual leave · Oct 6 – Oct 10 · 9:40 am", unread: true },
  { id: "p4", person: staff[2], title: "Chi Tran shared the Q4 leave calendar", caption: "Time off · 8:15 am", unread: false },
  { id: "p5", person: staff[4], title: "Em Pham finished onboarding step 3", caption: "Work accounts set up · Yesterday at 4:20 pm", unread: false },
  { id: "p6", person: staff[3], title: "Duy Le asked you to review 2 requests", caption: "Approvals · Yesterday at 10:05 am", unread: false },
  { id: "p7", person: linh, title: "Linh Vo published the 2027 holidays", caption: "Public holidays · Monday at 3:30 pm", unread: false },
  { id: "p8", person: hai, title: "Hai Do commented on your expense claim", caption: "“Please add the taxi receipt.” · Monday at 11:10 am", unread: false },
  { id: "p9", person: minhAnh, title: "Minh Anh Vo updated the leave policy", caption: "Carry-over is now 5 days · Friday at 5:40 pm", unread: false },
  { id: "p10", person: staff[2], title: "Chi Tran requested remote work", caption: "Oct 2 · Friday at 8:05 am", unread: false },
  { id: "p11", person: staff[4], title: "Em Pham signed the employment contract", caption: "Sep 18 at 2:10 pm", unread: false },
  { id: "p12", person: hana, title: "Hana Kim shared the Q3 people report", caption: "Sep 16 at 9:30 am", unread: false },
  { id: "p13", person: staff[0], title: "Ava Chen approved your expense claim", caption: "$86.50 · Sep 15 at 4:45 pm", unread: false },
];
// Alex's requests this year, newest first.
const phoneRequestsSeed: MyRequest[] = [
  { id: "y1", kind: "annual", dates: "Oct 14 – Oct 15", days: 2, status: "approved" },
  { id: "y2", kind: "remote", dates: "Oct 2", days: 1, status: "pending" },
  { id: "y3", kind: "remote", dates: "Sep 18", days: 1, status: "approved" },
  { id: "y4", kind: "sick", dates: "Sep 8", days: 1, status: "approved" },
  { id: "y5", kind: "annual", dates: "Aug 17 – Aug 21", days: 5, status: "approved" },
  { id: "y6", kind: "remote", dates: "Jul 31", days: 1, status: "approved" },
  { id: "y7", kind: "annual", dates: "Jul 6 – Jul 7", days: 2, status: "rejected" },
  { id: "y8", kind: "sick", dates: "Jun 15", days: 1, status: "approved" },
  { id: "y9", kind: "unpaid", dates: "May 25 – May 26", days: 2, status: "approved" },
  { id: "y10", kind: "annual", dates: "Apr 27 – Apr 28", days: 2, status: "approved" },
  { id: "y11", kind: "remote", dates: "Apr 10", days: 1, status: "approved" },
  { id: "y12", kind: "annual", dates: "Feb 23 – Feb 24", days: 2, status: "approved" },
  { id: "y13", kind: "sick", dates: "Jan 12", days: 1, status: "approved" },
];
const phoneProfile = [
  { label: "Work", items: [
    { term: "Team", description: "Design" },
    { term: "Role", description: "Design Lead" },
    { term: "Manager", description: "Duy Le" },
    { term: "Office", description: "Ho Chi Minh City" },
    { term: "Start date", description: "Feb 1, 2021" },
    { term: "Employee ID", description: "EMP-0101" },
  ] },
  { label: "Contact", items: [
    { term: "Work email", description: "alex@dizai.studio" },
    { term: "Phone", description: "+84 90 555 0101" },
  ] },
  { label: "Time off", items: [
    { term: "Annual allowance", description: "15 days a year" },
    { term: "Carried over", description: "2 days, until Mar 31, 2027" },
    { term: "Approves your requests", description: "Duy Le" },
  ] },
];

export function HrPhoneExample() {
  // Each tab is a root: a large title that folds into the bar as its list scrolls (the header floats over the screen).
  const screenRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLElement>(null);
  const [tab, setTab] = useState("home");
  const [notices, setNotices] = useState(phoneNotices);
  const [requests, setRequests] = useState(phoneRequestsSeed);
  const [requesting, setRequesting] = useState(false);
  const unread = notices.filter((notice) => notice.unread).length;
  const items: BottomNavigationItem[] = [
    { id: "home", label: "Home", icon: "icon-home-smile-line", selectedIcon: "icon-home-smile-solid" },
    { id: "time-off", label: "Time off", icon: "icon-calendar-heart-line", selectedIcon: "icon-calendar-heart-solid" },
    { id: "inbox", label: "Inbox", icon: "icon-message-chat-circle-line", selectedIcon: "icon-message-chat-circle-solid", dot: unread > 0 },
    { id: "profile", label: "Profile", icon: "icon-user-circle-line", selectedIcon: "icon-user-circle-solid" },
  ];
  const label = items.find((item) => item.id === tab)?.label ?? "Home";
  // A sent request heads the Time off list.
  const form = useLeaveForm(requests, (request) => { setRequests((list) => [request, ...list]); setRequesting(false); setTab("time-off"); });
  // Tapping the current tab again scrolls it back to the top, so the large title opens again.
  const choose = (id: string) => { if (id === tab) screenRef.current?.scrollTo({ top: 0, behavior: "smooth" }); else setTab(id); };
  // Each tab is its own screen (the phone is keyed by tab), so the tapped button is replaced: focus goes to its twin.
  const shownTab = useRef(tab);
  useEffect(() => {
    if (shownTab.current === tab) return;
    shownTab.current = tab;
    if (!document.activeElement || document.activeElement === document.body) phoneRef.current?.querySelector<HTMLElement>(".platform-phone__footer [aria-current='page']")?.focus();
  }, [tab]);
  const trailing = tab === "home" || tab === "time-off" ? [{ icon: "icon-plus-line" as const, label: "Request leave", onClick: () => setRequesting(true) }]
    : tab === "inbox" ? [{ icon: "icon-check-done-line" as const, label: "Mark all read", disabled: !unread, onClick: () => setNotices((list) => list.map((notice) => ({ ...notice, unread: false }))) }] : [];
  return (
    <ZenProvider typography="mobile" paint={false} portal={false} breakpoint="mobile">
      <Stack ref={phoneRef} align="center">
      <PlatformPhone key={tab} label="HR app on a phone" headerOverlay screenRef={screenRef}
        header={<TopNavigation title={label} largeTitle={label} scrollRef={screenRef} trailing={trailing} />}
        footer={<BottomNavigation aria-label="HR app" items={items} value={tab} onValueChange={choose} />}>
        <Stack gap="lg" padding="lg">
          {tab === "home" ? <>
            <Card theme="border">
              <Stack gap="xs">
                <Heading level={2} textStyle="Heading/Subheading">Leave balance</Heading>
                {/* Terms are Content/Neutral/Base (alpha) and colour emoji take that alpha: each emoji gets an opaque span. */}
                <DescriptionList divider items={(["annual", "sick", "unpaid"] as const).map((kind) => ({
                  term: <><Text as="span" textStyle="Body/Small/Regular" tone="strongest">{kindEmoji[kind]}</Text> {kindLabel[kind]}</>,
                  description: plural(daysLeft(kind, requests) ?? 0, "day"),
                }))} />
              </Stack>
            </Card>
            <Stack gap="2xs">
              <Heading level={2} textStyle="Body/Small/Bold" tone="light">Coming up</Heading>
              <List aria-label="Coming up">
                <ListItem title="Your annual leave" caption="Oct 14 – Oct 15 · approved" leading={<KindMark kind="annual" />} />
                <ListItem title="Your remote day" caption="Oct 2 · pending" leading={<KindMark kind="remote" />} />
                <ListItem title="Chi Tran · remote work" caption="Oct 2" leading={<PersonAvatar person={staff[2]} size="medium" />} />
                <ListItem title="Bao Nguyen · annual leave" caption="Oct 6 – Oct 10" leading={<PersonAvatar person={staff[1]} size="medium" />} />
                <ListItem title="Duy Le · annual leave" caption="Nov 3 – Nov 7" leading={<PersonAvatar person={staff[3]} size="medium" />} />
                <ListItem title="Company retreat" caption="Nov 13 · office closed" leading={<ThingMark icon="icon-flag-01-line" theme="accent" />} />
                <ListItem title="Year-end party" caption="Dec 18 · Ho Chi Minh City office" leading={<ThingMark icon="icon-flag-01-line" theme="accent" />} />
                <ListItem title="New Year's Day" caption="Jan 1, 2027 · public holiday" leading={<ThingMark icon="icon-calendar-line" theme="red" />} />
                <ListItem title="Lunar New Year" caption="Feb 4 – Feb 10, 2027 · public holiday" leading={<ThingMark icon="icon-calendar-line" theme="red" />} />
              </List>
            </Stack>
          </> : null}
          {tab === "time-off" ? <>
            <Text as="p" textStyle="Body/Small/Regular" tone="base">{plural(daysLeft("annual", requests) ?? 0, "annual day")} left this year</Text>
            <RequestList requests={requests} />
          </> : null}
          {tab === "inbox" ? (
            // Opening a notification reads it; the tab's dot goes once nothing is unread.
            <List aria-label="Notifications">
              {notices.map((notice) => <ListItem key={notice.id} title={notice.title} caption={notice.caption} leading={<PersonAvatar person={notice.person} size="medium" />}
                onClick={() => setNotices((list) => list.map((entry) => (entry.id === notice.id ? { ...entry, unread: false } : entry)))}
                trailing={notice.unread ? <><Badge size="xs" theme="accent" background="subtle" aria-hidden="true">New</Badge><VisuallyHidden>Unread</VisuallyHidden></> : undefined} />)}
            </List>
          ) : null}
          {tab === "profile" ? <>
            <Stack gap="sm" align="center">
              <Avatar size="2xlarge" theme="blue" background="subtle" alt="">AD</Avatar>
              <Stack gap="none" align="center">
                <Heading level={2}>Alex Duong</Heading>
                <Text as="span" textStyle="Body/Small/Regular" tone="base">Design Lead · Đìzai Studio</Text>
              </Stack>
            </Stack>
            {phoneProfile.map((group) => (
              <Stack key={group.label} gap="2xs">
                <Heading level={3} textStyle="Body/Small/Bold" tone="light">{group.label}</Heading>
                <DescriptionList layout="stacked" divider items={group.items} />
              </Stack>
            ))}
          </> : null}
        </Stack>
        {/* Max height: the dates' calendar opens inside the sheet, under its field. */}
        <BottomSheet inline size="max" open={requesting} onOpenChange={(open) => { setRequesting(open); if (!open) form.reset(); }} title="Request leave"
          primaryAction={{ label: "Send request", onClick: () => { void form.handleSubmit(); } }} secondaryAction={{ label: "Cancel" }}>
          <LeaveFields form={form} requests={requests} />
        </BottomSheet>
      </PlatformPhone>
      </Stack>
    </ZenProvider>
  );
}
