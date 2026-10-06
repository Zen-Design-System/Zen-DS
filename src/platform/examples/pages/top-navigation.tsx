import { useId, useRef, useState } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { BottomSheet } from "../../../components/BottomSheet";
import { ChatAvatarGroup, ChatCall, ChatComposer, ChatMessage, ChatThread, type ChatPerson, type ChatReplyTarget } from "../../../components/Chat";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { Form, useFormState } from "../../../components/Form";
import { Image } from "../../../components/Image";
import { InputField, SelectField, TextAreaField } from "../../../components/Input";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Search } from "../../../components/Search";
import { Segmented } from "../../../components/Segmented";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { ChatDemoNote, useChatDemo } from "../../chatDemo";
import { PlatformPhoneMedia, platformMedia, type PlatformPhoto } from "../../PlatformMedia";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import {
  TODAY, daysFromToday, formatDate, formatDay, formatDue, formatRelative, formatTime, initials, leaveRequests, me, people, peopleList,
  projectById, projectStatusTheme, projects, tasks,
  type Person, type PersonId, type Project, type ProjectStatus,
} from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import "./top-navigation.css";

export const page: PlatformPage = "top-navigation";

/** A person as Avatar props: their photo, or initials on their steady theme. The row title already names them. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const chatPerson = (person: Person): ChatPerson => ({ name: person.name, src: person.photo, theme: person.theme });
const minutesAgo = (minutes: number) => new Date(TODAY.getTime() - minutes * 60_000);
const back = "icon-chevron-left-line-medium" as const;
const firstName = (id: PersonId) => people[id].name.split(" ")[0];
// Alex's approved leave, from the studio's shared leave requests.
const myLeave = leaveRequests.find((request) => request.person === me.id && request.status === "Approved")!;
const myLeaveDays = `${formatDay(myLeave.from)} – ${formatDay(myLeave.to)}`;

/* ───────────── 1. Root and detail ───────────── */

// The studio's other projects, so the root list runs past the screen like the real one.
const project = (id: string, name: string, client: string, icon: Project["icon"], theme: Project["theme"], status: ProjectStatus, lead: PersonId,
  members: PersonId[], progress: number, start: number, due: number, budget: number, spent: number): Project =>
  ({ id, name, client, icon, theme, status, lead, members, progress, start: daysFromToday(start), due: daysFromToday(due), budget, spent });
const moreProjects: Project[] = [
  project("phin-gift-cards", "Gift cards", "Phin & Co", "icon-gift-01-line", "orange", "On hold", "chi", ["chi", "bao"], 30, -50, 60, 22000, 6400),
  project("phin-store-locator", "Store locator", "Phin & Co", "icon-map-line", "orange", "Completed", "duy", ["duy", "chi", "khoa"], 100, -160, -60, 18000, 17650),
  project("lumen-card-controls", "Card controls", "Lumen Bank", "icon-credit-card-lock-line", "blue", "Active", "finn", ["finn", "bao", "ava"], 52, -40, 48, 46000, 22100),
  project("lumen-investor-report", "Investor report site", "Lumen Bank", "icon-bar-chart-01-line", "blue", "Completed", "hana", ["hana", "mai", "ava"], 100, -130, -40, 31000, 30200),
  project("mekong-driver-app", "Driver app", "Mekong Freight", "icon-route-line", "teal", "Planning", "duy", ["duy", "khoa", "em"], 0, 20, 140, 72000, 0),
  project("bookfair-kiosk", "Ticketing kiosk", "Hanoi Book Fair", "icon-ticket-01-line", "purple", "Completed", "linh", ["linh", "gia", "em"], 100, -200, -90, 14000, 13800),
  project("saola-trail-guide", "Trail guide app", "Saola Outdoor", "icon-compass-line", "green", "Planning", "ava", ["ava", "gia", "finn"], 0, 30, 150, 64000, 0),
  project("dizai-onboarding", "Onboarding handbook", "Đìzai Studio", "icon-graduation-hat-line", "indigo", "Active", "minhAnh", ["minhAnh", "linh"], 45, -20, 25, 0, 0),
];
const statusOrder: ProjectStatus[] = ["Active", "Planning", "On hold", "Completed"];
/** The Projects tab sorts by status, then by name. */
const studioProjects = [...projects, ...moreProjects]
  .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) || a.name.localeCompare(b.name));

function RootAndDetailExample() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  // The scroller of whichever screen shows: the large title folds as the list runs under the bar.
  const screenRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const teamId = useId();

  if (!openId) {
    return (
      // One key per screen: each screen opens at the top and the bar measures its fold again.
      <PlatformPhone key="root" label="Projects" headerOverlay screenRef={screenRef}
        header={<TopNavigation title="Projects" largeTitle="Projects" scrollRef={screenRef} />}>
        {screen.anchor}
        {/* The rows sit in the screen margin (Margin/Comfortable, 20px), so their fill stays 8px off the screen edge; Padding/XSmall (8px, the phone's List-Container-Vertical-Padding) above and below, like a List-Box. */}
        <Box paddingX="lg" paddingY="xs">
          <List aria-label="Projects">
            {studioProjects.map((item) => (
              <ListItem key={item.id} data-project={item.id} title={item.name} caption={item.client}
                leading={<DockIcon icon={item.icon} theme={item.theme} background="subtle" size="md" />}
                // Small status: a phone row is a narrow space, and the project name must not truncate beside it.
                trailing={<Badge theme={projectStatusTheme[item.status]} background="subtle" size="sm">{item.status}</Badge>}
                onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpenId(item.id))} />
            ))}
          </List>
        </Box>
      </PlatformPhone>
    );
  }

  const opened = studioProjects.find((item) => item.id === openId)!;
  const copyLink = () => {
    navigator.clipboard?.writeText(`https://zen.dizai.studio/projects/${opened.id}`).catch(() => undefined);
    toast({ title: "Link copied" });
  };
  return (
    <PlatformPhone key={opened.id} label={opened.name} headerOverlay screenRef={screenRef} header={
      // A pushed, dense detail screen: Compact type (Flat actions); the bar title is its h1 and Back returns to the row.
      <TopNavigation type="compact" title={opened.name} scrollRef={screenRef}
        leading={{ icon: back, label: "Back", onClick: () => screen.go(`[data-project="${opened.id}"] .zen-list-item__wrapper`, () => setOpenId(null)) }}
        trailing={[{ icon: "icon-link-01-line", label: "Copy link", onClick: copyLink }]} />
    }>
      {screen.anchor}
      <Stack gap="lg" paddingY="lg">
        <Box paddingX="lg">
          <DescriptionList items={[
            { term: "Client", description: opened.client },
            { term: "Status", description: <Badge theme={projectStatusTheme[opened.status]} background="subtle">{opened.status}</Badge> },
            { term: "Lead", description: people[opened.lead].name },
            { term: opened.status === "Completed" ? "Handed over" : "Due", description: formatDate(opened.due) },
            { term: "Progress", description: `${opened.progress}%` },
          ]} />
        </Box>
        <Stack as="section" gap="xs" paddingX="lg" aria-labelledby={teamId}>
          <Heading level={2} id={teamId} textStyle="Body/Small/Bold" tone="light">Team</Heading>
          <List aria-labelledby={teamId}>
            {opened.members.map((id) => (
              <ListItem key={id} title={people[id].name} caption={people[id].role} leading={<Avatar size="md" {...avatarOf(people[id])} />} />
            ))}
          </List>
        </Stack>
      </Stack>
    </PlatformPhone>
  );
}

