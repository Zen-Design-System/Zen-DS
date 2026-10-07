/* Popover examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio's own work in Zen: assign
   people and labels to a task, sort files, jump to a project, pick a time zone for a client review, act on a file
   selection, and the phone form of the same sort. Each demo copies its data into local state. */
import { useRef, useState } from "react";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { PlatformPhone } from "../../PlatformPhone";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { Popover, PopoverBulkAction, PopoverBulkActionDivider, PopoverBulkActionGroup, type PopoverItemData } from "../../../components/Popover";
import { Chip } from "../../../components/Chip";
import { IconButton } from "../../../components/Button";
import { AvatarStack } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Card } from "../../../components/Card";
import { DockIcon } from "../../../components/DockIcon";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { Icon, type IconName } from "../../../components/Icon";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Box, Stack } from "../../../components/Layout";
import { Search } from "../../../components/Search";
import { Tag } from "../../../components/Tag";
import { Table, TableMedia, TableText } from "../../../components/Table";
import { EmptyState } from "../../../components/EmptyState";
import { BottomSheet } from "../../../components/BottomSheet";
import { TopNavigation } from "../../../components/TopNavigation";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import {
  TODAY, daysFromToday, files as studioFiles, formatBytes, formatDate, formatDue, formatRange, formatRelative, leaveRequests, people, projectById,
  projectStatusTheme, projects, tasks, type Person, type StudioFile,
} from "../data";
import { keepOnHotUpdate } from "../../hotData";
import "./popover.css";

export const page: PlatformPage = "popover";

// ——— Shared data ————————————————————————————————————————————————————————————————————————————————
/** The Loyalty app team. Everyone here has a photo, which the Avatar item theme draws at its own size. */
const loyaltyTeam: Person[] = [people.chi, people.bao, people.duy, people.alex, people.ava, people.emi, people.finn];
/** A Loyalty app task due on Oct 13, while Alex is on approved leave (Oct 12 – Oct 14 in the studio's leave requests). */
const motionTask = { key: "PHIN-231", title: "Motion pass on the tier upgrade", due: daysFromToday(13) };
/** Approved leave that covers the day (compared by calendar day): that person can't take the task. */
const dayOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const onLeave = (personId: string, day: Date) => leaveRequests.find((leave) =>
  leave.person === personId && leave.status === "Approved" && dayOf(leave.from) <= dayOf(day) && dayOf(day) <= dayOf(leave.to));
const personName = (id: string) => (people as Record<string, Person>)[id]?.name ?? id;
const toggleIn = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
/** Focus a control once the next render has put it on screen (the button that was pressed may be gone by then). */
const focusSoon = (find: () => HTMLElement | null | undefined) => requestAnimationFrame(() => find()?.focus());

type SortId = "updated" | "name" | "size";
const sortOptions: { id: SortId; label: string; caption: string }[] = [
  { id: "updated", label: "Last updated", caption: "Newest first" },
  { id: "name", label: "Name", caption: "A to Z" },
  { id: "size", label: "Size", caption: "Largest first" },
];
const sortFiles = (list: StudioFile[], sort: SortId) => [...list].sort((a, b) =>
  sort === "name" ? a.name.localeCompare(b.name) : sort === "size" ? b.bytes - a.bytes : b.updated.getTime() - a.updated.getTime());

