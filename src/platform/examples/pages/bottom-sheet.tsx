import { useId, useRef, useState } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { BottomSheet } from "../../../components/BottomSheet";
import { IconButton } from "../../../components/Button";
import { Checkbox } from "../../../components/Checkbox";
import { Chip } from "../../../components/Chip";
import { DockIcon, type DockIconTheme } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { FormFieldset, useFormState } from "../../../components/Form";
import { Icon, type IconName } from "../../../components/Icon";
import { Image } from "../../../components/Image";
import { NumberField, SelectField, TextAreaField } from "../../../components/Input";
import { Box, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Metric } from "../../../components/MetricWidget";
import { Search } from "../../../components/Search";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { platformMedia } from "../../PlatformMedia";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import {
  TODAY, daysFromToday, files, formatBytes, formatDate, formatDay, formatDue, formatRelative, formatTime, initials, people, projectById, projects, taskStatusTheme,
  type Person, type PersonId, type TaskStatus,
} from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import "./bottom-sheet.css";

export const page: PlatformPage = "bottom-sheet";

/** A person as Avatar props: their photo, or initials on their steady theme. The row title already names them. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const minutesAgo = (minutes: number) => new Date(TODAY.getTime() - minutes * 60_000);
const check = <Icon name="icon-check-line" size="base" decorative />;

/* ───────────── 1. File actions ───────────── */

type BrandFile = { id: string; name: string; bytes: number; updated: Date };
const kickoff = files.find((file) => file.id === "f5")!;
// The Brand refresh folder, last changed first.
const brandFiles: BrandFile[] = [
  { id: "f1", name: "Moodboard.fig", bytes: 24_600_000, updated: minutesAgo(13) },
  { id: "f2", name: "Brand brief.pdf", bytes: 1_240_000, updated: daysFromToday(0, 9, 12) },
  { id: "f4", name: "Logo sketches.png", bytes: 3_080_000, updated: daysFromToday(-2, 9, 40) },
  { id: "f5", name: "Naming shortlist.docx", bytes: 240_000, updated: daysFromToday(-2, 8, 15) },
  { id: "f6", name: "Competitor audit.xlsx", bytes: 860_000, updated: daysFromToday(-5, 14, 20) },
  { id: "f7", name: "Tone of voice.pdf", bytes: 1_200_000, updated: daysFromToday(-6, 11, 30) },
  { id: "f8", name: "Store photos.zip", bytes: 186_000_000, updated: daysFromToday(-7, 17, 50) },
  { id: "f9", name: "Colour studies.png", bytes: 5_400_000, updated: daysFromToday(-8, 10, 5) },
  { id: "f10", name: "Trail film reference.mp4", bytes: 96_000_000, updated: daysFromToday(-9, 15, 40) },
  { id: "f11", name: "Customer interviews.xlsx", bytes: 420_000, updated: daysFromToday(-12, 9, 0) },
  { id: "f12", name: "Typeface licences.pdf", bytes: 310_000, updated: daysFromToday(-14, 16, 20) },
  // The studio's shared kickoff deck (data.ts files).
  { id: "f3", name: kickoff.name, bytes: kickoff.bytes, updated: kickoff.updated },
  { id: "f13", name: "Packaging dielines.pdf", bytes: 8_900_000, updated: daysFromToday(-19, 13, 10) },
  { id: "f14", name: "Statement of work.pdf", bytes: 640_000, updated: daysFromToday(-21, 10, 0) },
];