/* ───────────── 2. Collapse on scroll ───────────── */

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const directory = [...peopleList].sort((a, b) => a.name.localeCompare(b.name));

function CollapseOnScrollExample() {
  const screenRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [inviting, setInviting] = useState(false);
  const [invited, setInvited] = useState<string[]>([]);
  // The sheet is a form: Enter or Send invite submits, and a bad address keeps focus on the field with its error.
  const inviteForm = useFormState({
    initialValues: { email: "" },
    validate: (v) => ({ email: emailPattern.test(v.email.trim()) ? undefined : "Enter an email address, like name@dizai.studio" }),
    onSubmit: (v) => {
      setInvited((list) => [v.email.trim().toLowerCase(), ...list]);
      setInviting(false);
      screenRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    },
  });
  const openInvite = () => { inviteForm.reset({ email: "" }); setInviting(true); };
  const q = query.trim().toLowerCase();
  const shown = directory.filter((person) => `${person.name} ${person.role} ${person.team}`.toLowerCase().includes(q));
  const pending = invited.filter((address) => address.includes(q));

  // The folded bar's Search action scrolls back up; the field takes focus as soon as the Search bar is back (no longer
  // inert under the bar).
  const openSearch = () => {
    screenRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    const started = performance.now();
    const focusWhenBack = () => {
      const field = searchRef.current;
      if (field && !field.closest("[inert]")) field.focus({ preventScroll: true });
      else if (performance.now() - started < 1500) requestAnimationFrame(focusWhenBack);
    };
    requestAnimationFrame(focusWhenBack);
  };

  return (
    // The header floats over the screen (headerOverlay) so the list can run under the bar as the title folds away.
    <PlatformPhone label="People" headerOverlay screenRef={screenRef} header={
      <TopNavigation title="People" largeTitle="People" scrollRef={screenRef}
        trailing={[{ icon: "icon-user-plus-line", label: "Invite people", onClick: openInvite }]}
        controlBar={<Search ref={searchRef} placeholder="Search people" aria-label="Search people" value={query} onValueChange={setQuery} />}
        searchAction={{ label: "Search people", onClick: openSearch }} />
    }>
      {shown.length || pending.length ? (
        // Static rows (nothing opens a person here) sit in the screen margin.
        <Box padding="lg">
          <List aria-label="People">
            {pending.map((address) => (
              <ListItem key={address} title={address} caption="Invite sent" leading={<Avatar size="md" theme="neutral" background="subtle" alt="">{address[0].toUpperCase()}</Avatar>}
                trailing={<Badge theme="neutral" background="subtle">Invited</Badge>} />
            ))}
            {shown.map((person) => (
              <ListItem key={person.id} title={person.name} caption={`${person.role} · ${person.location}`} leading={<Avatar size="md" status={person.online} {...avatarOf(person)} />} />
            ))}
          </List>
        </Box>
      ) : (
        <EmptyState illustration={false} headingLevel={2} title="No people match" secondaryAction={{ label: "Clear search", onClick: () => { setQuery(""); searchRef.current?.focus(); } }}>
          {`No name, role or team contains “${query.trim()}”.`}
        </EmptyState>
      )}
      <BottomSheet inline open={inviting} onOpenChange={setInviting} title="Invite people" onSubmit={inviteForm.handleSubmit}
        primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email" type="email" size="lg" autoComplete="off" placeholder="name@dizai.studio" data-autofocus="" {...inviteForm.field("email")} />
      </BottomSheet>
    </PlatformPhone>
  );
}

/* ───────────── 3. Home with notifications ───────────── */

