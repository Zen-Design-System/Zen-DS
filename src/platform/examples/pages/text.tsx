/* Text & Heading examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex
   Duong, Wednesday Sep 30, 2026, 10:30 am. Each example teaches one copy decision: the heading level follows the page
   outline while the style follows the kind of content, status text pairs its colour with an icon and words, long copy
   clamps and opens in place, counts agree with their noun, and a phone's h1 is its large or compact bar title. The two
   screens sit in the new AppShell (2026-10-19): the PageHeader is the header's Main row on desktop, the TopNavigation
   names the phone screen. */
import { useId, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader } from "../../../components/AppShell";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { BottomNavigation, type BottomNavigationItem } from "../../../components/BottomNavigation";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Checkbox } from "../../../components/Checkbox";
import { DescriptionList } from "../../../components/DescriptionList";
import { Dialog } from "../../../components/Dialog";
import { Form, FormActions, FormFieldset } from "../../../components/Form";
import { Icon, type IconName } from "../../../components/Icon";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { PageHeader } from "../../../components/PageHeader";
import { SidePanel } from "../../../components/SidePanel";
import { Sidebar, SidebarMenuItem, type SidebarItem, type SidebarSection } from "../../../components/Sidebar";
import { Heading, Text, TextRun, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import { PreviewAppFrame, StudioLogo, StudioMark } from "../../PlatformFrames";
import type { PlatformPage } from "../../PlatformExamples";
import {
  TODAY, activity, daysFromToday, formatBytes, formatDate, formatDue, formatRelative, initials, me, people, priorityTheme, projectById, studio,
  taskStatusTheme, tasks, type Person, type PersonId, type Task,
} from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./text.css";

export const page: PlatformPage = "text";

/** A person as Avatar props: their photo, or initials on their steady theme. The text beside it already names them. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const minutesAgo = (minutes: number) => new Date(TODAY.getTime() - minutes * 60_000);

/** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
function useNotHere() {
  const { toast } = useToast();
  return (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows text and headings." });
}

// ——— The studio's desktop app ———————————————————————————————————————————————————————————————————————
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
 * One page of the studio's app: AppShell Layout=Sidebar in a desktop window, the trail and the utilities in the header's
 * top row and the page's PageHeader, its one h1, as the Main row. The Body pads the page margins itself.
 */
function StudioApp({ here, leading, main, children }: { here: string; leading?: ReactNode; main: ReactNode; children: ReactNode }) {
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
          <AppShellHeader leading={leading}
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

// ——— 1. Page outline: one h1, h2 sections, h3 card titles ——————————————————————————————————————————
type Milestone = { id: string; name: string; done: number; total: number; date: Date; finished?: boolean };
const milestones: Milestone[] = [
  { id: "discovery", name: "Discovery and research", done: 8, total: 8, date: daysFromToday(-40), finished: true },
  { id: "rewards", name: "Points and rewards", done: 6, total: 9, date: daysFromToday(9) },
  { id: "android", name: "Android launch", done: 1, total: 7, date: daysFromToday(33) },
];
const loyaltyTasks = tasks.filter((task) => task.project === "phin-loyalty" && task.status !== "Done");

const loyalty = projectById("phin-loyalty");

function ProjectPage() {
  const { toast } = useToast();
  const notHere = useNotHere();
  const [open, setOpen] = useState(loyaltyTasks);
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const baseId = useId();
  const opened = open.find((task) => task.id === openId);
  const addTask = (title: string) => setOpen((list) => [...list, {
    id: `new-${list.length}`, key: `PHIN-${230 + list.length}`, title, project: "phin-loyalty", assignee: "alex", status: "To do", priority: "Medium", due: daysFromToday(7), comments: 0,
  }]);
  return (
    <StudioApp here="projects"
      leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: loyalty.id, label: loyalty.name }]}
        onNavigate={(item, event) => { event.preventDefault(); notHere(String(item.label)); }} />}
      // The page title: PageHeader renders the screen's one h1 in Heading/1, in the header's Main row.
      main={<PageHeader title={loyalty.name} description={`${loyalty.client} · Led by ${people[loyalty.lead].name} · Due ${formatDate(loyalty.due)}`}
        actions={<>
          <Button level="tertiary" startIcon="icon-share-01-line" onClick={() => setSharing(true)}>Share</Button>
          <Button level="primary" startIcon="icon-plus-line" onClick={() => setCreating(true)}>New task</Button>
        </>} />}>
      {/* Sections of the page, xl apart: each an h2 in Heading/4. Beside the Sidebar every box takes its elevation (Shadow). */}
      <Stack gap="xl">
        <Stack as="section" gap="md" aria-labelledby={`${baseId}-milestones`}>
          <Heading level={2} id={`${baseId}-milestones`} textStyle="Heading/4">Milestones</Heading>
          <Grid columns={{ mobile: 1, desktop: 3 }} gap="md">
            {milestones.map((milestone) => (
              <Card key={milestone.id} as="section" theme="shadow" aria-labelledby={`${baseId}-${milestone.id}`}>
                {/* Card titles sit one level below the section (h3) and are always Heading/Subheading; the lines under
                    them step down in tone, not in size. */}
                <Stack gap="xs">
                  <Heading level={3} id={`${baseId}-${milestone.id}`} textStyle="Heading/Subheading">{milestone.name}</Heading>
                  <Text textStyle="Body/Small/Regular" tone="base">{`${milestone.done} of ${plural(milestone.total, "task")} done`}</Text>
                  <Text textStyle="Caption/Regular" tone="light">{`${milestone.finished ? "Finished" : "Due"} ${formatDate(milestone.date)}`}</Text>
                </Stack>
              </Card>
            ))}
          </Grid>
        </Stack>
        <Grid columns="minmax(0, 2fr) minmax(0, 1fr)" stackBelow={880} gap="xl" align="start">
          <Stack as="section" gap="md" aria-labelledby={`${baseId}-tasks`}>
            <Heading level={2} id={`${baseId}-tasks`} textStyle="Heading/4">Open tasks</Heading>
            <ListBox theme="shadow">
              <List aria-labelledby={`${baseId}-tasks`}>
                {open.map((task) => (
                  // No leading visual: the title keeps the room to wrap beside the status, even on a narrow screen. The
                  // whole row opens the task.
                  <ListItem key={task.id} title={task.title} titleLines={2} caption={`${task.key} · ${people[task.assignee].name} · ${formatDue(task.due)}`}
                    trailing={<Badge theme={taskStatusTheme[task.status]} background="subtle">{task.status}</Badge>} onClick={() => setOpenId(task.id)} />
                ))}
              </List>
            </ListBox>
          </Stack>
          <Stack as="section" gap="md" aria-labelledby={`${baseId}-team`}>
            <Heading level={2} id={`${baseId}-team`} textStyle="Heading/4">Team</Heading>
            <ListBox theme="shadow">
              <List aria-labelledby={`${baseId}-team`}>
                {loyalty.members.map((id) => (
                  <ListItem key={id} title={people[id].name} caption={id === loyalty.lead ? `${people[id].role} · Project lead` : people[id].role}
                    leading={<Avatar size="md" {...avatarOf(people[id])} />}
                    onClick={() => toast({ title: people[id].name, children: `${people[id].role} · ${people[id].email}` })} />
                ))}
              </List>
            </ListBox>
          </Stack>
        </Grid>
      </Stack>
      <SidePanel type="modal" size="small" open={Boolean(opened)} onOpenChange={(next) => { if (!next) setOpenId(null); }}
        title={opened?.title ?? ""} description={opened ? `${opened.key} · ${loyalty.name}` : undefined}>
        {opened ? (
          <DescriptionList divider items={[
            { id: "status", term: "Status", description: <Badge theme={taskStatusTheme[opened.status]} background="subtle">{opened.status}</Badge> },
            { id: "assignee", term: "Assignee", description: people[opened.assignee].name },
            { id: "priority", term: "Priority", description: <Badge theme={priorityTheme[opened.priority]} background="subtle">{opened.priority}</Badge> },
            { id: "due", term: "Due", description: formatDate(opened.due) },
          ]} />
        ) : null}
      </SidePanel>
      <DemoFieldDialog open={creating} onOpenChange={setCreating} title="New task" description="It goes to the Loyalty app, assigned to you."
        field={{ kind: "name", label: "Task name", placeholder: "Review the reward animations" }} submitLabel="Create task"
        confirm={() => "Task created"} onSubmit={addTask} />
      <DemoFieldDialog open={sharing} onOpenChange={setSharing} title="Share Loyalty app" description="They can view the project and its open tasks."
        field={{ kind: "email", label: "Email", placeholder: "name@phinco.vn" }} submitLabel="Share project"
        confirm={(email) => `Project shared with ${email}`} />
    </StudioApp>
  );
}

