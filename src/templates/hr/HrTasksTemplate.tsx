/**
 * Template: HR · Workbench › All tasks. Every task across the studio's spaces, in two views of the same work:
 * - List: one Table per status (each group collapses) with Task, Assignees, Due date, Priority and Status; Due date and
 *   Priority sort. A row opens the task; its ⋯ moves the task to another status or deletes it.
 * - Board: a column per status of clickable task cards. Drag a card to another column to move it.
 * - Search and the Assignee, Priority and Space filter chips narrow both views; a Space in the Sidebar picks its filter.
 * - A task opens in a Side Panel: status, priority, assignees, due date, description and checklist apply at once.
 * - Moves and deletes act at once and offer Undo in a Toast; New task opens a validated ModalForm.
 *
 * Copy it with ./HrShell, ./data and ./assets into your app and replace the sample data. Render it inside your app's
 * <ZenProvider>. Uses only @zen/design-system components, no custom CSS.
 */
import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import {
  AutocompleteField,
  Avatar,
  AvatarStack,
  Badge,
  BadgeCounter,
  BottomSheet,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Container,
  DateField,
  DescriptionList,
  EmptyState,
  Grid,
  Heading,
  Icon,
  IconButton,
  InputField,
  List,
  ListItem,
  Menu,
  ModalForm,
  PageHeader,
  ProgressBar,
  ProgressCircle,
  Search,
  Segmented,
  SelectField,
  SidePanel,
  Stack,
  Table,
  TableActions,
  TableBadges,
  TableMedia,
  TableText,
  Text,
  TextAreaField,
  VisuallyHidden,
  plural,
  useFormState,
  useToast,
  useZen,
  type PopoverItemData,
  type TableColumn,
  type TableSort,
} from "@zen/design-system";
import { HrShell, hrModules, type HrNavigate } from "./HrShell";
import {
  avatarOf,
  currentUser,
  daysFromToday,
  formatDate,
  formatRelative,
  now,
  people,
  personList,
  spaceList,
  spaces,
  taskPriorities,
  taskPriorityMeta,
  taskLabelTheme,
  taskStatuses,
  taskStatusProgress,
  taskStatusTheme,
  tasks as seedTasks,
  toDate,
  toIsoDay,
  today,
  type Person,
  type PersonId,
  type SpaceId,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "./data";

/* ── Data: the workspace's tasks, each with its checklist ───────────────────────────────────────────────────────── */
type ChecklistItem = { id: string; label: string; done: boolean };
type WorkTask = Task & { checklist: ChecklistItem[] };
type View = "list" | "board";

const checklistOf = (id: string, items: Array<[label: string, done: boolean]>): ChecklistItem[] =>
  items.map(([label, done], index) => ({ id: `${id}-${index + 1}`, label, done }));
/** Sample checklists; the other tasks start without one. */
const seedChecklists: Record<string, ChecklistItem[]> = {
  "PD-142": checklistOf("PD-142", [["Map the current seven steps", true], ["Merge the account and profile steps", true], ["Move identity checks after sign-up", false], ["Prototype the four-step flow", false]]),
  "PD-138": checklistOf("PD-138", [["Data cells and headers", true], ["Hover and selected rows", true], ["Empty and loading rows", false]]),
  "PD-140": checklistOf("PD-140", [["Success state", true], ["Pending state", true], ["Failed state with retry", true]]),
  "PD-136": checklistOf("PD-136", [["Loading loop", true], ["Success tick", false], ["Error shake", false]]),
  "DEV-311": checklistOf("DEV-311", [["Reproduce in Safari 18", true], ["Keep focus inside the open calendar", false], ["Return focus to the field on close", false]]),
  "MKT-58": checklistOf("MKT-58", [["Outline the story", true], ["Collect launch numbers from Hana", true], ["First draft", false], ["Review with Alex", false]]),
};
const initialTasks: WorkTask[] = seedTasks.map((task) => ({ ...task, checklist: seedChecklists[task.id] ?? [] }));

/** Everyone who can be assigned, the signed-in person first. */
const assignable: Person[] = [currentUser, ...personList.filter((person) => person.id !== currentUser.id)];
const priorityRank: Record<TaskPriority, number> = { Low: 0, Medium: 1, High: 2, Urgent: 3 };
const sorters: Record<string, (a: WorkTask, b: WorkTask) => number> = {
  due: (a, b) => a.due.localeCompare(b.due),
  priority: (a, b) => priorityRank[a.priority] - priorityRank[b.priority],
};
const views = [
  { id: "list", label: "List", leading: "icon-list-line" },
  { id: "board", label: "Board", leading: "icon-kanban-chart-square-03-line" },
];
const statusOptions = taskStatuses.map((status) => ({ label: status, value: status }));
const priorityOptions = taskPriorities.map((priority) => ({ label: priority, value: priority }));
const spaceOptions = spaceList.map((space) => ({ label: space.name, value: space.id }));
const spaceNames = spaceList.map((space) => space.name);
const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

/* ── Small pieces shared by the list, the board and the panel ──────────────────────────────────────────────────── */
/** The status mark: an empty ring for To do, a quarter, a half, and a tick when Done (the Badge themes are ring themes too). */
const StatusMark = ({ status }: { status: TaskStatus }) => (
  <ProgressCircle value={taskStatusProgress[status]} theme={taskStatusTheme[status] as "neutral" | "blue" | "yellow" | "green"} aria-label={status} />
);
const StatusBadge = ({ status }: { status: TaskStatus }) => <Badge theme={taskStatusTheme[status]} background="subtle">{status}</Badge>;
/** The priority flag in the priority's colour; `named` gives it a name when no label follows it. */
const PriorityFlag = ({ priority, size = "base", named = false }: { priority: TaskPriority; size?: "sm" | "base"; named?: boolean }) => (
  <Icon name={taskPriorityMeta[priority].icon} size={size} tone={taskPriorityMeta[priority].tone} title={named ? `${priority} priority` : undefined} decorative={!named} />
);
/** People on a task: a stack of XSmall Avatars (Avatar/Stack Small), names in the alt text and the detail panel. */
const Assignees = ({ ids }: { ids: PersonId[] }) => (ids.length
  ? <AvatarStack size="xs" background="subtle" max={3} showMore items={ids.map((id) => avatarOf(people[id]))} />
  : null);
/** A person inside a Tag or a picker row: an XXSmall Avatar with one initial. */
const personMark = (person: Person) => <Avatar size="2xs" background="subtle" {...avatarOf(person)} alt="">{person.photo ? undefined : person.initials[0]}</Avatar>;
const assigneeOptions = assignable.map((person) => ({ id: person.id, label: person.name, leading: personMark(person) }));
/** The people picker of the panel and the New task form: a Tag per person, with their Avatar. */
const AssigneesField = ({ value, onValueChange, error }: { value: string[]; onValueChange: (ids: PersonId[]) => void; error?: string }) => (
  <AutocompleteField label="Assignees" options={assigneeOptions} value={value} onValueChange={(ids) => onValueChange(ids as PersonId[])} error={error}
    addLabel="Add person" popoverLabel="People" searchPlaceholder="Search people" />
);

/** How close the due date is: overdue and today are called out; Done tasks never are. */
function dueNote(task: WorkTask): { text: string; overdue: boolean } | null {
  if (task.status === "Done") return null;
  const days = daysFromToday(task.due);
  if (days < 0) return { text: `${plural(-days, "day")} overdue`, overdue: true };
  if (days === 0) return { text: "Today", overdue: false };
  if (days === 1) return { text: "Tomorrow", overdue: false };
  return null;
}

/* ── DateField speaks MM/DD/YYYY, the data ISO days ─────────────────────────────────────────────────────────────── */
const pad = (value: number) => String(value).padStart(2, "0");
const toFieldDate = (day: string) => { const date = toDate(day); return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`; };
const fromFieldDate = (text: string) => {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const date = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
  return date.getMonth() === Number(match[1]) - 1 ? toIsoDay(date) : null;
};

type TaskValues = { title: string; space: string; project: string; status: string; priority: string; assignees: string[]; due: string; description: string };
const blankTask: TaskValues = { title: "", space: "product-design", project: spaces["product-design"].projects[0], status: "To do", priority: "Medium", assignees: [currentUser.id], due: "", description: "" };

export function HrTasksTemplate() {
  const { toast, dismiss } = useToast();
  const phone = useZen()?.breakpoint === "mobile";
  // Clearing the search or the filters removes the button that did it, so focus goes back to Search.
  const searchRef = useRef<HTMLInputElement>(null);
  // Add item with nothing typed moves focus to the checklist field instead of doing nothing.
  const newItemRef = useRef<HTMLInputElement>(null);
  const newTaskRef = useRef<HTMLButtonElement>(null);
  // After a delete (or its Undo) focus moves to a task that is still there, never to <body>: the next row in the same
  // group (else the one before), the restored task, or New task when the group is gone ("" = New task).
  const [focusTask, setFocusTask] = useState<string | null>(null);
  useEffect(() => {
    if (focusTask === null) return;
    setFocusTask(null);
    const item = focusTask ? document.querySelector<HTMLElement>(`[data-task="${focusTask}"]`) : null;
    const control = item?.matches("button, [tabindex]") ? item : item?.querySelector<HTMLElement>(".zen-list-item__wrapper, button");
    (control ?? (focusTask ? document.querySelector<HTMLElement>(`[aria-label="Actions for ${focusTask}"]`) : null) ?? newTaskRef.current)?.focus();
  }, [focusTask]);
  const [items, setItems] = useState(initialTasks);
  const [view, setView] = useState<View>("list");
  const [query, setQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [spaceFilter, setSpaceFilter] = useState<string[]>([]);
  // On a phone each filter chip opens its choices in a Bottom Sheet (the name of the open filter).
  const [sheet, setSheet] = useState<"Assignee" | "Priority" | "Space" | null>(null);
  const [sort, setSort] = useState<TableSort | null>({ columnId: "due", direction: "asc" });
  const [collapsed, setCollapsed] = useState<TaskStatus[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // Board drag and drop: the card in flight and the column under it.
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
  // Panel drafts: the due date while it is typed, and the next checklist item.
  const [dueDraft, setDueDraft] = useState<string | null>(null);
  const [dueLeft, setDueLeft] = useState(false);
  const [newItem, setNewItem] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((task) =>
      (!q || [task.title, task.id, task.project, ...task.assignees.map((id) => people[id].name)].some((text) => text.toLowerCase().includes(q)))
      && (!assigneeFilter.length || task.assignees.some((id) => assigneeFilter.includes(id)))
      && (!priorityFilter.length || priorityFilter.includes(task.priority))
      && (!spaceFilter.length || spaceFilter.includes(task.space)));
    const sorter = sort ? sorters[sort.columnId] : undefined;
    if (!sort || !sorter) return list;
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...list].sort((a, b) => sorter(a, b) * direction);
  }, [items, query, assigneeFilter, priorityFilter, spaceFilter, sort]);
  const byStatus = (status: TaskStatus) => shown.filter((task) => task.status === status);
  const opened = items.find((task) => task.id === openId) ?? null;
  const activeFilters = [query.trim(), assigneeFilter.length, priorityFilter.length, spaceFilter.length].filter(Boolean).length;
  const clearFilters = () => { setQuery(""); setAssigneeFilter([]); setPriorityFilter([]); setSpaceFilter([]); searchRef.current?.focus(); };
  const clearSearch = () => { setQuery(""); searchRef.current?.focus(); };

  const navigate: HrNavigate = ({ module, page }) => {
    if (module === "workbench" && page === "tasks") return;
    // A space in the Sidebar shows its tasks through the Space filter.
    if (module === "workbench" && page?.startsWith("space-")) {
      const id = page.slice("space-".length);
      if (id in spaces) setSpaceFilter([id]);
      else toast({ title: "No tasks in this space yet" });
      return;
    }
    if (module === "home") { toast({ title: "Home isn't part of this demo" }); return; }
    const { title, sections } = hrModules[module];
    const pages = sections.flatMap((section) => section.items.flatMap((item) => [item, ...(item.children ?? [])]));
    toast({ title: `${pages.find((item) => item.id === (page ?? pages[0]?.id))?.label ?? title} isn't part of this demo` });
  };

  /* ── Task changes: every edit shows at once; moves and deletes offer Undo (the Toast closes once it's used) ── */
  // An edit stamps the task as updated now; Undo passes the old stamp back.
  const update = (id: string, patch: Partial<WorkTask>) =>
    setItems((list) => list.map((task) => (task.id === id ? { ...task, updated: now, ...patch } : task)));
  const move = (task: WorkTask, status: TaskStatus) => {
    if (task.status === status) return;
    update(task.id, { status });
    const toastId = toast({ title: "Task moved", children: `${task.id} · ${status}`, action: { label: "Undo", onClick: () => { update(task.id, { status: task.status, updated: task.updated }); dismiss(toastId); } } });
  };
  const remove = (task: WorkTask) => {
    const index = items.findIndex((item) => item.id === task.id);
    const group = byStatus(task.status);
    const at = group.findIndex((item) => item.id === task.id);
    setItems((list) => list.filter((item) => item.id !== task.id));
    if (openId === task.id) setOpenId(null);
    setFocusTask((group[at + 1] ?? group[at - 1])?.id ?? "");
    const toastId = toast({ title: "Task deleted", children: `${task.id} · ${task.title}`, action: { label: "Undo", onClick: () => { setItems((list) => [...list.slice(0, index), task, ...list.slice(index)]); setFocusTask(task.id); dismiss(toastId); } } });
  };
  const openTask = (id: string) => { setOpenId(id); setDueDraft(null); setDueLeft(false); setNewItem(""); };
  const addChecklistItem = (task: WorkTask) => {
    const label = newItem.trim();
    if (!label) { newItemRef.current?.focus(); return; }
    update(task.id, { checklist: [...task.checklist, { id: `${task.id}-${Date.now()}`, label, done: false }] });
    setNewItem("");
  };

  /* ── New task: a validated ModalForm; the key continues its space's numbering (PD-146 next) ── */
  const form = useFormState({
    initialValues: blankTask,
    validate: (values) => {
      const due = fromFieldDate(values.due);
      return {
        ...(values.title.trim() ? {} : { title: "Name the task, like Review the pricing page" }),
        ...(!values.due.trim() ? { due: "Pick a due date" } : !due ? { due: "Enter the date as MM/DD/YYYY" } : due < today ? { due: "Pick today or a later day" } : {}),
      };
    },
    onSubmit: (values) => {
      const space = spaces[values.space as SpaceId];
      const next = Math.max(0, ...items.filter((task) => task.space === space.id).map((task) => Number(task.id.split("-")[1]))) + 1;
      const task: WorkTask = {
        id: `${space.key}-${next}`, title: values.title.trim(), space: space.id, project: values.project, status: values.status as TaskStatus,
        priority: values.priority as TaskPriority, assignees: values.assignees as PersonId[], reporter: currentUser.id, due: fromFieldDate(values.due) ?? today,
        labels: [], description: values.description.trim(), updated: now, checklist: [],
      };
      setItems((list) => [task, ...list]);
      setCreating(false);
      const toastId = toast({ title: "Task created", children: `${task.id} · ${task.status}`, action: { label: "View", onClick: () => { openTask(task.id); dismiss(toastId); } } });
    },
  });
  const startTask = (preset: Partial<TaskValues> = {}) => { form.reset({ ...blankTask, ...preset }); setOpenId(null); setCreating(true); };
  const formSpace = spaces[form.values.space as SpaceId];

  /* ── Toolbar: Search, three filter chips (Clear all once two are on) and the view switch ── */
  const filters: Record<"Assignee" | "Priority" | "Space", { options: PopoverItemData[]; picked: string[]; setPicked: (next: string[]) => void }> = {
    Assignee: { options: assignable.map((person) => ({ id: person.id, label: person.name, caption: person.id === currentUser.id ? "You" : person.role, leading: <Avatar size="sm" background="subtle" {...avatarOf(person)} alt="" />, theme: "avatar-small" })), picked: assigneeFilter, setPicked: setAssigneeFilter },
    Priority: { options: taskPriorities.map((priority) => ({ id: priority, label: priority, leading: <PriorityFlag priority={priority} /> })), picked: priorityFilter, setPicked: setPriorityFilter },
    Space: { options: spaceList.map((space) => ({ id: space.id, label: space.name, caption: space.key })), picked: spaceFilter, setPicked: setSpaceFilter },
  };
  // Desktop: the chip's Popover. Phone: the chip opens a Bottom Sheet with the same choices (popovers are for pointers).
  const filterChip = (id: keyof typeof filters) => {
    const { options, picked, setPicked } = filters[id];
    const label = picked.length === 1 ? String(options.find((option) => option.id === picked[0])?.label ?? id) : id;
    const shared = { variant: "advanced", size: "md", dropdown: true, selectionMode: "multiple", selected: picked.length > 0, selectionCount: picked.length, onClearSelection: () => setPicked([]) } as const;
    return phone
      ? <Chip key={id} {...shared} aria-haspopup="dialog" aria-expanded={sheet === id} onClick={() => setSheet(id)}>{label}</Chip>
      : (
        <Chip key={id} {...shared} popoverMultiple popoverLabel={id} popoverItems={options.map((option) => ({ ...option, selected: picked.includes(option.id) }))}
          onPopoverSelect={(item) => setPicked(toggle(picked, item.id))}>{label}</Chip>
      );
  };
  const toolbar = (
    <Grid columns={{ mobile: 1, desktop: "minmax(0, 280px) minmax(0, 1fr) auto" }} gap="sm" align="start">
      <Search ref={searchRef} aria-label="Search tasks" placeholder="Search tasks" value={query} onValueChange={setQuery} />
      {/* On a phone the chips stay on one row that scrolls sideways. */}
      <Stack direction="row" gap="xs" align="center" wrap={!phone} paddingY={phone ? "2xs" : undefined} style={phone ? { overflowX: "auto" } : undefined}>
        {filterChip("Assignee")}
        {filterChip("Priority")}
        {filterChip("Space")}
        {activeFilters >= 2 ? <Button level="tertiary" onClick={clearFilters}>Clear all</Button> : null}
      </Stack>
      <Segmented aria-label="Task view" options={views} value={view} onValueChange={(id) => setView(id as View)} fullWidth={phone} />
    </Grid>
  );
  const noMatch = query.trim() && !assigneeFilter.length && !priorityFilter.length && !spaceFilter.length
    ? <EmptyState title={`No results for “${query.trim()}”`} headingLevel={2} illustration={false} icon="icon-search-medium-line" secondaryAction={{ label: "Clear search", onClick: clearSearch }}>Search by title, key, project or assignee.</EmptyState>
    : <EmptyState title="No tasks match" headingLevel={2} illustration={false} icon="icon-search-medium-line" secondaryAction={{ label: "Clear filters", onClick: clearFilters }}>Try another assignee, priority or space.</EmptyState>;

  /* ── List: one table per status, each under a collapsible h2 ── */
  const columns: TableColumn<WorkTask>[] = [
    { id: "task", header: "Task", cell: (task) => <TableText bold caption={`${task.id} · ${task.project}`}>{task.title}</TableText> },
    { id: "assignees", header: "Assignees", width: "112px", cell: (task) => <Assignees ids={task.assignees} /> },
    { id: "due", header: "Due date", width: "144px", sortable: true, cell: (task) => {
      const note = dueNote(task);
      return <TableText caption={note?.text}>{note?.overdue ? <Text as="span" tone="negative">{formatDate(task.due)}</Text> : formatDate(task.due)}</TableText>;
    } },
    { id: "priority", header: "Priority", width: "128px", sortable: true, cell: (task) => <TableMedia bold={false} media={<PriorityFlag priority={task.priority} />}>{task.priority}</TableMedia> },
    { id: "status", header: "Status", width: "152px", cell: (task) => <TableBadges><StatusBadge status={task.status} /></TableBadges> },
    { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, width: "56px", align: "right", cell: (task) => (
      <TableActions>
        <Menu align="end" trigger={<IconButton appearance="flat" level="primary" size="md" icon="icon-dots-horizontal-line" aria-label={`Actions for ${task.id}`} />}
          items={[
            { type: "group", label: "Move to", items: taskStatuses.filter((status) => status !== task.status).map((status) => ({ id: `move-${status}`, label: status, onSelect: () => move(task, status) })) },
            { type: "separator" },
            { id: "delete", label: "Delete task", danger: true, onSelect: () => remove(task) },
          ]} />
      </TableActions>
    ) },
  ];
  const listView = (
    <Stack gap="xl">
      {taskStatuses.map((status) => {
        const rows = byStatus(status);
        if (!rows.length) return null;
        const open = !collapsed.includes(status);
        const headingId = `hr-tasks-group-${status.replace(/\s+/g, "-").toLowerCase()}`;
        return (
          // The rows pad 12px above and below themselves, so the header sits xs above them on every device.
          <Stack key={status} gap="xs">
            <Stack direction="row" gap="xs" align="center">
              <IconButton appearance="flat" level="primary" size={phone ? "md" : "sm"} icon={open ? "icon-chevron-down-01-line" : "icon-chevron-right-01-line"}
                aria-label={`${open ? "Collapse" : "Expand"} ${status}`} aria-expanded={open}
                onClick={() => setCollapsed((list) => (open ? [...list, status] : list.filter((item) => item !== status)))} />
              <StatusMark status={status} />
              <Heading level={2} textStyle="Heading/4" id={headingId}>{status}</Heading>
              <BadgeCounter theme="neutral" background="subtle" value={rows.length} />
            </Stack>
            {!open ? null : phone ? (
              // A phone lists the same rows: key, due date and priority in the caption, the people at the end.
              <List aria-labelledby={headingId}>
                {rows.map((task) => {
                  const note = dueNote(task);
                  return <ListItem key={task.id} data-task={task.id} title={task.title} caption={`${task.id} · ${note?.text ?? formatDate(task.due, { year: false })} · ${task.priority} priority`}
                    trailing={<Assignees ids={task.assignees} />} selected={task.id === openId} onClick={() => openTask(task.id)} />;
                })}
              </List>
            ) : (
              // The open task's row stays selected while its panel is open.
              <Table aria-labelledby={headingId} rows={rows} getRowId={(task) => task.id} columns={columns} sort={sort} onSortChange={setSort}
                selectedIds={openId ? [openId] : []} onRowClick={(task) => openTask(task.id)} />
            )}
          </Stack>
        );
      })}
    </Stack>
  );

  /* ── Board: a column per status; cards open the task and drag to another column ── */
  const dropOn = (status: TaskStatus) => ({
    onDragOver: (event: DragEvent<HTMLElement>) => { if (!dragging) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTarget(status); },
    onDragLeave: (event: DragEvent<HTMLElement>) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null); },
    onDrop: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      const task = items.find((item) => item.id === dragging);
      if (task) move(task, status);
      setDragging(null); setDropTarget(null);
    },
  });
  const boardCard = (task: WorkTask) => {
    const note = dueNote(task);
    return (
      <Card key={task.id} data-task={task.id} as="article" spacing="sm" selected={task.id === openId} onClick={() => openTask(task.id)} draggable
        onDragStart={(event: DragEvent<HTMLElement>) => { event.dataTransfer.setData("text/plain", task.id); event.dataTransfer.effectAllowed = "move"; setDragging(task.id); }}
        onDragEnd={() => { setDragging(null); setDropTarget(null); }}>
        <Stack gap="sm">
          <Heading level={3} textStyle="Heading/Subheading" truncate={2}>{task.title}</Heading>
          {task.labels.length ? (
            <Stack direction="row" gap="2xs" wrap>
              {task.labels.slice(0, 2).map((label) => <Badge key={label} size="sm" theme={taskLabelTheme[label]} background="subtle" leadingIcon={false}>{label}</Badge>)}
            </Stack>
          ) : null}
          {/* The due date leads the footer (red once overdue); the priority flag and the people close it. */}
          <Stack direction="row" gap="xs" align="center" justify="between" wrap>
            <Stack direction="row" gap="2xs" align="center">
              <Text as="span" tone={note?.overdue ? "negative" : "light"}><Icon name="icon-calendar-line" size="sm" decorative /></Text>
              <Text as="span" textStyle="Body/Small/Regular" tone={note?.overdue ? "negative" : "base"}>{note && !note.overdue ? note.text : formatDate(task.due, { year: false })}</Text>
              {note?.overdue ? <VisuallyHidden>, overdue</VisuallyHidden> : null}
            </Stack>
            <Stack direction="row" gap="xs" align="center">
              <PriorityFlag priority={task.priority} size="sm" named />
              <Assignees ids={task.assignees} />
            </Stack>
          </Stack>
        </Stack>
      </Card>
    );
  };
  // Four columns of at least 200px; a narrower frame (a docked panel) scrolls the board sideways, a phone stacks them.
  const boardView = (
    <Box style={phone ? undefined : { overflowX: "auto" }}>
      <Grid columns={{ mobile: 1, tablet: "repeat(4, minmax(200px, 1fr))", desktop: "repeat(4, minmax(200px, 1fr))" }} gap="sm" align="start">
        {taskStatuses.map((status) => {
          const cards = byStatus(status);
          const headingId = `hr-tasks-column-${status.replace(/\s+/g, "-").toLowerCase()}`;
          return (
            <Box key={status} as="section" aria-labelledby={headingId} surface={dropTarget === status ? "subtle" : "pale"} radius="xl" padding="xs" {...dropOn(status)}>
              <Stack gap="xs">
                <Stack direction="row" gap="xs" align="center" paddingX="xs" paddingY="2xs">
                  <StatusMark status={status} />
                  <Heading level={2} textStyle="Heading/4" id={headingId}>{status}</Heading>
                  {cards.length ? <BadgeCounter theme="neutral" background="subtle" value={cards.length} /> : null}
                </Stack>
                {cards.map(boardCard)}
                <Button appearance="flat" level="primary" startIcon="icon-plus-line" onClick={() => startTask({ status })}>Add task</Button>
              </Stack>
            </Box>
          );
        })}
      </Grid>
    </Box>
  );

  /* ── Task panel: fields apply at once; Mark as done is the main step ── */
  const dueError = dueLeft && dueDraft !== null && !fromFieldDate(dueDraft) ? "Enter the date as MM/DD/YYYY" : undefined;
  const panel = opened ? (() => {
    const space = spaces[opened.space];
    const done = opened.checklist.filter((item) => item.done).length;
    // One button that changes its step, so keyboard focus stays on it after Mark as done or Reopen task.
    const action = opened.status === "Done"
      ? { label: "Reopen task", level: "tertiary" as const, onClick: () => move(opened, "To do") }
      : { label: "Mark as done", onClick: () => move(opened, "Done") };
    return (
      <SidePanel type="standard" title={opened.title} description={`${opened.id} · ${space.name} · ${opened.project}`} open onOpenChange={(open) => { if (!open) setOpenId(null); }} primaryAction={action}
        // Delete is in the panel too, so a phone (whose rows have no ⋯ menu) can reach it; Undo is in the Toast.
        secondaryAction={{ label: "Delete task", level: "danger-secondary", onClick: () => remove(opened) }}>
        <Stack gap="xl">
          <Stack gap="md">
            <Grid columns={2} gap="md" align="start">
              <SelectField label="Status" options={statusOptions} value={opened.status} onValueChange={(value) => move(opened, value as TaskStatus)} />
              <SelectField label="Priority" options={priorityOptions} value={opened.priority} onValueChange={(value) => update(opened.id, { priority: value as TaskPriority })} />
            </Grid>
            <AssigneesField value={opened.assignees} onValueChange={(ids) => update(opened.id, { assignees: ids })} />
            <DateField label="Due date" value={dueDraft ?? toFieldDate(opened.due)} error={dueError} onBlur={() => setDueLeft(true)}
              onValueChange={(text) => { setDueDraft(text); const day = fromFieldDate(text); if (day) update(opened.id, { due: day }); }} />
            <TextAreaField label="Description" placeholder="What done looks like" rows={3} value={opened.description} onValueChange={(description) => update(opened.id, { description })} />
          </Stack>

          <Stack gap="sm">
            <Stack direction="row" gap="sm" align="center" justify="between">
              <Heading level={3}>Checklist</Heading>
              {opened.checklist.length ? <Text as="span" textStyle="Body/Small/Regular" tone="base">{done} of {opened.checklist.length} done</Text> : null}
            </Stack>
            {opened.checklist.length ? <ProgressBar value={Math.round((done / opened.checklist.length) * 100)} theme={done === opened.checklist.length ? "status" : "neutral"} aria-label="Checklist progress" /> : null}
            {opened.checklist.map((item) => (
              <Checkbox key={item.id} label={item.label} checked={item.done}
                onCheckedChange={(checked) => update(opened.id, { checklist: opened.checklist.map((entry) => (entry.id === item.id ? { ...entry, done: checked } : entry)) })} />
            ))}
            <Grid columns="minmax(0, 1fr) auto" gap="xs" align="center">
              <InputField ref={newItemRef} aria-label="New checklist item" placeholder="Add an item" autoComplete="off" value={newItem} onValueChange={setNewItem}
                onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter") { event.preventDefault(); addChecklistItem(opened); } }} />
              <Button level="tertiary" startIcon="icon-plus-line" onClick={() => addChecklistItem(opened)}>Add item</Button>
            </Grid>
          </Stack>

          <Stack gap="sm">
            <Heading level={3}>Details</Heading>
            <DescriptionList divider items={[
              { id: "reporter", term: "Reporter", description: people[opened.reporter].name },
              { id: "start", term: "Start date", description: opened.start ? formatDate(opened.start) : "Not set" },
              { id: "labels", term: "Labels", description: opened.labels.length
                ? <Stack direction="row" gap="2xs" wrap>{opened.labels.map((label) => <Badge key={label} size="sm" theme={taskLabelTheme[label]} background="subtle" leadingIcon={false}>{label}</Badge>)}</Stack>
                : "None" },
              { id: "updated", term: "Updated", description: formatRelative(opened.updated) },
            ]} />
          </Stack>
        </Stack>
      </SidePanel>
    );
  })() : undefined;

  return (
    <HrShell module="workbench" page="tasks" onNavigate={navigate} aside={panel}>
      <Container maxWidth="full">
        <Stack gap="xl" paddingY="sm">
          <PageHeader title="All tasks" description={`Work across ${spaceNames.slice(0, -1).join(", ")} and ${spaceNames[spaceNames.length - 1]}.`}
            actions={<Button ref={newTaskRef} level="primary" startIcon="icon-plus-line" onClick={() => startTask()}>New task</Button>} />
          <Stack gap="lg">
            {toolbar}
            <VisuallyHidden role="status">{plural(shown.length, "task")}</VisuallyHidden>
            {shown.length ? (view === "list" ? listView : boardView) : noMatch}
          </Stack>
        </Stack>
      </Container>

      <ModalForm open={creating} onOpenChange={setCreating} title="New task" onSubmit={form.handleSubmit}
        primaryAction={{ label: "Create task" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Title" placeholder="Review the pricing page" autoComplete="off" data-autofocus="" {...form.field("title")} />
        <Grid columns={{ mobile: 1, desktop: 2 }} gap="md" align="start">
          <SelectField label="Space" options={spaceOptions} {...form.selectField("space")}
            onValueChange={(value) => { form.setValue("space", value, { touch: true }); form.setValue("project", spaces[value as SpaceId].projects[0]); }} />
          <SelectField label="Project" options={formSpace.projects.map((project) => ({ label: project, value: project }))} {...form.selectField("project")} />
          <SelectField label="Status" options={statusOptions} {...form.selectField("status")} />
          <SelectField label="Priority" options={priorityOptions} {...form.selectField("priority")} />
        </Grid>
        <AssigneesField {...form.autocompleteField("assignees")} />
        <DateField label="Due date" {...form.dateField("due")} />
        <TextAreaField label="Description" labelOptional placeholder="What done looks like" rows={3} {...form.field("description")} />
      </ModalForm>
      {/* Phone filters: picks keep the sheet open; Show closes it on the filtered list. */}
      <BottomSheet open={sheet !== null} onOpenChange={(open) => { if (!open) setSheet(null); }} title={sheet ?? "Filter"}
        primaryAction={{ label: `Show ${plural(shown.length, "task")}` }}>
        {sheet ? (
          <List aria-label={sheet}>
            {filters[sheet].options.map((option) => {
              const selected = filters[sheet].picked.includes(option.id);
              return <ListItem key={option.id} title={option.label} caption={option.caption} leading={option.leading} selected={selected}
                trailing={selected ? <Icon name="icon-check-line" size="base" decorative /> : undefined} onClick={() => filters[sheet].setPicked(toggle(filters[sheet].picked, option.id))} />;
            })}
          </List>
        ) : null}
      </BottomSheet>
    </HrShell>
  );
}
