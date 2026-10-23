/* Tabs examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Alex Duong works through the Đìzai Studio
   workspace: the sections of a project page, a draft invoice, the work waiting on his dashboard, a colleague's profile on
   his phone and a client record in a narrow column. Tabs switch sections of one thing; filters stay Chips. The screens
   sit in the studio's AppShell: the project page's tabs in the header's Sections row, the workspace's Large tabs in the
   top-bar pattern's top row, the profile's in the phone's Top Navigation control bar. */
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader } from "../../../components/AppShell";
import { Avatar, AvatarStack } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { BadgeStatus } from "../../../components/BadgeStatus";
import { BottomNavigation, type BottomNavigationItem } from "../../../components/BottomNavigation";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { Divider } from "../../../components/Divider";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import type { IconName } from "../../../components/Icon";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { MetricCard } from "../../../components/MetricWidget";
import { PageHeader } from "../../../components/PageHeader";
import { ProgressBar } from "../../../components/Progress";
import { Sidebar, SidebarMenuItem, type SidebarItem } from "../../../components/Sidebar";
import { SkeletonShape, SkeletonText } from "../../../components/Skeleton";
import { Table, TableMedia, TableText, type TableColumn } from "../../../components/Table";
import { TabItem, TabPanel, Tabs } from "../../../components/Tabs";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import {
  TODAY, activity, daysFromToday, files, formatBytes, formatDate, formatDue, formatMoney, formatRange, formatRelative, initials, invoiceStatusTheme, invoices,
  leaveRequests, leaveStatusTheme, me, people, peopleList, projectById, projectProgress, projectStep, projects, studio, tasks, taskStep,
  type InvoiceStatus, type Person, type PersonId, type Project, type StudioFile, type Task,
} from "../data";
import type { PlatformPage } from "../../PlatformExamples";
import { PreviewAppFrame, StudioLogo, StudioMark } from "../../PlatformFrames";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";

export const page: PlatformPage = "tabs";

/** A person as an Avatar: their photo, or initials on their steady theme. */
const avatar = (p: Person, size: "xsmall" | "medium" = "medium") => p.photo
  ? <Avatar size={size} theme="photo" src={p.photo} alt="" />
  : <Avatar size={size} theme={p.theme} alt="">{initials(p.name)}</Avatar>;
