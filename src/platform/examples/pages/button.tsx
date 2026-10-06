import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Checkbox } from "../../../components/Checkbox";
import { DescriptionList } from "../../../components/DescriptionList";
import { Dialog } from "../../../components/Dialog";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { Form, FormActions, useFormState } from "../../../components/Form";
import { Image } from "../../../components/Image";
import { InlineMessage } from "../../../components/InlineMessage";
import { InputField } from "../../../components/Input";
import { Box, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { PageHeader } from "../../../components/PageHeader";
import { Table, TableMedia, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { platformMedia } from "../../PlatformMedia";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import {
  daysFromToday, files, formatBytes, formatDate, formatDay, formatMoney, formatRange, formatRelative, initials, invoiceStatusTheme, invoices, leaveRequests, leaveStatusTheme,
  people, projectStatusTheme, tasks, taskStatusTheme, type InvoiceStatus, type LeaveRequest, type Person, type PersonId, type ProjectStatus, type StudioFile, type TaskStatus,
} from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import "./button.css";

export const page: PlatformPage = "button";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };

/* ───────────── Page actions ───────────── */

type TaskRow = { id: string; key: string; title: string; assignee: PersonId; status: TaskStatus; due: Date };
const loyaltyTasks: TaskRow[] = [
  ...tasks.filter((task) => task.project === "phin-loyalty").map(({ id, key, title, assignee, status, due }) => ({ id, key, title, assignee, status, due })),
  { id: "p1", key: "PHIN-226", title: "Write the rewards FAQ", assignee: "linh", status: "To do", due: daysFromToday(9) },
  { id: "p2", key: "PHIN-208", title: "Draw the loyalty tier badges", assignee: "gia", status: "Done", due: daysFromToday(-4) },
];

const taskColumns: TableColumn<TaskRow>[] = [
  { id: "task", header: "Task", cell: (row) => <TableText bold caption={row.key}>{row.title}</TableText> },
  { id: "assignee", header: "Assignee", width: "200px", cell: (row) => <TableMedia bold={false} media={<Avatar size="xs" {...avatarOf(people[row.assignee])} />}>{people[row.assignee].name}</TableMedia> },
  { id: "status", header: "Status", width: "140px", cell: (row) => <Badge theme={taskStatusTheme[row.status]} background="subtle">{row.status}</Badge> },
  { id: "due", header: "Due", width: "140px", cell: (row) => <TableText>{formatDate(row.due)}</TableText> },
];

function PageActionsExample() {
  const { toast } = useToast();
  const [rows, setRows] = useState(loyaltyTasks);
  const [status, setStatus] = useState<ProjectStatus>("Active");
  const [dialog, setDialog] = useState<"share" | "task" | null>(null);
  const tasksId = useId();
  // New task adds a row at the top; its key continues the project's sequence.
  const addTask = (title: string) => setRows((list) => [{ id: `new-${list.length}`, key: `PHIN-${224 + list.length}`, title, assignee: "alex", status: "To do", due: daysFromToday(7) }, ...list]);
  const putOnHold = () => {
    setStatus("On hold");
    toast({ title: "Project put on hold", action: { label: "Undo", onClick: () => setStatus("Active") } });
  };
  return (
    <Box className="px-button-page">
      <Stack gap="xl">
        <PageHeader
          eyebrow="Phin & Co"
          title="Loyalty app"
          meta={<Badge theme={projectStatusTheme[status]} background="subtle">{status}</Badge>}
          description="Points, rewards and checkout for the Phin & Co coffee app. Launch is due Nov 2, 2026."
          actions={<>
            <Button level="tertiary" startIcon="icon-share-01-line" onClick={() => setDialog("share")}>Share</Button>
            <Menu align="end" trigger={<IconButton icon="icon-dots-horizontal-line" aria-label="More actions" />} items={[
              { id: "duplicate", label: "Duplicate project", onSelect: () => toast({ title: "Project duplicated" }) },
              { id: "hold", label: "Put on hold", disabled: status === "On hold", onSelect: putOnHold },
            ]} />
            <Button level="primary" startIcon="icon-plus-line" onClick={() => setDialog("task")}>New task</Button>
          </>}
        />
        {/* The task table is the section's content: it lies on the page under its h2, no Card. */}
        <Stack as="section" gap="lg" aria-labelledby={tasksId}>
          <Heading level={2} id={tasksId}>Tasks</Heading>
          <Table aria-labelledby={tasksId} columns={taskColumns} rows={rows} />
        </Stack>
      </Stack>
      <DemoFieldDialog open={dialog === "share"} onOpenChange={(open) => setDialog(open ? "share" : null)} title="Share Loyalty app"
        description="They can view the project and comment on tasks." field={{ kind: "email", label: "Email", placeholder: "name@phinco.vn" }}
        submitLabel="Send invite" confirm={(email) => `Invite sent to ${email}`} />
      <DemoFieldDialog open={dialog === "task"} onOpenChange={(open) => setDialog(open ? "task" : null)} title="New task"
        field={{ kind: "name", label: "Task name", placeholder: "Design the rewards screen" }} submitLabel="Create task"
        confirm={() => "Task created"} onSubmit={addTask} />
    </Box>
  );
}

/* ───────────── Send an invoice ───────────── */

const saolaInvoice = invoices.find((invoice) => invoice.status === "Draft")!;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const wait = (ms: number) => new Promise<void>((resolve) => { window.setTimeout(resolve, ms); });

function SendInvoiceExample() {
  const { toast } = useToast();
  const [status, setStatus] = useState<InvoiceStatus>(saolaInvoice.status);
  const [sentTo, setSentTo] = useState("");
  const recordPayment = () => {
    setStatus("Paid");
    toast({ type: "positive", title: "Payment recorded", action: { label: "Undo", onClick: () => setStatus("Sent") } });
  };
  // The Primary submits the current step. Send invoice shows its own progress while the request runs (isSubmitting)
  // and Download PDF waits; once sent, Record payment takes the Primary slot.
  const form = useFormState({
    initialValues: { email: "finance@saolaoutdoor.vn" },
    validate: ({ email }) => ({ email: emailPattern.test(email.trim()) ? undefined : "Enter an email address, like finance@saolaoutdoor.vn" }),
    onSubmit: async ({ email }) => {
      if (status === "Sent") return recordPayment();
      await wait(1600);
      setSentTo(email.trim());
      setStatus("Sent");
      toast({ type: "positive", title: "Invoice sent", action: { label: "Undo", onClick: () => setStatus("Draft") } });
    },
  });
  const downloadPdf = () => toast({ title: "PDF downloaded" });
  return (
    <Card theme="flat" className="px-button-card" spacing="md">
      <Stack gap="md">
        <Stack direction="row" justify="between" align="start" gap="sm">
          <Stack gap="xs">
            <Heading level={4} textStyle="Heading/Subheading">{saolaInvoice.number}</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">Saola Outdoor · Brand refresh</Text>
          </Stack>
          <Badge className="px-button-status" theme={invoiceStatusTheme[status]} background="subtle">{status}</Badge>
        </Stack>
        <DescriptionList items={[
          { term: "Issued", description: formatDate(saolaInvoice.issued) },
          { term: "Due", description: formatDate(saolaInvoice.due) },
          ...(status === "Draft" ? [] : [{ term: "Sent to", description: sentTo }]),
          { term: "Amount", description: formatMoney(saolaInvoice.amount, true), emphasis: true },
        ]} />
        <Form form={form} gap="md">
          {status === "Draft" ? <InputField label="Send to" type="email" autoComplete="off" {...form.field("email")} /> : null}
          <FormActions>
            <Button level="tertiary" disabled={form.isSubmitting} onClick={downloadPdf}>Download PDF</Button>
            {status === "Paid" ? null : (
              <Button level="primary" type="submit" disabled={form.isSubmitting}>
                {status === "Sent" ? "Record payment" : form.isSubmitting ? "Sending…" : "Send invoice"}
              </Button>
            )}
          </FormActions>
        </Form>
      </Stack>
    </Card>
  );
}

/* ───────────── Delete a file ───────────── */

// Short names, so a row never has to cut one off.
const loyaltyFiles: StudioFile[] = [
  { ...files[0], name: "Points history.fig" },
  { ...files[2], name: "Rewards API.json" },
  { id: "f7", name: "Launch plan.pdf", bytes: 320_000, owner: "duy", project: "phin-loyalty", updated: daysFromToday(-3, 15, 10) },
];

function DeleteFileExample() {
  const { toast } = useToast();
  const [list, setList] = useState(loyaltyFiles);
  // The dialog keeps its last file while it animates out, so the title never goes blank.
  const [target, setTarget] = useState<StudioFile>(loyaltyFiles[0]);
  const [open, setOpen] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);
  const confirmDelete = (file: StudioFile) => { setTarget(file); setOpen(true); };
  const deleteFile = () => {
    setList((current) => current.filter((file) => file.id !== target.id));
    setOpen(false);
    toast({ title: "File deleted" });
    // The row that opened the dialog is gone: focus the next action (a trash button, or Upload files) instead of <body>.
    window.setTimeout(() => areaRef.current?.querySelector<HTMLElement>("button")?.focus(), 300);
  };
  const upload = () => {
    setList(loyaltyFiles);
    toast({ type: "positive", title: `${plural(loyaltyFiles.length, "file")} uploaded` });
  };
  return (
    <Box ref={areaRef}>
      {/* A static surface on the stage: the ListBox's Body-Slot insets the rows (they pad 0). */}
      {list.length ? (
        <ListBox>
          <List aria-label="Files in Loyalty app">
            {list.map((file) => (
              <ListItem key={file.id} title={file.name}
                caption={`${formatBytes(file.bytes)} · ${people[file.owner as PersonId].name} · ${formatRelative(file.updated)}`}
                leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
                trailing={<IconButton appearance="flat" icon="icon-trash-line" aria-label={`Delete ${file.name}`} onClick={() => confirmDelete(file)} />}
                selected={false} />
            ))}
          </List>
        </ListBox>
      ) : (
        <Card theme="flat">
          <EmptyState illustration={false} headingLevel={4} title="No files yet" primaryAction={{ label: "Upload files", onClick: upload }}>
            Files you add to Loyalty app show up here.
          </EmptyState>
        </Card>
      )}
      <Dialog open={open} onOpenChange={setOpen} theme="negative" title={`Delete “${target.name}”?`}
        description="Everyone on Loyalty app loses access to it. You can't undo this."
        primaryAction={{ label: "Delete file", level: "danger", onClick: deleteFile }}
        secondaryAction={{ label: "Cancel", autoFocus: true }} />
    </Box>
  );
}

