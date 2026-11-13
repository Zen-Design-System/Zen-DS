import { useRef, useState } from "react";
import { BadgeStatus, Chip, DockIcon, EmptyState, Heading, List, ListBox, ListItem, Stack, Text, plural } from "@zen-ds/react";
import { daysFromToday, formatDue, projectById, taskStep, type Priority, type TaskStatus } from "../../data";

type MyTask = { id: string; key: string; title: string; project: string; status: TaskStatus; priority: Priority; due: Date };
const myTasks: MyTask[] = [
  { id: "m1", key: "LUM-091", title: "Audit the account overview for WCAG 2.2", project: "lumen-banking", status: "To do", priority: "Urgent", due: daysFromToday(0) },
  { id: "m2", key: "PHIN-226", title: "Sign off the points history screen", project: "phin-loyalty", status: "To do", priority: "High", due: daysFromToday(2) },
  { id: "m3", key: "ZEN-409", title: "Review the Metric card guidelines", project: "zen-ds", status: "In review", priority: "Low", due: daysFromToday(6) },
  { id: "m4", key: "SAO-007", title: "Run the moodboard review with Saola", project: "saola-brand", status: "To do", priority: "Medium", due: daysFromToday(9) },
];
const startOfToday = daysFromToday(0, 0, 0);
const endOfWeek = daysFromToday(4, 23, 59); // Sunday, Oct 4
const quickFilters = [
  { id: "overdue", label: "Overdue", test: (task: MyTask) => task.due < startOfToday },
  { id: "week", label: "Due this week", test: (task: MyTask) => task.due <= endOfWeek },
  { id: "urgent", label: "Urgent", test: (task: MyTask) => task.priority === "Urgent" },
];

export default function FilteredToNothing() {
  const firstChipRef = useRef<HTMLButtonElement>(null);
  const [on, setOn] = useState<string[]>(["overdue"]);
  const toggle = (id: string) => setOn((list) => list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const visible = myTasks.filter((task) => quickFilters.every((filter) => !on.includes(filter.id) || filter.test(task)));
  // Clear filters disappears with the Empty State, so focus moves to the first filter instead of the page.
  const clear = () => {
    setOn([]);
    setTimeout(() => firstChipRef.current?.focus());
  };
  return (
    // A ListBox: title, count and quick filters in its Header-Slot; the tasks, or the Empty State, in its Body-Slot.
    <ListBox width="fill"
      header={<>
        <Stack gap="2xs">
          <Heading level={4} textStyle="Heading/Subheading">My tasks</Heading>
          <Text role="status" textStyle="Body/Small/Regular" tone="base">{`${visible.length} of ${plural(myTasks.length, "task")}`}</Text>
        </Stack>
        <Stack direction="row" gap="xs" wrap role="group" aria-label="Quick filters">
          {quickFilters.map((filter, index) => (
            <Chip key={filter.id} ref={index === 0 ? firstChipRef : undefined} variant="normal" level="secondary" selected={on.includes(filter.id)} onClick={() => toggle(filter.id)}>
              {filter.label}
            </Chip>
          ))}
        </Stack>
      </>}>
      {visible.length ? (
        <List aria-label="My tasks">
          {visible.map((task) => {
            const project = projectById(task.project);
            return (
              <ListItem key={task.id} title={task.title} caption={`${task.key} · ${formatDue(task.due)}`}
                leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />}
                trailing={<BadgeStatus status={taskStep[task.status]}>{task.status}</BadgeStatus>} />
            );
          })}
        </List>
      ) : (
        <EmptyState size="sm" headingLevel={5} title="No tasks match"
          secondaryAction={{ label: "Clear filters", onClick: clear }}
          icon="icon-check-circle-broken-line">
          {`Try another filter, or clear them to see all ${plural(myTasks.length, "task")}.`}
        </EmptyState>
      )}
    </ListBox>
  );
}