/** The rest of the studio's recent files: on a phone the Files list runs past one screen, as it does in real use. */
const moreFiles: StudioFile[] = [
  { id: "f7", name: "Transfer flow v4.fig", bytes: 24_600_000, owner: "ava", project: "lumen-banking", updated: daysFromToday(0, 9, 5) },
  { id: "f8", name: "Points expiry copy.docx", bytes: 64_000, owner: "linh", project: "phin-loyalty", updated: daysFromToday(-1, 11, 30) },
  { id: "f9", name: "Customs hold states.pdf", bytes: 980_000, owner: "duy", project: "mekong-tracking", updated: daysFromToday(-2, 15, 10) },
  { id: "f10", name: "Outdoor range moodboard.png", bytes: 8_200_000, owner: "gia", project: "saola-brand", updated: daysFromToday(-5, 10, 0) },
  { id: "f11", name: "Transfers usability notes.docx", bytes: 210_000, owner: "ava", project: "lumen-banking", updated: daysFromToday(-6, 17, 15) },
  { id: "f12", name: "Zen tokens export.json", bytes: 412_000, owner: "finn", project: "zen-ds", updated: daysFromToday(-8, 9, 50) },
  { id: "f13", name: "Book Fair 2026 – final invoices.xlsx", bytes: 156_000, owner: "mai", project: "bookfair-site", updated: daysFromToday(-12, 14, 0) },
  { id: "f14", name: "Tier badges.svg", bytes: 42_000, owner: "gia", project: "phin-loyalty", updated: daysFromToday(-14, 16, 30) },
  { id: "f15", name: "Shipment tracking – app map.pdf", bytes: 3_100_000, owner: "duy", project: "mekong-tracking", updated: daysFromToday(-23, 10, 15) },
];
const phoneFiles = [...studioFiles, ...moreFiles];

/** Offsets in minutes on Oct 1, 2026 (daylight saving where it applies that day). */
const timeZones = [
  { id: "honolulu", city: "Honolulu", offset: -600 }, { id: "los-angeles", city: "Los Angeles", offset: -420 },
  { id: "chicago", city: "Chicago", offset: -300 }, { id: "new-york", city: "New York", offset: -240 },
  { id: "sao-paulo", city: "São Paulo", offset: -180 }, { id: "london", city: "London", offset: 60 },
  { id: "paris", city: "Paris", offset: 120 }, { id: "dubai", city: "Dubai", offset: 240 },
  { id: "mumbai", city: "Mumbai", offset: 330 }, { id: "bangkok", city: "Bangkok", offset: 420 },
  { id: "hcmc", city: "Ho Chi Minh City", offset: 420 }, { id: "singapore", city: "Singapore", offset: 480 },
  { id: "tokyo", city: "Tokyo", offset: 540 }, { id: "sydney", city: "Sydney", offset: 600 },
];
const utcLabel = (offset: number) => {
  const abs = Math.abs(offset), minutes = abs % 60;
  return `UTC${offset < 0 ? "−" : "+"}${Math.floor(abs / 60)}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
};
/** The Lumen Bank review: Thursday, Oct 1, 2026, 08:00–09:00 UTC (3:00 pm in Ho Chi Minh City). */
const reviewStart = Date.UTC(2026, 9, 1, 8, 0);
const clock = (d: Date, suffix = true) => {
  const h = d.getUTCHours();
  return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, "0")}${suffix ? ` ${h < 12 ? "am" : "pm"}` : ""}`;
};
const reviewIn = (offset: number) => {
  const from = new Date(reviewStart + offset * 60000), to = new Date(reviewStart + (offset + 60) * 60000);
  const sameHalf = from.getUTCHours() < 12 === to.getUTCHours() < 12;
  return {
    day: from.toLocaleString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }),
    time: `${clock(from, !sameHalf)} – ${clock(to)}`,
  };
};

/** A card's title and its supporting line (the same pair on every card of the page). */
function CardTitle({ title, children }: { title: string; children: string }) {
  return (
    <Stack gap="xs">
      <Heading level={4} textStyle="Heading/Subheading">{title}</Heading>
      <Text textStyle="Body/Small/Regular" tone="base">{children}</Text>
    </Stack>
  );
}

