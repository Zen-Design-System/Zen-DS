/* List Item examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one List Item decision: the whole row opens the thing it
   names, group headers name their lists, trailing actions stay separate targets, a long title wraps to two lines and
   reads in full where the row leads, and settings on a phone drill down to a pick-one list. */
import { useId, useLayoutEffect, useRef, useState } from "react";
import { Avatar } from "../../../components/Avatar";
import { Badge, BadgeCounter } from "../../../components/Badge";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon, type DockIconTheme } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { Icon, type IconName } from "../../../components/Icon";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem, ToggleListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { Search } from "../../../components/Search";
import { SidePanel } from "../../../components/SidePanel";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import {
  TODAY, activity, daysFromToday, files, formatBytes, formatRange, formatRelative, initials, leaveRequests, people, peopleList, projectById,
  projects, projectStatusTheme, type Person, type PersonId, type StudioFile, type Team,
} from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./list-item.css";

export const page: PlatformPage = "list-item";

/** Photo when the person has one, else initials on their steady theme. */
const avatarFor = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };

// ——— 1. People directory: the whole row opens the person ————————————————————————————————————————
const teams: Team[] = ["Design", "Engineering", "Delivery", "Client Services", "Operations"];
const directory = [...peopleList].sort((a, b) => a.name.localeCompare(b.name));

function PeopleDirectory() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState<Team | null>(null);
  const [openId, setOpenId] = useState<PersonId>("chi");
  const titleId = useId();
  const projectsId = useId();
  const q = query.trim().toLowerCase();
  const rows = directory.filter((person) => (!team || person.team === team) && (!q || `${person.name} ${person.role}`.toLowerCase().includes(q)));
  const person = people[openId];
  const onProjects = projects.filter((project) => project.members.includes(openId));
  const clear = () => { setQuery(""); setTeam(null); };
  const copyEmail = () => {
    void navigator.clipboard?.writeText(person.email).catch(() => null);
    toast({ title: "Email copied", children: person.email });
  };
  return (
    <Box className="px-list-item-scope">
      <Grid columns={{ mobile: 1, desktop: "minmax(0, 2fr) minmax(0, 3fr)" }} gap="lg" align="start" className="px-list-item-split">
        {/* A ListBox: the toolbar and the count in its Header-Slot, the rows (or the empty state) in its Body-Slot. */}
        <ListBox as="section" aria-label="People"
          header={<>
            <Stack direction="row" gap="xs" align="center" wrap>
              <Box className="px-list-item-search"><Search placeholder="Search people" aria-label="Search people" value={query} onValueChange={setQuery} /></Box>
              <Chip variant="advanced" selected={team !== null} popoverLabel="Team"
                popoverItems={teams.map((option) => ({ id: option, label: option, selected: option === team }))}
                onPopoverSelect={(item) => setTeam(item.id === team ? null : (item.id as Team))} onClearSelection={() => setTeam(null)}>
                {team ?? "Team"}
              </Chip>
            </Stack>
            {rows.length ? <Text role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "person", "people")}</Text> : null}
          </>}>
          {rows.length ? (
            <Box className="px-list-item-pane">
              <List aria-label="People">
                {rows.map((row) => (
                  <ListItem key={row.id} title={row.name} caption={`${row.role} · ${row.location}`} selected={row.id === openId}
                    leading={<Avatar size="md" {...avatarFor(row)} />} onClick={() => setOpenId(row.id as PersonId)} />
                ))}
              </List>
            </Box>
          ) : (
            <EmptyState illustration={false} headingLevel={4} title="No people match" secondaryAction={{ label: "Clear filters", onClick: clear }}>
              Try another name or team.
            </EmptyState>
          )}
        </ListBox>
        <Card as="section" theme="flat" aria-labelledby={titleId}>
          <Stack gap="lg">
            <Stack direction="column" gap="md" align="center" justify="start">
              <Avatar size="2xl" {...avatarFor(person)} />
              <Stack gap="2xs">
                <Heading level={4} id={titleId} textStyle="Heading/Subheading" align="center">{person.name}</Heading>
                <Text textStyle="Body/Small/Regular" tone="base" align="center">{`${person.role} · ${person.team}`}</Text>
              </Stack>
            </Stack>
            <DescriptionList items={[
              { term: "Email", description: person.email },
              { term: "Office", description: person.location },
            ]} divider />
            <Stack as="section" gap="xs" aria-labelledby={projectsId}>
              <Heading level={5} id={projectsId} textStyle="Body/Small/Bold" tone="light">Projects</Heading>
              {onProjects.length ? (
                <List aria-labelledby={projectsId}>
                  {onProjects.map((project) => (
                    // Nothing else shows the project's name, so beside the Badge it wraps instead of being cut.
                    <ListItem key={project.id} title={project.name} titleLines={2} caption={project.client}
                      leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />}
                      trailing={<Badge theme={projectStatusTheme[project.status]} background="subtle">{project.status}</Badge>} />
                  ))}
                </List>
              ) : (
                <EmptyState illustration={false} headingLevel={6} title="No projects yet">
                  {`${person.name.split(" ")[0]} isn't on a project team right now.`}
                </EmptyState>
              )}
            </Stack>
            <Button level="tertiary" startIcon="icon-mail-01-line" onClick={copyEmail}>Copy email</Button>
          </Stack>
        </Card>
      </Grid>
    </Box>
  );
}

