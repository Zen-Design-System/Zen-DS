import { ScheduleItinerary, type ScheduleStopData } from "@zen-ds/react";

// Design Day on Wednesday 30 September 2026, at 13:15.
const NOW = "2026-09-30T13:15";

const stops: ScheduleStopData[] = [
  { id: "keynote", title: "Opening keynote", start: "2026-09-30T09:00", end: "2026-09-30T09:45", meta: "Hall A · Alex Duong" },
  { id: "scale", title: "Design systems at scale", start: "2026-09-30T10:00", end: "2026-09-30T11:00", meta: "Hall A · Maya Chen" },
  { id: "panel", title: "Panel: AI and design tools", start: "2026-09-30T11:15", end: "2026-09-30T12:00", meta: "Hall A" },
  { id: "lunch", title: "Lunch", start: "2026-09-30T12:00", end: "2026-09-30T13:00", meta: "Garden" },
  { id: "workshop", title: "Workshop: prototyping in Zen Studio", start: "2026-09-30T13:00", end: "2026-09-30T14:30", meta: "Room 2 · Linh Tran" },
  { id: "closing", title: "Closing talk", start: "2026-09-30T15:00", end: "2026-09-30T15:45", meta: "Hall A · Alex Duong" },
];

export default function EventProgramme() {
  return <ScheduleItinerary title="Wed, Sep 30 · Design Day" stops={stops} now={NOW} />;
}
