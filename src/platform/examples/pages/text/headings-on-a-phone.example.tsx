import { useId, useRef, useState, type RefObject } from "react";
import {
  AppShell, Avatar, Badge, BadgeStatus, BottomNavigation, Box, DescriptionList, Heading, List, ListBox, ListItem, Stack, Text, TopNavigation,
  plural, useToast, type BottomNavigationItem,
} from "@zen-ds/react";
import { daysFromToday, formatDate, formatDue, formatRelative, initials, people, priorityTheme, projectById, studio, taskStep, tasks, type Person, type PersonId, type Task } from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. The text beside it already names them. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };

const moreTasks: Task[] = [
  { id: "t11", key: "PHIN-226", title: "Plan the Android beta with Phin & Co", project: "phin-loyalty", assignee: "duy", status: "To do", priority: "Medium", due: daysFromToday(4), comments: 1 },
  { id: "t12", key: "PHIN-228", title: "Fix points rounding on refunds", project: "phin-loyalty", assignee: "bao", status: "In progress", priority: "High", due: daysFromToday(1), comments: 4 },
  { id: "t13", key: "LUM-097", title: "Prototype the daily limit change", project: "lumen-banking", assignee: "alex", status: "In progress", priority: "High", due: daysFromToday(4), comments: 3 },
  { id: "t14", key: "ZEN-408", title: "Ship the scroll fold for Top Navigation", project: "zen-ds", assignee: "finn", status: "In progress", priority: "High", due: daysFromToday(3), comments: 7 },
  { id: "t15", key: "SAO-006", title: "Shortlist photographers for the outdoor shoot", project: "saola-brand", assignee: "linh", status: "To do", priority: "Low", due: daysFromToday(10), comments: 0 },
];
/** Open work first, soonest due on top; finished tasks after it. */
const followed = [...tasks, ...moreTasks].sort((a, b) => Number(a.status === "Done") - Number(b.status === "Done") || a.due.getTime() - b.due.getTime());
/** A Done task says it is done; open work says when it is due. */
const dueLine = (task: Task) => (task.status === "Done" ? "Done" : formatDue(task.due));
/** What happened to a task, oldest first: created by Alex, picked up by its assignee, then its latest status. */
const historyOf = (task: Task) => [
  { id: "created", who: "alex" as PersonId, text: "Created the task", at: daysFromToday(-12, 9, 0) },
  ...(task.status !== "To do" ? [{ id: "started", who: task.assignee, text: "Started work", at: daysFromToday(-4, 14, 10) }] : []),
  ...(task.status === "In review" || task.status === "Done" ? [{ id: "status", who: task.assignee, text: `Moved it to ${task.status}`, at: daysFromToday(-1, 17, 25) }] : []),
].reverse();

/** The roots of the studio's phone app, in its bottom bar: a selected root shows its solid icon. */
const phoneRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "inbox", label: "Inbox", icon: "icon-message-chat-circle-line", selectedIcon: "icon-message-chat-circle-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
const openCount = followed.filter((task) => task.status !== "Done").length;
/** The list's two groups: open work, soonest due first, then what is done. */
const taskGroups = [
  { id: "open", title: "Open", rows: followed.filter((task) => task.status !== "Done") },
  { id: "done", title: "Done", rows: followed.filter((task) => task.status === "Done") },
];

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneHeadings({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [openId, setOpenId] = useState<string | null>(null);
  // The row the last task was opened from: Back returns focus to it.
  const [fromId, setFromId] = useState<string | null>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  const groupId = useId();
  const activityId = useId();
  /** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows text and headings." });
  const open = (id: string) => {
    setOpenId(id);
    setFromId(id);
    setTimeout(() => titleRef.current?.focus());
  };
  const back = () => {
    setOpenId(null);
    setTimeout(() => rowRef.current?.focus());
  };
  const task = followed.find((item) => item.id === openId);

  if (!task) {
    return (
      // A tab root: the large title is the screen's h1 (Heading/1), and the bar title once it folds (TopNavigation's
      // scrollRef, on the screen's scroller); the groups under it are h2 kickers. The bottom bar casts a shadow, so each
      // group's block takes the same Shadow elevation.
      <AppShell key="tasks"
        topNavigation={<TopNavigation scrollRef={scrollRef} title="Tasks" largeTitle="Tasks" largeTitleSubheading={`${plural(openCount, "open task")} you follow`} />}
        bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={phoneRoots} value="tasks"
          onValueChange={(id) => { if (id !== "tasks") notHere(phoneRoots.find((item) => item.id === id)?.label ?? id); }} />}
      >
        {taskGroups.map((group) => (
          <Stack key={group.id} as="section" gap="xs" aria-labelledby={`${groupId}-${group.id}`}>
            <Box paddingX="lg"><Heading level={2} id={`${groupId}-${group.id}`} textStyle="Body/Small/Bold" tone="light">{group.title}</Heading></Box>
            <ListBox theme="shadow">
              <List aria-labelledby={`${groupId}-${group.id}`}>
                {group.rows.map((item) => (
                  <ListItem key={item.id} ref={item.id === fromId ? rowRef : undefined} tabIndex={item.id === fromId ? -1 : undefined}
                    title={item.title} titleLines={2} caption={`${item.key} · ${dueLine(item)}`}
                    leading={<Avatar size="md" {...avatarOf(people[item.assignee])} />}
                    onClick={() => open(item.id)} />
                ))}
              </List>
            </ListBox>
          </Stack>
        ))}
      </AppShell>
    );
  }
  const project = projectById(task.project);
  return (
    // A pushed screen: the compact bar title is its h1 in the bar's own style, so the content starts at h2. No bottom bar.
    <AppShell key={task.id}
      topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>{task.key}</span>}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
    >
      {/* The task's name leads the screen as bold text, not as a second h1; the Body spaces the sections
          Layout-Mobile/Section-Gap apart. */}
      <Stack gap="lg">
        <Stack gap="xs">
          <Text textStyle="Body/Extra/Bold">{task.title}</Text>
          <Text textStyle="Body/Small/Regular" tone="base">{`${project.name} · ${project.client}`}</Text>
        </Stack>
        <DescriptionList items={[
          { id: "status", term: "Status", description: <BadgeStatus status={taskStep[task.status]}>{task.status}</BadgeStatus> },
          { id: "assignee", term: "Assignee", description: people[task.assignee].name },
          { id: "priority", term: "Priority", description: <Badge theme={priorityTheme[task.priority]} background="subtle">{task.priority}</Badge> },
          // Open work says when it is due; a Done task's status already says it is finished.
          ...(task.status === "Done" ? [] : [{ id: "due", term: "Due", description: formatDate(task.due) }]),
        ]} />
      </Stack>
      <Stack as="section" gap="xs" aria-labelledby={activityId}>
        <Heading level={2} id={activityId} textStyle="Body/Small/Bold" tone="light">Activity</Heading>
        <List aria-labelledby={activityId}>
          {historyOf(task).map((event) => (
            <ListItem key={event.id} title={event.text} caption={`${people[event.who].name} · ${formatRelative(event.at)}`}
              leading={<Avatar size="md" {...avatarOf(people[event.who])} />} />
          ))}
        </List>
      </Stack>
    </AppShell>
  );
}