// ——— 2. Status text: a colour family, always with an icon and words ———————————————————————————————
type Check = { id: string; tone: "positive" | "warning" | "negative"; icon: IconName; text: string; action?: { label: string; onClick: () => void } };
const ok = "icon-check-circle-line" as const;

function SecurityChecks() {
  const { toast } = useToast();
  const [renewed, setRenewed] = useState(false);
  const [guestsRemoved, setGuestsRemoved] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLElement>(null);
  // A fixed check loses its button, so focus moves on to the next fix left, or to the card title once none is left
  // (a frame later, after a Dialog has handed focus back).
  const focusNext = () => requestAnimationFrame(() => (listRef.current?.querySelector<HTMLElement>("button") ?? titleRef.current)?.focus());
  const checks: Check[] = [
    { id: "two-step", tone: "positive", icon: ok, text: "Two-step sign-in is on for all 48 members" },
    renewed
      ? { id: "certificate", tone: "positive", icon: ok, text: `Single sign-on certificate renewed until ${formatDate(daysFromToday(366))}` }
      : { id: "certificate", tone: "warning", icon: "icon-alert-triangle-line", text: "The single sign-on certificate expires in 5 days",
        action: { label: "Renew certificate", onClick: () => { setRenewed(true); focusNext(); toast({ type: "positive", title: "Certificate renewed" }); } } },
    guestsRemoved
      ? { id: "guests", tone: "positive", icon: ok, text: "No inactive client guests" }
      : { id: "guests", tone: "negative", icon: "icon-x-circle-line", text: `${plural(2, "client guest")} haven’t signed in for 90 days`,
        action: { label: "Remove guests", onClick: () => setConfirming(true) } },
  ];
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading ref={titleRef} level={4} id={titleId} tabIndex={-1} textStyle="Heading/Subheading">Workspace security</Heading>
          <Text textStyle="Caption/Regular" tone="light">Checked today at 6:00 am</Text>
        </Stack>
        <Stack ref={listRef} as="ul" gap="md" aria-labelledby={titleId}>
          {checks.map((check) => (
            // The icon takes the text's colour and its own shape, so colour is never the only signal. The fix sits
            // under its own line, aligned with the words.
            <Stack as="li" key={check.id} direction="row" gap="2xs" align="start">
              <Text as="span" tone={check.tone} className="px-text-icon"><Icon name={check.icon} size="sm" decorative /></Text>
              <Stack gap="xs" width="fill">
                <Text as="span" tone={check.tone}>{check.text}</Text>
                {check.action ? <Stack align="start"><Button level="tertiary" size="sm" onClick={check.action.onClick}>{check.action.label}</Button></Stack> : null}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Stack>
      <Dialog open={confirming} onOpenChange={setConfirming} theme="negative" title="Remove 2 client guests?"
        description="Quan Ho (Lumen Bank) and Trang Le (Phin & Co) lose access to the projects shared with them. You can invite them again later."
        primaryAction={{ label: "Remove guests", level: "danger", onClick: () => { setGuestsRemoved(true); setConfirming(false); focusNext(); toast({ title: `${plural(2, "guest")} removed` }); } }}
        secondaryAction={{ label: "Cancel", autoFocus: true }} />
    </Card>
  );
}

// ——— 3. Long comments: clamp to three lines, open in place ——————————————————————————————————————————
type Comment = { id: string; author: PersonId; at: Date; text: string };
const comments: Comment[] = [
  { id: "c1", author: "chi", at: minutesAgo(0.5), text: "I moved the points history into its own tab instead of the bottom of the wallet. People in the last round kept scrolling past it, and the tab gives us room for filters by store and by month. Earned points are green with a plus sign, spent ones keep the minus sign and stay neutral, so the colour is never the only signal. Expiring points get a line of their own at the top with the date they go." },
  { id: "c2", author: "bao", at: minutesAgo(48), text: "The rewards API returns 50 rows a page, so endless scrolling is fine on our side." },
  { id: "c3", author: "ava", at: daysFromToday(-1, 16, 20), text: "From the five sessions: four people looked for their points under Account first, and two of them read “Pending” as “Lost”. Could we say when pending points land, like “Lands Oct 2”, instead of a status word? The one person who used the month filter liked it, but nobody found it without help, so it might need a label rather than an icon." },
  { id: "c4", author: "duy", at: daysFromToday(-2, 9, 45), text: "Phin & Co sign off on Friday, so let's freeze the copy by Thursday noon." },
];

/** True while the clamped text is cut off: only then does it need Show more. */
function useOverflow(clamped: boolean) {
  const ref = useRef<HTMLElement>(null);
  const [overflow, setOverflow] = useState(false);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !clamped || typeof ResizeObserver === "undefined") return undefined;
    const measure = () => setOverflow(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [clamped]);
  return [ref, overflow] as const;
}

function CommentItem({ comment }: { comment: Comment }) {
  const [expanded, setExpanded] = useState(false);
  const [textRef, overflow] = useOverflow(!expanded);
  const author = people[comment.author];
  const textId = useId();
  return (
    <Stack as="li" direction="row" gap="sm" align="start">
      <Avatar size="md" {...avatarOf(author)} />
      <Stack gap="xs" width="fill">
        {/* Weight sets the name apart and tone quiets the time; the sizes stay. */}
        <Stack direction="row" gap="2xs" align="baseline" wrap>
          <Text as="span" textStyle="Body/Small/Bold">{author.name}</Text>
          <Text as="span" textStyle="Caption/Regular" tone="light">{formatRelative(comment.at)}</Text>
        </Stack>
        {/* Clamped, the whole comment stays in the DOM, so a screen reader still reads it in full. */}
        <Text ref={textRef} id={textId} truncate={expanded ? undefined : 3}>{comment.text}</Text>
        {overflow || expanded ? (
          <Stack align="start"><Button level="tertiary" size="sm" aria-expanded={expanded} aria-controls={textId} onClick={() => setExpanded(!expanded)}>
            {expanded ? "Show less" : "Show more"}
          </Button></Stack>
        ) : null}
      </Stack>
    </Stack>
  );
}

function Comments() {
  const titleId = useId();
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Comments</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">PHIN-214 · Design the points history screen</Text>
        </Stack>
        <Stack as="ul" gap="md" aria-labelledby={titleId}>
          {comments.map((comment) => <CommentItem key={comment.id} comment={comment} />)}
        </Stack>
      </Stack>
    </Card>
  );
}

