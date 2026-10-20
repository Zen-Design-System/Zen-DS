import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { useZen } from "../../../components/Provider";
import { ActionBar } from "../../../components/ActionBar";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader } from "../../../components/AppShell";
import { Avatar } from "../../../components/Avatar";
import { Badge, BadgeCounter } from "../../../components/Badge";
import { BottomNavigation, type BottomNavigationItem } from "../../../components/BottomNavigation";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
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
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { MetricCard } from "../../../components/MetricWidget";
import { PageHeader } from "../../../components/PageHeader";
import { Sidebar, SidebarMenuItem, type SidebarSection } from "../../../components/Sidebar";
import { Table, TableMedia, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { platformMedia } from "../../PlatformMedia";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import {
  activity, daysFromToday, files, formatBytes, formatDate, formatDay, formatMoney, formatRange, formatRelative, initials, invoiceStatusTheme, invoices, leaveBalance, leaveRequests, leaveStatusTheme,
  me, people, projectById, projectStatusTheme, studio, tasks, taskStatusTheme, type InvoiceStatus, type LeaveRequest, type Person, type PersonId, type ProjectStatus, type StudioFile, type TaskStatus,
} from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { PreviewAppFrame, StudioLogo, StudioMark } from "../../PlatformFrames";
import { keepOnHotUpdate } from "../../hotData";
import "./button.css";

export const page: PlatformPage = "button";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };

/* ───────────── The studio app's chrome (the desktop screen) ───────────── */
// "Page actions" is a page of the Đìzai Studio app: one AppShell (pattern sidebar) with the studio's Sidebar, the
// header's top row (the trail, notifications, the account) and the project's PageHeader in its Main row, where the page's
// actions live. The Body pads the page, so the content starts at the page margin without a Container.
const studioPlaces: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "projects", label: "Projects", icon: "icon-folder-line" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line" },
  { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
  { id: "people", label: "People", icon: "icon-users-line" },
] }];
const unread = activity.filter((item) => item.unread);

/** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
function useNotHere() {
  const { toast } = useToast();
  return (label: string) => toast({ title: `${label} isn't part of this example`, children: "This screen shows where each action sits." });
}

/** The top row's utilities: notifications (the count clears once read) and the account menu, last. */
function StudioActions() {
  const { toast } = useToast();
  const [count, setCount] = useState(unread.length);
  const latest = unread[0];
  return (
    <>
      <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={count} onClick={() => {
        setCount(0);
        toast({ title: count ? plural(count, "new notification") : "You're all caught up", children: `${people[latest.actor].name} ${latest.verb} ${latest.object} · ${formatRelative(latest.at)}` });
      }} />
      <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
        { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.location}` }) },
        { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => toast({ title: "Settings", children: "Workspace, notifications and billing." }) },
        { type: "separator" },
        { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
      ]} />
    </>
  );
}

/* ───────────── Page actions ───────────── */

const loyalty = projectById("phin-loyalty");
type TaskRow = { id: string; key: string; title: string; assignee: PersonId; status: TaskStatus; due: Date };
const loyaltyTasks: TaskRow[] = [
  ...tasks.filter((task) => task.project === "phin-loyalty").map(({ id, key, title, assignee, status, due }) => ({ id, key, title, assignee, status, due })),
  { id: "p1", key: "PHIN-226", title: "Write the rewards FAQ", assignee: "linh", status: "To do", due: daysFromToday(9) },
  { id: "p2", key: "PHIN-208", title: "Draw the loyalty tier badges", assignee: "gia", status: "Done", due: daysFromToday(-4) },
];

// On a phone the assignee joins the task's caption, so no fixed-width column is cut (backlog batch 6b).
const phoneTaskColumns: TableColumn<TaskRow>[] = [
  { id: "task", header: "Task", cell: (row) => <TableText bold caption={`${row.key} · ${people[row.assignee].name}`}>{row.title}</TableText> },
  { id: "status", header: "Status", cell: (row) => <Badge theme={taskStatusTheme[row.status]} background="subtle">{row.status}</Badge> },
];
const taskColumns: TableColumn<TaskRow>[] = [
  { id: "task", header: "Task", cell: (row) => <TableText bold caption={row.key}>{row.title}</TableText> },
  { id: "assignee", header: "Assignee", width: "200px", cell: (row) => <TableMedia bold={false} media={<Avatar size="xs" {...avatarOf(people[row.assignee])} />}>{people[row.assignee].name}</TableMedia> },
  { id: "status", header: "Status", width: "140px", cell: (row) => <Badge theme={taskStatusTheme[row.status]} background="subtle">{row.status}</Badge> },
  { id: "due", header: "Due", width: "140px", cell: (row) => <TableText>{formatDate(row.due)}</TableText> },
];

function PageActionsExample() {
  const { toast } = useToast();
  const notHere = useNotHere();
  const [rows, setRows] = useState(loyaltyTasks);
  const [status, setStatus] = useState<ProjectStatus>(loyalty.status);
  const [dialog, setDialog] = useState<"share" | "task" | null>(null);
  const tasksId = useId();
  const phone = useZen()?.breakpoint === "mobile";
  const open = rows.filter((row) => row.status !== "Done").length;
  // New task adds a row at the top; its key continues the project's sequence.
  const addTask = (title: string) => setRows((list) => [{ id: `new-${list.length}`, key: `PHIN-${224 + list.length}`, title, assignee: "alex", status: "To do", due: daysFromToday(7) }, ...list]);
  const putOnHold = () => {
    setStatus("On hold");
    toast({ title: "Project put on hold", children: "The team stops getting reminders for its tasks.", action: { label: "Undo", onClick: () => setStatus("Active") } });
  };
  return (
    <PreviewAppFrame>
      <AppShell
        sidebar={(
          <Sidebar logo={<StudioLogo src={studio.logo} name={studio.name} />} logoCollapsed={<StudioMark src={studio.logo} name={studio.name} />}
            sections={studioPlaces} selectedId="projects" onItemClick={(item) => { if (item.id !== "projects") notHere(item.label); }}
            footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
        )}
        header={(
          <AppShellHeader
            // A Sub-level trail beside the collapse toggle; the top row keeps utilities only, the page's actions sit in its Main row.
            leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: loyalty.id, label: loyalty.name }]}
              onNavigate={(_, event) => { event.preventDefault(); notHere("Projects"); }} />}
            actions={<StudioActions />}
            main={(
              <PageHeader
                eyebrow={loyalty.client}
                title={loyalty.name}
                meta={<Badge theme={projectStatusTheme[status]} background="subtle">{status}</Badge>}
                description={`Points, rewards and checkout for the Phin & Co coffee app. Launch is due ${formatDate(loyalty.due)}.`}
                actions={<>
                  <Button level="tertiary" startIcon="icon-share-01-line" onClick={() => setDialog("share")}>Share</Button>
                  <Menu align="end" trigger={<IconButton icon="icon-dots-horizontal-line" aria-label="More actions" />} items={[
                    { id: "duplicate", label: "Duplicate project", icon: "icon-copy-line", onSelect: () => toast({ title: "Project duplicated", children: `${loyalty.name} (copy) is in Projects, without its tasks' history.` }) },
                    { id: "hold", label: "Put on hold", icon: "icon-pause-circle-line", disabled: status === "On hold", onSelect: putOnHold },
                  ]} />
                  <Button level="primary" startIcon="icon-plus-line" onClick={() => setDialog("task")}>New task</Button>
                </>}
              />
            )}
          />
        )}
      >
        {/* Sections of the page, xl apart: the project in three numbers (Shadow, the Sidebar's elevation), then its
            tasks. The task table is the section's content: it lies on the page under its h2, no Card. */}
        <Stack gap="xl">
          <Grid columns={3} gap="md" stackBelow={640}>
            <MetricCard theme="shadow" label="Progress" value={`${loyalty.progress}%`} icon="icon-check-done-line" trend={{ direction: "positive", label: "+6% this week" }} />
            <MetricCard theme="shadow" label="Budget spent" value={formatMoney(loyalty.spent)} icon="icon-wallet-02-line" trend={{ direction: "normal", label: `of ${formatMoney(loyalty.budget)}` }} />
            <MetricCard theme="shadow" label="Open tasks" value={String(open)} icon="icon-check-square-line" trend={{ direction: "normal", label: `${rows.length - open} done` }} />
          </Grid>
          <Stack as="section" gap="md" aria-labelledby={tasksId}>
            <Heading level={2} id={tasksId} textStyle="Heading/4">Tasks</Heading>
            <Table aria-labelledby={tasksId} columns={phone ? phoneTaskColumns : taskColumns} rows={rows} />
          </Stack>
        </Stack>
      </AppShell>
      <DemoFieldDialog open={dialog === "share"} onOpenChange={(next) => setDialog(next ? "share" : null)} title={`Share ${loyalty.name}`}
        description="They can view the project and comment on tasks." field={{ kind: "email", label: "Email", placeholder: "name@phinco.vn" }}
        submitLabel="Send invite" confirm={(email) => `Invite sent to ${email}`} />
      <DemoFieldDialog open={dialog === "task"} onOpenChange={(next) => setDialog(next ? "task" : null)} title="New task"
        field={{ kind: "name", label: "Task name", placeholder: "Design the rewards screen" }} submitLabel="Create task"
        confirm={() => "Task created"} onSubmit={addTask} />
    </PreviewAppFrame>
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
    <Stack><Card theme="flat" width="fill" maxWidth={440} alignSelf="center" spacing="md">
      <Stack gap="md">
        <Stack direction="row" justify="between" align="start" gap="sm">
          <Stack gap="xs">
            <Heading level={4} textStyle="Heading/Subheading">{saolaInvoice.number}</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">Saola Outdoor · Brand refresh</Text>
          </Stack>
          <Badge theme={invoiceStatusTheme[status]} background="subtle">{status}</Badge>
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
    </Card></Stack>
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
                trailing={<IconButton appearance="flat" icon="icon-trash-line" aria-label={`Delete ${file.name}`} onClick={() => confirmDelete(file)} />} />
            ))}
          </List>
        </ListBox>
      ) : (
        <Card theme="flat">
          <EmptyState size="sm" headingLevel={4} icon="icon-folder-line" title="No files yet" primaryAction={{ label: "Upload files", onClick: upload }}>
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
    <Stack><Card theme="flat" width="fill" maxWidth={440} alignSelf="center">
      <Stack gap="md" alignSelf="stretch">
        <Stack gap="2xs">
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
    </Card></Stack>
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
/** The studio app's roots on a phone; Time off is this screen. */
const studioRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "time-off", label: "Time off", icon: "icon-calendar-line", selectedIcon: "icon-calendar-solid" },
  { id: "profile", label: "Profile", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
/** Who else on the Design team is off (approved or waiting) on any day of this request. */
const alsoOff = (request: LeaveRequest, all: LeaveRequest[]) => all.filter((other) => other.id !== request.id && other.person !== request.person
  && (other.status === "Approved" || other.status === "Pending") && people[other.person].team === "Design"
  && other.from.getTime() <= request.to.getTime() && other.to.getTime() >= request.from.getTime());

function PhoneApproveExample() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  // One scroller per screen: the large title folds as the list runs under the bar.
  const screenRef = useRef<HTMLDivElement>(null);
  const waitingId = useId();
  const decidedId = useId();
  const noteId = useId();
  const overlapId = useId();
  const [requests, setRequests] = useState(approvals);
  const [openId, setOpenId] = useState<string | null>("l2");
  const [root, setRoot] = useState("time-off");
  const request = requests.find((item) => item.id === openId);
  // A decision removes the Action bar, so focus moves to Back instead of dropping to <body>.
  const decide = (id: string, status: LeaveRequest["status"]) => screen.go(backButton, () => setRequests((list) => list.map((item) => item.id === id ? { ...item, status } : item)));
  const approve = (item: LeaveRequest) => {
    decide(item.id, "Approved");
    toast({ type: "positive", title: "Leave approved", children: `${people[item.person].name} gets an email now.`, action: { label: "Undo", onClick: () => decide(item.id, "Pending") } });
  };
  const decline = (item: LeaveRequest) => {
    decide(item.id, "Declined");
    toast({ title: "Leave declined", children: `${people[item.person].name.split(" ")[0]} can ask again with other dates.`, action: { label: "Undo", onClick: () => decide(item.id, "Pending") } });
  };
  // A trailing Badge would squeeze a phone row's caption, so a decided request's status leads its caption; each value
  // keeps its words together, so the caption wraps between values.
  const row = (item: LeaveRequest, decided: boolean) => (
    <ListItem key={item.id} data-request={item.id} title={people[item.person].name}
      caption={[decided && item.status, leaveDays(item), plural(item.days, "day")].filter(Boolean).map((value) => String(value).replace(/ /g, "\u00a0")).join(" · ")}
      leading={<Avatar size="md" {...avatarOf(people[item.person])} />}
      onClick={() => screen.go(backButton, () => setOpenId(item.id))} />
  );

  if (!request) {
    const waiting = requests.filter((item) => item.status === "Pending");
    const decided = requests.filter((item) => item.status !== "Pending");
    return (
      // A tab root: the large title folds as the groups scroll under the bar, and the bottom bar holds the app's roots. It
      // casts a shadow, so both groups take the Shadow ListBox on the grey Canvas; the kickers line up with the row text.
      <PlatformPhone key="root" label="Time off" canvas="default" screenRef={screenRef}>
        <AppShell
          topNavigation={<TopNavigation title="Time off" largeTitle="Time off" scrollRef={screenRef}
            trailing={[{ icon: "icon-calendar-plus-line", label: "Request leave", onClick: () => toast({ title: "Request leave", children: `You have ${leaveBalance["Annual leave"]?.left ?? 0} days of annual leave left.` }) }]} />}
          bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={studioRoots} value={root} onValueChange={setRoot} />}
        >
          {screen.anchor}
          <Stack as="section" gap="xs" aria-labelledby={waitingId}>
            <Stack direction="row" gap="xs" align="center" paddingX="lg">
              <Heading level={2} id={waitingId} textStyle="Body/Small/Bold" tone="light">Waiting for you</Heading>
              {waiting.length ? <BadgeCounter size="sm" theme="neutral" background="subtle" value={waiting.length} /> : null}
            </Stack>
            <ListBox theme="shadow">
              {waiting.length ? <List aria-labelledby={waitingId}>{waiting.map((item) => row(item, false))}</List> : (
                <EmptyState size="sm" headingLevel={3} title="You're all caught up">New requests from the Design team show here.</EmptyState>
              )}
            </ListBox>
          </Stack>
          <Stack as="section" gap="xs" aria-labelledby={decidedId}>
            <Box paddingX="lg"><Heading level={2} id={decidedId} textStyle="Body/Small/Bold" tone="light">Decided this year</Heading></Box>
            <ListBox theme="shadow">
              <List aria-labelledby={decidedId}>{decided.map((item) => row(item, true))}</List>
            </ListBox>
          </Stack>
        </AppShell>
      </PlatformPhone>
    );
  }
  const person = people[request.person];
  const left = annualLeft[request.person];
  const overlap = alsoOff(request, requests);
  return (
    // A pushed screen: the compact bar with Back, the request in flat blocks on the grey Canvas, and the two peer
    // answers in the Action bar (Figma Bottom=Actions), Primary at the end. Decided requests have no Action bar.
    <PlatformPhone key={request.id} label="Leave request" canvas="default" screenRef={screenRef}>
      <AppShell
        topNavigation={<TopNavigation type="compact-alt" title="Leave request" scrollRef={screenRef}
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go(`[data-request="${request.id}"] .zen-list-item__wrapper`, () => setOpenId(null)) }} />}
        actionBar={request.status === "Pending" ? (
          <ActionBar direction="horizontal"
            secondaryAction={{ label: "Decline leave", onClick: () => decline(request) }}
            primaryAction={{ label: "Approve leave", onClick: () => approve(request) }} />
        ) : undefined}
      >
        {screen.anchor}
        <Stack direction="column" align="center" gap="md" paddingY="xs">
          <Avatar size="2xl" {...avatarOf(person)} />
          <Stack gap="2xs" align="center">
            <Heading level={2} textStyle="Heading/2" truncate align="center">{person.name}</Heading>
            <Text as="span" textStyle="Body/Small/Regular" tone="light">{`${person.role} · ${person.location}`}</Text>
          </Stack>
          <Badge theme={leaveStatusTheme[request.status]} background="subtle">{request.status}</Badge>
        </Stack>
        <Card theme="flat">
          <DescriptionList divider items={[
            { id: "type", term: "Type", description: request.kind },
            { id: "dates", term: "Dates", description: leaveDates(request) },
            { id: "length", term: "Length", description: plural(request.days, "day") },
            // While it waits, the approver sees what annual leave would be left; other kinds don't use the balance.
            ...(request.status === "Pending" && request.kind === "Annual leave" && left !== undefined
              ? [{ id: "balance", term: "Balance after", description: plural(left - request.days, "day") }] : []),
            { id: "requested", term: "Requested", description: formatRelative(request.requested) },
          ]} />
        </Card>
        {request.note ? (
          <Stack as="section" gap="xs" aria-labelledby={noteId}>
            <Heading level={2} id={noteId} textStyle="Body/Small/Bold" tone="light">Note</Heading>
            <Text>{request.note}</Text>
          </Stack>
        ) : null}
        {/* What an approver checks before saying yes: who else on the team is away on those days. */}
        <Stack as="section" gap="xs" aria-labelledby={overlapId}>
          <Box paddingX="lg"><Heading level={2} id={overlapId} textStyle="Body/Small/Bold" tone="light">Also off on these days</Heading></Box>
          <ListBox theme="flat">
            {overlap.length ? (
              <List aria-labelledby={overlapId}>
                {overlap.map((other) => (
                  <ListItem key={other.id} title={people[other.person].name} caption={`${leaveDays(other)} · ${other.status}`}
                    leading={<Avatar size="md" {...avatarOf(people[other.person])} />} />
                ))}
              </List>
            ) : <Text textStyle="Body/Small/Regular" tone="base">{`No one else on the ${person.team} team is off then.`}</Text>}
          </ListBox>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Page actions",
    description: "A project page in the studio's AppShell has one Primary, New task, at the end of the PageHeader in the header's Main row. Share is Tertiary and rarer actions wait in the More actions menu, so the main action stands out; the header's top row keeps only the trail, notifications and the account.",
    wide: true,
    screen: true,
    render: () => <PageActionsExample />,
    code: `<AppShell
  sidebar={<Sidebar logo={logo} sections={places} selectedId="projects" onItemClick={go} footer={settings} />}
  header={
    <AppShellHeader
      // The top row: utilities only (the trail, notifications, the account)
      leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: "phin-loyalty", label: "Loyalty app" }]} onNavigate={go} />}
      actions={<><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={3} onClick={openNotifications} />
        <Menu align="end" trigger={<AppShellAccount name="Alex Duong" src={alex.photo} />} items={account} /></>}
      // The Main row: the page's title and its actions, one Primary at the end
      main={<PageHeader
        eyebrow="Phin & Co"
        title="Loyalty app"
        meta={<Badge theme="blue" background="subtle">Active</Badge>}
        actions={<>
          <Button level="tertiary" startIcon="icon-share-01-line" onClick={() => setDialog("share")}>Share</Button>
          <Menu align="end" trigger={<IconButton icon="icon-dots-horizontal-line" aria-label="More actions" />} items={[
            { id: "duplicate", label: "Duplicate project", icon: "icon-copy-line", onSelect: duplicate },
            { id: "hold", label: "Put on hold", icon: "icon-pause-circle-line", onSelect: putOnHold },
          ]} />
          <Button level="primary" startIcon="icon-plus-line" onClick={() => setDialog("task")}>New task</Button>
        </>}
      />}
    />
  }
>
  <Stack gap="xl">
    <Grid columns={3} gap="md" stackBelow={640}>{/* Progress · Budget spent · Open tasks: MetricCard theme="shadow" */}</Grid>
    <Stack as="section" gap="md" aria-labelledby="tasks">
      <Heading level={2} id="tasks" textStyle="Heading/4">Tasks</Heading>
      <Table aria-labelledby="tasks" columns={columns} rows={rows} />
    </Stack>
  </Stack>
</AppShell>`,
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
    description: "On a phone the decision sits in the AppShell's Action bar: Decline leave and Approve leave are two Large buttons side by side, Primary at the end, under the request and who else is off on those days. Once decided, the Action bar leaves, focus returns to Back and a Toast offers Undo; Back goes to the Time off root, where waiting and decided requests are grouped over the bottom bar.",
    render: () => <PhoneApproveExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

// One key per screen; the Top Navigation follows the scroll of the phone screen.
<PlatformPhone key={request.id} canvas="default" screenRef={screenRef}>
  <AppShell
    topNavigation={<TopNavigation type="compact-alt" title="Leave request" scrollRef={screenRef}
      leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToRequests }} />}
    actionBar={request.status === "Pending" ? (
      <ActionBar direction="horizontal"
        secondaryAction={{ label: "Decline leave", onClick: () => decline(request) }}
        primaryAction={{ label: "Approve leave", onClick: () => approve(request) }} />
    ) : undefined}
  >
    {/* The Body pads the screen and spaces its sections */}
    <Stack align="center" gap="md">…the person and the status…</Stack>
    <Card theme="flat"><DescriptionList divider items={[…type, dates, length, balance after…]} /></Card>
    <Stack as="section" gap="xs" aria-labelledby="also-off">…who else is off…</Stack>
  </AppShell>
</PlatformPhone>`,
  },
]);
