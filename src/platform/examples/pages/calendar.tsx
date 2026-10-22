import { useRef, useState } from "react";
import { Button } from "../../../components/Button";
import {
  CalendarAgenda, CalendarMonth, CalendarTimeGrid, CalendarToolbar, CalendarWeekStrip, shiftPeriod, toDate, useCalendarDevice,
  type CalendarEventData, type CalendarView,
} from "../../../components/Calendar";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { EmptyState } from "../../../components/EmptyState";
import { Stack } from "../../../components/Layout";
import { Heading, Text } from "../../../components/Text";
import { TopNavigation } from "../../../components/TopNavigation";
import { PlatformPhone } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { TODAY, people } from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./calendar.css";

export const page: PlatformPage = "calendar";

// ——— Data: Đìzai Studio's calendars around Wednesday 30 September 2026 ———————————————————————————————————

/** A time on the day `offset` days from today. */
const at = (offset: number, hour: number, minute = 0) => new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + offset, hour, minute);
const day = (offset: number) => new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + offset);
const team = [people.alex, people.bao, people.chi].map((person) => ({ src: person.photo, alt: person.name }));

/** Team → Brand, Design → Violet, Clients → Blue, People → Teal, Company → Orange, Social → Green, Hiring → Pink. */
const events: CalendarEventData[] = [
  { id: "standup", title: "Daily standup", start: at(0, 9), end: at(0, 9, 30), meta: "Zoom", attendees: team },
  { id: "q4-planning", title: "Q4 planning", start: at(0, 10, 30), end: at(0, 12), color: "blue", meta: "Room 2 · Lotus", attendees: team },
  { id: "lunch", title: "Lunch · Linh Tran", start: at(0, 12), end: at(0, 13), color: "green", meta: "Phở Hà" },
  { id: "maya", title: "1:1 Maya Chen", start: at(0, 14), end: at(0, 14, 45), color: "teal", meta: "Google Meet" },
  { id: "critique", title: "Design critique", start: at(0, 16), end: at(0, 17), color: "violet", meta: "Studio floor" },
  { id: "kickoff", title: "Q4 kickoff", start: day(1), allDay: true, meta: "Whole studio", attendees: team },
  { id: "lotus-call", title: "Client call · Lotus", start: at(1, 13), end: at(1, 14), color: "blue", meta: "Zoom" },
  { id: "demo", title: "Sprint demo", start: at(2, 15), end: at(2, 16), color: "teal", meta: "Room 3 · Bamboo", attendees: team },
  { id: "planning", title: "Weekly planning", start: at(-2, 9), end: at(-2, 10), meta: "Room 1" },
  { id: "review", title: "Design review", start: at(-1, 11), end: at(-1, 12), color: "violet", meta: "Room 2" },
  { id: "hiring", title: "Hiring panel", start: at(-1, 14), end: at(-1, 15, 30), color: "pink", meta: "Room 4" },
  { id: "portfolio", title: "Portfolio review with the hiring committee", start: at(-1, 14, 30), end: at(-1, 16), color: "orange", meta: "Room 1" },
  { id: "offsite", title: "Studio offsite", start: day(-16), end: day(-14), allDay: true, color: "orange", meta: "Đà Lạt" },
  { id: "retro", title: "Sprint retro", start: at(-7, 16), end: at(-7, 17), color: "teal" },
  { id: "payroll", title: "Payroll run", start: at(-9, 9), end: at(-9, 9, 30), color: "orange" },
  { id: "brand-sync", title: "Brand sync", start: at(-8, 10), end: at(-8, 11), color: "violet" },
  { id: "invoice", title: "Invoice review", start: at(-8, 11), end: at(-8, 11, 30), color: "blue" },
  { id: "1-1-bao", title: "1:1 Bao Nguyen", start: at(-8, 14), end: at(-8, 14, 30), color: "teal" },
  { id: "showcase", title: "Friday showcase", start: at(-8, 16), end: at(-8, 17), color: "green" },
  { id: "quiz", title: "Team quiz night", start: at(-8, 18), end: at(-8, 20), color: "green" },
];

const byId = (id: string | null) => events.find((event) => event.id === id) ?? null;
const clock = (date: Date) => date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const timeOf = (event: CalendarEventData) => event.allDay ? "All day" : `${clock(toDate(event.start))} – ${clock(toDate(event.end ?? event.start))}`;

// ——— Examples ————————————————————————————————————————————————————————————————————————————————————

