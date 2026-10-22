/* Side Panel examples (brief: docs/research/example-rebuild-brief-2026-09-30.md; the screens rebuilt on the new
   AppShell 2026-10-19). Đìzai Studio, signed in as Alex Duong, Wednesday Sep 30, 2026, 10:30 am. Each example teaches one
   Side Panel decision: a row opens its record in a Modal panel and Close returns to the row; many filters wait in a
   Small panel that counts the results before you apply them; an edit form asks before it drops changes; a Standard panel
   docks beside a page that stays live (the AppShell's sidePanel, which docks while the page keeps a tablet width beside
   it and opens as a Modal otherwise); a panel keeps its frame while its content loads or fails; and a long title wraps
   while a long body scrolls on its own. The screens are pages of the studio's app (AppShell, the PageHeader as the
   header's Main row). A Side Panel has no phone variant: on a phone the same jobs are a pushed screen or a Bottom Sheet
   (those pages show them). */
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader } from "../../../components/AppShell";
import { Avatar } from "../../../components/Avatar";
import { Badge, type BadgeTheme } from "../../../components/Badge";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Checkbox } from "../../../components/Checkbox";
import { Chip } from "../../../components/Chip";
import { DescriptionList } from "../../../components/DescriptionList";
import { DashboardHeader } from "../../../components/DashboardHeader";
import { Dialog } from "../../../components/Dialog";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { Form, FormFieldset, useFormState } from "../../../components/Form";
import { InlineMessage } from "../../../components/InlineMessage";
import { DateField, InputField, SelectField, TextAreaField } from "../../../components/Input";
import { Box, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { PageHeader } from "../../../components/PageHeader";
import { RadioButton } from "../../../components/RadioButton";
import { Search } from "../../../components/Search";
import { SidePanel } from "../../../components/SidePanel";
import { Sidebar, SidebarMenuItem, type SidebarItem, type SidebarSection } from "../../../components/Sidebar";
import { SkeletonText } from "../../../components/Skeleton";
import { Table, TableBadges, TableMedia, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import type { PlatformPage } from "../../PlatformExamples";
import { PreviewAppFrame, StudioLogo } from "../../PlatformFrames";
import {
  TODAY, activity, daysFromToday, formatBytes, formatDate, formatDay, formatDue, formatMoney, formatRange, formatRelative, initials, leaveStatusTheme, me, people, peopleList, projectById, projects,
  projectStatusTheme, studio, type LeaveKind, type LeaveStatus, type Person, type PersonId, type ProjectStatus, type StudioFile, type Team,
} from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./side-panel.css";

export const page: PlatformPage = "side-panel";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const wait = (ms: number) => new Promise<void>((resolve) => { window.setTimeout(resolve, ms); });
/** A group label inside a panel: a kicker (Body/Small/Bold, Light), one level below the panel's h2 title. */
function Kicker({ id, children }: { id: string; children: string }) {
  return <Heading level={3} id={id} textStyle="Body/Small/Bold" tone="light">{children}</Heading>;
}

/** The width of an element, kept current: tables fold their columns on a phone-width page. */
function useWidth() {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return [setElement, width] as const;
}

// ——— The app around the screens ———————————————————————————————————————————————————————————————————————
/* Đìzai Studio's navigation: the same Sidebar on every screen, its current page selected. */
const studioNav: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "briefs", label: "Briefs", icon: "icon-file-doc-line" },
    { id: "people", label: "People", icon: "icon-users-line" },
    { id: "time-off", label: "Time off", icon: "icon-calendar-line" },
  ] },
  { label: "Finance", items: [
    { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
  ] },
];
const unreadActivity = activity.filter((item) => item.unread);
const firstUnread = unreadActivity[0];

/** The top row's utilities on every screen: Notifications with the unread count (read on open), then the account. */
function HeaderUtilities() {
  const { toast } = useToast();
  const [unread, setUnread] = useState(unreadActivity.length);
  const readAll = () => {
    toast(unread
      ? { title: plural(unread, "new notification"), children: `${people[firstUnread.actor].name} ${firstUnread.verb} “${firstUnread.object}”${unread > 1 ? `, and ${unread - 1} more` : ""}.` }
      : { title: "No new notifications", children: "You’re all caught up." });
    setUnread(0);
  };
  return (
    <>
      <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={readAll} />
      <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
        { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
        { type: "separator" },
        { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: `See you soon, ${me.name.split(" ")[0]}.` }) },
      ]} />
    </>
  );
}

/**
 * One screen of the studio's app (Layout=Sidebar): the Sidebar on the current page, the header's top row (an optional
 * Search at its start, then the utilities) and the page's PageHeader as the Main row, with `sections` under it. The Body
 * pads the page margins itself. A Modal Side Panel goes with the page's content: it opens over the scrim, wherever it sits.
 */
function StudioApp({ here, leading, main, sections, children }: { here: string; leading?: ReactNode; main: ReactNode; sections?: ReactNode; children: ReactNode }) {
  const { toast } = useToast();
  const go = (item: SidebarItem) => {
    if (item.id !== here) toast({ title: `${item.label} isn’t part of this example`, children: "Each screen here is one page of the studio’s app." });
  };
  return (
    <PreviewAppFrame>
      <AppShell
        sidebar={(
          <Sidebar logo={<StudioLogo src={studio.logo} name={studio.name} />} logoCollapsed={<Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />}
            sections={studioNav} selectedId={here} onItemClick={go}
            footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
        )}
        header={<AppShellHeader leading={leading} actions={<HeaderUtilities />} main={main} sections={sections} />}
      >
        {children}
      </AppShell>
    </PreviewAppFrame>
  );
}

// ——— 1. Record details: a row opens the person in a Modal panel ——————————————————————————————————————
const projectsOf = (id: PersonId) => projects.filter((project) => project.members.includes(id) || project.lead === id);
const directory = [...peopleList].sort((a, b) => a.name.localeCompare(b.name));
const personColumns: TableColumn<Person>[] = [
  { id: "name", header: "Name", cell: (person) => <TableMedia bold media={<Avatar size="sm" {...avatarOf(person)} />} caption={person.role}>{person.name}</TableMedia> },
  { id: "team", header: "Team", width: "180px", cell: (person) => <TableText>{person.team}</TableText> },
  { id: "office", header: "Office", width: "180px", cell: (person) => <TableText>{person.location}</TableText> },
  { id: "projects", header: "Projects", align: "right", width: "110px", cell: (person) => <TableText>{String(projectsOf(person.id as PersonId).length)}</TableText> },
];
/* A phone-width page keeps the person; the team and the office move into the caption. */
const narrowPersonColumns: TableColumn<Person>[] = [
  { id: "name", header: "Name", cell: (person) => <TableMedia bold media={<Avatar size="sm" {...avatarOf(person)} />} caption={`${person.team} · ${person.location}`}>{person.name}</TableMedia> },
];

