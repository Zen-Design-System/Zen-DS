import { Fragment, useId, useRef, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, BadgeStatus, BottomNavigation, BottomSheet, Box, Card, DescriptionList, DockIcon, Grid, Heading, InputField, List, ListBox, ListItem, MetricCard,
  SelectField, Stack, Text, TopNavigation, useFormState, useToast, type BottomNavigationItem,
} from "@zen-ds/react";
import { daysFromToday, formatDay, me, people, projectById, studio, taskStep, type TaskStatus } from "../../data";

const statusBadge = (status: TaskStatus) => <BadgeStatus status={taskStep[status]}>{status}</BadgeStatus>;
/** A row caption of whole values: it wraps between values, never inside a key or a name; each "· " stays with the value it introduces, so no line ends on a dot. */
const wholeValues = (...values: (string | false)[]) => values.filter((value): value is string => Boolean(value)).map((value, index) => (
  <Fragment key={`${index}:${value}`}>{index ? " " : null}{whole(`${index ? "· " : ""}${value}`)}</Fragment>
));
/** A run of words that never breaks: its spaces are no-break spaces. */
const whole = (text: string) => text.replace(/ /g, " ");

type When = "today" | "tomorrow" | "later";
type PhoneTask = { id: string; key: string; title: string; project: string; when: When; done: boolean };
const whenLabels: Record<When, string> = { today: "Today", tomorrow: "Tomorrow", later: "Later this week" };
const whenDue: Record<When, Date> = { today: daysFromToday(0), tomorrow: daysFromToday(1), later: daysFromToday(3) };
const myWeek: PhoneTask[] = [
  { id: "p1", key: "LUM-091", title: "Audit the account overview for WCAG 2.2", project: "lumen-banking", when: "today", done: false },
  { id: "p2", key: "PHIN-214", title: "Review the points history screen", project: "phin-loyalty", when: "today", done: false },
  { id: "p3", key: "ZEN-405", title: "Sign off the Metric card guidelines", project: "zen-ds", when: "today", done: true },
  { id: "p4", key: "LUM-093", title: "Reply to Hana about SOW v3", project: "lumen-banking", when: "today", done: false },
  { id: "p5", key: "PHIN-219", title: "Review the rewards API checkout", project: "phin-loyalty", when: "tomorrow", done: false },
  { id: "p6", key: "SAO-007", title: "Plan the Saola kickoff workshop", project: "saola-brand", when: "tomorrow", done: false },
  { id: "p7", key: "LUM-096", title: "Update the transfer limits copy", project: "lumen-banking", when: "tomorrow", done: false },
  { id: "p8", key: "ZEN-410", title: "Prepare the Q4 design review", project: "zen-ds", when: "tomorrow", done: false },
  { id: "p9", key: "LUM-098", title: "Design the transfer limits screen", project: "lumen-banking", when: "later", done: false },
  { id: "p10", key: "SAO-004", title: "Moodboard feedback for Gia", project: "saola-brand", when: "later", done: false },
  { id: "p11", key: "ZEN-412", title: "Write the Disabled input guidelines", project: "zen-ds", when: "later", done: false },
  { id: "p12", key: "ZEN-413", title: "Run the design team 1:1s", project: "zen-ds", when: "later", done: false },
  { id: "p13", key: "LUM-097", title: "Map the card controls flow", project: "lumen-banking", when: "later", done: false },
  { id: "p14", key: "PHIN-223", title: "Review the Android regression results", project: "phin-loyalty", when: "later", done: false },
];
const projectOptions = ["lumen-banking", "phin-loyalty", "zen-ds", "saola-brand"].map((id) => ({ value: id, label: projectById(id).name }));
const whenOptions = (Object.keys(whenLabels) as When[]).map((value) => ({ value, label: whenLabels[value] }));