/* ───────────── Hand off when ready ───────────── */

const handoffChecks = [
  { id: "qa", label: "Design QA passed", caption: "Em Pham signed off yesterday" },
  { id: "specs", label: "Specs exported", caption: "Points history.fig" },
  { id: "contact", label: "Client reviewer confirmed", caption: "Lan Vu, product owner at Phin & Co" },
];

function HandOffExample() {
  const { toast } = useToast();
  const [done, setDone] = useState<string[]>(["qa", "specs"]);
  const [handedOff, setHandedOff] = useState(false);
  const helpId = useId();
  const messageRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const left = handoffChecks.length - done.length;
  const toggle = (id: string, checked: boolean) => setDone((list) => checked ? [...list, id] : list.filter((item) => item !== id));
  // Focus follows the swap, so it never drops to <body>: the message after the hand-off, the button after Undo.
  useEffect(() => { (handedOff ? messageRef.current : buttonRef.current)?.focus(); }, [handedOff]);
  const handOff = () => { setHandedOff(true); toast({ type: "positive", title: "Designs handed off" }); };
  return (
    <Card theme="flat" className="px-button-card">
      <Stack gap="md" alignSelf="stretch">
        <Stack gap="3xs">
          <Heading level={4} textStyle="Heading/Subheading">Sprint 14 hand-off</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Loyalty app · Phin & Co</Text>
        </Stack>
        {handedOff ? (
          <Box ref={messageRef} tabIndex={-1}>
            <InlineMessage theme="positive" title="Handed off to Phin & Co" action={{ label: "Undo", onClick: () => setHandedOff(false) }}>
              Lan Vu can now review the screens and specs.
            </InlineMessage>
          </Box>
        ) : (
          <>
            <Stack gap="sm" role="group" aria-label="Hand-off checklist">
              {handoffChecks.map((check) => (
                <Checkbox key={check.id} label={check.label} caption={check.caption} checked={done.includes(check.id)} onCheckedChange={(checked) => toggle(check.id, checked)} />
              ))}
            </Stack>
            <Stack direction="row" justify="between" align="center" gap="sm">
              <Text id={helpId} textStyle="Body/Small/Regular" tone="base">
                {left ? `Check ${plural(left, "more item")} to hand off.` : "Ready to hand off."}
              </Text>
              <Button ref={buttonRef} level="primary" disabled={left > 0} aria-describedby={helpId} onClick={handOff}>Hand off</Button>
            </Stack>
          </>
        )}
      </Stack>
    </Card>
  );
}