function PeopleDirectoryExample() {
  const { toast } = useToast();
  const projectsId = useId();
  // The opened person stays set while the panel animates out.
  const [opened, setOpened] = useState<Person>(people.chi);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [inviting, setInviting] = useState(false);
  const [measure, width] = useWidth();
  const needle = query.trim().toLowerCase();
  const rows = directory.filter((person) => !needle || `${person.name} ${person.role} ${person.team} ${person.location}`.toLowerCase().includes(needle));
  const onProjects = projectsOf(opened.id as PersonId);
  const copyEmail = () => {
    void navigator.clipboard?.writeText(opened.email).catch(() => null);
    toast({ title: "Email copied", children: opened.email });
  };
  return (
    <StudioApp here="people"
      leading={<Box width="fill" maxWidth={400}><Search placeholder="Search people" value={query} onValueChange={setQuery} /></Box>}
      main={<PageHeader title="People" description={`${plural(directory.length, "person", "people")} on client projects in Ho Chi Minh City, Hanoi, Singapore and remote.`}
        actions={<Button level="primary" startIcon="icon-user-plus-line" onClick={() => setInviting(true)}>Invite person</Button>} />}
    >
      {/* Read-only rows: the whole row opens the person (Tab reaches it, Enter opens it). The table lies on the page. */}
      <Stack ref={measure} gap="md">
        <Table aria-label="People" columns={width > 0 && width < 560 ? narrowPersonColumns : personColumns} rows={rows} onRowClick={(person) => { setOpened(person); setOpen(true); }}
          empty={<EmptyState size="sm" headingLevel={2} icon="icon-search-medium-line" title="Nobody matches" secondaryAction={{ label: "Show everyone", onClick: () => setQuery("") }}>Try a name, a team or an office.</EmptyState>} />
      </Stack>
      {/* Modal: the table waits behind the scrim; Close, Escape or the scrim return focus to the row. */}
      <SidePanel type="modal" open={open} onOpenChange={setOpen} title={opened.name} description={`${opened.role} · ${opened.team}`}>
        <Avatar size="lg" {...avatarOf(opened)} />
        <DescriptionList items={[
          { id: "email", term: "Email", description: opened.email,
            action: <IconButton appearance="flat" size="sm" icon="icon-copy-line" aria-label={`Copy ${opened.name}’s email`} onClick={copyEmail} /> },
          { id: "team", term: "Team", description: opened.team },
          { id: "office", term: "Office", description: opened.location },
        ]} />
        <Stack as="section" gap="xs" aria-labelledby={projectsId}>
          <Kicker id={projectsId}>Projects</Kicker>
          {onProjects.length ? (
            <List aria-labelledby={projectsId}>
              {onProjects.map((project) => (
                <ListItem key={project.id} title={project.name} caption={project.client}
                  leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />}
                  trailing={<Badge theme={projectStatusTheme[project.status]} background="subtle">{project.status}</Badge>} />
              ))}
            </List>
          ) : (
            <EmptyState size="sm" headingLevel={4} icon="icon-folder-line" title="No projects yet">{`${opened.name.split(" ")[0]} isn't on a project team right now.`}</EmptyState>
          )}
        </Stack>
      </SidePanel>
      <DemoFieldDialog open={inviting} onOpenChange={setInviting} title={`Invite to ${studio.name}`} field={{ kind: "email", label: "Email address", placeholder: "name@dizai.studio" }}
        submitLabel="Send invite" confirm={(email) => `Invite sent to ${email}`} />
    </StudioApp>
  );
}

// ——— 2. All filters: a Small panel that counts before it applies ————————————————————————————————————————
type Request = { id: string; person: PersonId; kind: LeaveKind; from: Date; to: Date; days: number; status: LeaveStatus };
const leaveKinds: LeaveKind[] = ["Annual leave", "Sick leave", "Unpaid leave"];
const statuses: LeaveStatus[] = ["Pending", "Approved", "Declined", "Cancelled"];
const teams: Team[] = ["Design", "Engineering", "Delivery", "Client Services", "Operations"];
type When = "any" | "upcoming" | "past";
const whenOptions: { value: When; label: string }[] = [{ value: "any", label: "Any time" }, { value: "upcoming", label: "Upcoming" }, { value: "past", label: "Already taken" }];
const day = (month: number, date: number) => new Date(2026, month - 1, date);
const requests: Request[] = ([
  ["chi", "Annual leave", day(10, 19), day(10, 21), 3, "Pending"], ["emi", "Annual leave", day(10, 26), day(10, 27), 2, "Pending"],
  ["alex", "Annual leave", day(10, 12), day(10, 14), 3, "Approved"], ["khoa", "Annual leave", day(11, 9), day(11, 13), 5, "Pending"],
  ["gia", "Unpaid leave", day(11, 2), day(11, 6), 5, "Declined"], ["linh", "Annual leave", day(10, 5), day(10, 6), 2, "Approved"],
  ["bao", "Sick leave", day(9, 28), day(9, 28), 1, "Approved"], ["hana", "Annual leave", day(12, 21), day(12, 24), 4, "Pending"],
  ["ava", "Sick leave", day(9, 22), day(9, 23), 2, "Approved"], ["duy", "Annual leave", day(9, 14), day(9, 18), 5, "Approved"],
  ["em", "Annual leave", day(10, 30), day(10, 30), 1, "Cancelled"], ["mai", "Annual leave", day(11, 23), day(11, 27), 5, "Approved"],
  ["finn", "Unpaid leave", day(12, 28), day(12, 31), 4, "Pending"], ["minhAnh", "Sick leave", day(9, 8), day(9, 8), 1, "Approved"],
] as const).map(([person, kind, from, to, days, status], index): Request => ({ id: `r${index}`, person, kind, from, to, days, status }))
  // Pending requests first (they wait for someone), then the latest dates.
  .sort((a, b) => Number(b.status === "Pending") - Number(a.status === "Pending") || b.from.getTime() - a.from.getTime());
type Picks = { kinds: LeaveKind[]; teams: Team[]; when: When };
const noPicks: Picks = { kinds: [], teams: [], when: "any" };
const countPicks = (picks: Picks) => picks.kinds.length + picks.teams.length + (picks.when === "any" ? 0 : 1);
const matches = (picks: Picks, status: LeaveStatus | null) => (request: Request) =>
  (!status || request.status === status)
  && (!picks.kinds.length || picks.kinds.includes(request.kind))
  && (!picks.teams.length || picks.teams.includes(people[request.person].team))
  && (picks.when === "any" || (picks.when === "upcoming" ? request.from > TODAY : request.from <= TODAY));
