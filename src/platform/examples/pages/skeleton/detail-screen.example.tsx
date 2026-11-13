import { useId, useRef, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, Avatar, Badge, BadgeStatus, BottomNavigation, Box, Card, DescriptionList, Heading, List, ListBox, ListItem, SkeletonShape, SkeletonText,
  Stack, Text, TopNavigation, VisuallyHidden, plural, useToast, type BottomNavigationItem,
} from "@zen-ds/react";
import { daysFromToday, formatDue, initials, people, priorityTheme, projectById, studio, taskStep, tasks, type PersonId, type Task } from "../../data";

/** The studio's open tasks, soonest due first: the open ones from the demo data plus a few more from this week's boards. */
const moreTasks: Task[] = [
  { id: "t11", key: "PHIN-226", title: "Plan the Android beta with Phin & Co", project: "phin-loyalty", assignee: "duy", status: "To do", priority: "Medium", due: daysFromToday(4), comments: 1 },
  { id: "t12", key: "PHIN-228", title: "Fix points rounding on refunds", project: "phin-loyalty", assignee: "bao", status: "In progress", priority: "High", due: daysFromToday(1), comments: 4 },
  { id: "t13", key: "LUM-097", title: "Prototype the daily limit change", project: "lumen-banking", assignee: "alex", status: "In progress", priority: "High", due: daysFromToday(4), comments: 3 },
  { id: "t14", key: "LUM-099", title: "Review the SOW v3 change request", project: "lumen-banking", assignee: "hana", status: "In review", priority: "Medium", due: daysFromToday(2), comments: 2 },
  { id: "t15", key: "MEK-034", title: "Draft the tracking events API", project: "mekong-tracking", assignee: "khoa", status: "To do", priority: "Medium", due: daysFromToday(8), comments: 0 },
  { id: "t16", key: "ZEN-408", title: "Ship the scroll fold for Top Navigation", project: "zen-ds", assignee: "finn", status: "In progress", priority: "High", due: daysFromToday(3), comments: 7 },
  { id: "t17", key: "SAO-006", title: "Shortlist photographers for the outdoor shoot", project: "saola-brand", assignee: "linh", status: "To do", priority: "Low", due: daysFromToday(10), comments: 0 },
];
const openTasks = [...tasks, ...moreTasks].filter((task) => task.status !== "Done").sort((a, b) => a.due.getTime() - b.due.getTime());
const taskNotes: Record<string, string> = {
  t1: "Show earned and spent points by month, with a filter for each store.",
  t2: "Apply points at checkout through the rewards API, and fall back to full price when it does not answer in 3 seconds.",
  t3: "Run the regression suite on the Android 2.4.1 build before it goes to the Phin & Co beta group.",
  t4: "Five sessions with Lumen Bank customers who send money abroad at least once a month.",
  t5: "Check contrast, focus order and screen reader names on the account overview before the Lumen Bank review on Friday.",
  t8: "Usage, Do and Don't for the Metric card, with the trend and icon rules.",
  t9: "List every state a parcel can be held in at customs, and what the customer sees for each one.",
  t10: "Twelve pictures for the outdoor range: tents, trail shoes and the river kayaks, shot in morning light.",
  t11: "Agree the beta group, the feedback form and the release date for Android with Phin & Co's product owner.",
  t12: "A refund of a partly paid order gives back 1 point too many. Round the points down, as the receipt does.",
  t13: "A two-step flow to raise the daily limit for one payment, with the bank's confirmation step at the end.",
  t14: "Lumen Bank asked for two more usability rounds. Check the hours and the price before it goes to the client.",
  t15: "Events for picked up, in transit, held at customs and delivered, with the fields the driver app sends.",
  t16: "The large title and the Search bar slide under the bar as the list scrolls; settle open or closed when it stops.",
  t17: "Five photographers who shoot outdoor gear, with day rates and two sample shoots each.",
};

/** The roots of the studio's phone app, in its bottom bar: a selected root shows its solid icon. */
const phoneRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "inbox", label: "Inbox", icon: "icon-message-chat-circle-line", selectedIcon: "icon-message-chat-circle-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
/** The open tasks by when they are due, as the Tasks root groups them. */
const endOfWeek = daysFromToday(4, 23, 59);
const taskGroups = [
  { id: "week", title: "Due this week", rows: openTasks.filter((task) => task.due <= endOfWeek) },
  { id: "later", title: "Later", rows: openTasks.filter((task) => task.due > endOfWeek) },
];

