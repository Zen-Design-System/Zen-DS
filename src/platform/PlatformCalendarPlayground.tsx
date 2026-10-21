import { useContext, useRef, useState } from "react";
import {
  CalendarAgenda, CalendarMonth, CalendarTimeGrid, CalendarToolbar, CalendarWeekStrip, shiftPeriod, useCalendarDevice,
  type CalendarDevice, type CalendarEventData, type CalendarView,
} from "../components/Calendar";
import { Stack } from "../components/Layout";
import { ScheduleDayPlanner, ScheduleItinerary, ScheduleResourceGrid, ScheduleSlotPicker } from "../components/Schedule";
import { TimelineActivity, TimelineGantt, TimelineMilestones } from "../components/Timeline";
import { PlatformCode } from "./PlatformCode";
import { PlatformTypographyContext } from "./PlatformTemplate";
import { ComponentPreview, PlaygroundControls, PlaygroundFilterChip } from "./appLayer/playgroundParts";

/* The Calendar page playground: Calendar/Toolbar over the view it switches (Month, Time-Grid Week / Day, Agenda), on
   desktop or mobile. Today is fixed (Wed 30 Sep 2026, 13:15) so the preview matches the Figma page. */

const TODAY = new Date(2026, 8, 30, 13, 15);
const at = (offset: number, hour: number, minute = 0) => new Date(2026, 8, 30 + offset, hour, minute);
const EVENTS: CalendarEventData[] = [
  { id: "standup", title: "Daily standup", start: at(0, 9), end: at(0, 9, 30), meta: "Zoom" },
  { id: "q4", title: "Q4 planning", start: at(0, 10, 30), end: at(0, 12), color: "blue", meta: "Room 2 · Lotus" },
  { id: "lunch", title: "Lunch · Linh Tran", start: at(0, 12), end: at(0, 13), color: "green" },
  { id: "maya", title: "1:1 Maya Chen", start: at(0, 14), end: at(0, 14, 45), color: "teal", meta: "Google Meet" },
  { id: "critique", title: "Design critique", start: at(0, 16), end: at(0, 17), color: "violet" },
  { id: "kickoff", title: "Q4 kickoff", start: at(1, 0), allDay: true, meta: "Whole studio" },
  { id: "lotus", title: "Client call · Lotus", start: at(1, 13), end: at(1, 14), color: "blue", meta: "Zoom" },
  { id: "demo", title: "Sprint demo", start: at(2, 15), end: at(2, 16), color: "teal", meta: "Room 3 · Bamboo" },
  { id: "review", title: "Design review", start: at(-1, 11), end: at(-1, 12), color: "violet" },
  { id: "hiring", title: "Hiring panel", start: at(-1, 14), end: at(-1, 15, 30), color: "pink" },
  { id: "planning", title: "Weekly planning", start: at(-2, 9), end: at(-2, 10) },
  { id: "retro", title: "Sprint retro", start: at(-7, 16), end: at(-7, 17), color: "teal" },
  { id: "payroll", title: "Payroll run", start: at(-9, 9), end: at(-9, 9, 30), color: "orange" },
];

const VIEWS: CalendarView[] = ["month", "week", "day", "agenda"];

