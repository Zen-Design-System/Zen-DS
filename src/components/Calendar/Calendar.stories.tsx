import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarAgenda } from "./CalendarAgenda";
import { CalendarMonth } from "./CalendarMonth";
import { CalendarTimeGrid } from "./CalendarTimeGrid";
import { CalendarToolbar } from "./CalendarToolbar";
import { CalendarWeekStrip } from "./CalendarWeekStrip";
import { shiftPeriod, type CalendarEventData, type CalendarView } from "./calendarDates";

const today = new Date(2026, 8, 30);
const now = new Date(2026, 8, 30, 13, 15);
const at = (day: number, hour: number, minute = 0) => new Date(2026, 8, day, hour, minute);
const events: CalendarEventData[] = [
  { id: "standup", title: "Daily standup", start: at(30, 9), end: at(30, 9, 30), meta: "Zoom" },
  { id: "q4", title: "Q4 planning", start: at(30, 10, 30), end: at(30, 12), color: "blue", meta: "Room 2 · Lotus" },
  { id: "maya", title: "1:1 Maya Chen", start: at(30, 14), end: at(30, 14, 45), color: "teal", meta: "Google Meet" },
  { id: "review", title: "Design review", start: at(29, 11), end: at(29, 12), color: "violet" },
  { id: "hiring", title: "Hiring panel", start: at(29, 14), end: at(29, 15, 30), color: "pink" },
  { id: "kickoff", title: "Q4 kickoff", start: new Date(2026, 9, 1), allDay: true },
];

const meta = {
  title: "Components/Calendar",
  component: CalendarMonth,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { month: today, today, events, device: "desktop" },
  argTypes: { device: { control: "inline-radio", options: ["desktop", "mobile"] } },
} satisfies Meta<typeof CalendarMonth>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma Calendar/Month: Day-Cells with event chips (desktop), date-picker days with dots (mobile). */
export const Month: Story = {};

/** Calendar/Toolbar over the view it switches. */
export const WithToolbar: Story = {
  render: () => {
    const [view, setView] = useState<CalendarView>("week");
    const [date, setDate] = useState(today);
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <CalendarToolbar date={date} view={view} onViewChange={setView} onToday={() => setDate(today)} onPrevious={() => setDate(shiftPeriod(date, view, -1))} onNext={() => setDate(shiftPeriod(date, view, 1))} />
        {view === "month" ? <CalendarMonth month={date} today={today} events={events} /> : view === "agenda" ? <CalendarAgenda from={date} today={today} events={events} /> : <CalendarTimeGrid view={view === "day" ? "day" : "week"} date={date} now={now} events={events} style={{ maxHeight: 560 }} />}
      </div>
    );
  },
};

/** Figma Calendar/Time-Grid Mobile View=3-Day under a Week-Strip. */
export const Phone: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16, width: 358 }}>
      <CalendarWeekStrip device="mobile" defaultValue={today} today={today} events={events} aria-label="Pick a day" />
      <CalendarTimeGrid device="mobile" view="3-day" date={today} now={now} events={events} />
    </div>
  ),
};

/** Figma Calendar/Agenda Device=Desktop. */
export const Agenda: Story = { render: () => <CalendarAgenda from={new Date(2026, 8, 29)} days={3} today={today} events={events} /> };