const datesOf = (request: Request) => (request.from.getTime() === request.to.getTime() ? formatDate(request.from) : formatRange(request.from, request.to));
const requestColumns: TableColumn<Request>[] = [
  { id: "person", header: "Person", cell: (request) => <TableMedia bold media={<Avatar size="sm" {...avatarOf(people[request.person])} />} caption={people[request.person].team}>{people[request.person].name}</TableMedia> },
  { id: "kind", header: "Type", width: "150px", cell: (request) => <TableText>{request.kind}</TableText> },
  { id: "dates", header: "Dates", width: "230px", cell: (request) => <TableText>{datesOf(request)}</TableText> },
  { id: "days", header: "Days", align: "right", width: "90px", cell: (request) => <TableText>{String(request.days)}</TableText> },
  { id: "status", header: "Status", width: "130px", cell: (request) => <TableBadges><Badge theme={leaveStatusTheme[request.status]} background="subtle">{request.status}</Badge></TableBadges> },
];
/* A phone-width page has no room for a second column: the person, then the status, the type and the dates (without
   the year, which is this year's) in the caption. */
const shortDatesOf = (request: Request) => (request.from.getTime() === request.to.getTime() ? formatDay(request.from) : `${formatDay(request.from)} – ${formatDay(request.to)}`);
const narrowRequestColumns: TableColumn<Request>[] = [
  { id: "person", header: "Request", cell: (request) => <TableMedia bold media={<Avatar size="sm" {...avatarOf(people[request.person])} />} caption={`${request.status} · ${request.kind} · ${shortDatesOf(request)}`}>{people[request.person].name}</TableMedia> },
];

function AllFiltersExample() {
  const { toast } = useToast();
  const [status, setStatus] = useState<LeaveStatus | null>(null);
  const [applied, setApplied] = useState(noPicks);
  const [draft, setDraft] = useState(noPicks);
  const [open, setOpen] = useState(false);
  const [measure, width] = useWidth();
  const rows = requests.filter(matches(applied, status));
  const draftCount = requests.filter(matches(draft, status)).length;
  const active = countPicks(applied);
  const openPanel = () => { setDraft(applied); setOpen(true); };
  const apply = () => { setApplied(draft); setOpen(false); };
  const clearAll = () => { setStatus(null); setApplied(noPicks); };
  const flip = <K extends "kinds" | "teams">(key: K, value: Picks[K][number], on: boolean) =>
    setDraft((current) => ({ ...current, [key]: on ? [...current[key], value] : (current[key] as string[]).filter((x) => x !== value) }));
  return (
    <StudioApp here="time-off"
      main={<PageHeader title="Leave requests" description="Everyone's time off at the studio. Requests that wait for an answer come first."
        actions={<Button level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Export started", children: `leave-requests.csv · ${plural(rows.length, "row")}` })}>Export</Button>} />}
      // Sections: the filter row under the title, at the page margins; it stays in view while the table scrolls.
      sections={(
        <Stack direction="row" gap="xs" align="center" wrap>
          {/* The filter people use most is promoted to a chip; the rest wait in All filters. */}
          <Chip variant="advanced" dropdown selected={status !== null} popoverLabel="Status"
            popoverItems={statuses.map((option) => ({ id: option, label: option, selected: option === status }))}
            onPopoverSelect={(item) => setStatus(item.id === status ? null : (item.id as LeaveStatus))} onClearSelection={() => setStatus(null)}>
            {status ?? "Status"}
          </Chip>
          <Chip variant="advanced" leading="icon-filter-lines-line" aria-haspopup="dialog" aria-expanded={open}
            selected={active > 0} selectionMode="multiple" selectionCount={active} onClick={openPanel} onClearSelection={() => setApplied(noPicks)}>
            All filters
          </Chip>
          <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "request")}</Text>
        </Stack>
      )}
    >
      {/* The table is the page's content: it lies on the page, no Card. */}
      <Stack ref={measure} gap="md">
        <Table aria-label="Leave requests" columns={width > 0 && width < 640 ? narrowRequestColumns : requestColumns} rows={rows}
          empty={<EmptyState headingLevel={2} icon="icon-search-medium-line" title="No requests match" secondaryAction={{ label: "Clear filters", onClick: clearAll }}>Try another status or fewer filters.</EmptyState>} />
      </Stack>
      {/* Small: a column of choices. The primary counts what Apply would show, so nobody applies their way to nothing. */}
      <SidePanel type="modal" size="small" open={open} onOpenChange={setOpen} title="All filters"
        primaryAction={{ label: draftCount ? `Show ${plural(draftCount, "request")}` : "No requests match", onClick: apply, disabled: draftCount === 0 }}
        secondaryAction={{ label: "Clear all", onClick: () => setDraft(noPicks) }}>
        <Stack gap="lg">
          <FormFieldset kind="checkbox" legend="Type">
            {leaveKinds.map((kind) => <Checkbox key={kind} label={kind} checked={draft.kinds.includes(kind)} onCheckedChange={(on) => flip("kinds", kind, on)} />)}
          </FormFieldset>
          <FormFieldset kind="checkbox" legend="Team">
            {teams.map((team) => <Checkbox key={team} label={team} checked={draft.teams.includes(team)} onCheckedChange={(on) => flip("teams", team, on)} />)}
          </FormFieldset>
          <FormFieldset kind="radio" legend="When">
            {whenOptions.map((option) => (
              <RadioButton key={option.value} name="leave-when" value={option.value} label={option.label} checked={draft.when === option.value}
                onCheckedChange={(checked) => { if (checked) setDraft((current) => ({ ...current, when: option.value })); }} />
            ))}
          </FormFieldset>
        </Stack>
      </SidePanel>
    </StudioApp>
  );
}

// ——— 3. Edit in a panel: a form that asks before it drops changes ——————————————————————————————————————
type ProjectValues = { name: string; status: ProjectStatus; lead: PersonId; due: string; brief: string };
const loyalty = projectById("phin-loyalty");
const asDay = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
/** "11/02/2026" (the DateField's typed format) → a Date, or null while it is incomplete or not a real day. */
const parseDay = (text: string) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  const d = m ? new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])) : null;
  return d && d.getDate() === Number(m?.[2]) ? d : null;
};
const projectStatuses: ProjectStatus[] = ["Planning", "Active", "On hold", "Completed"];
const leadIds: PersonId[] = ["chi", "alex", "duy", "gia"];
const savedProject: ProjectValues = {
  name: loyalty.name, status: loyalty.status, lead: loyalty.lead, due: asDay(loyalty.due),
  brief: "Points, rewards and checkout for the Phin & Co coffee app on iOS and Android.",
};

