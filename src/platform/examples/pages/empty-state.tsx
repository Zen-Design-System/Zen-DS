/* Empty State examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio in Zen: Alex's first
   expense, his tasks filtered to nothing, a review queue he has cleared, a file he can't open on his phone, and a
   client's uploads while they load. An Empty State shows only once the data is there and really empty. Each demo
   copies its data into local state; EmptyState comes from ../../../components/EmptyState. */
import { useEffect, useRef, useState } from "react";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Button, IconButton } from "../../../components/Button";
import { Chip } from "../../../components/Chip";
import { DescriptionList } from "../../../components/DescriptionList";
import { ModalForm } from "../../../components/Dialog";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { InlineMessage } from "../../../components/InlineMessage";
import { DateField, InputField, SelectField } from "../../../components/Input";
import { Container, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { PageHeader } from "../../../components/PageHeader";
import { Segmented } from "../../../components/Segmented";
import { SkeletonShape, SkeletonText } from "../../../components/Skeleton";
import { Table, TableActions, TableBadges, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import {
  TODAY, daysFromToday, files, formatBytes, formatDate, formatDue, formatMoney, formatRelative, initials, people, projectById,
  projects, taskStatusTheme, type Person, type PersonId, type Priority, type StudioFile, type TaskStatus,
} from "../data";
import { keepOnHotUpdate } from "../../hotData";
import "./empty-state.css";

export const page: PlatformPage = "empty-state";

// ——— Shared helpers ————————————————————————————————————————————————————————————————————————————
/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };
/** Focus a control once the next render has put it on screen (the button that was pressed may be gone by then). */
const focusSoon = (find: () => HTMLElement | null | undefined) => requestAnimationFrame(() => find()?.focus());

// ——— 1. First run: the page's only Primary is the Empty State's ————————————————————————————————————————
type Expense = { id: string; what: string; project: string; date: Date; amount: number };
const approver = people.mai;
const expenseProjects = projects.filter((project) => project.status !== "Completed").map((project) => ({ value: project.id, label: `${project.name} · ${project.client}` }));
/** "09/30/2026" (the DateField's typed format) → a Date, or null while it is incomplete. */
const parseDay = (text: string) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  const d = m ? new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])) : null;
  return d && d.getDate() === Number(m?.[2]) && d <= TODAY ? d : null;
};
const todayText = "09/30/2026";

