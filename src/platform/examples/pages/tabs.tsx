/* Tabs examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Alex Duong works through the Đìzai Studio
   workspace: the sections of a project page, a draft invoice, the work waiting on his dashboard, a colleague's profile on
   his phone and a client record in a narrow column. Tabs switch sections of one thing; filters stay Chips. */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Avatar, AvatarStack } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import type { IconName } from "../../../components/Icon";
import { Box, Container, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { MetricCard } from "../../../components/MetricWidget";
import { PageHeader } from "../../../components/PageHeader";
import { SkeletonShape, SkeletonText } from "../../../components/Skeleton";
import { Table, TableMedia, TableText, type TableColumn } from "../../../components/Table";
import { TabPanel, Tabs } from "../../../components/Tabs";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import {
  TODAY, activity, daysFromToday, files, formatBytes, formatDate, formatDue, formatMoney, formatRange, formatRelative, initials, invoiceStatusTheme,
  leaveRequests, leaveStatusTheme, people, peopleList, projectById, projectStatusTheme, projects, tasks, taskStatusTheme,
  type InvoiceStatus, type Person, type PersonId, type Project, type StudioFile, type Task,
} from "../data";
import type { PlatformPage } from "../../PlatformExamples";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./tabs.css";

export const page: PlatformPage = "tabs";

/** A person as an Avatar: their photo, or initials on their steady theme. */
const avatar = (p: Person, size: "xsmall" | "medium" = "medium") => p.photo
  ? <Avatar size={size} theme="photo" src={p.photo} alt="" />
  : <Avatar size={size} theme={p.theme} alt="">{initials(p.name)}</Avatar>;
/** One idPrefix per rendered example, so tab and panel ids stay unique when an example renders twice. */
const usePrefix = (name: string) => `${name}-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

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
  { id: "status", header: "Status", width: "140px", cell: (t) => <Badge theme={taskStatusTheme[t.status]} background="subtle">{t.status}</Badge> },
  { id: "due", header: "Due", width: "140px", cell: (t) => <TableText>{formatDate(t.due)}</TableText> },
];

function ProjectSectionsExample() {
  const prefix = usePrefix("project");
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

  return (
    <div className="px-tabs-page">
      <Container maxWidth="full">
        <Stack gap="xl">
          <PageHeader
            eyebrow={lumen.client}
            title={lumen.name}
            meta={<Badge theme={projectStatusTheme[lumen.status]} background="subtle">{lumen.status}</Badge>}
            description={`${formatRange(lumen.start, lumen.due)} · Led by ${people[lumen.lead].name}`}
            actions={<><Button level="tertiary" onClick={() => setDialog("share")}>Share</Button><Button level="primary" onClick={() => setDialog("task")}>New task</Button></>}
            tabs={(
              <Tabs idPrefix={prefix} aria-label="Project sections" value={tab} onValueChange={setTab} items={[
                { id: "overview", label: "Overview", icon: "icon-layout-grid-01-line" },
                // Counts only while there is something to count: a badge of 0 is hidden.
                { id: "tasks", label: "Tasks", icon: "icon-check-square-line", badge: open || undefined },
                { id: "files", label: "Files", icon: "icon-folder-line", badge: lumenFiles.length },
                { id: "activity", label: "Activity", icon: "icon-activity-line" },
              ]} />
            )}
          />

          <TabPanel idPrefix={prefix} id="overview" hidden={tab !== "overview"}>
            <Stack gap="md">
              {/* As many 200px columns as fit, stretched to fill the row. */}
              <Grid columns="repeat(auto-fit, minmax(min(100%, 200px), 1fr))" gap="md">
                <MetricCard label="Progress" value={`${lumen.progress}%`} icon="icon-target-04-line" iconTheme="blue" theme="flat" />
                <MetricCard label="Budget used" value={formatMoney(lumen.spent)} icon="icon-coins-line" iconTheme="green" theme="flat" />
                <MetricCard label="Open tasks" value={`${open}`} icon="icon-check-square-line" iconTheme="orange" theme="flat" />
              </Grid>
              {/* Flat Surfaces on the page's Canvas/Default: no border, no shadow (usage rules §16). Side content stops at
                  xl (1440px) on a full-width page (backlog batch 6b). */}
              <Box maxWidth={1440}>
              <Card theme="flat">
                <DescriptionList items={[
                  { term: "Account director", description: people.hana.name },
                  { term: "Budget", description: formatMoney(lumen.budget) },
                  { term: "Team", description: <AvatarStack size="xsmall" items={lumen.members.map((id) => people[id].photo ? { src: people[id].photo, alt: people[id].name } : { theme: people[id].theme, alt: people[id].name, children: initials(people[id].name) })} /> },
                  { term: "Due", description: formatDate(lumen.due) },
                ]} />
              </Card>
              </Box>
            </Stack>
          </TabPanel>

          {/* The task table is the section's content, so it lies on the page (no Card). */}
          <TabPanel idPrefix={prefix} id="tasks" hidden={tab !== "tasks"}>
            <Table aria-label="Tasks" rows={taskList} columns={taskColumns} />
          </TabPanel>

          {/* The file and activity rows sit in a ListBox: a box made only of List-Items. */}
          <TabPanel idPrefix={prefix} id="files" hidden={tab !== "files"}>
            <ListBox>
              <List aria-label="Files">
                {lumenFiles.map((f) => (
                  <ListItem key={f.id} title={f.name} caption={`${formatBytes(f.bytes)} · ${people[f.owner].name} · ${formatRelative(f.updated)}`}
                    leading={<FileIcon format={fileIconFormatOf(f.name)} size="xl" />} />
                ))}
              </List>
            </ListBox>
          </TabPanel>

          <TabPanel idPrefix={prefix} id="activity" hidden={tab !== "activity"}>
            <ListBox>
              {activityLoaded ? (
                <List aria-label="Activity">
                  {lumenActivity.map((a) => <ListItem key={a.id} title={people[a.actor].name} caption={`${a.text} · ${formatRelative(a.at)}`} leading={avatar(people[a.actor])} />)}
                </List>
              ) : (
                // Placeholder rows are List-Items too (same padding, Avatar Medium, row gap), so nothing jumps on load.
                <List aria-busy="true" aria-label="Loading activity">
                  {[0, 1, 2].map((row) => (
                    <ListItem key={row} aria-hidden="true" title="" leading={<SkeletonShape shape="round" size="md" />}>
                      <SkeletonText lines={2} className="px-tabs-skeleton-text" />
                    </ListItem>
                  ))}
                </List>
              )}
            </ListBox>
          </TabPanel>
        </Stack>
      </Container>

      <DemoFieldDialog open={dialog === "share"} onOpenChange={(next) => setDialog(next ? "share" : null)} title={`Share ${lumen.name}`}
        field={{ kind: "email", label: "Email address", placeholder: "thu@lumenbank.com" }} submitLabel="Send invite" confirm={(email) => `Invite sent to ${email}`} />
      <DemoFieldDialog open={dialog === "task"} onOpenChange={(next) => setDialog(next ? "task" : null)} title="New task"
        field={{ kind: "name", label: "Task name", placeholder: "Review the transfer limits copy" }} submitLabel="Add task" confirm={() => "Task added"} onSubmit={addTask} />
    </div>
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
    <Card theme="flat" className="px-tabs-invoice">
      <Stack gap="md">
        <Stack direction="row" justify="between" align="start" gap="sm">
          <Stack gap="xs">
            <Heading level={4} textStyle="Heading/Subheading">{draftInvoice.number}</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">{`${draftInvoice.client} · ${draftInvoice.project}`}</Text>
          </Stack>
          <Badge className="px-tabs-status" theme={invoiceStatusTheme[status]} background="subtle">{status}</Badge>
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
            <EmptyState headingLevel={5} illustration={false} title="No payments yet">Payments from {draftInvoice.client} show up here.</EmptyState>
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
    </Card>
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
    <Card theme="flat" className="px-tabs-work">
      <Stack gap="md">
        <Heading level={4} textStyle="Heading/Subheading">Your work</Heading>
        <Tabs idPrefix={prefix} variant="subtle" aria-label="Your work" value={tab} onValueChange={setTab} items={[
          { id: "assigned", label: "Assigned", badge: assigned.length },
          // The counter leaves with the last review instead of showing 0.
          { id: "reviews", label: "Reviews", badge: reviews.length || undefined },
          { id: "mentions", label: "Mentions", badge: mentions.length },
        ]} />
        <TabPanel idPrefix={prefix} id="assigned" hidden={tab !== "assigned"}>{rows(assigned, "Assigned to you")}</TabPanel>
        <TabPanel idPrefix={prefix} id="reviews" hidden={tab !== "reviews"}>
          <Box ref={panelRef}>
            {reviews.length
              ? rows(reviews, "Reviews waiting for you", (item) => <IconButton level="tertiary" icon="icon-check-line" aria-label={`Approve ${item.title}`} onClick={() => approve(item)} />)
              : <EmptyState headingLevel={5} illustration={false} title="No reviews waiting">Review requests from your team show up here.</EmptyState>}
          </Box>
        </TabPanel>
        <TabPanel idPrefix={prefix} id="mentions" hidden={tab !== "mentions"}>{rows(mentions, "Mentions")}</TabPanel>
      </Stack>
    </Card>
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

function ProfileOnPhoneExample() {
  const prefix = usePrefix("profile");
  const screen = usePhoneScreen();
  // One scroller per screen; each screen is its own PlatformPhone (key), so the fold is measured again.
  const screenRef = useRef<HTMLDivElement>(null);
  const activityId = useId();
  const [personId, setPersonId] = useState<PersonId | null>("chi");
  const [tab, setTab] = useState("about");

  if (!personId) {
    return (
      <PlatformPhone key="root" label="People" headerOverlay screenRef={screenRef}
        header={<TopNavigation title="People" largeTitle="People" scrollRef={screenRef} />}>
        {screen.anchor}
        {/* Rows pad 0 at the sides: the screen margin (lg, 20px) insets them, and their fill (12px outside a row) stays 8px off every edge. */}
        <Box padding="lg">
          <List aria-label="People">
            {directory.map((p) => (
              <ListItem key={p.id} data-person={p.id} title={p.name} caption={`${p.role} · ${p.location}`} leading={avatar(p)}
                onClick={() => screen.go('[role="tab"][aria-selected="true"]', () => { setPersonId(p.id as PersonId); setTab("about"); })} />
            ))}
          </List>
        </Box>
      </PlatformPhone>
    );
  }

  const person = people[personId];
  const personProjects = projects.filter((p) => p.members.includes(personId));
  const leave = upcomingLeave(personId);
  const recent = activityOf(personId);
  const lead = leadOf[person.team];
  return (
    <PlatformPhone key={personId} label={person.name} headerOverlay screenRef={screenRef}
      header={(
        <TopNavigation type="compact" title={person.name} scrollRef={screenRef}
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go(`[data-person="${personId}"] .zen-list-item__wrapper`, () => setPersonId(null)) }}
          // Two to four tabs share the phone's width evenly; the bar stays pinned under the title.
          controlBar={<Tabs idPrefix={prefix} fullWidth aria-label={`${person.name} sections`} value={tab} onValueChange={setTab} items={[
            { id: "about", label: "About" },
            { id: "projects", label: "Projects", badge: personProjects.length || undefined },
            { id: "time-off", label: "Time off" },
          ]} />} />
      )}>
      {screen.anchor}
      <TabPanel idPrefix={prefix} id="about" hidden={tab !== "about"}>
        <Stack gap="lg" paddingY="lg">
          <Stack gap="md" paddingX="lg">
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
          <Stack as="section" gap="xs" paddingX="lg" aria-labelledby={activityId}>
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
          // Static rows (nothing opens them) sit in the screen margin.
          <Box padding="lg">
            <List aria-label="Projects">
              {personProjects.map((p) => (
                <ListItem key={p.id} title={p.name} caption={p.client} leading={<DockIcon icon={p.icon} theme={p.theme} background="subtle" size="medium" />}
                  trailing={<Badge theme={projectStatusTheme[p.status]} background="subtle">{p.status}</Badge>} />
              ))}
            </List>
          </Box>
        ) : (
          <EmptyState headingLevel={2} illustration={false} title="No projects yet">Projects {person.name.split(" ")[0]} joins show up here.</EmptyState>
        )}
      </TabPanel>
      <TabPanel idPrefix={prefix} id="time-off" hidden={tab !== "time-off"}>
        {leave.length ? (
          <Box padding="lg">
            <List aria-label="Time off">
              {leave.map((l) => (
                <ListItem key={l.id} title={l.kind} caption={`${l.days > 1 ? formatRange(l.from, l.to) : formatDate(l.from)} · ${plural(l.days, "day")}`}
                  leading={<DockIcon icon={l.kind === "Sick leave" ? "icon-medical-cross-line" : "icon-plane-line"} theme="neutral" background="subtle" size="medium" />}
                  trailing={<Badge theme={leaveStatusTheme[l.status]} background="subtle">{l.status}</Badge>} />
              ))}
            </List>
          </Box>
        ) : (
          <EmptyState headingLevel={2} illustration={false} title="No time off yet">Leave {person.name.split(" ")[0]} books shows up here.</EmptyState>
        )}
      </TabPanel>
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
    <Card theme="flat" className="px-tabs-client">
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
    </Card>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Project sections",
    description: "A project page splits into Overview, Tasks, Files and Activity: Indicator tabs with icons in the PageHeader, each paired with a TabPanel. Counts sit in badges and leave at zero; Activity loads the first time it opens.",
    wide: true,
    screen: true,
    render: () => <ProjectSectionsExample />,
    code: `const [tab, setTab] = useState("overview");

<PageHeader
  eyebrow="Lumen Bank"
  title="Online banking redesign"
  meta={<Badge theme="blue" background="subtle">Active</Badge>}
  actions={<><Button level="tertiary" onClick={share}>Share</Button><Button level="primary" onClick={newTask}>New task</Button></>}
  tabs={
    <Tabs idPrefix="project" aria-label="Project sections" value={tab} onValueChange={setTab} items={[
      { id: "overview", label: "Overview", icon: "icon-layout-grid-01-line" },
      { id: "tasks", label: "Tasks", icon: "icon-check-square-line", badge: openTasks || undefined }, // hidden at 0
      { id: "files", label: "Files", icon: "icon-folder-line", badge: files.length },
      { id: "activity", label: "Activity", icon: "icon-activity-line" },
    ]} />
  }
/>
<TabPanel idPrefix="project" id="overview" hidden={tab !== "overview"}>
  <Grid columns="repeat(auto-fit, minmax(min(100%, 200px), 1fr))" gap="md">{/* MetricCards */}</Grid>
</TabPanel>
<TabPanel idPrefix="project" id="tasks" hidden={tab !== "tasks"}>
  <Table aria-label="Tasks" rows={tasks} columns={columns} /> {/* on the page, no Card */}
</TabPanel>
<TabPanel idPrefix="project" id="activity" hidden={tab !== "activity"}>
  <ListBox>{loaded ? <ActivityList /> : <SkeletonRows />}</ListBox>
</TabPanel>`,
  },
  {
    title: "Your work",
    description: "Inside a dashboard card, Subtle tabs switch between lists of one kind. Approving the last review removes the Reviews counter instead of showing 0, and the panel says there is nothing waiting.",
    render: () => <YourWorkExample />,
    code: `<Heading level={4} textStyle="Heading/Subheading">Your work</Heading>
<Tabs idPrefix="work" variant="subtle" aria-label="Your work" value={tab} onValueChange={setTab} items={[
  { id: "assigned", label: "Assigned", badge: assigned.length },
  { id: "reviews", label: "Reviews", badge: reviews.length || undefined },
  { id: "mentions", label: "Mentions", badge: mentions.length },
]} />
<TabPanel idPrefix="work" id="reviews" hidden={tab !== "reviews"}>
  {reviews.length ? (
    <List aria-label="Reviews waiting for you">
      {reviews.map((r) => (
        <ListItem key={r.id} title={r.title} caption={r.caption} leading={<DockIcon icon={r.icon} theme={r.theme} background="subtle" />}
          trailing={<IconButton level="tertiary" icon="icon-check-line" aria-label={\`Approve \${r.title}\`} onClick={() => approve(r)} />} />
      ))}
    </List>
  ) : (
    <EmptyState headingLevel={5} illustration={false} title="No reviews waiting">Review requests from your team show up here.</EmptyState>
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
    description: "On a phone, three sections of a profile sit in the Top Navigation control bar as full-width tabs that share the screen evenly and stay pinned while the activity scrolls under them. Back returns to the person's row in People, and a section without entries says so.",
    render: () => <ProfileOnPhoneExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

// One PlatformPhone per screen (key), each wired to the scroll.
<PlatformPhone key={personId} headerOverlay screenRef={screenRef} header={
  <TopNavigation type="compact" title="Chi Tran" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToPeople }}
    controlBar={
      <Tabs idPrefix="profile" fullWidth aria-label="Chi Tran sections" value={tab} onValueChange={setTab} items={[
        { id: "about", label: "About" },
        { id: "projects", label: "Projects", badge: projects.length || undefined },
        { id: "time-off", label: "Time off" },
      ]} />
    } />
}>
  <TabPanel idPrefix="profile" id="about" hidden={tab !== "about"}>…</TabPanel>
  <TabPanel idPrefix="profile" id="projects" hidden={tab !== "projects"}>…</TabPanel>
  <TabPanel idPrefix="profile" id="time-off" hidden={tab !== "time-off"}>…</TabPanel>
</PlatformPhone>`,
  },
]);
