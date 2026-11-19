import { useRef, useState } from "react";
import {
  CalendarAgenda, CalendarMonth, CalendarTimeGrid, CalendarToolbar, Stack, shiftPeriod, useCalendarDevice, type CalendarView,
} from "@zen-ds/react";
import { calendarEvents, daysFromToday, TODAY } from "../../data";

/** The main use: the Toolbar moves the period and switches the view under it. */
export default function TeamCalendar() {
  const [view, setView] = useState<CalendarView>("month");
  const [date, setDate] = useState(daysFromToday(0, 0, 0));
  const rootRef = useRef<HTMLDivElement>(null);
  // On a phone the switch keeps three views: a fourth label no longer fits (see On a phone).
  const mobile = useCalendarDevice(undefined, rootRef) === "mobile";
  return (
    <Stack gap="md" ref={rootRef}>
      <CalendarToolbar date={date} today={TODAY} view={view} views={mobile ? ["month", "week", "day"] : undefined} onViewChange={setView}
        onToday={() => setDate(daysFromToday(0, 0, 0))} onPrevious={() => setDate(shiftPeriod(date, view, -1))} onNext={() => setDate(shiftPeriod(date, view, 1))} />
      {view === "month" ? <CalendarMonth month={date} value={date} onValueChange={setDate} events={calendarEvents} today={TODAY}
        onMoreClick={(picked) => { setDate(picked); setView("day"); }} /> : null}
      {view === "week" || view === "day" ? <CalendarTimeGrid view={view} date={date} events={calendarEvents} now={TODAY} /> : null}
      {view === "agenda" ? <CalendarAgenda from={date} events={calendarEvents} today={TODAY} /> : null}
    </Stack>
  );
}
