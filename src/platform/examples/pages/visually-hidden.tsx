/* Visually Hidden examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as
   Alex Duong, Wednesday Sep 30, 2026, 10:30 am. Each example teaches one use of text that only assistive technology
   reads: a skip link that shows on the first Tab, names for icon-only table columns, words that make repeated buttons
   unique, a status that announces a change shown only visually, unread counts that say what they count on a phone, and
   a heading that names a region sighted people read from the layout. The client portal (AppShell Layout=Top-Bar,
   whose own skip link is the subject) and the phone Inbox sit in the new AppShell (2026-10-19). */
import { useId, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { AppShell, AppShellAccount, AppShellHeader } from "../../../components/AppShell";
import { Avatar } from "../../../components/Avatar";
import { Badge, BadgeCounter } from "../../../components/Badge";
import { BottomNavigation, type BottomNavigationItem } from "../../../components/BottomNavigation";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { Grid, Stack } from "../../../components/Layout";
import { Link } from "../../../components/Link";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { MetricCard } from "../../../components/MetricWidget";
import { PageHeader } from "../../../components/PageHeader";
import { Table, TableActions, TableMedia, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import { PreviewAppFrame, StudioLogo } from "../../PlatformFrames";
import type { PlatformPage } from "../../PlatformExamples";
import {
  TODAY, daysFromToday, formatBytes, formatCompactMoney, formatDate, formatMoney, formatRange, formatRelative, initials, invoiceStatusTheme,
  leaveRequests, leaveStatusTheme, people, projectById, studio, studioMonths, studioTeamHours, tasks, type LeaveRequest, type LeaveStatus, type PersonId,
} from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./visually-hidden.css";

export const page: PlatformPage = "visually-hidden";

const personAvatar = (id: PersonId, size: "sm" | "md" = "md") => {
  const person = people[id];
  return person.photo
    ? <Avatar size={size} theme="photo" src={person.photo} alt="" />
    : <Avatar size={size} theme={person.theme} alt="">{initials(person.name)}</Avatar>;
};
const minutesAgo = (m: number) => new Date(TODAY.getTime() - m * 60_000);

// ——— 1. Skip link: the first Tab stop jumps past the navigation ——————————————————————————————————
type PortalPage = "overview" | "designs" | "invoices" | "messages";
type Row = { id: string; title: string; caption: string; leading: ReactNode; trailing?: ReactNode; to?: PortalPage };
const receipt = <DockIcon icon="icon-receipt-line" theme="neutral" background="subtle" />;
const fileIcon = (name: string) => <FileIcon format={fileIconFormatOf(name)} size="xl" />;
/** The Phin & Co client portal: what Trang Le, their product owner, sees of the Loyalty app project. */
const portal: Record<PortalPage, { label: string; title: string; description: string; section: string; rows: Row[] }> = {
  overview: {
    label: "Overview", title: "Loyalty app", section: "Waiting for you",
    description: "Đìzai Studio is designing and building your loyalty app. Next: the store staff beta on Oct\u00a015.",
    rows: [
      { id: "review", title: "Review the points history screen", caption: `Chi Tran shared it ${formatRelative(minutesAgo(13))}`, leading: personAvatar("chi"), to: "designs" },
      { id: "approve", title: "Approve INV-2026-0142", caption: `${formatMoney(21000, true)} · Due ${formatDate(daysFromToday(25))}`, leading: receipt, to: "invoices" },
    ],
  },
  designs: {
    label: "Designs", title: "Designs", section: "Shared with Phin & Co",
    description: "Files the studio shares with you for review. Comments go straight to the designer.",
    rows: [
      { id: "points", title: "Loyalty app – points history.fig", caption: `${formatBytes(18_400_000)} · Chi Tran · ${formatRelative(minutesAgo(13))}`, leading: fileIcon("a.fig") },
      { id: "store", title: "Store locator.fig", caption: `${formatBytes(9_800_000)} · Chi Tran · ${formatRelative(daysFromToday(-1, 15, 20))}`, leading: fileIcon("a.fig") },
      { id: "brief", title: "Loyalty brief v2.pdf", caption: `${formatBytes(1_100_000)} · Duy Le · ${formatRelative(daysFromToday(-12, 11, 0))}`, leading: fileIcon("a.pdf") },
    ],
  },
  invoices: {
    label: "Invoices", title: "Invoices", section: "Loyalty app",
    description: "What Phin & Co owes and has paid for this project, in USD.",
    rows: [
      { id: "0142", title: "INV-2026-0142", caption: `${formatMoney(21000, true)} · Due ${formatDate(daysFromToday(25))}`, leading: receipt, trailing: <Badge theme={invoiceStatusTheme.Sent} background="subtle">Sent</Badge> },
      { id: "0127", title: "INV-2026-0127", caption: `${formatMoney(18000, true)} · Paid ${formatDate(daysFromToday(-33))}`, leading: receipt, trailing: <Badge theme={invoiceStatusTheme.Paid} background="subtle">Paid</Badge> },
    ],
  },
  messages: {
    label: "Messages", title: "Messages", section: "Recent",
    description: "Your conversation with the studio team. Replies usually come within a working day.",
    rows: [
      { id: "hana", title: "Hana Kim", caption: "Beta invites for store staff go out on Oct 15.", leading: personAvatar("hana") },
      { id: "duy", title: "Duy Le", caption: "The sprint 6 report is in Designs.", leading: personAvatar("duy") },
    ],
  },
};
const portalPages = Object.keys(portal) as PortalPage[];

const loyalty = projectById("phin-loyalty");

function SkipLinkPortal() {
  const { toast } = useToast();
  const [current, setCurrent] = useState<PortalPage>("overview");
  const mainId = useId();
  const sectionId = useId();
  const glanceId = useId();
  const page = portal[current];
  const navigate = (event: MouseEvent<HTMLElement>, id: PortalPage) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setCurrent(id);
  };
  return (
    <PreviewAppFrame height={{ min: 600, max: 760 }}>
      {/* The client portal is one product without a Sidebar: AppShell Layout=Top-Bar, the brand and the portal's
          navigation in the header's top row, Trang's account at its end, the page's PageHeader as its Main row. The
          shell's first focusable element is its skip link (a VisuallyHidden link): hidden until it has focus, then a
          Surface pill at the shell's top-start corner that moves focus to the main content (mainId). */}
      <AppShell pattern="top-bar" mainId={mainId}
        header={(
          <AppShellHeader
            leading={(
              // Brand · navigation; in a narrow window the row takes a line of its own above the account.
              <Stack direction="row" align="center" gap="xl" wrap>
                <StudioLogo src={studio.logo} name={studio.name} />
                <Stack as="nav" aria-label="Client portal">
                  <Stack as="ul" direction="row" gap="md" wrap>
                    {portalPages.map((id) => {
                      const here = id === current;
                      return (
                        <li key={id}>
                          {/* A navigation list, not links in copy: the links take the bar's neutral text colour (tone="inherit"),
                              the current page is Strongest and Bold with aria-current, and the others underline on hover. */}
                          <Text as="span" textStyle={here ? "Body/Base/Bold" : "Body/Base/Medium"} tone={here ? "strongest" : "base"}>
                            <Link href={`/portal/${id}`} tone="inherit" underline={here ? "none" : "hover"} aria-current={here ? "page" : undefined}
                              onClick={(event) => navigate(event, id)}>{portal[id].label}</Link>
                          </Text>
                        </li>
                      );
                    })}
                  </Stack>
                </Stack>
              </Stack>
            )}
            actions={(
              <Menu align="end" trigger={<AppShellAccount name="Trang Le" theme="blue" />} items={[
                { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: "Trang Le", children: "Product owner · Phin & Co" }) },
                { type: "separator" },
                { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out of the client portal", children: "See you soon, Trang." }) },
              ]} />
            )}
            main={<PageHeader title={page.title} description={page.description}
              meta={current === "overview" ? <Badge theme="blue" background="subtle">Active</Badge> : undefined} />}
          />
        )}
      >
        {/* The Body pads the page and is the skip link's target. Sections of the page sit xl apart. */}
        <Stack gap="xl">
          {current === "overview" ? (
            <Stack as="section" gap="md" aria-labelledby={glanceId}>
              <Heading level={2} id={glanceId} textStyle="Heading/4">At a glance</Heading>
              {/* No Sidebar sets an elevation: white flat boxes on the Canvas. */}
              <Grid columns="repeat(auto-fit, minmax(min(100%, 220px), 1fr))" gap="md">
                <MetricCard theme="flat" size="md" icon="icon-target-04-line" iconTheme="blue" label="Progress" value={`${loyalty.progress}%`} />
                <MetricCard theme="flat" size="md" icon="icon-calendar-line" iconTheme="purple" label="Store staff beta" value={formatDate(new Date(2026, 9, 15))} />
                <MetricCard theme="flat" size="md" icon="icon-coins-line" iconTheme="green" label="Budget used" value={formatCompactMoney(loyalty.spent)} />
              </Grid>
            </Stack>
          ) : null}
          <Stack as="section" gap="md" aria-labelledby={sectionId}>
            <Heading level={2} id={sectionId} textStyle="Heading/4">{page.section}</Heading>
            <ListBox>
              <List aria-labelledby={sectionId}>
                {/* A row that leads to another page of the portal is a link (href); the others open in place. */}
                {page.rows.map(({ to, ...row }) => (
                  <ListItem key={row.id} title={row.title} titleLines={2} caption={row.caption} leading={row.leading} trailing={row.trailing}
                    href={to ? `/portal/${to}` : undefined}
                    onClick={to ? (event) => navigate(event, to) : () => toast({ title: row.title, children: row.caption })} />
                ))}
              </List>
            </ListBox>
          </Stack>
        </Stack>
      </AppShell>
    </PreviewAppFrame>
  );
}

