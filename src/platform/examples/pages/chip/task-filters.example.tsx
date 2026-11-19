import { useRef, useState } from "react";
import {
  Avatar, Badge, BadgeStatus, Box, Button, Chip, DockIcon, EmptyState, Search, Stack, Table, TableMedia, TableText, Text, plural,
  type TableColumn,
} from "@zen-ds/react";
import { initials, people, priorityTheme, projectById, projects, tasks, taskStep, type Person, type Priority, type Task, type TaskStatus } from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };

const statuses: TaskStatus[] = ["To do", "In progress", "In review", "Done"];
const priorities: Priority[] = ["Urgent", "High", "Medium", "Low"];
const taskProjects = projects.filter((project) => tasks.some((task) => task.project === project.id));

const columns: TableColumn<Task>[] = [
  { id: "task", header: "Task", cell: (task) => <TableText bold caption={task.key}>{task.title}</TableText> },
  { id: "project", header: "Project", width: "240px", cell: (task) => { const project = projectById(task.project); return <TableMedia bold={false} media={<DockIcon size="xs" icon={project.icon} theme={project.theme} background="subtle" />}>{project.name}</TableMedia>; } },
  { id: "assignee", header: "Assignee", width: "170px", cell: (task) => <TableMedia bold={false} media={<Avatar size="xs" {...avatarOf(people[task.assignee])} />}>{people[task.assignee].name}</TableMedia> },
  { id: "priority", header: "Priority", width: "110px", cell: (task) => <Badge theme={priorityTheme[task.priority]} background="subtle">{task.priority}</Badge> },
  { id: "status", header: "Status", width: "130px", cell: (task) => <BadgeStatus status={taskStep[task.status]}>{task.status}</BadgeStatus> },
];

/** The studio's tasks with one Advanced chip per filter: Status takes several values, Priority and Project one. */
export default function TaskFilters() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TaskStatus[]>(["In progress", "In review"]);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const project = projectId ? projectById(projectId) : null;
  const toggleStatus = (value: TaskStatus) => setStatus((list) => list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  const active = (status.length ? 1 : 0) + (priority ? 1 : 0) + (project ? 1 : 0);
  const countRef = useRef<HTMLParagraphElement>(null);
  // Clear all and Clear filters go away once pressed, so the focus moves to the count they changed.
  const clearAll = () => {
    setStatus([]); setPriority(null); setProjectId(null); setQuery("");
    setTimeout(() => countRef.current?.focus());
  };
  const rows = tasks.filter((task) =>
    (!status.length || status.includes(task.status))
    && (!priority || task.priority === priority)
    && (!projectId || task.project === projectId)
    && `${task.title} ${task.key}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    // The table is the section's content, so it lies on the stage with its toolbar: no Card or Box around it.
    <Stack gap="md">
      <Stack direction="row" gap="xs" align="center" wrap>
        <Box width="fill" minWidth={220} maxWidth={240}><Search placeholder="Search tasks" value={query} onValueChange={setQuery} /></Box>
        <Stack direction="row" gap="xs" align="center" wrap role="group" aria-label="Filters">
          {/* Multiple: the counter shows how many values are on; one value shows as the label. */}
          <Chip variant="advanced" selectionMode="multiple" selectionCount={status.length} selected={status.length > 0} popoverMultiple
            popoverLabel="Status" popoverItems={statuses.map((value) => ({ id: value, label: value, selected: status.includes(value) }))}
            onPopoverSelect={(item) => toggleStatus(item.id as TaskStatus)} onClearSelection={() => setStatus([])}>
            {status.length === 1 ? status[0] : "Status"}
          </Chip>
          <Chip variant="advanced" selected={Boolean(priority)} popoverLabel="Priority"
            popoverItems={priorities.map((value) => ({ id: value, label: value, selected: value === priority }))}
            onPopoverSelect={(item) => setPriority(item.id as Priority)} onClearSelection={() => setPriority(null)}>
            {priority ?? "Priority"}
          </Chip>
          <Chip variant="advanced" selected={Boolean(project)} leading={project?.icon} popoverLabel="Project"
            popoverItems={taskProjects.map((item) => ({ id: item.id, label: item.name, caption: item.client, leading: item.icon, selected: item.id === projectId }))}
            onPopoverSelect={(item) => setProjectId(item.id)} onClearSelection={() => setProjectId(null)}>
            {project?.name ?? "Project"}
          </Chip>
          {/* Clear all only pays off once two filters are on. */}
          {active >= 2 ? <Button level="tertiary" onClick={clearAll}>Clear all</Button> : null}
        </Stack>
      </Stack>
      <Text ref={countRef} tabIndex={-1} role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "task")}</Text>
      <Table aria-label="Tasks" columns={columns} rows={rows}
        empty={<EmptyState size="sm" headingLevel={4} icon="icon-search-medium-line" title="No tasks match" secondaryAction={{ label: "Clear filters", onClick: clearAll }}>
          Try another status, priority or project.
        </EmptyState>} />
    </Stack>
  );
}
