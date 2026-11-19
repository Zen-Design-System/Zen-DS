import { useState } from "react";
import { CalendarMonth, Stack, Text } from "@zen-ds/react";
import { calendarEvents, daysFromToday, TODAY } from "../../data";

/** Keyboard: one day of the month is in the tab order; the arrow keys move a day or a week. */
export default function KeyboardMonth() {
  const [picked, setPicked] = useState<Date | null>(null);
  return (
    <Stack gap="sm">
      <CalendarMonth month={daysFromToday(0, 0, 0)} value={picked} onValueChange={setPicked} events={calendarEvents} today={TODAY} aria-label="September 2026, team calendar" />
      <Text tone="light" aria-live="polite">{picked ? `Selected ${picked.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}` : "Tab to the month, then use the arrow keys."}</Text>
    </Stack>
  );
}
