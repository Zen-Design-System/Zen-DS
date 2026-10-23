/* Skeleton examples (docs/research/example-rebuild-brief-2026-09-30.md): Đìzai Studio's invoices, files, activity and
   tasks while they load. Every demo loads on a short timer, then swaps the real content in one step. The two screens
   (the Invoices page, the phone app's task) sit in the new AppShell (2026-10-19): Layout=Sidebar on desktop, the
   mobile parts (TopNavigation, BottomNavigation, ActionBar) inside PlatformPhone. */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader } from "../../../components/AppShell";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { BadgeStatus } from "../../../components/BadgeStatus";
import { BottomNavigation, type BottomNavigationItem } from "../../../components/BottomNavigation";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { Image } from "../../../components/Image";
import { InlineMessage } from "../../../components/InlineMessage";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { MetricCard } from "../../../components/MetricWidget";
import { PageHeader } from "../../../components/PageHeader";
import { Sidebar, SidebarMenuItem, type SidebarItem, type SidebarSection } from "../../../components/Sidebar";
import { SkeletonHeading, SkeletonShape, SkeletonText } from "../../../components/Skeleton";
import { Table, TableBadges, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { platformMedia } from "../../PlatformMedia";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import { PreviewAppFrame, StudioLogo, StudioMark } from "../../PlatformFrames";
import {
  TODAY, activity, daysFromToday, formatBytes, formatDate, formatDue, formatMoney, formatRelative, initials, invoiceStatusTheme,
  invoices, me, people, priorityTheme, projectById, studio, studioMonths, taskStep, tasks, type Activity, type Invoice, type PersonId,
  type Task,
} from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import "./skeleton.css";

export const page: PlatformPage = "skeleton";

/** Runs a demo load: `loading` is true for `ms`, then false. Call `reload()` to load again. */
function useDemoLoad(ms: number) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!loading) return undefined;
    const timer = window.setTimeout(() => setLoading(false), ms);
    return () => window.clearTimeout(timer);
  }, [loading, ms]);
  return { loading, reload: () => setLoading(true) };
}

const personAvatar = (id: PersonId) => {
  const person = people[id];
  return person.photo ? <Avatar theme="photo" src={person.photo} alt="" /> : <Avatar theme={person.theme} alt="">{initials(person.name)}</Avatar>;
};

/** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
function useNotHere() {
  const { toast } = useToast();
  return (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the Skeleton." });
}

/* ───────────── The studio's desktop app ───────────── */

/* Đìzai Studio's navigation: the same Sidebar on every page, its current page selected. */
const studioNav: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "clients", label: "Clients", icon: "icon-briefcase-line" },
    { id: "people", label: "People", icon: "icon-users-line" },
  ] },
  { label: "Finance", items: [
    { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
    { id: "expenses", label: "Expenses", icon: "icon-wallet-02-line" },
  ] },
];
const unreadActivity = activity.filter((item) => item.unread);

/**
 * One page of the studio's app: AppShell Layout=Sidebar in a desktop window. The chrome (the Sidebar, the header's top
 * row and the PageHeader in its Main row) renders at once; only the Body waits for data. The Body pads the page itself.
 */
function StudioApp({ here, main, children }: { here: string; main: ReactNode; children: ReactNode }) {
  const { toast } = useToast();
  const notHere = useNotHere();
  const [unread, setUnread] = useState(unreadActivity.length);
  const first = unreadActivity[0];
  return (
    <PreviewAppFrame height={{ min: 640, max: 820 }}>
      <AppShell
        sidebar={(
          <Sidebar logo={<StudioLogo src={studio.logo} name={studio.name} />} logoCollapsed={<StudioMark src={studio.logo} name={studio.name} />}
            sections={studioNav} selectedId={here} onItemClick={(item: SidebarItem) => { if (item.id !== here) notHere(item.label); }}
            footer={<>
              <SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />
              <SidebarMenuItem id="help" label="Help" icon="icon-help-circle-line" />
            </>} />
        )}
        header={(
          <AppShellHeader
            actions={<>
              <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => {
                toast(unread
                  ? { title: plural(unread, "new notification"), children: `${people[first.actor].name} ${first.verb} “${first.object}”.` }
                  : { title: "No new notifications", children: "You’re all caught up." });
                setUnread(0);
              }} />
              <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
                { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
                { type: "separator" },
                { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: `See you soon, ${me.name.split(" ")[0]}.` }) },
              ]} />
            </>}
            main={main}
          />
        )}
      >
        {children}
      </AppShell>
    </PreviewAppFrame>
  );
}

