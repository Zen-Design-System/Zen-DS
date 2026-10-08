/**
 * Template: HR · Time off › My leaves. The signed-in person's own time off:
 * - The next leave, highlighted in a card that opens it.
 * - A balance tile per paid leave type: the days left of the yearly allowance.
 * - Every request in a Table with Search, Leave type and Status filters and sortable Dates and Working days. On a phone
 *   the requests become a List and the chips open Bottom Sheets.
 * - A row opens the request in a Side Panel: working days, dates, approver and its timeline. A pending or approved
 *   request that hasn't started can be cancelled (Undo in the Toast); a declined one can be requested again.
 * - Request leave opens a validated ModalForm: leave type, first and last day (DateField and its calendar), full or
 *   half day and a reason. It counts working days without weekends and public holidays, warns when the balance is
 *   short, and the request lands in the table as Pending.
 *
 * Copy it with ./HrShell, ./data and ./assets into your app and replace the sample data. Render it inside your app's
 * <ZenProvider>. Uses only @zen-ds/react components, no custom CSS.
 */
import { useId, useMemo, useState, type ReactNode } from "react";
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  Chip,
  Container,
  DateField,
  DescriptionList,
  DockIcon,
  EmptyState,
  FormFieldset,
  Grid,
  Heading,
  Icon,
  InlineMessage,
  InputField,
  List,
  ListItem,
  Metric,
  MetricCard,
  ModalForm,
  PageHeader,
  plural,
  RadioButton,
  Search,
  SelectField,
  SidePanel,
  Stack,
  Stepper,
  Table,
  TableBadges,
  TableMedia,
  TableText,
  Text,
  useFormState,
  useToast,
  useZen,
  type StepperStep,
  type TableSort,
} from "@zen-ds/react";
import { HrShell, hrModules, type HrNavigate } from "./HrShell";
import {
  currentUser,
  daysFromToday,
  formatDate,
  formatDays,
  formatRange,
  formatRelative,
  holidayDaysOff,
  holidaysIn,
  leaveBalances,
  leaveDays,
  leaveKindList,
  leaveKinds,
  leaveRequests,
  leaveStatuses,
  leaveStatusTheme,
  now,
  people,
  toIsoDay,
  today,
  workingDaysBetween,
  type LeaveKindId,
  type LeaveRequest,
} from "./data";

/* ── Data: the signed-in person's requests; their manager approves them ─────────────────────────────────────── */
const myRequests = leaveRequests.filter((request) => request.person === currentUser.id);
const approver = people[currentUser.manager ?? currentUser.id];
/** Balance tiles for the paid types (unpaid leave is agreed case by case), in two pairs: 4 in a row, 2 × 2 or a
 * phone's single column, never 3 + 1. */
const paidKinds = leaveKindList.filter((kind) => kind.paid);
type FilterOption = { id: string; label: string; leading?: ReactNode };
const kindOptions: FilterOption[] = leaveKindList.map((kind) => ({ id: kind.id, label: kind.name, leading: <DockIcon theme="emoji" emoji={kind.emoji} size="xs" /> }));
const statusOptions: FilterOption[] = leaveStatuses.map((status) => ({ id: status, label: status }));
const sorters: Record<string, (a: LeaveRequest, b: LeaveRequest) => number> = {
  dates: (a, b) => a.start.localeCompare(b.start),
  days: (a, b) => a.days - b.days,
};
const halfLabel = { morning: "Morning", afternoon: "Afternoon" } as const;
const isActive = (request: LeaveRequest) => request.status === "Pending" || request.status === "Approved";

/** The reason as a title: "Trip to Japan." → "Trip to Japan". */
const reasonOf = (request: LeaveRequest) => request.note?.replace(/\.$/, "") ?? leaveKinds[request.kind].name;
/** "Mon, Oct 19 – Fri, Oct 23, 2026": the detail's dates with weekdays (the year once when both days share it). */
const weekdayRange = (start: string, end: string) => (start === end ? formatDate(start, { weekday: true })
  : `${formatDate(start, { weekday: true, year: start.slice(0, 4) !== end.slice(0, 4) })} – ${formatDate(end, { weekday: true })}`);
