import { useState, type RefObject } from "react";
import {
  AppShell, CalendarAgenda, CalendarMonth, CalendarTimeGrid, CalendarToolbar, CalendarWeekStrip, Stack, TopNavigation, shiftPeriod, type CalendarView,
} from "@zen-ds/react";
import { calendarEvents, daysFromToday, TODAY } from "../../data";

// scrollRef: what scrolls the screen, so the bar draws its rule once content runs under it. "window" in your app.
/** A phone: the mobile Toolbar, the Week-Strip over the day's agenda, or the 3-Day grid. */
export default function PhoneCalendar({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const [view, setView] = useState<CalendarView>("month");
  const [date, setDate] = useState(daysFromToday(0, 0, 0));
  return (
    <AppShell topNavigation={<TopNavigation type="compact-alt" title="Calendar" scrollRef={scrollRef} />}>
      <Stack gap="lg">
        {/* Three views: in the Mobile typography and Comfortable density a fourth label ("Agenda") no longer fits a
            phone's width; the month lists the picked day's agenda under it. */}
        <CalendarToolbar device="mobile" date={date} today={TODAY} view={view} views={["month", "week", "day"]} onViewChange={setView}
          onToday={() => setDate(daysFromToday(0, 0, 0))} onPrevious={() => setDate(shiftPeriod(date, view === "week" ? "3-day" : view, -1))} onNext={() => setDate(shiftPeriod(date, view === "week" ? "3-day" : view, 1))} />
        {view === "month" ? (
          <>
            <CalendarMonth device="mobile" month={date} value={date} onValueChange={setDate} events={calendarEvents} today={TODAY} />
            <CalendarAgenda device="mobile" from={date} days={1} events={calendarEvents} today={TODAY} />
          </>
        ) : null}
        {view === "week" ? <CalendarTimeGrid device="mobile" view="3-day" date={date} events={calendarEvents} now={TODAY} /> : null}
        {view === "day" ? (
          <>
            <CalendarWeekStrip device="mobile" value={date} onValueChange={setDate} events={calendarEvents} today={TODAY} aria-label="Pick a day" />
            <CalendarTimeGrid device="mobile" view="day" date={date} events={calendarEvents} now={TODAY} />
          </>
        ) : null}
      </Stack>
    </AppShell>
  );
}