function EditProjectExample() {
  const { toast } = useToast();
  const titleId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [project, setProject] = useState(savedProject);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const form = useFormState<ProjectValues>({
    initialValues: savedProject,
    validate: (values) => ({
      name: values.name.trim() ? undefined : "Name the project",
      due: parseDay(values.due) ? undefined : "Enter the due date, like 11/02/2026",
    }),
    onSubmit: async (values) => {
      await wait(700);
      setProject({ ...values, name: values.name.trim() });
      setOpen(false);
      toast({ type: "positive", title: "Project saved" });
    },
  });
  const edit = () => { form.reset(project); setOpen(true); };
  // Close, Cancel, Escape and the scrim all come here: with edits, ask first.
  const requestClose = () => { if (form.isSubmitting) return; if (form.isDirty) setConfirming(true); else setOpen(false); };
  const discard = () => { setConfirming(false); setOpen(false); };
  const due = parseDay(project.due) ?? loyalty.due;
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}
      subAction={{ label: "Edit project", icon: "icon-edit-02-line", onClick: edit }}>
      <Stack gap="md">
        <Stack gap="xs">
          <Stack direction="row" gap="2xs" align="center" wrap>
            <Heading level={4} id={titleId} textStyle="Heading/Subheading">{project.name}</Heading>
            <Badge theme={projectStatusTheme[project.status]} background="subtle">{project.status}</Badge>
          </Stack>
          <Text textStyle="Body/Small/Regular" tone="base">{project.brief || "Phin & Co"}</Text>
        </Stack>
        <DescriptionList items={[
          { id: "client", term: "Client", description: "Phin & Co" },
          { id: "lead", term: "Lead", description: people[project.lead].name },
          { id: "due", term: "Due", description: formatDate(due) },
        ]} />
      </Stack>
      <SidePanel type="modal" open={open} onOpenChange={(next) => (next ? setOpen(true) : requestClose())} title="Edit project" description="Loyalty app · Phin & Co"
        // The footer sits outside the form, so Save changes submits it: errors then get focus and are announced.
        primaryAction={{ label: form.isSubmitting ? "Saving…" : "Save changes", disabled: form.isSubmitting, onClick: () => formRef.current?.requestSubmit() }}
        secondaryAction={{ label: "Cancel", onClick: requestClose }}>
        <Form ref={formRef} form={form} gap="md" aria-label="Edit project">
          <InputField label="Project name" maxLength={60} {...form.field("name")} />
          <SelectField label="Status" options={projectStatuses.map((value) => ({ value, label: value }))} {...form.selectField("status")} />
          <SelectField label="Project lead" options={leadIds.map((id) => ({ value: id, label: people[id].name }))} {...form.selectField("lead")} />
          <DateField label="Due date" today={TODAY} {...form.dateField("due")} />
          <TextAreaField label="Brief" labelOptional rows={4} maxLength={200} characterLimit {...form.field("brief")} />
        </Form>
      </SidePanel>
      {/* The one Dialog a panel may open: it guards edits that would be lost. */}
      <Dialog open={confirming} onOpenChange={setConfirming} theme="warning" title="Discard changes?"
        description="Your edits to Loyalty app are lost."
        primaryAction={{ label: "Discard changes", level: "danger", onClick: discard }}
        secondaryAction={{ label: "Keep editing", autoFocus: true }} />
    </Card>
  );
}

// ——— 4. Docked details: a Standard panel beside a page that stays live ——————————————————————————————————
type Access = { person: PersonId; can: "Can edit" | "Can view" };
type LoyaltyFile = Pick<StudioFile, "id" | "name" | "bytes" | "owner" | "updated"> & { access: Access[] };
const loyaltyFiles: LoyaltyFile[] = [
  { id: "f1", name: "Loyalty app – points history.fig", bytes: 18_400_000, owner: "chi", updated: daysFromToday(0, 10, 17), access: [{ person: "bao", can: "Can edit" }, { person: "em", can: "Can view" }, { person: "duy", can: "Can view" }] },
  { id: "f3", name: "Rewards API contract.json", bytes: 86_000, owner: "bao", updated: daysFromToday(-2, 9, 40), access: [{ person: "chi", can: "Can view" }, { person: "finn", can: "Can edit" }] },
  { id: "f7", name: "Points history – flows.fig", bytes: 9_800_000, owner: "chi", updated: daysFromToday(-3, 15, 10), access: [{ person: "bao", can: "Can view" }] },
  { id: "f8", name: "Loyalty tiers – research synthesis, round 2.pdf", bytes: 3_150_000, owner: "ava", updated: daysFromToday(-6, 11, 30), access: [{ person: "chi", can: "Can edit" }, { person: "duy", can: "Can view" }, { person: "alex", can: "Can view" }] },
  { id: "f9", name: "Android 2.4 release notes.docx", bytes: 240_000, owner: "em", updated: daysFromToday(-8, 17, 5), access: [{ person: "bao", can: "Can edit" }, { person: "duy", can: "Can edit" }] },
  { id: "f10", name: "Rewards checkout – copy deck.docx", bytes: 410_000, owner: "linh", updated: daysFromToday(-12, 14, 0), access: [{ person: "chi", can: "Can edit" }] },
  { id: "f11", name: "Launch plan – Nov 2.xlsx", bytes: 1_260_000, owner: "duy", updated: daysFromToday(-15, 9, 15), access: [{ person: "alex", can: "Can edit" }, { person: "hana", can: "Can view" }] },
];
const fileColumns: TableColumn<LoyaltyFile>[] = [
  { id: "name", header: "Name", cell: (file) => <TableMedia bold media={<FileIcon format={fileIconFormatOf(file.name)} size="lg" />} caption={people[file.owner].name}>{file.name}</TableMedia> },
  { id: "updated", header: "Updated", width: "180px", cell: (file) => <TableText>{formatRelative(file.updated)}</TableText> },
  { id: "size", header: "Size", align: "right", width: "100px", cell: (file) => <TableText>{formatBytes(file.bytes)}</TableText> },
];
/* A phone-width page keeps the file; its owner and when it changed move into the caption. */
const narrowFileColumns: TableColumn<LoyaltyFile>[] = [
  { id: "name", header: "Name", cell: (file) => <TableMedia bold media={<FileIcon format={fileIconFormatOf(file.name)} size="lg" />} caption={`${people[file.owner].name} · ${formatRelative(file.updated)}`}>{file.name}</TableMedia> },
];
type FileKind = "Designs" | "Documents" | "Spreadsheets" | "Code";
const fileKinds: FileKind[] = ["Designs", "Documents", "Spreadsheets", "Code"];
const kindOf = (name: string): FileKind => (/\.fig$/.test(name) ? "Designs" : /\.xlsx$/.test(name) ? "Spreadsheets" : /\.json$/.test(name) ? "Code" : "Documents");
/** "Bao Nguyen, Duy Le" · "Only the owner" */
const namesOf = (access: Access[], can: Access["can"]) => access.filter((entry) => entry.can === can).map((entry) => people[entry.person].name).join(", ") || (can === "Can edit" ? "Only the owner" : "No one else");
/** The AppShell docks the panel while the page keeps a tablet width (744) beside it (360): on this Top-Bar screen (no
 *  Sidebar) from 1104 wide. Narrower, the same panel opens as a Modal, so it starts closed there. */