/** "in 19 days" · "tomorrow" · "today" · "until Oct 2" (already started). */
function countdown(request: LeaveRequest) {
  const until = daysFromToday(request.start);
  if (until > 1) return `in ${plural(until, "day")}`;
  if (until === 1) return "tomorrow";
  return until === 0 ? "today" : `until ${formatDate(request.end, { year: false })}`;
}

/** The countdown figure of the next-leave card: "Starts in 19 days" · "Starts tomorrow" · "Ends Fri, Oct 2". */
function startsIn(request: LeaveRequest): { label: string; value: string } {
  const until = daysFromToday(request.start);
  if (until > 1) return { label: "Starts in", value: plural(until, "day") };
  if (until >= 0) return { label: "Starts", value: until ? "Tomorrow" : "Today" };
  return { label: "Ends", value: formatDate(request.end, { weekday: true, year: false }) };
}

/** A request's timeline: submitted → approved (or declined / cancelled) → the time off itself. */
function timelineOf(request: LeaveRequest): { steps: StepperStep[]; current: number } {
  const submitted: StepperStep = { id: "submitted", title: "Submitted", caption: formatRelative(request.submitted) };
  const decided = request.decided ? formatRelative(request.decided) : undefined;
  const who = people[request.approver].name;
  if (request.status === "Declined") return { steps: [submitted, { id: "declined", title: "Declined", caption: `${who} · ${decided}`, error: true }], current: 1 };
  if (request.status === "Cancelled") return { steps: [submitted, { id: "cancelled", title: "Cancelled", caption: `You · ${decided}` }], current: 2 };
  const ended = request.end < today;
  const started = request.start < today;
  const approval: StepperStep = request.status === "Approved"
    ? { id: "approval", title: "Approved", caption: `${who} · ${decided}` }
    : { id: "approval", title: "Approval", caption: `Waiting for ${who}` };
  const off: StepperStep = { id: "off", title: "Time off", caption: ended ? formatRange(request.start, request.end)
    : started ? `Until ${formatDate(request.end, { year: false })}` : `Starts ${countdown(request)}` };
  return { steps: [submitted, approval, off], current: request.status === "Pending" ? 1 : ended ? 3 : 2 };
}