/** The main use: the Toolbar moves the period and switches the view under it. */
function TeamCalendarExample() {
  const [view, setView] = useState<CalendarView>("month");
  const [date, setDate] = useState(day(0));
  const rootRef = useRef<HTMLDivElement>(null);
  // On a phone the switch keeps three views: a fourth label no longer fits (see On a phone).
  const mobile = useCalendarDevice(undefined, rootRef) === "mobile";
  return (
    <Stack gap="md" ref={rootRef}>
      <CalendarToolbar date={date} today={TODAY} view={view} views={mobile ? ["month", "week", "day"] : undefined} onViewChange={setView}
        onToday={() => setDate(day(0))} onPrevious={() => setDate(shiftPeriod(date, view, -1))} onNext={() => setDate(shiftPeriod(date, view, 1))} />
      {view === "month" ? <CalendarMonth month={date} value={date} onValueChange={setDate} events={events} today={TODAY}
        onMoreClick={(picked) => { setDate(picked); setView("day"); }} /> : null}
      {view === "week" || view === "day" ? <CalendarTimeGrid view={view} date={date} events={events} now={TODAY} /> : null}
      {view === "agenda" ? <CalendarAgenda from={date} events={events} today={TODAY} /> : null}
    </Stack>
  );
}

/** Week view: overlapping events share the column; pressing one opens its details beside the grid (State=Selected). */
function WeekDetailsExample() {
  const [selected, setSelected] = useState<string | null>("hiring");
  const event = byId(selected);
  return (
    <div className="px-calendar-split">
      <CalendarTimeGrid view="week" date={day(0)} events={events} now={TODAY} className="px-calendar-scroll"
        selectedEventId={selected} onEventClick={(picked) => setSelected(picked.id === selected ? null : picked.id)} />
      <Card theme="default" className="px-calendar-details" aria-live="polite">
        {event ? (
          <Stack gap="sm">
            <Heading level={3} textStyle="Heading/Subheading">{event.title}</Heading>
            <DescriptionList layout="stacked" items={[
              { id: "when", term: "When", description: `${toDate(event.start).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · ${timeOf(event)}` },
              { id: "where", term: "Where", description: event.meta ?? "No place set" },
            ]} />
          </Stack>
        ) : (
          <Text tone="light">Select an event to see its details.</Text>
        )}
      </Card>
    </div>
  );
}

/** An agenda range with nothing in it: the Empty-State says so and offers the next step, which fills it. */
function EmptyWeekExample() {
  const [added, setAdded] = useState<CalendarEventData[]>([]);
  const create = () => setAdded([{ id: "new-event", title: "New event", start: at(21, 10), end: at(21, 11), meta: "Add a place" }]);
  return (
    <CalendarAgenda from={day(20)} days={7} events={[...events, ...added]} today={TODAY}
      empty={<EmptyState size="sm" title="No events next week" icon="icon-calendar-line" primaryAction={{ label: "New event", onClick: create }}>
        Nothing is planned for Oct 20 – 26 yet.
      </EmptyState>} />
  );
}

/** The day planner header: Week-Strip tiles pick the day, the agenda lists it. */
function DayPlannerExample() {
  const [picked, setPicked] = useState(day(0));
  return (
    <Card theme="default" maxWidth={420}>
      <Stack gap="md">
        <Heading level={3} textStyle="Heading/Subheading">My week</Heading>
        <CalendarWeekStrip variant="tile" device="desktop" value={picked} onValueChange={setPicked} events={events} today={TODAY} aria-label="Pick a day" />
        <CalendarAgenda device="mobile" from={picked} days={1} events={events} today={TODAY} />
      </Stack>
    </Card>
  );
}

/** A phone: the mobile Toolbar, the Week-Strip over the day's agenda, or the 3-Day grid. */
function PhoneCalendarExample() {
  const screenRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<CalendarView>("month");
  const [date, setDate] = useState(day(0));
  return (
    <PlatformPhone label="Calendar" screenRef={screenRef} header={<TopNavigation type="compact-alt" title="Calendar" scrollRef={screenRef} />}>
      {/* Figma's phone frames: 358 wide inside 16px margins. */}
      <Stack gap="lg" padding="md">
        {/* Three views: in the Mobile typography and Comfortable density a fourth label ("Agenda") no longer fits 358px;
            the month lists the picked day's agenda under it. */}
        <CalendarToolbar device="mobile" date={date} today={TODAY} view={view} views={["month", "week", "day"]} onViewChange={setView}
          onToday={() => setDate(day(0))} onPrevious={() => setDate(shiftPeriod(date, view === "week" ? "3-day" : view, -1))} onNext={() => setDate(shiftPeriod(date, view === "week" ? "3-day" : view, 1))} />
        {view === "month" ? (
          <>
            <CalendarMonth device="mobile" month={date} value={date} onValueChange={setDate} events={events} today={TODAY} />
            <CalendarAgenda device="mobile" from={date} days={1} events={events} today={TODAY} />
          </>
        ) : null}
        {view === "week" ? <CalendarTimeGrid device="mobile" view="3-day" date={date} events={events} now={TODAY} /> : null}
        {view === "day" ? (
          <>
            <CalendarWeekStrip device="mobile" value={date} onValueChange={setDate} events={events} today={TODAY} aria-label="Pick a day" />
            <CalendarTimeGrid device="mobile" view="day" date={date} events={events} now={TODAY} />
          </>
        ) : null}
      </Stack>
    </PlatformPhone>
  );
}

