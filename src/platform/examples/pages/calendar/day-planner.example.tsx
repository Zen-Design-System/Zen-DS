import { useState } from "react";
import { CalendarAgenda, CalendarWeekStrip, Card, Heading, Stack } from "@zen-ds/react";
import { calendarEvents, daysFromToday, TODAY } from "../../data";

/** The day planner header: Week-Strip tiles pick the day, the agenda lists it. */
export default function DayPlanner() {
  const [picked, setPicked] = useState(daysFromToday(0, 0, 0));
  return (
    <Card theme="default" maxWidth={420}>
      <Stack gap="md">
        <Heading level={3} textStyle="Heading/Subheading">My week</Heading>
        <CalendarWeekStrip variant="tile" device="desktop" value={picked} onValueChange={setPicked} events={calendarEvents} today={TODAY} aria-label="Pick a day" />
        <CalendarAgenda device="mobile" from={picked} days={1} events={calendarEvents} today={TODAY} />
      </Stack>
    </Card>
  );
}