// ——— 1. Assign people: a searchable multi-select with Avatar items and one unavailable person —————————————————
function AssignPeople() {
  const task = motionTask;
  const [assigned, setAssigned] = useState<string[]>(["emi", "chi"]);
  const items: PopoverItemData[] = loyaltyTeam.map((person) => {
    const leave = onLeave(person.id, task.due);
    return {
      id: person.id, label: person.name, theme: "avatar-small", photoSrc: person.photo, selected: assigned.includes(person.id),
      // Someone who can't take the task stays in the list, disabled, with the reason as the caption.
      ...(leave ? { disabled: true, caption: `On leave ${formatRange(leave.from, leave.to)}` } : { caption: person.role }),
    };
  });
  const team = loyaltyTeam.filter((person) => assigned.includes(person.id));
  return (
    <Card theme="flat" className="px-popover-fill">
      <Stack gap="md">
        <CardTitle title={task.title}>{`${task.key} · Due ${formatDate(task.due)}`}</CardTitle>
        <Stack direction="row" align="center" gap="xs" wrap>
          <Chip variant="advanced" dropdown leading="icon-users-line" popoverMultiple popoverSearch
            popoverSearchPlaceholder="Search people" popoverLabel="Loyalty app team" popoverItems={items}
            onPopoverSelect={(item) => setAssigned((current) => toggleIn(current, item.id))}>
            Assignees
          </Chip>
          {team.length
            ? <AvatarStack size="sm" items={team.map((person) => ({ src: person.photo, alt: person.name }))} />
            : <Text as="span" textStyle="Body/Small/Regular" tone="base">Unassigned</Text>}
        </Stack>
      </Stack>
    </Card>
  );
}

