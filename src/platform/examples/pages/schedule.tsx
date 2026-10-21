import { useRef, useState } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { Card } from "../../../components/Card";
import { DatePicker } from "../../../components/DatePicker";
import { Stack } from "../../../components/Layout";
import { Heading, Text } from "../../../components/Text";
import { TopNavigation } from "../../../components/TopNavigation";
import {
  ScheduleDayPlanner, ScheduleItinerary, ScheduleResourceGrid, ScheduleSlotPicker,
  type ScheduleBookingData, type ScheduleCardData, type ScheduleResourceData, type ScheduleSlotData, type ScheduleStopData,
} from "../../../components/Schedule";
import { PlatformPhone } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { people } from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./schedule.css";

export const page: PlatformPage = "schedule";

// ——— Data: Đìzai Studio on Wednesday 30 September 2026, 13:15 ———————————————————————————————————————————————————

const NOW = "2026-09-30T13:15";
const TODAY = "2026-09-30";

const resources: ScheduleResourceData[] = [
  { id: "alex", name: "Alex Duong", meta: "Design Lead", avatarSrc: people.alex.photo },
  { id: "maya", name: "Maya Chen", meta: "Product lead" },
  { id: "linh", name: "Linh Tran", meta: "Engineer" },
  { id: "lotus", name: "Room 2 · Lotus", shortName: "Lotus", meta: "8 seats", type: "room" },
  { id: "bamboo", name: "Room 3 · Bamboo", shortName: "Bamboo", meta: "4 seats", type: "room" },
];

const bookings: ScheduleBookingData[] = [
  { id: "q4-alex", resourceId: "alex", title: "Q4 planning", start: "2026-09-30T10:30", end: "2026-09-30T12:00", color: "blue" },
  { id: "1-1-alex", resourceId: "alex", title: "1:1 Maya", start: "2026-09-30T14:00", end: "2026-09-30T15:00", color: "teal" },
  { id: "q4-maya", resourceId: "maya", title: "Q4 planning", start: "2026-09-30T10:30", end: "2026-09-30T12:00", color: "blue" },
  { id: "1-1-maya", resourceId: "maya", title: "1:1 Alex", start: "2026-09-30T14:00", end: "2026-09-30T15:00", color: "teal" },
  { id: "hiring", resourceId: "maya", title: "Hiring panel", start: "2026-09-30T15:00", end: "2026-09-30T17:00", color: "pink" },
  { id: "leave", resourceId: "linh", title: "Annual leave", start: "2026-09-30T09:00", end: "2026-09-30T12:00", color: "orange", time: "Morning" },
  { id: "client", resourceId: "linh", title: "Client call", start: "2026-09-30T13:00", end: "2026-09-30T14:00", color: "blue" },
  { id: "q4-room", resourceId: "lotus", title: "Q4 planning", start: "2026-09-30T10:30", end: "2026-09-30T12:00", color: "blue" },
  { id: "critique", resourceId: "lotus", title: "Design critique", start: "2026-09-30T16:00", end: "2026-09-30T17:00", color: "violet" },
  { id: "demo", resourceId: "bamboo", title: "Sprint demo", start: "2026-09-30T15:00", end: "2026-09-30T16:00", color: "teal" },
];

const weekBookings: ScheduleBookingData[] = [
  { id: "sprint", resourceId: "alex", title: "Q4 sprint", start: "2026-09-28", end: "2026-10-01" },
  { id: "workshop", resourceId: "alex", title: "Client workshop", start: "2026-10-01", end: "2026-10-02", color: "blue" },
  { id: "hiring-week", resourceId: "maya", title: "Hiring week", start: "2026-09-28", end: "2026-09-30", color: "pink" },
  { id: "maya-leave", resourceId: "maya", title: "Annual leave", start: "2026-10-01", end: "2026-10-03", color: "orange" },
  { id: "on-call", resourceId: "linh", title: "On call", start: "2026-09-28", end: "2026-09-30", color: "violet" },
  { id: "frontend", resourceId: "linh", title: "Frontend", start: "2026-09-30", end: "2026-10-03", color: "teal" },
  { id: "lotus-q4", resourceId: "lotus", title: "Q4 planning", start: "2026-09-30", end: "2026-10-01", color: "blue" },
  { id: "lotus-workshop", resourceId: "lotus", title: "Client workshop", start: "2026-10-01", end: "2026-10-02", color: "blue" },
  { id: "bamboo-demo", resourceId: "bamboo", title: "Sprint demo", start: "2026-10-02", end: "2026-10-03", color: "teal" },
];

