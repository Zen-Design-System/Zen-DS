/* Text & Heading examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex
   Duong, Wednesday Sep 30, 2026, 10:30 am. Each example teaches one copy decision: the heading level follows the page
   outline while the style follows the kind of content, status text pairs its colour with an icon and words, long copy
   clamps and opens in place, counts agree with their noun, and a phone's h1 is its large or compact bar title. */
import { useId, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Checkbox } from "../../../components/Checkbox";
import { DescriptionList } from "../../../components/DescriptionList";
import { Dialog } from "../../../components/Dialog";
import { Form, FormActions, FormFieldset } from "../../../components/Form";
import { Icon, type IconName } from "../../../components/Icon";
import { Box, Container, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { PageHeader } from "../../../components/PageHeader";
import { SidePanel } from "../../../components/SidePanel";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import {
  TODAY, daysFromToday, formatBytes, formatDate, formatDue, formatRelative, initials, people, priorityTheme, projectById, taskStatusTheme,
  tasks, type Person, type PersonId, type Task,
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

// ——— 1. Page outline: one h1, h2 sections, h3 card titles ——————————————————————————————————————————
type Milestone = { id: string; name: string; done: number; total: number; date: Date; finished?: boolean };
const milestones: Milestone[] = [
  { id: "discovery", name: "Discovery and research", done: 8, total: 8, date: daysFromToday(-40), finished: true },
  { id: "rewards", name: "Points and rewards", done: 6, total: 9, date: daysFromToday(9) },
  { id: "android", name: "Android launch", done: 1, total: 7, date: daysFromToday(33) },
];
const loyaltyTasks = tasks.filter((task) => task.project === "phin-loyalty" && task.status !== "Done");

function ProjectPage() {
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
    <Container maxWidth="lg">
      <Stack paddingY="xl" gap="xl">
        {/* The page title: PageHeader renders the screen's one h1 in Heading/1. */}
        <PageHeader title="Loyalty app" description={`Phin & Co · Led by ${people.chi.name} · Due ${formatDate(daysFromToday(33))}`}
          actions={<>
            <Button level="tertiary" startIcon="icon-share-01-line" onClick={() => setSharing(true)}>Share</Button>
            <Button level="primary" startIcon="icon-plus-line" onClick={() => setCreating(true)}>New task</Button>
          </>} />
        <Stack as="section" gap="md" aria-labelledby={`${baseId}-milestones`}>
          <Heading level={2} id={`${baseId}-milestones`} textStyle="Heading/4">Milestones</Heading>
          <Grid columns={{ mobile: 1, desktop: 3 }} gap="md">
            {milestones.map((milestone) => (
              <Card key={milestone.id} as="section" theme="flat" aria-labelledby={`${baseId}-${milestone.id}`}>
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
        <Stack as="section" gap="md" aria-labelledby={`${baseId}-tasks`}>
          <Heading level={2} id={`${baseId}-tasks`} textStyle="Heading/4">Open tasks</Heading>
          <ListBox>
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
      </Stack>
      <SidePanel type="modal" size="small" open={Boolean(opened)} onOpenChange={(next) => { if (!next) setOpenId(null); }}
        title={opened?.title ?? ""} description={opened ? `${opened.key} · Loyalty app` : undefined}>
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
    </Container>
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
    <Card as="section" theme="flat" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading ref={titleRef} level={4} id={titleId} tabIndex={-1} textStyle="Heading/Subheading">Workspace security</Heading>
          <Text textStyle="Caption/Regular" tone="light">Checked today at 6:00 am</Text>
        </Stack>
        <Stack ref={listRef} as="ul" gap="md" aria-labelledby={titleId} className="px-text-checks">
          {checks.map((check) => (
            // The icon takes the text's colour and its own shape, so colour is never the only signal. The fix sits
            // under its own line, aligned with the words.
            <Stack as="li" key={check.id} direction="row" gap="2xs" align="start">
              <Text as="span" tone={check.tone} className="px-text-icon"><Icon name={check.icon} size="sm" decorative /></Text>
              <Stack gap="xs" className="px-text-grow">
                <Text as="span" tone={check.tone}>{check.text}</Text>
                {check.action ? <Button level="tertiary" size="sm" className="px-text-start" onClick={check.action.onClick}>{check.action.label}</Button> : null}
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
      <Stack gap="xs" className="px-text-grow">
        {/* Weight sets the name apart and tone quiets the time; the sizes stay. */}
        <Stack direction="row" gap="2xs" align="baseline" wrap>
          <Text as="span" textStyle="Body/Small/Bold">{author.name}</Text>
          <Text as="span" textStyle="Caption/Regular" tone="light">{formatRelative(comment.at)}</Text>
        </Stack>
        {/* Clamped, the whole comment stays in the DOM, so a screen reader still reads it in full. */}
        <Text ref={textRef} id={textId} truncate={expanded ? undefined : 3}>{comment.text}</Text>
        {overflow || expanded ? (
          <Button level="tertiary" size="sm" className="px-text-start" aria-expanded={expanded} aria-controls={textId} onClick={() => setExpanded(!expanded)}>
            {expanded ? "Show less" : "Show more"}
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}

function Comments() {
  const titleId = useId();
  return (
    <Card as="section" theme="flat" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Comments</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">PHIN-214 · Design the points history screen</Text>
        </Stack>
        <Stack as="ul" gap="md" aria-labelledby={titleId} className="px-text-checks">
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
    <Card as="section" theme="flat" aria-labelledby={titleId}>
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

function PhoneHeadings() {
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const activityId = useId();
  const task = followed.find((item) => item.id === openId);
  if (!task) {
    return (
      // A tab root: the large title is the screen's h1 (Heading/1) and folds into the bar as the list scrolls.
      <PlatformPhone key="tasks" label="Zen tasks" headerOverlay screenRef={screenRef}
        header={<TopNavigation title="Tasks" largeTitle="Tasks" scrollRef={screenRef} />}>
        {screen.anchor}
        {/* The rows sit in the screen margin (Margin/Comfortable, 20px), so their fill stays 8px off the screen edge; Padding/XSmall (8px, the phone's List-Container-Vertical-Padding) above and below, like a List-Box. */}
        <Box paddingX="lg" paddingY="xs">
          <List aria-label="Tasks">
            {followed.map((item) => (
              <ListItem key={item.id} data-task={item.id} title={item.title} titleLines={1} caption={`${item.key} · ${dueLine(item)}`}
                leading={<Avatar size="md" {...avatarOf(people[item.assignee])} />}
                onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpenId(item.id))} />
            ))}
          </List>
        </Box>
      </PlatformPhone>
    );
  }
  const project = projectById(task.project);
  return (
    // A pushed screen: the compact bar title is its h1 in the bar's own style, so the content starts at h2.
    <PlatformPhone key={task.id} label="Zen tasks" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact" title={task.key} scrollRef={screenRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go(`[data-task="${task.id}"] .zen-list-item__wrapper`, () => setOpenId(null)) }} />}>
      {screen.anchor}
      <Stack gap="lg" paddingY="lg">
        <Stack gap="lg" paddingX="lg">
          {/* The task's name leads the screen as bold text, not as a second h1. */}
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
        <Stack as="section" gap="xs" paddingX="lg" aria-labelledby={activityId}>
          <Heading level={2} id={activityId} textStyle="Body/Small/Bold" tone="light">Activity</Heading>
          <List aria-labelledby={activityId}>
            {historyOf(task).map((event) => (
              <ListItem key={event.id} title={event.text} caption={`${people[event.who].name} · ${formatRelative(event.at)}`}
                leading={<Avatar size="md" {...avatarOf(people[event.who])} />} />
            ))}
          </List>
        </Stack>
      </Stack>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Page outline",
    screen: true,
    description: "One h1 names the page (PageHeader, Heading/1). Sections are h2 in Heading/4 and the cards under them h3 in Heading/Subheading: the level follows the outline, the style follows the kind of content. Under each title, tone steps down from Base to Light while the size stays.",
    render: () => <ProjectPage />,
    code: `<PageHeader title="Loyalty app" description="Phin & Co · Led by Chi Tran · Due Nov 2, 2026"
  actions={<>
    <Button level="tertiary" startIcon="icon-share-01-line" onClick={share}>Share</Button>
    <Button level="primary" startIcon="icon-plus-line" onClick={newTask}>New task</Button>
  </>} />

<Stack as="section" gap="md" aria-labelledby="milestones">
  <Heading level={2} id="milestones" textStyle="Heading/4">Milestones</Heading>
  <Grid columns={{ mobile: 1, desktop: 3 }} gap="md">
    <Card as="section" theme="flat" aria-labelledby="rewards">
      <Stack gap="xs">
        <Heading level={3} id="rewards" textStyle="Heading/Subheading">Points and rewards</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">{\`6 of \${plural(9, "task")} done\`}</Text>
        <Text textStyle="Caption/Regular" tone="light">Due Oct 9, 2026</Text>
      </Stack>
    </Card>
  </Grid>
</Stack>`,
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
    title: "Headings on a phone",
    description: "On a tab root the large title is the screen's h1 (Heading/1) and folds into the bar as the list scrolls. A pushed screen's compact bar title is its h1 in the bar's style, so the content starts at h2: the task's name is bold text and Activity is a kicker. PlatformPhone sets the mobile type scale; no component changes.",
    render: () => <PhoneHeadings />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

{/* Tab root: the large title is the h1 */}
<PlatformPhone key="tasks" headerOverlay screenRef={screenRef}
  header={<TopNavigation title="Tasks" largeTitle="Tasks" scrollRef={screenRef} />}>
  <Box paddingX="lg" paddingY="xs"><List aria-label="Tasks">…</List></Box> {/* rows in the screen margin (20px), Padding/XSmall above and below */}
</PlatformPhone>

{/* Pushed screen: the compact bar title is the h1, the content starts at h2 */}
<PlatformPhone key={task.id} headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact" title={task.key} scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}>
  <Stack gap="lg" paddingY="lg">
    <Stack gap="lg" paddingX="lg">
      <Stack gap="xs">
        <Text textStyle="Body/Extra/Bold">{task.title}</Text>
        <Text textStyle="Body/Small/Regular" tone="base">{\`\${project.name} · \${project.client}\`}</Text>
      </Stack>
      <DescriptionList items={details} />
    </Stack>
    <Stack as="section" gap="xs" paddingX="lg" aria-labelledby="activity">
      <Heading level={2} id="activity" textStyle="Body/Small/Bold" tone="light">Activity</Heading>
      <List aria-labelledby="activity">…</List>
    </Stack>
  </Stack>
</PlatformPhone>`,
  },
]);