// Alex's notifications, newest first, shared by the Home bell and the Inbox.
type InboxItem = { id: string; actor: PersonId; text: string; at: Date; unread: boolean };
const notifications: InboxItem[] = [
  { id: "n1", actor: "chi", text: "Commented on Points history", at: minutesAgo(2), unread: true },
  { id: "n2", actor: "bao", text: "Asked you to review PHIN-219", at: minutesAgo(13), unread: true },
  { id: "n3", actor: "hana", text: "Shared Lumen Bank SOW v3", at: daysFromToday(0, 9, 12), unread: true },
  { id: "n4", actor: "duy", text: "Put Shipment tracking on hold", at: daysFromToday(-1, 16, 40), unread: false },
  { id: "n5", actor: "minhAnh", text: `Approved your leave for ${myLeaveDays}`, at: daysFromToday(-2, 11, 5), unread: false },
  { id: "n6", actor: "finn", text: "Requested changes on ZEN-398", at: daysFromToday(-3, 15, 20), unread: false },
  { id: "n7", actor: "linh", text: "Replied to your comment on the Book Fair recap", at: daysFromToday(-6, 9, 45), unread: false },
  { id: "n8", actor: "mai", text: "Marked INV-2026-0141 as paid", at: daysFromToday(-8, 15, 30), unread: false },
  { id: "n9", actor: "ava", text: "Mentioned you in Usability plan", at: daysFromToday(-9, 14, 10), unread: false },
  { id: "n10", actor: "khoa", text: "Assigned you LUM-097 Transfer limits", at: daysFromToday(-10, 16, 5), unread: false },
  { id: "n11", actor: "gia", text: "Added you to Brand refresh", at: daysFromToday(-13, 10, 15), unread: false },
  { id: "n12", actor: "emi", text: "Shared the Points history loading animation", at: daysFromToday(-14, 17, 50), unread: false },
];

const meetings = [
  { id: "m1", title: "Design critique", start: daysFromToday(0, 11, 0), where: "Studio room 2", project: "phin-loyalty" },
  { id: "m2", title: "Lumen Bank check-in", start: daysFromToday(0, 14, 0), where: "Video call", project: "lumen-banking" },
  { id: "m3", title: "Zen office hours", start: daysFromToday(0, 16, 30), where: "Studio room 1", project: "zen-ds" },
];
const reviewing = tasks.filter((task) => task.status === "In review");
// Work still being done that is due in the next 10 days, soonest first (tasks in review wait in the ListBox above).
const dueSoon = tasks
  .filter((task) => (task.status === "To do" || task.status === "In progress") && task.due >= daysFromToday(0, 0, 0) && task.due <= daysFromToday(10, 23, 59))
  .sort((a, b) => a.due.getTime() - b.due.getTime());

function HomeNotificationsExample() {
  const screenRef = useRef<HTMLDivElement>(null);
  const [sheet, setSheet] = useState(false);
  const [seen, setSeen] = useState(false);
  const todayId = useId();
  const reviewId = useId();
  const dueId = useId();
  const fresh = notifications.filter((item) => item.unread);
  const openNotifications = () => { setSheet(true); setSeen(true); };
  return (
    // Alt bar on an Alt canvas: Surface ListBoxes carry the content.
    <PlatformPhone canvas="alt" label="Home" headerOverlay screenRef={screenRef} header={
      <TopNavigation type="alt" title="Home" largeTitle="Home" scrollRef={screenRef}
        leading={<Avatar size="md" theme="photo" src={me.photo} alt={me.name} />}
        trailing={[{ icon: "icon-bell-01-line", label: seen ? "Notifications" : `Notifications, ${fresh.length} new`, dot: !seen, onClick: openNotifications }]} />
    }>
      {/* Each section is a ListBox: its title in the Header-Slot, the rows in the Body-Slot. The slot padding follows the breakpoint (20px on a phone); rows have no side padding of their own, so titles and rows line up. */}
      <Stack gap="md" padding="lg">
        <ListBox as="section" aria-labelledby={todayId}
          header={<Heading level={2} id={todayId} textStyle="Heading/Subheading">Today</Heading>}>
          <List aria-labelledby={todayId}>
            {meetings.map((meeting) => {
              const item = projectById(meeting.project);
              return <ListItem key={meeting.id} title={meeting.title} caption={`${formatTime(meeting.start)} · ${meeting.where}`} leading={<DockIcon icon={item.icon} theme={item.theme} background="subtle" size="md" />} />;
            })}
          </List>
        </ListBox>
        <ListBox as="section" aria-labelledby={reviewId}
          header={<Heading level={2} id={reviewId} textStyle="Heading/Subheading">Waiting for your review</Heading>}>
          <List aria-labelledby={reviewId}>
            {reviewing.map((task) => (
              <ListItem key={task.id} title={people[task.assignee].name} caption={task.title} leading={<Avatar size="md" {...avatarOf(people[task.assignee])} />} />
            ))}
          </List>
        </ListBox>
        <ListBox as="section" aria-labelledby={dueId}
          header={<Heading level={2} id={dueId} textStyle="Heading/Subheading">Due soon</Heading>}>
          <List aria-labelledby={dueId}>
            {/* Titles stay one line, so the person leads and the task (which may wrap) follows its due date. */}
            {dueSoon.map((task) => (
              <ListItem key={task.id} title={people[task.assignee].name} caption={`${formatDue(task.due)} · ${task.title}`} leading={<Avatar size="md" {...avatarOf(people[task.assignee])} />} />
            ))}
          </List>
        </ListBox>
      </Stack>
      <BottomSheet inline open={sheet} onOpenChange={setSheet} title="Notifications">
        <List aria-label="Notifications">
          {notifications.slice(0, 5).map((item) => (
            <ListItem key={item.id} title={people[item.actor].name} caption={`${item.text} · ${formatRelative(item.at)}`}
              leading={<Avatar size="md" {...avatarOf(people[item.actor])} />}
              trailing={item.unread ? <Badge theme="accent" background="subtle">New</Badge> : undefined} />
          ))}
        </List>
      </BottomSheet>
    </PlatformPhone>
  );
}

/* ───────────── 4. Inbox control bar ───────────── */