// ——— 2. Notifications: one ListBox and one named List per group ——————————————————————————————————————
type Notice = { id: string; actor: PersonId; title: string; text: string; at: Date; unread: boolean };
/** When each studio event happened (the shared activity feed), so every page tells the same story. */
const happened = (id: string) => activity.find((event) => event.id === id)!.at;
const myLeave = leaveRequests.find((request) => request.person === "alex")!;
const firstNotices: Notice[] = [
  { id: "n1", actor: "chi", title: "Design the points history screen", text: "Chi Tran commented", at: happened("a1"), unread: true },
  { id: "n2", actor: "bao", title: "Connect the rewards API to checkout", text: "Bao Nguyen asked you to review", at: happened("a2"), unread: true },
  { id: "n3", actor: "hana", title: "Lumen Bank SOW v3", text: "Hana Kim shared a file", at: happened("a3"), unread: true },
  { id: "n4", actor: "duy", title: "Shipment tracking", text: "Duy Le put the project on hold", at: happened("a4"), unread: false },
  { id: "n5", actor: "minhAnh", title: `Time off, ${formatRange(myLeave.from, myLeave.to)}`, text: "Minh Anh Vo approved your request", at: happened("a5"), unread: false },
  { id: "n6", actor: "mai", title: "INV-2026-0141", text: "Mai Ho marked the invoice as paid", at: happened("a6"), unread: false },
];
const isToday = (d: Date) => d.toDateString() === TODAY.toDateString();

function Notifications() {
  const [notices, setNotices] = useState(firstNotices);
  const [openId, setOpenId] = useState<string | null>(null);
  const baseId = useId();
  const unread = notices.filter((notice) => notice.unread).length;
  const cardRef = useRef<HTMLElement>(null);
  const open = (id: string) => { setOpenId(id); setNotices((list) => list.map((notice) => (notice.id === id ? { ...notice, unread: false } : notice))); };
  // The button turns disabled once everything is read, so focus moves on to the first notification.
  const markAllRead = () => {
    setNotices((list) => list.map((notice) => ({ ...notice, unread: false })));
    cardRef.current?.querySelector<HTMLElement>(".zen-list-item__wrapper")?.focus();
  };
  const groups = [
    { id: "today", label: "Today", items: notices.filter((notice) => isToday(notice.at)) },
    { id: "earlier", label: "Earlier", items: notices.filter((notice) => !isToday(notice.at)) },
  ];
  return (
    // Grouped list on desktop: a Heading/4 section with its action, then one ListBox per group, so Today and
    // Earlier read as two units instead of kickers over one long run of rows.
    <Stack as="section" gap="md" aria-labelledby={`${baseId}-title`} ref={cardRef}>
      <Stack direction="row" gap="xs" align="center" justify="between" wrap>
        <Stack direction="row" gap="2xs" align="center">
          <Heading level={4} id={`${baseId}-title`} textStyle="Heading/4">Notifications</Heading>
          {unread ? <><BadgeCounter value={unread} aria-hidden="true" /><VisuallyHidden>{`${unread} unread`}</VisuallyHidden></> : null}
        </Stack>
        <Button level="tertiary" disabled={!unread} onClick={markAllRead}>Mark all as read</Button>
      </Stack>
      {groups.map((group) => (
        // Each group is a ListBox titled in its Header-Slot (Figma Component/List-Box).
        <ListBox key={group.id} as="section" aria-labelledby={`${baseId}-${group.id}`}
          header={<Heading level={5} id={`${baseId}-${group.id}`} textStyle="Heading/Subheading">{group.label}</Heading>}>
          <List aria-labelledby={`${baseId}-${group.id}`}>
            {group.items.map((notice) => (
              <ListItem key={notice.id} title={notice.title} titleLines={2} caption={`${notice.text} · ${formatRelative(notice.at)}`}
                selected={notice.id === openId} onClick={() => open(notice.id)}
                leading={<Avatar size="md" {...avatarFor(people[notice.actor])} />}
                trailing={notice.unread ? <Badge theme="accent" background="subtle">New</Badge> : undefined} />
            ))}
          </List>
        </ListBox>
      ))}
    </Stack>
  );
}