export function CalendarPlayground() {
  const previewTypography = useContext(PlatformTypographyContext);
  const [view, setView] = useState<CalendarView>("month");
  const [deviceChoice, setDeviceChoice] = useState<string | undefined>(undefined);
  // Unset: the views follow the breakpoint (desktop here, mobile in a phone-width preview).
  const device = deviceChoice as CalendarDevice | undefined;
  const previewRef = useRef<HTMLDivElement>(null);
  const resolved = useCalendarDevice(device, previewRef);
  const [date, setDate] = useState(new Date(2026, 8, 30));
  const mobile = resolved === "mobile";
  // On a phone Week is the 3-Day grid, and Previous / Next move three days.
  const step = mobile && view === "week" ? "3-day" : view;
  return (
    <ComponentPreview className="platform-example-panel platform-example-panel--stack">
      <h2 className="platform-main-component__title">Calendar</h2>
      <PlaygroundControls aria-label="Calendar playground controls">
        <PlaygroundFilterChip label="View" value={view} onChange={(value) => setView((String(value) || "month") as CalendarView)} options={VIEWS.map((id) => ({ id, label: id === "agenda" ? "Agenda" : id[0].toUpperCase() + id.slice(1) }))} />
        <PlaygroundFilterChip label="Device" value={deviceChoice} onChange={(value) => setDeviceChoice(String(value) || undefined)} options={[{ id: "desktop", label: "Desktop" }, { id: "mobile", label: "Mobile" }]} />
      </PlaygroundControls>
      <div ref={previewRef} data-typography={previewTypography} className="platform-example-row platform-calendar-preview" data-device={resolved}>
        <Stack gap="md" width="fill">
          <CalendarToolbar device={device} date={date} today={TODAY} view={view} onViewChange={setView}
            onToday={() => setDate(new Date(2026, 8, 30))} onPrevious={() => setDate(shiftPeriod(date, step, -1))} onNext={() => setDate(shiftPeriod(date, step, 1))} />
          {view === "month" ? <CalendarMonth device={device} month={date} value={date} onValueChange={setDate} events={EVENTS} today={TODAY}
            onMoreClick={(day) => { setDate(day); setView("day"); }} /> : null}
          {view === "month" && mobile ? <CalendarAgenda device="mobile" from={date} days={1} events={EVENTS} today={TODAY} /> : null}
          {view === "day" && mobile ? <CalendarWeekStrip device="mobile" value={date} onValueChange={setDate} events={EVENTS} today={TODAY} aria-label="Pick a day" /> : null}
          {view === "week" || view === "day" ? <CalendarTimeGrid device={device} view={view} date={date} events={EVENTS} now={TODAY} /> : null}
          {view === "agenda" ? <CalendarAgenda device={device} from={date} events={EVENTS} today={TODAY} /> : null}
        </Stack>
      </div>
      <PlatformCode code={`import { CalendarToolbar, CalendarMonth, CalendarTimeGrid, CalendarAgenda, shiftPeriod } from "@zen-ds/react";

const [view, setView] = useState<CalendarView>("${view}");
const [date, setDate] = useState(today);

<CalendarToolbar${mobile ? ` device="mobile"` : ""} date={date} view={view} onViewChange={setView}
  onToday={() => setDate(today)} onPrevious={() => setDate(shiftPeriod(date, view, -1))} onNext={() => setDate(shiftPeriod(date, view, 1))} />
${view === "month" ? `<CalendarMonth${mobile ? ` device="mobile"` : ""} month={date} value={date} onValueChange={setDate} events={events} />`
  : view === "agenda" ? `<CalendarAgenda${mobile ? ` device="mobile"` : ""} from={date} events={events} />`
  : `<CalendarTimeGrid${mobile ? ` device="mobile"` : ""} view="${view}" date={date} events={events} />`}
// events: { id, title, start, end?, allDay?, color?: "brand" | "blue" | "violet" | "teal" | "green" | "orange" | "pink", meta?, attendees? }[]`} />
    </ComponentPreview>
  );
}

/* The Schedule page playground: one of the four Schedule views, on desktop or mobile (the same demo day). */

const RESOURCES = [
  { id: "alex", name: "Alex Duong", meta: "Design Lead" },
  { id: "maya", name: "Maya Chen", meta: "Product lead" },
  { id: "linh", name: "Linh Tran", meta: "Engineer" },
  { id: "lotus", name: "Room 2 · Lotus", shortName: "Lotus", meta: "8 seats", kind: "room" as const },
];
const BOOKINGS = [
  { id: "q4", resourceId: "alex", title: "Q4 planning", start: "2026-09-30T10:30", end: "2026-09-30T12:00", color: "blue" as const },
  { id: "1-1", resourceId: "alex", title: "1:1 Maya", start: "2026-09-30T14:00", end: "2026-09-30T15:00", color: "teal" as const },
  { id: "hiring", resourceId: "maya", title: "Hiring panel", start: "2026-09-30T15:00", end: "2026-09-30T17:00", color: "pink" as const },
  { id: "leave", resourceId: "linh", title: "Annual leave", start: "2026-09-30T09:00", end: "2026-09-30T12:00", color: "orange" as const, time: "Morning" },
  { id: "critique", resourceId: "lotus", title: "Design critique", start: "2026-09-30T16:00", end: "2026-09-30T17:00", color: "violet" as const },
];
const STOPS = [
  { id: "keynote", title: "Opening keynote", start: "2026-09-30T09:00", end: "2026-09-30T09:45", meta: "Hall A · Alex Duong" },
  { id: "lunch", title: "Lunch", start: "2026-09-30T12:00", end: "2026-09-30T13:00", meta: "Garden" },
  { id: "workshop", title: "Workshop: prototyping in Zen Studio", start: "2026-09-30T13:00", end: "2026-09-30T14:30", meta: "Room 2 · Linh Tran" },
  { id: "closing", title: "Closing talk", start: "2026-09-30T15:00", end: "2026-09-30T15:45", meta: "Hall A" },
];
const SLOTS = ["2026-09-30", "2026-10-01", "2026-10-02", "2026-10-05", "2026-10-06"].flatMap((day) => ["09:00", "10:00", "11:00", "14:00", "15:00"].map((hour) => `${day}T${hour}`)).map((id, index) => ({ id, start: id, disabled: index % 4 === 1 }));
const CARDS = [
  { id: "wire", title: "Wireframing and brainstorming", start: "2026-09-30T09:00", end: "2026-09-30T10:00", color: "violet" as const, status: "Done" },
  { id: "explore", title: "Exploration phase", start: "2026-09-30T13:00", end: "2026-09-30T16:00", status: "In progress", note: "Review the new high-fidelity screens before the client call." },
  { id: "style", title: "Style finalisation", start: "2026-09-30T16:30", end: "2026-09-30T17:30", color: "teal" as const, status: "Upcoming" },
];
const SCHEDULE_VIEWS = [{ id: "resource-grid", label: "Resource grid" }, { id: "itinerary", label: "Itinerary" }, { id: "slot-picker", label: "Slot picker" }, { id: "day-planner", label: "Day planner" }];