function InboxControlBarExample() {
  const screenRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState(notifications);
  const [view, setView] = useState("all");
  const unread = items.filter((item) => item.unread).length;
  const shown = view === "unread" ? items.filter((item) => item.unread) : items;
  const read = (id: string) => {
    const at = shown.findIndex((item) => item.id === id);
    setItems((list) => list.map((item) => item.id === id ? { ...item, unread: false } : item));
    // In Unread the row leaves once read: focus moves to the next row (or Show all), not to <body>.
    if (view === "unread") requestAnimationFrame(() => {
      const rows = screenRef.current?.querySelectorAll<HTMLElement>(".zen-list-item__wrapper");
      const next = rows?.[at] ?? rows?.[at - 1] ?? [...(screenRef.current?.querySelectorAll("button") ?? [])].find((button) => button.textContent === "Show all");
      next?.focus();
    });
  };
  return (
    <PlatformPhone label="Inbox" headerOverlay screenRef={screenRef} header={
      // The Segmented stays pinned under the bar: it moves up with the fold and never folds away.
      <TopNavigation title="Inbox" largeTitle="Inbox" scrollRef={screenRef}
        // Nothing left to mark: the action stays in place, disabled.
        trailing={[{ icon: "icon-double-check-line", label: "Mark all as read", disabled: unread === 0, onClick: () => setItems((list) => list.map((item) => ({ ...item, unread: false }))) }]}
        controlBar={<Segmented fullWidth aria-label="Show" value={view} onValueChange={setView} options={[
          { id: "all", label: "All" },
          { id: "unread", label: "Unread", badge: unread || undefined },
        ]} />} />
    }>
      {shown.length ? (
        // The rows sit in the screen margin (Margin/Comfortable, 20px), so their fill stays 8px off the screen edge; Padding/XSmall (8px, the phone's List-Container-Vertical-Padding) above and below, like a List-Box.
        <Box paddingX="lg" paddingY="xs">
          <List aria-label={view === "unread" ? "Unread notifications" : "All notifications"}>
            {shown.map((item) => (
              <ListItem key={item.id} title={people[item.actor].name} caption={`${item.text} · ${formatRelative(item.at)}`}
                leading={<Avatar size="md" {...avatarOf(people[item.actor])} />}
                trailing={item.unread ? <Badge theme="accent" background="subtle">New</Badge> : undefined}
                onClick={() => read(item.id)} />
            ))}
          </List>
        </Box>
      ) : (
        <EmptyState illustration={false} headingLevel={2} title="No unread notifications" secondaryAction={{ label: "Show all", onClick: () => {
          setView("all");
          requestAnimationFrame(() => screenRef.current?.querySelector<HTMLElement>(".zen-list-item__wrapper")?.focus());
        } }}>
          You're up to date. New mentions and reviews land here.
        </EmptyState>
      )}
    </PlatformPhone>
  );
}

/* ───────────── 5. Conversation header ───────────── */

/** A call Alex starts rings first, then shows "No answer" with Call again (`missed`). */
type Message = { id: string; side: "you" | "others"; from?: PersonId; text?: string; call?: "audio" | "video"; missed?: boolean; replyTo?: ChatReplyTarget };
/** One person, or a group (several members). Most recent first. */
type Conversation = { id: string; name: string; members: PersonId[]; seed: Message[] };
const direct = (id: PersonId, seed: Message[]): Conversation => ({ id, name: people[id].name, members: [id], seed });
const said = (id: string, side: Message["side"], text: string, from?: PersonId): Message => ({ id, side, text, from });
const conversations: Conversation[] = [
  direct("bao", [
    said("b1", "others", "The rewards API is on staging now."),
    said("b2", "others", "Points update within a second of checkout."),
    said("b3", "you", "Nice. I'll test it on the points history screen."),
    said("b4", "others", "Ping me if a total looks off."),
  ]),
  { id: "loyalty-team", name: "Loyalty app", members: ["chi", "bao", "em", "duy"], seed: [
    said("l1", "others", "Sprint 14 demo moves to Friday at 3 pm.", "duy"),
    said("l2", "others", "Works for me. I'll show the points history flows.", "chi"),
  ] },
  direct("chi", [said("c1", "others", "I've put the new points history flows in Figma."), said("c2", "you", "Thanks, I'll look before the 2 pm call.")]),
  direct("duy", [said("d1", "others", "Mekong Freight wants to restart tracking in November."), said("d2", "you", "Good news. Let's plan the kickoff next week.")]),
  direct("hana", [said("h1", "others", "Lumen Bank moved the review to Friday.")]),
  direct("ava", [said("a1", "others", "Transfer sessions are booked for Thursday and Friday.")]),
  direct("finn", [said("f1", "you", "Does the passkey spike cover Android too?"), said("f2", "others", "iOS only for now. Android is next sprint.")]),
  direct("emi", [said("e1", "others", "Uploaded the loading animation for points history.")]),
  direct("em", [said("m1", "others", "The Android build passes the regression run.")]),
  direct("gia", [said("g1", "others", "The Saola moodboard is ready for your eyes.")]),
  direct("linh", [said("n1", "others", "Can you check the copy for the Book Fair recap?")]),
  direct("khoa", [said("k1", "others", "The transfer limits endpoint is merged.")]),
  direct("minhAnh", [said("v1", "others", `Your leave for ${myLeaveDays} is approved.`)]),
  direct("mai", [said("i1", "you", "Has Lumen Bank paid INV-2026-0141?"), said("i2", "others", "Yes, it came in last Tuesday.")]),
];
const lastSeen: Partial<Record<PersonId, Date>> = { chi: minutesAgo(12), hana: daysFromToday(-1, 18, 5), ava: minutesAgo(48), gia: daysFromToday(0, 8, 55) };
const presence = (person: Person) => person.online ? "Active now" : lastSeen[person.id as PersonId] ? `Active ${formatRelative(lastSeen[person.id as PersonId]!).toLowerCase()}` : "Offline";

