import { useId, useState, type CSSProperties } from "react";
import {
  Avatar, BadgeStatus, DescriptionList, Heading, SidePanel, Stack, Table, TableBadges, TableMedia, TableTags, TableText, Tag, plural, useToast,
  type AvatarSize, type TableColumn,
} from "@zen-ds/react";
import { initials, people, taskStep, tasks, type Person, type PersonId, type TaskStatus } from "../../data";

/** People are Avatars: a photo when there is one, otherwise initials on the person's steady theme. Subtle beside other
 *  content; `lead` in a table's first column, the row's name, where initials are Solid (table/first-column-avatar-solid). */
function PersonAvatar({ person, size, lead = false }: { person: Person; size: AvatarSize; lead?: boolean }) {
  return person.photo
    ? <Avatar size={size} theme="photo" src={person.photo} alt="" />
    : <Avatar size={size} theme={person.theme} background={lead ? "solid" : "subtle"} alt="">{initials(person.name)}</Avatar>;
}

/* The fields people correct every day. */
type SprintTask = { id: string; key: string; title: string; assignee: PersonId; status: TaskStatus; estimate: number; labels: string[] };
function pickTask(id: string) {
  const task = tasks.find((item) => item.id === id)!;
  return { id: task.id, key: task.key, title: task.title, assignee: task.assignee, status: task.status };
}
const sprintTasks: SprintTask[] = [
  { ...pickTask("t1"), estimate: 12, labels: ["design", "ios"] },
  { ...pickTask("t2"), estimate: 8, labels: ["api"] },
  { ...pickTask("t3"), estimate: 6, labels: ["android", "qa"] },
  { id: "t11", key: "PHIN-226", title: "Empty state for members with no points", assignee: "gia", status: "To do", estimate: 3.5, labels: ["design"] },
  { id: "t12", key: "PHIN-208", title: "Points balance widget", assignee: "chi", status: "Done", estimate: 10, labels: ["design", "ios"] },
];
const taskStatuses: TaskStatus[] = ["To do", "In progress", "In review", "Done"];
const loyaltyTeam: PersonId[] = ["chi", "bao", "em", "duy", "gia"];
const labelSuggestions = ["design", "ios", "android", "api", "qa", "copy"];
const validateEstimate = (value: string) => {
  const hours = Number(value);
  if (!value.trim() || Number.isNaN(hours) || hours <= 0 || hours > 80) return "Enter 0.5 to 80 hours";
  return (hours * 2) % 1 ? "Round to half an hour" : undefined;
};

export default function LoyaltySprint() {
  const { toast } = useToast();
  const headingId = useId();
  const [rows, setRows] = useState(sprintTasks);
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = rows.find((row) => row.id === openId);
  const update = (id: string, patch: Partial<SprintTask>) => setRows((list) => list.map((row) => row.id === id ? { ...row, ...patch } : row));
  // Done tasks are locked, except their status, so a task can be reopened.
  const done = (row: SprintTask) => row.status === "Done";
  const columns: TableColumn<SprintTask>[] = [
    { id: "title", header: "Task", cell: (row) => <TableText bold caption={row.key}>{row.title}</TableText>, onOpen: (row) => setOpenId(row.id),
      edit: { type: "text", value: (row) => row.title, disabled: done, validate: (value) => value.trim() ? undefined : "Give the task a title",
        onCommit: (row, value) => update(row.id, { title: value.trim() }) } },
    { id: "assignee", header: "Assignee", width: "180px", cell: (row) => <TableMedia bold={false} media={<PersonAvatar person={people[row.assignee]} size="xs" />}>{people[row.assignee].name}</TableMedia>,
      edit: { type: "select", value: (row) => row.assignee, disabled: done, options: loyaltyTeam.map((id) => ({ value: id, label: people[id].name })),
        onCommit: (row, value) => update(row.id, { assignee: value as PersonId }) } },
    { id: "status", header: "Status", width: "150px", cell: (row) => <TableBadges><BadgeStatus status={taskStep[row.status]}>{row.status}</BadgeStatus></TableBadges>,
      edit: { type: "select", value: (row) => row.status, options: taskStatuses.map((status) => ({ value: status, label: status })),
        onCommit: (row, value) => {
          if (value === row.status) return;
          update(row.id, { status: value as TaskStatus });
          // A status change moves the task on the board, so it confirms in a Toast with Undo.
          toast({ title: `${row.key} moved to ${value}`, action: { label: "Undo", onClick: () => update(row.id, { status: row.status }) } });
        } } },
    { id: "estimate", header: "Estimate (h)", align: "right", width: "140px", cell: (row) => <TableText>{row.estimate.toFixed(1)}</TableText>,
      edit: { type: "number", value: (row) => row.estimate.toFixed(1), disabled: done, validate: validateEstimate,
        onCommit: (row, value) => update(row.id, { estimate: Number(value) }) } },
    { id: "labels", header: "Labels", width: "200px", cell: (row) => <TableTags>{row.labels.map((label) => <Tag key={label}>{label}</Tag>)}</TableTags>,
      edit: { type: "tags", value: (row) => row.labels, suggestions: labelSuggestions, disabled: done, onCommit: (row, labels) => update(row.id, { labels }) } },
  ];
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Heading level={4} id={headingId} textStyle="Heading/4">Loyalty app · Sprint 14</Heading>
      {/* --zen-table-fill-min-width (Table's CSS contract): task titles are the row's name, so on a narrow screen the
          table scrolls sideways before a title breaks into three lines. */}
      <Table aria-labelledby={headingId} columns={columns} rows={rows} style={{ "--zen-table-fill-min-width": "18rem" } as CSSProperties} />
      <SidePanel type="modal" open={Boolean(opened)} onOpenChange={(open) => { if (!open) setOpenId(null); }}
        title={opened?.title ?? ""} description={opened ? `${opened.key} · Loyalty app` : undefined}>
        {opened ? (
          <DescriptionList items={[
            { id: "status", term: "Status", description: <BadgeStatus status={taskStep[opened.status]}>{opened.status}</BadgeStatus> },
            { id: "assignee", term: "Assignee", description: people[opened.assignee].name },
            { id: "estimate", term: "Estimate", description: plural(opened.estimate, "hour") },
            { id: "labels", term: "Labels", description: opened.labels.join(", ") || "None" },
          ]} />
        ) : null}
      </SidePanel>
    </Stack>
  );
}
