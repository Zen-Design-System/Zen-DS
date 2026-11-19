import { useState } from "react";
import { CalendarAgenda, EmptyState, type CalendarEventData } from "@zen-ds/react";
import { calendarEvents, daysFromToday, TODAY } from "../../data";

/** An agenda range with nothing in it: the Empty-State says so and offers the next step, which fills it. */
export default function EmptyWeek() {
  const [added, setAdded] = useState<CalendarEventData[]>([]);
  const create = () => setAdded([{ id: "new-event", title: "New event", start: daysFromToday(21, 10, 0), end: daysFromToday(21, 11, 0), meta: "Add a place" }]);
  return (
    <CalendarAgenda from={daysFromToday(20, 0, 0)} days={7} events={[...calendarEvents, ...added]} today={TODAY}
      empty={<EmptyState size="sm" title="No events next week" icon="icon-calendar-line" primaryAction={{ label: "New event", onClick: create }}>
        Nothing is planned for Oct 20 – 26 yet.
      </EmptyState>} />
  );
}