/* ───────────── Photo viewer ───────────── */

const moodboard = [
  { ...platformMedia.feed[3], name: "Mountain road.jpg" },
  { ...platformMedia.feed[1], name: "Forest creek.jpg" },
  { ...platformMedia.feed[4], name: "Snow peaks.jpg" },
  { ...platformMedia.feed[0], name: "Sunset field.jpg" },
];

function PhotoViewerExample() {
  const { toast } = useToast();
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const photo = moodboard[index];
  const show = (next: number) => { setIndex(next); setZoom(100); };
  return (
    <Stack gap="xs">
      {/* The frame clips the zoomed photo to its radius; the buttons are absolute layers pinned to its edges. */}
      <Box radius="lg" clip>
        <Box className="px-button-viewer__photo" style={{ "--px-button-zoom": zoom / 100 } as CSSProperties}>
          <Image src={photo.src} alt={photo.alt} ratio="4:3" radius="none" />
        </Box>
        {/* Overlay buttons sit on the photo: icon-only, named, with the name as a tooltip after 1s. */}
        <Box position="absolute" constraintX="right" constraintY="top" insetRight="sm" insetTop="sm">
          <IconButton appearance="overlay" level="black-overlay" icon="icon-download-01-line" aria-label="Download photo" onClick={() => toast({ title: "Photo downloaded" })} />
        </Box>
        <Box position="absolute" constraintX="left" constraintY="center" insetLeft="sm">
          <IconButton appearance="overlay" level="black-overlay" icon="icon-chevron-left-line-medium" aria-label="Previous photo" disabled={index === 0} onClick={() => show(index - 1)} />
        </Box>
        <Box position="absolute" constraintX="right" constraintY="center" insetRight="sm">
          <IconButton appearance="overlay" level="black-overlay" icon="icon-chevron-right-line-medium" aria-label="Next photo" disabled={index === moodboard.length - 1} onClick={() => show(index + 1)} />
        </Box>
        <Stack direction="row" gap="xs" position="absolute" constraintX="center" constraintY="bottom" insetBottom="sm" role="group" aria-label="Zoom">
          <IconButton appearance="overlay" level="black-overlay" icon="icon-zoom-out-line" aria-label="Zoom out" disabled={zoom <= 100} onClick={() => setZoom(zoom - 50)} />
          <IconButton appearance="overlay" level="black-overlay" icon="icon-zoom-in-line" aria-label="Zoom in" disabled={zoom >= 200} onClick={() => setZoom(zoom + 50)} />
        </Stack>
      </Box>
      <Text role="status" textStyle="Body/Small/Regular" tone="base">{`${photo.name} · ${index + 1} of ${moodboard.length} · ${zoom}%`}</Text>
    </Stack>
  );
}