/** The roots of the studio's phone app, in its bottom bar: a selected root shows its solid icon. */
const phoneRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "events", label: "Events", icon: "icon-calendar-line", selectedIcon: "icon-calendar-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
/** The bottom bar of a root screen: the other roots are not drawn here, so a toast says so and the bar keeps this root. */
function PhoneRoots({ value }: { value: string }) {
  const { toast } = useToast();
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the layout." });
  return (
    <BottomNavigation type="default" aria-label={studio.name} showLabels items={phoneRoots} value={value}
      onValueChange={(id) => { if (id !== value) notHere(phoneRoots.find((item) => item.id === id)?.label ?? id); }} />
  );
}

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneTasks({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const baseId = useId();
  const [tasks, setTasks] = useState(myWeek);
  const [openId, setOpenId] = useState<string | null>(null);
  const [fromId, setFromId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // Focus follows the screen: a task focuses its title, Back returns to the row it came from.
  const titleRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  const open = (id: string) => {
    setOpenId(id);
    setFromId(id);
    setTimeout(() => titleRef.current?.focus());
  };
  const back = () => {
    setOpenId(null);
    setTimeout(() => rowRef.current?.focus());
  };
  const form = useFormState<{ title: string; project: string; when: string }>({
    initialValues: { title: "", project: "lumen-banking", when: "today" },
    validate: (values) => ({ title: values.title.trim() ? undefined : "Enter a task name" }),
    onSubmit: (values, { reset }) => {
      const next = tasks.length + 1;
      setTasks((list) => [...list, { id: `p${next}`, key: `NEW-${next}`, title: values.title.trim(), project: values.project, when: values.when as When, done: false }]);
      setCreating(false);
      reset();
      toast({ type: "positive", title: "Task added", children: whenLabels[values.when as When] });
    },
  });
  const task = tasks.find((item) => item.id === openId);
  const setDone = (id: string, done: boolean) => setTasks((list) => list.map((item) => (item.id === id ? { ...item, done } : item)));
  const dueToday = tasks.filter((item) => item.when === "today" && !item.done).length;
  const doneThisWeek = tasks.filter((item) => item.done).length;

  // Each screen is its own AppShell (key).
  if (task) {
    const project = projectById(task.project);
    return (
      // A pushed screen: the compact bar with Back and the task's key, the task's one action pinned in the Action bar
      // (Figma Bottom=Actions), no bottom bar. The Body pads it as it pads the root.
      <AppShell key={task.id}
        topNavigation={<TopNavigation type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>{task.key}</span>} scrollRef={scrollRef}
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
        actionBar={<ActionBar primaryAction={task.done
          ? { label: "Reopen task", onClick: () => setDone(task.id, false) }
          : { label: "Mark as done", onClick: () => { setDone(task.id, true); toast({ title: "Task completed", action: { label: "Undo", onClick: () => setDone(task.id, false) } }); } }} />}
      >
        <Stack gap="xs">
          <Heading level={2} textStyle="Heading/4">{task.title}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${project.name} · ${project.client}`}</Text>
        </Stack>
        <Card theme="default">
          <DescriptionList divider items={[
            { term: "Status", description: statusBadge(task.done ? "Done" : "To do") },
            { term: "Due", description: formatDay(whenDue[task.when]) },
            { term: "Assignee", description: me.name },
            { term: "Project lead", description: people[project.lead].name },
          ]} />
        </Card>
      </AppShell>
    );
  }

  return (
    <>
      {/* A tab root: the large title folds as the groups scroll under the bar, and the bottom bar holds the app's roots.
          The Body pads the screen (Margin-Comfortable, 20) and spaces its sections Layout-Mobile/Section-Gap apart; the
          bottom bar casts a shadow, so every block on the grey Canvas takes the same Shadow elevation. */}
      <AppShell key="tasks"
        topNavigation={<TopNavigation title="Tasks" largeTitle="Tasks" scrollRef={scrollRef}
          trailing={[{ icon: "icon-plus-line", label: "New task", onClick: () => setCreating(true) }]} />}
        bottomNavigation={<PhoneRoots value="tasks" />}
      >
        {/* Two metrics in a fixed two-column Grid, md apart. */}
        <Grid columns={2} gap="md">
          <MetricCard iconBackground="solid" theme="shadow" size="lg" label="Due today" value={String(dueToday)} icon="icon-calendar-line" iconTheme="yellow" />
          <MetricCard iconBackground="solid" theme="shadow" size="lg" label="Done this week" value={String(doneThisWeek)} icon="icon-check-done-line" iconTheme="green" />
        </Grid>
        {(Object.keys(whenLabels) as When[]).map((when) => {
          const rows = tasks.filter((item) => item.when === when);
          if (!rows.length) return null;
          const groupId = `${baseId}-${when}`;
          return (
            // Kicker xs above its ListBox. Each row opens its task and has no side padding of its own: the ListBox pads 20px on a
            // phone, so the hover fill (12px outside the row) sits 8px from every edge (2XLarge 24px = the fill's 16px + 8px),
            // and the kicker lines up with the row text (paddingX lg, 20px).
            <Stack key={when} as="section" gap="xs" aria-labelledby={groupId}>
              <Box paddingX="lg"><Heading level={2} id={groupId} textStyle="Body/Small/Bold" tone="light">{whenLabels[when]}</Heading></Box>
              <ListBox theme="shadow">
                <List aria-labelledby={groupId}>
                  {rows.map((item) => {
                    const project = projectById(item.project);
                    return (
                      // A trailing Badge would squeeze a phone row's caption, so a done task's status leads the caption.
                      <ListItem key={item.id} ref={item.id === fromId ? rowRef : undefined} tabIndex={item.id === fromId ? -1 : undefined}
                        title={item.title} titleLines={1} caption={wholeValues(item.done && "Done", item.key, project.name)}
                        leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />}
                        onClick={() => open(item.id)} />
                    );
                  })}
                </List>
              </ListBox>
            </Stack>
          );
        })}
      </AppShell>
      <BottomSheet inline open={creating} onOpenChange={(next) => { setCreating(next); if (!next) form.reset(); }} title="New task" onSubmit={form.handleSubmit}
        primaryAction={{ label: "Add task" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Task name" placeholder="Review the onboarding copy" data-autofocus="" {...form.field("title")} />
        <SelectField label="Project" options={projectOptions} {...form.selectField("project")} />
        <SelectField label="Due" options={whenOptions} {...form.selectField("when")} />
      </BottomSheet>
    </>
  );
}
