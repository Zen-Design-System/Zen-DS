import { useRef, useState, type RefObject } from "react";
import { AppShell, Avatar, BadgeStatus, BottomSheet, Checkbox, Chip, EmptyState, FormFieldset, List, ListItem, Stack, Text, TopNavigation, plural } from "@zen-ds/react";
import { TODAY, daysFromToday, formatDay, formatDue, initials, people, taskStep, type Person, type PersonId, type TaskStatus } from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. The row title already names them. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
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

/** Tasks on a phone: the Filters chip opens a Bottom Sheet that edits a draft of the filters. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function Filters({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
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
    <>
      {/* A tab root: the large title folds into the bar as the tasks run under it. */}
      <AppShell topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Tasks" largeTitle="Tasks" />}>
        <Stack gap="md">
          <Stack direction="row" gap="xs" align="center" justify="between">
            <Chip ref={chipRef} variant="advanced" leading="icon-filter-lines-line" aria-haspopup="dialog" aria-expanded={open}
              selected={active > 0} selectionMode="multiple" selectionCount={active} onClick={openSheet} onClearSelection={() => setApplied(noFilters)}>
              Filters
            </Chip>
            <Text role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "task")}</Text>
          </Stack>
          {rows.length ? (
            <List aria-label="Tasks">
              {rows.map((row) => (
                <ListItem key={row.id} title={row.title} caption={`${owner(row.assignee)} · ${row.finished ? `Finished ${formatDay(row.finished)}` : formatDue(row.due)}`} leading={<Avatar size="md" {...avatarOf(people[row.assignee])} />}
                  trailing={<BadgeStatus status={taskStep[row.status]}>{row.status}</BadgeStatus>} />
              ))}
            </List>
          ) : (
            // Clear filters goes away with the empty list: focus moves to the Filters chip.
            <EmptyState headingLevel={2} icon="icon-search-medium-line" title="No tasks match" secondaryAction={{ label: "Clear filters", onClick: () => { setApplied(noFilters); chipRef.current?.focus(); } }}>
              Turn off a filter to see more tasks.
            </EmptyState>
          )}
        </Stack>
      </AppShell>
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
    </>
  );
}