// ——— 4. Counts that agree with their noun ——————————————————————————————————————————————————————————
type Deliverable = { id: string; name: string; pages?: number; bytes: number };
const deliverables: Deliverable[] = [
  { id: "spec", name: "Points history – design spec.pdf", pages: 12, bytes: 4_210_000 },
  { id: "summary", name: "Sprint 14 summary.pdf", pages: 1, bytes: 380_000 },
  { id: "plan", name: "Android beta – test plan.pdf", pages: 4, bytes: 920_000 },
  { id: "contract", name: "Rewards API contract.json", bytes: 86_000 },
];
const clientEmail = "trang.le@phinco.vn";

function SendFiles() {
  const { toast } = useToast();
  const [picked, setPicked] = useState<string[]>(["spec", "summary"]);
  const [error, setError] = useState<string>();
  const titleId = useId();
  const chosen = deliverables.filter((file) => picked.includes(file.id));
  const bytes = chosen.reduce((sum, file) => sum + file.bytes, 0);
  const toggle = (id: string, on: boolean) => { setPicked((list) => (on ? [...list, id] : list.filter((item) => item !== id))); setError(undefined); };
  // Nothing chosen: the error goes on the group and Form moves focus to it and announces it.
  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chosen.length) { setError("Choose at least one file to send."); return; }
    toast({ type: "positive", title: `${plural(chosen.length, "file")} sent`, children: `To ${clientEmail}` });
    setPicked([]);
  };
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Send files to Phin & Co</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`To ${clientEmail}`}</Text>
        </Stack>
        <Form onSubmit={send} gap="md" aria-labelledby={titleId}>
          <FormFieldset kind="checkbox" legend="Files to send" hideLegend error={error}>
            {deliverables.map((file) => (
              <Checkbox key={file.id} label={file.name} checked={picked.includes(file.id)} onCheckedChange={(on) => toggle(file.id, on)}
                caption={file.pages ? `${plural(file.pages, "page")} · ${formatBytes(file.bytes)}` : formatBytes(file.bytes)} />
            ))}
          </FormFieldset>
          {/* Every count goes through plural(): 1 file, 2 files, 1 page, 12 pages. */}
          <Text role="status" textStyle="Body/Small/Regular" tone="base">
            {chosen.length ? `${plural(chosen.length, "file")} selected · ${formatBytes(bytes)}` : "No files selected"}
          </Text>
          <FormActions>
            <Button level="primary" type="submit">{chosen.length ? `Send ${plural(chosen.length, "file")}` : "Send files"}</Button>
          </FormActions>
        </Form>
      </Stack>
    </Card>
  );
}

