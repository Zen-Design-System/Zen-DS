import { useRef, useState } from "react";
import {
  Badge, Button, Card, DatePicker, DescriptionList, Form, FormActions, Heading, InlineMessage, Stack, Text, plural, useToast, useZen, type DatePickerRange,
} from "@zen-ds/react";
import { TODAY, daysFromToday, formatDate, formatRange, leaveStatusTheme, me, people } from "../../data";

/** Mon–Fri between two dates, both included. */
function workingDays(start: Date, end: Date) {
  let count = 0;
  for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) if (day.getDay() % 6 !== 0) count += 1;
  return count;
}
// Alex's annual leave left this year, after the approved Oct 12 – Oct 14 trip (the Input page's Time off screen agrees).
const LEAVE_BALANCE = 7;

/** An inline range calendar shares one card with the request it builds, and holds it back when it runs over. */
export default function TimeOff() {
  const { toast } = useToast();
  // A dual calendar needs about 500px: phones get the single calendar.
  const twoMonths = useZen()?.breakpoint !== "mobile";
  const [range, setRange] = useState<DatePickerRange | null>({ start: daysFromToday(26), end: daysFromToday(30) });
  // Two months open on this one, so the disabled past days and today's boundary show; one month opens on the range.
  const [month, setMonth] = useState(() => new Date(2026, twoMonths ? 8 : 9, 1));
  const [requested, setRequested] = useState(false);
  // Request and Withdraw replace each other: focus moves to the button that took its place.
  const requestRef = useRef<HTMLButtonElement>(null);
  const withdrawRef = useRef<HTMLButtonElement>(null);
  const request = (next: boolean) => {
    setRequested(next);
    setTimeout(() => (next ? withdrawRef : requestRef).current?.focus());
  };
  // Withdrawing can be undone from the toast; Undo puts the request back and closes its toast.
  const withdraw = () => {
    request(false);
    toast({ title: "Request withdrawn", action: { label: "Undo", onClick: () => request(true) } });
  };
  const days = range?.end ? workingDays(range.start, range.end) : 0;
  const over = days - LEAVE_BALANCE;
  return (
    // One surface: the inline calendar (it has no popover surface of its own) beside the request it builds, lg apart.
    <Card theme="default">
      <Stack direction="row" wrap gap="lg" align="start">
        <DatePicker today={TODAY} calendar={twoMonths ? "dual" : "single"} selectionMode="range" minDate={TODAY}
          month={month} onMonthChange={setMonth}
          range={range} onRangeChange={(next) => { setRange(next); setRequested(false); }} />
        {/* The request takes the room beside the calendar and wraps under it below 240px (a flex basis that may still shrink). */}
        <Form onSubmit={() => { request(true); toast({ type: "positive", title: "Time off requested" }); }} gap="md" style={{ minWidth: 0, flex: "1 1 240px" }}>
          <Stack direction="row" justify="between" align="start" gap="sm">
            <Stack gap="xs">
              <Heading level={4} textStyle="Heading/Subheading">Annual leave</Heading>
              <Text textStyle="Body/Small/Regular" tone="base">{me.name} · {plural(LEAVE_BALANCE, "day")} left this year</Text>
            </Stack>
            {requested ? <Badge theme={leaveStatusTheme.Pending} background="subtle">Pending</Badge> : null}
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
          <FormActions>
            {requested ? (
              <Button ref={withdrawRef} key="withdraw" level="tertiary" onClick={withdraw}>Withdraw request</Button>
            ) : (
              <Button ref={requestRef} key="request" level="primary" type="submit" disabled={!range?.end || over > 0}>Request time off</Button>
            )}
          </FormActions>
        </Form>
      </Stack>
    </Card>
  );
}