function FileActionsExample() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  // One scroller: the large title folds as the files run under the bar.
  const screenRef = useRef<HTMLDivElement>(null);
  const [list, setList] = useState(brandFiles);
  const [sheet, setSheet] = useState(false);
  const [fileId, setFileId] = useState(brandFiles[0].id);
  const file = brandFiles.find((item) => item.id === fileId)!;
  const moreButton = (id: string) => `[data-file="${id}"] .zen-list-item__trailing button`;

  const remove = () => {
    const index = list.findIndex((item) => item.id === file.id);
    const neighbour = list[index + 1] ?? list[index - 1];
    // Focus moves to the next row's actions, since the row that opened the sheet is gone.
    screen.go(neighbour ? moreButton(neighbour.id) : "h1", () => setList((all) => all.filter((item) => item.id !== file.id)));
    toast({ title: "File deleted", action: { label: "Undo", onClick: () => setList((all) => brandFiles.filter((item) => item.id === file.id || all.includes(item))) } });
  };
  const choose = (id: string) => {
    if (id === "link") {
      navigator.clipboard?.writeText(`https://zen.dizai.studio/files/${file.id}`).catch(() => undefined);
      toast({ title: "Link copied" });
    } else if (id === "download") toast({ title: "Download started" });
    else remove();
  };

  return (
    <PlatformPhone label="Brand refresh files" headerOverlay screenRef={screenRef}
      header={<TopNavigation title="Files" largeTitle="Files" scrollRef={screenRef} />}>
      {screen.anchor}
      <Stack gap="xs" paddingY="xs">
        <Box paddingX="lg"><Text role="status" textStyle="Body/Small/Regular" tone="base">{`Brand refresh · ${plural(list.length, "file")}`}</Text></Box>
        {list.length ? (
          <Box paddingX="lg">
            <List aria-label="Brand refresh files">
              {list.map((item) => (
                <ListItem key={item.id} data-file={item.id} title={item.name} caption={`${formatBytes(item.bytes)} · ${formatRelative(item.updated)}`}
                  leading={<FileIcon format={fileIconFormatOf(item.name)} size="xl" />}
                  trailing={<IconButton appearance="flat" size="md" icon="icon-dots-horizontal-line" aria-label={`More actions for ${item.name}`} aria-haspopup="dialog"
                    onClick={() => { setFileId(item.id); setSheet(true); }} />} />
              ))}
            </List>
          </Box>
        ) : (
          <EmptyState illustration={false} headingLevel={2} title="No files yet">Files your team adds to Brand refresh show up here.</EmptyState>
        )}
      </Stack>
      {/* Action type: one tap runs the item and closes the sheet; the destructive item comes last. */}
      <BottomSheet inline type="action" open={sheet} onOpenChange={setSheet} title={file.name}
        items={[
          { id: "link", label: "Copy link", icon: "icon-link-01-line" },
          { id: "download", label: "Download", icon: "icon-download-01-line", trailing: formatBytes(file.bytes) },
          { id: "delete", label: "Delete file", icon: "icon-trash-line", destructive: true },
        ]}
        onSelect={(item) => choose(item.id)} />
    </PlatformPhone>
  );
}

/* ───────────── 2. Pick one ───────────── */

type Zone = { id: string; city: string; offset: number };
const zones: Zone[] = [
  { id: "honolulu", city: "Honolulu", offset: -10 },
  { id: "los-angeles", city: "Los Angeles", offset: -7 },
  { id: "new-york", city: "New York", offset: -4 },
  { id: "london", city: "London", offset: 1 },
  { id: "berlin", city: "Berlin", offset: 2 },
  { id: "dubai", city: "Dubai", offset: 4 },
  { id: "kolkata", city: "Kolkata", offset: 5.5 },
  { id: "bangkok", city: "Bangkok", offset: 7 },
  { id: "hanoi", city: "Hanoi", offset: 7 },
  { id: "ho-chi-minh-city", city: "Ho Chi Minh City", offset: 7 },
  { id: "jakarta", city: "Jakarta", offset: 7 },
  { id: "singapore", city: "Singapore", offset: 8 },
  { id: "hong-kong", city: "Hong Kong", offset: 8 },
  { id: "seoul", city: "Seoul", offset: 9 },
  { id: "tokyo", city: "Tokyo", offset: 9 },
  { id: "sydney", city: "Sydney", offset: 10 },
  { id: "auckland", city: "Auckland", offset: 13 },
];
/** "GMT+7" · "GMT−4" · "GMT+5:30" */
const gmt = (offset: number) => `GMT${offset < 0 ? "−" : "+"}${Math.trunc(Math.abs(offset))}${offset % 1 ? `:${String(Math.abs(offset % 1) * 60).padStart(2, "0")}` : ""}`;
/** The time there now (the studio is on GMT+7). */
const timeIn = (offset: number) => formatTime(new Date(TODAY.getTime() + (offset - 7) * 3_600_000));
// Every row opens a choice; Time zone is the long one (no `options`: it has its own sheet with a Search).
type Setting = { id: string; title: string; icon: IconName; theme: DockIconTheme; options?: string[] };
const settingGroups: { id: string; title: string; settings: Setting[] }[] = [
  { id: "region", title: "Language and region", settings: [
    { id: "language", title: "Language", icon: "icon-message-text-circle-line", theme: "blue", options: ["English", "Tiếng Việt"] },
    { id: "zone", title: "Time zone", icon: "icon-clock-line", theme: "green" },
    { id: "week", title: "Week starts on", icon: "icon-calendar-line", theme: "orange", options: ["Monday", "Sunday", "Saturday"] },
  ] },
  { id: "notifications", title: "Notifications", settings: [
    { id: "push", title: "Push notifications", icon: "icon-bell-01-line", theme: "red", options: ["All activity", "Mentions and replies", "Off"] },
    { id: "digest", title: "Email digest", icon: "icon-mail-01-line", theme: "blue", options: ["Daily", "Weekly", "Off"] },
    { id: "reminders", title: "Task reminders", icon: "icon-alarm-clock-line", theme: "orange", options: ["On the due date", "A day before", "Off"] },
    { id: "quiet", title: "Quiet hours", icon: "icon-moon-01-line", theme: "indigo", options: ["Off", "10:00 pm – 7:00 am", "11:00 pm – 8:00 am"] },
  ] },
  { id: "privacy", title: "Privacy", settings: [
    { id: "presence", title: "Show when I'm active", icon: "icon-eye-line", theme: "green", options: ["Everyone at Đìzai", "My teams", "Nobody"] },
    { id: "receipts", title: "Read receipts", icon: "icon-message-check-circle-line", theme: "teal", options: ["On", "Off"] },
    { id: "profile", title: "Who can see my profile", icon: "icon-users-line", theme: "violet", options: ["Everyone at Đìzai", "My teams", "Only me"] },
  ] },
  { id: "storage", title: "Storage", settings: [
    { id: "cellular", title: "Download over mobile data", icon: "icon-download-cloud-01-line", theme: "cyan", options: ["Always", "Files under 50 MB", "Never"] },
    { id: "quality", title: "Photo upload quality", icon: "icon-image-line", theme: "pink", options: ["Original", "High", "Data saver"] },
    { id: "offline", title: "Keep offline", icon: "icon-hard-drive-line", theme: "golden", options: ["Pinned projects", "Recent files", "Nothing"] },
    { id: "cleanup", title: "Remove offline files after", icon: "icon-trash-line", theme: "crimson", options: ["7 days", "30 days", "Never"] },
  ] },
];
const settingsById = new Map(settingGroups.flatMap((group) => group.settings).map((setting) => [setting.id, setting]));
const initialValues: Record<string, string> = {
  language: "English", week: "Monday", push: "Mentions and replies", digest: "Weekly", reminders: "A day before", quiet: "10:00 pm – 7:00 am",
  presence: "Everyone at Đìzai", receipts: "On", profile: "Everyone at Đìzai", cellular: "Files under 50 MB", quality: "High", offline: "Pinned projects", cleanup: "30 days",
};