/* ───────────── Approve on a phone ───────────── */

// The Design team's leave, as Alex (their approver) sees it. The current requests are the studio's shared ones (the same
// on every page); the rest is this year's history, newest dates first.
const reportsToAlex = (id: PersonId) => id !== "alex" && people[id].team === "Design";
const pastLeave = (id: string, person: PersonId, kind: LeaveRequest["kind"], from: number, to: number, days: number, note: string, status: LeaveRequest["status"] = "Approved"): LeaveRequest =>
  ({ id, person, kind, from: daysFromToday(from, 0, 0), to: daysFromToday(to, 0, 0), days, status, note, requested: daysFromToday(from - 21, 9, 30) });
const approvals: LeaveRequest[] = [
  ...leaveRequests.filter((request) => reportsToAlex(request.person)).sort((a, b) => b.from.getTime() - a.from.getTime()),
  pastLeave("h1", "ava", "Annual leave", -9, -5, 5, "Mid-Autumn week in Taipei"),
  pastLeave("h2", "chi", "Annual leave", -16, -16, 1, "A day off after the Phin & Co sprint review", "Declined"),
  pastLeave("h3", "emi", "Annual leave", -37, -33, 5, "Summer holiday in Hokkaido"),
  pastLeave("h4", "gia", "Annual leave", -44, -44, 1, "Long weekend in Vũng Tàu"),
  pastLeave("h5", "ava", "Sick leave", -51, -49, 3, "Fever, with a doctor's note attached"),
  pastLeave("h6", "chi", "Annual leave", -65, -61, 5, "Summer trip to Phú Quốc"),
  pastLeave("h7", "emi", "Annual leave", -72, -72, 1, "Visa renewal appointment"),
  pastLeave("h8", "gia", "Annual leave", -86, -84, 3, "Hội An with friends"),
  pastLeave("h9", "ava", "Annual leave", -100, -96, 5, "Visiting my parents in Penang"),
  pastLeave("h10", "chi", "Sick leave", -107, -107, 1, "Doctor's appointment"),
  pastLeave("h11", "emi", "Annual leave", -121, -119, 3, "Moving house"),
  pastLeave("h12", "gia", "Annual leave", -135, -135, 1, "Family day in Cần Thơ"),
];
/** Annual leave days each person has left this year, before the request on screen. */
const annualLeft: Partial<Record<PersonId, number>> = { chi: 9, emi: 12, gia: 10, ava: 11 };
const leaveDates = (request: LeaveRequest) => request.days === 1 ? formatDate(request.from) : formatRange(request.from, request.to);
// Rows drop the year, as every request is this year; the detail shows the full dates.
const leaveDays = (request: LeaveRequest) => request.days === 1 ? formatDay(request.from) : `${formatDay(request.from)} – ${formatDay(request.to)}`;
const backButton = '.zen-top-nav__action[aria-label="Back"]';