// ——— 2. Icon-only columns: the header names the column for screen readers ——————————————————————————
type StudioFileRow = { id: string; name: string; bytes: number; owner: PersonId; updated: Date };
const firstFiles: StudioFileRow[] = [
  { id: "f1", name: "Loyalty app – points history.fig", bytes: 18_400_000, owner: "chi", updated: minutesAgo(13) },
  { id: "f2", name: "Store locator.fig", bytes: 9_800_000, owner: "chi", updated: daysFromToday(-1, 15, 20) },
  { id: "f3", name: "Rewards API contract.json", bytes: 86_000, owner: "bao", updated: daysFromToday(-2, 9, 40) },
  { id: "f4", name: "Android test plan.pdf", bytes: 640_000, owner: "em", updated: daysFromToday(-8, 16, 15) },
  { id: "f5", name: "Sprint 6 report.xlsx", bytes: 420_000, owner: "duy", updated: daysFromToday(-3, 17, 30) },
];

function FilesTable() {
  const { toast } = useToast();
  const [rows, setRows] = useState(firstFiles);
  const [starred, setStarred] = useState<string[]>(["f1"]);
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const toggleStar = (row: StudioFileRow) => setStarred((list) => (list.includes(row.id) ? list.filter((id) => id !== row.id) : [...list, row.id]));
  const archive = (row: StudioFileRow) => {
    const index = rows.findIndex((item) => item.id === row.id);
    setRows((list) => list.filter((item) => item.id !== row.id));
    toast({ title: "File archived", children: row.name, action: { label: "Undo", onClick: () => setRows((list) => [...list.slice(0, index), row, ...list.slice(index)]) } });
    // The row and its button are gone: focus moves to the next row's Archive, or to the heading.
    requestAnimationFrame(() => {
      const buttons = sectionRef.current?.querySelectorAll<HTMLElement>("[data-archive]") ?? [];
      (buttons[Math.min(index, buttons.length - 1)] ?? sectionRef.current?.querySelector<HTMLElement>("h4"))?.focus();
    });
  };
  const columns: TableColumn<StudioFileRow>[] = [
    // No visible header: the star is the column's only content, so the hidden text names it ("Starred").
    { id: "starred", header: <VisuallyHidden>Starred</VisuallyHidden>, width: "64px", cell: (row) => {
      const on = starred.includes(row.id);
      return <IconButton appearance="flat" level="primary" size="md" icon={on ? "icon-star-01-solid" : "icon-star-01-line"} aria-pressed={on} aria-label={`Star ${row.name}`} onClick={() => toggleStar(row)} />;
    } },
    // Who changed the file and when share the name's caption, so the icon-only columns sit closer to the name.
    { id: "name", header: "Name", cell: (row) => <TableMedia bold media={<FileIcon format={fileIconFormatOf(row.name)} size="lg" />} caption={`${people[row.owner].name} · ${formatRelative(row.updated)}`}>{row.name}</TableMedia> },
    { id: "size", header: "Size", align: "right", width: "120px", cell: (row) => <TableText>{formatBytes(row.bytes)}</TableText> },
    { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", width: "72px", cell: (row) => (
      <TableActions>
        <IconButton appearance="flat" level="primary" size="md" icon="icon-archive-line" aria-label={`Archive ${row.name}`} data-archive="" onClick={() => archive(row)} />
      </TableActions>
    ) },
  ];
  return (
    <Stack as="section" ref={sectionRef} gap="md" aria-labelledby={headingId}>
      <Stack direction="row" justify="between" align="center" gap="xs" wrap>
        <Heading level={4} id={headingId} textStyle="Heading/4" tabIndex={-1}>Loyalty app files</Heading>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{`${plural(rows.length, "file")} · ${starred.filter((id) => rows.some((row) => row.id === id)).length} starred`}</Text>
      </Stack>
      <Table className="px-visually-hidden-files" aria-labelledby={headingId} columns={columns} rows={rows}
        empty={<EmptyState size="sm" headingLevel={5} icon="icon-folder-line" title="Every file is archived"
          secondaryAction={{ label: "Restore files", onClick: () => setRows(firstFiles) }}>Archived files stay in Archive for 30 days.</EmptyState>} />
    </Stack>
  );
}