/** One idPrefix per rendered example, so tab and panel ids stay unique when an example renders twice. */
const usePrefix = (name: string) => `${name}-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

// ——— The studio app's chrome ——————————————————————————————————————————————————————————————————————————
/** The account menu at the end of the header's top row. */
function AccountMenu({ onProfile }: { onProfile?: () => void }) {
  const { toast } = useToast();
  return (
    <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
      { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: onProfile ?? (() => toast({ title: me.name, children: `${me.role} · ${me.location}` })) },
      { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
    ]} />
  );
}

/** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
function useNotHere() {
  const { toast } = useToast();
  return (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the tabs." });
}

// ——— 1. Project sections ————————————————————————————————————————————————————————————————————————————
const lumen = projectById("lumen-banking");
const lumenFiles: StudioFile[] = [
  { id: "lf1", name: "Lumen Bank SOW v3.pdf", bytes: 412_000, owner: "hana", project: lumen.id, updated: daysFromToday(0, 9, 12) },
  files.find((f) => f.id === "f2")!,
  { id: "lf2", name: "Transfers journey map.fig", bytes: 24_600_000, owner: "alex", project: lumen.id, updated: daysFromToday(-3, 15, 10) },
];
const lumenActivity = [
  { id: "la1", actor: "hana" as PersonId, text: "Shared Lumen Bank SOW v3", at: daysFromToday(0, 9, 12) },
  { id: "la2", actor: "ava" as PersonId, text: "Uploaded Usability plan – transfers.pdf", at: daysFromToday(-1, 16, 5) },
  { id: "la3", actor: "finn" as PersonId, text: "Moved Spike: passkey sign-in on iOS to Done", at: daysFromToday(-2, 11, 40) },
  { id: "la4", actor: "alex" as PersonId, text: "Created Audit the account overview for WCAG 2.2", at: daysFromToday(-6, 14, 0) },
];
const taskColumns: TableColumn<Task>[] = [
  { id: "task", header: "Task", cell: (t) => <TableText bold caption={t.key}>{t.title}</TableText> },
  { id: "assignee", header: "Assignee", width: "180px", cell: (t) => <TableMedia bold={false} media={avatar(people[t.assignee], "xsmall")}>{people[t.assignee].name}</TableMedia> },
  { id: "status", header: "Status", width: "140px", cell: (t) => <BadgeStatus status={taskStep[t.status]}>{t.status}</BadgeStatus> },
  { id: "due", header: "Due", width: "140px", cell: (t) => <TableText>{formatDate(t.due)}</TableText> },
];

function ProjectSectionsExample() {
  const prefix = usePrefix("project");
  const { toast } = useToast();
  const notHere = useNotHere();
  const [unread, setUnread] = useState(2);
  const [tab, setTab] = useState("overview");
  const [taskList, setTaskList] = useState(() => tasks.filter((t) => t.project === lumen.id));
  const [dialog, setDialog] = useState<"share" | "task" | null>(null);
  // Activity loads the first time its tab opens; the panel shows a skeleton meanwhile.
  const [activityLoaded, setActivityLoaded] = useState(false);
  useEffect(() => {
    if (tab !== "activity" || activityLoaded) return undefined;
    const timer = window.setTimeout(() => setActivityLoaded(true), 900);
    return () => window.clearTimeout(timer);
  }, [tab, activityLoaded]);

  const open = taskList.filter((t) => t.status !== "Done").length;
  const addTask = (title: string) => {
    setTaskList((list) => [...list, { id: `new-${list.length}`, key: `LUM-${96 + list.length}`, title, project: lumen.id, assignee: "alex", status: "To do", priority: "Medium", due: daysFromToday(7), comments: 0 }]);
    setTab("tasks");
  };

  const tabs = (
    <Tabs idPrefix={prefix} aria-label="Project sections" value={tab} onValueChange={setTab} items={[
      { id: "overview", label: "Overview", icon: "icon-layout-grid-01-line" },
      // Counts only while there is something to count: a badge of 0 is hidden.
      { id: "tasks", label: "Tasks", icon: "icon-check-square-line", badge: open || undefined },
      { id: "files", label: "Files", icon: "icon-folder-line", badge: lumenFiles.length },
      { id: "activity", label: "Activity", icon: "icon-activity-line" },
    ]} />
  );

  return (
    <PreviewAppFrame height={{ min: 640, max: 820 }}>
      {/* The project page of the studio app: the trail and the utilities in the header's top row, the PageHeader in its
          Main row and the section tabs in its Sections row, so they stay with the title while the panel scrolls. */}
      <AppShell
        sidebar={(
          <Sidebar logo={<StudioLogo src={studio.logo} name={studio.name} />} logoCollapsed={<StudioMark src={studio.logo} name={studio.name} />}
            selectedId="projects" onItemClick={(item: SidebarItem) => { if (item.id !== "projects") notHere(item.label); }}
            sections={[{ items: [
              { id: "home", label: "Home", icon: "icon-home-03-line" },
              { id: "projects", label: "Projects", icon: "icon-folder-line" },
              { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
              { id: "people", label: "People", icon: "icon-users-line" },
            ] }]}
            footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
        )}
        header={(
          <AppShellHeader
            leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: lumen.id, label: lumen.name }]}
              onNavigate={(_, event) => { event.preventDefault(); notHere("Projects"); }} />}
            actions={<>
              <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => {
                setUnread(0);
                toast({ title: unread ? `${plural(unread, "new update")} on ${lumen.name}` : "You're all caught up", children: `${people[lumenActivity[0].actor].name}: ${lumenActivity[0].text}` });
              }} />
              <AccountMenu />
            </>}
            main={(
              <PageHeader
                eyebrow={lumen.client}
                title={lumen.name}
                meta={<BadgeStatus status={projectStep[lumen.status]} progress={projectProgress(lumen)}>{lumen.status}</BadgeStatus>}
                description={`${formatRange(lumen.start, lumen.due)} · Led by ${people[lumen.lead].name}`}
                actions={<><Button level="tertiary" onClick={() => setDialog("share")}>Share</Button><Button level="primary" onClick={() => setDialog("task")}>New task</Button></>}
              />
            )}
            sections={tabs}
          />
        )}
      >
        <TabPanel idPrefix={prefix} id="overview" hidden={tab !== "overview"}>
          <Stack gap="md">
            {/* As many 200px columns as fit, stretched to fill the row. Beside the default Sidebar every Surface takes its
                elevation: Shadow/Bottom/Level-1, no border (usage rules §16). */}
            <Grid columns="repeat(auto-fit, minmax(min(100%, 200px), 1fr))" gap="md">
              <MetricCard label="Progress" value={`${lumen.progress}%`} icon="icon-target-04-line" iconTheme="blue" theme="shadow" />
              <MetricCard label="Budget used" value={formatMoney(lumen.spent)} icon="icon-coins-line" iconTheme="green" theme="shadow" />
              <MetricCard label="Open tasks" value={`${open}`} icon="icon-check-square-line" iconTheme="orange" theme="shadow" />
            </Grid>
            {/* The project's facts beside its latest files: side content stops at xl (1440px) on a full-width page. */}
            <Grid columns="minmax(0, 1fr) minmax(0, 1fr)" stackBelow={720} gap="md" align="start" maxWidth={1440}>
              <Card theme="shadow" as="section" aria-labelledby={`${prefix}-facts`}>
                <Stack gap="md">
                  <Heading level={2} id={`${prefix}-facts`} textStyle="Heading/Subheading">Details</Heading>
                  <DescriptionList items={[
                    { term: "Account director", description: people.hana.name },
                    { term: "Budget", description: formatMoney(lumen.budget) },
                    { term: "Team", description: <AvatarStack size="xsmall" items={lumen.members.map((id) => people[id].photo ? { src: people[id].photo, alt: people[id].name } : { theme: people[id].theme, alt: people[id].name, children: initials(people[id].name) })} /> },
                    { term: "Due", description: formatDate(lumen.due) },
                  ]} />
                </Stack>
              </Card>
              <ListBox theme="shadow" as="section" aria-labelledby={`${prefix}-next`}
                header={<Heading level={2} id={`${prefix}-next`} textStyle="Heading/Subheading">Due next</Heading>}>
                <List aria-labelledby={`${prefix}-next`}>
                  {taskList.filter((t) => t.status !== "Done").sort((a, b) => a.due.getTime() - b.due.getTime()).slice(0, 3).map((t) => (
                    <ListItem key={t.id} title={t.title} titleLines={2} caption={`${t.key} · ${formatDue(t.due)}`} leading={avatar(people[t.assignee])}
                      onClick={() => setTab("tasks")} />
                  ))}
                </List>
              </ListBox>
            </Grid>
          </Stack>
        </TabPanel>

        {/* The task table is the section's content, so it lies on the page (no Card). */}
        <TabPanel idPrefix={prefix} id="tasks" hidden={tab !== "tasks"}>
          <Table aria-label="Tasks" rows={taskList} columns={taskColumns} />
        </TabPanel>

        {/* The file and activity rows sit in a ListBox: a box made only of List-Items, at the Sidebar's elevation. */}
        <TabPanel idPrefix={prefix} id="files" hidden={tab !== "files"}>
          <ListBox theme="shadow">
            <List aria-label="Files">
              {lumenFiles.map((f) => (
                <ListItem key={f.id} title={f.name} caption={`${formatBytes(f.bytes)} · ${people[f.owner].name} · ${formatRelative(f.updated)}`}
                  leading={<FileIcon format={fileIconFormatOf(f.name)} size="xl" />}
                  onClick={() => toast({ title: `Opening ${f.name}`, children: `${formatBytes(f.bytes)} · ${people[f.owner].name}` })} />
              ))}
            </List>
          </ListBox>
        </TabPanel>

        <TabPanel idPrefix={prefix} id="activity" hidden={tab !== "activity"}>
          <ListBox theme="shadow">
            {activityLoaded ? (
              <List aria-label="Activity">
                {lumenActivity.map((a) => <ListItem key={a.id} title={people[a.actor].name} caption={`${a.text} · ${formatRelative(a.at)}`} leading={avatar(people[a.actor])} />)}
              </List>
            ) : (
              // Placeholder rows are List-Items too (same padding, Avatar Medium, row gap), so nothing jumps on load.
              <List aria-busy="true" aria-label="Loading activity">
                {[0, 1, 2].map((row) => (
                  <ListItem key={row} aria-hidden="true" title="" leading={<SkeletonShape shape="round" size="md" />}>
                    <SkeletonText lines={2} />
                  </ListItem>
                ))}
              </List>
            )}
          </ListBox>
        </TabPanel>
      </AppShell>

      <DemoFieldDialog open={dialog === "share"} onOpenChange={(next) => setDialog(next ? "share" : null)} title={`Share ${lumen.name}`}
        field={{ kind: "email", label: "Email address", placeholder: "thu@lumenbank.com" }} submitLabel="Send invite" confirm={(email) => `Invite sent to ${email}`} />
      <DemoFieldDialog open={dialog === "task"} onOpenChange={(next) => setDialog(next ? "task" : null)} title="New task"
        field={{ kind: "name", label: "Task name", placeholder: "Review the transfer limits copy" }} submitLabel="Add task" confirm={() => "Task added"} onSubmit={addTask} />
    </PreviewAppFrame>
  );
}

// ——— 2. Draft invoice ————————————————————————————————————————————————————————————————————————————————
const draftInvoice = { number: "INV-2026-0143", client: "Saola Outdoor", project: projectById("saola-brand").name, amount: 12000, issued: daysFromToday(0), due: daysFromToday(30) };
type InvoiceEvent = { id: string; title: string; at: Date };

function DraftInvoiceExample() {
  const prefix = usePrefix("invoice");
  const { toast } = useToast();
  const [status, setStatus] = useState<InvoiceStatus>("Draft");
  const [tab, setTab] = useState("details");
  const [events, setEvents] = useState<InvoiceEvent[]>([{ id: "created", title: `Created by ${people.alex.name}`, at: daysFromToday(0, 9, 5) }]);
  const draft = status === "Draft";

  const log = (id: string, title: string) => setEvents((list) => [{ id, title, at: TODAY }, ...list.filter((e) => e.id !== id)]);
  const unlog = (id: string) => setEvents((list) => list.filter((e) => e.id !== id));
  const send = () => {
    setStatus("Sent");
    log("sent", `Sent to ${draftInvoice.client}`);
    toast({ title: "Invoice sent", action: { label: "Undo", onClick: () => { setStatus("Draft"); unlog("sent"); setTab((t) => (t === "payments" ? "details" : t)); } } });
  };
  const recordPayment = () => {
    setStatus("Paid");
    log("paid", `Payment of ${formatMoney(draftInvoice.amount, true)} recorded`);
    // A payment going through is news worth the Positive colour; sending stays a neutral confirmation.
    toast({ type: "positive", title: "Payment recorded", action: { label: "Undo", onClick: () => { setStatus("Sent"); unlog("paid"); } } });
  };

  return (
    <Stack><Card theme="default" width="fill" maxWidth={480} alignSelf="center">
      <Stack gap="md">
        <Stack direction="row" justify="between" align="start" gap="sm">
          <Stack gap="xs">
            <Heading level={4} textStyle="Heading/Subheading">{draftInvoice.number}</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">{`${draftInvoice.client} · ${draftInvoice.project}`}</Text>
          </Stack>
          <Badge theme={invoiceStatusTheme[status]} background="subtle">{status}</Badge>
        </Stack>
        <Stack gap="xs">
          {/* ←/→ skip the disabled tab; the line under the bar says why it is off. */}
          <Tabs idPrefix={prefix} aria-label="Invoice sections" value={tab} onValueChange={setTab} items={[
            { id: "details", label: "Details" },
            { id: "payments", label: "Payments", disabled: draft },
            { id: "history", label: "History" },
          ]} />
          {draft ? <Text textStyle="Body/Small/Regular" tone="base">Payments open once the invoice is sent.</Text> : null}
        </Stack>

        <TabPanel idPrefix={prefix} id="details" hidden={tab !== "details"}>
          <DescriptionList items={[
            { term: "Amount", description: formatMoney(draftInvoice.amount, true) },
            { term: "Issued", description: formatDate(draftInvoice.issued) },
            { term: "Due", description: formatDate(draftInvoice.due) },
            { term: "Bill to", description: "finance@saolaoutdoor.vn" },
          ]} />
        </TabPanel>
        <TabPanel idPrefix={prefix} id="payments" hidden={tab !== "payments"}>
          {status === "Paid" ? (
            <List aria-label="Payments">
              <ListItem title="Bank transfer" caption="Received just now"
                leading={<DockIcon icon="icon-bank-line" theme="neutral" background="subtle" size="medium" />}
                trailing={<Text as="span" textStyle="Body/Base/Medium">{formatMoney(draftInvoice.amount, true)}</Text>} />
            </List>
          ) : (
            <EmptyState headingLevel={5} size="sm" icon="icon-credit-card-line" title="No payments yet">Payments from {draftInvoice.client} show up here.</EmptyState>
          )}
        </TabPanel>
        <TabPanel idPrefix={prefix} id="history" hidden={tab !== "history"}>
          <List aria-label="Invoice history">
            {events.map((e) => <ListItem key={e.id} title={e.title} caption={formatRelative(e.at)} leading={avatar(people.alex)} />)}
          </List>
        </TabPanel>

        {status !== "Paid" ? (
          <Stack direction="row" justify="end">
            {draft ? <Button level="primary" onClick={send}>Send invoice</Button> : <Button level="primary" onClick={recordPayment}>Record payment</Button>}
          </Stack>
        ) : null}
      </Stack>
    </Card></Stack>
  );
}

// ——— 3. Your work ————————————————————————————————————————————————————————————————————————————————————
// Short work-item names keep one line even in a narrow card; people rows put the message in the caption.
type WorkItem = { id: string; title: string; project: string; caption: string; person?: PersonId };
const assigned: WorkItem[] = [
  { id: "w1", title: "Accessibility audit", project: "lumen-banking", caption: `LUM-091 · ${formatDue(daysFromToday(0))}` },
  { id: "w2", title: "Rewards icon set", project: "phin-loyalty", caption: `PHIN-226 · ${formatDue(daysFromToday(1))}` },
  { id: "w3", title: "Kickoff deck", project: "saola-brand", caption: `SAO-006 · ${formatDue(daysFromToday(4))}` },
];
const reviewRequests: WorkItem[] = [
  { id: "r1", title: "Points history", project: "phin-loyalty", caption: "Chi Tran · 13 minutes ago", person: "chi" },
  { id: "r2", title: "Metric card guide", project: "zen-ds", caption: "Chi Tran · Yesterday at 5:20 pm", person: "chi" },
];
const mentions: WorkItem[] = [
  { id: "m1", title: "Finn Walsh", project: "lumen-banking", caption: "Can we reuse the transfer stepper? · 9:40 am", person: "finn" },
];
const projectIcon = (id: string) => { const p: Project = projectById(id); return <DockIcon icon={p.icon} theme={p.theme} background="subtle" size="medium" />; };

function YourWorkExample() {
  const prefix = usePrefix("work");
  const { toast } = useToast();
  const [tab, setTab] = useState("reviews");
  const [reviews, setReviews] = useState(reviewRequests);

  const panelRef = useRef<HTMLDivElement>(null);
  const approve = (item: WorkItem) => {
    const before = reviews;
    const index = reviews.indexOf(item);
    setReviews((list) => list.filter((r) => r.id !== item.id));
    toast({ title: "Review approved", action: { label: "Undo", onClick: () => setReviews(before) } });
    // The row leaves with its button: focus moves to the next review's Approve, or to the panel once it is empty.
    requestAnimationFrame(() => {
      const next = [...(panelRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
      (next[Math.min(index, next.length - 1)] ?? panelRef.current?.closest<HTMLElement>('[role="tabpanel"]'))?.focus();
    });
  };
  const rows = (items: WorkItem[], label: string, trailing?: (item: WorkItem) => ReactNode) => (
    <List aria-label={label}>
      {items.map((item) => <ListItem key={item.id} title={item.title} caption={item.caption} leading={item.person && !trailing ? avatar(people[item.person]) : projectIcon(item.project)} trailing={trailing?.(item)} />)}
    </List>
  );

  return (
    <Stack><Card theme="default" width="fill" maxWidth={480} alignSelf="center">
      <Stack gap="md">
        <Heading level={4} textStyle="Heading/Subheading">Your work</Heading>
        {/* The tabs as TabItem children (Figma's Item-List slot); an items array works the same. */}
        <Tabs idPrefix={prefix} variant="subtle" aria-label="Your work" value={tab} onValueChange={setTab}>
          <TabItem value="assigned" label="Assigned" badge={assigned.length} />
          {/* The counter leaves with the last review instead of showing 0. */}
          <TabItem value="reviews" label="Reviews" badge={reviews.length || undefined} />
          <TabItem value="mentions" label="Mentions" badge={mentions.length} />
        </Tabs>
        <TabPanel idPrefix={prefix} id="assigned" hidden={tab !== "assigned"}>{rows(assigned, "Assigned to you")}</TabPanel>
        <TabPanel idPrefix={prefix} id="reviews" hidden={tab !== "reviews"}>
          <Box ref={panelRef}>
            {reviews.length
              ? rows(reviews, "Reviews waiting for you", (item) => <IconButton level="tertiary" icon="icon-check-line" aria-label={`Approve ${item.title}`} onClick={() => approve(item)} />)
              : <EmptyState headingLevel={5} size="sm" icon="icon-check-done-line" title="No reviews waiting">Review requests from your team show up here.</EmptyState>}
          </Box>
        </TabPanel>
        <TabPanel idPrefix={prefix} id="mentions" hidden={tab !== "mentions"}>{rows(mentions, "Mentions")}</TabPanel>
      </Stack>
    </Card></Stack>
  );
}

// ——— 4. Profile on a phone ——————————————————————————————————————————————————————————————————————————
// Time off is the studio's shared leave (the same requests the Button page approves): what is booked or waiting, from
// today on. A declined request never happens, so it is left out.
const upcomingLeave = (id: PersonId) => leaveRequests
  .filter((l) => l.person === id && l.to >= daysFromToday(0, 0, 0) && (l.status === "Approved" || l.status === "Pending"))
  .sort((a, b) => a.from.getTime() - b.from.getTime());
// Each team's lead is its people's manager; leads report to no one in this list.
const leadOf: Record<Person["team"], PersonId> = { Design: "alex", Engineering: "finn", Delivery: "duy", "Client Services": "hana", Operations: "minhAnh" };
const directory = [...peopleList].sort((a, b) => a.name.localeCompare(b.name));
const minutesAgo = (minutes: number) => new Date(TODAY.getTime() - minutes * 60_000);

type ActivityRow = { id: string; icon: IconName; title: string; verb: string; at: Date };
// Chi's last two weeks, newest first; other people show their files and the studio feed.
const chiActivity: ActivityRow[] = [
  { id: "c1", icon: "icon-message-circle-line", title: "Design the points history screen", verb: "Commented", at: minutesAgo(0.2) },
  { id: "c2", icon: "icon-upload-01-line", title: "Loyalty app – points history.fig", verb: "Updated", at: minutesAgo(13) },
  { id: "c3", icon: "icon-switch-horizontal-01-line", title: "Write guidelines for the Metric card", verb: "Moved to In review", at: daysFromToday(0, 9, 5) },
  { id: "c4", icon: "icon-eye-line", title: "Metric card guide", verb: `Asked ${people.alex.name} to review`, at: daysFromToday(-1, 17, 20) },
  { id: "c5", icon: "icon-message-circle-line", title: "Connect the rewards API to checkout", verb: "Commented", at: daysFromToday(-1, 15, 2) },
  { id: "c6", icon: "icon-calendar-check-line", title: "Annual leave, Oct 19 – Oct 21", verb: "Requested", at: daysFromToday(-3, 16, 45) },
  { id: "c7", icon: "icon-share-01-line", title: "Points history prototype", verb: "Shared with Phin & Co", at: daysFromToday(-2, 10, 15) },
  { id: "c8", icon: "icon-message-circle-line", title: "Rewards API contract.json", verb: "Commented", at: daysFromToday(-2, 9, 40) },
  { id: "c9", icon: "icon-switch-horizontal-01-line", title: "Design the points history screen", verb: "Moved to In progress", at: daysFromToday(-5, 14, 0) },
  { id: "c10", icon: "icon-plus-circle-line", title: "Write the rewards FAQ", verb: "Created", at: daysFromToday(-6, 11, 20) },
  { id: "c11", icon: "icon-upload-01-line", title: "Rewards checkout flow.fig", verb: "Uploaded", at: daysFromToday(-7, 16, 10) },
  { id: "c12", icon: "icon-check-circle-line", title: "Draw the loyalty tier badges", verb: "Approved", at: daysFromToday(-8, 10, 0) },
  { id: "c13", icon: "icon-message-circle-line", title: "Audit the account overview for WCAG 2.2", verb: "Commented", at: daysFromToday(-12, 15, 30) },
  { id: "c14", icon: "icon-upload-01-line", title: "Tier badge exploration.fig", verb: "Uploaded", at: daysFromToday(-13, 9, 45) },
];
const activityOf = (id: PersonId): ActivityRow[] => id === "chi" ? chiActivity : [
  ...activity.filter((a) => a.actor === id).map((a) => ({ id: a.id, icon: "icon-message-circle-line" as IconName, title: a.object, verb: `${a.verb[0].toUpperCase()}${a.verb.slice(1)}`, at: a.at })),
  ...files.filter((f) => f.owner === id).map((f) => ({ id: f.id, icon: "icon-upload-01-line" as IconName, title: f.name, verb: "Updated", at: f.updated })),
].sort((a, b) => b.at.getTime() - a.at.getTime());

/** The roots of the studio's phone app, in its bottom bar: a selected root shows its solid icon. */
const phoneRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "projects", label: "Projects", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
  { id: "people", label: "People", icon: "icon-users-line", selectedIcon: "icon-users-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];

function ProfileOnPhoneExample() {
  const prefix = usePrefix("profile");
  const screen = usePhoneScreen();
  const notHere = useNotHere();
  // One scroller per screen; each screen is its own PlatformPhone (key), so the fold is measured again.
  const screenRef = useRef<HTMLDivElement>(null);
  const activityId = useId();
  const [personId, setPersonId] = useState<PersonId | null>("chi");
  const [tab, setTab] = useState("about");

  if (!personId) {
    return (
      // The People root: the large title, the directory and the app's roots in the bottom bar. The Body pads the screen,
      // so the rows (no side padding of their own) line up with the title.
      <PlatformPhone key="root" label="People" screenRef={screenRef}>
        <AppShell
          topNavigation={<TopNavigation title="People" largeTitle="People" largeTitleSubheading={`${plural(directory.length, "person", "people")} at ${studio.name}`} scrollRef={screenRef} />}
          bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={phoneRoots} value="people"
            onValueChange={(id) => { if (id !== "people") notHere(phoneRoots.find((item) => item.id === id)?.label ?? id); }} />}
        >
          {screen.anchor}
          <List aria-label="People">
            {directory.map((p) => (
              <ListItem key={p.id} data-person={p.id} title={p.name} caption={`${p.role} · ${p.location}`} leading={avatar(p)}
                onClick={() => screen.go('[role="tab"][aria-selected="true"]', () => { setPersonId(p.id as PersonId); setTab("about"); })} />
            ))}
          </List>
        </AppShell>
      </PlatformPhone>
    );
  }

  const person = people[personId];
  const personProjects = projects.filter((p) => p.members.includes(personId));
  const leave = upcomingLeave(personId);
  const recent = activityOf(personId);
  const lead = leadOf[person.team];
  return (
    // A child screen: the compact bar with Back and the person's name, the three sections as full-width tabs in its
    // control bar (pinned while the panel scrolls), no bottom bar.
    <PlatformPhone key={personId} label={person.name} screenRef={screenRef}>
      <AppShell
        topNavigation={(
          <TopNavigation type="compact-alt" title={person.name} scrollRef={screenRef}
            leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go(`[data-person="${personId}"] .zen-list-item__wrapper`, () => setPersonId(null)) }}
            // Two to four tabs share the phone's width evenly; the bar stays pinned under the title.
            controlBar={<Tabs idPrefix={prefix} fullWidth aria-label={`${person.name} sections`} value={tab} onValueChange={setTab} items={[
              { id: "about", label: "About" },
              { id: "projects", label: "Projects", badge: personProjects.length || undefined },
              { id: "time-off", label: "Time off" },
            ]} />} />
        )}
      >
        {screen.anchor}
        <TabPanel idPrefix={prefix} id="about" hidden={tab !== "about"}>
          {/* The Body pads the screen and keeps the panel's two sections apart. */}
          <Stack gap="xl">
            <Stack gap="md">
              <Stack direction="row" gap="sm" align="center">
                {person.photo ? <Avatar size="xlarge" theme="photo" src={person.photo} alt="" /> : <Avatar size="xlarge" theme={person.theme} alt="">{initials(person.name)}</Avatar>}
                <Stack gap="xs">
                  <Text textStyle="Body/Base/Bold">{person.role}</Text>
                  <Text textStyle="Body/Small/Regular" tone="base">{person.location}</Text>
                </Stack>
              </Stack>
              <DescriptionList divider items={[
                { term: "Team", description: person.team },
                { term: "Email", description: person.email },
                ...(lead === personId ? [] : [{ term: "Manager", description: people[lead].name }]),
              ]} />
            </Stack>
            <Stack as="section" gap="xs" aria-labelledby={activityId}>
              <Heading level={2} id={activityId} textStyle="Body/Small/Bold" tone="light">Recent activity</Heading>
              {recent.length ? (
                <List aria-labelledby={activityId}>
                  {recent.map((a) => (
                    // The task or file name is the entry and nothing else shows it in full: up to two lines.
                    <ListItem key={a.id} title={a.title} titleLines={2} caption={`${a.verb} · ${formatRelative(a.at)}`}
                      leading={<DockIcon icon={a.icon} theme="neutral" background="subtle" size="medium" />} />
                  ))}
                </List>
              ) : (
                <Text textStyle="Body/Small/Regular" tone="base">{`Nothing from ${person.name.split(" ")[0]} in the last two weeks.`}</Text>
              )}
            </Stack>
          </Stack>
        </TabPanel>
        <TabPanel idPrefix={prefix} id="projects" hidden={tab !== "projects"}>
          {personProjects.length ? (
            // Static rows (nothing opens them) sit in the screen margin the Body pads.
            <List aria-label="Projects">
              {personProjects.map((p) => (
                <ListItem key={p.id} title={p.name} caption={p.client} leading={<DockIcon icon={p.icon} theme={p.theme} background="subtle" size="medium" />}
                  trailing={<BadgeStatus status={projectStep[p.status]} progress={projectProgress(p)}>{p.status}</BadgeStatus>} />
              ))}
            </List>
          ) : (
            <EmptyState headingLevel={2} icon="icon-folder-line" title="No projects yet">Projects {person.name.split(" ")[0]} joins show up here.</EmptyState>
          )}
        </TabPanel>
        <TabPanel idPrefix={prefix} id="time-off" hidden={tab !== "time-off"}>
          {leave.length ? (
            <List aria-label="Time off">
              {leave.map((l) => (
                <ListItem key={l.id} title={l.kind} caption={`${l.days > 1 ? formatRange(l.from, l.to) : formatDate(l.from)} · ${plural(l.days, "day")}`}
                  leading={<DockIcon icon={l.kind === "Sick leave" ? "icon-medical-cross-line" : "icon-plane-line"} theme="neutral" background="subtle" size="medium" />}
                  trailing={<Badge theme={leaveStatusTheme[l.status]} background="subtle">{l.status}</Badge>} />
              ))}
            </List>
          ) : (
            <EmptyState headingLevel={2} icon="icon-calendar-heart-line" title="No time off yet">Leave {person.name.split(" ")[0]} books shows up here.</EmptyState>
          )}
        </TabPanel>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— 5. Many sections ————————————————————————————————————————————————————————————————————————————————
const lumenInvoices = [
  { id: "li1", number: "INV-2026-0141", amount: 40500, status: "Paid" as InvoiceStatus, paid: daysFromToday(-8) },
  { id: "li2", number: "INV-2026-0127", amount: 38000, status: "Paid" as InvoiceStatus, paid: daysFromToday(-54) },
];
const lumenContacts = [
  { id: "c1", name: "Thu Nguyen", role: "Head of Digital", theme: "blue" as const },
  { id: "c2", name: "Kenji Mori", role: "Product Owner, Payments", theme: "teal" as const },
];
const lumenNotes = [
  { id: "n1", title: "Wants passkeys in the first release", caption: `${people.hana.name} · ${formatRelative(daysFromToday(-2, 15, 30))}` },
  { id: "n2", title: "Budget review moved to November", caption: `${people.hana.name} · ${formatRelative(daysFromToday(-9, 10, 0))}` },
];

function ClientSectionsExample() {
  const prefix = usePrefix("client");
  const [tab, setTab] = useState("overview");
  const panel = (id: string, content: ReactNode) => <TabPanel idPrefix={prefix} id={id} hidden={tab !== id}>{content}</TabPanel>;
  const icon = (name: IconName) => <DockIcon icon={name} theme="neutral" background="subtle" size="medium" />;

  return (
    <Stack><Card theme="default" width="fill" maxWidth={340} alignSelf="center">
      <Stack gap="md">
        <Stack direction="row" gap="sm" align="center">
          <Avatar size="medium" shape="square" theme="blue" alt="">LB</Avatar>
          <Stack gap="xs">
            <Heading level={4} textStyle="Heading/Subheading">Lumen Bank</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">{`Client since Mar 2024 · ${people.hana.name}`}</Text>
          </Stack>
        </Stack>
        {/* Six sections in a 360px column: the bar scrolls sideways; labels never shrink or abbreviate. */}
        <Tabs idPrefix={prefix} aria-label="Client sections" value={tab} onValueChange={setTab} items={[
          { id: "overview", label: "Overview" },
          { id: "projects", label: "Projects" },
          { id: "invoices", label: "Invoices" },
          { id: "contacts", label: "Contacts" },
          { id: "files", label: "Files" },
          { id: "notes", label: "Notes" },
        ]} />
        {panel("overview", <DescriptionList items={[
          { term: "Account director", description: people.hana.name },
          { term: "Active projects", description: "1" },
          { term: "Billed in 2026", description: formatMoney(78500, true) },
        ]} />)}
        {panel("projects", <List aria-label="Projects"><ListItem title={lumen.name} caption={`Due ${formatDate(lumen.due)}`} leading={<DockIcon icon={lumen.icon} theme={lumen.theme} background="subtle" size="medium" />} /></List>)}
        {panel("invoices", <List aria-label="Invoices">{lumenInvoices.map((i) => <ListItem key={i.id} title={i.number} caption={`${formatMoney(i.amount, true)} · Paid ${formatDate(i.paid)}`} leading={icon("icon-receipt-line")} trailing={<Badge theme={invoiceStatusTheme[i.status]} background="subtle">{i.status}</Badge>} />)}</List>)}
        {panel("contacts", <List aria-label="Contacts">{lumenContacts.map((c) => <ListItem key={c.id} title={c.name} caption={c.role} leading={<Avatar size="medium" theme={c.theme} alt="">{initials(c.name)}</Avatar>} />)}</List>)}
        {panel("files", <List aria-label="Files">{lumenFiles.slice(0, 2).map((f) => <ListItem key={f.id} title={f.name} caption={formatBytes(f.bytes)} leading={<FileIcon format={fileIconFormatOf(f.name)} size="xl" />} />)}</List>)}
        {panel("notes", <List aria-label="Notes">{lumenNotes.map((n) => <ListItem key={n.id} title={n.title} caption={n.caption} leading={icon("icon-file-doc-line")} />)}</List>)}
      </Stack>
    </Card></Stack>
  );
}

// ——— 6. Workspace top navigation ————————————————————————————————————————————————————————————————————
const activeProjects = projects.filter((p) => p.status === "Active");
const unpaidInvoices = invoices.filter((i) => i.status === "Sent" || i.status === "Overdue");
const myOpenTasks = tasks.filter((t) => t.assignee === me.id && t.status !== "Done");
const workspaceSections: Record<string, { title: string; description: string }> = {
  home: { title: "Home", description: `${studio.name} this week` },
  projects: { title: "Projects", description: `${plural(activeProjects.length, "active project")}` },
  invoices: { title: "Invoices", description: `${plural(unpaidInvoices.length, "invoice")} waiting for payment` },
  people: { title: "People", description: `${plural(peopleList.length, "person", "people")} in ${plural(new Set(peopleList.map((p) => p.team)).size, "team")}` },
};

/** True while `ref`'s element is narrower than `width`: on a phone-width page the logo keeps only its mark. */
function useNarrowerThan(width: number) {
  const ref = useRef<HTMLDivElement>(null);
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

const unpaidTotal = unpaidInvoices.reduce((sum, i) => sum + i.amount, 0);
const overdueTotal = invoices.filter((i) => i.status === "Overdue").reduce((sum, i) => sum + i.amount, 0);
const paidTotal = invoices.filter((i) => i.status === "Paid").reduce((sum, i) => sum + i.amount, 0);
const myDueSoon = [...myOpenTasks].sort((a, b) => a.due.getTime() - b.due.getTime());
const teamsInStudio = [...new Set(peopleList.map((p) => p.team))];

function WorkspaceTopNavExample() {
  const prefix = usePrefix("workspace");
  const [tab, setTab] = useState("projects");
  const { toast } = useToast();
  const [frameRef, narrow] = useNarrowerThan(640);
  const homeTasksId = useId();
  const homeActivityId = useId();
  const otherProjectsId = useId();
  const unpaidId = useId();
  const paidId = useId();
  const panel = (id: string, children: ReactNode) => <TabPanel idPrefix={prefix} id={id} hidden={tab !== id}>{children}</TabPanel>;
  const open = (title: string, detail: string) => toast({ title, children: detail });

  return (
    <PreviewAppFrame frameRef={frameRef} height={{ min: 640, max: 820 }}>
      {/* AppShell pattern="top-bar": no Sidebar, the studio's main sections are Large tabs in the header's top row (64px
          items, the selected one underlined), beside the logo; the account stays last. The page's PageHeader is the
          header's Main row and changes with the tab; every block on the Canvas is flat (no Sidebar, so no elevation). */}
      <AppShell pattern="top-bar"
        header={(
          <AppShellHeader
            leading={(
              <Stack direction="row" align="center" gap="lg">
                {/* The logo takes the top row's Element-Size/Popular/Medium (24 Compact, taller at Comfortable: a fixed 24 box
                    spilled it); on a phone-width page only the mark stays and the tabs scroll. */}
                {narrow ? <StudioMark src={studio.logo} name={studio.name} /> : <Box width="hug"><StudioLogo src={studio.logo} name={studio.name} /></Box>}
                <Tabs idPrefix={prefix} size="lg" aria-label="Workspace" value={tab} onValueChange={setTab} items={[
                  { id: "home", label: "Home" },
                  { id: "projects", label: "Projects", badge: activeProjects.length },
                  { id: "invoices", label: "Invoices", badge: unpaidInvoices.length || undefined },
                  { id: "people", label: "People" },
                ]} />
              </Stack>
            )}
            actions={<AccountMenu onProfile={() => setTab("people")} />}
            main={<PageHeader title={workspaceSections[tab].title} description={workspaceSections[tab].description} />}
          />
        )}
      >
        {panel("home", (
          <Stack gap="md">
            <Grid columns="repeat(auto-fit, minmax(min(100%, 200px), 1fr))" gap="md">
              <MetricCard label="Active projects" value={`${activeProjects.length}`} icon="icon-folder-line" iconTheme="blue" theme="default" />
              <MetricCard label="Unpaid invoices" value={formatMoney(unpaidTotal)} icon="icon-receipt-line" iconTheme="orange" theme="default" />
              <MetricCard label="Your open tasks" value={`${myOpenTasks.length}`} icon="icon-check-square-line" iconTheme="green" theme="default" />
            </Grid>
            <Grid columns="minmax(0, 1fr) minmax(0, 1fr)" stackBelow={720} gap="md" align="start">
              <ListBox as="section" aria-labelledby={homeTasksId} header={<Heading level={2} id={homeTasksId} textStyle="Heading/Subheading">Your tasks</Heading>}>
                <List aria-labelledby={homeTasksId}>
                  {myDueSoon.map((t) => (
                    <ListItem key={t.id} title={t.title} titleLines={2} caption={`${t.key} · ${formatDue(t.due)}`}
                      leading={<DockIcon icon={projectById(t.project).icon} theme={projectById(t.project).theme} background="subtle" size="medium" />}
                      trailing={<BadgeStatus status={taskStep[t.status]}>{t.status}</BadgeStatus>}
                      onClick={() => open(t.title, `${t.key} · ${projectById(t.project).name}`)} />
                  ))}
                </List>
              </ListBox>
              <ListBox as="section" aria-labelledby={homeActivityId} header={<Heading level={2} id={homeActivityId} textStyle="Heading/Subheading">Since yesterday</Heading>}>
                <List aria-labelledby={homeActivityId}>
                  {activity.slice(0, 4).map((a) => (
                    <ListItem key={a.id} title={people[a.actor].name} caption={`${a.verb} ${a.object} · ${formatRelative(a.at)}`} leading={avatar(people[a.actor])} />
                  ))}
                </List>
              </ListBox>
            </Grid>
          </Stack>
        ))}
        {panel("projects", (
          <Stack gap="xl">
            {/* The active projects as flat cards, as many 280px columns as fit: each with its progress and its next date. */}
            <Grid as="ul" minColumnWidth={280} gap="md" aria-label="Active projects">
              {activeProjects.map((p) => (
                <Card as="li" key={p.id} theme="default">
                  <Stack gap="md">
                    <Stack direction="row" gap="sm" align="center">
                      <DockIcon icon={p.icon} theme={p.theme} background="subtle" size="medium" />
                      <Stack gap="2xs" width="fill">
                        <Heading level={2} textStyle="Heading/Subheading">{p.name}</Heading>
                        <Text textStyle="Body/Small/Regular" tone="base">{p.client}</Text>
                      </Stack>
                    </Stack>
                    <ProgressBar value={p.progress} label aria-label={`${p.name} progress`} />
                    <Stack direction="row" gap="xs" align="center" justify="between">
                      <Text as="span" textStyle="Body/Small/Regular" tone="base">{`Due ${formatDate(p.due)}`}</Text>
                      <AvatarStack size="xsmall" max={4} items={p.members.map((id) => people[id].photo ? { src: people[id].photo, alt: people[id].name } : { theme: people[id].theme, alt: people[id].name, children: initials(people[id].name) })} />
                    </Stack>
                    <Button level="tertiary" onClick={() => open(p.name, `${p.client} · ${p.progress}% done · Led by ${people[p.lead].name}`)} aria-label={`Open ${p.name}`}>Open project</Button>
                  </Stack>
                </Card>
              ))}
            </Grid>
            <Stack as="section" gap="md" aria-labelledby={otherProjectsId}>
              <Heading level={2} id={otherProjectsId} textStyle="Heading/4">Other projects</Heading>
              <ListBox>
                <List aria-labelledby={otherProjectsId}>
                  {projects.filter((p) => p.status !== "Active").map((p) => (
                    <ListItem key={p.id} title={p.name} caption={`${p.client} · Led by ${people[p.lead].name}`}
                      leading={<DockIcon icon={p.icon} theme={p.theme} background="subtle" size="medium" />}
                      trailing={<BadgeStatus status={projectStep[p.status]} progress={projectProgress(p)}>{p.status}</BadgeStatus>}
                      onClick={() => open(p.name, `${p.client} · ${p.status}`)} />
                  ))}
                </List>
              </ListBox>
            </Stack>
          </Stack>
        ))}
        {panel("invoices", (
          <Stack gap="xl">
            <Grid columns="repeat(auto-fit, minmax(min(100%, 200px), 1fr))" gap="md">
              <MetricCard label="Outstanding" value={formatMoney(unpaidTotal)} icon="icon-hourglass-line" iconTheme="blue" theme="default" />
              <MetricCard label="Overdue" value={formatMoney(overdueTotal)} icon="icon-alert-triangle-line" iconTheme="red" theme="default" />
              <MetricCard label="Paid this quarter" value={formatMoney(paidTotal)} icon="icon-check-circle-line" iconTheme="green" theme="default" />
            </Grid>
            <Stack as="section" gap="md" aria-labelledby={unpaidId}>
              <Heading level={2} id={unpaidId} textStyle="Heading/4">Waiting for payment</Heading>
              <ListBox>
                <List aria-labelledby={unpaidId}>
                  {unpaidInvoices.map((i) => (
                    <ListItem key={i.id} title={i.number} caption={`${i.client} · ${formatMoney(i.amount, true)} · Due ${formatDate(i.due)}`}
                      leading={<DockIcon icon="icon-receipt-line" theme="neutral" background="subtle" size="medium" />}
                      trailing={<Badge theme={invoiceStatusTheme[i.status]} background="subtle">{i.status}</Badge>}
                      onClick={() => open(i.number, `${i.client} · ${formatMoney(i.amount, true)}`)} />
                  ))}
                </List>
              </ListBox>
            </Stack>
            <Stack as="section" gap="md" aria-labelledby={paidId}>
              <Heading level={2} id={paidId} textStyle="Heading/4">Paid recently</Heading>
              <ListBox>
                <List aria-labelledby={paidId}>
                  {invoices.filter((i) => i.status === "Paid").map((i) => (
                    <ListItem key={i.id} title={i.number} caption={`${i.client} · ${formatMoney(i.amount, true)} · Issued ${formatDate(i.issued)}`}
                      leading={<DockIcon icon="icon-receipt-line" theme="neutral" background="subtle" size="medium" />}
                      trailing={<Badge theme={invoiceStatusTheme[i.status]} background="subtle">{i.status}</Badge>}
                      onClick={() => open(i.number, `${i.client} · ${formatMoney(i.amount, true)}`)} />
                  ))}
                </List>
              </ListBox>
            </Stack>
          </Stack>
        ))}
        {panel("people", (
          // One block of rows per team, as many 320px columns as fit.
          <Grid minColumnWidth={320} gap="md" align="start">
            {teamsInStudio.map((team) => (
              <ListBox key={team} as="section" aria-labelledby={`${prefix}-${team.replace(/\s+/g, "-")}`}
                header={<Heading level={2} id={`${prefix}-${team.replace(/\s+/g, "-")}`} textStyle="Heading/Subheading">{team}</Heading>}>
                <List aria-labelledby={`${prefix}-${team.replace(/\s+/g, "-")}`}>
                  {peopleList.filter((p) => p.team === team).map((p) => <ListItem key={p.id} title={p.name} caption={`${p.role} · ${p.location}`} leading={avatar(p)} />)}
                </List>
              </ListBox>
            ))}
          </Grid>
        ))}
      </AppShell>
    </PreviewAppFrame>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Project sections",
    description: "A project page splits into Overview, Tasks, Files and Activity: Indicator tabs with icons in the AppShell header's Sections row, under the PageHeader in its Main row, each paired with a TabPanel in the Body. Counts sit in badges and leave at zero; Activity loads the first time it opens.",
    wide: true,
    screen: true,
    render: () => <ProjectSectionsExample />,
    code: `const [tab, setTab] = useState("overview");

