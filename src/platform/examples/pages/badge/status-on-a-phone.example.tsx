import { useState, type RefObject } from "react";
import { AppShell, BadgeStatus, BottomSheet, Chip, DescriptionList, List, ListItem, Stack, Text, TopNavigation, plural } from "@zen-ds/react";
import { TODAY, daysFromToday, formatDate, formatDue, formatRelative, people, projectById, taskStep, tasks, type Task, type TaskStatus } from "../../data";

type PhoneTask = Task & { finished?: Date };

const taskStatuses: TaskStatus[] = ["To do", "In progress", "In review", "Done"];
/** Alex's task list: the studio's tasks plus four more, open work by due date and then what finished most recently. */
const finishedAt: Record<string, Date> = { t6: daysFromToday(-3, 17, 20), t7: daysFromToday(0, 9, 15) };
const moreTasks: PhoneTask[] = [
  { id: "t11", key: "LUM-097", title: "Prototype the bill payment flow", project: "lumen-banking", assignee: "alex", status: "In progress", priority: "High", due: daysFromToday(4), comments: 3 },
  { id: "t12", key: "PHIN-226", title: "Write the store listing copy", project: "phin-loyalty", assignee: "linh", status: "To do", priority: "Low", due: daysFromToday(8), comments: 0 },
  { id: "t13", key: "ZEN-407", title: "Document the Tag error state", project: "zen-ds", assignee: "chi", status: "In review", priority: "Medium", due: daysFromToday(2), comments: 4 },
  { id: "t14", key: "HBF-118", title: "Archive the 2026 ticketing pages", project: "bookfair-site", assignee: "gia", status: "Done", priority: "Low", due: daysFromToday(-5), comments: 1, finished: daysFromToday(-6, 15, 0) },
];
const phoneTasks: PhoneTask[] = [...tasks.map((task) => ({ ...task, finished: finishedAt[task.id] })), ...moreTasks].sort((a, b) =>
  a.finished || b.finished ? (b.finished?.getTime() ?? Infinity) - (a.finished?.getTime() ?? Infinity) : a.due.getTime() - b.due.getTime());
/** "Finished at 9:15 am" · "Finished yesterday at 5:20 pm" · "Finished Sunday at 5:20 pm" · "Finished just now". */
const finishedLabel = (d: Date) => {
  const when = formatRelative(d);
  return `Finished ${/^\d{1,2}:\d{2}/.test(when) ? `at ${when}` : when.replace(/^(Just now|Yesterday)/, (word) => word.toLowerCase())}`;
};
const nextStep: Record<TaskStatus, { label: string; to: TaskStatus }> = {
  "To do": { label: "Start task", to: "In progress" },
  "In progress": { label: "Send for review", to: "In review" },
  "In review": { label: "Mark as done", to: "Done" },
  Done: { label: "Reopen task", to: "To do" },
};

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function MobileTasks({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const [list, setList] = useState(phoneTasks);
  const [filter, setFilter] = useState<TaskStatus | "All">("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = filter === "All" ? list : list.filter((task) => task.status === filter);
  const opened = list.find((task) => task.id === openId);
  // Done records when the task finished; reopening clears it, so the caption goes back to the due date.
  const move = (task: PhoneTask) => setList((all) => all.map((item) => {
    if (item.id !== task.id) return item;
    const to = nextStep[task.status].to;
    return { ...item, status: to, finished: to === "Done" ? TODAY : undefined };
  }));
  return (
    <AppShell topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Tasks" largeTitle="Tasks" />}>
      <Stack gap="md" align="stretch">
        <Stack direction="row" gap="xs" scroll="x" paddingY="2xs" role="group" aria-label="Filter by status">
          {(["All", ...taskStatuses] as const).map((option) => (
            <Chip key={option} variant="normal" level="primary" selected={filter === option} onClick={() => setFilter(option)}>{option}</Chip>
          ))}
        </Stack>
        {/* The count sits xs above the rows. */}
        <Stack gap="xs" align="stretch">
          <Text textStyle="Body/Small/Regular" tone="light" role="status">{plural(rows.length, "task")}</Text>
          <List aria-label="Tasks">
            {rows.map((task) => (
              <ListItem key={task.id} onClick={() => setOpenId(task.id)} title={task.title}
                caption={`${task.key} · ${task.finished ? finishedLabel(task.finished) : formatDue(task.due)}`}
                trailing={<BadgeStatus status={taskStep[task.status]}>{task.status}</BadgeStatus>} />
            ))}
          </List>
        </Stack>
      </Stack>
      {opened ? (
        <BottomSheet inline open={openId !== null} onOpenChange={(open) => { if (!open) setOpenId(null); }} title={opened.key}
          primaryAction={{ label: nextStep[opened.status].label, onClick: () => { move(opened); setOpenId(null); } }}
          secondaryAction={{ label: "Close" }}>
          <Stack gap="md" align="stretch">
            <Stack gap="xs" align="start">
              <Text textStyle="Body/Extra/Medium">{opened.title}</Text>
              <BadgeStatus status={taskStep[opened.status]}>{opened.status}</BadgeStatus>
            </Stack>
            <DescriptionList items={[
              { term: "Project", description: projectById(opened.project).name },
              { term: "Assignee", description: people[opened.assignee].name },
              opened.finished ? { term: "Finished", description: formatDate(opened.finished) } : { term: "Due", description: formatDate(opened.due) },
            ]} />
          </Stack>
        </BottomSheet>
      ) : null}
    </AppShell>
  );
}
