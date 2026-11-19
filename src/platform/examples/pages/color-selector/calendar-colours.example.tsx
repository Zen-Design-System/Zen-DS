import { useId, useState } from "react";
import { ColorSelector, Dialog, DockIcon, Heading, List, ListBox, ListItem, Stack, useToast, type ColorOption, type DockIconTheme } from "@zen-ds/react";

/* Swatches are Support/Solid tokens, so they follow light and dark mode; the value maps back to a hue id. Ordered by hue. */
type Hue = "red" | "orange" | "yellow" | "green" | "teal" | "cyan" | "blue" | "indigo" | "purple" | "pink";
const hueNames: Record<Hue, string> = { red: "Red", orange: "Orange", yellow: "Yellow", green: "Green", teal: "Teal", cyan: "Cyan", blue: "Blue", indigo: "Indigo", purple: "Purple", pink: "Pink" };
const swatch = (hue: Hue): ColorOption => ({ value: `var(--zen-color-background-support-${hue}-solid)`, label: hueNames[hue], contrast: hue === "yellow" ? "dark" : undefined });
const hueOf = (value: string) => (Object.keys(hueNames) as Hue[]).find((hue) => swatch(hue).value === value)!;
// Calendars get eight hues: enough to tell them apart, few enough for one row.
const calendarHues: Hue[] = ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink"];

type Calendar = { id: string; name: string; caption: string; hue: Hue };
const startCalendars: Calendar[] = [
  { id: "reviews", name: "Design reviews", caption: "Tuesdays and Thursdays", hue: "purple" },
  { id: "clients", name: "Client meetings", caption: "Shared with Client Services", hue: "blue" },
  { id: "leave", name: "Leave and holidays", caption: "Everyone at the studio", hue: "green" },
  { id: "deadlines", name: "Deadlines", caption: "From every active project", hue: "red" },
];

/** A row opens a Dialog with the swatches. */
export default function CalendarColours() {
  const { toast } = useToast();
  const titleId = useId();
  const [calendars, setCalendars] = useState(startCalendars);
  const [editing, setEditing] = useState<Calendar | null>(null);
  const [draft, setDraft] = useState<Hue>("purple");
  const open = (calendar: Calendar) => { setEditing(calendar); setDraft(calendar.hue); };
  const save = () => {
    if (!editing) return;
    setCalendars(calendars.map((calendar) => calendar.id === editing.id ? { ...calendar, hue: draft } : calendar));
    toast({ type: "positive", title: `${editing.name} recoloured` });
    setEditing(null);
  };
  return (
    <>
    {/* A list on the stage is a ListBox (Surface, no border): the title in its Header-Slot, the rows in its Body-Slot.
        The rows are interactive with no padding of their own: the slots' padding (24px desktop, 20px on a phone) puts
        their text level with the heading, and their fill hangs 12px into it. */}
    <Stack><ListBox width="fill" maxWidth={440} alignSelf="center" as="section" aria-labelledby={titleId}
      header={<Heading level={4} id={titleId} textStyle="Heading/Subheading">Team calendars</Heading>}>
      <List aria-labelledby={titleId}>
        {calendars.map((calendar) => (
          // The colour is named in words in the caption too, so the title keeps the width and never truncates.
          <ListItem key={calendar.id} title={calendar.name} caption={`${calendar.caption} · ${hueNames[calendar.hue]}`} onClick={() => open(calendar)}
            leading={<DockIcon icon="icon-calendar-line" theme={calendar.hue as DockIconTheme} background="solid" />} />
        ))}
      </List>
    </ListBox></Stack>
      <Dialog open={Boolean(editing)} onOpenChange={(next) => { if (!next) setEditing(null); }} icon={false}
        title={`${editing?.name ?? ""} colour`} description="Events in this calendar take this colour for everyone at the studio."
        primaryAction={{ label: "Save colour", onClick: save }} secondaryAction={{ label: "Cancel" }}>
        <Stack gap="md">
          <ColorSelector aria-label={`${editing?.name ?? "Calendar"} colour`} colors={calendarHues.map(swatch)} value={swatch(draft).value} onValueChange={(value) => setDraft(hueOf(value))} />
          {/* The preview is an event as the calendar will draw it: a List row with no side padding of its own, so its text
              lines up with the swatches. */}
          <List aria-label="Preview">
            <ListItem title="Critique: points history" caption="Tuesday at 2:00 pm · Room Sông Hồng"
              leading={<DockIcon icon="icon-calendar-line" theme={draft as DockIconTheme} background="solid" />} />
          </List>
        </Stack>
      </Dialog>
    </>
  );
}
