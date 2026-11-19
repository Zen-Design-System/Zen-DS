import { useId, useState, type RefObject } from "react";
import { ActionBar, AppShell, BottomSheet, DockIcon, GaugeChart, Heading, InputField, List, ListItem, SelectField, Stack, Text, TopNavigation, useFormState, useToast } from "@zen-ds/react";
import { hoursThisWeek, projectById } from "../../data";

/** "18 h" — hours read in full. */
// A no-break space keeps the unit with its number when a figure wraps.
const hours = (value: number) => `${value.toLocaleString("en-US")} h`;

/** Alex's 40-hour week. */
const weekHours = 40;

const logProjects = ["lumen-banking", "zen-ds", "phin-loyalty", "saola-brand"].map((id) => ({ value: id, label: projectById(id).name }));
const logHours = ["1", "2", "3", "4"].map((value) => ({ value, label: hours(Number(value)) }));

/**
 * A screen pushed from Hours: Back and the compact bar, the week's one action in the Action bar (Figma Bottom=Actions).
 * One main chart goes straight on the screen; the entries close it, open on the grey Canvas (usage rules §19).
 */
// scrollRef: what scrolls the screen (the bar's divider shows once content runs under it). "window" in your app.
export default function PhoneWeekGauge({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const gaugeId = useId();
  const listId = useId();
  // Back leads to Hours, which this example does not draw: the toast names where it goes.
  const back = { icon: "icon-chevron-left-line-medium" as const, label: "Back", onClick: () => toast({ title: "Back to Hours", children: "This example shows the one screen." }) };
  const [entries, setEntries] = useState(hoursThisWeek);
  const [logging, setLogging] = useState(false);
  const logged = entries.reduce((total, entry) => total + entry.value, 0);
  const form = useFormState<{ note: string; project: string; hours: string }>({
    initialValues: { note: "", project: "lumen-banking", hours: "2" },
    validate: (values) => ({ note: values.note.trim() ? undefined : "Say what you worked on" }),
    onSubmit: (values, { reset }) => {
      const entry = { id: `log-${entries.length}`, note: values.note.trim(), project: projectById(values.project), day: "Today", value: Number(values.hours) };
      setEntries((list) => [entry, ...list]);
      setLogging(false);
      reset();
      toast({ title: `${hours(entry.value)} logged`, children: `${entry.note} · ${entry.project.name}`, action: { label: "Undo", onClick: () => setEntries((list) => list.filter((item) => item.id !== entry.id)) } });
    },
  });
  return (
    <>
      <AppShell
        topNavigation={<TopNavigation type="compact-alt" title="This week" scrollRef={scrollRef} leading={back} />}
        actionBar={<ActionBar primaryAction={{ label: "Log time", onClick: () => setLogging(true) }} />}
      >
        <Stack as="section" gap="md" aria-labelledby={gaugeId}>
          <Heading level={2} id={gaugeId} textStyle="Heading/Subheading" align="center">Hours logged</Heading>
          {/* No target: the week's 40 hours are the scale, and the caption says what is left. */}
          <GaugeChart aria-label="Hours logged this week, of a 40-hour week" value={Math.min(logged, weekHours)} max={weekHours} format={hours} actualLabel="Logged"
            caption={logged >= weekHours ? "Week complete" : `${hours(weekHours - logged)} to go`} />
        </Stack>
        <Stack as="section" gap="xs" aria-labelledby={listId}>
          <Heading level={2} id={listId} textStyle="Body/Small/Bold" tone="light">Entries</Heading>
          <List aria-labelledby={listId}>
            {entries.map((entry) => (
              <ListItem key={entry.id} title={entry.note} caption={`${entry.day} · ${entry.project.client}`}
                leading={<DockIcon size="md" icon={entry.project.icon} theme={entry.project.theme} background="subtle" />}
                trailing={<Text as="span" textStyle="Body/Base/Medium">{hours(entry.value)}</Text>} />
            ))}
          </List>
        </Stack>
      </AppShell>
      {/* A form sheet: Enter or Log hours submits; the note takes focus when the sheet opens. */}
      <BottomSheet inline open={logging} onOpenChange={(open) => { setLogging(open); if (!open) form.reset(); }} title="Log time" onSubmit={form.handleSubmit}
        primaryAction={{ label: "Log hours" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="What did you work on?" placeholder="Transfer limits review" data-autofocus="" {...form.field("note")} />
        <SelectField label="Project" options={logProjects} {...form.selectField("project")} />
        <SelectField label="Hours" options={logHours} {...form.selectField("hours")} />
      </BottomSheet>
    </>
  );
}