function ConversationHeaderExample() {
  const demo = useChatDemo();
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>("bao");
  const [threads, setThreads] = useState(() => Object.fromEntries(conversations.map((c) => [c.id, c.seed])) as Record<string, Message[]>);
  const [profile, setProfile] = useState(false);
  const add = (message: Omit<Message, "id">) => {
    if (!openId) return;
    const id = `${openId}-${Date.now()}`;
    setThreads((all) => ({ ...all, [openId]: [...all[openId], { ...message, id }] }));
    return id;
  };
  // The demo call is never answered: after a few rings the card turns into a missed call you can try again.
  const call = (type: "audio" | "video") => {
    const thread = openId, id = add({ side: "you", call: type });
    window.setTimeout(() => thread && setThreads((all) => ({ ...all, [thread]: all[thread].map((m) => m.id === id ? { ...m, missed: true } : m) })), 4000);
  };

  if (!openId) {
    return (
      <PlatformPhone key="root" label="Messages" headerOverlay screenRef={screenRef}
        header={<TopNavigation title="Messages" largeTitle="Messages" scrollRef={screenRef} />}>
        {screen.anchor}
        {/* The rows sit in the screen margin (Margin/Comfortable, 20px), so their fill stays 8px off the screen edge; Padding/XSmall (8px, the phone's List-Container-Vertical-Padding) above and below, like a List-Box. */}
        <Box paddingX="lg" paddingY="xs">
          <List aria-label="Conversations">
            {conversations.map(({ id, name, members }) => {
              const last = threads[id][threads[id].length - 1];
              const who = last.side === "you" ? "You: " : members.length > 1 ? `${firstName(last.from!)}: ` : "";
              const one = members.length === 1 ? people[members[0]] : null;
              return (
                <ListItem key={id} data-chat={id} title={name} caption={last.call ? `${last.call === "audio" ? "Audio" : "Video"} call${last.missed ? " · No answer" : ""}` : `${who}${last.text}`}
                  leading={one ? <Avatar size="md" status={one.online} {...avatarOf(one)} /> : <ChatAvatarGroup size="md" people={members.map((m) => chatPerson(people[m]))} />}
                  onClick={() => screen.go(".zen-top-nav__identity", () => setOpenId(id))} />
              );
            })}
          </List>
        </Box>
      </PlatformPhone>
    );
  }

  const chat = conversations.find((c) => c.id === openId)!;
  const one = chat.members.length === 1 ? people[chat.members[0]] : null;
  const status = one ? presence(one) : plural(chat.members.length + 1, "member");
  return (
    <PlatformPhone key={chat.id} label={`Conversation with ${chat.name}`} headerOverlay screenRef={screenRef} header={
      // Identity header: Default type, compact margin, the person (or group) as the title and one pill for both calls.
      <TopNavigation margin="compact" title={chat.name} subtitle={status} scrollRef={screenRef}
        titleLeading={one ? <Avatar size="lg" background="subtle" status={one.online} {...avatarOf(one)} /> : <ChatAvatarGroup size="lg" people={chat.members.map((m) => chatPerson(people[m]))} />}
        onTitleClick={() => setProfile(true)} titleLabel={`${chat.name}, ${status.toLowerCase()}. ${one ? "Open profile" : "Open group info"}`}
        leading={{ icon: back, label: "Back", onClick: () => screen.go(`[data-chat="${chat.id}"] .zen-list-item__wrapper`, () => { setProfile(false); setOpenId(null); }) }}
        trailing={[
          { icon: "icon-phone-line", label: "Audio call", group: "call", onClick: () => call("audio") },
          { icon: "icon-video-recorder-line", label: "Video call", group: "call", onClick: () => call("video") },
        ]} />
    } footer={<ChatComposer actions={demo.composerActions} onEmoji={demo.onEmoji} {...demo.composerReply} onSend={(text) => add({ side: "you", text, replyTo: demo.takeReply() })} />}>
      {screen.anchor}
      <ChatThread aria-label={`Conversation with ${chat.name}`}>
        {threads[chat.id].filter((message) => !demo.isDeleted(message.id)).map((message) => {
          if (message.call) {
            return (
              <ChatMessage key={message.id} {...demo.act(message.id, "you", { kind: "call" })} side="you" time="Just now">
                {message.missed
                  ? <ChatCall side="you" type={message.call} state="out-missed" detail="No answer" onAction={() => call(message.call!)} />
                  : <ChatCall side="you" type={message.call} state="out-call" detail="Calling…" />}
              </ChatMessage>
            );
          }
          const author = people[message.from ?? chat.members[0]];
          return (
            <ChatMessage key={message.id} {...demo.act(message.id, message.side, { text: message.text, author: author.name })} side={message.side}
              author={message.side === "others" ? chatPerson(author) : undefined} replyTo={message.replyTo}>{message.text}</ChatMessage>
          );
        })}
      </ChatThread>
      <ChatDemoNote note={demo.note} />
      <BottomSheet inline open={profile} onOpenChange={setProfile} title={chat.name}>
        {one ? (
          <Stack gap="md">
            <Stack direction="row" gap="md" align="center">
              <Avatar size="xl" {...avatarOf(one)} />
              <Stack gap="xs">
                <Text textStyle="Body/Base/Bold">{one.role}</Text>
                <Text textStyle="Body/Small/Regular" tone="base">{`${one.team} · ${status}`}</Text>
              </Stack>
            </Stack>
            <DescriptionList items={[
              { term: "Email", description: one.email },
              { term: "Location", description: one.location },
            ]} />
          </Stack>
        ) : (
          <List aria-label="Members">
            {[me.id as PersonId, ...chat.members].map((id) => (
              <ListItem key={id} title={id === me.id ? `${people[id].name} (you)` : people[id].name} caption={people[id].role} leading={<Avatar size="md" {...avatarOf(people[id])} />} />
            ))}
          </List>
        )}
      </BottomSheet>
    </PlatformPhone>
  );
}

/* ───────────── 6. Over photos ───────────── */

// The Saola Outdoor moodboard: every feed and place photo once, so the grid runs past the screen.
const moodboard: (PlatformPhoto & { name: string })[] = [
  ...["Sunset field", "Forest creek", "Balloon over palms", "Mountain road", "Snow peaks", "Desert hills", "Coast road", "Moss study"]
    .map((name, index) => ({ ...platformMedia.feed[index], name })),
  ...["College courtyard", "Snowy rooftops", "Old town", "White houses", "Bridge at dusk", "Café table"]
    .map((name, index) => ({ ...platformMedia.site[index], name })),
];