function PickOneExample() {
  // One scroller: the large title folds as the settings run under the bar, and a sheet covers the scrolled list.
  const screenRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  // The last setting opened keeps titling its sheet while it slides away.
  const [lastId, setLastId] = useState("language");
  const [values, setValues] = useState(initialValues);
  const [zoneId, setZoneId] = useState("ho-chi-minh-city");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const groupId = useId();
  const zone = zones.find((item) => item.id === zoneId)!;
  const q = query.trim().toLowerCase();
  const matches = zones.filter((item) => item.city.toLowerCase().includes(q) || gmt(item.offset).toLowerCase().includes(q));
  const open = (id: string) => { setOpenId(id); setLastId(id); };
  const close = () => { setOpenId(null); setQuery(""); };
  const last = settingsById.get(lastId)!;
  return (
    // Grouped list: the screen is Surface-Alt, each group a ListBox under the kicker that names it. Rows have no padding of
    // their own, so the ListBox pads them Card-padding-medium (20px on a phone); their hover hangs 12px outside the row and
    // sits 8px from every edge, concentric with its corners (2XLarge 24px = the fill's Large 16px + 8px). The kicker lines up
    // with the row content (lg, 20px).
    <PlatformPhone label="Settings" canvas="alt" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="alt" title="Settings" largeTitle="Settings" scrollRef={screenRef} />}>
      <Stack gap="lg" padding="lg">
        {settingGroups.map((group) => (
          <Stack key={group.id} as="section" gap="xs" aria-labelledby={`${groupId}-${group.id}`}>
            <Box paddingX="lg"><Heading level={2} id={`${groupId}-${group.id}`} textStyle="Body/Small/Bold" tone="light">{group.title}</Heading></Box>
            <ListBox>
              <List aria-labelledby={`${groupId}-${group.id}`}>
                {group.settings.map((setting) => (
                  <ListItem key={setting.id} title={setting.title} caption={setting.options ? values[setting.id] : `${zone.city} (${gmt(zone.offset)})`}
                    leading={<DockIcon icon={setting.icon} theme={setting.theme} background="subtle" size="md" />}
                    trailing={<Icon name="icon-chevron-right-line" size="base" decorative />} aria-haspopup="dialog" onClick={() => open(setting.id)} />
                ))}
              </List>
            </ListBox>
          </Stack>
        ))}
      </Stack>
      {/* A short choice hugs its rows (flex); picking closes the sheet and focus returns to the row. */}
      <BottomSheet inline open={openId !== null && openId !== "zone"} onOpenChange={(shown) => { if (!shown) close(); }} title={last.title}>
        <List aria-label={last.title}>
          {(last.options ?? []).map((option) => (
            <ListItem key={option} title={option} selected={option === values[last.id]} trailing={option === values[last.id] ? check : undefined}
              onClick={() => { setValues((all) => ({ ...all, [last.id]: option })); close(); }} />
          ))}
        </List>
      </BottomSheet>
      {/* A long list takes the full height, with a Search under the header; the list scrolls, the header stays. */}
      <BottomSheet inline size="max" open={openId === "zone"} onOpenChange={(shown) => { if (!shown) close(); }} title="Time zone"
        search={<Search ref={searchRef} placeholder="Search cities" aria-label="Search cities" value={query} onValueChange={setQuery} />}>
        {matches.length ? (
          <List aria-label="Time zones">
            {matches.map((item) => (
              <ListItem key={item.id} title={item.city} caption={`${gmt(item.offset)} · ${timeIn(item.offset)}`} selected={item.id === zoneId}
                trailing={item.id === zoneId ? check : undefined} onClick={() => { setZoneId(item.id); close(); }} />
            ))}
          </List>
        ) : (
          <EmptyState illustration={false} headingLevel={3} title="No cities match" secondaryAction={{ label: "Clear search", onClick: () => { setQuery(""); searchRef.current?.focus(); } }}>
            {`No city or offset contains “${query.trim()}”.`}
          </EmptyState>
        )}
      </BottomSheet>
    </PlatformPhone>
  );
}

