import { useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, Badge, Button, Checkbox, Chip, EmptyState, FormFieldset, Menu, PageHeader, RadioButton,
  SidePanel, Sidebar, SidebarMenuItem, Stack, Table, TableBadges, TableMedia, TableText, Text, Thumbnail, plural, useToast, useZen,
  type SidebarItem, type SidebarSection, type TableColumn,
} from "@zen-ds/react";
import {
  TODAY, activity, formatDate, formatDay, formatRange, initials, leaveStatusTheme, me, people, studio, type LeaveKind, type LeaveStatus, type Person, type PersonId,
  type Team,
} from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };

// Đìzai Studio's navigation: the same Sidebar on every screen, its current page selected.
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

/** The top row's utilities: Notifications with the unread count (read on open), then the account. */
function HeaderUtilities() {
  const { toast } = useToast();
  const [unread, setUnread] = useState(unreadActivity.length);
  const first = unreadActivity[0];
  const readAll = () => {
    toast(unread
      ? { title: plural(unread, "new notification"), children: `${people[first.actor].name} ${first.verb} “${first.object}”${unread > 1 ? `, and ${unread - 1} more` : ""}.` }
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
// A phone has no room for a second column: the person, then the status, the type and the dates (without the year,
// which is this year's) in the caption.
const shortDatesOf = (request: Request) => (request.from.getTime() === request.to.getTime() ? formatDay(request.from) : `${formatDay(request.from)} – ${formatDay(request.to)}`);
const phoneRequestColumns: TableColumn<Request>[] = [
  { id: "person", header: "Request", cell: (request) => <TableMedia bold media={<Avatar size="sm" {...avatarOf(people[request.person])} />} caption={`${request.status} · ${request.kind} · ${shortDatesOf(request)}`}>{people[request.person].name}</TableMedia> },
];

/** Leave requests: the Status chip stays on the page, the other filters wait in a Small Side Panel that counts first. */
export default function LeaveRequestFilters() {
  const { toast } = useToast();
  const [status, setStatus] = useState<LeaveStatus | null>(null);
  const [applied, setApplied] = useState(noPicks);
  const [draft, setDraft] = useState(noPicks);
  const [open, setOpen] = useState(false);
  const phone = useZen()?.breakpoint === "mobile";
  const rows = requests.filter(matches(applied, status));
  const draftCount = requests.filter(matches(draft, status)).length;
  const active = countPicks(applied);
  const go = (item: SidebarItem) => {
    if (item.id !== "time-off") toast({ title: `${item.label} isn’t part of this example`, children: "Each screen here is one page of the studio’s app." });
  };
  const openPanel = () => { setDraft(applied); setOpen(true); };
  const apply = () => { setApplied(draft); setOpen(false); };
  const clearAll = () => { setStatus(null); setApplied(noPicks); };
  const flip = <K extends "kinds" | "teams">(key: K, value: Picks[K][number], on: boolean) =>
    setDraft((current) => ({ ...current, [key]: on ? [...current[key], value] : (current[key] as string[]).filter((x) => x !== value) }));
  return (
    <AppShell
      sidebar={(
        <Sidebar
          logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
          logoCollapsed={<Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />}
          sections={studioNav} selectedId="time-off" onItemClick={go}
          footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
      )}
      header={(
        <AppShellHeader
          actions={<HeaderUtilities />}
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
        />
      )}
    >
      {/* The table is the page's content: it lies on the page, no Card. */}
      <Stack gap="md">
        <Table aria-label="Leave requests" columns={phone ? phoneRequestColumns : requestColumns} rows={rows}
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
    </AppShell>
  );
}
