import { useEffect, useId, useRef, useState } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { BottomSheet } from "../../../components/BottomSheet";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { DatePicker, type DatePickerRange, type DatePickerTime } from "../../../components/DatePicker";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { Form, FormActions } from "../../../components/Form";
import { InlineMessage } from "../../../components/InlineMessage";
import { DateField, InputField, SelectField } from "../../../components/Input";
import { Box, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Table, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import {
  TODAY, daysFromToday, formatDate, formatDay, formatDue, formatMoney, formatRange, initials, invoiceStatusTheme, invoices, leaveStatusTheme, me,
  people, projectById, projects, type Invoice, type InvoiceStatus,
} from "../data";
import type { ExampleDef } from "../types";
import "./date-picker.css";

export const page: PlatformPage = "date-picker";

// ——— Data and helpers ————————————————————————————————————————————————————————————————————————

/** "10/05/2026", the DateField's typed format, → a Date; null while the text is incomplete or not a real day. */
function parseTyped(text: string): Date | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [month, day, year] = [Number(match[1]) - 1, Number(match[2]), Number(match[3])];
  const date = new Date(year, month, day);
  return date.getMonth() === month && date.getDate() === day ? date : null;
}
const weekday = (date: Date, style: "long" | "short" = "long") => date.toLocaleString("en-US", { weekday: style });
/** "14:30" (DatePickerTime, 24-hour) → "2:30 pm". */
const clock = (value: string, period = true) => { const [h, m] = value.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")}${period ? (h < 12 ? " am" : " pm") : ""}`; };
const half = (value: string) => (Number(value.split(":")[0]) < 12 ? "am" : "pm");
/** "2:00 – 2:30 pm" · "11:30 am – 12:30 pm" · "All day". */
function timeText(time: DatePickerTime) {
  if (time.fromAllDay) return "All day";
  if (!time.from) return "No time set";
  if (!time.to || time.toAllDay) return clock(time.from);
  return `${clock(time.from, half(time.from) !== half(time.to))} – ${clock(time.to)}`;
}

/** Mon–Fri between two dates, both included. */
function workingDays(start: Date, end: Date) {
  let count = 0;
  for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) if (day.getDay() % 6 !== 0) count += 1;
  return count;
}