<AppShell
  sidebar={<Sidebar logo={logo} sections={places} selectedId="projects" onItemClick={go} />}
  header={
    <AppShellHeader
      leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: "lumen", label: "Online banking redesign" }]} onNavigate={go} />}
      actions={<>{notifications}{account}</>}
      main={
        <PageHeader eyebrow="Lumen Bank" title="Online banking redesign"
          meta={<Badge theme="blue" background="subtle">Active</Badge>}
          actions={<><Button level="tertiary" onClick={share}>Share</Button><Button level="primary" onClick={newTask}>New task</Button></>} />
      }
      // The page's views: the Sections row under the Main row
      sections={
        <Tabs idPrefix="project" aria-label="Project sections" value={tab} onValueChange={setTab} items={[
          { id: "overview", label: "Overview", icon: "icon-layout-grid-01-line" },
          { id: "tasks", label: "Tasks", icon: "icon-check-square-line", badge: openTasks || undefined }, // hidden at 0
          { id: "files", label: "Files", icon: "icon-folder-line", badge: files.length },
          { id: "activity", label: "Activity", icon: "icon-activity-line" },
        ]} />
      }
    />
  }
>
  <TabPanel idPrefix="project" id="overview" hidden={tab !== "overview"}>
    <Grid columns="repeat(auto-fit, minmax(min(100%, 200px), 1fr))" gap="md">{/* MetricCards theme="shadow" */}</Grid>
  </TabPanel>
  <TabPanel idPrefix="project" id="tasks" hidden={tab !== "tasks"}>
    <Table aria-label="Tasks" rows={tasks} columns={columns} /> {/* on the page, no Card */}
  </TabPanel>
  <TabPanel idPrefix="project" id="activity" hidden={tab !== "activity"}>
    <ListBox theme="shadow">{loaded ? <ActivityList /> : <SkeletonRows />}</ListBox>
  </TabPanel>