/* ───────────── 3. Log time ───────────── */

type Entry = { id: string; project: string; hours: number; note: string; day: Date };
// Alex's last two weeks, newest first.
const timesheet: Entry[] = [
  { id: "w1", project: "lumen-banking", hours: 3.5, note: "Transfer flow review", day: daysFromToday(0) },
  { id: "w2", project: "zen-ds", hours: 2, note: "Metric card guidelines", day: daysFromToday(0) },
  { id: "w3", project: "lumen-banking", hours: 6, note: "Usability sessions", day: daysFromToday(-1) },
  { id: "w4", project: "saola-brand", hours: 1.5, note: "Kickoff prep", day: daysFromToday(-1) },
  { id: "w5", project: "zen-ds", hours: 7.5, note: "Token sync", day: daysFromToday(-2) },
  { id: "w6", project: "lumen-banking", hours: 1, note: "Client check-in", day: daysFromToday(-2) },
  { id: "w7", project: "phin-loyalty", hours: 4, note: "Points history review", day: daysFromToday(-5) },
  { id: "w8", project: "zen-ds", hours: 3.5, note: "Chip size audit", day: daysFromToday(-5) },
  { id: "w9", project: "lumen-banking", hours: 5, note: "Account overview audit", day: daysFromToday(-6) },
  { id: "w10", project: "phin-loyalty", hours: 2, note: "Design critique", day: daysFromToday(-6) },
  { id: "w11", project: "zen-ds", hours: 6, note: "Bottom sheet examples", day: daysFromToday(-7) },
  { id: "w12", project: "lumen-banking", hours: 2, note: "Passkey review", day: daysFromToday(-7) },
  { id: "w13", project: "saola-brand", hours: 3, note: "Moodboard review", day: daysFromToday(-8) },
  { id: "w14", project: "lumen-banking", hours: 5, note: "Transfer limit copy", day: daysFromToday(-8) },
  { id: "w15", project: "zen-ds", hours: 8, note: "Release 0.4 QA", day: daysFromToday(-9) },
];
// The week starts on Monday, Sep 28.
const weekStart = daysFromToday(-2, 0, 0);
const hoursLabel = (hours: number) => `${hours.toFixed(1)} h`;
const dayOf = (d: Date) => d.toDateString() === TODAY.toDateString() ? "Today" : d.toDateString() === daysFromToday(-1).toDateString() ? "Yesterday" : formatDay(d);
const loggable = projects.filter((project) => project.status === "Active" || project.status === "Planning").map((project) => ({ value: project.id, label: project.name }));

type EntryDraft = { project: string; hours: number | null; note: string };