function PhoneApproveExample() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  // One scroller per screen: the large title folds as the list runs under the bar.
  const screenRef = useRef<HTMLDivElement>(null);
  const noteId = useId();
  const [requests, setRequests] = useState(approvals);
  const [openId, setOpenId] = useState<string | null>("l2");
  const request = requests.find((item) => item.id === openId);
  // A decision removes the footer, so focus moves to Back instead of dropping to <body>.
  const decide = (id: string, status: LeaveRequest["status"]) => screen.go(backButton, () => setRequests((list) => list.map((item) => item.id === id ? { ...item, status } : item)));
  const approve = (item: LeaveRequest) => {
    decide(item.id, "Approved");
    toast({ type: "positive", title: "Leave approved", action: { label: "Undo", onClick: () => decide(item.id, "Pending") } });
  };
  const decline = (item: LeaveRequest) => {
    decide(item.id, "Declined");
    toast({ title: "Leave declined", action: { label: "Undo", onClick: () => decide(item.id, "Pending") } });
  };

  if (!request) {
    return (
      <PlatformPhone key="root" label="Time off" headerOverlay screenRef={screenRef}
        header={<TopNavigation title="Time off" largeTitle="Time off" scrollRef={screenRef} />}>
        {screen.anchor}
        {/* Rows pad 0 at the sides: the screen margin (lg) insets them, and sm above and below keeps the first and last fills clear. */}
        <Box paddingX="lg" paddingY="xs">
          <List aria-label="Leave requests">
            {requests.map((item) => (
              <ListItem key={item.id} data-request={item.id} title={people[item.person].name} caption={`${leaveDays(item)} · ${plural(item.days, "day")}`}
                leading={<Avatar size="md" {...avatarOf(people[item.person])} />}
                trailing={<Badge theme={leaveStatusTheme[item.status]} background="subtle">{item.status}</Badge>}
                onClick={() => screen.go(backButton, () => setOpenId(item.id))} />
            ))}
          </List>
        </Box>
      </PlatformPhone>
    );
  }
  const person = people[request.person];
  const left = annualLeft[request.person];
  return (
    <PlatformPhone key={request.id} label="Leave request" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact" title="Leave request" scrollRef={screenRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go(`[data-request="${request.id}"] .zen-list-item__wrapper`, () => setOpenId(null)) }} />}
      // Two peer answers: Decline and Approve side by side, Primary at the end. Decided requests have no footer.
      footer={request.status === "Pending" ? (
        <ActionBar position="static" direction="horizontal"
          secondaryAction={{ label: "Decline leave", onClick: () => decline(request) }}
          primaryAction={{ label: "Approve leave", onClick: () => approve(request) }} />
      ) : undefined}>
      {screen.anchor}
      <Stack gap="lg" paddingY="xs">
        <List aria-label="Requested by">
          {/* zen-detached: ListItem · Zen Studio */}
          <Stack as="li" direction="column" align="center" gap="md" paddingX="lg" paddingY="sm" justify="center">
            <Avatar size="2xl" {...avatarOf(person)} />
            <Stack gap="2xs" style={{ flex: 1 }}>
              <Text as="span" textStyle="Heading/2" truncate align="center">{person.name}</Text>
              <Text as="span" textStyle="Body/Small/Regular" tone="light">{`${person.role} · ${person.location}`}</Text>
            </Stack>
            <Stack direction="row" align="center" gap="sm">
              <Badge theme={leaveStatusTheme[request.status]} background="subtle">{request.status}</Badge>
            </Stack>
          </Stack>
        </List>
        <Box paddingX="lg">
          <DescriptionList divider items={[
            { term: "Type", description: request.kind },
            { term: "Dates", description: leaveDates(request) },
            { term: "Length", description: plural(request.days, "day") },
            // While it waits, the approver sees what annual leave would be left; other kinds don't use the balance.
            ...(request.status === "Pending" && request.kind === "Annual leave" && left !== undefined
              ? [{ term: "Balance after", description: plural(left - request.days, "day") }] : []),
            { term: "Requested", description: formatRelative(request.requested) },
          ]} />
        </Box>
        {request.note ? (
          <Stack as="section" gap="xs" paddingX="lg" aria-labelledby={noteId}>
            <Heading level={2} id={noteId} textStyle="Body/Small/Bold" tone="light">Note</Heading>
            <Text>{request.note}</Text>
          </Stack>
        ) : null}
      </Stack>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "Page actions",
    description: "A project page has one Primary, New task, on the right. Share is Tertiary and rarer actions wait in the More actions menu, so the main action stands out.",
    wide: true,
    screen: true,
    render: () => <PageActionsExample />,
    code: `<PageHeader
  eyebrow="Phin & Co"
  title="Loyalty app"
  meta={<Badge theme="blue" background="subtle">Active</Badge>}
  actions={<>
    <Button level="tertiary" startIcon="icon-share-01-line" onClick={() => setDialog("share")}>Share</Button>
    <Menu align="end" trigger={<IconButton icon="icon-dots-horizontal-line" aria-label="More actions" />} items={[
      { id: "duplicate", label: "Duplicate project", onSelect: duplicate },
      { id: "hold", label: "Put on hold", onSelect: putOnHold },
    ]} />
    <Button level="primary" startIcon="icon-plus-line" onClick={() => setDialog("task")}>New task</Button>
  </>}
/>`,
  },
  {
    title: "Send an invoice",
    description: "Send invoice is the form's submit: it shows its progress on the button while Download PDF waits, and a wrong address puts the focus back on the field. Then the status turns Sent and the next step, Record payment, takes the Primary slot.",
    render: () => <SendInvoiceExample />,
    code: `const form = useFormState({
  initialValues: { email: "finance@saolaoutdoor.vn" },
  validate: ({ email }) => ({ email: emailPattern.test(email) ? undefined : "Enter an email address, like finance@saolaoutdoor.vn" }),
  onSubmit: async ({ email }) => (status === "Sent" ? recordPayment() : sendInvoice(email)), // isSubmitting while it runs
});

<Form form={form} gap="md">
  {status === "Draft" ? <InputField label="Send to" type="email" {...form.field("email")} /> : null}
  <FormActions> {/* Tertiary then Primary on the right; stacked full width under 480px */}
    <Button level="tertiary" disabled={form.isSubmitting} onClick={downloadPdf}>Download PDF</Button>
    {status === "Paid" ? null : (
      <Button level="primary" type="submit" disabled={form.isSubmitting}>
        {status === "Sent" ? "Record payment" : form.isSubmitting ? "Sending…" : "Send invoice"}
      </Button>
    )}
  </FormActions>
</Form>`,
  },
  {
    title: "Delete a file",
    description: "Deleting a file can't be undone, so the row's trash button asks first. The negative Dialog repeats the verb in its Danger button and gives Cancel the focus.",
    render: () => <DeleteFileExample />,
    code: `<ListItem title={file.name} caption={meta} leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
  trailing={<IconButton appearance="flat" icon="icon-trash-line"
    aria-label={\`Delete \${file.name}\`} onClick={() => confirmDelete(file)} />} />

<Dialog open={open} onOpenChange={setOpen} theme="negative" title={\`Delete “\${target.name}”?\`}
  description="Everyone on Loyalty app loses access to it. You can't undo this."
  primaryAction={{ label: "Delete file", level: "danger", onClick: deleteFile }}
  secondaryAction={{ label: "Cancel", autoFocus: true }} />`,
  },
  {
    title: "Hand off when ready",
    description: "Hand off stays disabled until every check is done, and the line beside it says what is missing. Undo brings the checklist back.",
    render: () => <HandOffExample />,
    code: `const left = checks.length - done.length;

{checks.map((check) => (
  <Checkbox key={check.id} label={check.label} caption={check.caption}
    checked={done.includes(check.id)} onCheckedChange={(checked) => toggle(check.id, checked)} />
))}
<Text id={helpId} textStyle="Body/Small/Regular" tone="base">
  {left ? \`Check \${plural(left, "more item")} to hand off.\` : "Ready to hand off."}
</Text>
<Button level="primary" disabled={left > 0} aria-describedby={helpId} onClick={handOff}>Hand off</Button>`,
  },
  {
    title: "Controls on a photo",
    description: "Over a photo, the actions are Overlay icon buttons, readable on any picture. Each has a name that shows as a tooltip, and Previous, Next and the zoom buttons disable at their limits.",
    render: () => <PhotoViewerExample />,
    code: `<Box radius="lg" clip>
  <Image src={photo.src} alt={photo.alt} ratio="4:3" radius="none" />
  {/* Layers pinned to the photo's edges, Padding/Small in */}
  <Box position="absolute" constraintX="right" constraintY="top" insetRight="sm" insetTop="sm">
    <IconButton appearance="overlay" level="black-overlay" icon="icon-download-01-line"
      aria-label="Download photo" onClick={download} />
  </Box>
  <Box position="absolute" constraintX="left" constraintY="center" insetLeft="sm">
    <IconButton appearance="overlay" level="black-overlay" icon="icon-chevron-left-line-medium"
      aria-label="Previous photo" disabled={index === 0} onClick={() => show(index - 1)} />
  </Box>
  {/* Next: constraintX="right" insetRight="sm" */}
  <Stack direction="row" gap="xs" position="absolute" constraintX="center" constraintY="bottom" insetBottom="sm" role="group" aria-label="Zoom">
    <IconButton appearance="overlay" level="black-overlay" icon="icon-zoom-in-line"
      aria-label="Zoom in" disabled={zoom >= 200} onClick={() => setZoom(zoom + 50)} />
  </Stack>
</Box>
<Text role="status">{\`\${photo.name} · \${index + 1} of \${photos.length} · \${zoom}%\`}</Text>`,
  },
  {
    title: "Approve on a phone",
    description: "On a phone the decision sits in an ActionBar footer: Decline leave and Approve leave are two Large buttons side by side, Primary at the end. Once decided, the footer leaves, focus returns to Back and a Toast offers Undo.",
    render: () => <PhoneApproveExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

// One key per screen; the Top Navigation follows the scroll of the phone screen.
<PlatformPhone key={request.id} headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact" title="Leave request" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToRequests }} />}
  footer={request.status === "Pending" ? (
    <ActionBar position="static" direction="horizontal"
      secondaryAction={{ label: "Decline leave", onClick: () => decline(request) }}
      primaryAction={{ label: "Approve leave", onClick: () => approve(request) }} />
  ) : undefined}>
  …
</PlatformPhone>`,
  },
];