/* ───────────── Page loading ───────────── */

// The same columns as the invoice tables on the other pages: status last, widths for the cells that never wrap.
const invoiceColumns: TableColumn<Invoice>[] = [
  { id: "invoice", header: "Invoice", cell: (row) => <TableText bold caption={projectById(row.project)?.name ?? "New draft"}>{row.number}</TableText> },
  { id: "client", header: "Client", width: "170px", cell: (row) => <TableText>{row.client}</TableText> },
  { id: "due", header: "Due", width: "150px", cell: (row) => <TableText>{formatDate(row.due)}</TableText> },
  { id: "amount", header: "Amount", align: "right", width: "150px", cell: (row) => <TableText>{formatMoney(row.amount, true)}</TableText> },
  { id: "status", header: "Status", width: "120px", cell: (row) => <TableBadges><Badge background="subtle" theme={invoiceStatusTheme[row.status]}>{row.status}</Badge></TableBadges> },
];

// The same columns while loading: one placeholder per cell, shaped like its content.
const line = (width: "short" | "medium" | "long") => <SkeletonText lines={1} className={`px-skeleton-inline px-skeleton-${width}`} />;
const loadingColumns: TableColumn<number>[] = [
  { id: "invoice", header: "Invoice", cell: () => <TableText bold caption={line("long")}>{line("medium")}</TableText> },
  { id: "client", header: "Client", width: "170px", cell: () => <TableText>{line("medium")}</TableText> },
  { id: "due", header: "Due", width: "150px", cell: () => <TableText>{line("medium")}</TableText> },
  { id: "amount", header: "Amount", align: "right", width: "150px", cell: () => <TableText>{line("short")}</TableText> },
  { id: "status", header: "Status", width: "120px", cell: () => <SkeletonShape shape="pill" size="xs" /> },
];

/** The latest invoices, newest first. */
const recentInvoices = [...invoices].sort((a, b) => b.number.localeCompare(a.number));
/** What clients paid in Jul – Sep: the same figures as the studio's revenue charts. */
const paidInQ3 = studioMonths.slice(-3).reduce((total, month) => total + month.collected, 0);

function InvoicesPageExample() {
  const tableTitleId = useId();
  const { loading, reload } = useDemoLoad(1600);
  const [rows, setRows] = useState<Invoice[]>(recentInvoices);
  const [creating, setCreating] = useState(false);
  const due = rows.filter((row) => row.status === "Sent" || row.status === "Overdue");
  const overdue = rows.filter((row) => row.status === "Overdue");
  const sum = (list: Invoice[]) => formatMoney(list.reduce((total, row) => total + row.amount, 0), false);
  // Labels and icons are known up front; only the numbers wait for the data.
  const value = (text: string) => (loading ? <SkeletonHeading size="md" className="px-skeleton-inline" /> : text);
  // A new draft takes the next number after the newest invoice (INV-2026-0144, then 0145…).
  const addDraft = (client: string) => setRows((list) => {
    const number = `INV-2026-${String(Number(list[0].number.slice(-4)) + 1).padStart(4, "0")}`;
    return [{ id: number, number, client, project: "", amount: 0, status: "Draft", issued: TODAY, due: daysFromToday(30) }, ...list];
  });
  return (
    <StudioApp here="invoices"
      main={<PageHeader title="Invoices" description="Bill clients and see what they owe the studio."
        actions={<>
          <Button level="tertiary" startIcon="icon-refresh-cw-01-line" onClick={reload}>Refresh</Button>
          <Button level="primary" startIcon="icon-plus-line" onClick={() => setCreating(true)}>New invoice</Button>
        </>} />}>
      {/* Metrics → table: sections of a page (xl); a section heading keeps its table close (md). Beside the Sidebar every
          box takes its elevation (Shadow); the table lies on the page. */}
      <Stack gap="xl" aria-busy={loading}>
        <Grid minColumnWidth={240} gap="md">
          <MetricCard theme="shadow" size="md" icon="icon-clock-line" iconTheme="blue" label="Outstanding" value={value(sum(due))} />
          <MetricCard theme="shadow" size="md" icon="icon-alert-circle-line" iconTheme="red" label="Overdue" value={value(sum(overdue))} />
          <MetricCard theme="shadow" size="md" icon="icon-check-circle-line" iconTheme="green" label="Paid in Q3" value={value(formatMoney(paidInQ3, false))} />
        </Grid>
        <Stack gap="md">
          <Heading level={2} id={tableTitleId}>Recent invoices</Heading>
          {loading
            ? <Table aria-labelledby={tableTitleId} rows={[1, 2, 3, 4, 5]} getRowId={String} columns={loadingColumns} />
            : <Table aria-labelledby={tableTitleId} rows={rows} columns={invoiceColumns} />}
        </Stack>
      </Stack>
      <VisuallyHidden role="status">{loading ? "Loading invoices…" : `${plural(rows.length, "invoice")} loaded`}</VisuallyHidden>
      <DemoFieldDialog open={creating} onOpenChange={setCreating} title="New invoice" description="Start a draft; you can add line items next."
        field={{ kind: "name", label: "Client", placeholder: "Saola Outdoor" }} submitLabel="Create draft"
        confirm={(client) => `Draft invoice for ${client} created`} onSubmit={addDraft} />
    </StudioApp>
  );
}