const stops: ScheduleStopData[] = [
  { id: "keynote", title: "Opening keynote", start: "2026-09-30T09:00", end: "2026-09-30T09:45", meta: "Hall A · Alex Duong" },
  { id: "scale", title: "Design systems at scale", start: "2026-09-30T10:00", end: "2026-09-30T11:00", meta: "Hall A · Maya Chen" },
  { id: "panel", title: "Panel: AI and design tools", start: "2026-09-30T11:15", end: "2026-09-30T12:00", meta: "Hall A" },
  { id: "lunch", title: "Lunch", start: "2026-09-30T12:00", end: "2026-09-30T13:00", meta: "Garden" },
  { id: "workshop", title: "Workshop: prototyping in Zen Studio", start: "2026-09-30T13:00", end: "2026-09-30T14:30", meta: "Room 2 · Linh Tran" },
  { id: "closing", title: "Closing talk", start: "2026-09-30T15:00", end: "2026-09-30T15:45", meta: "Hall A · Alex Duong" },
];

const hours = ["09:00", "09:30", "10:00", "10:30", "11:00", "13:00", "14:00", "15:00", "16:00"];
// Taken, or already past on today (13:15).
const taken = new Set(["2026-09-30T13:00", "2026-09-30T09:00", "2026-09-30T09:30", "2026-09-30T10:00", "2026-09-30T10:30", "2026-09-30T11:00", "2026-10-02T09:00", "2026-10-02T14:00", "2026-10-05T10:00"]);
const slots: ScheduleSlotData[] = ["2026-09-30", "2026-10-01", "2026-10-02", "2026-10-05", "2026-10-06"]
  .flatMap((day) => hours.map((hour) => `${day}T${hour}`))
  .map((id) => ({ id, start: id, disabled: taken.has(id) }));

const cards: ScheduleCardData[] = [
  { id: "wireframe", title: "Wireframing and brainstorming", start: "2026-09-30T09:00", end: "2026-09-30T10:00", color: "violet", status: "Done", attendees: [{ alt: "Alex Duong", src: people.alex.photo }, { alt: "Maya Chen" }, { alt: "Linh Tran" }] },
  { id: "ds", title: "Design system planning", start: "2026-09-30T11:00", end: "2026-09-30T12:30", color: "blue", status: "Done", attendees: [{ alt: "Maya Chen" }, { alt: "Bao Nguyen" }] },
  { id: "explore", title: "Exploration phase", start: "2026-09-30T13:00", end: "2026-09-30T16:00", status: "In progress", note: "Review the new high-fidelity screens with the team before the client call.", attendees: [{ alt: "Alex Duong", src: people.alex.photo }, { alt: "Chi Tran" }] },
  { id: "style", title: "Style finalisation", start: "2026-09-30T16:30", end: "2026-09-30T17:30", color: "teal", status: "Upcoming" },
  { id: "focus", title: "Focus time", start: "2026-10-01T09:00", end: "2026-10-01T11:00", color: "neutral", status: "Upcoming" },
];

// ——— Examples ————————————————————————————————————————————————————————————————————————————————————————————

/** Main use: who is where today; pressing a booking opens its details. */
function TeamTodayExample() {
  const [open, setOpen] = useState<string | null>("hiring");
  const booking = bookings.find((item) => item.id === open);
  return (
    <Stack gap="md">
      <ScheduleResourceGrid resources={resources} bookings={bookings} date={TODAY} now={NOW} selectedBookingId={open}
        onBookingClick={(picked) => setOpen(picked.id === open ? null : picked.id)} />
      <Text tone="light" aria-live="polite">{booking ? `${booking.title} · ${resources.find((item) => item.id === booking.resourceId)?.name}` : "Select a booking to see who it belongs to."}</Text>
    </Stack>
  );
}

function SlotBookingExample() {
  const [slot, setSlot] = useState<string | null>(null);
  const time = slot ? new Date(slot).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : null;
  return (
    <Card theme="flat">
      <Stack gap="md">
        <Heading level={3} textStyle="Heading/Subheading">Book a design review</Heading>
        <ScheduleSlotPicker slots={slots} today={TODAY} value={slot} onValueChange={setSlot} aria-label="Review times" />
        <Text tone="light" aria-live="polite">{time ? `Booked: ${time}` : "Taken times are struck through and stay in place."}</Text>
      </Stack>
    </Card>
  );
}

