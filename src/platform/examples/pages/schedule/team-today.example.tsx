import { useState } from "react";
import { ScheduleResourceGrid, Stack, Text, type ScheduleBookingData } from "@zen-ds/react";
import { scheduleResources } from "../../data";

// Đìzai Studio on Wednesday 30 September 2026, 13:15.
const NOW = "2026-09-30T13:15";
const TODAY = "2026-09-30";

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

/** Who is where today; pressing a booking selects it and names its owner. */
export default function TeamToday() {
  const [open, setOpen] = useState<string | null>("hiring");
  const booking = bookings.find((item) => item.id === open);
  return (
    <Stack gap="md">
      <ScheduleResourceGrid resources={scheduleResources} bookings={bookings} date={TODAY} now={NOW} selectedBookingId={open}
        onBookingClick={(picked) => setOpen(picked.id === open ? null : picked.id)} />
      <Text tone="light" aria-live="polite">{booking ? `${booking.title} · ${scheduleResources.find((item) => item.id === booking.resourceId)?.name}` : "Select a booking to see who it belongs to."}</Text>
    </Stack>
  );
}