/* ── Form helpers: DateField speaks MM/DD/YYYY, the data ISO days ─────────────────────────────────────────────── */
type RequestValues = { kind: string; start: string; end: string; duration: string; reason: string };
const blankRequest: RequestValues = { kind: "annual", start: "", end: "", duration: "full", reason: "" };
const toFieldDate = (date: Date) => `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
const fromFieldDate = (text: string) => {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const date = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
  return date.getMonth() === Number(match[1]) - 1 ? toIsoDay(date) : null;
};
/** What a draft asks for: its days, how many are working days, and the public holidays in it (which don't count). */
function measure(values: RequestValues) {
  const half: LeaveRequest["half"] = values.duration === "morning" || values.duration === "afternoon" ? values.duration : undefined;
  const start = fromFieldDate(values.start);
  const end = half ? start : fromFieldDate(values.end);
  if (!start || !end || end < start) return null;
  const working = workingDaysBetween(start, end, currentUser.country);
  const holidays = holidaysIn(currentUser.country).filter((holiday) => holidayDaysOff(holiday).some((day) => day >= start && day <= end));
  return { start, end, half, working, days: working ? leaveDays(currentUser.id, start, end, half) : 0, holidays };
}

export function HrMyLeavesTemplate() {
  const { toast, dismiss } = useToast();
  const phone = useZen()?.breakpoint === "mobile";
  const tableTitleId = useId();
  const [requests, setRequests] = useState(myRequests);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sort, setSort] = useState<TableSort | null>({ columnId: "dates", direction: "desc" });
  const [openId, setOpenId] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  // Phones pick the filters in Bottom Sheets.
  const [sheet, setSheet] = useState<"kind" | "status" | null>(null);

  const balances = leaveBalances(requests);
  const balanceOf = (kind: LeaveKindId) => balances.find((balance) => balance.kind === kind)!;
  // The next leave: the first approved or pending request that hasn't ended.
  const next = requests.filter((request) => isActive(request) && request.end >= today).sort((a, b) => a.start.localeCompare(b.start))[0];

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = requests.filter((request) =>
      (!q || [leaveKinds[request.kind].name, request.note ?? "", request.status, formatRange(request.start, request.end)].some((text) => text.toLowerCase().includes(q)))
      && (!kindFilter.length || kindFilter.includes(request.kind))
      && (!statusFilter.length || statusFilter.includes(request.status)));
    if (!sort) return list;
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...list].sort((a, b) => sorters[sort.columnId](a, b) * direction);
  }, [requests, query, kindFilter, statusFilter, sort]);
  const opened = requests.find((request) => request.id === openId) ?? null;
  // The result count, as on My expenses: "6 requests · 22 days".
  const resultCount = `${plural(shown.length, "request")} · ${formatDays(shown.reduce((sum, request) => sum + request.days, 0))}`;
  const activeFilters = (query.trim() ? 1 : 0) + (kindFilter.length ? 1 : 0) + (statusFilter.length ? 1 : 0);
  const clearFilters = () => { setQuery(""); setKindFilter([]); setStatusFilter([]); };

  const navigate: HrNavigate = (target) => {
    if (target.module === "time-off" && target.page === "my-leaves") return;
    if (target.module === "home") { toast({ title: "Home isn't part of this demo" }); return; }
    const { title, sections } = hrModules[target.module];
    const pages = sections.flatMap((section) => section.items.flatMap((item) => [item, ...(item.children ?? [])]));
    const page = pages.find((item) => item.id === (target.page ?? pages[0]?.id));
    toast({ title: `${page?.label ?? title} isn't part of this demo` });
  };

  /* ── Cancel acts at once, closes the panel and offers Undo ── */
  const update = (id: string, patch: Partial<LeaveRequest>) => setRequests((list) => list.map((request) => (request.id === id ? { ...request, ...patch } : request)));
  const cancel = (request: LeaveRequest) => {
    update(request.id, { status: "Cancelled", decided: now });
    setOpenId(null);
    const toastId = toast({ title: "Leave request cancelled", children: `${leaveKinds[request.kind].name} · ${formatRange(request.start, request.end)}`,
      action: { label: "Undo", onClick: () => { update(request.id, { status: request.status, decided: request.decided }); dismiss(toastId); } } });
  };

  /* ── Request leave: validated, counted in working days, checked against the balance ── */
  const form = useFormState({
    initialValues: blankRequest,
    validate: (values) => {
      const start = fromFieldDate(values.start);
      const end = fromFieldDate(values.end);
      const draft = measure(values);
      const clash = draft && requests.find((request) => isActive(request) && request.start <= draft.end && request.end >= draft.start);
      return {
        ...(!values.start.trim() ? { start: "Enter the first day, like 10/12/2026" }
          : !start ? { start: "Enter the date as MM/DD/YYYY" }
            : clash ? { start: `You already have leave on ${formatRange(clash.start, clash.end)}` }
              : draft?.half && !draft.working ? { start: "Pick a working day for a half day" } : {}),
        ...(draft?.half ? {}
          : !values.end.trim() ? { end: "Enter the last day, like 10/14/2026" }
            : !end ? { end: "Enter the date as MM/DD/YYYY" }
              : start && end < start ? { end: "Pick a day on or after the first day" }
                : draft && !draft.working ? { end: "Include at least one working day" } : {}),
        ...(values.reason.trim() ? {} : { reason: "Add a short reason, like Trip to Japan" }),
      };
    },
    onSubmit: (values) => {
      const draft = measure(values)!;
      const request: LeaveRequest = {
        id: `leave-${Date.now()}`, person: currentUser.id, kind: values.kind as LeaveKindId, start: draft.start, end: draft.end, days: draft.days, half: draft.half,
        status: "Pending", submitted: now, approver: approver.id, note: values.reason.trim(),
      };
      setRequests((list) => [request, ...list]);
      clearFilters();
      setRequesting(false);
      const toastId = toast({ title: "Leave request sent", children: `${formatDays(draft.days)} · ${formatRange(draft.start, draft.end)}`,
        action: { label: "View", onClick: () => { dismiss(toastId); setOpenId(request.id); } } });
    },
  });
  const startRequest = (values: RequestValues = blankRequest) => { form.reset(values); setOpenId(null); setRequesting(true); };
  // The last day follows a new first day while it is empty or earlier.
  const startField = form.dateField("start");
  const followStart = (text: string) => {
    const start = fromFieldDate(text);
    const end = fromFieldDate(form.values.end);
    if (start && (!end || end < start)) form.setValue("end", text);
  };
  const pickedKind = leaveKinds[form.values.kind as LeaveKindId];
  const pickedBalance = balanceOf(pickedKind.id);
  const draft = measure(form.values);
  // Days still free once the pending requests are approved.
  const headroom = pickedBalance.available - pickedBalance.pending;
  const halfDay = form.values.duration !== "full";

  /* ── Filters: Chip popovers on a desktop; on a phone each chip opens a Bottom Sheet with the same choices ── */
  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  const filters = {
    kind: { label: "Leave type", options: kindOptions, picked: kindFilter, setPicked: setKindFilter },
    status: { label: "Status", options: statusOptions, picked: statusFilter, setPicked: setStatusFilter },
  };
  const filterChip = (id: keyof typeof filters) => {
    const { label, options, picked, setPicked } = filters[id];
    const shared = { variant: "advanced", size: "md", dropdown: true, selectionMode: "multiple", selected: picked.length > 0, selectionCount: picked.length, onClearSelection: () => setPicked([]) } as const;
    const chipLabel = picked.length === 1 ? options.find((option) => option.id === picked[0])?.label : label;
    return phone
      ? <Chip key={id} {...shared} aria-haspopup="dialog" aria-expanded={sheet === id} onClick={() => setSheet(id)}>{chipLabel}</Chip>
      : (
        <Chip key={id} {...shared} popoverMultiple popoverLabel={label} popoverItems={options.map((option) => ({ ...option, selected: picked.includes(option.id) }))}
          onPopoverSelect={(item) => setPicked(toggle(picked, item.id))}>{chipLabel}</Chip>
      );
  };
  const sheetFilter = sheet ? filters[sheet] : null;
  const check = <Icon name="icon-check-line" size="base" decorative />;
  const noRequests = !requests.length
    ? <EmptyState title="No leave requests yet" headingLevel={3} illustration={false} icon="icon-calendar-heart-line" primaryAction={{ label: "Request leave", onClick: () => startRequest() }}>Your requests show here with their status.</EmptyState>
    : kindFilter.length || statusFilter.length || !query.trim()
      ? <EmptyState title="No leave requests match" headingLevel={3} illustration={false} icon="icon-search-medium-line" secondaryAction={{ label: "Clear filters", onClick: clearFilters }}>Try another leave type or status.</EmptyState>
      : <EmptyState title={`No results for “${query.trim()}”`} headingLevel={3} illustration={false} icon="icon-search-medium-line" secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>Search by leave type, reason or date.</EmptyState>;
  const tiles = (kinds: typeof leaveKindList) => (
    <Grid columns="repeat(auto-fit, minmax(min(100%, 150px), 1fr))" gap="md">
      {kinds.map((kind) => {
        const balance = balanceOf(kind.id);
        return (
          <MetricCard key={kind.id} variant="title-highlight" size={phone ? "sm" : "xl"} label={kind.name} value={formatDays(balance.available)}
            trend={{ direction: "normal", label: `Left of ${balance.allowance}` }} iconEmoji={kind.emoji} iconSize="md" />
        );
      })}
    </Grid>
  );

  const panel = opened ? (() => {
    const kind = leaveKinds[opened.kind];
    const { steps, current } = timelineOf(opened);
    // A declined request can be asked again; a pending or approved one can be cancelled until it starts.
    const actions = opened.status === "Declined"
      ? { primaryAction: { label: "Request again", onClick: () => startRequest({ ...blankRequest, kind: opened.kind, reason: reasonOf(opened) }) } }
      : isActive(opened) && opened.start > today ? { secondaryAction: { label: "Cancel request", onClick: () => cancel(opened) } } : {};
    return (
      <SidePanel type="standard" title={kind.name} description={opened.note} open onOpenChange={(open) => { if (!open) setOpenId(null); }} {...actions}>
        <Stack gap="lg">
          <Stack direction="row" gap="md" justify="between" align="start">
            <Metric size="md" label="Working days" value={formatDays(opened.days)} iconEmoji={kind.emoji} />
            <Badge theme={leaveStatusTheme[opened.status]} background="subtle">{opened.status}</Badge>
          </Stack>
          {opened.status === "Declined" && opened.reply ? <InlineMessage theme="negative" title={`Declined by ${people[opened.approver].name}`}>{opened.reply}</InlineMessage> : null}
          <DescriptionList divider items={[
            { id: "dates", term: "Dates", description: weekdayRange(opened.start, opened.end) },
            ...(opened.half ? [{ id: "half", term: "Half day", description: halfLabel[opened.half] }] : []),
            { id: "approver", term: "Approver", description: people[opened.approver].name },
          ]} />
          <Stack gap="sm">
            <Heading level={3}>Timeline</Heading>
            <Stepper orientation="vertical" aria-label="Request timeline" steps={steps} current={current} />
          </Stack>
        </Stack>
      </SidePanel>
    );
  })() : undefined;

  return (
    <HrShell module="time-off" page="my-leaves" onNavigate={navigate} aside={panel}>
      <Container maxWidth="full">
        <Stack gap="xl" paddingY="sm">
          <PageHeader title="My leaves" description={`Your time off this year, approved by ${approver.name}.`}
            actions={<Button level="primary" startIcon="icon-plus-line" onClick={() => startRequest()}>Request leave</Button>} />

          <Stack gap="md">
            {/* The next leave opens its request; with nothing planned the card starts a new one. */}
            {next ? (
              <Card onClick={() => setOpenId(next.id)} aria-label={`Next leave: ${reasonOf(next)}, ${formatRange(next.start, next.end)}`}>
                <Grid columns={phone ? "auto minmax(0, 1fr)" : "auto minmax(0, 1fr) auto"} gap="md" align="center">
                  <DockIcon theme="emoji" emoji={leaveKinds[next.kind].emoji} size="lg" />
                  <Stack gap="2xs">
                    {/* On a phone the countdown joins this line; wider screens show it as a figure on the right. */}
                    <Text textStyle="Body/Small/Regular" tone="base">{daysFromToday(next.start) < 0 ? "On leave" : "Next leave"}{phone ? ` · ${countdown(next)}` : ""}</Text>
                    <Stack direction="row" gap="xs" align="center" wrap>
                      <Heading level={2} textStyle="Heading/Subheading">{reasonOf(next)}</Heading>
                      <Badge theme={leaveStatusTheme[next.status]} background="subtle">{next.status}</Badge>
                    </Stack>
                    <Text textStyle="Body/Small/Regular" tone="base">{leaveKinds[next.kind].name} · {weekdayRange(next.start, next.end)} · {formatDays(next.days)}</Text>
                  </Stack>
                  {phone ? null : <Metric size="sm" icon={false} {...startsIn(next)} />}
                </Grid>
              </Card>
            ) : (
              <Card onClick={() => startRequest()} aria-label="No leave planned. Request leave">
                <Grid columns="auto minmax(0, 1fr)" gap="md" align="center">
                  <DockIcon theme="emoji" emoji="🗓️" size="lg" />
                  <Stack gap="2xs">
                    <Heading level={2} textStyle="Heading/Subheading">No leave planned</Heading>
                    <Text textStyle="Body/Small/Regular" tone="base">{formatDays(balanceOf("annual").available)} of annual leave left this year</Text>
                  </Stack>
                </Grid>
              </Card>
            )}
            <Grid columns="repeat(auto-fit, minmax(min(100%, 400px), 1fr))" gap="md">
              {tiles(paidKinds.slice(0, 2))}
              {tiles(paidKinds.slice(2, 4))}
            </Grid>
          </Stack>

          <Stack gap="md">
            <Heading level={2} textStyle="Heading/4" id={tableTitleId}>Requests</Heading>
            {/* Search fills its column; the filter chips (and Clear all, once two filters are on) share the rest. */}
            <Grid columns={{ mobile: 1, desktop: "minmax(0, 320px) 1fr" }} gap="sm" align="center">
              <Search aria-label="Search leave requests" placeholder="Search requests" value={query} onValueChange={setQuery} />
              {/* On a phone the chips stay on one row that scrolls sideways. */}
              <Stack direction="row" gap="xs" align="center" wrap={!phone} role="group" aria-label="Filter requests" style={phone ? { overflowX: "auto" } : undefined}>
                {filterChip("kind")}
                {filterChip("status")}
                {activeFilters >= 2 ? <Button level="tertiary" onClick={clearFilters}>Clear all</Button> : null}
              </Stack>
            </Grid>

            {phone ? (
              // A phone lists the same requests: the reason, its type and dates, then the working days and status.
              shown.length ? (
                <>
                  <Text textStyle="Body/Small/Regular" tone="base">{resultCount}</Text>
                  <List aria-labelledby={tableTitleId}>
                    {shown.map((request) => (
                      <ListItem key={request.id} title={reasonOf(request)} selected={request.id === openId} onClick={() => setOpenId(request.id)}
                        caption={`${leaveKinds[request.kind].name} · ${formatRange(request.start, request.end)}${request.half ? ` · ${halfLabel[request.half]}` : ""}`}
                        leading={<DockIcon theme="emoji" emoji={leaveKinds[request.kind].emoji} size="md" />}
                        trailing={(
                          <Stack gap="2xs" align="end">
                            <Text as="span" textStyle="Body/Base/Bold">{formatDays(request.days)}</Text>
                            <Badge size="sm" theme={leaveStatusTheme[request.status]} background="subtle">{request.status}</Badge>
                          </Stack>
                        )} />
                    ))}
                  </List>
                </>
              ) : noRequests
            ) : (
              // The opened request's row stays selected while its panel is open.
              <Table aria-labelledby={tableTitleId} rows={shown} getRowId={(row) => row.id} sort={sort} onSortChange={setSort} onRowClick={(row) => setOpenId(row.id)}
                selectedIds={opened ? [opened.id] : []} empty={noRequests}
                columns={[
                  { id: "leave", header: "Leave", cell: (row) => (
                    <TableMedia media={<DockIcon theme="emoji" emoji={leaveKinds[row.kind].emoji} size="sm" />} caption={reasonOf(row)}>{leaveKinds[row.kind].name}</TableMedia>
                  ) },
                  { id: "dates", header: "Dates", width: "232px", sortable: true, cell: (row) => <TableText caption={row.half ? halfLabel[row.half] : undefined}>{formatRange(row.start, row.end)}</TableText> },
                  { id: "days", header: "Working days", width: "160px", align: "right", sortable: true, cell: (row) => <TableText>{row.days.toLocaleString("en-US")}</TableText> },
                  { id: "status", header: "Status", width: "136px", cell: (row) => <TableBadges><Badge theme={leaveStatusTheme[row.status]} background="subtle">{row.status}</Badge></TableBadges> },
                ]} />
            )}
            {!phone && shown.length ? <Text textStyle="Body/Small/Regular" tone="base">{resultCount}</Text> : null}
          </Stack>
        </Stack>
      </Container>

      {/* Phone filters: a multiple choice keeps the sheet open until Show. */}
      <BottomSheet open={sheetFilter !== null} onOpenChange={(open) => { if (!open) setSheet(null); }} title={sheetFilter?.label ?? "Filter"}
        primaryAction={{ label: `Show ${plural(shown.length, "request")}` }}>
        {sheetFilter ? (
          <List aria-label={sheetFilter.label}>
            {sheetFilter.options.map((option) => {
              const selected = sheetFilter.picked.includes(option.id);
              return <ListItem key={option.id} title={option.label} leading={option.leading} selected={selected} trailing={selected ? check : undefined} onClick={() => sheetFilter.setPicked(toggle(sheetFilter.picked, option.id))} />;
            })}
          </List>
        ) : null}
      </BottomSheet>

      <ModalForm open={requesting} onOpenChange={setRequesting} title="Request leave" description={`${approver.name} gets it for approval.`}
        onSubmit={form.handleSubmit} primaryAction={{ label: "Send request" }} secondaryAction={{ label: "Cancel" }}>
        <SelectField label="Leave type" options={leaveKindList.map((kind) => ({ label: kind.name, value: kind.id }))}
          helpText={`${formatDays(pickedBalance.available)} left of ${pickedBalance.allowance}${pickedBalance.pending ? ` · ${formatDays(pickedBalance.pending)} pending` : ""}`} {...form.selectField("kind")} />
        {/* Duration comes before the dates: a half day has one date, and the modal opens on it instead of a calendar. */}
        <FormFieldset legend="Duration" kind="radio" direction="row" helpText="A morning or an afternoon counts as half a day.">
          <RadioButton label="Full days" {...form.radioField("duration", "full")} />
          <RadioButton label="Morning" {...form.radioField("duration", "morning")} />
          <RadioButton label="Afternoon" {...form.radioField("duration", "afternoon")} />
        </FormFieldset>
        <Grid columns={{ mobile: 1, desktop: 2 }} gap="md" align="start">
          <DateField label="First day" {...startField} onChange={(event) => { startField.onChange(event); followStart(event.target.value); }}
            onDateChange={(date) => { startField.onDateChange(date); if (date) followStart(toFieldDate(date)); }} />
          {/* A half day ends on the day it starts. Otherwise a new first day remounts the last day (key), so its calendar
              opens on the month it moved to. */}
          {halfDay ? <DateField label="Last day" readOnly name="end" value={form.values.start} /> : <DateField key={form.values.start} label="Last day" {...form.dateField("end")} />}
        </Grid>
        {draft && draft.days > 0 ? (
          draft.days > headroom ? (
            <InlineMessage theme="warning" title={`${formatDays(draft.days - Math.max(headroom, 0))} over your ${pickedKind.name.toLowerCase()}`}>
              {`You have ${formatDays(Math.max(headroom, 0))} left, counting pending requests. ${pickedKind.paid ? "Shorten the dates or choose unpaid leave." : `Shorten the dates or talk to ${approver.name}.`}`}
            </InlineMessage>
          ) : (
            <InlineMessage theme="neutral" icon="icon-calendar-check-line" title={`${formatDays(draft.days)} of ${pickedKind.name.toLowerCase()}`}>
              {`${draft.holidays.length ? `${draft.holidays.map((holiday) => holiday.name).join(" and ")} ${draft.holidays.length === 1 ? "doesn't" : "don't"} count. ` : ""}You'll have ${formatDays(headroom - draft.days)} left, counting pending requests.`}
            </InlineMessage>
          )
        ) : null}
        <InputField label="Reason" placeholder="Trip to Japan" autoComplete="off" maxLength={120} {...form.field("reason")} />
      </ModalForm>
    </HrShell>
  );
}