function LogTimeExample() {
  const { toast } = useToast();
  // One scroller: the large title folds as the entries run under the bar.
  const screenRef = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState(timesheet);
  const [open, setOpen] = useState(false);
  const total = entries.filter((entry) => entry.day >= weekStart).reduce((sum, entry) => sum + entry.hours, 0);
  // Log time always submits: without hours the field gets its error and focus, and the sheet stays open.
  const form = useFormState<EntryDraft>({
    initialValues: { project: "lumen-banking", hours: null, note: "" },
    validate: (v) => ({ hours: v.hours ? undefined : "Enter the hours you worked, from 0.5 to 12" }),
    onSubmit: (v, { reset }) => {
      const entry: Entry = { id: `new-${entries.length + 1}`, project: v.project, hours: v.hours!, note: v.note.trim(), day: TODAY };
      setEntries((all) => [entry, ...all]);
      setOpen(false);
      reset();
      // The new entry lands on top: scroll back to it.
      screenRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      toast({ title: "Time logged", action: { label: "Undo", onClick: () => setEntries((all) => all.filter((item) => item.id !== entry.id)) } });
    },
  });
  const start = () => { form.reset(); setOpen(true); };
  return (
    <PlatformPhone label="Timesheet" headerOverlay screenRef={screenRef} header={
      <TopNavigation title="Timesheet" largeTitle="Timesheet" scrollRef={screenRef} trailing={[{ icon: "icon-plus-line", label: "Log time", onClick: start }]} />
    }>
      <Stack gap="md" paddingY="xs">
        <Box paddingX="lg"><Metric size="xl" label="This week" value={hoursLabel(total)} icon="icon-clock-line" iconTheme="blue" iconBackground="solid" /></Box>
        <Box paddingX="lg">
          <List aria-label="Time entries">
            {entries.map((entry) => {
              const project = projectById(entry.project);
              return (
                <ListItem key={entry.id} title={project.name} caption={[dayOf(entry.day), entry.note].filter(Boolean).join(" · ")}
                  leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />}
                  trailing={<Text as="span" textStyle="Body/Base/Medium" className="px-bottom-sheet-hours">{hoursLabel(entry.hours)}</Text>} />
              );
            })}
          </List>
        </Box>
      </Stack>
      {/* Modal type as a form: Enter or Log time submits; the one required value takes focus when the sheet opens. */}
      <BottomSheet inline open={open} onOpenChange={setOpen} title="Log time" onSubmit={form.handleSubmit}
        primaryAction={{ label: "Log time" }} secondaryAction={{ label: "Cancel" }}>
        <SelectField label="Project" options={loggable} {...form.selectField("project")} />
        <NumberField label="Hours" min={0.5} max={12} step={0.5} helpText="Up to 12 hours in one entry" {...form.numberField("hours")} data-autofocus="" />
        <TextAreaField label="Note" labelOptional rows={2} placeholder="What did you work on?" {...form.field("note")} />
      </BottomSheet>
    </PlatformPhone>
  );
}

/* ───────────── 4. Filters ───────────── */

// Open work shows when it is due (soonest first); done work shows when it finished, last.
type TaskRow = { id: string; title: string; assignee: PersonId; status: TaskStatus; due: Date; finished?: Date };
const taskRows: TaskRow[] = [
  { id: "r5", title: "WCAG audit", assignee: "alex", status: "To do", due: TODAY },
  { id: "r2", title: "Rewards API review", assignee: "bao", status: "In review", due: daysFromToday(1) },
  { id: "r1", title: "Points history", assignee: "chi", status: "In progress", due: daysFromToday(2) },
  { id: "r9", title: "Moodboard review", assignee: "gia", status: "In review", due: daysFromToday(2) },
  { id: "r4", title: "Usability sessions", assignee: "ava", status: "In progress", due: daysFromToday(3) },
  { id: "r8", title: "Design QA pass", assignee: "alex", status: "In progress", due: daysFromToday(4) },
  { id: "r10", title: "Transfer limit copy", assignee: "linh", status: "In progress", due: daysFromToday(4) },
  { id: "r3", title: "Android regression", assignee: "em", status: "To do", due: daysFromToday(5) },
  { id: "r7", title: "Metric card guide", assignee: "chi", status: "In review", due: daysFromToday(6) },
  { id: "r11", title: "Passkey help page", assignee: "finn", status: "In progress", due: daysFromToday(6) },
  { id: "r12", title: "Points counter motion", assignee: "emi", status: "To do", due: daysFromToday(8) },
  { id: "r13", title: "Dark mode tokens", assignee: "alex", status: "To do", due: daysFromToday(10) },
  { id: "r14", title: "Release 0.4 notes", assignee: "bao", status: "Done", due: TODAY, finished: daysFromToday(-1) },
  { id: "r6", title: "Passkey spike", assignee: "finn", status: "Done", due: daysFromToday(1), finished: daysFromToday(-2) },
  { id: "r15", title: "Customs states map", assignee: "khoa", status: "Done", due: daysFromToday(-1), finished: daysFromToday(-3) },
];
/** Rows name the assignee by first name, and Alex's own tasks as "You". */
const owner = (id: PersonId) => (id === "alex" ? "You" : people[id].name.split(" ")[0]);
const statuses: TaskStatus[] = ["To do", "In progress", "In review", "Done"];
type TaskFilters = { status: TaskStatus[]; mine: boolean };
const noFilters: TaskFilters = { status: [], mine: false };
const matchesFilters = (row: TaskRow, filters: TaskFilters) => (!filters.status.length || filters.status.includes(row.status)) && (!filters.mine || row.assignee === "alex");

