import { useId, useRef, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, Badge, BottomSheet, Box, DateField, DockIcon, Form, Heading, List, ListBox, ListItem, SelectField, Stack, Text, TextAreaField,
  TopNavigation, plural, useFormState, useToast,
} from "@zen-ds/react";
import { TODAY, formatDate, formatDay, leaveRequests, leaveStatusTheme, type LeaveStatus } from "../../data";

/** "10/12/2026" (what DateField shows and types) → a Date, or null. */
const parseDay = (value: string) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  const d = m ? new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

type TimeOffRequest = { id: string; type: string; first: Date; last: Date; status: LeaveStatus };
// The shared leave kinds, plus Work from home, which this form also books.
const leaveTypes = ["Annual leave", "Sick leave", "Work from home", "Unpaid leave"].map((type) => ({ value: type, label: type }));
const annualAllowance = 18;
const day = (month: number, date: number) => new Date(2026, month - 1, date);
// Alex's requests this year, newest first: the shared Oct 12 – Oct 14 leave, then the ones already taken.
const pastRequests: TimeOffRequest[] = [
  ...leaveRequests.filter((r) => r.person === "alex").map((r) => ({ id: r.id, type: r.kind, first: r.from, last: r.to, status: r.status })),
  { id: "r12", type: "Work from home", first: day(9, 25), last: day(9, 25), status: "Approved" },
  { id: "r11", type: "Sick leave", first: day(9, 18), last: day(9, 18), status: "Approved" },
  { id: "r10", type: "Annual leave", first: day(8, 27), last: day(8, 28), status: "Approved" },
  { id: "r9", type: "Work from home", first: day(8, 7), last: day(8, 7), status: "Approved" },
  { id: "r8", type: "Sick leave", first: day(7, 17), last: day(7, 17), status: "Approved" },
  { id: "r7", type: "Annual leave", first: day(6, 29), last: day(7, 1), status: "Approved" },
  { id: "r6", type: "Work from home", first: day(6, 12), last: day(6, 12), status: "Approved" },
  { id: "r5", type: "Annual leave", first: day(5, 4), last: day(5, 4), status: "Approved" },
  { id: "r4", type: "Sick leave", first: day(4, 10), last: day(4, 10), status: "Approved" },
  { id: "r3", type: "Work from home", first: day(3, 16), last: day(3, 17), status: "Approved" },
  { id: "r2", type: "Annual leave", first: day(2, 23), last: day(2, 24), status: "Approved" },
  { id: "r1", type: "Unpaid leave", first: day(1, 9), last: day(1, 9), status: "Approved" },
];
const workingDays = (first: Date, last: Date) => {
  let n = 0;
  for (const d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) if (d.getDay() % 6 !== 0) n += 1;
  return n;
};
const today = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
// This year's dates drop the year, so a row title stays on one line beside its status.
const dayOf = (d: Date) => d.getFullYear() === TODAY.getFullYear() ? formatDay(d) : formatDate(d);
const datesOf = (r: TimeOffRequest) => r.first.getTime() === r.last.getTime() ? dayOf(r.first) : `${dayOf(r.first)} – ${dayOf(r.last)}`;
type LeaveDraft = { type: string; first: string; last: string; note: string };

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function TimeOffPhone({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const formId = useId();
  const upcomingId = useId();
  const earlierId = useId();
  const [view, setView] = useState<"list" | "form">("list");
  const [discarding, setDiscarding] = useState(false);
  const [requests, setRequests] = useState(pastRequests);
  // Focus follows the screen: each screen focuses its title once it shows.
  const titleRef = useRef<HTMLSpanElement>(null);
  const show = (next: "list" | "form") => {
    setView(next);
    setTimeout(() => titleRef.current?.focus());
  };
  const title = (text: string) => <span ref={titleRef} tabIndex={-1}>{text}</span>;
  const annualLeft = annualAllowance - requests.filter((r) => r.type === "Annual leave").reduce((n, r) => n + workingDays(r.first, r.last), 0);
  const upcoming = requests.filter((r) => r.last >= today).sort((a, b) => a.first.getTime() - b.first.getTime());
  const earlier = requests.filter((r) => r.last < today);
  const form = useFormState<LeaveDraft>({
    initialValues: { type: "Annual leave", first: "", last: "", note: "" },
    validate: (v) => {
      const first = parseDay(v.first), last = parseDay(v.last);
      const days = first && last ? workingDays(first, last) : 0;
      return {
        first: !first ? "Pick your first day off" : first < today ? "Pick today or a later day" : undefined,
        last: !last ? "Pick your last day off" : first && last < first ? "Pick a last day on or after the first day"
          : v.type === "Annual leave" && days > annualLeft ? `You have ${plural(annualLeft, "day")} of annual leave left` : undefined,
      };
    },
    onSubmit: (v, { reset }) => {
      setRequests((list) => [{ id: `new-${list.length + 1}`, type: v.type, first: parseDay(v.first)!, last: parseDay(v.last)!, status: "Pending" }, ...list]);
      reset();
      show("list");
      toast({ type: "positive", title: "Request sent", children: "Minh Anh Vo will reply in Zen." });
    },
  });
  const first = parseDay(form.values.first), last = parseDay(form.values.last);
  const days = first && last && last >= first ? workingDays(first, last) : 0;
  const after = annualLeft - days;
  const annual = form.values.type === "Annual leave";
  const lastHelp = days ? `${plural(days, "working day")}${annual ? ` · ${after < 0 ? `${plural(-after, "day")} over your balance` : `${plural(after, "day")} left after this`}` : ""}` : undefined;
  const toList = () => { setDiscarding(false); form.reset(); show("list"); };
  // Back drops the draft only after asking, unless nothing was filled in.
  const back = () => (form.isDirty ? setDiscarding(true) : toList());
  const row = (r: TimeOffRequest) => (
    <ListItem key={r.id} title={datesOf(r)} caption={r.type}
      leading={<DockIcon icon="icon-calendar-check-line" theme={leaveStatusTheme[r.status]} background="subtle" />}
      trailing={<Badge theme={leaveStatusTheme[r.status]} background="subtle">{r.status}</Badge>} />
  );

  if (view === "list") {
    return (
      // One key per screen: each screen opens at the top and the large title folds again.
      // Grouped list: the screen is the Canvas and each group a white block. The requests only show their status
      // (Interactive=No rows, no side padding of their own), so each group is a ListBox (20px on a phone) and the kicker
      // lines up with their text (paddingX lg).
      <AppShell key="list"
        topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Time off" largeTitle={title("Time off")} />}
        actionBar={<ActionBar primaryAction={{ label: "Request time off", onClick: () => show("form") }} />}>
        <Stack gap="lg">
          <ListBox>
            <List aria-label="Balance">
              <ListItem title="Annual leave" caption={`${annualAllowance} days a year`} leading={<DockIcon icon="icon-calendar-line" theme="green" background="subtle" />}
                trailing={<Text as="span" textStyle="Body/Base/Bold">{plural(annualLeft, "day")} left</Text>} />
            </List>
          </ListBox>
          <Stack as="section" gap="xs" aria-labelledby={upcomingId}>
            <Box paddingX="lg"><Heading level={2} id={upcomingId} textStyle="Body/Small/Bold" tone="light">Upcoming</Heading></Box>
            <ListBox>
              <List aria-labelledby={upcomingId}>{upcoming.map(row)}</List>
            </ListBox>
          </Stack>
          <Stack as="section" gap="xs" aria-labelledby={earlierId}>
            <Box paddingX="lg"><Heading level={2} id={earlierId} textStyle="Body/Small/Bold" tone="light">Earlier this year</Heading></Box>
            <ListBox>
              <List aria-labelledby={earlierId}>{earlier.map(row)}</List>
            </ListBox>
          </Stack>
        </Stack>
      </AppShell>
    );
  }
  return (
    <>
      {/* A pushed form: Back on the leading edge, the submit in the footer. */}
      <AppShell key="form"
        topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={title("Request time off")}
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
        actionBar={<ActionBar primaryAction={{ label: "Send request", type: "submit", form: formId }} />}>
        <Form id={formId} form={form} gap="md">
          <SelectField size="lg" label="Leave type" options={leaveTypes} {...form.selectField("type")} />
          <DateField size="lg" label="First day" today={TODAY} minDate={today} {...form.dateField("first")} />
          <DateField size="lg" label="Last day" today={TODAY} minDate={first ?? today} helpText={lastHelp} helpTheme={annual && after < 0 ? "warning" : "neutral"} {...form.dateField("last")} />
          <TextAreaField size="lg" label="Note for Minh Anh" labelOptional placeholder="e.g. Family trip to Đà Lạt" rows={3} maxLength={200} characterLimit {...form.field("note")} />
        </Form>
      </AppShell>
      <BottomSheet inline open={discarding} onOpenChange={setDiscarding} title="Discard this request?"
        primaryAction={{ label: "Discard request", level: "danger", onClick: toList }} secondaryAction={{ label: "Keep editing" }}>
        <Text tone="base">The dates and the note you entered won't be sent.</Text>
      </BottomSheet>
    </>
  );
}