// ——— 2. Create a label: Manual-Add-New for an open set of values ——————————————————————————————————————
function CreateLabel() {
  const task = tasks[2];
  const [labels, setLabels] = useState(["Accessibility", "Android", "Copy", "iOS", "Motion", "Research"]);
  const [picked, setPicked] = useState<string[]>(["Android"]);
  // Manual-Add-New reads the typed value, so the search is controlled.
  const [query, setQuery] = useState("");
  const rowRef = useRef<HTMLElement>(null);
  // A removed Tag takes its button with it: focus the next Tag's remove button, or the Labels chip after the last one.
  const unpick = (label: string) => {
    const index = picked.indexOf(label);
    setPicked((current) => toggleIn(current, label));
    focusSoon(() => rowRef.current?.querySelectorAll<HTMLElement>(".zen-tag__remove")[index] ?? rowRef.current?.querySelector<HTMLElement>(".zen-chip"));
  };
  return (
    <Card theme="flat" className="px-popover-fill">
      <Stack gap="md">
        <CardTitle title={task.title}>{`${task.key} · ${formatDue(task.due)}`}</CardTitle>
        <Stack ref={rowRef} direction="row" align="center" gap="xs" wrap>
          <Chip variant="advanced" dropdown leading="icon-tag-line" popoverMultiple
            popoverLabel="Select a label or create one" popoverSearchPlaceholder="Find or create a label"
            popoverSearchValue={query} onPopoverSearchChange={setQuery}
            popoverItems={labels.map((label) => ({ id: label, label, selected: picked.includes(label) }))}
            onPopoverSelect={(item) => setPicked((current) => toggleIn(current, item.id))}
            onPopoverCreate={(value) => { setLabels((current) => [...current, value]); setPicked((current) => [...current, value]); setQuery(""); }}>
            Labels
          </Chip>
          {picked.map((label) => (
            <Tag key={label} remove onRemove={() => unpick(label)}>{label}</Tag>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

// ——— 3. Sort a list: a single-select Popover that closes on select ——————————————————————————————————————
function SortFiles() {
  const [sort, setSort] = useState<SortId>("updated");
  const { toast } = useToast();
  const current = sortOptions.find((option) => option.id === sort)!;
  return (
    // A ListBox: the count and the Sort chip in its Header-Slot, the files in its Body-Slot.
    <ListBox className="px-popover-fill"
      header={<Stack direction="row" align="center" justify="between" gap="md">
        <Text as="span" textStyle="Body/Small/Regular" tone="base">{plural(studioFiles.length, "file")}</Text>
        <Chip variant="advanced" dropdown leading="icon-switch-vertical-01-line" popoverLabel="Sort by"
          popoverItems={sortOptions.map((option) => ({ ...option, selected: option.id === sort }))}
          onPopoverSelect={(item) => setSort(item.id as SortId)}>
          {current.label}
        </Chip>
      </Stack>}>
      <List aria-label="Files">
        {sortFiles(studioFiles, sort).map((file) => (
          // A long file name wraps to a second line rather than being cut: nothing else on the card shows it.
          <ListItem key={file.id} title={file.name} titleLines={2} caption={`${formatBytes(file.bytes)} · ${formatRelative(file.updated)}`}
            leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} onClick={() => toast({ title: "File opened in a new tab" })} />
        ))}
      </List>
    </ListBox>
  );
}

// ——— 4. Sort on a phone: the same choice opens a Bottom Sheet ——————————————————————————————————————————
function PhoneSort() {
  // The large title folds as the list scrolls under the header (scrollRef on the phone's screen).
  const screenRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<SortId>("updated");
  const [sheet, setSheet] = useState(false);
  const current = sortOptions.find((option) => option.id === sort)!;
  return (
    <PlatformPhone label="Files" headerOverlay screenRef={screenRef}
      header={<TopNavigation title="Files" largeTitle="Files" scrollRef={screenRef} />}>
      <Stack direction="row" align="center" justify="between" gap="md" paddingX="lg" paddingY="sm">
        <Text as="span" textStyle="Body/Small/Regular" tone="base">{plural(phoneFiles.length, "file")}</Text>
        <Chip variant="advanced" dropdown leading="icon-switch-vertical-01-line" aria-haspopup="dialog" aria-expanded={sheet}
          onClick={() => setSheet(true)}>{current.label}</Chip>
      </Stack>
      {/* Rows pad 0 at the sides: the screen margin (lg) insets them, so they line up with the bar above. */}
      <Box paddingX="lg">
        <List aria-label="Files">
          {sortFiles(phoneFiles, sort).map((file) => (
            <ListItem key={file.id} title={file.name} caption={`${formatBytes(file.bytes)} · ${formatRelative(file.updated)}`}
              leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} />
          ))}
        </List>
      </Box>
      <BottomSheet inline open={sheet} onOpenChange={setSheet} title="Sort by">
        <List aria-label="Sort by">
          {sortOptions.map((option) => (
            <ListItem key={option.id} title={option.label} caption={option.caption} selected={option.id === sort}
              trailing={option.id === sort ? <Icon name="icon-check-line" size="base" decorative /> : undefined}
              onClick={() => { setSort(option.id); setSheet(false); }} />
          ))}
        </List>
      </BottomSheet>
    </PlatformPhone>
  );
}

// ——— 5. Search results: the Popover itself, anchored under a Search field ————————————————————————————————
function JumpToProject() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("phin-loyalty");
  const fieldRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const q = query.trim().toLowerCase();
  const items: PopoverItemData[] = projects
    .filter((p) => !q || `${p.name} ${p.client}`.toLowerCase().includes(q))
    .map((p) => ({ id: p.id, label: p.name, caption: p.client, theme: "dock-icon", leading: p.icon, selected: p.id === projectId }));
  const project = projectById(projectId);
  const pick = (id: string) => { setProjectId(id); setQuery(""); setOpen(false); };
  return (
    <Card theme="flat" className="px-popover-fill">
      <Stack gap="md">
        {/* ↓ from the field moves into the results; Escape or a click outside closes them. */}
        <Box ref={fieldRef} onKeyDown={(event) => {
          if (event.key === "Escape") { setOpen(false); return; }
          if (event.key !== "ArrowDown") return;
          event.preventDefault();
          setOpen(true);
          requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>('[role="option"]')?.focus());
        }}>
          <Search placeholder="Search projects" aria-label="Search projects" aria-expanded={open} value={query}
            onValueChange={(value) => { setQuery(value); if (value) setOpen(true); }} onClick={() => setOpen(true)} />
        </Box>
        <Popover ref={listRef} open={open} onOpenChange={setOpen} anchorRef={fieldRef} aria-label="Projects"
          emptyState="No projects match" items={items} onSelect={(item) => pick(item.id)} />
        {/* The project that is open: its name wraps and the status follows it, so nothing is cut on a narrow card. */}
        <Stack direction="row" align="center" gap="md">
          <DockIcon icon={project.icon} theme={project.theme} background="subtle" />
          <Stack gap="xs">
            <Stack direction="row" align="center" gap="2xs" wrap>
              <Heading level={4} textStyle="Heading/Subheading">{project.name}</Heading>
              <Badge theme={projectStatusTheme[project.status]} background="subtle">{project.status}</Badge>
            </Stack>
            <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${project.client} · led by ${personName(project.lead)}`}</Text>
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}

// ——— 6. Long lists: 14 time zones scroll inside the Popover, with search ——————————————————————————————————
function ReviewTimeZone() {
  const [zoneId, setZoneId] = useState("hcmc");
  const zone = timeZones.find((z) => z.id === zoneId)!;
  const { day, time } = reviewIn(zone.offset);
  return (
    <Card theme="flat" className="px-popover-fill">
      <Stack gap="md">
        <CardTitle title="Design review with Lumen Bank">{`${projectById("lumen-banking").name} · hosted by ${personName("alex")}`}</CardTitle>
        <Stack direction="row" align="center" justify="between" gap="md" wrap>
          <Stack gap="xs">
            <Text as="span" textStyle="Body/Small/Regular" tone="base">{day}</Text>
            <Text as="span" textStyle="Body/Base/Bold">{time}</Text>
          </Stack>
          <Chip variant="advanced" dropdown leading="icon-globe-01-line" popoverLabel="Time zone" popoverSearch
            popoverSearchPlaceholder="Search cities"
            popoverItems={timeZones.map((z) => ({ id: z.id, label: z.city, caption: utcLabel(z.offset), selected: z.id === zoneId }))}
            onPopoverSelect={(item) => setZoneId(item.id)}>
            {zone.city}
          </Chip>
        </Stack>
      </Stack>
    </Card>
  );
}

// ——— 7. Act on a selection: Popover/Bulk-Action over a table ————————————————————————————————————————————
function BulkFileActions() {
  const [rows, setRows] = useState(() => sortFiles(studioFiles, "updated"));
  const [picked, setPicked] = useState<string[]>(["f1", "f3"]);
  const [sharing, setSharing] = useState(false);
  const { toast } = useToast();
  const sectionRef = useRef<HTMLElement>(null);
  const count = plural(picked.length, "file");
  const remove = () => {
    const before = rows;
    setRows(rows.filter((row) => !picked.includes(row.id)));
    setPicked([]);
    toast({ title: `${count} deleted`, action: { label: "Undo", onClick: () => setRows(before) } });
    // The bar goes with the selection: focus the first row's checkbox, or Restore files once the table is empty.
    focusSoon(() => sectionRef.current?.querySelector<HTMLElement>('tbody input[type="checkbox"], .zen-empty-state button'));
  };
  const duplicate = () => {
    const copies = rows.filter((row) => picked.includes(row.id))
      .map((row) => ({ ...row, id: `${row.id}-copy-${rows.length}`, owner: "alex" as const, name: row.name.replace(/(\.[^.]+)$/, " copy$1"), updated: TODAY }));
    setRows([...copies, ...rows]);
    setPicked(copies.map((row) => row.id));
    toast({ title: `${count} duplicated` });
  };
  const action = (icon: IconName, verb: string, onClick: () => void) =>
    <IconButton appearance="flat" size="md" icon={icon} aria-label={`${verb} ${count}`} onClick={onClick} />;
  return (
    // The table is the section's content, so it lies on the page with no card. The bar's row keeps its height, so the
    // page doesn't jump when a selection starts.
    <Stack ref={sectionRef} gap="md" className="px-popover-fill">
      <Stack direction="row" align="center" justify="between" gap="md">
        <Heading level={4} textStyle="Heading/4">Recent files</Heading>
        <Text as="span" textStyle="Body/Small/Regular" tone="base" role="status">{picked.length ? `${count} selected` : plural(rows.length, "file")}</Text>
      </Stack>
      <Table aria-label="Recent files" rows={rows} getRowId={(row) => row.id} selectable selectedIds={picked} onSelectionChange={setPicked}
        empty={<EmptyState illustration={false} title="No files yet" primaryAction={{ label: "Restore files", onClick: () => setRows(sortFiles(studioFiles, "updated")) }}>Deleted files stay in the trash for 30 days.</EmptyState>}
        columns={[
          { id: "name", header: "Name", cell: (row) => <TableMedia media={<FileIcon format={fileIconFormatOf(row.name)} size="lg" />} caption={personName(row.owner)}>{row.name}</TableMedia> },
          { id: "size", header: "Size", align: "right", width: "120px", cell: (row) => <TableText>{formatBytes(row.bytes)}</TableText> },
          { id: "updated", header: "Updated", align: "right", width: "200px", cell: (row) => <TableText>{formatRelative(row.updated)}</TableText> },
        ]} />
      <Box className="px-popover-bulk">
        {picked.length ? (
          <PopoverBulkAction aria-label={`Actions for ${count}`}>
            <PopoverBulkActionGroup aria-label="Share">
              {action("icon-download-01-line", "Download", () => toast({ title: `${count} downloaded` }))}
              {action("icon-share-01-line", "Share", () => setSharing(true))}
            </PopoverBulkActionGroup>
            <PopoverBulkActionDivider />
            <PopoverBulkActionGroup aria-label="Edit">
              {action("icon-copy-line", "Duplicate", duplicate)}
              {action("icon-trash-line", "Delete", remove)}
            </PopoverBulkActionGroup>
          </PopoverBulkAction>
        ) : null}
      </Box>
      <DemoFieldDialog open={sharing} onOpenChange={setSharing} title={`Share ${count}`} description="People you share with can view and download them."
        field={{ kind: "email", label: "Email", placeholder: "name@phinco.vn" }} submitLabel="Share" confirm={(email) => `Shared with ${email}`} />
    </Stack>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Assign people",
    description: "A searchable, multi-select list of people with photos that stays open while people are toggled. Someone on leave when the task is due stays in the list, disabled, with the dates as the caption.",
    code: `const [assigned, setAssigned] = useState(["emi", "chi"]);
const items = team.map((person) => {
  const leave = onLeave(person.id, task.due); // approved leave that covers the due date
  return {
    id: person.id, label: person.name, theme: "avatar-small", photoSrc: person.photo,
    selected: assigned.includes(person.id),
    ...(leave ? { disabled: true, caption: \`On leave \${formatRange(leave.from, leave.to)}\` } : { caption: person.role }),
  };
});

<Chip variant="advanced" dropdown leading="icon-users-line" popoverMultiple popoverSearch
  popoverSearchPlaceholder="Search people" popoverLabel="Loyalty app team" popoverItems={items}
  onPopoverSelect={(item) => setAssigned(toggleIn(assigned, item.id))}>
  Assignees
</Chip>
<AvatarStack size="sm" items={assignedPeople.map((person) => ({ src: person.photo, alt: person.name }))} />`,
    render: () => <AssignPeople />,
  },
  {
    title: "Create a label",
    description: "Labels are an open set, so the picker offers Manual-Add-New: the Create row appears only for a value that isn't listed, and Enter creates and selects it.",
    code: `const [labels, setLabels] = useState(["Accessibility", "Android", "Copy", "iOS", "Motion", "Research"]);
const [picked, setPicked] = useState(["Android"]);
const [query, setQuery] = useState("");
// The removed Tag takes its button with it: focus the next Tag's remove button, or the Labels chip.
const unpick = (label) => { setPicked(toggleIn(picked, label)); focusNextTagOrChip(label); };

<Chip variant="advanced" dropdown leading="icon-tag-line" popoverMultiple
  popoverLabel="Select a label or create one" popoverSearchPlaceholder="Find or create a label"
  popoverSearchValue={query} onPopoverSearchChange={setQuery}
  popoverItems={labels.map((label) => ({ id: label, label, selected: picked.includes(label) }))}
  onPopoverSelect={(item) => setPicked(toggleIn(picked, item.id))}
  onPopoverCreate={(value) => { setLabels([...labels, value]); setPicked([...picked, value]); setQuery(""); }}>
  Labels
</Chip>
{picked.map((label) => (
  <Tag key={label} remove onRemove={() => unpick(label)}>{label}</Tag>
))}`,
    render: () => <CreateLabel />,
  },
  {
    title: "Sort a list",
    description: "Sort is a single choice: the label names the list, captions give the order, and picking an option closes the Popover and re-sorts the files.",
    code: `const [sort, setSort] = useState("updated");

{/* The ListBox's Body-Slot insets the rows (they pad 0) and keeps their fill (12px outside a row) inside it. */}
<ListBox
  header={<Stack direction="row" align="center" justify="between" gap="md">
    <Text as="span" textStyle="Body/Small/Regular" tone="base">{plural(files.length, "file")}</Text>
    <Chip variant="advanced" dropdown leading="icon-switch-vertical-01-line" popoverLabel="Sort by"
      popoverItems={[
        { id: "updated", label: "Last updated", caption: "Newest first", selected: sort === "updated" },
        { id: "name", label: "Name", caption: "A to Z", selected: sort === "name" },
        { id: "size", label: "Size", caption: "Largest first", selected: sort === "size" },
      ]}
      onPopoverSelect={(item) => setSort(item.id)}>
      {current.label}
    </Chip>
  </Stack>}>
  <List aria-label="Files">
    {sortFiles(files, sort).map((file) => (
      <ListItem key={file.id} title={file.name} titleLines={2} caption={\`\${formatBytes(file.bytes)} · \${formatRelative(file.updated)}\`}
        leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} onClick={() => openFile(file)} />
    ))}
  </List>
</ListBox>`,
    render: () => <SortFiles />,
  },
  {
    title: "Sort on a phone",
    description: "On a phone the same Sort chip opens a Bottom Sheet instead of a Popover: full-width rows within thumb reach, the current order selected, closing on pick.",
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone headerOverlay screenRef={screenRef}
  header={<TopNavigation title="Files" largeTitle="Files" scrollRef={screenRef} />}>
  <Stack direction="row" align="center" justify="between" gap="md" paddingX="lg" paddingY="sm">
    <Text as="span" textStyle="Body/Small/Regular" tone="base">15 files</Text>
    <Chip variant="advanced" dropdown leading="icon-switch-vertical-01-line"
      aria-haspopup="dialog" aria-expanded={sheet} onClick={() => setSheet(true)}>{current.label}</Chip>
  </Stack>
  <Box paddingX="lg">
    <List aria-label="Files">{/* 15 files */}</List>
  </Box>

  <BottomSheet inline open={sheet} onOpenChange={setSheet} title="Sort by">
    <List aria-label="Sort by">
      {sortOptions.map((option) => (
        <ListItem key={option.id} title={option.label} caption={option.caption} selected={option.id === sort}
          trailing={option.id === sort ? <Icon name="icon-check-line" size="base" decorative /> : undefined}
          onClick={() => { setSort(option.id); setSheet(false); }} />
      ))}
    </List>
  </BottomSheet>
</PlatformPhone>`,
    render: () => <PhoneSort />,
  },
  {
    title: "Search results",
    description: "The Popover on its own, anchored under a Search field: Dock Icon items with the client as a caption. ↓ moves into the results, Escape or a click outside closes them, and a pick opens the project.",
    code: `const [open, setOpen] = useState(false);
const fieldRef = useRef<HTMLElement>(null);

{/* ↓ moves into the results (focus the first option); Escape closes them. */}
<Box ref={fieldRef} onKeyDown={onFieldKeyDown}>
  <Search placeholder="Search projects" aria-label="Search projects" aria-expanded={open} value={query}
    onValueChange={(value) => { setQuery(value); if (value) setOpen(true); }} onClick={() => setOpen(true)} />
</Box>
<Popover open={open} onOpenChange={setOpen} anchorRef={fieldRef} aria-label="Projects" emptyState="No projects match"
  items={matches.map((p) => ({ id: p.id, label: p.name, caption: p.client, theme: "dock-icon", leading: p.icon, selected: p.id === projectId }))}
  onSelect={(item) => { setProjectId(item.id); setQuery(""); setOpen(false); }} />

{/* The open project */}
<Stack direction="row" align="center" gap="md">
  <DockIcon icon={project.icon} theme={project.theme} background="subtle" />
  <Stack gap="xs">
    <Stack direction="row" align="center" gap="2xs" wrap>
      <Heading level={4} textStyle="Heading/Subheading">{project.name}</Heading>
      <Badge theme={projectStatusTheme[project.status]} background="subtle">{project.status}</Badge>
    </Stack>
    <Text as="span" textStyle="Body/Small/Regular" tone="base">{\`\${project.client} · led by \${lead.name}\`}</Text>
  </Stack>
</Stack>`,
    render: () => <JumpToProject />,
  },
  {
    title: "Long lists",
    description: "Fourteen time zones scroll inside the Popover, with search to narrow them and the UTC offset as each caption. Picking a city shows the client review in that city's time.",
    code: `const [zoneId, setZoneId] = useState("hcmc");

<Chip variant="advanced" dropdown leading="icon-globe-01-line" popoverLabel="Time zone" popoverSearch
  popoverSearchPlaceholder="Search cities"
  popoverItems={timeZones.map((z) => ({ id: z.id, label: z.city, caption: utcLabel(z.offset), selected: z.id === zoneId }))}
  onPopoverSelect={(item) => setZoneId(item.id)}>
  {zone.city}
</Chip>`,
    render: () => <ReviewTimeZone />,
  },
  {
    title: "Act on a selection",
    description: "Selecting rows brings up a Bulk-Action bar under the table. Each icon action names how many files it affects; Delete removes them with Undo, and Share asks who to share with.",
    wide: true,
    code: `const count = plural(picked.length, "file");

<Table aria-label="Recent files" rows={rows} selectable selectedIds={picked} onSelectionChange={setPicked} columns={columns} />
{picked.length ? (
  <PopoverBulkAction aria-label={\`Actions for \${count}\`}>
    <PopoverBulkActionGroup aria-label="Share">
      <IconButton appearance="flat" size="md" icon="icon-download-01-line" aria-label={\`Download \${count}\`} onClick={download} />
      <IconButton appearance="flat" size="md" icon="icon-share-01-line" aria-label={\`Share \${count}\`} onClick={() => setSharing(true)} />
    </PopoverBulkActionGroup>
    <PopoverBulkActionDivider />
    <PopoverBulkActionGroup aria-label="Edit">
      <IconButton appearance="flat" size="md" icon="icon-copy-line" aria-label={\`Duplicate \${count}\`} onClick={duplicate} />
      <IconButton appearance="flat" size="md" icon="icon-trash-line" aria-label={\`Delete \${count}\`} onClick={remove} />
    </PopoverBulkActionGroup>
  </PopoverBulkAction>
) : null}`,
    render: () => <BulkFileActions />,
  },
]);