/** A dual calendar needs about 500px; below that the examples switch to the single calendar. */
function useRoomForTwoMonths() {
  const query = "(min-width: 720px)";
  const [room, setRoom] = useState(() => typeof window === "undefined" || window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setRoom(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, []);
  return room;
}

/** The studio's invoices, newest first: the shared ones plus the three older ones the Search page lists too. */
const olderInvoices: Invoice[] = [
  { id: "i140", number: "INV-2026-0140", client: "Phin & Co", project: "phin-loyalty", amount: 18750, status: "Paid", issued: daysFromToday(-35), due: daysFromToday(-5) },
  { id: "i137", number: "INV-2026-0137", client: "Lumen Bank", project: "lumen-banking", amount: 17810, status: "Paid", issued: daysFromToday(-62), due: daysFromToday(-32) },
  { id: "i136", number: "INV-2026-0136", client: "Hanoi Book Fair", project: "bookfair-site", amount: 18279.5, status: "Paid", issued: daysFromToday(-80), due: daysFromToday(-50) },
];
const studioInvoices = [...invoices, ...olderInvoices].sort((a, b) => b.issued.getTime() - a.issued.getTime());
const dayKey = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
const today = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
const thisMonth: DatePickerRange = { start: new Date(2026, 8, 1), end: new Date(2026, 8, 30) };

// ——— 1. Due date ——————————————————————————————————————————————————————————————————————————————

function DueDateExample() {
  const { toast } = useToast();
  const [task, setTask] = useState("Check the points history on small phones");
  const [due, setDue] = useState("10/05/2026");
  const [errors, setErrors] = useState<{ task?: string; due?: string }>({});
  const date = parseTyped(due);
  const create = () => {
    const next = {
      task: task.trim() ? undefined : "Name the task",
      due: !due.trim() ? undefined : !date ? "Enter the date as MM/DD/YYYY, like 10/05/2026" : date < today ? "Pick today or a later date" : undefined,
    };
    // A failed submit: Form moves focus to the first field with an error.
    setErrors(next);
    if (next.task || next.due) return;
    toast({ type: "positive", title: "Task created", children: date ? `${task.trim()} · due ${formatDate(date)}` : task.trim() });
    setTask("");
    setDue("");
  };
  return (
    <Card theme="flat" className="px-date-picker-card">
      <Form onSubmit={create} gap="md">
        <Heading level={4} textStyle="Heading/Subheading">New task</Heading>
        <InputField label="Task" value={task} error={errors.task} onValueChange={(next) => { setTask(next); setErrors((e) => ({ ...e, task: undefined })); }} />
        {/* Typed or picked, the help text says what the date means for the task. */}
        <DateField label="Due date" labelOptional today={TODAY} minDate={TODAY} value={due} error={errors.due} onValueChange={(next) => { setDue(next); setErrors((e) => ({ ...e, due: undefined })); }}
          helpText={date ? `${weekday(date)}, ${formatDate(date)} · ${formatDue(date)}` : undefined} />
        <FormActions>
          <Button level="primary" type="submit">Create task</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

// ——— 2. Time off request ————————————————————————————————————————————————————————————————————————

// Alex's annual leave left this year, after the approved Oct 12 – Oct 14 trip (the Input page's Time off screen agrees).
const LEAVE_BALANCE = 7;

function TimeOffExample() {
  const { toast } = useToast();
  const twoMonths = useRoomForTwoMonths();
  const [range, setRange] = useState<DatePickerRange | null>({ start: daysFromToday(26), end: daysFromToday(30) });
  // Two months open on this one, so the disabled past days and today's boundary show; one month opens on the range.
  const [month, setMonth] = useState(() => new Date(2026, twoMonths ? 8 : 9, 1));
  const [requested, setRequested] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const acted = useRef(false);
  // Request and Withdraw replace each other: focus moves to the button that took its place.
  useEffect(() => {
    if (!acted.current) return;
    acted.current = false;
    actionsRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, [requested]);
  const request = (next: boolean) => { acted.current = true; setRequested(next); };
  // Withdrawing can be undone from the toast; Undo puts the request back and closes its toast.
  const withdraw = () => {
    request(false);
    toast({ title: "Request withdrawn", action: { label: "Undo", onClick: () => request(true) } });
  };
  const days = range?.end ? workingDays(range.start, range.end) : 0;
  const over = days - LEAVE_BALANCE;
  return (
    // One surface: the inline calendar (it has no popover surface of its own) beside the request it builds, lg apart.
    <Card theme="flat">
      <Stack direction="row" wrap gap="lg" align="start" className="px-date-picker-split">
        <DatePicker today={TODAY} calendar={twoMonths ? "dual" : "single"} selectionMode="range" minDate={TODAY}
          month={month} onMonthChange={setMonth}
          range={range} onRangeChange={(next) => { setRange(next); setRequested(false); }} />
        <Form onSubmit={() => { request(true); toast({ type: "positive", title: "Time off requested" }); }} gap="md">
          <Stack direction="row" justify="between" align="start" gap="sm">
            <Stack gap="xs">
              <Heading level={4} textStyle="Heading/Subheading">Annual leave</Heading>
              <Text textStyle="Body/Small/Regular" tone="base">{me.name} · {plural(LEAVE_BALANCE, "day")} left this year</Text>
            </Stack>
            {requested ? <Badge className="px-date-picker-status" theme={leaveStatusTheme.Pending} background="subtle">Pending</Badge> : null}
          </Stack>
          <DescriptionList items={[
            { term: "Dates", description: range?.end ? formatRange(range.start, range.end) : range ? `From ${formatDate(range.start)}` : "No dates yet" },
            { term: "Working days", description: plural(days, "day") },
            { term: "Balance after", description: over > 0 ? "Not enough days" : plural(LEAVE_BALANCE - days, "day") },
          ]} />
          {over > 0 ? (
            <InlineMessage theme="warning" title={`${plural(over, "day")} over your balance`}>
              Shorten the dates, or ask {people.minhAnh.name} about unpaid leave.
            </InlineMessage>
          ) : null}
          {requested ? <Text textStyle="Body/Small/Regular" tone="base">{people.minhAnh.name} answers requests within 2 working days.</Text> : null}
          {/* Keys: a reused button would turn into the submit button mid-click and request again. */}
          <FormActions ref={actionsRef}>
            {requested ? (
              <Button key="withdraw" level="tertiary" onClick={withdraw}>Withdraw request</Button>
            ) : (
              <Button key="request" level="primary" type="submit" disabled={!range?.end || over > 0}>Request time off</Button>
            )}
          </FormActions>
        </Form>
      </Stack>
    </Card>
  );
}

// ——— 3. Filter by issue date ————————————————————————————————————————————————————————————————————

const statusOptions: InvoiceStatus[] = ["Draft", "Sent", "Paid", "Overdue"];
const invoiceColumns: TableColumn<Invoice>[] = [
  { id: "invoice", header: "Invoice", cell: (row) => <TableText bold caption={projectById(row.project).name}>{row.number}</TableText> },
  { id: "client", header: "Client", cell: (row) => <TableText>{row.client}</TableText> },
  { id: "issued", header: "Issued", width: "132px", cell: (row) => <TableText>{formatDate(row.issued)}</TableText> },
  { id: "amount", header: "Amount", align: "right", width: "140px", cell: (row) => <TableText>{formatMoney(row.amount, true)}</TableText> },
  { id: "status", header: "Status", width: "120px", cell: (row) => <Badge theme={invoiceStatusTheme[row.status]} background="subtle">{row.status}</Badge> },
];

function InvoiceFilterExample() {
  const twoMonths = useRoomForTwoMonths();
  const titleId = useId();
  const chipRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<DatePickerRange | null>(thisMonth);
  const [month, setMonth] = useState(() => new Date(2026, 7, 1));
  const [status, setStatus] = useState<InvoiceStatus | null>(null);
  const rows = studioInvoices.filter((invoice) =>
    (!period?.end || (dayKey(invoice.issued) >= dayKey(period.start) && dayKey(invoice.issued) <= dayKey(period.end))) && (!status || invoice.status === status));
  const toggle = () => {
    // Open on the applied period: its last month on the right of a dual calendar.
    const last = period?.end ?? TODAY;
    if (!open) setMonth(new Date(last.getFullYear(), last.getMonth() - (twoMonths ? 1 : 0), 1));
    setOpen(!open);
  };
  // Clear all removes itself: focus moves to the first filter.
  const clearFilters = () => { chipRef.current?.focus(); setPeriod(null); setStatus(null); };
  return (
    // The table is a section of the page, not a widget: it lies on the page under its heading and toolbar, no container.
    <Stack gap="md">
      <Heading level={4} textStyle="Heading/4" id={titleId}>Invoices</Heading>
      <Stack direction="row" gap="xs" align="center" justify="between" wrap>
        <Stack direction="row" wrap gap="xs" align="center">
          <div className="px-date-picker-anchor">
            <Chip ref={chipRef} variant="advanced" dropdown aria-haspopup="dialog" aria-expanded={open} popoverOpen={open}
              selected={Boolean(period)} onClearSelection={period ? () => setPeriod(null) : undefined} onClick={toggle}>
              {period?.end ? formatRange(period.start, period.end) : "Issue date"}
            </Chip>
            <DatePicker open={open} onOpenChange={setOpen} anchorRef={chipRef} today={TODAY}
              calendar={twoMonths ? "dual" : "single"} selectionMode="range" maxDate={TODAY}
              range={period} month={month} onMonthChange={setMonth}
              showActions onApply={(_, range) => setPeriod(range)} />
          </div>
          <Chip variant="advanced" dropdown selected={Boolean(status)}
            popoverItems={statusOptions.map((option) => ({ id: option, label: option, selected: option === status }))}
            onPopoverSelect={(item) => setStatus(item.id as InvoiceStatus)} onClearSelection={status ? () => setStatus(null) : undefined}>
            {status ?? "Status"}
          </Chip>
          {period && status ? <Button level="tertiary" onClick={clearFilters}>Clear all</Button> : null}
        </Stack>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "invoice")}</Text>
      </Stack>
      <Table aria-labelledby={titleId} columns={invoiceColumns} rows={rows} getRowId={(row) => row.id}
        empty={
          <EmptyState title="No invoices match" headingLevel={5} illustration={false} secondaryAction={{ label: "Clear filters", onClick: clearFilters }}>
            No invoice was issued in these dates with this status.
          </EmptyState>
        } />
    </Stack>
  );
}

// ——— 4. Contract dates ——————————————————————————————————————————————————————————————————————————

function ContractDatesExample() {
  const { toast } = useToast();
  const [type, setType] = useState("permanent");
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string>();
  const permanent = type === "permanent";
  const save = () => {
    // A failed submit: Form moves focus to the end date and announces it.
    if (!permanent && !parseTyped(end)) { setError("Enter the last day of the contract, as MM/DD/YYYY"); return; }
    setError(undefined);
    toast({ type: "positive", title: "Contract saved" });
  };
  return (
    <Card theme="flat" className="px-date-picker-card">
      <Form onSubmit={save} gap="md">
        {/* The person is a List row: it has no side padding of its own, so its text lines up with the fields. */}
        <List aria-label="Employee">
          <ListItem title={people.khoa.name} caption={`${people.khoa.role} · ${people.khoa.location}`}
            leading={<Avatar size="md" theme={people.khoa.theme} alt="">{initials(people.khoa.name)}</Avatar>} />
        </List>
        <SelectField label="Contract type" value={type} onValueChange={(next) => { setType(next); setError(undefined); }}
          options={[{ label: "Permanent", value: "permanent" }, { label: "Fixed term", value: "fixed" }]} />
        {/* Read-only: people read and copy the start date, but it changes only with a new contract. */}
        <DateField label="Start date" defaultValue="09/01/2026" readOnly today={TODAY} helpText="Set when the contract was signed." />
        {/* Disabled while the contract type rules it out; the help text says why. */}
        <DateField label="End date" today={TODAY} minDate={new Date(2026, 8, 1)} value={end} onValueChange={(next) => { setEnd(next); setError(undefined); }} error={error}
          disabled={permanent} helpText={permanent ? "Permanent contracts have no end date." : undefined} />
        <FormActions>
          <Button level="primary" type="submit">Save contract</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

// ——— 5. Date of birth ——————————————————————————————————————————————————————————————————————————

const ADULT_BY = new Date(TODAY.getFullYear() - 18, TODAY.getMonth(), TODAY.getDate());
function checkBirthday(text: string, required: boolean) {
  if (!text.trim()) return required ? "Enter your date of birth" : undefined;
  const date = parseTyped(text);
  if (!date) return "Enter the date as MM/DD/YYYY, like 06/14/1995";
  return date > ADULT_BY ? "New team members must be 18 or older" : undefined;
}

function BirthdayExample() {
  const { toast } = useToast();
  const [birthday, setBirthday] = useState("");
  const [error, setError] = useState<string>();
  const save = () => {
    const problem = checkBirthday(birthday, true);
    setError(problem);
    if (!problem) toast({ type: "positive", title: "Details saved" });
  };
  return (
    <Card theme="flat" className="px-date-picker-card">
      <Form onSubmit={save} gap="md">
        <Heading level={4} textStyle="Heading/Subheading">Personal details</Heading>
        <InputField label="Legal name" defaultValue="Phạm Thị Em" />
        {/* A far-past date is quicker to type; the calendar's month and year open a wheel for the decades. Validate on blur. */}
        <DateField label="Date of birth" today={TODAY} maxDate={TODAY} value={birthday} error={error} helpText="Only People Ops can see it."
          onValueChange={(next) => { setBirthday(next); if (error) setError(checkBirthday(next, false)); }}
          onBlur={() => setError(checkBirthday(birthday, false))} />
        <FormActions>
          <Button level="primary" type="submit">Save details</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

// ——— 6. Schedule a review (phone) ————————————————————————————————————————————————————————————————

type Review = { id: string; name: string; project: string; date: Date; time: DatePickerTime };
const at = (from: string, to: string): DatePickerTime => ({ from, to });
// The studio's design reviews for the next three weeks, soonest first.
const firstReviews: Review[] = [
  { id: "r1", name: "Points history screen", project: "phin-loyalty", date: daysFromToday(1), time: at("14:00", "14:30") },
  { id: "r2", name: "Transfer flow findings", project: "lumen-banking", date: daysFromToday(2), time: at("10:00", "11:00") },
  { id: "r3", name: "Rewards at checkout", project: "phin-loyalty", date: daysFromToday(5), time: at("11:00", "11:30") },
  { id: "r4", name: "Metric card guidelines", project: "zen-ds", date: daysFromToday(6), time: at("15:00", "15:30") },
  { id: "r5", name: "Account overview audit", project: "lumen-banking", date: daysFromToday(7), time: at("09:30", "10:30") },
  { id: "r6", name: "Outdoor range moodboard", project: "saola-brand", date: daysFromToday(8), time: at("14:00", "15:00") },
  { id: "r7", name: "Passkey sign-in on iOS", project: "lumen-banking", date: daysFromToday(9), time: at("16:00", "16:30") },
  { id: "r8", name: "Stamp card animation", project: "phin-loyalty", date: daysFromToday(12), time: at("10:00", "10:30") },
  { id: "r9", name: "Input and Search states", project: "zen-ds", date: daysFromToday(13), time: at("14:00", "14:30") },
  { id: "r10", name: "Brand kickoff deck", project: "saola-brand", date: daysFromToday(14), time: at("09:00", "10:00") },
  { id: "r11", name: "Saved payees list", project: "lumen-banking", date: daysFromToday(15), time: at("11:00", "11:30") },
  { id: "r12", name: "Android build polish", project: "phin-loyalty", date: daysFromToday(16), time: at("15:30", "16:00") },
  { id: "r13", name: "Top navigation on phones", project: "zen-ds", date: daysFromToday(19), time: at("10:00", "11:00") },
  { id: "r14", name: "Logo directions", project: "saola-brand", date: daysFromToday(20), time: at("14:00", "15:00") },
  { id: "r15", name: "Release notes screen", project: "phin-loyalty", date: daysFromToday(22), time: at("16:00", "16:30") },
];
// Today is Wednesday: this week ends on Sunday (+4), next week a week later.
const reviewWeeks = [
  { label: "This week", before: daysFromToday(5, 0, 0) },
  { label: "Next week", before: daysFromToday(12, 0, 0) },
  { label: "Later", before: null },
];
const reviewProjects = projects.filter((project) => project.status === "Active" || project.status === "Planning");
const when = (date: Date, time: DatePickerTime) => `${weekday(date, "short")}, ${formatDay(date)} · ${timeText(time)}`;
/** Today is the 30th: the calendar opens on the month of the first day that can still be booked. */
const firstFreeMonth = () => { const tomorrow = daysFromToday(1); return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1); };

function ReviewScheduleExample() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const formId = useId();
  const groupId = useId();
  const [atList, setAtList] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [reviews, setReviews] = useState(firstReviews);
  const [project, setProject] = useState(reviewProjects[0].id);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [date, setDate] = useState<Date | null>(null);
  const [month, setMonth] = useState(firstFreeMonth);
  const [time, setTime] = useState<DatePickerTime>({ from: "14:00", to: "14:30" });
  const toList = () => screen.go('.zen-top-nav__action[aria-label="New review"]', () => { setDiscarding(false); setAtList(true); });
  // Back drops the draft only after asking, unless nothing was filled in.
  const back = () => (name.trim() || date ? setDiscarding(true) : toList());
  const openNew = () => {
    setName(""); setNameError(undefined); setDate(null); setMonth(firstFreeMonth());
    screen.go('.zen-top-nav__action[aria-label="Back"]', () => setAtList(false));
  };
  const schedule = () => {
    // A failed submit: Form moves focus to the name field and announces it.
    if (!name.trim()) { setNameError("Name the review"); return; }
    if (!date) return;
    setReviews([...reviews, { id: `r${reviews.length + 1}`, name: name.trim(), project, date, time }].sort((a, b) => a.date.getTime() - b.date.getTime()));
    toList();
    toast({ type: "positive", title: "Review scheduled", children: `${name.trim()} · ${when(date, time)}` });
  };

  if (atList) {
    let from = 0;
    const groups = reviewWeeks.map((week) => {
      const until = week.before ? reviews.findIndex((review) => review.date >= week.before!) : -1;
      const rows = reviews.slice(from, until === -1 ? reviews.length : until);
      from += rows.length;
      return { ...week, rows };
    }).filter((group) => group.rows.length);
    return (
      // One key per screen: each screen opens at the top and the large title folds again.
      // The reviews are grouped by week: a grouped list, so the screen is Surface-Alt with the Alt bar and each week a white
      // ListBox under its kicker. The rows only show a review (Interactive=No) and have no side padding of their own, so the
      // ListBox pads them (20px on a phone) and the kicker lines up with their text (lg, 20px).
      <PlatformPhone key="list" label="Design reviews" canvas="alt" headerOverlay screenRef={screenRef}
        header={<TopNavigation type="alt" title="Reviews" largeTitle="Reviews" scrollRef={screenRef}
          trailing={[{ icon: "icon-plus-line", label: "New review", onClick: openNew }]} />}>
        {screen.anchor}
        <Stack gap="lg" padding="lg">
          {groups.map((group, index) => (
            <Stack key={group.label} as="section" gap="xs" aria-labelledby={`${groupId}-${index}`}>
              <Box paddingX="lg"><Heading level={2} id={`${groupId}-${index}`} textStyle="Body/Small/Bold" tone="light">{group.label}</Heading></Box>
              <ListBox>
                <List aria-labelledby={`${groupId}-${index}`}>
                  {group.rows.map((review) => {
                    const reviewProject = projectById(review.project);
                    return (
                      <ListItem key={review.id} title={review.name} caption={when(review.date, review.time)}
                        leading={<DockIcon icon={reviewProject.icon} theme={reviewProject.theme} background="subtle" label={reviewProject.name} />} />
                    );
                  })}
                </List>
              </ListBox>
            </Stack>
          ))}
        </Stack>
      </PlatformPhone>
    );
  }
  return (
    <PlatformPhone key="new" label="New review" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact" title="New review" scrollRef={screenRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
      footer={<ActionBar position="static"
        summary={<Text as="span" textStyle="Body/Base/Medium" tone={date ? "strongest" : "base"}>{date ? when(date, time) : "No date yet"}</Text>}
        primaryAction={{ label: "Schedule review", type: "submit", form: formId, disabled: !date }} />}>
      {screen.anchor}
      <Box padding="lg">
        <Form id={formId} onSubmit={schedule} gap="md">
          <SelectField size="lg" label="Project" value={project} onValueChange={setProject}
            options={reviewProjects.map((option) => ({ label: option.name, value: option.id }))} />
          <InputField size="lg" label="Review" placeholder="e.g. Points history screen" value={name} error={nameError}
            onValueChange={(next) => { setName(next); setNameError(undefined); }} />
          <Stack gap="xs">
            <Heading level={2} textStyle="Body/Small/Bold" tone="light">Date and time</Heading>
            {/* The calendar keeps its Figma width (Items stay 32px), centred in the phone column. */}
            <Stack align="center">
              <DatePicker today={TODAY} minDate={TODAY} value={date} onValueChange={setDate} month={month} onMonthChange={setMonth}
                timePicker time={time} onTimeChange={setTime} />
            </Stack>
          </Stack>
        </Form>
      </Box>
      <BottomSheet inline open={discarding} onOpenChange={setDiscarding} title="Discard this review?"
        primaryAction={{ label: "Discard review", level: "danger", onClick: toList }} secondaryAction={{ label: "Keep editing" }}>
        <Text tone="base">The name and the slot you picked won't be saved.</Text>
      </BottomSheet>
    </PlatformPhone>
  );
}

// ——— Examples ———————————————————————————————————————————————————————————————————————————————————

export const examples: ExampleDef[] = [
  {
    title: "Due date",
    description: "A DateField takes a typed date or opens the calendar on focus; the help text turns the date into what it means for the task. A date that can't be read, or one in the past, is an error on Create task.",
    render: () => <DueDateExample />,
    code: `const [due, setDue] = useState("10/05/2026");
const date = parseDate(due); // "MM/DD/YYYY" → Date | null

<Card theme="flat">
  <Form onSubmit={createTask} gap="md">
    <Heading level={4} textStyle="Heading/Subheading">New task</Heading>
    <InputField label="Task" value={task} error={errors.task} onValueChange={setTask} />
    <DateField label="Due date" labelOptional today={today} minDate={today} value={due} error={errors.due} onValueChange={setDue}
      helpText={date ? \`\${weekday(date)}, \${formatDate(date)} · \${formatDue(date)}\` : undefined} />
    <FormActions><Button level="primary" type="submit">Create task</Button></FormActions>
  </Form>
</Card>`,
  },
  {
    title: "Date of birth",
    description: "A date decades away is typed, or found through the month and year wheel in the calendar header. The field checks the format and the age when focus leaves it, and again on Save.",
    render: () => <BirthdayExample />,
    code: `const [birthday, setBirthday] = useState("");
const [error, setError] = useState<string>();
// check(): "Enter the date as MM/DD/YYYY, like 06/14/1995" · "New team members must be 18 or older"

<Form onSubmit={save} gap="md">
  <DateField label="Date of birth" today={today} maxDate={today} value={birthday} error={error}
    helpText="Only People Ops can see it."
    onValueChange={(text) => { setBirthday(text); if (error) setError(check(text)); }}
    onBlur={() => setError(check(birthday))} />
  <FormActions><Button level="primary" type="submit">Save details</Button></FormActions>
</Form>`,
  },
  {
    title: "Time off request",
    description: "An inline range calendar has no popover surface, so it shares one card with the request it builds. It opens on this month, so the past days show as disabled; the summary counts working days against the balance and holds the request back when it runs over.",
    wide: true,
    render: () => <TimeOffExample />,
    code: `const [range, setRange] = useState<DatePickerRange | null>(null);
const [month, setMonth] = useState(september);
const days = range?.end ? workingDays(range.start, range.end) : 0;

<Card theme="flat">
  <Stack direction="row" wrap gap="lg" align="start">
    {/* Inline: no onOpenChange or anchorRef, so no popover surface. calendar="single" where two months don't fit. */}
    <DatePicker today={today} calendar="dual" selectionMode="range" minDate={today}
      month={month} onMonthChange={setMonth} range={range} onRangeChange={setRange} />
    <Form onSubmit={request} gap="md"> {/* flex: 1 1 240px */}
      <Heading level={4} textStyle="Heading/Subheading">Annual leave</Heading>
      <DescriptionList items={[
        { term: "Dates", description: range?.end ? formatRange(range.start, range.end) : "No dates yet" },
        { term: "Working days", description: plural(days, "day") },
        { term: "Balance after", description: plural(balance - days, "day") },
      ]} />
      {days > balance ? <InlineMessage theme="warning" title={\`\${plural(days - balance, "day")} over your balance\`}>…</InlineMessage> : null}
      <FormActions>
        <Button level="primary" type="submit" disabled={!range?.end || days > balance}>Request time off</Button>
      </FormActions>
    </Form>
  </Stack>
</Card>

// Withdrawing can be undone: toast({ title: "Request withdrawn", action: { label: "Undo", onClick: () => request() } })`,
  },
  {
    title: "Filter by issue date",
    description: "An Advanced chip opens the calendar as a popover anchored to it. Picks stay a draft until Submit filters the table; Cancel or Escape drops them and returns focus to the chip.",
    wide: true,
    render: () => <InvoiceFilterExample />,
    code: `const chipRef = useRef<HTMLButtonElement>(null);
const [open, setOpen] = useState(false);
const [period, setPeriod] = useState<DatePickerRange | null>(thisMonth);
const [month, setMonth] = useState(august);

<Chip ref={chipRef} variant="advanced" dropdown aria-haspopup="dialog" aria-expanded={open} popoverOpen={open}
  selected={Boolean(period)} onClearSelection={() => setPeriod(null)} onClick={() => setOpen(!open)}>
  {period?.end ? formatRange(period.start, period.end) : "Issue date"}
</Chip>
<DatePicker open={open} onOpenChange={setOpen} anchorRef={chipRef} today={today}
  calendar="dual" selectionMode="range" maxDate={today}
  range={period} month={month} onMonthChange={setMonth}
  showActions onApply={(_, range) => setPeriod(range)} />
{/* No container: the table lies on the page under its heading and toolbar. */}
<Table aria-labelledby={titleId} columns={columns} rows={invoices.filter(inPeriod)}
  empty={<EmptyState title="No invoices match" illustration={false}
    secondaryAction={{ label: "Clear filters", onClick: clearFilters }}>…</EmptyState>} />`,
  },
  {
    title: "Contract dates",
    description: "The start date is Read-only: people can read and copy it, and it never opens a calendar. The end date is Disabled while the contract is permanent, and its help text says why.",
    render: () => <ContractDatesExample />,
    code: `<Form onSubmit={save} gap="md">
  <SelectField label="Contract type" options={types} value={type} onValueChange={setType} />
  <DateField label="Start date" defaultValue="09/01/2026" readOnly today={today}
    helpText="Set when the contract was signed." />
  <DateField label="End date" today={today} minDate={contractStart} value={end} onValueChange={setEnd} error={error}
    disabled={type === "permanent"}
    helpText={type === "permanent" ? "Permanent contracts have no end date." : undefined} />
  <FormActions><Button level="primary" type="submit">Save contract</Button></FormActions>
</Form>`,
  },
  {
    title: "Schedule a review",
    description: "On a phone the calendar sits in the screen with the Time-Picker under it. The footer shows the picked slot and schedules the review once there is a date; the review lands in its week of the list, and Back asks before it drops a filled-in draft.",
    render: () => <ReviewScheduleExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);
const [date, setDate] = useState<Date | null>(null);
const [month, setMonth] = useState(firstFreeMonth); // today is the 30th: open on October
const [time, setTime] = useState<DatePickerTime>({ from: "14:00", to: "14:30" });

// One key per screen; the Reviews root has a large title that folds over the weeks of reviews. Its weeks are a grouped
// list: <PlatformPhone key="list" canvas="alt"> with TopNavigation type="alt", each week a white
// <ListBox> around its List of static rows, under a kicker in <Box paddingX="lg">.
<PlatformPhone key="new" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact" title="New review" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => (dirty ? setDiscarding(true) : toList()) }} />}
  footer={<ActionBar position="static"
    summary={<Text as="span" textStyle="Body/Base/Medium" tone={date ? "strongest" : "base"}>{date ? when(date, time) : "No date yet"}</Text>}
    primaryAction={{ label: "Schedule review", type: "submit", form: formId, disabled: !date }} />}>
  <Form id={formId} onSubmit={schedule} gap="md">
    <InputField size="lg" label="Review" value={name} onValueChange={setName} error={nameError} />
    <Stack align="center"> {/* the calendar keeps its width, centred */}
      <DatePicker today={today} minDate={today} value={date} onValueChange={setDate} month={month} onMonthChange={setMonth}
        timePicker time={time} onTimeChange={setTime} />
    </Stack>
  </Form>
</PlatformPhone>`,
  },
];
