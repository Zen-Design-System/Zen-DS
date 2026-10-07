import { useId, useMemo, useRef, useState } from "react";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { BottomSheet } from "../../../components/BottomSheet";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { ChipGroup } from "../../../components/ChipGroup";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { Form, FormActions, FormFieldset } from "../../../components/Form";
import { Icon } from "../../../components/Icon";
import { Box, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Search } from "../../../components/Search";
import { Table, TableMedia, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { PlatformPhone } from "../../PlatformPhone";
import {
  files, formatBytes, formatRelative, initials, people, peopleList, priorityTheme, projectById, projects, tasks, taskStatusTheme,
  type Person, type PersonId, type Priority, type StudioFile, type Task, type TaskStatus,
} from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import "./chip.css";

export const page: PlatformPage = "chip";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };

/* ───────────── Task filters ───────────── */

const statuses: TaskStatus[] = ["To do", "In progress", "In review", "Done"];
const priorities: Priority[] = ["Urgent", "High", "Medium", "Low"];
const taskProjects = projects.filter((project) => tasks.some((task) => task.project === project.id));

const filterColumns: TableColumn<Task>[] = [
  { id: "task", header: "Task", cell: (task) => <TableText bold caption={task.key}>{task.title}</TableText> },
  { id: "project", header: "Project", width: "220px", cell: (task) => { const project = projectById(task.project); return <TableMedia bold={false} media={<DockIcon size="xs" icon={project.icon} theme={project.theme} background="subtle" />}>{project.name}</TableMedia>; } },
  { id: "assignee", header: "Assignee", width: "170px", cell: (task) => <TableMedia bold={false} media={<Avatar size="xs" {...avatarOf(people[task.assignee])} />}>{people[task.assignee].name}</TableMedia> },
  { id: "priority", header: "Priority", width: "110px", cell: (task) => <Badge theme={priorityTheme[task.priority]} background="subtle">{task.priority}</Badge> },
  { id: "status", header: "Status", width: "130px", cell: (task) => <Badge theme={taskStatusTheme[task.status]} background="subtle">{task.status}</Badge> },
];