// ——— 3. Pending invites: trailing actions are their own buttons ——————————————————————————————————
type Invite = { id: string; email: string; role: "Member" | "Client guest"; sentAt: Date; resent?: boolean };
const firstInvites: Invite[] = [
  { id: "trang", email: "trang.le@phinco.vn", role: "Client guest", sentAt: daysFromToday(-2, 9, 40) },
  { id: "an", email: "an.vu@dizai.studio", role: "Member", sentAt: daysFromToday(-1, 17, 5) },
  { id: "quan", email: "quan.ho@lumenbank.com", role: "Client guest", sentAt: daysFromToday(-6, 15, 10) },
];
/** "trang.le@phinco.vn" → "TL". */
const emailInitials = (email: string) => initials(email.split("@")[0].replace(/[._-]+/g, " "));
/** "Just now" and "Yesterday at …" read lower-case after a verb: "Invited yesterday at 5:05 pm". */
const afterVerb = (d: Date) => formatRelative(d).replace(/^(Just now|Yesterday)/, (word) => word.toLowerCase());

/** True while `ref`'s element is narrower than `width`: on a phone-width card the row actions fold into one menu. */
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

function PendingInvites() {
  const { toast } = useToast();
  const [invites, setInvites] = useState(firstInvites);
  const [inviting, setInviting] = useState(false);
  // Under 400px two icon buttons would squeeze the address, so Resend and Revoke move into a ⋯ menu headed by it.
  const [cardRef, narrow] = useNarrowerThan(400);
  const titleId = useId();
  const resend = (invite: Invite) => {
    setInvites((list) => list.map((item) => (item.id === invite.id ? { ...item, sentAt: TODAY, resent: true } : item)));
    toast({ title: "Invite resent", children: invite.email });
  };
  const revoke = (invite: Invite) => {
    const index = invites.findIndex((item) => item.id === invite.id);
    setInvites((list) => list.filter((item) => item.id !== invite.id));
    // Undo puts the invite back in its old place.
    const undo = () => setInvites((list) => [...list.slice(0, index), invite, ...list.slice(index)]);
    toast({ title: "Invite revoked", children: invite.email, action: { label: "Undo", onClick: undo } });
    // The row and its buttons are gone: focus moves to the next invite's actions, or to Invite people.
    requestAnimationFrame(() => {
      const rows = cardRef.current?.querySelectorAll<HTMLElement>(".zen-list-item") ?? [];
      const next = rows[Math.min(index, rows.length - 1)]?.querySelector<HTMLElement>("button");
      (next ?? cardRef.current?.querySelector<HTMLElement>("[data-invite-people]"))?.focus();
    });
  };
  const add = (email: string) => setInvites((list) => [{ id: `${email}-${list.length}`, email, role: "Member", sentAt: TODAY }, ...list]);
  return (
    <>
    {/* A ListBox: the title in its Header-Slot, the rows in its Body-Slot, Invite people in its Footer-Slot. */}
    <ListBox as="section" aria-labelledby={titleId} ref={cardRef}
      header={<Stack gap="2xs">
        <Heading level={4} id={titleId} textStyle="Heading/Subheading">Pending invites</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">Invites expire 14 days after they're sent.</Text>
      </Stack>}
      footer={<Stack align="start">
        <Button level="tertiary" startIcon="icon-user-plus-line" data-invite-people="" onClick={() => setInviting(true)}>Invite people</Button>
      </Stack>}>
      {invites.length ? (
        <List aria-labelledby={titleId}>
          {invites.map((invite) => (
            <ListItem key={invite.id} title={invite.email}
              caption={`${invite.role} · ${invite.resent ? "Resent" : "Invited"} ${afterVerb(invite.sentAt)}`}
              leading={<Avatar size="md" theme="neutral" background="subtle" alt="">{emailInitials(invite.email)}</Avatar>}
              trailing={narrow ? (
                <Menu align="end" trigger={<IconButton appearance="flat" level="primary" size="md" icon="icon-dots-horizontal-line" aria-label={`More actions for ${invite.email}`} />}
                  items={[{ type: "group", label: invite.email, items: [
                    { id: "resend", label: "Resend invite", icon: "icon-send-01-line", onSelect: () => resend(invite) },
                    { type: "separator" },
                    { id: "revoke", label: "Revoke invite", icon: "icon-trash-line", danger: true, onSelect: () => revoke(invite) },
                  ] }]} />
              ) : <>
                <IconButton appearance="flat" level="primary" size="md" icon="icon-send-01-line" aria-label={`Resend invite to ${invite.email}`} onClick={() => resend(invite)} />
                <IconButton appearance="flat" level="primary" size="md" icon="icon-trash-line" aria-label={`Revoke invite for ${invite.email}`} onClick={() => revoke(invite)} />
              </>} />
          ))}
        </List>
      ) : (
        <EmptyState illustration={false} headingLevel={5} title="No pending invites">
          People you invite show here until they join.
        </EmptyState>
      )}
    </ListBox>
    <DemoFieldDialog open={inviting} onOpenChange={setInviting} title="Invite people"
      description="They join Đìzai Studio as members once they accept."
      field={{ kind: "email", label: "Email", placeholder: "name@company.com" }} submitLabel="Send invite"
      confirm={(email) => `Invite sent to ${email}`} onSubmit={add} />
    </>
  );
}