function FirstRun() {
  const { toast } = useToast();
  const pageRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<Expense[]>([]);
  const [open, setOpen] = useState(false);
  const [what, setWhat] = useState("");
  const [amount, setAmount] = useState("");
  const [project, setProject] = useState(expenseProjects[0].value);
  const [date, setDate] = useState(todayText);
  const [errors, setErrors] = useState<{ what?: string; amount?: string; date?: string }>({});
  const start = () => { setWhat(""); setAmount(""); setProject(expenseProjects[0].value); setDate(todayText); setErrors({}); setOpen(true); };
  const add = () => {
    const value = Number(amount.replace(/[$,\s]/g, ""));
    const day = parseDay(date);
    const next = {
      what: what.trim() ? undefined : "Say what the expense was for.",
      amount: value > 0 ? undefined : "Enter the amount on the receipt, like 42.50.",
      date: day ? undefined : "Enter the date on the receipt, today or earlier.",
    };
    setErrors(next);
    // A blocked submit: ModalForm moves focus to the first field in error, so its message is read out.
    if (next.what || next.amount || next.date || !day) return;
    setRows((list) => [{ id: `e${list.length}-${what.length}`, what: what.trim(), project, date: day, amount: value }, ...list]);
    setOpen(false);
    toast({ title: "Expense added" });
  };
  // Deleting is undoable, so it acts at once and offers Undo; the last delete brings the Empty State back.
  const remove = (row: Expense) => {
    const index = rows.indexOf(row);
    setRows((list) => list.filter((item) => item.id !== row.id));
    toast({ title: "Expense deleted", action: { label: "Undo", onClick: () => setRows((list) => [...list.slice(0, index), row, ...list.slice(index)]) } });
    focusSoon(() => pageRef.current?.querySelector<HTMLElement>(".zen-table button, .zen-empty-state button"));
  };
  const columns: TableColumn<Expense>[] = [
    { id: "what", header: "Expense", cell: (row) => <TableText bold caption={projectById(row.project).name}>{row.what}</TableText> },
    { id: "date", header: "Date", width: "140px", cell: (row) => <TableText>{formatDate(row.date)}</TableText> },
    { id: "status", header: "Status", width: "120px", cell: () => <TableBadges><Badge size="medium" background="subtle" theme="yellow">Pending</Badge></TableBadges> },
    { id: "amount", header: "Amount", align: "right", width: "140px", cell: (row) => <TableText>{formatMoney(row.amount, true)}</TableText> },
    {
      id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", width: "72px",
      cell: (row) => <TableActions><IconButton appearance="flat" size="md" icon="icon-trash-line" aria-label={`Delete ${row.what}`} onClick={() => remove(row)} /></TableActions>,
    },
  ];
  return (
    <Container maxWidth="full">
      <Stack ref={pageRef} paddingY="xl" gap="xl">
        {/* While the page is empty its only Primary is the Empty State's; the header takes it back once a row exists. */}
        <PageHeader title="Expenses" description={`What you paid for the studio. ${approver.name} approves them every Friday.`}
          actions={rows.length ? <Button level="primary" startIcon="icon-plus-line" onClick={start}>Add expense</Button> : undefined} />
        {rows.length ? (
          <Table aria-label="Expenses" columns={columns} rows={rows} />
        ) : (
          <EmptyState headingLevel={2} icon="icon-receipt-line" title="No expenses yet"
            primaryAction={{ label: "Add expense", onClick: start }}>
            {`Add a receipt and ${approver.name} approves it by Friday.`}
          </EmptyState>
        )}
      </Stack>
      <ModalForm open={open} onOpenChange={setOpen} title="Add expense" description="Keep the receipt; Finance may ask for it."
        onSubmit={add} primaryAction={{ label: "Add expense" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Description" placeholder="Client lunch with Phin & Co" autoComplete="off" value={what}
          onValueChange={(value) => { setWhat(value); setErrors((e) => ({ ...e, what: undefined })); }} error={errors.what} />
        <InputField label="Amount (USD)" inputMode="decimal" autoComplete="off" value={amount}
          onValueChange={(value) => { setAmount(value); setErrors((e) => ({ ...e, amount: undefined })); }} error={errors.amount} />
        <SelectField label="Project" options={expenseProjects} value={project} onValueChange={setProject} />
        <DateField label="Date" today={TODAY} value={date} onValueChange={(value) => { setDate(value); setErrors((e) => ({ ...e, date: undefined })); }} error={errors.date} />
      </ModalForm>
    </Container>
  );
}

// ——— 2. Filtered to nothing: say so, and offer the way out ————————————————————————————————————————
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

function FilteredToNothing() {
  const chipsRef = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState<string[]>(["overdue"]);
  const toggle = (id: string) => setOn((list) => list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const visible = myTasks.filter((task) => quickFilters.every((filter) => !on.includes(filter.id) || filter.test(task)));
  // Clear filters disappears with the Empty State, so focus moves to the first filter instead of the page.
  const clear = () => { setOn([]); focusSoon(() => chipsRef.current?.querySelector("button")); };
  return (
    // A ListBox: title, count and quick filters in its Header-Slot; the tasks, or the Empty State, in its Body-Slot.
    <ListBox className="px-empty-state-card"
      header={<>
        <Stack gap="2xs">
          <Heading level={4} textStyle="Heading/Subheading">My tasks</Heading>
          <Text role="status" textStyle="Body/Small/Regular" tone="base">{`${visible.length} of ${plural(myTasks.length, "task")}`}</Text>
        </Stack>
        <Stack ref={chipsRef} direction="row" gap="xs" wrap role="group" aria-label="Quick filters">
          {quickFilters.map((filter) => (
            <Chip key={filter.id} variant="normal" level="secondary" selected={on.includes(filter.id)} onClick={() => toggle(filter.id)}>
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
                trailing={<Badge theme={taskStatusTheme[task.status]} background="subtle">{task.status}</Badge>} />
            );
          })}
        </List>
      ) : (
        <EmptyState illustration headingLevel={5} title="No tasks match"
          secondaryAction={{ label: "Clear filters", onClick: clear }}
          icon="icon-check-circle-broken-line">
          {`Try another filter, or clear them to see all ${plural(myTasks.length, "task")}.`}
        </EmptyState>
      )}
    </ListBox>
  );
}

// ——— 3. All caught up: an empty queue is good news, with no action to push ———————————————————————————
type Review = { id: string; key: string; task: string; by: PersonId; at: Date };
const approved: Review[] = [
  { id: "r1", key: "ZEN-402", task: "Add Disabled back to Input and Search", by: "bao", at: daysFromToday(0, 9, 48) },
  { id: "r2", key: "LUM-095", task: "Spike: passkey sign-in on iOS", by: "finn", at: daysFromToday(-1, 17, 20) },
  { id: "r3", key: "SAO-002", task: "Pick the type pairing for Saola", by: "gia", at: daysFromToday(-2, 11, 5) },
];

function AllCaughtUp() {
  const [view, setView] = useState("open");
  return (
    // A ListBox: title and view switch in its Header-Slot; the done reviews, or the Empty State, in its Body-Slot.
    <ListBox className="px-empty-state-card"
      header={<Stack direction="row" align="center" justify="between" gap="xs" wrap>
        <Stack gap="2xs">
          <Heading level={4} textStyle="Heading/Subheading">Reviews</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Work your team asked you to approve</Text>
        </Stack>
        <Segmented aria-label="Reviews" value={view} onValueChange={setView} options={[
          { id: "open", label: "To review" },
          { id: "done", label: "Done", badge: approved.length },
        ]} />
      </Stack>}>
      {view === "open" ? (
        <EmptyState illustration headingLevel={5} title="You're all caught up" icon="icon-star-04-line">
          New review requests from your team show up here.
        </EmptyState>
      ) : (
        <List aria-label="Done reviews">
          {approved.map((review) => (
            <ListItem key={review.id} title={review.task} caption={`${people[review.by].name} · ${formatRelative(review.at)}`}
              leading={<Avatar size="md" {...avatarOf(people[review.by])} />}
              trailing={<Badge theme={taskStatusTheme.Done} background="subtle">Done</Badge>} />
          ))}
        </List>
      )}
    </ListBox>
  );
}

// ——— 4. No access on a phone: explain, then offer the one step that helps ——————————————————————————————
type PhoneFile = StudioFile & { locked?: boolean };
/** Files shared with Alex, newest first. Finance's Q3 report and People Ops' salary bands are locked to him. */
const newestFirst = (list: PhoneFile[]) => [...list].sort((a, b) => b.updated.getTime() - a.updated.getTime());
const sharedFiles = newestFirst([
  ...files.map((file) => ({ ...file, locked: file.id === "f4" })),
  { id: "f7", name: "Transfer flow v4.fig", bytes: 24_600_000, owner: "ava", project: "lumen-banking", updated: daysFromToday(0, 9, 5) },
  { id: "f8", name: "Points expiry copy.docx", bytes: 64_000, owner: "linh", project: "phin-loyalty", updated: daysFromToday(-1, 11, 30) },
  { id: "f9", name: "Customs hold states.pdf", bytes: 980_000, owner: "duy", project: "mekong-tracking", updated: daysFromToday(-2, 15, 10) },
  { id: "f10", name: "Salary bands 2026.xlsx", bytes: 98_000, owner: "minhAnh", project: "zen-ds", updated: daysFromToday(-5, 9, 15), locked: true },
  { id: "f11", name: "Outdoor range moodboard.png", bytes: 8_200_000, owner: "gia", project: "saola-brand", updated: daysFromToday(-5, 10, 0) },
  { id: "f12", name: "Transfers usability notes.docx", bytes: 210_000, owner: "ava", project: "lumen-banking", updated: daysFromToday(-6, 17, 15) },
  { id: "f13", name: "Zen tokens export.json", bytes: 412_000, owner: "finn", project: "zen-ds", updated: daysFromToday(-8, 9, 50) },
  { id: "f14", name: "Tier badges.svg", bytes: 42_000, owner: "gia", project: "phin-loyalty", updated: daysFromToday(-14, 16, 30) },
  { id: "f15", name: "Shipment tracking – app map.pdf", bytes: 3_100_000, owner: "duy", project: "mekong-tracking", updated: daysFromToday(-23, 10, 15) },
]);
const bareName = (name: string) => name.replace(/\.[a-z0-9]+$/i, "");

function NoAccess() {
  const screen = usePhoneScreen();
  // One scroller per screen, so the large title folds as the list runs under the header.
  const screenRef = useRef<HTMLDivElement>(null);
  const emptyRef = useRef<HTMLElement>(null);
  const [openId, setOpenId] = useState<string | null>("f4");
  const [requested, setRequested] = useState<string[]>([]);
  const file = sharedFiles.find((item) => item.id === openId);
  const owner = file ? people[file.owner] : null;
  // The pressed button is swapped for the other one, so focus follows it.
  const setRequest = (id: string, next: boolean) => {
    setRequested((list) => next ? [...list, id] : list.filter((x) => x !== id));
    focusSoon(() => emptyRef.current?.querySelector("button"));
  };

  if (!file || !owner) {
    return (
      <PlatformPhone key="root" label="Files" headerOverlay screenRef={screenRef}
        header={<TopNavigation title="Files" largeTitle="Files" scrollRef={screenRef} />}>
        {screen.anchor}
        <List aria-label="Shared with you">
          {sharedFiles.map((item) => (
            <ListItem key={item.id} data-file={item.id} title={item.name}
              caption={`${people[item.owner].name} · ${item.locked ? "No access" : formatRelative(item.updated)}`}
              leading={<FileIcon format={fileIconFormatOf(item.name)} size="xl" />}
              onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpenId(item.id))} />
          ))}
        </List>
      </PlatformPhone>
    );
  }
  const asked = requested.includes(file.id);
  return (
    <PlatformPhone key={file.id} label="File" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact" title={bareName(file.name)} scrollRef={screenRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go(`[data-file="${file.id}"] .zen-list-item__wrapper`, () => setOpenId(null)) }} />}>
      {screen.anchor}
      {file.locked ? (
        <Stack padding="lg">
          {/* aria-live: the caption and the action change after a request, and a screen reader hears the new state. */}
          <EmptyState ref={emptyRef} aria-live="polite" headingLevel={2} icon="icon-lock-01-line" title="No access to this file"
            primaryAction={asked ? undefined : { label: "Request access", onClick: () => setRequest(file.id, true) }}
            secondaryAction={asked ? { label: "Withdraw request", onClick: () => setRequest(file.id, false) } : undefined}>
            {asked
              ? `${owner.name} has your request and answers by email.`
              : `Request access and ${owner.name}, who owns it, gets an email.`}
          </EmptyState>
        </Stack>
      ) : (
        <Stack padding="lg" gap="md">
          <FileIcon format={fileIconFormatOf(file.name)} size="3xl" />
          <DescriptionList divider items={[
            { term: "Owner", description: owner.name },
            { term: "Project", description: projectById(file.project).name },
            { term: "Size", description: formatBytes(file.bytes) },
            { term: "Updated", description: formatRelative(file.updated) },
          ]} />
        </Stack>
      )}
    </PlatformPhone>
  );
}