const personAvatar = (id: PersonId) => {
  const person = people[id];
  return person.photo ? <Avatar theme="photo" src={person.photo} alt="" /> : <Avatar theme={person.theme} alt="">{initials(person.name)}</Avatar>;
};

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function TaskDetail({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const groupId = useId();
  const [view, setView] = useState<"tasks" | "task">("tasks");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  // Focus follows the screen: the task's screen focuses its title, Back returns to the group of the row it came from.
  const titleRef = useRef<HTMLSpanElement>(null);
  const groupRef = useRef<HTMLHeadingElement>(null);
  /** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the Skeleton." });
  // A row opens its task at once; the task's status, fields and description load behind placeholders (1.4 s here).
  const openTask = (t: Task) => {
    setTaskId(t.id);
    setView("task");
    setLoadingId(t.id);
    setTimeout(() => setLoadingId((current) => (current === t.id ? null : current)), 1400);
    setTimeout(() => titleRef.current?.focus());
  };
  const back = () => {
    setView("tasks");
    setTimeout(() => groupRef.current?.focus());
  };
  const task = view === "task" ? openTasks.find((t) => t.id === taskId) : undefined;
  const statusOf = (t: Task): Task["status"] => (done.includes(t.id) ? "Done" : t.status);

  // Each screen is its own AppShell (key), so the task opens at the top.
  if (!task) {
    const dueThisWeek = taskGroups[0].rows.filter((t) => !done.includes(t.id)).length;
    return (
      // The Tasks root: a large title, and the app's roots in the bottom bar. The bar casts a shadow, so each group's
      // block takes the same Shadow elevation.
      <AppShell key="tasks"
        topNavigation={<TopNavigation scrollRef={scrollRef} title="Tasks" largeTitle="Tasks" largeTitleSubheading={`${plural(dueThisWeek, "task")} due this week`} />}
        bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={phoneRoots} value="tasks"
          onValueChange={(id) => { if (id !== "tasks") notHere(phoneRoots.find((item) => item.id === id)?.label ?? id); }} />}
      >
        {taskGroups.map((group) => (
          <Stack key={group.id} as="section" gap="xs" aria-labelledby={`${groupId}-${group.id}`}>
            {/* The kicker lines up with the row text inside the block (paddingX lg, 20). */}
            <Box paddingX="lg">
              <Heading ref={group.rows.some((t) => t.id === taskId) ? groupRef : undefined} tabIndex={-1} level={2} id={`${groupId}-${group.id}`}
                textStyle="Body/Small/Bold" tone="light">{group.title}</Heading>
            </Box>
            <ListBox theme="shadow">
              <List aria-labelledby={`${groupId}-${group.id}`}>
                {group.rows.map((t) => (
                  <ListItem key={t.id} leading={personAvatar(t.assignee)} title={t.title} titleLines={2} caption={`${t.key} · ${done.includes(t.id) ? "Done" : formatDue(t.due)}`}
                    onClick={() => openTask(t)} />
                ))}
              </List>
            </ListBox>
          </Stack>
        ))}
      </AppShell>
    );
  }

  const loading = loadingId === task.id;
  // A placeholder in a text slot stays on the text's line, as wide as the value it stands for (11 characters).
  const skeleton = <SkeletonText lines={1} style={{ display: "inline-flex", width: "11ch", maxWidth: "100%", verticalAlign: "middle" }} />;
  const status = statusOf(task);
  const finished = status === "Done";
  return (
    // A pushed screen: the compact bar with Back and the task's key, its one action in the Action bar, no bottom bar.
    <AppShell key={task.id}
      topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>{task.key}</span>}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
      // The action waits for the task as well: it is there at once (nothing jumps) and works once the task has loaded.
      actionBar={<ActionBar primaryAction={finished
        ? { label: "Reopen task", onClick: () => setDone((list) => list.filter((id) => id !== task.id)) }
        : { label: "Mark as done", disabled: loading, onClick: () => {
          setDone((list) => [...list, task.id]);
          toast({ title: "Task completed", children: task.title, action: { label: "Undo", onClick: () => setDone((list) => list.filter((id) => id !== task.id)) } });
        } }} />}
    >
      {/* The title came with the row, so it shows at once; the rest waits for the task. The Body pads the screen and
          spaces the title, the fields and the description Layout-Mobile/Section-Gap apart. */}
      <Stack gap="xs" aria-busy={loading}>
        <Heading level={2} textStyle="Heading/4">{task.title}</Heading>
        {loading ? <SkeletonShape shape="pill" size="xs" /> : <BadgeStatus status={taskStep[status]}>{status}</BadgeStatus>}
      </Stack>
      <Card theme="default" aria-busy={loading}>
        <DescriptionList divider items={[
          { term: "Project", description: loading ? skeleton : projectById(task.project).name },
          { term: "Assignee", description: loading ? skeleton : people[task.assignee].name },
          { term: "Due", description: loading ? skeleton : formatDue(task.due) },
          { term: "Priority", description: loading ? skeleton : <Badge background="subtle" theme={priorityTheme[task.priority]}>{task.priority}</Badge> },
        ]} />
      </Card>
      <Stack gap="xs" aria-busy={loading}>
        <Heading level={3} textStyle="Body/Small/Bold" tone="light">Description</Heading>
        {loading ? <SkeletonText lines={3} /> : <Text>{taskNotes[task.id]}</Text>}
      </Stack>
      <VisuallyHidden role="status">{loading ? "Loading task…" : "Task loaded"}</VisuallyHidden>
    </AppShell>
  );
}