/* ───────────── Images as they arrive ───────────── */

const moodboard = platformMedia.feed.slice(0, 6).map((photo, index) => ({
  ...photo,
  id: `photo-${index}`,
  addedBy: ["Gia Pham", "Emi Sato", "Linh Vo", "Gia Pham", "Alex Duong", "Emi Sato"][index],
  // Each picture arrives on its own; the grid never waits for the slowest one.
  delay: [500, 1400, 800, 2200, 1100, 1700][index],
}));

function MoodboardExample() {
  const titleId = useId();
  const [loaded, setLoaded] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  useEffect(() => {
    setLoaded([]);
    const timers = moodboard.map((photo) => window.setTimeout(() => setLoaded((list) => [...list, photo.id]), photo.delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [round]);
  const busy = loaded.length < moodboard.length;
  return (
    <Card theme="default" as="section" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack direction="row" gap="sm" justify="between" align="start">
          <Stack gap="xs">
            <Heading level={4} id={titleId} textStyle="Heading/Subheading">Moodboard</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">Brand refresh · Saola Outdoor</Text>
          </Stack>
          <IconButton appearance="flat" icon="icon-refresh-cw-01-line" aria-label="Refresh moodboard" onClick={() => setRound((n) => n + 1)} />
        </Stack>
        {/* Photo tiles are cards in a grid (md); each tile keeps its caption close (xs). */}
        <Grid minColumnWidth={104} gap="md" aria-busy={busy}>
          {moodboard.map((photo) => {
            const ready = loaded.includes(photo.id);
            return (
              <Stack key={photo.id} gap="xs">
                {/* Without a src, Image keeps its 4:3 frame and shows its own Skeleton. */}
                <Image src={ready ? photo.src : undefined} alt={photo.alt} ratio="4:3" loading="eager" />
                <Text textStyle="Body/Small/Regular" tone="base" truncate>
                  {ready ? photo.addedBy : <SkeletonText lines={1} className="px-skeleton-inline px-skeleton-medium" />}
                </Text>
              </Stack>
            );
          })}
        </Grid>
        <VisuallyHidden role="status">{busy ? "Loading pictures…" : `${plural(moodboard.length, "picture")} loaded`}</VisuallyHidden>
      </Stack>
    </Card>
  );
}

/* ───────────── Loading more ───────────── */

const olderActivity: Activity[] = [
  { id: "o1", actor: "khoa", verb: "merged", object: "Rewards API retry logic", at: daysFromToday(-9, 18, 20) },
  { id: "o2", actor: "linh", verb: "published", object: "Book Fair launch recap", at: daysFromToday(-10, 11, 45) },
  { id: "o3", actor: "finn", verb: "closed", object: "Spike: passkey sign-in on iOS", at: daysFromToday(-11, 16, 5) },
  { id: "o4", actor: "em", verb: "reported a bug in", object: "Android build 2.4.1", at: daysFromToday(-12, 9, 30) },
  { id: "o5", actor: "hana", verb: "signed", object: "Lumen Bank SOW v3", at: daysFromToday(-13, 14, 0) },
  { id: "o6", actor: "gia", verb: "uploaded", object: "Saola moodboard v1", at: daysFromToday(-14, 10, 10) },
  { id: "o7", actor: "ava", verb: "shared findings from", object: "Transfers usability round 1", at: daysFromToday(-15, 17, 25) },
  { id: "o8", actor: "duy", verb: "moved the kickoff of", object: "Brand refresh to Oct 12", at: daysFromToday(-16, 9, 50) },
  { id: "o9", actor: "chi", verb: "commented on", object: "Rewards checkout – design review", at: daysFromToday(-17, 15, 5) },
  { id: "o10", actor: "mai", verb: "marked as paid", object: "INV-2026-0138", at: daysFromToday(-18, 11, 0) },
  { id: "o11", actor: "bao", verb: "released", object: "Loyalty app 2.4.0 to beta", at: daysFromToday(-19, 18, 40) },
  { id: "o12", actor: "emi", verb: "uploaded", object: "Book Fair launch video", at: daysFromToday(-20, 17, 45) },
  { id: "o13", actor: "minhAnh", verb: "published", object: "Q4 holiday calendar", at: daysFromToday(-22, 10, 15) },
  { id: "o14", actor: "alex", verb: "approved", object: "Account overview wireframes", at: daysFromToday(-23, 16, 30) },
  { id: "o15", actor: "khoa", verb: "deployed", object: "Tracking events API to staging", at: daysFromToday(-25, 19, 10) },
  { id: "o16", actor: "linh", verb: "drafted", object: "Exhibitor directory copy", at: daysFromToday(-26, 9, 20) },
  { id: "o17", actor: "finn", verb: "reviewed", object: "Top Navigation scroll fold", at: daysFromToday(-27, 14, 55) },
  { id: "o18", actor: "hana", verb: "scheduled", object: "Lumen Bank quarterly review", at: daysFromToday(-29, 11, 30) },
];
const allActivity = [...activity, ...olderActivity];
/** A caption stays within two lines; the full text is in its title. */
const clamp = (text: string) => <Text as="span" textStyle="Body/Small/Regular" tone="inherit" truncate={2} title={text}>{text}</Text>;
const PAGE_SIZE = 8;

function LoadingMoreExample() {
  const titleId = useId();
  const endRef = useRef<HTMLParagraphElement>(null);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const more = Math.min(PAGE_SIZE, allActivity.length - shown);
  const showOlder = () => {
    if (loadingMore) return;
    setLoadingMore(true);
    setAnnouncement("Loading older activity…");
    window.setTimeout(() => {
      setShown((n) => n + more);
      setLoadingMore(false);
      setAnnouncement(`${plural(more, "more update")} loaded`);
      // The button leaves with the last page: focus moves to the end of the list, not to <body>.
      if (shown + more >= allActivity.length) window.requestAnimationFrame(() => endRef.current?.focus());
    }, 1200);
  };
  return (
    // A ListBox: the title in its Header-Slot, the rows in its Body-Slot, Show older activity (or the end-of-list line)
    // in its Footer-Slot.
    <ListBox as="section" aria-labelledby={titleId}
      header={<Heading level={4} id={titleId} textStyle="Heading/Subheading">Activity</Heading>}
      footer={shown < allActivity.length
        ? <Button level="tertiary" onClick={showOlder}>Show older activity</Button>
        : <Text ref={endRef} tabIndex={-1} textStyle="Body/Small/Regular" tone="base">That’s everything from the last 30 days.</Text>}>
      <List aria-labelledby={titleId} aria-busy={loadingMore}>
        {allActivity.slice(0, shown).map((item) => (
          <ListItem key={item.id} leading={personAvatar(item.actor)} title={people[item.actor].name}
            caption={clamp(`${item.verb} ${item.object} · ${formatRelative(item.at)}`)} />
        ))}
        {/* New rows arrive at the end: the rows already read stay where they are. */}
        {loadingMore ? Array.from({ length: more }, (_, index) => (
          <ListItem key={`loading-${index}`} aria-hidden="true" leading={<SkeletonShape shape="round" size="md" />}
            title={line("medium")} caption={<SkeletonText lines={1} className="px-skeleton-inline px-skeleton-long" />} />
        )) : null}
      </List>
      {/* Out of the flow (absolutely positioned), so it adds no gap under the rows. */}
      <VisuallyHidden role="status">{announcement}</VisuallyHidden>
    </ListBox>
  );
}

/* ───────────── Loading failed ───────────── */

type ProjectFile = { id: string; name: string; bytes: number; at: Date };
const projectFiles: ProjectFile[] = [
  { id: "sow", name: "Lumen Bank SOW v3.pdf", bytes: 420_000, at: daysFromToday(0, 9, 12) },
  { id: "plan", name: "Usability plan – transfers.pdf", bytes: 1_240_000, at: daysFromToday(-1, 16, 5) },
  { id: "wires", name: "Account overview wireframes.fig", bytes: 12_800_000, at: daysFromToday(-2, 11, 40) },
];

function LoadingFailedExample() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  // The first request times out; Try again succeeds.
  const [phase, setPhase] = useState<"loading" | "failed" | "retrying" | "ready">("loading");
  useEffect(() => {
    if (phase !== "loading" && phase !== "retrying") return undefined;
    const timer = window.setTimeout(() => setPhase(phase === "loading" ? "failed" : "ready"), phase === "loading" ? 1800 : 1200);
    return () => window.clearTimeout(timer);
  }, [phase]);
  const retry = () => { setPhase("retrying"); titleRef.current?.focus(); };
  const busy = phase === "loading" || phase === "retrying";
  return (
    // A ListBox: the title and project in its Header-Slot; the rows, their placeholders or the failure message in its
    // Body-Slot.
    <ListBox as="section" aria-labelledby={titleId}
      header={<Stack gap="2xs">
        <Heading ref={titleRef} tabIndex={-1} level={4} id={titleId} textStyle="Heading/Subheading">Files</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">Online banking redesign · Lumen Bank</Text>
      </Stack>}>
      {phase === "failed" ? (
        <InlineMessage theme="negative" title="Files didn’t load" action={{ label: "Try again", onClick: retry }}>
          The file service took too long to answer.
        </InlineMessage>
      ) : (
        <List aria-labelledby={titleId} aria-busy={busy}>
          {busy
            ? projectFiles.map((file) => (
              <ListItem key={file.id} aria-hidden="true" leading={<SkeletonShape shape="square" size="md" />}
                title={line("long")} caption={line("medium")} />
            ))
            : projectFiles.map((file) => (
              <ListItem key={file.id} leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
                title={file.name} caption={`${formatBytes(file.bytes)} · ${formatRelative(file.at)}`} />
            ))}
        </List>
      )}
      {/* Out of the flow (absolutely positioned), so it adds no gap under the rows. */}
      <VisuallyHidden role="status">{busy ? "Loading files…" : phase === "ready" ? `${plural(projectFiles.length, "file")} loaded` : ""}</VisuallyHidden>
    </ListBox>
  );
}

/* ───────────── Mobile: detail screen ───────────── */

/** The studio's open tasks, soonest due first: the open ones from data.ts plus a few more from this week's boards. */
const moreTasks: Task[] = [
  { id: "t11", key: "PHIN-226", title: "Plan the Android beta with Phin & Co", project: "phin-loyalty", assignee: "duy", status: "To do", priority: "Medium", due: daysFromToday(4), comments: 1 },
  { id: "t12", key: "PHIN-228", title: "Fix points rounding on refunds", project: "phin-loyalty", assignee: "bao", status: "In progress", priority: "High", due: daysFromToday(1), comments: 4 },
  { id: "t13", key: "LUM-097", title: "Prototype the daily limit change", project: "lumen-banking", assignee: "alex", status: "In progress", priority: "High", due: daysFromToday(4), comments: 3 },
  { id: "t14", key: "LUM-099", title: "Review the SOW v3 change request", project: "lumen-banking", assignee: "hana", status: "In review", priority: "Medium", due: daysFromToday(2), comments: 2 },
  { id: "t15", key: "MEK-034", title: "Draft the tracking events API", project: "mekong-tracking", assignee: "khoa", status: "To do", priority: "Medium", due: daysFromToday(8), comments: 0 },
  { id: "t16", key: "ZEN-408", title: "Ship the scroll fold for Top Navigation", project: "zen-ds", assignee: "finn", status: "In progress", priority: "High", due: daysFromToday(3), comments: 7 },
  { id: "t17", key: "SAO-006", title: "Shortlist photographers for the outdoor shoot", project: "saola-brand", assignee: "linh", status: "To do", priority: "Low", due: daysFromToday(10), comments: 0 },
];
const openTasks = [...tasks, ...moreTasks].filter((task) => task.status !== "Done").sort((a, b) => a.due.getTime() - b.due.getTime());
const taskNotes: Record<string, string> = {
  t1: "Show earned and spent points by month, with a filter for each store.",
  t2: "Apply points at checkout through the rewards API, and fall back to full price when it does not answer in 3 seconds.",
  t3: "Run the regression suite on the Android 2.4.1 build before it goes to the Phin & Co beta group.",
  t4: "Five sessions with Lumen Bank customers who send money abroad at least once a month.",
  t5: "Check contrast, focus order and screen reader names on the account overview before the Lumen Bank review on Friday.",
  t8: "Usage, Do and Don't for the Metric card, with the trend and icon rules.",
  t9: "List every state a parcel can be held in at customs, and what the customer sees for each one.",
  t10: "Twelve pictures for the outdoor range: tents, trail shoes and the river kayaks, shot in morning light.",
  t11: "Agree the beta group, the feedback form and the release date for Android with Phin & Co's product owner.",
  t12: "A refund of a partly paid order gives back 1 point too many. Round the points down, as the receipt does.",
  t13: "A two-step flow to raise the daily limit for one payment, with the bank's confirmation step at the end.",
  t14: "Lumen Bank asked for two more usability rounds. Check the hours and the price before it goes to the client.",
  t15: "Events for picked up, in transit, held at customs and delivered, with the fields the driver app sends.",
  t16: "The large title and the Search bar slide under the bar as the list scrolls; settle open or closed when it stops.",
  t17: "Five photographers who shoot outdoor gear, with day rates and two sample shoots each.",
};

/** The roots of the studio's phone app, in its bottom bar: a selected root shows its solid icon. */
const phoneRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "inbox", label: "Inbox", icon: "icon-message-chat-circle-line", selectedIcon: "icon-message-chat-circle-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
/** The open tasks by when they are due, as the Tasks root groups them. */
const endOfWeek = daysFromToday(4, 23, 59);
const taskGroups = [
  { id: "week", title: "Due this week", rows: openTasks.filter((task) => task.due <= endOfWeek) },
  { id: "later", title: "Later", rows: openTasks.filter((task) => task.due > endOfWeek) },
];

function TaskDetailPhoneExample() {
  const { toast } = useToast();
  const notHere = useNotHere();
  const screen = usePhoneScreen();
  const groupId = useId();
  const screenRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!loading) return undefined;
    const timer = window.setTimeout(() => setLoading(false), 1400);
    return () => window.clearTimeout(timer);
  }, [loading]);
  const task = openTasks.find((t) => t.id === openId);
  const statusOf = (t: Task): Task["status"] => (done.includes(t.id) ? "Done" : t.status);

  // Each screen is its own PlatformPhone (key): the task opens at the top and the bar measures the fold again.
  if (!task) {
    const dueThisWeek = taskGroups[0].rows.filter((t) => !done.includes(t.id)).length;
    return (
      // The Tasks root: the large title folds into the bar as the groups scroll, the app's roots sit in the bottom bar.
      // The bar casts a shadow, so each group's block takes the same Shadow elevation.
      <PlatformPhone key="tasks" label="Tasks" screenRef={screenRef}>
        <AppShell
          topNavigation={<TopNavigation title="Tasks" largeTitle="Tasks" largeTitleSubheading={`${plural(dueThisWeek, "task")} due this week`} scrollRef={screenRef} />}
          bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={phoneRoots} value="tasks"
            onValueChange={(id) => { if (id !== "tasks") notHere(phoneRoots.find((item) => item.id === id)?.label ?? id); }} />}
        >
          {screen.anchor}
          {taskGroups.map((group) => (
            <Stack key={group.id} as="section" gap="xs" aria-labelledby={`${groupId}-${group.id}`}>
              {/* The kicker lines up with the row text inside the block (paddingX lg, 20). */}
              <Box paddingX="lg"><Heading level={2} id={`${groupId}-${group.id}`} textStyle="Body/Small/Bold" tone="light">{group.title}</Heading></Box>
              <ListBox theme="shadow">
                <List aria-labelledby={`${groupId}-${group.id}`}>
                  {group.rows.map((t) => (
                    <ListItem key={t.id} data-task={t.id} leading={personAvatar(t.assignee)} title={t.title} titleLines={2} caption={`${t.key} · ${done.includes(t.id) ? "Done" : formatDue(t.due)}`}
                      onClick={() => screen.go(".zen-top-nav__action", () => { setOpenId(t.id); setLoading(true); })} />
                  ))}
                </List>
              </ListBox>
            </Stack>
          ))}
        </AppShell>
      </PlatformPhone>
    );
  }

  const skeleton = line("medium");
  const status = statusOf(task);
  const finished = status === "Done";
  return (
    // A pushed screen: the compact bar with Back and the task's key, its one action in the Action bar, no bottom bar.
    <PlatformPhone key={task.id} label="Tasks" screenRef={screenRef}>
      <AppShell
        topNavigation={<TopNavigation type="compact-alt" title={task.key} scrollRef={screenRef}
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go(`[data-task="${task.id}"] .zen-list-item__wrapper`, () => setOpenId(null)) }} />}
        // The action waits for the task as well: it is there at once (nothing jumps) and works once the task has loaded.
        actionBar={<ActionBar primaryAction={finished
          ? { label: "Reopen task", onClick: () => setDone((list) => list.filter((id) => id !== task.id)) }
          : { label: "Mark as done", disabled: loading, onClick: () => {
            setDone((list) => [...list, task.id]);
            toast({ title: "Task completed", children: task.title, action: { label: "Undo", onClick: () => setDone((list) => list.filter((id) => id !== task.id)) } });
          } }} />}
      >
        {screen.anchor}
        {/* The title came with the row, so it shows at once; the rest waits for the task. The Body pads the screen and
            spaces the title, the fields and the description Layout-Mobile/Section-Gap apart. */}
        <Stack gap="xs" aria-busy={loading}>
          <Heading level={2} textStyle="Heading/4">{task.title}</Heading>
          {loading ? <SkeletonShape shape="pill" size="xs" /> : <BadgeStatus status={taskStep[status]}>{status}</BadgeStatus>}
        </Stack>
        <Card theme="default" aria-busy={loading}>
          <DescriptionList divider items={[
            { term: "Project", description: loading ? skeleton : projectById(task.project).name },
            { term: "Assignee", description: loading ? skeleton : people[task.assignee].name },
            { term: "Due", description: loading ? skeleton : formatDue(task.due) },
            { term: "Priority", description: loading ? skeleton : <Badge background="subtle" theme={priorityTheme[task.priority]}>{task.priority}</Badge> },
          ]} />
        </Card>
        <Stack gap="xs" aria-busy={loading}>
          <Heading level={3} textStyle="Body/Small/Bold" tone="light">Description</Heading>
          {loading ? <SkeletonText lines={3} /> : <Text>{taskNotes[task.id]}</Text>}
        </Stack>
        <VisuallyHidden role="status">{loading ? "Loading task…" : "Task loaded"}</VisuallyHidden>
      </AppShell>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Page loading",
    wide: true,
    screen: true,
    description: "The studio's Invoices page while its data loads. The shell, the Sidebar, the PageHeader and every label render at once; only the data waits. Metric values and table cells hold placeholders shaped like their content, and the real numbers and rows replace them in one step. Refresh loads again.",
    render: () => <InvoicesPageExample />,
    code: `const value = (text: string) => (loading ? <SkeletonHeading size="md" className="skeleton-inline" /> : text);

<AppShell
  sidebar={<Sidebar logo={logo} sections={studioNav} selectedId="invoices" onItemClick={navigate} />}
  header={
    <AppShellHeader
      actions={<>{notifications}{account}</>}
      main={<PageHeader title="Invoices" description="Bill clients and see what they owe the studio." actions={<>
        <Button level="tertiary" startIcon="icon-refresh-cw-01-line" onClick={reload}>Refresh</Button>
        <Button level="primary" startIcon="icon-plus-line" onClick={() => setCreating(true)}>New invoice</Button>
      </>} />}
    />
  }
>
  <Stack gap="xl" aria-busy={loading}>
    <Grid minColumnWidth={240} gap="md">
      <MetricCard theme="shadow" size="md" icon="icon-clock-line" iconTheme="blue" label="Outstanding" value={value(outstanding)} />
      …
    </Grid>
    <Stack gap="md">
      <Heading level={2} id={tableTitleId}>Recent invoices</Heading>
      {loading
        ? <Table aria-labelledby={tableTitleId} rows={[1, 2, 3, 4, 5]} getRowId={String} columns={loadingColumns} />
        : <Table aria-labelledby={tableTitleId} rows={rows} columns={columns} />}
    </Stack>
  </Stack>
  <VisuallyHidden role="status">{loading ? "Loading invoices…" : \`\${plural(rows.length, "invoice")} loaded\`}</VisuallyHidden>
</AppShell>

// loadingColumns: the same headers, one placeholder per cell
{ id: "status", header: "Status", cell: () => <SkeletonShape shape="pill" size="xs" /> },
{ id: "amount", header: "Amount", align: "right", cell: () => <TableText><SkeletonText lines={1} className="skeleton-inline" /></TableText> },

/* .skeleton-inline { display: inline-flex; vertical-align: middle; width: 11ch; } keeps the text's line height */`,
  },
  {
    title: "Pictures as they arrive",
    description: "Each picture shows as soon as it loads instead of waiting for the slowest. Image keeps its 4:3 frame and its own Skeleton until then, and the caption holds a one-line placeholder.",
    render: () => <MoodboardExample />,
    code: `<Grid minColumnWidth={104} gap="md" aria-busy={busy}>
  {photos.map((photo) => {
    const ready = loaded.includes(photo.id);
    return (
      <Stack key={photo.id} gap="xs">
        <Image src={ready ? photo.src : undefined} alt={photo.alt} ratio="4:3" />
        <Text textStyle="Body/Small/Regular" tone="base" truncate>
          {ready ? photo.addedBy : <SkeletonText lines={1} className="skeleton-inline" />}
        </Text>
      </Stack>
    );
  })}
</Grid>
<VisuallyHidden role="status">{busy ? "Loading pictures…" : \`\${plural(photos.length, "picture")} loaded\`}</VisuallyHidden>`,
  },
  {
    title: "Loading failed",
    description: "A skeleton never waits forever: when the request times out, a Negative Inline Message takes its place with Try again. Retrying shows the placeholders again, focus goes to the card title, and the files arrive.",
    render: () => <LoadingFailedExample />,
    code: `<ListBox as="section" aria-labelledby={titleId}
  header={<Stack gap="2xs">
    <Heading ref={titleRef} tabIndex={-1} level={4} id={titleId} textStyle="Heading/Subheading">Files</Heading>
    <Text textStyle="Body/Small/Regular" tone="base">Online banking redesign · Lumen Bank</Text>
  </Stack>}>
  {phase === "failed" ? (
    <InlineMessage theme="negative" title="Files didn’t load" action={{ label: "Try again", onClick: retry }}>
      The file service took too long to answer.
    </InlineMessage>
  ) : (
    <List aria-labelledby={titleId} aria-busy={busy}>
      {busy
        ? files.map((file) => <ListItem key={file.id} aria-hidden="true" leading={<SkeletonShape shape="square" size="md" />}
            title={<SkeletonText lines={1} className="skeleton-inline" />} caption={<SkeletonText lines={1} className="skeleton-inline" />} />)
        : files.map((file) => <ListItem key={file.id} leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
            title={file.name} caption={\`\${formatBytes(file.bytes)} · \${formatRelative(file.at)}\`} />)}
    </List>
  )}
</ListBox>`,
  },
  {
    title: "Loading more",
    description: "Show older activity adds placeholder rows at the end of the list, so the rows already read stay put. When the last page arrives the button goes and focus moves to the end-of-list line.",
    render: () => <LoadingMoreExample />,
    code: `<ListBox as="section" aria-labelledby={titleId}
  header={<Heading level={4} id={titleId} textStyle="Heading/Subheading">Activity</Heading>}
  footer={hasMore
    ? <Button level="tertiary" onClick={showOlder}>Show older activity</Button>
    : <Text ref={endRef} tabIndex={-1} textStyle="Body/Small/Regular" tone="base">That’s everything from the last 30 days.</Text>}>
  <List aria-labelledby={titleId} aria-busy={loadingMore}>
    {items.map((item) => <ListItem key={item.id} leading={avatar(item.actor)} title={item.name} caption={item.caption} />)}
    {loadingMore ? Array.from({ length: more }, (_, i) => (
      <ListItem key={i} aria-hidden="true" leading={<SkeletonShape shape="round" size="md" />}
        title={<SkeletonText lines={1} className="skeleton-inline" />}
        caption={<SkeletonText lines={1} className="skeleton-inline" />} />
    )) : null}
  </List>
</ListBox>`,
  },
  {
    title: "Detail screen",
    description: "In the studio's phone app a task opens from the Tasks root at once, with the title it already had; its status, fields and description load behind placeholders. The field labels and the Action bar are there from the start, so only the values change, and Mark as done waits until the task has loaded. Back returns to the row it came from.",
    render: () => <TaskDetailPhoneExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

// One PlatformPhone per screen (key): the task opens at the top; the bar follows the scroll.
<PlatformPhone key={task.id} screenRef={screenRef}>
  <AppShell
    topNavigation={<TopNavigation type="compact-alt" title={task.key} scrollRef={screenRef}
      leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToList }} />}
    actionBar={<ActionBar primaryAction={{ label: "Mark as done", disabled: loading, onClick: markDone }} />}
  >
    <Stack gap="xs" aria-busy={loading}>
      <Heading level={2} textStyle="Heading/4">{task.title}</Heading>
      {loading ? <SkeletonShape shape="pill" size="xs" /> : <Badge background="subtle" theme={statusTheme}>{task.status}</Badge>}
    </Stack>
    <Card theme="default" aria-busy={loading}>
      <DescriptionList divider items={[
        { term: "Project", description: loading ? <SkeletonText lines={1} className="skeleton-inline" /> : project.name },
        { term: "Due", description: loading ? <SkeletonText lines={1} className="skeleton-inline" /> : formatDue(task.due) },
      ]} />
    </Card>
    {loading ? <SkeletonText lines={3} /> : <Text>{task.notes}</Text>}
    <VisuallyHidden role="status">{loading ? "Loading task…" : "Task loaded"}</VisuallyHidden>
  </AppShell>
</PlatformPhone>`,
  },
]);