// ——— 4. Long names: the title wraps to two lines, the panel it opens shows it in full ————————————————
const recentFiles: StudioFile[] = [
  files[0],
  files[1],
  { id: "f7", name: "Lumen Bank – online banking redesign – usability findings, round 2 (final).pdf", bytes: 3_420_000, owner: "ava", project: "lumen-banking", updated: daysFromToday(-1, 11, 20) },
  files[2],
  files[3],
  files[4],
];
const SHOWN = 4;

function RecentFiles() {
  const { toast } = useToast();
  const [showAll, setShowAll] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const titleId = useId();
  const opened = recentFiles.find((file) => file.id === openId);
  const rows = showAll ? recentFiles : recentFiles.slice(0, SHOWN);
  return (
    <>
    {/* A ListBox: the title in its Header-Slot, the files in its Body-Slot, Show all in its Footer-Slot. */}
    <ListBox as="section" aria-labelledby={titleId}
      header={<Heading level={4} id={titleId} textStyle="Heading/Subheading">Recent files</Heading>}
      footer={<Stack align="start">
        <Button level="tertiary" onClick={() => setShowAll((all) => !all)}>
          {showAll ? "Show fewer" : `Show all ${recentFiles.length} files`}
        </Button>
      </Stack>}>
      <List aria-labelledby={titleId}>
        {rows.map((file) => (
          // The title wraps to a second line and is cut only after that; the side panel repeats the whole name.
          <ListItem key={file.id} title={file.name} titleLines={2}
            caption={`${formatBytes(file.bytes)} · ${people[file.owner].name} · ${formatRelative(file.updated)}`}
            leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
            selected={file.id === openId} onClick={() => setOpenId(file.id)} />
        ))}
      </List>
    </ListBox>
      <SidePanel type="modal" size="small" open={Boolean(opened)} onOpenChange={(open) => { if (!open) setOpenId(null); }}
        title={opened?.name ?? ""} description={opened ? projectById(opened.project).name : undefined}
        primaryAction={{ label: "Download", onClick: () => { if (opened) toast({ title: "Download started", children: opened.name }); setOpenId(null); } }}
        secondaryAction={{ label: "Close" }}>
        {opened ? (
          <DescriptionList divider items={[
            { term: "Size", description: formatBytes(opened.bytes) },
            { term: "Owner", description: people[opened.owner].name },
            { term: "Client", description: projectById(opened.project).client },
            { term: "Updated", description: formatRelative(opened.updated) },
          ]} />
        ) : null}
      </SidePanel>
    </>
  );
}