function FiltersExample() {
  // One scroller: the large title folds as the tasks run under the bar.
  const screenRef = useRef<HTMLDivElement>(null);
  const [applied, setApplied] = useState<TaskFilters>(noFilters);
  const [draft, setDraft] = useState<TaskFilters>(noFilters);
  const [open, setOpen] = useState(false);
  const chipRef = useRef<HTMLButtonElement>(null);
  const rows = taskRows.filter((row) => matchesFilters(row, applied));
  const preview = taskRows.filter((row) => matchesFilters(row, draft)).length;
  const active = applied.status.length + (applied.mine ? 1 : 0);
  // The sheet edits a draft: Show commits it, Reset clears it, dismissing throws it away.
  const openSheet = () => { setDraft(applied); setOpen(true); };
  const toggleStatus = (status: TaskStatus, on: boolean) => setDraft((current) => ({ ...current, status: on ? [...current.status, status] : current.status.filter((item) => item !== status) }));
  return (
    <PlatformPhone label="Tasks" headerOverlay screenRef={screenRef} header={<TopNavigation title="Tasks" largeTitle="Tasks" scrollRef={screenRef} />}>
      <Stack gap="md" paddingY="xs">
        <Stack direction="row" gap="xs" align="center" justify="between" paddingX="lg">
          <Chip ref={chipRef} variant="advanced" leading="icon-filter-lines-line" aria-haspopup="dialog" aria-expanded={open}
            selected={active > 0} selectionMode="multiple" selectionCount={active} onClick={openSheet} onClearSelection={() => setApplied(noFilters)}>
            Filters
          </Chip>
          <Text role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "task")}</Text>
        </Stack>
        {rows.length ? (
          <Box paddingX="lg">
            <List aria-label="Tasks">
              {rows.map((row) => (
                <ListItem key={row.id} title={row.title} caption={`${owner(row.assignee)} · ${row.finished ? `Finished ${formatDay(row.finished)}` : formatDue(row.due)}`} leading={<Avatar size="md" {...avatarOf(people[row.assignee])} />}
                  trailing={<Badge theme={taskStatusTheme[row.status]} background="subtle">{row.status}</Badge>} />
              ))}
            </List>
          </Box>
        ) : (
          <EmptyState illustration={false} headingLevel={2} title="No tasks match" secondaryAction={{ label: "Clear filters", onClick: () => { setApplied(noFilters); chipRef.current?.focus(); } }}>
            Turn off a filter to see more tasks.
          </EmptyState>
        )}
      </Stack>
      <BottomSheet inline open={open} onOpenChange={setOpen} title="Filters"
        primaryAction={{ label: `Show ${plural(preview, "task")}`, onClick: () => { setApplied(draft); setOpen(false); } }}
        secondaryAction={{ label: "Reset", onClick: () => setDraft(noFilters) }}>
        <Stack gap="lg">
          <FormFieldset legend="Status" kind="checkbox">
            {statuses.map((status) => (
              <Checkbox key={status} label={status} checked={draft.status.includes(status)} onCheckedChange={(on) => toggleStatus(status, on)} />
            ))}
          </FormFieldset>
          <FormFieldset legend="Assignee" kind="checkbox">
            <Checkbox label="Only my tasks" checked={draft.mine} onCheckedChange={(on) => setDraft((current) => ({ ...current, mine: on }))} />
          </FormFieldset>
        </Stack>
      </BottomSheet>
    </PlatformPhone>
  );
}

/* ───────────── 5. Terms to accept ───────────── */

// Phin & Co's loyalty app (a studio client): joining needs the terms read and accepted.
const terms: { title: string; body: string }[] = [
  { title: "Earning points", body: "You earn 10 points for every $1 you spend at Phin & Co stores in Vietnam, in the app or at the counter. Points show up within 24 hours." },
  { title: "Using points", body: "Rewards start at 600 points. Pick a reward in the app before you pay; the points leave your balance when your order is ready." },
  { title: "Expiry", body: "Points expire 12 months after you earn them. We email you 30 days before any of your points expire." },
  { title: "Your data", body: "We keep your orders and points to run the programme and never sell them. You can download or delete your data in Account at any time." },
  { title: "Changes", body: "We give 30 days' notice in the app before we change a reward. If the programme closes, you have 90 days to use your points." },
  { title: "Leaving", body: "You can leave in Account at any time. Points you have not used are lost when you leave." },
];
const ways: { title: string; caption: string; icon: IconName }[] = [
  { title: "Order ahead in the app", caption: "10 points for every $1", icon: "icon-coffee-cup-line" },
  { title: "Bring your own cup", caption: "20 bonus points a visit", icon: "icon-heart-hand-line" },
  { title: "Invite a friend", caption: "150 points when they join", icon: "icon-users-plus-line" },
];

