import { useContext, useRef, useState } from "react";
import {
  CalendarAgenda, CalendarMonth, CalendarTimeGrid, CalendarToolbar, CalendarWeekStrip, shiftPeriod, useCalendarDevice,
  type CalendarDevice, type CalendarEventData, type CalendarView,
} from "../components/Calendar";
import { Stack } from "../components/Layout";
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