/** Keyboard: one day of the month is in the tab order; the arrow keys move a day or a week. */
function KeyboardMonthExample() {
  const [picked, setPicked] = useState<Date | null>(null);
  return (
    <Stack gap="sm">
      <CalendarMonth month={day(0)} value={picked} onValueChange={setPicked} events={events} today={TODAY} aria-label="September 2026, team calendar" />
      <Text tone="light" aria-live="polite">{picked ? `Selected ${picked.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}` : "Tab to the month, then use the arrow keys."}</Text>
    </Stack>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Team calendar",
    description: "The Toolbar moves the period (Today, previous, next) and switches the view under it. A busy day shows two events and +N more, which opens that day.",
    wide: true,
    render: () => <TeamCalendarExample />,
    code: `const [view, setView] = useState<CalendarView>("month");
const [date, setDate] = useState(today);

<Stack gap="md">
  <CalendarToolbar date={date} view={view} onViewChange={setView}
    onToday={() => setDate(today)} onPrevious={() => setDate(shiftPeriod(date, view, -1))} onNext={() => setDate(shiftPeriod(date, view, 1))} />
  {view === "month" ? <CalendarMonth month={date} value={date} onValueChange={setDate} events={events}
    onMoreClick={(day) => { setDate(day); setView("day"); }} /> : null}
  {view === "week" || view === "day" ? <CalendarTimeGrid view={view} date={date} events={events} /> : null}
  {view === "agenda" ? <CalendarAgenda from={date} events={events} /> : null}
</Stack>`,
  },
  {
    title: "Event details",
    description: "Overlapping meetings share the column and the now line crosses today. Pressing an event selects it (its block turns Solid) and shows its details beside the grid; long titles truncate.",
    wide: true,
    render: () => <WeekDetailsExample />,
    code: `const [selected, setSelected] = useState<string | null>(null);
const event = events.find((item) => item.id === selected);

<CalendarTimeGrid view="week" date={today} events={events} style={{ maxHeight: 560 }}
  selectedEventId={selected} onEventClick={(picked) => setSelected(picked.id === selected ? null : picked.id)} />
<Card theme="default" aria-live="polite">
  {event ? <EventDetails event={event} /> : <Text tone="light">Select an event to see its details.</Text>}
</Card>`,
  },
  {
    title: "Empty week",
    description: "An agenda range with no events shows an Empty-State instead of a blank box, with the action that fills it.",
    render: () => <EmptyWeekExample />,
    code: `<CalendarAgenda from={nextMonday} days={7} events={events}
  empty={<EmptyState size="sm" title="No events next week" icon="icon-calendar-line" primaryAction={{ label: "New event", onClick: createEvent }}>
    Nothing is planned for Oct 20 – 26 yet.
  </EmptyState>} />`,
  },
  {
    title: "Day planner",
    description: "Week-Strip tiles pick a single day and the agenda lists it. The selected tile is a bordered Surface, readable on any canvas.",
    render: () => <DayPlannerExample />,
    code: `const [day, setDay] = useState(today);

<Card theme="default">
  <Stack gap="md">
    <Heading level={3} textStyle="Heading/Subheading">My week</Heading>
    <CalendarWeekStrip variant="tile" value={day} onValueChange={setDay} events={events} aria-label="Pick a day" />
    <CalendarAgenda device="mobile" from={day} days={1} events={events} />
  </Stack>
</Card>`,
  },
  {
    title: "On a phone",
    description: "The mobile Toolbar puts the view switch full width under a short title (Sep 2026). Month shows dots and lists the tapped day; Week is the 3-Day grid, Day adds the Week-Strip.",
    render: () => <PhoneCalendarExample />,
    code: `<PlatformPhone header={<TopNavigation type="compact-alt" title="Calendar" />}>
  <Stack gap="lg" padding="md">
    <CalendarToolbar device="mobile" date={date} view={view} views={["month", "week", "day"]} onViewChange={setView} onToday={…} onPrevious={…} onNext={…} />
    {view === "month" ? <>
      <CalendarMonth device="mobile" month={date} value={date} onValueChange={setDate} events={events} />
      <CalendarAgenda device="mobile" from={date} days={1} events={events} />
    </> : null}
    {view === "week" ? <CalendarTimeGrid device="mobile" view="3-day" date={date} events={events} /> : null}
  </Stack>
</PlatformPhone>`,
  },
  {
    title: "Keyboard and screen readers",
    wide: true,
    description: "One day of the month is in the tab order; the arrow keys move a day or a week and Home / End jump to the week's ends. Each date is named with its full date and event count, and today is announced as the current date.",
    render: () => <KeyboardMonthExample />,
    code: `<CalendarMonth month={today} value={picked} onValueChange={setPicked} events={events} aria-label="September 2026, team calendar" />
<Text tone="light" aria-live="polite">{picked ? \`Selected \${format(picked)}\` : "Tab to the month, then use the arrow keys."}</Text>`,
  },
]);