// ——— 5. On a phone: the large title or the compact bar title is the h1 ———————————————————————————
const moreTasks: Task[] = [
  { id: "t11", key: "PHIN-226", title: "Plan the Android beta with Phin & Co", project: "phin-loyalty", assignee: "duy", status: "To do", priority: "Medium", due: daysFromToday(4), comments: 1 },
  { id: "t12", key: "PHIN-228", title: "Fix points rounding on refunds", project: "phin-loyalty", assignee: "bao", status: "In progress", priority: "High", due: daysFromToday(1), comments: 4 },
  { id: "t13", key: "LUM-097", title: "Prototype the daily limit change", project: "lumen-banking", assignee: "alex", status: "In progress", priority: "High", due: daysFromToday(4), comments: 3 },
  { id: "t14", key: "ZEN-408", title: "Ship the scroll fold for Top Navigation", project: "zen-ds", assignee: "finn", status: "In progress", priority: "High", due: daysFromToday(3), comments: 7 },
  { id: "t15", key: "SAO-006", title: "Shortlist photographers for the outdoor shoot", project: "saola-brand", assignee: "linh", status: "To do", priority: "Low", due: daysFromToday(10), comments: 0 },
];
/** Open work first, soonest due on top; finished tasks after it. */
const followed = [...tasks, ...moreTasks].sort((a, b) => Number(a.status === "Done") - Number(b.status === "Done") || a.due.getTime() - b.due.getTime());
/** A Done task says it is done; open work says when it is due. */
const dueLine = (task: Task) => (task.status === "Done" ? "Done" : formatDue(task.due));
/** What happened to a task, oldest first: created by Alex, picked up by its assignee, then its latest status. */
const historyOf = (task: Task) => [
  { id: "created", who: "alex" as PersonId, text: "Created the task", at: daysFromToday(-12, 9, 0) },
  ...(task.status !== "To do" ? [{ id: "started", who: task.assignee, text: "Started work", at: daysFromToday(-4, 14, 10) }] : []),
  ...(task.status === "In review" || task.status === "Done" ? [{ id: "status", who: task.assignee, text: `Moved it to ${task.status}`, at: daysFromToday(-1, 17, 25) }] : []),
].reverse();