const dockMinWidth = 360 + 744;

/** The frame's width, kept current: the panel starts open only where it docks. */
function useFrameWidth() {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!frame) return undefined;
    setWidth(frame.offsetWidth);
    const observer = new ResizeObserver(() => setWidth(frame.offsetWidth));
    observer.observe(frame);
    return () => observer.disconnect();
  }, [frame]);
  return [setFrame, width] as const;
}

function DockedDetailsExample() {
  const { toast } = useToast();
  const [frameRef, frameWidth] = useFrameWidth();
  const [selectedId, setSelectedId] = useState("f1");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<FileKind | null>(null);
  const [measure, width] = useWidth();
  // Open by default where the panel docks; in a narrower window it opens on demand (as a Modal).
  const [choice, setChoice] = useState<boolean | null>(null);
  const open = choice ?? (frameWidth > 0 && frameWidth >= dockMinWidth);
  const needle = query.trim().toLowerCase();
  const rows = loyaltyFiles.filter((item) => (!kind || kindOf(item.name) === kind) && (!needle || `${item.name} ${people[item.owner].name}`.toLowerCase().includes(needle)));
  const clear = () => { setQuery(""); setKind(null); };
  const file = loyaltyFiles.find((item) => item.id === selectedId)!;
  const extension = file.name.split(".").pop()!.toUpperCase();
  return (
    <PreviewAppFrame frameRef={frameRef}>
      {/* Top-Bar: the project's file space has no navigation of its own, so the header runs across and the docked panel
          sits under it, beside the page (Figma Side-Panel Standard, Small 360). */}
      <AppShell pattern="top-bar"
        header={(
          <AppShellHeader
            leading={<StudioLogo src={studio.logo} name={studio.name} />}
            actions={<HeaderUtilities />}
            // No eyebrow: the description already names the project (one style less on a calm page).
            main={<PageHeader title="Files" description="Design files, specs and plans for the Phin & Co loyalty app."
              trailing={<IconButton level="tertiary" icon="icon-layout-right-line" aria-label={open ? "Hide details" : "Show details"} aria-pressed={open} onClick={() => setChoice(!open)} />} />}
            // Sections: the control bar over the list (on a phone the Search takes a line of its own).
            sections={(
              <DashboardHeader
                search={<Search size="md" placeholder="Search files" value={query} onValueChange={setQuery} />}
                controls={(
                  <Chip variant="advanced" dropdown selected={kind !== null} popoverLabel="Type"
                    popoverItems={fileKinds.map((option) => ({ id: option, label: option, selected: option === kind }))}
                    onPopoverSelect={(item) => setKind(item.id === kind ? null : (item.id as FileKind))} onClearSelection={() => setKind(null)}>
                    {kind ?? "Type"}
                  </Chip>
                )}
                subheading={plural(rows.length, "file")} />
            )}
          />
        )}
        // Standard: the page stays live, so picking another file updates the panel beside it. The shell docks it while
        // the page keeps a tablet width and opens it as a Modal otherwise.
        sidePanel={(
          <SidePanel type="standard" size="small" open={open} onOpenChange={setChoice}
            title={file.name} description={`${extension} file · ${formatBytes(file.bytes)}`}
            primaryAction={{ label: "Copy link", onClick: () => { void navigator.clipboard?.writeText(`https://${studio.domain}/files/${file.id}`).catch(() => null); toast({ title: "Link copied", children: file.name }); } }}>
            <DescriptionList items={[
              { id: "owner", term: "Owner", description: people[file.owner].name },
              { id: "project", term: "Project", description: "Loyalty app" },
              { id: "updated", term: "Updated", description: formatRelative(file.updated) },
              { id: "editors", term: "Can edit", description: namesOf(file.access, "Can edit") },
              { id: "viewers", term: "Can view", description: namesOf(file.access, "Can view") },
            ]} />
          </SidePanel>
        )}
      >
        <Stack ref={measure} gap="md">
          <Table aria-label="Files" columns={width > 0 && width < 560 ? narrowFileColumns : fileColumns} rows={rows} onRowClick={(row) => { setSelectedId(row.id); setChoice(true); }}
            empty={<EmptyState size="sm" headingLevel={2} icon="icon-search-medium-line" title="No files match" secondaryAction={{ label: "Clear filters", onClick: clear }}>Try a file name, its owner or another type.</EmptyState>} />
        </Stack>
      </AppShell>
    </PreviewAppFrame>
  );
}

// ——— 5. Loading and errors: the panel keeps its frame while its content arrives ——————————————————————————————
type Unpaid = { id: string; number: string; client: string; project: string; amount: number; status: "Sent" | "Overdue"; issued: Date; due: Date; lines: { label: string; amount: number }[] };
const unpaidTheme: Record<Unpaid["status"], BadgeTheme> = { Sent: "blue", Overdue: "red" };
const unpaid: Unpaid[] = [
  { id: "i3", number: "INV-2026-0139", client: "Mekong Freight", project: "Shipment tracking", amount: 12880, status: "Overdue", issued: daysFromToday(-44), due: daysFromToday(-14),
    lines: [{ label: "Discovery workshops", amount: 7200 }, { label: "Service blueprint", amount: 5680 }] },
  { id: "i7", number: "INV-2026-0137", client: "Saola Outdoor", project: "Brand refresh", amount: 6000, status: "Overdue", issued: daysFromToday(-37), due: daysFromToday(-7),
    lines: [{ label: "Brand audit", amount: 6000 }] },
  { id: "i1", number: "INV-2026-0142", client: "Phin & Co", project: "Loyalty app", amount: 21000, status: "Sent", issued: daysFromToday(-5), due: daysFromToday(25),
    lines: [{ label: "Milestone 2: rewards", amount: 16500 }, { label: "Usability testing", amount: 4500 }] },
  { id: "i8", number: "INV-2026-0140", client: "Lumen Bank", project: "Online banking redesign", amount: 18600, status: "Sent", issued: daysFromToday(-12), due: daysFromToday(33),
    lines: [{ label: "Design sprint 4", amount: 14400 }, { label: "Accessibility audit", amount: 4200 }] },
];