function TaskFiltersExample() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TaskStatus[]>(["In progress", "In review"]);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const project = projectId ? projectById(projectId) : null;
  const toggleStatus = (value: TaskStatus) => setStatus((list) => list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  const active = (status.length ? 1 : 0) + (priority ? 1 : 0) + (project ? 1 : 0);
  const clearAll = () => { setStatus([]); setPriority(null); setProjectId(null); setQuery(""); };
  const rows = tasks.filter((task) =>
    (!status.length || status.includes(task.status))
    && (!priority || task.priority === priority)
    && (!projectId || task.project === projectId)
    && `${task.title} ${task.key}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    // The table is the section's content, so it lies on the stage with its toolbar: no Card or Box around it.
    <Stack gap="md">
      <Stack direction="row" gap="xs" align="center" wrap>
        <Box className="px-chip-search"><Search placeholder="Search tasks" value={query} onValueChange={setQuery} /></Box>
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
          {active >= 2 ? <Button level="tertiary" onClick={clearAll}>Clear all</Button> : null}
        </Stack>
      </Stack>
      <Text role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "task")}</Text>
      <Table aria-label="Tasks" columns={filterColumns} rows={rows}
        empty={<EmptyState illustration={false} headingLevel={4} title="No tasks match" secondaryAction={{ label: "Clear filters", onClick: clearAll }}>
          Try another status, priority or project.
        </EmptyState>} />
    </Stack>
  );
}

/* ───────────── Filter by owner ───────────── */

// Short names, so a row never has to cut one off.
const studioFiles: StudioFile[] = [
  { ...files[0], name: "Points history.fig" },
  { ...files[1], name: "Usability plan.pdf" },
  { ...files[2], name: "Rewards API.json" },
  { ...files[3], name: "Q3 report.xlsx" },
  { ...files[4], name: "Brand kickoff.key" },
  { ...files[5], name: "Launch video.mp4" },
];

function OwnerFilterExample() {
  const [ownerId, setOwnerId] = useState<PersonId | null>(null);
  const owner = ownerId ? people[ownerId] : null;
  const shown = studioFiles.filter((file) => !ownerId || file.owner === ownerId);
  // Everyone in the studio is listed, so the popover gets a search field; photos and initials lead each row.
  const ownerItems = peopleList.map((person) => ({
    id: person.id, label: person.name, caption: person.role, selected: person.id === ownerId,
    ...(person.photo ? { photoSrc: person.photo } : { leading: <Avatar size="sm" {...avatarOf(person)} />, theme: "avatar-small" as const }),
  }));
  return (
    <Stack gap="md">
      <Stack direction="row" gap="xs" align="center" justify="between" wrap>
        <Chip variant="advanced" selected={Boolean(owner)} photoSrc={owner?.photo}
          leading={owner && !owner.photo ? <Avatar size="xs" {...avatarOf(owner)} /> : undefined} theme={owner ? "leading-photo" : undefined}
          popoverLabel="Owner" popoverSearch popoverSearchPlaceholder="Search people" popoverItems={ownerItems}
          onPopoverSelect={(item) => setOwnerId(item.id as PersonId)} onClearSelection={() => setOwnerId(null)}>
          {owner?.name ?? "Owner"}
        </Chip>
        <Text role="status" as="span" textStyle="Body/Small/Regular" tone="base">{plural(shown.length, "file")}</Text>
      </Stack>
      {/* A static surface on the stage: the ListBox's Body-Slot insets the rows (they pad 0). */}
      {shown.length ? (
        <ListBox>
          <List aria-label="Files">
            {shown.map((file) => (
              <ListItem key={file.id} title={file.name} caption={`${formatBytes(file.bytes)} · ${people[file.owner as PersonId].name} · ${formatRelative(file.updated)}`}
                leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} />
            ))}
          </List>
        </ListBox>
      ) : (
        <Card theme="flat">
          <EmptyState illustration={false} headingLevel={4} title="No files match" secondaryAction={{ label: "Show all files", onClick: () => setOwnerId(null) }}>
            {`${owner?.name} doesn't own any files yet.`}
          </EmptyState>
        </Card>
      )}
    </Stack>
  );
}

/* ───────────── Digest topics ───────────── */

const digestTopics = ["Design reviews", "Client feedback", "Invoices", "Leave requests", "New hires", "Releases", "Studio events"];

