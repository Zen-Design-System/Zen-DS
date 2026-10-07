/* Badge examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Status is always a Badge from one vocabulary per domain (data.ts theme maps);
   counts are a BadgeCounter; removable labels are Badges with onRemove. */
import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "../../../components/Avatar";
import { Badge, BadgeCounter, type BadgeTheme } from "../../../components/Badge";
import { BottomSheet } from "../../../components/BottomSheet";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import type { IconName } from "../../../components/Icon";
import { Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { Table, TableBadges, TableMedia, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { PlatformPhone } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import {
  TODAY, daysFromToday, formatDate, formatDue, formatMoney, formatRelative, initials, invoiceStatusTheme, invoices, people, priorityTheme, projectById, projects, taskStatusTheme, tasks,
  type InvoiceStatus, type Priority, type Task, type TaskStatus,
} from "../data";
import type { ExampleDef } from "../types";
import "./badge.css";

export const page: PlatformPage = "badge";

const taskStatuses: TaskStatus[] = ["To do", "In progress", "In review", "Done"];
const priorities: Priority[] = ["Urgent", "High", "Medium", "Low"];
/** Priority reads without colour: an arrow for the direction, an octagon for Urgent. */
const priorityIcon: Record<Priority, IconName> = { Urgent: "icon-alert-octagon-solid", High: "icon-arrow-up-line", Medium: "icon-equal-line", Low: "icon-arrow-down-line" };

// ——— 1. Task status in a table: Subtle badges, one vocabulary, at most two per row ——————————————————
function TaskStatusTable() {
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
  const columns: TableColumn<Task>[] = [
    { id: "task", header: "Task", cell: (task) => <TableText caption={task.key}>{task.title}</TableText> },
    { id: "assignee", header: "Assignee", width: "180px", cell: (task) => {
      const person = people[task.assignee];
      return <TableMedia bold={false} media={person.photo ? <Avatar size="xs" theme="photo" src={person.photo} alt="" /> : <Avatar size="xs" theme={person.theme} alt="">{initials(person.name)}</Avatar>}>{person.name}</TableMedia>;
    } },
    { id: "priority", header: "Priority", width: "128px", cell: (task) => <TableBadges><Badge size="md" theme={priorityTheme[task.priority]} background="subtle" leading={priorityIcon[task.priority]}>{task.priority}</Badge></TableBadges> },
    { id: "status", header: "Status", width: "136px", cell: (task) => <TableBadges><Badge size="md" theme={taskStatusTheme[task.status]} background="subtle">{task.status}</Badge></TableBadges> },
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
        empty={<EmptyState illustration={false} headingLevel={4} title="No tasks match"
          secondaryAction={{ label: "Clear filters", onClick: () => { setStatus(null); setPriority(null); } }}>Try another status or priority.</EmptyState>} />
    </Stack>
  );
}

// ——— 2. Invoice status: Solid for the one record in focus, changed by an action ——————————————————————
const overdue = invoices.find((invoice) => invoice.status === "Overdue")!;

function InvoiceStatus() {
  const { toast } = useToast();
  const titleId = useId();
  const [status, setStatus] = useState<InvoiceStatus>(overdue.status);
  const receiptRef = useRef<HTMLButtonElement>(null);
  const justPaid = useRef(false);
  const paid = status === "Paid";
  const project = projectById(overdue.project);
  // Mark as paid leaves the card, so focus moves to the action that takes its place.
  useEffect(() => { if (paid && justPaid.current) { justPaid.current = false; receiptRef.current?.focus(); } }, [paid]);
  const markPaid = () => {
    justPaid.current = true;
    setStatus("Paid");
    toast({ type: "positive", title: "Invoice marked as paid", action: { label: "Undo", onClick: () => setStatus("Overdue") } });
  };
  return (
    // Secondary actions live in the card's Sub-Action menu; the action that moves the invoice on sits at the bottom.
    <Card as="section" theme="flat" aria-labelledby={titleId}
      subAction={
        <Menu align="end" trigger={<IconButton appearance="flat" level="primary" size="sm" icon="icon-dots-horizontal-line" aria-label={`Actions for ${overdue.number}`} />}
          items={[
            { id: "remind", label: "Send reminder", icon: "icon-mail-01-line", disabled: paid, onSelect: () => toast({ title: "Reminder sent", children: `${overdue.client} gets a copy of ${overdue.number}.` }) },
            { id: "pdf", label: "Download PDF", icon: "icon-download-01-line", onSelect: () => toast({ title: "Download started", children: `${overdue.number}.pdf` }) },
          ]} />
      }>
      <Stack gap="md" align="stretch">
        <Stack direction="row" gap="md" align="start" justify="start">
          <DockIcon icon="icon-receipt-line" theme={project.theme} background="subtle" />
          <Stack gap="xs" align="stretch" className="px-badge-grow">
            {/* The status sits right after the number and wraps under it on a narrow card; it never truncates. */}
            <Stack direction="row" gap="sm" align="center" wrap>
              <Heading level={4} id={titleId} textStyle="Heading/Subheading">{overdue.number}</Heading>
              <Badge theme={invoiceStatusTheme[status]} leading={paid ? "icon-check-line" : "icon-alert-circle-line"} size="sm">{status}</Badge>
            </Stack>
            <Text textStyle="Body/Small/Regular" tone="base">{`${overdue.client} · ${project.name}`}</Text>
          </Stack>
        </Stack>
        <Stack direction="row" fillChildren width="fill">
          <DescriptionList items={[
            { term: "Amount", description: formatMoney(overdue.amount, true) },
            { term: "Issued", description: formatDate(overdue.issued) },
            { term: paid ? "Paid" : "Due", description: paid ? formatDate(TODAY) : `${formatDate(overdue.due)} · ${formatDue(overdue.due)}` },
          ]} divider />
        </Stack>
        <Stack direction="row" justify="end">
          {paid
            ? <Button ref={receiptRef} level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Download started", children: `${overdue.number} receipt.pdf` })}>Download receipt</Button>
            : <Button level="primary" onClick={markPaid}>Mark as paid</Button>}
        </Stack>
      </Stack>
    </Card>
  );
}

// ——— 3. Unread counts: BadgeCounter caps at 99+ and goes away at zero ——————————————————————————————
/** Unread updates per project channel (comments, file versions, status changes), latest first. */
const channels = [
  { project: projects[4], unread: 128, last: daysFromToday(0, 10, 12) },
  { project: projects[0], unread: 12, last: daysFromToday(0, 9, 48) },
  { project: projects[1], unread: 4, last: daysFromToday(-1, 17, 20) },
  { project: projects[2], unread: 1, last: daysFromToday(-2, 11, 5) },
  { project: projects[5], unread: 0, last: daysFromToday(-6, 15, 40) },
  { project: projects[3], unread: 0, last: daysFromToday(-12, 16, 0) },
];

function UnreadCounts() {
  const [current, setCurrent] = useState<string | null>(null);
  const [unread, setUnread] = useState<Record<string, number>>(() => Object.fromEntries(channels.map((channel) => [channel.project.id, channel.unread])));
  const total = Object.values(unread).reduce((sum, n) => sum + n, 0);
  // Opening a channel reads it: its counter clears and disappears.
  const listRef = useRef<HTMLUListElement>(null);
  const open = (id: string) => { setCurrent(id); setUnread((counts) => ({ ...counts, [id]: 0 })); };
  // The button goes away with the last unread update, so focus moves on to the first project.
  const markAllRead = () => {
    setUnread((counts) => Object.fromEntries(Object.keys(counts).map((id) => [id, 0])));
    listRef.current?.querySelector<HTMLElement>(".zen-list-item__wrapper")?.focus();
  };
  return (
    <Stack gap="md" align="stretch">
      <Stack direction="row" gap="xs" align="center" justify="between" wrap>
        <Text as="span" textStyle="Body/Small/Medium" tone="base" role="status">{total ? plural(total, "unread update") : "All caught up"}</Text>
        {total ? <Button level="tertiary" startIcon="icon-check-line" onClick={markAllRead}>Mark all as read</Button> : null}
      </Stack>
      {/* A list on the stage sits in a ListBox: its Body-Slot insets the rows and keeps the fill (12px out) inside. */}
      <ListBox>
        <List ref={listRef} aria-label="Project updates">
          {channels.map(({ project, last }) => {
            const count = unread[project.id];
            return (
              // The counter takes room at the end, so a long project name wraps to a second line instead of being cut.
              <ListItem key={project.id} selected={current === project.id} onClick={() => open(project.id)}
                leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />}
                title={<>{project.name}{count ? <VisuallyHidden>{`, ${count} unread`}</VisuallyHidden> : null}</>} titleLines={2}
                caption={`${project.client} · ${formatRelative(last)}`}
                trailing={count > 0 ? <BadgeCounter value={count > 99 ? "99+" : count} aria-hidden="true" /> : null} />
            );
          })}
        </List>
      </ListBox>
    </Stack>
  );
}

// ——— 4. Removable labels: Badge remove + onRemove, with Undo ————————————————————————————————————
type Label = { id: string; name: string; theme: BadgeTheme };
const labelSet: Label[] = [
  { id: "ios", name: "iOS", theme: "blue" },
  { id: "android", name: "Android", theme: "green" },
  { id: "rewards", name: "Rewards", theme: "orange" },
  { id: "copy", name: "Needs copy", theme: "yellow" },
  { id: "a11y", name: "Accessibility", theme: "purple" },
];

function RemovableLabels() {
  const { toast } = useToast();
  const labelsId = useId();
  const [labels, setLabels] = useState(labelSet);
  const [applied, setApplied] = useState(["ios", "rewards", "copy"]);
  const [query, setQuery] = useState("");
  const task = tasks[0];
  const available = labels.filter((label) => !applied.includes(label.id));
  const sectionRef = useRef<HTMLElement>(null);
  const remove = (label: Label) => {
    const before = applied;
    const shown = labels.filter((item) => before.includes(item.id));
    const index = shown.findIndex((item) => item.id === label.id);
    setApplied(before.filter((id) => id !== label.id));
    toast({ title: `${label.name} label removed`, action: { label: "Undo", onClick: () => setApplied(before) } });
    // The badge and its button are gone: focus moves to the next label's Remove (or the one before), else Add label.
    requestAnimationFrame(() => {
      const buttons = sectionRef.current?.querySelectorAll<HTMLElement>(".zen-badge__remove") ?? [];
      (buttons[Math.min(index, buttons.length - 1)] ?? sectionRef.current?.querySelector<HTMLElement>(".zen-chip"))?.focus();
    });
  };
  const create = (name: string) => {
    const id = `label-${labels.length + 1}`;
    setLabels((all) => [...all, { id, name, theme: "neutral" }]);
    setApplied((ids) => [...ids, id]);
    setQuery("");
  };
  return (
    <Card theme="flat">
      <Stack gap="md" align="stretch">
        <Stack gap="xs" align="stretch">
          <Heading level={4} textStyle="Heading/Subheading">{task.title}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${task.key} · ${projectById(task.project).name}`}</Text>
        </Stack>
        <Stack as="section" ref={sectionRef} gap="xs" align="stretch" aria-labelledby={labelsId}>
          <Heading level={5} id={labelsId} textStyle="Body/Small/Bold" tone="light">Labels</Heading>
          <Stack direction="row" gap="xs" align="center" wrap>
            {/* The applied labels are a list; each Remove button is named after its label ("Remove iOS"). */}
            {applied.length ? (
              <Stack as="ul" direction="row" gap="2xs" align="center" wrap className="px-badge-list" aria-labelledby={labelsId}>
                <Chip variant="advanced" dropdown leading="icon-plus-line" popoverLabel="Add a label or create one"
                  popoverItems={available.map((label) => ({ id: label.id, label: label.name }))}
                  popoverSearchValue={query} onPopoverSearchChange={setQuery} popoverSearchPlaceholder="Label name"
                  onPopoverSelect={(item) => { setApplied((ids) => [...ids, item.id]); setQuery(""); }} onPopoverCreate={create}>Add label</Chip>
                {labels.filter((label) => applied.includes(label.id)).map((label) => (
                  <li key={label.id}><Badge theme={label.theme} background="subtle" leadingIcon={false} remove onRemove={() => remove(label)}>{label.name}</Badge></li>
                ))}
              </Stack>
            ) : <Text as="span" textStyle="Body/Small/Regular" tone="base">No labels yet</Text>}
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}

// ——— 5. Status on a phone: a Subtle badge at the end of each row, the caption follows the status ——————————
type PhoneTask = Task & { finished?: Date };
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

function MobileTasks() {
  const screenRef = useRef<HTMLDivElement>(null);
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
    <PlatformPhone label="Tasks" headerOverlay screenRef={screenRef}
      header={<TopNavigation title="Tasks" largeTitle="Tasks" scrollRef={screenRef} />}>
      <Stack gap="md" align="stretch">
        <Stack direction="row" gap="xs" className="px-badge-chip-row" role="group" aria-label="Filter by status">
          {(["All", ...taskStatuses] as const).map((option) => (
            <Chip key={option} variant="normal" level="primary" selected={filter === option} onClick={() => setFilter(option)}>{option}</Chip>
          ))}
        </Stack>
        {/* The rows sit in the screen margin (Margin/Comfortable, 20px); the count sits xs above them. */}
        <Stack gap="xs" align="stretch" paddingX="lg">
          <Text textStyle="Body/Small/Regular" tone="light" role="status">{plural(rows.length, "task")}</Text>
          <List aria-label="Tasks">
            {rows.map((task) => (
              <ListItem key={task.id} onClick={() => setOpenId(task.id)} title={task.title}
                caption={`${task.key} · ${task.finished ? finishedLabel(task.finished) : formatDue(task.due)}`}
                trailing={<Badge theme={taskStatusTheme[task.status]} background="subtle">{task.status}</Badge>} />
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
              <Badge theme={taskStatusTheme[opened.status]} background="subtle">{opened.status}</Badge>
            </Stack>
            <DescriptionList items={[
              { term: "Project", description: projectById(opened.project).name },
              { term: "Assignee", description: people[opened.assignee].name },
              opened.finished ? { term: "Finished", description: formatDate(opened.finished) } : { term: "Due", description: formatDate(opened.due) },
            ]} />
          </Stack>
        </BottomSheet>
      ) : null}
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "Task status",
    wide: true,
    description: "A task table shows status and priority as Subtle badges from one fixed vocabulary, two per row at most; priority adds an icon so it reads without colour. Filtering is a Chip, never a clickable badge.",
    render: () => <TaskStatusTable />,
    code: `const statusTheme = { "To do": "neutral", "In progress": "blue", "In review": "purple", Done: "green" };
const priorityIcon = { Urgent: "icon-alert-octagon-solid", High: "icon-arrow-up-line", Medium: "icon-equal-line", Low: "icon-arrow-down-line" };

const columns = [
  { id: "task", header: "Task", cell: (t) => <TableText caption={t.key}>{t.title}</TableText> },
  { id: "priority", header: "Priority", width: "128px", cell: (t) => <TableBadges>
    <Badge size="md" theme={priorityTheme[t.priority]} background="subtle" leading={priorityIcon[t.priority]}>{t.priority}</Badge>
  </TableBadges> },
  { id: "status", header: "Status", width: "136px", cell: (t) => <TableBadges>
    <Badge size="md" theme={statusTheme[t.status]} background="subtle">{t.status}</Badge>
  </TableBadges> },
];

<Stack gap="md">
  <Chip variant="advanced" dropdown selected={status !== null} popoverLabel="Status"
    popoverItems={statuses.map((s) => ({ id: s, label: s, selected: status === s }))}
    onPopoverSelect={(item) => setStatus(status === item.id ? null : item.id)} onClearSelection={() => setStatus(null)}>
    {status ?? "Status"}
  </Chip>
  {/* The table lies on the page: no Card or Box around it */}
  <Table aria-label="Studio tasks" columns={columns} rows={rows} empty={<EmptyState title="No tasks match" … />} />
</Stack>`,
  },
  {
    title: "Unread counts",
    description: "Counts are a BadgeCounter, capped at 99+ and gone at zero. Opening a project reads it and clears its counter; the row's name carries the count for screen readers.",
    render: () => <UnreadCounts />,
    code: `<ListBox>
  <List aria-label="Project updates">
    {channels.map(({ project, last }) => {
      const count = unread[project.id];
      return (
        <ListItem key={project.id} selected={current === project.id} onClick={() => open(project.id)}
          leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />}
          title={<>{project.name}{count ? <VisuallyHidden>{\`, \${count} unread\`}</VisuallyHidden> : null}</>} titleLines={2}
          caption={\`\${project.client} · \${formatRelative(last)}\`}
          trailing={count > 0 ? <BadgeCounter value={count > 99 ? "99+" : count} aria-hidden="true" /> : null} />
      );
    })}
  </List>
</ListBox>`,
  },
  {
    title: "Status on a phone",
    description: "On a phone the status sits at the end of each row as a Subtle badge, and the caption follows it: open tasks say when they're due, finished ones when they were done. Open a task and move it on: the badge in the sheet and in the row change together.",
    render: () => <MobileTasks />,
    code: `const screenRef = useRef<HTMLDivElement>(null);
// Only open work has a due date to warn about; Done says when it finished.
const caption = (task) => \`\${task.key} · \${task.status === "Done" ? finishedLabel(task.finished) : formatDue(task.due)}\`;

<PlatformPhone headerOverlay screenRef={screenRef}
  header={<TopNavigation title="Tasks" largeTitle="Tasks" scrollRef={screenRef} />}>
  {["All", "To do", "In progress", "In review", "Done"].map((option) => (
    <Chip key={option} variant="normal" level="primary"
      selected={filter === option} onClick={() => setFilter(option)}>{option}</Chip>
  ))}
  {/* In the screen margin (20px); the count sits xs above the rows */}
  <Stack gap="xs" paddingX="lg">
    <Text textStyle="Body/Small/Regular" tone="light" role="status">{plural(rows.length, "task")}</Text>
    <List aria-label="Tasks">
      {rows.map((task) => (
        <ListItem key={task.id} onClick={() => setOpenId(task.id)} title={task.title} caption={caption(task)}
          trailing={<Badge theme={statusTheme[task.status]} background="subtle">{task.status}</Badge>} />
      ))}
    </List>
  </Stack>
  <BottomSheet inline open={openId !== null} onOpenChange={close} title={task.key}
    primaryAction={{ label: "Send for review", onClick: () => moveTo("In review") }} secondaryAction={{ label: "Close" }}>
    <Text textStyle="Body/Extra/Medium">{task.title}</Text>
    <Badge theme={statusTheme[task.status]} background="subtle">{task.status}</Badge>
  </BottomSheet>
</PlatformPhone>`,
  },
  {
    title: "Invoice status",
    description: "On the invoice itself, a Solid badge gives the status weight. It changes when the invoice does (Mark as paid, then Undo in the toast), never by clicking the badge.",
    render: () => <InvoiceStatus />,
    code: `const theme = { Draft: "neutral", Sent: "blue", Paid: "green", Overdue: "red" };

<Card as="section" theme="flat" aria-labelledby={titleId}
  subAction={<Menu align="end"
    trigger={<IconButton appearance="flat" level="primary" size="sm" icon="icon-dots-horizontal-line" aria-label="Actions for INV-2026-0139" />}
    items={[
      { id: "remind", label: "Send reminder", icon: "icon-mail-01-line", disabled: status === "Paid", onSelect: sendReminder },
      { id: "pdf", label: "Download PDF", icon: "icon-download-01-line", onSelect: downloadPdf },
    ]} />}>
  <Stack direction="row" gap="sm" align="center" wrap>
    <Heading level={4} id={titleId} textStyle="Heading/Subheading">INV-2026-0139</Heading>
    <Badge theme={theme[status]} leading={status === "Paid" ? "icon-check-line" : "icon-alert-circle-line"}>{status}</Badge>
  </Stack>
  …
  <Stack direction="row" justify="end">
    {status === "Paid"
      ? <Button level="tertiary" startIcon="icon-download-01-line" onClick={downloadReceipt}>Download receipt</Button>
      : <Button level="primary" onClick={() => {
          setStatus("Paid");
          toast({ type: "positive", title: "Invoice marked as paid", action: { label: "Undo", onClick: () => setStatus("Overdue") } });
        }}>Mark as paid</Button>}
  </Stack>
</Card>`,
  },
  {
    title: "Removable labels",
    description: "Labels on a task are Subtle badges with Remove wired to onRemove, and the toast offers Undo. Add label picks a label not yet applied, or creates a new one.",
    render: () => <RemovableLabels />,
    code: `<Stack as="ul" direction="row" gap="2xs" wrap aria-labelledby={labelsId}>
  {applied.map((label) => (
    <li key={label.id}>
      <Badge theme={label.theme} background="subtle" leadingIcon={false}
        remove onRemove={() => {
          setApplied((ids) => ids.filter((id) => id !== label.id));
          toast({ title: \`\${label.name} label removed\`, action: { label: "Undo", onClick: restore } });
          focusNextRemove(label); // the next label's Remove, or Add label
        }}>{label.name}</Badge>
    </li>
  ))}
</Stack>
<Chip variant="advanced" dropdown leading="icon-plus-line" popoverLabel="Add a label or create one"
  popoverItems={available.map((l) => ({ id: l.id, label: l.name }))}
  popoverSearchValue={query} onPopoverSearchChange={setQuery}
  onPopoverSelect={(item) => setApplied((ids) => [...ids, item.id])}
  onPopoverCreate={createLabel}>Add label</Chip>`,
  },
];