/** Placeholder rows of a DescriptionList: a short term at the start, a value at the end, its rows xs apart. */
function SkeletonRows({ count }: { count: number }) {
  return (
    <Stack gap="xs">
      {Array.from({ length: count }, (_, index) => (
        <Stack key={index} direction="row" gap="md" justify="between" align="center" className="px-side-panel-skeleton-row">
          <SkeletonText lines={1} className="px-side-panel-skeleton-term" />
          <SkeletonText lines={1} className="px-side-panel-skeleton-value" />
        </Stack>
      ))}
    </Stack>
  );
}

function InvoicePanelExample() {
  const { toast } = useToast();
  const titleId = useId();
  const linesId = useId();
  const [opened, setOpened] = useState(unpaid[0]);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const failedOnce = useRef(new Set<string>());
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // The billing service answers after a moment; in this demo its first answer for INV-2026-0139 fails.
  const load = (invoice: Unpaid) => {
    setState("loading");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const fail = invoice.id === "i3" && !failedOnce.current.has(invoice.id);
      if (fail) failedOnce.current.add(invoice.id);
      setState(fail ? "error" : "ready");
    }, 900);
  };
  const openInvoice = (invoice: Unpaid) => { setOpened(invoice); setOpen(true); load(invoice); };
  // The message and its button leave while the retry runs, so focus waits on the panel itself (its title is read).
  const retry = () => { (document.activeElement?.closest(".zen-side-panel") as HTMLElement | null)?.focus(); load(opened); };
  const remind = () => { setOpen(false); toast({ title: "Reminder sent", children: `${opened.number} · ${opened.client}` }); };
  return (
    <>
      {/* A ListBox: the title and the total in its Header-Slot, the invoices in its Body-Slot. */}
      <ListBox as="section" aria-labelledby={titleId}
        header={<Stack gap="2xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Unpaid invoices</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${formatMoney(unpaid.reduce((sum, invoice) => sum + invoice.amount, 0))} across ${plural(unpaid.length, "invoice")}`}</Text>
        </Stack>}>
        <List aria-labelledby={titleId}>
          {unpaid.map((invoice) => (
            // The number names the panel it opens; the row keeps client, amount and status, so nothing is cut on a phone.
            <ListItem key={invoice.id} title={invoice.client} titleLines={2} caption={formatMoney(invoice.amount)}
              leading={<DockIcon icon="icon-receipt-line" theme="neutral" background="subtle" />}
              trailing={<Badge theme={unpaidTheme[invoice.status]} background="subtle">{invoice.status}</Badge>}
              onClick={() => openInvoice(invoice)} />
          ))}
        </List>
      </ListBox>
      {/* The panel opens at once with its title, so people see their click landed; the body fills in after. It is a
          modal (portalled), so it sits beside the ListBox, not in its rows. */}
      <SidePanel type="modal" open={open} onOpenChange={setOpen} title={opened.number} description={`${opened.client} · ${opened.project}`}
        primaryAction={{ label: "Send reminder", onClick: remind, disabled: state !== "ready" }}>
        {state === "loading" ? (
          // The placeholders take the shape of what arrives: term · value rows, the kicker, then the line items and
          // the total, so nothing jumps when the details land.
          <Stack gap="lg" aria-busy="true">
            <VisuallyHidden role="status">Loading invoice</VisuallyHidden>
            <SkeletonRows count={3} />
            <Stack gap="xs">
              <Stack direction="row" align="center" className="px-side-panel-skeleton-kicker">
                <SkeletonText lines={1} className="px-side-panel-skeleton-kicker-bar" />
              </Stack>
              <SkeletonRows count={opened.lines.length + 1} />
            </Stack>
          </Stack>
        ) : state === "error" ? (
          <InlineMessage theme="negative" title="Invoice didn't load" action={{ label: "Try again", onClick: retry }}>
            Zen couldn't reach the billing service. Nothing has changed.
          </InlineMessage>
        ) : (
          <Stack gap="lg">
            <DescriptionList items={[
              { id: "status", term: "Status", description: <Badge theme={unpaidTheme[opened.status]} background="subtle">{opened.status}</Badge> },
              { id: "issued", term: "Issued", description: formatDate(opened.issued) },
              { id: "due", term: "Due", description: `${formatDate(opened.due)} · ${formatDue(opened.due).replace(/^Due in/, "in")}` },
            ]} />
            <Stack as="section" gap="xs" aria-labelledby={linesId}>
              <Kicker id={linesId}>Line items</Kicker>
              <DescriptionList items={[
                ...opened.lines.map((line) => ({ id: line.label, term: line.label, description: formatMoney(line.amount, true) })),
                { id: "total", term: "Total", description: formatMoney(opened.amount, true), emphasis: true },
              ]} />
            </Stack>
          </Stack>
        )}
      </SidePanel>
    </>
  );
}

// ——— 6. Long content: a long title wraps, a long history scrolls inside the panel ——————————————————————————————
/** The studio's briefs. The first has a long working title and a history of many changes: the panel's title wraps
 *  instead of truncating, and only the body scrolls, so the title and the actions stay in reach. */
