import { useId, useRef, useState, type MouseEvent } from "react";
import { Badge, BadgeStatus, Card, DescriptionList, DockIcon, Heading, Link, List, ListItem, Stack, Text, plural } from "@zen-ds/react";
import { daysFromToday, formatDue, people, priorityTheme, projectById, taskStep, tasks, type Task } from "../../data";

const dueThisWeek = tasks
  .filter((task) => task.status !== "Done" && task.due <= daysFromToday(7, 23, 59))
  .sort((a, b) => a.due.getTime() - b.due.getTime());
const SHOWN = 4;

/** What your router's link does: a plain click opens the page in place; Cmd/Ctrl-click and Copy link address keep the href. */
const inApp = (event: MouseEvent<HTMLElement>, open: () => void) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  open();
};

export default function DueThisWeek() {
  const [path, setPath] = useState("/home");
  const [from, setFrom] = useState("/home");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const task = dueThisWeek.find((item) => path === `/tasks/${item.id}`);
  const all = path === "/tasks";
  // Each route change moves focus to the new view's heading.
  const go = (to: string) => {
    setPath(to);
    setTimeout(() => titleRef.current?.focus());
  };
  // Opening a task remembers the list it came from, so its Back link returns there.
  const open = (item: Task) => {
    setFrom(path);
    go(`/tasks/${item.id}`);
  };
  const link = (to: string, text: string) => (
    <Text textStyle="Body/Base/Medium"><Link href={to} onClick={(event) => inApp(event, () => go(to))}>{text}</Link></Text>
  );
  // A whole row that opens the task is the row's own link (ListItem href), not a Link inside it.
  const taskRow = (item: Task) => {
    const project = projectById(item.project);
    return (
      <ListItem key={item.id} title={item.title} titleLines={2} caption={`${project.name} · ${formatDue(item.due)}`}
        leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />}
        href={`/tasks/${item.id}`} onClick={(event) => inApp(event, () => open(item))} />
    );
  };

  return (
    <Card as="section" theme="default" aria-labelledby={titleId}>
      {task ? (
        <Stack gap="md">
          <Stack gap="xs">
            <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${task.key} · ${projectById(task.project).name}`}</Text>
            <Heading ref={titleRef} level={4} id={titleId} textStyle="Heading/Subheading" tabIndex={-1}>{task.title}</Heading>
          </Stack>
          <DescriptionList items={[
            { term: "Assignee", description: people[task.assignee].name },
            { term: "Due", description: formatDue(task.due) },
            { term: "Status", description: <BadgeStatus status={taskStep[task.status]}>{task.status}</BadgeStatus> },
            { term: "Priority", description: <Badge theme={priorityTheme[task.priority]} background="subtle">{task.priority}</Badge> },
          ]} />
          {link(from, from === "/tasks" ? "Back to all tasks" : "Back to home")}
        </Stack>
      ) : (
        <Stack gap="md">
          <Stack gap="xs">
            <Heading ref={titleRef} level={4} id={titleId} textStyle="Heading/Subheading" tabIndex={-1}>{all ? "Tasks due this week" : "Due this week"}</Heading>
            <Text as="span" textStyle="Body/Small/Regular" tone="base">
              {all ? `${plural(dueThisWeek.length, "task")} · Sep 30 – Oct 7, 2026` : `${SHOWN} of ${dueThisWeek.length}, soonest first`}
            </Text>
          </Stack>
          <List aria-labelledby={titleId}>{(all ? dueThisWeek : dueThisWeek.slice(0, SHOWN)).map(taskRow)}</List>
          {/* A standalone link: the underline shows on hover and focus. Opening the full list is navigation, so it is a Link. */}
          {all ? link("/home", "Back to home") : link("/tasks", `View all ${plural(dueThisWeek.length, "task")}`)}
        </Stack>
      )}
    </Card>
  );
}