</AppShell>`,
  },
  {
    title: "Workspace top navigation",
    description: "On desktop the studio's main sections sit in the top bar as Large tabs: the AppShell's top-bar pattern (no Sidebar) puts them beside the logo in the header's top row, 64px items with the selected one underlined, and the PageHeader in the Main row follows the tab. Counts sit in badges and leave at zero; Your profile in the account menu opens People.",
    wide: true,
    screen: true,
    render: () => <WorkspaceTopNavExample />,
    code: `const [tab, setTab] = useState("projects");

<AppShell pattern="top-bar"
  header={
    <AppShellHeader
      leading={
        <Stack direction="row" align="center" gap="lg">
          <Logo />
          <Tabs idPrefix="workspace" size="lg" aria-label="Workspace" value={tab} onValueChange={setTab} items={[
            { id: "home", label: "Home" },
            { id: "projects", label: "Projects", badge: activeProjects.length },
            { id: "invoices", label: "Invoices", badge: unpaidInvoices.length || undefined }, // hidden at 0
            { id: "people", label: "People" },
          ]} />
        </Stack>
      }
      actions={<Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={accountItems} />}
      main={<PageHeader title="Projects" description="3 active projects" />} // the screen's h1
    />
  }
>
  <TabPanel idPrefix="workspace" id="projects" hidden={tab !== "projects"}>
    <ListBox><List aria-label="Active projects">{/* ListItems */}</List></ListBox>
  </TabPanel>
  …