function DigestTopicsExample() {
  const { toast } = useToast();
  const [picked, setPicked] = useState<string[]>(["Design reviews", "Client feedback", "Releases"]);
  const [error, setError] = useState("");
  const toggle = (topic: string) => {
    setPicked((list) => list.includes(topic) ? list.filter((item) => item !== topic) : [...list, topic]);
    setError("");
  };
  // Save stays enabled: with nothing picked, the group shows the error and Form moves focus to its first chip.
  const save = () => {
    if (!picked.length) { setError("Pick at least one topic"); return; }
    toast({ type: "positive", title: "Digest saved" });
  };
  return (
    <Card theme="flat" className="px-chip-card">
      <Form onSubmit={save} gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Weekly digest</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Arrives every Monday at 8:00 am.</Text>
        </Stack>
        {/* Normal chips are toggles. Several topics can be on, so the group is Secondary (Selected = a 2px dark outline) with
            aria-pressed; one Stack holds the chips at Gap/XSmall (8px). */}
        <FormFieldset legend="Topics" error={error || undefined}
          helpText={picked.length ? `${plural(picked.length, "topic")} selected` : undefined}>
          <Stack direction="row" gap="xs" wrap>
            {digestTopics.map((topic) => (
              <Chip key={topic} variant="normal" level="secondary" selected={picked.includes(topic)} onClick={() => toggle(topic)} size="sm">
                {topic}
              </Chip>
            ))}
          </Stack>
        </FormFieldset>
        <FormActions>
          <Button level="primary" type="submit">Save digest</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

/* ───────────── Estimate in points ───────────── */

const points = [1, 2, 3, 5, 8, 13];
const votes: { person: PersonId; points: number }[] = [{ person: "bao", points: 5 }, { person: "em", points: 3 }, { person: "chi", points: 5 }];

function StoryPointsExample() {
  const [vote, setVote] = useState<number | null>(null);
  return (
    <Card theme="flat" className="px-chip-card">
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Estimate PHIN-223</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Regression test for the Android build</Text>
        </Stack>
        <Stack gap="xs">
          <Text as="span" textStyle="Body/Small/Bold" tone="base">Your vote</Text>
          {/* Pressable numbers: onClick + selected. */}
          <Stack direction="row" gap="xs" wrap role="group" aria-label="Story points">
            {points.map((value) => (
              <Chip key={value} variant="number-only" value={value} selected={value === vote} aria-label={plural(value, "point")} onClick={() => setVote(value)} />
            ))}
          </Stack>
        </Stack>
        <List aria-label="Team votes in points">
          {votes.map((item) => (
            <ListItem key={item.person} title={people[item.person].name} caption={people[item.person].role}
              leading={<Avatar size="md" {...avatarOf(people[item.person])} />}
              trailing={vote === null
                ? <Text as="span" textStyle="Body/Small/Regular" tone="base">Voted</Text>
                // A vote shown back is a count, not a control: no handler, so the chip renders static.
                : <Chip variant="number-only" value={item.points} />} />
          ))}
        </List>
      </Stack>
    </Card>
  );
}

/* ───────────── Filters on a phone ───────────── */

type SortId = "name" | "team" | "location";
const sorts: { id: SortId; label: string }[] = [{ id: "name", label: "Name" }, { id: "team", label: "Team" }, { id: "location", label: "Location" }];
const quickFilters = [
  { id: "online", label: "Online", test: (person: Person) => Boolean(person.online) },
  { id: "design", label: "Design", test: (person: Person) => person.team === "Design" },
  { id: "engineering", label: "Engineering", test: (person: Person) => person.team === "Engineering" },
  { id: "hanoi", label: "Hanoi", test: (person: Person) => person.location === "Hanoi" },
];

const repeats = [
  { value: "never", label: "Never" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];
const repeatSummary: Record<string, string> = {
  never: "Sent once, on Friday at 9:00 am",
  daily: "Every day at 9:00 am, starting Friday",
  weekdays: "Monday to Friday at 9:00 am",
  weekly: "Every Friday at 9:00 am",
  monthly: "On the 10th of every month at 9:00 am",
};

function RepeatReminderExample() {
  const labelId = useId();
  const [repeat, setRepeat] = useState<string | null>("weekly");
  return (
    <Stack gap="sm">
      <Text as="span" id={labelId} textStyle="Body/Base/Bold">Repeat</Text>
      <ChipGroup aria-labelledby={labelId} options={repeats} value={repeat} onValueChange={setRepeat} />
      <Text role="status" textStyle="Body/Small/Regular" tone="base">{repeat ? repeatSummary[repeat] : null}</Text>
    </Stack>
  );
}

function PhoneFiltersExample() {
  const screenRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<SortId>("name");
  const [sheet, setSheet] = useState(false);
  const [on, setOn] = useState<string[]>([]);
  const toggle = (id: string) => setOn((list) => list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  const rows = useMemo(() => peopleList
    .filter((person) => quickFilters.every((filter) => !on.includes(filter.id) || filter.test(person)))
    .sort((a, b) => (sort === "name" ? 0 : (sort === "team" ? a.team : a.location).localeCompare(sort === "team" ? b.team : b.location)) || a.name.localeCompare(b.name)), [on, sort]);
  const sortLabel = sorts.find((item) => item.id === sort)!.label;
  return (
    // The whole studio is listed, so the screen scrolls and the large title folds under the bar.
    <PlatformPhone label="Team" headerOverlay screenRef={screenRef} header={<TopNavigation title="Team" largeTitle="Team" scrollRef={screenRef} />}>
      <Stack gap="md" paddingY="xs">
        {/* One row that scrolls sideways; Sort opens an Action Bottom Sheet instead of a Popover. */}
        <Box className="px-chip-scroll" role="group" aria-label="Filters">
          <Chip variant="advanced" aria-haspopup="dialog" aria-expanded={sheet} popoverOpen={sheet} onClick={() => setSheet(true)}>
            {`Sort: ${sortLabel}`}
          </Chip>
          {quickFilters.map((filter) => (
            <Chip key={filter.id} variant="normal" level="secondary" selected={on.includes(filter.id)} onClick={() => toggle(filter.id)}>
              {filter.label}
            </Chip>
          ))}
        </Box>
        <Stack gap="xs">
          <Box paddingX="lg">
            <Text role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "person", "people")}</Text>
          </Box>
          {rows.length ? (
            <Box paddingX="lg">
              <List aria-label="People">
                {rows.map((person) => (
                  <ListItem key={person.id} title={person.name} caption={`${person.role} · ${person.location}`}
                    leading={<Avatar size="md" status={person.online} {...avatarOf(person)} />} />
                ))}
              </List>
            </Box>
          ) : (
            <EmptyState illustration={false} headingLevel={2} title="No people match" secondaryAction={{ label: "Clear filters", onClick: () => setOn([]) }}>
              Turn off a filter to see more of the team.
            </EmptyState>
          )}
        </Stack>
      </Stack>
      <BottomSheet inline open={sheet} onOpenChange={setSheet} title="Sort by">
        <List aria-label="Sort by">
          {sorts.map((item) => (
            <ListItem key={item.id} title={item.label} selected={item.id === sort}
              trailing={item.id === sort ? <Icon name="icon-check-line" size="base" decorative /> : undefined}
              onClick={() => { setSort(item.id); setSheet(false); }} />
          ))}
        </List>
      </BottomSheet>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Task filters",
    description: "One Advanced chip per dimension over the table: Status takes several values and counts them, Priority and Project show the value they hold. Clear all appears once two filters are on, and an empty result offers Clear filters.",
    wide: true,
    render: () => <TaskFiltersExample />,
    code: `{/* The toolbar and the table lie on the page: no Card around a table that is the page's content */}
<Stack direction="row" gap="xs" align="center" wrap>
  <Search placeholder="Search tasks" value={query} onValueChange={setQuery} />
  <Chip variant="advanced" selectionMode="multiple" selectionCount={status.length} selected={status.length > 0}
    popoverMultiple popoverLabel="Status"
    popoverItems={statuses.map((value) => ({ id: value, label: value, selected: status.includes(value) }))}
    onPopoverSelect={(item) => toggleStatus(item.id)} onClearSelection={() => setStatus([])}>
    {status.length === 1 ? status[0] : "Status"}
  </Chip>
  <Chip variant="advanced" selected={Boolean(priority)} popoverLabel="Priority"
    popoverItems={priorities.map((value) => ({ id: value, label: value, selected: value === priority }))}
    onPopoverSelect={(item) => setPriority(item.id)} onClearSelection={() => setPriority(null)}>
    {priority ?? "Priority"}
  </Chip>
  {active >= 2 ? <Button level="tertiary" onClick={clearAll}>Clear all</Button> : null}
</Stack>
<Table aria-label="Tasks" columns={columns} rows={rows}
  empty={<EmptyState illustration={false} title="No tasks match"
    secondaryAction={{ label: "Clear filters", onClick: clearAll }}>Try another status, priority or project.</EmptyState>} />`,
  },
  {
    title: "Digest topics",
    description: "Normal chips are on/off toggles: several topics can be on, so the chips are Secondary: a picked topic takes the Selected outline and is announced as pressed, and the count under the group follows the choice. Save digest with nothing picked shows the error and moves focus to the first topic.",
    render: () => <DigestTopicsExample />,
    code: `const save = () => {
  if (!picked.length) return setError("Pick at least one topic"); // Form then focuses the group's first chip
  toast({ type: "positive", title: "Digest saved" });
};

<Form onSubmit={save} gap="md">
  <FormFieldset legend="Topics" error={error}
    helpText={picked.length ? \`\${plural(picked.length, "topic")} selected\` : undefined}>
    {/* Several can be on: Secondary chips, one Stack at Gap/XSmall (8px) */}
    <Stack direction="row" gap="xs" wrap>
      {topics.map((topic) => (
        <Chip key={topic} variant="normal" level="secondary"
          selected={picked.includes(topic)} onClick={() => toggle(topic)} size="sm">
          {topic}
        </Chip>
      ))}
    </Stack>
  </FormFieldset>
  <FormActions><Button level="primary" type="submit">Save digest</Button></FormActions>
</Form>`,
  },
  {
    title: "Estimate in points",
    description: "Number-only chips with onClick are a pressable scale for your vote. The team's votes, shown once you vote, are the same chip without a handler: a static count.",
    render: () => <StoryPointsExample />,
    code: `{[1, 2, 3, 5, 8, 13].map((value) => (
  <Chip key={value} variant="number-only" value={value} selected={value === vote}
    aria-label={plural(value, "point")} onClick={() => setVote(value)} />
))}

{/* No handler: a static count */}
<List aria-label="Team votes in points">
  <ListItem title={person.name} trailing={<Chip variant="number-only" value={vote.points} />} />
</List>`,
  },
  {
    title: "Filter by owner",
    description: "A people filter lists the whole studio, so its Popover has a search field. Once an owner is picked, the chip shows their photo or initials and name.",
    render: () => <OwnerFilterExample />,
    code: `<Chip variant="advanced" selected={Boolean(owner)} photoSrc={owner?.photo}
  popoverLabel="Owner" popoverSearch popoverSearchPlaceholder="Search people"
  popoverItems={people.map((person) => ({ id: person.id, label: person.name, caption: person.role,
    photoSrc: person.photo, selected: person.id === ownerId }))}
  onPopoverSelect={(item) => setOwnerId(item.id)} onClearSelection={() => setOwnerId(null)}>
  {owner?.name ?? "Owner"}
</Chip>`,
  },
  {
    title: "Filters on a phone",
    description: "On a phone the chips sit in one row that scrolls sideways above the whole team. Quick filters are Normal toggles, and Sort opens a Bottom Sheet with a List instead of a Popover. The count updates and an empty result offers Clear filters.",
    render: () => <PhoneFiltersExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone headerOverlay screenRef={screenRef}
  header={<TopNavigation title="Team" largeTitle="Team" scrollRef={screenRef} />}>
  <div className="chip-row" role="group" aria-label="Filters"> {/* overflow-x: auto; nowrap */}
    <Chip variant="advanced" aria-haspopup="dialog" aria-expanded={sheet} popoverOpen={sheet}
      onClick={() => setSheet(true)}>{\`Sort: \${sortLabel}\`}</Chip>
    {quickFilters.map((filter) => (
      <Chip key={filter.id} variant="normal" level="secondary"
        selected={on.includes(filter.id)} onClick={() => toggle(filter.id)}>{filter.label}</Chip>
    ))}
  </div>
  <Stack gap="xs">
    <Box paddingX="lg"><Text role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "person", "people")}</Text></Box>
    <Box paddingX="lg"><List aria-label="People">{/* Avatar rows (padding 0): the screen margin insets them */}</List></Box>
  </Stack>
  <BottomSheet inline open={sheet} onOpenChange={setSheet} title="Sort by">
    <List aria-label="Sort by">
      {sorts.map((item) => (
        <ListItem key={item.id} title={item.label} selected={item.id === sort}
          trailing={item.id === sort ? <Icon name="icon-check-line" size="base" decorative /> : undefined}
          onClick={() => { setSort(item.id); setSheet(false); }} />
      ))}
    </List>
  </BottomSheet>
</PlatformPhone>`,
  },
  {
    title: "Pick one",
    description: "When exactly one value applies, the chips form a ChipGroup: a radio group where the picked chip is Selected and checked. Tab reaches the group once, on the picked chip, and the arrow keys move the choice; the line under it says what the choice means.",
    render: () => <RepeatReminderExample />,
    code: `const [repeat, setRepeat] = useState<string | null>("weekly");

<Stack gap="sm">
  <Text as="span" id={labelId} textStyle="Body/Base/Bold">Repeat</Text>
  {/* One value at a time: a radio group of Normal chips (not toggles with aria-pressed) */}
  <ChipGroup aria-labelledby={labelId} value={repeat} onValueChange={setRepeat}
    options={[{ value: "never", label: "Never" }, { value: "daily", label: "Daily" },
      { value: "weekdays", label: "Weekdays" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]} />
  <Text role="status" textStyle="Body/Small/Regular" tone="base">{summary[repeat]}</Text>
</Stack>`,
  },
]);
