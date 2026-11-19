import { useState } from "react";
import { CalendarTimeGrid, Card, DescriptionList, Grid, Heading, Stack, Text, toDate, type CalendarEventData } from "@zen-ds/react";
import { calendarEvents, daysFromToday, TODAY } from "../../data";

const byId = (id: string | null) => calendarEvents.find((event) => event.id === id) ?? null;
const clock = (date: Date) => date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const timeOf = (event: CalendarEventData) => event.allDay ? "All day" : `${clock(toDate(event.start))} – ${clock(toDate(event.end ?? event.start))}`;

/** Week view: overlapping events share the column; pressing one opens its details beside the grid (State=Selected). */
export default function EventDetails() {
  const [selected, setSelected] = useState<string | null>("hiring");
  const event = byId(selected);
  return (
    // The details sit beside the grid on a desktop and under it on a tablet or phone.
    <Grid columns={{ tablet: 1, desktop: "minmax(0, 1fr) 280px" }} gap="md" align="start">
      <CalendarTimeGrid view="week" date={daysFromToday(0, 0, 0)} events={calendarEvents} now={TODAY} style={{ maxHeight: 560 }}
        selectedEventId={selected} onEventClick={(picked) => setSelected(picked.id === selected ? null : picked.id)} />
      <Card theme="default" aria-live="polite">
        {event ? (
          <Stack gap="sm">
            <Heading level={3} textStyle="Heading/Subheading">{event.title}</Heading>
            <DescriptionList layout="stacked" items={[
              { id: "when", term: "When", description: `${toDate(event.start).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · ${timeOf(event)}` },
              { id: "where", term: "Where", description: event.meta ?? "No place set" },
            ]} />
          </Stack>
        ) : (
          <Text tone="light">Select an event to see its details.</Text>
        )}
      </Card>
    </Grid>
  );
}