function PhoneBookingExample() {
  const screenRef = useRef<HTMLDivElement>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const time = slot ? slot.slice(11) : null;
  return (
    <PlatformPhone label="Book a review" screenRef={screenRef} header={<TopNavigation type="compact-alt" title="Book a review" scrollRef={screenRef} />}
      footer={<ActionBar position="static" primaryAction={{ label: time ? `Book ${time}` : "Pick a time", disabled: !slot, onClick: () => setSlot(null) }} />}>
      <Stack gap="lg" padding="md">
        <ScheduleSlotPicker device="mobile" slots={slots} today={TODAY} value={slot} onValueChange={setSlot} />
      </Stack>
    </PlatformPhone>
  );
}

/** The month selector opens a calendar to jump to any day; a card's ⋮ names the card its actions are for. */
function MyDayExample() {
  const [day, setDay] = useState<Date>(new Date(2026, 8, 30));
  const [picking, setPicking] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  return (
    <Stack gap="md" className="px-schedule-planner">
      <ScheduleDayPlanner events={cards} value={day} onValueChange={setDay} now={NOW}
        onMonthClick={() => setPicking((open) => !open)} onCardMenu={(card) => setMenu(card.title)} />
      {picking ? <DatePicker aria-label="Choose a day" today={new Date(2026, 8, 30)} value={day} onValueChange={(picked) => { if (picked) setDay(picked); setPicking(false); }} /> : null}
      <Text tone="light" aria-live="polite">{menu ? `Actions for ${menu}` : "Each card's ⋮ opens its actions."}</Text>
    </Stack>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Team today",
    description: "People and rooms beside the day's hours; bookings sit at their times and the now line crosses the tracks. Pressing a booking selects it (Solid) and names its owner.",
    wide: true,
    render: () => <TeamTodayExample />,
    code: `<ScheduleResourceGrid resources={resources} bookings={bookings} date="2026-09-30"
  selectedBookingId={open} onBookingClick={(booking) => setOpen(booking.id)} />`,
  },
  {
    title: "Team week",
    description: "The Days scale shows leave and sprints across a week, today in Accent. A bar that starts before Monday scrolls in; it is never squeezed to the edge.",
    wide: true,
    render: () => <ScheduleResourceGrid scale="days" resources={resources} bookings={weekBookings} date={TODAY} now={NOW} />,
    code: `<ScheduleResourceGrid scale="days" resources={resources} bookings={leaveAndSprints} date="2026-09-30" />`,
  },
  {
    title: "Event programme",
    description: "Stops that ended are Past, the running one is Now (announced as the current step), the rest Upcoming. The last stop has no connector.",
    render: () => <ScheduleItinerary title="Wed, Sep 30 · Design Day" stops={stops} now={NOW} />,
    code: `<ScheduleItinerary title="Wed, Sep 30 · Design Day" stops={stops} />`,
  },
  {
    title: "Book a time",
    description: "One radio group across five days: the arrow keys move between times, taken ones are disabled and struck through. The confirm action stays in the page or sheet footer.",
    wide: true,
    render: () => <SlotBookingExample />,
    code: `<ScheduleSlotPicker slots={slots} value={slot} onValueChange={setSlot} aria-label="Review times" />`,
  },
  {
    title: "Book on a phone",
    description: "A week strip picks the day; its times group into Morning and Afternoon, three to a row with 44px targets, and the footer books the chosen one.",
    render: () => <PhoneBookingExample />,
    code: `<ScheduleSlotPicker device="mobile" slots={slots} value={slot} onValueChange={setSlot} />
// footer: <ActionBar primaryAction={{ label: \`Book \${time}\`, disabled: !slot, onClick: book }} />`,
  },
  {
    title: "My day",
    description: "The day planner places cards at their start time and grows the hour so long cards never overlap; the current hour is Now. Cards are bordered, so the planner reads on any canvas.",
    render: () => <MyDayExample />,
    code: `<ScheduleDayPlanner events={cards} defaultValue={today} onMonthClick={openMonthPicker} onCardMenu={(card, target) => openMenu(card, target)} />`,
  },
]);