// ——— 5. Settings on a phone: drill down to a pick-one list ——————————————————————————————————————
type Choice = { id: string; label: string; caption?: string };
type Setting = { id: string; title: string; icon: IconName; theme: DockIconTheme; choices: Choice[] };
const settingGroups: { id: string; title: string; settings: Setting[] }[] = [
  {
    id: "preferences", title: "Preferences", settings: [
      { id: "language", title: "Language", icon: "icon-translate-line", theme: "blue", choices: [{ id: "en", label: "English" }, { id: "vi", label: "Tiếng Việt" }] },
      { id: "appearance", title: "Appearance", icon: "icon-sun-line", theme: "violet", choices: [{ id: "system", label: "Match system" }, { id: "light", label: "Light" }, { id: "dark", label: "Dark" }] },
      { id: "text", title: "Text size", icon: "icon-type-01-line", theme: "indigo", choices: [{ id: "default", label: "Default" }, { id: "large", label: "Large" }, { id: "larger", label: "Larger" }] },
      { id: "week", title: "Week starts on", icon: "icon-calendar-line", theme: "orange", choices: [{ id: "mon", label: "Monday" }, { id: "sun", label: "Sunday" }, { id: "sat", label: "Saturday" }] },
      { id: "time", title: "Time format", icon: "icon-clock-line", theme: "teal", choices: [{ id: "12", label: "12-hour", caption: "10:30 am" }, { id: "24", label: "24-hour", caption: "10:30" }] },
      { id: "start", title: "Start screen", icon: "icon-home-02-line", theme: "green", choices: [{ id: "home", label: "Home" }, { id: "tasks", label: "My tasks" }, { id: "inbox", label: "Inbox" }] },
    ],
  },
  {
    id: "notifications", title: "Notifications", settings: [
      {
        id: "push", title: "Push notifications", icon: "icon-bell-01-line", theme: "red", choices: [
          { id: "all", label: "All activity", caption: "Comments, reviews, mentions and status changes" },
          { id: "direct", label: "Mentions and reviews", caption: "Only when someone needs you" },
          { id: "off", label: "Off" },
        ],
      },
      { id: "digest", title: "Email digest", icon: "icon-mail-01-line", theme: "cyan", choices: [{ id: "daily", label: "Daily at 8:00 am" }, { id: "weekly", label: "Weekly on Monday" }, { id: "off", label: "Off" }] },
      { id: "reminders", title: "Task reminders", icon: "icon-alarm-clock-line", theme: "yellow", choices: [{ id: "hour", label: "1 hour before" }, { id: "day", label: "1 day before" }, { id: "off", label: "Off" }] },
      { id: "quiet", title: "Quiet hours", icon: "icon-moon-01-line", theme: "plum", choices: [{ id: "night", label: "10:00 pm – 7:00 am" }, { id: "evening", label: "8:00 pm – 8:00 am" }, { id: "off", label: "Off" }] },
    ],
  },
  {
    id: "privacy", title: "Privacy", settings: [
      { id: "online", title: "Online status", icon: "icon-eye-line", theme: "purple", choices: [{ id: "studio", label: "Everyone in the studio" }, { id: "teams", label: "My teams only" }, { id: "nobody", label: "Nobody" }] },
      { id: "photo", title: "Profile photo", icon: "icon-user-circle-line", theme: "pink", choices: [{ id: "everyone", label: "Everyone", caption: "Studio members and client guests" }, { id: "studio", label: "Studio members only" }] },
      { id: "receipts", title: "Read receipts", icon: "icon-check-done-line", theme: "teal", choices: [{ id: "on", label: "On" }, { id: "off", label: "Off" }] },
    ],
  },
  {
    id: "storage", title: "Storage and data", settings: [
      { id: "downloads", title: "Download files", icon: "icon-download-01-line", theme: "blue", choices: [{ id: "wifi", label: "On Wi-Fi only" }, { id: "any", label: "On Wi-Fi and mobile data" }, { id: "ask", label: "Ask every time" }] },
      { id: "offline", title: "Offline projects", icon: "icon-hard-drive-line", theme: "brown", choices: [{ id: "pinned", label: "Pinned projects" }, { id: "active", label: "All active projects" }, { id: "none", label: "None" }] },
      { id: "video", title: "Video quality", icon: "icon-video-recorder-line", theme: "crimson", choices: [{ id: "auto", label: "Auto" }, { id: "high", label: "High" }, { id: "saver", label: "Data saver" }] },
    ],
  },
];
const allSettings = settingGroups.flatMap((group) => group.settings);
const firstValues: Record<string, string> = {
  language: "en", appearance: "system", text: "default", week: "mon", time: "12", start: "home", push: "direct", digest: "daily",
  reminders: "hour", quiet: "night", online: "studio", photo: "everyone", receipts: "on", downloads: "wifi", offline: "pinned", video: "auto",
};