type Brief = { id: string; title: string; client: string; lead: Person; icon: "icon-file-doc-line"; theme: "blue" | "orange" | "teal" | "green" | "purple"; changes: number; crew: PersonId[] };
const briefs: Brief[] = [
  { id: "lumen-cards", title: "Card controls and spending limits for the Lumen Bank mobile app, phase 2", client: "Lumen Bank", lead: people.alex, icon: "icon-file-doc-line", theme: "blue", changes: 24, crew: ["alex", "ava", "finn", "khoa", "hana", "chi"] },
  { id: "phin-rewards", title: "Loyalty app: points, rewards and checkout", client: "Phin & Co", lead: people.chi, icon: "icon-file-doc-line", theme: "orange", changes: 9, crew: ["chi", "bao", "duy", "linh"] },
  { id: "mekong-holds", title: "Shipment tracking: customs holds and alerts", client: "Mekong Freight", lead: people.duy, icon: "icon-file-doc-line", theme: "teal", changes: 6, crew: ["duy", "khoa", "bao"] },
  { id: "saola-range", title: "Brand refresh for the outdoor range", client: "Saola Outdoor", lead: people.gia, icon: "icon-file-doc-line", theme: "green", changes: 4, crew: ["gia", "emi", "linh"] },
  { id: "bookfair-tickets", title: "Book Fair 2026 website: programme and tickets", client: "Hanoi Book Fair", lead: people.gia, icon: "icon-file-doc-line", theme: "purple", changes: 12, crew: ["gia", "linh", "em"] },
];
const briefVerbs = ["edited the scope of", "commented on", "attached a file to", "moved the due date of", "approved", "asked for changes to"];
const historyOf = (brief: Brief) => Array.from({ length: brief.changes }, (_, index) => {
  const person = people[brief.crew[index % brief.crew.length]];
  return { id: `${brief.id}-h${index}`, person, verb: briefVerbs[index % briefVerbs.length], at: daysFromToday(-index, 16 - (index % 6), 10 + index) };
});

function LongContentExample() {
  const { toast } = useToast();
  const historyId = useId();
  const listId = useId();
  const [openedId, setOpenedId] = useState(briefs[0].id);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const brief = briefs.find((item) => item.id === openedId)!;
  const history = historyOf(brief);
  return (
    <StudioApp here="briefs"
      main={<PageHeader title="Briefs" description={`${plural(briefs.length, "client brief")} the studio is working from`}
        actions={<Button level="primary" startIcon="icon-plus-line" onClick={() => setCreating(true)}>New brief</Button>} />}
    >
      {/* The page's elevation follows the default Sidebar: a shadowed ListBox. */}
      <ListBox as="section" theme="shadow" aria-labelledby={listId}
        header={<Heading level={2} id={listId} textStyle="Heading/Subheading">All briefs</Heading>}>
        <List aria-labelledby={listId}>
          {briefs.map((item) => (
            <ListItem key={item.id} title={item.title} titleLines={2} caption={`${item.client} · ${plural(item.changes, "change")}`}
              leading={<DockIcon icon={item.icon} theme={item.theme} background="subtle" />} onClick={() => { setOpenedId(item.id); setOpen(true); }} />
          ))}
        </List>
      </ListBox>
      <SidePanel type="modal" open={open} onOpenChange={setOpen} title={brief.title} description={`${brief.client} · Lead ${brief.lead.name}`}
        primaryAction={{ label: "Export history", onClick: () => toast({ title: "History exported", children: `${plural(history.length, "change")} as a CSV file` }) }}>
        <Stack as="section" gap="xs" aria-labelledby={historyId}>
          <Kicker id={historyId}>History</Kicker>
          <List aria-labelledby={historyId}>
            {history.map((entry) => (
              <ListItem key={entry.id} title={entry.person.name} caption={`${entry.verb[0].toUpperCase()}${entry.verb.slice(1)} the brief · ${formatRelative(entry.at)}`}
                leading={<Avatar size="md" {...avatarOf(entry.person)} />} />
            ))}
          </List>
        </Stack>
      </SidePanel>
      <DemoFieldDialog open={creating} onOpenChange={setCreating} title="New brief" field={{ kind: "name", label: "Brief title", placeholder: "Savings goals research, round 1" }}
        submitLabel="Create brief" confirm={(title) => `“${title}” created`} />
    </StudioApp>
  );
}