function OverPhotosExample() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);

  if (index === null) {
    return (
      <PlatformPhone key="moodboard" label="Moodboard" headerOverlay screenRef={screenRef}
        header={<TopNavigation title="Moodboard" largeTitle="Moodboard" scrollRef={screenRef} />}>
        {screen.anchor}
        <Stack gap="xs" padding="lg">
          <Text textStyle="Body/Small/Regular" tone="base">{`Brand refresh · Saola Outdoor · ${plural(moodboard.length, "photo")}`}</Text>
          <Grid columns={2} gap="2xs">
            {moodboard.map((photo, i) => (
              <button key={photo.src} type="button" className="px-top-navigation-tile" data-photo={i} aria-label={`Open ${photo.name}`}
                onClick={() => screen.go('.zen-top-nav__action[aria-label="Close"]', () => setIndex(i))}>
                <Image src={photo.src} alt="" ratio="1:1" radius="sm" loading="eager" />
              </button>
            ))}
          </Grid>
        </Stack>
      </PlatformPhone>
    );
  }

  const photo = moodboard[index];
  const favourite = favourites.includes(photo.src);
  const toggleFavourite = () => setFavourites((list) => favourite ? list.filter((src) => src !== photo.src) : [...list, photo.src]);
  return (
    // Overlay type only on imagery: its gradient keeps the white title and actions readable on the photo. The viewer
    // does not scroll, so it has no scrollRef.
    <PlatformPhone key={photo.src} canvas="media" statusBar="light" label={photo.name} header={
      <TopNavigation type="liquid-overlay" title={photo.name}
        leading={{ icon: "icon-x-medium-line", label: "Close", onClick: () => screen.go(`[data-photo="${index}"]`, () => setIndex(null)) }}
        trailing={[
          { icon: favourite ? "icon-heart-solid" : "icon-heart-line", label: favourite ? "Remove from favourites" : "Add to favourites", onClick: toggleFavourite },
          { icon: "icon-share-01-line", label: "Share", onClick: () => setSharing(true) },
        ]} />
    }>
      {screen.anchor}
      <PlatformPhoneMedia photo={photo} />
      <BottomSheet inline type="action" open={sharing} onOpenChange={setSharing} title={`Share ${photo.name}`}
        items={[
          { id: "link", label: "Copy link", icon: "icon-link-01-line" },
          { id: "send", label: `Send to ${people.gia.name}`, icon: "icon-send-01-line" },
          { id: "save", label: "Save to device", icon: "icon-download-01-line" },
        ]}
        onSelect={(item) => toast({ title: item.id === "link" ? "Link copied" : item.id === "send" ? `Photo sent to ${firstName("gia")}` : "Photo saved" })} />
    </PlatformPhone>
  );
}

/* ───────────── 7. Modal screen ───────────── */

type Review = { id: string; title: string; project: string; reviewer: PersonId; at: Date };
// Design reviews Alex has booked, soonest first.
const review = (id: string, title: string, projectId: string, reviewer: PersonId, days: number, hour: number, minute = 0): Review =>
  ({ id, title, project: projectId, reviewer, at: daysFromToday(days, hour, minute) });
const bookedReviews: Review[] = [
  review("r1", "Points history flows", "phin-loyalty", "chi", 1, 14),
  review("r2", "Transfer confirmation screen", "lumen-banking", "ava", 1, 15, 30),
  review("r3", "Metric card guidelines", "zen-ds", "chi", 2, 10),
  review("r4", "Rewards API error states", "phin-loyalty", "bao", 2, 16),
  review("r5", "Account overview contrast", "lumen-banking", "finn", 5, 11),
  review("r6", "Outdoor range moodboard", "saola-brand", "gia", 5, 14, 30),
  review("r7", "Customs hold states", "mekong-tracking", "duy", 6, 10, 30),
  review("r8", "Android checkout build", "phin-loyalty", "em", 6, 15),
  review("r9", "Passkey sign-in flow", "lumen-banking", "khoa", 7, 11, 30),
  review("r10", "Logo directions", "saola-brand", "emi", 8, 9, 30),
  review("r11", "Onboarding copy", "lumen-banking", "linh", 8, 14),
  review("r12", "Icon set for Zen 0.5", "zen-ds", "emi", 9, 10),
  review("r13", "Book Fair recap page", "bookfair-site", "linh", 9, 16),
  review("r14", "Driver app sketches", "mekong-tracking", "duy", 15, 10, 30),
];
const reviewSlots = [
  { value: "r-1-16", label: "Thursday, Oct 1 at 4:00 pm", at: daysFromToday(1, 16, 0) },
  { value: "r-2-11", label: "Friday, Oct 2 at 11:00 am", at: daysFromToday(2, 11, 0) },
  { value: "r-5-14", label: "Monday, Oct 5 at 2:00 pm", at: daysFromToday(5, 14, 0) },
  { value: "r-6-10", label: "Tuesday, Oct 6 at 10:00 am", at: daysFromToday(6, 10, 0) },
];
const projectOptions = projects.filter((item) => item.status === "Active" || item.status === "Planning").map((item) => ({ value: item.id, label: item.name }));
const reviewerOptions = directory.filter((person) => person.id !== me.id).map((person) => ({ value: person.id, label: person.name }));
type ReviewDraft = { title: string; project: string; reviewer: string; slot: string; notes: string };
const blankReview: ReviewDraft = { title: "", project: "", reviewer: "", slot: "", notes: "" };
const newReviewAction = '.zen-top-nav__action[aria-label="New review"]';