// ——— 5. Loading and errors: neither is an Empty State ————————————————————————————————————————————
type Phase = "loading" | "failed" | "loaded";
const saola = projectById("saola-brand");
const skeletonRows = [1, 2, 3];

function ClientUploads() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [attempt, setAttempt] = useState(0);
  const [asking, setAsking] = useState(false);
  // The demo's first refresh fails once, so the failed state can be seen; every other load comes back empty.
  useEffect(() => {
    if (phase !== "loading") return undefined;
    const timer = window.setTimeout(() => setPhase(attempt === 1 ? "failed" : "loaded"), 1200);
    return () => window.clearTimeout(timer);
  }, [phase, attempt]);
  const refreshRef = useRef<HTMLButtonElement>(null);
  const load = () => { setAttempt((n) => n + 1); setPhase("loading"); };
  // Try again goes with the Inline Message, so focus waits on Refresh while the uploads load.
  const retry = () => { load(); focusSoon(() => refreshRef.current); };
  return (
    <>
    {/* A ListBox: title and Refresh in its Header-Slot; the Skeleton rows, the Inline Message or the Empty State in its
        Body-Slot, in place of the uploads. */}
    <ListBox className="px-empty-state-card"
      header={<Stack direction="row" align="start" justify="between" gap="xs">
        <Stack gap="2xs">
          <Heading level={4} textStyle="Heading/Subheading">Client uploads</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${saola.name} · ${saola.client}`}</Text>
        </Stack>
        <IconButton ref={refreshRef} icon="icon-refresh-cw-01-line" aria-label="Refresh uploads" onClick={load} />
      </Stack>}>
      <VisuallyHidden role="status">{phase === "loading" ? "Loading uploads…" : ""}</VisuallyHidden>
      {phase === "loading" ? (
        // Loading keeps the shape of the rows that will come: Skeleton, never an Empty State.
        <List aria-hidden="true">
          {skeletonRows.map((row) => (
            <ListItem key={row} leading={<SkeletonShape shape="square" size="md" />}
              title={<SkeletonText lines={1} className="px-empty-state-line px-empty-state-line--title" />}
              caption={<SkeletonText lines={1} className="px-empty-state-line px-empty-state-line--caption" />} />
          ))}
        </List>
      ) : phase === "failed" ? (
        // A failed load is an error to fix, not "nothing here": Inline Message with the retry.
        <InlineMessage theme="negative" title="Uploads couldn't load" action={{ label: "Try again", onClick: retry }}>
          The file server didn't answer in time.
        </InlineMessage>
      ) : (
        <EmptyState illustration headingLevel={5} title="No uploads yet"
          primaryAction={{ label: "Request files", onClick: () => setAsking(true) }}>
          {`Files ${saola.client} shares for ${saola.name} show up here.`}
        </EmptyState>
      )}
    </ListBox>
    <DemoFieldDialog open={asking} onOpenChange={setAsking} title="Request files"
      description={`${saola.client} gets an email with a link to upload.`}
      field={{ kind: "email", label: "Client email", placeholder: "an@saola.vn" }} submitLabel="Send request"
      confirm={(email) => `Request sent to ${email}`} />
    </>
  );
}

// ——— Examples ———————————————————————————————————————————————————————————————————————————————————————
export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "First run",
    description: "A new page has nothing yet, so the Empty State keeps its illustration and carries the page's only Primary. Once an expense exists the table takes over and Add expense moves to the page header; deleting the last one brings the Empty State back.",
    wide: true,
    screen: true,
    code: `<PageHeader title="Expenses" description="What you paid for the studio. Mai Ho approves them every Friday."
  actions={rows.length ? <Button level="primary" startIcon="icon-plus-line" onClick={start}>Add expense</Button> : undefined} />

{rows.length ? (
  <Table aria-label="Expenses" columns={columns} rows={rows} />
) : (
  <EmptyState headingLevel={2} icon="icon-receipt-line" title="No expenses yet"
    primaryAction={{ label: "Add expense", onClick: start }}>
    Add a receipt and Mai Ho approves it by Friday.
  </EmptyState>
)}`,
    render: () => <FirstRun />,
  },
  {
    title: "No access",
    description: "A file Alex can't open on his phone: the Empty State fills the screen under the bar, says who owns it and offers Request access. The caption and action change after the request, and aria-live reads the new state.",
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone key={file.id} headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact" title="Q3 studio report" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToFiles }} />}>
  <Stack padding="lg">
    <EmptyState aria-live="polite" headingLevel={2} icon="icon-lock-01-line" title="No access to this file"
      primaryAction={requested ? undefined : { label: "Request access", onClick: () => setRequested(true) }}
      secondaryAction={requested ? { label: "Withdraw request", onClick: () => setRequested(false) } : undefined}>
      {requested
        ? "Mai Ho has your request and answers by email."
        : "Request access and Mai Ho, who owns it, gets an email."}
    </EmptyState>
  </Stack>
</PlatformPhone>`,
    render: () => <NoAccess />,
  },
  {
    title: "Filtered to nothing",
    description: "When filters leave nothing, the title says no tasks match and the only action is the way out: Clear filters as the Tertiary. Focus moves to the first filter once it is gone.",
    code: `const clear = () => { setOn([]); focusFirstFilter(); };

{/* The Empty State takes the list's place in the ListBox's Body-Slot. */}
<ListBox header={<>{/* title + count, then the quick filter Chips */}</>}>
  {visible.length ? (
    <List aria-label="My tasks">…</List>
  ) : (
    <EmptyState illustration headingLevel={5} title="No tasks match"
      secondaryAction={{ label: "Clear filters", onClick: clear }}
      icon="icon-check-circle-broken-line">
      {\`Try another filter, or clear them to see all \${plural(myTasks.length, "task")}.\`}
    </EmptyState>
  )}
</ListBox>`,
    render: () => <FilteredToNothing />,
  },
  {
    title: "All caught up",
    description: "An empty review queue is good news: the Empty State says so and pushes no action. The Segmented view switch is the way to what was done.",
    code: `<ListBox header={<Stack direction="row" align="center" justify="between" gap="xs" wrap>
  {/* title + caption */}
  <Segmented aria-label="Reviews" value={view} onValueChange={setView} options={[
    { id: "open", label: "To review" },
    { id: "done", label: "Done", badge: approved.length },
  ]} />
</Stack>}>
  {view === "open" ? (
    <EmptyState illustration headingLevel={5} title="You're all caught up" icon="icon-star-04-line">
      New review requests from your team show up here.
    </EmptyState>
  ) : (
    <List aria-label="Done reviews">…</List>
  )}
</ListBox>`,
    render: () => <AllCaughtUp />,
  },
  {
    title: "Loading and errors",
    description: "Loading shows Skeleton rows and a failed load shows an Inline Message with Try again; only a load that came back empty shows the Empty State. The first refresh here fails once.",
    code: `// Try again goes with the message: focus waits on Refresh while the uploads load.
const retry = () => { load(); refreshRef.current?.focus(); };

<ListBox header={<Stack direction="row" align="start" justify="between" gap="xs">
  {/* title + caption */}
  <IconButton ref={refreshRef} icon="icon-refresh-cw-01-line" aria-label="Refresh uploads" onClick={load} />
</Stack>}>
  {phase === "loading" ? (
    <List aria-hidden="true">{/* Skeleton rows */}</List>
  ) : phase === "failed" ? (
    <InlineMessage theme="negative" title="Uploads couldn't load" action={{ label: "Try again", onClick: retry }}>
      The file server didn't answer in time.
    </InlineMessage>
  ) : (
    <EmptyState illustration headingLevel={5} title="No uploads yet"
      primaryAction={{ label: "Request files", onClick: () => setAsking(true) }}>
      Files Saola Outdoor shares for Brand refresh show up here.
    </EmptyState>
  )}
</ListBox>`,
    render: () => <ClientUploads />,
  },
]);