/** The roots of the studio's phone app, in its bottom bar: a selected root shows its solid icon. */
const phoneRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "inbox", label: "Inbox", icon: "icon-message-chat-circle-line", selectedIcon: "icon-message-chat-circle-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
const openCount = followed.filter((task) => task.status !== "Done").length;
/** The list's two groups: open work, soonest due first, then what is done. */
const taskGroups = [
  { id: "open", title: "Open", rows: followed.filter((task) => task.status !== "Done") },
  { id: "done", title: "Done", rows: followed.filter((task) => task.status === "Done") },
];

function PhoneHeadings() {
  const notHere = useNotHere();
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const groupId = useId();
  const activityId = useId();
  const task = followed.find((item) => item.id === openId);
  if (!task) {
    return (
      // A tab root: the large title is the screen's h1 (Heading/1) and folds into the bar as the list scrolls; the groups
      // under it are h2 kickers. The bottom bar casts a shadow, so each group's block takes the same Shadow elevation.
      <PlatformPhone key="tasks" label="Zen tasks" screenRef={screenRef}>
        <AppShell
          topNavigation={<TopNavigation title="Tasks" largeTitle="Tasks" largeTitleSubheading={`${plural(openCount, "open task")} you follow`} scrollRef={screenRef} />}
          bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={phoneRoots} value="tasks"
            onValueChange={(id) => { if (id !== "tasks") notHere(phoneRoots.find((item) => item.id === id)?.label ?? id); }} />}
        >
          {screen.anchor}
          {taskGroups.map((group) => (
            <Stack key={group.id} as="section" gap="xs" aria-labelledby={`${groupId}-${group.id}`}>
              <Box paddingX="lg"><Heading level={2} id={`${groupId}-${group.id}`} textStyle="Body/Small/Bold" tone="light">{group.title}</Heading></Box>
              <ListBox theme="shadow">
                <List aria-labelledby={`${groupId}-${group.id}`}>
                  {group.rows.map((item) => (
                    <ListItem key={item.id} data-task={item.id} title={item.title} titleLines={2} caption={`${item.key} · ${dueLine(item)}`}
                      leading={<Avatar size="md" {...avatarOf(people[item.assignee])} />}
                      onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpenId(item.id))} />
                  ))}
                </List>
              </ListBox>
            </Stack>
          ))}
        </AppShell>
      </PlatformPhone>
    );
  }
  const project = projectById(task.project);
  return (
    // A pushed screen: the compact bar title is its h1 in the bar's own style, so the content starts at h2. No bottom bar.
    <PlatformPhone key={task.id} label="Zen tasks" screenRef={screenRef}>
      <AppShell
        topNavigation={<TopNavigation type="compact-alt" title={task.key} scrollRef={screenRef}
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go(`[data-task="${task.id}"] .zen-list-item__wrapper`, () => setOpenId(null)) }} />}
      >
        {screen.anchor}
        {/* The task's name leads the screen as bold text, not as a second h1; the Body spaces the sections
            Layout-Mobile/Section-Gap apart. */}
        <Stack gap="lg">
          <Stack gap="xs">
            <Text textStyle="Body/Extra/Bold">{task.title}</Text>
            <Text textStyle="Body/Small/Regular" tone="base">{`${project.name} · ${project.client}`}</Text>
          </Stack>
          <DescriptionList items={[
            { id: "status", term: "Status", description: <Badge theme={taskStatusTheme[task.status]} background="subtle">{task.status}</Badge> },
            { id: "assignee", term: "Assignee", description: people[task.assignee].name },
            { id: "priority", term: "Priority", description: <Badge theme={priorityTheme[task.priority]} background="subtle">{task.priority}</Badge> },
            // Open work says when it is due; a Done task's status already says it is finished.
            ...(task.status === "Done" ? [] : [{ id: "due", term: "Due", description: formatDate(task.due) }]),
          ]} />
        </Stack>
        <Stack as="section" gap="xs" aria-labelledby={activityId}>
          <Heading level={2} id={activityId} textStyle="Body/Small/Bold" tone="light">Activity</Heading>
          <List aria-labelledby={activityId}>
            {historyOf(task).map((event) => (
              <ListItem key={event.id} title={event.text} caption={`${people[event.who].name} · ${formatRelative(event.at)}`}
                leading={<Avatar size="md" {...avatarOf(people[event.who])} />} />
            ))}
          </List>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— 6. Mixed styles: TextRun gives a few words weight or colour inside one sentence ——————————————————————————