// ——— 3. Repeated buttons: hidden words make each name unique ———————————————————————————————————
const pendingLeave = leaveRequests.filter((request) => request.status === "Pending");

function LeaveApprovals() {
  const { toast } = useToast();
  const [decided, setDecided] = useState<Record<string, LeaveStatus>>({});
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const waiting = pendingLeave.filter((request) => !decided[request.id]).length;
  const decide = (request: LeaveRequest, status: "Approved" | "Declined") => {
    const name = people[request.person].name;
    setDecided((map) => ({ ...map, [request.id]: status }));
    toast({ title: status === "Approved" ? "Request approved" : "Request declined", children: `${name} · ${formatRange(request.from, request.to)}`,
      action: { label: "Undo", onClick: () => setDecided((map) => { const next = { ...map }; delete next[request.id]; return next; }) } });
    // The buttons leave with the decision: focus moves on to the next request still waiting, or stays on this card.
    requestAnimationFrame(() => (sectionRef.current?.querySelector<HTMLElement>("[data-approve]") ?? sectionRef.current?.querySelector<HTMLElement>(`[data-request="${request.id}"]`))?.focus());
  };
  return (
    <Stack as="section" ref={sectionRef} gap="md" aria-labelledby={headingId}>
      <Stack gap="xs">
        <Heading level={4} id={headingId} textStyle="Heading/4">Time off requests</Heading>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{waiting ? `${plural(waiting, "request")} waiting for you` : "All caught up"}</Text>
      </Stack>
      {pendingLeave.map((request) => {
        const person = people[request.person];
        const status = decided[request.id] ?? request.status;
        // "Approve" alone sounds the same on every card; the hidden words name whose request it is.
        const whose = ` ${person.name}'s request`;
        return (
          <Card key={request.id} as="article" theme="flat" data-request={request.id} tabIndex={-1} aria-label={`${person.name}, ${request.kind}`}>
            <Stack gap="md">
              <Stack direction="row" gap="md" align="center">
                {personAvatar(request.person)}
                <Stack gap="2xs" width="fill">
                  {/* The status Badge sits beside the name (2xs) and wraps under it on a narrow card instead of being cut. */}
                  <Stack direction="row" gap="2xs" align="center" wrap>
                    <Heading level={5} textStyle="Body/Base/Bold" width="fill">{person.name}</Heading>
                    <Badge theme={leaveStatusTheme[status]} background="subtle" size="sm">{status}</Badge>
                  </Stack>
                  <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${request.kind} · ${formatRange(request.from, request.to)} · ${plural(request.days, "day")}`}</Text>
                </Stack>
              </Stack>
              {request.note ? <Text tone="base">{request.note}</Text> : null}
              {status === "Pending" ? (
                <Stack direction="row" gap="sm" justify="end" wrap>
                  <Button level="tertiary" onClick={() => decide(request, "Declined")}>Decline<VisuallyHidden>{whose}</VisuallyHidden></Button>
                  <Button level="primary" data-approve="" onClick={() => decide(request, "Approved")}>Approve<VisuallyHidden>{whose}</VisuallyHidden></Button>
                </Stack>
              ) : null}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}

// ——— 4. A change shown only visually: a status region says what moved ——————————————————————————
const sprintTasks = ["t1", "t2", "t3"].map((id) => tasks.find((task) => task.id === id)!).concat([
  { id: "t11", key: "PHIN-226", title: "Empty state for members with no points", project: "phin-loyalty", assignee: "gia", status: "To do", priority: "Medium", due: daysFromToday(9), comments: 0 },
  { id: "t12", key: "PHIN-231", title: "Store picker for pickup orders", project: "phin-loyalty", assignee: "chi", status: "To do", priority: "Low", due: daysFromToday(12), comments: 1 },
]);

/** True while `ref`'s element is narrower than `width`: on a phone-width card the two move buttons fold into one menu. */
function useNarrowerThan(width: number) {
  const ref = useRef<HTMLElement>(null);
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);
  return [ref, narrow] as const;
}

function SprintPriorities() {
  const [cardRef, narrow] = useNarrowerThan(400);
  const [order, setOrder] = useState(sprintTasks);
  const [message, setMessage] = useState("");
  const titleId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const move = (id: string, by: -1 | 1) => {
    const from = order.findIndex((task) => task.id === id);
    const to = from + by;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const [task] = next.splice(from, 1);
    next.splice(to, 0, task);
    setOrder(next);
    // The row only moves on screen; the status region (rendered empty from the start) says where it went.
    setMessage(`${task.title} moved to priority ${to + 1} of ${next.length}`);
    // Keep focus on the moved row's button, or its other button once this one turns disabled at the top or bottom
    // (on a narrow card the Menu returns focus to the row's Reorder button itself).
    requestAnimationFrame(() => {
      const row = listRef.current?.querySelector(`[data-task="${id}"]`);
      const wanted = row?.querySelector<HTMLButtonElement>(`[data-move="${by}"]`);
      if (!wanted) return;
      (wanted.disabled ? row?.querySelector<HTMLButtonElement>(`[data-move="${-by}"]`) : wanted)?.focus();
    });
  };
  return (
    // A ListBox: the title and sprint in its Header-Slot, the rows (and the out-of-flow status region) in its Body-Slot.
    <ListBox as="section" ref={cardRef} aria-labelledby={titleId}
      header={<Stack gap="2xs">
        <Heading level={4} id={titleId} textStyle="Heading/Subheading">Sprint 7 priorities</Heading>
        <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${projectById("phin-loyalty").name} · ${formatRange(daysFromToday(1), daysFromToday(14))}`}</Text>
      </Stack>}>
      <List ref={listRef} aria-labelledby={titleId}>
        {order.map((task, index) => (
          // The order is the priority, shown only by position: the status region below says the new place in words.
          <ListItem key={task.id} data-task={task.id} title={task.title} titleLines={2} caption={`${task.key} · ${people[task.assignee].name}`}
            trailing={narrow ? (
              <Menu align="end" trigger={<IconButton appearance="flat" level="primary" size="md" icon="icon-dots-horizontal-line" aria-label={`Reorder ${task.title}`} />}
                items={[
                  { id: "up", label: "Move up", icon: "icon-arrow-up-line", disabled: index === 0, onSelect: () => move(task.id, -1) },
                  { id: "down", label: "Move down", icon: "icon-arrow-down-line", disabled: index === order.length - 1, onSelect: () => move(task.id, 1) },
                ]} />
            ) : <>
              <IconButton appearance="flat" level="primary" size="md" icon="icon-arrow-up-line" aria-label={`Move ${task.title} up`} data-move="-1" disabled={index === 0} onClick={() => move(task.id, -1)} />
              <IconButton appearance="flat" level="primary" size="md" icon="icon-arrow-down-line" aria-label={`Move ${task.title} down`} data-move="1" disabled={index === order.length - 1} onClick={() => move(task.id, 1)} />
            </>} />
        ))}
      </List>
      <VisuallyHidden role="status">{message}</VisuallyHidden>
    </ListBox>
  );
}

// ——— 5. Unread counts on a phone: the number says what it counts ——————————————————————————————————
type Thread = { id: string; key: string; title: string; project: string; comments: { by: PersonId; text: string; at: Date }[]; unread: number };
const thread = (id: string, key: string, title: string, project: string, unread: number, comments: Thread["comments"]): Thread => ({ id, key, title, project, unread, comments });
const firstThreads: Thread[] = [
  thread("t1", "PHIN-214", "Design the points history screen", "phin-loyalty", 3, [
    { by: "chi", text: "Moved the store name above the amount, as Trang asked.", at: minutesAgo(0.5) },
    { by: "bao", text: "The API sends the store name already, no change on my side.", at: minutesAgo(9) },
    { by: "chi", text: "Can you check the empty month state before Friday?", at: minutesAgo(22) },
  ]),
  thread("t2", "PHIN-219", "Connect the rewards API to checkout", "phin-loyalty", 1, [{ by: "bao", text: "Ready for your review: points now apply before tax.", at: minutesAgo(13) }]),
  thread("t4", "LUM-088", "Run five usability sessions on transfers", "lumen-banking", 2, [
    { by: "ava", text: "Session 3 is booked for Thursday at 2:00 pm.", at: daysFromToday(0, 9, 50) },
    { by: "hana", text: "Lumen Bank wants two of the five on Android.", at: daysFromToday(0, 9, 12) },
  ]),
  thread("t5", "LUM-091", "Audit the account overview for WCAG 2.2", "lumen-banking", 1, [{ by: "finn", text: "The balance chart has no text alternative yet.", at: daysFromToday(-1, 17, 40) }]),
  thread("t8", "ZEN-405", "Write guidelines for the Metric card", "zen-ds", 0, [{ by: "chi", text: "First draft is in the doc, Do and Don't still missing.", at: daysFromToday(-1, 15, 5) }]),
  thread("t9", "MEK-031", "Map the customs hold states", "mekong-tracking", 0, [{ by: "duy", text: "On hold until Mekong Freight signs the change request.", at: daysFromToday(-1, 11, 30) }]),
  thread("t10", "SAO-004", "Moodboard for the outdoor range", "saola-brand", 2, [
    { by: "gia", text: "Added the river and forest boards.", at: daysFromToday(-2, 16, 20) },
    { by: "emi", text: "Motion references are in the second frame.", at: daysFromToday(-2, 14, 0) },
  ]),
  thread("t3", "PHIN-223", "Regression test for the Android build", "phin-loyalty", 0, [{ by: "em", text: "Build 1.4.2 passes on the Pixel 7 and the Galaxy A54.", at: daysFromToday(-2, 10, 15) }]),
  thread("t6", "LUM-095", "Spike: passkey sign-in on iOS", "lumen-banking", 0, [{ by: "finn", text: "Write-up is attached; passkeys work on iOS 17 and later.", at: daysFromToday(-3, 18, 0) }]),
  thread("t7", "ZEN-402", "Add Disabled back to Input and Search", "zen-ds", 0, [{ by: "bao", text: "Merged, with the Figma states for Field-Only.", at: daysFromToday(-3, 12, 45) }]),
  thread("t13", "PHIN-208", "Points balance widget", "phin-loyalty", 0, [{ by: "chi", text: "Signed off by Trang Le.", at: daysFromToday(-4, 15, 30) }]),
  thread("t14", "MEK-027", "Driver app sign-in", "mekong-tracking", 0, [{ by: "khoa", text: "SMS codes arrive in under 10 seconds now.", at: daysFromToday(-5, 10, 10) }]),
  thread("t15", "SAO-002", "Brand refresh kickoff agenda", "saola-brand", 0, [{ by: "linh", text: "Agenda sent to Saola Outdoor for Oct 12.", at: daysFromToday(-6, 9, 0) }]),
  thread("t16", "BOOK-118", "Book Fair launch video", "bookfair-site", 0, [{ by: "emi", text: "Final cut is in Files, 1080p and 4K.", at: daysFromToday(-20, 17, 45) }]),
];
const back = "icon-chevron-left-line-medium" as const;

/** The roots of the studio's phone app, in its bottom bar: a selected root shows its solid icon. */
const phoneRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "inbox", label: "Inbox", icon: "icon-message-chat-circle-line", selectedIcon: "icon-message-chat-circle-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];

function PhoneInbox() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const [threads, setThreads] = useState(firstThreads);
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = threads.find((item) => item.id === openId);
  const unread = threads.reduce((sum, item) => sum + item.unread, 0);
  const waiting = threads.filter((item) => item.unread).length;
  const open = (id: string) => screen.go('.zen-top-nav__action[aria-label="Back"]', () => {
    setOpenId(id);
    setThreads((list) => list.map((item) => (item.id === id ? { ...item, unread: 0 } : item)));
  });
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows Visually Hidden." });

  if (opened) {
    const markUnread = () => {
      setThreads((list) => list.map((item) => (item.id === opened.id ? { ...item, unread: item.comments.length } : item)));
      toast({ title: "Marked as unread", children: `${opened.key} · ${plural(opened.comments.length, "unread comment")}` });
    };
    return (
      // A pushed screen: the compact bar with Back and the task's key, this thread's one action in its trailing slot, no
      // bottom bar. The Body pads the screen.
      <PlatformPhone key={opened.id} label="Zen app" screenRef={screenRef}>
        <AppShell
          topNavigation={<TopNavigation type="compact-alt" title={opened.key} scrollRef={screenRef}
            leading={{ icon: back, label: "Back", onClick: () => screen.go(`[data-thread="${opened.id}"] .zen-list-item__wrapper`, () => setOpenId(null)) }}
            trailing={[{ icon: "icon-mail-01-line", label: "Mark as unread", onClick: markUnread }]} />}
        >
          {screen.anchor}
          <Stack gap="lg">
            <Stack gap="xs">
              <Heading level={2} textStyle="Heading/Subheading">{opened.title}</Heading>
              <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${projectById(opened.project).name} · ${plural(opened.comments.length, "comment")}`}</Text>
            </Stack>
            {/* Static rows (comments are read, not opened) take the same screen margin as the title above. */}
            <List aria-label="Comments">
              {opened.comments.map((comment) => (
                // The comment is what the thread is read for: it takes the body text; name and time are the line above it.
                <ListItem key={comment.text} title={people[comment.by].name} leading={personAvatar(comment.by)}>
                  <span className="px-visually-hidden-comment-meta">
                    <Text as="span" textStyle="Body/Base/Bold">{people[comment.by].name}</Text>
                    <Text as="span" textStyle="Body/Small/Regular" tone="light">{formatRelative(comment.at)}</Text>
                  </span>
                  <Text as="span" tone="base">{comment.text}</Text>
                </ListItem>
              ))}
            </List>
          </Stack>
        </AppShell>
      </PlatformPhone>
    );
  }

  return (
    // The Inbox root: the large title folds into the bar as the threads scroll, the app's roots sit in the bottom bar. The
    // threads are the list that closes the phone screen, so they sit open on the Canvas, not in a box (usage rules §19).
    <PlatformPhone key="inbox" label="Zen app" screenRef={screenRef}>
      <AppShell
        topNavigation={<TopNavigation title="Inbox" largeTitle="Inbox" scrollRef={screenRef}
          largeTitleSubheading={waiting ? `New comments in ${plural(waiting, "thread")}` : "You’re all caught up"} />}
        bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={phoneRoots} value="inbox"
          onValueChange={(id) => { if (id !== "inbox") notHere(phoneRoots.find((item) => item.id === id)?.label ?? id); }} />}
      >
        {screen.anchor}
        {/* The list's name carries the total; each counter is aria-hidden and its hidden text says what it counts. */}
        <List aria-label={unread ? `Inbox, ${plural(unread, "unread comment")}` : "Inbox"}>
          {threads.map((item) => {
            const last = item.comments[0];
            return (
              <ListItem key={item.id} data-thread={item.id} title={item.title} titleLines={2} caption={`${item.key} · ${people[last.by].name} · ${formatRelative(last.at)}`}
                leading={personAvatar(last.by)} onClick={() => open(item.id)}
                trailing={item.unread ? <>
                  <BadgeCounter value={item.unread} theme="red" aria-hidden="true" />
                  <VisuallyHidden>{plural(item.unread, "unread comment")}</VisuallyHidden>
                </> : undefined} />
            );
          })}
        </List>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— 6. A heading for screen readers: the layout names the region for everyone else ——————————————————
const hoursOf = (month: (typeof studioTeamHours)[number]) => month.design + month.engineering + month.delivery + month.clientServices;
/** A change that rounds to 0% is no trend: the neutral badge with no arrow, never a green "+0%". */
const trendOf = (now: number, before: number, versus: string) => {
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return { direction: "normal" as const, label: `No change vs ${versus}` };
  return { direction: pct > 0 ? "positive" as const : "negative" as const, label: `${pct > 0 ? "+" : "−"}${Math.abs(pct)}% vs ${versus}` };
};
/** The months with billable hours and a month before them to compare with (data.ts: Apr – Sep 2026), newest first. */
const glanceMonths = studioTeamHours.slice(1).map((hours, index) => {
  const month = studioMonths.find((item) => item.label === hours.label)!;
  const before = studioMonths.find((item) => item.label === studioTeamHours[index].label)!;
  return { id: month.id, label: `${month.label} 2026`, name: month.month, month, before, hours: hoursOf(hours), hoursBefore: hoursOf(studioTeamHours[index]) };
}).reverse();
/** What was overdue at the end of each month: the amount and how many invoices. */
const overdueAt: Record<string, [number, number]> = { may: [4200, 1], jun: [3150, 1], jul: [6750, 1], aug: [9400, 2], sep: [12880, 1] };

function MonthAtAGlance() {
  const headingId = useId();
  const [monthId, setMonthId] = useState(glanceMonths[0].id);
  const at = glanceMonths.find((item) => item.id === monthId)!;
  const [overdue, overdueCount] = overdueAt[at.id];
  const trend = (now: number, before: number) => trendOf(now, before, at.before.label);
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      {/* Sighted people read the cards as one group under the month they picked; a screen-reader user jumping by
          headings lands on the group's name, which follows the month. */}
      <VisuallyHidden as="h4" id={headingId}>{`${at.name} at a glance`}</VisuallyHidden>
      <Stack direction="row" gap="xs" align="center" wrap>
        <Chip variant="advanced" dropdown popoverLabel="Month"
          popoverItems={glanceMonths.map((item) => ({ id: item.id, label: item.label, selected: item.id === monthId }))}
          onPopoverSelect={(item) => setMonthId(item.id)}>
          {at.label}
        </Chip>
      </Stack>
      <Grid minColumnWidth="220px" gap="md">
        <MetricCard theme="flat" label="Invoiced" value={formatCompactMoney(at.month.invoiced)} trend={trend(at.month.invoiced, at.before.invoiced)} icon="icon-receipt-line" iconTheme="blue" />
        <MetricCard theme="flat" label="Collected" value={formatCompactMoney(at.month.collected)} trend={trend(at.month.collected, at.before.collected)} icon="icon-currency-dollar-circle-line" iconTheme="green" />
        <MetricCard theme="flat" label="Billable hours" value={`${at.hours.toLocaleString("en-US")} h`} trend={trend(at.hours, at.hoursBefore)} icon="icon-clock-line" iconTheme="violet" />
        <MetricCard theme="flat" label="Overdue" value={formatCompactMoney(overdue)} trend={{ direction: "normal", label: plural(overdueCount, "invoice") }} icon="icon-alarm-clock-line" iconTheme="orange" />
      </Grid>
    </Stack>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Skip link",
    screen: true,
    description: "Phin & Co's client portal, built on AppShell (Layout=Top-Bar). Its first Tab stop is the shell's skip link, a VisuallyHidden link: hidden until it has focus, then a Surface pill at the top of the page that jumps past the brand and the navigation to the main content. AppShell adds one for you; a page built without it adds its own, as the second half of the code shows.",
    render: () => <SkipLinkPortal />,
    code: `{/* AppShell renders the skip link first: <VisuallyHidden as="a" href={\`#\${mainId}\`} focusable>Skip to content</VisuallyHidden> */}
<AppShell pattern="top-bar" mainId={mainId}
  header={
    <AppShellHeader
      leading={<Stack direction="row" align="center" gap="xl" wrap>
        <StudioLogo src={studio.logo} name="Đìzai Studio" />
        <Stack as="nav" aria-label="Client portal">…</Stack>
      </Stack>}
      actions={<Menu align="end" trigger={<AppShellAccount name="Trang Le" theme="blue" />} items={accountItems} />}
      main={<PageHeader title="Loyalty app" description="…" meta={<Badge theme="blue" background="subtle">Active</Badge>} />}
    />
  }
>
  …the page: the skip link's target
</AppShell>

{/* A page without AppShell: the first focusable element; its pill shows at the top-start of the nearest positioned box. */}
<VisuallyHidden as="a" href="#main" focusable onClick={(event) => { event.preventDefault(); mainRef.current?.focus(); }}>
  Skip to main content
</VisuallyHidden>
<header><nav aria-label="Client portal">…</nav></header>
<main ref={mainRef} id="main" tabIndex={-1}>…</main>`,
  },
  {
    title: "Icon-only columns",
    wide: true,
    description: "The star and archive columns show no header text, so a hidden header names them: screen readers announce “Starred” and “Actions” with every cell. Each button still names its own row; Archive removes the row and the toast can undo it. On a narrow screen the table scrolls sideways to Archive.",
    render: () => <FilesTable />,
    code: `<Table aria-labelledby={headingId} rows={rows} columns={[
  { id: "starred", header: <VisuallyHidden>Starred</VisuallyHidden>, width: "64px", cell: (row) => (
    <IconButton appearance="flat" level="primary" size="md" icon={starred(row) ? "icon-star-01-solid" : "icon-star-01-line"}
      aria-pressed={starred(row)} aria-label={\`Star \${row.name}\`} onClick={() => toggleStar(row)} />
  ) },
  { id: "name", header: "Name", cell: (row) => (
    <TableMedia bold media={<FileIcon format={fileIconFormatOf(row.name)} size="lg" />} caption={\`\${owner.name} · \${formatRelative(row.updated)}\`}>{row.name}</TableMedia>
  ) },
  { id: "size", header: "Size", align: "right", width: "120px", cell: (row) => <TableText>{formatBytes(row.bytes)}</TableText> },
  { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", width: "72px", cell: (row) => (
    <TableActions>
      <IconButton appearance="flat" level="primary" size="md" icon="icon-archive-line" aria-label={\`Archive \${row.name}\`} onClick={() => archive(row)} />
    </TableActions>
  ) },
]} />`,
  },
  {
    title: "Unique button names",
    description: "Every card says Approve and Decline, which a screen reader would read the same way each time. Hidden words, starting with a space, finish the name: “Approve Chi Tran's request”. The visible label stays first, so voice control still finds it.",
    render: () => <LeaveApprovals />,
    code: `{/* The hidden part starts with a space, so the name reads as one phrase. */}
<Stack direction="row" gap="sm" justify="end" wrap>
  <Button level="tertiary" onClick={() => decide(request, "Declined")}>
    Decline<VisuallyHidden>{\` \${person.name}'s request\`}</VisuallyHidden>
  </Button>
  <Button level="primary" onClick={() => decide(request, "Approved")}>
    Approve<VisuallyHidden>{\` \${person.name}'s request\`}</VisuallyHidden>
  </Button>
</Stack>`,
  },
  {
    title: "Announce a change",
    description: "Move up and Move down only reorder the rows on screen, so a hidden status region says where the task went (“moved to priority 2 of 5”). The region is rendered empty from the start and focus stays on the moved row's button.",
    render: () => <SprintPriorities />,
    code: `const move = (id, by) => {
  const next = reorder(order, id, by);
  setOrder(next);
  setMessage(\`\${task.title} moved to priority \${next.indexOf(task) + 1} of \${next.length}\`);
};

<List aria-labelledby={titleId}>
  {order.map((task, index) => (
    <ListItem key={task.id} title={task.title} titleLines={2} caption={\`\${task.key} · \${assignee.name}\`}
      trailing={<>
        <IconButton appearance="flat" level="primary" size="md" icon="icon-arrow-up-line" aria-label={\`Move \${task.title} up\`}
          disabled={index === 0} onClick={() => move(task.id, -1)} />
        <IconButton appearance="flat" level="primary" size="md" icon="icon-arrow-down-line" aria-label={\`Move \${task.title} down\`}
          disabled={index === order.length - 1} onClick={() => move(task.id, 1)} />
      </>} />
  ))}
</List>
{/* Rendered from the start, empty; a region inserted with its message is often not announced. */}
<VisuallyHidden role="status">{message}</VisuallyHidden>`,
  },
  {
    title: "Unread counts on a phone",
    description: "A red counter alone reads as a bare “3”. In the studio app's Inbox the counter is hidden from screen readers and hidden text beside it says “3 unread comments”, while the list's name carries the total. Opening a thread clears its count, Mark as unread brings it back, and Back returns to the row.",
    render: () => <PhoneInbox />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone key="inbox" screenRef={screenRef}>
  <AppShell
    topNavigation={<TopNavigation title="Inbox" largeTitle="Inbox" largeTitleSubheading="New comments in 6 threads" scrollRef={screenRef} />}
    bottomNavigation={<BottomNavigation aria-label="Đìzai Studio" showLabels items={roots} value="inbox" onValueChange={go} />}
  >
    {/* The list closes the phone screen: open on the Canvas, at the body's margin, no ListBox (usage rules §19) */}
    <List aria-label={unread ? \`Inbox, \${plural(unread, "unread comment")}\` : "Inbox"}>
      {threads.map((item) => (
        <ListItem key={item.id} title={item.title} titleLines={2} caption={\`\${item.key} · \${lastBy.name} · \${formatRelative(last.at)}\`} leading={avatar(item)} onClick={() => open(item.id)}
          trailing={item.unread ? <>
            <BadgeCounter value={item.unread} theme="red" aria-hidden="true" />
            <VisuallyHidden>{plural(item.unread, "unread comment")}</VisuallyHidden>
          </> : undefined} />
      ))}
    </List>
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "Hidden section heading",
    wide: true,
    description: "Four metric cards under a month picker read as one group from the layout, but screen-reader users move between headings. A hidden heading at the section's level (h2 on a page, h4 in this card) names the region through aria-labelledby and follows the month.",
    render: () => <MonthAtAGlance />,
    code: `<Stack as="section" gap="md" aria-labelledby="month-heading">
  <VisuallyHidden as="h2" id="month-heading">{\`\${month.name} at a glance\`}</VisuallyHidden>
  <Stack direction="row" gap="xs" align="center" wrap>
    <Chip variant="advanced" dropdown popoverLabel="Month" onPopoverSelect={(item) => setMonthId(item.id)}
      popoverItems={months.map((item) => ({ id: item.id, label: item.label, selected: item.id === monthId }))}>
      {month.label}
    </Chip>
  </Stack>
  <Grid minColumnWidth="220px" gap="md">
    <MetricCard theme="flat" label="Invoiced" value="$105.7K" trend={{ direction: "positive", label: "+9% vs Aug" }} icon="icon-receipt-line" iconTheme="blue" />
    <MetricCard theme="flat" label="Collected" value="$88.3K" trend={{ direction: "negative", label: "−8% vs Aug" }} icon="icon-currency-dollar-circle-line" iconTheme="green" />
    <MetricCard theme="flat" label="Billable hours" value="5,900 h" trend={{ direction: "positive", label: "+4% vs Aug" }} icon="icon-clock-line" iconTheme="violet" />
    <MetricCard theme="flat" label="Overdue" value="$12.9K" trend={{ direction: "normal", label: "1 invoice" }} icon="icon-alarm-clock-line" iconTheme="orange" />
  </Grid>
</Stack>`,
  },
]);
