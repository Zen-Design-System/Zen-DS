import { useState } from "react";
import {
  Avatar, Badge, BadgeStatus, Chip, EmptyState, Stack, Table, TableBadges, TableMedia, TableText, Text, plural, useZen, type TableColumn,
} from "@zen-ds/react";
import { formatDate, initials, people, priorityTheme, taskStep, tasks, type Priority, type Task, type TaskStatus } from "../../data";

const taskStatuses: TaskStatus[] = ["To do", "In progress", "In review", "Done"];
const priorities: Priority[] = ["Urgent", "High", "Medium", "Low"];

export default function TaskStatusTable() {
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [priority, setPriority] = useState<Priority | null>(null);
  const rows = tasks.filter((task) => (!status || task.status === status) && (!priority || task.priority === priority));
  const filterChip = <T extends string>(label: string, options: T[], picked: T | null, pick: (next: T | null) => void) => (
    <Chip variant="advanced" dropdown selected={picked !== null} popoverLabel={label}
      popoverItems={options.map((option) => ({ id: option, label: option, selected: picked === option }))}
      onPopoverSelect={(item) => pick(picked === item.id ? null : (item.id as T))} onClearSelection={() => pick(null)}>
      {picked ?? label}
    </Chip>
  );
  // On a phone the assignee joins the task's caption and only Status stays beside it, so no fixed-width column is cut.
  const phone = useZen()?.breakpoint === "mobile";
  const columns: TableColumn<Task>[] = phone ? [
    { id: "task", header: "Task", cell: (task) => <TableText caption={`${task.key} · ${people[task.assignee].name}`}>{task.title}</TableText> },
    { id: "status", header: "Status", cell: (task) => <TableBadges><BadgeStatus status={taskStep[task.status]}>{task.status}</BadgeStatus></TableBadges> },
  ] : [
    { id: "task", header: "Task", cell: (task) => <TableText caption={task.key}>{task.title}</TableText> },
    { id: "assignee", header: "Assignee", width: "180px", cell: (task) => {
      const person = people[task.assignee];
      return <TableMedia bold={false} media={person.photo ? <Avatar size="xs" theme="photo" src={person.photo} alt="" /> : <Avatar size="xs" theme={person.theme} alt="">{initials(person.name)}</Avatar>}>{person.name}</TableMedia>;
    } },
    { id: "priority", header: "Priority", width: "128px", cell: (task) => <TableBadges><Badge size="md" theme={priorityTheme[task.priority]} background="subtle" leading="icon-flag-03-solid">{task.priority}</Badge></TableBadges> },
    { id: "status", header: "Status", width: "136px", cell: (task) => <TableBadges><BadgeStatus status={taskStep[task.status]}>{task.status}</BadgeStatus></TableBadges> },
    { id: "due", header: "Due", width: "132px", cell: (task) => <TableText>{formatDate(task.due)}</TableText> },
  ];
  return (
    // The table is the content here, not a widget: it lies on the page under its toolbar, with no container.
    <Stack gap="md" align="stretch">
      <Stack direction="row" gap="xs" align="center" justify="between" wrap>
        <Stack direction="row" gap="xs" align="center">
          {filterChip("Status", taskStatuses, status, setStatus)}
          {filterChip("Priority", priorities, priority, setPriority)}
        </Stack>
        <Text as="span" textStyle="Body/Small/Regular" tone="base" role="status">{plural(rows.length, "task")}</Text>
      </Stack>
      <Table aria-label="Studio tasks" columns={columns} rows={rows}
        empty={<EmptyState size="sm" headingLevel={4} icon="icon-search-medium-line" title="No tasks match"
          secondaryAction={{ label: "Clear filters", onClick: () => { setStatus(null); setPriority(null); } }}>Try another status or priority.</EmptyState>} />
    </Stack>
  );
}
