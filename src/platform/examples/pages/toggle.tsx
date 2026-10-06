import { useEffect, useId, useRef, useState } from "react";
import type { PlatformPage } from "../../PlatformExamples";
import type { ExampleDef } from "../types";
import { PlatformPhone } from "../../PlatformPhone";
import { Avatar, type AvatarSize } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Card } from "../../../components/Card";
import { Divider } from "../../../components/Divider";
import { DockIcon } from "../../../components/DockIcon";
import { FormFieldset } from "../../../components/Form";
import { InlineMessage } from "../../../components/InlineMessage";
import { Box, Container, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { PageHeader } from "../../../components/PageHeader";
import { Table, TableMedia, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { Toggle, ToggleButton } from "../../../components/Toggle";
import { TopNavigation } from "../../../components/TopNavigation";
import { TODAY, daysFromToday, formatDue, formatRelative, formatTime, initials, me, people, studio, taskStatusTheme, type Person, type TaskStatus } from "../data";
import "./toggle.css";

export const page: PlatformPage = "toggle";

/** People are Avatars: a photo when there is one, otherwise solid initials on the person's steady theme (one look on every page).
 *  Beside a written name the Avatar is decorative (alt=""); `named` gives it the name when nothing else says who it is. */
function PersonAvatar({ person, size, named = false }: { person: Person; size: AvatarSize; named?: boolean }) {
  const alt = named ? person.name : "";
  return person.photo
    ? <Avatar size={size} theme="photo" src={person.photo} alt={alt} />
    : <Avatar size={size} theme={person.theme} alt={alt}>{initials(person.name)}</Avatar>;
}

/* ───────────── Notification settings: a settings page, master toggle ───────────── */

type NotificationKey = "mentions" | "reviews" | "summary" | "assigned" | "due" | "clients";
const notificationGroups: Array<{ id: string; title: string; rows: Array<{ key: NotificationKey; label: string; caption: string }> }> = [
  { id: "email", title: "Email", rows: [
    { key: "mentions", label: "Mentions and replies", caption: "When someone @mentions you or replies to your comment" },
    { key: "reviews", label: "Review requests", caption: "When a design or a task waits for your approval" },
    { key: "summary", label: "Weekly summary", caption: "Progress on your projects, every Monday at 9:00 am" },
  ] },
  { id: "push", title: "Push on your phone", rows: [
    { key: "assigned", label: "Task assignments", caption: "When someone gives you a task" },
    { key: "due", label: "Due date reminders", caption: "At 9:00 am on the day before a task is due" },
    { key: "clients", label: "Client comments", caption: "When a guest from Phin & Co, Lumen Bank or another client comments" },
  ] },
];

function NotificationSettingsExample() {
  const { toast } = useToast();
  const headingId = useId();
  const [paused, setPaused] = useState(false);
  const [prefs, setPrefs] = useState<Record<NotificationKey, boolean>>({ mentions: true, reviews: true, summary: false, assigned: true, due: true, clients: false });
  // A switch applies at once. Pausing everything is a big change, so it confirms in a Toast; Undo restores and closes it.
  const pause = (next: boolean) => {
    setPaused(next);
    if (!next) return;
    toast({ title: "Notifications paused", action: { label: "Undo", onClick: () => setPaused(false) } });
  };
  return (
    <div className="px-toggle-page">
      <Container maxWidth="md">
        <Stack gap="xl" paddingY="xl">
          <PageHeader eyebrow="Settings" title="Notifications" description="Choose what Zen tells you about and where. Changes save as you make them." />
          <Card theme="flat">
            <Toggle className="px-toggle-fill" size="md" bold={false} label="Pause all notifications"
              caption={paused ? `Paused at ${formatTime(TODAY)}. Nothing reaches you until you turn this off.` : "Mute email and push for a while, for example during a client workshop."}
              checked={paused} onCheckedChange={pause} />
          </Card>
          {notificationGroups.map((group) => (
            <Stack as="section" key={group.id} gap="xs" aria-labelledby={`${headingId}-${group.id}`}>
              <Heading level={2} id={`${headingId}-${group.id}`} textStyle="Heading/4">{group.title}</Heading>
              <Card theme="flat">
                <FormFieldset kind="toggle" legend={group.title} hideLegend gap="md">
                  {group.rows.map((row) => (
                    <Toggle key={row.key} size="md" label={row.label} caption={row.caption} disabled={paused}
                      checked={prefs[row.key]} onCheckedChange={(on) => setPrefs((current) => ({ ...current, [row.key]: on }))} bold={false} />
                  ))}
                </FormFieldset>
              </Card>
            </Stack>
          ))}
        </Stack>
      </Container>
    </div>
  );
}

/* ───────────── Early access: switch-only ToggleButton in a table ───────────── */

type Feature = { id: string; name: string; description: string; audience: string; on: boolean; changedAt: Date; changedBy: Person };
const earlyAccess: Feature[] = [
  { id: "ai-summaries", name: "AI task summaries", description: "Sum up a long task thread in one paragraph", audience: "Everyone", on: true, changedAt: daysFromToday(-16, 15, 20), changedBy: people.finn },
  { id: "time-tracking", name: "Time tracking on tasks", description: "Log hours from a task; they flow into invoices", audience: "Everyone", on: true, changedAt: daysFromToday(-40, 9, 5), changedBy: people.mai },
  { id: "client-guests", name: "Client guest access", description: "Invite client contacts to comment on files", audience: "Client Services", on: false, changedAt: daysFromToday(-3, 11, 45), changedBy: people.hana },
  { id: "file-viewer", name: "New file viewer", description: "Faster previews for Figma, PDF and video files", audience: "Design team", on: true, changedAt: daysFromToday(-1, 16, 5), changedBy: people.chi },
  { id: "offline", name: "Offline projects on mobile", description: "Open pinned projects without a connection", audience: "Everyone", on: false, changedAt: daysFromToday(-9, 14, 30), changedBy: people.bao },
];

function EarlyAccessExample() {
  const { toast } = useToast();
  const headingId = useId();
  const [features, setFeatures] = useState(earlyAccess);
  const update = (next: Feature) => setFeatures((list) => list.map((feature) => (feature.id === next.id ? next : feature)));
  // The whole group gets the change at once, so the Toast offers Undo, which puts the row back and closes the Toast.
  const flip = (feature: Feature, on: boolean) => {
    update({ ...feature, on, changedAt: TODAY, changedBy: me });
    toast({ title: `${feature.name} turned ${on ? "on" : "off"}`, action: { label: "Undo", onClick: () => update(feature) } });
  };
  const columns: TableColumn<Feature>[] = [
    { id: "feature", header: "Feature", cell: (feature) => <TableText bold caption={feature.description}>{feature.name}</TableText> },
    { id: "audience", header: "Available to", cell: (feature) => <TableText>{feature.audience}</TableText> },
    { id: "changed", header: "Last changed", cell: (feature) => <TableMedia bold={false} media={<PersonAvatar person={feature.changedBy} size="small" />} caption={formatRelative(feature.changedAt)}>{feature.changedBy.name}</TableMedia> },
    // The row names the switch: its aria-label is the feature, so a screen reader hears "AI task summaries, switch, on".
    { id: "on", header: "Enabled", align: "right", width: "96px", cell: (feature) => <ToggleButton aria-label={feature.name} checked={feature.on} onCheckedChange={(on) => flip(feature, on)} /> },
  ];
  return (
    // A section of a settings page: the Table sits straight on the page under its heading, with no container.
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack gap="xs">
        <Heading level={4} id={headingId} textStyle="Heading/4">Early access</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">Features still in testing at {studio.name}. A change applies at once to everyone it is available to.</Text>
      </Stack>
      <Table className="px-toggle-table" aria-labelledby={headingId} rows={features} columns={columns} />
    </Stack>
  );
}

/* ───────────── Show completed: toggle-first in a list toolbar ───────────── */

type WeekTask = { id: string; key: string; title: string; assignee: Person; status: TaskStatus; when: string };
const weekTasks: WeekTask[] = [
  { id: "t5", key: "LUM-091", title: "Audit the account overview for WCAG 2.2", assignee: people.alex, status: "To do", when: formatDue(daysFromToday(0)) },
  { id: "t7", key: "ZEN-402", title: "Add Disabled back to Input and Search", assignee: people.bao, status: "Done", when: "Completed today" },
  { id: "t2", key: "PHIN-219", title: "Connect the rewards API to checkout", assignee: people.bao, status: "In review", when: formatDue(daysFromToday(1)) },
  { id: "t1", key: "PHIN-214", title: "Design the points history screen", assignee: people.chi, status: "In progress", when: formatDue(daysFromToday(2)) },
  { id: "t6", key: "LUM-095", title: "Spike: passkey sign-in on iOS", assignee: people.finn, status: "Done", when: "Completed Monday" },
];

function ShowCompletedExample() {
  const headingId = useId();
  const [showDone, setShowDone] = useState(false);
  const shown = showDone ? weekTasks : weekTasks.filter((task) => task.status !== "Done");
  return (
    // The view option heads the box (Figma List-Box Header-Slot): header and rows share Card-padding-medium, so they line
    // up on every device; rows have no side padding of their own.
    <ListBox header={
      <Stack direction="row" justify="between" align="center" gap="sm" wrap>
        <Heading level={4} id={headingId} textStyle="Body/Small/Bold" tone="light">Due this week</Heading>
        <Toggle className="px-toggle-hug" theme="toggle-first" size="md" label="Show completed" checked={showDone} onCheckedChange={setShowDone} />
      </Stack>
    }>
      <List aria-labelledby={headingId}>
        {shown.map((task) => (
          // The task title is the row's content and nothing opens it: it may wrap to a second line, never cut.
          <ListItem key={task.id} title={task.title} titleLines={2} caption={`${task.key} · ${task.when}`}
            leading={<PersonAvatar person={task.assignee} size="medium" named />}
            trailing={<Badge theme={taskStatusTheme[task.status]} background="subtle">{task.status}</Badge>} />
        ))}
      </List>
    </ListBox>
  );
}

/* ───────────── Integrations: saving, failure and retry ───────────── */

type SyncState = "off" | "connecting" | "on" | "failed";

function IntegrationsExample() {
  const [calendar, setCalendar] = useState<SyncState>("off");
  const [slack, setSlack] = useState(true);
  const attempts = useRef(0);
  // Demo: the first connection times out, the retry goes through.
  useEffect(() => {
    if (calendar !== "connecting") return undefined;
    const timer = window.setTimeout(() => { attempts.current += 1; setCalendar(attempts.current === 1 ? "failed" : "on"); }, 1400);
    return () => window.clearTimeout(timer);
  }, [calendar]);
  const calendarCaption = calendar === "connecting" ? "Connecting to Google Calendar…" : calendar === "on" ? `Due dates go to ${me.email}` : "Due dates of your tasks show up in your calendar";
  return (
    <Card theme="flat">
      <Stack gap="md">
        <Stack direction="row" gap="md" align="center">
          <DockIcon icon="icon-calendar-line" theme="blue" background="subtle" size="medium" />
          <Toggle className="px-toggle-grow" size="md" label="Sync due dates to Google Calendar" caption={calendarCaption}
            checked={calendar === "on" || calendar === "connecting"} disabled={calendar === "connecting"}
            onCheckedChange={(on) => setCalendar(on ? "connecting" : "off")}
            bold />
        </Stack>
        {calendar === "failed" ? (
          <InlineMessage theme="negative" title="Couldn't connect Google Calendar" action={{ label: "Try again", onClick: () => setCalendar("connecting") }}>
            Google didn't answer in time, so nothing was synced.
          </InlineMessage>
        ) : null}
        <Divider />
        <Stack direction="row" gap="md" align="center">
          <DockIcon icon="icon-hash-01-line" theme="purple" background="subtle" size="medium" />
          <Toggle className="px-toggle-grow" size="md" label="Post task updates to Slack"
            caption={slack ? "Status changes go to #studio-updates" : "Nothing from Zen is posted to Slack"} checked={slack} onCheckedChange={setSlack} bold />
        </Stack>
      </Stack>
    </Card>
  );
}

/* ───────────── Phone settings: Large toggles, whole row to tap ───────────── */

type PhoneSetting = { key: string; label: string; caption: string; on: boolean };
// The Zen app's Settings tab: five groups, long enough that the large title folds as the screen scrolls.
const phoneSettingGroups: Array<{ id: string; title: string; rows: PhoneSetting[] }> = [
  { id: "notifications", title: "Notifications", rows: [
    { key: "assigned", label: "Task assignments", caption: "When someone gives you a task", on: true },
    { key: "mentions", label: "Mentions and replies", caption: "When someone @mentions you or replies to you", on: true },
    { key: "due", label: "Due date reminders", caption: "At 9:00 am on the day before a task is due", on: false },
  ] },
  { id: "files", title: "Files", rows: [
    { key: "cellular", label: "Download over mobile data", caption: "Files over 50 MB still wait for Wi-Fi", on: false },
    { key: "offline", label: "Keep pinned projects offline", caption: "Loyalty app and Zen design system · 1.2 GB on this phone", on: true },
  ] },
  { id: "sounds", title: "Sounds and haptics", rows: [
    { key: "sounds", label: "Message sounds", caption: "A sound for new chat messages", on: true },
    { key: "haptics", label: "Haptic feedback", caption: "A light tap when you complete a task", on: true },
  ] },
  { id: "privacy", title: "Privacy", rows: [
    { key: "online", label: "Show when I'm online", caption: "Teammates see a green dot on your photo", on: true },
    { key: "receipts", label: "Read receipts", caption: "People see when you have read their messages", on: true },
    { key: "usage", label: "Share usage data", caption: "Anonymous crash reports that help the team fix Zen", on: false },
  ] },
  { id: "calendar", title: "Calendar", rows: [
    { key: "weekends", label: "Show weekends", caption: "Saturday and Sunday in the week view", on: false },
    { key: "weekNumbers", label: "Week numbers", caption: "The number of each week beside its first day", on: false },
    { key: "declined", label: "Show declined events", caption: "Meetings you said no to stay in your day, faded", on: false },
  ] },
];
const phoneSettingsSaved = Object.fromEntries(phoneSettingGroups.flatMap((group) => group.rows.map((row) => [row.key, row.on])));

function PhoneSettingsExample() {
  const baseId = useId();
  // One scroller: the large title folds as the settings run under the bar.
  const screenRef = useRef<HTMLDivElement>(null);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(phoneSettingsSaved);
  return (
    // Grouped list: the screen is Surface-Alt, each group a white Surface block, so a group reads as one unit and the
    // kicker above it names it. Toggles are not List-Item rows, so each block is a flat Card (20px on a phone), and the
    // kicker lines up with the row text (lg).
    <PlatformPhone label="Settings" canvas="alt" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="alt" title="Settings" largeTitle="Settings" scrollRef={screenRef} />}>
      {/* Body padding lg (20px, the phone margin); groups lg apart. */}
      <Stack gap="lg" padding="lg">
        {phoneSettingGroups.map((group) => (
          <Stack as="section" key={group.id} gap="xs" aria-labelledby={`${baseId}-${group.id}`}>
            <Box paddingX="lg">
              <Heading level={2} id={`${baseId}-${group.id}`} textStyle="Body/Small/Bold" tone="light">{group.title}</Heading>
            </Box>
            <Card theme="flat">
              <FormFieldset kind="toggle" legend={group.title} hideLegend>
                {group.rows.map((row) => (
                  <Toggle key={row.key} size="lg" label={row.label} caption={row.caption}
                    checked={prefs[row.key]} onCheckedChange={(on) => setPrefs((current) => ({ ...current, [row.key]: on }))} bold={false} />
                ))}
              </FormFieldset>
            </Card>
          </Stack>
        ))}
      </Stack>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "Notification settings",
    description: "A settings page where every switch saves at once, with no Save button. The master toggle pauses everything and disables the rows that depend on it; a Toast offers Undo.",
    wide: true,
    screen: true,
    render: () => <NotificationSettingsExample />,
    code: `const [paused, setPaused] = useState(false);
const [prefs, setPrefs] = useState({ mentions: true, reviews: true, summary: false });
const { toast } = useToast();

const pause = (next: boolean) => {
  setPaused(next);
  if (!next) return;
  toast({ title: "Notifications paused", action: { label: "Undo", onClick: () => setPaused(false) } });
};

<PageHeader eyebrow="Settings" title="Notifications"
  description="Choose what Zen tells you about and where. Changes save as you make them." />

<Card theme="flat">
  <Toggle size="md" bold label="Pause all notifications"
    caption={paused ? "Paused at 10:30 am. Nothing reaches you until you turn this off." : "Mute email and push for a while."}
    checked={paused} onCheckedChange={pause} />
</Card>

<Heading level={2} id="email-heading" textStyle="Heading/4">Email</Heading>
<Card theme="flat">
  {/* kind="toggle": full-width rows, 16px apart */}
  <FormFieldset kind="toggle" legend="Email" hideLegend>
    <Toggle size="md" label="Mentions and replies" caption="When someone @mentions you or replies to your comment"
      checked={prefs.mentions} onCheckedChange={(on) => setPrefs({ ...prefs, mentions: on })} disabled={paused} />
    <Toggle size="md" label="Weekly summary" caption="Progress on your projects, every Monday at 9:00 am"
      checked={prefs.summary} onCheckedChange={(on) => setPrefs({ ...prefs, summary: on })} disabled={paused} />
  </FormFieldset>
</Card>`,
  },
  {
    title: "Switches in a table",
    description: "In a table the switch stands alone: a ToggleButton named by its row through aria-label. A change reaches the whole team, so the row shows who changed it and a Toast offers Undo; the table sits on the page under its heading, with no container.",
    wide: true,
    render: () => <EarlyAccessExample />,
    code: `const { toast } = useToast();
const flip = (feature: Feature, on: boolean) => {
  update({ ...feature, on, changedAt: new Date(), changedBy: me });
  toast({ title: \`\${feature.name} turned \${on ? "on" : "off"}\`,
    action: { label: "Undo", onClick: () => update(feature) } });
};

const columns: TableColumn<Feature>[] = [
  { id: "feature", header: "Feature", cell: (f) => <TableText bold caption={f.description}>{f.name}</TableText> },
  { id: "audience", header: "Available to", cell: (f) => <TableText>{f.audience}</TableText> },
  { id: "changed", header: "Last changed", cell: (f) => (
    <TableMedia bold={false} media={<Avatar size="small" theme="photo" src={f.changedBy.photo} alt="" />}
      caption={formatRelative(f.changedAt)}>{f.changedBy.name}</TableMedia>
  ) },
  { id: "on", header: "Enabled", align: "right", width: "96px", cell: (f) => (
    <ToggleButton aria-label={f.name} checked={f.on} onCheckedChange={(on) => flip(f, on)} />
  ) },
];

<Stack as="section" gap="md" aria-labelledby="early-access">
  <Stack gap="xs">
    <Heading level={4} id="early-access" textStyle="Heading/4">Early access</Heading>
    <Text textStyle="Body/Small/Regular" tone="base">Features still in testing at Đìzai Studio.</Text>
  </Stack>
  {/* Not a widget: no Card around the table */}
  <Table aria-labelledby="early-access" rows={features} columns={columns} />
</Stack>`,
  },
  {
    title: "Show completed",
    description: "A view option above a list: toggle-first and phrased positively. The list changes the moment it flips, which is what a toggle promises, and Done tasks say when they finished.",
    render: () => <ShowCompletedExample />,
    code: `const [showDone, setShowDone] = useState(false);
const shown = showDone ? tasks : tasks.filter((task) => task.status !== "Done");

<ListBox header={
  <Stack direction="row" justify="between" align="center" gap="sm" wrap>
    <Heading level={4} id="due-this-week" textStyle="Body/Small/Bold" tone="light">Due this week</Heading>
    <Toggle theme="toggle-first" size="md" label="Show completed" checked={showDone} onCheckedChange={setShowDone} />
  </Stack>
}>
  <List aria-labelledby="due-this-week">
    {shown.map((task) => (
      <ListItem key={task.id} title={task.title} titleLines={2} caption={\`\${task.key} · \${task.when}\`}
        leading={<Avatar size="medium" theme="photo" src={task.assignee.photo} alt={task.assignee.name} />}
        trailing={<Badge theme={taskStatusTheme[task.status]} background="subtle">{task.status}</Badge>} />
    ))}
  </List>
</ListBox>`,
  },
  {
    title: "Connect and retry",
    description: "When turning a setting on needs a server, the switch shows the change at once, locks while it connects and flips back if that fails. In this demo the first attempt fails; Try again connects.",
    render: () => <IntegrationsExample />,
    code: `const [calendar, setCalendar] = useState<"off" | "connecting" | "on" | "failed">("off");

const connect = async () => {
  setCalendar("connecting");
  try { await calendarApi.connect(); setCalendar("on"); }
  catch { setCalendar("failed"); }
};

<Stack direction="row" gap="md" align="center">
  <DockIcon icon="icon-calendar-line" theme="blue" background="subtle" size="medium" />
  <Toggle size="md" label="Sync due dates to Google Calendar"
    caption={calendar === "connecting" ? "Connecting to Google Calendar…" : "Due dates of your tasks show up in your calendar"}
    checked={calendar === "on" || calendar === "connecting"}
    disabled={calendar === "connecting"}
    onCheckedChange={(on) => (on ? connect() : setCalendar("off"))} />
</Stack>
{calendar === "failed" ? (
  <InlineMessage theme="negative" title="Couldn't connect Google Calendar" action={{ label: "Try again", onClick: connect }}>
    Google didn't answer in time, so nothing was synced.
  </InlineMessage>
) : null}`,
  },
  {
    title: "Phone settings",
    description: "On a phone every toggle is size large and the whole row, label and caption included, is the tap target. Settings are a grouped list: each group is a white block on the Surface-Alt screen under a kicker that names it, and the large title folds into the bar as they scroll.",
    render: () => <PhoneSettingsExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone canvas="alt" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" title="Settings" largeTitle="Settings" scrollRef={screenRef} />}>
  <Stack gap="lg" padding="lg">
    <Stack as="section" gap="xs" aria-labelledby="files">
      {/* The kicker lines up with the row text inside the group */}
      <Box paddingX="lg">
        <Heading level={2} id="files" textStyle="Body/Small/Bold" tone="light">Files</Heading>
      </Box>
      {/* One flat Card per group on the Surface-Alt screen */}
      <Card theme="flat">
        <FormFieldset kind="toggle" legend="Files" hideLegend>
          <Toggle size="lg" label="Download over mobile data" caption="Files over 50 MB still wait for Wi-Fi"
            checked={prefs.cellular} onCheckedChange={(on) => setPrefs({ ...prefs, cellular: on })} />
          <Toggle size="lg" label="Keep pinned projects offline" caption="Loyalty app and Zen design system · 1.2 GB on this phone"
            checked={prefs.offline} onCheckedChange={(on) => setPrefs({ ...prefs, offline: on })} />
        </FormFieldset>
      </Card>
    </Stack>
    {/* Notifications, Sounds and haptics, Privacy and Calendar follow the same way */}
  </Stack>
</PlatformPhone>`,
  },
];
