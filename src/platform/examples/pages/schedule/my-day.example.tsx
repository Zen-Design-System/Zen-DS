import { useState } from "react";
import { DatePicker, ScheduleDayPlanner, Stack, Text, type ScheduleCardData } from "@zen-ds/react";
import { people } from "../../data";

// Đìzai Studio on Wednesday 30 September 2026, 13:15.
const NOW = "2026-09-30T13:15";

const cards: ScheduleCardData[] = [
  { id: "wireframe", title: "Wireframing and brainstorming", start: "2026-09-30T09:00", end: "2026-09-30T10:00", color: "violet", status: "Done", attendees: [{ alt: "Alex Duong", src: people.alex.photo }, { alt: "Maya Chen" }, { alt: "Linh Tran" }] },
  { id: "ds", title: "Design system planning", start: "2026-09-30T11:00", end: "2026-09-30T12:30", color: "blue", status: "Done", attendees: [{ alt: "Maya Chen" }, { alt: "Bao Nguyen" }] },
  { id: "explore", title: "Exploration phase", start: "2026-09-30T13:00", end: "2026-09-30T16:00", status: "In progress", note: "Review the new high-fidelity screens with the team before the client call.", attendees: [{ alt: "Alex Duong", src: people.alex.photo }, { alt: "Chi Tran" }] },
  { id: "style", title: "Style finalisation", start: "2026-09-30T16:30", end: "2026-09-30T17:30", color: "teal", status: "Upcoming" },
  { id: "focus", title: "Focus time", start: "2026-10-01T09:00", end: "2026-10-01T11:00", color: "neutral", status: "Upcoming" },
];

/** The month selector opens a calendar to jump to any day; a card's ⋮ names the card its actions are for. */
export default function MyDay() {
  const [day, setDay] = useState<Date>(new Date(2026, 8, 30));
  const [picking, setPicking] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  return (
    <Stack gap="md" maxWidth={420}>
      <ScheduleDayPlanner events={cards} value={day} onValueChange={setDay} now={NOW}
        onMonthClick={() => setPicking((open) => !open)} onCardMenu={(card) => setMenu(card.title)} />
      {picking ? <DatePicker aria-label="Choose a day" today={new Date(2026, 8, 30)} value={day} onValueChange={(picked) => { if (picked) setDay(picked); setPicking(false); }} /> : null}
      <Text tone="light" aria-live="polite">{menu ? `Actions for ${menu}` : "Each card's ⋮ opens its actions."}</Text>
    </Stack>
  );
}