export function SchedulePlayground() {
  const previewTypography = useContext(PlatformTypographyContext);
  const [view, setView] = useState<string>("resource-grid");
  const [deviceChoice, setDeviceChoice] = useState<string | undefined>(undefined);
  const [scaleChoice, setScaleChoice] = useState<string | undefined>(undefined);
  const [slot, setSlot] = useState<string | null>(null);
  const device = (deviceChoice ?? "desktop") as CalendarDevice;
  const scale = (scaleChoice ?? "hours") as "hours" | "days";
  const code = view === "resource-grid" ? `<ScheduleResourceGrid${device === "mobile" ? ` device="mobile"` : ""}${scale === "days" ? ` scale="days"` : ""} resources={resources} bookings={bookings} date="2026-09-30" />`
    : view === "itinerary" ? `<ScheduleItinerary title="Wed, Sep 30 · Design Day" stops={stops} />`
    : view === "slot-picker" ? `<ScheduleSlotPicker${device === "mobile" ? ` device="mobile"` : ""} slots={slots} value={slot} onValueChange={setSlot} aria-label="Review times" />`
    : `<ScheduleDayPlanner${device === "mobile" ? ` device="mobile"` : ""} events={cards} defaultValue="2026-09-30" />`;
  return (
    <ComponentPreview className="platform-example-panel platform-example-panel--stack">
      <h2 className="platform-main-component__title">Schedule</h2>
      <PlaygroundControls aria-label="Schedule playground controls">
        <PlaygroundFilterChip label="View" value={view} onChange={(value) => setView(String(value) || "resource-grid")} options={SCHEDULE_VIEWS} />
        <PlaygroundFilterChip label="Device" value={deviceChoice} onChange={(value) => setDeviceChoice(String(value) || undefined)} options={[{ id: "desktop", label: "Desktop" }, { id: "mobile", label: "Mobile" }]} />
        {view === "resource-grid" ? <PlaygroundFilterChip label="Scale" value={scaleChoice} onChange={(value) => setScaleChoice(String(value) || undefined)} options={[{ id: "hours", label: "Hours" }, { id: "days", label: "Days" }]} /> : null}
      </PlaygroundControls>
      <div data-typography={previewTypography} className="platform-example-row platform-calendar-preview" data-device={device}>
        {view === "resource-grid" ? <ScheduleResourceGrid device={device} scale={scale} resources={RESOURCES} bookings={scale === "days" ? BOOKINGS.map((item, index) => ({ ...item, start: `2026-09-${28 + (index % 3)}`, end: `2026-10-0${1 + (index % 2)}` })) : BOOKINGS} date="2026-09-30" now="2026-09-30T13:15" /> : null}
        {view === "itinerary" ? <ScheduleItinerary device={device} title="Wed, Sep 30 · Design Day" stops={STOPS} now="2026-09-30T13:15" /> : null}
        {view === "slot-picker" ? <ScheduleSlotPicker device={device} slots={SLOTS} today="2026-09-30" value={slot} onValueChange={setSlot} aria-label="Review times" /> : null}
        {view === "day-planner" ? <ScheduleDayPlanner device={device} events={CARDS} defaultValue="2026-09-30" now="2026-09-30T13:15" /> : null}
      </div>
      <PlatformCode code={`import { ScheduleResourceGrid, ScheduleItinerary, ScheduleSlotPicker, ScheduleDayPlanner } from "@zen-ds/react";

${code}`} />
    </ComponentPreview>
  );
}