// ——— Examples ———————————————————————————————————————————————————————————————————————————————————————
export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Open a record",
    description: "On the People page a read-only row opens its person in a Modal panel: the whole row is the target, the page waits behind the scrim, and Close, Escape or the scrim put focus back on the row. Headings inside start one level below the panel's h2 title. The Search in the header's top row narrows the table.",
    wide: true,
    screen: true,
    render: () => <PeopleDirectoryExample />,
    code: `const [opened, setOpened] = useState<Person>(people.chi);
const [open, setOpen] = useState(false);

<AppShell
  sidebar={<Sidebar sections={nav} selectedId="people" onItemClick={go} />}
  header={<AppShellHeader leading={<Search placeholder="Search people" value={query} onValueChange={setQuery} />}
    actions={<>{notifications}{account}</>}
    main={<PageHeader title="People" description="14 people on client projects…"
      actions={<Button level="primary" startIcon="icon-user-plus-line" onClick={invite}>Invite person</Button>} />} />}
>
  <Table aria-label="People" columns={columns} rows={rows} onRowClick={(person) => { setOpened(person); setOpen(true); }} />

  {/* Modal: it opens over the scrim, wherever it sits in the page */}
  <SidePanel type="modal" open={open} onOpenChange={setOpen} title={opened.name} description={\`\${opened.role} · \${opened.team}\`}>
    <Avatar size="lg" {...avatarOf(opened)} />
    <DescriptionList items={[
      { term: "Email", description: opened.email,
        action: <IconButton appearance="flat" size="sm" icon="icon-copy-line" aria-label={\`Copy \${opened.name}’s email\`} onClick={copyEmail} /> },
      { term: "Team", description: opened.team },
      { term: "Office", description: opened.location },
    ]} />
    <Heading level={3} id="projects" textStyle="Body/Small/Bold" tone="light">Projects</Heading>
    <List aria-labelledby="projects">{rows}</List>
  </SidePanel>
</AppShell>`,
  },
  {
    title: "All filters",
    description: "The Status chip stays on the page, in the header's Sections row under the title; the other filters wait behind All filters, a chip that opens a Small panel. The primary counts what Apply would show and Clear all empties the draft; the chip counts what is on, and its × clears it.",
    wide: true,
    screen: true,
    render: () => <AllFiltersExample />,
    code: `<AppShellHeader
  actions={<>{notifications}{account}</>}
  main={<PageHeader title="Leave requests" description="Everyone's time off at the studio…"
    actions={<Button level="tertiary" startIcon="icon-download-01-line" onClick={exportCsv}>Export</Button>} />}
  sections={
    <Stack direction="row" gap="xs" align="center" wrap>
      {statusChip}
      <Chip variant="advanced" leading="icon-filter-lines-line" aria-haspopup="dialog" aria-expanded={open}
        selected={active > 0} selectionMode="multiple" selectionCount={active}
        onClick={() => { setDraft(applied); setOpen(true); }} onClearSelection={() => setApplied(noPicks)}>
        All filters
      </Chip>
      <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "request")}</Text>
    </Stack>
  }
/>

<SidePanel type="modal" size="small" open={open} onOpenChange={setOpen} title="All filters"
  primaryAction={{ label: \`Show \${plural(draftCount, "request")}\`, onClick: apply, disabled: draftCount === 0 }}
  secondaryAction={{ label: "Clear all", onClick: () => setDraft(noPicks) }}>
  <Stack gap="lg">
    <FormFieldset kind="checkbox" legend="Type">
      {kinds.map((kind) => <Checkbox key={kind} label={kind} checked={draft.kinds.includes(kind)} onCheckedChange={(on) => flip("kinds", kind, on)} />)}
    </FormFieldset>
    <FormFieldset kind="checkbox" legend="Team">…</FormFieldset>
    <FormFieldset kind="radio" legend="When">…</FormFieldset>
  </Stack>
</SidePanel>`,
  },
  {
    title: "Docked beside the page",
    description: "A Standard panel in the AppShell's sidePanel docks beside the file list without a scrim, so the page stays live: picking another file updates it, and the header's details button shows and hides it. The shell docks it while the page keeps a tablet width beside it (this Top-Bar screen from 1104 wide); narrower, the same panel opens as a Modal and starts closed.",
    wide: true,
    screen: true,
    render: () => <DockedDetailsExample />,
    code: `const open = choice ?? frameWidth >= 360 + 744; // open by default where it docks

<AppShell
  pattern="top-bar"
  header={
    <AppShellHeader
      leading={<StudioLogo />}
      actions={<>{notifications}{account}</>}
      main={<PageHeader title="Files" description="Design files, specs and plans for the Phin & Co loyalty app."
        trailing={<IconButton level="tertiary" icon="icon-layout-right-line" aria-label={open ? "Hide details" : "Show details"}
          aria-pressed={open} onClick={() => setChoice(!open)} />} />}
      sections={<DashboardHeader search={<Search size="md" placeholder="Search files" value={query} onValueChange={setQuery} />}
        controls={typeChip} subheading={plural(rows.length, "file")} />}
    />
  }
  // Docked while the page keeps 744px beside it; otherwise the shell opens it as a Modal
  sidePanel={
    <SidePanel type="standard" size="small" open={open} onOpenChange={setChoice}
      title={file.name} description="PDF file · 3.2 MB" primaryAction={{ label: "Copy link", onClick: copyLink }}>
      <DescriptionList items={[
        { term: "Owner", description: "Ava Chen" },
        { term: "Updated", description: "Thursday at 11:30 am" },
        { term: "Can edit", description: "Chi Tran" },
      ]} />
    </SidePanel>
  }
>
  <Table aria-label="Files" columns={columns} rows={files} onRowClick={(file) => { setSelectedId(file.id); setChoice(true); }} />
</AppShell>`,
  },
  {
    title: "Edit in a panel",
    description: "The card's Edit project action opens a form in a Modal panel, one column of fields. Save changes submits it; Close, Cancel, Escape or the scrim with edits open a Dialog first, the one Dialog a panel may open.",
    render: () => <EditProjectExample />,
    code: `// Close, Cancel, Escape and the scrim come here: with edits, ask first.
const requestClose = () => (form.isDirty ? setConfirming(true) : setOpen(false));

<SidePanel type="modal" open={open} onOpenChange={(next) => (next ? setOpen(true) : requestClose())}
  title="Edit project" description="Loyalty app · Phin & Co"
  primaryAction={{ label: form.isSubmitting ? "Saving…" : "Save changes", onClick: () => formRef.current?.requestSubmit() }}
  secondaryAction={{ label: "Cancel", onClick: requestClose }}>
  <Form ref={formRef} form={form} gap="md">
    <InputField label="Project name" {...form.field("name")} />
    <SelectField label="Status" options={statuses} {...form.selectField("status")} />
    <SelectField label="Project lead" options={leads} {...form.selectField("lead")} />
    <DateField label="Due date" today={TODAY} {...form.dateField("due")} />
    <TextAreaField label="Brief" labelOptional rows={4} {...form.field("brief")} />
  </Form>
</SidePanel>

<Dialog open={confirming} onOpenChange={setConfirming} theme="warning" title="Discard changes?"
  primaryAction={{ label: "Discard changes", level: "danger", onClick: discard }}
  secondaryAction={{ label: "Keep editing", autoFocus: true }} />`,
  },
  {
    title: "Loading and errors",
    description: "The panel opens at once with its title and keeps its frame: Skeleton lines while the invoice loads, then the details. When the request fails, a Negative Inline Message says so and Try again loads it again; Send reminder waits until there is something to send.",
    render: () => <InvoicePanelExample />,
    code: `<SidePanel type="modal" open={open} onOpenChange={setOpen} title={invoice.number} description={\`\${invoice.client} · \${invoice.project}\`}
  primaryAction={{ label: "Send reminder", onClick: remind, disabled: state !== "ready" }}>
  {state === "loading" ? (
    <Stack gap="lg" aria-busy="true"> {/* placeholders in the shape of the details: term · value rows */}
      <VisuallyHidden role="status">Loading invoice</VisuallyHidden>
      <SkeletonRows count={3} />
      <SkeletonRows count={3} />
    </Stack>
  ) : state === "error" ? (
    <InlineMessage theme="negative" title="Invoice didn't load" action={{ label: "Try again", onClick: () => load(invoice) }}>
      Zen couldn't reach the billing service. Nothing has changed.
    </InlineMessage>
  ) : (
    <DescriptionList items={details} />
  )}
</SidePanel>`,
  },
  {
    title: "Long title and history",
    description: "A brief with a long working title opens in a Modal panel: the title wraps instead of truncating, so the whole name reads. Its 24 changes make the body long, and only the body scrolls: the title, Close and Export history stay in reach. Every brief on the page opens its own history.",
    wide: true,
    screen: true,
    render: () => <LongContentExample />,
    code: `<SidePanel type="modal" open={open} onOpenChange={setOpen}
  title="Card controls and spending limits for the Lumen Bank mobile app, phase 2" // wraps; never cut
  description="Lumen Bank · Lead Alex Duong"
  primaryAction={{ label: "Export history", onClick: exportHistory }}>
  <Stack as="section" gap="xs" aria-labelledby="history">
    <Heading level={3} id="history" textStyle="Body/Small/Bold" tone="light">History</Heading>
    {/* Only the body scrolls: the header and the actions stay put */}
    <List aria-labelledby="history">
      {history.map((entry) => (
        <ListItem key={entry.id} title={entry.person.name} caption={\`\${entry.verb} the brief · \${formatRelative(entry.at)}\`}
          leading={<Avatar size="md" {...avatarOf(entry.person)} />} />
      ))}
    </List>
  </Stack>
</SidePanel>`,
  },
]);