</AppShell>`,
  },
  {
    title: "Your work",
    description: "Inside a dashboard card, Subtle tabs switch between lists of one kind. Approving the last review removes the Reviews counter instead of showing 0, and the panel says there is nothing waiting.",
    render: () => <YourWorkExample />,
    code: `<Heading level={4} textStyle="Heading/Subheading">Your work</Heading>
<Tabs idPrefix="work" variant="subtle" aria-label="Your work" value={tab} onValueChange={setTab}>
  <TabItem value="assigned" label="Assigned" badge={assigned.length} />
  <TabItem value="reviews" label="Reviews" badge={reviews.length || undefined} />
  <TabItem value="mentions" label="Mentions" badge={mentions.length} />
</Tabs>
<TabPanel idPrefix="work" id="reviews" hidden={tab !== "reviews"}>
  {reviews.length ? (
    <List aria-label="Reviews waiting for you">
      {reviews.map((r) => (
        <ListItem key={r.id} title={r.title} caption={r.caption} leading={<DockIcon icon={r.icon} theme={r.theme} background="subtle" />}
          trailing={<IconButton level="tertiary" icon="icon-check-line" aria-label={\`Approve \${r.title}\`} onClick={() => approve(r)} />} />
      ))}
    </List>
  ) : (
    <EmptyState headingLevel={5} size="sm" icon="icon-check-done-line" title="No reviews waiting">Review requests from your team show up here.</EmptyState>
  )}
</TabPanel>`,
  },
  {
    title: "Many sections",
    description: "Six sections on a narrow client card: the bar scrolls sideways instead of shrinking or cutting labels, and ←/→ bring the next tab into view. Seven is the most; more belongs in a Sidebar or a select.",
    render: () => <ClientSectionsExample />,
    code: `{/* max-width: 360px */}
<Tabs idPrefix="client" aria-label="Client sections" value={tab} onValueChange={setTab} items={[
  { id: "overview", label: "Overview" },
  { id: "projects", label: "Projects" },
  { id: "invoices", label: "Invoices" },
  { id: "contacts", label: "Contacts" },
  { id: "files", label: "Files" },
  { id: "notes", label: "Notes" },
]} />
{sections.map((s) => (
  <TabPanel key={s.id} idPrefix="client" id={s.id} hidden={tab !== s.id}>{s.content}</TabPanel>
))}`,
  },
  {
    title: "Draft invoice",
    description: "Payments stays visible but disabled while the invoice is a draft, and the line under the bar says why; arrow keys skip it. Sending enables the tab, and Undo in the toast turns it off again.",
    render: () => <DraftInvoiceExample />,
    code: `const draft = status === "Draft";

<Tabs idPrefix="invoice" aria-label="Invoice sections" value={tab} onValueChange={setTab} items={[
  { id: "details", label: "Details" },
  { id: "payments", label: "Payments", disabled: draft },
  { id: "history", label: "History" },
]} />
{draft && <Text textStyle="Body/Small/Regular" tone="base">Payments open once the invoice is sent.</Text>}

<TabPanel idPrefix="invoice" id="details" hidden={tab !== "details"}>
  <DescriptionList items={details} />
</TabPanel>
…
<Button level="primary" onClick={send}>Send invoice</Button>`,
  },
  {
    title: "Profile on a phone",
    description: "On a phone, three sections of a profile sit in the Top Navigation control bar as full-width tabs that share the screen evenly and stay pinned while the activity scrolls under them. The profile is a child screen of the People root (Back, no bottom bar): Back returns to the person's row in People, and a section without entries says so.",
    render: () => <ProfileOnPhoneExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

// One PlatformPhone per screen (key), each wired to the scroll.
<PlatformPhone key={personId} screenRef={screenRef}>
  <AppShell
    topNavigation={
      <TopNavigation type="compact-alt" title="Chi Tran" scrollRef={screenRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToPeople }}
        controlBar={
          <Tabs idPrefix="profile" fullWidth aria-label="Chi Tran sections" value={tab} onValueChange={setTab} items={[
            { id: "about", label: "About" },
            { id: "projects", label: "Projects", badge: projects.length || undefined },
            { id: "time-off", label: "Time off" },
          ]} />
        } />
    }
  >
    {/* The Body pads the screen */}
    <TabPanel idPrefix="profile" id="about" hidden={tab !== "about"}>…</TabPanel>
    <TabPanel idPrefix="profile" id="projects" hidden={tab !== "projects"}>…</TabPanel>
    <TabPanel idPrefix="profile" id="time-off" hidden={tab !== "time-off"}>…</TabPanel>
  </AppShell>
</PlatformPhone>`,
  },
]);