/* The Timeline page playground: an Activity feed, the Milestones or the Gantt, on desktop or mobile. */

const ENTRIES = [
  { id: "approve", at: "2026-09-30T10:42", actor: "Maya Chen", title: "approved your leave request", description: "Annual leave · Oct 12 – Oct 16", marker: { type: "avatar" as const, avatarName: "Maya Chen", tone: "positive" as const } },
  { id: "comment", at: "2026-09-30T09:15", actor: "Linh Tran", title: "commented on Q4 roadmap", attachment: "Can we move the review to Thursday?", marker: { type: "icon" as const, tone: "accent" as const } },
  { id: "shared", at: "2026-09-29T17:30", actor: "Zen Studio", title: "shared the design file", description: "Shared with 12 people", marker: { type: "icon" as const, tone: "neutral" as const } },
  { id: "rejected", at: "2026-09-29T11:00", actor: "Finance", title: "rejected the invoice draft", marker: { type: "icon" as const, tone: "negative" as const } },
];
const MILESTONES = [
  { id: "kickoff", date: "2026-08-03", title: "Kickoff" },
  { id: "research", date: "2026-08-28", title: "Research wrap-up" },
  { id: "signoff", date: "2026-09-25", title: "Design sign-off" },
  { id: "beta", date: "2026-10-23", title: "Beta launch", description: "Invite 40 studio clients" },
  { id: "launch", date: "2026-11-16", title: "Public launch" },
];
const GROUPS = [
  { id: "design", name: "Design", tasks: [
    { id: "wire", name: "Wireframes", start: "2026-09-14", end: "2026-09-26", assignee: { alt: "Alex Duong" } },
    { id: "ui", name: "UI design", start: "2026-09-21", end: "2026-10-10", assignee: { alt: "Chi Tran" } },
    { id: "signoff", name: "Design sign-off", start: "2026-10-09", kind: "milestone" as const },
  ] },
  { id: "build", name: "Build", tasks: [
    { id: "fe", name: "Frontend", start: "2026-09-28", end: "2026-10-17", color: "teal" as const, assignee: { alt: "Linh Tran" } },
    { id: "qa", name: "QA & fixes", start: "2026-10-12", end: "2026-10-24", color: "orange" as const, assignee: { alt: "Minh Vo" } },
  ] },
];
const TIMELINE_VIEWS = [{ id: "activity", label: "Activity" }, { id: "milestones", label: "Milestones" }, { id: "gantt", label: "Gantt" }];

export function TimelinePlayground() {
  const previewTypography = useContext(PlatformTypographyContext);
  const [view, setView] = useState<string>("activity");
  const [deviceChoice, setDeviceChoice] = useState<string | undefined>(undefined);
  const device = deviceChoice as CalendarDevice | undefined;
  const code = view === "activity" ? `<TimelineActivity entries={entries} />` : view === "milestones" ? `<TimelineMilestones milestones={milestones} />` : `<TimelineGantt groups={groups} aria-label="Lotus banking redesign" />`;
  return (
    <ComponentPreview className="platform-example-panel platform-example-panel--stack">
      <h2 className="platform-main-component__title">Timeline</h2>
      <PlaygroundControls aria-label="Timeline playground controls">
        <PlaygroundFilterChip label="View" value={view} onChange={(value) => setView(String(value) || "activity")} options={TIMELINE_VIEWS} />
        <PlaygroundFilterChip label="Device" value={deviceChoice} onChange={(value) => setDeviceChoice(String(value) || undefined)} options={[{ id: "desktop", label: "Desktop" }, { id: "mobile", label: "Mobile" }]} />
      </PlaygroundControls>
      <div data-typography={previewTypography} className="platform-example-row platform-calendar-preview" data-device={device}>
        {view === "activity" ? <TimelineActivity device={device} entries={ENTRIES} today="2026-09-30" /> : null}
        {view === "milestones" ? <TimelineMilestones device={device} milestones={MILESTONES} today="2026-09-30" /> : null}
        {view === "gantt" ? <TimelineGantt device={device} groups={GROUPS} start="2026-08-31" today="2026-09-30" aria-label="Lotus banking redesign" /> : null}
      </div>
      <PlatformCode code={`import { TimelineActivity, TimelineMilestones, TimelineGantt } from "@zen-ds/react";

${code}`} />
    </ComponentPreview>
  );
}
