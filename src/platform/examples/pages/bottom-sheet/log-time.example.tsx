import { useRef, useState, type RefObject } from "react";
import {
  AppShell, BottomSheet, DockIcon, List, ListItem, Metric, NumberField, SelectField, Stack, Text, TextAreaField, TopNavigation, useFormState, useToast,
} from "@zen-ds/react";
import { TODAY, daysFromToday, formatDay, projectById, projects } from "../../data";

type Entry = { id: string; project: string; hours: number; note: string; day: Date };
// Alex's last two weeks, newest first.
const timesheet: Entry[] = [
  { id: "w1", project: "lumen-banking", hours: 3.5, note: "Transfer flow review", day: daysFromToday(0) },
  { id: "w2", project: "zen-ds", hours: 2, note: "Metric card guidelines", day: daysFromToday(0) },
  { id: "w3", project: "lumen-banking", hours: 6, note: "Usability sessions", day: daysFromToday(-1) },
  { id: "w4", project: "saola-brand", hours: 1.5, note: "Kickoff prep", day: daysFromToday(-1) },
  { id: "w5", project: "zen-ds", hours: 7.5, note: "Token sync", day: daysFromToday(-2) },
  { id: "w6", project: "lumen-banking", hours: 1, note: "Client check-in", day: daysFromToday(-2) },
  { id: "w7", project: "phin-loyalty", hours: 4, note: "Points history review", day: daysFromToday(-5) },
  { id: "w8", project: "zen-ds", hours: 3.5, note: "Chip size audit", day: daysFromToday(-5) },
  { id: "w9", project: "lumen-banking", hours: 5, note: "Account overview audit", day: daysFromToday(-6) },
  { id: "w10", project: "phin-loyalty", hours: 2, note: "Design critique", day: daysFromToday(-6) },
  { id: "w11", project: "zen-ds", hours: 6, note: "Bottom sheet examples", day: daysFromToday(-7) },
  { id: "w12", project: "lumen-banking", hours: 2, note: "Passkey review", day: daysFromToday(-7) },
  { id: "w13", project: "saola-brand", hours: 3, note: "Moodboard review", day: daysFromToday(-8) },
  { id: "w14", project: "lumen-banking", hours: 5, note: "Transfer limit copy", day: daysFromToday(-8) },
  { id: "w15", project: "zen-ds", hours: 8, note: "Release 0.4 QA", day: daysFromToday(-9) },
];
// The week starts on Monday, Sep 28.
const weekStart = daysFromToday(-2, 0, 0);
const hoursLabel = (hours: number) => `${hours.toFixed(1)} h`;
const dayOf = (d: Date) => d.toDateString() === TODAY.toDateString() ? "Today" : d.toDateString() === daysFromToday(-1).toDateString() ? "Yesterday" : formatDay(d);
const loggable = projects.filter((project) => project.status === "Active" || project.status === "Planning").map((project) => ({ value: project.id, label: project.name }));

type EntryDraft = { project: string; hours: number | null; note: string };

/** A timesheet on a phone: Log time opens a short form in a Bottom Sheet. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function LogTime({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [entries, setEntries] = useState(timesheet);
  const [open, setOpen] = useState(false);
  // The newest entry's row: a new entry lands on top, so the list scrolls back to it.
  const newestRef = useRef<HTMLElement>(null);
  const total = entries.filter((entry) => entry.day >= weekStart).reduce((sum, entry) => sum + entry.hours, 0);
  // Log time always submits: without hours the field gets its error and focus, and the sheet stays open.
  const form = useFormState<EntryDraft>({
    initialValues: { project: "lumen-banking", hours: null, note: "" },
    validate: (v) => ({ hours: v.hours ? undefined : "Enter the hours you worked, from 0.5 to 12" }),
    onSubmit: (v, { reset }) => {
      const entry: Entry = { id: `new-${entries.length + 1}`, project: v.project, hours: v.hours!, note: v.note.trim(), day: TODAY };
      setEntries((all) => [entry, ...all]);
      setOpen(false);
      reset();
      setTimeout(() => newestRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
      toast({ title: "Time logged", action: { label: "Undo", onClick: () => setEntries((all) => all.filter((item) => item.id !== entry.id)) } });
    },
  });
  const start = () => { form.reset(); setOpen(true); };
  return (
    <>
      {/* A tab root: the large title folds into the bar as the entries run under it; Log time waits at its end. */}
      <AppShell topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Timesheet" largeTitle="Timesheet"
        trailing={[{ icon: "icon-plus-line", label: "Log time", onClick: start }]} />}>
        <Stack gap="md">
          <Metric size="xl" label="This week" value={hoursLabel(total)} icon="icon-clock-line" iconTheme="blue" iconBackground="solid" />
          <List aria-label="Time entries">
            {entries.map((entry, index) => {
              const project = projectById(entry.project);
              return (
                <ListItem key={entry.id} ref={index === 0 ? newestRef : undefined} title={project.name} caption={[dayOf(entry.day), entry.note].filter(Boolean).join(" · ")}
                  leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />}
                  trailing={<Text as="span" textStyle="Body/Base/Medium" wrap={false} tabularNumbers>{hoursLabel(entry.hours)}</Text>} />
              );
            })}
          </List>
        </Stack>
      </AppShell>
      {/* Modal type as a form: Enter or Log time submits; the one required value takes focus when the sheet opens. */}
      <BottomSheet inline open={open} onOpenChange={setOpen} title="Log time" onSubmit={form.handleSubmit}
        primaryAction={{ label: "Log time" }} secondaryAction={{ label: "Cancel" }}>
        <SelectField label="Project" options={loggable} {...form.selectField("project")} />
        <NumberField label="Hours" min={0.5} max={12} step={0.5} helpText="Up to 12 hours in one entry" {...form.numberField("hours")} data-autofocus="" />
        <TextAreaField label="Note" labelOptional rows={2} placeholder="What did you work on?" {...form.field("note")} />
      </BottomSheet>
    </>
  );
}