function TermsExample() {
  // One scroller: the large title folds as the screen runs under the bar.
  const screenRef = useRef<HTMLDivElement>(null);
  const screen = usePhoneScreen();
  const [open, setOpen] = useState(false);
  const [member, setMember] = useState(false);
  const earnId = useId();
  // Joining removes the footer that opened the sheet, so focus moves to the member screen instead of <body>.
  const join = () => screen.go(`[id="${earnId}"]`, () => { setMember(true); setOpen(false); });
  return (
    <PlatformPhone label="Phin & Co rewards" headerOverlay screenRef={screenRef}
      header={<TopNavigation title="Rewards" largeTitle="Rewards" scrollRef={screenRef} />}
      // The screen's main action: one Large full-width Primary over the home indicator. Members have no footer.
      footer={member ? undefined : <ActionBar position="static" primaryAction={{ label: "Join Phin Rewards", onClick: () => setOpen(true) }} />}>
      {screen.anchor}
      {member ? (
        <Stack gap="lg" paddingY="xs">
          <Box paddingX="lg"><Metric size="md" label="Your points" value="0" icon="icon-gift-01-line" iconTheme="pink" /></Box>
          <Stack as="section" gap="xs" aria-labelledby={earnId}>
            <Box paddingX="lg"><Heading level={2} id={earnId} tabIndex={-1} textStyle="Body/Small/Bold" tone="light">Ways to earn</Heading></Box>
            <Box paddingX="lg">
              <List aria-labelledby={earnId}>
                {ways.map((way) => <ListItem key={way.title} title={way.title} caption={way.caption} leading={<DockIcon icon={way.icon} theme="orange" background="subtle" size="md" />} />)}
              </List>
            </Box>
          </Stack>
        </Stack>
      ) : (
        <Stack gap="md" paddingX="lg" paddingY="xs">
          <Image src={platformMedia.site[5].src} alt={platformMedia.site[5].alt} ratio="4:3" radius="lg" loading="eager" />
          <Stack gap="xs">
            <Heading level={2} textStyle="Heading/Subheading">A free drink every 1,500 points</Heading>
            <Text tone="base">Earn 10 points for every $1 at any Phin & Co. Members get a birthday drink and early access to new blends.</Text>
          </Stack>
        </Stack>
      )}
      {/* Long reading: full height, the body scrolls under the fixed header, the actions stay stacked at the bottom. */}
      <BottomSheet inline size="max" open={open} onOpenChange={setOpen} title="Phin Rewards terms" actionsDirection="vertical"
        primaryAction={{ label: "Agree and join", onClick: join }} secondaryAction={{ label: "Not now" }}>
        <Stack gap="lg">
          <Text textStyle="Body/Small/Regular" tone="base">{`Last updated ${formatDate(daysFromToday(-29))}`}</Text>
          {terms.map((section) => (
            <Stack key={section.title} gap="xs">
              <Heading level={3} textStyle="Heading/Subheading">{section.title}</Heading>
              <Text>{section.body}</Text>
            </Stack>
          ))}
        </Stack>
      </BottomSheet>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "File actions",
    description: "The Action type lists what you can do with one file, titled with its name. Copy link and Download run and close; Delete file is marked destructive and comes last, and an Undo in the toast brings the file back.",
    render: () => <FileActionsExample />,
    code: `<PlatformPhone headerOverlay screenRef={screenRef}
  header={<TopNavigation title="Files" largeTitle="Files" scrollRef={screenRef} />}>
  <Box paddingX="lg">
    <List aria-label="Brand refresh files">
      {files.map((file) => (
        <ListItem key={file.id} title={file.name} caption={caption(file)} leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
          trailing={<IconButton appearance="flat" icon="icon-dots-horizontal-line" aria-label={\`More actions for \${file.name}\`}
            aria-haspopup="dialog" onClick={() => { setFileId(file.id); setSheet(true); }} />} />
      ))}
    </List>
  </Box>

  <BottomSheet inline type="action" open={sheet} onOpenChange={setSheet} title={file.name}
    items={[
      { id: "link", label: "Copy link", icon: "icon-link-01-line" },
      { id: "download", label: "Download", icon: "icon-download-01-line", trailing: formatBytes(file.bytes) },
      { id: "delete", label: "Delete file", icon: "icon-trash-line", destructive: true },
    ]}
    onSelect={(item) => choose(item.id)} />
</PlatformPhone>`,
  },
  {
    title: "Pick one",
    description: "A choice is a List of rows with the current one Selected and checked; picking closes the sheet and focus returns to the setting. Short lists hug their rows, and the long time zone list takes the full height with a Search.",
    render: () => <PickOneExample />,
    code: `<PlatformPhone canvas="alt" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" title="Settings" largeTitle="Settings" scrollRef={screenRef} />}>
  {/* Language and region · Notifications · Privacy · Storage: a kicker over a white block, every row opens its choice */}
  <Stack gap="lg" padding="lg">
    <Stack as="section" gap="xs" aria-labelledby="region">
      <Box paddingX="lg"><Heading level={2} id="region" textStyle="Body/Small/Bold" tone="light">Language and region</Heading></Box>
      <ListBox>
        <List aria-labelledby="region">
          <ListItem title="Time zone" caption={\`\${zone.city} (\${gmt(zone.offset)})\`} aria-haspopup="dialog" onClick={() => open("zone")}
            leading={<DockIcon icon="icon-clock-line" theme="green" background="subtle" />}
            trailing={<Icon name="icon-chevron-right-line" size="base" decorative />} />
        </List>
      </ListBox>
    </Stack>
  </Stack>

  <BottomSheet inline size="max" open={openId === "zone"} onOpenChange={(shown) => { if (!shown) close(); }} title="Time zone"
    search={<Search placeholder="Search cities" aria-label="Search cities" value={query} onValueChange={setQuery} />}>
    <List aria-label="Time zones">
      {matches.map((zone) => (
        <ListItem key={zone.id} title={zone.city} caption={\`\${gmt(zone.offset)} · \${timeIn(zone.offset)}\`}
          selected={zone.id === zoneId}
          trailing={zone.id === zoneId ? <Icon name="icon-check-line" size="base" decorative /> : undefined}
          onClick={() => { setZoneId(zone.id); close(); }} />
      ))}
    </List>
  </BottomSheet>
</PlatformPhone>`,
  },
  {
    title: "Log time",
    description: "The Modal type holds a short form: the Hours field takes focus, Enter submits, and Log time without hours puts the error on the field and focus back in it. Saving adds the entry on top of the timesheet, with Undo in the toast.",
    render: () => <LogTimeExample />,
    code: `const form = useFormState({
  initialValues: { project: "lumen-banking", hours: null, note: "" },
  validate: (v) => ({ hours: v.hours ? undefined : "Enter the hours you worked, from 0.5 to 12" }),
  onSubmit: (v, { reset }) => { addEntry(v); setOpen(false); reset(); },
});

<PlatformPhone headerOverlay screenRef={screenRef} header={
  <TopNavigation title="Timesheet" largeTitle="Timesheet" scrollRef={screenRef}
    trailing={[{ icon: "icon-plus-line", label: "Log time", onClick: start }]} />
}>
  {entries}
  <BottomSheet inline open={open} onOpenChange={setOpen} title="Log time" onSubmit={form.handleSubmit}
    primaryAction={{ label: "Log time" }} secondaryAction={{ label: "Cancel" }}>
    <SelectField label="Project" options={projects} {...form.selectField("project")} />
    <NumberField label="Hours" min={0.5} max={12} step={0.5} helpText="Up to 12 hours in one entry"
      {...form.numberField("hours")} data-autofocus="" />
    <TextAreaField label="Note" labelOptional rows={2} {...form.field("note")} />
  </BottomSheet>
</PlatformPhone>`,
  },
  {
    title: "Filters",
    description: "Filters edit a draft: the Primary counts the tasks it will show, Reset clears the draft, and closing the sheet throws it away. When nothing matches, the list offers Clear filters.",
    render: () => <FiltersExample />,
    code: `<PlatformPhone headerOverlay screenRef={screenRef}
  header={<TopNavigation title="Tasks" largeTitle="Tasks" scrollRef={screenRef} />}>
  <Chip variant="advanced" leading="icon-filter-lines-line" aria-haspopup="dialog" aria-expanded={open}
    selected={active > 0} selectionMode="multiple" selectionCount={active}
    onClick={() => { setDraft(applied); setOpen(true); }} onClearSelection={() => setApplied(noFilters)}>
    Filters
  </Chip>
  {tasks}

  <BottomSheet inline open={open} onOpenChange={setOpen} title="Filters"
    primaryAction={{ label: \`Show \${plural(preview, "task")}\`, onClick: () => { setApplied(draft); setOpen(false); } }}
    secondaryAction={{ label: "Reset", onClick: () => setDraft(noFilters) }}>
    <FormFieldset legend="Status" kind="checkbox">
      {statuses.map((status) => <Checkbox key={status} label={status} checked={draft.status.includes(status)}
        onCheckedChange={(on) => toggleStatus(status, on)} />)}
    </FormFieldset>
  </BottomSheet>
</PlatformPhone>`,
  },
  {
    title: "Terms to accept",
    description: "Long reading takes the full height: the terms scroll under a fixed header while Agree and join and Not now stay stacked at the bottom, each at its own height. The screen's own Join action sits in an Action Bar footer.",
    render: () => <TermsExample />,
    code: `<PlatformPhone headerOverlay screenRef={screenRef}
  header={<TopNavigation title="Rewards" largeTitle="Rewards" scrollRef={screenRef} />}
  footer={member ? undefined : <ActionBar position="static" primaryAction={{ label: "Join Phin Rewards", onClick: () => setOpen(true) }} />}>
  {intro}
  <BottomSheet inline size="max" open={open} onOpenChange={setOpen} title="Phin Rewards terms" actionsDirection="vertical"
    primaryAction={{ label: "Agree and join", onClick: join }}
    secondaryAction={{ label: "Not now" }}>
    {terms.map((section) => (
      <Stack key={section.title} gap="xs">
        <Heading level={3} textStyle="Heading/Subheading">{section.title}</Heading>
        <Text>{section.body}</Text>
      </Stack>
    ))}
  </BottomSheet>
</PlatformPhone>`,
  },
]);