function ModalScreenExample() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const formId = useId();
  const [reviews, setReviews] = useState(bookedReviews);
  const [view, setView] = useState<"reviews" | "new">("new");
  const [discarding, setDiscarding] = useState(false);
  const form = useFormState<ReviewDraft>({
    // A draft Alex has started: Close has something to lose, so it asks first.
    initialValues: { ...blankReview, title: "Transfer limits screen", project: "lumen-banking" },
    validate: (v) => ({
      title: v.title.trim() ? undefined : "Name what to review",
      project: v.project ? undefined : "Choose a project",
      reviewer: v.reviewer ? undefined : "Choose a reviewer",
      slot: v.slot ? undefined : "Choose a review slot",
    }),
    onSubmit: (v) => {
      const slot = reviewSlots.find((item) => item.value === v.slot)!;
      setReviews((list) => [...list, { id: `r${list.length + 1}`, title: v.title.trim(), project: v.project, reviewer: v.reviewer as PersonId, at: slot.at }]
        .sort((a, b) => a.at.getTime() - b.at.getTime()));
      toReviews();
      toast({ type: "positive", title: "Review booked", children: `${people[v.reviewer as PersonId].name} · ${slot.label}` });
    },
  });
  const hasDraft = Object.values(form.values).some((value) => value.trim());
  // Back to the list: the draft is cleared and focus returns to New review.
  function toReviews() { screen.go(newReviewAction, () => { form.reset(blankReview); setDiscarding(false); setView("reviews"); }); }
  // Close drops the draft only after asking, unless there is nothing to lose.
  const close = () => (hasDraft ? setDiscarding(true) : toReviews());

  if (view === "reviews") {
    return (
      <PlatformPhone key="reviews" label="Reviews" headerOverlay screenRef={screenRef}
        header={<TopNavigation title="Reviews" largeTitle="Reviews" scrollRef={screenRef}
          trailing={[{ icon: "icon-plus-line", label: "New review", onClick: () => screen.go("input.zen-input__native", () => setView("new")) }]} />}>
        {screen.anchor}
        {/* Static rows (nothing opens a booked review here) sit in the screen margin, like the New review form. */}
        <Box padding="lg">
          <List aria-label="Booked reviews">
            {reviews.map((item) => {
              const reviewed = projectById(item.project);
              return (
                <ListItem key={item.id} title={item.title} caption={`${people[item.reviewer].name} · ${formatDay(item.at)} at ${formatTime(item.at)}`}
                  leading={<DockIcon icon={reviewed.icon} theme={reviewed.theme} background="subtle" size="md" />} />
              );
            })}
          </List>
        </Box>
      </PlatformPhone>
    );
  }
  return (
    // A create screen opens as a modal: Close on the leading edge, the main action in the footer, never in the bar.
    <PlatformPhone key="new" label="New review" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact" title="New review" scrollRef={screenRef}
        leading={{ icon: "icon-x-medium-line", label: "Close", onClick: close }} />}
      footer={<ActionBar position="static" primaryAction={{ label: "Book review", type: "submit", form: formId }} />}>
      {screen.anchor}
      <Box padding="lg">
        <Form id={formId} form={form} gap="md">
          <InputField size="lg" label="What to review" {...form.field("title")} />
          <SelectField size="lg" label="Project" placeholder="Choose a project" options={projectOptions} {...form.selectField("project")} />
          <SelectField size="lg" label="Reviewer" placeholder="Choose a reviewer" options={reviewerOptions} {...form.selectField("reviewer")} />
          <SelectField size="lg" label="Review slot" placeholder="Choose a slot" options={reviewSlots} {...form.selectField("slot")} />
          <TextAreaField size="lg" label="Notes for the reviewer" labelOptional rows={3} {...form.field("notes")} />
        </Form>
      </Box>
      <BottomSheet inline open={discarding} onOpenChange={setDiscarding} title="Discard this review?"
        primaryAction={{ label: "Discard review", level: "danger", onClick: toReviews }}
        secondaryAction={{ label: "Keep editing" }}>
        <Text tone="base">What you entered for this review will be lost.</Text>
      </BottomSheet>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "Root and detail",
    description: "A tab root names itself with the large title, its h1, which folds into the bar as the list scrolls. A project opens a dense detail screen in the Compact type: its bar title becomes the h1, its actions are Flat, and the chevron Back returns focus to the row you came from.",
    render: () => <RootAndDetailExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

// Root screen: the large title is the h1 (Heading/1) and folds under the bar as the list scrolls.
// One key per screen, so each screen opens at the top and the bar measures its fold again.
<PlatformPhone key="root" headerOverlay screenRef={screenRef}
  header={<TopNavigation title="Projects" largeTitle="Projects" scrollRef={screenRef} />}>
  <Box paddingX="lg" paddingY="xs"> {/* the screen margin: rows 20px from the edge; Padding/XSmall above and below, like a List-Box */}
    <List aria-label="Projects">{/* a ListItem per project, onClick opens it */}</List>
  </Box>
</PlatformPhone>

