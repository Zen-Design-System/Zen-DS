import { ScheduleResourceGrid, type ScheduleBookingData } from "@zen-ds/react";
import { scheduleResources } from "../../data";

// Đìzai Studio on Wednesday 30 September 2026, 13:15.
const NOW = "2026-09-30T13:15";
const TODAY = "2026-09-30";

// Leave and sprints across the week, by day.
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

export default function TeamWeek() {
  return <ScheduleResourceGrid scale="days" resources={scheduleResources} bookings={weekBookings} date={TODAY} now={NOW} />;
}