function PhoneSettings() {
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const [values, setValues] = useState(firstValues);
  const [openId, setOpenId] = useState<string | null>(null);
  const setting = allSettings.find((item) => item.id === openId);
  const labelOf = (item: Setting) => item.choices.find((choice) => choice.id === values[item.id])?.label;
  if (!setting) {
    return (
      // Settings is a tab root: the large title folds into the bar as the groups scroll under it. A grouped list: the
      // screen is Surface-Alt, each group a ListBox under its kicker. Rows have no side padding of their own: the ListBox pads
      // Card-padding-medium (20px on a phone), so the row text sits 20px from every edge and a row's hover fill (12px outside
      // it) 8px, concentric with its 2XLarge corners (24px = the fill's Large 16px + 8px); the kicker lines up with the row
      // text (paddingX lg).
      <PlatformPhone key="settings" label="Zen app settings" canvas="alt" headerOverlay screenRef={screenRef}
        header={<TopNavigation type="alt" title="Settings" largeTitle="Settings" scrollRef={screenRef} />}>
        {screen.anchor}
        <Stack gap="lg" padding="lg">
          {settingGroups.map((group) => (
            <Stack key={group.id} as="section" gap="xs" aria-labelledby={`${baseId}-${group.id}`}>
              <Box paddingX="lg">
                <Heading level={2} id={`${baseId}-${group.id}`} textStyle="Body/Small/Bold" tone="light">{group.title}</Heading>
              </Box>
              <ListBox>
                <List aria-labelledby={`${baseId}-${group.id}`}>
                  {group.settings.map((item) => (
                    <ListItem key={item.id} data-setting={item.id} title={item.title} caption={labelOf(item)}
                      leading={<DockIcon icon={item.icon} theme={item.theme} background="solid" />}
                      trailing={<Icon name="icon-chevron-right-line-small" decorative />}
                      onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpenId(item.id))} />
                  ))}
                </List>
              </ListBox>
            </Stack>
          ))}
        </Stack>
      </PlatformPhone>
    );
  }
  return (
    // A pushed screen of the same grouped list: compact-alt bar on Surface-Alt, with Back, which returns focus to the
    // setting it came from.
    <PlatformPhone key={setting.id} label="Zen app settings" canvas="alt" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact-alt" title={setting.title} scrollRef={screenRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go(`[data-setting="${setting.id}"] .zen-list-item__wrapper`, () => setOpenId(null)) }} />}>
      {screen.anchor}
      <Box padding="lg">
        {/* Pick one: the current value is the Selected row, with a check so it doesn't rely on the fill alone. */}
        <ListBox>
          <List aria-label={setting.title}>
            {setting.choices.map((choice) => {
              const current = values[setting.id] === choice.id;
              return (
                <ListItem key={choice.id} title={choice.label} caption={choice.caption} selected={current}
                  trailing={current ? <Icon name="icon-check-line" decorative /> : undefined}
                  onClick={() => setValues((state) => ({ ...state, [setting.id]: choice.id }))} />
              );
            })}
          </List>
        </ListBox>
      </Box>
    </PlatformPhone>
  );
}

const emailSettings = [
  { id: "digest", title: "Daily digest", caption: "One email at 8:00 am with what changed yesterday", icon: "icon-mail-01-line" as IconName },
  { id: "mentions", title: "Mentions and replies", caption: "When someone mentions you or answers your comment", icon: "icon-message-chat-circle-line" as IconName },
  { id: "invoices", title: "Paid invoices", caption: "When a client pays an invoice you sent", icon: "icon-receipt-line" as IconName },
];