// Pushed detail screen: Compact type (Flat actions); the bar title is the h1, content headings start at h2.
<PlatformPhone key={project.id} headerOverlay screenRef={screenRef} header={
  <TopNavigation type="compact" title={project.name} scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToProjects }}
    trailing={[{ icon: "icon-link-01-line", label: "Copy link", onClick: copyLink }]} />
}>…</PlatformPhone>`,
  },
  {
    title: "Collapse on scroll",
    description: "With scrollRef the large title and the Search slide under the bar with the list, and the bar title fades in. While folded, Search waits as a top-right action that scrolls back up and focuses the field.",
    render: () => <CollapseOnScrollExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone headerOverlay screenRef={screenRef} header={
  <TopNavigation title="People" largeTitle="People" scrollRef={screenRef}
    trailing={[{ icon: "icon-user-plus-line", label: "Invite people", onClick: () => setInviting(true) }]}
    controlBar={<Search ref={searchRef} placeholder="Search people" value={query} onValueChange={setQuery} />}
    searchAction={{ label: "Search people", onClick: scrollUpAndFocusSearch }} />
}>
  <Box padding="lg">
    <List aria-label="People">{/* filtered rows */}</List>
  </Box>
</PlatformPhone>`,
  },
  {
    title: "Home with notifications",
    description: "On an Alt canvas the bar takes the Alt type and folds like any root. The leading slot shows the account, and a dot on the bell marks unread notifications; its label carries the count, and both clear once the sheet opens.",
    render: () => <HomeNotificationsExample />,
    code: `<PlatformPhone canvas="alt" headerOverlay screenRef={screenRef} header={
  <TopNavigation type="alt" title="Home" largeTitle="Home" scrollRef={screenRef}
    leading={<Avatar size="md" theme="photo" src={me.photo} alt="Alex Duong" />}
    trailing={[{
      icon: "icon-bell-01-line",
      label: seen ? "Notifications" : \`Notifications, \${fresh.length} new\`,
      dot: !seen,
      onClick: () => { setSheet(true); setSeen(true); },
    }]} />
}>
  <Stack gap="md" padding="lg">
    <ListBox as="section" aria-labelledby={todayId}
      header={<Heading level={2} id={todayId} textStyle="Heading/Subheading">Today</Heading>}>
      <List aria-labelledby={todayId}>
        {meetings.map((m) => <ListItem key={m.id} title={m.title} caption={\`\${formatTime(m.start)} · \${m.where}\`} leading={<DockIcon … />} />)}
      </List>
    </ListBox>
    {/* Waiting for your review · Due soon: the same ListBox, a Subheading and a List */}
  </Stack>
</PlatformPhone>`,
  },
  {
    title: "Inbox control bar",
    description: "A full-width Segmented in the control bar switches All and Unread and counts what is unread; it stays pinned while the large title folds. Mark all as read stays in place but disabled once nothing is left, and an empty Unread view offers a way back.",
    render: () => <InboxControlBarExample />,
    code: `<PlatformPhone headerOverlay screenRef={screenRef} header={
  <TopNavigation title="Inbox" largeTitle="Inbox" scrollRef={screenRef}
    trailing={[{ icon: "icon-double-check-line", label: "Mark all as read", disabled: unread === 0, onClick: markAllRead }]}
    controlBar={<Segmented fullWidth aria-label="Show" value={view} onValueChange={setView} options={[
      { id: "all", label: "All" },
      { id: "unread", label: "Unread", badge: unread || undefined },
    ]} />} />
}>
  <Box paddingX="lg" paddingY="xs"> {/* the screen margin: rows 20px from the edge; Padding/XSmall above and below, like a List-Box */}
    <List aria-label="All notifications">{/* a ListItem per notification, onClick reads it */}</List>
  </Box>
</PlatformPhone>`,
  },
  {
    title: "Conversation header",
    description: "The identity header puts the person or group in the bar: avatar, name and presence, one button that opens their profile. Audio and video calls share one pill, each half with its own label; a call rings in the thread, then turns into a missed call with Call again.",
    render: () => <ConversationHeaderExample />,
    code: `<PlatformPhone key={chat.id} headerOverlay screenRef={screenRef} header={
  <TopNavigation margin="compact" title="Bao Nguyen" subtitle="Active now" scrollRef={screenRef}
    titleLeading={<Avatar size="lg" background="subtle" status theme="photo" src={bao.photo} alt="" />}
    onTitleClick={openProfile} titleLabel="Bao Nguyen, active now. Open profile"
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToMessages }}
    trailing={[
      { icon: "icon-phone-line", label: "Audio call", group: "call", onClick: () => call("audio") },
      { icon: "icon-video-recorder-line", label: "Video call", group: "call", onClick: () => call("video") },
    ]} />
} footer={<ChatComposer onSend={send} />}>
  <ChatThread aria-label="Conversation with Bao Nguyen">…</ChatThread>
</PlatformPhone>

// A group: <ChatAvatarGroup size="lg" people={members} /> as titleLeading, subtitle "5 members".`,
  },
  {
    title: "Over photos",
    description: "A photo viewer uses the Liquid Overlay type: its dark gradient keeps the white title and actions readable on any picture. Close returns to the tile you opened, and the heart swaps to solid with its label.",
    render: () => <OverPhotosExample />,
    code: `// The viewer: media canvas, no scroll to follow.
<PlatformPhone key={photo.src} canvas="media" statusBar="light" header={
  <TopNavigation type="liquid-overlay" title={photo.name}
    leading={{ icon: "icon-x-medium-line", label: "Close", onClick: backToMoodboard }}
    trailing={[
      { icon: favourite ? "icon-heart-solid" : "icon-heart-line",
        label: favourite ? "Remove from favourites" : "Add to favourites", onClick: toggleFavourite },
      { icon: "icon-share-01-line", label: "Share", onClick: () => setSharing(true) },
    ]} />
}>
  <PlatformPhoneMedia photo={photo} />
</PlatformPhone>

// The moodboard it opens from: a root with a large title that folds.
<PlatformPhone key="moodboard" headerOverlay screenRef={screenRef}
  header={<TopNavigation title="Moodboard" largeTitle="Moodboard" scrollRef={screenRef} />}>
  <Grid columns={2} gap="2xs">{/* a tile button per photo */}</Grid>
</PlatformPhone>`,
  },
  {
    title: "Modal screen",
    description: "A create screen opens as a modal: Compact bar titled with the task, Close on the leading edge and the Primary in an ActionBar footer, never in the bar. Close asks before it drops a draft, and Book review checks the fields first.",
    render: () => <ModalScreenExample />,
    code: `const close = () => (hasDraft ? setDiscarding(true) : backToReviews());

<PlatformPhone key="new" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact" title="New review" scrollRef={screenRef}
    leading={{ icon: "icon-x-medium-line", label: "Close", onClick: close }} />}
  footer={<ActionBar position="static" primaryAction={{ label: "Book review", type: "submit", form: formId }} />}>
  <Box padding="lg">
    <Form id={formId} form={form} gap="md">
      <InputField size="lg" label="What to review" {...form.field("title")} />
      <SelectField size="lg" label="Reviewer" placeholder="Choose a reviewer" options={reviewers} {...form.selectField("reviewer")} />
      {/* Project, Review slot, Notes for the reviewer */}
    </Form>
  </Box>
  <BottomSheet inline open={discarding} onOpenChange={setDiscarding} title="Discard this review?"
    primaryAction={{ label: "Discard review", level: "danger", onClick: backToReviews }}
    secondaryAction={{ label: "Keep editing" }}>
    <Text tone="base">What you entered for this review will be lost.</Text>
  </BottomSheet>
</PlatformPhone>`,
  },
];