function PlanRenewal() {
  const { toast } = useToast();
  const [unpaid, setUnpaid] = useState(2);
  const titleId = useId();
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={2} id={titleId} textStyle="Heading/Subheading">Pro plan</Heading>
          {/* One sentence, read as one: the date and the price are bold, the unpaid seats take the Negative tone. */}
          <Text role="status">
            Your plan renews on <TextRun bold>{formatDate(daysFromToday(33))}</TextRun> for <TextRun bold>$48</TextRun> a month
            {unpaid ? ". " : ", every seat paid."}
            {unpaid ? <TextRun tone="negative-base">{plural(unpaid, "seat")}</TextRun> : null}
            {unpaid ? ` ${unpaid === 1 ? "is" : "are"} unpaid.` : null}
          </Text>
          <Text textStyle="Body/Small/Regular" tone="base">
            Was <TextRun strikethrough>$60</TextRun>: the yearly discount applies from your next bill.
          </Text>
        </Stack>
        {unpaid ? (
          <Button level="primary" onClick={() => { setUnpaid(0); toast({ type: "positive", title: `${plural(unpaid, "seat")} paid` }); }}>
            {`Pay for ${plural(unpaid, "seat")}`}
          </Button>
        ) : null}
      </Stack>
    </Card>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Page outline",
    screen: true,
    description: "The Loyalty app's project page in the studio's app. One h1 names the page: the PageHeader (Heading/1) in the shell's header. Sections are h2 in Heading/4 and the cards under them h3 in Heading/Subheading: the level follows the outline, the style follows the kind of content. Under each title, tone steps down from Base to Light while the size stays.",
    render: () => <ProjectPage />,
    code: `<AppShell
  sidebar={<Sidebar logo={logo} sections={studioNav} selectedId="projects" onItemClick={navigate} />}
  header={
    <AppShellHeader
      leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: "phin-loyalty", label: "Loyalty app" }]} onNavigate={go} />}
      actions={<>{notifications}{account}</>}
      main={<PageHeader title="Loyalty app" description="Phin & Co · Led by Chi Tran · Due Nov 2, 2026"
        actions={<>
          <Button level="tertiary" startIcon="icon-share-01-line" onClick={share}>Share</Button>
          <Button level="primary" startIcon="icon-plus-line" onClick={newTask}>New task</Button>
        </>} />}
    />
  }
>
  <Stack as="section" gap="md" aria-labelledby="milestones">
    <Heading level={2} id="milestones" textStyle="Heading/4">Milestones</Heading>
    <Grid columns={{ mobile: 1, desktop: 3 }} gap="md">
      <Card as="section" theme="shadow" aria-labelledby="rewards">
        <Stack gap="xs">
          <Heading level={3} id="rewards" textStyle="Heading/Subheading">Points and rewards</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{\`6 of \${plural(9, "task")} done\`}</Text>
          <Text textStyle="Caption/Regular" tone="light">Due Oct 9, 2026</Text>
        </Stack>
      </Card>
    </Grid>
  </Stack>
  {/* Open tasks and Team: two more h2 sections */}
</AppShell>`,
  },
  {
    title: "Status text",
    description: "A check's result takes its colour family's tone (positive, warning, negative) on both the icon and the words, so the colour is never the only signal. Fixing a check rewrites the line: Renew certificate turns it positive, and removing guests asks first in a Negative Dialog.",
    render: () => <SecurityChecks />,
    code: `<Stack as="li" direction="row" gap="2xs" align="start">
  <Text as="span" tone="warning"><Icon name="icon-alert-triangle-line" size="sm" decorative /></Text>
  <Stack gap="xs">
    <Text as="span" tone="warning">The single sign-on certificate expires in 5 days</Text>
    <Button level="tertiary" size="sm" onClick={renew}>Renew certificate</Button>
  </Stack>
</Stack>`,
  },
  {
    title: "Clamp long comments",
    description: "truncate={3} keeps a long comment to three lines; Show more (with aria-expanded) opens it in place and appears only when the text is really cut. The full text stays in the DOM for screen readers. The name is bold and the time is Light: weight and tone set the hierarchy, not size.",
    render: () => <Comments />,
    code: `<Stack direction="row" gap="2xs" align="baseline" wrap>
  <Text as="span" textStyle="Body/Small/Bold">{author.name}</Text>
  <Text as="span" textStyle="Caption/Regular" tone="light">{formatRelative(comment.at)}</Text>
</Stack>
<Text ref={textRef} id={textId} truncate={expanded ? undefined : 3}>{comment.text}</Text>
{/* overflow: scrollHeight > clientHeight while clamped */}
{overflow || expanded ? (
  <Button level="tertiary" size="sm" aria-expanded={expanded} aria-controls={textId} onClick={() => setExpanded(!expanded)}>
    {expanded ? "Show less" : "Show more"}
  </Button>
) : null}`,
  },
  {
    title: "Counts that agree",
    description: "plural() writes “1 page” and “12 pages”, “1 file” and “2 files”, in captions, the selection line, the button label and the toast. Sending with nothing chosen puts the error on the group, and Form moves focus to it.",
    render: () => <SendFiles />,
    code: `<Checkbox label={file.name} checked={picked.includes(file.id)} onCheckedChange={(on) => toggle(file.id, on)}
  caption={\`\${plural(file.pages, "page")} · \${formatBytes(file.bytes)}\`} />

<Text role="status" textStyle="Body/Small/Regular" tone="base">
  {chosen.length ? \`\${plural(chosen.length, "file")} selected · \${formatBytes(bytes)}\` : "No files selected"}
</Text>
<FormActions>
  <Button level="primary" type="submit">{chosen.length ? \`Send \${plural(chosen.length, "file")}\` : "Send files"}</Button>
</FormActions>`,
  },
  {
    title: "Mixed styles in a sentence",
    description: "TextRun gives a few words a style of their own inside one Text (Figma's mixed styles): the renewal date and the price in Bold, the unpaid seats in the Negative tone, an old price struck through. The sentence stays one text, so it is read and translated whole. Paying the seats rewrites it.",
    render: () => <PlanRenewal />,
    code: `<Text role="status">
  Your plan renews on <TextRun bold>{renewal}</TextRun> for <TextRun bold>$48</TextRun> a month.{" "}
  <TextRun tone="negative-base">{plural(unpaid, "seat")}</TextRun> are unpaid.
</Text>
<Text textStyle="Body/Small/Regular" tone="base">
  Was <TextRun strikethrough>$60</TextRun>: the yearly discount applies from your next bill.
</Text>`,
  },
  {
    title: "Headings on a phone",
    description: "In the studio's phone app, the Tasks root's large title is the screen's h1 (Heading/1) and folds into the bar as the list scrolls; its groups are h2 kickers. A pushed screen's compact bar title is its h1 in the bar's style, so the content starts at h2: the task's name is bold text and Activity is a kicker. PlatformPhone sets the mobile type scale; no component changes.",
    render: () => <PhoneHeadings />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

{/* Tab root: the large title is the h1, the groups are h2 kickers */}
<PlatformPhone key="tasks" screenRef={screenRef}>
  <AppShell
    topNavigation={<TopNavigation title="Tasks" largeTitle="Tasks" largeTitleSubheading="12 open tasks you follow" scrollRef={screenRef} />}
    bottomNavigation={<BottomNavigation aria-label="Đìzai Studio" showLabels items={roots} value="tasks" onValueChange={go} />}
  >
    <Stack as="section" gap="xs" aria-labelledby="open">
      <Box paddingX="lg"><Heading level={2} id="open" textStyle="Body/Small/Bold" tone="light">Open</Heading></Box>
      <ListBox theme="shadow"><List aria-labelledby="open">…</List></ListBox>
    </Stack>
  </AppShell>
</PlatformPhone>

{/* Pushed screen: the compact bar title is the h1, the content starts at h2 */}
<PlatformPhone key={task.id} screenRef={screenRef}>
  <AppShell
    topNavigation={<TopNavigation type="compact-alt" title={task.key} scrollRef={screenRef}
      leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
  >
    <Stack gap="lg">
      <Stack gap="xs">
        <Text textStyle="Body/Extra/Bold">{task.title}</Text>
        <Text textStyle="Body/Small/Regular" tone="base">{\`\${project.name} · \${project.client}\`}</Text>
      </Stack>
      <DescriptionList items={details} />
    </Stack>
    <Stack as="section" gap="xs" aria-labelledby="activity">
      <Heading level={2} id="activity" textStyle="Body/Small/Bold" tone="light">Activity</Heading>
      <List aria-labelledby="activity">…</List>
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
]);