function EmailSwitches() {
  const titleId = useId();
  const { toast } = useToast();
  const [on, setOn] = useState<Record<string, boolean>>({ digest: true, mentions: true, invoices: false });
  const change = (id: string, title: string, checked: boolean) => {
    setOn((current) => ({ ...current, [id]: checked }));
    toast({ title: `${title} ${checked ? "on" : "off"}`, action: { label: "Undo", onClick: () => setOn((current) => ({ ...current, [id]: !checked })) } });
  };
  return (
    <ListBox as="section" aria-labelledby={titleId} header={<Heading level={4} id={titleId} textStyle="Heading/Subheading">Email</Heading>}>
      <List aria-labelledby={titleId}>
        {emailSettings.map((setting) => (
          <ToggleListItem key={setting.id} title={setting.title} caption={setting.caption}
            leading={<DockIcon size="sm" icon={setting.icon} theme="neutral" background="subtle" />}
            checked={on[setting.id]} onCheckedChange={(checked) => change(setting.id, setting.title, checked)} />
        ))}
      </List>
    </ListBox>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "People directory",
    wide: true,
    description: "Each row is one button that opens the person beside the list, and Selected marks who is open. Search and the Team chip filter the rows; when nothing matches, the empty state offers Clear filters.",
    render: () => <PeopleDirectory />,
    code: `const rows = people.filter((p) => (!team || p.team === team) && matches(p, query));

{/* A ListBox: the toolbar and the count in its Header-Slot (stacked 16px), the rows in its Body-Slot */}
<ListBox as="section" aria-label="People"
  header={<>
    <Stack direction="row" gap="xs" align="center" wrap>
      <Search placeholder="Search people" aria-label="Search people" value={query} onValueChange={setQuery} />
      <Chip variant="advanced" selected={team !== null} popoverLabel="Team"
        popoverItems={teams.map((t) => ({ id: t, label: t, selected: t === team }))}
        onPopoverSelect={(item) => setTeam(item.id === team ? null : item.id)}
        onClearSelection={() => setTeam(null)}>{team ?? "Team"}</Chip>
    </Stack>
    {rows.length ? <Text role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "person", "people")}</Text> : null}
  </>}>
  {/* Rows pad 12px above and below only, so the body's padding lines them up with the header and a row's fill hangs
      12px into it. The pane scrolls, so it spans the body padding and pads it back:
      .pane { max-block-size: 28rem; overflow-y: auto; margin-inline: calc(-1 * var(--zen-card-padding-medium)); padding: 0 var(--zen-card-padding-medium) } */}
  {rows.length ? (
    <Box className="pane">
      <List aria-label="People">
        {rows.map((person) => (
          <ListItem key={person.id} title={person.name} caption={\`\${person.role} · \${person.location}\`}
            leading={<Avatar size="md" {...avatarFor(person)} />}
            selected={person.id === openId} onClick={() => setOpenId(person.id)} />
        ))}
      </List>
    </Box>
  ) : (
    <EmptyState illustration={false} headingLevel={4} title="No people match" secondaryAction={{ label: "Clear filters", onClick: clear }}>
      Try another name or team.
    </EmptyState>
  )}
</ListBox>`,
  },
  {
    title: "Settings on a phone",
    description: "Settings are a grouped list: each group is a white block under its kicker on the Surface-Alt screen. A setting row shows its current value as the caption and a passive chevron; the whole row opens a pick-one list where the Selected row, with a check, is the current value. Back returns focus to the row.",
    render: () => <PhoneSettings />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

{/* Settings: a grouped list on Surface-Alt, a kicker over a white block per group; one key per screen */}
<PlatformPhone key="settings" canvas="alt" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" title="Settings" largeTitle="Settings" scrollRef={screenRef} />}>
  <Stack gap="lg" padding="lg">
    <Stack as="section" gap="xs" aria-labelledby="preferences">
      {/* The kicker lines up with the row text (the block's padding, lg 20px) */}
      <Box paddingX="lg">
        <Heading level={2} id="preferences" textStyle="Body/Small/Bold" tone="light">Preferences</Heading>
      </Box>
      {/* The ListBox pads the rows: its fill sits 8px from every edge on a phone, 12px on desktop */}
      <ListBox>
        <List aria-labelledby="preferences">
          <ListItem title="Language" caption="English"
            leading={<DockIcon icon="icon-translate-line" theme="blue" background="subtle" />}
            trailing={<Icon name="icon-chevron-right-line-small" decorative />}
            onClick={() => setOpenId("language")} />
        </List>
      </ListBox>
    </Stack>
    {/* Notifications, Privacy, Storage and data follow the same way */}
  </Stack>
</PlatformPhone>

{/* Language: pick one, a child screen of the grouped list (compact-alt) */}
<PlatformPhone key="language" canvas="alt" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact-alt" title="Language" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => setOpenId(null) }} />}>
  <Box padding="lg">
    <ListBox>
      <List aria-label="Language">
        {choices.map((choice) => (
          <ListItem key={choice.id} title={choice.label} selected={value === choice.id}
            trailing={value === choice.id ? <Icon name="icon-check-line" decorative /> : undefined}
            onClick={() => setValue(choice.id)} />
        ))}
      </List>
    </ListBox>
  </Box>
</PlatformPhone>`,
  },
  {
    title: "Grouped notifications",
    description: "Today and Earlier are each a List Box titled one level below the Notifications heading, with a List named after it, so the groups read as units. Opening a notification marks it read; Mark all as read clears the counter.",
    render: () => <Notifications />,
    code: `<Stack as="section" gap="md" aria-labelledby="notifications">
  <Stack direction="row" gap="xs" align="center" justify="between" wrap>
    <Heading level={4} id="notifications" textStyle="Heading/4">Notifications</Heading>
    <Button level="tertiary" disabled={!unread} onClick={markAllRead}>Mark all as read</Button>
  </Stack>
  {/* One ListBox per group, titled in its header; Earlier follows the same way */}
  <ListBox as="section" aria-labelledby="today"
    header={<Heading level={5} id="today" textStyle="Heading/Subheading">Today</Heading>}>
    <List aria-labelledby="today">
      {today.map((notice) => (
        <ListItem key={notice.id} title={notice.title} titleLines={2} caption={\`\${notice.text} · \${formatRelative(notice.at)}\`}
          leading={<Avatar size="md" {...avatarFor(people[notice.actor])} />}
          trailing={notice.unread ? <Badge theme="accent" background="subtle">New</Badge> : undefined}
          selected={notice.id === openId} onClick={() => open(notice.id)} />
      ))}
    </List>
  </ListBox>
</Stack>`,
  },
  {
    title: "Pending invites",
    description: "Rows that don't open anything keep Resend and Revoke as Medium flat icon buttons in the trailing slot, each named after the invite. On a narrow card they fold into one More menu headed by the address, so the address keeps its room; Revoke removes the row and the toast can undo it.",
    render: () => <PendingInvites />,
    code: `// Narrower than 400px (a ResizeObserver on the card): one ⋯ menu instead of two buttons.
const [cardRef, narrow] = useNarrowerThan(400);

<List aria-labelledby={titleId}>
  {invites.map((invite) => (
    <ListItem key={invite.id} title={invite.email} caption={\`\${invite.role} · Invited \${afterVerb(invite.sentAt)}\`}
      leading={<Avatar size="md" theme="neutral" background="subtle" alt="">{emailInitials(invite.email)}</Avatar>}
      trailing={narrow ? (
        <Menu align="end" trigger={<IconButton appearance="flat" level="primary" size="md" icon="icon-dots-horizontal-line"
            aria-label={\`More actions for \${invite.email}\`} />}
          items={[{ type: "group", label: invite.email, items: [
            { id: "resend", label: "Resend invite", icon: "icon-send-01-line", onSelect: () => resend(invite) },
            { type: "separator" },
            { id: "revoke", label: "Revoke invite", icon: "icon-trash-line", danger: true, onSelect: () => revoke(invite) },
          ] }]} />
      ) : <>
        <IconButton appearance="flat" level="primary" size="md" icon="icon-send-01-line"
          aria-label={\`Resend invite to \${invite.email}\`} onClick={() => resend(invite)} />
        <IconButton appearance="flat" level="primary" size="md" icon="icon-trash-line"
          aria-label={\`Revoke invite for \${invite.email}\`} onClick={() => revoke(invite)} />
      </>} />
  ))}
</List>

const revoke = (invite) => {
  const index = invites.indexOf(invite);
  setInvites(invites.filter((item) => item !== invite));
  toast({ title: "Invite revoked", action: { label: "Undo", onClick: () => setInvites((list) => list.toSpliced(index, 0, invite)) } });
};`,
  },
  {
    title: "Long file names",
    description: "A file name that doesn't fit wraps to a second line (titleLines={2}) and is cut only after that; the side panel the row opens shows the whole name. The card lists the four latest files and says how many there are in all.",
    render: () => <RecentFiles />,
    code: `<ListBox as="section" aria-labelledby={titleId}
  header={<Heading level={4} id={titleId} textStyle="Heading/Subheading">Recent files</Heading>}
  footer={<Stack align="start">
    <Button level="tertiary" onClick={() => setShowAll(!showAll)}>
      {showAll ? "Show fewer" : \`Show all \${files.length} files\`}
    </Button>
  </Stack>}>
  <List aria-labelledby={titleId}>
    {rows.map((file) => (
      <ListItem key={file.id} title={file.name} titleLines={2}
        caption={\`\${formatBytes(file.bytes)} · \${owner.name} · \${formatRelative(file.updated)}\`}
        leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
        selected={file.id === openId} onClick={() => setOpenId(file.id)} />
    ))}
  </List>
</ListBox>

<SidePanel type="modal" size="small" open={Boolean(opened)} onOpenChange={(open) => !open && setOpenId(null)}
  title={opened?.name} primaryAction={{ label: "Download", onClick: download }} secondaryAction={{ label: "Close" }}>
  <DescriptionList divider items={details} />
</SidePanel>`,
  },
  {
    title: "Email switches",
    description: "A settings row whose whole surface is one switch is a ToggleListItem: a press anywhere on the row flips it, the title names the switch and the caption describes it. Each change applies at once, and the toast can undo it.",
    render: () => <EmailSwitches />,
    code: `<ListBox as="section" aria-labelledby="email" header={<Heading level={4} id="email" textStyle="Heading/Subheading">Email</Heading>}>
  <List aria-labelledby="email">
    {settings.map((setting) => (
      // The whole row is the switch: no Toggle in the trailing slot of a ListItem
      <ToggleListItem key={setting.id} title={setting.title} caption={setting.caption}
        leading={<DockIcon size="sm" icon={setting.icon} theme="neutral" background="subtle" />}
        checked={on[setting.id]} onCheckedChange={(checked) => change(setting, checked)} />
    ))}
  </List>
</ListBox>`,
  },
]);
